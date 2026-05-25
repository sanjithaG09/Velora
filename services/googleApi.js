const axios = require("axios");

const API_KEY = process.env.GOOGLE_API_KEY;

// Haversine fallback — used to fill gaps when Distance Matrix API doesn't return a value
function haversineMetres(a, b) {
    const R = 6371000, rad = d => d * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
    return R * 2 * Math.asin(Math.sqrt(h));
}

// Type label map — used to generate human-readable descriptions
const TYPE_LABELS = {
    temple: "Temple", beach: "Beach", museum: "Museum", park: "Park",
    zoo: "Zoo", amusement_park: "Amusement Park", art_gallery: "Art Gallery",
    natural_feature: "Natural Feature", church: "Church", mosque: "Mosque",
    hindu_temple: "Hindu Temple", stadium: "Stadium", shopping_mall: "Shopping Mall",
    aquarium: "Aquarium", botanical_garden: "Botanical Garden", campground: "Campground",
    casino: "Casino", cemetery: "Cemetery", city_hall: "City Hall",
    hindu_temple: "Hindu Temple", library: "Library", monument: "Monument",
    movie_theater: "Cinema", night_club: "Night Club", palace: "Palace",
    place_of_worship: "Place of Worship", rv_park: "RV Park", spa: "Spa",
    tourist_attraction: "Tourist Attraction", university: "University",
    waterfall: "Waterfall", waterpark: "Water Park",
};

const GENERIC_TYPES = new Set([
    "point_of_interest", "establishment", "tourist_attraction",
    "geocode", "premise", "locality", "sublocality",
    "political", "route", "street_address",
]);

function buildDescription(types) {
    if (!Array.isArray(types)) return "Tourist Attraction";
    const labels = types
        .filter(t => !GENERIC_TYPES.has(t))
        .map(t => TYPE_LABELS[t] || null)
        .filter(Boolean);
    return labels.slice(0, 2).join(" · ") || "Tourist Attraction";
}

// ✅ Fetch top tourist places with photos and descriptions
exports.getTouristPlaces = async (city) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;

        const response = await axios.get(url, {
            params: {
                query: `top tourist places sightseeing in ${city}`,
                key: API_KEY,
            },
            proxy: false,
        });

        const results = response.data.results;
        if (!results || results.length === 0) {
            console.warn("Google Places returned no results for:", city, "| status:", response.data.status);
            return [];
        }

        // Only exclude obvious non-tourist types where that type is the ONLY or first type
        const HARD_EXCLUDED = new Set(["lodging", "restaurant", "bar", "cafe", "grocery_or_supermarket"]);

        let places = results
            .filter(place => {
                const types = place.types || [];
                // Exclude only if the very first type (most specific) is a non-tourist category
                return !HARD_EXCLUDED.has(types[0]);
            })
            .map(place => {
                // Store only the photo_reference; the backend /api/photo route will serve the image
                let photoRef = null;
                if (place.photos && place.photos.length > 0) {
                    photoRef = place.photos[0].photo_reference;
                }

                return {
                    name:        place.name,
                    rating:      place.rating || 0,
                    user_ratings_total: place.user_ratings_total || 0,
                    lat:         place.geometry.location.lat,
                    lng:         place.geometry.location.lng,
                    photoRef,
                    description: buildDescription(place.types),
                    place_id:    place.place_id || null,
                };
            });

        places.sort((a, b) => b.rating - a.rating);
        return places.slice(0, 15);

    } catch (error) {
        console.error("Error fetching places:", error.message);
        if (error.response) {
            console.error("Google API response:", error.response.status, error.response.data);
        }
        return [];
    }
};

// ✅ Point-to-point distance — single origin → single destination
// origin / destination can be an address string OR "lat,lng" string
exports.getPointDistance = async (origin, destination) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
        const response = await axios.get(url, {
            params: {
                origins:      origin,
                destinations: destination,
                key:          API_KEY,
                mode:         "driving",
                units:        "metric",
            },
            proxy:   false,
            timeout: 6000,
        });

        const data = response.data;
        if (data.status !== "OK") {
            console.warn("Distance Matrix status:", data.status);
            return null;
        }

        const element = data.rows[0]?.elements[0];
        if (!element || element.status !== "OK") {
            console.warn("Element status:", element?.status);
            return null;
        }

        return {
            distance:           element.distance,         // { text, value (metres) }
            duration:           element.duration,         // { text, value (seconds) }
            originAddress:      data.origin_addresses[0],
            destinationAddress: data.destination_addresses[0],
        };
    } catch (error) {
        console.error("getPointDistance error:", error.message);
        return null;
    }
};

// ✅ Distance Matrix API — chunked into 10×10 batches, all fired in parallel
exports.getDistanceMatrix = async (places) => {
    try {
        const n = places.length;
        const coords = places.map(p => `${p.lat},${p.lng}`);
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
        const CHUNK = 10;

        const matrix         = Array.from({ length: n }, () => new Array(n).fill(Infinity));
        const durationMatrix = Array.from({ length: n }, () => new Array(n).fill(Infinity));

        // Build all batch requests up front and fire them in parallel
        const batches = [];
        for (let oi = 0; oi < n; oi += CHUNK) {
            for (let di = 0; di < n; di += CHUNK) {
                batches.push({ oi, di,
                    oSlice: coords.slice(oi, oi + CHUNK),
                    dSlice: coords.slice(di, di + CHUNK),
                });
            }
        }

        const results = await Promise.all(batches.map(({ oi, di, oSlice, dSlice }) =>
            axios.get(url, {
                params: {
                    origins:      oSlice.join("|"),
                    destinations: dSlice.join("|"),
                    key:          API_KEY,
                    mode:         "driving",
                    units:        "metric",
                },
                proxy:   false,
                timeout: 7000,   // never hang indefinitely
            })
            .then(response => ({ oi, di, data: response.data }))
            .catch(() => null)
        ));

        for (const result of results) {
            if (!result) continue;
            const { oi, di, data } = result;
            if (data.status !== "OK" && data.status !== "ZERO_RESULTS") continue;
            data.rows.forEach((row, ri) => {
                row.elements.forEach((el, ci) => {
                    if (el.status === "OK") {
                        matrix[oi + ri][di + ci]         = el.distance.value;
                        durationMatrix[oi + ri][di + ci] = el.duration.value;
                    }
                });
            });
        }

        const hasData = matrix.some(row => row.some(v => v !== Infinity));
        if (!hasData) return null;

        // Fill any gaps the API didn't cover with Haversine so TSP never sees Infinity
        const AVG_SPEED_MS = 11; // ~40 km/h in city traffic
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (matrix[i][j] === Infinity) {
                    const d = haversineMetres(places[i], places[j]);
                    matrix[i][j]         = Math.round(d * 1.3); // road factor ~1.3×
                    durationMatrix[i][j] = Math.round(d * 1.3 / AVG_SPEED_MS);
                }
            }
        }

        return { matrix, durationMatrix };

    } catch (error) {
        console.error("Distance Matrix error:", error.message);
        return null;
    }
};

// ✅ Restaurants between two stops — used for in-route dining suggestions
// priceRange: "" (any) | "budget" (₹) | "mid" (₹₹) | "premium" (₹₹₹)
exports.getRestaurantsBetween = async ({ placeA, placeB, city, latA, lngA, latB, lngB, diet, priceRange }) => {
    try {
        const mapResult = r => ({
            name:         r.name,
            rating:       r.rating || 0,
            totalRatings: r.user_ratings_total || 0,
            address:      r.vicinity || r.formatted_address || "",
            photoRef:     r.photos?.[0]?.photo_reference || null,
            priceLevel:   r.price_level ?? null,
            placeId:      r.place_id || null,
            lat:          r.geometry?.location?.lat ?? null,
            lng:          r.geometry?.location?.lng ?? null,
        });

        const topFour = arr =>
            arr.sort((a, b) => b.rating - a.rating).slice(0, 4).map(mapResult);

        // Price range → Google Places minprice / maxprice (0–4 scale)
        const priceParams = {};
        if (priceRange === "budget")  { priceParams.minprice = 0; priceParams.maxprice = 1; }
        if (priceRange === "mid")     { priceParams.minprice = 2; priceParams.maxprice = 2; }
        if (priceRange === "premium") { priceParams.minprice = 3; priceParams.maxprice = 4; }

        // ── Nearby Search when we have coordinates ────────────────────────────
        // Search near stopA — straightforward and reliable; midpoint approach
        // often lands in areas with no data when stops are far apart.
        if (latA != null && lngA != null) {
            // Determine a sensible radius: half the inter-stop distance, 800m–3000m
            let radius = 2000;
            if (latB != null && lngB != null) {
                const dist = haversineMetres({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
                radius = Math.min(Math.max(Math.round(dist / 2), 800), 3000);
            }

            const nearbyParams = {
                location: `${latA},${lngA}`,
                radius,
                type: "restaurant",
                key: API_KEY,
                ...priceParams,
            };
            // For veg: add a light keyword hint — NOT "pure vegetarian" (too restrictive)
            if (diet === "veg") nearbyParams.keyword = "vegetarian";

            const resp = await axios.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                { params: nearbyParams, proxy: false, timeout: 7000 }
            );
            const nearby = (resp.data.results || []).filter(r => r.rating >= 3.5);
            if (nearby.length >= 2) return topFour(nearby);
        }

        // ── Text Search fallback (no coords, or Nearby returned < 2 results) ──
        const priceHint =
            priceRange === "budget"  ? "budget cheap" :
            priceRange === "mid"     ? "mid range"    :
            priceRange === "premium" ? "fine dining"  : "popular";

        const query = diet === "veg"
            ? `${priceHint} vegetarian restaurant near ${placeA}, ${city}`
            : `${priceHint} restaurant near ${placeA}, ${city}`;

        const resp = await axios.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            { params: { query, key: API_KEY, ...priceParams }, proxy: false, timeout: 7000 }
        );
        const text = (resp.data.results || []).filter(r => r.rating >= 3.5);
        // If still nothing, just return top 4 regardless of rating
        const pool = text.length ? text : (resp.data.results || []);
        return topFour(pool);
    } catch (err) {
        console.error("getRestaurantsBetween error:", err.message);
        return [];
    }
};

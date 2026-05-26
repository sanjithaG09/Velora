const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

const INDIA_CITIES = [
    "Agra","Ahmedabad","Ajmer","Allahabad","Amritsar","Andaman Islands","Auli",
    "Aurangabad","Ayodhya","Bengaluru","Bhopal","Bhubaneswar","Chandigarh",
    "Chennai","Chikmagalur","Coimbatore","Coorg","Darjeeling","Dehradun",
    "Delhi","Dharamsala","Diu","Dwarka","Gangtok","Goa","Gorakhpur",
    "Gurugram","Guwahati","Hampi","Haridwar","Hyderabad","Indore","Jaipur",
    "Jaisalmer","Jammu","Jodhpur","Kanyakumari","Kochi","Kodaikanal",
    "Kolkata","Konark","Kovalam","Kullu","Leh","Lonavala","Lucknow",
    "Madurai","Manali","Mathura","Mumbai","Munnar","Mussoorie","Mysuru",
    "Nagpur","Nainital","Ooty","Patna","Pondicherry","Pune","Pushkar",
    "Ranthambore","Rishikesh","Shimla","Sikkim","Srinagar","Udaipur",
    "Ujjain","Varanasi","Varkala","Vijayawada","Visakhapatnam","Wayanad",
];

async function groqJSON(prompt, maxTokens = 1500) {
    const response = await axios.post(
        GROQ_URL,
        {
            model:           GROQ_MODEL,
            messages:        [{ role: "user", content: prompt }],
            max_tokens:      maxTokens,
            temperature:     0.4,
            response_format: { type: "json_object" },
        },
        {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            timeout: 30000,
        }
    );
    const raw = response.data.choices[0].message.content.trim();
    return JSON.parse(raw);
}

// ── Template-based instant itinerary ─────────────────────────────────────────
const PLACE_TYPES = {
    museum:           { dur: [90, 120], durLabel: "1.5–2 hours",   tip: "Check for student or combo-ticket discounts at the entrance.", food: "café inside or nearby" },
    art_gallery:      { dur: [60,  90], durLabel: "1–1.5 hours",   tip: "Free guided tours often run on weekends — ask staff.", food: "rooftop café nearby" },
    temple:           { dur: [30,  50], durLabel: "30–45 min",     tip: "Remove footwear before entering and carry a scarf to cover shoulders.", food: "prasad stall at the gate" },
    hindu_temple:     { dur: [30,  50], durLabel: "30–45 min",     tip: "Visit at aarti time (usually 6–7 AM or 6–7 PM) for the full experience.", food: "prasad and chai stall nearby" },
    church:           { dur: [20,  35], durLabel: "20–30 min",     tip: "Dress modestly and speak softly inside.", food: "bakery nearby" },
    mosque:           { dur: [25,  40], durLabel: "25–35 min",     tip: "Non-Muslims are usually welcome outside prayer times; cover your head.", food: "kebab or biryani stall nearby" },
    beach:            { dur: [120,180], durLabel: "2–3 hours",     tip: "Arrive before 8 AM to avoid crowds and heat. Carry sunscreen.", food: "beachside seafood shack" },
    park:             { dur: [60,  90], durLabel: "1–1.5 hours",   tip: "Best light for photos is early morning or an hour before sunset.", food: "stalls near the main entrance" },
    zoo:              { dur: [120,150], durLabel: "2–2.5 hours",   tip: "Animals are most active in the morning — go early.", food: "canteen inside the zoo" },
    aquarium:         { dur: [90, 120], durLabel: "1.5–2 hours",   tip: "Feeding sessions are scheduled — check the board at the entrance.", food: "food court inside" },
    amusement_park:   { dur: [180,240], durLabel: "3–4 hours",     tip: "Weekdays have shorter queues. Book online for discounts.", food: "multiple stalls inside" },
    natural_feature:  { dur: [60,  90], durLabel: "1–1.5 hours",   tip: "Wear comfortable shoes and carry water for uneven terrain.", food: "local dhaba near the entrance" },
    waterfall:        { dur: [60,  90], durLabel: "1–1.5 hours",   tip: "Avoid monsoon if you want to get close; post-monsoon flow is spectacular.", food: "chai stall near parking" },
    palace:           { dur: [90, 120], durLabel: "1.5–2 hours",   tip: "Audio guides are available at most palaces and add a lot of context.", food: "café inside the grounds" },
    fort:             { dur: [90, 120], durLabel: "1.5–2 hours",   tip: "Wear sun protection — the upper ramparts have no shade.", food: "dhaba just outside the main gate" },
    stadium:          { dur: [40,  60], durLabel: "45 min–1 hour", tip: "Check for match-day or event schedules before visiting.", food: "snack counters inside" },
    shopping_mall:    { dur: [90, 120], durLabel: "1.5–2 hours",   tip: "Food courts on the top floor often have the best variety.", food: "food court on the top floor" },
    spa:              { dur: [60, 120], durLabel: "1–2 hours",     tip: "Book treatments in advance, especially on weekends.", food: "herbal tea in the lounge" },
    university:       { dur: [45,  60], durLabel: "45 min",        tip: "The campus grounds are usually open to visitors during the day.", food: "student canteen" },
    library:          { dur: [30,  45], durLabel: "30–45 min",     tip: "Some heritage libraries require prior permission — call ahead.", food: "chai stall nearby" },
    night_club:       { dur: [120,180], durLabel: "2–3 hours",     tip: "Entry is smoother if you arrive before 10 PM.", food: "dinner before you arrive" },
};

const CITY_FOOD = {
    "Goa":          ["fish curry rice at a beachside shack","prawn balchão at a local taverna","bebinca for dessert at a heritage café","Goan sausage pav from a roadside stall"],
    "Delhi":        ["chole bhature at a Connaught Place dhaba","paranthe at Paranthe Wali Gali in Old Delhi","butter chicken at a local dhaba","chaat at a street stall near the monument"],
    "Agra":         ["petha sweet from a famous Agra shop","mughlai biryani at a local restaurant","bedai-sabzi breakfast at a street stall","dalmoth with chai at a roadside stall"],
    "Jaipur":       ["dal baati churma at a traditional thali restaurant","pyaaz kachori at a Jaipur street stall","ghewar sweet from a local mithai shop","laal maas at a rajasthani dhaba"],
    "Mumbai":       ["vada pav from a street stall","pav bhaji at Juhu beach stalls","misal pav at a local eatery","bhelpuri from a Chowpatty vendor"],
    "Kolkata":      ["mishti doi from a famous sweet shop","kathi roll from a local stall","jhal muri near the attraction","rasgulla from a traditional sweet shop"],
    "Bengaluru":    ["masala dosa at a local darshini","filter coffee at a traditional Udupi restaurant","bisibelebath at a local mess","mangalore buns at a breakfast stall"],
    "Bangalore":    ["masala dosa at a local darshini","filter coffee at a traditional Udupi restaurant","bisibelebath at a local mess","mangalore buns at a breakfast stall"],
    "Hyderabad":    ["Hyderabadi dum biryani at a local restaurant","haleem at a famous Old City eatery","Irani chai and osmania biscuits at a traditional café","mirchi ka salan at a dhaba"],
    "Chennai":      ["idli-sambar at a local Brahmin café","chettinad chicken at a family restaurant","filter coffee at a traditional coffee house","sundal from a Marina Beach vendor"],
    "Kochi":        ["Kerala fish curry with red rice at a local restaurant","appam and stew at a homestay café","seafood thali at a backwater restaurant","tender coconut near the waterfront"],
    "Varanasi":     ["thandai at a famous lassi shop near the ghats","aloo tikki chaat from a roadside stall","banarasi paan after the meal","kachori-sabzi breakfast near the ghat"],
    "Manali":       ["Himachali trout at a riverside dhaba","thukpa at a local Tibetan café","sidu (local bread) with ghee at a village stall","apple-flavored lassi from a hill stall"],
    "Shimla":       ["madra (chickpea curry) at a local dhaba","sidu bread with ghee from a stall on Mall Road","apple juice from a local shop","Himachali chicken at a restaurant"],
    "Amritsar":     ["langar at Golden Temple (free community meal)","Amritsari kulcha at a famous eatery","lassi at a traditional lassi corner","fish tikka near Hall Bazaar"],
    "Jaisalmer":    ["dal baati churma at a desert camp restaurant","bajra roti with ker sangri at a local dhaba","camel milk tea from a stall near the fort","gatte ki sabzi at a rajasthani eatery"],
    "Udaipur":      ["dal baati churma with ghee at a lakeside restaurant","laal maas at a heritage hotel restaurant","malpua for dessert from a sweet shop","local thali near City Palace"],
    "Mysuru":       ["ragi mudde with chicken curry at a local mess","mysore pak sweet from a famous sweet shop","Mysore masala dosa at an Udupi restaurant","curd rice at a local darshini"],
    "Rishikesh":    ["banana lassi from a café on Laxman Jhula","thali at an ashram","Tibetan momos at a riverside café","maggi noodles and chai at a hilltop stall"],
    "Darjeeling":   ["first-flush Darjeeling tea at a tea estate shop","thukpa at a local Tibetan café","steamed momos from a street stall","churpi (hard cheese) from a local vendor"],
    "Ooty":         ["nilgiri tea with homemade cookies at a tea shop","fresh strawberries at a farm stall","mutton chops at a local restaurant","Toda tribal honey from a local market"],
    "Munnar":       ["cardamom tea at a spice garden café","appam with coconut milk stew at a homestay","fresh honey from a roadside stall","cardamom-spiced black tea at a hilltop café"],
    "Coorg":        ["pandi curry (pork) with akki roti at a local restaurant","coorg coffee at an estate café","Kadambuttu dumplings at a local eatery","bamboo shoot curry at a home-style restaurant"],
    "Pondicherry":  ["French-style croissant at a heritage café","prawn bouillabaisse at a seaside restaurant","filter coffee at a Tamil café","local seafood thali near the beach"],
    "Leh":          ["thukpa (noodle soup) at a local Tibetan restaurant","butter tea at a monastery café","skyu (pasta stew) at a traditional eatery","apricot jam with local bread from a market stall"],
    "Andaman Islands": ["fresh seafood thali at a beach shack","coconut water from a local vendor","fish and chips at a resort café","grilled barracuda at a beachside stall"],
};

const DEFAULT_FOOD = [
    "local thali at a nearby restaurant",
    "chai and snacks at a roadside stall",
    "street food from a popular local stall",
    "regional speciality at a family-run eatery",
];

const CITY_SUMMARIES = {
    "Goa":          ["sun-soaked beaches, heritage churches, and vibrant food", "Portuguese-flavoured streets, spice gardens, and turquoise coastline"],
    "Delhi":        ["Mughal monuments, bustling bazaars, and world-class street food", "ancient forts, colonial boulevards, and aromatic Old Delhi lanes"],
    "Agra":         ["the grandeur of Mughal architecture and timeless marble artistry", "iconic monuments that have stood for centuries under the Indian sky"],
    "Jaipur":       ["regal forts, pink-hued streets, and Rajput splendour", "royal palaces, vibrant bazaars, and desert-edge culture"],
    "Mumbai":       ["the city's iconic waterfront, colonial heritage, and cosmopolitan energy", "Bollywood glamour, colonial landmarks, and street food culture"],
    "Bengaluru":    ["garden-city parks, tech-age cafes, and heritage temples", "leafy avenues, craft breweries, and Dravidian temples"],
    "Bangalore":    ["garden-city parks, tech-age cafes, and heritage temples", "leafy avenues, craft breweries, and Dravidian temples"],
    "Hyderabad":    ["Nizami grandeur, aromatic biryanis, and glittering bazaars", "royal palaces, pearl markets, and the iconic Charminar"],
    "Varanasi":     ["the spiritual heartbeat of India along the Ganges ghats", "ancient temples, dawn boat rides, and centuries of living tradition"],
    "Manali":       ["snow-capped peaks, pine forests, and Himalayan adventure", "river rapids, alpine meadows, and Tibetan monasteries"],
    "Goa":          ["golden beaches, Portuguese-era churches, and lush spice farms", "coastal sunsets, night markets, and laid-back beach culture"],
};

function getPlaceType(description) {
    if (!description) return null;
    const d = description.toLowerCase();
    if (d.includes("museum"))     return "museum";
    if (d.includes("art gallery")) return "art_gallery";
    if (d.includes("beach"))      return "beach";
    if (d.includes("temple") || d.includes("hindu")) return "hindu_temple";
    if (d.includes("church"))     return "church";
    if (d.includes("mosque"))     return "mosque";
    if (d.includes("fort"))       return "fort";
    if (d.includes("palace"))     return "palace";
    if (d.includes("park") || d.includes("garden")) return "park";
    if (d.includes("zoo"))        return "zoo";
    if (d.includes("aquarium"))   return "aquarium";
    if (d.includes("water"))      return "waterfall";
    if (d.includes("amusement"))  return "amusement_park";
    if (d.includes("mall") || d.includes("shopping")) return "shopping_mall";
    if (d.includes("university")) return "university";
    if (d.includes("natural"))    return "natural_feature";
    return null;
}

function addMinutes(h, m, mins) {
    m += mins;
    h += Math.floor(m / 60);
    m %= 60;
    return { h: h % 24, m };
}

function fmt12(h, m) {
    const ampm = h < 12 ? "AM" : "PM";
    const hh   = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildItineraryFast(city, route, placesData, weather) {
    let h = 8, m = 0; // start at 8:00 AM
    const foodPool  = CITY_FOOD[city] || DEFAULT_FOOD;
    let foodIdx     = 0;

    const places = route.map((name, i) => {
        const pd   = placesData?.find(p => p.name === name) || {};
        const type = getPlaceType(pd.description || "");
        const tmpl = PLACE_TYPES[type] || { dur: [60, 90], durLabel: "1–1.5 hours", tip: "Visit early to beat the crowds and enjoy cooler weather.", food: null };

        const startStr = fmt12(h, m);
        // duration varies slightly by position (morning places slightly shorter)
        const durMins = tmpl.dur[0] + (i % 2 === 0 ? 0 : Math.floor((tmpl.dur[1] - tmpl.dur[0]) / 2));
        const end = addMinutes(h, m, durMins);
        h = end.h; m = end.m;
        const endStr = fmt12(h, m);

        // 25 min travel to next
        const next = addMinutes(h, m, 25);
        h = next.h; m = next.m;

        const nearbyFood = tmpl.food
            ? `${foodPool[foodIdx % foodPool.length]} (near the ${type?.replace(/_/g, " ") || "attraction"})`
            : foodPool[foodIdx % foodPool.length];
        foodIdx++;

        return {
            name,
            bestTime:   `${startStr} – ${endStr}`,
            duration:   tmpl.durLabel,
            tip:        tmpl.tip,
            nearbyFood,
        };
    });

    const cityKey   = Object.keys(CITY_SUMMARIES).find(k => k.toLowerCase() === city?.toLowerCase());
    const summaries = cityKey ? CITY_SUMMARIES[cityKey] : null;
    const theme     = summaries ? summaries[Math.floor(Math.random() * summaries.length)] : `the best of ${city}`;
    const n         = route.length;
    const weatherNote = weather
        ? ` Expect ${Math.round(weather.temp)}°C and ${weather.description} — ${weather.temp > 34 ? "carry water and start early" : weather.temp < 18 ? "bring a light jacket" : "a comfortable day for exploring"}.`
        : "";

    const summary = `Your ${n}-stop day covers ${theme}.${weatherNote} Follow this order for minimum travel time between attractions.`;

    const logisticsTips = [
        "Book any ticketed attractions online the evening before to skip queues.",
        "Keep ₹500 in cash for entry fees and street food — many small stalls don't accept cards.",
        "Use Google Maps offline mode: download the city map before you head out.",
        "Start no later than 8 AM — popular spots fill up by mid-morning.",
        "Wear comfortable walking shoes; you'll easily cover 8–12 km during the day.",
    ];
    if (weather?.temp > 34) logisticsTips.unshift("It's going to be hot — carry a 1-litre water bottle and apply sunscreen before you leave.");
    if (weather?.humidity > 75) logisticsTips.unshift("High humidity today; wear breathable fabrics and take short breaks in shaded areas.");

    const proTip = logisticsTips[Math.floor(Math.random() * Math.min(3, logisticsTips.length))];

    return { summary, proTip, places };
}

// POST /api/ai/itinerary/fast — instant template-based, no Ollama
exports.generateItineraryFast = (req, res) => {
    const { city, route, placesData, weather } = req.body;
    if (!city || !Array.isArray(route) || route.length === 0) {
        return res.status(400).json({ error: "city and route are required" });
    }
    res.json(buildItineraryFast(city, route, placesData, weather));
};

// POST /api/ai/itinerary
exports.generateItinerary = async (req, res) => {
    const { city, date, route, placesData, weather } = req.body;

    if (!city || !Array.isArray(route) || route.length === 0) {
        return res.status(400).json({ error: "city and route are required" });
    }

    const weatherLine = weather
        ? `Current weather: ${Math.round(weather.temp)}°C, ${weather.description}, humidity ${weather.humidity}%`
        : "";

    const placesList = route.map((name, i) => {
        const p = placesData?.find(pl => pl.name === name);
        const desc   = p?.description ? ` (${p.description})` : "";
        const rating = p?.rating ? ` — rated ${p.rating}/5` : "";
        return `${i + 1}. ${name}${desc}${rating}`;
    }).join("\n");

    const dateStr = date
        ? new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Not specified";

    const prompt = `You are an expert travel guide for India. Generate a practical one-day itinerary for a trip to ${city}.

Optimized visit order:
${placesList}

Travel date: ${dateStr}
${weatherLine}

For EACH place provide:
- bestTime: specific time window (e.g. "9:00 AM - 11:00 AM")
- duration: how long to spend there (e.g. "1.5 hours")
- tip: one practical insider tip specific to this place
- nearbyFood: one food recommendation near this place (dish + type of place)

Also provide:
- summary: 2-sentence overview of the full day
- proTip: one overall logistics/weather/money tip for the entire day

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "...",
  "proTip": "...",
  "places": [
    { "name": "...", "bestTime": "...", "duration": "...", "tip": "...", "nearbyFood": "..." }
  ]
}`;

    try {
        const itinerary = await groqJSON(prompt, 2000);
        res.json(itinerary);
    } catch (err) {
        console.error("Itinerary generation error:", err.message);
        res.status(500).json({ error: "Failed to generate itinerary" });
    }
};

// POST /api/ai/itinerary/stream — SSE streaming version
exports.generateItineraryStream = async (req, res) => {
    const { city, date, route, placesData, weather } = req.body;

    if (!city || !Array.isArray(route) || route.length === 0) {
        return res.status(400).json({ error: "city and route are required" });
    }

    const weatherLine = weather
        ? `Current weather: ${Math.round(weather.temp)}°C, ${weather.description}, humidity ${weather.humidity}%`
        : "";

    const placesList = route.map((name, i) => {
        const p = placesData?.find(pl => pl.name === name);
        const desc   = p?.description ? ` (${p.description})` : "";
        const rating = p?.rating ? ` — rated ${p.rating}/5` : "";
        return `${i + 1}. ${name}${desc}${rating}`;
    }).join("\n");

    const dateStr = date
        ? new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Not specified";

    const systemMsg = `You are a structured travel planner. You ONLY output valid JSON. Never add explanations or markdown. Every place in the list MUST appear in the "places" array with all five fields: name, bestTime, duration, tip, nearbyFood. Do not skip any place.`;

    const userPrompt = `Generate a one-day itinerary for ${city}, India.

Optimized visit order:
${placesList}

Travel date: ${dateStr}
${weatherLine}

Return ONLY this JSON structure — every place must be included:
{
  "summary": "2-sentence day overview",
  "proTip": "one logistics/weather/money tip for the full day",
  "places": [
    { "name": "exact place name", "bestTime": "9:00 AM – 11:00 AM", "duration": "1.5 hours", "tip": "specific insider tip", "nearbyFood": "dish at type of place" }
  ]
}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model:       GROQ_MODEL,
                stream:      true,
                max_tokens:  2000,
                temperature: 0.2,
                messages: [
                    { role: "system", content: systemMsg },
                    { role: "user",   content: userPrompt },
                ],
            },
            {
                headers:      { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                responseType: "stream",
                timeout:      60000,
            }
        );

        response.data.on("data", chunk => {
            const lines = chunk.toString().split("\n").filter(l => l.trim());
            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6);
                if (payload === "[DONE]") { res.write(`data: [DONE]\n\n`); res.end(); return; }
                try {
                    const parsed = JSON.parse(payload);
                    const token  = parsed.choices?.[0]?.delta?.content ?? "";
                    if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
                } catch {}
            }
        });

        response.data.on("end",   () => { if (!res.writableEnded) res.end(); });
        response.data.on("error", err => {
            console.error("Stream error:", err.message);
            if (!res.writableEnded) res.end();
        });

        req.on("close", () => response.data.destroy());

    } catch (err) {
        console.error("Itinerary stream error:", err.message);
        if (!res.writableEnded) res.end();
    }
};

// ── Rule-based date suggestion (instant, no Ollama) ──────────────────────────
// months are 1-indexed (1=Jan … 12=Dec)
const REGION_RULES = [
    {
        // Himalayan destinations — road closures in winter
        cities: ["Manali","Shimla","Auli","Leh","Dharamsala","Mussoorie","Nainital","Dehradun","Kullu"],
        rules: [
            { months: [5,6,9,10],   severity: "info",    message: "Excellent time! Clear skies, moderate temperatures, and all roads open — ideal for sightseeing and adventure.", bestMonths: ["May","June","September","October"] },
            { months: [7,8],        severity: "warning",  message: "Monsoon season: expect heavy rain, landslides, and some road closures. Check NHTM road status before travel.", bestMonths: ["May","June","September","October"] },
            { months: [11,12,1,2],  severity: "warning",  message: "Winter: snow above 2,000 m, some roads blocked. Leh-Manali highway typically closed. Pack very warm clothing.", bestMonths: ["May","June","September","October"] },
            { months: [3,4],        severity: "info",     message: "Early spring — snow melts and roads reopen. Can be cold but beautiful. Confirm road conditions before heading up.", bestMonths: ["May","June","September","October"] },
        ],
    },
    {
        // Rajasthan desert cities
        cities: ["Jaipur","Jodhpur","Jaisalmer","Udaipur","Ajmer","Pushkar"],
        rules: [
            { months: [10,11,12,1,2,3], severity: "info",    message: "Peak season — cool, clear, and festive. Best time for forts, markets, and camel safaris.", bestMonths: ["October","November","December","January","February"] },
            { months: [4,5,6],          severity: "warning",  message: "Intense summer heat (40–48°C). Plan early-morning or evening outings; carry plenty of water.", bestMonths: ["October","November","December","January","February"] },
            { months: [7,8,9],          severity: "warning",  message: "Mild monsoon rains refresh the desert. Temperatures drop but humidity rises. Roads stay open.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
    {
        // Goa and coastal Karnataka
        cities: ["Goa","Mangalore","Udupi"],
        rules: [
            { months: [11,12,1,2,3],    severity: "info",    message: "Perfect beach weather — sunny skies, gentle waves, and lively nightlife. Book early.", bestMonths: ["November","December","January","February","March"] },
            { months: [10],             severity: "info",     message: "Post-monsoon freshness: beaches are clean, crowds thin, and prices lower.", bestMonths: ["November","December","January","February"] },
            { months: [4,5],            severity: "warning",  message: "Pre-monsoon heat and high humidity. Many shacks close; sea turns rough.", bestMonths: ["November","December","January","February"] },
            { months: [6,7,8,9],        severity: "alert",    message: "Heavy monsoon — rough seas, strong currents, and most beach shacks shut. Not ideal for a beach trip.", bestMonths: ["November","December","January","February","March"] },
        ],
    },
    {
        // Kerala & Western Ghats
        cities: ["Kochi","Munnar","Wayanad","Kovalam","Varkala","Coorg","Chikmagalur"],
        rules: [
            { months: [12,1,2,3],       severity: "info",    message: "Ideal — cool mornings, clear skies, and lush green landscapes post-monsoon.", bestMonths: ["December","January","February","March"] },
            { months: [10,11],          severity: "info",     message: "Post-monsoon freshness with good weather and lower prices.", bestMonths: ["December","January","February","March"] },
            { months: [4,5],            severity: "warning",  message: "Hot and humid before the monsoon arrives. Backwaters and indoor attractions remain enjoyable.", bestMonths: ["December","January","February","March"] },
            { months: [6,7,8,9],        severity: "warning",  message: "Southwest monsoon — spectacular waterfalls and green hills, but heavy rain can disrupt outdoor plans.", bestMonths: ["December","January","February","March"] },
        ],
    },
    {
        // North-East India & Sikkim hills
        cities: ["Darjeeling","Gangtok","Sikkim","Guwahati","Arunachal Pradesh"],
        rules: [
            { months: [3,4,5,10,11],    severity: "info",    message: "Excellent — clear mountain views, rhododendrons in bloom (spring) or golden forests (autumn).", bestMonths: ["March","April","October","November"] },
            { months: [12,1,2],         severity: "info",     message: "Cold but clear; good visibility of Kanchenjunga. Carry warm layers.", bestMonths: ["March","April","October","November"] },
            { months: [6,7,8,9],        severity: "warning",  message: "Monsoon: heavy rainfall, frequent landslides, and low visibility. Some roads may close.", bestMonths: ["March","April","October","November"] },
        ],
    },
    {
        // South Indian plains
        cities: ["Chennai","Hyderabad","Bengaluru","Bangalore","Mysuru","Mysore","Coimbatore","Ooty","Madurai","Vijayawada","Visakhapatnam","Tirupati"],
        rules: [
            { months: [11,12,1,2,3],    severity: "info",    message: "Best time — comfortable temperatures, clear skies, and all festivals in full swing.", bestMonths: ["November","December","January","February","March"] },
            { months: [4,5,6],          severity: "warning",  message: "Summer heat builds (35–42°C). Start days early, stay hydrated, and seek shade in the afternoon.", bestMonths: ["November","December","January","February"] },
            { months: [7,8,9,10],       severity: "info",     message: "Moderate monsoon (Northeast monsoon in Oct–Nov for TN/AP). Lush scenery; carry an umbrella.", bestMonths: ["November","December","January","February"] },
        ],
    },
    {
        // Spiritual & Gangetic plain
        cities: ["Varanasi","Allahabad","Prayagraj","Mathura","Vrindavan","Ayodhya","Haridwar","Rishikesh","Ujjain"],
        rules: [
            { months: [10,11,12,1,2,3], severity: "info",    message: "Best time — pleasant weather for ghats, temples, and river ceremonies. Dev Deepawali (Nov) is spectacular.", bestMonths: ["October","November","December","January","February","March"] },
            { months: [4,5,6],          severity: "warning",  message: "Very hot (40–46°C) and humid. Visit early morning for ghat rituals; most sightseeing should end by 10 AM.", bestMonths: ["October","November","December"] },
            { months: [7,8,9],          severity: "warning",  message: "Monsoon: Ganges floods, river ceremonies continue but ghats may be partially submerged.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
    {
        // Delhi, Agra and nearby
        cities: ["Delhi","Agra","Fatehpur Sikri","Gorakhpur"],
        rules: [
            { months: [10,11,12,1,2],   severity: "info",    message: "Peak season — comfortable weather, clear skies for the Taj Mahal and monuments. Book hotels early.", bestMonths: ["October","November","December","January","February"] },
            { months: [3],              severity: "info",     message: "Warm but still pleasant for sightseeing. Watch for Holi crowds in March.", bestMonths: ["October","November","December","January","February"] },
            { months: [4,5,6],          severity: "warning",  message: "Scorching heat (42–48°C) and dust storms. Mornings only; carry sunscreen and lots of water.", bestMonths: ["October","November","December","January","February"] },
            { months: [7,8,9],          severity: "warning",  message: "Monsoon: heavy rain, high humidity. Monuments are less crowded and the city turns green.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
    {
        // Mumbai and Maharashtra
        cities: ["Mumbai","Pune","Lonavala","Nashik","Aurangabad"],
        rules: [
            { months: [11,12,1,2,3],    severity: "info",    message: "Ideal weather — cool and dry. Beaches, Ajanta–Ellora, and city exploration at their best.", bestMonths: ["November","December","January","February","March"] },
            { months: [4,5],            severity: "warning",  message: "Pre-monsoon heat and humidity. Indoors and evenings remain enjoyable.", bestMonths: ["November","December","January","February"] },
            { months: [6,7,8,9],        severity: "warning",  message: "Mumbai monsoon is dramatic — very heavy rain, waterlogging, and flooding in low areas. Caves and waterfalls are stunning.", bestMonths: ["November","December","January","February"] },
            { months: [10],             severity: "info",     message: "Post-monsoon: city dries out, temperatures drop, and Durga Puja/Navratri add festive energy.", bestMonths: ["November","December","January","February"] },
        ],
    },
    {
        // Kolkata and East
        cities: ["Kolkata","Bhubaneswar","Konark","Patna"],
        rules: [
            { months: [10,11,12,1,2,3], severity: "info",    message: "Best time — pleasant weather and Durga Puja (Oct) is a once-in-a-lifetime cultural experience.", bestMonths: ["October","November","December","January","February"] },
            { months: [4,5,6],          severity: "warning",  message: "Intense heat and humidity (38–42°C). Kolkata is tolerable with AC; Bhubaneswar beaches are less crowded.", bestMonths: ["October","November","December","January","February"] },
            { months: [7,8,9],          severity: "warning",  message: "Monsoon: heavy rainfall and high humidity. Konark and coastal sites may be affected by cyclone warnings.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
    {
        // Andaman & Island destinations
        cities: ["Andaman Islands","Andaman","Port Blair","Diu"],
        rules: [
            { months: [11,12,1,2,3,4],  severity: "info",    message: "Best time — crystal-clear water, excellent visibility for snorkelling and diving, and pleasant temperatures.", bestMonths: ["November","December","January","February","March"] },
            { months: [5],              severity: "info",     message: "Start of off-season but still good for diving before the monsoon arrives.", bestMonths: ["November","December","January","February"] },
            { months: [6,7,8,9,10],     severity: "alert",    message: "Heavy monsoon and cyclone risk. Sea conditions are dangerous; ferry and flight disruptions are common. Avoid if possible.", bestMonths: ["November","December","January","February","March"] },
        ],
    },
    {
        // Punjab & Northwest
        cities: ["Amritsar","Chandigarh","Jammu","Gurugram","Ludhiana"],
        rules: [
            { months: [10,11,12,1,2,3], severity: "info",    message: "Great time — cool weather for the Golden Temple, Wagah Border, and city exploration.", bestMonths: ["October","November","December","January","February"] },
            { months: [4,5,6],          severity: "warning",  message: "Hot summer (40°C+). The Golden Temple is open 24/7 — visit at dawn for cooler temperatures.", bestMonths: ["October","November","December","January","February"] },
            { months: [7,8,9],          severity: "info",     message: "Monsoon: moderate rain cools things down. Fields turn lush green — beautiful countryside scenery.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
    {
        // Gujarat
        cities: ["Ahmedabad","Dwarka","Rann of Kutch","Surat","Vadodara","Gandhinagar"],
        rules: [
            { months: [11,12,1,2,3],    severity: "info",    message: "Perfect — comfortable weather for Rann Utsav (Nov–Feb) and heritage sites.", bestMonths: ["November","December","January","February","March"] },
            { months: [4,5,6],          severity: "warning",  message: "Extreme heat in Gujarat (42–48°C). Coastal Dwarka and Diu are more bearable than the interior.", bestMonths: ["November","December","January","February"] },
            { months: [7,8,9,10],       severity: "warning",  message: "Monsoon: the Rann of Kutch is flooded (inaccessible). Other sites open; occasional heavy rain.", bestMonths: ["November","December","January","February"] },
        ],
    },
    {
        // Karnataka heritage
        cities: ["Hampi","Badami","Bijapur","Belgaum"],
        rules: [
            { months: [10,11,12,1,2,3], severity: "info",    message: "Best season — comfortable for exploring ruins and temples all day.", bestMonths: ["October","November","December","January","February"] },
            { months: [4,5,6],          severity: "warning",  message: "Very hot (38–42°C). Visit at sunrise and sunset; rest in shade midday.", bestMonths: ["October","November","December","January","February"] },
            { months: [7,8,9],          severity: "info",     message: "Monsoon: ruins look dramatic in the rain and crowds thin. Watch for slippery paths.", bestMonths: ["October","November","December","January","February"] },
        ],
    },
];

// Fallback rule when no city-specific region is found
const DEFAULT_RULES = [
    { months: [10,11,12,1,2,3], severity: "info",    message: "Generally a great time to visit. Most of India enjoys cool, dry weather in winter — ideal for sightseeing.", bestMonths: ["October","November","December","January","February","March"] },
    { months: [4,5,6],          severity: "warning",  message: "Pre-monsoon heat across most of India. Plan early mornings and use air-conditioned transport where possible.", bestMonths: ["October","November","December","January","February"] },
    { months: [7,8,9],          severity: "warning",  message: "Monsoon season across most of India. Rain can be heavy — carry an umbrella and check road conditions.", bestMonths: ["October","November","December","January","February"] },
];

function getDateSuggestionSync(city, month) {
    const normalised = city?.toLowerCase().trim() ?? "";
    const region = REGION_RULES.find(r =>
        r.cities.some(c => c.toLowerCase() === normalised)
    );
    const rules = region?.rules ?? DEFAULT_RULES;
    const rule  = rules.find(r => r.months.includes(month)) ?? rules[0];
    return {
        suitable:   rule.severity !== "alert",
        severity:   rule.severity,
        message:    rule.message,
        bestMonths: rule.bestMonths,
    };
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// POST /api/ai/date-suggestion
exports.getDateSuggestion = async (req, res) => {
    const { city, date } = req.body;

    if (!city || !date) {
        return res.status(400).json({ error: "city and date are required" });
    }

    const month = new Date(date).getMonth() + 1; // 1-indexed

    // Fast path — city is covered by regional rules
    const normalised = city.toLowerCase().trim();
    const inRules = REGION_RULES.some(r =>
        r.cities.some(c => c.toLowerCase() === normalised)
    );
    if (inRules) return res.json(getDateSuggestionSync(city, month));

    // LLM path — city not in regional rules, ask Ollama
    const monthName = MONTH_NAMES[month - 1];
    const prompt = `You are a travel expert. Is ${monthName} a good time to visit ${city}?
Return ONLY valid JSON, no extra text:
{"suitable":true,"severity":"info","message":"2-3 sentences about weather and what to expect in ${monthName} at ${city}","bestMonths":["Month1","Month2"]}
Rules: severity must be "info" (great time), "warning" (caution advised), or "alert" (not recommended). suitable is false only when severity is "alert".`;

    try {
        const result = await groqJSON(prompt, 250);
        if (!result.message || !result.severity) throw new Error("incomplete LLM response");
        return res.json({
            suitable:   result.severity !== "alert",
            severity:   result.severity,
            message:    result.message,
            bestMonths: Array.isArray(result.bestMonths) ? result.bestMonths : [],
            source:     "llm",
        });
    } catch {
        // Ollama unavailable or bad output — fall back to generic rules
        return res.json(getDateSuggestionSync(city, month));
    }
};

// POST /api/ai/search
// Keyword → city mapping for instant natural-language city search
const SEARCH_KEYWORDS = [
    { keywords: ["beach","beaches","coast","coastal","seaside","surf","waves","sand"],                  city: "Goa" },
    { keywords: ["snow","skiing","ski","snowfall","snowboard","glacier","alpine"],                       city: "Manali" },
    { keywords: ["desert","dunes","sand dune","camel","camel ride","thar"],                             city: "Jaisalmer" },
    { keywords: ["backwater","houseboat","lagoon","ayurveda","kerala"],                                  city: "Kochi" },
    { keywords: ["tea","tea garden","plantation","munnar"],                                              city: "Munnar" },
    { keywords: ["spiritual","ghat","ganges","holy","varanasi","banaras","moksha"],                      city: "Varanasi" },
    { keywords: ["taj mahal","mughal","agra fort","agra"],                                               city: "Agra" },
    { keywords: ["pink city","jaipur","amber fort","jal mahal","palace"],                               city: "Jaipur" },
    { keywords: ["tech hub","silicon valley","bangalore","bengaluru","startup","it city"],               city: "Bengaluru" },
    { keywords: ["hill station","ooty","nilgiri","botanical garden"],                                    city: "Ooty" },
    { keywords: ["yoga","meditation","rishikesh","rafting","river rafting","ashram"],                    city: "Rishikesh" },
    { keywords: ["golden temple","amritsar","wagah","punjab","sikh"],                                    city: "Amritsar" },
    { keywords: ["rann","kutch","salt","white desert","gujarat","kite festival"],                        city: "Ahmedabad" },
    { keywords: ["hampi","ruins","vijayanagara","karnataka","boulder"],                                  city: "Hampi" },
    { keywords: ["darjeeling","tiger hill","toy train","himalaya tea"],                                  city: "Darjeeling" },
    { keywords: ["leh","ladakh","pangong","nubra","monastery","high altitude"],                          city: "Leh" },
    { keywords: ["shimla","mall road","colonial","vice regal","apple"],                                  city: "Shimla" },
    { keywords: ["wayanad","wildlife","forest","treehouse","kerala hills"],                              city: "Wayanad" },
    { keywords: ["mysore","mysuru","palace","dasara","sandalwood","coorg"],                              city: "Mysuru" },
    { keywords: ["pondicherry","puducherry","french","auroville","french quarter"],                      city: "Pondicherry" },
    { keywords: ["andaman","island","scuba","diving","havelock","neil island"],                          city: "Andaman Islands" },
    { keywords: ["haridwar","kumbh","ganga aarti","rishikesh"],                                         city: "Haridwar" },
    { keywords: ["manali","rohtang","beas","adventure","himachal"],                                     city: "Manali" },
    { keywords: ["coorg","kodagu","coffee","misty","hills","abbey falls"],                               city: "Coorg" },
    { keywords: ["udaipur","lake palace","mewar","city of lakes","rajputana"],                           city: "Udaipur" },
    { keywords: ["jodhpur","blue city","mehrangarh","rajasthan"],                                        city: "Jodhpur" },
    { keywords: ["varkala","cliff beach","papanasam"],                                                   city: "Varkala" },
    { keywords: ["kovalam","lighthouse beach","trivandrum","thiruvananthapuram"],                        city: "Kovalam" },
    { keywords: ["chikmagalur","coffe estate","baba budangiri","mullayanagiri"],                         city: "Chikmagalur" },
    { keywords: ["gangtok","sikkim","kanchenjunga","northeast","rumtek"],                                city: "Gangtok" },
    { keywords: ["pushkar","brahma temple","camel fair","ajmer"],                                        city: "Pushkar" },
    { keywords: ["lonavala","khandala","bhushi dam","pune"],                                             city: "Lonavala" },
    { keywords: ["ranthambore","tiger","wildlife safari","jungle","national park"],                      city: "Ranthambore" },
    { keywords: ["mumbai","bombay","marine drive","bollywood","gateway of india","juhu"],                city: "Mumbai" },
    { keywords: ["delhi","red fort","qutub minar","india gate","old delhi","new delhi"],                 city: "Delhi" },
    { keywords: ["guwahati","kaziranga","rhino","assam","northeast"],                                    city: "Guwahati" },
    { keywords: ["hyderabad","charminar","biryani","golconda","nawab","pearl city"],                     city: "Hyderabad" },
    { keywords: ["kolkata","calcutta","victoria memorial","durga puja","howrah"],                        city: "Kolkata" },
    { keywords: ["jaisalmer","golden city","fort","thar","sam dunes"],                                  city: "Jaisalmer" },
    { keywords: ["auli","skiing resort","uttarakhand","cable car","nanda devi"],                         city: "Auli" },
];

function keywordCitySearch(query) {
    const q = query.toLowerCase();
    // Exact or partial city name match
    const exactCity = INDIA_CITIES.find(c => q.includes(c.toLowerCase()));
    if (exactCity) return { city: exactCity, confidence: "high" };

    // Keyword match — pick best scoring entry
    let bestCity = null, bestScore = 0;
    for (const entry of SEARCH_KEYWORDS) {
        const score = entry.keywords.filter(kw => q.includes(kw)).length;
        if (score > bestScore) { bestScore = score; bestCity = entry.city; }
    }
    if (bestCity) return { city: bestCity, confidence: bestScore >= 2 ? "high" : "medium" };
    return null;
}

exports.parseSearch = async (req, res) => {
    const { query } = req.body;

    if (!query?.trim()) {
        return res.status(400).json({ error: "query is required" });
    }

    const instant = keywordCitySearch(query.trim());
    if (instant) return res.json(instant);

    // No keyword match → try Ollama with a short prompt and short timeout
    try {
        const result = await groqJSON(
            `Indian city for: "${query.trim()}". Cities: ${INDIA_CITIES.join(",")}. JSON: {"city":"...","confidence":"medium"}`,
            40
        );
        if (!INDIA_CITIES.includes(result.city)) {
            const loose = INDIA_CITIES.find(c => c.toLowerCase() === result.city?.toLowerCase());
            result.city = loose || result.city;
        }
        return res.json(result);
    } catch {
        // If Ollama fails, return the raw query and let the frontend handle it
        return res.json({ city: query.trim(), confidence: "low" });
    }
};

// POST /api/ai/chat/stream — conversational follow-up, SSE streaming
exports.chatStream = async (req, res) => {
    const { city, route, messages, pageContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages array required" });
    }

    const routeList = Array.isArray(route) && route.length > 0
        ? route.join(", ")
        : null;

    const contextBlock = pageContext
        ? `\n\nCurrent page context:\n${pageContext}`
        : "";

    const routeBlock = routeList
        ? `\nThe user has planned a trip visiting: ${routeList}.`
        : "";

    const system = `You are a knowledgeable travel assistant for ${city || "India"}.${routeBlock}${contextBlock}

When the user refers to "this page", "these places", "shown here", or "select some" — use ONLY the places or data listed in the page context above to answer. Do not invent places not listed there.

Answer travel questions helpfully. Structure every response clearly:
- Use short bullet points (start each with "- ") for lists of tips, options, or items.
- Use "**word**" to bold key terms or place names.
- Break your answer into 1-3 short paragraphs when explaining something in detail.
- Keep total response under 150 words.
- Never write one long continuous sentence — always use line breaks and bullets.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model:       GROQ_MODEL,
                stream:      true,
                max_tokens:  300,
                temperature: 0.5,
                messages: [
                    { role: "system", content: system },
                    ...messages,
                ],
            },
            {
                headers:      { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                responseType: "stream",
                timeout:      60000,
            }
        );

        response.data.on("data", chunk => {
            const lines = chunk.toString().split("\n").filter(l => l.trim());
            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6);
                if (payload === "[DONE]") { res.write(`data: [DONE]\n\n`); res.end(); return; }
                try {
                    const parsed = JSON.parse(payload);
                    const token  = parsed.choices?.[0]?.delta?.content ?? "";
                    if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
                } catch {}
            }
        });

        response.data.on("end",   () => { if (!res.writableEnded) res.end(); });
        response.data.on("error", () => { if (!res.writableEnded) res.end(); });
        req.on("close", () => response.data.destroy());

    } catch (err) {
        console.error("Chat stream error:", err.message);
        if (!res.writableEnded) res.end();
    }
};

// Haversine distance in metres between two {lat, lng} points
function haversineM(a, b) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(h));
}

// K-means++ with haversine distance
function kMeans(points, k, maxIter = 100) {
    // K-means++ initialisation: spread starting centroids out
    const centroids = [points[Math.floor(Math.random() * points.length)]];
    while (centroids.length < k) {
        const dists = points.map(p => Math.min(...centroids.map(c => haversineM(p, c))));
        const total = dists.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < dists.length; i++) {
            r -= dists[i];
            if (r <= 0) { centroids.push(points[i]); break; }
        }
        if (centroids.length < k) centroids.push(points[dists.indexOf(Math.max(...dists))]);
    }

    let labels = new Array(points.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        const newLabels = points.map(p => {
            let minD = Infinity, nearest = 0;
            centroids.forEach((c, i) => { const d = haversineM(p, c); if (d < minD) { minD = d; nearest = i; } });
            return nearest;
        });

        if (newLabels.every((l, i) => l === labels[i])) break;
        labels = newLabels;

        centroids.forEach((_, ci) => {
            const pts = points.filter((_, i) => labels[i] === ci);
            if (pts.length) {
                centroids[ci] = {
                    lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
                    lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
                };
            }
        });
    }

    return labels;
}

// Pick k based on how geographically spread the places are.
// 0.05° ≈ 5.5 km, 0.12° ≈ 13 km, 0.25° ≈ 27 km
function chooseK(places) {
    if (places.length <= 2) return 1;
    const lats = places.map(p => p.lat);
    const lngs = places.map(p => p.lng);
    const spread = Math.max(
        Math.max(...lats) - Math.min(...lats),
        Math.max(...lngs) - Math.min(...lngs)
    );
    if (spread < 0.05) return 1;
    if (spread < 0.12) return Math.min(2, Math.floor(places.length / 2));
    if (spread < 0.25) return Math.min(3, Math.floor(places.length / 2));
    return Math.min(Math.ceil(places.length / 3), 5);
}

// Returns { labels: number[], k: number }
// labels[i] is the cluster id (0-indexed, assigned in order of first appearance in the array)
exports.clusterPlaces = (places) => {
    const k = chooseK(places);
    if (k <= 1) return { labels: new Array(places.length).fill(0), k: 1 };

    const raw = kMeans(places, k);

    // Re-number clusters 0..k-1 in order of first appearance so cluster 0 is the first place's cluster
    const seen = new Map();
    let next = 0;
    const labels = raw.map(l => {
        if (!seen.has(l)) seen.set(l, next++);
        return seen.get(l);
    });

    return { labels, k: seen.size };
};

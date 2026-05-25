const { getDistanceMatrix, getPointDistance } = require("../services/googleApi");
const { nearestNeighborMatrix, nearestNeighbor, totalRouteDistance } = require("../utils/tsp");
const { clusterPlaces } = require("../utils/clustering");

const CLUSTER_COLORS = ["#F5A623", "#60a5fa", "#4ade80", "#f87171", "#c084fc"];

exports.optimizeRoute = async (req, res) => {
    try {
        const { locations, startPoint, endPoint } = req.body;

        if (!locations || locations.length < 2) {
            return res.status(400).json({ error: "At least 2 places required" });
        }

        const taggedPlaces = locations.map((p, i) => ({ ...p, _originalIndex: i }));

        let optimizedRoute;
        let distanceKm;
        let usedRealData = false;
        let distanceData = null;

        console.log(`[ROUTE] Optimizing ${locations.length} places:`, locations.map(l => l.name));

        distanceData = await getDistanceMatrix(locations);

        if (distanceData && distanceData.matrix) {
            console.log("[ROUTE] Distance Matrix: OK");
            optimizedRoute = nearestNeighborMatrix(taggedPlaces, distanceData.matrix);
            distanceKm     = totalRouteDistance(optimizedRoute, distanceData.matrix);
            usedRealData   = true;
        } else {
            console.log("[ROUTE] Distance Matrix: FAILED — using Haversine fallback");
            optimizedRoute = nearestNeighbor(taggedPlaces);
            distanceKm     = totalRouteDistance(optimizedRoute, null);
        }

        console.log("[ROUTE] Result:", optimizedRoute.map((p, i) => `${i + 1}. ${p.name}`));

        // Cluster the optimised route to annotate geographic zones
        const { labels, k } = clusterPlaces(optimizedRoute);
        const clusters = [];
        if (k > 1) {
            let current = -1;
            labels.forEach((cid, i) => {
                if (cid !== current) {
                    current = cid;
                    clusters.push({
                        id:       cid,
                        color:    CLUSTER_COLORS[clusters.length % CLUSTER_COLORS.length],
                        label:    `Zone ${clusters.length + 1}`,
                        startIdx: i,
                        places:   [],
                    });
                }
                clusters[clusters.length - 1].places.push(optimizedRoute[i].name);
            });
        }

        // Build response in the shape the frontend expects:
        // { route: [names], details: [{name, distToNext, timeToNext}], clusters, summary }
        const route = optimizedRoute.map(p => p.name);

        const details = optimizedRoute.map((p, i) => {
            if (i === optimizedRoute.length - 1) {
                return { name: p.name, distToNext: 0, timeToNext: 0 };
            }
            const fromIdx = p._originalIndex;
            const toIdx   = optimizedRoute[i + 1]._originalIndex;
            return {
                name:       p.name,
                distToNext: distanceData?.matrix?.[fromIdx]?.[toIdx] ?? 0,
                timeToNext: distanceData?.durationMatrix?.[fromIdx]?.[toIdx] ?? 0,
            };
        });

        // ── Start / End anchor legs ──
        // Calculate driving distance from startPoint → first stop and last stop → endPoint
        let startLeg = null;
        let endLeg   = null;

        const firstPlace = optimizedRoute[0];
        const lastPlace  = optimizedRoute[optimizedRoute.length - 1];

        if (startPoint?.value && firstPlace?.lat != null) {
            const firstCoord = `${firstPlace.lat},${firstPlace.lng}`;
            const legResult  = await getPointDistance(startPoint.value, firstCoord);
            if (legResult) {
                startLeg = {
                    distToNext:      legResult.distance.value,   // metres
                    timeToNext:      legResult.duration.value,   // seconds
                    resolvedAddress: legResult.originAddress,
                };
            }
        }

        if (endPoint?.value && lastPlace?.lat != null) {
            const lastCoord = `${lastPlace.lat},${lastPlace.lng}`;
            const legResult = await getPointDistance(lastCoord, endPoint.value);
            if (legResult) {
                endLeg = {
                    distToNext:      legResult.distance.value,
                    timeToNext:      legResult.duration.value,
                    resolvedAddress: legResult.destinationAddress,
                };
            }
        }

        res.json({
            route,
            details,
            clusters,
            startLeg,
            endLeg,
            summary: {
                totalDistanceKm: parseFloat(distanceKm),
                dataSource: usedRealData ? "Google Distance Matrix" : "Haversine (fallback)",
            },
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

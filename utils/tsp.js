// ── Haversine — fallback distance when Distance Matrix is unavailable ────────
function haversine(a, b) {
    const R = 6371000;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(h));
}

// ── Held-Karp DP — exact optimal open-path TSP ───────────────────────────────
// Time:  O(2^n · n²)   Space: O(2^n · n)
// Used when n ≤ DP_LIMIT (memory and runtime stay manageable up to n=15:
//   2^15 * 15 entries ≈ 5 MB, ~7M transitions — completes in < 50 ms)
const DP_LIMIT = 15;

function heldKarpMatrix(places, matrix) {
    const n    = places.length;
    const FULL = (1 << n) - 1;

    // Local n×n cost table so inner loop never does two indirect lookups
    const cost = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
            matrix[places[i]._originalIndex][places[j]._originalIndex]
        )
    );

    // dp[mask][i]  = min cost of an open path through exactly the nodes in mask, ending at i
    // par[mask][i] = predecessor of i in that optimal path (for reconstruction)
    const dp  = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(Infinity));
    const par = Array.from({ length: 1 << n }, () => new Int16Array(n).fill(-1));

    // Base: any single node can be the path start, cost 0
    for (let i = 0; i < n; i++) dp[1 << i][i] = 0;

    // Iterate over masks in ascending order — smaller masks are always ready first
    for (let mask = 1; mask <= FULL; mask++) {
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i)) || dp[mask][i] === Infinity) continue;
            const base = dp[mask][i];
            for (let j = 0; j < n; j++) {
                if (mask & (1 << j)) continue;           // j already visited
                const nc = base + cost[i][j];
                const nm = mask | (1 << j);
                if (nc < dp[nm][j]) {
                    dp[nm][j] = nc;
                    par[nm][j] = i;
                }
            }
        }
    }

    // Best last node across all full-mask entries
    let bestCost = Infinity, bestLast = 0;
    for (let i = 0; i < n; i++) {
        if (dp[FULL][i] < bestCost) { bestCost = dp[FULL][i]; bestLast = i; }
    }

    // Trace parent pointers to rebuild the route
    const route = [];
    let mask = FULL, curr = bestLast;
    while (mask > 0) {
        route.unshift(places[curr]);
        const prev = par[mask][curr];
        mask ^= (1 << curr);
        curr = prev;
    }
    return route;
}

function heldKarpHaversine(places) {
    const n    = places.length;
    const FULL = (1 << n) - 1;

    const cost = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => haversine(places[i], places[j]))
    );

    const dp  = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(Infinity));
    const par = Array.from({ length: 1 << n }, () => new Int16Array(n).fill(-1));

    for (let i = 0; i < n; i++) dp[1 << i][i] = 0;

    for (let mask = 1; mask <= FULL; mask++) {
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i)) || dp[mask][i] === Infinity) continue;
            const base = dp[mask][i];
            for (let j = 0; j < n; j++) {
                if (mask & (1 << j)) continue;
                const nc = base + cost[i][j];
                const nm = mask | (1 << j);
                if (nc < dp[nm][j]) {
                    dp[nm][j] = nc;
                    par[nm][j] = i;
                }
            }
        }
    }

    let bestCost = Infinity, bestLast = 0;
    for (let i = 0; i < n; i++) {
        if (dp[FULL][i] < bestCost) { bestCost = dp[FULL][i]; bestLast = i; }
    }

    const route = [];
    let mask = FULL, curr = bestLast;
    while (mask > 0) {
        route.unshift(places[curr]);
        const prev = par[mask][curr];
        mask ^= (1 << curr);
        curr = prev;
    }
    return route;
}

// ── Large-set fallback: multi-start NN + 2-opt + Or-opt(1) ──────────────────
// Used only when n > DP_LIMIT. All functions below are kept only for this path.

function twoOptMatrix(route, matrix) {
    let improved = true, iters = 0;
    while (improved && iters++ < 200) {
        improved = false;
        for (let i = 0; i < route.length - 2; i++) {
            for (let j = i + 2; j < route.length - 1; j++) {
                const a = route[i]._originalIndex, b = route[i+1]._originalIndex;
                const c = route[j]._originalIndex, d = route[j+1]._originalIndex;
                if (matrix[a][c] + matrix[b][d] < matrix[a][b] + matrix[c][d]) {
                    route = [...route.slice(0, i+1), ...route.slice(i+1, j+1).reverse(), ...route.slice(j+1)];
                    improved = true;
                }
            }
        }
    }
    return route;
}

function twoOptHaversine(route) {
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < route.length - 2; i++) {
            for (let j = i + 2; j < route.length - 1; j++) {
                const old = haversine(route[i], route[i+1]) + haversine(route[j], route[j+1]);
                const nw  = haversine(route[i], route[j])   + haversine(route[i+1], route[j+1]);
                if (nw < old) {
                    route = [...route.slice(0, i+1), ...route.slice(i+1, j+1).reverse(), ...route.slice(j+1)];
                    improved = true;
                }
            }
        }
    }
    return route;
}

function orOpt1Matrix(route, matrix) {
    const n = route.length;
    if (n <= 2) return route;
    let improved = true, iters = 0;
    while (improved && iters++ < 500) {
        improved = false;
        for (let i = 0; i < n; i++) {
            const ci = route[i]._originalIndex;
            const pi = i > 0     ? route[i-1]._originalIndex : null;
            const ni = i < n-1   ? route[i+1]._originalIndex : null;
            const removeSaving =
                (pi !== null ? matrix[pi][ci] : 0) +
                (ni !== null ? matrix[ci][ni] : 0) -
                (pi !== null && ni !== null ? matrix[pi][ni] : 0);
            const without = [...route.slice(0, i), ...route.slice(i+1)];
            const m = without.length;
            let bestGain = 1, bestJ = -2;
            if (i !== 0) {
                const gain = removeSaving - matrix[ci][without[0]._originalIndex];
                if (gain > bestGain) { bestGain = gain; bestJ = -1; }
            }
            for (let j = 0; j < m; j++) {
                const wj  = without[j]._originalIndex;
                const wj1 = j < m-1 ? without[j+1]._originalIndex : null;
                const insertCost = matrix[wj][ci] + (wj1 !== null ? matrix[ci][wj1] : 0) - (wj1 !== null ? matrix[wj][wj1] : 0);
                const gain = removeSaving - insertCost;
                if (gain > bestGain) { bestGain = gain; bestJ = j; }
            }
            if (bestJ !== -2) {
                route = bestJ === -1 ? [route[i], ...without] : [...without.slice(0, bestJ+1), route[i], ...without.slice(bestJ+1)];
                improved = true;
                break;
            }
        }
    }
    return route;
}

function orOpt1Haversine(route) {
    const n = route.length;
    if (n <= 2) return route;
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < n; i++) {
            const curr = route[i], prev = i > 0 ? route[i-1] : null, next = i < n-1 ? route[i+1] : null;
            const removeSaving =
                (prev ? haversine(prev, curr) : 0) +
                (next ? haversine(curr, next) : 0) -
                (prev && next ? haversine(prev, next) : 0);
            const without = [...route.slice(0, i), ...route.slice(i+1)];
            const m = without.length;
            let bestGain = 1, bestJ = -2;
            if (i !== 0) {
                const gain = removeSaving - haversine(curr, without[0]);
                if (gain > bestGain) { bestGain = gain; bestJ = -1; }
            }
            for (let j = 0; j < m; j++) {
                const wj1 = j < m-1 ? without[j+1] : null;
                const insertCost = haversine(without[j], curr) + (wj1 ? haversine(curr, wj1) : 0) - (wj1 ? haversine(without[j], wj1) : 0);
                const gain = removeSaving - insertCost;
                if (gain > bestGain) { bestGain = gain; bestJ = j; }
            }
            if (bestJ !== -2) {
                route = bestJ === -1 ? [route[i], ...without] : [...without.slice(0, bestJ+1), route[i], ...without.slice(bestJ+1)];
                improved = true;
                break;
            }
        }
    }
    return route;
}

function routeCostMatrix(route, matrix) {
    let c = 0;
    for (let i = 0; i < route.length - 1; i++)
        c += matrix[route[i]._originalIndex][route[i+1]._originalIndex];
    return c;
}

function routeCostHaversine(route) {
    let c = 0;
    for (let i = 0; i < route.length - 1; i++) c += haversine(route[i], route[i+1]);
    return c;
}

function multiStartNNMatrix(places, matrix) {
    const n = places.length;
    let bestRoute = null, bestCost = Infinity;
    for (let start = 0; start < n; start++) {
        const visited = new Array(n).fill(false);
        const route = [];
        let current = start;
        visited[start] = true;
        route.push(places[start]);
        for (let step = 1; step < n; step++) {
            let nearest = -1, minDist = Infinity;
            for (let j = 0; j < n; j++) {
                if (!visited[j] && matrix[current][j] < minDist) { minDist = matrix[current][j]; nearest = j; }
            }
            if (nearest === -1) break;
            visited[nearest] = true;
            route.push(places[nearest]);
            current = nearest;
        }
        const r2 = twoOptMatrix(route, matrix);
        const ro  = orOpt1Matrix(r2, matrix);
        const cost = routeCostMatrix(ro, matrix);
        if (cost < bestCost) { bestCost = cost; bestRoute = ro; }
    }
    return bestRoute;
}

function multiStartNNHaversine(places) {
    const n = places.length;
    let bestRoute = null, bestCost = Infinity;
    for (let start = 0; start < n; start++) {
        const visited = new Array(n).fill(false);
        const route = [];
        let current = start;
        visited[start] = true;
        route.push(places[start]);
        for (let step = 1; step < n; step++) {
            let nearest = -1, minDist = Infinity;
            for (let j = 0; j < n; j++) {
                if (!visited[j]) {
                    const d = haversine(places[current], places[j]);
                    if (d < minDist) { minDist = d; nearest = j; }
                }
            }
            if (nearest === -1) break;
            visited[nearest] = true;
            route.push(places[nearest]);
            current = nearest;
        }
        const r2 = twoOptHaversine(route);
        const ro  = orOpt1Haversine(r2);
        const cost = routeCostHaversine(ro);
        if (cost < bestCost) { bestCost = cost; bestRoute = ro; }
    }
    return bestRoute;
}

// ── Public API ────────────────────────────────────────────────────────────────

exports.nearestNeighborMatrix = (places, matrix) => {
    if (places.length <= DP_LIMIT) {
        console.log(`[TSP] n=${places.length} ≤ ${DP_LIMIT} → Held-Karp DP (exact)`);
        return heldKarpMatrix(places, matrix);
    }
    console.log(`[TSP] n=${places.length} > ${DP_LIMIT} → multi-start NN + 2-opt + Or-opt`);
    return multiStartNNMatrix(places, matrix);
};

exports.nearestNeighbor = (places) => {
    if (places.length <= DP_LIMIT) {
        console.log(`[TSP] n=${places.length} ≤ ${DP_LIMIT} → Held-Karp DP (exact, haversine)`);
        return heldKarpHaversine(places);
    }
    console.log(`[TSP] n=${places.length} > ${DP_LIMIT} → multi-start NN + 2-opt + Or-opt (haversine)`);
    return multiStartNNHaversine(places);
};

exports.totalRouteDistance = (route, matrix) => {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
        const fromIdx = route[i]._originalIndex;
        const toIdx   = route[i+1]._originalIndex;
        total += matrix && fromIdx !== undefined && toIdx !== undefined
            ? matrix[fromIdx][toIdx]
            : haversine(route[i], route[i+1]);
    }
    return (total / 1000).toFixed(2);
};

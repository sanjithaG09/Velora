import VeloraLogo from "../components/VeloraLogo";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CurrentWeatherBlock, getCityHero } from "./Explore";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SharedRoute() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [trip,    setTrip]    = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    fetch(`${API}/api/shared/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setTrip(d.trip); setWeather(d.weather); }
      })
      .catch(() => setError("Failed to load trip"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Sora',sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(245,166,35,0.2)", borderTopColor: "#F5A623", animation: "spin .9s linear infinite" }} />
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading shared trip…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !trip) return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, fontFamily: "'Sora',sans-serif" }}>
      <div style={{ fontSize: 40 }}>🗺️</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Trip not found</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>This trip may not be shared or the link is invalid.</div>
      <button onClick={() => navigate("/")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 50, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Go Home
      </button>
    </div>
  );

  const route    = trip.route?.length ? trip.route : trip.places || [];
  const details  = trip.routeDetails || [];
  const heroBg   = getCityHero(trip.city);
  const dateStr  = trip.date
    ? new Date(trip.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const gmapsLink = route.length >= 1
    ? `https://www.google.com/maps/dir/${route.map(p => encodeURIComponent(`${p}, ${trip.city}`)).join("/")}`
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --accent:#E8341A; --gold:#F5A623; --bg:#0D0D0D; --surface:#161616; --surface2:#1e1e1e; --border:rgba(255,255,255,0.08); --nav-h:64px; }
        html,body { margin:0; padding:0; background:var(--bg); font-family:'Sora',sans-serif; color:#fff; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes heroZoom { from { transform:scale(1); } to { transform:scale(1.07); } }

        .sh-nav { position:fixed; top:0; left:0; right:0; height:var(--nav-h); display:flex; align-items:center; justify-content:space-between; padding:0 5%; z-index:100; background:rgba(10,10,10,0.9); backdrop-filter:blur(18px); border-bottom:1px solid var(--border); }
        .sh-badge { display:inline-flex; align-items:center; gap:7px; padding:6px 14px; border-radius:50px; background:rgba(245,166,35,0.1); border:1px solid rgba(245,166,35,0.25); font-size:12px; font-weight:700; color:var(--gold); }
        .sh-hero { position:relative; height:200px; display:flex; align-items:flex-end; overflow:hidden; background:#000; margin-top:var(--nav-h); }
        .sh-hero-bg { position:absolute; inset:0; background-size:cover; background-position:center; opacity:0.28; animation:heroZoom 14s ease-in-out forwards; }
        .sh-hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(13,13,13,1) 0%,transparent 100%); }
        .sh-hero-content { position:relative; z-index:2; padding:0 6% 24px; animation:fadeUp .7s ease both; }
        .sh-body { max-width:780px; margin:0 auto; padding:32px 5% 80px; }
        .sh-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; overflow:hidden; margin-bottom:24px; }
        .sh-card-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 16px; border-bottom:1px solid var(--border); }
        .sh-card-title { display:flex; align-items:center; gap:9px; font-size:14px; font-weight:700; }
        .sh-card-body { padding:20px 22px 24px; }
        .sh-route-step { display:flex; align-items:flex-start; gap:14px; }
        .sh-step-line { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
        .sh-step-dot { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0; }
        .sh-step-dot.start { background:rgba(232,52,26,0.15); border:2px solid var(--accent); color:var(--accent); }
        .sh-step-dot.end { background:rgba(34,197,94,0.12); border:2px solid #22c55e; color:#22c55e; }
        .sh-step-dot.mid { background:rgba(245,166,35,0.1); border:2px solid var(--gold); color:var(--gold); }
        .sh-step-connector { width:2px; flex:1; min-height:20px; background:linear-gradient(to bottom,var(--gold),transparent); margin:3px 0; opacity:.35; }
        .sh-step-info { padding:3px 0 20px; }
        .sh-step-name { font-size:14px; font-weight:700; color:#fff; margin-bottom:3px; }
        .sh-step-dist { font-size:12px; color:rgba(255,255,255,0.45); }
        .sh-summary { padding:13px 17px; background:var(--surface2); border-radius:12px; border:1px solid var(--border); font-size:13px; font-weight:600; color:#fff; word-break:break-word; margin-bottom:18px; }
        .sh-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 20px; border-radius:11px; border:1.5px solid var(--border); background:transparent; color:rgba(255,255,255,0.7); font-family:'Sora',sans-serif; font-size:13.5px; font-weight:700; cursor:pointer; transition:all .2s; }
        .sh-btn:hover { background:var(--surface2); color:#fff; border-color:rgba(255,255,255,0.2); }
        .sh-btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .sh-btn.primary:hover { background:#c9270e; }

        /* ── Weather block (mirrored from Explore) ── */
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(74,222,128,0.7)} 70%{box-shadow:0 0 0 8px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
        .ex-weather-block { background:linear-gradient(135deg,#0f2027 0%,#1a3a4a 50%,#2c5364 100%); border:1px solid rgba(96,165,250,0.2); border-radius:20px; padding:22px 26px; margin-bottom:24px; animation:fadeUp .5s cubic-bezier(0.22,1,0.36,1) both; }
        .ex-weather-live-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); color:#4ade80; font-size:11px; font-weight:700; letter-spacing:.5px; padding:4px 10px; border-radius:20px; margin-bottom:14px; }
        .ex-weather-live-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:pulse-ring 1.4s ease infinite; }
        .ex-weather-inner { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
        .ex-weather-left { display:flex; align-items:center; gap:16px; }
        .ex-weather-emoji { font-size:44px; line-height:1; }
        .ex-weather-city { font-size:17px; font-weight:800; color:#fff; letter-spacing:-.5px; }
        .ex-weather-desc { font-size:12.5px; color:rgba(255,255,255,0.6); text-transform:capitalize; margin-top:3px; }
        .ex-weather-temp { font-size:48px; font-weight:900; color:#fff; letter-spacing:-2px; line-height:1; }
        .ex-weather-stats { display:flex; align-items:center; background:rgba(0,0,0,0.2); border-radius:12px; padding:12px 18px; flex-wrap:wrap; gap:0; }
        .ex-weather-stat { display:flex; flex-direction:column; gap:3px; padding:0 16px; }
        .ex-weather-stat:first-child { padding-left:0; } .ex-weather-stat:last-child { padding-right:0; }
        .ex-weather-stat-label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.45); }
        .ex-weather-stat-val { font-size:14px; font-weight:700; color:#fff; }
        .ex-weather-divider { width:1px; height:30px; background:rgba(255,255,255,0.12); flex-shrink:0; }
        @media(max-width:600px) {
          .ex-weather-inner { flex-direction:column; align-items:flex-start; gap:10px; }
          .ex-weather-stats { flex-direction:column; gap:10px; align-items:flex-start; }
          .ex-weather-divider { display:none; }
          .ex-weather-stat { padding:0; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="sh-nav">
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <VeloraLogo size={28} textColor="#fff" />
        </div>
        <div className="sh-badge">🔗 Shared Trip</div>
        <button className="sh-btn" style={{ padding: "8px 16px", fontSize: 13 }} onClick={handleCopy}>
          {copied ? "✅ Copied!" : "📋 Copy Link"}
        </button>
      </nav>

      {/* Hero */}
      <div className="sh-hero">
        <div className="sh-hero-bg" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="sh-hero-overlay" />
        <div className="sh-hero-content">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "var(--gold)", marginBottom: 7 }}>✦ Shared Itinerary</div>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 900, letterSpacing: -1.5, color: "#fff", lineHeight: 1 }}>{trip.city}</h1>
          {dateStr && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 12px", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
              📅 {dateStr}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="sh-body">
        {weather && <CurrentWeatherBlock weather={weather} />}

        {/* Route card */}
        <div className="sh-card">
          <div className="sh-card-header">
            <div className="sh-card-title">
              <span style={{ fontSize: 18 }}>🛣️</span>
              Optimized Route
              {trip.totalDistanceKm > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: "#4ade80", marginLeft: 4 }}>
                  {Number(trip.totalDistanceKm).toFixed(1)} km
                </span>
              )}
            </div>
            {gmapsLink && (
              <a href={gmapsLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#60a5fa", fontWeight: 600, textDecoration: "none", padding: "7px 13px", borderRadius: 9, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                Open in Maps ↗
              </a>
            )}
          </div>
          <div className="sh-card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 18 }}>
              {route.map((place, i) => {
                const isFirst = i === 0, isLast = i === route.length - 1;
                const detail  = details[i];
                const distText = detail?.distToNext > 0
                  ? `${(detail.distToNext / 1000).toFixed(1)} km · ~${Math.ceil(detail.timeToNext / 60)} min to next`
                  : null;
                return (
                  <div key={i} className="sh-route-step">
                    <div className="sh-step-line">
                      <div className={`sh-step-dot ${isFirst ? "start" : isLast ? "end" : "mid"}`}>
                        {isFirst ? "S" : isLast ? "E" : i + 1}
                      </div>
                      {!isLast && <div className="sh-step-connector" />}
                    </div>
                    <div className="sh-step-info">
                      <div className="sh-step-name">{place}</div>
                      {!isLast && distText && <div className="sh-step-dist">{distText}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sh-summary">{route.join(" → ")}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="sh-btn primary" style={{ flex: 1 }} onClick={() => navigate("/")}>
                Plan Your Own Trip
              </button>
              <button className="sh-btn" style={{ flex: 1 }} onClick={handleCopy}>
                {copied ? "✅ Link Copied" : "🔗 Share This"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

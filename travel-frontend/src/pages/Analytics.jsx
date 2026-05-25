import VeloraLogo from "../components/VeloraLogo";
import FloatingAssistant from "../components/FloatingAssistant";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Analytics() {
  const navigate = useNavigate();

  const [user, setUser]               = useState(null);
  const [dropOpen, setDropOpen]       = useState(false);
  const [analytics, setAnalytics]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("velora_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    const unsub = auth.onAuthStateChanged(u => {
      if (u) setUser({ name: u.displayName || u.email || "Traveler", email: u.email });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("velora_token");
    if (!token) { setError("Please log in to view your analytics."); setLoading(false); return; }
    fetch(`${API}/api/analytics/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setAnalytics(d); })
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    try { await signOut(auth); } catch {}
    localStorage.removeItem("velora_token");
    localStorage.removeItem("velora_user");
    navigate("/login");
  };

  const maxCityCount = analytics?.topCities?.[0]?.count || 1;
  const maxMonthTrips = analytics?.monthly?.length
    ? Math.max(...analytics.monthly.map(m => m.trips), 1)
    : 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --accent:#E8341A; --accent-hover:#c9270e; --gold:#F5A623;
          --bg:#0D0D0D; --surface:#161616; --surface2:#1e1e1e; --surface3:#232323;
          --border:rgba(255,255,255,0.08); --border-hover:rgba(255,255,255,0.16);
          --text-muted:rgba(255,255,255,0.4); --text-sub:rgba(255,255,255,0.65);
          --nav-h:68px;
        }
        html,body { margin:0; padding:0; background:var(--bg); font-family:'Sora',sans-serif; color:#fff; min-height:100vh; }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:var(--bg)} ::-webkit-scrollbar-thumb{background:#333;border-radius:3px}

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        /* NAV */
        .an-nav { position:fixed; top:0; left:0; right:0; height:var(--nav-h); display:flex; align-items:center; justify-content:space-between; padding:0 5%; z-index:1000; background:rgba(10,10,10,0.92); backdrop-filter:blur(20px); border-bottom:1px solid var(--border); }
        .an-nav-center { position:absolute; left:50%; transform:translateX(-50%); display:flex; gap:28px; }
        .an-nav-link { color:var(--text-sub); font-size:14px; font-weight:500; cursor:pointer; position:relative; transition:color .2s; text-decoration:none; }
        .an-nav-link::after { content:''; position:absolute; bottom:-3px; left:0; width:0; height:1.5px; background:var(--gold); transition:width .25s; }
        .an-nav-link:hover { color:#fff; } .an-nav-link:hover::after { width:100%; }
        .an-nav-link.active { color:#fff; } .an-nav-link.active::after { width:100%; }

        /* Avatar dropdown */
        .an-avatar-wrap { position:relative; }
        .an-avatar-btn { display:flex; align-items:center; gap:9px; cursor:pointer; padding:5px 14px 5px 5px; border-radius:50px; border:1.5px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); backdrop-filter:blur(6px); transition:background .2s; }
        .an-avatar-btn:hover { background:rgba(255,255,255,0.11); }
        .an-avatar-circle { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--gold)); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; border:1.5px solid var(--gold); }
        .an-avatar-name { color:#fff; font-size:13.5px; font-weight:600; }
        .an-dropdown { position:absolute; top:calc(100% + 10px); right:0; background:#1a1a1a; border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:8px; min-width:170px; box-shadow:0 20px 50px rgba(0,0,0,0.55); animation:dropIn .18s ease; z-index:999; }
        .an-drop-item { display:flex; align-items:center; gap:9px; width:100%; padding:10px 14px; border:none; background:none; color:rgba(255,255,255,0.82); font-family:'Sora',sans-serif; font-size:13.5px; font-weight:500; cursor:pointer; border-radius:8px; transition:background .18s; text-align:left; }
        .an-drop-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
        .an-drop-item.active { color:var(--gold); }
        .an-drop-item.danger { color:#ff5a5a; } .an-drop-item.danger:hover { background:rgba(255,90,90,0.1); }
        .an-drop-divider { height:1px; background:rgba(255,255,255,0.07); margin:6px 0; }

        /* PAGE */
        .an-page { padding-top:var(--nav-h); min-height:100vh; background:var(--bg); }

        /* HERO */
        .an-hero { padding:48px 5% 32px; max-width:900px; margin:0 auto; animation:fadeUp .6s ease both; }
        .an-hero-eyebrow { font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:10px; }
        .an-hero-title { font-size:clamp(2rem,4vw,2.8rem); font-weight:900; letter-spacing:-1.5px; line-height:1; margin-bottom:8px; }
        .an-hero-sub { font-size:14px; color:var(--text-sub); }

        /* BODY */
        .an-body { max-width:900px; margin:0 auto; padding:0 5% 80px; }

        /* STAT CARDS */
        .an-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
        @media(max-width:600px){ .an-stat-grid{ grid-template-columns:1fr 1fr; } }
        .an-stat { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:24px; animation:fadeUp .5s ease both; }
        .an-stat-icon { font-size:22px; margin-bottom:12px; }
        .an-stat-label { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }
        .an-stat-val { font-size:38px; font-weight:900; color:#fff; letter-spacing:-2px; line-height:1; }
        .an-stat-sub { font-size:12px; color:var(--text-muted); margin-top:6px; font-weight:500; }

        /* CARD */
        .an-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; margin-bottom:24px; overflow:hidden; animation:fadeUp .55s ease both; }
        .an-card-head { display:flex; align-items:center; gap:12px; padding:20px 24px 18px; border-bottom:1px solid var(--border); }
        .an-card-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }
        .an-card-icon.gold   { background:rgba(245,166,35,0.12); border:1px solid rgba(245,166,35,0.2); }
        .an-card-icon.green  { background:rgba(34,197,94,0.1);   border:1px solid rgba(34,197,94,0.2); }
        .an-card-title { font-size:15px; font-weight:800; color:#fff; letter-spacing:-.3px; }
        .an-card-sub   { font-size:12px; color:var(--text-muted); margin-top:2px; }
        .an-card-body  { padding:22px 24px 26px; }

        /* CITIES */
        .an-city-row { display:flex; align-items:center; gap:14px; padding:11px 0; border-bottom:1px solid var(--border); }
        .an-city-row:last-child { border-bottom:none; padding-bottom:0; }
        .an-city-row:first-child { padding-top:0; }
        .an-city-rank { font-size:12px; font-weight:800; color:var(--text-muted); width:20px; flex-shrink:0; text-align:center; }
        .an-city-name { font-size:14px; font-weight:700; color:#fff; min-width:90px; }
        .an-city-bar-wrap { flex:1; background:rgba(255,255,255,0.06); border-radius:4px; height:7px; overflow:hidden; }
        .an-city-bar { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--accent),var(--gold)); }
        .an-city-count { font-size:12.5px; font-weight:800; color:var(--gold); min-width:32px; text-align:right; }

        /* MONTHLY CHART */
        .an-chart { display:flex; align-items:flex-end; gap:7px; height:120px; }
        .an-month-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:5px; height:100%; }
        .an-month-bar { width:100%; border-radius:5px 5px 0 0; background:linear-gradient(to top,var(--accent),rgba(232,52,26,0.3)); min-height:5px; transition:height .5s ease; }
        .an-month-trips { font-size:10px; color:var(--text-muted); font-weight:700; }
        .an-month-label { font-size:9px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.5px; }

        /* STATES */
        .an-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:40vh; gap:18px; }
        .an-spinner  { width:40px; height:40px; border-radius:50%; border:3px solid rgba(245,166,35,0.15); border-top-color:var(--gold); animation:spin .9s linear infinite; }
        .an-error    { background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.2); border-radius:14px; padding:20px 24px; font-size:14px; color:#dc2626; font-weight:600; }
        .an-empty    { text-align:center; padding:60px 20px; color:var(--text-muted); }
        .an-empty-icon  { font-size:44px; margin-bottom:14px; opacity:.45; }
        .an-empty-title { font-size:17px; font-weight:800; color:rgba(255,255,255,0.6); margin-bottom:8px; }
        .an-empty-desc  { font-size:13.5px; line-height:1.65; }
        .an-empty-btn   { margin-top:20px; padding:11px 26px; border-radius:50px; border:none; background:var(--accent); color:#fff; font-family:'Sora',sans-serif; font-size:14px; font-weight:700; cursor:pointer; transition:background .2s; }
        .an-empty-btn:hover { background:var(--accent-hover); }
      `}</style>

      {/* NAV */}
      <nav className="an-nav">
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/")}>
          <VeloraLogo size={28} textColor="#fff" />
        </div>
        <div className="an-nav-center">
          <span className="an-nav-link" onClick={() => navigate("/")}>Home</span>
          <span className="an-nav-link" onClick={() => navigate("/distance")}>Distance</span>
          <span className="an-nav-link" onClick={() => navigate("/suggestions")}>Suggestions</span>
          <span className="an-nav-link" onClick={() => navigate("/my-trips")}>My Trips</span>
        </div>
        <div className="an-avatar-wrap">
          {user ? (
            <>
              <div className="an-avatar-btn" onClick={() => setDropOpen(o => !o)}>
                <div className="an-avatar-circle">{user.name?.[0]?.toUpperCase() || "U"}</div>
                <span className="an-avatar-name">{user.name}</span>
              </div>
              {dropOpen && (
                <div className="an-dropdown">
                  <button className="an-drop-item" onClick={() => { navigate("/profile"); setDropOpen(false); }}>👤 Profile</button>
                  <button className="an-drop-item active" onClick={() => setDropOpen(false)}>📊 Analytics</button>
                  <div className="an-drop-divider" />
                  <button className="an-drop-item danger" onClick={handleSignOut}>↩ Sign Out</button>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => navigate("/login")} style={{ padding:"9px 20px", borderRadius:"50px", border:"1.5px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"'Sora',sans-serif", fontSize:"13.5px", fontWeight:600, cursor:"pointer" }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="an-page">

        {/* HERO */}
        <div className="an-hero">
          <div className="an-hero-eyebrow">✦ Your Dashboard</div>
          <h1 className="an-hero-title">Travel Analytics</h1>
          <p className="an-hero-sub">A breakdown of everywhere you've been and how far you've gone.</p>
        </div>

        <div className="an-body">

          {loading && (
            <div className="an-loading">
              <div className="an-spinner" />
              <div style={{ color:"var(--text-sub)", fontSize:14 }}>Loading your stats…</div>
            </div>
          )}

          {error && !loading && (
            <div className="an-error">⚠ {error}</div>
          )}

          {analytics && !loading && analytics.summary?.totalTrips === 0 && (
            <div className="an-empty">
              <div className="an-empty-icon">✈️</div>
              <div className="an-empty-title">No trips yet</div>
              <div className="an-empty-desc">Plan your first trip to start seeing your travel stats and insights here.</div>
              <button className="an-empty-btn" onClick={() => navigate("/explore")}>Plan a Trip</button>
            </div>
          )}

          {analytics && !loading && analytics.summary?.totalTrips > 0 && (
            <>
              {/* Stat cards */}
              <div className="an-stat-grid">
                <div className="an-stat">
                  <div className="an-stat-icon">🗺️</div>
                  <div className="an-stat-label">Total Trips</div>
                  <div className="an-stat-val">{analytics.summary.totalTrips}</div>
                  <div className="an-stat-sub">trips planned</div>
                </div>
                <div className="an-stat">
                  <div className="an-stat-icon">📍</div>
                  <div className="an-stat-label">Distance Covered</div>
                  <div className="an-stat-val">{Math.round(analytics.summary.totalDistanceKm || 0)}</div>
                  <div className="an-stat-sub">kilometres total</div>
                </div>
                <div className="an-stat">
                  <div className="an-stat-icon">🏙️</div>
                  <div className="an-stat-label">Cities Explored</div>
                  <div className="an-stat-val">{analytics.topCities?.length || 0}</div>
                  <div className="an-stat-sub">unique destinations</div>
                </div>
              </div>

              {/* Top cities */}
              {analytics.topCities?.length > 0 && (
                <div className="an-card">
                  <div className="an-card-head">
                    <div className="an-card-icon gold">🏙️</div>
                    <div>
                      <div className="an-card-title">Top Cities</div>
                      <div className="an-card-sub">Your most visited destinations</div>
                    </div>
                  </div>
                  <div className="an-card-body">
                    {analytics.topCities.map((c, i) => (
                      <div key={c.city} className="an-city-row">
                        <div className="an-city-rank">#{i + 1}</div>
                        <div className="an-city-name">{c.city}</div>
                        <div className="an-city-bar-wrap">
                          <div className="an-city-bar" style={{ width: `${(c.count / maxCityCount) * 100}%` }} />
                        </div>
                        <div className="an-city-count">{c.count}×</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly chart */}
              {analytics.monthly?.length > 0 && (
                <div className="an-card">
                  <div className="an-card-head">
                    <div className="an-card-icon green">📅</div>
                    <div>
                      <div className="an-card-title">Monthly Activity</div>
                      <div className="an-card-sub">Trips per month (last 12 months)</div>
                    </div>
                  </div>
                  <div className="an-card-body">
                    <div className="an-chart">
                      {[...analytics.monthly].reverse().map((m, i) => (
                        <div key={i} className="an-month-col">
                          <div className="an-month-trips">{m.trips}</div>
                          <div className="an-month-bar" style={{ height: `${Math.max((m.trips / maxMonthTrips) * 100, 5)}%` }} />
                          <div className="an-month-label">{MONTH_NAMES[m._id.month - 1]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
      <FloatingAssistant pageContext="Velora trip analytics and travel statistics" />
    </>
  );
}

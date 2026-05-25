# Velora — AI-Powered Travel Planner

Velora is a full-stack travel planning application for India. It combines Google Maps, real-time weather, AI-generated itineraries, and a context-aware travel assistant to help users discover destinations, plan optimized routes, and manage trips end-to-end.

---

## Features

### Trip Planning & Route Optimization
- Search any Indian city and browse up to 15 top-rated tourist places fetched live from Google Places API
- Select places and generate an optimized visiting order using **Held-Karp exact TSP** (≤15 places) or **multi-start nearest-neighbour + 2-opt + Or-opt** for larger sets
- Set a custom **start point** and **end point** (hotel, airport, current location) — the optimizer anchors these as fixed legs outside the TSP
- Driving distances and durations from Google Distance Matrix API; Haversine fallback fills any gaps
- Interactive **Google Maps embed** renders the full route with waypoints

### Restaurant Suggestions
- Between every pair of stops on the optimized route, tap **Eat here?** to get 3–4 nearby restaurant recommendations
- Filter by **diet preference** (veg / non-veg) and **price range** (Budget ₹ / Mid ₹₹ / Premium ₹₹₹)
- Each restaurant card shows name, rating, review count, price level, address, and photo
- Tap the GPS button to open Google Maps navigation to the restaurant
- Add a restaurant to the route — it becomes a waypoint and the map re-renders automatically
- Remove it with one tap to restore the original route

### AI Itinerary & Chat (Optimized Route page)
- Generate a structured day-plan itinerary for the selected route using a local Ollama LLM
- Each stop includes suggested visit time, duration, insider tip, and food recommendation
- Full streaming chat panel below the itinerary — ask follow-up questions about the route
- Responses stream token-by-token with inline markdown rendering (bullets, bold)

### Floating Travel Assistant (all pages)
- A `✦` floating button in the bottom-right corner on every page opens a compact AI chat widget
- **Context-aware** — the assistant knows what is currently on screen:
  - **Explore**: sees the full list of loaded places and which ones are selected
  - **Suggestions**: sees all filtered destinations, active filters (season / category / budget)
  - **Distance**: sees the entered origin, destination, and computed distance/duration
  - **My Trips**: sees all saved trips with cities, dates, and place lists
  - **Trip planner**: sees the city, available places, selected places, and optimized route
- Ask things like "suggest 3 places from this page" or "which of these is best in winter" and the assistant answers from the actual data on screen
- Streams responses from the same SSE endpoint as the route chat

### Destination Suggestions
- Browse 60+ curated Indian destinations with Wikipedia lead images, tags, budget tier, popularity score, and season suitability
- Filter by **Category** (Beaches, Mountains, Spiritual, Heritage, Adventure, Nature, Cultural), **Season** (Summer, Winter, Monsoon), and **Budget** (Budget / Moderate / Luxury)
- Sort by Most Popular, Budget First, or A–Z
- Popularity bar chart and month-wise top-5 visitor trend chart powered by Recharts
- Each card has an **Explore →** button that navigates to the Explore page pre-filled with that city

### Distance Calculator
- Point-to-point driving distance and estimated travel time between any two locations
- Supports typed addresses or GPS coordinates (current location button for both origin and destination)
- Embedded Google Maps route preview
- Results show formatted distance, duration, and resolved addresses

### Weather
- 5-step weather forecast and current conditions for any city via OpenWeatherMap
- Shown on the Explore page alongside the places grid

### My Trips & Analytics
- Save planned trips (city, date, selected places, optimized route, total distance)
- View all trips with filters by city and date
- Duplicate a trip to a new date
- Analytics page: total trips, total distance, top cities, trip timeline

### Emergency & Safety
- Emergency contacts page with local police, ambulance, and tourist helpline numbers
- SOS feature

### Authentication
- Email/password sign-up and login via Firebase Auth
- Google OAuth sign-in
- Password reset via email
- Profile page with account management
- JWT-backed session for API calls

### Save as PDF
- On the Optimized Route page, **Save as PDF** triggers `window.print()` with a print stylesheet that hides UI chrome, expands the AI chat history, and preserves the embedded Google Maps iframe (the only approach that captures cross-origin iframes)

---

## Tech Stack

### Frontend
| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| Auth | Firebase (Email/Password + Google OAuth) |
| Charts | Recharts |
| Maps | Google Maps Embed API (via backend proxy) |
| Styling | CSS-in-JS (`<style>` tags per page, Sora + Lora fonts) |

### Backend
| Layer | Choice |
|---|---|
| Runtime | Node.js + Express 5 |
| Database | MongoDB + Mongoose |
| AI | Ollama (local LLM, streaming SSE) |
| Places | Google Places API (Text Search + Nearby Search + Photo proxy) |
| Distance | Google Distance Matrix API |
| Weather | OpenWeatherMap API |
| Auth tokens | JWT + bcrypt |
| Email | Nodemailer + Resend |
| Jobs | node-cron |

### Algorithms
- **Held-Karp DP** — exact optimal open-path TSP for ≤15 places (`utils/tsp.js`)
- **Multi-start nearest-neighbour + 2-opt + Or-opt(1)** — heuristic for larger sets
- **Haversine** — great-circle distance fallback when Distance Matrix API returns gaps

---

## Project Structure

```
Velora/
├── server.js                  # Express entry point
├── controllers/
│   ├── aiController.js        # Ollama LLM endpoints (itinerary, chat stream)
│   ├── placeController.js     # Places, weather, maps embed, photo proxy, restaurants
│   ├── tripController.js      # Trip CRUD
│   ├── authController.js      # Register, login, password reset
│   └── AnalyticsController.js # Trip stats
├── routes/                    # Express routers (ai, places, trips, auth, sos, analytics)
├── services/
│   ├── googleApi.js           # Google Places + Distance Matrix + restaurant search
│   └── weatherApi.js          # OpenWeatherMap
├── utils/
│   └── tsp.js                 # Held-Karp + multi-start NN + 2-opt + Or-opt
├── models/
│   ├── User.js
│   └── trip.js
└── travel-frontend/
    └── src/
        ├── components/
        │   ├── VeloraLogo.jsx
        │   └── FloatingAssistant.jsx   # Context-aware AI chat widget (all pages)
        └── pages/
            ├── Home.jsx
            ├── Explore.jsx             # Place discovery + trip creation
            ├── OptimizedRoute.jsx      # Route map, restaurants, AI itinerary + chat
            ├── Suggestions.jsx         # 60+ destinations with filters + analytics charts
            ├── Distance.jsx            # Point-to-point distance calculator
            ├── MyTrips.jsx             # Saved trips list
            ├── Analytics.jsx           # Trip statistics
            ├── Emergency.jsx           # Emergency contacts + SOS
            ├── trip.jsx                # Trip planner/creator
            ├── profile.jsx
            ├── Login.jsx
            └── ...
```

---

## Environment Variables

### Backend (`.env` in root)
```
GOOGLE_API_KEY=
OPENWEATHER_API_KEY=
MONGODB_URI=
JWT_SECRET=
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
PORT=5050
```

### Frontend (`.env` in `travel-frontend/`)
```
VITE_API_URL=http://localhost:5050
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas connection string
- Ollama running locally with a model pulled (`ollama pull llama3`)
- Google Cloud project with Places API and Distance Matrix API enabled
- OpenWeatherMap API key

### Backend
```bash
cd Velora
npm install
cp .env.example .env   # fill in your keys
npm run dev            # nodemon server.js — port 5050
```

### Frontend
```bash
cd Velora/travel-frontend
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev            # vite — port 5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/places/:city` | Top tourist places via Google Places |
| GET | `/api/weather/:city` | 5-step weather forecast |
| GET | `/api/current-weather/:city` | Current weather conditions |
| GET | `/api/maps/embed` | Google Maps embed URL (key stays server-side) |
| GET | `/api/photo?ref=` | Proxied Google Place photo |
| POST | `/api/distance` | Point-to-point driving distance + duration |
| POST | `/api/route/optimize` | TSP route optimization |
| POST | `/api/restaurants/between-stops` | Restaurant suggestions between two stops |
| POST | `/api/ai/itinerary` | AI-generated day-plan itinerary |
| POST | `/api/ai/chat/stream` | Streaming SSE chat with page context |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/trips` | List / create trips |
| DELETE | `/api/trips/:id` | Delete trip |
| GET | `/api/analytics` | Trip statistics |

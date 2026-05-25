# Velora Frontend

React 19 + Vite frontend for the Velora travel planning app. See the [root README](../README.md) for full project documentation.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Environment

Create `travel-frontend/.env`:

```
VITE_API_URL=http://localhost:5050
```

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home | Landing page |
| `/explore` | Explore | Search a city, pick places, plan a trip |
| `/optimized-route` | OptimizedRoute | Route map, restaurant stops, AI itinerary & chat |
| `/suggestions` | Suggestions | 60+ curated Indian destinations with filters |
| `/distance` | Distance | Point-to-point driving distance calculator |
| `/my-trips` | MyTrips | Saved trips list |
| `/analytics` | Analytics | Trip statistics and charts |
| `/emergency` | Emergency | Emergency contacts and SOS |
| `/profile` | Profile | Account settings |
| `/login` | Login | Sign in / sign up |

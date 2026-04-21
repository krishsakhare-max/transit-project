# NammaConnect

NammaConnect is a React + TypeScript frontend for Bengaluru public-transport discovery. It gives commuters a fast-login entry point, visualizes high-demand transit hubs on a Bangalore heatmap, and suggests the quickest metro + bus chain between a start point and a destination.

## What is included

- Login screen with name and email capture
- Bangalore mobility dashboard with a transit heatmap
- Route planner with start and destination search
- Timed journey steps with transfer suggestions
- Seeded metro + BMTC-style corridor dataset designed for future live-data integration
- Vercel-friendly Vite setup

## Tech stack

- React
- TypeScript
- Vite
- HTML + CSS

## Data notes

This MVP uses a curated static snapshot so the frontend stays deployable without a backend. The structure is intentionally shaped so you can replace `src/data/transitData.ts` with live feeds later.

Reference sources used while shaping the dataset and integration plan:

- Bengaluru Open Data portal for metro station and schedule datasets:
  [opendata.benscl.com](https://opendata.benscl.com/)
- Open-source Namma Metro station geometry reference:
  [geohacker/namma-metro](https://github.com/geohacker/namma-metro)
- BMTC GTFS-style open-source reference:
  [Vonter/bmtc-gtfs](https://github.com/Vonter/bmtc-gtfs)
- Vercel guide for deploying Vite apps:
  [vercel.com/guides/deploying-vite-with-vercel](https://vercel.com/guides/deploying-vite-with-vercel)

## Run locally

1. Install Node.js with npm if they are not already available.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Vercel will auto-detect the Vite project.
4. Use these build settings if prompted:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Upgrade path for a production version

1. Add a geocoder so users can type any Bengaluru address, not just known hubs.
2. Move data fetching into Vercel Functions or another backend to ingest GTFS or GTFS-RT feeds.
3. Replace the seeded transit graph with full BMTC + Namma Metro stop, trip, and timetable data.
4. Add live service alerts, fare estimates, and accessibility filters.


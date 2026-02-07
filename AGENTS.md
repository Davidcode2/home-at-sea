# Frontend — Astro 5 + React Islands

## Quick Start

```bash
npm run dev       # Dev server on http://localhost:4321
npm run build     # Static build to ./dist/
npm run preview   # Preview production build
```

Requires the Strapi backend running on `http://localhost:1337` (or set `STRAPI_URL` env var).

## Stack

- **Astro 5** (v5.17.1) — static site generator
- **React 19** — interactive islands only (Globe component)
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite` plugin
- **react-globe.gl** + **Three.js 0.169.0** — 3D globe visualization
- **Fonts**: Playfair Display (headings, weight 400) + Inter (body)

Three.js is pinned to 0.169.0 because 0.170+ bundles WebGPU code that references `GPUShaderStage` at import time, crashing browsers without WebGPU support.

## Project Structure

```
frontend/
├── astro.config.mjs          # React integration + Tailwind vite plugin
├── tsconfig.json             # Extends astro/tsconfigs/strict
├── src/
│   ├── pages/
│   │   ├── index.astro               # Home — hero, ship grid, itinerary globes, CTA
│   │   ├── ships/[slug].astro        # Ship detail — hero, description, operator, pricing, itinerary, stories
│   │   └── stories/
│   │       ├── index.astro           # Stories listing grid
│   │       └── [slug].astro          # Individual story
│   ├── components/
│   │   ├── Header.astro              # Sticky nav with active link detection
│   │   ├── Footer.astro              # Three-column footer
│   │   ├── ShipCard.astro            # Ship preview card for grids
│   │   ├── ItinerarySection.astro    # Globe + route details (two-column)
│   │   ├── PricingTable.astro        # Apartment pricing table
│   │   ├── ThemeToggle.astro         # Dark/light mode toggle (vanilla JS)
│   │   └── Globe.tsx                 # React island — 3D globe with react-globe.gl
│   ├── layouts/
│   │   └── Layout.astro              # Root HTML shell, meta tags, theme init script
│   ├── lib/
│   │   └── strapi.ts                 # API client + TypeScript interfaces
│   └── styles/
│       └── global.css                # Tailwind imports, theme tokens, CSS variables
└── public/
    ├── favicon.svg
    └── favicon.ico
```

## Pages & Routing

| Route              | File                          | Data                              |
|---------------------|-------------------------------|-----------------------------------|
| `/`                 | `pages/index.astro`           | `getShips()` — all ships          |
| `/ships/:slug`      | `pages/ships/[slug].astro`    | `getShip(slug)` — single ship     |
| `/stories`          | `pages/stories/index.astro`   | `getStories()` — all stories      |
| `/stories/:slug`    | `pages/stories/[slug].astro`  | `getStory(slug)` — single story   |

Dynamic routes use `getStaticPaths()` for static generation. Missing content redirects to `/404`.

## Data Fetching — `src/lib/strapi.ts`

Fetches from `STRAPI_URL` (default `http://localhost:1337`). All calls happen at build time (SSG).

### Functions

| Function                         | Endpoint                    | Populates                                              |
|----------------------------------|-----------------------------|--------------------------------------------------------|
| `getShips()`                     | `GET /api/ships`            | operator, apartments, itineraries.stops, heroImage, gallery, stories |
| `getShip(slug)`                  | `GET /api/ships?filters...` | Same as above                                          |
| `getStories()`                   | `GET /api/stories`          | coverImage, ship                                       |
| `getStory(slug)`                 | `GET /api/stories?filters...` | coverImage, ship                                     |

### TypeScript Types

Defined in `strapi.ts`: `Ship`, `Operator`, `Apartment`, `Itinerary`, `ItineraryStop`, `Story`, `StrapiMedia`.

Helper: `getStrapiMediaUrl(media)` converts relative Strapi URLs to absolute.
Helper: `formatStatus(status)` converts `"under-construction"` → `"Under Construction"`.

### Populate Pattern

Uses array-indexed syntax (Strapi 5 requirement):
```
populate[0]=operator&populate[1]=apartments&populate[2]=itineraries.stops
```

## Styling — Tailwind CSS v4

Configured via `@tailwindcss/vite` plugin in `astro.config.mjs` (not postcss).

### Theme Tokens (`global.css`)

```css
@theme {
  --font-heading: "Playfair Display", serif;
  --font-body: "Inter", sans-serif;
  --color-gold: #C5A572;
  --color-ocean: #1B4965;
  --color-navy: #0A1628;
  /* ... plus light/dark variants */
}
```

### Light/Dark Mode

Toggle via `.dark` class on `<html>`, persisted in `localStorage("theme")`.

| CSS Variable       | Light         | Dark          |
|---------------------|---------------|---------------|
| `--bg-primary`     | `#ffffff`     | `#000000`     |
| `--bg-secondary`   | `#ffffff`     | `#111111`     |
| `--bg-card`        | `#ffffff`     | `#111111`     |
| `--text-primary`   | navy          | `#f1f5f9`     |
| `--accent-primary` | gold          | gold-light    |

Custom utility classes: `.bg-theme-primary`, `.text-theme-secondary`, `.border-theme`, `.text-accent-primary`, etc.

## Components

### Globe.tsx (React Island)

The only React component. Must use `client:only="react"` (Three.js cannot SSR).

Uses `react-globe.gl` with:
- Blue marble earth texture + bump map from CDN
- Animated cloud layer (Three.js mesh added to scene)
- Auto-rotate (speed 0.35)
- Zoom disabled
- Animated dashed arcs connecting itinerary stops
- Labels at each stop

Props: `stops: { name, lat, lng }[]` and `routeColor?: string`.

### ItinerarySection.astro

Wraps Globe in a two-column grid. Left: globe (`h-[500px] lg:h-[600px]`, `overflow-hidden`). Right: itinerary name, description, stop badges.

Transforms Strapi `ItineraryStop` data into Globe's `{ name, lat, lng }` format.

### ShipCard.astro

Card component used in ship grids. Shows hero image, name, tagline, status badge, and stats (length, residences, year). Links to `/ships/[slug]`.

### PricingTable.astro

HTML table of apartment types with formatted prices and sizes. Uses helper functions for number formatting.

### ThemeToggle.astro

Vanilla JS dark/light toggle. No framework dependency. Reads/writes `localStorage("theme")` and toggles `.dark` class.

### Header.astro / Footer.astro

Standard navigation and footer. Header detects active page via `Astro.url.pathname`.

### Layout.astro

Root HTML template. Imports `global.css`, sets up meta tags, includes inline theme-detection script that runs before paint to avoid flash.

## Key Patterns

- **Static generation**: All pages are pre-rendered at build time. No SSR runtime.
- **React islands**: Only `Globe.tsx` uses React. Everything else is Astro components (zero JS shipped).
- **Theme**: CSS variables toggled by `.dark` class. Components use utility classes like `bg-theme-primary`.
- **Data at build time**: All Strapi data fetched during `npm run build`. Changes require rebuild.

## Itinerary Colors

Six hardcoded colors cycle across ship itineraries on the home page:
```js
["#C5A572", "#2D6A8F", "#D4BA8A", "#1B4965", "#A68B5B", "#0F2D3F"]
```

## Ship Status Badges

Color mapping used on ship detail pages:
```js
{
  operational: "bg-green-500/20 text-green-300 border-green-500/30",
  "under-construction": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  planned: "bg-blue-500/20 text-blue-300 border-blue-500/30",
}
```

## Gotchas

- Three.js must stay pinned to `0.169.0` — newer versions crash browsers without WebGPU
- Globe component requires `client:only="react"` — `client:load` or `client:visible` will fail (Three.js SSR)
- Tailwind v4 uses `@tailwindcss/vite` plugin, not the postcss plugin
- Strapi populate must use array-indexed syntax, not `populate[relation]=*`
- Font weights: Playfair Display ships 400-900 only (no 300). Headings default to 400.
- Ship card grid on home page uses `px-4 sm:px-6` for near-edge-to-edge layout (no `max-w-7xl`)

# Georgia on Film

An interactive 3D atlas of real, **public** filming locations across Georgia: what was shot where. Georgia rises out of the dark as a raised, blueprint-style slab with real terrain, contour lines and neon beacons for every location. Fly in to any spot, filter and search, and build a film tour the camera can fly through.

> Unofficial fan project. Not affiliated with any studio, network or the Georgia Film Office. Public places only.

Designed and built by **Ethan McCoy**.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MapLibre GL JS 6, Framer Motion |
| **Map data** | © OpenStreetMap contributors via [OpenFreeMap](https://openfreemap.org) (OpenMapTiles schema) |
| **Elevation** | [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen, Terrarium encoding); contours by [maplibre-contour](https://github.com/onthegomap/maplibre-contour) |
| **Boundary** | US Census cartographic boundaries via `us-atlas` (public domain) |
| **API keys** | None. Every data source is free and keyless. |

---

## Features

- **Cinematic landing.** A short opening-credits title card (skippable, once per session), then a camera fly-in from high above the Southeast into an angled establishing shot. The camera then drifts slowly until you touch the map.
- **Georgia as a 3D slab.** Elevation tiles are clipped to the state shape in the browser (`src/lib/map/clippedDem.ts`), so the terrain forms glowing cliff walls at the border and everything outside disappears.
- **Blueprint styling.** A navy drafting sheet with cyan line work, live topographic contours, a perspective grid, a coordinate HUD, a title block and registration marks.
- **Beacons.** Clustered at wide zoom; light beams up close, coloured by format (feature film, TV series, limited series, TV movie). Filtering animates them in and out.
- **Location panel.** A right-hand panel on desktop and a draggable bottom sheet on phones. It shows every production filmed at the location, its sources, a Google Maps directions link and "Add to tour". Selecting a location triggers a cinematic fly-to.
- **Search and filters.** Fuzzy, typo-tolerant search over places, towns and titles. Filter by format, decade, production, county and city.
- **Film tours.** Add stops, reorder them by dragging or with the keyboard, and see the route drawn over the terrain with its distance. **Play tour** flies stop to stop. Tours are shareable as `/?tour=a,b,c`.
- **Production pages** (`/production/<id>`). Each one is statically generated, with a 3D mini map and a "Tour this production" button.
- **Stats** (`/stats`), **Location index** (`/locations`) and **About** (`/about`).
- **Shareable state.** Every view lives in the URL: `?loc=`, `?q=`, `?type=`, `?decade=`, `?county=`, `?city=`, `?production=`, `?tour=`, plus `?play=1` to start a tour on load.

## Run it locally

Requires Node 20+ (22 recommended).

```bash
npm install          # also copies the MapLibre worker into public/vendor (postinstall)
npm run dev          # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | Production build and server. `prebuild` runs the data validator first, so bad data fails the build. |
| `npm run validate:data` | Checks every location and production. See [Validating the data](#validating-the-data). |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript. |
| `npm run build:geo` | Regenerates the Georgia outline, clip shape and mask in `src/data/geo/`. |

Handy URL flags while developing: `?quality=low` or `?quality=high` forces a performance tier, and `?debug` exposes the map as `window.__map` in devtools.

---

## Adding or editing data

All content lives in two JSON files, typed by a Zod schema:

| File | What |
|---|---|
| `src/data/locations.json` | Filming locations (public places only) |
| `src/data/productions.json` | Films and shows |
| `src/data/schema.ts` | The source of truth for fields and allowed values |

### Add a location

```jsonc
{
  "id": "forsyth-park",                 // kebab-case, unique, never change once shared
  "name": "Forsyth Park",
  "type": "park",                       // see LOCATION_TYPES in schema.ts
  "city": "Savannah",
  "county": "Chatham",                  // without the word "County"
  "lat": 32.0670,
  "lng": -81.0959,
  "approximateCoords": false,           // true if the pin is a landmark/town-centre guess
  "public": true,                       // must be true; anything else fails validation
  "description": "What was filmed here, in your own words.",
  "productionIds": ["the-generals-daughter"],
  "sources": ["https://…"],             // at least one https source
  "verified": false,                    // flip to true once you've checked the claim
  "note": "Optional internal fact-check note. Never shown on the site.",
  "image": {                            // optional: Wikimedia Commons only
    "src": "https://upload.wikimedia.org/…",
    "alt": "Describe the photo",
    "credit": "Photographer name",
    "license": "CC BY-SA 4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:…"
  }
}
```

### Add a production

```jsonc
{
  "id": "the-generals-daughter",
  "title": "The General's Daughter",
  "year": 1999,
  "type": "feature film",               // feature film | TV series | limited series | TV movie | documentary
  "distributor": "Paramount Pictures",  // or null if no source names one
  "logline": "One original sentence.",
  "locationIds": ["forsyth-park"],      // must mirror each location's productionIds
  "gaFilmOfficeRef": null,
  "sources": ["https://…"],
  "verified": false
}
```

**Links go both ways.** If a location lists a production, that production must list the location back. The validator enforces this. New production pages, stats, search entries and filter options all pick up the change automatically.

### Validating the data

```bash
npm run validate:data
```

The validator checks:

- every required field is present and well-formed (Zod schema)
- `public` is `true`
- each entry has at least one `https` source
- coordinates fall inside Georgia (piers and barrier islands within 5 km of the simplified border pass with a warning)
- ids are unique
- location ↔ production links match in both directions

It also reports how many entries are still `verified: false`. It runs automatically before every build, and in CI.

## Content rules

These are non-negotiable; the About page states them publicly too.

1. **Public places only.** Parks, landmarks, businesses open to the public, streets and campuses. Never private residences or residential addresses, even if fans have identified them.
2. **Hand-curated, with sources.** Don't scrape IMDb or any site whose terms forbid it. Every entry links to where the claim comes from.
3. **No copyrighted imagery.** No film stills, posters or studio logos. Use only Wikimedia Commons photos with their license and attribution, or the built-in blueprint placeholder.
4. **Original writing.** Descriptions and loglines are written in your own words, not copied from sources.

---

## Personalising

- **Your links:** `src/lib/site.ts` holds the portfolio URL, email and LinkedIn. Anything left `null` is hidden, so no placeholder links go live.
- **Colours:** map colours are in `src/lib/map/theme.ts`, beacon colours in `TYPE_COLORS` in `src/lib/map/config.ts`, and interface colours are the `@theme` tokens in `src/app/globals.css`.
- **The 3D look** (`src/lib/map/config.ts`):
  - terrain exaggeration by zoom (`EXAGGERATION`)
  - slab depth (`BASE_ELEVATION_M`)
  - camera pitch and performance tiers (`QUALITY_SETTINGS`)
  - home bearing, cluster and beam zoom levels
- **Motion:** tour timing (`FLIGHT_MS`, `DWELL_MS`) is in `src/components/explore/Explorer.tsx`. Title-card length (`INTRO_MS`) is in `IntroSequence.tsx`. Fly-to and drift choreography are in `src/lib/map/camera.ts`.

## Project structure

```
src/
  app/                    routes: / (map), /production/[id], /stats, /locations, /about, 404
  components/
    explore/              map experience: Explorer (state + URL), search, filters, panel, tour, intro
    map/                  GeorgiaMap (MapLibre wrapper), controls, tooltip, HUD readout, legend
    production/ stats/ ui/
  data/                   locations.json, productions.json, schema.ts, geo/
  lib/
    map/                  style (blueprint base), layers (overlays), clippedDem (slab), contours,
                          camera (fly-to, fly-in, drift), pinFader (filter animation), config, theme
    filters.ts search.ts tour.ts stats.ts device.ts site.ts
scripts/                  validate-data.ts, build-geo.ts, copy-maplibre-worker.mjs
```

## Performance and accessibility

- **Two quality tiers** (`src/lib/device.ts`). Low-power devices (phones and tablets, ≤4 cores or ≤4 GB memory, or Save-Data turned on) get coarser terrain, no 3D buildings, a lower camera pitch, wider contour spacing, a capped pixel ratio and no idle drift.
- **Load order.**
  - The slab mask, rim and pins are declared ahead of the base map so they're processed first.
  - Contours load once the map first goes idle.
  - The map and tour panel are code-split.
  - Production-page mini maps load only when scrolled into view, and only on request on low-power devices.
  - Tile hosts are preconnected.
  - The worker file is versioned and cached forever.
- **Lighthouse (mobile preset):**

  | Page | Performance | Accessibility | Best practices | SEO |
  |---|---|---|---|---|
  | Content pages (stats, about, index, production) | 95–97 | 100 | 100 | 100 |
  | Home map | see note | 100 | 100 | 100 |

  The home map's performance score is dominated by MapLibre and WebGL start-up (about 800 KB of JavaScript plus terrain). Realistically expect roughly 50–75 on a mid-range phone; full 3D terrain can't reach 90+ on Lighthouse's throttled mobile profile. Run [PageSpeed Insights](https://pagespeed.web.dev/) against your deployed URL for real-device numbers.
- **Accessibility.**
  - axe-core reports no WCAG 2.1 AA violations on any page or map state.
  - A skip link, keyboard-operable panels, filters, search (ARIA combobox) and tour reordering.
  - Escape closes the panel and focus moves to its title.
  - `/locations` is a full text alternative to the map.
  - Colour is never the only cue: every beacon type is also named in the legend, tooltips and panels. The neon palette is hard to tell apart for some colour-blind visitors, which is why the labels matter.
- **Reduced motion.** `prefers-reduced-motion` skips the title card, fly-in and drift. Selections become instant cuts, tours step manually, and filter and route animations are off.

## Deploying to Vercel

1. Push this repository to GitHub (it's already set up as `emccoyy/georgia-on-file`).
2. At [vercel.com/new](https://vercel.com/new), **import** the repository. Vercel detects Next.js automatically; keep the defaults:
   - Framework preset: **Next.js**
   - Install command: `npm install` (runs `postinstall`, which copies the MapLibre worker)
   - Build command: `npm run build` (runs `prebuild` data validation first)
   - No environment variables are needed.
3. Click **Deploy**. Every later push to `main` redeploys, and pull requests get preview URLs.
4. Optional:
   - Add a custom domain under *Project → Settings → Domains*.
   - Set `metadataBase` in `src/app/layout.tsx` to that domain, so social-share links resolve correctly.

CI (`.github/workflows/ci.yml`) runs validation, lint, typecheck and build on every push and pull request.

### Before launch

- [ ] Fact-check every entry and flip `verified` to `true`. Re-check anything marked `approximateCoords`.
- [ ] Rewrite descriptions and loglines in your own voice where needed.
- [ ] Fill in `src/lib/site.ts` (portfolio, email, LinkedIn).
- [ ] Optionally add Wikimedia Commons photos (`image` field) with credit and license.
- [ ] Run PageSpeed Insights on the live URL and test on a real phone.

## Credits and licenses

- Map tiles: OpenFreeMap. Map data © OpenStreetMap contributors (ODbL). Schema © OpenMapTiles.
- Terrain: AWS Terrain Tiles (Mapzen; various public sources).
- Contours: maplibre-contour (BSD-3). Map renderer: MapLibre GL JS (BSD-3).
- State boundary: US Census Bureau cartographic boundary files via `us-atlas` (ISC).
- Fonts: Bebas Neue, Inter and JetBrains Mono (SIL Open Font License) via Google Fonts.
- Film and series titles are trademarks of their respective owners, referenced for informational purposes only.

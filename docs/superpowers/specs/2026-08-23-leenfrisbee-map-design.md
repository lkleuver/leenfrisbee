# Leenfrisbee map — design

Date: 2026-08-23

## Goal

A static website (GitHub Pages) that shows, on a map of the Netherlands, the
locations of *leenfrisbee kastjes* (wooden cabinets near parks where you can
borrow a frisbee) and of frisbee clubs. Works on desktop and mobile. The
location data must be editable by a non-technical person.

## Decisions

| Topic | Decision |
|---|---|
| Stack | Vite + React + TypeScript + maplibre-gl |
| Data editing | Two CSV files in the repo, edited via github.com or any spreadsheet app |
| Coordinates | Editor pastes lat/lon (copied from Google Maps) |
| CSV → GeoJSON | At build time, by a Node script; the browser only loads GeoJSON |
| Basemap | PDOK BRT Achtergrondkaart vector tiles (free, no key, NL only) |
| UI language | Dutch and English, toggle in header; code/docs English, editor guide Dutch |
| Hosting | GitHub Pages via GitHub Actions on push to `main` |
| UI features | Marker click → detail panel; layer toggle; search list; "near me" button |

Rejected: no-build single HTML page (no validation gate, no types); Google
Sheet at runtime (external dependency); web CMS (OAuth setup); Astro/Next
(no benefit for one page); geocoding addresses (more code than needed).

## 1. Data pipeline

### Editor-facing files

`data/kastjes.csv`

| column | required | notes |
|---|---|---|
| id | yes | unique, stable, e.g. `utrecht-griftpark` |
| naam | yes | display name |
| plaats | yes | city/town |
| adres | no | street/park description |
| lat | yes | decimal degrees; `,` or `.` accepted |
| lon | yes | decimal degrees; `,` or `.` accepted |
| omschrijving | no | Dutch description |
| omschrijving_en | no | English description; falls back to Dutch |
| foto_url | no | URL to a photo |
| website | no | URL |
| status | yes | `actief` or `verwijderd`; `verwijderd` rows are not shown |

`data/clubs.csv`

| column | required |
|---|---|
| id | yes |
| naam | yes |
| plaats | yes |
| lat | yes |
| lon | yes |
| website | no |
| omschrijving | no |
| omschrijving_en | no |

`data/README.md` (Dutch): how to add/edit a row on github.com, how to copy
coordinates from Google Maps (right-click → first line), decimal rules, what
happens after commit (site updates in ~1–2 minutes, or the commit shows a red
cross with the error).

### Build script: `scripts/build-data.mjs`

- Reads both CSVs with `papaparse` (header row, trimmed values).
- Validates each row:
  - required columns non-empty
  - `lat` in 50.5–53.7 and `lon` in 3.2–7.3 (NL bounding box; also catches swapped values)
  - `id` unique within the file
  - `status` in {`actief`, `verwijderd`} (kastjes only)
  - `foto_url` / `website`, if present, start with `http://` or `https://`
- Writes `public/data/kastjes.geojson` and `public/data/clubs.geojson`
  (FeatureCollection of Points; all columns except lat/lon become
  `properties`). `public/data/` is gitignored — regenerated on every run.
- On any error: prints all errors as `kastjes.csv rij 7 (Griftpark): lat ontbreekt`
  (Dutch, so the editor can read them in the CI log) and exits 1.
- Wired into `package.json` as `predev` and `prebuild` so both the dev server
  and CI run it.

The parse/validate logic lives in `scripts/lib/csv-to-geojson.mjs` (pure
function: CSV text + schema → `{ geojson, errors }`) so it is unit-testable;
`build-data.mjs` is only file I/O around it.

## 2. App

```
src/
  main.tsx           mounts <App/>
  App.tsx            loads geojson, owns UI state
  components/
    Map.tsx          maplibre-gl map, sources, layers, click handling
    DetailPanel.tsx  selected feature details
    LayerToggle.tsx  chips: Kastjes / Clubs
    SearchList.tsx   text filter + clickable list
    Header.tsx       title, language toggle
  lib/
    i18n.ts          {nl, en} strings, language detection/persist
    filter.ts        pure search filter over features
    types.ts         Kastje/Club feature property types
  styles.css
```

### App state
- `kastjes`, `clubs`: FeatureCollections fetched from `${BASE_URL}data/*.geojson` on mount; a loading state and an error message if a fetch fails.
- `visible`: `{ kastjes: boolean, clubs: boolean }` (both true by default).
- `selected`: `{ kind: 'kastje' | 'club', id } | null`.
- `query`: search string.
- `lang`: `'nl' | 'en'`, initial from `localStorage`, else `navigator.language`
  starts with `nl` → `nl`, else `en`.

### Map
- Style: PDOK BRT Achtergrondkaart (standaard) vector tile style URL.
- Initial view: centre of NL (~5.3, 52.2), zoom ~7; `maxBounds` loosely around NL.
- Two GeoJSON sources, one circle layer each (different colours), plus a
  highlight layer for the selected feature. Clustering off (a few hundred
  points max; `ponytail:` add clustering if >~2k points).
- Click on a feature → `onSelect`; click on empty map → deselect.
- `GeolocateControl` (built-in) for "near me"; `NavigationControl` on desktop.
- When `selected` changes from the list, map `flyTo` the feature at zoom ~14.
- Layer visibility follows `visible`.

### Layout
- Desktop (≥ 768px): map fills viewport; left side panel (~360px) with header,
  layer toggle, search list, and the detail panel replacing the list when a
  feature is selected (back button returns to list).
- Mobile: map fills viewport; header on top with layer chips; search opens a
  bottom sheet with the list; selecting a feature shows the detail panel as a
  bottom sheet; close button dismisses.
- Plain CSS with variables; one `@media` breakpoint. No UI framework.

### Detail panel content
Name, city, address, description (`omschrijving_en` when `lang === 'en'` and
present, else `omschrijving`), photo (if `foto_url`), website link, and a
"Route" link to `https://www.google.com/maps/dir/?api=1&destination=lat,lon`.

### i18n
Strings object keyed `nl`/`en`; UI chrome only (labels, buttons, empty
states). Data text is whatever the CSV says.

### Error handling
- GeoJSON fetch failure → visible message in the panel, map still shows.
- Map style failure (PDOK down) → maplibre error logged; message in the panel.
- Build-time data errors never reach the site (CI fails).

## 3. Deploy

`.github/workflows/deploy.yml`: on push to `main` (and manual dispatch):
`actions/checkout` → `setup-node` (Node 22, npm cache) → `npm ci` →
`npm test` → `npm run build` → `upload-pages-artifact` (`dist/`) →
`deploy-pages`. Pages source: GitHub Actions.

Vite `base: '/leenfrisbee/'` (change to `/` with a custom domain). SPA with
no routes, so no 404 handling needed.

## 4. Testing

- **vitest** (unit):
  - `csv-to-geojson`: valid rows → features; missing required field; lat/lon
    swapped; comma decimal accepted; duplicate id; bad status; `verwijderd`
    row excluded; error messages include file, row, and name.
  - `filter.ts`: matches on name and city, case/diacritic-insensitive.
  - `i18n.ts`: language detection and fallback.
- **Playwright** (e2e, in CI against `vite preview`): page loads, map canvas
  exists, typing in search narrows the list, clicking an item opens the detail
  panel with its name, toggling a layer chip hides its markers (check via
  `map.getLayoutProperty` exposed on `window` in dev/test builds).
- The data-validation rule set is what protects production; it is the most
  important thing to keep covered.

## Out of scope (for now)

Geocoding, clustering, a CMS/admin page, photo hosting, per-kastje status
reports from visitors, analytics.

# Leenfrisbee Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub Pages site showing leenfrisbee kastjes and frisbee clubs on a MapLibre map of the Netherlands, with data maintained in two CSV files.

**Architecture:** Two CSVs in `data/` are converted and validated by a Node script (`scripts/build-data.mjs`) into GeoJSON in `public/data/` at build time. A Vite + React + TypeScript app fetches the GeoJSON, renders it on a maplibre-gl map (PDOK basemap) and offers layer toggles, a search list, a detail panel and NL/EN UI strings. GitHub Actions runs tests, builds, and deploys `dist/` to Pages.

**Tech Stack:** Node 22, Vite 8, React 19, TypeScript 5.9, maplibre-gl 6, papaparse 5, vitest 4, Playwright 1.62, GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-08-23-leenfrisbee-map-design.md`

## Global Constraints

- Code, comments, commit messages, technical docs: English. UI strings: Dutch and English via `src/lib/i18n.ts`. `data/README.md` and build-script error messages: Dutch.
- Basemap style URL: `https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/styles/standaard__webmercatorquad?f=mapbox`
- Vite `base: '/leenfrisbee/'`.
- NL bounding box for validation: lat 50.5–53.7, lon 3.2–7.3.
- `public/data/` is generated and gitignored; never commit it.
- No UI framework; plain CSS in `src/styles.css`, one breakpoint at 768px.
- Immutable data handling (spread/map, no in-place mutation) per user coding style.
- Commit after every task with conventional-commit messages (`feat:`, `test:`, `chore:`, `docs:`, `ci:`). No attribution trailers.
- Do not start the Vite dev server from a non-tmux shell (a local hook blocks it). Use `npm run build` + `npm run preview` for manual checks, or run the dev server inside tmux.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/vite-env.d.ts`
- Modify: `.gitignore` (append)

**Interfaces:**
- Produces: `npm run build`, `npm test`, `npm run preview` scripts; `import.meta.env.BASE_URL === '/leenfrisbee/'`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "leenfrisbee",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "maplibre-gl": "^6.5.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.62.0",
    "@types/geojson": "^7946.0.16",
    "@types/node": "^22.0.0",
    "@types/papaparse": "^5.5.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.1.0",
    "papaparse": "^5.6.0",
    "typescript": "^5.9.0",
    "vite": "^8.2.0",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: Write TypeScript configs**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/leenfrisbee/',
  test: {
    include: ['scripts/**/*.test.mjs', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write `index.html`, `src/main.tsx`, placeholder `src/App.tsx`, `src/styles.css`, `src/vite-env.d.ts`**

`index.html`:
```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Leenfrisbee kastjes</title>
    <meta name="description" content="Kaart van leenfrisbee kastjes en frisbeeclubs in Nederland" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder, replaced in Task 6):
```tsx
export default function App() {
  return <h1>Leenfrisbee</h1>;
}
```

`src/styles.css` (placeholder, replaced in Task 7):
```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: Append to `.gitignore`**

```
# generated data and test output
public/data/
test-results/
playwright-report/
```

- [ ] **Step 6: Install and verify build**

Run: `npm install && npm run build`
Expected: `dist/index.html` exists and `dist/assets/*.js` exists; no TypeScript errors.

Run: `npm test`
Expected: vitest reports "No test files found" and exits 0 (vitest 4 exits 0 on no tests only with `--passWithNoTests`; if it exits 1, add `"test": "vitest run --passWithNoTests"` — remove the flag again in Task 2 once tests exist).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts index.html src .gitignore
git commit -m "chore: scaffold vite react typescript project"
```

---

### Task 2: CSV → GeoJSON conversion and validation library

**Files:**
- Create: `scripts/lib/csv-to-geojson.mjs`
- Test: `scripts/lib/csv-to-geojson.test.mjs`

**Interfaces:**
- Produces:
  - `csvToGeoJson(csvText: string, schema: Schema, fileName: string): { geojson: FeatureCollection, errors: string[] }`
  - `KASTJES_SCHEMA`, `CLUBS_SCHEMA` (objects `{ required: string[], urls: string[], status: string[] | null }`)
  - `NL_BBOX = { minLat: 50.5, maxLat: 53.7, minLon: 3.2, maxLon: 7.3 }`
  - Feature properties = all CSV columns except `lat`/`lon` (strings); geometry `[lon, lat]` numbers.
  - Kastjes rows with `status !== 'actief'` are omitted from features (but still validated).
  - Error format: `` `${fileName} rij ${rowNumber} (${naam||id||'?'}): ${message}` `` — rowNumber counts the header as row 1, so the first data row is 2.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/csv-to-geojson.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { csvToGeoJson, KASTJES_SCHEMA, CLUBS_SCHEMA } from './csv-to-geojson.mjs';

const HEADER = 'id,naam,plaats,adres,lat,lon,omschrijving,omschrijving_en,foto_url,website,status';
const row = (overrides = {}) => {
  const base = {
    id: 'utrecht-griftpark', naam: 'Griftpark', plaats: 'Utrecht', adres: 'Griftpark',
    lat: '52.1003', lon: '5.1261', omschrijving: 'Bij de ingang', omschrijving_en: 'At the entrance',
    foto_url: '', website: '', status: 'actief',
  };
  const r = { ...base, ...overrides };
  return HEADER.split(',').map((k) => r[k]).join(',');
};
const csv = (...rows) => [HEADER, ...rows].join('\n');

describe('csvToGeoJson', () => {
  it('converts a valid row to a Point feature with lon/lat order', () => {
    const { geojson, errors } = csvToGeoJson(csv(row()), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual([]);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(1);
    const f = geojson.features[0];
    expect(f.geometry).toEqual({ type: 'Point', coordinates: [5.1261, 52.1003] });
    expect(f.properties.naam).toBe('Griftpark');
    expect(f.properties.lat).toBeUndefined();
    expect(f.properties.lon).toBeUndefined();
  });

  it('accepts comma decimals', () => {
    const { geojson, errors } = csvToGeoJson(csv(row({ lat: '"52,1003"', lon: '"5,1261"' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual([]);
    expect(geojson.features[0].geometry.coordinates).toEqual([5.1261, 52.1003]);
  });

  it('accepts semicolon-delimited files (Dutch Excel export) and a BOM', () => {
    const text = '\uFEFF' + csv(row()).replaceAll(',', ';');
    const { geojson, errors } = csvToGeoJson(text, KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual([]);
    expect(geojson.features).toHaveLength(1);
  });

  it('reports a missing required field with file, row and name', () => {
    const { errors } = csvToGeoJson(csv(row({ lat: '' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 2 (Griftpark): lat ontbreekt']);
  });

  it('reports swapped lat/lon as outside the Netherlands', () => {
    const { errors } = csvToGeoJson(csv(row({ lat: '5.1261', lon: '52.1003' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors.some((e) => e.includes('lat 5.1261 ligt buiten Nederland'))).toBe(true);
    expect(errors.some((e) => e.includes('lon 52.1003 ligt buiten Nederland'))).toBe(true);
  });

  it('reports a non-numeric coordinate', () => {
    const { errors } = csvToGeoJson(csv(row({ lat: 'abc' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 2 (Griftpark): lat "abc" is geen getal']);
  });

  it('reports duplicate ids', () => {
    const { errors } = csvToGeoJson(csv(row(), row({ naam: 'Kopie' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 3 (Kopie): id "utrecht-griftpark" komt dubbel voor']);
  });

  it('reports an unknown status', () => {
    const { errors } = csvToGeoJson(csv(row({ status: 'weg' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 2 (Griftpark): status "weg" moet actief of verwijderd zijn']);
  });

  it('omits verwijderd rows from the output but still validates them', () => {
    const { geojson, errors } = csvToGeoJson(csv(row({ status: 'verwijderd' }), row({ id: 'x', naam: 'Ander', status: 'verwijderd', lat: '' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(geojson.features).toHaveLength(0);
    expect(errors).toEqual(['kastjes.csv rij 3 (Ander): lat ontbreekt']);
  });

  it('reports urls without http(s)://', () => {
    const { errors } = csvToGeoJson(csv(row({ website: 'www.example.nl' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 2 (Griftpark): website moet met http:// of https:// beginnen']);
  });

  it('validates clubs without a status column', () => {
    const text = 'id,naam,plaats,lat,lon,website,omschrijving,omschrijving_en\nufo,UFO,Utrecht,52.0845,5.1714,https://ufo.nl,,';
    const { geojson, errors } = csvToGeoJson(text, CLUBS_SCHEMA, 'clubs.csv');
    expect(errors).toEqual([]);
    expect(geojson.features[0].properties).toEqual({ id: 'ufo', naam: 'UFO', plaats: 'Utrecht', website: 'https://ufo.nl', omschrijving: '', omschrijving_en: '' });
  });

  it('reports all errors across rows, not just the first', () => {
    const { errors } = csvToGeoJson(csv(row({ lat: '' }), row({ id: 'b', naam: 'B', lon: '' })), KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/lib/csv-to-geojson.test.mjs`
Expected: FAIL — "Failed to load url ./csv-to-geojson.mjs" (module does not exist).

- [ ] **Step 3: Write the implementation**

`scripts/lib/csv-to-geojson.mjs`:
```js
import Papa from 'papaparse';

export const NL_BBOX = { minLat: 50.5, maxLat: 53.7, minLon: 3.2, maxLon: 7.3 };

export const KASTJES_SCHEMA = {
  required: ['id', 'naam', 'plaats', 'lat', 'lon', 'status'],
  urls: ['foto_url', 'website'],
  status: ['actief', 'verwijderd'],
};

export const CLUBS_SCHEMA = {
  required: ['id', 'naam', 'plaats', 'lat', 'lon'],
  urls: ['website'],
  status: null,
};

const parseNumber = (value) => {
  if (value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const inRange = (n, min, max) => n >= min && n <= max;

/** Validate one parsed CSV row. Returns a list of Dutch error messages (empty = valid). */
function validateRow(row, schema, seenIds) {
  const missing = schema.required.filter((col) => !row[col]).map((col) => `${col} ontbreekt`);
  const duplicate = row.id && seenIds.has(row.id) ? [`id "${row.id}" komt dubbel voor`] : [];

  const lat = parseNumber(row.lat);
  const lon = parseNumber(row.lon);
  const numeric = [
    row.lat && lat === null ? `lat "${row.lat}" is geen getal` : null,
    row.lon && lon === null ? `lon "${row.lon}" is geen getal` : null,
  ];
  const bbox = [
    lat !== null && !inRange(lat, NL_BBOX.minLat, NL_BBOX.maxLat) ? `lat ${lat} ligt buiten Nederland (lat/lon verwisseld?)` : null,
    lon !== null && !inRange(lon, NL_BBOX.minLon, NL_BBOX.maxLon) ? `lon ${lon} ligt buiten Nederland (lat/lon verwisseld?)` : null,
  ];
  const status =
    schema.status && row.status && !schema.status.includes(row.status)
      ? [`status "${row.status}" moet ${schema.status.join(' of ')} zijn`]
      : [];
  const urls = schema.urls
    .filter((col) => row[col] && !/^https?:\/\//.test(row[col]))
    .map((col) => `${col} moet met http:// of https:// beginnen`);

  return [...missing, ...duplicate, ...numeric, ...bbox, ...status, ...urls].filter(Boolean);
}

function toFeature(row) {
  const { lat, lon, ...properties } = row;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [parseNumber(lon), parseNumber(lat)] },
    properties,
  };
}

/**
 * Parse CSV text and validate it against a schema.
 * @returns {{ geojson: object, errors: string[] }} errors are Dutch, one per problem, prefixed with file and row.
 */
export function csvToGeoJson(csvText, schema, fileName) {
  const parsed = Papa.parse(csvText.replace(/^\uFEFF/, '').trim(), {
    header: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  });

  const parseErrors = parsed.errors.map((e) => `${fileName} rij ${(e.row ?? 0) + 2}: ${e.message}`);

  const seenIds = new Set();
  const results = parsed.data.map((row, i) => {
    const label = `${fileName} rij ${i + 2} (${row.naam || row.id || '?'})`;
    const errors = validateRow(row, schema, seenIds).map((m) => `${label}: ${m}`);
    if (row.id) seenIds.add(row.id);
    const hidden = schema.status !== null && row.status !== 'actief';
    return { errors, feature: errors.length === 0 && !hidden ? toFeature(row) : null };
  });

  return {
    geojson: { type: 'FeatureCollection', features: results.map((r) => r.feature).filter(Boolean) },
    errors: [...parseErrors, ...results.flatMap((r) => r.errors)],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/lib/csv-to-geojson.test.mjs`
Expected: 12 tests PASS. If the comma-decimal test fails because papaparse's `transform` receives quoted values already unquoted — that's expected behaviour and the test should pass; if the semicolon test fails, check that papaparse auto-detected the delimiter (do not pass `delimiter`).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib
git commit -m "feat: add csv to geojson conversion with dutch validation errors"
```

---

### Task 3: Build script, CSV data files, editor guide

**Files:**
- Create: `scripts/build-data.mjs`, `data/kastjes.csv`, `data/clubs.csv`, `data/README.md`
- Modify: `package.json` (add `build-data`, `predev`, `prebuild` scripts)

**Interfaces:**
- Consumes: `csvToGeoJson`, `KASTJES_SCHEMA`, `CLUBS_SCHEMA` from Task 2.
- Produces: `public/data/kastjes.geojson`, `public/data/clubs.geojson`; exit code 1 and error listing on invalid data.

- [ ] **Step 1: Write `scripts/build-data.mjs`**

```js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { CLUBS_SCHEMA, KASTJES_SCHEMA, csvToGeoJson } from './lib/csv-to-geojson.mjs';

const OUT_DIR = 'public/data';
const FILES = [
  { csv: 'data/kastjes.csv', out: `${OUT_DIR}/kastjes.geojson`, schema: KASTJES_SCHEMA },
  { csv: 'data/clubs.csv', out: `${OUT_DIR}/clubs.geojson`, schema: CLUBS_SCHEMA },
];

mkdirSync(OUT_DIR, { recursive: true });

const allErrors = FILES.flatMap(({ csv, out, schema }) => {
  const { geojson, errors } = csvToGeoJson(readFileSync(csv, 'utf8'), schema, basename(csv));
  if (errors.length === 0) {
    writeFileSync(out, JSON.stringify(geojson));
    console.log(`${csv} → ${out} (${geojson.features.length} punten)`);
  }
  return errors;
});

if (allErrors.length > 0) {
  console.error('\nFouten in de data (site is NIET bijgewerkt):\n' + allErrors.map((e) => `  - ${e}`).join('\n'));
  console.error('\nZie data/README.md voor uitleg over de kolommen.');
  process.exit(1);
}
```

- [ ] **Step 2: Write the CSV files with example rows**

`data/kastjes.csv`:
```csv
id,naam,plaats,adres,lat,lon,omschrijving,omschrijving_en,foto_url,website,status
utrecht-griftpark,Griftpark,Utrecht,Griftpark bij de hoofdingang,52.1003,5.1261,Voorbeeld: kastje bij de ingang van het park.,Example: cabinet at the park entrance.,,,actief
amsterdam-westerpark,Westerpark,Amsterdam,Westerpark bij het grasveld,52.3868,4.8766,Voorbeeld: kastje naast het grote grasveld.,Example: cabinet next to the big lawn.,,,actief
```

`data/clubs.csv`:
```csv
id,naam,plaats,lat,lon,website,omschrijving,omschrijving_en
ufo-utrecht,UFO Utrecht,Utrecht,52.0845,5.1714,https://www.ufo-utrecht.nl,Voorbeeld: ultimate frisbee club op Sportpark Olympos.,Example: ultimate frisbee club at Sportpark Olympos.
```

- [ ] **Step 3: Write `data/README.md` (Dutch editor guide)**

```markdown
# Locaties bewerken

De kaart op de website komt uit twee bestanden in deze map:

- `kastjes.csv` — de leenfrisbee kastjes
- `clubs.csv` — de frisbeeclubs

Je kunt ze bewerken op github.com (klik op het bestand → potloodje rechtsboven → wijzig → "Commit changes") of in een spreadsheet-programma (Excel, Numbers, Google Sheets) en dan opslaan als CSV en uploaden.

Na het opslaan wordt de website binnen ±2 minuten automatisch bijgewerkt. Staat er iets fout in de data, dan krijgt je wijziging een rood kruisje op github.com; klik erop om de foutmelding te lezen (bijvoorbeeld `kastjes.csv rij 7 (Griftpark): lat ontbreekt`). De website blijft dan op de vorige versie staan tot de fout is opgelost.

## Coördinaten (lat/lon) opzoeken

1. Open [Google Maps](https://maps.google.com) en zoek de plek.
2. Klik met de rechtermuisknop precies op de plek (op de telefoon: lang indrukken).
3. De bovenste regel in het menu zijn de coördinaten, bijvoorbeeld `52.10031, 5.12612`. Klik erop om te kopiëren.
4. Het eerste getal is `lat`, het tweede `lon`. Een punt of komma als decimaalteken maakt niet uit.

## Kolommen in `kastjes.csv`

| kolom | verplicht | uitleg |
|---|---|---|
| id | ja | unieke code zonder spaties, bijv. `utrecht-griftpark`. Verander deze daarna niet meer. |
| naam | ja | naam zoals op de kaart getoond |
| plaats | ja | stad of dorp |
| adres | nee | straat of beschrijving van de plek |
| lat | ja | breedtegraad, bijv. `52.1003` |
| lon | ja | lengtegraad, bijv. `5.1261` |
| omschrijving | nee | korte tekst in het Nederlands |
| omschrijving_en | nee | dezelfde tekst in het Engels (anders wordt de Nederlandse getoond) |
| foto_url | nee | link naar een foto, begint met `https://` |
| website | nee | link naar een website, begint met `https://` |
| status | ja | `actief` of `verwijderd` (verwijderde kastjes worden niet getoond maar blijven in het bestand) |

## Kolommen in `clubs.csv`

| kolom | verplicht | uitleg |
|---|---|---|
| id | ja | unieke code zonder spaties, bijv. `ufo-utrecht` |
| naam | ja | naam van de club |
| plaats | ja | stad of dorp |
| lat | ja | breedtegraad |
| lon | ja | lengtegraad |
| website | nee | begint met `https://` |
| omschrijving | nee | korte tekst in het Nederlands |
| omschrijving_en | nee | dezelfde tekst in het Engels |

## Tips

- Laat de eerste regel (de kolomnamen) altijd staan.
- Een komma in een tekst? Zet de hele tekst dan tussen dubbele aanhalingstekens: `"Bij het veld, naast de bank"`. Spreadsheet-programma's doen dit automatisch.
- De voorbeeldregels mag je verwijderen of aanpassen.
```

- [ ] **Step 4: Add npm scripts**

In `package.json` `scripts`, add (keep existing entries):
```json
"build-data": "node scripts/build-data.mjs",
"predev": "node scripts/build-data.mjs",
"prebuild": "node scripts/build-data.mjs",
```

- [ ] **Step 5: Verify success and failure paths**

Run: `npm run build-data`
Expected output:
```
data/kastjes.csv → public/data/kastjes.geojson (2 punten)
data/clubs.csv → public/data/clubs.geojson (1 punten)
```
and `public/data/kastjes.geojson` exists and is not tracked by git (`git status` does not list it).

Then temporarily break the data: change `52.1003` to `5.1003` in `data/kastjes.csv`, run `npm run build-data; echo "exit $?"`.
Expected: error listing mentioning `kastjes.csv rij 2 (Griftpark): lat 5.1003 ligt buiten Nederland (lat/lon verwisseld?)` and `exit 1`. Revert the change (`git checkout data/kastjes.csv`).

Run: `npm run build`
Expected: build-data runs first, then tsc and vite build succeed; `dist/data/kastjes.geojson` exists.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-data.mjs data package.json
git commit -m "feat: build-time csv validation and geojson generation with editor guide"
```

---

### Task 4: i18n strings and language detection

**Files:**
- Create: `src/lib/i18n.ts`
- Test: `src/lib/i18n.test.ts`

**Interfaces:**
- Produces:
  - `type Lang = 'nl' | 'en'`
  - `STORAGE_KEY = 'leenfrisbee.lang'`
  - `strings: Record<Lang, Strings>` with keys listed below
  - `detectLang(stored: string | null, navigatorLang: string): Lang`
  - `readStoredLang(): string | null`, `storeLang(lang: Lang): void` (localStorage wrappers that never throw)

- [ ] **Step 1: Write the failing test**

`src/lib/i18n.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectLang, strings } from './i18n';

describe('detectLang', () => {
  it('prefers a valid stored value', () => {
    expect(detectLang('en', 'nl-NL')).toBe('en');
    expect(detectLang('nl', 'en-US')).toBe('nl');
  });
  it('ignores an invalid stored value', () => {
    expect(detectLang('fr', 'nl-NL')).toBe('nl');
  });
  it('falls back to navigator language: nl* → nl, anything else → en', () => {
    expect(detectLang(null, 'nl')).toBe('nl');
    expect(detectLang(null, 'NL-be')).toBe('nl');
    expect(detectLang(null, 'de-DE')).toBe('en');
    expect(detectLang(null, '')).toBe('en');
  });
});

describe('strings', () => {
  it('has the same keys in nl and en', () => {
    expect(Object.keys(strings.en).sort()).toEqual(Object.keys(strings.nl).sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/i18n.test.ts`
Expected: FAIL — cannot resolve `./i18n`.

- [ ] **Step 3: Write the implementation**

`src/lib/i18n.ts`:
```ts
export type Lang = 'nl' | 'en';

export const STORAGE_KEY = 'leenfrisbee.lang';

const nl = {
  title: 'Leenfrisbee kastjes',
  tagline: 'Leen een frisbee, gooi, en leg hem terug.',
  kastjes: 'Kastjes',
  clubs: 'Clubs',
  kastje: 'Leenfrisbee kastje',
  club: 'Frisbeeclub',
  search: 'Zoek op naam of plaats',
  results: (n: number) => (n === 1 ? '1 locatie' : `${n} locaties`),
  noResults: 'Geen locaties gevonden',
  back: 'Terug',
  close: 'Sluiten',
  website: 'Website',
  route: 'Route',
  loading: 'Laden…',
  loadError: 'De locaties konden niet geladen worden. Probeer het later opnieuw.',
  mapError: 'De kaart kon niet geladen worden.',
  language: 'Taal',
};

export type Strings = typeof nl;

const en: Strings = {
  title: 'Leenfrisbee cabinets',
  tagline: 'Borrow a frisbee, throw, and put it back.',
  kastjes: 'Cabinets',
  clubs: 'Clubs',
  kastje: 'Frisbee lending cabinet',
  club: 'Frisbee club',
  search: 'Search by name or town',
  results: (n: number) => (n === 1 ? '1 location' : `${n} locations`),
  noResults: 'No locations found',
  back: 'Back',
  close: 'Close',
  website: 'Website',
  route: 'Directions',
  loading: 'Loading…',
  loadError: 'The locations could not be loaded. Please try again later.',
  mapError: 'The map could not be loaded.',
  language: 'Language',
};

export const strings: Record<Lang, Strings> = { nl, en };

const isLang = (v: unknown): v is Lang => v === 'nl' || v === 'en';

export function detectLang(stored: string | null, navigatorLang: string): Lang {
  if (isLang(stored)) return stored;
  return navigatorLang.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function readStoredLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage unavailable (private mode etc.) — language just won't persist
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/i18n.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat: add nl/en ui strings and language detection"
```

---

### Task 5: Shared types and search filter

**Files:**
- Create: `src/lib/types.ts`, `src/lib/filter.ts`
- Test: `src/lib/filter.test.ts`

**Interfaces:**
- Produces:
  - `type Kind = 'kastje' | 'club'`, `KINDS: readonly Kind[]`
  - `interface PlaceProps { id; naam; plaats; kind: Kind; adres?; omschrijving?; omschrijving_en?; foto_url?; website?; status? }` (all strings)
  - `type Place = Feature<Point, PlaceProps>`
  - `filterByQuery(places: readonly Place[], query: string): Place[]`

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
import type { Feature, Point } from 'geojson';

export type Kind = 'kastje' | 'club';
export const KINDS: readonly Kind[] = ['kastje', 'club'];

export interface PlaceProps {
  id: string;
  naam: string;
  plaats: string;
  kind: Kind;
  adres?: string;
  omschrijving?: string;
  omschrijving_en?: string;
  foto_url?: string;
  website?: string;
  status?: string;
}

export type Place = Feature<Point, PlaceProps>;

export interface Visibility {
  kastje: boolean;
  club: boolean;
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/filter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { filterByQuery } from './filter';
import type { Place } from './types';

const place = (id: string, naam: string, plaats: string): Place => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [5, 52] },
  properties: { id, naam, plaats, kind: 'kastje' },
});

const places = [place('a', 'Griftpark', 'Utrecht'), place('b', 'Westerpark', 'Amsterdam'), place('c', 'Zuiderpark', 'Den Haag')];

describe('filterByQuery', () => {
  it('returns everything for an empty or whitespace query', () => {
    expect(filterByQuery(places, '')).toHaveLength(3);
    expect(filterByQuery(places, '   ')).toHaveLength(3);
  });
  it('matches on name, case-insensitively', () => {
    expect(filterByQuery(places, 'GRIFT').map((p) => p.properties.id)).toEqual(['a']);
  });
  it('matches on town', () => {
    expect(filterByQuery(places, 'den haag').map((p) => p.properties.id)).toEqual(['c']);
  });
  it('ignores diacritics', () => {
    expect(filterByQuery([place('d', 'Café Park', 'Zutphen')], 'cafe')).toHaveLength(1);
  });
  it('does not mutate the input', () => {
    const copy = [...places];
    filterByQuery(places, 'x');
    expect(places).toEqual(copy);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: FAIL — cannot resolve `./filter`.

- [ ] **Step 4: Write the implementation**

`src/lib/filter.ts`:
```ts
import type { Place } from './types';

const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function filterByQuery(places: readonly Place[], query: string): Place[] {
  const q = normalize(query.trim());
  if (q === '') return [...places];
  return places.filter((p) => normalize(`${p.properties.naam} ${p.properties.plaats}`).includes(q));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: 5 tests PASS. Also run `npx tsc -b` — expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: add place types and diacritic-insensitive search filter"
```

---

### Task 6: Data loading, MapView component, minimal App

**Files:**
- Create: `src/lib/load.ts`, `src/components/MapView.tsx`
- Modify: `src/App.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `Place`, `Kind`, `KINDS`, `Visibility` (Task 5); `strings`, `detectLang`, `readStoredLang` (Task 4).
- Produces:
  - `loadPlaces(baseUrl: string): Promise<{ kastjes: Place[]; clubs: Place[] }>` — adds `kind` to each feature's properties.
  - `<MapView kastjes clubs visible selected onSelect onError />` with `onSelect: (p: Place | null) => void`, `onError: () => void`.
  - `window.__map` set to the maplibre `Map` instance (used by e2e tests).
  - Map layer ids: `'kastje'`, `'club'`, `'kastje-selected'`, `'club-selected'`; source ids `'kastje'`, `'club'`.

- [ ] **Step 1: Write `src/lib/load.ts`**

```ts
import type { FeatureCollection, Point } from 'geojson';
import type { Kind, Place, PlaceProps } from './types';

async function fetchKind(url: string, kind: Kind): Promise<Place[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  const fc = (await res.json()) as FeatureCollection<Point, Omit<PlaceProps, 'kind'>>;
  return fc.features.map((f) => ({ ...f, properties: { ...f.properties, kind } }));
}

export async function loadPlaces(baseUrl: string): Promise<{ kastjes: Place[]; clubs: Place[] }> {
  const [kastjes, clubs] = await Promise.all([
    fetchKind(`${baseUrl}data/kastjes.geojson`, 'kastje'),
    fetchKind(`${baseUrl}data/clubs.geojson`, 'club'),
  ]);
  return { kastjes, clubs };
}
```

- [ ] **Step 2: Write `src/components/MapView.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { KINDS, type Kind, type Place, type PlaceProps, type Visibility } from '../lib/types';

const STYLE_URL = 'https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/styles/standaard__webmercatorquad?f=mapbox';
const NL_CENTER: [number, number] = [5.3, 52.2];
const NL_MAX_BOUNDS: [[number, number], [number, number]] = [[2.0, 50.0], [8.5, 54.3]];
const INITIAL_ZOOM = 6.5;
const SELECT_ZOOM = 14;
const MOBILE_BREAKPOINT = 768;
const MOBILE_SHEET_PADDING = 280;
const COLORS: Record<Kind, string> = { kastje: '#e63946', club: '#1d3557' };
const EMPTY: FeatureCollection<Point, PlaceProps> = { type: 'FeatureCollection', features: [] };

declare global {
  interface Window {
    __map?: MapLibreMap;
  }
}

interface Props {
  kastjes: Place[];
  clubs: Place[];
  visible: Visibility;
  selected: Place | null;
  onSelect: (place: Place | null) => void;
  onError: () => void;
}

const toCollection = (features: Place[]): FeatureCollection<Point, PlaceProps> => ({ type: 'FeatureCollection', features });

export function MapView({ kastjes, clubs, visible, selected, onSelect, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Latest callbacks/data without re-creating the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const placesRef = useRef<Place[]>([]);
  placesRef.current = [...kastjes, ...clubs];

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: NL_CENTER,
      zoom: INITIAL_ZOOM,
      maxBounds: NL_MAX_BOUNDS,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');

    let styleLoaded = false;
    map.once('style.load', () => {
      styleLoaded = true;
    });
    map.on('error', (e) => {
      console.error('maplibre error', e.error);
      if (!styleLoaded) onErrorRef.current();
    });

    const findPlace = (kind: Kind, id: unknown) =>
      placesRef.current.find((p) => p.properties.kind === kind && p.properties.id === id) ?? null;

    map.on('load', () => {
      KINDS.forEach((kind) => {
        map.addSource(kind, { type: 'geojson', data: EMPTY });
        map.addLayer({
          id: kind,
          type: 'circle',
          source: kind,
          paint: { 'circle-radius': 7, 'circle-color': COLORS[kind], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        });
        map.addLayer({
          id: `${kind}-selected`,
          type: 'circle',
          source: kind,
          filter: ['==', ['get', 'id'], ''],
          paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 3, 'circle-stroke-color': COLORS[kind] },
        });
        map.on('click', kind, (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          onSelectRef.current(findPlace(kind, id));
        });
        map.on('mouseenter', kind, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', kind, () => {
          map.getCanvas().style.cursor = '';
        });
      });
      map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: [...KINDS] });
        if (hits.length === 0) onSelectRef.current(null);
      });
      setReady(true);
    });

    mapRef.current = map;
    window.__map = map;
    return () => {
      map.remove();
      mapRef.current = null;
      window.__map = undefined;
    };
  }, []);

  // Push data into sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('kastje') as maplibregl.GeoJSONSource).setData(toCollection(kastjes));
    (map.getSource('club') as maplibregl.GeoJSONSource).setData(toCollection(clubs));
  }, [ready, kastjes, clubs]);

  // Layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    KINDS.forEach((kind) => {
      const value = visible[kind] ? 'visible' : 'none';
      map.setLayoutProperty(kind, 'visibility', value);
      map.setLayoutProperty(`${kind}-selected`, 'visibility', value);
    });
  }, [ready, visible]);

  // Highlight + fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    KINDS.forEach((kind) => {
      const id = selected?.properties.kind === kind ? selected.properties.id : '';
      map.setFilter(`${kind}-selected`, ['==', ['get', 'id'], id]);
    });
    if (selected) {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      map.flyTo({
        center: selected.geometry.coordinates as [number, number],
        zoom: Math.max(map.getZoom(), SELECT_ZOOM),
        padding: { top: 0, left: 0, right: 0, bottom: isMobile ? MOBILE_SHEET_PADDING : 0 },
      });
    }
  }, [ready, selected]);

  return <div ref={containerRef} className="map" aria-label="Kaart" />;
}
```

- [ ] **Step 3: Replace `src/App.tsx` with a minimal app that loads data and shows the map**

```tsx
import { useEffect, useState } from 'react';
import { MapView } from './components/MapView';
import { loadPlaces } from './lib/load';
import { detectLang, readStoredLang, strings, type Lang } from './lib/i18n';
import type { Place, Visibility } from './lib/types';

interface Data {
  kastjes: Place[];
  clubs: Place[];
}

export default function App() {
  const [lang] = useState<Lang>(() => detectLang(readStoredLang(), navigator.language));
  const t = strings[lang];
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [visible] = useState<Visibility>({ kastje: true, club: true });
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    loadPlaces(import.meta.env.BASE_URL)
      .then(setData)
      .catch((err: unknown) => {
        console.error(err);
        setLoadError(true);
      });
  }, []);

  return (
    <div className="app">
      <aside className="panel">
        <h1>{t.title}</h1>
        {loadError && <p role="alert">{t.loadError}</p>}
        {mapError && <p role="alert">{t.mapError}</p>}
        {!data && !loadError && <p>{t.loading}</p>}
        {selected && <p>{selected.properties.naam}</p>}
      </aside>
      <MapView
        kastjes={data?.kastjes ?? []}
        clubs={data?.clubs ?? []}
        visible={visible}
        selected={selected}
        onSelect={setSelected}
        onError={() => setMapError(true)}
      />
    </div>
  );
}
```

Temporarily extend `src/styles.css` so the map is visible (replaced in Task 7):
```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
.app { display: grid; grid-template-columns: 360px 1fr; height: 100%; }
.panel { padding: 1rem; overflow: auto; }
.map { height: 100%; }
```

- [ ] **Step 4: Build and manually verify**

Run: `npm run build && npm run preview`
Open `http://localhost:4173/leenfrisbee/` in a browser.
Expected: PDOK basemap of the Netherlands; two red dots (Utrecht, Amsterdam) and one dark-blue dot (Utrecht); clicking a dot zooms in, draws a ring around it and shows its name in the left panel; clicking empty map clears the name; geolocate and zoom controls visible top-right. No console errors other than possible tile 404s at the map edge. Stop the preview server.

- [ ] **Step 5: Commit**

```bash
git add src/lib/load.ts src/components/MapView.tsx src/App.tsx src/styles.css
git commit -m "feat: render kastjes and clubs on a maplibre map with pdok basemap"
```

---

### Task 7: Panel UI — header, layer toggle, search list, detail panel, responsive layout

**Files:**
- Create: `src/components/Header.tsx`, `src/components/LayerToggle.tsx`, `src/components/SearchList.tsx`, `src/components/DetailPanel.tsx`
- Modify: `src/App.tsx`, `src/styles.css` (replace)

**Interfaces:**
- Consumes: `Place`, `Kind`, `Visibility` (Task 5); `Strings`, `Lang`, `storeLang` (Task 4); `filterByQuery` (Task 5); `MapView` (Task 6).
- Produces (props):
  - `<Header lang onLangChange t />`
  - `<LayerToggle visible onToggle(kind) t />` — chips are `<button aria-pressed>` with accessible names `t.kastjes` / `t.clubs`
  - `<SearchList places query onQueryChange onPick(place) onClose t />` — search input has `role="searchbox"`, results are `<li>` inside `<ul>`, each containing a `<button>`
  - `<DetailPanel place lang t onBack />` — renders `<h2>` with the place name
  - Mobile: `.panel` becomes a bottom sheet shown when `sheetOpen || selected`; a `.fab` button (search icon) opens it.

- [ ] **Step 1: Write `src/components/Header.tsx`**

```tsx
import type { Lang, Strings } from '../lib/i18n';

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: Strings;
}

const LANGS: readonly Lang[] = ['nl', 'en'];

export function Header({ lang, onLangChange, t }: Props) {
  return (
    <header className="header">
      <div>
        <h1 className="header__title">{t.title}</h1>
        <p className="header__tagline">{t.tagline}</p>
      </div>
      <div className="lang" role="group" aria-label={t.language}>
        {LANGS.map((l) => (
          <button key={l} type="button" className="lang__btn" aria-pressed={l === lang} onClick={() => onLangChange(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `src/components/LayerToggle.tsx`**

```tsx
import type { Strings } from '../lib/i18n';
import { KINDS, type Kind, type Visibility } from '../lib/types';

interface Props {
  visible: Visibility;
  onToggle: (kind: Kind) => void;
  t: Strings;
}

const LABEL: Record<Kind, keyof Pick<Strings, 'kastjes' | 'clubs'>> = { kastje: 'kastjes', club: 'clubs' };

export function LayerToggle({ visible, onToggle, t }: Props) {
  return (
    <div className="chips">
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`chip chip--${kind}`}
          aria-pressed={visible[kind]}
          onClick={() => onToggle(kind)}
        >
          <span className="chip__dot" aria-hidden="true" />
          {t[LABEL[kind]]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/SearchList.tsx`**

```tsx
import type { Strings } from '../lib/i18n';
import type { Place } from '../lib/types';

interface Props {
  places: Place[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (place: Place) => void;
  onClose: () => void;
  t: Strings;
}

export function SearchList({ places, query, onQueryChange, onPick, onClose, t }: Props) {
  return (
    <div className="list">
      <div className="list__search">
        <input
          type="search"
          role="searchbox"
          className="list__input"
          placeholder={t.search}
          aria-label={t.search}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="button" className="btn btn--ghost mobile-only" onClick={onClose}>
          {t.close}
        </button>
      </div>
      <p className="list__count">{places.length === 0 ? t.noResults : t.results(places.length)}</p>
      <ul className="list__items">
        {places.map((p) => (
          <li key={`${p.properties.kind}-${p.properties.id}`}>
            <button type="button" className={`list__item list__item--${p.properties.kind}`} onClick={() => onPick(p)}>
              <span className="chip__dot" aria-hidden="true" />
              <span className="list__name">{p.properties.naam}</span>
              <span className="list__town">{p.properties.plaats}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/DetailPanel.tsx`**

```tsx
import type { Lang, Strings } from '../lib/i18n';
import type { Place } from '../lib/types';

interface Props {
  place: Place;
  lang: Lang;
  t: Strings;
  onBack: () => void;
}

const routeUrl = ([lon, lat]: number[]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

export function DetailPanel({ place, lang, t, onBack }: Props) {
  const p = place.properties;
  const description = (lang === 'en' && p.omschrijving_en) || p.omschrijving;
  return (
    <article className="detail">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← {t.back}
      </button>
      <p className={`detail__kind detail__kind--${p.kind}`}>{p.kind === 'kastje' ? t.kastje : t.club}</p>
      <h2 className="detail__title">{p.naam}</h2>
      <p className="detail__town">
        {p.plaats}
        {p.adres ? ` · ${p.adres}` : ''}
      </p>
      {p.foto_url && <img className="detail__photo" src={p.foto_url} alt={p.naam} loading="lazy" />}
      {description && <p className="detail__text">{description}</p>}
      <div className="detail__actions">
        <a className="btn" href={routeUrl(place.geometry.coordinates)} target="_blank" rel="noopener noreferrer">
          {t.route}
        </a>
        {p.website && (
          <a className="btn btn--ghost" href={p.website} target="_blank" rel="noopener noreferrer">
            {t.website}
          </a>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Rewrite `src/App.tsx` to wire everything**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { DetailPanel } from './components/DetailPanel';
import { Header } from './components/Header';
import { LayerToggle } from './components/LayerToggle';
import { MapView } from './components/MapView';
import { SearchList } from './components/SearchList';
import { filterByQuery } from './lib/filter';
import { detectLang, readStoredLang, storeLang, strings, type Lang } from './lib/i18n';
import { loadPlaces } from './lib/load';
import type { Kind, Place, Visibility } from './lib/types';

interface Data {
  kastjes: Place[];
  clubs: Place[];
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => detectLang(readStoredLang(), navigator.language));
  const t = strings[lang];
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [visible, setVisible] = useState<Visibility>({ kastje: true, club: true });
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadPlaces(import.meta.env.BASE_URL)
      .then(setData)
      .catch((err: unknown) => {
        console.error(err);
        setLoadError(true);
      });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const listed = useMemo(() => {
    if (!data) return [];
    const all = [...(visible.kastje ? data.kastjes : []), ...(visible.club ? data.clubs : [])];
    return filterByQuery(all, query);
  }, [data, visible, query]);

  const changeLang = (l: Lang) => {
    setLang(l);
    storeLang(l);
  };
  const toggle = (kind: Kind) => setVisible((v) => ({ ...v, [kind]: !v[kind] }));
  const pick = (p: Place) => {
    setSelected(p);
    setSheetOpen(false);
  };

  const panelOpen = sheetOpen || selected !== null;

  return (
    <div className="app">
      <div className="topbar">
        <Header lang={lang} onLangChange={changeLang} t={t} />
        <LayerToggle visible={visible} onToggle={toggle} t={t} />
      </div>

      <aside className={`panel${panelOpen ? ' panel--open' : ''}`}>
        {loadError && <p className="notice" role="alert">{t.loadError}</p>}
        {mapError && <p className="notice" role="alert">{t.mapError}</p>}
        {!data && !loadError && <p className="notice">{t.loading}</p>}
        {selected ? (
          <DetailPanel place={selected} lang={lang} t={t} onBack={() => setSelected(null)} />
        ) : (
          <SearchList places={listed} query={query} onQueryChange={setQuery} onPick={pick} onClose={() => setSheetOpen(false)} t={t} />
        )}
      </aside>

      <main className="mapwrap">
        <MapView
          kastjes={data?.kastjes ?? []}
          clubs={data?.clubs ?? []}
          visible={visible}
          selected={selected}
          onSelect={setSelected}
          onError={() => setMapError(true)}
        />
      </main>

      {!panelOpen && (
        <button type="button" className="fab mobile-only" aria-label={t.search} onClick={() => setSheetOpen(true)}>
          🔍
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Replace `src/styles.css`**

```css
:root {
  --kastje: #e63946;
  --club: #1d3557;
  --bg: #ffffff;
  --fg: #1a1a1a;
  --muted: #666;
  --line: #e5e5e5;
  --radius: 10px;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  --panel-w: 360px;
  --topbar-h: auto;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--fg); background: var(--bg); }
h1, h2, p, ul { margin: 0; }
ul { padding: 0; list-style: none; }
button { font: inherit; cursor: pointer; }
a { color: inherit; }

/* Layout — desktop: sidebar (topbar + panel) left, map right */
.app {
  height: 100%;
  display: grid;
  grid-template-columns: var(--panel-w) 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'topbar map'
    'panel map';
}
.topbar { grid-area: topbar; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--bg); }
.panel { grid-area: panel; border-right: 1px solid var(--line); overflow: auto; background: var(--bg); display: flex; flex-direction: column; }
.mapwrap { grid-area: map; position: relative; min-height: 0; }
.map { position: absolute; inset: 0; }
.mobile-only { display: none; }

/* Header */
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding: 1rem 1rem 0.5rem; }
.header__title { font-size: 1.25rem; line-height: 1.2; }
.header__tagline { color: var(--muted); font-size: 0.85rem; margin-top: 0.2rem; }
.lang { display: flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; flex-shrink: 0; }
.lang__btn { border: 0; background: transparent; padding: 0.25rem 0.6rem; font-size: 0.8rem; color: var(--muted); }
.lang__btn[aria-pressed='true'] { background: var(--fg); color: var(--bg); }

/* Layer chips */
.chips { display: flex; gap: 0.5rem; padding: 0.5rem 1rem 0.75rem; }
.chip { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--line); border-radius: 999px; padding: 0.35rem 0.8rem; background: var(--bg); color: var(--muted); }
.chip[aria-pressed='true'] { color: var(--fg); border-color: currentColor; }
.chip__dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
.chip[aria-pressed='true'].chip--kastje .chip__dot, .list__item--kastje .chip__dot, .detail__kind--kastje { color: var(--kastje); }
.chip[aria-pressed='true'].chip--club .chip__dot, .list__item--club .chip__dot, .detail__kind--club { color: var(--club); }
.chip[aria-pressed='true'] .chip__dot, .list__item .chip__dot { background: currentColor; }

/* Search list */
.list { display: flex; flex-direction: column; min-height: 0; }
.list__search { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; }
.list__input { flex: 1; padding: 0.6rem 0.8rem; border: 1px solid var(--line); border-radius: var(--radius); font: inherit; }
.list__count { color: var(--muted); font-size: 0.8rem; padding: 0 1rem 0.5rem; }
.list__items { overflow: auto; }
.list__item { display: grid; grid-template-columns: auto 1fr; column-gap: 0.6rem; align-items: center; width: 100%; text-align: left; padding: 0.7rem 1rem; border: 0; border-top: 1px solid var(--line); background: transparent; }
.list__item:hover { background: #f5f5f5; }
.list__name { font-weight: 600; }
.list__town { grid-column: 2; color: var(--muted); font-size: 0.85rem; }

/* Detail */
.detail { padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.detail__kind { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.detail__title { font-size: 1.4rem; line-height: 1.2; }
.detail__town { color: var(--muted); }
.detail__photo { width: 100%; border-radius: var(--radius); margin-top: 0.5rem; }
.detail__text { margin-top: 0.5rem; line-height: 1.5; }
.detail__actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }

.btn { display: inline-block; padding: 0.55rem 0.9rem; border-radius: var(--radius); border: 1px solid var(--fg); background: var(--fg); color: var(--bg); text-decoration: none; }
.btn--ghost { background: transparent; color: var(--fg); border-color: var(--line); align-self: flex-start; }
.notice { padding: 0.75rem 1rem; color: var(--muted); }
.notice[role='alert'] { color: var(--kastje); }

/* Mobile: topbar on top, map fills, panel is a bottom sheet */
@media (max-width: 767px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'topbar'
      'map';
  }
  .topbar { border-right: 0; }
  .mobile-only { display: inline-flex; }
  .panel {
    position: fixed; left: 0; right: 0; bottom: 0; height: 60vh;
    border-right: 0; border-radius: var(--radius) var(--radius) 0 0; box-shadow: var(--shadow);
    transform: translateY(100%); transition: transform 0.2s ease-out; z-index: 10;
  }
  .panel--open { transform: translateY(0); }
  .fab {
    position: fixed; right: 1rem; bottom: 1.5rem; width: 3.25rem; height: 3.25rem; border-radius: 50%;
    border: 0; background: var(--fg); color: var(--bg); font-size: 1.3rem; box-shadow: var(--shadow); z-index: 10;
    align-items: center; justify-content: center;
  }
}
```

- [ ] **Step 7: Type-check, build, manual verify desktop and mobile**

Run: `npm run build && npm run preview`
Desktop (`http://localhost:4173/leenfrisbee/`): sidebar left with title, NL/EN toggle, two chips, search box, list of 3 items; typing "grift" leaves 1; clicking it flies the map and shows the detail panel with "Griftpark", Route link, ← Terug; toggling "Clubs" chip hides the blue dot and removes the club from the list; switching EN changes labels and reloading keeps EN.
Mobile (DevTools device toolbar, e.g. iPhone width): topbar on top, map full, search FAB bottom-right; tapping it slides up the list sheet; picking an item closes the list and shows the detail sheet; ← Terug dismisses. Stop the preview server.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add header, layer toggle, search list, detail panel and responsive layout"
```

---

### Task 8: Playwright end-to-end smoke test

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `window.__map` (Task 6), accessible roles/names from Task 7, `npm run preview` on port 4173.

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = '/leenfrisbee/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}${BASE}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Write `e2e/smoke.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test';

const layerVisibility = (page: Page, layer: string) =>
  page.evaluate((l) => window.__map?.getLayoutProperty(l, 'visibility') ?? 'visible', layer);

const openList = async (page: Page, isMobile: boolean) => {
  if (isMobile) await page.getByRole('button', { name: /Zoek|Search/ }).click();
};

test('loads the map and lists locations', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('search narrows the list and picking an item opens its details', async ({ page, isMobile }) => {
  await page.goto('./');
  await openList(page, isMobile);
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await page.getByRole('searchbox').fill('grift');
  await expect(items).toHaveCount(1);
  await items.first().getByRole('button').click();
  await expect(page.getByRole('heading', { level: 2, name: 'Griftpark' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Route|Directions/ })).toHaveAttribute('href', /google\.com\/maps/);
  await page.getByRole('button', { name: /Terug|Back/ }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
});

test('layer chips toggle map layers and list contents', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await page.waitForFunction(() => window.__map?.getLayer('club') !== undefined);
  expect(await layerVisibility(page, 'club')).toBe('visible');
  await page.getByRole('button', { name: /^(Clubs)$/ }).click();
  await expect.poll(() => layerVisibility(page, 'club')).toBe('none');
  await openList(page, isMobile);
  await expect(page.getByRole('listitem')).toHaveCount(2);
});

test('language toggle switches ui strings and persists', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee cabinets');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee cabinets');
});
```

Add to `src/components/MapView.tsx`'s `declare global` nothing new — `window.__map` is already declared there; for the e2e file to type-check, add `e2e/global.d.ts`:
```ts
import type { Map } from 'maplibre-gl';
declare global {
  interface Window {
    __map?: Map;
  }
}
export {};
```
and add `"e2e"` to `tsconfig.node.json` `include`.

- [ ] **Step 3: Install browsers and run**

Run: `npx playwright install chromium && npm run build && npm run test:e2e`
Expected: 8 tests pass (4 tests × 2 projects). If the mobile project fails on the first test because the FAB covers the heading, that's a real layout bug — fix CSS, not the test. If `toHaveCount(3)` fails, confirm the example CSV rows from Task 3 are unchanged.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e tsconfig.node.json
git commit -m "test: add playwright smoke tests for map, search, layers and language"
```

---

### Task 9: GitHub Actions deploy to Pages and README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Rewrite `README.md`**

```markdown
# leenfrisbee

Map of *leenfrisbee kastjes* (frisbee lending cabinets) and frisbee clubs in the Netherlands.
Live site: https://lkleuver.github.io/leenfrisbee/

## Editing locations

All locations live in `data/kastjes.csv` and `data/clubs.csv`. See [`data/README.md`](data/README.md) (Dutch) for how to edit them. Every push to `main` validates the data, rebuilds and deploys the site.

## Development

```bash
npm install
npm run dev        # validates data, starts Vite at http://localhost:5173/leenfrisbee/
npm test           # unit tests (vitest)
npm run build      # validates data, type-checks, builds to dist/
npm run test:e2e   # playwright smoke tests against the built site
```

Stack: Vite, React, TypeScript, maplibre-gl with the PDOK BRT Achtergrondkaart basemap. Design notes in `docs/superpowers/specs/`.
```

- [ ] **Step 3: Enable Pages and push**

On github.com → repo Settings → Pages → Source: **GitHub Actions** (one-time manual step; tell the user if you cannot do it).

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: deploy to github pages on push to main"
git push origin main
```

- [ ] **Step 4: Verify**

Run: `gh run watch` (or check the Actions tab). Expected: build job green (unit + e2e tests pass), deploy job green, site reachable at `https://lkleuver.github.io/leenfrisbee/` showing the map with three example points.

---

## Self-review notes

- Spec coverage: data files + README (T3), build script + validation rules + Dutch errors + pre-hooks (T2/T3), app structure/state (T6/T7), map with PDOK style, controls, highlight, flyTo, visibility (T6), layout desktop/mobile (T7), detail content incl. Route link and EN fallback (T7), i18n with detection/persist (T4), error handling for fetch/map (T6/T7), deploy workflow with tests (T9), vitest + Playwright (T2/T4/T5/T8).
- The spec's "Playwright runs against `vite preview`" is satisfied by `webServer` in T8 and the CI step order in T9.
- Types/names used consistently: `Place`, `Kind`, `KINDS`, `Visibility`, `Strings`, `Lang`, `filterByQuery`, `loadPlaces`, `MapView`, layer ids `kastje`/`club`/`*-selected`, `window.__map`.

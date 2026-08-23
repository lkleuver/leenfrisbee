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

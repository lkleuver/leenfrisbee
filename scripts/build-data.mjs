import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { CLUBS_SCHEMA, KASTJES_SCHEMA, csvToGeoJson, validateClubRefs } from './lib/csv-to-geojson.mjs';

const OUT_DIR = 'public/data';
const FILES = [
  { csv: 'data/kastjes.csv', out: `${OUT_DIR}/kastjes.geojson`, schema: KASTJES_SCHEMA },
  { csv: 'data/clubs.csv', out: `${OUT_DIR}/clubs.geojson`, schema: CLUBS_SCHEMA },
];

mkdirSync(OUT_DIR, { recursive: true });

const readCsv = (path) => {
  try {
    return { text: readFileSync(path, 'utf8') };
  } catch (err) {
    return { error: `${path}: bestand kon niet gelezen worden (${err.code ?? err.message})` };
  }
};

const converted = FILES.map(({ csv, out, schema }) => {
  const { text, error } = readCsv(csv);
  if (error) return { csv, out, geojson: null, errors: [error] };
  const { geojson, errors } = csvToGeoJson(text, schema, basename(csv));
  return { csv, out, geojson, errors };
});

const [kastjes, clubs] = converted;
// Cross-file check: a kastje club_id must point at an existing club. Skip when clubs.csv
// itself is broken — that error is already reported and would only cause noise here.
const crossErrors =
  kastjes.errors.length === 0 && clubs.errors.length === 0
    ? validateClubRefs(kastjes.geojson, clubs.geojson)
    : [];

const allErrors = [...converted.flatMap((c) => c.errors), ...crossErrors];

if (allErrors.length === 0) {
  converted.forEach(({ csv, out, geojson }) => {
    writeFileSync(out, JSON.stringify(geojson));
    console.log(`${csv} → ${out} (${geojson.features.length} punten)`);
  });
} else {
  console.error('\nFouten in de data (site is NIET bijgewerkt):\n' + allErrors.map((e) => `  - ${e}`).join('\n'));
  console.error('\nZie data/README.md voor uitleg over de kolommen.');
  process.exit(1);
}

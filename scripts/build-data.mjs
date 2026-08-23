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

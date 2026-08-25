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
    .filter((col) => row[col] && !/^https?:\/\//i.test(row[col]))
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
  const parsed = Papa.parse(csvText.replace(/^﻿/, '').trim(), {
    header: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  });

  const parseErrors = parsed.errors
    .filter((e) => e.type !== 'FieldMismatch' && e.type !== 'Delimiter')
    .map((e) => {
      const row = (e.row ?? 0) + 2;
      if (e.type === 'Quotes') {
        return `${fileName} rij ${row} (?): aanhalingstekens (") kloppen niet`;
      }
      return `${fileName} rij ${row} (?): regel kon niet gelezen worden (${e.code})`;
    });

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

/** Check that every kastje club_id refers to an existing club. Returns Dutch error messages. */
export function validateClubRefs(kastjesGeojson, clubsGeojson) {
  const clubIds = new Set(clubsGeojson.features.map((f) => f.properties.id));
  return kastjesGeojson.features
    .filter((f) => f.properties.club_id && !clubIds.has(f.properties.club_id))
    .map((f) => `kastjes.csv (${f.properties.naam}): club_id "${f.properties.club_id}" bestaat niet in clubs.csv`);
}

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
    const text = '﻿' + csv(row()).replaceAll(',', ';');
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

  it('reports unbalanced quotes with Dutch message', () => {
    const text = 'id,naam,plaats,adres,lat,lon,omschrijving,omschrijving_en,foto_url,website,status\n1,"Grift';
    const { errors } = csvToGeoJson(text, KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors.some((e) => e.match(/kastjes\.csv rij 3 \(\?\): aanhalingstekens \("\) kloppen niet/))).toBe(true);
  });

  it('omits ragged row parse errors and shows only Dutch validation errors', () => {
    const text = 'id,naam,plaats,adres,lat,lon,omschrijving,omschrijving_en,foto_url,website,status\nutrech,Name,Place,Addr,52.1,5.1,Desc,Desc_en,http://photo.jpg,http://web';
    const { errors } = csvToGeoJson(text, KASTJES_SCHEMA, 'kastjes.csv');
    expect(errors).toEqual(['kastjes.csv rij 2 (Name): status ontbreekt']);
  });
});

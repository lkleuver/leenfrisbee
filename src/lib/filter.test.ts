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

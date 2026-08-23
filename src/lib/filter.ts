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

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

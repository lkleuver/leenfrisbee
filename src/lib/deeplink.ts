import type { Kind, Place } from './types';

export function parseDeeplink(hash: string): { kind: Kind; id: string } | null {
  const m = /^#(kastje|club)\/(.+)$/.exec(decodeURIComponent(hash));
  return m ? { kind: m[1] as Kind, id: m[2] } : null;
}

export function formatDeeplink(place: Place | null): string {
  return place ? `#${place.properties.kind}/${place.properties.id}` : '';
}

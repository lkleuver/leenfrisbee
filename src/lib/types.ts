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
  club_id?: string;
}

export type Place = Feature<Point, PlaceProps>;

export interface Visibility {
  kastje: boolean;
  club: boolean;
}

export type Lang = 'nl' | 'en';

export const STORAGE_KEY = 'leenfrisbee.lang';

const nl = {
  title: 'Leenfrisbee kastjes',
  tagline: 'Leen een frisbee, gooi, en leg hem terug.',
  kastjes: 'Kastjes',
  clubs: 'Clubs',
  kastje: 'Leenfrisbee kastje',
  club: 'Frisbeeclub',
  search: 'Zoek op naam of plaats',
  results: (n: number) => (n === 1 ? '1 locatie' : `${n} locaties`),
  noResults: 'Geen locaties gevonden',
  back: 'Terug',
  close: 'Sluiten',
  website: 'Website',
  route: 'Route',
  loading: 'Laden…',
  loadError: 'De locaties konden niet geladen worden. Probeer het later opnieuw.',
  mapError: 'De kaart kon niet geladen worden.',
  language: 'Taal',
};

export type Strings = typeof nl;

const en: Strings = {
  title: 'Leenfrisbee cabinets',
  tagline: 'Borrow a frisbee, throw, and put it back.',
  kastjes: 'Cabinets',
  clubs: 'Clubs',
  kastje: 'Frisbee lending cabinet',
  club: 'Frisbee club',
  search: 'Search by name or town',
  results: (n: number) => (n === 1 ? '1 location' : `${n} locations`),
  noResults: 'No locations found',
  back: 'Back',
  close: 'Close',
  website: 'Website',
  route: 'Directions',
  loading: 'Loading…',
  loadError: 'The locations could not be loaded. Please try again later.',
  mapError: 'The map could not be loaded.',
  language: 'Language',
};

export const strings: Record<Lang, Strings> = { nl, en };

const isLang = (v: unknown): v is Lang => v === 'nl' || v === 'en';

export function detectLang(stored: string | null, navigatorLang: string): Lang {
  if (isLang(stored)) return stored;
  return navigatorLang.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function readStoredLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage unavailable (private mode etc.) — language just won't persist
  }
}

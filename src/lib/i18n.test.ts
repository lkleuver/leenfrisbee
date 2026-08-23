import { describe, it, expect } from 'vitest';
import { detectLang, strings } from './i18n';

describe('detectLang', () => {
  it('prefers a valid stored value', () => {
    expect(detectLang('en', 'nl-NL')).toBe('en');
    expect(detectLang('nl', 'en-US')).toBe('nl');
  });
  it('ignores an invalid stored value', () => {
    expect(detectLang('fr', 'nl-NL')).toBe('nl');
  });
  it('falls back to navigator language: nl* → nl, anything else → en', () => {
    expect(detectLang(null, 'nl')).toBe('nl');
    expect(detectLang(null, 'NL-be')).toBe('nl');
    expect(detectLang(null, 'de-DE')).toBe('en');
    expect(detectLang(null, '')).toBe('en');
  });
});

describe('strings', () => {
  it('has the same keys in nl and en', () => {
    expect(Object.keys(strings.en).sort()).toEqual(Object.keys(strings.nl).sort());
  });
});

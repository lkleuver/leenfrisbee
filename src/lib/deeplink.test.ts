import { describe, expect, it } from 'vitest';
import { formatDeeplink, parseDeeplink } from './deeplink';
import type { Place } from './types';

const place = {
  properties: { kind: 'kastje', id: 'woerden-westdampark' },
} as Place;

describe('parseDeeplink', () => {
  it('parses a kastje link', () => {
    expect(parseDeeplink('#kastje/woerden-westdampark')).toEqual({
      kind: 'kastje',
      id: 'woerden-westdampark',
    });
  });

  it('parses a club link', () => {
    expect(parseDeeplink('#club/ufo-utrecht')).toEqual({ kind: 'club', id: 'ufo-utrecht' });
  });

  it('rejects unknown kinds and empty hashes', () => {
    expect(parseDeeplink('')).toBeNull();
    expect(parseDeeplink('#foo/bar')).toBeNull();
    expect(parseDeeplink('#kastje/')).toBeNull();
  });
});

describe('formatDeeplink', () => {
  it('round-trips with parse', () => {
    expect(parseDeeplink(formatDeeplink(place))).toEqual({
      kind: 'kastje',
      id: 'woerden-westdampark',
    });
  });

  it('returns empty for null', () => {
    expect(formatDeeplink(null)).toBe('');
  });
});

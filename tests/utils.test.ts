import { describe, it, expect } from 'vitest';
import { slugify, formatArs, formatSats, shortNpub, timeAgo } from '../src/lib/utils';

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Panadería del Barrio')).toBe('panaderia-del-barrio');
  });

  it('strips accents', () => {
    expect(slugify('Café Niño Año')).toBe('cafe-nino-ano');
  });

  it('removes leading and trailing dashes', () => {
    expect(slugify('  ¡hola!  ')).toBe('hola');
  });

  it('caps at 40 chars', () => {
    const s = slugify('a'.repeat(100));
    expect(s.length).toBeLessThanOrEqual(40);
  });

  it('collapses multiple separators', () => {
    expect(slugify('mucho   espacio &&&  raro')).toBe('mucho-espacio-raro');
  });
});

describe('formatArs', () => {
  it('formats in argentine pesos without decimals', () => {
    const formatted = formatArs(5000);
    expect(formatted).toContain('5.000');
    expect(formatted).toContain('$');
  });

  it('handles zero', () => {
    expect(formatArs(0)).toContain('0');
  });

  it('handles big numbers', () => {
    expect(formatArs(1_500_000)).toContain('1.500.000');
  });
});

describe('formatSats', () => {
  it('formats with separator and label', () => {
    expect(formatSats(12345)).toBe('12.345 sats');
  });
});

describe('shortNpub', () => {
  it('truncates long npubs', () => {
    const n = 'npub1' + 'a'.repeat(60);
    const s = shortNpub(n);
    expect(s).toContain('…');
    expect(s.length).toBeLessThan(n.length);
  });

  it('leaves short strings alone', () => {
    expect(shortNpub('short')).toBe('short');
  });
});

describe('timeAgo', () => {
  it('says "hace un momento" for recent', () => {
    expect(timeAgo(new Date(Date.now() - 30_000))).toBe('hace un momento');
  });

  it('says minutes for minutes', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60_000))).toContain('5 min');
  });

  it('says hours for hours', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 60 * 60_000))).toContain('3 h');
  });

  it('says days for days', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 24 * 60 * 60_000))).toContain('2 día');
  });
});

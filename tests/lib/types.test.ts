import { describe, expect, it } from 'vitest';
import { SINGLE_SOURCES, SOURCES } from '../../src/lib/types';

describe('types', () => {
  it('kaynaklar sabit üç değerdir, tek kayıt Deneme içermez', () => {
    expect(SOURCES).toEqual(['Deneme', 'Ödev', 'Kendi Çözdüğü']);
    expect(SINGLE_SOURCES).toEqual(['Ödev', 'Kendi Çözdüğü']);
  });
  it('testler UTC-8 saat diliminde koşar', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(480);
  });
});

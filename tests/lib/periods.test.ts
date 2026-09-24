import { describe, expect, it } from 'vitest';
import {
  dayBefore, defaultRange, formatDateTr, periodLabel, periodStart, periodsBetween, shiftPeriod,
} from '../../src/lib/periods';

describe('periodStart (UTC-8 altında da gün kaymaz)', () => {
  it('hafta pazartesi başlar', () => {
    expect(periodStart('2026-09-24', 'week')).toBe('2026-09-21'); // perşembe
    expect(periodStart('2026-09-27', 'week')).toBe('2026-09-21'); // pazar
    expect(periodStart('2026-09-28', 'week')).toBe('2026-09-28'); // pazartesi
  });
  it('yıl sınırını aşan hafta', () => {
    expect(periodStart('2027-01-01', 'week')).toBe('2026-12-28');
  });
  it('ay', () => {
    expect(periodStart('2026-12-15', 'month')).toBe('2026-12-01');
    expect(periodStart('2026-12-01', 'month')).toBe('2026-12-01');
  });
});

describe('kaydırma ve aralıklar', () => {
  it('shiftPeriod ay ve yıl sınırı', () => {
    expect(shiftPeriod('2026-12-01', 'month', 1)).toBe('2027-01-01');
    expect(shiftPeriod('2026-09-21', 'week', -1)).toBe('2026-09-14');
  });
  it('dayBefore', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
  });
  it('periodsBetween kapsayıcıdır', () => {
    expect(periodsBetween('2026-09-24', '2026-10-06', 'week')).toEqual(['2026-09-21', '2026-09-28', '2026-10-05']);
    expect(periodsBetween('2026-11-30', '2027-01-02', 'month')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });
  it('from > to ise boş', () => {
    expect(periodsBetween('2026-10-01', '2026-09-01', 'week')).toEqual([]);
  });
  it('defaultRange son 12 dönemi kapsar', () => {
    expect(defaultRange('2026-09-24', 'week')).toEqual({ from: '2026-07-06', to: '2026-09-24' });
    expect(defaultRange('2026-09-24', 'month')).toEqual({ from: '2025-10-01', to: '2026-09-24' });
    expect(periodsBetween('2026-07-06', '2026-09-24', 'week')).toHaveLength(12);
  });
});

describe('Türkçe etiketler', () => {
  it('hafta ve ay', () => {
    expect(periodLabel('2026-09-21', 'week')).toBe('21 Eyl');
    expect(periodLabel('2026-09-01', 'month')).toBe('Eyl 2026');
    expect(formatDateTr('2026-08-03')).toBe('3 Ağu 2026');
  });
});

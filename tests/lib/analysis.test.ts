import { describe, expect, it } from 'vitest';
import {
  compareByKey, examSummaries, filterRecords, inRange, lastTwoPeriods, seriesByPeriod, summarize, trendOf,
} from '../../src/lib/analysis';
import type { Exam } from '../../src/lib/types';
import { rec } from '../fixtures/records';

const all = { sinif: 'all', dersler: [], kaynak: 'all' } as const;

describe('filterRecords', () => {
  const rows = [
    rec({ sinif: 7, ders: 'Matematik', kaynak: 'Ödev' }),
    rec({ sinif: 8, ders: 'Fen Bilimleri', kaynak: 'Kendi Çözdüğü' }),
    rec({ sinif: 8, ders: 'Matematik', kaynak: 'Deneme' }),
  ];
  it('boş ders listesi tüm dersler demektir', () => {
    expect(filterRecords(rows, { ...all })).toHaveLength(3);
  });
  it('sınıf, ders ve kaynak birlikte uygulanır', () => {
    expect(filterRecords(rows, { sinif: 8, dersler: ['Matematik'], kaynak: 'Deneme' })).toEqual([rows[2]]);
  });
  it('inRange kapsayıcıdır', () => {
    expect(inRange({ tarih: '2026-09-01' }, { from: '2026-09-01', to: '2026-09-30' })).toBe(true);
    expect(inRange({ tarih: '2026-10-01' }, { from: '2026-09-01', to: '2026-09-30' })).toBe(false);
  });
});

describe('trendOf', () => {
  it('±2 eşiği', () => {
    expect(trendOf(2)).toBe('up');
    expect(trendOf(1.99)).toBe('flat');
    expect(trendOf(-2)).toBe('down');
    expect(trendOf(null)).toBe('none');
  });
  it('kayan nokta hatası eşiği bozmaz', () => {
    expect(trendOf((0.3 - 0.1) * 10)).toBe('up'); // 1.9999999999999998
  });
});

describe('seriesByPeriod', () => {
  it('boş dönemleri de içerir', () => {
    const rows = [rec({ tarih: '2026-09-14', dogru: 8, bos: 2 }), rec({ tarih: '2026-09-24', dogru: 4, yanlis: 4, bos: 2 })];
    expect(seriesByPeriod(rows, '2026-09-07', '2026-09-24', 'week')).toEqual([
      { start: '2026-09-07', label: '7 Eyl', net: 0, oran: null, soru: 0 },
      { start: '2026-09-14', label: '14 Eyl', net: 8, oran: 80, soru: 10 },
      { start: '2026-09-21', label: '21 Eyl', net: 3, oran: 30, soru: 10 },
    ]);
  });
});

describe('summarize / compareByKey', () => {
  const rows = [
    rec({ tarih: '2026-09-22', ders: 'Matematik', dogru: 9, bos: 1 }), // bu hafta %90
    rec({ tarih: '2026-09-15', ders: 'Matematik', dogru: 5, bos: 5 }), // geçen hafta %50
    rec({ tarih: '2026-09-16', ders: 'Fen Bilimleri', dogru: 7, bos: 3 }), // yalnız geçen hafta
    rec({ tarih: '2026-08-01', ders: 'Matematik', dogru: 10, bos: 0 }), // aralık dışı
  ];

  it('lastTwoPeriods', () => {
    expect(lastTwoPeriods('2026-09-24', 'week')).toEqual({
      cur: { from: '2026-09-21', to: '2026-09-24' },
      prev: { from: '2026-09-14', to: '2026-09-20' },
    });
  });

  it('bu dönemi önceki dönemle net oranı üzerinden karşılaştırır', () => {
    const s = summarize(rows, { from: '2026-09-01', to: '2026-09-24' }, 'week');
    expect(s.total.soru).toBe(30);
    expect(s.cur.oran).toBe(90);
    expect(s.prev.oran).toBe(60); // (5+7)/20
    expect(s.delta).toBe(30);
    expect(s.trend).toBe('up');
  });

  it('ders bazında karşılaştırma; bir dönemde verisi olmayan ders none', () => {
    expect(compareByKey(rows, '2026-09-24', 'week', (r) => r.ders)).toEqual([
      { key: 'Fen Bilimleri', prev: 70, cur: null, delta: null, trend: 'none', prevSoru: 10, curSoru: 0 },
      { key: 'Matematik', prev: 50, cur: 90, delta: 40, trend: 'up', prevSoru: 10, curSoru: 10 },
    ]);
  });
});

describe('examSummaries', () => {
  const exams: Exam[] = [
    { deneme_id: 'd1', ad: 'Deneme 1', tarih: '2026-09-10', sinif: 8 },
    { deneme_id: 'd2', ad: 'Deneme 2', tarih: '2026-09-20', sinif: 8 },
    { deneme_id: 'd0', ad: 'Eski', tarih: '2026-06-01', sinif: 8 },
  ];
  const rows = [
    rec({ deneme_id: 'd2', kaynak: 'Deneme', tarih: '2026-09-20', ders: 'Türkçe', soru: 20, dogru: 16, yanlis: 4, bos: 0 }),
    rec({ deneme_id: 'd2', kaynak: 'Deneme', tarih: '2026-09-20', ders: 'Matematik', soru: 20, dogru: 10, yanlis: 0, bos: 10 }),
    rec({ deneme_id: 'd1', kaynak: 'Deneme', tarih: '2026-09-10', ders: 'Matematik', soru: 20, dogru: 8, yanlis: 0, bos: 12 }),
    rec({ deneme_id: 'd0', kaynak: 'Deneme', tarih: '2026-06-01', ders: 'Matematik', soru: 20, dogru: 5, yanlis: 0, bos: 15 }),
  ];

  it('toplam deneme netini ders kırılımıyla, tarihe göre artan verir', () => {
    const s = examSummaries(exams, rows, { sinif: 'all', dersler: [], from: '2026-09-01', to: '2026-09-24' });
    expect(s.map((x) => x.exam.ad)).toEqual(['Deneme 1', 'Deneme 2']);
    expect(s[1].net).toBe(25);
    expect(s[1].byDers).toEqual([
      { ders: 'Türkçe', net: 15, soru: 20 },
      { ders: 'Matematik', net: 10, soru: 20 },
    ]);
  });
  it('ders filtresi kırılımı ve toplamı daraltır', () => {
    const s = examSummaries(exams, rows, { sinif: 8, dersler: ['Türkçe'], from: '2026-09-01', to: '2026-09-24' });
    expect(s).toHaveLength(1);
    expect(s[0].net).toBe(15);
  });
});

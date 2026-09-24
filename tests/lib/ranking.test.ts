import { describe, expect, it } from 'vitest';
import type { ExamSummary } from '../../src/lib/analysis';
import { movers, rankExams, rankSubjects, rankTopics } from '../../src/lib/ranking';
import { rec } from '../fixtures/records';

describe('rankSubjects', () => {
  const rows = [
    rec({ ders: 'Fen Bilimleri', dogru: 5, bos: 5 }), // %50
    rec({ ders: 'Matematik', dogru: 9, bos: 1 }), // %90
    rec({ ders: 'Türkçe', soru: 20, dogru: 10, bos: 10 }), // %50, daha çok soru
  ];
  it('en iyiden en kötüye; eşitlikte çok soru önce', () => {
    expect(rankSubjects(rows, 'best').map((r) => r.label)).toEqual(['Matematik', 'Türkçe', 'Fen Bilimleri']);
  });
  it('en kötüden en iyiye', () => {
    expect(rankSubjects(rows, 'worst').map((r) => r.label)).toEqual(['Türkçe', 'Fen Bilimleri', 'Matematik']);
  });
  it('sınıflar birleşir (ders adına göre)', () => {
    const r = rankSubjects([rec({ sinif: 7 }), rec({ sinif: 8 })], 'best');
    expect(r).toHaveLength(1);
    expect(r[0].totals.soru).toBe(20);
  });
});

describe('rankTopics', () => {
  const rows = [
    rec({ konu: 'Kümeler', soru: 12, dogru: 6, bos: 6 }),
    rec({ konu: 'Üslü İfadeler', soru: 5, dogru: 5, bos: 0 }),
    rec({ konu: '', soru: 30, dogru: 30, bos: 0 }),
    rec({ sinif: 7, konu: 'Veri Analizi', soru: 10, dogru: 9, bos: 1 }),
    rec({ sinif: 8, konu: 'Veri Analizi', soru: 10, dogru: 2, bos: 8 }),
  ];
  it('eşik altı ve konusuz kayıtlar hariç; aynı konu farklı sınıfta ayrı', () => {
    const r = rankTopics(rows, 'best', 10);
    expect(r.map((x) => `${x.label}|${x.detail}`)).toEqual([
      'Veri Analizi|7. sınıf · Matematik',
      'Kümeler|8. sınıf · Matematik',
      'Veri Analizi|8. sınıf · Matematik',
    ]);
  });
  it('eşik 0 ise tümü', () => {
    expect(rankTopics(rows, 'best', 0)).toHaveLength(4);
  });
});

describe('rankExams', () => {
  const mk = (ad: string, net: number): ExamSummary => ({
    exam: { deneme_id: ad, ad, tarih: '2026-09-01', sinif: 8 }, byDers: [], net, soru: 90, oran: (net / 90) * 100,
  });
  it('toplam nete göre', () => {
    const list = [mk('A', 40), mk('B', 60.5), mk('C', 20)];
    expect(rankExams(list, 'best').map((e) => e.exam.ad)).toEqual(['B', 'A', 'C']);
    expect(rankExams(list, 'worst').map((e) => e.exam.ad)).toEqual(['C', 'A', 'B']);
  });
});

describe('movers', () => {
  const rows = [
    rec({ tarih: '2026-09-22', ders: 'Matematik', dogru: 9, bos: 1 }),
    rec({ tarih: '2026-09-15', ders: 'Matematik', dogru: 5, bos: 5 }), // +40
    rec({ tarih: '2026-09-22', ders: 'Türkçe', dogru: 6, bos: 4 }),
    rec({ tarih: '2026-09-15', ders: 'Türkçe', dogru: 5, bos: 5 }), // +10
    rec({ tarih: '2026-09-22', ders: 'Fen Bilimleri', dogru: 2, bos: 8 }),
    rec({ tarih: '2026-09-15', ders: 'Fen Bilimleri', dogru: 8, bos: 2 }), // -60
    rec({ tarih: '2026-09-22', ders: 'İngilizce', dogru: 10, bos: 0 }), // yalnız bu hafta
  ];
  it('gelişenler azalan farkla, yalnız iki dönemde de verisi olanlar', () => {
    expect(movers(rows, '2026-09-24', 'week', 'ders', 'up').map((m) => [m.label, m.delta])).toEqual([
      ['Matematik', 40],
      ['Türkçe', 10],
    ]);
  });
  it('gerileyenler', () => {
    expect(movers(rows, '2026-09-24', 'week', 'ders', 'down').map((m) => [m.label, m.delta])).toEqual([['Fen Bilimleri', -60]]);
  });
  it('konu bazında konusuz kayıtlar hariç', () => {
    expect(movers(rows, '2026-09-24', 'week', 'konu', 'up')).toEqual([]);
  });
});

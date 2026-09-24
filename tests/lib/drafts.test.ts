import { describe, expect, it } from 'vitest';
import {
  EMPTY_COUNTS, autoBlank, draftCounts, examRowsFromDrafts, isRowEmpty, parseCount, remapRowErrors,
  type ExamRowDraft,
} from '../../src/lib/drafts';

describe('autoBlank', () => {
  it('boş = soru − doğru − yanlış', () => {
    expect(autoBlank('25', '16', '4')).toBe('5');
  });
  it('doğru/yanlış boşsa 0 sayılır', () => {
    expect(autoBlank('10', '', '')).toBe('10');
  });
  it('soru girilmemişse boş döner', () => {
    expect(autoBlank('', '1', '1')).toBe('');
  });
  it('doğru+yanlış soruyu aşarsa 0 (toplam hatası doğrulamada çıkar)', () => {
    expect(autoBlank('10', '8', '5')).toBe('0');
  });
});

describe('draftCounts', () => {
  it('otomatik boş kullanır', () => {
    expect(draftCounts({ ...EMPTY_COUNTS, soru: '25', dogru: '16', yanlis: '4' })).toEqual({ soru: 25, dogru: 16, yanlis: 4, bos: 5 });
  });
  it('elle girilen boşu kullanır', () => {
    expect(draftCounts({ soru: '25', dogru: '16', yanlis: '4', bos: '4', bosManual: true }).bos).toBe(4);
  });
  it('soru boşsa NaN', () => {
    expect(parseCount('')).toBeNaN();
    expect(draftCounts(EMPTY_COUNTS).soru).toBeNaN();
  });
});

describe('deneme satırları', () => {
  const row = (ders: string, dogru: string, yanlis: string): ExamRowDraft => ({ ders, soru: '20', dogru, yanlis, bos: '', bosManual: false });

  it('D ve Y boş satırlar atlanır, indeksler korunur', () => {
    const drafts = [row('Türkçe', '15', '4'), row('Matematik', '', ''), row('Fen Bilimleri', '10', '')];
    expect(isRowEmpty(drafts[1])).toBe(true);
    expect(examRowsFromDrafts(drafts)).toEqual({
      rows: [
        { ders: 'Türkçe', soru: 20, dogru: 15, yanlis: 4, bos: 1 },
        { ders: 'Fen Bilimleri', soru: 20, dogru: 10, yanlis: 0, bos: 10 },
      ],
      index: [0, 2],
    });
  });
  it('remapRowErrors satır hatalarını taslak indeksine taşır', () => {
    expect(remapRowErrors({ 'satirlar.1.toplam': 'x', ad: 'y' }, [0, 2])).toEqual({ 'satirlar.2.toplam': 'x', ad: 'y' });
  });
});

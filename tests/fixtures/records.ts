import type { RecordRow } from '../../src/lib/types';

let seq = 0;

export function rec(p: Partial<RecordRow> = {}): RecordRow {
  seq += 1;
  return {
    id: `r${seq}`, tarih: '2026-09-24', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: '',
    soru: 10, dogru: 5, yanlis: 0, bos: 5, deneme_id: '', giren_kullanici: 'demo',
    olusturma_zamani: '2026-09-24T10:00:00.000Z', ...p,
  };
}

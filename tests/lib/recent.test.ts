import { describe, expect, it } from 'vitest';
import { recentItems } from '../../src/lib/recent';
import { rec } from '../fixtures/records';

describe('recentItems', () => {
  it('deneme satırlarını tek öğede toplar, tarihe sonra oluşturma zamanına göre azalan sıralar', () => {
    const rows = [
      rec({ id: 'a', tarih: '2026-09-20', olusturma_zamani: '2026-09-20T10:00:00Z' }),
      rec({ id: 'b', tarih: '2026-09-22', deneme_id: 'd1', kaynak: 'Deneme', olusturma_zamani: '2026-09-22T09:00:00Z' }),
      rec({ id: 'c', tarih: '2026-09-22', deneme_id: 'd1', kaynak: 'Deneme', olusturma_zamani: '2026-09-22T09:00:00Z' }),
      rec({ id: 'd', tarih: '2026-09-22', olusturma_zamani: '2026-09-22T12:00:00Z' }),
    ];
    const items = recentItems(rows, [{ deneme_id: 'd1', ad: 'Deneme 1', tarih: '2026-09-22', sinif: 8 }]);
    expect(items.map((i) => i.key)).toEqual(['d', 'd1', 'a']);
    const exam = items[1];
    expect(exam.kind === 'exam' && exam.rows.length).toBe(2);
  });
  it('limit uygular', () => {
    const rows = Array.from({ length: 15 }, (_, i) => rec({ id: `x${i}` }));
    expect(recentItems(rows, [], 10)).toHaveLength(10);
  });
});

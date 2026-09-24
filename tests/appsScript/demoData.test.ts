import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const TODAY = '2026-09-24';

function loadGs(globals: Record<string, unknown> = {}) {
  const ctx = vm.createContext({ ...globals });
  for (const f of ['apps-script/Seed.gs', 'apps-script/Code.gs', 'apps-script/DemoData.gs']) {
    vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  return ctx as Record<string, any>;
}

interface Row {
  id: string; tarih: string; sinif: number; ders: string; kaynak: string; konu: string;
  soru: number; dogru: number; yanlis: number; bos: number; deneme_id: string; giren_kullanici: string;
}
interface Exam { deneme_id: string; ad: string; tarih: string; sinif: number }

function build(seed = 42) {
  const gs = loadGs();
  let n = 0;
  const data = gs.buildDemoData_(gs.seedSubjects_(), gs.seedTopics_(), TODAY, seed, () => `demo-id-${++n}`);
  return { gs, kayitlar: data.kayitlar as Row[], denemeler: data.denemeler as Exam[] };
}

describe('demo veri üreteci', () => {
  const { gs, kayitlar, denemeler } = build();
  const singles = kayitlar.filter((r) => r.kaynak !== 'Deneme');
  const examRows = kayitlar.filter((r) => r.kaynak === 'Deneme');

  it('her konu × Ödev/Kendi Çözdüğü kategorisinde toplam soru 250–1500 arası', () => {
    const totals = new Map<string, number>();
    for (const r of singles) {
      const k = `${r.sinif}|${r.ders}|${r.konu}|${r.kaynak}`;
      totals.set(k, (totals.get(k) ?? 0) + r.soru);
    }
    const topics = gs.seedTopics_() as unknown[];
    expect(totals.size).toBe(topics.length * 2);
    for (const t of totals.values()) {
      expect(t).toBeGreaterThanOrEqual(250);
      expect(t).toBeLessThanOrEqual(1500);
    }
  });

  it('tek kayıtlar backend doğrulamasından geçer (D+Y+B=soru, gelecek tarih yok)', () => {
    for (const r of singles) {
      expect(gs.validateRecord_(r, TODAY)).toEqual({});
      expect(r.konu).not.toBe('');
    }
  });

  it('7. sınıf kayıtları 2025-09-08..2026-06-19, 8. sınıf 2026-06-22..bugün', () => {
    for (const r of kayitlar) {
      if (r.sinif === 7) {
        expect(r.tarih >= '2025-09-08' && r.tarih <= '2026-06-19').toBe(true);
      } else {
        expect(r.tarih >= '2026-06-22' && r.tarih <= TODAY).toBe(true);
      }
    }
  });

  it('7. sınıf 10, 8. sınıf 8 deneme; her deneme 6 ders ve 90 soru, doğrulamadan geçer', () => {
    expect(denemeler.filter((e) => e.sinif === 7)).toHaveLength(10);
    expect(denemeler.filter((e) => e.sinif === 8)).toHaveLength(8);
    for (const e of denemeler) {
      const rows = examRows.filter((r) => r.deneme_id === e.deneme_id);
      expect(rows).toHaveLength(6);
      expect(rows.reduce((s, r) => s + r.soru, 0)).toBe(90);
      expect(rows.every((r) => r.tarih === e.tarih && r.sinif === e.sinif)).toBe(true);
      expect(gs.validateExam_({ ad: e.ad, tarih: e.tarih, sinif: e.sinif, satirlar: rows }, TODAY)).toEqual({});
    }
  });

  it('tüm satırlar demo-veri olarak işaretli ve kimlikler benzersiz', () => {
    expect(kayitlar.every((r) => r.giren_kullanici === 'demo-veri')).toBe(true);
    const ids = [...kayitlar.map((r) => r.id), ...denemeler.map((e) => e.deneme_id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('konular arasında belirgin güçlü/zayıf farkı var (sıralama anlamlı olsun)', () => {
    const byTopic = new Map<string, { net: number; soru: number }>();
    for (const r of singles) {
      const k = `${r.sinif}|${r.ders}|${r.konu}`;
      const t = byTopic.get(k) ?? { net: 0, soru: 0 };
      t.net += r.dogru - r.yanlis / 3;
      t.soru += r.soru;
      byTopic.set(k, t);
    }
    const rates = [...byTopic.values()].map((t) => (t.net / t.soru) * 100);
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(20);
  });

  it('aynı tohumla aynı veriyi üretir', () => {
    expect(JSON.stringify(build(7).kayitlar)).toBe(JSON.stringify(build(7).kayitlar));
  });
});

describe('demo satırlarını silme', () => {
  // Bellekte çalışan küçük bir Sheet taklidi: yalnızca keepRows_'un kullandığı çağrılar.
  function fakeSheet(values: unknown[][]) {
    const data = values.map((r) => [...r]);
    return {
      data,
      getLastRow: () => data.length,
      getRange: (row: number, col: number, nr: number, nc: number) => ({
        getValues: () => data.slice(row - 1, row - 1 + nr).map((r) => r.slice(col - 1, col - 1 + nc)),
        clearContent: () => {
          for (let i = row - 1; i < row - 1 + nr; i++) data[i] = data[i].map(() => '');
        },
        setValues: (v: unknown[][]) => {
          v.forEach((r, i) => { data[row - 1 + i] = [...r]; });
        },
      }),
    };
  }

  it('yalnızca demo satırlarını siler, gerçek kayıtları korur', () => {
    const header = ['id', 'tarih', 'sinif', 'ders', 'kaynak', 'konu', 'soru', 'dogru', 'yanlis', 'bos', 'deneme_id', 'giren_kullanici', 'olusturma_zamani'];
    const row = (id: string, user: string) => [id, '2026-09-20', 8, 'Matematik', 'Ödev', '', 10, 5, 0, 5, '', user, 'x'];
    const sheet = fakeSheet([header, row('a', 'demo-veri'), row('b', 'hasan'), row('c', 'demo-veri'), row('d', 'anne')]);
    const gs = loadGs({ SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) } });
    const removed = gs.keepRows_('Kayitlar', (o: { giren_kullanici: string }) => o.giren_kullanici !== 'demo-veri');
    expect(removed).toBe(2);
    const ids = sheet.data.slice(1).filter((r) => r.join('') !== '').map((r) => r[0]);
    expect(ids).toEqual(['b', 'd']);
  });
});

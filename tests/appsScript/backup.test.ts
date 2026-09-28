import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { FakeSpreadsheet, makeBook } from '../helpers/fakeSpreadsheet';

const PREFIX = 'Göksenin Takip Yedek ';

// Drive'da bir dosya/klasör taklidi: yalnızca Yedek.gs'nin kullandığı çağrılar.
interface FakeFile { id: string; name: string; trashed: boolean; parent: FakeFolder | null }
class FakeFolder {
  trashed = false;
  constructor(public id: string, public name: string, public files: FakeFile[] = []) {}
  getId() { return this.id; }
  isTrashed() { return this.trashed; }
  getFiles() {
    const list = this.files.filter((f) => !f.trashed);
    let i = 0;
    return { hasNext: () => i < list.length, next: () => wrap(list[i++]) };
  }
}
const wrap = (f: FakeFile) => ({
  getName: () => f.name,
  getId: () => f.id,
  setTrashed: (t: boolean) => { f.trashed = t; },
  moveTo: (folder: FakeFolder) => { f.parent = folder; folder.files.push(f); },
});

function loadGs(opts: { today?: string; folders?: FakeFolder[]; props?: Record<string, string> } = {}) {
  const book = makeBook({
    Kayitlar: ['id', 'ders', 'dogru'],
    Kullanicilar: ['kullanici_adi', 'ad'],
  }, {
    Kayitlar: [{ id: 'a', ders: 'Matematik', dogru: 6 }, { id: 'b', ders: 'Türkçe', dogru: 9 }],
    Kullanicilar: [{ kullanici_adi: 'abi', ad: 'Abi' }],
  });
  const created: FakeSpreadsheet[] = [];
  const files = new Map<string, FakeFile>();
  const folders = opts.folders ?? [];
  const props = new Map(Object.entries(opts.props ?? {}));
  const triggers: { handler: string; hour?: number; days?: number; id: number }[] = [];
  let seq = 0;
  const logs: string[] = [];
  const ctx = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => book,
      create: (name: string) => {
        const ss = new FakeSpreadsheet(`copy-${++seq}`, name);
        ss.insertSheet('Sayfa1');
        created.push(ss);
        files.set(ss.id, { id: ss.id, name, trashed: false, parent: null });
        return ss;
      },
    },
    DriveApp: {
      getFileById: (id: string) => wrap(files.get(id)!),
      getFolderById: (id: string) => {
        const f = folders.find((x) => x.id === id);
        if (!f) throw new Error('Bulunamadı');
        return f;
      },
      createFolder: (name: string) => {
        const f = new FakeFolder(`folder-${++seq}`, name);
        folders.push(f);
        return f;
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.map((t) => ({ getHandlerFunction: () => t.handler, id: t.id })),
      deleteTrigger: (t: { id: number }) => { triggers.splice(triggers.findIndex((x) => x.id === t.id), 1); },
      newTrigger: (handler: string) => {
        const t: (typeof triggers)[number] = { handler, id: ++seq };
        const b = {
          timeBased: () => b,
          everyDays: (d: number) => { t.days = d; return b; },
          atHour: (h: number) => { t.hour = h; return b; },
          create: () => { triggers.push(t); },
        };
        return b;
      },
    },
    Utilities: { formatDate: () => opts.today ?? '2026-09-28' },
    Session: { getScriptTimeZone: () => 'Europe/Istanbul' },
    Logger: { log: (s: string) => logs.push(s) },
    console: { error: () => {} },
  }) as Record<string, any>;
  for (const f of ['apps-script/Seed.gs', 'apps-script/Code.gs', 'apps-script/Yedek.gs']) {
    vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  return { gs: ctx, book, created, folders, props, triggers, logs };
}

const names = (days: string[]) => days.map((d) => PREFIX + d);

describe('eski yedekleri seçme', () => {
  const { gs } = loadGs();
  const pick = (list: string[], today = '2026-09-28') => [...gs.silinecekYedekler_(list, today, 30)];

  it('son 30 günün yedekleri kalır (bugün dahil), daha eskileri silinir', () => {
    // 08-01 ayın ilk yedeği olduğu için kalır; 08-29 bugünden 30 gün önce, pencerenin dışında.
    expect(pick(names(['2026-08-01', '2026-08-29', '2026-08-30', '2026-09-28']))).toEqual(names(['2026-08-29']));
  });

  it('her ayın en eski yedeği kalıcıdır (1. günü eksik olsa bile)', () => {
    const list = names(['2026-06-01', '2026-06-02', '2026-07-03', '2026-07-15', '2026-08-01', '2026-08-20', '2026-09-28']);
    expect(pick(list).sort()).toEqual(names(['2026-06-02', '2026-07-15', '2026-08-20']));
  });

  it('adı yedek biçiminde olmayan dosyalara dokunmaz', () => {
    expect(pick(['Notlarım', PREFIX + 'bozuk', 'Başka 2020-01-05'])).toEqual([]);
  });
});

describe('yedekAl', () => {
  it('tüm sekmeleri aynı ad ve içerikle, tarihli yeni bir dosyaya kopyalar ve klasöre taşır', () => {
    const { gs, book, created, folders, props } = loadGs();
    gs.yedekAl();
    expect(created).toHaveLength(1);
    const copy = created[0];
    expect(copy.name).toBe(PREFIX + '2026-09-28');
    expect(copy.getSheets().map((s) => s.name)).toEqual(['Kayitlar', 'Kullanicilar']);
    expect(copy.getSheetByName('Kayitlar')!.rows).toEqual(book.getSheetByName('Kayitlar')!.rows);
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Göksenin Takip Yedekler');
    expect(folders[0].files.map((f) => f.name)).toEqual([PREFIX + '2026-09-28']);
    expect(props.get('YEDEK_KLASOR_ID')).toBe(folders[0].id);
  });

  it('kayıtlı klasörü tekrar kullanır; klasör çöpe atılmışsa yenisini açar', () => {
    const existing = new FakeFolder('f-1', 'Göksenin Takip Yedekler');
    const a = loadGs({ folders: [existing], props: { YEDEK_KLASOR_ID: 'f-1' } });
    a.gs.yedekAl();
    expect(a.folders).toHaveLength(1);
    expect(existing.files).toHaveLength(1);

    const trashed = new FakeFolder('f-2', 'Göksenin Takip Yedekler');
    trashed.trashed = true;
    const b = loadGs({ folders: [trashed], props: { YEDEK_KLASOR_ID: 'f-2' } });
    b.gs.yedekAl();
    expect(b.folders).toHaveLength(2);
    expect(b.props.get('YEDEK_KLASOR_ID')).toBe(b.folders[1].id);
  });

  it('aynı gün ikinci kez çalışınca o günün eski yedeğini çöpe atar; süresi geçenleri temizler', () => {
    const f = (name: string): FakeFile => ({ id: name, name, trashed: false, parent: null });
    const folder = new FakeFolder('f-1', 'Göksenin Takip Yedekler', [
      f(PREFIX + '2026-09-28'), f(PREFIX + '2026-08-27'), f(PREFIX + '2026-08-02'), f('Notlarım'),
    ]);
    const { gs, logs } = loadGs({ folders: [folder], props: { YEDEK_KLASOR_ID: 'f-1' } });
    gs.yedekAl();
    const live = folder.files.filter((x) => !x.trashed).map((x) => x.name).sort();
    expect(live).toEqual(['Notlarım', PREFIX + '2026-08-02', PREFIX + '2026-09-28'].sort());
    expect(folder.files.filter((x) => !x.trashed && x.name === PREFIX + '2026-09-28')).toHaveLength(1);
    expect(logs.join('\n')).toContain('1 eski yedek silindi');
  });
});

describe('yedeklemeyiKur', () => {
  it('her gün 03:00 için tek tetikleyici kurar (tekrar çalıştırınca çoğalmaz) ve ilk yedeği hemen alır', () => {
    const { gs, triggers, created } = loadGs();
    gs.yedeklemeyiKur();
    gs.yedeklemeyiKur();
    expect(triggers).toEqual([{ handler: 'yedekAl', days: 1, hour: 3, id: expect.any(Number) }]);
    expect(created.length).toBeGreaterThanOrEqual(1);
  });
});

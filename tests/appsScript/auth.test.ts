import { createHash, createHmac, pbkdf2Sync, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

// Apps Script servislerinin bellekte çalışan taklitleri: yalnızca Code.gs'nin kullandığı çağrılar.
const signed = (buf: Buffer) => [...buf].map((b) => (b > 127 ? b - 256 : b));
const toBuf = (x: string | number[]) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 0xff)));

function fakeServices() {
  const props = new Map<string, string>();
  const cache = new Map<string, string>();
  const updates: { name: string; row: number; obj: Record<string, unknown> }[] = [];
  const services = {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_alg: string, value: string) => signed(createHash('sha256').update(value, 'utf8').digest()),
      computeHmacSha256Signature: (value: string | number[], key: string | number[]) =>
        signed(createHmac('sha256', toBuf(key)).update(toBuf(value)).digest()),
      newBlob: (s: string) => ({ getBytes: () => signed(Buffer.from(s, 'utf8')) }),
      getUuid: () => randomUUID(),
      sleep: () => {},
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
        deleteProperty: (k: string) => props.delete(k),
        getProperties: () => Object.fromEntries(props),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cache.get(k) ?? null,
        put: (k: string, v: string) => cache.set(k, v),
        remove: (k: string) => cache.delete(k),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({ content: s, setMimeType() { return this; } }),
    },
  };
  return { services, props, cache, updates };
}

function loadGs() {
  const f = fakeServices();
  const ctx = vm.createContext({ ...f.services, console: { error: () => {} } }) as Record<string, any>;
  for (const file of ['apps-script/Seed.gs', 'apps-script/Code.gs']) vm.runInContext(readFileSync(file, 'utf8'), ctx);
  let users: Record<string, unknown>[] = [];
  ctx.readAll_ = (name: string) => (name === 'Kullanicilar' ? users.map((u) => ({ ...u })) : []);
  ctx.update_ = (name: string, row: number, obj: Record<string, unknown>) => {
    f.updates.push({ name, row, obj });
    if (name === 'Kullanicilar') users = users.map((u) => (u._row === row ? { ...obj, _row: row } : u));
  };
  const setUsers = (list: Record<string, unknown>[]) => { users = list; };
  return { gs: ctx, ...f, setUsers };
}

type Loaded = ReturnType<typeof loadGs>;
let env: Loaded;
const login = (u: string, p: string) => env.gs.login_({ kullanici_adi: u, sifre: p, hatirla: false });
const code = (fn: () => unknown) => {
  try {
    fn();
    return 'OK';
  } catch (e) {
    return (e as { code?: string }).code ?? 'THROWN';
  }
};

describe('şifre özeti (PBKDF2-HMAC-SHA256)', () => {
  beforeEach(() => { env = loadGs(); });

  it('Node crypto.pbkdf2 ile birebir aynı sonucu verir ve sürüm/tur bilgisini saklar', () => {
    const h = env.gs.hashPassword_('tuz123', 'gizli123', 1000);
    expect(h).toBe(`v2$1000$${pbkdf2Sync('gizli123', 'tuz123', 1000, 32, 'sha256').toString('hex')}`);
  });

  it('varsayılan tur sayısı en az 2000', () => {
    expect(env.gs.HASH_ITER).toBeGreaterThanOrEqual(2000);
  });
});

describe('giriş', () => {
  beforeEach(() => {
    env = loadGs();
    env.setUsers([{ kullanici_adi: 'hasan', ad: 'Hasan', salt: 'tuz', sifre_hash: env.gs.hashPassword_('tuz', 'dogru-sifre', 50), _row: 2 }]);
  });

  it('doğru şifreyle token verir, yanlışta LOGIN', () => {
    expect(login('hasan', 'dogru-sifre').token).toMatch(/^[a-f0-9]{64}$/);
    expect(code(() => login('hasan', 'yanlis'))).toBe('LOGIN');
  });

  it('5 hatalı denemeden sonra doğru şifre de 15 dakika reddedilir', () => {
    for (let i = 0; i < 5; i++) expect(code(() => login('hasan', 'yanlis'))).toBe('LOGIN');
    expect(() => login('hasan', 'dogru-sifre')).toThrow(env.gs.MSG.kilit);
  });

  it('olmayan kullanıcı adı da aynı şekilde kilitlenir (kullanıcı adı tahmin edilemez)', () => {
    for (let i = 0; i < 5; i++) expect(code(() => login('yok', 'x'))).toBe('LOGIN');
    expect(() => login('yok', 'x')).toThrow(env.gs.MSG.kilit);
  });

  it('başarılı giriş hata sayacını sıfırlar', () => {
    for (let i = 0; i < 4; i++) code(() => login('hasan', 'yanlis'));
    login('hasan', 'dogru-sifre');
    for (let i = 0; i < 4; i++) code(() => login('hasan', 'yanlis'));
    expect(login('hasan', 'dogru-sifre').token).toBeTruthy();
  });

  it('eski (tek tur SHA-256) özetle giriş yapan kullanıcının özeti PBKDF2 ile yenilenir', () => {
    env.setUsers([{ kullanici_adi: 'anne', ad: 'Anne', salt: 's1', sifre_hash: env.gs.hash_('s1', 'eski-sifre'), _row: 3 }]);
    expect(login('anne', 'eski-sifre').token).toBeTruthy();
    const up = env.updates.find((u) => u.name === 'Kullanicilar');
    expect(String(up?.obj.sifre_hash)).toMatch(/^v2\$\d+\$[a-f0-9]{64}$/);
    expect(login('anne', 'eski-sifre').token).toBeTruthy();
  });
});

describe('şifre değişikliği', () => {
  beforeEach(() => {
    env = loadGs();
    env.setUsers([
      { kullanici_adi: 'hasan', ad: 'Hasan', salt: 'tuz', sifre_hash: env.gs.hashPassword_('tuz', 'dogru-sifre', 50), _row: 2 },
      { kullanici_adi: 'anne', ad: 'Anne', salt: 'tuz2', sifre_hash: env.gs.hashPassword_('tuz2', 'anne-sifre', 50), _row: 3 },
    ]);
  });

  it('kullanıcının diğer oturumlarını kapatır, mevcut oturumu ve başkalarının oturumlarını korur', () => {
    const current = login('hasan', 'dogru-sifre').token;
    const other = login('hasan', 'dogru-sifre').token;
    const anne = login('anne', 'anne-sifre').token;
    env.gs.changePassword_({ eski: 'dogru-sifre', yeni: 'yeni-sifre-123' }, 'hasan', current);
    expect(env.gs.requireUser_(current)).toBe('hasan');
    expect(code(() => env.gs.requireUser_(other))).toBe('AUTH');
    expect(env.gs.requireUser_(anne)).toBe('anne');
    expect(login('hasan', 'yeni-sifre-123').token).toBeTruthy();
  });
});

describe('HTTP hata yönetimi', () => {
  beforeEach(() => { env = loadGs(); });
  const body = (res: { content: string }) => JSON.parse(res.content);

  it('gövdesiz ya da bozuk istek iç ayrıntı sızdırmadan reddedilir', () => {
    expect(body(env.gs.doPost(undefined))).toMatchObject({ ok: false, error: 'SERVER', message: 'Geçersiz istek.' });
    expect(body(env.gs.doPost({ postData: { contents: '{bozuk' } }))).toMatchObject({ ok: false, message: 'Geçersiz istek.' });
  });

  it('çok büyük istek reddedilir', () => {
    expect(body(env.gs.doPost({ postData: { contents: 'x'.repeat(2_000_001) } }))).toMatchObject({ ok: false, message: 'Geçersiz istek.' });
  });

  it('beklenmeyen hata genel bir mesajla döner, iç mesaj istemciye gitmez', () => {
    env.gs.route_ = () => { throw new Error('Kayitlar sekmesi satır 5423: TypeError at readAll_'); };
    const res = body(env.gs.doPost({ postData: { contents: '{"action":"getAll"}' } }));
    expect(res).toEqual({ ok: false, error: 'SERVER', message: 'Beklenmeyen bir sunucu hatası oluştu. Tekrar deneyin.', details: null });
  });
});

describe('Sheet yazımı', () => {
  it('eklenen satırlarda metin sütunlarını düz metin (@) yapar, sayısal sütunlara dokunmaz', () => {
    env = loadGs();
    const formats: { col: number; row: number; n: number; fmt: string }[] = [];
    const sheet = {
      getLastRow: () => 10,
      getMaxRows: () => 1000,
      insertRowsAfter: () => {},
      getRange: (row: number, col: number, n: number) => ({
        setNumberFormat: (fmt: string) => { formats.push({ row, col, n, fmt }); },
        setValues: () => {},
      }),
    };
    env.gs.sheet_ = () => sheet;
    env.gs.appendMany_('Kayitlar', [{ id: 'a' }, { id: 'b' }]);
    const headers = env.gs.SHEETS.Kayitlar as string[];
    const textCols = headers.map((h, i) => [h, i + 1] as const).filter(([h]) => !(env.gs.NUMERIC_COLUMNS as string[]).includes(h)).map(([, i]) => i);
    expect(formats.map((f) => f.col).sort((a, b) => a - b)).toEqual(textCols);
    expect(formats.every((f) => f.row === 11 && f.n === 2 && f.fmt === '@')).toBe(true);
  });
});

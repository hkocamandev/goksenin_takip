import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { FakeSpreadsheet, makeBook } from '../helpers/fakeSpreadsheet';

const HEADERS = {
  Kayitlar: ['id', 'tarih', 'sinif', 'ders', 'kaynak', 'konu', 'soru', 'dogru', 'yanlis', 'bos', 'deneme_id', 'giren_kullanici', 'olusturma_zamani'],
  Denemeler: ['deneme_id', 'ad', 'tarih', 'sinif'],
  Dersler: ['ders', 'sinif', 'deneme_soru_sayisi', 'sira'],
  Konular: ['ders', 'sinif', 'konu'],
  Kullanicilar: ['kullanici_adi', 'sifre_hash', 'salt', 'ad'],
};

function loadGs(book: FakeSpreadsheet) {
  const errors: unknown[] = [];
  const ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    Utilities: {
      getUuid: () => randomUUID(),
      formatDate: (_d: Date, _tz: string, pattern: string) => (pattern === 'yyyy-MM-dd' ? '2026-09-28' : '2026-09-28 21:15:00'),
    },
    Session: { getScriptTimeZone: () => 'Europe/Istanbul' },
    console: { error: (e: unknown) => errors.push(e) },
  }) as Record<string, any>;
  for (const f of ['apps-script/Seed.gs', 'apps-script/Code.gs']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  return { gs: ctx, errors };
}

const input = { tarih: '2026-09-20', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: 'Üslü İfadeler', soru: 10, dogru: 6, yanlis: 2, bos: 2 };
const exam = (ad: string, dogru: number) => ({
  ad, tarih: '2026-09-21', sinif: 8,
  satirlar: [{ ders: 'Matematik', soru: 20, dogru, yanlis: 20 - dogru, bos: 0 }],
});

function setup(data: Parameters<typeof makeBook>[1] = {}) {
  const book = makeBook(HEADERS, data);
  const { gs, errors } = loadGs(book);
  const log = () => book.getSheetByName('Degisiklikler')?.objects() ?? [];
  const parse = (s: unknown) => (s === '' ? null : JSON.parse(String(s)));
  return { book, gs, errors, log, parse };
}

describe('değişiklik günlüğü', () => {
  it('günlük sekmesi yoksa başlığıyla oluşturulur (mevcut kurulumlar için setup gerekmez)', () => {
    const { book, gs } = setup();
    expect(book.getSheetByName('Degisiklikler')).toBeNull();
    gs.addRecord_({ input }, 'abi');
    expect(book.getSheetByName('Degisiklikler')!.rows[0]).toEqual(['zaman', 'kullanici', 'islem', 'tablo', 'kayit_id', 'eski', 'yeni']);
  });

  it('kayıt ekleme: kim, ne zaman ve yeni değer', () => {
    const { gs, log, parse } = setup();
    const rec = gs.addRecord_({ input }, 'abi');
    const [row] = log();
    expect(row).toMatchObject({ zaman: '2026-09-28 21:15:00', kullanici: 'abi', islem: 'ekle', tablo: 'Kayitlar', kayit_id: rec.id, eski: '' });
    expect(parse(row.yeni)).toMatchObject({ ders: 'Matematik', konu: 'Üslü İfadeler', dogru: 6, yanlis: 2 });
  });

  it('bağlantı kopup aynı kimlikle tekrar gönderilen kayıt ikinci kez yazılmaz', () => {
    const { gs, log } = setup();
    const id = randomUUID();
    gs.addRecord_({ id, input }, 'abi');
    gs.addRecord_({ id, input }, 'abi');
    expect(log()).toHaveLength(1);
  });

  it('kayıt düzenleme: eski ve yeni değer, düzenleyen kişi', () => {
    const { gs, log, parse } = setup();
    const rec = gs.addRecord_({ input }, 'hasan');
    gs.updateRecord_({ id: rec.id, input: { ...input, dogru: 8, yanlis: 0 } }, 'abi');
    const row = log()[1];
    expect(row).toMatchObject({ kullanici: 'abi', islem: 'düzenle', tablo: 'Kayitlar', kayit_id: rec.id });
    expect(parse(row.eski)).toMatchObject({ dogru: 6, yanlis: 2, giren_kullanici: 'hasan' });
    expect(parse(row.yeni)).toMatchObject({ dogru: 8, yanlis: 0, giren_kullanici: 'hasan' });
    expect(parse(row.eski)).not.toHaveProperty('_row');
  });

  it('kayıt silme: silinen değer günlükte kalır', () => {
    const { book, gs, log, parse } = setup();
    const rec = gs.addRecord_({ input }, 'hasan');
    gs.deleteRecord_({ id: rec.id }, 'abi');
    expect(book.getSheetByName('Kayitlar')!.objects()).toHaveLength(0);
    const row = log()[1];
    expect(row).toMatchObject({ kullanici: 'abi', islem: 'sil', kayit_id: rec.id, yeni: '' });
    expect(parse(row.eski)).toMatchObject({ id: rec.id, dogru: 6 });
  });

  it('deneme ekleme, düzenleme ve silme ders satırlarıyla birlikte yazılır', () => {
    const { gs, log, parse } = setup();
    const { exam: e } = gs.addExam_({ input: exam('TG-1', 12) }, 'abi');
    gs.updateExam_({ deneme_id: e.deneme_id, input: exam('TG-1 (düzeltme)', 15) }, 'abi2');
    gs.deleteExam_({ deneme_id: e.deneme_id }, 'abi');
    const [add, upd, del] = log();
    expect(add).toMatchObject({ islem: 'ekle', tablo: 'Denemeler', kayit_id: e.deneme_id });
    expect(parse(add.yeni)).toEqual({
      deneme: { deneme_id: e.deneme_id, ad: 'TG-1', tarih: '2026-09-21', sinif: 8 },
      satirlar: [{ ders: 'Matematik', soru: 20, dogru: 12, yanlis: 8, bos: 0 }],
    });
    expect(upd).toMatchObject({ islem: 'düzenle', kullanici: 'abi2' });
    expect(parse(upd.eski).satirlar[0].dogru).toBe(12);
    expect(parse(upd.yeni)).toMatchObject({ deneme: { ad: 'TG-1 (düzeltme)' }, satirlar: [{ dogru: 15 }] });
    expect(del).toMatchObject({ islem: 'sil', yeni: '' });
    expect(parse(del.eski)).toMatchObject({ deneme: { ad: 'TG-1 (düzeltme)' }, satirlar: [{ dogru: 15 }] });
  });

  it('konu listesi kaydedilince yalnızca eklenen ve silinen konular yazılır; değişiklik yoksa satır açılmaz', () => {
    const konular = [
      { ders: 'Matematik', sinif: 8, konu: 'Çarpanlar ve Katlar' },
      { ders: 'Matematik', sinif: 8, konu: 'Üslü İfadeler' },
    ];
    const { gs, log, parse } = setup({ Konular: konular });
    gs.saveTopics_({ konular }, 'abi');
    expect(log()).toHaveLength(0);
    gs.saveTopics_({ konular: [konular[0], { ders: 'Matematik', sinif: 8, konu: 'Kareköklü İfadeler' }] }, 'abi');
    const [row] = log();
    expect(row).toMatchObject({ islem: 'liste kaydet', tablo: 'Konular' });
    expect(parse(row.eski)).toEqual([konular[1]]);
    expect(parse(row.yeni)).toEqual([{ ders: 'Matematik', sinif: 8, konu: 'Kareköklü İfadeler' }]);
  });

  it('ders listesinde soru sayısı değişince eski ve yeni satır yazılır', () => {
    const dersler = [{ ders: 'Matematik', sinif: 8, deneme_soru_sayisi: 20, sira: 1 }];
    const { gs, log, parse } = setup({ Dersler: dersler });
    gs.saveSubjects_({ dersler: [{ ...dersler[0], deneme_soru_sayisi: 25 }] }, 'abi');
    const [row] = log();
    expect(row).toMatchObject({ islem: 'liste kaydet', tablo: 'Dersler' });
    expect(parse(row.eski)).toEqual(dersler);
    expect(parse(row.yeni)).toEqual([{ ...dersler[0], deneme_soru_sayisi: 25 }]);
  });

  it('ders ve konu adı değişikliği yazılır', () => {
    const { gs, log, parse } = setup({
      Dersler: [{ ders: 'Fen', sinif: 8, deneme_soru_sayisi: 20, sira: 1 }],
      Konular: [{ ders: 'Fen', sinif: 8, konu: 'DNA' }],
    });
    gs.renameSubject_({ sinif: 8, eski: 'Fen', yeni: 'Fen Bilimleri' }, 'abi');
    gs.renameTopic_({ sinif: 8, ders: 'Fen Bilimleri', eski: 'DNA', yeni: 'DNA ve Genetik Kod' }, 'abi');
    const [ders, konu] = log();
    expect(ders).toMatchObject({ islem: 'ad değiştir', tablo: 'Dersler' });
    expect(parse(ders.eski)).toEqual({ sinif: 8, ders: 'Fen' });
    expect(parse(ders.yeni)).toEqual({ sinif: 8, ders: 'Fen Bilimleri' });
    expect(konu).toMatchObject({ islem: 'ad değiştir', tablo: 'Konular' });
    expect(parse(konu.yeni)).toEqual({ sinif: 8, ders: 'Fen Bilimleri', konu: 'DNA ve Genetik Kod' });
  });

  it('kullanıcı ekleme ve şifre değiştirme şifre özetini ya da tuzu günlüğe yazmaz', () => {
    const { gs, log } = setup({ Kullanicilar: [{ kullanici_adi: 'hasan', sifre_hash: 'v2$1$eski', salt: 's', ad: 'Hasan' }] });
    gs.hashPassword_ = () => 'v2$2000$gizli-ozet';
    gs.newToken_ = () => 'tuz-degeri-0123456789abcdef';
    gs.verifyPassword_ = () => true;
    gs.revokeTokens_ = () => {};
    gs.PropertiesService = { getScriptProperties: () => ({}) };
    gs.addUser_({ kullanici_adi: 'abi', ad: 'Abi', sifre: 'uzun-bir-sifre' }, 'hasan');
    gs.changePassword_({ eski: 'x', yeni: 'yeni-uzun-sifre' }, 'hasan', 'tok');
    const [add, pw] = log();
    expect(add).toMatchObject({ kullanici: 'hasan', islem: 'kullanıcı ekle', tablo: 'Kullanicilar', kayit_id: 'abi' });
    expect(JSON.parse(String(add.yeni))).toEqual({ kullanici_adi: 'abi', ad: 'Abi' });
    expect(pw).toMatchObject({ kullanici: 'hasan', islem: 'şifre değiştir', kayit_id: 'hasan', eski: '', yeni: '' });
    const all = JSON.stringify(log());
    expect(all).not.toContain('gizli-ozet');
    expect(all).not.toContain('tuz-degeri');
  });

  it('günlüğe yazılamazsa asıl kayıt yine de kaydedilir ve hata sunucu günlüğüne düşer', () => {
    const { book, gs, errors } = setup();
    book.insertSheet = () => { throw new Error('kota doldu'); };
    const rec = gs.addRecord_({ input }, 'abi');
    expect(book.getSheetByName('Kayitlar')!.objects().map((r) => r.id)).toEqual([rec.id]);
    expect(errors).toHaveLength(1);
  });

  it('çok uzun değer hücre sınırına (50.000 karakter) sığacak şekilde kısaltılır', () => {
    const { gs } = setup();
    const v = gs.logValue_(Array.from({ length: 3000 }, (_, i) => ({ ders: 'Matematik', sinif: 8, konu: `Konu ${i}` })));
    expect(v.length).toBeLessThanOrEqual(50000);
    expect(v.endsWith('…')).toBe(true);
    expect(gs.logValue_(null)).toBe('');
  });
});

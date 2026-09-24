import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, createApi, type Api } from '../../src/api/api';
import { createMockTransport } from '../../src/api/mock';
import { MSG } from '../../src/lib/validation';

let api: Api;

beforeEach(async () => {
  api = createApi(createMockTransport({ storage: null, latencyMs: 0, withSamples: false, today: '2026-09-24' }));
  const s = await api.login('demo', 'demo123', false);
  api.setToken(s.token);
});

const input = { tarih: '2026-09-20', sinif: 8 as const, ders: 'Matematik', kaynak: 'Ödev' as const, konu: 'Kümeler', soru: 10, dogru: 6, yanlis: 2, bos: 2 };

describe('mock backend', () => {
  it('hatalı şifre LOGIN, tokensız istek AUTH', async () => {
    await expect(api.login('demo', 'yanlis', false)).rejects.toMatchObject({ code: 'LOGIN' });
    api.setToken(null);
    await expect(api.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });
  it('seed dersleri ve konuları yüklü', async () => {
    const d = await api.getAll();
    expect(d.dersler.length).toBe(12);
    expect(d.kayitlar).toEqual([]);
  });
  it('kayıt ekler, doğrulama hatasında VALIDATION + detay', async () => {
    const row = await api.addRecord(input);
    expect(row).toMatchObject({ ...input, deneme_id: '', giren_kullanici: 'demo' });
    const err = (await api.addRecord({ ...input, bos: 1 }).catch((e) => e)) as ApiError;
    expect(err.code).toBe('VALIDATION');
    expect(err.details).toEqual({ toplam: MSG.toplam });
  });
  it('aynı istemci kimliğiyle tekrar eklenen kayıt/deneme çoğalmaz', async () => {
    const a = await api.addRecord(input, 'client-rec-0001');
    const b = await api.addRecord(input, 'client-rec-0001');
    expect(b.id).toBe(a.id);
    const exam = { ad: 'D', tarih: '2026-09-20', sinif: 8 as const, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 10, yanlis: 0, bos: 10 }] };
    await api.addExam(exam, 'client-exam-0001');
    await api.addExam(exam, 'client-exam-0001');
    const d = await api.getAll();
    expect(d.kayitlar).toHaveLength(2);
    expect(d.denemeler).toHaveLength(1);
  });
  it('deneme ekler, günceller (satırları değiştirir) ve siler', async () => {
    const res = await api.addExam({
      ad: 'D1', tarih: '2026-09-20', sinif: 8,
      satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 10, yanlis: 0, bos: 10 }, { ders: 'Matematik', soru: 20, dogru: 5, yanlis: 0, bos: 15 }],
    });
    expect(res.rows.map((r) => r.kaynak)).toEqual(['Deneme', 'Deneme']);
    await api.updateExam(res.exam.deneme_id, { ad: 'D1b', tarih: '2026-09-21', sinif: 8, satirlar: [{ ders: 'Türkçe', soru: 20, dogru: 12, yanlis: 0, bos: 8 }] });
    let d = await api.getAll();
    expect(d.denemeler).toEqual([{ deneme_id: res.exam.deneme_id, ad: 'D1b', tarih: '2026-09-21', sinif: 8 }]);
    expect(d.kayitlar).toHaveLength(1);
    await api.deleteExam(res.exam.deneme_id);
    d = await api.getAll();
    expect(d.denemeler).toEqual([]);
    expect(d.kayitlar).toEqual([]);
  });
  it('konu yeniden adlandırma geçmiş kayıtları da günceller', async () => {
    await api.addRecord({ ...input, konu: 'Üslü İfadeler' });
    await api.renameTopic(8, 'Matematik', 'Üslü İfadeler', 'Üslü Sayılar');
    const d = await api.getAll();
    expect(d.kayitlar[0].konu).toBe('Üslü Sayılar');
    expect(d.konular).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Üslü Sayılar' });
  });
  it('ders yeniden adlandırmada çakışma VALIDATION', async () => {
    await expect(api.renameSubject(8, 'Matematik', 'türkçe')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('kullanıcı ekler; yeni kullanıcı giriş yapabilir; yanlış eski şifre reddedilir', async () => {
    await api.addUser('Anne', 'Anne', 'gizli123');
    await expect(api.login('anne', 'gizli123', true)).resolves.toMatchObject({ kullanici_adi: 'anne', ad: 'Anne' });
    await expect(api.changePassword('yanlis', 'yenisi123')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

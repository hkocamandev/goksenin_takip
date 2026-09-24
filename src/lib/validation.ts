import { SINGLE_SOURCES, type Counts, type ExamInput, type FieldErrors, type RecordInput, type Subject, type Topic } from './types';

// apps-script/Code.gs içindeki MSG ile birebir aynı olmalı (tests/appsScript/code.test.ts kontrol eder).
export const MSG = {
  tarihGecersiz: 'Geçerli bir tarih girin.',
  tarihGelecek: 'Tarih bugünden sonra olamaz.',
  sinif: 'Sınıf 7 veya 8 olmalı.',
  kaynak: 'Geçerli bir kaynak seçin.',
  ders: 'Ders seçin.',
  konu: 'Konu adı boş olamaz.',
  soru: 'Soru sayısı en az 1 olmalı.',
  sayi: '0 veya daha büyük bir tam sayı girin.',
  toplam: 'Doğru + yanlış + boş, soru sayısına eşit olmalı.',
  ad: 'Deneme adı boş olamaz.',
  satirYok: 'En az bir ders satırı doldurun.',
  tekrar: 'Bu ad zaten var.',
  kullaniciAdi: 'Kullanıcı adı 3-30 karakter olmalı; yalnızca a-z, 0-9, nokta, tire ve alt çizgi.',
  adSoyad: 'Ad boş olamaz.',
  sifre: 'Şifre en az 6 karakter olmalı.',
  eskiSifre: 'Mevcut şifre hatalı.',
} as const;

export function isIsoDate(s: unknown): boolean {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isCount(x: unknown, min: number): boolean {
  return typeof x === 'number' && Number.isInteger(x) && x >= min;
}

function isBlank(s: unknown): boolean {
  return typeof s !== 'string' || s.trim() === '';
}

function checkDate(tarih: unknown, today: string, errs: FieldErrors): void {
  if (!isIsoDate(tarih)) errs.tarih = MSG.tarihGecersiz;
  else if ((tarih as string) > today) errs.tarih = MSG.tarihGelecek;
}

function checkGrade(sinif: unknown, key: string, errs: FieldErrors): void {
  if (sinif !== 7 && sinif !== 8) errs[key] = MSG.sinif;
}

export function countErrors(c: Counts, prefix = ''): FieldErrors {
  const errs: FieldErrors = {};
  if (!isCount(c.soru, 1)) errs[`${prefix}soru`] = MSG.soru;
  for (const k of ['dogru', 'yanlis', 'bos'] as const) {
    if (!isCount(c[k], 0)) errs[`${prefix}${k}`] = MSG.sayi;
  }
  if (Object.keys(errs).length === 0 && c.dogru + c.yanlis + c.bos !== c.soru) {
    errs[`${prefix}toplam`] = MSG.toplam;
  }
  return errs;
}

export function validateRecord(r: RecordInput, today: string): FieldErrors {
  const errs: FieldErrors = {};
  checkDate(r.tarih, today, errs);
  checkGrade(r.sinif, 'sinif', errs);
  if (!(SINGLE_SOURCES as readonly string[]).includes(r.kaynak)) errs.kaynak = MSG.kaynak;
  if (isBlank(r.ders)) errs.ders = MSG.ders;
  Object.assign(errs, countErrors(r));
  return errs;
}

export function validateExam(e: ExamInput, today: string): FieldErrors {
  const errs: FieldErrors = {};
  if (isBlank(e.ad)) errs.ad = MSG.ad;
  checkDate(e.tarih, today, errs);
  checkGrade(e.sinif, 'sinif', errs);
  if (!Array.isArray(e.satirlar) || e.satirlar.length === 0) {
    errs.satirlar = MSG.satirYok;
  } else {
    e.satirlar.forEach((s, i) => {
      const p = `satirlar.${i}.`;
      if (isBlank(s.ders)) errs[`${p}ders`] = MSG.ders;
      Object.assign(errs, countErrors(s, p));
    });
  }
  return errs;
}

const lower = (s: string) => s.trim().toLocaleLowerCase('tr');

export function validateSubjects(list: Subject[]): FieldErrors {
  const errs: FieldErrors = {};
  const seen = new Set<string>();
  list.forEach((s, i) => {
    const p = `dersler.${i}.`;
    if (isBlank(s.ders)) {
      errs[`${p}ders`] = MSG.ders;
    } else {
      const key = `${s.sinif}|${lower(s.ders)}`;
      if (seen.has(key)) errs[`${p}ders`] = MSG.tekrar;
      seen.add(key);
    }
    checkGrade(s.sinif, `${p}sinif`, errs);
    if (!isCount(s.deneme_soru_sayisi, 0)) errs[`${p}deneme_soru_sayisi`] = MSG.sayi;
    if (!isCount(s.sira, 0)) errs[`${p}sira`] = MSG.sayi;
  });
  return errs;
}

export function validateTopics(list: Topic[]): FieldErrors {
  const errs: FieldErrors = {};
  const seen = new Set<string>();
  list.forEach((t, i) => {
    const p = `konular.${i}.`;
    if (isBlank(t.ders)) errs[`${p}ders`] = MSG.ders;
    checkGrade(t.sinif, `${p}sinif`, errs);
    if (isBlank(t.konu)) {
      errs[`${p}konu`] = MSG.konu;
    } else {
      const key = `${t.sinif}|${isBlank(t.ders) ? '' : lower(t.ders)}|${lower(t.konu)}`;
      if (seen.has(key)) errs[`${p}konu`] = MSG.tekrar;
      seen.add(key);
    }
  });
  return errs;
}

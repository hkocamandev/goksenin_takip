import { ApiError, type Transport } from './api';
import { sampleData } from './sample';
import { seedSubjects, seedTopics } from './seed';
import { todayIso } from '../lib/periods';
import type { Exam, ExamInput, FieldErrors, RecordInput, RecordRow, Subject, Topic } from '../lib/types';
import { MSG, validateExam, validateRecord, validateSubjects, validateTopics } from '../lib/validation';

interface MockUser {
  kullanici_adi: string;
  ad: string;
  sifre: string;
}

interface MockDb {
  kayitlar: RecordRow[];
  denemeler: Exam[];
  dersler: Subject[];
  konular: Topic[];
  kullanicilar: MockUser[];
  tokens: Record<string, { u: string; exp: number }>;
}

export interface MockOptions {
  storage?: Storage | null;
  today?: string;
  latencyMs?: number;
  withSamples?: boolean;
}

const DB_KEY = 'goksenin-mock-db';
const DAY_MS = 86_400_000;
const AUTH_MSG = 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function requireValid(errs: FieldErrors): void {
  if (Object.keys(errs).length) throw new ApiError('VALIDATION', 'Formda hatalar var.', errs);
}

const lower = (s: string) => s.trim().toLocaleLowerCase('tr');

// Apps Script backend'inin (apps-script/Code.gs) tarayıcıda çalışan eşdeğeri; yalnızca geliştirme içindir.
export function createMockTransport(opts: MockOptions = {}): Transport {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const latency = opts.latencyMs ?? 350;
  const today = () => opts.today ?? todayIso();
  const now = () => new Date().toISOString();
  const newId = () => crypto.randomUUID();

  const load = (): MockDb | null => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(DB_KEY);
      return raw ? (JSON.parse(raw) as MockDb) : null;
    } catch {
      return null;
    }
  };
  const fresh = (): MockDb => ({
    ...(opts.withSamples ?? true ? sampleData(today()) : { kayitlar: [], denemeler: [] }),
    dersler: seedSubjects(),
    konular: seedTopics(),
    kullanicilar: [{ kullanici_adi: 'demo', ad: 'Demo Kullanıcı', sifre: 'demo123' }],
    tokens: {},
  });
  const db: MockDb = load() ?? fresh();
  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* depolama kapalı ya da dolu: bellekte devam */
    }
  };

  const userOf = (token: string | null): string => {
    const t = token ? db.tokens[token] : undefined;
    if (!t || t.exp < Date.now()) throw new ApiError('AUTH', AUTH_MSG);
    return t.u;
  };

  const cleanRecord = (r: RecordInput) => ({
    tarih: r.tarih, sinif: r.sinif, ders: r.ders.trim(), kaynak: r.kaynak, konu: (r.konu ?? '').trim(),
    soru: r.soru, dogru: r.dogru, yanlis: r.yanlis, bos: r.bos,
  });

  const findSingle = (id: string): number => {
    const i = db.kayitlar.findIndex((r) => r.id === id && r.deneme_id === '');
    if (i < 0) throw new ApiError('NOT_FOUND', 'Kayıt bulunamadı. Sayfayı yenileyin.');
    return i;
  };

  const findExam = (id: string): number => {
    const i = db.denemeler.findIndex((e) => e.deneme_id === id);
    if (i < 0) throw new ApiError('NOT_FOUND', 'Deneme bulunamadı. Sayfayı yenileyin.');
    return i;
  };

  const examRows = (exam: Exam, input: ExamInput, user: string, created: string): RecordRow[] =>
    input.satirlar.map((s) => ({
      id: newId(), tarih: exam.tarih, sinif: exam.sinif, ders: s.ders.trim(), kaynak: 'Deneme', konu: '',
      soru: s.soru, dogru: s.dogru, yanlis: s.yanlis, bos: s.bos, deneme_id: exam.deneme_id,
      giren_kullanici: user, olusturma_zamani: created,
    }));

  const handlers: Record<string, (p: Record<string, any>, user: string) => unknown> = {
    getAll: () => ({
      kayitlar: db.kayitlar, denemeler: db.denemeler, dersler: db.dersler, konular: db.konular,
      kullanicilar: db.kullanicilar.map(({ kullanici_adi, ad }) => ({ kullanici_adi, ad })),
    }),
    addRecord: (p, user) => {
      requireValid(validateRecord(p.input, today()));
      const row: RecordRow = { ...cleanRecord(p.input), id: newId(), deneme_id: '', giren_kullanici: user, olusturma_zamani: now() };
      db.kayitlar.push(row);
      return row;
    },
    updateRecord: (p) => {
      const i = findSingle(p.id);
      requireValid(validateRecord(p.input, today()));
      const old = db.kayitlar[i];
      db.kayitlar[i] = { ...cleanRecord(p.input), id: old.id, deneme_id: '', giren_kullanici: old.giren_kullanici, olusturma_zamani: old.olusturma_zamani };
      return db.kayitlar[i];
    },
    deleteRecord: (p) => {
      db.kayitlar.splice(findSingle(p.id), 1);
      return null;
    },
    addExam: (p, user) => {
      const input = p.input as ExamInput;
      requireValid(validateExam(input, today()));
      const exam: Exam = { deneme_id: newId(), ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
      const rows = examRows(exam, input, user, now());
      db.denemeler.push(exam);
      db.kayitlar.push(...rows);
      return { exam, rows };
    },
    updateExam: (p, user) => {
      const i = findExam(p.deneme_id);
      const input = p.input as ExamInput;
      requireValid(validateExam(input, today()));
      const exam: Exam = { deneme_id: db.denemeler[i].deneme_id, ad: input.ad.trim(), tarih: input.tarih, sinif: input.sinif };
      const old = db.kayitlar.filter((r) => r.deneme_id === exam.deneme_id);
      const rows = examRows(exam, input, old[0]?.giren_kullanici ?? user, old[0]?.olusturma_zamani ?? now());
      db.denemeler[i] = exam;
      db.kayitlar = [...db.kayitlar.filter((r) => r.deneme_id !== exam.deneme_id), ...rows];
      return { exam, rows };
    },
    deleteExam: (p) => {
      const i = findExam(p.deneme_id);
      db.kayitlar = db.kayitlar.filter((r) => r.deneme_id !== p.deneme_id);
      db.denemeler.splice(i, 1);
      return null;
    },
    saveSubjects: (p) => {
      const list = (p.dersler ?? []) as Subject[];
      requireValid(validateSubjects(list));
      db.dersler = list.map((s) => ({ ...s, ders: s.ders.trim() }));
      return null;
    },
    saveTopics: (p) => {
      const list = (p.konular ?? []) as Topic[];
      requireValid(validateTopics(list));
      db.konular = list.map((t) => ({ ...t, ders: t.ders.trim(), konu: t.konu.trim() }));
      return null;
    },
    renameSubject: (p) => {
      const eski = String(p.eski ?? '').trim();
      const yeni = String(p.yeni ?? '').trim();
      if (!yeni) throw new ApiError('VALIDATION', MSG.ders, { yeni: MSG.ders });
      if (eski === yeni) return null;
      if (db.dersler.some((s) => s.sinif === p.sinif && s.ders !== eski && lower(s.ders) === lower(yeni))) {
        throw new ApiError('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
      }
      const hit = (o: { sinif: number; ders: string }) => o.sinif === p.sinif && o.ders === eski;
      db.dersler = db.dersler.map((s) => (hit(s) ? { ...s, ders: yeni } : s));
      db.konular = db.konular.map((t) => (hit(t) ? { ...t, ders: yeni } : t));
      db.kayitlar = db.kayitlar.map((r) => (hit(r) ? { ...r, ders: yeni } : r));
      return null;
    },
    renameTopic: (p) => {
      const eski = String(p.eski ?? '').trim();
      const yeni = String(p.yeni ?? '').trim();
      if (!yeni) throw new ApiError('VALIDATION', MSG.konu, { yeni: MSG.konu });
      if (eski === yeni) return null;
      if (db.konular.some((t) => t.sinif === p.sinif && t.ders === p.ders && t.konu !== eski && lower(t.konu) === lower(yeni))) {
        throw new ApiError('VALIDATION', MSG.tekrar, { yeni: MSG.tekrar });
      }
      const hit = (o: { sinif: number; ders: string; konu: string }) => o.sinif === p.sinif && o.ders === p.ders && o.konu === eski;
      db.konular = db.konular.map((t) => (hit(t) ? { ...t, konu: yeni } : t));
      db.kayitlar = db.kayitlar.map((r) => (hit(r) ? { ...r, konu: yeni } : r));
      return null;
    },
    addUser: (p) => {
      const u = String(p.kullanici_adi ?? '').trim().toLowerCase();
      const ad = String(p.ad ?? '').trim();
      const sifre = String(p.sifre ?? '');
      const errs: FieldErrors = {};
      if (!/^[a-z0-9._-]{3,30}$/.test(u)) errs.kullanici_adi = MSG.kullaniciAdi;
      else if (db.kullanicilar.some((x) => x.kullanici_adi === u)) errs.kullanici_adi = MSG.tekrar;
      if (!ad) errs.ad = MSG.adSoyad;
      if (sifre.length < 6) errs.sifre = MSG.sifre;
      requireValid(errs);
      db.kullanicilar.push({ kullanici_adi: u, ad, sifre });
      return null;
    },
    changePassword: (p, user) => {
      const me = db.kullanicilar.find((x) => x.kullanici_adi === user);
      if (!me) throw new ApiError('AUTH', AUTH_MSG);
      const errs: FieldErrors = {};
      if (String(p.eski ?? '') !== me.sifre) errs.eski = MSG.eskiSifre;
      if (String(p.yeni ?? '').length < 6) errs.yeni = MSG.sifre;
      requireValid(errs);
      me.sifre = String(p.yeni);
      return null;
    },
  };

  return async (action, payload, token) => {
    if (latency) await new Promise((r) => setTimeout(r, latency));
    const p = (payload ?? {}) as Record<string, any>;
    if (action === 'login') {
      const u = String(p.kullanici_adi ?? '').trim().toLowerCase();
      const me = db.kullanicilar.find((x) => x.kullanici_adi === u);
      if (!me || me.sifre !== String(p.sifre ?? '')) throw new ApiError('LOGIN', 'Kullanıcı adı veya şifre hatalı.');
      const t = newId();
      db.tokens[t] = { u: me.kullanici_adi, exp: Date.now() + (p.hatirla ? 30 : 1) * DAY_MS };
      persist();
      return { token: t, kullanici_adi: me.kullanici_adi, ad: me.ad };
    }
    const user = userOf(token);
    if (action === 'logout') {
      delete db.tokens[token!];
      persist();
      return null;
    }
    const h = handlers[action];
    if (!h) throw new ApiError('SERVER', `Bilinmeyen işlem: ${action}`);
    const result = h(p, user);
    persist();
    return structuredClone(result ?? null);
  };
}

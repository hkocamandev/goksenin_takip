import type { ExamInput, RecordInput, Subject, Topic } from '../../src/lib/types';

export const TODAY = '2026-09-24';

const rec: RecordInput = {
  tarih: '2026-09-20', sinif: 8, ders: 'Matematik', kaynak: 'Ödev', konu: 'Kümeler',
  soru: 25, dogru: 16, yanlis: 4, bos: 5,
};

export const recordCases: { name: string; input: RecordInput; keys: string[] }[] = [
  { name: 'geçerli', input: rec, keys: [] },
  { name: 'bugün geçerli', input: { ...rec, tarih: TODAY }, keys: [] },
  { name: 'konu boş olabilir', input: { ...rec, konu: '' }, keys: [] },
  { name: 'kendi çözdüğü geçerli', input: { ...rec, kaynak: 'Kendi Çözdüğü' }, keys: [] },
  { name: 'gelecek tarih', input: { ...rec, tarih: '2026-09-25' }, keys: ['tarih'] },
  { name: 'olmayan gün', input: { ...rec, tarih: '2026-02-30' }, keys: ['tarih'] },
  { name: 'bozuk tarih', input: { ...rec, tarih: '24.09.2026' }, keys: ['tarih'] },
  { name: 'sınıf 6', input: { ...rec, sinif: 6 as never }, keys: ['sinif'] },
  { name: 'tek kayıtta Deneme kaynağı yok', input: { ...rec, kaynak: 'Deneme' }, keys: ['kaynak'] },
  { name: 'ders boş', input: { ...rec, ders: '  ' }, keys: ['ders'] },
  { name: 'soru 0', input: { ...rec, soru: 0, dogru: 0, yanlis: 0, bos: 0 }, keys: ['soru'] },
  { name: 'negatif yanlış', input: { ...rec, yanlis: -1 }, keys: ['yanlis'] },
  { name: 'ondalık doğru', input: { ...rec, dogru: 15.5 }, keys: ['dogru'] },
  { name: 'NaN boş', input: { ...rec, bos: Number.NaN }, keys: ['bos'] },
  { name: 'toplam tutmuyor', input: { ...rec, bos: 4 }, keys: ['toplam'] },
];

const exam: ExamInput = {
  ad: 'Özdebir 3', tarih: '2026-09-20', sinif: 8,
  satirlar: [
    { ders: 'Türkçe', soru: 20, dogru: 15, yanlis: 3, bos: 2 },
    { ders: 'Matematik', soru: 20, dogru: 12, yanlis: 4, bos: 4 },
  ],
};

export const examCases: { name: string; input: ExamInput; keys: string[] }[] = [
  { name: 'geçerli', input: exam, keys: [] },
  { name: 'ad boş', input: { ...exam, ad: ' ' }, keys: ['ad'] },
  { name: 'gelecek tarih', input: { ...exam, tarih: '2026-10-01' }, keys: ['tarih'] },
  { name: 'satır yok', input: { ...exam, satirlar: [] }, keys: ['satirlar'] },
  {
    name: 'ikinci satır toplamı tutmuyor',
    input: { ...exam, satirlar: [exam.satirlar[0], { ...exam.satirlar[1], bos: 3 }] },
    keys: ['satirlar.1.toplam'],
  },
  {
    name: 'satır dersi boş',
    input: { ...exam, satirlar: [{ ...exam.satirlar[0], ders: '' }] },
    keys: ['satirlar.0.ders'],
  },
];

const sub = (ders: string, sinif: 7 | 8, sira: number): Subject => ({ ders, sinif, deneme_soru_sayisi: 20, sira });

export const subjectCases: { name: string; input: Subject[]; keys: string[] }[] = [
  { name: 'geçerli', input: [sub('Matematik', 8, 1), sub('Matematik', 7, 1)], keys: [] },
  { name: 'aynı sınıfta tekrar (büyük/küçük harf)', input: [sub('Matematik', 8, 1), sub('matematik', 8, 2)], keys: ['dersler.1.ders'] },
  { name: 'boş ad', input: [sub(' ', 8, 1)], keys: ['dersler.0.ders'] },
  { name: 'negatif soru sayısı', input: [{ ...sub('Fen', 8, 1), deneme_soru_sayisi: -1 }], keys: ['dersler.0.deneme_soru_sayisi'] },
];

const top = (konu: string, ders = 'Matematik', sinif: 7 | 8 = 8): Topic => ({ ders, sinif, konu });

export const topicCases: { name: string; input: Topic[]; keys: string[] }[] = [
  { name: 'geçerli', input: [top('Kümeler'), top('Kümeler', 'Fen Bilimleri'), top('Kümeler', 'Matematik', 7)], keys: [] },
  { name: 'aynı ders+sınıfta tekrar', input: [top('Kümeler'), top('kümeler')], keys: ['konular.1.konu'] },
  { name: 'boş konu', input: [top('')], keys: ['konular.0.konu'] },
];

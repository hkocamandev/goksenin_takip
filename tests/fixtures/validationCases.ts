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
  { name: 'soru 500 sınırda geçerli', input: { ...rec, soru: 500, dogru: 500, yanlis: 0, bos: 0 }, keys: [] },
  { name: 'soru 500 üstü', input: { ...rec, soru: 501, dogru: 501, yanlis: 0, bos: 0 }, keys: ['soru'] },
  { name: 'konu formülle başlıyor (Sheet formül enjeksiyonu)', input: { ...rec, konu: '=IMPORTXML("http://x.test")' }, keys: ['konu'] },
  { name: 'konu - ile başlıyor', input: { ...rec, konu: '-2+3' }, keys: ['konu'] },
  { name: 'ders @ ile başlıyor', input: { ...rec, ders: '@x' }, keys: ['ders'] },
  { name: 'konu 100 karakterden uzun', input: { ...rec, konu: 'a'.repeat(101) }, keys: ['konu'] },
  { name: 'konu 100 karakter geçerli', input: { ...rec, konu: 'a'.repeat(100) }, keys: [] },
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
  { name: 'ad formülle başlıyor', input: { ...exam, ad: '+HYPERLINK("x")' }, keys: ['ad'] },
  { name: 'ad çok uzun', input: { ...exam, ad: 'D'.repeat(101) }, keys: ['ad'] },
  { name: 'satır dersi formülle başlıyor', input: { ...exam, satirlar: [{ ...exam.satirlar[0], ders: '=1' }] }, keys: ['satirlar.0.ders'] },
  { name: '20 satırdan fazla', input: { ...exam, satirlar: Array.from({ length: 21 }, () => exam.satirlar[0]) }, keys: ['satirlar'] },
];

const sub = (ders: string, sinif: 7 | 8, sira: number): Subject => ({ ders, sinif, deneme_soru_sayisi: 20, sira });

export const subjectCases: { name: string; input: Subject[]; keys: string[] }[] = [
  { name: 'geçerli', input: [sub('Matematik', 8, 1), sub('Matematik', 7, 1)], keys: [] },
  { name: 'aynı sınıfta tekrar (büyük/küçük harf)', input: [sub('Matematik', 8, 1), sub('matematik', 8, 2)], keys: ['dersler.1.ders'] },
  { name: 'boş ad', input: [sub(' ', 8, 1)], keys: ['dersler.0.ders'] },
  { name: 'negatif soru sayısı', input: [{ ...sub('Fen', 8, 1), deneme_soru_sayisi: -1 }], keys: ['dersler.0.deneme_soru_sayisi'] },
  { name: 'formülle başlayan ders', input: [sub('=SUM(1)', 8, 1)], keys: ['dersler.0.ders'] },
  { name: '50 dersten fazla', input: Array.from({ length: 51 }, (_, i) => sub(`Ders ${i}`, 8, i + 1)), keys: ['dersler'] },
];

const top = (konu: string, ders = 'Matematik', sinif: 7 | 8 = 8): Topic => ({ ders, sinif, konu });

export const topicCases: { name: string; input: Topic[]; keys: string[] }[] = [
  { name: 'geçerli', input: [top('Kümeler'), top('Kümeler', 'Fen Bilimleri'), top('Kümeler', 'Matematik', 7)], keys: [] },
  { name: 'aynı ders+sınıfta tekrar', input: [top('Kümeler'), top('kümeler')], keys: ['konular.1.konu'] },
  { name: 'boş konu', input: [top('')], keys: ['konular.0.konu'] },
  { name: 'formülle başlayan konu', input: [top('@x')], keys: ['konular.0.konu'] },
  { name: '3000 konudan fazla', input: Array.from({ length: 3001 }, (_, i) => top(`Konu ${i}`)), keys: ['konular'] },
];

export const userCases: { name: string; input: { kullanici_adi: string; ad: string; sifre: string }; existing: string[]; keys: string[] }[] = [
  { name: 'geçerli', input: { kullanici_adi: 'Anne', ad: 'Anne', sifre: 'gizli123' }, existing: ['hasan'], keys: [] },
  { name: 'şifre 8 karakterden kısa', input: { kullanici_adi: 'anne', ad: 'Anne', sifre: 'gizli12' }, existing: [], keys: ['sifre'] },
  { name: 'şifre 200 karakterden uzun', input: { kullanici_adi: 'anne', ad: 'Anne', sifre: 'x'.repeat(201) }, existing: [], keys: ['sifre'] },
  { name: 'kullanıcı adında boşluk', input: { kullanici_adi: 'ali veli', ad: 'Ali', sifre: 'gizli123' }, existing: [], keys: ['kullanici_adi'] },
  { name: 'kullanıcı adı alınmış (büyük/küçük harf)', input: { kullanici_adi: 'HASAN', ad: 'H', sifre: 'gizli123' }, existing: ['hasan'], keys: ['kullanici_adi'] },
  { name: 'görünen ad boş', input: { kullanici_adi: 'anne', ad: ' ', sifre: 'gizli123' }, existing: [], keys: ['ad'] },
  { name: 'görünen ad formülle başlıyor', input: { kullanici_adi: 'anne', ad: '=1+1', sifre: 'gizli123' }, existing: [], keys: ['ad'] },
];

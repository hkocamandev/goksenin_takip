export type Grade = 7 | 8;
export type Source = 'Deneme' | 'Ödev' | 'Kendi Çözdüğü';
export type SingleSource = Exclude<Source, 'Deneme'>;

export const SOURCES: readonly Source[] = ['Deneme', 'Ödev', 'Kendi Çözdüğü'];
export const SINGLE_SOURCES: readonly SingleSource[] = ['Ödev', 'Kendi Çözdüğü'];

export interface Counts {
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
}

export interface RecordRow extends Counts {
  id: string;
  tarih: string;
  sinif: Grade;
  ders: string;
  kaynak: Source;
  konu: string;
  deneme_id: string;
  giren_kullanici: string;
  olusturma_zamani: string;
}

export interface Exam {
  deneme_id: string;
  ad: string;
  tarih: string;
  sinif: Grade;
}

export interface Subject {
  ders: string;
  sinif: Grade;
  deneme_soru_sayisi: number;
  sira: number;
}

export interface Topic {
  ders: string;
  sinif: Grade;
  konu: string;
}

export interface UserInfo {
  kullanici_adi: string;
  ad: string;
}

export interface AppData {
  kayitlar: RecordRow[];
  denemeler: Exam[];
  dersler: Subject[];
  konular: Topic[];
  kullanicilar: UserInfo[];
}

export interface RecordInput extends Counts {
  tarih: string;
  sinif: Grade;
  ders: string;
  kaynak: Source;
  konu: string;
}

export interface ExamRowInput extends Counts {
  ders: string;
}

export interface ExamInput {
  ad: string;
  tarih: string;
  sinif: Grade;
  satirlar: ExamRowInput[];
}

export interface ExamResult {
  exam: Exam;
  rows: RecordRow[];
}

export type FieldErrors = Record<string, string>;

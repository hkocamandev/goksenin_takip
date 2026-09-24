import { describe, expect, it } from 'vitest';
import { subjectNames, subjectsFor, topicsFor } from '../../src/lib/catalog';
import type { Subject, Topic } from '../../src/lib/types';

const dersler: Subject[] = [
  { ders: 'Matematik', sinif: 8, deneme_soru_sayisi: 20, sira: 2 },
  { ders: 'Türkçe', sinif: 8, deneme_soru_sayisi: 20, sira: 1 },
  { ders: 'Sosyal Bilgiler', sinif: 7, deneme_soru_sayisi: 10, sira: 3 },
  { ders: 'Matematik', sinif: 7, deneme_soru_sayisi: 20, sira: 1 },
];
const konular: Topic[] = [
  { ders: 'Matematik', sinif: 8, konu: 'Çarpanlar ve Katlar' },
  { ders: 'Matematik', sinif: 8, konu: 'Üslü İfadeler' },
  { ders: 'Matematik', sinif: 7, konu: 'Oran ve Orantı' },
];

describe('catalog', () => {
  it('subjectsFor sıraya göre', () => {
    expect(subjectsFor(dersler, 8).map((s) => s.ders)).toEqual(['Türkçe', 'Matematik']);
  });
  it('topicsFor sınıf ve derse göre, sayfa sırasıyla', () => {
    expect(topicsFor(konular, 8, 'Matematik')).toEqual(['Çarpanlar ve Katlar', 'Üslü İfadeler']);
  });
  it('subjectNames tüm sınıflarda tekrarsız', () => {
    expect(subjectNames(dersler, 'all')).toEqual(['Matematik', 'Sosyal Bilgiler', 'Türkçe']);
  });
});

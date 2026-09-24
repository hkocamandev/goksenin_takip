import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { seedSubjects, seedTopics } from '../../src/api/seed';

describe('seed (tek kaynak: apps-script/Seed.gs)', () => {
  it('MEB resmi ders adları ve LGS soru sayıları', () => {
    const s8 = seedSubjects().filter((s) => s.sinif === 8);
    expect(s8.map((s) => [s.ders, s.deneme_soru_sayisi])).toEqual([
      ['Türkçe', 20],
      ['Matematik', 20],
      ['Fen Bilimleri', 20],
      ['T.C. İnkılap Tarihi ve Atatürkçülük', 10],
      ['Din Kültürü ve Ahlak Bilgisi', 10],
      ['İngilizce', 10],
    ]);
    expect(seedSubjects().filter((s) => s.sinif === 7).map((s) => s.ders)).toContain('Sosyal Bilgiler');
  });
  it('konular ders ve sınıfa bağlı', () => {
    expect(seedTopics()).toContainEqual({ ders: 'Matematik', sinif: 8, konu: 'Çarpanlar ve Katlar' });
    expect(seedTopics()).toContainEqual({ ders: 'Matematik', sinif: 7, konu: 'Oran ve Orantı' });
  });
  it('Apps Script de aynı listeyi üretir', () => {
    const ctx = vm.createContext({});
    vm.runInContext(readFileSync('apps-script/Seed.gs', 'utf8'), ctx);
    expect(JSON.parse(JSON.stringify(vm.runInContext('seedSubjects_()', ctx)))).toEqual(seedSubjects());
    expect(JSON.parse(JSON.stringify(vm.runInContext('seedTopics_()', ctx)))).toEqual(seedTopics());
  });
});

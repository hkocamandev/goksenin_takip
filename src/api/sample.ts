import { format, parseISO, subDays } from 'date-fns';
import { seedSubjects, seedTopics } from './seed';
import type { Exam, RecordRow } from '../lib/types';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Geliştirme için: son 12 haftada zamanla iyileşen örnek 8. sınıf verisi.
export function sampleData(today: string): { kayitlar: RecordRow[]; denemeler: Exam[] } {
  const rnd = lcg(42);
  const day = (n: number) => format(subDays(parseISO(today), n), 'yyyy-MM-dd');
  const subjects = seedSubjects().filter((s) => s.sinif === 8);
  const topics = seedTopics().filter((t) => t.sinif === 8);
  const kayitlar: RecordRow[] = [];
  const denemeler: Exam[] = [];

  for (let i = 84; i >= 0; i -= 2) {
    const s = subjects[Math.floor(rnd() * subjects.length)];
    const ts = topics.filter((t) => t.ders === s.ders);
    const soru = 10 + Math.floor(rnd() * 4) * 5;
    const skill = 0.5 + ((84 - i) / 84) * 0.25 + (rnd() - 0.5) * 0.2;
    const dogru = Math.max(0, Math.min(soru, Math.round(soru * skill)));
    const yanlis = Math.round((soru - dogru) * 0.6);
    const tarih = day(i);
    kayitlar.push({
      id: `s${i}`, tarih, sinif: 8, ders: s.ders, kaynak: rnd() < 0.5 ? 'Ödev' : 'Kendi Çözdüğü',
      konu: ts[Math.floor(rnd() * ts.length)]?.konu ?? '', soru, dogru, yanlis, bos: soru - dogru - yanlis,
      deneme_id: '', giren_kullanici: 'demo', olusturma_zamani: `${tarih}T18:00:00.000Z`,
    });
  }

  for (let k = 0; k < 4; k++) {
    const tarih = day(70 - k * 21);
    const deneme_id = `d${k}`;
    denemeler.push({ deneme_id, ad: `Deneme ${k + 1}`, tarih, sinif: 8 });
    for (const s of subjects) {
      const soru = s.deneme_soru_sayisi;
      const dogru = Math.max(0, Math.min(soru, Math.round(soru * (0.55 + k * 0.06 + (rnd() - 0.5) * 0.1))));
      const yanlis = Math.round((soru - dogru) * 0.7);
      kayitlar.push({
        id: `${deneme_id}-${s.ders}`, tarih, sinif: 8, ders: s.ders, kaynak: 'Deneme', konu: '', soru, dogru, yanlis,
        bos: soru - dogru - yanlis, deneme_id, giren_kullanici: 'demo', olusturma_zamani: `${tarih}T12:00:00.000Z`,
      });
    }
  }
  return { kayitlar, denemeler };
}

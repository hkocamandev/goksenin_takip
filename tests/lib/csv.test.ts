import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/lib/csv';
import { rec } from '../fixtures/records';

describe('toCsv (Türkçe Excel)', () => {
  const rows = [
    rec({ tarih: '2026-09-24', ders: 'Türkçe', konu: 'Sözcükte Anlam; Deyimler', soru: 25, dogru: 16, yanlis: 4, bos: 5 }),
    rec({ tarih: '2026-09-20', ders: 'Matematik', kaynak: 'Deneme', deneme_id: 'd1', soru: 1, dogru: 0, yanlis: 1, bos: 0 }),
    rec({ tarih: '2026-09-21', ders: 'İngilizce', konu: '=HYPERLINK("x")', soru: 10, dogru: 10, yanlis: 0, bos: 0 }),
  ];
  const csv = toCsv(rows, [{ deneme_id: 'd1', ad: 'Özdebir "3"', tarih: '2026-09-20', sinif: 8 }]);
  const lines = csv.slice(1).split('\r\n');

  it('UTF-8 BOM ile başlar ve ; ayırıcı kullanır', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe('tarih;sinif;ders;kaynak;konu;deneme;soru;dogru;yanlis;bos;net;net_orani;giren_kullanici');
  });
  it('tarihe göre sıralı, ondalık virgül, negatif net, deneme adı kaçışlı', () => {
    expect(lines[1]).toBe('2026-09-20;8;Matematik;Deneme;;"Özdebir ""3""";1;0;1;0;-0,25;-25;demo');
  });
  it('formül enjeksiyonu önlenir', () => {
    expect(lines[2]).toBe(`2026-09-21;8;İngilizce;Ödev;"'=HYPERLINK(""x"")";;10;10;0;0;10;100;demo`);
  });
  it('; içeren metin tırnaklanır, net 15, oran 60', () => {
    expect(lines[3]).toBe('2026-09-24;8;Türkçe;Ödev;"Sözcükte Anlam; Deyimler";;25;16;4;5;15;60;demo');
  });
});

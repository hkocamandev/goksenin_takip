import { net, netRate, round2 } from './net';
import type { Exam, RecordRow } from './types';

const HEADERS = ['tarih', 'sinif', 'ders', 'kaynak', 'konu', 'deneme', 'soru', 'dogru', 'yanlis', 'bos', 'net', 'net_orani', 'giren_kullanici'];

// Türkçe Excel: ; ayırıcı, ondalık virgül, UTF-8 BOM.
function cell(v: string | number | null): string {
  if (v === null) return '';
  if (typeof v === 'number') return String(round2(v)).replace('.', ',');
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\t\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: readonly RecordRow[], exams: readonly Exam[]): string {
  const examName = new Map(exams.map((e) => [e.deneme_id, e.ad]));
  const sorted = [...rows].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.olusturma_zamani.localeCompare(b.olusturma_zamani));
  const lines = sorted.map((r) => {
    const n = net(r.dogru, r.yanlis);
    return [
      r.tarih, r.sinif, r.ders, r.kaynak, r.konu, examName.get(r.deneme_id) ?? '',
      r.soru, r.dogru, r.yanlis, r.bos, n, netRate(n, r.soru), r.giren_kullanici,
    ].map(cell).join(';');
  });
  return `﻿${[HEADERS.join(';'), ...lines].join('\r\n')}`;
}

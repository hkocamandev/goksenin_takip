import type { Counts } from './types';

export function net(dogru: number, yanlis: number): number {
  return dogru - yanlis / 4;
}

export function netRate(netValue: number, soru: number): number | null {
  // Önce ×100: 7/10*100 = 70.00000000000001 olurdu, 700/10 = 70 tam çıkar.
  return soru > 0 ? (netValue * 100) / soru : null;
}

export interface Totals {
  count: number;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  oran: number | null;
}

export function totals(rows: readonly Counts[]): Totals {
  let soru = 0;
  let dogru = 0;
  let yanlis = 0;
  let bos = 0;
  for (const r of rows) {
    soru += r.soru;
    dogru += r.dogru;
    yanlis += r.yanlis;
    bos += r.bos;
  }
  const n = net(dogru, yanlis);
  return { count: rows.length, soru, dogru, yanlis, bos, net: n, oran: netRate(n, soru) };
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

const netFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const oneFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNet(x: number): string {
  return netFmt.format(round2(x));
}

export function formatRate(x: number | null): string {
  return x === null ? '—' : `%${oneFmt.format(x)}`;
}

export function formatDelta(x: number | null): string {
  if (x === null) return '—';
  const r = Math.round(x * 10) / 10;
  return `${r > 0 ? '+' : ''}${oneFmt.format(r)}`;
}

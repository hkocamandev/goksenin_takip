import { round2, totals, type Totals } from './net';
import { dayBefore, periodLabel, periodStart, periodsBetween, shiftPeriod, type PeriodType } from './periods';
import type { Exam, Grade, RecordRow, Source } from './types';

export interface BaseFilters {
  sinif: Grade | 'all';
  dersler: string[];
  kaynak: Source | 'all';
}

export interface DateRange {
  from: string;
  to: string;
}

export function filterRecords(rows: readonly RecordRow[], f: BaseFilters): RecordRow[] {
  return rows.filter(
    (r) =>
      (f.sinif === 'all' || r.sinif === f.sinif) &&
      (f.dersler.length === 0 || f.dersler.includes(r.ders)) &&
      (f.kaynak === 'all' || r.kaynak === f.kaynak),
  );
}

export function inRange(r: { tarih: string }, range: DateRange): boolean {
  return r.tarih >= range.from && r.tarih <= range.to;
}

export type Trend = 'up' | 'down' | 'flat' | 'none';
export const TREND_THRESHOLD = 2;

export function trendOf(delta: number | null): Trend {
  if (delta === null) return 'none';
  const d = round2(delta);
  if (d >= TREND_THRESHOLD) return 'up';
  if (d <= -TREND_THRESHOLD) return 'down';
  return 'flat';
}

export function deltaOf(prev: number | null, cur: number | null): number | null {
  return prev === null || cur === null ? null : cur - prev;
}

export interface PeriodPoint {
  start: string;
  label: string;
  net: number;
  oran: number | null;
  soru: number;
}

function groupBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function seriesByPeriod(rows: readonly RecordRow[], from: string, to: string, type: PeriodType): PeriodPoint[] {
  const groups = groupBy(rows, (r) => periodStart(r.tarih, type));
  return periodsBetween(from, to, type).map((start) => {
    const t = totals(groups.get(start) ?? []);
    return { start, label: periodLabel(start, type), net: t.net, oran: t.oran, soru: t.soru };
  });
}

export function lastTwoPeriods(to: string, type: PeriodType): { cur: DateRange; prev: DateRange } {
  const curStart = periodStart(to, type);
  return {
    cur: { from: curStart, to },
    prev: { from: shiftPeriod(curStart, type, -1), to: dayBefore(curStart) },
  };
}

export interface Summary {
  total: Totals;
  cur: Totals;
  prev: Totals;
  delta: number | null;
  trend: Trend;
}

export function summarize(base: readonly RecordRow[], range: DateRange, type: PeriodType): Summary {
  const w = lastTwoPeriods(range.to, type);
  const cur = totals(base.filter((r) => inRange(r, w.cur)));
  const prev = totals(base.filter((r) => inRange(r, w.prev)));
  const delta = deltaOf(prev.oran, cur.oran);
  return { total: totals(base.filter((r) => inRange(r, range))), cur, prev, delta, trend: trendOf(delta) };
}

export interface Comparison {
  key: string;
  prev: number | null;
  cur: number | null;
  delta: number | null;
  trend: Trend;
  prevSoru: number;
  curSoru: number;
}

export function compareByKey(
  base: readonly RecordRow[],
  to: string,
  type: PeriodType,
  keyFn: (r: RecordRow) => string,
): Comparison[] {
  const w = lastTwoPeriods(to, type);
  const cur = groupBy(base.filter((r) => inRange(r, w.cur)), keyFn);
  const prev = groupBy(base.filter((r) => inRange(r, w.prev)), keyFn);
  const keys = [...new Set([...prev.keys(), ...cur.keys()])].sort((a, b) => a.localeCompare(b, 'tr'));
  return keys.map((key) => {
    const c = totals(cur.get(key) ?? []);
    const p = totals(prev.get(key) ?? []);
    const delta = deltaOf(p.oran, c.oran);
    return { key, prev: p.oran, cur: c.oran, delta, trend: trendOf(delta), prevSoru: p.soru, curSoru: c.soru };
  });
}

export interface ExamSummary {
  exam: Exam;
  byDers: { ders: string; net: number; soru: number }[];
  net: number;
  soru: number;
  oran: number | null;
}

export function examSummaries(
  exams: readonly Exam[],
  rows: readonly RecordRow[],
  f: { sinif: Grade | 'all'; dersler: string[] } & DateRange,
): ExamSummary[] {
  const byExam = groupBy(rows.filter((r) => r.deneme_id !== ''), (r) => r.deneme_id);
  const out: ExamSummary[] = [];
  for (const exam of exams) {
    if ((f.sinif !== 'all' && exam.sinif !== f.sinif) || !inRange(exam, f)) continue;
    const list = (byExam.get(exam.deneme_id) ?? []).filter((r) => f.dersler.length === 0 || f.dersler.includes(r.ders));
    if (list.length === 0) continue;
    const t = totals(list);
    out.push({
      exam,
      byDers: list.map((r) => ({ ders: r.ders, net: totals([r]).net, soru: r.soru })),
      net: t.net,
      soru: t.soru,
      oran: t.oran,
    });
  }
  return out.sort((a, b) => a.exam.tarih.localeCompare(b.exam.tarih) || a.exam.ad.localeCompare(b.exam.ad, 'tr'));
}

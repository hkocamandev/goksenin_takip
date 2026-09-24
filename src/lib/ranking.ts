import { deltaOf, inRange, lastTwoPeriods, type ExamSummary } from './analysis';
import { totals, type Totals } from './net';
import type { PeriodType } from './periods';
import type { RecordRow } from './types';

export type Direction = 'best' | 'worst';

export interface RankItem {
  key: string;
  label: string;
  detail: string;
  totals: Totals;
}

interface Keyed {
  key: string;
  label: string;
  detail: string;
}

function subjectKey(r: RecordRow): Keyed {
  return { key: r.ders, label: r.ders, detail: '' };
}

function topicKey(r: RecordRow): Keyed {
  return { key: `${r.sinif}|${r.ders}|${r.konu}`, label: r.konu, detail: `${r.sinif}. sınıf · ${r.ders}` };
}

function aggregate(rows: readonly RecordRow[], keyOf: (r: RecordRow) => Keyed): RankItem[] {
  const groups = new Map<string, { k: Keyed; rows: RecordRow[] }>();
  for (const r of rows) {
    const k = keyOf(r);
    const g = groups.get(k.key);
    if (g) g.rows.push(r);
    else groups.set(k.key, { k, rows: [r] });
  }
  return [...groups.values()].map(({ k, rows: list }) => {
    const t = totals(list);
    return { ...k, detail: k.detail || `${t.soru} soru`, totals: t };
  });
}

function sortItems(items: RankItem[], dir: Direction): RankItem[] {
  const sign = dir === 'best' ? -1 : 1;
  return items.sort((a, b) => {
    const ao = a.totals.oran;
    const bo = b.totals.oran;
    if (ao === null || bo === null) return ao === bo ? 0 : ao === null ? 1 : -1;
    return sign * (ao - bo) || b.totals.soru - a.totals.soru || a.label.localeCompare(b.label, 'tr');
  });
}

export function rankSubjects(rows: readonly RecordRow[], dir: Direction): RankItem[] {
  return sortItems(aggregate(rows, subjectKey), dir);
}

export function rankTopics(rows: readonly RecordRow[], dir: Direction, minSoru: number): RankItem[] {
  const items = aggregate(rows.filter((r) => r.konu.trim() !== ''), topicKey).filter((i) => i.totals.soru >= minSoru);
  return sortItems(items, dir);
}

export function rankExams(list: readonly ExamSummary[], dir: Direction): ExamSummary[] {
  const sign = dir === 'best' ? -1 : 1;
  return [...list].sort((a, b) => sign * (a.net - b.net) || b.exam.tarih.localeCompare(a.exam.tarih));
}

export interface Mover {
  key: string;
  label: string;
  detail: string;
  prev: number;
  cur: number;
  delta: number;
}

export function movers(
  base: readonly RecordRow[],
  to: string,
  type: PeriodType,
  by: 'ders' | 'konu',
  dir: 'up' | 'down',
): Mover[] {
  const w = lastTwoPeriods(to, type);
  const rows = by === 'konu' ? base.filter((r) => r.konu.trim() !== '') : base;
  const keyOf = by === 'ders' ? subjectKey : topicKey;
  const cur = new Map(aggregate(rows.filter((r) => inRange(r, w.cur)), keyOf).map((i) => [i.key, i]));
  const prev = new Map(aggregate(rows.filter((r) => inRange(r, w.prev)), keyOf).map((i) => [i.key, i]));
  const out: Mover[] = [];
  for (const [key, c] of cur) {
    const p = prev.get(key);
    const delta = p ? deltaOf(p.totals.oran, c.totals.oran) : null;
    if (!p || delta === null || p.totals.oran === null || c.totals.oran === null) continue;
    if ((dir === 'up' && delta > 0) || (dir === 'down' && delta < 0)) {
      out.push({ key, label: c.label, detail: by === 'ders' ? `${c.totals.soru} soru bu dönem` : c.detail, prev: p.totals.oran, cur: c.totals.oran, delta });
    }
  }
  return out.sort((a, b) => (dir === 'up' ? b.delta - a.delta : a.delta - b.delta));
}

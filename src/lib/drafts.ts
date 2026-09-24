import type { Counts, ExamRowInput, FieldErrors } from './types';

export interface CountDraft {
  soru: string;
  dogru: string;
  yanlis: string;
  bos: string;
  bosManual: boolean;
}

export interface ExamRowDraft extends CountDraft {
  ders: string;
}

export const EMPTY_COUNTS: CountDraft = { soru: '', dogru: '', yanlis: '', bos: '', bosManual: false };

export function parseCount(s: string, empty = Number.NaN): number {
  const t = s.trim();
  return t === '' ? empty : Number(t);
}

export function autoBlank(soru: string, dogru: string, yanlis: string): string {
  const b = parseCount(soru) - parseCount(dogru, 0) - parseCount(yanlis, 0);
  return Number.isFinite(b) ? String(Math.max(0, b)) : '';
}

export function draftCounts(d: CountDraft): Counts {
  const bos = d.bosManual ? d.bos : autoBlank(d.soru, d.dogru, d.yanlis);
  return {
    soru: parseCount(d.soru),
    dogru: parseCount(d.dogru, 0),
    yanlis: parseCount(d.yanlis, 0),
    bos: parseCount(bos),
  };
}

export function isRowEmpty(d: { dogru: string; yanlis: string }): boolean {
  return d.dogru.trim() === '' && d.yanlis.trim() === '';
}

export function examRowsFromDrafts(drafts: ExamRowDraft[]): { rows: ExamRowInput[]; index: number[] } {
  const rows: ExamRowInput[] = [];
  const index: number[] = [];
  drafts.forEach((d, i) => {
    if (isRowEmpty(d)) return;
    rows.push({ ders: d.ders, ...draftCounts(d) });
    index.push(i);
  });
  return { rows, index };
}

export function remapRowErrors(errs: FieldErrors, index: number[]): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(errs)) {
    const m = /^satirlar\.(\d+)\.(.+)$/.exec(k);
    out[m ? `satirlar.${index[Number(m[1])]}.${m[2]}` : k] = v;
  }
  return out;
}

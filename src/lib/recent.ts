import type { Exam, RecordRow } from './types';

export type RecentItem =
  | { kind: 'record'; key: string; tarih: string; created: string; row: RecordRow }
  | { kind: 'exam'; key: string; tarih: string; created: string; exam: Exam; rows: RecordRow[] };

export function recentItems(kayitlar: readonly RecordRow[], denemeler: readonly Exam[], limit = 10): RecentItem[] {
  const byExam = new Map<string, RecordRow[]>();
  const items: RecentItem[] = [];
  for (const r of kayitlar) {
    if (r.deneme_id) {
      const list = byExam.get(r.deneme_id) ?? [];
      list.push(r);
      byExam.set(r.deneme_id, list);
    } else {
      items.push({ kind: 'record', key: r.id, tarih: r.tarih, created: r.olusturma_zamani, row: r });
    }
  }
  for (const exam of denemeler) {
    const rows = byExam.get(exam.deneme_id) ?? [];
    const created = rows.reduce((m, r) => (r.olusturma_zamani > m ? r.olusturma_zamani : m), '');
    items.push({ kind: 'exam', key: exam.deneme_id, tarih: exam.tarih, created, exam, rows });
  }
  return items.sort((a, b) => b.tarih.localeCompare(a.tarih) || b.created.localeCompare(a.created)).slice(0, limit);
}

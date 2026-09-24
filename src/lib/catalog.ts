import type { Grade, Subject, Topic } from './types';

export function subjectsFor(dersler: readonly Subject[], sinif: Grade): Subject[] {
  return dersler.filter((s) => s.sinif === sinif).sort((a, b) => a.sira - b.sira || a.ders.localeCompare(b.ders, 'tr'));
}

export function topicsFor(konular: readonly Topic[], sinif: Grade, ders: string): string[] {
  return konular.filter((t) => t.sinif === sinif && t.ders === ders).map((t) => t.konu);
}

export function subjectNames(dersler: readonly Subject[], sinif: Grade | 'all'): string[] {
  const list = sinif === 'all' ? [...subjectsFor(dersler, 7), ...subjectsFor(dersler, 8)] : subjectsFor(dersler, sinif);
  const names = [...new Set(list.map((s) => s.ders))];
  return sinif === 'all' ? names.sort((a, b) => a.localeCompare(b, 'tr')) : names;
}

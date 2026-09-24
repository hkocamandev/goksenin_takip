export const SUBJECT_COLORS: Record<string, string> = {
  Matematik: '#3D6BF0',
  Türkçe: '#E0453F',
  'Fen Bilimleri': '#2E9E62',
  'Sosyal Bilgiler': '#C06A00',
  'T.C. İnkılap Tarihi ve Atatürkçülük': '#C06A00',
  'Din Kültürü ve Ahlak Bilgisi': '#8B4FC4',
  İngilizce: '#0E9DB0',
};

export const FALLBACK_COLORS = ['#C93F8E', '#8A7A5C', '#5B5FD6', '#6E9E1E', '#B5562B'];

export function subjectColor(ders: string): string {
  const known = SUBJECT_COLORS[ders];
  if (known) return known;
  let h = 0;
  for (const ch of ders) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

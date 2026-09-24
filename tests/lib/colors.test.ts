import { describe, expect, it } from 'vitest';
import { FALLBACK_COLORS, SUBJECT_COLORS, subjectColor } from '../../src/lib/colors';

describe('subjectColor', () => {
  it('bilinen dersler sabit renk alır', () => {
    expect(subjectColor('Matematik')).toBe(SUBJECT_COLORS.Matematik);
    expect(subjectColor('T.C. İnkılap Tarihi ve Atatürkçülük')).toBe(SUBJECT_COLORS['Sosyal Bilgiler']);
  });
  it('yeni dersler yedek paletten deterministik renk alır', () => {
    const c = subjectColor('Görsel Sanatlar');
    expect(FALLBACK_COLORS).toContain(c);
    expect(subjectColor('Görsel Sanatlar')).toBe(c);
  });
});

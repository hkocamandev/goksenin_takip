import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MSG, validateExam, validateRecord, validateSubjects, validateTopics } from '../../src/lib/validation';
import { TODAY, examCases, recordCases, subjectCases, topicCases } from '../fixtures/validationCases';

// Code.gs ve Seed.gs'yi Apps Script'in yaptığı gibi tek bir global kapsamda yükler.
function loadGs(globals: Record<string, unknown> = {}) {
  const ctx = vm.createContext({ ...globals });
  for (const f of ['apps-script/Seed.gs', 'apps-script/Code.gs']) {
    vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  return ctx as Record<string, any>;
}
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));

describe('Code.gs doğrulaması frontend ile birebir aynı', () => {
  const gs = loadGs();
  it('mesajlar aynı', () => {
    expect(plain(gs.MSG)).toEqual(MSG);
  });
  it.each(recordCases)('kayıt: $name', ({ input }) => {
    expect(plain(gs.validateRecord_(input, TODAY))).toEqual(plain(validateRecord(input, TODAY)));
  });
  it.each(examCases)('deneme: $name', ({ input }) => {
    expect(plain(gs.validateExam_(input, TODAY))).toEqual(plain(validateExam(input, TODAY)));
  });
  it.each(subjectCases)('dersler: $name', ({ input }) => {
    expect(plain(gs.validateSubjects_(input))).toEqual(plain(validateSubjects(input)));
  });
  it.each(topicCases)('konular: $name', ({ input }) => {
    expect(plain(gs.validateTopics_(input))).toEqual(plain(validateTopics(input)));
  });
});

describe('Sheets hücre dönüşümü', () => {
  it('Date hücresini script saat diliminde yyyy-MM-dd yapar (toISOString değil)', () => {
    const calls: unknown[][] = [];
    const gs = loadGs({
      Utilities: { formatDate: (...a: unknown[]) => { calls.push(a); return '2026-09-24'; } },
      Session: { getScriptTimeZone: () => 'Europe/Istanbul' },
    });
    const d = vm.runInContext('new Date(2026, 8, 24)', gs as vm.Context);
    expect(gs.normalizeCell_(d)).toBe('2026-09-24');
    expect(calls[0].slice(1)).toEqual(['Europe/Istanbul', 'yyyy-MM-dd']);
    expect(gs.normalizeCell_('2026-09-24')).toBe('2026-09-24');
  });
  it('toObject_ sayısal sütunları sayıya, diğerlerini stringe çevirir', () => {
    const gs = loadGs();
    const o = gs.toObject_(['ders', 'sinif', 'soru', 'konu'], ['Matematik', '8', 20, 12]);
    expect(plain(o)).toEqual({ ders: 'Matematik', sinif: 8, soru: 20, konu: '12' });
  });
});

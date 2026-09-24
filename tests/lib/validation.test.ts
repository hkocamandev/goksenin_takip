import { describe, expect, it } from 'vitest';
import {
  MSG, countErrors, isIsoDate, isValidPassword, validateExam, validateNewUser, validateRecord, validateSubjects, validateTopics,
} from '../../src/lib/validation';
import { TODAY, examCases, recordCases, subjectCases, topicCases, userCases } from '../fixtures/validationCases';

const keys = (e: Record<string, string>) => Object.keys(e).sort();

describe('validateRecord', () => {
  it.each(recordCases)('$name', ({ input, keys: expected }) => {
    expect(keys(validateRecord(input, TODAY))).toEqual([...expected].sort());
  });
  it('mesajlar Türkçe ve sabit', () => {
    expect(validateRecord({ ...recordCases[0].input, bos: 4 }, TODAY)).toEqual({ toplam: MSG.toplam });
  });
});

describe('validateExam', () => {
  it.each(examCases)('$name', ({ input, keys: expected }) => {
    expect(keys(validateExam(input, TODAY))).toEqual([...expected].sort());
  });
});

describe('validateSubjects / validateTopics', () => {
  it.each(subjectCases)('dersler: $name', ({ input, keys: expected }) => {
    expect(keys(validateSubjects(input))).toEqual([...expected].sort());
  });
  it.each(topicCases)('konular: $name', ({ input, keys: expected }) => {
    expect(keys(validateTopics(input))).toEqual([...expected].sort());
  });
});

describe('yardımcılar', () => {
  it('isIsoDate', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate(20260924)).toBe(false);
  });
  it('countErrors önek kullanır ve toplamı yalnızca alanlar geçerliyse kontrol eder', () => {
    expect(countErrors({ soru: 10, dogru: -1, yanlis: 0, bos: 0 }, 'satirlar.2.')).toEqual({ 'satirlar.2.dogru': MSG.sayi });
    expect(countErrors({ soru: 10, dogru: 5, yanlis: 0, bos: 0 })).toEqual({ toplam: MSG.toplam });
  });
});

describe('validateNewUser / isValidPassword', () => {
  it.each(userCases)('$name', ({ input, existing, keys: expected }) => {
    expect(keys(validateNewUser(input, existing))).toEqual([...expected].sort());
  });
  it('şifre kuralı 8-200 karakter', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('x'.repeat(201))).toBe(false);
    expect(MSG.sifre).toBe('Şifre 8-200 karakter olmalı.');
  });
});

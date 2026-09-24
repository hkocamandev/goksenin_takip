import { describe, expect, it } from 'vitest';
import { formatDelta, formatNet, formatRate, net, netRate, round2, totals } from '../../src/lib/net';

describe('net', () => {
  it('3 yanlış 1 doğruyu götürür: 25 soru, 16 doğru, 6 yanlış, 3 boş → 14 net', () => {
    expect(net(16, 6)).toBe(14);
  });
  it('tam bölünmeyen yanlış sayısı kesirli net verir', () => {
    expect(net(16, 4)).toBeCloseTo(14.6667, 4);
  });
  it('net negatif olabilir', () => {
    expect(net(1, 6)).toBe(-1);
  });
});

describe('netRate', () => {
  it('net / soru × 100', () => {
    expect(netRate(15, 25)).toBe(60);
  });
  it('soru 0 ise null', () => {
    expect(netRate(0, 0)).toBeNull();
  });
});

describe('totals', () => {
  it('toplu oran Σnet/Σsoru ile hesaplanır, kayıt oranlarının ortalaması değildir', () => {
    const t = totals([
      { soru: 10, dogru: 8, yanlis: 0, bos: 2 },
      { soru: 40, dogru: 20, yanlis: 0, bos: 20 },
    ]);
    expect(t).toEqual({ count: 2, soru: 50, dogru: 28, yanlis: 0, bos: 22, net: 28, oran: 56 });
  });
  it('boş liste: net 0, oran null', () => {
    expect(totals([])).toEqual({ count: 0, soru: 0, dogru: 0, yanlis: 0, bos: 0, net: 0, oran: null });
  });
});

describe('biçimlendirme', () => {
  it('round2', () => {
    expect(round2(1.9999999999999998)).toBe(2);
    expect(round2(15.254)).toBe(15.25);
  });
  it('formatNet Türkçe ondalık virgül kullanır', () => {
    expect(formatNet(15.25)).toBe('15,25');
    expect(formatNet(15)).toBe('15');
    expect(formatNet(-0.25)).toBe('-0,25');
  });
  it('formatRate', () => {
    expect(formatRate(60)).toBe('%60,0');
    expect(formatRate(null)).toBe('—');
  });
  it('formatDelta işaret gösterir', () => {
    expect(formatDelta(40)).toBe('+40,0');
    expect(formatDelta(-6.54)).toBe('-6,5');
    expect(formatDelta(0)).toBe('0,0');
    expect(formatDelta(null)).toBe('—');
  });
});

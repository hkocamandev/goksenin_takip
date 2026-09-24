import { describe, expect, it } from 'vitest';
import { isFramed } from '../../src/lib/security';

describe('isFramed', () => {
  it('sayfa başka bir sitenin çerçevesi içindeyse true', () => {
    const top = {};
    expect(isFramed({ self: {}, top })).toBe(true);
  });
  it('normal açılışta false', () => {
    const w = {} as { self: unknown; top: unknown };
    w.self = w;
    w.top = w;
    expect(isFramed(w)).toBe(false);
  });
  it('top erişimi engellenirse (farklı köken) çerçeve sayılır', () => {
    const w = { self: {}, get top(): unknown { throw new Error('SecurityError'); } };
    expect(isFramed(w)).toBe(true);
  });
});

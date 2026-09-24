import { describe, expect, it } from 'vitest';
import { resolveApiConfig } from '../../src/api/config';

describe('resolveApiConfig', () => {
  it('URL varsa http', () => {
    expect(resolveApiConfig({ PROD: true, VITE_API_URL: ' https://script.google.com/macros/s/X/exec ' })).toEqual({
      mode: 'http', url: 'https://script.google.com/macros/s/X/exec',
    });
  });
  it('geliştirmede URL yoksa mock', () => {
    expect(resolveApiConfig({ PROD: false })).toEqual({ mode: 'mock' });
  });
  it('üretimde URL yoksa sessizce mock KULLANMAZ, hata verir', () => {
    const c = resolveApiConfig({ PROD: true, VITE_API_URL: '' });
    expect(c.mode).toBe('error');
  });
});

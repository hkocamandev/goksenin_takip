import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApi, errorMessage } from '../../src/api/api';
import { httpTransport } from '../../src/api/http';

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));

describe('httpTransport', () => {
  it('text/plain POST gövdesinde action, payload ve token gönderir; data döner', async () => {
    const fetchFn = reply({ ok: true, data: { x: 1 } });
    const api = createApi(httpTransport('https://example.test/exec', fetchFn));
    api.setToken('t1');
    await expect(api.getAll()).resolves.toEqual({ x: 1 });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.test/exec');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(init.body as string)).toEqual({ action: 'getAll', payload: {}, token: 't1' });
  });
  it('ok:false → ApiError (kod, mesaj, detay)', async () => {
    const t = httpTransport('u', reply({ ok: false, error: 'VALIDATION', message: 'Formda hatalar var.', details: { soru: 'x' } }));
    const err = (await t('addRecord', {}, 't').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION');
    expect(errorMessage(err)).toBe('x');
  });
  it('fetch hatası → NETWORK', async () => {
    const t = httpTransport('u', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(t('getAll', {}, 't')).rejects.toMatchObject({ code: 'NETWORK' });
  });
  it('JSON olmayan yanıt (ör. Google giriş sayfası) → SERVER', async () => {
    const t = httpTransport('u', reply('<html>login</html>'));
    await expect(t('getAll', {}, 't')).rejects.toMatchObject({ code: 'SERVER' });
  });
});

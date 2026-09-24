import { ApiError, type ErrorCode, type Transport } from './api';
import type { FieldErrors } from '../lib/types';

interface Envelope {
  ok: boolean;
  data?: unknown;
  error?: ErrorCode;
  message?: string;
  details?: FieldErrors | null;
}

// text/plain: Apps Script CORS ön kontrolünü (preflight) desteklemez.
export function httpTransport(url: string, fetchFn: typeof fetch = (...a) => fetch(...a)): Transport {
  return async (action, payload, token) => {
    let res: Response;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token }),
        redirect: 'follow',
      });
    } catch {
      throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    }
    if (!res.ok) throw new ApiError('SERVER', `Sunucu hatası (${res.status}).`);
    let body: Envelope;
    try {
      body = (await res.json()) as Envelope;
    } catch {
      throw new ApiError('SERVER', 'Sunucudan beklenmeyen yanıt geldi. Apps Script yayın ayarlarını kontrol edin.');
    }
    if (!body.ok) throw new ApiError(body.error ?? 'SERVER', body.message ?? 'Bilinmeyen hata.', body.details ?? null);
    return body.data ?? null;
  };
}

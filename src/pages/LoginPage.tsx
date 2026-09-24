import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { errorMessage } from '../api/api';
import { apiConfig } from '../api/index';
import { Field } from '../components/Field';
import { btnPrimary, inputCls } from '../components/ui';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { login, session, expired } = useAuth();
  const location = useLocation();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/giris' ? from : '/'} replace />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await login(u, p, remember);
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="bubble bubble-filled mx-auto size-14 text-2xl font-bold">G</span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Göksenin Net Takip</h1>
          <p className="mt-1 text-sm text-muted">Deneme, ödev ve test sonuçları tek yerde</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          {expired && (
            <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              Oturumunuz sona erdi. Lütfen tekrar giriş yapın; yazdıklarınız kaybolmadı, formda duruyor.
            </p>
          )}
          <Field label="Kullanıcı adı">
            <input className={inputCls} autoComplete="username" autoCapitalize="none" value={u} onChange={(e) => setU(e.target.value)} required />
          </Field>
          <Field label="Şifre">
            <input className={inputCls} type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Beni hatırla (30 gün)
          </label>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
          {apiConfig.mode === 'mock' && <p className="text-center text-xs text-muted">Geliştirme modu — demo / demo123</p>}
        </form>
      </div>
    </div>
  );
}

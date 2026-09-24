import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Api, Session } from '../api/api';

const SESSION_KEY = 'goksenin-session';

// "Beni hatırla" açıksa oturum localStorage'da (30 gün), kapalıysa yalnızca bu sekmede (sessionStorage) tutulur.
function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null, remember = true): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (s) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* depolama kapalı */
  }
}

// Paylaşılan cihazda bir sonraki kişi yarım kalmış form taslaklarını görmesin.
function clearDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('goksenin-draft-')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* depolama kapalı */
  }
}

interface AuthValue {
  api: Api;
  session: Session | null;
  expired: boolean;
  login(kullanici_adi: string, sifre: string, hatirla: boolean): Promise<void>;
  logout(): Promise<void>;
  expire(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ api, initialSession, children }: { api: Api; initialSession?: Session | null; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = initialSession !== undefined ? initialSession : readSession();
    api.setToken(s?.token ?? null); // alt bileşenlerin ilk isteğinden önce
    return s;
  });
  const [expired, setExpired] = useState(false);

  const apply = useCallback(
    (s: Session | null, remember = true) => {
      api.setToken(s?.token ?? null);
      writeSession(s, remember);
      setSession(s);
    },
    [api],
  );

  const login = useCallback(
    async (u: string, p: string, h: boolean) => {
      const s = await api.login(u, p, h);
      setExpired(false);
      apply(s, h);
    },
    [api, apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* sunucuya ulaşılamasa da yerelde çıkış yap */
    }
    clearDrafts();
    apply(null);
  }, [api, apply]);

  const expire = useCallback(() => {
    setExpired(true);
    apply(null);
  }, [apply]);

  const value = useMemo(() => ({ api, session, expired, login, logout, expire }), [api, session, expired, login, logout, expire]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return v;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

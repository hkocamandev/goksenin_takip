import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Api, Session } from '../api/api';

const SESSION_KEY = 'goksenin-session';

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
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
    (s: Session | null) => {
      api.setToken(s?.token ?? null);
      writeSession(s);
      setSession(s);
    },
    [api],
  );

  const login = useCallback(
    async (u: string, p: string, h: boolean) => {
      const s = await api.login(u, p, h);
      setExpired(false);
      apply(s);
    },
    [api, apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* sunucuya ulaşılamasa da yerelde çıkış yap */
    }
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

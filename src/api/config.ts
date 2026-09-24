export type ApiConfig = { mode: 'http'; url: string } | { mode: 'mock' } | { mode: 'error'; message: string };

export function resolveApiConfig(env: { PROD: boolean; VITE_API_URL?: string }): ApiConfig {
  const url = env.VITE_API_URL?.trim();
  if (url) return { mode: 'http', url };
  if (env.PROD) {
    return {
      mode: 'error',
      message: 'Uygulama yapılandırılmamış: VITE_API_URL tanımlı değil. KURULUM.md 4. adıma bakın.',
    };
  }
  return { mode: 'mock' };
}

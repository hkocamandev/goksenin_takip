import { HashRouter, Navigate, Route, Routes } from 'react-router';
import type { Api } from './api/api';
import { apiConfig, defaultApi } from './api/index';
import { Layout } from './components/Layout';
import { AnalysisPage } from './pages/AnalysisPage';
import { EntryPage } from './pages/entry/EntryPage';
import { LoginPage } from './pages/LoginPage';
import { RankingPage } from './pages/RankingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AuthProvider, RequireAuth } from './state/AuthContext';
import { DataProvider } from './state/DataContext';

function ConfigError({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-ink">
      <div role="alert" className="max-w-md rounded-2xl border border-bad/40 bg-surface p-6">
        <h1 className="font-display text-xl font-semibold">Kurulum tamamlanmamış</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export function App({ api = defaultApi }: { api?: Api }) {
  if (apiConfig.mode === 'error') return <ConfigError message={apiConfig.message} />;
  return (
    <HashRouter>
      <AuthProvider api={api}>
        <Routes>
          <Route path="/giris" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <DataProvider>
                  <Layout />
                </DataProvider>
              </RequireAuth>
            }
          >
            <Route index element={<EntryPage />} />
            <Route path="analiz" element={<AnalysisPage />} />
            <Route path="siralama" element={<RankingPage />} />
            <Route path="ayarlar" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

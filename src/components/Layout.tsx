import clsx from 'clsx';
import { ChartColumn, ListOrdered, LogOut, PencilLine, RotateCw, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../state/AuthContext';
import { useData } from '../state/DataContext';
import { IconButton } from './IconButton';
import { ThemeToggle } from './ThemeToggle';
import { btnGhost } from './ui';

const NAV = [
  { to: '/', label: 'Veri Girişi', icon: PencilLine, end: true },
  { to: '/analiz', label: 'Analiz', icon: ChartColumn, end: false },
  { to: '/siralama', label: 'Sıralama', icon: ListOrdered, end: false },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bubble bubble-filled size-9 text-base font-bold">G</span>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold">Göksenin</p>
        <p className="text-xs text-muted">Net Takip</p>
      </div>
    </div>
  );
}

export function Layout() {
  const { session, logout } = useAuth();
  const { data, error, reload } = useData();

  return (
    <div className="min-h-dvh bg-bg text-ink md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line p-5 md:flex">
        <Brand />
        <nav aria-label="Ana menü" className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <n.icon size={18} aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <p className="truncate text-sm text-muted">{session?.ad}</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <IconButton label="Çıkış yap" onClick={() => void logout()}>
              <LogOut size={18} />
            </IconButton>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <IconButton label="Çıkış yap" onClick={() => void logout()}>
              <LogOut size={18} />
            </IconButton>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
          {error ? (
            <div role="alert" className="rounded-2xl border border-bad/40 bg-bad/10 p-5">
              <p className="font-medium">{error}</p>
              <button type="button" className={clsx(btnGhost, 'mt-3')} onClick={() => void reload()}>
                <RotateCw size={16} /> Tekrar dene
              </button>
            </div>
          ) : data ? (
            <Outlet />
          ) : (
            <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
              <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-2" />
              <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
              <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
            </div>
          )}
        </main>
      </div>

      <nav aria-label="Alt menü" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')
            }
          >
            <n.icon size={20} aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

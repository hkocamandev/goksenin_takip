import { EmptyState } from './EmptyState';

export interface RankRow {
  key: string;
  label: string;
  detail: string;
  value: string;
  rate: number | null;
  color?: string;
}

const width = (rate: number | null) => `${Math.max(0, Math.min(100, rate ?? 0))}%`;

export function RankList({ label, rows, empty }: { label: string; rows: RankRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ol aria-label={label} className="divide-y divide-line">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-center gap-4 py-3">
          <span className={`bubble size-8 shrink-0 text-sm font-semibold${i === 0 ? ' bubble-filled' : ''}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-medium">{r.label}</p>
              <p className="shrink-0 font-display text-lg font-semibold tabular-nums">{r.value}</p>
            </div>
            <p className="truncate text-xs text-muted">{r.detail}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: width(r.rate), background: r.color ?? 'var(--accent)' }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

import clsx from 'clsx';
import type { Trend } from '../lib/analysis';

export function StatCard({ label, value, suffix, trend }: { label: string; value: string; suffix?: string; trend?: Trend }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={clsx('mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight', trend === 'up' && 'text-good', trend === 'down' && 'text-bad')}>
        {value}
        {suffix && <span className="ml-1 font-sans text-sm font-normal text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

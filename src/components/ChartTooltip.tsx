import { formatNet, formatRate } from '../lib/net';

interface Item {
  name?: string;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Item[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => {
        const v = typeof p.value === 'number' ? p.value : null;
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}:
            <span className="font-medium text-ink tabular-nums">{p.dataKey === 'oran' ? formatRate(v) : v === null ? '—' : formatNet(v)}</span>
          </p>
        );
      })}
    </div>
  );
}

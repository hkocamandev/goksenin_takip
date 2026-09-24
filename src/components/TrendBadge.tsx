import clsx from 'clsx';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Trend } from '../lib/analysis';
import { formatDelta } from '../lib/net';

const STYLE: Record<Trend, string> = {
  up: 'bg-good/15 text-good',
  down: 'bg-bad/15 text-bad',
  flat: 'bg-surface-2 text-muted',
  none: 'bg-surface-2 text-muted',
};
const ICON = { up: TrendingUp, down: TrendingDown, flat: Minus, none: Minus };
const LABEL: Record<Trend, string> = { up: 'İyileşme', down: 'Kötüleşme', flat: 'Sabit', none: 'Karşılaştırma yok' };

export function TrendBadge({ trend, delta }: { trend: Trend; delta: number | null }) {
  const Icon = ICON[trend];
  return (
    <span title={LABEL[trend]} className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', STYLE[trend])}>
      {trend !== 'none' && <Icon size={14} aria-hidden />}
      <span>{formatDelta(delta)}</span>
      <span className="sr-only">{LABEL[trend]}</span>
    </span>
  );
}

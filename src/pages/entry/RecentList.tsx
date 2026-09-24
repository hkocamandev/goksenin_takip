import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { subjectColor } from '../../lib/colors';
import { formatNet, formatRate, totals } from '../../lib/net';
import { formatDateTr } from '../../lib/periods';
import type { RecentItem } from '../../lib/recent';

export function RecentList({ items, onEdit, onDelete }: { items: RecentItem[]; onEdit: (i: RecentItem) => void; onDelete: (i: RecentItem) => void }) {
  if (!items.length) return <EmptyState title="Henüz kayıt yok" text="İlk kaydı yukarıdaki formdan ekleyebilirsin." />;
  return (
    <ul aria-label="Son kayıtlar" className="divide-y divide-line">
      {items.map((item) => {
        const t = totals(item.kind === 'exam' ? item.rows : [item.row]);
        const title = item.kind === 'exam' ? item.exam.ad : item.row.ders;
        const detail =
          item.kind === 'exam'
            ? `${item.exam.sinif}. sınıf · Deneme · ${item.rows.length} ders`
            : `${item.row.sinif}. sınıf · ${item.row.kaynak}${item.row.konu ? ` · ${item.row.konu}` : ''}`;
        return (
          <li key={item.key} className="flex items-center gap-3 py-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.kind === 'exam' ? 'var(--accent)' : subjectColor(item.row.ders) }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{title}</p>
              <p className="truncate text-xs text-muted">{formatDateTr(item.tarih)} · {detail}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-semibold tabular-nums">{formatNet(t.net)} net</p>
              <p className="text-xs text-muted tabular-nums">{formatRate(t.oran)}</p>
            </div>
            <IconButton label={`${title} düzenle`} onClick={() => onEdit(item)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label={`${title} sil`} onClick={() => onDelete(item)}>
              <Trash2 size={16} />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}

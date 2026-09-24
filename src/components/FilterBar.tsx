import clsx from 'clsx';
import type { BaseFilters } from '../lib/analysis';
import { subjectColor } from '../lib/colors';
import { defaultRange, todayIso, type PeriodType } from '../lib/periods';
import { SOURCES, type Grade, type Source } from '../lib/types';
import { Card } from './Card';
import { Field } from './Field';
import { inputCls } from './ui';

export interface FilterState extends BaseFilters {
  from: string;
  to: string;
}

export function initialFilters(type: PeriodType): FilterState {
  return { sinif: 'all', dersler: [], kaynak: 'all', ...defaultRange(todayIso(), type) };
}

export function FilterBar({ value, onChange, subjects, showSubjects = true, showSource = true }: {
  value: FilterState;
  onChange: (f: FilterState) => void;
  subjects: string[];
  showSubjects?: boolean;
  showSource?: boolean;
}) {
  const set = (p: Partial<FilterState>) => onChange({ ...value, ...p });
  return (
    <Card label="Filtreler" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Sınıf">
          <select
            className={inputCls}
            value={String(value.sinif)}
            onChange={(e) => set({ sinif: e.target.value === 'all' ? 'all' : (Number(e.target.value) as Grade), dersler: [] })}
          >
            <option value="all">Tüm sınıflar</option>
            <option value="7">7. sınıf</option>
            <option value="8">8. sınıf</option>
          </select>
        </Field>
        {showSource && (
          <Field label="Kaynak">
            <select className={inputCls} value={value.kaynak} onChange={(e) => set({ kaynak: e.target.value as Source | 'all' })}>
              <option value="all">Tüm kaynaklar</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Başlangıç">
          <input type="date" className={inputCls} value={value.from} max={value.to} onChange={(e) => e.target.value && set({ from: e.target.value })} />
        </Field>
        <Field label="Bitiş">
          <input type="date" className={inputCls} value={value.to} min={value.from} max={todayIso()} onChange={(e) => e.target.value && set({ to: e.target.value })} />
        </Field>
      </div>
      {showSubjects && subjects.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">
            Dersler {value.dersler.length === 0 && <span className="font-normal">(hepsi)</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const on = value.dersler.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ dersler: on ? value.dersler.filter((x) => x !== s) : [...value.dersler, s] })}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
                    on ? 'border-transparent bg-ink text-bg' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <span className="size-2 rounded-full" style={{ background: subjectColor(s) }} />
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

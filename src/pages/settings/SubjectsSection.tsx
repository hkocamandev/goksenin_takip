import clsx from 'clsx';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { EditableName } from '../../components/EditableName';
import { IconButton } from '../../components/IconButton';
import { Segmented } from '../../components/Segmented';
import { btnSm, inputCls, inputSm } from '../../components/ui';
import { subjectsFor } from '../../lib/catalog';
import { subjectColor } from '../../lib/colors';
import type { Grade, Subject } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';

function NumberCell({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      min={0}
      inputMode="numeric"
      className={clsx(inputSm.replace('w-full', ''), 'w-14')}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v);
        if (v.trim() !== '' && Number.isInteger(n) && n >= 0 && n !== value) onCommit(n);
        else setV(String(value));
      }}
    />
  );
}

export const GRADE_OPTIONS = [
  { value: '7', label: '7. sınıf' },
  { value: '8', label: '8. sınıf' },
] as const;

export function SubjectsSection() {
  const data = useAppData();
  const { runAndReload } = useData();
  const { busy, error, run } = useAction();
  const [sinif, setSinif] = useState<Grade>(8);
  const [name, setName] = useState('');

  const list = subjectsFor(data.dersler, sinif);
  // Değişiklik, sunucudaki güncel liste üzerine uygulanır: başka cihazda yapılan eklemeler silinmez.
  const mutate = (transform: (current: Subject[]) => Subject[]) =>
    run(() =>
      runAndReload(async (api) => {
        const fresh = await api.getAll();
        const others = fresh.dersler.filter((s) => s.sinif !== sinif);
        const next = transform(subjectsFor(fresh.dersler, sinif));
        await api.saveSubjects([...others, ...next.map((s, i) => ({ ...s, sira: i + 1 }))]);
      }),
    );
  const move = (ders: string, d: -1 | 1) =>
    void mutate((cur) => {
      const i = cur.findIndex((x) => x.ders === ders);
      const j = i + d;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <Card label="Dersler">
      <CardTitle
        actions={<Segmented label="Ders listesi sınıfı" value={String(sinif) as '7' | '8'} onChange={(v) => setSinif(Number(v) as Grade)} options={[...GRADE_OPTIONS]} />}
      >
        Dersler
      </CardTitle>
      <ul className="divide-y divide-line">
        {list.map((s, i) => (
          <li key={s.ders} className="flex flex-wrap items-center gap-2 py-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(s.ders) }} />
            <div className="min-w-0 flex-1">
              <EditableName value={s.ders} onSave={(yeni) => run(() => runAndReload((api) => api.renameSubject(sinif, s.ders, yeni)))} />
            </div>
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
              Deneme sorusu
              <NumberCell
                label={`${s.ders} deneme soru sayısı`}
                value={s.deneme_soru_sayisi}
                onCommit={(n) => void mutate((cur) => cur.map((x) => (x.ders === s.ders ? { ...x, deneme_soru_sayisi: n } : x)))}
              />
            </label>
            <IconButton label={`${s.ders} yukarı taşı`} disabled={i === 0 || busy} onClick={() => move(s.ders, -1)}>
              <ArrowUp size={16} />
            </IconButton>
            <IconButton label={`${s.ders} aşağı taşı`} disabled={i === list.length - 1 || busy} onClick={() => move(s.ders, 1)}>
              <ArrowDown size={16} />
            </IconButton>
            <IconButton
              label={`${s.ders} kaldır`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`"${s.ders}" dersi ${sinif}. sınıf listesinden kaldırılsın mı? Geçmiş kayıtlar silinmez.`)) {
                  void mutate((cur) => cur.filter((x) => x.ders !== s.ders));
                }
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = name.trim();
          if (!t) return;
          if (await mutate((cur) => [...cur, { ders: t, sinif, deneme_soru_sayisi: 10, sira: cur.length + 1 }])) setName('');
        }}
      >
        <input aria-label="Yeni ders" placeholder="Yeni ders adı" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={clsx(btnSm, 'shrink-0')} disabled={busy}>
          <Plus size={16} /> Ders ekle
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  );
}

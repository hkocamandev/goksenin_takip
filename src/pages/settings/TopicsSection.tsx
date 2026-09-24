import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardTitle } from '../../components/Card';
import { EditableName } from '../../components/EditableName';
import { Field } from '../../components/Field';
import { IconButton } from '../../components/IconButton';
import { Segmented } from '../../components/Segmented';
import { btnSm, inputCls } from '../../components/ui';
import { subjectsFor, topicsFor } from '../../lib/catalog';
import type { Grade } from '../../lib/types';
import { useAppData, useData } from '../../state/DataContext';
import { useAction } from '../../state/useAction';
import { GRADE_OPTIONS } from './SubjectsSection';

export function TopicsSection() {
  const data = useAppData();
  const { runAndReload } = useData();
  const { busy, error, run } = useAction();
  const [sinif, setSinif] = useState<Grade>(8);
  const [picked, setPicked] = useState('');
  const [name, setName] = useState('');

  const subjects = subjectsFor(data.dersler, sinif);
  const ders = subjects.some((s) => s.ders === picked) ? picked : (subjects[0]?.ders ?? '');
  const list = topicsFor(data.konular, sinif, ders);
  // Değişiklik, sunucudaki güncel liste üzerine uygulanır: başka cihazda yapılan eklemeler silinmez.
  const mutate = (transform: (current: string[]) => string[]) =>
    run(() =>
      runAndReload(async (api) => {
        const fresh = await api.getAll();
        const others = fresh.konular.filter((t) => !(t.sinif === sinif && t.ders === ders));
        const next = transform(topicsFor(fresh.konular, sinif, ders));
        await api.saveTopics([...others, ...next.map((konu) => ({ ders, sinif, konu }))]);
      }),
    );

  return (
    <Card label="Konular">
      <CardTitle
        actions={<Segmented label="Konu listesi sınıfı" value={String(sinif) as '7' | '8'} onChange={(v) => setSinif(Number(v) as Grade)} options={[...GRADE_OPTIONS]} />}
      >
        Konular
      </CardTitle>
      <Field label="Ders" className="max-w-sm">
        <select className={inputCls} value={ders} onChange={(e) => setPicked(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.ders} value={s.ders}>{s.ders}</option>
          ))}
        </select>
      </Field>
      <ul aria-label="Konu listesi" className="mt-4 divide-y divide-line">
        {list.map((k) => (
          <li key={k} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <EditableName value={k} onSave={(yeni) => run(() => runAndReload((api) => api.renameTopic(sinif, ders, k, yeni)))} />
            </div>
            <IconButton
              label={`${k} kaldır`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`"${k}" konusu listeden kaldırılsın mı? Geçmiş kayıtlar silinmez.`)) void mutate((cur) => cur.filter((x) => x !== k));
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-3 text-sm text-muted">Bu ders için henüz konu yok.</p>}
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = name.trim();
          if (!t || !ders) return;
          if (await mutate((cur) => [...cur, t])) setName('');
        }}
      >
        <input aria-label="Yeni konu" placeholder="Yeni konu adı" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={clsx(btnSm, 'shrink-0')} disabled={busy}>
          <Plus size={16} /> Konu ekle
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  );
}

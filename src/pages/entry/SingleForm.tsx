import { useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../api/api';
import { CountInputs } from '../../components/CountInputs';
import { Field } from '../../components/Field';
import { btnGhost, btnPrimary, inputCls } from '../../components/ui';
import { subjectsFor, topicsFor } from '../../lib/catalog';
import { EMPTY_COUNTS, draftCounts, type CountDraft } from '../../lib/drafts';
import { formatNet, formatRate, net, netRate } from '../../lib/net';
import { todayIso } from '../../lib/periods';
import type { FieldErrors, Grade, RecordInput, RecordRow, SingleSource } from '../../lib/types';
import { countErrors, validateRecord } from '../../lib/validation';
import { useAppData, useData } from '../../state/DataContext';
import { useDraft } from '../../state/useDraft';

interface SingleDraft {
  tarih: string;
  sinif: Grade;
  ders: string;
  konu: string;
  counts: CountDraft;
}

const isEmptyCounts = (c: CountDraft) => !c.soru && !c.dogru && !c.yanlis && !c.bos;

function fromRecord(r: RecordRow): SingleDraft {
  return {
    tarih: r.tarih, sinif: r.sinif, ders: r.ders, konu: r.konu,
    counts: { soru: String(r.soru), dogru: String(r.dogru), yanlis: String(r.yanlis), bos: String(r.bos), bosManual: false },
  };
}

export function SingleForm({ kaynak, editing, onDone }: { kaynak: SingleSource; editing?: RecordRow; onDone: () => void }) {
  const data = useAppData();
  const { saveRecord } = useData();
  const [draft, setDraft] = useDraft<SingleDraft>(
    editing ? null : `goksenin-draft-${kaynak}`,
    () => (editing ? fromRecord(editing) : { tarih: todayIso(), sinif: 8, ders: '', konu: '', counts: EMPTY_COUNTS }),
    (d) => (isEmptyCounts(d.counts) ? { ...d, tarih: todayIso() } : d),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const subjects = subjectsFor(data.dersler, draft.sinif);
  const keepOld = editing && draft.ders === editing.ders;
  const ders = subjects.some((s) => s.ders === draft.ders) || keepOld ? draft.ders : (subjects[0]?.ders ?? '');
  const topics = topicsFor(data.konular, draft.sinif, ders);
  const konuOptions = draft.konu && !topics.includes(draft.konu) ? [draft.konu, ...topics] : topics;
  const counts = draftCounts(draft.counts);
  const liveOk = Object.keys(countErrors(counts)).length === 0;
  const liveNet = net(counts.dogru, counts.yanlis);
  const patch = (p: Partial<SingleDraft>) => setDraft((d) => ({ ...d, ...p }));

  async function save() {
    if (inFlight.current) return;
    const input: RecordInput = { tarih: draft.tarih, sinif: draft.sinif, ders, kaynak, konu: draft.konu, ...counts };
    const errs = validateRecord(input, todayIso());
    setErrors(errs);
    setFailure(null);
    if (Object.keys(errs).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await saveRecord(input, editing?.id);
      setSavedAt(Date.now());
      if (editing) onDone();
      else setDraft((d) => ({ ...d, ders, counts: EMPTY_COUNTS }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION' && e.details) setErrors(e.details);
      else if (!(e instanceof ApiError && e.code === 'AUTH')) setFailure(errorMessage(e));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Tarih" error={errors.tarih}>
          <input type="date" max={todayIso()} className={inputCls} value={draft.tarih} onChange={(e) => patch({ tarih: e.target.value })} />
        </Field>
        <Field label="Sınıf" error={errors.sinif}>
          <select className={inputCls} value={draft.sinif} onChange={(e) => patch({ sinif: Number(e.target.value) as Grade, ders: '', konu: '' })}>
            <option value={7}>7. sınıf</option>
            <option value={8}>8. sınıf</option>
          </select>
        </Field>
        <Field label="Ders" error={errors.ders}>
          <select className={inputCls} value={ders} onChange={(e) => patch({ ders: e.target.value, konu: '' })}>
            {subjects.map((s) => (
              <option key={s.ders} value={s.ders}>{s.ders}</option>
            ))}
            {keepOld && !subjects.some((s) => s.ders === ders) && <option value={ders}>{ders}</option>}
          </select>
        </Field>
        <Field label="Konu">
          <select className={inputCls} value={draft.konu} onChange={(e) => patch({ konu: e.target.value })}>
            <option value="">— Konu seçilmedi —</option>
            {konuOptions.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </Field>
      </div>

      <CountInputs value={draft.counts} onChange={(c) => setDraft((d) => ({ ...d, counts: c }))} errors={errors} />
      {errors.toplam && <p role="alert" className="text-sm text-bad">{errors.toplam}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <p className="flex items-baseline gap-2 text-sm text-muted">
          Net
          <span data-testid="live-net" className="font-display text-2xl font-semibold text-ink tabular-nums">
            {liveOk ? formatNet(liveNet) : '—'}
          </span>
          {liveOk && <span className="tabular-nums">{formatRate(netRate(liveNet, counts.soru))}</span>}
        </p>
        <div className="flex items-center gap-3">
          {savedAt && <p role="status" className="text-sm font-medium text-good">Kaydedildi</p>}
          {editing && (
            <button type="button" className={btnGhost} onClick={onDone}>Vazgeç</button>
          )}
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>

      {failure && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm">
          <span>{failure}</span>
          <button type="button" className={btnGhost} onClick={() => void save()}>Tekrar dene</button>
        </div>
      )}
    </form>
  );
}

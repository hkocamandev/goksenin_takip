import { Fragment, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../api/api';
import { Field } from '../../components/Field';
import { btnGhost, btnPrimary, inputCls, inputSm } from '../../components/ui';
import { subjectsFor } from '../../lib/catalog';
import { subjectColor } from '../../lib/colors';
import { autoBlank, draftCounts, examRowsFromDrafts, isRowEmpty, remapRowErrors, type ExamRowDraft } from '../../lib/drafts';
import { formatNet, net } from '../../lib/net';
import { todayIso } from '../../lib/periods';
import type { Exam, ExamInput, FieldErrors, Grade, RecordRow, Subject } from '../../lib/types';
import { countErrors, validateExam } from '../../lib/validation';
import { useAppData, useData } from '../../state/DataContext';
import { useDraft } from '../../state/useDraft';

interface ExamDraft {
  ad: string;
  tarih: string;
  sinif: Grade;
  rows: ExamRowDraft[];
  clientId?: string;
}

const LABELS = { soru: 'soru', dogru: 'doğru', yanlis: 'yanlış' } as const;

function blankRows(dersler: Subject[], sinif: Grade, keep: ExamRowDraft[] = []): ExamRowDraft[] {
  const rows = subjectsFor(dersler, sinif).map(
    (s) =>
      keep.find((r) => r.ders === s.ders) ?? {
        ders: s.ders, soru: s.deneme_soru_sayisi ? String(s.deneme_soru_sayisi) : '', dogru: '', yanlis: '', bos: '', bosManual: false,
      },
  );
  const extra = keep.filter((k) => !rows.some((r) => r.ders === k.ders) && !isRowEmpty(k));
  return [...rows, ...extra];
}

function fromExam(dersler: Subject[], exam: Exam, rows: RecordRow[]): ExamDraft {
  const filled = rows.map((r) => ({
    ders: r.ders, soru: String(r.soru), dogru: String(r.dogru), yanlis: String(r.yanlis), bos: String(r.bos), bosManual: false,
  }));
  return { ad: exam.ad, tarih: exam.tarih, sinif: exam.sinif, rows: blankRows(dersler, exam.sinif, filled) };
}

export function ExamForm({ editing, onDone }: { editing?: { exam: Exam; rows: RecordRow[] }; onDone: () => void }) {
  const data = useAppData();
  const { saveExam } = useData();
  const [draft, setDraft] = useDraft<ExamDraft>(
    editing ? null : 'goksenin-draft-Deneme',
    () =>
      editing
        ? fromExam(data.dersler, editing.exam, editing.rows)
        : { ad: '', tarih: todayIso(), sinif: 8, rows: blankRows(data.dersler, 8), clientId: crypto.randomUUID() },
    (d) => ({
      ...(d.rows.every(isRowEmpty) ? { ...d, tarih: todayIso(), rows: blankRows(data.dersler, d.sinif) } : d),
      clientId: d.clientId ?? crypto.randomUUID(),
    }),
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

  const setRow = (i: number, p: Partial<ExamRowDraft>) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) }));

  const rowState = draft.rows.map((r) => {
    const c = draftCounts(r);
    const ok = !isRowEmpty(r) && Object.keys(countErrors(c)).length === 0;
    return { c, ok };
  });
  const totalNet = rowState.reduce((sum, s) => (s.ok ? sum + net(s.c.dogru, s.c.yanlis) : sum), 0);

  async function save() {
    if (inFlight.current) return;
    const { rows, index } = examRowsFromDrafts(draft.rows);
    const input: ExamInput = { ad: draft.ad, tarih: draft.tarih, sinif: draft.sinif, satirlar: rows };
    const errs = remapRowErrors(validateExam(input, todayIso()), index);
    setErrors(errs);
    setFailure(null);
    if (Object.keys(errs).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await saveExam(input, editing?.exam.deneme_id, draft.clientId);
      setSavedAt(Date.now());
      if (editing) onDone();
      else setDraft((d) => ({ ad: '', tarih: d.tarih, sinif: d.sinif, rows: blankRows(data.dersler, d.sinif), clientId: crypto.randomUUID() }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION' && e.details) setErrors(remapRowErrors(e.details, index));
      else if (!(e instanceof ApiError && e.code === 'AUTH')) setFailure(errorMessage(e));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Deneme adı" error={errors.ad} className="col-span-2">
          <input className={inputCls} placeholder="ör. Özdebir LGS Deneme 3" value={draft.ad} onChange={(e) => setDraft((d) => ({ ...d, ad: e.target.value }))} />
        </Field>
        <Field label="Tarih" error={errors.tarih}>
          <input type="date" max={todayIso()} className={inputCls} value={draft.tarih} onChange={(e) => setDraft((d) => ({ ...d, tarih: e.target.value }))} />
        </Field>
        <Field label="Sınıf" error={errors.sinif}>
          <select
            className={inputCls}
            value={draft.sinif}
            onChange={(e) => {
              const sinif = Number(e.target.value) as Grade;
              setDraft((d) => ({ ...d, sinif, rows: blankRows(data.dersler, sinif, d.rows) }));
            }}
          >
            <option value={7}>7. sınıf</option>
            <option value={8}>8. sınıf</option>
          </select>
        </Field>
      </div>

      <div>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-sm text-muted">
              <th className="hidden py-2 pl-1 font-medium sm:table-cell">Ders</th>
              <th className="pr-1.5 font-medium sm:w-20 sm:pr-2">Soru</th>
              <th className="pr-1.5 font-medium sm:w-20 sm:pr-2">D</th>
              <th className="pr-1.5 font-medium sm:w-20 sm:pr-2">Y</th>
              <th className="pr-1.5 font-medium sm:w-20 sm:pr-2">B</th>
              <th className="pr-1 text-right font-medium sm:w-20">Net</th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((r, i) => {
              const { c, ok } = rowState[i];
              const rowErr = Object.entries(errors).find(([k]) => k.startsWith(`satirlar.${i}.`))?.[1];
              return (
                <Fragment key={r.ders}>
                  <tr className="border-t border-line sm:hidden">
                    <td colSpan={5} className="pl-1 pt-2.5 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(r.ders) }} />
                        {r.ders}
                      </span>
                    </td>
                  </tr>
                  <tr className="sm:border-t sm:border-line">
                    <td className="hidden py-2 pl-1 pr-2 sm:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(r.ders) }} />
                        {r.ders}
                      </span>
                    </td>
                    {(['soru', 'dogru', 'yanlis'] as const).map((k) => (
                      <td key={k} className="py-1.5 pr-1.5 sm:pr-2">
                        <input
                          aria-label={`${r.ders} ${LABELS[k]}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className={inputSm}
                          value={r[k]}
                          onChange={(e) => setRow(i, { [k]: e.target.value })}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 pr-1.5 sm:pr-2">
                      <input
                        aria-label={`${r.ders} boş`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className={inputSm}
                        value={r.bosManual ? r.bos : isRowEmpty(r) ? '' : autoBlank(r.soru, r.dogru, r.yanlis)}
                        onChange={(e) => setRow(i, { bos: e.target.value, bosManual: true })}
                      />
                    </td>
                    <td className="pr-1 text-right font-display font-semibold tabular-nums">{ok ? formatNet(net(c.dogru, c.yanlis)) : '—'}</td>
                  </tr>
                  {rowErr && (
                    <tr>
                      <td colSpan={6} role="alert" className="pb-2 pl-1 text-xs text-bad">{rowErr}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <td colSpan={5} className="py-3 pl-1 font-medium">Toplam net</td>
              <td data-testid="exam-total" className="pr-1 text-right font-display text-xl font-semibold tabular-nums">{formatNet(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {errors.satirlar && <p role="alert" className="text-sm text-bad">{errors.satirlar}</p>}
      <p className="text-xs text-muted">Doğru ve yanlışı boş bırakılan dersler kaydedilmez.</p>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {savedAt && <p role="status" className="text-sm font-medium text-good">Kaydedildi</p>}
        {editing && (
          <button type="button" className={btnGhost} onClick={onDone}>Vazgeç</button>
        )}
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Kaydediliyor…' : editing ? 'Denemeyi güncelle' : 'Denemeyi kaydet'}
        </button>
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

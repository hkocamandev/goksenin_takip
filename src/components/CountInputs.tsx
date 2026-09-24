import type { ChangeEvent } from 'react';
import { autoBlank, type CountDraft } from '../lib/drafts';
import type { FieldErrors } from '../lib/types';
import { Field } from './Field';
import { inputCls } from './ui';

export function CountInputs({ value, onChange, errors }: { value: CountDraft; onChange: (v: CountDraft) => void; errors: FieldErrors }) {
  const bos = value.bosManual ? value.bos : autoBlank(value.soru, value.dogru, value.yanlis);
  const set = (k: 'soru' | 'dogru' | 'yanlis') => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const num = { type: 'number', inputMode: 'numeric', min: 0, step: 1, className: inputCls } as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Soru" error={errors.soru}>
        <input {...num} min={1} value={value.soru} onChange={set('soru')} />
      </Field>
      <Field label="Doğru" error={errors.dogru}>
        <input {...num} value={value.dogru} onChange={set('dogru')} />
      </Field>
      <Field label="Yanlış" error={errors.yanlis}>
        <input {...num} value={value.yanlis} onChange={set('yanlis')} />
      </Field>
      <Field label="Boş" error={errors.bos} hint={value.bosManual ? 'elle girildi' : 'otomatik'}>
        <input {...num} value={bos} onChange={(e) => onChange({ ...value, bos: e.target.value, bosManual: true })} />
      </Field>
    </div>
  );
}

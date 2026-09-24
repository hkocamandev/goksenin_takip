import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';
import { btnSm, inputSm } from './ui';

export function EditableName({ value, onSave }: { value: string; onSave: (v: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate" title={value}>{value}</span>
        <IconButton label={`${value} yeniden adlandır`} onClick={() => { setText(value); setEditing(true); }}>
          <Pencil size={15} />
        </IconButton>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || t === value) {
          setEditing(false);
          return;
        }
        setBusy(true);
        const ok = await onSave(t);
        setBusy(false);
        if (ok) setEditing(false);
      }}
    >
      <input aria-label="Yeni ad" autoFocus className={`${inputSm} max-w-64 text-left`} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className={btnSm} disabled={busy}>Kaydet</button>
      <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setEditing(false)}>İptal</button>
    </form>
  );
}

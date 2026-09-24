import type { ReactNode } from 'react';

// Hata ve ipucu <label> dışında: erişilebilir ad yalnızca etiket metnidir (getByLabelText('Soru')).
export function Field({ label, error, hint, className, children }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

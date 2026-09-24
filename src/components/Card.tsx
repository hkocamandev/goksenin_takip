import clsx from 'clsx';
import type { ReactNode } from 'react';

// label verilirse bölüm erişilebilir bir "region" olur (testler within(getByRole('region', { name })) ile kullanır).
export function Card({ className, label, children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={clsx('rounded-2xl border border-line bg-surface p-4 sm:p-5', className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {actions}
    </div>
  );
}

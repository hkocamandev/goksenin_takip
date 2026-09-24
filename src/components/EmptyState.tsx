export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    </div>
  );
}

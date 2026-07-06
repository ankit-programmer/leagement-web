/** Friendly dashed-border empty state with a muted helper line and optional CTA. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline-strong px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

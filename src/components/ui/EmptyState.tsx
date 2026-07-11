/** Friendly dashed-border empty state: tinted icon, muted helper, optional CTA. */
export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  /** A heroicon element; rendered inside a brand-tinted circle for warmth. */
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline-strong px-6 py-12 text-center">
      {icon ? (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

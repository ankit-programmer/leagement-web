type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-tint text-brand-dark dark:text-brand-light",
  success: "bg-success-bg text-success-ink",
  warning: "bg-warning-bg text-warning-ink",
  danger: "bg-danger-bg text-danger-ink",
  neutral: "bg-surface-subtle text-ink-muted",
};

export function Pill({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

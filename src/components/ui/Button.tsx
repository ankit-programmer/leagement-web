"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  // Hover = darken + shadow steps UP the scale (the rtlayer lift) — buttons
  // should feel press-ready, not painted on.
  primary:
    "bg-brand text-white shadow-brand hover:bg-brand-hover hover:shadow-brand-hover disabled:hover:bg-brand disabled:hover:shadow-brand dark:text-slate-950",
  secondary:
    "bg-surface text-ink border border-hairline shadow-soft hover:bg-surface-subtle hover:shadow-card",
  ghost: "text-ink-muted hover:bg-surface-subtle hover:text-ink",
  danger: "bg-danger-bg text-danger-ink border border-danger/30 hover:border-danger/60",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Swaps the label while a mutation runs ("Save" → "Saving…") — never a spinner. */
  busy?: boolean;
  busyLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", busy = false, busyLabel, className = "", children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn px-3.5 py-2 text-sm font-semibold transition-[color,background-color,border-color,transform,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:opacity-60 motion-safe:enabled:active:scale-[0.97] ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
});

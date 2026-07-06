"use client";

import { forwardRef, useId } from "react";

const FIELD_CLASSES =
  "w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-transparent";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(function Input({ label, className = "", ...props }, ref) {
  const id = useId();
  const field = <input ref={ref} id={id} className={`${FIELD_CLASSES} ${className}`} {...props} />;
  if (!label) return field;
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</span>
      {field}
    </label>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(function Textarea({ label, className = "", ...props }, ref) {
  const id = useId();
  const field = (
    <textarea ref={ref} id={id} className={`${FIELD_CLASSES} min-h-24 ${className}`} {...props} />
  );
  if (!label) return field;
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</span>
      {field}
    </label>
  );
});

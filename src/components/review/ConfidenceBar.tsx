"use client";

import type { Confidence } from "@/lib/types";

/** Reveal buttons that carry the pre-reveal confidence judgment — zero added friction. */
const LEVELS: Array<{ confidence: Confidence; label: string; key: string; classes: string }> = [
  {
    confidence: 1,
    label: "No idea",
    key: "1",
    classes: "border-danger/40 text-danger-ink bg-danger-bg hover:border-danger",
  },
  {
    confidence: 2,
    label: "Think so",
    key: "2",
    classes: "border-warning/40 text-warning-ink bg-warning-bg hover:border-warning",
  },
  {
    confidence: 3,
    label: "Sure",
    key: "3",
    classes: "border-success/40 text-success-ink bg-success-bg hover:border-success",
  },
];

export function ConfidenceBar({ onReveal }: { onReveal: (confidence?: Confidence) => void }) {
  return (
    <div className="w-full max-w-xl space-y-1.5">
      <p className="text-center text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
        How sure are you? (reveals the answer)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map(({ confidence, label, key, classes }) => (
          <button
            key={confidence}
            type="button"
            onClick={() => onReveal(confidence)}
            className={`flex flex-col items-center gap-0.5 rounded-btn border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${classes}`}
          >
            {label}
            <kbd className="font-mono text-[10px] font-normal opacity-60">{key}</kbd>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onReveal(undefined)}
        className="w-full text-center text-xs text-ink-faint hover:text-ink-muted"
      >
        just show it <kbd className="font-mono text-[10px]">space</kbd>
      </button>
    </div>
  );
}

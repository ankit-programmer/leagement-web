"use client";

import type { Rating } from "@/lib/types";

const GRADES: Array<{ rating: Rating; label: string; key: string; classes: string }> = [
  {
    rating: 1,
    label: "Again",
    key: "1",
    classes: "border-danger/40 text-danger-ink bg-danger-bg hover:border-danger",
  },
  {
    rating: 2,
    label: "Hard",
    key: "2",
    classes: "border-warning/40 text-warning-ink bg-warning-bg hover:border-warning",
  },
  {
    rating: 3,
    label: "Good",
    key: "3",
    classes: "border-brand/40 text-brand-dark dark:text-brand-light bg-brand-tint hover:border-brand",
  },
  {
    rating: 4,
    label: "Easy",
    key: "4",
    classes: "border-success/40 text-success-ink bg-success-bg hover:border-success",
  },
];

export function GradeBar({ onGrade, disabled }: { onGrade: (rating: Rating) => void; disabled: boolean }) {
  return (
    <div className="grid w-full max-w-xl grid-cols-4 gap-2">
      {GRADES.map(({ rating, label, key, classes }) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(rating)}
          className={`flex flex-col items-center gap-0.5 rounded-btn border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${classes}`}
        >
          {label}
          <kbd className="font-mono text-[10px] font-normal opacity-60">{key}</kbd>
        </button>
      ))}
    </div>
  );
}

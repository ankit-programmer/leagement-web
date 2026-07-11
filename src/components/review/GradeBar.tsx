"use client";

import type { Rating } from "@/lib/types";

const GRADES: Array<{ rating: Rating; label: string; key: string; classes: string }> = [
  {
    rating: 1,
    label: "Again",
    key: "1",
    classes: "border-danger/40 text-danger-ink bg-danger-bg hover:border-danger active:border-danger active:bg-danger/25",
  },
  {
    rating: 2,
    label: "Hard",
    key: "2",
    classes: "border-warning/40 text-warning-ink bg-warning-bg hover:border-warning active:border-warning active:bg-warning/25",
  },
  {
    rating: 3,
    label: "Good",
    key: "3",
    classes:
      "border-brand/40 text-brand-dark dark:text-brand-light bg-brand-tint hover:border-brand active:border-brand active:bg-brand/25",
  },
  {
    rating: 4,
    label: "Easy",
    key: "4",
    classes: "border-success/40 text-success-ink bg-success-bg hover:border-success active:border-success active:bg-success/25",
  },
];

/** The most-pressed buttons in the product: press = scale + tone fill flash.
 *  Pure CSS feedback — grading itself is never delayed. */
const PRESS =
  "transition-[color,background-color,border-color,transform,box-shadow] duration-150 motion-safe:enabled:active:scale-[0.96] hover:shadow-soft";

export function GradeBar({ onGrade, disabled }: { onGrade: (rating: Rating) => void; disabled: boolean }) {
  return (
    <div className="grid w-full max-w-xl grid-cols-4 gap-2">
      {GRADES.map(({ rating, label, key, classes }) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(rating)}
          className={`flex flex-col items-center gap-0.5 rounded-btn border px-3 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${PRESS} ${classes}`}
        >
          {label}
          <kbd className="rounded border border-current/25 px-1 font-mono text-[10px] font-normal leading-4 opacity-60">
            {key}
          </kbd>
        </button>
      ))}
    </div>
  );
}

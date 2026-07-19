import type { ErrorClass, ProblemResult } from "@/lib/queries/problems";

export const RESULT_META: Record<ProblemResult, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  solved_in_cap: { label: "Solved in time", tone: "success" },
  solved_over: { label: "Solved, over time", tone: "warning" },
  needed_editorial: { label: "Needed editorial", tone: "danger" },
  wrong_approach: { label: "Wrong approach", tone: "danger" },
};

/**
 * The post-mortem error taxonomy with each class's PRESCRIBED FIX — the point
 * of classifying is that every class names a cure (interview notes: postmortem.md).
 */
export const ERROR_CLASS_META: Record<ErrorClass, { label: string; hint: string; fix: string }> = {
  misread: {
    label: "Misread the problem",
    hint: "solved a different problem; missed a constraint or the return format",
    fix: "SPEC-block ritual next session + make a trap card of the exact phrase you misread",
  },
  classification: {
    label: "Wrong pattern",
    hint: "never considered the right technique",
    fix: "trigger card (cue → pattern) + 10 spec-only drills on this pattern's confusable neighbors",
  },
  construction: {
    label: "Right pattern, wrong build",
    hint: "knew it was DP/BFS but built the wrong state/graph",
    fix: "worked-example route on 3 problems of this pattern: read, self-explain, re-derive",
  },
  implementation: {
    label: "Implementation bug",
    hint: "right algorithm; off-by-one, boundary, typo",
    fix: "variable-table trace before declaring done + card the specific idiom (e.g. the lo<hi form)",
  },
  verification: {
    label: "Skipped verification",
    hint: "submitted confidently, failed on an edge case",
    fix: "adversarial-input checklist becomes mandatory; note WHICH edge class you skipped",
  },
  complexity: {
    label: "Too slow (TLE)",
    hint: "correct but the complexity was never going to pass",
    fix: "read constraints → target complexity BEFORE planning, out loud, every problem",
  },
  time_bleed: {
    label: "Ran out of time",
    hint: "right approach, clock died",
    fix: "check the time split — the fattest phase gets a hard cap next week",
  },
  other: { label: "Other", hint: "", fix: "" },
};

export const TIME_PHASES = [
  { key: "timeUnderstand", label: "Understand" },
  { key: "timeClassify", label: "Classify" },
  { key: "timePlan", label: "Plan" },
  { key: "timeCode", label: "Code" },
  { key: "timeDebug", label: "Debug" },
] as const;

/** ISO timestamp → value for <input type="date">. */
export function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Date-input value → ISO at local noon (avoids timezone-boundary drift on "due today"). */
export function fromDateInput(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function dueLabel(nextDue: string): { text: string; overdue: boolean } {
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return { text: "due today", overdue: true };
  if (days === 1) return { text: "due tomorrow", overdue: false };
  return { text: `due in ${days}d`, overdue: false };
}

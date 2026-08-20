"use client";

import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import type { ProblemListRow, ProblemStats } from "@/lib/queries/problems";
import { learningDayKey } from "./meta";

const DAY_MS = 86_400_000;
const TARGET_KEY = "leagement.practiceDailyTarget";

function weekdayLabel(offsetDays: number): string {
  if (offsetDays === 0) return "today";
  const d = new Date(Date.now() + offsetDays * DAY_MS);
  return d.toLocaleDateString("en", { weekday: "short" });
}

/** Problems due per upcoming learning day; overdue rolls into today (index 0). */
export function upcomingLoad(problems: ProblemListRow[], days: number): number[] {
  const todayKey = learningDayKey(new Date());
  const buckets = new Array<number>(days).fill(0);
  for (const problem of problems) {
    if (problem.status !== "active") continue;
    const offset = learningDayKey(new Date(problem.nextDue)) - todayKey;
    if (offset <= 0) buckets[0] += 1;
    else if (offset < days) buckets[offset] += 1;
  }
  return buckets;
}

export function useDailyTarget(): [number | null, (next: number | null) => void] {
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    const raw = window.localStorage.getItem(TARGET_KEY);
    if (raw) setTarget(Number(raw) || null);
  }, []);
  const update = (next: number | null) => {
    setTarget(next);
    if (next === null) window.localStorage.removeItem(TARGET_KEY);
    else window.localStorage.setItem(TARGET_KEY, String(next));
  };
  return [target, update];
}

/**
 * Next-14-days schedule load. The target line is USER-set (never assumed),
 * stored locally; days over target turn red, empty days are visibly empty —
 * both over-allocation and dead days show at a glance.
 */
export function UpcomingLoadChart({ problems }: { problems: ProblemListRow[] }) {
  const [target, setTarget] = useDailyTarget();
  const buckets = upcomingLoad(problems, 14);
  const max = Math.max(1, target ?? 0, ...buckets);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold tracking-[-0.01em]">Schedule ahead</h2>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>daily target:</span>
          <button
            type="button"
            aria-label="Decrease target"
            onClick={() => setTarget(target && target > 1 ? target - 1 : null)}
            className="rounded-full p-1 hover:bg-surface-subtle hover:text-ink"
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center font-mono font-bold text-ink">{target ?? "—"}</span>
          <button
            type="button"
            aria-label="Increase target"
            onClick={() => setTarget((target ?? 0) + 1)}
            className="rounded-full p-1 hover:bg-surface-subtle hover:text-ink"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative mt-3">
        {target ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-ink-faint/60"
            style={{ bottom: `${Math.round((target / max) * 100)}%` }}
            aria-hidden
          />
        ) : null}
        <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Problems scheduled per day, next 14 days">
          {buckets.map((count, i) => {
            const over = target !== null && count > target;
            return (
              <div key={i} className="group relative flex h-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-[4px] transition-opacity group-hover:opacity-80 ${
                    over ? "bg-danger" : i === 0 ? "bg-brand" : "bg-brand/60"
                  }`}
                  style={{ height: `${Math.round((count / max) * 100)}%`, minHeight: count > 0 ? 3 : 0 }}
                />
                <div className="pointer-events-none absolute -top-7 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-0.5 font-mono text-[10px] text-page shadow-raised group-hover:block">
                  {count} · {weekdayLabel(i)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between border-t border-hairline pt-1 font-mono text-[10px] text-ink-faint">
        <span>today</span>
        {target ? <span>target {target}/day</span> : <span>set a target to flag heavy days</span>}
        <span>+14d</span>
      </div>
    </div>
  );
}

const RANGE_KEY = "leagement.sessionsRange";
const RANGES = [30, 60, 90] as const;

/** Sessions per day over a selectable 30/60/90-day range — solved-in-cap portion in green (watch it grow). */
export function ActivityChart({ data }: { data: NonNullable<ProblemStats["attemptsByDay"]> }) {
  const [range, setRange] = useState<number>(30);
  useEffect(() => {
    const raw = Number(window.localStorage.getItem(RANGE_KEY));
    if (RANGES.includes(raw as (typeof RANGES)[number])) setRange(raw);
  }, []);
  const pickRange = (days: number) => {
    setRange(days);
    window.localStorage.setItem(RANGE_KEY, String(days));
  };

  const byDate = new Map(data.map((d) => [d.date, d]));
  const series: Array<{ label: string; total: number; solved: number }> = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDate.get(key);
    series.push({ label: key.slice(5), total: row?.total ?? 0, solved: row?.solved ?? 0 });
  }
  const max = Math.max(1, ...series.map((d) => d.total));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold tracking-[-0.01em]">Sessions</h2>
        <div className="flex gap-1 text-xs">
          {RANGES.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => pickRange(days)}
              className={`rounded-chip px-2 py-0.5 font-mono font-bold transition-colors ${
                range === days ? "bg-brand-tint text-brand-dark dark:text-brand-light" : "text-ink-faint hover:text-ink"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>
      <div
        className={`mt-3 flex h-24 items-end ${range > 30 ? "gap-px" : "gap-[2px]"}`}
        role="img"
        aria-label={`Practice sessions per day, last ${range} days`}
      >
        {series.map((day, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-[3px] bg-brand/50 transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.round(((day.total - day.solved) / max) * 100)}%`, minHeight: day.total > day.solved ? 2 : 0 }}
            />
            <div
              className="w-full bg-success transition-opacity group-hover:opacity-80"
              style={{
                height: `${Math.round((day.solved / max) * 100)}%`,
                minHeight: day.solved > 0 ? 2 : 0,
                borderRadius: day.total === day.solved ? "3px 3px 0 0" : 0,
              }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-0.5 font-mono text-[10px] text-page shadow-raised group-hover:block">
              {day.total} ({day.solved} solved) · {day.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between border-t border-hairline pt-1 font-mono text-[10px] text-ink-faint">
        <span>{series[0]?.label}</span>
        <span className="text-success-ink">■ solved in cap</span>
        <span>{series.at(-1)?.label}</span>
      </div>
    </div>
  );
}

/** Seven-day strip for date picking: shows each day's existing load; click = pick. */
export function MiniDayPicker({
  problems,
  value,
  onPick,
}: {
  problems: ProblemListRow[];
  /** yyyy-mm-dd of the currently chosen date. */
  value: string;
  onPick: (dateInputValue: string) => void;
}) {
  const buckets = upcomingLoad(problems, 8);
  const [target] = useDailyTarget();
  const chips = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.now() + i * DAY_MS);
    const inputValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const selected = value === inputValue;
    const over = target !== null && (buckets[i] ?? 0) >= target;
    chips.push(
      <button
        key={i}
        type="button"
        onClick={() => onPick(inputValue)}
        className={`flex min-w-11 flex-col items-center rounded-field border px-1.5 py-1 transition-colors ${
          selected ? "border-brand bg-brand-tint" : "border-hairline bg-surface hover:border-hairline-strong"
        }`}
        title={`${buckets[i] ?? 0} scheduled`}
      >
        <span className={`text-[10px] font-bold uppercase ${selected ? "text-brand-dark dark:text-brand-light" : "text-ink-faint"}`}>
          {i === 0 ? "today" : new Date(Date.now() + i * DAY_MS).toLocaleDateString("en", { weekday: "short" })}
        </span>
        <span className={`font-mono text-xs font-bold ${over ? "text-danger" : "text-ink-secondary"}`}>{buckets[i] ?? 0}</span>
      </button>,
    );
  }
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">{chips}</div>
      <p className="mt-1 text-xs text-ink-faint">Numbers = problems already scheduled that day. Tap to pick.</p>
    </div>
  );
}

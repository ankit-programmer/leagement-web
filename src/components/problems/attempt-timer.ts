"use client";

import { useEffect, useState } from "react";
import type { TIME_PHASES } from "./meta";

export type PhaseKey = (typeof TIME_PHASES)[number]["key"];

export interface ActiveAttempt {
  problemId: string;
  problemName: string;
  startedAt: number;
  capMinutes: number;
  /** Lap stamps; marks[0] is the start (phase Understand). */
  marks: Array<{ phase: PhaseKey; at: number }>;
}

export interface FinishedAttempt {
  problemId: string;
  totalMinutes: number;
  /** Whole minutes per phase (only phases that were used). */
  phaseMinutes: Partial<Record<PhaseKey, number>>;
}

const ACTIVE_KEY = "leagement.activeAttempt";
const FINISHED_KEY = "leagement.finishedAttempt";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readActiveAttempt(): ActiveAttempt | null {
  const attempt = read<ActiveAttempt>(ACTIVE_KEY);
  return attempt && typeof attempt.startedAt === "number" && attempt.marks?.length ? attempt : null;
}

export function startAttempt(problemId: string, problemName: string, capMinutes: number): ActiveAttempt {
  const attempt: ActiveAttempt = {
    problemId,
    problemName,
    startedAt: Date.now(),
    capMinutes,
    marks: [{ phase: "timeUnderstand", at: Date.now() }],
  };
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(attempt));
  return attempt;
}

/** Stamp a phase switch. Re-tapping the current phase is a no-op. */
export function markPhase(phase: PhaseKey): ActiveAttempt | null {
  const attempt = readActiveAttempt();
  if (!attempt) return null;
  if (attempt.marks.at(-1)?.phase === phase) return attempt;
  attempt.marks.push({ phase, at: Date.now() });
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(attempt));
  return attempt;
}

/** Interval per phase, summed across laps, in whole minutes (≥1 for any used phase). */
export function phaseSplit(attempt: ActiveAttempt, endAt = Date.now()): FinishedAttempt {
  const ms: Partial<Record<PhaseKey, number>> = {};
  for (let i = 0; i < attempt.marks.length; i++) {
    const mark = attempt.marks[i]!;
    const next = attempt.marks[i + 1]?.at ?? endAt;
    ms[mark.phase] = (ms[mark.phase] ?? 0) + Math.max(0, next - mark.at);
  }
  const phaseMinutes: Partial<Record<PhaseKey, number>> = {};
  for (const [phase, value] of Object.entries(ms) as Array<[PhaseKey, number]>) {
    phaseMinutes[phase] = Math.max(1, Math.round(value / 60_000));
  }
  const totalMinutes = Math.max(1, Math.round((endAt - attempt.startedAt) / 60_000));
  return { problemId: attempt.problemId, totalMinutes, phaseMinutes };
}

/** End the attempt: stash the computed split for the log page and clear the timer. */
export function finishAttempt(): FinishedAttempt | null {
  const attempt = readActiveAttempt();
  if (!attempt) return null;
  const finished = phaseSplit(attempt);
  window.localStorage.setItem(FINISHED_KEY, JSON.stringify(finished));
  window.localStorage.removeItem(ACTIVE_KEY);
  return finished;
}

export function discardAttempt(): void {
  window.localStorage.removeItem(ACTIVE_KEY);
}

export function takeFinishedAttempt(problemId: string): FinishedAttempt | null {
  const finished = read<FinishedAttempt>(FINISHED_KEY);
  return finished && finished.problemId === problemId ? finished : null;
}

export function clearFinishedAttempt(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(FINISHED_KEY);
}

/**
 * Live view of the active attempt: re-reads on a 1s tick (elapsed time is
 * derived from timestamps, so sleep/tab-switch cost nothing) and on storage
 * events (another tab starting/finishing an attempt).
 */
export function useActiveAttempt(): { attempt: ActiveAttempt | null; elapsedMs: number } {
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const sync = () => {
      const current = readActiveAttempt();
      setAttempt(current);
      setElapsedMs(current ? Date.now() - current.startedAt : 0);
    };
    sync();
    const timer = window.setInterval(sync, 1000);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { attempt, elapsedMs };
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

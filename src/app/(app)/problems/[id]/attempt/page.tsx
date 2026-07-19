"use client";

import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, FlagIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type PhaseKey,
  discardAttempt,
  finishAttempt,
  formatClock,
  markPhase,
  readActiveAttempt,
  startAttempt,
  useActiveAttempt,
} from "@/components/problems/attempt-timer";
import { TIME_PHASES } from "@/components/problems/meta";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProblem } from "@/lib/queries/problems";

const CAPS = [25, 35, 45];

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: problem, isLoading, isError, error, refetch } = useProblem(id);
  const { attempt, elapsedMs } = useActiveAttempt();
  const [cap, setCap] = useState(25);
  // Bump to re-render immediately after a lap tap (the hook ticks at 1s).
  const [, setLapNonce] = useState(0);

  const mine = attempt?.problemId === id ? attempt : null;
  const otherAttempt = attempt && attempt.problemId !== id ? attempt : null;
  const capMs = (mine?.capMinutes ?? cap) * 60_000;
  const remainingMs = capMs - elapsedMs;
  const zone: "ok" | "warn" | "over" = mine
    ? remainingMs <= 0
      ? "over"
      : remainingMs <= 5 * 60_000
        ? "warn"
        : "ok"
    : "ok";

  // The clock lives in the tab title so it's visible from the LeetCode tab.
  useEffect(() => {
    if (!mine) return;
    document.title = `${zone === "over" ? "⏰ " : ""}${formatClock(elapsedMs)} · ${mine.problemName}`;
    return () => {
      document.title = "Leagement";
    };
  }, [mine, elapsedMs, zone]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !problem) return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;

  const activePhase: PhaseKey = mine?.marks.at(-1)?.phase ?? "timeUnderstand";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/problems/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" /> {problem.name}
      </Link>

      {otherAttempt ? (
        <div className="space-y-3 rounded-card border border-hairline bg-warning-bg p-4 text-sm text-warning-ink">
          <p>
            An attempt on <span className="font-bold">{otherAttempt.problemName}</span> is already running (
            {formatClock(elapsedMs)}). One attempt at a time — finish or discard it first.
          </p>
          <div className="flex gap-2">
            <Link href={`/problems/${otherAttempt.problemId}/attempt`}>
              <Button variant="secondary">Resume it</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                discardAttempt();
                setLapNonce((n) => n + 1);
              }}
            >
              <TrashIcon className="h-4 w-4" /> Discard it
            </Button>
          </div>
        </div>
      ) : !mine ? (
        /* ---- Pre-start ---- */
        <div className="rounded-card border border-hairline bg-surface p-6 text-center shadow-card">
          <p className="font-mono text-6xl font-bold tracking-[-0.03em] text-ink-faint">00:00</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Cap</span>
            {CAPS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setCap(minutes)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                  cap === minutes ? "bg-brand-tint text-brand-dark dark:text-brand-light" : "bg-surface-subtle text-ink-muted hover:text-ink"
                }`}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            When the cap rings you&apos;ve earned the editorial — minutes past it are thrash, not learning.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              onClick={() => {
                startAttempt(problem.id, problem.name, cap);
                setLapNonce((n) => n + 1);
                if (problem.url) window.open(problem.url, "_blank", "noopener");
              }}
            >
              Start attempt{problem.url ? " + open problem" : ""}
            </Button>
          </div>
          <Link href={`/problems/${id}/log`} className="mt-3 inline-block text-xs font-semibold text-ink-faint hover:text-ink">
            log a session without the timer →
          </Link>
        </div>
      ) : (
        /* ---- Running ---- */
        <div
          className={`rounded-card border p-6 text-center shadow-card transition-colors ${
            zone === "over"
              ? "border-danger/40 bg-danger-bg/40"
              : zone === "warn"
                ? "border-warning/40 bg-warning-bg/40"
                : "border-hairline bg-surface"
          }`}
        >
          <p
            className={`font-mono text-6xl font-bold tracking-[-0.03em] ${
              zone === "over" ? "text-danger-ink" : zone === "warn" ? "text-warning-ink" : "text-ink"
            }`}
          >
            {formatClock(elapsedMs)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            cap {mine.capMinutes} min ·{" "}
            {zone === "over" ? (
              <span className="font-bold text-danger-ink">
                Timer&apos;s done — you&apos;ve earned the editorial. Stop and log.
              </span>
            ) : (
              `${formatClock(remainingMs)} left`
            )}
          </p>
          <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-surface-subtle">
            <div
              className={`h-full rounded-full transition-all ${
                zone === "over" ? "bg-danger" : zone === "warn" ? "bg-warning" : "bg-brand"
              }`}
              style={{ width: `${Math.min(100, (elapsedMs / capMs) * 100)}%` }}
            />
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
              <FlagIcon className="mr-1 inline h-3.5 w-3.5" />
              Phase — tap when you switch (optional, feeds the time split)
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {TIME_PHASES.map((phase) => (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => {
                    markPhase(phase.key);
                    setLapNonce((n) => n + 1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activePhase === phase.key
                      ? "bg-brand text-white"
                      : "bg-surface-subtle text-ink-muted hover:text-ink"
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                finishAttempt();
                router.push(`/problems/${id}/log`);
              }}
            >
              Finish → post-mortem
            </Button>
            {problem.url ? (
              <a href={problem.url} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Problem
                </Button>
              </a>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                if (window.confirm("Discard this attempt? The timer data is lost.")) {
                  discardAttempt();
                  setLapNonce((n) => n + 1);
                }
              }}
            >
              <TrashIcon className="h-4 w-4" /> Discard
            </Button>
          </div>
        </div>
      )}

      {problem.description ? (
        <section className="rounded-card border border-hairline bg-surface-subtle/60 p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Description / SPEC</h3>
          <div className="prose-sm mt-2 max-w-none text-sm">
            <Markdown>{problem.description}</Markdown>
          </div>
        </section>
      ) : null}
    </div>
  );
}

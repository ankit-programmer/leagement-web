"use client";

import { PauseCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfidenceBar } from "@/components/review/ConfidenceBar";
import { Confetti } from "@/components/review/Confetti";
import { GradeBar } from "@/components/review/GradeBar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useCountUp } from "@/hooks/useCountUp";
import { useReviewSession } from "@/hooks/useReviewSession";
import { crossedMilestone } from "@/lib/milestones";
import { useDecks } from "@/lib/queries/decks";
import { type OverviewStats, useOverviewStats } from "@/lib/queries/stats";
import type { Confidence } from "@/lib/types";

/** Live M:SS countdown to the next learning-step card. */
function Countdown({ dueAt }: { dueAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(dueAt).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <span className="font-mono">
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

/** The break ring drains as the next learning card approaches. */
function CountdownRing({ dueAt }: { dueAt: string }) {
  const [now, setNow] = useState(Date.now());
  // The wait total is captured once — the ring empties from full.
  const [total] = useState(() => Math.max(1000, new Date(dueAt).getTime() - Date.now()));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(dueAt).getTime() - now);
  const fraction = Math.min(1, remaining / total);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--hairline)" strokeWidth="4" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl">☕</span>
    </div>
  );
}

function SummaryTile({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <div
      className="animate-pop-in rounded-badge border border-hairline bg-surface-subtle px-3 py-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-mono text-xl font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</p>
    </div>
  );
}

/** The payoff moment: confetti, a big counted-up number, and visual stats. */
function SessionSummary({
  reviewed,
  again,
  sureRecalled,
  sureTotal,
  minutes,
  overview,
  milestone,
  quotaNote,
  deckId,
}: {
  reviewed: number;
  again: number;
  sureRecalled: number;
  sureTotal: number;
  minutes: number;
  overview: OverviewStats | undefined;
  milestone: number | null;
  quotaNote: boolean;
  deckId: string;
}) {
  const bigNumber = useCountUp(reviewed);
  const recalledPct = reviewed > 0 ? Math.round(((reviewed - again) / reviewed) * 100) : 0;
  const streak = overview?.streakDays ?? 0;
  const personalBest = streak > 1 && streak === overview?.bestStreak;

  if (reviewed === 0) {
    return (
      <Card className="w-full animate-fade-up">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="text-4xl">🎉</span>
          <h1 className="text-xl font-bold tracking-[-0.025em]">All caught up</h1>
          <p className="text-sm text-ink-muted">Nothing due right now — come back when the schedule calls.</p>
          <Link href={`/decks/${deckId}`}>
            <Button>Back to deck</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative w-full animate-fade-up overflow-hidden">
      <Confetti />
      <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
        <div>
          <p className="font-mono text-5xl font-bold tracking-[-0.03em]">{bigNumber}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
            review{reviewed === 1 ? "" : "s"} · session complete
          </p>
        </div>

        <div className="grid w-full max-w-sm grid-cols-3 gap-2">
          <SummaryTile value={`${recalledPct}%`} label="recalled" delay={150} />
          <SummaryTile value={`~${minutes}m`} label="time" delay={250} />
          <SummaryTile value={streak > 0 ? `🔥${streak}` : "—"} label="streak" delay={350} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {personalBest ? (
            <span
              className="animate-pop-in rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success-ink"
              style={{ animationDelay: "450ms" }}
            >
              🔥 Personal-best streak
            </span>
          ) : null}
          {milestone ? (
            <span
              className="animate-pop-in rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark dark:text-brand-light"
              style={{ animationDelay: "500ms" }}
            >
              🏅 {milestone.toLocaleString()} reviews all-time
            </span>
          ) : null}
        </div>

        {sureTotal > 0 ? (
          <p className="text-sm text-ink-muted">
            &ldquo;Sure&rdquo; answers: {sureRecalled}/{sureTotal} actually recalled
          </p>
        ) : null}
        {quotaNote ? (
          <p className="text-sm text-ink-muted">
            Daily new-card limit reached — fresh cards resume tomorrow (protecting your future review load).
          </p>
        ) : null}

        <Link href={`/decks/${deckId}`}>
          <Button>Back to deck</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const searchParams = useSearchParams();
  const isPractice = searchParams.get("mode") === "practice";
  const session = useReviewSession(deckId, { practice: isPractice });
  const { revealed, reveal, grade, current, finished, typedAnswer, setTypedAnswer } = session;
  const queryClient = useQueryClient();
  const { data: overview } = useOverviewStats();
  const { data: decksList } = useDecks();
  const deckHasNew = (decksList?.find((d) => d.id === deckId)?.counts.new ?? 0) > 0;
  const practiceTitle = isPractice
    ? queryClient.getQueryData<{ title: string }>(["practice", deckId])?.title
    : undefined;

  // The summary is the moment of reward — refresh streak/total for it.
  useEffect(() => {
    if (finished) queryClient.invalidateQueries({ queryKey: ["stats", "overview"] });
  }, [finished, queryClient]);
  const milestone =
    finished && overview ? crossedMilestone(overview.totalReviews, session.stats.reviewed) : null;

  // Keyboard-first: pre-reveal 1/2/3 reveal with confidence, space/enter without;
  // post-reveal 1–4 grade. Ignored while typing in the answer box.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!revealed) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          reveal(undefined);
        } else if (["1", "2", "3"].includes(event.key)) {
          event.preventDefault();
          reveal(Number(event.key) as Confidence);
        }
      } else if (["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        grade(Number(event.key) as 1 | 2 | 3 | 4);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, reveal, grade]);

  const minutes = Math.max(1, Math.round((Date.now() - session.stats.startedAt) / 60_000));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <p className="truncate font-mono text-sm text-ink-muted">
          {isPractice ? `⚡ ${practiceTitle ?? "practice"} · ` : ""}
          {session.loading ? "" : finished ? "done" : session.waiting ? "break" : `${session.remaining} left`}
        </p>
        <div className="flex items-center gap-1">
          {current ? (
            <button
              type="button"
              aria-label="Suspend this card — set it aside for later"
              title="Set aside — I don't understand this yet"
              onClick={() => session.suspendCurrent()}
              className="rounded-chip p-2 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <PauseCircleIcon className="h-5 w-5" />
            </button>
          ) : null}
          <Link
            href={`/decks/${deckId}`}
            aria-label="End session"
            className="rounded-chip p-2 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
          >
            <XMarkIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        {session.loading ? (
          <Card className="w-full">
            <CardContent className="space-y-3 py-10">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </CardContent>
          </Card>
        ) : session.error ? (
          <div className="flex flex-col items-center gap-3">
            <p className="rounded-chip bg-danger-bg px-4 py-3 text-sm text-danger-ink">{session.error}</p>
            <Button variant="secondary" onClick={() => session.retry()}>
              Retry
            </Button>
          </div>
        ) : session.waiting ? (
          <Card className="w-full animate-fade-up">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {session.nextDueAt ? <CountdownRing dueAt={session.nextDueAt} /> : <span className="text-4xl">☕</span>}
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em]">Short break</h1>
                <p className="mt-2 text-sm text-ink-muted">
                  {session.pendingCount} card{session.pendingCount === 1 ? "" : "s"} still learning — back in{" "}
                  {session.nextDueAt ? <Countdown dueAt={session.nextDueAt} /> : "a moment"}. The session
                  resumes automatically.
                </p>
              </div>
              <Link href={`/decks/${deckId}`}>
                <Button variant="secondary">End session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : finished ? (
          <SessionSummary
            reviewed={session.stats.reviewed}
            again={session.stats.again}
            sureRecalled={session.stats.sureRecalled}
            sureTotal={session.stats.sureTotal}
            minutes={minutes}
            overview={overview}
            milestone={milestone}
            quotaNote={session.newQuotaExhausted && deckHasNew}
            deckId={deckId}
          />
        ) : current ? (
          <>
            <Card key={`${current.id}-${session.stats.reviewed}`} className="w-full animate-fade-up">
              <CardContent className="space-y-5 py-8">
                <div className="text-lg">
                  <Markdown>{current.front}</Markdown>
                </div>
                {current.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.imageUrl} alt="" className="max-h-64 rounded-chip" />
                ) : null}
                {!revealed ? (
                  <Textarea
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type your answer (optional — keeps you honest)…"
                    className="min-h-20 text-sm"
                    maxLength={4000}
                  />
                ) : null}
                {/* The answer expands into view (grid-rows trick handles the
                    unknown height); it is decoration on already-revealed state
                    and never gates input. */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    revealed ? "grid-rows-[1fr] opacity-100" : "!mt-0 grid-rows-[0fr] opacity-0"
                  }`}
                  aria-hidden={!revealed}
                >
                  <div className="min-h-0 space-y-5 overflow-hidden">
                    {revealed && typedAnswer.trim() ? (
                      <div className="rounded-chip bg-surface-subtle px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                          You wrote
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-ink-secondary">
                          {typedAnswer}
                        </p>
                      </div>
                    ) : null}
                    <hr
                      className={`border-hairline transition-transform delay-100 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:origin-left ${
                        revealed ? "scale-x-100" : "motion-safe:scale-x-0"
                      }`}
                    />
                    {revealed ? (
                      <div className="text-ink-secondary">
                        <Markdown>{current.back}</Markdown>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div key={revealed ? "grade" : "confidence"} className="flex w-full animate-pop-in justify-center">
              {revealed ? <GradeBar onGrade={grade} disabled={false} /> : <ConfidenceBar onReveal={reveal} />}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

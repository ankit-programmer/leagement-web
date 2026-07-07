"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ConfidenceBar } from "@/components/review/ConfidenceBar";
import { GradeBar } from "@/components/review/GradeBar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useReviewSession } from "@/hooks/useReviewSession";
import { crossedMilestone } from "@/lib/milestones";
import { useOverviewStats } from "@/lib/queries/stats";
import type { Confidence } from "@/lib/types";

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const session = useReviewSession(deckId);
  const { revealed, reveal, grade, current, finished, typedAnswer, setTypedAnswer } = session;
  const queryClient = useQueryClient();
  const { data: overview } = useOverviewStats();

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
        <p className="font-mono text-sm text-ink-muted">
          {session.loading ? "" : finished ? "done" : `${session.remaining} left`}
        </p>
        <Link
          href={`/decks/${deckId}`}
          aria-label="End session"
          className="rounded-chip p-2 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
        >
          <XMarkIcon className="h-5 w-5" />
        </Link>
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
          <p className="rounded-chip bg-danger-bg px-4 py-3 text-sm text-danger-ink">{session.error}</p>
        ) : finished ? (
          <Card className="w-full animate-fade-up">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="text-4xl">🎉</span>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em]">Session complete</h1>
                <p className="mt-2 text-sm text-ink-muted">
                  {session.stats.reviewed} reviews in ~{minutes} min
                  {session.stats.reviewed > 0
                    ? ` · ${Math.round(
                        ((session.stats.reviewed - session.stats.again) / session.stats.reviewed) * 100,
                      )}% recalled`
                    : ""}
                </p>
                {session.stats.sureTotal > 0 ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    &ldquo;Sure&rdquo; answers: {session.stats.sureRecalled}/{session.stats.sureTotal} actually
                    recalled
                  </p>
                ) : null}
                {overview && overview.streakDays > 0 && session.stats.reviewed > 0 ? (
                  <p className="mt-1 text-sm font-semibold text-ink-secondary">
                    🔥 {overview.streakDays}-day streak
                    {overview.streakDays > 1 && overview.streakDays === overview.bestStreak
                      ? " — personal best!"
                      : ""}
                  </p>
                ) : null}
                {milestone ? (
                  <p className="mt-1 text-sm font-semibold text-ink-secondary">
                    🏅 {milestone.toLocaleString()} reviews all-time
                  </p>
                ) : null}
              </div>
              <Link href={`/decks/${deckId}`}>
                <Button>Back to deck</Button>
              </Link>
            </CardContent>
          </Card>
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
                {revealed ? (
                  <>
                    {typedAnswer.trim() ? (
                      <div className="rounded-chip bg-surface-subtle px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                          You wrote
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-ink-secondary">
                          {typedAnswer}
                        </p>
                      </div>
                    ) : null}
                    <hr className="border-hairline" />
                    <div className="text-ink-secondary">
                      <Markdown>{current.back}</Markdown>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {revealed ? <GradeBar onGrade={grade} disabled={false} /> : <ConfidenceBar onReveal={reveal} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

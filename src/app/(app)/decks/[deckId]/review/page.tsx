"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { GradeBar } from "@/components/review/GradeBar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Markdown } from "@/components/ui/Markdown";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReviewSession } from "@/hooks/useReviewSession";

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const session = useReviewSession(deckId);
  const { revealed, reveal, grade, current, finished } = session;

  // Space/Enter reveals; 1–4 grades. The retrieval attempt stays keyboard-first.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        reveal();
      } else if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
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
                {revealed ? (
                  <>
                    <hr className="border-hairline" />
                    <div className="text-ink-secondary">
                      <Markdown>{current.back}</Markdown>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {revealed ? (
              <GradeBar onGrade={grade} disabled={false} />
            ) : (
              <Button onClick={reveal} className="w-full max-w-xl py-3">
                Show answer
                <kbd className="ml-2 font-mono text-[10px] font-normal opacity-70">space</kbd>
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { PlayIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeckFormDialog } from "@/components/decks/DeckFormDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { deckGradient } from "@/lib/deck-accent";
import { useCreateDeck, useDecks } from "@/lib/queries/decks";
import { useProblemStats } from "@/lib/queries/problems";
import { useOverviewStats } from "@/lib/queries/stats";

/** Every deck wears its own gradient and initial — identity at a glance. */
function DeckBadge({ id, name }: { id: string; name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-badge text-base font-bold text-white shadow-soft"
      style={{ background: deckGradient(id) }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}


/**
 * Interview-prep practice loop lives at /problems; this strip surfaces it on
 * the home page only for users who actually use it (or have problems due).
 * Renders nothing on error too — old API deploys without the endpoint must
 * not break the dashboard.
 */
function PracticeStrip() {
  const { data: stats } = useProblemStats();
  if (!stats || stats.activeProblems === 0) return null;
  return (
    <Link
      href="/problems"
      className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-5 py-3 shadow-card transition-colors hover:border-brand/40"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">Practice problems</span>
        <span className="text-xs text-ink-faint">
          {stats.practicedDaysLast7}/7 days this week
        </span>
      </div>
      <span className={`font-mono text-sm font-bold ${stats.dueToday > 0 ? "text-brand" : "text-ink-faint"}`}>
        {stats.dueToday > 0 ? `${stats.dueToday} due today →` : "none due →"}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: decks, isLoading, isFetching, isError, error, refetch } = useDecks();
  const { data: overview } = useOverviewStats();
  const createDeck = useCreateDeck();
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Decks</h1>
          <p className="mt-1 text-sm text-ink-muted">Review what&apos;s due, then add what&apos;s next.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="h-4 w-4" /> New deck
        </Button>
      </div>

      {overview ? (
        <div className="grid items-center gap-x-10 gap-y-4 rounded-card border border-hairline bg-surface px-5 py-4 shadow-card sm:grid-cols-[auto_1fr]">
          {/* Each number gets a labeled home — no more four-styles-on-one-line. */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Streak</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="relative inline-flex" aria-hidden="true">
                🔥
                {overview.dueToday === 0 && overview.reviewsToday > 0 ? (
                  <span className="live-dot absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-success" />
                ) : null}
              </span>
              {overview.streakDays > 0 ? (
                <>
                  <span className="font-mono text-2xl font-bold tracking-[-0.02em]">
                    {overview.streakDays}
                  </span>
                  <span className="text-sm text-ink-secondary">
                    day{overview.streakDays === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-ink-secondary">Start today</span>
              )}
              {overview.bestStreak > overview.streakDays ? (
                <span className="text-xs text-ink-faint">best {overview.bestStreak}</span>
              ) : null}
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Today</p>
              <span className="truncate font-mono text-xs text-ink-muted">
                {overview.dueToday === 0
                  ? overview.reviewsToday > 0
                    ? "day secured 🔥"
                    : "all clear"
                  : `${overview.reviewsToday} done · ${overview.dueToday} left`}
              </span>
            </div>
            {/* Today's goal is clearing the due queue — retrieval, not time. */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundImage: "var(--gradient-brand)",
                  width: `${
                    overview.dueToday + overview.reviewsToday > 0
                      ? Math.round((overview.reviewsToday / (overview.reviewsToday + overview.dueToday)) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <PracticeStrip />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <QueryError message={error?.message} onRetry={() => refetch()} />
      ) : decks && decks.length > 0 ? (
        // Refetches dim instead of reflowing — no layout jump.
        <div
          className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
            isFetching ? "opacity-50" : ""
          }`}
        >
          {decks.map((deck) => {
            const dueNow = deck.counts.due + deck.counts.learning;
            return (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="group">
                <Card lift className="h-full">
                  {/* Footer anchors to the card bottom so every card in the
                      grid keeps the same baseline, whatever its content. */}
                  <CardContent className="flex h-full flex-col">
                    <div className="flex items-start gap-3">
                      <DeckBadge id={deck.id} name={deck.name} />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold tracking-[-0.01em]">{deck.name}</h2>
                        <p className="truncate text-sm text-ink-muted">
                          {deck.description || `${deck.counts.total} cards`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-1.5 pt-4">
                      <div className="flex flex-wrap gap-1.5">
                        {dueNow > 0 ? <Pill tone="brand">{dueNow} due</Pill> : null}
                        {deck.counts.new > 0 ? <Pill tone="success">{deck.counts.new} new</Pill> : null}
                        {dueNow === 0 && deck.counts.new === 0 ? (
                          <Pill tone="neutral">All caught up</Pill>
                        ) : null}
                      </div>
                      {dueNow > 0 || deck.counts.newAvailable > 0 ? (
                        // Straight into the session without opening the deck —
                        // browsing card fronts first is pre-exposure before retrieval.
                        <Button
                          className="!px-3 !py-1.5 text-xs"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            router.push(`/decks/${deck.id}/review`);
                          }}
                        >
                          <PlayIcon className="h-3.5 w-3.5" /> Review
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<PlusIcon />}
          title="No decks yet"
          hint="Create your first deck, then add cards by hand or generate them from your notes with AI."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="h-4 w-4" /> Create your first deck
            </Button>
          }
        />
      )}

      <DeckFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        busy={createDeck.isPending}
        onSubmit={(input) => createDeck.mutate(input, { onSuccess: () => setDialogOpen(false) })}
      />
    </div>
  );
}

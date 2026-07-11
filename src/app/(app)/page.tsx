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
import { useOverviewStats } from "@/lib/queries/stats";
import type { DeckCounts } from "@/lib/types";

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

/** Thin new/learning/known strip — the deck's maturity in one glance. */
function MaturityStrip({ counts }: { counts: DeckCounts }) {
  const known = Math.max(0, counts.total - counts.new - counts.learning);
  const segments = [
    { value: counts.new, color: "#16a34a", label: "new" },
    { value: counts.learning, color: "#d97706", label: "learning" },
    { value: known, color: "#0090f6", label: "known" },
  ].filter((segment) => segment.value > 0);
  if (counts.total === 0) return null;
  return (
    <div
      className="flex h-1.5 gap-[2px] overflow-hidden rounded-full"
      role="img"
      aria-label={segments.map((s) => `${s.value} ${s.label}`).join(", ")}
    >
      {segments.map((segment) => (
        <div
          key={segment.label}
          style={{ width: `${(segment.value / counts.total) * 100}%`, backgroundColor: segment.color }}
          className="rounded-full"
        />
      ))}
    </div>
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
          <p className="mt-1 text-sm text-ink-muted">
            Review what&apos;s due, then add what you&apos;re learning next.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="h-4 w-4" /> New deck
        </Button>
      </div>

      {overview ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-hairline bg-surface px-4 py-3 shadow-card">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className="text-xl">
              🔥
            </span>
            {overview.streakDays > 0 ? (
              <>
                <span className="font-mono text-xl font-bold tracking-[-0.02em]">{overview.streakDays}</span>
                <span className="text-ink-secondary">day{overview.streakDays === 1 ? "" : "s"}</span>
              </>
            ) : (
              "Start a streak today"
            )}
            {overview.bestStreak > overview.streakDays ? (
              <span className="font-normal text-ink-faint">· best {overview.bestStreak}</span>
            ) : null}
          </span>
          <div className="flex min-w-40 flex-1 items-center gap-2">
            {/* Today's goal is clearing the due queue — retrieval, not time. */}
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle">
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
            <span className="whitespace-nowrap font-mono text-xs text-ink-muted">
              {overview.dueToday === 0
                ? overview.reviewsToday > 0
                  ? "day secured 🔥"
                  : "all clear"
                : `${overview.reviewsToday} done · ${overview.dueToday} left`}
            </span>
          </div>
        </div>
      ) : null}

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
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <DeckBadge id={deck.id} name={deck.name} />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold tracking-[-0.01em]">{deck.name}</h2>
                        <p className="truncate text-sm text-ink-muted">
                          {deck.description || `${deck.counts.total} cards`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <MaturityStrip counts={deck.counts} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5">
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
                          className="!px-2.5 !py-1 text-xs"
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

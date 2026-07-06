"use client";

import { PlusIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { DeckFormDialog } from "@/components/decks/DeckFormDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBadge } from "@/components/ui/IconBadge";
import { Pill } from "@/components/ui/Pill";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useCreateDeck, useDecks } from "@/lib/queries/decks";

export default function DashboardPage() {
  const { data: decks, isLoading, isFetching } = useDecks();
  const createDeck = useCreateDeck();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
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
                <Card className="h-full transition-shadow group-hover:shadow-raised">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <IconBadge>
                        <RectangleStackIcon />
                      </IconBadge>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold tracking-[-0.01em]">{deck.name}</h2>
                        <p className="truncate text-sm text-ink-muted">
                          {deck.description || `${deck.counts.total} cards`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {dueNow > 0 ? <Pill tone="brand">{dueNow} due</Pill> : null}
                      {deck.counts.new > 0 ? <Pill tone="success">{deck.counts.new} new</Pill> : null}
                      {dueNow === 0 && deck.counts.new === 0 ? (
                        <Pill tone="neutral">All caught up</Pill>
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

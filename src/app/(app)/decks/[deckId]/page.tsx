"use client";

import {
  AcademicCapIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlayCircleIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CardEditor } from "@/components/cards/CardEditor";
import { DeckFormDialog } from "@/components/decks/DeckFormDialog";
import { GenerateDialog } from "@/components/generation/GenerateDialog";
import { PracticeDialog } from "@/components/review/PracticeDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useCards, useCreateCard, useDeleteCard, useUpdateCard } from "@/lib/queries/cards";
import { useDeck, useDecks, useDeleteDeck, useUpdateDeck } from "@/lib/queries/decks";
import { useDeckStats } from "@/lib/queries/stats";
import type { Card as CardType } from "@/lib/types";
import { CardState } from "@/lib/types";

const STATE_LABEL: Record<number, { label: string; tone: "success" | "warning" | "brand" | "neutral" }> = {
  [CardState.New]: { label: "new", tone: "success" },
  [CardState.Learning]: { label: "learning", tone: "warning" },
  [CardState.Review]: { label: "review", tone: "brand" },
  [CardState.Relearning]: { label: "relearning", tone: "warning" },
};

export default function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();
  const { data: deck } = useDeck(deckId);
  const { data: decks } = useDecks();
  const { data: stats } = useDeckStats(deckId);
  const counts = decks?.find((d) => d.id === deckId)?.counts;
  const reviews30d = stats?.reviewsLast30d.reduce((sum, day) => sum + day.count, 0) ?? 0;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suspendedOnly, setSuspendedOnly] = useState(false);
  const cardsQuery = useCards(deckId, debouncedSearch, suspendedOnly);
  const createCard = useCreateCard(deckId);
  const updateCard = useUpdateCard(deckId);
  const deleteCard = useDeleteCard(deckId);
  const updateDeck = useUpdateDeck(deckId);
  const deleteDeck = useDeleteDeck();

  const [addOpen, setAddOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [editing, setEditing] = useState<CardType | null>(null);
  const [editDeckOpen, setEditDeckOpen] = useState(false);

  // Deep link (?card=<id>) from the Progress trouble list straight into the
  // editor — fetched by id so pagination depth doesn't matter.
  const searchParams = useSearchParams();
  const focusCardId = searchParams.get("card");
  useEffect(() => {
    if (!focusCardId) return;
    api<CardType>(`/cards/${focusCardId}`)
      .then(({ data }) => setEditing(data))
      .catch(() => undefined)
      .finally(() => router.replace(`/decks/${deckId}`, { scroll: false }));
  }, [focusCardId, deckId, router]);

  const allCards = cardsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  // Server-computed and quota-aware — must promise exactly what the session serves.
  const dueNow = counts ? counts.due + counts.learning + counts.newAvailable : 0;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-[-0.025em]">
            {deck?.name ?? <Skeleton className="h-7 w-48" />}
          </h1>
          {deck?.description ? <p className="mt-1 text-sm text-ink-muted">{deck.description}</p> : null}
          {counts ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {counts.due + counts.learning > 0 ? (
                <Pill tone="brand">{counts.due + counts.learning} due</Pill>
              ) : null}
              {counts.new > 0 ? <Pill tone="success">{counts.new} new</Pill> : null}
              <Pill tone="neutral">{counts.total} total</Pill>
              {stats?.retention30d !== null && stats?.retention30d !== undefined ? (
                <Pill tone={stats.retention30d >= 0.85 ? "success" : "warning"}>
                  {Math.round(stats.retention30d * 100)}% retention
                </Pill>
              ) : null}
              {reviews30d > 0 ? <Pill tone="neutral">{reviews30d} reviews / 30d</Pill> : null}
              {stats?.calibration?.overconfidentRate != null && stats.calibration.overconfidentRate > 0.15 ? (
                <Pill tone="danger">
                  overconfident on {Math.round(stats.calibration.overconfidentRate * 100)}% of &ldquo;sure&rdquo;
                  answers
                </Pill>
              ) : null}
            </div>
          ) : null}
          {stats?.calibration ? (
            <p className="mt-2 text-xs text-ink-muted">
              Calibration (30d):{" "}
              {[
                [3, "Sure"] as const,
                [2, "Think so"] as const,
                [1, "No idea"] as const,
              ]
                .filter(([level]) => stats.calibration?.levels[level])
                .map(([level, label]) => {
                  const item = stats.calibration!.levels[level];
                  return `${label} — ${Math.round(item.recallRate * 100)}% recalled over ${item.attempts}`;
                })
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setEditDeckOpen(true)} aria-label="Edit deck">
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="danger"
            aria-label="Delete deck"
            onClick={() => {
              if (window.confirm(`Delete deck "${deck?.name}"? Cards stop appearing but review history is kept.`)) {
                deleteDeck.mutate(deckId, { onSuccess: () => router.push("/") });
              }
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
          <Link href={`/decks/${deckId}/feynman`}>
            <Button variant="secondary">
              <AcademicCapIcon className="h-4 w-4" /> Feynman
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setGenerateOpen(true)}>
            <SparklesIcon className="h-4 w-4" /> Generate with AI
          </Button>
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <PlusIcon className="h-4 w-4" /> Add cards
          </Button>
          <Button variant="secondary" onClick={() => setPracticeOpen(true)}>
            <BoltIcon className="h-4 w-4" /> Practice
          </Button>
          <Link href={`/decks/${deckId}/review`}>
            <Button disabled={!dueNow}>
              <PlayIcon className="h-4 w-4" /> Review {dueNow ? `(${dueNow})` : ""}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              const value = event.target.value.trim();
              window.setTimeout(() => setDebouncedSearch(value), 300);
            }}
            placeholder="Search cards…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {([
            [false, "All"],
            [true, "Suspended"],
          ] as const).map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setSuspendedOnly(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                suspendedOnly === value
                  ? "bg-brand-tint-strong text-brand-dark dark:text-brand-light"
                  : "bg-surface-subtle text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {cardsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : cardsQuery.isError ? (
        <QueryError message={cardsQuery.error?.message} onRetry={() => cardsQuery.refetch()} />
      ) : allCards.length === 0 ? (
        <EmptyState
          title={suspendedOnly ? "Nothing set aside" : debouncedSearch ? "No cards match" : "No cards yet"}
          hint={
            suspendedOnly
              ? "Suspend a card during review (the pause button) when it needs understanding before repetition."
              : debouncedSearch
                ? "Try a different search."
                : "Add cards by hand, or paste your notes and let AI draft them for your approval."
          }
          action={
            debouncedSearch || suspendedOnly ? undefined : (
              <Button onClick={() => setAddOpen(true)}>
                <PlusIcon className="h-4 w-4" /> Add cards
              </Button>
            )
          }
        />
      ) : (
        <div
          className={`space-y-3 transition-opacity duration-200 ${
            cardsQuery.isFetching && !cardsQuery.isFetchingNextPage ? "opacity-50" : ""
          }`}
        >
          {allCards.map((card) => {
            const state = STATE_LABEL[card.state] ?? STATE_LABEL[CardState.New];
            return (
              <Card key={card.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Markdown>{card.front}</Markdown>
                    <div className="border-l-2 border-hairline pl-3 text-ink-muted">
                      <Markdown>{card.back}</Markdown>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row-reverse items-center justify-end gap-2 sm:flex-col sm:items-end">
                    <div className="flex gap-1.5">
                      <Pill tone={state.tone}>{state.label}</Pill>
                      {card.suspended ? <Pill tone="danger">suspended</Pill> : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        aria-label={card.suspended ? "Resume reviewing this card" : "Suspend this card"}
                        title={card.suspended ? "Resume reviewing" : "Set aside (suspend)"}
                        onClick={() =>
                          updateCard.mutate({ cardId: card.id, patch: { suspended: !card.suspended } })
                        }
                      >
                        {card.suspended ? (
                          <PlayCircleIcon className="h-4 w-4" />
                        ) : (
                          <PauseCircleIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(card)} aria-label="Edit card">
                        <PencilSquareIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Delete card"
                        onClick={() => {
                          if (window.confirm("Delete this card? Its review history is kept.")) {
                            deleteCard.mutate(card.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {cardsQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                busy={cardsQuery.isFetchingNextPage}
                busyLabel="Loading…"
                onClick={() => cardsQuery.fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <GenerateDialog deckId={deckId} open={generateOpen} onOpenChange={setGenerateOpen} />
      <PracticeDialog deckId={deckId} open={practiceOpen} onOpenChange={setPracticeOpen} />

      <Dialog open={addOpen} onOpenChange={setAddOpen} title="Add a card">
        <CardEditor
          busy={createCard.isPending}
          onSubmit={(input) => createCard.mutate(input)}
        />
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title="Edit card">
        {editing ? (
          <CardEditor
            card={editing}
            busy={updateCard.isPending}
            submitLabel="Save"
            busyLabel="Saving…"
            onCancel={() => setEditing(null)}
            onSubmit={(input) =>
              updateCard.mutate(
                { cardId: editing.id, patch: input },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        ) : null}
      </Dialog>

      {deck ? (
        <DeckFormDialog
          open={editDeckOpen}
          onOpenChange={setEditDeckOpen}
          deck={deck}
          busy={updateDeck.isPending}
          onSubmit={(input) => updateDeck.mutate(input, { onSuccess: () => setEditDeckOpen(false) })}
        />
      ) : null}
    </div>
  );
}

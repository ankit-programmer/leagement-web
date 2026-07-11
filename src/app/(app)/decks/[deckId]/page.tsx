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
import { memo, useCallback, useEffect, useState } from "react";
import { CardEditor } from "@/components/cards/CardEditor";
import { DeckFormDialog } from "@/components/decks/DeckFormDialog";
import { DeleteDeckDialog } from "@/components/decks/DeleteDeckDialog";
import { GenerateDialog } from "@/components/generation/GenerateDialog";
import { PracticeDialog } from "@/components/review/PracticeDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { deckGradient } from "@/lib/deck-accent";
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

/**
 * Memoized row: with 50 rows × 2 markdown pipelines each, rows must only
 * re-render when their card changes — never on parent state (search
 * keystrokes, dialog toggles). content-visibility lets phones skip painting
 * below-the-fold rows entirely.
 */
const CardRow = memo(function CardRow({
  card,
  onEdit,
  onDelete,
  onToggleSuspend,
}: {
  card: CardType;
  onEdit: (card: CardType) => void;
  onDelete: (cardId: string) => void;
  onToggleSuspend: (card: CardType) => void;
}) {
  const state = STATE_LABEL[card.state] ?? STATE_LABEL[CardState.New];
  return (
    <Card className="[content-visibility:auto] [contain-intrinsic-size:auto_120px]">
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
              onClick={() => onToggleSuspend(card)}
            >
              {card.suspended ? <PlayCircleIcon className="h-4 w-4" /> : <PauseCircleIcon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" onClick={() => onEdit(card)} aria-label="Edit card">
              <PencilSquareIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" aria-label="Delete card" onClick={() => onDelete(card.id)}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();
  const { data: deck } = useDeck(deckId);
  const { data: decks } = useDecks();
  const { data: stats } = useDeckStats(deckId);
  const counts = decks?.find((d) => d.id === deckId)?.counts;

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
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Debounce properly: one timer, cleared on every change — the previous
  // inline setTimeout leaked a timer (and a full-list re-render) per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Stable identities so memoized rows never re-render from parent state.
  const handleEdit = useCallback((card: CardType) => setEditing(card), []);
  const handleDelete = useCallback((cardId: string) => setDeletingCardId(cardId), []);
  const handleToggleSuspend = useCallback(
    (card: CardType) => updateCard.mutate({ cardId: card.id, patch: { suspended: !card.suspended } }),
    [updateCard.mutate],
  );

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
    <div className="space-y-6">
      {/* Hero: deck identity, one stat line, and the STUDY actions. Authoring
          (Add/Generate) lives with the card list below — grouped by intent. */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {deck ? (
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-badge text-lg font-bold text-white shadow-soft"
                  style={{ background: deckGradient(deck.id) }}
                >
                  {(deck.name.trim()[0] ?? "?").toUpperCase()}
                </span>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-[-0.025em]">
                  {deck?.name ?? <Skeleton className="h-7 w-48" />}
                </h1>
                {deck?.description ? (
                  <p className="mt-0.5 truncate text-sm text-ink-muted">{deck.description}</p>
                ) : null}
              </div>
            </div>
            <OverflowMenu
              label="Deck actions"
              items={[
                {
                  label: "Edit deck",
                  icon: <PencilSquareIcon className="h-4 w-4" />,
                  onSelect: () => setEditDeckOpen(true),
                },
                {
                  label: "Delete deck",
                  icon: <TrashIcon className="h-4 w-4" />,
                  danger: true,
                  onSelect: () => setDeleteDeckOpen(true),
                },
              ]}
            />
          </div>

          {counts ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ink-muted">
              <span>
                {[
                  `${counts.total} card${counts.total === 1 ? "" : "s"}`,
                  counts.due + counts.learning > 0 ? `${counts.due + counts.learning} due` : null,
                  counts.new > 0 ? `${counts.new} new` : null,
                  stats?.retention30d !== null && stats?.retention30d !== undefined
                    ? `${Math.round(stats.retention30d * 100)}% retention (30d)`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <Link
                href={`/progress?deck=${deckId}`}
                className="font-semibold text-brand-dark transition-colors hover:text-brand dark:text-brand-light"
              >
                View stats →
              </Link>
              {stats?.calibration?.overconfidentRate != null && stats.calibration.overconfidentRate > 0.15 ? (
                <Pill tone="danger">
                  overconfident on {Math.round(stats.calibration.overconfidentRate * 100)}% of &ldquo;sure&rdquo;
                  answers
                </Pill>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/decks/${deckId}/review`} className="w-full sm:w-auto">
              <Button disabled={!dueNow} className="w-full sm:w-auto">
                <PlayIcon className="h-4 w-4" /> Review {dueNow ? `(${dueNow})` : ""}
              </Button>
            </Link>
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setPracticeOpen(true)}>
              <BoltIcon className="h-4 w-4" /> Practice
            </Button>
            <Link href={`/decks/${deckId}/feynman`} className="flex-1 sm:flex-none">
              <Button variant="secondary" className="w-full">
                <AcademicCapIcon className="h-4 w-4" /> Feynman
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Card browser toolbar: find on the left, author on the right. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <PlusIcon className="h-4 w-4" /> Add
          </Button>
          <Button variant="secondary" onClick={() => setGenerateOpen(true)}>
            <SparklesIcon className="h-4 w-4" /> Generate
          </Button>
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
          {allCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleSuspend={handleToggleSuspend}
            />
          ))}
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
      {deck ? (
        <DeleteDeckDialog
          deck={deck}
          open={deleteDeckOpen}
          onOpenChange={setDeleteDeckOpen}
          busy={deleteDeck.isPending}
          onConfirm={() => deleteDeck.mutate(deckId, { onSuccess: () => router.push("/") })}
        />
      ) : null}

      <ConfirmDialog
        open={deletingCardId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCardId(null);
        }}
        title="Delete this card?"
        description="Its review history is kept for your analytics."
        confirmLabel="Delete card"
        busy={deleteCard.isPending}
        onConfirm={() => {
          if (deletingCardId) {
            deleteCard.mutate(deletingCardId, { onSuccess: () => setDeletingCardId(null) });
          }
        }}
      />

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

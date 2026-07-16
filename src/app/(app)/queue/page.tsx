"use client";

import { CheckIcon, PencilSquareIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CardEditor } from "@/components/cards/CardEditor";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBadge } from "@/components/ui/IconBadge";
import { Markdown } from "@/components/ui/Markdown";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type GeneratedCard,
  useBulkDecide,
  useDecideGenerated,
  usePendingGenerated,
} from "@/lib/queries/generation";

function QueueRow({ row }: { row: GeneratedCard }) {
  const decide = useDecideGenerated();
  const [editOpen, setEditOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Triage should feel like clearing, not blinking: the row folds away for
  // ~180ms, then the (optimistic) mutation removes it from the list.
  const startDecide = (action: "approve" | "reject") => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => decide.mutate({ id: row.id, action }), 180);
  };

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out ${
        leaving ? "grid-rows-[0fr] -translate-x-1 opacity-0" : "grid-rows-[1fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <Card>
      <CardContent className="space-y-3">
        <Markdown>{row.front}</Markdown>
        <div className="border-l-2 border-hairline pl-3 text-ink-muted">
          <Markdown>{row.back}</Markdown>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            aria-label="Edit before approving"
            onClick={() => setEditOpen(true)}
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button variant="danger" onClick={() => startDecide("reject")} aria-label="Reject">
            <XMarkIcon className="h-4 w-4" /> Reject
          </Button>
          <Button busy={decide.isPending} busyLabel="Approving…" onClick={() => startDecide("approve")}>
            <CheckIcon className="h-4 w-4" /> Approve
          </Button>
        </div>
      </CardContent>

      {/* Same editor as manual cards — markdown, image attach/camera, preview.
          Edits are applied at approval time, so submitting here approves. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen} title="Edit & approve card">
        <CardEditor
          card={row}
          busy={decide.isPending}
          submitLabel="Approve card"
          busyLabel="Approving…"
          onCancel={() => setEditOpen(false)}
          onSubmit={(input) =>
            decide.mutate(
              {
                id: row.id,
                action: "approve",
                front: input.front !== row.front ? input.front : undefined,
                back: input.back !== row.back ? input.back : undefined,
              },
              { onSuccess: () => setEditOpen(false) },
            )
          }
        />
      </Dialog>
        </Card>
      </div>
    </div>
  );
}

interface DeckGroup {
  id: string;
  name: string;
  rows: GeneratedCard[];
}

function groupByDeck(rows: GeneratedCard[]): DeckGroup[] {
  const groups: DeckGroup[] = [];
  for (const row of rows) {
    const group = groups.find((g) => g.id === row.deckId);
    if (group) group.rows.push(row);
    else groups.push({ id: row.deckId, name: row.deckName, rows: [row] });
  }
  return groups;
}

function QueueContent() {
  const { data: pending, isLoading, isFetching, isError, error, refetch } = usePendingGenerated();
  const bulk = useBulkDecide();
  const searchParams = useSearchParams();
  const selectedDeck = searchParams.get("deck");

  const allGroups = groupByDeck(pending ?? []);
  const visible = (pending ?? []).filter((row) => !selectedDeck || row.deckId === selectedDeck);
  const visibleGroups = groupByDeck(visible);

  // Shallow update — a router.replace() RSC round-trip makes the pill feel
  // dead on slow connections; history.replaceState syncs useSearchParams instantly.
  const selectDeck = (deckId: string | null) =>
    window.history.replaceState(null, "", deckId ? `/queue?deck=${deckId}` : "/queue");

  const filterPill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? "bg-brand-tint-strong text-brand-dark dark:text-brand-light"
        : "bg-surface-subtle text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge>
            <SparklesIcon />
          </IconBadge>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.025em]">AI queue</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Review each draft — edit freely; approving is what puts a card in your deck.
            </p>
          </div>
        </div>
        {visible.length > 1 ? (
          <Button
            variant="secondary"
            busy={bulk.isPending}
            busyLabel="Approving…"
            onClick={() => bulk.mutate({ ids: visible.map((row) => row.id), action: "approve" })}
          >
            Approve all{selectedDeck ? " in deck" : ""} ({visible.length})
          </Button>
        ) : null}
      </div>

      {allGroups.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => selectDeck(null)} className={filterPill(!selectedDeck)}>
            All ({pending?.length ?? 0})
          </button>
          {allGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => selectDeck(group.id)}
              className={filterPill(selectedDeck === group.id)}
            >
              {group.name} ({group.rows.length})
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : isError ? (
        <QueryError message={error?.message} onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SparklesIcon />}
          title={
            selectedDeck && (pending?.length ?? 0) > 0 ? "Nothing pending for this deck" : "Queue is clear"
          }
          hint='Generate drafts from any deck with "Generate with AI" — they land here for your approval.'
        />
      ) : (
        <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? "opacity-50" : ""}`}>
          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                {group.name} · {group.rows.length}
              </h2>
              {group.rows.map((row) => (
                <QueueRow key={row.id} row={row} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  // useSearchParams requires a Suspense boundary on statically rendered pages.
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <QueueContent />
    </Suspense>
  );
}

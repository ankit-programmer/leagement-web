"use client";

import { CheckIcon, PencilSquareIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Markdown } from "@/components/ui/Markdown";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type GeneratedCard,
  useBulkDecide,
  useDecideGenerated,
  usePendingGenerated,
} from "@/lib/queries/generation";

function QueueRow({ row }: { row: GeneratedCard }) {
  const decide = useDecideGenerated();
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(row.front);
  const [back, setBack] = useState(row.back);

  return (
    <Card>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <Textarea value={front} onChange={(e) => setFront(e.target.value)} maxLength={2000} />
            <Textarea value={back} onChange={(e) => setBack(e.target.value)} maxLength={5000} />
          </>
        ) : (
          <>
            <Markdown>{row.front}</Markdown>
            <div className="border-l-2 border-hairline pl-3 text-ink-muted">
              <Markdown>{row.back}</Markdown>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <Pill tone="neutral">{row.deckName}</Pill>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              aria-label={editing ? "Cancel edit" : "Edit before approving"}
              onClick={() => {
                setEditing((v) => !v);
                setFront(row.front);
                setBack(row.back);
              }}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="danger"
              onClick={() => decide.mutate({ id: row.id, action: "reject" })}
              aria-label="Reject"
            >
              <XMarkIcon className="h-4 w-4" /> Reject
            </Button>
            <Button
              busy={decide.isPending}
              busyLabel="Approving…"
              onClick={() =>
                decide.mutate({
                  id: row.id,
                  action: "approve",
                  front: editing && front.trim() !== row.front ? front.trim() : undefined,
                  back: editing && back.trim() !== row.back ? back.trim() : undefined,
                })
              }
            >
              <CheckIcon className="h-4 w-4" /> Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QueuePage() {
  const { data: pending, isLoading, isFetching } = usePendingGenerated();
  const bulk = useBulkDecide();

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
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
        {pending && pending.length > 1 ? (
          <Button
            variant="secondary"
            busy={bulk.isPending}
            busyLabel="Approving…"
            onClick={() => bulk.mutate({ ids: pending.map((row) => row.id), action: "approve" })}
          >
            Approve all ({pending.length})
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !pending || pending.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          hint='Generate drafts from any deck with "Generate with AI" — they land here for your approval.'
        />
      ) : (
        <div className={`space-y-3 transition-opacity duration-200 ${isFetching ? "opacity-50" : ""}`}>
          {pending.map((row) => (
            <QueueRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

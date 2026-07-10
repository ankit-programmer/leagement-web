"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { type PracticeSession, useCreatePractice } from "@/lib/queries/practice";

const SUGGESTIONS = [
  "Cards I keep failing",
  "My slowest answers",
  "Cards I was sure about but got wrong",
  "Cards I haven't seen in a while",
];

/** Describe a session in plain language → AI selects the cards → review them. */
export function PracticeDialog({
  deckId,
  open,
  onOpenChange,
}: {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [request, setRequest] = useState("");
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePractice(deckId);
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSession(null);
          setRequest("");
          setError(null);
        }
      }}
      title="Practice session"
      description="Describe what to practice — a topic, your weak spots, anything. Grades count as real reviews."
    >
      <div className="space-y-4">
        <Textarea
          label="What do you want to practice?"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. everything about graph algorithms"
          maxLength={500}
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setRequest(suggestion)}
              className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {session ? (
          <div className="rounded-card border border-brand/30 bg-brand-tint px-4 py-3">
            <p className="font-bold tracking-[-0.01em]">{session.title}</p>
            <p className="mt-0.5 text-sm text-ink-secondary">{session.rationale}</p>
            <p className="mt-1 font-mono text-xs text-ink-muted">{session.cards.length} cards</p>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={session ? "secondary" : "primary"}
            busy={create.isPending}
            busyLabel="Selecting…"
            disabled={request.trim().length < 5}
            onClick={() => {
              setError(null);
              create.mutate(request.trim(), {
                onSuccess: setSession,
                onError: (e) => setError(e.message),
              });
            }}
          >
            {session ? "Reselect" : "Select cards"}
          </Button>
          {session ? (
            <Button type="button" onClick={() => router.push(`/decks/${deckId}/review?mode=practice`)}>
              Start ({session.cards.length})
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

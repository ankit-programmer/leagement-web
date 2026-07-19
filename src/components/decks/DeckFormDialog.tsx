"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Field";
import type { Deck } from "@/lib/types";

type DeckType = "flashcards" | "practice";

export function DeckFormDialog({
  open,
  onOpenChange,
  deck,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing, absent when creating. */
  deck?: Deck;
  onSubmit: (input: { name: string; description?: string; type?: DeckType }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DeckType>("flashcards");

  useEffect(() => {
    if (open) {
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setType("flashcards");
    }
  }, [open, deck]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={deck ? "Edit deck" : "New deck"}
      description={deck ? undefined : "A deck holds the cards for one topic you want to master."}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            // Type is fixed at creation — never sent on edit.
            ...(deck ? {} : { type }),
          });
        }}
      >
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Distributed Systems"
          maxLength={200}
          required
          autoFocus
        />
        {!deck ? (
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Deck type</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  { value: "flashcards", label: "Flashcards", hint: "spaced-repetition cards (usual)" },
                  { value: "practice", label: "Practice problems", hint: "attempt → post-mortem → re-solve" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`rounded-field border px-3 py-2 text-left transition-colors ${
                    type === option.value
                      ? "border-brand bg-brand-tint"
                      : "border-hairline bg-surface hover:border-hairline-strong"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      type === option.value ? "text-brand-dark dark:text-brand-light" : "text-ink"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          maxLength={2000}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} busyLabel={deck ? "Saving…" : "Creating…"} disabled={!name.trim()}>
            {deck ? "Save" : "Create deck"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

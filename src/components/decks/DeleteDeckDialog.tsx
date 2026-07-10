"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import type { Deck } from "@/lib/types";

/**
 * Deleting a deck is the most destructive action in the app — a tap-through
 * confirm isn't enough on a phone. GitHub-style: type the deck name exactly
 * to arm the delete button.
 */
export function DeleteDeckDialog({
  deck,
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === deck.name;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTyped("");
      }}
      title="Delete this deck?"
      description="Its cards stop appearing everywhere — decks, reviews, practice, stats. Review history is kept for your analytics, but the deck cannot be restored from the app."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches && !busy) onConfirm();
        }}
      >
        <Input
          label={`Type "${deck.name}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={deck.name}
          autoFocus
          autoComplete="off"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!matches} busy={busy} busyLabel="Deleting…">
            Delete deck
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

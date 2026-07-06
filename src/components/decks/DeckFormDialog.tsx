"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Field";
import type { Deck } from "@/lib/types";

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
  onSubmit: (input: { name: string; description?: string }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
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
          onSubmit({ name: name.trim(), description: description.trim() || undefined });
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

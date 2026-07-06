"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { useGenerate } from "@/lib/queries/generation";

/** Paste source material → AI drafts cards → user reviews them in the queue. */
export function GenerateDialog({
  deckId,
  open,
  onOpenChange,
}: {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sourceText, setSourceText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerate();
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate cards with AI"
      description="Paste notes or an article. Drafted cards go to the approval queue — nothing enters the deck until you approve it."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          generate.mutate(
            { deckId, sourceText: sourceText.trim() },
            {
              onSuccess: () => {
                setSourceText("");
                onOpenChange(false);
                router.push("/queue");
              },
              onError: (e) => setError(e.message),
            },
          );
        }}
      >
        <Textarea
          label="Source material"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste at least a paragraph (max ~24k characters)…"
          className="min-h-48"
          maxLength={24_000}
          required
        />
        {error ? (
          <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={generate.isPending}
            busyLabel="Generating…"
            disabled={sourceText.trim().length < 40}
          >
            Generate
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

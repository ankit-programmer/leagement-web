"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import type { Card } from "@/lib/types";

/** Front/back markdown editor with a live preview — used for create and edit. */
export function CardEditor({
  card,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Add card",
  busyLabel = "Adding…",
}: {
  card?: Card;
  onSubmit: (input: { front: string; back: string; imageUrl?: string }) => void;
  onCancel?: () => void;
  busy: boolean;
  submitLabel?: string;
  busyLabel?: string;
}) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [imageUrl, setImageUrl] = useState(card?.imageUrl ?? "");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setFront(card?.front ?? "");
    setBack(card?.back ?? "");
    setImageUrl(card?.imageUrl ?? "");
  }, [card]);

  const reset = () => {
    setFront("");
    setBack("");
    setImageUrl("");
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          front: front.trim(),
          back: back.trim(),
          imageUrl: imageUrl.trim() || undefined,
        });
        if (!card) reset();
      }}
    >
      <Textarea
        label="Front — one atomic question"
        value={front}
        onChange={(e) => setFront(e.target.value)}
        placeholder="Why does spacing reviews beat massing them?"
        maxLength={2000}
        required
      />
      <Textarea
        label="Back — the answer"
        value={back}
        onChange={(e) => setBack(e.target.value)}
        placeholder="Markdown supported"
        maxLength={5000}
        required
      />
      <Input
        label="Image URL (optional)"
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://…"
      />
      {showPreview && (front || back) ? (
        <div className="space-y-3 rounded-card border border-hairline bg-surface-subtle/50 p-4">
          <Markdown>{front || "*front*"}</Markdown>
          <hr className="border-hairline" />
          <Markdown>{back || "*back*"}</Markdown>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-sm font-semibold text-ink-muted hover:text-ink"
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" busy={busy} busyLabel={busyLabel} disabled={!front.trim() || !back.trim()}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

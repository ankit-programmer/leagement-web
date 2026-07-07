"use client";

import { CameraIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { uploadImage } from "@/lib/firebase";
import type { Card } from "@/lib/types";

/**
 * Front/back markdown field with image attachment: picked files upload to
 * Firebase Storage and land as `![](url)` markdown at the cursor, so images
 * work on either side and render everywhere markdown does (preview, browser,
 * review) with the same sanitization.
 */
function MarkdownField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  onError,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  onError: (message: string | null) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const snippet = `\n![](${url})\n`;
      const cursor = textareaRef.current?.selectionStart ?? value.length;
      onChange(value.slice(0, cursor) + snippet + value.slice(cursor));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        ref={textareaRef}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
      <input ref={fileInput} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          busy={uploading}
          busyLabel="Uploading…"
          onClick={() => fileInput.current?.click()}
        >
          <PhotoIcon className="h-4 w-4" /> Attach image
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          disabled={uploading}
          onClick={() => cameraInput.current?.click()}
        >
          <CameraIcon className="h-4 w-4" /> Camera
        </Button>
      </div>
    </div>
  );
}

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
  onSubmit: (input: { front: string; back: string }) => void;
  onCancel?: () => void;
  busy: boolean;
  submitLabel?: string;
  busyLabel?: string;
}) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFront(card?.front ?? "");
    setBack(card?.back ?? "");
  }, [card]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ front: front.trim(), back: back.trim() });
        if (!card) {
          setFront("");
          setBack("");
        }
      }}
    >
      <MarkdownField
        label="Front — one atomic question"
        value={front}
        onChange={setFront}
        placeholder="Why does spacing reviews beat massing them?"
        maxLength={2000}
        onError={setError}
      />
      <MarkdownField
        label="Back — the answer"
        value={back}
        onChange={setBack}
        placeholder="Markdown supported — attach images below"
        maxLength={5000}
        onError={setError}
      />
      {error ? (
        <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
      ) : null}
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

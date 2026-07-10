"use client";

import { CameraIcon, PhotoIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { MermaidBlock } from "@/components/ui/MermaidBlock";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/firebase";

/** Describe → AI writes Mermaid → preview → insert as a ```mermaid block. */
function DiagramDialog({
  open,
  onOpenChange,
  context,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current card text, so the diagram matches what the card teaches. */
  context: string;
  onInsert: (mermaid: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [mermaid, setMermaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api<{ mermaid: string }>("/diagrams", {
        method: "POST",
        body: { description: description.trim(), context: context.trim().slice(0, 4000) || undefined },
      });
      setMermaid(data.mermaid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setMermaid(null);
          setDescription("");
          setError(null);
        }
      }}
      title="AI diagram"
      description="Describe the process or relationship to draw — the diagram is stored as editable text inside the card."
    >
      <div className="space-y-4">
        <Textarea
          label="What should the diagram show?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. the lifecycle of a card from New through Learning to Review"
          maxLength={2000}
        />
        {mermaid ? (
          <div className="rounded-card border border-hairline bg-surface-subtle/50 p-3">
            <MermaidBlock code={mermaid} />
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
            variant={mermaid ? "secondary" : "primary"}
            busy={busy}
            busyLabel="Drawing…"
            disabled={description.trim().length < 10}
            onClick={generate}
          >
            {mermaid ? "Regenerate" : "Generate"}
          </Button>
          {mermaid ? (
            <Button
              type="button"
              onClick={() => {
                onInsert(mermaid);
                onOpenChange(false);
                setMermaid(null);
                setDescription("");
              }}
            >
              Insert
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

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
  diagramContext,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  onError: (message: string | null) => void;
  /** Full card text handed to the diagram model as grounding. */
  diagramContext: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);

  const insertAtCursor = (snippet: string) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    onChange(value.slice(0, cursor) + snippet + value.slice(cursor));
  };

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, "cards");
      insertAtCursor(`\n![](${url})\n`);
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
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          onClick={() => setDiagramOpen(true)}
        >
          <SparklesIcon className="h-4 w-4" /> AI diagram
        </Button>
      </div>
      <DiagramDialog
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        context={diagramContext}
        onInsert={(mermaid) => insertAtCursor(`\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`)}
      />
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
  /** Existing content when editing (a full card or an AI-generated draft). */
  card?: { front: string; back: string };
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
        diagramContext={`${front}\n\n${back}`}
      />
      <MarkdownField
        label="Back — the answer"
        value={back}
        onChange={setBack}
        placeholder="Markdown supported — attach images below"
        maxLength={5000}
        onError={setError}
        diagramContext={`${front}\n\n${back}`}
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

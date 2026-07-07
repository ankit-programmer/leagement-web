"use client";

import { CameraIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Field";
import { uploadImage } from "@/lib/firebase";
import { useGenerate } from "@/lib/queries/generation";

/** Must match the API's createGenerationSchema minimum for text-only requests. */
const MIN_CHARS = 40;

/** Paste source material and/or attach an image → AI drafts cards → user reviews them in the queue. */
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
  const [sourceUrl, setSourceUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const generate = useGenerate();
  const router = useRouter();

  // Object URLs leak unless revoked when the image changes or the dialog unmounts.
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const validUrl = /^https?:\/\/\S+\.\S+/.test(sourceUrl.trim());
  const canSubmit = sourceText.trim().length >= MIN_CHARS || image !== null || validUrl;
  const busy = uploading || generate.isPending;

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      setError(null);
    }
    event.target.value = ""; // allow re-picking the same file
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (image) {
        setUploading(true);
        try {
          imageUrl = await uploadImage(image, "generation");
        } finally {
          setUploading(false);
        }
      }
      generate.mutate(
        {
          deckId,
          sourceText: sourceText.trim() || undefined,
          imageUrl,
          sourceUrl: validUrl ? sourceUrl.trim() : undefined,
        },
        {
          onSuccess: () => {
            setSourceText("");
            setSourceUrl("");
            setImage(null);
            onOpenChange(false);
            router.push(`/queue?deck=${deckId}`);
          },
          onError: (e) => setError(e.message),
        },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate cards with AI"
      description="Link a blog post or PDF, paste notes, or snap a photo of them. Drafted cards go to the approval queue — nothing enters the deck until you approve it."
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label="Article or PDF link (optional)"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://blog.example.com/great-post"
        />
        <Textarea
          label="Source material"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste text here, attach an image, or both…"
          className="min-h-40"
          maxLength={24_000}
        />
        <p className="text-xs text-ink-faint">
          {image || validUrl
            ? `${validUrl ? "Link" : "Image"} attached — text is optional.`
            : sourceText.trim().length < MIN_CHARS
              ? `Add a link, an image, or at least ${MIN_CHARS} characters of text — ${Math.max(
                  0,
                  MIN_CHARS - sourceText.trim().length,
                )} characters to go.`
              : `${sourceText.trim().length.toLocaleString()} characters`}
        </p>

        <input ref={fileInput} type="file" accept="image/*" onChange={onPick} className="hidden" />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="hidden"
        />

        {preview ? (
          <div className="relative inline-block">
            {/* Local object URL — next/image optimization doesn't apply */}
            <Image
              src={preview}
              alt="Attached source"
              width={160}
              height={160}
              unoptimized
              className="h-28 w-auto rounded-chip border border-hairline object-cover"
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => setImage(null)}
              className="absolute -right-2 -top-2 rounded-full border border-hairline bg-surface p-1 text-ink-muted shadow-soft hover:text-ink"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
              <PhotoIcon className="h-4 w-4" /> Attach image
            </Button>
            <Button type="button" variant="secondary" onClick={() => cameraInput.current?.click()}>
              <CameraIcon className="h-4 w-4" /> Camera
            </Button>
          </div>
        )}

        {error ? (
          <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={busy}
            busyLabel={uploading ? "Uploading image…" : validUrl ? "Fetching & generating…" : "Generating…"}
            disabled={!canSubmit}
          >
            Generate
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

"use client";

import { ArrowTopRightOnSquareIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { useUpdateProblem } from "@/lib/queries/problems";
import { parseResources } from "./meta";

/** Resource lines rendered as outbound link rows (new tab); URL-less lines as plain notes. */
export function ResourceLinks({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <ul className="space-y-1">
      {parseResources(text).map((row, i) => (
        <li key={i}>
          {row.url ? (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className={`group inline-flex max-w-full items-center gap-1.5 font-semibold text-brand-dark hover:underline dark:text-brand-light ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint group-hover:text-brand" />
              <span className="truncate">{row.label}</span>
            </a>
          ) : (
            <span className={`text-ink-secondary ${compact ? "text-xs" : "text-sm"}`}>{row.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * One view/edit section on the problem page (description, solution,
 * resources). `spoiler` keeps the content behind a reveal click — the
 * solution must never be ambiently visible in an app built on re-deriving
 * problems from scratch. Reveal state is local, so it re-hides on navigation.
 */
export function EditableMarkdownSection({
  problemId,
  field,
  title,
  value,
  placeholder,
  emptyHint,
  spoiler = false,
  spoilerCaption,
  renderValue,
  compact = false,
}: {
  problemId: string;
  field: "description" | "solution" | "resources";
  title: string;
  value: string | null;
  placeholder: string;
  emptyHint: string;
  spoiler?: boolean;
  spoilerCaption?: string;
  /** Custom view renderer (resources); default is Markdown. */
  renderValue?: (value: string) => React.ReactNode;
  /** Smaller paddings/typography for the post-mortem rail. */
  compact?: boolean;
}) {
  const updateProblem = useUpdateProblem(problemId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);

  const heading = compact
    ? "text-xs font-bold uppercase tracking-[0.06em] text-ink-muted"
    : "font-bold tracking-[-0.01em]";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className={heading}>{title}</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
              setRevealed(true);
            }}
            className={`font-semibold text-ink-muted hover:text-ink ${compact ? "text-xs" : "text-sm"}`}
          >
            {value ? "Edit" : "Add"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={compact ? "min-h-28 text-xs" : "min-h-40"}
            maxLength={40_000}
          />
          <div className="flex gap-2">
            <Button
              busy={updateProblem.isPending}
              busyLabel="Saving…"
              onClick={() =>
                updateProblem.mutate({ [field]: draft.trim() || null }, { onSuccess: () => setEditing(false) })
              }
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : !value ? (
        <p className={`text-ink-faint ${compact ? "text-xs" : "text-sm"}`}>{emptyHint}</p>
      ) : spoiler && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-field border border-dashed border-hairline-strong bg-surface-subtle/60 py-3 font-semibold text-ink-muted transition-colors hover:text-ink ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          <EyeIcon className="h-4 w-4" /> Reveal {title.toLowerCase()}
          {spoilerCaption ? <span className="font-normal text-ink-faint">— {spoilerCaption}</span> : null}
        </button>
      ) : (
        <div className="space-y-2">
          {renderValue ? (
            renderValue(value)
          ) : (
            <div className={`prose-sm max-w-none ${compact ? "max-h-80 overflow-y-auto text-xs" : "text-sm"}`}>
              <Markdown>{value}</Markdown>
            </div>
          )}
          {spoiler ? (
            <button
              type="button"
              onClick={() => setRevealed(false)}
              className="flex items-center gap-1 text-xs font-semibold text-ink-faint hover:text-ink"
            >
              <EyeSlashIcon className="h-3.5 w-3.5" /> Hide again
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

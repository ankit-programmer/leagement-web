"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { type Problem, useUpdateProblem } from "@/lib/queries/problems";

/** Edit a problem's core metadata (name, link, pattern, difficulty). Longer
 *  fields — description, solution, resources — stay inline on the detail page. */
export function EditProblemDialog({
  problem,
  open,
  onOpenChange,
}: {
  problem: Problem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateProblem = useUpdateProblem(problem.id);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(problem.name);
    setUrl(problem.url ?? "");
    setPattern(problem.pattern ?? "");
    setDifficulty(problem.difficulty ?? "");
    setError(null);
  }, [open, problem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit problem">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          updateProblem.mutate(
            {
              name: name.trim(),
              url: url.trim() || null,
              pattern: pattern.trim() || null,
              difficulty: (difficulty || null) as Problem["difficulty"],
            },
            {
              onSuccess: () => onOpenChange(false),
              onError: (e) => setError(e.message),
            },
          );
        }}
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={300} required autoFocus />
        <Input label="Link" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://leetcode.com/problems/…" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="sliding-window" maxLength={60} />
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Difficulty</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">—</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
        </div>
        {error ? <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" busy={updateProblem.isPending} busyLabel="Saving…" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

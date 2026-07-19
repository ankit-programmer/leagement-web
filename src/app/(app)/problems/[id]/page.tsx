"use client";

import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, ClockIcon, PlayIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ERROR_CLASS_META, RESULT_META, TIME_PHASES, dueLabel, fromDateInput, toDateInput } from "@/components/problems/meta";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { type Attempt, useProblem, useUpdateProblem } from "@/lib/queries/problems";

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

function TimeSplit({ attempt }: { attempt: Attempt }) {
  const parts = TIME_PHASES.map((p) => ({ label: p.label, value: attempt[p.key] ?? 0 })).filter((p) => p.value > 0);
  if (parts.length === 0) return null;
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
      <div className="flex h-2 flex-1 max-w-56 overflow-hidden rounded-full bg-surface-subtle" title={parts.map((p) => `${p.label} ${p.value}m`).join(" · ")}>
        {parts.map((p, i) => (
          <div
            key={p.label}
            className="h-full"
            style={{ width: `${(p.value / total) * 100}%`, background: `oklch(65% 0.14 ${210 + i * 28})` }}
          />
        ))}
      </div>
      <span className="font-mono">{total}m</span>
      <span className="text-ink-faint">({parts.map((p) => `${p.label[0]}${p.value}`).join(" ")})</span>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className="font-bold text-ink-muted">{label}:</span> <span className="text-ink-secondary">{children}</span>
    </p>
  );
}

function AttemptCard({ attempt }: { attempt: Attempt }) {
  const failed = attempt.result === "needed_editorial" || attempt.result === "wrong_approach";
  const overconfident = attempt.predicted === "pass" && failed;
  return (
    <Card>
      <CardContent className="space-y-2.5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{dateFmt.format(new Date(attempt.createdAt))}</span>
          <Pill tone={RESULT_META[attempt.result].tone}>{RESULT_META[attempt.result].label}</Pill>
          {attempt.errorClass ? <Pill tone="danger">{ERROR_CLASS_META[attempt.errorClass].label}</Pill> : null}
          {overconfident ? <Pill tone="warning">overconfident</Pill> : null}
          {attempt.predicted && !overconfident ? (
            <span className="text-ink-faint">predicted {attempt.predicted}</span>
          ) : null}
          <span className="ml-auto text-ink-faint">→ next {dateFmt.format(new Date(attempt.nextDueApplied))}</span>
        </div>
        <TimeSplit attempt={attempt} />
        {attempt.divergence ? <Labeled label="Diverged at">{attempt.divergence}</Labeled> : null}
        {attempt.missedCue ? <Labeled label="Missed cue">{attempt.missedCue}</Labeled> : null}
        {attempt.selfExplain ? <Labeled label="Self-explain">{attempt.selfExplain}</Labeled> : null}
        {attempt.cardsMade ? (
          <div className="text-sm">
            <span className="font-bold text-ink-muted">Cards:</span>
            <ul className="mt-1 space-y-0.5">
              {attempt.cardsMade.split("\n").filter(Boolean).map((front, i) => (
                <li key={i} className="rounded-chip bg-surface-subtle px-2.5 py-1 font-mono text-xs text-ink-secondary">
                  {front}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {attempt.notes ? (
          <div className="prose-sm max-w-none border-t border-hairline/60 pt-2 text-sm">
            <Markdown>{attempt.notes}</Markdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: problem, isLoading, isError, error, refetch } = useProblem(id);
  const updateProblem = useUpdateProblem(id);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (isError || !problem) return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;

  const due = dueLabel(problem.nextDue);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/problems" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" /> All problems
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.025em]">
            <span className="truncate">{problem.name}</span>
            {problem.url ? (
              <a href={problem.url} target="_blank" rel="noreferrer" aria-label="Open problem" className="shrink-0 text-ink-faint hover:text-brand">
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </a>
            ) : null}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            {problem.pattern ? <Pill>{problem.pattern}</Pill> : null}
            {problem.difficulty ? <span>{problem.difficulty}</span> : null}
            {problem.status === "retired" ? (
              <Pill tone="success">retired</Pill>
            ) : (
              <span className={due.overdue ? "font-semibold text-danger" : ""}>{due.text}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/problems/${problem.id}/attempt`}>
            <Button>
              <PlayIcon className="h-4 w-4" /> Start attempt
            </Button>
          </Link>
          <Link href={`/problems/${problem.id}/log`}>
            <Button variant="secondary">Log session</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold tracking-[-0.01em]">Description / SPEC</h2>
            {!editingDesc ? (
              <button
                type="button"
                onClick={() => {
                  setDescDraft(problem.description ?? "");
                  setEditingDesc(true);
                }}
                className="text-sm font-semibold text-ink-muted hover:text-ink"
              >
                {problem.description ? "Edit" : "Add"}
              </button>
            ) : null}
          </div>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder={"Paste the statement or your SPEC block:\nIN: …\nOUT: …\nEDGE: …\nEX: …"}
                className="min-h-40"
                maxLength={20_000}
              />
              <div className="flex gap-2">
                <Button
                  busy={updateProblem.isPending}
                  busyLabel="Saving…"
                  onClick={() => updateProblem.mutate({ description: descDraft.trim() || null }, { onSuccess: () => setEditingDesc(false) })}
                >
                  Save
                </Button>
                <Button variant="secondary" onClick={() => setEditingDesc(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : problem.description ? (
            <div className="prose-sm max-w-none text-sm">
              <Markdown>{problem.description}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-ink-faint">
              No description yet — paste the statement or your SPEC block (IN / OUT / EDGE / EX). It stays visible while you write post-mortems.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Next practice date</span>
            <input
              type="date"
              value={toDateInput(problem.nextDue)}
              onChange={(e) => e.target.value && updateProblem.mutate({ nextDue: fromDateInput(e.target.value) })}
              className="rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
          <Button
            variant="secondary"
            busy={updateProblem.isPending}
            onClick={() => updateProblem.mutate({ status: problem.status === "retired" ? "active" : "retired" })}
          >
            {problem.status === "retired" ? "Reactivate" : "Retire"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-bold tracking-[-0.01em]">
          Session history <span className="font-mono text-ink-faint">({problem.attempts.length})</span>
        </h2>
        {problem.attempts.length === 0 ? (
          <p className="text-sm text-ink-faint">No sessions yet — attempt it, then write the post-mortem here.</p>
        ) : (
          problem.attempts.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />)
        )}
      </div>
    </div>
  );
}

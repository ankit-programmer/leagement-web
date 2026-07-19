"use client";

import { ArrowTopRightOnSquareIcon, PlusIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { ERROR_CLASS_META, RESULT_META, dueLabel } from "@/components/problems/meta";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { type ProblemListRow, useCreateProblem, useProblemStats, useProblems } from "@/lib/queries/problems";

function AddProblemForm({ deckId }: { deckId?: string }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProblem = useCreateProblem();

  return (
    <form
      className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        createProblem.mutate(
          {
            name: name.trim(),
            url: url.trim() || undefined,
            pattern: pattern.trim() || undefined,
            difficulty: difficulty || undefined,
            deckId,
          },
          {
            onSuccess: () => {
              setName("");
              setUrl("");
              setPattern("");
              setDifficulty("");
            },
            onError: (e) => setError(e.message),
          },
        );
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Problem name" aria-label="Problem name" required maxLength={300} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://leetcode.com/problems/…" aria-label="Problem link" />
      <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern tag" aria-label="Pattern" maxLength={60} />
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        aria-label="Difficulty"
        className="rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <option value="">difficulty</option>
        <option value="easy">easy</option>
        <option value="medium">medium</option>
        <option value="hard">hard</option>
      </select>
      <Button type="submit" busy={createProblem.isPending} busyLabel="Adding…" disabled={!name.trim()}>
        <PlusIcon className="h-4 w-4" /> Add
      </Button>
      {error ? <p className="sm:col-span-5 rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p> : null}
    </form>
  );
}

function ProblemRow({ problem }: { problem: ProblemListRow }) {
  const due = dueLabel(problem.nextDue);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline/60 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold">
          <Link href={`/problems/${problem.id}`} className="truncate hover:underline">
            {problem.name}
          </Link>
          {problem.url ? (
            <a href={problem.url} target="_blank" rel="noreferrer" aria-label="Open problem" className="shrink-0 text-ink-faint hover:text-brand">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          ) : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
          {problem.pattern ? <Pill>{problem.pattern}</Pill> : null}
          {problem.difficulty ? <span>{problem.difficulty}</span> : null}
          <span>
            {problem.attemptCount} session{problem.attemptCount === 1 ? "" : "s"}
          </span>
          {problem.lastResult ? (
            <Pill tone={RESULT_META[problem.lastResult].tone}>{RESULT_META[problem.lastResult].label}</Pill>
          ) : (
            <Pill tone="brand">new</Pill>
          )}
          <span className={due.overdue ? "font-semibold text-danger" : ""}>{due.text}</span>
        </p>
      </div>
      <Link href={`/problems/${problem.id}/log`}>
        <Button variant="secondary">Log session</Button>
      </Link>
    </div>
  );
}

/** The practice-problems surface — global at /problems, or scoped inside a practice-type deck. */
export function ProblemsView({ deckId }: { deckId?: string }) {
  const { data: problems, isLoading, isError, error, refetch } = useProblems({ deckId });
  const { data: stats } = useProblemStats(deckId);
  const [showRetired, setShowRetired] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !problems) return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;

  const active = problems.filter((p) => p.status === "active");
  const retired = problems.filter((p) => p.status === "retired");
  const dueList = active.filter((p) => dueLabel(p.nextDue).overdue);
  const upcoming = active.filter((p) => !dueLabel(p.nextDue).overdue);
  const topError = stats?.errorClasses30d[0];

  return (
    <div className="space-y-6">
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Consistency</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.02em]">{stats.practicedDaysLast7}/7</p>
              <p className="mt-0.5 text-xs text-ink-faint">days practiced this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Solve rate (30d)</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.02em]">
                {stats.solveRate30d !== null ? `${Math.round(stats.solveRate30d * 100)}%` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">solved within the time cap</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Top error (30d)</p>
              <p className="mt-1 text-lg font-bold tracking-[-0.01em]">
                {topError ? ERROR_CLASS_META[topError.errorClass].label : "—"}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {topError ? `${topError.count}× — this owns next week's drills` : "no errors logged yet"}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardContent>
          <h2 className="font-bold tracking-[-0.01em]">Add a problem</h2>
          <div className="mt-3">
            <AddProblemForm deckId={deckId} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-bold tracking-[-0.01em]">
            Due today {dueList.length > 0 ? <span className="font-mono text-brand">({dueList.length})</span> : null}
          </h2>
          {dueList.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">Nothing due — add a problem or pull one forward from the list below.</p>
          ) : (
            <div className="mt-2">
              {dueList.map((problem) => (
                <ProblemRow key={problem.id} problem={problem} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {upcoming.length > 0 ? (
        <Card>
          <CardContent>
            <h2 className="font-bold tracking-[-0.01em]">Scheduled</h2>
            <div className="mt-2">
              {upcoming.map((problem) => (
                <ProblemRow key={problem.id} problem={problem} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {retired.length > 0 ? (
        <Card>
          <CardContent>
            <button type="button" onClick={() => setShowRetired((s) => !s)} className="text-sm font-semibold text-ink-muted hover:text-ink">
              {showRetired ? "Hide" : "Show"} retired ({retired.length})
            </button>
            {showRetired ? (
              <div className="mt-2">
                {retired.map((problem) => (
                  <ProblemRow key={problem.id} problem={problem} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {problems.length === 0 ? (
        <EmptyState
          icon={<PuzzlePieceIcon />}
          title="No problems yet"
          hint="Add the problems you're practicing (name + link). After each session, log the result and post-mortem — failed problems come back at T+3 and T+10 by default."
        />
      ) : null}
    </div>
  );
}

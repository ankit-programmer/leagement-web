"use client";

import { ArrowTopRightOnSquareIcon, PlayIcon, PlusIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { useActiveAttempt } from "@/components/problems/attempt-timer";
import { DIFFICULTY_TONE, ERROR_CLASS_META, RESULT_META, dueLabel, fromDateInput, learningDayKey } from "@/components/problems/meta";
import { ActivityChart, UpcomingLoadChart } from "@/components/problems/PracticeCharts";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { type ProblemListRow, useCreateProblem, useProblemStats, useProblems } from "@/lib/queries/problems";

function AddProblemForm({ deckId, allProblems }: { deckId?: string; allProblems?: ProblemListRow[] }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [firstDue, setFirstDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProblem = useCreateProblem();
  const fieldClass =
    "rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <form
      className="grid gap-2 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        createProblem.mutate(
          {
            name: name.trim(),
            url: url.trim() || undefined,
            pattern: pattern.trim() || undefined,
            difficulty: difficulty || undefined,
            nextDue: firstDue ? fromDateInput(firstDue) : undefined,
            deckId,
          },
          {
            onSuccess: () => {
              setName("");
              setUrl("");
              setPattern("");
              setDifficulty("");
              // firstDue is kept on purpose: bulk-adding a batch for the same
              // future day shouldn't require re-picking the date every row.
            },
            onError: (e) => setError(e.message),
          },
        );
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Problem name" aria-label="Problem name" required maxLength={300} className="sm:col-span-2" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://leetcode.com/problems/…" aria-label="Problem link" className="sm:col-span-2" />
      <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern tag" aria-label="Pattern" maxLength={60} />
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty" className={fieldClass}>
        <option value="">difficulty</option>
        <option value="easy">easy</option>
        <option value="medium">medium</option>
        <option value="hard">hard</option>
      </select>
      <input
        type="date"
        value={firstDue}
        onChange={(e) => setFirstDue(e.target.value)}
        aria-label="First practice date (empty = today)"
        title="First practice date — leave empty for today"
        className={fieldClass}
      />
      <Button type="submit" busy={createProblem.isPending} busyLabel="Adding…" disabled={!name.trim()}>
        <PlusIcon className="h-4 w-4" /> Add
      </Button>
      <p className="text-xs text-ink-faint sm:col-span-4">
        Date is the FIRST practice day — leave empty for today. It sticks between adds, so you can file a whole batch onto a future day.
        {firstDue && allProblems ? (
          <span className="ml-1 font-semibold text-ink-muted">
            {allProblems.filter(
              (p) => p.status === "active" && learningDayKey(new Date(p.nextDue)) === learningDayKey(new Date(`${firstDue}T12:00:00`)),
            ).length}{" "}
            already scheduled that day (all decks).
          </span>
        ) : null}
      </p>
      {error ? <p className="sm:col-span-4 rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p> : null}
    </form>
  );
}

function ProblemRow({ problem, attemptRunning }: { problem: ProblemListRow; attemptRunning: boolean }) {
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
          {attemptRunning ? <Pill tone="warning">⏱ attempt running</Pill> : null}
          {/* Pattern tag deliberately hidden here: seeing it before you classify defeats the session. */}
          {problem.difficulty ? <Pill tone={DIFFICULTY_TONE[problem.difficulty]}>{problem.difficulty}</Pill> : null}
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
      <div className="flex items-center gap-2.5">
        <Link
          href={`/problems/${problem.id}/log`}
          className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
        >
          Log
        </Link>
        <Link href={`/problems/${problem.id}/attempt`}>
          <Button className="!px-3 !py-1.5 text-xs">
            <PlayIcon className="h-3.5 w-3.5" /> {attemptRunning ? "Resume" : "Start"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** The practice-problems surface — global at /problems, or scoped inside a practice-type deck. */
export function ProblemsView({ deckId }: { deckId?: string }) {
  const { data: problems, isLoading, isError, error, refetch } = useProblems({ deckId });
  const { data: stats } = useProblemStats(deckId);
  // Schedule load is about YOUR day, not this deck's — always computed globally.
  const { data: allProblems } = useProblems({});
  const { attempt } = useActiveAttempt();
  const [showRetired, setShowRetired] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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
      {/* Add stays at the top so it's one reach away however long the list grows. */}
      <div className="flex justify-end">
        <Button variant={addOpen ? "secondary" : "primary"} onClick={() => setAddOpen((o) => !o)}>
          <PlusIcon className="h-4 w-4" /> {addOpen ? "Close" : "Add problem"}
        </Button>
      </div>

      {addOpen || problems.length === 0 ? (
        <Card>
          <CardContent>
            <h2 className="font-bold tracking-[-0.01em]">Add a problem</h2>
            <div className="mt-3">
              <AddProblemForm deckId={deckId} allProblems={allProblems} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Practice streak</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.02em]">
                🔥 {stats.practiceStreak ?? 0}
                <span className="text-sm font-semibold text-ink-secondary"> day{(stats.practiceStreak ?? 0) === 1 ? "" : "s"}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">{stats.practicedDaysLast7}/7 days this week</p>
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
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Retired</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.02em]">{stats.retiredProblems ?? 0}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{stats.totalSessions ?? 0} sessions logged</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {allProblems ? (
          <Card>
            <CardContent>
              <UpcomingLoadChart problems={allProblems} />
            </CardContent>
          </Card>
        ) : null}
        {stats?.attemptsByDay && stats.attemptsByDay.length > 0 ? (
          <Card>
            <CardContent>
              <ActivityChart data={stats.attemptsByDay} notes={stats.dayNotes} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Today's work first; adding problems is a curation task, not the daily loop. */}
      {problems.length > 0 ? (
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
                  <ProblemRow key={problem.id} problem={problem} attemptRunning={attempt?.problemId === problem.id} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {upcoming.length > 0 ? (
        <Card>
          <CardContent>
            <h2 className="font-bold tracking-[-0.01em]">Scheduled</h2>
            <div className="mt-2">
              {upcoming.map((problem) => (
                <ProblemRow key={problem.id} problem={problem} attemptRunning={attempt?.problemId === problem.id} />
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
                  <ProblemRow key={problem.id} problem={problem} attemptRunning={attempt?.problemId === problem.id} />
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

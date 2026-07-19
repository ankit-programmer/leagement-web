"use client";

import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearFinishedAttempt, takeFinishedAttempt } from "@/components/problems/attempt-timer";
import {
  ERROR_CLASS_META,
  RESULT_META,
  TIME_PHASES,
  fromDateInput,
  toDateInput,
} from "@/components/problems/meta";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type ErrorClass,
  type ProblemResult,
  useLogAttempt,
  useProblem,
  useSuggestions,
  useUpdateProblem,
} from "@/lib/queries/problems";

const RESULTS: ProblemResult[] = ["solved_in_cap", "solved_over", "needed_editorial", "wrong_approach"];
const CLEAN: ProblemResult = "solved_in_cap";

/** Numbered protocol step — the form IS the post-mortem protocol, one section per line of it. */
function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-baseline gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint font-mono text-xs font-bold text-brand-dark dark:text-brand-light">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold tracking-[-0.01em]">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
        </div>
      </div>
      <div className="mt-3 sm:pl-8">{children}</div>
    </section>
  );
}

export default function LogSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: problem, isLoading, isError, error, refetch } = useProblem(id);
  const { data: suggestions } = useSuggestions(id, true);
  const logAttempt = useLogAttempt(id);
  const updateProblem = useUpdateProblem(id);

  const [predicted, setPredicted] = useState<"pass" | "fail" | null>(null);
  const [result, setResult] = useState<ProblemResult | null>(null);
  const [phases, setPhases] = useState<Record<string, string>>({});
  const [errorClass, setErrorClass] = useState<ErrorClass | "">("");
  const [divergence, setDivergence] = useState("");
  const [missedCue, setMissedCue] = useState("");
  const [selfExplain, setSelfExplain] = useState("");
  const [cardsMade, setCardsMade] = useState("");
  const [notes, setNotes] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [retire, setRetire] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [timerFilled, setTimerFilled] = useState(false);

  // A just-finished timed attempt prefills the time split (still editable).
  useEffect(() => {
    const finished = takeFinishedAttempt(id);
    if (!finished) return;
    setPhases(Object.fromEntries(Object.entries(finished.phaseMinutes).map(([key, value]) => [key, String(value)])));
    setTimerFilled(true);
  }, [id]);

  // The ladder's suggestion follows the chosen result until the user edits the date.
  useEffect(() => {
    if (!result || !suggestions || dateTouched) return;
    setNextDue(toDateInput(suggestions[result].nextDue));
    setRetire(suggestions[result].suggestRetire);
  }, [result, suggestions, dateTouched]);

  const totalMinutes = useMemo(
    () => TIME_PHASES.reduce((sum, p) => sum + (Number(phases[p.key]) || 0), 0),
    [phases],
  );
  const fattestPhase = useMemo(() => {
    let best: string | null = null;
    let bestVal = 0;
    for (const p of TIME_PHASES) {
      const v = Number(phases[p.key]) || 0;
      if (v > bestVal) {
        bestVal = v;
        best = p.label;
      }
    }
    return bestVal > 0 ? best : null;
  }, [phases]);

  const clean = result === CLEAN;
  const failed = result === "needed_editorial" || result === "wrong_approach";
  const overconfident = predicted === "pass" && failed;
  const lastAttempt = problem?.attempts[0] ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError || !problem) return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!result || !nextDue) return;
    setFormError(null);
    if (failed && !errorClass) {
      setFormError("Pick the primary error — one class, the first domino. That's what makes the weekly tally work.");
      return;
    }
    const phaseValue = (key: string) => {
      const v = Number(phases[key]);
      return Number.isInteger(v) && v > 0 ? v : undefined;
    };
    logAttempt.mutate(
      {
        attemptId: crypto.randomUUID(),
        result,
        predicted: predicted ?? undefined,
        timeMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        timeUnderstand: phaseValue("timeUnderstand"),
        timeClassify: phaseValue("timeClassify"),
        timePlan: phaseValue("timePlan"),
        timeCode: phaseValue("timeCode"),
        timeDebug: phaseValue("timeDebug"),
        errorClass: errorClass || undefined,
        divergence: divergence.trim() || undefined,
        missedCue: missedCue.trim() || undefined,
        selfExplain: selfExplain.trim() || undefined,
        cardsMade: cardsMade.trim() || undefined,
        notes: notes.trim() || undefined,
        nextDue: fromDateInput(nextDue),
        retire,
      },
      {
        onSuccess: () => {
          clearFinishedAttempt();
          router.push(`/problems/${id}`);
        },
        onError: (e) => setFormError(e.message),
      },
    );
  }

  const chip = (active: boolean) =>
    `rounded-field border px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? "border-brand bg-brand-tint text-brand-dark dark:text-brand-light"
        : "border-hairline bg-surface text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href={`/problems/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" /> {problem.name}
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.025em]">
          Post-mortem
          {problem.url ? (
            <a href={problem.url} target="_blank" rel="noreferrer" aria-label="Open problem" className="text-ink-faint hover:text-brand">
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
          ) : null}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Ten minutes, timeboxed. The output is cards and a re-solve date — never prose you&apos;ll reread.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        {/* ---- The protocol, as a form ---- */}
        <form className="min-w-0 space-y-4" onSubmit={submit}>
          <Step n={1} title="Before you check" hint="Answer from memory of the moment you finished — high-confidence errors are the best-remembered corrections.">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-secondary">Did you think it passed?</span>
              <button type="button" onClick={() => setPredicted("pass")} className={chip(predicted === "pass")}>
                I thought: pass
              </button>
              <button type="button" onClick={() => setPredicted("fail")} className={chip(predicted === "fail")}>
                I thought: fail
              </button>
            </div>
          </Step>

          <Step n={2} title="Result">
            <div className="grid grid-cols-2 gap-2">
              {RESULTS.map((r) => (
                <button key={r} type="button" onClick={() => setResult(r)} className={chip(result === r)}>
                  {RESULT_META[r].label}
                </button>
              ))}
            </div>
            {overconfident ? (
              <p className="mt-2 rounded-chip bg-warning-bg px-3 py-1.5 text-xs font-semibold text-warning-ink">
                Overconfident miss — exactly the kind worth the most careful post-mortem. Take the full ten minutes.
              </p>
            ) : null}
          </Step>

          <Step
            n={3}
            title="Where did the time go?"
            hint={timerFilled ? "⏱ filled from your timer — adjust freely." : "Estimates are fine — the FAT phase is the diagnosis."}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIME_PHASES.map((p) => (
                <label key={p.key} className="space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">{p.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={phases[p.key] ?? ""}
                    onChange={(e) => setPhases((prev) => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder="min"
                    className="w-full rounded-field border border-hairline bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Total: <span className="font-mono font-bold text-ink-secondary">{totalMinutes} min</span>
              {fattestPhase ? (
                <>
                  {" "}
                  · fattest phase: <span className="font-semibold text-ink-secondary">{fattestPhase}</span>
                </>
              ) : null}
            </p>
          </Step>

          {result && clean ? (
            <Step n={4} title="Sharpen the win" hint="Wins carry data too — especially calibration data.">
              <Input
                label="One thing to do faster next time (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. recognized the pattern late — say the trigger out loud sooner"
              />
            </Step>
          ) : result ? (
            <Step n={4} title="Diagnosis" hint="One primary error — multi-cause entries destroy the weekly statistics. Pick the first domino.">
              <div className="space-y-3">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Primary error</span>
                  <select
                    value={errorClass}
                    onChange={(e) => setErrorClass(e.target.value as ErrorClass | "")}
                    className="mt-1 w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">— pick one —</option>
                    {(Object.keys(ERROR_CLASS_META) as ErrorClass[]).map((key) => (
                      <option key={key} value={key}>
                        {ERROR_CLASS_META[key].label}
                        {ERROR_CLASS_META[key].hint ? ` — ${ERROR_CLASS_META[key].hint}` : ""}
                      </option>
                    ))}
                  </select>
                  {errorClass && ERROR_CLASS_META[errorClass].fix ? (
                    <p className="mt-1.5 rounded-chip bg-brand-tint px-3 py-1.5 text-xs text-brand-dark dark:text-brand-light">
                      <span className="font-bold">The fix:</span> {ERROR_CLASS_META[errorClass].fix}
                    </p>
                  ) : null}
                </div>
                <Input
                  label="Divergence point — the exact decision where your path left the correct one"
                  value={divergence}
                  onChange={(e) => setDivergence(e.target.value)}
                  placeholder='e.g. "chose two pointers at min 6 — needed a hashmap because the array is unsorted"'
                />
                <div>
                  <Input
                    label="Missed cue — what in the problem SHOULD have triggered the right pattern"
                    value={missedCue}
                    onChange={(e) => setMissedCue(e.target.value)}
                    placeholder='e.g. "unsorted + pair-with-target = hashmap, not two pointers"'
                  />
                  <p className="mt-1 text-xs text-ink-faint">This sentence is a trigger-card front, verbatim.</p>
                </div>
                <Textarea
                  label="Self-explain (2 sentences, say them OUT LOUD first)"
                  value={selfExplain}
                  onChange={(e) => setSelfExplain(e.target.value)}
                  placeholder="Why does the canonical solution work? Why couldn't yours be patched?"
                  className="min-h-20"
                />
              </div>
            </Step>
          ) : null}

          {result ? (
            <>
              <Step n={5} title="Cards" hint="The post-mortem's output must be cards, not prose. 1–3 fronts, one per line — add them to your deck after.">
                <Textarea
                  value={cardsMade}
                  onChange={(e) => setCardsMade(e.target.value)}
                  placeholder={
                    'Problem says "unsorted array, find pair summing to k" — which structure and why?\nWhat breaks if you sort first when the answer needs original indices?'
                  }
                  className="min-h-20 font-mono text-xs"
                  aria-label="Card fronts, one per line"
                />
              </Step>

              <Step n={6} title="Schedule the re-solve" hint="A problem is learned when you've re-derived it cold twice, spaced — not at the aha moment.">
                <div className="flex flex-wrap items-end gap-4">
                  <label className="space-y-1">
                    <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                      Next practice date (suggested — yours to change)
                    </span>
                    <input
                      type="date"
                      value={nextDue}
                      onChange={(e) => {
                        setNextDue(e.target.value);
                        setDateTouched(true);
                      }}
                      className="rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </label>
                  {suggestions?.[result]?.suggestRetire ? (
                    <label className="flex items-center gap-2 pb-2 text-sm text-ink-secondary">
                      <input type="checkbox" checked={retire} onChange={(e) => setRetire(e.target.checked)} className="h-4 w-4 accent-[--brand]" />
                      Retire — 3 clean spaced solves; it&apos;s earned it
                    </label>
                  ) : null}
                </div>
              </Step>

              {!clean ? (
                <Textarea
                  label="Anything else (optional, markdown)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-16"
                />
              ) : null}
            </>
          ) : null}

          {formError ? <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={logAttempt.isPending} onClick={() => router.push(`/problems/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" busy={logAttempt.isPending} busyLabel="Saving…" disabled={!result || !nextDue}>
              Save post-mortem
            </Button>
          </div>
        </form>

        {/* ---- Context rail: the problem + what you said last time ---- */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-card border border-hairline bg-surface-subtle/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Problem</h3>
              {problem.description && !editingDesc ? (
                <button
                  type="button"
                  onClick={() => {
                    setDescDraft(problem.description ?? "");
                    setEditingDesc(true);
                  }}
                  className="text-xs font-semibold text-ink-faint hover:text-ink"
                >
                  Edit
                </button>
              ) : null}
            </div>
            {editingDesc || !problem.description ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editingDesc ? descDraft : descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  placeholder={"Paste the statement or your SPEC block:\nIN: …\nOUT: …\nEDGE: …\nEX: …"}
                  className="min-h-32 text-xs"
                  aria-label="Problem description"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    busy={updateProblem.isPending}
                    onClick={() =>
                      updateProblem.mutate(
                        { description: descDraft.trim() || null },
                        { onSuccess: () => setEditingDesc(false) },
                      )
                    }
                  >
                    Save description
                  </Button>
                  {editingDesc ? (
                    <Button variant="secondary" onClick={() => setEditingDesc(false)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="prose-sm mt-2 max-h-80 max-w-none overflow-y-auto text-sm">
                <Markdown>{problem.description}</Markdown>
              </div>
            )}
          </section>

          {lastAttempt ? (
            <section className="rounded-card border border-hairline bg-surface-subtle/60 p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Last session — don&apos;t repeat it</h3>
              <div className="mt-2 space-y-1.5 text-sm">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={RESULT_META[lastAttempt.result].tone}>{RESULT_META[lastAttempt.result].label}</Pill>
                  {lastAttempt.errorClass ? <Pill tone="danger">{ERROR_CLASS_META[lastAttempt.errorClass].label}</Pill> : null}
                  <span className="text-xs text-ink-faint">
                    {new Date(lastAttempt.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </span>
                </p>
                {lastAttempt.missedCue ? (
                  <p className="text-xs">
                    <span className="font-bold text-ink-muted">Missed cue:</span> {lastAttempt.missedCue}
                  </p>
                ) : null}
                {lastAttempt.divergence ? (
                  <p className="text-xs">
                    <span className="font-bold text-ink-muted">Diverged at:</span> {lastAttempt.divergence}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

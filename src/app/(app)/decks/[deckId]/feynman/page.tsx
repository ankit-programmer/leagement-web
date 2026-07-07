"use client";

import { AcademicCapIcon, ArrowLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDeck } from "@/lib/queries/decks";
import {
  type FeynmanSession,
  useFeynmanSessions,
  useSubmitExplanation,
  useSuggestTopics,
} from "@/lib/queries/feynman";

const RATING_TONE: Record<FeynmanSession["rating"], "success" | "warning" | "danger"> = {
  strong: "success",
  developing: "warning",
  shaky: "danger",
};

function CritiquePanel({ session }: { session: FeynmanSession }) {
  const { critique } = session;
  return (
    <Card className="animate-fade-up">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold tracking-[-0.01em]">{session.topic}</h2>
          <Pill tone={RATING_TONE[session.rating]}>{session.rating}</Pill>
        </div>
        {critique.strengths.length > 0 ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-success-ink">What lands</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
              {critique.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {critique.gaps.length > 0 ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-warning-ink">
              Gaps — can you answer these?
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
              {critique.gaps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {critique.misconceptions.length > 0 ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-danger-ink">
              Worth a second look
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
              {critique.misconceptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="rounded-chip bg-brand-tint px-3 py-2 text-sm text-ink-secondary">
          <span className="font-semibold">Go deeper:</span> {critique.followUp}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeynmanPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { data: deck } = useDeck(deckId);
  const sessions = useFeynmanSessions(deckId);
  const suggest = useSuggestTopics();
  const submit = useSubmitExplanation(deckId);

  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [latest, setLatest] = useState<FeynmanSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = (latest !== null || topic.trim().length >= 2) && explanation.trim().length >= 40;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/decks/${deckId}`}
          aria-label="Back to deck"
          className="rounded-chip p-2 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <IconBadge>
          <AcademicCapIcon />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Feynman mode</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {deck ? `Explain a concept from “${deck.name}” in your own words — the AI probes for gaps, it never explains for you.` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {latest ? (
            // Mid-thread: the topic is locked; revisions reply to the last critique.
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                  Revising
                </span>
                <p className="font-bold tracking-[-0.01em]">{latest.topic}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-faint">rev {latest.revision}</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setLatest(null);
                    setTopic("");
                    setExplanation("");
                    setError(null);
                  }}
                >
                  New topic
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="Concept"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why spaced reviews beat cramming"
                maxLength={200}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  busy={suggest.isPending}
                  busyLabel="Thinking…"
                  onClick={() =>
                    suggest.mutate(deckId, {
                      onSuccess: setTopics,
                      onError: (e) => setError(e.message),
                    })
                  }
                >
                  <SparklesIcon className="h-4 w-4" /> Suggest topics
                </Button>
                {topics.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTopic(suggestion)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      topic === suggestion
                        ? "bg-brand-tint-strong text-brand-dark dark:text-brand-light"
                        : "bg-surface-subtle text-ink-muted hover:text-ink"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Your explanation — as if teaching a curious 12-year-old"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="No looking at the cards. Write what you actually understand…"
            className="min-h-48"
            maxLength={8000}
          />

          {error ? (
            <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
          ) : null}

          <div className="flex justify-end">
            <Button
              busy={submit.isPending}
              busyLabel="Reading your explanation…"
              disabled={!canSubmit}
              onClick={() => {
                setError(null);
                submit.mutate(
                  {
                    topic: (latest?.topic ?? topic).trim(),
                    explanation: explanation.trim(),
                    parentId: latest?.id,
                  },
                  {
                    onSuccess: (session) => setLatest(session),
                    onError: (e) => setError(e.message),
                  },
                );
              }}
            >
              {latest ? "Submit revision" : "Get critique"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {latest ? (
        <>
          <CritiquePanel session={latest} />
          <p className="text-center text-sm text-ink-muted">
            Revise your explanation above to address the gaps, then get another critique — that loop is
            the technique.
          </p>
        </>
      ) : null}

      {sessions.isLoading ? (
        <Skeleton className="h-24" />
      ) : sessions.data && sessions.data.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
            Past sessions
          </h2>
          {sessions.data
            .filter((session) => session.id !== latest?.id)
            .map((session) => (
              <details
                key={session.id}
                className="rounded-card border border-hairline bg-surface px-4 py-3 shadow-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{session.topic}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {session.revision > 1 ? (
                      <span className="font-mono text-xs text-ink-faint">rev {session.revision}</span>
                    ) : null}
                    <Pill tone={RATING_TONE[session.rating]}>{session.rating}</Pill>
                    <span className="font-mono text-xs text-ink-faint">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </summary>
                <div className="mt-3 space-y-3 border-t border-hairline pt-3">
                  <p className="whitespace-pre-wrap text-sm text-ink-secondary">{session.explanation}</p>
                  <CritiquePanel session={session} />
                </div>
              </details>
            ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { AcademicCapIcon, ArrowLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Markdown } from "@/components/ui/Markdown";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDeck } from "@/lib/queries/decks";
import {
  type FeynmanMessage,
  type FeynmanSession,
  useEndFeynman,
  useFeynmanSession,
  useFeynmanSessions,
  useSendFeynmanMessage,
  useStartFeynman,
  useSuggestTopics,
} from "@/lib/queries/feynman";

const RATING_TONE: Record<NonNullable<FeynmanSession["rating"]>, "success" | "warning" | "danger"> = {
  strong: "success",
  developing: "warning",
  shaky: "danger",
};

function CritiquePanel({ session }: { session: FeynmanSession }) {
  const { critique, rating } = session;
  if (!critique || !rating) return null;
  return (
    <Card className="animate-fade-up">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold tracking-[-0.01em]">{session.topic}</h2>
          <Pill tone={RATING_TONE[rating]}>{rating}</Pill>
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

function ChatBubble({ message }: { message: FeynmanMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-card px-3.5 py-1.5 text-sm ${
          isUser ? "bg-brand-tint" : "border border-hairline bg-surface-subtle"
        }`}
      >
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}

function Transcript({ messages }: { messages: FeynmanMessage[] }) {
  return (
    <div className="space-y-2.5">
      {messages.map((message) => (
        <ChatBubble key={message.at + message.role} message={message} />
      ))}
    </div>
  );
}

/** The live teaching conversation: transcript, composer, End session. */
function ChatSession({
  deckId,
  sessionId,
  onDone,
}: {
  deckId: string;
  sessionId: string;
  onDone: () => void;
}) {
  const session = useFeynmanSession(sessionId);
  const send = useSendFeynmanMessage(sessionId);
  const end = useEndFeynman(deckId, sessionId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = session.data?.messages ?? [];
  const completed = session.data?.status === "completed";
  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, send.isPending]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || send.isPending || end.isPending || completed) return;
    setError(null);
    send.mutate(content, {
      onSuccess: () => setDraft(""),
      onError: (e) => setError(e.message),
    });
  };

  if (session.isLoading) return <Skeleton className="h-64" />;
  if (session.isError)
    return <QueryError message={session.error?.message} onRetry={() => session.refetch()} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                {completed ? "Session over" : "Teaching"}
              </span>
              <p className="truncate font-bold tracking-[-0.01em]">{session.data?.topic}</p>
            </div>
            {completed ? null : (
              <Button
                variant="secondary"
                busy={end.isPending}
                busyLabel="Rating your session…"
                disabled={userTurns === 0 || send.isPending}
                onClick={() => {
                  setError(null);
                  end.mutate(undefined, { onError: (e) => setError(e.message) });
                }}
              >
                End session
              </Button>
            )}
          </div>

          <Transcript messages={messages} />
          {/* While the model composes its next question, the student is "typing". */}
          {send.isPending ? (
            <div className="flex justify-start">
              <div className="rounded-card border border-hairline bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-faint">
                <span className="animate-pulse">thinking…</span>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />

          {error ? (
            <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
          ) : null}

          {completed ? null : (
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  userTurns === 0
                    ? "Start explaining — no peeking at the cards…"
                    : "Answer the question in your own words…"
                }
                aria-label="Your explanation"
                className="min-h-12 flex-1"
                maxLength={4000}
                disabled={send.isPending}
              />
              <Button busy={send.isPending} busyLabel="…" disabled={!draft.trim()} onClick={handleSend}>
                Send
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {completed && session.data ? (
        <>
          <CritiquePanel session={session.data} />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={onDone}>
              Teach another topic
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** History accordion row; chat transcripts are fetched lazily on first expand. */
function SessionAccordion({ session }: { session: FeynmanSession }) {
  const [opened, setOpened] = useState(false);
  const isChat = session.explanation === null;
  const detail = useFeynmanSession(opened && isChat ? session.id : null);

  return (
    <details
      className="rounded-card border border-hairline bg-surface px-4 py-3 shadow-card"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) setOpened(true);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold">{session.topic}</span>
        <span className="flex shrink-0 items-center gap-2">
          {session.rating ? <Pill tone={RATING_TONE[session.rating]}>{session.rating}</Pill> : null}
          <span className="font-mono text-xs text-ink-faint">
            {new Date(session.createdAt).toLocaleDateString()}
          </span>
        </span>
      </summary>
      <div className="mt-3 space-y-3 border-t border-hairline pt-3">
        {isChat ? (
          detail.isLoading ? (
            <Skeleton className="h-24" />
          ) : detail.data?.messages ? (
            <Transcript messages={detail.data.messages} />
          ) : null
        ) : (
          <p className="whitespace-pre-wrap text-sm text-ink-secondary">{session.explanation}</p>
        )}
        <CritiquePanel session={session} />
      </div>
    </details>
  );
}

export default function FeynmanPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { data: deck } = useDeck(deckId);
  const sessions = useFeynmanSessions(deckId);
  const suggest = useSuggestTopics();
  const start = useStartFeynman(deckId);

  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A refresh mid-chat must not lose the session: the list knows it's active.
  const resumable = sessions.data?.find((s) => s.status === "active" && s.id !== activeId);

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
            {deck
              ? `Teach a concept from “${deck.name}” to a curious student — it asks, you explain, and you get rated at the end.`
              : ""}
          </p>
        </div>
      </div>

      {activeId ? (
        <ChatSession
          deckId={deckId}
          sessionId={activeId}
          onDone={() => {
            setActiveId(null);
            setTopic("");
            setError(null);
          }}
        />
      ) : (
        <Card>
          <CardContent className="space-y-4">
            {resumable ? (
              <div className="flex items-center justify-between gap-3 rounded-chip bg-brand-tint px-3 py-2.5">
                <p className="min-w-0 truncate text-sm">
                  <span className="font-semibold">In progress:</span> {resumable.topic}
                </p>
                <Button variant="secondary" className="shrink-0" onClick={() => setActiveId(resumable.id)}>
                  Continue
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Input
                label="What will you teach?"
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

            {error ? (
              <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                busy={start.isPending}
                busyLabel="Finding your student…"
                disabled={topic.trim().length < 2}
                onClick={() => {
                  setError(null);
                  start.mutate(topic.trim(), {
                    onSuccess: (session) => setActiveId(session.id),
                    onError: (e) => setError(e.message),
                  });
                }}
              >
                Start session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sessions.isLoading ? (
        <Skeleton className="h-24" />
      ) : sessions.isError ? (
        <QueryError message={sessions.error?.message} onRetry={() => sessions.refetch()} />
      ) : sessions.data && sessions.data.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
            Past sessions
          </h2>
          {sessions.data
            .filter((session) => session.id !== activeId && session.status === "completed")
            .map((session) => (
              <SessionAccordion key={session.id} session={session} />
            ))}
        </div>
      ) : null}
    </div>
  );
}

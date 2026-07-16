"use client";

import { ChartBarIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CardEditor } from "@/components/cards/CardEditor";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBadge } from "@/components/ui/IconBadge";
import { Pill } from "@/components/ui/Pill";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { REVIEW_MILESTONES } from "@/lib/milestones";
import { useUpdateCard } from "@/lib/queries/cards";
import { useDecks } from "@/lib/queries/decks";
import {
  type AnalyticsStats,
  type MentorNote,
  useAnalytics,
  useMe,
  useMentorNote,
  useOverviewStats,
} from "@/lib/queries/stats";
import type { Card as CardType } from "@/lib/types";

/**
 * Card-state palette, validated with the dataviz six-checks script for BOTH
 * surfaces (light #fff-ish, dark #0f172a-ish): lightness band, chroma, CVD
 * separation (protan ΔE 16.2), contrast ≥3:1. Fixed order, never cycled;
 * identity is reinforced by 2px gaps and the labeled legend (never color-alone).
 */
const STATE_SERIES = [
  { key: "new", label: "New", color: "#16a34a" },
  { key: "learning", label: "Learning", color: "#d97706" },
  { key: "review", label: "Review", color: "#0090f6" },
  { key: "relearning", label: "Relearning", color: "#dc2626" },
] as const;

function StatTile({ label, value, hint, delay = 0 }: { label: string; value: string; hint?: string; delay?: number }) {
  return (
    <Card className="animate-pop-in" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="py-4">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.02em]">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Single-series bar chart: brand hue, thin bars, 2px gaps, per-bar hover tooltip. */
function ReviewsPerDayChart({ data, days }: { data: AnalyticsStats["reviewsPerDay"]; days: number }) {
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const series: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 86_400_000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    series.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  const max = Math.max(1, ...series.map((d) => d.count));

  return (
    <div>
      <div className="flex h-36 items-end gap-[2px]" role="img" aria-label={`Reviews per day, last ${days} days`}>
        {series.map((day, index) => (
          <div key={day.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="animate-bar-rise w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
              style={{
                height: `${Math.round((day.count / max) * 100)}%`,
                minHeight: day.count > 0 ? 3 : 0,
                animationDelay: `${Math.min(index * 6, 350)}ms`,
              }}
            />
            {/* hover layer — hit target is the full column */}
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-0.5 font-mono text-[10px] text-page shadow-raised group-hover:block">
              {day.count} · {day.date.slice(5)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between border-t border-hairline pt-1 font-mono text-[10px] text-ink-faint">
        <span>{series[0]?.date.slice(5)}</span>
        <span>peak {max === 1 && series.every((d) => d.count === 0) ? 0 : max}/day</span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/** Same bar idiom as reviews-per-day: brand hue, hover count, weekday labels. */
function WeekAheadChart({ data }: { data: AnalyticsStats["upcomingWeek"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const heaviest = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
  const dayLabel = (date: string, index: number) => {
    if (index === 0) return "today";
    if (index === 1) return "tmrw";
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  };
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]" role="img" aria-label="Cards due over the next 7 days">
        {data.map((day, index) => (
          <div key={day.date} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="animate-bar-rise w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
              style={{
                height: `${Math.round((day.count / max) * 100)}%`,
                minHeight: day.count > 0 ? 3 : 0,
                animationDelay: `${index * 40}ms`,
              }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-0.5 font-mono text-[10px] text-page shadow-raised group-hover:block">
              {day.count} cards
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] border-t border-hairline pt-1">
        {data.map((day, index) => (
          <span key={day.date} className="flex-1 text-center font-mono text-[10px] text-ink-faint">
            {dayLabel(day.date, index)}
          </span>
        ))}
      </div>
      {heaviest && heaviest.count > 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          Heaviest: <span className="font-mono">{heaviest.count}</span> cards on{" "}
          {new Date(`${heaviest.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
          })}
          {heaviest.date === data[0]?.date ? " (today)" : ""}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Nothing scheduled this week — add or review cards.</p>
      )}
    </div>
  );
}

/**
 * Rolling 7-day true retention as an SVG line. Days whose trailing window has
 * too few scheduled reviews arrive as null and render as GAPS — an honest
 * break in the line, never an interpolated guess.
 */
function RetentionTrendChart({
  data,
  target,
}: {
  /** Undefined when the API predates this field (deploy skew) — render the empty state, never crash. */
  data: AnalyticsStats["retentionTrend"] | undefined;
  target?: number;
}) {
  const points = data ?? [];
  const valid = points
    .map((point, index) => ({ ...point, index }))
    .filter((point): point is typeof point & { retention: number } => point.retention !== null);

  if (valid.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        Your retention trend appears after a week of scheduled reviews — keep reviewing.
      </p>
    );
  }

  const yMax = 1;
  const yMin = Math.min(0.6, Math.floor(Math.min(...valid.map((p) => p.retention)) * 10) / 10);
  const x = (index: number) => (index / (points.length - 1)) * 100;
  const y = (retention: number) => ((yMax - retention) / (yMax - yMin)) * 100;

  // Consecutive non-null runs become separate line segments; lone points get a dot.
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];
  points.forEach((point, index) => {
    if (point.retention === null) {
      if (run.length > 0) segments.push(run);
      run = [];
    } else {
      run.push({ x: x(index), y: y(point.retention) });
    }
  });
  if (run.length > 0) segments.push(run);

  const ticks = [1, 0.9, 0.8, 0.7, 0.6].filter((tick) => tick >= yMin);
  const latest = valid[valid.length - 1];
  // Direction: compare against the nearest valid point ~4 weeks earlier.
  const earlier = [...valid].reverse().find((point) => point.index <= latest.index - 28);
  const deltaPts = earlier ? Math.round((latest.retention - earlier.retention) * 100) : null;

  return (
    <div>
      <p className="text-xs text-ink-muted">
        Last 7 days: <span className="font-mono font-bold text-ink">{Math.round(latest.retention * 100)}%</span>
        {deltaPts !== null ? (
          <span className={deltaPts >= 0 ? "text-success-ink" : "text-danger-ink"}>
            {" "}
            {deltaPts >= 0 ? "▲" : "▼"} {Math.abs(deltaPts)}pt{Math.abs(deltaPts) === 1 ? "" : "s"} vs last month
          </span>
        ) : null}
      </p>
      <div className="relative mt-2 h-36" role="img" aria-label="Rolling 7-day retention over the last 90 days">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            {/* rtlayer chart signature: area under the line fades to nothing. */}
            <linearGradient id="retention-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <line
              key={tick}
              x1="0"
              x2="100"
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--hairline)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {target !== undefined && target >= yMin ? (
            <line
              x1="0"
              x2="100"
              y1={y(target)}
              y2={y(target)}
              stroke="var(--ink-faint)"
              strokeWidth="1"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {segments.map((segment) =>
            segment.length > 1 ? (
              <polygon
                key={`a-${segment[0].x}`}
                points={`${segment.map((p) => `${p.x},${p.y}`).join(" ")} ${segment[segment.length - 1]!.x},100 ${segment[0].x},100`}
                fill="url(#retention-fill)"
              />
            ) : null,
          )}
          {segments.map((segment) =>
            segment.length === 1 ? (
              <circle
                key={`p-${segment[0].x}`}
                cx={segment[0].x}
                cy={segment[0].y}
                r="2"
                fill="var(--brand)"
              />
            ) : (
              <polyline
                key={`s-${segment[0].x}`}
                points={segment.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
        </svg>
        {/* tick labels sit above the gridlines they name */}
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute left-0 -translate-y-full font-mono text-[10px] text-ink-faint"
            style={{ top: `${y(tick)}%` }}
          >
            {Math.round(tick * 100)}%
          </span>
        ))}
        {target !== undefined && target >= yMin ? (
          <span
            className="absolute right-0 -translate-y-full font-mono text-[10px] text-ink-faint"
            style={{ top: `${y(target)}%` }}
          >
            target
          </span>
        ) : null}
        {/* hover columns — same chip idiom as the bar charts */}
        <div className="absolute inset-0 flex">
          {points.map((point) => (
            <div key={point.date} className="group relative h-full flex-1">
              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-0.5 font-mono text-[10px] text-page shadow-raised group-hover:block">
                {point.retention !== null
                  ? `${Math.round(point.retention * 100)}% · ${point.attempts} reviews · ${point.date.slice(5)}`
                  : `${point.attempts} review${point.attempts === 1 ? "" : "s"} in window · ${point.date.slice(5)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between border-t border-hairline pt-1 font-mono text-[10px] text-ink-faint">
        <span>{points[0]?.date.slice(5)}</span>
        <span>rolling 7-day · gaps = under 10 reviews</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function MaturityBar({ cardsByState }: { cardsByState: AnalyticsStats["cardsByState"] }) {
  const total = STATE_SERIES.reduce((sum, s) => sum + cardsByState[s.key], 0);
  if (total === 0) return null;
  const matured = Math.round((cardsByState.review / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-subtle">
        {STATE_SERIES.filter((s) => cardsByState[s.key] > 0).map((s) => (
          <div
            key={s.key}
            style={{ width: `${(cardsByState[s.key] / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${cardsByState[s.key]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {STATE_SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-mono">{cardsByState[s.key]}</span>
          </span>
        ))}
      </div>
      <p className="text-sm text-ink-secondary">
        <span className="font-bold">{matured}%</span> of your collection has matured into long-term review.
      </p>
    </div>
  );
}

function ProgressContent() {
  const searchParams = useSearchParams();
  const selectedDeck = searchParams.get("deck") ?? undefined;
  const { data: analytics, isLoading, isFetching, isError, error, refetch } = useAnalytics(selectedDeck);
  const { data: overview } = useOverviewStats();
  const { data: decks } = useDecks();
  const { data: me } = useMe();
  const [range, setRange] = useState<30 | 90>(30);
  const mentor = useMentorNote();
  const [note, setNote] = useState<MentorNote | null>(null);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // In-place card editing (trouble + conquered lists): same machinery as the
  // deck page's ?card= deep link, minus the navigation away from the stats.
  const [editing, setEditing] = useState<CardType | null>(null);
  const updateCard = useUpdateCard(editing?.deckId ?? "");
  const openCardEditor = (cardId: string) => {
    api<CardType>(`/cards/${cardId}`)
      .then(({ data }) => setEditing(data))
      .catch(() => undefined);
  };

  const nextMilestone = analytics
    ? REVIEW_MILESTONES.find((milestone) => milestone > analytics.totals.reviews)
    : undefined;
  const activeDaysLast7 = analytics
    ? analytics.reviewsPerDay.filter(
        (day) => new Date(`${day.date}T12:00:00Z`).getTime() >= Date.now() - 7 * 86_400_000,
      ).length
    : 0;

  const selectDeck = (deckId: string | null) => {
    setNote(null); // a note is scoped to the filter it was asked under
    setMentorError(null);
    // Shallow update — router.replace() does an RSC round-trip to the server,
    // which on a slow connection makes the pill look dead. history.replaceState
    // keeps useSearchParams in sync client-side, instantly.
    window.history.replaceState(null, "", deckId ? `/progress?deck=${deckId}` : "/progress");
  };
  const filterPill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? "bg-brand-tint-strong text-brand-dark dark:text-brand-light"
        : "bg-surface-subtle text-ink-muted hover:text-ink"
    }`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" /> <Skeleton className="h-24" /> <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (isError || !analytics) {
    return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;
  }

  const hasData = analytics.totals.reviews > 0 || analytics.totals.cards > 0;

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge>
            <ChartBarIcon />
          </IconBadge>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.025em]">Progress</h1>
            <p className="mt-0.5 text-sm text-ink-muted">Everything your review history says about you.</p>
          </div>
        </div>
        {hasData ? (
          <Button
            variant="secondary"
            busy={mentor.isPending}
            busyLabel="Reading your data…"
            onClick={() => {
              setMentorError(null);
              mentor.mutate(selectedDeck, {
                onSuccess: setNote,
                onError: (e) => setMentorError(e.message),
              });
            }}
          >
            <SparklesIcon className="h-4 w-4" /> Mentor&apos;s read
          </Button>
        ) : null}
      </div>

      {mentorError ? (
        <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{mentorError}</p>
      ) : null}
      {note ? (
        <Card className="animate-fade-up border-brand/30">
          <CardContent className="space-y-3">
            <h2 className="font-bold tracking-[-0.01em]">{note.headline}</h2>
            <ul className="space-y-2.5">
              {note.observations.map((obs) => (
                <li key={obs.insight} className="text-sm">
                  <p className="text-ink-secondary">{obs.insight}</p>
                  <p className="mt-0.5 font-semibold text-brand-dark dark:text-brand-light">→ {obs.action}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {decks && decks.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => selectDeck(null)} className={filterPill(!selectedDeck)}>
            All decks
          </button>
          {decks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              onClick={() => selectDeck(deck.id)}
              className={filterPill(selectedDeck === deck.id)}
            >
              {deck.name}
            </button>
          ))}
        </div>
      ) : null}

      {!hasData ? (
        <EmptyState
          icon={<ChartBarIcon />}
          title="No data yet"
          hint={
            selectedDeck
              ? "No activity in this deck yet — review it once and check back."
              : "Create a deck and run your first review session — this page fills itself in."
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Reviews all-time"
              value={analytics.totals.reviews.toLocaleString()}
              hint={
                nextMilestone !== undefined
                  ? `${(nextMilestone - analytics.totals.reviews).toLocaleString()} to ${nextMilestone.toLocaleString()}`
                  : undefined
              }
            />
            <StatTile
              label="Streak"
              value={`${overview?.streakDays ?? 0}d`}
              delay={60}
              hint={[
                overview && overview.bestStreak > 0
                  ? `best ${overview.bestStreak}d${selectedDeck ? " · all decks" : ""}`
                  : selectedDeck
                    ? "all decks"
                    : null,
                `active ${activeDaysLast7} of last 7 days`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            {analytics.totals.mastered !== undefined ? (
              <StatTile
                label="Mastered"
                value={`${analytics.totals.mastered.toLocaleString()} / ${analytics.totals.cards.toLocaleString()}`}
                delay={120}
                hint="recalled correctly on its last 3 review days"
              />
            ) : (
              <StatTile label="Cards" value={analytics.totals.cards.toLocaleString()} delay={120} />
            )}
            {selectedDeck ? (
              <StatTile
                label="Feynman sessions"
                value={analytics.totals.feynmanSessions.toLocaleString()}
                delay={180}
              />
            ) : (
              <StatTile
                label="Decks"
                value={analytics.totals.decks.toLocaleString()}
                delay={180}
                hint={
                  analytics.totals.feynmanSessions > 0
                    ? `${analytics.totals.feynmanSessions} Feynman sessions`
                    : undefined
                }
              />
            )}
          </div>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold tracking-[-0.01em]">Reviews per day</h2>
                <div className="flex gap-1">
                  {([30, 90] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRange(option)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        range === option
                          ? "bg-brand-tint-strong text-brand-dark dark:text-brand-light"
                          : "bg-surface-subtle text-ink-muted hover:text-ink"
                      }`}
                    >
                      {option}d
                    </button>
                  ))}
                </div>
              </div>
              <ReviewsPerDayChart data={analytics.reviewsPerDay} days={range} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-bold tracking-[-0.01em]">Retention trend</h2>
              <RetentionTrendChart data={analytics.retentionTrend} target={me?.retentionTarget} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold tracking-[-0.01em]">Week ahead</h2>
                {analytics.effort.avgSeconds !== null ? (
                  <p className="text-xs text-ink-muted">
                    ~<span className="font-mono">{analytics.effort.avgSeconds}s</span> per card · today&apos;s
                    queue ≈ <span className="font-mono">{analytics.effort.minutesToday} min</span>
                  </p>
                ) : null}
              </div>
              <WeekAheadChart data={analytics.upcomingWeek} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-bold tracking-[-0.01em]">Collection maturity</h2>
              <MaturityBar cardsByState={analytics.cardsByState} />
              {analytics.durability?.medianDaysNow != null ? (
                <p className="text-sm text-ink-secondary">
                  Typical card strength:{" "}
                  <span className="font-mono font-bold">~{analytics.durability.medianDaysNow}d</span> between
                  reviews
                  {analytics.durability.medianDays30dAgo != null &&
                  analytics.durability.medianDays30dAgo !== analytics.durability.medianDaysNow ? (
                    <span
                      className={
                        analytics.durability.medianDaysNow > analytics.durability.medianDays30dAgo
                          ? "text-success-ink"
                          : "text-warning-ink"
                      }
                    >
                      {" "}
                      {analytics.durability.medianDaysNow > analytics.durability.medianDays30dAgo ? "▲" : "▼"}{" "}
                      from ~{analytics.durability.medianDays30dAgo}d a month ago
                    </span>
                  ) : null}{" "}
                  <span className="text-xs text-ink-faint">
                    — spacing at work: the longer a card holds, the less often you need it.
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-bold tracking-[-0.01em]">Trouble cards</h2>
              {analytics.troubleCards.length === 0 ? (
                <p className="text-sm text-ink-muted">No leeches — your cards are healthy. 🌱</p>
              ) : (
                <>
                  <p className="text-xs text-ink-muted">
                    Repeated failures usually mean the card needs rewriting, not more grinding — split it,
                    add context, or delete it.
                  </p>
                  <ul className="space-y-2">
                    {analytics.troubleCards.map((card) => (
                      <li key={card.id} className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openCardEditor(card.id)}
                          className="min-w-0 flex-1 truncate text-left text-sm text-ink-secondary transition-colors hover:text-ink"
                        >
                          {card.front}
                        </button>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {card.sureWrong ? <Pill tone="danger">sure but wrong</Pill> : null}
                          {card.lapses > 0 ? (
                            <Pill tone="warning">{card.lapses} lapses</Pill>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {analytics.comebacks && analytics.comebacks.count > 0 ? (
                <div className="border-t border-hairline pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-success-ink">
                    Conquered ({analytics.comebacks.count})
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    Cards that used to beat you and now hold a 3+ week interval — struggle resolves.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {analytics.comebacks.cards.map((card) => (
                      <li key={card.id} className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openCardEditor(card.id)}
                          className="min-w-0 flex-1 truncate text-left text-sm text-ink-secondary transition-colors hover:text-ink"
                        >
                          {card.front}
                        </button>
                        <Pill tone="success">
                          {card.lapses}× lapsed → {Math.round(card.stability)}d strong
                        </Pill>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-bold tracking-[-0.01em]">Memory quality (30 days)</h2>
              <p className="text-sm text-ink-secondary">
                {analytics.retention30d !== null ? (
                  <>
                    True retention{" "}
                    <span className="font-mono font-bold">{Math.round(analytics.retention30d * 100)}%</span> —
                    share of mature-card reviews you actually recalled.
                  </>
                ) : (
                  "No mature-card reviews yet — retention appears once cards graduate to long-term review."
                )}
              </p>
              {analytics.calibration ? (
                <p className="text-xs text-ink-muted">
                  Calibration:{" "}
                  {[
                    [3, "Sure"] as const,
                    [2, "Think so"] as const,
                    [1, "No idea"] as const,
                  ]
                    .filter(([level]) => analytics.calibration?.levels[level])
                    .map(([level, label]) => {
                      const item = analytics.calibration!.levels[level];
                      return `${label} — ${Math.round(item.recallRate * 100)}% recalled over ${item.attempts}`;
                    })
                    .join(" · ")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {selectedDeck ? null : (
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-bold tracking-[-0.01em]">Per deck</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                      <th className="py-2 pr-4">Deck</th>
                      <th className="py-2 pr-4 text-right">Cards</th>
                      <th className="py-2 pr-4 text-right">Mastered</th>
                      <th className="py-2 pr-4 text-right">Due</th>
                      <th className="py-2 text-right">Retention 30d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.perDeck.map((deck) => (
                      <tr key={deck.id} className="border-b border-hairline/60 last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/decks/${deck.id}`} className="font-semibold text-brand hover:underline">
                            {deck.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">{deck.cards}</td>
                        <td className="py-2 pr-4 text-right font-mono">{deck.mastered ?? "—"}</td>
                        <td className="py-2 pr-4 text-right font-mono">{deck.due}</td>
                        <td className="py-2 text-right font-mono">
                          {deck.retention30d !== null ? `${Math.round(deck.retention30d * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          )}
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title="Edit card">
        {editing ? (
          <CardEditor
            card={editing}
            busy={updateCard.isPending}
            submitLabel="Save"
            busyLabel="Saving…"
            onCancel={() => setEditing(null)}
            onSubmit={(input) =>
              updateCard.mutate(
                { cardId: editing.id, patch: input },
                {
                  onSuccess: () => {
                    setEditing(null);
                    // The trouble/conquered lists render this card's front.
                    queryClient.invalidateQueries({ queryKey: ["stats"] });
                  },
                },
              )
            }
          />
        ) : null}
      </Dialog>
    </div>
  );
}

export default function ProgressPage() {
  // useSearchParams requires a Suspense boundary on statically rendered pages.
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <ProgressContent />
    </Suspense>
  );
}

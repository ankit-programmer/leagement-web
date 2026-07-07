"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBadge } from "@/components/ui/IconBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { type AnalyticsStats, useAnalytics, useOverviewStats } from "@/lib/queries/stats";

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

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
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
        {series.map((day) => (
          <div key={day.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.round((day.count / max) * 100)}%`, minHeight: day.count > 0 ? 3 : 0 }}
            />
            {/* hover layer — hit target is the full column */}
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-chip border border-hairline bg-surface px-2 py-0.5 font-mono text-[10px] text-ink shadow-raised group-hover:block">
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

export default function ProgressPage() {
  const { data: analytics, isLoading, isFetching } = useAnalytics();
  const { data: overview } = useOverviewStats();
  const [range, setRange] = useState<30 | 90>(30);

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
  if (!analytics) return null;

  const hasData = analytics.totals.reviews > 0 || analytics.totals.cards > 0;

  return (
    <div className={`animate-fade-up space-y-6 transition-opacity duration-200 ${isFetching ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <IconBadge>
          <ChartBarIcon />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Progress</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Everything your review history says about you.</p>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          title="No data yet"
          hint="Create a deck and run your first review session — this page fills itself in."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Reviews all-time" value={analytics.totals.reviews.toLocaleString()} />
            <StatTile
              label="Streak"
              value={`${overview?.streakDays ?? 0}d`}
              hint={overview && overview.bestStreak > 0 ? `best ${overview.bestStreak}d` : undefined}
            />
            <StatTile label="Cards" value={analytics.totals.cards.toLocaleString()} />
            <StatTile
              label="Decks"
              value={analytics.totals.decks.toLocaleString()}
              hint={
                analytics.totals.feynmanSessions > 0
                  ? `${analytics.totals.feynmanSessions} Feynman sessions`
                  : undefined
              }
            />
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
              <h2 className="font-bold tracking-[-0.01em]">Collection maturity</h2>
              <MaturityBar cardsByState={analytics.cardsByState} />
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

          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-bold tracking-[-0.01em]">Per deck</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                      <th className="py-2 pr-4">Deck</th>
                      <th className="py-2 pr-4 text-right">Cards</th>
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
        </>
      )}
    </div>
  );
}

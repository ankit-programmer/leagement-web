"use client";

import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconBadge } from "@/components/ui/IconBadge";
import { QueryError } from "@/components/ui/QueryError";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminOverview } from "@/lib/queries/admin";
import { useMe } from "@/lib/queries/stats";

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

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function relativeDay(iso: string | null): string {
  if (!iso) return "never";
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export default function AdminPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const isAdmin = me?.isAdmin === true;
  const { data, isLoading, isError, error, refetch } = useAdminOverview(isAdmin);

  if (meLoading || (isAdmin && isLoading)) {
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

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon />}
        title="Admins only"
        hint="This page shows platform-wide usage and is limited to the instance owner."
      />
    );
  }
  if (isError || !data) {
    return <QueryError message={(error as Error | null)?.message} onRetry={() => refetch()} />;
  }

  // Newest day first — the row you check is today's.
  const activity = [...data.activity].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge>
          <ShieldCheckIcon />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Admin</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Who&apos;s using Leagement, straight from Postgres.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Users"
          value={data.totals.users.toLocaleString()}
          hint={`${data.active.last30d} active in 30d`}
        />
        <StatTile
          label="Active learners"
          value={`${data.active.last24h} / ${data.active.last7d}`}
          delay={60}
          hint="last 24h / last 7 days"
        />
        <StatTile
          label="Reviews"
          value={data.totals.reviews.toLocaleString()}
          delay={120}
          hint={`across ${data.totals.cards.toLocaleString()} live cards`}
        />
        <StatTile
          label="Decks"
          value={data.totals.decks.toLocaleString()}
          delay={180}
          hint={`${data.totals.generationBatches} AI batches · ${data.totals.feynmanSessions} Feynman · ${data.totals.coachMessages30d} coach msgs (30d)`}
        />
      </div>

      <Card>
        <CardContent>
          <h2 className="font-bold tracking-[-0.01em]">Learners</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 pr-4 text-right">Decks</th>
                  <th className="py-2 pr-4 text-right">Cards</th>
                  <th className="py-2 pr-4 text-right">Reviews 7d</th>
                  <th className="py-2 pr-4 text-right">Reviews total</th>
                  <th className="py-2 pr-4">Last active</th>
                  <th className="py-2">Coach</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-2 pr-4">
                      <p className="font-semibold">{user.name ?? user.email}</p>
                      {user.name ? <p className="text-xs text-ink-faint">{user.email}</p> : null}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-ink-muted">
                      {dateFmt.format(new Date(user.createdAt))}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{user.decks}</td>
                    <td className="py-2 pr-4 text-right font-mono">{user.liveCards}</td>
                    <td className="py-2 pr-4 text-right font-mono">{user.reviewsLast7d}</td>
                    <td className="py-2 pr-4 text-right font-mono">{user.totalReviews.toLocaleString()}</td>
                    <td
                      className="py-2 pr-4 whitespace-nowrap text-ink-muted"
                      title={user.lastReviewAt ? dateTimeFmt.format(new Date(user.lastReviewAt)) : undefined}
                    >
                      {relativeDay(user.lastReviewAt)}
                    </td>
                    <td className="py-2">{user.coachEnabled ? "on" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-bold tracking-[-0.01em]">Daily activity — last 14 days (UTC)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4 text-right">Active users</th>
                  <th className="py-2 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-3 text-ink-faint">
                      No reviews in the last 14 days.
                    </td>
                  </tr>
                ) : (
                  activity.map((day) => (
                    <tr key={day.date} className="border-b border-hairline/60 last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-ink-muted">
                        {dateFmt.format(new Date(`${day.date}T12:00:00Z`))}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{day.activeUsers}</td>
                      <td className="py-2 text-right font-mono">{day.reviews.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

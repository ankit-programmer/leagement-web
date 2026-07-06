"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMe, useUpdateMe } from "@/lib/queries/stats";

const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();

  const [timezone, setTimezone] = useState("UTC");
  const [dayStartHour, setDayStartHour] = useState(4);
  const [retention, setRetention] = useState(0.9);
  const [newPerDay, setNewPerDay] = useState(20);
  const [aiModel, setAiModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setTimezone(me.timezone);
    setDayStartHour(me.dayStartHour);
    setRetention(me.retentionTarget);
    setNewPerDay(me.newCardsPerDay);
    setAiModel(me.aiModel ?? "");
  }, [me]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge>
          <Cog6ToothIcon />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Settings</h1>
          <p className="mt-0.5 text-sm text-ink-muted">{me?.email}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(false);
              setError(null);
              updateMe.mutate(
                {
                  timezone,
                  dayStartHour,
                  retentionTarget: retention,
                  newCardsPerDay: newPerDay,
                  aiModel: aiModel.trim() || null,
                },
                {
                  onSuccess: () => setSaved(true),
                  onError: (e) => setError(e.message),
                },
              );
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                Time zone
              </span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-field border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-ink-faint">
                &quot;Due today&quot; rolls over at the hour below in this zone.
              </span>
            </label>

            <Input
              label="Day starts at (hour, 0–23)"
              type="number"
              min={0}
              max={23}
              value={dayStartHour}
              onChange={(e) => setDayStartHour(Number(e.target.value))}
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                Retention target — <span className="font-mono">{Math.round(retention * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.7}
                max={0.97}
                step={0.01}
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                className="w-full accent-[--brand]"
              />
              <span className="block text-xs text-ink-faint">
                Higher = more reviews, stronger memory. FSRS schedules to hit this recall probability.
              </span>
            </label>

            <Input
              label="New cards per day"
              type="number"
              min={0}
              max={500}
              value={newPerDay}
              onChange={(e) => setNewPerDay(Number(e.target.value))}
            />

            <Input
              label="AI model (blank = gemini-2.5-flash)"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gemini-2.5-flash"
              className="font-mono"
            />

            {error ? (
              <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              {saved ? <span className="text-sm text-success-ink">Saved</span> : null}
              <Button type="submit" busy={updateMe.isPending} busyLabel="Saving…">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

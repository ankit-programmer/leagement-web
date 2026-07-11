"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import * as Switch from "@radix-ui/react-switch";
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
  const [phone, setPhone] = useState("");
  const [coachEnabled, setCoachEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Absent field = the deployed API predates the coach; hide the section.
  const coachSupported = me?.coachEnabled !== undefined;

  useEffect(() => {
    if (!me) return;
    setTimezone(me.timezone);
    setDayStartHour(me.dayStartHour);
    setRetention(me.retentionTarget);
    setNewPerDay(me.newCardsPerDay);
    setAiModel(me.aiModel ?? "");
    setPhone(me.phone ?? "");
    setCoachEnabled(me.coachEnabled ?? false);
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
              if (coachSupported && coachEnabled && !phone.trim()) {
                setError("Add your WhatsApp number to enable the coach.");
                return;
              }
              updateMe.mutate(
                {
                  timezone,
                  dayStartHour,
                  retentionTarget: retention,
                  newCardsPerDay: newPerDay,
                  aiModel: aiModel.trim() || null,
                  // Old APIs reject unknown fields (strict schema) — only send when supported.
                  ...(coachSupported ? { phone: phone.trim() || null, coachEnabled } : {}),
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

            {coachSupported ? (
              <div className="space-y-4 border-t border-hairline pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                      WhatsApp coach
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      An evening reminder only on days you need it, and a Sunday summary when you
                      don&apos;t. Turn it off here anytime — replies to the messages aren&apos;t read.
                    </p>
                  </div>
                  <Switch.Root
                    checked={coachEnabled}
                    onCheckedChange={setCoachEnabled}
                    className="relative h-6 w-11 shrink-0 rounded-full border border-hairline bg-surface-subtle transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-brand"
                  >
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-surface shadow-soft transition-transform data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </div>
                {coachEnabled ? (
                  <Input
                    label="WhatsApp number (with country code)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="91 98765 43210"
                    className="font-mono"
                  />
                ) : null}
              </div>
            ) : null}

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

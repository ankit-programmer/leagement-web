"use client";

import { CheckIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import * as Switch from "@radix-ui/react-switch";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRY_CODES, splitPhone } from "@/lib/country-codes";
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
  const [dialCode, setDialCode] = useState("91");
  const [nationalNumber, setNationalNumber] = useState("");
  const [coachEnabled, setCoachEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Absent field = the deployed API predates the coach; hide the section.
  const coachSupported = me?.coachEnabled !== undefined;

  // The saved-chip confirms and then gets out of the way (rtlayer's copy-check pattern).
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    if (!me) return;
    setTimezone(me.timezone);
    setDayStartHour(me.dayStartHour);
    setRetention(me.retentionTarget);
    setNewPerDay(me.newCardsPerDay);
    setAiModel(me.aiModel ?? "");
    const { dial, national } = splitPhone(me.phone);
    setDialCode(dial);
    setNationalNumber(national);
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
    <div className="mx-auto max-w-xl space-y-6">
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
              const national = nationalNumber.replace(/\D/g, "");
              if (coachSupported && coachEnabled && (national.length < 6 || national.length > 12)) {
                setError("Add your WhatsApp number (6–12 digits) to enable the coach.");
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
                  ...(coachSupported ? { phone: national ? `${dialCode}${national}` : null, coachEnabled } : {}),
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
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                      WhatsApp number
                    </span>
                    <div className="flex gap-2">
                      {/* Closed state shows only +code (a native select would echo
                          the full option text); the dropdown keeps flag + name. */}
                      <div className="relative w-24 shrink-0">
                        <span
                          aria-hidden
                          className="flex h-full items-center justify-between rounded-field border border-hairline bg-surface px-3 py-2 font-mono text-sm text-ink"
                        >
                          +{dialCode}
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-faint">
                            <path
                              fillRule="evenodd"
                              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04L10 15.148l2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        <select
                          value={dialCode}
                          onChange={(e) => setDialCode(e.target.value)}
                          aria-label="Country"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={`${country.dial}-${country.name}`} value={country.dial}>
                              {country.flag} {country.name} (+{country.dial})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        type="tel"
                        value={nationalNumber}
                        onChange={(e) => setNationalNumber(e.target.value)}
                        placeholder="98765 43210"
                        aria-label="Phone number without country code"
                        className="font-mono"
                      />
                    </div>
                    <span className="block text-xs text-ink-faint">
                      Pick your country — no need to know the dial code.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-chip bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              {saved ? (
                <span className="animate-pop-in flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-ink">
                  <CheckIcon className="h-3.5 w-3.5" /> Saved
                </span>
              ) : null}
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

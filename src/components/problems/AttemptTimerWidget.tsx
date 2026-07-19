"use client";

import { ArrowTopRightOnSquareIcon, ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  discardAttempt,
  finishAttempt,
  formatClock,
  markPhase,
  readActiveAttempt,
  useActiveAttempt,
} from "@/components/problems/attempt-timer";
import { TIME_PHASES } from "@/components/problems/meta";

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
    };
  }
}

export const PIP_OPEN_EVENT = "leagement:pip-open";
export const pipSupported = () => typeof window !== "undefined" && "documentPictureInPicture" in window;

/** Clone the app's styles + theme into the PiP document so Tailwind classes work there. */
function copyStyles(target: Document) {
  target.documentElement.className = document.documentElement.className;
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) target.documentElement.setAttribute("data-theme", theme);
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.href) {
        const link = target.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.head.appendChild(link);
      } else if (sheet.ownerNode instanceof HTMLStyleElement) {
        const style = target.createElement("style");
        style.textContent = Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
        target.head.appendChild(style);
      }
    } catch {
      // Cross-origin sheet — skip.
    }
  }
  target.body.style.margin = "0";
}

function zoneOf(elapsedMs: number, capMinutes: number): "ok" | "warn" | "over" {
  const remaining = capMinutes * 60_000 - elapsedMs;
  if (remaining <= 0) return "over";
  if (remaining <= 5 * 60_000) return "warn";
  return "ok";
}

const ZONE_TEXT = { ok: "text-ink", warn: "text-warning-ink", over: "text-danger-ink" } as const;
const ZONE_BAR = { ok: "bg-brand", warn: "bg-warning", over: "bg-danger" } as const;

/** The compact card rendered INSIDE the PiP window. Ticks on the PiP window's
 *  own clock — main-tab timers get throttled while the user works elsewhere,
 *  which is precisely when this window matters. */
function PipCard({ pipWindow, onFinish }: { pipWindow: Window; onFinish: (problemId: string) => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = pipWindow.setInterval(() => setTick((n) => n + 1), 1000);
    return () => pipWindow.clearInterval(timer);
  }, [pipWindow]);

  const attempt = readActiveAttempt();
  if (!attempt) return null;
  const elapsedMs = Date.now() - attempt.startedAt;
  const zone = zoneOf(elapsedMs, attempt.capMinutes);
  const activePhase = attempt.marks.at(-1)?.phase;

  return (
    <div className="flex h-screen flex-col justify-between bg-surface p-3 text-ink">
      <div className="flex items-baseline justify-between gap-2">
        <p className={`font-mono text-3xl font-bold tracking-[-0.02em] ${ZONE_TEXT[zone]}`}>
          {formatClock(elapsedMs)}
        </p>
        <p className="min-w-0 truncate text-xs text-ink-muted">{attempt.problemName}</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
        <div
          className={`h-full rounded-full ${ZONE_BAR[zone]}`}
          style={{ width: `${Math.min(100, (elapsedMs / (attempt.capMinutes * 60_000)) * 100)}%` }}
        />
      </div>
      {zone === "over" ? (
        <p className="mt-1 text-[11px] font-bold text-danger-ink">Cap done — stop and log.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        {TIME_PHASES.map((phase) => (
          <button
            key={phase.key}
            type="button"
            onClick={() => {
              markPhase(phase.key);
              setTick((n) => n + 1);
            }}
            className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
              activePhase === phase.key ? "bg-brand text-white" : "bg-surface-subtle text-ink-muted"
            }`}
          >
            {phase.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onFinish(attempt.problemId)}
          className="flex-1 rounded-field bg-brand px-2 py-1.5 text-xs font-bold text-white"
        >
          Finish → post-mortem
        </button>
        <button
          type="button"
          onClick={() => {
            discardAttempt();
            pipWindow.close();
          }}
          className="rounded-field bg-surface-subtle px-2 py-1.5 text-xs font-semibold text-ink-muted"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/**
 * Mounted once in the app layout. While an attempt runs it shows a floating
 * pill on every page (except the attempt page itself) and hosts the
 * Meet-style Document-PiP window. The attempt page's "Pop out" button
 * triggers it via the PIP_OPEN_EVENT custom event (dispatched synchronously,
 * so the user-gesture requirement of requestWindow still holds).
 */
export function AttemptTimerWidget() {
  const { attempt, elapsedMs } = useActiveAttempt();
  const pathname = usePathname();
  const router = useRouter();
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const openPip = useCallback(async () => {
    if (!pipSupported() || !readActiveAttempt()) return;
    try {
      const win = await window.documentPictureInPicture!.requestWindow({ width: 340, height: 200 });
      copyStyles(win.document);
      win.document.title = "Attempt timer";
      win.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(win);
    } catch {
      // User gesture missing or permission denied — leave the pill as-is.
    }
  }, []);

  // The attempt page's pop-out button (or anything else) can ask us to open.
  useEffect(() => {
    const handler = () => void openPip();
    window.addEventListener(PIP_OPEN_EVENT, handler);
    return () => window.removeEventListener(PIP_OPEN_EVENT, handler);
  }, [openPip]);

  // Attempt gone (finished/discarded anywhere) → close the PiP window.
  useEffect(() => {
    if (!attempt && pipWindow) pipWindow.close();
  }, [attempt, pipWindow]);
  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  const finishFromPip = useCallback(
    (problemId: string) => {
      finishAttempt();
      pipWindow?.close();
      window.focus();
      router.push(`/problems/${problemId}/log`);
    },
    [pipWindow, router],
  );

  if (!attempt) return null;
  const zone = zoneOf(elapsedMs, attempt.capMinutes);
  const onAttemptPage = pathname === `/problems/${attempt.problemId}/attempt`;

  return (
    <>
      {!onAttemptPage && !pipWindow ? (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-hairline bg-surface/95 py-1.5 pl-3 pr-1.5 shadow-overlay backdrop-blur sm:bottom-4">
          <Link href={`/problems/${attempt.problemId}/attempt`} className="flex min-w-0 items-baseline gap-2">
            <span className={`font-mono text-sm font-bold ${ZONE_TEXT[zone]}`}>{formatClock(elapsedMs)}</span>
            <span className="max-w-32 truncate text-xs text-ink-muted">{attempt.problemName}</span>
          </Link>
          {pipSupported() ? (
            <button
              type="button"
              onClick={() => void openPip()}
              aria-label="Pop out timer"
              title="Pop out floating timer"
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={`/problems/${attempt.problemId}/attempt`}
              aria-label="Open attempt"
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : null}
      {pipWindow ? createPortal(<PipCard pipWindow={pipWindow} onFinish={finishFromPip} />, pipWindow.document.body) : null}
    </>
  );
}

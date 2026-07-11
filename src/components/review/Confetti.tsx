"use client";

import { useMemo } from "react";

/** Celebration hues: brand blues + violet + the semantic success/warning. */
const HUES = ["#0090f6", "#7c3aed", "#16a34a", "#f59e0b", "#4db4ff"];

/**
 * One-shot CSS confetti burst — absolutely-positioned pieces whose
 * fall/drift/spin come from the `confetti-fall` keyframe (motion-safe; renders
 * nothing visible for reduced-motion users since the keyframe never runs).
 * Deterministic pseudo-random spread: no Math.random, so renders are stable.
 */
export function Confetti({
  count = 24,
  delayMs = 0,
  palette = HUES,
}: {
  count?: number;
  /** Base delay before the burst — lets the completion ring land first. */
  delayMs?: number;
  palette?: string[];
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97 + 13) % 100,
        dx: ((i * 53) % 90) - 45,
        rot: 180 + ((i * 131) % 360),
        delay: delayMs + (i % 8) * 45,
        color: palette[i % palette.length],
      })),
    [count, delayMs, palette],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece opacity-0"
          style={
            {
              left: `${piece.left}%`,
              background: piece.color,
              animationDelay: `${piece.delay}ms`,
              "--dx": `${piece.dx}px`,
              "--rot": `${piece.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

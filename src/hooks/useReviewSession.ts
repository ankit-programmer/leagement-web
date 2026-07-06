"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Card, Rating, ReviewLog } from "@/lib/types";

const RECIRCULATE_HORIZON_MS = 15 * 60_000;
/** One bad card must not make a session unfinishable — after 8 in-session
 *  re-appearances it falls to its scheduled (tomorrow) due time. */
const MAX_REQUEUES_PER_CARD = 8;

export interface SessionStats {
  reviewed: number;
  again: number;
  startedAt: number;
}

/**
 * Client-side session state over the server's FSRS engine. The queue is
 * fetched ONCE into local state (a session is a stateful flow, not a cache);
 * a crash/refresh recovers naturally because due times live in the database.
 * After each grade, a card the server put back into (re)learning within the
 * next ~15 minutes is re-enqueued locally.
 */
export function useReviewSession(deckId: string) {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ reviewed: 0, again: 0, startedAt: Date.now() });
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const requeues = useRef(new Map<string, number>());
  const grading = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    api<Card[]>(`/decks/${deckId}/review-queue`)
      .then(({ data }) => {
        if (cancelled) return;
        setQueue(data);
        shownAt.current = Date.now();
        setStats({ reviewed: 0, again: 0, startedAt: Date.now() });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Counts and stats changed for good once the session ends (or unmounts mid-way).
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    };
  }, [queryClient, deckId]);

  const current = queue?.[0] ?? null;
  const finished = queue !== null && queue.length === 0;

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    async (rating: Rating) => {
      if (!current || !revealed || grading.current) return;
      grading.current = true;
      setError(null);
      try {
        const { data } = await api<{ card: Card; log: ReviewLog }>("/reviews", {
          method: "POST",
          body: {
            reviewId: crypto.randomUUID(),
            cardId: current.id,
            rating,
            durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
          },
        });
        const updated = data.card;
        setStats((s) => ({ ...s, reviewed: s.reviewed + 1, again: s.again + (rating === 1 ? 1 : 0) }));
        setQueue((prev) => {
          if (!prev) return prev;
          const rest = prev.slice(1);
          const count = requeues.current.get(updated.id) ?? 0;
          const dueSoon =
            (updated.state === 1 || updated.state === 3) &&
            new Date(updated.due).getTime() <= Date.now() + RECIRCULATE_HORIZON_MS;
          if (dueSoon && count < MAX_REQUEUES_PER_CARD) {
            requeues.current.set(updated.id, count + 1);
            return [...rest, updated];
          }
          return rest;
        });
        setRevealed(false);
        shownAt.current = Date.now();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        grading.current = false;
      }
    },
    [current, revealed],
  );

  return {
    loading: queue === null && !error,
    error,
    current,
    remaining: queue?.length ?? 0,
    revealed,
    reveal,
    grade,
    stats,
    finished,
  };
}

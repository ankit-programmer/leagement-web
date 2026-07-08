"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Card, Confidence, Rating, ReviewLog } from "@/lib/types";

const RECIRCULATE_HORIZON_MS = 15 * 60_000;
/** One bad card must not make a session unfinishable — after 8 in-session
 *  re-appearances it falls to its scheduled (tomorrow) due time. */
const MAX_REQUEUES_PER_CARD = 8;

export interface SessionStats {
  reviewed: number;
  again: number;
  startedAt: number;
  /** Sure-confidence answers this session: [recalled, total] — the live calibration line. */
  sureRecalled: number;
  sureTotal: number;
}

interface PendingLearning {
  count: number;
  nextDueAt: string | null;
  newRemainingToday: number;
}

/**
 * Client-side session state over the server's FSRS engine. The queue is
 * fetched into local state (a session is a stateful flow, not a cache); a
 * crash/refresh recovers naturally because due times live in the database.
 * Cards mid-learning-step that aren't due yet surface as `waiting` (a short
 * break with a comeback time) rather than a false "session complete" — the
 * hook auto-refetches when the next card lands.
 */
export function useReviewSession(deckId: string) {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [pending, setPending] = useState<PendingLearning>({
    count: 0,
    nextDueAt: null,
    newRemainingToday: 1,
  });
  const [revealed, setRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [stats, setStats] = useState<SessionStats>({
    reviewed: 0,
    again: 0,
    startedAt: Date.now(),
    sureRecalled: 0,
    sureTotal: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const confidenceRef = useRef<Confidence | undefined>(undefined);
  const requeues = useRef(new Map<string, number>());
  const grading = useRef(false);
  const queryClient = useQueryClient();

  const fetchQueue = useCallback(async () => {
    try {
      const { data, meta } = await api<Card[]>(`/decks/${deckId}/review-queue`);
      const counts = meta?.counts as
        | { pendingLearning?: number; nextLearningDueAt?: string | null; newRemainingToday?: number }
        | undefined;
      setQueue(data);
      setPending({
        count: counts?.pendingLearning ?? 0,
        nextDueAt: counts?.nextLearningDueAt ?? null,
        newRemainingToday: counts?.newRemainingToday ?? 1,
      });
      setRevealed(false);
      setTypedAnswer("");
      shownAt.current = Date.now();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [deckId]);

  useEffect(() => {
    setStats({ reviewed: 0, again: 0, startedAt: Date.now(), sureRecalled: 0, sureTotal: 0 });
    fetchQueue();
  }, [fetchQueue]);

  const current = queue?.[0] ?? null;
  const waiting = queue !== null && queue.length === 0 && pending.count > 0;
  const finished = queue !== null && queue.length === 0 && pending.count === 0;

  // Auto-resume: when the next learning card lands, pull the fresh queue.
  useEffect(() => {
    if (!waiting || !pending.nextDueAt) return;
    const delay = Math.max(1000, new Date(pending.nextDueAt).getTime() - Date.now() + 2000);
    const timer = window.setTimeout(fetchQueue, delay);
    return () => window.clearTimeout(timer);
  }, [waiting, pending.nextDueAt, fetchQueue]);

  // Counts and stats changed for good once the session ends (or unmounts mid-way).
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    };
  }, [queryClient, deckId]);

  const reveal = useCallback((confidence?: Confidence) => {
    confidenceRef.current = confidence;
    setRevealed(true);
  }, []);

  /** Set the current card aside (suspend) — for material not understood yet;
   *  grinding it would memorize the answer string without comprehension. */
  const suspendCurrent = useCallback(async () => {
    if (!current || grading.current) return;
    grading.current = true;
    setError(null);
    try {
      await api(`/cards/${current.id}`, { method: "PATCH", body: { suspended: true } });
      const rest = (queue ?? []).slice(1);
      setQueue(rest);
      setRevealed(false);
      setTypedAnswer("");
      confidenceRef.current = undefined;
      shownAt.current = Date.now();
      if (rest.length === 0) await fetchQueue();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      grading.current = false;
    }
  }, [current, queue, fetchQueue]);

  const grade = useCallback(
    async (rating: Rating) => {
      if (!current || !revealed || grading.current) return;
      grading.current = true;
      setError(null);
      try {
        const confidence = confidenceRef.current;
        const { data } = await api<{ card: Card; log: ReviewLog }>("/reviews", {
          method: "POST",
          body: {
            reviewId: crypto.randomUUID(),
            cardId: current.id,
            rating,
            durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
            confidence,
            typedAnswer: typedAnswer.trim() || undefined,
          },
        });
        const updated = data.card;
        setStats((s) => ({
          ...s,
          reviewed: s.reviewed + 1,
          again: s.again + (rating === 1 ? 1 : 0),
          sureTotal: s.sureTotal + (confidence === 3 ? 1 : 0),
          sureRecalled: s.sureRecalled + (confidence === 3 && rating > 1 ? 1 : 0),
        }));

        const rest = (queue ?? []).slice(1);
        const count = requeues.current.get(updated.id) ?? 0;
        const dueSoon =
          (updated.state === 1 || updated.state === 3) &&
          new Date(updated.due).getTime() <= Date.now() + RECIRCULATE_HORIZON_MS;
        let nextQueue = rest;
        if (dueSoon && count < MAX_REQUEUES_PER_CARD) {
          requeues.current.set(updated.id, count + 1);
          nextQueue = [...rest, updated];
        }
        setQueue(nextQueue);
        setRevealed(false);
        setTypedAnswer("");
        confidenceRef.current = undefined;
        shownAt.current = Date.now();
        // Local queue drained: ask the server what's really left (cards whose
        // learning step elapsed meanwhile, requeue-capped cards, pending info).
        if (nextQueue.length === 0) await fetchQueue();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        grading.current = false;
      }
    },
    [current, revealed, typedAnswer, queue, fetchQueue],
  );

  return {
    loading: queue === null && !error,
    error,
    retry: fetchQueue,
    current,
    remaining: queue?.length ?? 0,
    revealed,
    reveal,
    grade,
    suspendCurrent,
    typedAnswer,
    setTypedAnswer,
    stats,
    waiting,
    pendingCount: pending.count,
    nextDueAt: pending.nextDueAt,
    newQuotaExhausted: pending.newRemainingToday === 0,
    finished,
  };
}

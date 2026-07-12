"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";
import type { User } from "../types";

export interface OverviewStats {
  dueToday: number;
  reviewsToday: number;
  streakDays: number;
  bestStreak: number;
  totalReviews: number;
}

export interface DeckStats {
  states: { new: number; learning: number; review: number; relearning: number };
  reviewsLast30d: Array<{ date: string; count: number }>;
  retention30d: number | null;
  calibration: {
    levels: Record<number, { attempts: number; recallRate: number }>;
    overconfidentRate: number | null;
  } | null;
}

export interface AnalyticsStats {
  /** `mastered` is absent until the API deploy that computes it (deploy skew). */
  totals: { decks: number; cards: number; reviews: number; feynmanSessions: number; mastered?: number };
  cardsByState: { new: number; learning: number; review: number; relearning: number };
  reviewsPerDay: Array<{ date: string; count: number }>;
  retention30d: number | null;
  calibration: DeckStats["calibration"];
  perDeck: Array<{
    id: string;
    name: string;
    cards: number;
    due: number;
    retention30d: number | null;
    mastered?: number;
  }>;
  /** Median FSRS stability (days) now vs a month ago; null under sample floors. */
  durability?: { medianDaysNow: number | null; medianDays30dAgo: number | null };
  /** Formerly-struggling cards now going strong. */
  comebacks?: {
    count: number;
    cards: Array<{ id: string; deckId: string; front: string; lapses: number; stability: number }>;
  };
  upcomingWeek: Array<{ date: string; count: number }>;
  troubleCards: Array<{ id: string; deckId: string; front: string; lapses: number; sureWrong: boolean }>;
  effort: { avgSeconds: number | null; minutesToday: number | null };
  /** Rolling 7-day true retention per day (last 90); null = window under 10 reviews. */
  retentionTrend: Array<{ date: string; retention: number | null; attempts: number }>;
}

export function useAnalytics(deckId?: string) {
  return useQuery({
    queryKey: ["stats", "analytics", deckId ?? "all"],
    queryFn: async () =>
      (await api<AnalyticsStats>(`/stats/analytics${deckId ? `?deckId=${deckId}` : ""}`)).data,
  });
}

export function useOverviewStats() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: async () => (await api<OverviewStats>("/stats/overview")).data,
  });
}

export function useDeckStats(deckId: string) {
  return useQuery({
    queryKey: ["stats", "deck", deckId],
    queryFn: async () => (await api<DeckStats>(`/decks/${deckId}/stats`)).data,
  });
}

export interface MentorNote {
  headline: string;
  observations: Array<{ insight: string; action: string }>;
}

export function useMentorNote() {
  return useMutation({
    mutationFn: async (deckId?: string) =>
      (await api<MentorNote>("/stats/mentor", { method: "POST", body: { deckId } })).data,
    onSuccess: (_note, deckId) => track("mentor_requested", { deckScoped: Boolean(deckId) }),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api<User>("/auth/me")).data,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<User, "name" | "timezone" | "dayStartHour" | "retentionTarget" | "aiProvider" | "aiModel" | "newCardsPerDay" | "phone" | "coachEnabled">>) =>
      (await api<User>("/auth/me", { method: "PATCH", body: patch })).data,
    onSuccess: (user, patch) => {
      track("settings_changed", { fields: Object.keys(patch) });
      queryClient.setQueryData(["me"], user);
      queryClient.invalidateQueries({ queryKey: ["decks"] }); // day boundary may have moved
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

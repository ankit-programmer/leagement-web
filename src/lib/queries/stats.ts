"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  totals: { decks: number; cards: number; reviews: number; feynmanSessions: number };
  cardsByState: { new: number; learning: number; review: number; relearning: number };
  reviewsPerDay: Array<{ date: string; count: number }>;
  retention30d: number | null;
  calibration: DeckStats["calibration"];
  perDeck: Array<{ id: string; name: string; cards: number; due: number; retention30d: number | null }>;
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["stats", "analytics"],
    queryFn: async () => (await api<AnalyticsStats>("/stats/analytics")).data,
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

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api<User>("/auth/me")).data,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<User, "timezone" | "dayStartHour" | "retentionTarget" | "aiProvider" | "aiModel" | "newCardsPerDay">>) =>
      (await api<User>("/auth/me", { method: "PATCH", body: patch })).data,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      queryClient.invalidateQueries({ queryKey: ["decks"] }); // day boundary may have moved
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

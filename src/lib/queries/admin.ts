"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface AdminOverview {
  totals: {
    users: number;
    decks: number;
    cards: number;
    reviews: number;
    generationBatches: number;
    feynmanSessions: number;
    coachMessages30d: number;
  };
  active: { last24h: number; last7d: number; last30d: number };
  activity: Array<{ date: string; activeUsers: number; reviews: number }>;
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    coachEnabled: boolean;
    lastReviewAt: string | null;
    reviewsLast7d: number;
    totalReviews: number;
    liveCards: number;
    decks: number;
  }>;
}

export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => (await api<AdminOverview>("/admin/overview")).data,
    enabled,
  });
}

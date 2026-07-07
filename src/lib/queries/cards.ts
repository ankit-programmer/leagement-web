"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { Card } from "../types";

export function useCards(deckId: string, search: string, suspendedOnly = false) {
  return useInfiniteQuery({
    queryKey: ["cards", deckId, search, suspendedOnly],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (suspendedOnly) params.set("suspended", "true");
      if (pageParam) params.set("cursor", pageParam);
      return await api<Card[]>(`/decks/${deckId}/cards?${params}`);
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => (lastPage.meta?.nextCursor as string | null) ?? undefined,
  });
}

function invalidateCardData(queryClient: ReturnType<typeof useQueryClient>, deckId: string) {
  queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
  queryClient.invalidateQueries({ queryKey: ["decks"] }); // due-count pills
}

export function useCreateCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { front: string; back: string; imageUrl?: string }) =>
      (await api<Card>(`/decks/${deckId}/cards`, { method: "POST", body: input })).data,
    onSuccess: () => invalidateCardData(queryClient, deckId),
  });
}

export function useUpdateCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      patch,
    }: {
      cardId: string;
      patch: { front?: string; back?: string; imageUrl?: string | null; suspended?: boolean };
    }) => (await api<Card>(`/cards/${cardId}`, { method: "PATCH", body: patch })).data,
    onSuccess: () => invalidateCardData(queryClient, deckId),
  });
}

export function useDeleteCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => api(`/cards/${cardId}`, { method: "DELETE" }),
    onSuccess: () => invalidateCardData(queryClient, deckId),
  });
}

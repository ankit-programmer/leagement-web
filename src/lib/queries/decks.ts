"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";
import type { Deck, DeckWithCounts } from "../types";

export function useDecks() {
  return useQuery({
    queryKey: ["decks"],
    queryFn: async () => (await api<DeckWithCounts[]>("/decks")).data,
  });
}

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => (await api<Deck>(`/decks/${deckId}`)).data,
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; type?: "flashcards" | "practice" }) =>
      (await api<Deck>("/decks", { method: "POST", body: input })).data,
    onSuccess: (deck) => {
      track("deck_created", { type: deck.type ?? "flashcards" });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string; description?: string }) =>
      (await api<Deck>(`/decks/${deckId}`, { method: "PATCH", body: patch })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string) => api(`/decks/${deckId}`, { method: "DELETE" }),
    onSuccess: () => {
      track("deck_deleted");
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

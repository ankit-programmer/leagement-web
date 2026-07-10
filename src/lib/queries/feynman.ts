"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";

export interface FeynmanCritique {
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  followUp: string;
}

export interface FeynmanSession {
  id: string;
  deckId: string;
  parentId: string | null;
  revision: number;
  topic: string;
  explanation: string;
  rating: "strong" | "developing" | "shaky";
  critique: FeynmanCritique;
  createdAt: string;
}

export function useFeynmanSessions(deckId: string) {
  return useQuery({
    queryKey: ["feynman", deckId],
    queryFn: async () => (await api<FeynmanSession[]>(`/decks/${deckId}/feynman-sessions`)).data,
  });
}

export function useSuggestTopics() {
  return useMutation({
    mutationFn: async (deckId: string) =>
      (await api<{ topics: string[] }>(`/decks/${deckId}/feynman-topics`)).data.topics,
    onSuccess: () => track("feynman_topics_suggested"),
  });
}

export function useSubmitExplanation(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { topic: string; explanation: string; parentId?: string }) =>
      (await api<FeynmanSession>("/feynman", { method: "POST", body: { deckId, ...input } })).data,
    onSuccess: (session) => {
      track("feynman_submitted", { revision: session.revision, rating: session.rating });
      queryClient.invalidateQueries({ queryKey: ["feynman", deckId] });
    },
  });
}

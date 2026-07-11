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

export interface FeynmanMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface FeynmanSession {
  id: string;
  deckId: string;
  topic: string;
  status: "active" | "completed";
  /** Absent on list rows — transcripts only travel on the detail endpoint. */
  messages?: FeynmanMessage[];
  /** Legacy one-shot sessions stored a single explanation; chat sessions leave it null. */
  explanation: string | null;
  rating: "strong" | "developing" | "shaky" | null;
  critique: FeynmanCritique | null;
  endedAt: string | null;
  createdAt: string;
}

export function useFeynmanSessions(deckId: string) {
  return useQuery({
    queryKey: ["feynman", deckId],
    queryFn: async () => (await api<FeynmanSession[]>(`/decks/${deckId}/feynman-sessions`)).data,
  });
}

export function useFeynmanSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["feynman-session", sessionId],
    queryFn: async () => (await api<FeynmanSession>(`/feynman/sessions/${sessionId}`)).data,
    enabled: sessionId !== null,
  });
}

export function useSuggestTopics() {
  return useMutation({
    mutationFn: async (deckId: string) =>
      (await api<{ topics: string[] }>(`/decks/${deckId}/feynman-topics`)).data.topics,
    onSuccess: () => track("feynman_topics_suggested"),
  });
}

export function useStartFeynman(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (topic: string) =>
      (await api<FeynmanSession>("/feynman/sessions", { method: "POST", body: { deckId, topic } })).data,
    onSuccess: (session) => {
      track("feynman_session_started");
      queryClient.setQueryData(["feynman-session", session.id], session);
      queryClient.invalidateQueries({ queryKey: ["feynman", deckId] });
    },
  });
}

export function useSendFeynmanMessage(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await api<FeynmanSession>(`/feynman/sessions/${sessionId}/messages`, { method: "POST", body: { content } }))
        .data,
    onSuccess: (session) => {
      track("feynman_message_sent", { turn: session.messages?.filter((m) => m.role === "user").length ?? 0 });
      queryClient.setQueryData(["feynman-session", session.id], session);
    },
  });
}

export function useEndFeynman(deckId: string, sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api<FeynmanSession>(`/feynman/sessions/${sessionId}/end`, { method: "POST" })).data,
    onSuccess: (session) => {
      const turns = session.messages?.filter((m) => m.role === "user").length ?? 0;
      const minutes = Math.max(1, Math.round((Date.now() - new Date(session.createdAt).getTime()) / 60_000));
      track("feynman_session_ended", { turns, rating: session.rating, minutes });
      queryClient.setQueryData(["feynman-session", session.id], session);
      queryClient.invalidateQueries({ queryKey: ["feynman", deckId] });
    },
  });
}

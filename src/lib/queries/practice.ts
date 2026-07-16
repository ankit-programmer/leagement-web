"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";
import type { Card } from "../types";

export interface PracticeSession {
  title: string;
  rationale: string;
  cards: Card[];
}

/**
 * Practice sessions are ephemeral: the AI selection is stashed in the query
 * cache under ["practice", deckId] and consumed by the review screen. A page
 * refresh loses it — by design, the user just starts a new one.
 */
export function useCreatePractice(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: string) =>
      (
        await api<PracticeSession>("/practice-sessions", {
          method: "POST",
          body: { deckId, request },
          timeoutMs: 60_000,
        })
      ).data,
    onSuccess: (session) => {
      track("practice_created", { cards: session.cards.length });
      queryClient.setQueryData(["practice", deckId], session);
    },
  });
}

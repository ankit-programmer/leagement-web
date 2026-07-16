"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";

/** Which input drove the generation — the interesting product question. */
function generationSource(input: { sourceText?: string; imageUrl?: string; sourceUrl?: string }) {
  if (input.sourceUrl) return "url";
  if (input.imageUrl) return "image";
  return "text";
}

export interface GeneratedCard {
  id: string;
  batchId: string;
  deckId: string;
  deckName: string;
  front: string;
  back: string;
  status: "pending" | "approved" | "rejected";
  cardId: string | null;
  createdAt: string;
}

export function usePendingGenerated() {
  return useQuery({
    queryKey: ["generated", "pending"],
    queryFn: async () => (await api<GeneratedCard[]>("/generated-cards?status=pending")).data,
  });
}

export function useGenerate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deckId: string;
      sourceText?: string;
      imageUrl?: string;
      sourceUrl?: string;
      maxCards?: number;
    }) =>
      (
        await api<{ batchId: string; cards: GeneratedCard[] }>("/generations", {
          method: "POST",
          body: input,
          // Model calls with a PDF/URL source can legitimately run for minutes.
          timeoutMs: 150_000,
        })
      ).data,
    onMutate: (input) => track("generation_requested", { source: generationSource(input) }),
    onSuccess: (data, input) => {
      track("generation_succeeded", { source: generationSource(input), cards: data.cards.length });
      queryClient.invalidateQueries({ queryKey: ["generated", "pending"] });
    },
    onError: (_error, input) => {
      track("generation_failed", { source: generationSource(input) });
      // A client-side timeout doesn't stop the server — if it finished anyway,
      // the queue should still show the cards.
      queryClient.invalidateQueries({ queryKey: ["generated", "pending"] });
    },
  });
}

export function useDecideGenerated() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      front,
      back,
    }: {
      id: string;
      action: "approve" | "reject";
      front?: string;
      back?: string;
    }) =>
      (await api<GeneratedCard>(`/generated-cards/${id}`, { method: "PATCH", body: { action, front, back } }))
        .data,
    // Optimistically remove the row — the queue should feel like triage.
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["generated", "pending"] });
      const previous = queryClient.getQueryData<GeneratedCard[]>(["generated", "pending"]);
      queryClient.setQueryData<GeneratedCard[]>(["generated", "pending"], (rows) =>
        rows?.filter((row) => row.id !== id),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["generated", "pending"], context.previous);
    },
    onSuccess: (_row, { action, front, back }) =>
      track("generated_card_decided", { action, edited: front !== undefined || back !== undefined }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["generated", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

export function useBulkDecide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; action: "approve" | "reject" }) =>
      (await api<{ decided: number }>("/generated-cards/bulk", { method: "POST", body: input })).data,
    onSuccess: (data, { action }) => {
      track("generated_cards_bulk", { action, count: data.decided });
      queryClient.invalidateQueries({ queryKey: ["generated", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

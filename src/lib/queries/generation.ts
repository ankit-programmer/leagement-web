"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

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
      (await api<{ batchId: string; cards: GeneratedCard[] }>("/generations", { method: "POST", body: input }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generated", "pending"] }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

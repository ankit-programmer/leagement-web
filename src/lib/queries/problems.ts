"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "../analytics";
import { api } from "../api";

export type ProblemResult = "solved_in_cap" | "solved_over" | "needed_editorial" | "wrong_approach";
export type ErrorClass =
  | "misread"
  | "classification"
  | "construction"
  | "implementation"
  | "verification"
  | "complexity"
  | "time_bleed"
  | "other";

export interface Problem {
  id: string;
  deckId: string | null;
  name: string;
  url: string | null;
  description: string | null;
  solution: string | null;
  resources: string | null;
  pattern: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  status: "active" | "retired";
  nextDue: string;
  createdAt: string;
}

export interface ProblemListRow extends Problem {
  attemptCount: number;
  lastResult: ProblemResult | null;
  lastAttemptAt: string | null;
}

export interface Attempt {
  id: string;
  result: ProblemResult;
  predicted: "pass" | "fail" | null;
  timeMinutes: number | null;
  timeUnderstand: number | null;
  timeClassify: number | null;
  timePlan: number | null;
  timeCode: number | null;
  timeDebug: number | null;
  errorClass: ErrorClass | null;
  divergence: string | null;
  missedCue: string | null;
  selfExplain: string | null;
  cardsMade: string | null;
  notes: string | null;
  nextDueApplied: string;
  createdAt: string;
}

export interface ProblemDetail extends Problem {
  attempts: Attempt[];
}

export interface ProblemStats {
  dueToday: number;
  activeProblems: number;
  practicedDaysLast7: number;
  /** Optional until the API deploy that computes them (deploy skew). */
  practiceStreak?: number;
  solveRate30d: number | null;
  errorClasses30d: Array<{ errorClass: ErrorClass; count: number }>;
  attemptsByDay?: Array<{ date: string; total: number; solved: number }>;
  /** Per-day context annotations ("200mg caffeine", "bad sleep") — optional until API deploy. */
  dayNotes?: Array<{ date: string; note: string }>;
  totalSessions?: number;
  retiredProblems?: number;
}

export type Suggestions = Record<ProblemResult, { nextDue: string; suggestRetire: boolean }>;

export function useProblems(options: { status?: "active" | "retired"; deckId?: string } = {}) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.deckId) params.set("deckId", options.deckId);
  const qs = params.toString();
  return useQuery({
    queryKey: ["problems", "list", options.status ?? "all", options.deckId ?? "all"],
    queryFn: async () => (await api<ProblemListRow[]>(`/problems${qs ? `?${qs}` : ""}`)).data,
  });
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: ["problems", "detail", id],
    queryFn: async () => (await api<ProblemDetail>(`/problems/${id}`)).data,
  });
}

export function useProblemStats(deckId?: string) {
  return useQuery({
    queryKey: ["problems", "stats", deckId ?? "all"],
    queryFn: async () => (await api<ProblemStats>(`/problems/stats${deckId ? `?deckId=${deckId}` : ""}`)).data,
  });
}

export function useSuggestions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["problems", "suggestions", id],
    queryFn: async () => (await api<Suggestions>(`/problems/${id}/suggestions`)).data,
    enabled,
    // Suggestions depend on attempt history — never serve a pre-log cache.
    staleTime: 0,
  });
}

export function useCreateProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      url?: string;
      description?: string;
      pattern?: string;
      difficulty?: string;
      deckId?: string;
      /** ISO date-time; omitted = due immediately. */
      nextDue?: string;
    }) => (await api<Problem>("/problems", { method: "POST", body: input })).data,
    onSuccess: () => {
      track("problem_added");
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["decks"] }); // practice deck counts
    },
  });
}

export function useUpdateProblem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<
        Pick<Problem, "name" | "url" | "description" | "solution" | "resources" | "pattern" | "difficulty" | "status" | "nextDue">
      >,
    ) => (await api<Problem>(`/problems/${id}`, { method: "PATCH", body: patch })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["problems"] }),
  });
}

/** Upsert the context note for one learning day; empty note clears it. */
export function useUpsertDayNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; note: string }) =>
      (await api<{ date: string; note: string }>("/problems/day-note", { method: "PUT", body: input })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["problems", "stats"] }),
  });
}

export function useDeleteProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api<{ deleted: boolean }>(`/problems/${id}`, { method: "DELETE" })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["problems"] }),
  });
}

export function useLogAttempt(problemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attemptId: string;
      result: ProblemResult;
      predicted?: "pass" | "fail";
      timeMinutes?: number;
      timeUnderstand?: number;
      timeClassify?: number;
      timePlan?: number;
      timeCode?: number;
      timeDebug?: number;
      errorClass?: ErrorClass;
      divergence?: string;
      missedCue?: string;
      selfExplain?: string;
      cardsMade?: string;
      notes?: string;
      nextDue: string;
      retire?: boolean;
    }) =>
      (await api<{ problem: Problem; attempt: Attempt }>(`/problems/${problemId}/attempts`, {
        method: "POST",
        body: input,
      })).data,
    onSuccess: (_data, input) => {
      track("practice_session_logged", { result: input.result, errorClass: input.errorClass ?? "none" });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["decks"] }); // practice deck counts
    },
  });
}

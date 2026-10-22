"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";
import { type PersistQueryClientOptions, removeOldestQuery } from "@tanstack/react-query-persist-client";

/**
 * On-device copy of the last-known server state, so reopening the app paints
 * decks, stats and problems instantly instead of waiting on the API — which
 * after an idle spell includes a Cloud Run cold start and the tailnet join.
 * Restored data is stale on arrival (its original fetch time is kept), so every
 * mounted query still refetches in the background; the copy only decides what
 * is on screen meanwhile. Signing out wipes it (see auth.tsx).
 */

/** Bump when a response shape changes incompatibly: a cache with another buster is discarded, never read. */
const CACHE_BUSTER = "1";

/** Also the QueryClient's gcTime — evicting a query from memory would evict it from the persisted copy too. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * Small, page-defining reads only. Card lists (paged, searchable), the AI queue
 * (hundreds of drafts), Feynman transcripts and attempt suggestions (always
 * live) stay network-only.
 */
const PERSISTED_ROOTS = new Set(["decks", "deck", "stats", "me", "problems"]);

function shouldPersist(query: Query): boolean {
  const [root, sub] = query.queryKey;
  return (
    defaultShouldDehydrateQuery(query) && typeof root === "string" && PERSISTED_ROOTS.has(root) && sub !== "suggestions"
  );
}

function browserStorage(): Storage | undefined {
  // Undefined on the server; the getter throws when site data is blocked and can
  // be null in some WebViews — all of which just mean "no on-device copy".
  try {
    return typeof window === "undefined" ? undefined : (window.localStorage ?? undefined);
  } catch {
    return undefined;
  }
}

export const queryPersister = createAsyncStoragePersister({
  storage: browserStorage(),
  key: "leagement.queryCache",
  // Over quota: drop the oldest queries and retry rather than lose the whole save.
  retry: removeOldestQuery,
});

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE_MS,
  buster: CACHE_BUSTER,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
};

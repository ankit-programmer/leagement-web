"use client";

import { Button } from "./Button";

/**
 * A failed query must never masquerade as an empty list — render this instead
 * of an EmptyState whenever `isError`.
 */
export function QueryError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger-bg px-6 py-10 text-center">
      <p className="text-sm font-semibold text-danger-ink">Couldn&apos;t load this</p>
      <p className="max-w-sm text-sm text-danger-ink/80">
        {message ?? "Something went wrong talking to the server."}
      </p>
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

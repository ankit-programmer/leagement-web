"use client";

import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { ProblemsView } from "@/components/problems/ProblemsView";
import { IconBadge } from "@/components/ui/IconBadge";

/** All practice problems across decks; deck-scoped views live on each practice deck's page. */
export default function ProblemsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge>
          <PuzzlePieceIcon />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Practice problems</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Attempt, post-mortem, re-solve on schedule — the practice loop, not the recall loop.
          </p>
        </div>
      </div>
      <ProblemsView />
    </div>
  );
}

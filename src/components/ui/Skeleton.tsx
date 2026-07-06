/** Loading placeholder — the design system uses skeletons, never spinners. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-chip bg-skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-card border border-hairline bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-[34px] w-[34px] rounded-badge" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

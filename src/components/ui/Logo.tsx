/** The app mark — stacked flashcards with a question: retrieval practice. Mirrors src/app/icon.svg. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <rect x="13" y="16" width="32" height="24" rx="5" fill="#ffffff" opacity="0.35" transform="rotate(-8 29 28)" />
      <rect x="19" y="23" width="32" height="24" rx="5" fill="#ffffff" />
      <path
        d="M31.4 31.2a3.9 3.9 0 1 1 6.2 3.2c-1.7 1.2-2.5 2-2.5 3.6"
        stroke="var(--brand)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="35.1" cy="42.6" r="2" fill="var(--brand)" />
    </svg>
  );
}

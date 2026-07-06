/** The rtlayer signature: a small brand-tinted rounded badge before a section title. */
export function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-badge bg-brand-tint text-brand [&>svg]:h-4.5 [&>svg]:w-4.5">
      {children}
    </span>
  );
}

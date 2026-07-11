export function Card({
  className = "",
  lift = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** For clickable cards: hover raises the surface (shadow tier + 2px float). */
  lift?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-hairline bg-surface shadow-card ${
        lift
          ? "transition-[box-shadow,transform] duration-200 hover:shadow-raised motion-safe:hover:-translate-y-0.5"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

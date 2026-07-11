/**
 * Remounts on every route change (unlike layout), giving each page one
 * entrance settle — the app's page-transition mechanism. Pages must NOT
 * add their own top-level animate-fade-up or entrances double up.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}

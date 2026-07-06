"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Decks" },
  { href: "/queue", label: "AI Queue" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isReview = /^\/decks\/[^/]+\/review/.test(pathname);

  useEffect(() => {
    if (token === null) router.replace("/login");
  }, [token, router]);

  if (!token) return null; // undefined = reading storage; null = redirecting

  return (
    <div className="flex min-h-screen flex-col">
      {/* Review sessions are distraction-free: the nav hides itself. */}
      {isReview ? null : (
        <header className="sticky top-0 z-30 border-b border-hairline bg-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-[-0.01em]">
                <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-brand-tint">
                  🧠
                </span>
                Leagement
              </Link>
              <nav className="flex items-center gap-1">
                {NAV.map(({ href, label }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-surface-subtle text-ink"
                          : "text-ink-muted hover:bg-surface-subtle/60 hover:text-ink"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="rounded-btn px-3 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
                title={user?.email}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
      )}
      <main className={isReview ? "flex-1" : "mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"}>
        {children}
      </main>
    </div>
  );
}

"use client";

import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Decks" },
  { href: "/progress", label: "Progress" },
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
            <div className="flex min-w-0 items-center gap-2 sm:gap-6">
              <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-[-0.01em]">
                <Logo className="h-8 w-8" />
                <span className="hidden sm:inline">Leagement</span>
              </Link>
              <nav className="flex items-center gap-0.5 sm:gap-1">
                {NAV.map(({ href, label }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`whitespace-nowrap rounded-btn px-2.5 py-1.5 text-sm font-semibold transition-colors sm:px-3 ${
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
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="rounded-btn p-1.5 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink sm:px-3 sm:py-1.5"
                title={user?.email ? `Sign out (${user.email})` : "Sign out"}
                aria-label="Sign out"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5 sm:hidden" />
                <span className="hidden text-sm font-semibold sm:inline">Sign out</span>
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

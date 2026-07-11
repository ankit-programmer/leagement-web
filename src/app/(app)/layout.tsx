"use client";

import {
  ArrowRightStartOnRectangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  ChartBarIcon as ChartBarSolid,
  Cog6ToothIcon as CogSolid,
  RectangleStackIcon as RectangleStackSolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Decks", icon: RectangleStackIcon, activeIcon: RectangleStackSolid },
  { href: "/progress", label: "Progress", icon: ChartBarIcon, activeIcon: ChartBarSolid },
  { href: "/queue", label: "AI Queue", icon: SparklesIcon, activeIcon: SparklesSolid },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon, activeIcon: CogSolid },
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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col">
      {/* Review sessions are distraction-free: all chrome hides itself. */}
      {isReview ? null : (
        <header className="sticky top-0 z-30 border-b border-hairline/70 bg-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-6">
              <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-[-0.01em]">
                <Logo className="h-8 w-8" />
                <span>Leagement</span>
              </Link>
              {/* Desktop nav — mobile navigation lives in the bottom tab bar. */}
              <nav className="hidden items-center gap-1 sm:flex">
                {NAV.map(({ href, label }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`whitespace-nowrap rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-brand-tint text-brand-dark dark:text-brand-light"
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
      <main className={isReview ? "flex-1" : "mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-8"}>
        {children}
      </main>
      {/* Mobile bottom tabs — thumb-reachable, app-like, hidden during review. */}
      {isReview ? null : (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline/70 bg-surface/85 backdrop-blur-xl sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-4">
            {NAV.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
              const active = isActive(href);
              const TabIcon = active ? ActiveIcon : Icon;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 py-2 pt-2.5 text-[11px] font-semibold transition-colors ${
                    active ? "text-brand-dark dark:text-brand-light" : "text-ink-muted"
                  }`}
                >
                  {active ? (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" aria-hidden />
                  ) : null}
                  <TabIcon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

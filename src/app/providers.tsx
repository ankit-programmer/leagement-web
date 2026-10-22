"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { initAnalytics } from "@/lib/analytics";
import { AuthProvider } from "@/lib/auth";
import { PERSIST_MAX_AGE_MS, persistOptions } from "@/lib/query-persist";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Must cover the persisted copy's lifetime, or idle queries would be evicted from it early.
            gcTime: PERSIST_MAX_AGE_MS,
            // Rides out a Cloud Run cold start (+ tailnet join) without surfacing an error.
            retry: 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>{children}</AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAccounts {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

export default function LoginPage() {
  const { loginWithGoogle, loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState("");
  const [busy, setBusy] = useState(false);
  const buttonHost = useRef<HTMLDivElement>(null);

  const initGoogle = useCallback(() => {
    const google = (window as unknown as { google?: GoogleAccounts }).google;
    if (!google || !GOOGLE_CLIENT_ID || !buttonHost.current) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => {
        setError(null);
        loginWithGoogle(credential).catch((e: Error) => setError(e.message));
      },
    });
    google.accounts.id.renderButton(buttonHost.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 280,
    });
  }, [loginWithGoogle]);

  useEffect(() => {
    initGoogle();
  }, [initGoogle]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {GOOGLE_CLIENT_ID ? <Script src="https://accounts.google.com/gsi/client" onLoad={initGoogle} /> : null}
      <Card className="w-full max-w-sm animate-fade-up">
        <CardContent className="flex flex-col items-center gap-5 py-9">
          <Logo className="h-12 w-12" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-[-0.025em]">Leagement</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Learning that sticks — retrieval practice on an FSRS schedule.
            </p>
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div ref={buttonHost} />
          ) : (
            <form
              className="w-full space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setError(null);
                loginWithToken(devToken.trim())
                  .catch((e: Error) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              <p className="rounded-chip bg-warning-bg px-3 py-2 text-xs text-warning-ink">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — dev mode. Paste a service JWT issued by the
                API instead.
              </p>
              <Input
                label="Service token"
                value={devToken}
                onChange={(event) => setDevToken(event.target.value)}
                placeholder="eyJhbGciOi…"
                className="font-mono"
                required
              />
              <Button type="submit" className="w-full" busy={busy} busyLabel="Signing in…">
                Sign in
              </Button>
            </form>
          )}

          {error ? (
            <p className="w-full rounded-chip bg-danger-bg px-3 py-2 text-center text-sm text-danger-ink">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

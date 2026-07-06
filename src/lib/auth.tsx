"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, registerUnauthorizedHandler, setToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  /** null = signed out; undefined = still reading localStorage on first mount. */
  token: string | null | undefined;
  user: User | null;
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Dev fallback: paste a service JWT directly (used before Google OAuth is configured). */
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
    setTokenState(getToken());
  }, [logout]);

  // Hydrate the user whenever a token appears (first load or after login).
  useEffect(() => {
    if (!token) return;
    api<User>("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => undefined); // a 401 already triggered logout
  }, [token]);

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const { data } = await api<{ token: string; user: User }>("/auth/google", {
        method: "POST",
        body: { idToken },
        auth: false,
      });
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
      router.push("/");
    },
    [router],
  );

  const loginWithToken = useCallback(
    async (rawToken: string) => {
      setToken(rawToken);
      setTokenState(rawToken);
      const { data } = await api<User>("/auth/me");
      setUser(data);
      router.push("/");
    },
    [router],
  );

  const value = useMemo(
    () => ({ token, user, loginWithGoogle, loginWithToken, logout }),
    [token, user, loginWithGoogle, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

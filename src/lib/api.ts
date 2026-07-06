/**
 * Fetch wrapper for leagement-api: attaches the bearer token, unwraps the
 * {success, data, meta} / {success, error} envelope, and funnels 401s into a
 * logout so an expired 30-day token means one click to sign back in.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "leagement.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token === null) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Array<{ field?: string; message: string }>;

  constructor(message: string, status: number, details?: Array<{ field?: string; message: string }>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized: (() => void) | null = null;
/** AuthProvider registers its logout here so any 401 anywhere bounces to /login. */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: { message: string; details?: Array<{ field?: string; message: string }> };
}

export interface ApiResult<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth) {
    onUnauthorized?.();
    throw new ApiError("Session expired", 401);
  }

  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      envelope?.error?.details,
    );
  }
  return { data: envelope.data as T, meta: envelope.meta };
}

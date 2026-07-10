"use client";

import posthog from "posthog-js";

/**
 * Product analytics (PostHog). The single entry point for event capture —
 * components and hooks call track()/identifyUser() and never import posthog
 * directly, so the taxonomy stays greppable in one place (docs: leagement
 * docs repo, ANALYTICS.md).
 *
 * Without NEXT_PUBLIC_POSTHOG_KEY everything here is a silent no-op: local
 * dev and self-hosters send nothing. Session recording stays off — card
 * content (the user's study material) must not leave their account.
 */

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let initialized = false;

export function initAnalytics() {
  if (!key || initialized || typeof window === "undefined") return;
  initialized = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2025-05-24", // history-change pageviews + pageleaves for an SPA
    disable_session_recording: true,
    person_profiles: "identified_only", // pre-login visitors don't consume person profiles
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(id: string, properties?: { email?: string; name?: string }) {
  if (!initialized) return;
  posthog.identify(id, properties);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

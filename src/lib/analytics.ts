import posthog from "posthog-js";

let initialised = false;

/** Initialise PostHog once, at app start. */
export function initAnalytics() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  posthog.init("phc_kme5KWXnUNBjNV2mZBjAbqi84jHNLx7TdLDUgTP89UME", {
    api_host: "https://us.i.posthog.com",
    defaults: "2026-05-30",
    person_profiles: "identified_only",
  });
  posthog.register({ app_name: "narayaneeyam" });
}

/** Fire-and-forget event capture — never throws. */
export function track(event: string, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties);
  } catch {
    /* analytics must never break the app */
  }
}

export function identifyUser(id: string, email?: string | null) {
  try {
    posthog.identify(id, email ? { email } : undefined);
  } catch {
    /* ignore */
  }
}

export function resetAnalytics() {
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

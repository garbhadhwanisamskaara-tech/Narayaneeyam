import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  install: { isInstalled: false, isTwa: false },
  profile: null as Record<string, unknown> | null,
  tables: [] as string[],
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/usePwaInstall", () => ({
  usePwaInstall: () => ({ isInstalled: mocks.install.isInstalled, isTwa: mocks.install.isTwa }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mocks.tables.push(table);
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.maybeSingle = async () => ({ data: mocks.profile, error: null });
      return builder;
    },
  },
}));

import { usePwaPromptEligibility } from "./usePwaPromptEligibility";

const SNOOZE_LATER = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const SNOOZE_PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

beforeEach(() => {
  mocks.tables.length = 0;
  mocks.user = { id: "member-1" };
  mocks.install = { isInstalled: false, isTwa: false };
  mocks.profile = { pwa_prompt_dismissed_at: null, pwa_prompt_snoozed_until: null };
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("PWA install prompt eligibility", () => {
  it("is eligible on the first signed-in visit without visits or progress", async () => {
    const { result } = renderHook(() => usePwaPromptEligibility());

    await waitFor(() => expect(result.current).toBe(true));
    // The removed gates must not be consulted at all.
    expect(mocks.tables).toEqual(["profiles"]);
    expect(localStorage.getItem("pwa_visit_count")).toBeNull();
  });

  it("stays hidden after the member chose No", async () => {
    mocks.profile = { pwa_prompt_dismissed_at: "2026-10-18T03:00:00.000Z", pwa_prompt_snoozed_until: null };

    const { result } = renderHook(() => usePwaPromptEligibility());

    await waitFor(() => expect(mocks.tables).toContain("profiles"));
    expect(result.current).toBe(false);
  });

  it("stays hidden while a Maybe later snooze is still in the future", async () => {
    mocks.profile = { pwa_prompt_dismissed_at: null, pwa_prompt_snoozed_until: SNOOZE_LATER };

    const { result } = renderHook(() => usePwaPromptEligibility());

    await waitFor(() => expect(mocks.tables).toContain("profiles"));
    expect(result.current).toBe(false);
  });

  it("returns once a snooze has passed", async () => {
    mocks.profile = { pwa_prompt_dismissed_at: null, pwa_prompt_snoozed_until: SNOOZE_PAST };

    const { result } = renderHook(() => usePwaPromptEligibility());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it.each([
    ["signed out", () => (mocks.user = null)],
    ["already installed", () => (mocks.install = { isInstalled: true, isTwa: false })],
    ["running as the Play Store app", () => (mocks.install = { isInstalled: false, isTwa: true })],
  ])("stays hidden when %s", async (_label, block) => {
    block();

    const { result } = renderHook(() => usePwaPromptEligibility());

    await waitFor(() => expect(mocks.tables).toEqual([]));
    expect(result.current).toBe(false);
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Minimal chainable stand-in for the Supabase client: every filter method
// returns the same builder, and awaiting it resolves the fixture rows for the
// table (or a head/count response when select() was given { head: true }).
const { state, fakeSupabase } = vi.hoisted(() => {
  const state: { tables: Record<string, unknown[]> } = { tables: {} };
  const builder = (table: string) => {
    let head = false;
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "range", "limit"]) {
      b[m] = (...args: unknown[]) => {
        if (m === "select" && args[1] && typeof args[1] === "object") {
          head = !!(args[1] as { head?: boolean }).head;
        }
        return b;
      };
    }
    b.maybeSingle = () => Promise.resolve({ data: (state.tables[table] ?? [])[0] ?? null, error: null });
    b.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(
        head
          ? { count: (state.tables[table] ?? []).length, data: null }
          : { data: state.tables[table] ?? [], error: null },
      ).then(onFulfilled);
    return b;
  };
  return { state, fakeSupabase: { from: (table: string) => builder(table) } };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));
vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "u1" };
  return { useAuth: () => ({ user }) };
});
vi.mock("@/hooks/useCompleteDashakam", () => {
  const actions = { markDashakamComplete: vi.fn(), unmarkDashakamComplete: vi.fn() };
  return { useCompleteDashakam: () => actions };
});
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { useMyDashakamGarden } from "@/hooks/useMyDashakamGarden";
import { useSessionGarden } from "@/hooks/useSessionGarden";

const SCHEDULE = [{ id: "s1", dashakam_no: 1, scheduled_date: "2026-10-26", assigned_user_id: null }];

function setTables(bloomMode: string | null) {
  state.tables = {
    challenge_sessions: [
      { participation_type: "FREE", start_date: "2020-01-01", group_id: "g1", bloom_mode: bloomMode },
    ],
    parayanam_participants: [
      { status: "confirmed", contribution_status: "confirmed", access_status: "active" },
    ],
    parayanam_schedule: SCHEDULE,
    parayanam_member_progress: [],
  };
}

describe("garden bloom mode", () => {
  it("locks every tile of the shared garden in SESSION mode", async () => {
    setTables("SESSION");
    const { result } = renderHook(() => useSessionGarden("c1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bloomMode).toBe("SESSION");
    expect(result.current.tiles.get("s1")?.canTap).toBe(false);
    expect(result.current.tiles.get("s1")?.disabledReason).toBe("Blooms automatically after the day's session");
  });

  it("keeps shared-garden tiles tappable in MY_READING mode", async () => {
    setTables("MY_READING");
    const { result } = renderHook(() => useSessionGarden("c1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bloomMode).toBe("MY_READING");
    expect(result.current.tiles.get("s1")?.canTap).toBe(true);
    expect(result.current.tiles.get("s1")?.disabledReason).toBeNull();
  });

  it("locks every tile of the personal garden in SESSION mode", async () => {
    setTables("SESSION");
    const { result } = renderHook(() => useMyDashakamGarden("c1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bloomMode).toBe("SESSION");
    expect(result.current.tiles.get("s1")?.canTap).toBe(false);
    expect(result.current.tiles.get("s1")?.disabledReason).toBe("Blooms automatically after the day's session");
  });

  it("keeps personal-garden tiles tappable in MY_READING mode", async () => {
    setTables("MY_READING");
    const { result } = renderHook(() => useMyDashakamGarden("c1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tiles.get("s1")?.canTap).toBe(true);
    expect(result.current.tiles.get("s1")?.disabledReason).toBeNull();
  });
});

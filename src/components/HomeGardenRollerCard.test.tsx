import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeGardenRollerCard from "./HomeGardenRollerCard";

const mocks = vi.hoisted(() => ({
  sessions: [] as any[],
  groups: [] as any[],
  participants: [{ challenge_session_id: "reading" }, { challenge_session_id: "session" }],
  filters: vi.fn(),
  toggle: vi.fn(),
  user: { id: "member-1" } as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const query: any = {};
    for (const method of ["select", "eq", "in", "not", "is", "or", "order"]) {
      query[method] = (...args: unknown[]) => { mocks.filters(table, method, ...args); return query; };
    }
    query.then = (resolve: (value: unknown) => void) => resolve({
      data: table === "parayanam_participants" ? mocks.participants : table === "groups" ? mocks.groups : mocks.sessions, error: null,
    });
    return query;
  },
} }));
vi.mock("@/hooks/useMyDashakamGarden", () => ({ useMyDashakamGarden: () => ({
  loading: false,
  blooms: new Map([["one", 100], ["two", 0]]),
  occurrences: [{ key: "one", dashakamNo: 7, scheduledDate: "2026-10-26" }, { key: "two", dashakamNo: 8, scheduledDate: "2026-10-27" }],
  toggleDashakam: mocks.toggle,
}) }));
vi.mock("@/components/MyGardenDialog", () => ({ default: ({ initialSessionId }: { initialSessionId: string }) => <div role="dialog" data-session={initialSessionId} /> }));

beforeEach(() => {
  mocks.user = { id: "member-1" };
  mocks.groups = [{ id: "grp-1", group_name: "Group" }];
  mocks.sessions = [
    { id: "reading", parayanam_name: "Morning", bloom_mode: "MY_READING", group_id: "grp-1", groups: { group_name: "Group" } },
    { id: "session", parayanam_name: "Evening", bloom_mode: "SESSION", group_id: "grp-1", groups: { group_name: "Group" } },
  ];
  mocks.filters.mockClear();
  mocks.toggle.mockClear();
});
afterEach(cleanup);

describe("view-only home gardens", () => {
  it("loads only confirmed, active, home-enabled, unfinished group parayanams ending yesterday or later", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-26T17:56:00Z"));
    try {
      render(<HomeGardenRollerCard />);
      await screen.findByText("Group – Morning");
      for (const args of [
        ["parayanam_participants", "eq", "user_id", "member-1"],
        ["parayanam_participants", "eq", "status", "confirmed"],
        ["parayanam_participants", "eq", "access_status", "active"],
        ["challenge_sessions", "eq", "show_garden_on_home", true],
        ["challenge_sessions", "is", "completed_at", null],
        ["challenge_sessions", "not", "group_id", "is", null],
        ["challenge_sessions", "or", "end_date.is.null,end_date.gte.2026-10-25"],
      ]) expect(mocks.filters).toHaveBeenCalledWith(...args);
    } finally { vi.useRealTimers(); }
  });

  it("never calls completion actions when viewing lotuses in either mode", async () => {
    render(<HomeGardenRollerCard />);
    for (const name of ["Morning", "Evening"]) {
      fireEvent.click(await screen.findByRole("button", { name: `Expand garden: Group – ${name}` }));
      fireEvent.click(screen.getByRole("img", { name: "Dashakam 7, 26 Oct, bloomed" }));
    }
    expect(mocks.toggle).not.toHaveBeenCalled();
  });

  it("offers the existing garden dialog only for MY_READING and passes its session id", async () => {
    render(<HomeGardenRollerCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Expand garden: Group – Evening" }));
    expect(screen.queryByRole("button", { name: "Open garden" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand garden: Group – Morning" }));
    fireEvent.click(screen.getByRole("button", { name: "Open garden" }));
    expect(screen.getByRole("dialog").getAttribute("data-session")).toBe("reading");
  });

  it("renders nothing without qualifying sessions", async () => {
    mocks.sessions = [];
    const { container } = render(<HomeGardenRollerCard />);
    await waitFor(() => expect(mocks.filters).toHaveBeenCalledWith("challenge_sessions", "eq", "show_garden_on_home", true));
    expect(container.childElementCount).toBe(0);
  });

  it("still shows the group name for a parayanam whose groups embed came back empty", async () => {
    mocks.sessions = [
      { id: "reading", parayanam_name: "Vivāha Maṅgala Saptāham", bloom_mode: "MY_READING", group_id: "grp-1", groups: null },
      { id: "session", parayanam_name: "100DaysWithGuruvayurappan", bloom_mode: "MY_READING", group_id: "grp-1", groups: { group_name: "Group" } },
    ];
    render(<HomeGardenRollerCard />);
    expect(await screen.findByText("Group – Vivāha Maṅgala Saptāham")).toBeTruthy();
    expect(await screen.findByText("Group – 100DaysWithGuruvayurappan")).toBeTruthy();
    expect(mocks.filters).toHaveBeenCalledWith("groups", "in", "id", ["grp-1"]);
  });
});
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SelfJoinParayanamPrompt from "./SelfJoinParayanamPrompt";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "member-1" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({ data: {}, error: null });
});

describe("self-join approval flow", () => {
  it("PAID calls only self-join and does not navigate as if approved", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ session_id: "paid-session", parayanam_name: "Test", group_id: "group-1", group_name: "Group", participation_type: "PAID" }] });
    render(<SelfJoinParayanamPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: /Yes,/ }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("self-join-parayanam", { body: { session_id: "paid-session" } }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Yes,/ })).toBeNull());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("FREE still joins and navigates to its group session", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ session_id: "free-session", parayanam_name: "Test", group_id: "group-1", group_name: "Group", participation_type: "FREE" }] });
    render(<SelfJoinParayanamPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: /Yes,/ }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/groups/group-1?session=free-session"));
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("self-join-parayanam", { body: { session_id: "free-session" } });
  });
});
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PendingInvitesSection from "./PendingInvitesSection";

const mocks = vi.hoisted(() => ({ respond: vi.fn(), refreshAwaiting: vi.fn() }));
vi.mock("@/hooks/useParayanamParticipants", () => ({
  useMyPendingInvites: () => ({ invites: [{ id: "invite-1", participation_type: "PAID", parayanam_name: "Test" }], loading: false, busyId: null, respond: mocks.respond }),
  useMyAwaitingContributions: () => ({ invites: [], loading: false, refresh: mocks.refreshAwaiting }),
}));
vi.mock("@/hooks/useCapabilities", () => ({ useCapabilities: () => ({ canViewExternalPaymentLinks: false }) }));
vi.mock("@/components/PushRemindersPrompt", () => ({ default: () => null }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.respond.mockResolvedValue(undefined);
});

describe("PAID invitation actions", () => {
  it("accepts through the normal response flow and refreshes awaiting approval", async () => {
    render(<PendingInvitesSection />);
    fireEvent.click(screen.getByRole("button", { name: /Accept Invitation/ }));
    await waitFor(() => expect(mocks.refreshAwaiting).toHaveBeenCalledTimes(1));
    expect(mocks.respond).toHaveBeenCalledExactlyOnceWith("invite-1", "confirmed");
  });

  it("preserves the decline response without starting approval", async () => {
    render(<PendingInvitesSection />);
    fireEvent.click(screen.getByRole("button", { name: /Decline/ }));
    await waitFor(() => expect(mocks.respond).toHaveBeenCalledExactlyOnceWith("invite-1", "declined"));
    expect(mocks.refreshAwaiting).not.toHaveBeenCalled();
  });
});
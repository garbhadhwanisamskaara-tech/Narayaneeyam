import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isParticipantEligible } from "./parayanamEligibility";

describe("PAID parayanam eligibility", () => {
  it("accepts a confirmed contribution with active access", () => {
    expect(
      isParticipantEligible(
        { status: "confirmed", contribution_status: "confirmed", access_status: "active" },
        "PAID",
      ),
    ).toBe(true);
  });

  it("accepts not_required (owner/Guru exempt from contributing) with active access", () => {
    expect(
      isParticipantEligible(
        { status: "confirmed", contribution_status: "not_required", access_status: "active" },
        "PAID",
      ),
    ).toBe(true);
  });

  it("still requires access_status active for a not_required member", () => {
    expect(
      isParticipantEligible(
        { status: "confirmed", contribution_status: "not_required", access_status: "locked" },
        "PAID",
      ),
    ).toBe(false);
  });

  it("still requires the participant status confirmed", () => {
    expect(
      isParticipantEligible(
        { status: "invited", contribution_status: "not_required", access_status: "active" },
        "PAID",
      ),
    ).toBe(false);
  });

  it("rejects a contribution still awaiting Guru approval", () => {
    expect(
      isParticipantEligible(
        { status: "confirmed", contribution_status: "pending", access_status: "active" },
        "PAID",
      ),
    ).toBe(false);
  });
});

describe("FREE parayanam eligibility", () => {
  it("accepts a confirmed participant", () => {
    expect(isParticipantEligible({ status: "confirmed" }, "FREE")).toBe(true);
  });
});

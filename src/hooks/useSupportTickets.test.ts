import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

import { CATEGORY_OPTIONS, NEW_TICKET_CATEGORY_OPTIONS, categoryLabel } from "./useSupportTickets";

describe("support ticket category compatibility", () => {
  it("excludes subscription from new tickets without any platform condition", () => {
    expect(NEW_TICKET_CATEGORY_OPTIONS.map((option) => option.value)).toEqual([
      "audio_issue", "content_error", "technical", "feature_request", "other",
    ]);
  });

  it("retains subscription category resolution for historical tickets", () => {
    expect(CATEGORY_OPTIONS.some((option) => option.value === "subscription")).toBe(true);
    expect(categoryLabel("subscription")).not.toBe("subscription");
  });
});
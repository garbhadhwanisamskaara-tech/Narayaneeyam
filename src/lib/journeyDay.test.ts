import { describe, expect, it } from "vitest";
import { getCurrentDay, getJourneyDayPosition } from "@/lib/journeyDay";

describe("journey day calculation", () => {
  it("returns zero before the effective start date", () => {
    expect(getCurrentDay("2026-11-01", 10, "2026-10-31")).toBe(0);
  });

  it("returns one on the effective start date", () => {
    expect(getCurrentDay("2026-11-01", 10, "2026-11-01")).toBe(1);
  });

  it("increments by calendar day while the journey is active", () => {
    expect(getCurrentDay("2026-11-01", 10, "2026-11-05")).toBe(5);
  });

  it("keeps the upper cap while exposing the uncapped position", () => {
    expect(getCurrentDay("2026-11-01", 10, "2026-11-15")).toBe(10);
    expect(getJourneyDayPosition("2026-11-01", "2026-11-15")).toBe(15);
  });
});
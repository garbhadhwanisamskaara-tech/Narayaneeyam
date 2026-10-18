import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissTodaysDashakam,
  isTodaysDashakamDismissed,
  istToday,
} from "./todaysDashakamDismiss";

beforeEach(() => localStorage.clear());

describe("today's dashakam dismissal", () => {
  it("is the Kolkata calendar day, not the UTC one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T20:00:00Z")); // 01:30 IST, already the 18th
    expect(istToday()).toBe("2026-10-18");
    vi.useRealTimers();
  });

  it("stores today's date under todays_dashakam_dismissed", () => {
    dismissTodaysDashakam();
    expect(localStorage.getItem("todays_dashakam_dismissed")).toBe(istToday());
    expect(istToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps the card hidden today and shows it again the next day", () => {
    dismissTodaysDashakam();
    expect(isTodaysDashakamDismissed()).toBe(true);
    localStorage.setItem("todays_dashakam_dismissed", "2020-01-01");
    expect(isTodaysDashakamDismissed()).toBe(false);
  });
});

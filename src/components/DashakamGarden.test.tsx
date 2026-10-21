import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashakamGarden from "./DashakamGarden";

vi.mock("@/hooks/useLanguagePrefs", () => ({ useLanguagePrefs: () => ({ scriptLang: "en" }) }));
vi.mock("@/hooks/useDashakam", () => ({
  useDashakamNames: () => undefined,
  getDashakamName: (no: number) => `Dashakam ${no}`,
}));

const occurrences = [
  { key: "a", dashakamNo: 7, scheduledDate: "2026-10-21" },
  { key: "b", dashakamNo: 8, scheduledDate: "2026-10-22" },
];

afterEach(cleanup);

describe("DashakamGarden loading state", () => {
  it("shows only the title and a tending message while loading", () => {
    render(
      <DashakamGarden
        blooms={new Map()}
        occurrences={occurrences}
        loading
        tiles={new Map([["a", { done: 0, total: 1, canTap: true }]])}
        onTapDashakam={() => {}}
      />,
    );

    expect(screen.getByText("My Dashakam Garden")).toBeInTheDocument();
    expect(screen.getByText("Tending the garden…")).toBeInTheDocument();
    // Neither the grid nor the compact preview may render yet — otherwise the
    // default 1–100 buds flash before the real dashakams arrive.
    expect(screen.queryAllByLabelText(/^Dashakam \d+/)).toHaveLength(0);
    expect(screen.queryByText("Recently bloomed")).toBeNull();
    expect(screen.queryByText("All blooming")).toBeNull();
    expect(screen.queryByText("Dashakam 7")).toBeNull();
    expect(screen.queryByRole("button", { name: "View full Garden" })).toBeNull();
  });

  it("renders the real occurrences once loading finishes", () => {
    render(
      <DashakamGarden
        blooms={new Map([["a", 100]])}
        occurrences={occurrences}
        tiles={new Map([
          ["a", { done: 1, total: 1, canTap: true }],
          ["b", { done: 0, total: 1, canTap: true }],
        ])}
        onTapDashakam={() => {}}
      />,
    );

    expect(screen.queryByText("Tending the garden…")).toBeNull();
    expect(screen.getByLabelText("Dashakam 7, 21 Oct, tap to mark complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Dashakam 8, 22 Oct, tap to mark complete")).toBeInTheDocument();
  });
});

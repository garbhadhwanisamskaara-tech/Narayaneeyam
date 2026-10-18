import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TodaysDashakamCard from "./TodaysDashakamCard";
import { istToday } from "@/lib/todaysDashakamDismiss";

const mocks = vi.hoisted(() => ({
  queue: { loading: false, todayRows: [] as any[] },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "member-1" } }) }));
vi.mock("@/hooks/useMyDashakamQueue", () => ({ useMyDashakamQueue: () => mocks.queue }));

function row(sourceName: string, nos: number[]) {
  return {
    key: sourceName,
    sourceName,
    items: nos.map((dashakamNo, i) => ({
      scheduleId: `${sourceName}-${i}`,
      dashakamNo,
      scheduledDate: "2026-10-18",
      sourceName,
      sessionId: "session-1",
    })),
  };
}

function renderCard() {
  return render(
    <MemoryRouter>
      <TodaysDashakamCard />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
  mocks.queue.todayRows = [row("Guru's Parayanam", [7, 12, 13])];
});

describe("today's dashakam card", () => {
  it("links Chant Now and Listen to the same dashakam", () => {
    renderCard();
    expect(screen.getByRole("link", { name: /Chant Now/ })).toHaveAttribute("href", "/chant/7");
    expect(screen.getByRole("link", { name: /Listen/ })).toHaveAttribute("href", "/listen?dashakam=7");
  });

  it("shows +N more for the other dashakams due today and opens the queue list", () => {
    const opened = vi.fn();
    window.addEventListener("open-dashakam-queue", opened);
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "+2 more" }));
    expect(opened).toHaveBeenCalledOnce();
    window.removeEventListener("open-dashakam-queue", opened);
  });

  it("hides the card and remembers today when dismissed", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Hide today's dashakam/ }));
    expect(screen.queryByText("Today's Dashakam")).toBeNull();
    expect(localStorage.getItem("todays_dashakam_dismissed")).toBe(istToday());
  });

  it("is not rendered when today's card was already dismissed", () => {
    localStorage.setItem("todays_dashakam_dismissed", istToday());
    renderCard();
    expect(screen.queryByText("Today's Dashakam")).toBeNull();
  });

  it("shows no +more line when only one dashakam is due", () => {
    mocks.queue.todayRows = [row("Personal", [4])];
    renderCard();
    expect(screen.queryByText(/^\+\d+ more$/)).toBeNull();
  });
});

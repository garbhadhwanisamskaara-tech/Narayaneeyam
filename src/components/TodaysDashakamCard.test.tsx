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

function row(sourceName: string, nos: number[], parayanamName: string | null = null) {
  return {
    key: `${sourceName}|${parayanamName ?? ""}`,
    sourceName,
    parayanamName,
    items: nos.map((dashakamNo, i) => ({
      scheduleId: `${sourceName}-${i}`,
      dashakamNo,
      scheduledDate: "2026-10-18",
      sourceName,
      parayanamName,
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
  mocks.queue.todayRows = [row("Guru's Parayanam", [7, 12, 13], "Vivāha Mangala Saptāham")];
});

describe("today's dashakam card", () => {
  it("links Chant Now and Listen to the same dashakam", () => {
    renderCard();
    expect(screen.getByRole("link", { name: /Chant Now/ })).toHaveAttribute("href", "/chant/7");
    expect(screen.getByRole("link", { name: /Listen/ })).toHaveAttribute("href", "/listen?dashakam=7");
  });

  it("shows the parayanam name with the group name", () => {
    renderCard();
    expect(screen.getByText("Vivāha Mangala Saptāham · Guru's Parayanam")).toBeTruthy();
  });

  it("shows only the parayanam name for a personal parayanam", () => {
    mocks.queue.todayRows = [row("Personal", [4, 9], "Morning Japam")];
    renderCard();
    expect(screen.getByText("Morning Japam")).toBeTruthy();
    expect(screen.queryByText(/· Personal/)).toBeNull();
  });

  it("expands +N more inside the card, grouped by parayanam, and collapses again", () => {
    renderCard();
    const toggle = screen.getByRole("button", { name: /\+2 more/ });
    expect(screen.queryByText("Dashakam 12")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getAllByText("Vivāha Mangala Saptāham · Guru's Parayanam").length).toBeGreaterThan(0);
    expect(screen.getByText("Dashakam 12")).toBeTruthy();
    expect(screen.getByText("Dashakam 13")).toBeTruthy();
    const chantLinks = screen.getAllByRole("link", { name: "Chant" });
    expect(chantLinks.map((l) => l.getAttribute("href"))).toEqual(["/chant/7", "/chant/12", "/chant/13"]);
    // The main card's own Listen button also matches; it precedes the list.
    const listenLinks = screen.getAllByRole("link", { name: "Listen" });
    expect(listenLinks.map((l) => l.getAttribute("href"))).toEqual([
      "/listen?dashakam=7",
      "/listen?dashakam=7",
      "/listen?dashakam=12",
      "/listen?dashakam=13",
    ]);

    fireEvent.click(toggle);
    expect(screen.queryByText("Dashakam 12")).toBeNull();
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

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParticipantPicker from "./ParticipantPicker";

const members = [
  { user_id: "owner-1", display_name: "Vidya" },
  { user_id: "member-1", display_name: "Lakshmi" },
  { user_id: "member-2", display_name: "Hari" },
] as any;

const baseProps = {
  members,
  ownerId: "owner-1",
  selected: [],
  onToggle: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
};

describe("ParticipantPicker include-myself checkbox", () => {
  it("shows the include-myself checkbox when not hidden", () => {
    render(<ParticipantPicker {...baseProps} includeSelf={false} onIncludeSelfChange={vi.fn()} />);
    expect(screen.getByLabelText("I'm also chanting in this parayanam")).toBeInTheDocument();
  });

  it("hides the include-myself checkbox for SAME_FOR_ALL parayanams", () => {
    render(<ParticipantPicker {...baseProps} includeSelf onIncludeSelfChange={vi.fn()} hideIncludeSelf />);
    expect(screen.queryByLabelText("I'm also chanting in this parayanam")).not.toBeInTheDocument();
  });

  it("hides the checkbox but keeps the member list working", () => {
    render(<ParticipantPicker {...baseProps} includeSelf onIncludeSelfChange={vi.fn()} hideIncludeSelf />);
    const lakshmi = screen.getByLabelText("Lakshmi");
    fireEvent.click(lakshmi);
    expect(baseProps.onToggle).toHaveBeenCalledWith("member-1");
  });
});

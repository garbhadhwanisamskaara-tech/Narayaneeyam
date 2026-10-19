import { describe, expect, it } from "vitest";
import { characterCountState } from "./characterCount";

describe("remarks character counter thresholds", () => {
  it("stays normal below 450", () => expect(characterCountState(449, 500)).toBe("normal"));
  it("warns from 450", () => expect(characterCountState(450, 500)).toBe("warning"));
  it("reaches the limit at 500", () => expect(characterCountState(500, 500)).toBe("limit"));
});

describe("name character counter thresholds", () => {
  it("stays normal below 72", () => expect(characterCountState(71, 80)).toBe("normal"));
  it("warns from 72", () => expect(characterCountState(72, 80)).toBe("warning"));
  it("reaches the limit at 80", () => expect(characterCountState(80, 80)).toBe("limit"));
});
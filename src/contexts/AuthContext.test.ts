import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fixed trial end date", () => {
  it("uses the requested end of 2099 in IST", () => {
    const source = readFileSync("src/contexts/AuthContext.tsx", "utf8");
    const date = source.match(/const TRIAL_END_DATE = new Date\("([^"]+)"\)/)?.[1];

    expect(date).toBe("2099-12-31T23:59:59+05:30");
    expect(new Date(date ?? "").toISOString()).toBe("2099-12-31T18:29:59.000Z");
  });
});
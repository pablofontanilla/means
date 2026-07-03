import { describe, expect, it } from "vitest";

// Smoke test — confirms vitest is wired up before the engine lands in M2.
describe("scaffold", () => {
  it("runs the test harness", () => {
    expect(1 + 1).toBe(2);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/engine/config.ts";
import { runAct2 } from "../src/act2/run.ts";
import { clerkReview } from "../src/act2/clerk.ts";

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  // jsdom canvas has no 2d context; make getContext harmless.
  (HTMLCanvasElement.prototype as unknown as { getContext: () => null }).getContext = () => null;
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Act 2 run loop (jsdom smoke test)", () => {
  it("plays weeks to a terminal ending, showing the capacity meter throughout", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    runAct2(root, DEFAULT_CONFIG, { name: "You", flagRate: 0.6 });

    // The one new UI element (§7.4) is present from week 0.
    expect(root.querySelector(".meter.capacity")).toBeTruthy();

    let sawClerk = false;
    let ended = false;
    for (let i = 0; i < 60; i++) {
      if (root.querySelector(".clerk-review")) sawClerk = true;
      const btn = root.querySelector<HTMLButtonElement>("#end-week");
      if (!btn) {
        ended = true;
        break;
      }
      btn.click();
    }

    expect(ended).toBe(true);
    expect(sawClerk).toBe(true); // the clerk reviewed the file at least once
    expect(root.querySelector(".ending")).toBeTruthy();
    expect(root.querySelector(".epitaph")).toBeTruthy();
    // The ending is one of the three outcomes (§5.5).
    const cls = root.querySelector(".ending")!.className;
    expect(/escaped|collapsed|trapped/.test(cls)).toBe(true);
  });
});

describe("clerk (§7.5): applies the player's own flag rate", () => {
  it("a punitive Act 1 player docks more than a lenient one", () => {
    const punitive = clerkReview(6, 1.0, DEFAULT_CONFIG);
    const lenient = clerkReview(6, 0.0, DEFAULT_CONFIG);
    expect(punitive.flagged).toBeGreaterThan(lenient.flagged);
    expect(punitive.dock).toBeGreaterThan(lenient.dock);
    expect(lenient.dock).toBe(0);
    // Both still quote the player's record back at them.
    expect(punitive.note).toContain("%");
    expect(lenient.note).toContain("%");
  });
});

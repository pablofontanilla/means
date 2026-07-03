// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/engine/config.ts";
import { runAct1 } from "../src/act1/desk.ts";
import type { DeskOutcome } from "../src/act1/desk.ts";

// jsdom has no rAF/AudioContext; stub what the desk touches so it runs headless.
beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  if (!("performance" in globalThis)) vi.stubGlobal("performance", { now: () => 0 });
});

// Clear the DOM between tests. (jsdom resolves #id selectors document-globally,
// so leftover roots with duplicate ids would break scoped queries — a test-only
// concern; the real app mounts a single desk under #app.)
afterEach(() => {
  document.body.innerHTML = "";
});

function stampAllAndSubmit(root: HTMLElement): boolean {
  // Stamp every flaggable line in the current case, then submit.
  const flagBtns = root.querySelectorAll<HTMLButtonElement>(".stampbtn.flag");
  if (flagBtns.length === 0) return false;
  flagBtns.forEach((b) => b.click());
  const submit = root.querySelector<HTMLButtonElement>("#submit");
  if (!submit || submit.disabled) return false;
  submit.click();
  return true;
}

describe("Act 1 desk flow (jsdom smoke test)", () => {
  it("stamps through the whole caseload and reaches the review", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    let outcome: DeskOutcome | null = null;
    runAct1(root, DEFAULT_CONFIG, (o) => (outcome = o));

    // Header + first case rendered.
    expect(root.querySelector(".portal-header")).toBeTruthy();
    expect(root.querySelector(".casefile")).toBeTruthy();

    // Drive all 8 cases.
    for (let i = 0; i < 8; i++) {
      const ok = stampAllAndSubmit(root);
      expect(ok).toBe(true);
    }

    expect(outcome).not.toBeNull();
    const o = outcome!;
    expect(o.kpi.casesResolved).toBe(8);
    expect(o.kpi.flags).toBeGreaterThan(0);
    // Every stamped line produced a counterfactual (both branches filed).
    expect(o.counterfactuals.length).toBe(o.kpi.totalStamps);
    // Archive received entries.
    expect(root.querySelector(".drawer-tab .badge")!.textContent).toBe(String(o.counterfactuals.length));
  });

  it("renders the act-end review with cohort outcomes", async () => {
    const { showReview } = await import("../src/act1/review.ts");
    // Drive the desk first (its own root is the only one in the body).
    let outcome: DeskOutcome | null = null;
    const deskRoot = document.createElement("div");
    document.body.appendChild(deskRoot);
    runAct1(deskRoot, DEFAULT_CONFIG, (o) => (outcome = o));
    for (let i = 0; i < 8; i++) stampAllAndSubmit(deskRoot);
    deskRoot.remove();

    // Now render the review into a fresh root.
    const root = document.createElement("div");
    root.innerHTML = `<div id="stage"></div>`;
    document.body.appendChild(root);
    let continued = false;
    showReview(root, outcome!, DEFAULT_CONFIG, () => (continued = true));
    expect(root.querySelector(".review")).toBeTruthy();
    expect(root.querySelector(".cohort-bar")).toBeTruthy();
    root.querySelector<HTMLButtonElement>("#continue")!.click();
    expect(continued).toBe(true);
  });

  it("flagging everything makes accuracy match the rubric-flag proportion", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    let outcome: DeskOutcome | null = null;
    runAct1(root, DEFAULT_CONFIG, (o) => (outcome = o));
    for (let i = 0; i < 8; i++) stampAllAndSubmit(root);
    // Flagging every line: accurate stamps are exactly the rubric-flag lines.
    const o = outcome!;
    expect(o.kpi.flags).toBe(o.kpi.totalStamps);
    expect(o.kpi.accurateStamps).toBeLessThan(o.kpi.totalStamps); // some lines were exempt
    expect(o.kpi.accurateStamps).toBeGreaterThan(0);
  });
});

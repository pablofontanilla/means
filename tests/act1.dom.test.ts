// @vitest-environment jsdom
// Act 1 desk flow (§5, §9): the three-way verdict model, category + big-ticket
// rows, the audit-event interstitial, and the performance-only review.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/engine/config.ts";
import { runAct1 } from "../src/act1/desk.ts";
import type { DeskOutcome } from "../src/act1/desk.ts";
import { AUDIT_THRESHOLD, alignment } from "../src/act1/kpi.ts";

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

/** Stamp every item in the current case with one verdict. */
function stampCase(root: HTMLElement, verdict: "approve" | "warn" | "flag"): number {
  const btns = root.querySelectorAll<HTMLButtonElement>(`.casefile .stampbtn.${verdict}`);
  btns.forEach((b) => b.click());
  return btns.length;
}

function submitCase(root: HTMLElement): boolean {
  const submit = root.querySelector<HTMLButtonElement>("#submit");
  if (!submit || submit.disabled) return false;
  submit.click();
  return true;
}

describe("Act 1 desk flow (jsdom)", () => {
  it("renders context + item rows and drives all 3 cases to completion", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    let outcome: DeskOutcome | null = null;
    runAct1(root, DEFAULT_CONFIG, (o) => (outcome = o));

    // Header, case file, and the always-visible circumstances panel.
    expect(root.querySelector(".portal-header")).toBeTruthy();
    expect(root.querySelector(".casefile")).toBeTruthy();
    expect(root.querySelector(".circumstances")).toBeTruthy();
    expect(root.querySelector(".circumstances")!.textContent).toContain("Dependents");

    // Category buckets and big-ticket rows, each with a 3-way control.
    expect(root.querySelectorAll("tr.item-category").length).toBeGreaterThan(0);
    expect(root.querySelectorAll("tr.item-bigticket").length).toBeGreaterThan(0);
    const firstRow = root.querySelector("tr.item-category")!;
    expect(firstRow.querySelectorAll(".stampbtn").length).toBe(3);

    // Immediate per-decision feedback lands on the stamped row.
    firstRow.querySelector<HTMLButtonElement>(".stampbtn.flag")!.click();
    expect(firstRow.querySelector(".decision-feedback")).toBeTruthy();
    expect(firstRow.querySelector(".decision-feedback")!.textContent).toContain("pts");

    // Drive all 3 cases, flagging everything.
    for (let i = 0; i < 3; i++) {
      stampCase(root, "flag");
      expect(submitCase(root)).toBe(true);
    }

    expect(outcome).not.toBeNull();
    const o = outcome! as DeskOutcome;
    expect(o.kpi.casesResolved).toBe(3);
    expect(o.cases.length).toBe(3);
    expect(o.kpi.flags).toBe(o.kpi.totalStamps);
    // Over-flagging tanks alignment — the fix for "just flag everything".
    expect(alignment(o.kpi)).toBeLessThan(0.5);
    // Flagging never accrues audit risk.
    expect(o.kpi.auditRisk).toBe(0);
    // Every determination produced a counterfactual (both branches filed).
    expect(o.counterfactuals.length).toBe(o.kpi.totalStamps);
    expect(root.querySelector(".drawer-tab .badge")!.textContent).toBe(String(o.counterfactuals.length));
  });

  it("fires the audit event once on crossing and re-reviews a prior decision", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    let outcome: DeskOutcome | null = null;
    runAct1(root, DEFAULT_CONFIG, (o) => (outcome = o));

    // Case 1 (R. Alvarez): no expected-flags — approving all is audit-quiet.
    stampCase(root, "approve");
    expect(document.querySelector(".audit-event")).toBeNull();
    expect(submitCase(root)).toBe(true);

    // Case 2 (D. Okafor): approving the expected-flag items accrues audit risk
    // past the threshold — the supervisor interstitial appears.
    stampCase(root, "approve");
    const overlay = document.querySelector<HTMLElement>(".audit-event");
    expect(overlay).toBeTruthy();
    // It pulls a PRIOR under-called determination back for a fresh one:
    // the first expected-flag this shift was Okafor's Dining bucket.
    expect(overlay!.textContent).toContain("Dining");
    expect(overlay!.textContent).toContain("D. Okafor");
    // The queue is gated until the re-determination is made.
    expect(root.querySelector<HTMLButtonElement>("#submit")!.disabled).toBe(true);

    // Make the fresh determination and return to the caseload.
    overlay!.querySelector<HTMLButtonElement>(".stampbtn.flag")!.click();
    const ret = overlay!.querySelector<HTMLButtonElement>("#audit-return")!;
    expect(ret.disabled).toBe(false);
    ret.click();
    expect(document.querySelector(".audit-event")).toBeNull();
    // Clicks that landed while the interstitial was up were swallowed (the
    // desk is guarded): the items after the crossing still need real stamps.
    expect(submitCase(root)).toBe(false);
    stampCase(root, "approve");
    expect(submitCase(root)).toBe(true);

    // Case 3: more approvals — but the crossing already happened, so the
    // event does not fire again.
    stampCase(root, "approve");
    expect(document.querySelector(".audit-event")).toBeNull();
    expect(submitCase(root)).toBe(true);

    const o = outcome! as DeskOutcome;
    expect(o.kpi.auditRisk).toBeGreaterThanOrEqual(AUDIT_THRESHOLD);
    // The re-determination was a real stamp, filed like any other.
    expect(o.counterfactuals.length).toBe(o.kpi.totalStamps);
  });

  it("defers a mid-timeout audit crossing until the whole batch is auto-stamped", () => {
    // Capture the desk's rAF tick so the case clock can be driven for real:
    // jump performance.now past the deadline and run one tick — timeout() fires
    // through its production path, no internals poked.
    let tick: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      tick = cb;
      return 0;
    });
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    try {
      const root = document.createElement("div");
      document.body.appendChild(root);
      runAct1(root, DEFAULT_CONFIG, () => {});

      // Case 1 (R. Alvarez): no expected-flags — approve everything, audit-quiet.
      stampCase(root, "approve");
      expect(submitCase(root)).toBe(true);

      // Case 2 (D. Okafor): let it fully time out. The auto-approve loop crosses
      // the audit threshold partway through (two expected-flags at +12 each) —
      // the interstitial must wait until every item has its default stamp.
      nowSpy.mockReturnValue(1e9); // long past the case deadline
      expect(tick).not.toBeNull();
      tick!(1e9);

      const overlay = document.querySelector<HTMLElement>(".audit-event");
      expect(overlay).toBeTruthy();
      // No stranded determinations: every item was auto-stamped before the
      // audit opened (the regression left live buttons behind the overlay).
      expect(root.querySelectorAll(".casefile .stampbtn").length).toBe(0);
      expect(root.querySelector<HTMLButtonElement>("#submit")!.disabled).toBe(true);

      // Complete the re-review and return: the case comes back in the same
      // ready-to-submit state a full timeout produces.
      overlay!.querySelector<HTMLButtonElement>(".stampbtn.flag")!.click();
      overlay!.querySelector<HTMLButtonElement>("#audit-return")!.click();
      expect(document.querySelector(".audit-event")).toBeNull();
      expect(submitCase(root)).toBe(true);
    } finally {
      nowSpy.mockRestore();
      vi.stubGlobal("requestAnimationFrame", () => 0);
    }
  });

  it("shows a performance-only review: no cohort, alignment + audit standing", async () => {
    const { showReview } = await import("../src/act1/review.ts");
    // Drive the desk first (its own root is the only one in the body).
    let outcome: DeskOutcome | null = null;
    const deskRoot = document.createElement("div");
    document.body.appendChild(deskRoot);
    runAct1(deskRoot, DEFAULT_CONFIG, (o) => (outcome = o));
    for (let i = 0; i < 3; i++) {
      stampCase(deskRoot, "flag");
      submitCase(deskRoot);
    }
    deskRoot.remove();

    // Now render the review into a fresh root.
    const root = document.createElement("div");
    root.innerHTML = `<div id="stage"></div>`;
    document.body.appendChild(root);
    let continued = false;
    showReview(root, outcome!, DEFAULT_CONFIG, () => (continued = true));
    expect(root.querySelector(".review")).toBeTruthy();
    // The cohort/poverty-trap tally is GONE from the act-end screen (§8).
    expect(root.querySelector(".cohort-bar")).toBeNull();
    expect(root.textContent).not.toMatch(/escaped|collapsed|trapped/i);
    // Performance signals: stars, alignment %, audit standing.
    expect(root.querySelector(".stars")).toBeTruthy();
    expect(root.querySelector("#r-align")!.textContent).toMatch(/^\d+%$/);
    expect(root.querySelector("#r-audit")!.textContent).toBe("Clear");
    root.querySelector<HTMLButtonElement>("#continue")!.click();
    expect(continued).toBe(true);
  });
});

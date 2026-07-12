// Pure-model unit tests for the redesigned Act 1 (§1–§4): category aggregation,
// the contextual rubric (circumstances set the bar), and the three-way KPI
// (alignment + audit risk). No DOM, no mocks — real behavior on real numbers.

import { describe, expect, it } from "vitest";
import type { LedgerLine } from "../src/engine/ledger.ts";
import { aggregateCategories } from "../src/act1/aggregate.ts";
import {
  bigTicketBar,
  categoryBar,
  deriveAllowance,
  verdictFor,
} from "../src/act1/rubric.ts";
import { buildCase, CASELOAD, type Circumstances } from "../src/act1/cases.ts";
import { dockFor, resolveItem } from "../src/act1/counterfactual.ts";
import {
  AUDIT_THRESHOLD,
  alignment,
  applyStamp,
  crossesAudit,
  flagRate,
  initKpi,
  rating,
} from "../src/act1/kpi.ts";

function line(turn: number, label: string, amount: number): LedgerLine {
  return { turn, label, amount, category: "restoration", flaggable: true };
}

describe("aggregate — discretionary ledger → category buckets (§3)", () => {
  it("buckets restoration lines into Dining/Entertainment/Subscriptions and sums", () => {
    const lines: LedgerLine[] = [
      line(1, "Rosie's Bar", -7),
      line(2, "Takeout dinner", -7),
      line(3, "Streaming subscription", -7),
      line(5, "Movie ticket", -7),
      line(5, "Lottery ticket", -7),
      // non-restoration lines must be ignored
      { turn: 1, label: "Wages", amount: 120, category: "income", flaggable: false },
      { turn: 1, label: "Rent", amount: -20, category: "rent", flaggable: false },
    ];
    const buckets = aggregateCategories(lines);
    const byCat = Object.fromEntries(buckets.map((b) => [b.category, b]));
    expect(byCat.Dining.spend).toBe(14);
    expect(byCat.Entertainment.spend).toBe(14);
    expect(byCat.Subscriptions.spend).toBe(7);
    // lastTurn tracks the most recent turn contributing to the bucket
    expect(byCat.Dining.lastTurn).toBe(2);
    expect(byCat.Entertainment.lastTurn).toBe(5);
  });

  it("omits categories with no spend", () => {
    const buckets = aggregateCategories([line(1, "Coffee run", -7)]);
    expect(buckets.map((b) => b.category)).toEqual(["Dining"]);
  });
});

describe("rubric — circumstances set the bar (§1, §2)", () => {
  const single: Circumstances = { dependents: 0, situation: "", housing: "", note: "" };
  const oneKid: Circumstances = { dependents: 1, situation: "", housing: "", note: "" };
  const twoKids: Circumstances = { dependents: 2, situation: "", housing: "", note: "" };

  it("dependents raise the allowance ceiling", () => {
    expect(deriveAllowance(oneKid).Dining).toBeGreaterThan(deriveAllowance(single).Dining);
    expect(deriveAllowance(twoKids).Dining).toBeGreaterThan(deriveAllowance(oneKid).Dining);
  });

  it("verdictFor thresholds: approve ≤ allowance < warn ≤ excess < flag", () => {
    expect(verdictFor(10, 12, 18)).toBe("approve");
    expect(verdictFor(12, 12, 18)).toBe("approve");
    expect(verdictFor(15, 12, 18)).toBe("warn");
    expect(verdictFor(18, 12, 18)).toBe("warn");
    expect(verdictFor(21, 12, 18)).toBe("flag");
  });

  it("the SAME $21 dining spend resolves flag/warn/approve by dependents", () => {
    const spend = 21;
    const call = (c: Circumstances) => {
      const bar = categoryBar("Dining", deriveAllowance(c));
      return verdictFor(spend, bar.allowance, bar.excess);
    };
    expect(call(single)).toBe("flag");
    expect(call(oneKid)).toBe("warn");
    expect(call(twoKids)).toBe("approve");
  });

  it("a dependent raises a mixed big-ticket (kid's laptop) from warn to approve", () => {
    const spend = 300;
    const noDep = bigTicketBar("mixed", single, spend);
    const withDep = bigTicketBar("mixed", oneKid, spend);
    expect(verdictFor(spend, noDep.allowance, noDep.excess)).toBe("warn");
    expect(verdictFor(spend, withDep.allowance, withDep.excess)).toBe("approve");
  });

  it("essential appliance → approve; luxury → flag, regardless of dependents", () => {
    const fridge = bigTicketBar("essential", single, 500);
    expect(verdictFor(500, fridge.allowance, fridge.excess)).toBe("approve");
    const tv = bigTicketBar("luxury", twoKids, 600);
    expect(verdictFor(600, tv.allowance, tv.excess)).toBe("flag");
  });
});

describe("kpi — alignment (§4)", () => {
  it("exact match earns full alignment; off-by-one partial; opposite zero", () => {
    const exact = initKpi();
    applyStamp(exact, "flag", "flag", 0);
    expect(alignment(exact)).toBe(1);

    const offByOne = initKpi();
    applyStamp(offByOne, "warn", "flag", 0);
    expect(alignment(offByOne)).toBeGreaterThan(0);
    expect(alignment(offByOne)).toBeLessThan(1);

    const opposite = initKpi();
    applyStamp(opposite, "flag", "approve", 0);
    expect(alignment(opposite)).toBe(0);
  });

  it("over-flagging (flag on expected-approve) tanks alignment vs. matching", () => {
    const expecteds = ["approve", "approve", "warn", "flag"] as const;
    const overFlag = initKpi();
    const matched = initKpi();
    for (const e of expecteds) {
      applyStamp(overFlag, "flag", e, 0);
      applyStamp(matched, e, e, 0);
    }
    expect(alignment(matched)).toBe(1);
    expect(alignment(overFlag)).toBeLessThan(0.5);
  });
});

describe("kpi — audit risk + threshold crossing (§4)", () => {
  it("approving an expected-flag accrues more risk than warning it", () => {
    const approved = initKpi();
    applyStamp(approved, "approve", "flag", 0);
    const warned = initKpi();
    applyStamp(warned, "warn", "flag", 0);
    expect(approved.auditRisk).toBeGreaterThan(warned.auditRisk);
    expect(warned.auditRisk).toBeGreaterThan(0);
  });

  it("approving expected-flags eventually crosses the threshold, once", () => {
    const kpi = initKpi();
    let crossings = 0;
    // Each approve-on-expected-flag accrues risk; drive until well past threshold.
    for (let i = 0; i < 5; i++) {
      const s = applyStamp(kpi, "approve", "flag", 0);
      if (s.crossedAudit) crossings += 1;
    }
    expect(kpi.auditRisk).toBeGreaterThanOrEqual(AUDIT_THRESHOLD);
    expect(crossings).toBe(1); // fires exactly once, on the crossing stamp
  });

  it("crossesAudit detects only the below→at/over transition", () => {
    expect(crossesAudit(AUDIT_THRESHOLD - 1, AUDIT_THRESHOLD)).toBe(true);
    expect(crossesAudit(AUDIT_THRESHOLD, AUDIT_THRESHOLD + 1)).toBe(false);
    expect(crossesAudit(0, AUDIT_THRESHOLD - 1)).toBe(false);
  });
});

describe("kpi — flag rate + rating (§4, load-bearing contract)", () => {
  it("flagRate counts warns as non-flags", () => {
    const kpi = initKpi();
    applyStamp(kpi, "flag", "flag", 0);
    applyStamp(kpi, "warn", "warn", 0);
    applyStamp(kpi, "approve", "approve", 0);
    expect(flagRate(kpi)).toBeCloseTo(1 / 3);
  });

  it("a streak-inflated score cannot rescue a misaligned shift", () => {
    const expecteds = ["approve", "approve", "approve", "warn", "flag"] as const;
    const overFlag = initKpi();
    const matched = initKpi();
    for (const e of expecteds) {
      applyStamp(overFlag, "flag", e, 1); // full speed bonus + streak: max score
      applyStamp(matched, e, e, 0); // slow but exactly on-standard
    }
    expect(overFlag.score).toBeGreaterThan(matched.score);
    expect(rating(overFlag).stars).toBeLessThan(rating(matched).stars);
  });

  it("an audited shift rates worse than a clean, well-aligned one", () => {
    const clean = initKpi();
    for (let i = 0; i < 4; i++) applyStamp(clean, "flag", "flag", 0);

    const audited = initKpi();
    for (let i = 0; i < 4; i++) applyStamp(audited, "approve", "flag", 0);

    expect(audited.auditRisk).toBeGreaterThanOrEqual(AUDIT_THRESHOLD);
    expect(rating(audited).stars).toBeLessThan(rating(clean).stars);
  });
});

describe("counterfactual — the warn's partial dock (§6)", () => {
  // A real built case, a real load-bearing big-ticket: Alvarez's laptop.
  const built = buildCase(CASELOAD.find((c) => c.id === "c1")!);
  const item = built.items.find((i) => i.itemId === "c1-refurbished-laptop")!;

  it("dockFor: flag docks the full amount, warn half, approve nothing", () => {
    expect(dockFor(item, "flag")).toBe(item.dockAmount);
    expect(dockFor(item, "warn")).toBe(Math.round(item.dockAmount / 2));
    expect(dockFor(item, "approve")).toBe(0);
  });

  it("a warn resolves with the half dock, and the fork runs on it", () => {
    const warned = resolveItem(built, item, "warn");
    expect(warned.docked).toBe(dockFor(item, "warn"));
    expect(warned.docked).toBe(Math.round(item.dockAmount / 2));
    // The partial dock still hurt a real period — a trap, not a neutral.
    expect(warned.flagCorrect).toBe(false);
    expect(warned.headline).toBe(`${item.label}: warned — $${warned.docked} docked.`);
    // The alternative to a warn is the clean approval, and says so.
    expect(warned.altPole).toBe("approve");
    expect(warned.alternative).toBe("Absorbed. No downstream events.");
    // The played branch was forked on the PARTIAL dock, not the full one:
    // for this item the half dock diverges at a different point than the
    // full dock, so the two reads differ (deterministic under DEFAULT_CONFIG).
    const flagged = resolveItem(built, item, "flag");
    expect(warned.asPlayed).not.toBe(flagged.asPlayed);
  });
});

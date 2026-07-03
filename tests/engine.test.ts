import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, maxTier } from "../src/engine/config.ts";
import { initState, step } from "../src/engine/engine.ts";
import { makeRestorationPolicy, makeRestraintPolicy } from "../src/engine/policies.ts";
import {
  footingShape,
  forkAtDecision,
  runCohort,
  runFull,
  seedRange,
} from "../src/engine/simulate.ts";

const config = DEFAULT_CONFIG;
const SEEDS = seedRange(1, 3000);
const restoration = makeRestorationPolicy(config);
const restraint = makeRestraintPolicy(config);

describe("determinism (pure, seeded engine)", () => {
  it("produces identical runs from the same seed", () => {
    const a = runFull(config, restoration, 424242);
    const b = runFull(config, restoration, 424242);
    expect(a.outcome).toBe(b.outcome);
    expect(a.turn).toBe(b.turn);
    expect(a.money).toBeCloseTo(b.money, 10);
    expect(a.footing).toBeCloseTo(b.footing, 10);
  });

  it("step does not mutate the input state", () => {
    const s0 = initState(config, 7);
    const before = JSON.stringify(s0);
    step(s0, restoration(s0), config);
    expect(JSON.stringify(s0)).toBe(before);
  });
});

describe("outcome distribution (pillar 4: winnable but rare; pillar 5: stasis real)", () => {
  const rest = runCohort(config, restoration, SEEDS);

  it("escape is possible but rare (>0%, <15%)", () => {
    expect(rest.escapeRate).toBeGreaterThan(0);
    expect(rest.escapeRate).toBeLessThan(0.15);
  });

  it("stasis (trapped) is the common outcome, never auto-collapse", () => {
    expect(rest.trappedRate).toBeGreaterThan(0.5);
  });
});

describe("pillar 2: restraint loses (the core economic claim, asserted in CI)", () => {
  const rest = runCohort(config, restoration, SEEDS);
  const restr = runCohort(config, restraint, SEEDS);

  it("a max-restraint / never-buy-pleasure policy escapes less than a restoration policy", () => {
    // Skipping restoration to save money accelerates the capacity spiral, which
    // lowers yields and worsens events — costing more than it saves.
    expect(restr.escapeRate).toBeLessThan(rest.escapeRate);
  });

  it("restraint collapses far more often than restoration", () => {
    expect(restr.collapseRate).toBeGreaterThan(rest.collapseRate);
    expect(restr.collapseRate).toBeGreaterThan(0.5);
  });
});

describe("footing (§5.1): recovers after escape, but only after escape", () => {
  function meanFinalFooting(outcome: string): number {
    let sum = 0;
    let n = 0;
    for (const seed of SEEDS) {
      const r = runFull(config, restoration, seed);
      if ((r.outcome ?? "trapped") === outcome) {
        sum += r.footing;
        n += 1;
      }
    }
    return n > 0 ? sum / n : NaN;
  }

  it("escaped runs end with higher footing than trapped, which end higher than collapsed", () => {
    const escaped = meanFinalFooting("escaped");
    const trapped = meanFinalFooting("trapped");
    // Collapse via the restraint policy (the restoration policy rarely collapses).
    let cSum = 0;
    let cN = 0;
    for (const seed of SEEDS) {
      const r = runFull(config, restraint, seed);
      if (r.outcome === "collapsed") {
        cSum += r.footing;
        cN += 1;
      }
    }
    const collapsed = cSum / cN;

    expect(escaped).toBeGreaterThan(trapped);
    expect(trapped).toBeGreaterThan(collapsed);
  });

  it("escaped runs are lifting (the 'just beginning to lift' epitaph)", () => {
    let escaped = 0;
    let lifting = 0;
    for (const seed of SEEDS) {
      const r = runFull(config, restoration, seed);
      if (r.outcome === "escaped") {
        escaped += 1;
        if (footingShape(r) === "lifting") lifting += 1;
      }
    }
    expect(escaped).toBeGreaterThan(0);
    expect(lifting / escaped).toBeGreaterThan(0.8);
  });
});

describe("counterfactual fork (§6.3): same shock, opposite meaning", () => {
  it("both branches share event cards but resolve differently through state", () => {
    // Find a seed where docking the benefit flips at least one event from
    // absorbed to cascade on the *same* card — the absorption asymmetry.
    let foundAsymmetry = false;
    let sharedPreDecision = false;

    for (const seed of seedRange(1, 200)) {
      const fork = forkAtDecision(config, restoration, seed, 4, 60);
      const { approved, flagged, decisionTurn } = fork;

      // Turns before the decision are identical across branches.
      const preOk = approved.history
        .filter((r) => r.turn < decisionTurn)
        .every((r, i) => {
          const other = flagged.history[i];
          return other && r.money === other.money && r.capacity === other.capacity;
        });
      if (preOk && approved.history.length >= decisionTurn) sharedPreDecision = true;

      // After the dock, look for a turn where the same card is absorbed in one
      // branch and cascades (borrows) in the other.
      const upto = Math.min(approved.history.length, flagged.history.length);
      for (let i = decisionTurn; i < upto; i++) {
        const a = approved.history[i].event;
        const f = flagged.history[i].event;
        if (a && f && a.card.id === f.card.id && a.absorbed !== f.absorbed) {
          foundAsymmetry = true;
          break;
        }
      }
      if (foundAsymmetry && sharedPreDecision) break;
    }

    expect(sharedPreDecision).toBe(true);
    expect(foundAsymmetry).toBe(true);
  });

  it("forking is deterministic — the approved branch equals an un-docked run", () => {
    const fork = forkAtDecision(config, restoration, 99, 4, 60);
    const plain = runFull(config, restoration, 99);
    expect(fork.approved.outcome).toBe(plain.outcome);
    expect(fork.approved.money).toBeCloseTo(plain.money, 10);
  });
});

describe("terminal conditions (§5.5)", () => {
  it("a run always terminates in one of the three outcomes", () => {
    for (const seed of seedRange(1, 300)) {
      const r = runFull(config, restoration, seed);
      expect(["escaped", "collapsed", "trapped"]).toContain(r.outcome);
      expect(r.turn).toBeLessThanOrEqual(config.turnCeiling);
    }
  });

  it("escape requires reaching the top Maslow tier", () => {
    for (const seed of SEEDS) {
      const r = runFull(config, restoration, seed);
      if (r.outcome === "escaped") {
        expect(r.tier).toBe(maxTier(config));
        expect(r.money).toBeGreaterThanOrEqual(config.escapeReserve);
      }
    }
  });
});

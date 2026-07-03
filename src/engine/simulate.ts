// Run orchestration: full runs, cohort monte-carlo (tuning + CI), and the
// counterfactual fork (§6.3) that shows both branches of a stamped decision.

import { type Config, maxTier } from "./config.ts";
import { initState, step } from "./engine.ts";
import type { OutcomeKind, Policy, RunState } from "./types.ts";

/** An injected mid-run modifier — e.g. a benefit dock from a flag (§6.3). */
export interface RunModifier {
  atTurn: number;
  moneyDelta: number; // negative = benefit docked
}

/** Play a full run under a policy until it terminates. */
export function runFull(
  config: Config,
  policy: Policy,
  seed: number,
  modifier?: RunModifier,
): RunState {
  let state = initState(config, seed);
  const safetyCap = config.turnCeiling + 5;
  while (state.outcome === null && state.turn < safetyCap) {
    const alloc = policy(state);
    state = step(state, alloc, config);
    if (modifier && state.turn === modifier.atTurn && state.outcome === null) {
      // Apply the dock after the turn resolves, before the next allocation.
      state = { ...state, money: state.money + modifier.moneyDelta };
    }
  }
  // If the safety cap hit without a terminal condition, it is stasis.
  if (state.outcome === null) state = { ...state, outcome: "trapped" };
  return state;
}

export interface CohortResult {
  n: number;
  escaped: number;
  collapsed: number;
  trapped: number;
  escapeRate: number;
  collapseRate: number;
  trappedRate: number;
}

/** Run a policy across many seeds and tally the outcome distribution (§5.7). */
export function runCohort(
  config: Config,
  policy: Policy,
  seeds: number[],
): CohortResult {
  const counts: Record<OutcomeKind, number> = {
    escaped: 0,
    collapsed: 0,
    trapped: 0,
  };
  for (const seed of seeds) {
    const r = runFull(config, policy, seed);
    counts[r.outcome ?? "trapped"] += 1;
  }
  const n = seeds.length;
  return {
    n,
    escaped: counts.escaped,
    collapsed: counts.collapsed,
    trapped: counts.trapped,
    escapeRate: counts.escaped / n,
    collapseRate: counts.collapsed / n,
    trappedRate: counts.trapped / n,
  };
}

/** Deterministic seed list for reproducible cohorts. */
export function seedRange(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

export interface Fork {
  decisionTurn: number;
  dockAmount: number;
  approved: RunState; // branch if the line was approved (no dock)
  flagged: RunState; // branch as played (benefit docked)
}

/**
 * Fork a run at a decision point (§6.3). Both branches share the run seed, so
 * they see identical event cards on every turn and diverge *only* through the
 * docked money — the absorption asymmetry made visible on every resolution.
 */
export function forkAtDecision(
  config: Config,
  policy: Policy,
  seed: number,
  decisionTurn: number,
  dockAmount: number,
): Fork {
  const approved = runFull(config, policy, seed);
  const flagged = runFull(config, policy, seed, {
    atTurn: decisionTurn,
    moneyDelta: -dockAmount,
  });
  return { decisionTurn, dockAmount, approved, flagged };
}

/**
 * The footing-shape epitaph (§5.5): is footing lifting, stabilized, or in
 * freefall at the end? Measured over a wide window so single-turn event noise
 * doesn't flip the label — footing is a slow signal and should be read slowly.
 */
export function footingShape(state: RunState): "lifting" | "stabilized" | "freefall" {
  const h = state.history;
  if (h.length < 4) return "stabilized";
  const window = Math.min(7, h.length - 1);
  const slope = h[h.length - 1].footing - h[h.length - 1 - window].footing;
  if (slope > 2) return "lifting";
  if (slope < -2) return "freefall";
  return "stabilized";
}

export { maxTier };

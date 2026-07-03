// The KPI layer (§6.2) — held completely straight (pillar 6). Flagging pays:
// streak bonuses, speed bonuses, accuracy against the institution's rubric.
// Approving what the rubric wanted flagged accrues AUDIT RISK — the pressure is
// asymmetric by design, because that is true of the real institution. There is
// no wink anywhere in here; the score is sincere, and that is the point.

import type { Counterfactual } from "./counterfactual.ts";
import type { RubricVerdict } from "./cases.ts";

export interface KpiState {
  score: number;
  flagStreak: number;
  bestStreak: number;
  flags: number;
  approves: number;
  accurateStamps: number; // stamps matching the rubric
  totalStamps: number;
  auditRisk: number;
  casesResolved: number;
}

export function initKpi(): KpiState {
  return {
    score: 0,
    flagStreak: 0,
    bestStreak: 0,
    flags: 0,
    approves: 0,
    accurateStamps: 0,
    totalStamps: 0,
    auditRisk: 0,
    casesResolved: 0,
  };
}

export interface StampScore {
  points: number;
  streakBonus: number;
  speedBonus: number;
}

/**
 * Apply one stamp to the KPI (mutates + returns the breakdown for the juice).
 * `timeLeftFrac` in [0,1] feeds the speed bonus.
 */
export function applyStamp(
  kpi: KpiState,
  stamp: RubricVerdict,
  rubric: RubricVerdict,
  timeLeftFrac: number,
): StampScore {
  kpi.totalStamps += 1;
  if (stamp === rubric) kpi.accurateStamps += 1;

  const speedBonus = Math.round(Math.max(0, timeLeftFrac) * 60);
  let points: number;
  let streakBonus = 0;

  if (stamp === "flag") {
    kpi.flags += 1;
    kpi.flagStreak += 1;
    kpi.bestStreak = Math.max(kpi.bestStreak, kpi.flagStreak);
    streakBonus = (kpi.flagStreak - 1) * 25;
    points = 100 + streakBonus + speedBonus;
  } else {
    kpi.approves += 1;
    kpi.flagStreak = 0;
    points = 40 + speedBonus;
    // Approving a line the rubric wanted flagged is where audit risk accrues.
    if (rubric === "flag") kpi.auditRisk += 9;
  }

  kpi.score += points;
  return { points, streakBonus, speedBonus };
}

export function flagRate(kpi: KpiState): number {
  return kpi.totalStamps === 0 ? 0 : kpi.flags / kpi.totalStamps;
}

export function accuracy(kpi: KpiState): number {
  return kpi.totalStamps === 0 ? 1 : kpi.accurateStamps / kpi.totalStamps;
}

/** Everything Act 2 needs from Act 1 (the clerk reads the flag rate + policy). */
export interface Act1Result {
  kpi: KpiState;
  flagRate: number;
  counterfactuals: Counterfactual[];
}

// The KPI layer (§6.2, §4) — held completely straight (pillar 6). The desk pays
// you for determinations, and flagging still pays the most (streak bonuses) — the
// seduction is intact. But the honest signals are ALIGNMENT (how well each
// verdict matched what the institution's rubric expected) and AUDIT RISK (which
// rises when you wave through what the rubric wanted flagged). Over-flagging
// tanks alignment; under-calling expected-flags accrues audit risk. The score
// climbs either way — the gap between the score and the rating is the point.

/** The three-way determination the whole act speaks in (§4). */
export type Verdict = "approve" | "warn" | "flag";

// Verdicts live on an ordinal scale so "distance" measures how wrong a call was:
// off-by-one (approve↔warn, warn↔flag) is a near miss; opposite (approve↔flag)
// is the worst. Alignment credit falls off with distance.
const ORDER: Record<Verdict, number> = { approve: 0, warn: 1, flag: 2 };
const ALIGN_WEIGHT = [1, 0.4, 0]; // credit by |distance|: exact, off-by-one, opposite

// Audit risk accrues only on UNDER-calling an expected-flag: approving one is the
// worst (you waved it through); warning it is a smaller accrual (§4).
const AUDIT_APPROVE_FLAG = 12;
const AUDIT_WARN_FLAG = 6;

/** The audit line the desk fires an event on when a stamp crosses it (§5). Tunable. */
export const AUDIT_THRESHOLD = 24;

export interface KpiState {
  score: number;
  flagStreak: number;
  bestStreak: number;
  flags: number;
  warns: number;
  approves: number;
  totalStamps: number;
  auditRisk: number;
  casesResolved: number;
  // alignment accumulators — accrued credit over max possible (one per stamp)
  alignAccrued: number;
  alignPossible: number;
}

export function initKpi(): KpiState {
  return {
    score: 0,
    flagStreak: 0,
    bestStreak: 0,
    flags: 0,
    warns: 0,
    approves: 0,
    totalStamps: 0,
    auditRisk: 0,
    casesResolved: 0,
    alignAccrued: 0,
    alignPossible: 0,
  };
}

export interface StampScore {
  points: number;
  streakBonus: number;
  speedBonus: number;
  alignDelta: number; // alignment credit earned by this stamp (0..1)
  distance: number; // |stamp − expected| on the verdict scale
  auditDelta: number; // audit risk accrued by this stamp
  crossedAudit: boolean; // this stamp pushed audit risk over the threshold
}

/**
 * Apply one determination to the KPI (mutates + returns the breakdown for the
 * desk's per-decision feedback). `expected` is the rubric's contextual verdict;
 * `timeLeftFrac` in [0,1] feeds the speed bonus.
 */
export function applyStamp(
  kpi: KpiState,
  stamp: Verdict,
  expected: Verdict,
  timeLeftFrac: number,
): StampScore {
  kpi.totalStamps += 1;

  const distance = Math.abs(ORDER[stamp] - ORDER[expected]);
  const alignDelta = ALIGN_WEIGHT[distance];
  kpi.alignAccrued += alignDelta;
  kpi.alignPossible += 1;

  const speedBonus = Math.round(Math.max(0, timeLeftFrac) * 60);
  let points: number;
  let streakBonus = 0;

  if (stamp === "flag") {
    kpi.flags += 1;
    kpi.flagStreak += 1;
    kpi.bestStreak = Math.max(kpi.bestStreak, kpi.flagStreak);
    streakBonus = (kpi.flagStreak - 1) * 25;
    points = 100 + streakBonus + speedBonus;
  } else if (stamp === "warn") {
    kpi.warns += 1;
    kpi.flagStreak = 0;
    points = 70 + speedBonus;
  } else {
    kpi.approves += 1;
    kpi.flagStreak = 0;
    points = 40 + speedBonus;
  }

  // Audit risk: under-calling an item the rubric wanted flagged (§4).
  const before = kpi.auditRisk;
  let auditDelta = 0;
  if (expected === "flag") {
    if (stamp === "approve") auditDelta = AUDIT_APPROVE_FLAG;
    else if (stamp === "warn") auditDelta = AUDIT_WARN_FLAG;
  }
  kpi.auditRisk += auditDelta;
  const crossedAudit = crossesAudit(before, kpi.auditRisk);

  kpi.score += points;
  return { points, streakBonus, speedBonus, alignDelta, distance, auditDelta, crossedAudit };
}

/** Alignment ∈ [0,1]: accrued credit over the max possible (§4). Empty → 1. */
export function alignment(kpi: KpiState): number {
  return kpi.alignPossible === 0 ? 1 : kpi.alignAccrued / kpi.alignPossible;
}

/** Did audit risk just cross the threshold (was below, now at/over)? (§5) */
export function crossesAudit(before: number, after: number): boolean {
  return before < AUDIT_THRESHOLD && after >= AUDIT_THRESHOLD;
}

/** Flag rate — warns count as non-flags (load-bearing: Act 2 reads this). */
export function flagRate(kpi: KpiState): number {
  return kpi.totalStamps === 0 ? 0 : kpi.flags / kpi.totalStamps;
}

export interface Rating {
  stars: number; // 1..5, the single legible quality signal
  blurb: string;
}

// A brisk desk averages this many points per stamp; at or above it, the pace
// term of the rating maxes out. Pace is worth at most one star — alignment sets
// the base, so a streak-inflated score cannot rescue a misaligned shift.
const PACE_PAR = 120;

/**
 * Rating = f(score, alignment, audit standing) (§4). Alignment carries four of
 * the five stars; score enters only as pace (points per stamp, worth the fifth)
 * so flagging everything piles up score but still wrecks the rating. An audited
 * shift is docked two stars — the supervisor's penalty made legible.
 */
export function rating(kpi: KpiState): Rating {
  const align = alignment(kpi);
  const pace = kpi.totalStamps === 0 ? 0 : Math.min(1, kpi.score / (kpi.totalStamps * PACE_PAR));
  const audited = kpi.auditRisk >= AUDIT_THRESHOLD;
  let stars = Math.min(5, Math.max(1, Math.round(align * 4 + pace)));
  if (audited) stars = Math.max(1, stars - 2);

  const blurb = audited
    ? "Determinations under audit review. Standing provisional."
    : align >= 0.85
      ? "Exemplary alignment with division standards."
      : align >= 0.6
        ? "Solid work. A few determinations off-standard."
        : "Determinations frequently diverged from the rubric.";
  return { stars, blurb };
}

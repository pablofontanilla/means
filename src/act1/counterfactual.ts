// The counterfactual ledger (§6.3) — the core mechanic. Every stamped decision,
// once resolved by the sim, writes BOTH branches. For a load-bearing line this
// is the engine's absorption asymmetry made visible: fork the run at the line's
// turn (shared RNG streams) and describe how the docked branch cascades while
// the approved branch absorbs. For a fraud line the sim vindicates the flag.

import { type Config, DEFAULT_CONFIG } from "../engine/config.ts";
import { forkAtDecision } from "../engine/simulate.ts";
import { makeRestorationPolicy } from "../engine/policies.ts";
import type { RunState } from "../engine/types.ts";
import type { BuiltCase, CaseLine, RubricVerdict } from "./cases.ts";

export interface Counterfactual {
  lineId: string;
  caseId: string;
  caseName: string;
  label: string;
  amount: number;
  stamp: RubricVerdict;
  docked: number;
  asPlayed: string; // the branch the player's stamp produced
  alternative: string; // the branch they didn't take
  flagCorrect: boolean | null; // fraud → true, trap → false, non-consequential → null
  headline: string; // one-liner for the drawer list
}

const ABSORBED = "Absorbed. No downstream events.";

/**
 * Find and describe the divergence (§6.3): the first turn after the decision
 * where the *same* shock the approved branch absorbs cascades in the docked
 * branch — "same shock, opposite meaning." Falls back to any late cascade, then
 * to a truthful "held this period" when the dock genuinely didn't bite.
 */
function describeDamage(
  approved: RunState,
  flagged: RunState,
  fromTurn: number,
  config: Config,
): string {
  const pct = Math.round(config.borrowInterest * 100);
  const upto = Math.min(approved.history.length, flagged.history.length);
  for (let i = 0; i < upto; i++) {
    const a = approved.history[i];
    const f = flagged.history[i];
    if (a.turn <= fromTurn) continue;
    const sameCard = a.event && f.event && a.event.card.id === f.event.card.id;
    if (sameCard && a.event!.absorbed && !f.event!.absorbed) {
      const belowThreshold = f.capacity < config.desperationThreshold;
      const shock = Math.round(f.event!.card.moneyHit);
      const parts = [
        `Week ${f.turn} — ${f.event!.card.label} ($${shock}). Approved: absorbed. Docked: no buffer left —`,
      ];
      parts.push(belowThreshold ? `capacity below threshold, emergency loan at ${pct}%.` : `emergency loan at ${pct}%.`);
      if (flagged.outcome === "collapsed" && approved.outcome !== "collapsed") {
        parts.push("Case escalated to crisis table — collapse.");
      }
      return parts.join(" ");
    }
  }
  if (flagged.outcome === "collapsed" && approved.outcome !== "collapsed") {
    return `Capacity spiral the approved branch never hit. Collapsed by week ${flagged.turn}.`;
  }
  return "Tighter margins, but held this period.";
}

/** Resolve one stamped line into a both-branches archive entry. */
export function resolveLine(
  builtCase: BuiltCase,
  line: CaseLine,
  stamp: RubricVerdict,
  config: Config = DEFAULT_CONFIG,
): Counterfactual {
  const base = {
    lineId: line.lineId,
    caseId: builtCase.id,
    caseName: builtCase.name,
    label: line.label,
    amount: line.amount,
    stamp,
    docked: stamp === "flag" ? line.dockAmount : 0,
  };

  if (line.truth === "fraud") {
    const flagged = stamp === "flag";
    return {
      ...base,
      asPlayed: flagged
        ? "Resale detected, week 2. No capacity impact. Flag correct."
        : "Approved. Resale detected, week 2 — the flag would have been correct.",
      alternative: flagged
        ? "If approved: undetected resale, no benefit impact."
        : "If flagged: resale caught, benefit docked correctly.",
      flagCorrect: true,
      headline: flagged
        ? `${line.label}: flag vindicated (resale).`
        : `${line.label}: missed fraud — approved.`,
    };
  }

  // Load-bearing: fork the run at this line's turn (same shocks, opposite meaning).
  const policy = makeRestorationPolicy(config);
  const fork = forkAtDecision(config, policy, builtCase.seed, line.decisionTurn, line.dockAmount);
  const cascade = describeDamage(fork.approved, fork.flagged, line.decisionTurn, config);
  const flagged = stamp === "flag";

  return {
    ...base,
    asPlayed: flagged ? cascade : ABSORBED,
    alternative: flagged ? ABSORBED : cascade,
    flagCorrect: false,
    headline: flagged
      ? `${line.label}: flagged — ${fork.flagged.outcome === "collapsed" ? "cascade to collapse." : "downstream cascade."}`
      : `${line.label}: approved — absorbed.`,
  };
}

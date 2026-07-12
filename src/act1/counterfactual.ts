// The counterfactual ledger (§6.3, §6) — the core mechanic. Every determination,
// once resolved by the sim, writes BOTH branches. For a load-bearing item this
// is the engine's absorption asymmetry made visible: fork the run at the item's
// turn (shared RNG streams) and describe how the docked branch cascades while
// the approved branch absorbs. A flag docks the item's full amount; a warn docks
// half — the partial dock the institution calls leniency. For the one
// fraud-natured item the sim vindicates the flag.

import { type Config, DEFAULT_CONFIG } from "../engine/config.ts";
import { forkAtDecision } from "../engine/simulate.ts";
import { makeRestorationPolicy } from "../engine/policies.ts";
import type { RunState } from "../engine/types.ts";
import type { BuiltCase, ReviewItem } from "./cases.ts";
import type { Verdict } from "./kpi.ts";

export interface Counterfactual {
  itemId: string;
  caseId: string;
  caseName: string;
  label: string;
  spend: number;
  stamp: Verdict;
  docked: number;
  asPlayed: string; // the branch the player's determination produced
  alternative: string; // the branch they didn't take
  altPole: "approve" | "flag"; // which pole `alternative` describes (§6.3)
  flagCorrect: boolean | null; // fraud → true, docked trap → false, no dock → null
  headline: string; // one-liner for the drawer list
}

const ABSORBED = "Absorbed. No downstream events.";

/** The dock a given verdict imposes on an item (§6): flag = full, warn = half. */
export function dockFor(item: ReviewItem, verdict: Verdict): number {
  if (verdict === "flag") return item.dockAmount;
  if (verdict === "warn") return Math.round(item.dockAmount / 2);
  return 0;
}

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

/** Resolve one determination into a both-branches archive entry. */
export function resolveItem(
  builtCase: BuiltCase,
  item: ReviewItem,
  stamp: Verdict,
  config: Config = DEFAULT_CONFIG,
): Counterfactual {
  const docked = dockFor(item, stamp);
  const base = {
    itemId: item.itemId,
    caseId: builtCase.id,
    caseName: builtCase.name,
    label: item.label,
    spend: item.spend,
    stamp,
    docked,
  };

  if (item.truth === "fraud") {
    // The vindicated path (pillar 8): the sim confirms the resale, so severity
    // was warranted — the honest deck that keeps the archive from reading rigged.
    const wk = item.decisionTurn;
    const texts: Record<Verdict, { asPlayed: string; alternative: string; headline: string }> = {
      flag: {
        asPlayed: `Resale detected, week ${wk}. Recovery correct — no hardship caused.`,
        alternative: "If approved: undetected resale, no benefit impact.",
        headline: `${item.label}: flag vindicated (resale).`,
      },
      warn: {
        asPlayed: `Partial dock. Resale detected, week ${wk} — a full flag was warranted.`,
        alternative: "If flagged: full recovery, correctly.",
        headline: `${item.label}: under-called — resale confirmed.`,
      },
      approve: {
        asPlayed: `Approved. Resale detected, week ${wk} — the flag would have been correct.`,
        alternative: "If flagged: resale caught, benefit docked correctly.",
        headline: `${item.label}: missed fraud — approved.`,
      },
    };
    // For fraud, only the flag's alternative is the approve pole: the warn was
    // an under-call, so the branch worth showing is the full flag (§6.3).
    return { ...base, ...texts[stamp], altPole: stamp === "flag" ? "approve" : "flag", flagCorrect: true };
  }

  // Load-bearing: fork the run at this item's turn (same shocks, opposite
  // meaning). The played branch carries the played dock; the alternative is the
  // opposite pole — full severity if approved, clean approval otherwise.
  const policy = makeRestorationPolicy(config);
  const fullFork = forkAtDecision(config, policy, builtCase.seed, item.decisionTurn, item.dockAmount);
  const fullDamage = describeDamage(fullFork.approved, fullFork.flagged, item.decisionTurn, config);
  let asPlayed: string;
  if (docked === 0) {
    asPlayed = ABSORBED;
  } else if (docked === item.dockAmount) {
    asPlayed = fullDamage;
  } else {
    const partial = forkAtDecision(config, policy, builtCase.seed, item.decisionTurn, docked);
    asPlayed = describeDamage(partial.approved, partial.flagged, item.decisionTurn, config);
  }
  const alternative = stamp === "approve" ? fullDamage : ABSORBED;

  const headline =
    stamp === "approve"
      ? `${item.label}: approved — absorbed.`
      : stamp === "warn"
        ? `${item.label}: warned — $${docked} docked.`
        : `${item.label}: flagged — ${fullFork.flagged.outcome === "collapsed" ? "cascade to collapse." : "downstream cascade."}`;

  return {
    ...base,
    asPlayed,
    alternative,
    altPole: stamp === "approve" ? "flag" : "approve",
    flagCorrect: docked > 0 ? false : null,
    headline,
  };
}

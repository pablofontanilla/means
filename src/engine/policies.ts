// Authored policies drive a run headlessly — for monte-carlo tuning, for the
// pillar-2 CI assertion, and for generating Act 1 case ledgers. Act 2 replaces
// the policy with live UI allocation.

import { type Config, maxTier } from "./config.ts";
import type { Allocation, Policy, RunState } from "./types.ts";

/**
 * The economically literate policy: spend on restoration to keep capacity (and
 * thus yield) up, rest when depleted, bank toward tier moves. This is the
 * "buy the pleasure to keep the engine running" play (pillar 2).
 */
export function makeRestorationPolicy(config: Config): Policy {
  return (s: RunState): Allocation => {
    const slots = config.timeSlotsPerTurn;
    // Balance work against the capacity spiral: push when there's headroom,
    // rest when depleted. Working every slot craters capacity into desperation.
    let restSlots: number;
    if (s.capacity > 72) restSlots = 0;
    else if (s.capacity > 34) restSlots = 1;
    else restSlots = 2;
    const workSlots = slots - restSlots;
    const restorationUnits = s.capacity < 55 ? 3 : s.capacity < 78 ? 2 : 1;
    const attemptTierMove = affordTierMove(s, config, 20);
    return { workSlots, restSlots, restorationUnits, attemptTierMove };
  };
}

/**
 * The folk-theory policy: "show restraint, skip small pleasures." Max work,
 * never rest, never buy restoration, hoard every dollar toward escape. The
 * engine must make this LOSE more often than the restoration policy (pillar 2),
 * because the capacity spiral costs more than the restraint saves.
 */
export function makeRestraintPolicy(config: Config): Policy {
  return (s: RunState): Allocation => ({
    workSlots: config.timeSlotsPerTurn,
    restSlots: 0,
    restorationUnits: 0,
    attemptTierMove: affordTierMove(s, config, 8),
  });
}

/** Can we pay the next tier move and still keep `buffer` in hand? */
function affordTierMove(s: RunState, config: Config, buffer: number): boolean {
  if (s.tier >= maxTier(config)) return false;
  const cost = config.tiers[s.tier + 1].moveCost;
  return s.money >= cost + buffer;
}

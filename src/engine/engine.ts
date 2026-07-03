// The pure engine (§5). `step(state, allocation, config)` advances one turn and
// returns a new state — no mutation, no DOM, no globals. All randomness comes
// from the per-turn stream (rng.ts) so runs are reproducible and forkable.

import { type Config, maxTier } from "./config.ts";
import { DESPERATION_DECK, NORMAL_DECK } from "./events.ts";
import { turnRng } from "./rng.ts";
import type {
  Allocation,
  EventResolution,
  OutcomeKind,
  RunState,
  SpendRecord,
  TurnRecord,
} from "./types.ts";

export function initState(config: Config, seed: number): RunState {
  return {
    seed,
    turn: 0,
    capacity: config.capacityStart,
    footing: config.footingStart,
    money: config.moneyStart,
    debt: 0,
    tier: 0,
    missedShiftNext: false,
    outcome: null,
    history: [],
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Yield multiplier from capacity: full at MAX, `yieldFloor` at zero (§5.1). */
function yieldFactor(capacity: number, config: Config): number {
  const f = capacity / config.capacityMax;
  return config.yieldFloor + (1 - config.yieldFloor) * clamp(f, 0, 1);
}

/**
 * The footing input (§5.1): the *trend* of capacity plus the Maslow tier, not
 * the instantaneous capacity level. Sustained decline drags footing down even
 * when a pleasure purchase briefly props the level; a tier lift flips it.
 */
function footingInput(deltaCapacity: number, tier: number, config: Config): number {
  const raw =
    config.footingBase +
    config.footingDeltaScale * deltaCapacity +
    config.footingTierScale * tier;
  return clamp(raw, 0, 100);
}

/**
 * Advance one turn. Order (§5.2): resolve work → rest/restoration → upkeep →
 * structural drain → tier move → draw & resolve event against current buffer →
 * update meters → check terminal conditions.
 */
export function step(prev: RunState, alloc: Allocation, config: Config): RunState {
  if (prev.outcome !== null) return prev;

  const turn = prev.turn + 1;
  const rng = turnRng(prev.seed, turn);
  const capBefore = prev.capacity;

  let capacity = prev.capacity;
  let money = prev.money;
  let debt = prev.debt;
  let tier = prev.tier;

  const spend: SpendRecord = {
    earned: 0,
    rent: 0,
    restorationCost: 0,
    restorationUnits: 0,
    tierMoveCost: 0,
    interestPaid: 0,
  };

  // 1. Work. A forced missed shift (from a prior cascade) kills one work slot.
  let workSlots = alloc.workSlots;
  if (prev.missedShiftNext && workSlots > 0) workSlots -= 1;
  const earned = workSlots * config.shiftYield * yieldFactor(capacity, config);
  spend.earned = earned;
  money += earned;
  capacity -= workSlots * config.shiftFatigue;

  // 2. Rest + restoration (the "temptation goods" that keep the engine on).
  capacity += alloc.restSlots * config.restPerSlot;
  const units = clamp(alloc.restorationUnits, 0, config.maxRestorationUnits);
  spend.restorationUnits = units;
  spend.restorationCost = units * config.restorationCost;
  money -= spend.restorationCost;
  capacity += units * config.restorationCapacity;

  // 3. Upkeep (rent) + structural drain — the drain is the trap.
  spend.rent = config.tiers[tier].rent;
  money -= spend.rent;
  capacity -= config.tiers[tier].drain;

  // 4. Tier move (§10.3): deterministic if affordable; RNG gate is the shocks.
  if (alloc.attemptTierMove && tier < maxTier(config)) {
    const cost = config.tiers[tier + 1].moveCost;
    if (money >= cost) {
      money -= cost;
      spend.tierMoveCost = cost;
      tier += 1;
    }
  }

  // 5. Draw and resolve an event against the *current* buffer (§5.3).
  const event = resolveEvent(rng, capacity, money, config);
  let missedShiftNext = false;
  if (event) {
    money -= event.moneyHit;
    if (!event.absorbed) {
      money -= event.borrowed; // pay the shortfall now...
      debt += event.borrowed * (1 + config.borrowInterest); // ...owe it back with interest
      spend.interestPaid = event.borrowed * config.borrowInterest;
      capacity -= event.capacityHit;
      missedShiftNext = event.missedShift;
    }
  }

  capacity = clamp(capacity, 0, config.capacityMax);

  // 6. Footing — leaky integrator on the capacity trend + tier (§5.1).
  const deltaCapacity = capacity - capBefore;
  const input = footingInput(deltaCapacity, tier, config);
  const footing = prev.footing + config.footingAlpha * (input - prev.footing);

  // 7. Terminal checks (§5.5).
  let outcome: OutcomeKind | null = prev.outcome;
  if (capacity <= 0) {
    outcome = "collapsed";
  } else if (tier >= maxTier(config) && money >= config.escapeReserve) {
    outcome = "escaped";
  } else if (turn >= config.turnCeiling) {
    outcome = "trapped";
  }

  const record: TurnRecord = {
    turn,
    capacity,
    footing,
    money,
    tier,
    deltaCapacity,
    event,
    spend,
  };

  return {
    seed: prev.seed,
    turn,
    capacity,
    footing,
    money,
    debt,
    tier,
    missedShiftNext,
    outcome,
    history: [...prev.history, record],
  };
}

/**
 * Resolve a drawn event against the buffer. With slack (money ≥ hit) it is
 * absorbed and forgotten; without, it cascades into a forced high-interest
 * borrow, capacity stress, and possibly a missed shift (§5.3).
 */
function resolveEvent(
  rng: { next(): number; int(m: number): number; bool(p: number): boolean },
  capacity: number,
  money: number,
  config: Config,
): EventResolution | null {
  // Draw order is positionally fixed so forked branches stay aligned.
  const fires = rng.bool(config.eventBaseChance);
  const desperate = capacity < config.desperationThreshold;
  const deck = desperate ? DESPERATION_DECK : NORMAL_DECK;
  const idx = rng.int(deck.length);
  const missRoll = rng.bool(config.desperationMissShiftChance);
  if (!fires) return null;

  const card = deck[idx];
  const hit = card.moneyHit;

  // A windfall (negative hit) or a covered hit is absorbed.
  if (hit <= 0 || money >= hit) {
    return {
      card,
      moneyHit: hit,
      capacityHit: 0,
      absorbed: true,
      borrowed: 0,
      missedShift: false,
      fromDesperationTable: desperate,
    };
  }

  // Cascade: pay what the buffer covers, borrow the shortfall at interest.
  const shortfall = hit - Math.max(0, money);
  return {
    card,
    moneyHit: Math.max(0, money), // the buffer is spent...
    capacityHit: card.capacityHit,
    absorbed: false,
    borrowed: shortfall, // ...the rest is borrowed
    missedShift: desperate && missRoll,
    fromDesperationTable: desperate,
  };
}

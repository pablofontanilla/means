// EVERY tuning number lives here (§13.5). Nothing is hardcoded elsewhere in the
// engine. These are placeholder values, tuned via the sandbox monte-carlo — not
// authored to final quality (PoC scope). The sandbox binds sliders to a clone of
// this object; the tests assert the pillar constraints against it.

export interface TierConfig {
  name: string;
  rent: number; // mandatory money/turn at this tier
  drain: number; // structural capacity drain/turn (higher tier = less drain)
  moveCost: number; // lump money to move UP into this tier (0 for the base tier)
}

export interface Config {
  // meters
  capacityMax: number;
  capacityStart: number;
  footingStart: number;
  moneyStart: number;
  turnCeiling: number;

  // time / work (§10.1)
  timeSlotsPerTurn: number;
  shiftYield: number; // money per work slot at full capacity
  shiftFatigue: number; // capacity drained per work slot
  restPerSlot: number; // capacity restored per rest slot
  yieldFloor: number; // yield multiplier at zero capacity (linear to 1 at max)

  // restoration / pleasure (§5.1, pillar 2)
  restorationCost: number; // money per restoration unit
  restorationCapacity: number; // capacity restored per unit
  maxRestorationUnits: number; // cap per turn

  // capacity dynamics
  desperationThreshold: number; // capacity below this → desperation table (§5.3)

  // Maslow tiers (§10.3) — index 0 is the base tier
  tiers: TierConfig[];

  // footing leaky integrator (§5.1)
  footingAlpha: number; // small α = long memory = slow
  footingBase: number; // input floor: footing drifts toward this at the base tier
  footingDeltaScale: number; // weight of Δcapacity in the footing input
  footingTierScale: number; // weight of tier in the footing input

  // events (§5.3)
  eventBaseChance: number; // chance an event fires on a turn
  borrowInterest: number; // fraction added to a forced borrow (e.g. 0.31 = 31%)
  desperationMissShiftChance: number; // cascade → forced missed shift next turn

  // escape (§5.4) — structural line: reach the top tier AND hold a buffer
  escapeReserve: number; // money buffer required at max tier to escape
}

export const DEFAULT_CONFIG: Config = {
  capacityMax: 100,
  capacityStart: 62,
  footingStart: 45,
  moneyStart: 55,
  turnCeiling: 30,

  timeSlotsPerTurn: 3,
  shiftYield: 31,
  shiftFatigue: 8,
  restPerSlot: 13,
  yieldFloor: 0.35,

  restorationCost: 7,
  restorationCapacity: 10,
  maxRestorationUnits: 4,

  desperationThreshold: 28,

  tiers: [
    // Higher tiers drain less capacity but cost more to hold — climbing barely
    // outruns its own upkeep, which is the trap (§5.1).
    { name: "Precarious", rent: 20, drain: 7, moveCost: 0 },
    { name: "Stable-ish", rent: 31, drain: 4, moveCost: 190 },
    { name: "Secure", rent: 44, drain: 2, moveCost: 250 },
  ],

  footingAlpha: 0.11,
  footingBase: 22, // input floor: at the base tier, footing drifts down toward this
  footingDeltaScale: 0.8, // Δcapacity is secondary flavor; tier is the real driver
  // Per-tier input = base + tierScale*tier: tier0=22, tier1=38, tier2=54.
  // Only the top tier lifts footing above the start (45) — recovery iff escape.
  footingTierScale: 16,

  eventBaseChance: 0.62,
  borrowInterest: 0.31,
  desperationMissShiftChance: 0.5,

  escapeReserve: 90,
};

export function cloneConfig(c: Config): Config {
  return { ...c, tiers: c.tiers.map((t) => ({ ...t })) };
}

export const maxTier = (c: Config): number => c.tiers.length - 1;

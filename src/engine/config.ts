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
  shiftYield: number; // money per regular work slot at full capacity
  shiftFatigue: number; // capacity drained per regular work slot
  overtimeYield: number; // money per overtime slot at full capacity (> shiftYield)
  overtimeFatigue: number; // capacity drained per overtime slot (> shiftFatigue)
  restPerSlot: number; // capacity restored per rest slot
  yieldFloor: number; // yield multiplier at zero capacity (linear to 1 at max)

  // appointments / required errands (§10.1) — some weeks carry an upkeep
  // obligation (benefits review, childcare) that eats a slot without pay.
  appointmentChance: number; // chance a turn requires an appointment
  errandPenalty: number; // capacity docked when a required appointment goes uncovered

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

  // Act 2 clerk (§7.5) — flavor only: reviews every N turns and docks a modest
  // amount per flagged purchase, scaled by the player's own Act 1 flag rate.
  clerkInterval: number;
  clerkDockPerFlag: number;
}

export const DEFAULT_CONFIG: Config = {
  capacityMax: 100,
  capacityStart: 82, // a deeper buffer so decline is a slow strangle, not a 3-week death
  footingStart: 45,
  moneyStart: 45,
  turnCeiling: 40, // ~40 weeks: enough rope for the strangle to play out

  timeSlotsPerTurn: 6,
  shiftYield: 13.5, // tight margins over rent — banking toward escape is slow
  shiftFatigue: 0.4, // gentle per-slot fatigue so working many slots bleeds slowly
  overtimeYield: 21.5, // higher yield than a regular shift...
  overtimeFatigue: 0.9, // ...at a steeper capacity cost
  restPerSlot: 7,
  yieldFloor: 0.35,

  // Appointments: ~1 turn in 3 carries a required upkeep obligation.
  appointmentChance: 0.34,
  errandPenalty: 5, // capacity docked for an uncovered required appointment

  restorationCost: 7,
  restorationCapacity: 6,
  maxRestorationUnits: 4,

  desperationThreshold: 24,

  tiers: [
    // Higher tiers drain less capacity but cost more to hold — climbing barely
    // outruns its own upkeep, which is the trap (§5.1). The drains are gentle so
    // decline is a slow strangle over many weeks, not a 3-week game-over.
    { name: "Precarious", rent: 20, drain: 2, moveCost: 0 },
    { name: "Stable-ish", rent: 31, drain: 1, moveCost: 200 },
    { name: "Secure", rent: 44, drain: 1, moveCost: 300 },
  ],

  footingAlpha: 0.16, // memory long enough to read the trend, short enough to lift on escape
  footingBase: 22, // input floor: at the base tier, footing drifts down toward this
  footingDeltaScale: 0.8, // Δcapacity is secondary flavor; tier is the real driver
  // Per-tier input = base + tierScale*tier: tier0=22, tier1=48, tier2=74.
  // Only the top tier lifts footing well above the start (45) — recovery iff escape.
  footingTierScale: 26,

  eventBaseChance: 0.55,
  borrowInterest: 0.31,
  desperationMissShiftChance: 0.3,

  escapeReserve: 55, // buffer to hold at the top tier to cross the structural line

  // Re-tuned for the ~40-week horizon: reviews every 6 weeks (~6 per run) land
  // regularly without being constant; $6/flag keeps the worst-case dock in the
  // tens — a sting against tight weekly margins, never the difficulty driver
  // (§11.3, flavor only).
  clerkInterval: 6,
  clerkDockPerFlag: 6,
};

export function cloneConfig(c: Config): Config {
  return { ...c, tiers: c.tiers.map((t) => ({ ...t })) };
}

export const maxTier = (c: Config): number => c.tiers.length - 1;

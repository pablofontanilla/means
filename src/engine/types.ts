// Core engine types (§5). The engine is a pure, deterministic, seeded
// simulation of one person in the poverty trap. No DOM dependency lives here.

export type TierIndex = number; // 0..maxTier

/** What the player (or an authored policy) commits for one turn (§5.2, §10.1). */
export interface Allocation {
  workSlots: number; // time slots spent working
  restSlots: number; // time slots spent resting
  restorationUnits: number; // small-pleasure / rest spend that restores capacity
  attemptTierMove: boolean; // spend a lump to attempt a Maslow tier move (§10.3)
}

export type OutcomeKind = "escaped" | "collapsed" | "trapped";

/** The full mutable state of one run. Treated immutably by `step`. */
export interface RunState {
  seed: number;
  turn: number;
  capacity: number; // fast meter — the throttle (§5.1)
  footing: number; // slow meter — the epitaph, leaky integrator (§5.1)
  money: number; // balance; the buffer that absorbs shocks (§5.3)
  debt: number; // outstanding forced-borrow principal
  tier: TierIndex; // Maslow tier (§10.3)
  missedShiftNext: boolean; // a cascade can force skipping the next shift
  outcome: OutcomeKind | null;
  history: TurnRecord[];
}

export interface SpendRecord {
  earned: number;
  rent: number;
  restorationCost: number;
  restorationUnits: number;
  tierMoveCost: number;
  interestPaid: number;
}

/** One resolved turn — the raw material for ledger rendering (§6.3, §13.1). */
export interface TurnRecord {
  turn: number;
  capacity: number;
  footing: number;
  money: number;
  tier: TierIndex;
  deltaCapacity: number;
  event: EventResolution | null;
  spend: SpendRecord;
}

export interface EventCard {
  id: string;
  label: string;
  moneyHit: number; // base magnitude as a money hit
  capacityHit: number; // extra capacity stress (applied on cascade)
  desperation: boolean; // only reachable from the desperation table (§5.3)
}

/**
 * The absorption asymmetry made computable (§5.3): the *same* card is a
 * rounding error with slack and a solvency event without it.
 */
export interface EventResolution {
  card: EventCard;
  moneyHit: number;
  capacityHit: number;
  absorbed: boolean; // buffer covered it — forgotten
  borrowed: number; // forced high-interest borrow principal added
  missedShift: boolean; // cascade forced a missed shift
  fromDesperationTable: boolean;
}

/** A policy drives a run headlessly (tuning, Act 1 case generation). */
export type Policy = (state: RunState) => Allocation;

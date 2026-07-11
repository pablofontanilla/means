// The contextual rubric (§2) — the skill the player learns. The institution's
// expected verdict on an item is not a fixed list; it is spend measured against
// an ALLOWANCE that the claimant's circumstances set. Dependents raise the bar,
// so the same $21 of dining is a flag for a single claimant, a warning for one
// with a child, and unremarkable for one with two. This is the single source of
// "what the institution expected," consumed by the KPI (alignment/audit) and by
// the desk's per-decision feedback.

import type { Verdict } from "./kpi.ts";
import type { BigTicketNature, Category, Circumstances } from "./cases.ts";

/** The reasonable discretionary ceiling per category, for one claimant (§1). */
export interface AllowanceProfile {
  Dining: number;
  Entertainment: number;
  Subscriptions: number;
}

// Base ceilings for a claimant with no dependents, and how much each dependent
// raises them. Dining moves the most (kids eat); subscriptions barely move.
const BASE: AllowanceProfile = { Dining: 12, Entertainment: 8, Subscriptions: 10 };
const DEP_BUMP: AllowanceProfile = { Dining: 8, Entertainment: 5, Subscriptions: 2 };

// The warn band: spend between the allowance and this multiple of it is a
// warning; beyond it is a flag.
const EXCESS_FACTOR = 1.5;

/** The bar for one item: at/under `allowance` approve, up to `excess` warn, over flag. */
export interface Bar {
  allowance: number;
  excess: number;
}

/** Derive the per-category allowance profile from circumstances (§1). */
export function deriveAllowance(circ: Circumstances): AllowanceProfile {
  const d = circ.dependents;
  return {
    Dining: BASE.Dining + d * DEP_BUMP.Dining,
    Entertainment: BASE.Entertainment + d * DEP_BUMP.Entertainment,
    Subscriptions: BASE.Subscriptions + d * DEP_BUMP.Subscriptions,
  };
}

/** The bar for a category bucket, read off the claimant's allowance profile. */
export function categoryBar(category: Category, profile: AllowanceProfile): Bar {
  const allowance = profile[category];
  return { allowance, excess: Math.round(allowance * EXCESS_FACTOR) };
}

/**
 * The bar for a big-ticket item, from its nature and circumstances (§1):
 * - essential appliance → allowance covers it (approve): a fridge is a fridge.
 * - luxury → no allowance (flag): a 4K TV on assistance reads as excess.
 * - mixed → a dependent justifies it (approve); without one it is a warning —
 *   a kid's laptop is schooling with a child on file, discretionary without.
 */
export function bigTicketBar(nature: BigTicketNature, circ: Circumstances, spend: number): Bar {
  if (nature === "essential") return { allowance: spend, excess: spend };
  if (nature === "luxury") return { allowance: 0, excess: 0 };
  if (circ.dependents > 0) return { allowance: spend, excess: spend };
  return { allowance: Math.round(spend * 0.6), excess: Math.round(spend * 1.2) };
}

/** The three-way rubric (§2): approve ≤ allowance < warn ≤ excess < flag. */
export function verdictFor(spend: number, allowance: number, excess: number): Verdict {
  if (spend <= allowance) return "approve";
  if (spend <= excess) return "warn";
  return "flag";
}

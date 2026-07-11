// Category aggregation (§3) — the desk no longer stamps individual $7 lines.
// The engine's discretionary ("restoration") spread is summed into a few legible
// buckets, and the player judges the bucket total against the claimant's
// allowance. Pure: raw LedgerLine[] in, category totals out.

import type { LedgerLine } from "../engine/ledger.ts";

export type Category = "Dining" | "Entertainment" | "Subscriptions";

/** One aggregated bucket of discretionary spend, ready for a determination. */
export interface CategoryBucket {
  category: Category;
  spend: number; // summed dollars, positive
  lineCount: number; // how many charges the bucket rolls up
  firstTurn: number; // week span, for the desk's detail line
  lastTurn: number; // most recent charge — where the counterfactual forks
}

// Map the engine's restoration labels (src/engine/ledger.ts) to categories.
const CATEGORY_BY_LABEL: Record<string, Category> = {
  "Rosie's Bar": "Dining",
  "Takeout dinner": "Dining",
  "Coffee run": "Dining",
  "Corner-store treat": "Dining",
  "Birthday cake": "Dining",
  "Movie ticket": "Entertainment",
  "Lottery ticket": "Entertainment",
  "Streaming subscription": "Subscriptions",
};

const CATEGORY_ORDER: Category[] = ["Dining", "Entertainment", "Subscriptions"];

/** Bucket the discretionary spend of a rendered ledger. Non-restoration lines
 *  (wages, rent, shocks) are not the desk's to judge and are ignored. */
export function aggregateCategories(lines: LedgerLine[]): CategoryBucket[] {
  const buckets = new Map<Category, CategoryBucket>();
  for (const l of lines) {
    if (l.category !== "restoration") continue;
    const cat = CATEGORY_BY_LABEL[l.label] ?? "Entertainment";
    const amt = Math.abs(l.amount);
    const b = buckets.get(cat);
    if (b) {
      b.spend += amt;
      b.lineCount += 1;
      b.firstTurn = Math.min(b.firstTurn, l.turn);
      b.lastTurn = Math.max(b.lastTurn, l.turn);
    } else {
      buckets.set(cat, { category: cat, spend: amt, lineCount: 1, firstTurn: l.turn, lastTurn: l.turn });
    }
  }
  return CATEGORY_ORDER.filter((c) => buckets.has(c)).map((c) => buckets.get(c)!);
}

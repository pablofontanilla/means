// Render a run's spending as legible ledger lines (§13.1). This is the bridge
// between the engine's numeric history and the case-file table the desk stamps
// in Act 1 — and the same format the player's own purchases take in Act 2.

import type { RunState, TurnRecord } from "./types.ts";

export type LedgerCategory =
  | "income"
  | "rent"
  | "restoration"
  | "event"
  | "tiermove"
  | "interest";

export interface LedgerLine {
  turn: number;
  label: string;
  amount: number; // signed money (positive = money in, negative = money out)
  category: LedgerCategory;
  flaggable: boolean; // is this a line the rubric lets the desk flag?
}

// A small authored spread of "non-essential" purchase labels, cycled so the
// ledger reads like real discretionary spending rather than "restoration x2".
const RESTORATION_LABELS = [
  "Rosie's Bar",
  "Streaming subscription",
  "Takeout dinner",
  "Corner-store treat",
  "Movie ticket",
  "Birthday cake",
  "Coffee run",
  "Lottery ticket",
];

function restorationLabel(turn: number, unit: number): string {
  return RESTORATION_LABELS[(turn * 3 + unit) % RESTORATION_LABELS.length];
}

/** One turn's records → ledger lines, in reading order. */
function linesForTurn(rec: TurnRecord): LedgerLine[] {
  const out: LedgerLine[] = [];
  const s = rec.spend;

  if (s.earned > 0) {
    out.push({
      turn: rec.turn,
      label: "Wages",
      amount: Math.round(s.earned),
      category: "income",
      flaggable: false,
    });
  }
  if (rec.event && rec.event.moneyHit < 0) {
    out.push({
      turn: rec.turn,
      label: rec.event.card.label,
      amount: -Math.round(rec.event.moneyHit),
      category: "income",
      flaggable: false,
    });
  }
  out.push({
    turn: rec.turn,
    label: "Rent",
    amount: -Math.round(s.rent),
    category: "rent",
    flaggable: false,
  });

  // The flaggable lines — discretionary "non-essential" spending (§6.2).
  for (let u = 0; u < s.restorationUnits; u++) {
    out.push({
      turn: rec.turn,
      label: restorationLabel(rec.turn, u),
      amount: -Math.round(s.restorationCost / s.restorationUnits),
      category: "restoration",
      flaggable: true,
    });
  }

  if (s.tierMoveCost > 0) {
    out.push({
      turn: rec.turn,
      label: "Moving / deposit",
      amount: -Math.round(s.tierMoveCost),
      category: "tiermove",
      flaggable: false,
    });
  }
  if (rec.event && rec.event.moneyHit > 0) {
    out.push({
      turn: rec.turn,
      label: rec.event.card.label,
      amount: -Math.round(rec.event.moneyHit),
      category: "event",
      flaggable: false,
    });
  }
  if (rec.event && rec.event.borrowed > 0) {
    out.push({
      turn: rec.turn,
      label: `${rec.event.card.label} — emergency loan`,
      amount: -Math.round(rec.event.borrowed),
      category: "interest",
      flaggable: false,
    });
  }
  return out;
}

/** Full ledger for a run's history. */
export function renderLedger(state: RunState): LedgerLine[] {
  return state.history.flatMap(linesForTurn);
}

/** Just the first `k` turns — used to generate the ledger the desk reviews
 *  before simulating the case forward (§ M3: "pre-run turns 1..k"). */
export function renderLedgerThroughTurn(state: RunState, k: number): LedgerLine[] {
  return state.history.filter((r) => r.turn <= k).flatMap(linesForTurn);
}

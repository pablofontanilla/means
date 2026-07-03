// The PoC caseload (§ M3, pillar 8). Each case IS an engine run viewed from
// outside: we run the sim, render the review period as a ledger, and let the
// desk stamp the discretionary lines. Most flags are rubric-correct yet
// destroy the recipient (the trap); a few are genuine fraud the sim vindicates
// (the honest deck) — without which the counterfactuals read as rigged.

import { type Config, DEFAULT_CONFIG } from "../engine/config.ts";
import { renderLedgerThroughTurn, type LedgerLine } from "../engine/ledger.ts";
import { makeRestorationPolicy } from "../engine/policies.ts";
import { runFull } from "../engine/simulate.ts";
import type { RunState } from "../engine/types.ts";

export type LineTruth = "loadbearing" | "fraud";
export type RubricVerdict = "flag" | "approve";
export type CaseKind = "trap" | "fraud";

export interface CaseLine extends LedgerLine {
  lineId: string;
  rubric: RubricVerdict; // what the institution's rubric says to do
  truth: LineTruth; // the actual nature (drives the counterfactual)
  dockAmount: number; // benefit docked next period if flagged
  decisionTurn: number; // engine turn this line belongs to (for the fork)
}

export interface AuthoredCase {
  id: string;
  name: string;
  benefit: number;
  seed: number;
  reviewTurns: number;
  kind: CaseKind;
  claimNote: string;
}

export interface BuiltCase extends AuthoredCase {
  lines: CaseLine[];
  run: RunState;
}

// The institution's rubric (§6.1): "non-essential" spending is flaggable;
// a short exempt list ("de minimis", one-off family expenses) is not. Applying
// it is genuine pattern-reading skill (§6.2), not a strawman click-through.
const NON_ESSENTIAL = new Set([
  "Rosie's Bar",
  "Streaming subscription",
  "Movie ticket",
  "Lottery ticket",
  "Takeout dinner",
]);

export function rubricVerdict(label: string): RubricVerdict {
  return NON_ESSENTIAL.has(label) ? "flag" : "approve";
}

const DOCK = 40; // benefit docked per flag (§6.3 example: "docked $40")

// The authored caseload: 5 trap cases, 3 fraud cases (pillar 8). Trap seeds are
// hand-picked for edge-living runs where a $40 dock reliably flips absorbed
// shocks into cascades — so the counterfactual archive shows real damage, not
// "held this period." Fraud seeds are edge-living too: their ordinary pleasure
// lines are still load-bearing, so only the injected resale line deserves a flag.
export const CASELOAD: AuthoredCase[] = [
  { id: "c1", name: "R. Alvarez", benefit: 210, seed: 7, reviewTurns: 5, kind: "trap", claimNote: "Single parent, one dependent. Night shifts." },
  { id: "c2", name: "D. Okafor", benefit: 180, seed: 13, reviewTurns: 6, kind: "trap", claimNote: "Recently reduced hours. No dependents." },
  { id: "c3", name: "T. Nowak", benefit: 240, seed: 43, reviewTurns: 6, kind: "fraud", claimNote: "Two dependents. Flagged by prior audit." },
  { id: "c4", name: "S. Bianchi", benefit: 195, seed: 21, reviewTurns: 5, kind: "trap", claimNote: "Caregiver for a parent. Part-time." },
  { id: "c5", name: "M. Haddad", benefit: 205, seed: 50, reviewTurns: 6, kind: "fraud", claimNote: "Seasonal work. Irregular income." },
  { id: "c6", name: "J. Fischer", benefit: 175, seed: 26, reviewTurns: 5, kind: "trap", claimNote: "New claim. First review period." },
  { id: "c7", name: "L. Petrova", benefit: 220, seed: 30, reviewTurns: 6, kind: "trap", claimNote: "Chronic condition. Frequent appointments." },
  { id: "c8", name: "A. Mensah", benefit: 190, seed: 61, reviewTurns: 5, kind: "fraud", claimNote: "Anonymous tip on file." },
];

// A fraud line is authored (resale is outside the capacity model). It looks like
// exactly the kind of "non-essential" purchase the rubric targets — but here the
// flag is genuinely correct, and the sim vindicates it (§6.3, pillar 8).
const FRAUD_LINE: Omit<CaseLine, "decisionTurn"> = {
  turn: 2,
  label: "Electronics (large)",
  amount: -220,
  category: "restoration",
  flaggable: true,
  lineId: "fraud",
  rubric: "flag",
  truth: "fraud",
  dockAmount: DOCK,
};

/** Build a case: run the engine, render the review-period ledger, tag lines. */
export function buildCase(authored: AuthoredCase, config: Config = DEFAULT_CONFIG): BuiltCase {
  const run = runFull(config, makeRestorationPolicy(config), authored.seed);
  const raw = renderLedgerThroughTurn(run, authored.reviewTurns);

  let counter = 0;
  const lines: CaseLine[] = raw.map((l): CaseLine => ({
    ...l,
    lineId: `${authored.id}-${counter++}`,
    rubric: l.flaggable ? rubricVerdict(l.label) : "approve",
    truth: "loadbearing",
    dockAmount: DOCK,
    decisionTurn: l.turn,
  }));

  if (authored.kind === "fraud") {
    // Splice the fraud line into the ledger at its turn, keeping reading order.
    const fraud: CaseLine = { ...FRAUD_LINE, lineId: `${authored.id}-fraud`, decisionTurn: 2 };
    const idx = lines.findIndex((l) => l.turn > fraud.turn);
    lines.splice(idx < 0 ? lines.length : idx, 0, fraud);
  }

  return { ...authored, lines, run };
}

export function buildCaseload(config: Config = DEFAULT_CONFIG): BuiltCase[] {
  return CASELOAD.map((c) => buildCase(c, config));
}

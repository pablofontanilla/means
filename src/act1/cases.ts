// The PoC caseload (§1, pillar 8). Each case IS an engine run viewed from
// outside: we run the sim, render the review period as a ledger, aggregate its
// discretionary spread into category buckets, and add the authored big-ticket
// purchases. The player judges each item against an allowance the claimant's
// CIRCUMSTANCES set — dependents raise the bar, so the same spend reads
// differently across the caseload. Most rubric-correct flags still destroy the
// recipient (the trap); one big-ticket is genuine fraud the sim vindicates,
// without which the counterfactuals read as rigged.

import { type Config, DEFAULT_CONFIG } from "../engine/config.ts";
import { renderLedgerThroughTurn } from "../engine/ledger.ts";
import { makeRestorationPolicy } from "../engine/policies.ts";
import { runFull } from "../engine/simulate.ts";
import type { RunState } from "../engine/types.ts";
import { aggregateCategories, type Category } from "./aggregate.ts";
import type { Verdict } from "./kpi.ts";
import {
  type AllowanceProfile,
  type Bar,
  bigTicketBar,
  categoryBar,
  deriveAllowance,
  verdictFor,
} from "./rubric.ts";

export type { Category };

export type BigTicketNature = "essential" | "mixed" | "luxury";
export type ItemTruth = "loadbearing" | "fraud";

/** What the claimant's file says — the context that sets the bar (§1). */
export interface Circumstances {
  dependents: number;
  situation: string; // income / employment, plain language
  housing: string;
  note: string; // the caseworker's plain-language annotation
}

/** An authored big-ticket purchase: its own contextual decision (§1). */
export interface AuthoredBigTicket {
  label: string;
  amount: number; // positive dollars
  nature: BigTicketNature;
  decisionTurn: number; // engine turn it belongs to (for the fork)
  truth: ItemTruth;
  detail: string; // one line of file context for the row
}

export interface AuthoredCase {
  id: string;
  name: string;
  benefit: number;
  seed: number;
  reviewTurns: number;
  circumstances: Circumstances;
  bigTickets: AuthoredBigTicket[];
}

/** One reviewable item on the desk: a category bucket or a big-ticket purchase. */
export interface ReviewItem {
  itemId: string;
  kind: "category" | "bigticket";
  label: string;
  spend: number; // positive dollars under review
  detail: string; // e.g. "3 charges, weeks 1–6"
  expected: Verdict; // the institution's contextual verdict (§2)
  bar: Bar; // the allowance/excess the verdict was read off
  truth: ItemTruth;
  decisionTurn: number;
  dockAmount: number; // docked if flagged; a warn docks half (§6)
}

export interface BuiltCase extends AuthoredCase {
  items: ReviewItem[];
  allowance: AllowanceProfile;
  run: RunState;
}

// The authored caseload (§1): 3 cases, circumstances first. Bucket totals are
// set by reviewTurns (the label spread is deterministic); seeds are hand-picked
// so the flag-branch forks show real downstream damage, not "held this period".
// The spread teaches the skill: the same dining pattern is a warn for Alvarez
// (one dependent), a flag for Okafor (none), unremarkable for Nowak (two).
export const CASELOAD: AuthoredCase[] = [
  {
    id: "c1",
    name: "R. Alvarez",
    benefit: 210,
    seed: 52,
    reviewTurns: 6,
    circumstances: {
      dependents: 1,
      situation: "Night-shift stocker; hours cut to 24/week",
      housing: "One-bedroom rental, shared with child",
      note: "Single parent, one dependent (age 9). Punctual filer.",
    },
    bigTickets: [
      {
        label: "Refurbished laptop",
        amount: 120,
        nature: "mixed",
        decisionTurn: 4,
        truth: "loadbearing",
        detail: "Week 4 — single purchase. School supply list on file.",
      },
    ],
  },
  {
    id: "c2",
    name: "D. Okafor",
    benefit: 180,
    seed: 2,
    reviewTurns: 6,
    circumstances: {
      dependents: 0,
      situation: "Warehouse picker; hours recently reduced",
      housing: "Single-occupancy studio",
      note: "No dependents. Anonymous tip on file re: electronics purchase.",
    },
    bigTickets: [
      {
        label: '4K television, 65"',
        amount: 180,
        nature: "luxury",
        decisionTurn: 2,
        truth: "fraud", // resale — the one flag the sim vindicates (pillar 8)
        detail: "Week 2 — single purchase. No receipt submitted.",
      },
    ],
  },
  {
    id: "c3",
    name: "T. Nowak",
    benefit: 240,
    seed: 114,
    reviewTurns: 7,
    circumstances: {
      dependents: 2,
      situation: "Seasonal warehouse work; between contracts",
      housing: "Two-bedroom, three occupants",
      note: "Two dependents (ages 4 and 7). Prior review closed clean.",
    },
    bigTickets: [
      {
        label: "Refrigerator (replacement)",
        amount: 140,
        nature: "essential",
        decisionTurn: 2,
        truth: "loadbearing",
        detail: "Week 2 — single purchase. Prior unit failure documented.",
      },
    ],
  },
];

/** Build a case: run the engine, aggregate the review-period discretionary
 *  spread into buckets, add the authored big tickets, and read each item's
 *  expected verdict off the claimant's allowance (§1, §2). */
export function buildCase(authored: AuthoredCase, config: Config = DEFAULT_CONFIG): BuiltCase {
  const run = runFull(config, makeRestorationPolicy(config), authored.seed);
  const allowance = deriveAllowance(authored.circumstances);

  const buckets = aggregateCategories(renderLedgerThroughTurn(run, authored.reviewTurns));
  const items: ReviewItem[] = buckets.map((b) => {
    const bar = categoryBar(b.category, allowance);
    return {
      itemId: `${authored.id}-${b.category.toLowerCase()}`,
      kind: "category",
      label: b.category,
      spend: b.spend,
      detail: `${b.lineCount} charge${b.lineCount > 1 ? "s" : ""}, weeks ${b.firstTurn}–${b.lastTurn}`,
      expected: verdictFor(b.spend, bar.allowance, bar.excess),
      bar,
      truth: "loadbearing",
      decisionTurn: b.lastTurn,
      dockAmount: b.spend,
    };
  });

  for (const bt of authored.bigTickets) {
    const bar = bigTicketBar(bt.nature, authored.circumstances, bt.amount);
    items.push({
      itemId: `${authored.id}-${bt.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      kind: "bigticket",
      label: bt.label,
      spend: bt.amount,
      detail: bt.detail,
      expected: verdictFor(bt.amount, bar.allowance, bar.excess),
      bar,
      truth: bt.truth,
      decisionTurn: bt.decisionTurn,
      dockAmount: bt.amount,
    });
  }

  return { ...authored, items, allowance, run };
}

export function buildCaseload(config: Config = DEFAULT_CONFIG): BuiltCase[] {
  return CASELOAD.map((c) => buildCase(c, config));
}

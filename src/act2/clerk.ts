// The clerk is you (§7.5) — ships as flavor. Periodically an off-screen officer
// reviews the player's file and docks flagged purchases. Their flagging behavior
// reflects the player's OWN Act 1 stamp record: a punitive Act 1 player faces a
// punitive clerk; a lenient one faces a gentler review. Complicity becomes
// mechanical, not merely psychological. Kept as flavor — the dock is modest and
// does not meaningfully shift the outcome distribution (the difficulty-parameter
// version is deferred until tuning proves it can't break the trap, §11.3).

import type { Config } from "../engine/config.ts";

export interface ClerkVerdict {
  flagged: number; // how many recent purchases the clerk flagged
  dock: number; // total benefit docked this review
  note: string; // the annotation quoting the player's own policy back at them
}

/**
 * Review the discretionary purchases since the last visit. The number flagged is
 * the player's Act 1 flag rate applied to their own spending — their standard,
 * turned on their life.
 */
export function clerkReview(
  recentPurchases: number,
  flagRate: number,
  config: Config,
): ClerkVerdict {
  const flagged = Math.round(recentPurchases * flagRate);
  const dock = flagged * config.clerkDockPerFlag;
  const pct = Math.round(flagRate * 100);
  return { flagged, dock, note: composeNote(flagged, recentPurchases, pct) };
}

function composeNote(flagged: number, purchases: number, flagPct: number): string {
  if (purchases === 0) {
    return `Reviewing officer: file reviewed. No discretionary spending this period. Noted.`;
  }
  if (flagged === 0) {
    return `Reviewing officer reviewed ${purchases} discretionary line${
      purchases > 1 ? "s" : ""
    }. None docked — a lenient read, consistent with your own record (you flagged ${flagPct}% at the desk).`;
  }
  const stampWord = flagged > 1 ? "stamps" : "stamp";
  return `Reviewing officer flagged ${flagged} of ${purchases} discretionary line${
    purchases > 1 ? "s" : ""
  } — ${flagged} ${stampWord}, applying your own standard (you flagged ${flagPct}% of comparable lines). Benefit docked.`;
}

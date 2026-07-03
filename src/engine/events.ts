// The event deck (§5.3). Each card is a flat-magnitude shock; the *meaning* of
// the magnitude is decided at resolution by the buffer it lands against
// (engine.ts). The desperation table is the nastier distribution you draw from
// when capacity is on the floor — the mechanism by which cutting restoration to
// save money costs more than it saves (the pillar-2 refutation).

import type { EventCard } from "./types.ts";

// The everyday deck — drawn when capacity is above the desperation threshold.
export const NORMAL_DECK: EventCard[] = [
  { id: "car", label: "Car repair", moneyHit: 42, capacityHit: 4, desperation: false },
  { id: "dentist", label: "Dental bill", moneyHit: 30, capacityHit: 3, desperation: false },
  { id: "utility", label: "Utility catch-up", moneyHit: 24, capacityHit: 2, desperation: false },
  { id: "phone", label: "Phone replacement", moneyHit: 20, capacityHit: 2, desperation: false },
  { id: "kid", label: "School expense", moneyHit: 18, capacityHit: 2, desperation: false },
  { id: "coworker", label: "Covered a shift", moneyHit: 0, capacityHit: 6, desperation: false },
  { id: "quiet", label: "A quiet week", moneyHit: 0, capacityHit: 0, desperation: false },
  { id: "bonus", label: "Small bonus", moneyHit: -18, capacityHit: 0, desperation: false },
];

// The desperation table — worse forced choices, drawn only at low reserves.
export const DESPERATION_DECK: EventCard[] = [
  { id: "eviction", label: "Eviction notice", moneyHit: 70, capacityHit: 10, desperation: true },
  { id: "er", label: "ER visit", moneyHit: 60, capacityHit: 12, desperation: true },
  { id: "cutoff", label: "Utilities cut off", moneyHit: 48, capacityHit: 9, desperation: true },
  { id: "payday", label: "Payday-loan spiral", moneyHit: 55, capacityHit: 8, desperation: true },
  { id: "breakdown", label: "Total car breakdown", moneyHit: 65, capacityHit: 7, desperation: true },
];

# Code Map

Module-by-module map of the *Means* codebase as of 2026-07-12 (commit
`03c69b9`, post-Pass-2). ~2,700 lines of TypeScript in `src/`, ~850 in
`tests/`. Section references (§) point into
[means-design-settled.md](../means-design-settled.md).

## Layer diagram

```
index.html ──► src/main.ts ──► src/menu.ts          (title + act sequencing)
                                  │
                     ┌────────────┼──────────────┐
                     ▼            ▼              ▼
                 src/act1/    act break      src/act2/
                 (the desk)   (in menu.ts)   (the case)
                     │                           │
                     └────────► src/engine/ ◄────┘      (pure, DOM-free)
                     │                           │
                     └────────► src/ui/    ◄────┘      (audio, juice, CSS)

sandbox.html ──► src/sandbox.ts ──► src/engine/         (dev-only tuning)
```

Dependency rule: `engine/` imports nothing outside itself and has no DOM
dependency. `act1/` and `act2/` import `engine/` and `ui/`. Nothing imports
`act1/` from `act2/` or vice versa; `menu.ts` is the only module that knows
both acts exist (it carries the Act 1 `flagRate` into Act 2's context).

## `src/engine/` — the pure simulation

One person in the poverty trap, advanced turn by turn. Deterministic,
seeded, immutable — the same seed always produces the same run, which is
what makes counterfactual forks and CI cohort assertions possible.

| File | Exports | Role |
|------|---------|------|
| `types.ts` | `Allocation`, `RunState`, `TurnRecord`, `SpendRecord`, `EventCard`, `EventResolution`, `Policy`, `OutcomeKind` | All engine types. `RunState.history` carries a full `TurnRecord` per turn — the raw material for ledgers and counterfactual text. |
| `config.ts` | `Config`, `DEFAULT_CONFIG`, `cloneConfig`, `maxTier` | **Every tuning number in the game.** Nothing numeric is hardcoded elsewhere in the engine. Includes the 3 Maslow tiers, footing integrator params, event chances, and Act 2 clerk knobs. |
| `rng.ts` | `mulberry32`, `hash2`, `makeRng`, `turnRng` | Seeded PRNG with **per-turn streams**: `turnRng(runSeed, turn)` gives an independent stream per turn, so two forks of a run draw identical events on the same turn regardless of allocation. Load-bearing for the counterfactual ledger (§6.3). |
| `events.ts` | `NORMAL_DECK`, `DESPERATION_DECK` | The shock cards. Flat magnitudes; *meaning* is decided at resolution against the buffer. The desperation deck is drawn when capacity < threshold — the mechanism by which cutting restoration costs more than it saves. |
| `engine.ts` | `initState`, `step` | `step(prev, alloc, config)` → new state. Turn order (§5.2): work → rest/restoration → upkeep+appointment → structural drain → tier move → event vs. buffer → footing update → terminal check. Absorption asymmetry lives in `resolveEvent`: covered hit = absorbed & forgotten; uncovered = forced borrow at interest + capacity hit + possible missed shift. |
| `policies.ts` | `makeRestorationPolicy`, `makeRestraintPolicy` | Headless drivers. Restoration = the economically literate play (buy comforts to keep the engine running); restraint = the folk-theory play (max work, skip all pleasures). Pillar 2 requires restraint to LOSE — asserted in CI. Restoration policy also generates every Act 1 case ledger. |
| `simulate.ts` | `runFull`, `runCohort`, `seedRange`, `forkAtDecision`, `footingShape`, `RunModifier` | Orchestration. `runFull` accepts mid-run money docks (`RunModifier`) — that is how a flag's dock is injected. `forkAtDecision` runs approved-vs-docked branches on the same seed. `footingShape` reads the ending epitaph (lifting / stabilized / freefall) off a 7-turn slope window. |
| `ledger.ts` | `renderLedger`, `renderLedgerThroughTurn`, `LedgerLine` | Numeric history → legible ledger lines. Restoration units become authored labels ("Rosie's Bar", "Streaming subscription", …) cycled deterministically — the bridge between sim spend and the case-file table. `renderLedgerThroughTurn(state, k)` yields the review-period slice Act 1 aggregates. |

## `src/act1/` — the desk

The player judges strangers' ledgers. Three cases (each an engine run
viewed from outside), ~5 determinations per case, three-way verdicts
(Approve / Warn / Flag) against a contextual allowance.

| File | Exports | Role |
|------|---------|------|
| `rubric.ts` | `deriveAllowance`, `categoryBar`, `bigTicketBar`, `verdictFor`, `Bar`, `AllowanceProfile` | **The single source of "what the institution expected."** Category allowances = base + per-dependent bump; warn band = ×1.5. Big tickets judged by *nature* only (essential → approve, luxury → flag, mixed → dependents decide) — amount currently ignored; slated to change (nature will set a *ceiling*, see projects/act1-feedback-pass). |
| `aggregate.ts` | `aggregateCategories`, `Category`, `CategoryBucket` | Rolls the ledger's restoration lines into Dining / Entertainment / Subscriptions buckets, mapped from the authored labels in `ledger.ts` (the two label lists must stay in sync). |
| `cases.ts` | `CASELOAD`, `buildCase`, `buildCaseload`, `ReviewItem`, `BuiltCase`, `Circumstances`, `AuthoredBigTicket` | The authored caseload (3 cases: Alvarez / Okafor / Nowak) with hand-picked seeds, plus the build pipeline: run the sim → slice the review period → aggregate buckets → append authored big tickets → read each item's expected verdict off the rubric. One item is `truth: "fraud"` (Okafor's TV) — the flag the sim vindicates. |
| `kpi.ts` | `initKpi`, `applyStamp`, `alignment`, `flagRate`, `rating`, `crossesAudit`, `AUDIT_THRESHOLD`, `Verdict`, `KpiState`, `StampScore` | The KPI layer, held straight (pillar 6). Score pays most for flags + streaks + speed (the seduction); the honest signals are **alignment** (ordinal distance from expected verdict) and **audit risk** (accrues only on under-calling expected-flags). Rating: alignment carries 4 of 5 stars, pace 1, audited shift −2. `flagRate` is the load-bearing contract Act 2 reads. |
| `counterfactual.ts` | `resolveItem`, `dockFor`, `Counterfactual` | The core mechanic (§6.3). Every stamp resolves BOTH branches: fork the run at the item's turn (shared RNG), describe where the same shock absorbs in one branch and cascades in the other. Flag docks full amount, warn half. Fraud item gets authored vindication text instead of a fork. |
| `desk.ts` | `runAct1`, `DeskOutcome` | Act 1's controller (`Desk` class). Renders case files, wires 3-way stamp buttons, runs the per-case timer (timeout auto-approves), applies stamps to the KPI, files counterfactuals, and fires the **audit interstitial** exactly once on threshold crossing (pulls the earliest under-called expected-flag back for re-review). Contains the deferred-audit reentrancy pattern (`pendingAudit` / `batchStamping`). |
| `archive.ts` | `Archive` | The counterfactual drawer — resolved decisions land here showing both branches; never forced on the player (one clerk nudge mid-act). Currently a flat newest-first list; grouping by case ID is queued. |
| `review.ts` | `showReview` | Act-end performance review: stars, score, alignment, audit standing. Performance ONLY — the cohort/poverty tally was deliberately removed (§6.4); that pedagogy lives solely in the archive. |

### Act 1 data flow

```
seed ─► runFull(restorationPolicy) ─► renderLedgerThroughTurn(reviewTurns)
              │                              │
              │                       aggregateCategories ─► category buckets
              │                                                    │
   authored bigTickets ────────────────────────────────────────────┤
              │                                                    ▼
              │                            rubric bars ─► ReviewItem.expected
              ▼
  stamp ─► applyStamp(kpi) ─► points / alignment / auditRisk ─► maybe audit
       └─► resolveItem ─► forkAtDecision ─► Counterfactual ─► Archive
```

## `src/act2/` — the case

The player lives one engine run from the inside, on the same case-file UI.

| File | Exports | Role |
|------|---------|------|
| `run.ts` | `runAct2`, `Act2Context` | Controller (`Act2Run` class). Weekly loop: allocate 6 slots across regular/overtime shifts, rest, errands (+ money-only comforts), end week → `step()`. Renders the ledger of *your own* purchases with the flag-risk styling from Act 1, the week summary, and the one sanctioned new UI element: the centered capacity meter (§7.4). Ending screen draws the footing line and the `footingShape` epitaph. Seed is `Date.now() & 0xffff` — Act 2 runs are not reproducible (deliberate; it's lived, not reviewed). |
| `clerk.ts` | `clerkReview` | "The clerk is you" (§7.5), shipped as flavor: every `clerkInterval` weeks an off-screen officer flags `flagRate × purchases` of your comforts and docks a modest amount, quoting your own Act 1 record back at you. Kept small enough not to shift the outcome distribution (§11.3). |

## `src/ui/` — shared presentation

| File | Role |
|------|------|
| `audio.ts` | Web-Audio-synthesized stamp (noise-burst pad + low sine thump) and KPI tick. No shipped assets. The SAME stamp muffled/distant is Act 2's dread anchor. Fails silent without an AudioContext (jsdom-safe). |
| `juice.ts` | `slamStamp` (stamp mark + row jolt + sound) and `tickCounter` (ratcheting KPI numbers). Sincere, tactile, zero irony (§6.5). |
| `casefile.css` | **The one visual language for both acts** (§8): portal chrome, case-file paper, ledger, stamp buttons/marks, audit interstitial, archive drawer, capacity meter + dread states, allocation steppers, endings, title menu. ~350 lines, sectioned by comment banners. |

## Top level

| File | Role |
|------|------|
| `main.ts` | Entry: import CSS, mount title menu. Nothing else — sequencing lives in `menu.ts` so it's testable without import side effects. |
| `menu.ts` | Title menu (cover sheet in the same document system) + act sequencing: Act 1 → `showReview` → act break (the RIF memo — **unconditional** after the last case) → Act 2 with `flagRate` from the desk. Also the playtest skip straight to Act 2 under an assumed flag rate (0.2 / 0.6 / 0.9). |
| `sandbox.ts` / `sandbox.html` | Dev-only tuning dashboard: sliders over a `Config` clone, 1000-seed cohort runs for both policies, outcome distribution bars, footing/capacity sparklines. Where pillar 4 gets tuned before touching game UI. |
| `vite.config.ts` | Two static entry points (`index.html`, `sandbox.html`), relative base. |
| `tsconfig.json`, `package.json` | Vanilla TS + Vite + Vitest. **Zero runtime dependencies.** |

## Known couplings to watch

- `ledger.ts` `RESTORATION_LABELS` ↔ `aggregate.ts` `CATEGORY_BY_LABEL`:
  the label strings are the join key. A new label without a category
  mapping silently falls into "Entertainment".
- `kpi.ts` `flagRate` ↔ `menu.ts` ↔ `act2/clerk.ts`: the cross-act
  contract (warns count as non-flags).
- `cases.ts` seeds ↔ `DEFAULT_CONFIG` ↔ `makeRestorationPolicy`: the
  hand-picked seeds were chosen so flag-branch forks show real damage.
  Retuning the config or the policy invalidates the seed choices — re-dump
  the rubric table (see [testing.md](testing.md)) after any such change.
- `desk.ts` audit interstitial assumes at most ONE crossing per shift
  (`crossesAudit` fires on the below→at/over transition only).

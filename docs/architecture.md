# Architecture Decisions

The load-bearing technical decisions in *Means*, with the reasoning — the
things a future change should either respect or consciously overturn.
Design rationale lives in [means-design-settled.md](../means-design-settled.md);
this file covers how the code embodies it. Current as of 2026-07-12
(commit `03c69b9`).

## 1. Vanilla TypeScript + Vite, zero runtime dependencies

No framework, no state library, no router. Screens are controller classes
(`Desk`, `Act2Run`, `Archive`) that own a DOM root, render with
`innerHTML` template literals, and wire listeners by hand. Sequencing is
plain callbacks: `menu → runAct1 → showReview → act break → runAct2 → menu`.

*Why:* PoC scope — the risk is in the design, not the plumbing. The whole
game is ~2,700 lines; a framework would cost more than it buys. The cost
accepted: re-rendering is manual and coarse (`renderCase()` rebuilds the
case file; Act 2 re-renders the whole stage each week and just the
allocation panel on stepper clicks).

## 2. The engine is pure, seeded, and immutable

`step(state, allocation, config)` returns a new state; no mutation, no
DOM, no globals, no `Math.random`. All randomness flows from the run seed.
Tests assert both determinism and non-mutation.

*Why this is the keystone:* three separate features depend on it —

1. **Counterfactual forks** (§6.3): `forkAtDecision` replays the same
   seed with and without a benefit dock. Only purity makes "the branch
   you didn't take" honest rather than authored.
2. **CI cohort assertions**: pillar claims are statistical, so tests run
   3,000-seed cohorts and assert distributions (see [testing.md](testing.md)).
3. **Headless tuning**: the sandbox monte-carlos config candidates with
   the same code the game ships.

## 3. Per-turn RNG streams with positionally fixed draws

`turnRng(runSeed, turn)` = `mulberry32(hash2(seed, turn))` — every turn
gets an independent stream. Inside a turn, draws happen in a fixed
position regardless of allocation: the appointment roll is first, and
`resolveEvent` draws `fires`, card index, and the miss-shift roll *before*
any early return.

*Why:* forked branches must see the **same shock on the same week**,
diverging only through the state they carry in — "same shock, opposite
meaning" is the empathy generator, and it dies if a different allocation
perturbs the draw sequence. **Rule for engine changes: any new RNG draw
must be unconditional and fixed-position within the turn.**

## 4. Every tuning number lives in `config.ts`

`DEFAULT_CONFIG` is the single home for all numeric tuning; the engine
reads config, never literals. The sandbox binds sliders to
`cloneConfig(DEFAULT_CONFIG)`; tests assert pillar constraints against the
default. Act 1's rubric numbers (`BASE`, `DEP_BUMP`, `EXCESS_FACTOR`,
audit weights) are the acknowledged exception — they live in
`rubric.ts`/`kpi.ts` as module constants because they are desk policy, not
world simulation. If they start needing sandbox tuning, they should move.

## 5. Design pillars are CI assertions

The two claims the game stands on are enforced by `tests/engine.test.ts`
over 3,000-seed cohorts:

- **Pillar 2 (restraint loses):** the never-buy-pleasure policy must
  escape less and collapse more (>50%) than the restoration policy. The
  core economic argument of the game is a failing test if tuning breaks it.
- **Pillar 4/5 (winnable but rare; stasis real):** escape rate in
  (0%, 15%); trapped > 50%.

*Consequence:* config changes that violate the thesis do not merely feel
wrong — they fail CI. Keep it that way; add pillar-shaped assertions when
new claims become load-bearing (e.g. the coming "small items draw the
scrutiny" rebalance could be asserted over the caseload).

## 6. Act 1 cases ARE engine runs

`buildCase` runs the real sim under the restoration policy, renders the
review period as a ledger, aggregates discretionary lines into category
buckets, and appends authored big tickets. Only three things are authored
per case: circumstances, big tickets, and the seed (hand-picked so the
flag branches show real damage). Everything else — bucket totals, week
spans, downstream cascades — is simulated.

*Why:* the counterfactual archive must not read as rigged. One authored
exception: the fraud item (`truth: "fraud"`) gets vindication text instead
of a fork, precisely so the honest forks stay credible (pillar 8).

## 7. The rubric is the single source of institutional expectation

`rubric.ts` derives every `ReviewItem.expected` at build time; the KPI and
the per-decision feedback both consume that field. Nothing else in the
codebase decides what the institution "wanted."

*Why:* Act 1's skill is learning the institution's logic; that logic must
be one consistent function or the game is unlearnable (and the planned
byzantine manual would be a lie). Any rubric change is a caseload-wide
change — re-verify every case's expected verdicts after touching it.

## 8. KPI seduction and honest signals are deliberately separate

`applyStamp` pays score generously for flags (base 100 + streak + speed)
while tracking alignment (ordinal distance from expected) and audit risk
(only on under-called expected-flags) on the side. `rating()` then makes
score nearly irrelevant: alignment carries 4 of 5 stars, pace 1, audit −2.

*Why:* the gap between the climbing score and the real rating IS the
pillar-6 statement (the institution never winks). Tests pin this:
a streak-inflated score must not out-rate an aligned shift.

## 9. One visual language, one sanctioned exception

Both acts render in the same portal chrome, case-file paper, ledger
table, and stamp vocabulary (`casefile.css` is shared, sectioned, ~350
lines). The act break is a diff, not a cutscene: Act 2 is the same form
with your name on it. The only new element is the centered capacity meter
— the variable the desk never showed. Audio follows the same rule: the
identical synthesized stamp, bright and close in Act 1, muffled and
distant when the clerk stamps *your* file in Act 2.

*Why:* interface continuity is the reveal mechanism (§8). Resist adding
Act 2-only chrome; anything new on that screen dilutes the one exception.

## 10. Reentrancy discipline at the desk: deferred audit crossings

The audit interstitial must never open while unstamped items remain in the
current stamping context, because `stamp()` early-returns behind an open
audit (`auditOpen`) — a mid-batch crossing would strand live buttons on an
expired case. So `stamp()` only *records* a crossing (`pendingAudit`);
the flush happens at the end of the interactive stamp or after
`timeout()`'s auto-approve batch (`batchStamping` marks who owns the
flush). The case clock pauses while the supervisor has the queue and
resumes with the remaining fraction preserved.

*Why documented:* this is the one genuinely stateful/fragile corner of
the UI layer, it has regressed before (see the P2 final-review fix
commit), and it has a dedicated jsdom test driving the production
timeout path.

## 11. Act boundaries carry one number

Act 2 receives `{ name, flagRate }` — nothing else crosses the act break.
The clerk's severity is the player's own Act 1 flag rate (warns count as
non-flags; `flagRate` in `kpi.ts` is the contract). Ships as flavor: docks
are sized to sting without shifting the outcome distribution (§11.3 —
the difficulty-parameter clerk is deferred until tuning proves it can't
break the trap).

## 12. Act 2 is deliberately non-reproducible

Act 1 case seeds are authored; Act 2 seeds from `Date.now() & 0xffff`.
The desk reviews reproducible artifacts; the claimant lives an
unrepeatable life. If Act 2 replays/sharing ever matter, thread a seed
through `Act2Context` — the engine already supports it.

## Testing strategy

See [testing.md](testing.md) for the suite layout, conventions
(pure-model vs. jsdom tests, no-mocking-game-logic rule, platform stubs),
and the authoring workflow for caseload changes.

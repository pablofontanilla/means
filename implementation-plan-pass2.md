# Means — Vertical Slice, Pass 2 (playtest-driven revision)

## Context

Pass 1 shipped the full slice (engine + Act 1 desk + act break + Act 2 + juice) and is on `main`. The user played it and found the *shape* right but the *decisions* hollow. Two clusters of problems:

**Act 1 (the desk):** too many shallow, binary, context-free decisions — "it looks like we just want to flag everything." No motivation, no per-decision feedback, dependents don't factor in, "audit risk" is unexplained, big-ticket items lack resolution, and the act-end auditor screen wrongly surfaces the poverty trap.

**Act 2 (the case):** too little granularity (3 time slots = no real choices), the capacity meter is tucked off-screen, and the strangle is too fast (capacity hits 0 in ~3 weeks) so the point never lands.

This pass revises the slice to make decisions **fewer, meatier, contextual, and legible**, and to make Act 2's decline a **slow, visible strangle**. It's a revision of existing modules, not a rebuild — the pure engine, `forkAtDecision`, the archive, and the tuning sandbox are all reused.

### Design decisions locked (playtest + this session's Q&A)
1. **Act 1 structure:** category buckets + big-ticket items. Small discretionary spend auto-summarized into a few categories (Dining, Entertainment, Subscriptions); each big-ticket purchase is its own contextual decision. ~5–6 decisions/case.
2. **Judgment basis:** *circumstances set the bar.* Dependents/income/situation set a per-claimant "reasonable" allowance; you judge spend against that context (a kid's birthday or a fridge reads differently for a single parent than a childless claimant).
3. **Three-way verdict:** Approve / Warn / Flag (replaces binary). Warn is the middle lever ("some spend is fine, this is too much").
4. **Audit risk:** threshold → audit event. Approving/under-warning flaggable spend raises risk; crossing a threshold triggers an audit that penalizes rating and forces a re-review. Leniency now has stakes.
5. **Act 2 depth:** more time + action types (~5–6 slots; regular/overtime shift, rest, errands/appointments).
6. **Slice size:** 3 Act 1 cases.
7. **Auditor review screen:** performance only — no cohort/poverty-trap data (that pedagogy lives solely in the counterfactual archive).
8. **Act 2 pacing:** longer horizon + slower strangle; capacity meter centered and prominent.
9. **Playtest affordance:** a title menu with "Skip to Act 2" (uses a default assumed flag rate).

---

## Milestones (build in this order)

### P2-M1 — Engine & tuning: action variety + slower strangle
Foundation first, since Act 2's granularity and pacing are engine-level.

- **`src/engine/types.ts`** — extend `Allocation` from `{workSlots, restSlots, restorationUnits, attemptTierMove}` to an action-typed shape: `{ regularShifts, overtimeShifts, restSlots, errandSlots, restorationUnits, attemptTierMove }`. Add an `Appointment`/errand concept (a required upkeep slot some weeks — e.g. a benefits review or childcare — that consumes time without pay and penalizes capacity/benefit if skipped).
- **`src/engine/config.ts`** — add tuning fields: `timeSlotsPerTurn` → ~5–6; `overtimeYield`/`overtimeFatigue`; `errandPenalty` (cost of a missed required appointment); gentler `shiftFatigue`, `structuralDrain`, and desperation cascade so decline is gradual; higher `capacityStart`/buffer; `turnCeiling` → ~40. All numbers stay in this one file.
- **`src/engine/engine.ts`** — `step()` resolves the new action set (overtime = higher yield + steeper fatigue; errands consume slots; missed required appointment applies `errandPenalty`). Keep it pure and deterministic; keep per-turn RNG streams intact (load-bearing for `forkAtDecision`).
- **`src/engine/policies.ts`** — update `makeRestorationPolicy` / `makeRestraintPolicy` to allocate over the new action set (needed for tuning + the pillar-2 CI assertion).
- **`src/sandbox.ts`** — add sliders for the new config fields; retune so: escape stays rare (~5–12%), stasis common, and — critically — **collapse now takes many weeks of poor play, not 3** (a slow strangle). Keep the pillar-2 result (restraint loses).
- **`tests/engine.test.ts`** — update monte-carlo assertions to the new config while preserving the invariants (determinism, escape rare, restraint loses, footing recovers iff escape, counterfactual asymmetry). Reuse `runFull`/`runCohort`/`forkAtDecision` (`src/engine/simulate.ts`) unchanged.

### P2-M2 — Act 1 redesign: contextual, aggregated, three-way, legible
- **`src/act1/cases.ts`** — reduce to **3 cases**. Give each claimant richer **circumstances**: `dependents`, income/situation, housing, plain-language note. Add an **allowance profile** derived from circumstances (dependents raise the reasonable discretionary ceiling). Replace per-line flaggable output with:
  - **Category buckets**: aggregate the engine-generated discretionary ledger into a few categories (Dining, Entertainment, Subscriptions) with a summed amount each.
  - **Big-ticket items**: authored, each with a `nature` (essential appliance / mixed / luxury) and its own contextual expected verdict (fridge → approve; 4K TV → flag; kid's laptop → approve-if-dependent else warn/flag).
  - Reuse `renderLedgerThroughTurn` (`src/engine/ledger.ts`) to source the raw spend, then add a **category-aggregation helper** (new, in `cases.ts` or a small `src/act1/aggregate.ts`).
- **Contextual rubric** (`cases.ts` or new `src/act1/rubric.ts`) — compute the institution's **expected verdict** per reviewable item from `(spend, allowance, category, circumstances)`: `≤ allowance → approve`, `allowance…excess → warn`, `> excess → flag`. This is the "circumstances set the bar" mechanic and the skill the player learns.
- **`src/act1/kpi.ts`** — verdict type `"approve" | "warn" | "flag"`. Rework `applyStamp`:
  - **Alignment** replaces opaque accuracy: score how well each verdict matches the *expected* verdict (exact match / off-by-one / opposite). Over-flagging tanks alignment (this is the fix for "just flag everything").
  - **Audit risk**: rises when you approve/under-warn an item whose expected verdict is flag. Expose a `auditThreshold` and a helper to detect a crossing.
  - Rating = f(score, alignment%, audit standing).
- **`src/act1/desk.ts`** — new decision UI: category + big-ticket rows, each with a 3-way Approve/Warn/Flag control; the claimant **circumstances panel** always visible so context drives the call. **Immediate per-decision feedback**: points, "consistent with rubric / below standard," audit-risk delta. On audit-threshold crossing, show an **audit event** interstitial (supervisor screen) that penalizes rating and forces a re-review of one prior decision. Reuse `slamStamp`/`tickCounter` (`src/ui/juice.ts`) and `playStamp` (`src/ui/audio.ts`); add a distinct **warn** stamp style/sound.
- **`src/act1/counterfactual.ts`** — fork on the category/big-ticket decision (aggregate dock for the bucket; partial dock for warn). Keep the "same shock, opposite meaning" divergence description from `describeDamage`; reuse `forkAtDecision`.
- **`src/act1/archive.ts`** — adapt entries to category/big-ticket + three verdicts; keep the single midway nudge. The archive remains the *only* place the poverty-trap truth appears.
- **`src/act1/review.ts`** — **strip cohort/poverty-trap outcomes.** Performance only: score, rating/stars, alignment %, flags/warns, audit standing, promotion blurb.
- **`tests/act1.dom.test.ts`** — rewrite for the new verdict model, category/big-ticket rows, audit-event trigger, and performance-only review. Keep the DOM-cleanup `afterEach` (jsdom duplicate-id quirk).

### P2-M3 — Act 2 redesign: granularity, centered meter, slow strangle wired
- **`src/act2/run.ts`** — expanded allocation UI over the new action set (regular vs overtime shift, rest, errands/appointments, comforts, tier move) across ~5–6 slots — each week a real puzzle. **Center the capacity meter** as the visual focal point (large, animated), money/tier secondary. Wire the longer/slower pacing from P2-M1. Keep interface continuity (same case-file document system).
- **`src/ui/casefile.css`** — restyle the Act 2 header/stage so capacity is central and prominent; style the expanded allocation controls; keep the shared visual language.
- **`src/act2/clerk.ts`** — re-tune dock cadence/amount to the longer horizon; behavior (player's own flag rate) unchanged.
- **`tests/act2.dom.test.ts`** — update for the new allocation actions, longer runs, and the centered meter's presence; keep the run-to-ending and clerk-policy assertions.

### P2-M4 — Title menu, skip-to-Act-2, polish, verification
- **`src/main.ts`** — add a **title menu**: "Play from Act 1" / "Skip to Act 2 (playtest)" (default assumed flag rate, e.g. 0.6; optionally a small chooser). Replaces the current auto-start. Keep the act break (§7.1) between acts.
- Final juice/polish pass (warn stamp feel, audit-event beat, capacity-meter dread animation).
- Full verification (below).

---

## Critical files
- Engine: `src/engine/{types,config,engine,policies,simulate}.ts`, `src/sandbox.ts`
- Act 1: `src/act1/{cases,rubric?,aggregate?,kpi,desk,counterfactual,archive,review}.ts`
- Act 2: `src/act2/{run,clerk}.ts`
- Shared/UI: `src/ui/{casefile.css,juice,audio}.ts`, `src/main.ts`
- Tests: `tests/{engine,act1.dom,act2.dom}.test.ts`

## Reuse (don't rebuild)
- `forkAtDecision`, `runFull` (multi-modifier), `runCohort`, `footingShape` — `src/engine/simulate.ts`
- `renderLedgerThroughTurn` / `renderLedger` — `src/engine/ledger.ts`
- `Archive` class — `src/act1/archive.ts`
- `slamStamp`, `tickCounter`, `playStamp` (+ muffled) — `src/ui/juice.ts`, `src/ui/audio.ts`
- The sandbox monte-carlo harness for all re-tuning — `src/sandbox.ts`

## Design-doc deviations to record (update `means-design-settled.md`)
- §6.4: act-end screen is **performance-only**; cohort/poverty-trap pedagogy moves entirely to the counterfactual archive (arguably strengthens the §11.4 "you never see what your stamps did" horror).
- Binary stamp → **three-way** (approve/warn/flag); per-line → **category + big-ticket aggregation**.
- **Contextual rubric** (circumstances set the bar) is new.
- **Audit risk** becomes a real mechanic with a threshold audit event.
- Act 2 gains **action variety** and a **longer/slower** horizon; capacity meter **centered**.

## Verification
1. **Engine:** `npm test` — invariants hold under new config (determinism, escape rare, **restraint loses**, footing recovers iff escape, counterfactual asymmetry).
2. **Tuning:** open `sandbox.html`, run N=1000 — escape rare, stasis common, and **collapse takes many weeks of poor play** (confirm the slow strangle; suboptimal play should not zero out by week ~3).
3. **Act 1 feel:** `npm run dev` — 3 cases; decisions feel meaty and contextual; dependents visibly change the right call; per-decision feedback is legible; over-flagging tanks alignment; approving flaggable spend builds audit risk and eventually fires an audit event; review screen shows performance only.
4. **Act 2 feel:** capacity meter is centered/prominent; ~5–6-slot allocation offers real choices; the decline is a slow, visible strangle over many weeks (not a 3-week game-over).
5. **Menu:** title screen offers "Skip to Act 2" and it drops straight into a playable Act 2 run.
6. **Screens:** headless Chrome screenshots of the new Act 1 decision UI, the audit event, the performance review, the centered Act 2 layout, and the title menu.
7. **Static build:** `npm run build && npx vite preview` — both entry points serve.

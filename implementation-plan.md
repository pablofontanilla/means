# Means — PoC Implementation Plan (thin vertical slice)

## Context

`means-design-settled.md` is a settled design brief for *Means*, a two-act game about the poverty trap: Act 1 puts the player at a means-testing desk enforcing the folk theory on strangers' ledgers (scored and juiced for it); Act 2 makes them live one engine run from the inside, in the same interface, with the hidden capacity meter finally visible. The user wants a PoC to find out **how it feels**, kept technically simple.

Decisions confirmed with the user:
- **Scope:** thin vertical slice — engine + a short Act 1 (handful of cases, stamps, KPI, counterfactual ledger) + a short Act 2 run in the same UI. This is the only scope that tests the design's core bet: the act-break reveal via interface continuity.
- **Stack:** Vite + vanilla TypeScript, no framework. Static site output. The design's own aesthetic (§8: "portal-and-PDF bureaucracy", "means-testing is a web form now") makes plain HTML forms/tables the *native* medium, not a compromise.
- **Juice:** cheap-but-real pass — one good stamp sound (reused in Act 2 as the dread anchor, §7.2), simple stamp animation, ticking KPI counters. No more than that.

Everything is greenfield; the repo currently contains only the design docs.

## Architecture

The engine (§5) is a **pure, deterministic, seeded module** with no DOM dependency. This is load-bearing three times over:

1. **The counterfactual ledger (§6.3) requires forking a run.** Every consequential stamp must show *both branches*. Implementation: the sim must be re-runnable from a decision point with identical randomness, diverging only through state. Use a seeded RNG where each turn's draws come from a stream keyed by `(runSeed, turnIndex)` — so the flagged and approved branches see the *same* event cards and only their consequences differ. This is the "same shock, opposite meaning" asymmetry made computable.
2. **Act 1 is the tuning harness (§5.7).** A pure engine can be run headless 10,000× to check the pillar-4 constraint (winnable but rare) before any UI exists.
3. **Both acts render the same engine** — Act 1 from outside (ledger in, branches out), Act 2 from inside (turn by turn).

### File layout

```
means-poc/
  index.html            # the game (Act 1 → break → Act 2)
  sandbox.html          # headless tuning dashboard (dev-only page)
  src/
    engine/
      rng.ts            # seeded RNG with per-turn streams (e.g. splitmix/mulberry32)
      config.ts         # EVERY tuning number in one file (§13.5) — nothing hardcoded elsewhere
      types.ts          # RunState, EventCard, Outcome, LedgerLine, Stamp…
      engine.ts         # pure step(state, allocation, rng) → state; terminal checks
      events.ts         # event deck incl. desperation table; absorption asymmetry lives here
      simulate.ts       # runFull(), forkAtDecision() for counterfactual branches
      ledger.ts         # render a run's spending as legible ledger lines (§13.1)
    act1/
      cases.ts          # PoC caseload: ~8 authored case seeds (mix per pillar 8)
      desk.ts           # case-file view, stamping, timer, KPI state
      archive.ts        # the drawer: resolved case files with both branches
      review.ts         # act-end screen: performance review over cohort outcomes
    act2/
      run.ts            # turn loop UI: allocate → resolve → event → spend
      clerk.ts          # flavor clerk: quotes player's own Act 1 stamp policy (§7.5)
    ui/
      casefile.css      # the ONE visual language: forms, ledgers, stamps (§8)
      juice.ts          # stamp animation, counter ticks
      audio.ts          # stamp sound (Web Audio, single sample)
    main.ts             # act sequencing + the act break (§7.1)
  tests/engine.test.ts  # vitest: engine invariants + monte-carlo assertions
```

## Milestones (build in this order)

### M1 — Scaffold
`npm create vite@latest` (vanilla-ts), vitest, `sandbox.html` as a second Vite entry point. Verify `npm run dev` and `npm run build` produce a working static site.

### M2 — Engine + tuning sandbox (the foundation)
Implement §5 faithfully but with placeholder numbers in `config.ts`:
- **Capacity** (fast): restores from pleasure/rest, drains from shifts/tier/shocks, degrades shift yield and shifts event draws to the desperation table when low; zero = collapse.
- **Footing** (slow): leaky integrator `footing += α·(input − footing)`, input = f(Δcapacity, Maslow tier). Reports, never gates (§5.1).
- **Turn loop** (§5.2): allocate Money+Time (work / rest / restoration / tier-move — §10.1–2), resolve, draw event against current buffer, update meters, check the three outcomes (§5.5). 30-turn ceiling; "still trapped" is a distinct ending, not a win.
- **Events** (~12 cards for PoC): each resolves differently with vs. without slack (§5.3) — absorbed vs. cascade (forced borrow / missed shift / desperation table).
- **Invisible threshold** (§5.4): a function of accumulated slack vs. event variance, never surfaced in UI.
- **`forkAtDecision()`**: rerun from a stamp point with shared RNG streams → both branches for the counterfactual ledger.

**Sandbox page:** sliders bound to `config.ts` values, "run N=1000" button, outcome distribution (escaped/collapsed/trapped), footing-curve sparklines (plain canvas). This is where pillar 4 gets tuned before the game UI exists.

Tests (vitest, monte-carlo over fixed seeds): escape rate is >0 and <~15%; a "max restraint, never buy pleasure" policy loses more often than a restoration-buying policy (pillar 2 — the core economic claim, asserted in CI); footing recovers after escape but only after escape (§5.1).

### M3 — Act 1: the desk
- **Case file view:** identity strip, benefit level, ledger table with flaggable lines; per-line *approve*/*flag* stamps; a per-case timer for time pressure. HTML form aesthetic — fluorescent portal, not pixel art (§8).
- **Case = engine run:** pre-run turns 1..k to *generate* the ledger lines (via `ledger.ts`), player stamps, then simulate forward once per branch; flags dock the benefit per a simple rubric.
- **KPI layer:** flag streaks, speed bonus, accuracy vs. rubric, audit-risk that accumulates on approvals (asymmetric by design, §6.2). Held completely straight — no winking (pillar 6).
- **Counterfactual archive (§6.3):** resolved cases land in a drawer, one click away, showing both branches in the format of the §6.3 examples. Never forced on the player; a single clerk annotation midway nudges toward it (discovery pacing, §6.3).
- **Honest deck (pillar 8):** of ~8 PoC cases, 2–3 where the flag is genuinely correct (fraud/resale) and the sim vindicates it.
- **Act-end screen (§6.4):** glowing performance review side-by-side with cohort outcomes (collapse rates by flag rate, footing shapes). No commentary.

### M4 — Act break + Act 2: the case
- **The break (§7.1):** one screen, minimal text (layoff — simplest authoring choice for the PoC; final authoring is §13.3). Then Act 2 opens on the *same case-file component*, name strip = player's, stamp fields read-only.
- **The one new UI element (§7.4):** the capacity meter appears. Nothing else changes visually.
- **Turn loop UI:** the M2 engine driven interactively — allocate Money+Time, purchases appear as ledger lines *with the same flag-risk indicator the player spent Act 1 applying* (§7.2); flagged purchases dock next benefit.
- **Clerk (flavor only, §7.5):** periodic off-screen review using the player's own Act 1 flag-rate/policy; quotes their stamp record back as annotations. Plays the stamp sound *at* them.
- **Endings:** the three outcomes with the footing-shape epitaph (stabilized / freefall / just lifting) as flavor, not grade (§5.5).

### M5 — Juice pass (cheap-but-real)
- One tactile stamp sound (Web Audio for timing control; a single free/recorded sample), stamp slam animation, KPI counters that tick up with cadence. Reference register: sincere, zero irony (§6.5).
- The same sample, muffled/distant, for the Act 2 clerk moment — the doc's cheapest, highest-leverage beat.

## Content scope for the PoC (deliberately tiny)

~8 Act 1 cases, ~12 event cards, 3 Maslow tiers (§10.3), 1 act-break event, clerk flavor lines templated from stamp stats. All numbers live in `config.ts` and are placeholder-tuned via the sandbox, not authored to final quality. §13's content jobs (full caseload, act-length instrument, clerk-difficulty tuning) stay out of scope.

## Verification

1. **Engine:** `npm test` — invariant + monte-carlo assertions from M2 (esp. the pillar-2 assertion that restraint loses).
2. **Tuning sanity:** open `sandbox.html`, run 1000 sims, confirm outcome distribution matches pillar 4 (escape rare but real, stasis common).
3. **End-to-end feel check (the actual point):** `npm run dev`, play the slice start to finish — stamp ~8 cases, open the archive, hit the act break, play an Act 2 run to any of the three endings. The PoC succeeds if the act-break moment lands and hovering over an Act 2 pleasure purchase produces hesitation (v1 test #3, §7.6) — that's a human judgment, which is exactly why this PoC exists.
4. **Static build:** `npm run build && npx vite preview` — the whole game works as static files (deployable to GitHub Pages later).

# Testing

Vitest suite: **6 files, 47 tests, all passing** as of 2026-07-12
(act1-feedback-pass), ~3.5s total.

```bash
npm test          # vitest run
npm run test:watch
npx vitest run tests/engine.test.ts   # one file
```

## Suite layout

Two kinds of tests, split by environment:

- **Pure model tests** (node, no DOM): `engine.test.ts`,
  `act1.model.test.ts`, `scaffold.test.ts`.
- **DOM flow tests** (jsdom, per-file `// @vitest-environment jsdom`
  pragma): `act1.dom.test.ts`, `act2.dom.test.ts`, `menu.dom.test.ts`.
  These mount real controllers into a detached root and drive them by
  clicking buttons — full flows, not unit shims.

| File | Tests | What it pins |
|------|-------|--------------|
| `engine.test.ts` | 15 | Determinism (same seed → identical run; `step` doesn't mutate). Action semantics (overtime earns/drains more; appointment covered vs. uncovered). **Pillar assertions over 3,000-seed cohorts**: escape possible but <15%, trapped >50%, restraint escapes less & collapses more (>50%) than restoration. Footing ordering (escaped > trapped > collapsed; escaped runs read "lifting"). Fork correctness: pre-decision turns identical, same card absorbed in one branch and cascading in the other exists, approved branch ≡ un-docked run. Terminal conditions. |
| `act1.model.test.ts` | 17 | Category aggregation (restoration lines only; label→category map; omits empty buckets). Rubric: dependents raise allowances; `verdictFor` thresholds; the same $21 dining resolving flag/warn/approve across 0/1/2 dependents; big-ticket nature rules. KPI: alignment falls off with ordinal distance; over-flagging tanks it; audit risk accrues on under-called expected-flags and crosses the threshold exactly once; `flagRate` counts warns as non-flags; streak-inflated score can't out-rate an aligned shift; audited shift rates worse. Counterfactual: warn's half dock, fork run on the partial dock, truthful alternative text. |
| `act1.dom.test.ts` | 5 | Full desk drive-through (render → stamp all 3 cases → outcome callback; counterfactual per stamp; archive badge). Audit interstitial: fires once on crossing, pulls the earliest under-called prior determination, gates the queue, swallows clicks behind it. **Audit re-review visibility**: the fresh determination re-slams the original case-file row with an "amended under audit" annotation and tags the archive entry amended (exactly one, newest-first). **Mid-timeout audit deferral**: drives the production `timeout()` path by capturing the rAF tick and jumping `performance.now` — no internals poked. Performance-only review screen (no cohort tally; stars/alignment/audit). |
| `act2.dom.test.ts` | 3 | Week loop to a terminal ending with the capacity meter present throughout; clerk note appears. Slot-budget clamp: mashing every stepper's "+" holds total at `timeSlotsPerTurn` (regression guard — errands once sat outside the clamp). Clerk math: punitive flag rate docks more; notes quote the player's record. |
| `menu.dom.test.ts` | 6 | Title menu paths: cover page renders, skip-to-Act-2 default rate 0.6, chooser rate passes through (via a `vi.mock` that wraps the real `runAct2` in a spy), Play-from-Act-1 mounts the desk, Act 2 ending returns to the menu. |
| `scaffold.test.ts` | 1 | Harness smoke test (historical, from M1). |

## Conventions

- **No mocking of game logic.** DOM tests run the real engine, real
  caseload, real KPI — `menu.dom.test.ts`'s spy-wrap of `runAct2` (calls
  the real implementation, asserts the args) is the only mock, and it
  exists to assert a cross-module contract, not to fake behavior.
- **Stub only the platform.** jsdom lacks rAF, AudioContext, and canvas
  2D: tests stub `requestAnimationFrame`/`cancelAnimationFrame`, make
  `getContext` return null, and `audio.ts` fails silent by design
  (try/catch around `AudioContext`).
- **Clear the DOM between tests** (`afterEach` empties `document.body`):
  jsdom resolves `#id` selectors document-globally, so leftover roots
  with duplicate ids break scoped queries. The real app mounts once
  under `#app`.
- **Statistical assertions use generous margins** (e.g. escape in
  (0, 0.15), lifting > 0.8) over fixed 3,000-seed cohorts
  (`seedRange(1, 3000)`) — deterministic, so they are not flaky, but the
  margins keep small config tweaks from thrashing CI.
- Time-dependent desk behavior is tested by mocking `performance.now`
  and invoking the captured rAF tick — the timer path runs for real.

## Authoring workflow: verifying caseload changes

When touching `rubric.ts`, `cases.ts`, seeds, or `DEFAULT_CONFIG`, dump
the full expected-verdict table to confirm every case still teaches what
it should. Pattern (temp file, run, delete — or keep the numbers in the
relevant project doc):

```ts
// tests/scratch-dump.test.ts
import { test } from "vitest";
import { buildCaseload } from "../src/act1/cases.ts";

test("dump rubric table", () => {
  for (const c of buildCaseload()) {
    console.log(`\n=== ${c.name} (deps=${c.circumstances.dependents}) ===`);
    for (const i of c.items) {
      console.log(`${i.kind} ${i.label} $${i.spend} bar=[${i.bar.allowance},${i.bar.excess}] expected=${i.expected} truth=${i.truth}`);
    }
  }
});
```

A snapshot of the current table lives in
[projects/act1-feedback-pass/feedback-decisions.md](../projects/act1-feedback-pass/feedback-decisions.md).
Seeds are hand-picked so flag-branch forks show real downstream damage —
after config/policy changes, also spot-check `resolveItem` output for the
big tickets (the "held this period" fallback text firing everywhere means
the seeds no longer bite).

## Known gaps

- `archive.ts` rendering is only asserted via the badge count; entry
  grouping/text has no direct test (relevant: grouping-by-case is queued).
- `counterfactual.ts` `describeDamage` branch texts (collapse line, the
  "held this period" fallback) are exercised indirectly but not pinned.
- `sandbox.ts` is untested (dev-only page, acceptable).
- No visual/CSS regression coverage; juice (`slamStamp`, `tickCounter`)
  and audio synthesis are untested beyond not crashing in flows.

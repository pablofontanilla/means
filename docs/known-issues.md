# Known Issues & Fragilities

Everything the 2026-07-12 codebase deep dive surfaced (commit `03c69b9`,
suite green at 46/46). Companion to [code-map.md](code-map.md),
[architecture.md](architecture.md), and [testing.md](testing.md). Items
marked *queued* have a checklist entry in
[projects/act1-feedback-pass](../projects/act1-feedback-pass/CLAUDE.md).

## Confirmed bugs

1. **Audit re-review is invisible in the case-file UI** — *fixed*
   (act1-feedback-pass). `fireAudit` (`src/act1/desk.ts`) now re-slams the
   original row when the pulled determination is on the case currently on
   screen (`restampOriginalRow`), adding an "amended under audit — previously
   …" annotation; `Archive.add` takes an `amended` flag and tags the entry
   ("Amended under audit") instead of filing a look-alike duplicate.
   Pinned by a DOM test in `tests/act1.dom.test.ts`.

## Fragile couplings (correct today, easy to break silently)

2. **Ledger↔aggregate label join key.** `RESTORATION_LABELS` in
   `src/engine/ledger.ts` and `CATEGORY_BY_LABEL` in
   `src/act1/aggregate.ts` are joined by raw label strings. A new or
   renamed label without a mapping silently falls into "Entertainment" —
   no error, wrong bucket. Directly in the blast radius of the small-item
   rebalance. Mitigation candidates: derive both from one shared table, or
   make the fallback loud in dev.

3. **Case seeds are coupled to config and policy.** The `CASELOAD` seeds
   (`src/act1/cases.ts`) were hand-picked so flag-branch forks show real
   downstream damage under `DEFAULT_CONFIG` + `makeRestorationPolicy`.
   Any change to either invalidates the choices — symptom: counterfactuals
   read "Tighter margins, but held this period" everywhere (the fallback),
   and the archive's pedagogy dies quietly. After tuning, re-dump the
   rubric table and spot-check `resolveItem` output (workflow in
   [testing.md](testing.md)).

4. **Audit interstitial assumes one crossing per shift.**
   `crossesAudit` fires only on the below→at/over transition, and nothing
   ever lowers `auditRisk`, so a second crossing is impossible today. If a
   risk-decay or risk-reset mechanic is ever added, the single
   `pendingAudit` slot and the once-per-shift assumption in `desk.ts` need
   revisiting.

## Design-level debt (behaving as coded, flagged by playtest)

5. **Big-ticket amounts are ignored by the rubric** — *future, queued in
   the backlog*. `bigTicketBar` lets nature (essential/luxury/mixed) fully
   determine the verdict; a $150 console and a $600 console read
   identically. Playtest feedback says amounts must matter (a $12 meal is
   fine, a $120 one is not). Planned shape: nature sets a *ceiling*
   instead of the answer, plus believable spend distributions to replace
   the $7–28 toy sim totals.

6. **Case Archive legibility** — *queued*. Flat reverse-chronological
   list; with ~15 entries the both-branches pedagogy drowns and the drawer
   reads as a debug panel. Grouping by case ID is the queued fix; the
   deeper personalization pass (recurring faces, manila/photo aesthetic)
   is in the future backlog.

7. **Rubric/desk-policy constants live outside `config.ts`.** `BASE`,
   `DEP_BUMP`, `EXCESS_FACTOR` (`src/act1/rubric.ts`) and the audit
   weights/threshold (`src/act1/kpi.ts`) are module constants — a
   deliberate exception to the "every tuning number in config" rule
   (they are desk policy, not world simulation). The rebalance pass will
   tune exactly these numbers; if that wants sandbox sliders or per-case
   variation, move them into config then.

## Accepted limitations (deliberate, documented so nobody "fixes" them)

8. **Act 2 is non-reproducible.** Seeds from `Date.now() & 0xffff`
   (`src/act2/run.ts`) — the claimant lives an unrepeatable life, by
   design. If replays/sharing ever matter, thread a seed through
   `Act2Context`; the engine already supports it.

9. **The RIF is unconditional.** The layoff fires after the last case
   regardless of performance (`src/menu.ts`) — thematically intended
   (your rating never mattered), but it currently lands as sudden; the
   foreshadowing memo is an open question in the feedback pass.

## Test coverage gaps

Full list in [testing.md](testing.md) "Known gaps"; the ones that overlap
this pass's work — archive entry rendering/grouping and the re-review's
effect on the case-file row — should land together with their fixes
(*queued*). Remaining: `describeDamage` branch texts unpinned,
`sandbox.ts` untested (acceptable, dev-only), no coverage of juice/audio
beyond not crashing.

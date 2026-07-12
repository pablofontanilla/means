# Design Document — *Means*
### A game about the poverty trap, played from both sides of the desk

**Status:** Settled design brief. Consolidates and supersedes *"Base"* (single-run) and *"Means — two acts"* (iteration). This is the standalone reference for the implementation plan. Architecture and structure are settled; a bounded set of tuning numbers and content-authoring jobs remain open and are isolated in §13.
**Format:** Turn-based. Two acts, one playthrough per act pair. Single continuous run — no meta-progression.
**Platform:** Open (HTML-only restriction lifted). Engine choice is an implementation question; the design assumes screenshake-grade control over feedback timing and load-bearing audio (§9).
**Lineage:** Openly downstream of *Papers, Please*. We differentiate on mechanics (§11.4), not by hiding the debt, and we do not copy the aesthetic.

---

## 1. Thesis

The folk theory this game exists to dismantle:

> "The poor would escape if they just showed restraint and skipped small pleasures."

This sentence is the enemy. But the key insight — the one that shapes the entire two-act structure — is that **this is not a belief about economics. It is a judgment about other people, made from an information-poor outside view.**

An earlier design tried to refute the sentence by handing the player the inside view from turn one. That failed on its own terms: it made the pleasure purchase legibly load-bearing (an upkeep mechanic, genre-familiar, never tempting to condemn), so the player never occupied the judge's seat and there was never a judgment to dismantle. **You cannot overturn a judgment the player never made.**

The design therefore has two jobs, in order:

1. **Act 1 installs the judgment mechanically.** The player is paid, scored, and juiced for enforcing the folk theory on strangers reduced to ledgers — the exact epistemic position the folk theory is spoken from.
2. **Act 2 overturns it from the inside**, using the *same interface*, with the hidden state finally visible, and with the player's own Act 1 conduct as the antagonist.

**One-line takeaway:** *The judgment was cheap because the information was missing — and the information was missing by design.*

The economic lesson underneath survives, but it is now the **second** lesson, delivered to a player who spent an act punishing people for acting on it:

> *The same shock that's survivable with slack is fatal without it — and staying operational costs money you also need to escape.*

The governing rule for the whole project: **players believe mechanics, not text boxes.** If the mechanics say "the pleasure is the leak that killed you," no framing rescues it. So the mechanics must say the opposite — the pleasure is what kept the engine running long enough for escape to be possible at all — and they must *show* it, not narrate it.

---

## 2. Design pillars (non-negotiable)

1. **Mechanics enforce the economics.** The thesis is structural, not moral. No mechanic may reward "endurance/restraint" as the path out.
2. **Pleasures are load-bearing, not a leak.** Skipping restoration degrades *capacity to function*, not just a comfort bar. The pleasure spend keeps you operational; it is not the thing stopping escape.
3. **Two-layer variance, never one.** Layer 1: RNG gates whether you accumulate slack fast enough. Layer 2: slack gates *what a shock means*. One-layer RNG is a slot machine, and a slot machine teaches "bad luck / not my fault / the winners were just better" — victim-blaming from the winner's seat. We reject it.
4. **Winnable but rare.** Escape must be reachable or the player feels cheated and the trap isn't demonstrated. It must be *hard*, gated by luck at the margin, so a min-maxer can't reliably solve it.
5. **Stasis is a real outcome.** The trap isn't death; it's *not moving*. Surviving to the clock without escaping is its own ending and must never read as victory.
6. **Complicity must be sincere.** Act 1's satisfaction is real, not parodic. The satire lives in the *situation*, never in the feedback layer. The player must genuinely enjoy the KPI — unironically pursued dopamine — or there is no sincere judgment for Act 2 to indict. Exaggerated, winking gamification is legible as satire; satire is distance; distance lets the player *perform* the critique instead of earning it. (Full argument in §8.)
7. **The counterfactual is a resolution rule, not a text box.** Every consequential resolution shows both branches. This is the differentiator from the lineage (§11.4) and the mechanism that delivers the two-layer-variance lesson to *every* player, median run included — where the original design delivered it only to rare winners.
8. **The deck must be honest.** Fraud exists; some flags are genuinely correct; the sim must sometimes vindicate the player's denial. A deck that never vindicates the desk is rightly dismissed as rigged, and the counterfactual ledgers persuade only if the player believes the sim isn't stacked.

---

## 3. Structure at a glance

The game is a single continuous experience with three components:

- **The engine (§5):** a turn-based simulation of one person in the poverty trap — capacity, footing, shocks, an invisible escape threshold, three outcomes. It runs underneath *both* acts.
- **Act 1 — The Desk (§6):** the player is a means-testing case worker. Each case file they review *is* a full engine run, viewed from outside. Their stamps are inputs to that sim. They are scored by the institution for enforcing the folk theory.
- **Act 2 — The Case (§7):** the player lives one engine run from the inside, rendered in the same interface they used at the desk — now with the previously-hidden state visible, and their own Act 1 policy as the reviewing clerk.

Act 1 doubles as the **tuning harness** for Act 2: every case is an engine run, so cohort-scale balancing happens before the player ever plays from inside (§5.7).

---

## 4. Why the desk, and why two acts

**Why the desk frame** rather than an intimate one (e.g. a sibling sending remittances home): **judgment needs distance to form.** An intimate frame triggers sympathy too early — the player already knows and is already inside the story. The desk provides a caseload of strangers reduced to line items, which is exactly the information-poor position the thesis targets. The intimate frame is not discarded; it is a candidate for a later act or a different game.

**Why two acts:** the judgment must be *installed* before it can be *overturned*. Act 1 is not throat-clearing — it is the mechanism that gives Act 2 something to act on. A player who never enforced the rubric has no complicity for Act 2 to turn against them.

---

## 5. The engine (runs underneath both acts)

This is the simulation of one person in the trap. In Act 1 it runs invisibly, once per case, and the player sees only its inputs (the ledger) and, on resolution, both of its branches (the counterfactual). In Act 2 the player *is* the engine, and sees its state directly.

### 5.1 The two meters

Two separate state variables at two different speeds. Keeping them separate is load-bearing; merging them rebuilds the folk-theory loop.

**Capacity — the fast meter (the throttle).**
- **Speed:** fast. Rises quickly with restoration/pleasures; falls quickly under brutal conditions (back-to-back shifts, bad living situation) and shocks.
- **Function:** it is the engine. When depleted it **degrades shift yields** (exhaustion → you earn less) and **worsens the event table** (desperation → you draw from a nastier distribution and make worse forced choices).
- **Loss condition:** **capacity hits zero → collapse → the run ends.** This is the *only* playable loss meter. (We don't need to define what "collapse" means narratively.)
- **Restored by:** small-pleasure purchases and rest — the "temptation goods," the thing an outside eye calls irrational.

> **Design note.** Capacity is where the "you should've saved" intuition gets refuted: cutting restoration to save money accelerates the capacity spiral, which lowers yields and worsens events, which costs *more* than you saved. The pleasure isn't weakness; it's keeping the machine on.

**Footing — the slow meter (the epitaph).**
- **Speed:** slow. A **leaky integrator** (exponential moving average / low-pass filter) with a large time constant τ.
- **Input:** not instantaneous capacity, but the **trend** of capacity (its derivative) and your Maslow tier. Sustained decline drags footing down even when a pleasure purchase briefly props capacity's *level*.
- **Not a loss condition. Not a win condition. It gates nothing. It reports.**
- **Behavior:**
  - *In a trapped run:* grinds down. Pleasures stabilize the *derivative* (slow the fall) but can't outpace the structural drain, so the input stays net-negative and footing keeps sliding. **You cannot buy your way to "content" inside the trap.**
  - *After structural escape:* the input flips (Maslow tier lifts → structural drain drops → capacity trend turns non-negative), and the leak lets footing slowly *forget the bad past* and climb. Recovery is real but lagged by τ.

> **Why leaky, not a true integral.** A true integral never forgets — turn-1 misery would weigh as much as turn-29, so late recovery could never register and early bad luck would be permanently determinative. The leak is exactly what makes post-escape recovery possible *and* what makes it only possible after escape (nothing else changes the sustained input).
>
> **Why footing must not be the win condition.** A leaky integrator crossing a fixed line is trivially gamed: end on a few lucky turns and cross it. That would let recent good luck *launder a trapped run into a win* — the aestheticized-recovery lie ("a contented poverty") we explicitly refuse. Footing scores the run; it never gates it.

**Update sketch (for tuning, not final):**

```
Δcapacity_t   = restoration_t − structural_drain_t(Maslow tier, shifts) − shock_t
capacity_t    = clamp(capacity_{t-1} + Δcapacity_t, 0, MAX)

input_t       = f(Δcapacity_t, Maslow_tier_t)      # the "derivative" + tier
footing_t     = footing_{t-1} + α · (input_t − footing_{t-1})   # small α = slow
```

`α ≈ 1/τ`. Small α = long memory = the slowness we want.

### 5.2 The core loop of a single run

Turn-based. Each turn, roughly:

1. **Allocate** the turn's resources (see §10 — Money + Time).
2. **Resolve** the shift/effort chosen → capacity and money change.
3. **Draw an event** → resolved *against current buffer* (§5.3).
4. **Optionally spend** on restoration / small pleasures.
5. **Meters update** (§5.1). Check terminal conditions (§5.5).

Target run length ≈ **30 turns as a tuning ceiling**, but run length is *emergent*: the real number is how long you keep capacity off the floor. There is deliberately **no "survive N turns → win."**

> **Why short / small-N.** Variance dominates a short run, and that is the point — you play one noisy run, not the expectation. A long game lets a patient player grind out the mean and escape reliably, which teaches "just be disciplined." We want the law of large numbers to **not** save you.

### 5.3 Shocks & absorption asymmetry (the empathy generator)

Events are **not flat-magnitude.** The same event card does categorically different things depending on buffer/slack:

- **Drawn with slack:** absorbed and forgotten. A rounding error.
- **Drawn at low reserves:** it **cascades** — forces a high-interest borrow, a missed shift, or drops you into the desperation event table.

*Same event, same magnitude, opposite meaning.* A $400 car repair is nothing to a household with savings and a solvency event to one without. **That asymmetry is the trap.**

For the player escaping from the inside (Act 2), they will *feel the moment the same card stops being lethal* — not because they got smarter, but because they crossed enough of the threshold to have slack. This stops the winner from crediting their own skill; the lesson fires hardest in the *winning* run. (In Act 1, this same asymmetry is surfaced on *every* case via the counterfactual ledger — §6.3 — rather than left to be inferred by rare winners.)

### 5.4 The invisible threshold / escape

- Escape = crossing a **structural line**: enough accumulated slack that shocks stop being lethal.
- The threshold is **invisible** and **not a single static value** — it's a function of the *variance of events*. There is no "you're almost out of poverty" notification, because there isn't one in life.
- It is **capacity-side and RNG-gated at the margin.** Luck decides whether you accumulate slack fast enough before a cascade zeroes capacity.
- It should be *inferable* from resource states (a careful player senses room) but **never labeled**.

### 5.5 The three outcomes

| Outcome | Trigger | Reads as |
|---|---|---|
| **Escaped** | Crossed the structural line before capacity zeroed | **Win** (rare). Footing begins its lagged climb. |
| **Collapsed** | Capacity hit zero | Loss. Footing is low — the epitaph of a run spent surviving. |
| **Still trapped** | Reached the turn ceiling without crossing the line | **Not a win.** Stasis — you kept the engine running and stayed exactly where you started. The truest non-escape ending. |

The game-over screen **grades the *shape* of footing** — stabilized / freefall / just beginning to lift — as epitaph/flavor, **not** pass/fail. This gives the ending meaning about *trajectory* without making footing the gate.

> The "still trapped" ending is the thesis in its purest form and must be authored so it never feels like a consolation win. Kept the machine running for 30 turns, spent every pleasure exactly right — and you're in the same hole.

### 5.6 Two engine modifications carried from the original design

**Modification 1 — counterfactual visibility is now core, not a patch.** The original design *hid* the absorption asymmetry and hoped rare winners would infer it. Both acts now display it as a resolution rule (pillar 7, §6.3).

**Modification 2 — the lagged/noisy skip-cost tuning is no longer load-bearing.** It was originally proposed to make restraint tempting inside a single-frame game. The temptation is now installed socially and diegetically (§7.2), so the capacity model can stay **honest and legible** rather than deceptively lagged. Some lag remains *naturally* (capacity decline degrades yields on subsequent turns), but the design no longer depends on hiding the bill.

### 5.7 Act 1 as tuning harness

Because every Act 1 case is a full engine run viewed from outside, Act 1 doubles as the tuning harness for Act 2. Every balancing question in §13 gets exercised at cohort scale — across the whole caseload — before the player ever plays a run from inside.

---

## 6. Act 1 — The Desk

### 6.1 Frame

The player is a **means-testing case worker.** Their job, literally, is enforcing the folk theory: review benefit recipients' ledgers, flag "non-essential" spending, condition or dock benefits, hit quota. The institution's rubric *is* the enemy sentence from §1, operationalized.

### 6.2 The loop

Per case (several cases per shift, several shifts per act):

1. **A case file arrives:** identity strip, benefit level, income record, and the period's **ledger** — line items only. Rent, groceries, a phone plan, a $9 purchase at a bar, a lottery ticket, a streaming subscription, a child's birthday cake.
2. **The player reviews under time pressure** and stamps each flaggable line: *approve* or *flag*. Flags dock the recipient's next benefit payment per the rubric.
3. **KPI feedback fires immediately:** flag streaks, speed bonuses, accuracy score against the institution's rubric, shift-end rating. Approving too much accumulates **audit risk** — the institution's pressure is asymmetric by design, because that is true of the real institution.
4. **The case resolves in the background.** Underneath every case file is a full engine run (§5). The player's stamps are inputs to that sim.
5. **The counterfactual ledger updates** (§6.3).

Denial must be **genuine skill expression** — pattern-reading, rubric mastery, time management — not a strawman the player clicks through. If the desk isn't good *as a game*, Act 1 is a lecture with extra steps.

### 6.3 The counterfactual ledger — the core mechanic

Every stamped decision, once resolved by the sim, writes **both branches** into the case file, which remains accessible in a drawer/archive:

> **Line 14 — $9, Rosie's Bar. FLAGGED.**
> Retained: $9. Benefit docked $40 per rubric 7(c).
> *Branch as played:* Week 3 — capacity below threshold, two missed shifts, −$180. Week 4 — case escalated to crisis table. Emergency loan at 31%.
> *Branch if approved:* absorbed. No downstream events.

And symmetrically, for the honest deck (pillar 8):

> **Line 3 — $220, electronics. FLAGGED.**
> *Branch as played:* no capacity impact. Resale detected week 2. Flag correct.

This is the engine's absorption asymmetry (*same event, opposite meaning depending on buffer*) made **visible on every resolution instead of inferable from a rare winning run.** The player's own play generates the dataset that refutes the player's play. The KPI keeps climbing while the archive rots — and that gap, growing turn by turn, is the pedagogy. The institution's score is the text box; the ledgers are the mechanics; the player learns to distrust the score.

**Discovery pacing:** counterfactuals are not shoved in the player's face on case one. They live in the archive — one click away, then surfaced progressively (a clerk's annotation, an audit that forces the player to reread an old file). The player should *choose* to start reading them. **The moment a player opens the archive unprompted mid-streak is the moment Act 1 is working.**

### 6.4 What Act 1 measures (and refuses to do)

- **Act 1 asks nothing.** No dialogue box ever invites reflection. The game's only voice is the institution's, and the institution is delighted with you.
- The act-end screen is a **glowing performance review laid over cohort outcomes:** collapse rates by flag rate, footing-shape graphs (stabilized / freefall / just lifting) for the entire caseload. The two artifacts are presented side by side without comment.
- **Primary telemetry / v1 test:** does the player's flag rate drop across Act 1 *even though the KPI punishes the drop*? A dropping flag rate is a sincere judgment being overturned by evidence, at personal (score) cost. That is the whole act in one metric.

*(Pass 2 revised the act-end screen: performance-only, no cohort overlay — see the appendix, "Pass 2 revisions".)*

### 6.5 The juice arc: player-triggered decay, not authorial exaggeration

The feedback layer is tuned to be **genuinely excellent and held completely straight for the entire act.** The reference register is *Balatro* / the *Papers, Please* stamp: sincere, tactile, zero irony in presentation.

The rejected alternative — exaggerated, parodic gamification over bland assets — fails twice: (a) it is legible as satire and creates ironic play (pillar 6); (b) that exact pairing is the coded visual grammar of predatory F2P, which pre-frames the institution as villain before case one and pre-loads the conclusion the player is supposed to earn.

If the presentation has an arc, it is **player-triggered decay:** once the player has read enough counterfactual ledgers, the streak fanfare *doesn't change at all* — and that is what becomes unbearable. The juice staying cheerful while the player knows what it's scoring is colder than any authored wink.

---

## 7. The act break, and Act 2 — The Case

### 7.1 The act break — a diff, not a cutscene

Between acts, one event: the player's circumstances change (layoff, medical event — the specific is an authoring question, §13). No montage, no tonal pivot, minimal text.

The reveal mechanism is **interface continuity:** Act 2 opens on the *same case-file UI the player has used for an act* — except the name strip is theirs, and the stamp fields are read-only.

### 7.2 Act 2 frame

The player now lives one engine run (§5) from the inside, rendered **in the interface they used to wield.**

- Their purchases appear as **line items with the same flag-risk indicator** they spent Act 1 applying to strangers.
- Their benefit is means-tested. **Spending is visible to a clerk.** Flagged purchases dock next period's benefit — restraint is institutionally incentivized *inside the fiction*, which is simply true of means-tested welfare.
- Periodically the clerk reviews their file: the player hears the **stamp sound** — the one that used to pay them dopamine — happening *to* them, off-screen, from the other side of a desk they cannot see.

### 7.3 Why this solves the original temptation problem

The original design's fatal flaw was that restraint was never tempting, so its failure taught nothing. Act 2 installs the temptation **twice over, without fragile tuning:**

1. **Socially:** the player spent an act being scored and juiced for flagging exactly the purchase they are now hovering over. The judgment lives in their head; the mechanic doesn't have to manufacture it.
2. **Diegetically:** the purchase carries real flag risk and real benefit consequences. Skipping the restoration is a mechanically live, incentivized option — *and still the trap*, because the capacity spiral (§5.1) costs more than the flag would have.

The pleasure purchase is now what it is in the world: **load-bearing and punished.**

### 7.4 The one new UI element: the hidden state

Act 2's interface is Act 1's interface **plus the capacity meter** — the variable the desk never displayed. That diff *is* the thesis as UI: the judgment was made on the ledger; the truth lived in the column the form didn't have. Nothing else visually distinguishes the acts (§8).

### 7.5 The clerk is you (ships as flavor; difficulty-parameter version deferred)

**The mechanic:** the Act 2 clerk's flagging behavior reflects the player's own Act 1 stamp record. Your policy, learned from your play, applied to your life. Complicity becomes mechanical rather than merely psychological: a punitive Act 1 player faces a punitive clerk; a lenient one — who paid for leniency in KPI and audit risk — faces a gentler review.

**The tension, stated honestly:** as a *difficulty parameter*, this risks teaching *"individual kindness solves it,"* which undermines the structural thesis. The counterweight is in the engine: even a maximally lenient clerk modulates *one* pressure. The structural drain, the shock table, and the invisible threshold remain untouched — a lenient-clerk run is *less brutal, still trapped by default.*

**Settled scope decision:** the **flavor version ships in v1** — the clerk quotes the player's own annotations and stamp policy back at them, as texture, without meaningfully shifting difficulty. The **difficulty-parameter version is deferred** until tuning proves that clerk leniency can shift the outcome distribution *without ever breaking the trap* (§11.3, §13). If it can't be tuned to hold, it never becomes a difficulty parameter — it stays flavor.

### 7.6 Self-flagging (emergent, to be verified)

If interface continuity works, players will **hesitate over purchases while mentally running the clerk's rubric on themselves** — because the game trained them on that rubric for an hour. Internalized surveillance as an emergent mechanic is poverty-specific in a way no neutral skin could produce, and it costs zero authoring. v1 test #3 (§12) checks for it.

---

## 8. Aesthetic direction

- **One visual language for both acts.** Forms, ledgers, stamps, memos — a bureaucratic document system. The game *is* its interface.
- **Continuity is the statement.** The rejected alternative — a warm, analog, "human" aesthetic for Act 2 against Act 1's cold forms — is more expressive and *wrong*, because it re-separates the two worlds the design exists to fuse. The desk view and the lived view are the *same data*, differing only in which columns you're shown. Two art directions would say they are different places. (That continuity is also the cheap option is the second reason, not the first.)
- **Feedback layer:** sincere, excellent, straight (§6.5). Bland *assets* are fine — the documents should feel institutional — but the *feel* (stamp weight, streak cadence, sound) gets real game-feel budget. Different axes: **drab fiction, great hands.**
- **Not the *Papers, Please* aesthetic.** No Eastern-bloc pixel pastiche, no booth. A contemporary, fluorescent, portal-and-PDF bureaucracy is both truer to the subject (means-testing is a web form now) and visually distinct from the lineage.

---

## 9. Platform & audio consequences

- **Audio is load-bearing, not deferred.** The stamp sound is a core mechanic twice over: dopamine anchor in Act 1, dread anchor in Act 2 (same sample, other side of the desk). Budget it like a mechanic.
- **Game-feel tuning is real work** (pillar 6 demands it). The design assumes screenshake-grade control over feedback timing. Engine/framework choice is an implementation question, out of scope here.
- **The interface-continuity strategy keeps asset cost low regardless of platform.** Lifting the HTML-only restriction buys *feel and sound*, not art scope. Resist spending it on art.

---

## 10. Settled decisions (resolved from prior leans)

These were open in the prior docs and are now settled for the implementation plan.

1. **Resource-allocation layer: Money + Time.** Capacity absorbs the "energy" role — energy as a separate resource overlapped too heavily with the capacity state and invited player confusion about what capacity is. Time is expressed through the turn structure and the per-turn allocation of shifts vs. rest vs. errands. Money is the spend/earn resource. This keeps decisions per turn meaningful without a third meter competing with capacity.
2. **Concrete turn actions (Act 2):** work a shift, rest, spend on restoration/pleasure, and attempt a life-improvement/tier move — allocated against the Money + Time budget each turn. Exact action list and costs are tuning (§13), but the axis is settled.
3. **Maslow tiers: start with 3.** A tier change alters the structural drain (the input that lets footing recover). Tier count and costs remain tunable, but 3 is the starting structure, not "unspecified."
4. **Act 2 protagonist: "you," the case worker, post-layoff.** Cleanest interface continuity, strongest complicity. A *case the player flagged in Act 1* is held only as a possible epilogue vignette — it breaks first-person continuity and risks reading as punishment-theater, so it is not the main Act 2 spine.
5. **Clerk-is-you: flavor version ships; difficulty-parameter version deferred** (§7.5).
6. **Name: *Means*** (means-testing / means to live / by any means). Working title; alternatives *Casework*, *Approved*, *Rubric* are parked, not active.
7. **Platform: open, audio load-bearing** (§9).

---

## 11. Risks (the ones that would kill it)

### 11.1 Satire distance / ironic play
If the player smells authorial contempt for the desk by case three, they flag "for the bit" and the flag-rate metric measures a performance, not a judgment. Mitigations: pillar 6 (sincere juice), pillar 8 (honest deck — the rubric must sometimes be *right*), and making the desk mechanically deep enough to absorb genuine mastery.

### 11.2 Didacticism
The two-act structure telegraphs; some players predict the flip. Partial acceptance: predicting the flip is not the same as being inoculated against it — *Papers, Please* players knew the game was "about" complicity and were complicit anyway, because the loop paid them. The defense is **loop quality, not concealment.**

### 11.3 Kindness laundering (clerk-is-you)
If a lenient Act 1 measurably "solves" Act 2, the game teaches individual virtue over structure. Hard tuning constraint: clerk leniency must shift distributions, never break the trap. Enforced by shipping the flavor version and gating the difficulty-parameter version behind that constraint (§7.5).

### 11.4 Lineage
Visibly downstream of *Papers, Please* — accepted, not hidden. The differentiation is mechanical and it is exactly the thesis: **PP never shows you the counterfactual.** Its horror is that you never learn what your stamps did. This game's entire argument lives in the counterfactual — same shock, opposite meaning — so the both-branches case file isn't just a mechanic, it's the reason this game needs to exist next to its ancestor.

### 11.5 Act 1 length
Long enough to install sincere judgment and real KPI attachment; short enough that a player who "gets it" early isn't held hostage. Candidate instrument: flag-rate trajectory modulates Act 1's length (the institution "promotes you to review" — i.e. the act ends — after a fixed shift count, but archive engagement can unlock the break early). Instrument unresolved — §13.

---

## 12. Scope for v1 & the v1 tests

**Ship:**
- Both acts, one visual language, the inherited engine (§5).
- The counterfactual ledger (§6.3) as a resolution rule on every consequential stamp.
- The honest deck with a tuned fraud/correct-flag rate (pillar 8).
- The performance-review-over-cohort act-end screen (§6.4) and the footing-shape epitaph (§5.5).
- Act 2 with the clerk in **flavor form** (§7.5).
- Load-bearing stamp audio (§9).

**Defer:**
- Clerk-is-you as a difficulty parameter (until §11.3 tuning is proven).
- The intimate / remittance frame.
- Meta-progression.
- Localization.

**The three v1 tests** (a run of the design succeeds if these hold):

1. **Does flag rate drop across Act 1 despite the KPI punishing the drop?** If it fails, Act 1 is a lecture.
2. **Does Act 2 hurt more because of what the player did at the desk?** Instrument: compare Act 2 affect/behavior between players with high vs. low Act 1 flag rates. If it fails, the acts aren't fused.
3. **Does the player self-flag in Act 2?** Instrument: hover/delay time on flaggable purchases relative to non-flaggable spending. If it fires, the game produced something no neutral skin could.

The original two tests survive underneath, applied inside Act 2: *does a losing player understand why they'd have bought the pleasure, and does a winning player fail to credit their own cleverness?*

---

## 13. Open questions & tuning (the next conversation)

Everything above is settled. These are genuinely unresolved and are the content/tuning work for the implementation phase:

1. **Act 1 case authoring** — the biggest content job. How many cases; the distribution of honest-flag vs. trap-flag cases (pillar 8); how the sim's parameters render as legible ledger lines.
2. **Clerk-is-you tuning** — can clerk leniency shift the Act 2 outcome distribution *without* breaking the trap? Determines whether §7.5's difficulty-parameter version is ever unlocked.
3. **The act-break event** — authoring the circumstance change (layoff / medical / etc.) without melodrama (§7.1).
4. **Act 1 length instrument** — fixed shift count vs. archive-engagement-unlocked early break vs. flag-trajectory modulation (§11.5).
5. **Numbers** — τ / α for footing; capacity MAX and drain rates; the threshold-as-variance-function shape; shift yields; restoration costs; Maslow tier costs and their effect on structural drain; audit-risk asymmetry curve. Now partially answerable at cohort scale via Act 1's tuning harness (§5.7). Tuning, last.
6. **Epilogue vignette** — whether to include the "play a case you flagged" epilogue (§10.4) as an optional coda.

---

*§§1–12 reflect the settled design. §13 is where the next conversation lives.*

---

## Appendix: Pass 2 revisions (playtest-driven) — 2026-07-12

Deviations from the settled text above, made during the pass-2 playtest build.
Where they conflict, this appendix wins.

- **§6.4 — the act-end screen is performance-only.** The glowing review no
  longer lays cohort outcomes alongside itself; the collapse-rate/footing-shape
  pedagogy moves entirely into the counterfactual archive. Playtest read: the
  side-by-side handed the player the conclusion, and it broke §6.4's own first
  bullet ("Act 1 asks nothing"). Arguably this strengthens the §11.4 horror —
  you never see what your stamps did unless you go looking.
- **§5 — the stamp is three-way.** Binary approve/flag became
  **Approve / Warn / Flag**, and per-line determinations became **category
  buckets + big-ticket line items**. Fewer, meatier calls; the middle stamp
  gives leniency a price short of a flag.
- **Contextual rubric (new).** Each case's circumstances set the discretionary
  allowance the determinations are judged against — the bar moves with the
  claimant, so the "right" call requires reading the file, not memorizing a
  number.
- **§5 — audit risk is a real mechanic.** Under-calling expected-flags accrues
  audit risk; crossing the threshold fires a supervisor audit event that pulls
  one prior determination back for re-review, on the books, with a rating
  penalty.
- **§7/§10 — Act 2 gains action variety and a longer, slower horizon.** The
  weekly allocation is regular shifts / overtime / rest / errands / comforts /
  tier move under a shared slot budget, and the strangle plays out over ~40
  weeks. The capacity meter is **centered above the case file** — the focal
  point, not a header widget (§7.4's one sanctioned break in continuity, made
  louder).
- **Title menu (new, build-pragmatic).** A cover-sheet menu in the same portal
  chrome: "Play from Act 1" (the full flow, act break intact) and a playtest
  "Skip to Act 2" under an assumed desk record (default flag rate 0.6; lenient
  0.2 / typical 0.6 / punitive 0.9 chooser). Act 2's ending returns here.

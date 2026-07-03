# Design Document — *(working title: "Means")*
### A game about the poverty trap, played from both sides of the desk

**Status:** supersedes *"Base"* v1. Two-act architecture settled; engine inherited from the original doc with two modifications (§6). HTML-only restriction lifted — implications in §9.
**Format:** turn-based, two acts, single playthrough per act pair.
**Lineage:** openly downstream of *Papers, Please*. We differentiate on mechanics (§8.4), not by hiding the debt. We do not copy the aesthetic.

---

## 1. Thesis (revised)

The folk theory —

> "The poor would escape if they just showed restraint and skipped small pleasures."

— is not a belief about economics. It is a **judgment about other people, made from an information-poor outside view.** The original design tried to refute it by giving the player the inside view from turn one. That failed on its own terms: it made the pleasure purchase legibly load-bearing (an upkeep mechanic, genre-familiar, never tempting to condemn), so the player never occupied the judge's seat and there was never a judgment to dismantle.

**You cannot overturn a judgment the player never made.**

The revised design therefore has two jobs, in order:

1. **Act 1 installs the judgment mechanically.** The player is paid, scored, and juiced for enforcing the folk theory on strangers reduced to ledgers — the exact epistemic position the folk theory is spoken from.
2. **Act 2 overturns it from the inside**, using the *same interface*, with the hidden state finally visible, and with the player's own Act 1 conduct as the antagonist.

**One-line takeaway:** *The judgment was cheap because the information was missing — and the information was missing by design.*

The original one-liner survives underneath it: *the same shock that's survivable with slack is fatal without it, and staying operational costs money you also need to escape.* Act 2 still teaches that. But it is now the second lesson, delivered to a player who spent an act punishing people for acting on it.

---

## 2. Design pillars (non-negotiable)

Pillars 1–5 from the original doc stand (mechanics enforce the economics; pleasures are load-bearing; two-layer variance; winnable but rare; stasis is a real outcome). Three are added:

6. **Complicity must be sincere.** Act 1's satisfaction is real, not parodic. The satire lives in the *situation*, never in the feedback layer. The player must genuinely enjoy the KPI — unironically pursued dopamine — or there is no sincere judgment for Act 2 to indict. Exaggerated, winking gamification is legible as satire; satire is distance; distance lets the player perform the critique instead of earning it. (See §7 for the full aesthetic argument.)
7. **The counterfactual is a resolution rule, not a text box.** Every consequential resolution shows both branches. This is the design's differentiator from its lineage (§8.4) and the mechanism that delivers the two-layer-variance lesson to *every* player, median run included — the original design delivered it only to rare winners.
8. **The deck must be honest.** Fraud exists; some flags are genuinely correct; the sim must sometimes vindicate the player's denial. A deck that never vindicates the desk is rightly dismissed as rigged, and the counterfactual ledgers persuade only if the player believes the sim isn't stacked.

---

## 3. Act 1 — The Desk

### 3.1 Frame

The player is a **means-testing case worker.** Their job, literally, is enforcing the folk theory: review benefit recipients' ledgers, flag "non-essential" spending, condition or dock benefits, hit quota. The institution's rubric *is* the enemy sentence from §1, operationalized.

Why the desk and not the intimate frame (the sibling sending remittances home): **judgment needs distance to form.** The sibling frame triggers sympathy too early — the player knows this person, they're already inside the story. The desk provides a caseload of strangers reduced to line items, which is exactly the information-poor position the thesis targets. The intimate frame is not discarded; it is a candidate for a later act or a different game.

### 3.2 The loop

Per case (several cases per shift, several shifts per act):

1. **A case file arrives**: identity strip, benefit level, income record, and the period's **ledger** — line items only. Rent, groceries, a phone plan, a $9 purchase at a bar, a lottery ticket, a streaming subscription, a child's birthday cake.
2. **The player reviews under time pressure** and stamps each flaggable line: *approve* or *flag*. Flags dock the recipient's next benefit payment per the rubric.
3. **KPI feedback fires immediately**: flag streaks, speed bonuses, accuracy score against the institution's rubric, shift-end rating. Approving too much accumulates **audit risk** — the institution's pressure is asymmetric by design, because that is true of the real institution.
4. **The case resolves in the background.** Underneath every case file is a full run of the original engine (§6): capacity, structural drain, shock table, footing. The player's stamps are inputs to that sim.
5. **The counterfactual ledger updates** (§3.3).

Denial must be **genuine skill expression** — pattern-reading, rubric mastery, time management — not a strawman the player clicks through. If the desk isn't good as a game, Act 1 is a lecture with extra steps.

### 3.3 The counterfactual ledger — the core mechanic

Every stamped decision, once resolved by the sim, writes **both branches** into the case file, which remains accessible in a drawer/archive:

> **Line 14 — $9, Rosie's Bar. FLAGGED.**
> Retained: $9. Benefit docked $40 per rubric 7(c).
> *Branch as played:* Week 3 — capacity below threshold, two missed shifts, −$180. Week 4 — case escalated to crisis table. Emergency loan at 31%.
> *Branch if approved:* absorbed. No downstream events.

And symmetrically, for the honest deck (pillar 8):

> **Line 3 — $220, electronics. FLAGGED.**
> *Branch as played:* no capacity impact. Resale detected week 2. Flag correct.

This is the original doc's absorption asymmetry (*same event, opposite meaning depending on buffer*) made **visible on every resolution instead of inferable from a rare winning run.** The player's own play generates the dataset that refutes the player's play. The KPI keeps climbing while the archive rots — and that gap, growing turn by turn, is the pedagogy. The institution's score is the text box; the ledgers are the mechanics; the player learns to distrust the score. That is the real-world lesson stated in the grammar of pillar 1.

**Discovery pacing:** counterfactuals should not be shoved in the player's face on case one. They live in the archive — one click away, then surfaced progressively (a clerk's annotation, an audit that forces the player to reread an old file). The player should *choose* to start reading them. The moment a player opens the archive unprompted mid-streak is the moment Act 1 is working.

### 3.4 What Act 1 measures (and refuses to do)

- **Act 1 asks nothing.** No dialogue box ever invites reflection. The game's only voice is the institution's, and the institution is delighted with you.
- The act-end screen is a **glowing performance review laid over cohort outcomes**: collapse rates by flag rate, footing-shape graphs (stabilized / freefall / just lifting) for the entire caseload. The two artifacts are presented side by side without comment.
- The primary telemetry/v1 test: **does the player's flag rate drop across Act 1 even though the KPI punishes the drop?** A dropping flag rate is a sincere judgment being overturned by evidence, at personal (score) cost. That is the whole act in one metric.

### 3.5 The juice arc: player-triggered decay, not authorial exaggeration

The feedback layer is tuned to be **genuinely excellent and held completely straight for the entire act.** The reference register is *Balatro* / the *Papers, Please* stamp: sincere, tactile, zero irony in presentation.

The rejected alternative — exaggerated, parodic gamification over bland assets — fails twice: (a) it is legible as satire and creates ironic play (pillar 6); (b) that exact pairing is the coded visual grammar of predatory F2P, which pre-frames the institution as villain before case one and pre-loads the conclusion the player is supposed to earn.

If the presentation has an arc, it is **player-triggered decay**: once the player has read enough counterfactual ledgers, the streak fanfare *doesn't change at all* — and that is what becomes unbearable. The juice staying cheerful while the player knows what it's scoring is colder than any authored wink.

---

## 4. The act break — the reveal is a diff, not a cutscene

Between acts, one event: the player's circumstances change (layoff, medical event, the specifics are an authoring question — §11). No montage, no tonal pivot, minimal text.

The reveal mechanism is **interface continuity**: Act 2 opens on the *same case-file UI the player has used for an act* — except the name strip is theirs, and the stamp fields are read-only.

---

## 5. Act 2 — The Case

### 5.1 Frame

The player now lives one run of the original inside-view game (the entire *"Base"* design, §6), rendered **in the interface they used to wield.**

- Their purchases appear as **line items with the same flag-risk indicator** they spent Act 1 applying to strangers.
- Their benefit is means-tested. **Spending is visible to a clerk.** Flagged purchases dock next period's benefit — restraint is institutionally incentivized *inside the fiction*, which is simply true of means-tested welfare.
- Periodically the clerk reviews their file: the player hears the **stamp sound** — the one that used to pay them dopamine — happening *to* them, off-screen, from the other side of a desk they cannot see.

### 5.2 Why this solves the original design's temptation problem

The original design's fatal flaw was that restraint was never tempting, so its failure taught nothing. Act 2 installs the temptation **twice over, without fragile tuning**:

1. **Socially:** the player spent an act being scored and juiced for flagging exactly the purchase they are now hovering over. The judgment lives in their head; the mechanic doesn't have to manufacture it.
2. **Diegetically:** the purchase carries real flag risk and real benefit consequences. Skipping the restoration is a mechanically live, incentivized option — *and still the trap*, because the capacity spiral (§6) costs more than the flag would have.

The pleasure purchase is now what it is in the world: **load-bearing and punished.**

### 5.3 The one new UI element: the hidden state

Act 2's interface is Act 1's interface **plus the capacity meter** — the variable the desk never displayed. That diff *is* the thesis as UI: the judgment was made on the ledger; the truth lived in the column the form didn't have. Nothing else visually distinguishes the acts (§7).

### 5.4 The clerk is you (proposed — flagged as new, see the tension below)

**Proposal:** the Act 2 clerk's flagging behavior is parameterized by the player's own Act 1 stamp record. Your policy, learned from your play, applied to your life. Complicity becomes mechanical rather than merely psychological: a punitive Act 1 player faces a punitive clerk; a lenient one — who paid for leniency in KPI and audit risk — faces a gentler review.

**The tension, stated honestly:** this risks teaching *"individual kindness solves it,"* which undermines the structural thesis. The counterweight is already in the engine: even a maximally lenient clerk only modulates *one* pressure. The structural drain, the shock table, and the invisible threshold remain untouched — a lenient-clerk run is *less brutal, still trapped by default.* Tuning must guarantee that clerk leniency shifts the distribution without breaking the trap, or the mechanic gets cut. This is open question #2 (§11).

### 5.5 Self-flagging (emergent, to be verified)

If interface continuity works, players will **hesitate over purchases while mentally running the clerk's rubric on themselves** — because the game trained them on that rubric for an hour. Internalized surveillance as an emergent mechanic is poverty-specific in a way no neutral skin could produce, and it costs zero authoring. v1 test #3 checks for it (§10).

---

## 6. The engine (inherited from *"Base"*, two modifications)

Everything in the original doc's §§3–7 survives and runs underneath both acts:

- **Capacity** (fast meter, the throttle, the only loss condition) and **Footing** (slow leaky integrator, the epitaph, gates nothing) — unchanged, including the update sketch and the arguments for why footing must not gate.
- **Shock absorption asymmetry** — unchanged as simulation; **newly surfaced** via the counterfactual ledger (pillar 7). In Act 1 it's surfaced on every case; in Act 2, the player's own resolutions show both branches the same way.
- **Invisible, variance-dependent threshold** and the **three outcomes** (escaped / collapsed / still trapped) — unchanged for Act 2. Act 1's cohort runs use the same outcome space in aggregate.
- **Footing-shape epitaph** — unchanged for Act 2; extended in Act 1 to caseload-level graphs.

**Modification 1 — counterfactual visibility is now core, not a patch.** The original design hid the asymmetry and hoped rare winners would infer it. Both acts now display it as a resolution rule.

**Modification 2 — the lagged/noisy skip-cost tuning is no longer load-bearing.** It was proposed to make restraint tempting inside a single-frame game. The temptation is now installed socially and diegetically (§5.2), so the capacity model can stay honest and legible rather than deceptively lagged. Some lag remains *naturally* (capacity decline degrades yields over subsequent turns), but the design no longer depends on hiding the bill.

**Run structure note:** Act 1's cases are *full engine runs viewed from outside* — which means Act 1 doubles as the tuning harness for Act 2. Every balancing question in the original doc's §10.5 gets exercised at cohort scale before the player ever plays a run from inside.

---

## 7. Aesthetic direction

- **One visual language for both acts.** Forms, ledgers, stamps, memos, a bureaucratic document system. The game *is* its interface.
- The rejected alternative, steelmanned: giving Act 2 a warm, analog, "human" aesthetic against Act 1's cold forms is more expressive — and wrong, because it **re-separates the two worlds the design exists to fuse.** The desk view and the lived view are the *same data*, differing only in which columns you're shown. Two art directions says they're different places. Continuity is the statement. (That it's also the cheap option is the second reason, not the first.)
- **Feedback layer:** sincere, excellent, straight (§3.5). Bland *assets* are fine — the documents should feel institutional — but the *feel* (stamp weight, streak cadence, sound) gets real game-feel budget. These are different axes: drab fiction, great hands.
- **Not the Papers, Please aesthetic.** No Eastern-bloc pixel pastiche, no booth. A contemporary, fluorescent, portal-and-PDF bureaucracy is both truer to the subject (means-testing is a web form now) and visually distinct from the lineage.

---

## 8. Risks (the ones that would kill it)

### 8.1 Satire distance / ironic play
If the player smells authorial contempt for the desk by case three, they flag "for the bit" and the flag-rate metric measures a performance, not a judgment. Mitigations: pillar 6 (sincere juice), pillar 8 (honest deck — the rubric must sometimes be *right*), and making the desk mechanically deep enough to absorb genuine mastery.

### 8.2 Didacticism
The two-act structure telegraphs. Some players will predict the flip. Partial acceptance: predicting the flip is not the same as being inoculated against it — *Papers, Please* players knew the game was "about" complicity and were complicit anyway, because the loop paid them. The defense is loop quality, not concealment.

### 8.3 The kindness laundering (clerk-is-you)
§5.4's tension. If a lenient Act 1 measurably "solves" Act 2, the game teaches individual virtue over structure. Hard tuning constraint: clerk leniency must shift distributions, never break the trap. If it can't be tuned to hold, the mechanic ships as flavor (the clerk quotes your own annotations back at you) rather than as a difficulty parameter.

### 8.4 Lineage
Visibly downstream of *Papers, Please* — accepted, not hidden. The differentiation is mechanical and it is exactly the thesis: **PP never shows you the counterfactual.** Its horror is that you never learn what your stamps did. This game's entire argument lives in the counterfactual — same shock, opposite meaning — so the both-branches case file isn't just a mechanic, it's the reason this game needs to exist next to its ancestor.

### 8.5 Act 1 length
Long enough to install sincere judgment and real KPI attachment; short enough that a player who "gets it" early isn't held hostage. Candidate instrument: let flag-rate trajectory modulate Act 1's length (the institution "promotes you to review" — i.e., the act ends — after a fixed shift count, but archive engagement can unlock the break early). Unresolved — §11.

---

## 9. Consequences of lifting the HTML-only restriction

- **Audio is now load-bearing, not deferred.** The stamp sound is a core mechanic twice over: dopamine anchor in Act 1, dread anchor in Act 2 (same sample, other side of the desk). Budget it like a mechanic.
- **Game-feel tuning becomes real work** (pillar 6 demands it). Engine choice is an implementation question and out of scope here, but the design now assumes screenshake-grade control over feedback timing.
- The interface-continuity strategy keeps asset cost low *regardless* of platform — the lifted restriction buys feel and sound, not art scope. Resist the temptation to spend it on art.

---

## 10. Scope & the v1 tests

**Ship:** both acts, one visual language, the inherited engine, the counterfactual ledger, the honest deck (with tuned fraud rate), performance-review-over-cohort epitaph, Act 2 with clerk (flavor version minimum), footing epitaph.
**Defer:** clerk-is-you as difficulty parameter (until §8.3 tuning is proven), the intimate/remittance frame, meta-progression, localization.

The v1 test rewrites from the original doc's ("does the loser understand the pleasure / does the winner fail to credit skill" — both still apply, inside Act 2) to three sharper ones:

1. **Does flag rate drop across Act 1 despite the KPI punishing the drop?**
2. **Does Act 2 hurt more because of what the player did at the desk?** (Instrument: compare Act 2 affect/behavior between players with high vs. low Act 1 flag rates.)
3. **Does the player self-flag in Act 2** — hesitation patterns on flaggable purchases, measurable as hover/delay time relative to non-flaggable spending?

If 1 fails, Act 1 is a lecture. If 2 fails, the acts aren't fused. If 3 fires, the game produced something no neutral skin could.

---

## 11. Open questions

1. **Act 1 case authoring.** How many cases, what distribution of honest-flag vs. trap-flag cases, how the sim's parameters render as legible ledger lines. This is now the biggest content job in the game.
2. **Clerk-is-you: parameter or flavor?** Pending the §8.3 tuning question.
3. **Who is the Act 2 protagonist?** Options: (a) "you," the case worker, post-layoff — cleanest continuity, strongest complicity; (b) **a case the player flagged in Act 1** — you play a run whose opening wounds are your own stamps; brutal, but breaks first-person continuity and risks reading as punishment-theater; (c) a fresh case. Lean: (a), with (b) held as a possible epilogue vignette.
4. **The act-break event.** Authoring the circumstance change without melodrama.
5. **Resource-allocation layer for Act 2** — the original doc's open question #1 still stands (lean unchanged: **Money + Time**, capacity absorbs the energy role).
6. **Maslow tiers, deck content, numbers** — inherited from original §10.3–10.5, now partially answerable via Act 1's cohort-scale tuning harness (§6).
7. **Name.** *"Base"* no longer winks at anything. *"Means"* is the current placeholder — means-testing / means to live / by any means. Alternatives: *"Casework," "Approved," "Rubric."*

---

*§§1–9 reflect the settled two-act design. §§10–11 are where the next conversation lives.*

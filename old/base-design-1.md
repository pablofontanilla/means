# Design Document — *(working title: "Base")*
### A game about the poverty trap
 
**Status:** architecture settled; content and resource model open (see §10).
**Format:** pure HTML5, single-run, turn-based.
 
---
 
## 1. Thesis
 
The player should leave understanding **why a small, "irrational" pleasure purchase is the locally rational move for someone in the trap** — and should feel it in their hands, not read it in a tooltip.
 
The game is designed to *refute* a specific folk theory:
 
> "The poor would escape if they just showed restraint and skipped small pleasures."
 
That sentence is the enemy. Every mechanic below exists to make that sentence *false in play* — not merely contradicted by narration. The rule we hold to throughout: **players believe mechanics, not text boxes.** If the mechanics say "the pleasure is the leak that killed you," no amount of framing rescues it. So the mechanics must say the opposite: the pleasure is what kept the engine running long enough for escape to even be possible.
 
**One-line takeaway for the player:** *The same shock that's survivable with slack is fatal without it — and staying operational costs money you also need to escape.*
 
---
 
## 2. Design pillars (non-negotiable)
 
1. **Mechanics enforce the economics.** The thesis is structural, not moral. No mechanic may reward "endurance/restraint" as the path out.
2. **Pleasures are load-bearing, not a leak.** Skipping restoration degrades *capacity to function*, not just a comfort bar. The pleasure spend keeps you operational; it is not the thing stopping escape.
3. **Two-layer variance, never one.** Layer 1: RNG gates whether you accumulate slack fast enough. Layer 2: slack gates *what a shock means*. One-layer RNG is a slot machine, and a slot machine teaches "bad luck / not my fault / the winners were just better" — i.e. victim-blaming from the winner's seat. We reject it.
4. **Winnable but rare.** Escape must be reachable or players feel cheated and the trap isn't demonstrated. It should be *hard*, gated by luck at the margin, so a min-maxer can't reliably solve it.
5. **Stasis is a real outcome.** The trap isn't death; it's *not moving*. Surviving to the clock without escaping is its own ending and must not read as victory.
---
 
## 3. Core loop
 
Turn-based. Each turn, roughly:
 
1. **Allocate** your turn's resources (see §10 — least-settled part).
2. **Resolve** the shift/effort you chose → capacity and money change.
3. **Draw an event** → resolved *against your current buffer* (§5).
4. **Optionally spend** on restoration / small pleasures.
5. **Meters update** (§4). Check terminal conditions (§7).
Target run length ≈ **30 turns as a tuning ceiling**, but run length is *emergent*: the real number is how long you keep capacity off the floor. There is deliberately **no "survive N turns → win."**
 
*Why short/small-N: variance dominates a short run, and that is the point — you play one noisy run, not the expectation. A long game lets a patient player grind out the mean and escape reliably, which would teach "just be disciplined." We want the law of large numbers to* **not** *save you.*
 
---
 
## 4. The two meters
 
Two separate state variables at two different speeds. Keeping them separate is load-bearing; merging them rebuilds the folk-theory loop.
 
### 4.1 Capacity — the fast meter (the throttle)
 
- **Speed:** fast. Rises quickly with restoration/pleasures; falls quickly under brutal conditions (back-to-back shifts, bad living situation) and shocks.
- **Function:** it is the engine. When depleted it **degrades shift yields** (exhaustion → you earn less) and **worsens the event table** (desperation → you draw from a nastier distribution and make worse forced choices).
- **Loss condition:** **capacity hits zero → you "die" → run ends in collapse.** (We don't need to define what "die" means narratively.)
- **Restored by:** small-pleasure purchases and rest — the "temptation goods." These are the thing the outside eye calls irrational.
> **Design note.** Capacity is the only playable loss meter. This is where the "you should've saved" intuition gets refuted: cutting restoration to save money accelerates the capacity spiral, which lowers yields and worsens events, which costs you *more* than you saved. The pleasure isn't weakness; it's keeping the machine on.
 
### 4.2 Footing — the slow meter (the epitaph)
 
- **Speed:** slow. A **leaky integrator** (exponential moving average / low-pass filter) with a large time constant τ.
- **Input:** not instantaneous capacity, but the **trend** of capacity (its derivative) and your Maslow tier. Sustained decline drags footing down even when a pleasure purchase briefly props capacity's *level*.
- **Not a loss condition. Not a win condition.** Footing gates nothing. It *reports*.
- **Behavior:**
  - In a trapped run: grinds down. Pleasures stabilize the *derivative* (slow the fall) but can't outpace the structural drain, so the input stays net-negative and footing keeps sliding. **You cannot buy your way to "content" inside the trap.**
  - After structural escape: the input flips (Maslow tier lifts → structural drain drops → capacity trend turns non-negative), and the leak lets footing slowly *forget the bad past* and climb. Recovery is real but lagged by τ.
> **Why leaky, not a true integral.** A true integral never forgets — turn-1 misery would weigh as much as turn-29 at the readout, so late recovery could never register and early bad luck would be permanently determinative. The leak is exactly what makes post-escape recovery possible *and* what makes it only possible after escape (nothing else changes the sustained input).
>
> **Why footing must not be the win condition.** A leaky integrator crossing a fixed line is trivially gamed: end on a few lucky turns and you cross it. That would let recent good luck *launder a trapped run into a win* — the aestheticized-recovery lie ("a contented poverty") we explicitly refuse. So footing scores the run; it never gates it.
 
**Sketch of the update (for tuning, not final):**
 
```
Δcapacity_t   = restoration_t − structural_drain_t(Maslow tier, shifts) − shock_t
capacity_t    = clamp(capacity_{t-1} + Δcapacity_t, 0, MAX)
 
input_t       = f(Δcapacity_t, Maslow_tier_t)      # the "derivative" + tier
footing_t     = footing_{t-1} + α · (input_t − footing_{t-1})   # small α = slow
```
 
`α ≈ 1/τ`. Small α = long memory = the slowness you want.
 
---
 
## 5. Shocks & absorption asymmetry (the empathy generator)
 
Events are **not flat-magnitude.** The same event card does categorically different things depending on your buffer/slack. This is the mechanic that makes variance read as *structural* rather than as noise.
 
- **Drawn with slack:** absorbed and forgotten. A rounding error.
- **Drawn at low reserves:** it **cascades** — forces a high-interest borrow, a missed shift, or drops you into the desperation event table.
*Same event. Same magnitude. Opposite meaning.* A $400 car repair is nothing to a household with savings and a solvency event to one without. That asymmetry **is** the trap.
 
**Consequence for the escaping player:** they will *feel the moment the same card stops being lethal* — not because they got smarter, but because they crossed enough of the threshold to have slack. This is what stops the winner from crediting their own skill (the survivorship-bias / victim-blaming failure mode). The lesson fires hardest **in the winning run.**
 
---
 
## 6. The invisible threshold / escape
 
- Escape = crossing a **structural line**: enough accumulated slack that shocks stop being lethal.
- The threshold is **invisible** and **not a single static value** — it's a function of the *variance of events*. There is no "you're almost out of poverty" notification, because there isn't one in life.
- It is **capacity-side and RNG-gated at the margin.** Luck decides whether you accumulate slack fast enough before a cascade zeroes your capacity.
- It should be *inferable* from resource states (a careful player senses they have room) but **never labeled**.
---
 
## 7. The three outcomes
 
| Outcome | Trigger | Reads as |
|---|---|---|
| **Escaped** | Crossed the structural line before capacity zeroed | **Win** (rare). Footing begins its lagged climb. |
| **Collapsed** | Capacity hit zero | Loss. Footing is low — the epitaph of a run spent surviving. |
| **Still trapped** | Reached the turn ceiling without crossing the line | **Not a win.** Stasis — you kept the engine running and stayed exactly where you started. The truest non-escape ending. |
 
The **game-over screen grades the *shape* of footing** — stabilized / freefall / just beginning to lift — as epitaph/flavor, **not** pass/fail. This gives the ending meaning about the *trajectory* without making footing the gate.
 
> The "still trapped" ending is the thesis in its purest form and must be authored with care so it never feels like a consolation win. Kept the machine running for 30 turns, spent every pleasure exactly right — and you're in the same hole.
 
---
 
## 8. Facade / narrative layer (north-star — deferred)
 
Grand vision: the surface presents as a **sterile, neutral situation** — an alien planet, building your base, rationing supplies — and is *gradually revealed* to be a person trapped in ordinary life, hallucinating the alien frame to cope.
 
- The neutral facade lets the player make the "irrational" choices *without* the defensive reflex the literal theme triggers, then reframes them.
- The reveal recontextualizes every mechanic already learned: rations → wages, base integrity → capacity, the hostile environment → structural conditions.
**Explicitly out of scope for v1.** High ambition, heavy asset/authoring cost, and it demands real care to avoid tonal disaster. Design v1 so the mechanics work *fully* under the neutral skin alone, with nothing structurally dependent on the reveal. The reveal is a layer added later, or never — the game must be good without it.
 
---
 
## 9. Scope for v1
 
Ship the **mechanical spine under the neutral skin**:
 
- The two meters (capacity, footing) with the leaky-integral behavior.
- Shock absorption asymmetry.
- Invisible variance-dependent threshold + the three outcomes.
- A minimal event deck (normal + desperation tables).
- The footing-shape epitaph screen.
Defer: the reveal/narrative layer, bespoke art, audio, meta-progression.
 
The v1 test: *does a losing player understand why they'd have bought the pleasure, and does a winning player fail to credit their own cleverness?* If yes, the spine works.
 
---
 
## 10. Open design questions (the real next fork)
 
The architecture above is settled. These are genuinely unresolved and I didn't want to silently pick them for you:
 
1. **The resource-allocation layer.** This is the least-specified part and the biggest open question. The original pitch had **time / energy / money**. But "energy" now overlaps heavily with **capacity**, and "time" is largely the turn structure itself. Candidate resolutions:
   - **Money + Time only** (energy → capacity). Cleanest; capacity absorbs the exhaustion role.
   - **All three**, with energy as a *per-turn* budget distinct from capacity as a *stored* state. More texture, more UI, more ways to confuse the player about what capacity is.
   - **Money only**, with time expressed purely as turns. Most minimal; risks too few decisions per turn.
   My lean: **Money + Time**, with capacity doing the energy work — but this needs your call before we can spec turn actions.
2. **What are the concrete turn actions?** (Work a shift / rest / spend on pleasure / attempt a life-improvement / …) Depends entirely on #1.
3. **Maslow tiers.** How many, what they cost, and how a tier change alters structural drain (the input that lets footing recover). Simple 3-tier to start?
4. **Event deck content & the two tables.** Concrete cards, magnitudes, and how "desperation table" differs from "normal table."
5. **Numbers.** τ / α for footing, capacity max & drain rates, threshold-as-variance-function shape. Tuning, last.
6. **Name.** "Base" is a placeholder that also winks at the facade.
---
 
*Everything in §§1–8 reflects the settled design. §§9–10 are where the next conversation lives.*

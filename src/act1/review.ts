// The act-end screen (§6.4): a glowing performance review laid over the cohort
// outcomes — collapse rates and footing shapes for the whole caseload the player
// judged. The two artifacts sit side by side without comment. The institution is
// thrilled; the cohort tells another story. No dialogue box invites reflection.

import type { Config } from "../engine/config.ts";
import { makeRestorationPolicy } from "../engine/policies.ts";
import { footingShape, runFull, type RunModifier } from "../engine/simulate.ts";
import type { OutcomeKind } from "../engine/types.ts";
import type { BuiltCase, RubricVerdict } from "./cases.ts";
import type { DeskOutcome } from "./desk.ts";
import { accuracy } from "./kpi.ts";

interface CohortTally {
  escaped: number;
  collapsed: number;
  trapped: number;
  shapes: Record<string, number>;
}

/** Rerun each case with the player's load-bearing flags applied as docks. */
function tallyCohort(outcome: DeskOutcome, config: Config): CohortTally {
  const policy = makeRestorationPolicy(config);
  const tally: CohortTally = { escaped: 0, collapsed: 0, trapped: 0, shapes: {} };
  for (const c of outcome.cases) {
    const stamps = outcome.stampsByCase.get(c.id);
    const docks = docksFor(c, stamps);
    const run = runFull(config, policy, c.seed, docks);
    const oc = (run.outcome ?? "trapped") as OutcomeKind;
    tally[oc] += 1;
    const shape = footingShape(run);
    tally.shapes[shape] = (tally.shapes[shape] ?? 0) + 1;
  }
  return tally;
}

/** A flag on a load-bearing line docks the benefit; fraud flags don't harm. */
function docksFor(c: BuiltCase, stamps: Map<string, RubricVerdict> | undefined): RunModifier[] {
  if (!stamps) return [];
  const docks: RunModifier[] = [];
  for (const line of c.lines) {
    if (line.truth !== "loadbearing") continue;
    if (stamps.get(line.lineId) === "flag") {
      docks.push({ atTurn: line.decisionTurn, moneyDelta: -line.dockAmount });
    }
  }
  return docks;
}

export function showReview(
  root: HTMLElement,
  outcome: DeskOutcome,
  config: Config,
  onContinue: () => void,
): void {
  const kpi = outcome.kpi;
  const tally = tallyCohort(outcome, config);
  const n = outcome.cases.length;
  const pct = (x: number) => Math.round((x / n) * 100);
  const stars = "★".repeat(Math.min(5, 3 + Math.round(kpi.bestStreak / 4))).padEnd(5, "☆");

  const stage = root.querySelector<HTMLElement>("#stage") ?? root;
  stage.innerHTML = `
    <div class="review fade-in">
      <div class="banner">
        <div class="stars">${stars}</div>
        <h2>Outstanding Shift</h2>
        <div>Benefits Integrity Division — Performance Review</div>
      </div>
      <div class="cols">
        <div>
          <h3>Your performance</h3>
          <div class="stat"><span>Final score</span><span class="v">${kpi.score.toLocaleString()}</span></div>
          <div class="stat"><span>Cases cleared</span><span class="v">${kpi.casesResolved}</span></div>
          <div class="stat"><span>Best flag streak</span><span class="v">${kpi.bestStreak}</span></div>
          <div class="stat"><span>Rubric accuracy</span><span class="v">${Math.round(accuracy(kpi) * 100)}%</span></div>
          <div class="stat"><span>Lines flagged</span><span class="v">${kpi.flags}</span></div>
          <div class="stat"><span>Audit risk</span><span class="v">${Math.round(kpi.auditRisk)}</span></div>
        </div>
        <div>
          <h3>Caseload outcomes</h3>
          <div class="cohort-bar">
            ${tally.escaped ? `<span class="esc" style="flex:${tally.escaped}">${tally.escaped}</span>` : ""}
            ${tally.trapped ? `<span class="tra" style="flex:${tally.trapped}">${tally.trapped}</span>` : ""}
            ${tally.collapsed ? `<span class="col" style="flex:${tally.collapsed}">${tally.collapsed}</span>` : ""}
          </div>
          <div class="stat"><span>Escaped the trap</span><span class="v">${pct(tally.escaped)}%</span></div>
          <div class="stat"><span>Still trapped</span><span class="v">${pct(tally.trapped)}%</span></div>
          <div class="stat"><span>Collapsed</span><span class="v">${pct(tally.collapsed)}%</span></div>
          <div class="stat"><span>Footing: freefall</span><span class="v">${tally.shapes.freefall ?? 0}</span></div>
          <div class="stat"><span>Footing: stabilized</span><span class="v">${tally.shapes.stabilized ?? 0}</span></div>
          <div class="stat"><span>Footing: lifting</span><span class="v">${tally.shapes.lifting ?? 0}</span></div>
        </div>
      </div>
      <div class="actions">
        <div class="spacer"></div>
        <button class="btn" id="continue">Continue →</button>
      </div>
    </div>`;
  stage.querySelector<HTMLButtonElement>("#continue")!.addEventListener("click", onContinue);
}

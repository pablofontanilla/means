// Act sequencing (§7.1): Act 1 (the desk) → performance review → act break →
// Act 2 (the case). The act break and Act 2 land in M4; for now the slice runs
// Act 1 through the review and hands off to a placeholder.

import "./ui/casefile.css";
import { runAct1, type DeskOutcome } from "./act1/desk.ts";
import { flagRate } from "./act1/kpi.ts";
import { showReview } from "./act1/review.ts";
import { DEFAULT_CONFIG } from "./engine/config.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
const config = DEFAULT_CONFIG;

function startAct1(): void {
  runAct1(app, config, (outcome) => {
    showReview(app, outcome, config, () => enterActBreak(outcome));
  });
}

function enterActBreak(outcome: DeskOutcome): void {
  // Placeholder until M4 wires the act break + Act 2.
  const stage = app.querySelector<HTMLElement>("#stage") ?? app;
  stage.innerHTML = `
    <div class="actbreak"><div class="memo fade-in">
      <span class="stamp-mark flag">Notice</span>
      <p>Act 2 — the case — arrives in the next milestone.</p>
      <p class="from">Your flag rate this shift: ${Math.round(flagRate(outcome.kpi) * 100)}%.</p>
    </div></div>`;
}

startAct1();

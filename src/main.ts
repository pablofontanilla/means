// Act sequencing (§7.1): Act 1 (the desk) → performance review → act break →
// Act 2 (the case). The act break's whole trick is interface continuity — Act 2
// opens on the same case-file UI, now turned on the player.

import "./ui/casefile.css";
import { runAct1, type DeskOutcome } from "./act1/desk.ts";
import { flagRate } from "./act1/kpi.ts";
import { showReview } from "./act1/review.ts";
import { runAct2 } from "./act2/run.ts";
import { DEFAULT_CONFIG } from "./engine/config.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
const config = DEFAULT_CONFIG;

function startAct1(): void {
  runAct1(app, config, (outcome) => {
    showReview(app, outcome, config, () => enterActBreak(outcome));
  });
}

/**
 * The act break (§7.1): one event, minimal text — a layoff. No montage, no
 * tonal pivot. The reveal mechanism is interface continuity: "Open your claim"
 * drops the player into Act 2 on the same case-file UI they used for an act,
 * except the name strip is now theirs and the stamp fields are read-only.
 */
function enterActBreak(outcome: DeskOutcome): void {
  const rate = flagRate(outcome.kpi);
  app.innerHTML = `
    <div class="stage"><div class="actbreak"><div class="memo fade-in">
      <span class="stamp-mark flag">Notice</span>
      <p><strong>Notice of Reduction in Force.</strong></p>
      <p>Your position at the Benefits Integrity Division has been eliminated, effective immediately. Your final determination has been processed.</p>
      <p>Records indicate you may be eligible for means-tested assistance. A claim has been opened in your name.</p>
      <div class="actions" style="background:transparent;border:0;padding:8px 0 0">
        <div class="spacer"></div>
        <button class="btn" id="open-claim">Open your claim →</button>
      </div>
      <p class="from">On file: you flagged ${Math.round(rate * 100)}% of comparable lines at the desk. Your reviewing officer will apply the same standard.</p>
    </div></div></div>`;
  app.querySelector<HTMLButtonElement>("#open-claim")!.addEventListener("click", () => {
    runAct2(app, config, { name: "You", flagRate: rate });
  });
}

startAct1();

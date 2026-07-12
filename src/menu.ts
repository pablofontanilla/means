// Title menu + act sequencing (§7.1, P2-M4). The menu is a cover page of the
// same document system — portal chrome, casefile paper — not a new aesthetic.
// Two paths in: the full flow (Act 1 desk → performance review → act break →
// Act 2), and a playtest skip straight to Act 2 under an assumed desk record.
// Act 2's ending returns here via onEnd.

import { runAct1, type DeskOutcome } from "./act1/desk.ts";
import { flagRate } from "./act1/kpi.ts";
import { showReview } from "./act1/review.ts";
import { runAct2 } from "./act2/run.ts";
import type { Config } from "./engine/config.ts";

/** The playtest chooser (one line): an assumed Act 1 desk record. */
const SKIP_RATES = [
  { value: 0.2, label: "lenient" },
  { value: 0.6, label: "typical" },
  { value: 0.9, label: "punitive" },
] as const;
const SKIP_DEFAULT = 0.6;

export function showTitleMenu(root: HTMLElement, config: Config): void {
  root.innerHTML = `
    <header class="portal-header">
      <div class="seal">MT</div>
      <div>
        <h1>Means-Test Portal</h1>
        <div class="sub">Benefits Integrity Division</div>
      </div>
    </header>
    <div class="stage">
      <div class="title-menu"><div class="cover fade-in">
        <div class="doc-line">Case file · cover sheet</div>
        <h1 class="game-title">Means</h1>
        <p class="tagline">A caseload, then a claim. Both on the same form.</p>
        <div class="paths">
          <button class="btn" id="play-act1">Play from Act 1 →</button>
          <button class="btn ghost" id="skip-act2">Skip to Act 2 (playtest)</button>
        </div>
        <div class="skip-rate">
          <span>Assumed desk record:</span>
          ${SKIP_RATES.map(
            (r) => `<label><input type="radio" name="skip-rate" value="${r.value}" ${
              r.value === SKIP_DEFAULT ? "checked" : ""
            }> ${r.label} ${Math.round(r.value * 100)}%</label>`,
          ).join("")}
        </div>
      </div></div>
    </div>`;

  root.querySelector<HTMLButtonElement>("#play-act1")!.addEventListener("click", () => {
    startAct1(root, config);
  });
  root.querySelector<HTMLButtonElement>("#skip-act2")!.addEventListener("click", () => {
    const checked = root.querySelector<HTMLInputElement>('input[name="skip-rate"]:checked');
    const rate = checked ? parseFloat(checked.value) : SKIP_DEFAULT;
    runAct2(root, config, { name: "You", flagRate: rate }, () => showTitleMenu(root, config));
  });
}

function startAct1(root: HTMLElement, config: Config): void {
  runAct1(root, config, (outcome) => {
    showReview(root, outcome, config, () => enterActBreak(root, config, outcome));
  });
}

/**
 * The act break (§7.1): one event, minimal text — a layoff. No montage, no
 * tonal pivot. The reveal mechanism is interface continuity: "Open your claim"
 * drops the player into Act 2 on the same case-file UI they used for an act,
 * except the name strip is now theirs and the stamp fields are read-only.
 */
function enterActBreak(root: HTMLElement, config: Config, outcome: DeskOutcome): void {
  const rate = flagRate(outcome.kpi);
  root.innerHTML = `
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
  root.querySelector<HTMLButtonElement>("#open-claim")!.addEventListener("click", () => {
    runAct2(root, config, { name: "You", flagRate: rate }, () => showTitleMenu(root, config));
  });
}

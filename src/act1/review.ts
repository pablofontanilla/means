// The act-end screen (§8) — performance ONLY. A glowing review: score, stars,
// alignment, audit standing, a promotion blurb. The cohort/poverty-trap tally
// that used to sit beside it is gone (recorded deviation from §6.4): that
// pedagogy lives solely in the counterfactual archive, one click away, where
// the player finds it rather than being shown it. The institution grades the
// clerk, not the caseload.

import type { Config } from "../engine/config.ts";
import type { DeskOutcome } from "./desk.ts";
import { AUDIT_THRESHOLD, alignment, rating } from "./kpi.ts";

export function showReview(
  root: HTMLElement,
  outcome: DeskOutcome,
  _config: Config,
  onContinue: () => void,
): void {
  const kpi = outcome.kpi;
  const r = rating(kpi);
  const stars = "★".repeat(r.stars).padEnd(5, "☆");
  const audited = kpi.auditRisk >= AUDIT_THRESHOLD;

  const stage = root.querySelector<HTMLElement>("#stage") ?? root;
  stage.innerHTML = `
    <div class="review fade-in">
      <div class="banner">
        <div class="stars">${stars}</div>
        <h2>${audited ? "Shift Complete" : "Outstanding Shift"}</h2>
        <div>Benefits Integrity Division — Performance Review</div>
      </div>
      <div class="perf">
        <div class="blurb">“${r.blurb}”</div>
        <div class="stat"><span>Final score</span><span class="v">${kpi.score.toLocaleString()}</span></div>
        <div class="stat"><span>Cases cleared</span><span class="v">${kpi.casesResolved}</span></div>
        <div class="stat"><span>Alignment</span><span class="v" id="r-align">${Math.round(alignment(kpi) * 100)}%</span></div>
        <div class="stat"><span>Determinations — flagged</span><span class="v">${kpi.flags}</span></div>
        <div class="stat"><span>Determinations — warned</span><span class="v">${kpi.warns}</span></div>
        <div class="stat"><span>Determinations — approved</span><span class="v">${kpi.approves}</span></div>
        <div class="stat"><span>Best flag streak</span><span class="v">${kpi.bestStreak}</span></div>
        <div class="stat"><span>Audit standing</span><span class="v" id="r-audit">${audited ? "Under review" : "Clear"}</span></div>
      </div>
      <div class="actions">
        <span class="hint">${audited ? "Advancement deferred pending audit resolution." : "You are being considered for advancement."}</span>
        <div class="spacer"></div>
        <button class="btn" id="continue">Continue →</button>
      </div>
    </div>`;
  stage.querySelector<HTMLButtonElement>("#continue")!.addEventListener("click", onContinue);
}

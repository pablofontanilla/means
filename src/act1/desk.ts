// The desk (§5) — Act 1's controller. Three cases, each an engine run viewed
// from outside. The player makes a handful of contextual determinations per
// case: category buckets and big-ticket purchases, judged three ways
// (Approve / Warn / Flag) against the allowance the claimant's circumstances
// set. Every stamp gets immediate feedback (points, standard read, audit-risk
// delta); under-calling expected-flags accrues audit risk, and crossing the
// threshold fires a supervisor audit that pulls one prior determination back
// for re-review. Held completely straight (pillar 6): the institution is
// delighted with you, and never winks.

import type { Config } from "../engine/config.ts";
import { playStamp } from "../ui/audio.ts";
import { slamStamp, tickCounter } from "../ui/juice.ts";
import { Archive } from "./archive.ts";
import type { BuiltCase, ReviewItem } from "./cases.ts";
import { buildCaseload } from "./cases.ts";
import { resolveItem, type Counterfactual } from "./counterfactual.ts";
import {
  AUDIT_THRESHOLD,
  alignment,
  applyStamp,
  initKpi,
  type KpiState,
  type StampScore,
  type Verdict,
} from "./kpi.ts";

export interface DeskOutcome {
  kpi: KpiState;
  counterfactuals: Counterfactual[];
  cases: BuiltCase[];
}

/** One resolved determination, kept so the audit can pull it back (§5). */
interface StampRecord {
  builtCase: BuiltCase;
  item: ReviewItem;
  stamp: Verdict;
}

// Decisions are fewer and meatier now (3 cases, ~5 items each) — give each one
// reading time: the circumstances panel is part of the call.
const SECONDS_PER_ITEM = 10;
const BASE_SECONDS = 8;

const VERDICTS: Verdict[] = ["approve", "warn", "flag"];
const VERDICT_LABEL: Record<Verdict, string> = { approve: "Approve", warn: "Warn", flag: "Flag" };
const VERDICT_PAST: Record<Verdict, string> = { approve: "APPROVED", warn: "WARNED", flag: "FLAGGED" };

export function runAct1(
  root: HTMLElement,
  config: Config,
  onComplete: (outcome: DeskOutcome) => void,
): void {
  new Desk(root, config, onComplete);
}

class Desk {
  private cases: BuiltCase[];
  private idx = 0;
  private kpi: KpiState = initKpi();
  private archive: Archive;
  private counterfactuals: Counterfactual[] = [];
  private stamped: StampRecord[] = [];

  private root: HTMLElement;
  private stage: HTMLElement;
  private header: HTMLElement;

  private caseStamps = new Set<string>();
  private timerId: number | null = null;
  private caseStart = 0;
  private caseDuration = 0;
  private auditOpen = false;

  constructor(
    root: HTMLElement,
    private config: Config,
    private onComplete: (o: DeskOutcome) => void,
  ) {
    this.root = root;
    this.cases = buildCaseload(config);
    root.innerHTML = `
      <header class="portal-header">
        <div class="seal">MT</div>
        <div>
          <h1>Means-Test Portal</h1>
          <div class="sub">Benefits Integrity Division</div>
        </div>
        <div class="spacer"></div>
        <div class="kpi-strip">
          <div class="kpi"><span class="n" id="k-score" data-val="0">0</span><span class="l">Score</span></div>
          <div class="kpi"><span class="n" id="k-streak" data-val="0">0</span><span class="l">Flag streak</span></div>
          <div class="kpi"><span class="n" id="k-align">100%</span><span class="l">Alignment</span></div>
          <div class="kpi audit"><span class="n" id="k-audit" data-val="0">0</span><span class="l">Audit risk / ${AUDIT_THRESHOLD}</span></div>
        </div>
      </header>
      <div class="stage" id="stage"></div>`;
    this.header = root.querySelector(".portal-header")!;
    this.stage = root.querySelector("#stage")!;
    this.archive = new Archive(root);
    this.renderCase();
  }

  private get current(): BuiltCase {
    return this.cases[this.idx];
  }

  private renderCase(): void {
    const c = this.current;
    this.caseStamps = new Set();
    this.caseDuration = (BASE_SECONDS + SECONDS_PER_ITEM * c.items.length) * 1000;
    const circ = c.circumstances;

    this.stage.innerHTML = `
      <div class="casefile fade-in">
        <div class="idstrip">
          <div>
            <div class="name">${c.name}</div>
            <div class="meta">Case ${c.id.toUpperCase()} · ${this.idx + 1} of ${this.cases.length} · review period: ${c.reviewTurns} weeks</div>
          </div>
          <div class="benefit">
            <div class="amt">$${c.benefit}</div>
            <div class="lbl">Monthly benefit</div>
          </div>
        </div>
        <div class="circumstances">
          <div class="c"><span class="k">Dependents</span>${circ.dependents}</div>
          <div class="c"><span class="k">Situation</span>${circ.situation}</div>
          <div class="c"><span class="k">Housing</span>${circ.housing}</div>
          <div class="c wide">${circ.note}</div>
        </div>
        <div class="timer-wrap"><div class="timer-bar" id="timer" style="width:100%"></div></div>
        <table class="ledger">
          <thead><tr>
            <th>Item under review</th>
            <th class="num" style="width:90px">Amount</th>
            <th class="stamp-cell">Determination</th>
          </tr></thead>
          <tbody id="rows"></tbody>
        </table>
        <div class="actions">
          <span class="hint" id="hint"></span>
          <div class="spacer"></div>
          <button class="btn" id="submit" disabled>Submit case →</button>
        </div>
      </div>`;

    const rows = this.stage.querySelector("#rows")!;
    const categories = c.items.filter((i) => i.kind === "category");
    const bigTickets = c.items.filter((i) => i.kind === "bigticket");
    rows.appendChild(this.groupRow("Discretionary spend — period totals"));
    for (const item of categories) rows.appendChild(this.renderRow(item));
    if (bigTickets.length > 0) {
      rows.appendChild(this.groupRow("Single purchases"));
      for (const item of bigTickets) rows.appendChild(this.renderRow(item));
    }
    this.stage.querySelector<HTMLButtonElement>("#submit")!.addEventListener("click", () => this.submit());
    this.updateHint();
    this.startTimer();
  }

  private groupRow(label: string): HTMLElement {
    const tr = document.createElement("tr");
    tr.className = "group";
    tr.innerHTML = `<td colspan="3">${label}</td>`;
    return tr;
  }

  private renderRow(item: ReviewItem): HTMLElement {
    const tr = document.createElement("tr");
    tr.className = `flaggable item-${item.kind}`;
    tr.dataset.itemId = item.itemId;
    tr.innerHTML = `
      <td class="label">${item.label}<small>${item.detail}</small></td>
      <td class="num">−$${item.spend}</td>
      <td class="stamp-cell"></td>`;
    const cell = tr.querySelector<HTMLElement>(".stamp-cell")!;
    const btns = VERDICTS.map((v) => this.mkBtn(v));
    for (const [i, b] of btns.entries()) {
      b.addEventListener("click", () => this.stamp(item, VERDICTS[i], cell, btns));
    }
    cell.append(...btns);
    return tr;
  }

  private mkBtn(verdict: Verdict): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `stampbtn ${verdict}`;
    b.textContent = VERDICT_LABEL[verdict];
    return b;
  }

  private stamp(item: ReviewItem, verdict: Verdict, cell: HTMLElement, btns: HTMLButtonElement[]): void {
    // No desk stamps while the supervisor has the queue (§5) — the paused timer
    // already can't fire timeout(), but nothing may land behind the interstitial.
    if (this.auditOpen) return;
    if (this.caseStamps.has(item.itemId)) return; // one determination per item
    this.caseStamps.add(item.itemId);

    const timeLeftFrac = Math.max(0, 1 - (performance.now() - this.caseStart) / this.caseDuration);
    const breakdown = applyStamp(this.kpi, verdict, item.expected, timeLeftFrac);
    slamStamp(cell, verdict);
    for (const b of btns) b.remove();
    this.showFeedback(cell, item, breakdown);

    // File the both-branches resolution into the archive (§6.3).
    const record: StampRecord = { builtCase: this.current, item, stamp: verdict };
    this.stamped.push(record);
    const cf = resolveItem(this.current, item, verdict, this.config);
    this.counterfactuals.push(cf);
    this.archive.add(cf);

    this.updateKpiStrip(breakdown.points > 0);
    this.updateHint();
    this.maybeEnableSubmit();
    this.maybeNudge();

    // The audit event fires exactly once per threshold crossing (§4, §5).
    if (breakdown.crossedAudit) this.fireAudit(record);
  }

  /** Immediate per-decision feedback (§5): points, standard read, audit delta. */
  private showFeedback(cell: HTMLElement, item: ReviewItem, s: StampScore): void {
    const row = cell.closest("tr");
    const label = row?.querySelector<HTMLElement>("td.label");
    if (!label) return;
    const read =
      s.distance === 0
        ? `<span class="ok">Consistent with standard</span>`
        : `<span class="${s.distance === 1 ? "off" : "bad"}">Below standard — expected ${VERDICT_LABEL[item.expected].toUpperCase()}</span>`;
    const risk = s.auditDelta > 0 ? ` · <span class="risk">audit risk +${s.auditDelta}</span>` : "";
    const fb = document.createElement("div");
    fb.className = "decision-feedback";
    fb.innerHTML = `<span class="pts">+${s.points} pts</span> · ${read}${risk}`;
    label.appendChild(fb);
  }

  private updateKpiStrip(sound: boolean): void {
    tickCounter(this.header.querySelector<HTMLElement>("#k-score")!, this.kpi.score, { sound });
    tickCounter(this.header.querySelector<HTMLElement>("#k-streak")!, this.kpi.flagStreak);
    tickCounter(this.header.querySelector<HTMLElement>("#k-audit")!, Math.round(this.kpi.auditRisk));
    this.header.querySelector<HTMLElement>("#k-align")!.textContent = `${Math.round(alignment(this.kpi) * 100)}%`;
  }

  private remaining(): number {
    return this.current.items.filter((i) => !this.caseStamps.has(i.itemId)).length;
  }

  private maybeEnableSubmit(): void {
    if (this.remaining() === 0 && !this.auditOpen) {
      this.stopTimer();
      this.stage.querySelector<HTMLButtonElement>("#submit")!.disabled = false;
    }
  }

  private updateHint(): void {
    const left = this.remaining();
    const hint = this.stage.querySelector<HTMLElement>("#hint");
    if (hint) hint.textContent = left > 0 ? `${left} item${left > 1 ? "s" : ""} awaiting determination` : "Case ready to submit.";
  }

  private maybeNudge(): void {
    // The single midway nudge toward the archive (§6.3 discovery pacing) —
    // fires once, after the second case's determinations are in.
    if (this.idx === 1 && this.remaining() === 0 && this.archive.count > 0) {
      this.archive.nudge(
        "Clerk note: nice numbers this shift. When you get a sec — the resolved files show how each period actually played out. Not required reading.",
      );
    }
  }

  // ---- audit event (§5) ----
  /**
   * The supervisor screen. Crossing the audit threshold pulls ONE prior
   * determination back for a fresh determination — the earliest under-called
   * expected-flag on the books (the crossing stamp itself if there is no
   * earlier one). The rating penalty is already on the books in the KPI
   * (audit standing docks two stars); this is where it gets a face.
   */
  private fireAudit(crossing: StampRecord): void {
    this.auditOpen = true;
    // The case clock pauses while the supervisor has the queue (§5): otherwise
    // timeout() could auto-approve unseen items behind the interstitial. Note
    // whether it was running — if the crossing stamp was the case's last, the
    // timer is already stopped and there is nothing to resume.
    const wasRunning = this.timerId !== null;
    const pausedAt = performance.now();
    this.stopTimer();
    this.stage.querySelector<HTMLButtonElement>("#submit")?.setAttribute("disabled", "");

    const target =
      this.stamped.find(
        (r) => r !== crossing && r.item.expected === "flag" && r.stamp !== "flag",
      ) ?? crossing;

    const overlay = document.createElement("div");
    overlay.className = "audit-event";
    overlay.innerHTML = `
      <div class="memo">
        <h2>AUDIT — DETERMINATION REVIEW</h2>
        <div class="sub">Office of the Supervising Examiner</div>
        <p>Your approvals this shift exceeded division tolerance for unresolved
        discretionary spend. This audit is recorded against your rating. One
        prior determination has been pulled for re-review. A fresh determination
        is required before your queue resumes.</p>
        <div class="rereview">
          <div class="what">${target.item.label} — ${target.builtCase.name}
            <small>${target.item.detail} · previously ${VERDICT_PAST[target.stamp]}</small>
          </div>
          <div class="amt">−$${target.item.spend}</div>
          <div class="restamp"></div>
        </div>
        <div class="actions">
          <div class="spacer"></div>
          <button class="btn" id="audit-return" disabled>Return to caseload →</button>
        </div>
      </div>`;

    const cell = overlay.querySelector<HTMLElement>(".restamp")!;
    const returnBtn = overlay.querySelector<HTMLButtonElement>("#audit-return")!;
    const btns = VERDICTS.map((v) => this.mkBtn(v));
    for (const [i, b] of btns.entries()) {
      b.addEventListener("click", () => {
        // The re-determination is a real stamp: scored, filed, on the books.
        const verdict = VERDICTS[i];
        const breakdown = applyStamp(this.kpi, verdict, target.item.expected, 0);
        slamStamp(cell, verdict);
        for (const bb of btns) bb.remove();
        this.stamped.push({ builtCase: target.builtCase, item: target.item, stamp: verdict });
        const cf = resolveItem(target.builtCase, target.item, verdict, this.config);
        this.counterfactuals.push(cf);
        this.archive.add(cf);
        this.updateKpiStrip(breakdown.points > 0);
        returnBtn.disabled = false;
      });
    }
    cell.append(...btns);

    returnBtn.addEventListener("click", () => {
      overlay.remove();
      this.auditOpen = false;
      // Resume the case clock with the remaining fraction preserved: shift the
      // case's start forward by however long the interstitial was up.
      if (wasRunning && this.remaining() > 0) {
        this.caseStart += performance.now() - pausedAt;
        this.runTimer();
      }
      this.maybeEnableSubmit();
    });

    this.root.appendChild(overlay);
    // The crossing lands as an event, not a popup (§6.5 register): the screen
    // dims first, a beat, then the memo drops in with a heavy, muffled stamp —
    // timed to the memo's delayed entrance (see .audit-event .memo in CSS).
    setTimeout(() => playStamp({ muffled: true, gain: 1.6 }), 260);
  }

  // ---- timer ----
  private startTimer(): void {
    this.caseStart = performance.now();
    this.runTimer();
  }

  /** (Re)start the tick loop against the current caseStart — startTimer for a
   *  fresh case, or the audit's resume after it shifts caseStart forward. */
  private runTimer(): void {
    const bar = this.stage.querySelector<HTMLElement>("#timer")!;
    const tick = (): void => {
      const frac = Math.max(0, 1 - (performance.now() - this.caseStart) / this.caseDuration);
      bar.style.width = `${frac * 100}%`;
      bar.classList.toggle("low", frac < 0.25);
      if (frac <= 0) {
        this.timeout();
        return;
      }
      this.timerId = requestAnimationFrame(tick);
    };
    this.timerId = requestAnimationFrame(tick);
  }

  private stopTimer(): void {
    if (this.timerId !== null) cancelAnimationFrame(this.timerId);
    this.timerId = null;
  }

  private timeout(): void {
    // Out of time: unstamped items default to APPROVE — which quietly accrues
    // audit risk on any expected-flag item. Dawdling has a cost.
    this.stopTimer();
    for (const item of this.current.items) {
      if (this.caseStamps.has(item.itemId)) continue;
      const cell = this.findCell(item.itemId);
      const btns = cell ? Array.from(cell.querySelectorAll<HTMLButtonElement>("button")) : [];
      if (cell) this.stamp(item, "approve", cell, btns);
    }
  }

  private findCell(itemId: string): HTMLElement | null {
    return this.stage.querySelector<HTMLElement>(`tr[data-item-id="${itemId}"] .stamp-cell`);
  }

  private submit(): void {
    this.stopTimer();
    this.kpi.casesResolved += 1;
    this.idx += 1;
    if (this.idx >= this.cases.length) {
      this.finish();
    } else {
      this.renderCase();
    }
  }

  private finish(): void {
    this.onComplete({
      kpi: this.kpi,
      counterfactuals: this.counterfactuals,
      cases: this.cases,
    });
  }
}

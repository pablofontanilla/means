// The desk (§6) — Act 1's controller. Each case file is an engine run viewed
// from outside; the player stamps its discretionary lines under time pressure,
// the KPI pays them for flagging, and every resolved decision is filed into the
// archive with both branches. Held completely straight (pillar 6): the
// institution is delighted with you, and never winks.

import type { Config } from "../engine/config.ts";
import { slamStamp, tickCounter } from "../ui/juice.ts";
import { Archive } from "./archive.ts";
import type { BuiltCase, CaseLine, RubricVerdict } from "./cases.ts";
import { buildCaseload } from "./cases.ts";
import { resolveLine, type Counterfactual } from "./counterfactual.ts";
import { accuracy, applyStamp, initKpi, type KpiState } from "./kpi.ts";

export interface DeskOutcome {
  kpi: KpiState;
  counterfactuals: Counterfactual[];
  cases: BuiltCase[];
  stampsByCase: Map<string, Map<string, RubricVerdict>>;
}

const SECONDS_PER_LINE = 3.5;
const BASE_SECONDS = 7;

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
  private stampsByCase = new Map<string, Map<string, RubricVerdict>>();

  private stage: HTMLElement;
  private header: HTMLElement;

  private caseStamps = new Map<string, RubricVerdict>();
  private timerId: number | null = null;
  private caseStart = 0;
  private caseDuration = 0;

  constructor(
    root: HTMLElement,
    private config: Config,
    private onComplete: (o: DeskOutcome) => void,
  ) {
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
          <div class="kpi"><span class="n" id="k-acc">100%</span><span class="l">Accuracy</span></div>
          <div class="kpi audit"><span class="n" id="k-audit" data-val="0">0</span><span class="l">Audit risk</span></div>
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
    this.caseStamps = new Map();
    const flaggable = c.lines.filter((l) => l.flaggable);
    this.caseDuration = (BASE_SECONDS + SECONDS_PER_LINE * flaggable.length) * 1000;

    this.stage.innerHTML = `
      <div class="casefile fade-in">
        <div class="idstrip">
          <div>
            <div class="name">${c.name}</div>
            <div class="meta">Case ${c.id.toUpperCase()} · ${this.idx + 1} of ${this.cases.length}</div>
          </div>
          <div class="benefit">
            <div class="amt">$${c.benefit}</div>
            <div class="lbl">Monthly benefit</div>
          </div>
        </div>
        <div class="note">${c.claimNote}</div>
        <div class="timer-wrap"><div class="timer-bar" id="timer" style="width:100%"></div></div>
        <table class="ledger">
          <thead><tr>
            <th style="width:52px">Wk</th><th>Line item</th>
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
    for (const line of c.lines) {
      rows.appendChild(this.renderRow(line));
    }
    this.stage.querySelector<HTMLButtonElement>("#submit")!.addEventListener("click", () => this.submit());
    this.updateHint();
    this.startTimer();
  }

  private renderRow(line: CaseLine): HTMLElement {
    const tr = document.createElement("tr");
    tr.className = line.flaggable ? "flaggable" : "essential";
    const amt = line.amount < 0 ? `−$${Math.abs(line.amount)}` : `+$${line.amount}`;
    tr.innerHTML = `
      <td class="wk">${line.turn}</td>
      <td class="label">${line.label}</td>
      <td class="num">${amt}</td>
      <td class="stamp-cell"></td>`;
    const cell = tr.querySelector<HTMLElement>(".stamp-cell")!;
    if (!line.flaggable) {
      cell.innerHTML = `<span style="color:#adb6c1">—</span>`;
      return tr;
    }
    const approve = this.mkBtn("approve", "Approve");
    const flag = this.mkBtn("flag", "Flag");
    approve.addEventListener("click", () => this.stamp(line, "approve", cell, [approve, flag]));
    flag.addEventListener("click", () => this.stamp(line, "flag", cell, [approve, flag]));
    cell.append(approve, flag);
    return tr;
  }

  private mkBtn(kind: "approve" | "flag", label: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `stampbtn ${kind}`;
    b.textContent = label;
    return b;
  }

  private stamp(line: CaseLine, verdict: RubricVerdict, cell: HTMLElement, btns: HTMLButtonElement[]): void {
    if (this.caseStamps.has(line.lineId)) return; // one determination per line
    this.caseStamps.set(line.lineId, verdict);

    const timeLeftFrac = Math.max(0, 1 - (performance.now() - this.caseStart) / this.caseDuration);
    const breakdown = applyStamp(this.kpi, verdict, line.rubric, timeLeftFrac);
    slamStamp(cell, verdict);
    for (const b of btns) b.remove();

    // File the both-branches resolution into the archive (§6.3).
    const cf = resolveLine(this.current, line, verdict, this.config);
    this.counterfactuals.push(cf);
    this.archive.add(cf);

    this.updateKpiStrip(breakdown.points > 0);
    this.updateHint();
    this.maybeEnableSubmit();
    this.maybeNudge();
  }

  private updateKpiStrip(sound: boolean): void {
    tickCounter(this.header.querySelector<HTMLElement>("#k-score")!, this.kpi.score, { sound });
    tickCounter(this.header.querySelector<HTMLElement>("#k-streak")!, this.kpi.flagStreak);
    tickCounter(this.header.querySelector<HTMLElement>("#k-audit")!, Math.round(this.kpi.auditRisk));
    this.header.querySelector<HTMLElement>("#k-acc")!.textContent = `${Math.round(accuracy(this.kpi) * 100)}%`;
  }

  private remainingFlaggable(): number {
    const flaggable = this.current.lines.filter((l) => l.flaggable);
    return flaggable.filter((l) => !this.caseStamps.has(l.lineId)).length;
  }

  private maybeEnableSubmit(): void {
    if (this.remainingFlaggable() === 0) {
      this.stopTimer();
      this.stage.querySelector<HTMLButtonElement>("#submit")!.disabled = false;
    }
  }

  private updateHint(): void {
    const left = this.remainingFlaggable();
    const hint = this.stage.querySelector<HTMLElement>("#hint");
    if (hint) hint.textContent = left > 0 ? `${left} line${left > 1 ? "s" : ""} awaiting determination` : "Case ready to submit.";
  }

  private maybeNudge(): void {
    // The single midway nudge toward the archive (§6.3 discovery pacing).
    if (this.idx === 2 && this.remainingFlaggable() === 0 && this.archive.count > 0) {
      this.archive.nudge(
        "Clerk note: nice numbers this shift. When you get a sec — the resolved files show how each period actually played out. Not required reading.",
      );
    }
  }

  // ---- timer ----
  private startTimer(): void {
    this.caseStart = performance.now();
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
    // Out of time: unstamped lines default to APPROVE — which quietly accrues
    // audit risk on any rubric-flag line. Dawdling has a cost.
    this.stopTimer();
    for (const line of this.current.lines) {
      if (line.flaggable && !this.caseStamps.has(line.lineId)) {
        const cell = this.findCell(line.lineId);
        const btns = cell ? Array.from(cell.querySelectorAll<HTMLButtonElement>("button")) : [];
        if (cell) this.stamp(line, "approve", cell, btns);
      }
    }
  }

  private findCell(lineId: string): HTMLElement | null {
    // Rows are rendered one-per-line in order, so row index tracks line index.
    const rows = this.stage.querySelectorAll("tbody tr");
    const lines = this.current.lines;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].lineId === lineId) return rows[i]?.querySelector(".stamp-cell") ?? null;
    }
    return null;
  }

  private submit(): void {
    this.stopTimer();
    this.kpi.casesResolved += 1;
    this.stampsByCase.set(this.current.id, new Map(this.caseStamps));
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
      stampsByCase: this.stampsByCase,
    });
  }
}

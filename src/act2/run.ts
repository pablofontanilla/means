// Act 2 — the case (§7). The player now lives one engine run from the inside,
// rendered in the interface they used to wield at the desk. Their purchases
// appear as ledger lines with the same flag-risk indicator they spent Act 1
// applying to strangers; the clerk reviews their file with their own policy; and
// the previously hidden capacity meter is finally visible (§7.4). Nothing else
// visually distinguishes the acts — continuity is the statement (§8).

import { type Config, maxTier } from "../engine/config.ts";
import { initState, step } from "../engine/engine.ts";
import { renderLedger } from "../engine/ledger.ts";
import { footingShape } from "../engine/simulate.ts";
import type { Allocation, RunState } from "../engine/types.ts";
import { playStamp } from "../ui/audio.ts";
import { clerkReview } from "./clerk.ts";

export interface Act2Context {
  name: string;
  flagRate: number; // the player's Act 1 flag rate — the clerk's policy
}

export function runAct2(
  root: HTMLElement,
  config: Config,
  ctx: Act2Context,
  onEnd?: (state: RunState) => void,
): void {
  new Act2Run(root, config, ctx, onEnd);
}

class Act2Run {
  private state: RunState;
  private alloc: Allocation = { regularShifts: 2, overtimeShifts: 0, restSlots: 1, errandSlots: 1, restorationUnits: 0, attemptTierMove: false };
  private purchasesSinceReview = 0;
  private lastClerkNote: string | null = null;
  private lastWeekSummary = "A fresh review period. Allocate your week.";

  constructor(
    private root: HTMLElement,
    private config: Config,
    private ctx: Act2Context,
    private onEnd?: (state: RunState) => void,
  ) {
    this.state = initState(config, Date.now() & 0xffff);
    this.render();
  }

  private capacityClass(): string {
    const c = this.state.capacity;
    if (c < this.config.desperationThreshold) return "crit";
    if (c < this.config.desperationThreshold * 1.8) return "low";
    return "";
  }

  private render(): void {
    const s = this.state;
    const capPct = (s.capacity / this.config.capacityMax) * 100;
    const tierName = this.config.tiers[s.tier].name;

    this.root.innerHTML = `
      <header class="portal-header">
        <div class="seal">MT</div>
        <div>
          <h1>Claimant Portal</h1>
          <div class="sub">Benefits Integrity Division · your file</div>
        </div>
        <div class="spacer"></div>
        <div class="meters">
          <div class="meter capacity">
            <div class="lbl">Capacity</div>
            <div class="track"><div class="fill ${this.capacityClass()}" style="width:${capPct}%"></div></div>
            <div class="val">${Math.round(s.capacity)} / ${this.config.capacityMax}</div>
          </div>
          <div class="you-strip">
            <div class="cash"><span class="amt">$${Math.round(s.money)}</span><span class="lbl">On hand · ${tierName}</span></div>
          </div>
        </div>
      </header>
      <div class="stage">
        <div class="casefile fade-in">
          <div class="idstrip">
            <div>
              <div class="name">${this.ctx.name}</div>
              <div class="meta">Week ${s.turn} of a means-tested claim · stamp fields read-only</div>
            </div>
            <div class="benefit"><div class="amt">Wk ${s.turn}</div><div class="lbl">Review period</div></div>
          </div>
          <div class="note">${this.lastWeekSummary}</div>
          ${this.lastClerkNote ? `<div class="clerk-review"><span class="tag">Reviewing officer</span><p>${this.lastClerkNote}</p></div>` : ""}
          <table class="ledger">
            <thead><tr><th style="width:52px">Wk</th><th>Line item</th><th class="num" style="width:90px">Amount</th></tr></thead>
            <tbody id="rows"></tbody>
          </table>
          ${this.renderAllocatePanel()}
        </div>
      </div>`;

    this.fillLedger();
    this.wireControls();
  }

  private fillLedger(): void {
    const rows = this.root.querySelector("#rows")!;
    const lines = renderLedger(this.state);
    // Show the most recent ~14 lines so the growing file stays legible.
    for (const line of lines.slice(-14)) {
      const tr = document.createElement("tr");
      const risk = line.category === "restoration";
      tr.className = risk ? "flaggable risk" : "essential";
      const amt = line.amount < 0 ? `−$${Math.abs(line.amount)}` : `+$${line.amount}`;
      tr.innerHTML = `<td class="wk">${line.turn}</td><td class="label">${line.label}</td><td class="num">${amt}</td>`;
      rows.appendChild(tr);
    }
    if (lines.length === 0) {
      rows.innerHTML = `<tr><td colspan="3" style="color:#adb6c1">No entries yet. Your first week posts below.</td></tr>`;
    }
  }

  private renderAllocatePanel(): string {
    const c = this.config;
    const a = this.alloc;
    const nextTier = this.state.tier < maxTier(c) ? c.tiers[this.state.tier + 1] : null;
    const moveAffordable = nextTier ? this.state.money >= nextTier.moveCost : false;
    const restCost = a.restorationUnits * c.restorationCost;
    return `
      <div class="allocate">
        <h3>Allocate this week — ${c.timeSlotsPerTurn} time slots · money on hand $${Math.round(this.state.money)}</h3>
        <div class="ctl">
          <div class="name">Work shifts<small>earns money, drains capacity</small></div>
          <div class="stepper" data-step="work">
            <button data-d="-1">–</button><span class="v" id="v-work">${a.regularShifts}</span><button data-d="1">+</button>
          </div>
          <div class="effect" id="e-work"></div>
        </div>
        <div class="ctl">
          <div class="name">Rest<small>restores capacity, no pay</small></div>
          <div class="stepper" data-step="rest">
            <button data-d="-1">–</button><span class="v" id="v-rest">${a.restSlots}</span><button data-d="1">+</button>
          </div>
          <div class="effect">${a.restSlots} of ${c.timeSlotsPerTurn - a.regularShifts} free slot(s)</div>
        </div>
        <div class="ctl">
          <div class="name">Small comforts<small>restores capacity · flag-risk</small></div>
          <div class="stepper" data-step="rest-units">
            <button data-d="-1">–</button><span class="v" id="v-units">${a.restorationUnits}</span><button data-d="1">+</button>
          </div>
          <div class="effect" id="e-units">${restCost > 0 ? `−$${restCost}` : "—"}</div>
        </div>
        <div class="ctl tier">
          <div class="name">Move up a tier<small>${nextTier ? `${nextTier.name} · −$${nextTier.moveCost} · less drain` : "at the top tier"}</small></div>
          <button class="btn ghost" id="tier-btn" ${!nextTier || !moveAffordable ? "disabled" : ""}>${a.attemptTierMove ? "Will attempt ✓" : "Attempt move"}</button>
        </div>
        <div class="actions" style="background:transparent;border:0;padding:12px 0 0">
          <div class="spacer"></div>
          <button class="btn" id="end-week">End week →</button>
        </div>
      </div>`;
  }

  private wireControls(): void {
    const c = this.config;
    const clampAlloc = (): void => {
      // Time slots are shared between work and rest.
      this.alloc.regularShifts = Math.max(0, Math.min(c.timeSlotsPerTurn, this.alloc.regularShifts));
      this.alloc.restSlots = Math.max(0, Math.min(c.timeSlotsPerTurn - this.alloc.regularShifts, this.alloc.restSlots));
      this.alloc.restorationUnits = Math.max(0, Math.min(c.maxRestorationUnits, this.alloc.restorationUnits));
    };
    this.root.querySelectorAll<HTMLElement>(".stepper").forEach((stepper) => {
      const which = stepper.dataset.step!;
      stepper.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const d = parseInt(btn.dataset.d!, 10);
          if (which === "work") {
            this.alloc.regularShifts += d;
            if (d > 0) this.alloc.restSlots = Math.max(0, this.alloc.restSlots - 1);
          } else if (which === "rest") {
            this.alloc.restSlots += d;
            if (d > 0) this.alloc.regularShifts = Math.max(0, this.alloc.regularShifts - 1);
          } else {
            this.alloc.restorationUnits += d;
          }
          clampAlloc();
          this.refreshPanel();
        });
      });
    });
    const tierBtn = this.root.querySelector<HTMLButtonElement>("#tier-btn");
    tierBtn?.addEventListener("click", () => {
      this.alloc.attemptTierMove = !this.alloc.attemptTierMove;
      this.refreshPanel();
    });
    this.root.querySelector<HTMLButtonElement>("#end-week")!.addEventListener("click", () => this.endWeek());
  }

  private refreshPanel(): void {
    // Re-render just the allocation panel (cheap; keeps the ledger/meters put).
    const panel = this.root.querySelector(".allocate");
    if (panel) {
      panel.outerHTML = this.renderAllocatePanel();
      this.wireControls();
    }
  }

  private endWeek(): void {
    const unitsThisWeek = this.alloc.restorationUnits;
    this.state = step(this.state, this.alloc, this.config);
    this.purchasesSinceReview += unitsThisWeek;
    this.lastWeekSummary = this.summarizeWeek();
    this.lastClerkNote = null;

    // Clerk review on the interval (§7.5) — flavor docks + the muffled stamp.
    if (this.state.outcome === null && this.state.turn % this.config.clerkInterval === 0) {
      const verdict = clerkReview(this.purchasesSinceReview, this.ctx.flagRate, this.config);
      if (verdict.dock > 0) {
        this.state = { ...this.state, money: this.state.money - verdict.dock };
      }
      this.lastClerkNote = verdict.note;
      this.purchasesSinceReview = 0;
      // The stamp sound that used to pay them dopamine — now happening TO them.
      for (let i = 0; i < Math.max(1, verdict.flagged); i++) {
        setTimeout(() => playStamp({ muffled: true }), i * 260);
      }
    }

    // Reset the week's allocation to sensible defaults.
    this.alloc = { regularShifts: 2, overtimeShifts: 0, restSlots: 1, errandSlots: 1, restorationUnits: 0, attemptTierMove: false };

    if (this.state.outcome !== null) {
      this.showEnding();
    } else {
      this.render();
    }
  }

  private summarizeWeek(): string {
    const rec = this.state.history[this.state.history.length - 1];
    if (!rec) return "";
    const parts = [`Week ${rec.turn}: earned $${Math.round(rec.spend.earned)}.`];
    if (rec.event) {
      const e = rec.event;
      if (e.moneyHit < 0) parts.push(`${e.card.label}: +$${Math.abs(Math.round(e.moneyHit))}.`);
      else if (e.absorbed) parts.push(`${e.card.label} ($${Math.round(e.card.moneyHit)}): absorbed.`);
      else parts.push(`${e.card.label}: no buffer — borrowed $${Math.round(e.borrowed)} at ${Math.round(this.config.borrowInterest * 100)}%.`);
    }
    if (rec.spend.tierMoveCost > 0) parts.push(`Moved to ${this.config.tiers[this.state.tier].name}.`);
    return parts.join(" ");
  }

  private showEnding(): void {
    const s = this.state;
    const shape = footingShape(s);
    const outcome = s.outcome!;
    const titles: Record<string, string> = {
      escaped: "You got out.",
      collapsed: "It came apart.",
      trapped: "Still here.",
    };
    const epitaphs: Record<string, string> = {
      lifting: "Footing just beginning to lift — recovery is real, and lagged.",
      stabilized: "Footing stabilized — you held the line, exactly where you started.",
      freefall: "Footing in freefall — the epitaph of a period spent only surviving.",
    };
    const body: Record<string, string> = {
      escaped:
        "You crossed the structural line before capacity hit zero. Not because you got smarter — because you finally had enough slack that a shock stopped being lethal.",
      collapsed: "Capacity reached zero. The comforts you skipped were the engine; without them it stalled.",
      trapped:
        "Thirty weeks. You kept the machine running, spent every comfort exactly right — and you are in the same hole. This is the trap: not death, but not moving.",
    };

    const stage = this.root.querySelector<HTMLElement>(".stage") ?? this.root;
    stage.innerHTML = `
      <div class="ending ${outcome} fade-in"><div class="card">
        <h2>${titles[outcome]}</h2>
        <canvas class="footing-line" id="foot" width="480" height="60"></canvas>
        <p>${body[outcome]}</p>
        <p class="epitaph">${epitaphs[shape]}</p>
        <button class="btn" id="again">Play again</button>
      </div></div>`;
    this.drawFooting();
    stage.querySelector<HTMLButtonElement>("#again")!.addEventListener("click", () => {
      if (this.onEnd) this.onEnd(s);
      else runAct2(this.root, this.config, this.ctx);
    });
  }

  private drawFooting(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#foot");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const h = this.state.history;
    if (h.length < 2) return;
    ctx.strokeStyle = "#0f6fb5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    h.forEach((rec, i) => {
      const x = (i / (h.length - 1)) * canvas.width;
      const y = canvas.height - (rec.footing / 100) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

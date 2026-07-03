// The archive drawer (§6.3): resolved cases land here, one click away, each
// showing BOTH branches. Never forced on the player — a single clerk annotation
// midway nudges toward it (discovery pacing). The KPI keeps climbing while the
// archive rots; that growing gap is the pedagogy. The moment a player opens this
// unprompted mid-streak is the moment Act 1 is working.

import type { Counterfactual } from "./counterfactual.ts";

export class Archive {
  private entries: Counterfactual[] = [];
  private drawer: HTMLElement;
  private scroll: HTMLElement;
  private badge: HTMLElement;
  private tab: HTMLElement;
  private open = false;

  constructor(root: HTMLElement) {
    this.tab = document.createElement("button");
    this.tab.className = "drawer-tab";
    this.tab.innerHTML = `Case Archive <span class="badge">0</span>`;
    this.tab.addEventListener("click", () => this.toggle());
    this.badge = this.tab.querySelector(".badge")!;

    this.drawer = document.createElement("aside");
    this.drawer.className = "drawer";
    this.drawer.innerHTML = `
      <header><h2>Case Archive</h2><button class="x" aria-label="Close">×</button></header>
      <div class="scroll"></div>`;
    this.scroll = this.drawer.querySelector(".scroll")!;
    this.drawer.querySelector(".x")!.addEventListener("click", () => this.close());

    root.appendChild(this.tab);
    root.appendChild(this.drawer);
    this.render();
  }

  add(cf: Counterfactual): void {
    this.entries.push(cf);
    this.badge.textContent = String(this.entries.length);
    this.render();
  }

  /** The single midway nudge (§6.3) — a clerk annotation, not a forced modal. */
  nudge(text: string): void {
    const note = document.createElement("div");
    note.className = "clerk-note";
    note.textContent = text;
    this.scroll.prepend(note);
    this.tab.animate?.(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(0)" }],
      { duration: 400, iterations: 3 },
    );
  }

  toggle(): void {
    this.open ? this.close() : this.openDrawer();
  }
  openDrawer(): void {
    this.open = true;
    this.drawer.classList.add("open");
  }
  close(): void {
    this.open = false;
    this.drawer.classList.remove("open");
  }

  get count(): number {
    return this.entries.length;
  }

  private render(): void {
    if (this.entries.length === 0) {
      this.scroll.innerHTML = `<p style="color:#6a7686;font-size:13px">No resolved cases yet. Each decision, once the period plays out, is filed here — both what happened, and what would have.</p>`;
      return;
    }
    // Newest first — the freshest decisions on top.
    this.scroll.innerHTML = this.entries
      .slice()
      .reverse()
      .map((cf) => this.renderEntry(cf))
      .join("");
  }

  private renderEntry(cf: Counterfactual): string {
    const cls = cf.flagCorrect ? "correct" : "trap";
    const verb = cf.stamp === "flag" ? "FLAGGED" : "APPROVED";
    const dock = cf.docked > 0 ? ` Benefit docked $${cf.docked}.` : "";
    const altTag = cf.stamp === "flag" ? "Branch if approved" : "Branch if flagged";
    return `
      <div class="cf ${cls}">
        <div class="head">${cf.caseName} — $${Math.abs(cf.amount)}, ${cf.label}. ${verb}.</div>
        <div class="sub">Retained: $${Math.abs(cf.amount)}.${dock}</div>
        <div class="branch played"><span class="tag">Branch as played</span>${cf.asPlayed}</div>
        <div class="branch alt"><span class="tag">${altTag}</span>${cf.alternative}</div>
      </div>`;
  }
}

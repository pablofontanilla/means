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
    // correct = the vindicated fraud flag; trap = a dock that hurt a real
    // period; neutral = an approval that changed nothing (no dock applied).
    const cls = cf.flagCorrect === true ? "correct" : cf.flagCorrect === false ? "trap" : "neutral";
    const verb = { approve: "APPROVED", warn: "WARNED", flag: "FLAGGED" }[cf.stamp];
    const dock = cf.docked > 0 ? ` Benefit docked $${cf.docked}.` : " No dock applied.";
    // The tag names the pole the alternative text actually describes — a warn
    // on the fraud item branches toward the flag, not back to an approval.
    const altTag = cf.altPole === "flag" ? "Branch if flagged" : "Branch if approved";
    return `
      <div class="cf ${cls}">
        <div class="head">${cf.caseName} — ${cf.label}, $${cf.spend} under review. ${verb}.</div>
        <div class="sub">${dock.trim()}</div>
        <div class="branch played"><span class="tag">Branch as played</span>${cf.asPlayed}</div>
        <div class="branch alt"><span class="tag">${altTag}</span>${cf.alternative}</div>
      </div>`;
  }
}

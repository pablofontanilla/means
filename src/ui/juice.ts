// Cheap-but-real juice (§6.5, M5): the stamp slam and KPI counters that ratchet
// up with cadence. Held completely straight — sincere, tactile, zero irony. The
// register is the Papers, Please stamp / Balatro, not parodic gamification.

import { playStamp, playTick } from "./audio.ts";

const STAMP_TEXT = { flag: "Flagged", approve: "Approved", warn: "Warning" } as const;

/** Slam a stamp mark into a cell and fire the sound. Returns the mark element. */
export function slamStamp(
  container: HTMLElement,
  verdict: "flag" | "approve" | "warn",
  opts: { muffled?: boolean; silent?: boolean } = {},
): HTMLElement {
  container.innerHTML = "";
  const mark = document.createElement("span");
  mark.className = `stamp-mark ${verdict} slam`;
  mark.textContent = STAMP_TEXT[verdict];
  container.appendChild(mark);
  // Jolt the whole row for impact — the sound and the motion land together.
  const row = container.closest("tr");
  if (row) {
    row.classList.remove("stamp-hit");
    void row.offsetWidth; // restart the animation if re-stamped
    row.classList.add("stamp-hit");
  }
  if (!opts.silent) playStamp({ muffled: opts.muffled, warn: verdict === "warn" });
  return mark;
}

/**
 * Ratchet a numeric element from its current value to `to`, ticking as it goes.
 * The counter cadence is part of the dopamine (§6.5).
 */
export function tickCounter(el: HTMLElement, to: number, opts: { sound?: boolean } = {}): void {
  const from = parseInt(el.dataset.val ?? el.textContent ?? "0", 10) || 0;
  el.dataset.val = String(to);
  if (from === to) {
    el.textContent = String(to);
    return;
  }
  const steps = Math.min(Math.abs(to - from), 14);
  const dir = Math.sign(to - from);
  const stepSize = (to - from) / steps;
  let i = 0;
  el.parentElement?.classList.add("pulse");
  const timer = setInterval(() => {
    i++;
    const v = i >= steps ? to : Math.round(from + stepSize * i);
    el.textContent = String(v);
    if (opts.sound && dir > 0 && i % 2 === 0) playTick();
    if (i >= steps) {
      clearInterval(timer);
      setTimeout(() => el.parentElement?.classList.remove("pulse"), 200);
    }
  }, 34);
}

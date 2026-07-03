// Headless tuning dashboard (dev-only). Sliders bound to a live clone of the
// config, a "run N" cohort button, the outcome distribution, and footing/
// capacity sparklines. This is where pillar 4 (winnable but rare) is tuned
// before the game UI exists (§5.7, M2).

import { cloneConfig, type Config, DEFAULT_CONFIG } from "./engine/config.ts";
import { makeRestorationPolicy, makeRestraintPolicy } from "./engine/policies.ts";
import { footingShape, runCohort, runFull, seedRange } from "./engine/simulate.ts";
import type { RunState } from "./engine/types.ts";

const cfg: Config = cloneConfig(DEFAULT_CONFIG);

interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
}

const sliders: SliderSpec[] = [
  spec("shiftYield", 10, 45, 1, "shiftYield"),
  spec("shiftFatigue", 2, 18, 1, "shiftFatigue"),
  spec("restPerSlot", 4, 24, 1, "restPerSlot"),
  spec("restorationCost", 2, 16, 1, "restorationCost"),
  spec("restorationCapacity", 3, 20, 1, "restorationCapacity"),
  spec("desperationThreshold", 5, 50, 1, "desperationThreshold"),
  spec("eventBaseChance", 0, 1, 0.02, "eventBaseChance"),
  spec("borrowInterest", 0, 0.6, 0.01, "borrowInterest"),
  spec("escapeReserve", 20, 200, 5, "escapeReserve"),
  spec("footingAlpha", 0.02, 0.4, 0.01, "footingAlpha"),
  {
    label: "tier1 moveCost",
    min: 40,
    max: 400,
    step: 10,
    get: () => cfg.tiers[1].moveCost,
    set: (v) => (cfg.tiers[1].moveCost = v),
  },
  {
    label: "tier2 moveCost",
    min: 80,
    max: 600,
    step: 10,
    get: () => cfg.tiers[2].moveCost,
    set: (v) => (cfg.tiers[2].moveCost = v),
  },
];

function spec(
  key: keyof Config,
  min: number,
  max: number,
  step: number,
  label: string,
): SliderSpec {
  return {
    label,
    min,
    max,
    step,
    get: () => cfg[key] as number,
    set: (v) => ((cfg[key] as unknown as number) = v),
  };
}

const root = document.querySelector<HTMLDivElement>("#sandbox")!;
root.innerHTML = `
  <style>
    body { font: 13px/1.5 ui-monospace, Menlo, monospace; margin: 0; background: #0f1115; color: #d7dbe0; }
    .wrap { display: grid; grid-template-columns: 300px 1fr; gap: 24px; padding: 20px; max-width: 1100px; }
    h1 { font-size: 15px; letter-spacing: .1em; text-transform: uppercase; color: #7fd1b9; margin: 0 0 12px; }
    .slider { margin-bottom: 10px; }
    .slider label { display: flex; justify-content: space-between; }
    .slider input { width: 100%; }
    button { background: #2b6; color: #04120b; border: 0; padding: 10px 16px; font: inherit; font-weight: 700; cursor: pointer; border-radius: 4px; }
    .dist { display: flex; gap: 4px; height: 40px; margin: 12px 0; align-items: flex-end; }
    .bar { flex: 1; text-align: center; }
    .bar .fill { display: block; border-radius: 3px 3px 0 0; }
    .esc .fill { background: #3ad29f; } .col .fill { background: #e5646e; } .tra .fill { background: #c9a24b; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    td, th { text-align: right; padding: 3px 10px; border-bottom: 1px solid #232833; }
    th:first-child, td:first-child { text-align: left; }
    canvas { background: #161a21; border: 1px solid #232833; border-radius: 4px; margin-top: 8px; }
    .muted { color: #6b7280; }
  </style>
  <div class="wrap">
    <div>
      <h1>Config</h1>
      <div id="sliders"></div>
      <button id="run">Run N = 1000</button>
      <p class="muted">Escape rare (&lt;15%), stasis common.</p>
    </div>
    <div>
      <h1>Outcomes</h1>
      <div id="results"></div>
      <h1 style="margin-top:24px">Sample runs — footing (green) / capacity (blue)</h1>
      <canvas id="spark" width="740" height="220"></canvas>
    </div>
  </div>
`;

const slidersEl = root.querySelector<HTMLDivElement>("#sliders")!;
for (const s of sliders) {
  const div = document.createElement("div");
  div.className = "slider";
  const valSpan = () => (s.step < 1 ? s.get().toFixed(2) : String(s.get()));
  div.innerHTML = `<label><span>${s.label}</span><span class="v">${valSpan()}</span></label>
    <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.get()}">`;
  const input = div.querySelector("input")!;
  const v = div.querySelector<HTMLSpanElement>(".v")!;
  input.addEventListener("input", () => {
    s.set(parseFloat(input.value));
    v.textContent = valSpan();
  });
  slidersEl.appendChild(div);
}

const resultsEl = root.querySelector<HTMLDivElement>("#results")!;
const canvas = root.querySelector<HTMLCanvasElement>("#spark")!;

function distBar(label: string, cls: string, rate: number): string {
  const h = Math.round(rate * 40);
  return `<div class="bar ${cls}"><span class="fill" style="height:${h}px"></span>${label}<br>${(rate * 100).toFixed(1)}%</div>`;
}

function runAndRender(n: number): void {
  const seeds = seedRange(1, n);
  const restP = makeRestorationPolicy(cfg);
  const restrP = makeRestraintPolicy(cfg);
  const rest = runCohort(cfg, restP, seeds);
  const restr = runCohort(cfg, restrP, seeds);

  // Footing-shape breakdown for escaped runs (the "lifting" epitaph).
  let escLift = 0;
  for (const seed of seeds) {
    const r = runFull(cfg, restP, seed);
    if (r.outcome === "escaped" && footingShape(r) === "lifting") escLift += 1;
  }

  resultsEl.innerHTML = `
    <strong>Restoration policy</strong>
    <div class="dist">
      ${distBar("escaped", "esc", rest.escapeRate)}
      ${distBar("collapsed", "col", rest.collapseRate)}
      ${distBar("trapped", "tra", rest.trappedRate)}
    </div>
    <table>
      <tr><th>policy</th><th>escaped</th><th>collapsed</th><th>trapped</th></tr>
      <tr><td>restoration</td><td>${(rest.escapeRate * 100).toFixed(1)}%</td><td>${(rest.collapseRate * 100).toFixed(1)}%</td><td>${(rest.trappedRate * 100).toFixed(1)}%</td></tr>
      <tr><td>restraint</td><td>${(restr.escapeRate * 100).toFixed(1)}%</td><td>${(restr.collapseRate * 100).toFixed(1)}%</td><td>${(restr.trappedRate * 100).toFixed(1)}%</td></tr>
    </table>
    <p class="muted">Pillar 2 holds iff restraint escapes less &amp; collapses more. Escaped-lifting: ${rest.escaped ? ((escLift / rest.escaped) * 100).toFixed(0) : 0}%.</p>
  `;

  drawSparklines(seeds.slice(0, 24).map((s) => runFull(cfg, restP, s)));
}

function drawSparklines(runs: RunState[]): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const maxTurns = cfg.turnCeiling;
  const plot = (
    runState: RunState,
    pick: (r: { footing: number; capacity: number }) => number,
    max: number,
    color: string,
  ) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    runState.history.forEach((rec, i) => {
      const x = (i / maxTurns) * w;
      const y = h - (pick(rec) / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  for (const r of runs) {
    plot(r, (rec) => rec.footing, 100, "#3ad29f");
    plot(r, (rec) => rec.capacity, cfg.capacityMax, "#5aa0e5");
  }
}

root.querySelector<HTMLButtonElement>("#run")!.addEventListener("click", () => runAndRender(1000));
runAndRender(1000);

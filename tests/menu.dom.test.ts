// @vitest-environment jsdom
// The title menu (P2-M4): a cover page in the same document system. Two paths —
// the full Act 1 → act break → Act 2 flow, and a playtest skip straight into
// Act 2 with an assumed desk record (default flag rate 0.6).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/engine/config.ts";
import { showTitleMenu } from "../src/menu.ts";
import * as act2 from "../src/act2/run.ts";

vi.mock("../src/act2/run.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../src/act2/run.ts")>();
  // Wrap the real runAct2 in a spy: calls still mount the real Act 2, but the
  // ctx it receives (the assumed flag rate) is assertable.
  return { ...mod, runAct2: vi.fn(mod.runAct2) };
});

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  (HTMLCanvasElement.prototype as unknown as { getContext: () => null }).getContext = () => null;
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.mocked(act2.runAct2).mockClear();
});

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  showTitleMenu(root, DEFAULT_CONFIG);
  return root;
}

describe("title menu", () => {
  it("renders the cover page with both paths in the portal chrome", () => {
    const root = mount();
    expect(root.querySelector(".portal-header .seal")).toBeTruthy();
    expect(root.textContent).toContain("Means");
    expect(root.querySelector<HTMLButtonElement>("#play-act1")).toBeTruthy();
    expect(root.querySelector<HTMLButtonElement>("#skip-act2")).toBeTruthy();
  });

  it("defaults the playtest desk record to flag rate 0.6", () => {
    const root = mount();
    const checked = root.querySelector<HTMLInputElement>('input[name="skip-rate"]:checked');
    expect(checked).toBeTruthy();
    expect(checked!.value).toBe("0.6");
  });

  it("Skip to Act 2 mounts Act 2 (centered capacity meter) with flagRate 0.6", () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>("#skip-act2")!.click();
    expect(root.querySelector(".stage .capacity-focal .meter.capacity")).toBeTruthy();
    expect(act2.runAct2).toHaveBeenCalledTimes(1);
    const ctx = vi.mocked(act2.runAct2).mock.calls[0][2];
    expect(ctx.flagRate).toBe(0.6);
  });

  it("the one-line chooser passes the selected rate through", () => {
    const root = mount();
    const punitive = root.querySelector<HTMLInputElement>('input[name="skip-rate"][value="0.9"]')!;
    punitive.checked = true;
    root.querySelector<HTMLButtonElement>("#skip-act2")!.click();
    const ctx = vi.mocked(act2.runAct2).mock.calls[0][2];
    expect(ctx.flagRate).toBe(0.9);
  });

  it("Play from Act 1 mounts the desk (KPI strip + case file)", () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>("#play-act1")!.click();
    expect(root.querySelector(".kpi-strip")).toBeTruthy();
    expect(root.querySelector("#stage .casefile")).toBeTruthy();
  });

  it("Act 2's ending returns to the title menu via onEnd", () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>("#skip-act2")!.click();
    // Play weeks until the run terminates, then hit "Play again".
    for (let i = 0; i < DEFAULT_CONFIG.turnCeiling + 10; i++) {
      const btn = root.querySelector<HTMLButtonElement>("#end-week");
      if (!btn) break;
      btn.click();
    }
    const again = root.querySelector<HTMLButtonElement>("#again");
    expect(again).toBeTruthy();
    again!.click();
    expect(root.querySelector("#play-act1")).toBeTruthy();
    expect(root.querySelector("#skip-act2")).toBeTruthy();
  });
});

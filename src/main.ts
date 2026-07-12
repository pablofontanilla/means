// Entry point: mount the title menu (P2-M4). Act sequencing (§7.1) — Act 1
// (the desk) → performance review → act break → Act 2 (the case) — lives in
// menu.ts so the flow is testable without this module's import side effects.

import "./ui/casefile.css";
import { DEFAULT_CONFIG } from "./engine/config.ts";
import { showTitleMenu } from "./menu.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
showTitleMenu(app, DEFAULT_CONFIG);

import { resolve } from "node:path";
import { defineConfig } from "vite";

// Static site with two entry points:
//   index.html   — the game (Act 1 → break → Act 2)
//   sandbox.html — headless engine tuning dashboard (dev-only page)
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        sandbox: resolve(__dirname, "sandbox.html"),
      },
    },
  },
});

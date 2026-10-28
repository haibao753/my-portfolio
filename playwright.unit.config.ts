import { defineConfig } from "@playwright/test";

// TypeScript domain tests reuse the existing runner; no browser or server required.
export default defineConfig({
  testDir: "./tests/unit",
  workers: 1,
  timeout: 10_000,
  reporter: "list"
});

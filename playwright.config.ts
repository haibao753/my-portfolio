import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
 testDir: "./tests/e2e",
 timeout: 30_000,
 expect: { timeout: 10_000 },
 retries: process.env.CI ? 1 : 0,
 use: {
  baseURL: "http://127.0.0.1:4322",
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
  actionTimeout: 10_000
 },
 projects: [
  { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
 ],
 webServer: {
  command: "npm run preview -- --host 127.0.0.1 --port 4322",
  url: "http://127.0.0.1:4322",
  reuseExistingServer: !process.env.CI,
  timeout: 60_000
 },
 reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list"
});

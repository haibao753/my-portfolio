import { test, expect, type Page } from "@playwright/test";

const dates = ["2026-10-21", "2026-10-20"];
const story = (title: string) => ({ title_zh: title, summary_zh: "公开摘要", category: "数学", source: "Test source", url: `https://example.org/${encodeURIComponent(title)}` });

async function searchArchive(page: Page) {
  await page.locator("#filter-toggle").click();
  await page.locator("#brief-search").fill("共同");
  await page.locator("#brief-search-all").click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-27T04:00:00Z"));
});

test("a publisher refresh preserves the selected archive search scope", async ({ page }) => {
  let revision = 1;
  await page.route("**/brief/data/index.json", route => route.fulfill({ json: { dates, updated_at: String(revision) } }));
  for (const date of dates) await page.route(`**/brief/data/${date}.json`, route => route.fulfill({ json: { date, items: [story(`共同 ${date} 修订${revision}`)] } }));
  await page.goto("/brief/");
  await expect(page.locator(".news-card")).toHaveCount(1);
  await searchArchive(page);
  await expect(page.locator(".news-card")).toHaveCount(2);
  revision = 2;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".news-card").first()).toContainText("修订2");
  await expect(page.locator(".news-card")).toHaveCount(2);
  await expect(page.locator("#search-scope")).toContainText("全部归档");
  await expect(page.locator("#brief-search")).toHaveValue("共同");
});

test("archive search reports partial outages alongside the available stories", async ({ page }) => {
  await page.route("**/brief/data/index.json", route => route.fulfill({ json: { dates } }));
  await page.route(`**/brief/data/${dates[0]}.json`, route => route.fulfill({ json: { date: dates[0], items: [story("共同 可用资讯")] } }));
  await page.route(`**/brief/data/${dates[1]}.json`, route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/brief/");
  await expect(page.locator(".news-card")).toHaveCount(1);
  await searchArchive(page);
  await expect(page.locator("#status")).toContainText("1 期加载失败");
  await expect(page.locator("#status")).not.toHaveClass(/is-summary/);
  await expect(page.locator(".news-card")).toHaveCount(1);
  await expect(page.locator("#stories")).toHaveAttribute("aria-busy", "false");
});

test("loading a new date hides stale pagination and a late response cannot replace the latest choice", async ({ page }) => {
  let requested = false;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/brief/data/index.json", route => route.fulfill({ json: { dates } }));
  await page.route(`**/brief/data/${dates[0]}.json`, route => route.fulfill({ json: { date: dates[0], items: Array.from({ length: 60 }, (_, i) => story(`最新 ${i}`)) } }));
  await page.route(`**/brief/data/${dates[1]}.json`, async route => {
    requested = true;
    await held;
    await route.fulfill({ json: { date: dates[1], items: [story("过期响应")] } }).catch(() => {});
  });
  try {
    await page.goto("/brief/");
    await expect(page.locator(".news-card").first()).toContainText("最新");
    await page.locator("#filter-toggle").click();
    await page.locator(`[data-date="${dates[1]}"]`).click();
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator("#stories")).toHaveAttribute("data-state", "loading");
    await expect(page.locator("#stories-load-more")).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".news-card")).toHaveCount(0);
    await page.locator(`[data-date="${dates[0]}"]`).click();
    await expect(page.locator(".news-card").first()).toContainText("最新");
    release();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator("#stories")).not.toContainText("过期响应");
    await expect(page.locator("#stories")).toHaveAttribute("aria-busy", "false");
  } finally { release(); }
});

test("malformed optional research cannot break the summary or reading control", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/brief/data/index.json", route => route.fulfill({ json: { dates: [dates[0]] } }));
  await page.route(`**/brief/data/${dates[0]}.json`, route => route.fulfill({ json: { date: dates[0], items: [{ ...story("可读摘要"), research: { sections: { method: { text: 42, evidence_ids: 3 } }, citations: [null] } }] } }));
  await page.goto("/brief/");
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.locator(".news-read-toggle").click();
  await expect(page.locator(".news-read-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".news-research")).toHaveCount(0);
  expect(errors).toEqual([]);
});

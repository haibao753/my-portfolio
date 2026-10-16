import { test, expect } from '@playwright/test';

test('photo strip uses decoded responsive WebP images instead of full originals', async ({ page }) => {
 await page.goto('/');
 const strip = page.locator('.photo-art');
 await strip.scrollIntoViewIfNeeded();
 for (const image of await strip.locator('img').all()) {
  await expect(image).toHaveAttribute('srcset', /320w.*640w.*960w/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await image.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/_astro\/.+\.webp/);
 }
});

test('filtering preserves keyboard focus and follows the selected UI language', async ({ page }) => {
 await page.goto('/brief/');
 await expect(page.locator('.news-card').first()).toBeVisible();
 const filter = page.locator('#tabs button').nth(1);
 await filter.focus();
 await filter.press('Enter');
 await expect(filter).toBeFocused();
 await expect(filter).toHaveAttribute('aria-pressed', 'true');
 // After filtering down-page, the toolbar is intentionally an orb.
 // Expand it with the visible logo before using its language control.
 await page.locator('.glass-nav .brand').click();
 await expect.poll(async()=>page.locator('.glass-nav').getAttribute('data-orb-closed')).toBe('false');
 await page.locator('[data-language-toggle]').click();
 await expect(page.locator('#tabs button').first()).toHaveText('All');
 await expect(page.locator('#status')).toContainText('Showing');
 await expect(page.locator('.news-source a').first()).toHaveText('Read original report ↗');
 await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to dark mode');
});

test('mobile navigation supports focus, header controls and outside dismissal', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto('/');
 const toggle = page.locator('[data-menu-toggle]');
 const panel = page.locator('[data-menu-panel]');
 await toggle.click();
 await expect(panel.locator('a').first()).toBeFocused();
 await page.locator('[data-theme-toggle]').click();
 await expect(toggle).toHaveAttribute('aria-expanded', 'true');
 const box = await panel.boundingBox();
 expect(box).not.toBeNull();
 await page.mouse.click(Math.max(2, box!.x - 16), box!.y + 24);
 await expect(panel).toBeHidden();
 await toggle.click();
 await page.keyboard.press('Escape');
 await expect(toggle).toBeFocused();
});

test('a failed issue request clears stale cards and exposes a recoverable error', async ({ page }) => {
 await page.goto('/brief/');
 await expect(page.locator('.news-card').first()).toBeVisible();
 const dates = await page.locator('#issues option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
 expect(dates.length).toBeGreaterThan(1);
 await page.route(`**/brief/data/${dates[1]}.json`, route => route.fulfill({ status: 503, body: 'unavailable' }));
 await page.locator('#issues').selectOption(dates[1]);
 await expect(page.locator('.news-card')).toHaveCount(0);
 await expect(page.locator('#status')).toContainText('加载失败');
 await expect(page.locator('#stories')).toHaveAttribute('aria-busy', 'false');
 await page.locator('#issues').selectOption(dates[0]);
 await expect(page.locator('.news-card').first()).toBeVisible();
});

test('runtime optical canvas stays out of layout and cannot grow the header', async ({ page }) => {
 await page.goto('/?opticalEngine=1');
 const canvas=page.locator('.live-optical-layer');
 await expect(canvas).toHaveCSS('position','absolute');
 await expect(canvas).toHaveCSS('pointer-events','none');
 const nav=page.locator('.glass-nav');
 await expect.poll(()=>nav.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(100);
 await expect.poll(()=>nav.getAttribute('data-optical-texture-full')).not.toBeNull();
 await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
 await expect.poll(()=>nav.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(100);
});

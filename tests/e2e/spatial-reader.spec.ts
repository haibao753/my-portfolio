import {test,expect} from "@playwright/test";
test("3D exploration is opt-in and returns to the selected article",async({page})=>{
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 await expect(page.locator("#spatial-dialog")).not.toBeVisible();
 await page.locator("#spatial-open").click();
 const dialog=page.locator("#spatial-dialog");
 await expect(dialog).toBeVisible();
 await expect(dialog.locator(".spatial-node").first()).toBeVisible();
 await dialog.locator("[data-rotate='24']").click();
 await expect(dialog.locator("#spatial-scene")).toHaveAttribute("style",/rotateY/);
 await dialog.locator(".spatial-node").first().click();
 await expect(dialog).not.toBeVisible();
 await expect(page.locator(".news-card.is-reading").first()).toBeVisible();
 await expect(page.locator(".news-card .news-read-toggle").first()).toHaveAttribute("aria-expanded","true");
});
test("3D dialog supports keyboard dismissal and restores focus",async({page})=>{
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 const open=page.locator("#spatial-open");
 await open.click();
 await page.keyboard.press("Escape");
 await expect(page.locator("#spatial-dialog")).not.toBeVisible();
 await expect(open).toBeFocused();
});

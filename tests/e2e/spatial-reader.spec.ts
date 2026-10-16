import {test,expect} from "@playwright/test";
test("3D exploration is opt-in and returns to the selected article",async({page})=>{
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 await expect(page.locator("#spatial-dialog")).not.toBeVisible();
 await page.locator("#spatial-open").click();
 const dialog=page.locator("#spatial-dialog");
 await expect(dialog).toBeVisible();
 await expect(dialog.locator(".spatial-webgl")).toBeVisible();
 await expect(dialog.locator(".spatial-open-article")).toBeVisible();
 await dialog.locator("[data-rotate='24']").click();
 await expect(dialog.locator("#spatial-state")).toContainText("2 /");
 await dialog.locator(".spatial-open-article").click();
 await expect(dialog).not.toBeVisible();
 await expect(page.locator(".news-card.is-reading")).toHaveCount(1);
 await expect(page.locator(".news-card.is-reading .news-read-toggle")).toHaveAttribute("aria-expanded","true");
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

test("WebGL scene and article inspector never overlap on mobile",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 await page.locator("#spatial-open").click();
 const viewport=page.locator(".spatial-viewport");
 const inspector=page.locator("#spatial-scene");
 await expect(viewport).toBeVisible();
 await expect(inspector).toBeVisible();
 const v=await viewport.boundingBox(),i=await inspector.boundingBox();
 expect(v).not.toBeNull();expect(i).not.toBeNull();
 expect(i!.y).toBeGreaterThanOrEqual(v!.y+v!.height-1);
 expect(v!.height).toBeGreaterThanOrEqual(200);
 await expect(inspector.locator(".spatial-open-article")).toBeVisible();
});

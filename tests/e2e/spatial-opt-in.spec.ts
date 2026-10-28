import {test,expect} from "@playwright/test";
test("public brief creates its spatial canvas only after the reader opts in",async({page})=>{
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 await expect(page.locator("#spatial-open")).toBeVisible();
 await expect(page.locator("#spatial-dialog")).not.toBeVisible();
 await expect(page.locator(".spatial-webgl")).toHaveCount(0);
 await page.locator("#spatial-open").click();
 await expect(page.locator("#spatial-dialog")).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(page.locator("#spatial-dialog")).not.toBeVisible();
 await expect(page.locator("#spatial-open")).toBeFocused();
});

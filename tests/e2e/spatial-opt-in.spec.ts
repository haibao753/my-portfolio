import {test,expect} from "@playwright/test";
test("public brief prioritizes reading; experimental spatial graph is opt-in",async({page})=>{
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible();
 await expect(page.locator("#spatial-open")).not.toBeVisible();
 await page.goto("/brief/?experimentalGraph=1");
 await expect(page.locator("#spatial-open")).toBeVisible();
});

import {test, expect} from "@playwright/test";

test("Knowledge Lab only features working experiments and connects to Lab 001",async({page})=>{
 await page.goto("/lab/");
 await expect(page.locator("h1")).toBeVisible();
 await expect(page.locator("#lab-first")).toBeVisible();
 const link=page.locator('a[href="/lab/rotation/"]');
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/\/lab\/rotation\/$/);
 await expect(page.locator("#rotation-xy")).toBeVisible();
 await expect(page.locator("#rotation-yx")).toBeVisible();
 await page.locator(".back-link").click();
 await expect(page).toHaveURL(/\/lab\/$/);
});

test("Knowledge Lab mobile view is content-first and does not overflow",async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/lab/");
 const link=page.locator('a[href="/lab/rotation/"]');
 await expect(link).toBeVisible();
 const box=await link.boundingBox();
 expect(box).not.toBeNull();
 expect(box!.y).toBeLessThan(844);
 const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
 expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth+1);
 await page.screenshot({path:testInfo.outputPath("knowledge-lab-mobile.png"),fullPage:true});
});

test("Knowledge Lab is discoverable from homepage and readable in English and dark theme",async({page})=>{
 await page.goto("/");
 const invite=page.locator('a.lab-invite[href="/lab/"]');
 await expect(invite).toBeVisible();
 await invite.click();
 await expect(page).toHaveURL(/\/lab\/$/);
 await page.locator("[data-language-toggle]").click();
 await expect(page.locator("h1")).toContainText("Put the idea");
 await expect(page.locator("#lab-first")).toContainText("Two rotations");
 await page.locator("[data-theme-toggle]").click();
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 await expect(page.locator('a[href="/lab/rotation/"]')).toBeVisible();
});

test("Knowledge Lab and published experiment are discoverable in sitemap",async({request})=>{
 const response=await request.get("/sitemap.xml");
 expect(response.ok()).toBe(true);
 const xml=await response.text();
 expect(xml).toContain("/lab/</loc>");
 expect(xml).toContain("/lab/rotation/</loc>");
 expect(xml).not.toContain("experimentalGraph");
});

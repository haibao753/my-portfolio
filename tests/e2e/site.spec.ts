import { test, expect } from "@playwright/test";

test("home renders, preserves work destinations, and has no horizontal overflow", async ({ page }) => {
 await page.goto("/");
 await expect(page.locator(".hero h1")).toBeVisible();
 await expect(page.locator(".project")).toHaveCount(4);
 await expect(page.locator('a[href="/brief/"]').first()).toBeAttached();
 await expect(page.locator('a[href="https://space.bilibili.com/1572685586"]').first()).toBeAttached();
 await expect(page.locator('a[href="https://zhengyifan.win/"]').first()).toBeAttached();
 await expect(page.locator('a[href="/experiments/minimal-surfaces-classical.html"]').first()).toBeAttached();
 await expect(page.locator(".hero-autograph--pen")).toBeVisible();
 const dimensions=await page.evaluate(() => ({doc:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
 expect(dimensions.doc).toBeLessThanOrEqual(dimensions.view+2);
});

test("dark theme and bilingual interface persist after a reload", async ({ page }) => {
 await page.goto("/");
 await page.locator("[data-theme-toggle]").click();
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 await page.locator("[data-language-toggle]").click();
 await expect(page.locator("html")).toHaveAttribute("lang","en");
 await expect(page.locator(".hero h1").getByText("Make curiosity")).toBeVisible();
 await page.reload();
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 await expect(page.locator("html")).toHaveAttribute("lang","en");
 await expect(page.locator("[data-language-toggle]")).toHaveText("中文");
});

test("navigation is usable with pointer and keyboard", async ({ page, isMobile }) => {
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 if(isMobile){
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  const menu=page.locator("[data-menu-panel]");
  await expect(menu).toBeVisible();
  const links=menu.locator("a");
  await expect(links).toHaveCount(6);
  const target=links.last();
  await expect(target).toHaveAttribute("href","/#contact");
  const box=await target.boundingBox();
  expect(box?.height??0).toBeGreaterThanOrEqual(48);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await toggle.click();
  await page.locator("[data-menu-backdrop]").click({position:{x:15,y:350}});
  await expect(menu).toBeHidden();
 }else{
  await expect(page.locator(".desktop-links")).toBeVisible();
  await expect(toggle).toBeHidden();
 }
});

test("daily brief loads published JSON, renders sources, and filters by category", async ({ page }) => {
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card").first()).toBeVisible({timeout:20_000});
 const initial=await page.locator("#stories .news-card").count();
 expect(initial).toBeGreaterThan(0);
 await expect(page.locator("#headlineDate")).toContainText(/\d{4}-\d{2}-\d{2}/);
 const article=page.locator("#stories .news-card").first();
 await expect(article.locator(".news-source a")).toHaveAttribute("rel",/noopener/);
 const tabs=page.locator("#tabs button");
 expect(await tabs.count()).toBeGreaterThan(1);
 await tabs.nth(1).click();
 await expect(tabs.nth(1)).toHaveAttribute("aria-pressed","true");
 const filtered=await page.locator("#stories .news-card").count();
 expect(filtered).toBeGreaterThan(0);
 expect(filtered).toBeLessThanOrEqual(initial);
 await expect(page.locator("#issues option").first()).toHaveAttribute("value",/\d{4}-\d{2}-\d{2}/);
 const dimensions=await page.evaluate(() => ({doc:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
 expect(dimensions.doc).toBeLessThanOrEqual(dimensions.view+2);
});

test("screenshots of home and brief in both themes", async ({ page }, testInfo) => {
 await page.goto("/");
 await page.screenshot({path:testInfo.outputPath("home-light.png"),fullPage:true,animations:"disabled"});
 await page.locator("[data-theme-toggle]").click();
 await page.screenshot({path:testInfo.outputPath("home-dark.png"),fullPage:true,animations:"disabled"});
 await page.goto("/brief/");
 await expect(page.locator(".news-card").first()).toBeVisible({timeout:20_000});
 await page.screenshot({path:testInfo.outputPath("brief-dark.png"),fullPage:true,animations:"disabled"});
 await page.locator("[data-theme-toggle]").click();
 await page.screenshot({path:testInfo.outputPath("brief-light.png"),fullPage:true,animations:"disabled"});
});

test("legacy experimental routes and published JSON remain available", async ({ request }) => {
 for (const path of ["/experiments/minimal-surfaces-classical.html","/experiments/minimal-surfaces-periodic.html","/brief/data/index.json"]){
  const response=await request.get(path);
  expect(response.ok(),path).toBeTruthy();
 }
 const index=await (await request.get("/brief/data/index.json")).json();
 expect(Array.isArray(index.dates)).toBeTruthy();
});

test("handwritten signature runs once and native scrolling never snaps after release", async ({ page }) => {
 await page.goto("/");
 const signature=page.locator(".hero-autograph--pen");
 await expect(signature).toBeVisible();
 await expect(signature).toHaveClass(/is-pen-finished/,{timeout:25_000});
 await expect(signature.locator(".hero-autograph__finish")).toHaveCSS("opacity","1");
 // Scroll by a native instant position change: a delayed chapter snap must not take over.
 await page.evaluate(()=>{
  const target=document.querySelector<HTMLElement>("#projects");
  if(!target)throw Error("Missing projects");
  window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY+170,behavior:"instant"});
 });
 await page.waitForTimeout(280);
 const stationary=await page.evaluate(()=>window.scrollY);
 await page.waitForTimeout(820);
 const after=await page.evaluate(()=>window.scrollY);
 expect(Math.abs(after-stationary)).toBeLessThanOrEqual(3);
 // Leaving and returning must never replay the signature.
 await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await expect(signature).toHaveClass(/is-pen-finished/);
});

test("cinematic motion reveals projects without hijacking native scrolling", async ({ page }) => {
 await page.goto("/");
 await expect(page.locator(".motion-progress")).toHaveCount(1);
 const project=page.locator(".project").first();
 await project.scrollIntoViewIfNeeded();
 await expect(project).toHaveClass(/is-motion-revealed/);
 await page.evaluate(()=>window.scrollTo({top:document.querySelector("#contact")!.getBoundingClientRect().top+window.scrollY,behavior:"instant"}));
 await page.waitForTimeout(320);
 const still=await page.evaluate(()=>window.scrollY);
 await page.waitForTimeout(650);
 const after=await page.evaluate(()=>window.scrollY);
 expect(Math.abs(after-still)).toBeLessThanOrEqual(3);
 const progress=page.locator("[data-motion-progress]");
 await expect(progress).toHaveCSS("transform",/matrix/);
});

test("reduced motion keeps all project content visible", async ({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 for(const card of await page.locator(".project").all()){
  await expect(card).toHaveCSS("opacity","1");
 }
 await expect(page.locator("h1")).toBeVisible();
});

test("laboratory finale is animated only while visible and respects reduced motion",async({page})=>{
 await page.goto("/");
 const finale=page.locator("[data-lab-finale]");
 await expect(finale).toHaveCount(1);
 await finale.scrollIntoViewIfNeeded();
 await expect(finale.locator("animateMotion")).toHaveCount(2);
 await page.waitForTimeout(180);
 const running=await finale.evaluate((svg:SVGSVGElement)=>svg.animationsPaused());
 expect(running).toBe(false);
 await page.emulateMedia({reducedMotion:"reduce"});
 await expect.poll(()=>finale.evaluate((svg:SVGSVGElement)=>svg.animationsPaused())).toBe(true);
 await expect(page.locator(".finale")).toHaveCSS("opacity","1");
});

test("editorial hero lines and responsive navigation remain readable",async({page,isMobile})=>{
 await page.goto("/");
 await expect(page.locator(".hero-title-line")).toHaveCount(4);
 await expect(page.locator(".hero-title-line").first()).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 if(isMobile){
  const toggle=page.locator("[data-menu-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await expect(page.locator("[data-menu-panel]")).toBeVisible();
 }else{
  const link=page.locator(".desktop-links a").first();
  await expect(link).toHaveCSS("position","relative");
 }
 await page.locator("[data-language-toggle]").click();
 await expect(page.locator(".hero-title-line").nth(2)).toBeVisible();
});

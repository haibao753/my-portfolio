import {test,expect} from "@playwright/test";

test("mobile homepage shows finished copy, clickable actions and balanced art immediately",async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page.locator(".hero-title")).toBeVisible();
 const primary=page.locator(".hero .actions .primary");
 const sculpture=page.locator(".hero .sculpture-stage");
 const signature=page.locator(".hero-autograph--pen");
 await expect(primary).toBeVisible();
 await expect(sculpture).toBeVisible();
 await expect(signature).toBeVisible();
 const initial=await page.evaluate(()=>{
  const rect=(selector:string)=>{const box=document.querySelector(selector)!.getBoundingClientRect();return {y:box.y,bottom:box.bottom,width:box.width,height:box.height};};
  const cta=document.querySelector<HTMLElement>(".hero .actions .primary")!;
  const style=getComputedStyle(cta);
  const finish=document.querySelector<SVGElement>(".hero-autograph__finish")!;
  const glyphs=Array.from(document.querySelectorAll<HTMLElement>('.hero-title [data-locale="zh"] .hero-title-glyph'));
  return {
   title:rect(".hero-title"),actions:rect(".hero .actions"),sculpture:rect(".hero .sculpture-stage"),
   signature:rect(".hero-autograph--pen"),
   ctaOpacity:Number(style.opacity),ctaFilter:style.filter,
   signatureOpacity:Number(getComputedStyle(finish).opacity),
   glyphOpacity:glyphs.map(x=>Number(getComputedStyle(x).opacity)),
   fullText:document.querySelector(".hero-title")?.textContent||"",
   overflow:document.documentElement.scrollWidth-innerWidth
  };
 });
 expect(initial.fullText).toContain("做一些有趣的事情。");
 expect(initial.actions.y).toBeGreaterThan(initial.title.y);
 expect(initial.actions.bottom).toBeLessThanOrEqual(initial.sculpture.y+12);
 expect(initial.sculpture.bottom).toBeLessThanOrEqual(initial.signature.y+18);
 expect(initial.signature.width).toBeLessThanOrEqual(190);
 expect(initial.signature.bottom).toBeLessThan(830);
 expect(initial.ctaOpacity).toBe(1);
 expect(initial.ctaFilter).toBe("none");
 expect(initial.signatureOpacity).toBe(1);
 expect(initial.glyphOpacity.every(opacity=>opacity>=.75)).toBe(true);
 expect(initial.overflow).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath("first-paint-mobile.png")});
 await page.waitForTimeout(1200);
 await expect(primary).toHaveCSS("opacity","1");
 await expect(signature.locator(".hero-autograph__finish")).toHaveCSS("opacity","1");
 await page.screenshot({path:testInfo.outputPath("settled-mobile.png")});
});

test("homepage has a complete server-rendered fallback with JavaScript disabled",async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
 const page=await context.newPage();
 try{
  await page.goto("/");
  await expect(page.locator(".hero-title")).toContainText("做一些有趣的事情。");
  await expect(page.locator(".hero .actions .primary")).toBeVisible();
  await expect(page.locator(".sculpture-fallback")).toBeVisible();
  await expect(page.locator(".hero-autograph__finish")).toHaveCSS("opacity","1");
  await expect(page.locator(".hero-autograph--pen")).toHaveAttribute("data-signature-animation","static");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }finally{await context.close();}
});

test("reduced motion retains completed hero without intro delays",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 await expect(page.locator(".hero-title")).toContainText("做一些有趣的事情。");
 await expect(page.locator(".hero .actions .primary")).toHaveCSS("opacity","1");
 await expect(page.locator(".hero-autograph__finish")).toHaveCSS("opacity","1");
 await expect(page.locator(".hero-title-glyph")).toHaveCount(0);
});

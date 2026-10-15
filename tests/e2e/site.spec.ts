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
  await page.keyboard.press("Escape");
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
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-menu-panel]")).toBeHidden();
 }else{
  const link=page.locator(".desktop-links a").first();
  await expect(link).toHaveCSS("position","relative");
 }
 await page.locator("[data-language-toggle]").click();
 await expect(page.locator(".hero-title-line").nth(2)).toBeVisible();
});


test("scroll-linked depth follows position and never starts a second scroll",async({page,isMobile})=>{
 await page.goto("/");
 const target=page.locator(".project").first();
 await target.scrollIntoViewIfNeeded();
 const variable=isMobile?"--motion-y":"--chapter-tilt";
 const tracked=isMobile?page.locator(".project .visual").first():target;
 await tracked.scrollIntoViewIfNeeded();
 await page.evaluate(()=>window.dispatchEvent(new Event("scroll")));
 await expect.poll(()=>tracked.evaluate((el,key)=>el.style.getPropertyValue(key),variable)).not.toBe("");
 const before=await tracked.evaluate((el,key)=>el.style.getPropertyValue(key),variable);
 await page.evaluate(()=>window.scrollBy({top:140,behavior:"instant"}));
 await expect.poll(()=>tracked.evaluate((el,key)=>el.style.getPropertyValue(key),variable)).not.toBe(before);
 await page.waitForTimeout(250);
 const steady=await page.evaluate(()=>scrollY);
 await page.waitForTimeout(750);
 expect(Math.abs((await page.evaluate(()=>scrollY))-steady)).toBeLessThanOrEqual(3);
});

test("reduced motion turns off scroll-linked depth",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 const visual=page.locator(".project .visual").first();
 await visual.scrollIntoViewIfNeeded();
 await expect(visual).toHaveCSS("filter","none");
 await expect(visual).toHaveCSS("transform","none");
});


test("mobile menu glass stays compact and translucent",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 await page.locator("[data-menu-toggle]").click();
 const backdrop=page.locator("[data-menu-backdrop]");
 await expect(backdrop).toBeVisible();
 const bg=await backdrop.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(bg.startsWith("rgba(")||bg.startsWith("rgb(")).toBe(true);
 const panel=page.locator("[data-menu-panel]");
 const box=await panel.boundingBox();
 expect(box?.width??0).toBeLessThanOrEqual(260);
 await page.keyboard.press("Escape");
 await expect(backdrop).toBeHidden();
});

test("glass toolbar remains readable and the floating menu clears its lower edge",async({page,isMobile})=>{
 await page.goto("/");
 const header=page.locator(".glass-nav");
 await expect(header).toHaveCSS("backdrop-filter",/blur\(3px\)/);
 const before=await header.boundingBox();
 expect(before?.y??-1).toBeGreaterThanOrEqual(7);
 await page.locator("[data-theme-toggle]").click();
 await expect(header).toBeInViewport();
 if(isMobile){
  await page.locator("[data-menu-toggle]").click();
  const panel=page.locator("[data-menu-panel]");
  await expect.poll(async()=>{
   const [barBox,menuBox]=await Promise.all([header.boundingBox(),panel.boundingBox()]);
   return menuBox!.y-(barBox!.y+barBox!.height);
  }).toBeGreaterThanOrEqual(6);
  await page.evaluate(()=>window.scrollTo({top:600,behavior:"instant"}));
  await expect(header).toBeInViewport();
  await expect(panel).toBeVisible();
  const after=await header.boundingBox();
  expect(Math.abs(after!.y-before!.y)).toBeLessThan(2);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("theme icon switches appearance and exposes pressed state",async({page})=>{
 await page.goto("/");
 const toggle=page.locator("[data-theme-toggle]");
 await expect(toggle.locator("svg")).toBeVisible();
 const before=await page.locator("html").getAttribute("data-theme");
 await toggle.click();
 await expect(toggle).toHaveAttribute("aria-pressed",before==="dark"?"false":"true");
 await expect(page.locator("html")).toHaveAttribute("data-theme",before==="dark"?"light":"dark");
});


test("liquid glass menu recedes the page and restores it on close",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const menu=page.locator("[data-menu-toggle]");
 await menu.click();
 await expect(page.locator("html")).toHaveAttribute("data-menu-open","true");
 await expect(page.locator("[data-menu-panel]")).toHaveCSS("backdrop-filter",/blur/);
 await expect(page.locator("[data-menu-panel]")).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(page.locator("html")).not.toHaveAttribute("data-menu-open","true");
 await expect(page.locator("[data-menu-panel]")).toBeHidden();
});


test("mobile liquid glass menu animates closed and supports rapid reopening",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 const panel=page.locator("[data-menu-panel]");
 await toggle.click();
 await expect(panel).toBeVisible();
 await toggle.click();
 await expect(panel).toHaveAttribute("data-closing","true");
 await expect(panel).toBeVisible();
 await toggle.click();
 await expect(toggle).toHaveAttribute("aria-expanded","true");
 await expect(panel).not.toHaveAttribute("data-closing","true");
 await page.waitForTimeout(400);
 await expect(panel).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(panel).toBeHidden();
 await expect(page.locator("html")).not.toHaveAttribute("data-menu-open","true");
});


test("theme transition animates on click but not on reload",async({page})=>{
 await page.goto("/");
 const toggle=page.locator("[data-theme-toggle]");
 await toggle.click();
 await expect(page.locator("html")).toHaveAttribute("data-theme-transition","true");
 await expect.poll(()=>page.locator("html").getAttribute("data-theme-transition"),{timeout:3000}).toBeNull();
 await page.reload();
 await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition","true");
});


test("mobile glass menu stays open while page scrolls and header stays visible",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 await toggle.click();
 await expect(page.locator("[data-menu-panel]")).toBeVisible();
 await expect(page.locator("[data-menu-backdrop]")).toHaveCSS("pointer-events","none");
 const before=await page.evaluate(()=>window.scrollY);
 const touch=await page.context().newCDPSession(page);
 await touch.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:24,y:600}]});
 for(let step=1;step<=12;step++){
  await touch.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:24,y:600-step*32}]});
  await page.waitForTimeout(16);
 }
 await touch.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 await touch.detach();
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(before+100);
 await expect(page.locator("[data-menu-panel]")).toBeVisible();
 await expect(toggle).toBeInViewport();
 await expect(toggle).toHaveAttribute("aria-expanded","true");
 await toggle.click();
 await expect(page.locator("[data-menu-panel]")).toBeHidden();
});

test("closing menu immediately removes its links from keyboard focus",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 const panel=page.locator("[data-menu-panel]");
 await toggle.click();
 await expect(panel).not.toHaveAttribute("inert");
 await toggle.click();
 await expect(panel).toHaveAttribute("inert","");
 await expect(panel).toBeHidden();
});

test("optical lab remains navigable after context loss and restoration",async({page})=>{
 await page.goto("/experiments/liquid-glass-optics.html");
 await page.locator("#optics").dispatchEvent("webglcontextlost",{cancelable:true});
 await expect(page.locator("#stage")).toHaveClass(/no-webgl/);
 await page.locator("#optics").dispatchEvent("webglcontextrestored");
 await expect(page.locator("#stage")).toHaveClass(/no-webgl/);
 await expect(page.locator("#optic-menu a")).toHaveCount(6);
 await page.locator("#optic-menu a[href='/brief/']").click();
 await expect(page).toHaveURL(/\/brief\/$/);
});

test("optical lab caps raster size and does not render while idle",async({page})=>{
 await page.addInitScript(()=>{
  const draw=WebGLRenderingContext.prototype.drawArrays;
  (window as any).__opticDraws=0;
  WebGLRenderingContext.prototype.drawArrays=function(...args){
   (window as any).__opticDraws++;
   return draw.apply(this,args);
  };
 });
 await page.goto("/experiments/liquid-glass-optics.html");
 await page.locator("#stage").scrollIntoViewIfNeeded();
 test.skip(await page.locator("#stage").evaluate(el=>el.classList.contains("no-webgl")),"WebGL unavailable; covered by fallback tests");
 await expect.poll(()=>page.evaluate(()=>(window as any).__opticDraws)).toBeGreaterThan(0);
 const pixels=await page.locator("#optics").evaluate(el=>(el as HTMLCanvasElement).width*(el as HTMLCanvasElement).height);
 expect(pixels).toBeLessThanOrEqual(1_000_000);
 await page.waitForTimeout(200);
 const settled=await page.evaluate(()=>(window as any).__opticDraws);
 await page.waitForTimeout(250);
 expect(await page.evaluate(()=>(window as any).__opticDraws)).toBe(settled);
 await page.locator("#dispersion").fill("80");
 await expect.poll(()=>page.evaluate(()=>(window as any).__opticDraws)).toBeGreaterThan(settled);
});

test("optical glass laboratory preserves real accessible menu controls",async({page})=>{
 await page.goto("/experiments/liquid-glass-optics.html");
 await expect(page.locator("#optic-menu a")).toHaveCount(6);
 await expect(page.locator("#optic-menu")).toBeVisible();
 await page.locator("#menu-mode").uncheck();
 await expect(page.locator("#optic-menu")).toBeHidden();
 await page.locator("#menu-mode").check();
 await expect(page.locator("#optic-menu")).toBeVisible();
 await page.locator("#refract").fill("75");
 await expect(page.locator("#refract-value")).toHaveText("75%");
});


test("optical lab has a usable menu if WebGL is unavailable",async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...args){
   if(type==="webgl"||type==="experimental-webgl")return null;
   return original.call(this,type,...args);
  } as typeof HTMLCanvasElement.prototype.getContext;
 });
 await page.goto("/experiments/liquid-glass-optics.html");
 await expect(page.locator("#stage")).toHaveClass(/no-webgl/);
 await expect(page.locator("#optic-menu a")).toHaveCount(6);
 await expect(page.locator("#optic-menu")).toBeVisible();
 const dimensions=await page.locator("#optic-menu").boundingBox();
 expect(dimensions?.width??0).toBeGreaterThan(100);
 expect(dimensions?.height??0).toBeGreaterThan(100);
});


test("optical laboratory preserves native mobile scrolling with visible DOM links",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/experiments/liquid-glass-optics.html");
 const before=await page.evaluate(()=>window.scrollY);
 await page.evaluate(()=>window.scrollBy({top:400,behavior:"instant"}));
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(before+100);
 await expect(page.locator("#optic-menu a")).toHaveCount(6);
});


test("floating mobile menu supports page scrolling and menu controls across themes",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 await toggle.click();
 const panel=page.locator("[data-menu-panel]");
 await expect(panel).toBeVisible();
 await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight-innerHeight,behavior:"instant"}));
 await expect(toggle).toBeInViewport();
 await expect(panel).toBeInViewport();
 await page.locator("[data-theme-toggle]").click();
 await expect(panel).toBeVisible();
 await page.locator("[data-language-toggle]").click();
 await expect(panel.locator("a").first()).toBeVisible();
 await toggle.click();
 await expect(panel).toBeHidden();
});


test("glass navigation fits short phone viewports without covering its close control",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.setViewportSize({width:375,height:430});
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 await toggle.click();
 const panel=page.locator("[data-menu-panel]");
 await expect(panel).toBeVisible();
 const bounds=await panel.boundingBox();
 expect(bounds).not.toBeNull();
 expect((bounds?.y??0)+(bounds?.height??0)).toBeLessThanOrEqual(430);
 await expect(toggle).toBeInViewport();
 const scrolling=await panel.evaluate(el=>({scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}));
 expect(scrolling.scrollHeight).toBeGreaterThan(scrolling.clientHeight);
 await panel.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect(panel.locator("a").last()).toBeInViewport();
 await page.keyboard.press("Escape");
 await expect(panel).toBeHidden();
});


test("glass menu dismisses on desktop breakpoint and restores focus on Escape",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 const menu=page.locator("[data-menu-panel]");
 await toggle.click();
 await page.keyboard.press("Escape");
 await expect(menu).toBeHidden();
 await expect(toggle).toBeFocused();
 await toggle.click();
 await page.setViewportSize({width:1280,height:800});
 await expect(menu).toBeHidden();
 await expect(toggle).toHaveAttribute("aria-expanded","false");
 await expect(page.locator("html")).not.toHaveAttribute("data-menu-open","true");
});


test("glass menu stays open after ordinary page load and closes on link activation",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 const panel=page.locator("[data-menu-panel]");
 await toggle.click();
 await expect(panel).toBeVisible();
 await page.waitForTimeout(400);
 await expect(panel).toBeVisible();
 await panel.locator("a[href='/#projects']").click();
 await expect(panel).toBeHidden();
 await expect(toggle).toHaveAttribute("aria-expanded","false");
});


test("optical lab links are actual routes and survive missing WebGL",async({page})=>{
 await page.addInitScript(()=>{
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...args){
   if(type==="webgl"||type==="experimental-webgl")return null;
   return null;
  } as typeof HTMLCanvasElement.prototype.getContext;
 });
 await page.goto("/experiments/liquid-glass-optics.html");
 const menu=page.locator("#optic-menu");
 await expect(menu).toBeVisible();
 const destinations=await menu.locator("a").evaluateAll(links=>links.map(link=>link.getAttribute("href")));
 expect(destinations).toEqual(["/#projects","/#mathematics","/#gallery","/#experiments","/brief/","/#contact"]);
 await menu.locator("a").first().click();
 await expect(page).toHaveURL(/\/#projects$/);
});


test("reduced-motion mobile glass menu remains usable while the document scrolls",async({page,isMobile})=>{
 if(!isMobile)return;
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 const toggle=page.locator("[data-menu-toggle]");
 const panel=page.locator("[data-menu-panel]");
 await toggle.click();
 await expect(panel).toBeVisible();
 await page.evaluate(()=>window.scrollTo({top:Math.min(500,document.documentElement.scrollHeight-innerHeight),behavior:"instant"}));
 await expect(panel).toBeVisible();
 await expect(toggle).toBeInViewport();
 await page.keyboard.press("Escape");
 await expect(panel).toBeHidden();
 await expect(toggle).toHaveAttribute("aria-expanded","false");
});

test("pixel optics laboratory draws a changing WebGL texture on scroll", async ({ page }) => {
 await page.goto("/experiments/pixel-optics-lab.html");
 await expect(page.locator("#glass")).toBeVisible();
 await expect(page.locator("#scroll")).toBeVisible();
 await expect(page.getByText("真实像素纹理驱动的玻璃边缘")).toBeVisible();
 const available=await page.locator("#status").textContent();
 if (!available?.includes("WebGL ·")) {
  test.skip(true, "Browser runner has no WebGL context");
  return;
 }
 const before=await page.locator("#glass").evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.locator("#scroll").evaluate((el:HTMLElement)=>{el.scrollTop=220;el.dispatchEvent(new Event("scroll"))});
 await page.waitForTimeout(150);
 const after=await page.locator("#glass").evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 expect(after).not.toBe(before);
});

test("default homepage pixel rim activates and preserves accessible navigation", async ({page}) => {
 await page.goto("/");
 const nav=page.locator(".glass-nav");
 await expect(nav).toBeVisible();
 const context=await page.locator(".nav-pixel-rim").evaluate((el:HTMLCanvasElement)=>Boolean(el.getContext("webgl")));
 if (!context) {test.skip(true,"WebGL context unavailable");return;}
 await expect(nav).toHaveAttribute("data-pixel-optics","on");
 await expect(page.locator("[data-theme-toggle]")).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,300));
 await expect(nav).toBeVisible();
});

test("pixel rim responds to heading proximity instead of staying a static tint", async ({page}) => {
 await page.goto("/");
 const nav=page.locator(".glass-nav");
 await expect(nav).toHaveAttribute("data-pixel-optics","on");
 const rim=page.locator(".nav-pixel-rim");
 const measure=()=>rim.evaluate((canvas:HTMLCanvasElement)=>{
  const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true});
  if(!gl)return -1;
  const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let sum=0;for(let i=3;i<pixels.length;i+=4)sum+=pixels[i];
  return sum;
 });
 const far=await measure();
 await page.evaluate(()=>{
  const title=document.querySelector(".hero h1")!;
  const bar=document.querySelector(".glass-nav")!;
  window.scrollTo(0,window.scrollY+title.getBoundingClientRect().top-bar.getBoundingClientRect().bottom-15);
 });
 await page.waitForTimeout(250);
 const near=await measure();
 expect(near).toBeGreaterThan(far);
});

test("pixel rim preserves red channel from a real image", async ({page}) => {
 await page.goto("/");
 const nav=page.locator(".glass-nav");
 await expect(nav).toHaveAttribute("data-pixel-optics","on");
 await page.evaluate(async()=>{
  const n=document.querySelector(".glass-nav")!.getBoundingClientRect();
  const img=document.createElement("img");
  img.alt="optical red test";
  img.src="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110"><rect width="320" height="110" fill="#ed1717"/></svg>');
  img.style.cssText="position:fixed;left:100px;top:"+Math.round(n.bottom+3)+"px;width:320px;height:110px;z-index:10";
  document.querySelector("main")!.appendChild(img);
  await img.decode();
  window.dispatchEvent(new Event("scroll"));
 });
 await page.waitForTimeout(180);
 const sample=await page.locator(".nav-pixel-rim").evaluate((c:HTMLCanvasElement)=>{
  const gl=c.getContext("webgl",{preserveDrawingBuffer:true})!;
  const pixels=new Uint8Array(c.width*c.height*4);
  gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let reds=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]>pixels[i+1]+35&&pixels[i]>pixels[i+2]+35&&pixels[i+3]>15)reds++;}
  return reds;
 });
 expect(sample).toBeGreaterThan(0);
});

test("pixel rim can be disabled with an explicit query parameter", async ({page}) => {
 await page.goto("/?pixelGlass=0");
 await expect(page.locator(".glass-nav")).not.toHaveAttribute("data-pixel-optics","on");
 await expect(page.locator(".nav-pixel-rim")).toBeHidden();
});

test("shared scene optical shader samples real RGB from image, gradient, SVG and blue ink", async ({page}) => {
 await page.goto("/experiments/shared-scene-optics.html");
 await expect(page.locator("#status")).toContainText("WebGL");
 const collect=async(top:number)=>{
  await page.locator("#viewport").evaluate((el:HTMLElement,t)=>{el.scrollTop=t;el.dispatchEvent(new Event("scroll"))},top);
  await page.waitForTimeout(120);
  return page.locator("#rim").evaluate((canvas:HTMLCanvasElement)=>{
   const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true})!;
   const data=new Uint8Array(canvas.width*canvas.height*4);
   gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
   let peak=0,rgb=[0,0,0];
   for(let i=0;i<data.length;i+=4){if(data[i+3]>peak){peak=data[i+3];rgb=[data[i],data[i+1],data[i+2]]}}
   return {peak,rgb};
  });
 };
 const blue=await collect(260),red=await collect(360),gradient=await collect(550),vector=await collect(750);
 expect(blue.peak).toBeGreaterThan(0);
 expect(red.peak).toBeGreaterThan(0);
 expect(gradient.peak).toBeGreaterThan(0);
 expect(vector.peak).toBeGreaterThan(0);
 expect(red.rgb[0]).toBeGreaterThan(red.rgb[1]+25);
 expect(blue.rgb[2]).toBeGreaterThan(blue.rgb[0]+25);
});

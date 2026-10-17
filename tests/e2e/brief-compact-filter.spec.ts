import {test,expect, type Page} from "@playwright/test";

async function fakeArchive(page:Page){
 await page.route("**/brief/data/index.json",route=>route.fulfill({
  contentType:"application/json",
  body:JSON.stringify({version:1,dates:["2026-10-17","2026-10-16","2026-10-15"],updated_at:"test-2026-10-17"})
 }));
 const fixtures:Record<string,unknown> = {
  "2026-10-17":{date:"2026-10-17",items:[
   {edition:"morning",category:"心理学",source:"PsyPost",url:"https://example.org/psy",
    title_zh:"研究依恋类型",summary_zh:"心理研究公开摘要"},
   {edition:"evening",category:"工程与开源",source:"The Register",url:"https://example.org/tech",
    title_zh:"晚间开源研究",summary_zh:"技术报道"},
  ]},
  "2026-10-16":{date:"2026-10-16",items:[
   {edition:"morning",category:"数学",source:"arXiv",url:"https://example.org/math",
    title_zh:"统计数学新进展",summary_zh:"数学研究"},
  ]},
  "2026-10-15":{date:"2026-10-15",items:[
   {edition:"morning",category:"国际科技",source:"Nature",url:"https://example.org/other",
    title_zh:"科技观察",summary_zh:"科学讯息"},
  ]}
 };
 await page.route("**/brief/data/*.json",route=>{
  const name=route.request().url().split("/").pop()?.split("?")[0]?.replace(".json","")||"";
  const item=fixtures[name];
  if(!item)return route.fallback();
  return route.fulfill({contentType:"application/json",body:JSON.stringify(item)});
 });
}

test("compact filter uses one masthead row, no duplicate year or status",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await fakeArchive(page);
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(4);
 await expect(page.locator("#brief-filter")).toHaveAttribute("data-expanded","false");
 await expect(page.locator("#filter-toggle")).toHaveAttribute("aria-expanded","false");
 await expect(page.locator("#total")).toHaveText("4");
 await expect(page.locator("#issues")).toHaveValue("2026-10-17");
 await expect(page.locator("#issues option").first()).toHaveText("10-17");
 await expect(page.locator("#filter-details")).not.toBeVisible();
 await expect(page.locator("#status")).toHaveClass(/is-summary/);
 const bounds=await page.evaluate(()=>{
  const title=document.querySelector("#brief-heading")!.getBoundingClientRect();
  const filter=document.querySelector("#brief-filter")!.getBoundingClientRect();
  const viewport=document.documentElement.clientWidth;
  return {titleTop:title.top,filterTop:filter.top,titleBottom:title.bottom,filterBottom:filter.bottom,
   filterRight:filter.right,viewport};
 });
 expect(Math.abs(bounds.titleTop-bounds.filterTop)).toBeLessThan(23);
 expect(bounds.filterBottom-bounds.titleTop).toBeLessThan(54);
 expect(bounds.filterRight).toBeLessThanOrEqual(bounds.viewport);
});

test("expansion reveals working category, date range and edition, with live results",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await fakeArchive(page);
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(4);
 await page.locator("#filter-toggle").click();
 await expect(page.locator("#filter-details")).toBeVisible();
 await expect(page.locator(".filter-expanded-meta")).toBeVisible();
 await expect(page.locator("#expanded-total")).toHaveText("4");
 await expect(page.locator("#filter-toggle")).toHaveAttribute("aria-expanded","true");
 await expect(page.locator("#filter-details")).not.toHaveAttribute("inert");
 await page.locator('[data-edition="evening"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(1);
 await expect(page.locator("#total")).toHaveText("1");
 await expect(page.locator("#expanded-total")).toHaveText("1");
 await expect(page.locator("#stories")).toContainText("晚间开源研究");
 await page.locator('[data-edition="all"]').click();
 await page.locator("#tabs button").filter({hasText:"数学"}).click();
 await expect(page.locator("#stories")).toContainText("统计数学新进展");
 await expect(page.locator("#total")).toHaveText("1");
 await page.locator("#filter-toggle").click();
 await expect(page.locator("#filter-details")).not.toBeVisible();
 await page.locator("#filter-toggle").click();
 await expect(page.locator("#filter-details")).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(page.locator("#filter-toggle")).toHaveAttribute("aria-expanded","false");
 await expect(page.locator("#filter-toggle")).toBeFocused();
 await page.locator("#issues").selectOption("2026-10-17");
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
 await expect(page.locator("#total")).toHaveText("2");
});

test("compact filter at 360px has visible toggle and stays within viewport",async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await fakeArchive(page);
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(4);
 const position=await page.evaluate(()=>{
  const heading=document.querySelector("#brief-heading")!.getBoundingClientRect();
  const toggle=document.querySelector("#filter-toggle")!.getBoundingClientRect();
  return {headingRight:heading.right,toggleLeft:toggle.left,toggleRight:toggle.right,width:innerWidth}
 });
 expect(position.headingRight).toBeLessThan(position.toggleLeft);
 expect(position.toggleRight).toBeLessThanOrEqual(position.width);
 await page.locator("#filter-toggle").click();
 await expect(page.locator('[data-days="7"]')).toBeVisible();
 await page.locator('[data-days="0"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
 await expect(page.locator("#total")).toHaveText("2");
});

test("mobile capsule is ONLY date and toggle at 320, 360 and 390px",async({page})=>{
 await fakeArchive(page);
 for(const width of [320,360,390]){
  await page.setViewportSize({width,height:844});
  await page.goto("/brief/");
  await expect(page.locator("#stories .news-card")).toHaveCount(4);
  await expect(page.locator("#brief-filter")).toHaveAttribute("data-expanded","false");
  await expect(page.locator("#compact-edition")).toBeHidden();
  await expect(page.locator("#compact-range")).toBeHidden();
  await expect(page.locator("#compact-category")).toBeHidden();
  await expect(page.locator(".brief-count")).toBeHidden();
  await expect(page.locator("#issues")).toBeVisible();
  await expect(page.locator("#filter-toggle")).toBeVisible();
  const sizes=await page.evaluate(()=>{
   const title=document.querySelector("#brief-heading")!.getBoundingClientRect();
   const capsule=document.querySelector("#brief-filter")!.getBoundingClientRect();
   const doc=document.documentElement;
   return {titleRight:title.right,capsuleLeft:capsule.left,
    capsuleRight:capsule.right,capsuleHeight:capsule.height,
    viewport:doc.clientWidth,documentWidth:doc.scrollWidth};
  });
  expect(sizes.titleRight).toBeLessThan(sizes.capsuleLeft+2);
  expect(sizes.capsuleRight).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.documentWidth).toBeLessThanOrEqual(sizes.viewport+2);
  expect(sizes.capsuleHeight).toBeLessThan(54);
 }
});

test("popover floats above articles without moving title, dismisses on outside tap",async({page})=>{
 await fakeArchive(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(4);
 const rect=async()=>page.evaluate(()=>{
  const title=document.querySelector("#brief-heading")!.getBoundingClientRect();
  const story=document.querySelector("#stories .news-card")!.getBoundingClientRect();
  const capsule=document.querySelector("#brief-filter")!.getBoundingClientRect();
  return {titleTop:title.top,storyTop:story.top,dockWidth:capsule.width};
 });
 const before=await rect();
 await page.locator("#filter-toggle").click();
 await expect(page.locator("#filter-details")).toBeVisible();
 await expect(page.locator("#expanded-total")).toHaveText("4");
 await page.waitForTimeout(420);
 const after=await rect();
 expect(Math.abs(before.storyTop-after.storyTop)).toBeLessThan(2);
 expect(Math.abs(before.titleTop-after.titleTop)).toBeLessThan(2);
 expect(Math.abs(before.dockWidth-after.dockWidth)).toBeLessThan(2);
 const visual=await page.evaluate(()=>{
  const pop=document.querySelector("#filter-details")!.getBoundingClientRect();
  const dock=document.querySelector("#brief-filter")!.getBoundingClientRect();
  return {top:pop.top,dockBottom:dock.bottom,left:pop.left,right:pop.right,width:innerWidth,
   bg:getComputedStyle(document.querySelector("#filter-details")!).backdropFilter};
 });
 expect(visual.top).toBeGreaterThan(visual.dockBottom);
 expect(visual.left).toBeGreaterThanOrEqual(0);
 expect(visual.right).toBeLessThanOrEqual(visual.width+1);
 expect(visual.bg).not.toBe("none");
 await page.locator("#brief-heading").click();
 await expect(page.locator("#filter-details")).not.toBeVisible();
 await expect(page.locator("#filter-toggle")).toHaveAttribute("aria-expanded","false");
});

test("glass popover provides all filters and keyboard dismissal at phone width",async({page})=>{
 await fakeArchive(page);
 await page.setViewportSize({width:360,height:780});
 await page.goto("/brief/");
 await page.locator("#filter-toggle").click();
 await expect(page.locator("#tabs")).toBeVisible();
 await expect(page.locator("#quick-dates")).toBeVisible();
 await expect(page.locator("#edition-controls")).toBeVisible();
 await page.locator('[data-days="0"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
 await expect(page.locator("#expanded-total")).toHaveText("2");
 await page.locator('[data-edition="evening"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(1);
 await expect(page.locator("#expanded-total")).toHaveText("1");
 await page.keyboard.press("Escape");
 await expect(page.locator("#filter-toggle")).toHaveAttribute("aria-expanded","false");
 await expect(page.locator("#filter-toggle")).toBeFocused();
});

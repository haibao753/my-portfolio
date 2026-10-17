import {test,expect} from "@playwright/test";

test("morning and evening filters distinguish same-day editions",async({page})=>{
 await page.route("**/brief/data/index.json",r=>r.fulfill({contentType:"application/json",body:JSON.stringify({
  version:1,dates:["2026-10-17"],updated_at:"first"
 })}));
 await page.route("**/brief/data/2026-10-17.json",r=>r.fulfill({contentType:"application/json",body:JSON.stringify({
  version:1,date:"2026-10-17",items:[
   {edition:"morning",focus:true,title_zh:"早间数学新研究",summary_zh:"摘要",source:"arXiv math.ST",category:"数学",url:"https://example.org/am"},
   {edition:"evening",focus:false,title_zh:"晚间人工智能新研究",summary_zh:"摘要",source:"Google Research",category:"AI",url:"https://example.org/pm"}
  ]
 })}));
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
 await expect(page.locator("#stories .news-card.is-focus")).toHaveCount(1);
 await page.locator('[data-edition="evening"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(1);
 await expect(page.locator("#stories")).toContainText("晚间人工智能");
 await expect(page.locator('[data-edition="evening"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('[data-edition="morning"]').click();
 await expect(page.locator("#stories")).toContainText("早间数学");
 await page.locator('[data-edition="all"]').click();
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
});

test("same-date evening publication refreshes without full reload",async({page})=>{
 let revision=1;
 await page.route("**/brief/data/index.json",r=>r.fulfill({contentType:"application/json",body:JSON.stringify({
  version:1,dates:["2026-10-17"],updated_at:"revision-"+revision
 })}));
 await page.route("**/brief/data/2026-10-17.json",r=>r.fulfill({contentType:"application/json",body:JSON.stringify({
  version:1,date:"2026-10-17",items:[
   {edition:"morning",title_zh:"原有早报",category:"数学",source:"arXiv",url:"https://example.org/one"},
   ...(revision>1?[{edition:"evening",title_zh:"新发布晚报",category:"AI",source:"Google",url:"https://example.org/two"}]:[])
  ]
 })}));
 await page.goto("/brief/");
 await expect(page.locator("#stories .news-card")).toHaveCount(1);
 revision=2;
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(page.locator("#stories .news-card")).toHaveCount(2);
 await expect(page.locator("#stories")).toContainText("新发布晚报");
});

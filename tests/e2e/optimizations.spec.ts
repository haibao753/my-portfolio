import { test, expect } from '@playwright/test';

test('photo strip uses decoded responsive WebP images instead of full originals', async ({ page }) => {
 await page.goto('/');
 const strip = page.locator('.photo-art');
 await strip.scrollIntoViewIfNeeded();
 for (const image of await strip.locator('img').all()) {
  await expect(image).toHaveAttribute('srcset', /320w.*640w.*960w/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await image.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/_astro\/.+\.webp/);
 }
});

test('filtering preserves keyboard focus and follows the selected UI language', async ({ page }) => {
 await page.goto('/brief/');
 await expect(page.locator('.news-card').first()).toBeVisible();
 const filter = page.locator('#tabs button').nth(1);
 await filter.focus();
 await filter.press('Enter');
 await expect(filter).toBeFocused();
 await expect(filter).toHaveAttribute('aria-pressed', 'true');
 // Scrolling back to the top restores the full toolbar without following
 // the brand's home link. This works whether filtering collapsed it or not.
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await expect.poll(async()=>page.locator('.glass-nav').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(200);
 await expect(page).toHaveURL(url=>url.pathname==='/brief/');
 await page.locator('[data-language-toggle]').click();
 await expect(page.locator('#tabs button').first()).toHaveText('All');
 await expect(page.locator('#status')).toContainText('Showing');
 await expect(page.locator('.news-source a').first()).toHaveText('Read original report ↗');
 await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to dark mode');
});

test('mobile navigation supports focus, header controls and outside dismissal', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto('/');
 const toggle = page.locator('[data-menu-toggle]');
 const panel = page.locator('[data-menu-panel]');
 await toggle.click();
 await expect(panel.locator('a').first()).toBeFocused();
 await page.locator('[data-theme-toggle]').click();
 await expect(toggle).toHaveAttribute('aria-expanded', 'true');
 const box = await panel.boundingBox();
 expect(box).not.toBeNull();
 await page.mouse.click(Math.max(2, box!.x - 16), box!.y + 24);
 await expect(panel).toBeHidden();
 await toggle.click();
 await page.keyboard.press('Escape');
 await expect(toggle).toBeFocused();
});

test('a failed issue request clears stale cards and exposes a recoverable error', async ({ page }) => {
 await page.goto('/brief/');
 await expect(page.locator('.news-card').first()).toBeVisible();
 const dates = await page.locator('#issues option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
 expect(dates.length).toBeGreaterThan(1);
 await page.route(`**/brief/data/${dates[1]}.json`, route => route.fulfill({ status: 503, body: 'unavailable' }));
 await page.locator('#issues').selectOption(dates[1]);
 await expect(page.locator('.news-card')).toHaveCount(0);
 await expect(page.locator('#status')).toContainText('加载失败');
 await expect(page.locator('#stories')).toHaveAttribute('aria-busy', 'false');
 await page.locator('#issues').selectOption(dates[0]);
 await expect(page.locator('.news-card').first()).toBeVisible();
});

test('runtime optical canvas stays out of layout and cannot grow the header', async ({ page }) => {
 await page.goto('/?opticalEngine=1');
 const canvas=page.locator('.live-optical-layer');
 await expect(canvas).toHaveCSS('position','absolute');
 await expect(canvas).toHaveCSS('pointer-events','none');
 const nav=page.locator('.glass-nav');
 await expect.poll(()=>nav.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(100);
 await expect.poll(()=>nav.getAttribute('data-optical-texture-full')).not.toBeNull();
 await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
 await expect.poll(()=>nav.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(100);
});

test('Daily Brief source disclosure expands inline without a paywall redirect',async({page})=>{
 await page.goto('/brief/');
 await expect(page.locator('.news-card').first()).toBeVisible();
 const card=page.locator('.news-card').first();
 const disclosure=card.locator('details.news-expanded');
 await expect(disclosure).toBeVisible();
 await expect(disclosure).not.toHaveAttribute('open','');
 await disclosure.locator('summary').click();
 await expect(disclosure).toHaveAttribute('open','');
 await expect(card.locator('.news-disclosure-note')).toBeVisible();
 await expect(page).toHaveURL(url=>url.pathname==='/brief/');
 await expect(card.locator('.news-source a')).toHaveAttribute('target','_blank');
});

test('three-day and seven-day filters aggregate issues and preserve single-date selection',async({page})=>{
 const date=new Date();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const day=(offset:number)=>new Date(Date.parse(today+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10);
 const dates=Array.from({length:8},(_,i)=>day(i));
 await page.route('**/brief/data/index.json',route=>route.fulfill({json:{dates}}));
 for(const [i,d] of dates.entries()){
  const item={category:i%2?'AI':'数学',source:'Test publisher',
   published:d,title_zh:'测试新闻 '+i,summary_zh:'公开摘要 '+i,
   why_zh:'研究意义',url:'https://example.org/story/'+i};
  await page.route('**/brief/data/'+d+'.json',route=>route.fulfill({json:{date:d,items:[item]}}));
 }
 await page.goto('/brief/');
 await expect(page.locator('.news-card')).toHaveCount(1);
 await page.locator('#quick-dates [data-days="3"]').click();
 await expect(page.locator('.news-card')).toHaveCount(3);
 await expect(page.locator('#quick-dates [data-days="3"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#quick-dates [data-days="7"]').click();
 await expect(page.locator('.news-card')).toHaveCount(7);
 await page.locator('#tabs button').nth(1).click();
 await expect(page.locator('.news-card')).toHaveCount(4);
 await page.locator('#issues').selectOption(day(2));
 await expect(page.locator('.news-card')).toHaveCount(1);
 await expect(page.locator('#quick-dates [data-days="7"]')).toHaveAttribute('aria-pressed','false');
});


test('two owned videos are listed but never load on initial homepage render', async ({page})=>{
 await page.goto('/');
 await expect(page.locator('#mathematics .project-link')).toHaveAttribute('href','/#mathematics-video');
 await expect(page.locator('[data-bili-featured]')).toHaveCount(2);
 await expect(page.locator('video.bili-native-video')).toHaveCount(0);
 await expect(page.locator('iframe.bili-iframe')).toHaveCount(0);
 await expect(page.locator('a[href="https://space.bilibili.com/1572685586"]').first()).toBeAttached();
});

test('native video cards use uploaded assets when present and show honest fallback when missing',async({page})=>{
 const expected=[
  ['mobius','/videos/Video_1792127365800_461.mp4','BV1BDpB6wEiJ'],
  ['group','/videos/Video_1792127358357_245.mp4','BV1LTa562Ehz']
 ];
 await page.route('**/videos/*.mp4',route=>{
  if(route.request().method()==='HEAD')return route.fulfill({status:200,headers:{'content-type':'video/mp4'},body:''});
  return route.fulfill({status:206,headers:{'content-type':'video/mp4'},body:''});
 });
 await page.goto('/');
 for(const [key,path,bvid] of expected){
  const card=page.locator('[data-bili-featured="'+key+'"]');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('video.bili-native-video')).toHaveAttribute('src',path);
  await expect(page.locator('[data-bili-open]')).toHaveAttribute('href','https://www.bilibili.com/video/'+bvid);
  await expect(page).toHaveURL('/');
 }
 await page.unrouteAll({behavior:'wait'});
 await page.route('**/videos/*.mp4',route=>route.fulfill({status:404,body:'missing'}));
 await page.locator('[data-bili-featured="mobius"]').click();
 await expect(page.locator('[data-bili-status]')).toContainText('原视频文件尚未部署');
 await expect(page.locator('[data-bili-open]')).toHaveAttribute('href','https://www.bilibili.com/video/BV1BDpB6wEiJ');
});

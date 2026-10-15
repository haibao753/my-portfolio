import {test,expect} from '@playwright/test';

test('exploration objects keep real routes and fit the desk',async({page})=>{
 await page.goto('/lab/');
 await expect(page.locator('[data-exploration-desk]')).toHaveAttribute('data-lab-ready','true');
 await expect(page.locator('[data-lab-object]')).toHaveCount(4);
 await expect(page.locator('.glass-nav')).toBeVisible();
 for(const link of await page.locator('[data-lab-open]').all()){
  await expect(link).toHaveAttribute('href',/^(\/brief\/|https:\/\/space\.bilibili\.com\/|https:\/\/zhengyifan\.win\/|\/experiments\/)/);
 }
 const bounds=await page.locator('[data-lab-stage]').evaluate(stage=>{
  const s=stage.getBoundingClientRect();return Array.from(stage.querySelectorAll('[data-lab-open]')).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-s.left,right:r.right-s.right,top:r.top-s.top,bottom:r.bottom-s.bottom}});
 });
 for(const b of bounds){expect(b.left).toBeGreaterThanOrEqual(-2);expect(b.right).toBeLessThanOrEqual(2);expect(b.top).toBeGreaterThanOrEqual(0);expect(b.bottom).toBeLessThanOrEqual(2)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test('each discovery opens a real project, remembers the trail and restores focus',async({page})=>{
 await page.goto('/lab/');
 const inspector=page.locator('[data-lab-inspector]');
 for(let index=0;index<4;index++){
  const link=page.locator('[data-lab-open]').nth(index),href=await link.getAttribute('href');
  await link.click();
  await expect(inspector).toBeVisible();
  await expect(inspector.locator('.discovery-link')).toHaveAttribute('href',href!);
  await expect(page.locator('[data-clue-count]')).toHaveText(String(index+1));
  await page.keyboard.press('Escape');
  await expect(inspector).not.toBeVisible();
  await expect(link).toBeFocused();
 }
 await expect(page.locator('[data-lab-reset]')).toBeVisible();
 await page.reload();
 await expect(page.locator('[data-clue-count]')).toHaveText('4');
 await page.locator('[data-lab-reset]').click();
 await expect(page.locator('[data-clue-count]')).toHaveText('0');
 await expect(page.locator('[data-lab-object][data-visited="true"]')).toHaveCount(0);
 for(let count=1;count<=4;count++){
  await page.locator('[data-lab-surprise]').click();
  await expect(page.locator('[data-clue-count]')).toHaveText(String(count));
  await page.locator('[data-lab-close]').click();
 }
});

test('desk rearranges without taking over native phone scrolling',async({page,isMobile})=>{
 await page.goto('/lab/');
 const object=page.locator('[data-lab-object]').first(),before=await object.boundingBox();
 await page.locator('[data-lab-shuffle]').click();
 const after=await object.boundingBox();
 expect(Math.abs(after!.x-before!.x)+Math.abs(after!.y-before!.y)).toBeGreaterThan(8);
 if(isMobile){
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:12,y:600}]});
  for(let i=1;i<=8;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:12,y:600-i*35}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
 }else{
  await object.hover();
  const grip=object.locator('[data-lab-drag]'),box=(await grip.boundingBox())!;
  const start=(await object.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+85,box.y+box.height/2-35,{steps:5});await page.mouse.up();
  expect((await object.boundingBox())!.x-start.x).toBeGreaterThan(60);
  await grip.focus();const x=(await object.boundingBox())!.x;await page.keyboard.press('ArrowLeft');
  expect(x-(await object.boundingBox())!.x).toBeGreaterThan(8);
  await expect(page.locator('[data-lab-inspector]')).not.toBeVisible();
 }
});

test('exploration remains bilingual and usable with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/lab/');
 await expect(page.locator('.live-optical-layer')).toHaveCount(0);
 await page.locator('[data-language-toggle]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('[data-lab-open]').first()).toContainText('Daily Brief');
 await expect(page.locator('[data-lab-drag]').first()).toHaveAttribute('aria-label',/Move/);
 await page.locator('[data-theme-toggle]').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('[data-lab-surprise]').click();
 await expect(page.locator('[data-lab-inspector]')).toBeVisible();
 await expect(page.locator('[data-lab-status]')).toContainText('Project preview');
 await expect(page.locator('[data-lab-close]')).toHaveAttribute('aria-label','Close note');
});

test('without JavaScript every object is still a direct project link',async({browser,page})=>{
 await page.goto('/lab/');
 const context=await browser.newContext({javaScriptEnabled:false});
 try{
  const fallback=await context.newPage();await fallback.goto(new URL('/lab/',page.url()).href);
  await expect(fallback.locator('[data-lab-open]')).toHaveCount(4);
  await expect(fallback.locator('[data-lab-controls]')).toBeHidden();
  await expect(fallback.locator('[data-lab-inspector]')).not.toBeVisible();
  await expect(fallback.locator('[data-lab-open]').first()).toHaveAttribute('href','/brief/');
 }finally{await context.close()}
});

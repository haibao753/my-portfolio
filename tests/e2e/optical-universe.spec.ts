import {test,expect,type Page} from '@playwright/test';

const hash=(page:Page)=>page.locator('[data-sculpture-canvas]').evaluate((canvas:HTMLCanvasElement)=>{
 const gl=canvas.getContext('webgl')!,p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);
 let sum=0,area=0,bright=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>0)area++;if(p[i]+p[i+1]+p[i+2]>200)bright++;sum=(sum+p[i]*3+p[i+1]*7+p[i+2]*13)%2147483647}return {sum,area,bright};
});

test('universe renders a real lit sculpture and autonomously changes its pixels',async({page,isMobile})=>{
 await page.goto('/lab/');const host=page.locator('[data-optical-universe]');await expect(host).toHaveAttribute('data-universe-gpu','true');
 await expect.poll(async()=>Number(await host.getAttribute('data-universe-frames'))).toBeGreaterThan(1);
 const first=await hash(page);expect(first.area).toBeGreaterThan(5000);expect(first.bright).toBeGreaterThan(1000);
 await expect.poll(async()=>(await hash(page)).sum).not.toBe(first.sum);
 expect(await page.locator('h1').count()).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 for(const selector of ['.desktop-links a','.mobile-menu a']){
  for(const link of await page.locator(selector).all()){
   const href=await link.getAttribute('href');if(href?.startsWith('#'))expect(await page.locator(href).count()).toBe(1);
  }
 }
 await expect(page.locator('.desktop-links a').first()).toHaveAttribute('href','#worlds');
 if(isMobile){
  const box=(await page.locator('[data-sculpture-touch]').boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2,before=await page.evaluate(()=>scrollY),touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=7;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*24}]});await page.waitForTimeout(16)}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+70);
 }
});

test('world modes, touch and keyboard create visible new compositions while pause freezes time',async({page})=>{
 await page.goto('/lab/');const host=page.locator('[data-optical-universe]');await expect(host).toHaveAttribute('data-universe-gpu','true');
 await page.locator('[data-universe-pause]').click();await expect(host).toHaveAttribute('data-universe-motion','paused');await page.waitForTimeout(100);
 const time=await host.getAttribute('data-universe-time');await page.waitForTimeout(200);expect(await host.getAttribute('data-universe-time')).toBe(time);
 const original=await hash(page);
 await page.locator('button[data-universe-mode="1"]').click();await expect(host).toHaveAttribute('data-universe-mode','1');await expect.poll(async()=>(await hash(page)).sum).not.toBe(original.sum);
 const prism=await hash(page);await page.locator('button[data-universe-mode="2"]').click();await expect.poll(async()=>(await hash(page)).sum).not.toBe(prism.sum);
 const touch=page.locator('[data-sculpture-touch]');await touch.focus();await page.keyboard.press('Enter');await expect(host).toHaveAttribute('data-universe-interactions','1');await expect(page.locator('[data-universe-feedback]')).not.toBeEmpty();
 await page.locator('[data-language-toggle]').click();await expect(page.locator('[data-universe-pause-label]')).toHaveText('Resume animation');await expect(page.locator('h1')).toContainText('Jinhai Hu');
});

test('reduced motion and offscreen scenes stop the render loop',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/lab/');const host=page.locator('[data-optical-universe]');await expect(host).toHaveAttribute('data-universe-gpu','true');await expect(host).toHaveAttribute('data-universe-motion','paused');
 await expect.poll(async()=>Number(await host.getAttribute('data-universe-frames'))).toBeGreaterThan(0);await page.waitForTimeout(100);const before=await host.getAttribute('data-universe-frames');await page.waitForTimeout(200);expect(await host.getAttribute('data-universe-frames')).toBe(before);
 await page.locator('[data-universe-pause]').click();await expect(host).toHaveAttribute('data-universe-motion','playing');await page.locator('.all-paths').scrollIntoViewIfNeeded();await expect(host).toHaveAttribute('data-universe-in-view','false');await page.waitForTimeout(100);const offscreen=await host.getAttribute('data-universe-frames');await page.waitForTimeout(200);expect(await host.getAttribute('data-universe-frames')).toBe(offscreen);
});

test('context loss and disabled JavaScript keep the art and project routes available',async({page,browser})=>{
 await page.goto('/lab/');const host=page.locator('[data-optical-universe]');await expect(host).toHaveAttribute('data-universe-gpu','true');
 await page.locator('[data-sculpture-canvas]').evaluate((canvas:HTMLCanvasElement)=>canvas.getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());await expect(host).toHaveAttribute('data-universe-gpu','false');await expect(page.locator('[data-sculpture-fallback]')).toBeVisible();await expect(page.locator('[data-universe-pause]')).toBeDisabled();
 await page.locator('button[data-universe-mode="1"]').click();await expect(host).toHaveAttribute('data-universe-mode','1');await expect(page.locator('.primary-entry')).toHaveAttribute('href','#worlds');
 await expect(page.locator('.experiment-entry')).toHaveAttribute('href','/experiments/minimal-surfaces-classical.html');
 const ctx=await browser.newContext({javaScriptEnabled:false});try{const fallback=await ctx.newPage();await fallback.goto(new URL('/lab/',page.url()).href);await expect(fallback.locator('[data-sculpture-fallback]')).toBeVisible();await expect(fallback.locator('[data-lab-open]')).toHaveCount(4)}finally{await ctx.close()}
});

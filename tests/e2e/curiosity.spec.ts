import {test,expect} from '@playwright/test';

test('control-free sculpture moves and flows in colour',async({page})=>{
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]');
 await expect(sculpture).toHaveAttribute('data-renderer','webgl');
 await expect(sculpture.locator('button')).toHaveCount(1);
 await expect(sculpture.locator('input')).toHaveCount(0);
 const canvas=sculpture.locator('canvas');
 const colour=await canvas.getAttribute('data-colour-phase');
 const still=await canvas.screenshot();
 await expect.poll(()=>canvas.getAttribute('data-colour-phase')).not.toBe(colour);
 await page.waitForTimeout(600);
 expect(Buffer.compare(still,await canvas.screenshot())).not.toBe(0);
});

test('direct clicks cycle through all three forms',async({page})=>{
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]'),object=sculpture.locator('button');
 await expect(sculpture).toHaveAttribute('data-renderer','webgl');
 for(const form of ['1','2','0']){
  await object.click();
  await expect(sculpture).toHaveAttribute('data-form',form);
 }
});

test('motion can pause and lost WebGL retains a working static sculpture',async({page})=>{
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]'),object=sculpture.locator('button'),canvas=sculpture.locator('canvas');
 await expect(sculpture).toHaveAttribute('data-renderer','webgl');
 await object.press('Escape');
 await expect(sculpture).toHaveAttribute('data-motion','paused');
 await page.waitForTimeout(80);
 const frame=await canvas.getAttribute('data-frame');
 await page.waitForTimeout(400);
 expect(await canvas.getAttribute('data-frame')).toBe(frame);
 await object.press('Escape');
 await expect(sculpture).toHaveAttribute('data-motion','playing');
 await canvas.evaluate((node:HTMLCanvasElement)=>{
  const gl=node.getContext('webgl2')||node.getContext('webgl');
  gl!.getExtension('WEBGL_lose_context')!.loseContext();
 });
 await expect(sculpture).toHaveAttribute('data-renderer','fallback');
 await expect(sculpture.locator('.sculpture-fallback')).toHaveCSS('opacity','1');
 await object.click();await expect(sculpture).toHaveAttribute('data-form','1');
});

test('reduced motion avoids WebGL while keeping direct and keyboard shape changes',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]'),object=sculpture.locator('button');
 await expect(sculpture).toHaveAttribute('data-motion','reduced');
 await expect(sculpture.locator('canvas')).toHaveCount(0);
 await object.press('Enter');await expect(sculpture).toHaveAttribute('data-form','1');
 await object.press('Space');await expect(sculpture).toHaveAttribute('data-form','2');
 await expect(sculpture.locator('.fallback-flow')).toBeVisible();
 await page.locator('[data-language-toggle]').click();
 await expect(object).toHaveAttribute('aria-label',/Living geometry/);
});

test('offscreen decoration stops and live glass receives current sculpture pixels',async({page})=>{
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]');
 await expect(sculpture).toHaveAttribute('data-renderer','webgl');
 await page.evaluate(()=>{
  const rect=document.querySelector('[data-curiosity]')!.getBoundingClientRect();
  scrollTo({top:scrollY+rect.top+30,behavior:'instant'});
 });
 await expect.poll(()=>page.locator('.glass-nav').getAttribute('data-optical-media-frames')).not.toBeNull();
 // The compact mobile hero can remain partly visible when #projects enters
 // view. Test the actual offscreen condition, not an unrelated section position.
 await page.evaluate(()=>{
  const box=document.querySelector('[data-curiosity]')!.getBoundingClientRect();
  scrollTo({top:scrollY+box.bottom+180,behavior:'instant'});
 });
 await expect.poll(()=>sculpture.evaluate(node=>node.getBoundingClientRect().bottom)).toBeLessThan(0);
 await expect(sculpture).toHaveAttribute('data-motion','sleeping');
 const canvas=sculpture.locator('canvas');
 await page.waitForTimeout(120);
 const frame=await canvas.getAttribute('data-frame');
 await page.waitForTimeout(350);
 expect(await canvas.getAttribute('data-frame')).toBe(frame);
});

test.describe('native vertical touch on the decorative object',()=>{
 test.use({hasTouch:true});
 test('scrolls the page without switching form',async({page})=>{
  await page.goto('/');
  const sculpture=page.locator('[data-curiosity]');
  await expect(sculpture).toHaveAttribute('data-renderer','webgl');
  const box=(await sculpture.boundingBox())!;
  const startY=Math.min(box.y+box.height*.7,650),x=box.x+box.width*.5;
  const before=await page.evaluate(()=>scrollY);
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY}]});
  for(let step=1;step<=10;step++){
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:startY-step*24}]});
   await page.waitForTimeout(16);
  }
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+100);
  await expect(sculpture).toHaveAttribute('data-form','0');
 });
});

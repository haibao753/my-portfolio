import {test,expect} from '@playwright/test';

test('control-free sculpture moves, flows in colour and cycles through three forms',async({page})=>{
 await page.goto('/');
 const sculpture=page.locator('[data-curiosity]'),object=sculpture.locator('button');
 await expect(sculpture).toHaveAttribute('data-renderer','webgl');
 await expect(sculpture.locator('button')).toHaveCount(1);
 await expect(sculpture.locator('input')).toHaveCount(0);
 const canvas=sculpture.locator('canvas');
 const colour=await canvas.getAttribute('data-colour-phase');
 const still=await canvas.screenshot();
 await expect.poll(()=>canvas.getAttribute('data-colour-phase')).not.toBe(colour);
 await page.waitForTimeout(600);
 expect(Buffer.compare(still,await canvas.screenshot())).not.toBe(0);
 for(const form of ['1','2','0']){
  await object.click();
  await expect(sculpture).toHaveAttribute('data-form',form);
 }
 await object.press('Escape');
 await expect(sculpture).toHaveAttribute('data-motion','paused');
 await page.waitForTimeout(80);
 const frame=await canvas.getAttribute('data-frame');
 await page.waitForTimeout(400);
 expect(await canvas.getAttribute('data-frame')).toBe(frame);
 await object.press('Escape');
 await expect(sculpture).toHaveAttribute('data-motion','playing');
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
 await page.locator('#projects').scrollIntoViewIfNeeded();
 await expect(sculpture).toHaveAttribute('data-motion','sleeping');
 const canvas=sculpture.locator('canvas');
 await page.waitForTimeout(120);
 const frame=await canvas.getAttribute('data-frame');
 await page.waitForTimeout(350);
 expect(await canvas.getAttribute('data-frame')).toBe(frame);
});

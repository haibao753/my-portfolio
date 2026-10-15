import {test,expect} from '@playwright/test';

test('touch light follows finger and turns off on release',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const url='/assets/glass-pointer-light.js';
  const {glassPointerFor}=await import(url);
  const nav=document.querySelector('.glass-nav')!;
  const rect=nav.getBoundingClientRect();
  const x=rect.left+rect.width*.5,y=rect.top+rect.height*.5;
  const before=glassPointerFor(nav).pointerLightActive;
  window.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:42,clientX:x,clientY:y,bubbles:true}));
  const during=glassPointerFor(nav);
  window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:42,clientX:x+12,clientY:y,bubbles:true}));
  const moved=glassPointerFor(nav);
  window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:42,clientX:x+12,clientY:y,bubbles:true}));
  const after=glassPointerFor(nav).pointerLightActive;
  return {before,during,moved,after};
 });
 expect(result.before).toBe(0);
 expect(result.during.pointerLightActive).toBe(1);
 expect(result.moved.pointerLightPosition[0]).toBeGreaterThan(result.during.pointerLightPosition[0]);
 expect(result.after).toBe(0);
});

test('cursor light moves without uploading a new scene texture',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const nav=page.locator('.glass-nav');
 await expect.poll(()=>nav.getAttribute('data-optical-texture-full')).not.toBeNull();
 const box=await nav.boundingBox();
 expect(box).not.toBeNull();
 await page.mouse.move(box!.x+box!.width*.35,box!.y+box!.height*.5);
 await page.waitForTimeout(80);
 const uploads=await nav.getAttribute('data-optical-uploaded-pixels');
 await page.mouse.move(box!.x+box!.width*.65,box!.y+box!.height*.5);
 await page.waitForTimeout(80);
 expect(await nav.getAttribute('data-optical-uploaded-pixels')).toBe(uploads);
});

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

test('pointer illumination changes visible pixels even with a transparent scene',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const path='/assets/optical-engine.js';const {setup}=await import(path);
  const source=document.createElement('canvas');source.width=464;source.height=216;
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=72;
  const gl=canvas.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  const draw=setup(gl);
  const read=()=>{const p=new Uint8Array(4);gl.readPixels(160,36,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)};
  const options={liquid:1,scenePadding:72,surfaceSize:[320,72] as [number,number],cornerRadius:30,studioLight:0,pointerLightPosition:[.5,.5] as [number,number]};
  draw(source,{...options,pointerLightActive:0});const off=read();
  draw(source,{...options,pointerLightActive:1});const on=read();
  return {off,on};
 });
 expect(result.on[3]).toBeGreaterThan(result.off[3]);
});

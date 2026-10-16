import {test,expect} from '@playwright/test';

test('liquid meniscus preserves the clear centre and CSS-pixel geometry across DPR',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const modulePath='/assets/optical-engine.js';
  const {setup}=await import(modulePath);
  const source=document.createElement('canvas');source.width=320;source.height=72;
  const ctx=source.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,320,0);gradient.addColorStop(0,'rgb(0,80,150)');gradient.addColorStop(1,'rgb(255,80,150)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,320,72);
  return [1,2].map(dpr=>{
   const canvas=document.createElement('canvas');canvas.width=320*dpr;canvas.height=72*dpr;
   const gl=canvas.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
   const render=setup(gl);
   const sample=(x:number,y:number)=>{const pixel=new Uint8Array(4);gl.readPixels(x*dpr,y*dpr,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return Array.from(pixel)};
   render(source,{optical:0});const centreBefore=sample(160,36),edgeBefore=sample(3,36);
   render(source,{liquid:1,reflectivity:0,strength:1.25,surfaceSize:[320,72],cornerRadius:26});
   return {centreBefore,centreAfter:sample(160,36),edgeBefore,edgeAfter:sample(3,36),corner:sample(1,1)};
  });
 });
 for(const pixels of result){
  expect(pixels.centreAfter).toEqual(pixels.centreBefore);
  expect(pixels.edgeAfter[0]-pixels.edgeBefore[0]).toBeGreaterThanOrEqual(3);
  expect(pixels.corner[3]).toBe(0);
 }
 expect(Math.abs(result[0].edgeAfter[0]-result[1].edgeAfter[0])).toBeLessThanOrEqual(2);
});

test('liquid lighting redraws without re-uploading the scene and follows theme changes',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const nav=page.locator('.glass-nav'),canvas=page.locator('.live-optical-layer');
 await expect(nav).toHaveAttribute('data-optical-material','liquid-v2');
 await expect(canvas).toHaveCSS('mix-blend-mode','normal');
 await page.evaluate(()=>{
  const main=document.querySelector('main')!;main.replaceChildren();main.style.cssText='height:2000px;';
  const backdrop=document.createElement('div');backdrop.style.cssText='position:fixed;inset:0;height:120px;background:var(--card)';main.appendChild(backdrop);
  const brand=document.querySelector('.brand')!.getBoundingClientRect(),mark=document.querySelector('.brand span')!.getBoundingClientRect();
  const neighbour=document.createElement('div');neighbour.style.cssText=`position:fixed;top:0;left:${mark.right+1}px;width:${Math.max(0,brand.right-mark.right-1)}px;height:120px;background:#111`;main.appendChild(neighbour);
 });
 await expect.poll(()=>nav.getAttribute('data-optical-texture-full')).not.toBeNull();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const before=Number(await nav.getAttribute('data-optical-uploaded-pixels'));
 await expect(page.locator('[data-theme-toggle]')).toHaveCSS('color','rgb(21, 32, 45)');
 await expect(page.locator('.brand')).toHaveCSS('color','rgb(21, 32, 45)');
 const box=(await nav.boundingBox())!;
 await page.mouse.move(box.x+box.width*.72,box.y+box.height*.4);
 await expect.poll(async()=>page.evaluate(async()=>{
  const {glassPointerFor}=await import('/assets/glass-pointer-light.js');
  const nav=document.querySelector('.glass-nav')!;
  const light=glassPointerFor(nav);
  return light.pointerLightActive===1&&Math.abs(light.pointerLightPosition[0]-.72)<.04;
 })).toBe(true);
 expect(Number(await nav.getAttribute('data-optical-uploaded-pixels'))).toBe(before);
 const uploads=Number(await nav.getAttribute('data-optical-texture-full'));
 await page.locator('[data-theme-toggle]').click();
 await expect.poll(async()=>Number(await nav.getAttribute('data-optical-texture-full'))).toBeGreaterThan(uploads);
 await expect(page.locator('[data-theme-toggle]')).toHaveCSS('color','rgb(246, 248, 251)');
 await expect(page.locator('[data-theme-toggle]')).toBeVisible();
});

test('liquid material returns to usable CSS glass after context loss or reduced motion',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const nav=page.locator('.glass-nav');
 await expect(nav).toHaveAttribute('data-optical-material','liquid-v2');
 await page.locator('.live-optical-layer').evaluate((canvas:HTMLCanvasElement)=>canvas.getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
 await expect(nav).toHaveAttribute('data-live-optics','fallback');
 await expect(page.locator('.live-optical-layer')).toBeHidden();
 await expect(nav.locator('.brand')).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('.live-optical-layer')).toHaveCount(0);
 await expect(page.locator('[data-theme-toggle]')).toBeVisible();
});

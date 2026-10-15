import {test,expect,type Page} from '@playwright/test';

async function pixelHash(page:Page){return page.locator('[data-free-lens="0"] canvas').evaluate((canvas:HTMLCanvasElement)=>{
 const gl=canvas.getContext('webgl')!,pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let sum=0;for(let i=0;i<pixels.length;i+=29)sum=(sum+pixels[i]*(i%47+1))%2147483647;return sum;
})}

test('free glass uses three GPU lenses and changes real scene pixels while drifting',async({page})=>{
 await page.goto('/lab/');const host=page.locator('[data-liquid-atelier]');
 await expect(host).toHaveAttribute('data-gpu-lenses','3');
 await expect.poll(async()=>Number(await host.getAttribute('data-optical-frames'))).toBeGreaterThan(2);
 const before=await pixelHash(page),position=await page.locator('[data-free-lens="0"]').getAttribute('style');
 await page.waitForTimeout(500);
 expect(await pixelHash(page)).not.toBe(before);
 expect(await page.locator('[data-free-lens="0"]').getAttribute('style')).not.toBe(position);
});

test('pause freezes motion, while background and thickness still change optical pixels',async({page})=>{
 await page.goto('/lab/');const host=page.locator('[data-liquid-atelier]');
 await page.locator('[data-optical-pause]').click();await expect(host).toHaveAttribute('data-motion','paused');
 await page.waitForTimeout(100);const frames=await host.getAttribute('data-optical-frames');
 await page.waitForTimeout(250);expect(await host.getAttribute('data-optical-frames')).toBe(frames);
 const original=await pixelHash(page);
 await page.locator('[data-optical-preset="type"]').click();await expect(host).toHaveAttribute('data-scene','type');
 await expect.poll(()=>pixelHash(page)).not.toBe(original);
 const beforeDepth=await pixelHash(page);
 await page.locator('[data-lens-thickness]').fill('32');
 await expect.poll(()=>pixelHash(page)).not.toBe(beforeDepth);
 await page.locator('[data-optical-preset="photo"]').click();await expect(host).toHaveAttribute('data-scene','photo');
 await page.locator('[data-language-toggle]').click();await expect(page.locator('[data-motion-label]')).toHaveText('Play motion');
});

test('glass can be moved and rotated with keyboard and pointer',async({page,isMobile})=>{
 await page.goto('/lab/');await page.locator('[data-optical-pause]').click();
 const lens=page.locator('[data-free-lens="0"]'),grab=lens.locator('[data-lens-grab]');
 await grab.focus();await page.waitForTimeout(80);const before=await lens.getAttribute('style');
 await page.keyboard.press('ArrowRight');await expect.poll(()=>lens.getAttribute('style')).not.toBe(before);
 const moved=await lens.getAttribute('style');await page.keyboard.press('Shift+ArrowRight');await expect.poll(()=>lens.getAttribute('style')).not.toBe(moved);
 const rotated=await lens.getAttribute('style');await lens.locator('[data-lens-turn]').click();await expect.poll(()=>lens.getAttribute('style')).not.toBe(rotated);
 await grab.scrollIntoViewIfNeeded();const box=(await grab.boundingBox())!,start=(await lens.boundingBox())!;
 if(isMobile){
  const touch=await page.context().newCDPSession(page),x=box.x+box.width*.5,y=box.y+box.height*.5;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*8,y}]});await page.waitForTimeout(16)}
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 }else{
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+15,{steps:5});await page.mouse.up();
 }
 await expect.poll(async()=>(await lens.boundingBox())!.x-start.x).toBeGreaterThan(30);
});

test('offscreen glass stops drawing and reduced motion starts paused',async({page})=>{
 await page.goto('/lab/');const host=page.locator('[data-liquid-atelier]');
 await page.locator('.all-paths').scrollIntoViewIfNeeded();await expect(host).toHaveAttribute('data-in-view','false');
 await page.waitForTimeout(100);const frames=await host.getAttribute('data-optical-frames');await page.waitForTimeout(200);expect(await host.getAttribute('data-optical-frames')).toBe(frames);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/lab/');
 await expect(host).toHaveAttribute('data-motion','paused');
 await expect(host).toHaveAttribute('data-gpu-lenses','3');
 await page.waitForTimeout(100);const paused=await host.getAttribute('data-optical-frames');await page.waitForTimeout(200);expect(await host.getAttribute('data-optical-frames')).toBe(paused);
});

test('lost GPU contexts keep a usable static material and scene controls',async({page})=>{
 await page.goto('/lab/');const host=page.locator('[data-liquid-atelier]');
 await expect(host).toHaveAttribute('data-gpu-lenses','3');
 await page.locator('[data-free-lens] canvas').evaluateAll(canvases=>canvases.forEach(canvas=>(canvas as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext()));
 await expect(host).toHaveAttribute('data-gpu-lenses','0');await expect(page.locator('[data-optical-fallback]')).toBeVisible();
 await expect(page.locator('[data-optical-pause]')).toBeDisabled();
 await page.locator('[data-optical-preset="photo"]').click();await expect(host).toHaveAttribute('data-scene','photo');
});

test('optional convex optics magnify source pixels and animate a bounded droplet silhouette',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const path='/assets/optical-engine.js',module=await import(path);
  const source=document.createElement('canvas');source.width=320;source.height=200;const ctx=source.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,320,0);gradient.addColorStop(0,'#001080');gradient.addColorStop(1,'#ff1080');ctx.fillStyle=gradient;ctx.fillRect(0,0,320,200);
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true})!,render=module.setup(gl);
  const pixel=()=>{const p=new Uint8Array(4);gl.readPixels(95,100,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return p[0]};
  const options={liquid:1,reflectivity:0,strength:0,cornerRadius:100,surfaceSize:[320,200]};
  render(source,options);const plain=pixel();render(source,{...options,lensPower:.2});const convex=pixel();
  const alpha=()=>{const p=new Uint8Array(320*200*4);gl.readPixels(0,0,320,200,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p).filter((_,i)=>i%4===3)};
  render(source,{...options,shapeWobble:4,shapePhase:0});const a=alpha();render(source,{...options,shapeWobble:4,shapePhase:2});const b=alpha();
  return {plain,convex,changed:a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0),corners:[b[0],b[319],b[199*320],b[b.length-1]]};
 });
 expect(result.convex-result.plain).toBeGreaterThan(2);expect(result.changed).toBeGreaterThan(100);expect(result.corners).toEqual([0,0,0,0]);
});

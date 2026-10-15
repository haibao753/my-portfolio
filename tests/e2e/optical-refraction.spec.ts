import {test,expect} from '@playwright/test';

test('curved meniscus bends scene pixels and reflects actual source colors',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const modulePath='/assets/optical-engine.js';
  const {setup}=await import(modulePath);
  const source=document.createElement('canvas');source.width=320;source.height=72;
  const ctx=source.getContext('2d')!;
  ctx.fillStyle='#0b2948';ctx.fillRect(0,0,320,72);
  for(let x=0;x<320;x+=4){
   ctx.fillStyle=x%8===0?'#fff0a0':'#1564dc';
   ctx.fillRect(x,0,2,72);
  }
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=72;
  const gl=canvas.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  const render=setup(gl);
  const read=(x:number,y:number)=>{
   const value=new Uint8Array(4);gl.readPixels(x,71-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,value);
   return Array.from(value);
  };
  const config={liquid:1,strength:1.25,surfaceSize:[320,72] as [number,number],cornerRadius:28,bevelWidth:12};
  render(source,{...config,optical:0});const plain=[read(6,36),read(14,36),read(160,36)];
  render(source,{...config,reflectivity:0});const refracted=[read(6,36),read(14,36),read(160,36)];
  render(source,{...config,reflectivity:1});const reflected=[read(6,36),read(14,36),read(160,36),read(1,1)];
  return {plain,refracted,reflected};
 });
 expect(result.refracted[2]).toEqual(result.plain[2]);
 expect(result.refracted[0]).not.toEqual(result.plain[0]);
 expect(result.reflected[0]).not.toEqual(result.refracted[0]);
 expect(result.reflected[3][3]).toBe(0);
});

test('overscan maps external scene colors into reflected rim without moving centre',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const modulePath='/assets/optical-engine.js';
  const {setup}=await import(modulePath);
  const source=document.createElement('canvas');
  const pad=24,w=320,h=72;source.width=w+pad*2;source.height=h+pad*2;
  const ctx=source.getContext('2d')!;
  ctx.fillStyle='#14395b';ctx.fillRect(0,0,source.width,source.height);
  const target=document.createElement('canvas');target.width=w;target.height=h;
  const gl=target.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  const render=setup(gl);
  const read=(x:number,y:number)=>{
   const pixel=new Uint8Array(4);gl.readPixels(x,h-1-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return Array.from(pixel);
  };
  const opts={liquid:1,optical:1,reflectivity:1,strength:1.25,cornerRadius:28,bevelWidth:12,surfaceSize:[w,h] as [number,number],scenePadding:pad};
  render(source,opts);
  const beforeRim=read(2,36),beforeCentre=read(160,36);
  ctx.fillStyle='#fc3010';ctx.fillRect(0,pad,23,h);
  render(source,opts);
  const afterRim=read(2,36),afterCentre=read(160,36);
  return {beforeRim,afterRim,beforeCentre,afterCentre};
 });
 expect(result.afterCentre).toEqual(result.beforeCentre);
 expect(result.afterRim).not.toEqual(result.beforeRim);
});

test('navigation keeps a distant sampling margin for the thicker meniscus',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const nav=page.locator('.glass-nav');
 await expect.poll(()=>nav.getAttribute('data-optical-overscan')).toBe('72');
 const sizes=await nav.evaluate(el=>{
  const canvas=el.querySelector('.live-optical-layer') as HTMLCanvasElement;
  const source=(canvas as HTMLCanvasElement & {opticalSource:HTMLCanvasElement}).opticalSource;
  return {scene:[source.width,source.height],surface:[canvas.width,canvas.height]};
 });
 expect(sizes.scene[0]).toBeGreaterThan(sizes.surface[0]);
 expect(sizes.scene[1]).toBeGreaterThan(sizes.surface[1]);
});

test('multi-tap reflections preserve centre and alter detailed rim only',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const path='/assets/optical-engine.js';const {setup}=await import(path);
  const scene=document.createElement('canvas');scene.width=464;scene.height=216;
  const ctx=scene.getContext('2d')!;
  ctx.fillStyle='#304050';ctx.fillRect(0,0,464,216);
  for(let y=0;y<216;y+=3){ctx.fillStyle=y%6===0?'#e02030':'#10b9ee';ctx.fillRect(0,y,464,1)}
  const output=document.createElement('canvas');output.width=320;output.height=72;
  const gl=output.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  const render=setup(gl);
  const read=(x:number,y:number)=>{const p=new Uint8Array(4);gl.readPixels(x,71-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)};
  const opts={liquid:1,reflectivity:1,strength:1.25,cornerRadius:30,bevelWidth:19,
    surfaceSize:[320,72] as [number,number],scenePadding:72,reflectionReach:2.2};
  render(scene,{...opts,reflectionQuality:0});const single=[read(160,36),read(160,3),read(3,36)];
  render(scene,{...opts,reflectionQuality:1});const multi=[read(160,36),read(160,3),read(3,36)];
  return {single,multi};
 });
 expect(result.multi[0]).toEqual(result.single[0]);
 expect(result.multi.slice(1).some((p:number[],i:number)=>p.some((v:number,j:number)=>v!==result.single[i+1][j]))).toBe(true);
});

test('rounded GPU silhouette stays transparent outside all four corners',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const pixels=await page.evaluate(async()=>{
  const path='/assets/optical-engine.js';const {setup}=await import(path);
  const source=document.createElement('canvas');source.width=368;source.height=120;
  const context=source.getContext('2d')!;context.fillStyle='#ff3434';context.fillRect(0,0,368,120);
  const output=document.createElement('canvas');output.width=320;output.height=72;
  const gl=output.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  setup(gl)(source,{liquid:1,optical:1,cornerRadius:30,scenePadding:24,surfaceSize:[320,72],bevelWidth:19});
  const read=(x:number,y:number)=>{const p=new Uint8Array(4);gl.readPixels(x,71-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return p[3]};
  return {corners:[read(0,0),read(319,0),read(0,71),read(319,71)],centre:read(160,36)};
 });
 expect(pixels.corners).toEqual([0,0,0,0]);
 expect(pixels.centre).toBeGreaterThan(0);
});

test('bright CTA behind glass does not project a rectangular ghost outside curved rim',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const modulePath='/assets/optical-engine.js';const {setup}=await import(modulePath);
  const source=document.createElement('canvas');source.width=464;source.height=216;
  const ctx=source.getContext('2d')!;ctx.fillStyle='#f6f6f5';ctx.fillRect(0,0,464,216);
  ctx.fillStyle='#006ddd';ctx.fillRect(145,66,170,44);
  const target=document.createElement('canvas');target.width=320;target.height=72;
  const gl=target.getContext('webgl',{alpha:true,preserveDrawingBuffer:true})!;
  setup(gl)(source,{liquid:1,optical:1,strength:1.25,reflectivity:.78,reflectionQuality:1,
   reflectionReach:2.2,cornerRadius:30,bevelWidth:19,scenePadding:72,surfaceSize:[320,72]});
  const px=(x:number,y:number)=>{const p=new Uint8Array(4);gl.readPixels(x,71-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)};
  return {corner:px(0,0),interior:px(160,36),lower:px(160,65)};
 });
 expect(result.corner[3]).toBe(0);
 expect(result.interior[3]).toBeGreaterThan(0);
 expect(result.lower[3]).toBeGreaterThan(0);
});

test('live optical input preserves rounded blue pill rather than rectangular fill',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const nav=page.locator('.glass-nav');
 await page.evaluate(()=>{
  const main=document.querySelector('main')!;
  const pill=document.createElement('div');pill.id='optics-rounded-pill-test';
  pill.style.cssText='position:fixed;top:35px;left:100px;width:140px;height:48px;background:rgb(0, 105, 230);border-radius:24px;z-index:0';
  main.appendChild(pill);
 });
 await expect.poll(()=>nav.getAttribute('data-optical-colors')).not.toBeNull();
 const samples=await page.evaluate(async()=>{
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const header=document.querySelector('.glass-nav')!;
  const glass=header.querySelector('.live-optical-layer') as HTMLCanvasElement & {opticalSource:HTMLCanvasElement};
  const source=glass.opticalSource,ctx=source.getContext('2d')!;
  const rect=document.getElementById('optics-rounded-pill-test')!.getBoundingClientRect();
  const headerRect=header.getBoundingClientRect();
  const padding=Number(header.getAttribute('data-optical-overscan')||0);
  const x=Math.floor(rect.left-headerRect.left+padding),y=Math.floor(rect.top-headerRect.top+padding);
  const px=(dx:number,dy:number)=>Array.from(ctx.getImageData(x+dx,y+dy,1,1).data);
  return {corner:px(1,1),centre:px(70,24)};
 });
 expect(samples.centre[2]).toBeGreaterThan(samples.centre[0]+70);
 expect(samples.corner[2]).toBeLessThan(samples.centre[2]-35);
});

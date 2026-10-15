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

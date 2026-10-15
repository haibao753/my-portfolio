import {test,expect} from '@playwright/test';

test('curved meniscus bends scene pixels and reflects actual source colors',async({page})=>{
 await page.goto('/?opticalEngine=2');
 const result=await page.evaluate(async()=>{
  const {setup}=await import('/assets/optical-engine.js');
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

/* Real scene-sampled liquid optics for the detached mobile menu.
 * The menu stays interactive above the GPU material.
 * Browser composited pixels are not directly readable: this adapter reconstructs
 * visible DOM backgrounds, same-origin images and text in a padded 2D scene.
 */
import {setup} from '/assets/optical-engine.js';
const menu=document.querySelector('[data-menu-panel]');
const root=document.querySelector('main');
const params=new URLSearchParams(location.search);
if(menu&&root&&params.get('opticalEngine')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const canvas=document.createElement('canvas');
 canvas.className='menu-optical-layer';canvas.setAttribute('aria-hidden','true');
 menu.prepend(canvas);
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false});
 const scene=document.createElement('canvas');
 const ctx=scene.getContext('2d',{alpha:true});
 let render;
 try{if(gl&&ctx)render=setup(gl)}catch{menu.dataset.menuOptics='fallback'}
 if(render&&ctx){
  const pad=24;
  const paint=()=>{
   if(menu.hidden||!menu.getClientRects().length||gl.isContextLost())return;
   const rect=menu.getBoundingClientRect(),width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
   const w=width+2*pad,h=height+2*pad;
   if(scene.width!==w||scene.height!==h){scene.width=w;scene.height=h}
   ctx.clearRect(0,0,w,h);
   const left=rect.left-pad,top=rect.top-pad;
   const nodes=Array.from(root.querySelectorAll('*'));
   let count=0;
   // The input scene is painted behind the menu, not from the menu itself.
   // Intersections are checked in viewport space, so scroll does not cause lag.
   for(const el of nodes){
    if(count>400)break;
    const r=el.getBoundingClientRect();
    if(r.right<left||r.left>left+w||r.bottom<top||r.top>top+h)continue;
    const st=getComputedStyle(el);
    if(st.display==='none'||st.visibility==='hidden'||Number(st.opacity)===0)continue;
    const x=r.left-left,y=r.top-top;
    if(st.backgroundColor!=='rgba(0, 0, 0, 0)'&&st.backgroundColor!=='transparent'){
     ctx.fillStyle=st.backgroundColor;ctx.fillRect(x,y,r.width,r.height);
    }
    if(el instanceof HTMLImageElement&&el.complete&&el.naturalWidth){
     try{const u=new URL(el.currentSrc||el.src,location.href);
      if(u.origin===location.origin||u.protocol==='data:'){ctx.drawImage(el,x,y,r.width,r.height);count++}
     }catch{}
    }
    for(const node of el.childNodes){
     if(node.nodeType!==Node.TEXT_NODE||!node.textContent?.trim())continue;
     const text=node.textContent;
     const range=document.createRange();
     const fontSize=parseFloat(st.fontSize);
     if(!Number.isFinite(fontSize)||fontSize<8)continue;
     ctx.font=st.fontStyle+' '+st.fontWeight+' '+st.fontSize+' '+st.fontFamily;
     ctx.textBaseline='top';ctx.fillStyle=st.color;
     // Per-run geometry, batched and bounded; preserves real letter positions.
     const max=Math.min(text.length,180);
     for(let i=0;i<max;i++){
      range.setStart(node,i);range.setEnd(node,i+1);
      const glyph=range.getBoundingClientRect();
      if(glyph.width&&glyph.right>left&&glyph.left<left+w&&glyph.bottom>top&&glyph.top<top+h){
       ctx.fillText(text[i],glyph.left-left,glyph.top-top);
      }
     }
    }
    count++;
   }
   const radius=parseFloat(getComputedStyle(menu).borderTopLeftRadius)||32;
   try{
    render(scene,{liquid:1,optical:1,reflectivity:.86,strength:1.35,cornerRadius:radius,
     bevelWidth:15,rimOnly:1,surfaceSize:[width,height],scenePadding:pad});
    menu.dataset.menuOptics='active';menu.dataset.menuOpticalSamples=String(count);
   }catch{menu.dataset.menuOptics='fallback'}
  };
  let scheduled=false;
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint()})}};
  const state=new MutationObserver(schedule);
  state.observe(menu,{attributes:true,attributeFilter:['hidden','class','style','data-closing']});
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  new MutationObserver(schedule).observe(root,{subtree:true,childList:true,characterData:true});
  const lost=()=>{menu.dataset.menuOptics='fallback';canvas.hidden=true};
  canvas.addEventListener('webglcontextlost',lost);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches)lost()});
  schedule();
 }
}

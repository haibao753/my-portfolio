/* Experimental live homepage-to-GPU adapter.
 * DOM text and same-origin images are re-rasterized at browser-computed positions.
 * This is NOT browser compositor capture and is deliberately opt-in.
 */
import {setup} from '/assets/optical-engine.js';
const params=new URLSearchParams(location.search);
if(params.get('opticalEngine')==='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const nav=document.querySelector('.glass-nav'),root=document.querySelector('main');
 if(nav&&root){
  const glass=document.createElement('canvas');glass.className='live-optical-layer';glass.setAttribute('aria-hidden','true');
  nav.prepend(glass);
  const gl=glass.getContext('webgl',{alpha:true,preserveDrawingBuffer:true,antialias:false});
  const source=document.createElement('canvas'),ctx=source.getContext('2d',{alpha:false});
  let shader=null;
  if(gl&&ctx){try{shader=setup(gl)}catch(err){nav.dataset.opticalError='shader'}}
  if(shader){
   nav.dataset.liveOptics='on';
   const refresh=()=>{
    const nr=nav.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(nr.width)),h=Math.max(1,Math.round(nr.height));
    if(glass.width!==Math.round(w*dpr)||glass.height!==Math.round(h*dpr)){glass.width=Math.round(w*dpr);glass.height=Math.round(h*dpr)}
    source.width=w;source.height=h;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    let elements=0;
    // Only objects crossing the navbar geometry are relevant; draw in document order.
    for(const el of root.querySelectorAll('*')){
     if(elements>240)break;
     const r=el.getBoundingClientRect();
     if(r.right<nr.left||r.left>nr.right||r.bottom<nr.top-18||r.top>nr.bottom+18)continue;
     const style=getComputedStyle(el);
     if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
     if(el instanceof HTMLImageElement&&el.complete&&el.naturalWidth){
      const url=new URL(el.currentSrc||el.src,location.href);
      if(url.origin===location.origin||url.protocol==='data:'){
       try{ctx.drawImage(el,r.left-nr.left,r.top-nr.top,r.width,r.height);elements++}catch{}
      }
     }
     for(const node of el.childNodes){
      if(node.nodeType!==Node.TEXT_NODE||!node.textContent?.trim())continue;
      const text=node.textContent;const fontSize=parseFloat(style.fontSize);
      if(!Number.isFinite(fontSize)||fontSize<8)continue;
      ctx.font=style.fontStyle+' '+style.fontWeight+' '+fontSize+'px '+style.fontFamily;
      ctx.fillStyle=style.color;ctx.textBaseline='top';
      const range=document.createRange();
      const len=Math.min(text.length,240);
      for(let i=0;i<len;i++){
       range.setStart(node,i);range.setEnd(node,i+1);
       const g=range.getBoundingClientRect();
       if(g.width<=0||g.bottom<nr.top||g.top>nr.bottom)continue;
       ctx.fillText(text.slice(i,i+1),g.left-nr.left,g.top-nr.top);
      }
      elements++;
     }
    }
    try{shader(source,{strength:2,optical:1,reflectivity:.35});nav.dataset.opticalSamples=String(elements)}catch{nav.dataset.opticalError='texture'}
   };
   let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}};
   addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
   document.fonts?.ready.then(schedule);
   root.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedule));
   schedule();
  }
 }
}

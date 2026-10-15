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
  // Expose the real input surface to browser pixel tests without rendering it onscreen.
  glass.opticalSource=source;
  let shader=null;
  if(gl&&ctx){try{shader=setup(gl)}catch(err){nav.dataset.opticalError='shader'}}
  if(shader){
   nav.dataset.liveOptics='on';
   const vectorCache=new WeakMap();
   let candidates=Array.from(root.querySelectorAll('*'));
   const observer=new MutationObserver(()=>{candidates=Array.from(root.querySelectorAll('*'));schedule()});
   observer.observe(root,{childList:true,subtree:true});
   const refresh=()=>{
    const frameStart=performance.now();
    nav.dataset.opticalRefreshes=String(Number(nav.dataset.opticalRefreshes||0)+1);
    const nr=nav.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(nr.width)),h=Math.max(1,Math.round(nr.height));
    if(glass.width!==Math.round(w*dpr)||glass.height!==Math.round(h*dpr)){glass.width=Math.round(w*dpr);glass.height=Math.round(h*dpr)}
    if(source.width!==w||source.height!==h){source.width=w;source.height=h;}
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    let elements=0,images=0,colors=0,gradients=0,vectors=0;
    const offsetX=nr.left,offsetY=nr.top;
    const startScrollY=window.scrollY;
    const nearby=[];
    // Only objects crossing the navbar geometry are relevant; draw in document order.
    for(const el of candidates){
     const r=el.getBoundingClientRect();
     if(r.right<nr.left||r.left>nr.right||r.bottom<nr.top-18||r.top>nr.bottom+18)continue;
     const style=getComputedStyle(el);
     if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
     nearby.push({el,r,style});
    }
    nav.dataset.opticalNearby=String(nearby.length);
    // Paint CSS color surfaces beneath media and text rather than painting over them.
    for(const {el,r,style} of nearby){
     if(el===root)continue;
     const color=style.backgroundColor;
     if(color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'){
      ctx.fillStyle=color;ctx.fillRect(r.left-nr.left,r.top-nr.top,r.width,r.height);colors++;
     }
    }
    for(const {el,r,style} of nearby){
     const bg=style.backgroundImage;
     const m=bg&&bg.match(/^linear-gradient\(\s*(to right|to left|to bottom|to top)\s*,\s*(#[0-9a-f]{3,8}|rgb\([^)]*\))\s*,\s*(#[0-9a-f]{3,8}|rgb\([^)]*\))\s*\)$/i);
     if(m){
      const gradient=ctx.createLinearGradient(r.left-nr.left,r.top-nr.top,
       r.left-nr.left+(m[1]==='to right'?r.width:m[1]==='to left'?-r.width:0),
       r.top-nr.top+(m[1]==='to bottom'?r.height:m[1]==='to top'?-r.height:0));
      gradient.addColorStop(0,m[2]);gradient.addColorStop(1,m[3]);ctx.fillStyle=gradient;
      ctx.fillRect(r.left-nr.left,r.top-nr.top,r.width,r.height);gradients++;
     }
     if(el instanceof SVGSVGElement){
      let cached=vectorCache.get(el);
      const signature=el.outerHTML;
      if(!cached||cached.signature!==signature){
       const image=new Image();
       const blob=new Blob([new XMLSerializer().serializeToString(el)],{type:'image/svg+xml'});
       const url=URL.createObjectURL(blob);
       cached={image,signature};
       vectorCache.set(el,cached);
       image.onload=()=>{URL.revokeObjectURL(url);schedule()};
       image.onerror=()=>URL.revokeObjectURL(url);
       image.src=url;
      }
      if(cached.image.complete&&cached.image.naturalWidth){
       try{ctx.drawImage(cached.image,r.left-nr.left,r.top-nr.top,r.width,r.height);vectors++}catch{}
      }
     }
     if(elements>240)break;
     if(el instanceof HTMLImageElement&&el.complete&&el.naturalWidth){
      const url=new URL(el.currentSrc||el.src,location.href);
      if(url.origin===location.origin||url.protocol==='data:'){
       try{
        const fit=style.objectFit,iw=el.naturalWidth,ih=el.naturalHeight;
        if(fit==='cover'||fit==='contain'){
         const ratio=fit==='cover'?Math.max(r.width/iw,r.height/ih):Math.min(r.width/iw,r.height/ih);
         const dw=iw*ratio,dh=ih*ratio;
         const objectPos=style.objectPosition.split(' ');
         const percent=(value)=>value?.endsWith('%')?parseFloat(value)/100:.5;
         const px=percent(objectPos[0]),py=percent(objectPos[1]);
         ctx.save();ctx.beginPath();ctx.rect(r.left-nr.left,r.top-nr.top,r.width,r.height);ctx.clip();
         ctx.drawImage(el,r.left-nr.left+(r.width-dw)*px,r.top-nr.top+(r.height-dh)*py,dw,dh);ctx.restore();
        }else{ctx.drawImage(el,r.left-nr.left,r.top-nr.top,r.width,r.height)}
        elements++;images++;
       }catch{}
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
    if(Math.abs(window.scrollY-startScrollY)>2){schedule();return;}
    nav.dataset.opticalAlignmentX=String(offsetX.toFixed(2));nav.dataset.opticalAlignmentY=String(offsetY.toFixed(2));
    try{shader(source,{strength:2,optical:1,reflectivity:.35});nav.dataset.opticalSamples=String(elements);nav.dataset.opticalImages=String(images);nav.dataset.opticalColors=String(colors);nav.dataset.opticalGradients=String(gradients);nav.dataset.opticalVectors=String(vectors);nav.dataset.opticalError='';nav.dataset.opticalFrameMs=(performance.now()-frameStart).toFixed(1)}catch{nav.dataset.opticalError='texture'}
   };
   let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}};
   addEventListener('scroll',schedule,{passive:true});
   addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});addEventListener('resize',schedule,{passive:true});
   document.fonts?.ready.then(schedule);
   root.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedule));
   schedule();
  }
 }
}

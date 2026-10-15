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
  const source=document.createElement('canvas'),ctx=source.getContext('2d',{alpha:true});
  // Expose the real input surface to browser pixel tests without rendering it onscreen.
  glass.opticalSource=source;
  let shader=null;
  if(gl&&ctx){try{shader=setup(gl)}catch(err){nav.dataset.opticalError='shader'}}
  if(shader){
   nav.dataset.liveOptics='on';
   const vectorCache=new WeakMap();
   let previousPixels=null,previousWidth=0,previousHeight=0;
   let lastDiffComparedPixels=0;
   const changedRect=()=>{
    const width=source.width,height=source.height;
    const pixels=ctx.getImageData(0,0,width,height).data;
    lastDiffComparedPixels=0;
    if(!previousPixels||previousWidth!==width||previousHeight!==height){
     previousPixels=new Uint8Array(pixels);previousWidth=width;previousHeight=height;
     return null;
    }
    let left=width,right=-1,top=height,bottom=-1;
    // Exact RGBA comparison as packed 32-bit pixels, 1 comparison rather
    // than 4 per pixel. No probabilistic hashing or sampled-pixel shortcuts.
    const current32=new Uint32Array(pixels.buffer,pixels.byteOffset,width*height);
    const previous32=new Uint32Array(previousPixels.buffer,previousPixels.byteOffset,width*height);
    for(let y=0;y<height;y++){
     const start=y*width;
     for(let x=0;x<width;x++){
      lastDiffComparedPixels++;
      if(current32[start+x]!==previous32[start+x]){
       if(x<left)left=x;if(x>right)right=x;
       if(y<top)top=y;if(y>bottom)bottom=y;
      }
     }
    }
    previousPixels.set(pixels);
    if(right<left)return {unchanged:true};
    const rect={x:left,y:top,width:right-left+1,height:bottom-top+1};
    return rect.width*rect.height>=width*height*.7?null:{dirtyRect:rect};
   };
   let candidates=Array.from(root.querySelectorAll('*'));
   let lastPaintScrollX=NaN,lastPaintScrollY=NaN,lastPaintEpoch=-1;
   let lastPaintWidth=0,lastPaintHeight=0;
   let skippedRasterFrames=0;
   const glyphCache=new WeakMap();
   let glyphMeasurements=0,cacheHits=0;
   const fixedPosition=(el)=>{for(let p=el;p&&p!==root;p=p.parentElement){if(getComputedStyle(p).position==='fixed')return true}return false};
   const measureGlyphs=(node,el,style)=>{
    const text=node.textContent||'',range=document.createRange(),glyphs=[];
    const fixed=fixedPosition(el),sx=window.scrollX,sy=window.scrollY;
    for(let i=0;i<Math.min(text.length,240);i++){
     range.setStart(node,i);range.setEnd(node,i+1);
     const r=range.getBoundingClientRect();
     if(r.width)glyphs.push({char:text[i],x:r.left+(fixed?0:sx),y:r.top+(fixed?0:sy),w:r.width,h:r.height});
    }
    glyphMeasurements+=Math.min(text.length,240);
    const entry={glyphs,fixed,font:style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily,color:style.color,text};
    glyphCache.set(node,entry);
    return entry;
   };
   let layoutEpoch=0,measuredEpoch=-1;
   const invalidateLayout=()=>{layoutEpoch++;schedule()};
   const geometryCache=new WeakMap();
   // Layout bounds remain stable while scrolling; remeasure on layout invalidation only.
   let geometryReads=0,geometryCacheHits=0;
   const dynamicCache=new WeakMap();
   const readBounds=(el)=>{
    // Sticky/animated/transform-positioned elements cannot be inferred from scroll offsets.
    let dynamicEntry=dynamicCache.get(el);
    if(!dynamicEntry||dynamicEntry.epoch!==layoutEpoch){
     let dynamic=false;
     for(let p=el;p&&p!==root;p=p.parentElement){
      const st=getComputedStyle(p);
      if(st.position==='sticky'||st.transform!=='none'||st.animationName!=='none'){dynamic=true;break}
     }
     dynamicEntry={epoch:layoutEpoch,dynamic};dynamicCache.set(el,dynamicEntry);
    }
    const dynamic=dynamicEntry.dynamic;
    if(dynamic){geometryReads++;return el.getBoundingClientRect()}
    const cached=geometryCache.get(el);
    if(cached&&cached.epoch===layoutEpoch){
     geometryCacheHits++;
     return {left:cached.left-(cached.fixed?0:scrollX),right:cached.right-(cached.fixed?0:scrollX),
       top:cached.top-(cached.fixed?0:scrollY),bottom:cached.bottom-(cached.fixed?0:scrollY),
       width:cached.width,height:cached.height};
    }
    const r=el.getBoundingClientRect(),fixed=fixedPosition(el);
    geometryReads++;
    geometryCache.set(el,{epoch:layoutEpoch,fixed,
      left:r.left+(fixed?0:scrollX),right:r.right+(fixed?0:scrollX),
      top:r.top+(fixed?0:scrollY),bottom:r.bottom+(fixed?0:scrollY),
      width:r.width,height:r.height});
    return r;
   };
   const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))candidates=Array.from(root.querySelectorAll('*'));invalidateLayout()});
   observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','src','srcset','width','height','hidden']});
   const refresh=()=>{
    const frameStart=performance.now();
    nav.dataset.opticalRefreshes=String(Number(nav.dataset.opticalRefreshes||0)+1);
    const nr=nav.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(nr.width)),h=Math.max(1,Math.round(nr.height));
    if(glass.width!==Math.round(w*dpr)||glass.height!==Math.round(h*dpr)){glass.width=Math.round(w*dpr);glass.height=Math.round(h*dpr)}
    if(source.width!==w||source.height!==h){source.width=w;source.height=h;}
    const unchangedLayout=lastPaintEpoch===layoutEpoch&&lastPaintWidth===w&&lastPaintHeight===h;
    const sameScroll=lastPaintScrollX===window.scrollX&&lastPaintScrollY===window.scrollY;
    if(unchangedLayout&&sameScroll){
     skippedRasterFrames++;
     nav.dataset.opticalRasterSkipped=String(skippedRasterFrames);
     nav.dataset.opticalFrameMs=(performance.now()-frameStart).toFixed(1);
     return;
    }
    ctx.clearRect(0,0,w,h);
    let elements=0,images=0,colors=0,gradients=0,vectors=0;
    const offsetX=nr.left,offsetY=nr.top;
    const startScrollY=window.scrollY;
    const nearby=[];
    geometryReads=0;geometryCacheHits=0;
    const needsMeasurement=measuredEpoch!==layoutEpoch;
    if(needsMeasurement){glyphMeasurements=0;cacheHits=0;}
    // Only objects crossing the navbar geometry are relevant; draw in document order.
    for(const el of candidates){
     const r=readBounds(el);
     if(r.right<nr.left||r.left>nr.right||r.bottom<nr.top-18||r.top>nr.bottom+18)continue;
     const style=getComputedStyle(el);
     if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
     nearby.push({el,r,style});
    }
    nav.dataset.opticalNearby=String(nearby.length);
    nav.dataset.opticalGeometryReads=String(geometryReads);
    nav.dataset.opticalGeometryCacheHits=String(geometryCacheHits);
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
      const x=r.left-nr.left,y=r.top-nr.top;
      const gradient=ctx.createLinearGradient(
       m[1]==='to left'?x+r.width:x,
       m[1]==='to top'?y+r.height:y,
       m[1]==='to left'?x:m[1]==='to right'?x+r.width:x,
       m[1]==='to top'?y:m[1]==='to bottom'?y+r.height:y);
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
      let entry=glyphCache.get(node);
      const font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      if(!entry||needsMeasurement||entry.text!==text||entry.font!==font||entry.color!==style.color){
       entry=measureGlyphs(node,el,style);
      }else{cacheHits++}
      ctx.font=entry.font;ctx.fillStyle=entry.color;
      for(const g of entry.glyphs){
       const x=g.x-(entry.fixed?0:window.scrollX)-nr.left;
       const y=g.y-(entry.fixed?0:window.scrollY)-nr.top;
       if(y+g.h<0||y>nr.height)continue;
       ctx.fillText(g.char,x,y);
      }
      elements++;
     }
    }
    if(Math.abs(window.scrollY-startScrollY)>2){schedule();return;}
    measuredEpoch=layoutEpoch;
    lastPaintEpoch=layoutEpoch;lastPaintWidth=w;lastPaintHeight=h;
    lastPaintScrollX=window.scrollX;lastPaintScrollY=window.scrollY;
    nav.dataset.opticalRasterSkipped=String(skippedRasterFrames);
    nav.dataset.opticalGlyphMeasures=String(glyphMeasurements);nav.dataset.opticalGlyphCacheHits=String(cacheHits);
    nav.dataset.opticalAlignmentX=String(offsetX.toFixed(2));nav.dataset.opticalAlignmentY=String(offsetY.toFixed(2));
    try{const delta=changedRect();shader(source,{strength:2,optical:1,reflectivity:.35,...(delta||{})});
    nav.dataset.opticalDiffCompared=String(lastDiffComparedPixels);
    nav.dataset.opticalTextureFull=String(shader.stats.fullUploads);
    nav.dataset.opticalTexturePartial=String(shader.stats.partialUploads);
    nav.dataset.opticalTextureSkipped=String(shader.stats.skippedUploads);
    nav.dataset.opticalUploadedPixels=String(shader.stats.uploadedPixels);
    nav.dataset.opticalSamples=String(elements);nav.dataset.opticalImages=String(images);nav.dataset.opticalColors=String(colors);nav.dataset.opticalGradients=String(gradients);nav.dataset.opticalVectors=String(vectors);nav.dataset.opticalError='';nav.dataset.opticalFrameMs=(performance.now()-frameStart).toFixed(1)}catch{nav.dataset.opticalError='texture'}
   };
   let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}};
   addEventListener('scroll',schedule,{passive:true});
   addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});addEventListener('resize',invalidateLayout,{passive:true});
   document.fonts?.ready.then(invalidateLayout);
   root.querySelectorAll('img').forEach(img=>img.addEventListener('load',invalidateLayout));
   // Content and font changes invalidate both text positions and element geometry.
   const resizeObserver=new ResizeObserver(()=>invalidateLayout());
   resizeObserver.observe(root);
   // Width changes of the nav can move text even if the main element is unchanged.
   resizeObserver.observe(nav);
   schedule();
  }
 }
}

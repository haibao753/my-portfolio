/* Live homepage-to-GPU adapter.
 * DOM text and same-origin images are re-rasterized at browser-computed positions.
 * This is NOT browser compositor capture.
 */
import {setup} from '/assets/optical-engine.js';
const params=new URLSearchParams(location.search);
const requested=params.get('opticalEngine');
const mode=requested===null?'2':requested;
const liquid=mode==='2';
// Long-range rim reflections must have actual source pixels beyond the silhouette.
const overscan=liquid?72:0;
// Keep ordinary navigation URLs clean; preserve explicit comparison/disable links.
if(['0','1','2'].includes(requested))document.querySelectorAll('a[href]').forEach(link=>{
 const target=new URL(link.href,location.href);
 if(target.origin===location.origin&&['/','/brief/'].includes(target.pathname)){
  target.searchParams.set('opticalEngine',requested);link.href=target.href;
 }
});
if(['1','2'].includes(mode)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
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
   nav.dataset.opticalMaterial=liquid?'liquid-v2':'classic';
   let lightDirection=[-.55,.85];
   const inkTargets=Array.from(nav.querySelectorAll('.desktop-links a,.brand,.controls button'));
   const updateInk=()=>{
    const nr=nav.getBoundingClientRect();
    const background=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.slice(0,3).map(Number)||[247,247,245];
    for(const target of inkTargets){
     // The brand link fills a grid column; sample beneath the actual mark,
     // otherwise a dark photograph beside it can turn a white-background logo white.
     const sampleTarget=target.matches('.brand')?target.querySelector('span'):target;
     const r=sampleTarget.getBoundingClientRect();if(!r.width||!r.height)continue;
     const x=Math.max(0,Math.floor(r.left-nr.left)),y=Math.max(0,Math.floor(r.top-nr.top));
     const w=Math.min(source.width-x,Math.ceil(r.width)),h=Math.min(source.height-y,Math.ceil(r.height));
     if(w<1||h<1)continue;
     const pixels=ctx.getImageData(x,y,w,h).data;
     let luminance=0;
     for(const sy of [.25,.5,.75])for(const sx of [.2,.5,.8]){
      const i=(Math.min(h-1,Math.floor(h*sy))*w+Math.min(w-1,Math.floor(w*sx)))*4,a=pixels[i+3]/255;
      const linear=[0,1,2].map(channel=>{const value=(pixels[i+channel]*a+background[channel]*(1-a))/255;return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4)});
      luminance+=linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
     }
     luminance/=9;
     const dark=(luminance+.05)/.064>(.94+.05)/(luminance+.05);
     target.style.setProperty('--glass-ink',dark?'#15202d':'#f6f8fb');
     target.style.setProperty('--glass-ink-shadow',dark?'0 1px 2px rgba(255,255,255,.62)':'0 1px 3px rgba(0,0,0,.62)');
    }
   };
   const draw=(changes={})=>shader(source,{strength:liquid?1.25:2,optical:1,reflectivity:liquid?.78:.35,liquid:liquid?1:0,bevelWidth:liquid?19:12,reflectionReach:liquid?2.2:1,reflectionQuality:liquid?1:0,studioLight:liquid?.48:0,surfaceSize:[source.width-2*overscan,source.height-2*overscan],scenePadding:overscan,cornerRadius:parseFloat(getComputedStyle(nav).borderTopLeftRadius)||26,lightDirection,...changes});
   const fallback=()=>{nav.dataset.liveOptics='fallback';delete nav.dataset.opticalMaterial;glass.hidden=true;};
   glass.addEventListener('webglcontextlost',fallback);
   matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches)fallback()});
   matchMedia('(prefers-reduced-transparency: reduce)').addEventListener('change',e=>{if(e.matches)fallback()});
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
   let pendingRegions=[],forceFull=true,fullFallbacks=0,partialFrames=0;
   const oldBounds=new WeakMap();
   const stage=document.createElement('canvas');
   const stageCtx=stage.getContext('2d');
   const rectUnion=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.x+a.width,b.x+b.width)-Math.min(a.x,b.x),height:Math.max(a.y+a.height,b.y+b.height)-Math.min(a.y,b.y)});
   const regionFor=(r,nr,pad=8)=>({x:Math.floor(r.left-nr.left-pad),y:Math.floor(r.top-nr.top-pad),width:Math.ceil(r.width+2*pad),height:Math.ceil(r.height+2*pad)});
   const clampRegion=(r,w,h)=>{const x=Math.max(0,r.x),y=Math.max(0,r.y);return {x,y,width:Math.max(0,Math.min(w,r.x+r.width)-x),height:Math.max(0,Math.min(h,r.y+r.height)-y)}};
   const markElement=(el)=>{
    if(!(el instanceof Element))return;
    const nr=nav.getBoundingClientRect(),old=oldBounds.get(el),now=el.getBoundingClientRect();
    let rect=regionFor(now,nr);
    if(old)rect=rectUnion(rect,regionFor(old,nr));
    pendingRegions.push(rect);
    oldBounds.set(el,{left:now.left,top:now.top,width:now.width,height:now.height});
   };
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
   const observer=new MutationObserver(records=>{
    const structural=records.some(record=>record.type==='childList');
    if(structural){candidates=Array.from(root.querySelectorAll('*'));forceFull=true}
    else for(const record of records)markElement(record.target instanceof Element?record.target:record.target.parentElement);
    invalidateLayout();
   });
   observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','src','srcset','width','height','hidden']});
   const refresh=()=>{
    if(gl.isContextLost()||glass.hidden)return;
    const frameStart=performance.now();
    nav.dataset.opticalRefreshes=String(Number(nav.dataset.opticalRefreshes||0)+1);
    const navBounds=nav.getBoundingClientRect();
    // Quantize the entire padded sampling frame once. Use its origin and
    // dimensions consistently for rasterization, damage and GPU sampling.
    const sampleLeft=Math.floor(navBounds.left)-overscan;
    const sampleTop=Math.floor(navBounds.top)-overscan;
    const sampleRight=Math.ceil(navBounds.right)+overscan;
    const sampleBottom=Math.ceil(navBounds.bottom)+overscan;
    const nr={left:sampleLeft,top:sampleTop,right:sampleRight,bottom:sampleBottom,width:sampleRight-sampleLeft,height:sampleBottom-sampleTop};
    const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,nr.width),h=Math.max(1,nr.height);
    if(glass.width!==Math.round((w-2*overscan)*dpr)||glass.height!==Math.round((h-2*overscan)*dpr)){glass.width=Math.round((w-2*overscan)*dpr);glass.height=Math.round((h-2*overscan)*dpr)}
    if(source.width!==w||source.height!==h){source.width=w;source.height=h;}
    const unchangedLayout=lastPaintEpoch===layoutEpoch&&lastPaintWidth===w&&lastPaintHeight===h;
    const sameScroll=lastPaintScrollX===window.scrollX&&lastPaintScrollY===window.scrollY;
    if(unchangedLayout&&sameScroll){
     if(liquid){draw({unchanged:true});nav.dataset.opticalTextureSkipped=String(shader.stats.skippedUploads);}
     skippedRasterFrames++;
     nav.dataset.opticalRasterSkipped=String(skippedRasterFrames);
     nav.dataset.opticalFrameMs=(performance.now()-frameStart).toFixed(1);
     return;
    }
    const scrollDX=lastPaintScrollX-window.scrollX,scrollDY=lastPaintScrollY-window.scrollY;
    const canShift=Number.isInteger(scrollDX)&&Number.isInteger(scrollDY)&&scrollDX===0&&Math.abs(scrollDY)>0&&Math.abs(scrollDY)<h
     &&lastPaintEpoch===layoutEpoch&&!forceFull&&!pendingRegions.length&&lastPaintWidth===w&&lastPaintHeight===h;
    let region=null,partial=false;
    if(canShift){
     // Exact translation is safe only when no fixed/sticky/animated contributors intersect.
     const unsafe=candidates.some(el=>{const r=readBounds(el);if(r.bottom<nr.top||r.top>nr.bottom||r.right<nr.left||r.left>nr.right)return false;
      return fixedPosition(el)||getComputedStyle(el).position==='sticky'||getComputedStyle(el).animationName!=='none'||getComputedStyle(el).transform!=='none';});
     if(!unsafe){
      stage.width=w;stage.height=h;stageCtx.clearRect(0,0,w,h);stageCtx.drawImage(source,0,0);
      ctx.clearRect(0,0,w,h);ctx.drawImage(stage,scrollDX,scrollDY);
      region=scrollDY<0?{x:0,y:h+scrollDY,width:w,height:-scrollDY}:{x:0,y:0,width:w,height:scrollDY};
      partial=true;
     }
    }
    if(!partial&&pendingRegions.length&&!forceFull&&lastPaintWidth===w&&lastPaintHeight===h&&sameScroll){
     region=clampRegion(pendingRegions.reduce(rectUnion),w,h);
     partial=region.width*region.height<w*h*.65;
    }
    if(!partial){ctx.clearRect(0,0,w,h);region=null}
    else{ctx.save();ctx.beginPath();ctx.rect(region.x,region.y,region.width,region.height);ctx.clip();ctx.clearRect(region.x,region.y,region.width,region.height)}
    if(partial)partialFrames++;else fullFallbacks++;
    nav.dataset.opticalDamageMode=partial?'partial':'full';
    nav.dataset.opticalDamagePixels=String(region?region.width*region.height:w*h);
    nav.dataset.opticalDamagePartialFrames=String(partialFrames);
    nav.dataset.opticalDamageFullFallbacks=String(fullFallbacks);
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
    for(const {el,r} of nearby)oldBounds.set(el,{left:r.left,top:r.top,width:r.width,height:r.height});
    nav.dataset.opticalGeometryReads=String(geometryReads);
    nav.dataset.opticalGeometryCacheHits=String(geometryCacheHits);
    // Respect the source element's own rounded geometry, not just the glass.
    // A rectangular fillRect was converting pill-shaped CTAs into square ghosts.
    const roundedPath=(r,style)=>{
     const lengths=[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomRightRadius,style.borderBottomLeftRadius];
     const radii=lengths.map(v=>Math.max(0,Math.min(parseFloat(v)||0,r.width/2,r.height/2)));
     const x=r.left-nr.left,y=r.top-nr.top,w=r.width,h=r.height;
     ctx.beginPath();
     ctx.moveTo(x+radii[0],y);ctx.lineTo(x+w-radii[1],y);
     ctx.quadraticCurveTo(x+w,y,x+w,y+radii[1]);
     ctx.lineTo(x+w,y+h-radii[2]);ctx.quadraticCurveTo(x+w,y+h,x+w-radii[2],y+h);
     ctx.lineTo(x+radii[3],y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-radii[3]);
     ctx.lineTo(x,y+radii[0]);ctx.quadraticCurveTo(x,y,x+radii[0],y);
     ctx.closePath();
    };
    // Paint CSS color surfaces beneath media and text rather than painting over them.
    for(const {el,r,style} of nearby){
     if(el===root)continue;
     const color=style.backgroundColor;
     if(color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'){
      ctx.fillStyle=color;roundedPath(r,style);ctx.fill();colors++;
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
       // Decoding changes the raster source even when DOM and scroll are stable.
       // Invalidate the unchanged-frame shortcut so the SVG actually gets drawn.
       image.onload=()=>{URL.revokeObjectURL(url);forceFull=true;invalidateLayout()};
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
    if(partial)ctx.restore();
    if(liquid)updateInk();
    if(Math.abs(window.scrollY-startScrollY)>2){forceFull=true;schedule();return;}
    // A scrolled frame translates existing pixels: upload the whole shifted texture
    // until a GPU-side texture copy/scroll primitive is available.
    const uploadRegion=partial?region:null;
    const gpuShift=partial&&canShift?{x:0,y:scrollDY}:null;
    forceFull=false;pendingRegions=[];
    measuredEpoch=layoutEpoch;
    lastPaintEpoch=layoutEpoch;lastPaintWidth=w;lastPaintHeight=h;
    lastPaintScrollX=window.scrollX;lastPaintScrollY=window.scrollY;
    nav.dataset.opticalRasterSkipped=String(skippedRasterFrames);
    nav.dataset.opticalGlyphMeasures=String(glyphMeasurements);nav.dataset.opticalGlyphCacheHits=String(cacheHits);
    nav.dataset.opticalAlignmentX=String((offsetX+overscan).toFixed(2));nav.dataset.opticalAlignmentY=String((offsetY+overscan).toFixed(2));
    nav.dataset.opticalOverscan=String(overscan);
    try{const delta=uploadRegion?{dirtyRect:uploadRegion}:changedRect();draw({...delta,...(gpuShift?{dirtyRect:uploadRegion,scrollShift:gpuShift}:{})});
    nav.dataset.opticalDiffCompared=String(lastDiffComparedPixels);
    nav.dataset.opticalGpuScrolls=String(shader.stats.gpuScrolls);
    nav.dataset.opticalTextureFull=String(shader.stats.fullUploads);
    nav.dataset.opticalTexturePartial=String(shader.stats.partialUploads);
    nav.dataset.opticalTextureSkipped=String(shader.stats.skippedUploads);
    nav.dataset.opticalUploadedPixels=String(shader.stats.uploadedPixels);
    nav.dataset.opticalSamples=String(elements);nav.dataset.opticalImages=String(images);nav.dataset.opticalColors=String(colors);nav.dataset.opticalGradients=String(gradients);nav.dataset.opticalVectors=String(vectors);nav.dataset.opticalError='';nav.dataset.opticalFrameMs=(performance.now()-frameStart).toFixed(1)}catch{nav.dataset.opticalError='texture'}
   };
   let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}};
   if(liquid)nav.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    const rect=nav.getBoundingClientRect();
    const x=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));
    const y=Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));
    lightDirection=[(x-.5)*1.5,1.-y*1.5];
    nav.style.setProperty('--glass-light-x',`${(x*100).toFixed(1)}%`);
    schedule();
   },{passive:true});
   if(liquid)nav.addEventListener('pointerleave',()=>{lightDirection=[-.55,.85];nav.style.removeProperty('--glass-light-x');schedule()},{passive:true});
   new MutationObserver(()=>{forceFull=true;invalidateLayout()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-theme-transition','lang']});
   addEventListener('scroll',schedule,{passive:true});
   addEventListener('visibilitychange',()=>{if(!document.hidden){forceFull=true;schedule()}});
   addEventListener('resize',()=>{forceFull=true;invalidateLayout()},{passive:true});
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

import {setup} from '/assets/optical-engine.js';

const host=document.querySelector('[data-liquid-atelier]');
if(host){
 const stage=host.querySelector('[data-optical-stage]'),backdrop=host.querySelector('[data-optical-backdrop]');
 const background=backdrop.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const small=matchMedia('(max-width:760px)');
 const pause=host.querySelector('[data-optical-pause]'),depth=host.querySelector('[data-lens-thickness]');
 const photos=Array.from(host.querySelectorAll('[data-plate-photo]'));
 let preset='spectrum',playing=!reduce.matches,visible=false,frame=0,last=0,elapsed=0,revision=0,width=1,height=1,remix=0,pointer=null;
 const pad=72;
 const lenses=Array.from(host.querySelectorAll('[data-free-lens]')).map((element,index)=>{
  const canvas=element.querySelector('canvas'),source=document.createElement('canvas'),context=source.getContext('2d');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true});
  let render=null;try{if(gl)render=setup(gl)}catch{}
  const lens={element,canvas,source,context,gl,render,index,anchor:[0,0],w:1,h:1,radius:1,angle:0,rotation:0,x:0,y:0,previous:null,phase:index*2.1,held:null};
  if(!render)element.dataset.lensFallback='true';
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lens.render=null;element.dataset.lensFallback='true';canvas.hidden=true;updateState()});
  canvas.addEventListener('webglcontextrestored',()=>{try{lens.render=setup(gl);lens.previous=null;canvas.hidden=false;delete element.dataset.lensFallback;updateState();queue()}catch{}});
  return lens;
 });
 const en=()=>document.documentElement.lang==='en';
 function updateState(){
  if(!lenses.some(l=>l.render))playing=false;
  host.dataset.motion=playing?'playing':'paused';
  host.dataset.gpuLenses=String(lenses.filter(l=>l.render).length);
  pause.setAttribute('aria-pressed',String(!playing));
  pause.disabled=!lenses.some(l=>l.render);
  pause.querySelector('[data-motion-label]').textContent=en()?(playing?'Pause motion':'Play motion'):(playing?'暂停动画':'播放动画');
  host.querySelector('[data-optical-fallback]').hidden=lenses.some(l=>l.render);
  lenses.forEach((lens,i)=>{
   lens.element.querySelector('[data-lens-grab]').setAttribute('aria-label',en()?`Move glass ${i+1}; arrow keys move, Shift left/right rotates`:`移动玻璃 ${i+1}；方向键移动，Shift 加左右键旋转`);
   lens.element.querySelector('[data-lens-turn]').setAttribute('aria-label',en()?`Rotate glass ${i+1}`:`旋转玻璃 ${i+1}`);
  });
 }
 function cover(image,x,y,w,h){
  if(!image.complete||!image.naturalWidth)return;
  const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale;
  background.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,x,y,w,h);
 }
 function paintBackground(){
  if(!background)return;
  const dpr=Math.min(devicePixelRatio||1,2),dark=document.documentElement.dataset.theme==='dark';
  backdrop.width=Math.round(width*dpr);backdrop.height=Math.round(height*dpr);background.setTransform(dpr,0,0,dpr,0,0);
  background.fillStyle=dark?'#101c28':'#f0eee5';background.fillRect(0,0,width,height);
  if(preset==='spectrum'){
   const wash=background.createLinearGradient(0,height,width,0);wash.addColorStop(0,dark?'#163f66':'#97cce7');wash.addColorStop(.46,dark?'#202c3c':'#eee9dc');wash.addColorStop(1,dark?'#8c4d45':'#f2aa85');background.fillStyle=wash;background.fillRect(0,0,width,height);
   background.strokeStyle=dark?'#bdd2e91f':'#25445823';background.lineWidth=1;
   for(let x=0;x<width;x+=32){background.beginPath();background.moveTo(x,0);background.lineTo(x,height);background.stroke()}
   for(let y=0;y<height;y+=32){background.beginPath();background.moveTo(0,y);background.lineTo(width,y);background.stroke()}
   const size=small.matches?width*.245:width*.175;
   background.fillStyle=dark?'#e8eff4':'#163344';background.font=`650 ${size}px sans-serif`;background.fillText('LIQUID',width*.045,height*.43);
   background.strokeStyle=dark?'#e8eff4':'#163344';background.lineWidth=1.5;background.font=`italic ${size*1.15}px Georgia`;background.strokeText('play.',width*(small.matches?.19:.48),height*.79);
   const colors=['#086cee','#ec734e','#eadb9f'];
   colors.forEach((color,i)=>{background.fillStyle=color;background.fillRect(width*.07,height*(.60+i*.065),width*(small.matches?.4:.29),height*.045)});
  }else if(preset==='photo'){
   cover(photos[0],width*.04,height*.07,width*(small.matches?.65:.38),height*.85);
   cover(photos[1],width*.72,height*.24,width*.24,height*.69);
   background.fillStyle=dark?'#e9eff3':'#1a3746';background.font=`italic ${width*(small.matches?.16:.10)}px Georgia`;
   background.fillText('keep',width*.45,height*.30);background.fillText('the light.',width*.39,height*.53);
  }else{
   background.fillStyle='#151b22';background.fillRect(0,0,width,height);
   background.fillStyle='#eae9db';background.font=`600 ${width*(small.matches?.23:.14)}px sans-serif`;
   background.fillText('TYPE /',width*.04,height*.29);background.fillStyle='#87b6ff';background.fillText('LIGHT',width*.10,height*.58);
   background.font=`italic ${width*(small.matches?.20:.12)}px Georgia`;background.fillStyle='#e8ad89';background.fillText('curiosity',width*(small.matches?.04:.39),height*.85);
   background.strokeStyle='#d4e0ed';background.lineWidth=1;
   for(let y=20;y<height;y+=24){background.beginPath();background.moveTo(width*.035,y);background.lineTo(width*.06,y);background.stroke()}
  }
  revision++;host.dataset.scene=preset;
 }
 function arrange(){
  const slots=small.matches?[[.29,.30],[.72,.53],[.43,.75]]:[[.27,.42],[.72,.35],[.55,.64]];
 const sizes=small.matches?[[180,176,80],[150,168,72],[190,170,80]]:[[300,280,130],[252,270,120],[320,260,120]];
  lenses.forEach((lens,i)=>{
   [lens.w,lens.h,lens.radius]=sizes[i];lens.anchor=[slots[i][0],slots[i][1]];lens.rotation=[-18,21,9][i];lens.previous=null;
   lens.element.style.width=lens.w+'px';lens.element.style.height=lens.h+'px';lens.element.style.borderRadius=lens.radius+'px';
   const dpr=Math.min(devicePixelRatio||1,small.matches?1.25:1.5);lens.canvas.width=Math.round(lens.w*dpr);lens.canvas.height=Math.round(lens.h*dpr);
   lens.source.width=lens.w+2*pad;lens.source.height=lens.h+2*pad;
  });
 }
 function motion(lens){return {x:Math.sin(elapsed*.43+lens.phase)*width*(small.matches?.045:.065),y:Math.sin(elapsed*.31+lens.phase*1.7)*height*.055,angle:Math.sin(elapsed*.36+lens.phase)*17}}
 function draw(){
  const started=performance.now();
  for(const lens of lenses){
   const drift=motion(lens);
   if(!lens.held){lens.x=lens.anchor[0]*width+drift.x;lens.y=lens.anchor[1]*height+drift.y;lens.angle=lens.rotation+drift.angle}
   lens.element.style.transform=`translate3d(${(lens.x-lens.w/2).toFixed(2)}px,${(lens.y-lens.h/2).toFixed(2)}px,0) rotate(${lens.angle.toFixed(2)}deg)`;
   lens.element.style.left='0';lens.element.style.top='0';
   if(!lens.render||!background||lens.gl.isContextLost())continue;
   const pose=[lens.x,lens.y,lens.angle,revision];
   const moved=!lens.previous||pose.some((v,i)=>Math.abs(v-lens.previous[i])>.005);
   if(moved){
    const ctx=lens.context;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,lens.source.width,lens.source.height);
    ctx.translate(lens.w/2+pad,lens.h/2+pad);ctx.rotate(-lens.angle*Math.PI/180);
    ctx.drawImage(backdrop,0,0,backdrop.width,backdrop.height,-lens.x,-lens.y,width,height);
    lens.previous=pose;
   }
   let light=[-5,-5],active=0;
   if(pointer){const a=-lens.angle*Math.PI/180,dx=pointer.x-lens.x,dy=pointer.y-lens.y;light=[.5+(dx*Math.cos(a)-dy*Math.sin(a))/lens.w,.5-(dx*Math.sin(a)+dy*Math.cos(a))/lens.h];active=light[0]>-.3&&light[0]<1.3&&light[1]>-.6&&light[1]<1.6?1:0}
   const shapePhase=(elapsed*.46+lens.phase)%(Math.PI*2);
   lens.element.dataset.shapePhase=shapePhase.toFixed(4);
   lens.render(lens.source,{liquid:1,lensPower:.20,shapeMorph:1,shapePhase,reflectivity:.88,strength:1.45,bevelWidth:Number(depth.value),reflectionReach:2.2,reflectionQuality:small.matches?0:1,studioLight:.85,lightDirection:[Math.cos(elapsed*.2)*.65,.75],surfaceSize:[lens.w,lens.h],scenePadding:pad,cornerRadius:lens.radius,pointerLightPosition:light,pointerLightActive:active,unchanged:!moved});
  }
  host.dataset.opticalFrames=String(Number(host.dataset.opticalFrames||0)+1);
  host.dataset.uploadedPixels=String(lenses.reduce((sum,lens)=>sum+(lens.render?.stats.uploadedPixels||0),0));
  host.dataset.frameMs=(performance.now()-started).toFixed(2);
 }
 function allowed(){return visible&&!document.hidden&&playing&&lenses.some(l=>l.render)}
 function tick(now){
  frame=0;
  if(!visible||document.hidden)return;
  const interval=1000/(small.matches?20:30);
  if(!last||now-last>=interval){if(last&&allowed())elapsed+=Math.min(.10,(now-last)/1000);last=now;draw()}
  if(allowed())frame=requestAnimationFrame(tick);
 }
 function queue(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(now=>{last=0;tick(now)})}
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0}
 function resize(){width=stage.clientWidth;height=stage.clientHeight;arrange();paintBackground();queue()}
 pause.addEventListener('click',()=>{playing=!playing;stop();updateState();queue()});
 host.querySelectorAll('[data-optical-preset]').forEach(button=>button.addEventListener('click',()=>{
  preset=button.dataset.opticalPreset;host.querySelectorAll('[data-optical-preset]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));paintBackground();queue();
 }));
 depth.addEventListener('input',queue);
 host.querySelector('[data-optical-remix]').addEventListener('click',()=>{
  remix++;lenses.forEach((lens,i)=>{lens.anchor[0]=[.27,.72,.55][(i+remix)%3];lens.anchor[1]=small.matches?[.30,.53,.75][i]:[.34,.44,.64][(i+remix)%3];lens.rotation+=31;lens.previous=null});queue();
 });
 function coordinate(event){const r=stage.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top}}
 lenses.forEach(lens=>{
  const grab=lens.element.querySelector('[data-lens-grab]'),turn=lens.element.querySelector('[data-lens-turn]');
  const down=(event,rotate)=>{
   if(event.button!==0)return;
   const p=coordinate(event);lens.held={id:event.pointerId,start:p,x:lens.x,y:lens.y,angle:lens.angle,rotate,type:event.pointerType,started:event.pointerType!=='touch'||rotate};
   event.currentTarget.setPointerCapture(event.pointerId);lens.element.dataset.manipulating='true';
  };
  const move=event=>{
   const held=lens.held;if(!held||held.id!==event.pointerId)return;const p=coordinate(event);
   if(!held.started){if(Math.abs(p.x-held.start.x)<8)return;held.started=true}
   if(held.rotate){const a=Math.atan2(p.y-lens.y,p.x-lens.x)-Math.atan2(held.start.y-lens.y,held.start.x-lens.x);lens.angle=held.angle+a*180/Math.PI;lens.rotation=lens.angle-motion(lens).angle;lens.suppressTurnClick=true}
   else{lens.x=Math.max(lens.w*.25,Math.min(width-lens.w*.25,held.x+p.x-held.start.x));lens.y=Math.max(lens.h*.25,Math.min(height-lens.h*.25,held.y+p.y-held.start.y));const drift=motion(lens);lens.anchor=[(lens.x-drift.x)/width,(lens.y-drift.y)/height]}
   queue();
  };
  const release=()=>{if(lens.held){const drift=motion(lens);lens.anchor=[(lens.x-drift.x)/width,(lens.y-drift.y)/height];lens.rotation=lens.angle-drift.angle}lens.held=null;delete lens.element.dataset.manipulating;queue()};
  grab.addEventListener('pointerdown',event=>down(event,false));turn.addEventListener('pointerdown',event=>down(event,true));
  for(const button of [grab,turn]){button.addEventListener('pointermove',move);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)}
  grab.addEventListener('keydown',event=>{
   const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!directions[event.key])return;event.preventDefault();
   const [x,y]=directions[event.key];if(event.shiftKey&&x)lens.rotation+=x*8;else{lens.anchor[0]=Math.max(.1,Math.min(.9,lens.anchor[0]+x*12/width));lens.anchor[1]=Math.max(.1,Math.min(.9,lens.anchor[1]+y*12/height))}queue();
  });
  turn.addEventListener('click',()=>{if(lens.suppressTurnClick){lens.suppressTurnClick=false;return}lens.rotation+=12;queue()});
 });
 stage.addEventListener('pointermove',event=>{pointer=coordinate(event);queue()},{passive:true});
 stage.addEventListener('pointerleave',()=>{pointer=null;queue()});
 stage.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse'){pointer=null;queue()}},{passive:true});
 stage.addEventListener('pointercancel',()=>{pointer=null;queue()},{passive:true});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;host.dataset.inView=String(visible);if(visible)queue();else stop()},{threshold:.02}).observe(stage);
 document.addEventListener('visibilitychange',()=>{stop();if(!document.hidden)queue()});
 reduce.addEventListener('change',()=>{if(reduce.matches){playing=false;stop();updateState();queue()}});
 new MutationObserver(()=>{paintBackground();updateState();queue()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','lang']});
 new ResizeObserver(resize).observe(stage);
 photos.forEach(photo=>photo.addEventListener('load',()=>{paintBackground();queue()}));
 if(background){host.dataset.opticalReady='true';resize();updateState()}
}

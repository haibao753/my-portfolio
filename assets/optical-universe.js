import {setupSculpture} from '/assets/optical-sculpture.js';

const host=document.querySelector('[data-optical-universe]');
if(host){
 const stage=host.querySelector('[data-universe-stage]'),plate=host.querySelector('[data-universe-plate]'),ctx=plate.getContext('2d');
 const frameElement=host.querySelector('[data-sculpture-frame]'),canvas=host.querySelector('[data-sculpture-canvas]');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width:760px)');
 const pause=host.querySelector('[data-universe-pause]'),feedback=host.querySelector('[data-universe-feedback]');
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 let render=null;try{if(gl)render=setupSculpture(gl)}catch{}
 let mode=0,revision=0,elapsed=0,shape=0,targetShape=0,pulse=0,playing=!reduce.matches,visible=false,raf=0,last=0,width=1,height=1,interaction=0;
 let pointer=[0,0],targetPointer=[0,0],crop=[0,0,1,1],viewportSize=[1,1];
 const en=()=>document.documentElement.lang==='en';
 const state=()=>{
  host.dataset.universeGpu=String(!!render);host.dataset.universeMotion=playing&&render?'playing':'paused';host.dataset.universeMode=String(mode);
  pause.disabled=!render;pause.setAttribute('aria-pressed',String(!playing||!render));pause.querySelector('[data-universe-pause-label]').textContent=en()?(playing&&render?'Pause animation':'Resume animation'):(playing&&render?'暂停动画':'继续动画');
  canvas.hidden=!render;
 };
 function paint(){
  if(!ctx)return;
  const dpr=Math.min(devicePixelRatio||1,1.5);plate.width=Math.round(width*dpr);plate.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const palettes=[['#080b12','#173a86','#83a6e8','#ee8e61'],['#100b1b','#652ab2','#df9dff','#86d9ea'],['#0c110d','#365638','#bbd481','#eaefa4']];
  const colors=palettes[mode];ctx.fillStyle=colors[0];ctx.fillRect(0,0,width,height);
  const glow=(x,y,r,color,opacity)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,colors[0]);ctx.globalAlpha=opacity;ctx.fillStyle=g;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1};
  glow(width*.78,height*.48,width*.53,colors[1],.80);glow(width*.96,height*.34,width*.29,colors[3],.18);
  // An actual source plate behind the refractive sculpture: luminous orbital
  // ribbons, fine ruled paths and one restrained colour horizon.
  ctx.save();ctx.translate(width*(small.matches?.56:.74),height*(small.matches?.66:.49));ctx.rotate(-.38);
  const orbit=Math.min(width*(small.matches?.7:.40),height*.47);
  for(let i=0;i<38;i++){
   const t=i/37;ctx.beginPath();ctx.ellipse(0,0,orbit*(.70+t*.52),orbit*(.22+t*.12),0,0,Math.PI*2);
   ctx.strokeStyle=i%5===0?colors[2]+'3b':colors[2]+'13';ctx.lineWidth=i%5===0?.8:.5;ctx.stroke();
  }
  ctx.restore();
  const horizon=ctx.createLinearGradient(0,0,width,0);horizon.addColorStop(0,colors[0]);horizon.addColorStop(.47,colors[1]);horizon.addColorStop(.72,colors[2]);horizon.addColorStop(1,colors[0]);
  ctx.globalAlpha=.55;ctx.fillStyle=horizon;ctx.fillRect(width*.31,height*.53,width*.69,1.5);ctx.globalAlpha=1;
  // Sparse deterministic stars, stable across redraws and reduced motion.
  for(let i=0;i<51;i++){const x=((i*167+37)%997)/997*width,y=((i*271+19)%991)/991*height;ctx.fillStyle=i%9===0?'#e5edff88':'#9eafd82b';ctx.fillRect(x,y,i%9===0?1.5:.7,i%9===0?1.5:.7)}
  revision++;
 }
 function draw(dt=0){
  if(!render||!ctx||gl.isContextLost())return;
  const smoothing=1-Math.exp(-dt*3.5);pointer=pointer.map((v,i)=>v+(targetPointer[i]-v)*smoothing);
  shape+=(targetShape-shape)*(1-Math.exp(-dt*2.8));pulse*=Math.exp(-dt*1.5);
  render(plate,{revision,time:elapsed,mode,shape,pulse,pointer,crop,size:viewportSize});
  host.dataset.universeFrames=String(Number(host.dataset.universeFrames||0)+1);host.dataset.universeTime=elapsed.toFixed(3);host.dataset.universeShape=shape.toFixed(3);
 }
 function allowed(){return visible&&!document.hidden&&playing&&render}
 function tick(now){
  raf=0;if(!visible||document.hidden)return;
  if(!last||now-last>=1000/(small.matches?20:30)){const dt=last&&allowed()?Math.min(.1,(now-last)/1000):0;last=now;if(allowed())elapsed+=dt;draw(dt)}
  if(allowed())raf=requestAnimationFrame(tick);
 }
 function queue(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(now=>{last=0;tick(now)})}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0}
 function resize(){
  width=stage.clientWidth;height=stage.clientHeight;const s=stage.getBoundingClientRect(),r=frameElement.getBoundingClientRect();viewportSize=[r.width,r.height];
  const quality=Math.min(1,(small.matches?400:680)/Math.max(r.width,r.height));canvas.width=Math.max(1,Math.round(r.width*quality));canvas.height=Math.max(1,Math.round(r.height*quality));
  crop=[(r.left-s.left)/width,1-(r.bottom-s.top)/height,r.width/width,r.height/height];paint();queue();
 }
 const touch=()=>{
  interaction++;targetShape++;pulse=1;if(!playing)shape=targetShape;
  host.dataset.universeInteractions=String(interaction);feedback.textContent=en()?'Shape changed. Click again to try another.':'形态已改变。再点一次，试试下一种。';queue();
 };
 host.querySelector('[data-sculpture-touch]').addEventListener('click',touch);
 stage.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const r=stage.getBoundingClientRect();targetPointer=[(event.clientX-r.left)/width*2-1,1-(event.clientY-r.top)/height*2];if(!playing){pointer=[...targetPointer]}queue()},{passive:true});
 stage.addEventListener('pointerleave',()=>{targetPointer=[0,0];queue()},{passive:true});
 host.querySelectorAll('[data-universe-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=Number(button.dataset.universeMode);host.querySelectorAll('[data-universe-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));targetShape=mode;if(!playing)shape=targetShape;pulse=1;
  feedback.textContent='';state();paint();queue();
 }));
 pause.addEventListener('click',()=>{playing=!playing;stop();state();queue()});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();render=null;stop();state()});
 canvas.addEventListener('webglcontextrestored',()=>{try{render=setupSculpture(gl);state();queue()}catch{}});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;host.dataset.universeInView=String(visible);if(visible)queue();else stop()},{threshold:.02}).observe(stage);
 document.addEventListener('visibilitychange',()=>{stop();if(!document.hidden)queue()});
 reduce.addEventListener('change',()=>{if(reduce.matches){playing=false;stop();state();queue()}});
 new MutationObserver(()=>{state();if(interaction)feedback.textContent=en()?'Shape changed. Click again to try another.':'形态已改变。再点一次，试试下一种。'}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 new ResizeObserver(resize).observe(stage);state();resize();
}

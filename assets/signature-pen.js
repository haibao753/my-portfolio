/* J.H. LAB / hand-sequenced pen traces.
 * The paths are an artistic reconstruction from the original vector outline;
 * they do not claim to record the artist's literal drawing history.
 * Each independently traced pen gesture uncovers original filled ink through
 * an SVG mask. Completion reveals the exact original silhouette. */
(()=>{
 "use strict";
 const root=document.querySelector(".hero-autograph--pen");
 if(!root)return;
 const strokes=[...root.querySelectorAll(".signature-pen-stroke")];
 const finish=root.querySelector(".hero-autograph__finish");
 if(!strokes.length||!finish)return;
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 const mobile=window.matchMedia("(max-width: 760px)");
 let frame=0,visible=true,origin=null,pausedElapsed=0,clockStarted=false;
 const pen=strokes.map(node=>{
  const length=node.getTotalLength();
  const duration=Number(node.dataset.duration)||300;
  node.style.strokeDasharray=String(length+4);
  node.style.strokeDashoffset=String(length+4);
  return {node,length:length+4,duration};
 });
 const writeTotal=pen.reduce((sum,p)=>sum+p.duration,0);
 const settle=180,hold=2700,rest=380,cycle=writeTotal+settle+hold+rest;
 const ready=()=>{
  root.classList.add("is-pen-ready");
  root.classList.remove("is-pen-finished");
  finish.style.opacity="0";
 };
 const draw=(elapsed)=>{
  let left=Math.min(elapsed,writeTotal);
  for(const p of pen){
   const t=Math.max(0,Math.min(1,left/p.duration));
   // Gentle easing mimics accelerations at each natural stroke.
   const eased=t*t*(3-2*t);
   p.node.style.strokeDashoffset=String(p.length*(1-eased));
   left-=p.duration;
  }
  const complete=elapsed>=writeTotal;
  const ending=elapsed>=writeTotal+settle+hold;
  if(complete){
   // Cross-fade the exact image silhouette at the end of the pen gesture.
   const fade=Math.min(1,Math.max(0,(elapsed-writeTotal)/settle));
   finish.style.opacity=String(fade);
  }else{
   finish.style.opacity="0";
  }
  if(ending){
   const t=Math.min(1,(elapsed-writeTotal-settle-hold)/rest);
   root.style.opacity=String(1-t);
  }else root.style.opacity="1";
 };
 const tick=(time)=>{
  frame=0;
  if(!visible||document.hidden||reduced.matches)return;
  if(origin===null)origin=time-pausedElapsed;
  const elapsed=(time-origin)%cycle;
  draw(elapsed);
  frame=requestAnimationFrame(tick);
 };
 const stop=()=>{
  if(frame)cancelAnimationFrame(frame);
  frame=0;
  if(origin!==null)pausedElapsed=(performance.now()-origin)%cycle;
  origin=null;
 };
 const start=()=>{
  if(frame||!visible||document.hidden||reduced.matches)return;
  if(!clockStarted){clockStarted=true;ready()}
  frame=requestAnimationFrame(tick);
 };
 const sync=()=>{
  if(reduced.matches){
   stop();root.classList.remove("is-pen-ready");
   root.style.opacity="1";finish.style.opacity="1";
   pausedElapsed=0;
  }else if(visible&&!document.hidden){start()}
  else stop();
 };
 // Restarts immediately on hover or keyboard focus; on phones it loops normally.
 const replay=()=>{
  if(reduced.matches)return;
  pausedElapsed=0;origin=null;root.style.opacity="1";
  if(!frame)start();
 };
 root.addEventListener("pointerenter",replay,{passive:true});
 root.addEventListener("focusin",replay);
 document.addEventListener("visibilitychange",sync);
 if(reduced.addEventListener)reduced.addEventListener("change",sync);
 else if(reduced.addListener)reduced.addListener(sync);
 if("IntersectionObserver" in window){
  new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;
   sync();
  },{rootMargin:"70px"}).observe(root);
 }
 sync();
})();

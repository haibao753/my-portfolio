/* J.H. LAB / Edition 23 — perceptual chapter acceleration, native scroll.
 * Real scroll position is always owned by the browser. Only decorative chapter
 * heading/preview layers move slightly WITH each scroll frame; no delays,
 * timers, touch interception, wheel prevention, or programmatic scrolling. */
(()=>{
 "use strict";
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const chapters=[...document.querySelectorAll("#works .work.chapter")];
 if(!chapters.length)return;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let lastY=window.scrollY,lastTime=performance.now(),frame=0;
 const reset=()=>{
  for(const el of chapters){
   el.style.removeProperty("--chapter-flow-y");
   el.style.removeProperty("--chapter-flow-opacity");
   el.style.removeProperty("--chapter-phase");
   el.classList.remove("is-flow-visible");
  }
 };
 const draw=()=>{
  frame=0;
  if(reduced.matches||document.documentElement.classList.contains("site-menu-is-open")){reset();return}
  const now=performance.now(),y=window.scrollY,dt=Math.max(16,now-lastTime);
  const velocity=clamp((y-lastY)/dt,-3,3);
  const viewport=window.innerHeight;
  // Velocity adjusts the parallax strength ONLY while native scrolling changes.
  // No RAF is scheduled after this frame unless a real browser scroll occurs.
  const strength=1+Math.min(1,Math.abs(velocity)/1.7)*.8;
  const amplitude=window.innerWidth<=760?22:32;
  for(const el of chapters){
   const rect=el.getBoundingClientRect();
   const onScreen=rect.bottom>-viewport*.25&&rect.top<viewport*1.25;
   el.classList.toggle("is-flow-visible",onScreen);
   if(!onScreen){
    el.style.removeProperty("--chapter-flow-y");
    el.style.removeProperty("--chapter-phase");
    el.style.removeProperty("--chapter-flow-opacity");
    continue;
   }
   // At entry the preview catches up, at exit it gently runs ahead.
   // Sine-shaped curve is smooth and reversible in either scroll direction.
   const midpoint=rect.top+rect.height*.5;
   const t=clamp((viewport*.55-midpoint)/(viewport*.75+rect.height*.55),-1,1);
   const phase=Math.sin(t*Math.PI*.5);
   const movement=clamp(phase*amplitude*strength,-amplitude*1.8,amplitude*1.8);
   el.style.setProperty("--chapter-flow-y",movement.toFixed(2)+"px");
   el.style.setProperty("--chapter-phase",Math.abs(phase).toFixed(3));
   el.style.setProperty("--chapter-flow-opacity","1");
  }
  lastY=y;lastTime=now;
 };
 const queue=()=>{if(!frame)frame=requestAnimationFrame(draw)};
 addEventListener("scroll",queue,{passive:true});
 addEventListener("resize",queue,{passive:true});
 addEventListener("pageshow",()=>{lastY=scrollY;lastTime=performance.now();queue()});
 if(reduced.addEventListener)reduced.addEventListener("change",()=>{if(reduced.matches)reset();else queue()});
 queue();
})();

/* J.H. LAB — reliable, visible orbital movement for inline SVG.
   A single animation loop, paused offscreen or when motion is reduced. */
(()=>{
 "use strict";
 const graphic=document.querySelector(".hero-artwork__graphic");
 if(!graphic)return;
 const upper=graphic.querySelector("#jh-lab-ball-upper");
 const lower=graphic.querySelector("#jh-lab-ball-lower");
 const upperPath=graphic.querySelector("#jh-lab-orbit-upper");
 const lowerPath=graphic.querySelector("#jh-lab-orbit-lower");
 if(!upper||!lower||!upperPath||!lowerPath)return;
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 const orbits=[
  {ball:upper,path:upperPath,from:[1139,147],period:8500,phase:.56},
  {ball:lower,path:lowerPath,from:[345,656],period:11400,phase:.32}
 ];
 let active=true,raf=0,epoch=null;
 const smooth=(t)=>.5-.5*Math.cos(t*Math.PI*2); // out and back, no abrupt teleport
 const paint=(time)=>{
  if(epoch===null)epoch=time;
  const elapsed=time-epoch;
  for(const item of orbits){
   const fraction=smooth((elapsed/item.period+item.phase)%1);
   const pos=item.path.getPointAtLength(fraction*item.path.getTotalLength());
   item.ball.setAttribute("transform",`translate(${(pos.x-item.from[0]).toFixed(2)} ${(pos.y-item.from[1]).toFixed(2)})`);
  }
 };
 const tick=(time)=>{
  raf=0;
  if(!active||reduced.matches||document.hidden)return;
  paint(time);
  raf=requestAnimationFrame(tick);
 };
 const start=()=>{
  if(!raf&&active&&!document.hidden&&!reduced.matches){
   epoch=null;
   raf=requestAnimationFrame(tick);
  }
 };
 const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0};
 const sync=()=>{
  if(reduced.matches){
   stop();
   epoch=null;
   orbits.forEach(item=>item.ball.removeAttribute("transform"));
  }else if(active&&!document.hidden)start();
  else stop();
 };
 if("IntersectionObserver" in window){
  const observer=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;sync()},{rootMargin:"80px"});
  observer.observe(graphic);
 }
 document.addEventListener("visibilitychange",sync);
 if(reduced.addEventListener)reduced.addEventListener("change",sync);
 else if(reduced.addListener)reduced.addListener(sync);
 sync();
})();

/* J.H. LAB — one-time hand-sequenced signature writing.
 * The pen paths are an artistic reconstruction; the original filled outline
 * is shown permanently after the sole writing pass. No automatic replay. */
(()=>{
 "use strict";
 const root=document.querySelector(".hero-autograph--pen");
 if(!root)return;
 const strokes=[...root.querySelectorAll(".signature-pen-stroke")];
 const finish=root.querySelector(".hero-autograph__finish");
 if(!strokes.length||!finish)return;
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 let frame=0,visible=true,started=false,completed=false;
 let origin=null,elapsedBeforePause=0;
 const pen=strokes.map(node=>{
  const length=node.getTotalLength()+4;
  const duration=Number(node.dataset.duration)||300;
  node.style.strokeDasharray=String(length);
  node.style.strokeDashoffset=String(length);
  return {node,length,duration};
 });
 const writeTotal=pen.reduce((sum,p)=>sum+p.duration,0);
 const settle=180;
 const finishOnce=()=>{
  if(frame)cancelAnimationFrame(frame);
  frame=0;completed=true;root.style.opacity="1";
  root.classList.add("is-pen-finished");
  // The original silhouette is permanent, not faded out at cycle's end.
  finish.style.opacity="1";
 };
 const draw=elapsed=>{
  let remaining=Math.min(elapsed,writeTotal);
  for(const p of pen){
   const t=Math.max(0,Math.min(1,remaining/p.duration));
   const eased=t*t*(3-2*t);
   p.node.style.strokeDashoffset=String(p.length*(1-eased));
   remaining-=p.duration;
  }
  if(elapsed>=writeTotal){
   finish.style.opacity=String(Math.min(1,(elapsed-writeTotal)/settle));
  }else finish.style.opacity="0";
 };
 const tick=time=>{
  frame=0;
  if(completed||!visible||document.hidden||reduced.matches)return;
  if(origin===null)origin=time-elapsedBeforePause;
  const elapsed=time-origin;
  draw(elapsed);
  if(elapsed>=writeTotal+settle){finishOnce();return}
  frame=requestAnimationFrame(tick);
 };
 const stop=()=>{
  if(frame)cancelAnimationFrame(frame);
  frame=0;
  if(origin!==null)elapsedBeforePause=Math.max(0,performance.now()-origin);
  origin=null;
 };
 const sync=()=>{
  if(completed)return;
  if(reduced.matches){
   stop();finishOnce();
   root.classList.remove("is-pen-ready");
   return;
  }
  if(!visible||document.hidden){stop();return}
  if(!started){
   started=true;
   root.classList.add("is-pen-ready");
   finish.style.opacity="0";
  }
  if(!frame)frame=requestAnimationFrame(tick);
 };
 document.addEventListener("visibilitychange",sync);
 if(reduced.addEventListener)reduced.addEventListener("change",sync);
 else if(reduced.addListener)reduced.addListener(sync);
 if("IntersectionObserver" in window){
  visible=false;
  new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;
   sync();
  },{rootMargin:"70px"}).observe(root);
 }
 sync();
})();

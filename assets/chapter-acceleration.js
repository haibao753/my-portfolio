/* J.H. LAB / Edition 22 — native mobile scrolling, desktop-only chapter acceleration.
 * Accelerate over the END of each long visual chapter; do not force one-screen
 * pagination. A new gesture cancels an in-progress glide. */
(()=>{
 "use strict";
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const pointer=matchMedia("(hover: hover) and (pointer: fine)");
 const selectors=["#observation","#research","#visual-archive","#computing","#studio","#contact",".closing-artwork-section"];
 const chapters=selectors.map(x=>document.querySelector(x)).filter(Boolean);
 if(chapters.length<4)return;
 const topOf=el=>scrollY+el.getBoundingClientRect().top;
 const headerHeight=()=>document.querySelector(".glass-site-header")?.getBoundingClientRect().height||0;
 const destination=el=>Math.max(0,topOf(el)-headerHeight()-12);
 const blocked=()=>reduced.matches||document.documentElement.classList.contains("site-menu-is-open");
 let anim=0,running=false,lockUntil=0;
 const stop=()=>{
  if(anim)cancelAnimationFrame(anim);
  anim=0;running=false;
 };
 const glide=(to)=>{
  if(blocked())return;
  stop();
  const from=scrollY,delta=to-from;
  if(Math.abs(delta)<50)return;
  // Faster than ordinary inertial scrolling, but with a cushioned landing.
  const duration=Math.min(510,Math.max(300,300+Math.abs(delta)*.14));
  const begun=performance.now();
  running=true;
  function frame(now){
   const t=Math.min(1,(now-begun)/duration);
   const k=1-Math.pow(1-t,3.5);
   window.scrollTo({top:from+delta*k,behavior:"instant"});
   if(t<1)anim=requestAnimationFrame(frame);
   else{anim=0;running=false;lockUntil=performance.now()+620;}
  }
  anim=requestAnimationFrame(frame);
 };
 // Only engage when the outgoing chapter's bottom has reached a meaningful
 // position in the viewport, so we never skip its main content.
 const candidate=direction=>{
  const y=scrollY,h=innerHeight;
  const sorted=chapters.map(el=>({el,top:topOf(el),bottom:topOf(el)+el.offsetHeight})).sort((a,b)=>a.top-b.top);
  if(direction>0){
   for(let i=0;i<sorted.length-1;i++){
    const from=sorted[i],to=sorted[i+1],distance=destination(to.el)-y;
    const passedMost=y+h*.78>=from.bottom;
    const nextSoon=distance>80&&distance<Math.min(h*1.18,1000);
    const afterStart=y>from.top+Math.min(140,from.el.offsetHeight*.16);
    if(passedMost&&nextSoon&&afterStart)return destination(to.el);
   }
  }else if(direction<0){
   for(let i=1;i<sorted.length;i++){
    const from=sorted[i],before=sorted[i-1];
    const distance=y-destination(before.el);
    const nearEntrance=y<destination(from.el)+Math.min(h*.48,420);
    const previousClose=distance>90&&distance<Math.min(h*1.24,1050);
    if(nearEntrance&&previousClose)return destination(before.el);
   }
  }
  return null;
 };
 const canMove=()=>!blocked()&&!running&&performance.now()>lockUntil;
 function wheel(e){
  if(!pointer.matches||e.ctrlKey||e.defaultPrevented||Math.abs(e.deltaY)<7||
     Math.abs(e.deltaX)>Math.abs(e.deltaY)*.7)return;
  if(e.target.closest?.("a,button,input,textarea,select,[contenteditable],.site-menu-panel"))return;
  if(running){stop();lockUntil=performance.now()+200;return;}
  if(!canMove())return;
  const next=candidate(Math.sign(e.deltaY));
  if(next!==null){e.preventDefault();glide(next);}
 }
 addEventListener("wheel",wheel,{passive:false});
 // Mobile touch gestures must remain 100% native. In particular, do not
 // schedule another scroll after touchend: browser momentum is still running.
 // A fresh touch only cancels any desktop-driven animation.
 addEventListener("touchstart",stop,{passive:true});
 addEventListener("keydown",e=>{
  if(["PageDown","PageUp"," ","ArrowDown","ArrowUp","Home","End"].includes(e.key)){
   stop();lockUntil=performance.now()+300;
  }
 });
 addEventListener("pageshow",stop);
 reduced.addEventListener?.("change",stop);
})();

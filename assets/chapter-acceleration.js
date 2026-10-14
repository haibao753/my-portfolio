/* J.H. LAB / Edition 20 — chapter-aware nonlinear scroll.
 * Read content natively. Accelerate only across short inter-chapter transitions.
 * Wheel: targeted glide when leaving a chapter. Touch: gentle settle near a
 * chapter entrance after native momentum stops. Motion-sensitive users opt out. */
(()=>{
 "use strict";
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 const fine=window.matchMedia("(hover: hover) and (pointer: fine)");
 const chapterSelectors=[
  ".hero#top",
  "#observation","#research","#visual-archive","#computing",
  "#studio","#contact",".closing-artwork-section"
 ];
 const nodes=chapterSelectors.map(sel=>document.querySelector(sel)).filter(Boolean);
 if(nodes.length<3)return;
 const header=()=>document.querySelector(".glass-site-header")?.getBoundingClientRect().height||0;
 const targetY=el=>Math.max(0,window.scrollY+el.getBoundingClientRect().top-header()-16);
 let raf=0,active=false,lastInteraction=0,settleTimer=0,snapBlockedUntil=0;
 let startY=0,destination=0,startedAt=0,duration=0;
 const ease=t=>1-Math.pow(1-t,3);
 const cancel=()=>{
  if(raf)cancelAnimationFrame(raf);
  raf=0;active=false;
 };
 const animate=(to,ms)=>{
  if(reduced.matches)return;
  cancel();
  startY=window.scrollY;destination=to;
  const distance=Math.abs(destination-startY);
  if(distance<15)return;
  duration=ms||Math.min(650,Math.max(340,340+distance*.19));
  startedAt=performance.now();active=true;
  const tick=now=>{
   const t=Math.min(1,(now-startedAt)/duration);
   window.scrollTo(0,startY+(destination-startY)*ease(t));
   if(t<1)raf=requestAnimationFrame(tick);
   else{raf=0;active=false;snapBlockedUntil=performance.now()+450;}
  };
  raf=requestAnimationFrame(tick);
 };
 const isInteractive=e=>!!e.target?.closest?.("a,button,input,textarea,select,[contenteditable],[data-no-chapter-snap],.site-menu-panel");
 const blocked=()=>reduced.matches||document.documentElement.classList.contains("site-menu-is-open")||document.body.classList.contains("is-navigating");
 function wheel(e){
  if(!fine.matches||blocked()||isInteractive(e)||e.ctrlKey||Math.abs(e.deltaY)<8||Math.abs(e.deltaX)>Math.abs(e.deltaY)*.8)return;
  if(active){cancel();return;} // A second gesture immediately returns control to the visitor.
  if(performance.now()<snapBlockedUntil)return;
  const y=scrollY,down=e.deltaY>0,edge=header();
  // A transition band is the *end* of the previous chapter and the space
  // before the next, never the middle of long articles or project cards.
  const ordered=nodes.map(el=>({el,top:targetY(el),bottom:window.scrollY+el.getBoundingClientRect().bottom})).sort((a,b)=>a.top-b.top);
  if(down){
   for(let i=1;i<ordered.length;i++){
    const prev=ordered[i-1],next=ordered[i];
    const distance=next.top-y;
    const nearEnd=y+innerHeight >= prev.bottom-160;
    if(distance>40&&distance<Math.min(innerHeight*.88,680)&&nearEnd&&y>=prev.top+100){
     e.preventDefault();animate(next.top,Math.min(640,390+distance*.20));return;
    }
   }
  }else{
   for(let i=ordered.length-2;i>=0;i--){
    const previous=ordered[i],current=ordered[i+1],distance=y-previous.top;
    const justAtStart=y<=current.top+125;
    if(distance>45&&distance<Math.min(innerHeight*.88,680)&&justAtStart){
     e.preventDefault();animate(previous.top,Math.min(640,390+distance*.20));return;
    }
   }
  }
 }
 window.addEventListener("wheel",wheel,{passive:false});
 window.addEventListener("touchstart",()=>{cancel();lastInteraction=performance.now()},{passive:true});
 window.addEventListener("keydown",e=>{
  if(["PageDown","PageUp"," ","ArrowDown","ArrowUp","Home","End"].includes(e.key))cancel();
 });
 // Smartphone: keep native touch momentum. Only settle when already close to
 // a chapter entrance and the user has stopped touching/scrolling.
 const settle=()=>{
  if(fine.matches||blocked()||active||performance.now()-lastInteraction<220||performance.now()<snapBlockedUntil)return;
  const y=scrollY;
  let closest=null,dist=Infinity;
  for(const el of nodes){
   const top=targetY(el),delta=Math.abs(top-y);
   if(delta<dist){dist=delta;closest=top}
  }
  if(closest!==null&&dist>9&&dist<80)animate(closest,330);
 };
 window.addEventListener("scroll",()=>{
  if(fine.matches||active||reduced.matches)return;
  clearTimeout(settleTimer);
  settleTimer=setTimeout(settle,190);
 },{passive:true});
 window.addEventListener("pageshow",cancel);
 reduced.addEventListener?.("change",cancel);
})();

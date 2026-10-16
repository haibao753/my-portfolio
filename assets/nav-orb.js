/* Morph the active Astro glass navigation into a reachable logo orb. */
(()=>{
 "use strict";
 const init=()=>{
  const nav=document.querySelector(".glass-nav");
  if(!nav||nav.dataset.orbReady)return;
  const brand=nav.querySelector(".brand"),links=nav.querySelector(".desktop-links"),controls=nav.querySelector(".controls"),menu=document.querySelector("[data-menu-toggle]");
  if(!brand)return;
  nav.dataset.orbReady="true";
  const reduce=matchMedia("(prefers-reduced-motion: reduce)");
  let p=0,target=0,raf=0,lastY=Math.max(0,scrollY),pinned=false;
  const clamp=x=>Math.max(0,Math.min(1,x));
  function paint(){
   raf=0;p=reduce.matches?target:p+(target-p)*.24;
   if(Math.abs(target-p)<.003)p=target;
   const t=p*p*(3-2*p);
   nav.style.setProperty("--orb-progress",String(t));
   nav.dataset.orbClosed=String(t>.97);
   if(links)links.inert=t>.97;
   if(controls)controls.inert=t>.97;
   if(p!==target)raf=requestAnimationFrame(paint);
  }
  const request=()=>{if(!raf)raf=requestAnimationFrame(paint)};
  function scrollUpdate(){
   const y=Math.max(0,scrollY),dy=y-lastY;lastY=y;
   if(y<16){target=0;pinned=false}
   else if(menu?.getAttribute("aria-expanded")==="true"||pinned)target=0;
   else if(Math.abs(dy)>.5)target=clamp(target+dy/115);
   request();
  }
  brand.addEventListener("click",e=>{if(p>.55){e.preventDefault();pinned=true;target=0;request()}});
  document.addEventListener("pointerdown",e=>{if(pinned&&!nav.contains(e.target)){pinned=false;target=scrollY>120?1:0;request()}});
  menu?.addEventListener("click",()=>{target=0;request()});
  addEventListener("scroll",scrollUpdate,{passive:true});
  reduce.addEventListener?.("change",request);
  scrollUpdate();request();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
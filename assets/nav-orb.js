/* Scroll direction controls a two-state glass toolbar. No per-scroll rAF style writes. */
(()=>{
 "use strict";
 function init(){
  if(!document.querySelector(".brief-hero"))return;
  const nav=document.querySelector(".glass-nav");
  if(!nav||nav.dataset.orbReady)return;
  const brand=nav.querySelector(".brand");
  const links=nav.querySelector(".desktop-links");
  const controls=nav.querySelector(".controls");
  const menu=document.querySelector("[data-menu-toggle]");
  if(!brand)return;
  nav.dataset.orbReady="true";
  let collapsed=false,pinned=false,lastY=Math.max(0,window.scrollY),directionTravel=0;
  let transitionTimer=0;
  function toggle(closed){
   if(collapsed===closed)return;
   collapsed=closed;
   nav.dataset.orbTransitioning="true";
   nav.dataset.orbClosed=String(closed);
   if(links)links.inert=closed;
   if(controls)controls.inert=closed;
   clearTimeout(transitionTimer);
   transitionTimer=setTimeout(()=>{delete nav.dataset.orbTransitioning},430);
  }
  function onScroll(){
   const y=Math.max(0,window.scrollY),d=y-lastY;lastY=y;
   if(y<25){pinned=false;directionTravel=0;toggle(false);return}
   if(menu?.getAttribute("aria-expanded")==="true"||pinned){toggle(false);return}
   if(d>1){directionTravel=Math.max(0,directionTravel)+d;if(y>100&&directionTravel>26){toggle(true);directionTravel=0}}
   else if(d< -1){directionTravel=Math.min(0,directionTravel)+d;if(directionTravel< -35){toggle(false);directionTravel=0}}
  }
  brand.addEventListener("click",e=>{
   if(collapsed){e.preventDefault();pinned=true;toggle(false)}
  });
  document.addEventListener("pointerdown",e=>{
   if(pinned&&!nav.contains(e.target)){pinned=false;if(window.scrollY>140)toggle(true)}
  });
  menu?.addEventListener("click",()=>{pinned=true;toggle(false)});
  window.addEventListener("scroll",onScroll,{passive:true});
  // Restore the correct state after back-forward cache and reload at a deep anchor.
  if(window.scrollY>120)toggle(true);
  addEventListener("pageshow",()=>{lastY=window.scrollY;if(lastY<25)toggle(false)});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

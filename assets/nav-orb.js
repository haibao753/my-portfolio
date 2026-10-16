/* Scroll-driven reversible liquid navigation: no layout measurement per frame. */
(()=>{
 "use strict";
 function init(){
  const header=document.querySelector("body:has(.issues-section) .glass-site-header");
  if(!header||header.classList.contains("nav-orb-ready"))return;
  const logo=header.querySelector(".logo--solo");
  const actions=header.querySelector(".header-actions");
  const links=header.querySelector(".glass-primary-nav");
  const menu=document.getElementById("site-menu-toggle");
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  const spacer=document.createElement("div");
  spacer.className="nav-orb-spacer";
  header.after(spacer);
  header.classList.add("nav-orb-ready");
  let full=0,target=0,value=0,lastY=Math.max(0,window.scrollY),raf=0,openedByLogo=false;
  function measure(){full=Math.max(54,window.innerWidth-2*Math.max(10,Math.min(window.innerWidth*.022,22)));}
  measure();
  function paint(){
   raf=0;
   const t=reduce.matches?target:(value+(target-value)*.22);
   value=Math.abs(t-target)<.003?target:t;
   const eased=value*value*(3-2*value);
   const width=full-(full-54)*eased;
   header.style.setProperty("--orb-width",width.toFixed(2)+"px");
   header.style.setProperty("--orb-height",(58-4*eased).toFixed(2)+"px");
   header.style.setProperty("--orb-radius",(30+20*eased).toFixed(2)+"px");
   header.style.setProperty("--orb-content-opacity",String(Math.max(0,1-eased*2.2)));
   header.style.setProperty("--orb-content-shift",(-18*eased).toFixed(2)+"px");
   header.style.setProperty("--orb-content-scale",String(1-.18*eased));
   header.style.setProperty("--orb-logo-scale",String(1-.06*eased));
   const hidden=eased>.96;
   header.dataset.orbClosed=String(hidden);
   if(actions)actions.inert=hidden;
   if(links)links.inert=hidden;
   if(!reduce.matches&&value!==target)raf=requestAnimationFrame(paint);
  }
  function request(){if(!raf)raf=requestAnimationFrame(paint);}
  function onScroll(){
   const y=Math.max(0,window.scrollY);
   const delta=y-lastY;lastY=y;
   const menuOpen=menu?.getAttribute("aria-expanded")==="true";
   if(y<24){openedByLogo=false;target=0;}
   else if(menuOpen||openedByLogo){target=0;}
   else if(Math.abs(delta)>1)target=Math.max(0,Math.min(1,target+delta/125));
   request();
  }
  logo?.addEventListener("click",e=>{
   if(value>.55){e.preventDefault();openedByLogo=true;target=0;request();}
  });
  document.addEventListener("pointerdown",e=>{
   if(openedByLogo&&!header.contains(e.target)){openedByLogo=false;target=window.scrollY>120?1:0;request();}
  });
  menu?.addEventListener("click",()=>{target=0;openedByLogo=false;request();});
  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("resize",()=>{measure();request();},{passive:true});
  reduce.addEventListener?.("change",request);
  onScroll();request();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

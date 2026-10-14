/* J.H. LAB — shared glass menu behavior for homepage and Brief */
(()=>{
 "use strict";
 function init(){
  const toggle=document.getElementById("site-menu-toggle");
  const panel=document.getElementById("site-menu-panel");
  const header=document.querySelector(".glass-site-header");
  if(!toggle||!panel||!header)return;
  const small=window.matchMedia("(max-width: 1180px)");
  const reading=document.getElementById("reading-toggle");
  const readingSlot=panel.querySelector(".site-menu-panel__tool");
  const desktopSlot=header.querySelector(".header-actions");
  // Relocate the same reading control; preserve the original click listener.
  const placeReading=()=>{
   if(!reading||!readingSlot||!desktopSlot)return;
   if(small.matches){if(reading.parentElement!==readingSlot)readingSlot.appendChild(reading)}
   else if(reading.parentElement!==desktopSlot)desktopSlot.insertBefore(reading,toggle);
  };
  // Keep the backdrop outside the header's own backdrop-filter context.
  const veil=document.createElement("div");
  veil.className="site-menu-veil";
  veil.setAttribute("aria-hidden","true");
  document.body.appendChild(veil);
  panel.classList.add("site-menu-panel--floating");
  document.body.appendChild(panel);
  const positionPanel=()=>{
   const y=Math.max(0,header.getBoundingClientRect().bottom);
   panel.style.top=y+"px";
   panel.style.setProperty("--menu-top",y+"px");
  };
  positionPanel();
  window.addEventListener("resize",positionPanel,{passive:true});
  window.addEventListener("scroll",positionPanel,{passive:true});
  let lastFocus=null;
  function setOpen(open,{restore=false}={}){
   if(open===(toggle.getAttribute("aria-expanded")==="true"))return;
   if(open){lastFocus=document.activeElement;positionPanel()}
   toggle.setAttribute("aria-expanded",String(open));
   toggle.setAttribute("aria-label",open?(document.documentElement.lang==="en"?"Close menu":"关闭导航菜单"):(document.documentElement.lang==="en"?"Open menu":"打开导航菜单"));
   panel.classList.toggle("is-open",open);
   veil.classList.toggle("is-open",open);
   document.documentElement.classList.toggle("site-menu-is-open",open);
   panel.inert=!open;
   if(!open&&restore&&lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
  }
  // Inert is explicit; a closed menu must never trap keyboard focus.
  panel.inert=true;
  placeReading();
  toggle.addEventListener("click",()=>setOpen(toggle.getAttribute("aria-expanded")!=="true"));
  veil.addEventListener("click",()=>setOpen(false,{restore:true}));
  panel.addEventListener("click",e=>{
   if(e.target.closest("a"))setOpen(false);
  });
  document.addEventListener("pointerdown",e=>{
   if(toggle.getAttribute("aria-expanded")==="true"&&!header.contains(e.target)&&!panel.contains(e.target))setOpen(false);
  });
  document.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&toggle.getAttribute("aria-expanded")==="true"){setOpen(false,{restore:true});}
  });
  const mediaChange=()=>{if(!small.matches)setOpen(false);placeReading()};
  if(small.addEventListener)small.addEventListener("change",mediaChange);
  else if(small.addListener)small.addListener(mediaChange);
  window.addEventListener("jhlab:language",()=>{
   const open=toggle.getAttribute("aria-expanded")==="true";
   toggle.setAttribute("aria-label",open?(document.documentElement.lang==="en"?"Close menu":"关闭导航菜单"):(document.documentElement.lang==="en"?"Open menu":"打开导航菜单"));
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

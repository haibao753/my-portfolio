/* J.H. LAB — shared glass menu behavior for homepage and Brief */
(()=>{
 "use strict";
 function init(){
  const toggle=document.getElementById("site-menu-toggle");
  const panel=document.getElementById("site-menu-panel");
  const header=document.querySelector(".glass-site-header");
  if(!toggle||!panel||!header)return;
  const small=window.matchMedia("(max-width: 1180px)");
  let lastFocus=null;
  function setOpen(open,{restore=false}={}){
   if(open===toggle.getAttribute("aria-expanded")==="true")return;
   if(open)lastFocus=document.activeElement;
   toggle.setAttribute("aria-expanded",String(open));
   toggle.setAttribute("aria-label",open?(document.documentElement.lang==="en"?"Close menu":"关闭导航菜单"):(document.documentElement.lang==="en"?"Open menu":"打开导航菜单"));
   panel.classList.toggle("is-open",open);
   panel.inert=!open;
   if(!open&&restore&&lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
  }
  // Inert is explicit; a closed menu must never trap keyboard focus.
  panel.inert=true;
  toggle.addEventListener("click",()=>setOpen(toggle.getAttribute("aria-expanded")!=="true"));
  panel.addEventListener("click",e=>{
   if(e.target.closest("a"))setOpen(false);
  });
  document.addEventListener("pointerdown",e=>{
   if(toggle.getAttribute("aria-expanded")==="true"&&!header.contains(e.target))setOpen(false);
  });
  document.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&toggle.getAttribute("aria-expanded")==="true"){setOpen(false,{restore:true});}
  });
  const mediaChange=()=>{if(!small.matches)setOpen(false)};
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

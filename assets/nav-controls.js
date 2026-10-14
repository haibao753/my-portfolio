/* J.H. LAB — shared tactile feedback for navigation controls. */
(function(){
"use strict";
function init(){
 const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(reduce)return;
 function pulse(el,cls){
   if(!el)return;
   el.classList.remove(cls);
   // Restart the subtle effect on repeated taps, even if a previous tap just finished.
   void el.offsetWidth;
   el.classList.add(cls);
 }
 const lang=document.getElementById("language-toggle");
 if(lang)lang.addEventListener("click",()=>pulse(lang,"is-switching"));
 const theme=document.getElementById("theme-toggle");
 if(theme)theme.addEventListener("click",()=>pulse(theme,"is-switching"));
 document.querySelectorAll(".nav-brief").forEach(el=>el.addEventListener("pointerdown",()=>pulse(el,"is-pressing")));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
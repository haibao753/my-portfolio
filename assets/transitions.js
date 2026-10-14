/* J.H. LAB / Navigation hand-off: no forced delay, cancel on browser restore. */
(function(){
"use strict";
const KEY="jhlab-nav-pending";
let layer=null,loading=false,closed=false,timeout=null;
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function isChinese(){return !document.documentElement.lang.toLowerCase().startsWith("en")}
function create(){
 if(layer)return layer;
 layer=document.createElement("div");
 layer.className="jh-transition";
 layer.setAttribute("role","status");layer.setAttribute("aria-live","polite");
 layer.innerHTML='<div class="jh-transition__center"><div class="jh-transition__mark" aria-hidden="true"><span class="jh-transition__orbit"></span><span class="jh-transition__orbit"></span><span class="jh-transition__dot"></span></div><div class="jh-transition__name">J.H. LAB</div><div class="jh-transition__label"></div><div class="jh-transition__track" aria-hidden="true"></div></div>';
 document.body.appendChild(layer);setLabel();
 return layer;
}
function setLabel(){if(layer)layer.querySelector(".jh-transition__label").textContent=isChinese()?"正在打开页面…":"Opening page…"}
function show(){
 if(closed)return;create();setLabel();layer.classList.add("is-active");loading=true;
}
function hide(){
 if(!layer)return;layer.classList.remove("is-active");loading=false;
 try{sessionStorage.removeItem(KEY)}catch(e){}
 if(timeout){clearTimeout(timeout);timeout=null}
}
function clearAfter(ms){if(timeout)clearTimeout(timeout);timeout=setTimeout(hide,ms)}
function incoming(){
 let pending=false;
 try{
  const value=Number(sessionStorage.getItem(KEY));
  pending=value>0&&Date.now()-value<15000;
  sessionStorage.removeItem(KEY);
 }catch(e){}
 if(pending){
  show();
  // On very fast loads, ensure at least one frame paints, but never hold the visitor needlessly.
  if(document.readyState==="complete")requestAnimationFrame(()=>requestAnimationFrame(hide));
  else{window.addEventListener("load",hide,{once:true});clearAfter(3800)}
 }
}
function outgoing(event){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const link=event.target.closest&&event.target.closest("a[href]");
 if(!link||link.hasAttribute("download")||link.target&&link.target!=="_self")return;
 let url;try{url=new URL(link.href,location.href)}catch{return}
 if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))return;
 if(url.pathname===location.pathname&&url.search===location.search&&(url.hash||!url.hash))return; // same document, including anchors
 show();
 try{sessionStorage.setItem(KEY,String(Date.now()))}catch(e){}
 clearAfter(5500); // navigation cancelled or unavailable
}
function init(){
 create();incoming();
 document.addEventListener("click",outgoing,{capture:true});
 window.addEventListener("pageshow",()=>{if(document.readyState==="complete")hide()});
 // Preserve the navigation marker across pagehide, so the destination can fade in.
 window.addEventListener("jhlab:language",setLabel);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

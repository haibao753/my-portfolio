/* J.H. LAB — contact headline typewriter: visible, readable and language-aware. */
(()=>{
 "use strict";
 const heading=document.getElementById("contact-heading");
 if(!heading)return;
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 let observer=null,timer=0,sequence=0,near=false;
 const textOf=()=>heading.dataset.contactFullText||heading.textContent.trim();
 const clear=()=>{sequence++;if(timer)clearTimeout(timer);timer=0};
 function play(){
  clear();
  const copy=textOf();
  if(!copy)return;
  heading.dataset.contactFullText=copy;
  if(reduced.matches){
   heading.textContent=copy;
   heading.classList.remove("contact-typewriter");
   return;
  }
  const token=sequence;
  heading.classList.add("contact-typewriter");
  heading.setAttribute("aria-label",copy);
  heading.replaceChildren();
  const measure=document.createElement("span");
  measure.className="contact-typewriter__measure";
  measure.setAttribute("aria-hidden","true");
  measure.textContent=copy;
  const ink=document.createElement("span");
  ink.className="contact-typewriter__ink";
  ink.setAttribute("aria-hidden","true");
  heading.append(measure,ink);
  let index=0;
  const letters=Array.from(copy);
  function advance(){
   if(token!==sequence)return;
   if(index>=letters.length){
    heading.classList.add("contact-typewriter--done");
    return;
   }
   heading.classList.remove("contact-typewriter--done");
   const span=document.createElement("span");
   span.className="contact-typewriter__glyph";
   span.textContent=letters[index++];
   ink.appendChild(span);
   const delay=letters[index-1]==="。" ? 470 : 235;
   timer=window.setTimeout(advance,delay);
  }
  timer=window.setTimeout(advance,220);
 }
 function handleLanguage(){
  // Translation has just replaced the heading with a new, complete phrase.
  clear();
  heading.classList.remove("contact-typewriter","contact-typewriter--done");
  heading.removeAttribute("aria-label");
  heading.dataset.contactFullText=heading.textContent.trim();
  if(near)play();
 }
 window.addEventListener("jhlab:language",handleLanguage);
 function setup(){
  if("IntersectionObserver" in window){
   observer=new IntersectionObserver(entries=>{
    const inside=entries[0].isIntersecting;
    if(inside&&!near){near=true;play()}
    else if(!inside)near=false;
   },{threshold:0.12,rootMargin:"0px 0px 60px 0px"});
   observer.observe(heading);
  }else{near=true;play()}
  const change=()=>{
   clear();
   heading.classList.remove("contact-typewriter","contact-typewriter--done");
   heading.removeAttribute("aria-label");
   // Restore text from aria-label if an animation was interrupted.
   const dict=document.documentElement.lang==="en"?"Connect.":"聊聊新的可能。";
   heading.textContent=dict;
   heading.dataset.contactFullText=dict;
   if(near)play();
  };
  if(reduced.addEventListener)reduced.addEventListener("change",change);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
})();

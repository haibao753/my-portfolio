/* J.H. LAB / native scroll story: cheap, motion-aware, progressive enhancement. */
(function(){
"use strict";
const progress=document.getElementById("story-progress"),rail=document.getElementById("story-rail"),works=document.getElementById("works"),sections=[...document.querySelectorAll("[data-story-chapter]")];
if(!progress||!works)return;
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pending=false,lastActive=-1;
function update(){
 pending=false;
 const doc=document.documentElement, max=Math.max(1,doc.scrollHeight-innerHeight);
 progress.style.transform="scaleX("+Math.min(1,Math.max(0,scrollY/max))+")";
 if(rail){const visible=scrollY>works.offsetTop-innerHeight*.35&&scrollY<doc.scrollHeight-innerHeight-120;rail.classList.toggle("is-visible",visible)}
 let active=0;
 for(let i=0;i<sections.length;i++){if(sections[i].getBoundingClientRect().top<=innerHeight*.42)active=i}
 if(active!==lastActive){lastActive=active;rail?.querySelectorAll("a").forEach((a,i)=>{a.classList.toggle("is-active",i===active);if(i===active)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current")})}
}
function queue(){if(!pending){pending=true;requestAnimationFrame(update)}}
addEventListener("scroll",queue,{passive:true});addEventListener("resize",queue,{passive:true});
window.addEventListener("pageshow",queue);
queue();
if(reduced){document.querySelectorAll(".story-teaser-guide svg").forEach(x=>x.style.animation="none")}
})();

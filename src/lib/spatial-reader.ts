/* CSS 3D scene: progressive enhancement, zero WebGL download on the reading path. */
const dialog=document.querySelector<HTMLDialogElement>("#spatial-dialog");
const open=document.querySelector<HTMLButtonElement>("#spatial-open");
const scene=document.querySelector<HTMLElement>("#spatial-scene");
const close=document.querySelector<HTMLButtonElement>("#spatial-close");
const status=document.querySelector<HTMLElement>("#spatial-state");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
let angle=0,tilt=-9,startX:number|null=null,lastFocus:HTMLElement|null=null;
function transform(){
 if(!scene)return;
 scene.style.transform=reduced.matches?"none":`rotateX(${tilt}deg) rotateY(${angle}deg)`;
}
function render(){
 if(!scene)return;
 const cards=[...document.querySelectorAll<HTMLElement>("#stories .news-card")].slice(0,9);
 scene.replaceChildren();
 if(!cards.length){if(status)status.textContent="暂无可探索的新闻";return;}
 if(status)status.textContent=`探索 ${cards.length} 个主题；选择节点进入正文`;
 const count=cards.length;
 cards.forEach((card,i)=>{
  const button=document.createElement("button");
  button.type="button";button.className="spatial-node";
  const title=card.querySelector("h3")?.textContent?.trim()||"未命名资讯";
  const category=card.querySelector(".news-category")?.textContent?.trim()||"探索";
  const label=document.createElement("span");label.className="spatial-label";label.textContent=category;
  const heading=document.createElement("strong");heading.textContent=title;
  button.append(label,heading);
  const theta=2*Math.PI*i/count;
  const radius=count===1?0:Math.min(250,120+count*12);
  const x=Math.sin(theta)*radius,y=Math.cos(theta*2)*Math.min(62,count*8),z=Math.cos(theta)*radius;
  button.style.setProperty("--x",x.toFixed(1)+"px");
  button.style.setProperty("--y",y.toFixed(1)+"px");
  button.style.setProperty("--z",z.toFixed(1)+"px");
  button.addEventListener("click",()=>{
   dialog?.close();card.scrollIntoView({behavior:reduced.matches?"instant":"smooth",block:"center"});
   const reveal=card.querySelector<HTMLButtonElement>(".news-read-toggle");
   if(reveal?.getAttribute("aria-expanded")==="false")reveal.click();
   reveal?.focus({preventScroll:true});
  });
  scene.append(button);
 });
 transform();
}
open?.addEventListener("click",()=>{
 if(!dialog||!scene)return;
 lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:open;
 render();dialog.showModal();close?.focus();
});
close?.addEventListener("click",()=>dialog?.close());
dialog?.addEventListener("close",()=>lastFocus?.focus({preventScroll:true}));
dialog?.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
dialog?.querySelectorAll<HTMLButtonElement>("[data-rotate]").forEach(button=>button.addEventListener("click",()=>{
 angle+=Number(button.dataset.rotate||"0");transform();
}));
scene?.addEventListener("pointerdown",e=>{if(e.target===scene)startX=e.clientX;});
scene?.addEventListener("pointerup",e=>{if(startX===null)return;angle=Math.max(-1080,Math.min(1080,angle+(e.clientX-startX)*.35));startX=null;transform();});
dialog?.addEventListener("keydown",e=>{
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){angle+=e.key==="ArrowLeft"?-18:18;transform();}
});
reduced.addEventListener?.("change",transform);
export {};

/* CSS 3D scene: progressive enhancement, zero WebGL download on the reading path. */
const dialog=document.querySelector<HTMLDialogElement>("#spatial-dialog");
const open=document.querySelector<HTMLButtonElement>("#spatial-open");
const scene=document.querySelector<HTMLElement>("#spatial-scene");
const close=document.querySelector<HTMLButtonElement>("#spatial-close");
const status=document.querySelector<HTMLElement>("#spatial-state");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
let startX:number|null=null,lastFocus:HTMLElement|null=null;
let items:HTMLElement[]=[];
let selected=0;
function show(){
 if(!scene)return;
 scene.replaceChildren();
 const card=items[selected];
 if(!card){if(status)status.textContent="暂无可探索的新闻";return;}
 const button=document.createElement("button");
 button.type="button";
 button.className="spatial-node";
 const label=document.createElement("span");label.className="spatial-label";
 label.textContent=card.querySelector(".news-category")?.textContent||"探索";
 const title=document.createElement("strong");title.textContent=card.querySelector("h3")?.textContent||"未命名资讯";
 const excerpt=document.createElement("span");excerpt.className="spatial-excerpt";
 excerpt.textContent=card.querySelector(".news-summary")?.textContent||"";
 button.append(label,title,excerpt);
 button.addEventListener("click",()=>{
  dialog?.close();
  card.scrollIntoView({behavior:reduced.matches?"instant":"smooth",block:"center"});
  const reveal=card.querySelector<HTMLButtonElement>(".news-read-toggle");
  if(reveal?.getAttribute("aria-expanded")==="false")reveal.click();
  reveal?.focus({preventScroll:true});
 });
 scene.append(button);
 if(status)status.textContent=(selected+1)+" / "+items.length+" · "+label.textContent;
}
function move(step:number){
 if(!items.length)return;
 selected=(selected+step+items.length)%items.length;
 show();
}
open?.addEventListener("click",()=>{
 if(!dialog)return;
 items=[...document.querySelectorAll<HTMLElement>("#stories .news-card")].slice(0,24);
 selected=0;
 lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:open;
 show();dialog.showModal();close?.focus();
});
close?.addEventListener("click",()=>dialog?.close());
dialog?.addEventListener("close",()=>lastFocus?.focus({preventScroll:true}));
dialog?.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
dialog?.querySelectorAll<HTMLButtonElement>("[data-rotate]").forEach(button=>button.addEventListener("click",()=>move(Number(button.dataset.rotate)<0?-1:1)));
const viewport=document.querySelector<HTMLElement>(".spatial-viewport");
viewport?.addEventListener("touchstart",e=>{startX=e.touches[0]?.clientX??null;},{passive:true});
viewport?.addEventListener("touchend",e=>{if(startX===null)return;const end=e.changedTouches[0]?.clientX??startX;const distance=end-startX;startX=null;if(Math.abs(distance)>45)move(distance<0?1:-1);},{passive:true});
dialog?.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();move(e.key==="ArrowLeft"?-1:1);}});
export {};

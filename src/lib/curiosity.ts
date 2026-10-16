import type {SculptureController} from "./curiosity-renderer";

export function initCuriosity(){
 const stage=document.querySelector<HTMLElement>("[data-curiosity]");
 const object=stage?.querySelector<HTMLButtonElement>("[data-sculpture-object]");
 const status=stage?.querySelector<HTMLElement>("[data-sculpture-status]");
 if(!stage||!object)return;
 const host=stage,button=object,root=document.documentElement;
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 let controller:SculptureController|null=null,loading=false,visible=false,paused=false,form=0,disposed=false;
 let drag:{id:number;x:number;y:number;lastX:number;lastT:number;touch:boolean;horizontal:boolean}|null=null;
 let moved=false;
 const names={zh:["曲面","星群","流线"],en:["Surface","Constellation","Flow"]};
 const en=()=>root.lang==="en";
 const announce=()=>{if(status)status.textContent=(en()?names.en:names.zh)[form]+(paused?(en()?" · Motion paused":" · 已暂停"):"")};
 const localize=()=>button.setAttribute("aria-label",en()?"Living geometry. Click to change form. Press Escape to pause or resume motion.":"可变几何装置。点击变换形态，按 Esc 暂停或继续运动。");
 const active=()=>visible&&!document.hidden&&!paused&&!reduced.matches&&!document.querySelector("dialog[open]");
 const sync=()=>{
  const playing=active();
  host.style.setProperty("--sculpture-play",playing?"running":"paused");
  host.dataset.motion=reduced.matches?"reduced":paused?"paused":playing?"playing":"sleeping";
  controller?.setPlaying(playing);
 };
 async function mount(){
  if(controller||loading||disposed||reduced.matches)return;
  loading=true;
  try{
   const {createSculpture}=await import("./curiosity-renderer");
   if(disposed)return;
   controller=createSculpture(button);
   controller.setForm(form,true);controller.setDark(root.dataset.theme==="dark");
   host.dataset.renderer="webgl";
   sync();
  }catch{
   host.dataset.renderer="fallback";
  }finally{loading=false;}
 }
 function change(){
  form=(form+1)%3;host.dataset.form=String(form);
  controller?.setForm(form,reduced.matches||paused);announce();
 }
 button.addEventListener("click",event=>{if(moved){moved=false;event.preventDefault();return}change()});
 button.addEventListener("keydown",event=>{
  if(event.key==="Enter"||event.key===" ")moved=false;
  if(event.key!=="Escape")return;
  event.preventDefault();paused=!paused;sync();announce();
 });
 button.addEventListener("pointerdown",event=>{
  if(event.button!==0)return;
  moved=false;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastT:event.timeStamp,touch:event.pointerType==="touch",horizontal:false};
  controller?.beginDrag();
  if(event.pointerType!=="touch")button.setPointerCapture(event.pointerId);
 });
 button.addEventListener("pointermove",event=>{
  const box=button.getBoundingClientRect();
  controller?.setPointer((event.clientX-box.left)/box.width*2-1,(event.clientY-box.top)/box.height*2-1);
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.hypot(dx,dy)>8)moved=true;
  if(!drag.horizontal&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)*1.3)drag.horizontal=true;
  if(!drag.touch||drag.horizontal){
   button.dataset.dragging="";
   controller?.drag(event.clientX-drag.lastX,Math.max(.008,(event.timeStamp-drag.lastT)/1000));
  }
  drag.lastX=event.clientX;drag.lastT=event.timeStamp;
 },{passive:true});
 const release=(event:PointerEvent)=>{
  if(drag?.id!==event.pointerId)return;
  if(drag.touch)controller?.setPointer(0,0);
  controller?.endDrag();drag=null;delete button.dataset.dragging;
 };
 button.addEventListener("pointerup",release);
 button.addEventListener("pointercancel",event=>{moved=true;release(event)});
 button.addEventListener("lostpointercapture",release);
 button.addEventListener("pointerleave",()=>{if(!drag)controller?.setPointer(0,0)});
 const observer=new IntersectionObserver(entries=>{
  visible=entries[0]?.isIntersecting??false;
  if(visible)void mount();sync();
 },{threshold:.015,rootMargin:"35px"});
 observer.observe(host);
 document.addEventListener("visibilitychange",sync);
 document.querySelectorAll("dialog").forEach(dialog=>new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:["open"]}));
 new MutationObserver(()=>{controller?.setDark(root.dataset.theme==="dark");localize()}).observe(root,{attributes:true,attributeFilter:["data-theme","lang"]});
 reduced.addEventListener("change",()=>{if(!reduced.matches&&visible)void mount();sync()});
 window.addEventListener("pageshow",sync);
 window.addEventListener("pagehide",event=>{controller?.setPlaying(false);if(!event.persisted){disposed=true;observer.disconnect();controller?.dispose()}});
 localize();sync();
}

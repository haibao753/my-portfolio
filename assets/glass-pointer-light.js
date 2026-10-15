/* Shared viewport pointer light for every glass surface.
 * Mouse illumination follows hover position; touch exists only while held.
 * Passive listeners preserve scrolling and never intercept menu links.
 */
let pointer=null;
const subscribers=new Set();
let frame=0;
function notify(){
 if(frame)return;
 frame=requestAnimationFrame(()=>{frame=0;for(const cb of subscribers)cb()});
}
const coarse=matchMedia('(pointer:coarse)');
addEventListener('pointermove',e=>{
 if(e.pointerType==='mouse'&&!coarse.matches||e.pointerType==='touch'&&pointer?.id===e.pointerId){
  pointer={x:e.clientX,y:e.clientY,id:e.pointerId,type:e.pointerType};notify();
 }
},{passive:true});
addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'||e.pointerType==='pen'){pointer={x:e.clientX,y:e.clientY,id:e.pointerId,type:e.pointerType};notify()}
},{passive:true});
function release(e){if(pointer?.id===e.pointerId&&pointer.type!=='mouse'){pointer=null;notify()}}
addEventListener('pointerup',release,{passive:true});
addEventListener('pointercancel',release,{passive:true});
addEventListener('blur',()=>{pointer=null;notify()});
export function glassPointerFor(element){
 const rect=element.getBoundingClientRect();
 if(!pointer)return {pointerLightPosition:[-5,-5],pointerLightActive:0};
 const x=(pointer.x-rect.left)/Math.max(rect.width,1);
 const y=1-(pointer.y-rect.top)/Math.max(rect.height,1);
 const dx=Math.max(rect.left-pointer.x,0,pointer.x-rect.right);
 const dy=Math.max(rect.top-pointer.y,0,pointer.y-rect.bottom);
 return {pointerLightPosition:[x,y],pointerLightActive:Math.hypot(dx,dy)<100?1:0};
}
export function subscribeGlassPointer(callback){subscribers.add(callback);return ()=>subscribers.delete(callback)}

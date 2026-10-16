/* Explicit, origin-clean snapshots supplied by the sculpture after rendering.
 * This supplements the DOM adapter; it is not a browser-compositor capture. */
export function sceneCanvases(root,rect){
 return Array.from(root.querySelectorAll('canvas[data-optical-media]')).flatMap(canvas=>{
  if(canvas.hidden)return [];
  const bounds=canvas.getBoundingClientRect();
  if(!bounds.width||!bounds.height||bounds.right<=rect.left||bounds.left>=rect.right||bounds.bottom<=rect.top||bounds.top>=rect.bottom)return [];
  return [{canvas,bounds}];
 });
}
export function paintSceneCanvases(ctx,media,rect){
 for(const {canvas,bounds} of media){
  if(!canvas.opticalFrame)continue;
  ctx.drawImage(canvas.opticalFrame,bounds.left-rect.left,bounds.top-rect.top,bounds.width,bounds.height);
 }
}
export function mediaDamage(media,rect){
 const left=Math.max(0,Math.floor(Math.min(...media.map(m=>m.bounds.left))-rect.left-2));
 const top=Math.max(0,Math.floor(Math.min(...media.map(m=>m.bounds.top))-rect.top-2));
 const right=Math.min(rect.width,Math.ceil(Math.max(...media.map(m=>m.bounds.right))-rect.left+2));
 const bottom=Math.min(rect.height,Math.ceil(Math.max(...media.map(m=>m.bounds.bottom))-rect.top+2));
 return {x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}

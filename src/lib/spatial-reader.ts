/* J.H. LAB knowledge space — a small, honest WebGL map of the current list.
 *
 * What the map encodes is deliberately modest and explained in the UI:
 *   - x/z: topic clusters (topics evenly placed around a ring)
 *   - y:   recency of the current list order (newest higher)
 *   - colour: topic
 *   - edges: consecutive same-topic items and duplicated sources
 * There is no semantic embedding: if the data cannot support it, we do not fake it.
 */
const dialog=document.querySelector<HTMLDialogElement>("#spatial-dialog");
const launch=document.querySelector<HTMLButtonElement>("#spatial-open");
const dismiss=document.querySelector<HTMLButtonElement>("#spatial-close");
const viewport=document.querySelector<HTMLElement>(".spatial-viewport");
const scene=document.querySelector<HTMLElement>("#spatial-scene");
const status=document.querySelector<HTMLElement>("#spatial-state");
const tooltip=document.querySelector<HTMLElement>("[data-spatial-tooltip]");
const reduced=matchMedia("(prefers-reduced-motion: reduce)");

type Topic={name:string;color:[number,number,number];center:[number,number]};
type Point={x:number;y:number;z:number;topic:string;title:string;source:string;date:string;article:HTMLElement;color:[number,number,number]};
type Edge={a:number;b:number;color:[number,number,number];alpha:number};

let points:Point[]=[];
let edges:Edge[]=[];
let topics:Topic[]=[];
let selected=0;
let hovered=-1;
let yaw=.42,pitch=.2,zoom=3.5;
let gl:WebGLRenderingContext|null=null;
let canvas:HTMLCanvasElement|null=null;
let program:WebGLProgram|null=null;
let lineBuffer:WebGLBuffer|null=null;
let pointBuffer:WebGLBuffer|null=null;
let positionLoc=-1,sizeLoc=-1,colorLoc=-1,projectionLoc:WebGLUniformLocation|null=null;
let projection:number[][]=[];
let lastFocus:HTMLElement|null=null;
let isOpen=false;
let drag:{x:number;y:number;id:number;startX:number;startY:number;moved:number}|null=null;
let pointers=new Map<number,{x:number;y:number}>();
let pinch:number|null=null;
let resize:ResizeObserver|null=null;

const PALETTE:[number,number,number][]=[
 [.38,.64,.96],[.97,.66,.38],[.56,.83,.55],[.86,.5,.82],
 [.94,.84,.42],[.42,.86,.86],[.92,.58,.58],[.66,.58,.98],
 [.72,.84,.42],[.98,.6,.72]
];

function compile(context:WebGLRenderingContext,kind:number,source:string){
 const shader=context.createShader(kind);
 if(!shader)throw Error("Shader unavailable");
 context.shaderSource(shader,source);context.compileShader(shader);
 if(!context.getShaderParameter(shader,context.COMPILE_STATUS))throw Error(context.getShaderInfoLog(shader)||"Shader compile failed");
 return shader;
}
function init(){
 if(!viewport||gl)return !!gl;
 canvas=document.createElement("canvas");
 canvas.className="spatial-webgl";canvas.setAttribute("aria-hidden","true");
 viewport.prepend(canvas);
 gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
 if(!gl){canvas.remove();canvas=null;return false;}
 try{
  const vs=compile(gl,gl.VERTEX_SHADER,"attribute vec3 p; attribute float s; attribute vec3 c; uniform mat4 m; varying vec3 vc; void main(){ vc=c; float depth=max(1.0,m[3][0]-p.z*.32); gl_Position=vec4(p.x*m[0][0]/depth,p.y*m[1][1]/depth,0.0,1.0); gl_PointSize=s; }");
  const fs=compile(gl,gl.FRAGMENT_SHADER,"precision mediump float; varying vec3 vc; void main(){ vec2 q=gl_PointCoord-.5; float d=length(q); if(d>.5)discard; gl_FragColor=vec4(vc,1.0-smoothstep(.34,.5,d)); }");
  program=gl.createProgram();
  if(!program)throw Error("WebGL program unavailable");
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("WebGL linking failed");
  positionLoc=gl.getAttribLocation(program,"p");
  sizeLoc=gl.getAttribLocation(program,"s");
  colorLoc=gl.getAttribLocation(program,"c");
  projectionLoc=gl.getUniformLocation(program,"m");
  lineBuffer=gl.createBuffer();pointBuffer=gl.createBuffer();
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  resize=new ResizeObserver(draw);
  resize.observe(viewport);
  canvas.addEventListener("webglcontextlost",event=>{
   event.preventDefault();gl=null;stop();
   canvas!.hidden=true;
   if(status)status.textContent="图形上下文暂不可用，仍可从下方选择文章。";
  });
  return true;
 }catch{gl=null;canvas.remove();canvas=null;return false;}
}
function positions():number[][]{
 const c=Math.cos(yaw),s=Math.sin(yaw),a=Math.cos(pitch),b=Math.sin(pitch);
 return points.map(p=>{const x=c*p.x-s*p.z,z=s*p.x+c*p.z;return [x,a*p.y-b*z,b*p.y+a*z];});
}
function stop(){
 // Drawing is event-driven; there is no idle animation loop to cancel.
}
function draw(){
 if(!gl||!canvas||!viewport||!program||!lineBuffer||!pointBuffer)return;
 if(!canvas.getClientRects().length)return;
 const box=viewport.getBoundingClientRect();
 const dpr=Math.min(devicePixelRatio||1,1.5);
 const w=Math.max(1,Math.floor(box.width*dpr)),h=Math.max(1,Math.floor(box.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const pos=positions(),scale=Math.min(w,h)*1.02;
 projection=pos.map(([x,y,z])=>{const depth=zoom-z*.32;return [w/2+x*scale/depth,h/2-y*scale/depth,depth];});
 const matrix=new Float32Array([2*scale/w,0,0,0,0,2*scale/h,0,0,0,0,0,0,zoom,0,0,1]);
 const lineVerts:number[]=[];
 for(const edge of edges){
  const a=pos[edge.a],b=pos[edge.b];
  const edgeAlpha=edge.alpha;
  lineVerts.push(a[0],a[1],a[2],edge.color[0]*edgeAlpha,edge.color[1]*edgeAlpha,edge.color[2]*edgeAlpha);
  lineVerts.push(b[0],b[1],b[2],edge.color[0]*edgeAlpha,edge.color[1]*edgeAlpha,edge.color[2]*edgeAlpha);
 }
 const pointVerts:number[]=[];
 points.forEach((point,index)=>{
  const p=pos[index];
  const size=(index===selected?24:index===hovered?18:11)*dpr;
  pointVerts.push(p[0],p[1],p[2],size,point.color[0],point.color[1],point.color[2]);
 });
 gl.useProgram(program);
 gl.uniformMatrix4fv(projectionLoc,false,matrix);
 gl.disableVertexAttribArray(sizeLoc);
 gl.vertexAttrib1f(sizeLoc,1);
 gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lineVerts),gl.DYNAMIC_DRAW);
 gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(positionLoc);
 gl.vertexAttribPointer(colorLoc,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(colorLoc);
 gl.drawArrays(gl.LINES,0,lineVerts.length/6);
 gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pointVerts),gl.DYNAMIC_DRAW);
 gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(positionLoc);
 gl.vertexAttribPointer(sizeLoc,1,gl.FLOAT,false,28,12);gl.enableVertexAttribArray(sizeLoc);
 gl.vertexAttribPointer(colorLoc,3,gl.FLOAT,false,28,16);gl.enableVertexAttribArray(colorLoc);
 gl.drawArrays(gl.POINTS,0,points.length);
}
function cleanTopic(raw:string){
 // The card meta may read "✦ 重点 · 国际科技" / "◇ 论文精读 · AI"; the topic is the tail.
 const parts=raw.split("·").map(part=>part.replace(/[✦◇]/g,"").trim()).filter(Boolean);
 return parts.length?parts[parts.length-1]:"其他";
}
function build(){
 const cards=[...document.querySelectorAll<HTMLElement>("#stories .news-card")].slice(0,36);
 const items=cards.map(card=>{
  const category=cleanTopic(card.querySelector(".news-category")?.textContent||"");
  const meta=[...card.querySelectorAll(".news-meta span")];
  const date=meta.length>1?meta[meta.length-1].textContent||"":"";
  return {
   card,
   category,
   date,
   title:card.querySelector("h3")?.textContent||"未命名资讯",
   source:(card.querySelector(".news-source span")?.textContent||"").trim()
  };
 });
 const topicNames=[...new Set(items.map(item=>item.category))];
 topics=topicNames.map((name,index)=>{
  const angle=(index/Math.max(1,topicNames.length))*Math.PI*2-Math.PI/2;
  const radius=Math.max(1.25,1.05+topicNames.length*.055);
  return {name,color:PALETTE[index%PALETTE.length],center:[Math.cos(angle)*radius,Math.sin(angle)*radius] as [number,number]};
 });
 const byTopic=new Map<string,{item:typeof items[number];order:number}[]>();
 items.forEach((item,order)=>{
  if(!byTopic.has(item.category))byTopic.set(item.category,[]);
  byTopic.get(item.category)!.push({item,order});
 });
 const total=Math.max(1,items.length-1);
 points=items.map((item,order)=>{
  const list=byTopic.get(item.category)!;
  const localIndex=list.findIndex(entry=>entry.order===order);
  const count=Math.max(1,list.length);
  const topic=topics.find(entry=>entry.name===item.category)!;
  const angle=(localIndex/Math.max(1,count))*(Math.PI*2);
  const localRadius=count>1?.34:.001;
  return {
   x:topic.center[0]+Math.cos(angle)*localRadius,
   z:topic.center[1]+Math.sin(angle)*localRadius,
   y:.85-(order/total)*1.7,
   topic:item.category,color:topic.color,title:item.title,source:item.source,date:item.date,article:item.card
  };
 });
 edges=[];
 const seenPairs=new Set<string>();
 const link=(a:number,b:number,alpha:number)=>{
  if(a===b)return;
  const key=a<b?a+"-"+b:b+"-"+a;
  if(seenPairs.has(key))return;seenPairs.add(key);
  edges.push({a,b,color:points[a].color,alpha});
 };
 for(const list of byTopic.values()){
  for(let index=1;index<list.length;index++)link(list[index-1].order,list[index].order,.34);
 }
 const bySource=new Map<string,number[]>();
 points.forEach((point,index)=>{
  if(!point.source)return;
  const group=bySource.get(point.source);
  if(group)group.push(index);else bySource.set(point.source,[index]);
 });
 for(const group of bySource.values()){
  for(let index=1;index<group.length;index++)link(group[index-1],group[index],.22);
 }
}
function paintInspector(){
 if(!scene||!status||!points.length)return;
 const point=points[selected];
 scene.replaceChildren();
 const eyebrow=document.createElement("span");
 eyebrow.className="spatial-label";
 eyebrow.textContent=point.topic+(point.date?" · "+point.date:"");
 const title=document.createElement("strong");
 title.textContent=point.title;
 const button=document.createElement("button");
 button.type="button";button.className="spatial-open-article";
 button.textContent="阅读这篇文章 ↗";
 button.addEventListener("click",()=>openArticle(selected));
 scene.append(eyebrow,title,button);
 status.textContent=(selected+1)+" / "+points.length+" · "+point.topic+(point.date?" · "+point.date:"");
}
function openArticle(index:number){
 const point=points[index];
 if(!point)return;
 dialog?.close();
 point.article.scrollIntoView({behavior:reduced.matches?"instant":"smooth",block:"center"});
 window.setTimeout(()=>{
  const reveal=point.article.querySelector<HTMLButtonElement>(".news-read-toggle");
  if(reveal?.getAttribute("aria-expanded")==="false")reveal.click();
  reveal?.focus({preventScroll:true});
 },reduced.matches?0:560);
}
function focus(index:number){
 if(!points.length)return;
 selected=(index+points.length)%points.length;
 paintInspector();
 draw();
}
function hitTest(clientX:number,clientY:number){
 if(!canvas||!projection.length)return -1;
 const rect=canvas.getBoundingClientRect();
 const dpr=canvas.width/rect.width;
 const x=(clientX-rect.left)*dpr,y=(clientY-rect.top)*dpr;
 let best=-1,distance=28*dpr;
 projection.forEach((entry,index)=>{
  const d=Math.hypot(x-entry[0],y-entry[1]);
  if(d<distance){distance=d;best=index;}
 });
 return best;
}
function showTooltip(index:number,clientX:number,clientY:number){
 if(!tooltip||!viewport)return;
 if(index<0){tooltip.hidden=true;return;}
 const point=points[index];
 tooltip.textContent=point.topic+" · "+point.title;
 tooltip.hidden=false;
 const box=viewport.getBoundingClientRect();
 tooltip.style.left=Math.max(8,Math.min(box.width-160,clientX-box.left+12))+"px";
 tooltip.style.top=Math.max(8,Math.min(box.height-40,clientY-box.top+12))+"px";
}
function resetView(){
 yaw=.42;pitch=.2;zoom=3.5;
 draw();
}
function setZoom(delta:number){
 zoom=Math.max(2.2,Math.min(6.2,zoom+delta));
 draw();
}
function populateAndOpen(){
 build();
 if(!points.length){
  if(status)status.textContent="当前列表没有可探索的资讯。";
  return;
 }
 selected=0;
 dialog?.showModal();
 isOpen=true;
 if(!init()){
  if(status)status.textContent="当前设备无法启动 WebGL；可按 ← / → 选择，打开文章阅读。";
  paintInspector();
  return;
 }
 paintInspector();
 requestAnimationFrame(draw);
 dismiss?.focus();
}
launch?.addEventListener("click",()=>{
 if(!dialog)return;
 lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:launch;
 populateAndOpen();
});
dismiss?.addEventListener("click",()=>dialog?.close());
dialog?.addEventListener("close",()=>{
 isOpen=false;
 if(tooltip)tooltip.hidden=true;
 lastFocus?.focus({preventScroll:true});
});
dialog?.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
// Rotation / selection buttons
dialog?.querySelectorAll<HTMLButtonElement>("[data-rotate]").forEach(button=>{
 button.addEventListener("click",()=>{
  const direction=Number(button.dataset.rotate)<0?-1:1;
  focus(selected+direction);
  yaw+=direction*.18;
  draw();
 });
});
dialog?.querySelectorAll<HTMLButtonElement>("[data-spatial-zoom]").forEach(button=>{
 button.addEventListener("click",()=>setZoom(Number(button.dataset.spatialZoom)>0?-.35:.35));
});
dialog?.querySelector<HTMLButtonElement>("[data-spatial-reset]")?.addEventListener("click",resetView);
// Pointer interaction: drag rotates, a click (no movement) selects, two fingers pinch.
const canvasTarget=viewport;
canvasTarget?.addEventListener("pointerdown",event=>{
 if(!canvas||!isOpen)return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 canvas.setPointerCapture(event.pointerId);
 if(pointers.size===2){
  const [a,b]=[...pointers.values()];
  pinch=Math.hypot(a.x-b.x,a.y-b.y);
  drag=null;
  return;
 }
 drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,id:event.pointerId,moved:0};
});
canvasTarget?.addEventListener("pointermove",event=>{
 if(!canvas||!isOpen)return;
 if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2&&pinch!==null){
  const [a,b]=[...pointers.values()];
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  const delta=(pinch-distance)/90;
  if(Math.abs(delta)>.004)setZoom(delta);
  pinch=distance;
  return;
 }
 if(drag&&drag.id===event.pointerId){
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(drag.moved>4){
   yaw+=dx*.006;
   pitch=Math.max(-.72,Math.min(.72,pitch+dy*.004));
   draw();
  }
  drag.x=event.clientX;drag.y=event.clientY;
  return;
 }
 if(event.pointerType==="mouse"){
  const index=hitTest(event.clientX,event.clientY);
  if(index!==hovered){hovered=index;draw();}
  showTooltip(index,event.clientX,event.clientY);
 }
});
canvasTarget?.addEventListener("pointerup",event=>{
 if(!canvas)return;
 pointers.delete(event.pointerId);
 if(pointers.size<2)pinch=null;
 if(drag&&drag.id===event.pointerId){
  if(drag.moved<8){
   const index=hitTest(event.clientX,event.clientY);
   if(index>=0)focus(index);
  }
  drag=null;
 }
});
canvasTarget?.addEventListener("pointercancel",()=>{pointers.clear();drag=null;pinch=null;});
canvasTarget?.addEventListener("pointerleave",()=>{
 drag=null;pinch=null;pointers.clear();
 if(hovered>=0){hovered=-1;draw();}
 if(tooltip)tooltip.hidden=true;
});
canvasTarget?.addEventListener("wheel",event=>{
 if(!isOpen)return;
 event.preventDefault();
 setZoom(Math.sign(event.deltaY)*.22);
},{passive:false});
dialog?.addEventListener("keydown",event=>{
 if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
  event.preventDefault();
  focus(selected+(event.key==="ArrowLeft"?-1:1));
 }else if(event.key==="Enter"&&scene?.contains(document.activeElement)){
  openArticle(selected);
 }
});
reduced.addEventListener?.("change",()=>{if(reduced.matches&&isOpen)draw()});

export {};

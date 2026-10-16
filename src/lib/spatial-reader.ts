/* J.H. LAB spatial explorer — actual WebGL points/edges + accessible DOM reading. */
const dialog=document.querySelector<HTMLDialogElement>("#spatial-dialog");
const launch=document.querySelector<HTMLButtonElement>("#spatial-open");
const dismiss=document.querySelector<HTMLButtonElement>("#spatial-close");
const viewport=document.querySelector<HTMLElement>(".spatial-viewport");
const scene=document.querySelector<HTMLElement>("#spatial-scene");
const status=document.querySelector<HTMLElement>("#spatial-state");
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
type Point={x:number;y:number;z:number;topic:string;title:string;article:HTMLElement};
let points:Point[]=[],selected=0,yaw=.48,pitch=.22,zoom=3.5,gl:WebGLRenderingContext|null=null,canvas:HTMLCanvasElement|null=null;
let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,positionLoc=-1,sizeLoc=-1,projectionLoc:WebGLUniformLocation|null=null;
let projection:number[][]=[],lastFocus:HTMLElement|null=null,drag:{x:number;y:number;id:number}|null=null,resize:ResizeObserver|null=null;
function compile(gl:WebGLRenderingContext,kind:number,source:string){
 const shader=gl.createShader(kind);if(!shader)throw Error("Shader unavailable");gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||"Shader compile failed");return shader;
}
function init(){
 if(!viewport||gl)return !!gl;
 canvas=document.createElement("canvas");canvas.className="spatial-webgl";canvas.setAttribute("aria-hidden","true");
 viewport.prepend(canvas);gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
 if(!gl){canvas.remove();canvas=null;return false;}
 try{
  const vs=compile(gl,gl.VERTEX_SHADER,"attribute vec3 p; attribute float s; uniform mat4 m; varying float kind; void main(){ gl_Position=m*vec4(p,1.0); gl_PointSize=s; kind=s; }");
  const fs=compile(gl,gl.FRAGMENT_SHADER,"precision mediump float; varying float kind; void main(){ if(kind>1.0){ vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.48)discard; gl_FragColor=vec4(.28,.52,.92,1.0-smoothstep(.28,.48,d)); }else{ gl_FragColor=vec4(.37,.52,.70,.42); }}");
  program=gl.createProgram();if(!program)throw Error("WebGL program unavailable");
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("WebGL linking failed");
  positionLoc=gl.getAttribLocation(program,"p");sizeLoc=gl.getAttribLocation(program,"s");projectionLoc=gl.getUniformLocation(program,"m");
  buffer=gl.createBuffer();gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  resize=new ResizeObserver(draw);resize.observe(viewport);
  canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();gl=null;if(status)status.textContent="图形上下文暂不可用；仍可使用下方按钮浏览文章"});
  return true;
 }catch{gl=null;canvas.remove();canvas=null;return false;}
}
function positions():number[][]{
 const c=Math.cos(yaw),s=Math.sin(yaw),a=Math.cos(pitch),b=Math.sin(pitch);
 return points.map(p=>{const x=c*p.x-s*p.z,z=s*p.x+c*p.z;return [x,a*p.y-b*z,b*p.y+a*z];});
}
function draw(){
 if(!gl||!canvas||!viewport||!program||!buffer)return;
 const box=viewport.getBoundingClientRect();
 const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(box.width*dpr)),h=Math.max(1,Math.floor(box.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const pos=positions(),aspect=w/h,scale=Math.min(w,h)*.72;
 projection=pos.map(([x,y,z])=>{const depth=zoom-z*.32;return [w/2+x*scale/depth,h/2-y*scale/depth,depth];});
 // The same perspective projection used for vertex rendering and hit testing.
 const matrix=new Float32Array([1/zoom/aspect,0,0,0,0,1/zoom,0,0,0,0,0,0,0,0,0,1]);
 const verts:number[]=[];
 const categoryGroup=new Map<string,number[]>();
 points.forEach((p,i)=>categoryGroup.set(p.topic,[...(categoryGroup.get(p.topic)||[]),i]));
 for(const ids of categoryGroup.values())for(let i=1;i<ids.length;i++){const a=pos[ids[i-1]],b=pos[ids[i]];verts.push(a[0],a[1],0,1,b[0],b[1],0,1);}
 const edgeCount=verts.length/4;
 for(let i=0;i<pos.length;i++){const p=pos[i];verts.push(p[0],p[1],0,i===selected?22*dpr:12*dpr);}
 gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);
 gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(positionLoc);
 gl.vertexAttribPointer(sizeLoc,1,gl.FLOAT,false,16,12);gl.enableVertexAttribArray(sizeLoc);
 // Rendering uses orthographic camera projection after actual 3D yaw/pitch rotation.
 gl.uniformMatrix4fv(projectionLoc,false,matrix);
 gl.drawArrays(gl.LINES,0,edgeCount);gl.drawArrays(gl.POINTS,edgeCount,pos.length);
}
function focus(i:number){
 if(!points.length||!scene||!status)return;
 selected=(i+points.length)%points.length;const point=points[selected];
 scene.replaceChildren();const eyebrow=document.createElement("span");eyebrow.className="spatial-label";eyebrow.textContent=point.topic;
 const title=document.createElement("strong");title.textContent=point.title;
 const button=document.createElement("button");button.type="button";button.className="spatial-open-article";button.textContent="阅读这篇文章 ↗";
 button.addEventListener("click",()=>{dialog?.close();point.article.scrollIntoView({behavior:reduced.matches?"instant":"smooth",block:"center"});const reveal=point.article.querySelector<HTMLButtonElement>(".news-read-toggle");if(reveal?.getAttribute("aria-expanded")==="false")reveal.click();reveal?.focus({preventScroll:true});});
 scene.append(eyebrow,title,button);status.textContent=(selected+1)+" / "+points.length+" · "+point.topic;
 draw();
}
function populate(){
 const articles=[...document.querySelectorAll<HTMLElement>("#stories .news-card")].slice(0,30),count=articles.length;
 points=articles.map((article,i)=>{const theta=i*2.399963229728653,rad=.35+1.35*Math.sqrt((i+.5)/Math.max(count,1));
 return {x:Math.cos(theta)*rad,y:(i%5-2)*.24,z:Math.sin(theta)*rad,topic:article.querySelector(".news-category")?.textContent||"探索",title:article.querySelector("h3")?.textContent||"未命名资讯",article};});
 focus(0);
}
function turn(delta:number){yaw+=delta;draw();}
launch?.addEventListener("click",()=>{
 if(!dialog)return;lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:launch;
 populate();dialog.showModal();if(!init()&&status)status.textContent="当前设备无法启动WebGL；可通过方向键选择并进入文章";draw();dismiss?.focus();
});
dismiss?.addEventListener("click",()=>dialog?.close());
dialog?.addEventListener("close",()=>lastFocus?.focus({preventScroll:true}));
dialog?.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
dialog?.querySelectorAll<HTMLButtonElement>("[data-rotate]").forEach(b=>b.addEventListener("click",()=>{focus(selected+(Number(b.dataset.rotate)<0?-1:1));turn(Number(b.dataset.rotate)<0?-.2:.2);}));
viewport?.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,id:e.pointerId};viewport.setPointerCapture(e.pointerId);});
viewport?.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>0){yaw+=dx*.006;pitch=Math.max(-.75,Math.min(.75,pitch+dy*.004));draw();drag.x=e.clientX;drag.y=e.clientY;}});
viewport?.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;const rect=canvas?.getBoundingClientRect();if(rect&&projection.length){const dpr=canvas!.width/rect.width,x=(e.clientX-rect.left)*dpr,y=(e.clientY-rect.top)*dpr;let best=-1,distance=26*dpr;projection.forEach((p,i)=>{const d=Math.hypot(x-p[0],y-p[1]);if(d<distance){distance=d;best=i;}});if(best>=0)focus(best);}drag=null;});
viewport?.addEventListener("wheel",e=>{if(!dialog?.open)return;e.preventDefault();zoom=Math.max(2,Math.min(6,zoom+Math.sign(e.deltaY)*.22));draw();},{passive:false});
dialog?.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();focus(selected+(e.key==="ArrowLeft"?-1:1));}});
reduced.addEventListener?.("change",draw);
export {};

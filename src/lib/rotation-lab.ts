/**
 * J.H. Lab experiment 001: rotation matrices, independent from the camera.
 * Column vectors; "X then Y" means Ry * Rx, not Rx * Ry.
 * No animation loop or external runtime dependency.
 */
type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];
type Order = "xy" | "yx";
const radians = (deg:number) => deg*Math.PI/180;
const rx = (deg:number):Mat3 => {const c=Math.cos(radians(deg)),s=Math.sin(radians(deg));return [[1,0,0],[0,c,-s],[0,s,c]];};
const ry = (deg:number):Mat3 => {const c=Math.cos(radians(deg)),s=Math.sin(radians(deg));return [[c,0,s],[0,1,0],[-s,0,c]];};
const apply = (m:Mat3, v:Vec3):Vec3 => [
 m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],
 m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],
 m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]
];
const multiply = (a:Mat3,b:Mat3):Mat3 => {
 const cols:[Vec3,Vec3,Vec3] = [[b[0][0],b[1][0],b[2][0]],[b[0][1],b[1][1],b[2][1]],[b[0][2],b[1][2],b[2][2]]];
 return [0,1,2].map(i=>cols.map(col=>a[i][0]*col[0]+a[i][1]*col[1]+a[i][2]*col[2]) as Vec3) as Mat3;
};
const composition = (x:number,y:number,order:Order):Mat3 =>
 order==="xy"?multiply(ry(y),rx(x)):multiply(rx(x),ry(y));
const identity=():Mat3=>[[1,0,0],[0,1,0],[0,0,1]];
const stepMatrix=(x:number,y:number,order:Order,stage:number):Mat3=>{
 if(stage===0)return identity();
 if(stage===1)return order==="xy"?rx(x):ry(y);
 return composition(x,y,order);
};
// Physically valid intermediate orientations. A segment is either the first
// or second fixed-world-axis operation. Never linearly interpolate matrix cells.
const partialStep=(x:number,y:number,order:Order,segment:0|1,amount:number):Mat3=>{
 const t=Math.max(0,Math.min(1,amount));
 if(segment===0)return order==="xy"?rx(x*t):ry(y*t);
 return order==="xy"?multiply(ry(y*t),rx(x)):multiply(rx(x*t),ry(y));
};
const norm = (a:Mat3,b:Mat3):number =>
 Math.sqrt(a.reduce((sum,row,i)=>sum+row.reduce((s,v,j)=>s+(v-b[i][j])**2,0),0));
const fmt=(v:number)=>Math.abs(v)<.005?"0.00":v.toFixed(2);
const fmtVec=(v:Vec3)=>"("+v.map(fmt).join(", ")+")";

type Camera={yaw:number;pitch:number};
const camera:Camera={yaw:.58,pitch:-.31};
const verts:Vec3[]=Array.from({length:8},(_,i)=>[(i&1)?-.72:.72,(i&2)?-.72:.72,(i&4)?-.72:.72]);
const faces:{ids:number[];color:string}[]=[
 {ids:[0,2,6,4],color:"#8dbce4"},{ids:[1,5,7,3],color:"#4d8cb5"},
 {ids:[0,4,5,1],color:"#b5d4e9"},{ids:[2,3,7,6],color:"#a1c5df"},
 {ids:[0,1,3,2],color:"#d5e5f0"},{ids:[4,6,7,5],color:"#e6c17a"}
];
function view(v:Vec3):Vec3 {
 const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw);
 const x=c*v[0]+s*v[2],z=-s*v[0]+c*v[2],y=v[1];
 const a=Math.cos(camera.pitch),b=Math.sin(camera.pitch);
 return [x,a*y-b*z,b*y+a*z];
}
function draw(canvas:HTMLCanvasElement,m:Mat3){
 const ctx=canvas.getContext("2d");
 if(!ctx)return;
 const bounds=canvas.getBoundingClientRect();
 const w=Math.max(1,bounds.width),h=Math.max(1,bounds.height);
 const dpr=Math.min(window.devicePixelRatio||1,1.5);
 const pixelW=Math.max(1,Math.round(w*dpr)),pixelH=Math.max(1,Math.round(h*dpr));
 if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const size=Math.min(w,h)*.4;
 const project=(v:Vec3)=>{
  const p=view(v);const k=3.1/(3.1-p[2]*.21);
  return {x:w*.5+p[0]*size*k,y:h*.5-p[1]*size*k,z:p[2]};
 };
 // Rotate all points using the actual SO(3) matrix, then move only the camera for display.
 const transformed=verts.map(v=>project(apply(m,v)));
 const layers=faces.map(f=>({...f,depth:f.ids.reduce((sum,i)=>sum+transformed[i].z,0)/4}));
 layers.sort((a,b)=>a.depth-b.depth);
 ctx.lineWidth=1.5;
 for(const face of layers){
  ctx.beginPath();
  face.ids.forEach((id,i)=>{const p=transformed[id];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
  ctx.closePath();ctx.fillStyle=face.color;ctx.globalAlpha=.84;ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle="#26445e";ctx.stroke();
 }
 const axes:[Vec3,string,string][]=[[[1.25,0,0],"X","#b34f52"],[[0,1.25,0],"Y","#2d806e"],[[0,0,1.25],"Z","#315fa8"]];
 const o=project([0,0,0]);
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="600 12px system-ui";
 for(const [axis,label,color] of axes){
  const end=project(apply(m,axis));
  ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(end.x,end.y);ctx.lineWidth=2.8;ctx.strokeStyle=color;ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(end.x,end.y,4,0,Math.PI*2);ctx.fill();
  ctx.fillText(label,end.x+9,end.y-9);
 }
 // Three labelled face-centre stickers stay on the cube; hide back-facing stickers.
 for(const [normal,label,fill] of [
  [[1,0,0],"X","#ba5555"],[[0,1,0],"Y","#277f6b"],[[0,0,1],"Z","#dc9c35"]
 ] as [Vec3,string,string][]){
  if(view(apply(m,normal))[2]<=.08)continue;
  const center=project(apply(m,normal.map(v=>v*.73) as Vec3));
  ctx.beginPath();ctx.arc(center.x,center.y,12,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#fff";ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="700 11px system-ui";ctx.fillText(label,center.x,center.y+.5);
 }

}
function drawOverlay(canvas:HTMLCanvasElement,a:Mat3,b:Mat3){
 const ctx=canvas.getContext("2d");if(!ctx)return;
 const {width:w,height:h}=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);
 const pixelW=Math.max(1,Math.round(w*dpr)),pixelH=Math.max(1,Math.round(h*dpr));
 if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const size=Math.min(w,h)*.41;
 const project=(v:Vec3)=>{const p=view(v),k=3.1/(3.1-p[2]*.21);return [w*.5+p[0]*size*k,h*.5-p[1]*size*k] as const;};
 const edges:[[number,number],...Array<[number,number]>]=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
 // The outline of a cube can coincide after distinct 90-degree rotations
 // because the cube has rotational symmetries. Distinguish *oriented frames*:
 // the directions of both local X and local Z determine an SO(3) orientation.
 for(const [m,color,series] of [[a,"#236ca9","A"],[b,"#cc7435","B"]] as [Mat3,string,string][]){
  const pts=verts.map(v=>project(apply(m,v)));
  ctx.lineJoin="round";ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.globalAlpha=.28;
  for(const [i,j] of edges){ctx.beginPath();ctx.moveTo(...pts[i]);ctx.lineTo(...pts[j]);ctx.stroke();}
  ctx.globalAlpha=1;
  const origin=project([0,0,0]);
  for(const [axis,label] of [[[1,0,0],"X"],[[0,0,1],"Z"]] as [Vec3,string][]){
   const tip=project(apply(m,axis.map(v=>v*1.24) as Vec3));
   const dx=tip[0]-origin[0],dy=tip[1]-origin[1],len=Math.max(1,Math.hypot(dx,dy));
   const ux=dx/len,uy=dy/len,px=-uy,py=ux;
   ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...tip);
   ctx.strokeStyle=color;ctx.lineWidth=label==="Z"?4:2.5;
   ctx.setLineDash(label==="X"?[6,4]:[]);ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.moveTo(tip[0],tip[1]);
   ctx.lineTo(tip[0]-ux*11+px*5,tip[1]-uy*11+py*5);
   ctx.lineTo(tip[0]-ux*11-px*5,tip[1]-uy*11-py*5);
   ctx.closePath();ctx.fillStyle=color;ctx.fill();
   ctx.font="700 12px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
   const ox=series==="A"?-14:14,oy=series==="A"?-13:14;
   ctx.fillText(series+"·"+label,tip[0]+ox,tip[1]+oy);
  }
 }
}
function initialize(){
 const root=document.querySelector<HTMLElement>("#rotation-lab");if(!root)return;
 const first=root.querySelector<HTMLCanvasElement>("#rotation-xy");
 const second=root.querySelector<HTMLCanvasElement>("#rotation-yx");
 const ax=root.querySelector<HTMLInputElement>("#angle-x"),ay=root.querySelector<HTMLInputElement>("#angle-y");
 const xval=root.querySelector<HTMLElement>("#angle-x-value"),yval=root.querySelector<HTMLElement>("#angle-y-value");
 const v1=root.querySelector<HTMLElement>("#rotation-xy-vector"),v2=root.querySelector<HTMLElement>("#rotation-yx-vector");
 const difference=root.querySelector<HTMLElement>("#rotation-difference");
 const note=root.querySelector<HTMLElement>("#rotation-note");
 const stageNote=root.querySelector<HTMLElement>("#rotation-step-explanation");
 const overlay=root.querySelector<HTMLCanvasElement>("#rotation-overlay");
 const overlayPanel=root.querySelector<HTMLElement>("#rotation-overlay-panel");
 const overlayToggle=root.querySelector<HTMLButtonElement>("#rotation-overlay-toggle");
 const replay=root.querySelector<HTMLButtonElement>("#rotation-replay");
 const stop=root.querySelector<HTMLButtonElement>("#rotation-stop");
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 let stage=2;
 let generation=0;
 let stopSegment:(()=>void)|null=null;
 let playing=false;
 let currentFrame:{a:Mat3;b:Mat3}|null=null;
 if(!first||!second||!ax||!ay||!xval||!yval||!v1||!v2||!difference||!note)return;
 const isEn=()=>document.documentElement.lang==="en";
 const updatePlaybackControls=()=>{
  if(stop)stop.hidden=!playing;
  replay?.setAttribute("aria-disabled",String(playing));
 };
 const paint=(a:Mat3,b:Mat3)=>{
  currentFrame={a,b};
  draw(first,a);draw(second,b);
  if(overlay&&!overlayPanel?.hidden)drawOverlay(overlay,a,b);
 };
 const render=()=>{
  const x=Number(ax.value),y=Number(ay.value);
  xval.textContent=x+"°";yval.textContent=y+"°";
  first.setAttribute("aria-label",isEn()?"3D cube after X then Y; drag to orbit":"先绕 X 后绕 Y 的立方体；拖动改变视角");
  second.setAttribute("aria-label",isEn()?"3D cube after Y then X; drag to orbit":"先绕 Y 后绕 X 的立方体；拖动改变视角");
  const a=stepMatrix(x,y,"xy",stage),b=stepMatrix(x,y,"yx",stage);
  paint(a,b);
  root.querySelectorAll<HTMLButtonElement>("[data-rotation-step]").forEach(button=>{
   button.setAttribute("aria-pressed",String(Number(button.dataset.rotationStep)===stage));
  });
  if(stageNote)stageNote.textContent=(isEn()
   ?["Start: both cubes have the same orientation.","Step 1: left rotates around X, right around Y.","Step 2: left adds Y, right adds X. Compare their final orientations."][stage]
   :["起点：两个立方体姿态完全相同。","第一步：左侧先绕 X 轴，右侧先绕 Y 轴。","第二步：左侧再绕 Y 轴，右侧再绕 X 轴。"][stage]);
  v1.textContent=fmtVec(apply(a,[0,0,1]));v2.textContent=fmtVec(apply(b,[0,0,1]));
  const d=norm(a,b);difference.textContent=fmt(d);
  note.textContent=stage===0
   ?(isEn()?"Both paths start from the same pose. Continue to the first rotation.":"两条路径从相同姿态出发。点击「第一次旋转」继续。")
   :stage===1
   ?(isEn()?"The paths now differ because you performed different first operations. Continue to test whether swapping both operations changes the final result.":"目前两侧做的是不同的第一次操作。继续完成第二次旋转，才能比较交换顺序的最终结果。")
   :d<.0001
   ?(isEn()?"These settings produce the same orientation. Try two nonzero angles.":"当前角度下两种顺序结果相同。试试两个非零角度。")
   :(isEn()?"Changing the order changes the final 3D orientation. Compare the labelled faces.":"交换旋转顺序改变了最终姿态。观察立方体上不同颜色的面标记。");
 };
 // Cancel outstanding frames and pending asynchronous steps before another
 // user action changes the target. No idle animation loop is ever scheduled.
 const cancel=()=>{
  generation++;
  stopSegment?.();
  stopSegment=null;
  playing=false;
  updatePlaybackControls();
 };
 const animateSegment=(segment:0|1,forward:boolean):Promise<boolean>=>new Promise(resolve=>{
  let start:number|null=null,raf=0,finished=false;
  const finish=(ok:boolean)=>{
   if(finished)return;
   finished=true;
   if(raf)cancelAnimationFrame(raf);
   stopSegment=null;
   resolve(ok);
  };
  stopSegment=()=>finish(false);
  const tick=(time:number)=>{
   if(finished)return;
   if(start===null)start=time;
   const progress=Math.min(1,(time-start)/660);
   const eased=progress*progress*(3-2*progress);
   const amount=forward?eased:1-eased;
   const x=Number(ax.value),y=Number(ay.value);
   paint(partialStep(x,y,"xy",segment,amount),partialStep(x,y,"yx",segment,amount));
   if(progress<1)raf=requestAnimationFrame(tick);
   else finish(true);
  };
  raf=requestAnimationFrame(tick);
 });
 const goTo=async(target:number)=>{
  cancel();
  if(reduced.matches){stage=target;render();return;}
  const token=generation;
  while(stage!==target){
   const forward=target>stage;
   const segment=(forward?stage:stage-1) as 0|1;
   if(!await animateSegment(segment,forward) || token!==generation)return;
   stage+=forward?1:-1;
   render();
  }
 };
 const play=async()=>{
  cancel();
  stage=0;render();
  if(reduced.matches){stage=2;render();return;}
  const token=generation;
  playing=true;
  updatePlaybackControls();
  for(const segment of [0,1] as const){
   if(!await animateSegment(segment,true)||token!==generation)return;
   stage=segment+1;
   render();
  }
  if(token===generation){
   playing=false;
   updatePlaybackControls();
  }
 };
 const interrupt=()=>{cancel();render();};
 replay?.addEventListener("click",()=>{if(!playing)void play();});
 stop?.addEventListener("click",interrupt);
 ax.addEventListener("input",()=>{cancel();render();});
 ay.addEventListener("input",()=>{cancel();render();});
 root.querySelectorAll<HTMLButtonElement>("[data-rotation-step]").forEach(button=>button.addEventListener("click",()=>{void goTo(Number(button.dataset.rotationStep));}));
 root.querySelectorAll<HTMLButtonElement>("[data-rotation-preset]").forEach(button=>button.addEventListener("click",()=>{
  cancel();
  ax.value=button.dataset.rotationPreset==="same"?"0":"90";
  ay.value="90";
  stage=2;render();
 }));
 overlayToggle?.addEventListener("click",()=>{
  if(!overlayPanel)return;
  overlayPanel.hidden=!overlayPanel.hidden;
  overlayToggle.setAttribute("aria-expanded",String(!overlayPanel.hidden));
  if(currentFrame)paint(currentFrame.a,currentFrame.b);else render();
 });
 root.querySelector<HTMLButtonElement>("#rotation-reset")?.addEventListener("click",()=>{
  cancel();ax.value="90";ay.value="90";camera.yaw=.58;camera.pitch=-.31;stage=2;render();});
 root.querySelector<HTMLButtonElement>("#rotation-camera-left")?.addEventListener("click",()=>{camera.yaw-=.24;if(currentFrame)paint(currentFrame.a,currentFrame.b);else render();});
 root.querySelector<HTMLButtonElement>("#rotation-camera-right")?.addEventListener("click",()=>{camera.yaw+=.24;if(currentFrame)paint(currentFrame.a,currentFrame.b);else render();});
 for(const canvas of [first,second]){
  let pointer:{id:number;x:number;y:number}|null=null;
  canvas.addEventListener("pointerdown",event=>{
   if(event.pointerType==="mouse"&&event.button!==0)return;
   pointer={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
   if(!pointer||event.pointerId!==pointer.id)return;
   camera.yaw+=(event.clientX-pointer.x)*.009;camera.pitch=Math.max(-1.2,Math.min(1.2,camera.pitch+(event.clientY-pointer.y)*.007));
   pointer.x=event.clientX;pointer.y=event.clientY;
   if(currentFrame)paint(currentFrame.a,currentFrame.b);else render();
  });
  const end=()=>{pointer=null;};
  canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
 }
 const resizer=new ResizeObserver(()=>{
  if(currentFrame)paint(currentFrame.a,currentFrame.b);else render();
 });
 resizer.observe(first);resizer.observe(second);
 new MutationObserver(()=>{
  if(playing)updatePlaybackControls();
  render();
 }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 reduced.addEventListener?.("change",()=>{
  if(reduced.matches){cancel();render();}
 });
 document.addEventListener("visibilitychange",()=>{if(document.hidden){cancel();render();}});
 updatePlaybackControls();
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
export {};

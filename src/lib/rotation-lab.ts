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
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
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
 // White-bordered marker on the +Z face makes orientation visually testable.
 const front=project(apply(m,[0,0,.78]));ctx.beginPath();ctx.arc(front.x,front.y,7,0,Math.PI*2);
 ctx.fillStyle="#ffda72";ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#192e46";ctx.stroke();
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
 if(!first||!second||!ax||!ay||!xval||!yval||!v1||!v2||!difference||!note)return;
 const isEn=()=>document.documentElement.lang==="en";
 const render=()=>{
  const x=Number(ax.value),y=Number(ay.value);
  xval.textContent=x+"°";yval.textContent=y+"°";
  const a=composition(x,y,"xy"),b=composition(x,y,"yx");
  draw(first,a);draw(second,b);
  v1.textContent=fmtVec(apply(a,[0,0,1]));v2.textContent=fmtVec(apply(b,[0,0,1]));
  const d=norm(a,b);difference.textContent=fmt(d);
  note.textContent=d<.0001
   ?(isEn()?"These settings produce the same orientation. Try two nonzero angles.":"当前角度下两种顺序结果相同。试试两个非零角度。")
   :(isEn()?"Changing the order changes the 3D orientation. Compare the marked front face.":"交换旋转顺序会改变空间姿态。比较两个立方体的正面标记。");
 };
 ax.addEventListener("input",render);ay.addEventListener("input",render);
 root.querySelector<HTMLButtonElement>("#rotation-reset")?.addEventListener("click",()=>{
  ax.value="90";ay.value="90";camera.yaw=.58;camera.pitch=-.31;render();});
 root.querySelector<HTMLButtonElement>("#rotation-camera-left")?.addEventListener("click",()=>{camera.yaw-=.24;render();});
 root.querySelector<HTMLButtonElement>("#rotation-camera-right")?.addEventListener("click",()=>{camera.yaw+=.24;render();});
 for(const canvas of [first,second]){
  let pointer:{id:number;x:number;y:number}|null=null;
  canvas.addEventListener("pointerdown",event=>{
   if(event.pointerType==="mouse"&&event.button!==0)return;
   pointer={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
   if(!pointer||event.pointerId!==pointer.id)return;
   camera.yaw+=(event.clientX-pointer.x)*.009;camera.pitch=Math.max(-1.2,Math.min(1.2,camera.pitch+(event.clientY-pointer.y)*.007));
   pointer.x=event.clientX;pointer.y=event.clientY;render();
  });
  const end=()=>{pointer=null;};
  canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
 }
 const resizer=new ResizeObserver(render);resizer.observe(first);resizer.observe(second);
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
export {};

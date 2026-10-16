import * as THREE from "three";

export interface SculptureController{
 setForm(form:number,immediate?:boolean):void;
 setPlaying(value:boolean):void;
 setDark(value:boolean):void;
 setPointer(x:number,y:number):void;
 beginDrag():void;
 drag(dx:number,seconds:number):void;
 endDrag():void;
 dispose():void;
}
type OpticalCanvas=HTMLCanvasElement&{opticalFrame?:HTMLCanvasElement};

export function createSculpture(host:HTMLElement):SculptureController{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const canvas=renderer.domElement as OpticalCanvas;
 canvas.setAttribute("aria-hidden","true");canvas.dataset.opticalMedia="sculpture";
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,40),group=new THREE.Group();
 scene.add(group);
 const key=new THREE.DirectionalLight(0xfff8ed,2.35);key.position.set(-3,4,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa7d9ff,1.15);fill.position.set(4,1,-3);scene.add(fill);
 scene.add(new THREE.AmbientLight(0xe6f0ff,1.15));
 const rim=new THREE.PointLight(0xd4c5ff,12,14);rim.position.set(2.8,1.8,3);scene.add(rim);
 const columns=56,rows=26,count=(columns+1)*(rows+1);
 const positions=new Float32Array(count*3),uvs=new Float32Array(count*2),basis=new Float32Array(count*11);
 const triangles:number[]=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const n=j*(columns+1)+i,u=-Math.PI+i/columns*Math.PI*2,v=-1.1+j/rows*2.2,k=n*11;
  const lat=Math.acos(1-2*(n+.5)/count),lon=n*2.3999632297;
  basis.set([Math.cosh(v)*Math.cos(u),v*.95,Math.cosh(v)*Math.sin(u),
   Math.sinh(v)*Math.sin(u),u*.53,-Math.sinh(v)*Math.cos(u),
   1.72*Math.sin(lat)*Math.cos(lon),1.72*Math.cos(lat),1.72*Math.sin(lat)*Math.sin(lon),u,v],k);
  uvs[n*2]=i/columns;uvs[n*2+1]=j/rows;
  if(i<columns&&j<rows){const a=n,b=a+columns+1;triangles.push(a,b,a+1,b,b+1,a+1)}
 }
 const geometry=new THREE.BufferGeometry();
 const position=new THREE.BufferAttribute(positions,3);position.setUsage(THREE.DynamicDrawUsage);
 const uv=new THREE.BufferAttribute(uvs,2);
 geometry.setAttribute("position",position);geometry.setAttribute("uv",uv);geometry.setIndex(triangles);
 const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute("position",position);pointGeometry.setAttribute("uv",uv);
 const threadGeometry=new THREE.BufferGeometry();
 const strandRows=rows/2+1,strandSides=4,strandCount=strandRows*(columns+1)*strandSides;
 const strandPositions=new Float32Array(strandCount*3),strandUvs=new Float32Array(strandCount*2),strandIndices:number[]=[];
 for(let j=0;j<strandRows;j++)for(let i=0;i<=columns;i++)for(let side=0;side<strandSides;side++){
  const n=(j*(columns+1)+i)*strandSides+side;
  strandUvs[n*2]=i/columns;strandUvs[n*2+1]=j/(strandRows-1);
  if(i<columns){const next=(side+1)%strandSides,a=n,b=(j*(columns+1)+i)*strandSides+next,c=a+strandSides,d=b+strandSides;strandIndices.push(a,c,b,b,c,d)}
 }
 const strandPosition=new THREE.BufferAttribute(strandPositions,3);strandPosition.setUsage(THREE.DynamicDrawUsage);
 threadGeometry.setAttribute("position",strandPosition);threadGeometry.setAttribute("uv",new THREE.BufferAttribute(strandUvs,2));threadGeometry.setIndex(strandIndices);
 const timeUniform={value:0},darkUniform={value:0};
 const palette=`
 varying vec2 vJhUv;
 uniform float uJhTime;
 uniform float uJhDark;
 vec3 jhTint(float phase){
  float p=fract(phase)*4.;
  vec3 a=vec3(.095,.34,.59),b=vec3(.39,.235,.58),c=vec3(.12,.48,.50),d=vec3(.63,.39,.31);
  if(p<1.)return mix(a,b,smoothstep(0.,1.,p));
  if(p<2.)return mix(b,c,smoothstep(1.,2.,p));
  if(p<3.)return mix(c,d,smoothstep(2.,3.,p));
  return mix(d,a,smoothstep(3.,4.,p));
 }
 `;
 function flowingColour(material:THREE.Material,emissive=false){
  material.onBeforeCompile=shader=>{
   shader.uniforms.uJhTime=timeUniform;shader.uniforms.uJhDark=darkUniform;
   shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec2 vJhUv;")
    .replace("#include <begin_vertex>","#include <begin_vertex>\nvJhUv=uv;");
   shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\n"+palette)
    .replace("#include <color_fragment>",`#include <color_fragment>
     float colourPhase=uJhTime*.031+vJhUv.x*.28+vJhUv.y*.13;
     vec3 tint=jhTint(colourPhase)*mix(1.,1.48,uJhDark);
     float glint=pow(.5+.5*sin(vJhUv.x*6.5-vJhUv.y*4.5-uJhTime*.85),22.);
     diffuseColor.rgb*=tint*(1.+glint*.30);`);
   if(emissive)shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>","#include <emissivemap_fragment>\ntotalEmissiveRadiance+=tint*glint*.12;");
  };
  material.customProgramCacheKey=()=>"jh-flowing-colour-"+emissive;
 }
 const satin=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.24,roughness:.36,side:THREE.DoubleSide,transparent:true});
 flowingColour(satin,true);
 const surface=new THREE.Mesh(geometry,satin);surface.frustumCulled=false;group.add(surface);
 const wireMaterial=new THREE.MeshBasicMaterial({color:0xb8d9ed,wireframe:true,transparent:true,opacity:.11,depthWrite:false});
 const wire=new THREE.Mesh(geometry,wireMaterial);wire.scale.setScalar(1.001);wire.frustumCulled=false;group.add(wire);
 const dot=document.createElement("canvas");dot.width=32;dot.height=32;
 const dotContext=dot.getContext("2d")!;const gradient=dotContext.createRadialGradient(16,16,2,16,16,16);
 gradient.addColorStop(0,"rgba(255,255,255,1)");gradient.addColorStop(.58,"rgba(255,255,255,.98)");gradient.addColorStop(1,"rgba(255,255,255,0)");
 dotContext.fillStyle=gradient;dotContext.fillRect(0,0,32,32);
 const dotMap=new THREE.CanvasTexture(dot);
 const pointMaterial=new THREE.PointsMaterial({color:0xffffff,size:.035,map:dotMap,transparent:true,opacity:.04,depthWrite:false,sizeAttenuation:true});
 flowingColour(pointMaterial);
 const points=new THREE.Points(pointGeometry,pointMaterial);points.frustumCulled=false;group.add(points);
 const threadMaterial=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.2,roughness:.4,transparent:true,opacity:0,side:THREE.DoubleSide});
 flowingColour(threadMaterial,true);
 const lines=new THREE.Mesh(threadGeometry,threadMaterial);lines.frustumCulled=false;group.add(lines);
 let form=0,star=0,flow=0,time=0,spin=0,velocity=0,pointerX=0,pointerY=0,targetX=0,targetY=0;
 let frame=0,last=0,playing=false,dragging=false,disposed=false,frames=0,statsAt=0,snapshotAt=0;
 const snapshot=document.createElement("canvas"),snapshotContext=snapshot.getContext("2d");
 function shareOpticalFrame(){
  if(!snapshotContext||playing&&time-snapshotAt<1/24)return;
  snapshotAt=time;
  const r=canvas.getBoundingClientRect();
  const overlaps=Array.from(document.querySelectorAll<HTMLElement>(".glass-nav,[data-menu-panel]:not([hidden])")).some(el=>{
   const b=el.getBoundingClientRect();return r.bottom>b.top-72&&r.top<b.bottom+72&&r.right>b.left-72&&r.left<b.right+72;
  });
  if(!overlaps)return;
  if(snapshot.width!==canvas.width||snapshot.height!==canvas.height){snapshot.width=canvas.width;snapshot.height=canvas.height}
  snapshotContext.clearRect(0,0,snapshot.width,snapshot.height);
  // Copy in this render task before WebGL's default buffer may be discarded.
  snapshotContext.drawImage(canvas,0,0);canvas.opticalFrame=snapshot;
  dispatchEvent(new CustomEvent("jhlab:scene-media",{detail:{canvas}}));
 }
 function draw(){
  if(disposed)return;
  const angle=(.5+.45*Math.sin(time*.24+.78))*Math.PI/2,ca=Math.cos(angle),sa=Math.sin(angle),solid=1-star-flow;
  for(let n=0;n<count;n++){
   const k=n*11,p=n*3,u=basis[k+9],v=basis[k+10],t=n/(count-1);
   const a=u*1.14+v*.56+time*.27,r=1.04+v*.23;
   positions[p]=(basis[k]*sa+basis[k+3]*ca)*solid+basis[k+6]*star+Math.cos(a)*r*flow;
   positions[p+1]=(basis[k+1]*sa+basis[k+4]*ca)*solid+basis[k+7]*star+(t-.5)*3.45*flow;
   positions[p+2]=(basis[k+2]*sa+basis[k+5]*ca)*solid+basis[k+8]*star+Math.sin(a)*r*flow;
  }
  position.needsUpdate=true;
  if(solid>.025)geometry.computeVertexNormals();
  surface.visible=solid>.025;wire.visible=surface.visible;
  satin.opacity=solid*solid;wireMaterial.opacity=solid*.095;
  pointMaterial.opacity=.035+star*.93+flow*.42;pointMaterial.size=.018+star*.105+flow*.022;
  threadMaterial.opacity=flow;lines.visible=flow>.015;
  if(lines.visible){
   for(let j=0;j<strandRows;j++)for(let i=0;i<=columns;i++){
    const p=(j*2*(columns+1)+i)*3,next=(j*2*(columns+1)+Math.min(columns,i+1))*3,previous=(j*2*(columns+1)+Math.max(0,i-1))*3;
    const tx=positions[next]-positions[previous],tz=positions[next+2]-positions[previous+2],length=Math.hypot(tx,tz)||1;
    const nx=-tz/length,nz=tx/length;
    for(let side=0;side<strandSides;side++){
     const a=side/strandSides*Math.PI*2,q=((j*(columns+1)+i)*strandSides+side)*3;
     strandPositions[q]=positions[p]+nx*Math.cos(a)*.012;
     strandPositions[q+1]=positions[p+1]+Math.sin(a)*.012;
     strandPositions[q+2]=positions[p+2]+nz*Math.cos(a)*.012;
    }
   }
   strandPosition.needsUpdate=true;threadGeometry.computeVertexNormals();
  }
  group.rotation.set(.36+pointerY*.15+Math.sin(time*.17)*.1,spin+time*.135,-.22+pointerX*.1);
  group.scale.setScalar(1.08);
  timeUniform.value=time;
  rim.position.x=2.8+pointerX*1.8;rim.position.y=1.8-pointerY;
  renderer.render(scene,camera);frames++;
  if(time-statsAt>.4||!playing){canvas.dataset.frame=String(frames);canvas.dataset.colourPhase=(time*.031%1).toFixed(3);statsAt=time}
  shareOpticalFrame();
 }
 function tick(stamp:number){
  frame=0;if(!playing||disposed)return;
  const dt=last?Math.min(.05,(stamp-last)/1000):1/60;last=stamp;time+=dt;
  const ease=1-Math.exp(-5.4*dt);
  star+=((form===1?1:0)-star)*ease;flow+=((form===2?1:0)-flow)*ease;
  pointerX+=(targetX-pointerX)*(1-Math.exp(-4*dt));pointerY+=(targetY-pointerY)*(1-Math.exp(-4*dt));
  if(!dragging){spin+=velocity*dt;velocity*=Math.exp(-2.7*dt)}
  draw();frame=requestAnimationFrame(tick);
 }
 function resize(){
  if(disposed)return;
  const box=host.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height);
  renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.position.set(0,.1,8.3/Math.min(1,w/h));camera.lookAt(0,0,0);camera.updateProjectionMatrix();draw();
 }
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 resize();host.append(canvas);
 canvas.addEventListener("webglcontextlost",event=>{
  event.preventDefault();playing=false;cancelAnimationFrame(frame);frame=0;canvas.hidden=true;delete canvas.opticalFrame;
  const stage=host.closest<HTMLElement>("[data-curiosity]");if(stage)stage.dataset.renderer="fallback";
  dispatchEvent(new CustomEvent("jhlab:scene-media",{detail:{canvas}}));
 });
 return {
  setForm(value,immediate=false){form=value;if(immediate||!playing){star=form===1?1:0;flow=form===2?1:0;draw()}},
  setPlaying(value){if(disposed||canvas.hidden)return;playing=value;cancelAnimationFrame(frame);frame=0;last=0;if(playing)frame=requestAnimationFrame(tick)},
  setDark(value){darkUniform.value=value?1:0;wireMaterial.color.setHex(value?0xc9e7ff:0xb2d4e8);pointMaterial.color.setHex(value?0xffffff:0x9cb4cf);draw()},
  setPointer(x,y){targetX=Math.max(-1,Math.min(1,x));targetY=Math.max(-1,Math.min(1,y));if(!playing){pointerX=targetX;pointerY=targetY;draw()}},
  beginDrag(){dragging=true;velocity=0},
  drag(dx,seconds){spin+=dx*.007;velocity=Math.max(-2.3,Math.min(2.3,dx*.007/seconds));if(!playing)draw()},
  endDrag(){dragging=false},
  dispose(){disposed=true;playing=false;cancelAnimationFrame(frame);resizeObserver.disconnect();geometry.dispose();pointGeometry.dispose();threadGeometry.dispose();satin.dispose();wireMaterial.dispose();pointMaterial.dispose();threadMaterial.dispose();dotMap.dispose();renderer.dispose();canvas.remove()}
 };
}

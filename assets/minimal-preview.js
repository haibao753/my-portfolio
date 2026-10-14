/* Lightweight, lazy-loaded Three.js minimal-surface teaser. */
const host=document.getElementById("minimal-preview");
if(host){
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const still=host.querySelector(".preview-fallback");
let activated=false,active=false,frame=0,renderer,geo,mesh,scene,camera,ctl,clock;
function cleanup(){active=false;cancelAnimationFrame(frame);if(renderer){renderer.dispose();renderer.domElement.remove()}if(geo)geo.dispose()}
async function mount(){
 if(activated)return;activated=true;
 try{
  const THREE=await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  if(!host.isConnected)return;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
  renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));
  renderer.setClearColor(0x000000,0);
  renderer.domElement.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none";
  renderer.domElement.setAttribute("aria-hidden","true");
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(42,Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight),.1,100);
  camera.position.set(3.5,2.45,4.1);
  const pts=[],inds=[],ns=36,nt=20;
  // Catenoid: a true minimal surface, 36x20 segments only.
  for(let i=0;i<=ns;i++){let u=i/ns*Math.PI*2;for(let j=0;j<=nt;j++){let v=(j/nt*2-1)*1.15;let r=Math.cosh(v);pts.push(r*Math.cos(u),v,r*Math.sin(u));}}
  for(let i=0;i<ns;i++)for(let j=0;j<nt;j++){let a=i*(nt+1)+j,b=a+nt+1;inds.push(a,b,a+1,b,b+1,a+1);}
  geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));geo.setIndex(inds);geo.computeVertexNormals();
  const isDark=()=>document.documentElement.dataset.theme==="dark";
  let material=new THREE.MeshStandardMaterial({color:isDark()?0xe7e7e0:0x373a36,metalness:.22,roughness:.42,side:THREE.DoubleSide,wireframe:false});
  mesh=new THREE.Mesh(geo,material);mesh.scale.setScalar(.95);scene.add(mesh);
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,5);scene.add(light);scene.add(new THREE.AmbientLight(0xffffff,1.45));
  host.appendChild(renderer.domElement);
  if(still)still.style.opacity="0";
  const obs=new MutationObserver(()=>material.color.setHex(isDark()?0xe7e7e0:0x373a36));obs.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  function render(){if(!active||!host.isConnected){active=false;return;}mesh.rotation.y+=.0036;mesh.rotation.x=Math.sin(performance.now()*.00025)*.1;renderer.render(scene,camera);frame=requestAnimationFrame(render);}
  let io=new IntersectionObserver(entries=>{const on=entries[0].isIntersecting&&!document.hidden;if(on&&!active){active=true;render()}else if(!on){active=false;cancelAnimationFrame(frame)}},{threshold:.05});io.observe(host);
  document.addEventListener("visibilitychange",()=>{if(document.hidden){active=false;cancelAnimationFrame(frame)}else if(host.getBoundingClientRect().bottom>0&&host.getBoundingClientRect().top<innerHeight&&!active){active=true;render()}});
  new ResizeObserver(()=>{let w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);if(reduce)renderer.render(scene,camera)}).observe(host);
  if(reduce){active=false;renderer.render(scene,camera);io.disconnect()}
 }catch(err){console.info("Static 3D preview fallback:",err.message);}
}
if(!reduce&&"IntersectionObserver" in window){const io=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){io.disconnect();mount()}},{rootMargin:"120px"});io.observe(host)}
else if(reduce){/* Avoid loading WebGL for reduced-motion visitors: CSS fallback stays visible. */}
else mount();
}

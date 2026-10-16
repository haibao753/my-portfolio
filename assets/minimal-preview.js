/* Progressive enhancement of the always-visible catenoid illustration.
   Never let an unsupported WebGL context turn the card into a blank panel. */
const host=document.getElementById("minimal-preview");
if(host){
 const fallback=host.querySelector(".preview-fallback");
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 let started=false,renderer,geometry,material,mesh,camera,scene;
 let frame=0,visible=false,disposed=false;
 let intersection,visibility,resize,themeObserver;
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function restore(){
  stop();
  host.dataset.geometryState="fallback";
  if(fallback)fallback.style.opacity="1";
  if(renderer){
   renderer.domElement.remove();
   renderer.dispose();
   renderer=null;
  }
  geometry?.dispose();geometry=null;
  material?.dispose();material=null;
  intersection?.disconnect();resize?.disconnect();themeObserver?.disconnect();
  document.removeEventListener("visibilitychange",visibility);
 }
 async function start(){
  if(started)return;started=true;
  if(reduced){host.dataset.geometryState="fallback";return;}
  try{
   const THREE=await import("https://unpkg.com/three@0.160.0/build/three.module.js");
   if(!host.isConnected||disposed)return;
   const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
   if(width<40||height<40)throw Error("Invalid canvas dimensions");
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
   renderer.setSize(width,height,false);
   renderer.setClearColor(0x000000,0);
   renderer.domElement.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none";
   renderer.domElement.setAttribute("aria-hidden","true");
   renderer.domElement.addEventListener("webglcontextlost",event=>{event.preventDefault();restore();},{once:true});
   scene=new THREE.Scene();
   // Always aim at the centre: the old camera was positioned off-axis but
   // looked along -Z, clipping almost all of the model on narrow viewports.
   camera=new THREE.PerspectiveCamera(39,width/height,.1,40);
   camera.position.set(4.7,3.05,6.65);
   camera.lookAt(0,0,0);
   const vertices=[],triangles=[],angular=64,vertical=32;
   for(let i=0;i<=angular;i++){
    const u=i/angular*2*Math.PI;
    for(let j=0;j<=vertical;j++){
     const z=(j/vertical*2-1)*1.1;
     const radius=Math.cosh(z);
     vertices.push(radius*Math.cos(u),z,radius*Math.sin(u));
    }
   }
   for(let i=0;i<angular;i++)for(let j=0;j<vertical;j++){
    const a=i*(vertical+1)+j,b=a+vertical+1;
    triangles.push(a,b,a+1,b,b+1,a+1);
   }
   geometry=new THREE.BufferGeometry();
   geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
   geometry.setIndex(triangles);
   geometry.computeVertexNormals();
   const dark=()=>document.documentElement.dataset.theme==="dark";
   material=new THREE.MeshStandardMaterial({
    color:dark()?0x98d6eb:0x4b95bf,metalness:.12,roughness:.45,
    side:THREE.DoubleSide
   });
   mesh=new THREE.Mesh(geometry,material);
   mesh.rotation.x=.1;
   scene.add(mesh);
   const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(2.5,4.5,6);scene.add(key);
   const fill=new THREE.DirectionalLight(0x7bd6ff,.85);fill.position.set(-4,1,-3);scene.add(fill);
   scene.add(new THREE.AmbientLight(0xe8f6ff,1.0));
   const updateSize=()=>{
    if(!renderer||!camera)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    camera.aspect=w/h;
    // Fit the entire catenoid even in a narrow layout.
    const distance= Math.max(8.7,2.35/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(.68,w/h));
    camera.position.set(distance*.50,distance*.31,distance*.78);
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
   };
   updateSize();
   // Do not hide the illustration until a successful WebGL frame exists.
   renderer.render(scene,camera);
   host.appendChild(renderer.domElement);
   host.dataset.geometryState="webgl";
   if(fallback)fallback.style.opacity="0";
   const tick=()=>{
    if(!visible||!renderer||!host.isConnected||document.hidden){stop();return;}
    mesh.rotation.y+=.0024;
    renderer.render(scene,camera);
    frame=requestAnimationFrame(tick);
   };
   const sync=()=>{
    const should=visible&&!document.hidden;
    if(should&&!frame)tick();
    else if(!should)stop();
   };
   visibility=sync;
   document.addEventListener("visibilitychange",visibility);
   intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05});
   intersection.observe(host);
   resize=new ResizeObserver(()=>{updateSize();if(!visible&&renderer)renderer.render(scene,camera)});
   resize.observe(host);
   themeObserver=new MutationObserver(()=>{material.color.setHex(dark()?0x98d6eb:0x4b95bf);if(!visible&&renderer)renderer.render(scene,camera)});
   themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  }catch(error){
   console.info("Catenoid illustration fallback:",error instanceof Error?error.message:String(error));
   restore();
  }
 }
 host.dataset.geometryState="fallback";
 if(!reduced&&"IntersectionObserver" in window){
  const bootstrap=new IntersectionObserver(entries=>{
   if(entries[0].isIntersecting){bootstrap.disconnect();void start();}
  },{rootMargin:"180px"});
  bootstrap.observe(host);
 }else if(!reduced){void start();}
}

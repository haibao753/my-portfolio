/* J.H. LAB experimental pixel reflection. Enabled by default in preview; ?pixelGlass=0 disables.
 * Text is reconstructed into a Canvas pixel texture; it is NOT a DOM screenshot. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('pixelGlass')==='0')return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const nav=document.querySelector('.glass-nav'),canvas=nav?.querySelector('.nav-pixel-rim');
if(!nav||!canvas)return;
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
if(!gl)return;
const vs='attribute vec2 pos;varying vec2 uv;void main(){uv=vec2((pos.x+1.)*.5,(pos.y+1.)*.5);gl_Position=vec4(pos,0.,1.);}';
const fs='precision mediump float;varying vec2 uv;uniform sampler2D scene;uniform float opacity;uniform vec2 resolution;void main(){float t=clamp(uv.y,0.,1.);float top=pow(smoothstep(.78,1.,t),1.4);float bottom=pow(1.-smoothstep(0.,.20,t),1.4);float sides=pow(1.-smoothstep(0.,.09,min(uv.x,1.-uv.x)),1.6);float corner=length(vec2(min(uv.x,1.-uv.x)*resolution.x,min(t,1.-t)*resolution.y));float radius=26.;float outer=smoothstep(2.,9.,corner);float shell=max(max(top*.13,bottom*.42),sides*.13)*outer;float y=mix(.12,.91,clamp(t/.2,0.,1.));float x=clamp(uv.x+.002*sin(t*7.+uv.x*12.),0.,1.);vec3 col=texture2D(scene,vec2(x,y)).rgb;float ink=max(max(1.-col.r,1.-col.g),1.-col.b);vec3 tint=mix(col,vec3(.10,.14,.19),.12);float alpha=clamp(ink*shell*opacity,0.,.52);gl_FragColor=vec4(tint,alpha);}';
function compile(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error('shader compile');return x}
let program;
try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return}catch{return}
gl.useProgram(program);
const v=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const off=document.createElement('canvas'),ctx=off.getContext('2d');
if(!ctx)return;
nav.dataset.pixelOptics='on';
let scheduled=false;
function paint(){
 scheduled=false;
 const rect=nav.getBoundingClientRect(),width=Math.max(1,Math.round(rect.width-20));
 const dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(rect.height*dpr);
 off.width=width;off.height=126;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,126);
 let found=false;
 // Approximate CSS color blocks and simple gradients before drawing glyphs/images.
 // Elements without their own background do not overwrite the scene texture.
 for(const el of document.querySelectorAll('main *')){
  const b=el.getBoundingClientRect();
  if(b.bottom<rect.bottom-30||b.top>rect.bottom+96||b.right<rect.left||b.left>rect.right)continue;
  const style=getComputedStyle(el);
  const bg=style.backgroundColor;
  if(!bg||bg==='transparent'||bg==='rgba(0, 0, 0, 0)')continue;
  const x=b.left-rect.left-10,y=b.top-rect.bottom+30;
  ctx.save();ctx.fillStyle=bg;ctx.fillRect(x,y,b.width,b.height);ctx.restore();
  found=true;
 }
 // Draw the actual browser-laid-out text fragments rather than guessing one line.
 // Range.getClientRects gives line geometry; individual glyph pixels are rasterized
 // into the texture before WebGL samples them. This is still a reconstruction.
 const candidates=document.querySelectorAll('main *');
 for(const el of candidates){
  const b=el.getBoundingClientRect();
  if(b.bottom<rect.bottom-30||b.top>rect.bottom+95||b.right<rect.left||b.left>rect.right)continue;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  let node,lines=0;
  while((node=walker.nextNode())&&lines<140){
   const text=node.textContent;
   if(!text||!text.trim())continue;
   if(node.parentElement!==el)continue; // Each text node is painted once by its own element.\n   const parent=node.parentElement||el,style=getComputedStyle(parent);
   if(style.visibility==='hidden'||style.display==='none')continue;
   const size=parseFloat(style.fontSize);
   if(!Number.isFinite(size)||size<8)continue;
   const range=document.createRange();
   for(let j=0;j<text.length&&lines<140;j++){
    range.setStart(node,j);range.setEnd(node,j+1);
    const glyph=range.getBoundingClientRect();
    if(glyph.width<.05||glyph.bottom<rect.bottom-25||glyph.top>rect.bottom+95)continue;
    const x=glyph.left-rect.left-10,y=glyph.top-rect.bottom+30;
    ctx.font=style.fontStyle+' '+style.fontWeight+' '+size+'px '+style.fontFamily;
    ctx.fillStyle=style.color;
    ctx.textBaseline='top';ctx.textAlign='left';
    // Keep line spacing and glyph positions from the browser's actual layout.
    ctx.fillText(text[j],x,y);
    found=true;lines++;
   }
  }
 }
 // Real source pixels for same-origin / CORS-approved image assets.
 // Image.decode isn't awaited in a scroll frame: load events request a fresh frame.
 for(const img of document.querySelectorAll('main img')){
  const b=img.getBoundingClientRect();
  if(b.bottom<rect.bottom-30||b.top>rect.bottom+96||b.right<rect.left||b.left>rect.right)continue;
  if(!img.complete||!img.naturalWidth)continue;
  const x=b.left-rect.left-10,y=b.top-rect.bottom+30;
  try{
   ctx.drawImage(img,x,y,b.width,b.height);
   found=true;
  }catch{
   // A tainted source cannot be sampled by WebGL; ignore safely.
  }
 }
 gl.viewport(0,0,canvas.width,canvas.height);
 gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,off)}catch{return}
 gl.uniform1f(gl.getUniformLocation(program,'opacity'),found?1:0);
 gl.uniform2f(gl.getUniformLocation(program,'resolution'),width,rect.height);
 gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(paint)}}
window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});
document.fonts?.ready.then(queue);document.querySelectorAll('main img').forEach(img=>img.addEventListener('load',queue,{once:true}));paint();
window.addEventListener('pagehide',()=>{gl.deleteTexture(texture);gl.deleteProgram(program)},{once:true});
})();
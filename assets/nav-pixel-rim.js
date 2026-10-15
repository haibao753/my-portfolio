/* J.H. LAB experimental pixel reflection. Opt in with ?pixelGlass=1.
 * Text is reconstructed into a Canvas pixel texture; it is NOT a DOM screenshot. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('pixelGlass')!=='1')return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const nav=document.querySelector('.glass-nav'),canvas=nav?.querySelector('.nav-pixel-rim');
if(!nav||!canvas)return;
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
if(!gl)return;
const vs='attribute vec2 pos;varying vec2 uv;void main(){uv=vec2((pos.x+1.)*.5,(pos.y+1.)*.5);gl_Position=vec4(pos,0.,1.);}';
const fs='precision mediump float;varying vec2 uv;uniform sampler2D scene;uniform float opacity;void main(){float y=0.46+uv.y*.24;float twist=.008*sin(uv.x*38.+uv.y*9.)*uv.y;vec4 pixel=texture2D(scene,vec2(clamp(uv.x+twist,0.,1.),y));float ink=1.-dot(pixel.rgb,vec3(.2126,.7152,.0722));float edge=sin(uv.y*3.14159);gl_FragColor=vec4(vec3(.035,.05,.07),clamp(ink*edge*.82*opacity,0.,.80));}';
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
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(14*dpr);
 off.width=width;off.height=112;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,112);
 let found=false;
 for(const el of document.querySelectorAll('main h1,main h2,main h3,main .project-title')){
  const b=el.getBoundingClientRect();
  if(b.bottom<rect.bottom-12||b.top>rect.bottom+75||b.right<rect.left||b.left>rect.right)continue;
  const computed=getComputedStyle(el),size=parseFloat(computed.fontSize),words=el.textContent?.trim();
  if(!words)continue;
  ctx.font=computed.fontWeight+' '+size+'px '+computed.fontFamily;
  ctx.fillStyle=computed.color;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  // Approximate the current rendered line; independent of page screenshot permissions.
  const x=b.left-rect.left-10,y=b.top-rect.bottom+size+34;
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,112);ctx.clip();
  ctx.fillText(words,x,y);ctx.restore();found=true;
 }
 gl.viewport(0,0,canvas.width,canvas.height);
 gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,off);
 gl.uniform1f(gl.getUniformLocation(program,'opacity'),found?1:0);
 gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(paint)}}
window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});
document.fonts?.ready.then(queue);paint();
window.addEventListener('pagehide',()=>{gl.deleteTexture(texture);gl.deleteProgram(program)},{once:true});
})();
/* Standalone optical sampling kernel. Input MUST be a unified origin-clean scene texture.
 * Two interfaces are approximated with a thickness/normal profile; this is not DOM capture. */
export const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D scene;
uniform vec2 resolution;
uniform float strength;
uniform float optical;
uniform float reflectivity;
vec2 sampleDirection(vec2 p,float eta){
 vec2 q=p*2.-1.;
 // Rounded capsule: optically active meniscus on all sides.
 vec2 edge=vec2(smoothstep(.72,1.,abs(q.x)),smoothstep(.48,1.,abs(q.y)));
 vec2 normal=normalize(vec2(sign(q.x)*edge.x,sign(q.y)*edge.y)+vec2(.0001,.0001));
 float curve=max(edge.x,edge.y);
 vec3 incident=normalize(vec3(0.,0.,-1.)+vec3(q*.12,0.));
 vec3 N=normalize(vec3(normal*curve*.72,1.));
 vec3 bent=refract(incident,N,eta);
 vec3 inner=refract(bent,-N,1./eta);
 vec2 displacement=(bent.xy-inner.xy)*curve*.072*strength;
 return displacement;
}
void main(){
 vec2 displacement=sampleDirection(uv,1./1.48);
 vec2 rUV=clamp(uv+displacement*1.012,0.,1.);
 vec2 gUV=clamp(uv+displacement,0.,1.);
 vec2 bUV=clamp(uv+displacement*.988,0.,1.);
 vec4 sr=texture2D(scene,rUV);
 vec4 sg=texture2D(scene,gUV);
 vec4 sb=texture2D(scene,bUV);
 vec3 pixel=vec3(sr.r,sg.g,sb.b);
 float coverage=max(sr.a,max(sg.a,sb.a));
 vec2 q=abs(uv*2.-1.);
 float border=max(smoothstep(.73,1.,q.x),smoothstep(.57,1.,q.y));
 float cosine=clamp(1.-border*.85,0.,1.);
 float f0=pow((1.48-1.)/(1.48+1.),2.);
 float fresnel=f0+(1.-f0)*pow(1.-cosine,5.);
 vec3 highlight=vec3(.98,.99,1.);
 vec3 result=mix(pixel,highlight,clamp(fresnel*reflectivity,0.,.30));
 vec4 original=texture2D(scene,uv);
 vec3 rgb=mix(original.rgb,result,optical);
 float alpha=max(original.a,coverage*optical);
 gl_FragColor=vec4(rgb*alpha,alpha);
}`;
export function setup(gl){
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 // Two textures allow framebuffer-side scroll blits without readback.
 const alternate=gl.createTexture();
 gl.bindTexture(gl.TEXTURE_2D,alternate);
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const readFbo=gl.createFramebuffer();
 let active=tex,spare=alternate;
 let textureWidth=0,textureHeight=0;
 const stats={fullUploads:0,partialUploads:0,skippedUploads:0,uploadedPixels:0,gpuScrolls:0};
 const render=function(source,{strength=1,optical=1,reflectivity=1,dirtyRect=null,unchanged=false,scrollShift=null}={}){
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,active);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  if(source.width!==textureWidth||source.height!==textureHeight){
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   textureWidth=source.width;textureHeight=source.height;
   gl.bindTexture(gl.TEXTURE_2D,spare);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,textureWidth,textureHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.bindTexture(gl.TEXTURE_2D,active);
   stats.fullUploads++;stats.uploadedPixels+=source.width*source.height;
  }else if(scrollShift&&Number.isInteger(scrollShift.y)&&scrollShift.x===0&&Math.abs(scrollShift.y)<textureHeight){
   const dy=scrollShift.y;
   gl.bindFramebuffer(gl.FRAMEBUFFER,readFbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,active,0);
   gl.bindTexture(gl.TEXTURE_2D,spare);
   // CSS y-down displacement is reversed in bottom-origin WebGL texture coordinates.
   gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,Math.max(-dy,0),0,Math.max(dy,0),textureWidth,textureHeight-Math.abs(dy));
   const swap=active;active=spare;spare=swap;
   gl.bindTexture(gl.TEXTURE_2D,active);
   const patch=dirtyRect||{x:0,y:dy<0?textureHeight+dy:0,width:textureWidth,height:Math.abs(dy)};
   const x=Math.max(0,Math.floor(patch.x)),y=Math.max(0,Math.floor(patch.y)),w=Math.min(textureWidth-x,Math.ceil(patch.width)),h=Math.min(textureHeight-y,Math.ceil(patch.height));
   if(w>0&&h>0){
    const pixels=source.getContext('2d').getImageData(x,y,w,h).data;
    const bytes=new Uint8Array(pixels.length);
    for(let row=0;row<h;row++)bytes.set(pixels.subarray(row*w*4,(row+1)*w*4),(h-row-1)*w*4);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texSubImage2D(gl.TEXTURE_2D,0,x,textureHeight-y-h,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
    stats.partialUploads++;stats.uploadedPixels+=w*h;
   }
   stats.gpuScrolls++;
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }else if(unchanged){
   stats.skippedUploads++;
  }else if(dirtyRect){
   const x=Math.max(0,Math.floor(dirtyRect.x)),y=Math.max(0,Math.floor(dirtyRect.y));
   const w=Math.min(source.width-x,Math.ceil(dirtyRect.width)),h=Math.min(source.height-y,Math.ceil(dirtyRect.height));
   if(w>0&&h>0){
    const pixels=source.getContext('2d').getImageData(x,y,w,h).data;
    const patch=new Uint8Array(pixels.length);
    for(let row=0;row<h;row++)patch.set(pixels.subarray(row*w*4,(row+1)*w*4),(h-row-1)*w*4);
    // UNPACK_FLIP_Y_WEBGL does not flip typed arrays; offset is bottom-origin.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texSubImage2D(gl.TEXTURE_2D,0,x,source.height-y-h,w,h,gl.RGBA,gl.UNSIGNED_BYTE,patch);
    stats.partialUploads++;stats.uploadedPixels+=w*h;
   }
  }else{
   gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
   stats.fullUploads++;stats.uploadedPixels+=source.width*source.height;
  }
  gl.bindTexture(gl.TEXTURE_2D,active);
  gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1i(gl.getUniformLocation(program,"scene"),0);gl.uniform2f(gl.getUniformLocation(program,"resolution"),gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1f(gl.getUniformLocation(program,"strength"),strength);
  gl.uniform1f(gl.getUniformLocation(program,"optical"),optical);
  gl.uniform1f(gl.getUniformLocation(program,"reflectivity"),reflectivity);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 };
 render.stats=stats;
 return render;
}

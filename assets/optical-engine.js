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
uniform float liquid;
uniform vec2 surfaceSize;
uniform vec2 sceneSize;
uniform float scenePadding;
uniform float rimOnly;
uniform float reflectionReach;
uniform float reflectionQuality;
vec4 sampleLiquidScene(vec2 coord){return texture2D(scene,clamp((coord*surfaceSize+vec2(scenePadding))/max(sceneSize,vec2(1.)),0.,1.));}
uniform float cornerRadius;
uniform float bevelWidth;
uniform vec2 lightDirection;
// Rounded-box SDF in CSS pixels. The optical thickness goes to zero at the
// outer contour, with a circular meniscus over the inner bevel.
float roundedDistance(vec2 p, vec2 halfSize, float radius){
 vec2 q=abs(p)-(halfSize-vec2(radius));
 return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
}
vec4 liquidPixel(){
 vec2 size=max(surfaceSize,vec2(1.));
 vec2 p=(uv-.5)*size;
 float radius=clamp(cornerRadius,1.,min(size.x,size.y)*.5);
 vec2 halfSize=size*.5;
 float sd=roundedDistance(p,halfSize,radius);
 // SDF gradient provides a continuous outward normal across corners. Finite
 // differences remove the hard switch at the corner-to-straight transition.
 vec2 derivative=vec2(
  roundedDistance(p+vec2(.5,0.),halfSize,radius)-roundedDistance(p-vec2(.5,0.),halfSize,radius),
  roundedDistance(p+vec2(0.,.5),halfSize,radius)-roundedDistance(p-vec2(0.,.5),halfSize,radius));
 // Smooth the SDF gradient at adjacent tangential locations to avoid abrupt
 // normal jumps where straight rails transition into rounded corners.
 vec2 tangent=normalize(vec2(-derivative.y,derivative.x)+vec2(1.e-6));
 vec2 d1=vec2(
  roundedDistance(p+tangent*1.5+vec2(.5,0.),halfSize,radius)-roundedDistance(p+tangent*1.5-vec2(.5,0.),halfSize,radius),
  roundedDistance(p+tangent*1.5+vec2(0.,.5),halfSize,radius)-roundedDistance(p+tangent*1.5-vec2(0.,.5),halfSize,radius));
 vec2 d2=vec2(
  roundedDistance(p-tangent*1.5+vec2(.5,0.),halfSize,radius)-roundedDistance(p-tangent*1.5-vec2(.5,0.),halfSize,radius),
  roundedDistance(p-tangent*1.5+vec2(0.,.5),halfSize,radius)-roundedDistance(p-tangent*1.5-vec2(0.,.5),halfSize,radius));
 vec2 normal=normalize(derivative*.6+(d1+d2)*.2+vec2(1.e-6));
 float width=max(bevelWidth,2.);
 float depth=clamp(-sd/width,0.,1.);
 // Circular-section height: slope diverges as the surface approaches its rim.
 // An epsilon keeps the limit smooth and finite at raster resolution.
 float meniscus=1.-depth;
 float slope=meniscus/sqrt(max(1.-meniscus*meniscus,.045));
 float bending=slope/(1.+slope);
 bending*=smoothstep(0.,1.2,-sd);
 bending*=1.-smoothstep(.82,1.,depth);
 // Thickness-induced refraction using Snell's law. Both directions are
 // normal to the rounded contour; the centre remains undistorted.
 float ior=1.48;
 float incidence=atan(slope);
 float transmitted=asin(clamp(sin(incidence)/ior,0.,.999));
 float nonlinear=sin(incidence-transmitted);
 // Cap spatial displacement to the physical bevel: long-range probing must
 // influence reflection color, not drag whole UI elements into a straight band.
 float travel=min((5.+width*2.4)*strength*nonlinear*bending,width*.68);
 vec2 offset=-normal*travel/size;
 vec2 sampleUV=clamp(uv+offset,0.,1.);
 vec2 chromatic=normal*(.26*strength*bending)/size;
 vec4 red=sampleLiquidScene(clamp(sampleUV+chromatic,0.,1.));
 vec4 green=sampleLiquidScene(sampleUV);
 vec4 blue=sampleLiquidScene(clamp(sampleUV-chromatic,0.,1.));
 vec4 base=sampleLiquidScene(uv);
 vec3 transmittedRGB=vec3(red.r,green.g,blue.b);
 float transmittedAlpha=max(red.a,max(green.a,blue.a));
 // Internal grazing reflection: look back into the source along the surface
 // normal. Mirrored UVs make actual scene geometry visible in the rim rather
 // than substituting a synthetic white specular stripe.
 // Wider environment probe: travel outward through the padded scene, with
 // curvature controlling where the distant reflections originate.
 float reflectionTravel=min((3.+width*1.55)*bending*reflectionReach,max(scenePadding-4.,0.));
 vec2 reflectedUV=uv+normal*reflectionTravel/size;
 vec4 reflected=sampleLiquidScene(reflectedUV);
 // 5 taps along the local curved contour integrate real neighboring scene
 // colors into a continuous reflection band. The inexpensive single-tap
 // path remains available for reduced quality and A/B measurement.
 if(reflectionQuality>.5){
  vec2 tangentReflection=vec2(-normal.y,normal.x);
  vec2 stepUV=tangentReflection*(1.25+3.5*bending)/size;
  vec4 a=sampleLiquidScene(reflectedUV-stepUV*2.);
  vec4 b=sampleLiquidScene(reflectedUV-stepUV);
  vec4 d=sampleLiquidScene(reflectedUV+stepUV);
  vec4 e=sampleLiquidScene(reflectedUV+stepUV*2.);
  reflected=(a+4.*b+6.*reflected+4.*d+e)/16.;
 }
 vec3 N=normalize(vec3(normal*slope,1.));
 float cosine=max(N.z,0.);
 float f0=pow((ior-1.)/(ior+1.),2.);
 float fresnel=f0+(1.-f0)*pow(1.-cosine,5.);
 // Taper reflection smoothly over the bevel: prevents a hard horizontal
 // discontinuity when a bright CTA enters/leaves the sampling footprint.
 float reflectionEnvelope=smoothstep(0.,2.,-sd)*(1.-smoothstep(width*.58,width*.98,-sd));
 float reflectionMix=clamp((fresnel*.82+.08*bending)*reflectivity*reflectionEnvelope,0.,.25);
 vec3 pixel=mix(transmittedRGB,reflected.rgb,reflectionMix*reflected.a);
 // Blend the clear interior back to original pixels before the bevel ends.
 float opticEnvelope=1.-smoothstep(width*.55,width,-sd);
 pixel=mix(base.rgb,pixel,opticEnvelope);
 vec3 light=normalize(vec3(lightDirection,.7));
 float specular=pow(max(dot(N,normalize(light+vec3(0.,0.,1.))),0.),26.);
 pixel+=vec3(.96,.98,1.)*specular*bending*.055*reflectivity;
 float coverage=clamp(.5-sd,0.,1.);
 float alpha=mix(base.a, max(transmittedAlpha,reflected.a*reflectionMix)*coverage,optical);
 // Detached menus only project the optically active curved rim. Their clear
 // centre stays compositor-native instead of duplicating reconstructed DOM.
 float edgeWeight=1.-smoothstep(1.,max(bevelWidth,3.)*.85,-sd);
 alpha*=mix(1.,edgeWeight,rimOnly);
 // Explicit antialiased rounded silhouette. CSS radius alone must not be
 // relied on to clip the WebGL framebuffer: it is always rectangular.
 float silhouette=1.-smoothstep(-.75,.75,sd);
 alpha*=silhouette;
 return vec4(mix(base.rgb,pixel,optical)*alpha,alpha);
}
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
 if(liquid>.5){gl_FragColor=liquidPixel();return;}
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
 const uniforms=Object.fromEntries(['scene','resolution','strength','optical','reflectivity','liquid','surfaceSize','sceneSize','scenePadding','rimOnly','reflectionReach','reflectionQuality','cornerRadius','bevelWidth','lightDirection'].map(name=>[name,gl.getUniformLocation(program,name)]));
 const render=function(source,{strength=1,optical=1,reflectivity=1,liquid=0,surfaceSize=[source.width,source.height],cornerRadius=26,scenePadding=0,rimOnly=0,reflectionReach=1,reflectionQuality=0,bevelWidth=12,lightDirection=[-.55,.85],dirtyRect=null,unchanged=false,scrollShift=null}={}){
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
  gl.uniform1i(uniforms.scene,0);gl.uniform2f(uniforms.resolution,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1f(uniforms.strength,strength);
  gl.uniform1f(uniforms.optical,optical);
  gl.uniform1f(uniforms.reflectivity,reflectivity);
  gl.uniform1f(uniforms.liquid,liquid);
  gl.uniform2f(uniforms.surfaceSize,...surfaceSize);
  gl.uniform2f(uniforms.sceneSize,source.width,source.height);
  gl.uniform1f(uniforms.scenePadding,scenePadding);
  gl.uniform1f(uniforms.rimOnly,rimOnly);
  gl.uniform1f(uniforms.reflectionReach,reflectionReach);
  gl.uniform1f(uniforms.reflectionQuality,reflectionQuality);
  gl.uniform1f(uniforms.cornerRadius,cornerRadius);
  gl.uniform1f(uniforms.bevelWidth,bevelWidth);
  gl.uniform2f(uniforms.lightDirection,...lightDirection);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 };
 render.stats=stats;
 return render;
}

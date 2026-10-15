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
 vec3 pixel=vec3(texture2D(scene,rUV).r,texture2D(scene,gUV).g,texture2D(scene,bUV).b);
 vec2 q=abs(uv*2.-1.);
 float border=max(smoothstep(.73,1.,q.x),smoothstep(.57,1.,q.y));
 float cosine=clamp(1.-border*.85,0.,1.);
 float f0=pow((1.48-1.)/(1.48+1.),2.);
 float fresnel=f0+(1.-f0)*pow(1.-cosine,5.);
 vec3 highlight=vec3(.98,.99,1.);
 vec3 result=mix(pixel,highlight,clamp(fresnel*reflectivity,0.,.30));
 gl_FragColor=vec4(mix(texture2D(scene,uv).rgb,result,optical),1.);
}`;
export function setup(gl){
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 return function render(source,{strength=1,optical=1,reflectivity=1}={}){
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1i(gl.getUniformLocation(program,"scene"),0);gl.uniform2f(gl.getUniformLocation(program,"resolution"),gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1f(gl.getUniformLocation(program,"strength"),strength);
  gl.uniform1f(gl.getUniformLocation(program,"optical"),optical);
  gl.uniform1f(gl.getUniformLocation(program,"reflectivity"),reflectivity);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 };
}

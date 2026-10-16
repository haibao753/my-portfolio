import {vertex} from '/assets/optical-engine.js';

// Three-dimensional extension of the optical kernel: bounded SDF ray marching,
// scene-texture transmission, Snell refraction and Schlick Fresnel reflection.
const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D scene;
uniform vec2 size;
uniform vec4 crop;
uniform vec2 pointer;
uniform float time;
uniform float mode;
uniform float shape;
uniform float pulse;
uniform float journey;
mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float smoothJoin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float field(vec3 p){
 p.xz=turn(time*.12+pointer.x*.20+journey*1.15)*p.xz;
 p.yz=turn(-.36+pointer.y*.16)*p.yz;
 p.xy=turn(.50+sin(time*.21)*.14)*p.xy;
 float wave=sin(p.x*3.+time*.65)*sin(p.y*2.6-time*.42)*sin(p.z*3.1+time*.3)*.055;
 float ring=length(vec2(length(p.xy)-.77,p.z))-.31;
 vec3 q=p;q.xz=turn(1.05)*q.xz;
 float orbit=length(vec2(length(q.xy)-.69,q.z))-.23;
 float joined=smoothJoin(ring,orbit,.24);
 float sphere=length(p*vec3(.88,1.04,1.))-1.02;
 float morph=.5+.5*sin(time*.24+shape*2.0944-1.2+journey*3.4);
 return mix(joined,sphere,morph*.76)+wave+pulse*.05*sin(length(p.xy)*12.-time*5.);
}
vec3 normalAt(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));}
vec3 environment(vec3 r){
 vec3 ink=vec3(.025,.035,.065),cold=vec3(.14,.23,.75),hot=vec3(.91,.28,.10);
 if(mode>.5&&mode<1.5){cold=vec3(.52,.08,.81);hot=vec3(.30,.85,.94);}
 if(mode>1.5){cold=vec3(.22,.57,.16);hot=vec3(.95,.91,.47);}
 vec3 color=mix(ink,cold,smoothstep(-.4,.9,r.y))*.6;
 color+=hot*pow(max(0.,dot(r,normalize(vec3(-1.,-.2,.5)))),8.)*.8;
 float box=smoothstep(.32,.35,r.y)*(1.-smoothstep(.69,.74,r.y));
 float strip=pow(max(0.,1.-abs(r.x*.8+r.z*.2)),36.);
 color+=vec3(.95,.97,1.)*(box*.95+strip*.75);
 color+=vec3(.50,.65,1.)*pow(max(0.,dot(r,normalize(vec3(1.,.3,-.4)))),15.)*.75;
 return color;
}
vec3 plate(vec2 p){return texture2D(scene,clamp(crop.xy+p*crop.zw,vec2(.001),vec2(.999))).rgb;}
void main(){
 vec2 p=(uv-.5)*vec2(size.x/size.y,1.)*(3.25+journey*.65);
 vec3 origin=vec3(0.,0.,4.2),ray=normalize(vec3(p,-4.2));
 float travel=0.;vec3 hit=origin;
 for(int i=0;i<64;i++){hit=origin+ray*travel;float d=field(hit);if(d<.002||travel>6.5)break;travel+=d*.82;}
 if(travel>6.5){gl_FragColor=vec4(0.);return;}
 vec3 n=normalAt(hit),reflected=reflect(ray,n),bent=refract(ray,n,1./1.48);
 float cosine=max(0.,dot(-ray,n));float fresnel=.0375+.9625*pow(1.-cosine,5.);
 vec2 shift=(n.xy*.060+bent.xy*.075);
 vec3 transmitted=vec3(plate(uv+shift*1.025).r,plate(uv+shift).g,plate(uv+shift*.975).b);
 vec3 reflectedScene=plate(uv+reflected.xy*.20);
 vec3 env=environment(reflected);
 vec3 body=mix(transmitted*.82+env*.12,env*.90+reflectedScene*.18,.40+fresnel*.52);
 vec3 key=normalize(vec3(-.8,1.1,2.));
 float spec=pow(max(0.,dot(n,normalize(key-ray))),62.);
 body+=vec3(1.,.98,.94)*spec*.85;
 body+=vec3(.34,.45,.9)*pow(1.-cosine,3.)*.18;
 body=body/(vec3(1.)+body*.25);
 // Fade grazing coverage at the silhouette to keep the bounded, reduced-
 // resolution framebuffer from producing a bright stair-stepped outer rim.
 float coverage=smoothstep(.015,.16,cosine);
 gl_FragColor=vec4(body*coverage,coverage);
}`;

export function setupSculpture(gl){
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.LINEAR);for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
 const u=Object.fromEntries(['scene','size','crop','pointer','time','mode','shape','pulse','journey'].map(name=>[name,gl.getUniformLocation(program,name)]));let revision=-1;
 return (source,state)=>{
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  if(state.revision!==revision){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);revision=state.revision;}
  gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.uniform1i(u.scene,0);gl.uniform2f(u.size,...state.size);gl.uniform4f(u.crop,...state.crop);gl.uniform2f(u.pointer,...state.pointer);
  for(const name of ['time','mode','shape','pulse','journey'])gl.uniform1f(u[name],state[name]??0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 };
}

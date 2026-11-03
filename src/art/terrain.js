import * as THREE from 'three';
import { fbm, smooth } from './noise.js';
import { groundTexture, waterNormal, cloudTexture, canPaint } from './paint.js';
import { mats } from './materials.js';

// Ground, water, sky and distant landscape. The playable plane is almost flat (animals and people walk at y = 0);
// hills rise only outside the reserve so the world feels enclosed by real landscape.
const BOUNDS={cx:9,cz:0,hx:40,hz:28};
export function heightAt(x,z){
 const dx=Math.max(0,Math.abs(x-BOUNDS.cx)-BOUNDS.hx),dz=Math.max(0,Math.abs(z-BOUNDS.cz)-BOUNDS.hz);const d=Math.hypot(dx,dz);
 const micro=(fbm(x*.35,z*.35,0,3,4)-.5)*.06;
 if(d<=0)return micro;
 const k=smooth(0,14,d);const hills=(fbm(x*.045+3,z*.045,0,4,9)*.8+.25)*14;
 return micro*(1-k)+hills*k*k;
}

export const groundFx={uCloudT:{value:0},uCloud:{value:0}};   // drifting cloud shadows: time and strength (0 at night or in rain)
export function buildGround(scene,{tier}){
 const size=130,seg=tier.pixelRatio>1.5?170:120;
 const g=new THREE.PlaneGeometry(size,size,seg,seg);g.rotateX(-Math.PI/2);g.translate(BOUNDS.cx,0,0);
 const p=g.attributes.position;const col=[],sav=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);p.setY(i,heightAt(x,z));
  const n=fbm(x*.09,z*.09,0,4,2),m=fbm(x*.4,z*.4,0,2,8);
  const s=smooth(11,19,x+Math.sin(z*.16)*2.2);sav.push(s);
  const v=.82+n*.3+(m-.5)*.12;
  // hill flanks fade toward cool blue-green so distance reads as atmosphere
  const hh=Math.min(1,p.getY(i)/9);
  col.push(v*(1-hh*.2),v*(1-hh*.08),v*(1-hh*.0)*1.0);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('aSav',new THREE.Float32BufferAttribute(sav,1));g.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,map:canPaint?groundTexture('woodland'):null});
 const texB=canPaint?groundTexture('savanna'):null;
 if(mat.map)mat.map.repeat.set(30,30);if(texB)texB.repeat.set(30,30);
 mat.onBeforeCompile=(s)=>{
  s.uniforms.mapB={value:texB};s.uniforms.uCloudT=groundFx.uCloudT;s.uniforms.uCloud=groundFx.uCloud;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aSav;varying float vSav;varying vec2 vGW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSav=aSav;vGW=(modelMatrix*vec4(position,1.)).xz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D mapB;varying float vSav;varying vec2 vGW;uniform float uCloudT;uniform float uCloud;\nfloat ch(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float cn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(ch(i),ch(i+vec2(1,0)),f.x),mix(ch(i+vec2(0,1)),ch(i+vec2(1,1)),f.x),f.y);}')
   .replace('#include <map_fragment>','#ifdef USE_MAP\n vec4 sA=texture2D(map,vMapUv);vec4 sB=texture2D(mapB,vMapUv);diffuseColor*=mix(sA,sB,vSav);\n#endif\n float cl=cn(vGW*.035+vec2(uCloudT*.012,uCloudT*.006))*.65+cn(vGW*.09-vec2(uCloudT*.02,0.))*.35;diffuseColor.rgb*=1.-uCloud*.30*smoothstep(.48,.72,cl);');
 };
 mat.customProgramCacheKey=()=>'ground3';
 const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;mesh.name='ground';scene.add(mesh);return mesh;
}

// Water: depth-graded, soft-edged, with animated foam, glints and ripples where people and animals move.
const water={tex:null,cache:new Map(),uT:{value:0},uAct:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,0,0))}};
const WATER_CHUNK={
 vert:'varying vec2 vWU;varying vec3 vWP;',
 frag:`varying vec2 vWU;varying vec3 vWP;uniform float uT;uniform vec4 uAct[8];uniform float uDisc;uniform vec3 uDeep;
 float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}`,
};
export function waterMaterial(color='#4f8e98',disc=false){
 const key=color+(disc?'d':'p');if(water.cache.has(key))return water.cache.get(key);
 if(!water.tex&&canPaint){water.tex=waterNormal();water.tex.repeat.set(3,3)}
 const mat=new THREE.MeshStandardMaterial({color,roughness:.1,metalness:.08,transparent:true,opacity:.9,normalMap:water.tex,normalScale:new THREE.Vector2(.9,.9),envMapIntensity:1.6,depthWrite:false});
 mat.onBeforeCompile=sh=>{
  sh.uniforms.uT=water.uT;sh.uniforms.uAct=water.uAct;sh.uniforms.uDisc={value:disc?1:0};sh.uniforms.uDeep={value:new THREE.Color(color).multiplyScalar(.45)};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+WATER_CHUNK.vert).replace('#include <begin_vertex>','#include <begin_vertex>\nvWU=uv;vWP=(modelMatrix*vec4(position,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+WATER_CHUNK.frag)
   .replace('#include <color_fragment>',`#include <color_fragment>
   vec2 q=vWU-.5;float r=uDisc>.5?length(q)*2.:max(abs(q.x),abs(q.y))*2.;
   float depth=1.-smoothstep(.15,.95,r);
   diffuseColor.rgb=mix(diffuseColor.rgb*1.25,uDeep*1.5,depth*.8);
   float wob=vn(vWP.xz*3.+uT*.6)*.06+vn(vWP.xz*9.-uT*.9)*.03;
   float foam=smoothstep(.80,.93,r+wob)*(1.-smoothstep(.95,1.,r+wob*.5));
   float ripple=0.;
   for(int i=0;i<8;i++){vec4 a=uAct[i];if(a.w>0.){float d=distance(vWP.xz,a.xy);ripple+=sin(d*13.-uT*6.)*exp(-d*1.7)*a.w;}}
   float glint=pow(max(vn(vWP.xz*14.+uT*1.3)-.72,0.)*3.5,2.);
   diffuseColor.rgb+=vec3(.9,.95,.9)*(foam*.4+glint*.3)+ripple*.10;
   diffuseColor.a*=mix(.62,.94,depth)*(1.-smoothstep(.93,1.,r))+foam*.2;`);
 };
 mat.customProgramCacheKey=()=>'water2'+(disc?'d':'p');
 water.cache.set(key,mat);return mat;
}
export function updateWater(t){water.uT.value=t;groundFx.uCloudT.value=t;if(water.tex){water.tex.offset.set(t*.012,t*.02)}}
// movers near water make ripples: [{x,z,speed(0-1)}]
export function setWaterActors(list){const u=water.uAct.value;for(let i=0;i<8;i++){const a=list[i];if(a)u[i].set(a.x,a.z,0,Math.min(1,a.speed));else u[i].set(0,0,0,0)}}
export function makeWaterPlane(w,d,{color}={}){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d,1,1),waterMaterial(color,false));m.rotation.x=-Math.PI/2;m.receiveShadow=true;m.renderOrder=1;return m}
export function makeWaterDisc(r,{color,sx=1,sz=1}={}){const m=new THREE.Mesh(new THREE.CircleGeometry(r,48),waterMaterial(color,true));m.rotation.x=-Math.PI/2;m.scale.set(sx,sz,1);m.receiveShadow=true;m.renderOrder=1;return m}

// Sky dome, sun, clouds
export function buildSky(scene){
 const u={top:{value:new THREE.Color('#6fa0cf')},horizon:{value:new THREE.Color('#bfd0c0')},sunDir:{value:new THREE.Vector3(-.4,.8,.45).normalize()},sunColor:{value:new THREE.Color('#ffe3b0')},night:{value:0}};
 const mat=new THREE.ShaderMaterial({uniforms:u,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 vP;uniform vec3 top;uniform vec3 horizon;uniform vec3 sunDir;uniform vec3 sunColor;uniform float night;
  void main(){float h=clamp(vP.y,0.,1.);vec3 c=mix(horizon,top,pow(h,.55));float s=max(dot(normalize(vP),normalize(sunDir)),0.);c+=sunColor*(pow(s,48.)*.55+pow(s,6.)*.14)*(1.-night);
   float below=smoothstep(0.,-.25,vP.y);c=mix(c,horizon*.85,below);
   float st=step(.9965,fract(sin(dot(floor(vP.xz*220.+vP.y*90.),vec2(12.9898,78.233)))*43758.5453))*night*smoothstep(.1,.5,h);c+=vec3(st);
   gl_FragColor=vec4(c,1.);}`});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(160,32,16),mat);dome.renderOrder=-10;dome.frustumCulled=false;scene.add(dome);
 const clouds=new THREE.Group();const ct=canPaint?cloudTexture():null;const cmats=[];
 for(let i=0;i<14;i++){const m=new THREE.MeshBasicMaterial({map:ct,transparent:true,depthWrite:false,fog:false,opacity:.85,color:'#ffffff'});cmats.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(60+((i*37)%40),24+((i*11)%14)),m);const a=i/14*Math.PI*2,r=105+((i*13)%18);pl.position.set(Math.cos(a)*r,34+((i*17)%22),Math.sin(a)*r);pl.lookAt(0,24,0);pl.renderOrder=-9;clouds.add(pl)}
 scene.add(clouds);
 const pmrem=null;
 return {uniforms:u,dome,clouds,cmats,update(dt){clouds.rotation.y+=dt*.0035}};
}

// Distant ridges and a treeline so the horizon is never an empty edge.
export function buildHorizon(scene,fogColor){
 const g=new THREE.Group();
 const tg=new THREE.ConeGeometry(1,1,6);tg.translate(0,.5,0);
 const ridgeMat=new THREE.MeshBasicMaterial({color:fogColor,fog:false,transparent:true,opacity:.8});
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=118+((i*7)%10);const h=16+((i*13)%14);const m=new THREE.Mesh(new THREE.ConeGeometry(18+((i*5)%9),h,5),ridgeMat);m.position.set(BOUNDS.cx+Math.cos(a)*r,h/2-1,Math.sin(a)*r);m.rotation.y=i;g.add(m)}
 const n=170;const trees=new THREE.InstancedMesh(tg,new THREE.MeshStandardMaterial({color:'#3f6a45',roughness:1}),n);
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),c=new THREE.Color();let k=0,tries=0;
 while(k<n&&tries<2000){tries++;const a=Math.random()*Math.PI*2,r=48+Math.random()*34;const x=BOUNDS.cx+Math.cos(a)*r*1.15,z=Math.sin(a)*r*.95;const dx=Math.max(0,Math.abs(x-BOUNDS.cx)-BOUNDS.hx-1),dz=Math.max(0,Math.abs(z)-BOUNDS.hz-1);if(Math.hypot(dx,dz)<2)continue;
  const h=heightAt(x,z);const sc=3+Math.random()*3.5;s.set(sc*.55,sc*1.6,sc*.55);m4.compose(new THREE.Vector3(x,h-.2,z),q,s);trees.setMatrixAt(k,m4);c.set('#3a6a44').offsetHSL((Math.random()-.5)*.04,0,(Math.random()-.5)*.08);trees.setColorAt(k,c);k++}
 trees.count=k;trees.castShadow=false;trees.frustumCulled=false;g.add(trees);scene.add(g);return {group:g,ridgeMat};
}

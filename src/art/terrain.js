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
  s.uniforms.mapB={value:texB};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aSav;varying float vSav;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSav=aSav;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D mapB;varying float vSav;')
   .replace('#include <map_fragment>','#ifdef USE_MAP\n vec4 sA=texture2D(map,vMapUv);vec4 sB=texture2D(mapB,vMapUv);diffuseColor*=mix(sA,sB,vSav);\n#endif');
 };
 mat.customProgramCacheKey=()=>'ground2';
 const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;mesh.name='ground';scene.add(mesh);return mesh;
}

// Water: reflective, slightly translucent, with scrolling painted normals.
const water={mat:null,tex:null};
export function waterMaterial(color='#4f8e98'){
 if(!water.mat){
  const n=canPaint?waterNormal():null;water.tex=n;
  water.mat=new THREE.MeshStandardMaterial({color,roughness:.1,metalness:.08,transparent:true,opacity:.86,normalMap:n,normalScale:new THREE.Vector2(.9,.9),envMapIntensity:1.6});
  if(n)n.repeat.set(3,3);
 }
 return water.mat;
}
export function updateWater(t){if(water.tex){water.tex.offset.set(t*.012,t*.02)}}
export function makeWaterPlane(w,d,{color}={}){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d,1,1),waterMaterial(color));m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m}
export function makeWaterDisc(r,{color,sx=1,sz=1}={}){const m=new THREE.Mesh(new THREE.CircleGeometry(r,40),waterMaterial(color));m.rotation.x=-Math.PI/2;m.scale.set(sx,sz,1);m.receiveShadow=true;return m}

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

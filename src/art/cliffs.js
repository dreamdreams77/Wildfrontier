import * as THREE from 'three';
import { blobGeo, xform, merge } from './meshkit.js';
import { mats } from './materials.js';
import { rng } from './noise.js';

// Rock outcrops and escarpments: tiers of weathered boulders with strata colours, dry grass on top and a damp base.
// Built from the same noise-displaced boulders as the kopje, so they match the rest of the reserve's rock.
const C=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b]};
const BANDS=[['#947a58','#bf9f74'],['#a2835f','#cfb083'],['#907e68','#b8a283'],['#a8946f','#d2c294']];

// returns a list of world-space-ready geometries for one mass centred on x=z=0 with its base at y=0
export function cliffGeos({w,d,h,seed=1,moss=true}){
 const r=rng(seed*31+7),out=[];const tiers=Math.max(2,Math.round(h/1.7));
 for(let t=0;t<tiers;t++){
  const k=t/(tiers-1),shrink=1-.4*k;
  const n=Math.max(2,Math.round((w/2.5)*shrink+.6));
  const band=BANDS[(t+Math.floor(r()*2))%BANDS.length];const top=t===tiers-1;
  for(let i=0;i<n;i++){
   const fx=(i/(n-1)-.5)*w*shrink*.92+(r()-.5)*.7,fz=(r()-.5)*d*.35*shrink;
   const ry=(h/tiers)*(.8+r()*.5),rx=(w/n)*.9*(.8+r()*.5),rz=d*.5*shrink*(.75+r()*.4);
   const y=t*(h/tiers)*.78+ry*.5;
   const hi=top&&moss?C('#b6b472'):C(band[1]);
   const g=blobGeo(rx,ry,rz,{seg:12,noise:.3,freq:1.25,seed:seed*10+t*7+i,low:C(band[0]),high:hi,squash:.25});
   const p=g.attributes.position;for(let v=0;v<p.count;v++)if(p.getY(v)<-ry*.35)p.setY(v,-ry*.35);
   out.push(xform(g,{pos:[fx,y,fz],rot:[0,(r()-.5)*.7,0]}));
  }
 }
 return out;
}
export function cliffMesh(list){
 const m=new THREE.Mesh(merge(list),mats.rock());m.castShadow=true;m.receiveShadow=true;return m;
}
// place a mass's geometries into a parent frame
export const placed=(geos,{x=0,y=0,z=0,rotY=0})=>geos.map(g=>xform(g,{pos:[x,y,z],rot:[0,rotY,0]}));

// Flowing water sheet: streaks fall down the ribbon, foam where it lands. `time` is shared with the other water.
export function fallMaterial(time){
 const m=new THREE.MeshStandardMaterial({color:'#c6e6ec',roughness:.12,metalness:.05,transparent:true,opacity:.92,emissive:'#6fa2ae',emissiveIntensity:.14,depthWrite:false,side:THREE.DoubleSide});
 m.onBeforeCompile=sh=>{
  sh.uniforms.uT=time;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vK;varying vec2 vR;').replace('#include <begin_vertex>','#include <begin_vertex>\nvK=(modelMatrix*vec4(transformed,1.)).xyz;vR=uv;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vK;varying vec2 vR;uniform float uT;float wh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),f.x),f.y);}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
   float s1=wn(vec2(vR.x*9.,vK.y*1.3+uT*3.6)),s2=wn(vec2(vR.x*19.+3.,vK.y*2.1+uT*5.2));
   float streak=smoothstep(.42,.85,s1*.6+s2*.5);
   float edge=smoothstep(0.,.18,vR.x)*smoothstep(1.,.82,vR.x);
   float foam=smoothstep(.9,0.,vK.y);
   diffuseColor.rgb=mix(diffuseColor.rgb*.82,vec3(1.),clamp(streak*.8+foam*.6,0.,1.));
   diffuseColor.a*=(.7+.25*streak)*(.55+.45*edge);`);
 };
 m.customProgramCacheKey=()=>'cliff-fall';
 return m;
}
// ribbon following a polyline of [x,y,z] points, `width` wide along x, with uv.x across
export function ribbonGeo(path,width){
 const pos=[],uv=[],idx=[];const n=path.length;
 path.forEach(([x,y,z],i)=>{const k=i/(n-1),w=width*(.85+.3*k);for(const s of [-1,1]){pos.push(x+s*w/2,y,z);uv.push(s<0?0:1,k)}});
 for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

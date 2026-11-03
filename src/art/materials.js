import * as THREE from 'three';
import { canPaint, bodyTexture, furTexture, barkTexture, leafTexture, groundTexture, rockTexture, plankTexture, thatchTexture, shingleTexture, plasterTexture, clothTexture } from './paint.js';

// Shared material factory. Materials are cached by key so thousands of meshes share a handful of GPU programs.
const cache=new Map();
const memo=(k,f)=>{if(!cache.has(k))cache.set(k,f());return cache.get(k)};
let physical=false;export const setPhysical=v=>{physical=v};
const MS=(o)=>physical&&o.sheen!==undefined?new THREE.MeshPhysicalMaterial(o):new THREE.MeshStandardMaterial(Object.fromEntries(Object.entries(o).filter(([k])=>!['sheen','sheenRoughness','sheenColor','clearcoat','clearcoatRoughness'].includes(k))));

export const bodyMaterial=(coat)=>memo('body'+JSON.stringify(coat),()=>{
 const o={vertexColors:true,roughness:.88,metalness:0,sheen:.5,sheenRoughness:.7,sheenColor:new THREE.Color('#ffffff')};
 if(canPaint){o.map=bodyTexture(coat);const f=furTexture();if(f){o.bumpMap=f;o.bumpScale=.6}}
 return MS(o);
});
export const limbMaterial=()=>memo('limb',()=>{const o={vertexColors:true,roughness:.86,metalness:0,sheen:.4,sheenRoughness:.8,sheenColor:new THREE.Color('#ffffff')};if(canPaint){o.bumpMap=furTexture();o.bumpScale=.7}return MS(o)});
export const hardMaterial=()=>memo('hard',()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:0}));
export const eyeMaterial=()=>memo('eye',()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.12,metalness:0}));

// Wind uniforms shared by every swaying material (grass, foliage, reeds).
export const wind={uTime:{value:0},uStrength:{value:.7}};
export function addWind(material,{amp=.05,freq=1.4,heightRef=1,phaseFromPos=true}={}){
 material.onBeforeCompile=(s)=>{
  s.uniforms.uTime=wind.uTime;s.uniforms.uStrength=wind.uStrength;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;uniform float uStrength;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   {vec4 wp=modelMatrix*vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   wp=modelMatrix*instanceMatrix*vec4(transformed,1.0);
   #endif
   float ph=wp.x*.35+wp.z*.27;float h=clamp(transformed.y/${heightRef.toFixed(2)},0.,1.);float w=(sin(uTime*${freq.toFixed(2)}+ph)+.5*sin(uTime*${(freq*2.3).toFixed(2)}+ph*1.7))*uStrength*${amp.toFixed(3)}*h*h;
   transformed.x+=w;transformed.z+=w*.6;}`);
 };
 material.customProgramCacheKey=()=>'wind'+amp+freq+heightRef;
 return material;
}

export const std=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...o});
export const painted=(key,tex,o={})=>memo('p'+key,()=>{const {bump,...rest}=o;const m=new THREE.MeshStandardMaterial({roughness:.92,vertexColors:rest.vertexColors??false,color:rest.color??'#ffffff',...rest});if(canPaint&&tex)m.map=tex();if(bump&&canPaint){m.bumpMap=m.map;m.bumpScale=bump}return m});
export const mats={
 bark:()=>painted('bark',barkTexture,{vertexColors:true,bump:1.2}),
 leaf:()=>memo('leafm',()=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,map:canPaint?leafTexture():null,side:THREE.FrontSide});return addWind(m,{amp:.08,freq:1.5,heightRef:5})}),
 leafDry:()=>memo('leafd',()=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,map:canPaint?leafTexture('#8a9a4a'):null});return addWind(m,{amp:.06,freq:1.2,heightRef:5})}),
 rock:()=>painted('rock',rockTexture,{vertexColors:true,bump:1.5,roughness:.95}),
 plank:(t='#8a6a45')=>painted('plank'+t,()=>plankTexture(t),{vertexColors:true,bump:1}),
 thatch:()=>painted('thatch',thatchTexture,{vertexColors:true,bump:1.2}),
 shingle:(t='#6c5a45')=>painted('shingle'+t,()=>shingleTexture(t),{vertexColors:true,bump:1}),
 plaster:(t='#d8c9a4')=>painted('plaster'+t,()=>plasterTexture(t),{vertexColors:true,bump:.4}),
 cloth:()=>painted('cloth',clothTexture,{vertexColors:true,roughness:.95}),
 plain:()=>memo('plainvc',()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8})),
 metal:()=>memo('metal',()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.6})),
 glass:()=>memo('glass',()=>new THREE.MeshStandardMaterial({color:'#9fc6cf',roughness:.08,metalness:.1,transparent:true,opacity:.35})),
 ground:(k='woodland')=>memo('ground'+k,()=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,map:canPaint?groundTexture(k):null});if(m.map)m.map.repeat.set(26,26);return m}),
};
export const clearMaterialCache=()=>cache.clear();

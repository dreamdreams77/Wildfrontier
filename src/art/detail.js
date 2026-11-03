import * as THREE from 'three';
import { makeRock, makeBush, makeReeds, makeLog, scatterMerged } from './vegetation.js';
import { rng } from './noise.js';
import { canPaint } from './paint.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Ground-level storytelling for the savanna: wet shorelines, lily pads, trampled paths, bare dust patches, termite
// mounds, pebbles and thorn scrub. All of it is merged or decal geometry, so it adds few draw calls.
const POOLS=[[31,7,4.7,3.4],[25.5,8.2,2.6,1.9],[38,-10,5.8,4.2],[37,10,3.4,2.7]];

function softTexture(draw,size=128){
 if(!canPaint)return null;
 const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const radial=(stops)=>softTexture((g,s)=>{const gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);for(const [o,col] of stops)gr.addColorStop(o,col);g.fillStyle=gr;g.fillRect(0,0,s,s)});
// Decals sharing a texture are baked into one mesh, so dozens of patches cost a single draw call.
function decalBatch(tex,opacity=1){
 const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,fog:true});
 const parts=[];
 return {add(w,d,{x,z,y=.045,rot=0}){const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.rotateY(rot);g.translate(x,y,z);parts.push(g)},
  build(){if(!parts.length||!tex)return null;const m=new THREE.Mesh(mergeGeometries(parts,false),mat);m.frustumCulled=false;return m}};
}

export function buildSavannaDetail(scene,art,{F=1,G=1}={}){
 const r=rng(77);const group=new THREE.Group();group.name='savanna-detail';scene.add(group);

 // wet shoreline: dark damp earth fading to dry ground around every pool
 const wet=radial([[0,'rgba(48,36,24,.0)'],[.55,'rgba(54,40,26,.0)'],[.72,'rgba(58,44,30,.55)'],[.9,'rgba(70,54,36,.28)'],[1,'rgba(70,54,36,0)']]);
 {const b=decalBatch(wet);for(const [x,z,rx,rz] of POOLS)b.add(rx*2.9,rz*2.9,{x,z,y:.05});const m=b.build();m&&group.add(m)}

 // lily pads on the waterhole and the lake
 if(canPaint){
  const pad=softTexture((g,s)=>{g.translate(s/2,s/2);g.fillStyle='#4e7f3a';g.beginPath();g.moveTo(0,0);g.arc(0,0,s*.42,.35,Math.PI*2-.12);g.closePath();g.fill();g.strokeStyle='#6c9a50';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(0,0);const a=.6+i*1.1;g.lineTo(Math.cos(a)*s*.36,Math.sin(a)*s*.36);g.stroke()}},64);
  const b=decalBatch(pad,.95);
  for(const [cx,cz,rx,rz,n] of [[31,7,3.0,2.0,9],[38,-10,3.5,2.4,7]])for(let i=0;i<Math.round(n*G+2);i++){
   const a=r()*6.28,k=.35+r()*.5;b.add(.5+r()*.35,.5+r()*.35,{x:cx+Math.cos(a)*rx*k,z:cz+Math.sin(a)*rz*k,y:.1,rot:r()*6});
  }
  const m=b.build();m&&group.add(m);
 }

 // reeds and stones at the water's edge
 const reeds=[],stones=[];
 for(const [cx,cz,rx,rz] of POOLS){
  const n=Math.round(10*F);for(let i=0;i<n;i++){const a=r()*6.28;reeds.push([cx+Math.cos(a)*rx*(.92+r()*.12),0,cz+Math.sin(a)*rz*(.92+r()*.12),r()*6,.7+r()*.5])}
  for(let i=0;i<Math.round(12*F);i++){const a=r()*6.28;stones.push([cx+Math.cos(a)*rx*(.88+r()*.2),0,cz+Math.sin(a)*rz*(.88+r()*.2),r()*6,.08+r()*.14])}
 }
 group.add(scatterMerged(i=>makeReeds(i+200,4),reeds));
 group.add(scatterMerged(i=>makeRock(i+300,{size:1,mossy:false}),stones));

 // trampled earth: the gate to the deck, around the waterholes and between enclosures
 const trail=softTexture((g,s)=>{g.clearRect(0,0,s,s);for(let i=0;i<260;i++){const x=r()*s,y=s*.5+(r()-.5)*s*.42*(1-Math.abs(x/s-.5)*.5);g.fillStyle='rgba('+(120+r()*24|0)+','+(92+r()*18|0)+','+(62+r()*14|0)+','+(.05+r()*.12)+')';g.beginPath();g.arc(x,y,2+r()*5,0,6.3);g.fill()}},128);
 const legs=[[17.5,.6,26,5.8],[26,5.8,31,3.2],[26,5.8,24,-4],[22,1,21,11],[31,3.2,38,-3]];
 {const b=decalBatch(trail);for(const [x1,z1,x2,z2] of legs){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);b.add(len*1.05,2.0,{x:(x1+x2)/2,z:(z1+z2)/2,y:.04,rot:Math.atan2(dz,dx)*-1})}const m=b.build();m&&group.add(m)}

 // bare dust patches break up the uniform dry grass
 const dust=radial([[0,'rgba(176,130,86,.55)'],[.6,'rgba(168,124,82,.28)'],[1,'rgba(160,118,76,0)']]);
 {const b=decalBatch(dust);for(let i=0;i<Math.round(16*G+4);i++){const x=18+r()*26,z=-18+r()*36;if(POOLS.some(([cx,cz,rx,rz])=>((x-cx)/(rx+1))**2+((z-cz)/(rz+1))**2<1))continue;b.add(3+r()*4,2.5+r()*3,{x,z,y:.03+r()*.004,rot:r()*6})}const m=b.build();m&&group.add(m)}

 // termite mounds, pebbles, thorn scrub and dead branches
 const moundMat=new THREE.MeshStandardMaterial({color:'#8d6a48',roughness:1});const mounds=[];
 const profile=[[0,1.0],[.07,.9],[.13,.62],[.2,.36],[.3,.16],[.38,0]].map(([rad,h])=>new THREE.Vector2(rad+.02,h*1.1));
 for(let i=0;i<Math.round(7*F);i++){const x=19+r()*24,z=-17+r()*34;if(POOLS.some(([cx,cz,rx,rz])=>((x-cx)/(rx+1))**2+((z-cz)/(rz+1))**2<1))continue;
  const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.x*(1.4+r()*.8),p.y*(.8+r()*.9)*.7)).reverse(),8);g.translate(x,0,z);mounds.push(g)}
 if(mounds.length){const m=new THREE.Mesh(mergeGeometries(mounds,false),moundMat);m.castShadow=m.receiveShadow=true;group.add(m)}
 const peb=[];for(let i=0;i<Math.round(90*G);i++)peb.push([17+r()*28,0,-19+r()*38,r()*6,.05+r()*.1]);
 group.add(scatterMerged(i=>makeRock(i+400,{size:1,mossy:false}),peb));
 const scrub=[];for(let i=0;i<Math.round(14*F);i++){const x=18+r()*25,z=-18+r()*37;if(POOLS.some(([cx,cz,rx,rz])=>((x-cx)/(rx+1.5))**2+((z-cz)/(rz+1.5))**2<1))continue;scrub.push([x,0,z,r()*6,.5+r()*.4])}
 group.add(scatterMerged(i=>makeBush(i+500,{scale:.7}),scrub));
 const wood=[];for(let i=0;i<Math.round(6*F);i++)wood.push([19+r()*24,0,-16+r()*32,r()*3,.7+r()*.4]);
 group.add(scatterMerged(i=>makeLog(i+600,1.0+(i%3)*.3),wood));
 art.detail=group;return group;
}

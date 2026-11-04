import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { waterTime, makeWaterDisc } from './terrain.js';
import { fallsLayout, ridgeLayout, bridgeLayout } from './kenney-layout.js';
import { cliffGeos, cliffMesh, placed, fallMaterial, ribbonGeo } from './cliffs.js';
import { blobGeo, xform } from './meshkit.js';
import { mats } from './materials.js';

// Creek landmarks. The waterfall and the cliffs are built from our own weathered boulders (the Kenney cliff blocks read
// as flat cardboard boxes next to the rest of the reserve). The plank bridges are Kenney Nature Kit models (CC0,
// https://kenney.nl), re-tinted to the reserve's timber.
const urls=import.meta.glob('../assets/kenney/bridge_*.glb',{query:'?url',import:'default',eager:true});
const urlOf=name=>urls['../assets/kenney/'+name+'.glb'];

const TIMBER={wood:'#a47a4a',woodBark:'#6a4a2d',stone:'#8a7a60'};
const woodMats=new Map();
function timber(name){
 if(!woodMats.has(name))woodMats.set(name,new THREE.MeshStandardMaterial({color:TIMBER[name]||TIMBER.wood,roughness:.88,metalness:0}));
 return woodMats.get(name);
}

function mistPoints(){
 const n=34;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
 const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);
 const p=new THREE.Points(g,new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),color:'#eef6f6',size:1.4,transparent:true,opacity:.45,depthWrite:false,sizeAttenuation:true}));
 p.frustumCulled=false;const seeds=Array.from({length:n},(_,i)=>({a:i*2.399,ph:i*.37}));
 p.userData.update=t=>{const a=g.attributes.position;seeds.forEach((s,i)=>{const k=(t*.3+s.ph)%1;a.setXYZ(i,Math.cos(s.a)*(.5+k*1.7),.25+k*2.3,Math.sin(s.a)*.6+k*.5)});a.needsUpdate=true};
 return p;
}

export function buildFalls(){
 const L=fallsLayout();const root=new THREE.Group();root.position.set(L.origin.x,0,L.origin.z);root.rotation.y=L.origin.rotY;
 const geos=[];
 for(const m of L.masses)geos.push(...placed(cliffGeos({w:m.w,d:m.d,h:m.h,seed:m.seed}),{x:m.x,z:m.z}));
 for(const l of L.ledges)geos.push(xform(blobGeo(l.r*1.3,l.r*.8,l.r,{seg:10,noise:.3,seed:Math.round(l.x*10+l.y),low:[.45,.4,.34],high:[.7,.65,.55],squash:.3}),{pos:[l.x,l.y,l.z]}));
 root.add(cliffMesh(geos));
 const sheet=new THREE.Mesh(ribbonGeo(L.ribbon.path,L.ribbon.width),fallMaterial(waterTime));sheet.renderOrder=2;root.add(sheet);
 const pool=makeWaterDisc(L.pool.r,{color:'#6ea8b2',sx:1.2,sz:.9});pool.position.set(L.pool.x,.09,L.pool.z);root.add(pool);
 const mist=mistPoints();mist.position.set(0,0,L.pool.z-1.5);root.add(mist);
 return {root,mist};
}
export function buildRidges(){
 const geos=[];
 for(const m of ridgeLayout())geos.push(...placed(cliffGeos({w:m.w,d:m.d,h:m.h,seed:m.seed}),{x:m.x,z:m.z,rotY:m.rotY}));
 return cliffMesh(geos);
}

export function buildKenneyLandmarks(scene,art,{tier}={}){
 const group=new THREE.Group();group.name='creek-landmarks';scene.add(group);
 const updaters=[];
 art.kenney={group,update:t=>updaters.forEach(f=>f(t)),ready:false,bridges:[]};
 const falls=buildFalls();group.add(falls.root);updaters.push(t=>falls.mist.userData.update(t));art.kenney.falls=falls.root;
 const ridges=buildRidges();group.add(ridges);art.kenney.ridges=ridges;
 const loader=new GLTFLoader();const models=new Map();
 const files=[...new Set(bridgeLayout().flatMap(b=>b.pieces.map(p=>p.file)))];
 return Promise.all(files.map(f=>new Promise(res=>loader.load(urlOf(f),g=>{models.set(f,g.scene);res()},undefined,()=>res())))).then(()=>{
  for(const b of bridgeLayout()){
   const root=new THREE.Group();root.position.set(b.x,.04,b.z);root.rotation.y=b.rotY;
   for(const p of b.pieces){const src=models.get(p.file);if(!src)continue;const o=src.clone(true);
    o.traverse(m=>{if(m.isMesh){m.material=timber(m.material&&m.material.name);m.castShadow=m.receiveShadow=true}});
    o.scale.setScalar(p.scale);o.position.x=p.u;root.add(o)}
   group.add(root);art.kenney.bridges.push(root);
  }
  art.kenney.ready=true;
 });
}

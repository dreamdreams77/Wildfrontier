import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm } from './noise.js';

// Mesh construction toolkit: lofted organic forms, displaced blobs, lathes, automatic skin weights and rigs.
const V=(a,b,c)=>new THREE.Vector3(a,b,c);
const cr=(p0,p1,p2,p3,t)=>.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
export function interp(arr,t){const n=arr.length-1;if(n<=0)return arr[0];const f=Math.min(Math.max(t,0),1)*n,i=Math.min(Math.floor(f),n-1),k=f-i;return cr(arr[Math.max(0,i-1)],arr[i],arr[i+1],arr[Math.min(n,i+2)],k)}

// Sweep an elliptical cross-section along a Catmull-Rom path. Stations: {p:[x,y,z], rx, ry}.
// u runs around the ring (0 = top), v runs along the path (0 = first station, 1 = last).
export function loft(stations,{radial=14,rings=24,cap0=3,cap1=3,color=null,roll=0,upRef=null}={}){
 const pts=stations.map(s=>V(...s.p));const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',.5);
 const rxs=stations.map(s=>s.rx),rys=stations.map(s=>s.ry??s.rx);
 const rows=[];
 const frame=(t)=>{const T=curve.getTangent(t).normalize();let ref=upRef?upRef.clone():V(0,1,0);if(Math.abs(T.dot(ref))>.96)ref=V(0,0,1);const R=V().crossVectors(ref,T).normalize();const U=V().crossVectors(T,R).normalize();return {T,R,U}};
 const ringAt=(t,scale=1,off=0)=>{const P=curve.getPoint(t),{T,R,U}=frame(t);const rx=interp(rxs,t)*scale,ry=interp(rys,t)*scale;P.addScaledVector(T,off);return {P,R,U,rx,ry,t}};
 for(let k=cap0;k>=1;k--){const s=k/cap0;const base=ringAt(0);rows.push(ringAt(0,Math.sqrt(Math.max(0,1-s*s)),-s*Math.max(base.rx,base.ry)*.75))}
 for(let i=0;i<=rings;i++)rows.push(ringAt(i/rings));
 for(let k=1;k<=cap1;k++){const s=k/cap1;const base=ringAt(1);rows.push(ringAt(1,Math.sqrt(Math.max(0,1-s*s)),s*Math.max(base.rx,base.ry)*.75))}
 const n=rows.length,pos=[],uv=[],col=[],idx=[];
 for(let i=0;i<n;i++){const r=rows[i];for(let j=0;j<=radial;j++){const th=j/radial*Math.PI*2+roll;const c=Math.cos(th),s=Math.sin(th);
  const p=r.P.clone().addScaledVector(r.U,c*r.ry).addScaledVector(r.R,s*r.rx);pos.push(p.x,p.y,p.z);uv.push(j/radial,i/(n-1));
  const cc=color?color({t:r.t,top:c*.5+.5,side:Math.abs(s),i,n,j}):[1,1,1];col.push(cc[0],cc[1],cc[2])}}
 for(let i=0;i<n-1;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;idx.push(a,b,a+1,b,b+1,a+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
 g.computeVertexNormals();
 const nrm=g.attributes.normal;for(let i=0;i<n;i++){const a=i*(radial+1),b=a+radial;const x=nrm.getX(a)+nrm.getX(b),y=nrm.getY(a)+nrm.getY(b),z=nrm.getZ(a)+nrm.getZ(b);const l=Math.hypot(x,y,z)||1;nrm.setXYZ(a,x/l,y/l,z/l);nrm.setXYZ(b,x/l,y/l,z/l)}
 return g;
}
export const tube=(points,r0,r1,opts={})=>{const n=points.length;return loft(points.map((p,i)=>({p,rx:r0+(r1-r0)*i/(n-1)})),{radial:10,rings:Math.max(6,n*4),...opts})};

// A displaced sphere: rocks, leaf clumps, bushes, rounded forms. Vertex colours are lit from above.
export function blobGeo(rx,ry,rz,{seg=14,noise=0,freq=2,seed=1,low=[.55,.55,.55],high=[1,1,1],squash=0}={}){
 const g=new THREE.SphereGeometry(1,seg,Math.max(6,Math.round(seg*.7)));const p=g.attributes.position;const col=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=noise?(fbm(x*freq+seed,y*freq+seed*2,z*freq,3,seed)-.5)*2*noise:0;
  const k=1+n;p.setXYZ(i,x*rx*k,(y<0?y*(1-squash):y)*ry*k,z*rz*k);const h=y*.5+.5;col.push(low[0]+(high[0]-low[0])*h,low[1]+(high[1]-low[1])*h,low[2]+(high[2]-low[2])*h)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}
export function lathe(profile,{seg=16,color=null}={}){const g=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),seg);const n=g.attributes.position.count,col=[];for(let i=0;i<n;i++){const c=color?color(i/n):[1,1,1];col.push(...c)}g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return g}
export function xform(g,{pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]}={}){const m=new THREE.Matrix4().compose(V(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),V(...scale));const c=g.clone();c.applyMatrix4(m);return c}
export function tint(g,rgb,amount=1){const c=g.attributes.color;if(!c)return g;for(let i=0;i<c.count;i++)c.setXYZ(i,c.getX(i)+(rgb[0]-c.getX(i))*amount,c.getY(i)+(rgb[1]-c.getY(i))*amount,c.getZ(i)+(rgb[2]-c.getZ(i))*amount);return g}
export function paintColor(g,rgb){const n=g.attributes.position.count,a=[];for(let i=0;i<n;i++)a.push(rgb[0],rgb[1],rgb[2]);g.setAttribute('color',new THREE.Float32BufferAttribute(a,3));return g}
const ensure=g=>{const n=g.attributes.position.count;if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(n*2),2));if(!g.attributes.color)paintColor(g,[1,1,1]);if(!g.attributes.normal)g.computeVertexNormals();return g};
export function merge(list,withSkin=false){
 list=list.map(g=>{ensure(g);if(withSkin&&!g.attributes.skinIndex){const n=g.attributes.position.count;g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(n*4),4))}return g});
 return mergeGeometries(list.map(g=>g.index?g:g),false);
}

// ---- Skeleton + automatic skin weights ----
export class Rig{
 constructor(){this.bones=[];this.map={}}
 add(name,parent,pos,tipPos=null){
  const bone=new THREE.Bone();bone.name=name;const world=V(...pos);
  const p=parent?this.map[parent]:null;bone.position.copy(world).sub(p?p.userData.world:V());bone.userData.world=world;bone.userData.tip=tipPos?V(...tipPos):null;bone.userData.index=this.bones.length;
  if(p)p.add(bone);this.bones.push(bone);this.map[name]=bone;return bone;
 }
 finish(){
  for(const b of this.bones){
   if(!b.userData.tip){const c=b.children.find(x=>x.isBone);if(c)b.userData.tip=c.userData.world.clone();else{const par=b.parent&&b.parent.isBone?b.parent.userData.world:null;const dir=par?b.userData.world.clone().sub(par).normalize():V(0,0,1);b.userData.tip=b.userData.world.clone().addScaledVector(dir,.12)}}
  }
  return this;
 }
 seg(name){const b=this.map[name];return {idx:b.userData.index,a:b.userData.world,b:b.userData.tip}}
 idx(name){return this.map[name].userData.index}
 get root(){return this.bones[0]}
 skeleton(){return new THREE.Skeleton(this.bones)}
}
const _ab=V(),_ap=V(),_q=V();
function distSeg(p,a,b){_ab.subVectors(b,a);_ap.subVectors(p,a);const l2=_ab.lengthSq()||1e-9;const t=Math.max(0,Math.min(1,_ap.dot(_ab)/l2));_q.copy(a).addScaledVector(_ab,t);return p.distanceTo(_q)}
export function autoSkin(geo,segments,{pow=3,eps=.015,top=2}={}){
 const n=geo.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4),p=V();
 for(let i=0;i<n;i++){p.fromBufferAttribute(geo.attributes.position,i);const c=segments.map(s=>({idx:s.idx,w:1/Math.pow(distSeg(p,s.a,s.b)+eps,pow)})).sort((a,b)=>b.w-a.w).slice(0,top);const sum=c.reduce((q,x)=>q+x.w,0)||1;
  for(let k=0;k<4;k++){si[i*4+k]=c[k]?c[k].idx:0;sw[i*4+k]=c[k]?c[k].w/sum:0}}
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));return geo;
}
// Bind every vertex fully to one bone (rigid parts such as hooves, horns, teeth carried by the head).
export function bindRigid(geo,boneIdx){const n=geo.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);for(let i=0;i<n;i++){si[i*4]=boneIdx;sw[i*4]=1}geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));return geo}
export function skinnedMesh(geo,material,rig){
 const m=new THREE.SkinnedMesh(geo,material);m.add(rig.root);m.bind(rig.skeleton());m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;return m;
}
export {V};

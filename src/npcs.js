import * as THREE from 'three';
import { makeRole, makeVisitor } from './art/human.js';
import { stepRig } from './art/style.js';

// Staff and visitor figures. These are fully rigged people (see art/human.js): positions and tasks are simulated in
// operations.js, and the figures here only render and animate them.
export function createStaffLayer(scene){
 const figures=new Map();
 function sync(list,dt){
  const live=new Set();
  for(const m of list){
   live.add(m.id);let f=figures.get(m.id);
   if(!f){f=makeRole(m.role);f.position.set(m.x,0,m.z);scene.add(f);figures.set(m.id,f)}
   const px=f.position.x,pz=f.position.z;
   f.position.x+=(m.x-f.position.x)*Math.min(1,dt*10);f.position.z+=(m.z-f.position.z)*Math.min(1,dt*10);
   const dh=Math.atan2(Math.sin(m.heading-f.rotation.y),Math.cos(m.heading-f.rotation.y));f.rotation.y+=dh*Math.min(1,dt*8);
   const walking=m.state==='walk'||m.state==='return';
   const pose=m.state==='work'?(m.task&&m.task.kind==='talk'?'talk':'work'):null;
   stepRig(f.userData.rig,dt,{moving:walking,pose,speedScale:1+(m.skill-1)*.08});
  }
  for(const [id,f] of figures)if(!live.has(id)){scene.remove(f);figures.delete(id)}
 }
 return {sync,figures};
}

const PATH=[[17.5,.6],[20.5,2.2],[23.2,3.8],[27.8,6.0],[28.6,9.8],[24,11.4],[20.6,8.4],[19,3.4],[17.8,-2],[20.2,-4.2],[23,-5.6]];   // keeps clear of the ponds
const STOPS=new Set([3,10]);
export function createCrowd(scene){
 const people=[];const root=new THREE.Group();scene.add(root);
 function spawn(i){
  const f=makeVisitor(i);const start=i%PATH.length;f.position.set(PATH[start][0],0,PATH[start][1]);root.add(f);
  return {f,target:(start+1)%PATH.length,speed:.85+(i%4)*.12,wait:0,pose:null,i};
 }
 function setCount(n){
  n=Math.max(0,Math.min(14,Math.round(n)));
  while(people.length<n)people.push(spawn(people.length));
  while(people.length>n){const p=people.pop();root.remove(p.f)}
 }
 function update(dt){
  for(const p of people){
   let moving=false;
   if(p.wait>0){p.wait-=dt;p.pose=p.i%2?'photo':'talk'}
   else{p.pose=null;const [tx,tz]=PATH[p.target];const dx=tx-p.f.position.x,dz=tz-p.f.position.z,d=Math.hypot(dx,dz);
    if(d<.3){if(STOPS.has(p.target)&&Math.random()<.5)p.wait=3+Math.random()*5;p.target=(p.target+1)%PATH.length}
    else{const s=p.speed*dt;p.f.position.x+=dx/d*s;p.f.position.z+=dz/d*s;const h=Math.atan2(dx,dz);p.f.rotation.y+=Math.atan2(Math.sin(h-p.f.rotation.y),Math.cos(h-p.f.rotation.y))*Math.min(1,dt*6);moving=true}}
   stepRig(p.f.userData.rig,dt,{moving,pose:p.pose,speedScale:.8});
  }
 }
 return {setCount,update,people};
}

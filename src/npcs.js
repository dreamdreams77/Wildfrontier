import * as THREE from 'three';

// Staff and visitor figures in the same clay style as the ranger.
const mats=new Map();
const mat=(c,r=1)=>{const k=c+r;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness:r}));return mats.get(k)};
const sphere=new THREE.SphereGeometry(1,12,10);
const blob=(p,m,pos,sc)=>{const o=new THREE.Mesh(sphere,m);o.position.set(...pos);o.scale.set(...sc);o.castShadow=true;p.add(o);return o};
const cyl=(p,m,pos,r1,r2,h)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,h,8),m);o.position.set(...pos);o.castShadow=true;p.add(o);return o};

export function makeFigure({shirt,pants='#454d43',skin='#c99f78',hat=null,scale=1,hatStyle='brim'}){
 const g=new THREE.Group();
 blob(g,mat(shirt),[0,1.05,0],[.32,.46,.22]);
 blob(g,mat(skin),[0,1.68,0],[.19,.22,.18]);
 if(hat){if(hatStyle==='brim'){cyl(g,mat(hat),[0,1.86,0],.33,.33,.05);cyl(g,mat(hat),[0,1.95,0],.17,.2,.14)}else blob(g,mat(hat),[0,1.84,-.01],[.2,.12,.2])}
 g.userData.legs=[];g.userData.arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.14,.72,0);g.add(leg);cyl(leg,mat(pants),[0,-.3,0],.08,.065,.62);blob(leg,mat('#342f29'),[0,-.62,.05],[.1,.06,.16]);g.userData.legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.3,1.32,0);g.add(arm);cyl(arm,mat(shirt),[0,-.2,0],.07,.06,.4);blob(arm,mat(skin),[0,-.42,0],[.06,.06,.06]);g.userData.arms.push(arm);
 }
 g.scale.setScalar(scale);return g;
}

const ROLE_LOOK={keeper:{shirt:'#6f8f4e',hat:'#b49b68'},vet:{shirt:'#e6ebe0',hat:'#e6ebe0',hatStyle:'cap'},educator:{shirt:'#b5603f',hat:'#7a4a22'}};

// Keeps one figure per staff member in sync with the simulation (positions are simulated, figures only render them).
export function createStaffLayer(scene){
 const figures=new Map();let t=0;
 function sync(list,dt){
  t+=dt;const live=new Set();
  for(const m of list){
   live.add(m.id);let f=figures.get(m.id);
   if(!f){f=makeFigure({...ROLE_LOOK[m.role],scale:1.02});f.position.set(m.x,0,m.z);scene.add(f);figures.set(m.id,f)}
   f.position.x+=(m.x-f.position.x)*Math.min(1,dt*10);f.position.z+=(m.z-f.position.z)*Math.min(1,dt*10);
   const dh=Math.atan2(Math.sin(m.heading-f.rotation.y),Math.cos(m.heading-f.rotation.y));f.rotation.y+=dh*Math.min(1,dt*8);
   const walking=m.state==='walk'||m.state==='return';
   f.userData.legs.forEach((l,i)=>{l.rotation.x=walking?Math.sin(t*8+i*Math.PI)*.5:l.rotation.x*.8});
   f.userData.arms.forEach((a,i)=>{
    if(m.state==='work'){a.rotation.x=-1.1+Math.sin(t*6+i)*.25}
    else a.rotation.x=walking?Math.sin(t*8+i*Math.PI+Math.PI)*.35:a.rotation.x*.8;
   });
   f.position.y=walking?Math.abs(Math.sin(t*8))*.04:0;
  }
  for(const [id,f] of figures)if(!live.has(id)){scene.remove(f);figures.delete(id)}
 }
 return {sync,figures};
}

const PATH=[[17.5,.6],[20.5,2.2],[23.5,4.4],[26.5,7.6],[24.6,9.8],[21.2,7.4],[19,3.4],[17.8,-2],[20.2,-4.2],[23,-5.6],[20.6,-1.4]];
const SHIRTS=['#c0626a','#5a82a8','#d9b65c','#7e9f6a','#a373b3','#e08a4c','#4f9d9a','#b8b8b0'];
export function createCrowd(scene){
 const people=[];const root=new THREE.Group();scene.add(root);
 function spawn(i){
  const f=makeFigure({shirt:SHIRTS[i%SHIRTS.length],pants:i%2?'#4a5570':'#5b4d3d',skin:['#c99f78','#8d5a3b','#e0b894','#6f4a32'][i%4],hat:i%3===0?'#d9c595':null,scale:.92+(i%3)*.04});
  const start=i%PATH.length;f.position.set(PATH[start][0],0,PATH[start][1]);root.add(f);
  return {f,target:(start+1)%PATH.length,speed:.8+(i%4)*.12,phase:i*1.3};
 }
 function setCount(n){
  n=Math.max(0,Math.min(14,Math.round(n)));
  while(people.length<n)people.push(spawn(people.length));
  while(people.length>n){const p=people.pop();root.remove(p.f)}
 }
 let t=0;
 function update(dt){
  t+=dt;
  for(const p of people){
   const [tx,tz]=PATH[p.target];const dx=tx-p.f.position.x,dz=tz-p.f.position.z,d=Math.hypot(dx,dz);
   if(d<.25)p.target=(p.target+1)%PATH.length;
   else{const s=p.speed*dt;p.f.position.x+=dx/d*s;p.f.position.z+=dz/d*s;const h=Math.atan2(dx,dz);p.f.rotation.y+=Math.atan2(Math.sin(h-p.f.rotation.y),Math.cos(h-p.f.rotation.y))*Math.min(1,dt*6)}
   p.f.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*5*p.speed+p.phase+i*Math.PI)*.4);
   p.f.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*5*p.speed+p.phase+i*Math.PI+Math.PI)*.25);
  }
 }
 return {setCount,update,people};
}

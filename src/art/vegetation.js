import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft, blobGeo, lathe, xform, paintColor } from './meshkit.js';
import { mats, addWind } from './materials.js';
import { rng } from './noise.js';

// Hand-built vegetation. Trees are bark-textured lofted trunks and branches plus displaced, painted leaf clumps,
// merged so each tree is two draw calls. Grass and flowers are wind-animated instances.
const C=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b]};
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function mergeAll(list){
 list=list.filter(Boolean).map(g=>{if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!g.attributes.color)paintColor(g,[1,1,1]);return g});
 return list.length?mergeGeometries(list,false):new THREE.BufferGeometry();
}
const mesh=(geo,mat,shadow=true)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=true;return m};
const barkColor=({t})=>{const k=.75+.25*Math.sin(t*9);return [k,k*.97,k*.94]};

// ---- trees ----
export function makeOak(seed=1,{season='Spring',scale=1,detail=1}={}){
 const r=rng(seed*977+13);const g=new THREE.Group();const hiD=detail>.7,SEG=hiD?10:7,PER=hiD?3:2,ROOTS=hiD?6:3;
 const trunk=[],leaves=[];
 const h=2.6+r()*.8,lean=(r()-.5)*.35;
 // flared trunk with a gentle S-bend
 const pts=[[0,0,0],[lean*.2,h*.18,0],[lean*.6,h*.5,lean*.2],[lean,h*.82,0],[lean*1.1,h,0]];
 trunk.push(loft(pts.map((p,i)=>({p,rx:[.5,.3,.24,.17,.1][i],ry:[.5,.3,.24,.17,.1][i]})),{radial:hiD?12:8,rings:hiD?22:12,cap0:1,cap1:2,color:barkColor}));
 for(let i=0;i<ROOTS;i++){const a=i/ROOTS*Math.PI*2+r()*.5,reach=.55+r()*.45;
  trunk.push(loft([{p:[Math.cos(a)*.15,.5,Math.sin(a)*.15],rx:.1},{p:[Math.cos(a)*reach*.6,.12,Math.sin(a)*reach*.6],rx:.08},{p:[Math.cos(a)*reach*1.1,0,Math.sin(a)*reach*1.1],rx:.04}],{radial:8,rings:8,cap0:1,cap1:1,color:barkColor}))}
 const crownC=[lean*1.1,h,0];
 const seasonal={Spring:['#4f7a3c','#8bb457'],Summer:['#3f6a35','#78a24a'],Autumn:['#9a6a2a','#d9a038'],Winter:['#5d6d58','#8a9a84']}[season]||['#4f7a3c','#8bb457'];
 const lo=mixc(C(seasonal[0]),[1,1,1],.12),hi=mixc(C(seasonal[1]),[1,1,1],.1);
 const nb=(hiD?5:4)+((r()*3)|0);
 for(let i=0;i<nb;i++){
  const a=i/nb*Math.PI*2+r()*.6,reach=.9+r()*.9,by=h*(.58+r()*.28),bx=crownC[0]+Math.cos(a)*reach*.5,bz=Math.sin(a)*reach*.5;
  trunk.push(loft([{p:[crownC[0]*.8,by-.2,0],rx:.075},{p:[bx*.7+crownC[0]*.3,by+.2,bz*.7],rx:.055},{p:[bx+Math.cos(a)*.5,by+.55+r()*.3,bz+Math.sin(a)*.5],rx:.025}],{radial:7,rings:8,cap0:1,cap1:2,color:barkColor}));
  const cx=bx+Math.cos(a)*.7,cy=by+.8+r()*.4,cz=bz+Math.sin(a)*.7,cr=.95+r()*.45;
  for(let k=0;k<PER;k++){const bl=blobGeo(cr*(.55+r()*.3),cr*(.45+r()*.25),cr*(.55+r()*.3),{seg:SEG,noise:.28,freq:2.2,seed:seed*31+i*7+k,low:mixc(lo,[0,0,0],.3),high:mixc(hi,lo,.25)});leaves.push(xform(bl,{pos:[cx+(r()-.5)*cr*.9,cy+(r()-.3)*cr*.6,cz+(r()-.5)*cr*.9]}))}
 }
 for(let k=0;k<(hiD?5:3);k++){const cr=1.1+r()*.4;const bl=blobGeo(cr,cr*.7,cr,{seg:SEG,noise:.25,seed:seed+k,low:mixc(lo,[0,0,0],.3),high:hi});leaves.push(xform(bl,{pos:[crownC[0]+(r()-.5)*1.4,h+.6+r()*.8,(r()-.5)*1.4]}))}
 const T=mesh(mergeAll(trunk),mats.bark());const Lf=mesh(mergeAll(leaves),mats.leaf());g.add(T,Lf);g.scale.setScalar(scale);g.userData.leaves=Lf;g.userData.tintLeaves=(s)=>{};
 return g;
}
export function makePine(seed=1,scale=1){
 const r=rng(seed*53+7);const g=new THREE.Group();const h=4+r()*1.8;
 const trunk=loft([{p:[0,0,0],rx:.34},{p:[0,h*.4,0],rx:.2},{p:[0,h,0],rx:.06}],{radial:10,rings:20,cap0:1,cap1:2,color:barkColor});
 const tiers=[];
 for(let i=0;i<6;i++){const y=h*(.22+i*.13),rad=(1.25-i*.17)*(.9+r()*.2);
  const prof=[[0,0],[rad,-.05],[rad*.9,-.2],[rad*.55,.2],[rad*.62,.1],[0,.75]];
  const cone=lathe(prof.map(([a,b])=>[a,b*(1.2-i*.1)]),{seg:11,color:()=>[1,1,1]});
  const p=cone.attributes.position;const col=[];for(let j=0;j<p.count;j++){const x=p.getX(j),yy=p.getY(j),z=p.getZ(j);const n=(Math.sin(x*9+i)+Math.cos(z*8+i*2))*.04*rad;p.setXYZ(j,x+n,yy,z+n);const t=Math.min(1,Math.max(0,(yy+.2)/1));col.push(...mixc(C('#1f4a2e'),C('#4d8a4f'),t*.8+.1*r()))}
  cone.setAttribute('color',new THREE.Float32BufferAttribute(col,3));cone.computeVertexNormals();tiers.push(xform(cone,{pos:[0,y,0],rot:[0,r()*6,0]}))}
 g.add(mesh(mergeAll([trunk]),mats.bark()),mesh(mergeAll(tiers),mats.leaf()));g.scale.setScalar(scale);return g;
}
export function makeAcacia(seed=1,scale=1){
 const r=rng(seed*211+5);const g=new THREE.Group();const h=2.4+r()*.5,lean=(r()-.5)*.8;
 const parts=[loft([{p:[0,0,0],rx:.3},{p:[lean*.3,h*.4,0],rx:.2},{p:[lean*.6,h*.75,.1],rx:.16},{p:[lean,h,0],rx:.12}],{radial:10,rings:20,cap0:1,cap1:1,color:barkColor})];
 const fx=[[-1,.3],[1.1,-.2],[.2,1.1],[0,-1.1]];const lv=[];
 for(const [dx,dz] of fx){parts.push(loft([{p:[lean,h*.92,0],rx:.1},{p:[lean+dx*.5,h+.35,dz*.5],rx:.07},{p:[lean+dx*1.1,h+.55,dz*1.1],rx:.04}],{radial:7,rings:8,cap0:1,cap1:1,color:barkColor}));
  for(let k=0;k<2;k++){const bl=blobGeo(1.15+r()*.4,.26,1.0+r()*.4,{seg:14,noise:.12,seed:seed+k,low:C('#5a6e2e'),high:C('#9aaa4a'),squash:.5});lv.push(xform(bl,{pos:[lean+dx*1.1+(r()-.5)*.4,h+.7+k*.18,dz*1.1+(r()-.5)*.4]}))}}
 const top=blobGeo(1.5,.3,1.4,{seg:14,noise:.1,seed,low:C('#5a6e2e'),high:C('#a8b856'),squash:.5});lv.push(xform(top,{pos:[lean,h+.95,0]}));
 g.add(mesh(mergeAll(parts),mats.bark()),mesh(mergeAll(lv),mats.leafDry()));g.scale.setScalar(scale);return g;
}
export function makeBaobab(scale=1){
 const g=new THREE.Group();
 const trunk=loft([{p:[0,0,0],rx:1.5},{p:[0,.8,0],rx:1.1},{p:[0,2.6,0],rx:1.0},{p:[0,3.8,0],rx:1.3}],{radial:20,rings:30,cap0:1,cap1:2,color:({t})=>{const k=.85+.15*Math.sin(t*20);return [k,k*.92,k*.8]}});
 const br=[],lv=[];for(let i=0;i<7;i++){const a=i/7*Math.PI*2;br.push(loft([{p:[Math.cos(a)*.7,3.7,Math.sin(a)*.7],rx:.28},{p:[Math.cos(a)*1.5,4.5,Math.sin(a)*1.5],rx:.17},{p:[Math.cos(a)*2.4,5.3,Math.sin(a)*2.4],rx:.08}],{radial:8,rings:8,cap0:1,cap1:2,color:()=>C('#9a8468')}));
  const bl=blobGeo(.95,.4,.95,{seg:10,noise:.25,seed:i,low:C('#4f6a30'),high:C('#8aa04a')});lv.push(xform(bl,{pos:[Math.cos(a)*2.6,5.5,Math.sin(a)*2.6]}))}
 g.add(mesh(mergeAll([trunk,...br]),mats.bark()),mesh(mergeAll(lv),mats.leafDry()));g.scale.setScalar(scale);return g;
}
export function makeBush(seed=1,{berries=false,scale=1}={}){
 const r=rng(seed*131+3);const g=new THREE.Group();const lv=[];
 for(let i=0;i<5;i++){const bl=blobGeo(.5+r()*.25,.4+r()*.2,.5+r()*.25,{seg:10,noise:.3,seed:seed+i,low:C('#2f5a30'),high:C('#6a9a48')});lv.push(xform(bl,{pos:[(r()-.5)*.7,.35+r()*.2,(r()-.5)*.7]}))}
 g.add(mesh(mergeAll(lv),mats.leaf()));
 if(berries){const b=[];for(let i=0;i<14;i++){const s=blobGeo(.05,.05,.05,{seg:6,low:C('#5a1f2a'),high:C('#a8384a')});b.push(xform(s,{pos:[(r()-.5)*.9,.35+r()*.5,(r()-.5)*.9]}))}g.add(mesh(mergeAll(b),mats.plain(),false))}
 g.scale.setScalar(scale);return g;
}
export function makeBamboo(seed=1,scale=1){
 const r=rng(seed*41+9);const stalks=[],leaves=[];
 for(let i=0;i<9;i++){const a=i*2.4+r(),rad=.1+(i%3)*.2,h=3+r()*1.6,bx=Math.cos(a)*rad,bz=Math.sin(a)*rad,lean=(r()-.5)*.3;
  stalks.push(loft([{p:[bx,0,bz],rx:.055},{p:[bx+lean*.5,h*.5,bz],rx:.05},{p:[bx+lean,h,bz+lean*.3],rx:.035}],{radial:7,rings:11,cap0:1,cap1:1,color:({t})=>{const n=Math.abs(Math.sin(t*h*1.3*Math.PI));return mixc(C('#7aa04a'),C('#c8d88a'),n>.92?1:.0)}}));
  for(let k=0;k<5;k++){const lf=blobGeo(.3,.025,.07,{seg:6,low:C('#4f7a30'),high:C('#8ab04a')});leaves.push(xform(lf,{pos:[bx+lean+Math.cos(k*1.3)*.2,h*(.65+k*.07),bz+Math.sin(k*1.3)*.2],rot:[0,k*1.3,-.5]}))}}
 const g=new THREE.Group();g.add(mesh(mergeAll(stalks),mats.plain()),mesh(mergeAll(leaves),mats.leaf()));g.scale.setScalar(scale);return g;
}
export function makeRock(seed=1,{size=1,mossy=true}={}){
 const r=rng(seed*17+1);const g=blobGeo(size*(.9+r()*.4),size*(.6+r()*.3),size*(.9+r()*.4),{seg:16,noise:.32,freq:1.6,seed,low:[.5,.5,.5],high:mossy?mixc([.95,.95,.9],C('#7c9a58'),.35):[1,1,1],squash:.5});
 // flatten the base so the rock sits in the ground
 const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<-size*.25)p.setY(i,-size*.25);g.computeVertexNormals();
 const m=mesh(g,mats.rock());m.rotation.y=r()*6;return m;
}
export function makeLog(seed=1,len=2.2){
 const r=rng(seed*7+2);const g=new THREE.Group();const rr=.2+r()*.1;
 const body=loft([{p:[-len/2,rr,0],rx:rr},{p:[0,rr*1.03,(r()-.5)*.1],rx:rr*.95},{p:[len/2,rr,0],rx:rr*.9}],{radial:12,rings:16,cap0:1,cap1:1,color:barkColor});
 const rings=[];for(const s of [-1,1]){const d=lathe([[0,0],[rr*.88,0],[rr*.9,.02]],{seg:12,color:()=>C('#c9a878')});rings.push(xform(d,{pos:[s*(len/2+.01),rr,0],rot:[0,0,s*Math.PI/2]}))}
 const m=[];for(let i=0;i<3;i++){const cap=lathe([[0,0],[.05,.01],[.04,.05],[.01,.07],[0,.07]],{seg:8,color:()=>C(i%2?'#b66f54':'#d9b88a')});m.push(xform(cap,{pos:[(r()-.5)*len*.6,rr*1.55,(r()-.5)*.1]}))}
 g.add(mesh(mergeAll([body,...rings]),mats.bark()),mesh(mergeAll(m),mats.plain(),false));g.rotation.y=r()*6;return g;
}

// ---- wind-animated instanced grass / flowers / reeds ----
let _grassGeo=null;
function grassTuftGeo(){
 if(_grassGeo)return _grassGeo;
 const parts=[];const r=rng(5);
 for(let b=0;b<4;b++){
  const a=b/4*Math.PI*2+r(),h=.3+r()*.28,w=.05+r()*.03,bend=(r()-.2)*.18;
  const segs=2;const pos=[],uv=[],idx=[],col=[];
  for(let i=0;i<=segs;i++){const t=i/segs;const wd=w*(1-t*.88);const x0=Math.cos(a)*(r()*.05),z0=Math.sin(a)*(r()*.05);const yy=h*t;const off=bend*t*t*h;
   for(const sx of [-1,1]){pos.push(x0+Math.cos(a+Math.PI/2)*wd*sx+Math.cos(a)*off,yy,z0+Math.sin(a+Math.PI/2)*wd*sx+Math.sin(a)*off);uv.push(sx>0?1:0,t);const k=.55+.45*t;col.push(k,k,k)}}
  for(let i=0;i<segs;i++){const q=i*2;idx.push(q,q+1,q+2,q+1,q+3,q+2)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  // make blades two-sided cheaply by pointing normals up so they shade like turf
  const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);parts.push(g);
 }
 _grassGeo=mergeGeometries(parts,false);return _grassGeo;
}
export function makeGrass(positions,{palette=['#4d7a35','#86b04c'],height=1,quality=1}={}){
 const n=Math.max(1,Math.round(positions.length*quality));
 const geo=grassTuftGeo();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});
 addWind(mat,{amp:.35,freq:1.9,heightRef:.7});
 const im=new THREE.InstancedMesh(geo,mat,n);im.castShadow=false;im.receiveShadow=true;
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pcol=[new THREE.Color(palette[0]),new THREE.Color(palette[1])];const r=rng(99);const c=new THREE.Color();
 for(let i=0;i<n;i++){const p=positions[i];q.setFromEuler(new THREE.Euler(0,r()*6.28,0));const sc=(.7+r()*.7)*height;s.set(sc,sc*(.8+r()*.5),sc);m.compose(new THREE.Vector3(p[0],p[1]||0,p[2]),q,s);im.setMatrixAt(i,m);c.copy(pcol[0]).lerp(pcol[1],r());im.setColorAt(i,c)}
 im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;return im;
}
export function makeFlowers(positions,{colors=['#e8a0b8','#f0d060','#c890d8','#f4ecd0'],quality=1}={}){
 const n=Math.max(1,Math.round(positions.length*quality));
 const stem=new THREE.CylinderGeometry(.008,.01,.32,4);stem.translate(0,.16,0);paintColor(stem,C('#5a7a3a'));
 const head=new THREE.CircleGeometry(.075,7);head.rotateX(-Math.PI/2*.8);head.translate(0,.34,0);paintColor(head,[1,1,1]);
 const core=new THREE.SphereGeometry(.02,6,5);core.translate(0,.345,0);paintColor(core,C('#e8c040'));
 const geo=mergeGeometries([stem,head,core].map(g=>{g.deleteAttribute('uv');return g}),false);
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide});addWind(mat,{amp:.25,freq:1.7,heightRef:.4});
 const im=new THREE.InstancedMesh(geo,mat,n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3();const r=rng(77);const c=new THREE.Color();
 for(let i=0;i<n;i++){const p=positions[i];q.setFromEuler(new THREE.Euler(0,r()*6.28,0));const sc=.8+r()*.7;s.set(sc,sc*(.8+r()*.5),sc);m.compose(new THREE.Vector3(p[0],0,p[2]),q,s);im.setMatrixAt(i,m);c.set(colors[(r()*colors.length)|0]);im.setColorAt(i,c)}
 im.frustumCulled=false;return im;
}
export function makeFern(seed=1,scale=1){
 const r=rng(seed*23+4);const parts=[];
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2+r()*.4,len=.5+r()*.35;
  const pts=[[0,.02,0],[Math.cos(a)*len*.4,len*.55,Math.sin(a)*len*.4],[Math.cos(a)*len*.9,len*.62,Math.sin(a)*len*.9],[Math.cos(a)*len*1.25,len*.25,Math.sin(a)*len*1.25]];
  parts.push(loft(pts.map((p,j)=>({p,rx:[.012,.05,.06,.02][j],ry:.004})),{radial:4,rings:6,cap0:1,cap1:1,color:({t})=>mixc(C('#2f5a2a'),C('#7aa84a'),t)}))}
 const g=new THREE.Group();const m=mesh(mergeAll(parts),mats.leaf(),false);g.add(m);g.scale.setScalar(scale);return g;
}
export function makeMushroom(seed=1){
 const r=rng(seed);const cap=lathe([[0,.08],[.04,.075],[.075,.045],[.08,.02],[.06,.012],[0,.015]],{seg:10,color:()=>C(r()>.5?'#b66f54':'#d9a070')});const stem=lathe([[.015,0],[.02,.05],[.014,.09]],{seg:8,color:()=>C('#e8dcc0')});
 return mesh(mergeAll([stem,xform(cap,{pos:[0,.05,0]})]),mats.plain(),false);
}
export function makeReeds(seed=1,count=8){
 const r=rng(seed);const parts=[];
 for(let i=0;i<count;i++){const a=r()*6.28,rad=r()*.25,h=.9+r()*.8,x=Math.cos(a)*rad,z=Math.sin(a)*rad,lean=(r()-.5)*.3;
  parts.push(loft([{p:[x,0,z],rx:.012},{p:[x+lean*.4,h*.6,z],rx:.01},{p:[x+lean,h,z+lean*.3],rx:.004}],{radial:4,rings:8,cap0:1,cap1:1,color:({t})=>mixc(C('#5a7a3a'),C('#a8b86a'),t)}));
  if(i%3===0)parts.push(xform(blobGeo(.025,.12,.025,{seg:6,low:C('#6a4a2a'),high:C('#9a7040')}),{pos:[x+lean,h+.05,z+lean*.3]}))}
 const m=mesh(mergeAll(parts),addWind(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),{amp:.12,freq:1.4,heightRef:1.6}),false);return m;
}
export function makeWillow(seed=1,scale=1){
 const g=new THREE.Group();
 const trunk=loft([{p:[0,0,0],rx:.07},{p:[.05,.5,0],rx:.05},{p:[.12,1.1,0],rx:.03}],{radial:6,rings:8,cap0:1,cap1:1,color:barkColor});
 const lv=[];for(let i=0;i<5;i++){const a=i*1.3;lv.push(xform(blobGeo(.28,.45,.28,{seg:8,noise:.2,seed:i,low:C('#4f7a3c'),high:C('#9acb5a')}),{pos:[Math.cos(a)*.22+.1,.95-i*.04,Math.sin(a)*.22]}))}
 g.add(mesh(mergeAll([trunk]),mats.bark(),false),mesh(mergeAll(lv),mats.leaf(),false));g.scale.setScalar(scale);return g;
}
// Merge many copies of a built group's meshes into one mesh per material (huge draw-call saving for dressing).
export function scatterMerged(buildFn,transforms){
 const byMat=new Map();
 transforms.forEach((t,i)=>{const obj=buildFn(i);obj.position.set(t[0],t[1]||0,t[2]);obj.rotation.y=t[3]||0;obj.scale.multiplyScalar(t[4]||1);obj.updateMatrixWorld(true);
  obj.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!byMat.has(o.material))byMat.set(o.material,[]);byMat.get(o.material).push(g)})});
 const grp=new THREE.Group();
 for(const [m,list] of byMat){const geo=mergeAll(list);const me=mesh(geo,m);grp.add(me)}
 return grp;
}

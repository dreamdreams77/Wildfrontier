import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft, blobGeo, lathe, xform, paintColor } from './meshkit.js';
import { mats } from './materials.js';
import { signTexture, mapTexture, canPaint } from './paint.js';
import { makeAcacia, makeBamboo, makeRock, makeReeds, makeOak, makeBush } from './vegetation.js';
import { rng } from './noise.js';
import { makeWaterDisc } from './terrain.js';

// Buildings and buildable habitat structures: timber frames, shingle and thatch roofs, stone footings, painted signs.
const C=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b]};
export const lamp={mat:new THREE.MeshStandardMaterial({color:'#ffe9b0',emissive:'#ffcf6a',emissiveIntensity:0,roughness:.4})};
export const setNight=n=>{lamp.mat.emissiveIntensity=n?2.4:0};

// textured box with world-scaled UVs so plank/shingle textures keep a constant size
function bx(w,h,d,{pos=[0,0,0],rot=[0,0,0],color=[1,1,1],uv=1}={}){
 const g=new THREE.BoxGeometry(w,h,d);const u=g.attributes.uv;
 const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
 for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;u.setXY(k,u.getX(k)*dims[f][0]*uv,u.getY(k)*dims[f][1]*uv)}
 paintColor(g,color);return xform(g,{pos,rot});
}
const merge=(list)=>mergeGeometries(list.map(g=>{if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!g.attributes.color)paintColor(g,[1,1,1]);return g}),false);
function mk(group,list,mat,{shadow=true}={}){if(!list.length)return null;const m=new THREE.Mesh(merge(list),mat);m.castShadow=shadow;m.receiveShadow=true;group.add(m);return m}
const post=(x,z,h,r=.1,color=[.4,.3,.22])=>xform(loft([{p:[0,0,0],rx:r*1.05},{p:[0,h*.5,0],rx:r},{p:[0,h,0],rx:r*.95}],{radial:8,rings:8,cap0:1,cap1:1,color:()=>color}),{pos:[x,0,z]});
// gable roof as two thick slabs with eaves; returns geometry list for a shingle/thatch material
function gable(w,d,rise,{over=.35,thick=.12,y=0,color=[1,1,1],uv=.5}={}){
 const half=w/2+over,len=Math.hypot(half,rise),ang=Math.atan2(rise,half),out=[];
 for(const s of [-1,1])out.push(bx(len,thick,d+over*2,{pos:[s*half/2,y+rise/2,0],rot:[0,0,-s*ang],color,uv}));
 out.push(bx(.16,.14,d+over*2,{pos:[0,y+rise+.02,0],color:[.7,.6,.5]}));
 return out;
}
const stoneFoot=(w,d,n=24)=>{const r=rng(5),out=[];for(let i=0;i<n;i++){let x,z;const per=(w+d)*2,pp=i/n*per;if(pp<w){x=pp-w/2;z=-d/2}else if(pp<w+d){x=w/2;z=pp-w-d/2}else if(pp<2*w+d){x=w/2-(pp-w-d);z=d/2}else{x=-w/2;z=d/2-(pp-2*w-d)}
 const b=blobGeo(.3+r()*.15,.16,.28+r()*.1,{seg:8,noise:.25,seed:i,low:[.45,.44,.42],high:[.75,.73,.68]});out.push(xform(b,{pos:[x,.1,z],rot:[0,r()*3,0]}))}return out};
function signMesh(text,w,h,{bg,fg}={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.06),[null,null,null,null,null,null].map(()=>new THREE.MeshStandardMaterial({color:bg||'#d9c595',roughness:.9})));const tex=canPaint?signTexture(text,{bg,fg,w:Math.round(w*180),h:Math.round(h*180)}):null;if(tex){m.material[4]=new THREE.MeshStandardMaterial({map:tex,roughness:.85});m.material[5]=m.material[4]}m.castShadow=true;return m}
const lampGlobe=(x,y,z,r=.1)=>{const g=new THREE.SphereGeometry(r,10,8);g.translate(x,y,z);return g};

// ---------------- Ranger cabin ----------------
export function makeCabin(){
 const g=new THREE.Group();const wood=[],roof=[],stone=stoneFoot(3.5,2.9),trim=[],glass=[],lampG=[];const W=3.4,D=2.8,H=2.0;
 for(let i=0;i<9;i++){const y=.18+i*.22,ov=.06;for(const s of [-1,1]){wood.push(bx(W+ov,.21,.14,{pos:[0,y,s*D/2],color:[.78+.06*(i%3),.66,.54]}));wood.push(bx(.14,.21,D+ov,{pos:[s*W/2,y,0],color:[.78+.06*((i+1)%3),.66,.54]}))}}
 trim.push(...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>post(a*W/2,b*D/2,H+.1,.1)));
 roof.push(...gable(W,D,1.15,{over:.45,y:H,uv:.45}));
 // chimney
 stone.push(bx(.5,2.9,.5,{pos:[W/2-.35,1.9,-D/2+.1],color:[.7,.66,.6]}),bx(.6,.1,.6,{pos:[W/2-.35,3.4,-D/2+.1],color:[.5,.47,.43]}));
 // porch
 trim.push(bx(W+.4,.12,1.2,{pos:[0,.1,D/2+.55],color:[.55,.42,.3]}),post(-W/2+.1,D/2+1.05,H,.07),post(W/2-.1,D/2+1.05,H,.07));
 roof.push(bx(W+.5,.09,1.4,{pos:[0,H+.02,D/2+.6],rot:[.18,0,0],color:[.7,.6,.5],uv:.45}));
 // door and windows
 trim.push(bx(.8,1.5,.06,{pos:[-.5,.85,D/2+.02],color:[.42,.3,.2]}),bx(.95,1.6,.04,{pos:[-.5,.85,D/2],color:[.25,.18,.12]}));
 for(const x of [.75,-1.15]){trim.push(bx(.7,.7,.06,{pos:[x,1.15,D/2+.02],color:[.25,.18,.12]}));glass.push(bx(.58,.58,.04,{pos:[x,1.15,D/2+.05]}))}
 for(const s of [-1,1])trim.push(bx(.34,.7,.05,{pos:[.75+s*.5,1.15,D/2+.05],color:[.38,.52,.4]}));
 lampG.push(lampGlobe(.35,1.55,D/2+.2,.07));
 mk(g,wood,mats.plank('#9a7a50'));mk(g,trim,mats.plank('#6a4a2e'));mk(g,roof,mats.shingle('#6c5a45'));mk(g,stone,mats.rock());
 if(glass.length)mk(g,glass,lamp.mat,{shadow:false});
 const sg=lampGlobe(.35,1.55,D/2+.2,.07);const lm=new THREE.Mesh(sg,lamp.mat);g.add(lm);
 // firewood stack and barrel
 const logs=[];for(let i=0;i<10;i++){const l=loft([{p:[-.5,.1+Math.floor(i/4)*.19,0],rx:.08},{p:[.5,.1+Math.floor(i/4)*.19,0],rx:.08}],{radial:7,rings:2,cap0:1,cap1:1,color:()=>[.55,.4,.28]});logs.push(xform(l,{pos:[-W/2-.8,0,-.3+(i%4)*.17]}))}
 mk(g,logs,mats.bark());
 const barrel=lathe([[.28,0],[.32,.25],[.34,.5],[.32,.75],[.28,1]],{seg:12,color:()=>[.5,.36,.24]});mk(g,[xform(barrel,{pos:[W/2+.7,0,D/2-.2],scale:[1,.7,1]})],mats.plank('#7a5a3a'));
 const sign=signMesh('RANGER STATION',1.8,.45);sign.position.set(.2,H+.55,D/2+1.2);sign.rotation.x=0;g.add(sign);
 return g;
}

// ---------------- Wildlife recovery yard ----------------
export function makeRecoveryYard(){
 const g=new THREE.Group();const wood=[],post_=[],roof=[],straw=[],floor=[];const W=6.8,D=5.4;
 floor.push(bx(W,.14,D,{pos:[0,.07,0],color:[.9,.88,.8],uv:.35}));
 for(const x of [-W/2+.15,W/2-.15])for(const z of [-D/2+.15,D/2-.15])post_.push(post(x,z,3,.14));
 for(const x of [-2.2,-.75,.75,2.2]){post_.push(post(x,D/2,1.2,.07),post(x,-D/2,1.2,.07))}
 for(const y of [.45,.9]){wood.push(bx(W,.09,.08,{pos:[0,y,D/2]}),bx(W,.09,.08,{pos:[0,y,-D/2]}),bx(.08,.09,D,{pos:[-W/2,y,0]}),bx(.08,.09,D,{pos:[W/2,y,0]}))}
 wood.push(bx(.1,1.2,D-.2,{pos:[0,.7,0]}));
 roof.push(...gable(W+.4,D+.4,.75,{over:.3,y:3,uv:.4}));
 for(const x of [-2,2]){const hay=blobGeo(.95,.28,.7,{seg:12,noise:.12,seed:x+5,low:C('#b0924a'),high:C('#e8d08a'),squash:.3});straw.push(xform(hay,{pos:[x,.3,-.7]}))}
 const tr=[bx(1.5,.3,.5,{pos:[-2.2,.3,1.7],color:[.6,.45,.3]}),bx(1.4,.04,.4,{pos:[-2.2,.42,1.7],color:[.3,.45,.5]})];
 mk(g,floor,mats.rock());mk(g,wood,mats.plank('#8a6a45'));mk(g,post_,mats.bark());mk(g,roof,mats.thatch());mk(g,straw,mats.plain());mk(g,tr,mats.plank('#7a5a3a'));
 const sign=signMesh('RECOVERY YARD',2.4,.55);sign.position.set(0,2.3,D/2+.1);g.add(sign);
 const path=new THREE.Mesh(new THREE.BoxGeometry(2.2,.04,7),new THREE.MeshStandardMaterial({color:'#a89870',roughness:1}));path.position.set(0,.03,D/2+3.5);path.receiveShadow=true;g.add(path);
 return g;
}

// ---------------- Treatment wing and research lodge (open-fronted timber halls) ----------------
function hall({W,D,H,wall,trimC,roofMat,sign,interior}){
 const g=new THREE.Group();const walls=[],trim=[],roof=[],floor=[],glass=[],stone=stoneFoot(W+.1,D+.1,40);
 floor.push(bx(W,.16,D,{pos:[0,.08,0],color:[.9,.85,.72],uv:.3}));
 walls.push(bx(W,H,.22,{pos:[0,H/2+.1,-D/2],color:[1,1,1],uv:.3}));
 for(const s of [-1,1])walls.push(bx(.22,H,D,{pos:[s*(W/2),H/2+.1,0],color:[1,1,1],uv:.3}));
 for(const s of [-1,1])walls.push(bx(W*.28,H,.22,{pos:[s*(W*.36),H/2+.1,D/2],color:[1,1,1],uv:.3}));
 walls.push(bx(W*.44,H*.3,.22,{pos:[0,H*.85+.1,D/2],color:[1,1,1],uv:.3}));
 for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])trim.push(post(sx*W/2,sz*D/2,H+.15,.14,trimC));
 trim.push(bx(W+.3,.18,.22,{pos:[0,H+.12,D/2],color:trimC}),bx(W+.3,.18,.22,{pos:[0,H+.12,-D/2],color:trimC}));
 roof.push(...gable(W,D,1.5,{over:.55,y:H+.15,uv:.4}));
 for(const s of [-1,1]){trim.push(bx(1.2,1.3,.08,{pos:[s*(W*.3),H*.55+.1,-D/2+.15],color:[.2,.15,.1]}));glass.push(bx(1.05,1.1,.04,{pos:[s*(W*.3),H*.55+.1,-D/2+.18]}))}
 mk(g,floor,mats.plank('#a89066'));mk(g,walls,wall);mk(g,trim,mats.plank('#5a4a34'));mk(g,roof,roofMat);mk(g,stone,mats.rock());mk(g,glass,lamp.mat,{shadow:false});
 const sg=signMesh(sign,3.2,.62);sg.position.set(0,H+.4,D/2+.18);g.add(sg);
 interior(g);return g;
}
export function makeClinic(){
 return hall({W:9,D:7,H:2.8,wall:mats.plaster('#d8cfb0'),trimC:[.36,.3,.22],roofMat:mats.shingle('#5c6a50'),sign:'TREATMENT WING',interior:(g)=>{
  const tbl=[],cab=[],jar=[],cloth=[],hay=[];
  for(const x of [-1.8,1.8]){tbl.push(bx(1.9,.12,1.3,{pos:[x,.95,-.6],color:[.85,.8,.7]}));for(const lx of [-.8,.8])for(const lz of [-.5,.5])tbl.push(bx(.08,.9,.08,{pos:[x+lx,.5,-.6+lz],color:[.5,.4,.3]}));cloth.push(bx(1.8,.05,1.2,{pos:[x,1.03,-.6],color:[.92,.94,.9]}))}
  cab.push(bx(1.6,1.8,.5,{pos:[-3.5,1,-3.0],color:[.55,.42,.3]}),bx(1.6,1.8,.5,{pos:[3.5,1,-3.0],color:[.55,.42,.3]}));
  for(let i=0;i<8;i++)jar.push(xform(lathe([[.06,0],[.07,.05],[.07,.16],[.045,.2],[.0,.2]],{seg:8,color:()=>C(['#9ac7b0','#e8c870','#c0a0d0','#f0f0f0'][i%4])}),{pos:[-3.9+(i%4)*.35,1.9,-3.0+(i>3?.1:-.05)]}));
  hay.push(xform(blobGeo(.8,.25,.6,{seg:10,noise:.1,low:C('#b0924a'),high:C('#e8d08a')}),{pos:[3.3,.3,1.6]}),xform(blobGeo(.8,.25,.6,{seg:10,noise:.1,low:C('#b0924a'),high:C('#e8d08a')}),{pos:[-3.3,.3,1.6]}));
  mk(g,tbl,mats.plank('#8a6a45'));mk(g,cloth,mats.cloth());mk(g,cab,mats.plank('#6a4a2e'));mk(g,jar,mats.plain());mk(g,hay,mats.plain());
  const sink=bx(1,.9,.6,{pos:[0,.5,-3.1],color:[.8,.8,.78]});mk(g,[sink],mats.plain());
  const cross=[bx(.5,.14,.04,{pos:[-3.6,2.35,-3.3],color:[.75,.15,.12]}),bx(.14,.5,.04,{pos:[-3.6,2.35,-3.3],color:[.75,.15,.12]})];mk(g,cross,mats.plain());
  const lg=new THREE.Mesh(lampGlobe(0,2.4,-.5,.13),lamp.mat);g.add(lg);
 }});
}
export function makeResearchLodge(){
 return hall({W:9,D:7.4,H:2.8,wall:mats.plank('#8a785a'),trimC:[.3,.36,.26],roofMat:mats.shingle('#4b5945'),sign:'RESEARCH LODGE',interior:(g)=>{
  const bench=[],shelf=[],screen=[];
  for(const x of [-2.8,0,2.8]){bench.push(bx(2.25,.14,1.0,{pos:[x,.9,.4],color:[.7,.55,.4]}));for(const lx of [-1,1])bench.push(bx(.1,.85,.8,{pos:[x+lx,.5,.4],color:[.5,.4,.3]}));screen.push(bx(.7,.45,.05,{pos:[x,1.35,.1],color:[.15,.3,.3]}))}
  const mb=new THREE.Mesh(new THREE.BoxGeometry(5.7,1.65,.1),[new THREE.MeshStandardMaterial({color:'#6c5942'}),new THREE.MeshStandardMaterial({color:'#6c5942'}),new THREE.MeshStandardMaterial({color:'#6c5942'}),new THREE.MeshStandardMaterial({color:'#6c5942'}),new THREE.MeshStandardMaterial({map:canPaint?mapTexture():null,color:'#ffffff',roughness:.9}),new THREE.MeshStandardMaterial({color:'#6c5942'})]);mb.position.set(0,2.0,-3.4);mb.castShadow=true;g.add(mb);
  shelf.push(bx(1.2,1.7,.55,{pos:[-3.7,.95,-2.5],color:[.55,.42,.3]}));for(let i=0;i<6;i++)shelf.push(xform(lathe([[.05,0],[.06,.04],[.06,.14],[.0,.16]],{seg:8,color:()=>C(['#c2b58c','#9ac7b0','#e0b0a0'][i%3])}),{pos:[-3.9+(i%3)*.3,1.2+Math.floor(i/3)*.45,-2.5]}));
  mk(g,bench,mats.plank('#7a5a3a'));mk(g,shelf,mats.plank('#6a4a2e'));mk(g,screen,mats.plain());
  const lg=new THREE.Mesh(lampGlobe(0,2.5,0,.14),lamp.mat);g.add(lg);
 }});
}

// ---------------- Safari gate, deck, trough, signposts ----------------
export function makeSafariGate(){
 const g=new THREE.Group();const posts=[],beam=[],fence=[];
 for(const z of [-2.6,2.6]){posts.push(post(0,z,3.3,.24));posts.push(xform(blobGeo(.3,.2,.3,{seg:8,low:[.3,.22,.15],high:[.55,.42,.3]}),{pos:[0,3.4,z]}))}
 beam.push(bx(.3,.34,6,{pos:[0,3.05,0],color:[.7,.55,.4]}));
 for(const s of [-1,1])for(let i=0;i<9;i++){const z=s*(3.4+i*2.1);fence.push(post(0,z,1.15,.08));if(i<8)for(const y of [.5,.9])fence.push(bx(.09,.08,2.1,{pos:[0,y,z+s*1.05],color:[.7,.55,.4]}))}
 mk(g,posts,mats.bark());mk(g,beam,mats.plank('#8a6a45'));mk(g,fence,mats.plank('#8a6a45'));
 const sg=signMesh('SAFARI SANCTUARY',3.6,.72,{bg:'#e0cfa0',fg:'#4a2f14'});sg.rotation.y=Math.PI/2;sg.position.set(.02,2.55,0);g.add(sg);
 return g;
}
export function makeDeck(){
 const g=new THREE.Group();const deck=[],posts=[],roof=[];
 deck.push(bx(3.4,.16,2.4,{pos:[0,1,0],color:[.9,.8,.7],uv:.5}));
 for(const x of [-1.5,1.5])for(const z of [-1,1])posts.push(post(x,z,1,.08));
 for(const x of [-1.6,1.6])for(const z of [-1.1,1.1])posts.push(post(x,z,2.7,.06,[.45,.34,.24]));
 deck.push(bx(3.3,.07,.07,{pos:[0,1.85,1.1]}),bx(3.3,.07,.07,{pos:[0,1.45,1.1]}),bx(.07,.07,2.2,{pos:[-1.6,1.45,0]}),bx(.07,.07,2.2,{pos:[1.6,1.45,0]}));
 roof.push(bx(3.8,.1,2.9,{pos:[0,2.72,0],rot:[.07,0,0],color:[.9,.8,.6],uv:.4}));
 for(let i=0;i<5;i++)deck.push(bx(.9,.08,.3,{pos:[-2.2+i*.0,.2+i*.2,1.3+i*.3-.3]}));
 mk(g,deck,mats.plank('#8a6a45'));mk(g,posts,mats.bark());mk(g,roof,mats.thatch());return g;
}
export function makeTrough(){const g=new THREE.Group();mk(g,[bx(1.8,.3,.65,{pos:[0,.4,0],color:[.7,.55,.4]}),bx(1.65,.04,.5,{pos:[0,.55,0],color:[.4,.55,.6]}),bx(.1,.4,.5,{pos:[-.7,.2,0]}),bx(.1,.4,.5,{pos:[.7,.2,0]})],mats.plank('#7a5a3a'));return g}
export function makeSignpost(text='NORTH WOODLAND'){const g=new THREE.Group();mk(g,[post(0,0,1.9,.07)],mats.bark());const s=signMesh(text,1.3,.34);s.position.set(0,1.7,.08);g.add(s);const s2=signMesh('CREEK TRAIL',1.1,.3);s2.position.set(0,1.3,.08);s2.rotation.y=.2;g.add(s2);return g}
export function makeBoardwalk(planks=9,len=1.65){const g=new THREE.Group();const list=[];for(let i=0;i<planks;i++)list.push(bx(len,.12,.58,{pos:[0,0,i*.68],color:[.9+.05*(i%2),.8,.7],uv:.6}));mk(g,list,mats.plank('#9b7951'));g.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position?.count<220)o.castShadow=false});return g}

// ---------------- Conservation installations ----------------
export function makeNestBox(){const g=new THREE.Group();mk(g,[post(0,0,2.1,.05),bx(.42,.5,.38,{pos:[0,2.2,0],color:[.85,.7,.55]}),bx(.55,.06,.5,{pos:[0,2.5,0],rot:[.12,0,0],color:[.6,.45,.3]}),bx(.1,.1,.02,{pos:[0,2.25,.19],color:[.1,.07,.05]})],mats.plank('#8b6947'));g.traverse(o=>{if(o.isMesh)o.castShadow=false});return g}
export function makeCameraTrap(){const g=new THREE.Group();mk(g,[post(0,0,1.4,.06),bx(.34,.26,.2,{pos:[0,1.3,.08],color:[.25,.28,.22]})],mats.plank('#5a6a4a'));mk(g,[xform(lathe([[.04,0],[.05,.04],[.03,.05]],{seg:8,color:()=>[.02,.02,.05]}),{pos:[0,1.32,.19],rot:[Math.PI/2,0,0]})],mats.plain());g.traverse(o=>{if(o.isMesh)o.castShadow=false});return g}
export function makeHighlandReserve(){
 const g=new THREE.Group();const r=rng(3);
 for(let i=0;i<8;i++){const m=makeRock(i+40,{size:1.3+(i%3)*.28});m.position.set(-3+(i%4)*1.8+(i>3?1:0),0,-2+Math.floor(i/4)*-1.5+r()*.4);m.scale.y=1.2;g.add(m)}
 const pool=new THREE.Mesh(new THREE.CircleGeometry(2.15,24),new THREE.MeshStandardMaterial({color:'#5f8b94',roughness:.15}));pool.rotation.x=-Math.PI/2;pool.position.set(2.4,.12,2.3);g.add(pool);
 const reeds=makeReeds(3,10);for(let i=0;i<7;i++){const rd=reeds.clone();rd.position.set(2+Math.cos(i*.9)*2.3,0,2.3+Math.sin(i*.9)*2.1);g.add(rd)}
 const walk=makeBoardwalk(8,1.8);walk.position.set(-2,.34,2.1);walk.rotation.y=-.22;g.add(walk);
 for(let i=0;i<5;i++){const t=makeOak(i+20,{scale:.55+(i%3)*.1});t.position.set(-3.1+i*1.25,0,-2.8-(i%2)*.65);g.add(t)}
 const sg=signMesh('HIGHLAND MARSH',2.2,.5);sg.position.set(-2.2,1.5,3);g.add(sg);return g;
}
export function makeWetland(){const g=new THREE.Group();const pool=new THREE.Mesh(new THREE.CircleGeometry(2.6,20),new THREE.MeshStandardMaterial({color:'#5f8b94',roughness:.15}));pool.rotation.x=-Math.PI/2;pool.position.y=.1;g.add(pool);for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const rd=makeReeds(i,6);rd.position.set(Math.cos(a)*2.7,0,Math.sin(a)*2.7);g.add(rd)}return g}
export function makeMeadowPatch(){const g=new THREE.Group();for(let i=0;i<22;i++){const b=makeBush(i,{scale:.35});b.position.set((i%6)*.52-1.3,0,Math.floor(i/6)*.72-1.2);g.add(b)}return g}

// ---------------- Buildable items ----------------
export function makeBuildModel(type){
 const g=new THREE.Group();
 switch(type){
  case 'shadeTree':{const t=makeAcacia(Math.floor(Math.random()*50),.75);g.add(t);break}
  case 'pond':{const rim=[];const r=rng(2);for(let i=0;i<14;i++){const a=i/14*6.28;rim.push(xform(blobGeo(.3+r()*.15,.16,.28,{seg:8,noise:.25,seed:i,low:[.4,.4,.38],high:[.78,.76,.7]}),{pos:[Math.cos(a)*2.05,.1,Math.sin(a)*2.05]}))}mk(g,rim,mats.rock());
   const mud=new THREE.Mesh(new THREE.CircleGeometry(2.1,28),new THREE.MeshStandardMaterial({color:'#6e5a40',roughness:1}));mud.rotation.x=-Math.PI/2;mud.position.y=.04;mud.receiveShadow=true;g.add(mud);
   const w=makeWaterDisc(1.8,{color:'#6b97a1'});w.position.y=.08;w.userData.water=true;g.add(w);const rd=makeReeds(4,7);rd.position.set(1.4,0,.8);g.add(rd);break}
  case 'wallow':{const mud=new THREE.Mesh(new THREE.CircleGeometry(2.0,28),new THREE.MeshStandardMaterial({color:'#5a4634',roughness:.4}));mud.rotation.x=-Math.PI/2;mud.position.y=.05;g.add(mud);const mid=new THREE.Mesh(new THREE.CircleGeometry(1.4,24),new THREE.MeshStandardMaterial({color:'#6e5a45',roughness:.12}));mid.rotation.x=-Math.PI/2;mid.position.y=.07;g.add(mid);break}
  case 'shelter':{const wood=[bx(1.9,1.0,1.6,{pos:[0,.5,0],color:[.9,.75,.6]}),bx(.12,1.0,.12,{pos:[-.97,.5,.82],color:[.6,.45,.3]}),bx(.12,1.0,.12,{pos:[.97,.5,.82],color:[.6,.45,.3]}),bx(.9,.1,.1,{pos:[0,.9,.84],color:[.6,.45,.3]})],roof=[...gable(1.9,1.6,.7,{over:.3,y:1,uv:.5})],dark=[bx(.7,.8,.05,{pos:[0,.4,.82],color:[.08,.06,.05]})];
   const eave=[];for(let i=0;i<9;i++){for(const s of [-1,1])eave.push(xform(blobGeo(.2,.07,.16,{seg:6,low:[.55,.45,.25],high:[.9,.78,.45]}),{pos:[-.8+i*.2,.98+(1-Math.abs(i-4)/4)*.02,s*.95],rot:[0,0,0]}))}
   mk(g,wood,mats.plank('#8b6947'));mk(g,roof,mats.thatch());mk(g,dark,mats.plain());mk(g,stoneFoot(1.9,1.6,14),mats.rock());mk(g,eave,mats.plain());break}
  case 'rocks':{for(let i=0;i<4;i++){const rk=makeRock(i+7,{size:.8+(i===0?.5:0)});rk.position.set([0,.9,-.8,.2][i],0,[0,.5,.6,-.7][i]);rk.scale.y=1.2;g.add(rk)}break}
  case 'bamboo':g.add(makeBamboo(Math.floor(Math.random()*20)));break;
  case 'feeder':mk(g,[post(-.4,0,.6,.05),post(.4,0,.6,.05),bx(1.1,.2,.5,{pos:[0,.65,0],color:[.7,.55,.4]})],mats.plank('#7a5a3a'));mk(g,Array.from({length:7},(_,i)=>xform(blobGeo(.1,.07,.12,{seg:6,low:C('#b0924a'),high:C('#e8d08a')}),{pos:[-.42+i*.14,.8,0]})),mats.plain());break;
  case 'platform':{const d=makeDeck();d.scale.setScalar(.9);g.add(d);break}
  case 'path':mk(g,[0,1,2].map(i=>bx(1.6,.08,.42,{pos:[0,.05,(i-1)*.5],color:[.9+.04*i,.8,.7]})),mats.plank('#9b7951'));break;
  case 'flowers':{const list=[];list.push(xform(new THREE.CircleGeometry(1.1,14),{rot:[-Math.PI/2,0,0],pos:[0,.04,0]}));paintColor(list[0],C('#5f8a3e'));const cols=['#d9a0b4','#e5c879','#c98fd0','#f0e0b0'];for(let i=0;i<20;i++){const a=i*2.4,rad=.2+(i%5)*.17;const s=new THREE.CylinderGeometry(.012,.016,.32,4);paintColor(s,C('#5a7a3a'));list.push(xform(s,{pos:[Math.cos(a)*rad,.16,Math.sin(a)*rad]}));const h=blobGeo(.075,.05,.075,{seg:7,low:C(cols[i%4]).map(c=>c*.7),high:C(cols[i%4])});list.push(xform(h,{pos:[Math.cos(a)*rad,.34,Math.sin(a)*rad]}))}mk(g,list,mats.plain(),{shadow:false});break}
  case 'climbing':{const logs=[post(-.8,0,2.4,.13,[.5,.38,.27]),post(.8,0,2.4,.13,[.5,.38,.27]),xform(loft([{p:[-.8,1.1,0],rx:.1},{p:[.8,1.1,0],rx:.1}],{radial:8,rings:6,cap0:1,cap1:1,color:()=>[.55,.42,.3]}),{}),xform(loft([{p:[-.8,2.1,0],rx:.09},{p:[.8,2.1,0],rx:.09}],{radial:8,rings:6,cap0:1,cap1:1,color:()=>[.55,.42,.3]}),{}),xform(loft([{p:[.8,.1,.1],rx:.12},{p:[1.7,1.15,.1],rx:.1}],{radial:8,rings:8,cap0:1,cap1:1,color:()=>[.5,.38,.27]}),{})];logs.push(bx(1.9,.12,.9,{pos:[0,2.45,0],color:[.9,.78,.65]}));mk(g,logs,mats.bark());break}
  case 'digging':{const mound=xform(blobGeo(1.5,.28,1.5,{seg:12,noise:.12,low:C('#6a5238'),high:C('#9a7a54'),squash:.7}),{pos:[0,.12,0]});const rim=[];for(let i=0;i<10;i++){const a=i/10*6.28;rim.push(xform(blobGeo(.22,.14,.2,{seg:6,low:[.4,.4,.38],high:[.75,.72,.66]}),{pos:[Math.cos(a)*1.55,.08,Math.sin(a)*1.55]}))}mk(g,[mound],mats.plain());mk(g,rim,mats.rock());break}
  case 'puzzle':{const b=[post(0,0,1.2,.07),bx(.7,.55,.55,{pos:[0,1.4,0],color:[.85,.7,.55]}),bx(.12,.12,.04,{pos:[-.2,1.45,.29],color:[.1,.07,.05]}),bx(.12,.12,.04,{pos:[.2,1.45,.29],color:[.1,.07,.05]})];const balls=[];for(let i=0;i<3;i++){balls.push(xform(blobGeo(.12,.12,.12,{seg:8,low:C(['#b0413a','#3a6ab0','#d9b040'][i]).map(c=>c*.6),high:C(['#d9605a','#5a8ad0','#f0d060'][i])}),{pos:[-.3+i*.3,.95-i%2*.1,.35]}))}mk(g,b,mats.plank('#8b6947'));mk(g,balls,mats.plain());break}
  case 'scratch':{const pst=loft([{p:[0,0,0],rx:.2},{p:[0,1.2,0],rx:.17},{p:[0,2.2,0],rx:.14}],{radial:10,rings:12,cap0:1,cap1:1,color:()=>[.55,.4,.27]});const rope=[];for(let i=0;i<7;i++){const t=new THREE.TorusGeometry(.18,.03,5,12);paintColor(t,C('#b8a070'));rope.push(xform(t,{pos:[0,.5+i*.2,0],rot:[Math.PI/2,0,0]}))}mk(g,[pst],mats.bark());mk(g,rope,mats.plain());break}
  case 'scent':{const bowl=lathe([[0,0],[.3,.02],[.36,.16],[.32,.18],[.28,.06],[0,.05]],{seg:12,color:()=>[.45,.4,.35]});const herbs=[];for(let i=0;i<9;i++){const a=i/9*6.28;herbs.push(xform(blobGeo(.07,.22,.07,{seg:6,low:C('#4a7a3a').map(c=>c*.7),high:C('#9ac05a')}),{pos:[Math.cos(a)*.15,.3,Math.sin(a)*.15],rot:[Math.cos(a)*.5,0,Math.sin(a)*.5]}))}mk(g,[bowl],mats.rock());mk(g,herbs,mats.leaf());break}
  case 'releasePen':{const posts=[],rails=[];const n=14,R=2.1;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;if(i===0)continue;posts.push(post(Math.cos(a)*R,Math.sin(a)*R,1.1,.07,[.45,.33,.22]));const a2=(i+1)/n*Math.PI*2;if(i<n-1)for(const h of [.45,.85]){const x1=Math.cos(a)*R,z1=Math.sin(a)*R,x2=Math.cos(a2)*R,z2=Math.sin(a2)*R;rails.push(bx(Math.hypot(x2-x1,z2-z1),.07,.06,{pos:[(x1+x2)/2,h,(z1+z2)/2],rot:[0,-Math.atan2(z2-z1,x2-x1),0],color:[.62,.48,.33]}))}}mk(g,posts,mats.bark());mk(g,rails,mats.plank('#8b6947'));const sh=makeBush(3,{scale:.6});sh.position.set(.6,0,-.4);g.add(sh);const rk=makeRock(5,{size:.5});rk.position.set(-.7,0,.3);g.add(rk);const sg=signMesh('RELEASE',.9,.26);sg.position.set(R+.15,.95,.2);sg.rotation.y=Math.PI/2;g.add(sg);break}
  case 'cafe':{const b=bx(2.6,1.5,2.0,{pos:[0,.75,0],color:[1,1,1],uv:.4}),roof=gable(2.6,2.0,.8,{over:.35,y:1.5,uv:.45}),counter=[bx(2.2,.55,.5,{pos:[0,.28,1.25],color:[.7,.5,.32]}),bx(.1,1.2,.1,{pos:[-1.2,.6,1.3],color:[.5,.38,.27]}),bx(.1,1.2,.1,{pos:[1.2,.6,1.3],color:[.5,.38,.27]}),bx(2.7,.05,.9,{pos:[0,1.2,1.2],color:[.85,.35,.3],rot:[.25,0,0]})],tables=[];for(const x of [-1.5,1.5])tables.push(xform(new THREE.CylinderGeometry(.34,.34,.05,12),{pos:[x,.7,1.9]}),xform(new THREE.CylinderGeometry(.04,.04,.7,6),{pos:[x,.35,1.9]}));tables.forEach(t=>paintColor(t,[.6,.45,.3]));mk(g,[b],mats.plaster('#e6d7ae'));mk(g,roof,mats.shingle('#a8553a'));mk(g,counter,mats.plank('#8b6947'));mk(g,tables,mats.plank('#8b6947'));mk(g,[bx(.7,.7,.04,{pos:[-.6,.9,1.01]}),bx(.7,.7,.04,{pos:[.6,.9,1.01]})],lamp.mat,{shadow:false});const sg=signMesh('CAFÉ',1.0,.32);sg.position.set(0,1.95,1.05);g.add(sg);break}
  case 'giftShop':{const b=bx(2.2,1.4,1.8,{pos:[0,.7,0],color:[1,1,1],uv:.4}),roof=gable(2.2,1.8,.7,{over:.3,y:1.4,uv:.45}),door=[bx(.7,1.1,.05,{pos:[-.5,.55,.92],color:[.3,.22,.15]})],shelf=[bx(.9,.5,.05,{pos:[.55,.9,.92],color:[.5,.4,.3]}),bx(1.0,.06,.35,{pos:[.55,.55,1.1],color:[.65,.5,.35]})];const toys=[];for(let i=0;i<4;i++)toys.push(xform(blobGeo(.1,.1,.1,{seg:6,low:C(['#d9605a','#5a8ad0','#e8c050','#7ab060'][i]).map(c=>c*.7),high:C(['#d9605a','#5a8ad0','#e8c050','#7ab060'][i])}),{pos:[.2+i*.22,.65,1.1]}));mk(g,[b],mats.plaster('#c9d8b8'));mk(g,roof,mats.thatch());mk(g,door,mats.plank('#4a3220'));mk(g,shelf,mats.plank('#8b6947'));mk(g,toys,mats.plain());const sg=signMesh('GIFTS',1.0,.3);sg.position.set(0,1.75,.95);g.add(sg);break}
  case 'education':{const b=bx(3.4,1.8,2.6,{pos:[0,.9,0],color:[1,1,1],uv:.35}),roof=gable(3.4,2.6,1.0,{over:.4,y:1.8,uv:.4}),trim=[bx(.9,1.2,.05,{pos:[0,.6,1.32],color:[.3,.22,.15]})],gl=[bx(.7,.6,.04,{pos:[-1.1,1.05,1.32]}),bx(.7,.6,.04,{pos:[1.1,1.05,1.32]})];mk(g,[b],mats.plaster('#dccaa0'));mk(g,roof,mats.shingle('#7a5a3a'));mk(g,trim,mats.plank('#4a3220'));mk(g,gl,lamp.mat,{shadow:false});const sg=signMesh('EDUCATION',1.8,.4);sg.position.set(0,2.15,1.38);g.add(sg);break}
  default:g.add(makeRock(1));
 }
 g.traverse(o=>{
 if(!o.isMesh)return;
 const p=o.geometry?.attributes?.position?.count||0;
 const tiny=p<180;
 const transparent=!!o.material?.transparent;
 o.castShadow=!!o.castShadow&&!o.userData.water&&!tiny&&!transparent;
 o.receiveShadow=!transparent;
});
 return g;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCreature, creatureKinds } from '../src/art/creature.js';
import { SPECS } from '../src/art/creature-specs.js';
import { makeHuman, makeRole, makeVisitor, LOOKS, visitorLook } from '../src/art/human.js';
import { makeBuildModel } from '../src/art/structures.js';
import { makeOak, makePine, makeAcacia, makeBaobab, makeBush, makeBamboo, makeRock } from '../src/art/vegetation.js';
import { TIERS, detectTier, createGovernor } from '../src/art/quality.js';
import { BUILD_ITEMS } from '../src/operations.js';
import { SPECIES } from '../src/sanctuary.js';
import { WOODLAND } from '../src/journal.js';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';

const tris=o=>{let t=0;o.traverse(m=>{if(m.isMesh)t+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3});return t};
const count=(o,f)=>{let n=0;o.traverse(x=>{if(f(x))n++});return n};
const finite=o=>{let ok=true;o.traverse(b=>{if(b.isBone||b.isMesh){const v=[b.position.x,b.position.y,b.position.z,b.rotation.x,b.rotation.y,b.rotation.z,b.scale.x,b.scale.y,b.scale.z];if(!v.every(Number.isFinite))ok=false}});return ok};

test('every species the game can spawn has a rigged 3D model (no placeholder primitives)',()=>{
  const sim=createSimulation();createSanctuary(sim);
  const kinds=new Set([...sim.animals.map(a=>a.kind),...Object.keys(SPECIES),...Object.keys(WOODLAND)]);
  assert.ok(kinds.size>=26,'all 26 species are in play: '+kinds.size);
  for(const k of kinds)assert.ok(SPECS[k],'missing model spec for '+k);
  assert.deepEqual(new Set(creatureKinds()),new Set(Object.keys(SPECS)));
});

test('each animal is one skinned mesh on a real skeleton with a sane triangle budget',()=>{
  for(const k of creatureKinds()){
    const a=makeCreature(k,{sex:'male'});
    assert.ok(a,k);
    assert.ok(count(a,o=>o.isSkinnedMesh)>=1,k+' has a skinned mesh');
    assert.ok(count(a,o=>o.isBone)>=7,k+' has a skeleton ('+count(a,o=>o.isBone)+' bones)');
    const t=tris(a);assert.ok(t>1200&&t<12000,k+' triangle budget '+Math.round(t));
    const prim=count(a,o=>o.isMesh&&!o.isSkinnedMesh&&['SphereGeometry','BoxGeometry','CylinderGeometry','ConeGeometry'].includes(o.geometry.type)&&!/^eye/.test(o.name));
    assert.equal(prim,0,k+' contains only the two eye meshes as separate parts');
    const box=new THREE.Box3().setFromObject(a);assert.ok(box.max.y>.2&&box.max.y<6,k+' height '+box.max.y.toFixed(2));
  }
});

test('animals animate procedurally: gaits move limbs, sleeping lowers the body, nothing goes NaN',()=>{
  for(const k of creatureKinds()){
    const a=makeCreature(k,{sex:'female'});const rig=a.userData.rig;assert.ok(rig&&typeof rig.update==='function',k);
    const leg=a.getObjectByName('upFL')||a.getObjectByName('upL')||a.getObjectByName('legFL');
    const before=leg.rotation.x;
    for(let i=0;i<80;i++)rig.update(1/30,{moving:true,anim:'idle'});
    let moved=false;for(let i=0;i<30;i++){rig.update(1/30,{moving:true});if(Math.abs(leg.rotation.x-before)>.02)moved=true}
    assert.ok(moved,k+' legs move when walking');
    const root=a.getObjectByName('root');const y0=root.position.y;
    for(let i=0;i<120;i++)rig.update(1/30,{moving:false,sleeping:true});
    assert.ok(root.position.y<=y0+.012,k+' lowers or keeps body when sleeping');
    for(const ctx of [{anim:'forage'},{anim:'feed'},{alert:true},{flying:true},{swim:true},{moving:true,run:true}])for(let i=0;i<20;i++)rig.update(1/60,ctx);
    assert.ok(finite(a),k+' transforms stay finite');
  }
});

test('instances share geometry and materials but own their skeletons',()=>{
  const a=makeCreature('africanLion',{sex:'male'}),b=makeCreature('africanLion',{sex:'male'});
  const ma=a.getObjectByName('body'),mb=b.getObjectByName('body');
  assert.equal(ma.geometry,mb.geometry);assert.equal(ma.material[0],mb.material[0]);assert.notEqual(ma.skeleton,mb.skeleton);
  a.userData.rig.update(.5,{moving:true});for(let i=0;i<30;i++)a.userData.rig.update(1/30,{moving:true});
  assert.notEqual(a.getObjectByName('upFL').rotation.x,b.getObjectByName('upFL').rotation.x);
  assert.ok(makeCreature('africanLion',{sex:'male'}).getObjectByName('body').geometry!==makeCreature('africanLion',{sex:'female'}).getObjectByName('body').geometry,'males and females differ (mane)');
});

test('species are visually distinct: size, silhouette and rig features match the real animals',()=>{
  const h=k=>new THREE.Box3().setFromObject(makeCreature(k,{sex:'male'})).max.y;
  assert.ok(h('giraffe')>h('africanElephant')&&h('africanElephant')>h('africanLion')&&h('africanLion')>h('fox')&&h('fox')>h('turtle'));
  assert.ok(makeCreature('africanElephant').getObjectByName('trunk5'),'elephant has a trunk chain');
  assert.ok(makeCreature('africanLion',{sex:'male'}).getObjectByName('body').geometry.attributes.position.count>makeCreature('africanLion',{sex:'female'}).getObjectByName('body').geometry.attributes.position.count,'male lions have a mane');
  assert.ok(makeCreature('flamingo').getObjectByName('wingL2'),'birds have articulated wings');
  assert.ok(makeCreature('giraffe').getObjectByName('neck2'),'giraffe has a neck chain');
});

test('people are rigged humans with distinct roles and walk/work animations',()=>{
  for(const role of Object.keys(LOOKS)){
    const p=makeRole(role);assert.ok(count(p,o=>o.isSkinnedMesh)>=1);assert.ok(count(p,o=>o.isBone)>=17,role+' bones '+count(p,o=>o.isBone));
    assert.ok(tris(p)>2500&&tris(p)<9000,role+' tris '+Math.round(tris(p)));
    const thigh=p.getObjectByName('thighL');for(let i=0;i<40;i++)p.userData.rig.update(1/30,{moving:true});
    let min=1,max=-1;for(let i=0;i<40;i++){p.userData.rig.update(1/30,{moving:true});min=Math.min(min,thigh.rotation.x);max=Math.max(max,thigh.rotation.x)}
    assert.ok(max>.25&&min<-.25,role+' legs swing both ways');
    const arm=p.getObjectByName('uarmL');for(let i=0;i<60;i++)p.userData.rig.update(1/30,{pose:'work'});assert.ok(arm.rotation.x<-.6,role+' arms raise to work');
    assert.ok(finite(p));
  }
  const looks=new Set();for(let i=0;i<14;i++){const l=visitorLook(i);looks.add(l.shirt+l.skin+l.hairStyle+l.hat)}assert.ok(looks.size>=8,'visitors vary: '+looks.size);
  const v=makeVisitor(3);assert.ok(v.userData.isHuman);assert.ok(count(v,o=>o.isBone)>=17);
});

test('every buildable habitat structure has a detailed model; vegetation and rocks are real meshes',()=>{
  for(const type of Object.keys(BUILD_ITEMS)){const m=makeBuildModel(type);const t=tris(m);assert.ok(t>30&&t<8000,type+' tris '+Math.round(t));assert.ok(count(m,o=>o.isMesh)>=1,type)}
  assert.ok(tris(makeBuildModel('shelter'))>1000,'shelter is built from timber, thatch and a door, not a box');
  for(const [name,fn] of Object.entries({oak:()=>makeOak(1),pine:()=>makePine(1),acacia:()=>makeAcacia(1),baobab:()=>makeBaobab(),bush:()=>makeBush(1),bamboo:()=>makeBamboo(1),rock:()=>makeRock(1)})){
    const o=fn();assert.ok(tris(o)>150,name+' '+Math.round(tris(o)));assert.ok(count(o,m=>m.isMesh)<=3,name+' merges to few draw calls');
  }
  assert.ok(tris(makeOak(1,{detail:.4}))<tris(makeOak(1)),'foliage level-of-detail reduces triangles');
});

test('quality tiers scale cost and the governor only ever steps down when frames are slow',()=>{
  assert.ok(TIERS.low.grass<TIERS.medium.grass&&TIERS.medium.grass<TIERS.high.grass);
  assert.ok(TIERS.low.shadowMap<TIERS.high.shadowMap&&TIERS.low.post===false&&TIERS.high.post===true);
  globalThis.innerWidth=390;globalThis.innerHeight=800;globalThis.location={search:''};
  globalThis.matchMedia=q=>({matches:/coarse/.test(q)});
  assert.equal(detectTier(),'low','phones start on the low tier');
  globalThis.location={search:'?quality=high'};assert.equal(detectTier(),'high','explicit override wins');
  globalThis.matchMedia=()=>({matches:false});globalThis.innerWidth=1600;globalThis.innerHeight=900;globalThis.location={search:''};
  assert.ok(['medium','high'].includes(detectTier()));
  const T0=performance.now();const changes=[];const g=createGovernor((t)=>changes.push(t),'high');let now=T0;g.tick(now);
  for(let i=0;i<120;i++){now+=50;g.tick(now)}   // 20 fps
  assert.deepEqual(changes.slice(0,1),['medium']);
  const fast=[];const g2=createGovernor(t=>fast.push(t),'high');let n2=performance.now();g2.tick(n2);for(let i=0;i<400;i++){n2+=16;g2.tick(n2)}
  assert.deepEqual(fast,[],'60 fps stays on the current tier');
  const m=[];const g3=createGovernor(t=>m.push(t),'low');let n3=performance.now();g3.tick(n3);for(let i=0;i<300;i++){n3+=100;g3.tick(n3)}assert.deepEqual(m,[],'low has nowhere to go');
});

test('the art overhaul changes rendering only: gameplay state and saves are untouched',()=>{
  const sim=createSimulation();const s=createSanctuary(sim);const ops=createOperations(s);
  s.state.funds=4000;ops.hire('keeper');ops.place('pond',24,-6);
  const snap=JSON.parse(JSON.stringify(s.serialize()));
  assert.equal(snap.v,1);assert.deepEqual(Object.keys(snap).sort(),['animals','ext','state','v']);
  assert.ok(snap.ext.ops.items.every(i=>['id','type','x','z','rot'].every(k=>k in i)),'build items keep their save format');
  assert.ok(snap.animals.every(a=>a.kind&&a.id&&a.habitatPosition));
  const sim2=createSimulation();const s2=createSanctuary(sim2);createOperations(s2);assert.equal(s2.restore(snap),true);
  assert.equal(s2.summary().ext.items.length,1);assert.equal(s2.residents().length,16);
});

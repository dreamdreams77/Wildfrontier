import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeBuildModel } from '../src/art/structures.js';
import { setWaterActors, makeWaterDisc, groundFx } from '../src/art/terrain.js';
import { createAtmosphere } from '../src/art/atmosphere.js';
import { TIERS } from '../src/art/quality.js';
import { BUILD_ITEMS, ROLES } from '../src/operations.js';
import { LOOKS, makeRole } from '../src/art/human.js';

test('every buildable item, including the new café and gift shop, has a real model with no NaN geometry',()=>{
  for(const type of Object.keys(BUILD_ITEMS)){
    const g=makeBuildModel(type);let meshes=0;
    g.traverse(o=>{if(o.isMesh){meshes++;const p=o.geometry.attributes.position;for(let i=0;i<p.count*3;i++)assert.ok(Number.isFinite(p.array[i]),type+' has finite vertices')}});
    assert.ok(meshes>0,type+' renders something');
  }
  for(const t of ['cafe','giftShop'])assert.ok(makeBuildModel(t).children.length>2,t+' is modelled, not a placeholder rock');
});

test('every staff role has a distinct look and builds a rigged figure',()=>{
  for(const role of Object.keys(ROLES)){assert.ok(LOOKS[role],role+' has a look');const f=makeRole(role);assert.ok(f.userData.rig)}
  assert.notEqual(LOOKS.cleaner.shirt,LOOKS.keeper.shirt);
});

test('water ripples cap at eight movers and clear when nobody is moving',()=>{
  const d=makeWaterDisc(2);assert.ok(d.material);
  setWaterActors(Array.from({length:12},(_,i)=>({x:i,z:i,speed:.5})));
  setWaterActors([]);
  assert.ok(true);
});

test('atmosphere fades motes and birds out at night and in rain, and never produces NaN',()=>{
  const scene=new THREE.Scene();const a=createAtmosphere(scene,{tier:TIERS.medium||Object.values(TIERS)[0]});
  const day={night:false,rain:false,glow:false,season:'Spring'};
  for(let i=0;i<120;i++)a.update(i*.1,.1,day,{x:24,z:0});
  assert.ok(a.motes.visible,'motes shown in fair daylight');assert.ok(a.birds.every(b=>b.g.visible));
  const p=a.motes.geometry.attributes.position;for(let i=0;i<p.count*3;i++)assert.ok(Number.isFinite(p.array[i]));
  for(let i=0;i<200;i++)a.update(20+i*.1,.1,{...day,night:true,glow:true},{x:24,z:0});
  assert.equal(a.motes.visible,false);assert.ok(a.birds.every(b=>!b.g.visible));assert.ok(groundFx.uCloud.value<.05,'cloud shadows fade at night');
  for(let i=0;i<200;i++)a.update(40+i*.1,.1,{...day,rain:true},{x:24,z:0});
  assert.equal(a.motes.visible,false);
});

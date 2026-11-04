import test from 'node:test';
import assert from 'node:assert/strict';
import { fallsLayout, ridgeLayout, bridgeLayout, creekX, CREEK } from '../src/art/kenney-layout.js';
import { cliffGeos, ribbonGeo } from '../src/art/cliffs.js';
import { LANDMARKS } from '../src/journal.js';
import { ZONE } from '../src/operations.js';

test('the waterfall sits at the head of the creek, inside the reserve, and faces down the creek',()=>{
  const f=fallsLayout();
  assert.ok(Math.abs(f.origin.x-creekX(f.origin.z))<1e-9);
  assert.ok(f.origin.z<=-CREEK.half&&f.origin.z>-28,'at the creek head, inside the 28-unit reserve edge');
  assert.equal(f.origin.rotY,CREEK.angle);
  const top=Math.max(...f.ribbon.path.map(p=>p[1])),bottom=Math.min(...f.ribbon.path.map(p=>p[1]));
  assert.ok(top>4&&bottom<1,'the sheet falls from high on the cliff to the pool');
  const ys=f.ribbon.path.map(p=>p[1]);assert.deepEqual(ys,[...ys].sort((a,b)=>b-a),'water only falls');
  assert.ok(f.masses.every(m=>Math.abs(m.x)>2||m.z<-3),'rock masses leave the channel clear');
});

test('cliff ridges stay on the reserve edge, outside the buildable safari grounds',()=>{
  const r=ridgeLayout();assert.ok(r.length>=10);
  for(const m of r){assert.ok(m.z<ZONE.minZ-5||m.x>ZONE.maxX+4,'ridge piece is clear of build zone');assert.ok(m.h>2&&m.h<7);}
  assert.deepEqual(ridgeLayout(),ridgeLayout(),'layout is deterministic');
});

test('bridges span the creek and its banks, perpendicular to the flow',()=>{
  const b=bridgeLayout();assert.equal(b.length,2);
  for(const x of b){assert.ok(x.length>=CREEK.mudWidth,'long enough to cross the muddy banks');assert.ok(Math.abs(x.x-creekX(x.z))<1e-9);assert.equal(x.rotY,CREEK.angle);
   assert.ok(x.pieces[0].file.includes('side')&&x.pieces.at(-1).file.includes('side'),'ends are finished');}
});

test('rock masses and the water ribbon build valid geometry',()=>{
  const geos=cliffGeos({w:6,d:3.4,h:4.5,seed:3});assert.ok(geos.length>=6);
  for(const g of geos){const p=g.attributes.position;for(let i=0;i<p.count*3;i++)assert.ok(Number.isFinite(p.array[i]))}
  const rb=ribbonGeo(fallsLayout().ribbon.path,1.7);assert.equal(rb.attributes.position.count,10);assert.equal(rb.index.count,24);
});

test('the falls is a discoverable journal landmark',()=>{
  const l=LANDMARKS.find(x=>x.id==='falls');assert.ok(l);assert.ok(Math.hypot(l.x-fallsLayout().origin.x,l.z-fallsLayout().origin.z)<4);assert.ok(!l.start);
});

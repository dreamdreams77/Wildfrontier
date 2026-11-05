import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createManagement } from '../src/management.js';
import { createRelease, PREP_DAYS, TRACK_DAYS } from '../src/release.js';

const DAY=1440;
const setup=(r=.99)=>{const sim=createSimulation();const s=createSanctuary(sim,{rng:()=>.5});const ops=createOperations(s,{rng:()=>.5});const mgmt=createManagement(s,ops,{rng:()=>.99});const rel=createRelease(s,ops,mgmt,{rng:()=>r});return {sim,s,ops,mgmt,rel}};
const nextDay=s=>{s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2)};
const lion=s=>s.residents().find(a=>a.name==='Jabari');

test('release needs a pen, a big enough breeding group and a healthy animal',()=>{
  const {s,ops,rel}=setup();const a=lion(s);
  assert.equal(rel.prepare(a.id).ok,false,'no pen');
  s.state.funds=5000;ops.place('releasePen',40,-14);
  const r=rel.prepare(a.id);assert.equal(r.ok,false,'only two lions: breeding group would break');assert.match(r.message,/breeding group/);
  s.state.credits=20;s.importFounder('africanLion','male');assert.equal(rel.prepare(a.id).ok,true);
});

test('preparation builds wild skill and wariness; a well-prepared animal is released and established',()=>{
  const {s,ops,rel}=setup(.99);s.state.funds=5000;ops.place('releasePen',40,-14);s.state.credits=20;s.importFounder('africanLion','male');
  const a=lion(s);a.health=95;a.energy=85;a.nutrition=75;rel.prepare(a.id);
  assert.equal(rel.release(a.id).ok,false,'too early');
  const before=rel.readiness(a).score;for(let d=0;d<PREP_DAYS;d++){a.boredom=20;nextDay(s)}
  assert.ok(rel.readiness(a).score>before+15,'readiness grew');
  const n=s.residents().length;const r=rel.release(a.id);assert.equal(r.ok,true,r.message);assert.equal(r.removedId,a.id);assert.equal(s.residents().length,n-1);
  const cr=s.state.credits;for(let d=0;d<TRACK_DAYS;d++)nextDay(s);
  assert.equal(rel.summary().released[0].status,'established');assert.ok(s.state.credits>=cr+8);
});

test('a poorly prepared release can be lost, which costs reputation',()=>{
  const {s,ops,rel}=setup(0);s.state.funds=5000;ops.place('releasePen',40,-14);s.state.credits=20;s.importFounder('africanLion','male');
  const a=lion(s);rel.prepare(a.id);for(let d=0;d<PREP_DAYS;d++)nextDay(s);a.health=100;a.energy=100;a.nutrition=75;a.trust=0;a.wildSkill=60;
  assert.equal(rel.release(a.id).ok,true);const rep=s.state.reputation;nextDay(s);
  assert.equal(rel.summary().released[0].status,'lost');assert.ok(s.state.reputation<rep+1);
});

test('young, pregnant or sick animals are not eligible',()=>{
  const {s,mgmt,rel}=setup();const a=lion(s);a.pregnant={dueMinute:9e9,sireName:'x'};assert.ok(rel.blockers(a).some(b=>/Expecting/.test(b)));
  delete a.pregnant;mgmt.start(a,'parasites');assert.ok(rel.blockers(a).some(b=>/unwell/.test(b)));
});

test('the programme saves and restores',()=>{
  const {s,ops,rel}=setup();s.state.funds=5000;ops.place('releasePen',40,-14);s.state.credits=20;s.importFounder('africanLion','male');rel.prepare(lion(s).id);
  const save=JSON.parse(JSON.stringify(s.serialize()));const b=setup();assert.equal(b.s.restore(save),true);assert.ok(b.rel.state.prep['africanLion-jabari']);
});

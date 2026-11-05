import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createManagement } from '../src/management.js';
import { createEvents, EVENTS, PATROL_POINTS } from '../src/events.js';

const DAY=1440;
const setup=(r=.5)=>{const sim=createSimulation();const s=createSanctuary(sim,{rng:()=>.5});const ops=createOperations(s,{rng:()=>.5});const mgmt=createManagement(s,ops,{rng:()=>.99});const ev=createEvents(s,ops,mgmt,{rng:()=>r});return {sim,s,ops,mgmt,ev}};
const toNextDay=s=>{s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2)};

test('choices cost money, apply, and cannot be made twice',()=>{
  const {s,ev}=setup();const e=ev.start('drought');const f=s.state.funds;
  assert.equal(ev.choose(e.id,'truck').ok,true);assert.equal(s.state.funds,f-EVENTS.drought.choices[0].cost);
  assert.equal(ev.choose(e.id,'ration').ok,false);
  s.state.funds=0;const e2=ev.start('storm');assert.equal(ev.choose(e2.id,'secure').ok,false,'cannot afford');
});

test('a drought drains water unless a truck is hired',()=>{
  const a=setup();a.ev.start('drought');a.s.state.waterLevel=90;for(let i=0;i<6;i++)a.s.tick(60);
  const b=setup();const e=b.ev.start('drought');b.ev.choose(e.id,'truck');b.s.state.waterLevel=90;for(let i=0;i<6;i++)b.s.tick(60);
  assert.ok(a.s.state.waterLevel<b.s.state.waterLevel-5,'rationing drains faster ('+a.s.state.waterLevel+' vs '+b.s.state.waterLevel+')');
});

test('a storm damages structures unless secured',()=>{
  for(const choice of ['ride','secure']){
    const {s,ops,ev}=setup();s.state.funds=5000;ops.place('pond',30,-15);ops.place('shelter',22,3);ops.place('feeder',26,-4);
    const e=ev.start('storm');ev.choose(e.id,choice);s.state.minutes=e.endsAt;s.tick(1);
    const worst=Math.min(...ops.state.items.map(i=>i.cond));
    if(choice==='ride')assert.ok(worst<80,'damage when riding it out');else assert.ok(worst>=90,'little damage when secured');
  }
});

test('a donor rewards a clean, healthy sanctuary and is put off by a dirty one',()=>{
  const good=setup();good.s.state.funds=1000;const e=good.ev.start('vip');good.ev.choose(e.id,'spruce');const f=good.s.state.funds;good.s.state.minutes=e.endsAt;good.s.tick(1);
  assert.ok(good.s.state.funds>f+300,'donation received');
  const bad=setup();for(const k of Object.keys(bad.s.SPECIES))bad.mgmt.state.dirt[k]=90;const e2=bad.ev.start('vip');const rep=bad.s.state.reputation;bad.s.state.minutes=e2.endsAt;bad.s.tick(1);
  assert.ok(bad.s.state.reputation<rep,'reputation lost');
});

test('a poacher patrol only succeeds if the ranger walks to every fence post',()=>{
  const ok=setup();const e=ok.ev.start('poachers');ok.ev.choose(e.id,'patrol');assert.equal(ok.ev.markers().length,3);
  for(const [x,z] of PATROL_POINTS)ok.ev.visit({x:x+.5,z});assert.equal(ok.ev.markers().length,0);
  const rep=ok.s.state.reputation;ok.s.state.minutes=e.endsAt;ok.s.tick(1);assert.ok(ok.s.state.reputation>=rep+5);
  const miss=setup();const e2=miss.ev.start('poachers');miss.ev.choose(e2.id,'patrol');miss.ev.visit({x:PATROL_POINTS[0][0],z:PATROL_POINTS[0][1]});
  miss.s.state.minutes=e2.endsAt;miss.s.tick(1);assert.ok(miss.mgmt.state.cases.some(c=>c.cond==='injury'),'an animal was injured');
});

test('undecided events fall back to the free option, and events start on their own over time',()=>{
  const {ev}=setup(.05);ev.start('heatwave');assert.equal(ev.summary().active[0].effective,'shade');
  const {s:s2,ev:ev2}=setup(.05);for(let d=0;d<10;d++)toNextDay(s2);assert.ok(ev2.state.active.length+ev2.state.history.length>0,'an event happened');
});

test('events save and restore, and damaged blocks are ignored',()=>{
  const {s,ev}=setup();const e=ev.start('poachers');ev.choose(e.id,'patrol');ev.visit({x:PATROL_POINTS[1][0],z:PATROL_POINTS[1][1]});
  const save=JSON.parse(JSON.stringify(s.serialize()));
  const b=setup();assert.equal(b.s.restore(save),true);assert.equal(b.ev.state.active.length,1);assert.equal(b.ev.markers().length,2);
  const bad=JSON.parse(JSON.stringify(save));bad.ext.events={active:[null,{type:'x'}],history:'no'};const c=setup();assert.equal(c.s.restore(bad),true);assert.equal(c.ev.state.active.length,0);
});

test('sprucing up for a donor repairs worn structures even without the management module',()=>{
  const sim=createSimulation();const s=createSanctuary(sim,{rng:()=>.5});const ops=createOperations(s,{rng:()=>.5});const ev=createEvents(s,ops,null,{rng:()=>.5});
  s.state.funds=5000;ops.place('pond',30,-15);ops.state.items[0].cond=20;const e=ev.start('vip');assert.equal(ev.choose(e.id,'spruce').ok,true);
  assert.ok(ops.state.items[0].cond>=85);
});

test('restored events always get unique ids',()=>{
  const {s,ev}=setup();ev.start('drought');const save=JSON.parse(JSON.stringify(s.serialize()));
  save.ext.events.serial=0;save.ext.events.active.push({type:'storm',endsAt:save.ext.events.active[0].endsAt});
  const b=setup();assert.equal(b.s.restore(save),true);const ids=b.ev.state.active.map(e=>e.id);assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);
  const n=b.ev.start('heatwave');assert.ok(!ids.includes(n.id),'a new event does not reuse a restored id');
  assert.equal(b.ev.choose(ids[1],'secure').ok,true);
});

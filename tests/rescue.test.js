import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createRescue, TEMPLATES, SPOTS, APPROACHES, PHASES } from '../src/rescue.js';
import { createDirector } from '../src/director.js';
import { createJournal } from '../src/journal.js';
import { EQUIPMENT } from '../src/equipment.js';
import { SPECIES } from '../src/sanctuary.js';

const seeded=(seed=3)=>{let n=seed;return()=>{n=(n*16807)%2147483647;return n/2147483647}};
const setup=(rng=seeded())=>{const sim=createSimulation();const s=createSanctuary(sim,{rng});const ops=createOperations(s,{rng});const r=createRescue(sim,s,{rng});const j=createJournal(SPECIES);const d=createDirector(sim,s,ops,j,r,{rng});return {sim,s,ops,r,j,d}};
const DAY=1440;
const walkTo=(r,c,aid,sim,ranger={})=>{const a=sim.animals.find(x=>x.id===aid);ranger.x=a.habitatPosition[0]+1;ranger.z=a.habitatPosition[1];return ranger};

test('a rescue report creates a hidden injured animal with a deadline and equipment needs',()=>{
  const {sim,r}=setup();const c=r.report('midsize');
  assert.equal(c.phase,'reported');assert.equal(c.difficulty,2);assert.ok(c.deadline>c.reportedAt);assert.deepEqual(c.equipment,['net']);
  const a=sim.animals.find(x=>x.id===c.animalIds[0]);assert.ok(a.hidden&&a.stage==='sighted'&&a.health<50&&a.injury);assert.ok(a.traits);
  assert.ok(SPOTS.some(s=>s.name===c.spot.name));
});

test('templates span four difficulty levels, time pressure, equipment and multi-animal cases',()=>{
  assert.deepEqual([...new Set(TEMPLATES.map(t=>t.difficulty))].sort(),[1,2,3,4]);
  assert.ok(TEMPLATES.some(t=>t.count>1)&&TEMPLATES.some(t=>t.deadlineH)&&TEMPLATES.some(t=>t.deadlineH===null));
  assert.ok(TEMPLATES.some(t=>t.equipment.includes('tranq')&&t.equipment.includes('crate')));
  for(const t of TEMPLATES)for(const e of t.equipment)assert.ok(EQUIPMENT[e],e);
});

test('tracking: the animal stays hidden until you follow the clues',()=>{
  const {sim,r}=setup();const c=r.report('small');const a=sim.animals.find(x=>x.id===c.animalIds[0]);
  assert.equal(r.accept(c.id).ok,true);assert.equal(c.clues.length,3);
  assert.deepEqual(r.visit({x:-40,z:-40}),[],'far away finds nothing');assert.ok(a.hidden);
  for(const cl of c.clues){const ev=r.visit({x:cl.x,z:cl.z});assert.ok(ev.some(e=>e.type==='clue'||e.type==='found'))}
  assert.equal(c.phase,'found');assert.equal(a.hidden,false);
});

test('assessment and handling need proximity and equipment',()=>{
  const {sim,s,r}=setup();const c=r.report('deer');r.accept(c.id);const aid=c.animalIds[0];const a=sim.animals.find(x=>x.id===aid);
  assert.equal(r.assess(c.id,{x:0,z:0}).ok,false,'not found yet');
  for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});
  assert.equal(r.assess(c.id,{x:-99,z:-99}).ok,false,'too far away');
  const rg=walkTo(r,c,aid,sim);const as=r.assess(c.id,rg);assert.equal(as.ok,true);assert.equal(c.phase,'assessed');
  s.state.stock.net=0;const miss=r.handle(c.id,aid,rg);assert.equal(miss.ok,false);assert.match(miss.message,/Missing equipment/);
  s.state.stock.net=1;s.state.stock.firstAid=1;const far=r.handle(c.id,aid,{x:50,z:50});assert.equal(far.ok,false);assert.match(far.message,/within/);
  const ok=r.handle(c.id,aid,rg,'net');assert.ok('chance' in ok);assert.ok(s.state.stock.firstAid<=0,'consumables are used up');assert.equal(s.state.stock.net,1,'durable gear is kept');
});

test('approach trade-offs: sedation is most reliable, quiet gentlest, failures hurt and reset the trail',()=>{
  assert.ok(APPROACHES.sedate.base>APPROACHES.net.base&&APPROACHES.net.base>APPROACHES.quiet.base);
  assert.ok(APPROACHES.quiet.stress<APPROACHES.net.stress);
  let fails=0,wins=0;
  for(let seed=1;seed<=40;seed++){const {sim,s,r}=setup(seeded(seed*13));s.state.stock.net=1;const c=r.report('midsize');r.accept(c.id);for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});const aid=c.animalIds[0];const rg=walkTo(r,c,aid,sim);r.assess(c.id,rg);const a=sim.animals.find(x=>x.id===aid);const h0=a.health;
   const res=r.handle(c.id,aid,rg,'net');if(res.ok){wins++;assert.equal(c.phase,'handled')}else{fails++;assert.ok(a.health<h0,'a failed capture injures it');assert.equal(c.phase,'tracking');assert.ok(a.hidden);assert.ok(c.clues.length>0)}}
  assert.ok(wins>10&&fails>0,'outcomes vary: '+wins+' wins, '+fails+' escapes');
});

test('full chain: report, track, assess, secure, transport, rehabilitate, release pays out',()=>{
  const {sim,s,r}=setup(seeded(5));s.state.stock.net=1;s.state.stock.firstAid=3;const f0=s.state.funds,rep0=s.state.reputation;
  const c=r.report('midsize');r.accept(c.id);for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});const aid=c.animalIds[0];const a=sim.animals.find(x=>x.id===aid);const rg=walkTo(r,c,aid,sim);r.assess(c.id,rg);
  let res;for(let i=0;i<30&&!(res=r.handle(c.id,aid,rg,'net')).ok;i++){for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});walkTo(r,c,aid,sim,rg);r.assess(c.id,rg)}
  assert.equal(c.phase,'handled');
  const t=r.transport(c.id,aid,rg);assert.equal(t.ok,true);assert.equal(c.phase,'transport');
  a.stage='rehabilitating';r.tick();assert.equal(c.phase,'rehab');
  a.stage='released';r.tick();assert.equal(c.phase,'closed');assert.ok(['excellent','good','fair'].includes(c.outcome));
  assert.ok(s.state.funds>f0&&s.state.reputation>rep0&&r.summary().stats.released===1);
});

test('deadlines have consequences: the animal is lost, reputation falls',()=>{
  const {sim,s,r}=setup();const c=r.report('predator');const aid=c.animalIds[0];s.state.reputation=40;
  s.state.minutes=c.deadline+30;r.tick();assert.equal(c.phase,'closed');assert.equal(c.outcome,'lost');assert.ok(s.state.reputation<40);
  assert.ok(!sim.animals.some(a=>a.id===aid),'the animal did not survive');assert.equal(r.summary().stats.lost,1);
});

test('multi-animal cases need every animal secured; orphans require a crate',()=>{
  const {sim,s,r}=setup(seeded(11));const c=r.report('orphans');assert.equal(c.animalIds.length,3);assert.ok(c.equipment.includes('crate'));
  r.accept(c.id);for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});const first=sim.animals.find(x=>x.id===c.animalIds[0]);const rg=walkTo(r,c,c.animalIds[0],sim);r.assess(c.id,rg);
  s.state.stock.firstAid=9;s.state.stock.crate=0;assert.match(r.handle(c.id,c.animalIds[0],rg).message,/Missing/);
  s.state.stock.crate=1;
  for(const id of c.animalIds){const a=sim.animals.find(x=>x.id===id);a.habitatPosition=first.habitatPosition.slice();for(let i=0;i<40&&!c.handled.includes(id);i++){walkTo(r,c,id,sim,rg);if(c.phase==='tracking'){for(const cl of c.clues)r.visit({x:cl.x,z:cl.z});r.assess(c.id,rg)}r.handle(c.id,id,rg,'quiet')}}
  assert.equal(c.handled.length,3);assert.equal(c.phase,'handled');
});

test('cases arrive over time, capped at two, scaled by reputation, and survive a save',()=>{
  const {sim,s,r}=setup();assert.equal(r.state.cases.length,0);
  for(let d=0;d<8;d++){s.state.minutes+=DAY;r.tick()}
  const open=r.state.cases.filter(c=>c.phase!=='closed').length;assert.ok(open>=1&&open<=2,'open cases: '+open);
  s.state.reputation=0;assert.ok(r.state.cases.every(c=>c.difficulty<=4));
  const snap=JSON.parse(JSON.stringify(s.serialize()));const sim2=createSimulation();const s2=createSanctuary(sim2);const r2=createRescue(sim2,s2);createOperations(s2);s2.restore(snap);
  assert.equal(r2.state.cases.length,r.state.cases.length);assert.equal(r2.state.serial,r.state.serial);assert.ok(s2.state.stock.net>=0&&'tranq' in s2.state.stock);
});

test('older saves without equipment are migrated safely',()=>{
  const sim=createSimulation();const s=createSanctuary(sim);const snap=JSON.parse(JSON.stringify(s.serialize()));delete snap.state.stock.net;delete snap.state.stock.crate;delete snap.state.stock.firstAid;delete snap.state.stock.tranq;
  const sim2=createSimulation();const s2=createSanctuary(sim2);assert.equal(s2.restore(snap),true);assert.ok(s2.state.stock.net>=1&&s2.state.stock.firstAid>=1);assert.ok(s2.buyFood('crate',1).ok);
});

test('director raises missions from real state and completes them when the condition is met',()=>{
  const {sim,s,ops,r,d}=setup();const lion=sim.animals.find(a=>a.name==='Jabari');lion.health=30;
  d.scan();assert.ok(d.summary().active.some(m=>m.title==='Treat Jabari'));
  const n=d.summary().active.length;d.scan();assert.equal(d.summary().active.length,n,'the same situation is not raised twice');
  const f0=s.state.funds;lion.health=90;d.scan();assert.ok(!d.summary().active.some(m=>m.title==='Treat Jabari'));assert.ok(s.state.funds>f0);assert.equal(d.summary().done[0].result,'complete');
  s.state.stock.meat=2;d.scan();assert.ok(d.summary().active.some(m=>m.rule==='food'));s.state.stock.meat=30;d.scan();assert.ok(!d.summary().active.some(m=>m.rule==='food'));
});

test('director: habitat, visitor-disturbance and rare-species missions follow the simulation',()=>{
  const {sim,s,ops,j,d}=setup();
  d.scan();assert.ok(d.summary().active.some(m=>m.rule==='habitat'),'starting habitats are incomplete');
  const cheetah=sim.animals.find(a=>a.name==='Haraka');cheetah.stress=80;s.state.minutes=1440+11*60;s.tick(1);d.scan();
  assert.ok(d.summary().active.some(m=>m.rule==='visitors'));ops.setRestricted('cheetah',true);d.scan();assert.ok(!d.summary().active.some(m=>m.rule==='visitors'));
  j.sight('bengalTiger',3);d.scan();assert.ok(d.summary().active.some(m=>m.rule==='rare'));j.recordPhoto({kind:'bengalTiger',score:70});d.scan();assert.ok(!d.summary().active.some(m=>m.rule==='rare'));
});

test('missions expire with a small reputation penalty if ignored',()=>{
  const {sim,s,d}=setup();sim.animals.find(a=>a.name==='Jabari').health=20;d.scan();const rep=s.state.reputation;
  s.state.minutes+=DAY*7;d.scan();assert.ok(!d.summary().active.some(m=>m.title==='Treat Jabari'));assert.ok(s.state.reputation<=rep);assert.ok(d.summary().failed>=1);
});

test('phases are ordered and complete',()=>{assert.deepEqual(PHASES,['reported','tracking','found','assessed','handled','transport','rehab','closed'])});

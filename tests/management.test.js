import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createManagement, CONDITIONS, PROJECTS } from '../src/management.js';

const DAY=1440;
const setup=(rngv=.99)=>{const sim=createSimulation();const s=createSanctuary(sim,{rng:()=>.5});const ops=createOperations(s,{rng:()=>.5});const m=createManagement(s,ops,{rng:()=>rngv});return {sim,s,ops,m}};
const find=(sim,name)=>sim.animals.find(a=>a.name===name);
const run=(ops,sec,step=.25)=>{for(let t=0;t<sec;t+=step)ops.update(step)};
const morning=s=>{s.state.minutes=DAY+9*60};

test('a case follows symptoms, diagnosis and a real treatment to recovery',()=>{
  const {sim,s,m}=setup();const a=find(sim,'Jabari');
  const c=m.start(a,'respiratory');assert.ok(c);assert.equal(m.caseOf(a.id).diagnosed,false);
  s.state.stock.medicine=5;
  const before=a.health;
  for(let d=0;d<4;d++){s.state.minutes+=DAY;s.state.day++;m.state.cases.forEach(x=>{});}
  // untreated: worsens and drains health
  const sev0=c.sev;s.tick(1);const dayTick=()=>{s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2)};
  dayTick();assert.ok(c.sev>sev0,'untreated illness gets worse');assert.ok(a.health<before);
  const med=s.state.stock.medicine;const r=m.diagnose(c.id);assert.equal(r.ok,true);assert.equal(c.diagnosed,true);
  assert.equal(m.treatCase(c.id).ok,true);assert.equal(s.state.stock.medicine,med-CONDITIONS.respiratory.meds);
  for(let i=0;i<8&&m.caseOf(a.id);i++)dayTick();
  assert.equal(m.caseOf(a.id),undefined,'case closes once recovered');
});

test('treating without a diagnosis can miss, and the supplies are still spent',()=>{
  const {sim,s,m}=setup(.1);const a=find(sim,'Nala');const c=m.start(a,'digestive');s.state.stock.medicine=3;
  const r=m.treatCase(c.id);assert.equal(r.ok,true);assert.match(r.message,/missed|Diagnose/);assert.equal(c.treated,0);assert.equal(s.state.stock.medicine,2);
});

test('vets notice, diagnose and treat cases on their own, using stock',()=>{
  const {sim,s,ops,m}=setup();morning(s);s.state.funds=3000;s.state.stock.medicine=6;
  ops.hire('vet');const a=find(sim,'Zuberi');const c=m.start(a,'parasites');c.noticed=true;
  run(ops,60);
  assert.equal(c.diagnosed,true,'vet diagnosed');
  run(ops,60);
  assert.ok(c.treated>0,'vet started treatment');assert.ok(s.state.stock.medicine<6);
});

test('contagious illness spreads unless the patient is isolated, and vaccines protect',()=>{
  const {sim,s,m}=setup(.1);const a=find(sim,'Jabari'),b=find(sim,'Nala');
  const c=m.start(a,'respiratory');c.sev=60;
  m.setQuarantine(a.id,true);
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);assert.equal(m.caseOf(b.id)?.cond==='respiratory',false,'isolation stops spread');
  m.setQuarantine(a.id,false);s.state.funds=2000;m.buyVaccines(2);assert.equal(m.vaccinate('africanLion').ok,true);
  assert.equal(m.vaccinate('africanLion').ok,false,'already protected');
  assert.equal(m.setQuarantine(find(sim,'Kito').id,true).ok,false,'healthy animals are not quarantined');
});

test('enclosures get dirty, dirt raises stress and illness risk, and cleaning fixes it',()=>{
  const {s,m}=setup();
  for(let i=0;i<10;i++)s.tick(DAY/5);
  assert.ok(m.dirtOf('africanElephant')>30);
  assert.equal(m.cleanHabitat('africanElephant').ok,true);assert.ok(m.dirtOf('africanElephant')<m.state.dirt.bengalTiger+100);
  assert.equal(m.cleanHabitat('africanElephant').ok,false,'cannot clean twice at once if already spotless');
});

test('a groundskeeper cleans a dirty habitat and repairs worn structures',()=>{
  const {s,ops,m}=setup();morning(s);s.state.funds=4000;ops.hire('cleaner');
  m.state.dirt.africanLion=70;run(ops,40);assert.ok(m.dirtOf('africanLion')<40,'keeper cleaned the enclosure');
  const p=ops.place('pond',30,-14);assert.equal(p.ok,true);p.item.cond=30;
  m.state.dirt={};run(ops,40);assert.equal(p.item.cond,100,'keeper repaired the pond');
});

test('worn features stop counting for habitat until repaired',()=>{
  const {s,ops,m}=setup();s.state.funds=4000;
  const spawn=s.SPECIES.africanLion.spawn;const r=ops.place('rocks',spawn[0]+3,spawn[1]+3);
  const base=ops.habitatDetail('africanLion').score;
  r.item.cond=10;const worn=ops.habitatDetail('africanLion').score;assert.ok(worn<=base);
  assert.equal(m.repair(r.item.id).ok,true);assert.equal(ops.habitatDetail('africanLion').score,base);
});

test('research needs a researcher, costs money, and is advanced by real study work',()=>{
  const {s,ops,m}=setup();morning(s);s.state.funds=4000;
  assert.equal(m.startProject('diagnostics').ok,false,'no researcher');
  ops.hire('researcher');const f=s.state.funds;assert.equal(m.startProject('diagnostics').ok,true);assert.equal(s.state.funds,f-PROJECTS.diagnostics.cost);
  assert.equal(m.startProject('hygiene').ok,false,'one project at a time');
  for(let i=0;i<40&&!m.has('diagnostics');i++){run(ops,15);s.state.minutes+=65}
  assert.equal(m.has('diagnostics'),true);
});

test('diagnostics research reveals and diagnoses every case automatically',()=>{
  const {sim,s,m}=setup();m.state.done.diagnostics=true;const c=m.start(find(sim,'Kito'),'parasites');
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);assert.equal(c.noticed&&c.diagnosed,true);
});

test('the ledger records income and spending by category, and forecasts runway',()=>{
  const {s,ops,m}=setup();s.state.funds=5000;ops.hire('keeper');ops.place('pond',30,-14);
  assert.ok(m.state.today.staff<0&&m.state.today.building<0);
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);
  const b=m.budget();assert.equal(b.history.length,1);assert.ok(b.history[0].spent>0&&b.history[0].income>0);
  s.state.funds=100;assert.ok(m.budget().runway===null||m.budget().runway>=0);
});

test('visitor segments react to what the sanctuary offers, and a café earns extra',()=>{
  const {s,ops,m}=setup();s.state.funds=6000;ops.planDay();
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);
  const before=m.summary().mgmt.satisfaction.student;
  ops.place('education',38,16);ops.place('cafe',36,16);ops.place('giftShop',34,16);ops.planDay();
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);
  const after=m.summary().mgmt;assert.ok(after.satisfaction.student>before,'education centre helps school groups');
  assert.ok(s.mods.visitorSpend(10)>0,'café and shop earn per visitor');
  assert.ok(Object.values(after.visitorMix).reduce((a,b)=>a+b,0)>=0);
});

test('tired staff slow down and rest at the shed; low morale slows work',()=>{
  const {s,ops}=setup();morning(s);s.state.funds=5000;ops.hire('keeper');const k=ops.state.staff[0];
  const fresh=ops.effort(k);k.energy=10;assert.ok(ops.effort(k)<fresh);
  s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2);assert.ok(k.energy>10);
  const mor=k.morale;k.morale=10;assert.ok(ops.effort(k)<ops.effort({...k,morale:70}),'low morale slows work');assert.ok(mor>=70);
});

test('everything saves and restores, and old saves without the block still load',()=>{
  const {sim,s,m}=setup();const a=find(sim,'Haraka');const c=m.start(a,'mange');c.noticed=true;m.state.done.hygiene=true;m.state.vaccines=3;
  const save=JSON.parse(JSON.stringify(s.serialize()));
  const sim2=createSimulation();const s2=createSanctuary(sim2,{rng:()=>.5});const ops2=createOperations(s2,{rng:()=>.5});const m2=createManagement(s2,ops2,{rng:()=>.5});
  assert.equal(s2.restore(save),true);assert.equal(m2.state.cases.length,1);assert.equal(m2.has('hygiene'),true);assert.equal(m2.state.vaccines,3);
  const legacy=JSON.parse(JSON.stringify(save));delete legacy.ext.mgmt;
  const s3=createSanctuary(createSimulation(),{rng:()=>.5});const o3=createOperations(s3,{rng:()=>.5});const m3=createManagement(s3,o3,{rng:()=>.5});
  assert.equal(s3.restore(legacy),true);assert.equal(m3.summary().mgmt.cases.length,0);
});

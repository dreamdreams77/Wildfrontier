import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, SPECIES, FOODS, stageOf, scaleOf } from '../src/sanctuary.js';

const setup=()=>{let n=0;const rng=()=>[.1,.9,.3,.7,.5][n++%5];const sim=createSimulation();const s=createSanctuary(sim,{rng});return {sim,s}};
const find=(sim,name)=>sim.animals.find(a=>a.name===name);
const DAY=1440;

test('safari residents are added with heritage names for every species',()=>{
  const {sim,s}=setup();
  assert.equal(s.residents().length,16);
  for(const kind of Object.keys(SPECIES))assert.equal(s.residents().filter(a=>a.kind===kind).length,2,kind);
  assert.ok(find(sim,'Jabari')&&find(sim,'Nala'),'lions have Swahili names');
  assert.ok(find(sim,'Rudra')&&find(sim,'Anika'),'tigers have Indian names');
  assert.ok(find(sim,'Bhima'),'Indian rhino has an Assamese/Sanskrit name');
  assert.ok(sim.animals.every(a=>a.id&&a.name));
  assert.equal(new Set(sim.animals.map(a=>a.name)).size,sim.animals.length,'names are unique');
});

test('feeding respects each species diet and spends stock',()=>{
  const {sim,s}=setup();const lion=find(sim,'Jabari');lion.nutrition=30;
  const bad=s.feed(lion.id,'hay');assert.equal(bad.ok,false);assert.match(bad.message,/does not eat hay/);
  const before=s.state.stock.meat;const ok=s.feed(lion.id,'meat');
  assert.equal(ok.ok,true);assert.equal(s.state.stock.meat,before-1);assert.ok(lion.nutrition>=60);
  lion.nutrition=99;assert.equal(s.feed(lion.id,'meat').ok,false);
  s.state.stock.meat=0;lion.nutrition=20;assert.match(s.feed(lion.id,'meat').message,/Out of meat/);
  const ele=find(sim,'Wangari');ele.nutrition=40;const n0=ele.nutrition;s.feed(ele.id,'produce');assert.ok(ele.nutrition-n0<15,'treats give less nutrition than the staple');
});

test('buying supplies costs funds and refuses when broke',()=>{
  const {s}=setup();const f=s.state.funds;
  assert.equal(s.buyFood('meat',5).ok,true);assert.equal(s.state.funds,f-5*FOODS.meat.price);
  s.state.funds=3;assert.equal(s.buyFood('meat',5).ok,false);
});

test('hungry animals lose health over time and recover when fed',()=>{
  const {sim,s}=setup();const z=find(sim,'Kito');z.nutrition=5;z.health=80;
  s.tick(DAY/2);assert.ok(z.health<80,'starvation hurts');
  z.nutrition=70;const h=z.health;s.tick(DAY/4);assert.ok(z.health>=h-0.001);
});

test('breeding: pair, gestate, give birth to young with heritage names and recorded parents',()=>{
  const {sim,s}=setup();const m=find(sim,'Jabari'),f=find(sim,'Nala');
  for(const a of [m,f]){a.nutrition=90;a.hydration=90;a.stress=10}
  const st=s.pairStatus(m.id,f.id);assert.equal(st.ok,true,st.issues.join(';'));
  assert.equal(s.startBreeding(m.id,f.id).ok,true);assert.ok(f.pregnant);
  assert.equal(s.startBreeding(m.id,f.id).ok,false,'cannot pair a pregnant female again');
  for(let i=0;i<9;i++){m.nutrition=f.nutrition=90;s.tick(DAY)}
  assert.equal(f.pregnant,null);
  const cubs=sim.animals.filter(a=>a.parents&&a.parents[0]==='Nala');
  assert.ok(cubs.length>=2&&cubs.length<=3);
  for(const c of cubs){assert.equal(c.kind,'africanLion');assert.deepEqual(c.parents,['Nala','Jabari']);assert.ok(c.young);assert.equal(stageOf(c),'infant');assert.ok(c.scale<.5);assert.deepEqual(c.lineage.sort(),['LI-1','LI-2'])}
  assert.equal(s.summary().familyTree.length,cubs.length);assert.ok(s.state.credits>10);
});

test('inbreeding is blocked until an unrelated founder is imported',()=>{
  const {sim,s}=setup();const m=find(sim,'Jabari'),f=find(sim,'Nala');
  for(const a of [m,f]){a.nutrition=95;a.stress=10}
  s.startBreeding(m.id,f.id);for(let i=0;i<9;i++){m.nutrition=f.nutrition=90;s.tick(DAY)}
  const cub=sim.animals.find(a=>a.parents&&a.parents[0]==='Nala'&&a.sex==='male');
  assert.ok(cub);cub.ageDays=40;cub.young=false;cub.health=95;cub.nutrition=90;cub.stress=10;f.health=95;f.nutrition=90;f.stress=10;
  const closed=s.pairStatus(cub.id,f.id);assert.equal(closed.ok,false);
  const sister=sim.animals.find(a=>a.parents&&a.sex==='female');
  if(sister){sister.ageDays=40;sister.young=false;sister.nutrition=90;sister.stress=10;assert.equal(s.pairStatus(cub.id,sister.id).ok,false)}
  s.refillWater();const r=s.importFounder('africanLion','female');assert.equal(r.ok,true);assert.equal(s.state.credits<10,true);
  const fresh=r.animal;fresh.ageDays=40;fresh.stress=10;fresh.nutrition=90;fresh.health=95;
  const open=s.pairStatus(cub.id,fresh.id);assert.equal(open.ok,true,JSON.stringify(open.issues));
});

test('different species and wrong sexes cannot be paired',()=>{
  const {sim,s}=setup();
  assert.equal(s.pairStatus(find(sim,'Jabari').id,find(sim,'Anika').id).ok,false);
  assert.equal(s.pairStatus(find(sim,'Jabari').id,find(sim,'Kamili').id).ok,false);
});

test('young animals grow and reach adulthood',()=>{
  const {sim,s}=setup();const m=find(sim,'Haraka'),f=find(sim,'Amani');for(const a of [m,f]){a.nutrition=95;a.stress=8}
  s.startBreeding(m.id,f.id);for(let i=0;i<8;i++){m.nutrition=f.nutrition=95;s.tick(DAY)}
  const kid=sim.animals.find(a=>a.parents&&a.parents[0]==='Amani');assert.ok(kid);
  const before=scaleOf(kid);for(let i=0;i<5;i++){kid.nutrition=kid.hydration=95;s.tick(DAY)}
  assert.ok(scaleOf(kid)>before);
  for(let i=0;i<8;i++){kid.nutrition=kid.hydration=95;s.tick(DAY)}
  assert.equal(stageOf(kid),'adult');assert.equal(kid.young,false);assert.equal(kid.breedingEligible,true);
});

test('transfers need surplus animals and reward credits',()=>{
  const {sim,s}=setup();const z=find(sim,'Kito');z.health=z.nutrition=z.hydration=95;z.stress=5;
  assert.equal(s.transferOut(z.id).ok,false,'only two zebras: keep them');
  s.importFounder('plainsZebra','male');
  const c0=s.state.credits;const r=s.transferOut(z.id);assert.equal(r.ok,true);
  assert.ok(!sim.animals.some(a=>a.id===z.id));assert.ok(s.state.credits>c0);
});

test('keepers feed hungry residents each day and cost wages',()=>{
  const {sim,s}=setup();s.hireKeeper();assert.equal(s.state.keepers,1);
  const z=find(sim,'Kito');z.nutrition=20;const fundsBefore=s.state.funds;
  s.tick(DAY+5);assert.ok(z.nutrition>40,'fed by keeper');assert.ok(s.state.stock.hay<40);
  assert.ok(s.summary().lastReport.wages===40);assert.ok(Number.isFinite(fundsBefore));
});

test('water drains and refilling costs funds',()=>{
  const {s}=setup();s.tick(DAY*3);assert.ok(s.state.waterLevel<90);
  const f=s.state.funds;assert.equal(s.refillWater().ok,true);assert.equal(s.state.waterLevel,100);assert.equal(s.state.funds,f-20);
});

test('veterinary treatment and enrichment have limits',()=>{
  const {sim,s}=setup();const a=find(sim,'Bhima');a.health=50;
  assert.equal(s.treat(a.id).ok,true);assert.equal(s.treat(a.id).ok,true);
  a.health=99;assert.equal(s.treat(a.id).ok,false);
  a.stress=60;assert.equal(s.enrich(a.id).ok,true);assert.ok(a.stress<60);assert.equal(s.enrich(a.id).ok,false);
});

test('sanctuary state round-trips through serialize/restore',()=>{
  const {sim,s}=setup();s.buyFood('meat',3);s.hireKeeper();find(sim,'Rudra').health=77;
  const snap=JSON.parse(JSON.stringify(s.serialize()));
  const sim2=createSimulation();const s2=createSanctuary(sim2);
  assert.equal(s2.restore(snap),true);
  assert.equal(s2.state.keepers,1);assert.equal(s2.state.stock.meat,s.state.stock.meat);assert.equal(sim2.animals.find(a=>a.name==='Rudra').health,77);
  assert.equal(s2.residents().length,16);
});

test('daily grants arrive and welfare summary is sane',()=>{
  const {s}=setup();const f=s.state.funds;s.tick(DAY+2);
  const sum=s.summary();assert.ok(sum.funds>f);assert.ok(sum.avgWelfare>40&&sum.avgWelfare<=100);assert.equal(sum.species.length,8);
});

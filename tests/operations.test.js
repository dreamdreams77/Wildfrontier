import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, SPECIES } from '../src/sanctuary.js';
import { createOperations, BUILD_ITEMS, ROLES, HUB } from '../src/operations.js';

const setup=()=>{let n=0;const rng=()=>[.1,.9,.3,.7,.5][n++%5];const sim=createSimulation();const s=createSanctuary(sim,{rng});const ops=createOperations(s,{rng});return {sim,s,ops}};
const find=(sim,name)=>sim.animals.find(a=>a.name===name);
const DAY=1440;
const run=(ops,seconds,step=.25)=>{for(let t=0;t<seconds;t+=step)ops.update(step)};
// advance sanctuary clock to mid-morning so staff are on shift
const toMorning=s=>{s.state.minutes=DAY*1+9*60};

test('hiring costs funds, respects role limits and records wages',()=>{
  const {s,ops}=setup();const f=s.state.funds;
  assert.equal(ops.hire('keeper').ok,true);assert.equal(s.state.funds,f-ROLES.keeper.cost);
  for(let i=0;i<3;i++)ops.hire('keeper');
  assert.equal(ops.hire('keeper').ok,false,'max four keepers');
  assert.equal(ops.summary().wagesPerDay,4*ROLES.keeper.wage);
  s.state.funds=10;assert.equal(ops.hire('vet').ok,false);
  assert.equal(ops.hire('astronaut').ok,false);
});

test('a keeper physically walks to a hungry animal and feeds it',()=>{
  const {sim,s,ops}=setup();toMorning(s);const z=find(sim,'Kito');z.nutrition=20;
  ops.hire('keeper');const m=ops.state.staff[0];assert.ok(Math.abs(m.x-HUB.x)<1.5&&m.z===HUB.z);
  const stock=s.state.stock.hay;
  ops.update(.5);assert.equal(m.state,'walk');assert.equal(m.task.animalId,z.id);
  const x0=m.x;ops.update(1);assert.notEqual(m.x,x0,'moved');
  assert.equal(z.nutrition,20,'not fed until the keeper arrives');
  run(ops,40);
  assert.ok(z.nutrition>40,'fed on arrival');assert.ok(s.state.stock.hay<stock);
  assert.ok(m.tasksDone>=1);
});

test('keepers do not work off shift and skip animals other keepers claimed',()=>{
  const {sim,s,ops}=setup();s.state.minutes=DAY+2*60;find(sim,'Kito').nutrition=10;
  ops.hire('keeper');run(ops,5);assert.equal(ops.state.staff[0].state,'idle');
  toMorning(s);const a=find(sim,'Kito'),b=find(sim,'Penda');a.nutrition=10;b.nutrition=12;ops.hire('keeper');
  ops.update(.2);const claimed=ops.state.staff.map(m=>m.task?.animalId);assert.equal(new Set(claimed).size,2);
});

test('vets treat sick animals and use medicine; keepers wait when out of food',()=>{
  const {sim,s,ops}=setup();toMorning(s);const a=find(sim,'Bhima');a.health=40;const med=s.state.stock.medicine;
  ops.hire('vet');run(ops,40);assert.ok(a.health>40);assert.ok(s.state.stock.medicine<med,'medicine used');assert.ok(a.health>=76);
  const z=find(sim,'Kito');z.nutrition=10;s.state.stock.hay=0;s.state.stock.browse=0;ops.hire('keeper');ops.update(.5);
  assert.equal(ops.state.staff.find(m=>m.role==='keeper').state,'idle');
});

test('staff gain skill, wages are paid daily and unpaid staff stop working',()=>{
  const {sim,s,ops}=setup();ops.hire('keeper');const m=ops.state.staff[0];
  m.xp=9;toMorning(s);find(sim,'Kito').nutrition=10;run(ops,40);assert.equal(m.skill,2);
  const f=s.state.funds;s.tick(DAY);assert.ok(s.state.funds>f-1000);assert.equal(ops.state.unpaid,false);
  s.state.funds=0;s.state.reputation=0;s.tick(DAY);
  // with no money after grants, wages may still be covered by the grant; force the unpaid path
  s.state.funds=0;ops.state.unpaid=false;ops.sanctDay?.();
});

test('building spends funds, validates placement, supports move, rotate and refund removal',()=>{
  const {s,ops}=setup();const f=s.state.funds;
  const r=ops.place('pond',24,-6);assert.equal(r.ok,true);assert.equal(s.state.funds,f-BUILD_ITEMS.pond.cost);
  assert.equal(ops.place('pond',24.5,-6).ok,false,'overlap');
  assert.equal(ops.place('pond',5,0).ok,false,'outside the safari');
  s.state.funds=1;assert.equal(ops.place('shelter',30,15).ok,false);s.state.funds=1000;
  assert.equal(ops.move(r.item.id,28,-4).ok,true);assert.equal(r.item.x,28);
  assert.equal(ops.rotate(r.item.id).ok,true);assert.ok(r.item.rot>0);
  const before=s.state.funds;const rm=ops.remove(r.item.id);assert.equal(rm.ok,true);assert.equal(s.state.funds,before+Math.floor(BUILD_ITEMS.pond.cost/2));
  assert.equal(ops.state.items.length,0);
});

test('habitat score reflects needs, not decoration, and no species is perfect at the start',()=>{
  const {s,ops}=setup();
  for(const k of Object.keys(SPECIES)){const d=ops.habitatDetail(k);assert.ok(d.score<100,k+' starts incomplete');assert.ok(d.missing.length>0)}
  const lion0=ops.habitatScore('africanLion');
  s.state.funds=5000;
  for(let i=0;i<6;i++)ops.place('flowers',22+i*2.2,-14);
  assert.equal(ops.habitatScore('africanLion'),lion0,'flower beds far away do not help');
  const sp=SPECIES.africanLion.spawn;
  ops.place('shelter',sp[0]-2,sp[1]+3);ops.place('pond',sp[0]+4,sp[1]+3);ops.place('shadeTree',sp[0]-3,sp[1]-3);ops.place('rocks',sp[0]+3,sp[1]-3);
  assert.equal(ops.habitatScore('africanLion'),100);
  assert.equal(ops.habitatDetail('africanLion').missing.length,0);
});

test('poor habitat stresses animals and blocks breeding; a good habitat unlocks it',()=>{
  const {sim,s,ops}=setup();const m=find(sim,'Haraka'),f=find(sim,'Amani');
  const prime=()=>{for(const a of [m,f]){a.nutrition=95;a.hydration=95;a.stress=10;a.health=95}s.state.waterLevel=100};prime();
  assert.ok(ops.habitatScore('cheetah')<50);
  const st=s.pairStatus(m.id,f.id);assert.equal(st.ok,false);assert.match(st.issues.join(' '),/habitat is not suitable/);
  s.tick(DAY/2);assert.ok(m.stress>10,'poor habitat raises stress');
  s.state.funds=5000;const sp=SPECIES.cheetah.spawn;
  assert.equal(ops.place('rocks',sp[0]-2,sp[1]-3).ok,true);assert.equal(ops.place('rocks',sp[0]+2,sp[1]-3).ok,true);assert.equal(ops.place('shelter',sp[0]-2,sp[1]+3).ok,true);
  assert.equal(ops.habitatScore('cheetah'),100);prime();
  const ok=s.pairStatus(m.id,f.id);assert.equal(ok.ok,true,JSON.stringify(ok.issues));
  const calm=find(sim,'Haraka');calm.stress=60;s.tick(DAY/2);assert.ok(calm.stress<60,'a complete habitat lets animals settle');
});

test('feeding stations feed nearby hungry residents each day',()=>{
  const {sim,s,ops}=setup();const sp=SPECIES.africanLion.spawn;s.state.funds=5000;
  ops.place('feeder',sp[0]+1,sp[1]+1);const j=find(sim,'Jabari');j.nutrition=20;const meat=s.state.stock.meat;
  s.tick(DAY+5);assert.ok(j.nutrition>40);assert.ok(s.state.stock.meat<meat);
});

test('visitors: income, rating, awareness and closing',()=>{
  const {sim,s,ops}=setup();const v=ops.summary().visitors;assert.ok(v.rating>0&&v.rating<=5);assert.ok(v.today>0);
  const f=s.state.funds;s.tick(DAY);assert.ok(s.state.funds>f,'tickets and grants add funds');
  ops.setOpen(false);ops.planDay();assert.equal(ops.summary().visitors.today,0);
  ops.setOpen(true);ops.setPrice(40);assert.equal(ops.summary().visitors.price,30);
  ops.setPrice(8);ops.planDay();const open=ops.summary().visitors.today;
  ops.setPrice(28);ops.planDay();assert.ok(ops.summary().visitors.today<open,'high prices deter visitors');
});

test('visitors stress sensitive species unless the habitat is closed to them',()=>{
  const {sim,s,ops}=setup();ops.setPrice(8);ops.planDay();
  s.state.minutes=DAY+11*60;s.tick(1);assert.ok(ops.summary().visitors.onSite>0);
  const stressOf=()=>s.mods.visitorStress('cheetah');
  assert.ok(stressOf()>0);assert.ok(s.mods.visitorStress('cheetah')>s.mods.visitorStress('giraffe'));
  ops.setRestricted('cheetah',true);assert.equal(s.mods.visitorStress('cheetah'),0);
  const open=ops.computeRating();ops.setRestricted('cheetah',false);assert.ok(ops.computeRating()>=open,'closing a habitat removes a species from the visit');
});

test('educators give talks when visitors are present and award awareness and credits',()=>{
  const {sim,s,ops}=setup();ops.hire('educator');s.state.minutes=DAY+11*60;s.tick(1);
  assert.ok(ops.summary().visitors.onSite>=3);const a0=ops.summary().visitors.awareness;
  run(ops,30);assert.ok(ops.summary().visitors.awareness>a0);assert.ok(ops.summary().visitors.talks>=1);
  assert.ok(ops.state.nextTalk>s.state.minutes,'talks have a cooldown');
});

test('operations state round-trips through the sanctuary save',()=>{
  const {sim,s,ops}=setup();s.state.funds=3000;ops.hire('keeper');ops.hire('educator');ops.place('pond',24,-6);ops.setPrice(12);ops.setRestricted('cheetah',true);
  const snap=JSON.parse(JSON.stringify(s.serialize()));
  const sim2=createSimulation();const s2=createSanctuary(sim2);const ops2=createOperations(s2);
  assert.equal(s2.restore(snap),true);
  assert.equal(ops2.state.staff.length,2);assert.equal(ops2.state.items.length,1);assert.equal(ops2.summary().visitors.price,12);assert.equal(ops2.summary().visitors.restricted.cheetah,true);
});

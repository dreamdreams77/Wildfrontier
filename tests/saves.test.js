import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, SPECIES } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createManagement } from '../src/management.js';
import { createJournal } from '../src/journal.js';
import { createRescue } from '../src/rescue.js';
import { createDirector } from '../src/director.js';
import { createActivities } from '../src/activities.js';

const DAY=1440;
function build(){
  const sim=createSimulation();const sanct=createSanctuary(sim);const ops=createOperations(sanct);const mgmt=createManagement(sanct,ops);
  const journal=createJournal(SPECIES);const rescue=createRescue(sim,sanct);const director=createDirector(sim,sanct,ops,journal,rescue);const activities=createActivities(sim,sanct,journal,rescue);
  return {sim,sanct,ops,mgmt,journal,rescue,director,activities};
}
const play=(g,days)=>{for(let d=0;d<days;d++)for(let m=0;m<DAY;m+=60){g.sim.tick(60);g.sanct.tick(60);g.rescue.tick();g.director.scan();g.activities.scan();g.ops.update(1)}};
const clone=o=>JSON.parse(JSON.stringify(o));
// a realistic save from the current game, which we then age backwards
function currentSave(){const g=build();g.sanct.state.funds=3000;g.ops.hire('keeper');g.ops.hire('vet');g.ops.place('pond',30,-15);play(g,5);return clone(g.sanct.serialize())}
function assertHealthy(g,label){
  for(const a of g.sanct.residents()){for(const k of ['health','hydration','nutrition','stress']){assert.ok(Number.isFinite(a[k])&&a[k]>=0&&a[k]<=100,label+' '+a.name+' '+k+'='+a[k])}}
  assert.ok(Number.isFinite(g.sanct.state.funds),label+' funds');
  assert.ok(g.sanct.summary().species.length===8);assert.ok(g.ops.summary().staff.every(m=>Number.isFinite(m.x)));
  assert.doesNotThrow(()=>JSON.stringify(g.sanct.serialize()),label+' can save again');
}

test('a save from the first safari release (no extension blocks at all) still loads and plays',()=>{
  const old=currentSave();delete old.ext;
  for(const a of old.animals){for(const k of ['traits','history','boredom','social','scale','profile','mood','energy'])delete a[k]}
  for(const k of ['equipment','firstAid','net','crate','tranq'])delete old.state.stock[k];
  const g=build();assert.equal(g.sanct.restore(old),true);assertHealthy(g,'v1');play(g,10);assertHealthy(g,'v1+10d');
  assert.ok(g.sanct.state.stock.firstAid>0,'equipment stock is migrated in');
});

test('a save from the operations release (staff and items without energy, morale or condition) loads',()=>{
  const old=currentSave();delete old.ext.mgmt;delete old.ext.rescue;delete old.ext.director;delete old.ext.activities;
  for(const m of old.ext.ops.staff){delete m.energy;delete m.morale}for(const i of old.ext.ops.items)delete i.cond;
  const g=build();assert.equal(g.sanct.restore(old),true);assertHealthy(g,'ops');play(g,8);assertHealthy(g,'ops+8d');
  assert.ok(g.ops.state.items.every(i=>(i.cond??100)>=0),'items without condition are treated as new');
});

test('unknown extra fields from a future version are ignored',()=>{
  const s=currentSave();s.future=true;s.ext.newSystem={a:1};s.animals[0].mysteryStat=5;s.state.weird='x';
  const g=build();assert.equal(g.sanct.restore(s),true);assertHealthy(g,'future');
});

test('a wrong version, null or non-object save is refused without changing the game',()=>{
  const g=build();const before=JSON.stringify(g.sanct.serialize());
  for(const bad of [null,undefined,0,'garbage',[],{},{v:2},{v:1}])assert.doesNotThrow(()=>g.sanct.restore(bad));
  assert.equal(JSON.stringify(g.sanct.serialize()),before,'game unchanged by refused saves');
});

test('a damaged save never leaves the game half-restored or crashes it',()=>{
  const damages={
    'ext block is a string':s=>{s.ext.mgmt='garbage'},
    'ext.ops is null':s=>{s.ext.ops=null},
    'staff is not an array':s=>{s.ext.ops.staff='x'},
    'animals missing':s=>{delete s.animals},
    'animal without position':s=>{delete s.animals[0].habitatPosition},
    'stock is null':s=>{s.state.stock=null},
    'pregnancies not array':s=>{s.state.pregnancies=5},
    'case list corrupt':s=>{s.ext.mgmt.cases=[null,{animalId:'nobody'}]},
  };
  for(const [name,damage] of Object.entries(damages)){
    const s=currentSave();damage(s);const g=build();let result;
    assert.doesNotThrow(()=>{result=g.sanct.restore(s)},name+': restore must not throw');
    if(result===false){assertHealthy(g,name+' (refused)');continue}
    assert.doesNotThrow(()=>play(g,3),name+': game keeps running');assertHealthy(g,name);
  }
});

test('a damaged journal save is repaired, not trusted',()=>{
  const j=createJournal(SPECIES);
  for(const bad of [null,'x',[],{entries:'x'},{entries:{lion:null,x:{photos:'no'}}},{landmarks:{nope:true,gate:true},photos:'many'}])assert.doesNotThrow(()=>j.restore(bad));
  assert.ok(Number.isFinite(j.state.photos));assert.ok(Object.values(j.state.entries).every(e=>Array.isArray(e.photos)));
  assert.ok(!('nope' in j.state.landmarks),'unknown landmarks are dropped');
  assert.doesNotThrow(()=>j.progress());assert.doesNotThrow(()=>j.entry('africanLion'));
});

test('damaged rescue, director and activity blocks reset only themselves',()=>{
  const s=currentSave();s.ext.rescue={cases:[null,1,{id:'x'}],stats:'x',log:5};s.ext.director={seen:'x',done:'x'};s.ext.activities={planted:[null,{x:'a'}],done:5,counts:null};
  const g=build();assert.equal(g.sanct.restore(s),true);
  assert.doesNotThrow(()=>play(g,3));assertHealthy(g,'damaged blocks');
  assert.ok(g.ops.state.staff.length>0,'untouched systems keep their data');
});

test('a treated case restored without its starting severity still heals and never goes NaN',()=>{
  const s=currentSave();const a=s.animals.find(x=>x.kind==='africanLion');
  s.ext.mgmt.cases=[{id:'case-1',animalId:a.id,cond:'respiratory',sev:50,day:3,noticed:true,diagnosed:true,treated:4}];
  const g=build();assert.equal(g.sanct.restore(s),true);play(g,6);
  const c=g.mgmt.summary().mgmt.cases;assert.ok(c.every(x=>Number.isFinite(x.sev)),'severity stays finite');assert.ok(!c.some(x=>x.id==='case-1'),'the restored case heals');
});

test('non-numeric values inside saved maps and item condition never spread NaN',()=>{
  const s=currentSave();const M=s.ext.mgmt;
  M.dirt={africanLion:'x',giraffe:null,plainsZebra:30};M.sat={family:'high'};M.mix={donor:'x'};M.today={upkeep:'x'};M.history=[{day:1,income:'x',spent:0,cats:{}}];
  s.ext.ops.items[0].cond='worn';
  const g=build();assert.equal(g.sanct.restore(s),true);
  assert.equal(g.mgmt.dirtOf('plainsZebra'),30,'valid numbers are kept');assert.ok(!('cond' in g.ops.state.items[0]),'a damaged condition counts as new');
  play(g,3);assertHealthy(g,'damaged numbers');
  const m=g.mgmt.summary().mgmt;
  assert.ok(Object.values(m.dirt).every(Number.isFinite),'dirt finite');assert.ok(Number.isFinite(m.avgSat),'satisfaction finite');assert.ok(Number.isFinite(m.budget.net),'ledger finite');
  assert.ok(m.items.every(i=>Number.isFinite(i.cond)&&Number.isFinite(i.cost)),'item condition and repair cost finite');
  assert.ok(Number.isFinite(g.ops.summary().visitors.rating),'visitor rating finite');
});

test('damaged family-tree entries are repaired so the breeding tab and stories cannot crash',()=>{
  const s=currentSave();s.state.familyTree=[{name:'Cub',kind:'africanLion',parents:'Nala & Jabari',born:'Day 9'},{kind:'dragon',parents:[]},5,{name:7,kind:'giraffe',parents:['Zawadi',3]}];
  const g=build();assert.equal(g.sanct.restore(s),true);
  const ft=g.sanct.summary().familyTree;assert.equal(ft.length,2);assert.ok(ft.every(f=>Array.isArray(f.parents)&&f.parents.every(p=>typeof p==='string')));
  assert.doesNotThrow(()=>ft.map(f=>f.parents.join(' & ')));
});

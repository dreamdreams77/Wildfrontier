import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, SPECIES } from '../src/sanctuary.js';
import { createOperations, BUILD_ITEMS, ROLES } from '../src/operations.js';
import { createManagement, PROJECTS } from '../src/management.js';
import { createJournal } from '../src/journal.js';
import { createRescue, TEMPLATES } from '../src/rescue.js';
import { createDirector } from '../src/director.js';
import { createActivities } from '../src/activities.js';

// Fuzz: hammer every public action with valid, stale, unknown and malformed arguments, between simulation steps.
// Nothing may throw, and the economy and every animal stat must stay finite and in range.
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

function world(seed){
  const rng=seeded(seed);const sim=createSimulation();const sanct=createSanctuary(sim,{rng});const ops=createOperations(sanct,{rng});const mgmt=createManagement(sanct,ops,{rng});
  const journal=createJournal(SPECIES);const rescue=createRescue(sim,sanct,{rng});const director=createDirector(sim,sanct,ops,journal,rescue,{rng});const activities=createActivities(sim,sanct,journal,rescue,{rng});
  return {rng,sim,sanct,ops,mgmt,journal,rescue,director,activities};
}
const pick=(rng,list)=>list[Math.floor(rng()*list.length)];

test('random and malformed actions never throw or corrupt the sanctuary',()=>{
  const SEEDS=Number(process.env.FUZZ_SEEDS)||4;   // set FUZZ_SEEDS=50 for a longer hunt
  for(let seed=1;seed<=SEEDS;seed++){
    const w=world(seed);const {rng,sim,sanct,ops,mgmt,rescue,activities}=w;sanct.state.funds=4000;
    const ids=()=>[...sim.animals.map(a=>a.id),'nobody',undefined,null,42,''];
    const kinds=()=>[...Object.keys(SPECIES),'dragon',undefined,null];
    const foods=['meat','hay','browse','produce','aquatic','medicine','net','stone',undefined];
    const num=()=>pick(rng,[0,1,-1,17.5,30,45,1e9,-1e9,NaN,Infinity,undefined,null,'x']);
    const staffIds=()=>[...ops.state.staff.map(m=>m.id),'staff-999',undefined];
    const itemIds=()=>[...ops.state.items.map(i=>i.id),'b999',undefined];
    const caseIds=()=>[...mgmt.state.cases.map(c=>c.id),'case-999',undefined];
    const actions=[
      ()=>sanct.feed(pick(rng,ids()),pick(rng,foods)),()=>sanct.feedAllHungry(),()=>sanct.buyFood(pick(rng,foods),pick(rng,[1,5,-3,0,1e6,NaN,undefined])),()=>sanct.refillWater(),
      ()=>sanct.treat(pick(rng,ids())),()=>sanct.enrich(pick(rng,ids())),()=>sanct.pairStatus(pick(rng,ids()),pick(rng,ids())),()=>sanct.startBreeding(pick(rng,ids()),pick(rng,ids())),
      ()=>sanct.transferOut(pick(rng,ids())),()=>sanct.importFounder(pick(rng,kinds()),pick(rng,['male','female','x',undefined])),()=>sanct.useEnrichment(pick(rng,ids()),pick(rng,['scratch','scent','puzzle','x',undefined])),
      ()=>ops.hire(pick(rng,[...Object.keys(ROLES),'wizard',undefined])),()=>ops.dismiss(pick(rng,staffIds())),()=>ops.place(pick(rng,[...Object.keys(BUILD_ITEMS),'castle',undefined]),num(),num(),num()),
      ()=>ops.move(pick(rng,itemIds()),num(),num()),()=>ops.rotate(pick(rng,itemIds()),num()),()=>ops.remove(pick(rng,itemIds())),()=>ops.setOpen(pick(rng,[true,false,undefined])),
      ()=>ops.setPrice(num()),()=>ops.setRestricted(pick(rng,kinds()),pick(rng,[true,false])),
      ()=>mgmt.examine(pick(rng,ids())),()=>mgmt.diagnose(pick(rng,caseIds())),()=>mgmt.treatCase(pick(rng,caseIds())),()=>mgmt.setQuarantine(pick(rng,ids()),pick(rng,[true,false])),
      ()=>mgmt.buyVaccines(pick(rng,[1,5,-2,NaN,undefined])),()=>mgmt.vaccinate(pick(rng,kinds())),()=>mgmt.cleanHabitat(pick(rng,kinds())),()=>mgmt.repair(pick(rng,itemIds())),
      ()=>mgmt.startProject(pick(rng,[...Object.keys(PROJECTS),'nope',undefined])),()=>mgmt.train(pick(rng,staffIds())),
      ()=>{const a=sim.animals.filter(x=>x.managed);const t=pick(rng,a);if(t)mgmt.start(t,pick(rng,['parasites','respiratory','digestive','injury','mange']))},
      ()=>{const c=rescue.report(pick(rng,[...TEMPLATES.map(t=>t.id),'x',undefined]));return c},
      ()=>{const cs=rescue.summary().cases;const c=pick(rng,cs.length?cs:[{id:'x'}]);return rescue.accept(c.id)},
      ()=>rescue.visit({x:num(),z:num()},pick(rng,[2.2,3.4,undefined,NaN])),
      ()=>{const cs=rescue.summary().cases;const c=pick(rng,cs.length?cs:[{id:'x'}]);return rescue.assess(c.id,{x:num(),z:num()})},
      ()=>{const cs=rescue.summary().cases;const c=pick(rng,cs.length?cs:[{id:'x'}]);return rescue.handle(c.id,pick(rng,ids()),{x:num(),z:num()},pick(rng,['net','sedate','firstAid','x',undefined]))},
      ()=>{const cs=rescue.summary().cases;const c=pick(rng,cs.length?cs:[{id:'x'}]);return rescue.transport(c.id,pick(rng,ids()),{x:num(),z:num()})},
      ()=>activities.interact(pick(rng,[...activities.spots,{id:'nope'},undefined])),()=>activities.answerTracks(pick(rng,[...activities.spots.map(s=>s.id),'nope',undefined]),pick(rng,kinds())),
      ()=>{sanct.tick(pick(rng,[1,15,60,360,1440]));sim.tick(5)},()=>{rescue.tick();w.director.scan();activities.scan()},()=>{for(let i=0;i<10;i++)ops.update(.5)},
    ];
    for(let i=0;i<3000;i++){
      const act=pick(rng,actions);
      try{act()}catch(e){assert.fail('seed '+seed+' step '+i+': '+act.toString().slice(0,90)+' threw '+(e&&e.stack||e))}
      if(i%150===0){sanct.state.funds=Math.max(sanct.state.funds,500);
        for(const a of sanct.residents())for(const k of ['health','hydration','nutrition','stress']){assert.ok(Number.isFinite(a[k])&&a[k]>=0&&a[k]<=100,'seed '+seed+' step '+i+' '+a.name+'.'+k+'='+a[k])}
        assert.ok(Number.isFinite(sanct.state.funds)&&Number.isFinite(sanct.state.credits)&&Number.isFinite(sanct.state.reputation),'seed '+seed+' step '+i+' economy finite: '+JSON.stringify([sanct.state.funds,sanct.state.credits,sanct.state.reputation]));
        for(const [k,v] of Object.entries(sanct.state.stock))assert.ok(Number.isFinite(v)&&v>=0,'seed '+seed+' stock '+k+'='+v);
        assert.ok(ops.state.items.every(it=>Number.isFinite(it.x)&&Number.isFinite(it.z)),'items have finite positions');
        assert.doesNotThrow(()=>JSON.stringify(sanct.serialize()));
      }
    }
  }
});

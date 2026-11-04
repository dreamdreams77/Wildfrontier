import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, SPECIES } from '../src/sanctuary.js';
import { createOperations, BUILD_ITEMS } from '../src/operations.js';
import { createManagement } from '../src/management.js';
import { createJournal } from '../src/journal.js';
import { createRescue } from '../src/rescue.js';
import { createDirector } from '../src/director.js';
import { createActivities } from '../src/activities.js';

const DAY=1440;
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function harness(seed=1){
  const rng=seeded(seed);const sim=createSimulation();const sanct=createSanctuary(sim,{rng});const ops=createOperations(sanct,{rng});
  const mgmt=createManagement(sanct,ops,{rng});const journal=createJournal(SPECIES);const rescue=createRescue(sim,sanct,{rng});
  const director=createDirector(sim,sanct,ops,journal,rescue,{rng});const activities=createActivities(sim,sanct,journal,rescue,{rng});
  return {rng,sim,sanct,ops,mgmt,journal,rescue,director,activities};
}
// what the game loop does each step (see main.js)
function step(h,minutes){h.sim.tick(minutes);h.sanct.tick(minutes);h.rescue.tick();h.director.scan();h.activities.scan();for(let i=0;i<20;i++)h.ops.update(.5)}
const finite=n=>typeof n==='number'&&Number.isFinite(n);

function invariants(h,label){
  for(const a of h.sanct.residents()){
    for(const k of ['health','hydration','nutrition','stress','boredom','social','energy','trust']){if(a[k]===undefined)continue;assert.ok(finite(a[k])&&a[k]>=0&&a[k]<=100,label+': '+a.name+'.'+k+'='+a[k])}
    assert.ok(finite(a.ageDays)&&a.ageDays>=0,label+' age');
    assert.ok(a.history.length<=14,label+' history is bounded');
  }
  const s=h.sanct.state;assert.ok(finite(s.funds)&&finite(s.credits)&&finite(s.reputation)&&finite(s.minutes),label+' economy finite');
  for(const [k,v] of Object.entries(s.stock))assert.ok(finite(v)&&v>=0,label+' stock '+k+'='+v);
  assert.ok(h.ops.state.staff.every(m=>finite(m.x)&&finite(m.z)&&m.energy>=0&&m.energy<=100&&m.morale>=0&&m.morale<=100),label+' staff sane');
  assert.ok(h.ops.state.items.every(i=>finite(i.x)&&finite(i.z)&&i.cond>=0&&i.cond<=100),label+' items sane');
  const g=h.mgmt.summary().mgmt;assert.ok(g.cases.length<=h.sanct.residents().length,label+' at most one case per animal');
  assert.ok(Object.values(g.dirt).every(d=>d>=0&&d<=100),label+' dirt bounded');
  assert.ok(g.budget.history.length<=14,label+' ledger bounded');
}

test('a managed sanctuary survives two simulated years of play with every system running',()=>{
  const h=harness(7);h.sanct.state.funds=3000;
  for(const r of ['keeper','keeper','vet','cleaner','researcher','educator'])h.ops.hire(r);
  let placed=0;for(const [t,x,z] of [['pond',30,-15],['shelter',22,3],['feeder',26,-4],['cafe',36,16],['giftShop',33,16],['education',38,16],['scratch',25,-8],['climbing',40,0]])if(h.ops.place(t,x,z).ok)placed++;
  assert.ok(placed>=5);
  h.mgmt.startProject('hygiene');
  let reports=0;
  for(let day=0;day<730;day++){
    // the player keeps the sanctuary stocked
    const st=h.sanct.state;
    if(day%3===0){for(const f of ['meat','hay','browse','aquatic','produce'])if((st.stock[f]||0)<12)h.sanct.buyFood(f,10);if(st.stock.medicine<4)h.sanct.buyFood('medicine',5)}
    if(day%7===0)h.sanct.refillWater();
    if(day%20===0)h.rescue.report&&h.rescue.report('midsize');
    for(let m=0;m<DAY;m+=30)step(h,30);
    if(day%25===0){invariants(h,'day '+day);reports++}
    if(day%50===0&&h.sanct.state.funds<500)h.sanct.state.funds+=800;   // simulate player income choices without hiding NaN bugs
  }
  invariants(h,'final');assert.ok(reports>25);
  assert.ok(h.sanct.residents().length>=16,'no animals vanish');
  const size=JSON.stringify(h.sanct.serialize()).length;assert.ok(size<600000,'save stays small enough for localStorage ('+size+' bytes)');
});

test('save, restore and save again gives an identical sanctuary (round trip is lossless and idempotent)',()=>{
  const h=harness(3);h.sanct.state.funds=4000;for(const r of ['keeper','vet','cleaner'])h.ops.hire(r);h.ops.place('pond',30,-15);h.ops.place('cafe',36,16);
  for(let i=0;i<60;i++)step(h,360);
  const a=JSON.parse(JSON.stringify(h.sanct.serialize()));
  const h2=harness(3);assert.equal(h2.sanct.restore(a),true);
  const b=JSON.parse(JSON.stringify(h2.sanct.serialize()));
  assert.deepEqual(b.state,a.state);assert.deepEqual(b.animals,a.animals);assert.deepEqual(Object.keys(b.ext).sort(),Object.keys(a.ext).sort());
  assert.deepEqual(b.ext.ops.items,a.ext.ops.items);assert.deepEqual(b.ext.mgmt.cases,a.ext.mgmt.cases);
  // and the restored game keeps running
  for(let i=0;i<20;i++)step(h2,360);invariants(h2,'after restore');
});

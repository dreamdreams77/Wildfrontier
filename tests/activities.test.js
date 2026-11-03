import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createRescue } from '../src/rescue.js';
import { createJournal } from '../src/journal.js';
import { createActivities, REGIONS, MILESTONES, PERKS, TRACK_CLUE, FOOT_KINDS, PLANT_COST } from '../src/activities.js';
import { SPECIES } from '../src/sanctuary.js';

const seeded=(seed=5)=>{let n=seed;return()=>{n=(n*16807)%2147483647;return n/2147483647}};
const setup=(extra={})=>{const rng=seeded();const sim=createSimulation();const s=createSanctuary(sim,{rng});const ops=createOperations(s,{rng});const j=createJournal(SPECIES);const r=createRescue(sim,s,{rng});const a=createActivities(sim,s,j,r,{rng,...extra});return {sim,s,ops,j,r,a}};

test('every activity type has spots in several regions and tracks have identifying clues',()=>{
  const {a}=setup();const types=new Set(a.spots.map(s=>s.type));assert.deepEqual([...types].sort(),['footprints','hide','litter','plant','water']);
  for(const t of types)assert.ok(new Set(a.spots.filter(s=>s.type===t).map(s=>s.region)).size>=2,t+' spans regions');
  for(const k of FOOT_KINDS)assert.ok(TRACK_CLUE[k],k);
});
test('track identification: right answers pay and update the journal; wrong ones teach',()=>{
  const {a,s,j}=setup();const spot=a.spots.find(x=>x.type==='footprints'&&x.region==='woodland');const q=a.interact(spot).quiz;
  assert.equal(q.options.length,3);assert.ok(q.clue.length>10);const f0=s.state.funds;
  const ans=a.state.quiz[spot.id].answer;const r=a.answerTracks(spot.id,ans);assert.equal(r.correct,true);assert.ok(s.state.funds>f0&&a.summary().research>=6);assert.ok(j.state.entries[ans]);
  assert.equal(a.available(spot),false,'the spot needs time to refresh');
  const spot2=a.spots.find(x=>x.type==='footprints'&&x.region==='creek');a.interact(spot2);const wrong=a.state.quiz[spot2.id].options.find(k=>k!==a.state.quiz[spot2.id].answer);const w=a.answerTracks(spot2.id,wrong);assert.equal(w.correct,false);assert.match(w.message,/tracks/);
  s.state.day+=3;assert.equal(a.available(spot),true,'refreshes after three days');
});
test('hides log the species actually present nearby and reward new ones',()=>{
  const {a,j}=setup({nearbyKinds:()=>['woodDuck','whoopingCrane','beaver']});const hide=a.spots.find(x=>x.type==='hide');
  const r=a.interact(hide);assert.equal(r.found.length,3);assert.equal(r.fresh,3);assert.ok(j.state.entries.woodDuck.first!==null);
  const quiet=setup({nearbyKinds:()=>[]});assert.match(quiet.a.interact(quiet.a.spots.find(x=>x.type==='hide')).message,/Quiet/);
});
test('water tests reflect real habitat water quality',()=>{
  const good=setup(),bad=setup();good.sim.habitat.water=95;good.sim.habitat.wetland=90;bad.sim.habitat.water=15;bad.sim.habitat.wetland=15;
  const sp=g=>g.a.spots.find(x=>x.type==='water');
  const g=good.a.interact(sp(good)),b=bad.a.interact(sp(bad));assert.ok(g.quality>b.quality+40);assert.ok(['Excellent','Good'].includes(g.grade));assert.ok(['Poor','Unhealthy'].includes(b.grade));assert.ok(g.ph>b.ph);assert.match(b.message,/Restoring/);
});
test('planting spends funds, adds cover, and saplings grow over days',()=>{
  const {a,s,sim}=setup();const spot=a.spots.find(x=>x.type==='plant');const c0=sim.habitat.cover,f0=s.state.funds;
  const r=a.interact(spot);assert.equal(r.ok,true);assert.equal(s.state.funds,f0-PLANT_COST);assert.ok(sim.habitat.cover>c0);
  assert.equal(a.available(spot),false);assert.equal(a.summary().planted[0].growth,0);s.state.day+=3;assert.ok(a.summary().planted[0].growth>.4);s.state.day+=10;assert.equal(a.summary().planted[0].growth,1);
  s.state.funds=1;assert.equal(a.interact(a.spots.filter(x=>x.type==='plant')[1]).ok,false);
});
test('litter cleanup reduces disturbance and is one-off',()=>{
  const {a,sim}=setup();const spot=a.spots.find(x=>x.type==='litter');const d0=sim.habitat.disturbance;a.interact(spot);assert.ok(sim.habitat.disturbance<d0);assert.equal(a.available(spot),false);
});
test('nearest finds only available spots in reach',()=>{
  const {a}=setup();const sp=a.spots.find(x=>x.type==='litter'&&x.region==='woodland');assert.equal(a.nearest({x:sp.x+1,z:sp.z}).id,sp.id);assert.equal(a.nearest({x:sp.x+20,z:sp.z+20}),null);
  a.interact(sp);assert.equal(a.nearest({x:sp.x,z:sp.z}),null);
});
test('regions unlock from reputation and exploration',()=>{
  const {a,s,j}=setup();assert.equal(a.summary().regions.find(r=>r.id==='highland').unlocked,false);
  assert.equal(a.spots.some(x=>x.region==='highland'&&a.available(x)),false,'highland activities are locked');
  s.state.reputation=25;a.scan();assert.equal(a.summary().regions.find(r=>r.id==='highland').unlocked,true);assert.ok(a.spots.some(x=>x.region==='highland'&&a.available(x)));
  assert.equal(a.summary().regions.find(r=>r.id==='savanna').unlocked,false);j.discoverLandmark('gate');a.scan();assert.equal(a.summary().regions.find(r=>r.id==='savanna').unlocked,true);
  assert.ok(REGIONS.every(r=>r.blurb&&r.r>0));
});
test('milestones fire once, pay out, and track real progress',()=>{
  const {a,s,j,r}=setup();const f0=s.state.funds;r.state.stats.rescued=1;const got=a.scan();assert.ok(got.some(m=>m.id==='rescue1'));assert.ok(s.state.funds>f0);assert.equal(a.scan().length,0,'not paid twice');
  for(let i=0;i<10;i++)j.sight(Object.keys(SPECIES)[i%8]+'',1);
  for(const k of ['fox','deer','rabbit','owl','bird','cardinal','raccoon','beaver','skunk','turtle'])j.sight(k,1);
  assert.ok(a.scan().some(m=>m.id==='journal10'));
  assert.ok(MILESTONES.every(m=>m.label&&m.reward&&typeof m.check==='function'));
});
test('research unlocks perks that change gameplay',()=>{
  const {a,s,ops}=setup();s.state.funds=5000;a.scan();assert.equal(s.mods.costMul,1);const base=s.state.funds;ops.place('shadeTree',24,5);const full=base-s.state.funds;
  a.state.research=50;a.scan();assert.equal(s.mods.costMul,.9);const b2=s.state.funds;ops.place('shadeTree',34,5);const disc=b2-s.state.funds;assert.ok(disc<full);
  assert.deepEqual(a.perks(),['scope','bulk']);assert.ok(PERKS.every(p=>p.blurb));assert.equal(a.hasPerk('lab'),false);
});
test('activity progress survives a save',()=>{
  const {a,s,sim,ops,j,r}=setup();a.interact(a.spots.find(x=>x.type==='plant'));a.state.research=33;a.state.milestones.rescue1=3;
  const snap=JSON.parse(JSON.stringify(s.serialize()));const sim2=createSimulation();const s2=createSanctuary(sim2);createOperations(s2);const r2=createRescue(sim2,s2);const a2=createActivities(sim2,s2,createJournal(SPECIES),r2);s2.restore(snap);
  assert.equal(a2.summary().research,33);assert.equal(a2.summary().planted.length,1);assert.ok(a2.summary().milestones.find(m=>m.id==='rescue1').done);
});

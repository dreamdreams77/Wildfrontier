import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary } from '../src/sanctuary.js';
import { createOperations } from '../src/operations.js';
import { createManagement } from '../src/management.js';
import { createEvents } from '../src/events.js';
import { createRelease } from '../src/release.js';
import { createSocial } from '../src/social.js';
import { createStories, STORIES } from '../src/stories.js';
import { createSeasons } from '../src/seasons.js';
import { createRating, TIERS } from '../src/rating.js';

const DAY=1440;
function world(r=.5){
  const sim=createSimulation();const s=createSanctuary(sim,{rng:()=>.5});const ops=createOperations(s,{rng:()=>.5});const mgmt=createManagement(s,ops,{rng:()=>.99});
  const events=createEvents(s,ops,mgmt,{rng:()=>.99});const release=createRelease(s,ops,mgmt,{rng:()=>.99});const social=createSocial(s,mgmt,{rng:()=>r});
  const stories=createStories(s,{ops,mgmt,social,release,events});const seasons=createSeasons(s,sim);const rating=createRating(s,{ops,stories,release,social});
  return {sim,s,ops,mgmt,events,release,social,stories,seasons,rating};
}
const nextDay=s=>{s.state.minutes=(s.state.day-2)*DAY-1;s.tick(2)};
const find=(s,n)=>s.residents().find(a=>a.name===n);

test('every story points at a real founding resident and has three chapters',()=>{
  const {s}=world();for(const st of STORIES){assert.ok(s.residents().some(a=>a.id===st.animal),st.animal);assert.equal(st.chapters.length,3)}
});

test("Jabari's story advances through a vet check, physio sessions and a calm, well-built habitat",()=>{
  const w=world();const j=find(w.s,'Jabari');
  w.mgmt.examine(j.id);w.stories.check();assert.equal(w.stories.state.chapter.jabari,1);
  for(let i=0;i<3;i++)w.s.useEnrichment(j.id,'climbing');w.stories.check();assert.equal(w.stories.state.chapter.jabari,2);
  w.s.mods.habitatScore=()=>95;j.stress=10;const rep=w.s.state.reputation;w.stories.check();assert.equal(w.stories.state.done.jabari,true);assert.ok(w.s.state.reputation>=rep+5);
  assert.ok(j.history.some(h=>/King of the kopje/.test(h.text)));
});

test('feeding counts toward stories only when the feed really happened',()=>{
  const w=world();const k=find(w.s,'Kamili');w.s.state.stock.browse=0;w.s.feed(k.id,'browse');assert.equal((w.stories.state.counts[k.id]?.feed?.browse)||0,0);
  w.s.state.stock.browse=10;k.nutrition=10;w.s.feed(k.id,'browse');assert.equal(w.stories.state.counts[k.id].feed.browse,1);
});

test('bonds grow between sociable, calm animals and fall between stressed bold rivals',()=>{
  const w=world(.5);const a=find(w.s,'Kito'),b=find(w.s,'Penda');a.traits={...a.traits,social:.9,calm:.9};b.traits={...b.traits,social:.9,calm:.9};
  const before=w.social.bond(a.id,b.id);for(let d=0;d<6;d++)nextDay(w.s);assert.ok(w.social.bond(a.id,b.id)>before+5);
  const x=world(.5);const r1=find(x.s,'Rudra'),r2=find(x.s,'Anika');for(const t of [r1,r2]){t.traits={...t.traits,social:.1,calm:.1,bold:.9};t.stress=90}r2.sex='male';
  const b0=x.social.bond(r1.id,r2.id);for(let d=0;d<4;d++){r1.stress=90;r2.stress=90;nextDay(x.s)}assert.ok(x.social.bond(r1.id,r2.id)<b0-5);
});

test('rivals fight and get hurt; separating one stops the fights',()=>{
  const w=world(.01);const a=find(w.s,'Haraka'),b=find(w.s,'Amani');w.social.setBond(a.id,b.id,-90);
  w.social.dayTick();assert.ok(w.social.state.log.some(l=>/fought/.test(l.text)),'a fight happened');
  const y=world(.01);const c=find(y.s,'Haraka'),d=find(y.s,'Amani');y.social.setBond(c.id,d.id,-90);y.social.separate(c.id,3);y.social.dayTick();
  assert.ok(!y.social.state.log.some(l=>/fought/.test(l.text)),'no fight while separated');
});

test('losing a close companion causes grief',()=>{
  const w=world();const a=find(w.s,'Zuberi'),b=find(w.s,'Wangari');w.social.setBond(a.id,b.id,80);w.social.dayTick();
  w.sim.animals.splice(w.sim.animals.indexOf(a),1);const st=b.stress;w.social.dayTick();assert.ok(b.stress>=st+15);assert.ok(b.history.some(h=>/Grieving/.test(h.text)));
});

test('group sessions cost money, lift bonds and count toward the tiger story',()=>{
  const w=world();const f=w.s.state.funds;const before=w.social.bond('bengalTiger-rudra','bengalTiger-anika');
  assert.equal(w.social.groupSession('bengalTiger').ok,true);assert.equal(w.s.state.funds,f-60);assert.ok(w.social.bond('bengalTiger-rudra','bengalTiger-anika')>before);
  assert.equal(w.social.groupSession('bengalTiger').ok,false,'once a day');w.stories.check();assert.equal(w.stories.state.chapter.tigers,1);
});

test('rival breeding pairs are refused with a reason',()=>{
  const w=world();const m=find(w.s,'Jabari'),f=find(w.s,'Nala');w.social.setBond(m.id,f.id,-60);
  const st=w.s.pairStatus(m.id,f.id);assert.equal(st.ok,false);assert.ok(st.issues.some(i=>/do not get along/.test(i)));
});

test('seasons change prices and water drain; the rating rises tier by tier with rewards',()=>{
  const w=world();
  w.sim.tick(1440*5);const season=w.sim.season;assert.equal(season,'Summer');
  const f=w.s.state.funds;w.s.buyFood('browse',10);const dry=f-w.s.state.funds;w.sim.tick(1440*5*3);const f2=w.s.state.funds;w.s.buyFood('browse',10);const wet=f2-w.s.state.funds;
  assert.ok(dry>wet,'browse dearer in the dry season ('+dry+' vs '+wet+')');
  assert.equal(w.rating.state.tier,1);w.s.state.reputation=25;w.stories.state.done.jabari=true;for(const a of w.s.residents()){a.health=100;a.stress=0;a.nutrition=80;a.hydration=80}
  const funds=w.s.state.funds;w.rating.check();assert.equal(w.rating.state.tier,2);assert.ok(w.s.state.funds>=funds+TIERS[1].reward.funds);
});

test('facility upgrades cost money and speed research and treatment',()=>{
  const w=world();w.s.state.funds=5000;assert.equal(w.mgmt.upgrade('lab').ok,true);assert.equal(w.mgmt.state.fac.lab,2);
  w.mgmt.state.active='diagnostics';w.mgmt.state.progress=0;w.mgmt.addResearch(10);assert.ok(w.mgmt.state.progress>13);
  w.mgmt.upgrade('clinic');w.mgmt.upgrade('clinic');assert.equal(w.mgmt.upgrade('clinic').ok,false,'max level');
  const c=w.mgmt.start(find(w.s,'Kito'),'respiratory');w.s.state.stock.medicine=5;w.mgmt.diagnose(c.id);w.mgmt.treatCase(c.id);assert.equal(c.treated,3,'5 days minus 2 clinic levels');
});

test('a night escape is resolved by walking to the animal with the torch',()=>{
  const w=world();w.s.state.minutes=w.s.state.day*DAY-DAY+22*60;const e=w.events.start('escape');assert.ok(e);w.events.choose(e.id,'search');
  const m=w.events.markers();assert.equal(m.length,1);w.events.visit({x:m[0].x,z:m[0].z});const rep=w.s.state.reputation;w.s.state.minutes=e.endsAt;w.s.tick(1);
  assert.ok(w.s.state.reputation>=rep+2);
});

test('all the new systems save and restore',()=>{
  const w=world();w.social.setBond('africanLion-jabari','africanLion-nala',70);w.stories.state.chapter.jabari=2;w.mgmt.state.fac.nursery=3;w.rating.state.tier=3;
  const save=JSON.parse(JSON.stringify(w.s.serialize()));const x=world();assert.equal(x.s.restore(save),true);
  assert.equal(x.social.bond('africanLion-jabari','africanLion-nala'),70);assert.equal(x.stories.state.chapter.jabari,2);assert.equal(x.mgmt.state.fac.nursery,3);assert.equal(x.rating.state.tier,3);
});

test('an escape or patrol restored without usable points still resolves instead of crashing',()=>{
  const w=world();const save=JSON.parse(JSON.stringify(w.s.serialize()));const end=w.s.state.minutes+10;
  save.ext.events.active=[{id:'ev1',type:'escape',endsAt:end,choice:'search',animalId:'africanLion-jabari',animalName:'Jabari'},{id:'ev2',type:'poachers',endsAt:end,choice:'patrol',points:[]}];
  const x=world();assert.equal(x.s.restore(save),true);assert.equal(x.events.markers().length,4,'one search spot and three fence posts');
  assert.doesNotThrow(()=>x.s.tick(30));assert.equal(x.events.state.active.length,0);
  assert.ok(x.events.state.history.some(h=>h.type==='escape'&&/frightening/.test(h.outcome)));
  assert.ok(x.events.state.history.some(h=>h.type==='poachers'&&/not fully patrolled/.test(h.outcome)),'an empty patrol does not count as done');
});

test('damaged story counters in a save are dropped instead of breaking the daily tick',()=>{
  const w=world();const save=JSON.parse(JSON.stringify(w.s.serialize()));
  save.ext.stories={counts:{'giraffe-kamili':5,'africanLion-jabari':{feed:'x',enrich:null,examined:'2'},'plainsZebra-kito':{calmDays:1,feed:{hay:2,bad:'y'}}},global:{waterDays:'a'},sessions:{bengalTiger:'x',africanLion:2}};
  const x=world();assert.equal(x.s.restore(save),true);for(const a of x.s.residents())a.stress=10;
  assert.doesNotThrow(()=>nextDay(x.s));const c=x.stories.state.counts;
  assert.equal(c['plainsZebra-kito'].calmDays,2);assert.deepEqual(c['plainsZebra-kito'].feed,{hay:2});assert.equal(c['africanLion-jabari'].examined,0);assert.equal(c['giraffe-kamili'].calmDays,1);
  assert.ok(Number.isFinite(x.stories.state.global.waterDays));assert.deepEqual(x.stories.state.sessions,{africanLion:2});
});

test('residents with damaged traits in a save get fresh ones instead of NaN boredom',()=>{
  const w=world();const save=JSON.parse(JSON.stringify(w.s.serialize()));save.animals[0].traits={bold:.5};save.animals[1].traits='calm';
  const x=world();assert.equal(x.s.restore(save),true);x.s.tick(120);nextDay(x.s);
  for(const a of x.s.residents()){assert.ok(Number.isFinite(a.boredom),a.name+' boredom');for(const k of ['bold','social','curious','calm'])assert.ok(Number.isFinite(a.traits[k]),a.name+' '+k)}
  assert.ok(x.s.residents().every(a=>Number.isFinite(x.social.rankOf(a))));
});

test('loading a save without a rating block starts at one star; treatment messages give the real length',()=>{
  const w=world();const save=JSON.parse(JSON.stringify(w.s.serialize()));delete save.ext.rating;w.rating.state.tier=4;assert.equal(w.s.restore(save),true);assert.equal(w.rating.state.tier,1);
  w.s.state.funds=5000;w.mgmt.upgrade('clinic');const c=w.mgmt.start(find(w.s,'Kito'),'respiratory');w.s.state.stock.medicine=5;w.mgmt.diagnose(c.id);
  const r=w.mgmt.treatCase(c.id);assert.equal(c.treated,4);assert.match(r.message,/\(4 days\)/);
});

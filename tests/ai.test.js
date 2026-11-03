import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrain, PROFILES, profileOf, ensureProfile, bondLabel, temperamentLabel, CALLS } from '../src/ai.js';
import { SPECS } from '../src/art/creature-specs.js';
import { enrichmentFit, ENRICHMENT, SWIMMERS } from '../src/enrichment.js';
import { createSimulation } from '../src/simulation.js';
import { createSanctuary, welfareOf } from '../src/sanctuary.js';
import { createOperations, BUILD_ITEMS } from '../src/operations.js';

const seeded=()=>{let n=7;return()=>{n=(n*16807)%2147483647;return n/2147483647}};
const mk=(o={})=>({id:'a-1',kind:'deer',x:0,z:0,home:{x:0,z:0},traits:{bold:.5,social:.5,curious:.5,calm:.5},trust:0,stress:20,hunger:20,thirst:20,energy:80,boredom:20,social:70,sleeping:false,mind:null,...o});
const env=(o={})=>({phase:'Day',night:false,rain:false,storm:false,ranger:{x:99,z:99,moving:false},visitors:[],others:[],points:{water:[{x:6,z:0}],shelter:[{x:-5,z:2}],food:[{x:3,z:3}],enrich:[],cover:[]},radius:4,...o});

test('every one of the 26 species has a behaviour profile and an alarm/contact call',()=>{
  for(const k of Object.keys(SPECS)){assert.ok(PROFILES[k],'profile '+k);assert.ok(CALLS[k],'call '+k)}
  assert.equal(Object.keys(PROFILES).length,Object.keys(SPECS).length);
});

test('priorities: a frightened animal flees instead of eating; a calm hungry one forages',()=>{
  const b=createBrain({rng:seeded()});
  const hungry=mk({hunger:85});
  assert.equal(b.think(hungry,env()).behaviour,'eat');
  const scared=mk({hunger:85});
  const d=b.think(scared,env({ranger:{x:3,z:0,moving:true}}));
  assert.equal(d.behaviour,'flee');assert.ok(d.target.x<0,'runs away from the threat, not toward it');assert.ok(d.speed>1.5,'runs');
});

test('thirsty animals walk to water; rain sends sensitive species to shelter; storms send everyone',()=>{
  const b=createBrain({rng:seeded()});
  const t=b.think(mk({thirst:90,hunger:10}),env());assert.equal(t.behaviour,'drink');assert.ok(Math.abs(t.target.x-6)<1.5);
  assert.equal(b.think(mk({kind:'rabbit'}),env({rain:true})).behaviour,'shelter');
  assert.notEqual(b.think(mk({kind:'africanElephant'}),env({rain:true})).behaviour,'shelter');
  assert.equal(b.think(mk({kind:'africanElephant'}),env({storm:true})).behaviour,'shelter');
});

test('trust and boldness change how close a person can get; trusting curious animals approach',()=>{
  const b=createBrain({rng:seeded()});
  const near=env({ranger:{x:5,z:0,moving:false}});
  const wary=b.think(mk({trust:0,traits:{bold:.2,social:.5,curious:.5,calm:.5}}),near);
  const bold=b.think(mk({trust:0,traits:{bold:.95,social:.5,curious:.5,calm:.5}}),env({ranger:{x:7.2,z:0,moving:false}}));
  assert.equal(wary.behaviour,'flee');assert.notEqual(bold.behaviour,'flee','a bold animal tolerates a still stranger');
  const friend=b.think(mk({trust:85,traits:{bold:.7,social:.6,curious:.9,calm:.6}}),env({ranger:{x:8,z:0,moving:false}}));
  assert.equal(friend.behaviour,'investigate');assert.ok(Math.hypot(friend.target.x-8,friend.target.z)<4,'walks up to the keeper');
  const familiar=b.think(mk({trust:85}),env({ranger:{x:2.5,z:0,moving:true}}));
  assert.ok(familiar.fear<.4,'a trusted keeper barely startles it');
});

test('predators frighten prey but not each other; visitors disturb sensitive species most',()=>{
  const b=createBrain({rng:seeded()});
  const wolf={id:'w',kind:'redWolf',x:4,z:0,behaviour:'explore',fear:0};
  assert.equal(b.think(mk({kind:'rabbit'}),env({others:[wolf]})).behaviour,'flee');
  assert.notEqual(b.think(mk({kind:'redWolf',id:'w2'}),env({others:[wolf]})).behaviour,'flee');
  const crowd=Array.from({length:6},(_,i)=>({x:2+i*.3,z:1}));
  const cheetah=b.think(mk({kind:'cheetah',stress:50}),env({visitors:crowd})),elephant=b.think(mk({kind:'africanElephant',stress:50}),env({visitors:crowd}));
  assert.ok(cheetah.fear>elephant.fear,'cheetahs mind crowds more than elephants');
});

test('alarm calls spread through a herd: deer warn deer',()=>{
  const b=createBrain({rng:seeded()});
  const alarmed={id:'d2',kind:'deer',x:6,z:0,behaviour:'flee',fear:.9};
  const d=b.think(mk({id:'d1'}),env({others:[alarmed]}));
  assert.ok(d.fear>.3,'fear spreads by contagion');assert.equal(d.behaviour,'flee');
  assert.notEqual(b.think(mk({id:'d1',kind:'fox'}),env({others:[alarmed]})).behaviour,'flee','other species ignore deer alarm');
});

test('herd animals regroup when separated; solitary animals do not',()=>{
  const b=createBrain({rng:seeded()});
  const kin=[{id:'z2',kind:'plainsZebra',x:12,z:0,behaviour:'explore',fear:0},{id:'z3',kind:'plainsZebra',x:13,z:2,behaviour:'explore',fear:0}];
  const z=b.think(mk({id:'z1',kind:'plainsZebra',home:{x:12,z:0},x:0,z:0,hunger:10,thirst:10}),env({others:kin}));
  assert.ok(['herd','socialize'].includes(z.behaviour));assert.ok(z.target.x>8,'moves toward the herd');
  const lone=b.think(mk({id:'f1',kind:'fox',hunger:10,thirst:10}),env({others:kin.map(k=>({...k,kind:'fox'}))}));
  assert.ok(!['herd'].includes(lone.behaviour));
});

test('time of day: nocturnal species rest by day, diurnal ones by night',()=>{
  const b=createBrain({rng:seeded()});
  assert.equal(b.think(mk({kind:'owl',hunger:10,thirst:10}),env()).behaviour,'rest');
  assert.notEqual(b.think(mk({kind:'owl',hunger:10,thirst:10}),env({night:true,phase:'Night'})).behaviour,'rest');
  assert.equal(b.think(mk({kind:'plainsZebra',hunger:10,thirst:10}),env({night:true,phase:'Night'})).behaviour,'rest');
});

test('bored captive animals use enrichment when available and pace when not',()=>{
  const b=createBrain({rng:seeded()});
  const bored=mk({boredom:90,hunger:10,thirst:10,traits:{bold:.5,social:.5,curious:.9,calm:.5}});
  const withToy=b.think(bored,env({points:{water:[],shelter:[],food:[],cover:[],enrich:[{id:'b1',type:'puzzle',x:3,z:1}]}}));
  assert.equal(withToy.behaviour,'enrich');assert.ok(Math.hypot(withToy.target.x-3,withToy.target.z-1)<1.2);
  const without=b.think(mk({boredom:95,hunger:10,thirst:10,mind:null}),env());
  assert.equal(without.behaviour,'patrol','stereotypic pacing when nothing to do');
});

test('hysteresis stops animals dithering; thinking is deterministic for a seed',()=>{
  const b=createBrain({rng:seeded()});const a=mk({hunger:60,thirst:58});const first=b.think(a,env()).behaviour;
  for(let i=0;i<5;i++)assert.equal(b.think(a,env()).behaviour,first);
  const r1=createBrain({rng:seeded()}).think(mk(),env()),r2=createBrain({rng:seeded()}).think(mk(),env());assert.deepEqual(r1.target,r2.target);
});

test('personalities are stable per individual, differ between individuals and respond to the description',()=>{
  const a1=ensureProfile({id:'x-1',personality:'Bold and sociable'}),a2=ensureProfile({id:'x-2',personality:'Bold and sociable'}),shy=ensureProfile({id:'x-1',personality:'Shy and nervous'});
  assert.notDeepEqual(a1.traits,a2.traits);assert.ok(a1.traits.bold>shy.traits.bold+.3);
  assert.deepEqual(ensureProfile({id:'x-1',personality:'Bold and sociable'}).traits,a1.traits);
  assert.ok(typeof temperamentLabel(a1.traits)==='string');assert.equal(bondLabel(5),'Wary of people');assert.equal(bondLabel(80),'Trusting');
});

test('enrichment: species-appropriate objects work best; swimmers use water; everything else is partial',()=>{
  assert.equal(enrichmentFit('bengalTiger','scent'),1);assert.ok(enrichmentFit('giraffe','scent')<1&&enrichmentFit('giraffe','scent')>0);
  assert.equal(enrichmentFit('bengalTiger','pond'),1);assert.equal(enrichmentFit('africanLion','pond'),0);assert.ok(SWIMMERS.has('flamingo'));
  for(const t of Object.keys(ENRICHMENT))assert.ok(BUILD_ITEMS[t]&&BUILD_ITEMS[t].tags.includes('enrich'),t+' is buildable');
});

test('boredom is a real welfare stat: it builds, hurts, and is relieved by the right object',()=>{
  const sim=createSimulation();const s=createSanctuary(sim);const ops=createOperations(s);
  const lion=sim.animals.find(a=>a.name==='Jabari'),zebra=sim.animals.find(a=>a.name==='Kito');
  for(const a of [lion,zebra]){a.nutrition=95;a.hydration=95;a.stress=10;a.health=95}
  const w0=welfareOf(lion);lion.boredom=30;s.state.waterLevel=100;
  for(let d=0;d<6;d++){for(const a of [lion,zebra]){a.nutrition=95;a.hydration=95}s.tick(1440)}
  assert.ok(lion.boredom>60,'boredom accumulates: '+lion.boredom);assert.ok(welfareOf(lion)<w0,'welfare falls as boredom rises');assert.ok(lion.stress>10,'chronic boredom stresses animals');
  const before=lion.boredom;const good=s.useEnrichment(lion.id,'scent'),poor=s.useEnrichment(zebra.id,'scent');
  assert.equal(good.ok,true);assert.ok(lion.boredom<before-25,'a fitting object cuts boredom a lot');assert.ok(good.fit>poor.fit);
  const b=lion.boredom;s.useEnrichment(lion.id,'scent');assert.ok(lion.boredom>b-20,'repeating the same toy straight away helps less');
  assert.equal(s.useEnrichment(lion.id,'pond').ok,false,'lions do not swim for fun');
  assert.ok(lion.history.length>=1&&lion.traits,'animals keep a history and personality');
});

test('births inherit temperament from their parents and record their origin',()=>{
  const sim=createSimulation();let n=0;const rng=()=>[.1,.9,.3,.7,.5][n++%5];const s=createSanctuary(sim,{rng});const ops=createOperations(s);
  s.state.funds=5000;const sp=s.SPECIES.cheetah.spawn;ops.place('rocks',sp[0]-2,sp[1]-3);ops.place('rocks',sp[0]+2,sp[1]-3);ops.place('shelter',sp[0]-2,sp[1]+3);
  const m=sim.animals.find(a=>a.name==='Haraka'),f=sim.animals.find(a=>a.name==='Amani');for(const a of [m,f]){a.nutrition=95;a.stress=8;a.hydration=95;a.health=95}
  s.state.waterLevel=100;assert.equal(s.startBreeding(m.id,f.id).ok,true);for(let i=0;i<8;i++){m.nutrition=f.nutrition=95;s.state.waterLevel=100;s.tick(1440)}
  const kid=sim.animals.find(a=>a.parents&&a.parents[0]==='Amani');assert.ok(kid);assert.ok(kid.traits&&kid.history[0].text.includes('Born'));
});

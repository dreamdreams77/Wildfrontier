import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournal, scorePhoto, WOODLAND, LANDMARKS, DISCOVER_RADIUS } from '../src/journal.js';
import { SPECIES } from '../src/sanctuary.js';

test('photo score rewards proximity, framing, behaviour and rarity; too far scores zero',()=>{
  const near=scorePhoto({dist:4,offset:0,label:'resting'}),far=scorePhoto({dist:24,offset:0,label:'resting'});
  assert.ok(near>far);assert.equal(scorePhoto({dist:40}),0);
  assert.ok(scorePhoto({dist:10,label:'playful'})>scorePhoto({dist:10,label:'resting'}));
  assert.ok(scorePhoto({dist:10,offset:.9})<scorePhoto({dist:10,offset:0}));
  assert.ok(scorePhoto({dist:10,status:'Endangered'})>scorePhoto({dist:10,status:'Least concern'}));
  assert.ok(near<=100);
});

test('journal covers woodland and safari species with entry info',()=>{
  const j=createJournal(SPECIES);assert.equal(j.progress().species,Object.keys(WOODLAND).length+Object.keys(SPECIES).length);
  assert.equal(j.info('fox').common,'Red fox');assert.equal(j.info('africanLion').common,'African lion');assert.ok(j.info('africanLion').heritage);assert.equal(j.info('dragon'),null);
});

test('first photo of a species is rewarded once; new behaviours add rewards; best photos are kept',()=>{
  const j=createJournal(SPECIES);
  const a=j.recordPhoto({kind:'bengalTiger',score:70,label:'resting',img:'x',day:3});
  assert.equal(a.ok,true);assert.equal(a.firstPhoto,true);assert.ok(a.rewards.funds>=60&&a.rewards.credits===1&&a.rewards.reputation>=1,'endangered species pay more');
  const b=j.recordPhoto({kind:'bengalTiger',score:50,label:'resting'});assert.equal(b.firstPhoto,false);assert.equal(b.rewards.funds,0);
  const c=j.recordPhoto({kind:'bengalTiger',score:90,label:'young'});assert.equal(c.newBehaviour,true);assert.ok(c.rewards.funds>0);assert.equal(c.newBest,true);
  for(let i=0;i<5;i++)j.recordPhoto({kind:'bengalTiger',score:60+i,label:'resting'});
  assert.equal(j.entry('bengalTiger').photos.length,3);assert.equal(j.entry('bengalTiger').photos[0].score,90);
  assert.equal(j.recordPhoto({kind:'bengalTiger',score:0}).ok,false);assert.equal(j.recordPhoto({kind:'unicorn',score:50}).ok,false);
  assert.equal(j.progress().photographed,1);
});

test('sightings mark a species discovered',()=>{
  const j=createJournal(SPECIES);assert.equal(j.sight('fox',3).first,true);assert.equal(j.sight('fox',4).first,false);assert.equal(j.progress().discovered,1);
  assert.equal(j.entry('fox').first,3);
});

test('exploring reveals landmarks near the ranger and persists',()=>{
  const j=createJournal(SPECIES);const start=j.progress().landmarks;assert.ok(start>=3&&start<LANDMARKS.length);
  assert.equal(j.state.landmarks.gate,undefined);
  const found=j.exploreAt(17,1);assert.ok(found.some(l=>l.id==='gate'));assert.equal(j.exploreAt(17,1).length,0);
  assert.equal(j.exploreAt(200,200).length,0);
  const snap=JSON.parse(JSON.stringify(j.serialize()));const j2=createJournal(SPECIES);j2.restore(snap);assert.equal(j2.state.landmarks.gate,true);
  assert.ok(DISCOVER_RADIUS>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { callSpec, CALL_NAMES, spatial, ambienceMix, scaleFor, noteHz } from '../src/audio.js';
import { CALLS } from '../src/ai.js';
import { SPECS } from '../src/art/creature-specs.js';

test('every species has a synthesised call, and alarms are sharper and louder than contact calls',()=>{
  for(const kind of Object.keys(SPECS)){const name=CALLS[kind];assert.ok(CALL_NAMES.includes(name),kind+' → '+name);
   const alarm=callSpec(kind,'alarm',name),contact=callSpec(kind,'contact',name);assert.ok(alarm.length>=1&&contact.length>=1);
   assert.ok(alarm[0].gain>contact[0].gain,kind+' alarm louder');assert.ok(alarm[0].dur<contact[0].dur);}
  assert.deepEqual(callSpec('deer','alarm','nonsense'),[]);
});
test('different species sound different',()=>{
  const sig=n=>JSON.stringify(callSpec('x','contact',n));const sigs=new Set(['roar','trumpet','hoot','chirp','howl','quack','bark'].map(sig));assert.equal(sigs.size,7);
  assert.ok(callSpec('x','contact','roar')[0].f0<callSpec('x','contact','chirp')[0].f0,'big cats are lower than songbirds');
});
test('sound is positional: nearer is louder, silent when far, panned by side',()=>{
  const L={x:0,z:0};
  const near=spatial(L,0,{x:2,z:0}),mid=spatial(L,0,{x:12,z:0}),far=spatial(L,0,{x:40,z:0});
  assert.ok(near.gain>mid.gain&&mid.gain>far.gain);assert.equal(far.gain,0);
  assert.ok(spatial(L,0,{x:10,z:0}).pan>.2,'to the right');assert.ok(spatial(L,0,{x:-10,z:0}).pan<-.2,'to the left');
  assert.ok(Math.abs(spatial(L,0,{x:0,z:10}).pan)<.05,'straight ahead is centred');
  assert.ok(spatial(L,Math.PI,{x:10,z:0}).pan<-.2,'turning the camera around flips left and right');
});
test('ambience follows time, weather, water and season',()=>{
  const day=ambienceMix({phase:'Day'}),night=ambienceMix({phase:'Night'}),rain=ambienceMix({phase:'Day',rain:true}),winter=ambienceMix({phase:'Day',season:'Winter'});
  assert.ok(day.birds>0&&night.birds===0&&rain.birds===0);assert.ok(night.crickets>day.crickets);assert.ok(rain.rain>0&&day.rain===0);
  assert.ok(ambienceMix({nearWater:1}).water>ambienceMix({nearWater:0}).water);assert.ok(winter.birds<day.birds);
  assert.ok(ambienceMix({wind:1.8}).wind>ambienceMix({wind:.7}).wind);assert.equal(day.mode,'day');assert.equal(night.mode,'night');
});
test('music is generated from a mode-appropriate scale',()=>{
  assert.notDeepEqual(scaleFor('day'),scaleFor('night'));assert.ok(scaleFor('night').includes(3),'night is minor');assert.ok(scaleFor('day').includes(4),'day is major');
  assert.ok(Math.abs(noteHz(220,12)-440)<1e-9);
});

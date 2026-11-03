import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL, tutorialState, INTRO_CARDS, FLYOVER, shouldPlayIntro } from '../src/intro.js';

const empty={moved:0,looked:false,selected:false,activity:false,missions:false,fed:0,built:0,photos:0};
test('the tutorial starts at step one and advances only when the player really does each thing',()=>{
  let st=tutorialState(empty);assert.equal(st.current.id,'move');assert.equal(st.count,0);assert.equal(st.visible,true);
  st=tutorialState({...empty,moved:3});assert.equal(st.current.id,'move','a few steps is not enough');
  st=tutorialState({...empty,moved:8});assert.equal(st.current.id,'look');
  st=tutorialState({...empty,moved:8,looked:true,selected:true});assert.equal(st.current.id,'activity');assert.equal(st.count,3);
});
test('steps can be completed in any order and the tutorial finishes',()=>{
  const all={moved:10,looked:true,selected:true,activity:true,missions:true,fed:2,built:1,photos:1};
  const st=tutorialState(all);assert.equal(st.complete,true);assert.equal(st.current,null);assert.equal(st.visible,false);assert.equal(st.count,TUTORIAL.length);
  const odd=tutorialState({...empty,photos:1,built:1});assert.equal(odd.count,2);assert.equal(odd.current.id,'move');
});
test('the tutorial can be dismissed',()=>{assert.equal(tutorialState(empty,true).visible,false)});
test('the opening has a narrative arc and a cinematic path over the whole reserve',()=>{
  assert.ok(INTRO_CARDS.length>=4);assert.ok(INTRO_CARDS.every(c=>c.title&&c.text&&c.kicker));assert.ok(INTRO_CARDS.some(c=>/hale/i.test(c.kicker)));
  assert.ok(FLYOVER.length>=6);const xs=FLYOVER.map(f=>f.pos[0]);assert.ok(Math.min(...xs)<-15&&Math.max(...xs)>30,'covers woodland and savanna');
  assert.ok(FLYOVER.every(f=>f.pos[1]>3),'camera stays above ground');
});
test('intro plays once for new players, never under automation, and can be forced or skipped',()=>{
  assert.equal(shouldPlayIntro({seen:false}),true);assert.equal(shouldPlayIntro({seen:true}),false);assert.equal(shouldPlayIntro({webdriver:true}),false);
  assert.equal(shouldPlayIntro({seen:true,search:'?intro=1'}),true);assert.equal(shouldPlayIntro({seen:false,search:'?nointro'}),false);
});

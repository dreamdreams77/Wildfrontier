import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';

test('injured wildlife follows the ranger-led rescue sequence',()=>{
  const sim=createSimulation();
  assert.equal(sim.selected().stage,'sighted');
  assert.equal(sim.act('stabilize').ok,false,'field treatment cannot bypass assessment');
  assert.equal(sim.act('assess').ok,true);
  assert.equal(sim.selected().stage,'assessed');
  assert.equal(sim.act('stabilize').ok,true);
  assert.equal(sim.selected().stage,'stabilized');
  assert.equal(sim.act('transport').ok,true);
  assert.equal(sim.selected().stage,'rehabilitating');
  assert.equal(sim.selected().location,'Field station · quiet recovery');
});

test('release is blocked until every welfare threshold is met',()=>{
  const sim=createSimulation();
  sim.act('assess');sim.act('stabilize');sim.act('transport');
  assert.equal(sim.act('release').ok,false);
  assert.match(sim.act('release').message,/Not ready/);
  sim.act('feed');sim.act('water');sim.tick(500);
  // A final measured refresh brings hydration back above the release threshold.
  sim.act('water');
  const animal=sim.selected();
  assert.ok(animal.health>=85);
  assert.ok(animal.stress<=28);
  assert.ok(animal.nutrition>=70);
  assert.ok(animal.hydration>=70);
  assert.equal(sim.act('release').ok,true);
  assert.equal(animal.stage,'released');
});

test('wild animals cannot be fed directly in the meadow',()=>{
  const sim=createSimulation();
  sim.select('rabbit-01');
  const result=sim.act('feed');
  assert.equal(result.ok,false);
  assert.match(result.message,/Do not feed wild animals/);
});

test('habitat restoration changes real habitat measures and restoration score',()=>{
  const sim=createSimulation();
  const before=sim.restoration;
  const water=sim.habitat.water;
  const cover=sim.habitat.cover;
  assert.equal(sim.serviceWater().ok,true);
  assert.ok(sim.habitat.water>water);
  assert.ok(sim.restoration>before);
  assert.equal(sim.serviceWater().ok,false);
  assert.equal(sim.restoreCover().ok,true);
  assert.ok(sim.habitat.cover>cover);
});

test('animal selection is stable and unknown IDs do not change the current selection',()=>{
  const sim=createSimulation();
  assert.equal(sim.select('rabbit-02').id,'rabbit-02');
  assert.equal(sim.select('missing').id,'rabbit-02');
});

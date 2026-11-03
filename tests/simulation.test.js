import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';

test('injured wildlife follows the ranger-led rescue sequence',()=>{
 const sim=createSimulation();
 assert.equal(sim.selected().stage,'sighted');
 assert.equal(sim.act('stabilize').ok,false);
 assert.equal(sim.act('assess').ok,true);
 assert.equal(sim.selected().stage,'assessed');
 assert.equal(sim.act('stabilize').ok,true);
 assert.equal(sim.selected().stage,'stabilized');
 assert.equal(sim.act('transport').ok,true);
 assert.equal(sim.selected().stage,'rehabilitating');
 assert.equal(sim.selected().location,'Field station · quiet recovery');
});

test('release is blocked until health, stress, nutrition, hydration and energy pass',()=>{
 const sim=createSimulation();
 sim.act('assess');sim.act('stabilize');sim.act('transport');
 assert.equal(sim.act('release').ok,false);
 sim.act('feed');sim.act('water');sim.act('quiet');
 sim.tick(800);sim.tick(300);
 sim.act('feed');sim.act('water');sim.act('examine');sim.act('woundCare');sim.act('rehab');sim.act('rehab');
 const animal=sim.selected();
 assert.ok(animal.health>=85);
 assert.ok(animal.stress<=28);
 assert.ok(animal.nutrition>=70);
 assert.ok(animal.hydration>=70);
 assert.ok(animal.energy>=35);
 assert.equal(sim.act('release').ok,true);
 assert.equal(animal.stage,'released');
});

test('wild animals cannot be fed directly in the meadow',()=>{
 const sim=createSimulation();sim.select('rabbit-01');
 const result=sim.act('feed');
 assert.equal(result.ok,false);
 assert.match(result.message,/Do not feed wild animals/);
});

test('animals develop daily rest behavior as the reserve reaches night',()=>{
 const sim=createSimulation();
 sim.select('rabbit-01');
 assert.equal(sim.selected().sleeping,false);
 sim.tick(900);
 assert.equal(sim.phase,'Night');
 assert.equal(sim.selected().sleeping,true);
 assert.match(sim.behavior(sim.selected()),/Resting/);
});

test('habitat restoration improves forage, shelter and biodiversity',()=>{
 const sim=createSimulation();
 const {water,cover,food,biodiversity}=sim.habitat;
 assert.equal(sim.serviceWater().ok,true);
 assert.ok(sim.habitat.water>water);
 assert.equal(sim.serviceWater().ok,false);
 assert.equal(sim.restoreCover().ok,true);
 assert.ok(sim.habitat.cover>cover);
 assert.ok(sim.habitat.food>food);
 assert.ok(sim.habitat.biodiversity>biodiversity);
 assert.equal(sim.restoreCover().ok,false);
 assert.equal(sim.enrichHabitat().ok,true);
});

test('weather and daylight progress with the field clock',()=>{
 const sim=createSimulation();
 assert.equal(sim.phase,'Dawn');
 const initialWeather=sim.weather.name;
 sim.tick(180);
 assert.notEqual(sim.weather.name,initialWeather);
 assert.equal(sim.time,'09:40');
 assert.equal(sim.phase,'Day');
});

test('rehabilitation quiet and enrichment actions have welfare effects',()=>{
 const sim=createSimulation();sim.act('assess');sim.act('stabilize');sim.act('transport');
 const a=sim.selected(),stress=a.stress,energy=a.energy;
 assert.equal(sim.act('quiet').ok,true);
 assert.ok(a.stress<stress);assert.ok(a.energy>energy);
 const social=a.social;
 assert.equal(sim.act('enrich').ok,true);
 assert.ok(a.social>social);
});

test('animal selection remains stable for unknown IDs',()=>{
 const sim=createSimulation();
 assert.equal(sim.select('rabbit-02').id,'rabbit-02');
 assert.equal(sim.select('missing').id,'rabbit-02');
});

test('the reserve roster includes six distinct wildlife species',()=>{
 const sim=createSimulation();
 assert.equal(sim.animals.length,7);
 assert.deepEqual([...new Set(sim.animals.map(a=>a.kind))].sort(),['bird','deer','fox','owl','rabbit','squirrel']);
 assert.ok(sim.animals.some(a=>a.name==='Ember'&&a.kind==='fox'));
 assert.ok(sim.animals.some(a=>a.name==='Moss'&&a.kind==='owl'));
});
test('survey assignments require a recorded observation',()=>{
 const sim=createSimulation();
 assert.equal(sim.startMission('fox').ok,true);
 sim.select('fox-01');
 assert.equal(sim.completeMission('fox').ok,false);
 assert.equal(sim.act('observe').ok,true);
 assert.equal(sim.completeMission('fox').ok,true);
 assert.equal(sim.missions.find(m=>m.id==='fox').status,'complete');
});
test('the injured fawn assignment only completes after a successful release',()=>{
 const sim=createSimulation();
 assert.equal(sim.completeMission('fawn').ok,false);
 sim.act('assess');sim.act('stabilize');sim.act('transport');
 sim.act('feed');sim.act('water');sim.act('quiet');sim.tick(800);sim.tick(300);sim.act('feed');sim.act('water');sim.act('examine');sim.act('woundCare');sim.act('rehab');sim.act('rehab');
 assert.equal(sim.act('release').ok,true);
 assert.equal(sim.completeMission('fawn').ok,true);
});
test('seasonal ecology advances after five simulated days',()=>{
 const sim=createSimulation();
 assert.equal(sim.season,'Spring');
 sim.tick(7200);
 assert.equal(sim.season,'Summer');
 assert.ok(sim.habitat.health>=0&&sim.habitat.health<=100);
});

test('treatment wing progression gates release on clinical care and mobility',()=>{
 const sim=createSimulation();sim.act('assess');sim.act('stabilize');sim.act('transport');
 assert.equal(sim.act('rehab').ok,false);
 assert.equal(sim.act('examine').ok,true);
 assert.equal(sim.act('woundCare').ok,true);
 assert.equal(sim.act('rehab').ok,true);
 assert.equal(sim.act('rehab').ok,true);
 assert.equal(sim.selected().rehabSessions,2);
});
test('expanded wildlife has distinct species diets and routines',()=>{
 const sim=createSimulation();
 for(const id of ['raccoon-01','beaver-01','skunk-01','turtle-01','cardinal-01'])assert.ok(sim.animals.some(a=>a.id===id));
 assert.match(sim.animals.find(a=>a.kind==='beaver').routine,/water|dusk|night/i);
});
test('ecosystem population survey evolves with habitat conditions',()=>{
 const sim=createSimulation();
 const initial=sim.populations.smallHerbivores;
 sim.tick(360);
 assert.notEqual(sim.populations.smallHerbivores,initial);
 assert.ok(sim.populationBalance>=0&&sim.populationBalance<=100);
 assert.match(sim.migrationStatus,/birds|visitors/i);
});

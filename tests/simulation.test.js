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

test('the reserve roster includes fifteen distinct wildlife species',()=>{
 const sim=createSimulation();
 assert.equal(sim.animals.length,18);
 assert.deepEqual([...new Set(sim.animals.map(a=>a.kind))].sort(),['beaver','bird','bobcat','cardinal','deer','fox','owl','rabbit','raccoon','redWolf','riverOtter','skunk','squirrel','turtle','whoopingCrane']);
 for(const id of ['raccoon-01','beaver-01','skunk-01','turtle-01','cardinal-01'])assert.ok(sim.animals.some(a=>a.id===id));
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

test('riparian restoration improves wetland quality and connectivity once',()=>{
 const sim=createSimulation();const wetland=sim.habitat.wetland,connectivity=sim.habitat.connectivity;
 assert.equal(sim.restoreRiparian().ok,true);assert.ok(sim.habitat.wetland>wetland);assert.ok(sim.habitat.connectivity>connectivity);
 assert.equal(sim.riparianRestored,true);assert.equal(sim.restoreRiparian().ok,false);
});
test('nest box installation improves breeding habitat once',()=>{
 const sim=createSimulation();const cover=sim.habitat.cover,pairs=sim.populations.breedingPairs;
 assert.equal(sim.installNestBoxes().ok,true);assert.ok(sim.habitat.cover>cover);assert.equal(sim.populations.breedingPairs,pairs+1);
 assert.equal(sim.nestBoxesInstalled,true);assert.equal(sim.installNestBoxes().ok,false);
});


test('endangered red wolves and whooping cranes are represented',()=>{const sim=createSimulation();assert.ok(sim.animals.some(a=>a.kind==='redWolf'&&a.species.includes('critically endangered')));assert.ok(sim.animals.some(a=>a.kind==='whoopingCrane'&&a.species.includes('endangered')));assert.equal(sim.animals.length,18)});
test('feeding schedules validate time and prohibit feeding free-ranging wildlife',()=>{const sim=createSimulation();assert.equal(sim.scheduleFeed('wolf-01','07:30').ok,true);assert.equal(sim.feedingSchedule['wolf-01'],'07:30');assert.equal(sim.scheduleFeed('wolf-01','25:90').ok,false);assert.equal(sim.scheduleFeed('rabbit-01','08:00').ok,false)});
test('endangered breeding programme requires habitat readiness and genetic review',()=>{const sim=createSimulation();assert.equal(sim.startBreedingProgram().ok,true);assert.equal(sim.breedingProgram.active,true);assert.equal(sim.breedingProgram.geneticReview,true);assert.equal(sim.startBreedingProgram().ok,false)});


test('river otter and bobcat join the roster with species-specific field notes',()=>{const sim=createSimulation();const otter=sim.animals.find(a=>a.id==='otter-01'),bobcat=sim.animals.find(a=>a.id==='bobcat-01');assert.equal(otter.kind,'riverOtter');assert.match(otter.routine,/fish|creek/i);assert.equal(bobcat.kind,'bobcat');assert.match(bobcat.routine,/twilight|cover/i);assert.equal(sim.animals.length,18);assert.equal(sim.startMission('otter').ok,true);sim.select('otter-01');assert.equal(sim.act('observe').ok,true);assert.equal(sim.completeMission('otter').ok,true)});
test('river otters are crepuscular and rest outside dawn and dusk',()=>{const sim=createSimulation();const otter=sim.animals.find(a=>a.id==='otter-01');sim.tick(180);assert.equal(sim.phase,'Day');assert.equal(otter.sleeping,true);sim.tick(480);assert.equal(sim.phase,'Dusk');assert.equal(otter.sleeping,false)});
test('feeding schedules fire when a large tick crosses the scheduled minute',()=>{const sim=createSimulation();sim.scheduleFeed('wolf-01','07:30');const wolf=sim.animals.find(a=>a.id==='wolf-01');const before=wolf.feedings;sim.tick(70);assert.equal(wolf.feedings,before+1);assert.ok(wolf.nutrition>74)});
test('feeding schedules do not fire twice on repeated ticks in the same day',()=>{const sim=createSimulation();sim.scheduleFeed('wolf-01','07:30');const wolf=sim.animals.find(a=>a.id==='wolf-01');sim.tick(60);const after=wolf.feedings;sim.tick(30);assert.equal(wolf.feedings,after)});
test('camera trap evidence unlocks only after three simulated hours',()=>{const sim=createSimulation();assert.equal(sim.installCameraTraps().ok,true);assert.equal(sim.missions.find(m=>m.id==='camera').status,'active');assert.equal(sim.completeMission('camera').ok,false);sim.tick(179);assert.equal(sim.cameraDataReady,false);sim.tick(1);assert.equal(sim.cameraDataReady,true);assert.equal(sim.missions.find(m=>m.id==='camera').status,'available');assert.equal(sim.completeMission('camera').ok,true)});
test('camera traps cannot be installed twice',()=>{const sim=createSimulation();assert.equal(sim.installCameraTraps().ok,true);assert.equal(sim.installCameraTraps().ok,false)});
test('locked camera assignment cannot start before deployment',()=>{const sim=createSimulation();assert.equal(sim.startMission('camera').ok,false);assert.equal(sim.missions.find(m=>m.id==='camera').status,'locked')});
test('pollinator survey requires habitat preparation and improves biodiversity',()=>{const sim=createSimulation();assert.equal(sim.conductPollinatorSurvey().ok,false);sim.enrichHabitat();const before=sim.habitat.pollinators;assert.equal(sim.conductPollinatorSurvey().ok,true);assert.ok(sim.habitat.pollinators>before);assert.equal(sim.conductPollinatorSurvey().ok,false)});
test('large simulation steps process every crossed weather and ecology interval',()=>{const sim=createSimulation();const before=sim.populations.smallHerbivores;sim.tick(1080);assert.equal(sim.weather.name,'Light rain');assert.notEqual(sim.populations.smallHerbivores,before)});
test('multiple season boundaries are not discarded by a large time step',()=>{const sim=createSimulation();sim.tick(1440*10);assert.equal(sim.season,'Autumn')});
test('feeding and rest field actions create welfare changes for recovering wildlife',()=>{const sim=createSimulation();sim.select('fawn-01');const a=sim.selected();a.stage='rehabilitating';a.nutrition=40;a.energy=30;a.stress=50;assert.equal(sim.act('feed').ok,true);assert.ok(a.nutrition>40);assert.equal(sim.act('quiet').ok,true);assert.equal(a.sleeping,true);assert.ok(a.stress<50)});


test('spring breeding records cottontail offspring and preserves parent lineage',()=>{
 const sim=createSimulation();
 const before=sim.animals.length;
 sim.tick(1440*3);
 assert.ok(sim.animals.length>before);
 assert.ok(sim.familyTree.length>=2);
 const record=sim.familyTree[0];
 assert.equal(record.species,'Eastern cottontail');
 assert.deepEqual(record.parents,['Clover','Pip']);
 const young=sim.animals.find(a=>a.id===record.id);
 assert.equal(young.juvenile,true);
 assert.equal(young.stage,'wild');
 assert.equal(young.ageDays,3);
});

test('juveniles mature into independent young wildlife and retain their family record',()=>{
 const sim=createSimulation();
 sim.tick(1440*3);
 const young=sim.animals.find(a=>a.juvenile);
 assert.ok(young);
 sim.tick(1440*18);
 assert.equal(young.juvenile,false);
 assert.equal(young.condition,'Wild resident · independent juvenile');
 assert.equal(sim.familyTree.find(f=>f.id===young.id).stage,'Independent juvenile');
});

test('research centre unlocks only after sufficient field evidence is archived',()=>{
 const sim=createSimulation();
 assert.equal(sim.getResearchCentre().unlocked,false);
 sim.installCameraTraps();sim.tick(180);sim.completeMission('camera');
 sim.enrichHabitat();sim.conductPollinatorSurvey();
 for(const id of ['fox','owl','otter','bobcat']){sim.startMission(id);sim.select(sim.missions.find(m=>m.id===id).animalId);sim.act('observe');sim.completeMission(id)}
 assert.equal(sim.getResearchCentre().unlocked,true);
 assert.equal(sim.researchCentreUnlocked,true);
 assert.ok(sim.getResearchCentre().projects.some(p=>p.name==='Migration telemetry map'&&p.status==='Ready'));
});


test('research lodge projects invest evidence and unlock habitat improvements',()=>{
 const sim=createSimulation();
 assert.equal(sim.runResearchProject('migration').ok,false);
 sim.installCameraTraps();sim.tick(180);sim.completeMission('camera');
 sim.enrichHabitat();sim.conductPollinatorSurvey();
 for(const id of ['fox','owl','otter','bobcat']){sim.startMission(id);sim.select(sim.missions.find(m=>m.id===id).animalId);sim.act('observe');sim.completeMission(id)}
 assert.equal(sim.getResearchCentre().unlocked,true);
 const visitors=sim.populations.migratoryVisitors;
 assert.equal(sim.runResearchProject('migration').ok,true);
 assert.ok(sim.populations.migratoryVisitors>visitors);
 assert.equal(sim.getResearchCentre().records.migration,true);
 assert.equal(sim.runResearchProject('habitat').ok,true);
 assert.equal(sim.runResearchProject('wetland').ok,true);
 assert.ok(sim.habitat.wetland>64);
 assert.equal(sim.runResearchProject('wetland').ok,false);
});

test('genetics registry requires managed programme and never approves endangered pairings',()=>{
 const sim=createSimulation();
 sim.installCameraTraps();sim.tick(180);sim.completeMission('camera');
 sim.enrichHabitat();sim.conductPollinatorSurvey();
 for(const id of ['fox','owl','otter','bobcat']){sim.startMission(id);sim.select(sim.missions.find(m=>m.id===id).animalId);sim.act('observe');sim.completeMission(id)}
 assert.equal(sim.runResearchProject('genetics').ok,false);
 assert.equal(sim.startBreedingProgram().ok,true);
 assert.equal(sim.runResearchProject('genetics').ok,true);
 assert.equal(sim.breedingProgram.geneticReview,true);
});


test('migration telemetry brings a visible seasonal flock into the reserve and opens a field survey',()=>{
 const sim=createSimulation();
 sim.installCameraTraps();sim.tick(180);sim.completeMission('camera');
 sim.enrichHabitat();sim.conductPollinatorSurvey();
 for(const id of ['fox','owl','otter','bobcat']){sim.startMission(id);sim.select(sim.missions.find(m=>m.id===id).animalId);sim.act('observe');sim.completeMission(id)}
 const before=sim.animals.length;
 assert.equal(sim.runResearchProject('migration').ok,true);
 const visitors=sim.animals.filter(a=>a.seasonalVisitor);
 assert.equal(visitors.length,3);assert.equal(sim.animals.length,before+3);
 assert.ok(visitors.every(a=>a.kind==='bird'&&a.stage==='wild'));
 assert.equal(sim.missions.find(m=>m.id==='migration-flock').status,'available');
 assert.equal(sim.startMission('migration-flock').ok,true);
 sim.select('migrant-01');assert.equal(sim.act('observe').ok,true);
 assert.equal(sim.completeMission('migration-flock').ok,true);
});


test('highland reserve unlock requires habitat modelling and wetland expansion, then establishes a heron pair',()=>{
 const sim=createSimulation();sim.installCameraTraps();sim.tick(180);sim.completeMission('camera');sim.enrichHabitat();sim.conductPollinatorSurvey();
 for(const id of ['fox','owl','otter','bobcat']){sim.startMission(id);sim.select(sim.missions.find(m=>m.id===id).animalId);sim.act('observe');sim.completeMission(id)}
 sim.startBreedingProgram();assert.equal(sim.runResearchProject('highland').ok,false);assert.equal(sim.runResearchProject('habitat').ok,true);assert.equal(sim.runResearchProject('wetland').ok,true);assert.equal(sim.runResearchProject('highland').ok,true);
 const herons=sim.animals.filter(a=>a.kind==='greatBlueHeron');assert.equal(herons.length,2);assert.deepEqual(herons.map(a=>a.habitatPosition),[[16,-11],[13,-14]]);assert.equal(sim.missions.find(m=>m.id==='heron-survey').status,'available');assert.equal(sim.runResearchProject('highland').ok,false);
});

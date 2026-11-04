import * as THREE from 'three';
import { makeCreature } from './art/creature.js';
import { makeOak } from './art/vegetation.js';
import { makeHuman, LOOKS } from './art/human.js';
import { buildWorldArt } from './art/world-art.js';
import { setWaterActors } from './art/terrain.js';
import { makeBuildModel, setNight } from './art/structures.js';
import { TIERS, detectTier, createGovernor } from './art/quality.js';
import { createPost } from './art/post.js';
import { setTextureScale } from './art/paint.js';
import { setPhysical, mats } from './art/materials.js';
import { createStaffLayer, createCrowd } from './npcs.js';
import { createBrain, profileOf, CALLS } from './ai.js';
import { damp as dampM, approachSpeed, turnToward, avoid } from './motion.js';
const CAM_OBSTACLES=[{x:-21,z:5,r:5.2,h:4.6},{x:-21,z:-7,r:5.2,h:4.8},{x:-19,z:10,r:3,h:3.8},{x:-12,z:7,r:4.2,h:3.8}];

// Where each woodland resident starts (safari residents and later arrivals carry their own habitatPosition).
const START={'fawn-01':[-1,1],'rabbit-01':[4,5],'rabbit-02':[-7,7],'fox-01':[-15,-2],'owl-01':[-3,-5.5],'squirrel-01':[-4,-3],'bird-01':[7,-7],'raccoon-01':[11,7],'beaver-01':[9,1],'skunk-01':[-17,4],'turtle-01':[5,12],'cardinal-01':[14,-4],'otter-01':[6,2.8],'bobcat-01':[-17,-5],'wolf-01':[-13,-7],'wolf-02':[-11,-8],'crane-01':[8,3],'crane-02':[10,4],'duck-01':[8,2.8],'opossum-01':[-8,6]};
const WHERE={fox:'PINE FRINGE',owl:'OLD OAK CANOPY',squirrel:'OAK HOLLOW',raccoon:'CREEKSIDE HOLLOW',beaver:'CREEK BEND',riverOtter:'LOWER CREEK POOL',bobcat:'ROCKY PINE EDGE',woodDuck:'QUIET CREEK COVE',opossum:'FERN EDGE',skunk:'FERN EDGE',turtle:'WET MEADOW',cardinal:'BERRY THICKET',deer:'NORTH MEADOW',rabbit:'CLOVER PATCH',bird:'CREEKSIDE BRAMBLE'};
const KIND_OF=id=>({'fawn':'deer','rabbit':'rabbit','fox':'fox','owl':'owl','squirrel':'squirrel','bird':'bird','raccoon':'raccoon','beaver':'beaver','skunk':'skunk','turtle':'turtle','cardinal':'cardinal','otter':'riverOtter','bobcat':'bobcat','wolf':'redWolf','crane':'whoopingCrane','duck':'woodDuck','opossum':'opossum'}[String(id).split('-')[0]]);

export function createWorld(container){
 const tierName=detectTier();let tier=TIERS[tierName];
 setTextureScale(tier.texture/512);setPhysical(tier.physical);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#a9b7a0');scene.fog=new THREE.FogExp2('#a9b7a0',.011);
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,260);camera.position.set(10,9,13);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,tier.pixelRatio));renderer.shadowMap.enabled=tier.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;container.appendChild(renderer.domElement);
 let post=null;
 // lighting: a warm key sun, a cool sky fill and a ground bounce give the painted palette its depth
 const hemi=new THREE.HemisphereLight('#f6f4e2','#7f8f5c',2.0);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe5bd',3.1);sun.position.set(-8,22,12);sun.target.position.set(14,0,0);scene.add(sun.target);sun.castShadow=tier.shadows;
 sun.shadow.mapSize.set(tier.shadowMap,tier.shadowMap);Object.assign(sun.shadow.camera,{left:-42,right:42,top:36,bottom:-36,near:1,far:90});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;sun.shadow.radius=3;scene.add(sun);
 const fill=new THREE.DirectionalLight('#a8c4ff',.55);fill.position.set(20,10,-14);scene.add(fill);
 const art=buildWorldArt(scene,{tier});
 // environment reflections from the sky (water, glass, metal); refreshed when the time of day changes
 let pmrem=null;const envScene=new THREE.Scene();envScene.add(art.sky.dome.clone());
 function refreshEnv(){if(tier.post||tier.pixelRatio>1.2){try{pmrem=pmrem||new THREE.PMREMGenerator(renderer);const rt=pmrem.fromScene(envScene,0,1,300);if(scene.environment&&scene.environment.dispose)scene.environment.dispose();scene.environment=rt.texture;scene.environmentIntensity=.55}catch{}}}
 // ----- people and animals -----
 const staffLayer=createStaffLayer(scene),crowd=createCrowd(scene);
 const ranger=makeHuman(LOOKS.ranger);ranger.position.set(-5,0,11);ranger.userData.isRanger=true;scene.add(ranger);
 const animals=[];
 const clock=new THREE.Clock();
 const brain=createBrain();
 // points of interest animals navigate to (static scenery plus whatever the player has built)
 const creekPts=[];for(let t=-18;t<=18;t+=3)creekPts.push({x:7+t*.276,z:t*.96});
 const staticPoints={water:[...creekPts,{x:31,z:7},{x:25.5,z:8.2},{x:38,z:-10},{x:36.5,z:-9},{x:37,z:10}],shelter:[{x:-12,z:7},{x:-19,z:11},{x:-3,z:-4},{x:30,z:-11},{x:28,z:3}],food:[{x:9,z:4}],enrich:[],cover:[{x:-3,z:-5},{x:-10,z:1},{x:12,z:-8},{x:28,z:3},{x:33,z:-3}]};
 let dynamicPoints={water:[],shelter:[],food:[],enrich:[]};
 const hooks={stats:null,onEnrich:null,onNeed:null,onCall:null};
 const wx={rain:false,storm:false};let phaseNow='Dawn',nightNow=false;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let target=new THREE.Vector3(ranger.position.x,0,ranger.position.z),yaw=.72,pitch=.48,distance=19,distGoal=19,following=true;
 let cine=null;
 function playCinematic(frames,duration,onDone){const P=new THREE.CatmullRomCurve3(frames.map(f=>new THREE.Vector3(...f.pos)),false,'catmullrom',.4),Lk=new THREE.CatmullRomCurve3(frames.map(f=>new THREE.Vector3(...f.look)),false,'catmullrom',.4);cine={P,Lk,duration,t:0,onDone}}
 function stopCinematic(){if(!cine)return;const d=cine.onDone;cine=null;cameraUpdate();d&&d()}
 function cameraUpdate(){if(cine)return;const horizontal=Math.cos(pitch)*distance;camera.position.set(target.x+Math.sin(yaw)*horizontal,target.y+Math.sin(pitch)*distance+2,target.z+Math.cos(yaw)*horizontal);const cp=avoid({x:camera.position.x,y:camera.position.y,z:camera.position.z},CAM_OBSTACLES,.9);camera.position.set(cp.x,cp.y,cp.z);camera.lookAt(target)}
 cameraUpdate();
 let viewShift=0;function applyViewShift(w,h){if(viewShift>0)camera.setViewOffset(w,h,0,viewShift,w,h);else camera.clearViewOffset()}
 let rw=0,rh=0;function resize(){const w=Math.round(innerWidth),h=Math.round(innerHeight);if(w===rw&&h===rh)return;rw=w;rh=h;camera.aspect=w/h;applyViewShift(w,h);camera.updateProjectionMatrix();renderer.setSize(w,h);if(post)post.setSize(w,h,renderer.getPixelRatio())}addEventListener('resize',resize);resize();
 const el=renderer.domElement;el.style.touchAction='none';const pointers=new Map();let tapStart=null,pinchBase=0,pinchDist0=distance;
 const pinchSpan=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
 el.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{el.setPointerCapture(e.pointerId)}catch{}if(pointers.size===1)tapStart={x:e.clientX,y:e.clientY,t:performance.now(),moved:false};else{tapStart=null;pinchBase=pinchSpan();pinchDist0=distGoal}});
 el.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const cur={x:e.clientX,y:e.clientY};if(pointers.size>=2){pointers.set(e.pointerId,cur);if(pinchBase>0){distGoal=THREE.MathUtils.clamp(pinchDist0*pinchBase/Math.max(20,pinchSpan()),7,44)}return}
  if(tapStart&&Math.abs(cur.x-tapStart.x)+Math.abs(cur.y-tapStart.y)>10)tapStart.moved=true;if(window.__wildWalking){pointers.set(e.pointerId,cur);return}if(e.pointerType==='mouse'&&!(e.buttons&1)){pointers.set(e.pointerId,cur);return}
  yaw-=(cur.x-prev.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(cur.y-prev.y)*.005,.12,.85);pointers.set(e.pointerId,cur);cameraUpdate()});
 const endPointer=(e,cancelled)=>{const was=tapStart;pointers.delete(e.pointerId);if(pointers.size<2)pinchBase=0;if(pointers.size===0)tapStart=null;if(!cancelled&&was&&!was.moved&&performance.now()-was.t<600){if(photoMode)return;if(buildMode){const bid=pickBuild(e.clientX,e.clientY);if(bid)window.dispatchEvent(new CustomEvent('wildfrontier:builditem',{detail:{id:bid}}));else{const g=pickGround(e.clientX,e.clientY);if(g)window.dispatchEvent(new CustomEvent('wildfrontier:ground',{detail:{x:g.x,z:g.z}}))}return}const a=pick(e.clientX,e.clientY);if(a)window.dispatchEvent(new CustomEvent('wildfrontier:select',{detail:a.userData}))}};
 el.addEventListener('pointerup',e=>endPointer(e,false));el.addEventListener('pointercancel',e=>endPointer(e,true));el.addEventListener('contextmenu',e=>e.preventDefault());
 el.addEventListener('wheel',e=>{distGoal=THREE.MathUtils.clamp(distGoal+e.deltaY*.012,7,44)},{passive:true});
 function pick(clientX,clientY){pointer.x=clientX/innerWidth*2-1;pointer.y=-(clientY/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(animals,true);if(!hits.length)return null;let obj=hits[0].object;while(obj.parent&&!obj.userData.kind)obj=obj.parent;return obj}
 // ---- Build mode, photography and crowd helpers ----
 let buildMode=false,photoMode=false;const buildGroup=new THREE.Group();scene.add(buildGroup);const buildItems=new Map();
 const ring=new THREE.Mesh(new THREE.RingGeometry(1,1.12,40),new THREE.MeshBasicMaterial({color:'#f4e9a8',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.visible=false;scene.add(ring);
 const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 function pickGround(cx,cy){pointer.x=cx/innerWidth*2-1;pointer.y=-(cy/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);const v=new THREE.Vector3();return raycaster.ray.intersectPlane(groundPlane,v)?v:null}
 function pickBuild(cx,cy){pointer.x=cx/innerWidth*2-1;pointer.y=-(cy/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(buildGroup.children,true);if(!hits.length)return null;let o=hits[0].object;while(o&&!o.userData.buildId)o=o.parent;return o?o.userData.buildId:null}
 function placeBuild(m,it){m.position.set(it.x,0,it.z);m.rotation.y=it.rot||0}
 function addBuildItem(it){if(buildItems.has(it.id))return false;const m=makeBuildModel(it.type);m.userData.buildId=it.id;m.userData.type=it.type;placeBuild(m,it);buildGroup.add(m);buildItems.set(it.id,m);return true}
 function updateBuildItem(it){const m=buildItems.get(it.id);if(m){placeBuild(m,it);if(ring.visible&&ring.userData.id===it.id)ring.position.set(it.x,.12,it.z)}}
 function removeBuildItem(id){const m=buildItems.get(id);if(!m)return false;buildGroup.remove(m);buildItems.delete(id);if(ring.userData.id===id)ring.visible=false;return true}
 function selectBuildItem(it,radius=1.6){if(!it){ring.visible=false;ring.userData.id=null;return}ring.userData.id=it.id;ring.scale.setScalar(radius);ring.position.set(it.x,.12,it.z);ring.visible=true}
 function setBuildMode(on){buildMode=!!on;if(!on)ring.visible=false;else distGoal=Math.max(distGoal,26)}
 function setPhotoMode(on){photoMode=!!on;if(on)distGoal=Math.min(distGoal,15);if(!on){camera.zoom=1;camera.updateProjectionMatrix()}}
 function setZoom(z){camera.zoom=THREE.MathUtils.clamp(z,1,4);camera.updateProjectionMatrix()}
 function photoSubjects(){const out=[];const v=new THREE.Vector3();for(const a of animals){v.copy(a.position);v.y+=.7;const d=camera.position.distanceTo(v);v.project(camera);if(v.z>1||Math.abs(v.x)>1.05||Math.abs(v.y)>1.05)continue;out.push({id:a.userData.id,kind:a.userData.kind,nx:v.x,ny:v.y,dist:d/camera.zoom,moving:a.userData.wanderTarget?a.userData.wanderTarget.distanceTo(a.position)>.15:false,sleeping:!!a.userData.sleeping,animation:a.userData.animation})}return out}
 function capture(frame){renderFrame();const src=renderer.domElement,W=src.width,H=src.height;const fw=W*frame.w,fh=fw*(10/16);const c=document.createElement('canvas');c.width=360;c.height=225;const x=c.getContext('2d');x.drawImage(src,(W-fw)/2,(H-fh)/2,fw,fh,0,0,360,225);try{return c.toDataURL('image/jpeg',.72)}catch{return null}}
 function syncStaff(list,dt){staffLayer.sync(list,dt)}
 function setVisitors(n){crowd.setCount(n)}

 function creatureOpts(data){return {sex:data.sex,young:!!(data.young||data.juvenile)}}
 function addAnimal(data){
  if(animals.some(a=>a.userData.id===data.id))return false;
  const kind=data.kind||KIND_OF(data.id);
  const spawn=data.habitatPosition||START[data.id]||[-1+(Math.random()-.5)*1.8,2+(Math.random()-.5)*1.8];
  const x=makeCreature(kind,creatureOpts(data));if(!x)return false;
  x.position.set(spawn[0],0,spawn[1]);scene.add(x);
  const u=x.userData;u.id=data.id;u.name=data.name;u.kind=kind;u.home=new THREE.Vector3(spawn[0],0,spawn[1]);u.wanderTarget=new THREE.Vector3(spawn[0],0,spawn[1]);
  u.aiTimer=2+Math.random()*2;u.forageTimer=2+Math.random()*4;u.animation='idle';u.animationTime=0;u.description='A wild '+kind+' is moving through its natural habitat. Observe quietly from a respectful distance.';u.condition='HEALTHY';u.location=WHERE[kind]||(data.location?String(data.location).toUpperCase():'RESERVE');
  const vh=(()=>{let h=2166136261;for(const c of String(data.id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967296})();const vary=.95+vh*.1;u.radius=data.managed?Math.max(3.4,profileOf(kind).radius):profileOf(kind).radius;u.vel=0;u.baseScale=vary;if(data.hidden){x.visible=false;u.hidden=true}
  x.scale.setScalar((data.scale||(data.juvenile?.62:1))*vary);u.juvenile=!!data.juvenile;animals.push(x);return true;
 }
 function revealAnimal(id){const a=animals.find(x=>x.userData.id===id);if(!a)return false;a.userData.hidden=false;a.visible=true;return true}
 function hideAnimal(id,pos){const a=animals.find(x=>x.userData.id===id);if(!a)return false;a.userData.hidden=true;a.visible=false;if(pos){a.position.set(pos[0],0,pos[1]);a.userData.home.set(pos[0],0,pos[1])}return true}
 // search areas and clues for rescue cases
 const markerGroup=new THREE.Group();scene.add(markerGroup);let markerKey='';
 function setMarkers(list){const key=JSON.stringify(list.map(m=>[m.id,m.type,Math.round(m.x),Math.round(m.z),m.found?1:0]));if(key===markerKey)return;markerKey=key;while(markerGroup.children.length){const c=markerGroup.children.pop();c.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  for(const m of list){const g=new THREE.Group();g.position.set(m.x,0,m.z);
   if(m.type==='search'){const ring=new THREE.Mesh(new THREE.RingGeometry(m.radius-.18,m.radius,48),new THREE.MeshBasicMaterial({color:'#ffd35a',transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.1;g.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,16,10,1,true),new THREE.MeshBasicMaterial({color:'#ffd35a',transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=8;g.add(beam)}
   else if(m.type==='spot'){const col={footprints:'#8ac0ff',hide:'#b8e08a',water:'#6ad0e0',plant:'#9ae06a',litter:'#e0a0ff'}[m.spot]||'#fff';const ring=new THREE.Mesh(new THREE.RingGeometry(.85,1.05,28),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.11;g.add(ring);const pip=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color:col}));pip.position.y=1.25;g.add(pip)}
   else{const dot=new THREE.Mesh(new THREE.CircleGeometry(.55,20),new THREE.MeshBasicMaterial({color:m.found?'#8aa07a':'#ff9a5a',transparent:true,opacity:m.found?.35:.85,depthWrite:false}));dot.rotation.x=-Math.PI/2;dot.position.y=.12;g.add(dot);if(!m.found){const pip=new THREE.Mesh(new THREE.ConeGeometry(.16,.5,8),new THREE.MeshBasicMaterial({color:'#ff9a5a'}));pip.position.y=1.1;pip.rotation.x=Math.PI;g.add(pip)}}
   markerGroup.add(g)}}
 const plantGroup=new THREE.Group();scene.add(plantGroup);const plantMap=new Map();
 function setPlantings(list){for(const p of list){let o=plantMap.get(p.id);if(!o){o=makeOak(p.id.length*7+Math.round(p.x),{scale:.3,detail:.4});o.position.set(p.x,0,p.z);plantGroup.add(o);plantMap.set(p.id,o)}o.scale.setScalar(.25+p.growth*1.0)}}
 function removeAnimal(id){const i=animals.findIndex(a=>a.userData.id===id);if(i<0)return false;const [a]=animals.splice(i,1);scene.remove(a);return true}

 const _d=new THREE.Vector3();const damp=(c,tg,r,dt)=>c+(tg-c)*(1-Math.exp(-r*dt));
 function turnTo(obj,heading,rate,dt){obj.rotation.y+=Math.atan2(Math.sin(heading-obj.rotation.y),Math.cos(heading-obj.rotation.y))*Math.min(1,dt*rate)}
 function updateRanger(dt,keys){
  let moving=false;const rv=ranger.userData.vel||(ranger.userData.vel=new THREE.Vector3());
  if(ranger.userData.rescueTarget){const toward=ranger.userData.rescueTarget.clone().sub(ranger.position);toward.y=0;if(toward.length()>.8){toward.normalize();ranger.position.addScaledVector(toward,dt*2.2);ranger.rotation.y=Math.atan2(toward.x,toward.z);moving=true}else{ranger.userData.rescueTarget=null;ranger.userData.carrying=true}}
  let dx=0,dz=0;if(keys.forward)dz-=1;if(keys.back)dz+=1;if(keys.left)dx-=1;if(keys.right)dx+=1;
  const want=new THREE.Vector3();if(dx||dz){want.set(dx,0,dz).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw)}
  // acceleration-limited velocity: eases into a walk, brakes to a stop, and never slides
  const sp0=rv.length(),spT=(dx||dz)?4.2:0;const sp1=approachSpeed(sp0,spT,16,22,dt);
  if(dx||dz){rv.lerp(want.multiplyScalar(Math.max(sp1,.01)),1-Math.exp(-14*dt));if(rv.length()>.01)rv.setLength(sp1)}else if(sp0>0){rv.multiplyScalar(sp0>0?sp1/sp0:0)}
  const spd=rv.length();
  if(spd>.05){ranger.position.addScaledVector(rv,dt);ranger.position.x=THREE.MathUtils.clamp(ranger.position.x,-25,43);ranger.position.z=THREE.MathUtils.clamp(ranger.position.z,-20,22);ranger.rotation.y=turnToward(ranger.rotation.y,Math.atan2(rv.x,rv.z),10,dt);moving=true;following=true}
  // damped follow camera: glides after the ranger instead of locking to them
  if(following){target.x=dampM(target.x,ranger.position.x,5,dt);target.z=dampM(target.z,ranger.position.z,5,dt)}
  if(Math.abs(distGoal-distance)>.01){distance=dampM(distance,distGoal,7,dt)}
  if(spd>.05||Math.abs(distGoal-distance)>.01||following)cameraUpdate();
  ranger.userData.rig.update(dt,{moving:moving&&spd>.3||moving&&ranger.userData.rescueTarget,carrying:!!ranger.userData.carrying,speedScale:Math.max(.4,spd/4.2)});
 }
 const AGENT={id:'',kind:'',x:0,z:0,home:null,traits:null,trust:0,stress:30,hunger:30,thirst:30,energy:70,boredom:30,social:60,sleeping:false,young:false,mind:null};
 let snapshot=[],rangerMoving=false;
 function snapshotOthers(){snapshot=animals.map(o=>({id:o.userData.id,kind:o.userData.kind,x:o.position.x,z:o.position.z,behaviour:o.userData.mind?o.userData.mind.behaviour:'explore',fear:o.userData.mind?o.userData.mind.fear:0}))}
 function pointsFor(){return {water:staticPoints.water.concat(dynamicPoints.water),shelter:staticPoints.shelter.concat(dynamicPoints.shelter),food:staticPoints.food.concat(dynamicPoints.food),enrich:dynamicPoints.enrich,cover:staticPoints.cover}}
 let cachedPoints=pointsFor();
 function updateAnimal(a,i,dt,t){
  const u=a.userData,kind=u.kind,prof=profileOf(kind);
  if(u.animationTime>0)u.animationTime=Math.max(0,u.animationTime-dt);else if(u.animation!=='idle'&&u.animation!=='forage'&&u.animation!=='drink'&&u.animation!=='play'&&u.animation!=='groom'&&u.animation!=='scratch')u.animation='idle';
  const mind=u.mind||(u.mind=brain.newMind());let moving=false,swim=false,flying=false,anim=u.animation;
  const resting=u.sleeping||u.rescuePose||u.animation==='rescue'||u.animation==='rest';
  const stats=(hooks.stats&&hooks.stats(u.id))||{};
  if(u.hidden){u.rig.update(dt,{moving:false,anim:'idle',sleeping:false});return}
  if(u.destination){
   _d.copy(u.destination).sub(a.position);_d.y=0;
   if(_d.length()>.12){_d.normalize();a.position.addScaledVector(_d,dt*(u.recovery?.85:1.15));turnTo(a,Math.atan2(_d.x,_d.z),9,dt);moving=true}
   else{a.position.x=u.destination.x;a.position.z=u.destination.z}
   u.vel=0;
  }else if(resting){mind.behaviour='rest';u.vel=damp(u.vel||0,0,6,dt)}
  else if(kind==='whoopingCrane'){
   const f=Math.max(0,Math.sin(t*.36+i*.7));flying=f>.2;const nx=u.home.x+Math.sin(t*.19+i)*1.6,nz=u.home.z+Math.cos(t*.15+i)*1.2;
   if(flying){const dx=nx-a.position.x,dz=nz-a.position.z;if(Math.hypot(dx,dz)>.001)turnTo(a,Math.atan2(dx,dz),5,dt)}
   a.position.x=nx;a.position.z=nz;a.position.y=.04+f*1.05;moving=flying;
  }else{
   u.thinkIn=(u.thinkIn??Math.random()*.6)-dt;mind.timer-=dt;
   // near-instant reaction when something frightening gets close
   const close=rangerMoving&&Math.hypot(a.position.x-ranger.position.x,a.position.z-ranger.position.z)<prof.fleeAt*.6;
   if(u.thinkIn<=0||mind.timer<=0||(close&&mind.behaviour!=='flee'&&!resting)){
    AGENT.id=u.id;AGENT.kind=kind;AGENT.x=a.position.x;AGENT.z=a.position.z;AGENT.home=u.home;AGENT.traits=stats.traits||AGENT.traits;AGENT.trust=stats.trust??0;AGENT.stress=stats.stress??30;AGENT.hunger=stats.hunger??30;AGENT.thirst=stats.thirst??30;u.sick=stats.sick||0;AGENT.energy=Math.min(stats.energy??70,70-45*u.sick);AGENT.boredom=stats.boredom??30;AGENT.social=stats.social??60;AGENT.sleeping=false;AGENT.mind=mind;
    if(!AGENT.traits)AGENT.traits={bold:.5,social:.5,curious:.5,calm:.5};
    const prev=mind.behaviour;
    const dec=brain.think(AGENT,{phase:phaseNow,night:nightNow,rain:wx.rain,storm:wx.storm,ranger:{x:ranger.position.x,z:ranger.position.z,moving:rangerMoving},visitors:crowd.people.map(p=>p.f.position),others:snapshot,points:cachedPoints,radius:u.radius},.5);
    u.thinkIn=.35+Math.random()*.45;
    if(dec.behaviour==='flee'&&prev!=='flee'&&hooks.onCall&&Math.random()<.7)hooks.onCall(kind,'alarm',a.position,CALLS[kind]);
   }
   const tgt=mind.target;let desired=0,dd=0;
   if(tgt){_d.set(tgt.x-a.position.x,0,tgt.z-a.position.z);dd=_d.length()}
   const arrived=!tgt||dd<.4;
   if(!arrived&&mind.behaviour!=='rest'){desired=u.speed*(mind.speed||1)*(1-.45*(u.sick||0))}
   u.vel=damp(u.vel||0,arrived?0:desired,mind.behaviour==='flee'?7:3.2,dt);   // accelerate and brake smoothly
   if(u.vel>.02&&tgt&&dd>.05){_d.normalize();a.position.addScaledVector(_d,u.vel*dt);turnTo(a,Math.atan2(_d.x,_d.z),mind.behaviour==='flee'?9:4.5,dt)}
   moving=u.vel>.06;
   if(arrived&&mind.behaviour!=='explore'||(arrived&&mind.timer>0)){anim=mind.anim||'idle'}else anim=moving?'idle':(mind.anim==='forage'?'forage':'idle');
   if(arrived&&!mind.arrived){mind.arrived=true;mind.work=0}
   if(arrived){mind.work=(mind.work||0)+dt;
    if(mind.behaviour==='drink'&&hooks.onNeed)hooks.onNeed(u.id,'drink',dt);
    if(mind.behaviour==='eat'&&hooks.onNeed)hooks.onNeed(u.id,'eat',dt);
    if(mind.behaviour==='enrich'&&mind.enrichId&&mind.work>3&&hooks.onEnrich){hooks.onEnrich(u.id,mind.enrichType);mind.work=-4}
   }
   // calls: contented chirps and herd contact calls now and then
   if(hooks.onCall&&Math.random()<dt*.012&&(prof.social!=='solo'||kind==='bird'||kind==='cardinal'||kind==='owl'))hooks.onCall(kind,'contact',a.position,CALLS[kind]);
  }
  if(kind==='beaver'||kind==='riverOtter'){swim=Math.abs(a.position.x-7)<3.8&&Math.abs(a.position.z-1)<5.5;u.swimming=swim}
  if(kind!=='whoopingCrane')a.position.y=0;
  const run=mind.behaviour==='flee';
  u.rig.update(dt,{moving,anim,sleeping:!!resting,alert:!!u.alert||mind.fear>.45,fear:mind.fear,swim,flying,speedScale:run?1.9:Math.max(.5,(u.vel||0)/(u.speed||.45)),run});
 }
 let snapT=0,ptsT=0;
 function update(dt,keys){const t=clock.elapsedTime;snapT-=dt;ptsT-=dt;if(snapT<=0){snapshotOthers();snapT=.25}if(ptsT<=0){cachedPoints=pointsFor();ptsT=1}const px=ranger.position.x,pz=ranger.position.z;updateRanger(dt,keys);rangerMoving=Math.hypot(ranger.position.x-px,ranger.position.z-pz)>.001||!!(keys.forward||keys.back||keys.left||keys.right);for(let i=0;i<animals.length;i++)updateAnimal(animals[i],i,dt,t)}
 function nearResearchCentre(){return ranger.position.distanceTo(new THREE.Vector3(-21,0,-7))<7.5}
 function setAnimalStage(id,stage){const a=animals.find(x=>x.userData.id===id);if(!a)return false;a.userData.stage=stage;if(stage==='stabilized'){a.userData.rescuePose=true;a.userData.animation='rescue';a.userData.animationTime=2.2;a.userData.destination=null;ranger.userData.rescueTarget=a.position.clone()}else if(stage==='rehabilitating'||stage==='released'){a.userData.rescuePose=false;a.userData.animation='idle';a.rotation.z=0;ranger.userData.rescueTarget=null;ranger.userData.carrying=false}if(stage==='rehabilitating'){a.userData.destination=new THREE.Vector3(-10.3,0,6.1);a.userData.recovery=true;a.userData.animation='rescue';a.userData.animationTime=3.1}else if(stage==='released'){a.userData.destination=a.userData.home.clone();a.userData.recovery=false}else if(stage==='sighted'||stage==='assessed'){a.userData.destination=a.userData.home.clone();a.userData.recovery=false}return true}
 function setAnimalAction(id,action){const a=animals.find(x=>x.userData.id===id);if(!a)return false;a.userData.animation=action==='feed'?'feed':action==='quiet'?'rest':'idle';a.userData.animationTime=action==='feed'?2.4:action==='quiet'?5:1.2;if(action==='quiet'){a.userData.sleeping=true;a.rotation.z=.025}return true}
 function setAnimalState(id,state){const a=animals.find(x=>x.userData.id===id);if(!a)return false;a.userData.sleeping=!!state.sleeping;a.userData.stress=state.stress;a.userData.alert=state.stress>60;if(state.scale&&Math.abs(a.scale.x-state.scale)>.005)a.scale.setScalar(state.scale);return true}

 function setConservationProgress(value){const growth=THREE.MathUtils.clamp(value/3000,0,1);art.willow.scale.setScalar(.65+growth*.45);art.nestBoxes.scale.setScalar(.8+growth*.2);art.willow.children.forEach(s=>{s.scale.y=.6+growth*.7})}
 // Time of day, weather and season drive lights, sky, fog, foliage colour and lit windows.
 const SEASON={Spring:{leaf:'#ffffff',grass:'#ffffff',sky:'#a9b7a0'},Summer:{leaf:'#e4f0d0',grass:'#f4f0d8',sky:'#a5b39a'},Autumn:{leaf:'#ffbe78',grass:'#ffd9a0',sky:'#b5a58d'},Winter:{leaf:'#cfd9d2',grass:'#e4ebe6',sky:'#9daab0'}};
 let lastPhase='';const env={wind:.7,rain:false,night:false,glow:false,season:'Spring'};
 function setEnvironment(phase,weather,season='Spring'){
  const night=phase==='Night',dusk=phase==='Dusk',dawn=phase==='Dawn';phaseNow=phase;nightNow=night;wx.rain=weather==='Light rain';wx.storm=false;env.night=night;env.glow=night||dusk;env.season=season;env.rain=weather==='Light rain';env.wind=weather==='Breezy'?1.8:weather==='Light rain'?1.25:.7;
  const S=SEASON[season]||SEASON.Spring;mats.leaf().color.set(S.leaf);mats.leafDry().color.set(S.leaf);
  art.grass.material.color.set(S.grass);art.savannaGrass.material.color.set(season==='Winter'?'#e0d8c0':'#ffffff');
  sun.intensity=night?.9:dusk?1.5:dawn?2.2:season==='Winter'?2.5:3.1;
  sun.color.set(night?'#8ea6c8':dusk?'#f0a068':dawn?'#ffc890':season==='Winter'?'#d7e2ed':'#ffe5bd');
  const ang=night?[0,28,6]:dusk?[34,8,10]:dawn?[-34,8,10]:[-8,22,12];sun.position.set(ang[0]+14,ang[1],ang[2]);
  hemi.intensity=night?1.5:dusk?1.4:2.0;hemi.color.set(night?'#7f93bb':dusk?'#f0c8a0':'#f3f1dc');hemi.groundColor.set(night?'#3a4a60':'#5f6f48');
  fill.intensity=night?1.0:.55;fill.color.set(night?'#6a86c8':'#a8c4ff');
  const sky=night?'#2f3f55':dusk?'#c9a58c':dawn?'#d9b9a0':weather==='Light rain'?'#879a9a':S.sky;
  scene.fog.color.set(sky);scene.background.set(sky);scene.fog.density=weather==='Light rain'?.017:night?.012:.011;
  const U=art.sky.uniforms;U.horizon.value.set(sky);U.top.value.set(night?'#0b1424':dusk?'#5d6aa0':dawn?'#7a96c8':weather==='Light rain'?'#7c8c98':'#5f94cf');U.sunDir.value.set(sun.position.x-14,sun.position.y,sun.position.z).normalize();U.sunColor.value.copy(sun.color);U.night.value=night?1:0;
  art.sky.cmats.forEach(m=>{m.color.set(night?'#44546e':dusk?'#f0c0a0':dawn?'#ffd8c0':weather==='Light rain'?'#9aa6ae':'#ffffff');m.opacity=night?.35:weather==='Light rain'?.95:.85});
  art.horizon.ridgeMat.color.set(sky);setNight(night||dusk);
  if(phase!==lastPhase){lastPhase=phase;refreshEnv()}
 }
 function renderFrame(){if(post)post.render();else renderer.render(scene,camera)}
 // quality control: switch tiers at runtime (pixel ratio, shadows, post-processing) without rebuilding the scene
 function applyTier(name){
  tier=TIERS[name];renderer.setPixelRatio(Math.min(devicePixelRatio,tier.pixelRatio));renderer.shadowMap.enabled=tier.shadows;sun.castShadow=tier.shadows;
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}sun.shadow.mapSize.set(tier.shadowMap,tier.shadowMap);
  scene.traverse(o=>{if(o.material){[].concat(o.material).forEach(m=>m.needsUpdate=true)}});
  if(tier.post&&!post){try{post=createPost(renderer,scene,camera,{ao:tier.ao});post.setSize(innerWidth,innerHeight,renderer.getPixelRatio())}catch{post=null}}
  if(!tier.post&&post){post.dispose();post=null}
  renderer.toneMapping=post?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;
  if(!tier.post&&scene.environment){scene.environmentIntensity=.4}
  try{localStorage.setItem('wildfrontier.quality.auto',name)}catch{}
 }
 const perf={fps:0,tier:tierName};
 const governor=createGovernor((t,fps)=>{perf.tier=t;applyTier(t)},tierName);
 if(tier.post){try{post=createPost(renderer,scene,camera,{ao:tier.ao});renderer.toneMapping=THREE.NoToneMapping;post.setSize(innerWidth,innerHeight,renderer.getPixelRatio())}catch{post=null}}
 refreshEnv();
 const WATER=[[31,7,4.4],[25.5,8.2,2.3],[38,-10,5.2]];let wFrame=0;
 function rippleUpdate(){
  const pools=[...WATER];for(const m of buildItems.values())if(m.userData.type==='pond'||m.userData.type==='wallow')pools.push([m.position.x,m.position.z,2.4]);
  const near=(x,z)=>Math.abs(x-7)<3.4||pools.some(([px,pz,r])=>Math.hypot(px-x,pz-z)<r+.6);
  const list=[];const rv=ranger.userData.vel,rs=rv?rv.length()/4.2:0;
  if(rs>.1&&near(ranger.position.x,ranger.position.z))list.push({x:ranger.position.x,z:ranger.position.z,speed:rs});
  for(const a of animals){if(list.length>=8)break;if((a.userData.vel||0)>.25&&near(a.position.x,a.position.z))list.push({x:a.position.x,z:a.position.z,speed:Math.min(1,a.userData.vel/2)})}
  for(const p of crowd.people){if(list.length>=8)break;const q=p.f.position;if(near(q.x,q.z))list.push({x:q.x,z:q.z,speed:.5})}
  setWaterActors(list);
 }
 function animate(){
  const dt=Math.min(clock.getDelta(),.05);const t=clock.elapsedTime;
  update(dt,window.__wildKeys||{});crowd.update(dt);art.update(t,dt,env,ranger.position);if((wFrame++&1)===0)rippleUpdate();
  const f=governor.tick();if(f)perf.fps=Math.round(f);
  if(cine){cine.t+=dt;const k=Math.min(1,cine.t/cine.duration);const e=k*k*(3-2*k);camera.position.copy(cine.P.getPoint(e));camera.lookAt(cine.Lk.getPoint(e));if(k>=1)stopCinematic()}
  renderFrame();requestAnimationFrame(animate);
 }
 animate();
 return {scene,camera,renderer,animals,ranger,addAnimal,removeAnimal,addBuildItem,updateBuildItem,removeBuildItem,selectBuildItem,setBuildMode,setPhotoMode,setZoom,photoSubjects,capture,syncStaff,setVisitors,nearResearchCentre,focusResearchCentre(){following=false;target.set(-21,0,-7);cameraUpdate()},nearClinic(){return ranger.position.distanceTo(new THREE.Vector3(-21,0,5))<6.5},focus(x,z){following=false;target.set(x,0,z);cameraUpdate()},setAnimalStage,setAnimalState,setAnimalAction,setEnvironment,
  setConservationProject(name){if(name==='nestBoxes')art.nestBoxes.visible=true;if(name==='riparian')art.willow.visible=true;if(name==='cameraTraps')art.cameraTraps.visible=true;if(name==='wetlandExpansion')art.wetland.visible=true;if(name==='meadowCorridor')art.meadow.visible=true;if(name==='highlandReserve')art.highland.visible=true},
  getYaw:()=>yaw,setViewShift(px){viewShift=Math.max(0,Math.round(px||0));applyViewShift(Math.round(innerWidth),Math.round(innerHeight));camera.updateProjectionMatrix()},playCinematic,stopCinematic,setPlantings,setMarkers,revealAnimal,hideAnimal,setAIPoints(p){dynamicPoints={water:p.water||[],shelter:p.shelter||[],food:p.food||[],enrich:p.enrich||[]};cachedPoints=pointsFor()},setAIHooks(h){Object.assign(hooks,h)},minds:()=>animals.map(a=>({id:a.userData.id,kind:a.userData.kind,behaviour:a.userData.mind&&a.userData.mind.behaviour,fear:a.userData.mind&&a.userData.mind.fear})),
  setConservationProgress,pick,perf,get tier(){return governor.tier},setQuality(n){governor.set(n);try{localStorage.setItem('wildfrontier.quality',n)}catch{}},art,renderFrame};
}

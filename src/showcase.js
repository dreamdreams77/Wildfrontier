import * as THREE from 'three';
import { makeCreature, creatureKinds } from './art/creature.js';
import { makeRole, makeVisitor } from './art/human.js';
import { groundTexture } from './art/paint.js';
import { makeOak, makePine, makeGrass, makeFern, makeRock, makeLog, makeBush, makeFlowers } from './art/vegetation.js';
import { makeBuildModel } from './art/structures.js';
import { wind } from './art/materials.js';

// Dev-only art showcase: ?kind=africanLion&sex=male&pose=walk  or  ?grid=1 for every species.
const q=new URLSearchParams(location.search);
const r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(1);r.setSize(innerWidth,innerHeight);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.toneMapping=THREE.ACESFilmicToneMapping;r.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(r.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a9bba0');scene.fog=new THREE.FogExp2('#a9bba0',.012);
scene.add(new THREE.HemisphereLight('#edf2d9','#52664c',1.5));
const sun=new THREE.DirectionalLight('#ffe5bd',3);sun.position.set(-6,10,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;scene.add(sun);
const gt=groundTexture(q.get('ground')||'woodland');gt.repeat.set(10,10);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({map:gt,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const cam=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.05,200);
const pose=q.get('pose')||'walk';const ctxFor=p=>({pose:p==='work'||p==='photo'||p==='talk'?p:null,carrying:p==='carry',moving:p==='walk',anim:p==='graze'?'forage':'idle',sleeping:p==='sleep',alert:p==='alert',flying:p==='fly'});
const list=[];
// ?slice=1 composes the vertical slice: woodland, a rigged animal, the ranger, a buildable structure and a visitor.
if(q.get('slice')){
 const oak=makeOak(3,{scale:1.7});oak.position.set(-5,0,-4);scene.add(oak);const oak2=makeOak(9,{scale:1.2});oak2.position.set(6,0,-6);scene.add(oak2);const pine=makePine(2,1.3);pine.position.set(-9,0,2);scene.add(pine);
 const sh=makeBuildModel('shelter');sh.position.set(3.2,0,-1.6);sh.rotation.y=-.5;scene.add(sh);
 for(const [x,z,s2] of [[-2,-1,1.1],[1.5,-3,.9],[-3.5,1.5,.8],[4.5,2.5,1]]){const r=makeRock(Math.round(x*7),{size:s2*.6});r.position.set(x,0,z);scene.add(r)}
 const log=makeLog(2,2.4);log.position.set(-1.5,0,-3.2);scene.add(log);for(const [x,z] of [[-4,1],[5,1],[0,-5]]){const b=makeBush(Math.round(x+z+5),{berries:true,scale:1.1});b.position.set(x,0,z);scene.add(b)}
 const gp=[];for(let i=0;i<1800;i++)gp.push([(Math.random()-.5)*26,0,(Math.random()-.5)*20]);scene.add(makeGrass(gp,{palette:['#4b7a35','#8bb852']}));const fp=[];for(let i=0;i<90;i++)fp.push([(Math.random()-.5)*14,0,(Math.random()-.5)*10]);scene.add(makeFlowers(fp));
 for(let i=0;i<10;i++){const f=makeFern(i,1);f.position.set((Math.random()-.5)*12,0,(Math.random()-.5)*8);scene.add(f)}
 const ranger=makeRole('ranger');ranger.position.set(-.2,0,1.2);ranger.rotation.y=.9;scene.add(ranger);list.push(ranger);ranger.userData.slice={moving:true};
 const vis=makeVisitor(3);vis.position.set(2.4,0,2.2);vis.rotation.y=-2.2;scene.add(vis);list.push(vis);vis.userData.slice={moving:true};
 const lion=makeCreature('africanLion',{sex:'male'});lion.position.set(-3.2,0,2.8);lion.rotation.y=.5;scene.add(lion);list.push(lion);lion.userData.slice={moving:false,anim:'idle'};
 const fox=makeCreature('fox');fox.position.set(1.6,0,3.6);fox.rotation.y=-.7;scene.add(fox);list.push(fox);fox.userData.slice={moving:false,anim:'forage'};
 const deer=makeCreature('deer');deer.position.set(-6.4,0,-.6);deer.rotation.y=1.2;scene.add(deer);list.push(deer);deer.userData.slice={moving:false,anim:'idle'};
}
const kinds=q.get('slice')?[]:q.get('human')?[q.get('human')]:q.get('grid')?creatureKinds():[q.get('kind')||'africanLion'];
kinds.forEach((k,i)=>{const g=q.get('human')?(q.get('human')==='visitor'?makeVisitor(+q.get('v')||3):makeRole(q.get('human'))):makeCreature(k,{sex:q.get('sex')||'male'});const cols=6;const x=q.get('grid')?(i%cols-2.5)*4.2:0,z=q.get('grid')?Math.floor(i/cols)*4.2-4:0;g.position.set(x,0,z);g.rotation.y=.6;scene.add(g);list.push(g)});
let yaw=+q.get('yaw')||.9,dist=+q.get('dist')||(q.get('grid')?24:5),height=+q.get('h')||1.3;const tgt=new THREE.Vector3(0,+q.get('ty')||.7,q.get('grid')?-1.2:0);
function frame(t){const dt=.016;for(const g of list)g.userData.rig.update(dt,g.userData.slice||ctxFor(pose));wind.uTime.value=t*.001;if(!q.get('still'))yaw+=.004;
 cam.position.set(tgt.x+Math.sin(yaw)*dist,tgt.y+height,tgt.z+Math.cos(yaw)*dist);cam.lookAt(tgt);r.render(scene,cam);window.__frames=(window.__frames||0)+1;requestAnimationFrame(frame)}
frame();

import * as THREE from 'three';
import { buildGround, buildSky, buildHorizon, makeWaterPlane, makeWaterDisc, updateWater } from './terrain.js';
import { makeOak, makePine, makeAcacia, makeBaobab, makeBush, makeBamboo, makeRock, makeLog, makeGrass, makeFlowers, makeFern, makeMushroom, makeReeds, makeWillow, scatterMerged } from './vegetation.js';
import { makeCabin, makeRecoveryYard, makeClinic, makeResearchLodge, makeSafariGate, makeDeck, makeTrough, makeSignpost, makeBoardwalk, makeNestBox, makeCameraTrap, makeHighlandReserve, makeWetland, makeMeadowPatch } from './structures.js';
import { blobGeo } from './meshkit.js';
import { wind } from './materials.js';
import { rng } from './noise.js';
import { buildSavannaDetail } from './detail.js';
import { createAtmosphere } from './atmosphere.js';
import { buildKenneyLandmarks } from './kenney.js';

// Lays out the whole reserve: woodland, creek, savanna and every building, using the coordinates the game logic expects.
export function buildWorldArt(scene,{tier,onHandle}={}){
 const art={};const F=tier.foliage,G=tier.grass;
 art.ground=buildGround(scene,{tier});
 art.sky=buildSky(scene);
 const fog=scene.fog?scene.fog.color:new THREE.Color('#a9b7a0');
 art.horizon=buildHorizon(scene,fog);

 // ----- creek -----
 const creek=makeWaterPlane(5,40);creek.rotation.z=.28;creek.position.set(7,.06,0);scene.add(creek);art.creek=creek;
 const mud=new THREE.Mesh(new THREE.PlaneGeometry(7.2,41),new THREE.MeshStandardMaterial({color:'#6e5c42',roughness:1}));mud.rotation.x=-Math.PI/2;mud.rotation.z=.28;mud.position.set(7,.035,0);mud.receiveShadow=true;scene.add(mud);
 const bankRocks=[];const rr=rng(8);for(let i=0;i<36;i++){const z=-18+i*1.05;const side=i%2?1:-1;bankRocks.push([7+Math.sin(.28)*z*.0+side*(2.9+rr()*.6)+z*.28*-0+0,0,z,rr()*6,.45+rr()*.5])}
 const stones=scatterMerged(i=>makeRock(i+100,{size:.5+(i%3)*.12,mossy:true}),bankRocks.map(([x,y,z,rot,s])=>[x-(z*0.28*0.0)+(-z*0.27*0.2),0,z,rot,s]));scene.add(stones);
 for(let i=0;i<9;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.16,.2,28),new THREE.MeshBasicMaterial({color:'#e8f4ea',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(5.9+(i%3)*.82,.09,-13+Math.floor(i/3)*8.5);ring.userData.phase=i*.71;ring.userData.base=.65+(i%3)*.12;scene.add(ring);(art.ripples||(art.ripples=[])).push(ring)}

 // ----- woodland trees -----
 const treeAt=[];
 for(let i=0;i<22;i++){const x=-19+(i%6)*7.3,z=-18+Math.floor(i/6)*11.5;if(Math.abs(x)<7&&Math.abs(z)<9)continue;treeAt.push({x,z,s:.8+(i%4)*.17,seed:i,pine:z<-9&&i%2===0})}
 for(const t of treeAt){if(Math.hypot(t.x-1.1,t.z+20.4)<7)continue;   // keep the waterfall clear
  const tr=t.pine?makePine(t.seed,t.s*1.15):makeOak(t.seed,{scale:t.s,detail:F>.7?1:.6});tr.position.set(t.x,0,t.z);tr.rotation.y=t.seed;scene.add(tr)}
 for(const [x,z,s,seed] of [[-10,1,1.5,4],[12,-8,1.35,2],[-15,-13,1.25,8]]){const t=makeOak(seed,{scale:s});t.position.set(x,0,z);scene.add(t)}
 const oak=makeOak(11,{scale:2.0});oak.position.set(-3,0,-5);scene.add(oak);art.oak=oak;
 // framing forest around the reserve, merged into a few meshes
 const frame=[];const fr=rng(21);
 for(let i=0;i<Math.round(46*F);i++){const a=fr()*Math.PI*2;const ex=Math.cos(a),ez=Math.sin(a);const x=9+ex*(38+fr()*7)*(Math.abs(ex)>.7?1.2:1),z=ez*(25+fr()*6);if(x>14&&x<44&&Math.abs(z)<24)continue;frame.push([x,0,z,fr()*6,.9+fr()*.9])}
 scene.add(scatterMerged(i=>i%3?makePine(i,1.2+(i%5)*.12):makeOak(i+50,{scale:1,detail:.4}),frame));
 // ----- rocks, logs, mushrooms, ferns -----
 const rocks=[];for(let i=0;i<24;i++){const x=Math.sin(i*7.2)*17,z=Math.cos(i*4.8)*16;if(x>14)continue;rocks.push([x,0,z,i,.35+(i%3)*.25])}
 scene.add(scatterMerged(i=>makeRock(i+3,{size:1}),rocks));
 const logs=[];for(let i=0;i<9;i++){const x=-17+(i*7.3)%31,z=-14+(i*11.7)%27;if(Math.abs(x+3)<4&&Math.abs(z+5)<4)continue;logs.push([x,0,z,(i*.83)%Math.PI,1])}
 scene.add(scatterMerged(i=>makeLog(i+1,1.8+(i%3)*.4),logs));
 const mush=[];for(let i=0;i<26;i++){const x=Math.sin(i*8.7)*19,z=Math.cos(i*6.1)*18;if(x>14)continue;mush.push([x,0,z,i,1.2])}
 scene.add(scatterMerged(i=>makeMushroom(i),mush));
 const ferns=[];for(let i=0;i<Math.round(60*F);i++){const x=Math.sin(i*13.1)*20,z=Math.cos(i*5.7)*18;if(x>14)continue;ferns.push([x,0,z,i,.8+(i%3)*.3])}
 scene.add(scatterMerged(i=>makeFern(i),ferns));
 const reeds=[];for(let i=0;i<34;i++){const z=-17+i*1.02;for(const side of [-1,1])reeds.push([7+side*(2.7+(i%3)*.25)+z*.0,0,z,i,1])}
 scene.add(scatterMerged(i=>makeReeds(i,5),reeds));
 // berry thicket, boardwalk, sedge
 const bushes=[];for(let i=0;i<7;i++)bushes.push([13+(i%3)*1.15,0,-9+Math.floor(i/3)*1.25,i,1.1]);scene.add(scatterMerged(i=>makeBush(i,{berries:true}),bushes));
 const bw=makeBoardwalk(9,1.65);bw.position.set(8,.12,10);bw.rotation.y=-.12;scene.add(bw);
 // trough, signpost
 const tr=makeTrough();tr.position.set(9,0,4);scene.add(tr);const sp=makeSignpost();sp.position.set(-5,0,4);scene.add(sp);
 // ----- buildings -----
 const cabin=makeCabin();cabin.position.set(-19,0,10);scene.add(cabin);
 const yard=makeRecoveryYard();yard.position.set(-12,0,7);scene.add(yard);
 const clinic=makeClinic();clinic.position.set(-21,0,5);scene.add(clinic);
 const lodge=makeResearchLodge();lodge.position.set(-21,0,-7);scene.add(lodge);
 art.buildings={cabin,yard,clinic,lodge};

 // ----- grass and flowers (instanced, wind-animated) -----
 const gp=[];const gr=rng(4);
 const bad=(x,z)=>(x>-24&&x<-16&&z>3&&z<13)||(x>-16&&x<-8&&z>3&&z<11)||(x>-26&&x<-16&&z>1.5&&z<8.5)||(x>-26&&x<-16&&z>-11&&z<-3)||(x>4&&x<10&&Math.abs(z)<20);
 for(let i=0;i<Math.round(5200*G);i++){const x=-30+gr()*46,z=-22+gr()*46;if(bad(x,z))continue;gp.push([x,0,z])}
 art.grass=makeGrass(gp,{palette:['#4b7a35','#8bb852']});scene.add(art.grass);
 const wet=(x,z)=>[[31,7,4.7,3.4],[25.5,8.2,2.6,1.9],[38,-10,5.8,4.2],[37,10,3.4,2.7]].some(([cx,cz,rx,rz])=>((x-cx)/rx)**2+((z-cz)/rz)**2<1);
 const sp2=[];for(let i=0;i<Math.round(4200*G);i++){const x=16+gr()*28,z=-20+gr()*40;if(wet(x,z))continue;sp2.push([x,0,z])}
 art.savannaGrass=makeGrass(sp2,{palette:['#b89a4e','#e6d283'],height:.85});scene.add(art.savannaGrass);
 const fp=[];for(let i=0;i<Math.round(220*G);i++){fp.push([-16+gr()*14,0,-13+gr()*26])}
 art.flowers=makeFlowers(fp);scene.add(art.flowers);

 // ----- conservation projects (hidden until commissioned) -----
 art.nestBoxes=new THREE.Group();for(const x of [-8,-2,5]){const n=makeNestBox();n.position.set(x,0,-9+(x%3));art.nestBoxes.add(n)}art.nestBoxes.visible=false;scene.add(art.nestBoxes);
 art.cameraTraps=new THREE.Group();for(const [x,z] of [[-16,-7],[-13,-10],[-19,-3]]){const c=makeCameraTrap();c.position.set(x,0,z);art.cameraTraps.add(c)}art.cameraTraps.visible=false;scene.add(art.cameraTraps);
 art.willow=new THREE.Group();for(let i=0;i<9;i++){const w=makeWillow(i);w.position.set(4.4+(i%3)*.48,.05,7+Math.floor(i/3)*1.25);art.willow.add(w)}art.willow.visible=false;scene.add(art.willow);
 art.highland=makeHighlandReserve();art.highland.position.set(15,0,-13);art.highland.visible=false;scene.add(art.highland);
 art.wetland=makeWetland();art.wetland.position.set(-14,0,-11);art.wetland.visible=false;scene.add(art.wetland);
 art.meadow=makeMeadowPatch();art.meadow.position.set(-12,0,-2);art.meadow.visible=false;scene.add(art.meadow);

 // ----- savanna -----
 buildSavannaArt(scene,art,{F,G});
 buildSavannaDetail(scene,art,{F,G});

 // ----- ambient life: butterflies, fireflies, rain -----
 art.butterflies=[];
 const wingMats=['#e0b87a','#e8d8a0','#b8c8a0','#d890a8'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.7,side:THREE.DoubleSide}));
 const wingGeo=blobGeo(.1,.012,.07,{seg:8,low:[.7,.7,.7],high:[1,1,1]});
 for(let i=0;i<13;i++){const grp=new THREE.Group();const home=new THREE.Vector3(Math.sin(i*8.1)*13,0,Math.cos(i*4.7)*12);grp.userData.home=home;grp.userData.phase=i*1.7;scene.add(grp);
  const wings=[];for(const side of [-1,1]){const pivot=new THREE.Group();grp.add(pivot);const m=new THREE.Mesh(wingGeo,wingMats[i%4]);m.position.x=side*.09;pivot.add(m);wings.push({mesh:pivot,side})}
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.07,3,5),new THREE.MeshStandardMaterial({color:'#3a2a1c'}));body.rotation.x=Math.PI/2;grp.add(body);art.butterflies.push({group:grp,wings})}
 const nF=Math.round(26*Math.max(.5,F));const fpos=new Float32Array(nF*3);art.fireflyPhase=[];for(let i=0;i<nF;i++){fpos[i*3]=Math.sin(i*5.7)*16;fpos[i*3+1]=.5+(i%5)*.25;fpos[i*3+2]=Math.cos(i*7.3)*15;art.fireflyPhase.push(i*.61)}
 const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(fpos,3));
 art.fireflies=new THREE.Points(fg,new THREE.PointsMaterial({color:'#e0f0a0',size:.14,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));art.fireflies.visible=false;scene.add(art.fireflies);
 const nR=Math.round(520*Math.max(.5,F));const rp=new Float32Array(nR*6);for(let i=0;i<nR;i++){const x=(Math.random()-.5)*60+8,y=Math.random()*18,z=(Math.random()-.5)*50;rp.set([x,y,z,x-.04,y+.7,z-.02],i*6)}
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
 art.rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:'#cfe0ea',transparent:true,opacity:.35}));art.rain.visible=false;art.rain.frustumCulled=false;scene.add(art.rain);

 art.atmosphere=createAtmosphere(scene,{tier});
 buildKenneyLandmarks(scene,art,{tier}).catch(e=>console.warn('landmarks',e&&e.message));
 art.update=(t,dt,env,focus={x:24,z:0})=>{art.atmosphere.update(t,dt,env,focus);if(art.kenney)art.kenney.update(t);
  wind.uTime.value=t;wind.uStrength.value=env.wind;updateWater(t);art.sky.update(dt);
  art.butterflies.forEach(({group,wings},i)=>{group.visible=(env.season==='Spring'||env.season==='Summer')&&!env.rain&&!env.night;const ph=t*.72+group.userData.phase;group.position.set(group.userData.home.x+Math.sin(ph)*.72,.65+Math.sin(ph*1.7)*.2+(i%4)*.22,group.userData.home.z+Math.cos(ph*.83)*.58);group.rotation.y=Math.sin(ph)*.65+Math.PI/2*0;wings.forEach(({mesh,side})=>{mesh.rotation.z=side*(.2+Math.abs(Math.sin(t*13+i))*1.05)})});
  art.fireflies.visible=env.glow;if(env.glow){art.fireflies.material.opacity=.5+Math.sin(t*2)*.3;const p=art.fireflies.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,.45+((t*.12+i*.17)%1)*.9);p.needsUpdate=true}
  art.rain.visible=env.rain;if(env.rain){const p=art.rain.geometry.attributes.position;for(let i=0;i<p.count;i+=2){let y=p.getY(i)-dt*14;if(y<0)y+=18;p.setY(i,y);p.setY(i+1,y+.7)}p.needsUpdate=true}
  if(art.ripples)art.ripples.forEach((ring)=>{const ph=(t*.42+ring.userData.phase)%(Math.PI*2);ring.scale.setScalar(ring.userData.base*(.72+Math.sin(ph)*.28));ring.material.opacity=.06+Math.max(0,Math.sin(ph))*.14});
 };
 return art;
}

function buildSavannaArt(scene,art,{F,G}){
 // kopje
 const kop=[[0,0,0,1.5],[1.8,0,.8,1.1],[-1.6,0,.6,1.15],[.4,1.1,-.2,1.0],[-.3,0,-1.7,.9],[1.4,0,-1.2,.85]];
 for(const [x,y,z,s] of kop){const r=makeRock(Math.round(x*10+z),{size:s*1.2,mossy:false});r.position.set(24+x,y,-9.5+z);r.scale.y=1.25;scene.add(r)}
 // acacias + baobab
 const acs=[[28,3,1.0],[33.5,-3.5,1.15],[27,-3,.9],[35.5,3,1.0],[30,-12,.85],[40,2,1.05],[34,-6.5,.8],[22,-1,.95],[39,13,.9],[29,13,.85]];
 for(const [x,z,s] of acs){const a=makeAcacia(Math.round(x*3+z),s);a.position.set(x,0,z);a.rotation.y=x;scene.add(a)}
 const bao=makeBaobab(1);bao.position.set(40,0,-3);scene.add(bao);
 // bamboo thicket for the tigers
 for(let i=0;i<6;i++){const b=makeBamboo(i+3,1);const a=i*2.399;b.position.set(21+Math.cos(a)*(1+((i*37)%10)*.2),0,12.5+Math.sin(a)*(.8+((i*13)%10)*.14));scene.add(b)}
 // water: waterhole, bamboo pool, soda lake, wallow
 const wh=makeWaterDisc(3.3,{sx:1.25,sz:.9});wh.position.set(31,.085,7);scene.add(wh);
 const whm=new THREE.Mesh(new THREE.CircleGeometry(3.9,36),new THREE.MeshStandardMaterial({color:'#8a6e48',roughness:1}));whm.rotation.x=-Math.PI/2;whm.scale.set(1.25,.9,1);whm.position.set(31,.07,7);whm.receiveShadow=true;scene.add(whm);
 const bp=makeWaterDisc(1.7,{sx:1.2,sz:.8});bp.position.set(25.5,.085,8.2);scene.add(bp);
 const lakeRim=new THREE.Mesh(new THREE.CircleGeometry(4.8,36),new THREE.MeshStandardMaterial({color:'#c4a6a4',roughness:1}));lakeRim.rotation.x=-Math.PI/2;lakeRim.scale.set(1.2,.85,1);lakeRim.position.set(38,.065,-10);lakeRim.receiveShadow=true;scene.add(lakeRim);
 const lake=makeWaterDisc(4.1,{color:'#d4a0b4',sx:1.2,sz:.85});lake.position.set(38,.085,-10);scene.add(lake);
 const wm=new THREE.Mesh(new THREE.CircleGeometry(2.6,28),new THREE.MeshStandardMaterial({color:'#5a4634',roughness:.5}));wm.rotation.x=-Math.PI/2;wm.scale.set(1.2,.9,1);wm.position.set(37,.07,10);scene.add(wm);
 // gate, deck, boardwalk
 const gate=makeSafariGate();gate.position.set(17,0,0);scene.add(gate);
 const deck=makeDeck();deck.position.set(26,0,5);scene.add(deck);
 const bw=makeBoardwalk(10,1.8);bw.position.set(18,.08,.2);bw.rotation.y=-.12+Math.PI/2*0+0;bw.scale.set(1,1,1.0);scene.add(bw);
 // termite mounds and boulders
 const bold=[];for(let i=0;i<14;i++)bold.push([17+((i*23.7)%26),0,-15+((i*17.3)%32),i,.4+(i%3)*.2]);scene.add(scatterMerged(i=>makeRock(i+60,{size:1,mossy:false}),bold));
}

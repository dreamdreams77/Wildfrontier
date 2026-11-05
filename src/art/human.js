import * as THREE from 'three';
import { stopMotionRig } from './clay.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loft, blobGeo, lathe, xform, paintColor, Rig, autoSkin, bindRigid } from './meshkit.js';
import { mats } from './materials.js';

// A rigged humanoid: lofted limbs and torso skinned to a 22-bone skeleton, with clothing, hair, hats and gear
// painted in vertex colours so a whole person is two draw calls. Used by the ranger, staff and visitors.
const C=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b]};
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const cache=new Map();
const damp=(c,t,r,dt)=>c+(t-c)*(1-Math.exp(-r*dt));

export const LOOKS={
 ranger:{shirt:'#4f6a4a',pants:'#6d6a4a',boots:'#4a3626',skin:'#c99a74',hair:'#4a3626',hairStyle:'short',hat:'wide',hatColor:'#b8a06a',pack:true,belt:true,scarf:'#a8512f',radio:true},
 keeper:{shirt:'#6f8f4e',pants:'#6a5f45',boots:'#3d2e22',skin:'#8d5a3b',hair:'#1c1612',hairStyle:'short',hat:'wide',hatColor:'#c2ad78',belt:true,bucket:true},
 vet:{shirt:'#e9eee6',pants:'#3f5a6b',boots:'#2f2f33',skin:'#a8714d',hair:'#1c1612',hairStyle:'bun',hat:'none',coat:true,stetho:true},
 cleaner:{shirt:'#8a7a4a',pants:'#4a4a3a',boots:'#2f2a22',skin:'#6f4a32',hair:'#1c1612',hairStyle:'short',hat:'wide',hatColor:'#6a5a30',belt:true,bucket:true},
 researcher:{shirt:'#4a6a8a',pants:'#3a4252',boots:'#2f2f33',skin:'#c99a74',hair:'#2a2018',hairStyle:'long',hat:'none',coat:true,lanyard:true,clipboard:true},
 educator:{shirt:'#b5603f',pants:'#4e5566',boots:'#33291f',skin:'#d9aa84',hair:'#6a4a2c',hairStyle:'long',hat:'none',lanyard:true,clipboard:true},
};
const SKINS=['#e3b894','#c99a74','#a8714d','#8d5a3b','#6f4a32','#f0cba8'];
const SHIRTS=['#c0626a','#5a82a8','#d9b65c','#7e9f6a','#a373b3','#e08a4c','#4f9d9a','#d8d4c8','#3c4a6a'];
const PANTS=['#4a5570','#5b4d3d','#6f7058','#2f3a4a','#8a7a5a'];
export function visitorLook(i){
 const a=i*2654435761>>>0;const pick=(arr,s)=>arr[(a>>>s)%arr.length];
 return {shirt:pick(SHIRTS,3),pants:pick(PANTS,7),boots:'#3a2e24',skin:pick(SKINS,11),hair:pick(['#1c1612','#4a3626','#8a6a3a','#b8a070','#2a2a2a','#6a2f1c'],5),hairStyle:pick(['short','long','bun','short','bald'],13),
  hat:(a>>>9)%3===0?'cap':(a>>>9)%5===1?'wide':'none',hatColor:pick(['#d9c595','#3c4a6a','#c0626a','#e8e0c8'],17),pack:(a>>>15)%2===0,camera:(a>>>19)%3===0,shorts:(a>>>21)%3===0,glasses:(a>>>23)%4===0,height:.92+((a>>>25)%7)*.025};
}

function build(look){
 const H=look.height||1;const S=v=>v*H;
 const skin=C(look.skin),shirt=C(look.shirt),pants=C(look.pants),boots=C(look.boots||'#3a2e24'),hair=C(look.hair||'#2a2018');
 const rig=new Rig();
 const P={hips:[0,S(.97),0],spine:[0,S(1.12),0],chest:[0,S(1.34),0],neck:[0,S(1.55),0],head:[0,S(1.64),0],headTip:[0,S(1.86),0]};
 rig.add('hips',null,P.hips,P.spine);rig.add('spine','hips',P.spine,P.chest);rig.add('chest','spine',P.chest,P.neck);rig.add('neck','chest',P.neck,P.head);rig.add('head','neck',P.head,P.headTip);
 const arm={};const leg={};
 for(const s of [-1,1]){const n=s<0?'L':'R';
  arm[n]=[[s*S(.2),S(1.5),0],[s*S(.27),S(1.2),S(.01)],[s*S(.3),S(.94),S(.03)],[s*S(.31),S(.8),S(.05)]];
  rig.add('uarm'+n,'chest',arm[n][0],arm[n][1]);rig.add('farm'+n,'uarm'+n,arm[n][1],arm[n][2]);rig.add('hand'+n,'farm'+n,arm[n][2],arm[n][3]);
  leg[n]=[[s*S(.09),S(.93),0],[s*S(.1),S(.52),S(.015)],[s*S(.1),S(.09),0],[s*S(.1),S(.03),S(.15)]];
  rig.add('thigh'+n,'hips',leg[n][0],leg[n][1]);rig.add('shin'+n,'thigh'+n,leg[n][1],leg[n][2]);rig.add('foot'+n,'shin'+n,leg[n][2],leg[n][3]);
 }
 const parts=[];const add=(g,segs,o)=>{autoSkin(g,segs,o||{pow:3,top:3});parts.push(g)};
 // stylised proportions: a larger head scaled about the neck, chunkier limbs
 const HK=1.3,PIV=S(1.56);const hx=g=>{g.translate(0,-PIV,0);g.scale(HK,HK,HK);g.translate(0,PIV,0);return g};
 const rigid=(g,bone)=>{if(bone==='head')hx(g);bindRigid(g,rig.idx(bone));parts.push(g)};
 // torso: pelvis -> waist -> chest -> shoulders, painted as shirt (collar/neck skin at the top)
 const tors=[{p:[0,S(.93),0],rx:S(.19),ry:S(.125)},{p:[0,S(1.12),0],rx:S(.155),ry:S(.105)},{p:[0,S(1.32),0],rx:S(.215),ry:S(.14)},{p:[0,S(1.5),0],rx:S(.24),ry:S(.125)},{p:[0,S(1.57),0],rx:S(.06),ry:S(.06)}];
 const coatC=look.coat?C('#f0f3ee'):shirt;
 add(loft(tors,{radial:18,rings:26,cap0:2,cap1:1,color:({t})=>t<.12?pants:(t>.92?skin:coatC)}),[rig.seg('hips'),rig.seg('spine'),rig.seg('chest'),rig.seg('neck')],{pow:2.5,top:2});
 // coat skirt
 if(look.coat){const sk=loft([{p:[0,S(.98),0],rx:S(.185),ry:S(.125)},{p:[0,S(.75),0],rx:S(.2),ry:S(.14)},{p:[0,S(.58),0],rx:S(.205),ry:S(.145)}],{radial:16,rings:8,cap0:1,cap1:1,color:()=>C('#f0f3ee')});add(sk,[rig.seg('hips'),rig.seg('thighL'),rig.seg('thighR')],{pow:2,top:3})}
 // head
 const hy=S(1.64);
 const headG=loft([{p:[0,S(1.545),0],rx:S(.055),ry:S(.06)},{p:[0,hy,S(.005)],rx:S(.082),ry:S(.095)},{p:[0,S(1.72),S(.005)],rx:S(.088),ry:S(.1)},{p:[0,S(1.8),0],rx:S(.07),ry:S(.082)}],{radial:16,rings:16,cap0:1,cap1:3,color:({t})=>t<.18?mixc(skin,[0,0,0],.12):skin});
 hx(headG);add(headG,[rig.seg('neck'),rig.seg('head')],{pow:2.5,top:2});
 for(const [dx,dy,dz,r] of [[0,S(1.665),S(.092),.017,[1,1.2,1.2]]]){const nose=blobGeo(S(r),S(r)*1.2,S(r)*1.3,{seg:8,low:mixc(skin,[0,0,0],.15),high:skin});rigid(xform(nose,{pos:[dx,dy,dz]}),'head')}
 for(const s of [-1,1]){const ear=blobGeo(S(.016),S(.03),S(.02),{seg:8,low:skin.map(c=>c*.8),high:skin});rigid(xform(ear,{pos:[s*S(.085),S(1.7),S(0)]}),'head');
  const brow=blobGeo(S(.026),S(.007),S(.012),{seg:6,low:hair.map(c=>c*.7),high:hair});rigid(xform(brow,{pos:[s*S(.036),S(1.725),S(.082)],rot:[0,0,s*-.15]}),'head');
  const mouth=blobGeo(S(.02),S(.004),S(.008),{seg:6,low:[.2,.08,.08],high:[.4,.15,.15]});if(s>0)rigid(xform(mouth,{pos:[0,S(1.625),S(.088)]}),'head')}
 // hair
 const hs=look.hairStyle;
 if(hs==='short'||hs==='long'||hs==='bun'){const cap=blobGeo(S(.097),S(.075),S(.105),{seg:14,noise:.05,seed:3,low:hair.map(c=>c*.55),high:hair});rigid(xform(cap,{pos:[0,S(1.76),S(-.012)]}),'head')}
 if(hs==='long'){const back=blobGeo(S(.09),S(.13),S(.055),{seg:12,noise:.06,low:hair.map(c=>c*.5),high:hair});rigid(xform(back,{pos:[0,S(1.66),S(-.075)]}),'head')}
 if(hs==='bun'){const bun=blobGeo(S(.04),S(.04),S(.04),{seg:10,low:hair.map(c=>c*.55),high:hair});rigid(xform(bun,{pos:[0,S(1.8),S(-.07)]}),'head')}
 // hats
 if(look.hat==='wide'){const hc=C(look.hatColor||'#b8a06a');const brim=lathe([[0,0],[S(.19),0],[S(.235),S(.012)],[S(.24),S(.03)],[S(.2),S(.018)],[0,S(.01)]],{seg:20,color:()=>hc});const crown=lathe([[S(.1),0],[S(.1),S(.06)],[S(.085),S(.1)],[S(.03),S(.115)],[0,S(.115)]],{seg:16,color:()=>hc.map(c=>c*.9)});
  const band=lathe([[S(.1),S(.012)],[S(.103),S(.03)],[S(.103),S(.04)]],{seg:16,color:()=>mixc(hc,[.15,.1,.05],.7)});
  for(const g of [brim,crown,band])rigid(xform(g,{pos:[0,S(1.79),S(.002)],rot:[-.06,0,0]}),'head')}
 if(look.hat==='cap'){const hc=C(look.hatColor||'#3c4a6a');const d=blobGeo(S(.098),S(.06),S(.105),{seg:14,low:hc.map(c=>c*.6),high:hc});rigid(xform(d,{pos:[0,S(1.775),S(-.005)]}),'head');const vis=lathe([[0,0],[S(.11),0],[S(.11),S(.008)],[0,S(.008)]],{seg:10,color:()=>hc});rigid(xform(vis,{pos:[0,S(1.775),S(.1)],rot:[.25,0,0],scale:[.7,1,.55]}),'head')}
 if(look.glasses){const g=lathe([[S(.026),0],[S(.03),S(.004)],[S(.026),S(.008)]],{seg:10,color:()=>[.05,.05,.06]});for(const s of [-1,1])rigid(xform(g,{pos:[s*S(.038),S(1.69),S(.092)],rot:[Math.PI/2,0,0]}),'head')}
 // arms: sleeves to the elbow (short) or wrist, bare skin below
 for(const n of ['L','R']){
  const a=arm[n];
  const up=loft([{p:a[0],rx:S(.072)},{p:a[1],rx:S(.055)}],{radial:10,rings:10,cap0:1,cap1:1,color:()=>coatC});add(up,[rig.seg('uarm'+n),rig.seg('farm'+n),rig.seg('chest')],{pow:3,top:3});
  const fa=loft([{p:a[1],rx:S(.055)},{p:a[2],rx:S(.043)}],{radial:10,rings:10,cap0:1,cap1:1,color:({t})=>t<.7?coatC:skin});add(fa,[rig.seg('farm'+n),rig.seg('hand'+n),rig.seg('uarm'+n)],{pow:3,top:3});
  const hnd=blobGeo(S(.042),S(.058),S(.028),{seg:10,low:skin.map(c=>c*.8),high:skin});rigid(xform(hnd,{pos:[a[2][0]+(n==='L'?-1:1)*S(.005),a[2][1]-S(.045),a[2][2]+S(.012)]}),'hand'+n);
  const l=leg[n];const short=look.shorts;
  const th=loft([{p:l[0],rx:S(.105)},{p:l[1],rx:S(.077)}],{radial:10,rings:10,cap0:1,cap1:1,color:()=>pants});add(th,[rig.seg('thigh'+n),rig.seg('shin'+n),rig.seg('hips')],{pow:3,top:3});
  const sh=loft([{p:l[1],rx:S(.077)},{p:l[2],rx:S(.055)}],{radial:10,rings:12,cap0:1,cap1:1,color:({t})=>short&&t>.1?skin:pants});add(sh,[rig.seg('shin'+n),rig.seg('foot'+n),rig.seg('thigh'+n)],{pow:3,top:3});
  const bootG=loft([{p:[l[2][0],S(.2),0],rx:S(.06)},{p:[l[2][0],S(.07),S(.005)],rx:S(.064)},{p:[l[2][0],S(.035),S(.1)],rx:S(.064),ry:S(.05)}],{radial:10,rings:10,cap0:1,cap1:3,color:({t})=>t<.4?boots:boots.map(c=>c*.85)});add(bootG,[rig.seg('shin'+n),rig.seg('foot'+n)],{pow:3,top:2});
 }
 // gear
 if(look.belt){const b=lathe([[S(.18),0],[S(.185),S(.02)],[S(.18),S(.04)]],{seg:20,color:()=>[.12,.08,.05]});const g=xform(b,{pos:[0,S(1.02),0],scale:[1,1,.78]});autoSkin(g,[rig.seg('hips'),rig.seg('spine')],{});parts.push(g);for(const s of [-1,1]){const pouch=blobGeo(S(.04),S(.05),S(.03),{seg:8,low:[.1,.07,.04],high:[.2,.14,.08]});rigid(xform(pouch,{pos:[s*S(.17),S(.98),S(.04)]}),'hips')}}
 if(look.scarf){const sc=loft([{p:[0,S(1.545),0],rx:S(.075),ry:S(.08)},{p:[0,S(1.5),S(.005)],rx:S(.08),ry:S(.085)}],{radial:14,rings:4,cap0:1,cap1:1,color:()=>C(look.scarf)});add(sc,[rig.seg('neck'),rig.seg('chest')],{});}
 if(look.pack){const pk=blobGeo(S(.15),S(.2),S(.09),{seg:12,noise:.04,low:C('#4a4034').map(c=>c*.6),high:C('#6a5a44')});rigid(xform(pk,{pos:[0,S(1.3),S(-.17)]}),'chest');const flap=blobGeo(S(.13),S(.05),S(.095),{seg:10,low:[.15,.1,.06],high:[.3,.2,.1]});rigid(xform(flap,{pos:[0,S(1.42),S(-.17)]}),'chest')}
 if(look.radio){const rd=blobGeo(S(.03),S(.05),S(.02),{seg:8,low:[.04,.04,.04],high:[.12,.12,.13]});rigid(xform(rd,{pos:[S(.12),S(1.4),S(.12)]}),'chest');const an=loft([{p:[S(.12),S(1.44),S(.12)],rx:S(.006)},{p:[S(.12),S(1.56),S(.12)],rx:S(.004)}],{radial:5,rings:2,cap0:1,cap1:1,color:()=>[.05,.05,.05]});bindRigid(an,rig.idx('chest'));parts.push(an)}
 if(look.lanyard){const ln=loft([{p:[S(-.05),S(1.53),S(.09)],rx:S(.006)},{p:[0,S(1.38),S(.125)],rx:S(.006)},{p:[S(.05),S(1.53),S(.09)],rx:S(.006)}],{radial:5,rings:6,cap0:1,cap1:1,color:()=>C('#2f6a8a')});bindRigid(ln,rig.idx('chest'));parts.push(ln);const badge=blobGeo(S(.03),S(.035),S(.005),{seg:8,low:[.7,.7,.7],high:[.95,.95,.95]});rigid(xform(badge,{pos:[0,S(1.36),S(.128)]}),'chest')}
 if(look.stetho){const tg=new THREE.TorusGeometry(S(.1),S(.007),6,18,Math.PI*1.4);paintColor(tg,[.06,.06,.08]);rigid(xform(tg,{pos:[0,S(1.45),S(.06)],rot:[Math.PI/2.2,0,Math.PI*.8]}),'chest')}
 if(look.clipboard){const cb=blobGeo(S(.09),S(.12),S(.008),{seg:6,low:C('#8a6a45').map(c=>c*.7),high:C('#a88556')});rigid(xform(cb,{pos:[arm.L[2][0]*1.0+S(.02),S(.92),S(.12)],rot:[.2,0,.1]}),'handL');const pp=blobGeo(S(.075),S(.1),S(.004),{seg:6,low:[.8,.8,.76],high:[.95,.95,.9]});rigid(xform(pp,{pos:[arm.L[2][0]+S(.02),S(.92),S(.128)],rot:[.2,0,.1]}),'handL')}
 if(look.bucket){const bk=lathe([[S(.07),0],[S(.09),S(.13)],[S(.085),S(.13)],[S(.065),S(.01)],[0,0]],{seg:12,color:()=>C('#8a8f94')});rigid(xform(bk,{pos:[arm.R[2][0]+S(.02),S(.62),S(.06)]}),'handR');const hd=new THREE.TorusGeometry(S(.08),S(.004),4,12,Math.PI);paintColor(hd,[.2,.2,.2]);rigid(xform(hd,{pos:[arm.R[2][0]+S(.02),S(.76),S(.06)],rot:[0,0,0]}),'handR')}
 if(look.camera){const cm=blobGeo(S(.055),S(.04),S(.035),{seg:8,low:[.04,.04,.04],high:[.14,.14,.15]});rigid(xform(cm,{pos:[0,S(1.28),S(.15)]}),'chest');const lens=lathe([[S(.022),0],[S(.022),S(.03)],[0,S(.03)]],{seg:10,color:()=>[.02,.02,.04]});rigid(xform(lens,{pos:[0,S(1.28),S(.17)],rot:[Math.PI/2,0,0]}),'chest')}
 rig.finish();
 const body=mergeGeometries(parts.map(g=>{g.deleteAttribute('uv');if(!g.attributes.color)paintColor(g,[1,1,1]);if(!g.attributes.skinIndex)bindRigid(g,0);return g}),false);
 body.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(body.attributes.position.count*2),2));
 const mesh=new THREE.SkinnedMesh(body,mats.cloth());mesh.name='body';mesh.add(rig.root);mesh.bind(rig.skeleton());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;mesh.geometry.computeBoundingSphere();
 // eyes
 const eg=mergeGeometries([(()=>{const g=new THREE.SphereGeometry(S(.011),8,6);g.deleteAttribute('uv');paintColor(g,[.96,.96,.95]);return g})(),(()=>{const g=new THREE.SphereGeometry(S(.0075),8,6);g.deleteAttribute('uv');paintColor(g,[.04,.03,.03]);return xform(g,{pos:[0,0,S(.006)]})})()].map(g=>{g.deleteAttribute&&g.deleteAttribute('uv');return g}),false);
 const eyeMat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.2});
 const eyes=[-1,1].map(s=>{const m=new THREE.Mesh(eg,eyeMat);m.name=s<0?'eyeL':'eyeR';m.position.set(s*S(.036)*HK,PIV+(S(1.69)-PIV)*HK,S(.083)*HK).sub(new THREE.Vector3(...P.head));m.scale.setScalar(HK);return m});
 rig.map.head.add(...eyes);
 const group=new THREE.Group();group.add(mesh);group.userData.height=S(1.86)+(look.hat==='wide'?S(.12):0);
 return {group,H};
}

function controller(root,look){
 const B=n=>root.getObjectByName(n);
 const b={hips:B('hips'),spine:B('spine'),chest:B('chest'),neck:B('neck'),head:B('head'),uL:B('uarmL'),uR:B('uarmR'),fL:B('farmL'),fR:B('farmR'),tL:B('thighL'),tR:B('thighR'),sL:B('shinL'),sR:B('shinR'),ftL:B('footL'),ftR:B('footR')};
 const eyes=[B('eyeL'),B('eyeR')];const baseY=b.hips.position.y;
 const st={t:Math.random()*20,phase:0,move:0,work:0,carry:0,photo:0,talk:0,blink:0,nb:2};
 return {state:st,update(dt,ctx={}){
  st.t+=dt;const T=st.t;st.move=damp(st.move,ctx.moving?1:0,7,dt);st.work=damp(st.work,ctx.pose==='work'?1:0,6,dt);st.carry=damp(st.carry,ctx.carrying?1:0,6,dt);st.photo=damp(st.photo,ctx.pose==='photo'?1:0,6,dt);st.talk=damp(st.talk,ctx.pose==='talk'?1:0,6,dt);
  const m=st.move,w=st.work,pose=Math.max(st.carry,st.photo);
  st.phase+=dt*(6.2+(ctx.run?2:0))*(m>.05?1:0)*(ctx.speedScale??1);const p=st.phase,s=Math.sin(p),c=Math.cos(p);
  const amp=.62*m*(1-w*.8);
  b.tL.rotation.x=-s*amp;b.tR.rotation.x=s*amp;
  b.sL.rotation.x=Math.max(0,-c)*.95*m+w*.05;b.sR.rotation.x=Math.max(0,c)*.95*m+w*.05;
  b.ftL.rotation.x=-(b.tL.rotation.x+b.sL.rotation.x)*.5;b.ftR.rotation.x=-(b.tR.rotation.x+b.sR.rotation.x)*.5;
  b.hips.position.y=baseY-Math.abs(Math.sin(p))*.03*m-w*.12;b.hips.rotation.y=s*.12*m;b.hips.rotation.z=s*.03*m;
  b.spine.rotation.y=-s*.14*m;b.spine.rotation.x=.04*m+w*.5;b.chest.rotation.x=w*.2;
  const swing=s*.55*m*(1-pose);
  const poseL=-1.05*st.carry-1.35*st.photo-1.0*w+Math.sin(T*3.4)*.18*w+Math.sin(T*2.1)*.35*st.talk-.5*st.talk;
  const poseR=-1.05*st.carry-1.35*st.photo-1.0*w-Math.sin(T*3.4)*.18*w+Math.sin(T*2.6+1)*.3*st.talk-.5*st.talk;
  b.uL.rotation.x=swing+poseL;b.uR.rotation.x=-swing+poseR;
  b.fL.rotation.x=-.12*m-1.0*st.carry-1.1*st.photo-.5*w-.7*st.talk;b.fR.rotation.x=-.12*m-1.0*st.carry-1.2*st.photo-.5*w-.4*st.talk;
  b.uL.rotation.z=.08+.12*st.talk;b.uR.rotation.z=-.08-.12*st.talk;
  // breathing and idle life
  const br=Math.sin(T*1.9)*.008;b.chest.scale.set(1+br,1+br*1.4,1+br);
  const look2=Math.sin(T*.35)*.35*(1-m);b.head.rotation.y=look2+Math.sin(p*.5)*-.05*m;b.head.rotation.x=Math.sin(T*.5)*.04-.12*w+(-.25*st.photo);b.neck.rotation.y=look2*.4;
  b.hips.rotation.x=Math.sin(T*.4)*.01*(1-m);
  st.nb-=dt;if(st.nb<=0){st.blink=.13;st.nb=2+Math.random()*4}st.blink=Math.max(0,st.blink-dt);const bs=st.blink>0?.1:1;for(const e of eyes)if(e)e.scale.y=damp(e.scale.y,bs,40,dt);
 }};
}
export function makeHuman(look){
 const key=JSON.stringify(look);
 if(!cache.has(key))cache.set(key,build(look));
 const proto=cache.get(key);
 const group=SkeletonUtils.clone(proto.group);
 group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry?.attributes?.position?.count||0;if(p<180)o.castShadow=false});
 group.userData.rig=stopMotionRig(controller(group,look));group.userData.height=proto.group.userData.height;group.userData.isHuman=true;
 return group;
}
export const makeRole=role=>makeHuman(LOOKS[role]||LOOKS.keeper);
export const makeVisitor=i=>makeHuman(visitorLook(i));

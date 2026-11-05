import * as THREE from 'three';
import { stopMotionRig } from './clay.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loft, blobGeo, lathe, xform, paintColor, Rig, autoSkin, bindRigid, V } from './meshkit.js';
import { bodyMaterial, limbMaterial, eyeMaterial } from './materials.js';
import { smooth } from './noise.js';
import { SPECS } from './creature-specs.js';

// Lofted, skinned, rigged animals. One generator per body plan (quadruped, bird, turtle); every species is data.
const rgb=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b]};  // vertex colours are linear
const lerpC=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const dirOf=(up)=>V(0,up,1).normalize();
const cache=new Map();

function eyeGeo(r,iris){
 // claymation eyes: a big pressed-in white ball, a coloured iris, a dark pupil and a wet glint
 r*=1.45;const parts=[];const ball=new THREE.SphereGeometry(r,16,12);paintColor(ball,[.93,.91,.86]);parts.push(ball);
 const ir=new THREE.SphereGeometry(r*.58,14,12);paintColor(ir,iris);parts.push(xform(ir,{pos:[0,0,r*.5],scale:[1,1,.6]}));
 const pu=new THREE.SphereGeometry(r*.34,12,10);paintColor(pu,[.03,.025,.03]);parts.push(xform(pu,{pos:[0,0,r*.74],scale:[1,1.1,.55]}));
 const hl=new THREE.SphereGeometry(r*.14,8,6);paintColor(hl,[1,1,1]);parts.push(xform(hl,{pos:[r*.24,r*.26,r*.92]}));
 return mergeGeometries(parts.map(g=>{g.deleteAttribute('uv');return g}),false);
}

// ---------------------------------------------------------------------------------------------------------------------
function buildQuad(kind,spec,opts){
 const k=spec.k*(opts.young?1:1);const S=v=>v*k;
 const L=S(spec.L),bh=S(spec.bh)*1.1,bw=S(spec.bw)*1.08,legH=S(spec.legH),legR=S(spec.legR)*1.3;
 const hind=spec.hind||1,arch=spec.arch||0;
 const footH=Math.max(legR*.5,.012*k);
 const yM=legH+bh*.55;                                      // body centre height
 const yR=yM+(hind-1)*legH*.9;                             // rump height (hind legs longer => rump higher)
 const yC=yM-arch*bh*.5;                                   // chest height (crouched when arched)
 const neck=spec.neck,head=spec.head;const nLen=S(neck.len),nR=S(neck.r)*1.15,hLen=S(head.len)*1.1,hR=S(head.r)*1.22;
 const nd=dirOf(neck.up);const base=V(0,yC+bh*.35,L*.5);
 const n1=base.clone().addScaledVector(nd,nLen*.5),n2=base.clone().addScaledVector(nd,nLen);
 const hAng=Math.atan(neck.up)-(.55+(neck.up>1?.2:0));const hd=V(0,Math.sin(hAng),Math.cos(hAng)).normalize();
 const hs=[0,.18,.5,.78,1].map(t=>n2.clone().addScaledVector(hd,hLen*t));
 const sn=head.snout;
 const stations=[
  {p:[0,yR+bh*.02,-L*.5],rx:bw*.56,ry:bh*.72},
  {p:[0,yR+bh*.04,-L*.32],rx:bw*1.0,ry:bh*1.0},
  {p:[0,yM,-L*.02],rx:bw*.94,ry:bh*.9},
  {p:[0,yC+bh*.05,L*.3],rx:bw*1.0,ry:bh*1.06},
  {p:base.toArray(),rx:nR*1.22,ry:nR*1.3},
  {p:n1.toArray(),rx:nR*1.0,ry:nR*1.08},
  {p:n2.toArray(),rx:nR*.86,ry:nR*.95},
  {p:hs[1].toArray(),rx:hR*.9,ry:hR*.98},
  {p:hs[2].toArray(),rx:hR*(.52+sn*.5),ry:hR*(.7+sn*.2)},
  {p:hs[3].toArray(),rx:hR*sn*.78,ry:hR*sn*.62},
  {p:hs[4].toArray(),rx:hR*sn*.55,ry:hR*sn*.42},
 ];
 const torso=loft(stations,{radial:14,rings:40,cap0:2,cap1:3,color:({top,t})=>{const a=.72+.28*smooth(.05,.6,top);const b=.9+.1*smooth(.1,.9,t);return [a*b,a*b,a*b]}});

 const rig=new Rig();
 const hipsP=[0,yR,-L*.32],midP=[0,yM,-L*.02],chestP=[0,yC+bh*.05,L*.3];
 rig.add('root',null,midP,hipsP);
 rig.add('hips','root',hipsP,[0,yR,-L*.5]);
 rig.add('chest','root',chestP,base.toArray());
 rig.add('neck1','chest',base.toArray(),n1.toArray());
 rig.add('neck2','neck1',n1.toArray(),n2.toArray());
 rig.add('head','neck2',n2.toArray(),hs[4].toArray());
 const limbParts=[];

 // legs
 const mkLeg=(id,front,side)=>{
  const x=side*bw*(front?.72:.74),zS=front?L*.31:-L*.34;
  const top=front?yC+bh*.1:yR+bh*.05;const ground=0;const reach=top-ground;
  const toeY=footH;
  const pts=spec.pillar?[   // elephants and rhinos stand on straight columns, not bent dog legs
   [x,top,zS],[x,top-reach*.45,zS+(front?0:L*.01)],[x,reach*.22+footH,zS],[x,toeY,zS+legR*.15]
  ]:front?[
   [x,top,zS],[x,top-reach*.42,zS-L*.012],[x,reach*.2+footH,zS+L*.008],[x,toeY,zS+legR*.9]
  ]:[
   [x,top,zS],[x,top-reach*.42,zS+reach*.16*Math.min(hind,1.4)],[x,reach*.24+footH,zS-reach*.1],[x,toeY,zS+legR*.55]
  ];
  const parent=front?'chest':'hips';
  rig.add('up'+id,parent,pts[0],pts[1]);rig.add('lo'+id,'up'+id,pts[1],pts[2]);rig.add('ft'+id,'lo'+id,pts[2],pts[3]);
  const r0=spec.pillar?legR*1.32:legR*(front?1.25:1.5),r1=legR*(spec.pillar?1.04:.85),r2=legR*(spec.pillar?.96:.62),r3=legR*(spec.pillar?1.04:.72);
  const stn=[{p:pts[0],rx:r0,ry:r0*1.05},{p:pts[1],rx:r1,ry:r1},{p:pts[2],rx:r2,ry:r2},{p:pts[3],rx:r3,ry:r3*.85}];
  const limbC=rgb(spec.limbs),lowC=rgb(spec.lower||spec.limbs);
  const g=loft(stn,{radial:spec.pillar?14:8,rings:spec.pillar?16:12,cap0:1,cap1:2,color:({t})=>lerpC(limbC,lowC,smooth(.35,.9,t))});
  const seg=[rig.seg('up'+id),rig.seg('lo'+id),rig.seg('ft'+id),rig.seg(front?'chest':'hips')];
  autoSkin(g,seg,{pow:3,top:3});limbParts.push(g);
  // foot
  let f;const toe=V(...pts[3]);
  if(spec.foot==='hoof'){f=lathe([[0,0],[legR*.8,0],[legR*.95,footH*1.1],[legR*.7,footH*2.6],[0,footH*2.6]],{seg:10,color:()=>rgb('#26201a')});f=xform(f,{pos:[x,0,toe.z-legR*.1]})}
  else if(spec.foot==='pad'){
   // a round clay foot in the leg's own colour, with three pale toenails at the front
   f=blobGeo(legR*1.14,footH*1.25,legR*1.2,{seg:14,low:lowC.map(c=>c*.82),high:lowC});f=xform(f,{pos:[x,footH*.72,toe.z]});
   for(const n of [-1,0,1]){const nail=blobGeo(legR*.2,footH*.55,legR*.14,{seg:8,low:rgb('#cfc6b2'),high:rgb('#efe8d8')});const nm=xform(nail,{pos:[x+n*legR*.48,footH*.55,toe.z+legR*1.08-Math.abs(n)*legR*.18]});bindRigid(nm,rig.idx('ft'+id));limbParts.push(nm)}
  }
  else if(spec.foot==='webbed'){f=blobGeo(legR*1.3,footH*.7,legR*2.2,{seg:10,low:lowC.map(c=>c*.6),high:lowC});f=xform(f,{pos:[x,footH*.7,toe.z+legR*.7]})}
  else {f=blobGeo(legR*.95,footH*.9,legR*1.5,{seg:10,low:lowC.map(c=>c*.7),high:lowC});f=xform(f,{pos:[x,footH*.8,toe.z+legR*.4]})}
  bindRigid(f,rig.idx('ft'+id));limbParts.push(f);
 };
 mkLeg('FL',true,-1);mkLeg('FR',true,1);mkLeg('HL',false,-1);mkLeg('HR',false,1);

 // tail
 const tl=spec.tail,tLen=S(tl.len),tR=S(tl.r);
 if(tl.type!=='none'&&tLen>0){
  const t0=[0,yR+bh*.35,-L*.5+.01];let p1,p2,p3;
  if(tl.type==='curl'){p1=[0,yR+bh*.7,-L*.5-tLen*.25];p2=[0,yR+bh*.7+tLen*.55,-L*.5-tLen*.2];p3=[0,yR+bh*.7+tLen*.8,-L*.5+tLen*.15]}
  else if(tl.type==='short'||tl.type==='puff'){p1=[0,yR+bh*.35,-L*.5-tLen*.4];p2=[0,yR+bh*.3,-L*.5-tLen*.75];p3=[0,yR+bh*.25,-L*.5-tLen]}
  else if(tl.type==='bushy'||tl.type==='ringed'||tl.type==='paddle'||tl.type==='bare'){p1=[0,yR+bh*.15,-L*.5-tLen*.35];p2=[0,yR-bh*.3,-L*.5-tLen*.7];p3=[0,yR-bh*.75,-L*.5-tLen*.92]}
  else {p1=[0,yR+bh*.1,-L*.5-tLen*.3];p2=[0,yR-bh*.3,-L*.5-tLen*.65];p3=[0,yR-bh*.9,-L*.5-tLen*.95]}
  const tp=[t0,p1,p2,p3];
  rig.add('tail1','hips',t0,p1);rig.add('tail2','tail1',p1,p2);rig.add('tail3','tail2',p2,p3);
  const tc=rgb(tl.color),tipc=rgb(tl.tip||tl.color);
  let stn;
  if(tl.type==='paddle')stn=tp.map((p,i)=>({p,rx:tR*(.5+i*.5),ry:tR*.16}));
  else if(tl.type==='bushy')stn=tp.map((p,i)=>({p,rx:tR*[.5,1,1,.45][i],ry:tR*[.5,1,1,.45][i]}));
  else if(tl.type==='ringed'||tl.type==='taper')stn=tp.map((p,i)=>({p,rx:tR*[.9,.8,.7,.55][i]}));
  else if(tl.type==='curl')stn=tp.map((p,i)=>({p,rx:tR*[.5,.95,1,.6][i]}));
  else if(tl.type==='short'||tl.type==='puff')stn=tp.map((p,i)=>({p,rx:tR*[.7,1,.9,.5][i]}));
  else stn=tp.map((p,i)=>({p,rx:tR*[1,.8,.7,.7][i]}));
  const g=loft(stn,{radial:10,rings:16,cap0:2,cap1:3,color:({t})=>{if(tl.type==='ringed')return (Math.floor(t*7)%2)?[.12,.12,.11]:tc;if(tl.type==='bare')return tc;return lerpC(tc,tipc,smooth(.72,1,t))}});
  autoSkin(g,[rig.seg('tail1'),rig.seg('tail2'),rig.seg('tail3'),rig.seg('hips')],{pow:3,top:3});limbParts.push(g);
  if(tl.type==='tufted'){const tuft=blobGeo(tR*2,tLen*.1,tR*2,{seg:10,low:tipc.map(c=>c*.6),high:tipc});const t=xform(tuft,{pos:[0,p3[1]-tLen*.04,p3[2]-tLen*.02]});autoSkin(t,[rig.seg('tail3')],{});limbParts.push(t)}
 }

 // head details: ears, nose, eyes, horns, mane, trunk, tusks
 const hc=n2.clone().addScaledVector(hd,hLen*.22);
 const head0=rig.idx('head');
 const noseTip=hs[4];
 const noseG=blobGeo(hR*sn*.34,hR*sn*.26,hR*sn*.3,{seg:10,low:rgb(spec.nose).map(c=>c*.7),high:rgb(spec.nose)});const nG=xform(noseG,{pos:[0,noseTip.y+hR*sn*.06,noseTip.z+hR*sn*.08]});bindRigid(nG,head0);limbParts.push(nG);
 // ears
 const ear=spec.ears,eS=S(ear.size)*1.7,earC=ear.color?rgb(ear.color):rgb(spec.limbs);
 for(const s of [-1,1]){
  const bp=[s*hR*.6,hc.y+hR*.74,hc.z-hR*.12];
  const huge=ear.type==='huge';if(huge){bp[0]=s*hR*.78;bp[1]=hc.y+hR*.55;bp[2]=hc.z-hR*.28}   // elephant ears hang from the side of the head
  const id=s<0?'earL':'earR';let tipv,width,len;
  switch(ear.type){
   case 'long':len=eS*1.3;tipv=[s*eS*.35,bp[1]+len,bp[2]-eS*.2];width=eS*.28;break;
   case 'tall':len=eS*1.2;tipv=[s*eS*.3,bp[1]+len,bp[2]+eS*.1];width=eS*.5;break;
   case 'oval':len=eS*1.2;tipv=[s*eS*1.2,bp[1]+len*.55,bp[2]-eS*.3];width=eS*.55;break;
   case 'point':len=eS*1.2;tipv=[s*eS*.35,bp[1]+len,bp[2]-eS*.15];width=eS*.42;break;
   case 'tuft':len=eS*1.2;tipv=[s*eS*.3,bp[1]+len,bp[2]-eS*.1];width=eS*.38;break;
   case 'huge':len=eS*.8;tipv=[s*(hR*.92+eS*.2),bp[1]-eS*.78,bp[2]-eS*.16];width=eS*.5;break;
   default:len=eS*.75;tipv=[s*eS*.5,bp[1]+len*.8,bp[2]-eS*.1];width=eS*.5;
  }
  const mid=[(bp[0]+tipv[0])/2,(bp[1]+tipv[1])/2,(bp[2]+tipv[2])/2];
  rig.add(id,'head',bp,tipv);
  const thick=huge?hR*.09:width*.16;
  const eg=loft(huge?[{p:bp,rx:width*.55,ry:thick*1.3},{p:[(bp[0]*2+tipv[0])/3,(bp[1]*2+tipv[1])/3,(bp[2]*2+tipv[2])/3-width*.18],rx:width*1.02,ry:thick*1.1},{p:[(bp[0]+tipv[0]*2)/3,(bp[1]+tipv[1]*2)/3,(bp[2]+tipv[2]*2)/3-width*.1],rx:width*.9,ry:thick},{p:tipv,rx:width*.34,ry:thick*.8}]:[{p:bp,rx:width*.9,ry:thick},{p:mid,rx:width,ry:thick*.9},{p:tipv,rx:width*.28,ry:thick*.5}],{radial:huge?14:10,rings:huge?14:10,cap0:huge?2:1,cap1:3,upRef:huge?V(s,0,0):V(1,0,0),color:({t})=>lerpC(earC,earC.map(c=>c*.8),t)});
  autoSkin(eg,[rig.seg(id),rig.seg('head')],{top:2,pow:2});limbParts.push(eg);
  if(ear.type==='tuft'){const tf=xform(new THREE.ConeGeometry(width*.22,len*.5,6),{pos:[tipv[0],tipv[1]+len*.15,tipv[2]]});paintColor(tf,[.08,.07,.06]);bindRigid(tf,rig.idx(id));limbParts.push(tf)}
 }
 // mane (male lions) and stiff mane (zebra)
 if(spec.mane&&(opts.sex==='male'||spec.maneStyle==='short')&&!opts.young){
  const mc=rgb(spec.mane);const mg=[];
  if(spec.maneStyle==='short'){for(let i=0;i<16;i++){const t=i/15;const p=base.clone().lerp(hc,t*.9);mg.push(xform(new THREE.ConeGeometry(nR*.28,nR*1.5,5),{pos:[0,p.y+nR*.9,p.z-nR*.2],rot:[-.25,0,0]}))}mg.forEach(g=>paintColor(g,mc));}
  else{
   // layered clumps wrapped around the neck and shoulders, darker toward the tips and the chest
   // layered clumps wrapped around the neck behind the face, darker toward the chest
   for(let ring=0;ring<3;ring++){const t=ring/2;const c=base.clone().lerp(n2,.15+t*.75);const rr=hR*(.78+(1-t)*.28);const cnt=8+ring*2;
    for(let i=0;i<cnt;i++){const a=i/cnt*Math.PI*2+ring*.5;const g=blobGeo(hR*(.42+(1-t)*.12),hR*(.4+(1-t)*.14),hR*.52,{seg:10,noise:.3,seed:i+ring*7,low:mc.map(x=>x*(.5+ring*.05)),high:mc.map(x=>x*(.95+ring*.05))});
     mg.push(xform(g,{pos:[Math.sin(a)*rr,c.y+Math.cos(a)*rr*.85-hR*.08,c.z-hR*.28*(1-t)],rot:[Math.cos(a)*.4,0,-Math.sin(a)*.3]}))}}
   for(let i=0;i<14;i++){const a=i/14*Math.PI*2+.2;const rr=hR*1.12;const g=new THREE.ConeGeometry(hR*.17,hR*.8,5);paintColor(g,mc.map(x=>x*(.55+(i%3)*.15)));mg.push(xform(g,{pos:[Math.sin(a)*rr,base.y+hR*.1+Math.cos(a)*rr*.82,base.z-hR*.55],rot:[-Math.cos(a)*1.1-.7,0,Math.sin(a)*1.1]}))}
  }
  const m=mergeGeometries(mg.map(g=>{g=g.index?g:g;if(!g.attributes.color)paintColor(g,mc);g.deleteAttribute('uv');return g}),false);
  autoSkin(m,[rig.seg('neck1'),rig.seg('neck2'),rig.seg('head'),rig.seg('chest')],{pow:2,top:3});limbParts.push(m);
 }
 // elephant trunk and tusks
 if(spec.trunk){
  const tb=hs[4].clone();const tl0=S(1.5);const pts=[];
  for(let i=0;i<=5;i++){const t=i/5;pts.push([0,tb.y-hR*.2-tl0*Math.pow(t,1.1)*.55+Math.sin(t*3)*0*tl0,tb.z-hR*.05+tl0*t*.2+Math.sin(t*2.2)*tl0*.12])}
  for(let i=0;i<5;i++)rig.add('trunk'+(i+1),i===0?'head':'trunk'+i,pts[i],pts[i+1]);
  const tg=loft(pts.map((p,i)=>({p,rx:hR*(.3-.2*(i/5)),ry:hR*(.3-.2*(i/5))*1.05})),{radial:12,rings:28,cap0:2,cap1:3,color:({t})=>lerpC(rgb(spec.limbs),rgb(spec.coat.dark),smooth(.6,1,t)*.45)});
  autoSkin(tg,[rig.seg('trunk1'),rig.seg('trunk2'),rig.seg('trunk3'),rig.seg('trunk4'),rig.seg('trunk5'),rig.seg('head')],{pow:2.5,top:3});limbParts.push(tg);
 }
 if(spec.tusks&&!opts.young)for(const s of [-1,1]){const a=[s*hR*.38,hs[3].y-hR*.35,hs[3].z-hR*.2],b=[s*hR*.52,hs[3].y-hR*.75,hs[3].z+hR*.55],c=[s*hR*.5,hs[3].y-hR*.55,hs[3].z+hR*1.15];const tg=loft([{p:a,rx:hR*.11},{p:b,rx:hR*.085},{p:c,rx:hR*.02}],{radial:8,rings:12,cap0:1,cap1:2,color:()=>rgb('#efe6cf')});bindRigid(tg,head0);limbParts.push(tg)}
 if(spec.horn){const hg=loft([{p:[0,hs[3].y+hR*.15,hs[3].z-hR*.05],rx:hR*.2},{p:[0,hs[3].y+hR*.5,hs[3].z+hR*.1],rx:hR*.12},{p:[0,hs[3].y+hR*.95,hs[3].z+hR*.2],rx:hR*.02}],{radial:10,rings:12,cap0:2,cap1:2,color:({t})=>lerpC(rgb('#4b463e'),rgb('#8a8272'),t*.6)});bindRigid(hg,head0);limbParts.push(hg)}
 if(spec.horns==='ossicones')for(const s of [-1,1]){const top=hc.y+hR*.95;const g1=loft([{p:[s*hR*.35,top-hR*.1,hc.z-hR*.1],rx:hR*.12},{p:[s*hR*.3,top+hR*.8,hc.z-hR*.15],rx:hR*.1}],{radial:8,rings:6,cap0:1,cap1:1,color:()=>rgb('#dcc08a')});const k=blobGeo(hR*.16,hR*.16,hR*.16,{seg:8,low:[.18,.12,.08],high:[.3,.2,.12]});const g2=xform(k,{pos:[s*hR*.3,top+hR*.9,hc.z-hR*.15]});bindRigid(g1,head0);bindRigid(g2,head0);limbParts.push(g1,g2)}
 // eyes (separate meshes so they can blink)
 const eg=eyeGeo(Math.max(hR*.175,.009*k)*(spec.eyeScale||1),rgb(spec.eye));
 const eyeMat=eyeMaterial();eyeMat.userData.noClay=true;
 const eyeBase=hc.clone().addScaledVector(hd,hLen*.3);
 const eyeMeshes=[-1,1].map(s=>{const m=new THREE.Mesh(eg,eyeMat);m.name=s<0?'eyeL':'eyeR';m.position.set(s*hR*.66,eyeBase.y+hR*.28,eyeBase.z+hR*.12).sub(n2);m.rotation.y=s*.6;m.castShadow=false;return m});

 // assemble
 const torsoMat=bodyMaterial({back:spec.coat.back,belly:spec.coat.belly,dark:spec.coat.dark,marks:spec.coat.marks,face:spec.coat.face,muzzle:spec.coat.muzzle,accent:spec.coat.accent,seed:spec.coat.seed});
 const limbs=mergeGeometries(limbParts.map(g=>{g.deleteAttribute('uv');if(!g.attributes.skinIndex)bindRigid(g,0);return g}),false);
 autoSkinTorso(torso,rig,L,yR,yM,yC,base,n1,n2,hs[4]);
 for(const g of [torso,limbs])if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 const geo=mergeGeometries([torso,limbs],true);
 rig.finish();
 const mesh=new THREE.SkinnedMesh(geo,[torsoMat,limbMaterial()]);mesh.name='body';mesh.add(rig.root);mesh.bind(rig.skeleton());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 const group=new THREE.Group();group.add(mesh);mesh.geometry.computeBoundingSphere();mesh.frustumCulled=true;
 rig.map.head.add(...eyeMeshes);
 group.userData.kind=kind;
 return {group,height:Math.max(yR,yC+nd.y*nLen+hd.y*hLen+hR),length:L};
}
function autoSkinTorso(g,rig,L,yR,yM,yC,base,n1,n2,nose){
 autoSkin(g,[
  {idx:rig.idx('hips'),a:V(0,yR,-L*.5),b:V(0,yM,-L*.12)},
  {idx:rig.idx('root'),a:V(0,yM,-L*.12),b:V(0,yM,L*.12)},
  {idx:rig.idx('chest'),a:V(0,yM,L*.12),b:base},
  {idx:rig.idx('neck1'),a:base,b:n1},{idx:rig.idx('neck2'),a:n1,b:n2},{idx:rig.idx('head'),a:n2,b:nose},
 ],{pow:2.5,top:2});
}

// ---------------------------------------------------------------------------------------------------------------------
function buildBird(kind,spec){
 const k=spec.k,S=v=>v*k;
 const L=S(spec.body.L),rx=S(spec.body.rx),ry=S(spec.body.ry),legH=S(spec.legH);
 const phi=spec.upright*0.95;const yb=legH+ry*.85+Math.sin(phi)*L*.2;
 const tailB=V(0,yb-Math.sin(phi)*L*.5,-Math.cos(phi)*L*.5),chest=V(0,yb+Math.sin(phi)*L*.5,Math.cos(phi)*L*.5);
 const mid=tailB.clone().lerp(chest,.5);
 const nLen=S(spec.neck.len),nR=S(spec.neck.r),hR=S(spec.head.r),hLen=S(spec.head.len);
 const np=[];const n0=chest.clone().add(V(0,ry*.3,0));np.push(n0);
 if(spec.neck.s){np.push(n0.clone().add(V(0,nLen*.42,nLen*.28)),n0.clone().add(V(0,nLen*.72,nLen*.02)),n0.clone().add(V(0,nLen*.95,nLen*.14)))}
 else{const d=dirOf(spec.neck.up);np.push(n0.clone().addScaledVector(d,nLen*.5),n0.clone().addScaledVector(d,nLen))}
 const nt=np[np.length-1];const hp=[nt.clone().add(V(0,hR*.35,hR*.5)),nt.clone().add(V(0,hR*.25,hR*1.2+hLen*.5))];
 const stations=[
  {p:tailB.toArray(),rx:rx*.3,ry:ry*.38},{p:tailB.clone().lerp(chest,.28).toArray(),rx:rx*.88,ry:ry*.9},{p:mid.toArray(),rx:rx,ry:ry},{p:chest.toArray(),rx:rx*.85,ry:ry*.9},
  ...np.map((p,i)=>({p:p.toArray(),rx:nR*(1.5-i*.18),ry:nR*(1.5-i*.18)})),
  {p:hp[0].toArray(),rx:hR*.95,ry:hR},{p:hp[1].toArray(),rx:hR*.6,ry:hR*.62},
 ];
 const torso=loft(stations,{radial:12,rings:34,cap0:2,cap1:2,color:({top})=>{const a=.78+.22*smooth(.05,.6,top);return [a,a,a]}});
 const rig=new Rig();
 rig.add('root',null,mid.toArray(),tailB.toArray());
 rig.add('chest','root',chest.toArray(),n0.toArray());
 for(let i=0;i<np.length;i++){const nm='neck'+(i+1);rig.add(nm,i===0?'chest':'neck'+i,np[i].toArray(),(np[i+1]||hp[0]).toArray())}
 rig.add('head','neck'+np.length,hp[0].toArray(),hp[1].toArray());
 const limbs=[];const cw=rgb(spec.wingColor||spec.coat.back),legC=rgb(spec.leg);
 // legs
 for(const s of [-1,1]){
  const id=s<0?'L':'R';const hip=[s*rx*.45,yb-ry*.4,0.02*L];const knee=[s*rx*.45,legH*.55,L*.02+(spec.neck.s?-.02*k:.01*k)];const toe=[s*rx*.45,S(.004),L*.06];
  rig.add('up'+id,'root',hip,knee);rig.add('lo'+id,'up'+id,knee,[s*rx*.45,legH*.1,L*.04]);rig.add('ft'+id,'lo'+id,[s*rx*.45,legH*.1,L*.04],toe);
  const lr=Math.max(S(.006),legH*.03);
  const g=loft([{p:hip,rx:lr*1.6},{p:knee,rx:lr},{p:[s*rx*.45,legH*.1,L*.04],rx:lr*.85}],{radial:7,rings:12,cap0:1,cap1:1,color:()=>legC});autoSkin(g,[rig.seg('up'+id),rig.seg('lo'+id),rig.seg('ft'+id),rig.seg('root')],{pow:3,top:3});limbs.push(g);
  for(let i=-1;i<=1;i++){const tg=loft([{p:[s*rx*.45,legH*.1,L*.04],rx:lr*.6},{p:[s*rx*.45+i*lr*1.4,S(.006),L*.04+lr*4.5],rx:lr*.45}],{radial:5,rings:3,cap0:1,cap1:1,color:()=>legC});bindRigid(tg,rig.idx('ft'+id));limbs.push(tg)}
 }
 // wings: folded along the body, rotated outward by the shoulder bone when flapping
 const wl=S(spec.wing.len),ch=S(spec.wing.chord);
 for(const s of [-1,1]){
  const id=s<0?'wingL':'wingR';const sh=[s*rx*.98,yb+ry*.35,L*.2],el=[s*rx*1.04,yb+ry*.18,-L*.15],tipP=[s*rx*1.02,yb+ry*.05,-L*.15-wl*.55];
  rig.add(id,'root',sh,el);rig.add(id+'2',id,el,tipP);
  const wg=loft([{p:sh,rx:ch*.07,ry:ch*.55},{p:el,rx:ch*.06,ry:ch*.75},{p:tipP,rx:ch*.03,ry:ch*.25}],{radial:8,rings:14,cap0:1,cap1:3,upRef:V(0,1,0),color:({t})=>{const c=lerpC(rgb(spec.coat.back),cw,smooth(.1,.6,t));return spec.wing.tipDark?lerpC(c,[.08,.08,.08],smooth(.72,.95,t)):lerpC(c,c.map(x=>x*.78),smooth(.5,.95,t)*.7)}});
  autoSkin(wg,[rig.seg(id),rig.seg(id+'2'),rig.seg('root')],{pow:3,top:3});limbs.push(wg);
 }
 // tail fan
 const tl=S(spec.tail.len),tw=S(spec.tail.w);
 rig.add('tail','root',tailB.toArray(),tailB.clone().add(V(0,-tl*.15,-tl)).toArray());
 const tg=loft([{p:tailB.clone().add(V(0,ry*.1,0)).toArray(),rx:tw*.5,ry:ry*.1},{p:tailB.clone().add(V(0,-tl*.1,-tl*.5)).toArray(),rx:tw,ry:ry*.06},{p:tailB.clone().add(V(0,-tl*.22,-tl)).toArray(),rx:tw*.85,ry:ry*.04}],{radial:6,rings:10,cap0:1,cap1:2,color:({t})=>lerpC(rgb(spec.coat.back),rgb(spec.coat.dark),t*.55)});
 autoSkin(tg,[rig.seg('tail'),rig.seg('root')],{top:2});limbs.push(tg);
 // beak
 const bk=spec.beak,bl=S(bk.len),br=S(bk.r);const bs=hp[1].clone().add(V(0,0,hR*.35));const bc=rgb(bk.color);
 let bpts;
 if(bk.type==='bent')bpts=[bs,bs.clone().add(V(0,-bl*.05,bl*.55)),bs.clone().add(V(0,-bl*.5,bl*.85)),bs.clone().add(V(0,-bl*.85,bl*.9))];
 else if(bk.type==='hook'||bk.type==='curve')bpts=[bs,bs.clone().add(V(0,-bl*.2,bl*.6)),bs.clone().add(V(0,-bl*.6,bl*.95))];
 else bpts=[bs,bs.clone().add(V(0,-bl*.05,bl*.6)),bs.clone().add(V(0,-bl*.1,bl))];
 const flat=bk.type==='flat';
 const bg=loft(bpts.map((p,i,a)=>({p:p.toArray(),rx:br*(flat?1.6:1)*(1-i/(a.length)*.75),ry:br*(flat?.38:1)*(1-i/(a.length)*.75)})),{radial:8,rings:10,cap0:1,cap1:2,color:({t})=>bk.tipColor&&t>.7?rgb(bk.tipColor):bc});bindRigid(bg,rig.idx('head'));limbs.push(bg);
 if(spec.crest){const cc=rgb(spec.crest);const crest=loft([{p:hp[0].clone().add(V(0,hR*.5,-hR*.1)).toArray(),rx:hR*.45,ry:hR*.2},{p:hp[0].clone().add(V(0,hR*1.5,-hR*.7)).toArray(),rx:hR*.3,ry:hR*.12},{p:hp[0].clone().add(V(0,hR*1.9,-hR*1.6)).toArray(),rx:hR*.06,ry:hR*.05}],{radial:6,rings:8,cap0:1,cap1:2,upRef:V(1,0,0),color:()=>cc});bindRigid(crest,rig.idx('head'));limbs.push(crest)}
 if(spec.cap){const cap=blobGeo(hR*.78,hR*.35,hR*.9,{seg:10,low:rgb(spec.cap).map(c=>c*.6),high:rgb(spec.cap)});const cg=xform(cap,{pos:[0,hp[0].y+hR*.55,hp[0].z+hR*.1]});bindRigid(cg,rig.idx('head'));limbs.push(cg)}
 if(spec.coat.face==='disc'){const disc=blobGeo(hR*1.05,hR*1.0,hR*.35,{seg:12,low:[.7,.62,.5],high:[.95,.88,.76]});const dg=xform(disc,{pos:[0,hp[0].y+hR*.05,hp[0].z+hR*.55]});bindRigid(dg,rig.idx('head'));limbs.push(dg)}
 const eg=eyeGeo(Math.max(hR*.2,.008*k),rgb(spec.eye));const eyeMat=eyeMaterial();eyeMat.userData.noClay=true;
 const eyeMeshes=[-1,1].map(s=>{const m=new THREE.Mesh(eg,eyeMat);m.name=s<0?'eyeL':'eyeR';m.position.set(s*hR*(spec.coat.face==='disc'?.5:.78),hp[0].y+hR*(spec.coat.face==='disc'?.12:.2),hp[0].z+hR*(spec.coat.face==='disc'?.98:.5)).sub(hp[0]);m.rotation.y=s*(spec.coat.face==='disc'?.35:.9);if(spec.coat.face==='disc')m.scale.setScalar(1.5);return m});
 const mat=bodyMaterial({back:spec.coat.back,belly:spec.coat.belly,dark:spec.coat.dark,marks:spec.coat.marks,face:spec.coat.face,muzzle:spec.coat.muzzle,accent:spec.coat.accent,seed:spec.coat.seed});
 autoSkin(torso,[{idx:rig.idx('root'),a:tailB,b:chest},...np.map((p,i)=>({...rig.seg('neck'+(i+1))})),rig.seg('head')],{pow:2.5,top:2});
 const limbG=mergeGeometries(limbs.map(g=>{g.deleteAttribute('uv');if(!g.attributes.skinIndex)bindRigid(g,0);return g}),false);
 for(const g of [torso,limbG])if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 const geo=mergeGeometries([torso,limbG],true);rig.finish();
 const mesh=new THREE.SkinnedMesh(geo,[mat,limbMaterial()]);mesh.name='body';mesh.add(rig.root);mesh.bind(rig.skeleton());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 rig.map.head.add(...eyeMeshes);
 const group=new THREE.Group();group.add(mesh);
 return {group,height:nt.y+hR*2,length:L};
}

// ---------------------------------------------------------------------------------------------------------------------
function buildTurtle(kind,spec){
 const k=spec.k,S=v=>v*k;const L=S(spec.L),w=S(spec.w),h=S(spec.h),legR=S(spec.legR);
 const rig=new Rig();rig.add('root',null,[0,h*.6,0],[0,h*.6,L*.3]);
 rig.add('head1','root',[0,h*.55,L*.45],[0,h*.55,L*.62]);rig.add('head2','head1',[0,h*.55,L*.62],[0,h*.5,L*.8]);
 const legs=[['FL',-1,1],['FR',1,1],['HL',-1,-1],['HR',1,-1]];
 const parts=[];
 const shell=blobGeo(w,h,L*.52,{seg:20,noise:.06,seed:4,low:[.55,.55,.5],high:[1,1,1],squash:.85});parts.push(xform(shell,{pos:[0,h*.55,0]}));
 const plast=blobGeo(w*.92,h*.3,L*.48,{seg:14,low:[.8,.7,.5],high:[.9,.8,.6]});parts.push(xform(plast,{pos:[0,h*.18,0]}));
 const skin=rgb('#8a8a52'),skin2=rgb('#a39a62');
 const hg=loft([{p:[0,h*.55,L*.4],rx:legR*1.3},{p:[0,h*.55,L*.62],rx:legR*1.1},{p:[0,h*.5,L*.8],rx:legR*1.35}],{radial:10,rings:12,cap0:1,cap1:4,color:({t})=>lerpC(skin,skin2,t)});autoSkin(hg,[rig.seg('head1'),rig.seg('head2'),rig.seg('root')],{top:2});
 const limbs=[hg];
 for(const [id,sx,sz] of legs){const base=[sx*w*.85,h*.35,sz*L*.3],foot=[sx*w*1.25,legR*.6,sz*L*.38];rig.add('leg'+id,'root',base,foot);
  const lg=loft([{p:base,rx:legR*1.5},{p:foot,rx:legR*1.1}],{radial:8,rings:6,cap0:1,cap1:3,color:()=>skin});autoSkin(lg,[rig.seg('leg'+id),rig.seg('root')],{top:2});limbs.push(lg)}
 const tail=loft([{p:[0,h*.35,-L*.45],rx:legR*.8},{p:[0,h*.28,-L*.62],rx:legR*.3}],{radial:6,rings:4,cap0:1,cap1:2,color:()=>skin});autoSkin(tail,[rig.seg('root')],{top:1});limbs.push(tail);
 const eg=eyeGeo(Math.max(S(.012),.006),rgb('#15110d'));const eyeMat=eyeMaterial();eyeMat.userData.noClay=true;
 const eyes=[-1,1].map(s=>{const m=new THREE.Mesh(eg,eyeMat);m.name=s<0?'eyeL':'eyeR';m.position.set(s*legR*1.05,h*.6,L*.74).sub(new THREE.Vector3(0,h*.55,L*.62));return m});
 const shellG=mergeGeometries(parts.map(g=>{autoSkin(g,[rig.seg('root')],{top:1});return g}),false);
 const limbG=mergeGeometries(limbs.map(g=>{g.deleteAttribute('uv');return g}),false);
 for(const g of [shellG,limbG])if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 const geo=mergeGeometries([shellG,limbG],true);rig.finish();
 const mesh=new THREE.SkinnedMesh(geo,[bodyMaterial({back:spec.coat.back,belly:spec.coat.belly,dark:spec.coat.dark,marks:'plates',accent:spec.coat.accent,accentArea:'tip',seed:spec.coat.seed}),limbMaterial()]);
 mesh.name='body';mesh.add(rig.root);mesh.bind(rig.skeleton());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 rig.map.head2.add(...eyes);const group=new THREE.Group();group.add(mesh);
 return {group,height:h*1.6,length:L};
}

// ---------------------------------------------------------------------------------------------------------------------
// Animation controllers: procedural gaits layered with breathing, head/ear/tail life and pose blends.
const damp=(cur,target,rate,dt)=>cur+(target-cur)*(1-Math.exp(-rate*dt));
function makeController(root,spec,info){
 const B=n=>root.getObjectByName(n);
 const eyes=[B('eyeL'),B('eyeR')].filter(Boolean);
 const st={phase:Math.random()*6,move:0,graze:0,sleep:0,alert:0,fly:0,swim:0,blink:0,nextBlink:1+Math.random()*3,t:Math.random()*10,tw:0};
 const type=spec.type;
 const rootBone=B('root');const baseY=rootBone.position.y;
 const g=spec.gait||{};
 if(type==='quad'){
  const legs=['FL','FR','HL','HR'].map(id=>({id,front:id[0]==='F',up:B('up'+id),lo:B('lo'+id),ft:B('ft'+id)}));
  const tails=['tail1','tail2','tail3'].map(B).filter(Boolean),ears=[B('earL'),B('earR')].filter(Boolean),trunk=[1,2,3,4,5].map(i=>B('trunk'+i)).filter(Boolean);
  const hips=B('hips'),chest=B('chest'),n1=B('neck1'),n2=B('neck2'),head=B('head');
  const drop=(spec.legH-spec.bh*.3)*spec.k;
  const off={walk:[0,.5,.25,.75],trot:[0,.5,.5,0],amble:[0,.5,.25,.75],waddle:[0,.5,.5,0],bound:[0,0,.18,.18]}[g.type]||[0,.5,.25,.75];
  return {
   state:st,height:info.height,
   update(dt,ctx={}){
    st.t+=dt;const moving=ctx.moving?1:0;
    st.move=damp(st.move,moving,6,dt);st.graze=damp(st.graze,ctx.anim==='forage'||ctx.anim==='feed'||ctx.anim==='drink'?1:0,4,dt);st.groom=damp(st.groom||0,ctx.anim==='groom'?1:0,4,dt);st.scratch=damp(st.scratch||0,ctx.anim==='scratch'?1:0,5,dt);st.play=damp(st.play||0,ctx.anim==='play'?1:0,4,dt);st.sleep=damp(st.sleep,ctx.sleeping?1:0,2.2,dt);st.alert=damp(st.alert,ctx.alert||ctx.fear>.45?1:0,5,dt);st.swim=damp(st.swim,ctx.swim?1:0,5,dt);
    const m=st.move,sl=st.sleep,aw=1-sl;
    st.phase+=dt*(g.freq||4)*(ctx.speedScale??1)*(.35+m*.65)*(m>.05?1:0);
    const ph=st.phase,T=st.t;
    const stride=(g.stride||.4)*m*aw*(1-st.swim*.3);
    const isBound=g.type==='bound';
    for(let i=0;i<4;i++){
     const L=legs[i];const p=ph+off[i];const s=Math.sin(p),c=Math.cos(p);const amp=stride*(L.front?1:(isBound?1.1:.95));
     const lift=Math.max(0,c);
     let ur=-s*amp,lr=lift*(L.front?1.15:1.0)*(g.stride||.4)*1.7*m*aw;
     // idle shifting weight so standing animals never freeze
     ur+=Math.sin(T*.5+i*1.7)*.012*(1-m);
     if(sl>0.01){const fold=L.front?[-1.15,2.1]:[-.8,1.75];ur=ur*(1-sl)+fold[0]*sl;lr=lr*(1-sl)+fold[1]*sl}
     if(st.scratch>.02&&L.id==='HL'){const sc=st.scratch;ur=ur*(1-sc)+(-.9)*sc;lr=lr*(1-sc)+(1.6+Math.sin(T*22)*.35)*sc}
     if(st.play>.02&&!L.front){ur+=Math.sin(T*7)*.12*st.play}
     L.up.rotation.x=ur;L.lo.rotation.x=lr;L.ft.rotation.x=-(ur+lr)*.65;
    }
    // body motion
    const bob=(g.bob||.015)*info.length*Math.abs(Math.sin(ph*(isBound?1:2)))*m*aw;
    rootBone.position.y=baseY+bob-drop*sl-st.swim*spec.bh*spec.k*.5;
    hips.rotation.y=Math.sin(ph)*.06*m*aw;chest.rotation.y=-Math.sin(ph)*.05*m*aw;
    chest.rotation.z=Math.sin(ph)*.02*m+st.scratch*.1;rootBone.rotation.z=Math.sin(T*.4)*.004+sl*.1+st.groom*.08;
    rootBone.position.y+=Math.abs(Math.sin(T*6))*.1*info.length*st.play*aw;chest.rotation.x=.25*st.play+(isBound?0:0);hips.rotation.x=-.18*st.play;
    if(isBound){rootBone.rotation.x=Math.sin(ph)*.18*m;hips.rotation.x=-Math.sin(ph)*.1*m}
    const breath=Math.sin(T*(1.7+sl*-.7))*.014*(1+sl*.8);chest.scale.set(1+breath*.6,1+breath,1+breath*.3);
    // neck + head: look around, graze, sleep, alert
    const g1=st.graze,al=st.alert;const look=Math.sin(T*.37)*.25*(1-m)*aw,tilt=Math.sin(T*.6+1)*.05;
    const chew=ctx.anim==='feed'?Math.sin(T*11)*.05*g1:0;
    n1.rotation.x=.55*g1*(spec.neck.up>1.5?.45:1)+.5*sl-.2*al+Math.sin(ph*2)*.03*m*aw;
    n2.rotation.x=.38*g1*(spec.neck.up>1.5?.45:1)+.35*sl-.12*al-Math.sin(ph*2)*.04*m*aw;
    head.rotation.x=.3*g1+.18*sl+chew+tilt*.5;
    n1.rotation.y=look*.55+sl*.7+st.groom*.9;n2.rotation.y=look*.45+sl*.2+st.groom*.5;head.rotation.y=look*.3+st.groom*.2;head.rotation.x+=st.groom*.35+st.scratch*.15;
    // tail: lag chain
    for(let i=0;i<tails.length;i++){const lag=i*.6;const sw=Math.sin(T*(1.6+i*.3)-lag)*(.22+i*.1)*(spec.tail.type==='short'?.3:1);tails[i].rotation.y=sw*(1-sl*.6)+Math.sin(ph-lag)*.1*m;tails[i].rotation.x=-.12*al*(i+1)+Math.sin(T*.9+i)*.04+sl*.15}
    for(let i=0;i<ears.length;i++){const side=i?1:-1;const tw=Math.max(0,Math.sin(T*.7+i*2.1+Math.sin(T*.13)*3)-.93)*14;ears[i].rotation.x=-.28*al-sl*.25+tw*.35;ears[i].rotation.z=side*(.05+tw*.2+sl*.3)}
    if(trunk.length){const curl=ctx.anim==='feed'?1:0;trunk.forEach((b,i)=>{b.rotation.x=Math.sin(T*.9+i*.55)*.1+g1*.22+curl*.18*(i+1)*.5;b.rotation.y=Math.sin(T*.6+i*.4)*.1})}
    // blinking
    st.nextBlink-=dt;if(st.nextBlink<=0){st.blink=.14;st.nextBlink=2+Math.random()*4}
    st.blink=Math.max(0,st.blink-dt);const bs=(st.blink>0||sl>.5)?.1:1;for(const e of eyes)e.scale.y=damp(e.scale.y,bs,40,dt);
   },
  };
 }
 if(type==='bird'){
  const legs=[{up:B('upL'),lo:B('loL'),ft:B('ftL')},{up:B('upR'),lo:B('loR'),ft:B('ftR')}];
  const wings=[{s:B('wingL'),w:B('wingL2'),side:-1},{s:B('wingR'),w:B('wingR2'),side:1}];
  const necks=[1,2,3,4].map(i=>B('neck'+i)).filter(Boolean),head=B('head'),tail=B('tail'),chest=B('chest');
  const wader=g.type==='wade';
  return {
   state:st,height:info.height,
   update(dt,ctx={}){
    st.t+=dt;const T=st.t;st.move=damp(st.move,ctx.moving?1:0,6,dt);st.sleep=damp(st.sleep,ctx.sleeping?1:0,2,dt);st.fly=damp(st.fly,ctx.flying?1:0,6,dt);st.graze=damp(st.graze,ctx.anim==='forage'||ctx.anim==='feed'||ctx.anim==='drink'?1:0,4,dt);st.groom=damp(st.groom||0,ctx.anim==='groom'||ctx.anim==='scratch'?1:0,4,dt);st.alert=damp(st.alert,ctx.alert||ctx.fear>.45?1:0,5,dt);st.swim=damp(st.swim,ctx.swim?1:0,5,dt);
    const m=st.move,sl=st.sleep,fl=st.fly;
    st.phase+=dt*(g.freq||4)*(.35+m*.65)*(m>.05?1:0);const ph=st.phase;
    for(let i=0;i<2;i++){const L=legs[i];const p=ph+i*Math.PI,s=Math.sin(p),c=Math.max(0,Math.cos(p));
     let ur=-s*(g.stride||.35)*m*(wader?.9:1),lr=c*(wader?1.5:1.0)*(g.stride||.35)*1.4*m;
     if(g.type==='hop'){ur=-Math.sin(ph)*.6*m;lr=Math.max(0,Math.cos(ph))*.9*m}
     ur=ur*(1-fl)+(-.2)*fl;lr=lr*(1-fl)+.9*fl;
     // sleeping flamingo/heron: stand on one leg
     if(sl>.1&&wader&&i===1){ur=ur*(1-sl)+1.2*sl;lr=lr*(1-sl)+2.2*sl}
     L.up.rotation.x=ur;L.lo.rotation.x=lr;L.ft.rotation.x=-(ur+lr)*.5}
    root.getObjectByName('root').position.y=baseY+(Math.abs(Math.sin(g.type==='hop'?ph:ph*2))*(g.bob||.01)*info.length*m)*(1-fl)-st.swim*spec.body.ry*spec.k*.5+fl*.0;
    const flap=Math.sin(T*(11+fl*2))*(.9*fl+.06);
    for(const w of wings){const fold=1-fl;w.s.rotation.z=w.side*(flap*1.1+Math.sin(T*1.1)*.012*fold+(ctx.alert?.12:0));w.s.rotation.y=-w.side*fl*.25;w.w.rotation.z=w.side*(flap*.9*fl+.0)}
    const lead=wader?Math.sin(ph*2)*.12*m:Math.sin(ph*2)*.2*m;
    for(let i=0;i<necks.length;i++){const f=(i+1)/necks.length;necks[i].rotation.x=lead*(i%2?1:-1)*.5+st.graze*.5*f*(wader?.9:.6)+sl*.9*f-st.alert*.08*f;necks[i].rotation.y=Math.sin(T*.5+i*.4)*.12*(1-m)*(1-sl)+sl*.5*f}
    head.rotation.x=st.graze*.4+sl*.3+Math.sin(T*1.3)*.03+st.groom*(.5+Math.sin(T*9)*.08);head.rotation.y=Math.sin(T*.7)*.25*(1-m)*(1-sl)+st.groom*1.1;
    if(tail)tail.rotation.x=Math.sin(T*1.8)*.05+(g.cock?-.6:0)+fl*-.2;
    chest.scale.setScalar(1+Math.sin(T*2.4)*.012);
    st.nextBlink-=dt;if(st.nextBlink<=0){st.blink=.12;st.nextBlink=2+Math.random()*4}st.blink=Math.max(0,st.blink-dt);const bs=(st.blink>0||sl>.5)?.1:1;for(const e of eyes)e.scale.y=damp(e.scale.y,bs,40,dt);
   },
  };
 }
 // turtle
 const legs=['FL','FR','HL','HR'].map(id=>B('leg'+id));const h1=B('head1'),h2=B('head2');
 return {state:st,height:info.height,update(dt,ctx={}){st.t+=dt;const T=st.t;st.move=damp(st.move,ctx.moving?1:0,5,dt);st.sleep=damp(st.sleep,ctx.sleeping?1:0,2,dt);st.phase+=dt*(g.freq||1.8)*st.move;const ph=st.phase,m=st.move,sl=st.sleep;
  legs.forEach((l,i)=>{l.rotation.x=Math.sin(ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*.35*m;l.rotation.z=((i%2)?1:-1)*(.2*sl+Math.sin(ph+i)*.05*m)});
  h1.rotation.x=-.1*(1-sl)+sl*.3+Math.sin(T*.7)*.05;h2.rotation.x=sl*.35+(ctx.anim==='forage'?.35:0);h1.position.z=h1.userData.baseZ??(h1.userData.baseZ=h1.position.z);h1.position.z=h1.userData.baseZ-sl*.03;
  rootBone.position.y=baseY+Math.sin(ph*2)*.004*m;
  st.nextBlink-=dt;if(st.nextBlink<=0){st.blink=.12;st.nextBlink=3+Math.random()*4}st.blink=Math.max(0,st.blink-dt);for(const e of eyes)e.scale.y=damp(e.scale.y,(st.blink>0||sl>.5)?.1:1,40,dt)}};
}

// ---------------------------------------------------------------------------------------------------------------------
export function protoFor(kind,opts={}){
 const spec=SPECS[kind];if(!spec)return null;
 const key=kind+(opts.sex||'')+(opts.young?'y':'');
 if(!cache.has(key)){
  const info=spec.type==='quad'?buildQuad(kind,spec,opts):spec.type==='bird'?buildBird(kind,spec,opts):buildTurtle(kind,spec);
  cache.set(key,{info,spec});
 }
 return cache.get(key);
}
// Create one animal instance (shares geometry/materials with its prototype; owns its own skeleton and pose).
export function makeCreature(kind,opts={}){
 const proto=protoFor(kind,opts);if(!proto)return null;
 const group=SkeletonUtils.clone(proto.info.group);
 const controller=makeController(group,proto.spec,proto.info);
 group.userData.kind=kind;group.userData.rig=stopMotionRig(controller);group.userData.spec=proto.spec;group.userData.speed=proto.spec.speed||.45;
 group.traverse(o=>{if(o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true}});
 // claymation proportions: a slightly oversized head reads as a hand-made puppet
 const hb=group.getObjectByName('head');if(hb)hb.scale.setScalar(proto.spec.type==='bird'?1.1:1.2);
 return group;
}
export const creatureKinds=()=>Object.keys(SPECS);

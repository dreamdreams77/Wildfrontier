import * as THREE from 'three';

// Handcrafted, clay-style safari animals built from simple primitives so they match the rest of the reserve.
// Convention: +z is the animal's front (the world update loop turns animals toward their travel direction).

const matCache=new Map();
const mat=(color,rough=1)=>{const key=color+rough;if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({color,roughness:rough}));return matCache.get(key)};
const sphere=new THREE.SphereGeometry(1,16,12);
function blob(parent,material,pos,scale,rot){const m=new THREE.Mesh(sphere,material);m.position.set(...pos);m.scale.set(...scale);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function limb(parent,material,a,b,r1,r2=r1,seg=8){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),seg),material);m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function cone(parent,material,pos,r,h,rot){const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,8),material);m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;parent.add(m);return m}

// Body plans. Lengths are in world units; an adult African elephant is roughly 3.4 tall at the shoulder.
const PLANS={
 africanLion:{body:'#c99b5c',belly:'#e6cfa0',dark:'#3a2a1d',len:1.55,height:.62,width:.52,legH:.62,legR:.11,neck:.26,head:.31,tail:.95,tailTuft:true,mane:true,ears:'round',muzzle:'#e6cfa0'},
 bengalTiger:{body:'#d8822f',belly:'#f1e2c4',dark:'#25201b',len:1.7,height:.58,width:.5,legH:.6,legR:.115,neck:.24,head:.3,tail:1.05,stripes:true,ears:'round',muzzle:'#f1e2c4'},
 cheetah:{body:'#d9b26c',belly:'#efe0bb',dark:'#2c241b',len:1.35,height:.4,width:.34,legH:.78,legR:.07,neck:.3,head:.2,tail:1.0,spots:true,ears:'round',muzzle:'#efe0bb',slim:true},
 africanElephant:{body:'#8d8a82',belly:'#a29f96',dark:'#4c4a45',len:2.5,height:1.2,width:.95,legH:1.2,legR:.3,neck:.1,head:.62,tail:.9,trunk:true,tusks:true,ears:'huge',muzzle:'#a29f96'},
 giraffe:{body:'#d8a95a',belly:'#ecd49e',dark:'#7a4a22',len:1.7,height:.66,width:.5,legH:1.75,legR:.09,neck:2.2,head:.26,tail:.85,spots:'patches',horns:true,ears:'round',muzzle:'#ecd49e',tall:true},
 plainsZebra:{body:'#efece3',belly:'#fbfaf5',dark:'#22201e',len:1.6,height:.6,width:.46,legH:.88,legR:.075,neck:.5,head:.3,tail:.8,stripes:'zebra',ears:'tall',muzzle:'#3a3633',mane:'short'},
 indianRhino:{body:'#8a8478',belly:'#a49d90',dark:'#4f4a42',len:2.1,height:.9,width:.8,legH:.62,legR:.2,neck:.12,head:.5,tail:.55,horn:true,plates:true,ears:'small',muzzle:'#7d776b'},
};

const ANIMAL_BEHAVIOUR={
 africanLion:{location:'SAVANNA KOPJE'},bengalTiger:{location:'BAMBOO THICKET'},cheetah:{location:'OPEN PLAINS'},africanElephant:{location:'ACACIA GROVE'},giraffe:{location:'ACACIA GROVE'},plainsZebra:{location:'OPEN PLAINS'},indianRhino:{location:'RIVER WALLOW'},flamingo:{location:'SODA LAKE SHORE'},
};
export const SAFARI_KINDS=Object.keys(ANIMAL_BEHAVIOUR);
export const isSafariKind=kind=>SAFARI_KINDS.includes(kind);

function makeFlamingo(g){
 const pink=mat('#f08fa0'),pale=mat('#f7b6c0'),dark=mat('#25201b'),legMat=mat('#e2778c');
 blob(g,pink,[0,.92,0],[.3,.26,.46]);
 // long S-curved neck
 const pts=[[0,1.0,.38],[0,1.28,.55],[0,1.52,.52],[0,1.7,.4],[0,1.78,.52]];
 for(let i=0;i<pts.length-1;i++)limb(g,pale,pts[i],pts[i+1],.055,.05,7);
 blob(g,pale,[0,1.82,.6],[.085,.085,.11]);
 blob(g,dark,[0,1.78,.74],[.05,.05,.09],[.5,0,0]);blob(g,mat('#f6d0d6'),[0,1.8,.69],[.05,.05,.07]);
 for(const s of [-1,1])blob(g,dark,[s*.045,1.85,.65],[.014,.02,.014]);
 g.userData.wings=[];
 for(const s of [-1,1]){const pivot=new THREE.Group();pivot.position.set(s*.28,.98,-.02);g.add(pivot);blob(pivot,pink,[s*.12,0,-.04],[.14,.05,.3]);blob(pivot,dark,[s*.12,-.02,-.3],[.09,.03,.1]);g.userData.wings.push({pivot,side:s})}
 g.userData.legs=[];
 for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.11,.84,-.02);g.add(leg);limb(leg,legMat,[0,0,0],[0,-.42,0],.025,.02,6);limb(leg,legMat,[0,-.42,0],[s*.02,-.8,.04],.02,.016,6);blob(leg,legMat,[s*.02,-.82,.1],[.07,.015,.11]);leg.userData.swing=Math.random()*6;g.userData.legs.push(leg)}
 blob(g,pale,[0,.9,-.5],[.08,.06,.18],[-.3,0,0]);
 return g;
}

export function makeSafariAnimal(scene,kind,x,z,id,name){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 if(kind==='flamingo')makeFlamingo(g);
 else{
  const P=PLANS[kind];const bodyMat=mat(P.body),belly=mat(P.belly),dark=mat(P.dark),muzzleMat=mat(P.muzzle);
  const bodyY=P.legH+P.height*.55;
  // torso, chest and haunch masses
  blob(g,bodyMat,[0,bodyY,0],[P.width,P.height,P.len*.5]);
  blob(g,bodyMat,[0,bodyY+P.height*.05,P.len*.28],[P.width*1.05,P.height*1.05,P.len*.28]);
  blob(g,bodyMat,[0,bodyY+P.height*.02,-P.len*.3],[P.width*1.02,P.height*1.02,P.len*.27]);
  blob(g,belly,[0,bodyY-P.height*.5,0],[P.width*.7,P.height*.35,P.len*.38]);
  // neck and head
  const shoulder=new THREE.Vector3(0,bodyY+P.height*.25,P.len*.34);
  const headFrom=P.tall?new THREE.Vector3(0,shoulder.y+P.neck,shoulder.z+P.neck*.28):new THREE.Vector3(0,shoulder.y+P.neck*.45,shoulder.z+P.len*.2+P.head*.4);
  limb(g,bodyMat,[shoulder.x,shoulder.y,shoulder.z-.05],[headFrom.x,headFrom.y,headFrom.z],P.tall?.17:P.width*.5,P.tall?.1:P.width*.42,10);
  const head=new THREE.Group();head.position.copy(headFrom);g.add(head);g.userData.head=head;
  blob(head,bodyMat,[0,0,P.head*.2],[P.head*.68,P.head*.62,P.head*.85]);
  if(kind!=='africanElephant')blob(head,muzzleMat,[0,-P.head*.18,P.head*.85],[P.head*.42,P.head*.3,P.head*.5]);
  blob(head,dark,[0,-P.head*.12,P.head*1.25],[P.head*.12,P.head*.09,P.head*.08]);
  for(const s of [-1,1]){const eye=blob(head,dark,[s*P.head*.42,P.head*.14,P.head*.62],[.028,.036,.02]);eye.userData.eye=true}
  g.userData.eyes=head.children.filter(c=>c.userData.eye);
  // ears
  for(const s of [-1,1]){
   if(P.ears==='huge'){const ear=blob(head,mat('#7d7a72'),[s*P.head*.95,P.head*.1,-P.head*.05],[.07,.55,.45],[0,s*.35,s*.12]);g.userData.ears=(g.userData.ears||[]);g.userData.ears.push(ear)}
   else if(P.ears==='tall')cone(head,bodyMat,[s*P.head*.3,P.head*.7,-P.head*.05],.07,.26,[0,0,-s*.15]);
   else if(P.ears==='small')blob(head,bodyMat,[s*P.head*.45,P.head*.55,-P.head*.05],[.07,.1,.04]);
   else blob(head,bodyMat,[s*P.head*.4,P.head*.52,-P.head*.02],[P.head*.2,P.head*.2,.045]);
  }
  if(P.trunk){const segs=6;let prev=[0,-.05,P.head*.85];for(let i=1;i<=segs;i++){const t=i/segs;const nxt=[0,-.05-t*.85-(t*t)*.1,P.head*.85+Math.sin(t*1.2)*.18-t*.05];limb(head,bodyMat,prev,nxt,.17-.1*(i-1)/segs,.17-.1*i/segs,8);prev=nxt}blob(head,dark,[0,prev[1]-.02,prev[2]+.02],[.07,.04,.07])}
  if(P.tusks)for(const s of [-1,1])limb(head,mat('#efe6cf',.6),[s*.2,-.25,P.head*.7],[s*.27,-.7,P.head*1.15],.045,.015,6);
  if(P.horns)for(const s of [-1,1]){limb(head,bodyMat,[s*.07,P.head*.6,0],[s*.07,P.head*1.15,-.03],.025,.02,6);blob(head,dark,[s*.07,P.head*1.2,-.03],[.04,.04,.04])}
  if(P.horn){cone(head,mat('#5e594f'),[0,P.head*.5,P.head*1.0],.13,.5,[.55,0,0])}
  if(P.mane===true){for(let i=0;i<14;i++){const a=i/14*Math.PI*2;blob(g,mat('#6b4423'),[Math.cos(a)*.3,shoulder.y+.12+Math.sin(a)*.26,shoulder.z+P.neck*.2],[.2,.2,.19])}blob(head,mat('#6b4423'),[0,.12,-.1],[P.head*.8,P.head*.8,P.head*.55])}
  if(P.mane==='short')for(let i=0;i<8;i++)blob(g,dark,[0,shoulder.y+.2+(i*.06),shoulder.z+i*.07],[.04,.14,.07]);
  // pattern marks
  if(P.stripes===true)for(let i=0;i<9;i++){const zz=-P.len*.42+i*P.len*.1;blob(g,dark,[P.width*.78*(i%2?1:-1)*.99,bodyY+.05,zz],[.03,P.height*.55,.045]);blob(g,dark,[-P.width*.78*(i%2?1:-1)*.99,bodyY+.08,zz+.05],[.03,P.height*.5,.04])}
  if(P.stripes==='zebra'){for(let i=0;i<11;i++){const zz=-P.len*.44+i*P.len*.09;for(const s of [-1,1])blob(g,dark,[s*P.width*.97,bodyY,zz],[.03,P.height*.9,.034])}for(let i=0;i<5;i++)for(const s of [-1,1])blob(g,dark,[s*.16*(1),shoulder.y+.1+i*.1,shoulder.z+i*.05],[.14,.025,.035])}
  if(P.spots===true)for(let i=0;i<28;i++){const a=i*2.399,zz=Math.sin(i*1.7)*P.len*.42;blob(g,dark,[Math.cos(a)*P.width*.84,bodyY+Math.sin(a)*P.height*.5+.05,zz],[.03,.03,.03])}
  if(P.spots==='patches')for(let i=0;i<22;i++){const a=i*2.1,zz=Math.sin(i*1.3)*P.len*.4;blob(g,dark,[Math.cos(a)*P.width*.82,bodyY+Math.sin(a)*P.height*.5,zz],[.09,.1,.09]);if(i%2===0)blob(g,dark,[(i%4?.1:-.1),shoulder.y+.3+(i%11)*.17,shoulder.z+.04+(i%11)*.026],[.08,.1,.08])}
  if(P.plates)for(const zz of [.55,-.05,-.55]){blob(g,mat('#6e685d'),[0,bodyY+.05,zz],[P.width*1.04,P.height*1.02,.1])}
  // tail
  const tail=new THREE.Group();tail.position.set(0,bodyY+P.height*.1,-P.len*.5);g.add(tail);g.userData.tail=tail;
  limb(tail,bodyMat,[0,0,0],[0,-P.tail*.1,-P.tail*.5],.04,.025,6);if(P.tailTuft)blob(tail,mat('#3a2a1d'),[0,-P.tail*.12,-P.tail*.55],[.07,.08,.14]);if(P.stripes===true||P.spots===true)blob(tail,dark,[0,-P.tail*.1,-P.tail*.5],[.045,.045,.1]);
  // legs
  g.userData.legs=[];
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const leg=new THREE.Group();leg.position.set(sx*P.width*.62,P.legH+.04,sz*P.len*.32);g.add(leg);
   limb(leg,bodyMat,[0,0,0],[0,-P.legH,.01],P.legR,P.legR*.72,8);
   blob(leg,kind==='africanElephant'?mat('#5a574f'):dark,[0,-P.legH-.01,.03],[P.legR*1.15,.05,P.legR*1.5]);
   leg.userData.swing=Math.random()*6;g.userData.legs.push(leg);
  }
 }
 const b=ANIMAL_BEHAVIOUR[kind];
 g.userData.home=new THREE.Vector3(x,0,z);g.userData.wanderTarget=new THREE.Vector3(x,0,z);g.userData.aiTimer=2+Math.random()*2;g.userData.forageTimer=2+Math.random()*4;
 g.userData.id=id;g.userData.kind=kind;g.userData.name=name;g.userData.safari=true;
 g.userData.description='A sanctuary resident. Keep a respectful distance and follow ranger protocols.';g.userData.condition='HEALTHY';g.userData.location=b.location;
 return g;
}

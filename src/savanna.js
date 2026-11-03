import * as THREE from 'three';

const mats=new Map();
const mat=(color,rough=1)=>{const k=color+rough;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color,roughness:rough}));return mats.get(k)};
const sphere=new THREE.SphereGeometry(1,14,10);
const blob=(parent,m,pos,sc)=>{const o=new THREE.Mesh(sphere,m);o.position.set(...pos);o.scale.set(...sc);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
const cyl=(parent,m,pos,r1,r2,h,seg=8)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,h,seg),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
const disc=(parent,color,x,z,r,y=.045,sx=1,sz=1,rough=1)=>{const o=new THREE.Mesh(new THREE.CircleGeometry(r,36),mat(color,rough));o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.scale.set(sx,sz,1);o.receiveShadow=true;parent.add(o);return o};

// Where each species is housed. Used by the world to spawn animals and by the sanctuary logic for habitat checks.
export const SAFARI_HABITATS={
 savannaKopje:{label:'Savanna kopje',x:24,z:-8,radius:3.2},
 bambooThicket:{label:'Bamboo thicket',x:24,z:10,radius:3.2},
 acaciaGrove:{label:'Acacia grove',x:31,z:-1,radius:5},
 openPlains:{label:'Open plains',x:31,z:-9,radius:5},
 riverWallow:{label:'River wallow',x:37,z:10,radius:3.4},
 sodaLake:{label:'Soda lake shore',x:38,z:-10,radius:4},
 waterhole:{label:'Waterhole',x:31,z:7,radius:3.4},
};

export function buildSavanna(scene){
 const root=new THREE.Group();scene.add(root);
 // Dry-season ground, built from overlapping hand-placed discs so it reads as sculpted clay rather than a texture.
 disc(root,'#c9b173',31,0,15,.05,1.25,1.7);
 disc(root,'#d8c386',28,-6,9,.055,1.2,.9);disc(root,'#bb9d5d',36,6,8,.055,1,1.1);disc(root,'#d2bb7c',24,3,7,.06,1.1,1.4);
 disc(root,'#aa8e52',31,-13,6,.06,1.4,.7);disc(root,'#c4a967',20,14,6,.06,1.3,.8);
 // Waterhole and soda lake.
 const water=new THREE.MeshStandardMaterial({color:'#6b97a1',roughness:.25,metalness:.12});
 disc(root,'#8a6e48',31,7,3.9,.07,1.25,.9);const wh=disc(root,'#6b97a1',31,7,3.3,.085,1.25,.9,.25);wh.material=water;
 disc(root,'#bfa0a0',38,-10,4.8,.07,1.2,.85);const lake=disc(root,'#d79bb0',38,-10,4.1,.085,1.2,.85,.3);lake.material=new THREE.MeshStandardMaterial({color:'#d9a3b4',roughness:.3,metalness:.1});
 // Rhino wallow.
 disc(root,'#5d4a38',37,10,2.6,.07,1.2,.9);disc(root,'#6b5640',37,10,2.0,.085,1.2,.9,.4);
 // Kopje: stacked boulders where the lions rest.
 const rock=mat('#9a8b78'),rock2=mat('#867a69');
 for(const [x,y,z,s] of [[0,.7,0,1.5],[1.6,.5,.8,1.1],[-1.5,.55,.6,1.15],[.4,1.6,-.2,1.0],[-.3,.35,-1.6,.9],[1.4,.4,-1.2,.85]])blob(root,(x+z)%2?rock:rock2,[24+x,y,-9.5+z],[s*1.1,s*.85,s]);
 // Bamboo thicket and pool for the tigers.
 const bamboo=mat('#7f9d4a'),leaf=mat('#6f8f3d');
 for(let i=0;i<46;i++){const a=i*2.399,r=1.5+((i*37)%10)*.27;const x=21+Math.cos(a)*r*1.1,z=12.5+Math.sin(a)*r*.75;const h=3+((i*13)%5)*.35;const stalk=cyl(root,bamboo,[x,h/2,z],.05,.07,h,6);stalk.rotation.z=Math.sin(i)*.07;blob(root,leaf,[x,h-.1,z],[.28,.07,.12]);}
 disc(root,'#6f9990',25.5,8.2,1.7,.075,1.2,.8,.3);
 // Acacia: flat, layered crowns on bent trunks.
 const bark=mat('#6e5640'),crown=mat('#7c8a40'),crown2=mat('#6a7a38');
 const acaciaSpots=[[28,3,1.0],[33.5,-3.5,1.15],[27,-3,.9],[35.5,3,1.0],[30,-12,.85],[40,2,1.05],[34,-6.5,.8],[22,-1,.95],[39,13,.9],[29,13,.85]];
 for(const [x,z,s] of acaciaSpots){const t=new THREE.Group();t.position.set(x,0,z);t.scale.setScalar(s);root.add(t);cyl(t,bark,[0,1.1,0],.18,.3,2.2,7).rotation.z=.08;cyl(t,bark,[.2,2.3,0],.1,.16,1.2,6).rotation.z=-.5;blob(t,crown,[.4,3.15,0],[1.5,.3,1.2]);blob(t,crown2,[-.3,3.4,.15],[1.05,.25,.9]);blob(t,crown2,[.8,3.0,-.4],[.8,.2,.7])}
 // A single ancient baobab.
 const bao=new THREE.Group();bao.position.set(40,0,-3);root.add(bao);cyl(bao,mat('#9a8468'),[0,1.8,0],.95,1.25,3.6,12);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;cyl(bao,mat('#9a8468'),[Math.cos(a)*.7,3.8,Math.sin(a)*.7],.12,.25,1.6,6).rotation.set(Math.sin(a)*.6,0,-Math.cos(a)*.6);blob(bao,crown2,[Math.cos(a)*1.4,4.6,Math.sin(a)*1.4],[.9,.35,.9])}
 // Dry grass tufts.
 const dry=mat('#d8c27a'),dry2=mat('#bfa55c');
 for(let i=0;i<150;i++){const x=16+((i*47.3)%27),z=-16+((i*29.1)%36);const tuft=new THREE.Group();tuft.position.set(x,.03,z);root.add(tuft);for(let j=0;j<3;j++){const b=new THREE.Mesh(new THREE.ConeGeometry(.035,.34+((i+j)%3)*.08,4),j%2?dry:dry2);b.position.set((j-1)*.07,.17,(j%2)*.05);b.rotation.z=(j-1)*.18;tuft.add(b)}}
 // Scattered boulders.
 for(let i=0;i<14;i++){const x=17+((i*23.7)%26),z=-15+((i*17.3)%32);blob(root,i%2?rock:rock2,[x,.16,z],[.3+(i%3)*.12,.2,.28+(i%2)*.1])}
 // Entrance gate and perimeter rail so the safari reads as a managed sanctuary, not open wilderness.
 const wood=mat('#7a5b3a'),woodDark=mat('#5b4329');
 const gate=new THREE.Group();gate.position.set(17,0,0);root.add(gate);
 for(const z of [-2.6,2.6])cyl(gate,woodDark,[0,1.5,z],.2,.24,3,8);
 const beam=new THREE.Mesh(new THREE.BoxGeometry(.3,.35,5.8),wood);beam.position.set(0,3.05,0);beam.castShadow=true;gate.add(beam);
 const sign=new THREE.Mesh(new THREE.BoxGeometry(.12,.7,3.6),mat('#d9c595'));sign.position.set(.02,2.55,0);gate.add(sign);const letters=new THREE.Mesh(new THREE.BoxGeometry(.14,.16,2.6),mat('#4a3b24'));letters.position.set(.04,2.55,0);gate.add(letters);
 for(const side of [-1,1])for(let i=0;i<9;i++){const z=side*(3.4+i*2.1);cyl(root,woodDark,[17,.55,z],.07,.09,1.1,6);if(i<8){for(const y of [.45,.85]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.08,.07,2.1),wood);rail.position.set(17,y,z+side*1.05);root.add(rail)}}}
 // Raised viewing platform over the waterhole.
 const deck=new THREE.Group();deck.position.set(26,0,5);root.add(deck);
 const plat=new THREE.Mesh(new THREE.BoxGeometry(3.4,.18,2.4),wood);plat.position.set(0,1.0,0);plat.castShadow=true;plat.receiveShadow=true;deck.add(plat);
 for(const x of [-1.5,1.5])for(const z of [-1,1])cyl(deck,woodDark,[x,.5,z],.07,.09,1,6);
 for(const x of [-1.6,1.6]){const post=new THREE.Mesh(new THREE.BoxGeometry(.07,.8,.07),woodDark);post.position.set(x,1.5,1.1);deck.add(post)}
 const rail=new THREE.Mesh(new THREE.BoxGeometry(3.3,.07,.07),wood);rail.position.set(0,1.85,1.1);deck.add(rail);
 const roofP=new THREE.Mesh(new THREE.BoxGeometry(3.6,.12,2.6),mat('#b69a62'));roofP.position.set(0,2.7,0);roofP.castShadow=true;deck.add(roofP);for(const x of [-1.6,1.6])for(const z of [-1.1,1.1])cyl(deck,woodDark,[x,1.85,z],.05,.06,1.7,6);
 // Boardwalk linking the gate to the platform.
 for(let i=0;i<10;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(1.8,.08,.55),wood);p.position.set(18+i*.85,.08,.2+i*.2);p.rotation.y=-.12;p.receiveShadow=true;root.add(p)}
 return root;
}

import * as THREE from 'three';

// Models for buildable habitat structures. Footprints roughly match BUILD_ITEMS radii in operations.js.
const mats=new Map();
const mat=(c,r=1,extra={})=>{const k=c+r+JSON.stringify(extra);if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness:r,...extra}));return mats.get(k)};
const sphere=new THREE.SphereGeometry(1,14,10);
const blob=(p,m,pos,sc)=>{const o=new THREE.Mesh(sphere,m);o.position.set(...pos);o.scale.set(...sc);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const cyl=(p,m,pos,r1,r2,h,seg=8)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,h,seg),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const box=(p,m,pos,sz)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...sz),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
const disc=(p,c,r,y,extra={})=>{const o=new THREE.Mesh(new THREE.CircleGeometry(r,32),mat(c,.5,extra));o.rotation.x=-Math.PI/2;o.position.y=y;o.receiveShadow=true;p.add(o);return o};

const builders={
 shadeTree(g){cyl(g,mat('#6e5640'),[0,1.1,0],.16,.26,2.2,7);cyl(g,mat('#6e5640'),[.2,2.2,0],.09,.14,1,6).rotation.z=-.5;blob(g,mat('#7c8a40'),[.35,2.95,0],[1.3,.28,1.1]);blob(g,mat('#6a7a38'),[-.2,3.2,.1],[.9,.22,.8])},
 pond(g){disc(g,'#8a6e48',2.2,.07);disc(g,'#6b97a1',1.8,.085,{metalness:.1})},
 wallow(g){disc(g,'#5d4a38',2.0,.07);disc(g,'#6b5640',1.55,.085)},
 shelter(g){box(g,mat('#8b6947'),[0,.5,0],[1.8,1,1.5]);const roof=new THREE.Mesh(new THREE.ConeGeometry(1.5,.8,4),mat('#b69a62'));roof.position.y=1.35;roof.rotation.y=Math.PI/4;roof.scale.set(1,1,.85);roof.castShadow=true;g.add(roof);box(g,mat('#3a2a1d'),[0,.4,.76],[.7,.8,.05])},
 rocks(g){const m=mat('#9a8b78'),m2=mat('#867a69');blob(g,m,[0,.6,0],[1.1,.8,.95]);blob(g,m2,[.9,.4,.5],[.7,.55,.65]);blob(g,m2,[-.7,.35,.6],[.6,.45,.55]);blob(g,m,[.1,1.1,-.1],[.6,.5,.55])},
 bamboo(g){const m=mat('#7f9d4a'),l=mat('#6f8f3d');for(let i=0;i<9;i++){const a=i*2.4,r=.25+(i%3)*.22;const h=2.6+(i%4)*.4;const s=cyl(g,m,[Math.cos(a)*r,h/2,Math.sin(a)*r],.04,.06,h,6);s.rotation.z=Math.sin(i)*.06;blob(g,l,[Math.cos(a)*r,h-.1,Math.sin(a)*r],[.26,.07,.11])}},
 feeder(g){for(const x of [-.4,.4])cyl(g,mat('#5b4329'),[x,.3,0],.05,.06,.6,6);box(g,mat('#7a5b3a'),[0,.65,0],[1.1,.2,.5]);for(let i=0;i<6;i++)blob(g,mat('#d8c27a'),[-.4+i*.16,.8,0],[.1,.07,.12])},
 platform(g){box(g,mat('#7a5b3a'),[0,1,0],[2.6,.16,2]);for(const x of [-1.1,1.1])for(const z of [-.8,.8])cyl(g,mat('#5b4329'),[x,.5,z],.06,.08,1,6);box(g,mat('#b69a62'),[0,2.6,0],[2.9,.1,2.3]);for(const x of [-1.25,1.25])for(const z of [-1,1])cyl(g,mat('#5b4329'),[x,1.8,z],.05,.06,1.6,6);box(g,mat('#7a5b3a'),[0,1.7,1],[2.5,.06,.06])},
 path(g){for(let i=0;i<3;i++)box(g,mat('#7a5b3a'),[0,.06,(i-1)*.5],[1.6,.08,.42])},
 flowers(g){disc(g,'#6f8a4e',1.1,.05);const cols=['#d9a0b4','#e5c879','#c98fd0','#f0e0b0'];for(let i=0;i<14;i++){const a=i*2.4,r=.2+(i%5)*.15;const x=Math.cos(a)*r,z=Math.sin(a)*r;cyl(g,mat('#6f8a4e'),[x,.15,z],.015,.015,.3,4);blob(g,mat(cols[i%4]),[x,.34,z],[.09,.07,.09])}},
 education(g){box(g,mat('#d9c595'),[0,.9,0],[3.4,1.8,2.6]);const roof=new THREE.Mesh(new THREE.BoxGeometry(3.9,.2,3.1),mat('#8b6947'));roof.position.y=2;roof.castShadow=true;g.add(roof);const top=new THREE.Mesh(new THREE.ConeGeometry(2.4,.9,4),mat('#b69a62'));top.position.y=2.55;top.rotation.y=Math.PI/4;top.scale.set(1,1,.8);g.add(top);box(g,mat('#4a3b24'),[0,.6,1.31],[.9,1.2,.05]);for(const x of [-1.1,1.1])box(g,mat('#7aa3b0'),[x,1.05,1.31],[.7,.6,.05]);box(g,mat('#4a3b24'),[0,1.7,1.32],[1.9,.22,.04])},
};

export function makeBuildModel(type){
 const g=new THREE.Group();(builders[type]||builders.rocks)(g);return g;
}

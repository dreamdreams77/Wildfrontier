import * as THREE from 'three';
import { groundFx } from './terrain.js';
import { canPaint } from './paint.js';
function sprite(){if(!canPaint)return null;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),q=g.createRadialGradient(32,32,0,32,32,32);q.addColorStop(0,'rgba(255,255,255,1)');q.addColorStop(.3,'rgba(255,245,210,.45)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
export function createAtmosphere(scene,{tier,count=140}={}){
 const n=Math.max(24,Math.round(count*Math.max(.28,tier.foliage||1))),base=new Float32Array(n*3),seed=new Float32Array(n);for(let i=0;i<n;i++){base[i*3]=Math.random()*2-1;base[i*3+1]=Math.random();base[i*3+2]=Math.random()*2-1;seed[i]=Math.random()*100}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({map:sprite(),color:'#fff0c2',size:.18,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));scene.add(motes);
 const birds=[],wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,0,0,.9,0,-.18,.25,0,.28]),3));const bm=new THREE.MeshBasicMaterial({color:'#26302b',side:THREE.DoubleSide,fog:true}),nb=tier.foliage>.7?7:4;
 for(let i=0;i<nb;i++){const g=new THREE.Group(),L=new THREE.Mesh(wg,bm),R=new THREE.Mesh(wg,bm);R.scale.x=-1;g.add(L,R);g.scale.setScalar(.9+(i%3)*.22);scene.add(g);birds.push({g,L,R,a:i*.8,r:26+(i%4)*7,h:30+(i%3)*5,sp:.065+(i%5)*.008,ph:i*1.3})}
 function update(t,dt,env,focus){const vis=(env.night||env.rain)?0:1;groundFx.uCloud.value+=(((env.night||env.rain||env.glow)?0:1)-groundFx.uCloud.value)*Math.min(1,dt*.8);const p=geo.attributes.position,fx=focus.x,fz=focus.z;
  for(let i=0;i<n;i++){const s=seed[i];p.setXYZ(i,fx+base[i*3]*15+Math.sin(t*.22+s)*1.2,.45+base[i*3+1]*3.8+Math.sin(t*.37+s*1.7)*.28,fz+base[i*3+2]*15+Math.cos(t*.2+s*.7)*1.2)}p.needsUpdate=true;motes.material.opacity+=(vis*.42-motes.material.opacity)*Math.min(1,dt*1.5);motes.visible=motes.material.opacity>.02;
  for(const b of birds){b.g.visible=vis>0;if(!vis)continue;b.a+=dt*b.sp;b.g.position.set(24+Math.cos(b.a)*b.r*1.3,b.h+Math.sin(b.a*3+b.ph),Math.sin(b.a)*b.r);b.g.rotation.y=-b.a+Math.PI;const f=Math.sin(t*(7+b.ph%2)+b.ph)*(Math.sin(t*.3+b.ph)>.2?.6:.1);b.L.rotation.z=f;b.R.rotation.z=-f}}
 return{update,motes,birds};
}

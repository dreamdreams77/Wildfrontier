import * as THREE from 'three';
import { groundFx } from './terrain.js';
import { canPaint } from './paint.js';

// Living atmosphere: sunlit pollen and dust motes, soaring birds, and the strength of drifting cloud shadows.
// Everything is cheap (one Points object, a handful of tiny meshes) and fades out at night and in rain.
function sprite(){
 if(!canPaint)return null;
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
 return new THREE.CanvasTexture(c);
}
export function createAtmosphere(scene,{tier,count=140}={}){
 const n=Math.round(count*Math.max(.35,tier.foliage||1));
 const pos=new Float32Array(n*3),seed=new Float32Array(n);
 for(let i=0;i<n;i++){pos[i*3]=Math.random()*2-1;pos[i*3+1]=Math.random();pos[i*3+2]=Math.random()*2-1;seed[i]=Math.random()*100}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({map:sprite(),color:'#fff2c8',size:.22,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
 motes.frustumCulled=false;scene.add(motes);

 // birds: tiny flapping silhouettes circling high over the reserve by day
 const birds=[];const wingGeo=new THREE.BufferGeometry();
 wingGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,0,0,.9,0,-.18,.25,0,.28]),3));wingGeo.computeVertexNormals();
 const bm=new THREE.MeshBasicMaterial({color:'#2b2f2a',side:THREE.DoubleSide,fog:true});
 const nB=tier.foliage>.7?9:5;
 for(let i=0;i<nB;i++){
  const g=new THREE.Group();const L=new THREE.Mesh(wingGeo,bm),R=new THREE.Mesh(wingGeo,bm);R.scale.x=-1;g.add(L,R);g.scale.setScalar(1.1+(i%3)*.25);scene.add(g);
  birds.push({g,L,R,a:i*.7,r:26+(i%4)*7,h:30+(i%3)*5,sp:.07+(i%5)*.008,ph:i*1.3});
 }
 function update(t,dt,env,focus){
  const day=env.night?0:1,fair=env.rain?0:1,vis=day*fair;
  groundFx.uCloud.value+=((env.night||env.rain?0:1)*(env.glow?0:1)-groundFx.uCloud.value)*Math.min(1,dt*.8);
  // motes
  const p=geo.attributes.position;const fx=focus.x,fz=focus.z;
  for(let i=0;i<n;i++){
   const s=seed[i];
   p.setXYZ(i,fx+pos[i*3]*16+Math.sin(t*.25+s)*1.4,.4+pos[i*3+1]*4.2+Math.sin(t*.4+s*1.7)*.35,fz+pos[i*3+2]*16+Math.cos(t*.22+s*.7)*1.4);
  }
  p.needsUpdate=true;motes.material.opacity+=(vis*.55-motes.material.opacity)*Math.min(1,dt*1.5);motes.visible=motes.material.opacity>.02;
  // birds
  for(const b of birds){
   b.g.visible=vis>0;
   b.a+=dt*b.sp;const cx=24,cz=0;b.g.position.set(cx+Math.cos(b.a)*b.r*1.3,b.h+Math.sin(b.a*3+b.ph)*1.2,cz+Math.sin(b.a)*b.r);
   b.g.rotation.y=-b.a+Math.PI;const f=Math.sin(t*(7+b.ph%2)+b.ph)*(Math.sin(t*.3+b.ph)>.2?.65:.12);b.L.rotation.z=f;b.R.rotation.z=-f;
  }
 }
 return {update,motes,birds};
}

import * as THREE from 'three';
import { makeCreature } from './creature.js';
import { makeBuildModel } from './structures.js';
import { makeRole } from './human.js';

// 3D-rendered portraits and icons: every thumbnail in the interface (animal records, journal, build palette) is a
// real render of the same models used in the world, lit like a small studio, instead of a flat glyph.
export function createPortraits(renderer){
 const size=256;
 const rt=new THREE.WebGLRenderTarget(size,size,{samples:4});
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight('#fff6e0','#6a7a58',1.6));
 const key=new THREE.DirectionalLight('#ffe8c0',2.6);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.DirectionalLight('#a8c4ff',1.2);rim.position.set(4,2,-4);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(3,32),new THREE.MeshStandardMaterial({color:'#7e9a62',roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const cam=new THREE.PerspectiveCamera(32,1,.05,100);
 const cache=new Map();const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
 const buf=new Uint8Array(size*size*4);
 function snap(obj,{yaw=.6,pitch=.18,fit=1,aim=.55}={}){
  scene.add(obj);obj.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(obj);const sz=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const r=Math.max(sz.x*.92,sz.y*1.0,sz.z*.92)*.5*fit+.03;const d=r/Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*1.0;
  cam.position.set(c.x+Math.sin(yaw)*Math.cos(pitch)*d,c.y*aim+box.min.y*(1-aim)+Math.sin(pitch)*d*.9,c.z+Math.cos(yaw)*Math.cos(pitch)*d);cam.lookAt(c.x,box.min.y+sz.y*aim,c.z);
  floor.position.y=box.min.y-.01;floor.scale.setScalar(Math.max(.6,r*.7));
  const prevRT=renderer.getRenderTarget(),prevShadow=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;
  renderer.setRenderTarget(rt);renderer.setClearColor('#a8c498',1);renderer.clear();renderer.render(scene,cam);
  renderer.readRenderTargetPixels(rt,0,0,size,size,buf);renderer.setRenderTarget(prevRT);renderer.shadowMap.enabled=prevShadow;
  scene.remove(obj);
  const img=ctx.createImageData(size,size);
  // render targets hold linear light: apply the same filmic curve and sRGB transfer the main view uses
  const enc=v=>{v/=255;const a=v*1.12;const t=(a*(2.51*a+.03))/(a*(2.43*a+.59)+.14);const c=Math.min(1,Math.max(0,t));return (c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055)*255};
  for(let y=0;y<size;y++){const src=(size-1-y)*size*4,dst=y*size*4;for(let x=0;x<size;x++){const i=src+x*4,o=dst+x*4;img.data[o]=enc(buf[i]);img.data[o+1]=enc(buf[i+1]);img.data[o+2]=enc(buf[i+2]);img.data[o+3]=buf[i+3]}}
  ctx.putImageData(img,0,0);
  // round vignette so thumbnails read as portraits
  ctx.globalCompositeOperation='destination-in';const g=ctx.createRadialGradient(size/2,size/2,size*.38,size/2,size/2,size*.5);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);ctx.globalCompositeOperation='source-over';
  return canvas.toDataURL('image/png');
 }
 function portrait(kind,{sex='male',young=false}={}){
  const k='a:'+kind+sex+young;if(cache.has(k))return cache.get(k);
  const a=makeCreature(kind,{sex,young});if(!a)return null;a.rotation.y=0;
  const url=snap(a,{yaw:.7,pitch:.14,fit:1.0,aim:.5});cache.set(k,url);return url;
 }
 function icon(type){
  const k='b:'+type;if(cache.has(k))return cache.get(k);
  const m=makeBuildModel(type);const url=snap(m,{yaw:.7,pitch:.45,fit:1.0,aim:.45});cache.set(k,url);return url;
 }
 function person(role){const k='p:'+role;if(cache.has(k))return cache.get(k);const m=makeRole(role);const url=snap(m,{yaw:.4,pitch:.05,fit:1,aim:.5});cache.set(k,url);return url}
 return {portrait,icon,person,cache};
}

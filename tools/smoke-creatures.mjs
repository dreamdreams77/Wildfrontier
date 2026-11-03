import * as THREE from 'three';
import { makeCreature, creatureKinds } from '../src/art/creature.js';
let tot=0;
for(const k of creatureKinds()){
  try{
    const t0=performance.now();const g=makeCreature(k,{sex:'male'});
    let tris=0,bones=0;g.traverse(o=>{if(o.isBone)bones++;if(o.isSkinnedMesh)tris+=o.geometry.index.count/3});
    for(let i=0;i<120;i++)g.userData.rig.update(1/60,{moving:i%40<25,anim:i>90?'forage':'idle',sleeping:i>110,flying:k==='whoopingCrane'&&i>20});
    let bad=0;g.traverse(o=>{if(o.isBone&&!isFinite(o.rotation.x+o.rotation.y+o.rotation.z+o.position.y))bad++});
    g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g);
    tot+=tris;console.log(k.padEnd(16),String(Math.round(tris)).padStart(6),'tris',String(bones).padStart(3),'bones','h='+box.max.y.toFixed(2),'bad='+bad,(performance.now()-t0).toFixed(0)+'ms');
  }catch(e){console.log(k,'ERROR',e.message.slice(0,100),(e.stack.split('\n')[1]||'').trim().slice(0,90))}
}
console.log('total tris',tot);

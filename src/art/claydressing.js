import * as THREE from 'three';
import { lamp } from './structures.js';
import { canPaint } from './paint.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Stop-motion set dressing: soft violet contact shadows under every creature and person (so they sit on the set even
// on phones with real shadows switched off), and clay lanterns along the trails that glow at dusk and night.
function blobTexture(){
  if(!canPaint)return null;
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(40,20,64,.62)');gr.addColorStop(.55,'rgba(40,20,64,.32)');gr.addColorStop(1,'rgba(40,20,64,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
export function createContactShadows(scene,max=96){
  const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
  const mat=new THREE.MeshBasicMaterial({map:blobTexture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const mesh=new THREE.InstancedMesh(geo,mat,max);mesh.frustumCulled=false;mesh.renderOrder=1;mesh.count=0;mesh.userData.noClay=true;scene.add(mesh);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3(),box=new THREE.Box3(),size=new THREE.Vector3();
  // cached at unit scale (the world box already includes o.scale, which update() applies every frame), so animals that
  // grow up get a growing shadow instead of keeping a newborn-sized one, and nothing is scaled twice
  const radius=o=>{if(o.userData.shadowR===undefined){box.setFromObject(o);box.getSize(size);o.userData.shadowR=Math.max(.25,Math.min(3.2,Math.max(size.x,size.z)*.42/(o.scale.x||1)))}return o.userData.shadowR};
  // objects: iterable of Object3D standing on the ground (y is their height above it)
  function update(objects){
    let n=0;
    for(const o of objects){
      if(n>=max)break;if(!o||!o.visible||o.userData.hidden)continue;
      const r=radius(o)*(o.scale.x||1),lift=Math.max(0,o.position.y),fade=Math.max(0,1-lift/3);if(fade<=0)continue;
      p.set(o.position.x,.035,o.position.z);s.set(r*2*(1+lift*.15),1,r*1.6*(1+lift*.15));q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,o.rotation.y||0);
      m4.compose(p,q,s);mesh.setMatrixAt(n++,m4);
    }
    mesh.count=n;mesh.instanceMatrix.needsUpdate=true;
  }
  return {mesh,update};
}

// Clay lantern posts: a crooked post, a clay cage and a glowing core that shares the building-window lamp material
// (so world.setEnvironment switches them on at dusk), plus a soft additive halo.
const LANTERNS=[[17.6,2.4],[20.8,3.6],[23.6,4.9],[28.4,10.2],[28.8,4.2],[31.8,2.4],[24.6,-3.6],[21.6,-1.4],[22.6,10.6],[34.6,0.4],[37.2,-4.2],[19.4,6.2],[-14,9.4],[-17.6,5.6],[-9.6,4.6],[-4.6,3.2],[2.6,4.6],[9.2,8.8]];
function haloTexture(){
  if(!canPaint)return null;
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,210,140,.9)');gr.addColorStop(.35,'rgba(255,170,90,.35)');gr.addColorStop(1,'rgba(255,150,70,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
export function buildLanterns(scene){
  const group=new THREE.Group();group.name='lanterns';
  const wood=[],cage=[],cores=[];
  for(const [x,z] of LANTERNS){
    const lean=(Math.sin(x*3.1+z)*.06);
    const post=new THREE.CylinderGeometry(.05,.075,1.5,7);post.translate(0,.75,0);post.rotateZ(lean);post.translate(x,0,z);wood.push(post);
    const arm=new THREE.CylinderGeometry(.03,.03,.34,6);arm.rotateZ(Math.PI/2);arm.translate(x+.14,1.46,z);wood.push(arm);
    const top=new THREE.ConeGeometry(.16,.14,8);top.translate(x+.3,1.43,z);cage.push(top);
    const core=new THREE.IcosahedronGeometry(.11,1);core.translate(x+.3,1.26,z);cores.push(core);
  }
  const strip=g=>{g.deleteAttribute('uv');return g.index?g.toNonIndexed():g};
  const woodM=new THREE.Mesh(mergeGeometries(wood.map(strip)),new THREE.MeshStandardMaterial({color:'#6a4a32',roughness:.9}));woodM.castShadow=true;
  const cageM=new THREE.Mesh(mergeGeometries(cage.map(strip)),new THREE.MeshStandardMaterial({color:'#3e3a52',roughness:.7}));
  const coreM=new THREE.Mesh(mergeGeometries(cores.map(strip)),lamp.mat);coreM.userData.noClay=true;
  group.add(woodM,cageM,coreM);
  const halos=new THREE.Group();const hmat=new THREE.SpriteMaterial({map:haloTexture(),color:'#ffd9a0',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  for(const [x,z] of LANTERNS){const sp=new THREE.Sprite(hmat);sp.position.set(x+.3,1.26,z);sp.scale.setScalar(1.7);halos.add(sp)}
  halos.visible=false;group.add(halos);scene.add(group);
  return {group,halos,setNight(on){halos.visible=!!on},positions:LANTERNS};
}

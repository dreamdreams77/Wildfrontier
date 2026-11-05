// Visual audit: loads the running game in headless Chromium, walks the scene graph and classifies every mesh.
// Usage: node tools/visual-audit.cjs <url> <out.json>      (requires playwright)
const {chromium}=require('playwright');
(async()=>{
 const url=process.argv[2]||'http://localhost:4173/Wildfrontier/',out=process.argv[3];
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto(url);await p.waitForTimeout(5000);
 const data=await p.evaluate(()=>{
  const w=window.__wild.world,scene=w.scene,r=w.renderer;
  const geo={},mats={textured:0,untextured:0,standard:0,physical:0,basic:0,other:0};const seenMat=new Set();
  let meshes=0,skinned=0,instanced=0,tris=0,bones=0,vertexColors=0,withNormalMap=0;
  const groups={};
  scene.traverse(o=>{
   if(o.isBone)bones++;
   if(!o.isMesh)return;meshes++;if(o.isSkinnedMesh)skinned++;if(o.isInstancedMesh)instanced++;
   const g=o.geometry;const type=g.type;geo[type]=(geo[type]||0)+1;
   const idx=g.index?g.index.count/3:g.attributes.position.count/3;tris+=idx*(o.isInstancedMesh?o.count:1);
   if(g.attributes.color)vertexColors++;
   for(const m of [].concat(o.material)){if(seenMat.has(m))continue;seenMat.add(m);
    const tex=!!(m.map||m.normalMap||m.roughnessMap||m.bumpMap);if(tex)mats.textured++;else mats.untextured++;if(m.normalMap)withNormalMap++;
    if(m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial)mats.standard++;else if(m.isMeshPhysicalMaterial)mats.physical++;else if(m.isMeshBasicMaterial)mats.basic++;else mats.other++}
   let top=o;while(top.parent&&top.parent!==scene)top=top.parent;const key=top.userData&&top.userData.kind?('animal:'+top.userData.kind):(top.userData&&top.userData.isRanger?'ranger':(top.name||top.type));
   groups[key]=(groups[key]||0)+1;
  });
  const info=r.info.render;
  return {meshes,skinnedMeshes:skinned,instancedMeshes:instanced,bones,triangles:Math.round(tris),vertexColoredMeshes:vertexColors,geometryTypes:geo,materials:mats,normalMapped:withNormalMap,drawCallsLastFrame:info.calls,trianglesLastFrame:info.triangles,textures:r.info.memory.textures,geometries:r.info.memory.geometries,
   shadowMap:r.shadowMap.enabled,toneMapping:r.toneMapping,pixelRatio:r.getPixelRatio(),animals:w.animals.length,meshesPerAnimalKind:Object.fromEntries(Object.entries(groups).filter(([k])=>k.startsWith('animal:')))}
 });
 const fs=require('fs');if(out)fs.writeFileSync(out,JSON.stringify(data,null,1));console.log(JSON.stringify(data,null,1));
 await b.close();
})();

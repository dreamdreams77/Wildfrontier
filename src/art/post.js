import * as THREE from 'three';
import { CLAY } from './style.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const GradeShader={uniforms:{tDiffuse:{value:null},warm:{value:.035},vig:{value:.22},sat:{value:1.05},contrast:{value:1.035}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float warm,vig,sat,contrast;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(l),c.rgb,sat);c.rgb=(c.rgb-.5)*contrast+.5;c.rgb+=vec3(warm,warm*.4,-warm*.35)*(l*.75+.1);float d=distance(vUv,vec2(.5));c.rgb*=1.-smoothstep(.42,.86,d)*vig;gl_FragColor=c;}`};
export function createPost(renderer,scene,camera,{ao=true}={}){
 const size=renderer.getSize(new THREE.Vector2()),maxPR=Math.min(renderer.getPixelRatio(),1.5),rt=new THREE.WebGLRenderTarget(Math.max(1,size.x),Math.max(1,size.y),{type:THREE.HalfFloatType,samples:maxPR>1.2?2:0});
 const composer=new EffectComposer(renderer,rt);composer.setPixelRatio(maxPR);composer.addPass(new RenderPass(scene,camera));
 let gtao=null;if(ao){try{gtao=new GTAOPass(scene,camera,size.x,size.y);gtao.output=GTAOPass.OUTPUT.Default;gtao.updateGtaoMaterial({radius:.45,distanceExponent:1.1,thickness:1,scale:1,samples:8,distanceFallOff:1,screenSpaceRadius:false});gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,rings:2,samples:8});gtao.blendIntensity=.62;composer.addPass(gtao)}catch{gtao=null}}
 const bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.11,.55,1.02);composer.addPass(bloom);const grade=new ShaderPass(GradeShader);if(CLAY){grade.uniforms.sat.value=1.16;grade.uniforms.contrast.value=1.05;grade.uniforms.warm.value=.05;grade.uniforms.vig.value=.18}composer.addPass(grade);composer.addPass(new OutputPass());
 return{composer,gtao,bloom,grade,setSize(w,h,pr){composer.setPixelRatio(Math.min(pr,1.5));composer.setSize(w,h)},render(){composer.render()},dispose(){composer.dispose();rt.dispose()}};
}

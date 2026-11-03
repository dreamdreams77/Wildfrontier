import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Optional high-tier post-processing: ambient occlusion for contact depth, a very gentle bloom on lights and
// sun-lit highlights, and a warm painterly colour grade with vignette. Lower tiers skip all of it.
const GradeShader={
 uniforms:{tDiffuse:{value:null},warm:{value:.06},vig:{value:.32},sat:{value:1.08},contrast:{value:1.04}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float warm;uniform float vig;uniform float sat;uniform float contrast;varying vec2 vUv;
 void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(l),c.rgb,sat);c.rgb=(c.rgb-.5)*contrast+.5;
  c.rgb+=vec3(warm,warm*.45,-warm*.5)*(l*.9+.1);float d=distance(vUv,vec2(.5));c.rgb*=1.-smoothstep(.35,.9,d)*vig;gl_FragColor=c;}`,
};
export function createPost(renderer,scene,camera,{ao=true}={}){
 const size=renderer.getSize(new THREE.Vector2());
 const rt=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,samples:4});
 const composer=new EffectComposer(renderer,rt);
 composer.addPass(new RenderPass(scene,camera));
 let gtao=null;if(ao){try{gtao=new GTAOPass(scene,camera,size.x,size.y);gtao.output=GTAOPass.OUTPUT.Default;gtao.updateGtaoMaterial({radius:.6,distanceExponent:1.2,thickness:1.2,scale:1,samples:12,distanceFallOff:1,screenSpaceRadius:false});gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});gtao.blendIntensity=.8;composer.addPass(gtao)}catch{gtao=null}}
 const bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.18,.7,.92);composer.addPass(bloom);
 const grade=new ShaderPass(GradeShader);composer.addPass(grade);
 composer.addPass(new OutputPass());
 return {composer,gtao,bloom,grade,setSize(w,h,pr){composer.setPixelRatio(pr);composer.setSize(w,h)},render(){composer.render()},dispose(){composer.dispose()}};
}

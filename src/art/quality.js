// Wild Frontier quality tiers - mobile-first adaptive rendering.
export const TIERS={
 low:{label:'Low',pixelRatio:.9,shadowMap:768,shadows:true,post:false,ao:false,grass:.28,foliage:.42,texture:256,physical:false,pcss:false,maxFps:30,lod:'aggressive',shadowDistance:18},
 medium:{label:'Medium',pixelRatio:1.15,shadowMap:1536,shadows:true,post:false,ao:false,grass:.58,foliage:.72,texture:512,physical:false,pcss:false,maxFps:60,lod:'balanced',shadowDistance:28},
 high:{label:'High',pixelRatio:1.5,shadowMap:2048,shadows:true,post:true,ao:true,grass:.9,foliage:.95,texture:512,physical:true,pcss:true,maxFps:60,lod:'quality',shadowDistance:38},
};
export function detectTier(){
 try{const q=new URLSearchParams(location.search).get('quality');if(q&&TIERS[q])return q;const saved=localStorage.getItem('wildfrontier.quality');if(saved&&TIERS[saved])return saved}catch{}
 const coarse=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
 const mem=(typeof navigator!=='undefined'&&navigator.deviceMemory)||4,cores=(typeof navigator!=='undefined'&&navigator.hardwareConcurrency)||4;
 const small=typeof innerWidth!=='undefined'&&Math.min(innerWidth,innerHeight)<700;
 if(coarse||small)return mem>=6&&cores>=8?'medium':'low';
 return cores>=8&&mem>=8?'high':'medium';
}
export function createGovernor(onChange,start){
 let tier=start,frames=0,acc=0,slow=0,last=performance.now(),cooldown=0;const order=['high','medium','low'];
 return {get tier(){return tier},set(t){if(TIERS[t]&&t!==tier){tier=t;slow=0;cooldown=5000;onChange(t)}},tick(now=performance.now()){
  const dt=now-last;last=now;if(dt<=0||dt>1000)return;frames++;acc+=dt;cooldown=Math.max(0,cooldown-dt);
  if(acc>=1800){const fps=frames*1000/acc;frames=0;acc=0;const target=TIERS[tier].maxFps===30?26:50;const danger=TIERS[tier].maxFps===30?20:28;
   if(fps<danger&&cooldown===0){slow++;if(slow>=2){const i=order.indexOf(tier);if(i<order.length-1){tier=order[i+1];slow=0;cooldown=7000;onChange(tier,fps)}}}else if(fps>=target)slow=0;return fps}
 }};
}

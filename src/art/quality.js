// Quality tiers. The same art ships everywhere; tiers only change resolution, shadows, post-processing and density.
export const TIERS={
 low:{label:'Low',pixelRatio:1,shadowMap:1024,shadows:true,post:false,ao:false,grass:.35,foliage:.5,texture:256,physical:false,pcss:false,maxFps:30},
 medium:{label:'Medium',pixelRatio:1.25,shadowMap:2048,shadows:true,post:false,ao:false,grass:.65,foliage:.8,texture:512,physical:false,pcss:false,maxFps:60},
 high:{label:'High',pixelRatio:1.75,shadowMap:3072,shadows:true,post:true,ao:true,grass:1,foliage:1,texture:512,physical:true,pcss:true,maxFps:60},
};
export function detectTier(){
 try{
  const q=new URLSearchParams(location.search).get('quality');if(q&&TIERS[q])return q;
  const saved=localStorage.getItem('wildfrontier.quality');if(saved&&TIERS[saved])return saved;
 }catch{}
 const coarse=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
 const mem=navigator.deviceMemory||4,cores=navigator.hardwareConcurrency||4;
 const small=Math.min(innerWidth,innerHeight)<700;
 if(coarse||small)return mem>=6&&cores>=8?'medium':'low';
 return cores>=8&&mem>=8?'high':'medium';
}
// Watches frame times and steps the tier down when the device cannot keep up (and never back up automatically).
export function createGovernor(onChange,start){
 let tier=start,frames=0,acc=0,slow=0,last=performance.now(),cooldown=0;const order=['high','medium','low'];
 return {
  get tier(){return tier},
  set(t){if(TIERS[t]&&t!==tier){tier=t;slow=0;onChange(t)}},
  tick(now=performance.now()){
   const dt=now-last;last=now;if(dt>1000){return}
   frames++;acc+=dt;cooldown=Math.max(0,cooldown-dt);
   if(acc>=2000){const fps=frames*1000/acc;frames=0;acc=0;
    if(fps<22&&cooldown===0){slow++;if(slow>=2){const i=order.indexOf(tier);if(i<order.length-1){tier=order[i+1];slow=0;cooldown=6000;onChange(tier,fps)}}}else if(fps>=26)slow=0;
    return fps}
  },
 };
}

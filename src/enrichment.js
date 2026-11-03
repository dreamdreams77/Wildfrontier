// Behavioural enrichment: objects animals choose to use. Welfare is more than food and water; captive animals get
// bored, and the right object for the right species reduces boredom and stress.
export const ENRICHMENT={
 climbing:{label:'Climbing frame',icon:'🧗',cost:140,r:1.6,blurb:'Platforms and logs to climb and survey from.',prefer:['africanLion','bengalTiger','cheetah','bobcat','squirrel','raccoon','opossum']},
 digging:{label:'Digging pit',icon:'⛏',cost:90,r:1.5,blurb:'Loose soil to dig, roll and dust-bathe in.',prefer:['fox','raccoon','skunk','opossum','rabbit','indianRhino','plainsZebra','africanElephant']},
 puzzle:{label:'Puzzle feeder',icon:'🧩',cost:120,r:1.0,blurb:'Food hidden in puzzles that reward problem solving.',prefer:['africanElephant','giraffe','raccoon','squirrel','africanLion','bengalTiger','bobcat','cheetah','redWolf']},
 scratch:{label:'Scratching post',icon:'🪵',cost:70,r:.9,blurb:'A sturdy post for rubbing, scratching and marking.',prefer:['africanLion','bengalTiger','cheetah','indianRhino','africanElephant','plainsZebra','bobcat','deer','redWolf']},
 scent:{label:'Scent station',icon:'🌿',cost:60,r:.9,blurb:'Herbs and spices to investigate. Great for predators.',prefer:['bengalTiger','africanLion','cheetah','redWolf','fox','bobcat','riverOtter']},
};
// Water features count as swimming enrichment for species that actually swim or bathe.
export const SWIMMERS=new Set(['bengalTiger','africanElephant','indianRhino','flamingo','beaver','riverOtter','woodDuck','whoopingCrane']);
export const ENRICH_TYPES=[...Object.keys(ENRICHMENT),'pond','wallow'];
export function enrichmentFit(kind,type){
 if(type==='pond'||type==='wallow')return SWIMMERS.has(kind)?1:0;
 const e=ENRICHMENT[type];if(!e)return 0;
 return e.prefer.includes(kind)?1:.35;
}
export const BOREDOM_RELIEF=32,STRESS_RELIEF=9;

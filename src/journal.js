// Wildlife journal, photography scoring and map discovery. Pure logic; the UI and renderer live elsewhere.

export const WOODLAND={
 deer:{common:'White-tailed deer',latin:'Odocoileus virginianus',diet:'Browse, shoots, acorns and clover',habitat:'Woodland edge and meadow',status:'Least concern',behaviour:'Freezes, then bounds away with its white tail raised when alarmed.',emoji:'🦌'},
 rabbit:{common:'Eastern cottontail',latin:'Sylvilagus floridanus',diet:'Grasses, clover and bark in winter',habitat:'Meadow edges and thickets',status:'Least concern',behaviour:'Dashes in zig-zags and thumps a warning.',emoji:'🐇'},
 fox:{common:'Red fox',latin:'Vulpes vulpes',diet:'Small mammals, birds, insects and berries',habitat:'Pine fringe and forest edge',status:'Least concern',behaviour:'Hunts at dusk, pouncing in a high arc.',emoji:'🦊'},
 owl:{common:'Barred owl',latin:'Strix varia',diet:'Rodents, amphibians and small birds',habitat:'Mature woodland canopy',status:'Least concern',behaviour:'Calls "who cooks for you?" at night.',emoji:'🦉'},
 squirrel:{common:'Eastern gray squirrel',latin:'Sciurus carolinensis',diet:'Nuts, seeds and buds',habitat:'Oak woodland',status:'Least concern',behaviour:'Caches acorns, which helps regrow the forest.',emoji:'🐿️'},
 bird:{common:'Carolina wren',latin:'Thryothorus ludovicianus',diet:'Insects and spiders',habitat:'Bramble and creekside cover',status:'Least concern',behaviour:'Pairs sing loud duets.',emoji:'🐦'},
 raccoon:{common:'Common raccoon',latin:'Procyon lotor',diet:'Omnivore: crayfish, fruit, eggs',habitat:'Creek banks and hollow logs',status:'Least concern',behaviour:'Feels for food in the shallows with sensitive paws.',emoji:'🦝'},
 beaver:{common:'North American beaver',latin:'Castor canadensis',diet:'Bark, twigs and aquatic plants',habitat:'Creeks and ponds',status:'Least concern',behaviour:'Builds dams that create wetland habitat.',emoji:'🦫'},
 skunk:{common:'Striped skunk',latin:'Mephitis mephitis',diet:'Insects, grubs and small mammals',habitat:'Fern edges and burrows',status:'Least concern',behaviour:'Stamps and raises its tail before spraying.',emoji:'🦨'},
 turtle:{common:'Eastern box turtle',latin:'Terrapene carolina',diet:'Greens, fungi, slugs and berries',habitat:'Wet meadow and leaf litter',status:'Vulnerable',behaviour:'Closes its hinged shell completely when threatened.',emoji:'🐢'},
 cardinal:{common:'Northern cardinal',latin:'Cardinalis cardinalis',diet:'Seeds, fruit and insects',habitat:'Berry thickets',status:'Least concern',behaviour:'Males sing from high perches at dawn.',emoji:'🐦'},
 woodDuck:{common:'Wood duck',latin:'Aix sponsa',diet:'Seeds, acorns and aquatic insects',habitat:'Wooded creeks and coves',status:'Least concern',behaviour:'Nests in tree cavities above the water.',emoji:'🦆'},
 opossum:{common:'Virginia opossum',latin:'Didelphis virginiana',diet:'Omnivorous scavenger',habitat:'Fern edge and hollow logs',status:'Least concern',behaviour:'May "play dead" when frightened.',emoji:'🐾'},
 riverOtter:{common:'North American river otter',latin:'Lontra canadensis',diet:'Fish and crayfish',habitat:'Clean creeks and pools',status:'Least concern',behaviour:'Slides down muddy banks for play.',emoji:'🦦'},
 bobcat:{common:'Bobcat',latin:'Lynx rufus',diet:'Rabbits, rodents and birds',habitat:'Rocky pine edge',status:'Least concern',behaviour:'Stalks silently and ambushes prey.',emoji:'🐈'},
 redWolf:{common:'Red wolf',latin:'Canis rufus',diet:'Small deer, rabbits and rodents',habitat:'Quiet woodland range',status:'Critically Endangered',behaviour:'Lives in small family packs and howls to communicate.',emoji:'🐺'},
 whoopingCrane:{common:'Whooping crane',latin:'Grus americana',diet:'Wetland fish, crabs and plants',habitat:'Shallow wetlands',status:'Endangered',behaviour:'Pairs perform a bowing dance.',emoji:'🪽'},
 greatBlueHeron:{common:'Great blue heron',latin:'Ardea herodias',diet:'Fish, frogs and small rodents',habitat:'Marsh pools',status:'Least concern',behaviour:'Stands motionless before a lightning-fast strike.',emoji:'🪽'},
};

export const LANDMARKS=[
 {id:'hq',label:'Ranger hut',x:-19,z:10,emoji:'🏠',start:true},
 {id:'clinic',label:'Treatment wing',x:-21,z:5,emoji:'🏥',start:true},
 {id:'yard',label:'Recovery yard',x:-12,z:7,emoji:'🌿',start:true},
 {id:'lodge',label:'Research lodge',x:-21,z:-7,emoji:'🔬'},
 {id:'oak',label:'Old oak',x:-3,z:-5,emoji:'🌳'},
 {id:'creek',label:'Creek',x:7,z:2,emoji:'💧'},
 {id:'falls',label:'Creek falls',x:1.1,z:-18.5,emoji:'🌊'},
 {id:'thicket',label:'Berry thicket',x:14,z:-8,emoji:'🫐'},
 {id:'gate',label:'Safari gate',x:17,z:0,emoji:'🚪',safari:true},
 {id:'platform',label:'Waterhole platform',x:26,z:5,emoji:'🔭',safari:true},
 {id:'kopje',label:'Lion kopje',x:24,z:-9,emoji:'🪨',safari:true},
 {id:'bamboo',label:'Bamboo thicket',x:21,z:12,emoji:'🎋',safari:true},
 {id:'grove',label:'Acacia grove',x:31,z:-1,emoji:'🌳',safari:true},
 {id:'plains',label:'Open plains',x:30,z:-9,emoji:'🌾',safari:true},
 {id:'wallow',label:'Rhino wallow',x:37,z:10,emoji:'🟤',safari:true},
 {id:'lake',label:'Soda lake',x:38,z:-10,emoji:'🦩',safari:true},
];
export const MAP_BOUNDS={minX:-27,maxX:45,minZ:-21,maxZ:23};
export const DISCOVER_RADIUS=9;

const RARITY={'Critically Endangered':1.6,Endangered:1.5,Vulnerable:1.25,'Near threatened':1.15};
export const rarityOf=status=>RARITY[status]||1;

// Photo quality: closer, better centred and more interesting behaviour scores higher (0-100).
export function scorePhoto({dist,offset=0,label='resting',status='Least concern',maxDist=28}){
 if(dist>maxDist)return 0;
 const interest={resting:0,active:8,foraging:12,playful:16,young:20,expecting:16}[label]??0;
 const s=35+35*(1-dist/maxDist)+20*(1-Math.min(1,offset))+interest;
 return Math.round(Math.min(100,s*(1+(rarityOf(status)-1)*.2)));
}

export function createJournal(species={}){
 const state={entries:{},photos:0,landmarks:{},explored:0};
 for(const l of LANDMARKS)if(l.start)state.landmarks[l.id]=true;
 const info=kind=>species[kind]?{common:species[kind].common,latin:species[kind].latin,diet:species[kind].foods?species[kind].foods.join(', '):species[kind].diet,habitat:species[kind].habitat,status:species[kind].status,behaviour:species[kind].routine,emoji:species[kind].emoji,region:species[kind].region,heritage:species[kind].heritage,notes:species[kind].notes}:WOODLAND[kind]||null;
 const entry=kind=>(state.entries[kind]??={kind,first:null,sightings:0,photos:[],behaviours:[],bestScore:0});
 function sight(kind,day=0){
  if(!info(kind))return {first:false};const e=entry(kind);const first=e.first===null;if(first)e.first=day;e.sightings++;return {first};
 }
 function recordPhoto({kind,score,label='resting',img=null,day=0}){
  const inf=info(kind);if(!inf)return {ok:false,message:'Nothing identifiable in frame.'};
  if(score<=0)return {ok:false,message:'Too far away to identify. Move closer or zoom in.'};
  const e=entry(kind);const firstSighting=e.first===null;if(firstSighting)e.first=day;e.sightings++;state.photos++;
  const mult=rarityOf(inf.status);const rewards={funds:0,credits:0,reputation:0};
  const firstPhoto=e.photos.length===0;
  if(firstPhoto){rewards.funds+=Math.round(40*mult);rewards.reputation+=1;if(mult>1)rewards.credits+=1}
  const newBehaviour=!e.behaviours.includes(label)&&label!=='resting';
  if(newBehaviour){e.behaviours.push(label);rewards.funds+=Math.round(20*mult);if(label==='young'||label==='expecting')rewards.reputation+=1}
  const newBest=score>e.bestScore;if(newBest)e.bestScore=score;
  e.photos.push({img,score,label,day});e.photos.sort((a,b)=>b.score-a.score);if(e.photos.length>3)e.photos.length=3;
  const quality=score>=85?'Superb':score>=65?'Good':score>=45?'Fair':'Poor';
  const parts=[quality+' shot of '+inf.common.toLowerCase()+' ('+score+')'];
  if(firstPhoto)parts.push('new journal photo');if(newBehaviour)parts.push('new behaviour: '+label);
  return {ok:true,message:parts.join(' · ')+(rewards.funds?' · +'+rewards.funds+' funds':''),rewards,score,quality,firstPhoto,newBehaviour,newBest,firstSighting};
 }
 function discoverLandmark(id){
  if(state.landmarks[id])return false;if(!LANDMARKS.some(l=>l.id===id))return false;state.landmarks[id]=true;state.explored++;return true;
 }
 function exploreAt(x,z){
  const found=[];for(const l of LANDMARKS)if(!state.landmarks[l.id]&&Math.hypot(l.x-x,l.z-z)<=DISCOVER_RADIUS&&discoverLandmark(l.id))found.push(l);return found;
 }
 function progress(allKinds){
  const kinds=allKinds||[...Object.keys(WOODLAND),...Object.keys(species)];
  const found=kinds.filter(k=>state.entries[k]?.first!==null&&state.entries[k]).length;
  const photographed=kinds.filter(k=>state.entries[k]?.photos.length).length;
  return {species:kinds.length,discovered:found,photographed,landmarks:LANDMARKS.filter(l=>state.landmarks[l.id]).length,landmarkTotal:LANDMARKS.length,photos:state.photos};
 }
 const serialize=()=>JSON.parse(JSON.stringify(state));
 const restore=d=>{
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);if(!obj(d))return;
  const entries={};if(obj(d.entries))for(const [k,e] of Object.entries(d.entries)){if(!obj(e))continue;entries[k]={kind:k,first:null,sightings:0,behaviours:[],bestScore:0,...e,photos:Array.isArray(e.photos)?e.photos.filter(obj):[],behaviours:Array.isArray(e.behaviours)?e.behaviours:[]}}
  const landmarks={...state.landmarks};if(obj(d.landmarks))for(const [k,v] of Object.entries(d.landmarks))if(v&&LANDMARKS.some(l=>l.id===k))landmarks[k]=true;
  Object.assign(state,{entries,photos:Number.isFinite(d.photos)?d.photos:0,landmarks,explored:Number.isFinite(d.explored)?d.explored:0});
 };
 return {state,info,sight,recordPhoto,discoverLandmark,exploreAt,progress,serialize,restore,entry};
}

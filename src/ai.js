// Animal minds: needs-driven, personality-driven behaviour selection. Pure logic (no rendering); the world feeds it a
// snapshot of what an animal can perceive and gets back what the animal wants to do and where.
//
// Priorities are real: a frightened animal stops eating and runs; a thirsty animal walks to water; rain sends sensitive
// species to shelter; bored captive animals pace, and animals that trust a keeper walk up to say hello.

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export const PREDATORS=new Set(['fox','redWolf','bobcat','owl','africanLion','bengalTiger','cheetah','greatBlueHeron']);
// diet: herb | carn | omni | insect | fish; act: day | night | dusk; social: solo | pair | herd | pack | flock
// skit: how easily startled (0-1); fleeAt: distance (units) a stranger can approach before it bolts; rain: seeks shelter in rain
const P=(diet,act,social,skit,fleeAt,o={})=>({diet,act,social,skit,fleeAt,rain:false,run:2.2,radius:3.4,cohesion:3,preyOf:[],water:.5,...o});
export const PROFILES={
 deer:P('herb','dusk','herd',.85,9,{run:3,cohesion:4,radius:4.5}),
 rabbit:P('herb','dusk','pair',.95,7,{run:3,radius:3,rain:true}),
 fox:P('carn','night','solo',.7,8,{run:2.6,radius:4.5}),
 redWolf:P('carn','dusk','pack',.75,9,{run:2.8,cohesion:3.5,radius:5}),
 bobcat:P('carn','dusk','solo',.8,9,{run:2.8,radius:4.5}),
 raccoon:P('omni','night','solo',.5,5,{water:.8}),
 skunk:P('insect','night','solo',.35,3.5,{run:1.4}),
 opossum:P('omni','night','solo',.55,4.5,{run:1.5}),
 squirrel:P('herb','day','solo',.8,6,{run:3,radius:3}),
 beaver:P('herb','night','pair',.65,7,{water:1,radius:3}),
 riverOtter:P('fish','dusk','pair',.6,7,{water:1,run:2.4}),
 owl:P('carn','night','solo',.5,6,{run:2}),
 bird:P('insect','day','pair',.85,5,{run:2.5,rain:true}),
 cardinal:P('herb','day','pair',.85,5,{run:2.5,rain:true}),
 woodDuck:P('omni','dawn','flock',.7,6,{water:1,cohesion:2.2}),
 turtle:P('omni','day','solo',.3,3,{run:1.2,water:.7}),
 whoopingCrane:P('omni','day','pair',.7,9,{water:.9,cohesion:2.5}),
 greatBlueHeron:P('fish','dusk','solo',.7,9,{water:1}),
 africanLion:P('carn','dusk','pack',.35,6,{run:2.6,cohesion:3.5,radius:5}),
 bengalTiger:P('carn','dusk','solo',.4,6,{run:2.6,radius:5,water:.9}),
 cheetah:P('carn','day','solo',.7,9,{run:3.2,radius:6}),
 africanElephant:P('herb','day','herd',.3,5,{run:1.8,cohesion:4,water:.9,radius:5.5}),
 giraffe:P('herb','day','herd',.6,8,{run:2.6,cohesion:4.5,radius:5.5}),
 plainsZebra:P('herb','day','herd',.7,8,{run:3,cohesion:3.5,radius:5.5}),
 indianRhino:P('herb','dusk','solo',.35,6,{run:2.2,water:1,radius:4.5}),
 flamingo:P('omni','day','flock',.55,7,{water:1,cohesion:2.6,run:2}),
};
const DEFAULT=P('omni','day','solo',.5,6);
export const profileOf=kind=>PROFILES[kind]||DEFAULT;

const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967296};
const KEY={bold:/bold|confident|territorial|alert/i,shy:/shy|nervous|wary|cautious|startled|sensitive/i,social:/social|affection|gregarious|playful|family|herd/i,solitary:/solitary|independent|quiet|stealth/i,curious:/curious|inquisitive|clever|explor|playful/i,calm:/calm|gentle|placid|steady|patient|unhurried/i};
// Personality is derived from the animal's description and a stable per-individual hash, so the same animal always
// has the same temperament, and two animals of one species differ.
export function ensureProfile(a){
 if(a.traits&&a.history)return a;
 const text=String(a.personality||'');const h=k=>hash(a.id+k);
 const t={bold:.35+h('b')*.4,social:.35+h('s')*.4,curious:.35+h('c')*.4,calm:.35+h('k')*.4};
 if(KEY.bold.test(text))t.bold+=.25;if(KEY.shy.test(text))t.bold-=.25;if(KEY.social.test(text))t.social+=.25;if(KEY.solitary.test(text))t.social-=.25;if(KEY.curious.test(text))t.curious+=.25;if(KEY.calm.test(text))t.calm+=.25;
 for(const k of Object.keys(t))t[k]=Math.round(clamp(t[k])*100)/100;
 a.traits=t;a.history=a.history||[];if(a.boredom===undefined)a.boredom=25+Math.round(h('o')*20);
 return a;
}
export const bondLabel=trust=>trust>=70?'Trusting':trust>=40?'Familiar':trust>=15?'Curious of keepers':'Wary of people';
export const temperamentLabel=t=>(t.bold>.65?'bold':t.bold<.4?'shy':'measured')+', '+(t.social>.65?'sociable':t.social<.4?'independent':'moderately social')+', '+(t.curious>.65?'inquisitive':t.calm>.65?'placid':'watchful');

// Which behaviours exist and which animation each maps to in the rig.
const ANIM={flee:'idle',shelter:'idle',drink:'drink',eat:'forage',rest:'rest',socialize:'idle',herd:'idle',enrich:'play',investigate:'idle',patrol:'idle',explore:'idle',groom:'groom',alert:'idle',scratch:'scratch',play:'play'};

export function createBrain({rng=Math.random}={}){
 const newMind=()=>({behaviour:'explore',target:null,timer:0,fear:0,threat:null,thinks:0,workLeft:0,arrived:false,seed:rng()});
 // snapshot -> decision. agent: {id,kind,x,z,home,traits,trust,stress,hunger,thirst,energy,boredom,social,sleeping,young,mind,state}
 // env: {phase,night,rain,storm,ranger:{x,z,moving},visitors:[{x,z}],others:[{id,kind,x,z,behaviour,fear}],points:{water,shelter,food,enrich,cover},radius}
 function think(agent,env,dt=0){
  const prof=profileOf(agent.kind),T=agent.traits||{bold:.5,social:.5,curious:.5,calm:.5},m=agent.mind||(agent.mind=newMind());
  m.fear=Math.max(0,m.fear-dt*.1);m.thinks++;
  const me={x:agent.x,z:agent.z};
  // ---- perception: what frightens me?
  let threatVec={x:0,z:0},fear=m.fear;
  const trustF=1-clamp(agent.trust/100)*.85,boldF=1-T.bold*.45,stressF=1+clamp(agent.stress/100)*.4;
  const push=(src,strength)=>{if(strength<=0)return;const d=Math.max(.5,dist(me,src));threatVec.x+=(me.x-src.x)/d*strength;threatVec.z+=(me.z-src.z)/d*strength;fear=Math.max(fear,Math.min(1,strength))};
  if(env.ranger){const d=dist(me,env.ranger);const notice=prof.fleeAt*trustF*boldF*stressF*(env.ranger.moving?1.25:.8);if(d<notice)push(env.ranger,(1-d/notice)*prof.skit*(.6+.4*trustF)*1.5)}
  let crowd=0;for(const v of env.visitors||[]){const d=dist(me,v);if(d<5.5*prof.skit+1.5)crowd++}
  if(crowd)push(env.visitors[0],Math.min(.7,crowd*.14)*prof.skit*trustF*1.5);
  const isPred=PREDATORS.has(agent.kind);let kin=[],alarm=0,nearestKin=null;
  for(const o of env.others||[]){if(o.id===agent.id)continue;const d=dist(me,o);
   if(!isPred&&PREDATORS.has(o.kind)&&o.kind!==agent.kind&&d<9*prof.skit+3&&o.behaviour!=='rest'&&((agent.kind!=='owl'&&agent.kind!=='greatBlueHeron')))push(o,(1-d/(9*prof.skit+3))*.9);
   if(o.kind===agent.kind){kin.push(o);if(d<12&&o.behaviour==='flee'&&o.fear>.5)alarm=Math.max(alarm,.55*(1-d/12)+.2)}
  }
  if(alarm){fear=Math.max(fear,alarm*prof.skit*1.2);threatVec.x+=(me.x-(kin.find(k=>k.behaviour==='flee')||me).x||0)*.05}
  m.fear=Math.min(1,fear);
  // ---- urgency of each drive
  const U={};const hunger=agent.hunger,thirst=agent.thirst;
  U.flee=m.fear>.3?m.fear*1.4:0;
  U.shelter=env.storm?.85:(env.rain&&prof.rain?.55:0);
  U.drink=thirst>45?clamp((thirst-35)/65)*(.8+prof.water*.4):0;
  U.eat=hunger>40?clamp((hunger-30)/70)*.95:0;
  const mismatch=(prof.act==='night'&&!env.night)||(prof.act!=='night'&&env.night);
  U.rest=agent.sleeping?1.2:agent.energy<25?clamp((25-agent.energy)/25)*.9:(mismatch&&!(env.phase==='Dawn'||env.phase==='Dusk')?.5:0);
  const isolated=prof.social!=='solo'&&kin.length>0&&!kin.some(k=>dist(me,k)<prof.cohesion*2.2);
  U.herd=isolated?.45+T.social*.3:0;
  U.socialize=prof.social!=='solo'?clamp((100-(agent.social??60))/100)*T.social*.4:0;
  const places=env.points&&env.points.enrich?env.points.enrich:[];
  U.enrich=places.length&&agent.boredom>35?clamp(agent.boredom/100)*(.45+T.curious*.5):0;
  U.patrol=agent.boredom>78&&!places.length?clamp((agent.boredom-70)/30)*.7:0;
  U.groom=(.1+T.calm*.1)*(m.fear<.1?1:0);
  U.explore=.14+T.curious*.2;
  const rd=env.ranger?dist(me,env.ranger):99;
  U.investigate=agent.trust>35&&T.curious>.35&&rd<14&&!(agent.sleeping)?clamp(agent.trust/100)*T.curious*.75:0;
  const cur=m.behaviour;if(U[cur]!==undefined)U[cur]+=.13;
  let best='explore',bu=-1;for(const k of Object.keys(U))if(U[k]>bu){bu=U[k];best=k}
  // ---- targets
  const home=agent.home,R=(env.radius||prof.radius);
  const nearest=(list)=>{let b=null,bd=1e9;for(const p of list||[]){const d=dist(me,p);if(d<bd){bd=d;b=p}}return b};
  const inside=(p)=>{const dx=p.x-home.x,dz=p.z-home.z,d=Math.hypot(dx,dz),lim=R*(best==='flee'?3:1.6);return d>lim?{x:home.x+dx/d*lim,z:home.z+dz/d*lim}:p};
  let target=null,speed=1,duration=3+rng()*4,anim=ANIM[best]||'idle';
  switch(best){
   case 'flee':{const l=Math.hypot(threatVec.x,threatVec.z)||1;const run=prof.run*(2.2+m.fear);target=inside({x:me.x+threatVec.x/l*run*2.2,z:me.z+threatVec.z/l*run*2.2});speed=prof.run;duration=1.6+m.fear*2;break}
   case 'shelter':{const s=nearest(env.points&&env.points.shelter)||nearest(env.points&&env.points.cover);target=s?{x:s.x,z:s.z}:me;speed=1.3;duration=6+rng()*4;anim=s&&dist(me,s)<1.2?'rest':'idle';break}
   case 'drink':{const w=nearest(env.points&&env.points.water);if(w){const d=Math.max(.1,dist(me,w));target={x:w.x+(me.x-w.x)/d*Math.min(.9,d),z:w.z+(me.z-w.z)/d*Math.min(.9,d)}}else target=me;duration=3+rng()*3;break}
   case 'eat':{const f=nearest(env.points&&env.points.food);if(f&&hunger>60){target={x:f.x,z:f.z+.6};anim='feed'}else{target={x:home.x+(rng()-.5)*R*1.4,z:home.z+(rng()-.5)*R*1.4};anim=prof.diet==='carn'?'forage':'forage'}duration=4+rng()*5;break}
   case 'rest':target=me;duration=6+rng()*8;break;
   case 'herd':case 'socialize':{if(kin.length){let cx=0,cz=0;for(const k of kin){cx+=k.x;cz+=k.z}cx/=kin.length;cz/=kin.length;const a=rng()*6.28,j=prof.cohesion*(.4+rng()*.6);target={x:cx+Math.cos(a)*j,z:cz+Math.sin(a)*j}}else target={x:home.x,z:home.z};duration=4+rng()*4;break}
   case 'enrich':{const p=nearest(places);target=p?{x:p.x+(rng()-.5)*.8,z:p.z+(rng()-.5)*.8}:me;m.enrichId=p&&p.id;m.enrichType=p&&p.type;duration=5+rng()*4;break}
   case 'investigate':{const d=Math.max(.1,rd);const keep=2.2+(1-clamp(agent.trust/100))*2;target={x:env.ranger.x+(me.x-env.ranger.x)/d*keep,z:env.ranger.z+(me.z-env.ranger.z)/d*keep};duration=3+rng()*3;speed=.9;break}
   case 'patrol':{const a=(m.thinks*.9+m.seed*6.28);target={x:home.x+Math.cos(a)*R*.85,z:home.z+Math.sin(a)*R*.85};duration=2+rng()*2;speed=1.1;anim='idle';break}
   case 'groom':target=me;duration=2.5+rng()*3;anim=rng()<.4?'scratch':'groom';break;
   default:{const a=rng()*6.28,r=R*(.3+rng()*.9);target=inside({x:home.x+Math.cos(a)*r,z:home.z+Math.sin(a)*r});duration=3+rng()*5}
  }
  m.behaviour=best;m.target=target;m.timer=duration;m.speed=speed;m.anim=anim;m.arrived=false;m.urgency=bu;
  return {behaviour:best,target,speed,anim,duration,fear:m.fear,urgency:bu};
 }
 return {think,newMind};
}

// Alarm calls other animals hear. Returns the sound the species makes, if any (used by audio and for herd warnings).
export const CALLS={deer:'snort',rabbit:'thump',fox:'bark',redWolf:'howl',owl:'hoot',bird:'chirp',cardinal:'chirp',woodDuck:'quack',whoopingCrane:'trumpet',greatBlueHeron:'squawk',africanLion:'roar',bengalTiger:'roar',africanElephant:'trumpet',giraffe:'hum',plainsZebra:'bark',cheetah:'chirp',indianRhino:'snort',flamingo:'honk',squirrel:'chatter',raccoon:'chitter',beaver:'slap',riverOtter:'whistle',bobcat:'yowl',skunk:'stomp',opossum:'hiss',turtle:'hiss'};

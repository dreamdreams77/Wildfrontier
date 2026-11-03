const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));

const initialAnimals=[
  {id:'fawn-01',kind:'deer',name:'Juniper',species:'White-tailed deer · fawn',condition:'Injured · needs assessment',location:'North meadow',health:42,hydration:38,nutrition:54,stress:68,trust:12,stage:'sighted',injury:'A shallow cut on the rear leg; movement is uneven.',notes:'Found alone near the old oak. Keep a quiet approach and let the ranger assess before handling.'},
  {id:'rabbit-01',kind:'rabbit',name:'Clover',species:'Eastern cottontail',condition:'Stable · wild resident',location:'Clover patch',health:94,hydration:76,nutrition:71,stress:18,trust:0,stage:'wild',injury:'No visible injury.',notes:'Foraging normally. Best support is a healthy, undisturbed meadow.'},
  {id:'rabbit-02',kind:'rabbit',name:'Pip',species:'Eastern cottontail',condition:'Stable · wild resident',location:'Fern edge',health:88,hydration:63,nutrition:58,stress:24,trust:0,stage:'wild',injury:'No visible injury.',notes:'Keeps to the fern cover and is most active in the cooler hours.'}
];

export function createSimulation(){
  const animals=initialAnimals.map(a=>({...a}));
  const habitat={water:61,cover:73,food:68,disturbance:22,health:68};
  const log=[{time:'06:40',text:'Morning survey started at North Woodland.'},{time:'06:52',text:'Juniper sighted near the old oak. Possible leg injury.'}];
  let minutes=0,selectedId='fawn-01',restoration=2450,waterStation=false;
  const add=(text)=>log.unshift({time:clock(),text});
  const clock=()=>{const total=6*60+40+minutes;return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')};
  function recalc(){habitat.health=Math.round(clamp(habitat.water*.28+habitat.cover*.3+habitat.food*.26+(100-habitat.disturbance)*.16));}
  function tick(delta=1){minutes+=delta;for(const a of animals){if(a.stage==='rehabilitating'){a.health=clamp(a.health+.06*delta);a.stress=clamp(a.stress-.1*delta);a.nutrition=clamp(a.nutrition-.018*delta);a.hydration=clamp(a.hydration-.025*delta)}else if(a.stage==='wild'||a.stage==='sighted'){a.hydration=clamp(a.hydration-.018*delta);a.nutrition=clamp(a.nutrition-.012*delta);a.stress=clamp(a.stress+(habitat.disturbance>45?.025:-.012)*delta)}}recalc();}
  function selected(){return animals.find(a=>a.id===selectedId)||animals[0]}
  function select(id){if(animals.some(a=>a.id===id))selectedId=id;return selected()}
  function act(action){const a=selected();if(!a)return {ok:false,message:'No animal selected.'};
    if(action==='observe'){a.trust=clamp(a.trust+2);add('Quiet observation recorded: '+a.name+'.');return {ok:true,message:'Observation logged. You kept a respectful distance.'}}
    if(action==='track'){add('Track markers placed along '+a.location.toLowerCase()+'.');restoration=Math.min(3000,restoration+20);return {ok:true,message:'Track markers placed. Movement will be easier to monitor.'}}
    if(action==='assess'){if(a.stage!=='sighted')return {ok:false,message:'This animal does not need an initial field assessment.'};a.stage='assessed';a.condition='Assessed · transport recommended';a.health=clamp(a.health+3);a.stress=clamp(a.stress+4);add('Ranger assessment completed for '+a.name+'. Leg injury confirmed.');return {ok:true,message:'Assessment complete. A leg injury is confirmed; prepare a quiet transport.'}}
    if(action==='stabilize'){if(!['assessed','sighted'].includes(a.stage))return {ok:false,message:'Stabilization is only available at the field site.'};if(a.stage==='sighted')return {ok:false,message:'Assess the animal before attempting treatment.'};a.health=clamp(a.health+14);a.stress=clamp(a.stress-9);a.condition='Stabilized · ready for transport';a.stage='stabilized';add(a.name+' received field stabilization.');return {ok:true,message:'Field stabilization complete. Keep the carrier covered and quiet.'}}
    if(action==='transport'){if(a.stage!=='stabilized')return {ok:false,message:'Stabilize the animal before transport.'};a.stage='rehabilitating';a.location='Field station · quiet recovery';a.stress=clamp(a.stress-16);a.condition='In rehabilitation';add(a.name+' transported to the quiet recovery pen.');return {ok:true,message:a.name+' is now in the quiet recovery pen.'}}
    if(action==='feed'){if(a.stage!=='rehabilitating')return {ok:false,message:'Do not feed wild animals during field observation. Food plans are managed in rehabilitation.'};a.nutrition=clamp(a.nutrition+28);add('Measured species-appropriate feed given to '+a.name+'.');return {ok:true,message:'Measured feed served according to the recovery plan.'}}
    if(action==='water'){if(a.stage!=='rehabilitating')return {ok:false,message:'Refresh the habitat water station instead of approaching wildlife.'};a.hydration=clamp(a.hydration+32);add('Fresh water provided for '+a.name+'.');return {ok:true,message:'Fresh water refreshed in the recovery pen.'}}
    if(action==='release'){if(a.stage!=='rehabilitating')return {ok:false,message:'Only rehabilitating animals can be evaluated for release.'};if(a.health<85||a.stress>28||a.nutrition<70||a.hydration<70)return {ok:false,message:'Not ready: health, stress, hydration and nutrition must all meet release standards.'};a.stage='released';a.location='North woodland · released';a.condition='Released · monitored';add(a.name+' passed the release assessment and returned to suitable habitat.');restoration=Math.min(3000,restoration+250);return {ok:true,message:a.name+' passed the release check and returned to the woodland.'}}
    return {ok:false,message:'That field action is not available.'};
  }
  function serviceWater(){if(waterStation)return {ok:false,message:'The creekside station is already full.'};waterStation=true;habitat.water=clamp(habitat.water+24);habitat.disturbance=clamp(habitat.disturbance-3);restoration=Math.min(3000,restoration+90);recalc();add('Creekside water station cleaned and refilled.');return {ok:true,message:'Water station refilled. Habitat water quality improved.'}}
  function restoreCover(){habitat.cover=clamp(habitat.cover+12);habitat.disturbance=clamp(habitat.disturbance-5);restoration=Math.min(3000,restoration+70);recalc();add('Native cover restored along the meadow edge.');return {ok:true,message:'Native cover planted. The meadow now has more shelter.'}}
  return {animals,habitat,log,tick,select,selected,act,serviceWater,restoreCover,get restoration(){return restoration},get waterStation(){return waterStation},get time(){return clock()}};
}

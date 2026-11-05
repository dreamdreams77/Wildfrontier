import { PHASES, PHASE_LABEL, APPROACHES } from './rescue.js';
import { EQUIPMENT } from './equipment.js';

// Mission journal: live rescue cases with every step actionable, plus missions the director raised from world state.
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stars=n=>'★'.repeat(n)+'☆'.repeat(4-n);
const hm=m=>{if(m===null||m===undefined)return 'no deadline';const h=Math.floor(m/60),mm=Math.round(m%60);return h+'h '+String(mm).padStart(2,'0')+'m'};

// One card per sanctuary event: what is happening, the choices with their costs, and what was decided.
export function eventCardHtml(e,esc){
 const def=e.def,picked=e.choice;
 return '<article class="m-card ev-card"><header><b>'+def.icon+' '+esc(def.label)+'</b><span class="s-muted">'+(e.hoursLeft>=24?Math.ceil(e.hoursLeft/24)+' days left':e.hoursLeft+' h left')+'</span></header><p>'+esc(def.text)+'</p>'
  +'<div class="ev-choices">'+def.choices.map(c=>'<button data-m="evchoose" data-id="'+e.id+'" data-c="'+c.id+'" class="'+(picked===c.id?'on':'')+'" '+(picked?'disabled':'')+'><b>'+esc(c.label)+(c.cost?' · '+c.cost:'')+'</b><small>'+esc(c.text)+'</small></button>').join('')+'</div>'
  +(picked?'':'<small class="s-muted">If you do nothing, the free option applies.</small>')
  +(e.points&&e.effective==='patrol'?'<small class="s-muted">Fence posts reached: '+e.points.filter(p=>p.done).length+'/'+e.points.length+'. Follow the yellow beams on the safari fence before dawn.</small>':'')+'</article>';
}

export function mountMissionsUI({rescue,director,activities,events,sanct,world,toast,actions,afterChange,focusAnimal,openRecord,openShop}){
 let panel=null,tab='rescues',lastRender=0,pointerDown=false;
 function stepper(c){const idx=PHASES.indexOf(c.phase);return '<div class="m-steps">'+PHASES.filter(p=>p!=='closed').map((p,i)=>'<span class="'+(i<idx?'done':i===idx?'now':'')+'">'+esc(PHASE_LABEL[p])+'</span>').join('')+'</div>'}
 function caseCard(c){
  const need=c.equipment.map(e=>{const have=(sanct.state.stock[e]||0)>0;return '<span class="m-eq '+(have?'ok':'bad')+'" title="'+esc(EQUIPMENT[e].blurb)+'">'+EQUIPMENT[e].icon+' '+esc(EQUIPMENT[e].label)+(have?'':' <button data-m="shop">BUY</button>')+'</span>'}).join('')||'<span class="s-muted">no special equipment</span>';
  const urgent=c.timeLeft!==null&&c.timeLeft<120;
  let acts='';
  if(c.phase==='reported')acts='<button data-m="accept" data-id="'+c.id+'">ACCEPT &amp; MARK SEARCH AREA</button>';
  else if(c.phase==='tracking')acts='<button data-m="go" data-id="'+c.id+'">GO TO SEARCH AREA</button><small class="s-muted">Clues found: '+c.clues.filter(x=>x.found).length+'/'+c.clues.length+'. Follow the orange markers; walk close to each.</small>';
  else if(c.phase==='found')acts='<button data-m="assess" data-id="'+c.id+'">ASSESS CONDITION</button><small class="s-muted">Stand within about 7 m.</small>';
  else if(c.phase==='assessed'||c.phase==='handled'||c.phase==='transport'||c.phase==='rehab'){
   acts=c.animals.map(a=>{
    if(c.phase==='rehab'||a.stage==='rehabilitating')return '<div class="m-an"><b>'+esc(a.name)+'</b> in recovery <button data-m="record" data-id="'+a.id+'">OPEN RECORD</button></div>';
    if(!a.handled)return '<div class="m-an"><b>'+esc(a.name)+'</b> · health '+a.health+'% · stress '+a.stress+'%<span class="m-ap">'+Object.entries(APPROACHES).map(([k,ap])=>{const ok=ap.needs.every(n=>(sanct.state.stock[n]||0)>0);return '<button data-m="handle" data-id="'+c.id+'" data-an="'+a.id+'" data-ap="'+k+'" title="'+esc(ap.blurb)+'" '+(ok?'':'disabled')+'>'+esc(ap.label.toUpperCase())+'</button>'}).join('')+'</span></div>';
    return '<div class="m-an"><b>'+esc(a.name)+'</b> secured <button data-m="transport" data-id="'+c.id+'" data-an="'+a.id+'">LOAD &amp; TRANSPORT</button></div>';
   }).join('');
  }
  return '<article class="m-card'+(urgent?' urgent':'')+'"><header><b>'+esc(c.title)+'</b><span class="m-diff" title="Difficulty">'+stars(c.difficulty)+'</span></header>'
   +'<div class="s-muted">'+esc(c.spot.name)+' · '+esc(c.kind)+(c.animals.length>1?' ×'+c.animals.length:'')+' · '+(c.timeLeft===null?'no deadline':'time left <b class="'+(urgent?'bad':'')+'">'+hm(c.timeLeft)+'</b>')+'</div>'
   +stepper(c)+'<div class="m-need">Needs: '+need+'</div><div class="m-acts">'+acts+'</div></article>';
 }
 function render(){
  if(!panel)return;lastRender=Date.now();
  const R=rescue.summary(),D=director.summary();const open=R.cases.filter(c=>c.phase!=='closed');
  const rescues=open.length?open.map(caseCard).join(''):'<p class="s-muted">No rescue calls right now. Reports arrive by radio as your reputation grows. Higher difficulty cases need more equipment and give more reward.</p>';
  const ops=D.active.length?D.active.map(m=>'<article class="m-card"><header><b>'+esc(m.title)+'</b><span class="s-muted">'+m.daysLeft+' day'+(m.daysLeft===1?'':'s')+' left</span></header><p class="s-muted">'+esc(m.detail)+'</p><div class="m-acts"><small>Reward: '+(m.reward.funds?m.reward.funds+' funds ':'')+(m.reward.reputation?'· +'+m.reward.reputation+' reputation ':'')+(m.reward.credits?'· +'+m.reward.credits+' credits':'')+'</small>'+(m.focus?'<button data-m="focus" data-id="'+m.focus+'">SHOW</button>':'')+(m.rule==='habitat'?'<button data-m="build">OPEN BUILD MODE</button>':'')+'</div></article>').join(''):'<p class="s-muted">Nothing needs attention. Missions appear when something in the sanctuary needs you.</p>';
  const hist='<div class="s-stats"><div><small>CASES OPENED</small><b>'+R.stats.opened+'</b></div><div><small>RESCUED</small><b>'+R.stats.rescued+'</b></div><div><small>RELEASED</small><b>'+R.stats.released+'</b></div><div><small>LOST</small><b>'+R.stats.lost+'</b></div></div><h3>Radio log</h3><ul class="s-events">'+(R.log.map(l=>'<li><b>Day '+l.day+'</b> '+esc(l.text)+'</li>').join('')||'<li>No calls yet.</li>')+'</ul><h3>Missions</h3><ul class="s-events">'+(D.done.map(d=>'<li><b>Day '+d.day+'</b> '+esc(d.title)+' — '+d.result+'</li>').join('')||'<li>None yet.</li>')+'</ul>';
  const A=activities.summary();
  const prog='<div class="s-stats"><div><small>RESEARCH</small><b>'+A.research+'</b></div><div><small>MILESTONES</small><b>'+A.milestones.filter(m=>m.done).length+'/'+A.milestones.length+'</b></div><div><small>TREES PLANTED</small><b>'+A.counts.planted+'</b></div><div><small>LITTER</small><b>'+A.counts.litter+'</b></div></div>'
   +'<h3>Regions</h3><div class="s-list">'+A.regions.map(r=>'<article class="s-res"><div class="s-res-head"><b>'+(r.unlocked?'🗺 ':'🔒 ')+esc(r.label)+'</b><small>'+(r.unlocked?'open':'locked')+'</small></div><p class="s-muted">'+esc(r.blurb)+'</p></article>').join('')+'</div>'
   +'<h3>Research perks</h3><ul class="s-goals">'+A.perks.map(p=>'<li class="'+(p.unlocked?'done':'')+'"><span>'+(p.unlocked?'✓':'○')+'</span>'+esc(p.label)+' ('+p.at+' RP): '+esc(p.blurb)+'</li>').join('')+'</ul><p class="s-muted">Earn research by identifying tracks, logging birds from hides, testing water and planting trees. Look for the coloured rings in the world.</p>'
   +'<h3>Conservation milestones</h3><ul class="s-goals">'+A.milestones.map(m=>'<li class="'+(m.done?'done':'')+'"><span>'+(m.done?'✓':'○')+'</span><b>'+esc(m.label)+'</b> · '+esc(m.blurb)+' <small class="s-muted">(+'+(m.reward.funds||0)+' funds'+(m.reward.reputation?', +'+m.reward.reputation+' rep':'')+(m.reward.credits?', +'+m.reward.credits+' credits':'')+')</small></li>').join('')+'</ul>';
  const E=events?events.summary():{active:[],history:[]};
  const evBlock=(E.active.length?'<h3>Happening now</h3>'+E.active.map(e=>eventCardHtml(e,esc)).join(''):'')+(E.history.length?'<h3>Recent events</h3><ul class="s-events">'+E.history.slice(0,5).map(h=>'<li><b>Day '+h.day+'</b> '+esc(h.outcome)+'</li>').join('')+'</ul>':'');
  const tabs=[['rescues','RESCUES ('+open.length+')'],['ops','OPERATIONS ('+(D.active.length+E.active.length)+')'],['prog','PROGRESS'],['hist','HISTORY']];
  const eq='<div class="s-top">'+Object.entries(EQUIPMENT).map(([k,e])=>'<span>'+e.icon+' '+(R.equipment[k]||0)+'</span>').join('')+'<span>🪙 '+Math.round(sanct.state.funds)+'</span></div>';
  panel.innerHTML='<header><div><small>FIELD OPERATIONS · DAY '+sanct.state.day+'</small><h2>Mission journal</h2></div><button id="closeMissions" aria-label="Close">×</button></header><nav class="s-tabs">'+tabs.map(([k,l])=>'<button data-mt="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join('')+'</nav>'+eq+'<div class="s-body">'+(tab==='rescues'?rescues:tab==='ops'?evBlock+ops:tab==='prog'?prog:hist)+'</div>';
 }
 function onClick(e){
  const t=e.target.closest('[data-m],[data-mt],#closeMissions');if(!t)return;
  if(t.id==='closeMissions'){close();return}
  if(t.dataset.mt){tab=t.dataset.mt;render();return}
  const a=t.dataset.m,id=t.dataset.id;
  if(a==='accept'){const r=rescue.accept(id);toast(r.message);afterChange();render()}
  else if(a==='go'){const c=rescue.caseOf(id);if(c){world.ranger.position.set(c.pos.x+9,0,c.pos.z+8);world.focus(c.pos.x,c.pos.z);close();toast('You are near the search area. Look for the orange clue markers.')}}
  else if(a==='assess'){actions.assess(id);render()}
  else if(a==='handle'){actions.handle(id,t.dataset.an,t.dataset.ap);render()}
  else if(a==='transport'){actions.transport(id,t.dataset.an);render()}
  else if(a==='record'){close();focusAnimal(id);openRecord(id)}
  else if(a==='focus'){close();focusAnimal(id)}
  else if(a==='shop'){close();openShop()}
  else if(a==='build'){close();actions.build()}
  else if(a==='evchoose'){const r=events.choose(id,t.dataset.c);toast(r.message);afterChange();render()}
 }
 function open(startTab){if(panel){close();return}if(startTab)tab=startTab;panel=document.createElement('section');panel.className='sanctuary-panel missions-panel';panel.setAttribute('role','dialog');document.body.appendChild(panel);panel.addEventListener('click',onClick);panel.addEventListener('pointerdown',()=>{pointerDown=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>panel.addEventListener(ev,()=>{pointerDown=false}));render()}
 function close(){if(panel){panel.remove();panel=null}}
 function refresh(){if(!panel||pointerDown||Date.now()-lastRender<2500)return;render()}
 const badge=()=>rescue.summary().cases.filter(c=>c.phase!=='closed').length+director.summary().active.length+(events?events.summary().active.filter(e=>!e.choice).length:0);
 return {open,close,render,refresh,badge,isOpen:()=>!!panel};
}

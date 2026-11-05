import { SPECIES, FOODS, stageOf, welfareOf, MEDICINE_PRICE } from './sanctuary.js';
import { ROLES, BUILD_ITEMS } from './operations.js';
import { PROJECTS, SEGMENTS, FACILITIES } from './management.js';
import { PREP_DAYS, MIN_READINESS } from './release.js';
import { EQUIPMENT } from './equipment.js';
const escAttr=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));   // ids come from saves: never trust them in markup

// Safari sanctuary management panel: overview, residents, supplies and the breeding programme.
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bar=(v,cls='')=>'<i class="sbar '+cls+'"><em style="width:'+Math.max(0,Math.min(100,Math.round(v)))+'%"></em></i>';
const welfareClass=v=>v>=75?'good':v>=50?'ok':'bad';

export function mountSanctuaryUI({sanct,ops,mgmt,release,social,stories,seasons,rating,world,toast,afterChange,focusAnimal,openRecord,openBuild,portraits}){
 const face=(kind,fallback)=>portraits?'<img class="p-img" alt="" src="'+portraits.portrait(kind)+'">':fallback;
 let panel=null,pointerDown=false,lastRender=0,tab='overview',pairKind='africanLion',maleId='',femaleId='';

 function goals(sum){
  const founders=Math.max(...sum.species.map(s=>s.founders));
  return [
   {text:'Hire a keeper to share the daily feeding',done:(sum.ext.staff||[]).some(m=>m.role==='keeper')},
   {text:'Build a complete habitat (100%) for one species',done:sum.species.some(x=>x.habitat>=100)},
   {text:'Welcome 100 visitors in total',done:(sum.ext.visitors?.total||0)>=100},
   {text:'Keep average welfare at 80% or higher',done:sum.avgWelfare>=80},
   {text:'Welcome the first birth through the breeding programme',done:sum.births>0},
   {text:'Build a diverse population: 3+ founder lines in one species',done:founders>=3},
   {text:'Transfer a surplus animal to a partner reserve',done:sum.transfers>0},
   {text:'Reach 50 reputation',done:sum.reputation>=50},
  ];
 }

 function overview(sum){
  const g=goals(sum);
  return ratingBlock()+'<div class="s-stats"><div><small>FUNDS</small><b>'+sum.funds+'</b></div><div><small>CONSERVATION CREDITS</small><b>'+sum.credits+'</b></div><div><small>REPUTATION</small><b>'+sum.reputation+'</b></div><div><small>AVG WELFARE</small><b class="'+welfareClass(sum.avgWelfare)+'">'+sum.avgWelfare+'%</b></div></div>'
   +'<div class="s-row"><span>Water supply</span>'+bar(sum.waterLevel,sum.waterLevel<30?'low':'')+'<button data-act="water">REFILL · 20</button></div>'
   +'<div class="s-row"><span>'+sum.hungry+' hungry resident'+(sum.hungry===1?'':'s')+'</span><small class="s-muted">Nutrition under 45%</small><button data-act="feedAll">FEED ALL HUNGRY</button></div>'
   +'<h3>Species</h3><div class="s-species">'+sum.species.map(s=>'<button data-act="species" data-kind="'+s.kind+'"><span>'+face(s.kind,s.emoji)+'</span><b>'+esc(s.common)+'</b><small>'+s.count+'/'+s.capacity+' · '+s.founders+' line'+(s.founders===1?'':'s')+' · welfare '+s.welfare+'% · habitat '+s.habitat+'%</small></button>').join('')+'</div>'
   +'<h3>Sanctuary goals</h3><ul class="s-goals">'+g.map(x=>'<li class="'+(x.done?'done':'')+'"><span>'+(x.done?'✓':'○')+'</span>'+esc(x.text)+'</li>').join('')+'</ul>'
   +'<h3>Recent events</h3><ul class="s-events">'+(sum.events.length?sum.events.map(e=>'<li><b>Day '+e.day+'</b> '+esc(e.text)+'</li>').join(''):'<li>No events yet.</li>')+'</ul>'
   +'<div class="s-foot"><button data-act="travel">GO TO SAFARI GATE</button><button data-act="reset" class="s-danger">START A NEW SANCTUARY</button></div>';
 }

 function residents(){
  const list=sanct.residents().slice().sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
  return '<div class="s-list">'+list.map(a=>{const sp=SPECIES[a.kind],w=welfareOf(a);const food=sanct.preferredFood(a);
   return '<article class="s-res"><div class="s-res-head"><button data-act="open" data-id="'+escAttr(a.id)+'" class="s-link">'+face(a.kind,sp.emoji)+' <b>'+esc(a.name)+'</b></button><small>'+esc(sp.common)+' · '+stageOf(a)+(a.pregnant?' · expecting':'')+'</small><span class="s-w '+welfareClass(w)+'">'+w+'%</span></div>'
    +'<div class="s-meters"><label>Food'+bar(a.nutrition,a.nutrition<35?'low':'')+'</label><label>Water'+bar(a.hydration,a.hydration<35?'low':'')+'</label><label>Health'+bar(a.health,a.health<50?'low':'')+'</label><label>Calm'+bar(100-a.stress,a.stress>60?'low':'')+'</label><label>Interest'+bar(100-(a.boredom??30),(a.boredom??30)>70?'low':'')+'</label></div>'
    +'<div class="s-acts"><button data-act="feed" data-id="'+escAttr(a.id)+'" data-food="'+food+'">'+FOODS[food].icon+' FEED</button><button data-act="enrich" data-id="'+escAttr(a.id)+'">PLAY</button><button data-act="treat" data-id="'+escAttr(a.id)+'">VET</button></div></article>'}).join('')+'</div>';
 }

 function supplies(sum){
  const rows=Object.entries(FOODS).map(([k,f])=>'<div class="s-supply"><span>'+f.icon+'</span><div><b>'+esc(f.label)+'</b><small>'+sum.stock[k]+' in stock · '+f.price+' each</small></div><button data-act="buy" data-food="'+k+'" data-qty="5">+5</button><button data-act="buy" data-food="'+k+'" data-qty="20">+20</button></div>').join('');
  const equip='<h3>Rescue equipment</h3>'+Object.entries(EQUIPMENT).map(([k,e])=>'<div class="s-supply"><span>'+e.icon+'</span><div><b>'+esc(e.label)+'</b><small>'+(sum.stock[k]||0)+' in stock · '+e.price+(e.consumed?' each · used up':' · reusable')+' · '+esc(e.blurb)+'</small></div><button data-act="buy" data-food="'+k+'" data-qty="1">+1</button><button data-act="buy" data-food="'+k+'" data-qty="3">+3</button></div>').join('');
  const med='<div class="s-supply"><span>💉</span><div><b>Veterinary supplies</b><small>'+sum.stock.medicine+' in stock · '+MEDICINE_PRICE+' each</small></div><button data-act="buy" data-food="medicine" data-qty="1">+1</button><button data-act="buy" data-food="medicine" data-qty="5">+5</button></div>';
  const diets='<h3>Who eats what</h3><ul class="s-diets">'+Object.values(SPECIES).map(s=>'<li>'+s.emoji+' <b>'+esc(s.common)+'</b> — '+s.foods.map(f=>FOODS[f].short).join(', ')+'</li>').join('')+'</ul>';
  return '<p class="s-muted">Grants arrive each day based on reputation and welfare. Spend them on food, medicine and staff. Treats such as produce are enrichment, not a full diet.</p>'+rows+med+equip+diets;
 }

 function breeding(sum){
  const sp=SPECIES[pairKind];const all=sanct.residents().filter(a=>a.kind===pairKind);
  const males=all.filter(a=>a.sex==='male'),females=all.filter(a=>a.sex==='female');
  if(!males.some(a=>a.id===maleId))maleId=males[0]?.id||'';if(!females.some(a=>a.id===femaleId))femaleId=females[0]?.id||'';
  const st=maleId&&femaleId?sanct.pairStatus(maleId,femaleId):{ok:false,issues:['Both a male and a female are needed.'],notes:[]};
  const sel=(id,list,name)=>'<select data-sel="'+name+'">'+list.map(a=>'<option value="'+escAttr(a.id)+'"'+(a.id===id?' selected':'')+'>'+esc(a.name)+' ('+stageOf(a)+(a.young?'':'')+', line '+esc(a.geneticLine)+')</option>').join('')+'</select>';
  const preg=sum.pregnancies.length?'<h3>Expecting</h3><ul class="s-events">'+sum.pregnancies.map(p=>'<li>'+SPECIES[p.kind].emoji+' <b>'+esc(p.name)+'</b> with '+esc(p.sire)+' · due in about '+p.daysLeft+' day'+(p.daysLeft===1?'':'s')+'</li>').join('')+'</ul>':'';
  const tree=sum.familyTree.length?'<h3>Family records</h3><ul class="s-events">'+sum.familyTree.slice(-8).reverse().map(f=>'<li>'+SPECIES[f.kind].emoji+' <b>'+esc(f.name)+'</b> · '+esc(f.species)+' · '+esc(f.parents.join(' & '))+' · '+esc(f.born)+'</li>').join('')+'</ul>':'';
  const adults=all.filter(a=>stageOf(a)==='adult');
  return '<p class="s-muted">Responsible breeding: pairs must be mature, healthy, calm, well fed and unrelated. Surplus animals can move to partner reserves, which earns credits to import new founders and keep the studbook diverse.</p>'
   +'<div class="s-pick">'+Object.entries(SPECIES).map(([k,s])=>'<button data-act="kind" data-kind="'+k+'" class="'+(k===pairKind?'on':'')+'" title="'+esc(s.common)+'">'+s.emoji+'</button>').join('')+'</div>'
   +'<h3>'+esc(sp.common)+' <small class="s-muted">'+all.length+'/'+sp.capacity+' · gestation ~'+sp.gestationDays+' days · '+esc(sp.region)+'</small></h3>'
   +'<div class="s-pair"><label>Male'+sel(maleId,males,'male')+'</label><label>Female'+sel(femaleId,females,'female')+'</label></div>'
   +'<div class="s-status '+(st.ok?'good':'bad')+'">'+(st.ok?'This pairing is suitable.':'Not ready: ')+(st.ok?'':st.issues.map(esc).join(' · '))+(st.notes.length?'<br><small>'+st.notes.map(esc).join(' ')+'</small>':'')+'</div>'
   +'<div class="s-foot"><button data-act="pair" '+(st.ok?'':'disabled')+'>START BREEDING PAIR</button><button data-act="import" data-sex="male">IMPORT FOUNDER ♂ · 10 cr</button><button data-act="import" data-sex="female">IMPORT FOUNDER ♀ · 10 cr</button></div>'
   +preg+tree
   +'<h3>Transfers to partner reserves</h3><div class="s-list">'+(adults.length?adults.map(a=>'<div class="s-supply"><span>'+sp.emoji+'</span><div><b>'+esc(a.name)+'</b><small>welfare '+welfareOf(a)+'% · line '+esc(a.geneticLine)+'</small></div><button data-act="transfer" data-id="'+escAttr(a.id)+'">TRANSFER</button></div>').join(''):'<p class="s-muted">No adults of this species.</p>')+'</div>';
 }

 function staffTab(sum){
  const x=sum.ext;const rows=(x.staff||[]).map(m=>'<article class="s-res"><div class="s-res-head"><span>'+ROLES[m.role].emoji+' <b>'+esc(m.name)+'</b></span><small>'+ROLES[m.role].label+' · skill '+m.skill+' · '+m.tasksDone+' tasks · energy '+Math.round(m.energy??100)+'% · morale '+Math.round(m.morale??70)+'%</small><span class="s-w ok">'+({idle:'resting',walk:'on the way',work:'working',return:'returning'}[m.state]||m.state)+'</span></div><div class="s-acts"><button data-act="focusStaff" data-id="'+escAttr(m.id)+'">FOLLOW</button>'+(m.skill<3?'<button data-act="train" data-id="'+escAttr(m.id)+'">TRAIN · '+90*m.skill+'</button>':'')+'<button data-act="dismiss" data-id="'+escAttr(m.id)+'" class="s-danger">DISMISS</button></div></article>').join('');
  const hire=Object.entries(ROLES).map(([k,r])=>{const n=(x.staff||[]).filter(m=>m.role===k).length;return '<div class="s-supply"><span>'+r.emoji+'</span><div><b>'+r.label+' ('+n+'/'+r.max+')</b><small>'+esc(r.blurb)+' Wage '+r.wage+'/day.</small></div><button data-act="hire" data-role="'+k+'" '+(n>=r.max?'disabled':'')+'>HIRE · '+r.cost+'</button></div>'}).join('');
  return '<p class="s-muted">Staff really walk the safari. They work 06:00–20:00 and rest at the supply shed otherwise. Daily wages: <b>'+(x.wagesPerDay||0)+'</b>'+(x.unpaid?' · <b class="bad">unpaid: work has stopped</b>':'')+'.</p>'+hire+'<h3>Team</h3><div class="s-list">'+(rows||'<p class="s-muted">No staff yet.</p>')+'</div>';
 }
 function habitatTab(sum){
  const x=sum.ext;const rows=sum.species.map(s=>{const h=x.habitat[s.kind];return '<article class="s-res"><div class="s-res-head"><button data-act="species" data-kind="'+s.kind+'" class="s-link">'+s.emoji+' <b>'+esc(s.common)+'</b></button><small>'+s.count+'/'+s.capacity+' animals</small><span class="s-w '+welfareClass(h.score)+'">'+h.score+'%</span></div>'+bar(h.score,h.score<60?'low':'')+'<p class="s-muted">'+(h.missing.length?'Missing: '+esc(h.missing.join(', ')):'Everything this species needs is within reach.')+'</p></article>'}).join('');
  return '<p class="s-muted">Habitat quality depends on what each species actually needs nearby, not on how pretty it looks. Below 60% animals become stressed; below 50% breeding is blocked.</p><div class="s-foot"><button data-act="build">OPEN BUILD MODE</button></div><div class="s-list">'+rows+'</div>';
 }
 function stars(r){const full=Math.floor(r);return '★'.repeat(full)+(r-full>=.5?'½':'')+'☆'.repeat(Math.max(0,5-Math.ceil(r)))}
 function visitorsTab(sum){
  const v=sum.ext.visitors;
  const sens={cheetah:'very sensitive',bengalTiger:'sensitive',indianRhino:'sensitive',flamingo:'moderate',africanLion:'moderate',plainsZebra:'tolerant',africanElephant:'tolerant',giraffe:'tolerant'};
  const rows=sum.species.map(s=>{const r=!!v.restricted[s.kind];return '<div class="s-supply"><span>'+s.emoji+'</span><div><b>'+esc(s.common)+'</b><small>'+(sens[s.kind]||'')+' · '+(r?'closed to visitors':'open to visitors')+'</small></div><button data-act="restrict" data-kind="'+s.kind+'" data-on="'+(r?'0':'1')+'">'+(r?'OPEN':'CLOSE')+'</button></div>'}).join('');
  return '<div class="s-stats"><div><small>TODAY</small><b>'+v.today+'</b></div><div><small>ON SITE</small><b>'+v.onSite+'/'+v.capacity+'</b></div><div><small>RATING</small><b>'+v.rating.toFixed(1)+'★</b></div><div><small>AWARENESS</small><b>'+Math.round(v.awareness)+'</b></div></div>'
   +'<div class="s-row"><span>'+(v.open?'Open to visitors':'Closed to visitors')+'</span><small class="s-muted">Rating '+stars(v.rating)+' · appeal '+v.appeal+'</small><button data-act="vopen" data-on="'+(v.open?'0':'1')+'">'+(v.open?'CLOSE SANCTUARY':'OPEN SANCTUARY')+'</button></div>'
   +'<div class="s-row"><span>Ticket price: '+v.price+'</span><small class="s-muted">Lower prices bring more visitors; higher prices earn more per head.</small><span class="s-acts"><button data-act="price" data-d="-2">−</button><button data-act="price" data-d="2">+</button></span></div>'
   +'<p class="s-muted">Yesterday: tickets +'+v.lastIncome+', donations +'+v.lastDonation+'. Educators give talks at the viewing platform when visitors are present. More visitors mean more disturbance for sensitive species: close their habitats to protect them.</p>'
   +segmentsBlock(sum)+'<h3>Access by habitat</h3>'+rows;
 }


 function healthTab(sum){
  const g=sum.ext.mgmt,cases=g.cases;
  const rows=cases.map(c=>'<article class="s-res"><div class="s-res-head"><span>'+(SPECIES[c.kind]?.emoji||'')+' <b>'+esc(c.animal)+'</b></span><small>'+(c.noticed?esc(c.label):'Not yet noticed')+(c.contagious?' · contagious':'')+(c.quarantined?' · isolated':'')+'</small><span class="s-w '+(c.sev>60?'bad':c.sev>30?'ok':'good')+'">'+(c.treated?'treating':'severity '+c.sev)+'</span></div>'
   +'<p class="s-muted">'+(c.noticed?esc(c.symptom):'Hidden. A vet check-up may find it.')+' Needs '+c.meds+' supplies, '+c.days+' days.</p>'
   +'<div class="s-acts">'+(c.diagnosed?'':'<button data-act="diagnose" data-id="'+escAttr(c.id)+'">DIAGNOSE · 15</button>')+(c.treated?'':'<button data-act="treatCase" data-id="'+escAttr(c.id)+'">TREAT</button>')+(c.contagious!==false?'<button data-act="quarantine" data-id="'+escAttr(c.animalId)+'" data-on="'+(c.quarantined?'0':'1')+'">'+(c.quarantined?'RELEASE':'ISOLATE')+'</button>':'')+'</div></article>').join('');
  const kinds=sum.species.filter(s=>s.count).map(s=>'<div class="s-supply"><span>'+s.emoji+'</span><div><b>'+esc(s.common)+'</b><small>dirt '+g.dirt[s.kind]+'%</small></div><button data-act="vaccinate" data-kind="'+s.kind+'">VACCINATE</button><button data-act="clean" data-kind="'+s.kind+'">CLEAN · 15</button></div>').join('');
  return '<p class="s-muted">Illness comes from stress, dirt, rain and poor diet. Vets find it, diagnose it and treat it from veterinary supplies; contagious cases spread unless isolated. Vaccines protect against contagious illness.</p>'
   +'<div class="s-stats"><div><small>OPEN CASES</small><b>'+cases.length+'</b></div><div><small>VACCINE DOSES</small><b>'+g.vaccines+'</b></div><div><small>PROTECTED</small><b>'+g.protectedCount+'</b></div><div><small>SUPPLIES</small><b>'+sum.stock.medicine+'</b></div></div>'
   +'<div class="s-row"><span>Vaccine doses</span><small class="s-muted">'+g.vaccinePrice+' each</small><span class="s-acts"><button data-act="vaxBuy" data-n="5">+5</button><button data-act="vaxBuy" data-n="20">+20</button></span></div>'
   +'<h3>Cases</h3><div class="s-list">'+(rows||'<p class="s-muted">No illness right now.</p>')+'</div><h3>Enclosures</h3>'+kinds
   +'<div class="s-foot"><button data-act="checkAll">VET CHECK-UP · ALL</button></div>';
 }
 function budgetTab(sum){
  const b=sum.ext.mgmt.budget,h=b.history.slice(-7);
  const cats=Object.entries(h.reduce((o,d)=>{for(const [k,v] of Object.entries(d.cats))o[k]=(o[k]||0)+v;return o},{})).sort((a,c)=>a[1]-c[1]);
  const max=Math.max(1,...h.map(d=>Math.max(d.income,d.spent)));
  const bars=h.map(d=>'<div class="s-bar2" title="Day '+d.day+'"><i style="height:'+Math.round(d.income/max*60)+'px" class="in"></i><i style="height:'+Math.round(d.spent/max*60)+'px" class="out"></i></div>').join('');
  const worn=sum.ext.mgmt.items.filter(i=>i.cond<70).sort((x,y)=>x.cond-y.cond);
  return '<div class="s-stats"><div><small>FUNDS</small><b>'+b.funds+'</b></div><div><small>AVG INCOME / DAY</small><b>'+b.avgIn+'</b></div><div><small>AVG SPEND / DAY</small><b>'+b.avgOut+'</b></div><div><small>OUTLOOK</small><b class="'+(b.net>=0?'good':'bad')+'">'+(b.net>=0?'+':'')+b.net+'</b></div></div>'
   +(b.runway!==null?'<p class="s-status bad">At this rate funds run out in about '+b.runway+' day'+(b.runway===1?'':'s')+'. Raise ticket prices, cut staff or build a café.</p>':'')
   +'<p class="s-muted">Daily wages: <b>'+b.wages+'</b>. Wages rise with skill.</p>'
   +(h.length?'<div class="s-chart">'+bars+'</div><small class="s-muted">Last '+h.length+' days: income (green) vs spending (red)</small>':'<p class="s-muted">A chart appears after the first full day.</p>')
   +'<h3>Where the money went (last week)</h3><ul class="s-events">'+(cats.length?cats.map(([k,v])=>'<li><b>'+esc(k)+'</b> '+(v>=0?'+':'')+v+'</li>').join(''):'<li>Nothing recorded yet.</li>')+'</ul>'
   +'<h3>Facility condition</h3>'+(worn.length?worn.map(i=>'<div class="s-supply"><span>'+BUILD_ITEMS[i.type].icon+'</span><div><b>'+esc(BUILD_ITEMS[i.type].label)+'</b><small>'+i.cond+'% · '+(i.cond<25?'not counting toward habitat':'wearing')+'</small></div><button data-act="repair" data-id="'+escAttr(i.id)+'">REPAIR · '+i.cost+'</button></div>').join(''):'<p class="s-muted">Everything is in good repair. Groundskeepers repair worn features automatically.</p>');
 }
 function researchTab(sum){
  const r=sum.ext.mgmt.research;
  const rows=Object.entries(PROJECTS).map(([k,p])=>{const done=r.done[k],active=r.active===k;return '<div class="s-supply"><span>'+(done?'✓':active?'🔬':'○')+'</span><div><b>'+esc(p.label)+'</b><small>'+esc(p.blurb)+' '+(active?'Progress '+r.progress+'/'+p.rp+'.':done?'Complete.':p.rp+' research · '+p.cost+' to start.')+'</small></div>'+(done||active?'':'<button data-act="research" data-id="'+escAttr(k)+'">START</button>')+'</div>'}).join('');
  const fac=sum.ext.mgmt.facilities||{};const facs='<h3>Facilities</h3>'+Object.entries(FACILITIES).map(([k,f])=>{const v=fac[k]||{level:1,cost:400};return '<div class="s-supply"><span>'+f.icon+'</span><div><b>'+esc(f.label)+' · level '+v.level+'/3</b><small>'+esc(f.blurb)+'</small></div>'+(v.cost?'<button data-act="upgrade" data-key="'+k+'">UPGRADE · '+v.cost+'</button>':'<span class="s-w good">max</span>')+'</div>'}).join('');
  return facs+'<p class="s-muted">Researchers study at the supply shed and add progress through the day. '+(r.researchers?r.researchers+' researcher'+(r.researchers>1?'s':'')+' on staff.':'<b>Hire a researcher in the Staff tab to begin.</b>')+'</p>'+rows;
 }
 function socialTab(){
  if(!social)return '';
  const chip=b=>b>=50?'💛':b<=-40?'⚡':b<0?'·':'○';
  return '<p class="s-muted">Every pair in a group has a bond. Close companions calm each other; rivals fight and can get hurt; losing a companion causes grief. Sociable, calm animals bond faster; stress, crowding and two bold same-sex adults push them apart. Group sessions help; separating a rival stops fights for a while but leaves it lonely.</p>'
   +social.groups().map(g=>{const sp=SPECIES[g.kind];return '<article class="s-res"><div class="s-res-head"><span>'+face(g.kind,sp.emoji)+' <b>'+esc(sp.common)+'</b></span><small>'+(g.leader?'led by '+esc(g.leader):'')+'</small><span class="s-w '+(g.harmony===null?'ok':welfareClass(g.harmony))+'">'+(g.harmony===null?'alone':'harmony '+g.harmony+'%')+'</span></div>'
    +'<ul class="s-bonds">'+g.pairs.map(p=>'<li><span>'+chip(p.bond)+'</span>'+esc(p.an)+' &amp; '+esc(p.bn)+' <i class="sbar '+(p.bond<0?'low':'')+'"><em style="width:'+Math.round((p.bond+100)/2)+'%"></em></i><small>'+p.bond+'</small></li>').join('')+'</ul>'
    +'<div class="s-acts">'+(g.members.length>1?'<button data-act="session" data-kind="'+g.kind+'">GROUP SESSION · 60</button>':'')+g.members.filter(m=>m.rivals||m.separated).map(m=>m.separated?'<button data-act="reunite" data-id="'+escAttr(m.id)+'">REUNITE '+esc(m.name.toUpperCase())+'</button>':'<button data-act="separate" data-id="'+escAttr(m.id)+'">SEPARATE '+esc(m.name.toUpperCase())+'</button>').join('')+'</div></article>'}).join('')
   +(social.state.log.length?'<h3>Social news</h3><ul class="s-events">'+social.state.log.slice(0,6).map(l=>'<li><b>Day '+l.day+'</b> '+esc(l.text)+'</li>').join('')+'</ul>':'');
 }
 function storiesTab(){
  if(!stories)return '';
  const list=stories.summary().filter(s=>s.name);
  return '<p class="s-muted">Every founding resident has a story that unfolds through real care. Finish a chapter by meeting its goal; the next one opens and the animal\'s record remembers.</p>'
   +list.map(s=>'<article class="s-res story"><div class="s-res-head"><button data-act="open" data-id="'+escAttr(s.animal)+'" class="s-link">'+face(s.kind,SPECIES[s.kind].emoji)+' <b>'+esc(s.name)+'</b></button><small>'+esc(s.title)+'</small><span class="s-w '+(s.done?'good':'ok')+'">'+(s.done?'complete':'chapter '+(s.chapter+1)+'/3')+'</span></div><p class="s-muted"><i>'+esc(s.blurb)+'</i></p>'
    +'<ol class="s-chapters">'+s.chapters.map(c=>'<li class="'+c.state+'"><b>'+esc(c.title)+'</b>'+(c.state==='locked'?'':' · '+esc(c.goal))+(c.state==='active'?' <small class="s-muted">(reward: '+Object.entries(c.reward||{}).map(([k,v])=>'+'+v+' '+k).join(', ')+')</small>':'')+'</li>').join('')+'</ol></article>').join('');
 }
 function ratingBlock(){
  if(!rating)return '';const r=rating.summary();const se=seasons?seasons.info():null;
  return '<div class="s-rating"><div><small>SANCTUARY RATING</small><b>'+'★'.repeat(r.stars)+'<span class="dim">'+'★'.repeat(5-r.stars)+'</span></b><span>'+esc(r.label)+(r.grantBonus?' · grants +'+r.grantBonus+'%':'')+'</span></div>'
   +(se?'<div><small>SEASON</small><b>'+se.icon+' '+esc(se.season)+'</b><span>'+esc(se.label)+': '+esc(se.note)+'</span></div>':'')+'</div>'
   +(r.next?'<h3>Next: '+esc(r.next.label)+' '+'★'.repeat(r.next.stars)+'</h3><ul class="s-goals">'+r.next.needs.map(n=>'<li class="'+(n.ok?'done':'')+'"><span>'+(n.ok?'✓':'○')+'</span>'+esc(n.label)+': '+n.have+' / '+n.need+'</li>').join('')+'</ul><p class="s-muted">Reward: '+r.next.reward.funds+' funds, '+r.next.reward.credits+' credits and a permanent rise in daily grants.</p>':'<p class="s-muted">Top rating reached.</p>');
 }
 function releaseTab(){
  if(!release)return '';
  const R=release.summary();
  const preparing=R.candidates.filter(c=>c.prep),ready=R.candidates.filter(c=>!c.prep);
  const meter=(label,v)=>'<label>'+label+bar(v,v<50?'low':'')+'</label>';
  const card=c=>{const r=c.readiness,sp=SPECIES[c.kind];return '<article class="s-res"><div class="s-res-head"><button data-act="open" data-id="'+escAttr(c.id)+'" class="s-link">'+face(c.kind,sp.emoji)+' <b>'+esc(c.name)+'</b></button><small>'+esc(sp.common)+' · '+c.sex+'</small><span class="s-w '+welfareClass(r.score)+'">'+r.score+'%</span></div>'
   +'<div class="s-meters">'+meter('Health',r.health)+meter('Fitness',r.fitness)+meter('Wariness',r.wariness)+meter('Wild skill',r.skill)+'</div>'
   +(c.prep?'<p class="s-muted">In the soft-release pen: day '+c.prep.days+' of '+PREP_DAYS+'.</p><div class="s-acts"><button data-act="relgo" data-id="'+escAttr(c.id)+'" '+(c.prep.days>=PREP_DAYS&&r.score>=MIN_READINESS?'':'disabled')+'>RELEASE TO THE WILD</button><button data-act="relcancel" data-id="'+escAttr(c.id)+'">RETURN TO HABITAT</button></div>'
    :c.blockers.length?'<p class="s-muted">'+c.blockers.map(esc).join(' ')+'</p>':'<div class="s-acts"><button data-act="relprep" data-id="'+escAttr(c.id)+'" '+(R.hasPen?'':'disabled')+'>PREPARE FOR RELEASE</button></div>')+'</article>'};
  const tracked=R.released.length?R.released.map(r=>'<article class="s-res"><div class="s-res-head"><span>'+(SPECIES[r.kind]?.emoji||'')+' <b>'+esc(r.name)+'</b></span><small>released day '+r.day+' · readiness '+r.readiness+'%</small><span class="s-w '+(r.status==='lost'?'bad':r.status==='established'?'good':'ok')+'">'+(r.status==='tracking'?'tracking · day '+r.daysTracked:r.status)+'</span></div>'+(r.reports.length?'<ul class="s-events">'+r.reports.slice(0,3).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</article>').join(''):'<p class="s-muted">No releases yet.</p>';
  return '<p class="s-muted">The goal of the sanctuary: animals back in the wild. Prepare an adult in a soft-release pen for 5 days (less human contact, more wild practice; play keeps it sharp), then release it at 60% readiness or more. It is tracked by collar for 10 days. Wary, fit, skilled animals survive best.</p>'
   +'<div class="s-stats"><div><small>RELEASED</small><b>'+R.stats.released+'</b></div><div><small>ESTABLISHED</small><b>'+R.stats.established+'</b></div><div><small>LOST</small><b>'+R.stats.lost+'</b></div><div><small>RELEASE PEN</small><b>'+(R.hasPen?'✓':'—')+'</b></div></div>'
   +(R.hasPen?'':'<div class="s-foot"><button data-act="build">BUILD A SOFT-RELEASE PEN</button></div>')
   +(preparing.length?'<h3>Preparing</h3><div class="s-list">'+preparing.map(card).join('')+'</div>':'')
   +'<h3>Tracking</h3><div class="s-list">'+tracked+'</div>'
   +'<h3>Candidates</h3><div class="s-list">'+ready.map(card).join('')+'</div>';
 }
 function segmentsBlock(sum){
  const g=sum.ext.mgmt;
  return '<h3>Who visits</h3>'+Object.entries(SEGMENTS).map(([k,s])=>'<div class="s-supply"><span>'+s.icon+'</span><div><b>'+s.label+' · '+(g.visitorMix[k]||0)+' today</b><small>'+esc(s.blurb)+'</small></div><span class="s-w '+welfareClass(g.satisfaction[k])+'">'+g.satisfaction[k]+'%</span></div>').join('')
   +'<h3>Feedback</h3><ul class="s-events">'+(g.feedback.length?g.feedback.map(f=>'<li>'+esc(f)+'</li>').join(''):'<li>No notable feedback yet.</li>')+'</ul>';
 }

 function render(){
  if(!panel)return;lastRender=Date.now();
  const sum=sanct.summary();
  const tabs=[['overview','OVERVIEW'],['residents','RESIDENTS'],['supplies','SUPPLIES'],['breeding','BREEDING'],['staff','STAFF'],['habitat','HABITAT'],['visitors','VISITORS'],['health','HEALTH'],['budget','BUDGET'],['social','SOCIAL'],['stories','STORIES'],['research','RESEARCH'],['release','RELEASE']];
  const scroll=panel.querySelector('.s-body')?.scrollTop||0;
  panel.innerHTML='<header><div><small>SAFARI SANCTUARY · DAY '+sum.day+'</small><h2>Wildlife care &amp; conservation</h2></div><button id="closeSanct" aria-label="Close">×</button></header>'
   +'<nav class="s-tabs">'+tabs.map(([k,l])=>'<button data-tab="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join('')+'</nav>'
   +'<div class="s-top"><span>🪙 '+sum.funds+'</span><span>🌍 '+sum.credits+' cr</span><span>⭐ '+sum.reputation+'</span><span>❤ '+sum.avgWelfare+'%</span></div>'
   +'<div class="s-body">'+(tab==='overview'?overview(sum):tab==='residents'?residents():tab==='supplies'?supplies(sum):tab==='staff'?staffTab(sum):tab==='habitat'?habitatTab(sum):tab==='visitors'?visitorsTab(sum):tab==='health'?healthTab(sum):tab==='budget'?budgetTab(sum):tab==='research'?researchTab(sum):tab==='release'?releaseTab():tab==='social'?socialTab():tab==='stories'?storiesTab():breeding(sum))+'</div>';
  const body=panel.querySelector('.s-body');if(body)body.scrollTop=scroll;
 }

 function run(r){toast(r.message);if(r.removedId)world.removeAnimal(r.removedId);afterChange();render()}

 function onClick(e){
  const t=e.target.closest('[data-act],[data-tab],#closeSanct');if(!t)return;
  if(t.id==='closeSanct'){close();return}
  if(t.dataset.tab){tab=t.dataset.tab;render();return}
  const a=t.dataset.act,id=t.dataset.id;
  if(a==='feed')run(sanct.feed(id,t.dataset.food));
  else if(a==='enrich')run(sanct.enrich(id));
  else if(a==='treat')run(sanct.treat(id));
  else if(a==='feedAll')run(sanct.feedAllHungry());
  else if(a==='water')run(sanct.refillWater());
  else if(a==='diagnose')run(mgmt.diagnose(id));
  else if(a==='treatCase')run(mgmt.treatCase(id));
  else if(a==='quarantine')run(mgmt.setQuarantine(id,t.dataset.on==='1'));
  else if(a==='vaxBuy')run(mgmt.buyVaccines(Number(t.dataset.n)));
  else if(a==='vaccinate')run(mgmt.vaccinate(t.dataset.kind));
  else if(a==='clean')run(mgmt.cleanHabitat(t.dataset.kind));
  else if(a==='repair')run(mgmt.repair(id));
  else if(a==='research')run(mgmt.startProject(id));
  else if(a==='train')run(mgmt.train(id));
  else if(a==='relprep')run(release.prepare(id));
  else if(a==='session')run(social.groupSession(t.dataset.kind));
  else if(a==='separate')run(social.separate(id));
  else if(a==='reunite')run(social.reunite(id));
  else if(a==='upgrade')run(mgmt.upgrade(t.dataset.key));
  else if(a==='relgo')run(release.release(id));
  else if(a==='relcancel')run(release.cancel(id));
  else if(a==='checkAll'){let found=0;for(const r of sanct.residents()){const x=mgmt.examine(r.id);if(x.case)found++}toast(found?found+' case'+(found>1?'s':'')+' found.':'Everyone checks out healthy.');render()}
  else if(a==='hire')run(ops.hire(t.dataset.role));
  else if(a==='dismiss')run(ops.dismiss(id));
  else if(a==='focusStaff'){const m=ops.state.staff.find(x=>x.id===id);if(m){close();world.focus(m.x,m.z)}}
  else if(a==='build'){close();openBuild()}
  else if(a==='vopen')run(ops.setOpen(t.dataset.on==='1'));
  else if(a==='price')run(ops.setPrice(ops.summary().visitors.price+Number(t.dataset.d)));
  else if(a==='restrict'){const r=ops.setRestricted(t.dataset.kind,t.dataset.on==='1');ops.planDay();run(r)}
  else if(a==='buy')run(sanct.buyFood(t.dataset.food,Number(t.dataset.qty)));
  else if(a==='species'){pairKind=t.dataset.kind;focusSpecies(t.dataset.kind)}
  else if(a==='kind'){pairKind=t.dataset.kind;maleId=femaleId='';render()}
  else if(a==='pair')run(sanct.startBreeding(maleId,femaleId));
  else if(a==='import'){const r=sanct.importFounder(pairKind,t.dataset.sex);run(r)}
  else if(a==='transfer')run(sanct.transferOut(id));
  else if(a==='open'){close();focusAnimal(id);openRecord(id)}
  else if(a==='travel'){world.ranger.position.set(15,0,2);world.focus(24,0);close();toast('You are at the safari gate. Walk in with WASD or the joystick.')}
  else if(a==='reset'){if(confirm('Start a new sanctuary? Safari progress will be erased.')){try{localStorage.removeItem('wildfrontier.sanctuary.v1')}catch{}location.reload()}}
 }
 function focusSpecies(kind){const m=sanct.residents().find(a=>a.kind===kind);if(m){close();focusAnimal(m.id);toast(SPECIES[kind].common+': '+SPECIES[kind].notes)}}
 function onChange(e){const s=e.target.dataset?.sel;if(!s)return;if(s==='male')maleId=e.target.value;else femaleId=e.target.value;render()}

 function open(startTab){
  if(panel){close();return}
  if(startTab)tab=startTab;
  panel=document.createElement('section');panel.className='sanctuary-panel';panel.setAttribute('role','dialog');
  document.body.appendChild(panel);panel.addEventListener('click',onClick);panel.addEventListener('pointerdown',()=>{pointerDown=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>panel.addEventListener(ev,()=>{pointerDown=false}));panel.addEventListener('change',onChange);render();
 }
 function close(){if(panel){panel.remove();panel=null}}
 function refresh(){if(!panel||pointerDown||Date.now()-lastRender<2500)return;const el=document.activeElement;if(el&&el.tagName==='SELECT'&&panel.contains(el))return;render()}
 return {open,close,render,refresh,isOpen:()=>!!panel};
}

import { LANDMARKS, MAP_BOUNDS, WOODLAND, scorePhoto } from './journal.js';
import { SPECIES } from './sanctuary.js';

// Wildlife journal, world map and photo camera.
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const allKinds=()=>[...Object.keys(WOODLAND),...Object.keys(SPECIES)];

export function mountExploreUI({sim,sanct,journal,world,toast,afterChange,saveJournal,portraits}){
 let panel=null,mode=null,openKind=null,photoHud=null,zoom=1;

 // ---- shared panel plumbing ----
 function shell(title,sub,body){
  return '<header><div><small>'+sub+'</small><h2>'+title+'</h2></div><button id="closeExplore" aria-label="Close">×</button></header><div class="s-body">'+body+'</div>';
 }
 function close(){if(panel){panel.remove();panel=null;mode=null;openKind=null}}
 function mount(m){if(panel)close();mode=m;panel=document.createElement('section');panel.className='sanctuary-panel explore-panel';panel.setAttribute('role','dialog');document.body.appendChild(panel);panel.addEventListener('click',onClick)}

 // ---- journal ----
 function journalHtml(){
  const pr=journal.progress();
  if(openKind){
   const inf=journal.info(openKind),e=journal.entry(openKind);
   const photos=e.photos.map(p=>'<figure>'+(p.img?'<img alt="Photo" src="'+p.img+'">':'<div class="j-noimg">no image</div>')+'<figcaption>'+p.score+' · '+esc(p.label)+' · day '+p.day+'</figcaption></figure>').join('');
   const rows=[['Scientific name',inf.latin],['Conservation status',inf.status],['Diet',inf.diet],['Habitat',inf.habitat],['Behaviour',inf.behaviour],inf.region?['Range',inf.region]:null,inf.heritage?['Name heritage',inf.heritage]:null,['First recorded',e.first===null?'—':'Day '+e.first],['Sightings',e.sightings],['Behaviours documented',e.behaviours.join(', ')||'none yet']].filter(Boolean);
   return '<button data-j="back" class="s-link">← All species</button><h3>'+inf.emoji+' '+esc(inf.common)+'</h3><div class="j-photos">'+(photos||'<p class="s-muted">No photographs yet. Use the camera to document this species.</p>')+'</div><dl class="j-dl">'+rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>'+(inf.notes?'<p class="s-muted">'+esc(inf.notes)+'</p>':'');
  }
  const cards=allKinds().map(k=>{const inf=journal.info(k),e=journal.state.entries[k];const found=e&&e.first!==null;const best=e&&e.photos[0];
   return '<button data-j="open" data-kind="'+k+'" class="j-card'+(found?'':' locked')+'">'+(best&&best.img?'<img alt="" src="'+best.img+'">':found&&portraits?'<img class="j-art" alt="" src="'+portraits.portrait(k)+'">':'<span class="j-emoji">'+(found?inf.emoji:'?')+'</span>')+'<b>'+(found?esc(inf.common):'Unknown species')+'</b><small>'+(found?esc(inf.status):'Observe or photograph it')+'</small></button>'}).join('');
  return '<div class="s-stats"><div><small>DISCOVERED</small><b>'+pr.discovered+'/'+pr.species+'</b></div><div><small>PHOTOGRAPHED</small><b>'+pr.photographed+'</b></div><div><small>PHOTOS TAKEN</small><b>'+pr.photos+'</b></div><div><small>PLACES</small><b>'+pr.landmarks+'/'+pr.landmarkTotal+'</b></div></div><p class="s-muted">Tap an animal with the Observe tool to record it, or use the 📷 camera to photograph it for a journal entry and funds. Photograph new behaviours, young and rare species for bonuses.</p><div class="j-grid">'+cards+'</div>';
 }
 function openJournal(){mount('journal');render()}

 // ---- map ----
 const W=720,H=440,B=MAP_BOUNDS;
 const MX=x=>(x-B.minX)/(B.maxX-B.minX)*W,MZ=z=>(z-B.minZ)/(B.maxZ-B.minZ)*H;
 function drawMap(canvas){
  const c=canvas.getContext('2d');c.clearRect(0,0,W,H);
  c.fillStyle='#587350';c.fillRect(0,0,W,H);
  c.fillStyle='#c9b173';c.fillRect(MX(15),0,W-MX(15),H);
  c.fillStyle='#b89b5c';c.beginPath();c.ellipse(MX(31),MZ(0),MX(44)-MX(31),MZ(14)-MZ(0),0,0,Math.PI*2);c.globalAlpha=.35;c.fill();c.globalAlpha=1;
  c.strokeStyle='#6b97a1';c.lineWidth=14;c.lineCap='round';c.beginPath();c.moveTo(MX(8.5),MZ(-20));c.lineTo(MX(5.5),MZ(22));c.stroke();
  c.fillStyle='#6b97a1';for(const [x,z,rx,rz] of [[31,7,3.8,2.7],[25.5,8.2,1.9,1.3]]){c.beginPath();c.ellipse(MX(x),MZ(z),MX(B.minX+rx)-MX(B.minX),MZ(B.minZ+rz)-MZ(B.minZ),0,0,Math.PI*2);c.fill()}
  c.fillStyle='#d9a3b4';c.beginPath();c.ellipse(MX(38),MZ(-10),MX(B.minX+5)-MX(B.minX),MZ(B.minZ+3.5)-MZ(B.minZ),0,0,Math.PI*2);c.fill();
  c.strokeStyle='#0002';c.lineWidth=1;for(let x=-20;x<=40;x+=10){c.beginPath();c.moveTo(MX(x),0);c.lineTo(MX(x),H);c.stroke()}for(let z=-20;z<=20;z+=10){c.beginPath();c.moveTo(0,MZ(z));c.lineTo(W,MZ(z));c.stroke()}
  // placed structures
  for(const it of ops_items()){c.fillStyle='#4a3b24';c.fillRect(MX(it.x)-3,MZ(it.z)-3,6,6)}
  // fog of war, with holes around discovered places and the ranger
  const fog=document.createElement('canvas');fog.width=W;fog.height=H;const f=fog.getContext('2d');f.fillStyle='rgba(14,20,15,.94)';f.fillRect(0,0,W,H);f.globalCompositeOperation='destination-out';
  const hole=(x,z,r)=>{const px=MX(x),pz=MZ(z),pr=r*W/(B.maxX-B.minX);const g=f.createRadialGradient(px,pz,pr*.45,px,pz,pr);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');f.fillStyle=g;f.beginPath();f.arc(px,pz,pr,0,Math.PI*2);f.fill()};
  const known=LANDMARKS.filter(l=>journal.state.landmarks[l.id]);for(const l of known)hole(l.x,l.z,14);hole(world.ranger.position.x,world.ranger.position.z,11);
  c.drawImage(fog,0,0);
  c.textAlign='center';
  for(const l of known){c.font='20px sans-serif';c.fillText(l.emoji,MX(l.x),MZ(l.z)+7);c.font='600 11px DM Mono, monospace';c.fillStyle='#10170f';c.fillText(l.label,MX(l.x)+1,MZ(l.z)+24);c.fillStyle='#f4efd6';c.fillText(l.label,MX(l.x),MZ(l.z)+23)}
  // animals the player has discovered, shown where they are right now
  c.font='15px sans-serif';
  for(const a of world.animals){const kind=a.userData.kind;const e=journal.state.entries[kind];if(!e||e.first===null)continue;const x=a.position.x,z=a.position.z;
   const seen=known.some(l=>Math.hypot(l.x-x,l.z-z)<12)||Math.hypot(world.ranger.position.x-x,world.ranger.position.z-z)<10;if(!seen)continue;
   const rec=journal.info(kind);c.fillText(rec?rec.emoji:'🐾',MX(x),MZ(z)+5)}
  // ranger
  const rx=MX(world.ranger.position.x),rz=MZ(world.ranger.position.z);c.fillStyle='#fff';c.strokeStyle='#1c2b20';c.lineWidth=3;c.beginPath();c.arc(rx,rz,7,0,Math.PI*2);c.fill();c.stroke();c.font='600 10px DM Mono, monospace';c.fillStyle='#fff';c.strokeText('YOU',rx,rz-12);c.fillText('YOU',rx,rz-12);
 }
 let opsItems=()=>[];function ops_items(){return opsItems()}
 function mapHtml(){
  const known=LANDMARKS.filter(l=>journal.state.landmarks[l.id]);
  return '<canvas id="mapCanvas" width="'+W+'" height="'+H+'" class="map-canvas"></canvas><p class="s-muted">Walk to new places to uncover the map. '+known.length+'/'+LANDMARKS.length+' places discovered. Discovered animals appear where you can currently see them.</p><h3>Fast travel</h3><div class="s-species">'+known.map(l=>'<button data-m="go" data-id="'+l.id+'"><span>'+l.emoji+'</span><b>'+esc(l.label)+'</b><small>'+(l.safari?'Safari':'Woodland')+'</small></button>').join('')+'</div>';
 }
 function openMap(){mount('map');render()}

 function render(){
  if(!panel)return;
  if(mode==='journal'){const pr=journal.progress();panel.innerHTML=shell('Wildlife journal','FIELD GUIDE · '+pr.discovered+'/'+pr.species+' SPECIES',journalHtml())}
  else if(mode==='map'){panel.innerHTML=shell('Reserve map','WORLD MAP · '+LANDMARKS.filter(l=>journal.state.landmarks[l.id]).length+'/'+LANDMARKS.length+' PLACES',mapHtml());const cv=panel.querySelector('#mapCanvas');if(cv)drawMap(cv)}
 }
 function onClick(e){
  const t=e.target.closest('[data-j],[data-m],#closeExplore');if(!t)return;
  if(t.id==='closeExplore'){close();return}
  if(t.dataset.j==='open'){openKind=t.dataset.kind;render();return}
  if(t.dataset.j==='back'){openKind=null;render();return}
  if(t.dataset.m==='go'){const l=LANDMARKS.find(x=>x.id===t.dataset.id);if(l){world.ranger.position.set(l.x-1.5,0,l.z+1.5);world.focus(l.x,l.z);close();toast('Travelled to '+l.label+'.')}}
 }

 // ---- photo camera ----
 function togglePhoto(){photoHud?exitPhoto():enterPhoto()}
 function enterPhoto(){
  if(photoHud)return;close();zoom=1;world.setPhotoMode(true);document.body.classList.add('photo');
  photoHud=document.createElement('div');photoHud.className='photo-hud';
  photoHud.innerHTML='<div class="vf"><i></i><i></i><i></i><i></i></div><div class="photo-top"><button data-p="close" aria-label="Exit camera">✕</button><span id="zoomLabel">CAMERA · ×1.0</span><span class="photo-hint">Frame an animal · drag to look · joystick to move</span></div><div class="photo-controls"><button data-p="zout" aria-label="Zoom out">−</button><button data-p="shot" class="shutter" aria-label="Take photo"></button><button data-p="zin" aria-label="Zoom in">+</button></div><div class="photo-flash"></div><div class="photo-result"></div>';
  document.body.appendChild(photoHud);photoHud.addEventListener('click',onPhotoClick);
 }
 function exitPhoto(){if(!photoHud)return;world.setPhotoMode(false);photoHud.remove();photoHud=null;document.body.classList.remove('photo')}
 function setZoom(z){zoom=Math.max(1,Math.min(4,z));world.setZoom(zoom);const l=photoHud&&photoHud.querySelector('#zoomLabel');if(l)l.textContent='CAMERA · ×'+zoom.toFixed(1)}
 function labelFor(a,s){if(a.pregnant)return 'expecting';if(a.young||a.juvenile||a.parents)return 'young';if(a.mood==='Playful')return 'playful';if(s.animation==='forage')return 'foraging';if(s.moving&&!s.sleeping)return 'active';return 'resting'}
 function shoot(){
  const vf=photoHud.querySelector('.vf');const r=vf.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const subs=world.photoSubjects().map(s=>({...s,px:(s.nx+1)/2*innerWidth,py:(1-s.ny)/2*innerHeight})).filter(s=>s.px>r.left&&s.px<r.right&&s.py>r.top&&s.py<r.bottom);
  const flash=photoHud.querySelector('.photo-flash');flash.classList.remove('go');void flash.offsetWidth;flash.classList.add('go');
  if(!subs.length){toast('No animal in the frame. Line one up inside the corners.');return}
  let best=null;
  for(const s of subs){const a=sim.animals.find(x=>x.id===s.id);if(!a)continue;const inf=journal.info(s.kind);if(!inf)continue;
   const label=labelFor(a,s);const offset=Math.min(1,Math.hypot((s.px-cx)/(r.width/2),(s.py-cy)/(r.height/2))/1.4);
   const score=scorePhoto({dist:s.dist,offset,label,status:inf.status});if(!best||score>best.score)best={kind:s.kind,label,score,id:s.id}}
  if(!best){toast('Nothing identifiable in frame.');return}
  const img=world.capture({w:r.width/innerWidth});
  const res=journal.recordPhoto({kind:best.kind,score:best.score,label:best.label,img,day:sanct.state.day});
  toast(res.message);
  if(res.ok){sanct.earn(res.rewards.funds);sanct.state.credits+=res.rewards.credits;sanct.state.reputation+=res.rewards.reputation;if(res.firstPhoto)sanct.say('Journal updated: first photograph of '+journal.info(best.kind).common.toLowerCase()+'.');
   const box=photoHud.querySelector('.photo-result');box.innerHTML=(img?'<img alt="Photo" src="'+img+'">':'')+'<span>'+esc(res.message)+'</span>';box.classList.add('show');clearTimeout(shoot.t);shoot.t=setTimeout(()=>box.classList.remove('show'),3200);
   saveJournal();afterChange()}
 }
 function onPhotoClick(e){const t=e.target.closest('[data-p]');if(!t)return;const a=t.dataset.p;if(a==='close')exitPhoto();else if(a==='zin')setZoom(zoom+.5);else if(a==='zout')setZoom(zoom-.5);else if(a==='shot')shoot()}

 return {openJournal,openMap,togglePhoto,close,exitPhoto,render,isPhoto:()=>!!photoHud,setItemsSource:fn=>{opsItems=fn}};
}

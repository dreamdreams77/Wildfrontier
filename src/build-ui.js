import { BUILD_ITEMS } from './operations.js';
import { SPECIES } from './sanctuary.js';

// Build mode: tap the ground to place structures; tap a structure to rotate, move or remove it.
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export function mountBuildUI({sanct,ops,world,toast,afterChange,portraits}){
 let panel=null,type='shadeTree',selectedId=null,moving=false,advisor='africanLion';
 const selectedItem=()=>ops.state.items.find(i=>i.id===selectedId);

 function render(){
  if(!panel)return;
  const funds=Math.round(sanct.state.funds);
  const def=BUILD_ITEMS[type];
  const sel=selectedItem();
  const palette=Object.entries(BUILD_ITEMS).map(([k,d])=>'<button data-bt="'+k+'" class="'+(k===type&&!sel?'on':'')+(d.cost>funds?' poor':'')+'" title="'+esc(d.blurb)+'"><span>'+(portraits?'<img class="p-icon" alt="" src="'+portraits.icon(k)+'">':d.icon)+'</span><b>'+esc(d.label)+'</b><small>'+d.cost+'</small></button>').join('');
  let status;
  if(moving&&sel)status='<b>Moving '+esc(BUILD_ITEMS[sel.type].label)+'.</b> Tap the ground where it should go.';
  else if(sel)status='<b>'+esc(BUILD_ITEMS[sel.type].label)+' selected.</b> <span class="b-acts"><button data-ba="rotate">ROTATE</button><button data-ba="move">MOVE</button><button data-ba="remove" class="s-danger">REMOVE (refund '+Math.floor(BUILD_ITEMS[sel.type].cost/2)+')</button><button data-ba="done">DONE</button></span>';
  else status='Tap the ground to place a <b>'+esc(def.label)+'</b> ('+def.cost+'). '+esc(def.blurb);
  const h=ops.habitatDetail(advisor);const sp=SPECIES[advisor];
  const chips=Object.entries(SPECIES).map(([k,s])=>'<button data-badv="'+k+'" class="'+(k===advisor?'on':'')+'" title="'+esc(s.common)+'">'+s.emoji+'</button>').join('');
  panel.innerHTML='<header><b>BUILD MODE</b><span>🪙 '+funds+'</span><button data-ba="close" aria-label="Close build mode">×</button></header>'
   +'<div class="b-palette">'+palette+'</div><p class="b-status">'+status+'</p>'
   +'<div class="b-adv"><div class="b-chips">'+chips+'<button data-ba="show" class="b-show">SHOW</button></div><div class="b-score"><span class="'+(h.score>=85?'good':h.score>=60?'ok':'bad')+'">'+esc(sp.common)+' habitat '+h.score+'%</span><i class="sbar '+(h.score<60?'low':'')+'"><em style="width:'+h.score+'%"></em></i><small>'+(h.missing.length?'Needs '+esc(h.missing.join(', ')):'Complete: this species has everything it needs.')+'</small></div></div>';
 }
 function select(it){selectedId=it?it.id:null;moving=false;world.selectBuildItem(it,it?BUILD_ITEMS[it.type].r+.3:0);render()}

 function onGround({x,z}){
  if(!panel)return;
  const sel=selectedItem();
  if(moving&&sel){const r=ops.move(sel.id,x,z);toast(r.message);if(r.ok){world.updateBuildItem(r.item);moving=false;world.selectBuildItem(r.item,BUILD_ITEMS[r.item.type].r+.3);afterChange()}render();return}
  if(sel){select(null);return}
  const r=ops.place(type,x,z);toast(r.message);
  if(r.ok){world.addBuildItem(r.item);afterChange();select(r.item)}else render();
 }
 function onItem(id){if(!panel)return;const it=ops.state.items.find(i=>i.id===id);if(it){if(moving)return;select(it)}}

 function onClick(e){
  const t=e.target.closest('[data-bt],[data-ba],[data-badv]');if(!t)return;
  if(t.dataset.bt){type=t.dataset.bt;select(null);return}
  if(t.dataset.badv){advisor=t.dataset.badv;render();return}
  const a=t.dataset.ba,sel=selectedItem();
  if(a==='close'){close();return}
  if(a==='show'){const s=SPECIES[advisor];world.focus(s.spawn[0],s.spawn[1]);return}
  if(!sel&&a!=='show')return;
  if(a==='rotate'){const r=ops.rotate(sel.id);world.updateBuildItem(r.item);afterChange();render()}
  else if(a==='move'){moving=true;toast('Tap the ground to move it.');render()}
  else if(a==='remove'){const r=ops.remove(sel.id);toast(r.message);world.removeBuildItem(sel.id);selectedId=null;afterChange();render()}
  else if(a==='done')select(null);
 }
 function open(){
  if(panel){close();return}
  panel=document.createElement('section');panel.className='build-panel';document.body.appendChild(panel);document.body.classList.add('building');
  panel.addEventListener('click',onClick);world.setBuildMode(true);world.focus(29,0);toast('Build mode: tap the safari ground to place structures.');render();
 }
 function close(){if(!panel)return;world.setBuildMode(false);world.selectBuildItem(null);panel.remove();panel=null;selectedId=null;moving=false;document.body.classList.remove('building')}
 return {open,close,render,onGround,onItem,isOpen:()=>!!panel};
}

// Opening sequence and guided first steps. The tutorial is driven by real game state, so each step completes when
// the player actually does the thing, in any order, and can be dismissed at any time.
export const INTRO_CARDS=[
 {kicker:'WILD FRONTIER',title:'A sanctuary reborn',text:'Beyond the last fence post, the valley still belongs to the wild.'},
 {kicker:'HALE STATION · NORTH WOODLAND',title:'Sixty years at the edge of the wilderness',text:'The old ranger station has sheltered injured foxes, orphaned fawns and a great many lost birds. Lately, fewer people come. The radio has been quiet.'},
 {kicker:'SENIOR RANGER NOKOSI HALE',title:'"It is yours now."',text:'"I have kept this station since before you were born. The animals know the land better than we do, so watch them first and learn what they need. When the radio calls, answer it."'},
 {kicker:'YOUR FIRST DAY',title:'Learn the land. Answer the call.',text:'Explore the woodland and the creek, care for the animals, open the safari gate, and bring this place back to life.'},
];
export const TUTORIAL=[
 {id:'move',text:'Walk: WASD or arrow keys, or press and hold the ground on touch screens.',done:c=>c.moved>=6},
 {id:'look',text:'Look around: drag to rotate, scroll or pinch to zoom.',done:c=>!!c.looked},
 {id:'tap',text:'Tap or click an animal to open its field record.',done:c=>!!c.selected},
 {id:'activity',text:'Find a coloured ring in the world and press E (or tap the button) to try a field activity.',done:c=>!!c.activity},
 {id:'missions',text:'Open the Mission journal (📋) to see what needs doing.',done:c=>!!c.missions},
 {id:'feed',text:'Open Safari Sanctuary (🦁) and feed a hungry resident.',done:c=>c.fed>0},
 {id:'build',text:'Open Build (🔨) and place a structure in the safari.',done:c=>c.built>0},
 {id:'photo',text:'Take a wildlife photo with the camera (📷).',done:c=>c.photos>0},
];
export function tutorialState(ctx,dismissed=false){
 const steps=TUTORIAL.map(s=>({id:s.id,text:s.text,done:!!s.done(ctx)}));const current=steps.find(s=>!s.done)||null;
 return {steps,current,complete:!current,count:steps.filter(s=>s.done).length,total:steps.length,visible:!dismissed&&!!current};
}
export const FLYOVER=[
 {pos:[-26,16,18],look:[-19,1,10]},{pos:[-22,9,12],look:[-12,1,6]},{pos:[-8,8,16],look:[2,1,2]},{pos:[8,10,14],look:[7,1,-4]},
 {pos:[14,9,9],look:[22,2,0]},{pos:[24,8,10],look:[31,2,0]},{pos:[34,10,6],look:[36,1,-6]},{pos:[10,12,16],look:[-5,0,11]},
];
export const shouldPlayIntro=({webdriver=false,seen=false,search=''})=>{if(webdriver)return false;if(/(^|[?&])nointro(=|&|$)/.test(search))return false;if(/(^|[?&])intro(=|&|$)/.test(search))return true;return !seen};

export function mountIntro({world,audio,onDone}){
 let i=0;const root=document.createElement('div');root.id='intro';document.body.appendChild(root);document.body.classList.add('intro');
 function card(){const c=INTRO_CARDS[i];root.innerHTML='<div class="intro-card"><small>'+c.kicker+'</small><h1>'+c.title+'</h1><p>'+c.text+'</p><div class="intro-actions"><button data-a="skip" class="ghost">SKIP</button><button data-a="next">'+(i===INTRO_CARDS.length-1?'BEGIN':'CONTINUE')+'</button></div><div class="intro-dots">'+INTRO_CARDS.map((_,k)=>'<i class="'+(k===i?'on':'')+'"></i>').join('')+'</div></div>'}
 function finish(){world.stopCinematic();root.remove();document.body.classList.remove('intro');try{localStorage.setItem('wildfrontier.intro.v1','1')}catch{}onDone&&onDone()}
 root.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;audio.resume();if(b.dataset.a==='skip'){finish();return}i++;if(i>=INTRO_CARDS.length)finish();else card()});
 addEventListener('keydown',function h(e){if(!document.getElementById('intro')){removeEventListener('keydown',h);return}if(e.code==='Escape')finish()});
 card();world.playCinematic(FLYOVER.map(f=>({pos:f.pos,look:f.look})),42,()=>{});
 return {finish};
}
export function mountTutorial({getCtx}){
 const el=document.createElement('aside');el.id='tutorial';document.body.appendChild(el);let dismissed=false;
 try{dismissed=localStorage.getItem('wildfrontier.tutorial.done')==='1'}catch{}
 function render(){const st=tutorialState(getCtx(),dismissed);if(!st.visible){el.hidden=true;if(st.complete&&!dismissed){dismissed=true;try{localStorage.setItem('wildfrontier.tutorial.done','1')}catch{}}return st}
  el.hidden=false;el.innerHTML='<header><b>FIRST STEPS</b><span>'+st.count+'/'+st.total+'</span><button data-a="x" aria-label="Dismiss">×</button></header><p>'+st.current.text+'</p><div class="t-dots">'+st.steps.map(s=>'<i class="'+(s.done?'on':'')+'"></i>').join('')+'</div>';return st}
 el.addEventListener('click',e=>{if(e.target.closest('[data-a=x]')){dismissed=true;try{localStorage.setItem('wildfrontier.tutorial.done','1')}catch{}el.hidden=true}});
 return {render};
}

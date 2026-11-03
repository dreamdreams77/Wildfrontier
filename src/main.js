import './style.css';
import { createWorld } from './world.js';

const $=id=>document.getElementById(id);
const world=createWorld($('world'));
const keys={forward:false,back:false,left:false,right:false};window.__wildKeys=keys;
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{if(keyMap[e.code]){keys[keyMap[e.code]]=true;e.preventDefault()}if(['1','2','3'].includes(e.key))selectTool(['observe','track','care'][Number(e.key)-1])});
addEventListener('keyup',e=>{if(keyMap[e.code])keys[keyMap[e.code]]=false});
const panel=$('inspectPanel');let selected=null,tool='observe',progress=2450,waterDone=false;
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400)}
function showAnimal(data){selected=data;$('speciesTag').textContent=data.kind==='deer'?'WILDLIFE · FIELD SIGHTING':'WILDLIFE · MEADOW RESIDENT';$('animalName').textContent=data.name;$('animalDesc').textContent=data.description;$('condition').textContent=data.condition;$('location').textContent=data.location;$('animalPortrait').querySelector('span').textContent=data.icon;panel.classList.remove('hidden')}
addEventListener('wildfrontier:select',e=>showAnimal(e.detail));
function selectTool(name){tool=name;document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.tool===name));toast(name==='observe'?'Observation lens ready':name==='track'?'Tracking scope ready':'Care kit equipped')}
document.querySelectorAll('.tool').forEach(el=>el.addEventListener('click',()=>selectTool(el.dataset.tool)));
$('closeInspect').addEventListener('click',()=>panel.classList.add('hidden'));
$('observeBtn').addEventListener('click',()=>{if(!selected){toast('Choose a resident to observe first');return}if(tool==='track'){toast('Tracker placed · movement will be logged');progress=Math.min(3000,progress+75)}else if(tool==='care'){toast(selected.kind==='deer'?'You keep a respectful distance. A ranger assessment is needed.':'A small portion of feed is placed nearby.');progress=Math.min(3000,progress+40)}else{toast('Observation recorded · +25 restoration points');progress=Math.min(3000,progress+25)}$('progressText').textContent=progress.toLocaleString()+' / 3,000';$('progressBar').style.width=(progress/3000*100)+'%'});
$('helpBtn').addEventListener('click',()=>toast('Field guide: observe first, approach slowly, never disturb resting wildlife.'));
$('taskRescue').addEventListener('click',()=>{world.focus(-1,1);toast('The north meadow is just beyond the old oak.')});
$('taskWater').addEventListener('click',()=>{world.focus(9,4);if(!waterDone){waterDone=true;$('taskWater').querySelector('.task-check').textContent='✓';$('taskWater').classList.add('active');$('healthScore').textContent='89%';toast('Water station checked · habitat health +3%')}else toast('Water station is already full.')});
$('mapBtn').addEventListener('click',()=>toast('Map view: North Meadow · Clover Patch · Creekside'));
$('soundBtn').addEventListener('click',()=>toast('Ambient sound settings will be available in the next field update.'));
$('animalCount').textContent=String(12+world.animals.length-1);
let touchStart=null;world.renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});world.renderer.domElement.addEventListener('touchend',()=>touchStart=null,{passive:true});
setTimeout(()=>$('loading').classList.add('done'),1250);

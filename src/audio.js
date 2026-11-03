// Procedural audio: no sample files, everything is synthesised with WebAudio. The pure functions below decide what to
// play (and are unit-tested); createAudio() turns those decisions into sound once the browser allows audio.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));

// ---- species calls: a call is a list of voices {wave,f0,f1,dur,gain,at,cutoff,vib,noise} ----
const V=(wave,f0,f1,dur,gain,o={})=>({wave,f0,f1,dur,gain,at:0,cutoff:0,vib:0,noise:0,...o});
const CALL_BANK={
 snort:()=>[V('noise',0,0,.28,.5,{cutoff:900,noise:1})],
 thump:()=>[V('sine',120,60,.12,.7),V('sine',110,55,.12,.6,{at:.16})],
 bark:()=>[V('sawtooth',320,200,.18,.5,{cutoff:1400}),V('noise',0,0,.1,.2,{cutoff:2000,noise:1})],
 howl:()=>[V('sine',360,540,.7,.5,{vib:6}),V('sine',540,420,.9,.5,{at:.65,vib:6})],
 hoot:()=>[V('sine',410,380,.35,.55),V('sine',380,340,.5,.5,{at:.5})],
 chirp:()=>[V('sine',2800,3600,.09,.3),V('sine',3600,2900,.09,.3,{at:.12}),V('sine',3000,3800,.08,.25,{at:.26})],
 quack:()=>[V('square',420,300,.16,.3,{cutoff:1800}),V('square',400,280,.14,.25,{at:.2,cutoff:1800})],
 trumpet:()=>[V('sawtooth',260,520,.5,.5,{cutoff:2600}),V('sawtooth',520,340,.7,.5,{at:.45,cutoff:2600,vib:5})],
 squawk:()=>[V('sawtooth',500,300,.3,.4,{cutoff:2200}),V('noise',0,0,.2,.15,{noise:1,cutoff:3000})],
 roar:()=>[V('sawtooth',110,70,1.3,.7,{cutoff:700,vib:3}),V('noise',0,0,1.1,.35,{noise:1,cutoff:500})],
 hum:()=>[V('sine',90,80,.9,.35,{vib:2})],
 honk:()=>[V('sawtooth',380,300,.26,.4,{cutoff:2000}),V('sawtooth',360,280,.24,.35,{at:.3,cutoff:2000})],
 chatter:()=>[0,.07,.14,.21,.28].map(t=>V('square',1800,1500,.05,.18,{at:t,cutoff:3000})),
 chitter:()=>[0,.09,.18].map(t=>V('sine',1500,1900,.06,.22,{at:t})),
 slap:()=>[V('noise',0,0,.12,.7,{noise:1,cutoff:1200})],
 whistle:()=>[V('sine',1500,2100,.25,.3,{vib:8})],
 yowl:()=>[V('sawtooth',300,520,.5,.4,{cutoff:1800,vib:4}),V('sawtooth',520,260,.6,.4,{at:.45,cutoff:1800})],
 stomp:()=>[V('sine',70,50,.1,.7),V('sine',70,50,.1,.7,{at:.14})],
 hiss:()=>[V('noise',0,0,.7,.35,{noise:1,cutoff:5500})],
};
export function callSpec(kind,type,callName){
 const bank=CALL_BANK[callName];if(!bank)return [];
 let v=bank();
 if(type==='alarm')v=v.map(x=>({...x,gain:Math.min(1,x.gain*1.35),f0:x.f0*1.12,f1:x.f1*1.12,dur:x.dur*.8}));   // sharper, louder
 else v=v.map(x=>({...x,gain:x.gain*.55}));                                                                   // contact calls are softer
 return v;
}
export const CALL_NAMES=Object.keys(CALL_BANK);

// ---- spatial placement: louder when near, panned by where the source is relative to the camera ----
export function spatial(listener,yaw,src,maxDist=34){
 const dx=src.x-listener.x,dz=src.z-listener.z,d=Math.hypot(dx,dz);
 const gain=Math.pow(clamp(1-d/maxDist),1.6);
 // camera right vector for a camera orbiting at angle yaw: (cos yaw, -sin yaw)
 const side=(dx*Math.cos(yaw)-dz*Math.sin(yaw));
 return {gain,pan:clamp(side/Math.max(8,d)*1.2,-1,1),dist:d};
}

// ---- ambience: what the world sounds like right now ----
export function ambienceMix({phase='Day',rain=false,wind=.7,nearWater=0,season='Spring',stormy=false}){
 const night=phase==='Night',dawn=phase==='Dawn',dusk=phase==='Dusk';
 return {
  wind:clamp(.12+wind*.2+(stormy?.3:0)),
  rain:rain?.55:0,
  water:clamp(nearWater)*.55,
  birds:rain||night?0:clamp((dawn?1:dusk?.5:.7)*(season==='Winter'?.3:1)),
  crickets:night?(rain?.2:.6):dusk?.25:0,
  music:night?.5:dawn||dusk?.8:1,
  mode:night?'night':dusk?'dusk':dawn?'dawn':'day',
 };
}
const SCALES={day:[0,2,4,7,9,12],dawn:[0,2,4,7,9,12],dusk:[0,3,5,7,10,12],night:[0,3,7,10,12]};
export const scaleFor=mode=>SCALES[mode]||SCALES.day;
export const noteHz=(root,semi)=>root*Math.pow(2,semi/12);

export function createAudio(){
 let ctx=null,master=null,noiseBuf=null,ambient=null,muted=false,started=false,lastStep=0,nextBird=0,nextNote=0;
 try{muted=localStorage.getItem('wildfrontier.muted')==='1'}catch{}
 const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
 function init(){
  if(ctx||!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.8;master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const loop=(filterType,freq,q=.7)=>{const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(master);s.start();return {g,f}};
  ambient={wind:loop('lowpass',420),rain:loop('highpass',1800),water:loop('bandpass',950,1.2),cricket:(()=>{const o=ctx.createOscillator();o.frequency.value=4600;const g=ctx.createGain();g.gain.value=0;const lfo=ctx.createOscillator();lfo.frequency.value=14;const lg=ctx.createGain();lg.gain.value=.5;lfo.connect(lg);const am=ctx.createGain();am.gain.value=.5;lg.connect(am.gain);o.connect(am);am.connect(g);g.connect(master);o.start();lfo.start();return {g}})()};
 }
 function resume(){init();if(ctx&&ctx.state==='suspended')ctx.resume();started=true}
 function setMuted(m){muted=!!m;try{localStorage.setItem('wildfrontier.muted',muted?'1':'0')}catch{}if(master)master.gain.setTargetAtTime(muted?0:.8,ctx.currentTime,.05)}
 function voice(v,when,pan=0,gain=1){
  if(!ctx)return;const t=ctx.currentTime+when+v.at;const g=ctx.createGain();g.gain.value=0;
  let src;if(v.noise){src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true}else{src=ctx.createOscillator();src.type=v.wave;src.frequency.setValueAtTime(v.f0,t);src.frequency.linearRampToValueAtTime(v.f1,t+v.dur)}
  let node=src;if(v.cutoff){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=v.cutoff;node.connect(f);node=f}
  if(v.vib&&!v.noise){const lfo=ctx.createOscillator();lfo.frequency.value=v.vib;const lg=ctx.createGain();lg.gain.value=v.f0*.03;lfo.connect(lg);lg.connect(src.frequency);lfo.start(t);lfo.stop(t+v.dur+.1)}
  const p=ctx.createStereoPanner?ctx.createStereoPanner():null;if(p)p.pan.value=pan;
  node.connect(g);if(p){g.connect(p);p.connect(master)}else g.connect(master);
  const peak=v.gain*gain*.5;g.gain.linearRampToValueAtTime(peak,t+Math.min(.04,v.dur*.25));g.gain.exponentialRampToValueAtTime(.0001,t+v.dur);
  src.start(t);src.stop(t+v.dur+.05);
 }
 function call(kind,type,pos,callName,listener,yaw){
  if(!ctx||muted)return;const sp=spatial(listener||{x:0,z:0},yaw||0,{x:pos.x,z:pos.z});if(sp.gain<.03)return;
  for(const v of callSpec(kind,type,callName))voice(v,0,sp.pan,sp.gain);
 }
 function sfx(name){
  if(!ctx||muted)return;const V2=(w,a,b,d,g,at=0,o={})=>voice({wave:w,f0:a,f1:b,dur:d,gain:g,at,cutoff:0,vib:0,noise:0,...o},0,0,1);
  if(name==='click')V2('sine',900,600,.06,.35);
  else if(name==='place')V2('triangle',300,160,.14,.6);
  else if(name==='shutter'){V2('square',1800,900,.03,.35);V2('square',1200,500,.05,.3,.07)}
  else if(name==='radio'){V2('square',1000,1000,.08,.25);V2('square',1400,1400,.08,.25,.12);V2('square',1000,1000,.1,.25,.26)}
  else if(name==='success'){V2('sine',520,520,.12,.4);V2('sine',660,660,.12,.4,.13);V2('sine',790,790,.22,.4,.26)}
  else if(name==='fail'){V2('sawtooth',300,150,.4,.35,0,{cutoff:900})}
 }
 function footstep(speed=1){
  if(!ctx||muted)return;voice({wave:'sine',f0:0,f1:0,dur:.07,gain:.22*Math.min(1,speed),at:0,cutoff:700,vib:0,noise:1},0,0,1);
 }
 // called a few times a second with the current state
 function update(s,dt){
  if(!ctx||muted||!started)return;const m=ambienceMix(s.env||{});const t=ctx.currentTime;
  ambient.wind.g.gain.setTargetAtTime(m.wind*.35,t,.8);ambient.rain.g.gain.setTargetAtTime(m.rain*.25,t,.8);ambient.water.g.gain.setTargetAtTime(m.water*.3,t,.6);ambient.cricket.g.gain.setTargetAtTime(m.crickets*.025,t,1.2);
  const now=ctx.currentTime;
  if(m.birds>.05&&now>nextBird){nextBird=now+2+Math.random()*7/Math.max(.3,m.birds);for(const v of callSpec('bird','contact','chirp'))voice(v,0,(Math.random()-.5)*1.4,m.birds*.5)}
  // soft generative pad
  if(now>nextNote){nextNote=now+3.5+Math.random()*4;const sc=scaleFor(m.mode);const root=m.mode==='night'?110:146.83;const semi=sc[(Math.random()*sc.length)|0];const f=noteHz(root,semi);const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;const g=ctx.createGain();g.gain.value=0;o.connect(g);g.connect(master);g.gain.linearRampToValueAtTime(.05*m.music,now+1.8);g.gain.linearRampToValueAtTime(0,now+6);o.start(now);o.stop(now+6.2)}
  if(s.walking&&now-lastStep>.42/Math.max(.6,s.walkSpeed||1)){lastStep=now;footstep(s.walkSpeed||1)}
 }
 return {resume,setMuted,call,sfx,update,get muted(){return muted},get ready(){return !!ctx}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { damp, approachSpeed, angleDelta, turnToward, avoid } from '../src/motion.js';

test('damping is frame-rate independent',()=>{
  let a=0,b=0;for(let i=0;i<60;i++)a=damp(a,1,5,1/60);for(let i=0;i<30;i++)b=damp(b,1,5,1/30);
  assert.ok(Math.abs(a-b)<1e-9);assert.ok(a>.99&&a<1);
});
test('speed accelerates and brakes within limits and never overshoots or slides',()=>{
  let v=0;const trace=[];for(let i=0;i<60;i++){v=approachSpeed(v,4.2,16,22,1/60);trace.push(v);assert.ok(v<=4.2+1e-9)}
  assert.ok(trace[0]<=16/60+1e-9,'gentle first step');assert.equal(v,4.2);
  let stops=0;while(v>0&&stops<100){v=approachSpeed(v,0,16,22,1/60);stops++}assert.equal(v,0);assert.ok(stops<15,'stops in about a fifth of a second: '+stops);
  for(let i=1;i<trace.length;i++)assert.ok(trace[i]>=trace[i-1]);
});
test('turning takes the short way round',()=>{
  assert.ok(Math.abs(angleDelta(3,-3)-(2*Math.PI-6))<1e-9);
  let a=3;for(let i=0;i<120;i++)a=turnToward(a,-3,10,1/60);assert.ok(Math.abs(angleDelta(a,-3))<.01);
});
test('camera is kept above ground and out of building footprints',()=>{
  const p=avoid({x:0,y:-3,z:0},[],.9);assert.equal(p.y,.9);
  const q=avoid({x:-20,y:2,z:5.5},[{x:-21,z:5,r:5,h:5}],.9);assert.ok(Math.hypot(q.x+21,q.z-5)>=4.99);
  const high=avoid({x:-20,y:12,z:5.5},[{x:-21,z:5,r:5,h:5}],.9);assert.equal(high.x,-20,'above the roofline is fine');
});

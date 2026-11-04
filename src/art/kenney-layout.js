// Layout for the creek landmarks: a waterfall at the creek head, rocky ridges along the reserve edge and plank bridges.
// Pure data so it can be tested without a renderer. Coordinates follow the creek in art/world-art.js: a plane 40 long,
// rotated 0.28 rad, centred at x = 7.

export const CREEK={cx:7,angle:.28,half:20,mudWidth:7.2};
export const creekX=z=>CREEK.cx-(-z/Math.cos(CREEK.angle))*Math.sin(CREEK.angle);   // creek centre-line x at world z

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// Rock masses are described as {x,z,w,d,h,seed} in a local frame; the renderer turns each into stacked boulders.
export function fallsLayout(){
 const baseZ=-CREEK.half-.4;
 return {
  origin:{x:creekX(baseZ),z:baseZ,rotY:CREEK.angle},
  masses:[
   {x:-3.9,z:-2.0,w:3.3,d:3.6,h:5.2,seed:3},
   {x:3.8,z:-1.9,w:3.3,d:3.4,h:4.2,seed:8},
   {x:0,z:-4.0,w:7.6,d:3.4,h:6.3,seed:5},
  ],
  ledges:[{x:-1.15,y:2.5,z:-1.0,r:.5},{x:1.1,y:3.6,z:-1.3,r:.45},{x:.2,y:1.1,z:-.5,r:.55}],
  ribbon:{width:1.7,path:[[0,5.7,-2.0],[0,4.4,-1.75],[0,2.9,-1.35],[0,1.4,-.8],[0,.35,-.35]]},
  pool:{x:0,z:1.7,r:2.6},
 };
}

// Rocky escarpment along the reserve's north and east edges, seen from inside the savanna.
export const RIDGES=[
 {name:'north',from:[14,-27.3],to:[47,-27.3],face:0},
 {name:'east',from:[49.4,-22],to:[49.4,20],face:-Math.PI/2},
];
export function ridgeLayout(seed=11){
 const r=mulberry(seed),out=[];
 for(const ridge of RIDGES){
  const [x1,z1]=ridge.from,[x2,z2]=ridge.to;const len=Math.hypot(x2-x1,z2-z1);const n=Math.max(2,Math.round(len/6.6));
  for(let i=0;i<n;i++){
   const t=(i+.5)/n;
   out.push({ridge:ridge.name,x:x1+(x2-x1)*t+(ridge.face===0?0:(r()-.5)*.8),z:z1+(z2-z1)*t+(ridge.face===0?(r()-.5)*.8:0),rotY:ridge.face+(r()-.5)*.2,w:6+r()*2.6,d:3.4+r()*1.2,h:2.8+r()*3.4,seed:Math.floor(r()*1000)});
  }
 }
 return out;
}

// Plank bridges across the creek (Kenney Nature Kit, CC0), perpendicular to the flow.
export const BRIDGES=[{z:-8},{z:3.2}];
export const BRIDGE_TILE=1.04*1.4;
export function bridgeLayout(){
 return BRIDGES.map(b=>{
  const n=Math.ceil((CREEK.mudWidth+.8)/BRIDGE_TILE);const cx=creekX(b.z),pieces=[];
  for(let i=0;i<n;i++){
   const end=i===0||i===n-1;
   pieces.push({file:end?'bridge_side_wood':(i%2?'bridge_wood':'bridge_center_wood'),u:(i-(n-1)/2)*BRIDGE_TILE,scale:1.4});
  }
  return {x:cx,z:b.z,rotY:CREEK.angle,length:n*BRIDGE_TILE,pieces};
 });
}

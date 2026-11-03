// Small motion helpers shared by the ranger, the camera and animals: frame-rate independent smoothing and
// acceleration-limited velocity so movement never snaps or slides.
export const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
// Move a scalar speed toward `target`, limited by accel (speeding up) and decel (braking), per second.
export function approachSpeed(current,target,accel,decel,dt){
 const d=target-current;const lim=(d>0&&target>=current&&Math.abs(target)>=Math.abs(current)?accel:decel)*dt;
 return Math.abs(d)<=lim?target:current+Math.sign(d)*lim;
}
// Shortest signed angle from a to b.
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turnToward(angle,target,rate,dt){return angle+angleDelta(angle,target)*Math.min(1,rate*dt)}
// Keep a camera at least `minClear` above the ground and push it out of a circular obstacle (building footprints).
export function avoid(pos,obstacles,minY=.7){
 const out={x:pos.x,y:Math.max(minY,pos.y),z:pos.z};
 for(const o of obstacles||[]){const dx=out.x-o.x,dz=out.z-o.z,d=Math.hypot(dx,dz);if(d<o.r&&out.y<o.h){const k=o.r/(d||1);out.x=o.x+dx*k;out.z=o.z+dz*k}}
 return out;
}

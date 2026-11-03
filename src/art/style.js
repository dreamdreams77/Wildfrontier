// Optional "clay" look: soft matte surfaces, a gentle rim light, rounder shapes and stop-motion animation.
// Switch it on with ?style=clay (remembered on this device) and back off with ?style=default.
function detect() {
  try {
    const q = new URLSearchParams(location.search).get('style');
    if (q === 'clay') { localStorage.setItem('wildfrontier.style', 'clay'); return true; }
    if (q === 'default') { localStorage.removeItem('wildfrontier.style'); return false; }
    return localStorage.getItem('wildfrontier.style') === 'clay';
  } catch { return false; }
}
export const CLAY = typeof location !== 'undefined' && detect();

// Stop-motion: animals and people hold each pose for a twelfth of a second, like clay being nudged frame by frame.
const FRAME = 1 / 12;
export function stepRig(rig, dt, state) {
  if (!CLAY) { rig.update(dt, state); return; }
  rig.__acc = (rig.__acc || 0) + dt;
  if (rig.__acc < FRAME) return;
  const step = Math.min(rig.__acc, 0.2);
  rig.__acc = 0;
  rig.update(step, state);
}

// Shared clock for the clay "boil": surfaces shimmer a little, re-rolled 12 times a second.
export const clayTime = { value: 0 };

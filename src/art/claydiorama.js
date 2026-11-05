import * as THREE from 'three';
import { blobGeo, xform, merge } from './meshkit.js';

// Diorama dressing that makes the reserve read like a stop-motion set (after Hollow Tide): lumpy clay clouds hung
// in the sky, a pressed clay moon with thumb-dent craters, and a storybook sky palette for every time of day.
const C = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Sky colours per time of day: periwinkle and peach by day, violet and coral at dusk, deep indigo at night.
export const SKY = {
  Dawn: { top: '#8a7fd0', horizon: '#ffc4a4', fog: '#e8c4b8' },
  Day: { top: '#7e95e0', horizon: '#f7dcc0', fog: '#dccfd2' },
  Dusk: { top: '#4b3c98', horizon: '#f39478', fog: '#c99aa0' },
  Night: { top: '#150f3a', horizon: '#3e3172', fog: '#2f2856' },
  Rain: { top: '#76809e', horizon: '#bdb6c6', fog: '#a9a6b8' },
};
export function skyFor(phase, weather) {
  if (weather === 'Light rain' && phase !== 'Night') return SKY.Rain;
  return SKY[phase] || SKY.Day;
}

// A cloud is a handful of squashed lumps on a flat underside, lighter on top, lavender underneath.
function cloudGeo(seed) {
  const r = mulberry(seed), parts = [], n = 4 + Math.floor(r() * 4), len = 9 + r() * 10;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - .5, mid = 1 - Math.abs(t) * 1.3;
    const rx = 3.2 + r() * 2.6, ry = (1.8 + r() * 1.8) * (.6 + mid * .7), rz = 2.6 + r() * 2;
    const g = blobGeo(rx, ry, rz, { seg: 14, noise: .18, freq: 1.1, seed: seed * 7 + i, low: C('#b8a8e0'), high: C('#fff6ec'), squash: .75 });
    parts.push(xform(g, { pos: [t * len, ry * .35 + r() * .6, (r() - .5) * 2.4] }));
  }
  return merge(parts);
}

function moonGeo() {
  const g = blobGeo(1, 1, 1, { seg: 28, noise: .04, freq: 2, seed: 4, low: C('#d9cfb4'), high: C('#fff8e4') });
  // thumb-pressed craters: darken and push in a few patches
  const p = g.attributes.position, col = g.attributes.color, v = new THREE.Vector3();
  const craters = [[.35, .45, .82, .28], [-.4, .1, .9, .22], [.05, -.45, .88, .3], [.55, -.2, .8, .16], [-.2, .62, .76, .14]].map(([x, y, z, rad]) => ({ c: new THREE.Vector3(x, y, z).normalize(), rad }));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    let dent = 0; for (const cr of craters) { const d = n.distanceTo(cr.c); if (d < cr.rad) dent = Math.max(dent, 1 - d / cr.rad); }
    if (dent > 0) { v.multiplyScalar(1 - dent * .08); p.setXYZ(i, v.x, v.y, v.z); col.setXYZ(i, col.getX(i) * (1 - dent * .28), col.getY(i) * (1 - dent * .3), col.getZ(i) * (1 - dent * .22)); }
  }
  g.computeVertexNormals(); return g;
}

export function buildClayDiorama(scene, art) {
  const group = new THREE.Group(); group.name = 'clay-diorama'; scene.add(group);
  // clouds
  const cloudMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, fog: false });
  const clouds = new THREE.Group(); const r = mulberry(31);
  for (let i = 0; i < 11; i++) {
    const m = new THREE.Mesh(cloudGeo(i + 3), cloudMat);
    const a = i / 11 * Math.PI * 2 + r() * .3, rad = 96 + r() * 26;
    m.position.set(9 + Math.cos(a) * rad, 30 + r() * 18, Math.sin(a) * rad * .9);
    m.lookAt(9, m.position.y, 0); m.scale.setScalar(1.2 + r() * .7); m.renderOrder = -8;
    clouds.add(m);
  }
  group.add(clouds);
  if (art.sky) { if (art.sky.clouds) art.sky.clouds.visible = false; art.sky.cmats.push(cloudMat); }
  // moon
  const moonMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, emissive: '#fff1c8', emissiveIntensity: .55, fog: false });
  const moon = new THREE.Mesh(moonGeo(), moonMat); moon.scale.setScalar(7); moon.visible = false; moon.renderOrder = -8;
  group.add(moon);
  return {
    group, clouds, moon,
    update(dt) { clouds.rotation.y += dt * .004; },
    setTime({ night, dusk, sunDir }) {
      moon.visible = night || dusk;
      // the moon rises opposite the sun, high enough to sit above the hills
      const d = sunDir ? sunDir.clone().multiplyScalar(-1) : new THREE.Vector3(.3, .6, -.7);
      d.y = Math.max(.35, Math.abs(d.y)); d.normalize();
      moon.position.set(9 + d.x * 130, 10 + d.y * 80, d.z * 130); moon.lookAt(9, 0, 0);
      moonMat.emissiveIntensity = night ? .7 : .25;
    },
  };
}

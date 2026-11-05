import * as THREE from 'three';

// Claymation look, after Hollow Tide: every solid surface becomes hand-pressed plasticine.
//  - a tiling fingerprint / thumb-dent / tool-scratch texture, projected from all three axes so it works on any mesh
//  - painted textures are softened toward their average colour, so they read as tinted clay rather than illustration
//  - "boil": surfaces re-roll a tiny lumpy displacement at 12 fps, like an animator nudging the clay between frames
//  - characters pose on twos (12 fps) while they still travel smoothly
//  - warm key light, violet-tinted shadows (never black), a warm table bounce underneath and a soft rim
export const STOP_FPS = 12;
const STEP = 1 / STOP_FPS;

export const clayUniforms = {
  uClayFrame: { value: 0 },
  uClayMap: { value: null },
  uClayShadow: { value: new THREE.Color('#ece4ff') },
  uClayBounce: { value: new THREE.Color('#ffb98a') },
  uClayRimColor: { value: new THREE.Color('#ffe9cf') },
  uClaySat: { value: 1.28 },
};
export const clayFrameAt = t => Math.floor(t * STOP_FPS);

// ---- fingerprint texture --------------------------------------------------------------------------------------
// RGB = tangent-space normal, A = height (ridges light, dents dark). Tileable; built once on a 2D canvas.
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export function clayHeightField(N = 256, seed = 7) {
  const r = mulberry(seed), h = new Float32Array(N * N);
  const wrap = d => { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; };
  const each = (cx, cz, rad, fn) => {
    for (let y = Math.floor(cz - rad); y <= cz + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = wrap(x - cx), dy = wrap(y - cz), d = Math.hypot(dx, dy); if (d > rad) continue;
      const i = ((y % N + N) % N) * N + ((x % N + N) % N); h[i] += fn(d / rad, dx, dy, d);
    }
  };
  // fingerprint whorls: elliptical ridges that fade toward the edge of the print
  for (let k = 0; k < 9; k++) {
    const cx = r() * N, cz = r() * N, rad = N * (.12 + r() * .1), squash = .6 + r() * .4, rot = r() * Math.PI, freq = 1.25 + r() * .3;
    const c = Math.cos(rot), s = Math.sin(rot);
    each(cx, cz, rad, (t, dx, dy) => { const u = dx * c + dy * s, v = (-dx * s + dy * c) / squash; return Math.cos(Math.hypot(u, v) * freq) * .5 * (1 - t * t); });
  }
  // thumb dents: broad shallow hollows with a soft raised lip
  for (let k = 0; k < 6; k++) each(r() * N, r() * N, N * (.1 + r() * .08), t => -Math.exp(-t * t * 4) * 1.4 + Math.exp(-((t - .85) ** 2) * 40) * .3);
  // modelling-tool drags
  for (let k = 0; k < 4; k++) {
    let x = r() * N, y = r() * N; const a = r() * Math.PI * 2, len = N * (.05 + r() * .12), w = 1.2 + r();
    for (let s = 0; s < len; s++) { each(x, y, w * 1.6, t => -.6 * (1 - t)); x += Math.cos(a); y += Math.sin(a); }
  }
  // speckle and grit
  for (let k = 0; k < N * 2.4; k++) each(r() * N, r() * N, 1 + r() * 1.6, t => (r() < .5 ? .35 : -.35) * (1 - t));
  // light blur so nothing is sharper than a thumb
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += h[((y + j + N) % N) * N + ((x + i + N) % N)] * (i === 0 && j === 0 ? 4 : i === 0 || j === 0 ? 2 : 1);
    out[y * N + x] = s / 16;
  }
  let mn = Infinity, mx = -Infinity; for (const v of out) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / (mx - mn || 1);
  return { N, h: out };
}
export function clayTexture() {
  if (clayUniforms.uClayMap.value || typeof document === 'undefined') return clayUniforms.uClayMap.value;
  const { N, h } = clayHeightField(256);
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const img = g.createImageData(N, N);
  const at = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2, dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / l * .5 + .5) * 255; img.data[i + 1] = (-dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = h[y * N + x] * 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.premultiplyAlpha = false;
  clayUniforms.uClayMap.value = t; return t;
}

// ---- shader injection -----------------------------------------------------------------------------------------
const V_COMMON = `
uniform float uClayFrame;uniform float uClayBoil;varying vec3 vClayW;varying vec3 vClayWN;
float clayHash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float clayNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(clayHash(i),clayHash(i+vec3(1,0,0)),f.x),mix(clayHash(i+vec3(0,1,0)),clayHash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(clayHash(i+vec3(0,0,1)),clayHash(i+vec3(1,0,1)),f.x),mix(clayHash(i+vec3(0,1,1)),clayHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const V_BOIL = `
if(uClayBoil>0.){float cf=uClayFrame;float cb=clayNoise(position*2.1+vec3(cf*1.37,cf*.71,cf*2.13))-.5;transformed+=objectNormal*cb*uClayBoil;}`;
const V_WORLD = `
{vec4 cw=vec4(transformed,1.0);
#ifdef USE_INSTANCING
cw=instanceMatrix*cw;
#endif
cw=modelMatrix*cw;vClayW=cw.xyz;vClayWN=normalize(mat3(modelMatrix)*objectNormal);}`;
const F_COMMON = `
uniform sampler2D uClayMap;uniform float uClayFrame;uniform float uClayScale;uniform float uClayStrength;uniform float uClaySoft;uniform float uClayRim;
uniform vec3 uClayShadow;uniform vec3 uClayBounce;uniform vec3 uClayRimColor;uniform float uClaySat;varying vec3 vClayW;varying vec3 vClayWN;`;
const F_MAP = `
#ifdef USE_MAP
 vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 vec3 clayAvg=texture(map,vMapUv,9.0).rgb;
 sampledDiffuseColor.rgb=mix(clayAvg,sampledDiffuseColor.rgb,uClaySoft);
 diffuseColor*=sampledDiffuseColor;
#endif`;
const F_COLOR = `
vec3 clayN=normalize(vClayWN);vec3 clayB=pow(abs(clayN),vec3(4.));clayB/=dot(clayB,vec3(1.));
vec2 clayJ=vec2(fract(uClayFrame*.618),fract(uClayFrame*.382))*.012;
#ifdef CLAY_LITE
vec2 clayUV=clayB.x>clayB.y&&clayB.x>clayB.z?vClayW.zy:clayB.y>clayB.z?vClayW.xz:vClayW.xy;
vec4 clayS=texture2D(uClayMap,clayUV*uClayScale+clayJ);vec4 clayX=clayS,clayY=clayS,clayZ=clayS;
#else
vec4 clayX=texture2D(uClayMap,vClayW.zy*uClayScale+clayJ);
vec4 clayY=texture2D(uClayMap,vClayW.xz*uClayScale+clayJ.yx);
vec4 clayZ=texture2D(uClayMap,vClayW.xy*uClayScale-clayJ);
#endif
float clayH=clayX.a*clayB.x+clayY.a*clayB.y+clayZ.a*clayB.z;
diffuseColor.rgb*=.84+.28*clayH;
{float cl=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=max(mix(vec3(cl),diffuseColor.rgb,uClaySat),0.);}`;
const F_ROUGH = `
roughnessFactor=clamp(roughnessFactor*.82+(.55-clayH)*.16,.32,1.);`;
const F_NORMAL = `
{vec3 nx=clayX.xyz*2.-1.,ny=clayY.xyz*2.-1.,nz=clayZ.xyz*2.-1.;
 vec3 clayP=vec3(0.,nx.y,nx.x)*clayB.x+vec3(ny.x,0.,ny.y)*clayB.y+vec3(nz.x,nz.y,0.)*clayB.z;
 normal=normalize(normal+(viewMatrix*vec4(clayP*uClayStrength,0.)).xyz);}`;
const F_LIGHT = `
{float under=clamp(-clayN.y,0.,1.);
 reflectedLight.indirectDiffuse*=uClayShadow;
 reflectedLight.indirectDiffuse+=diffuseColor.rgb*uClayBounce*under*.22;
 float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
 reflectedLight.directDiffuse+=diffuseColor.rgb*uClayRimColor*rim*uClayRim;}`;

// Low tier samples the clay texture once (dominant axis) instead of three times.
let lite = false;
export const setClayLite = v => { lite = !!v; };
const SKIP = m => !m || m.userData.clay || m.userData.noClay || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) || (m.transparent && m.opacity < .99) || m.depthWrite === false;

// Turn one material into clay. Options are per material: boil (displacement in object units), scale (texture tiles per
// world unit), strength (bump), soft (0 = flat average colour, 1 = full painted texture), rim.
export function clayify(material, { boil = .012, scale = .9, strength = .55, soft = .5, rim = .22 } = {}) {
  if (SKIP(material)) return false;
  clayTexture();
  const u = { uClayBoil: { value: boil }, uClayScale: { value: scale }, uClayStrength: { value: strength }, uClaySoft: { value: soft }, uClayRim: { value: rim } };
  material.userData.clay = u;
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey, useLite = lite;
  material.onBeforeCompile = (s, r) => {
    if (prev) prev.call(material, s, r);
    Object.assign(s.uniforms, clayUniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>' + V_COMMON)
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + V_BOIL)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>' + V_WORLD);
    let f = s.fragmentShader.replace('#include <common>', '#include <common>' + (useLite ? '\n#define CLAY_LITE' : '') + F_COMMON);
    if (f.includes('#include <map_fragment>')) f = f.replace('#include <map_fragment>', F_MAP);
    f = f.replace('#include <color_fragment>', '#include <color_fragment>' + F_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + F_ROUGH)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + F_NORMAL)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>' + F_LIGHT);
    s.fragmentShader = f;
  };
  const custom = prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey;
  material.customProgramCacheKey = () => (custom ? prevKey.call(material) : prev ? prev.toString() : '') + '|clay' + (useLite ? '-lite' : '');
  material.needsUpdate = true;
  return true;
}

// Walk a scene (or any object) and clay every solid material once. Called again later it only touches new materials.
export function clayifyTree(root, pick = () => ({})) {
  let n = 0;
  root.traverse(o => {
    if (!o.isMesh || o.userData.noClay) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) if (clayify(m, pick(o, m))) n++;
  });
  return n;
}

// Pose characters on twos: the rig only advances in 1/12 s steps (with the time it skipped), so limbs move like a
// puppet re-posed between photographs while the creature still travels smoothly across the ground.
export function stopMotionRig(rig, phase = Math.random()) {
  if (!rig || rig.stopMotion) return rig;
  const raw = rig.update.bind(rig); let acc = phase * STEP;
  rig.update = (dt, ctx) => { acc += dt; if (acc >= STEP) { raw(acc, ctx); acc = 0; } };
  rig.stopMotion = true;
  return rig;
}

export function updateClay(t) { clayUniforms.uClayFrame.value = clayFrameAt(t) % 4096; }
// Light mood per time of day: indirect light tinted toward violet, a warm bounce from below.
export function setClayMood({ night = false, dusk = false } = {}) {
  clayUniforms.uClayShadow.value.set(night ? '#c4c2ff' : dusk ? '#eed6ff' : '#ece4ff');
  clayUniforms.uClayBounce.value.set(night ? '#6a78c8' : dusk ? '#ff9a6a' : '#ffbe8f');
  clayUniforms.uClayRimColor.value.set(night ? '#a8c0ff' : '#ffe9cf');
}

// Film finish (DOM overlay, so it costs almost nothing on phones): a stepped grain that re-rolls at 12 fps, a dusky
// violet-to-warm split tone and a soft vignette, like the stop-motion camera in Hollow Tide.
export function mountFilmFinish(parent = document.body) {
  if (typeof document === 'undefined' || document.getElementById('clayFilm')) return null;
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const img = g.createImageData(160, 160);
  const r = mulberry(3);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() < .5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 38; }
  g.putImageData(img, 0, 0);
  const film = document.createElement('div'); film.id = 'clayFilm'; film.setAttribute('aria-hidden', 'true');
  film.innerHTML = '<i class="cf-tone"></i><i class="cf-grain"></i>';
  film.querySelector('.cf-grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
  parent.appendChild(film);
  const grain = film.querySelector('.cf-grain'); let last = -1;
  const tick = t => { const f = Math.floor(t / 1000 * STOP_FPS); if (f !== last) { last = f; grain.style.backgroundPosition = ((f * 53) % 160) + 'px ' + ((f * 97) % 160) + 'px'; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return film;
}

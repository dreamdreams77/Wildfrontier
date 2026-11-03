import * as THREE from 'three';
import { fbm, smooth } from './noise.js';
import { groundTexture, waterNormal, cloudTexture, canPaint } from './paint.js';

// Ground, water, sky and distant landscape. The playable plane is almost flat (animals and people walk at y = 0);
// hills rise only outside the reserve so the world feels enclosed by real landscape.
const BOUNDS = { cx: 9, cz: 0, hx: 40, hz: 28 };

const clamp01 = v => Math.max(0, Math.min(1, v));

// ------------------------------------------------------------
// MASKS: where trails, meadows, woods and the creek bank sit
// ------------------------------------------------------------

function distToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const apx = px - ax, apz = pz - az;
  const len2 = abx * abx + abz * abz;
  const t = len2 > 0 ? clamp01((apx * abx + apz * abz) / len2) : 0;
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

function ellipseMask(x, z, cx, cz, rx, rz, softness = 0.25) {
  const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
  return 1 - smooth(1 - softness, 1, d);
}

const TRAILS = [
  [-18, 10, -8, 5],
  [-8, 5, -3, -5],
  [-6, 4, 5.2, 4],
  [-1, 2, 8.2, 10],
  [-20, 5, -12, 7],
  [-20, -7, -11, -2]
];

function trailMask(x, z) {
  let d = 100;
  for (const [ax, az, bx, bz] of TRAILS) d = Math.min(d, distToSegment(x, z, ax, az, bx, bz));
  const broad = 1 - smooth(0.65, 1.65, d);
  const core = 1 - smooth(0.18, 0.72, d);
  return clamp01(broad * 0.55 + core * 0.45);
}

const biomeX = (x, z) => x + Math.sin(z * 0.16) * 2.2;
const woodlandMask = (x, z) => 1 - smooth(9, 19, biomeX(x, z));
const savannaMask = (x, z) => smooth(11, 19, biomeX(x, z));

function dampCreekMask(x, z) {
  const d = Math.abs(x - (7 + z * -0.075));
  return (1 - smooth(2.4, 3.9, d)) * (1 - smooth(18, 22, Math.abs(z)));
}

const oakFloorMask = (x, z) => ellipseMask(x, z, -3, -5, 5.4, 4.7, 0.42);

function meadowMask(x, z) {
  return Math.max(
    ellipseMask(x, z, -2, 2, 9.5, 7.5, 0.3),
    ellipseMask(x, z, 5, 9, 8, 6, 0.34)
  );
}

function stationMask(x, z) {
  return Math.max(
    ellipseMask(x, z, -19, 10, 5.0, 4.2, 0.28),
    ellipseMask(x, z, -21, 5, 5.0, 4.0, 0.28),
    ellipseMask(x, z, -12, 7, 5.2, 3.8, 0.28),
    ellipseMask(x, z, -21, -7, 5.3, 4.2, 0.28)
  );
}

// ------------------------------------------------------------
// HEIGHT
// ------------------------------------------------------------

export function heightAt(x, z) {
  const dx = Math.max(0, Math.abs(x - BOUNDS.cx) - BOUNDS.hx);
  const dz = Math.max(0, Math.abs(z - BOUNDS.cz) - BOUNDS.hz);
  const d = Math.hypot(dx, dz);

  const micro =
    (fbm(x * 0.35, z * 0.35, 0, 3, 4) - 0.5) * 0.045 +
    (fbm(x * 0.85 + 12, z * 0.85 - 4, 0, 2, 17) - 0.5) * 0.018;

  if (d <= 0) return micro;

  const k = smooth(0, 14, d);
  const broad = fbm(x * 0.035 + 3, z * 0.035 - 6, 0, 4, 9);
  const detail = fbm(x * 0.075 - 8, z * 0.075 + 11, 0, 3, 27);
  const hills = (broad * 0.72 + detail * 0.28 + 0.18) * 14.5;

  return micro * (1 - k) + hills * k * k;
}

// ------------------------------------------------------------
// GROUND
// ------------------------------------------------------------

export const groundFx = { uCloudT: { value: 0 }, uCloud: { value: 0 } };   // drifting cloud shadows: time and strength (0 at night or in rain)

const GROUND_VERT_DECL = `#include <common>
attribute float aSav;
attribute float aTrail;
attribute float aBank;
attribute float aMeadow;
attribute float aWood;
attribute float aStation;
varying float vSav;
varying float vTrail;
varying float vBank;
varying float vMeadow;
varying float vWood;
varying float vStation;
varying vec2 vGW;
`;

const GROUND_VERT_BODY = `#include <begin_vertex>
vSav = aSav;
vTrail = aTrail;
vBank = aBank;
vMeadow = aMeadow;
vWood = aWood;
vStation = aStation;
vGW = (modelMatrix * vec4(position, 1.0)).xz;
`;

const GROUND_FRAG_DECL = `#include <common>
uniform sampler2D mapB;
uniform float uCloudT;
uniform float uCloud;
varying float vSav;
varying float vTrail;
varying float vBank;
varying float vMeadow;
varying float vWood;
varying float vStation;
varying vec2 vGW;

float wfHash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float wfNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = wfHash(i);
  float b = wfHash(i + vec2(1.0, 0.0));
  float c = wfHash(i + vec2(0.0, 1.0));
  float d = wfHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

// Replaces map_fragment wholesale: it must stay ONE replacement, because a second
// replace of '#include <map_fragment>' would find nothing and silently never run.
const GROUND_FRAG_BODY = `
#ifdef USE_MAP
  vec4 woodlandSample = texture2D(map, vMapUv);
  vec4 savannaSample = texture2D(mapB, vMapUv);
  diffuseColor *= mix(woodlandSample, savannaSample, vSav);
#endif

float macro =
  wfNoise(vGW * 0.045) * 0.58 +
  wfNoise(vGW * 0.13 + vec2(13.0, -7.0)) * 0.28 +
  wfNoise(vGW * 0.42 - vec2(5.0, 11.0)) * 0.14;

// Darker woodland soil and leaf litter
vec3 forestTint = vec3(0.49, 0.53, 0.36) * (0.88 + macro * 0.24);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * forestTint, vWood * 0.28);

// Fresher meadow colouring
vec3 meadowTint = vec3(0.74, 0.89, 0.55);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * meadowTint, vMeadow * (1.0 - vSav) * 0.20);

// Damp creek-bank soil
vec3 bankTint = vec3(0.39, 0.34, 0.24);
diffuseColor.rgb = mix(diffuseColor.rgb, bankTint * (0.83 + macro * 0.16), vBank * (1.0 - vSav) * 0.68);

// Compacted walking trails
vec3 pathTint = vec3(0.47, 0.40, 0.29);
float pathBroken = clamp(vTrail * (0.84 + wfNoise(vGW * 1.15) * 0.28), 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, pathTint * (0.92 + macro * 0.13), pathBroken * 0.73);

// Disturbed earth around the field station
vec3 stationTint = vec3(0.46, 0.42, 0.31);
diffuseColor.rgb = mix(diffuseColor.rgb, stationTint, vStation * 0.18);

// Break up large flat areas
diffuseColor.rgb *= 0.94 + macro * 0.11;

// Moving cloud shadows
float cl =
  wfNoise(vGW * 0.035 + vec2(uCloudT * 0.012, uCloudT * 0.006)) * 0.65 +
  wfNoise(vGW * 0.09 - vec2(uCloudT * 0.02, 0.0)) * 0.35;
diffuseColor.rgb *= 1.0 - uCloud * 0.25 * smoothstep(0.48, 0.72, cl);
`;

export function buildGround(scene, { tier }) {
  const size = 130;
  const seg = tier.pixelRatio > 1.5 ? 170 : 120;

  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  g.translate(BOUNDS.cx, 0, 0);

  const p = g.attributes.position;
  const col = [], sav = [], trails = [], banks = [], meadows = [], woods = [], stations = [];

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const y = heightAt(x, z);
    p.setY(i, y);

    sav.push(savannaMask(x, z));
    trails.push(trailMask(x, z));
    banks.push(dampCreekMask(x, z));
    meadows.push(meadowMask(x, z));
    woods.push(Math.max(woodlandMask(x, z) * 0.7, oakFloorMask(x, z)));
    stations.push(stationMask(x, z));

    const broad = fbm(x * 0.045, z * 0.045, 0, 4, 2);
    const medium = fbm(x * 0.16 + 5, z * 0.16 - 2, 0, 3, 8);
    const fine = fbm(x * 0.58 - 13, z * 0.58 + 7, 0, 2, 21);
    const variation = 0.78 + broad * 0.22 + (medium - 0.5) * 0.11 + (fine - 0.5) * 0.045;

    // hill flanks fade toward cool blue-green so distance reads as atmosphere
    const hh = clamp01(y / 9);
    col.push(variation * (1 - hh * 0.2), variation * (1 - hh * 0.1), variation * (1 + hh * 0.02));
  }

  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSav', new THREE.Float32BufferAttribute(sav, 1));
  g.setAttribute('aTrail', new THREE.Float32BufferAttribute(trails, 1));
  g.setAttribute('aBank', new THREE.Float32BufferAttribute(banks, 1));
  g.setAttribute('aMeadow', new THREE.Float32BufferAttribute(meadows, 1));
  g.setAttribute('aWood', new THREE.Float32BufferAttribute(woods, 1));
  g.setAttribute('aStation', new THREE.Float32BufferAttribute(stations, 1));
  g.computeVertexNormals();

  const woodlandTex = canPaint ? groundTexture('woodland') : null;
  const savannaTex = canPaint ? groundTexture('savanna') : null;

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    map: woodlandTex
  });

  // mapB reuses the woodland UV transform, so only the woodland repeat matters.
  if (woodlandTex) {
    woodlandTex.wrapS = woodlandTex.wrapT = THREE.RepeatWrapping;
    woodlandTex.repeat.set(34, 34);
  }
  if (savannaTex) savannaTex.wrapS = savannaTex.wrapT = THREE.RepeatWrapping;

  mat.onBeforeCompile = shader => {
    shader.uniforms.mapB = { value: savannaTex || woodlandTex };
    shader.uniforms.uCloudT = groundFx.uCloudT;
    shader.uniforms.uCloud = groundFx.uCloud;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', GROUND_VERT_DECL)
      .replace('#include <begin_vertex>', GROUND_VERT_BODY);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', GROUND_FRAG_DECL)
      .replace('#include <map_fragment>', GROUND_FRAG_BODY);
  };
  mat.customProgramCacheKey = () => 'wildfrontier-ground-overhaul-1';

  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  scene.add(mesh);
  return mesh;
}

// ------------------------------------------------------------
// WATER: depth-graded, soft-edged, with animated foam, glints and ripples where people and animals move
// ------------------------------------------------------------

const water = {
  tex: null,
  cache: new Map(),
  uT: { value: 0 },
  uAct: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }
};

const WATER_CHUNK = {
  vert: `
varying vec2 vWU;
varying vec3 vWP;
`,
  frag: `
varying vec2 vWU;
varying vec3 vWP;
uniform float uT;
uniform vec4 uAct[8];
uniform float uDisc;
uniform vec3 uDeep;

float wfWaterHash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float wfWaterNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(wfWaterHash(i), wfWaterHash(i + vec2(1.0, 0.0)), f.x),
    mix(wfWaterHash(i + vec2(0.0, 1.0)), wfWaterHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
`
};

const WATER_COLOR_BODY = `#include <color_fragment>

vec2 q = vWU - 0.5;
float r = uDisc > 0.5 ? length(q) * 2.0 : max(abs(q.x), abs(q.y)) * 2.0;
float depth = 1.0 - smoothstep(0.10, 0.94, r);

vec3 shallow = diffuseColor.rgb * vec3(1.03, 1.07, 1.03);
vec3 deep = uDeep * vec3(0.83, 1.03, 1.07);
diffuseColor.rgb = mix(shallow, deep, depth * 0.78);

float n1 = wfWaterNoise(vWP.xz * 2.5 + vec2(uT * 0.27, uT * 0.40));
float n2 = wfWaterNoise(vWP.xz * 8.5 - vec2(uT * 0.58, uT * 0.31));
float n3 = wfWaterNoise(vWP.xz * 18.0 + vec2(uT * 0.93, -uT * 0.72));
float wob = (n1 - 0.5) * 0.055 + (n2 - 0.5) * 0.025 + (n3 - 0.5) * 0.008;

// Soft shoreline foam
float foam = smoothstep(0.80, 0.94, r + wob) * (1.0 - smoothstep(0.95, 1.0, r + wob * 0.5));

// Ripples made by nearby animals and the ranger
float ripple = 0.0;
for (int i = 0; i < 8; i++) {
  vec4 a = uAct[i];
  if (a.w > 0.0) {
    float d = distance(vWP.xz, a.xy);
    ripple += sin(d * 13.0 - uT * 6.0) * exp(-d * 1.7) * a.w;
  }
}

// Small moving highlights
float glint = pow(max(n3 - 0.70, 0.0) * 3.25, 2.0);
diffuseColor.rgb += vec3(0.78, 0.90, 0.86) * (foam * 0.23 + glint * 0.14);
diffuseColor.rgb += ripple * 0.055;

// Fade the water out naturally at the shoreline
float edgeAlpha = 1.0 - smoothstep(0.86, 1.0, r);
diffuseColor.a *= mix(0.68, 0.94, depth) * edgeAlpha + foam * 0.12;
`;

export function waterMaterial(color = '#4f8e98', disc = false) {
  const key = color + (disc ? 'd' : 'p');
  if (water.cache.has(key)) return water.cache.get(key);

  if (!water.tex && canPaint) {
    water.tex = waterNormal();
    water.tex.wrapS = water.tex.wrapT = THREE.RepeatWrapping;
    water.tex.repeat.set(4, 4);
  }

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
    normalMap: water.tex,
    normalScale: new THREE.Vector2(0.55, 0.55),
    envMapIntensity: 1.15,
    depthWrite: false,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24
  });

  mat.onBeforeCompile = shader => {
    shader.uniforms.uT = water.uT;
    shader.uniforms.uAct = water.uAct;
    shader.uniforms.uDisc = { value: disc ? 1 : 0 };
    shader.uniforms.uDeep = { value: new THREE.Color(color).multiplyScalar(0.38) };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + WATER_CHUNK.vert)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWU = uv;
vWP = (modelMatrix * vec4(position, 1.0)).xyz;
`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WATER_CHUNK.frag)
      .replace('#include <color_fragment>', WATER_COLOR_BODY);
  };
  mat.customProgramCacheKey = () => 'wildfrontier-water-overhaul-1-' + (disc ? 'disc' : 'plane');

  water.cache.set(key, mat);
  return mat;
}

export function updateWater(t) {
  water.uT.value = t;
  groundFx.uCloudT.value = t;
  if (water.tex) water.tex.offset.set(t * 0.009, t * 0.016);
}

// movers near water make ripples: [{x,z,speed(0-1)}]
export function setWaterActors(list) {
  const u = water.uAct.value;
  for (let i = 0; i < 8; i++) {
    const a = list[i];
    if (a) u[i].set(a.x, a.z, 0, Math.min(1, a.speed));
    else u[i].set(0, 0, 0, 0);
  }
}

export function makeWaterPlane(w, d, { color } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), waterMaterial(color || '#4d8588', false));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

export function makeWaterDisc(r, { color, sx = 1, sz = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), waterMaterial(color || '#507f80', true));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(sx, sz, 1);
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

// ------------------------------------------------------------
// SKY: dome, sun, stars, clouds
// ------------------------------------------------------------

export function buildSky(scene) {
  const u = {
    top: { value: new THREE.Color('#6b98c1') },
    horizon: { value: new THREE.Color('#c6c5a7') },
    sunDir: { value: new THREE.Vector3(-0.4, 0.8, 0.45).normalize() },
    sunColor: { value: new THREE.Color('#ffd9a0') },
    night: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,

    vertexShader: `
varying vec3 vP;
void main(){
  vP = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

    fragmentShader: `
varying vec3 vP;
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float night;

float wfSkyHash(vec2 p){
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(){
  float h = clamp(vP.y, 0.0, 1.0);
  vec3 c = mix(horizon, top, pow(h, 0.58));

  float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
  float sunHalo = pow(s, 5.0) * 0.10;
  float sunCore = pow(s, 70.0) * 0.52;
  c += sunColor * (sunHalo + sunCore) * (1.0 - night);

  // Warm atmospheric band near the horizon
  float hz = 1.0 - smoothstep(0.0, 0.22, max(vP.y, 0.0));
  c = mix(c, c + sunColor * 0.055, hz * (1.0 - night));

  // Fade below the horizon (edges in ascending order: GLSL leaves reversed edges undefined)
  float below = 1.0 - smoothstep(-0.25, 0.0, vP.y);
  c = mix(c, horizon * 0.82, below);

  // Sparse stars at night
  float stars = step(0.9968, wfSkyHash(floor(vP.xz * 240.0 + vP.y * 100.0)));
  stars *= night * smoothstep(0.08, 0.60, h);
  c += vec3(stars * 0.90, stars * 0.94, stars);

  gl_FragColor = vec4(c, 1.0);
}
`
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(160, 36, 20), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);

  // Cloud layer. world.js retints and re-fades these with the weather and time of day.
  const clouds = new THREE.Group();
  const ct = canPaint ? cloudTexture() : null;
  const cmats = [];
  const cloudCount = 15;

  for (let i = 0; i < cloudCount; i++) {
    const m = new THREE.MeshBasicMaterial({
      map: ct,
      transparent: true,
      depthWrite: false,
      fog: false,
      opacity: 0.42 + (i % 4) * 0.07,
      color: i % 5 === 0 ? '#f5eadc' : '#f2f5ed'
    });
    cmats.push(m);

    const width = 46 + ((i * 37) % 50);
    const height = 17 + ((i * 11) % 13);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), m);

    const a = (i / cloudCount) * Math.PI * 2;
    const r = 102 + ((i * 13) % 22);
    plane.position.set(Math.cos(a) * r, 36 + ((i * 17) % 20), Math.sin(a) * r);
    plane.lookAt(0, 24, 0);
    plane.renderOrder = -9;
    clouds.add(plane);
  }
  scene.add(clouds);

  return {
    uniforms: u,
    dome,
    clouds,
    cmats,
    update(dt) { clouds.rotation.y += dt * 0.0027; }
  };
}

// ------------------------------------------------------------
// DISTANT LANDSCAPE: ridges and a treeline so the horizon is never an empty edge
// ------------------------------------------------------------

export function buildHorizon(scene, fogColor) {
  const group = new THREE.Group();

  const ridgeMaterial = new THREE.MeshBasicMaterial({
    color: fogColor,
    fog: false,
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    side: THREE.DoubleSide   // visible from inside whichever way the strip is wound
  });

  function ridgeGeometry(radius, height, seed, yOffset = -1) {
    const count = 72;
    const positions = [];
    const indices = [];

    for (let i = 0; i <= count; i++) {
      const a = (i / count) * Math.PI * 2;

      const waveA = Math.sin(a * 3 + seed * 0.71);
      const waveB = Math.sin(a * 7 - seed * 1.12);
      const waveC = Math.sin(a * 13 + seed * 2.4);

      const rr = radius + waveA * 3.8 + waveB * 1.9 + waveC * 0.7;
      const mountain = Math.pow(Math.max(0, (Math.sin(a * 5 + seed) + 1) * 0.5), 2);
      const ridgeY = yOffset + height * (0.28 + mountain * 0.42 + waveB * 0.06 + waveC * 0.025);

      // bottom edge, then irregular upper silhouette
      positions.push(
        BOUNDS.cx + Math.cos(a) * (rr + 2), yOffset - 5, Math.sin(a) * (rr + 2),
        BOUNDS.cx + Math.cos(a) * rr, ridgeY, Math.sin(a) * rr
      );

      if (i < count) {
        const q = i * 2;
        indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  group.add(new THREE.Mesh(ridgeGeometry(116, 22, 4, -2), ridgeMaterial));

  const nearMat = ridgeMaterial.clone();
  nearMat.color = new THREE.Color(fogColor).multiplyScalar(0.82);
  nearMat.opacity = 0.53;
  group.add(new THREE.Mesh(ridgeGeometry(90, 14, 19, -2), nearMat));

  // Distant treeline (seeded so the horizon is identical every load)
  const treeGeo = new THREE.ConeGeometry(1, 1, 6);
  treeGeo.translate(0, 0.5, 0);

  const n = 190;
  const trees = new THREE.InstancedMesh(
    treeGeo,
    new THREE.MeshStandardMaterial({ color: '#385e40', roughness: 1 }),
    n
  );

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);

  let state = 92761;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  let k = 0;
  let tries = 0;
  while (k < n && tries < 2600) {
    tries++;
    const a = random() * Math.PI * 2;
    const r = 48 + random() * 38;
    const x = BOUNDS.cx + Math.cos(a) * r * 1.15;
    const z = Math.sin(a) * r * 0.95;

    const dx = Math.max(0, Math.abs(x - BOUNDS.cx) - BOUNDS.hx - 1);
    const dz = Math.max(0, Math.abs(z) - BOUNDS.hz - 1);
    if (Math.hypot(dx, dz) < 2) continue;

    const sc = 2.8 + random() * 4.2;
    scale.set(sc * (0.40 + random() * 0.12), sc * (1.5 + random() * 0.35), sc * (0.40 + random() * 0.12));
    quat.setFromAxisAngle(up, random() * Math.PI * 2);
    pos.set(x, heightAt(x, z) - 0.2, z);
    matrix.compose(pos, quat, scale);
    trees.setMatrixAt(k, matrix);

    color.set('#365f40').offsetHSL((random() - 0.5) * 0.035, 0, (random() - 0.5) * 0.09);
    trees.setColorAt(k, color);
    k++;
  }

  trees.count = k;
  trees.castShadow = false;
  trees.receiveShadow = false;
  trees.frustumCulled = false;
  trees.instanceMatrix.needsUpdate = true;
  if (trees.instanceColor) trees.instanceColor.needsUpdate = true;

  group.add(trees);
  scene.add(group);

  return { group, ridgeMat: ridgeMaterial };
}

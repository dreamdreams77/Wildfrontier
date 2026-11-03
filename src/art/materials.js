import * as THREE from 'three';
import {
  canPaint,
  bodyTexture,
  furTexture,
  barkTexture,
  leafTexture,
  groundTexture,
  rockTexture,
  plankTexture,
  thatchTexture,
  shingleTexture,
  plasterTexture,
  clothTexture
} from './paint.js';
import { CLAY } from './style.js';

const cache = new Map();
const memo = (key, factory) => {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
};

let physical = false;
export const setPhysical = value => { physical = !!value; };

const unsupported = new Set([
  'sheen', 'sheenRoughness', 'sheenColor',
  'clearcoat', 'clearcoatRoughness', 'ior'
]);

function materialOptions(options) {
  if (physical) return options;
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => !unsupported.has(key))
  );
}

// Clay look: matte, soft thumbprint dents instead of fur or leaf grain, and a warm rim light on the edges.
let clayPrintTex = null;
function clayPrint() {
  if (clayPrintTex || !canPaint) return clayPrintTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 8 + rnd() * 18, light = rnd() > 0.5;
    for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
      const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      q.addColorStop(0, light ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.22)');
      q.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = q;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  clayPrintTex = new THREE.CanvasTexture(c);
  clayPrintTex.wrapS = clayPrintTex.wrapT = THREE.RepeatWrapping;
  clayPrintTex.repeat.set(3, 3);
  return clayPrintTex;
}

function clayify(material) {
  if (!CLAY) return material;
  material.roughness = Math.max(0.82, material.roughness ?? 0.82);
  material.metalness = 0;
  if (material.bumpMap && clayPrint()) {
    material.bumpMap = clayPrint();
    material.bumpScale = 0.55;
  }
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (previous) previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
{
  float wfRim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
  gl_FragColor.rgb += wfRim * vec3(0.16, 0.12, 0.07) * 0.8;
}`
    );
  };
  material.customProgramCacheKey = () => 'wildfrontier-clay';
  return material;
}

function surfaceMaterial(options) {
  return clayify(physical
    ? new THREE.MeshPhysicalMaterial(options)
    : new THREE.MeshStandardMaterial(materialOptions(options)));
}

function setupTexture(texture, repeat = null) {
  if (!texture) return null;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (repeat) texture.repeat.set(repeat, repeat);
  texture.anisotropy = Math.max(texture.anisotropy || 1, 4);
  return texture;
}

export const bodyMaterial = coat => memo(
  `body:${JSON.stringify(coat)}:${physical}`,
  () => {
    const map = canPaint ? setupTexture(bodyTexture(coat)) : null;
    const fur = canPaint ? setupTexture(furTexture()) : null;
    return surfaceMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0,
      map,
      bumpMap: fur,
      bumpScale: fur ? 0.32 : 0,
      sheen: 0.42,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color('#d8c8ae'),
      envMapIntensity: 0.62
    });
  }
);

export const limbMaterial = () => memo(
  `limb:${physical}`,
  () => {
    const fur = canPaint ? setupTexture(furTexture()) : null;
    return surfaceMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      bumpMap: fur,
      bumpScale: fur ? 0.26 : 0,
      sheen: 0.3,
      sheenRoughness: 0.88,
      sheenColor: new THREE.Color('#d6c7ae'),
      envMapIntensity: 0.5
    });
  }
);

export const hardMaterial = () => memo(
  'hard',
  () => new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.56,
    metalness: 0,
    envMapIntensity: 0.8
  })
);

export const eyeMaterial = () => memo(
  `eye:${physical}`,
  () => surfaceMaterial({
    vertexColors: true,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ior: 1.42,
    envMapIntensity: 1.45
  })
);

export const wind = {
  uTime: { value: 0 },
  uStrength: { value: 0.7 }
};

export function addWind(
  material,
  { amp = 0.05, freq = 1.4, heightRef = 1 } = {}
) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    if (previous) previous(shader);
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uStrength = wind.uStrength;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;uniform float uStrength;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  float ph = wp.x * 0.35 + wp.z * 0.27;
  float h = clamp(transformed.y / ${heightRef.toFixed(2)}, 0.0, 1.0);
  float gust = sin(uTime * 0.19 + wp.x * 0.025 + wp.z * 0.018) * 0.5 + 0.5;
  float wave = sin(uTime * ${freq.toFixed(2)} + ph)
    + 0.42 * sin(uTime * ${(freq * 2.17).toFixed(2)} + ph * 1.61);
  float w = wave * (0.72 + gust * 0.28) * uStrength * ${amp.toFixed(3)} * h * h;
  transformed.x += w;
  transformed.z += w * 0.58;
}`
      );
  };
  material.customProgramCacheKey = () => `wind:${amp}:${freq}:${heightRef}`;
  return material;
}

export const std = (color, options = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });

export const painted = (key, textureFactory, options = {}) => memo(
  `painted:${key}:${physical}`,
  () => {
    const { bump, repeat, ...rest } = options;
    const map = canPaint && textureFactory
      ? setupTexture(textureFactory(), repeat || null)
      : null;
    const material = surfaceMaterial({
      roughness: 0.92,
      metalness: 0,
      vertexColors: rest.vertexColors ?? false,
      color: rest.color ?? '#ffffff',
      map,
      ...rest
    });
    if (bump && map) {
      material.bumpMap = map;
      material.bumpScale = bump;
    }
    return material;
  }
);

export const mats = {
  bark: () => painted('bark', barkTexture, {
    vertexColors: true,
    bump: 0.72,
    roughness: 0.98,
    repeat: 2
  }),

  leaf: () => memo('leaf:green', () => {
    const material = surfaceMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0,
      map: canPaint ? setupTexture(leafTexture()) : null,
      side: THREE.DoubleSide,
      sheen: 0.12,
      sheenRoughness: 0.9,
      sheenColor: new THREE.Color('#bcd6a2'),
      envMapIntensity: 0.45
    });
    return addWind(material, { amp: 0.075, freq: 1.45, heightRef: 5 });
  }),

  leafDry: () => memo('leaf:dry', () => {
    const material = surfaceMaterial({
      vertexColors: true,
      roughness: 0.91,
      metalness: 0,
      map: canPaint ? setupTexture(leafTexture('#8a9a4a')) : null,
      side: THREE.DoubleSide,
      envMapIntensity: 0.32
    });
    return addWind(material, { amp: 0.055, freq: 1.15, heightRef: 5 });
  }),

  rock: () => painted('rock', rockTexture, {
    vertexColors: true,
    bump: 0.88,
    roughness: 0.97,
    repeat: 2,
    envMapIntensity: 0.35
  }),

  plank: (tint = '#8a6a45') => painted(
    `plank:${tint}`,
    () => plankTexture(tint),
    { vertexColors: true, bump: 0.6, roughness: 0.9, repeat: 2 }
  ),

  thatch: () => painted('thatch', thatchTexture, {
    vertexColors: true,
    bump: 0.82,
    roughness: 1,
    repeat: 2
  }),

  shingle: (tint = '#6c5a45') => painted(
    `shingle:${tint}`,
    () => shingleTexture(tint),
    { vertexColors: true, bump: 0.55, roughness: 0.92, repeat: 2 }
  ),

  plaster: (tint = '#d8c9a4') => painted(
    `plaster:${tint}`,
    () => plasterTexture(tint),
    { vertexColors: true, bump: 0.22, roughness: 0.96 }
  ),

  cloth: () => painted('cloth', clothTexture, {
    vertexColors: true,
    roughness: 0.98,
    sheen: 0.18,
    sheenRoughness: 0.95
  }),

  plain: () => memo('plain:vc', () => new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.84,
    metalness: 0
  })),

  metal: () => memo('metal', () => new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.34,
    metalness: 0.7,
    envMapIntensity: 1.1
  })),

  glass: () => memo(`glass:${physical}`, () => surfaceMaterial({
    color: '#9fc6cf',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.35,
    depthWrite: false
  })),

  ground: (kind = 'woodland') => memo(`ground:${kind}`, () => {
    const map = canPaint ? setupTexture(groundTexture(kind), 26) : null;
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      map
    });
  })
};

export const clearMaterialCache = () => {
  for (const material of cache.values()) {
    if (material && material.dispose) material.dispose();
  }
  cache.clear();
};

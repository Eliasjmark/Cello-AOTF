// Vatten (0.15): en yta som rör sig i vågor, glittrar i solen och syns underifrån, plus ljusnät (kaustik)
// som dansar på botten. Används av havet (The Shattered Sea) och The Drowned Temple.
//
//   waterMaterial({ color, deep, opacity })  – ett material som delar samma tid (WATER.time)
//   waterSurface(w, d, o)                     – ett rektangulärt plan (lokalt i XZ), med vågor
//   waterDisc(r, o)                           – en rund yta (havet)
//   caustics(w, d, o)                         – ett ljusnät att lägga strax ovanför botten
import * as THREE from 'three';

export const WATER = { time: { value: 0 } };

// En tileable normalkarta: summan av några sinusvågor i olika riktningar (heltal varv per ruta)
function normalTex() {
  const N = 128;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const waves = [[1, 2, 0.6], [3, -1, 0.35], [-2, 3, 0.3], [5, 4, 0.12], [-6, 1, 0.1], [2, -7, 0.08]];
  const h = (x, y) => waves.reduce((s, [a, b, amp], i) => s + Math.sin(((a * x + b * y) / N) * Math.PI * 2 + i * 1.7) * amp, 0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
      const nx = -dx * 2.2, ny = -dy * 2.2, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Färgen: mjuka ljusa fläckar på blågrönt, som ljus genom vatten
function colorTex() {
  const N = 128;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N, N);
  for (let k = 0; k < 40; k++) {
    const x = Math.random() * N, y = Math.random() * N, r = 6 + Math.random() * 18;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      grd.addColorStop(0, `rgba(170,200,205,${0.18 + Math.random() * 0.12})`);
      grd.addColorStop(1, 'rgba(170,200,205,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, N, N);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ljusnätet på botten: ljusa trådar mellan celler (tileable Voronoi)
function causticTex() {
  const N = 128;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const pts = [];
  for (let i = 0; i < 14; i++) pts.push([Math.random() * N, Math.random() * N]);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const [px, py] of pts) {
        for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
          const d = Math.hypot(x - px - ox, y - py - oy);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
      }
      const e = Math.max(0, 1 - (d2 - d1) / 5);
      const v = Math.pow(e, 2.2) * 255;
      const i = (y * N + x) * 4;
      img.data[i] = v * 0.85; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let NT = null, CT = null, KT = null;
const tex = () => { if (!NT) { NT = normalTex(); CT = colorTex(); KT = causticTex(); } return { NT, CT, KT }; };

// Materialet: Phong med två normalkartor som glider åt olika håll, och vågor i hörnen
export function waterMaterial(o = {}) {
  const { NT: nt, CT: ct } = tex();
  const scale = o.scale ?? 0.12; // rutor per meter
  const mat = new THREE.MeshPhongMaterial({
    color: o.color ?? 0x3a8f9a, emissive: o.emissive ?? 0x062a30, specular: o.specular ?? 0xcfeeff, shininess: o.shininess ?? 90,
    transparent: true, opacity: o.opacity ?? 0.8, depthWrite: false, side: THREE.DoubleSide,
    map: ct, normalMap: nt, normalScale: new THREE.Vector2(0.6, 0.6),
  });
  const amp = o.wave ?? 0.08;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WATER.time;
    sh.uniforms.uScale = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uScale;\nvarying vec2 vWUv;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wq = modelMatrix * vec4(transformed, 1.0);
        vWUv = wq.xz * uScale;
        float wv = sin(wq.x * 0.35 + uTime * 1.3) * 0.6 + sin(wq.z * 0.27 - uTime * 1.1) * 0.5 + sin((wq.x + wq.z) * 0.6 + uTime * 2.1) * 0.25;
        transformed.z += wv * ${amp.toFixed(3)};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vWUv;')
      .replace('#include <map_fragment>', `
        vec4 sampledDiffuseColor = texture2D( map, vWUv * 0.6 + vec2(uTime * 0.012, uTime * 0.008) );
        diffuseColor *= sampledDiffuseColor;`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = texture2D( normalMap, vWUv + vec2(uTime * 0.03, uTime * 0.02) ).xyz * 2.0 - 1.0;
        vec3 mapN2 = texture2D( normalMap, vWUv * 0.63 + vec2(-uTime * 0.021, uTime * 0.027) ).xyz * 2.0 - 1.0;
        mapN = normalize(vec3(mapN.xy + mapN2.xy, mapN.z * mapN2.z));
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );`);
  };
  mat.customProgramCacheKey = () => `water-${amp}`;
  return mat;
}

// En rektangulär vattenyta (centrerad, i XZ). o.seg: rutor för vågorna
export function waterSurface(w, d, o = {}) {
  const seg = o.seg ?? Math.max(2, Math.min(48, Math.round(Math.max(w, d) / 3)));
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  geo.computeTangents?.();
  const m = new THREE.Mesh(geo, o.material ?? waterMaterial(o));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 4;
  return m;
}

// En rund vattenyta (havet)
export function waterDisc(r, o = {}) {
  const geo = new THREE.CircleGeometry(r, o.seg ?? 96);
  const m = new THREE.Mesh(geo, o.material ?? waterMaterial({ wave: 0.18, ...o }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 4;
  return m;
}

// Ljusnätet: två lager som glider mot varandra (additivt), läggs strax ovanför botten
export function caustics(w, d, o = {}) {
  const { KT: kt } = tex();
  const g = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const t = kt.clone();
    t.needsUpdate = true;
    t.repeat.set(w / (k ? 7 : 5), d / (k ? 7 : 5));
    const mat = new THREE.MeshBasicMaterial({
      map: t, color: o.color ?? 0x9fd8e0, transparent: true, opacity: o.opacity ?? 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02 + k * 0.01;
    m.renderOrder = 3;
    m.userData.tex = t;
    m.userData.v = k ? [-0.011, 0.017] : [0.014, 0.009];
    g.add(m);
  }
  g.userData.caustics = true;
  return g;
}

// Låter ljusnäten glida (anropas varje bildruta av den som äger dem)
export function animateCaustics(g, dt) {
  for (const m of g.children) {
    const t = m.userData.tex, v = m.userData.v;
    if (!t) continue;
    t.offset.x += v[0] * dt * 6;
    t.offset.y += v[1] * dt * 6;
  }
}

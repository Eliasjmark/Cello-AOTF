// Byggverktyg för alla områden: material, öar och stora landmassor, vägar, broar, träd,
// hus, eldar, dimbankar vid gränserna och små föremål. Allt som byggs hamnar i det område
// som är "öppet" (B.begin(område) ... B.end()).
//
// Statiska föremål läggs i områdets S-grupp och slås ihop per material när området är klart.
// Det som Cello kan stå på eller krocka med läggs även i områdets kollisionsgrupp.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { createTextures, mulberry } from './textures.js';
import { smooth, wrap, hash2, box, cyl, cylUV, breakTop, rockGeo, place, bake } from './geom.js';

export const DECK = 0.1;

// Flytande stenar som reser sig ur stormen och bildar en väg
export class StonePath {
  constructor(parent, stones, M, y = 0) {
    this.y = y;
    this.stones = stones.map((s, i) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(box(2.8, 0.9, 2.6, 1.6), M.rock);
      top.position.y = -0.35;
      const under = new THREE.Mesh(rockGeo(1.25, 500 + i, 1.4), M.rock);
      under.position.y = -1.3;
      under.scale.set(1, 1.3, 0.95);
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.12), M.runeGlow);
      rune.position.set(0, 0.11, 0);
      rune.rotation.y = (i % 2) * 1.2;
      g.add(top, under, rune);
      g.position.set(s.x, y - 30, s.z);
      g.visible = false;
      parent.add(g);
      return { ...s, g, box: null, t: -1, delay: i * 0.22 };
    });
    this.raised = false;
    this.anim = false;
    this.onStone = null;
  }

  connect(collider) {
    const y = this.y;
    for (const s of this.stones) {
      s.box = collider.addBox(s.x - 1.4, y - 1.0, s.z - 1.3, s.x + 1.4, y + 0.1, s.z + 1.3, 'stone');
      s.box.enabled = false;
    }
  }

  raise(instant = false) {
    this.raised = true;
    for (const s of this.stones) {
      s.g.visible = true;
      if (instant) {
        s.g.position.y = this.y;
        s.box.enabled = true;
        s.t = 99;
      } else s.t = -s.delay;
    }
    this.anim = !instant;
  }

  lower() {
    this.raised = false;
    this.anim = false;
    for (const s of this.stones) {
      s.g.visible = false;
      s.g.position.y = this.y - 30;
      if (s.box) s.box.enabled = false;
      s.t = -1;
    }
  }

  update(dt) {
    if (!this.anim) return;
    let done = true;
    for (const s of this.stones) {
      if (s.t >= 1) continue;
      done = false;
      const before = s.t;
      s.t += dt / 0.9;
      if (before < 0 && s.t >= 0) this.onStone?.(s);
      const k = Math.max(0, Math.min(1, s.t));
      const e = 1 - Math.pow(1 - k, 3);
      s.g.position.y = this.y - 30 * (1 - e) + Math.sin(k * Math.PI) * 0.4;
      s.g.rotation.y = (1 - e) * 1.4;
      if (s.t >= 1) {
        s.g.position.y = this.y;
        s.g.rotation.y = 0;
        s.box.enabled = true;
      }
    }
    if (done) this.anim = false;
  }
}

// Avstånd från punkten (px, pz) till sträckan a–b, och var på sträckan (0..1) närmast ligger
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return [Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t];
}

// 0.13: gräset vajar i vinden. Toppen av varje tuva svajar (uv.y = höjden i tuvan), olika takt på olika ställen.
export const WIND = { time: { value: 0 }, strength: { value: 1 } };
function windy(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWindT = WIND.time;
    sh.uniforms.uWindS = WIND.strength;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindT;\nuniform float uWindS;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float k = uv.y * uv.y;
          float ph = uWindT * 1.7 + wp.x * 0.35 + wp.z * 0.27;
          float gust = 0.6 + 0.4 * sin(uWindT * 0.45 + wp.x * 0.05);
          transformed.x += (sin(ph) * 0.13 + sin(ph * 2.3) * 0.04) * k * uWindS * gust;
          transformed.z += cos(ph * 0.8) * 0.09 * k * uWindS * gust;
        }`);
  };
  mat.customProgramCacheKey = () => 'windy-tuft';
  return mat;
}

export function createBuilder(scene, lights) {
  const noise = new ImprovedNoise();
  const tex = createTextures();
  const rand = mulberry(7);
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  const M = {
    grass: lam({ map: tex.grass, vertexColors: true }),
    cliff: lam({ map: tex.cliff, flatShading: true, vertexColors: true }),
    rockTop: lam({ map: tex.rock, vertexColors: true }),
    rock: lam({ map: tex.rock, flatShading: true }),
    marble: lam({ map: tex.marble }),
    brick: lam({ map: tex.brick }),
    wood: lam({ map: tex.wood }),
    woodDark: lam({ map: tex.wood, color: 0x6a5a4a }),
    rope: lam({ color: 0x5e4f3a }),
    iron: lam({ color: 0x45434a, flatShading: true }),
    obsidian: lam({ color: 0x1c1b23, flatShading: true }),
    tuft: windy(lam({ map: tex.tuft, alphaTest: 0.5 })),
    mosaic: lam({ map: tex.mosaic }),
    runes: lam({ map: tex.runes }),
    char: lam({ map: tex.charred, flatShading: true }),
    clothOchre: lam({ color: 0x8a6a3a, side: THREE.DoubleSide, flatShading: true }),
    clothRed: lam({ color: 0x7a3b30, side: THREE.DoubleSide, flatShading: true }),
    clothBlue: lam({ color: 0x4d5866, side: THREE.DoubleSide, flatShading: true }),
    clothPurple: lam({ color: 0x5a3a66, side: THREE.DoubleSide, flatShading: true }),
    clothGreen: lam({ color: 0x4a6040, side: THREE.DoubleSide, flatShading: true }),
    linen: lam({ color: 0xb8ad96, flatShading: true }),
    thatch: lam({ color: 0x4a3c26, flatShading: true }),
    pine: lam({ color: 0x2f4630, flatShading: true }),
    pineDark: lam({ color: 0x24382a, flatShading: true }),
    sack: lam({ color: 0x8e7d5a, flatShading: true }),
    gold: lam({ color: 0xb08a3c, emissive: 0x2a1c06, flatShading: true }),
    ironWall: lam({ map: tex.iron }),
    ironFloor: lam({ map: tex.ironFloor }),
    cracked: lam({ map: tex.cracked }),
    copper: lam({ color: 0x8a5634, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff8a33 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffd28a }),
    window: new THREE.MeshBasicMaterial({ color: 0xd8a050 }),
    runeGlow: new THREE.MeshBasicMaterial({ color: 0x3a5a70 }),
    // 0.6: hela hus, vägar, träd och fält
    dirt: lam({ map: tex.dirt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    plaster: lam({ map: tex.plaster }),
    roofRed: lam({ map: tex.shingle, color: 0x9a4436 }),
    roofBlue: lam({ map: tex.shingle, color: 0x4a5a74 }),
    roofBrown: lam({ map: tex.shingle, color: 0x6a4a34 }),
    roofGreen: lam({ map: tex.shingle, color: 0x4a6048 }),
    barn: lam({ map: tex.wood, color: 0xb05040 }),
    cobble: lam({ map: tex.cobble }),
    hay: lam({ map: tex.hay }),
    leaf: lam({ map: tex.leaf, color: 0x4a6a3a, flatShading: true }),
    leafLight: lam({ map: tex.leaf, color: 0x6a8a46, flatShading: true }),
    leafDark: lam({ map: tex.leaf, color: 0x34502e, flatShading: true }),
    willow: lam({ map: tex.leaf, color: 0x7a9a58, flatShading: true, side: THREE.DoubleSide }),
    bark: lam({ map: tex.bark }),
    floor: lam({ map: tex.floor }),
    pumpkin: lam({ color: 0xc0702a, flatShading: true }),
    cabbage: lam({ color: 0x6a8a4a, flatShading: true }),
    crop: lam({ color: 0x8a9a4a, flatShading: true }),
    flowerY: lam({ color: 0xd8b84a, flatShading: true }),
    flowerP: lam({ color: 0x9a6ab0, flatShading: true }),
    flowerW: lam({ color: 0xd8d4c8, flatShading: true }),
    white: lam({ color: 0xd8d2c4, flatShading: true }),
    fur: lam({ color: 0xd8d0c0, flatShading: true }),
    furBrown: lam({ color: 0x6a4a34, flatShading: true }),
    furDark: lam({ color: 0x2a2624, flatShading: true }),
    horn: lam({ color: 0x8a8070, flatShading: true }),
    water: new THREE.MeshLambertMaterial({ map: tex.water, transparent: true, opacity: 0.82, depthWrite: false }),
    // 0.7: öknen och pyramiden
    sand: lam({ map: tex.sand, vertexColors: true }),
    // 0.16: norr
    snow: lam({ map: tex.snow, vertexColors: true }),
    snowFlat: lam({ map: tex.snow }),
    ice: new THREE.MeshPhongMaterial({ map: tex.ice, color: 0xcfeaf8, specular: 0xffffff, shininess: 90, emissive: 0x0a1a24 }),
    iceClear: new THREE.MeshPhongMaterial({ map: tex.ice, color: 0xa8d8f0, specular: 0xffffff, shininess: 110, transparent: true, opacity: 0.72, emissive: 0x0a2030 }),
    sandRock: lam({ map: tex.sand, color: 0xa8865a, flatShading: true }),
    sandstone: lam({ map: tex.sandstone }),
    roadStone: lam({ map: tex.sandstone, color: 0xc0a078, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    sandstoneDark: lam({ map: tex.sandstone, color: 0x8a7458 }),
    hiero: lam({ map: tex.hiero }),
    goldPlate: lam({ map: tex.sandstone, color: 0xe0b450, emissive: 0x3a2808 }),
    palm: lam({ color: 0x5a7a3a, flatShading: true, side: THREE.DoubleSide }),
    palmTrunk: lam({ map: tex.bark, color: 0xb09070 }),
    lapis: lam({ color: 0x2a4a8a, flatShading: true }),
    clothWhite: lam({ color: 0xd8ccb0, side: THREE.DoubleSide, flatShading: true }),
    clothTeal: lam({ color: 0x3a7a78, side: THREE.DoubleSide, flatShading: true }),
  };
  tex.water.wrapS = tex.water.wrapT = THREE.RepeatWrapping;

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a33, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flameMat2 = flameMat.clone();
  flameMat2.color.set(0xffd27a);
  const softTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(16, 16, 2, 16, 16, 15);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  let A = null; // området som byggs just nu
  const fires = [];
  const B = {
    M, tex, rand, noise, flameMat, flameMat2, smokeTex: softTex, fires, lights,
    potSpots: [], enemySpots: [], chests: [], signs: [], torches: [],
    get area() { return A; },
  };

  B.begin = (area) => {
    A = area;
    lights.building = area.id;
    area.updaters.push((t, dt) => updateFires(area.fires, t, dt));
    return area;
  };

  B.end = () => {
    finishPlanks(A);
    finishTufts(A);
    A.baked = bake(A.S);
    lights.building = null;
    A = null;
  };

  // ---------- grundläggande ----------
  // Ett synligt föremål plus en kollisionskopia
  function solid(mesh, parent = A.S) {
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const c = new THREE.Mesh(mesh.geometry);
    c.matrixAutoUpdate = false;
    c.matrix.copy(mesh.matrixWorld);
    A.collision.add(c);
    return mesh;
  }
  // Osynlig kollision
  function hidden(geometry, x, y, z, rx = 0, ry = 0, rz = 0) {
    const c = new THREE.Mesh(geometry);
    c.position.set(x, y, z);
    c.rotation.set(rx, ry, rz);
    A.collision.add(c);
    return c;
  }
  const deco = (mesh, x, y, z) => { A.S.add(place(mesh, x, y, z)); return mesh; };
  const add = (obj) => { A.root.add(obj); return obj; };
  Object.assign(B, { solid, hidden, deco, add });

  // En grupp på marken (x, y, z) vriden ry. Delarna i den slås ihop med resten.
  function groupAt(x, y, z, ry = 0, parent = A.S) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    g.updateWorldMatrix(true, false);
    return g;
  }
  const local = (g, lx, ly, lz) => g.localToWorld(new THREE.Vector3(lx, ly, lz));
  B.groupAt = groupAt;
  B.local = local;
  // Lägg en mesh i en grupp, med eller utan kollision
  const put = (g, mesh, x, y, z, collide = false) => {
    place(mesh, x, y, z);
    if (collide) solid(mesh, g); else g.add(mesh);
    return mesh;
  };
  B.put = put;

  // ---------- öar ----------
  // Ön byggs som en skiva i ringar: ovansidan med gräs och en ojämn klippkon under.
  // Höjden: små ojämnheter (amp), stora kullar (hills), platta ytor (pads), vägar (roads) och sänkor (dips).
  function island(o) {
    const {
      cx, cz, baseR, rNoise = 3, seed = 0, amp = 0.6, pads = [], keepAngles = [], roads = [], dips = [],
      depth = 18, rings = 36, segs = 96, collide = true, grass = 0, avoid = () => false, baseY = 0,
      topMat = M.grass, hills = 0, hillFreq = 0.012, rim = 0.6, map = true, label = '', tint = null,
    } = o;

    const Rof = (a) => {
      const n = noise.noise(Math.cos(a) * 1.6 + seed * 3.1, Math.sin(a) * 1.6 + seed * 1.7, seed * 0.37)
        + 0.5 * noise.noise(Math.cos(a) * 3.4 + seed, Math.sin(a) * 3.4 - seed, seed * 0.11 + 4);
      let m = 1;
      for (const k of keepAngles) m = Math.min(m, smooth(0.15, 0.55, Math.abs(wrap(a - k))));
      return baseR + n * rNoise * m;
    };
    const roadW = (x, z) => {
      let w = 0;
      for (const r of roads) {
        const P = r.pts, rw = r.w ?? 3;
        for (let i = 0; i < P.length - 1; i++) {
          const [d] = segDist(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
          w = Math.max(w, 1 - smooth(rw * 0.5, rw * 1.6, d));
        }
      }
      return w;
    };
    const big = (x, z) => (hills ? noise.noise(x * hillFreq, z * hillFreq, seed + 50.5) * hills
      + noise.noise(x * hillFreq * 2.3, z * hillFreq * 2.3, seed + 61.1) * hills * 0.35 : 0);
    const H = (x, z) => {
      const lx = x - cx, lz = z - cz;
      const t = Math.hypot(lx, lz) / Rof(Math.atan2(lz, lx));
      let small = noise.noise(x * 0.07, z * 0.07, seed + 10.5) * amp + noise.noise(x * 0.23, z * 0.23, seed + 3.3) * amp * 0.3;
      if (roads.length) small *= 1 - roadW(x, z);
      let h = big(x, z) + small;
      for (const d of dips) h -= (1 - smooth(d.r * 0.4, d.r, Math.hypot(x - d.x, z - d.z))) * d.depth;
      h -= smooth(0.82, 1.0, t) * rim;
      for (const p of pads) {
        const w = 1 - smooth(p.r * 0.55, p.r, Math.hypot(x - p.x, z - p.z));
        h += (p.h - h) * w;
      }
      return h + baseY;
    };

    // Ovansidan
    const pos = [], uvs = [], cols = [], idx = [];
    const ringR = [];
    for (let j = 0; j < segs; j++) ringR.push(Rof((j / segs) * Math.PI * 2));
    const pushV = (x, z, i) => {
      const y = H(x, z);
      pos.push(x, y, z);
      uvs.push(x / 4, z / 4);
      let shade = 1 - smooth(0.72, 1.0, i / rings) * 0.35 + noise.noise(x * 0.15, z * 0.15, seed + 20) * 0.14;
      if (tint) shade *= tint(x, z);
      cols.push(shade, shade, shade);
    };
    pushV(cx, cz, 0);
    for (let i = 1; i <= rings; i++) {
      // Tätare ringar ute vid kanten, glesare i mitten (där marken är plattare)
      const f = i / rings;
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2, r = ringR[j] * f;
        pushV(cx + Math.cos(a) * r, cz + Math.sin(a) * r, i);
      }
    }
    const base = (i) => 1 + (i - 1) * segs;
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let i = 1; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = base(i) + j, b = base(i) + ((j + 1) % segs);
        const c = base(i + 1) + j, d = base(i + 1) + ((j + 1) % segs);
        idx.push(a, b, c, b, d, c);
      }
    }
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    topGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    topGeo.setIndex(idx);
    topGeo.computeVertexNormals();
    const top = new THREE.Mesh(topGeo, topMat);
    if (collide) solid(top, A.root); else A.root.add(top);

    // Undersidan
    const layers = [[1.02, -0.45], [0.96, -1.7], [0.85, -3.7], [0.7, -6.6], [0.52, -10], [0.33, -13.6], [0.15, -16.6]];
    const upos = [], uuv = [], ucol = [], uidx = [];
    const rimStart = base(rings);
    const cols1 = segs + 1;
    const perim = 2 * Math.PI * baseR;
    for (let j = 0; j <= segs; j++) {
      const k = (rimStart + (j % segs)) * 3;
      upos.push(pos[k], pos[k + 1], pos[k + 2]);
      uuv.push((j / segs) * perim / 4, pos[k + 1] / 4);
      ucol.push(0.8, 0.8, 0.82);
    }
    const scaleY = depth / 18;
    layers.forEach(([f, dy], li) => {
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const jit = noise.noise(Math.cos(a) * 2.5 + li * 1.7, Math.sin(a) * 2.5, seed + li) * 0.12;
        const r = ringR[j % segs] * (f + jit);
        const y = baseY - 0.5 + dy * scaleY + noise.noise(Math.cos(a) * 4, Math.sin(a) * 4, seed + li * 3) * 0.7 * Math.max(1, scaleY * 0.5);
        upos.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
        uuv.push((j / segs) * perim / 4, y / 4);
        const s = 0.85 - li * 0.08;
        ucol.push(s, s, s * 1.04);
      }
    });
    const tipIndex = upos.length / 3;
    upos.push(cx, baseY - depth, cz);
    uuv.push(0, (baseY - depth) / 4);
    ucol.push(0.3, 0.3, 0.32);
    const ringCount = layers.length + 1;
    for (let k = 0; k < ringCount - 1; k++) {
      for (let j = 0; j < segs; j++) {
        const Aa = k * cols1 + j, Bb = Aa + 1, C = (k + 1) * cols1 + j, D = C + 1;
        uidx.push(Aa, Bb, C, Bb, D, C);
      }
    }
    const lastRing = (ringCount - 1) * cols1;
    for (let j = 0; j < segs; j++) uidx.push(lastRing + j, lastRing + j + 1, tipIndex);
    const underGeo = new THREE.BufferGeometry();
    underGeo.setAttribute('position', new THREE.Float32BufferAttribute(upos, 3));
    underGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uuv, 2));
    underGeo.setAttribute('color', new THREE.Float32BufferAttribute(ucol, 3));
    underGeo.setIndex(uidx);
    underGeo.computeVertexNormals();
    A.root.add(new THREE.Mesh(underGeo, M.cliff));

    // Grästuvor
    let placed = 0, tries = 0;
    while (placed < grass && tries < grass * 20) {
      tries++;
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.9 * Rof(a);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (avoid(x, z) || (roads.length && roadW(x, z) > 0.3)) continue;
      A.tufts.push(x, H(x, z), z, rand() * Math.PI, 0.7 + rand() * 0.7);
      placed++;
      // 0.13: tätare gräs, tuvor i små klungor
      if (rand() < 0.6) {
        const x2 = x + (rand() - 0.5) * 1.6, z2 = z + (rand() - 0.5) * 1.6;
        if (!avoid(x2, z2) && !(roads.length && roadW(x2, z2) > 0.3)) A.tufts.push(x2, H(x2, z2), z2, rand() * Math.PI, 0.6 + rand() * 0.6);
      }
    }
    if (map) {
      const outline = [];
      for (let k = 0; k < 64; k++) {
        const a = (k / 64) * Math.PI * 2, r = Rof(a);
        outline.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
      }
      A.map.islands.push({ outline, label, cx, cz, r: baseR, col: o.mapCol });
    }
    return { H, Rof, cx, cz, baseR };
  }
  B.island = island;

  // En ö långt bort som bara syns (ingen kollision, inget gräs)
  B.backdrop = (cx, cz, r, y = 0, seed = 0, o = {}) => island({
    cx, cz, baseR: r, rNoise: r * 0.15, seed, amp: 0.4, depth: r * 1.3, rings: 6, segs: 28,
    collide: false, map: false, baseY: y, ...o,
  });

  // ---------- vägar ----------
  // Ett band av jord som följer marken längs en linje av punkter
  B.road = (pts, w, H, mat = M.dirt, lift = 0.05) => {
    const P = [], U = [], I = [];
    let dist = 0, n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(len / 1.5));
      for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
        const t = s / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        // Riktningen: medelvärdet av sträckorna runt punkten
        let dx = bx - ax, dz = bz - az;
        if (s === steps && i < pts.length - 2) { dx += pts[i + 2][0] - bx; dz += pts[i + 2][1] - bz; }
        const l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
        if (s > 0 || i > 0) dist += len / steps;
        for (const side of [-1, 1]) {
          const px = x + nx * side * w / 2, pz = z + nz * side * w / 2;
          P.push(px, H(px, pz) + lift, pz);
          U.push((side + 1) / 2 * w / 3, dist / 3);
        }
        if (n > 0) {
          const a = (n - 1) * 2, b = n * 2;
          I.push(a, b, a + 1, a + 1, b, b + 1);
        }
        n++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I);
    g.computeVertexNormals();
    A.S.add(new THREE.Mesh(g, mat));
    A.map.lines.push({ pts, kind: 'road' });
    return g;
  };

  // ---------- broar ----------
  // En bro längs x eller z, från a0 till a1 vid tvärkoordinaten c, däckshöjd y
  B.bridge = (along, a0, a1, c, y = DECK, o = {}) => {
    const len = a1 - a0, mid = (a0 + a1) / 2;
    const P = (a, cc, yy) => (along === 'x' ? [a, yy, cc] : [cc, yy, a]);
    const Bx = (w, h, d) => (along === 'x' ? box(w, h, d, 1) : box(d, h, w, 1));
    const [hx, , hz] = P(mid, c, 0);
    const wide = o.wide ?? 2.2;
    hidden(along === 'x' ? new THREE.BoxGeometry(len, 0.3, wide) : new THREE.BoxGeometry(wide, 0.3, len), hx, y - 0.15, hz);
    for (let a = a0; a < a1 - 0.2; a += 0.46) A.planks.push([along, a + 0.2, c + (rand() - 0.5) * 0.08, rand(), y, wide]);
    [-0.85, 0.85].forEach((off) => deco(new THREE.Mesh(Bx(len, 0.2, 0.2), M.wood), ...P(mid, c + off * wide / 2.2, y - 0.32)));
    const rail = wide / 2 + 0.05;
    for (let a = a0 + 0.3; a <= a1; a += 2.0) {
      [-rail, rail].forEach((off) => deco(new THREE.Mesh(box(0.14, 1.1, 0.14, 1), M.wood), ...P(a, c + off, y + 0.35)));
    }
    [-rail, rail].forEach((off) => deco(new THREE.Mesh(along === 'x' ? new THREE.BoxGeometry(len - 0.3, 0.05, 0.05) : new THREE.BoxGeometry(0.05, 0.05, len - 0.3), M.rope), ...P(mid, c + off, y + 0.75)));
    // Räcken som Cello inte kan ramla över (på långa broar i blåsten)
    if (o.rails) {
      [-rail, rail].forEach((off) => {
        const [rx, , rz] = P(mid, c + off, 0);
        hidden(along === 'x' ? new THREE.BoxGeometry(len, 1.4, 0.2) : new THREE.BoxGeometry(0.2, 1.4, len), rx, y + 0.7, rz);
      });
    }
    const [x0, , z0] = P(a0, c, 0), [x1, , z1] = P(a1, c, 0);
    A.map.lines.push({ pts: [[x0, z0], [x1, z1]], kind: 'bridge' });
  };

  function finishPlanks(area) {
    if (!area.planks.length) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const mesh = new THREE.InstancedMesh(box(0.4, 0.12, 1, 1), M.wood, area.planks.length);
    area.planks.forEach(([along, a, c, r, y, wide], i) => {
      e.set(along === 'x' ? 0 : (r - 0.5) * 0.04, along === 'x' ? (r - 0.5) * 0.06 : Math.PI / 2 + (r - 0.5) * 0.06, along === 'x' ? (r - 0.5) * 0.04 : 0);
      q.setFromEuler(e);
      const p = along === 'x' ? new THREE.Vector3(a, y - 0.06, c) : new THREE.Vector3(c, y - 0.06, a);
      m4.compose(p, q, new THREE.Vector3(1, 1, (wide - 0.1) * (0.95 + r * 0.1)));
      mesh.setMatrixAt(i, m4);
    });
    area.root.add(mesh);
    area.plankMesh = mesh;
  }

  // ---------- grästuvor (en instansierad mesh per område, som går att skära) ----------
  // 0.13: tre korsade plan, högre tuvor (mjukt) som vajar i vinden (se M.tuft)
  const tuftGeo = (() => {
    const w = 0.42, hgt = 0.95;
    const pos = [], uv = [], idx = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI, cx = Math.cos(a) * w, cz = Math.sin(a) * w, b = pos.length / 3;
      pos.push(-cx, 0, -cz, cx, 0, cz, cx, hgt, cz, -cx, hgt, -cz);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3, b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const nrm = new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  })();
  const CELL = 4;
  function finishTufts(area) {
    const data = area.tufts;
    const count = data.length / 5;
    if (!count) return;
    const mesh = new THREE.InstancedMesh(tuftGeo, M.tuft, count);
    const grid = new Map();
    for (let i = 0; i < count; i++) {
      const x = data[i * 5], z = data[i * 5 + 2];
      const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }
    area.root.add(mesh);
    area.grass = { mesh, data, count, grid, cut: new Uint8Array(count) };
    regrow(area);
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function setTuft(gr, i, scale) {
    const d = gr.data;
    _q.setFromAxisAngle(_up, d[i * 5 + 3]);
    _p.set(d[i * 5], d[i * 5 + 1] - 0.05, d[i * 5 + 2]);
    _m4.compose(_p, _q, _s.setScalar(d[i * 5 + 4] * scale));
    gr.mesh.setMatrixAt(i, _m4);
  }
  function regrow(area) {
    const gr = area.grass;
    if (!gr) return;
    for (let i = 0; i < gr.count; i++) setTuft(gr, i, 1);
    gr.cut.fill(0);
    gr.mesh.instanceMatrix.needsUpdate = true;
  }
  B.regrow = regrow;
  // Skär gräset inom svärdets båge. Returnerar platserna där tuvor föll.
  B.cutGrass = (area, feet, facing, reach, arc) => {
    const gr = area?.grass;
    if (!gr) return [];
    const out = [];
    const cx = Math.floor(feet.x / CELL), cz = Math.floor(feet.z / CELL);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const list = gr.grid.get(`${ix},${iz}`);
        if (!list) continue;
        for (const i of list) {
          if (gr.cut[i]) continue;
          const x = gr.data[i * 5], y = gr.data[i * 5 + 1], z = gr.data[i * 5 + 2];
          const dx = x - feet.x, dz = z - feet.z, d = Math.hypot(dx, dz);
          if (d > reach || Math.abs(y - feet.y) > 1.2) continue;
          if (d > 0.5 && Math.abs(wrap(Math.atan2(dx, dz) - facing)) > arc) continue;
          gr.cut[i] = 1;
          setTuft(gr, i, 0.0001);
          out.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    if (out.length) gr.mesh.instanceMatrix.needsUpdate = true;
    return out;
  };

  // ---------- eld och rök ----------
  function makeFire(x, y, z, size = 1, lightPower = 0, smokeCount = 6, smokeHeight = 4.5) {
    const group = new THREE.Group();
    A.root.add(group);
    const f = { pos: new THREE.Vector3(x, y, z), level: 1, flames: [], smoke: [], light: null, size, smokeHeight, group, area: A.id };
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry((0.34 - i * 0.05) * size, (1.0 - i * 0.12) * size, 5), i % 2 ? flameMat2 : flameMat);
      const a = i * 1.9;
      m.position.set(x + Math.cos(a) * 0.25 * size * (i > 0), y + 0.45 * size, z + Math.sin(a) * 0.25 * size * (i > 0));
      group.add(m);
      f.flames.push(m);
    }
    for (let i = 0; i < smokeCount; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0x2a2826, transparent: true, opacity: 0, depthWrite: false }));
      sp.userData.t = i / smokeCount;
      group.add(sp);
      f.smoke.push(sp);
    }
    if (lightPower > 0) f.light = lights.add({ x, y: y + 1.2 * size, z, color: 0xff8a3a, power: lightPower, range: 14 * size });
    fires.push(f);
    A.fires.push(f);
    return f;
  }
  B.makeFire = makeFire;
  function updateFires(list, t, dt) {
    for (const f of list) {
      const lv = f.level;
      if (!f.group.visible) continue;
      f.flames.forEach((m, i) => {
        const s = (1 + Math.sin(t * (9 + i * 3.1) + i + f.pos.x) * 0.18) * Math.max(0.05, lv);
        m.scale.set(1 / Math.sqrt(Math.max(0.2, s)), s, 1 / Math.sqrt(Math.max(0.2, s)));
        m.visible = lv > 0.12 && !f.noFlames;
        m.rotation.y = t * (1 + i * 0.4);
      });
      if (f.light) f.light.level = Math.max(f.minLight ?? 0.12, lv);
      for (const sp of f.smoke) {
        sp.userData.t = (sp.userData.t + dt * (0.22 / (f.smokeHeight / 4.5) ** 0.5)) % 1;
        const k = sp.userData.t;
        sp.position.set(f.pos.x + Math.sin(k * 5 + f.pos.z) * 0.4 * k * f.size, f.pos.y + 0.8 * f.size + k * f.smokeHeight * f.size, f.pos.z + k * 0.9 * f.size);
        sp.scale.setScalar((0.6 + k * 2.4) * f.size * (f.smokeHeight > 6 ? 1.8 : 1));
        sp.material.opacity = Math.sin(k * Math.PI) * 0.5 * Math.min(1, 0.3 + lv) * (f.smokeAlpha ?? 1);
      }
    }
  }

  // Rök ur en skorsten (ingen låga)
  B.chimneySmoke = (x, y, z, n = 4) => {
    const f = makeFire(x, y - 0.6, z, 0.5, 0, n, 5);
    f.noFlames = true;
    f.level = 0.5;
    return f;
  };

  // Lägereld med stenring och vedträn
  B.campfire = (x, y, z, power = 26) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      deco(new THREE.Mesh(rockGeo(0.2, 300 + i, 0.7), M.rock), x + Math.cos(a) * 0.8, y + 0.08, z + Math.sin(a) * 0.8);
    }
    [0.4, -0.5].forEach((ry) => {
      const log = new THREE.Mesh(cyl(0.11, 0.11, 1.2, 6, 1), M.char);
      log.rotation.set(0, ry, Math.PI / 2, 'YXZ');
      deco(log, x, y + 0.13, z);
    });
    hidden(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 10), x, y + 0.3, z);
    return makeFire(x, y + 0.05, z, 0.9, power, 5);
  };

  // ---------- dimbank vid en gräns ----------
  // Stora mjuka moln som driver långsamt. Cello går in i dimman, och skärmen tonar till svart.
  B.mist = (x, y, z, w, d = 6, h = 7, o = {}) => {
    const g = new THREE.Group();
    A.root.add(g);
    const n = o.n ?? Math.max(8, Math.round(w * 1.2));
    const col = o.color ?? 0x9aa2ae;
    const list = [];
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({ map: softTex, color: col, transparent: true, opacity: 0, depthWrite: false, fog: false });
      const sp = new THREE.Sprite(mat);
      const s = 5 + rand() * 6;
      sp.scale.set(s * 1.6, s, 1);
      const item = { sp, ox: (rand() - 0.5) * w, oy: rand() * h, oz: (rand() - 0.5) * d, ph: rand() * 6, sp0: 0.2 + rand() * 0.3, base: 0.32 + rand() * 0.3 };
      g.add(sp);
      list.push(item);
    }
    const axisX = o.axis === 'x';
    A.updaters.push((t) => {
      for (const it of list) {
        const drift = Math.sin(t * it.sp0 + it.ph) * 1.4;
        if (axisX) it.sp.position.set(x + it.oz, y + it.oy + Math.sin(t * 0.3 + it.ph) * 0.4, z + it.ox + drift);
        else it.sp.position.set(x + it.ox + drift, y + it.oy + Math.sin(t * 0.3 + it.ph) * 0.4, z + it.oz);
        // Molnen tunnas ut när kameran är mitt i dem, så att bilden inte blir helt vit
        const near = B.camera ? smooth(2, 9, it.sp.position.distanceTo(B.camera.position)) : 1;
        it.sp.material.opacity = it.base * (0.85 + Math.sin(t * 0.5 + it.ph) * 0.15) * (0.25 + 0.75 * near);
      }
    });
    return g;
  };

  // ---------- vatten ----------
  B.water = (x, y, z, rx, rz = rx, o = {}) => {
    const g = o.rect ? new THREE.PlaneGeometry(rx * 2, rz * 2, 1, 1) : new THREE.CircleGeometry(1, 24).scale(rx, rz, 1);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 3, p.getZ(i) / 3);
    const m = new THREE.Mesh(g, M.water);
    m.position.set(x, y, z);
    m.renderOrder = 1;
    A.root.add(m);
    if (!B.waterAnim) {
      B.waterAnim = true;
      // Texturen delas av allt vatten, så den räcker att flytta en gång per bildruta
      A.updaters.push((t) => { tex.water.offset.set(t * 0.02, t * 0.013); });
    }
    A.map.rects.push({ kind: 'water', x, z, rx, rz });
    return m;
  };

  // ---------- träd och växter ----------
  B.pine = (x, y, z, s = 1, collide = true) => {
    const trunk = new THREE.Mesh(cyl(0.18 * s, 0.26 * s, 1.6 * s, 6, 1), M.bark);
    if (collide) solid(place(trunk, x, y + 0.8 * s, z)); else deco(trunk, x, y + 0.8 * s, z);
    [[1.4, 1.7, 1.7], [1.1, 1.5, 2.7], [0.75, 1.3, 3.6]].forEach(([r, h, yy], i) => {
      deco(new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), i % 2 ? M.pine : M.pineDark), x, y + yy * s, z);
    });
  };
  // Lövträd: stam, två grenar och en rund krona av klumpar
  B.oak = (x, y, z, s = 1, mat = M.leaf, collide = true) => {
    const k = hash2(x, z);
    const trunk = new THREE.Mesh(cyl(0.22 * s, 0.34 * s, 2.4 * s, 7, 1), M.bark);
    if (collide) solid(place(trunk, x, y + 1.2 * s, z)); else deco(trunk, x, y + 1.2 * s, z);
    const blobs = [[0, 3.2, 0, 1.55], [0.9, 2.8, 0.3, 1.1], [-0.8, 2.9, -0.4, 1.15], [0.2, 2.7, -0.9, 1.0], [-0.3, 3.9, 0.3, 1.0]];
    blobs.forEach(([bx, by, bz, r], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), i === 4 ? M.leafLight : mat);
      m.rotation.set(k * 3 + i, k * 5, i);
      deco(m, x + bx * s, y + by * s, z + bz * s);
    });
  };
  // Hängpil: krona som en kupol och långa hängande slingor
  B.willowTree = (x, y, z, s = 1) => {
    solid(place(new THREE.Mesh(cyl(0.3 * s, 0.5 * s, 3.4 * s, 8, 1), M.bark), x, y + 1.7 * s, z));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.8 * s, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.willow);
    dome.scale.y = 0.6;
    deco(dome, x, y + 3.3 * s, z);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + hash2(i, x) * 0.3, r = (2.2 + hash2(i, z) * 0.5) * s;
      const len = (2.2 + hash2(z, i) * 1.2) * s;
      const strand = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, len, 4, 1, true), M.willow);
      strand.rotation.x = Math.PI;
      deco(strand, x + Math.cos(a) * r, y + 3.4 * s - len / 2, z + Math.sin(a) * r);
    }
  };
  B.bush = (x, y, z, s = 1, mat = M.leafDark) => {
    deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * s, 0), mat), x, y + 0.4 * s, z);
    deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 0), M.leaf), x + 0.5 * s, y + 0.35 * s, z + 0.2 * s);
  };
  B.rock = (x, y, z, r, seed = 0, collide = true, mat = M.rock) => {
    const m = new THREE.Mesh(rockGeo(r, seed), mat);
    m.rotation.y = seed * 1.7;
    if (collide) solid(place(m, x, y + r * 0.35, z)); else deco(m, x, y + r * 0.2, z);
    return m;
  };
  B.flowers = (x, y, z, n = 6, spread = 1.2) => {
    const mats = [M.flowerY, M.flowerP, M.flowerW];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = rand() * spread;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      deco(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), M.leaf), px, y + 0.15, pz);
      deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mats[i % 3]), px, y + 0.32, pz);
    }
  };

  // ---------- staket ----------
  // pts: [[x,z],...], H: markhöjd. collide lägger osynliga lådor längs staketet.
  B.fence = (pts, H, o = {}) => {
    const mat = o.mat ?? M.wood, gap = o.gap ?? 1.8, skip = o.skip ?? [];
    let n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.round(len / gap));
      const ry = -Math.atan2(z1 - z0, x1 - x0);
      for (let s = 0; s <= steps; s++) {
        if (s === steps && i < pts.length - 2) continue;
        const x = x0 + ((x1 - x0) * s) / steps, z = z0 + ((z1 - z0) * s) / steps;
        const id = n++;
        if (skip.includes(id)) continue;
        deco(new THREE.Mesh(box(0.14, 1.0, 0.14, 1), mat), x, H(x, z) + 0.45, z);
        if (s < steps && !skip.includes(id + 1)) {
          const xm = x + (x1 - x0) / steps / 2, zm = z + (z1 - z0) / steps / 2, l = len / steps;
          for (const ry0 of [0.38, 0.72]) {
            const rail = new THREE.Mesh(box(l, 0.09, 0.06, 1), mat);
            rail.rotation.y = ry;
            deco(rail, xm, H(xm, zm) + ry0, zm);
          }
          if (o.collide) hidden(new THREE.BoxGeometry(l, 1.2, 0.3), xm, H(xm, zm) + 0.6, zm, 0, ry, 0);
        }
      }
    }
  };

  // ---------- små föremål ----------
  B.barrel = (x, y, z, collide = true) => {
    const m = new THREE.Mesh(cyl(0.36, 0.4, 0.9, 8, 1), M.wood);
    if (collide) solid(place(m, x, y + 0.45, z)); else deco(m, x, y + 0.45, z);
    deco(new THREE.Mesh(cyl(0.41, 0.41, 0.06, 8, 1), M.iron), x, y + 0.25, z);
    deco(new THREE.Mesh(cyl(0.38, 0.38, 0.06, 8, 1), M.iron), x, y + 0.7, z);
  };
  B.crate = (x, y, z, s = 0.8, ry = 0, collide = true) => {
    const m = new THREE.Mesh(box(s, s, s, 1), M.wood);
    m.rotation.y = ry;
    if (collide) solid(place(m, x, y + s / 2, z)); else deco(m, x, y + s / 2, z);
  };
  B.hayBale = (x, y, z, ry = 0, collide = true) => {
    const m = new THREE.Mesh(cyl(0.6, 0.6, 1.1, 10, 1), M.hay);
    m.rotation.set(0, ry, Math.PI / 2, 'YXZ');
    if (collide) solid(place(m, x, y + 0.6, z)); else deco(m, x, y + 0.6, z);
  };
  B.sack = (x, y, z) => deco(new THREE.Mesh(rockGeo(0.3, Math.floor(x * 7 + z), 0.8), M.sack), x, y + 0.2, z);
  B.bench = (x, y, z, ry = 0) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(box(1.8, 0.1, 0.45, 1), M.wood), 0, 0.45, 0, true);
    [-0.7, 0.7].forEach((o) => put(g, new THREE.Mesh(box(0.1, 0.45, 0.4, 1), M.woodDark), o, 0.22, 0));
    return g;
  };
  B.table = (x, y, z, ry = 0) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(box(1.6, 0.1, 0.9, 1), M.wood), 0, 0.8, 0, true);
    for (const [ox, oz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) put(g, new THREE.Mesh(box(0.09, 0.8, 0.09, 1), M.woodDark), ox, 0.4, oz);
    return g;
  };
  // Lyktstolpe med ljus
  B.lampPost = (x, y, z, power = 9) => {
    solid(place(new THREE.Mesh(box(0.14, 2.4, 0.14, 1), M.woodDark), x, y + 1.2, z));
    deco(new THREE.Mesh(box(0.6, 0.08, 0.08, 1), M.woodDark), x + 0.25, y + 2.35, z);
    deco(new THREE.Mesh(box(0.26, 0.3, 0.26, 1), M.lamp), x + 0.48, y + 2.12, z);
    lights.add({ x: x + 0.48, y: y + 2.0, z, color: 0xffc070, power, range: 9, flicker: 0.3 });
  };
  // Skylt på en stolpe; texten läses med E
  B.sign = (x, y, z, ry, lines, o = {}) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(box(0.12, 1.4, 0.12, 1), M.woodDark), 0, 0.7, 0, true);
    put(g, new THREE.Mesh(box(1.1, 0.55, 0.08, 1), M.wood), 0, 1.25, 0.08);
    if (o.arrow) put(g, new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 4), M.wood), 0.68 * o.arrow, 1.25, 0.08).rotation.z = -o.arrow * Math.PI / 2;
    const front = local(g, 0, 0, 1.0);
    B.signs.push({ area: A.id, pos: new THREE.Vector3(front.x, y, front.z), lines, label: o.label ?? 'Read the sign' });
    return g;
  };
  // Vagn med hjul
  B.cart = (x, y, z, ry = 0, o = {}) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(box(2.2, 0.15, 1.3, 1), M.wood), 0, 0.75, 0, true);
    [-0.6, 0.6].forEach((oz) => put(g, new THREE.Mesh(box(2.2, 0.45, 0.08, 1), M.wood), 0, 1.0, oz));
    [-1.08, 1.08].forEach((ox) => put(g, new THREE.Mesh(box(0.08, 0.45, 1.3, 1), M.wood), ox, 1.0, 0));
    [[-0.6, 0.72], [-0.6, -0.72]].forEach(([ox, oz]) => {
      const w = new THREE.Mesh(cyl(0.55, 0.55, 0.1, 10, 1), M.woodDark);
      w.rotation.x = Math.PI / 2;
      put(g, w, ox, 0.55, oz);
    });
    const shaft = new THREE.Mesh(box(1.8, 0.08, 0.08, 1), M.wood);
    shaft.rotation.z = 0.25;
    put(g, shaft, 1.9, 0.5, 0.35);
    put(g, shaft.clone(), 1.9, 0.5, -0.35);
    if (o.load) for (let i = 0; i < 4; i++) put(g, new THREE.Mesh(rockGeo(0.28, 700 + i, 0.6), M.sack), -0.6 + i * 0.4, 1.0, (i % 2) * 0.3 - 0.15);
    if (o.cover) {
      const cov = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.1, 8, 1, true, 0, Math.PI), o.cover);
      cov.rotation.z = Math.PI / 2;
      put(g, cov, 0, 1.05, 0);
    }
    return g;
  };
  // Tält (som i Aetheria)
  B.tent = (x, y, z, ry, mat, w = 2.4, len = 2.8, h = 1.8) => {
    const g = groupAt(x, y, z, ry);
    const slope = Math.hypot(w / 2, h), ang = Math.atan2(h, w / 2);
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(box(slope, 0.05, len, 2), mat);
      p.position.set((s * w) / 4, h / 2, 0);
      p.rotation.z = -s * ang;
      g.add(p);
    });
    const back = new THREE.Shape();
    back.moveTo(-w / 2, 0);
    back.lineTo(w / 2, 0);
    back.lineTo(0, h);
    back.lineTo(-w / 2, 0);
    const bm = new THREE.Mesh(new THREE.ShapeGeometry(back), mat);
    bm.position.z = -len / 2;
    g.add(bm);
    g.add(place(new THREE.Mesh(box(0.08, h + 0.3, 0.08, 1), M.wood), 0, (h + 0.3) / 2, len / 2 + 0.05));
    g.updateWorldMatrix(true, false);
    const c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.8, len));
    c.position.set(0, h * 0.4, 0);
    g.add(c);
    c.visible = false;
    solid(c, g);
    return g;
  };
  // Brunn med tak
  B.well = (x, y, z) => {
    solid(place(new THREE.Mesh(cyl(1.0, 1.05, 0.9, 10, 1.2), M.rock), x, y + 0.45, z));
    deco(new THREE.Mesh(new THREE.CircleGeometry(0.8, 10).rotateX(-Math.PI / 2), M.obsidian), x, y + 0.88, z);
    [-0.9, 0.9].forEach((o) => deco(new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.woodDark), x + o, y + 1.1, z));
    [-1, 1].forEach((s) => {
      const r = new THREE.Mesh(box(2.4, 0.08, 1.0, 1), M.roofBrown);
      r.rotation.x = s * 0.6;
      deco(r, x, y + 2.35, z + s * 0.38);
    });
    deco(new THREE.Mesh(cyl(0.12, 0.12, 1.8, 6, 1), M.wood).rotateZ(Math.PI / 2), x, y + 1.7, z);
  };
  // Krukor och kistor registreras här och byggs i main.js / story.js
  B.pot = (x, y, z, s = 1) => B.potSpots.push({ x, y, z, s, area: A.id });
  B.chest = (id, x, y, z, ry, contents, o = {}) => {
    B.chests.push({ id, area: A.id, x, y, z, ry, contents, big: !!o.big, hidden: !!o.hidden, reveal: o.reveal ?? null });
  };
  B.enemy = (home, path, opts = {}) => B.enemySpots.push({ home, path, ...opts, area: A.id });
  // Fackla eller eldfat som kan tändas med lyktan
  B.torch = (id, x, y, z, o = {}) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    A.root.add(g);
    const h = o.h ?? 1.2;
    const stand = new THREE.Mesh(cyl(0.16, 0.24, h, 6, 1), M.iron);
    stand.position.y = h / 2;
    g.add(stand);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.3, 8), M.iron);
    bowl.position.y = h + 0.12;
    g.add(bowl);
    hidden(new THREE.CylinderGeometry(0.4, 0.4, h + 0.3, 8), x, y + (h + 0.3) / 2, z);
    const fire = makeFire(x, y + h + 0.15, z, 0.7, 0, 3);
    fire.light = lights.add({ x, y: y + h + 1, z, color: 0xff9a4a, power: 24, range: 13 });
    fire.light.on = false;
    fire.level = 0;
    const t = { id, area: A.id, pos: new THREE.Vector3(x, y, z), top: new THREE.Vector3(x, y + h + 0.4, z), fire, lit: false, perm: !!o.perm };
    B.torches.push(t);
    return t;
  };

  // ---------- hus ----------
  // Ett helt hus med puts, korsvirke, sadeltak, fönster med varmt ljus, dörr och skorsten.
  // Framsidan (med dörren) vetter mot lokal +z. Returnerar dörrens plats ute på marken.
  B.house = (x, y, z, ry, o = {}) => {
    const w = o.w ?? 6, d = o.d ?? 5, h = o.h ?? 2.8, pitch = o.pitch ?? 0.62;
    const wall = o.wall ?? M.plaster, roof = o.roof ?? M.roofRed, trim = o.trim ?? M.woodDark;
    const g = groupAt(x, y, z, ry);
    const T = 0.25;
    // Sockel av sten
    put(g, new THREE.Mesh(box(w + 0.3, 0.6, d + 0.3, 1.5), M.rock), 0, -0.1, 0);
    // Väggar: framsidan har en dörröppning
    const dw = 1.2, dh = 2.1, dx = o.doorX ?? 0;
    const fl = (w / 2 + dx - dw / 2), fr = (w / 2 - dx - dw / 2);
    put(g, new THREE.Mesh(box(fl, h, T, 2), wall), -w / 2 + fl / 2, 0.2 + h / 2, d / 2 - T / 2);
    put(g, new THREE.Mesh(box(fr, h, T, 2), wall), w / 2 - fr / 2, 0.2 + h / 2, d / 2 - T / 2);
    put(g, new THREE.Mesh(box(dw, h - dh, T, 2), wall), dx, 0.2 + dh + (h - dh) / 2, d / 2 - T / 2);
    put(g, new THREE.Mesh(box(w, h, T, 2), wall), 0, 0.2 + h / 2, -d / 2 + T / 2);
    [-1, 1].forEach((s) => put(g, new THREE.Mesh(box(T, h, d, 2), wall), s * (w / 2 - T / 2), 0.2 + h / 2, 0));
    // Korsvirke: hörnstolpar och en bjälke runt om
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(box(0.26, h, 0.26, 1), trim), cx * (w / 2 - 0.05), 0.2 + h / 2, cz * (d / 2 - 0.05));
    put(g, new THREE.Mesh(box(w + 0.1, 0.2, 0.1, 1), trim), 0, 0.2 + h - 0.1, d / 2 + 0.02);
    put(g, new THREE.Mesh(box(w + 0.1, 0.2, 0.1, 1), trim), 0, 0.2 + h - 0.1, -d / 2 - 0.02);
    if (o.braces !== false) {
      for (const sx of [-1, 1]) {
        for (const s of [-1, 1]) {
          const br = new THREE.Mesh(box(0.08, Math.hypot(d * 0.35, h * 0.85), 0.14, 1), trim);
          br.rotation.x = s * Math.atan2(d * 0.35, h * 0.85);
          put(g, br, sx * (w / 2 + 0.03), 0.2 + h / 2, s * d * 0.22);
        }
      }
    }
    // Dörr, tröskelsten och lykta
    put(g, new THREE.Mesh(box(dw - 0.1, dh, 0.1, 1), M.wood), dx, 0.2 + dh / 2, d / 2 - 0.08);
    put(g, new THREE.Mesh(box(0.08, 0.08, 0.06, 1), M.iron), dx + 0.35, 0.2 + 1.05, d / 2 + 0.0);
    put(g, new THREE.Mesh(box(dw + 0.5, 0.18, 0.7, 1), M.rock), dx, 0.05, d / 2 + 0.35);
    // Tak
    const rh = (d / 2) * Math.tan(pitch);
    const L = (d / 2 + 0.5) / Math.cos(pitch);
    [-1, 1].forEach((s) => {
      const r = new THREE.Mesh(box(w + 0.8, 0.2, L, 2), roof);
      r.rotation.x = s * pitch;
      put(g, r, 0, 0.2 + h + rh - (L / 2) * Math.sin(pitch) + 0.08, s * (L / 2) * Math.cos(pitch));
    });
    put(g, new THREE.Mesh(box(w + 0.9, 0.18, 0.24, 1), trim), 0, 0.2 + h + rh + 0.12, 0);
    // Gavlar
    const tri = new THREE.Shape();
    tri.moveTo(-d / 2, 0);
    tri.lineTo(d / 2, 0);
    tri.lineTo(0, rh);
    tri.lineTo(-d / 2, 0);
    [-1, 1].forEach((s) => {
      const gm = new THREE.Mesh(new THREE.ShapeGeometry(tri), wall);
      const uv = gm.geometry.attributes.uv, p = gm.geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
      gm.rotation.y = s * Math.PI / 2;
      put(g, gm, s * (w / 2 - 0.02), 0.2 + h, 0);
    });
    // Fönster med varmt sken och fönsterluckor
    const win = (lx, ly, lz, face) => {
      const wg = new THREE.Group();
      wg.position.set(lx, ly, lz);
      wg.rotation.y = face;
      g.add(wg);
      put(wg, new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), o.dark ? M.obsidian : M.window), 0, 0, 0.02);
      put(wg, new THREE.Mesh(box(0.74, 0.08, 0.08, 1), trim), 0, 0.34, 0.04);
      put(wg, new THREE.Mesh(box(0.74, 0.08, 0.12, 1), trim), 0, -0.34, 0.06);
      put(wg, new THREE.Mesh(box(0.06, 0.62, 0.06, 1), trim), 0, 0, 0.04);
      [-1, 1].forEach((s) => {
        const sh = new THREE.Mesh(box(0.32, 0.7, 0.05, 1), o.shutter ?? M.clothBlue);
        sh.rotation.y = s * 0.5;
        put(wg, sh, s * 0.52, 0, 0.12);
      });
    };
    const wy = 0.2 + h * 0.55;
    if (o.windows !== false) {
      if (w > 4) { win(-w / 2 + 1.1 + Math.min(0, dx), wy, d / 2 + 0.01, 0); win(w / 2 - 1.1 + Math.max(0, dx), wy, d / 2 + 0.01, 0); }
      win(w / 2 + 0.01, wy, 0, Math.PI / 2);
      win(-w / 2 - 0.01, wy, 0, -Math.PI / 2);
      if (w > 5) win(0, wy, -d / 2 - 0.01, Math.PI);
    }
    // Skorsten
    if (o.chimney !== false) {
      const cx = (o.chimneyX ?? 0.3) * w, ch = rh + 1.4;
      put(g, new THREE.Mesh(box(0.6, ch, 0.6, 1), M.brick), cx, 0.2 + h + ch / 2 - 0.2, -d * 0.18);
      if (o.smoke !== false) {
        const top = local(g, cx, 0.2 + h + ch, -d * 0.18);
        B.chimneySmoke(top.x, top.y, top.z);
      }
    }
    // Kollision: hela huset som en låda
    hidden(new THREE.BoxGeometry(w + 0.2, h + rh + 0.4, d + 0.2), x, y + (h + rh) / 2, z, 0, ry, 0);
    const door = local(g, dx, 0, d / 2 + 1.3);
    door.y = y;
    // Ljus från fönstren på marken
    if (!o.dark && o.light !== false) {
      const lp = local(g, 0, 1.4, d / 2 + 1.6);
      lights.add({ x: lp.x, y: lp.y, z: lp.z, color: 0xffb060, power: o.lightPower ?? 7, range: 8, flicker: 0.2 });
    }
    A.map.rects.push({ kind: 'house', x, z, w, d, ry, label: o.label });
    return { g, door, facing: ry, w, d, h, rh };
  };

  // Lada med öppen port som Cello kan gå in i (väggarna har riktig kollision)
  B.barn = (x, y, z, ry, o = {}) => {
    const w = o.w ?? 10, d = o.d ?? 8, h = o.h ?? 4.2;
    const g = groupAt(x, y, z, ry);
    const T = 0.3, gw = 3.6, gh = 3.6;
    const W = (bw, bh, bd, lx, ly, lz) => put(g, new THREE.Mesh(box(bw, bh, bd, 2), M.barn), lx, ly, lz, true);
    W(w / 2 - gw / 2, h, T, -w / 2 + (w / 2 - gw / 2) / 2, h / 2, d / 2);
    W(w / 2 - gw / 2, h, T, w / 2 - (w / 2 - gw / 2) / 2, h / 2, d / 2);
    put(g, new THREE.Mesh(box(gw, h - gh, T, 2), M.barn), 0, gh + (h - gh) / 2, d / 2);
    W(w, h, T, 0, h / 2, -d / 2);
    W(T, h, d, -w / 2, h / 2, 0);
    W(T, h, d, w / 2, h / 2, 0);
    // Golv av halm
    put(g, new THREE.Mesh(box(w - 0.4, 0.06, d - 0.4, 2), M.hay), 0, 0.03, 0);
    // Vita kanter och kryss på portarna (öppna, utvikta)
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(box(0.3, h, 0.3, 1), M.white), cx * w / 2, h / 2, cz * d / 2);
    [-1, 1].forEach((s) => {
      const door = new THREE.Group();
      door.position.set(s * gw / 2, 0, d / 2 + 0.1);
      door.rotation.y = s * 1.9;
      g.add(door);
      put(door, new THREE.Mesh(box(gw / 2, gh, 0.12, 2), M.barn), s * gw / 4, gh / 2, 0);
      const x1 = new THREE.Mesh(box(0.12, Math.hypot(gw / 2, gh) - 0.2, 0.06, 1), M.white);
      x1.rotation.z = s * Math.atan2(gw / 2, gh);
      put(door, x1, s * gw / 4, gh / 2, 0.07);
    });
    // Mansardtak: en brant nedre del och en flackare övre del på varje sida
    const r1 = 1.0, r2 = 0.36, l1 = d * 0.22, l2 = d / 2 - l1;
    const y1 = l1 * Math.tan(r1), top = y1 + l2 * Math.tan(r2);
    const roofMat = o.roof ?? M.roofBrown;
    [-1, 1].forEach((s) => {
      const a = new THREE.Mesh(box(w + 0.6, 0.2, l1 / Math.cos(r1) + 0.4, 2), roofMat);
      a.rotation.x = s * r1;
      put(g, a, 0, h + y1 / 2 - 0.05, s * (d / 2 - l1 / 2 + 0.08));
      const b = new THREE.Mesh(box(w + 0.6, 0.2, l2 / Math.cos(r2) + 0.25, 2), roofMat);
      b.rotation.x = s * r2;
      put(g, b, 0, h + y1 + (l2 * Math.tan(r2)) / 2 + 0.06, s * (l2 / 2));
    });
    // Gavlarna ovanför sidoväggarna
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2, 0);
    sh.lineTo(d / 2, 0);
    sh.lineTo(d / 2 - l1, y1);
    sh.lineTo(0, top);
    sh.lineTo(-d / 2 + l1, y1);
    sh.lineTo(-d / 2, 0);
    [-1, 1].forEach((s) => {
      const gm = new THREE.Mesh(new THREE.ShapeGeometry(sh), M.barn);
      const uv = gm.geometry.attributes.uv, p = gm.geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
      gm.rotation.y = s * Math.PI / 2;
      put(g, gm, s * (w / 2 + 0.02), h, 0);
    });
    A.map.rects.push({ kind: 'house', x, z, w, d, ry, label: o.label });
    return { g, door: local(g, 0, 0, d / 2 + 1.5), facing: ry };
  };

  // ---------- öknen (0.7) ----------
  // Palm: en böjd stam av sex delar och en krona av hängande blad
  B.palm = (x, y, z, s = 1, lean = 0.25, dir = 0) => {
    const g = groupAt(x, y, z, dir);
    let px = 0, py = 0, ang = 0;
    for (let i = 0; i < 6; i++) {
      const h = 0.9 * s;
      ang += lean * 0.18;
      const seg = new THREE.Mesh(cyl(0.16 * s * (1 - i * 0.06), 0.2 * s * (1 - i * 0.06), h + 0.06, 6, 1), M.palmTrunk);
      seg.rotation.z = -ang;
      put(g, seg, px + Math.sin(ang) * h / 2, py + Math.cos(ang) * h / 2, 0, i === 0);
      px += Math.sin(ang) * h;
      py += Math.cos(ang) * h;
    }
    // Kollision för stammens nedre del
    hidden(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 2.2 * s, 6), x, y + 1.1 * s, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + hash2(x, i) * 0.3;
      for (let k = 0; k < 2; k++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s * (1 - k * 0.3), 0.03, 1.2 * s), M.palm);
        const r0 = 0.55 * s + k * 1.05 * s;
        frond.position.set(px + Math.cos(a) * r0, py + 0.15 * s - k * 0.45 * s, Math.sin(a) * r0);
        frond.rotation.set(0, -a + Math.PI / 2, 0);
        frond.rotateX(0.25 + k * 0.6);
        g.add(frond);
      }
    }
    for (let i = 0; i < 3; i++) put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 * s, 0), M.woodDark), px + Math.cos(i * 2.1) * 0.2 * s, py - 0.15 * s, Math.sin(i * 2.1) * 0.2 * s);
    return g;
  };
  // Obelisk av sandsten med en gyllene topp
  B.obelisk = (x, y, z, h = 8, ry = 0, broken = false) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(box(1.6, 0.6, 1.6, 1.5), M.sandstoneDark), 0, 0.3, 0, true);
    const shaftH = broken ? h * 0.55 : h;
    const geo = new THREE.CylinderGeometry(0.42, 0.62, shaftH, 4, 1);
    geo.rotateY(Math.PI / 4);
    if (broken) breakTop(geo, shaftH, 0.6);
    put(g, new THREE.Mesh(geo, M.hiero), 0, 0.6 + shaftH / 2, 0, true);
    if (!broken) {
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 4), M.goldPlate);
      top.rotation.y = Math.PI / 4;
      put(g, top, 0, 0.6 + shaftH + 0.35, 0);
    }
    return g;
  };
  // Pelare med lotuskapitäl
  B.lotusColumn = (x, y, z, h = 5, broken = false) => {
    const shaftH = broken ? h * (0.3 + hash2(x, z) * 0.4) : h;
    let geo = cyl(0.5, 0.55, shaftH, 10, 2);
    if (broken) geo = breakTop(geo, shaftH, 0.5);
    solid(place(new THREE.Mesh(geo, M.hiero), x, y + shaftH / 2, z));
    if (!broken) {
      deco(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.8, 10), M.sandstone), x, y + h + 0.4, z);
      deco(new THREE.Mesh(box(1.8, 0.3, 1.8, 1.5), M.sandstoneDark), x, y + h + 0.95, z);
    }
  };
  // Baldakin av tyg på fyra stolpar (ökentält)
  B.canopy = (x, y, z, ry, mat, w = 3.4, d = 2.8, h = 2.3) => {
    const g = groupAt(x, y, z, ry);
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(box(0.1, h, 0.1, 1), M.woodDark), cx * w / 2, h / 2, cz * d / 2, true);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, d + 0.3, 4, 4), mat);
    const p = cloth.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos(p.getX(i) / (w / 2) * Math.PI / 2) * Math.cos(p.getY(i) / (d / 2) * Math.PI / 2) * 0.3);
    cloth.geometry.computeVertexNormals();
    cloth.rotation.x = Math.PI / 2;
    put(g, cloth, 0, h, 0);
    return g;
  };

  // Väderkvarn med vingar som snurrar
  B.windmill = (x, y, z, ry = 0, s = 1) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(cyl(2.0 * s, 2.8 * s, 7 * s, 8, 2), M.plaster), 0, 3.5 * s, 0, true);
    put(g, new THREE.Mesh(cyl(2.9 * s, 2.9 * s, 0.4, 8, 2), M.rock), 0, 0.1, 0);
    put(g, new THREE.Mesh(new THREE.ConeGeometry(2.5 * s, 2.6 * s, 8), M.roofBrown), 0, 8.3 * s, 0);
    put(g, new THREE.Mesh(box(1.0, 1.8, 0.2, 1), M.wood), 0, 0.9, 2.55 * s);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), M.window), 0, 4.5 * s, 2.32 * s);
    const hub = new THREE.Group();
    const hp = local(g, 0, 7.0 * s, 2.6 * s);
    hub.position.copy(hp);
    hub.rotation.y = ry;
    A.root.add(hub);
    const sails = new THREE.Group();
    hub.add(sails);
    sails.add(new THREE.Mesh(cyl(0.3, 0.3, 0.6, 8, 1).rotateX(Math.PI / 2), M.woodDark));
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      sails.add(arm);
      const spar = new THREE.Mesh(box(0.16, 5.4 * s, 0.12, 1), M.woodDark);
      spar.position.y = 2.7 * s;
      arm.add(spar);
      const cloth = new THREE.Mesh(box(1.0 * s, 3.8 * s, 0.04, 1), M.linen);
      cloth.position.set(0.6 * s, 3.4 * s, 0.05);
      arm.add(cloth);
    }
    A.updaters.push((t, dt) => { sails.rotation.z -= dt * 0.6; });
    A.map.pois.push({ x, z, label: 'Windmill', icon: 'mill' });
    return g;
  };

  // Vakttorn av trä på fyra ben
  B.watchtower = (x, y, z, ry = 0, h = 6) => {
    const g = groupAt(x, y, z, ry);
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(box(0.3, h, 0.3, 1), M.woodDark), cx * 1.4, h / 2, cz * 1.4, true);
    put(g, new THREE.Mesh(box(3.6, 0.25, 3.6, 1), M.wood), 0, h, 0);
    [-1, 1].forEach((s) => {
      put(g, new THREE.Mesh(box(3.6, 0.9, 0.12, 1), M.wood), 0, h + 0.55, s * 1.75);
      put(g, new THREE.Mesh(box(0.12, 0.9, 3.6, 1), M.wood), s * 1.75, h + 0.55, 0);
    });
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(box(0.16, 2.2, 0.16, 1), M.woodDark), cx * 1.7, h + 1.1, cz * 1.7);
    put(g, new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.6, 4).rotateY(Math.PI / 4), M.roofBrown), 0, h + 2.9, 0);
    return g;
  };

  // Ruin av en pelarhall (för fältet)
  B.ruin = (x, y, z, ry, r = 6, n = 8, seed = 0) => {
    const g = groupAt(x, y, z, ry);
    put(g, new THREE.Mesh(cyl(r + 0.8, r + 1.0, 0.6, 20, 2), M.marble), 0, -0.05, 0, true);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, hgt = 1.2 + hash2(i + seed, seed) * 4.4;
      const geo = breakTop(cyl(0.45, 0.52, hgt, 10, 2), hgt, 0.5);
      put(g, new THREE.Mesh(geo, M.marble), Math.cos(a) * r, 0.25 + hgt / 2, Math.sin(a) * r, true);
      if (hash2(seed, i) > 0.5) put(g, new THREE.Mesh(cyl(0.5, 0.5, 1.5, 10, 2).rotateZ(Math.PI / 2), M.marble), Math.cos(a + 0.3) * (r + 2), 0.45, Math.sin(a + 0.3) * (r + 2), true);
    }
    return g;
  };

  // Hus som brunnit (från byn)
  B.local = local;

  // Hjälp för att räkna ut gränser för kartan
  B.bounds = (x0, x1, z0, z1) => { A.bounds = { x0, x1, z0, z1 }; };

  return B;
}

// Världen: flytande öar i en evig storm.
//
// Karta (x österut, z söderut, y uppåt):
//   startön (0, 86) → mellanön (0, 49) → Cellos by (0, 0) → Aetheria (0, -78)
//   → stenväg norrut → The Tempest Bastion (z -143 till -232)
//   byn → östön med stormstenen (60, 0) → stenväg österut → udden (100, 0) → pyramiden långt bort
//
// Allt som Cello kan stå på eller krocka med läggs även i `collision`,
// som sedan blir ett Octree för kollisioner. Saker som rör sig (stenar som reser sig,
// dörrar) är lådor i WorldCollider och kopplas in med world.connect().
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { createTextures, mulberry } from './textures.js';
import { smooth, wrap, hash2, box, cyl, cylUV, breakTop, rockGeo, place, bake } from './geom.js';
import { Bastion } from './bastion.js';

const AZ = -78; // Aetherias mittpunkt i z

// Flytande stenar som reser sig ur stormen och bildar en väg
class StonePath {
  constructor(scene, stones, M) {
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
      g.position.set(s.x, -30, s.z);
      g.visible = false;
      scene.add(g);
      return { ...s, g, box: null, t: -1, delay: i * 0.22 };
    });
    this.raised = false;
    this.anim = false;
    this.onStone = null;
  }

  connect(collider) {
    for (const s of this.stones) {
      s.box = collider.addBox(s.x - 1.4, -1.0, s.z - 1.3, s.x + 1.4, 0.1, s.z + 1.3, 'stone');
      s.box.enabled = false;
    }
  }

  raise(instant = false) {
    this.raised = true;
    for (const s of this.stones) {
      s.g.visible = true;
      if (instant) {
        s.g.position.y = 0;
        s.box.enabled = true;
        s.t = 99;
      } else s.t = -s.delay;
    }
    this.anim = !instant;
  }

  // Tillbaka ner i stormen (nytt spel)
  lower() {
    this.raised = false;
    this.anim = false;
    for (const s of this.stones) {
      s.g.visible = false;
      s.g.position.y = -30;
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
      s.g.position.y = -30 * (1 - e) + Math.sin(k * Math.PI) * 0.4;
      s.g.rotation.y = (1 - e) * 1.4;
      if (s.t >= 1) {
        s.g.position.y = 0;
        s.g.rotation.y = 0;
        s.box.enabled = true;
      }
    }
    if (done) this.anim = false;
  }
}

export function buildWorld(scene, lights) {
  const noise = new ImprovedNoise();
  const tex = createTextures();
  const rand = mulberry(7);
  const collision = new THREE.Group();
  const updaters = [];
  const S = new THREE.Group(); // statiska föremål som slås ihop i slutet
  scene.add(S);

  const lam = (o) => new THREE.MeshLambertMaterial(o);
  const M = {
    grass: lam({ map: tex.grass, vertexColors: true }),
    cliff: lam({ map: tex.cliff, flatShading: true, vertexColors: true }),
    rockTop: lam({ map: tex.rock, vertexColors: true }),
    rock: lam({ map: tex.rock, flatShading: true }),
    marble: lam({ map: tex.marble }),
    brick: lam({ map: tex.brick }),
    wood: lam({ map: tex.wood }),
    rope: lam({ color: 0x5e4f3a }),
    iron: lam({ color: 0x45434a, flatShading: true }),
    obsidian: lam({ color: 0x1c1b23, flatShading: true }),
    tuft: lam({ map: tex.tuft, alphaTest: 0.5 }),
    mosaic: lam({ map: tex.mosaic }),
    runes: lam({ map: tex.runes }),
    char: lam({ map: tex.charred, flatShading: true }),
    clothOchre: lam({ color: 0x8a6a3a, side: THREE.DoubleSide, flatShading: true }),
    clothRed: lam({ color: 0x7a3b30, side: THREE.DoubleSide, flatShading: true }),
    clothBlue: lam({ color: 0x4d5866, side: THREE.DoubleSide, flatShading: true }),
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
    runeGlow: new THREE.MeshBasicMaterial({ color: 0x3a5a70 }),
  };

  // Lägger till ett synligt föremål och en kollisionskopia av det.
  function solid(mesh, parent = S) {
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const c = new THREE.Mesh(mesh.geometry);
    c.matrixAutoUpdate = false;
    c.matrix.copy(mesh.matrixWorld);
    collision.add(c);
    return mesh;
  }
  // Osynlig kollision (t.ex. en ramp under synliga trappsteg).
  function hidden(geometry, x, y, z, rx = 0, ry = 0, rz = 0) {
    const c = new THREE.Mesh(geometry);
    c.position.set(x, y, z);
    c.rotation.set(rx, ry, rz);
    collision.add(c);
    return c;
  }
  const deco = (mesh, x, y, z) => S.add(place(mesh, x, y, z));

  // ---------- Öar ----------
  const tuftPositions = [];

  function island(o) {
    const {
      cx, cz, baseR, rNoise = 3, seed = 0, amp = 0.6, pads = [], keepAngles = [],
      depth = 18, rings = 36, segs = 96, collide = true, grass = 0, avoid = () => false, baseY = 0,
      topMat = M.grass,
    } = o;

    const Rof = (a) => {
      const n = noise.noise(Math.cos(a) * 1.6 + seed * 3.1, Math.sin(a) * 1.6 + seed * 1.7, seed * 0.37)
        + 0.5 * noise.noise(Math.cos(a) * 3.4 + seed, Math.sin(a) * 3.4 - seed, seed * 0.11 + 4);
      let m = 1;
      for (const k of keepAngles) m = Math.min(m, smooth(0.15, 0.55, Math.abs(wrap(a - k))));
      return baseR + n * rNoise * m;
    };
    const H = (x, z) => {
      const lx = x - cx, lz = z - cz;
      const t = Math.hypot(lx, lz) / Rof(Math.atan2(lz, lx));
      let h = noise.noise(x * 0.07, z * 0.07, seed + 10.5) * amp
        + noise.noise(x * 0.23, z * 0.23, seed + 3.3) * amp * 0.3;
      h -= smooth(0.82, 1.0, t) * 0.6;
      for (const p of pads) {
        const w = 1 - smooth(p.r * 0.55, p.r, Math.hypot(x - p.x, z - p.z));
        h += (p.h - h) * w;
      }
      return h + baseY;
    };

    // Ovansidan (gräs)
    const pos = [], uvs = [], cols = [], idx = [];
    const ringR = [];
    for (let j = 0; j < segs; j++) ringR.push(Rof((j / segs) * Math.PI * 2));
    const pushV = (x, z, i) => {
      const y = H(x, z);
      pos.push(x, y, z);
      uvs.push(x / 4, z / 4);
      const shade = 1 - smooth(0.72, 1.0, i / rings) * 0.35 + noise.noise(x * 0.15, z * 0.15, seed + 20) * 0.14;
      cols.push(shade, shade, shade);
    };
    pushV(cx, cz, 0);
    for (let i = 1; i <= rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2, r = ringR[j] * (i / rings);
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
    if (collide) solid(top, scene); else scene.add(top);

    // Undersidan: en ojämn klippkon som hänger ner i stormen
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
        const y = baseY - 0.5 + dy * scaleY + noise.noise(Math.cos(a) * 4, Math.sin(a) * 4, seed + li * 3) * 0.7;
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
        const A = k * cols1 + j, B = A + 1, C = (k + 1) * cols1 + j, D = C + 1;
        uidx.push(A, B, C, B, D, C);
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
    scene.add(new THREE.Mesh(underGeo, M.cliff));

    // Grästuvor
    let placed = 0, tries = 0;
    while (placed < grass && tries < grass * 20) {
      tries++;
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.9 * Rof(a);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (avoid(x, z)) continue;
      tuftPositions.push(x, H(x, z), z, rand() * Math.PI, 0.7 + rand() * 0.7);
      placed++;
    }
    return { H, Rof, cx, cz };
  }

  // Cellos by – den stora ön i mitten
  const housePads = [[8.5, 15.5], [-8.5, 15], [16, 20], [-17, 19], [21, 7], [-23, -1], [5, 25]];
  const main = island({
    cx: 0, cz: 0, baseR: 33, rNoise: 3.5, seed: 1, amp: 0.7, keepAngles: [0, -Math.PI / 2, Math.PI / 2], depth: 28,
    rings: 44, segs: 112,
    pads: [
      { x: 0, z: 0, r: 13, h: 0 }, { x: 0, z: 16, r: 5, h: 0 }, { x: 32, z: 0, r: 4.5, h: 0.1 },
      { x: -14, z: -7, r: 8.5, h: 0 }, { x: -14, z: 6, r: 4.5, h: 0 }, { x: 0, z: -16, r: 9, h: 0 },
      { x: 0, z: -31.5, r: 4.5, h: 0.1 }, { x: 0, z: 31.5, r: 4.5, h: 0.1 },
      ...housePads.map(([x, z]) => ({ x, z, r: 4.8, h: 0 })),
    ],
    grass: 680,
    avoid: (x, z) => Math.hypot(x, z) < 10.2 || Math.hypot(x + 14, z + 7) < 5.6
      || (Math.abs(x) < 8 && Math.abs(z + 16) < 1.2) || (Math.abs(x + 14) < 1.8 && z > -3 && z < 5.4)
      || (x > 29 && Math.abs(z) < 1.6) || (Math.abs(x) < 1.8 && (z < -27 || z > 27))
      || housePads.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 3.2),
  });

  // Mellanön och startön söder om byn
  const mid = island({
    cx: 0, cz: 49, baseR: 6.6, rNoise: 1, seed: 13, amp: 0.25, keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 11,
    rings: 14, segs: 48, pads: [{ x: 0, z: 49, r: 6, h: 0.05 }], grass: 50,
    avoid: (x, z) => Math.abs(x) < 1.6,
  });
  const start = island({
    cx: 0, cz: 86, baseR: 19, rNoise: 2.2, seed: 17, amp: 0.55, keepAngles: [-Math.PI / 2], depth: 20,
    rings: 30, segs: 80, pads: [{ x: 0, z: 67.5, r: 4, h: 0.1 }, { x: 0, z: 99, r: 5, h: 0 }, { x: -4, z: 94, r: 4.5, h: 0 }],
    grass: 320,
    avoid: (x, z) => Math.abs(x) < 1.4 && z < 98,
  });

  // Östön med stormstenen, och udden längst österut
  const east = island({
    cx: 60, cz: 0, baseR: 13, rNoise: 1.8, seed: 5, amp: 0.35, keepAngles: [Math.PI, 0], depth: 17,
    rings: 22, segs: 72,
    pads: [{ x: 48.5, z: 0, r: 4, h: 0.1 }, { x: 71.5, z: 0, r: 4, h: 0.1 }, { x: 61, z: -2, r: 6, h: 0 }],
    grass: 120,
    avoid: (x, z) => Math.hypot(x - 62.5, z + 4.5) < 2 || (Math.abs(z) < 1.6 && (x < 50 || x > 70)),
  });
  const cape = island({
    cx: 100, cz: 0, baseR: 7, rNoise: 1, seed: 29, amp: 0.25, keepAngles: [Math.PI], depth: 12,
    rings: 14, segs: 48, pads: [{ x: 100, z: 0, r: 6, h: 0.05 }], grass: 40,
  });

  // Avlägsna öar, bara kulisser
  const far = [
    [-120, 18, -150, 22], [175, -6, -80, 26], [80, 26, 175, 16], [-180, -12, 50, 24],
    [20, 44, -300, 30], [-95, 8, 160, 15], [190, 30, 120, 18], [-175, 22, -55, 18],
  ];
  far.forEach(([x, y, z, r], i) => {
    const isl = island({ cx: x, cz: z, baseY: y, baseR: r, rNoise: r * 0.18, seed: 20 + i, amp: 0.5, depth: r * 1.5, rings: 6, segs: 28, collide: false });
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = rand() * r * 0.6;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, ph = 4 + rand() * 8;
      const g = breakTop(cyl(0.9, 1.0, ph, 8), ph, rand() > 0.5 ? 1 : 0);
      deco(new THREE.Mesh(g, M.marble), px, isl.H(px, pz) + ph / 2, pz);
    }
  });
  // Sun-Scorched Pyramid, långt i öster (nås i en senare version)
  {
    const isl = island({ cx: 250, cz: -40, baseY: 34, baseR: 34, rNoise: 4, seed: 41, amp: 0.5, depth: 50, rings: 8, segs: 36, collide: false, topMat: M.rockTop });
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(28, 40, 4, 1), M.gold);
    pyr.rotation.y = Math.PI / 4;
    deco(pyr, 250, isl.H(250, -40) + 20, -40);
  }

  // ---------- Platsen i byns mitt: helgedomen med eldfatet ----------
  const tiers = [[9.0, 0.22], [8.4, 0.44], [7.8, 0.66], [7.2, 0.88]];
  for (const [r, topY] of tiers) {
    const h = topY + 0.6;
    deco(new THREE.Mesh(cyl(r, r, h, 40, 2.5), M.marble), 0, topY - h / 2, 0);
  }
  const PLAT = 0.88;
  // Trappstegen känns som steg men kollisionen är en mjuk ramp
  hidden(new THREE.CylinderGeometry(7.2, 9.25, PLAT, 40, 1, true), 0, PLAT / 2, 0);
  hidden(new THREE.CircleGeometry(7.25, 40), 0, PLAT, 0, -Math.PI / 2);

  solid(place(new THREE.Mesh(cyl(0.55, 0.7, 0.9, 8, 1.5), M.marble), 0, PLAT + 0.45, 0));
  deco(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.5, 0.45, 8), M.iron), 0, PLAT + 1.12, 0);
  hidden(new THREE.CylinderGeometry(0.95, 0.95, 1.4, 8), 0, PLAT + 0.7, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a33, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flameMat2 = flameMat.clone();
  flameMat2.color.set(0xffd27a);
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.32 - i * 0.04, 1.0 - i * 0.12, 5), i % 2 ? flameMat2 : flameMat);
    const a = i * 1.7;
    f.position.set(Math.cos(a) * 0.22 * (i > 0), PLAT + 1.65, Math.sin(a) * 0.22 * (i > 0));
    scene.add(f);
    flames.push(f);
  }
  lights.add({ x: 0, y: PLAT + 2.2, z: 0, color: 0xff8a3a, power: 34, range: 18 });
  updaters.push((t) => {
    flames.forEach((f, i) => {
      const s = 1 + Math.sin(t * (9 + i * 3.1) + i) * 0.18;
      f.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      f.rotation.y = t * (1 + i * 0.4);
      f.position.y = PLAT + 1.6 + (s - 1) * 0.4;
    });
  });

  // Pelarring med tre portar
  const heights = [5.6, 3.0, 5.6, 5.6, 5.6, 1.4, 5.6, 5.6, 2.6, 2.0, 3.6, 5.6];
  const pillarR = 6.0, step = (Math.PI * 2) / 12, off = step / 2;
  const pillarPos = heights.map((h, k) => {
    const a = off + k * step;
    const x = Math.cos(a) * pillarR, z = Math.sin(a) * pillarR;
    const intact = h > 5;
    solid(place(new THREE.Mesh(box(1.5, 0.3, 1.5, 1.5), M.marble), x, PLAT + 0.15, z));
    const shaftH = h - 0.3 - (intact ? 0.32 : 0);
    let g = cyl(0.5, 0.58, shaftH, 10, 2);
    if (!intact) g = breakTop(g, shaftH, 0.55);
    solid(place(new THREE.Mesh(g, M.marble), x, PLAT + 0.3 + shaftH / 2, z));
    if (intact) solid(place(new THREE.Mesh(box(1.4, 0.32, 1.4, 1.4), M.marble), x, PLAT + h - 0.16, z));
    else {
      for (let i = 0; i < 3; i++) {
        const ra = rand() * Math.PI * 2, rd = 1.2 + rand() * 1.4;
        deco(new THREE.Mesh(rockGeo(0.25 + rand() * 0.25, k * 3 + i, 0.8), M.marble), x + Math.cos(ra) * rd, PLAT + 0.1, z + Math.sin(ra) * rd);
      }
    }
    return { x, z, h };
  });
  for (const [i, j] of [[2, 3], [11, 0], [6, 7]]) {
    const p0 = pillarPos[i], p1 = pillarPos[j];
    const dx = p1.x - p0.x, dz = p1.z - p0.z, len = Math.hypot(dx, dz) + 1.3;
    const l = new THREE.Mesh(box(len, 0.55, 1.1, 1.5), M.marble);
    l.position.set((p0.x + p1.x) / 2, PLAT + 5.6 + 0.27, (p0.z + p1.z) / 2);
    l.rotation.y = -Math.atan2(dz, dx);
    solid(l);
  }

  // Omkullfallna pelare
  function fallen(x, z, ang, n) {
    for (let i = 0; i < n; i++) {
      const d = i * 1.72 + rand() * 0.12;
      const px = x + Math.cos(ang) * d, pz = z + Math.sin(ang) * d;
      const m = new THREE.Mesh(cyl(0.55, 0.55, 1.6, 10, 2), M.marble);
      m.position.set(px, main.H(px, pz) + 0.45, pz);
      m.rotation.set(0, -ang + (rand() - 0.5) * 0.15, -Math.PI / 2, 'YXZ');
      solid(m);
    }
  }
  fallen(9.6, 9.6, 0.2, 3);
  fallen(-10.5, 8.2, 2.6, 2);

  // Stora stenblock
  [[11, -9, 1.4], [26, -12, 1.5], [-20, 7, 1.5], [-12, 26, 1.0], [17, -15, 1.3], [-25, -15, 1.7], [24, 18, 1.2]].forEach(([x, z, r], i) => {
    solid(place(new THREE.Mesh(rockGeo(r, 40 + i), M.rock), x, main.H(x, z) + r * 0.35, z));
  });
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2, rr = 10 + rand() * 21;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if ((x > 28 && Math.abs(z) < 2) || (Math.abs(x) < 2 && Math.abs(z) > 26)) continue;
    const s = 0.12 + rand() * 0.3;
    deco(new THREE.Mesh(rockGeo(s, 90 + i), M.rock), x, main.H(x, z) + s * 0.2, z);
  }

  // Ruinmur i norr med en port och en vinkel
  const wallZ = -16;
  [[-7, -4.6, 2.6], [-4.6, -1.15, 3.4], [1.15, 3.8, 3.7], [3.8, 6.6, 2.3]].forEach(([x0, x1, h]) => {
    solid(place(new THREE.Mesh(box(x1 - x0, h + 0.4, 0.9), M.brick), (x0 + x1) / 2, h / 2 - 0.2, wallZ));
  });
  solid(place(new THREE.Mesh(box(2.9, 0.6, 0.95), M.brick), 0, 2.85, wallZ));
  solid(place(new THREE.Mesh(box(0.9, 2.4, 4.2), M.brick), 6.15, 1.0, wallZ + 2.5));
  solid(place(new THREE.Mesh(box(1.2, 0.7, 0.9), M.brick), -3.2, 3.65, wallZ));
  solid(place(new THREE.Mesh(box(0.9, 0.5, 0.9), M.brick), 2.4, 3.9, wallZ));

  // Klippan i väster med ramp
  const plat = { x: -14, z: -7, r: 5, top: 3.0 };
  {
    const h = 4.5;
    const g = new THREE.CylinderGeometry(plat.r * 0.92, plat.r, h, 8, 3, false, -Math.PI / 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rr = Math.hypot(x, z);
      if (rr < 0.01 || z > 4.0) continue; // rampsidan hålls rak
      const k = 1 + (hash2(x * 1.3, z * 1.3 + Math.round(y * 10)) - 0.5) * (y > h / 2 - 0.01 ? 0.1 : 0.16);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    cylUV(g, plat.r, h, 3);
    solid(place(new THREE.Mesh(g, M.rock), plat.x, plat.top - h / 2, plat.z));
    const cap = new THREE.Mesh(new THREE.CircleGeometry(plat.r * 0.84, 8, -Math.PI / 8), M.grass);
    const cc = [];
    for (let i = 0; i < cap.geometry.attributes.position.count; i++) cc.push(0.9, 0.9, 0.9);
    cap.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    cap.rotation.x = -Math.PI / 2;
    scene.add(place(cap, plat.x, plat.top + 0.01, plat.z));
  }
  {
    const rimZ = plat.z + plat.r * 0.92 * Math.cos(Math.PI / 8);
    const zTop = rimZ, yTop = plat.top + 0.04, run = 7.6;
    const theta = Math.atan2(yTop, run), len = Math.hypot(yTop, run), thick = 0.4;
    const ramp = new THREE.Mesh(box(2.6, thick, len, 2), M.brick);
    const nY = Math.cos(theta), nZ = Math.sin(theta);
    ramp.position.set(plat.x, yTop / 2 - nY * thick / 2, zTop + run / 2 - nZ * thick / 2);
    ramp.rotation.x = theta;
    solid(ramp);
  }
  // Titanens avbrutna svärd, nedstött i klippan
  {
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(box(0.28, 5.2, 1.2, 1.5), M.iron);
    blade.position.y = 1.6;
    const guard = new THREE.Mesh(box(2.4, 0.4, 0.55, 1), M.iron);
    guard.position.y = 4.3;
    const grip = new THREE.Mesh(box(0.32, 1.6, 0.32, 1), M.obsidian);
    grip.position.y = 5.3;
    sword.add(blade, guard, grip);
    sword.position.set(plat.x + 1.6, plat.top - 1.0, plat.z - 2.2);
    sword.rotation.set(-0.18, 0.5, 0.22);
    S.add(sword);
    solid(blade, sword);
    solid(guard, sword);
  }
  {
    const h = 2.4;
    solid(place(new THREE.Mesh(breakTop(cyl(0.5, 0.58, h, 10), h, 0.6), M.marble), plat.x - 2.2, plat.top + h / 2, plat.z + 0.6));
  }

  // ---------- Broar ----------
  const DECK = 0.1;
  const plankMatrix = new THREE.Matrix4(), plankQ = new THREE.Quaternion(), plankE = new THREE.Euler();
  const planks = []; // [x, y, z, ry, rx, rz, sx]
  // En bro längs x (along = 'x') eller längs z, från a0 till a1 vid tvärkoordinaten c
  function bridge(along, a0, a1, c) {
    const len = a1 - a0, mid = (a0 + a1) / 2;
    const P = (a, cc, y) => (along === 'x' ? [a, y, cc] : [cc, y, a]);
    const B = (w, h, d) => (along === 'x' ? box(w, h, d, 1) : box(d, h, w, 1));
    const [hx, , hz] = P(mid, c, 0);
    hidden(along === 'x' ? new THREE.BoxGeometry(len, 0.3, 2.2) : new THREE.BoxGeometry(2.2, 0.3, len), hx, DECK - 0.15, hz);
    for (let a = a0; a < a1 - 0.2; a += 0.46) planks.push([along, a + 0.2, c + (rand() - 0.5) * 0.08, rand()]);
    [-0.85, 0.85].forEach((o) => deco(new THREE.Mesh(B(len, 0.2, 0.2), M.wood), ...P(mid, c + o, DECK - 0.22)));
    for (let a = a0 + 0.3; a <= a1; a += 2.0) {
      [-1.15, 1.15].forEach((o) => deco(new THREE.Mesh(box(0.14, 1.1, 0.14, 1), M.wood), ...P(a, c + o, DECK + 0.45)));
    }
    [-1.15, 1.15].forEach((o) => deco(new THREE.Mesh(along === 'x' ? new THREE.BoxGeometry(len - 0.3, 0.05, 0.05) : new THREE.BoxGeometry(0.05, 0.05, len - 0.3), M.rope), ...P(mid, c + o, DECK + 0.85)));
  }
  bridge('x', 32.3, 39.6, 0); // den trasiga bron österut
  bridge('x', 41.7, 47.6, 0);
  bridge('z', -48.6, -32.3, 0); // till Aetheria
  bridge('z', 32.3, 43.3, 0); // söderut mot mellanön
  bridge('z', 54.7, 66.6, 0); // och vidare till startön
  deco(new THREE.Mesh(breakTop(cyl(1.0, 0.7, 9, 8, 2), 9, 0.4), M.marble), 0, DECK - 4.8, -40.4);
  {
    const plankMesh = new THREE.InstancedMesh(box(0.4, 0.12, 2.1, 1), M.wood, planks.length + 3);
    planks.forEach(([along, a, c, r], i) => {
      plankE.set(along === 'x' ? 0 : (r - 0.5) * 0.04, along === 'x' ? (r - 0.5) * 0.06 : Math.PI / 2 + (r - 0.5) * 0.06, along === 'x' ? (r - 0.5) * 0.04 : 0);
      plankQ.setFromEuler(plankE);
      const p = along === 'x' ? new THREE.Vector3(a, DECK - 0.06, c) : new THREE.Vector3(c, DECK - 0.06, a);
      plankMatrix.compose(p, plankQ, new THREE.Vector3(1, 1, 0.95 + r * 0.1));
      plankMesh.setMatrixAt(i, plankMatrix);
    });
    // Plankor som dinglar vid hålet i den östra bron
    [[39.7, -1.25, 0.3], [41.6, 1.35, -0.4], [39.9, -0.9, -0.6]].forEach(([x, rz, dz], i) => {
      plankE.set(0.2 * dz, 0.3 * dz, rz);
      plankQ.setFromEuler(plankE);
      plankMatrix.compose(new THREE.Vector3(x + (rz < 0 ? 0.15 : -0.15), DECK - 0.75, dz), plankQ, new THREE.Vector3(1, 1, 0.5));
      plankMesh.setMatrixAt(planks.length + i, plankMatrix);
    });
    scene.add(plankMesh);
  }

  // ---------- Eld och rök ----------
  const smokeTex = (() => {
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
  const fires = [];
  function makeFire(x, y, z, size = 1, lightPower = 0, smokeCount = 6, smokeHeight = 4.5) {
    // Varje eld har en egen grupp, så att main.js kan dölja eldar långt bort
    const group = new THREE.Group();
    scene.add(group);
    const f = { pos: new THREE.Vector3(x, y, z), level: 1, flames: [], smoke: [], light: null, size, smokeHeight, group };
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry((0.34 - i * 0.05) * size, (1.0 - i * 0.12) * size, 5), i % 2 ? flameMat2 : flameMat);
      const a = i * 1.9;
      m.position.set(x + Math.cos(a) * 0.25 * size * (i > 0), y + 0.45 * size, z + Math.sin(a) * 0.25 * size * (i > 0));
      group.add(m);
      f.flames.push(m);
    }
    for (let i = 0; i < smokeCount; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x2a2826, transparent: true, opacity: 0, depthWrite: false }));
      sp.userData.t = i / smokeCount;
      group.add(sp);
      f.smoke.push(sp);
    }
    if (lightPower > 0) f.light = lights.add({ x, y: y + 1.2 * size, z, color: 0xff8a3a, power: lightPower, range: 14 * size });
    fires.push(f);
    return f;
  }
  updaters.push((t, dt) => {
    for (const f of fires) {
      const lv = f.level;
      f.flames.forEach((m, i) => {
        const s = (1 + Math.sin(t * (9 + i * 3.1) + i + f.pos.x) * 0.18) * Math.max(0.05, lv);
        m.scale.set(1 / Math.sqrt(Math.max(0.2, s)), s, 1 / Math.sqrt(Math.max(0.2, s)));
        m.visible = lv > 0.12 && !f.noFlames;
        m.rotation.y = t * (1 + i * 0.4);
      });
      if (f.light) f.light.level = Math.max(0.12, lv);
      for (const sp of f.smoke) {
        sp.userData.t = (sp.userData.t + dt * (0.22 / (f.smokeHeight / 4.5) ** 0.5)) % 1;
        const k = sp.userData.t;
        sp.position.set(f.pos.x + Math.sin(k * 5 + f.pos.z) * 0.4 * k * f.size, f.pos.y + 0.8 * f.size + k * f.smokeHeight * f.size, f.pos.z + k * 0.9 * f.size);
        sp.scale.setScalar((0.6 + k * 2.4) * f.size * (f.smokeHeight > 6 ? 1.8 : 1));
        sp.material.opacity = Math.sin(k * Math.PI) * 0.5 * Math.min(1, 0.3 + lv);
      }
    }
  });

  // ---------- Cellos by: brända och brinnande hus ----------
  const villageFires = [];
  function houseGroup(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, main.H(x, z), z);
    g.rotation.y = ry;
    S.add(g);
    g.updateWorldMatrix(true, false);
    return g;
  }
  const at = (g, lx, ly, lz) => g.localToWorld(new THREE.Vector3(lx, ly, lz));
  function burnedHouse(x, z, ry) {
    const g = houseGroup(x, z, ry);
    const add = (mesh, collide = true) => { if (collide) solid(mesh, g); else g.add(mesh); return mesh; };
    [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.2]].forEach(([px, pz], i) => {
      const h = [2.6, 2.2, 1.6, 2.4][i];
      add(place(new THREE.Mesh(box(0.28, h, 0.28, 1), M.char), px, h / 2, pz));
    });
    add(place(new THREE.Mesh(box(4.2, 1.5, 0.2, 1.5), M.char), 0, 0.75, -1.6));
    add(place(new THREE.Mesh(box(0.2, 1.0, 2.4, 1.5), M.char), -2, 0.5, -0.3));
    const beam = place(new THREE.Mesh(box(4.6, 0.25, 0.25, 1), M.char), 0.2, 1.3, 0.2);
    beam.rotation.set(0.2, 0.3, 0.45);
    g.add(beam);
    const beam2 = place(new THREE.Mesh(box(3.2, 0.22, 0.22, 1), M.char), -0.6, 0.35, 1.0);
    beam2.rotation.set(0, -0.6, 0.1);
    g.add(beam2);
    for (let i = 0; i < 3; i++) g.add(place(new THREE.Mesh(box(0.5, 0.04, 0.05, 1), M.glow), -1.2 + i * 1.1, 0.05, -1.2 + i * 0.6));
    return g;
  }
  function collapsedHouse(x, z, ry, seed) {
    const g = houseGroup(x, z, ry);
    for (let i = 0; i < 9; i++) {
      const r = new THREE.Mesh(rockGeo(0.45 + (i % 3) * 0.2, seed + i, 0.7), i % 2 ? M.char : M.rock);
      r.position.set((i % 3 - 1) * 1.1 + (hash2(i, seed) - 0.5), 0.2 + Math.floor(i / 3) * 0.25, (Math.floor(i / 3) - 1) * 1.0);
      g.add(r);
    }
    const roof = place(new THREE.Mesh(box(4.4, 0.18, 2.8, 1.5), M.thatch), 0.3, 0.9, 0.4);
    roof.rotation.set(0.35, 0.2, -0.28);
    g.add(roof);
    [[-1.8, 1.4, 0.6], [1.6, 1.0, -0.9]].forEach(([bx, by, bz], i) => {
      const b = place(new THREE.Mesh(box(0.25, 2.6, 0.25, 1), M.char), bx, by, bz);
      b.rotation.set(0.5 * (i ? -1 : 1), 0, 0.4);
      g.add(b);
    });
    solid(place(new THREE.Mesh(box(0.9, 2.2, 0.9, 1.2), M.brick), 1.9, 1.1, 1.3), g);
    solid(place(new THREE.Mesh(box(3.4, 0.9, 2.6, 2), M.char), 0, 0.2, 0), g);
    return g;
  }
  function burningHouse(x, z, ry) {
    const g = houseGroup(x, z, ry);
    const W = 5, D = 4, H = 2.5;
    solid(place(new THREE.Mesh(box(W, H, 0.3, 2), M.brick), 0, H / 2, -D / 2), g);
    solid(place(new THREE.Mesh(box(1.7, H, 0.3, 2), M.brick), -W / 2 + 0.85, H / 2, D / 2), g);
    solid(place(new THREE.Mesh(box(1.7, H, 0.3, 2), M.brick), W / 2 - 0.85, H / 2, D / 2), g);
    solid(place(new THREE.Mesh(box(1.6, 0.6, 0.3, 2), M.brick), 0, H - 0.3, D / 2), g);
    solid(place(new THREE.Mesh(box(0.3, H, D, 2), M.brick), -W / 2, H / 2, 0), g);
    solid(place(new THREE.Mesh(box(0.3, H, D, 2), M.brick), W / 2, H / 2, 0), g);
    [-1, 1].forEach((s) => {
      const r = place(new THREE.Mesh(box(W + 0.5, 0.16, 2.75, 1.5), s > 0 ? M.thatch : M.char), 0, H + 0.82, s * 1.05);
      r.rotation.x = s * 0.66;
      g.add(r);
    });
    g.add(place(new THREE.Mesh(box(0.8, 1.6, 0.06, 1), M.obsidian), 0, 0.8, D / 2 + 0.02));
    return { g, roof: at(g, 0, H + 1.4, 0), door: at(g, 0, 0.2, D / 2 + 0.6) };
  }
  burnedHouse(8.5, 15.5, -0.4);
  burnedHouse(-8.5, 15, 0.5);
  burnedHouse(21, 7, 1.2);
  collapsedHouse(16, 20, 0.3, 610);
  collapsedHouse(-23, -1, -0.8, 630);
  const bh4 = burningHouse(-17, 19, -0.6);
  const bh7 = burningHouse(5, 25, 0.1);
  villageFires.push(
    makeFire(8.9, main.H(8.9, 15.2), 15.2, 1.3, 28, 7),
    makeFire(-8.2, main.H(-8.2, 14.6), 14.6, 1.1, 24, 7),
    makeFire(16.4, main.H(16.4, 20) + 0.5, 20, 1.3, 26, 8, 9),
    makeFire(bh4.roof.x, bh4.roof.y, bh4.roof.z, 1.7, 30, 10, 12),
    makeFire(21.2, main.H(21.2, 7.4), 7.4, 0.9, 0, 5),
    makeFire(-22.6, main.H(-22.6, -1) + 0.4, -1, 1.1, 20, 6),
    makeFire(bh7.roof.x, bh7.roof.y, bh7.roof.z, 1.6, 30, 10, 12),
    makeFire(-4.2, main.H(-4.2, 27.5), 27.5, 0.7, 0, 4),
  );
  // Byns södra port, där Cello kommer hem
  [-2.3, 2.3].forEach((x) => solid(place(new THREE.Mesh(box(0.35, 3.2, 0.35, 1), M.char), x, main.H(x, 30) + 1.6, 30)));
  {
    const beam = place(new THREE.Mesh(box(5.4, 0.3, 0.3, 1), M.char), 0.3, main.H(0, 30) + 2.9, 30);
    beam.rotation.z = -0.12;
    S.add(beam);
    const sign = place(new THREE.Mesh(box(1.4, 0.7, 0.08, 1), M.wood), -1.2, 0.25, 31.2);
    sign.rotation.set(-1.3, 0.4, 0.2);
    S.add(sign);
  }
  // Brunn, staket, tunnor och lådor
  {
    const wy = main.H(-5, 22);
    solid(place(new THREE.Mesh(cyl(1.0, 1.05, 0.9, 10, 1.2), M.rock), -5, wy + 0.45, 22));
    deco(new THREE.Mesh(new THREE.CircleGeometry(0.8, 10).rotateX(-Math.PI / 2), M.obsidian), -5, wy + 0.88, 22);
    [-0.9, 0.9].forEach((o) => deco(new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.char), -5 + o, wy + 1.1, 22));
    const top = place(new THREE.Mesh(box(2.2, 0.12, 0.9, 1), M.char), -5, wy + 2.2, 22);
    top.rotation.z = 0.25;
    S.add(top);
  }
  function fence(x0, z0, x1, z1, broken) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) {
      if (broken.includes(i)) continue;
      const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
      const post = place(new THREE.Mesh(box(0.14, 1.0, 0.14, 1), M.char), x, main.H(x, z) + 0.5, z);
      post.rotation.z = (hash2(x, z) - 0.5) * 0.4;
      S.add(post);
      if (i < n && !broken.includes(i + 1)) {
        const rail = place(new THREE.Mesh(box(len / n, 0.1, 0.06, 1), M.char), (x + x0 + ((x1 - x0) * (i + 1)) / n) / 2, main.H(x, z) + 0.7, (z + z0 + ((z1 - z0) * (i + 1)) / n) / 2);
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        S.add(rail);
      }
    }
  }
  fence(11, 24, 19, 26, [2]);
  fence(-12, 11, -14, 5, [1]);
  fence(24, 2, 26, 12, [3, 4]);
  [[12.2, 13.4], [13, 12.6], [-13, 17.4], [7.6, 26.5], [-20.4, 4.6]].forEach(([x, z], i) => {
    const b = place(new THREE.Mesh(cyl(0.36, 0.4, 0.9, 8, 1), i % 2 ? M.wood : M.char), x, main.H(x, z) + 0.45, z);
    if (i === 2) { b.rotation.z = Math.PI / 2; b.position.y -= 0.1; }
    solid(b);
  });
  [[13.6, 14.6, 0.3], [-12.2, 18.8, -0.5]].forEach(([x, z, r]) => {
    const c = place(new THREE.Mesh(box(0.8, 0.8, 0.8, 1), M.wood), x, main.H(x, z) + 0.4, z);
    c.rotation.y = r;
    solid(c);
  });
  // Stora rökpelare som syns långt bort
  villageFires.push(makeFire(-3, main.H(-3, 9), 9, 0.6, 0, 3));
  for (const [x, z] of [[-17, 19], [5, 25], [16, 20]]) {
    const f = makeFire(x, main.H(x, z) + 3.5, z, 2.6, 0, 9, 14);
    f.noFlames = true;
    villageFires.push(f);
  }

  // ---------- Mellanön: en välta kärra och ett brinnande träd ----------
  {
    const y = mid.H(2, 49);
    const cart = new THREE.Group();
    cart.position.set(2.3, y, 48.5);
    cart.rotation.set(0, 0.6, 1.25);
    S.add(cart);
    solid(place(new THREE.Mesh(box(2.2, 0.15, 1.3, 1), M.wood), 0, 0.5, 0), cart);
    [-0.6, 0.6].forEach((z) => cart.add(place(new THREE.Mesh(box(2.2, 0.5, 0.1, 1), M.wood), 0, 0.8, z)));
    const wheel = place(new THREE.Mesh(cyl(0.55, 0.55, 0.12, 10, 1), M.wood), -0.7, 0.55, 0.75);
    wheel.rotation.x = Math.PI / 2;
    cart.add(wheel);
    const loose = place(new THREE.Mesh(cyl(0.55, 0.55, 0.12, 10, 1), M.wood), -1.3, y + 0.07, 51.5);
    S.add(loose);
    for (let i = 0; i < 4; i++) deco(new THREE.Mesh(rockGeo(0.28, 700 + i, 0.6), M.sack), 0.6 + i * 0.5, y + 0.15, 47 + (i % 2) * 0.6);
    const ty = mid.H(-3.4, 50.6);
    const trunk = place(new THREE.Mesh(cyl(0.22, 0.32, 3.4, 7, 1), M.char), -3.4, ty + 1.7, 50.6);
    trunk.rotation.z = 0.15;
    solid(trunk);
    [[0.5, 0.6], [-0.4, 1.9]].forEach(([r, h], i) => {
      const br = place(new THREE.Mesh(cyl(0.08, 0.12, 1.6, 5, 1), M.char), -3.4 + (i ? -0.5 : 0.5), ty + 2.4 + h * 0.3, 50.6);
      br.rotation.z = r * 2;
      S.add(br);
    });
    villageFires.push(makeFire(-3.3, ty + 3.1, 50.6, 0.9, 18, 5));
  }

  // ---------- Startön: Cellos lägerplats i skogen ----------
  function pine(x, z, s = 1) {
    const y = start.H(x, z);
    solid(place(new THREE.Mesh(cyl(0.18 * s, 0.26 * s, 1.6 * s, 6, 1), M.wood), x, y + 0.8 * s, z));
    [[1.4, 1.7, 1.7], [1.1, 1.5, 2.7], [0.75, 1.3, 3.6]].forEach(([r, h, yy], i) => {
      deco(new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), i % 2 ? M.pine : M.pineDark), x, y + yy * s, z);
    });
  }
  [[-9, 82, 1.2], [-12, 90, 1.0], [9, 80, 1.1], [12, 92, 1.3], [7, 100, 0.9], [-10, 101, 1.1], [-14, 78, 0.9], [14, 85, 0.8], [3, 106, 1.0], [-5, 107, 1.2]].forEach(([x, z, s]) => pine(x, z, s));
  {
    const y = start.H(-5, 95);
    [[-6.4, 93.6], [-3.6, 93.6], [-6.4, 96.4], [-3.6, 96.4]].forEach(([x, z], i) => solid(place(new THREE.Mesh(box(0.16, i < 2 ? 2.2 : 1.1, 0.16, 1), M.wood), x, y + (i < 2 ? 1.1 : 0.55), z)));
    const roof = place(new THREE.Mesh(box(3.4, 0.12, 3.3, 1.2), M.thatch), -5, y + 1.7, 95);
    roof.rotation.x = -0.32;
    S.add(roof);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      deco(new THREE.Mesh(rockGeo(0.2, 720 + i, 0.7), M.rock), -1.8 + Math.cos(a) * 0.7, start.H(-1.8, 92) + 0.06, 92 + Math.sin(a) * 0.7);
    }
    deco(new THREE.Mesh(box(0.6, 0.04, 0.4, 1), M.glow), -1.8, start.H(-1.8, 92) + 0.05, 92);
    for (let i = 0; i < 5; i++) {
      const log = place(new THREE.Mesh(cyl(0.09, 0.09, 1.1, 6, 1), M.wood), 1.0 + (i % 3) * 0.2, start.H(1, 97) + 0.1 + Math.floor(i / 3) * 0.17, 97.2 + (i % 2) * 0.2);
      log.rotation.set(0, 0.3, Math.PI / 2, 'YXZ');
      S.add(log);
    }
    solid(place(new THREE.Mesh(rockGeo(1.3, 740, 0.9), M.rock), 6, start.H(6, 88) + 0.5, 88));
  }

  // ---------- Östön: stormstenen ----------
  const eastStone = new THREE.Group();
  eastStone.position.set(62.5, east.H(62.5, -4.5), -4.5);
  eastStone.rotation.set(0.04, 0.4, 0.05);
  S.add(eastStone);
  solid(place(new THREE.Mesh(box(1.3, 7, 1.3, 2), M.obsidian), 0, 3.1, 0), eastStone);
  const eastRunes = new THREE.MeshBasicMaterial({ color: 0x2a3440 });
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.02), eastRunes);
    r.position.set(0, 1.4 + i * 1.2, 0.66);
    r.userData.keep = true;
    eastStone.add(r);
  }
  const eastPlate = new THREE.Vector3(61, east.H(61, -1.6), -1.6);
  const eastPlateMat = new THREE.MeshLambertMaterial({ color: 0x7a4c2e, emissive: 0x000000, flatShading: true });
  {
    const p = new THREE.Mesh(cyl(0.95, 1.0, 0.14, 10, 1), eastPlateMat);
    p.userData.keep = true;
    scene.add(place(p, eastPlate.x, eastPlate.y + 0.04, eastPlate.z));
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 2.6), eastRunes);
    groove.position.set(61.7, eastPlate.y + 0.02, -3.0);
    groove.rotation.y = 0.48;
    scene.add(groove);
  }
  // Udden: en förseglad gyllene port mot pyramiden
  {
    const y = cape.H(103, 0);
    [-1.8, 1.8].forEach((z) => solid(place(new THREE.Mesh(box(0.9, 4.6, 0.9, 1.5), M.marble), 103.5, y + 2.3, z)));
    deco(new THREE.Mesh(box(1.2, 0.7, 4.8, 1.5), M.marble), 103.5, y + 4.9, 0);
    const disc = new THREE.Mesh(cyl(0.9, 0.9, 0.16, 16, 1), M.gold);
    disc.rotation.z = Math.PI / 2;
    deco(disc, 103.0, y + 4.9, 0);
    solid(place(new THREE.Mesh(box(0.3, 3.6, 2.8, 1.2), M.gold), 103.5, y + 1.8, 0));
  }

  // ---------- Aetheria ----------
  const aeth = island({
    cx: 0, cz: AZ, baseR: 30, rNoise: 2.8, seed: 9, amp: 0.45, keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 32,
    rings: 40, segs: 104,
    pads: [{ x: 0, z: -80, r: 22, h: 0 }, { x: 0, z: -49.5, r: 4.5, h: 0.1 }, { x: 0, z: -106.5, r: 4.5, h: 0.1 }],
    grass: 340,
    avoid: (x, z) => Math.hypot(x, z + 80) < 16.5 || (Math.abs(x) < 1.8 && (z > -56 || z < -100))
      || Math.hypot(x + 16, z + 71) < 4 || Math.hypot(x - 15, z + 72) < 3.5 || Math.hypot(x, z + 103.5) < 2.5,
  });
  const T = new THREE.Vector3(0, 0, -80); // orkesterns mitt
  // Sittplatserna: sex halvcirkelformade trappsteg mot norr
  function annulus(r0, r1, h) {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, r1, 0, Math.PI, false);
    sh.absarc(0, 0, r0, Math.PI, 0, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 36 });
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.5, p.getY(i) / 2.5);
    return g;
  }
  for (let i = 0; i < 6; i++) {
    const h = 0.45 * (i + 1);
    const m = place(new THREE.Mesh(annulus(9 + 0.75 * i, 15.3, h + 0.5), M.marble), T.x, -0.5, T.z);
    if (i === 5) solid(m); else S.add(m);
  }
  {
    // Kollisionen för trappstegen är en mjuk ramp, vänd inåt mot orkestern
    const g = new THREE.CylinderGeometry(12.75, 9, 2.7, 40, 1, true, Math.PI / 2, Math.PI);
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const a = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = a; }
    hidden(g, T.x, 1.35, T.z);
  }
  [-1, 1].forEach((side) => solid(place(new THREE.Mesh(box(7.6, 3.6, 0.9), M.brick), T.x + side * 12.3, 1.3, T.z + 0.2)));
  [0.25, 0.7, 1.15, 1.6, 2.05, 2.5, 2.9].forEach((a, i) => {
    const x = T.x + Math.cos(a) * 14.6, z = T.z - Math.sin(a) * 14.6;
    const h = [3.6, 2.0, 3.6, 1.2, 3.6, 2.6, 3.6][i];
    solid(place(new THREE.Mesh(i % 2 ? breakTop(cyl(0.42, 0.48, h, 10), h, 0.5) : cyl(0.42, 0.48, h, 10), M.marble), x, 2.7 + h / 2, z));
  });
  {
    const g = new THREE.CircleGeometry(8.7, 40);
    g.rotateX(-Math.PI / 2);
    deco(new THREE.Mesh(g, M.mosaic), T.x, 0.03, T.z);
  }

  // Lägerelden, där man vilar och sparar
  const campPos = new THREE.Vector3(0, 0, -79);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    deco(new THREE.Mesh(rockGeo(0.22, 300 + i, 0.7), M.rock), campPos.x + Math.cos(a) * 0.85, 0.08, campPos.z + Math.sin(a) * 0.85);
  }
  [0.4, -0.5].forEach((ry) => {
    const log = new THREE.Mesh(cyl(0.12, 0.12, 1.3, 6, 1), M.char);
    log.rotation.set(0, ry, Math.PI / 2, 'YXZ');
    deco(log, campPos.x, 0.14, campPos.z);
  });
  hidden(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 10), campPos.x, 0.3, campPos.z);
  makeFire(campPos.x, 0.05, campPos.z, 1.0, 30, 6);
  {
    const bedroll = place(new THREE.Mesh(box(0.85, 0.14, 1.9, 1), M.clothRed), 2.5, 0.07, -80.4);
    bedroll.rotation.y = 0.5;
    S.add(bedroll);
  }

  function tent(x, z, ry, mat, w = 2.4, len = 2.8, h = 1.8) {
    const g = new THREE.Group();
    g.position.set(x, aeth.H(x, z), z);
    g.rotation.y = ry;
    S.add(g);
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
  }
  tent(-9.5, -70, 0.9, M.clothOchre);
  tent(9, -69.5, -0.8, M.clothBlue);
  tent(-12.5, -76, 1.4, M.clothRed);
  tent(11.5, -78.5, -1.5, M.clothOchre);

  // Vanes smedja
  const forge = new THREE.Vector3(-17, aeth.H(-17, -71), -71);
  solid(place(new THREE.Mesh(box(2.2, 1.6, 1.9), M.brick), forge.x, forge.y + 0.8, forge.z));
  solid(place(new THREE.Mesh(box(0.8, 2.6, 0.8), M.brick), forge.x - 0.5, forge.y + 2.6, forge.z - 0.4));
  {
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), M.glow);
    mouth.rotation.y = Math.PI / 2;
    scene.add(place(mouth, forge.x + 1.11, forge.y + 0.75, forge.z));
  }
  const forgeFire = makeFire(forge.x - 0.5, forge.y + 3.6, forge.z - 0.4, 0.5, 0, 6);
  forgeFire.noFlames = true;
  forgeFire.level = 0.35;
  lights.add({ x: forge.x + 1.6, y: forge.y + 0.9, z: forge.z, color: 0xff7a2a, power: 20, range: 9, flicker: 0.6 });
  const anvil = new THREE.Vector3(-14.6, aeth.H(-14.6, -70.3), -70.3);
  solid(place(new THREE.Mesh(box(0.45, 0.5, 0.35, 1), M.iron), anvil.x, anvil.y + 0.25, anvil.z));
  solid(place(new THREE.Mesh(box(0.9, 0.22, 0.34, 1), M.iron), anvil.x, anvil.y + 0.6, anvil.z));
  deco(new THREE.Mesh(cyl(0.38, 0.4, 0.8, 8, 1), M.wood), forge.x + 0.6, forge.y + 0.4, forge.z + 1.6);

  // Lyras arkiv: en mur med inristade tavlor, ett läspulpet och ljus
  const archive = new THREE.Vector3(16.5, aeth.H(16.5, -73), -73);
  {
    const wall = place(new THREE.Mesh(box(5, 3.2, 0.8), M.brick), archive.x, archive.y + 1.4, archive.z);
    wall.rotation.y = -0.5;
    solid(wall);
    [-1.4, 0, 1.4].forEach((o, i) => {
      const tab = new THREE.Mesh(box(1.1, 1.3, 0.12, 1.2), M.runes);
      tab.position.set(o, 0.2 + (i % 2) * 0.3, 0.45);
      wall.add(tab);
    });
    const lect = place(new THREE.Mesh(box(0.7, 1.0, 0.5, 1), M.wood), archive.x - 1.9, archive.y + 0.5, archive.z + 2.4);
    lect.rotation.y = -0.5;
    solid(lect);
    const book = new THREE.Mesh(box(0.6, 0.06, 0.42, 1), M.linen);
    book.position.set(0, 0.55, 0);
    book.rotation.x = -0.3;
    lect.add(book);
    for (let i = 0; i < 6; i++) {
      const sc = new THREE.Mesh(cyl(0.07, 0.07, 0.55, 6, 1), M.linen);
      sc.rotation.set(0, i * 0.4, Math.PI / 2, 'YXZ');
      deco(sc, archive.x - 0.4 + (i % 3) * 0.18, archive.y + 0.08 + Math.floor(i / 3) * 0.13, archive.z + 1.0);
    }
    for (let i = 0; i < 3; i++) {
      deco(new THREE.Mesh(cyl(0.05, 0.05, 0.25 + i * 0.08, 6, 1), M.linen), archive.x + 0.5 + i * 0.16, archive.y + 0.13, archive.z + 1.0);
      deco(new THREE.Mesh(box(0.04, 0.07, 0.04, 1), M.lamp), archive.x + 0.5 + i * 0.16, archive.y + 0.32 + i * 0.08, archive.z + 1.0);
    }
    lights.add({ x: archive.x + 0.6, y: archive.y + 0.9, z: archive.z + 1.2, color: 0xffc47a, power: 6, range: 7, flicker: 0.5 });
  }

  // Britsen där Maren vilar (om hon räddas) och graven (om hon inte gör det)
  const cotPos = new THREE.Vector3(10.6, aeth.H(10.6, -75.2), -75.2);
  {
    const cot = place(new THREE.Mesh(box(0.95, 0.45, 2.0, 1), M.wood), cotPos.x, cotPos.y + 0.22, cotPos.z);
    cot.rotation.y = 0.3;
    solid(cot);
    const blanket = new THREE.Mesh(box(0.9, 0.08, 1.3, 1), M.clothBlue);
    blanket.position.set(0, 0.26, 0.3);
    cot.add(blanket);
  }
  const grave = new THREE.Group();
  {
    grave.position.set(-7, aeth.H(-7, -67.5), -67.5);
    for (let i = 0; i < 7; i++) {
      const r = new THREE.Mesh(rockGeo(0.22 + (i % 3) * 0.06, 400 + i, 0.8), M.rock);
      r.position.set((i % 3 - 1) * 0.32, 0.12 + Math.floor(i / 3) * 0.18, (Math.floor(i / 3) - 1) * 0.25);
      grave.add(r);
    }
    grave.add(place(new THREE.Mesh(box(0.1, 1.0, 0.1, 1), M.wood), 0, 0.5, -0.55));
    grave.add(place(new THREE.Mesh(box(0.5, 0.1, 0.08, 1), M.wood), 0, 0.78, -0.55));
    scene.add(grave);
    grave.visible = false;
  }

  // Valvet vid brons slut och lyktor
  [-1, 1].forEach((sx) => solid(place(new THREE.Mesh(cyl(0.45, 0.5, 3.6, 10), M.marble), sx * 2.3, 1.8, -51)));
  solid(place(new THREE.Mesh(box(5.6, 0.6, 1.1, 1.5), M.marble), 0, 3.9, -51));
  [[-4, -57], [4, -57], [-7.5, -84], [7.5, -84], [-3, -100], [3, -100]].forEach(([x, z]) => {
    const y = aeth.H(x, z);
    solid(place(new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.wood), x, y + 1.1, z));
    deco(new THREE.Mesh(box(0.3, 0.32, 0.3, 1), M.lamp), x, y + 2.3, z);
  });

  // Stormporten norr om Aetheria: en obelisk som Lyra kan väcka
  const northStone = new THREE.Vector3(0, aeth.H(0, -103.5), -103.5);
  const northRunes = new THREE.MeshBasicMaterial({ color: 0x2a3440 });
  {
    solid(place(new THREE.Mesh(box(1.4, 6.4, 1.4, 2), M.obsidian), northStone.x - 2.4, northStone.y + 3.2, northStone.z));
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.6), northRunes);
      r.position.set(northStone.x - 1.68, northStone.y + 1.4 + i * 1.2, northStone.z);
      scene.add(r);
    }
    solid(place(new THREE.Mesh(box(1.2, 4.2, 1.2, 2), M.obsidian), northStone.x + 2.4, northStone.y + 2.1, northStone.z));
  }

  // ---------- Stenvägar som reser sig ----------
  const northStones = [];
  for (let i = 0; i < 12; i++) northStones.push({ x: (hash2(i, 3) - 0.5) * 0.5, z: -109.5 - i * 2.9 });
  const eastStones = [];
  for (let i = 0; i < 8; i++) eastStones.push({ x: 74.5 + i * 2.9, z: (hash2(i, 7) - 0.5) * 0.5 });
  const paths = { north: new StonePath(scene, northStones, M), east: new StonePath(scene, eastStones, M) };
  updaters.push((t, dt) => { paths.north.update(dt); paths.east.update(dt); });

  // ---------- The Tempest Bastion ----------
  const bastion = new Bastion({ scene, S, M, tex, solid, hidden, collision, lights, makeFire, rand, island, flameMat, flameMat2 });

  // ---------- Svävande bråte ----------
  // Några få former delas av alla bitar och ritas instansierat (en ritning per form)
  const chunkGeos = [0, 1, 2, 3].map((k) => ({ geo: rockGeo(1, 200 + k, 0.8), mat: M.rock, list: [] }))
    .concat([0, 1].map((k) => ({ geo: breakTop(cyl(0.6, 0.6, 1.4, 8), 1.4, 0.35 + k * 0.1), mat: M.marble, list: [] })));
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2, d = 45 + rand() * 110;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 40;
    if (Math.abs(x) < 16 && z > -250 && z < 115) continue;
    if (Math.abs(z) < 14 && x > 20 && x < 115) continue;
    if (Math.hypot(x - 60, z) < 22 || Math.hypot(x, z + 190) < 55) continue;
    const isDrum = rand() < 0.25;
    const s = 1.2 + rand() * 3.4;
    const kind = chunkGeos[isDrum ? 4 + (i % 2) : i % 4];
    kind.list.push({
      pos: new THREE.Vector3(x, -14 + rand() * 34, z), rot: new THREE.Euler(rand() * 3, rand() * 3, rand() * 3), s,
      sp: 0.3 + rand() * 0.5, p: rand() * 6, amp: 0.3 + rand() * 1.0, rs: (rand() - 0.5) * 0.15,
    });
  }
  const chunkMeshes = chunkGeos.filter((k) => k.list.length).map((k) => {
    const im = new THREE.InstancedMesh(k.geo, k.mat, k.list.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    scene.add(im);
    return { im, list: k.list };
  });
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    updaters.push((t) => {
      for (const { im, list } of chunkMeshes) {
        list.forEach((c, i) => {
          p.copy(c.pos).y += Math.sin(t * c.sp + c.p) * c.amp;
          e.set(c.rot.x, c.rot.y + t * c.rs, c.rot.z);
          m4.compose(p, q.setFromEuler(e), sc.setScalar(c.s));
          im.setMatrixAt(i, m4);
        });
        im.instanceMatrix.needsUpdate = true;
      }
    });
  }

  // ---------- Grästuvor (en enda instansierad mesh) ----------
  {
    const w = 0.38, hgt = 0.55;
    const pos = [-w, 0, 0, w, 0, 0, w, hgt, 0, -w, hgt, 0, 0, 0, -w, 0, 0, w, 0, hgt, w, 0, hgt, -w];
    const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
    const nrm = new Array(24).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    // Båda sidor ritas som framsidor med normal uppåt, så tuvorna ljussätts som marken
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
    const count = tuftPositions.length / 5;
    const tufts = new THREE.InstancedMesh(g, M.tuft, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const [x, y, z, ry, s] = tuftPositions.slice(i * 5, i * 5 + 5);
      q.setFromAxisAngle(up, ry);
      m4.compose(new THREE.Vector3(x, y - 0.05, z), q, new THREE.Vector3(s, s, s));
      tufts.setMatrixAt(i, m4);
    }
    scene.add(tufts);
  }

  const baked = bake(S);

  // ---------- Platser som berättelsen behöver ----------
  const V = (x, z, isl = main) => new THREE.Vector3(x, isl.H(x, z), z);
  const enemySpots = [
    { home: V(-3, -11), path: [V(-6, -11.5), V(4, -11.5), V(3, -10)] },
    { home: V(13, 3), path: [V(12, 0), V(16.5, 3.5), V(13, -3.5)] },
    { home: V(-18, 5), path: [V(-19, 2.5), V(-16.5, 9.5), V(-17, 5)] },
    { home: V(55, 3, east), path: [V(54, -2, east), V(57, 5, east)] },
    { home: V(14, -22), path: [V(10, -24), V(18, -20)] },
  ];

  const aetheria = {
    center: new THREE.Vector3(0, 0, AZ),
    radius: 30,
    camp: campPos,
    spawn: new THREE.Vector3(0, aeth.H(0, -75.4), -75.4),
    spawnFacing: Math.PI,
    gate: new THREE.Vector3(0, 0.1, -50),
    northStone,
    lyraRead: new THREE.Vector3(0.6, aeth.H(0.6, -101.2), -101.2),
    npcs: {
      lyra: { pos: new THREE.Vector3(14.2, aeth.H(14.2, -70.4), -70.4), face: -2.6 },
      vane: { pos: new THREE.Vector3(-13.9, aeth.H(-13.9, -69.4), -69.4), face: -2.2 },
      edda: { pos: new THREE.Vector3(-2.9, 0, -80.6), face: 1.15 },
      ilo: { pos: new THREE.Vector3(3, 0, -75), face: 0 },
      bram: { pos: new THREE.Vector3(2.2, aeth.H(2.2, -55), -55), face: 0.2 },
      kaelCot: { pos: new THREE.Vector3(9.4, aeth.H(9.4, -74.4), -74.4), face: 2.2 },
      kaelGrave: { pos: new THREE.Vector3(-6.2, aeth.H(-6.2, -66.6), -66.6), face: -2.5 },
      maren: { pos: cotPos.clone().setY(cotPos.y + 0.5), face: 0.3 },
    },
    grave,
  };

  const world = {
    collision,
    enemySpots,
    // Spelet börjar på startön söder om byn
    spawn: V(0, 99.5, start),
    spawnFacing: Math.PI,
    village: { center: new THREE.Vector3(0, 0, 0), gateZ: 33.5, midZ: 55.5, revive: V(0, 22) },
    intro: { vantage: new THREE.Vector3(7, 9.5, 37), look: new THREE.Vector3(-6, 1.5, 9) },
    aetheria,
    // Där Cello börjar om i fästningen (efter att ha dött, eller när spelet laddas där)
    bastionEntrance: new THREE.Vector3(0, 0, -146),
    prologue: {
      refugee: V(4.6, 12.4),
      titanHome: V(-16.5, 9),
    },
    east: { plate: eastPlate, stone: eastStone.position.clone(), end: new THREE.Vector3(100, cape.H(100, 0), 0) },
    paths,
    bastion,
    fires,
    villageFires,
    baked,
    // Sant om punkten ligger i Aetheria eller på broarna dit (byns asklingar går aldrig dit)
    isSafe: (x, z) => Math.hypot(x, z - AZ) < 33 || (Math.abs(x) < 3 && (z < -27 || z > 29)),
    inAetheria: (x, z) => Math.hypot(x, z - AZ) < 32,
    inBastion: (x, z) => x > -44 && x < 44 && z < -142 && z > -240,
    inVillage: (x, z) => Math.hypot(x, z) < 36,
    connect(collider) {
      paths.north.connect(collider);
      paths.east.connect(collider);
      bastion.connect(collider);
    },
    // Hammarslag på östöns kopparplatta väcker stormstenen
    slamEast(point) {
      return Math.hypot(point.x - eastPlate.x, point.z - eastPlate.z) < 1.9;
    },
    lightEast(on) {
      eastRunes.color.set(on ? 0x7fdcff : 0x2a3440);
      eastPlateMat.emissive.set(on ? 0x2a6a88 : 0x000000);
    },
    lightNorth(on) {
      northRunes.color.set(on ? 0x7fdcff : 0x2a3440);
    },
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
  };
  return world;
}

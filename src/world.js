// Världen: flytande öar i en evig storm, uppdelad i områden.
//
// Resan norrut (x österut, z söderut, y uppåt). Varje område ligger på ett eget ställe i
// koordinatsystemet; vid gränserna tonar skärmen till svart och nästa område laddas.
//
//   Cellos hem (0, 100) → byn (0, 0) och Aetheria (0, -78) → Thistledown Ranch (x 1000)
//   → Galewind Pass och den långa bron (x 2000) → The Stormvale (x 3000)
//   → Willowmere (x 4000) i öster, Stormreach (x 5000) och Hollow Cave (x 6000) i norr
//   → The Tempest Bastion (0, -186)
//   Interiörer: Pells butik (x 7000) och Cellos hus (x 7100)
import * as THREE from 'three';
import { createBuilder, StonePath, DECK } from './build.js';
import { Areas } from './areas.js';
import { smooth, hash2, box, cyl, cylUV, breakTop, rockGeo, place } from './geom.js';
import { Bastion } from './bastion.js';
import { buildRanch } from './regions/ranch.js';
import { buildPass } from './regions/pass.js';
import { buildField } from './regions/field.js';
import { buildWillowmere } from './regions/willowmere.js';
import { buildStormreach } from './regions/stormreach.js';
import { buildInteriors } from './regions/interiors.js';

const AZ = -78; // Aetherias mittpunkt i z
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildWorld(scene, lights) {
  const areas = new Areas(scene, lights);
  const B = createBuilder(scene, lights);
  const { M, rand, solid, hidden, deco, island, makeFire, flameMat, flameMat2 } = B;
  const villageFires = [];

  // =====================================================================
  // Byn och Aetheria
  // =====================================================================
  const village = areas.create({
    id: 'village', name: 'Hollowbrook', sub: "Cello's village", card: false,
    fog: { color: 0x323843, near: 34, far: 260 },
  });
  B.begin(village);
  B.bounds(-45, 75, -136, 66);

  // Cellos by – den stora ön i mitten
  const housePads = [[8.5, 15.5], [-8.5, 15], [16, 20], [-17, 19], [21, 7], [-23, -1], [5, 25]];
  const main = island({
    cx: 0, cz: 0, baseR: 33, rNoise: 3.5, seed: 1, amp: 0.7, keepAngles: [0, -Math.PI / 2, Math.PI / 2], depth: 28,
    rings: 44, segs: 112, label: 'Hollowbrook', mapCol: '#3b302a',
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

  // Mellanön söder om byn
  const mid = island({
    cx: 0, cz: 49, baseR: 6.6, rNoise: 1, seed: 13, amp: 0.25, keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 11,
    rings: 14, segs: 48, pads: [{ x: 0, z: 49, r: 6, h: 0.05 }], grass: 50,
    avoid: (x, z) => Math.abs(x) < 1.6,
  });

  // Östön: en liten ö med en kista
  const east = island({
    cx: 60, cz: 0, baseR: 13, rNoise: 1.8, seed: 5, amp: 0.35, keepAngles: [Math.PI], depth: 17,
    rings: 22, segs: 72, label: 'Eastern Isle',
    pads: [{ x: 48.5, z: 0, r: 4, h: 0.1 }, { x: 64, z: -3, r: 5, h: 0 }],
    grass: 140,
    avoid: (x, z) => Math.hypot(x - 64, z + 3) < 2.5 || (Math.abs(z) < 1.6 && x < 50),
  });

  // Avlägsna öar, bara kulisser
  const far = [
    [-120, 18, -150, 22], [175, -6, -80, 26], [80, 26, 175, 16], [-180, -12, 50, 24],
    [20, 44, -300, 30], [-95, 8, 160, 15], [190, 30, 120, 18], [-175, 22, -55, 18],
  ];
  far.forEach(([x, y, z, r], i) => {
    const isl = B.backdrop(x, z, r, y, 20 + i, { amp: 0.5, segs: 28 });
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = rand() * r * 0.6;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, ph = 4 + rand() * 8;
      const g = breakTop(cyl(0.9, 1.0, ph, 8), ph, rand() > 0.5 ? 1 : 0);
      deco(new THREE.Mesh(g, M.marble), px, isl.H(px, pz) + ph / 2, pz);
    }
  });
  // Cellos hem i söder syns som en ö bakom dimman
  {
    const hb = B.backdrop(0, 100, 30, 0, 61, { rings: 8, segs: 40 });
    for (const [x, z, s] of [[-14, 112, 1.3], [12, 118, 1.2], [-20, 98, 1.1], [16, 100, 1.0], [2, 124, 1.3], [-8, 122, 1.1]]) B.pine(x, hb.H(x, z), z, s, false);
    deco(new THREE.Mesh(box(6, 3.2, 5, 2), M.plaster), -6, hb.H(-6, 106) + 1.4, 106);
    const r = new THREE.Mesh(box(6.6, 0.2, 3.6, 2), M.thatch);
    r.rotation.x = 0.62;
    deco(r, -6, hb.H(-6, 106) + 3.7, 107.2);
    const r2 = r.clone();
    r2.rotation.x = -0.62;
    deco(r2, -6, hb.H(-6, 106) + 3.7, 104.8);
  }

  // ---------- Platsen i byns mitt: helgedomen med eldfatet ----------
  const tiers = [[9.0, 0.22], [8.4, 0.44], [7.8, 0.66], [7.2, 0.88]];
  for (const [r, topY] of tiers) {
    const h = topY + 0.6;
    deco(new THREE.Mesh(cyl(r, r, h, 40, 2.5), M.marble), 0, topY - h / 2, 0);
  }
  const PLAT = 0.88;
  hidden(new THREE.CylinderGeometry(7.2, 9.25, PLAT, 40, 1, true), 0, PLAT / 2, 0);
  hidden(new THREE.CircleGeometry(7.25, 40), 0, PLAT, 0, -Math.PI / 2);
  solid(place(new THREE.Mesh(cyl(0.55, 0.7, 0.9, 8, 1.5), M.marble), 0, PLAT + 0.45, 0));
  deco(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.5, 0.45, 8), M.iron), 0, PLAT + 1.12, 0);
  hidden(new THREE.CylinderGeometry(0.95, 0.95, 1.4, 8), 0, PLAT + 0.7, 0);
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.32 - i * 0.04, 1.0 - i * 0.12, 5), i % 2 ? flameMat2 : flameMat);
    const a = i * 1.7;
    f.position.set(Math.cos(a) * 0.22 * (i > 0), PLAT + 1.65, Math.sin(a) * 0.22 * (i > 0));
    B.add(f);
    flames.push(f);
  }
  lights.add({ x: 0, y: PLAT + 2.2, z: 0, color: 0xff8a3a, power: 34, range: 18 });
  village.updaters.push((t) => {
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
      if (rr < 0.01 || z > 4.0) continue;
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
    B.add(place(cap, plat.x, plat.top + 0.01, plat.z));
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
    village.S.add(sword);
    solid(blade, sword);
    solid(guard, sword);
  }
  {
    const h = 2.4;
    solid(place(new THREE.Mesh(breakTop(cyl(0.5, 0.58, h, 10), h, 0.6), M.marble), plat.x - 2.2, plat.top + h / 2, plat.z + 0.6));
  }

  // ---------- Broar ----------
  B.bridge('x', 32.3, 39.6, 0); // den trasiga bron österut
  B.bridge('x', 41.7, 47.6, 0);
  B.bridge('z', -48.6, -32.3, 0); // till Aetheria
  B.bridge('z', 32.3, 43.3, 0); // söderut mot mellanön
  B.bridge('z', 54.7, 66.5, 0); // och vidare in i dimman mot Cellos hem
  B.mist(0, -3, 64.5, 9, 5, 8);
  deco(new THREE.Mesh(breakTop(cyl(1.0, 0.7, 9, 8, 2), 9, 0.4), M.marble), 0, DECK - 4.8, -40.4);
  {
    // Plankor som dinglar vid hålet i den östra bron
    const g = new THREE.Group();
    [[39.7, -1.25, 0.3], [41.6, 1.35, -0.4], [39.9, -0.9, -0.6]].forEach(([x, rz, dz]) => {
      const p = new THREE.Mesh(box(0.4, 0.12, 1.05, 1), M.wood);
      p.position.set(x + (rz < 0 ? 0.15 : -0.15), DECK - 0.75, dz);
      p.rotation.set(0.2 * dz, 0.3 * dz, rz);
      g.add(p);
    });
    village.S.add(g);
  }

  // ---------- Cellos by: brända och brinnande hus ----------
  function houseGroup(x, z, ry) {
    return B.groupAt(x, main.H(x, z), z, ry);
  }
  const at = (g, lx, ly, lz) => g.localToWorld(V3(lx, ly, lz));
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
    village.S.add(beam);
    const sign = place(new THREE.Mesh(box(1.4, 0.7, 0.08, 1), M.wood), -1.2, 0.25, 31.2);
    sign.rotation.set(-1.3, 0.4, 0.2);
    village.S.add(sign);
  }
  // Brunn, staket, tunnor och lådor
  {
    const wy = main.H(-5, 22);
    solid(place(new THREE.Mesh(cyl(1.0, 1.05, 0.9, 10, 1.2), M.rock), -5, wy + 0.45, 22));
    deco(new THREE.Mesh(new THREE.CircleGeometry(0.8, 10).rotateX(-Math.PI / 2), M.obsidian), -5, wy + 0.88, 22);
    [-0.9, 0.9].forEach((o) => deco(new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.char), -5 + o, wy + 1.1, 22));
    const top = place(new THREE.Mesh(box(2.2, 0.12, 0.9, 1), M.char), -5, wy + 2.2, 22);
    top.rotation.z = 0.25;
    village.S.add(top);
  }
  function charFence(x0, z0, x1, z1, broken) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) {
      if (broken.includes(i)) continue;
      const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
      const post = place(new THREE.Mesh(box(0.14, 1.0, 0.14, 1), M.char), x, main.H(x, z) + 0.5, z);
      post.rotation.z = (hash2(x, z) - 0.5) * 0.4;
      village.S.add(post);
      if (i < n && !broken.includes(i + 1)) {
        const rail = place(new THREE.Mesh(box(len / n, 0.1, 0.06, 1), M.char), (x + x0 + ((x1 - x0) * (i + 1)) / n) / 2, main.H(x, z) + 0.7, (z + z0 + ((z1 - z0) * (i + 1)) / n) / 2);
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        village.S.add(rail);
      }
    }
  }
  charFence(11, 24, 19, 26, [2]);
  charFence(-12, 11, -14, 5, [1]);
  charFence(24, 2, 26, 12, [3, 4]);
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
  // Krukor vid tunnor och lådor
  for (const [x, z] of [[11.2, 13.9], [-12.2, 16.4], [8.6, 27.4], [-19.4, 5.6], [14.6, 15.4]]) B.pot(x, main.H(x, z), z, 0.9);

  // ---------- Mellanön: en välta kärra och ett brinnande träd ----------
  {
    const y = mid.H(2, 49);
    const cart = new THREE.Group();
    cart.position.set(2.3, y, 48.5);
    cart.rotation.set(0, 0.6, 1.25);
    village.S.add(cart);
    solid(place(new THREE.Mesh(box(2.2, 0.15, 1.3, 1), M.wood), 0, 0.5, 0), cart);
    [-0.6, 0.6].forEach((z) => cart.add(place(new THREE.Mesh(box(2.2, 0.5, 0.1, 1), M.wood), 0, 0.8, z)));
    const wheel = place(new THREE.Mesh(cyl(0.55, 0.55, 0.12, 10, 1), M.wood), -0.7, 0.55, 0.75);
    wheel.rotation.x = Math.PI / 2;
    cart.add(wheel);
    const loose = place(new THREE.Mesh(cyl(0.55, 0.55, 0.12, 10, 1), M.wood), -1.3, y + 0.07, 51.5);
    village.S.add(loose);
    for (let i = 0; i < 4; i++) deco(new THREE.Mesh(rockGeo(0.28, 700 + i, 0.6), M.sack), 0.6 + i * 0.5, y + 0.15, 47 + (i % 2) * 0.6);
    const ty = mid.H(-3.4, 50.6);
    const trunk = place(new THREE.Mesh(cyl(0.22, 0.32, 3.4, 7, 1), M.char), -3.4, ty + 1.7, 50.6);
    trunk.rotation.z = 0.15;
    solid(trunk);
    [[0.5, 0.6], [-0.4, 1.9]].forEach(([r, h], i) => {
      const br = place(new THREE.Mesh(cyl(0.08, 0.12, 1.6, 5, 1), M.char), -3.4 + (i ? -0.5 : 0.5), ty + 2.4 + h * 0.3, 50.6);
      br.rotation.z = r * 2;
      village.S.add(br);
    });
    villageFires.push(makeFire(-3.3, ty + 3.1, 50.6, 0.9, 18, 5));
  }

  // ---------- Östön: en gammal kista och några krukor ----------
  {
    const y = east.H(64, -3);
    B.chest('eastIsle', 64, y, -3, -Math.PI / 2, { shards: 20 });
    for (const [x, z] of [[58, 4], [59.5, 5.2], [67, 3]]) B.pot(x, east.H(x, z), z);
    B.rock(68, east.H(68, -7), -7, 1.4, 77);
    B.rock(55, east.H(55, -6), -6, 1.1, 78);
    const h = 3.0;
    solid(place(new THREE.Mesh(breakTop(cyl(0.6, 0.7, h, 10), h, 0.8), M.marble), 66.5, y + h / 2, 1.5));
  }

  // ---------- Aetheria ----------
  const aeth = island({
    cx: 0, cz: AZ, baseR: 30, rNoise: 2.8, seed: 9, amp: 0.45, keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 32,
    rings: 40, segs: 104, label: 'Aetheria',
    pads: [{ x: 0, z: -80, r: 22, h: 0 }, { x: 0, z: -49.5, r: 4.5, h: 0.1 }, { x: 0, z: -106.5, r: 4.5, h: 0.1 }],
    grass: 340,
    avoid: (x, z) => Math.hypot(x, z + 80) < 16.5 || (Math.abs(x) < 1.8 && (z > -56 || z < -100))
      || Math.hypot(x + 16, z + 71) < 4 || Math.hypot(x - 15, z + 72) < 3.5 || Math.hypot(x, z + 103.5) < 2.5,
  });
  const T = V3(0, 0, -80); // orkesterns mitt
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
    if (i === 5) solid(m); else village.S.add(m);
  }
  {
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
  const campPos = V3(0, 0, -79);
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
    village.S.add(bedroll);
  }
  const tentAt = (x, z, ry, mat) => B.tent(x, aeth.H(x, z), z, ry, mat);
  tentAt(-9.5, -70, 0.9, M.clothOchre);
  tentAt(9, -69.5, -0.8, M.clothBlue);
  tentAt(-12.5, -76, 1.4, M.clothRed);
  tentAt(11.5, -78.5, -1.5, M.clothOchre);

  // Vanes smedja
  const forge = V3(-17, aeth.H(-17, -71), -71);
  solid(place(new THREE.Mesh(box(2.2, 1.6, 1.9), M.brick), forge.x, forge.y + 0.8, forge.z));
  solid(place(new THREE.Mesh(box(0.8, 2.6, 0.8), M.brick), forge.x - 0.5, forge.y + 2.6, forge.z - 0.4));
  {
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), M.glow);
    mouth.rotation.y = Math.PI / 2;
    B.add(place(mouth, forge.x + 1.11, forge.y + 0.75, forge.z));
  }
  const forgeFire = makeFire(forge.x - 0.5, forge.y + 3.6, forge.z - 0.4, 0.5, 0, 6);
  forgeFire.noFlames = true;
  forgeFire.level = 0.35;
  lights.add({ x: forge.x + 1.6, y: forge.y + 0.9, z: forge.z, color: 0xff7a2a, power: 20, range: 9, flicker: 0.6 });
  const anvil = V3(-14.6, aeth.H(-14.6, -70.3), -70.3);
  solid(place(new THREE.Mesh(box(0.45, 0.5, 0.35, 1), M.iron), anvil.x, anvil.y + 0.25, anvil.z));
  solid(place(new THREE.Mesh(box(0.9, 0.22, 0.34, 1), M.iron), anvil.x, anvil.y + 0.6, anvil.z));
  deco(new THREE.Mesh(cyl(0.38, 0.4, 0.8, 8, 1), M.wood), forge.x + 0.6, forge.y + 0.4, forge.z + 1.6);
  // Vanes svärdsställ (han smider nya svärd)
  {
    const g = B.groupAt(-18.4, aeth.H(-18.4, -68.4), -68.4, 0.9);
    B.put(g, new THREE.Mesh(box(1.4, 0.12, 0.3, 1), M.wood), 0, 0.5, 0, true);
    B.put(g, new THREE.Mesh(box(1.4, 0.12, 0.3, 1), M.wood), 0, 1.2, -0.05);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(box(0.06, 1.1, 0.12, 1), B.M.marble);
      s.rotation.z = 0.08;
      B.put(g, s, -0.45 + i * 0.45, 1.0, 0.1);
    }
  }

  // Lyras arkiv
  const archive = V3(16.5, aeth.H(16.5, -73), -73);
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

  // Britsen och graven
  const cotPos = V3(10.6, aeth.H(10.6, -75.2), -75.2);
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
    B.add(grave);
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

  // Stormporten norr om Aetheria
  const northStone = V3(0, aeth.H(0, -103.5), -103.5);
  const northRunes = new THREE.MeshBasicMaterial({ color: 0x2a3440 });
  {
    solid(place(new THREE.Mesh(box(1.4, 6.4, 1.4, 2), M.obsidian), northStone.x - 2.4, northStone.y + 3.2, northStone.z));
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.6), northRunes);
      r.position.set(northStone.x - 1.68, northStone.y + 1.4 + i * 1.2, northStone.z);
      B.add(r);
    }
    solid(place(new THREE.Mesh(box(1.2, 4.2, 1.2, 2), M.obsidian), northStone.x + 2.4, northStone.y + 2.1, northStone.z));
  }

  // Stenvägen norrut (reser sig när Lyra väcker porten) och dimman där den försvinner
  const northStones = [];
  for (let i = 0; i < 9; i++) northStones.push({ x: (hash2(i, 3) - 0.5) * 0.5, z: -109.5 - i * 2.9 });
  const paths = { north: new StonePath(village.root, northStones, M) };
  village.updaters.push((t, dt) => paths.north.update(dt));
  village.connectFns.push((c) => paths.north.connect(c));
  B.mist(0, -2, -136.5, 10, 5, 8);
  village.map.lines.push({ pts: [[0, -108], [0, -133]], kind: 'stones', when: 'northPath' });

  // ---------- Svävande bråte ----------
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
      pos: V3(x, -14 + rand() * 34, z), rot: new THREE.Euler(rand() * 3, rand() * 3, rand() * 3), s,
      sp: 0.3 + rand() * 0.5, p: rand() * 6, amp: 0.3 + rand() * 1.0, rs: (rand() - 0.5) * 0.15,
    });
  }
  const chunkMeshes = chunkGeos.filter((k) => k.list.length).map((k) => {
    const im = new THREE.InstancedMesh(k.geo, k.mat, k.list.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    B.add(im);
    return { im, list: k.list };
  });
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    village.updaters.push((t) => {
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

  // Fiender i byn
  const V = (x, z, isl = main) => V3(x, isl.H(x, z), z);
  [
    { home: V(-3, -11), path: [V(-6, -11.5), V(4, -11.5), V(3, -10)] },
    { home: V(13, 3), path: [V(12, 0), V(16.5, 3.5), V(13, -3.5)] },
    { home: V(-18, 5), path: [V(-19, 2.5), V(-16.5, 9.5), V(-17, 5)] },
    { home: V(55, 3, east), path: [V(54, -2, east), V(57, 5, east)] },
    { home: V(14, -22), path: [V(10, -24), V(18, -20)] },
  ].forEach((s) => B.enemy(s.home, s.path));

  village.entries = {
    south: { pos: V3(0, DECK, 61.2), facing: Math.PI },
    north: { pos: V3(0, 0, -129.5), facing: 0 },
    aetheria: { pos: V3(0, aeth.H(0, -75.4), -75.4), facing: Math.PI },
  };
  village.exits = [
    { x0: -3, x1: 3, z0: 62.8, z1: 70, to: 'home', entry: 'north', label: "Cello's Home" },
    { x0: -3, x1: 3, z0: -150, z1: -131.6, to: 'ranch', entry: 'south', label: 'Thistledown Ranch' },
  ];
  village.map.pois.push({ x: 0, z: -79, label: 'Rest', icon: 'fire' });
  village.map.exits = [{ x: 0, z: 66, label: "Cello's Home", to: 'home' }, { x: 0, z: -134, label: 'Thistledown Ranch', to: 'ranch', when: 'northPath' }];
  B.end();

  // =====================================================================
  // Cellos hem: huset vid skogsbrynet, trädgården och lägerplatsen
  // =====================================================================
  const home = areas.create({
    id: 'home', name: "Cello's Home", sub: 'At the edge of the forest', card: false,
    fog: { color: 0x323843, near: 34, far: 240 },
  });
  B.begin(home);
  B.bounds(-36, 36, 52, 134);
  const pathPts = [[0, 71], [-1, 78], [-3.5, 86], [-5, 94], [-6, 100.5]];
  const homeIsl = island({
    cx: 0, cz: 100, baseR: 30, rNoise: 3, seed: 17, amp: 0.55, keepAngles: [-Math.PI / 2], depth: 26,
    rings: 36, segs: 96, label: "Cello's Home",
    pads: [{ x: 0, z: 71, r: 4, h: 0.1 }, { x: -6, z: 106, r: 7, h: 0.15 }, { x: 7, z: 108, r: 6, h: 0.05 }, { x: -15, z: 90, r: 5, h: 0 }],
    roads: [{ pts: pathPts, w: 2.2 }],
    dips: [{ x: 13, z: 121, r: 6, depth: 0.7 }],
    grass: 420,
    avoid: (x, z) => Math.hypot(x + 6, z - 106) < 5 || (x > 2.5 && x < 11.5 && z > 104.5 && z < 111.5) || Math.hypot(x - 13, z - 121) < 5,
  });
  const HH = homeIsl.H;
  B.road(pathPts, 2.2, HH);
  B.bridge('z', 56.5, 71, 0);
  B.mist(0, -3, 57.5, 9, 5, 8);
  // Byn i norr syns som en ö där röken stiger
  {
    const vb = B.backdrop(0, 0, 33, 0, 1, { rings: 10, segs: 48 });
    B.backdrop(0, 49, 6.6, 0, 13, { rings: 4, segs: 20 });
    for (const [x, z, ry] of [[8.5, 15.5, -0.4], [-8.5, 15, 0.5], [21, 7, 1.2], [-17, 19, -0.6], [5, 25, 0.1], [16, 20, 0.3]]) {
      const m = new THREE.Mesh(box(4.2, 2.2, 3.4, 2), M.char);
      m.rotation.y = ry;
      deco(m, x, vb.H(x, z) + 1.0, z);
    }
    for (const [x, z] of [[-17, 19], [5, 25], [16, 20]]) {
      const f = makeFire(x, vb.H(x, z) + 3.5, z, 2.6, 0, 9, 14);
      f.noFlames = true;
      villageFires.push(f);
    }
  }
  // Huset
  const cottage = B.house(-6, HH(-6, 106), 106, Math.PI, {
    w: 6.2, d: 5.2, h: 2.7, wall: M.plaster, roof: M.thatch, shutter: M.clothRed, chimneyX: -0.3, label: 'Home',
  });
  // Trädgården: staket, pumpor, kål och en fågelskrämma
  B.fence([[2.5, 104.5], [11.5, 104.5], [11.5, 111.5], [2.5, 111.5], [2.5, 104.5]], HH, { gap: 1.5, skip: [1] });
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 1.5, z = 106 + row * 2;
      const y = HH(x, z);
      if (row === 1) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), M.pumpkin);
        p.scale.y = 0.7;
        deco(p, x, y + 0.18, z);
        deco(new THREE.Mesh(box(0.05, 0.14, 0.05, 1), M.leaf), x, y + 0.42, z);
      } else deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), M.cabbage), x, y + 0.2, z);
    }
  }
  {
    const y = HH(10, 110.5);
    deco(new THREE.Mesh(box(0.1, 1.9, 0.1, 1), M.woodDark), 10, y + 0.95, 110.5);
    deco(new THREE.Mesh(box(1.3, 0.1, 0.1, 1), M.woodDark), 10, y + 1.5, 110.5);
    deco(new THREE.Mesh(box(0.55, 0.7, 0.3, 1), M.clothBlue), 10, y + 1.3, 110.5);
    deco(new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), M.sack), 10, y + 1.85, 110.5);
    deco(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 6), M.hay), 10, y + 2.05, 110.5);
  }
  // Vedtrave, huggkubbe och en tvättlina
  {
    const x = -12, z = 103.5, y = HH(x, z);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      const log = new THREE.Mesh(cyl(0.16, 0.16, 1.6, 7, 1), M.bark);
      log.rotation.x = Math.PI / 2;
      deco(log, x + (i - 1.5 + r * 0.5) * 0.34, y + 0.17 + r * 0.3, z);
    }
    hidden(new THREE.BoxGeometry(1.5, 1.0, 1.7), x, y + 0.5, z);
    solid(place(new THREE.Mesh(cyl(0.34, 0.38, 0.5, 8, 1), M.bark), -11, y + 0.25, 100.2));
    const axe = new THREE.Mesh(box(0.06, 0.8, 0.06, 1), M.wood);
    axe.rotation.z = 0.5;
    deco(axe, -10.8, y + 0.75, 100.2);
    for (const px of [-1, 5]) deco(new THREE.Mesh(box(0.1, 2.0, 0.1, 1), M.woodDark), px, HH(px, 114) + 1.0, 114);
    deco(new THREE.Mesh(box(6, 0.02, 0.02, 1), M.rope), 2, HH(2, 114) + 1.85, 114);
    [[0.5, M.linen], [2.2, M.clothRed], [3.6, M.linen]].forEach(([dx, m]) => deco(new THREE.Mesh(box(0.8, 0.9, 0.03, 1), m), dx, HH(dx, 114) + 1.4, 114));
  }
  // Övningsdocka av halm (Cellos svärdsträning)
  const dummyPos = V3(6, HH(6, 95), 95); // dockan byggs i folk.js (den gungar när den blir slagen)
  // Lägerplatsen i skogsbrynet (där Cello sov i natt)
  {
    const y = HH(-15, 90);
    [[-16.4, 88.6], [-13.6, 88.6], [-16.4, 91.4], [-13.6, 91.4]].forEach(([x, z], i) => solid(place(new THREE.Mesh(box(0.16, i < 2 ? 2.2 : 1.1, 0.16, 1), M.wood), x, y + (i < 2 ? 1.1 : 0.55), z)));
    const roof = place(new THREE.Mesh(box(3.4, 0.12, 3.3, 1.2), M.thatch), -15, y + 1.7, 90);
    roof.rotation.x = -0.32;
    home.S.add(roof);
    B.campfire(-11.5, HH(-11.5, 92), 92, 18);
  }
  // Damm med vass
  B.water(13, HH(13, 121) + 0.35, 121, 4.6, 3.6);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, x = 13 + Math.cos(a) * 4.4, z = 121 + Math.sin(a) * 3.5;
    deco(new THREE.Mesh(box(0.05, 0.9, 0.05, 1), M.crop), x, HH(x, z) + 0.45, z);
  }
  // Skogen runt om
  for (const [x, z, s] of [[-9, 80, 1.2], [-12, 86, 1.0], [9, 80, 1.1], [14, 88, 1.3], [17, 98, 0.9], [-20, 97, 1.1], [-22, 110, 0.9], [19, 112, 1.0],
    [3, 125, 1.0], [-5, 125, 1.2], [-14, 120, 1.2], [21, 104, 1.1], [-24, 103, 1.3], [8, 86, 0.8], [-18, 82, 1.0]]) B.pine(x, HH(x, z), z, s);
  for (const [x, z, s] of [[3, 100, 1.1], [-14, 112, 1.2], [16, 94, 1.0]]) B.oak(x, HH(x, z), z, s);
  for (const [x, z] of [[-2, 112], [-10, 96], [5, 92], [12, 116], [-17, 116]]) B.bush(x, HH(x, z), z, 0.9);
  B.flowers(-3, HH(-3, 102), 102, 8, 1.3);
  B.flowers(1, HH(1, 108), 108, 6);
  B.rock(6, HH(6, 88), 88, 1.3, 740);
  B.rock(-20, HH(-20, 90), 90, 1.0, 741);
  for (const [x, z] of [[-3, 104.5], [-9.5, 104.8]]) B.pot(x, HH(x, z), z, 0.85);
  B.sign(2.2, HH(2.2, 74), 74, -0.3, ['"Hollowbrook — follow the bridge north."', 'Someone has added in small letters: "Cello, feed the goats! —M"'], { arrow: -1 });
  home.entries = {
    north: { pos: V3(0, DECK, 61.8), facing: 0 },
    start: { pos: V3(-5, HH(-5, 98.5), 98.5), facing: Math.PI },
    door: { pos: V3(cottage.door.x, cottage.door.y, cottage.door.z), facing: Math.PI },
  };
  home.exits = [{ x0: -3, x1: 3, z0: 40, z1: 59.6, to: 'village', entry: 'south', label: 'Hollowbrook' }];
  home.doors = [{ pos: cottage.door, to: 'house', entry: 'door', label: 'Enter the house' }];
  home.map.exits = [{ x: 0, z: 58, label: 'Hollowbrook', to: 'village' }];
  const homeAnimals = [0, 1].map((i) => ({ kind: 'goat', area: 'home', pos: V3(4 + i * 1.6, HH(4 + i * 1.6, 119), 119), center: V3(5, HH(5, 119.5), 119.5), radius: 2.6, H: HH }));
  B.end();

  // =====================================================================
  // The Tempest Bastion
  // =====================================================================
  const bastionArea = areas.create({
    id: 'bastion', name: 'The Tempest Bastion', sub: "Thor's burned fortress", card: false,
    fog: { color: 0x2c313b, near: 30, far: 220 },
  });
  B.begin(bastionArea);
  B.bounds(-44, 44, -240, -120);
  const bastion = new Bastion({
    scene: bastionArea.root, S: bastionArea.S, M, tex: B.tex, solid, hidden, collision: bastionArea.collision,
    lights, makeFire, rand, island, flameMat, flameMat2,
  });
  // Åskstegen: stenar från grottans mynning fram till förgården
  for (let i = 0; i < 6; i++) {
    const z = -127.5 - i * 2.9, x = (hash2(i, 9) - 0.5) * 0.4;
    solid(place(new THREE.Mesh(box(2.8, 0.9, 2.4, 1.6), M.rock), x, -0.45, z));
    deco(new THREE.Mesh(rockGeo(1.25, 520 + i, 1.4), M.rock), x, -1.6, z);
    deco(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.12), M.runeGlow), x, 0.01, z);
  }
  B.mist(0, -3, -124.5, 10, 5, 8);
  // Fiender, kistor och krukor i fästningen
  bastionArea.entries = {
    south: { pos: V3(0, 0, -130.5), facing: Math.PI },
    entrance: { pos: V3(0, 0, -146), facing: Math.PI },
  };
  bastionArea.exits = [{ x0: -3, x1: 3, z0: -127, z1: -110, to: 'cave', entry: 'north', label: 'The Hollow Cave' }];
  bastionArea.connectFns.push((c) => bastion.connect(c));
  bastionArea.updaters.push(() => {});
  {
    const P = (x, z, y = 0) => B.pot(x, y, z);
    [[7.6, -151.6], [-8.0, -157], [8.0, -166.6], [-27.6, -151.5], [-27.6, -166.6], [-12.4, -166.6],
      [-11.8, -176.5], [11.8, -176.5], [-11.8, -189], [11.8, -189], [-33.6, -184], [-16.4, -188.5],
      [34, -151.4], [34, -166.5], [16.4, -178], [33.6, -190.6], [13.6, -214], [-13.6, -214], [0, -227.6],
      [-10.5, -144.5], [10.5, -144.5]].forEach(([x, z]) => P(x, z));
    P(16.4, -177.5, -6);
    P(33.8, -177.6, -6);
  }
  B.end();

  // =====================================================================
  // Resten av världen
  // =====================================================================
  const ranch = buildRanch(B, areas);
  const pass = buildPass(B, areas);
  const field = buildField(B, areas);
  const willow = buildWillowmere(B, areas);
  const reach = buildStormreach(B, areas);
  const interiors = buildInteriors(B, areas);

  const world = {
    areas,
    builder: B,
    village: { center: V3(0, 0, 0), gateZ: 33.5, midZ: 55.5, revive: V(0, 22) },
    intro: { vantage: V3(7, 9.5, 37), look: V3(-6, 1.5, 9) },
    aetheria: {
      center: V3(0, 0, AZ),
      radius: 30,
      camp: campPos,
      spawn: V3(0, aeth.H(0, -75.4), -75.4),
      spawnFacing: Math.PI,
      gate: V3(0, 0.1, -50),
      northStone,
      lyraRead: V3(0.6, aeth.H(0.6, -101.2), -101.2),
      forge,
      npcs: {
        lyra: { pos: V3(14.2, aeth.H(14.2, -70.4), -70.4), face: -2.6 },
        vane: { pos: V3(-13.9, aeth.H(-13.9, -69.4), -69.4), face: -2.2 },
        edda: { pos: V3(-2.9, 0, -80.6), face: 1.15 },
        ilo: { pos: V3(3, 0, -75), face: 0 },
        bram: { pos: V3(2.2, aeth.H(2.2, -55), -55), face: 0.2 },
        kaelCot: { pos: V3(9.4, aeth.H(9.4, -74.4), -74.4), face: 2.2 },
        kaelGrave: { pos: V3(-6.2, aeth.H(-6.2, -66.6), -66.6), face: -2.5 },
        maren: { pos: cotPos.clone().setY(cotPos.y + 0.5), face: 0.3 },
      },
      grave,
    },
    home: { dummy: dummyPos, door: cottage.door, H: HH, animals: homeAnimals },
    bastionEntrance: V3(0, 0, -146),
    prologue: { refugee: V(4.6, 12.4), titanHome: V(-16.5, 9) },
    east: field.east,
    paths: { north: paths.north, east: field.eastPath },
    ranch, pass, field, willow, reach, interiors,
    bastion,
    fires: B.fires,
    villageFires,
    // Sant om punkten ligger där fiender inte får gå (Aetheria och broarna dit, eller ett fridfullt område)
    isSafe: (x, z) => {
      const a = areas.cur;
      if (a?.safe) return true;
      if (a?.id === 'village') return Math.hypot(x, z - AZ) < 33 || (Math.abs(x) < 3 && (z < -27 || z > 29));
      return a?.isSafe?.(x, z) ?? false;
    },
    inAetheria: (x, z) => areas.id === 'village' && Math.hypot(x, z - AZ) < 32,
    inBastion: () => areas.id === 'bastion',
    inVillage: (x, z) => areas.id === 'village' && Math.hypot(x, z) < 36,
    // Ett område laddas: delarna som beror på sparat läge (dörrar, lyktan i butiken)
    onEnterArea(id, state) {
      for (const r of [reach, interiors, field]) r?.onEnter?.(id, state);
    },
    // Ett eldfat har tänts
    onTorch(id, story) {
      for (const r of [reach, field]) if (r?.onTorch?.(id, story)) return true;
      return false;
    },
    connect(collider) {
      areas.collider = collider;
      for (const a of Object.values(areas.list)) {
        collider.building = a.id;
        for (const fn of a.connectFns) fn(collider);
      }
      collider.building = null;
    },
    slamEast: field.slamEast,
    lightEast: field.lightEast,
    lightNorth(on) {
      northRunes.color.set(on ? 0x7fdcff : 0x2a3440);
    },
    update(t, dt) {
      areas.update(t, dt);
    },
  };
  return world;
}

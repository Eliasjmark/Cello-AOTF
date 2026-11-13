// The Frostmarch (0.16): ett land av snö norr om The Galecrown. Renskötarbyn Rimeholt ligger i söder, en frusen sjö
// (blank is, Cello halkar) i väster, och i norr reser sig en glaciär med huvudet av en frusen jätte. Gapet är porten
// till Frostgiant's Maw. Utomhus är det kallt: utan lykta eller eld fryser Cello.
//
// Koordinater: x 26000 (FX). Bron från The Galecrown kommer in i söder.
//   Rimeholt:         (FX + 8, 120)  långhus, eld, fållan för renarna
//   Den frusna sjön:  (FX − 56, 36)  blank is, en fiskare infrusen mitt på (sidouppdrag)
//   Renarna:          tre som har sprungit bort (sidouppdrag)
//   Jättens gap:      (FX, −138)     porten till templet
//   Lokis röse:       en kista på en avsats bakom rimfrostgaller (masken behövs)
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const FX = 26000;

export function buildFrost(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'frost', name: 'The Frostmarch', sub: 'Where the giants sleep in the ice',
    fog: { color: 0xc8d4e0, near: 50, far: 340 },
    light: { hemi: 1.75, moon: 1.15, flash: 1.0, sky: 0xdce8f4, ground: 0x8a96a8, moonColor: 0xe8f0ff },
  });
  a.cold = true;
  a.waterFog = 0x2a4a5a;
  B.begin(a);
  B.bounds(FX - 230, FX + 230, -230, 240);
  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const FM = {
    wood: new THREE.MeshLambertMaterial({ map: M.wood.map, color: 0x7a5a42 }),
    woodDark: M.woodDark,
    roofSnow: mat(0xeef2f8),
    pine: mat(0x2a4a3a), snowCap: mat(0xf2f6fb),
    giant: new THREE.MeshLambertMaterial({ map: M.ice.map, color: 0x9ab8cc, flatShading: true }),
    giantDark: mat(0x5a7088),
    tooth: mat(0xe8eef4),
    fur: M.fur, furBrown: M.furBrown,
    rime: new THREE.MeshPhongMaterial({ color: 0xbfe8ff, emissive: 0x2a5a7a, specular: 0xffffff, shininess: 80, transparent: true, opacity: 0.85 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x9fe4ff }),
  };

  // ---------- ön ----------
  const VIL = { x: FX + 8, z: 120 };
  const LAKE = { x: FX - 56, z: 36, r: 30 };
  const MAW = { x: FX, z: -138 };
  const isl = B.island({
    cx: FX, cz: 0, baseR: 178, rNoise: 12, seed: 2601, amp: 1.0, hills: 6, hillFreq: 0.02,
    keepAngles: [Math.PI / 2], depth: 85, rings: 56, segs: 160, label: 'The Frostmarch', mapCol: '#8a9cb0',
    topMat: M.snow, grass: 0,
    pads: [
      { x: FX, z: 172, r: 8, h: 0 }, // brofästet
      { x: VIL.x, z: VIL.z, r: 30, h: 0.6 },
      { x: LAKE.x, z: LAKE.z, r: LAKE.r + 4, h: -0.4 },
      { x: MAW.x, z: MAW.z + 24, r: 18, h: 1.2 },
    ],
    tint: (x, z) => 0.9 + 0.1 * Math.sin(x * 0.04 + z * 0.03),
  });
  const H = isl.H;

  // Bron från The Galecrown (söder)
  B.bridge('z', 172, 202, FX, DECK, { rails: true });
  B.mist(FX, -3, 202, 11, 5, 9);
  a.entries = { south: { pos: V3(FX, DECK, 176), facing: Math.PI } };
  a.exits = [{ x0: FX - 3, x1: FX + 3, z0: 200, z1: 214, to: 'galecrown', entry: 'north' }];
  a.map.exits = [{ x: FX, z: 200, label: 'The Galecrown', to: 'galecrown' }];
  B.sign(FX + 3, H(FX + 3, 168), 168, Math.PI, ['A runestone, half buried in snow:', '"RIMEHOLT. Warm fires, warm furs, cold hearts."', '"Beyond the village the cold bites. Carry a light, stranger."']);

  // ---------- snötallar ----------
  const snowPine = (x, z, s = 1) => {
    const y = H(x, z);
    const trunk = new THREE.Mesh(cyl(0.18 * s, 0.26 * s, 1.6 * s, 6, 1), M.bark);
    B.solid(place(trunk, x, y + 0.8 * s, z));
    [[1.5, 1.8, 1.8], [1.15, 1.6, 2.9], [0.8, 1.4, 3.9]].forEach(([r, h, yy]) => {
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), FM.pine), x, y + yy * s, z);
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * s * 0.8, h * s * 0.45, 7), FM.snowCap), x, y + (yy + h * 0.28) * s, z);
    });
  };
  for (let k = 0; k < 150; k++) {
    const ang = rand() * Math.PI * 2, r = 30 + Math.sqrt(rand()) * 135;
    const x = FX + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (Math.hypot(x - VIL.x, z - VIL.z) < 34 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6 || Math.hypot(x - MAW.x, z - MAW.z) < 46 || Math.hypot(x - FX - 70, z - 70) < 16 || Math.abs(x - FX) < 6 && z > 120) continue;
    snowPine(x, z, 0.8 + rand() * 0.7);
  }
  for (let k = 0; k < 40; k++) {
    const ang = rand() * Math.PI * 2, r = 20 + rand() * 150;
    const x = FX + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (Math.hypot(x - VIL.x, z - VIL.z) < 30 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3 || Math.hypot(x - FX - 70, z - 70) < 14) continue;
    B.rock(x, H(x, z), z, 0.8 + rand() * 2, 2600 + k, true, M.rockTop);
  }

  // ---------- Rimeholt ----------
  const longhouse = (x, z, ry, len = 9) => {
    const y = H(x, z);
    B.house(x, y, z, ry, { w: 5.2, d: len, h: 2.6, wall: FM.wood, roof: FM.roofSnow, trim: FM.woodDark });
    B.chimneySmoke(x, y + 5.4, z, 3);
  };
  longhouse(VIL.x - 16, VIL.z - 6, 0.15);
  longhouse(VIL.x + 16, VIL.z - 10, -0.2, 8);
  longhouse(VIL.x - 6, VIL.z + 14, Math.PI / 2 + 0.1, 7);
  B.campfire(VIL.x, H(VIL.x, VIL.z), VIL.z, 26);
  a.rests = [{ pos: V3(VIL.x, H(VIL.x, VIL.z), VIL.z), entry: 'rest', label: 'Rest by the fire', prompt: 'The longfire of Rimeholt burns hot. Warm your hands and rest?', text: 'Cello rests by the longfire of Rimeholt...' }];
  a.entries.rest = { pos: V3(VIL.x + 1.4, H(VIL.x + 1.4, VIL.z + 1.6), VIL.z + 1.6), facing: 3.6 };
  a.warm.push({ x: VIL.x, z: VIL.z, r: 26 });
  a.map.pois.push({ x: VIL.x, z: VIL.z, label: 'Rimeholt', icon: 'fire' });
  B.lampPost(VIL.x + 6, H(VIL.x + 6, VIL.z + 6), VIL.z + 6, 9);
  B.lampPost(VIL.x - 8, H(VIL.x - 8, VIL.z - 14), VIL.z - 14, 9);
  for (const [x, z] of [[-4, 4], [5, -4], [-10, -16], [12, 3]]) B.barrel(VIL.x + x, H(VIL.x + x, VIL.z + z), VIL.z + z);
  for (let i = 0; i < 5; i++) B.pot(VIL.x - 20 + i * 1.1, H(VIL.x - 20 + i * 1.1, VIL.z + 4), VIL.z + 4, 0.9);
  // Fållan för renarna
  const PEN = { x: VIL.x + 22, z: VIL.z + 10 };
  const penPts = [];
  for (let k = 0; k <= 12; k++) {
    if (k === 6) { penPts.push(null); continue; }
    const ang = (k / 12) * Math.PI * 2;
    penPts.push([PEN.x + Math.cos(ang) * 7, PEN.z + Math.sin(ang) * 7]);
  }
  for (let k = 0; k < penPts.length - 1; k++) if (penPts[k] && penPts[k + 1]) B.fence([penPts[k], penPts[k + 1]], H);
  a.pen = PEN;

  // Renar: tre i fållan, tre som har sprungit bort
  const reindeerModel = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), FM.furBrown);
    body.scale.set(0.7, 0.7, 1.35);
    body.position.y = 1.1;
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), FM.fur);
    belly.scale.set(0.7, 0.5, 1.2);
    belly.position.y = 0.92;
    g.add(belly);
    const neck = new THREE.Mesh(cyl(0.15, 0.2, 0.7, 6, 1), FM.furBrown);
    neck.position.set(0, 1.45, 0.6);
    neck.rotation.x = 0.6;
    g.add(neck);
    const head = new THREE.Group();
    head.position.set(0, 1.75, 0.85);
    head.add(place(new THREE.Mesh(box(0.22, 0.24, 0.5, 1), FM.furBrown), 0, 0, 0.1));
    for (const s of [-1, 1]) {
      const ant = new THREE.Group();
      ant.position.set(0.08 * s, 0.12, -0.05);
      ant.add(place(new THREE.Mesh(cyl(0.025, 0.03, 0.55, 4, 1), M.horn), 0.1 * s, 0.25, -0.05).rotateZ(-0.5 * s));
      ant.add(place(new THREE.Mesh(cyl(0.02, 0.025, 0.3, 4, 1), M.horn), 0.22 * s, 0.45, 0.05).rotateX(0.6));
      head.add(ant);
    }
    g.add(head);
    const legs = [];
    for (const [x, z] of [[-0.22, 0.45], [0.22, 0.45], [-0.22, -0.45], [0.22, -0.45]]) {
      const l = new THREE.Group();
      l.position.set(x, 0.85, z);
      l.add(place(new THREE.Mesh(cyl(0.05, 0.04, 0.85, 5, 1), FM.furBrown), 0, -0.42, 0));
      g.add(l);
      legs.push(l);
    }
    return { g, head, legs };
  };
  a.reindeer = [];
  const deer = (id, x, z, lost) => {
    const m = reindeerModel();
    const y = H(x, z);
    m.g.position.set(x, y, z);
    m.g.rotation.y = rand() * 6.28;
    B.add(m.g);
    const r = { id, m, pos: m.g.position, home: V3(PEN.x + (rand() - 0.5) * 6, 0, PEN.z + (rand() - 0.5) * 6), lost, run: null, ph: rand() * 6 };
    r.home.y = H(r.home.x, r.home.z);
    a.reindeer.push(r);
    return r;
  };
  for (let k = 0; k < 3; k++) deer(`pen${k}`, PEN.x + (rand() - 0.5) * 6, PEN.z + (rand() - 0.5) * 6, false);
  deer('northeast', FX + 96, -44, true);
  deer('west', FX - 120, -18, true);
  deer('north', FX - 34, -96, true);

  // ---------- den frusna sjön ----------
  {
    const y = H(LAKE.x, LAKE.z) + 0.05;
    const ice = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r, 48), M.ice);
    ice.rotation.x = -Math.PI / 2;
    ice.position.set(LAKE.x, y, LAKE.z);
    ice.material.polygonOffset = true;
    B.add(ice);
    B.hidden(new THREE.CylinderGeometry(LAKE.r, LAKE.r, 0.3, 32), LAKE.x, y - 0.15, LAKE.z);
    a.ices.push({ x: LAKE.x, z: LAKE.z, r: LAKE.r, kind: 'slick' });
    // Fiskaren som frös fast: ett isblock med en skugga av en man inuti
    const F = { x: LAKE.x + 4, z: LAKE.z - 3 };
    const block = new THREE.Mesh(box(1.6, 2.3, 1.6, 1), FM.rime);
    block.position.set(F.x, y + 1.15, F.z);
    block.rotation.y = 0.4;
    B.add(block);
    const ghost = new THREE.Group();
    ghost.position.set(F.x, y, F.z);
    ghost.add(place(new THREE.Mesh(cyl(0.22, 0.28, 1.0, 8, 1), mat(0x3a4a5a)), 0, 0.9, 0));
    ghost.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0x8a7060)), 0, 1.6, 0));
    B.add(ghost);
    a.connectFns.push((c) => { a.fisher.box = c.addBox(F.x - 0.8, y, F.z - 0.8, F.x + 0.8, y + 2.3, F.z + 0.8, 'fisher'); a.fisher.box.enabled = !a.fisher.freed; });
    // Ett vak i isen och ett fiskespö
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: 0x0a1a24 }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(F.x + 1.8, y + 0.02, F.z + 1.2);
    B.add(hole);
    B.deco(new THREE.Mesh(cyl(0.02, 0.03, 2.2, 4, 1).rotateZ(0.9), FM.woodDark), F.x + 1.2, y + 0.8, F.z + 1);
    a.fisher = { pos: V3(F.x, y, F.z), block, ghost, box: null, y, freed: false };
    a.map.pois.push({ x: LAKE.x, z: LAKE.z, label: 'The Frozen Lake', icon: 'water' });
  }

  // ---------- Jättens gap: glaciären och huvudet ----------
  {
    const by = H(MAW.x, MAW.z + 24);
    // Glaciären bakom huvudet
    for (let k = 0; k < 9; k++) {
      const ang = Math.PI * (1.1 + k * 0.1), r = 34 + (k % 3) * 6;
      const x = MAW.x + Math.cos(ang) * r, z = MAW.z + Math.sin(ang) * r * 0.6 - 4;
      const m = new THREE.Mesh(rockGeo(10 + (k % 4) * 3, 2610 + k, 1.4), FM.giant);
      m.position.set(x, by + 4, z);
      B.solid(m);
    }
    // Huvudet: en jättes ansikte i isen, gapet öppet mot söder
    const C = { x: MAW.x, z: MAW.z, y: by };
    const head = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), FM.giant);
    head.scale.set(1.1, 1.0, 0.9);
    head.position.set(C.x, C.y + 15, C.z - 6);
    B.add(head);
    // Pannan, ögonbrynen och näsan
    B.deco(new THREE.Mesh(box(26, 4, 6, 3), FM.giantDark), C.x, C.y + 24, C.z + 7);
    for (const s of [-1, 1]) {
      B.deco(new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), FM.glow), C.x + s * 6.5, C.y + 20.5, C.z + 8.5);
      B.deco(new THREE.Mesh(box(8, 1.8, 3, 1).rotateZ(0.15 * s), FM.giantDark), C.x + s * 6.5, C.y + 23, C.z + 9);
    }
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(3, 7, 5).rotateX(Math.PI / 2 + 0.3), FM.giant), C.x, C.y + 16.5, C.z + 12);
    // Gapet: överkäken med tänder, underkäken som en ramp in
    B.solid(place(new THREE.Mesh(box(24, 3, 8, 3), FM.giantDark), C.x, C.y + 11, C.z + 8));
    for (let k = -4; k <= 4; k++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 5), FM.tooth);
      t.rotation.x = Math.PI;
      t.position.set(C.x + k * 2.4, C.y + 8, C.z + 11.5);
      B.add(t);
    }
    for (let k = -4; k <= 4; k++) {
      if (Math.abs(k) < 2) continue;
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 5), FM.tooth);
      t.position.set(C.x + k * 2.4, C.y + 1.2, C.z + 12.5);
      B.solid(t);
    }
    // Gapets sidor (kinderna) och munhålan
    for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(4, 12, 14, 2), FM.giant), C.x + s * 12, C.y + 6, C.z + 6));
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(20, 9), new THREE.MeshBasicMaterial({ color: 0x0a1422 }));
    dark.position.set(C.x, C.y + 4.6, C.z - 0.5);
    B.add(dark);
    B.solid(place(new THREE.Mesh(box(20, 12, 2, 2), FM.giantDark), C.x, C.y + 6, C.z - 1.6));
    a.entries.maw = { pos: V3(C.x, by, C.z + 8), facing: 0 };
    a.exits.push({ x0: C.x - 3, x1: C.x + 3, z0: C.z - 0.6, z1: C.z + 2, y: by, dy: 4, to: 'fgate', entry: 'entrance', maw: true, text: 'Cello steps between the frozen teeth, into the giant\'s throat...', label: "Frostgiant's Maw" });
    a.map.pois.push({ x: C.x, z: C.z, label: "Frostgiant's Maw", icon: 'ruin' });
  }

  // ---------- Lokis röse: en kista på en klippa. En trappa leder upp till en avsats bredvid toppen, men en vägg
  // av rimfrost stänger toppen (masken behövs: skuggan flyger igenom, och Cello byter plats med den) ----------
  const CAIRN = { x: FX + 70, z: 70 };
  {
    const y = H(CAIRN.x, CAIRN.z);
    const top = y + 6;
    const rockBox = (w, hgt, d, x, y0, z) => B.solid(place(new THREE.Mesh(box(w, hgt, d, 2), M.rock), x, y0 + hgt / 2, z));
    rockBox(10, 8, 10, CAIRN.x, y - 2, CAIRN.z);
    // Trappan längs södra sidan (stiger österut), och avsatsen öster om toppen
    const n = 24;
    for (let k = 0; k < n; k++) rockBox(0.6, (k + 1) * 0.25 + 2, 2.4, CAIRN.x - 9.4 + k * 0.6 + 0.3, y - 2, CAIRN.z + 6.4);
    B.hidden(new THREE.BoxGeometry(15.6, 0.1, 2.4), CAIRN.x - 2.2, y + 3.2, CAIRN.z + 6.4, 0, 0, Math.atan2(6, 14.4));
    rockBox(3.2, 8, 12.8, CAIRN.x + 6.6, y - 2, CAIRN.z + 1.2);
    a.cairn = { x: CAIRN.x, z: CAIRN.z, top };
    B.chest('frostCairn', CAIRN.x - 2.5, top, CAIRN.z - 2, Math.PI / 2, { shards: 20 });
    for (const [x, z] of [[-3.8, -3.8], [-3.8, 1], [-1, -4]]) B.deco(new THREE.Mesh(rockGeo(0.6, Math.round(x * 3 + z + 40), 0.8), M.rock), CAIRN.x + x, top + 0.3, CAIRN.z + z);
    // Rimfrosten längs toppens södra och östra kant
    const rime = new THREE.Group();
    const icicle = (x, z) => {
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.12, 2.6, 5), FM.rime);
      ic.rotation.x = Math.PI;
      ic.position.set(x, top + 1.3, z);
      rime.add(ic);
    };
    for (let k = 0; k <= 22; k++) { icicle(CAIRN.x - 5 + k * 0.45 + 0.1, CAIRN.z + 5.1); icicle(CAIRN.x + 5.1, CAIRN.z - 5 + k * 0.45 + 0.1); }
    rime.add(place(new THREE.Mesh(box(10.4, 0.3, 0.3, 1), FM.rime), CAIRN.x, top + 2.5, CAIRN.z + 5.1));
    rime.add(place(new THREE.Mesh(box(0.3, 0.3, 10.4, 1), FM.rime), CAIRN.x + 5.1, top + 2.5, CAIRN.z));
    B.add(rime);
    a.connectFns.push((c) => {
      for (const bx of [c.addBox(CAIRN.x - 5.2, top, CAIRN.z + 4.9, CAIRN.x + 5.3, top + 4, CAIRN.z + 5.3, 'cairnRime'), c.addBox(CAIRN.x + 4.9, top, CAIRN.z - 5.2, CAIRN.x + 5.3, top + 4, CAIRN.z + 5.3, 'cairnRime')]) bx.shadowPass = true;
    });
    B.sign(CAIRN.x - 6, H(CAIRN.x - 6, CAIRN.z + 9.5), CAIRN.z + 9.5, 0, ['Scratched into the rock, and signed with a little horned face:', '"What you cannot climb, perhaps your shadow can. — L."']);
    a.map.pois.push({ x: CAIRN.x, z: CAIRN.z, label: "Loki's Cairn", icon: 'ruin' });
  }

  // ---------- kulisser: isberg i fjärran ----------
  for (const [x, z, r, y] of [[-300, -60, 60, 10], [290, 30, 54, 18], [-240, 230, 44, -4], [250, -250, 46, 6], [0, -320, 70, 26]]) {
    B.backdrop(FX + x, z, r, y, 2630 + x, { topMat: M.snow, rings: 6, segs: 28 });
  }

  // ---------- fiender: snövargar (asklingar) på tundran ----------
  const VV = (x, z) => V3(FX + x, H(FX + x, z), z);
  for (const [x, z] of [[-90, 80], [80, -10], [-70, -60], [40, -90], [110, 60]]) {
    B.enemy(VV(x, z), [VV(x + 6, z + 3), VV(x - 5, z - 4)], {});
    B.enemy(VV(x + 3, z - 2), [VV(x - 3, z + 4)], { kind: 'shield' });
  }
  // Renarna rör sig lite (och de vilsna springer hem när Cello har lockat dem)
  a.updaters.push((t, dt) => {
    for (const r of a.reindeer) {
      const m = r.m;
      if (r.run) {
        r.run.t += dt;
        const k = Math.min(1, r.run.t / r.run.dur);
        r.pos.lerpVectors(r.run.from, r.home, k);
        r.pos.y = H(r.pos.x, r.pos.z);
        m.g.rotation.y = Math.atan2(r.home.x - r.run.from.x, r.home.z - r.run.from.z);
        for (let i = 0; i < 4; i++) m.legs[i].rotation.x = Math.sin(t * 14 + i * 1.6) * 0.6;
        if (k >= 1) { r.run = null; r.lost = false; }
      } else {
        m.head.rotation.x = 0.3 + Math.sin(t * 0.7 + r.ph) * 0.35;
        for (const l of m.legs) l.rotation.x *= 0.9;
      }
    }
  });
  B.end();
  return {
    H, area: a, village: VIL, lake: LAKE, maw: MAW, pen: PEN, cairn: CAIRN,
    npcs: {
      sigrun: { area: 'frost', pos: V3(VIL.x - 3, H(VIL.x - 3, VIL.z - 3), VIL.z - 3), face: 0.6 },
      ylva: { area: 'frost', pos: V3(PEN.x - 8, H(PEN.x - 8, PEN.z - 2), PEN.z - 2), face: -1.6 },
      hakon: { area: 'frost', pos: V3(VIL.x + 9, H(VIL.x + 9, VIL.z - 5), VIL.z - 5), face: -2.2 },
    },
  };
}

// The Drowned Temple (0.15): den femte fängelsehålan, byggd kring Poseidon's Corrupted Trident. Ett tempel av grön
// marmor på botten av The Shattered Sea, där vattnet stiger och sjunker. Layouten följer reliken och simningen:
// salar som fylls och töms, en lång tunnel under vatten med bubbelkällor, tryckplattor som bara tung vikt når,
// och spröd korall som bara treudden bryter.
//
//   The Sunken Gate (tgate)        – förhallen (Cello simmar in under ytan), Hall of Tides med ett tidvattenhjul:
//                                    högt vatten når den höga avsatsen och kartan, lågt vatten öppnar sigillen.
//   The Drowned Galleries (tdeep)  – tunneln under vatten (luften räcker med bubbelkällorna), cisternen med
//                                    tryckplattan och gallret, och den höga nischen med Tide Key (treudden behövs).
//   Karkinos' Grotto (tgrotto)     – jättekrabban Karkinos. Efter den: treudden, och korallen mot tronsalen.
//   The Throne of Tides (tthrone)  – havsodjuret Ketos i en djup rund bassäng med fyra tidvattenaltaren.
//
// Liten nyckel: rummet bakom sigillet (tgate) → dörren mot tunneln. Tide Key: cisternen i tdeep (högt vatten).
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { TideWing, Karkinos, Ketos, templeMats } from './templekit.js';

export class Temple {
  constructor() {
    this.state = Temple.freshState();
    this.interactions = [];
    this.wings = [];
    this.enemySpots = [];
    this.trap = null;
    this.game = null;
    this.areas = null;
    this.title = 'The Drowned Temple';
    this.bossKeyName = 'Tide Key';
  }

  static freshState() {
    return { visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {}, water: {}, entered: false, heartTaken: false };
  }

  wingAt(id) { return this.wings.find((w) => w.id === id) ?? null; }
  get cur() { return this.wingAt(this.areas?.id); }
  onTorch(id) { const w = this.wings.find((q) => id.startsWith(`${q.id}:`)); w?.onTorch?.(id); return !!w; }
  combatTargets() { return this.cur?.combatTargets() ?? []; }
  inside(p) { return !!this.cur?.inside(p); }
  roomAt(p) { return this.cur?.roomAt(p) ?? null; }
  slam(point, feet) { return this.cur?.slam(point, feet) ?? false; }
  onPlayerDeath() { this.cur?.onPlayerDeath(); }

  grant(item) {
    const s = this.state;
    if (item === 'tmap') s.map = true;
    else if (item === 'tkey') s.keys++;
    else if (item === 'tidekey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  applyState(saved) {
    const s = (this.state = { ...Temple.freshState(), ...(saved || {}) });
    s.solved = { ...(s.solved || {}) };
    s.cleared = { ...(s.cleared || {}) };
    s.water = { ...(s.water || {}) };
    for (const w of this.wings) w.applyState();
    this.trap = null;
  }

  update(dt, t, frozen = false) {
    const w = this.cur;
    if (!w) return;
    w.update(dt, frozen);
    this.trap = w.trap ? w.trap.id : (w.bossFight ? 'boss' : null);
  }
}

export function buildTemple(B, areas, tp) {
  const TM = templeMats();
  const M = B.M;
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, indoor: true, ...def });
    a.waterFog = def.waterFog ?? 0x14505c;
    a.waterFar = def.waterFar ?? 26;
    B.begin(a);
    const w = new TideWing(B, a, tp, { ox, name: def.name, H: def.H ?? 6, floorMat: TM.floor, wallMat: TM.stone, mats: { slab: TM.stone, trim: TM.bronze, metal: TM.bronze, block: TM.stone, runes: TM.stoneDark } });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    tp.wings.push(w);
    return w;
  };
  const LIGHT = { hemi: 1.25, moon: 0.9, flash: 0, sky: 0xa8d8dc, ground: 0x203430, moonColor: 0xc8f0e8 };
  const FOG = { color: 0x183c44, near: 12, far: 72 };
  const ceiling = (w, x0, x1, z0, z1, y) => w.slab(x0, x1, y, y + 0.6, z0, z1, TM.stoneDark);
  const corridor = (w, x0, x1, z0, z1, o = {}) => {
    const y = o.y ?? 0, h = o.h ?? 3.6;
    if (o.floor !== false) w.slab(x0, x1, y - 1, y, z0, z1, TM.floor);
    if ((o.along ?? 'z') === 'z') {
      w.slab(x0 - 1, x0, y - 1, y + h, z0, z1);
      w.slab(x1, x1 + 1, y - 1, y + h, z0, z1);
    } else {
      w.slab(x0, x1, y - 1, y + h, z0 - 1, z0);
      w.slab(x0, x1, y - 1, y + h, z1, z1 + 1);
    }
    if (o.ceiling !== false) ceiling(w, x0 - 1, x1 + 1, z0 - (o.along === 'x' ? 1 : 0), z1 + (o.along === 'x' ? 1 : 0), y + h);
  };
  // En trappa längs z, från (zLow, yLow) till (zHigh, yHigh)
  const stair = (w, x0, x1, zLow, zHigh, yLow, yHigh) => {
    const n = Math.max(2, Math.round(Math.abs(yHigh - yLow) / 0.3));
    const dz = (zHigh - zLow) / n, dy = (yHigh - yLow) / n;
    for (let k = 0; k < n; k++) {
      const za = zLow + dz * k, zb = za + dz;
      w.slab(x0, x1, yLow - 1, yLow + dy * (k + 1), Math.min(za, zb), Math.max(za, zb), TM.floor);
    }
    const len = Math.hypot(zHigh - zLow, yHigh - yLow), th = Math.atan2(yHigh - yLow, Math.abs(zHigh - zLow));
    B.hidden(new THREE.BoxGeometry(x1 - x0, 0.1, len), w.X((x0 + x1) / 2), (yLow + yHigh) / 2 + dy / 2 + 0.02, (zLow + zHigh) / 2, Math.sign(zHigh - zLow) < 0 ? th : -th);
  };
  // En trappa längs x
  const stairX = (w, z0, z1, xLow, xHigh, yLow, yHigh) => {
    const n = Math.max(2, Math.round(Math.abs(yHigh - yLow) / 0.3));
    const dx = (xHigh - xLow) / n, dy = (yHigh - yLow) / n;
    for (let k = 0; k < n; k++) {
      const xa = xLow + dx * k, xb = xa + dx;
      w.slab(Math.min(xa, xb), Math.max(xa, xb), yLow - 1, yLow + dy * (k + 1), z0, z1, TM.floor);
    }
    const len = Math.hypot(xHigh - xLow, yHigh - yLow), th = Math.atan2(yHigh - yLow, Math.abs(xHigh - xLow));
    B.hidden(new THREE.BoxGeometry(len, 0.1, z1 - z0), w.X((xLow + xHigh) / 2), (yLow + yHigh) / 2 + dy / 2 + 0.02, (z0 + z1) / 2, 0, 0, Math.sign(xHigh - xLow) > 0 ? th : -th);
  };
  // En lykta: en glaskula med ett grönt sken i en bronsställning
  const lamp = (w, x, z, y = 0) => {
    w.B.solid(place(new THREE.Mesh(cyl(0.1, 0.16, 1.6, 6, 1), TM.bronze), w.X(x), y + 0.8, z));
    w.deco(new THREE.SphereGeometry(0.28, 10, 8), TM.glow, x, y + 1.85, z);
    B.lights.add({ x: w.X(x), y: y + 2, z, color: 0x9ff4e8, power: 10, range: 11, flicker: 0.15 });
  };
  const column = (w, x, z, y0, y1) => w.B.solid(place(new THREE.Mesh(cyl(0.6, 0.7, y1 - y0, 10, 1.5), TM.stone), w.X(x), (y0 + y1) / 2, z));
  const statue = (w, x, z, face, y = 0) => {
    // Poseidon i marmor: en skäggig gestalt med en (hel) treudd
    const g = new THREE.Group();
    g.position.set(w.X(x), y, z);
    g.rotation.y = face;
    w.area.root.add(g);
    g.add(place(new THREE.Mesh(box(1.8, 0.8, 1.8, 1), TM.stoneDark), 0, 0.4, 0));
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 2.4, 8), TM.stone), 0, 2.0, 0));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), TM.stone), 0, 3.5, 0));
    g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 6), TM.stone), 0, 3.15, 0.25));
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 5), TM.bronze), 0.8, 2.2, 0.2));
    for (const dx of [-0.25, 0, 0.25]) g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), TM.bronze), 0.8 + dx, 4.2, 0.2));
    w.B.hidden(new THREE.BoxGeometry(1.8, 4, 1.8), w.X(x), y + 2, z);
  };

  // =====================================================================
  // The Sunken Gate
  // =====================================================================
  mk({ id: 'tgate', name: 'The Sunken Gate', sub: 'Where the sea keeps the door', H: 9, fog: FOG, light: LIGHT }, 23000, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -60, 24);
    // ---------- förhallen: Cello simmar in under vattnet och kommer upp i en luftficka ----------
    const V0 = w.room('V0', 'The Flooded Vestibule', -6, 6, -6, 12);
    w.wall('x', -7, 7, -7, -6, [{ c: 0 }], { y1: 9.6, fy: 4.8 });
    w.wall('x', -7, 7, 12, 13, [{ c: 0 }], { y1: 9.6 });
    w.wall('z', -6, 12, -7, -6, [], { y1: 9.6 });
    w.wall('z', -6, 12, 6, 7, [], { y1: 9.6 });
    ceiling(w, -7, 7, -7, 13, 9.6);
    w.slab(-6, 6, -1, 4.8, -6, -2, TM.floor); // avsatsen i norr
    w.pool('v0', -6, 6, -2, 12, [4.6], { floor: 0 });
    corridor(w, -1.5, 1.5, 13, 19, { h: 3.6 });
    w.pool('v0c', -1.5, 1.5, 12, 19, [4.6], { group: 'v0' });
    w.entry('entrance', 0, 9, Math.PI, 0.3);
    w.entry('fromHall', 0, -4, Math.PI, 4.8);
    w.exit(-1.5, 1.5, 16.5, 19, 'sea', 'temple', { label: 'The Shattered Sea', y: 1, dy: 3 });
    statue(w, -4.2, -4.2, 0.6, 4.8);
    statue(w, 4.2, -4.2, -0.6, 4.8);
    for (const x of [-5.2, 5.2]) column(w, x, 6, -1, 9.6);
    lamp(w, -2.4, -3.2, 4.8); lamp(w, 2.4, -3.2, 4.8);
    w.inscription(0, -5.4, 0, ['Cut deep into green marble, half eaten by the sea:', '"Here Poseidon laid down his spear, and here the sea was bound to keep a prisoner."', '"Let no one take the trident from its rest. Let the tide stand guard forever."'], 4.8);
    // ---------- gången norrut ----------
    corridor(w, -1.5, 1.5, -15, -7, { y: 4.8 });
    // ---------- Hall of Tides ----------
    const G1 = w.room('G1', 'The Hall of Tides', -10, 10, -42, -16);
    w.wall('x', -11, 11, -16, -15, [{ c: 0 }], { y1: 12, fy: 4.8 });
    w.wall('x', -11, 11, -43, -42, [{ c: 0 }], { y1: 12, fy: 8 });
    w.wall('z', -42, -16, -11, -10, [{ c: -28 }], { y1: 12 });
    w.wall('z', -42, -16, 10, 11, [{ c: -24 }], { y1: 12 });
    ceiling(w, -11, 11, -43, -15, 12);
    // Balkongen i söder (där gången kommer in) och trappan ner längs västra väggen
    w.slab(-10, 10, 3.8, 4.8, -19, -16, TM.floor);
    stair(w, -10, -7, -32, -19, 0, 4.8);
    // Den höga avsatsen i norr: hjulet och dörren till kartrummet
    w.slab(-10, 10, -1, 8, -42, -37, TM.floor);
    w.pool('g1', -10, 10, -37, -16, [7.6, 0.4], { floor: 0 });
    w.wheel('w1', 6, -39.6, 0, 'g1', { y: 8 });
    w.wheel('w1b', 8.6, -31, -Math.PI / 2, 'g1', { y: 0 });
    for (const [x, z] of [[-6, -22], [6, -22], [-6, -34], [6, -34]]) column(w, x, z, -1, 12);
    lamp(w, -8, -38.5, 8); lamp(w, -8.5, -17.5, 4.8);
    w.inscription(-3, -17.2, Math.PI, ['A tide-chart is carved in the floor of the balcony:', '"When the sea is high, the high places are near. When the sea is low, the deep doors open."', '"Turn the wheel with your feet on stone. The sea will not let a swimmer turn it."'], 4.8);
    w.urchin(-7.5, 0, -27);
    w.urchin(-8.6, 0, -29.6);
    w.urchin(4, 0, -26);
    // Kartrummet bakom den höga dörren
    w.room('G2', 'The Chart Room', -4, 4, -52, -43, { y: 8 });
    w.slab(-5, -4, 7, 12, -52, -43); w.slab(4, 5, 7, 12, -52, -43); w.slab(-5, 5, 7, 12, -53, -52);
    ceiling(w, -5, 5, -53, -42, 12);
    w.chest({ id: 'tMap', x: 0, y: 8, z: -50.5, face: 0, item: 'tmap' });
    lamp(w, -3, -44.5, 8); lamp(w, 3, -44.5, 8);
    // Sigillet i väster och nyckelrummet
    w.hatch('h_g3', -10.5, -28, 'x', 'g1', { neg: 'G3', pos: 'G1' });
    w.room('G3', 'The Shell Cellar', -20, -11, -33, -23);
    w.wall('x', -21, -10, -34, -33, [], { y1: 5 });
    w.wall('x', -21, -10, -23, -22, [], { y1: 5 });
    w.wall('z', -33, -23, -21, -20, [], { y1: 5 });
    ceiling(w, -21, -10, -34, -22, 5);
    w.chest({ id: 'tKey1', x: -18.4, z: -30.5, face: Math.PI / 2, item: 'tkey' });
    w.chest({ id: 'tShards0', x: -18.4, z: -25.5, face: Math.PI / 2, shards: 10 });
    w.enemy('bat', -15, -28, [], 'G3', { y: 2, room: 'G3' });
    lamp(w, -12.5, -24, 0);
    // Nyckeldörren i öster och gången till tunneln
    w.door({ id: 'd_deep', x: 10.5, z: -24, axis: 'x', type: 'key', neg: 'G1', pos: 'C1' });
    corridor(w, 11, 22, -25.2, -22.8, { along: 'x' });
    w.exit(19, 22, -25.2, -22.8, 'tdeep', 'fromGate', { label: 'The Drowned Galleries' });
    w.entry('fromDeep', 16, -24, -Math.PI / 2);
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Drowned Galleries
  // =====================================================================
  mk({ id: 'tdeep', name: 'The Drowned Galleries', sub: 'The long breath', H: 6, fog: { ...FOG, far: 60 }, light: LIGHT }, 23600, (w, a) => {
    B.bounds(w.ox - 20, w.ox + 140, -30, 30);
    // ---------- ingångshallen och gropen ner i tunneln ----------
    w.room('E0', 'The Last Air', -2, 8, -4, 4);
    corridor(w, -8, -2, -1.2, 1.2, { along: 'x' });
    w.exit(-8, -5.5, -1.2, 1.2, 'tgate', 'fromDeep', { label: 'The Sunken Gate' });
    w.entry('fromGate', 2, 0, Math.PI / 2);
    w.slab(-3, 8, -1, 5, -5, -4); w.slab(-3, 8, -1, 5, 4, 5);
    w.wall('z', -4, 4, -3, -2, [{ c: 0 }], { y1: 5 });
    w.slab(8, 12, -1, 0, -5, -3, TM.floor); w.slab(8, 12, -1, 0, 3, 5, TM.floor);
    w.slab(8, 12, -1, 5, -6, -5); w.slab(8, 12, -1, 5, 5, 6);
    w.slab(12, 13, 0, 5, -6, 6); // väggen ovanför tunneln: dit går man bara under vattnet
    ceiling(w, -3, 13, -6, 6, 5);
    w.inscription(5, -3.4, 0, ['Scratched into the wall by a desperate hand:', '"The galleries are drowned all the way through. There is no air but what the sea breathes out."', '"Follow the bubbles. Do not stop. Do not look at the urchins."']);
    lamp(w, 0, 3, 0);
    // Tunneln: helt under vatten, från gropen (x 8–12) till gropen (x 48–52)
    w.slab(8, 52, -7, -6, -2, 2, TM.floor);
    w.slab(8, 52, -7, 1, -3, -2); w.slab(8, 52, -7, 1, 2, 3);
    w.slab(7, 8, -7, -1, -2, 2); w.slab(52, 53, -7, -1, -2, 2);
    w.slab(12, 48, -2, 0, -2, 2, TM.stoneDark); // tunnelns tak
    w.slab(8, 12, 4.4, 5, -3, 3, TM.stoneDark); w.slab(48, 52, 4.4, 5, -3, 3, TM.stoneDark);
    w.room('D0', 'The Long Breath', 8, 52, -2, 2, { y: -6, floorSlab: false });
    w.pool('deep', 8, 52, -2, 2, [0], { floor: -6 });
    w.vent(22, -6, 0);
    w.vent(35, -6, 0.6);
    w.urchin(17, -6, -1.3); w.urchin(28, -6, 1.2); w.urchin(42, -6, -1.1); w.urchin(43.5, -6, 1.2);
    for (const x of [16, 28, 40]) B.lights.add({ x: w.X(x), y: -3, z: 0, color: 0x6fd8e0, power: 6, range: 8, flicker: 0.2 });
    // ---------- landningen och cisternen ----------
    w.room('E1', 'The Gasping Ledge', 52, 62, -4, 4);
    w.slab(52, 62, -1, 5, -5, -4); w.slab(52, 62, -1, 5, 4, 5);
    w.slab(48, 52, -1, 0, -5, -3, TM.floor); w.slab(48, 52, -1, 0, 3, 5, TM.floor);
    w.slab(48, 52, -1, 5, -6, -5); w.slab(48, 52, -1, 5, 5, 6);
    w.slab(47, 48, 0, 5, -6, 6);
    ceiling(w, 47, 62, -6, 6, 5);
    w.room('D1', 'The Weighted Cistern', 62, 86, -12, 12, { y: -4 });
    w.slab(62, 65, -5, 0, -4, 4, TM.floor); // avsatsen in i cisternen
    w.wall('z', -12, 12, 61, 62, [{ c: 0, w: 8, h: 4.2 }], { y0: -5, y1: 10, fy: 0 });
    w.wall('z', -12, 12, 86, 87, [{ c: 0, w: 2.4, h: 3.6 }], { y0: -5, y1: 10, fy: -4 });
    w.wall('x', 61, 87, -13, -12, [], { y0: -5, y1: 10 });
    w.wall('x', 61, 87, 12, 13, [{ c: 79.5, w: 2.6, h: 3.4 }], { y0: -5, y1: 10, fy: -4 });
    ceiling(w, 61, 87, -13, 13, 10);
    w.pool('d1', 62, 86, -12, 12, [-1.0, 4.6], { floor: -4 });
    w.pool('d1g', 86, 104, -1.2, 1.2, [-1.0, 4.6], { group: 'd1' });
    // Den höga nischen i norr med Tide Key
    w.slab(72, 78, -5, 4.8, -12, -9, TM.floor);
    w.chest({ id: 'tTide', x: 75, y: 4.8, z: -10.6, face: 0, big: true, item: 'tidekey' });
    // Tryckplattan på botten och gallret i öster
    w.timedGrate('g_d1', 86.5, 0, 'x', 70, -7, { y: -4, linger: 7, neg: 'D1', pos: 'D2' });
    w.altar('a_d1', 63.6, 2.6, -Math.PI / 2, 'd1', { y: 0 });
    for (const [x, z] of [[68, -8], [80, -8], [68, 8], [80, 8]]) column(w, x, z, -5, 10);
    lamp(w, 63.5, -3, 0);
    w.inscription(64, -2.6, Math.PI / 2, ['Engraved beside a plate in the cistern floor:', '"Only the heavy may press the deep plate. Only the quick may pass the gate before it falls."', '(Hold the weight on the plate, then let go and swim!)']);
    w.urchin(77, -4, 4); w.urchin(74, -4, 6);
    // Nischen bakom korallen i söder (treudden behövs)
    w.room('D1s', 'The Coral Niche', 78, 81, 13, 16, { y: -4 });
    w.slab(77, 78, -5, 0, 13, 16); w.slab(81, 82, -5, 0, 13, 16); w.slab(77, 82, -5, 0, 16, 17);
    w.slab(77, 82, -0.6, 0, 12, 17, TM.stoneDark);
    w.pool('d1s', 78, 81, 12, 16, [-1.0, 4.6], { group: 'd1' });
    w.coral('c_d1', 78.1, 80.9, -4, -0.6, 12.1, 13);
    w.chest({ id: 'tShards1', x: 79.5, y: -4, z: 15, face: Math.PI, shards: 15 });
    // Gången bakom gallret: under vatten, sedan en trappa upp till torrt
    w.room('D2c', 'The Gate Passage', 87, 104, -1.2, 1.2, { y: -4, floorSlab: false });
    w.slab(87, 96, -5, -4, -1.2, 1.2, TM.floor);
    w.slab(87, 104, -5, 3.6, -2.2, -1.2); w.slab(87, 104, -5, 3.6, 1.2, 2.2);
    stairX(w, -1.2, 1.2, 96, 104, -4, 0);
    w.slab(87, 104, 3.6, 4.2, -2.2, 2.2, TM.stoneDark);
    // ---------- den torra salen och vägen till grottan ----------
    w.room('E2', 'The Dry Chapel', 104, 116, -6, 6);
    w.walls(w.rooms.E2, { W: [0], E: [0] }, { y1: 6 });
    ceiling(w, 103, 117, -7, 7, 6);
    statue(w, 110, -4.5, 0);
    lamp(w, 105.5, 4.5); lamp(w, 114.5, 4.5);
    w.enemy('askling', 111, 2, [[111, 2], [108, -2]], 'E2', { room: 'E2' });
    w.enemy('shield', 113, -1, [[113, -1], [109, 1]], 'E2', { room: 'E2' });
    corridor(w, 117, 126, -1.2, 1.2, { along: 'x' });
    w.exit(123, 126, -1.2, 1.2, 'tgrotto', 'fromDeep', { label: "Karkinos' Grotto" });
    w.entry('fromGrotto', 110, 2, -Math.PI / 2);
    a.map.floor = 'B2';
  });

  // =====================================================================
  // Karkinos' Grotto
  // =====================================================================
  mk({ id: 'tgrotto', name: "Karkinos' Grotto", sub: 'Something big moves in the shallows', H: 10, fog: { ...FOG, color: 0x1a3438 }, light: { ...LIGHT, hemi: 1.15 } }, 24200, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 40, -20, 20);
    const R = 13;
    corridor(w, -24, -13, -1.5, 1.5, { along: 'x' });
    w.exit(-24, -21.5, -1.5, 1.5, 'tdeep', 'fromGrotto', { label: 'The Drowned Galleries' });
    w.entry('fromDeep', -17, 0, Math.PI / 2);
    w.room('K0', "Karkinos' Grotto", -R, R, -R, R);
    // Grottans vägg: ett varv av sten med öppningar i väster och öster
    const segs = 20;
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2, am = a0 + Math.PI / segs;
      const cx = Math.cos(am), cz = Math.sin(am);
      if (Math.abs(cz) < 0.16) continue; // öppningarna
      const len = 2 * (R + 0.8) * Math.sin(Math.PI / segs) + 0.3;
      const m = new THREE.Mesh(box(len, 11, 1.6, 2), TM.stoneDark);
      m.position.set(w.X(cx * (R + 0.8)), 4.5, cz * (R + 0.8));
      m.rotation.y = Math.atan2(cx, cz);
      B.solid(m);
    }
    // Stenblock runt öppningarna, så att gångarna sluter tätt mot grottans vägg
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.slab(sx > 0 ? R - 1.2 : -R - 2.6, sx > 0 ? R + 2.6 : -R + 1.2, -1, 10, sz > 0 ? 1.5 : -4.5, sz > 0 ? 4.5 : -1.5, TM.stoneDark);
    // Fyll hörnen mellan cirkeln och rektangeln
    for (const [x0, x1, z0, z1] of [[-R - 2, R + 2, -R - 3, -R - 1], [-R - 2, R + 2, R + 1, R + 3]]) w.slab(x0, x1, -1, 10, z0, z1, TM.stoneDark);
    ceiling(w, -R - 2, R + 2, -R - 3, R + 3, 10);
    w.pool('k0', -R, R, -R, R, [0.35], { floor: 0, opacity: 0.6 });
    // Korallpelare: den rusande krabban fastnar i dem
    const pillars = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + Math.PI / 6, x = Math.cos(ang) * 7.6, z = Math.sin(ang) * 7.6;
      B.solid(place(new THREE.Mesh(cyl(1.15, 1.35, 6, 9, 1.5), TM.coral), w.X(x), 3, z));
      for (let j = 0; j < 5; j++) w.deco(new THREE.IcosahedronGeometry(0.5, 0), j % 2 ? TM.coralB : TM.coral, x + Math.cos(j * 1.3) * 1.2, 0.5 + j * 1.1, z + Math.sin(j * 1.3) * 1.2);
      pillars.push({ x: w.X(x), z, r: 1.3 });
    }
    for (const [x, z] of [[-10, -6], [10, 6], [-6, 10], [6, -10]]) B.lights.add({ x: w.X(x), y: 6, z, color: 0x8fe8e0, power: 8, range: 14, flicker: 0.25 });
    w.inscription(-11.4, -4.4, Math.PI / 2, ['A crab of stone is carved here, its claws raised:', '"Hera sent the great crab against the hero, and he crushed it underfoot. It did not stay crushed."', '"Its shell turns every blade. But it charges blind, and it hates to be turned over."']);
    w.fightBars = ['k_in'];
    w.door({ id: 'k_in', x: -13.6, z: 0, axis: 'x', type: 'open', neg: 'C', pos: 'K0' });
    w.onConnect.push(() => {
      const kr = new Karkinos(w.D, w.V(0, 0, 0), R, pillars, w.groundAt);
      kr.clearId = 'karkinos';
      kr.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'stuck' && !w.hinted.stuck) { w.hinted.stuck = true; g.hud.toast("Karkinos' claws are stuck in the coral! Its eyes are bare: strike them!", 3400); }
        if (ev === 'flipped') { g.sfx.play('stomp', { vol: 1.2 }); if (!w.hinted.flip) { w.hinted.flip = true; g.hud.toast('The hammer flips the crab onto its back! Strike its soft belly!', 3400); } }
        if (ev !== 'defeated') return;
        w.bossFight = false;
        w.state.cleared.karkinos = true;
        w.setBars('k_in', false);
        g.sfx.play('secret');
        g.hud.toast('Karkinos sinks into the shallows. Something gleams where it fell...', 3600);
        g.story.save(true);
      };
      w.bosses.push(kr);
      w.karkinos = kr;
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || w.state.cleared.karkinos) return;
      const inner = Math.hypot(p.feet.x - w.X(0), p.feet.z) < R - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('k_in', true);
        w.karkinos.wake();
        g.hud.card('Karkinos', 'The crab that would not stay crushed');
      }
    });
    w.chest({ id: 'tTrident', x: 0, z: 3, face: Math.PI, big: true, item: 'trident', hidden: () => !!w.state.cleared.karkinos });
    // Öster: korallen, och den stora dörren till tronsalen
    corridor(w, 13, 32, -1.5, 1.5, { along: 'x', h: 4 });
    w.coral('c_throne', 15, 16.6, 0, 4, -1.5, 1.5);
    w.door({ id: 'h_throne', x: 26, z: 0, axis: 'x', type: 'boss', neg: 'C', pos: 'T' });
    w.interactions.push({
      label: () => (w.state.bossKey ? 'Unlock with the Tide Key' : 'The great door'), area: w.id, pos: () => w.V(24.4, 0, 0), radius: 1.9,
      ok: () => !w.state.doors.includes('h_throne'),
      run: () => {
        if (w.state.bossKey) {
          w.game.sfx.play('keyturn');
          w.openDoor('h_throne');
          w.game.hud.toast('The Tide Key turns. Beyond, something vast stirs in the deep.', 3200);
          w.game.story.save(true);
        } else w.game.story.read(['A great door of green bronze, cast with waves and a trident.', 'It needs the Tide Key.']);
      },
    });
    w.exit(29.5, 32, -1.5, 1.5, 'tthrone', 'entrance', { label: 'The Throne of Tides' });
    w.entry('fromThrone', 28, 0, -Math.PI / 2);
    a.map.floor = 'B3';
  });

  // =====================================================================
  // The Throne of Tides
  // =====================================================================
  mk({ id: 'tthrone', name: 'The Throne of Tides', sub: 'Where the sea god sat', H: 18, fog: { color: 0x10303a, near: 18, far: 110 }, light: { ...LIGHT, hemi: 1.35 }, waterFar: 34 }, 24800, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -30, 34);
    const R = 18, FY = -5;
    w.room('T0', 'The Throne of Tides', -R, R, -R, R, { y: FY });
    // Ringen runt bassängen (gångväg) och väggen utanför
    const segs = 24;
    for (let k = 0; k < segs; k++) {
      const am = (k / segs) * Math.PI * 2 + Math.PI / segs, cx = Math.cos(am), cz = Math.sin(am);
      const len = 2 * (R + 1.5) * Math.sin(Math.PI / segs) + 0.3;
      const rim = new THREE.Mesh(box(len, 0.5 - (FY - 1), 3, 2), TM.floor);
      rim.position.set(w.X(cx * (R + 1.5)), (FY - 1 + 0.5) / 2, cz * (R + 1.5));
      rim.rotation.y = Math.atan2(cx, cz);
      B.solid(rim);
      if (cz > 0.97) continue; // ingången i söder
      const wall = new THREE.Mesh(box(2 * (R + 3.4) * Math.sin(Math.PI / segs) + 0.4, 18, 1.2, 2), TM.stoneDark);
      wall.position.set(w.X(cx * (R + 3.6)), 8.5, cz * (R + 3.6));
      wall.rotation.y = Math.atan2(cx, cz);
      B.solid(wall);
    }
    w.slab(-R - 5, R + 5, 17.5, 18, -R - 5, R + 5, TM.stoneDark);
    // Plattformar med tidvattenaltaren
    const plats = [];
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI / 4 + (k * Math.PI) / 2, x = Math.cos(ang) * 10, z = Math.sin(ang) * 10;
      B.solid(place(new THREE.Mesh(cyl(2.6, 3.0, 0.5 - FY + 1, 12, 1.5), TM.stone), w.X(x), (FY - 1 + 0.5) / 2, z));
      plats.push({ x, z, ang });
    }
    // Tronen i norr, ovanför vattnet
    w.slab(-3, 3, FY, 0.5, -R - 3, -R + 0.5, TM.stoneDark);
    w.deco(box(4, 5, 1, 1.5), TM.stone, 0, 4.7, -R - 2.6);
    statue(w, -5, -R - 1, 0.4, 0.5);
    statue(w, 5, -R - 1, -0.4, 0.5);
    const pool = w.pool('throne', -R, R, -R, R, [0, -4.3], { floor: FY });
    pool.rate = 2.4;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      B.lights.add({ x: w.X(Math.cos(ang) * (R + 2)), y: 5, z: Math.sin(ang) * (R + 2), color: 0x8fe8e0, power: 10, range: 18, flicker: 0.2 });
    }
    // Ingången i söder
    corridor(w, -1.5, 1.5, R + 3, R + 10, { y: 0.5, h: 4 });
    w.entry('entrance', 0, R + 4, Math.PI, 0.5);
    w.exit(-1.5, 1.5, R + 7.5, R + 10, 'tgrotto', 'fromThrone', { label: "Karkinos' Grotto", y: 0.5 });
    w.onConnect.push(() => {
      const kt = new Ketos(w.D, w.V(0, FY, 0), { radius: R, surface: () => pool.level });
      kt.clearId = 'ketos';
      kt.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'awake' && !w.hinted.ketos) { w.hinted.ketos = true; g.hud.toast('Ketos circles in the deep! Find a tide altar on the platforms, and plunge the trident to drain the throne.', 5200); }
        if (ev === 'stranded' && !w.hinted.strand) { w.hinted.strand = true; g.hud.toast('Ketos is stranded! Strike the purple curse on its head!', 3400); }
        if (ev === 'refill') { w.setWater('throne', 0); g.sfx.play('tide'); }
        if (ev === 'phase') g.hud.toast('Ketos shrieks, and the sea floods back in!', 2600);
        if (ev === 'dying') g.story.sea?.ketosFalls?.();
        if (ev !== 'defeated') return;
        w.bossFight = false;
        w.state.cleared.ketos = true;
        w.setWater('throne', 0);
        g.story.sea?.templeBossDefeated?.();
      };
      w.bosses.push(kt);
      w.ketos = kt;
    });
    for (const p of plats) {
      w.altar(`ta${plats.indexOf(p)}`, p.x, p.z, Math.atan2(-p.x, -p.z), 'throne', {
        y: 0.5,
        ok: () => !w.state.cleared.ketos,
        text: ['A tide altar. The water of the throne leans toward it.'],
        onUse: (al) => {
          const kt = w.ketos, g = w.game;
          if (!w.bossFight || !kt?.drained()) { g.hud.toast('The altar hums, but the sea is already still.', 2200); al.glow = 0; return; }
          al.used = true;
          w.setWater('throne', 1);
          g.rig.shake(0.5);
          g.hud.toast('The trident sings! The throne drains, and Ketos thrashes in the shallows...', 3200);
        },
      });
    }
    w.onUpdate.push((dt, p, g, frozen) => {
      const kt = w.ketos;
      if (!kt || frozen || w.state.cleared.ketos) return;
      const inner = Math.hypot(p.feet.x - w.X(0), p.feet.z) < R + 1 && p.feet.z < R;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        kt.wake();
        g.hud.card('Ketos', 'The drowned beast of the sea god');
        g.story.sea?.ketosWakes?.();
      }
    });
    w.afterTemple = () => {
      for (const al of w.altars) al.used = false;
    };
    // Efteråt: hjärtat och strömmen som bär Cello hem
    w.chest({ id: 'tHeart', x: 0, y: 0.5, z: -R - 1, face: 0, big: true, item: 'heart', hidden: () => !!w.state.cleared.ketos && !!w.game?.story.state.choice3 });
    w.interactions.push({
      label: 'Ride the current home', area: w.id, pos: () => w.V(0, 0.5, R + 4.5), radius: 2.2,
      ok: () => !!w.state.cleared.ketos && !!w.game?.story.state.choice3 && w.state.chests.includes('tHeart'),
      run: () => w.game.story.sea?.leaveTemple?.(),
    });
    a.map.floor = 'B4';
  });

  return tp.wings;
}

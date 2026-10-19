// Thistledown Ranch: en bondgård på en stor ö norr om Aetheria. Stenvägen från Aetheria slutar här.
// Gården, ladan med stallet, betesmarken med getter och kor, åkern, fruktträdgården och dammen.
// Vägen norrut går över en bro mot Galewind Pass.
import * as THREE from 'three';
import { box, cyl, rockGeo, place } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const X0 = 1000;

export function buildRanch(B, areas) {
  const { M } = B;
  const a = areas.create({
    id: 'ranch', name: 'Thistledown Ranch', sub: 'Cut off since the storm',
    fog: { color: 0x3a3f48, near: 40, far: 280 },
  });
  B.begin(a);
  B.bounds(X0 - 75, X0 + 75, -88, 88);
  const R = (x, z) => [X0 + x, z];
  const road = [R(0, 63), R(0, 50), R(-4, 36), R(-8, 24), R(-4, 10), R(4, -4), R(3, -20), R(0, -38), R(0, -62)];
  const houseRoad = [R(-8, 24), R(-14, 21)];
  const isl = B.island({
    cx: X0, cz: 0, baseR: 64, rNoise: 6, seed: 101, amp: 0.55, hills: 2.4, hillFreq: 0.028,
    keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 34, rings: 46, segs: 120, label: 'Thistledown Ranch',
    pads: [
      { x: X0, z: 61, r: 5, h: 0 }, { x: X0, z: -61, r: 5, h: 0.1 },
      { x: X0 - 18, z: 20, r: 10, h: 0.3 }, { x: X0 + 20, z: -6, r: 13, h: 0.2 }, { x: X0 + 22, z: -19, r: 7, h: 0.2 },
      { x: X0 - 9, z: 14, r: 5, h: 0.3 }, { x: X0 + 22, z: 28, r: 10, h: 0.4 },
    ],
    roads: [{ pts: road, w: 3 }, { pts: houseRoad, w: 2.4 }],
    dips: [{ x: X0 + 36, z: -34, r: 9, depth: 1.2 }],
    grass: 1300,
    avoid: (x, z) => Math.hypot(x - (X0 - 18), z - 20) < 6 || Math.hypot(x - (X0 + 20), z + 6) < 9 || Math.hypot(x - (X0 + 36), z + 34) < 7
      || (Math.abs(x - (X0 + 22)) < 8 && Math.abs(z - 28) < 6),
  });
  const H = isl.H;
  B.road(road, 3, H);
  B.road(houseRoad, 2.4, H);

  // Stenvägen från Aetheria slutar här (fyra stenar) och dimman där den försvinner söderut
  for (let i = 0; i < 4; i++) {
    const z = 76 - i * 2.9, x = X0 + (i % 2 ? 0.2 : -0.15);
    B.solid(place(new THREE.Mesh(box(2.8, 0.9, 2.6, 1.6), M.rock), x, -0.45, z));
    B.deco(new THREE.Mesh(rockGeo(1.25, 560 + i, 1.4), M.rock), x, -1.6, z);
    B.deco(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.12), M.runeGlow), x, 0.01, z);
  }
  B.mist(X0, -3, 80.5, 10, 5, 8);
  a.map.lines.push({ pts: [R(0, 64), R(0, 78)], kind: 'stones' });
  // Bron norrut mot passet
  B.bridge('z', -82, -61.5, X0);
  B.mist(X0, -3, -82, 10, 5, 8);

  // ---------- gården ----------
  const farm = B.house(X0 - 18, H(X0 - 18, 20), 20, Math.PI / 2, {
    w: 7.5, d: 6, h: 3, wall: M.plaster, roof: M.roofRed, shutter: M.clothGreen, label: 'Farmhouse', lightPower: 9,
  });
  // Veranda med tak
  {
    const g = B.groupAt(X0 - 18, H(X0 - 18, 20), 20, Math.PI / 2);
    B.put(g, new THREE.Mesh(box(7.5, 0.18, 2.2, 1), M.wood), 0, 0.12, 4.0, true);
    for (const x of [-3.5, 3.5]) B.put(g, new THREE.Mesh(box(0.2, 2.6, 0.2, 1), M.woodDark), x, 1.4, 4.95);
    const r = new THREE.Mesh(box(8, 0.12, 2.6, 2), M.roofRed);
    r.rotation.x = 0.25;
    B.put(g, r, 0, 2.85, 4.1);
    B.put(g, new THREE.Mesh(box(7.5, 0.08, 0.08, 1), M.woodDark), 0, 0.9, 5.0);
  }
  // Eldstaden vid verandan, där man kan vila
  const fireAt = V3(X0 - 9, H(X0 - 9, 14), 14);
  B.campfire(fireAt.x, fireAt.y, fireAt.z, 24);
  B.bench(X0 - 9, H(X0 - 9, 11.6), 11.6, 0);
  B.bench(X0 - 6.5, H(X0 - 6.5, 14.5), 14.5, Math.PI / 2);
  a.rests = [{ pos: fireAt, entry: 'rest', label: 'Rest by the fire', prompt: "Nell's fire crackles. Rest a while?", text: 'Cello rests by the fire at Thistledown...' }];
  a.map.pois.push({ x: fireAt.x, z: fireAt.z, label: 'Rest', icon: 'fire' });
  // Vedtrave, tunnor och en brunn
  B.well(X0 - 10, H(X0 - 10, 27), 27);
  for (const [x, z] of [[-22, 13], [-23.4, 13.6]]) B.barrel(X0 + x, H(X0 + x, z), z);
  B.crate(X0 - 21, H(X0 - 21, 27.5), 27.5, 0.8, 0.3);
  B.pot(X0 - 13.5, H(X0 - 13.5, 15.5), 15.5);
  B.pot(X0 - 12.8, H(X0 - 12.8, 16.6), 16.6, 0.85);

  // ---------- ladan och stallet ----------
  B.barn(X0 + 20, H(X0 + 20, -6), -6, -Math.PI / 2, { w: 12, d: 9, h: 4.4, label: 'Barn' });
  for (const [x, z, r] of [[23, -9, 0], [23, -6.5, 0], [24.4, -7.8, 0.4], [22, -2, 1.2], [18, -9.5, 0.2]]) B.hayBale(X0 + x, H(X0 + x, z), z, r);
  B.chest('ranchBarn', X0 + 24.5, H(X0 + 24.5, -2), -2, -Math.PI / 2, { shards: 20 });
  // Stallet: ett skjul med spiltor norr om ladan
  {
    const sx = X0 + 22, sz = -19, y = H(sx, sz);
    const g = B.groupAt(sx, y, sz, -Math.PI / 2);
    for (let i = 0; i < 4; i++) B.put(g, new THREE.Mesh(box(0.25, 2.8, 0.25, 1), M.woodDark), -6 + i * 4, 1.4, 2.6, true);
    B.put(g, new THREE.Mesh(box(12.4, 2.6, 0.3, 2), M.barn), 0, 1.3, -2.6, true);
    for (const x of [-6.2, 6.2]) B.put(g, new THREE.Mesh(box(0.3, 2.6, 5.2, 2), M.barn), x, 1.3, 0, true);
    for (const x of [-2, 2]) B.put(g, new THREE.Mesh(box(0.15, 1.3, 4.6, 1), M.wood), x, 0.65, 0, true);
    const roof = new THREE.Mesh(box(13, 0.15, 6.4, 2), M.roofBrown);
    roof.rotation.x = 0.18;
    B.put(g, roof, 0, 3.05, 0);
    B.put(g, new THREE.Mesh(box(2.2, 0.5, 0.6, 1), M.wood), 4, 0.25, -1.8, true);
    B.put(g, new THREE.Mesh(box(2.0, 0.08, 0.5, 1), M.water), 4, 0.48, -1.8);
    for (const [x, z] of [[-4, -0.5], [0, -1.2], [-3.4, 1.4]]) B.put(g, new THREE.Mesh(box(1.2, 0.3, 1.0, 1), M.hay), x, 0.15, z);
    // Skylten över den tomma spiltan
    B.put(g, new THREE.Mesh(box(1.4, 0.4, 0.06, 1), M.wood), 4, 2.4, 2.7);
    a.map.rects.push({ kind: 'house', x: sx, z: sz, w: 12.4, d: 5.2, ry: -Math.PI / 2 });
  }
  B.sign(X0 + 14.6, H(X0 + 14.6, -16), -16, -Math.PI / 2, ['A name is carved over the empty stall: "BRINDLE".', 'Below it, in a child\'s writing: "come home soon"'], { label: 'Read the sign' });
  // Silo
  {
    const x = X0 + 32, z = 6, y = H(x, z);
    B.solid(place(new THREE.Mesh(cyl(2.2, 2.2, 8, 12, 2), M.plaster), x, y + 4, z));
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(2.5, 2, 12), M.roofRed), x, y + 9, z);
    for (let k = 1; k < 4; k++) B.deco(new THREE.Mesh(cyl(2.24, 2.24, 0.12, 12, 1), M.woodDark), x, y + k * 2, z);
  }
  B.cart(X0 + 10, H(X0 + 10, 4), 4, 0.4, { load: true });
  for (const [x, z] of [[13, -12], [12.2, -13.4]]) B.pot(X0 + x, H(X0 + x, z), z);

  // ---------- betesmarken ----------
  const pc = { x: X0 - 26, z: -18 };
  const fencePts = [];
  for (let i = 0; i <= 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    fencePts.push([pc.x + Math.cos(ang) * 15, pc.z + Math.sin(ang) * 12]);
  }
  B.fence(fencePts, H, { collide: true, gap: 2.2, skip: [0, 1] });
  B.deco(new THREE.Mesh(box(2.4, 0.5, 0.8, 1), M.wood), pc.x + 5, H(pc.x + 5, pc.z - 6) + 0.25, pc.z - 6);
  for (const [x, z, r] of [[-30, -24, 0.3], [-21, -12, 1.1]]) B.hayBale(X0 + x, H(X0 + x, z), z, r);

  // ---------- åkern ----------
  for (let row = 0; row < 6; row++) {
    for (let i = 0; i < 10; i++) {
      const x = X0 + 15 + i * 1.5, z = 24 + row * 1.6, y = H(x, z);
      if (row % 3 === 2) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), M.pumpkin);
        p.scale.y = 0.7;
        B.deco(p, x, y + 0.2, z);
      } else {
        B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 5), M.crop), x, y + 0.45, z);
        B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 5), M.leaf), x + 0.3, y + 0.3, z);
      }
    }
  }
  {
    const x = X0 + 22, z = 33, y = H(x, z);
    B.deco(new THREE.Mesh(box(0.1, 2.1, 0.1, 1), M.woodDark), x, y + 1.05, z);
    B.deco(new THREE.Mesh(box(1.5, 0.1, 0.1, 1), M.woodDark), x, y + 1.6, z);
    B.deco(new THREE.Mesh(box(0.6, 0.8, 0.32, 1), M.clothOchre), x, y + 1.4, z);
    B.deco(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), M.sack), x, y + 2.0, z);
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.32, 6), M.hay), x, y + 2.22, z);
  }
  B.fence([[X0 + 13.5, 22.5], [X0 + 30.5, 22.5], [X0 + 30.5, 34.5], [X0 + 13.5, 34.5]], H, { gap: 2 });

  // ---------- fruktträdgården i nordväst (asklingar har plundrat den) ----------
  for (let i = 0; i < 9; i++) {
    const x = X0 - 30 + (i % 3) * 7 + (i > 2 ? 2 : 0), z = -42 - Math.floor(i / 3) * 6.5;
    B.oak(x, H(x, z), z, 0.75, M.leafLight);
    for (let k = 0; k < 3; k++) B.deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), M.clothRed), x + Math.cos(k * 2.1 + i) * 0.9, H(x, z) + 2.0 + k * 0.2, z + Math.sin(k * 2.1 + i) * 0.9);
  }
  B.cart(X0 - 14, H(X0 - 14, -40), -40, -0.8, {});

  // ---------- dammen ----------
  B.water(X0 + 36, H(X0 + 36, -34) + 0.55, -34, 7, 6);
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2, x = X0 + 36 + Math.cos(ang) * 7.2, z = -34 + Math.sin(ang) * 6.2;
    B.deco(new THREE.Mesh(box(0.05, 1.0, 0.05, 1), M.crop), x, H(x, z) + 0.5, z);
  }
  B.rock(X0 + 44, H(X0 + 44, -40), -40, 1.4, 115);

  // ---------- träd, buskar och stenar runt kanten ----------
  const ring = [[-50, 20, 1.2], [-46, 34, 1.0], [-38, 46, 1.3], [40, 44, 1.1], [50, 26, 1.2], [54, 8, 1.0], [50, -14, 1.3], [-52, -6, 1.1],
    [-48, -32, 1.0], [44, -52, 1.2], [-10, 52, 1.0], [14, 52, 1.1], [-20, -56, 1.0], [24, -54, 1.2], [-56, 6, 1.0]];
  ring.forEach(([x, z, s], i) => (i % 3 ? B.pine : B.oak)(X0 + x, H(X0 + x, z), z, s));
  for (const [x, z] of [[-30, 30], [30, 14], [-40, -10], [10, -30], [-6, -50], [36, -18], [-28, 44]]) B.bush(X0 + x, H(X0 + x, z), z, 1.0);
  for (const [x, z, r] of [[-44, 12, 1.6], [46, -30, 1.3], [-14, -30, 1.0], [30, 46, 1.4]]) B.rock(X0 + x, H(X0 + x, z), z, r, 120 + x);
  B.flowers(X0 - 13, H(X0 - 13, 25), 25, 7);
  B.flowers(X0 - 6, H(X0 - 6, 30), 30, 6);
  B.sign(X0 + 2.8, H(X0 + 2.8, 54), 54, Math.PI, ['"Thistledown Ranch. Welcome, traveler."', 'Underneath, freshly carved: "Mind the goats."']);
  B.sign(X0 + 2.8, H(X0 + 2.8, -50), -50, Math.PI, ['"North: Galewind Pass and the Long Bridge."', '"South: Aetheria, by the old stone road."'], { arrow: 1 });

  // Bergen i norr syns långt bort (dit vägen går)
  for (const [x, z, r, y] of [[-20, -230, 40, 10], [40, -260, 34, 16], [-70, -200, 22, 4]]) {
    const b = B.backdrop(X0 + x, z, r, y, 130 + x, { rings: 6, segs: 24, topMat: M.rockTop });
    for (let k = 0; k < 4; k++) {
      const px = X0 + x + (k - 1.5) * r * 0.35, pz = z + Math.sin(k * 2.3) * r * 0.25, h = 18 + k * 7;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, h, 6), M.rock);
      B.deco(spire, px, b.H(px, pz) + h / 2 - 1, pz);
    }
  }
  for (const [x, z, r, y] of [[110, 30, 18, -8], [-120, 60, 24, 6], [90, 130, 16, 14], [-90, -90, 14, -4]]) B.backdrop(X0 + x, z, r, y, 150 + x);

  // ---------- fiender ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  B.enemy(VV(-24, -46), [VV(-28, -42), VV(-18, -50), VV(-26, -54)]);
  B.enemy(VV(-14, -54), [VV(-10, -52), VV(-20, -58)]);
  B.enemy(VV(38, -44), [VV(32, -46), VV(44, -42)]);

  a.entries = {
    south: { pos: V3(X0, 0, 72), facing: Math.PI },
    north: { pos: V3(X0, DECK, -73), facing: 0 },
    rest: { pos: V3(fireAt.x + 1.8, H(fireAt.x + 1.8, fireAt.z + 1.5), fireAt.z + 1.5), facing: -2.4 },
  };
  a.exits = [
    { x0: X0 - 3, x1: X0 + 3, z0: 78.6, z1: 100, to: 'village', entry: 'north' },
    { x0: X0 - 3, x1: X0 + 3, z0: -100, z1: -79.6, to: 'pass', entry: 'south' },
  ];
  a.map.exits = [{ x: X0, z: 79, label: 'Aetheria', to: 'village' }, { x: X0, z: -80, label: 'Galewind Pass', to: 'pass' }];
  B.end();

  return {
    npcs: {
      hollis: { area: 'ranch', pos: VV(12.6, -16.5), face: -Math.PI / 2 },
      nell: { area: 'ranch', pos: VV(-11.2, 18.5), face: Math.PI / 2 },
      tilly: { area: 'ranch', pos: VV(-12, -9), face: 0, wander: { center: VV(-12, -9), radius: 2.6 } },
    },
    animals: [
      ...[0, 1, 2, 3, 4].map((i) => ({ kind: 'goat', area: 'ranch', pos: VV(-26 + Math.cos(i * 1.3) * 6, -18 + Math.sin(i * 1.3) * 5), center: VV(-26, -18), radius: 8.5, H })),
      ...[0, 1].map((i) => ({ kind: 'cow', area: 'ranch', pos: VV(-30 + i * 6, -22 + i * 3), center: VV(-27, -19), radius: 7, H })),
      ...[0, 1, 2, 3].map((i) => ({ kind: 'chicken', area: 'ranch', pos: VV(-6 + i * 0.8, 22 + (i % 2) * 1.2), center: VV(-5, 22), radius: 4, H })),
    ],
    H,
  };
}

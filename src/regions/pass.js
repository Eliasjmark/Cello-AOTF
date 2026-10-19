// Galewind Pass och den långa bron. En ravin mellan höga klippor, en vaktport med ett torn,
// en klyfta med en kista, och längst i norr The Long Bridge: 180 meter över stormen till The Stormvale.
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const X0 = 2000;

export function buildPass(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'pass', name: 'Galewind Pass', sub: 'The road to the wide world', windy: true,
    fog: { color: 0x363b45, near: 40, far: 300 },
  });
  B.begin(a);
  B.bounds(X0 - 90, X0 + 90, -262, 100);
  const road = [[X0, 77], [X0, 60], [X0 - 6, 44], [X0 - 10, 28], [X0 - 4, 12], [X0 + 4, -6], [X0 + 6, -24], [X0 + 2, -44], [X0, -62], [X0, -74]];
  const isl = B.island({
    cx: X0, cz: 2, baseR: 76, rNoise: 6, seed: 201, amp: 0.6, hills: 3.5, hillFreq: 0.03,
    keepAngles: [Math.PI / 2, -Math.PI / 2], depth: 52, rings: 46, segs: 120, label: 'Galewind Pass', topMat: M.grass,
    pads: [{ x: X0, z: 76, r: 6, h: 0 }, { x: X0, z: -72, r: 6, h: 0 }, { x: X0 - 3, z: 10, r: 9, h: 0.2 }, { x: X0 - 22, z: 30, r: 6, h: 0.6 }],
    roads: [{ pts: road, w: 3.4 }],
    grass: 700,
    tint: (x, z) => 0.92 + 0.08 * Math.sin(x * 0.1),
  });
  const H = isl.H;
  // Vägen i ravinen följer marken, men hålls flack
  B.road(road, 3.4, H);

  // Bron från ranchen och dimman söderut
  B.bridge('z', 75, 96, X0);
  B.mist(X0, -3, 96, 10, 5, 8);

  // ---------- klippväggar längs ravinen ----------
  let seed = 0;
  const wallRocks = (pts, off, side, skip = () => false) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 4.2));
      const nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (let k = 0; k < n; k++) {
        const t = k / n, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
        if (skip(cx, cz)) continue;
        const j = hash2(cx, cz);
        const o = off + j * 3;
        const x = cx + nx * side * o, z = cz + nz * side * o;
        const r = 3.4 + j * 2.2, h = 7 + hash2(cz, cx) * 9;
        const m = new THREE.Mesh(rockGeo(1, 900 + seed++, 1.0), M.rock);
        m.scale.set(r, h / 2, r * 1.1);
        m.rotation.y = j * 6;
        B.solid(place(m, x, H(x, z) + h * 0.3, z));
      }
    }
  };
  const canyon = road.slice(1, -1);
  // Klyftan i väster (vid z 30) har en öppning till en grotta med en kista
  const cleft = (x, z) => z > 24 && z < 36;
  wallRocks(canyon, 10, 1, (x, z) => false);
  wallRocks(canyon, 10, -1, cleft);
  // Grottan i klyftan
  {
    const cx = X0 - 24, cz = 30;
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * 0.15 + (i / 8) * Math.PI * 1.7;
      const x = cx + Math.cos(ang) * 6.5, z = cz + Math.sin(ang) * 5.5;
      const m = new THREE.Mesh(rockGeo(1, 960 + i, 1.0), M.rock);
      m.scale.set(3.4, 6, 3.4);
      B.solid(place(m, x, H(x, z) + 2, z));
    }
    const roof = new THREE.Mesh(rockGeo(1, 975, 0.5), M.rock);
    roof.scale.set(8, 2.4, 7);
    B.deco(roof, cx, H(cx, cz) + 7.5, cz);
    B.chest('passCleft', cx - 1.5, H(cx - 1.5, cz), cz, Math.PI / 2, { shards: 50 });
    B.pot(cx + 1.6, H(cx + 1.6, cz - 2.6), cz - 2.6);
    B.pot(cx + 2.2, H(cx + 2.2, cz + 2.4), cz + 2.4);
    a.map.pois.push({ x: cx, z: cz, label: 'Cleft', icon: 'cave' });
  }

  // ---------- Galewind Gate: en mur över ravinen med en port och ett vakttorn ----------
  const gz = 10, gx = X0 - 3;
  {
    const y = H(gx, gz);
    for (const [x0, x1] of [[X0 - 16, gx - 2.4], [gx + 2.4, X0 + 12]]) {
      B.solid(place(new THREE.Mesh(box(x1 - x0, 6, 2.2, 2), M.brick), (x0 + x1) / 2, y + 2.6, gz));
      for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.5) B.solid(place(new THREE.Mesh(box(0.8, 0.8, 2.3, 1), M.brick), x, y + 6, gz));
    }
    // Valvet över porten
    B.solid(place(new THREE.Mesh(box(5.6, 1.6, 2.4, 2), M.brick), gx, y + 5.0, gz));
    for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(1.0, 4.4, 2.6, 1.5), M.marble), gx + s * 2.7, y + 2.2, gz));
    // Fanor
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(box(1.2, 2.6, 0.04, 1), M.clothBlue);
      B.deco(f, gx + s * 5.5, y + 3.8, gz + 1.15);
    }
    B.watchtower(X0 + 7, H(X0 + 7, gz + 5), gz + 5, 0.2, 7);
    for (const s of [-1, 1]) {
      const tx = gx + s * 3.6, tz = gz + 2;
      B.solid(place(new THREE.Mesh(cyl(0.18, 0.26, 1.4, 6, 1), M.iron), tx, H(tx, tz) + 0.7, tz));
      B.deco(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.3, 8), M.iron), tx, H(tx, tz) + 1.5, tz);
      B.makeFire(tx, H(tx, tz) + 1.55, tz, 0.7, 22, 3);
    }
    B.campfire(X0 + 4, H(X0 + 4, gz + 9), gz + 9, 20);
    B.tent(X0 + 9, H(X0 + 9, gz + 14), gz + 14, -0.7, M.clothBlue);
    for (const [x, z] of [[X0 + 1.5, gz + 6], [X0 + 2.3, gz + 6.8]]) B.barrel(x, H(x, z), z);
    B.crate(X0 - 8, H(X0 - 8, gz + 4), gz + 4, 0.9, 0.4);
    B.pot(X0 - 9.4, H(X0 - 9.4, gz + 5.5), gz + 5.5);
    B.sign(gx - 3.4, H(gx - 3.4, gz + 5), gz + 5, 0.3, ['"Galewind Gate. Travelers keep to the road."', '"Beyond: The Long Bridge and the Stormvale."']);
    a.map.pois.push({ x: gx, z: gz, label: 'Galewind Gate', icon: 'gate' });
  }

  // ---------- utsiktsplats och brofästet i norr ----------
  for (const s of [-1, 1]) {
    const x = X0 + s * 3.2, z = -70;
    B.solid(place(new THREE.Mesh(box(1.4, 7.5, 1.4, 1.5), M.marble), x, H(x, z) + 3.6, z));
    B.solid(place(new THREE.Mesh(box(1.9, 0.6, 1.9, 1.5), M.marble), x, H(x, z) + 7.6, z));
  }
  B.solid(place(new THREE.Mesh(box(8, 1.1, 1.6, 2), M.marble), X0, H(X0, -70) + 8.3, -70));
  B.sign(X0 + 3.6, H(X0 + 3.6, -64), -64, Math.PI, ['Carved into the pillar:', '"THE LONG BRIDGE. Built by the gods, kept by men. Walk it with a steady heart."']);

  // ---------- The Long Bridge ----------
  const BR0 = -252, BR1 = -73.5;
  B.bridge('z', BR0, BR1, X0, DECK, { rails: true, wide: 3.2 });
  // Torn med rep, var sextionde meter
  const towers = [-120, -175, -230];
  const ropeMat = M.rope;
  for (const tz of towers) {
    for (const s of [-1, 1]) {
      const x = X0 + s * 2.3;
      B.solid(place(new THREE.Mesh(box(0.9, 9, 0.9, 1.5), M.marble), x, 3.6, tz));
      B.deco(new THREE.Mesh(box(1.3, 0.4, 1.3, 1.5), M.marble), x, 8.3, tz);
      B.deco(new THREE.Mesh(rockGeo(1.4, 990 + tz, 1.5), M.rock), x, -1.8, tz);
      B.deco(new THREE.Mesh(box(0.6, 6, 0.6, 1.5), M.marble), x, -3.5, tz);
    }
    B.deco(new THREE.Mesh(box(5.4, 0.6, 0.8, 1.5), M.marble), X0, 8.0, tz);
    // Fana i toppen som fladdrar
    const flag = new THREE.Mesh(box(0.04, 0.9, 1.6, 1), M.clothRed);
    flag.position.set(X0 + 2.3, 9.0, tz - 0.9);
    B.add(flag);
    a.updaters.push((t) => { flag.rotation.y = Math.sin(t * 3.1 + tz) * 0.35; flag.scale.z = 0.9 + Math.sin(t * 5.3 + tz) * 0.1; });
  }
  // Bärlinor mellan tornen (hängande bågar av rep)
  const spans = [BR1, ...towers, BR0];
  for (let i = 0; i < spans.length - 1; i++) {
    const z0 = spans[i], z1 = spans[i + 1];
    for (const s of [-1, 1]) {
      const n = 14;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const y0 = 1.2 + 7 * (1 - 4 * t0 * (1 - t0)) * (i === 0 || i === spans.length - 2 ? 0.6 : 1);
        const y1 = 1.2 + 7 * (1 - 4 * t1 * (1 - t1)) * (i === 0 || i === spans.length - 2 ? 0.6 : 1);
        const za = z0 + (z1 - z0) * t0, zb = z0 + (z1 - z0) * t1;
        const len = Math.hypot(zb - za, y1 - y0);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, len), ropeMat);
        seg.rotation.x = Math.atan2(y1 - y0, -(zb - za));
        B.deco(seg, X0 + s * 2.2, (y0 + y1) / 2 + 0.6, (za + zb) / 2);
        // Hängare ner till räcket
        if (k % 2 === 0) B.deco(new THREE.Mesh(new THREE.BoxGeometry(0.04, Math.max(0.1, y0 - 0.9), 0.04), ropeMat), X0 + s * 2.2, 0.9 + (y0 - 0.9) / 2 + 0.6, za);
      }
    }
  }
  // Rastplatsen mitt på bron, där pilgrimen sitter
  const restZ = -150;
  B.solid(place(new THREE.Mesh(box(7, 0.4, 8, 1.5), M.marble), X0, DECK - 0.2, restZ));
  B.deco(new THREE.Mesh(rockGeo(3, 999, 1.2), M.rock), X0, -3.5, restZ);
  for (const s of [-1, 1]) {
    B.hidden(new THREE.BoxGeometry(0.3, 1.4, 8), X0 + s * 3.5, 0.7, restZ);
    B.deco(new THREE.Mesh(box(0.3, 0.9, 8, 1.5), M.marble), X0 + s * 3.5, 0.45, restZ);
  }
  B.bench(X0 - 2.4, DECK, restZ + 1.4, Math.PI / 2);
  B.lampPost(X0 + 3, DECK, restZ - 2.5, 10);
  B.pot(X0 + 2.6, DECK, restZ + 3.2);
  B.pot(X0 + 2.0, DECK, restZ + 3.4, 0.8);
  a.map.pois.push({ x: X0, z: restZ, label: 'Rest stop', icon: 'gate' });
  B.mist(X0, -3, BR0 - 1, 11, 5, 9);

  // Det stora fältet syns långt borta i norr, bortom bron
  {
    const f = B.backdrop(X0, -470, 170, -6, 207, { rings: 10, segs: 56, amp: 3, hills: 6, hillFreq: 0.02 });
    for (let i = 0; i < 18; i++) {
      const ang = rand() * Math.PI * 2, r = rand() * 140, x = X0 + Math.cos(ang) * r, z = -470 + Math.sin(ang) * r;
      B.pine(x, f.H(x, z), z, 2 + rand() * 1.5, false);
    }
  }
  for (const [x, z, r, y] of [[-90, -120, 20, -10], [100, -60, 26, 4], [-120, 40, 22, 10], [110, 110, 18, -6], [-70, -210, 16, 8], [80, -200, 14, -12]]) {
    const b = B.backdrop(X0 + x, z, r, y, 230 + x);
    const h = 10 + r * 0.6;
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, h, 6), M.rock), X0 + x, b.H(X0 + x, z) + h / 2, z);
  }
  // Svävande bråte under bron
  for (let i = 0; i < 26; i++) {
    const z = -80 - rand() * 170, x = X0 + (rand() - 0.5) * 120;
    if (Math.abs(x - X0) < 8) continue;
    B.deco(new THREE.Mesh(rockGeo(1.2 + rand() * 3, 1100 + i, 0.8), M.rock), x, -16 + rand() * 30, z);
  }

  // Träd ovanför klipporna (syns över kanten)
  for (const [x, z, s] of [[-30, 50, 1.4], [26, 50, 1.3], [-36, 0, 1.5], [30, -20, 1.3], [-28, -40, 1.4], [32, 30, 1.2], [-40, 20, 1.3], [36, 10, 1.5], [24, -50, 1.2], [-20, 64, 1.1], [20, 64, 1.2]]) {
    B.pine(X0 + x, H(X0 + x, z), z, s, false);
  }
  for (const [x, z] of [[-4, 52], [6, 36], [-12, 18], [12, -16], [-6, -34]]) B.bush(X0 + x, H(X0 + x, z), z, 0.9);

  // ---------- fiender ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  B.enemy(VV(4, -18), [VV(2, -14), VV(8, -26)]);
  B.enemy(VV(6, -32), [VV(3, -28), VV(7, -38)], { kind: 'shield' });
  B.enemy(VV(-6, 40), [VV(-8, 36), VV(-3, 46)]);
  for (const z of [-115, -195, -228]) B.enemy(V3(X0, DECK, z), [], { kind: 'bat' });
  B.enemy(VV(2, -54), [], { kind: 'bat' });

  a.entries = {
    south: { pos: V3(X0, DECK, 88), facing: Math.PI },
    north: { pos: V3(X0, DECK, BR0 + 9), facing: 0 },
  };
  a.exits = [
    { x0: X0 - 3, x1: X0 + 3, z0: 94.6, z1: 120, to: 'ranch', entry: 'north' },
    { x0: X0 - 3, x1: X0 + 3, z0: -290, z1: BR0 + 2.5, to: 'field', entry: 'south' },
  ];
  a.map.exits = [{ x: X0, z: 94, label: 'Thistledown Ranch', to: 'ranch' }, { x: X0, z: BR0 + 4, label: 'The Stormvale', to: 'field' }];
  B.end();
  return {
    npcs: {
      garrick: { area: 'pass', pos: VV(-0.2, gz + 3.6), face: 0.1 },
      odo: { area: 'pass', pos: V3(X0 - 2.3, DECK + 0.05, restZ + 0.8), face: Math.PI / 2, pose: 'sit' },
    },
    H,
  };
}

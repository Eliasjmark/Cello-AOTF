// Stormreach och The Hollow Cave.
//
// Stormreach (x 5000): ett kargt höglandet norr om The Stormvale, där stormen föds. Vägen slingrar sig
// upp mellan klippor och döda träd till en bergvägg med grottans mynning. Spejaren Fenn har sitt läger där.
//
// The Hollow Cave (x 6000): en kolsvart grotta. Två gamla eldfat måste tändas med lyktan; då
// sjunker stendörren och vägen till The Tempest Bastion öppnas.
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Avstånd från en punkt till en sträcka
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function buildStormreach(B, areas) {
  const { M, rand } = B;
  const reach = buildHighland(B, areas);
  const cave = buildCave(B, areas);
  return {
    npcs: reach.npcs,
    H: reach.H,
    cave,
    onEnter(id, state) {
      if (id === 'cave') cave.setDoor(!!state.caveOpen);
    },
    // Eldfaten i grottan: när båda brinner sjunker dörren
    onTorch(id, story) {
      if (!id.startsWith('cave')) return false;
      const s = story.state;
      if (s.caveOpen || !(s.torches.caveA && s.torches.caveB)) {
        if (!s.caveOpen) story.after(0.8, () => story.hud.toast('The brazier blazes up. Somewhere in the dark, stone groans.', 3200));
        return true;
      }
      s.caveOpen = true;
      cave.openDoor(story);
      return true;
    },
  };
}

// =====================================================================
// Stormreach
// =====================================================================
function buildHighland(B, areas) {
  const { M, rand } = B;
  const X0 = 5000;
  const a = areas.create({
    id: 'stormreach', name: 'Stormreach', sub: 'Where the storm is born', windy: true,
    fog: { color: 0x2c3038, near: 30, far: 230 },
    light: { hemi: 1.2, moon: 1.0, flash: 1.6 },
  });
  B.begin(a);
  B.bounds(X0 - 105, X0 + 105, -100, 140);
  const R = (pts) => pts.map(([x, z]) => [X0 + x, z]);
  const road = R([[0, 112], [0, 92], [-12, 66], [-18, 40], [-6, 12], [12, -10], [15, -32], [5, -52], [0, -66]]);
  const isl = B.island({
    cx: X0, cz: 12, baseR: 102, rNoise: 9, seed: 501, amp: 1.0, hills: 6, hillFreq: 0.022,
    keepAngles: [Math.PI / 2, -Math.PI / 2, Math.PI], depth: 64, rings: 54, segs: 150, label: 'Stormreach',
    topMat: M.rockTop, mapCol: '#3a3833',
    pads: [
      { x: X0, z: 110, r: 6, h: 0 }, { x: X0, z: -64, r: 12, h: 0 }, { x: X0 + 11, z: -48, r: 6, h: 0 },
      { x: X0 - 34, z: 30, r: 9, h: 1.0 },
      { x: X0 - 100, z: 12, r: 7, h: 0 },
    ],
    roads: [{ pts: road, w: 3.4 }],
    grass: 260,
    tint: (x, z) => 0.62 + 0.18 * Math.sin(x * 0.05 + z * 0.03),
  });
  const H = isl.H;
  B.road(road, 3.4, H);

  // Bron från fältet och dimman
  B.bridge('z', 110, 132, X0);
  B.mist(X0, -3, 132, 11, 5, 9);
  // 0.14: bron västerut till The Galecrown (vinden släpper inte förbi någon förrän titanerna har vaknat)
  B.bridge('x', X0 - 132, X0 - 99, 12, DECK, { rails: true });
  B.mist(X0 - 132, -3, 12, 11, 5, 9, { axis: 'x' });
  B.sign(X0 - 94, H(X0 - 94, 16), 16, -Math.PI / 2, ['Carved into a post, the letters scoured by wind:', '"West: the Galecrown. The bridge sings when the wind blows. Lately it screams."']);
  a.map.pois.push({ x: X0 - 116, z: 12, label: 'The Gale Bridge', icon: 'bridge' });

  // ---------- bergväggen i norr med grottans mynning ----------
  const cliffZ = -74;
  for (let i = 0; i < 30; i++) {
    const x = X0 - 92 + i * 6.3 + (hash2(i, 1) - 0.5) * 2;
    const r = 4.5 + hash2(i, 2) * 2.5, hgt = 16 + hash2(i, 3) * 14;
    if (Math.abs(x - X0) - r < 3.2) continue;
    const z = cliffZ - 2 + Math.abs(x - X0) * 0.08 + (hash2(i, 4) - 0.5) * 3;
    const m = new THREE.Mesh(rockGeo(1, 1800 + i, 1.0), M.rock);
    m.scale.set(r, hgt / 2, r * 1.2);
    m.rotation.y = hash2(i, 5) * 6;
    B.solid(place(m, x, H(x, z) + hgt * 0.32, z));
  }
  // Mynningen: två stora stenar och en överliggare, och mörkret innanför
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(rockGeo(1, 1850 + s, 1.0), M.rock);
    m.scale.set(3.4, 9, 4);
    B.solid(place(m, X0 + s * 6.2, H(X0, cliffZ) + 3.5, cliffZ - 1));
  }
  {
    const lintel = new THREE.Mesh(rockGeo(1, 1860, 0.6), M.rock);
    lintel.scale.set(9, 3.2, 4.6);
    B.solid(place(lintel, X0, H(X0, cliffZ) + 8.2, cliffZ - 1.5));
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: 0x030304, fog: false }));
    dark.position.set(X0, H(X0, cliffZ) + 3.5, cliffZ - 6);
    B.add(dark);
    for (const s of [-1, 1]) B.hidden(new THREE.BoxGeometry(1, 8, 12), X0 + s * 3.6, H(X0, cliffZ) + 4, cliffZ - 7);
    B.hidden(new THREE.BoxGeometry(9, 8, 1), X0, H(X0, cliffZ) + 4, cliffZ - 13);
    // Gamla runor kring mynningen
    for (let i = 0; i < 5; i++) B.deco(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), M.runeGlow), X0 - 1.6 + i * 0.8, H(X0, cliffZ) + 6.1, cliffZ + 0.7);
  }
  B.sign(X0 - 4.2, H(X0 - 4.2, cliffZ + 8), cliffZ + 8, 0.3, ['Scratched into the wood:', '"THE HOLLOW CAVE. Beyond it, the Bastion."', '"Bring a light. Bring two."']);
  a.map.pois.push({ x: X0, z: cliffZ - 2, label: 'The Hollow Cave', icon: 'cave' });

  // ---------- Fenns läger vid grottan ----------
  const campFire = V3(X0 + 11, 0, -48);
  campFire.y = H(campFire.x, campFire.z);
  B.campfire(campFire.x, campFire.y, campFire.z, 26);
  B.tent(X0 + 16, H(X0 + 16, -51), -51, -1.2, M.clothGreen, 2.2, 2.6, 1.6);
  B.crate(X0 + 14, H(X0 + 14, -44.5), -44.5, 0.7, 0.4);
  B.barrel(X0 + 15.2, H(X0 + 15.2, -45.5), -45.5);
  B.pot(X0 + 8.6, H(X0 + 8.6, -52), -52);
  a.rests = [{ pos: campFire, entry: 'rest', label: 'Rest by the fire', prompt: "Fenn's fire is the last warm place before the dark. Rest a while?", text: 'Cello rests by the fire in Stormreach...' }];
  a.map.pois.push({ x: campFire.x, z: campFire.z, label: "Fenn's camp", icon: 'fire' });

  // ---------- det förfallna vakttornet och en kista ----------
  {
    const x = X0 - 34, z = 30, y = H(x, z);
    B.ruin(x, y - 0.2, z, 0.8, 6, 8, 11);
    B.chest('reachRuin', x, y + 0.3, z, 0.5, { item: 'potion' });
    a.map.pois.push({ x, z, label: 'Ruined post', icon: 'ruin' });
  }

  // ---------- döda träd, svarta spiror och blixtslagna stenar ----------
  const deadTree = (x, z, s) => {
    const y = H(x, z);
    const trunk = new THREE.Mesh(cyl(0.2 * s, 0.38 * s, 4.2 * s, 6, 1), M.char);
    trunk.rotation.z = (hash2(x, z) - 0.5) * 0.3;
    B.solid(place(trunk, x, y + 2.1 * s, z));
    for (let i = 0; i < 4; i++) {
      const br = new THREE.Mesh(cyl(0.05 * s, 0.12 * s, 1.8 * s, 5, 1), M.char);
      br.rotation.set((hash2(i, x) - 0.5) * 1.4, i * 1.7, (i % 2 ? 1 : -1) * (0.7 + hash2(z, i) * 0.5));
      B.deco(br, x + Math.cos(i * 1.7) * 0.5 * s, y + (2.4 + i * 0.5) * s, z + Math.sin(i * 1.7) * 0.5 * s);
    }
  };
  for (const [x, z, s] of [[-30, 70, 1.2], [26, 60, 1.0], [-44, -10, 1.3], [40, 20, 1.1], [-20, -40, 1.0], [34, -30, 1.2], [-60, 40, 1.0], [60, 50, 1.1], [16, 90, 0.9], [-26, 96, 1.0]]) deadTree(X0 + x, z, s);
  for (const [x, z, h] of [[-50, 60, 12], [52, -6, 15], [-66, -30, 18], [70, 30, 14], [-14, 20, 8], [30, 80, 10]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1.6 + h * 0.08, h, 5), M.obsidian);
    m.rotation.z = (hash2(x, z) - 0.5) * 0.25;
    B.solid(place(m, X0 + x, H(X0 + x, z) + h / 2 - 0.5, z));
  }
  for (let i = 0; i < 46; i++) {
    const ang = rand() * Math.PI * 2, r = 15 + rand() * 78, x = X0 + Math.cos(ang) * r, z = 12 + Math.sin(ang) * r;
    if (road.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6) || z < cliffZ + 4) continue;
    const big = rand() < 0.3;
    B.rock(x, H(x, z), z, big ? 2 + rand() * 2.5 : 0.5 + rand() * 1.2, 1900 + i);
    if (big && rand() < 0.5) B.deco(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.4), M.glow), x, H(x, z) + 0.05, z + 1.6);
  }

  // ---------- kulisser: Bastionens torn bortom bergen, fältet i söder ----------
  {
    const bx = X0 + 10, bz = -330;
    const iron = M.obsidian;
    for (const [dx, dz, w, h] of [[0, 0, 26, 50], [-30, 10, 12, 64], [28, 6, 12, 58], [-12, -20, 10, 76], [14, -16, 8, 70]]) {
      B.deco(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), iron), bx + dx, h / 2 - 10, bz + dz);
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(w * 0.7, w * 1.1, 4), iron), bx + dx, h - 10 + w * 0.5, bz + dz);
    }
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.2), new THREE.MeshBasicMaterial({ color: 0x9fdcff, fog: false }));
    glow.position.set(bx - 12, 52, bz - 14.9);
    B.add(glow);
  }
  for (const [x, z, r, y] of [[-140, -200, 50, 20], [150, -180, 46, 26], [-160, 80, 40, 6], [170, 100, 36, -6]]) {
    const b = B.backdrop(X0 + x, z, r, y, 520 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
    for (let k = 0; k < 5; k++) {
      const px = X0 + x + (k - 2) * r * 0.3, pz = z + Math.sin(k * 1.7) * r * 0.3, h = 26 + hash2(k, x) * 36;
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, h, 6), M.rock), px, b.H(px, pz) + h / 2 - 2, pz);
    }
  }
  B.backdrop(X0, 360, 200, -8, 530, { rings: 10, segs: 56, amp: 3, hills: 6, hillFreq: 0.02 });

  // ---------- fiender ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  const pack = (cx, cz, n, opts = {}) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, h = VV(cx + Math.cos(ang) * 3.5, cz + Math.sin(ang) * 3.5);
      B.enemy(h, [VV(cx + Math.cos(ang + 1) * 6, cz + Math.sin(ang + 1) * 6), VV(cx + Math.cos(ang - 1) * 5, cz + Math.sin(ang - 1) * 5)], i === 0 ? opts : {});
    }
  };
  pack(-14, 52, 3);
  pack(2, 4, 2, { kind: 'shield' });
  pack(14, -24, 3, { kind: 'shield' });
  for (const [x, z] of [[-20, -40], [24, 30], [-40, 70]]) B.enemy(VV(x, z), [], { kind: 'bat' });

  a.entries = {
    south: { pos: V3(X0, DECK, 122), facing: Math.PI },
    cave: { pos: V3(X0, H(X0, cliffZ + 5), cliffZ + 5), facing: 0 },
    rest: { pos: V3(campFire.x - 1.8, H(campFire.x - 1.8, campFire.z + 1.4), campFire.z + 1.4), facing: 2.3 },
    galecrown: { pos: V3(X0 - 112, DECK, 12), facing: Math.PI / 2 },
  };
  a.exits = [
    { x0: X0 - 3, x1: X0 + 3, z0: 131, z1: 160, to: 'field', entry: 'north' },
    { x0: X0 - 3.2, x1: X0 + 3.2, z0: cliffZ - 12, z1: cliffZ - 3.5, to: 'cave', entry: 'south' },
    { x0: X0 - 136, x1: X0 - 126, z0: 9, z1: 15, to: 'galecrown', entry: 'east', gale: true, text: 'The wind parts for Cello...' },
  ];
  a.map.exits = [{ x: X0, z: 131, label: 'The Stormvale', to: 'field' }, { x: X0, z: cliffZ - 4, label: 'The Hollow Cave', to: 'cave' }, { x: X0 - 128, z: 12, label: 'The Galecrown', to: 'galecrown' }];
  B.end();
  return {
    npcs: { fenn: { area: 'stormreach', pos: VV(8.2, -45.6), face: -2.4 } },
    H,
  };
}

// =====================================================================
// The Hollow Cave
// =====================================================================
function buildCave(B, areas) {
  const { M, rand } = B;
  const X0 = 6000;
  const a = areas.create({
    id: 'cave', name: 'The Hollow Cave', sub: 'Darkness under the mountain', dark: true, indoor: true,
    fog: { color: 0x030305, near: 5, far: 30 }, light: { hemi: 0.16, moon: 0.06, flash: 0 },
  });
  B.begin(a);
  B.bounds(X0 - 45, X0 + 45, -100, 72);
  // Gångarna (mittlinjer) och salarna (cirklar)
  const P = (x, z) => [X0 + x, z];
  const tunnels = [
    { pts: [P(0, 70), P(0, 44), P(-4, 36)], w: 3.6 },
    { pts: [P(-4, 18), P(6, 4), P(10, -2)], w: 3.4 },
    { pts: [P(6, -26), P(1, -38), P(0, -60), P(0, -96)], w: 3.4 },
  ];
  const halls = [{ x: X0 - 6, z: 27, r: 10 }, { x: X0 + 10, z: -13, r: 13.5 }];
  const freeDist = (x, z) => {
    let d = Infinity;
    for (const t of tunnels) for (let i = 0; i < t.pts.length - 1; i++) d = Math.min(d, segDist(x, z, ...t.pts[i], ...t.pts[i + 1]) - t.w);
    for (const h of halls) d = Math.min(d, Math.hypot(x - h.x, z - h.z) - h.r);
    return d;
  };
  // Golvet: en platt ö av sten utan gräs
  const isl = B.island({
    cx: X0, cz: -14, baseR: 92, rNoise: 2, seed: 601, amp: 0.35, depth: 20, rings: 40, segs: 96,
    topMat: M.rockTop, grass: 0, label: 'The Hollow Cave', mapCol: '#24221f', map: false,
    tint: (x, z) => 0.45 + 0.2 * Math.max(0, 1 - Math.max(0, freeDist(x, z)) / 6),
  });
  const H = isl.H;
  // Väggarna: stora stenblock där gångarna tar slut
  let n = 0;
  for (let gx = X0 - 44; gx <= X0 + 44; gx += 3.1) {
    for (let gz = -100; gz <= 74; gz += 3.1) {
      const x = gx + (hash2(gx, gz) - 0.5) * 1.6, z = gz + (hash2(gz, gx) - 0.5) * 1.6;
      const d = freeDist(x, z);
      const r = 2.2 + hash2(x, z) * 1.4, hgt = 7 + hash2(z, x) * 5;
      if (d < r * 0.82 || d > r + 2.6) continue;
      const m = new THREE.Mesh(rockGeo(1, 2000 + (n++ % 40), 1.0), M.rock);
      m.scale.set(r, hgt / 2, r);
      m.rotation.y = hash2(x, z) * 6;
      B.solid(place(m, x, H(x, z) + hgt * 0.35, z));
    }
  }
  // 0.21.2: en osynlig vägg i ett band precis utanför gångarna och salarna. Stenblocken ovan har glipor
  // mellan sig, och genom dem kunde Cello gå ut i det mörka bergets inre (resten av grottans golv).
  const bandBox = new THREE.BoxGeometry(1.15, 12, 1.15);
  for (let gx = X0 - 46; gx <= X0 + 46; gx += 1.0) {
    for (let gz = -104; gz <= 78; gz += 1.0) {
      const d = freeDist(gx, gz);
      if (d < 0.45 || d > 1.75) continue;
      B.hidden(bandBox, gx, H(gx, gz) + 5, gz);
    }
  }
  // Taket: ett mörkt valv med droppstenar
  {
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(100, 180), new THREE.MeshLambertMaterial({ color: 0x141312, side: THREE.DoubleSide }));
    roof.rotation.x = Math.PI / 2;
    roof.position.set(X0, 9.5, -14);
    B.add(roof);
    for (let i = 0; i < 60; i++) {
      const x = X0 + (rand() - 0.5) * 80, z = -96 + rand() * 166;
      if (freeDist(x, z) > 1) continue;
      const h = 1 + rand() * 2.6;
      const st = new THREE.Mesh(new THREE.ConeGeometry(0.25 + rand() * 0.35, h, 5), M.rock);
      st.rotation.x = Math.PI;
      B.deco(st, x, 9.5 - h / 2, z);
    }
  }
  // Lysande kristaller som visar vägen (svagt)
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0x4a8ab0 });
  for (const [x, z, s] of [[-3.5, 48, 0.8], [-14, 20, 1.0], [4, 30, 0.7], [2, 10, 0.6], [20, -4, 1.0], [-2, -16, 0.9], [18, -24, 0.8], [-2.5, -50, 0.7], [3, -70, 0.9]]) {
    const cx = X0 + x, cz = z;
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, (0.8 + k * 0.35) * s, 4), crystalMat);
      c.rotation.set((k - 1) * 0.4, k, (k - 1) * 0.3);
      B.deco(c, cx + (k - 1) * 0.25, H(cx, cz) + 0.35 * s, cz + (k % 2) * 0.2);
    }
    B.lights.add({ x: cx, y: H(cx, cz) + 1.0, z: cz, color: 0x4a8ab0, power: 3, range: 6, flicker: 0.1 });
  }
  // Ben och bråte på golvet
  for (let i = 0; i < 24; i++) {
    const ang = rand() * Math.PI * 2, h = halls[i % 2], r = rand() * (h.r - 2);
    const x = h.x + Math.cos(ang) * r, z = h.z + Math.sin(ang) * r;
    if (i % 3 === 0) B.deco(new THREE.Mesh(box(0.08, 0.08, 0.6, 1), M.white), x, H(x, z) + 0.05, z).rotation.y = ang;
    else B.rock(x, H(x, z), z, 0.3 + rand() * 0.5, 2100 + i, false);
  }

  // ---------- eldfaten ----------
  const torchA = B.torch('caveA', X0 - 13, H(X0 - 13, 25), 25, { h: 1.3 });
  const torchB = B.torch('caveB', X0 + 20.5, H(X0 + 20.5, -16), -16, { h: 1.3 });
  for (const t of [torchA, torchB]) {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      B.deco(new THREE.Mesh(box(0.5, 0.05, 0.12, 1), M.runeGlow), t.pos.x + Math.cos(ang) * 1.4, t.pos.y + 0.03, t.pos.z + Math.sin(ang) * 1.4).rotation.y = -ang;
    }
  }
  a.map.pois.push({ x: torchA.pos.x, z: torchA.pos.z, label: 'Brazier', icon: 'fire' });
  a.map.pois.push({ x: torchB.pos.x, z: torchB.pos.z, label: 'Brazier', icon: 'fire' });

  // ---------- stendörren ----------
  const doorZ = -44;
  const doorY = H(X0, doorZ);
  for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(1.6, 8, 2.2, 2), M.rock), X0 + s * 4.4, doorY + 4, doorZ));
  B.solid(place(new THREE.Mesh(box(10.4, 1.6, 2.2, 2), M.rock), X0, doorY + 7.4, doorZ));
  for (const s of [-1, 1]) B.hidden(new THREE.BoxGeometry(6, 9, 1.6), X0 + s * 7.6, doorY + 4.5, doorZ);
  const door = new THREE.Group();
  door.position.set(X0, doorY, doorZ);
  B.add(door);
  door.add(place(new THREE.Mesh(box(7.2, 6.6, 1.0, 2), M.rock), 0, 3.3, 0));
  const doorRunes = new THREE.MeshBasicMaterial({ color: 0x2a3440 });
  for (let i = 0; i < 4; i++) door.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.04), doorRunes), -1.5 + i, 3.6 + (i % 2) * 0.6, 0.52));
  door.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 4, 12), doorRunes), 0, 4.2, 0.52));
  let doorBox = null;
  a.connectFns.push((c) => { doorBox = c.addBox(X0 - 3.7, doorY - 1, doorZ - 0.6, X0 + 3.7, doorY + 7, doorZ + 0.6, 'caveDoor'); });
  const D = { open: false, t: 1, anim: false };
  a.updaters.push((t, dt) => {
    if (!D.anim) return;
    D.t = Math.min(1, D.t + dt / 3.2);
    door.position.y = doorY - D.t * 6.8 + Math.sin(t * 40) * 0.03 * (1 - D.t);
    if (D.t >= 1) { D.anim = false; door.visible = false; }
  });
  a.map.pois.push({ x: X0, z: doorZ, label: 'Stone door', icon: 'gate' });

  // Ljuset från fästningen längst i norr
  B.lights.add({ x: X0, y: 3, z: -88, color: 0x8fb4dc, power: 18, range: 22 });
  B.mist(X0, -1, -96, 8, 4, 7, { color: 0x6a7a90 });

  // ---------- fiender, krukor och en kista ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  B.enemy(VV(-4, 24), [VV(-9, 30), VV(-1, 20)]);
  B.enemy(VV(8, -8), [VV(4, -4), VV(14, -16)]);
  B.enemy(VV(14, -18), [VV(18, -10), VV(8, -20)], { kind: 'shield' });
  B.enemy(VV(-1, 32), [], { kind: 'bat' });
  B.enemy(VV(6, -12), [], { kind: 'bat' });
  B.enemy(VV(0, -54), [], { kind: 'bat' });
  for (const [x, z] of [[-12, 32], [-11, 33.4], [17, -4], [22, -8], [-1, -26]]) B.pot(X0 + x, H(X0 + x, z), z, 0.9);
  B.chest('caveChest', X0 - 1, H(X0 - 1, -22), -22, 0.8, { shards: 15 });

  a.entries = {
    south: { pos: VV(0, 56), facing: Math.PI },
    north: { pos: VV(0, -76), facing: 0 },
  };
  a.exits = [
    { x0: X0 - 3.6, x1: X0 + 3.6, z0: 64, z1: 90, to: 'stormreach', entry: 'cave' },
    { x0: X0 - 3.6, x1: X0 + 3.6, z0: -120, z1: -92, to: 'bastion', entry: 'south' },
  ];
  // Kartan: gångarna och salarna som formen på grottan
  a.map.lines.push(...tunnels.map((t) => ({ pts: t.pts, kind: 'tunnel', w: t.w * 2 })));
  a.map.halls = halls;
  a.map.exits = [{ x: X0, z: 64, label: 'Stormreach', to: 'stormreach' }, { x: X0, z: -92, label: 'The Tempest Bastion', to: 'bastion' }];
  B.end();

  return {
    torches: [torchA, torchB],
    setDoor(open) {
      D.open = open;
      D.anim = false;
      D.t = open ? 1 : 0;
      door.visible = !open;
      door.position.y = open ? doorY - 6.8 : doorY;
      doorRunes.color.set(open ? 0x7fdcff : 0x2a3440);
      if (doorBox) doorBox.enabled = !open;
    },
    openDoor(story) {
      story.cinematic = true;
      story.combat.unlock(true);
      story.holdMusic('ballad', 30);
      story.after(0.9, () => {
        story.rig.cinematic = { pos: V3(X0 + 6, doorY + 4, doorZ + 12), look: V3(X0, doorY + 2.6, doorZ), glide: true, speed: 1.4 };
        doorRunes.color.set(0x7fdcff);
        story.sfx.play('secret');
        story.lights.flash(V3(X0, doorY + 3, doorZ + 1), 0x9fdcff, 30, 14, 0.6);
      });
      story.after(2.0, () => {
        D.anim = true;
        D.t = 0;
        story.sfx.play('crumble', { vol: 1 });
        story.rig.shake(0.4);
        if (doorBox) doorBox.enabled = false;
      });
      story.after(5.6, () => {
        story.rig.cinematic = null;
        story.cinematic = false;
        story.hud.toast('The stone door has sunk into the floor. The way north lies open.', 4200);
        story.save(true);
      });
    },
  };
}

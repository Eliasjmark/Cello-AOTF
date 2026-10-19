// The Stormvale: det stora fältet. En ö så stor att den ser ut som sammanhängande land, med kullar,
// vägar, ruiner, en stencirkel, en fallen gudastaty, skogsdungar och sjöar.
// Härifrån går vägarna till Willowmere i öster, Stormreach i norr och stormstenen i sydost.
import * as THREE from 'three';
import { box, cyl, rockGeo, place, breakTop, hash2 } from '../geom.js';
import { StonePath, DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const X0 = 3000;

export function buildField(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'field', name: 'The Stormvale', sub: 'The great plain under the storm',
    fog: { color: 0x3a404b, near: 70, far: 520 },
  });
  B.begin(a);
  B.bounds(X0 - 240, X0 + 300, -262, 262);
  const R = (pts) => pts.map(([x, z]) => [X0 + x, z]);
  const mainRoad = R([[0, 224], [0, 190], [-8, 150], [-14, 110], [-6, 70], [10, 40], [12, 0], [4, -40], [-8, -80], [-10, -120], [-2, -160], [0, -200], [0, -224]]);
  const eastRoad = R([[10, 40], [50, 30], [100, 10], [150, -10], [190, -30], [222, -40]]);
  const stoneRoad = R([[100, 10], [130, 40], [160, 68], [184, 86]]);
  const westRoad = R([[10, 40], [-40, 30], [-100, 20], [-160, 10], [-224, 0]]);
  const roads = [mainRoad, eastRoad, stoneRoad, westRoad].map((pts) => ({ pts, w: 4 }));
  const cross = V3(X0 + 10, 0, 40);
  const isl = B.island({
    cx: X0, cz: 0, baseR: 225, rNoise: 22, seed: 301, amp: 0.8, hills: 7, hillFreq: 0.011,
    keepAngles: [Math.PI / 2, -Math.PI / 2, -0.18, 0.42, Math.PI], depth: 90, rings: 66, segs: 210, label: 'The Stormvale',
    pads: [
      { x: X0, z: 224, r: 7, h: 0 }, { x: X0, z: -224, r: 7, h: 0.1 }, { x: X0 + 222, z: -40, r: 7, h: 0.1 },
      { x: cross.x, z: cross.z, r: 14, h: 0.5 }, { x: X0 + 190, z: 90, r: 12, h: 0.3 }, { x: X0 - 224, z: 0, r: 6, h: 0.1 },
      { x: X0 - 100, z: 120, r: 14, h: 1.5 }, { x: X0 - 70, z: -60, r: 12, h: 0.4 },
    ],
    roads,
    dips: [{ x: X0 + 60, z: -160, r: 22, depth: 2.4 }, { x: X0 - 60, z: 60, r: 10, depth: 1.4 }],
    grass: 3600,
    tint: (x, z) => 0.9 + 0.12 * Math.sin(x * 0.03 + Math.cos(z * 0.025) * 2),
  });
  const H = isl.H;
  for (const r of roads) B.road(r.pts, r.w, H);

  // ---------- broar och dimma vid gränserna ----------
  B.bridge('z', 222, 258, X0); // den långa bron, sista biten
  B.mist(X0, -3, 258, 11, 5, 9);
  B.bridge('z', -256, -222, X0); // norrut mot Stormreach
  B.mist(X0, -3, -256, 11, 5, 9);
  B.bridge('x', X0 + 220, X0 + 256, -40); // österut mot Willowmere
  B.mist(X0 + 256, -3, -40, 11, 5, 9, { axis: 'x' });
  // Den västra bron är bruten; vägen dit försvann i stormen
  B.bridge('x', X0 - 238, X0 - 222, 0);
  B.sign(X0 - 218, H(X0 - 218, 3), 3, -Math.PI / 2, ['"West: the Sunken Road."', 'The bridge beyond ends in empty air. Whatever lay west is lost in the storm... for now.']);

  // ---------- korsvägen och Mags läger ----------
  B.sign(cross.x + 4, H(cross.x + 4, cross.z - 4), cross.z - 4, -0.4, [
    '"North: Stormreach. Beware the storm."', '"East: Willowmere, the village by the mere."', '"South: the Long Bridge and Galewind Pass."', '"West: the Sunken Road (closed)."',
  ]);
  const camp = V3(X0 + 24, 0, 52);
  camp.y = H(camp.x, camp.z);
  B.cart(camp.x + 3, camp.y, camp.z - 2, 0.3, { cover: M.linen, load: true });
  B.tent(camp.x - 4, H(camp.x - 4, camp.z + 3), camp.z + 3, 2.4, M.clothPurple);
  const campFire = V3(camp.x, camp.y, camp.z + 2);
  B.campfire(campFire.x, campFire.y, campFire.z, 26);
  B.lampPost(camp.x + 5.5, H(camp.x + 5.5, camp.z + 2), camp.z + 2, 8);
  for (const [dx, dz] of [[1.5, -4], [2.4, -4.6]]) B.crate(camp.x + dx, H(camp.x + dx, camp.z + dz), camp.z + dz, 0.7, dx);
  B.pot(camp.x - 1.6, H(camp.x - 1.6, camp.z - 3), camp.z - 3);
  a.rests = [{ pos: campFire, entry: 'rest', label: 'Rest by the fire', prompt: "Mags' fire crackles under the storm. Rest a while?", text: 'Cello rests by the fire at the crossroads...' }];
  a.map.pois.push({ x: campFire.x, z: campFire.z, label: "Mags' camp", icon: 'fire' });
  a.map.pois.push({ x: cross.x, z: cross.z - 8, label: 'Crossroads', icon: 'gate' });

  // ---------- ruiner, stencirkel och gudastatyn ----------
  B.ruin(X0 - 70, H(X0 - 70, -60) - 0.2, -60, 0.4, 8, 10, 7);
  a.map.pois.push({ x: X0 - 70, z: -60, label: 'Old Ruins', icon: 'ruin' });
  {
    // Ett gammalt tempel med murrester
    const x = X0 + 90, z = -110, y = H(x, z);
    const g = B.groupAt(x, y, z, 0.6);
    B.put(g, new THREE.Mesh(box(16, 0.6, 12, 2), M.marble), 0, 0, 0, true);
    B.put(g, new THREE.Mesh(box(16, 3.4, 1.2, 2), M.brick), 0, 1.9, -5.4, true);
    B.put(g, new THREE.Mesh(box(1.2, 2.2, 9, 2), M.brick), -7.4, 1.3, -1, true);
    B.put(g, new THREE.Mesh(box(1.2, 4.4, 5, 2), M.brick), 7.4, 2.4, -3, true);
    for (const px of [-5, -1.5, 2, 5.5]) B.put(g, new THREE.Mesh(breakTop(cyl(0.5, 0.55, 3 + hash2(px, z) * 3, 10), 3, 0.5), M.marble), px, 1.8, 4.5, true);
    B.chest('fieldTemple', x - 2, y + 0.3, z - 2, 0.6, { shards: 20 });
    a.map.pois.push({ x, z, label: 'Old Temple', icon: 'ruin' });
  }
  {
    // Stencirkeln: svarta stenar i en ring, med en kista i mitten
    const cx = X0 - 100, cz = 120, y = H(cx, cz);
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2, h = 4 + hash2(i, 3) * 2.5;
      const x = cx + Math.cos(ang) * 10, z = cz + Math.sin(ang) * 10;
      const m = new THREE.Mesh(box(1.3, h, 0.9, 2), M.obsidian);
      m.rotation.y = -ang;
      m.rotation.z = (hash2(i, 7) - 0.5) * 0.12;
      B.solid(place(m, x, H(x, z) + h / 2 - 0.3, z));
    }
    B.solid(place(new THREE.Mesh(cyl(2.2, 2.6, 0.5, 12, 2), M.rock), cx, y + 0.1, cz));
    B.chest('fieldHenge', cx, y + 0.35, cz, 0, { shards: 50 });
    a.map.pois.push({ x: cx, z: cz, label: 'Stone Circle', icon: 'ruin' });
  }
  {
    // Den fallna gudastatyn: ben som står kvar, en bål som ligger och ett huvud i gräset
    const x = X0 + 70, z = 140, y = H(x, z);
    for (const s of [-1, 1]) {
      B.solid(place(new THREE.Mesh(box(3.2, 1.2, 4.6, 2), M.marble), x + s * 3, y + 0.5, z + 0.6));
      B.solid(place(new THREE.Mesh(breakTop(cyl(1.3, 1.6, 9, 10, 2), 9, 1.2), M.marble), x + s * 3, y + 5.4, z));
    }
    B.solid(place(new THREE.Mesh(box(12, 1.6, 4, 2), M.marble), x, y + 1.2, z + 9));
    const torso = new THREE.Mesh(box(7, 9, 4.4, 2), M.marble);
    torso.rotation.set(Math.PI / 2 - 0.1, 0.4, 0.1);
    B.solid(place(torso, x - 9, y + 2.0, z + 14));
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 1), M.marble);
    head.rotation.set(0.6, 1.2, 0.3);
    B.solid(place(head, x + 12, y + 2.4, z + 18));
    for (let i = 0; i < 8; i++) B.rock(x - 14 + i * 4, H(x - 14 + i * 4, z + 22), z + 22 + (i % 3), 0.6 + hash2(i, 9), 1300 + i, true, M.marble);
    a.map.pois.push({ x, z, label: 'Fallen Colossus', icon: 'ruin' });
  }
  {
    // Ett förfallet vakttorn vid vägen norrut
    const x = X0 + 18, z = -190;
    B.watchtower(x, H(x, z), z, 0.3, 6);
    B.torch('fieldTower', x - 4, H(x - 4, z), z + 3);
  }

  // ---------- det stora trädet, sjöarna och skogsdungarna ----------
  {
    const x = X0 - 40, z = -150, y = H(x, z);
    B.oak(x, y, z, 3.2, M.leafDark);
    for (const [dx, dz] of [[3, 2], [-3, 3], [2, -3]]) B.rock(x + dx * 1.6, H(x + dx * 1.6, z + dz * 1.6), z + dz * 1.6, 0.9, 1400 + dx * 3);
    a.map.pois.push({ x, z, label: 'Old Oak', icon: 'tree' });
  }
  B.water(X0 + 60, H(X0 + 60, -160) + 1.6, -160, 15, 13);
  B.water(X0 - 60, H(X0 - 60, 60) + 0.9, 60, 7, 6);
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2, x = X0 + 60 + Math.cos(ang) * 15.6, z = -160 + Math.sin(ang) * 13.6;
    B.deco(new THREE.Mesh(box(0.06, 1.1, 0.06, 1), M.crop), x, H(x, z) + 0.5, z);
  }
  const grove = (cx, cz, n, rad, pineShare = 0.6) => {
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2, r = Math.sqrt(rand()) * rad, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
      if (roads.some((rd) => rd.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6))) continue;
      const s = 0.9 + rand() * 0.8;
      if (rand() < pineShare) B.pine(x, H(x, z), z, s * 1.2); else B.oak(x, H(x, z), z, s);
    }
  };
  grove(X0 - 150, -80, 26, 30);
  grove(X0 + 140, 130, 18, 22, 0.3);
  grove(X0 - 110, -190, 20, 24);
  grove(X0 + 150, -150, 14, 18);
  grove(X0 - 170, 90, 12, 18, 0.4);
  grove(X0 + 40, 190, 10, 16, 0.5);
  for (let i = 0; i < 70; i++) {
    const ang = rand() * Math.PI * 2, r = 20 + rand() * 190, x = X0 + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (roads.some((rd) => rd.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7))) continue;
    if (rand() < 0.5) B.rock(x, H(x, z), z, 0.5 + rand() * 1.6, 1500 + i);
    else B.bush(x, H(x, z), z, 0.8 + rand() * 0.6);
  }
  for (let i = 0; i < 26; i++) {
    const ang = rand() * Math.PI * 2, r = 10 + rand() * 200, x = X0 + Math.cos(ang) * r, z = Math.sin(ang) * r;
    B.flowers(x, H(x, z), z, 6, 1.6);
  }

  // ---------- stormstenen i sydost och stenvägen mot den gyllene porten ----------
  const stonePos = V3(X0 + 192, 0, 86);
  stonePos.y = H(stonePos.x, stonePos.z);
  const stoneRunes = new THREE.MeshBasicMaterial({ color: 0x2a3440 });
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x7a4c2e, emissive: 0x000000, flatShading: true });
  {
    const g = new THREE.Group();
    g.position.copy(stonePos);
    g.rotation.set(0.04, 0.4, 0.05);
    a.S.add(g);
    B.solid(place(new THREE.Mesh(box(1.3, 7, 1.3, 2), M.obsidian), 0, 3.1, 0), g);
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.02), stoneRunes);
      r.position.set(0, 1.4 + i * 1.2, 0.66);
      r.userData.keep = true;
      g.add(r);
    }
  }
  const plate = V3(X0 + 190.5, 0, 89);
  plate.y = H(plate.x, plate.z);
  {
    const p = new THREE.Mesh(cyl(0.95, 1.0, 0.14, 10, 1), plateMat);
    p.userData.keep = true;
    B.add(place(p, plate.x, plate.y + 0.04, plate.z));
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 2.6), stoneRunes);
    groove.position.set(plate.x + 0.7, plate.y + 0.02, plate.z - 1.4);
    groove.rotation.y = 0.48;
    B.add(groove);
  }
  a.map.pois.push({ x: stonePos.x, z: stonePos.z, label: 'Storm Stone', icon: 'stone' });
  // Stenvägen österut (reser sig när stormstenen vaknar)
  const eastStones = [];
  for (let i = 0; i < 12; i++) eastStones.push({ x: X0 + 230 + i * 2.9, z: 90 + (hash2(i, 7) - 0.5) * 0.5 });
  const eastPath = new StonePath(a.root, eastStones, M);
  a.connectFns.push((c) => eastPath.connect(c));
  a.updaters.push((t, dt) => eastPath.update(dt));
  a.map.lines.push({ pts: [[X0 + 228, 90], [X0 + 264, 90]], kind: 'stones', when: 'eastPath' });
  // Udden med den gyllene porten
  const gateIsl = B.island({ cx: X0 + 278, cz: 90, baseR: 9, rNoise: 1, seed: 329, amp: 0.25, keepAngles: [Math.PI], depth: 14, rings: 14, segs: 48, pads: [{ x: X0 + 278, z: 90, r: 8, h: 0.05 }], grass: 40, label: '' });
  const gy = gateIsl.H(X0 + 281, 90);
  {
    const gx = X0 + 281.5;
    [-1.8, 1.8].forEach((dz) => B.solid(place(new THREE.Mesh(box(0.9, 4.6, 0.9, 1.5), M.marble), gx, gy + 2.3, 90 + dz)));
    B.deco(new THREE.Mesh(box(1.2, 0.7, 4.8, 1.5), M.marble), gx, gy + 4.9, 90);
    const disc = new THREE.Mesh(cyl(0.9, 0.9, 0.16, 16, 1), M.gold);
    disc.rotation.z = Math.PI / 2;
    B.deco(disc, gx - 0.5, gy + 4.9, 90);
    B.solid(place(new THREE.Mesh(box(0.3, 3.6, 2.8, 1.2), M.gold), gx, gy + 1.8, 90));
  }
  a.map.pois.push({ x: X0 + 281, z: 90, label: 'Golden Gate', icon: 'gate', when: 'eastPath' });
  // Pyramiden långt i öster
  {
    const p = B.backdrop(X0 + 560, 70, 40, 30, 341, { topMat: M.rockTop, rings: 8, segs: 36 });
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(32, 46, 4, 1), M.gold);
    pyr.rotation.y = Math.PI / 4;
    B.deco(pyr, X0 + 560, p.H(X0 + 560, 70) + 23, 70);
  }

  // ---------- kulisser: Stormreach och stormens öga i norr, Willowmere i öster ----------
  for (const [x, z, r, y] of [[-60, -380, 60, 20], [50, -420, 70, 34], [-160, -350, 40, 8], [150, -360, 44, 14]]) {
    const b = B.backdrop(X0 + x, z, r, y, 360 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
    for (let k = 0; k < 6; k++) {
      const px = X0 + x + (k - 2.5) * r * 0.28, pz = z + Math.sin(k * 1.7) * r * 0.3, h = 30 + hash2(k, x) * 40;
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, h, 6), M.rock), px, b.H(px, pz) + h / 2 - 2, pz);
    }
  }
  // Stormens öga: ett mörkt molnhjul långt i norr, där blixtarna slår
  {
    const swirl = new THREE.Group();
    swirl.position.set(X0, 120, -620);
    B.add(swirl);
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.smokeTex, color: 0x1e2028, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      const ang = (i / 14) * Math.PI * 2, r = 60 + (i % 3) * 30;
      sp.position.set(Math.cos(ang) * r, (i % 4) * 8, Math.sin(ang) * r * 0.4);
      sp.scale.set(140, 70, 1);
      swirl.add(sp);
    }
    a.updaters.push((t) => { swirl.rotation.y = t * 0.03; });
  }
  {
    const w = B.backdrop(X0 + 330, -40, 56, 2, 371, { rings: 8, segs: 36 });
    for (const [dx, dz] of [[-10, -8], [4, -14], [12, 6], [-4, 12], [16, -2]]) {
      const x = X0 + 330 + dx, z = -40 + dz, y = w.H(x, z);
      B.deco(new THREE.Mesh(box(5, 3, 4, 2), M.plaster), x, y + 1.5, z);
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.4, 4).rotateY(Math.PI / 4), M.roofRed), x, y + 4.1, z);
    }
    B.deco(new THREE.Mesh(cyl(2.0, 2.8, 7, 8, 2), M.plaster), X0 + 312, w.H(X0 + 312, -60) + 3.5, -60);
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.6, 8), M.roofBrown), X0 + 312, w.H(X0 + 312, -60) + 8.3, -60);
  }
  for (const [x, z, r, y] of [[-330, 120, 40, -10], [-300, -120, 30, 12], [260, 230, 26, -14], [-90, 330, 30, 6], [120, 320, 20, -8]]) B.backdrop(X0 + x, z, r, y, 380 + x);

  // ---------- fiender ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  const pack = (cx, cz, n, opts = {}) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, h = VV(cx + Math.cos(ang) * 4, cz + Math.sin(ang) * 4);
      B.enemy(h, [VV(cx + Math.cos(ang + 1) * 7, cz + Math.sin(ang + 1) * 7), VV(cx + Math.cos(ang - 1) * 6, cz + Math.sin(ang - 1) * 6)], i === 0 ? opts : {});
    }
  };
  pack(-70, -48, 3);
  pack(90, -96, 2, { kind: 'shield' });
  pack(-100, 104, 3, { kind: 'shield' });
  pack(60, 120, 2);
  pack(-14, -110, 2);
  pack(150, 0, 2);
  pack(-150, 30, 2);
  for (const [x, z] of [[-40, -146], [60, -150], [0, -205]]) B.enemy(VV(x, z), [], { kind: 'bat' });

  a.entries = {
    south: { pos: V3(X0, DECK, 247), facing: Math.PI },
    north: { pos: V3(X0, DECK, -236), facing: 0 },
    east: { pos: V3(X0 + 246, DECK, -40), facing: -Math.PI / 2 },
    rest: { pos: V3(campFire.x + 1.8, H(campFire.x + 1.8, campFire.z + 1.4), campFire.z + 1.4), facing: -2.3 },
  };
  a.exits = [
    { x0: X0 - 3, x1: X0 + 3, z0: 256.5, z1: 300, to: 'pass', entry: 'north' },
    { x0: X0 - 3, x1: X0 + 3, z0: -300, z1: -254.5, to: 'stormreach', entry: 'south' },
    { x0: X0 + 254.5, x1: X0 + 300, z0: -43, z1: -37, to: 'willowmere', entry: 'west' },
  ];
  a.map.exits = [
    { x: X0, z: 255, label: 'The Long Bridge', to: 'pass' },
    { x: X0, z: -254, label: 'Stormreach', to: 'stormreach' },
    { x: X0 + 254, z: -40, label: 'Willowmere', to: 'willowmere' },
  ];
  B.end();

  return {
    npcs: {
      mags: { area: 'field', pos: VV(26.5, 49.5), face: -2.6 },
    },
    animals: [{ kind: 'horse', area: 'field', pos: VV(-150, 60), center: VV(-150, 60), radius: 22, H }],
    east: { plate, stone: stonePos, end: V3(X0 + 278, gy, 90), gate: V3(X0 + 279.6, gy, 90) },
    eastPath,
    slamEast: (p) => areas.id === 'field' && Math.hypot(p.x - plate.x, p.z - plate.z) < 1.9,
    lightEast(on) {
      stoneRunes.color.set(on ? 0x7fdcff : 0x2a3440);
      plateMat.emissive.set(on ? 0x2a6a88 : 0x000000);
    },
    H,
  };
}

// Willowmere: byn vid sjön, långt österut på The Stormvale. Här handlar man (Pells butik),
// vilar på värdshuset Willow & Wick och får veta nästa uppdrag av spåkvinnan Ysolde.
// Byn har en palissad med en port i väster, ett torg med brunn, en sjö med brygga och hängpilar,
// en väderkvarn i nordost och trädgårdar. Inga fiender kommer hit (sjön håller dem borta).
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const X0 = 4000;

export function buildWillowmere(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'willowmere', name: 'Willowmere', sub: 'The village by the mere', safe: true,
    fog: { color: 0x3c424c, near: 45, far: 300 },
    light: { hemi: 1.6, moon: 1.3, flash: 1 },
  });
  B.begin(a);
  B.bounds(X0 - 100, X0 + 70, -70, 70);
  const L = (x, z) => [X0 + x, z];
  const MERE = { x: X0 + 24, z: 22, r: 18 };
  const westRoad = [L(-62, 0), L(-48, 0), L(-30, 1), L(-12, 0)];
  const northRoad = [L(0, -9), L(6, -22), L(18, -32), L(27, -36)];
  const eastRoad = [L(9, -2), L(22, -4), L(34, -5)];
  const southRoad = [L(0, 9), L(-4, 20), L(-6, 28)];
  const isl = B.island({
    cx: X0, cz: 0, baseR: 62, rNoise: 5, seed: 401, amp: 0.35, hills: 1.4, hillFreq: 0.03,
    keepAngles: [Math.PI], depth: 32, rings: 46, segs: 128, label: 'Willowmere', mapCol: '#2f3b2c',
    pads: [
      { x: X0 - 62, z: 0, r: 5, h: 0 }, { x: X0, z: 0, r: 12, h: 0.15 },
      { x: X0 - 10, z: -15, r: 6.5, h: 0.2 }, { x: X0 + 12, z: -17, r: 7.5, h: 0.2 }, { x: X0 - 22, z: -14, r: 5.5, h: 0.25 },
      { x: X0 - 24, z: 13, r: 5.5, h: 0.2 }, { x: X0 - 10, z: 22, r: 5.5, h: 0.2 }, { x: X0 + 41, z: -9, r: 7, h: 0.2 },
      { x: X0 + 28, z: -38, r: 6, h: 0.4 }, { x: X0 - 46, z: 0, r: 6, h: 0 }, { x: X0 + 24, z: 8, r: 4, h: 0.1 },
    ],
    roads: [westRoad, northRoad, eastRoad, southRoad].map((pts) => ({ pts, w: 3 })),
    dips: [{ x: MERE.x, z: MERE.z, r: MERE.r, depth: 2.4 }],
    grass: 900,
    avoid: (x, z) => Math.hypot(x - MERE.x, z - MERE.z) < 14.5 || Math.hypot(x - X0, z) < 10.5
      || [[-10, -15, 5], [12, -17, 6], [-22, -14, 4.5], [-24, 13, 4.5], [-10, 22, 4.5], [41, -9, 5], [28, -38, 4]].some(([hx, hz, r]) => Math.hypot(x - X0 - hx, z - hz) < r),
  });
  const H = isl.H;
  for (const r of [westRoad, northRoad, eastRoad, southRoad]) B.road(r, 3, H);

  // ---------- bron från fältet och dimman där den börjar ----------
  B.bridge('x', X0 - 84, X0 - 60, 0);
  B.mist(X0 - 84, -3, 0, 11, 5, 9, { axis: 'x' });

  // ---------- palissaden och västra porten ----------
  const palX = X0 - 50;
  for (const [z0, z1] of [[-34, -3.2], [3.2, 34]]) {
    for (let z = z0; z <= z1; z += 0.7) {
      const h = 2.6 + hash2(z, 3) * 0.6;
      const p = new THREE.Mesh(cyl(0.2, 0.22, h, 6, 1), M.woodDark);
      B.deco(p, palX + (hash2(z, 9) - 0.5) * 0.12, H(palX, z) + h / 2 - 0.2, z);
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 6), M.woodDark), palX, H(palX, z) + h - 0.05, z);
    }
    B.hidden(new THREE.BoxGeometry(0.6, 3.4, z1 - z0 + 0.4), palX, H(palX, (z0 + z1) / 2) + 1.5, (z0 + z1) / 2);
    B.deco(new THREE.Mesh(box(0.12, 0.14, z1 - z0, 1), M.wood), palX + 0.25, H(palX, (z0 + z1) / 2) + 1.6, (z0 + z1) / 2);
  }
  // Portvalvet med en skylt och två lyktor
  for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(0.5, 4.4, 0.5, 1), M.woodDark), palX, H(palX, s * 3) + 2.2, s * 3.1));
  B.deco(new THREE.Mesh(box(0.4, 0.4, 7, 1), M.woodDark), palX, H(palX, 0) + 4.3, 0);
  {
    const sg = new THREE.Mesh(box(0.12, 0.8, 3.4, 1), M.wood);
    B.deco(sg, palX - 0.3, H(palX, 0) + 3.6, 0);
    // Fyra små plankor som bokstäver (byns namn syns som ristningar)
    for (let i = 0; i < 6; i++) B.deco(new THREE.Mesh(box(0.04, 0.2, 0.3, 1), M.woodDark), palX - 0.38, H(palX, 0) + 3.6, -1.25 + i * 0.5);
  }
  B.watchtower(palX + 4, H(palX + 4, -8), -8, 0, 6);
  B.lampPost(palX + 2, H(palX + 2, 4.5), 4.5, 10);
  B.lampPost(palX + 2, H(palX + 2, -4.5), -4.5, 10);
  B.sign(X0 - 56, H(X0 - 56, 3.4), 3.4, -Math.PI / 2, ['"Willowmere. Travelers welcome, Ashlings not."', '"Shop, inn and the mere straight ahead."']);

  // ---------- torget: kullersten, brunn och anslagstavla ----------
  {
    const g = new THREE.CircleGeometry(9.5, 32);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 3, p.getZ(i) / 3);
    const sq = new THREE.Mesh(g, M.cobble);
    B.deco(sq, X0, H(X0, 0) + 0.06, 0);
    B.well(X0, H(X0, 0) + 0.05, 0);
    // Anslagstavlan
    const bx = X0 + 5.5, bz = 5.5, by = H(bx, bz);
    const gb = B.groupAt(bx, by, bz, -0.6);
    B.put(gb, new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.woodDark), -0.8, 1.1, 0, true);
    B.put(gb, new THREE.Mesh(box(0.14, 2.2, 0.14, 1), M.woodDark), 0.8, 1.1, 0, true);
    B.put(gb, new THREE.Mesh(box(1.9, 1.1, 0.08, 1), M.wood), 0, 1.5, 0.04);
    for (const [px, py, m] of [[-0.5, 1.7, M.linen], [0.3, 1.55, M.linen], [-0.2, 1.25, M.paper ?? M.linen], [0.55, 1.2, M.linen]]) {
      B.put(gb, new THREE.Mesh(box(0.4, 0.5, 0.02, 1), m), px, py, 0.1);
    }
    const front = B.local(gb, 0, 0, 1.2);
    B.signs.push({
      area: a.id, pos: V3(front.x, by, front.z), label: 'Read the notice board', lines: [
        'Notices are pinned to the board, flapping in the wind.',
        '"LOST: a brown mare with a white blaze. Answers to Brindle. Reward in apples. —Hollis of Thistledown"',
        '"The Willow & Wick has beds. Rosa cooks. Do not ask what."',
        '"By order of the watch: no one goes north to Stormreach without a light."',
        '"Fortunes told, roads found. Ysolde, by the mere."',
      ],
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      if (i % 2) continue;
      B.lampPost(X0 + Math.cos(ang) * 10.5, H(X0 + Math.cos(ang) * 10.5, Math.sin(ang) * 10.5), Math.sin(ang) * 10.5, 9);
    }
    B.bench(X0 - 6, H(X0 - 6, 6.5), 6.5, 0.6);
    B.bench(X0 + 6.8, H(X0 + 6.8, -5), -5, 2.4);
  }

  // ---------- Pells butik ----------
  const shop = B.house(X0 - 10, H(X0 - 10, -15), -15, 0, {
    w: 7.2, d: 6, h: 3, wall: M.plaster, roof: M.roofGreen, shutter: M.clothGreen, label: "Pell's Provisions", lightPower: 10,
  });
  {
    // Skylt som hänger ut från väggen, med en lykta målad på
    const g = B.groupAt(X0 - 10, H(X0 - 10, -15), -15, 0);
    B.put(g, new THREE.Mesh(box(0.1, 0.1, 1.2, 1), M.woodDark), 2.2, 2.9, 3.6);
    B.put(g, new THREE.Mesh(box(0.08, 0.7, 0.9, 1), M.wood), 2.2, 2.45, 3.95);
    B.put(g, new THREE.Mesh(box(0.1, 0.32, 0.22, 1), M.gold), 2.15, 2.45, 3.95);
    // Varor utanför: tunnor, lådor och en kärra
    for (const [x, z] of [[-3.6, 4.2], [-4.4, 3.5]]) B.barrel(X0 - 10 + x, H(X0 - 10 + x, -15 + z), -15 + z);
    B.crate(X0 - 10 + 3.8, H(X0 - 6.2, -11), -11, 0.8, 0.3);
    B.crate(X0 - 10 + 4.2, H(X0 - 5.8, -11.9) + 0.8, -11.9, 0.6, 0.9, false);
    B.pot(X0 - 15.2, H(X0 - 15.2, -10.6), -10.6, 0.9);
    B.pot(X0 - 4.4, H(X0 - 4.4, -10.4), -10.4, 0.8);
  }
  B.sign(X0 - 13.4, H(X0 - 13.4, -10.2), -10.2, 0.2, ['"Pell\'s Provisions."', '"Lanterns · Oil · Healing Draughts · Blades."', 'Underneath, smaller: "No credit. Not even for heroes."']);

  // ---------- värdshuset Willow & Wick ----------
  const inn = B.house(X0 + 12, H(X0 + 12, -17), -17, 0, {
    w: 9.5, d: 6.6, h: 3.3, wall: M.plaster, roof: M.roofRed, shutter: M.clothRed, label: 'Willow & Wick', lightPower: 12, doorX: -1.6,
  });
  {
    // Uteserveringen: bord, bänkar och en tunna
    B.table(X0 + 15.5, H(X0 + 15.5, -9.5), -9.5, 0.1);
    B.bench(X0 + 15.5, H(X0 + 15.5, -8.4), -8.4, 0.1);
    B.bench(X0 + 15.5, H(X0 + 15.5, -10.6), -10.6, 0.1);
    B.barrel(X0 + 19, H(X0 + 19, -12), -12);
    B.pot(X0 + 18.6, H(X0 + 18.6, -13.2), -13.2, 0.85);
    // Värdshusskylten: ett pilblad och ett ljus
    const g = B.groupAt(X0 + 12, H(X0 + 12, -17), -17, 0);
    B.put(g, new THREE.Mesh(box(0.1, 0.1, 1.3, 1), M.woodDark), 3.2, 3.1, 3.9);
    B.put(g, new THREE.Mesh(box(0.08, 0.8, 1.0, 1), M.wood), 3.2, 2.6, 4.3);
    B.put(g, new THREE.Mesh(box(0.1, 0.5, 0.12, 1), M.lamp), 3.15, 2.6, 4.3);
    // Hö och ved vid gaveln
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3 - r; i++) {
      const log = new THREE.Mesh(cyl(0.15, 0.15, 1.4, 7, 1), M.bark);
      log.rotation.x = Math.PI / 2;
      B.deco(log, X0 + 17.6 + (i - 1 + r * 0.5) * 0.32, H(X0 + 17.6, -17) + 0.16 + r * 0.28, -17);
    }
  }

  // ---------- andra hus ----------
  const homes = [
    [-22, -14, 0.25, M.roofBlue, M.clothBlue],
    [-24, 13, Math.PI - 0.2, M.roofBrown, M.clothGreen],
    [-10, 22, Math.PI + 0.15, M.roofRed, M.clothOchre],
  ];
  // 0.11: dörrarna behövs när folket går hem för natten
  const homeDoors = homes.map(([x, z, ry, roof, sh]) => B.house(X0 + x, H(X0 + x, z), z, ry, { w: 5.6, d: 4.8, h: 2.6, wall: M.plaster, roof, shutter: sh }).door);
  // Trädgårdar bakom husen
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const x = X0 - 34 + i * 1.4, z = 8 + row * 1.8, y = H(x, z);
      if (row === 1) B.deco(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), M.cabbage), x, y + 0.2, z);
      else B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 5), M.crop), x, y + 0.4, z);
    }
  }
  B.fence([[X0 - 35.2, 6.6], [X0 - 26.2, 6.6], [X0 - 26.2, 13.6]], H, { gap: 1.6 });
  for (const [x, z] of [[-26, -9], [-19.5, -9.3], [-28, 17], [-5.6, 26]]) B.pot(X0 + x, H(X0 + x, z), z, 0.85);

  // ---------- sjön (The Mere), bryggan och hängpilarna ----------
  // Vattenytan ligger lite under den lägsta punkten på stranden, så att den aldrig svämmar över
  let bank = Infinity;
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI * 2;
    bank = Math.min(bank, H(MERE.x + Math.cos(ang) * 12.8, MERE.z + Math.sin(ang) * 12.8));
  }
  const waterY = Math.max(H(MERE.x, MERE.z) + 0.6, bank - 0.25);
  B.water(MERE.x, waterY, MERE.z, 14, 14);
  // Osynlig kant så att Cello inte vadar ut i sjön (en lucka vid bryggan)
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * Math.PI * 2;
    const x = MERE.x + Math.cos(ang) * 12.4, z = MERE.z + Math.sin(ang) * 12.4;
    if (Math.abs(x - MERE.x) < 1.8 && z < MERE.z) continue;
    B.hidden(new THREE.BoxGeometry(2.2, 3, 0.6), x, H(x, z) + 1.2, z, 0, -ang + Math.PI / 2, 0);
  }
  // Vass och stenar längs stranden
  for (let i = 0; i < 46; i++) {
    const ang = (i / 46) * Math.PI * 2 + hash2(i, 4) * 0.1;
    if (Math.abs(Math.cos(ang)) < 0.12 && Math.sin(ang) < 0) continue;
    const r = 13 + hash2(i, 7) * 1.6, x = MERE.x + Math.cos(ang) * r, z = MERE.z + Math.sin(ang) * r;
    B.deco(new THREE.Mesh(box(0.05, 0.9 + hash2(i, 2) * 0.5, 0.05, 1), M.crop), x, H(x, z) + 0.45, z);
    if (i % 5 === 0) B.rock(x, H(x, z), z, 0.5 + hash2(i, 1) * 0.4, 1700 + i, false);
  }
  // Bryggan ut i sjön, med Fenwicks fiskespö
  const dockZ0 = MERE.z - 13.6, dockZ1 = MERE.z - 4.5;
  B.bridge('z', dockZ0, dockZ1, MERE.x, waterY + 0.55, { rails: true });
  B.hidden(new THREE.BoxGeometry(2.6, 1.6, 0.4), MERE.x, waterY + 1.3, dockZ1 + 0.2);
  for (const sx of [-1, 1]) for (const z of [dockZ0 + 2, dockZ1 - 0.3]) B.deco(new THREE.Mesh(cyl(0.12, 0.12, 2.4, 6, 1), M.woodDark), MERE.x + sx * 1.1, waterY - 0.4, z);
  {
    const rod = new THREE.Mesh(box(0.04, 0.04, 3.2, 1), M.woodDark);
    rod.rotation.x = -0.5;
    B.deco(rod, MERE.x + 0.5, waterY + 1.6, dockZ1 + 0.6);
    const line = new THREE.Mesh(box(0.01, 2.2, 0.01, 1), M.linen);
    B.deco(line, MERE.x + 0.5, waterY + 1.1, dockZ1 + 2.0);
    B.deco(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), M.clothRed), MERE.x + 0.5, waterY + 0.02, dockZ1 + 2.0);
    B.deco(new THREE.Mesh(cyl(0.22, 0.2, 0.3, 8, 1), M.wood), MERE.x - 0.6, waterY + 0.7, dockZ1 - 0.6);
  }
  // En liten båt vid stranden
  {
    const g = B.groupAt(MERE.x - 9, waterY + 0.05, MERE.z - 6, 0.7);
    B.put(g, new THREE.Mesh(box(1.3, 0.5, 3.2, 1), M.wood), 0, 0.15, 0);
    B.put(g, new THREE.Mesh(box(1.1, 0.1, 3.0, 1), M.woodDark), 0, 0.42, 0);
    B.put(g, new THREE.Mesh(box(1.3, 0.1, 0.25, 1), M.wood), 0, 0.45, 0.4);
  }
  // Hängpilarna
  for (const [x, z, s] of [[7, 13, 1.1], [39, 12, 1.0], [41, 31, 1.2], [12, 37, 1.1], [29, 41, 0.95], [3, 30, 0.9]]) B.willowTree(X0 + x, H(X0 + x, z), z, s);
  B.flowers(X0 + 4, H(X0 + 4, 9), 9, 7);
  B.flowers(X0 + 36, H(X0 + 36, 4), 4, 6);

  // ---------- Ysoldes hydda vid sjön ----------
  const hut = { x: X0 + 42, z: -10 };
  let ysoldeSpot;
  {
    const y = H(hut.x, hut.z);
    const g = B.groupAt(hut.x, y, hut.z, -0.4);
    // Runda väggar med en öppning mot vägen
    const wallMat = M.plaster.clone();
    wallMat.side = THREE.DoubleSide;
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.1, 2.6, 14, 1, true, 0.55, Math.PI * 2 - 1.1), wallMat);
    B.put(g, walls, 0, 1.3, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.6, 14), M.thatch);
    B.put(g, roof, 0, 3.7, 0);
    // Tygstycken och små amuletter som hänger i öppningen
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(box(0.06, 0.5 + (i % 2) * 0.3, 0.06, 1), i % 2 ? M.clothPurple : M.gold);
      B.put(g, c, -1.0 + i * 0.5, 2.1 - (i % 2) * 0.15, 3.05);
    }
    B.put(g, new THREE.Mesh(box(3.2, 0.12, 0.6, 1), M.clothPurple), 0, 2.45, 3.1);
    // Kollision för hyddan (utan öppningen)
    B.hidden(new THREE.CylinderGeometry(3.1, 3.1, 3, 10), hut.x, y + 1.5, hut.z);
    // Bordet med kristallkulan och en pall
    const tp = B.local(g, 0, 0, 4.4);
    B.table(tp.x, H(tp.x, tp.z), tp.z, -0.4);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: 0x9a8ad8 }));
    ball.userData.solo = true;
    ball.position.set(tp.x, H(tp.x, tp.z) + 1.08, tp.z);
    B.add(ball);
    B.deco(new THREE.Mesh(cyl(0.16, 0.2, 0.1, 8, 1), M.gold), tp.x, H(tp.x, tp.z) + 0.9, tp.z);
    for (const [dx, dz] of [[-0.55, 0.15], [0.55, -0.1]]) {
      B.deco(new THREE.Mesh(cyl(0.05, 0.05, 0.2, 6, 1), M.linen), tp.x + dx, H(tp.x, tp.z) + 0.95, tp.z + dz);
      B.deco(new THREE.Mesh(box(0.03, 0.06, 0.03, 1), M.lamp), tp.x + dx, H(tp.x, tp.z) + 1.08, tp.z + dz);
    }
    B.lights.add({ x: tp.x, y: H(tp.x, tp.z) + 1.6, z: tp.z, color: 0xb09aff, power: 7, range: 6, flicker: 0.4 });
    a.updaters.push((t) => {
      const k = 0.5 + Math.sin(t * 1.7) * 0.25 + Math.sin(t * 4.3) * 0.08;
      ball.material.color.setRGB(0.45 + k * 0.3, 0.42 + k * 0.25, 0.75 + k * 0.25);
      ball.rotation.y = t * 0.4;
    });
    ysoldeSpot = B.local(g, 0.05, 0, 3.4);
    B.deco(new THREE.Mesh(cyl(0.28, 0.3, 0.42, 8, 1), M.woodDark), ysoldeSpot.x, H(ysoldeSpot.x, ysoldeSpot.z) + 0.21, ysoldeSpot.z);
    a.map.pois.push({ x: hut.x, z: hut.z, label: 'Seer', icon: 'seer' });
  }

  // ---------- väderkvarnen och en gömd kista bakom den ----------
  B.windmill(X0 + 28, H(X0 + 28, -38), -38, -0.5, 1.0);
  B.chest('willowMill', X0 + 33.5, H(X0 + 33.5, -44.5), -44.5, -2.4, { shards: 20 });
  for (const [x, z, r] of [[22, -44, 0.3], [34, -33, 1.4]]) B.hayBale(X0 + x, H(X0 + x, z), z, r);

  // ---------- hönsgården ----------
  {
    const cx = X0 - 6, cz = -34;
    B.fence([[cx - 5, cz - 4], [cx + 5, cz - 4], [cx + 5, cz + 4], [cx - 5, cz + 4], [cx - 5, cz - 4]], H, { gap: 1.6, collide: true, skip: [14, 15] });
    const g = B.groupAt(cx - 2.5, H(cx - 2.5, cz - 2), cz - 2, 0);
    B.put(g, new THREE.Mesh(box(2, 1.3, 1.6, 1), M.wood), 0, 0.65, 0, true);
    const r = new THREE.Mesh(box(2.4, 0.12, 1.2, 1), M.roofBrown);
    r.rotation.x = 0.5;
    B.put(g, r, 0, 1.5, 0.35);
    const r2 = r.clone();
    r2.rotation.x = -0.5;
    B.put(g, r2, 0, 1.5, -0.35);
  }

  // ---------- träd runt kanten ----------
  for (const [x, z, s] of [[-40, -28, 1.2], [-36, 30, 1.1], [-14, 44, 1.2], [8, 52, 1.0], [48, 18, 1.1], [52, -24, 1.2], [14, -48, 1.1], [-20, -44, 1.3], [-44, 22, 1.0], [-30, -38, 1.0]]) {
    (hash2(x, z) > 0.4 ? B.oak : B.pine)(X0 + x, H(X0 + x, z), z, s);
  }
  for (const [x, z] of [[-38, -8], [-30, 26], [20, 48], [50, 2], [-2, -46], [44, -30]]) B.bush(X0 + x, H(X0 + x, z), z, 1.0);

  // ---------- kulisser: fältet i väster, Stormreach i norr och pyramiden i öster ----------
  {
    const f = B.backdrop(X0 - 330, 30, 190, -4, 411, { rings: 10, segs: 56, amp: 3, hills: 6, hillFreq: 0.02 });
    for (let i = 0; i < 16; i++) {
      const ang = rand() * Math.PI * 2, r = 40 + rand() * 120, x = X0 - 330 + Math.cos(ang) * r, z = 30 + Math.sin(ang) * r;
      B.pine(x, f.H(x, z), z, 2 + rand(), false);
    }
  }
  for (const [x, z, r, y] of [[-120, -320, 60, 22], [20, -360, 50, 30], [140, -300, 40, 12]]) {
    const b = B.backdrop(X0 + x, z, r, y, 420 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
    for (let k = 0; k < 5; k++) {
      const px = X0 + x + (k - 2) * r * 0.3, pz = z + Math.sin(k * 1.9) * r * 0.3, h = 30 + hash2(k, x) * 40;
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, h, 6), M.rock), px, b.H(px, pz) + h / 2 - 2, pz);
    }
  }
  {
    const p = B.backdrop(X0 + 250, 120, 40, 26, 431, { topMat: M.rockTop, rings: 8, segs: 36 });
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(30, 44, 4, 1), M.gold);
    pyr.rotation.y = Math.PI / 4;
    B.deco(pyr, X0 + 250, p.H(X0 + 250, 120) + 22, 120);
  }
  for (const [x, z, r, y] of [[120, -80, 22, -8], [90, 140, 18, 10], [-60, 150, 20, -12]]) B.backdrop(X0 + x, z, r, y, 440 + x);

  a.entries = {
    west: { pos: V3(X0 - 70, DECK, 0), facing: Math.PI / 2 },
    shop: { pos: shop.door.clone(), facing: 0 },
    inn: { pos: inn.door.clone(), facing: 0 },
  };
  a.exits = [{ x0: X0 - 120, x1: X0 - 81, z0: -3, z1: 3, to: 'field', entry: 'east' }];
  a.doors = [{ pos: shop.door, to: 'shop', entry: 'door', label: "Enter Pell's Provisions" }];
  a.map.exits = [{ x: X0 - 82, z: 0, label: 'The Stormvale', to: 'field' }];
  a.map.pois.push({ x: shop.door.x, z: shop.door.z - 4, label: 'Shop', icon: 'shop' });
  a.map.pois.push({ x: inn.door.x + 1.6, z: inn.door.z - 4, label: 'Inn', icon: 'fire' });
  B.end();

  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  const innFront = inn.door.clone();
  return {
    npcs: {
      rosa: { area: 'willowmere', pos: V3(innFront.x + 1.4, innFront.y, innFront.z - 0.2), face: -0.3 },
      ysolde: { area: 'willowmere', pos: V3(ysoldeSpot.x, H(ysoldeSpot.x, ysoldeSpot.z), ysoldeSpot.z), face: -0.4, pose: 'sit' },
      doran: { area: 'willowmere', pos: VV(-46.5, 4.2), face: -Math.PI / 2 },
      fenwick: { area: 'willowmere', pos: V3(MERE.x - 0.4, waterY + 0.6, dockZ1 - 0.2), face: 0, pose: 'sit' },
      mira: { area: 'willowmere', pos: VV(4, 6), face: 0, wander: { center: VV(0, 0), radius: 6.5 } },
      tob: { area: 'willowmere', pos: VV(-4, -6), face: 0, wander: { center: VV(1, 1), radius: 7.4 } },
    },
    animals: [0, 1, 2, 3, 4].map((i) => ({ kind: 'chicken', area: 'willowmere', pos: VV(-6 + (i - 2) * 1.1, -34 + (i % 2) * 1.4), center: VV(-5, -34), radius: 3.2, H })),
    hut: V3(hut.x, H(hut.x, hut.z), hut.z),
    homeDoors,
    H,
  };
}

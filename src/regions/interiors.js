// Interiörer: Pells butik i Willowmere och Cellos hus. Rummen ligger långt bort i
// koordinatsystemet (x 7000 och 7100) och nås genom dörrarna.
import * as THREE from 'three';
import { box, cyl, rockGeo, place } from '../geom.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Ett rum med golv, väggar, tak och en dörröppning i framväggen (+z).
// Väggarna ses inifrån; kameran stannar innanför dem.
function room(B, cx, w, d, h, o = {}) {
  const { M } = B;
  const T = 0.4;
  const floor = new THREE.Mesh(box(w, 0.4, d, 2), o.floor ?? M.floor);
  B.solid(place(floor, cx, -0.2, 0));
  const wall = o.wall ?? M.plaster;
  B.solid(place(new THREE.Mesh(box(w + T * 2, h, T, 2), wall), cx, h / 2, -d / 2 - T / 2));
  for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(T, h, d, 2), wall), cx + s * (w / 2 + T / 2), h / 2, 0));
  const dw = 1.6, side = (w - dw) / 2;
  for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(side + T, h, T, 2), wall), cx + s * (dw / 2 + (side + T) / 2), h / 2, d / 2 + T / 2));
  B.solid(place(new THREE.Mesh(box(dw, h - 2.3, T, 2), wall), cx, 2.3 + (h - 2.3) / 2, d / 2 + T / 2));
  // Taket och takbjälkarna
  B.solid(place(new THREE.Mesh(box(w + T * 2, 0.3, d + T * 2, 2), M.woodDark), cx, h + 0.15, 0));
  for (let x = -w / 2 + 1.2; x < w / 2; x += 2.2) B.deco(new THREE.Mesh(box(0.22, 0.26, d, 1), M.woodDark), cx + x, h - 0.13, 0);
  // Golvlister och hörnstolpar
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.deco(new THREE.Mesh(box(0.26, h, 0.26, 1), M.woodDark), cx + sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.1));
  // Dörrkarmen och ljuset utifrån i öppningen
  for (const s of [-1, 1]) B.deco(new THREE.Mesh(box(0.16, 2.3, 0.5, 1), M.woodDark), cx + s * (dw / 2 + 0.08), 1.15, d / 2 + 0.2);
  B.deco(new THREE.Mesh(box(dw + 0.3, 0.16, 0.5, 1), M.woodDark), cx, 2.35, d / 2 + 0.2);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(dw, 2.3), new THREE.MeshBasicMaterial({ color: o.outside ?? 0x8a96aa, fog: false }));
  glow.position.set(cx, 1.15, d / 2 + 0.75);
  glow.rotation.y = Math.PI;
  B.add(glow);
  // Mattan
  B.deco(new THREE.Mesh(box(2.4, 0.03, 3.2, 1), o.rug ?? M.clothRed), cx, 0.02, d / 2 - 2.4);
  return { door: V3(cx, 0, d / 2 - 3.6) };
}

export function buildInteriors(B, areas) {
  const { M } = B;

  // =====================================================================
  // Pells butik (Pell's Provisions)
  // =====================================================================
  const SX = 7000;
  const s = areas.create({
    id: 'shop', name: "Pell's Provisions", indoor: true, card: false, safe: true,
    fog: { color: 0x15100c, near: 14, far: 40 }, light: { hemi: 0.75, moon: 0.35, flash: 0 },
  });
  B.begin(s);
  B.bounds(SX - 8, SX + 8, -7, 7);
  const W = 12, D = 10, Hh = 4.2;
  const r1 = room(B, SX, W, D, Hh, { rug: M.clothGreen });
  // Disken tvärs över rummet, med Pell bakom
  const counterZ = -1.6;
  B.solid(place(new THREE.Mesh(box(6.4, 1.0, 0.8, 1), M.wood), SX - 0.6, 0.5, counterZ));
  B.deco(new THREE.Mesh(box(6.6, 0.08, 0.95, 1), M.woodDark), SX - 0.6, 1.04, counterZ);
  // Våg och en liten hög skärvor på disken
  B.deco(new THREE.Mesh(box(0.5, 0.05, 0.3, 1), M.gold), SX + 1.4, 1.11, counterZ);
  B.deco(new THREE.Mesh(cyl(0.02, 0.02, 0.4, 4, 1), M.gold), SX + 1.4, 1.3, counterZ);
  B.deco(new THREE.Mesh(box(0.7, 0.03, 0.06, 1), M.gold), SX + 1.4, 1.5, counterZ);
  for (let i = 0; i < 5; i++) {
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: [0x4ad06a, 0x4a8ae0, 0xd8382f][i % 3] }));
    B.deco(sh, SX - 2.4 + i * 0.12, 1.14, counterZ + (i % 2) * 0.1);
  }
  // Hyllor längs bakväggen med burkar, flaskor och säckar
  for (const y of [0.9, 1.8, 2.7]) B.deco(new THREE.Mesh(box(W - 1.5, 0.08, 0.6, 1), M.woodDark), SX, y, -D / 2 + 0.35);
  for (let i = 0; i < 18; i++) {
    const x = SX - W / 2 + 1.2 + (i % 9) * 1.15, y = i < 9 ? 1.08 : 1.98;
    if (i % 3 === 0) B.deco(new THREE.Mesh(cyl(0.16, 0.18, 0.34, 8, 1), M.copper), x, y, -D / 2 + 0.35);
    else if (i % 3 === 1) B.deco(new THREE.Mesh(box(0.34, 0.3, 0.3, 1), M.sack), x, y - 0.02, -D / 2 + 0.35);
    else B.deco(new THREE.Mesh(cyl(0.1, 0.12, 0.38, 6, 1), M.linen), x, y + 0.02, -D / 2 + 0.35);
  }
  for (let i = 0; i < 6; i++) B.deco(new THREE.Mesh(box(0.5, 0.4, 0.4, 1), M.sack), SX - 4 + i * 1.6, 2.92, -D / 2 + 0.35);

  // Vänster vägg: oljehyllan och drycker
  const shelf = (x, z, items) => {
    B.solid(place(new THREE.Mesh(box(0.6, 2.2, 1.8, 1), M.woodDark), x, 1.1, z));
    for (const y of [0.75, 1.45]) B.deco(new THREE.Mesh(box(0.7, 0.06, 1.9, 1), M.wood), x + 0.05, y, z);
    items(x, z);
  };
  const potionMat = new THREE.MeshLambertMaterial({ color: 0xd8382f, emissive: 0x4a0a08 });
  const oilMat = new THREE.MeshLambertMaterial({ color: 0xc89040, emissive: 0x2a1806 });
  shelf(SX - W / 2 + 0.4, 0.2, (x, z) => {
    for (let k = 0; k < 6; k++) {
      const jar = new THREE.Mesh(cyl(0.13, 0.15, 0.32, 8, 1), oilMat);
      B.deco(jar, x + 0.1, (k < 3 ? 0.95 : 1.65), z - 0.6 + (k % 3) * 0.6);
      B.deco(new THREE.Mesh(cyl(0.06, 0.06, 0.08, 6, 1), M.woodDark), x + 0.1, (k < 3 ? 1.15 : 1.85), z - 0.6 + (k % 3) * 0.6);
    }
  });
  shelf(SX - W / 2 + 0.4, 3.0, (x, z) => {
    for (let k = 0; k < 6; k++) {
      const y = k < 3 ? 0.95 : 1.65, zz = z - 0.55 + (k % 3) * 0.55;
      B.deco(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), potionMat), x + 0.1, y, zz);
      B.deco(new THREE.Mesh(cyl(0.04, 0.05, 0.14, 6, 1), M.linen), x + 0.1, y + 0.18, zz);
    }
  });
  // Höger vägg: svärdsstället och lyktan på ett ställ
  const rackX = SX + W / 2 - 0.35, rackZ = 0.4;
  {
    B.solid(place(new THREE.Mesh(box(0.3, 0.2, 2.2, 1), M.woodDark), rackX, 0.6, rackZ));
    B.deco(new THREE.Mesh(box(0.3, 0.2, 2.2, 1), M.woodDark), rackX, 1.9, rackZ);
    const steel = new THREE.MeshLambertMaterial({ color: 0xc4ccd6, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const z = rackZ - 0.7 + i * 0.7;
      B.deco(new THREE.Mesh(box(0.04, 1.3, 0.1, 1), steel), rackX - 0.12, 1.45, z);
      B.deco(new THREE.Mesh(box(0.06, 0.06, 0.4, 1), M.gold), rackX - 0.12, 0.8, z);
      B.deco(new THREE.Mesh(box(0.05, 0.3, 0.05, 1), M.leather ?? M.woodDark), rackX - 0.12, 0.62, z);
    }
  }
  const standX = SX + 4.0, standZ = 3.0;
  B.solid(place(new THREE.Mesh(cyl(0.1, 0.14, 1.1, 6, 1), M.woodDark), standX, 0.55, standZ));
  B.deco(new THREE.Mesh(cyl(0.35, 0.35, 0.06, 8, 1), M.woodDark), standX, 1.1, standZ);
  // Lyktan (göms när Cello har köpt den)
  const lantern = new THREE.Group();
  {
    const brass = new THREE.MeshLambertMaterial({ color: 0xb08a3c, emissive: 0x2a1c06, flatShading: true });
    lantern.add(place(new THREE.Mesh(cyl(0.16, 0.18, 0.06, 6, 1), brass), 0, 0, 0));
    lantern.add(place(new THREE.Mesh(cyl(0.13, 0.13, 0.3, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.8 })), 0, 0.18, 0));
    lantern.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.14, 6), brass), 0, 0.4, 0));
    lantern.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 8), brass), 0, 0.52, 0));
    lantern.position.set(standX, 1.14, standZ);
    B.add(lantern);
  }
  // Fat, lådor och en tunna med paraplyer (nej, spjut)
  B.barrel(SX - 3.6, 0, -3.8);
  B.barrel(SX + 4.6, 0, -3.6);
  B.crate(SX + 3.4, 0, -3.8, 0.8, 0.2);
  B.crate(SX - 4.6, 0, 4.0, 0.7, 0.5);
  // Hängande lampor
  for (const x of [SX - 2.5, SX + 2.5]) {
    B.deco(new THREE.Mesh(box(0.03, 0.8, 0.03, 1), M.rope), x, Hh - 0.4, 0.5);
    B.deco(new THREE.Mesh(box(0.3, 0.32, 0.3, 1), M.lamp), x, Hh - 0.95, 0.5);
    B.lights.add({ x, y: Hh - 1.2, z: 0.5, color: 0xffc070, power: 16, range: 11, flicker: 0.2 });
  }
  B.lights.add({ x: SX, y: 2.2, z: 4.4, color: 0x8a9ab8, power: 4, range: 6 });
  s.entries = { door: { pos: r1.door.clone(), facing: Math.PI } };
  s.exits = [{ x0: SX - 0.8, x1: SX + 0.8, z0: D / 2 + 0.3, z1: D / 2 + 3, to: 'willowmere', entry: 'shop' }];
  s.map.rects.push({ kind: 'room', x: SX, z: 0, w: W, d: D, ry: 0 });
  s.map.exits = [{ x: SX, z: D / 2 + 0.5, label: 'Willowmere', to: 'willowmere' }];
  B.end();

  // =====================================================================
  // Cellos hus
  // =====================================================================
  const HX = 7100;
  const h = areas.create({
    id: 'house', name: "Cello's House", indoor: true, card: false, safe: true,
    fog: { color: 0x15100c, near: 12, far: 36 }, light: { hemi: 0.7, moon: 0.3, flash: 0 },
  });
  B.begin(h);
  B.bounds(HX - 7, HX + 7, -6, 6);
  const HW = 10, HD = 8, HH = 3.6;
  const r2 = room(B, HX, HW, HD, HH, { wall: M.plaster, rug: M.clothBlue, outside: 0x9aa2b0 });
  // Härden i bakre högra hörnet
  const hearth = { x: HX + 3.2, z: -HD / 2 + 0.7 };
  B.solid(place(new THREE.Mesh(box(2.4, 1.1, 1.2, 1.5), M.brick), hearth.x, 0.55, hearth.z));
  B.solid(place(new THREE.Mesh(box(1.6, HH, 0.9, 1.5), M.brick), hearth.x, HH / 2, hearth.z - 0.2));
  B.deco(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M.obsidian), hearth.x, 0.6, hearth.z + 0.61);
  B.makeFire(hearth.x, 0.15, hearth.z + 0.75, 0.55, 22, 0);
  for (const dx of [-0.25, 0.25]) {
    const log = new THREE.Mesh(cyl(0.08, 0.08, 0.7, 6, 1), M.char);
    log.rotation.set(0, dx * 2, Math.PI / 2, 'YXZ');
    B.deco(log, hearth.x, 0.1, hearth.z + 0.75);
  }
  // Sängen (0.20: här vaknar Cello när ett nytt spel börjar)
  const bed = V3(HX - 3.4, 0.5, -HD / 2 + 1.5);
  {
    const bx = bed.x, bz = bed.z;
    B.solid(place(new THREE.Mesh(box(1.4, 0.5, 2.4, 1), M.wood), bx, 0.25, bz));
    B.deco(new THREE.Mesh(box(1.3, 0.14, 2.2, 1), M.linen), bx, 0.56, bz);
    B.deco(new THREE.Mesh(box(1.32, 0.12, 1.4, 1), M.clothRed), bx, 0.63, bz + 0.35);
    B.deco(new THREE.Mesh(box(0.8, 0.14, 0.4, 1), M.white), bx, 0.68, bz - 0.8);
    B.deco(new THREE.Mesh(box(1.4, 0.9, 0.1, 1), M.wood), bx, 0.45, bz - 1.2);
    h.rests = [{
      pos: V3(bx + 1.3, 0, bz + 0.4), entry: 'bed', radius: 1.6, label: 'Sleep in bed',
      prompt: "Cello's own bed. It still smells of pine. Sleep a while?", text: 'Cello sleeps in his own bed...',
    }];
    h.entries = { bed: { pos: V3(bx + 1.4, 0, bz + 0.6), facing: Math.PI / 2 } };
  }
  // Bordet med två pallar, en skål och ett ljus
  {
    const tx = HX + 0.4, tz = -0.4;
    B.table(tx, 0, tz, 0);
    for (const s2 of [-1, 1]) B.solid(place(new THREE.Mesh(cyl(0.22, 0.24, 0.45, 8, 1), M.woodDark), tx + s2 * 1.2, 0.22, tz));
    B.deco(new THREE.Mesh(cyl(0.2, 0.12, 0.12, 8, 1), M.wood), tx - 0.3, 0.91, tz);
    B.deco(new THREE.Mesh(cyl(0.05, 0.05, 0.2, 6, 1), M.linen), tx + 0.4, 0.95, tz + 0.1);
    B.deco(new THREE.Mesh(box(0.04, 0.07, 0.04, 1), M.lamp), tx + 0.4, 1.09, tz + 0.1);
    B.lights.add({ x: tx + 0.4, y: 1.5, z: tz + 0.1, color: 0xffc070, power: 6, range: 6, flicker: 0.5 });
  }
  // Hylla med krukor och en bok, svärdskrok och sköldkrok vid dörren
  B.deco(new THREE.Mesh(box(2.4, 0.08, 0.4, 1), M.woodDark), HX - 1.0, 1.8, -HD / 2 + 0.25);
  for (let i = 0; i < 4; i++) B.deco(new THREE.Mesh(cyl(0.12, 0.14, 0.28, 8, 1), i % 2 ? M.copper : M.sack), HX - 1.9 + i * 0.6, 1.98, -HD / 2 + 0.25);
  B.deco(new THREE.Mesh(box(0.5, 0.06, 0.35, 1), M.clothBlue), HX - 0.2, 1.88, -HD / 2 + 0.25);
  for (const z of [1.0, 2.2]) B.deco(new THREE.Mesh(box(0.16, 0.16, 0.16, 1), M.woodDark), HX - HW / 2 + 0.15, 1.6, z);
  B.barrel(HX + 4.1, 0, 2.8);
  // 0.20: en vägglykta vid slipstenen och relikhyllan (de nya sakerna i huset, se home.js)
  for (const [lx, lz, dx] of [[HX - HW / 2 + 0.2, 1.6, 0.18], [HX + HW / 2 - 0.2, 1.9, -0.18]]) {
    B.deco(new THREE.Mesh(box(0.3, 0.06, 0.08, 1), M.woodDark), lx + dx * 0.4, 2.35, lz);
    B.deco(new THREE.Mesh(box(0.2, 0.26, 0.2, 1), M.lamp), lx + dx, 2.18, lz);
    B.lights.add({ x: lx + dx * 2.5, y: 2.1, z: lz, color: 0xffc070, power: 9, range: 7, flicker: 0.3 });
  }
  B.crate(HX + 3.0, 0, 3.2, 0.7, 0.4);
  // Cellos kista vid sängen
  B.chest('homeChest', HX - 1.6, 0, -HD / 2 + 0.9, 0, { shards: 10 });
  // Fönster med stormljus
  // (0.20: fönstren lyser orange av elden i byn under öppningen, se story.js)
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x6a7488 });
  for (const x of [HX - 2.4, HX + 1.4]) {
    B.deco(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), windowMat), x, 1.9, -HD / 2 + 0.01);
    B.deco(new THREE.Mesh(box(0.9, 0.08, 0.1, 1), M.woodDark), x, 2.32, -HD / 2 + 0.05);
    B.deco(new THREE.Mesh(box(0.06, 0.8, 0.08, 1), M.woodDark), x, 1.9, -HD / 2 + 0.05);
  }
  h.entries.door = { pos: r2.door.clone(), facing: Math.PI };
  h.exits = [{ x0: HX - 0.8, x1: HX + 0.8, z0: HD / 2 + 0.3, z1: HD / 2 + 3, to: 'home', entry: 'door' }];
  h.map.rects.push({ kind: 'room', x: HX, z: 0, w: HW, d: HD, ry: 0 });
  h.map.exits = [{ x: HX, z: HD / 2 + 0.5, label: 'Outside', to: 'home' }];
  B.end();

  return {
    npcs: {
      pell: { area: 'shop', pos: V3(SX - 0.6, 0, counterZ - 1.1), face: 0 },
    },
    house: { bed, window: V3(HX - 2.4, 1.9, -HD / 2), door: r2.door.clone(), windowMat },
    shop: {
      lantern: V3(standX - 1.0, 0, standZ),
      sword: V3(rackX - 1.1, 0, rackZ),
      oil: V3(SX - W / 2 + 1.7, 0, 0.2),
      potion: V3(SX - W / 2 + 1.7, 0, 3.0),
      lanternMesh: lantern,
    },
    onEnter(id, state) {
      if (id === 'shop') lantern.visible = !state.lantern;
    },
  };
}

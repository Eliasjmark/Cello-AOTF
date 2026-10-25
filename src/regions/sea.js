// The Shattered Sea (0.15): ett innanhav i en enorm skål av klippa, söder om The Galecrown. Fiskebyn Brinehollow
// står på pålar vid norra stranden, en fyr lyser (eller inte) på en klippa i nordost, och mitt i havet sticker
// en bruten treudd upp ur vattnet: där under ligger The Drowned Temple, där Kronos sägs sova.
//
// Koordinater: x 21000 (SX). Havets yta ligger på SEA_Y. Ön är en skål: kanten är land, mitten havsbotten.
//   Brinehollow:       norra stranden (z −215 … −165), piren går ut i havet åt söder
//   Fyren:              klippön i nordost
//   Templet:            mitt i havet (SX, TZ). Porten ligger på botten, på trappstegspyramidens norra sida
//   Svarta pärlor:      tre jättemusslor på botten (sidouppdrag), ett skeppsvrak med en kista
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';
import { waterDisc } from '../water.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const SX = 21000;
export const SEA_Y = -1.2;
const TZ = 10; // templets mitt (z)

export function buildSea(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'sea', name: 'The Shattered Sea', sub: 'Where the sea god fell',
    fog: { color: 0x9ab4c0, near: 70, far: 420 },
    light: { hemi: 1.65, moon: 1.35, flash: 1.1 },
  });
  a.waterFog = 0x1d6474;
  a.waterFar = 34;
  B.begin(a);
  B.bounds(SX - 260, SX + 260, -290, 260);
  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const SM = {
    marble: new THREE.MeshLambertMaterial({ map: M.marble.map, color: 0xd8e0dc }),
    marbleGreen: new THREE.MeshLambertMaterial({ map: M.marble.map, color: 0x8aa8a0 }),
    bronze: mat(0x5a8a7a), // ärgad brons
    coralP: mat(0xd86a8a), coralO: mat(0xe0904a), coralV: mat(0x8a5ab0), coralY: mat(0xd8c060),
    kelp: new THREE.MeshLambertMaterial({ color: 0x4a6a3a, side: THREE.DoubleSide, flatShading: true }),
    net: new THREE.MeshLambertMaterial({ color: 0x8a7a5a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
    shell: mat(0x6a6070), pearl: new THREE.MeshLambertMaterial({ color: 0x2a2838, emissive: 0x241a3a }),
    hull: new THREE.MeshLambertMaterial({ map: M.wood.map, color: 0x6a5240 }),
    sail: new THREE.MeshLambertMaterial({ color: 0xc8bca0, side: THREE.DoubleSide, flatShading: true }),
    whiteStone: new THREE.MeshLambertMaterial({ map: M.marble.map, color: 0xe8e4d8 }),
    redBand: mat(0xa83a2a),
    glass: new THREE.MeshBasicMaterial({ color: 0x5a4a30 }),
  };

  // ---------- ön: en skål med havsbotten i mitten ----------
  const VILLAGE = { x: SX, z: -190 };
  const underwater = (x, z) => Math.hypot(x - SX, z - TZ) < 172;
  const isl = B.island({
    cx: SX, cz: 0, baseR: 240, rNoise: 9, seed: 2101, amp: 0.45, hills: 0,
    keepAngles: [-Math.PI / 2], depth: 90, rings: 64, segs: 180, label: 'The Shattered Sea', mapCol: '#b8a878',
    topMat: M.sand,
    dips: [{ x: SX, z: TZ, r: 192, depth: 17.5 }],
    pads: [
      { x: SX, z: -236, r: 8, h: 0.1 }, // brofästet
      { x: VILLAGE.x, z: VILLAGE.z, r: 34, h: 0.7 },
      { x: SX - 46, z: -184, r: 12, h: 0.8 }, { x: SX + 44, z: -186, r: 12, h: 0.8 },
    ],
    grass: 700,
    avoid: (x, z) => underwater(x, z) || Math.hypot(x - SX, z - TZ) < 182 && rand() < 0.7,
    tint: (x, z) => 0.85 + 0.15 * Math.sin(x * 0.03 + z * 0.04),
  });
  const H = isl.H;
  // Havet
  const sea = waterDisc(232, { color: 0x2f8a96, opacity: 0.78, wave: 0.2, scale: 0.08 });
  sea.position.set(SX, SEA_Y, 0);
  B.add(sea);
  a.waters.push({ x: SX, z: 0, r: 232, y: SEA_Y });
  a.map.rects.push({ kind: 'water', x: SX, z: TZ, rx: 168, rz: 168 });

  // ---------- bron från The Galecrown (norr) ----------
  B.bridge('z', -266, -236, SX, DECK, { rails: true });
  B.mist(SX, -3, -266, 11, 5, 9, { axis: 'z' });
  B.sign(SX + 3, H(SX + 3, -230), -230, 0, ['A driftwood sign, crusted with salt:', '"BRINEHOLLOW. Fish, nets, and no questions."', '"Mind the tide. It has not been minding itself lately."']);
  a.entries = {
    north: { pos: V3(SX, DECK, -240), facing: 0 },
  };
  a.exits = [{ x0: SX - 3, x1: SX + 3, z0: -280, z1: -266, to: 'galecrown', entry: 'south' }];
  a.map.exits = [{ x: SX, z: -262, label: 'The Galecrown', to: 'galecrown' }];

  // ---------- Brinehollow ----------
  const VY = (x, z) => H(x, z);
  const road = [[SX, -236], [SX, -214], [SX - 6, -200], [SX, -186], [SX, -168]].map(([x, z]) => [x, z]);
  B.road(road, 3, H, M.dirt);
  // Hus på pålar längs stranden
  const houses = [
    { x: SX - 30, z: -200, ry: 0.3, roof: M.roofBlue }, { x: SX + 28, z: -204, ry: -0.25, roof: M.roofRed },
    { x: SX - 18, z: -176, ry: 0.1, roof: M.roofGreen }, { x: SX + 20, z: -178, ry: -0.15, roof: M.roofBrown },
  ];
  for (const h of houses) {
    const y = VY(h.x, h.z);
    for (const [px, pz] of [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2]]) {
      const c = Math.cos(h.ry), s = Math.sin(h.ry);
      B.deco(new THREE.Mesh(cyl(0.16, 0.2, 1.6, 6, 1), M.woodDark), h.x + px * c + pz * s, y + 0.2, h.z - px * s + pz * c);
    }
    B.house(h.x, y + 0.9, h.z, h.ry, { w: 5.6, d: 4.6, h: 2.5, wall: M.wood, roof: h.roof, trim: M.woodDark });
    B.chimneySmoke(h.x + 1.6, y + 5.6, h.z - 0.6, 3);
  }
  // Nätställningar och båtar på stranden
  const netRack = (x, z, ry) => {
    const g = B.groupAt(x, VY(x, z), z, ry);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(cyl(0.08, 0.1, 2.4, 5, 1), M.woodDark), s * 1.6, 1.2, 0, true);
    B.put(g, new THREE.Mesh(box(3.4, 0.1, 0.1, 1), M.woodDark), 0, 2.3, 0);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8, 6, 3), SM.net);
    B.put(g, net, 0, 1.35, 0);
  };
  netRack(SX - 10, -188, 0.2);
  netRack(SX + 9, -192, -0.4);
  netRack(SX - 40, -186, 1.2);
  const rowboat = (x, y, z, ry, collide = true) => {
    const g = B.groupAt(x, y, z, ry);
    B.put(g, new THREE.Mesh(box(1.4, 0.5, 3.4, 1), SM.hull), 0, 0.25, 0, collide);
    B.put(g, new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), SM.hull), 0, 0.25, 2.1);
    B.put(g, new THREE.Mesh(box(1.2, 0.08, 0.3, 1), M.wood), 0, 0.5, -0.4);
    B.put(g, new THREE.Mesh(cyl(0.04, 0.04, 2.6, 4, 1).rotateZ(1.2), M.wood), 0.4, 0.6, 0.3);
    return g;
  };
  rowboat(SX - 22, VY(SX - 22, -170) + 0.05, -170, 2.4);
  rowboat(SX + 34, VY(SX + 34, -172) + 0.05, -172, -0.8);
  for (const [x, z] of [[-6, -196], [7, -183], [-26, -190], [30, -194]]) B.barrel(SX + x, VY(SX + x, z), z);
  for (const [x, z] of [[-4, -184], [12, -198]]) B.crate(SX + x, VY(SX + x, z), z, 0.7, rand());
  B.lampPost(SX + 4, VY(SX + 4, -206), -206, 8);
  B.lampPost(SX - 5, VY(SX - 5, -174), -174, 8);
  B.campfire(SX - 2, VY(SX - 2, -192), -192, 20);
  a.rests = [{ pos: V3(SX - 2, VY(SX - 2, -192), -192), entry: 'rest', label: 'Rest by the fire', prompt: 'The fishers\' fire crackles with driftwood and salt. Rest a while?', text: 'Cello rests by the fire in Brinehollow...' }];
  a.entries.rest = { pos: V3(SX - 0.2, VY(SX - 0.2, -190.6), -190.6), facing: 2.6 };
  a.map.pois.push({ x: SX, z: -192, label: 'Brinehollow', icon: 'fire' });
  for (let i = 0; i < 6; i++) B.pot(SX - 34 + i * 1.1, VY(SX - 34 + i * 1.1, -195), -195, 0.9);

  // Piren: ut i havet åt söder
  const PIER = { x: SX + 2, z0: -168, z1: -128, y: 0.35 };
  B.bridge('z', PIER.z0 - 2, PIER.z1, PIER.x, PIER.y, { wide: 2.6 });
  for (let z = PIER.z0; z <= PIER.z1; z += 4) {
    for (const s of [-1, 1]) B.deco(new THREE.Mesh(cyl(0.14, 0.16, 6, 6, 1), M.woodDark), PIER.x + s * 1.35, PIER.y - 2.8, z);
  }
  // Pirens ände: en plattform med Nerissas båt
  B.solid(place(new THREE.Mesh(box(6, 0.3, 5, 1), M.wood), PIER.x, PIER.y - 0.15, PIER.z1 + 2.3));
  rowboat(PIER.x + 4.2, SEA_Y + 0.05, PIER.z1 + 3, 0.05, false);
  // En röd boj ute i vattnet (simlektionen)
  const BUOY = V3(SX + 18, SEA_Y, -122);
  const buoy = new THREE.Group();
  buoy.position.copy(BUOY);
  buoy.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), SM.redBand), 0, 0.1, 0));
  buoy.add(place(new THREE.Mesh(cyl(0.05, 0.05, 1.4, 4, 1), M.woodDark), 0, 0.9, 0));
  buoy.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04), new THREE.MeshLambertMaterial({ color: 0xe8d8a0 })), 0.25, 1.4, 0));
  B.add(buoy);
  a.buoy = { pos: BUOY, g: buoy };

  // Nerissas hydda vid piren, Corwins stånd och Gulls fyr
  const NHUT = { x: SX + 12, z: -172 };
  B.house(NHUT.x, VY(NHUT.x, NHUT.z) + 0.6, NHUT.z, -0.2, { w: 4.4, d: 3.8, h: 2.3, wall: M.wood, roof: M.thatch ?? M.roofBrown, trim: M.woodDark });
  B.canopy(SX - 12, VY(SX - 12, -204), -204, 0.4, M.clothTeal, 3.4, 2.8, 2.3);
  B.table(SX - 12, VY(SX - 12, -203.4), -203.4, 0.4);
  // Pärlhandlarens skyltar: skal på en snodd
  for (let k = 0; k < 5; k++) B.deco(new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), k === 2 ? SM.pearl : SM.shell), SX - 13.4 + k * 0.6, VY(SX - 12, -204) + 2.0, -205.2);

  // ---------- fyren på klippön i nordost ----------
  const LH = { x: SX + 92, z: -128 };
  const lIsl = B.island({
    cx: LH.x, cz: LH.z, baseR: 13, rNoise: 2.5, seed: 2102, amp: 0.3, depth: 26, rings: 10, segs: 40,
    baseY: 1.2, topMat: M.rockTop, label: 'Gull Rock', mapCol: '#8a8478', pads: [{ x: LH.x, z: LH.z, r: 8, h: 0.4 }],
  });
  const HL = lIsl.H;
  {
    const y = HL(LH.x, LH.z);
    B.solid(place(new THREE.Mesh(cyl(2.4, 3.0, 14, 12, 2), SM.whiteStone), LH.x, y + 7, LH.z));
    for (const k of [0, 1, 2]) B.deco(new THREE.Mesh(new THREE.CylinderGeometry(2.55 - k * 0.15, 2.65 - k * 0.15, 1.2, 12), SM.redBand), LH.x, y + 3 + k * 4, LH.z);
    B.deco(new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 12), M.iron), LH.x, y + 14.2, LH.z);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.8, 10), new THREE.MeshLambertMaterial({ color: 0x5a4a30, emissive: 0x000000 }));
    lamp.position.set(LH.x, y + 15.3, LH.z);
    B.add(lamp);
    B.deco(new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.6, 10), SM.redBand), LH.x, y + 17, LH.z);
    // Dörren mot byn
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2), new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    door.position.set(LH.x - 2.2, y + 1.1, LH.z - 1.6);
    door.rotation.y = -2.2;
    B.add(door);
    // Ljuskäglan som sveper över havet när fyren är tänd
    const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 46, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.geometry.translate(0, -23, 0);
    beam.geometry.rotateZ(Math.PI / 2);
    beam.position.set(LH.x, y + 15.3, LH.z);
    B.add(beam);
    const light = B.lights.add({ x: LH.x, y: y + 16, z: LH.z, color: 0xffd890, power: 0, range: 40, flicker: 0.05 });
    a.lighthouse = { pos: V3(LH.x - 2.6, y, LH.z - 2.4), lamp, beam, light, lit: false };
    a.map.pois.push({ x: LH.x, z: LH.z, label: 'The Lighthouse', icon: 'ruin' });
  }
  // Stenar att hoppa på ut till fyren
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, x = SX + 46 + (LH.x - 11 - SX - 46) * t, z = -168 + (LH.z + 6 + 168) * t;
    B.solid(place(new THREE.Mesh(rockGeo(1.5 + (k % 2) * 0.4, 2100 + k, 0.6), M.rockTop), x, SEA_Y + 0.15, z));
  }

  // ---------- The Drowned Temple: ruinerna mitt i havet ----------
  const seabed = (x, z) => H(x, z);
  const C = { x: SX, z: TZ };
  const bedY = seabed(C.x, C.z);
  // Trappstegspyramiden på botten
  const tiers = [[26, 3], [21, 3], [16, 2.6]];
  let ty = bedY - 0.5;
  for (const [w, h] of tiers) {
    B.solid(place(new THREE.Mesh(box(w, h, w, 3), SM.marbleGreen), C.x, ty + h / 2, C.z));
    ty += h;
  }
  const topY = ty;
  // Porten på norra sidan, vid botten
  const DOOR = { x: C.x, z: C.z - 13, y: bedY };
  {
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), new THREE.MeshBasicMaterial({ color: 0x04121a }));
    dark.position.set(DOOR.x, DOOR.y + 2.0, DOOR.z - 0.02);
    dark.rotation.y = Math.PI;
    B.add(dark);
    for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(cyl(0.45, 0.55, 5.4, 10, 1.5), SM.marble), DOOR.x + s * 2.3, DOOR.y + 2.6, DOOR.z - 0.6));
    B.deco(new THREE.Mesh(box(6, 0.8, 1.4, 1.5), SM.marble), DOOR.x, DOOR.y + 5.4, DOOR.z - 0.6);
    // En treudd i relief över porten
    for (const dx of [-0.6, 0, 0.6]) B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 4), SM.bronze), DOOR.x + dx, DOOR.y + 6.4 + (dx === 0 ? 0.2 : 0), DOOR.z - 1.3);
    B.deco(new THREE.Mesh(cyl(0.06, 0.06, 1.6, 4, 1), SM.bronze), DOOR.x, DOOR.y + 5.6, DOOR.z - 1.3);
  }
  // Den brutna treudden: ett landmärke som syns från byn
  {
    const shaftH = SEA_Y - topY + 16;
    B.solid(place(new THREE.Mesh(cyl(0.9, 1.1, shaftH, 10, 2), SM.bronze), C.x, topY + shaftH / 2, C.z));
    const head = topY + shaftH;
    B.solid(place(new THREE.Mesh(box(9, 1.2, 1.4, 2), SM.bronze), C.x, head, C.z));
    for (const [dx, h, lean] of [[-4, 8, -0.12], [0, 11, 0], [4, 4.5, 0.2]]) {
      const p = new THREE.Mesh(cyl(0.45, 0.6, h, 8, 2), SM.bronze);
      p.position.set(C.x + dx, head + h / 2, C.z);
      p.rotation.z = lean;
      B.solid(p);
      if (h > 6) B.deco(new THREE.Mesh(new THREE.ConeGeometry(0.75, 2, 6), SM.bronze), C.x + dx + Math.sin(-lean) * h * 0.5, head + h + 1, C.z);
    }
    a.map.pois.push({ x: C.x, z: C.z, label: 'The Drowned Temple', icon: 'ruin' });
  }
  // Pelare i en ring runt templet (några sticker upp ur vattnet)
  for (let k = 0; k < 10; k++) {
    const ang = (k / 10) * Math.PI * 2 + 0.2, r = 26;
    const x = C.x + Math.cos(ang) * r, z = C.z + Math.sin(ang) * r, by = seabed(x, z);
    const h = (SEA_Y - by) + (hash2(k, 21) > 0.4 ? 1 + hash2(21, k) * 5 : -2 - hash2(k, k) * 4);
    B.solid(place(new THREE.Mesh(cyl(0.9, 1.05, h, 10, 2), SM.marble), x, by + h / 2, z));
    if (h > SEA_Y - by + 2) B.deco(new THREE.Mesh(box(2.4, 0.5, 2.4, 1.5), SM.marble), x, by + h + 0.25, z);
  }
  // De brutna trappstegen: en liten ö av marmor där Seren väntar och båten lägger till
  const STEPS = { x: SX - 4, z: TZ - 32 };
  {
    const by = seabed(STEPS.x, STEPS.z);
    B.solid(place(new THREE.Mesh(box(9, SEA_Y - by + 0.6, 7, 2), SM.marble), STEPS.x, (by + SEA_Y + 0.6) / 2, STEPS.z));
    B.solid(place(new THREE.Mesh(box(3, 0.6, 2.2, 1.5), SM.marble), STEPS.x + 2.6, SEA_Y + 0.9, STEPS.z - 2));
    B.deco(new THREE.Mesh(cyl(0.7, 0.8, 2.6, 10, 2).rotateZ(Math.PI / 2), SM.marble), STEPS.x - 2.4, SEA_Y + 1.1, STEPS.z + 2.2);
    rowboat(STEPS.x + 5.8, SEA_Y + 0.05, STEPS.z, 1.4, false);
  }
  a.entries.steps = { pos: V3(STEPS.x, SEA_Y + 0.62, STEPS.z), facing: Math.PI * 0.9 };
  a.entries.temple = { pos: V3(DOOR.x, DOOR.y + 0.3, DOOR.z - 4), facing: Math.PI };
  a.exits.push({ x0: DOOR.x - 1.7, x1: DOOR.x + 1.7, z0: DOOR.z - 1.6, z1: DOOR.z + 0.2, y: DOOR.y + 1, dy: 3, to: 'tgate', entry: 'entrance', temple: true, text: 'Cello swims into the dark of the drowned temple...', label: 'The Drowned Temple' });
  // Bubbelkällor längs vägen ner till porten
  const vents = [V3(C.x - 6, seabed(C.x - 6, C.z - 22), C.z - 22), V3(C.x + 4, bedY, C.z - 16.5), V3(C.x - 3.5, bedY, DOOR.z - 2.5)];
  for (const v of vents) {
    a.bubbles.push({ x: v.x, y: v.y + 1.2, z: v.z, r: 1.6 });
    B.deco(new THREE.Mesh(rockGeo(0.8, Math.round(v.x), 0.5), M.rockTop), v.x, v.y + 0.1, v.z);
  }
  a.vents = vents;

  // ---------- botten: koraller, tång, musslor och ett skeppsvrak ----------
  const corals = [SM.coralP, SM.coralO, SM.coralV, SM.coralY];
  const kelps = [];
  for (let k = 0; k < 220; k++) {
    const ang = rand() * Math.PI * 2, r = 30 + Math.sqrt(rand()) * 130;
    const x = C.x + Math.cos(ang) * r, z = C.z + Math.sin(ang) * r, y = seabed(x, z);
    if (y > SEA_Y - 1.5) continue;
    if (rand() < 0.5) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rand() * 0.9, 0), corals[k % 4]);
      m.scale.set(1, 0.6 + rand() * 1.2, 1);
      B.deco(m, x, y + 0.3, z);
    } else {
      const h = 2 + rand() * Math.min(6, SEA_Y - y - 1);
      const g = new THREE.PlaneGeometry(0.5, h, 1, 4).translate(0, h / 2, 0);
      const m = new THREE.Mesh(g, SM.kelp);
      m.position.set(x, y, z);
      m.rotation.y = rand() * Math.PI;
      B.add(m);
      kelps.push({ m, ph: rand() * 6 });
    }
  }
  for (let k = 0; k < 40; k++) {
    const ang = rand() * Math.PI * 2, r = 40 + rand() * 120;
    const x = C.x + Math.cos(ang) * r, z = C.z + Math.sin(ang) * r;
    B.rock(x, seabed(x, z), z, 1 + rand() * 2.5, 2200 + k, true, M.rockTop);
  }
  // Tre jättemusslor med svarta pärlor
  const clamSpots = [{ id: 'west', x: SX - 104, z: TZ + 30 }, { id: 'east', x: SX + 96, z: TZ - 40 }, { id: 'south', x: SX + 20, z: TZ + 112 }];
  a.clams = clamSpots.map((c) => {
    const y = seabed(c.x, c.z);
    const g = new THREE.Group();
    g.position.set(c.x, y + 0.2, c.z);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), SM.shell);
    lower.scale.set(1, 0.6, 1);
    g.add(lower);
    const lid = new THREE.Group();
    lid.position.set(0, 0, -1.1);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), SM.shell);
    upper.scale.set(1, 0.55, 1);
    upper.position.z = 1.1;
    lid.add(upper);
    g.add(lid);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), SM.pearl);
    pearl.position.set(0, 0.25, 0);
    g.add(pearl);
    B.add(g);
    B.hidden(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 10), c.x, y + 0.4, c.z);
    return { ...c, y, g, lid, pearl, open: 0 };
  });
  // Skeppsvraket i sydost, med en kista i lastrummet
  const WRECK = { x: SX + 70, z: TZ + 70 };
  {
    const y = seabed(WRECK.x, WRECK.z);
    const g = B.groupAt(WRECK.x, y + 0.6, WRECK.z, 0.7);
    g.rotation.z = 0.35;
    g.updateWorldMatrix(true, false);
    B.put(g, new THREE.Mesh(box(4.4, 2.2, 12, 2), SM.hull), 0, 1.1, 0, true);
    B.put(g, new THREE.Mesh(cyl(0.2, 0.25, 9, 6, 1), M.woodDark), 0, 5.5, 1.5);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3, 4, 3), SM.sail);
    B.put(g, sail, 0.2, 6.6, 1.5);
    B.chest('seaWreck', WRECK.x - 3.6, y + 0.1, WRECK.z + 2.4, -0.8, { shards: 15 });
  }
  a.map.pois.push({ x: WRECK.x, z: WRECK.z, label: 'Shipwreck', icon: 'ruin' });

  // ---------- liv: fiskstim och tång som vajar ----------
  const fishGeo = new THREE.ConeGeometry(0.16, 0.6, 5).rotateX(Math.PI / 2);
  const schools = [];
  for (let s = 0; s < 6; s++) {
    const n = 14;
    const mesh = new THREE.InstancedMesh(fishGeo, mat([0xc8d0d8, 0xe0a050, 0x6a9ac8, 0xd8d070, 0xb8c8d0, 0x9a7ab8][s]), n);
    mesh.frustumCulled = false;
    B.add(mesh);
    const ang = (s / 6) * Math.PI * 2;
    const cx = C.x + Math.cos(ang) * (50 + s * 12), cz = C.z + Math.sin(ang) * (50 + s * 12);
    const depth = Math.max(seabed(cx, cz) + 2, SEA_Y - 6);
    schools.push({ mesh, n, cx, cz, y: Math.min(SEA_Y - 1.5, depth), r: 6 + s, sp: 0.3 + s * 0.05, off: Array.from({ length: n }, () => [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1]) });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  a.updaters.push((t, dt) => {
    for (const s of schools) {
      for (let i = 0; i < s.n; i++) {
        const o = s.off[i], ang = t * s.sp + i * 0.08;
        p.set(s.cx + Math.cos(ang) * (s.r + o[0] * 1.5), s.y + o[1] * 1.2 + Math.sin(t * 2 + i) * 0.15, s.cz + Math.sin(ang) * (s.r + o[2] * 1.5));
        e.set(0, -ang, 0);
        q.setFromEuler(e);
        m4.compose(p, q, sc);
        s.mesh.setMatrixAt(i, m4);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const k of kelps) k.m.rotation.z = Math.sin(t * 0.8 + k.ph) * 0.12;
    buoy.position.y = BUOY.y + Math.sin(t * 1.4) * 0.12;
    buoy.rotation.z = Math.sin(t * 1.1) * 0.1;
  });

  // ---------- kulisser ----------
  for (const [x, z, r, y] of [[-330, -80, 60, 6], [320, 40, 50, 14], [-280, 220, 40, -6], [260, -260, 44, 2]]) {
    B.backdrop(SX + x, z, r, y, 2130 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
  }

  // ---------- fiender: krabbor (asklingar) på de yttre stränderna ----------
  const VV = (x, z) => V3(SX + x, H(SX + x, z), z);
  for (const [x, z] of [[-150, -110], [150, -100], [-170, 60], [175, 50]]) {
    B.enemy(VV(x, z), [VV(x + 6, z + 3), VV(x - 5, z - 4)], {});
    B.enemy(VV(x + 3, z - 2), [VV(x - 3, z + 4)], { kind: 'shield' });
  }
  B.end();
  return {
    H, area: a, temple: { center: V3(C.x, bedY, C.z), door: DOOR }, steps: STEPS, pier: PIER, village: VILLAGE,
    npcs: {
      nerissa: { area: 'sea', pos: V3(PIER.x - 1.4, PIER.y, PIER.z1 + 1.4), face: Math.PI },
      corwin: { area: 'sea', pos: V3(SX - 12, VY(SX - 12, -202.2), -202.2), face: 0.4 },
      gull: { area: 'sea', pos: V3(LH.x - 3.4, HL(LH.x - 3.4, LH.z - 3.2), LH.z - 3.2), face: -2.4 },
      marlo: { area: 'sea', pos: V3(SX - 9, VY(SX - 9, -186.5), -186.5), face: 2.8 },
    },
  };
}

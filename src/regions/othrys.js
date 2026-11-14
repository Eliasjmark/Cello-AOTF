// Mount Othrys (0.21): titanernas berg, öster om The Frostmarch. Här kröntes titanerna en gång, och hit gick
// Kronos när han fick en kropp. Ön är kal sten under ett evigt åskväder; mitt på den reser sig berget, och
// porten in till The Crown of Othrys (den sista fängelsehålan) ligger i dess västra fot.
//
// Koordinater: x 32000 (OX). Isbron från The Frostmarch kommer in i väster.
//   Rheas härd:        (OX − 112, 26)  lägret: elden, tältet, den gamla titaninnan Rhea
//   De fallna titanerna: fyra brutna kolosser längs vägen (inskrifter)
//   Hjärtburarna:       fem burar med hjärtan som Kronos tog från folket (sidouppdrag)
//   Berget:             (OX + 34, 0)   porten i väster (OX − 26, 0)
import * as THREE from 'three';
import { box, cyl, rockGeo, place } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const OX = 32000;

// Hjärtburarna: vems hjärta som sitter i varje bur (folk från byarna som titanerna tog)
export const EMBERS = [
  { id: 'ida', x: -128, z: -54, who: 'Ida', from: 'Hollowbrook', line: 'Maren...? Is my girl safe? Tell her her mother is coming home.' },
  { id: 'tomas', x: -18, z: 84, who: 'Tomas the baker', from: 'Hollowbrook', line: 'Cello? Little Cello from the forest? You grew. Who is feeding your goats?' },
  { id: 'wilhelm', x: 64, z: 92, who: 'Old Wilhelm', from: 'Hollowbrook', line: 'I was ringing the bell when it came. Did anyone hear the bell?' },
  { id: 'saga', x: 88, z: -74, who: 'Saga the shepherd', from: 'Thistledown', line: 'It is so cold in here. Like being a coin in a dead man\'s pocket.' },
  { id: 'eli', x: -64, z: -96, who: 'Eli', from: 'Hollowbrook', line: 'I hid under the bridge. It found me anyway. Is the bridge still there?' },
];

export function buildOthrys(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'othrys', name: 'Mount Othrys', sub: 'Where the titans were crowned',
    fog: { color: 0x4a4258, near: 50, far: 320 },
    light: { hemi: 1.7, moon: 1.25, flash: 1.4, sky: 0xc0b4dc, ground: 0x5a5066, moonColor: 0xd8ccff },
  });
  B.begin(a);
  B.bounds(OX - 200, OX + 170, -170, 170);
  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const OM = {
    slate: new THREE.MeshLambertMaterial({ map: M.rock.map, color: 0x8a8094, flatShading: true }),
    dark: mat(0x2e2834),
    statue: new THREE.MeshLambertMaterial({ map: M.marble.map, color: 0x9a94a0 }),
    bronze: mat(0x6a5a3a),
    vein: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
    cage: mat(0x3a3440),
    heart: new THREE.MeshBasicMaterial({ color: 0xff8a9a }),
    snow: mat(0xe8e4f0),
    tent: mat(0x6a3a3a),
  };

  // ---------- ön ----------
  const CAMP = { x: OX - 112, z: 26 };
  const PLAZA = { x: OX - 44, z: 0 };
  const MT = { x: OX + 34, z: 0, r: 58 };
  const road = [[OX - 150, 0], [OX - 132, 6], [OX - 114, 16], [OX - 96, 10], [OX - 78, 2], [OX - 60, -2], [OX - 44, 0]];
  const isl = B.island({
    cx: OX, cz: 0, baseR: 150, rNoise: 10, seed: 3301, amp: 0.9, hills: 4, hillFreq: 0.022,
    keepAngles: [Math.PI], depth: 90, rings: 52, segs: 150, label: 'Mount Othrys', mapCol: '#6a6078',
    topMat: M.rockTop, grass: 0,
    roads: [{ pts: road, w: 4 }],
    pads: [
      { x: OX - 146, z: 0, r: 9, h: 0 },
      { x: CAMP.x, z: CAMP.z, r: 15, h: 0.4 },
      { x: PLAZA.x, z: PLAZA.z, r: 16, h: 0.8 },
      { x: MT.x, z: MT.z, r: MT.r + 6, h: 0.8 },
    ],
    tint: (x, z) => 1.0 + 0.12 * Math.sin(x * 0.05 + z * 0.04),
  });
  const H = isl.H;
  B.road(road, 4, H, M.roadStone ?? M.dirt);

  // Isbron från The Frostmarch (väster)
  B.bridge('x', OX - 182, OX - 150, 0, DECK, { rails: true });
  B.mist(OX - 182, -3, 0, 9, 11, 9);
  a.entries = { west: { pos: V3(OX - 152, DECK, 0), facing: Math.PI / 2 } };
  a.exits = [{ x0: OX - 196, x1: OX - 180, z0: -3, z1: 3, to: 'frost', entry: 'east' }];
  a.map.exits = [{ x: OX - 182, z: 0, label: 'The Frostmarch', to: 'frost' }];

  // ---------- Rheas härd: lägret vid bergets fot ----------
  {
    const y = H(CAMP.x, CAMP.z);
    B.campfire(CAMP.x, y, CAMP.z, 26);
    B.tent(CAMP.x - 6, H(CAMP.x - 6, CAMP.z - 5), CAMP.z - 5, 0.4, OM.tent, 2.8, 3.2, 2.0);
    B.tent(CAMP.x + 6, H(CAMP.x + 6, CAMP.z - 6), CAMP.z - 6, -0.5, M.clothBlue, 2.4, 2.8, 1.8);
    for (const [dx, dz] of [[-3, 4], [3.5, 3.4]]) B.bench(CAMP.x + dx, H(CAMP.x + dx, CAMP.z + dz), CAMP.z + dz, Math.atan2(-dx, -dz));
    // En gammal härd av sten: en ring av stenar med titanernas tecken
    for (let k = 0; k < 10; k++) {
      const an = (k / 10) * Math.PI * 2;
      B.deco(new THREE.Mesh(rockGeo(0.5, 3300 + k, 0.9), OM.slate), CAMP.x + Math.cos(an) * 2.2, y + 0.2, CAMP.z + Math.sin(an) * 2.2);
    }
    B.lampPost(CAMP.x + 9, H(CAMP.x + 9, CAMP.z + 4), CAMP.z + 4, 9);
    for (const [dx, dz] of [[-9, 2], [-8, 3.2]]) B.barrel(CAMP.x + dx, H(CAMP.x + dx, CAMP.z + dz), CAMP.z + dz);
    B.crate(CAMP.x - 9.6, H(CAMP.x - 9.6, CAMP.z + 0.6), CAMP.z + 0.6, 0.8, 0.3);
    a.rests = [{ pos: V3(CAMP.x, y, CAMP.z), entry: 'rest', label: 'Rest by the fire', prompt: "Rhea's hearth burns with a low, steady flame. Rest a while?", text: "Cello rests by Rhea's hearth..." }];
    a.entries.rest = { pos: V3(CAMP.x + 1.6, H(CAMP.x + 1.6, CAMP.z + 1.8), CAMP.z + 1.8), facing: 2.4 };
    a.map.pois.push({ x: CAMP.x, z: CAMP.z, label: "Rhea's Hearth", icon: 'fire' });
  }

  // ---------- berget ----------
  const by = H(MT.x, MT.z);
  {
    // Bergets kropp: tre staplade koner av mörk sten, med snö på axlarna
    const layers = [[MT.r, 34, 0], [MT.r * 0.66, 30, 26], [MT.r * 0.36, 26, 50]];
    for (const [r, h, y0] of layers) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, h, 18, 3), OM.slate);
      cone.position.set(MT.x, by + y0 + h / 2 - 2, MT.z);
      B.solid(cone);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.66, 1.6, 18, 1), OM.snow);
      cap.position.set(MT.x, by + y0 + h - 2.4, MT.z);
      B.add(cap);
    }
    // Klippor och utsprång längs sidorna, så att berget inte ser ut som en tårta
    for (let k = 0; k < 26; k++) {
      const an = (k / 26) * Math.PI * 2 + (k % 3) * 0.13, lv = k % 3;
      const r = [MT.r * 0.92, MT.r * 0.68, MT.r * 0.42][lv], hh = [6, 30, 54][lv];
      if (Math.abs(an - Math.PI) < 0.32 && lv === 0) continue; // porten
      const m = new THREE.Mesh(rockGeo(5 + (k % 4) * 2.2, 3320 + k, 1.3), OM.slate);
      m.position.set(MT.x + Math.cos(an) * r, by + hh + (k % 2) * 3, MT.z + Math.sin(an) * r);
      m.rotation.y = k;
      if (lv === 0) B.solid(m); else B.add(m);
    }
    // Kronan: spetsar av svart sten runt toppen, med lila ljus mellan dem
    for (let k = 0; k < 9; k++) {
      const an = (k / 9) * Math.PI * 2, r = MT.r * 0.22;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(2.4, 14 + (k % 3) * 4, 5), OM.dark);
      sp.position.set(MT.x + Math.cos(an) * r, by + 80 + 6, MT.z + Math.sin(an) * r);
      sp.rotation.z = Math.cos(an) * 0.18;
      sp.rotation.x = -Math.sin(an) * 0.18;
      B.add(sp);
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 10), OM.vein);
    glow.position.set(MT.x, by + 82, MT.z);
    B.add(glow);
    a.crownGlow = glow;
    // Ådror av lila ljus nerför bergssidan
    for (let k = 0; k < 7; k++) {
      const an = (k / 7) * Math.PI * 2 + 0.3;
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 40, 0.5), OM.vein);
      v.position.set(MT.x + Math.cos(an) * MT.r * 0.66, by + 20, MT.z + Math.sin(an) * MT.r * 0.66);
      v.rotation.z = Math.cos(an) * 0.42;
      v.rotation.x = -Math.sin(an) * 0.42;
      B.add(v);
    }
    // Porten i bergets västra fot: två kolosser som håller upp en överliggare
    const gx = MT.x - MT.r - 3, gy = H(gx - 6, 0);
    a.gate = { x: gx, z: 0, y: gy };
    for (const s of [-1, 1]) {
      B.solid(place(new THREE.Mesh(box(4, 18, 4, 2), OM.statue), gx - 6, gy + 9, s * 7));
      B.deco(new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), OM.statue), gx - 6, gy + 19.6, s * 7);
      B.deco(new THREE.Mesh(box(3.4, 1.2, 3.4, 1), OM.dark), gx - 6, gy + 0.6, s * 7);
    }
    B.solid(place(new THREE.Mesh(box(6, 3.4, 18, 2), OM.statue), gx - 6, gy + 19.2, 0));
    B.deco(new THREE.Mesh(box(0.4, 1.2, 12, 1), OM.vein), gx - 9.1, gy + 19.2, 0);
    // Öppningen: mörker, och en trappa ner i berget
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(9, 12), new THREE.MeshBasicMaterial({ color: 0x07050c }));
    dark.position.set(gx - 3.2, gy + 6, 0);
    dark.rotation.y = -Math.PI / 2;
    B.add(dark);
    for (const s of [-1, 1]) B.solid(place(new THREE.Mesh(box(6, 14, 1.2, 2), OM.dark), gx - 2.6, gy + 7, s * 5.1));
    B.solid(place(new THREE.Mesh(box(1.2, 14, 11, 2), OM.dark), gx + 0.2, gy + 7, 0));
    B.solid(place(new THREE.Mesh(box(6, 2, 11, 2), OM.dark), gx - 2.6, gy + 13, 0));
    a.entries.gate = { pos: V3(gx - 10, gy, 0), facing: -Math.PI / 2 };
    a.exits.push({ x0: gx - 4.2, x1: gx - 0.6, z0: -4, z1: 4, y: gy, dy: 4, to: 'ogate', entry: 'entrance', crown: true, text: 'Cello steps between the two colossi, into the mountain of the titans...', label: 'The Crown of Othrys' });
    a.map.pois.push({ x: gx - 4, z: 0, label: 'The Crown of Othrys', icon: 'ruin' });
    B.sign(gx - 14, H(gx - 14, 9.5), 9.5, -Math.PI / 2, ['Words cut into the foot of a colossus, each letter as tall as Cello:', '"HERE THE TITANS WERE CROWNED. HERE THEY WILL BE CROWNED AGAIN."', 'Someone has scratched underneath, small and shaky: "not if we can help it"']);
  }

  // ---------- de fallna titanerna: fyra kolosser längs vägen ----------
  a.statues = [];
  const colossus = (x, z, ry, lines, kind) => {
    const y = H(x, z);
    const g = B.groupAt(x, y, z, ry);
    B.put(g, new THREE.Mesh(box(6, 2, 6, 2), OM.slate), 0, 1, 0, true);
    // Benen (det ena avbrutet), och kroppen som har fallit omkull bredvid
    B.put(g, new THREE.Mesh(cyl(0.9, 1.1, 7, 8, 2), OM.statue), -1.3, 5.5, 0, true);
    B.put(g, new THREE.Mesh(cyl(0.9, 1.1, 3.2, 8, 2), OM.statue), 1.3, 3.6, 0, true);
    const torso = B.put(g, new THREE.Mesh(box(4.4, 6, 2.6, 2), OM.statue), 6.6, 1.3, 1.2, true);
    torso.rotation.set(0, 0.4, Math.PI / 2);
    const head = B.put(g, new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), OM.statue), 3.8, 1.6, 5.4, true);
    head.scale.set(1, 1.15, 1);
    // Vad titanen bar: en åskvigg, en snäcka, en klubba eller ett klot
    if (kind === 'storm') B.put(g, new THREE.Mesh(box(0.5, 5, 0.5, 1).rotateZ(0.8), OM.bronze), -3.5, 2.5, 3, false);
    if (kind === 'sea') B.put(g, new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 7).rotateZ(1.2), OM.bronze), -3.4, 1.4, 3.4, false);
    if (kind === 'frost') B.put(g, new THREE.Mesh(cyl(0.4, 0.8, 5, 6, 1).rotateZ(1.4), OM.bronze), -3.8, 1.2, 3, false);
    if (kind === 'sky') B.put(g, new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), OM.bronze), -4.6, 2.4, -2, true);
    const front = B.local(g, 0, 0, 4.6);
    B.signs.push({ area: a.id, pos: V3(front.x, H(front.x, front.z), front.z), lines, label: 'Read the inscription' });
    a.statues.push({ x, z, kind });
    a.map.pois.push({ x, z, label: 'Fallen Titan', icon: 'ruin' });
  };
  colossus(OX - 92, -24, 0.3, ['A colossus of a titan, broken at the knees. A bronze thunderbolt lies in the dust beside it.', '"TYPHON, FATHER OF STORMS. HE SHOOK THE SKY, AND THE SKY SHOOK BACK."', 'The stone is scorched black, as if lightning struck it again and again.'], 'storm');
  colossus(OX - 72, 32, 2.6, ['A titan with a fish\'s tail instead of legs, cracked in two. Barnacles still cling to the marble.', '"OCEANUS, WHO HELD THE SEA IN HIS HANDS. WHEN HE FELL, THE SEA FORGOT HIM."'], 'sea');
  colossus(OX - 64, -40, -0.5, ['A titan carrying a great stone ball on his shoulders. The ball has rolled off, and lies in a crater.', '"ATLAS, WHO HELD UP THE SKY. HE IS TIRED NOW. LET HIM REST."'], 'sky');
  colossus(OX - 30, 44, 3.6, ['A titan in a crown of icicles, his face worn smooth by the wind.', '"KRONOS, KING OF TITANS, LORD OF THE HARVEST AND OF TIME."', 'Someone has chiselled away the eyes. Fresh marks. Very fresh.'], 'frost');

  // ---------- hjärtburarna ----------
  a.embers = [];
  for (const e of EMBERS) {
    const x = OX + e.x, z = e.z, y = H(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    B.solid(place(new THREE.Mesh(rockGeo(1.4, 3400 + e.x, 0.6), OM.slate), x, y + 0.3, z));
    const cage = new THREE.Group();
    for (let k = 0; k < 8; k++) {
      const an = (k / 8) * Math.PI * 2;
      cage.add(place(new THREE.Mesh(cyl(0.035, 0.035, 1.6, 4, 1), OM.cage), Math.cos(an) * 0.5, 1.6, Math.sin(an) * 0.5));
    }
    cage.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 16).rotateX(Math.PI / 2), OM.cage), 0, 2.4, 0));
    cage.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 16).rotateX(Math.PI / 2), OM.cage), 0, 0.82, 0));
    cage.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.5, 8), OM.cage), 0, 2.65, 0));
    g.add(cage);
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), OM.heart.clone());
    heart.position.y = 1.6;
    g.add(heart);
    // Ett mjukt sken runt hjärtat
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6a8a, transparent: true, opacity: 0.25, depthWrite: false }));
    halo.position.y = 1.6;
    g.add(halo);
    B.add(g);
    const light = B.lights.add({ x, y: y + 1.8, z, color: 0xff7a9a, power: 5, range: 7, flicker: 0.25 });
    a.embers.push({ ...e, x, z, y, g, cage, heart, halo, light, open: false, flyT: -1 });
    a.map.pois.push({ x, z, label: 'Heart Cage', icon: 'heart' });
  }

  // ---------- stenar, klippblock och döda träd ----------
  for (let k = 0; k < 70; k++) {
    const ang = rand() * Math.PI * 2, r = 20 + Math.sqrt(rand()) * 128;
    const x = OX + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (Math.hypot(x - MT.x, z - MT.z) < MT.r + 8 || Math.hypot(x - CAMP.x, z - CAMP.z) < 18 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 18) continue;
    if (x < OX - 140 && Math.abs(z) < 10) continue;
    if (road.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 7)) continue;
    if (EMBERS.some((e) => Math.hypot(x - OX - e.x, z - e.z) < 6)) continue;
    if (k % 3 === 0) {
      // Ett dött träd
      const y = H(x, z), s = 0.8 + rand() * 0.6;
      B.solid(place(new THREE.Mesh(cyl(0.16 * s, 0.3 * s, 4.5 * s, 5, 1), OM.dark), x, y + 2.2 * s, z));
      for (let b = 0; b < 3; b++) {
        const br = new THREE.Mesh(cyl(0.05 * s, 0.1 * s, 1.8 * s, 4, 1), OM.dark);
        br.rotation.set(rand() - 0.5, rand() * 6, 0.9 + rand() * 0.4);
        B.deco(br, x, y + (2.6 + b * 0.6) * s, z);
      }
    } else B.rock(x, H(x, z), z, 0.8 + rand() * 2.4, 3300 + k, true, M.rockTop);
  }

  // ---------- kulisser: andra öar och berg i fjärran ----------
  for (const [x, z, r, y] of [[-40, -300, 60, 14], [260, -120, 50, 22], [220, 210, 56, 8], [-60, 290, 48, 0]]) {
    B.backdrop(OX + x, z, r, y, 3360 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
  }

  // ---------- fiender ----------
  const VV = (x, z) => V3(x, H(x, z), z);
  for (const [x, z] of [[OX - 96, 40], [OX - 70, -14], [OX - 56, 24], [OX - 30, -36], [OX + 60, 92], [OX + 86, -60], [OX - 60, -90], [OX - 20, 74]]) {
    B.enemy(VV(x, z), [VV(x + 6, z + 3), VV(x - 5, z - 4)], {});
    if (Math.abs(x - OX) > 40 || z < 0) B.enemy(VV(x + 3, z - 2), [VV(x - 3, z + 4)], { kind: (x + z) % 2 ? 'shield' : 'askling' });
  }
  // Fladdermöss runt porten
  B.enemy(VV(PLAZA.x - 4, 8).add(V3(0, 3, 0)), [], { kind: 'bat' });
  B.enemy(VV(PLAZA.x + 4, -8).add(V3(0, 3, 0)), [], { kind: 'bat' });

  // Hjärtburarna: hjärtana slår, och de som har släppts flyger till Rheas härd
  a.updaters.push((t, dt) => {
    for (const e of a.embers) {
      const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 6 + e.x)) ** 6;
      e.heart.scale.setScalar(beat);
      e.halo.scale.setScalar(beat * (1 + 0.1 * Math.sin(t * 2)));
      if (e.flyT >= 0) {
        e.flyT += dt;
        const k = Math.min(1, e.flyT / 3);
        const to = V3(CAMP.x, H(CAMP.x, CAMP.z) + 3, CAMP.z), from = V3(e.x, e.y + 1.6, e.z);
        const p = from.clone().lerp(to, k);
        p.y += Math.sin(k * Math.PI) * 18;
        e.heart.position.set(p.x - e.x, p.y - e.y, p.z - e.z);
        e.halo.position.copy(e.heart.position);
        if (k >= 1) { e.flyT = -1; e.heart.visible = false; e.halo.visible = false; }
      }
    }
    if (a.crownGlow) a.crownGlow.scale.setScalar(1 + 0.15 * Math.sin(t * 1.3));
  });
  B.end();
  return {
    H, area: a, camp: CAMP, plaza: PLAZA, mountain: MT, gate: a.gate,
    npcs: {
      rhea: { area: 'othrys', pos: V3(CAMP.x - 2.6, H(CAMP.x - 2.6, CAMP.z - 1.6), CAMP.z - 1.6), face: 1.0 },
    },
  };
}

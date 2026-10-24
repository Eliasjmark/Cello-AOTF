// The Galecrown (0.14): höga, blåsiga öar väster om Stormreach, där vinden aldrig sover. Gräset ligger platt
// av blåsten, gamla vindklockor står tysta, och på den nordvästra ön reser sig The Windbound Spire upp i molnen.
//
// Koordinater: x 17000. Bron från Stormreach kommer in i öster. Seren slår läger vid elden, klocktemplet står i
// väster, och en smal stenväg med sidovindar leder över till tornets ö (tung vikt håller Cello kvar).
// Vindpelarna i öster: en uppvind upp på den första pelaren, en vägg med bronsfjädrar över till den andra
// (sandalerna behövs) – där ligger en av klockkläppar­na.
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from '../geom.js';
import { DECK } from '../build.js';
import { spireMats } from '../spirekit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const GX = 17000;

export function buildGalecrown(B, areas) {
  const { M, rand } = B;
  const SM = spireMats();
  const a = areas.create({
    id: 'galecrown', name: 'The Galecrown', sub: 'Where the wind never sleeps', windy: true,
    fog: { color: 0x8a96a8, near: 50, far: 360 },
    light: { hemi: 1.6, moon: 1.3, flash: 1.2 },
  });
  B.begin(a);
  B.bounds(GX - 140, GX + 130, -170, 120);
  const R = (pts) => pts.map(([x, z]) => [GX + x, z]);
  const CAMP = { x: GX + 36, z: 26 };
  const SHRINE = { x: GX - 22, z: 34 };
  const SPIRE = { x: GX - 75, z: -115 };
  const toSpire = Math.atan2(SPIRE.z - 0, SPIRE.x - GX); // vinkeln från huvudön mot tornets ö
  const road = R([[106, 0], [80, 0], [52, 10], [36, 20], [10, 24], [-14, 28]]);
  const road2 = R([[36, 20], [16, -10], [-10, -40], [-40, -62]]);
  const isl = B.island({
    cx: GX, cz: 0, baseR: 86, rNoise: 8, seed: 1701, amp: 1.1, hills: 7, hillFreq: 0.02,
    keepAngles: [0, toSpire], depth: 70, rings: 54, segs: 150, label: 'The Galecrown',
    mapCol: '#4a5a44',
    pads: [
      { x: GX + 84, z: 0, r: 7, h: 0 }, { x: CAMP.x, z: CAMP.z, r: 9, h: 0.6 }, { x: SHRINE.x, z: SHRINE.z, r: 13, h: 0.8 },
      { x: GX - 44, z: -66, r: 6, h: 0.4 }, { x: GX + 44, z: -34, r: 12, h: 0.5 }, { x: GX + 4, z: -30, r: 8, h: 0.6 },
      { x: GX - 44, z: 4, r: 9, h: 0.5 },
    ],
    roads: [{ pts: road, w: 3.2 }, { pts: road2, w: 2.6 }],
    grass: 900,
    tint: (x, z) => 0.8 + 0.16 * Math.sin(x * 0.04 + z * 0.05),
  });
  const H = isl.H;
  B.road(road, 3.2, H);
  B.road(road2, 2.6, H);
  // Tornets ö
  const sIsl = B.island({
    cx: SPIRE.x, cz: SPIRE.z, baseR: 34, rNoise: 4, seed: 1702, amp: 0.6, hills: 3, hillFreq: 0.03,
    keepAngles: [toSpire + Math.PI], depth: 60, rings: 30, segs: 80, label: 'Spire Rock', mapCol: '#5a6458',
    pads: [{ x: SPIRE.x, z: SPIRE.z, r: 16, h: 1.2 }],
    grass: 160,
  });
  const HS = sIsl.H;
  const Hall = (x, z) => {
    const d = Math.hypot(x - SPIRE.x, z - SPIRE.z);
    return d < 36 ? HS(x, z) : H(x, z);
  };

  // ---------- bron från Stormreach ----------
  B.bridge('x', GX + 84, GX + 113, 0, DECK, { rails: true });
  B.mist(GX + 113, -3, 0, 11, 5, 9, { axis: 'x' });
  B.sign(GX + 78, H(GX + 78, 4), 4, Math.PI / 2, ['A weathered post, its letters half scoured away by wind:', '"THE GALECROWN. Here the wind was born, and here it will die last."', '"Hold on to your hat. Hold on to everything."']);

  // ---------- stenvägen till tornets ö (sidovindar) ----------
  const c0 = { x: GX + Math.cos(toSpire) * 80, z: Math.sin(toSpire) * 80 };
  const c1 = { x: SPIRE.x - Math.cos(toSpire) * 31, z: SPIRE.z - Math.sin(toSpire) * 31 };
  {
    const len = Math.hypot(c1.x - c0.x, c1.z - c0.z), mx = (c0.x + c1.x) / 2, mz = (c0.z + c1.z) / 2;
    const ry = Math.atan2(c1.x - c0.x, c1.z - c0.z);
    const y0 = H(c0.x, c0.z), y1 = HS(c1.x, c1.z);
    const m = new THREE.Mesh(box(3.2, 1.2, len, 2), M.roadStone ?? M.rock);
    m.position.set(mx, (y0 + y1) / 2 - 0.6, mz);
    m.rotation.set(Math.atan2(y0 - y1, len) * 0, ry, 0);
    B.solid(m);
    // låga stenar längs kanterna (inget räcke)
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, x = c0.x + (c1.x - c0.x) * t, z = c0.z + (c1.z - c0.z) * t;
      for (const s of [-1, 1]) {
        const px = x + Math.cos(ry) * 1.7 * s, pz = z - Math.sin(ry) * 1.7 * s;
        B.deco(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.rock), px, (y0 + y1) / 2 + 0.2, pz);
      }
    }
    // Sidovinden blåser i stötar tvärs över vägen (mot nordost)
    const nx = Math.cos(ry), nz = -Math.sin(ry);
    a.gusts = [{ x0: Math.min(c0.x, c1.x) - 3, x1: Math.max(c0.x, c1.x) + 3, z0: Math.min(c0.z, c1.z) - 3, z1: Math.max(c0.z, c1.z) + 3, wx: nx * 8.5, wz: nz * 8.5, period: 4.2, duty: 0.55 }];
    B.sign(c0.x + 3, H(c0.x + 3, c0.z + 3), c0.z + 3, ry + Math.PI, ['Carved into a standing stone:', '"The gale-road. The wind will try to take you. Be heavy, or be quick between the gusts."']);
  }

  // ---------- The Windbound Spire ----------
  {
    const by = HS(SPIRE.x, SPIRE.z);
    const r0 = 9.5;
    B.solid(place(new THREE.Mesh(cyl(r0, r0 + 1.4, 16, 24, 3), SM.marble), SPIRE.x, by + 7, SPIRE.z));
    B.deco(new THREE.Mesh(new THREE.CylinderGeometry(r0 - 0.6, r0, 150, 24), SM.marble), SPIRE.x, by + 90, SPIRE.z);
    for (let k = 0; k < 9; k++) {
      B.deco(new THREE.Mesh(new THREE.CylinderGeometry(r0 - 0.4 - k * 0.04, r0 - 0.4 - k * 0.04, 1.2, 24), SM.bronze), SPIRE.x, by + 18 + k * 17, SPIRE.z);
    }
    // Ringar av vind runt toppen (moln)
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2;
      B.deco(new THREE.Mesh(new THREE.IcosahedronGeometry(9 + (k % 3) * 3, 1), new THREE.MeshLambertMaterial({ color: 0xb8c0cc, transparent: true, opacity: 0.8, flatShading: true })), SPIRE.x + Math.cos(ang) * 16, by + 150 + (k % 2) * 6, SPIRE.z + Math.sin(ang) * 16);
    }
    // Porten: mot stenvägen
    const dx = Math.cos(toSpire + Math.PI), dz = Math.sin(toSpire + Math.PI);
    const door = { x: SPIRE.x + dx * (r0 + 0.9), z: SPIRE.z + dz * (r0 + 0.9) };
    const face = Math.atan2(dx, dz);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshBasicMaterial({ color: 0x0a0c10 }));
    dark.position.set(door.x + dx * 0.15, by + 2.2, door.z + dz * 0.15);
    dark.rotation.y = face;
    B.add(dark);
    for (const s of [-1, 1]) {
      const px = door.x + Math.cos(face) * 2.2 * s, pz = door.z - Math.sin(face) * 2.2 * s;
      B.solid(place(new THREE.Mesh(cyl(0.45, 0.55, 6, 10, 1.5), SM.marble), px, by + 3, pz));
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 2.2), SM.gold);
      wing.position.set(px + dx * 0.4, by + 6.4, pz + dz * 0.4);
      wing.rotation.y = face + s * 0.5;
      B.add(wing);
    }
    B.add(place(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 1.2), SM.bronze), door.x + dx * 0.3, by + 4.7, door.z + dz * 0.3));
    a.spireDoor = { ...door, y: by, face };
    a.map.pois.push({ x: SPIRE.x, z: SPIRE.z, label: 'The Windbound Spire', icon: 'ruin' });
    a.exits = [
      { x0: door.x - 1.6, x1: door.x + 1.6, z0: door.z - 1.6, z1: door.z + 1.6, to: 'sgate', entry: 'entrance', spire: true, text: 'Cello steps into the tower of the wind...', label: 'The Windbound Spire' },
    ];
    a.entries = {
      spire: { pos: V3(door.x + dx * 3.2, by, door.z + dz * 3.2), facing: face },
    };
  }

  // ---------- Serens läger ----------
  const fire = V3(CAMP.x, H(CAMP.x, CAMP.z), CAMP.z);
  B.campfire(fire.x, fire.y, fire.z, 26);
  B.tent(CAMP.x + 5, H(CAMP.x + 5, CAMP.z - 3), CAMP.z - 3, -0.9, M.clothRed ?? M.clothGreen, 2.4, 2.8, 1.8);
  B.crate(CAMP.x + 3, H(CAMP.x + 3, CAMP.z + 3), CAMP.z + 3, 0.6, 0.3);
  B.pot(CAMP.x - 3, H(CAMP.x - 3, CAMP.z + 2), CAMP.z + 2);
  a.rests = [{ pos: fire, entry: 'rest', label: 'Rest by the fire', prompt: "Seren's fire burns low in the wind. Rest a while?", text: 'Cello rests by the fire in the Galecrown...' }];
  a.map.pois.push({ x: CAMP.x, z: CAMP.z, label: "Seren's camp", icon: 'fire' });
  a.entries.east = { pos: V3(GX + 100, DECK, 0), facing: -Math.PI / 2 };
  a.entries.rest = { pos: V3(fire.x - 1.8, H(fire.x - 1.8, fire.z + 1.4), fire.z + 1.4), facing: 2.3 };
  a.exits.push({ x0: GX + 108, x1: GX + 116, z0: -3, z1: 3, to: 'stormreach', entry: 'galecrown' });
  a.map.exits = [{ x: GX + 110, z: 0, label: 'Stormreach', to: 'stormreach' }];

  // ---------- klocktemplet ----------
  const shrine = { x: SHRINE.x, z: SHRINE.z, y: H(SHRINE.x, SHRINE.z) };
  {
    const { x, z, y } = shrine;
    B.solid(place(new THREE.Mesh(cyl(7, 7.4, 0.6, 24, 2), SM.flag), x, y + 0.1, z));
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2, broken = k % 3 === 1;
      const h = broken ? 2.4 + hash2(k, 3) * 1.5 : 5.2;
      B.solid(place(new THREE.Mesh(cyl(0.4, 0.48, h, 8, 1.5), SM.marble), x + Math.cos(ang) * 6.3, y + 0.4 + h / 2, z + Math.sin(ang) * 6.3));
    }
    // Klockstolen: tre klockor av brons
    B.solid(place(new THREE.Mesh(box(0.4, 4.6, 0.4, 1), SM.bronze), x - 2.6, y + 2.6, z));
    B.solid(place(new THREE.Mesh(box(0.4, 4.6, 0.4, 1), SM.bronze), x + 2.6, y + 2.6, z));
    B.deco(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 0.3), SM.bronze), x, y + 4.8, z);
    a.bells = [-1.6, 0, 1.6].map((dx2, i) => {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 1.0, 12, 1, true), SM.bronze);
      bell.material = SM.bronze;
      bell.position.set(x + dx2, y + 4.1, z);
      B.add(bell);
      return bell;
    });
    a.shrine = shrine;
    a.map.pois.push({ x, z, label: 'The Silent Bells', icon: 'ruin' });
    B.sign(x + 1, y, z + 8.2, 0, ['Carved on the shrine steps:', '"The bells of the Galecrown rang for every messenger that left and every one that came home."', '"When the wind turned cruel, their clappers were carried away: one to the pillars of the east, one to the spire rock, one to the old watch-ring in the west."']);
    // Hjärtat i templet (öppnas när klockorna ringer)
    B.chest('galeBells', x, y + 0.4, z - 3.2, Math.PI, { item: 'heart' }, { big: true, hidden: true });
  }

  // ---------- vindpelarna i öster (en kläpp; sandalerna behövs) ----------
  const pillarsY = 9;
  const P1 = { x: GX + 40, z: -34 }, P2 = { x: GX + 52, z: -34 };
  {
    const y0 = H(P1.x, P1.z);
    for (const p of [P1, P2]) {
      const m = new THREE.Mesh(box(4, pillarsY + 6, 4, 2), M.rock);
      m.position.set(p.x, y0 + (pillarsY + 6) / 2 - 6, p.z);
      B.solid(m);
      B.deco(new THREE.Mesh(box(4.4, 0.4, 4.4, 2), SM.flag), p.x, y0 + pillarsY + 0.2, p.z);
    }
    // Väggen med bronsfjädrar mellan pelarna (på norra sidan av glipan)
    const wall = new THREE.Mesh(box(8.4, 6, 0.6, 2.5), SM.feather);
    wall.position.set((P1.x + P2.x) / 2, y0 + pillarsY + 2, P1.z - 2.3);
    B.solid(wall);
    a.updrafts = [{ x: P1.x - 3.6, z: P1.z, r: 1.4, y0: y0 - 1, y1: y0 + pillarsY + 2.2, power: 10, on: true }];
    // Strimmorna i uppvinden syns med en enkel pelare av ljust tyg i vinden
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, pillarsY + 3, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    col.position.set(P1.x - 3.6, y0 + (pillarsY + 3) / 2 - 1, P1.z);
    B.add(col);
    B.deco(new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.15, 16), SM.bronze), P1.x - 3.6, y0 + 0.05, P1.z);
    a.clapperSpots = [{ id: 'east', x: P2.x, y: y0 + pillarsY + 0.4, z: P2.z }];
    B.sign(P1.x - 6.5, y0, P1.z + 2, -Math.PI / 2, ['Scratched on a rock:', '"The wind climbs the first pillar. Only feathered feet can cross to the second."']);
  }

  // ---------- den gamla vaktringen i väster (en kläpp, och asklingar) ----------
  {
    const x = GX - 44, z = 4, y = H(x, z);
    B.ruin(x, y - 0.2, z, 0.3, 7, 9, 1703);
    a.clapperSpots.push({ id: 'west', x, y: y + 0.2, z });
    a.map.pois.push({ x, z, label: 'Old watch-ring', icon: 'ruin' });
  }
  // ---------- en kläpp på tornets ö ----------
  {
    const x = SPIRE.x + 16, z = SPIRE.z + 10, y = HS(x, z);
    B.rock(x + 2, y, z - 1.5, 2.2, 1711);
    a.clapperSpots.push({ id: 'spire', x, y: y + 0.1, z });
  }
  // ---------- Tobs drake: fast i stenkretsen ----------
  {
    const x = GX + 4, z = -30, y = H(x, z);
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2;
      B.solid(place(new THREE.Mesh(box(1.2, 3.6 + (k % 2) * 1.2, 0.8, 1.5), M.rock), x + Math.cos(ang) * 5, y + 1.6, z + Math.sin(ang) * 5));
    }
    a.kiteSpot = { x: x + 5, y: y + 3.4, z };
    a.map.pois.push({ x, z, label: 'Standing stones', icon: 'ruin' });
  }

  // ---------- döda, vindböjda träd, stenar och vindflaggor ----------
  for (const [x, z, s] of [[60, 40, 1.1], [-50, 50, 1.0], [-62, -20, 1.2], [20, 60, 0.9], [70, -50, 1.0], [-20, -60, 1.1], [0, 70, 1.0]]) {
    const px = GX + x, pz = z, py = H(px, pz);
    const trunk = new THREE.Mesh(cyl(0.22 * s, 0.4 * s, 4.6 * s, 6, 1), M.char);
    trunk.rotation.z = 0.35;
    B.solid(place(trunk, px, py + 2.1 * s, pz));
    B.oak(px + 1.2 * s, py + 3.4 * s, pz, 0.6 * s, M.leaf, false);
  }
  for (let i = 0; i < 40; i++) {
    const ang = rand() * Math.PI * 2, r = 12 + rand() * 66, x = GX + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if ([...road, ...road2].some(([px, pz]) => Math.hypot(px - x, pz - z) < 5)) continue;
    if (Math.hypot(x - SHRINE.x, z - SHRINE.z) < 10 || Math.hypot(x - CAMP.x, z - CAMP.z) < 8 || Math.hypot(x - P1.x - 6, z - P1.z) < 12) continue;
    B.rock(x, H(x, z), z, rand() < 0.25 ? 1.8 + rand() * 2 : 0.5 + rand(), 1720 + i);
  }
  // Vindflaggor: stänger med långa vimplar som fladdrar
  a.pennants = [];
  for (const [x, z] of [[78, 8], [78, -8], [40, 30], [-14, 26], [-38, -56], [10, -20]]) {
    const px = GX + x, pz = z, py = H(px, pz);
    B.solid(place(new THREE.Mesh(cyl(0.08, 0.1, 6, 5, 1), M.wood), px, py + 3, pz));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6, 8, 1), new THREE.MeshLambertMaterial({ color: 0xb83a2a, side: THREE.DoubleSide }));
    flag.geometry.translate(1.3, 0, 0);
    flag.position.set(px, py + 5.5, pz);
    B.add(flag);
    a.pennants.push(flag);
  }
  a.updaters.push((t) => {
    for (const [i, f] of a.pennants.entries()) {
      const p = f.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k);
        p.setZ(k, Math.sin(t * 7 + x * 2 + i) * 0.18 * (x / 2.6));
      }
      p.needsUpdate = true;
      f.rotation.y = -0.6 + Math.sin(t * 0.3 + i) * 0.15;
    }
  });

  // ---------- kulisser: Stormreach i öster, molnhav ----------
  for (const [x, z, r, y] of [[-200, -60, 50, 10], [180, -140, 40, 20], [-160, 120, 36, -4], [190, 90, 30, 0]]) {
    B.backdrop(GX + x, z, r, y, 1730 + x, { topMat: M.rockTop, rings: 6, segs: 28 });
  }

  // ---------- fiender ----------
  const VV = (x, z) => V3(GX + x, Hall(GX + x, z), z);
  const pack = (cx, cz, n, opts = {}) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, h = VV(cx + Math.cos(ang) * 3.5, cz + Math.sin(ang) * 3.5);
      B.enemy(h, [VV(cx + Math.cos(ang + 1) * 6, cz + Math.sin(ang + 1) * 6), VV(cx + Math.cos(ang - 1) * 5, cz + Math.sin(ang - 1) * 5)], i === 0 ? opts : {});
    }
  };
  pack(-44, 4, 3, { kind: 'shield' });
  pack(12, -8, 3);
  pack(-62, -110, 2, { kind: 'shield' });
  for (const [x, z] of [[30, -10], [-30, 60], [60, 30], [-90, -100]]) B.enemy(VV(x, z), [], { kind: 'bat' });
  B.end();
  return { H, Hall, area: a, camp: fire, spirePos: SPIRE };
}

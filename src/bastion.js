// The Tempest Bastion – Tors brända fästning av mörkt järn.
//
// Rummen (världskoordinater, x österut, z söderut):
//
//                          R9 Hrungnirs krets (cirkel kring 0, -214)
//                                     │ bossdörr (Stormnyckeln)
//   R6 Kondensatorrummet ── R4 Smideshallen ── R7 Den spräckta salen  (R8 Källaren under R7)
//          (kretsdörr)     (Järnväktaren)  (bommad)        │ låst dörr (nyckel 2)
//                              │ låst dörr (nyckel 1)       C5 gången
//   R2 Vaktsalen ───────── R1 Förhallen ─────── R5 Vindbryggan
//      (fällrum)               │ ingång      (kretsdörr)
//                          Förgården ← stenvägen från Aetheria
//
// Vägen genom fästningen (0.8: fästningen har fyra nya delar, se bastionwings.js):
//   R1 (karta) → R2 (fällrum, nyckel 1) → R4 (Järnväktaren, Mjölnirs skärva) → R6 (kondensatorn, nyckel 2)
//   → R1 östra kretsdörren → R5 (vindbryggan, tung vikt) → R7 (spräckt golv) → R8 källaren
//   → trappan ner till The Lightning Cisterns och The Deep Forge (dynamon)
//   → R5 dörren österut till The Thunder Spire och The Storm Crown (Stormnyckeln)
//   → virveln ner till R4 → R9 Hrungnir
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2 } from './geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { IronWarden, Hrungnir } from './bosses.js';
import { buildItem } from './items.js';

const H = 6.5; // väggarnas höjd
const DOOR_W = 2.4, DOOR_H = 3.6;

export const ROOMS = {
  F: { name: 'Forecourt', x0: -12, x1: 12, z0: -150, z1: -143, y: 0, map: false },
  R1: { name: 'Entrance Hall', x0: -9, x1: 9, z0: -168, z1: -150, y: 0 },
  R2: { name: 'Guard Hall', x0: -29, x1: -11, z0: -168, z1: -150, y: 0 },
  R5: { name: 'Wind Bridge', x0: 11, x1: 35, z0: -168, z1: -150, y: 0 },
  C5: { name: 'Corridor', x0: 31, x1: 34, z0: -175, z1: -168, y: 0 },
  R4: { name: 'Forge Hall', x0: -13, x1: 13, z0: -196, z1: -170, y: 0 },
  R6: { name: 'Coil Chamber', x0: -35, x1: -15, z0: -196, z1: -176, y: 0 },
  R7: { name: 'Cracked Hall', x0: 15, x1: 35, z0: -196, z1: -176, y: 0 },
  R8: { name: 'Cellar', x0: 15, x1: 35, z0: -196, z1: -176, y: -6, basement: true },
  P9: { name: 'Passage', x0: -1.2, x1: 1.2, z0: -199.5, z1: -197, y: 0, map: false },
  R9: { name: "Hrungnir's Ring", cx: 0, cz: -214, r: 15.6, y: 0, x0: -15.6, x1: 15.6, z0: -229.6, z1: -198.4 },
};

// Dörrar. axis 'x': väggen står vinkelrätt mot x (dörren spänner längs z). sides: vilket rum ligger på vilken sida.
const DOORS = [
  { id: 'd12', x: -10, z: -159, axis: 'x', type: 'open', neg: 'R2', pos: 'R1' },
  { id: 'd15', x: 10, z: -159, axis: 'x', type: 'circuit', neg: 'R1', pos: 'R5' },
  { id: 'd14', x: 0, z: -169, axis: 'z', type: 'key', neg: 'R4', pos: 'R1' },
  { id: 'd46', x: -14, z: -183, axis: 'x', type: 'circuit', neg: 'R6', pos: 'R4' },
  { id: 'd47', x: 14, z: -183, axis: 'x', type: 'bar', neg: 'R4', pos: 'R7', openFrom: 'pos' },
  { id: 'd49', x: 0, z: -196.5, axis: 'z', type: 'boss', neg: 'P9', pos: 'R4' },
  { id: 'd57', x: 32.5, z: -175.5, axis: 'z', type: 'key', neg: 'R7', pos: 'C5' },
];

const INSCRIPTIONS = [
  { x: -5, z: -145.6, face: 0, text: ['Carved into the stone:', '"Here the thunder was forged. Here it rests now, broken among the lightning."'] },
  { x: 8.4, z: -155.2, face: -Math.PI / 2, text: ['Carved into the copper:', '"Thunder travels wherever the metal leads it."'] },
  { x: 11.4, z: -153.5, face: Math.PI / 2, text: ['Carved into the iron:', '"Only one who bears the weight of thunder can withstand the breath of the storm."'] },
  { x: -16.4, z: -179.5, face: -Math.PI / 2, text: ['Carved into the iron:', '"Two hearts of copper must beat as one."'] },
  { x: 25, z: -176.6, face: Math.PI, text: ['Carved into the iron:', '"The floor bears the light, but betrays the heavy."'] },
  { x: 4.2, z: -195.4, face: Math.PI, text: ['Carved above the great door:', `"Hrungnir's heart is made of stone. Only thunder can make it stop."`] },
];

export class Bastion {
  constructor(ctx) {
    this.ctx = ctx;
    this.game = null; // sätts av main.js: { player, enemies, sfx, fx, hud, rig, dialog, story, lights }
    this.rooms = ROOMS;
    this.collider = null;
    this.t = 0;
    const { M } = ctx;
    this.M = M;
    this.D = new THREE.Group(); // rörliga saker (dörrar, kistor, kretsar) – slås inte ihop
    ctx.scene.add(this.D);
    this.mGroove = () => new THREE.MeshBasicMaterial({ color: 0x3a2418 });
    this.state = Bastion.freshState();
    this.trap = null;
    this.room = null;
    this.interactions = [];
    this.plates = [];
    this.circuits = {};
    this.doors = {};
    this.chests = {};
    this.pulses = [];
    this.enemySpots = [];
    this.groundAt = null;

    this.buildBase();
    this.buildRooms();
    this.buildDoors();
    this.buildDecor();
    this.buildCircuits();
    this.buildChests();
    this.buildWind();
    this.buildCracked();
    this.buildHatch();
    this.buildArena();
    this.buildPedestal();
    this.buildInscriptions();
    this.buildEnemies();
    this.buildTowers();
  }

  static freshState() {
    return {
      visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {},
      solved: {}, hammerTaken: false, heartTaken: false, letter: false, entered: false,
    };
  }

  // ------------------------------------------------------------------
  // Bygget
  // ------------------------------------------------------------------
  slab(x0, x1, y0, y1, z0, z1, mat, tile = 2, parent) {
    const m = new THREE.Mesh(box(x1 - x0, y1 - y0, z1 - z0, tile), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.ctx.solid(m, parent);
    return m;
  }

  // En vägg längs x (a = x) eller längs z (a = z), med öppningar [{c, w, h}] från golvet fy
  wall(along, a0, a1, t0, t1, y0, y1, fy, openings = [], ragged = true) {
    const M = this.M;
    const mk = (b0, b1, c0, c1) => {
      if (b1 - b0 < 0.01 || c1 - c0 < 0.01) return;
      if (along === 'x') this.slab(b0, b1, c0, c1, t0, t1, M.ironWall);
      else this.slab(t0, t1, c0, c1, b0, b1, M.ironWall);
    };
    const ops = openings.slice().sort((p, q) => p.c - q.c);
    let a = a0;
    for (const o of ops) {
      const w = o.w ?? DOOR_W, h = o.h ?? DOOR_H, ofy = o.fy ?? fy;
      mk(a, o.c - w / 2, y0, y1);
      mk(o.c - w / 2, o.c + w / 2, ofy + h, y1);
      // Tröskeln under dörröppningen fyller glappet mellan rummens golv
      if (ofy > y0) mk(o.c - w / 2, o.c + w / 2, y0, ofy);
      a = o.c + w / 2;
    }
    mk(a, a1, y0, y1);
    if (!ragged) return;
    // Sönderbrända murkrön
    for (let b = a0; b < a1 - 0.6; b += 1.8 + hash2(b, t0) * 1.4) {
      if (hash2(b * 1.7, t1) < 0.45) continue;
      const w = 0.9 + hash2(b, t1 * 3) * 1.3, h = 0.4 + hash2(b * 2.3, t0) * 1.6;
      const e = Math.min(a1, b + w);
      if (along === 'x') {
        const m = new THREE.Mesh(box(e - b, h, t1 - t0, 2), M.ironWall);
        this.ctx.S.add(place(m, (b + e) / 2, y1 + h / 2, (t0 + t1) / 2));
      } else {
        const m = new THREE.Mesh(box(t1 - t0, h, e - b, 2), M.ironWall);
        this.ctx.S.add(place(m, (t0 + t1) / 2, y1 + h / 2, (b + e) / 2));
      }
    }
  }

  buildBase() {
    const { island, M } = this.ctx;
    const rock = (cx, cz, r, y, depth, seed) =>
      island({ cx, cz, baseR: r, rNoise: r * 0.12, seed, amp: 0.2, depth, rings: 10, segs: 40, collide: false, baseY: y, topMat: M.rockTop });
    rock(-10, -159, 20, -1.3, 34, 51);
    rock(-11, -186, 24, -1.3, 40, 52);
    rock(25, -184, 14, -7.6, 30, 53);
    rock(33, -158, 5.5, -1.3, 16, 54);
    rock(0, -214, 18, -1.3, 36, 55);
    rock(0, -146.5, 10, -1.3, 18, 56);
  }

  buildRooms() {
    const M = this.M, R = ROOMS;
    // Golv
    for (const id of ['F', 'R1', 'R2', 'R4', 'R6', 'C5', 'P9']) {
      const r = R[id];
      this.slab(r.x0, r.x1, -1, 0, r.z0 - (id === 'C5' ? 0.5 : 0), r.z1 + (id === 'C5' ? 0.5 : 0), M.ironFloor, 2);
    }
    // R5: avsats, smal brygga, landning – resten är en klyfta ner i stormen
    this.slab(11, 14, -1, 0, -168, -150, M.ironFloor);
    this.slab(14, 30, -0.6, 0, -159.8, -158.2, M.ironFloor, 1.6);
    this.slab(30, 35, -1, 0, -168, -150, M.ironFloor);
    // R7: golv med två hål (det spräckta partiet och luckan till källaren)
    const r7 = [[15, 35, -180, -176], [15, 20, -192, -180], [30, 35, -192, -180], [15, 35, -192.5, -192], [15, 17.5, -195.5, -192.5], [24, 35, -195.5, -192.5], [15, 35, -196, -195.5]];
    for (const [x0, x1, z0, z1] of r7) this.slab(x0, x1, -0.5, 0, z0, z1, M.ironFloor);
    // R8: källargolvet
    this.slab(15, 35, -7, -6, -196, -176, M.ironFloor);

    // Väggar (golvhöjd 0 om inget annat anges)
    const W = (along, a0, a1, t0, t1, ops, y0 = -1, y1 = H) => this.wall(along, a0, a1, t0, t1, y0, y1, 0, ops);
    // Förhallen
    W('x', -10, 10, -150, -149, [{ c: 0, w: 4.4, h: 4.4 }]);
    W('x', -10, 10, -169, -168, [{ c: 0 }]);
    W('z', -168, -150, -10, -9, [{ c: -159 }]);
    W('z', -168, -150, 9, 10, [{ c: -159 }]);
    // Vaktsalen
    W('x', -30, -10, -150, -149, []);
    W('x', -30, -10, -169, -168, []);
    W('z', -168, -150, -30, -29, []);
    W('z', -168, -150, -11, -10, [{ c: -159 }]);
    // Vindbryggan: norra muren är sönderblåst mellan x 14 och 30
    W('x', 10, 36, -150, -149, []);
    this.wall('x', 10, 14, -169, -168, -1, H, 0, []);
    this.wall('x', 14, 30, -169, -168, -1, 1.2, 0, [], false);
    this.wall('x', 30, 36, -169, -168, -1, H, 0, [{ c: 32.5 }]);
    W('z', -168, -150, 10, 11, [{ c: -159 }]);
    W('z', -168, -150, 35, 36, [{ c: -155 }]);
    // Gången österut till The Thunder Spire
    this.slab(35, 46, -1, 0, -156.2, -153.8, M.ironFloor);
    this.wall('x', 36, 46, -157.2, -156.2, -1, 4.6, 0, [], false);
    this.wall('x', 36, 46, -153.8, -152.8, -1, 4.6, 0, [], false);
    // Gången
    W('z', -175, -169, 30, 31, []);
    W('z', -175, -169, 34, 35, []);
    // Smideshallen
    W('x', -14, 14, -170, -169, [{ c: 0 }]);
    W('x', -14, 14, -197, -196, [{ c: 0 }]);
    W('z', -196, -170, -14, -13, [{ c: -183 }]);
    W('z', -196, -170, 13, 14, [{ c: -183 }]);
    // Kondensatorrummet
    W('x', -36, -14, -176, -175, []);
    W('x', -36, -14, -197, -196, []);
    W('z', -196, -176, -36, -35, []);
    W('z', -196, -176, -15, -14, [{ c: -183 }]);
    // Den spräckta salen och källaren (väggarna går ner till källargolvet)
    W('x', 14, 36, -176, -175, [{ c: 32.5 }], -7);
    W('x', 14, 36, -197, -196, [], -7);
    W('z', -196, -176, 14, 15, [{ c: -183 }, { c: -188, fy: -6 }], -7);
    // Gången västerut mot trappan ner till The Lightning Cisterns, under smideshallen
    this.slab(8, 15, -7, -6, -189.2, -186.8, M.ironFloor);
    this.slab(8, 15, -6 + DOOR_H, -6 + DOOR_H + 0.3, -190.2, -185.8, M.ironWall);
    this.wall('x', 8, 14, -190.2, -189.2, -7, -6 + DOOR_H, -6, [], false);
    this.wall('x', 8, 14, -186.8, -185.8, -7, -6 + DOOR_H, -6, [], false);
    this.wall('z', -190.2, -185.8, 7, 8, -7, -6 + DOOR_H, -6, [], false);
    // Trappan ner i mörkret i gångens västra ände
    for (let i = 0; i < 3; i++) this.ctx.S.add(place(new THREE.Mesh(box(0.9, 0.04, 2.3, 1), M.char), 9.0 + i * 0.9, -5.97, -188));
    W('z', -196, -176, 35, 36, [], -7);
    // Passagen till arenan
    this.wall('z', -199.5, -197, -2.2, -1.2, -1, 4.5, 0, [], false);
    this.wall('z', -199.5, -197, 1.2, 2.2, -1, 4.5, 0, [], false);
    // Förgården: låga murrester
    this.wall('z', -150, -143.5, -12.8, -12, -1, 1.6, 0, [], true);
    this.wall('z', -150, -143.5, 12, 12.8, -1, 1.6, 0, [], true);

    // Rampen i källaren, upp mot luckan i R7:s golv
    {
      const x0 = 17.5, x1 = 33, rise = 6, run = x1 - x0, thick = 0.5;
      // Ovansidan går från (17.5, 0) ner till (33, -6); lådans mitt ligger en halv tjocklek under den
      const th = Math.atan2(rise, run), len = Math.hypot(rise, run);
      const m = new THREE.Mesh(box(len, thick, 2.4, 2), M.ironFloor);
      const nx = Math.sin(th), ny = Math.cos(th);
      m.position.set((x0 + x1) / 2 - nx * thick / 2, -3 - ny * thick / 2, -194);
      m.rotation.z = -th;
      this.ctx.solid(m);
    }
  }

  buildTowers() {
    const M = this.M;
    const tower = (x, z, h, rod) => {
      this.slab(x - 2.5, x + 2.5, -1, h, z - 2.5, z + 2.5, M.ironWall, 2);
      for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -2.2], [0, 2.2]]) {
        if (hash2(x + ox, z + oz) < 0.3) continue;
        const m = new THREE.Mesh(box(1, 1.2, 1, 1), M.ironWall);
        this.ctx.S.add(place(m, x + ox, h + 0.6, z + oz));
      }
      if (rod) {
        const m = new THREE.Mesh(cyl(0.08, 0.16, 7, 6, 1), M.iron);
        this.ctx.S.add(place(m, x, h + 3.5, z));
        this.rodTop = new THREE.Vector3(x, h + 7, z);
      }
    };
    tower(-32.5, -146.5, 12);
    tower(38.5, -146.5, 14);
    tower(-39, -199, 18, true);
    tower(38.5, -199, 13);
    tower(0, -233.5, 16);
    // Blixtar som slår ner i åskledaren
    const geo = new THREE.BufferGeometry();
    this.bolt = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0, fog: false }));
    this.bolt.frustumCulled = false;
    this.ctx.scene.add(this.bolt);
    this.boltT = 3;
    this.boltAge = 9;
  }

  // ---------------- Dörrar ----------------
  buildDoors() {
    const M = this.M;
    const lockMat = new THREE.MeshLambertMaterial({ color: 0x9a7a3a, flatShading: true });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x8fe4ff });
    const barMat = new THREE.MeshLambertMaterial({ color: 0x2c2c32, flatShading: true });
    for (const d of DOORS) {
      const g = new THREE.Group();
      g.position.set(d.x, 0, d.z);
      if (d.axis === 'x') g.rotation.y = Math.PI / 2;
      this.D.add(g);
      const slab = new THREE.Group();
      g.add(slab);
      if (d.type !== 'open') {
        slab.add(place(new THREE.Mesh(box(2.6, 3.8, 0.4, 1.3), M.ironWall), 0, 1.9, 0));
        for (const y of [0.6, 3.2]) slab.add(place(new THREE.Mesh(box(2.6, 0.18, 0.5, 1), M.copper), 0, y, 0));
        if (d.type === 'key') {
          for (const s of [-1, 1]) {
            const c1 = place(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), barMat), 0, 1.8, 0.28 * s);
            c1.rotation.z = 0.6;
            const c2 = c1.clone();
            c2.rotation.z = -0.6;
            slab.add(c1, c2, place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.2), lockMat), 0, 1.8, 0.32 * s));
          }
        } else if (d.type === 'boss') {
          for (const s of [-1, 1]) {
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 16), lockMat);
            disc.rotation.x = Math.PI / 2;
            disc.position.set(0, 2.0, 0.3 * s);
            const rune = place(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.04), runeMat), 0, 2.0, 0.42 * s);
            const rune2 = place(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.04), runeMat), 0, 2.2, 0.42 * s);
            slab.add(disc, rune, rune2);
          }
        } else if (d.type === 'circuit') {
          for (const s of [-1, 1]) slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.04), this.grooveMatFor(d.id)), 0, 1.5, 0.22 * s));
        } else if (d.type === 'bar') {
          const s = d.openFrom === 'pos' ? 1 : -1;
          // Bommen sitter på den sida som får lyfta den
          const beam = place(new THREE.Mesh(box(3.0, 0.3, 0.3, 1), M.wood), 0, 1.7, 0.4 * s);
          slab.add(beam);
          slab.userData.beam = beam;
        }
      }
      const bars = new THREE.Group();
      for (let i = 0; i < 7; i++) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 0.1), barMat), -1.2 + i * 0.4, 1.9, 0));
      for (const y of [0.5, 2.0, 3.5]) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), barMat), 0, y, 0));
      bars.position.y = 4.2;
      bars.visible = false;
      g.add(bars);
      this.doors[d.id] = { ...d, g, slab, bars, slabY: 0, slabTarget: d.type === 'open' ? 4.2 : 0, barsY: 4.2, barsTarget: 4.2, slabBox: null, barsBox: null };
    }
  }

  grooveMatFor(id) {
    if (!this.grooveMats) this.grooveMats = {};
    if (!this.grooveMats[id]) this.grooveMats[id] = this.mGroove();
    return this.grooveMats[id];
  }

  doorBoxExtents(d, y0, y1) {
    if (d.axis === 'x') return [d.x - 0.25, y0, d.z - 1.3, d.x + 0.25, y1, d.z + 1.3];
    return [d.x - 1.3, y0, d.z - 0.25, d.x + 1.3, y1, d.z + 0.25];
  }

  openDoor(id, instant = false) {
    const d = this.doors[id];
    if (!d) return;
    d.slabTarget = 4.2;
    if (instant) d.slabY = 4.2;
    if (!this.state.doors.includes(id)) this.state.doors.push(id);
    if (!instant) this.game?.sfx.play('door');
  }

  setBars(id, down) {
    const d = this.doors[id];
    if (!d) return;
    d.barsTarget = down ? 0 : 4.2;
    d.bars.visible = true;
    this.game?.sfx.play('door', { vol: 0.8 });
  }

  // ---------------- Kretsar, plattor och kondensatorn ----------------
  buildCircuits() {
    const M = this.M;
    const plateMat = () => new THREE.MeshLambertMaterial({ color: 0x8a5634, emissive: 0x000000, flatShading: true });
    const addCircuit = (id, plate, path, onArrive, y = 0) => {
      const mat = this.grooveMatFor(id);
      const segs = [];
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, z0] = path[i], [x1, z1] = path[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.16, 0.03, 0.16), mat);
        m.position.set((x0 + x1) / 2, y + 0.02, (z0 + z1) / 2);
        m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        this.D.add(m);
        segs.push({ x0, z0, x1, z1, len, from: total });
        total += len;
      }
      const pm = plateMat();
      const disc = new THREE.Mesh(cyl(0.95, 1.0, 0.14, 12, 1), pm);
      this.D.add(place(disc, plate[0], y + 0.04, plate[1]));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 4, 16), mat);
      ring.rotation.x = Math.PI / 2;
      this.D.add(place(ring, plate[0], y + 0.13, plate[1]));
      const c = { id, mat, plateMat: pm, segs, total, onArrive, y, plate: new THREE.Vector3(plate[0], y, plate[1]), lit: false };
      this.circuits[id] = c;
      this.plates.push(c);
      return c;
    };
    // Förhallen: plattan öppnar den östra dörren mot vindbryggan
    addCircuit('d15', [5.5, -155.5], [[5.5, -155.5], [8.7, -155.5], [8.7, -159]], () => {
      this.state.solved.d15 = true;
      this.openDoor('d15');
      this.lightCircuit('d15');
      this.game?.sfx.play('secret');
    });
    // Smideshallen: plattan öppnar dörren till kondensatorrummet
    addCircuit('d46', [-7, -183], [[-7, -183], [-12.7, -183]], () => {
      this.state.solved.d46 = true;
      this.openDoor('d46');
      this.lightCircuit('d46');
      this.game?.sfx.play('secret');
    });
    // Kondensatorn: två spolar som måste vara laddade samtidigt
    this.coils = [-23.6, -26.4].map((x, i) => {
      const mat = new THREE.MeshLambertMaterial({ color: 0x6a4428, emissive: 0x000000, flatShading: true });
      const coil = new THREE.Mesh(cyl(0.5, 0.55, 2.4, 10, 1), mat);
      this.ctx.solid(place(coil, x, 1.2, -186), this.D);
      for (let k = 0; k < 4; k++) this.D.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 4, 12).rotateX(Math.PI / 2), M.copper), x, 0.5 + k * 0.5, -186));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.0, 0.16), new THREE.MeshBasicMaterial({ color: 0x8fe4ff }));
      bar.position.set(x, 1.2, -185.4);
      this.D.add(bar);
      return { x, mat, bar, charge: 0 };
    });
    this.ctx.solid(place(new THREE.Mesh(box(1.6, 0.8, 1.2, 1), M.ironWall), -25, 0.4, -186), this.D);
    const charge = (i) => {
      this.coils[i].charge = 1;
      this.game?.sfx.play('zap', { vol: 0.6 });
      if (!this.coilHint && !this.state.solved.cap) {
        this.coilHint = true;
        this.game?.hud.toast('The coil glows... but its charge is slowly fading.', 3400);
      }
    };
    addCircuit('capA', [-19, -193], [[-19, -193], [-19, -186], [-23.0, -186]], () => charge(0));
    addCircuit('capB', [-31, -179], [[-31, -179], [-31, -186], [-27.0, -186]], () => charge(1));
    // Rännan från kondensatorn till buren kring kistan (tänds när pusslet är löst)
    {
      const mat = this.grooveMatFor('capOut');
      const pts = [[-25, -186.7], [-25, -193.5], [-31.4, -193.5]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.16, 0.03, 0.16), mat);
        m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
        m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        this.D.add(m);
      }
    }
    this.addCircuit = addCircuit;
    // Ljuset som följer blixten längs rännan
    this.pulseLight = this.ctx.lights.add({ x: 0, y: 0, z: 0, color: 0x8fe4ff, power: 0, range: 8, flicker: 0 });
    this.pulseLight.on = false;
    this.pulseHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xd8f6ff, fog: false }));
    this.pulseHead.visible = false;
    this.ctx.scene.add(this.pulseHead);
  }

  lightCircuit(id, on = true) {
    const c = this.circuits[id];
    if (c) {
      c.lit = on;
      c.mat.color.set(on ? 0x2e7fa8 : 0x3a2418);
      c.plateMat.emissive.set(on ? 0x1a4a60 : 0x000000);
    } else if (this.grooveMats?.[id]) this.grooveMats[id].color.set(on ? 0x2e7fa8 : 0x3a2418);
  }

  firePlate(c) {
    if (this.pulses.some((p) => p.c === c)) return;
    this.pulses.push({ c, t: 0 });
    c.plateMat.emissive.set(0x6ac8ff);
    this.ctx.lights.pickT = 0; // ljuset som följer blixten ska tändas direkt
    this.game?.sfx.play('pulse');
  }

  // ---------------- Kistor ----------------
  buildChests() {
    const M = this.M;
    const bandMat = new THREE.MeshLambertMaterial({ color: 0x6a5a3a, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xc9a24f, emissive: 0x2a1c06, flatShading: true });
    const defs = [
      { id: 'cMap', x: -6.5, y: 0.3, z: -165.2, face: 0, item: 'map', room: 'R1' },
      { id: 'cKey1', x: -20, y: 0, z: -161, face: 0, item: 'key', room: 'R2', hidden: true },
      { id: 'cKey2', x: -32.5, y: 0, z: -193.4, face: Math.PI / 2, item: 'key', room: 'R6', caged: true },
      // Stormnyckeln ligger numera högst upp i The Storm Crown
    ];
    // Låg pall under kartkistan och Stormnyckelns kista
    this.ctx.solid(place(new THREE.Mesh(cyl(1.1, 1.6, 0.3, 12, 1), M.ironWall), -6.5, 0.15, -165.2));
    this.ctx.solid(place(new THREE.Mesh(box(2.4, 0.5, 2.2, 1), M.ironWall), 30.5, -5.75, -179.5));
    this.ctx.S.add(place(new THREE.Mesh(box(1.0, 0.6, 0.7, 1), M.char), 30.5, -5.2, -179.5));
    for (const def of defs) {
      const g = new THREE.Group();
      g.position.set(def.x, def.y, def.z);
      g.rotation.y = def.face;
      const s = def.big ? 1.3 : 1;
      g.add(place(new THREE.Mesh(box(1.0 * s, 0.6 * s, 0.7 * s, 1), M.wood), 0, 0.3 * s, 0));
      for (const x of [-0.35, 0.35]) g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.62 * s, 0.72 * s), def.big ? goldMat : bandMat), x * s, 0.3 * s, 0));
      const lid = new THREE.Group();
      lid.position.set(0, 0.6 * s, -0.35 * s);
      lid.add(place(new THREE.Mesh(box(1.0 * s, 0.24 * s, 0.7 * s, 1), M.wood), 0, 0.12 * s, 0.35 * s));
      lid.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.14 * s, 0.06), def.big ? goldMat : bandMat), 0, 0.02 * s, 0.71 * s));
      g.add(lid);
      this.D.add(g);
      if (def.hidden) g.visible = false;
      this.chests[def.id] = { ...def, g, lid, open: false, lidT: 0, box: null };
    }
    // Buren runt den andra nyckeln
    const cage = new THREE.Group();
    const barMat = new THREE.MeshLambertMaterial({ color: 0x2c2c32, flatShading: true });
    const bars = [];
    for (let i = 0; i < 6; i++) {
      for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) {
        const t = i / 5;
        bars.push(new THREE.BoxGeometry(0.08, 2.0, 0.08).translate(x0 + (x1 - x0) * t, 1.0, z0 + (z1 - z0) * t));
      }
    }
    bars.push(new THREE.BoxGeometry(2.1, 0.1, 2.1).translate(0, 2.0, 0));
    cage.add(new THREE.Mesh(mergeGeometries(bars), barMat));
    cage.position.set(-32.5, 0, -193.4);
    this.D.add(cage);
    this.cage = { g: cage, y: 0, target: 0, box: null };
  }

  // ---------------- Vindbryggan ----------------
  buildWind() {
    const n = 140;
    const pos = new Float32Array(n * 6);
    this.windSeeds = [];
    for (let i = 0; i < n; i++) this.windSeeds.push({ x: 12 + Math.random() * 23, y: Math.random() * 7 - 2, z: -168 + Math.random() * 18, s: 0.8 + Math.random() * 0.4 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.windLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc8d4e8, transparent: true, opacity: 0.35, fog: true }));
    this.windLines.frustumCulled = false;
    this.ctx.scene.add(this.windLines);
    this.banners = [17, 22, 27].map((x, i) => {
      const pole = new THREE.Mesh(cyl(0.12, 0.14, 4.6, 6, 1), this.M.ironWall);
      this.ctx.solid(place(pole, x, 1.8, -168.5));
      const pivot = new THREE.Group();
      pivot.position.set(x, 3.9, -168.2);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 2.2), i === 1 ? this.M.clothBlue : this.M.clothRed);
      cloth.position.z = 1.1;
      pivot.add(cloth);
      this.D.add(pivot);
      return pivot;
    });
    this.gust = 0;
  }

  windAt(p) {
    if (p.x < 13.6 || p.x > 30.4 || p.z < -168 || p.z > -150 || p.y < -8 || p.y > 4) return 0;
    return this.gust;
  }

  // ---------------- Det spräckta golvet och luckan ----------------
  buildCracked() {
    this.tiles = [];
    for (let x = 20; x < 30; x += 2) {
      for (let z = -192; z < -180; z += 2) {
        const m = new THREE.Mesh(box(1.98, 0.5, 1.98, 2), this.M.cracked);
        m.position.set(x + 1, -0.25, z + 1);
        m.visible = false; // syns först när golvet rasar; innan dess ritas den hopslagna kopian
        this.D.add(m);
        this.tiles.push({ m, x0: x, x1: x + 2, z0: z, z1: z + 2, box: null, vy: 0, spin: (Math.random() - 0.5) * 3 });
      }
    }
    // Hela golvet som en mesh så länge det är helt (en ritning i stället för trettio)
    this.tilesWhole = new THREE.Mesh(mergeGeometries(this.tiles.map((t) => t.m.geometry.clone().translate(t.m.position.x, t.m.position.y, t.m.position.z))), this.M.cracked);
    this.D.add(this.tilesWhole);
    this.crackT = 0;
    this.collapseT = -1;
    this.crackHint = false;
    this.crackSoundT = 0;
    // Bråte på källargolvet, syns efter raset
    this.rubble = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const r = new THREE.Mesh(rockGeo(0.35 + hash2(i, 5) * 0.4, 800 + i, 0.6), this.M.rock);
      r.position.set(21 + hash2(i, 1) * 8, -5.85, -190 + hash2(i, 2) * 9);
      this.rubble.add(r);
    }
    this.rubble.visible = false;
    this.D.add(this.rubble);
  }

  buildHatch() {
    const pivot = new THREE.Group();
    pivot.position.set(17.5, 0, -194);
    const plate = new THREE.Mesh(box(6.5, 0.5, 3.0, 2), this.M.ironFloor);
    plate.position.set(3.25, -0.25, 0);
    pivot.add(plate);
    for (const z of [-1.0, 1.0]) pivot.add(place(new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.06, 0.16), this.M.copper), 3.25, 0.02, z));
    this.D.add(pivot);
    this.hatch = { pivot, angle: 0, target: 0, box: null };
  }

  // ---------------- Arenan: stormpelarna ----------------
  buildArena() {
    const M = this.M, C = new THREE.Vector3(0, 0, -214);
    this.arenaCenter = C;
    const floor = new THREE.Mesh(cyl(15.6, 15.6, 1, 40, 3), M.ironFloor);
    this.ctx.solid(place(floor, C.x, -0.5, C.z));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.1) continue; // ingången i söder
      const h = 2.5 + hash2(i, 9) * 4;
      const m = new THREE.Mesh(box(4.6, h + 1, 1.0, 2), M.ironWall);
      m.position.set(C.x + Math.cos(a) * 16.1, (h - 1) / 2, C.z + Math.sin(a) * 16.1);
      m.rotation.y = -a + Math.PI / 2;
      this.ctx.solid(m);
    }
    this.pylons = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map((a, i) => {
      const px = C.x + Math.cos(a) * 12, pz = C.z + Math.sin(a) * 12;
      this.ctx.solid(place(new THREE.Mesh(cyl(0.55, 0.75, 6.4, 8, 1.5), M.ironWall), px, 3.2, pz));
      for (let k = 0; k < 3; k++) this.ctx.S.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 4, 12).rotateX(Math.PI / 2), M.copper), px, 1.4 + k * 1.8, pz));
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x8fe4ff });
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), orbMat);
      orb.position.set(px, 7.0, pz);
      this.D.add(orb);
      const reachMat = new THREE.MeshBasicMaterial({ color: 0x6ac8ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const reach = new THREE.Mesh(new THREE.RingGeometry(8.1, 8.5, 48).rotateX(-Math.PI / 2), reachMat);
      reach.position.set(px, 0.05, pz);
      reach.renderOrder = 3;
      this.D.add(reach);
      const ppx = C.x + Math.cos(a) * 9.4, ppz = C.z + Math.sin(a) * 9.4;
      const c = this.addCircuit(`py${i}`, [ppx, ppz], [[ppx, ppz], [C.x + Math.cos(a) * 11.4, C.z + Math.sin(a) * 11.4]], () => this.firePylon(i));
      const light = this.ctx.lights.add({ x: px, y: 7, z: pz, color: 0x8fe4ff, power: 10, range: 9, flicker: 0.2 });
      return { i, pos: new THREE.Vector3(px, 0, pz), top: new THREE.Vector3(px, 7, pz), orb, orbMat, reach, reachMat, c, charged: true, cool: 0, light };
    });
    this.portal = new THREE.Group();
    const swirlMat = new THREE.MeshBasicMaterial({ color: 0x8fe4ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 - k * 0.3, 0.06, 6, 24), swirlMat);
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.3 + k * 0.7;
      this.portal.add(t);
    }
    this.portal.position.set(0, 0, -224);
    this.portal.visible = false;
    this.D.add(this.portal);
    this.heartItem = buildItem('heart');
    this.heartItem.position.set(0, 1.2, -212);
    this.heartItem.visible = false;
    this.D.add(this.heartItem);
  }

  firePylon(i) {
    const py = this.pylons[i];
    const boss = this.boss;
    if (!py.charged) {
      this.game?.sfx.play('fizzle');
      return;
    }
    py.charged = false;
    py.cool = 7;
    const inRange = boss && boss.state === 'fight' && Math.hypot(boss.pos.x - py.pos.x, boss.pos.z - py.pos.z) < 8.5;
    const to = inRange ? boss.chest.clone() : py.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 3));
    this.drawBolt(py.top, to, 0.35);
    this.game?.sfx.play('zap', { vol: 1.3 });
    this.game?.sfx.play('thunder', { vol: 0.6 });
    this.game?.lights.flash(to, 0x9fdcff, 60, 18, 0.4);
    this.game?.rig.shake(0.3);
    if (inRange && boss.zap()) {
      this.game?.fx.burst('spark', to, 24, 0x9fdcff);
      this.game?.hud.toast('The lightning brings Hrungnir down! Strike his stone heart!', 2600);
    }
  }

  drawBolt(from, to, life = 0.3) {
    const pts = [];
    const n = 10;
    let prev = from.clone();
    for (let k = 1; k <= n; k++) {
      const p = from.clone().lerp(to, k / n);
      if (k < n) p.add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2));
      pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
    this.bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.boltAge = 0;
    this.boltLife = life;
  }

  // ---------------- Mjölnirs skärva i smideshallen ----------------
  buildPedestal() {
    const M = this.M;
    // Tors städ: en rund upphöjning med sluttande kant (går att gå upp på)
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 0.3, 24), M.ironWall);
    this.ctx.solid(place(dais, 0, 0.15, -185));
    this.ctx.S.add(place(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 4, 32).rotateX(Math.PI / 2), M.copper), 0, 0.31, -185));
    const ped = new THREE.Group();
    ped.add(place(new THREE.Mesh(box(1.0, 1.2, 1.0, 1), M.ironWall), 0, 0.6, 0));
    ped.add(place(new THREE.Mesh(box(1.2, 0.12, 1.2, 1), M.copper), 0, 1.24, 0));
    const hammer = buildItem('hammer');
    hammer.rotation.set(0, 0.6, Math.PI / 2);
    hammer.position.set(0, 1.55, 0);
    ped.add(hammer);
    ped.position.set(0, -1.6, -185);
    this.D.add(ped);
    this.pedestal = { g: ped, hammer, y: -1.6, target: -1.6, box: null };
  }

  // ---------------- Inskriptioner, brevet och dekor ----------------
  buildInscriptions() {
    for (const ins of INSCRIPTIONS) {
      const m = new THREE.Mesh(box(1.3, 1.7, 0.3, 1.3), this.M.runes);
      m.position.set(ins.x, 0.85, ins.z);
      m.rotation.y = ins.face;
      this.ctx.solid(m);
      const fx = Math.sin(ins.face), fz = Math.cos(ins.face);
      this.interactions.push({
        label: 'Read the inscription', pos: () => new THREE.Vector3(ins.x + fx * 1.2, 0, ins.z + fz * 1.2), radius: 1.7,
        ok: () => true, run: () => this.game.story.read(ins.text),
      });
    }
    // Smedens verkstad i kondensatorrummet, med ett brev till Kael och Maren
    const M = this.M;
    this.ctx.solid(place(new THREE.Mesh(box(2.4, 0.9, 1.0, 1), M.wood), -18.6, 0.45, -177.4));
    this.ctx.solid(place(new THREE.Mesh(box(0.5, 0.55, 0.4, 1), M.iron), -21.6, 0.28, -178));
    this.ctx.solid(place(new THREE.Mesh(box(0.9, 0.22, 0.38, 1), M.iron), -21.6, 0.66, -178));
    this.letter = buildItem('letter');
    this.letter.position.set(-18.2, 0.93, -177.4);
    this.letter.rotation.x = -Math.PI / 2;
    this.D.add(this.letter);
    this.interactions.push({
      label: 'Read the letter', pos: () => new THREE.Vector3(-18.4, 0, -179.2), radius: 1.6,
      ok: () => !this.state.letter, run: () => this.game.story.findLetter(),
    });
  }

  buildDecor() {
    const { makeFire, lights } = this.ctx;
    const M = this.M;
    const brazier = (x, z, y = 0) => {
      this.ctx.solid(place(new THREE.Mesh(cyl(0.18, 0.28, 1.1, 6, 1), M.ironWall), x, y + 0.55, z));
      this.ctx.S.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.4, 8), M.iron), x, y + 1.2, z));
      makeFire(x, y + 1.25, z, 0.65, 18, 3);
    };
    [[-6.5, -152.2], [6.5, -152.2], [-26, -152.5], [-14, -165.5], [-10.5, -172.5], [10.5, -172.5], [-10.5, -193.5], [10.5, -193.5],
      [-33, -178], [-17, -194], [33.6, -152], [17.2, -178.2], [33, -178.2], [-2.5, -146.5], [2.5, -146.5]].forEach(([x, z]) => brazier(x, z));
    // Blå kristaller i källaren
    for (const [x, z] of [[15.8, -181], [34.2, -189], [24, -176.6]]) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x6ac8ff }));
      c.scale.y = 1.8;
      this.D.add(place(c, x, -5.3, z));
      lights.add({ x, y: -4.8, z, color: 0x6ac8ff, power: 10, range: 10, flicker: 0.1 });
    }
    // Statyer av krigare vid dörren till smideshallen
    for (const s of [-1, 1]) {
      const x = 3.3 * s, z = -166.4;
      this.ctx.solid(place(new THREE.Mesh(box(1.2, 0.6, 1.2, 1), M.ironWall), x, 0.3, z));
      this.ctx.S.add(place(new THREE.Mesh(box(0.8, 2.2, 0.6, 1), M.iron), x, 1.7, z));
      this.ctx.S.add(place(new THREE.Mesh(box(0.55, 0.55, 0.55, 1), M.iron), x, 3.1, z));
      const axe = place(new THREE.Mesh(box(0.1, 2.6, 0.1, 1), M.iron), x + 0.6 * s, 1.9, z + 0.2);
      axe.rotation.z = 0.2 * s;
      this.ctx.S.add(axe);
    }
    // Rundsköldar på väggarna
    const shield = (x, y, z, ry, mat) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      const disc = new THREE.Mesh(cyl(0.7, 0.7, 0.1, 12, 1), mat);
      disc.rotation.x = Math.PI / 2;
      g.add(disc, place(new THREE.Mesh(box(0.2, 0.2, 0.16, 1), M.iron), 0, 0, 0.06));
      this.ctx.S.add(g);
    };
    [[-8.95, 3.2, -156, Math.PI / 2, M.clothRed], [-8.95, 3.2, -163, Math.PI / 2, M.clothBlue], [8.95, 3.2, -163, -Math.PI / 2, M.clothRed],
      [-28.95, 3, -159, Math.PI / 2, M.clothBlue], [-12.95, 3.2, -177, Math.PI / 2, M.clothRed], [12.95, 3.2, -177, -Math.PI / 2, M.clothBlue],
      [-12.95, 3.2, -190, Math.PI / 2, M.clothBlue], [12.95, 3.2, -190, -Math.PI / 2, M.clothRed]].forEach(([x, y, z, ry, mat]) => shield(x, y, z, ry, mat));
    // Brända bjälkar och bråte
    for (const [x, z, r] of [[-22, -163, 0.6], [-17, -153, -0.4], [7, -180, 1.1], [-8, -192, -0.2], [-28, -190, 0.9], [27, -178, 0.3], [-5, -147, 1.4]]) {
      const b = place(new THREE.Mesh(box(3.2, 0.3, 0.3, 1), M.char), x, 0.16, z);
      b.rotation.y = r;
      this.ctx.S.add(b);
    }
    for (let i = 0; i < 18; i++) {
      const x = -30 + hash2(i, 11) * 62, z = -195 + hash2(i, 12) * 44;
      const inside = Object.values(ROOMS).some((r) => r.x0 !== undefined && x > r.x0 + 1 && x < r.x1 - 1 && z > r.z0 + 1 && z < r.z1 - 1 && !r.basement && r !== ROOMS.R5);
      if (!inside || (x > 19 && x < 31 && z > -193 && z < -179) || Math.hypot(x, z + 185) < 4) continue;
      this.ctx.S.add(place(new THREE.Mesh(rockGeo(0.25 + hash2(i, 3) * 0.35, 900 + i, 0.6), M.rock), x, 0.08, z));
    }
    // Fallen jättestaty i förgården
    {
      const g = new THREE.Group();
      g.position.set(6.5, 0, -146.6);
      g.rotation.y = 0.3;
      g.add(place(new THREE.Mesh(box(3.6, 1.1, 1.3, 1.5), M.marble), 0, 0.55, 0));
      g.add(place(new THREE.Mesh(box(1.1, 1.0, 1.0, 1.5), M.marble), 2.3, 0.5, 0.1));
      g.add(place(new THREE.Mesh(box(1.2, 0.5, 0.5, 1.5), M.marble), -2.3, 0.25, 0.5));
      this.ctx.S.add(g);
      this.ctx.hidden(new THREE.BoxGeometry(4.6, 1.1, 1.4), 7.0, 0.55, -146.4, 0, 0.3, 0);
    }
    // Den uppbrutna porten: två järnflyglar ligger på marken
    for (const s of [-1, 1]) {
      const leaf = place(new THREE.Mesh(box(2.2, 0.3, 4.2, 1.5), M.ironWall), 3.6 * s, 0.15, -147.8);
      leaf.rotation.y = 0.35 * s;
      leaf.rotation.z = 0.08 * s;
      this.ctx.S.add(leaf);
    }
  }

  // ---------------- Fiender ----------------
  buildEnemies() {
    const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
    const b = (id) => ROOMS[id];
    const add = (kind, home, path, room, extra = {}) => this.enemySpots.push({ kind, home, path, room, bounds: b(room), ...extra });
    add('askling', V(-4, -162), [V(-5, -163), V(5, -163)], 'R1');
    add('askling', V(4, -156.5), [V(4, -156), V(-4, -156)], 'R1');
    add('askling', V(-24, -163), [V(-24, -163), V(-16, -163)], 'R2', { dormant: true });
    add('askling', V(-16, -155), [V(-16, -155), V(-24, -155)], 'R2', { dormant: true });
    add('bat', V(-20, -159), null, 'R2', { dormant: true });
    add('bat', V(-25, -154), null, 'R2', { dormant: true });
    add('shield', V(32.5, -160), [V(32.5, -154), V(32.5, -165)], 'R5');
    add('shield', V(-25, -180), [V(-30, -180.5), V(-20, -180.5)], 'R6');
    add('bat', V(-30, -191), null, 'R6');
    add('bat', V(-20, -189.5), null, 'R6');
    add('bat', V(25, -178.5), null, 'R7');
    add('bat', V(18.5, -188), null, 'R7');
    add('askling', V(32, -186), [V(32, -183), V(32, -190)], 'R7');
    add('askling', V(24, -186, -6), [V(18, -186, -6), V(28, -186, -6)], 'R8');
    add('bat', V(20, -181, -6), null, 'R8');
    add('bat', V(29, -190, -6), null, 'R8');
    add('shield', V(26, -180, -6), [V(22, -179, -6), V(30, -183, -6)], 'R8');
  }

  // ------------------------------------------------------------------
  // Koppla in rörliga kollisioner och bossarna
  // ------------------------------------------------------------------
  connect(collider) {
    this.collider = collider;
    const ray = new THREE.Ray(), down = new THREE.Vector3(0, -1, 0);
    this.groundAt = (x, y, z) => {
      ray.origin.set(x, y + 1.6, z);
      ray.direction.copy(down);
      const hit = collider.rayIntersect(ray, 4);
      return hit ? hit.position.y : null;
    };
    for (const d of Object.values(this.doors)) {
      if (d.type !== 'open') d.slabBox = collider.addBox(...this.doorBoxExtents(d, 0, 3.8), d.id);
      d.barsBox = collider.addBox(...this.doorBoxExtents(d, 0, 3.8), `${d.id}-bars`);
      d.barsBox.enabled = false;
    }
    for (const c of Object.values(this.chests)) {
      const s = c.big ? 1.3 : 1;
      c.box = collider.addBox(c.x - 0.55 * s, c.y, c.z - 0.55 * s, c.x + 0.55 * s, c.y + 0.85 * s, c.z + 0.55 * s, c.id);
      c.box.enabled = !c.hidden;
    }
    this.cage.box = collider.addBox(-33.6, 0, -194.5, -31.4, 2.1, -192.3, 'cage');
    for (const t of this.tiles) t.box = collider.addBox(t.x0, -0.5, t.z0, t.x1, 0, t.z1, 'tile');
    this.hatch.box = collider.addBox(17.5, -0.5, -195.5, 24, 0, -192.5, 'hatch');
    this.pedestal.box = collider.addBox(-0.5, -1.6, -185.5, 0.5, -0.4, -184.5, 'pedestal');

    // Bossarna läggs i fästningens egen grupp, som döljs när Cello är långt borta
    this.warden = new IronWarden(this.D, new THREE.Vector3(0, 0, -188.6), 0, ROOMS.R4, this.groundAt);
    this.warden.onEvent = (ev) => { if (ev === 'defeated') this.wardenDefeated(); };
    this.boss = new Hrungnir(this.D, this.arenaCenter, new THREE.Vector3(0, 0, -224.5), this.groundAt);
    this.boss.onEvent = (ev) => { if (ev === 'defeated') this.bossDefeated(); };
    this.warden.blockHint = 'The shield takes the blow. Wait until the axe gets stuck in the floor, or get behind him!';
    this.boss.immuneHint = "His stone hide takes no damage. Lure Hrungnir into a storm pylon's ring and strike its plate with the hammer!";
    this.buildInteractions();
  }

  combatTargets() {
    const out = [];
    if (this.warden && this.warden.targetable) out.push(this.warden);
    if (this.boss && this.boss.targetable) out.push(this.boss);
    const w = this.wingAt(this.areas?.id);
    if (w) out.push(...w.combatTargets());
    return out;
  }

  // De nya delarna (bastionwings.js): en flygel per område
  wingAt(id) {
    return this.wings?.find((w) => w.id === id) ?? null;
  }

  onTorch(id) {
    const w = this.wings?.find((q) => id.startsWith(`${q.id}:`));
    w?.onTorch?.(id);
    return !!w;
  }

  inside(p) {
    return p.x > -44 && p.x < 44 && p.z < -142 && p.z > -240;
  }

  roomAt(p) {
    for (const [id, r] of Object.entries(ROOMS)) {
      if (id === 'R9') {
        if (Math.hypot(p.x - r.cx, p.z - r.cz) < r.r) return id;
        continue;
      }
      if (p.x < r.x0 || p.x > r.x1 || p.z < r.z0 || p.z > r.z1) continue;
      if (id === 'R7' && p.y < -2.5) continue;
      if (id === 'R8' && p.y >= -2.5) continue;
      return id;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Interaktioner (E)
  // ------------------------------------------------------------------
  buildInteractions() {
    const P = () => this.game.player;
    const side = (d) => {
      const p = P().feet;
      return d.axis === 'x' ? (p.x > d.x ? 'pos' : 'neg') : (p.z > d.z ? 'pos' : 'neg');
    };
    const front = (d, s) => {
      const k = s === 'pos' ? 1.5 : -1.5;
      return d.axis === 'x' ? new THREE.Vector3(d.x + k, 0, d.z) : new THREE.Vector3(d.x, 0, d.z + k);
    };
    for (const d of Object.values(this.doors)) {
      if (d.type === 'key') {
        this.interactions.push({
          label: () => (this.state.keys > 0 ? 'Unlock the door' : 'Locked door'), pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id) && this.doorClosedForReal(d),
          run: () => {
            if (this.state.keys > 0) {
              this.state.keys--;
              this.game.sfx.play('keyturn');
              this.openDoor(d.id);
              this.game.story.save(true);
            } else this.game.story.read(['The door is locked.', 'You need an iron key.']);
          },
        });
      } else if (d.type === 'boss') {
        this.interactions.push({
          label: () => (this.state.bossKey ? 'Unlock with the Storm Key' : 'The great door'), pos: () => front(d, 'pos'), radius: 2.0,
          ok: () => !this.state.doors.includes(d.id) && side(d) === 'pos',
          run: () => {
            if (this.state.bossKey) {
              this.game.sfx.play('keyturn');
              this.game.sfx.play('secret');
              this.openDoor(d.id);
              this.game.story.save(true);
            } else this.game.story.read(['The great door is sealed with a rune of lightning.', 'You need the Storm Key.']);
          },
        });
      } else if (d.type === 'circuit') {
        this.interactions.push({
          label: 'Examine the door', pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id),
          run: () => this.game.story.read(this.game.player.hasHammer
            ? ["The door won't budge.", 'A copper channel runs here from a plate in the floor. Perhaps the hammer could wake it?']
            : ["The door won't budge.", 'A copper channel runs here from a plate in the floor. It is cold and dead.']),
        });
      } else if (d.type === 'bar') {
        this.interactions.push({
          label: () => (side(d) === d.openFrom ? 'Lift the bar' : 'Examine the door'), pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id),
          run: () => {
            if (side(d) === d.openFrom) {
              this.state.solved[d.id] = true;
              this.openDoor(d.id);
              this.game.sfx.play('secret');
              this.game.story.save(true);
            } else this.game.story.read(['The door is barred from the other side.']);
          },
        });
      }
    }
    for (const c of Object.values(this.chests)) {
      const fx = Math.sin(c.face), fz = Math.cos(c.face);
      this.interactions.push({
        label: 'Open the chest', pos: () => new THREE.Vector3(c.x + fx * 1.3, c.y, c.z + fz * 1.3), radius: 1.4,
        ok: () => !c.open && c.g.visible && (!c.caged || this.state.solved.cap) && Math.abs(P().feet.y - c.y) < 1.2,
        run: () => this.openChest(c),
      });
    }
    this.interactions.push({
      label: 'Push open the hatch', pos: () => new THREE.Vector3(24.8, -2.4, -194), radius: 2.0,
      ok: () => !this.state.solved.hatch && P().feet.y < -1.2 && P().feet.y > -4,
      run: () => {
        this.state.solved.hatch = true;
        this.hatch.target = -1.75;
        this.game.sfx.play('door');
        this.game.sfx.play('secret');
        this.game.story.save(true);
      },
    });
    this.interactions.push({
      label: "Take Mjölnir's Shard", pos: () => new THREE.Vector3(0, 0, -183.3), radius: 1.6,
      ok: () => this.state.cleared.warden && !this.state.hammerTaken && this.pedestal.y > -0.1,
      run: () => {
        this.state.hammerTaken = true;
        this.pedestal.hammer.visible = false;
        this.game.story.itemGet('hammer');
      },
    });
  }

  doorClosedForReal(d) {
    return d.slabTarget < 1;
  }

  openChest(c) {
    c.open = true;
    if (!this.state.chests.includes(c.id)) this.state.chests.push(c.id);
    this.game.sfx.play('chest');
    this.game.story.itemGet(c.item);
  }

  // Ger föremålet (kallas av berättelsen när fanfaren är klar)
  grant(item) {
    const s = this.state;
    if (item === 'map') s.map = true;
    else if (item === 'key') s.keys++;
    else if (item === 'bosskey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  // ------------------------------------------------------------------
  // Hammarslaget
  // ------------------------------------------------------------------
  // feet: Cellos fötter, så att det också räknas om han står på plattan när han slår
  slam(point, feet = point) {
    let used = false;
    for (const c of this.plates) {
      const d = Math.min(Math.hypot(point.x - c.plate.x, point.z - c.plate.z), Math.hypot(feet.x - c.plate.x, feet.z - c.plate.z) + 0.3);
      if (d < 1.9 && Math.abs(point.y - c.plate.y) < 1.2) {
        this.firePlate(c);
        used = true;
      }
    }
    const w = this.wingAt(this.areas?.id);
    if (w && w.slam(point, feet)) used = true;
    return used;
  }

  // ------------------------------------------------------------------
  // Fällrum, minibossen och bossen
  // ------------------------------------------------------------------
  startTrap(id) {
    const g = this.game;
    this.trap = id;
    if (id === 'R2') {
      this.setBars('d12', true);
      g.enemies.wakeGroup('R2');
      g.hud.toast('The bars slam shut behind Cello!', 2500);
    } else if (id === 'warden') {
      this.setBars('d14', true);
      this.warden.wake();
      g.hud.card('The Iron Warden', "The Bastion's last guardian");
    } else if (id === 'boss') {
      this.setBars('d49', true);
      this.boss.wake();
      g.hud.card('Hrungnir', 'The giant with a heart of stone');
      for (const py of this.pylons) { py.charged = true; py.cool = 0; }
    }
  }

  endTrap(id) {
    this.trap = null;
    this.state.cleared[id] = true;
    if (id === 'R2') {
      this.setBars('d12', false);
      this.game.enemies.killGroup('R2');
      const c = this.chests.cKey1;
      c.g.visible = true;
      c.box.enabled = true;
      this.game.fx.burst('ash', new THREE.Vector3(c.x, 0.6, c.z), 16);
      this.game.sfx.play('secret');
      this.game.hud.toast('A chest appears!', 2200);
    }
    this.game.story.save(true);
  }

  wardenDefeated() {
    this.trap = null;
    this.state.cleared.warden = true;
    this.setBars('d14', false);
    this.pedestal.target = 0;
    this.game.sfx.play('secret');
    this.game.hud.toast("Something rises from Thor's anvil...", 3000);
    this.game.story.save(true);
  }

  bossDefeated() {
    this.trap = null;
    this.state.cleared.boss = true;
    this.setBars('d49', false);
    this.portal.visible = true;
    this.heartItem.visible = !this.state.heartTaken;
    this.game.sfx.play('secret');
    this.drawBolt(new THREE.Vector3(0, 60, -214), new THREE.Vector3(0, 0, -214), 0.6);
    this.game.lights.flash(new THREE.Vector3(0, 3, -214), 0xbfe8ff, 80, 30, 0.8);
    this.game.story.bossDefeated();
  }

  // Cello dog: fällrum som inte är klarade återställs
  onPlayerDeath() {
    if (this.trap === 'R2') this.setBars('d12', false);
    if (this.trap === 'warden') { this.setBars('d14', false); this.warden.reset(); }
    if (this.trap === 'boss') { this.setBars('d49', false); this.boss.reset(); }
    this.trap = null;
    this.wingAt(this.areas?.id)?.onPlayerDeath();
  }

  // ------------------------------------------------------------------
  // Spara och ladda
  // ------------------------------------------------------------------
  applyState(saved) {
    const s = (this.state = { ...Bastion.freshState(), ...(saved || {}) });
    for (const d of Object.values(this.doors)) {
      const open = s.doors.includes(d.id);
      d.slabTarget = d.type === 'open' || open ? 4.2 : 0;
      d.slabY = d.slabTarget;
      d.barsTarget = 4.2;
      d.barsY = 4.2;
      d.bars.visible = false;
    }
    for (const id of ['d15', 'd46']) this.lightCircuit(id, !!s.solved[id]);
    for (const c of Object.values(this.chests)) {
      c.open = s.chests.includes(c.id);
      c.lidT = c.open ? 1 : 0;
      c.g.visible = !c.hidden || !!s.cleared.R2;
    }
    this.cage.target = this.cage.y = s.solved.cap ? 2.4 : 0;
    this.lightCircuit('capA', !!s.solved.cap);
    this.lightCircuit('capB', !!s.solved.cap);
    this.lightCircuit('capOut', !!s.solved.cap);
    this.collapsed = !!s.solved.crack;
    for (const t of this.tiles) { t.m.visible = false; t.m.position.y = -0.25; t.m.rotation.set(0, 0, 0); t.vy = 0; }
    this.tilesWhole.visible = !this.collapsed;
    this.rubble.visible = this.collapsed;
    this.collapseT = -1;
    this.hatch.angle = this.hatch.target = s.solved.hatch ? -1.75 : 0;
    this.pedestal.y = this.pedestal.target = s.cleared.warden ? 0 : -1.6;
    this.pedestal.hammer.visible = !s.hammerTaken;
    this.warden.reset();
    if (s.cleared.warden) { this.warden.state = 'gone'; this.warden.model.root.visible = false; }
    this.boss.reset();
    if (s.cleared.boss) { this.boss.state = 'gone'; this.boss.model.root.visible = false; }
    this.portal.visible = !!s.cleared.boss;
    this.heartItem.visible = !!s.cleared.boss && !s.heartTaken;
    this.letter.visible = !s.letter;
    this.trap = null;
    if (this.game) {
      if (s.cleared.R2) this.game.enemies.killGroup('R2');
    }
    s.junc = s.junc || {};
    s.blocks = s.blocks || {};
    for (const w of this.wings || []) w.applyState();
    this.syncColliders();
  }

  syncColliders() {
    if (!this.collider) return;
    for (const d of Object.values(this.doors)) {
      if (d.slabBox) d.slabBox.enabled = d.slabY < 1.6;
      d.barsBox.enabled = d.barsY < 2.0;
    }
    for (const c of Object.values(this.chests)) c.box.enabled = c.g.visible;
    this.cage.box.enabled = this.cage.y < 1.5;
    for (const t of this.tiles) t.box.enabled = !this.collapsed;
    this.hatch.box.enabled = this.hatch.angle > -0.6;
    this.pedestal.box.min.y = this.pedestal.y - 0.05;
    this.pedestal.box.max.y = this.pedestal.y + 1.25;
  }

  // ------------------------------------------------------------------
  // Varje bildruta
  // ------------------------------------------------------------------
  // frozen: under samtal och föremålsfanfarer står bossarna och fällorna still
  update(dt, t, frozen = false) {
    const g = this.game;
    if (!g) return;
    this.t += dt;
    const p = g.player;
    const near = this.inside(p.feet) || p.feet.z < -120;

    // Rum: besök, rubrik, fällor
    const room = this.inside(p.feet) ? this.roomAt(p.feet) : null;
    if (room !== this.room) {
      this.room = room;
      if (room && !this.state.visited.includes(room)) this.state.visited.push(room);
      if (room === 'R1' && !this.state.entered) {
        this.state.entered = true;
        g.hud.card('The Tempest Bastion', "Thor's burned fortress");
        g.story.save(true);
      }
    }
    const inner = (id, m = 1.6) => {
      const r = ROOMS[id];
      return p.feet.x > r.x0 + m && p.feet.x < r.x1 - m && p.feet.z > r.z0 + m && p.feet.z < r.z1 - m && Math.abs(p.feet.y - r.y) < 2;
    };
    if (!frozen && !this.trap && p.state !== 'dead') {
      if (!this.state.cleared.R2 && inner('R2')) this.startTrap('R2');
      else if (!this.state.cleared.warden && inner('R4', 3) && this.warden.state === 'dormant') this.startTrap('warden');
      else if (!this.state.cleared.boss && this.boss.state === 'dormant' && Math.hypot(p.feet.x, p.feet.z + 214) < 12.5) this.startTrap('boss');
    }
    if (this.trap === 'R2' && g.enemies.groupCleared('R2')) this.endTrap('R2');

    // Dörrar och galler
    for (const d of Object.values(this.doors)) {
      d.slabY += Math.sign(d.slabTarget - d.slabY) * Math.min(Math.abs(d.slabTarget - d.slabY), dt * 2.6);
      d.barsY += Math.sign(d.barsTarget - d.barsY) * Math.min(Math.abs(d.barsTarget - d.barsY), dt * (d.barsTarget < d.barsY ? 9 : 3));
      d.slab.position.y = d.slabY;
      d.bars.position.y = d.barsY;
      if (d.barsY >= 4.19 && d.barsTarget >= 4.19) d.bars.visible = false;
      if (d.slab.userData.beam) d.slab.userData.beam.visible = d.slabTarget < 1;
    }
    // Kistor
    for (const c of Object.values(this.chests)) {
      if (c.open && c.lidT < 1) c.lidT = Math.min(1, c.lidT + dt * 2.2);
      c.lid.rotation.x = -c.lidT * 1.9;
    }
    // Buren lyfts när kondensatorn är laddad
    this.cage.y += Math.sign(this.cage.target - this.cage.y) * Math.min(Math.abs(this.cage.target - this.cage.y), dt * 1.5);
    this.cage.g.position.y = this.cage.y;
    // Tors städ
    this.pedestal.y += Math.sign(this.pedestal.target - this.pedestal.y) * Math.min(Math.abs(this.pedestal.target - this.pedestal.y), dt * 1.1);
    this.pedestal.g.position.y = this.pedestal.y;
    this.pedestal.hammer.rotation.y = 0.6 + Math.sin(this.t * 1.3) * 0.15;
    // Luckan
    this.hatch.angle += Math.sign(this.hatch.target - this.hatch.angle) * Math.min(Math.abs(this.hatch.target - this.hatch.angle), dt * 2.4);
    this.hatch.pivot.rotation.z = -this.hatch.angle;

    // Blixten som vandrar längs rännorna
    for (const pu of this.pulses) {
      pu.t += dt * 14;
      const c = pu.c;
      let head = null;
      for (const s of c.segs) {
        if (pu.t >= s.from && pu.t <= s.from + s.len) {
          const k = (pu.t - s.from) / s.len;
          head = new THREE.Vector3(s.x0 + (s.x1 - s.x0) * k, c.y + 0.15, s.z0 + (s.z1 - s.z0) * k);
        }
      }
      c.mat.color.set(0x9fe8ff);
      if (head) {
        this.pulseHead.visible = true;
        this.pulseHead.position.copy(head);
        this.pulseLight.on = true;
        this.pulseLight.pos.copy(head).y += 0.6;
        this.pulseLight.power = 26;
      }
      if (pu.t >= c.total) {
        pu.done = true;
        c.onArrive();
        if (!c.lit) c.mat.color.set(0x3a2418);
        if (!c.lit) c.plateMat.emissive.set(0x000000);
      }
    }
    if (this.pulses.length && this.pulses.every((pu) => pu.done)) {
      this.pulseHead.visible = false;
      this.pulseLight.on = false;
    }
    this.pulses = this.pulses.filter((pu) => !pu.done);

    // Kondensatorn: båda spolarna laddade samtidigt löser pusslet
    if (!this.state.solved.cap) {
      for (const coil of this.coils) {
        coil.charge = Math.max(0, coil.charge - dt / 8);
        coil.mat.emissive.setRGB(0.1 * coil.charge, 0.45 * coil.charge, 0.6 * coil.charge);
        coil.bar.scale.y = Math.max(0.001, coil.charge);
        coil.bar.position.y = 0.2 + coil.charge;
        coil.bar.visible = coil.charge > 0.01;
      }
      if (this.coils.every((c) => c.charge > 0)) {
        this.state.solved.cap = true;
        this.cage.target = 2.4;
        for (const id of ['capA', 'capB', 'capOut']) this.lightCircuit(id, true);
        g.sfx.play('secret');
        g.hud.toast('The coils are charged – the cage rises!', 2600);
        g.story.save(true);
      }
    } else {
      for (const coil of this.coils) {
        coil.mat.emissive.setRGB(0.08, 0.36, 0.5);
        coil.bar.visible = false;
      }
    }

    // Stormvinden över klyftan
    const ph = (this.t % 2.6) / 2.6;
    const strong = ph < 0.58;
    const target = strong ? 7.8 : 1.0;
    this.gust += (target - this.gust) * (1 - Math.exp(-dt * 6));
    if (strong && !this.wasStrong && room === 'R5') g.sfx.play('gust', { vol: 0.9 });
    this.wasStrong = strong;
    const wind = this.windAt(p.feet);
    p.wind.set(0, 0, wind);
    if (wind > 3 && !p.heavy && p.grounded && !this.windHint) {
      this.windHint = true;
      g.hud.toast('The storm tears at Cello! With heavy weight (G) he can stand his ground.', 4200);
    }
    // Ett tips om stormpelarna, om striden mot Hrungnir drar ut på tiden
    if (this.boss.state === 'fight') {
      this.bossT = (this.bossT || 0) + dt;
      if (this.bossT > 9 && !this.pylonHint) {
        this.pylonHint = true;
        g.hud.toast('Four storm pylons surround the arena. Strike the plate in front of a pylon while Hrungnir stands in its ring!', 5200);
      }
    }
    if (near) {
      const a = this.windLines.geometry.attributes.position.array;
      this.windSeeds.forEach((s, i) => {
        s.z += this.gust * s.s * dt * 1.6;
        if (s.z > -150) { s.z = -168; s.x = 12 + Math.random() * 23; s.y = Math.random() * 7 - 2; }
        const len = 0.4 + this.gust * 0.22;
        a.set([s.x, s.y, s.z, s.x, s.y, s.z + len], i * 6);
      });
      this.windLines.geometry.attributes.position.needsUpdate = true;
      this.windLines.material.opacity = 0.12 + this.gust * 0.04;
      this.banners.forEach((b, i) => { b.rotation.x = -0.15 - Math.min(1.1, this.gust * 0.13) + Math.sin(this.t * 9 + i) * 0.08 * (1 + this.gust * 0.2); });
    }

    // Det spräckta golvet
    if (!this.collapsed) {
      const f = p.feet;
      const onCrack = f.x > 20.2 && f.x < 29.8 && f.z > -191.8 && f.z < -180.2 && f.y > -0.6 && f.y < 0.4 && p.grounded;
      if (onCrack && p.heavy) {
        this.crackT += dt;
        if (Math.random() < dt * 12) g.fx.burst('ash', f.clone().setY(0.1), 2);
        if (this.crackT > 0.35) this.collapse();
      } else {
        this.crackT = 0;
        if (onCrack) {
          this.crackSoundT -= dt;
          if (this.crackSoundT <= 0) { this.crackSoundT = 1.4; g.sfx.play('crack', { vol: 0.5 }); }
          if (!this.crackHint) { this.crackHint = true; g.hud.toast("The floor creaks ominously under Cello's feet...", 3200); }
        }
      }
    } else if (this.collapseT >= 0) {
      this.collapseT += dt;
      for (const tl of this.tiles) {
        tl.vy -= 20 * dt;
        tl.m.position.y += tl.vy * dt;
        tl.m.rotation.x += tl.spin * dt;
        if (tl.m.position.y < -6) tl.m.visible = false;
      }
      if (this.collapseT > 1.5) this.collapseT = -1;
    }

    // Stormpelarna
    for (const py of this.pylons) {
      if (!py.charged) {
        py.cool -= dt;
        if (py.cool <= 0) { py.charged = true; if (this.boss.targetable) g.sfx.play('pulse', { vol: 0.4 }); }
      }
      const bossIn = this.boss.state === 'fight' && Math.hypot(this.boss.pos.x - py.pos.x, this.boss.pos.z - py.pos.z) < 8.5;
      py.orbMat.color.set(py.charged ? (bossIn ? 0xd8f6ff : 0x8fe4ff) : 0x1e2a33);
      py.orb.rotation.y += dt * 2;
      py.reachMat.opacity = this.boss.targetable && py.charged ? (bossIn ? 0.45 + Math.sin(this.t * 14) * 0.15 : 0.1) : 0;
      py.light.level = py.charged ? 1 : 0.1;
    }

    // Bossarna
    if (!frozen && this.warden.state !== 'gone' && (this.trap === 'warden' || this.warden.state !== 'dormant')) this.warden.update(dt, g);
    if (!frozen && this.boss.state !== 'gone' && this.boss.state !== 'dormant') this.boss.update(dt, g);

    // Hjärtbehållaren och virveln hem
    if (this.heartItem.visible) {
      this.heartItem.rotation.y += dt * 2;
      this.heartItem.position.y = 1.2 + Math.sin(this.t * 2.5) * 0.12;
      if (Math.hypot(p.feet.x - this.heartItem.position.x, p.feet.z - this.heartItem.position.z) < 1.2 && Math.abs(p.feet.y) < 1.5) {
        this.heartItem.visible = false;
        g.story.itemGet('heart');
      }
    }
    if (this.portal.visible) {
      this.portal.children.forEach((c, i) => { c.rotation.z += dt * (1.5 + i); c.scale.setScalar(1 + Math.sin(this.t * 3 + i) * 0.06); });
      if (!this.heartItem.visible && Math.hypot(p.feet.x - this.portal.position.x, p.feet.z - this.portal.position.z) < 1.3 && p.state === 'move') g.story.leaveBastion();
    }

    // Blixtar mot åskledaren på det högsta tornet
    if (near) {
      this.boltT -= dt;
      if (this.boltT <= 0 && this.rodTop) {
        this.boltT = 5 + Math.random() * 6;
        this.drawBolt(this.rodTop.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, 70, (Math.random() - 0.5) * 30)), this.rodTop, 0.35);
        g.lights.flash(this.rodTop, 0xbfe8ff, 50, 40, 0.35);
        g.sfx.play('thunder', { vol: 0.5, delay: 0.15 });
      }
    }
    this.boltAge += dt;
    this.bolt.material.opacity = this.boltAge < this.boltLife ? 1 - this.boltAge / this.boltLife : 0;
    this.bolt.visible = this.bolt.material.opacity > 0.02;

    this.syncColliders();
    // Den del av fästningen Cello är i just nu
    this.wingAt(this.areas?.id)?.update(dt, frozen);
  }

  collapse() {
    const g = this.game;
    this.collapsed = true;
    this.collapseT = 0;
    this.state.solved.crack = true;
    for (const t of this.tiles) { t.vy = -Math.random() * 2; t.m.visible = true; }
    this.tilesWhole.visible = false;
    this.rubble.visible = true;
    g.sfx.play('crumble');
    g.sfx.play('stomp', { vol: 0.8 });
    g.rig.shake(0.5);
    g.fx.burst('ash', g.player.feet.clone(), 30);
    this.syncColliders();
  }
}

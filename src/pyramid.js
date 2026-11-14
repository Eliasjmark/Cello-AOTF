// The Sun-Scorched Pyramid – solgudens grav, där Ra's Shattered Prism vilar.
//
// Rummen (lokala koordinater, x österut, z söderut; hela pyramiden ligger vid x 9000):
//
//                        P7 Apophis' helgedom (cirkel kring 0, -66.5)
//                                   │ bossdörr (Solnyckeln)
//   P5 Spegelgalleriet ── slöja ── P4 Ras sal ── nyckeldörr ── P6 Skarabégropen (Khepri → prisman)
//   (två solögon → trappan ner)   (ljusschakt)
//                                   │ nyckeldörr
//   P2 Skuggkryptan ──────────── P1 Förkammaren ── ögondörr ── P3 Solgården (nyckel 1)
//   (fällrum, nyckel 2,           │ ingång (från öknen)
//    slöja med en skattkista)
//
// Vägen genom pyramiden:
//   P1 (karta, spegeln väcker ögat över östra dörren) → P3 (två speglar, nyckel 1) → P2 (fällrum, nyckel 2)
//   → P4 → P6 (Khepri, Ra's Shattered Prism) → P4 (skuggor, schaktet bränner slöjan) → P5 (speglar,
//   schakt och två solögon på en gång öppnar trappan ner) → de fyra nya delarna (pyramidwings.js) upp till toppen,
//   där Solnyckeln ligger → ljusrännan ner till P4 bossdörren → P7 Apophis
import * as THREE from 'three';
import { animateLid } from './chestlid.js';
import { box, cyl, rockGeo, place, hash2 } from './geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Beams, BEAM_Y } from './beams.js';
import { Khepri, Apophis } from './sunbosses.js';
import { buildItem, shardWord } from './items.js';

export const OX = 9000;
const H = 7; // väggarnas höjd
const DOOR_W = 2.4, DOOR_H = 3.6;
const V = (x, y, z) => new THREE.Vector3(OX + x, y, z);

// Rummen i lokala koordinater (görs om till världens längre ner)
const LOCAL_ROOMS = {
  E: { name: 'Entrance', x0: -2.2, x1: 2.2, z0: 0, z1: 13, map: false },
  P1: { name: 'Antechamber', x0: -9, x1: 9, z0: -18, z1: 0 },
  P2: { name: 'Crypt of Shades', x0: -29, x1: -11, z0: -18, z1: 0 },
  P3: { name: 'Sun Court', x0: 11, x1: 31, z0: -18, z1: 0 },
  P4: { name: 'Hall of Ra', x0: -13, x1: 13, z0: -46, z1: -20 },
  P5: { name: 'Mirror Gallery', x0: -37, x1: -15, z0: -46, z1: -20 },
  P6: { name: 'Scarab Pit', x0: 15, x1: 37, z0: -46, z1: -20 },
  C7: { name: 'Passage', x0: -1.2, x1: 1.2, z0: -51, z1: -47, map: false },
  P7: { name: "Apophis' Sanctum", cx: 0, cz: -66.5, r: 15.6, x0: -15.6, x1: 15.6, z0: -82.1, z1: -50.9 },
};
export const ROOMS = Object.fromEntries(Object.entries(LOCAL_ROOMS).map(([id, r]) => [id, {
  ...r, x0: r.x0 + OX, x1: r.x1 + OX, ...(r.cx !== undefined ? { cx: r.cx + OX } : {}),
}]));

// Dörrar (lokala koordinater). axis 'x': väggen står vinkelrätt mot x.
const DOORS = [
  { id: 'd12', x: -10, z: -9, axis: 'x', type: 'open', neg: 'P2', pos: 'P1' },
  { id: 'd13', x: 10, z: -9, axis: 'x', type: 'eye', neg: 'P1', pos: 'P3' },
  { id: 'd14', x: 0, z: -19, axis: 'z', type: 'key', neg: 'P4', pos: 'P1' },
  { id: 'd45', x: -14, z: -33, axis: 'x', type: 'veil', neg: 'P5', pos: 'P4' },
  { id: 'd46', x: 14, z: -33, axis: 'x', type: 'key', neg: 'P4', pos: 'P6' },
  { id: 'd47', x: 0, z: -46.5, axis: 'z', type: 'boss', neg: 'C7', pos: 'P4' },
  // 0.10: trappan ner till The Sunken Galleries (solögonen i spegelgalleriet öppnar den)
  { id: 'd5w', x: -38, z: -31, axis: 'x', type: 'eye', neg: null, pos: 'P5' },
];

const INSCRIPTIONS = [
  { x: 4.6, z: -1.0, face: Math.PI, text: ['Carved into the sandstone:', '"The eye of Ra opens only for the light."'] },
  { x: 17.5, z: -1.0, face: Math.PI, text: ['Carved into the sandstone:', '"The sun turns twice before it rests."'] },
  { x: -15, z: -1.0, face: Math.PI, text: ['Carved into the sandstone:', '"Here sleep those the light forgot. Shadow fears the sun, and nothing else."'] },
  { x: 4.6, z: -21.0, face: Math.PI, text: ['Carved into the sandstone:', `"Where Ra's light falls from the summit, the hand that holds it may burn the night."`] },
  { x: -26, z: -21.0, face: Math.PI, text: ['Carved into the sandstone:', '"Two eyes of Ra must see the sun at once. One drinks the window\'s light, the other the light you carry. Then the way to the deep opens."'] },
  { x: 4.4, z: -45.0, face: 0, text: ['Carved above the great door:', '"Behind this door the serpent of chaos dreams of a world without sun."'] },
];

export class Pyramid {
  constructor(B, area) {
    this.B = B;
    this.area = area;
    this.M = B.M;
    this.game = null; // sätts av main.js: { player, enemies, sfx, fx, hud, rig, dialog, story, lights }
    this.rooms = ROOMS;
    this.collider = null;
    this.t = 0;
    this.D = new THREE.Group(); // rörliga saker – slås inte ihop
    area.root.add(this.D);
    this.state = Pyramid.freshState();
    this.trap = null;
    this.room = null;
    this.interactions = [];
    this.doors = {};
    this.chests = {};
    this.cages = {};
    this.enemySpots = [];
    this.groundAt = null;
    this.hinted = {};
    this.beams = new Beams(this.D, { lights: B.lights });

    this.buildRooms();
    this.buildDoors();
    this.buildDecor();
    this.buildLight();
    this.buildChests();
    this.buildPedestal();
    this.buildArena();
    this.buildInscriptions();
    this.buildEnemies();
  }

  static freshState() {
    return {
      visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {},
      mirrors: {}, veils: [], prismTaken: false, heartTaken: false, entered: false,
    };
  }

  // ------------------------------------------------------------------
  // Bygget
  // ------------------------------------------------------------------
  slab(x0, x1, y0, y1, z0, z1, mat, tile = 2) {
    const m = new THREE.Mesh(box(x1 - x0, y1 - y0, z1 - z0, tile), mat);
    m.position.set(OX + (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.B.solid(m);
    return m;
  }

  deco(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(OX + x, y, z);
    m.rotation.y = ry;
    this.area.S.add(m);
    return m;
  }

  // En vägg längs x (a = x) eller längs z (a = z) med öppningar [{c, w, h}]
  wall(along, a0, a1, t0, t1, openings = [], y1 = H) {
    const M = this.M;
    const mk = (b0, b1, c0, c1, mat = M.hiero) => {
      if (b1 - b0 < 0.01 || c1 - c0 < 0.01) return;
      if (along === 'x') this.slab(b0, b1, c0, c1, t0, t1, mat);
      else this.slab(t0, t1, c0, c1, b0, b1, mat);
    };
    const ops = openings.slice().sort((p, q) => p.c - q.c);
    let a = a0;
    for (const o of ops) {
      const w = o.w ?? DOOR_W, h = o.h ?? DOOR_H;
      mk(a, o.c - w / 2, -1, y1);
      mk(o.c - w / 2, o.c + w / 2, h, y1, M.sandstoneDark);
      a = o.c + w / 2;
    }
    mk(a, a1, -1, y1);
    // En list av mörk sandsten längs krönet
    const len = a1 - a0, th = t1 - t0;
    if (along === 'x') this.deco(box(len, 0.4, th + 0.3, 2), M.sandstoneDark, (a0 + a1) / 2, y1 - 0.2, (t0 + t1) / 2);
    else this.deco(box(th + 0.3, 0.4, len, 2), M.sandstoneDark, (t0 + t1) / 2, y1 - 0.2, (a0 + a1) / 2);
  }

  // Taket: plattor som vänder nedåt (syns inte uppifrån, så kameran aldrig skyms), med hål för ljusschakten
  ceiling(x0, x1, z0, z1, hole = null, y = H) {
    const M = this.M;
    const plane = (a0, a1, b0, b1) => {
      if (a1 - a0 < 0.01 || b1 - b0 < 0.01) return;
      const g = new THREE.PlaneGeometry(a1 - a0, b1 - b0).rotateX(Math.PI / 2);
      this.deco(g, M.sandstoneDark, (a0 + a1) / 2, y, (b0 + b1) / 2);
    };
    if (!hole) { plane(x0, x1, z0, z1); return; }
    const [hx, hz, hr] = hole;
    plane(x0, x1, z0, hz - hr);
    plane(x0, x1, hz + hr, z1);
    plane(x0, hx - hr, hz - hr, hz + hr);
    plane(hx + hr, x1, hz - hr, hz + hr);
  }

  buildRooms() {
    const M = this.M, R = LOCAL_ROOMS;
    // Golv
    for (const id of ['E', 'P1', 'P2', 'P3', 'P4', 'P5', 'C7']) {
      const r = R[id];
      this.slab(r.x0, r.x1, -1, 0, r.z0, r.z1 + (id === 'E' ? 2 : 0), M.sandstone, 2);
    }
    // Skarabégropen har ett golv av sand
    this.slab(R.P6.x0, R.P6.x1, -1, 0, R.P6.z0, R.P6.z1, M.sandRock, 3);
    // Golv i dörröppningarna mellan rummen
    for (const d of DOORS) {
      if (d.axis === 'x') this.slab(d.x - 1, d.x + 1, -1, 0, d.z - DOOR_W / 2, d.z + DOOR_W / 2, M.sandstone, 2);
      else this.slab(d.x - DOOR_W / 2, d.x + DOOR_W / 2, -1, 0, d.z - 1, d.z + 1, M.sandstone, 2);
    }
    this.slab(-1.7, 1.7, -1, 0, -1, 1, M.sandstone, 2);
    this.slab(-30.5, -29, -1, 0, -10.2, -7.8, M.sandstone, 2);

    // Väggar
    const W = (along, a0, a1, t0, t1, ops) => this.wall(along, a0, a1, t0, t1, ops);
    // Ingångsgången
    W('z', 1, 13, -3.2, -2.2, []);
    W('z', 1, 13, 2.2, 3.2, []);
    // Förkammaren
    W('x', -10, 10, 0, 1, [{ c: 0, w: 3.4, h: 4.2 }]);
    W('x', -10, 10, -19, -18, [{ c: 0 }]);
    W('z', -18, 0, -10, -9, [{ c: -9 }]);
    W('z', -18, 0, 9, 10, [{ c: -9 }]);
    // Skuggkryptan (alkoven i väster)
    W('x', -30, -10, 0, 1, []);
    W('x', -30, -10, -19, -18, []);
    W('z', -18, 0, -30, -29, [{ c: -9 }]);
    W('z', -18, 0, -11, -10, [{ c: -9 }]);
    W('x', -33.5, -30, -7.5, -6.5, []);
    W('x', -33.5, -30, -11.5, -10.5, []);
    W('z', -11.5, -6.5, -34.5, -33.5, []);
    this.slab(-33.5, -30, -1, 0, -10.5, -7.5, M.sandstone, 2);
    // Solgården
    W('x', 10, 32, 0, 1, []);
    W('x', 10, 32, -19, -18, []);
    W('z', -18, 0, 10, 11, [{ c: -9 }]);
    W('z', -18, 0, 31, 32, []);
    // Ras sal
    W('x', -14, 14, -20, -19, [{ c: 0 }]);
    W('x', -14, 14, -47, -46, [{ c: 0 }]);
    W('z', -46, -20, -14, -13, [{ c: -33 }]);
    W('z', -46, -20, 13, 14, [{ c: -33 }]);
    // Spegelgalleriet
    W('x', -38, -14, -20, -19, []);
    W('x', -38, -14, -47, -46, []);
    W('z', -46, -20, -38, -37, [{ c: -31 }]);
    // Gången västerut till trappan ner
    this.slab(-47, -37, -1, 0, -32.2, -29.8, M.sandstone, 2);
    this.wall('x', -47, -38, -33.2, -32.2, []);
    this.wall('x', -47, -38, -29.8, -28.8, []);
    this.wall('z', -33.2, -28.8, -48, -47, []);
    this.ceiling(-48, -38, -33.2, -28.8, null, H);
    for (let i = 0; i < 4; i++) this.deco(box(0.9, 0.08, 2.3, 1), M.sandstoneDark, -45.6 + i * 0.9, 0.02, -31);
    W('z', -46, -20, -15, -14, [{ c: -33 }]);
    // Skarabégropen
    W('x', 14, 38, -20, -19, []);
    W('x', 14, 38, -47, -46, []);
    W('z', -46, -20, 14, 15, [{ c: -33 }]);
    W('z', -46, -20, 37, 38, []);
    // Gången till helgedomen
    this.wall('z', -51, -47, -2.2, -1.2, [], 5);
    this.wall('z', -51, -47, 1.2, 2.2, [], 5);

    // Tak
    for (const id of ['P1', 'P2', 'P3', 'P5', 'P6']) {
      const r = R[id];
      const hole = id === 'P5' ? [-21, -42, 1.3] : null;
      this.ceiling(r.x0 - 1, r.x1 + 1, r.z0 - 1, r.z1 + 1, hole);
    }
    this.ceiling(-14, 14, -47, -19, [0, -33, 1.6]);
    this.ceiling(-3.2, 3.2, 0, 13, null, H);
    this.ceiling(-2.2, 2.2, -51, -47, null, 5);
    this.ceiling(-33.5, -30, -11.5, -6.5, null, 4);
  }

  // ---------------- Dörrar ----------------
  buildDoors() {
    const M = this.M;
    const lockMat = new THREE.MeshLambertMaterial({ color: 0x9a7a3a, flatShading: true });
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    const barMat = new THREE.MeshLambertMaterial({ color: 0x3a2c1c, flatShading: true });
    this.eyeDoorMat = new THREE.MeshBasicMaterial({ color: 0x5a3a18 });
    this.eyeDoorMat2 = new THREE.MeshBasicMaterial({ color: 0x5a3a18 });
    for (const d0 of DOORS) {
      const d = { ...d0, x: OX + d0.x };
      const g = new THREE.Group();
      g.position.set(d.x, 0, d.z);
      if (d.axis === 'x') g.rotation.y = Math.PI / 2;
      this.D.add(g);
      const slab = new THREE.Group();
      g.add(slab);
      if (d.type !== 'open' && d.type !== 'veil') {
        slab.add(place(new THREE.Mesh(box(2.6, 3.8, 0.4, 1.3), M.sandstone), 0, 1.9, 0));
        for (const y of [0.4, 3.4]) slab.add(place(new THREE.Mesh(box(2.6, 0.16, 0.5, 1), M.goldPlate), 0, y, 0));
        for (const s of [-1, 1]) {
          if (d.type === 'key') {
            slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.2), lockMat), 0, 1.8, 0.3 * s));
            slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.12), barMat), 0, 1.8, 0.27 * s));
          } else if (d.type === 'boss') {
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.2, 18), M.goldPlate);
            disc.rotation.x = Math.PI / 2;
            disc.position.set(0, 2.0, 0.3 * s);
            slab.add(disc, place(new THREE.Mesh(new THREE.CircleGeometry(0.4, 14), sunMat), 0, 2.0, 0.41 * s));
            if (s < 0) slab.children[slab.children.length - 1].rotation.y = Math.PI;
          } else if (d.type === 'eye') {
            const eye = place(new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), d.id === 'd5w' ? this.eyeDoorMat2 : this.eyeDoorMat), 0, 2.4, 0.21 * s);
            if (s < 0) eye.rotation.y = Math.PI;
            slab.add(eye, place(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 4, 14), M.goldPlate), 0, 2.4, 0.21 * s));
          }
        }
      }
      // Ram runt öppningen
      for (const s of [-1, 1]) g.add(place(new THREE.Mesh(box(0.3, DOOR_H + 0.2, 1.4, 1), M.goldPlate), s * (DOOR_W / 2 + 0.1), DOOR_H / 2, 0));
      const bars = new THREE.Group();
      for (let i = 0; i < 7; i++) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 0.1), barMat), -1.2 + i * 0.4, 1.9, 0));
      for (const y of [0.5, 2.0, 3.5]) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), barMat), 0, y, 0));
      bars.position.y = 4.2;
      bars.visible = false;
      g.add(bars);
      const closed = d.type !== 'open' && d.type !== 'veil';
      this.doors[d.id] = { ...d, g, slab, bars, slabY: closed ? 0 : 4.2, slabTarget: closed ? 0 : 4.2, barsY: 4.2, barsTarget: 4.2, slabBox: null, barsBox: null };
      if (!closed) slab.visible = false;
    }
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
    if (!instant) this.game?.sfx.play('stonegrind');
  }

  setBars(id, down) {
    const d = this.doors[id];
    if (!d) return;
    d.barsTarget = down ? 0 : 4.2;
    d.bars.visible = true;
    this.game?.sfx.play('door', { vol: 0.8 });
  }

  // ---------------- Dekor ----------------
  buildDecor() {
    const M = this.M, B = this.B;
    const brazier = (x, z, y = 0) => {
      B.solid(place(new THREE.Mesh(cyl(0.18, 0.3, 1.1, 6, 1), M.sandstoneDark), OX + x, y + 0.55, z));
      B.deco(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.4, 8), M.goldPlate), OX + x, y + 1.2, z);
      B.makeFire(OX + x, y + 1.25, z, 0.6, 16, 3);
    };
    [[-2, 11], [2, 11], [-7.5, -1.5], [7.5, -16.5], [-27.5, -1.5], [-12.5, -16.5], [12.5, -16.5], [29.5, -1.5],
      [-11.5, -21.5], [11.5, -21.5], [-11.5, -44.5], [11.5, -44.5], [-35.5, -21.5], [-16.5, -44.5], [16.5, -21.5], [35.5, -44.5],
      [35.5, -21.5], [16.5, -44.5]].forEach(([x, z]) => brazier(x, z));

    // Anubis-väktare vid dörren till Ras sal och falkstatyer vid bossdörren
    const guardian = (x, z, ry, falcon) => {
      const g = B.groupAt(OX + x, 0, z, ry);
      B.put(g, new THREE.Mesh(box(1.4, 0.8, 1.4, 1), M.sandstoneDark), 0, 0.4, 0, true);
      B.put(g, new THREE.Mesh(box(0.9, 2.4, 0.7, 1), falcon ? M.goldPlate : M.obsidian), 0, 2.0, 0);
      B.put(g, new THREE.Mesh(box(0.6, 0.6, 0.6, 1), falcon ? M.goldPlate : M.obsidian), 0, 3.5, 0);
      if (falcon) {
        B.put(g, new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 4).rotateX(Math.PI / 2), M.goldPlate), 0, 3.45, 0.45);
        const disc = new THREE.Mesh(cyl(0.45, 0.45, 0.08, 14, 1), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
        disc.rotation.x = Math.PI / 2;
        B.put(g, disc, 0, 4.2, -0.05);
      } else {
        for (const s of [-1, 1]) B.put(g, new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), M.obsidian), s * 0.2, 4.05, 0);
        B.put(g, new THREE.Mesh(box(0.3, 0.25, 0.4, 1), M.obsidian), 0, 3.4, 0.4);
      }
      B.put(g, new THREE.Mesh(box(0.12, 3.0, 0.12, 1), M.goldPlate), 0.6, 2.1, 0.25);
    };
    guardian(-3.4, -16.4, Math.PI, false);
    guardian(3.4, -16.4, Math.PI, false);
    guardian(-4.2, -44.4, 0, true);
    guardian(4.2, -44.4, 0, true);

    // Lotuspelare
    for (const [x, z] of [[-8, -25], [8, -25], [-8, -41], [8, -41], [13.5, -2.2], [13.5, -16], [20, -16]]) {
      B.lotusColumn(OX + x, -0.1, z, H - 0.3, false);
    }
    // Sarkofager i kryptan
    const sarc = (x, z, ry) => {
      const g = B.groupAt(OX + x, 0, z, ry);
      B.put(g, new THREE.Mesh(box(1.2, 0.9, 2.6, 1), M.sandstoneDark), 0, 0.45, 0, true);
      B.put(g, new THREE.Mesh(box(1.1, 0.25, 2.4, 1), M.goldPlate), 0, 1.0, 0);
      B.put(g, new THREE.Mesh(box(0.5, 0.2, 0.5, 1), M.lapis), 0, 1.2, 0.8);
    };
    sarc(-20.5, -5, 0);
    sarc(-15, -5, 0);
    sarc(-15, -12.5, 0);
    sarc(-20.5, -12.5, 0.1);
    // Skarabégropens pelare
    this.pitPillars = [[20.5, -27.5], [31.5, -27.5], [20.5, -38.5], [31.5, -38.5]].map(([x, z]) => {
      B.solid(place(new THREE.Mesh(cyl(1.1, 1.25, H, 10, 2), M.hiero), OX + x, H / 2 - 0.2, z));
      B.deco(new THREE.Mesh(cyl(1.45, 1.45, 0.4, 10, 1), M.sandstoneDark), OX + x, 0.2, z);
      return { x: OX + x, z, r: 1.25 };
    });
    // Sanddrivor, bråte och krukor
    for (let i = 0; i < 14; i++) {
      const x = -35 + hash2(i, 31) * 70, z = -44 + hash2(i, 32) * 42;
      const inside = Object.entries(LOCAL_ROOMS).some(([id, r]) => r.cx === undefined && id !== 'P6' && x > r.x0 + 1.5 && x < r.x1 - 1.5 && z > r.z0 + 1.5 && z < r.z1 - 1.5);
      if (!inside) continue;
      this.deco(rockGeo(0.25 + hash2(i, 3) * 0.3, 1900 + i, 0.6), M.sandRock, x, 0.08, z);
    }
    const P = (x, z) => B.pot(OX + x, 0, z, 1);
    [[-7.8, -6], [7.8, -5.5], [-27.6, -16.5], [-12.4, -1.6], [29.6, -10.5], [12.4, -1.6], [-12, -30], [12, -38], [-35.6, -44.4],
      [-16.4, -21.6], [35.6, -33], [16.4, -24], [-1.8, 5], [1.8, 5]].forEach(([x, z]) => P(x, z));
    // Utgången: ljuset utifrån och dimma
    const sunlit = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5), new THREE.MeshBasicMaterial({ color: 0xffe0b0, fog: false }));
    sunlit.position.set(OX, 2.4, 14.9);
    sunlit.rotation.y = Math.PI;
    this.D.add(sunlit);
    B.mist(OX, -3, 13.5, 6, 5, 4);
    B.lights.add({ x: OX, y: 3, z: 11, color: 0xffc890, power: 12, range: 10, flicker: 0.05 });
  }

  // ---------------- Solstrålar, speglar, solögon och slöjor ----------------
  buildLight() {
    const bz = this.beams, M = this.M;
    const mm = { base: M.sandstoneDark, frame: M.goldPlate };
    const st = () => this.state;
    // Förkammaren: fönstret i söder, en spegel och ögat över dörren till solgården
    bz.addWindow('w1', V(-6, BEAM_Y, -0.12), new THREE.Vector3(0, 0, -1), { room: 'P1' });
    bz.addMirror('m1', V(-6, 0, -12), 2, mm, { room: 'P1' });
    this.eyeE1 = bz.addEye('e1', V(8.85, BEAM_Y, -12), -Math.PI / 2, {
      room: 'P1', onLit: () => {
        st().solved.e1 = true;
        this.eyeDoorMat.color.set(0xffc040);
        this.openDoor('d13');
        this.game?.hud.toast('The sun eye opens – and so does the door!', 2600);
        this.game?.story.save(true);
      },
    });
    // Solgården: fönstret i öster och två speglar mot ögat vid västra väggen
    bz.addWindow('w3', V(30.88, BEAM_Y, -4), new THREE.Vector3(-1, 0, 0), { room: 'P3' });
    bz.addMirror('m3a', V(24, 0, -4), 0, mm, { room: 'P3' });
    bz.addMirror('m3b', V(24, 0, -14), 0, mm, { room: 'P3' });
    this.eyeE3 = bz.addEye('e3', V(11.15, BEAM_Y, -14), Math.PI / 2, {
      room: 'P3', onLit: () => {
        st().solved.e3 = true;
        this.cages.c3.target = 2.4;
        this.game?.hud.toast('The sun eye opens – the cage in the corner rises!', 2600);
        this.game?.story.save(true);
      },
    });
    // Kryptan: ett fönster i söder och en skuggslöja för alkoven i väster
    bz.addWindow('w2', V(-25, BEAM_Y, -0.12), new THREE.Vector3(0, 0, -1), { room: 'P2' });
    this.veilCrypt = bz.addVeil('v2', V(-29.4, DOOR_H / 2, -9), DOOR_W, DOOR_H, 'x', {
      room: 'P2', onBurn: (v) => this.veilBurnt(v),
    });
    // Ras sal: schaktet i mitten och slöjan för dörren till spegelgalleriet
    this.shaftHall = bz.addShaft('s4', V(0, 0.3, -33), 1.3, H + 0.7, { room: 'P4' });
    this.veilHall = bz.addVeil('v45', V(-13.4, DOOR_H / 2, -33), DOOR_W, DOOR_H, 'x', {
      room: 'P4', onBurn: (v) => this.veilBurnt(v, 'The shadow burns away! The way west is open.'),
    });
    // Spegelgalleriet: fönster, tre speglar, ett schakt och två solögon som måste se solen samtidigt
    bz.addWindow('w5', V(-36.88, BEAM_Y, -24), new THREE.Vector3(1, 0, 0), { room: 'P5' });
    bz.addMirror('m5a', V(-30, 0, -24), 0, mm, { room: 'P5' });
    bz.addMirror('m5b', V(-30, 0, -36), 0, mm, { room: 'P5' });
    bz.addMirror('m5c', V(-33, 0, -42), 0, mm, { room: 'P5' });
    this.shaftGallery = bz.addShaft('s5', V(-21, 0, -42), 1.15, H, { room: 'P5' });
    this.eyeA = bz.addEye('e5a', V(-15.15, BEAM_Y, -36), -Math.PI / 2, { room: 'P5', hold: true });
    this.eyeB = bz.addEye('e5b', V(-33, BEAM_Y, -45.85), 0, { room: 'P5', hold: true });
    // Helgedomen: ljuset från pyramidens topp
    this.shaftArena = bz.addShaft('s7', V(0, 0, -66.5), 1.6, 10, { room: 'P7' });
    // Solskivor på golvet under schakten i Ras sal och i helgedomen
    this.B.solid(place(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.3, 24), M.sandstoneDark), OX, 0.15, -33));
    this.deco(new THREE.TorusGeometry(2.9, 0.07, 4, 32).rotateX(Math.PI / 2), M.goldPlate, 0, 0.31, -33);
    // Speglar: ett litet fäste av guld i golvet där varje spegel står
    for (const m of bz.mirrors) this.deco(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 12), M.goldPlate, m.pos.x - OX, 0.025, m.pos.z);
    this.beams.targets = () => this.beamTargets();
  }

  beamTargets() {
    const out = [];
    const g = this.game;
    if (!g) return out;
    for (const e of g.enemies.list) if (e.group === 'pyramid' && e.beamable) out.push(e);
    if (this.boss?.beamable) out.push(this.boss);
    return out;
  }

  veilBurnt(v, msg) {
    if (!this.state.veils.includes(v.id)) this.state.veils.push(v.id);
    if (v.id === 'v45' && !this.state.doors.includes('d45')) this.state.doors.push('d45');
    if (msg) this.game?.hud.toast(msg, 2800);
    this.game?.story.save(true);
  }

  // ---------------- Kistor och burar ----------------
  buildChests() {
    const M = this.M;
    const bandMat = new THREE.MeshLambertMaterial({ color: 0x6a5a3a, flatShading: true });
    const defs = [
      { id: 'pMap', x: 6.5, y: 0.3, z: -3.5, face: -Math.PI / 2, item: 'pmap', room: 'P1' },
      { id: 'pKey1', x: 28.5, y: 0, z: -15.5, face: -Math.PI / 2, item: 'pkey', room: 'P3', cage: 'c3' },
      { id: 'pKey2', x: -17.5, y: 0, z: -15.6, face: 0, item: 'pkey', room: 'P2', hidden: true },
      { id: 'pCrypt', x: -32.2, y: 0, z: -9, face: Math.PI / 2, shards: 20, room: 'P2' },
    ];
    this.B.solid(place(new THREE.Mesh(cyl(1.1, 1.5, 0.3, 12, 1), M.sandstoneDark), OX + 6.5, 0.15, -3.5));
    for (const d0 of defs) {
      const def = { ...d0, x: OX + d0.x };
      const g = new THREE.Group();
      g.position.set(def.x, def.y, def.z);
      g.rotation.y = def.face;
      const s = def.big ? 1.3 : 1;
      g.add(place(new THREE.Mesh(box(1.0 * s, 0.6 * s, 0.7 * s, 1), M.wood), 0, 0.3 * s, 0));
      for (const x of [-0.35, 0.35]) g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.62 * s, 0.72 * s), def.big ? M.goldPlate : bandMat), x * s, 0.3 * s, 0));
      const lid = new THREE.Group();
      lid.position.set(0, 0.6 * s, -0.35 * s);
      lid.add(place(new THREE.Mesh(box(1.0 * s, 0.24 * s, 0.7 * s, 1), M.wood), 0, 0.12 * s, 0.35 * s));
      lid.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.14 * s, 0.06), def.big ? M.goldPlate : bandMat), 0, 0.02 * s, 0.71 * s));
      g.add(lid);
      this.D.add(g);
      if (def.hidden) g.visible = false;
      this.chests[def.id] = { ...def, g, lid, open: false, lidT: 0, box: null };
    }
    // Burar av guld runt nyckeln i solgården och Solnyckeln
    const barMat = new THREE.MeshLambertMaterial({ color: 0xb08a3c, emissive: 0x2a1c06, flatShading: true });
    const mkCage = (id, x, z, y0, half) => {
      const bars = [];
      for (let i = 0; i < 6; i++) {
        for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) {
          const t = i / 5;
          bars.push(new THREE.BoxGeometry(0.08, 2.0, 0.08).translate((x0 + (x1 - x0) * t) * half, 1.0, (z0 + (z1 - z0) * t) * half));
        }
      }
      bars.push(new THREE.BoxGeometry(half * 2 + 0.1, 0.1, half * 2 + 0.1).translate(0, 2.0, 0));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(mergeGeometries(bars), barMat));
      g.position.set(OX + x, y0, z);
      this.D.add(g);
      this.cages[id] = { g, x: OX + x, z, y0, half, y: 0, target: 0, box: null };
    };
    mkCage('c3', 28.5, -15.5, 0, 1.05);
  }

  // ---------------- Prismans piedestal i skarabégropen ----------------
  buildPedestal() {
    const M = this.M;
    const ped = new THREE.Group();
    ped.add(place(new THREE.Mesh(box(1.0, 1.2, 1.0, 1), M.sandstoneDark), 0, 0.6, 0));
    ped.add(place(new THREE.Mesh(box(1.2, 0.12, 1.2, 1), M.goldPlate), 0, 1.24, 0));
    const prism = buildItem('prism');
    prism.position.set(0, 1.75, 0);
    prism.scale.setScalar(1.3);
    ped.add(prism);
    ped.position.set(OX + 26, -1.6, -33);
    this.D.add(ped);
    this.pedestal = { g: ped, prism, y: -1.6, target: -1.6, box: null };
    this.pedestalLight = this.B.lights.add({ x: OX + 26, y: 2.6, z: -33, color: 0xffd080, power: 0, range: 8, flicker: 0.1 });
  }

  // ---------------- Helgedomen: Apophis arena ----------------
  buildArena() {
    const M = this.M, B = this.B;
    const C = V(0, 0, -66.5);
    this.arenaCenter = C;
    B.solid(place(new THREE.Mesh(cyl(15.6, 15.6, 1, 40, 3), M.sandstone), C.x, -0.5, C.z));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.1) continue; // ingången i söder
      const m = new THREE.Mesh(box(4.6, H + 1, 1.0, 2), M.hiero);
      m.position.set(C.x + Math.cos(a) * 16.1, (H - 1) / 2, C.z + Math.sin(a) * 16.1);
      m.rotation.y = -a + Math.PI / 2;
      B.solid(m);
    }
    // Ett tak med ett hål där solen faller in
    const roof = new THREE.Mesh(new THREE.RingGeometry(1.9, 16.8, 40, 1).rotateX(Math.PI / 2), M.sandstoneDark);
    roof.position.set(C.x, H, C.z);
    this.area.S.add(roof);
    // Fyra hål i golvet där ormen bor
    this.holes = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map((a) => {
      const p = new THREE.Vector3(C.x + Math.cos(a) * 9.5, 0, C.z + Math.sin(a) * 9.5);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050307 }));
      hole.position.set(p.x, 0.03, p.z);
      this.D.add(hole);
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2;
        B.deco(new THREE.Mesh(rockGeo(0.35 + hash2(k, a) * 0.3, 2200 + k + a * 10, 0.6), M.sandstoneDark), p.x + Math.cos(ang) * 2.0, 0.1, p.z + Math.sin(ang) * 2.0);
      }
      return p;
    });
    // Ras statyer längs väggen
    for (const a of [0, Math.PI, Math.PI * 1.5]) {
      const x = C.x + Math.cos(a) * 14, z = C.z + Math.sin(a) * 14;
      const g = B.groupAt(x, 0, z, -a - Math.PI / 2);
      B.put(g, new THREE.Mesh(box(1.6, 0.8, 1.6, 1), M.sandstoneDark), 0, 0.4, 0, true);
      B.put(g, new THREE.Mesh(box(1.0, 3.2, 0.8, 1), M.goldPlate), 0, 2.4, 0);
      B.put(g, new THREE.Mesh(box(0.7, 0.7, 0.7, 1), M.goldPlate), 0, 4.35, 0);
      const disc = new THREE.Mesh(cyl(0.55, 0.55, 0.08, 14, 1), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
      disc.rotation.x = Math.PI / 2;
      B.put(g, disc, 0, 5.2, -0.05);
      B.makeFire(x - Math.cos(a) * 1.4, 1.25, z - Math.sin(a) * 1.4, 0.55, 0, 2);
    }
    B.lights.add({ x: C.x, y: 5, z: C.z - 8, color: 0xff9a50, power: 14, range: 14, flicker: 0.3 });
    B.lights.add({ x: C.x, y: 5, z: C.z + 8, color: 0xff9a50, power: 14, range: 14, flicker: 0.3 });
    // Virveln hem och hjärtbehållaren
    this.portal = new THREE.Group();
    const swirlMat = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 - k * 0.3, 0.06, 6, 24), swirlMat);
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.3 + k * 0.7;
      this.portal.add(t);
    }
    this.portal.position.set(C.x, 0, C.z - 10.5);
    this.portal.visible = false;
    this.D.add(this.portal);
    this.heartItem = buildItem('heart');
    this.heartItem.position.set(C.x, 1.2, C.z + 4);
    this.heartItem.visible = false;
    this.D.add(this.heartItem);
  }

  // ---------------- Inskriptioner ----------------
  buildInscriptions() {
    for (const ins of INSCRIPTIONS) {
      const m = new THREE.Mesh(box(1.3, 1.7, 0.3, 1.3), this.M.hiero);
      m.position.set(OX + ins.x, 0.85, ins.z);
      m.rotation.y = ins.face;
      this.B.solid(m);
      const fx = Math.sin(ins.face), fz = Math.cos(ins.face);
      this.interactions.push({
        label: 'Read the inscription', pos: () => V(ins.x + fx * 1.2, 0, ins.z + fz * 1.2), radius: 1.7,
        ok: () => true, run: () => this.game.story.read(ins.text),
      });
    }
  }

  // ---------------- Fiender ----------------
  buildEnemies() {
    // Skuggorna i Ras sal hör till en egen grupp (P4s), så att fällan inte väntar på de vanliga fienderna där
    const add = (kind, home, path, room, extra = {}) => this.enemySpots.push({ kind, home, path, room, bounds: ROOMS[extra.inRoom ?? room], ...extra });
    add('askling', V(-3, 0, -6), [V(-4, 0, -6), V(4, 0, -6)], 'P1');
    add('askling', V(3, 0, -15), [V(3, 0, -15), V(-3, 0, -15)], 'P1');
    add('askling', V(-24, 0, -9), [V(-24, 0, -8), V(-17, 0, -8)], 'P2', { dormant: true });
    add('askling', V(-18, 0, -2.5), [V(-18, 0, -2.5), V(-26, 0, -2.5)], 'P2', { dormant: true });
    add('bat', V(-22, 0, -14), null, 'P2', { dormant: true });
    add('bat', V(-14, 0, -9), null, 'P2', { dormant: true });
    add('askling', V(17, 0, -8), [V(17, 0, -8), V(17, 0, -2)], 'P3');
    add('shield', V(27, 0, -9), [V(28, 0, -9), V(20, 0, -9)], 'P3');
    add('bat', V(20, 0, -12), null, 'P3');
    add('askling', V(6, 0, -27), [V(6, 0, -27), V(6, 0, -39)], 'P4');
    add('shield', V(-6, 0, -39), [V(-6, 0, -39), V(-6, 0, -27)], 'P4');
    add('shade', V(-7, 0, -29.5), [V(-7, 0, -29.5), V(-3, 0, -38)], 'P4s', { dormant: true, inRoom: 'P4' });
    add('shade', V(7, 0, -36.5), [V(7, 0, -36.5), V(3, 0, -28)], 'P4s', { dormant: true, inRoom: 'P4' });
    add('shade', V(-24, 0, -29), [V(-26, 0, -29), V(-19, 0, -29)], 'P5');
    add('shade', V(-25, 0, -39), [V(-27, 0, -39.5), V(-19, 0, -38.5)], 'P5');
    add('bat', V(-20, 0, -26), null, 'P5');
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
      if (d.type !== 'open' && d.type !== 'veil') d.slabBox = collider.addBox(...this.doorBoxExtents(d, 0, 3.8), d.id);
      d.barsBox = collider.addBox(...this.doorBoxExtents(d, 0, 3.8), `${d.id}-bars`);
      d.barsBox.enabled = false;
    }
    for (const c of Object.values(this.chests)) {
      const s = c.big ? 1.3 : 1;
      c.box = collider.addBox(c.x - 0.55 * s, c.y, c.z - 0.55 * s, c.x + 0.55 * s, c.y + 0.85 * s, c.z + 0.55 * s, c.id);
      c.box.enabled = !c.hidden;
    }
    for (const cg of Object.values(this.cages)) {
      cg.box = collider.addBox(cg.x - cg.half - 0.05, cg.y0, cg.z - cg.half - 0.05, cg.x + cg.half + 0.05, cg.y0 + 2.1, cg.z + cg.half + 0.05, 'cage');
    }
    this.pedestal.box = collider.addBox(OX + 25.5, -1.6, -33.5, OX + 26.5, -0.4, -32.5, 'pedestal');
    this.beams.connect(collider);

    // Bossarna
    this.khepri = new Khepri(this.D, V(26, 0, -33), ROOMS.P6, this.pitPillars, this.groundAt);
    this.khepri.onEvent = (ev) => { if (ev === 'defeated') this.khepriDefeated(); };
    this.boss = new Apophis(this.D, this.arenaCenter, this.holes, this.groundAt);
    this.boss.onEvent = (ev) => {
      if (ev === 'dying') this.game?.story.apophisFalls?.();
      if (ev === 'defeated') this.bossDefeated();
    };
    this.buildInteractions();
  }

  // De nya delarna (pyramidwings.js): en flygel per område
  wingAt(id) {
    return this.wings?.find((w) => w.id === id) ?? null;
  }

  onTorch(id) {
    const w = this.wings?.find((q) => id.startsWith(`${q.id}:`));
    w?.onTorch?.(id);
    return !!w;
  }

  combatTargets() {
    const wing = this.wingAt(this.areas?.id);
    if (wing) return wing.combatTargets();
    const out = [];
    if (this.khepri?.targetable) out.push(this.khepri);
    if (this.boss?.targetable) out.push(this.boss);
    // Med prisman uppe går det att sikta på solögon, speglar och slöjor
    const P = this.game?.player;
    if (P?.prismUp) {
      for (const e of this.beams.eyes) if (e.targetable) out.push(e);
      for (const m of this.beams.mirrors) if (m.targetable) out.push(m);
      for (const v of this.beams.veils) if (v.targetable) out.push(v);
    }
    return out;
  }

  inside(p) {
    return p.x > OX - 40 && p.x < OX + 40 && p.z < 15 && p.z > -84;
  }

  roomAt(p) {
    for (const [id, r] of Object.entries(ROOMS)) {
      if (id === 'P7') {
        if (Math.hypot(p.x - r.cx, p.z - r.cz) < r.r) return id;
        continue;
      }
      if (p.x < r.x0 || p.x > r.x1 || p.z < r.z0 || p.z > r.z1) continue;
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
          ok: () => !this.state.doors.includes(d.id) && d.slabTarget < 1,
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
          label: () => (this.state.bossKey ? 'Unlock with the Sun Key' : 'The great door'), pos: () => front(d, 'pos'), radius: 2.0,
          ok: () => !this.state.doors.includes(d.id) && side(d) === 'pos',
          run: () => {
            if (this.state.bossKey) {
              this.game.sfx.play('keyturn');
              this.game.sfx.play('secret');
              this.openDoor(d.id);
              this.game.story.save(true);
            } else this.game.story.read(['The great door bears a golden sun with a hole at its heart.', 'You need the Sun Key.']);
          },
        });
      } else if (d.type === 'eye') {
        this.interactions.push({
          label: 'Examine the door', pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id),
          run: () => this.game.story.read(d.id === 'd5w'
            ? ['A sun eye is carved into the door. Stairs lead down behind it, into the dark.', 'Both eyes of Ra in this gallery must see the sun at once.']
            : ['A sun eye is carved into the door. It is dull and closed.', 'Somewhere in this room, light is waiting to be turned.']),
        });
      } else if (d.type === 'veil') {
        this.interactions.push({
          label: 'Examine the shadow', pos: () => front(d, side(d)), radius: 2.0,
          ok: () => !this.veilHall.burnt,
          run: () => this.game.story.read(this.game.player.hasPrism
            ? ['A veil of living shadow fills the doorway.', 'Sunlight would burn it. Perhaps the light from the ceiling could be carried here.']
            : ['A veil of living shadow fills the doorway. It is cold as a grave.', 'The sword passes through it like smoke, and it closes again behind the blade.']),
        });
      }
    }
    this.interactions.push({
      label: 'Examine the shadow', pos: () => V(-28, 0, -9), radius: 1.8,
      ok: () => !this.veilCrypt.burnt,
      run: () => this.game.story.read(['A veil of living shadow hides an alcove.', 'Something glints behind it, out of reach.']),
    });
    for (const c of Object.values(this.chests)) {
      const fx = Math.sin(c.face), fz = Math.cos(c.face);
      this.interactions.push({
        label: 'Open the chest', pos: () => new THREE.Vector3(c.x + fx * 1.3, c.y, c.z + fz * 1.3), radius: 1.4,
        ok: () => !c.open && c.g.visible && (!c.cage || this.cages[c.cage].y > 1.5),
        run: () => this.openChest(c),
      });
    }
    // Speglarna vrids ett åttondels varv i taget
    for (const m of this.beams.mirrors) {
      this.interactions.push({
        label: 'Turn the mirror', pos: () => m.pos, radius: 1.7,
        ok: () => !m.locked,
        run: () => {
          this.beams.turnMirror(m);
          this.state.mirrors[m.id] = m.a;
          if (!this.hinted.mirror) {
            this.hinted.mirror = true;
            this.game.hud.toast('Each turn moves the mirror an eighth of the way around. Watch where the light goes.', 3800);
          }
        },
      });
    }
    // Ljusschakten
    for (const s of this.beams.shafts) {
      this.interactions.push({
        label: 'Examine the light', pos: () => s.pos, radius: s.radius + 0.4,
        ok: () => !P().hasPrism,
        run: () => this.game.story.read(['Light falls from a crack high above and pools on a golden disc.', 'It is warm, like a hand. But Cello has nothing that can hold it.']),
      });
    }
    this.interactions.push({
      label: "Take Ra's Shattered Prism", pos: () => V(26, 0, -31.3), radius: 1.6,
      ok: () => this.state.cleared.khepri && !this.state.prismTaken && this.pedestal.y > -0.1,
      run: () => {
        this.state.prismTaken = true;
        this.pedestal.prism.visible = false;
        this.pedestalLight.power = 0;
        this.game.story.itemGet('prism');
      },
    });
  }

  openChest(c) {
    c.open = true;
    if (!this.state.chests.includes(c.id)) this.state.chests.push(c.id);
    this.game.sfx.play('chest');
    if (c.shards) {
      const story = this.game.story;
      story.cinematic = true;
      story.after(0.7, () => {
        this.game.sfx.play('fanfare');
        story.inventory?.addShards(c.shards);
        this.game.fx.burst('spark', new THREE.Vector3(c.x, c.y + 1.0, c.z), 14, 0xd08aff);
        story.read([`You found ${shardWord(c.shards)}! It is worth ${c.shards}.`], () => { story.cinematic = false; story.save(true); });
      });
      return;
    }
    this.game.story.itemGet(c.item);
  }

  // Ger föremålet (kallas av berättelsen när fanfaren är klar)
  grant(item) {
    const s = this.state;
    if (item === 'pmap') s.map = true;
    else if (item === 'pkey') s.keys++;
    else if (item === 'sunkey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  // Hammarslaget: inga plattor här, men Khepri vänds på rygg (main.js sköter bossarna)
  slam(point, feet) {
    const w = this.wingAt(this.areas?.id);
    return w ? w.slam(point, feet) : false;
  }

  // ------------------------------------------------------------------
  // Fällrum, minibossen och bossen
  // ------------------------------------------------------------------
  startTrap(id) {
    const g = this.game;
    this.trap = id;
    if (id === 'P2') {
      this.setBars('d12', true);
      g.enemies.wakeGroup('P2');
      g.hud.toast('The bars slam shut! The dead of the crypt rise!', 2500);
    } else if (id === 'P4') {
      this.setBars('d14', true);
      this.setBars('d46', true);
      g.enemies.wakeGroup('P4s');
      g.hud.toast('Shadows rise from the floor! The sword cannot touch them in the dark...', 3200);
      g.story.after(3.4, () => {
        if (this.trap === 'P4') g.hud.toast('Stand in the light from the ceiling, raise the prism and lock on to a shadow!', 4800);
      });
    } else if (id === 'khepri') {
      this.setBars('d46', true);
      this.khepri.wake();
      g.hud.card('Khepri', 'The scarab that rolls the sun');
    } else if (id === 'boss') {
      this.setBars('d47', true);
      this.boss.wake();
      g.hud.card('Apophis', 'The serpent of endless night');
      g.story.after(6, () => {
        if (this.trap === 'boss' && this.boss.hp >= 18) g.hud.toast('Sunlight falls on the centre of the sanctum. Raise the prism there and lock on to the serpent!', 5200);
      });
    }
  }

  endTrap(id) {
    this.trap = null;
    this.state.cleared[id] = true;
    const g = this.game;
    if (id === 'P2') {
      this.setBars('d12', false);
      g.enemies.killGroup('P2');
      const c = this.chests.pKey2;
      c.g.visible = true;
      c.box.enabled = true;
      g.fx.burst('ash', new THREE.Vector3(c.x, 0.6, c.z), 16);
      g.sfx.play('secret');
      g.hud.toast('A chest appears!', 2200);
    } else if (id === 'P4') {
      this.setBars('d14', false);
      this.setBars('d46', false);
      g.enemies.killGroup('P4s');
      g.sfx.play('secret');
      g.story.after(1.2, () => {
        if (!this.veilHall.burnt) g.hud.toast('The shadow still clings to the western door. The same light could burn it...', 4200);
      });
    }
    g.story.save(true);
  }

  khepriDefeated() {
    this.trap = null;
    this.state.cleared.khepri = true;
    this.setBars('d46', false);
    this.pedestal.target = 0;
    this.pedestalLight.power = 14;
    this.game.sfx.play('secret');
    this.game.hud.toast('The sand shifts... something rises where Khepri fell.', 3000);
    this.game.story.save(true);
  }

  bossDefeated() {
    this.trap = null;
    this.state.cleared.boss = true;
    this.setBars('d47', false);
    this.portal.visible = true;
    this.heartItem.visible = !this.state.heartTaken;
    this.game.sfx.play('secret');
    this.game.lights.flash(this.arenaCenter.clone().setY(3), 0xffe0a0, 80, 30, 0.8);
    this.game.story.pyramidBossDefeated?.();
  }

  // Cello dog: fällrum som inte är klarade börjar om
  onPlayerDeath() {
    if (this.trap === 'P2') this.setBars('d12', false);
    if (this.trap === 'P4') { this.setBars('d14', false); this.setBars('d46', false); }
    if (this.trap === 'khepri') { this.setBars('d46', false); this.khepri.reset(); }
    if (this.trap === 'boss') { this.setBars('d47', false); this.boss.reset(); }
    if (this.trap === 'P2' || this.trap === 'P4') {
      const grp = this.trap === 'P4' ? 'P4s' : 'P2';
      for (const e of this.game.enemies.list) if (e.room === grp && e.trapGroup) { e.dormant = true; e.reset(); }
    }
    this.trap = null;
    this.wingAt(this.areas?.id)?.onPlayerDeath();
  }

  // ------------------------------------------------------------------
  // Spara och ladda
  // ------------------------------------------------------------------
  applyState(saved) {
    const s = (this.state = { ...Pyramid.freshState(), ...(saved || {}) });
    s.solved = { ...(s.solved || {}) };
    s.mirrors = { ...(s.mirrors || {}) };
    for (const d of Object.values(this.doors)) {
      const closed = d.type !== 'open' && d.type !== 'veil';
      const open = s.doors.includes(d.id);
      d.slabTarget = !closed || open ? 4.2 : 0;
      d.slabY = d.slabTarget;
      d.barsTarget = 4.2;
      d.barsY = 4.2;
      d.bars.visible = false;
    }
    for (const c of Object.values(this.chests)) {
      c.open = s.chests.includes(c.id);
      c.lidT = c.open ? 1 : 0;
      c.g.visible = !c.hidden || !!s.cleared.P2;
    }
    this.cages.c3.y = this.cages.c3.target = s.solved.e3 ? 2.4 : 0;
    // 0.9 och tidigare: tvillingögonen gav Solnyckeln, nu öppnar de trappan ner
    if (s.solved.sun && !s.doors.includes('d5w')) s.doors.push('d5w');
    this.eyeDoorMat2.color.set(s.solved.sun ? 0xffc040 : 0x5a3a18);
    s.junc = s.junc || {};
    s.blocks = s.blocks || {};
    for (const w of this.wings || []) w.applyState();
    const bz = this.beams;
    const defaults = { m1: 2, m3a: 0, m3b: 0, m5a: 0, m5b: 0, m5c: 0 };
    for (const m of bz.mirrors) {
      m.a = s.mirrors[m.id] ?? defaults[m.id] ?? 0;
      bz.syncMirror(m, true);
    }
    for (const v of bz.veils) bz.setVeil(v, s.veils.includes(v.id));
    for (const e of bz.eyes) bz.setEye(e, false);
    if (s.solved.e1) bz.setEye(this.eyeE1, true);
    if (s.solved.e3) bz.setEye(this.eyeE3, true);
    this.eyeDoorMat.color.set(s.solved.e1 ? 0xffc040 : 0x5a3a18);
    this.pedestal.y = this.pedestal.target = s.cleared.khepri ? 0 : -1.6;
    this.pedestal.prism.visible = !s.prismTaken;
    this.pedestalLight.power = s.cleared.khepri && !s.prismTaken ? 14 : 0;
    if (this.khepri) {
      this.khepri.reset();
      if (s.cleared.khepri) { this.khepri.state = 'gone'; this.khepri.model.root.visible = false; }
    }
    if (this.boss) {
      this.boss.reset();
      if (s.cleared.boss) { this.boss.state = 'gone'; this.boss.model.root.visible = false; }
    }
    this.portal.visible = !!s.cleared.boss;
    this.heartItem.visible = !!s.cleared.boss && !s.heartTaken;
    this.trap = null;
    if (this.game) {
      if (s.cleared.P2) this.game.enemies.killGroup('P2');
      if (s.cleared.P4) this.game.enemies.killGroup('P4s');
    }
    this.syncColliders();
  }

  syncColliders() {
    if (!this.collider) return;
    for (const d of Object.values(this.doors)) {
      if (d.slabBox) d.slabBox.enabled = d.slabY < 1.6;
      d.barsBox.enabled = d.barsY < 2.0;
    }
    for (const c of Object.values(this.chests)) c.box.enabled = c.g.visible;
    for (const cg of Object.values(this.cages)) cg.box.enabled = cg.y < 1.5;
    this.pedestal.box.min.y = this.pedestal.y - 0.05;
    this.pedestal.box.max.y = this.pedestal.y + 1.25;
  }

  // ------------------------------------------------------------------
  // Varje bildruta
  // ------------------------------------------------------------------
  update(dt, t, frozen = false) {
    const g = this.game;
    if (!g) return;
    // I en av de nya delarna sköter flygeln allt
    const wing = this.wingAt(this.areas?.id);
    if (wing) { wing.update(dt, frozen); return; }
    this.t += dt;
    const p = g.player;
    this.beams.ctx.sfx = g.sfx;

    // Rum: besök, rubrik, fällor
    const room = this.inside(p.feet) ? this.roomAt(p.feet) : null;
    if (room !== this.room) {
      this.room = room;
      if (room && !this.state.visited.includes(room)) this.state.visited.push(room);
      if (room === 'P1' && !this.state.entered) {
        this.state.entered = true;
        g.hud.card('The Sun-Scorched Pyramid', "Tomb of the forsaken sun god");
        g.story.save(true);
      }
    }
    const inner = (id, m = 1.6) => {
      const r = ROOMS[id];
      return p.feet.x > r.x0 + m && p.feet.x < r.x1 - m && p.feet.z > r.z0 + m && p.feet.z < r.z1 - m && Math.abs(p.feet.y) < 2;
    };
    if (!frozen && !this.trap && p.state !== 'dead') {
      if (!this.state.cleared.P2 && inner('P2', 2.4) && p.feet.x > ROOMS.P2.x0 + 2) this.startTrap('P2');
      else if (!this.state.cleared.P4 && p.hasPrism && inner('P4', 3)) this.startTrap('P4');
      else if (!this.state.cleared.khepri && this.khepri.state === 'dormant' && inner('P6', 3)) this.startTrap('khepri');
      else if (!this.state.cleared.boss && this.boss.state === 'dormant' && Math.hypot(p.feet.x - this.arenaCenter.x, p.feet.z - this.arenaCenter.z) < 12.5) this.startTrap('boss');
    }
    if (this.trap === 'P2' && g.enemies.groupCleared('P2')) this.endTrap('P2');
    if (this.trap === 'P4' && g.enemies.groupCleared('P4s')) this.endTrap('P4');

    // Dörrar och galler
    for (const d of Object.values(this.doors)) {
      d.slabY += Math.sign(d.slabTarget - d.slabY) * Math.min(Math.abs(d.slabTarget - d.slabY), dt * 2.6);
      d.barsY += Math.sign(d.barsTarget - d.barsY) * Math.min(Math.abs(d.barsTarget - d.barsY), dt * (d.barsTarget < d.barsY ? 9 : 3));
      d.slab.position.y = d.slabY;
      d.bars.position.y = d.barsY;
      if (d.barsY >= 4.19 && d.barsTarget >= 4.19) d.bars.visible = false;
    }
    for (const c of Object.values(this.chests)) {
      animateLid(c, c.open, dt);
    }
    for (const cg of Object.values(this.cages)) {
      cg.y += Math.sign(cg.target - cg.y) * Math.min(Math.abs(cg.target - cg.y), dt * 1.5);
      cg.g.position.y = cg.y0 + cg.y;
    }
    this.pedestal.y += Math.sign(this.pedestal.target - this.pedestal.y) * Math.min(Math.abs(this.pedestal.target - this.pedestal.y), dt * 1.1);
    this.pedestal.g.position.y = this.pedestal.y;
    this.pedestal.prism.rotation.y += dt * 1.6;

    // Ljuset: med prisman uppe går det att låsa fast vid solögon, speglar och slöjor
    const aim = p.prismUp && p.state === 'move';
    for (const o of this.beams.eyes) o.aimable = aim;
    for (const o of this.beams.mirrors) o.aimable = aim;
    for (const o of this.beams.veils) o.aimable = aim;
    this.beams.update(frozen ? 0 : dt, g);

    // Spegelgalleriet: båda ögonen måste se solen samtidigt
    if (!this.state.solved.sun && this.eyeA.on && this.eyeB.on) {
      this.state.solved.sun = true;
      this.openDoor('d5w');
      this.eyeDoorMat2.color.set(0xffc040);
      g.sfx.play('secret');
      g.hud.toast('Both eyes of Ra see the sun! In the west wall, a door to the depths grinds open.', 3600);
      g.story.save(true);
    }
    // Tips: prisman i ljuset
    if (p.hasPrism && !p.prismUp && !this.hinted.shaft) {
      for (const s of this.beams.shafts) {
        if (Math.hypot(p.feet.x - s.pos.x, p.feet.z - s.pos.z) < s.radius) {
          this.hinted.shaft = true;
          g.hud.toast('Cello stands in the light. Raise the prism to catch it!', 3600);
        }
      }
    }

    // Bossarna
    if (this.khepri && !frozen && this.khepri.state !== 'gone' && this.khepri.state !== 'dormant') this.khepri.update(dt, g);
    if (this.boss && !frozen && this.boss.state !== 'gone' && this.boss.state !== 'dormant') this.boss.update(dt, g);
    if (this.boss?.state === 'sway' || this.boss?.state === 'spit') {
      this.bossT = (this.bossT || 0) + dt;
      if (this.bossT > 16 && !this.hinted.boss) {
        this.hinted.boss = true;
        g.hud.toast('Only reflected sunlight can hurt Apophis. Stand in the light at the centre, raise the prism and lock on!', 5200);
      }
    }

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
      if (!this.heartItem.visible && Math.hypot(p.feet.x - this.portal.position.x, p.feet.z - this.portal.position.z) < 1.3 && p.state === 'move') g.story.leavePyramid?.();
    }
    this.syncColliders();
  }
}

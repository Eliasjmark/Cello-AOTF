// Verktygslåda för fängelsehålornas nya delar (0.8). En "flygel" är ett eget område i en fängelsehåla:
// salar, väggar, dörrar, kistor och burar, kopparrännor med växlar som styr blixten, tryckplattor,
// järnblock att skjuta med tung vikt, spruckna golv, stormvind, fällrum med vågor av fiender,
// eldfat som tänds med lyktan, hissar och inskriptioner.
//
// Allt anges i flygelns lokala koordinater (x, z) och flyttas till världen med flygelns ox.
// Läget (dörrar, kistor, lösta pussel, växlarnas lägen) delas med resten av fängelsehålan (dungeon.state).
import * as THREE from 'three';
import { box, cyl, place, hash2, rockGeo } from './geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildItem } from './items.js';

const DOOR_W = 2.4, DOOR_H = 3.6;
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const ORDER = ['N', 'E', 'S', 'W'];
const dirOf = (dx, dz) => (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : (dz > 0 ? 'S' : 'N'));

export class Wing {
  // opts: { ox, name, floorMat, wallMat, H }
  constructor(B, area, dungeon, opts) {
    this.B = B;
    this.area = area;
    this.id = area.id;
    this.dg = dungeon;
    this.M = B.M;
    this.ox = opts.ox;
    this.name = opts.name ?? area.name;
    this.H = opts.H ?? 6.5;
    this.floorMat = opts.floorMat ?? B.M.ironFloor;
    this.wallMat = opts.wallMat ?? B.M.ironWall;
    // Materialen för dörrar, eldfat, block och list (fästningen: järn och koppar, pyramiden: sandsten och guld)
    const M0 = B.M;
    this.mats = {
      slab: M0.ironWall, trim: M0.copper, metal: M0.iron, runes: M0.runes, cracked: M0.cracked, block: M0.ironWall, rubble: M0.char,
      ...(opts.mats || {}),
    };
    this.D = new THREE.Group();
    area.root.add(this.D);
    this.rooms = {};
    this.doors = {};
    this.chests = {};
    this.cages = {};
    this.nodes = {};
    this.edges = [];
    this.caps = {};
    this.pressure = [];
    this.blocks = [];
    this.blockGrids = [];
    this.tiles = [];
    this.winds = [];
    this.traps = [];
    this.torches = [];
    this.interactions = [];
    this.enemySpots = [];
    this.bosses = [];
    this.pulses = [];
    this.hinted = {};
    this.trap = null;
    this.curRoom = null;
    this.t = 0;
    this.collider = null;
    this.groundAt = null;
    this.onConnect = [];
    this.onUpdate = [];
    this.groove = new THREE.MeshBasicMaterial({ color: 0x3a2418 });
    this.grooveHot = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
    this.grooveLit = new THREE.MeshBasicMaterial({ color: 0x2e7fa8 });
    this.pulseLight = B.lights.add({ x: 0, y: 0, z: 0, color: 0x8fe4ff, power: 0, range: 8, flicker: 0 });
    this.pulseLight.on = false;
    this.pulseHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xd8f6ff, fog: false }));
    this.pulseHead.visible = false;
    this.D.add(this.pulseHead);
  }

  get state() { return this.dg.state; }
  get game() { return this.dg.game; }
  X(x) { return this.ox + x; }
  V(x, y, z) { return new THREE.Vector3(this.ox + x, y, z); }

  // ------------------------------------------------------------------
  // Bygget
  // ------------------------------------------------------------------
  slab(x0, x1, y0, y1, z0, z1, mat = this.wallMat, tile = 2, parent) {
    const m = new THREE.Mesh(box(x1 - x0, y1 - y0, z1 - z0, tile), mat);
    m.position.set(this.ox + (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.B.solid(m, parent);
    return m;
  }

  deco(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(this.ox + x, y, z);
    m.rotation.y = ry;
    this.area.S.add(m);
    return m;
  }

  // En sal: golv och namn (rektangel, eller cirkel med r)
  room(id, name, x0, x1, z0, z1, o = {}) {
    const y = o.y ?? 0;
    const r = { id, name, x0: this.ox + x0, x1: this.ox + x1, z0, z1, y, floor: o.floor ?? 'F', map: o.map ?? true };
    if (o.floorSlab !== false) this.slab(x0, x1, y - 1, y, z0, z1, o.mat ?? this.floorMat, 2);
    this.rooms[id] = r;
    return r;
  }

  // Vägg längs x (a = x) eller z (a = z), med öppningar [{c, w, h}] från golvet fy
  wall(along, a0, a1, t0, t1, ops = [], o = {}) {
    const y0 = o.y0 ?? -1, y1 = o.y1 ?? this.H, fy = o.fy ?? 0, mat = o.mat ?? this.wallMat;
    const mk = (b0, b1, c0, c1) => {
      if (b1 - b0 < 0.01 || c1 - c0 < 0.01) return;
      if (along === 'x') this.slab(b0, b1, c0, c1, t0, t1, mat);
      else this.slab(t0, t1, c0, c1, b0, b1, mat);
    };
    let a = a0;
    for (const op of ops.slice().sort((p, q) => p.c - q.c)) {
      const w = op.w ?? DOOR_W, h = op.h ?? DOOR_H;
      mk(a, op.c - w / 2, y0, y1);
      mk(op.c - w / 2, op.c + w / 2, fy + h, y1);
      if (fy > y0) mk(op.c - w / 2, op.c + w / 2, y0, fy);
      a = op.c + w / 2;
    }
    mk(a, a1, y0, y1);
  }

  // Fyra väggar runt en sal (öppningar per sida: { N: [c...], S, E, W })
  walls(r, ops = {}, o = {}) {
    const x0 = r.x0 - this.ox, x1 = r.x1 - this.ox, fy = r.y;
    const opt = { y0: fy - 1, fy, ...o };
    const op = (list) => (list || []).map((c) => (typeof c === 'number' ? { c } : c));
    this.wall('x', x0 - 1, x1 + 1, r.z0 - 1, r.z0, op(ops.N), opt);
    this.wall('x', x0 - 1, x1 + 1, r.z1, r.z1 + 1, op(ops.S), opt);
    this.wall('z', r.z0, r.z1, x0 - 1, x0, op(ops.W), opt);
    this.wall('z', r.z0, r.z1, x1, x1 + 1, op(ops.E), opt);
  }

  pillar(x, z, r = 0.6, h = this.H, y = 0) {
    this.B.solid(place(new THREE.Mesh(cyl(r, r * 1.12, h, 8, 1.5), this.wallMat), this.ox + x, y + h / 2, z));
  }

  brazier(x, z, y = 0) {
    const B = this.B, M = this.M;
    B.solid(place(new THREE.Mesh(cyl(0.18, 0.28, 1.1, 6, 1), this.mats.slab), this.ox + x, y + 0.55, z));
    B.deco(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.4, 8), this.mats.metal), this.ox + x, y + 1.2, z);
    B.makeFire(this.ox + x, y + 1.25, z, 0.65, 16, 3);
  }

  // Ett släckt eldfat som tänds med lyktan (sparas i story.state.torches)
  torch(id, x, z, y = 0) {
    const t = this.B.torch(`${this.id}:${id}`, this.ox + x, y, z, { h: 1.1 });
    this.torches.push(t);
    return t;
  }

  inscription(x, z, face, lines, y = 0) {
    const m = new THREE.Mesh(box(1.3, 1.7, 0.3, 1.3), this.mats.runes);
    m.position.set(this.ox + x, y + 0.85, z);
    m.rotation.y = face;
    this.B.solid(m);
    const fx = Math.sin(face), fz = Math.cos(face);
    this.interactions.push({
      label: 'Read the inscription', area: this.id, pos: () => this.V(x + fx * 1.2, y, z + fz * 1.2), radius: 1.7,
      ok: () => true, run: () => this.game.story.read(lines),
    });
  }

  entry(id, x, z, facing, y = 0) {
    this.area.entries[id] = { pos: this.V(x, y, z), facing };
  }

  // Utgång: en låda som laddar ett annat område när Cello går in i den (ingen dimma inne i fästningen)
  exit(x0, x1, z0, z1, to, entry, o = {}) {
    this.area.exits.push({ x0: this.ox + x0, x1: this.ox + x1, z0, z1, to, entry, ...o });
  }

  // ---------------- dörrar ----------------
  // type: 'open' | 'key' | 'circuit' (öppnas av blixten) | 'bar' (bom på ena sidan) | 'plate' (tryckplattor) | 'cap' | 'boss'
  door(def) {
    const M = this.M;
    const d = { ...def, x: this.ox + def.x, y: def.y ?? 0 };
    const g = new THREE.Group();
    g.position.set(d.x, d.y, d.z);
    if (d.axis === 'x') g.rotation.y = Math.PI / 2;
    this.D.add(g);
    const slab = new THREE.Group();
    g.add(slab);
    const barMat = this.barMat ?? (this.barMat = new THREE.MeshLambertMaterial({ color: 0x2c2c32, flatShading: true }));
    if (d.type !== 'open') {
      slab.add(place(new THREE.Mesh(box(2.6, 3.8, 0.4, 1.3), this.mats.slab), 0, 1.9, 0));
      for (const y of [0.6, 3.2]) slab.add(place(new THREE.Mesh(box(2.6, 0.18, 0.5, 1), this.mats.trim), 0, y, 0));
      const lockMat = new THREE.MeshLambertMaterial({ color: 0x9a7a3a, flatShading: true });
      for (const s of [-1, 1]) {
        if (d.type === 'key') {
          slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.2), lockMat), 0, 1.8, 0.32 * s));
          slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.12), barMat), 0, 1.8, 0.27 * s));
        } else if (d.type === 'circuit' || d.type === 'cap') {
          slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.04), this.groove), 0, 1.5, 0.22 * s));
        } else if (d.type === 'plate') {
          slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.04), lockMat), 0, 1.4, 0.22 * s));
          slab.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.04), lockMat), 0, 2.2, 0.22 * s));
        } else if (d.type === 'bar' && (d.openFrom === 'pos' ? s > 0 : s < 0)) {
          slab.add(place(new THREE.Mesh(box(3.0, 0.3, 0.3, 1), M.wood), 0, 1.7, 0.4 * s));
        }
      }
    }
    const bars = new THREE.Group();
    for (let i = 0; i < 7; i++) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 0.1), barMat), -1.2 + i * 0.4, 1.9, 0));
    for (const y of [0.5, 2.0, 3.5]) bars.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), barMat), 0, y, 0));
    bars.position.y = 4.2;
    bars.visible = false;
    g.add(bars);
    Object.assign(d, { g, slab, bars, slabY: d.type === 'open' ? 4.2 : 0, slabTarget: d.type === 'open' ? 4.2 : 0, barsY: 4.2, barsTarget: 4.2, slabBox: null, barsBox: null });
    if (d.type === 'open') slab.visible = false;
    this.doors[d.id] = d;
    return d;
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

  doorBox(d) {
    const y0 = d.y, y1 = d.y + 3.8;
    if (d.axis === 'x') return [d.x - 0.25, y0, d.z - 1.3, d.x + 0.25, y1, d.z + 1.3];
    return [d.x - 1.3, y0, d.z - 0.25, d.x + 1.3, y1, d.z + 0.25];
  }

  // ---------------- kistor och burar ----------------
  chest(def) {
    const M = this.M;
    const c = { ...def, x: this.ox + def.x, y: def.y ?? 0 };
    const g = new THREE.Group();
    g.position.set(c.x, c.y, c.z);
    g.rotation.y = c.face ?? 0;
    const s = c.big ? 1.3 : 1;
    const bandMat = new THREE.MeshLambertMaterial({ color: c.big ? 0xc9a24f : 0x6a5a3a, emissive: c.big ? 0x2a1c06 : 0, flatShading: true });
    g.add(place(new THREE.Mesh(box(1.0 * s, 0.6 * s, 0.7 * s, 1), M.wood), 0, 0.3 * s, 0));
    for (const x of [-0.35, 0.35]) g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.62 * s, 0.72 * s), bandMat), x * s, 0.3 * s, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.6 * s, -0.35 * s);
    lid.add(place(new THREE.Mesh(box(1.0 * s, 0.24 * s, 0.7 * s, 1), M.wood), 0, 0.12 * s, 0.35 * s));
    lid.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.14 * s, 0.06), bandMat), 0, 0.02 * s, 0.71 * s));
    g.add(lid);
    this.D.add(g);
    Object.assign(c, { g, lid, open: false, lidT: 0, box: null });
    this.chests[c.id] = c;
    return c;
  }

  cage(id, x, z, half = 1.05, y = 0) {
    const bars = [];
    for (let i = 0; i < 6; i++) {
      for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) {
        const t = i / 5;
        bars.push(new THREE.BoxGeometry(0.08, 2.0, 0.08).translate((x0 + (x1 - x0) * t) * half, 1.0, (z0 + (z1 - z0) * t) * half));
      }
    }
    bars.push(new THREE.BoxGeometry(half * 2 + 0.1, 0.1, half * 2 + 0.1).translate(0, 2.0, 0));
    const g = new THREE.Group();
    g.add(new THREE.Mesh(mergeGeometries(bars), this.barMat ?? (this.barMat = new THREE.MeshLambertMaterial({ color: 0x2c2c32, flatShading: true }))));
    g.position.set(this.ox + x, y, z);
    this.D.add(g);
    this.cages[id] = { id, g, x: this.ox + x, z, y0: y, half, y: 0, target: 0, box: null };
    return this.cages[id];
  }

  openCage(id) {
    const c = this.cages[id];
    if (!c || c.target > 0) return;
    c.target = 2.4;
    this.state.solved[`cage:${id}`] = true;
    this.game?.sfx.play('secret');
  }

  // ---------------- kopparrännor, växlar och blixten ----------------
  // kind: 'plate' (markslaget startar blixten) · 'junction' (en pil som vrids och visar vart blixten går)
  //       'target' (onArrive) · 'coil' (laddas en stund, för en kondensator) · 'broken' (blixten dör här) · 'corner'
  node(id, x, z, kind = 'corner', o = {}) {
    const n = { id, x: this.ox + x, z, y: o.y ?? 0, kind, links: {}, onArrive: o.onArrive ?? null, cap: o.cap ?? null, rot: 0, view: 0, label: o.label };
    this.nodes[id] = n;
    return n;
  }

  link(...ids) {
    for (let i = 0; i < ids.length - 1; i++) {
      const a = this.nodes[ids[i]], b = this.nodes[ids[i + 1]];
      const d = dirOf(b.x - a.x, b.z - a.z);
      a.links[d] = b.id;
      b.links[OPP[d]] = a.id;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.16, 0.03, 0.16), this.groove);
      m.position.set((a.x + b.x) / 2, a.y + 0.02, (a.z + b.z) / 2);
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      this.D.add(m);
      this.edges.push({ a: a.id, b: b.id, m });
    }
  }

  // Bygger utseendet på noderna (anropas när alla länkar finns)
  finishNet(rotations = {}) {
    const M = this.M;
    for (const n of Object.values(this.nodes)) {
      if (n.kind === 'plate') {
        const pm = new THREE.MeshLambertMaterial({ color: 0x8a5634, emissive: 0x000000, flatShading: true });
        this.D.add(place(new THREE.Mesh(cyl(0.95, 1.0, 0.14, 12, 1), pm), n.x, n.y + 0.04, n.z));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 4, 16), this.groove);
        ring.rotation.x = Math.PI / 2;
        this.D.add(place(ring, n.x, n.y + 0.13, n.z));
        n.plateMat = pm;
      } else if (n.kind === 'junction') {
        n.ports = ORDER.filter((d) => n.links[d]);
        n.rot0 = rotations[n.id] ?? 0;
        n.rot = n.rot0;
        const g = new THREE.Group();
        g.position.set(n.x, n.y, n.z);
        this.D.add(g);
        g.add(place(new THREE.Mesh(cyl(0.85, 0.9, 0.22, 12, 1), M.copper), 0, 0.11, 0));
        // Små markeringar vid varje port
        for (const d of n.ports) {
          const [dx, dz] = DIRS[d];
          g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), this.groove), dx * 0.7, 0.24, dz * 0.7));
        }
        const arrow = new THREE.Group();
        arrow.position.y = 0.24;
        g.add(arrow);
        const am = new THREE.MeshBasicMaterial({ color: 0x8fe4ff });
        arrow.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.9), am), 0, 0, 0.25));
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4).rotateX(Math.PI / 2), am);
        tip.position.z = 0.8;
        arrow.add(tip);
        n.arrow = arrow;
        n.arrowMat = am;
        n.view = this.portAngle(n);
        arrow.rotation.y = n.view;
        this.interactions.push({
          label: 'Turn the junction', area: this.id, pos: () => new THREE.Vector3(n.x, n.y, n.z), radius: 1.8,
          ok: () => !this.pulses.length,
          run: () => this.turnJunction(n),
        });
      } else if (n.kind === 'coil') {
        const mat = new THREE.MeshLambertMaterial({ color: 0x6a4428, emissive: 0x000000, flatShading: true });
        const coil = new THREE.Mesh(cyl(0.5, 0.55, 2.4, 10, 1), mat);
        this.B.solid(place(coil, n.x, n.y + 1.2, n.z), this.D);
        for (let k = 0; k < 4; k++) this.D.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 4, 12).rotateX(Math.PI / 2), M.copper), n.x, n.y + 0.5 + k * 0.5, n.z));
        n.coilMat = mat;
        n.charge = 0;
      } else if (n.kind === 'broken') {
        this.D.add(place(new THREE.Mesh(rockGeo(0.3, 3000 + hash2(n.x, n.z) * 99, 0.5), this.mats.rubble), n.x, n.y + 0.1, n.z));
      }
    }
  }

  portAngle(n) {
    const [dx, dz] = DIRS[n.ports[n.rot % n.ports.length]];
    return Math.atan2(dx, dz);
  }

  turnJunction(n) {
    n.rot = (n.rot + 1) % n.ports.length;
    this.state.junc = this.state.junc || {};
    this.state.junc[n.id] = n.rot;
    this.game?.sfx.play('stonegrind', { vol: 0.7 });
    if (!this.hinted.junction) {
      this.hinted.junction = true;
      this.game?.hud.toast('The copper arrow turns. The lightning will follow where it points.', 3600);
    }
  }

  // Följer blixten från en platta genom nätet. Returnerar punkterna och vad den slutade i.
  tracePulse(start) {
    const pts = [[start.x, start.z]];
    let cur = start, cameFrom = null, end = null;
    for (let step = 0; step < 60; step++) {
      let out = null;
      if (cur.kind === 'plate') {
        if (step > 0) { end = { kind: 'dead', node: cur }; break; }
        out = ORDER.find((d) => cur.links[d]);
      }
      else if (cur.kind === 'junction') {
        out = cur.ports[cur.rot % cur.ports.length];
        if (out === cameFrom) { end = { kind: 'blocked', node: cur }; break; }
      } else if (cur.kind === 'target' || cur.kind === 'coil') { end = { kind: 'arrive', node: cur }; break; }
      else if (cur.kind === 'broken') { end = { kind: 'broken', node: cur }; break; }
      else {
        const outs = ORDER.filter((d) => cur.links[d] && d !== cameFrom);
        out = outs[0];
      }
      if (!out) { end = { kind: 'dead', node: cur }; break; }
      const nx = this.nodes[cur.links[out]];
      pts.push([nx.x, nx.z]);
      cameFrom = OPP[out];
      cur = nx;
    }
    return { pts, end: end ?? { kind: 'dead', node: cur } };
  }

  firePulse(plate) {
    if (this.pulses.some((p) => p.plate === plate)) return;
    const tr = this.tracePulse(plate);
    const segs = [];
    let total = 0;
    for (let i = 0; i < tr.pts.length - 1; i++) {
      const [x0, z0] = tr.pts[i], [x1, z1] = tr.pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      segs.push({ x0, z0, x1, z1, len, from: total });
      total += len;
    }
    plate.plateMat.emissive.set(0x6ac8ff);
    this.pulses.push({ plate, segs, total, t: 0, end: tr.end, y: plate.y });
    this.B.lights.pickT = 0;
    this.game?.sfx.play('pulse');
  }

  pulseArrive(p) {
    const e = p.end, g = this.game;
    p.plate.plateMat.emissive.set(0x000000);
    if (e.kind === 'arrive') {
      const n = e.node;
      if (n.kind === 'coil') {
        n.charge = 1;
        g?.sfx.play('zap', { vol: 0.6 });
        this.checkCap(n.cap);
      } else n.onArrive?.(n);
    } else {
      // Blixten dör: gnistor där den tog slut
      const n = e.node;
      g?.fx.burst('spark', new THREE.Vector3(n.x, n.y + 0.4, n.z), 14, 0x9fdcff);
      g?.sfx.play('fizzle');
      if (!this.hinted.fizzle) {
        this.hinted.fizzle = true;
        g?.hud.toast(e.kind === 'broken' ? 'The channel is broken here. The lightning dies in a shower of sparks.' : 'The lightning has nowhere to go. A copper arrow points the wrong way.', 3800);
      }
    }
  }

  // Kondensator: alla spolar i gruppen måste vara laddade samtidigt
  capacitor(id, window, onSolve) {
    this.caps[id] = { id, window, onSolve };
  }

  checkCap(capId) {
    const c = this.caps[capId];
    if (!c || this.state.solved[`cap:${capId}`]) return;
    const coils = Object.values(this.nodes).filter((n) => n.cap === capId);
    if (coils.every((n) => n.charge > 0)) {
      this.state.solved[`cap:${capId}`] = true;
      this.game?.sfx.play('secret');
      c.onSolve?.();
      this.game?.story.save(true);
    } else if (!this.hinted[`cap:${capId}`]) {
      this.hinted[`cap:${capId}`] = true;
      this.game?.hud.toast('The coil glows... but its charge is already fading.', 3400);
    }
  }

  // ---------------- tryckplattor och järnblock ----------------
  // En platta som trycks ner av Cello med tung vikt, eller av ett järnblock
  pressurePlate(id, x, z, o = {}) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x6a6c74, emissive: 0x000000, flatShading: true });
    const m = new THREE.Mesh(box(1.8, 0.16, 1.8, 1), mat);
    m.position.set(this.ox + x, (o.y ?? 0) + 0.06, z);
    this.D.add(m);
    for (const s of [-1, 1]) this.D.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.1), this.mats.trim), this.ox + x, (o.y ?? 0) + 0.15, z + s * 0.85));
    const p = { id, x: this.ox + x, z, y: o.y ?? 0, mat, m, pressed: false, onChange: o.onChange ?? null, blockOnly: !!o.blockOnly };
    this.pressure.push(p);
    return p;
  }

  // Rutnät där järnblock kan skjutas (rutor om 2 m). walls: rutor där blocken inte kan stå
  blockGrid(id, x0, z0, cols, rows, walls = []) {
    const g = { id, x0: this.ox + x0, z0, cols, rows, walls: new Set(walls.map(([c, r]) => `${c},${r}`)) };
    this.blockGrids.push(g);
    for (const [c, r] of walls) {
      const x = x0 + c * 2, z = z0 + r * 2;
      this.slab(x - 0.95, x + 0.95, -1, 2.6, z - 0.95, z + 0.95, this.wallMat);
      this.deco(box(2.0, 0.2, 2.0, 1), this.mats.trim, x, 2.7, z);
    }
    return g;
  }

  pushBlock(id, gridId, c, r) {
    const g = this.blockGrids.find((q) => q.id === gridId);
    const m = new THREE.Mesh(box(1.9, 1.9, 1.9, 1.9), this.mats.block);
    const band = new THREE.Mesh(box(1.94, 0.2, 1.94, 1), this.mats.trim);
    band.position.y = 0.4;
    m.add(band);
    const b = { id, g, home: [c, r], c, r, m, box: null, slide: null, pushT: 0 };
    this.place(b, c, r);
    this.D.add(m);
    this.blocks.push(b);
    return b;
  }

  place(b, c, r) {
    b.c = c;
    b.r = r;
    b.x = b.g.x0 + c * 2;
    b.z = b.g.z0 + r * 2;
    b.m.position.set(b.x, 0.95, b.z);
    if (b.box) {
      b.box.min.set(b.x - 0.95, 0, b.z - 0.95);
      b.box.max.set(b.x + 0.95, 1.9, b.z + 0.95);
    }
  }

  cellFree(g, c, r, except) {
    if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return false;
    if (g.walls.has(`${c},${r}`)) return false;
    return !this.blocks.some((b) => b !== except && b.g === g && ((b.c === c && b.r === r) || (b.slide && b.slide.c === c && b.slide.r === r)));
  }

  resetBlocks(gridId) {
    for (const b of this.blocks) if (b.g.id === gridId) { b.slide = null; this.place(b, b.home[0], b.home[1]); }
  }

  // ---------------- spruckna golv ----------------
  // En platta som rasar när Cello står på den med tung vikt
  crackTile(x0, x1, z0, z1, y = 0, o = {}) {
    const m = new THREE.Mesh(box(x1 - x0 - 0.02, 0.5, z1 - z0 - 0.02, 2), o.mat ?? this.mats.cracked);
    m.position.set(this.ox + (x0 + x1) / 2, y - 0.25, (z0 + z1) / 2);
    this.D.add(m);
    const t = { x0: this.ox + x0, x1: this.ox + x1, z0, z1, y, m, box: null, fallen: false, crack: 0, vy: 0, sand: !!o.sand };
    this.tiles.push(t);
    return t;
  }

  // ---------------- stormvind ----------------
  // Vind i stötar: dir = [dx, dz], strength i m/s, period och andel av perioden som blåser
  wind(x0, x1, z0, z1, dir, o = {}) {
    const w = { x0: this.ox + x0, x1: this.ox + x1, z0, z1, y0: o.y0 ?? -4, y1: o.y1 ?? 6, dir, strength: o.strength ?? 7.5, period: o.period ?? 3.2, on: o.on ?? 0.55, phase: o.phase ?? 0, gust: 0, sand: !!o.sand };
    const n = 70;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    w.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: w.sand ? 0xe0b878 : 0xc8d4e8, transparent: true, opacity: 0.3 }));
    w.lines.frustumCulled = false;
    this.D.add(w.lines);
    w.seeds = [];
    // Sanden rinner längs golvet, stormen blåser högre upp
    for (let i = 0; i < n; i++) w.seeds.push({ x: w.x0 + Math.random() * (w.x1 - w.x0), y: w.sand ? (o.floor ?? 0) + 0.05 + Math.random() * 0.5 : w.y0 + 3 + Math.random() * 5, z: w.z0 + Math.random() * (w.z1 - w.z0), s: 0.8 + Math.random() * 0.4 });
    this.winds.push(w);
    return w;
  }

  // ---------------- fiender och fällor ----------------
  enemy(kind, x, z, path, group, o = {}) {
    const y = o.y ?? 0;
    this.enemySpots.push({
      kind, home: this.V(x, y, z), path: path ? path.map(([px, pz]) => this.V(px, y, pz)) : null, room: group,
      bounds: this.rooms[o.room ?? group] ?? null, dormant: !!o.dormant, area: this.id, doze: !!o.doze,
    });
  }

  // Ett fällrum: gallren går ner, vågor av fiender vaknar en i taget
  trapRoom(id, room, bars, waves, onClear) {
    this.traps.push({ id, room, bars, waves, onClear, wave: -1, waitT: 0 });
  }

  // ---------------- hiss ----------------
  lift(x, z, o) {
    const M = this.M, y = o.y ?? 0;
    this.slab(x - 1.6, x + 1.6, y - 0.2, y + 0.15, z - 1.6, z + 1.6, M.ironFloor);
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) this.deco(box(0.2, 5, 0.2, 1), M.copper, x + dx, y + 2.6, z + dz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 4, 20).rotateX(Math.PI / 2), o.ok?.() ? this.grooveLit : this.groove);
    ring.position.set(this.ox + x, y + 0.18, z);
    this.D.add(ring);
    const lf = { ring, ok: o.ok };
    this.interactions.push({
      label: o.label ?? 'Ride the lift', area: this.id, pos: () => this.V(x, y, z), radius: 1.7,
      ok: () => true,
      run: () => {
        const st = this.game.story;
        if (o.ok && !o.ok()) { st.read(o.dead ?? ['The lift is dead.']); return; }
        this.game.sfx.play('stonegrind');
        st.travel(o.to, o.entry, { walk: false, text: o.text ?? '', dur: 1.6 });
      },
    });
    this.onUpdate.push(() => { ring.material = !o.ok || o.ok() ? this.grooveLit : this.groove; });
    return lf;
  }

  // ------------------------------------------------------------------
  // Koppling och interaktioner
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
      if (d.type !== 'open') d.slabBox = collider.addBox(...this.doorBox(d), d.id);
      d.barsBox = collider.addBox(...this.doorBox(d), `${d.id}-bars`);
      d.barsBox.enabled = false;
    }
    for (const c of Object.values(this.chests)) {
      const s = c.big ? 1.3 : 1;
      c.box = collider.addBox(c.x - 0.55 * s, c.y, c.z - 0.55 * s, c.x + 0.55 * s, c.y + 0.85 * s, c.z + 0.55 * s, c.id);
    }
    for (const cg of Object.values(this.cages)) {
      cg.box = collider.addBox(cg.x - cg.half - 0.05, cg.y0, cg.z - cg.half - 0.05, cg.x + cg.half + 0.05, cg.y0 + 2.1, cg.z + cg.half + 0.05, 'cage');
    }
    for (const b of this.blocks) {
      b.box = collider.addBox(b.x - 0.95, 0, b.z - 0.95, b.x + 0.95, 1.9, b.z + 0.95, b.id);
    }
    for (const t of this.tiles) t.box = collider.addBox(t.x0, t.y - 0.5, t.z0, t.x1, t.y, t.z1, 'tile');
    for (const fn of this.onConnect) fn(collider);
    this.buildInteractions();
  }

  buildInteractions() {
    const P = () => this.game.player;
    const side = (d) => {
      const p = P().feet;
      return d.axis === 'x' ? (p.x > d.x ? 'pos' : 'neg') : (p.z > d.z ? 'pos' : 'neg');
    };
    const front = (d, s) => {
      const k = s === 'pos' ? 1.5 : -1.5;
      return d.axis === 'x' ? new THREE.Vector3(d.x + k, d.y, d.z) : new THREE.Vector3(d.x, d.y, d.z + k);
    };
    for (const d of Object.values(this.doors)) {
      if (d.type === 'key') {
        this.interactions.push({
          label: () => (this.state.keys > 0 ? 'Unlock the door' : 'Locked door'), area: this.id, pos: () => front(d, side(d)), radius: 1.9,
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
      } else if (d.type === 'circuit' || d.type === 'cap' || d.type === 'plate') {
        this.interactions.push({
          label: 'Examine the door', area: this.id, pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id),
          run: () => this.game.story.read(d.text ?? (d.type === 'plate'
            ? ["The door won't budge.", 'Two iron plates are set into the floor nearby. Something heavy must hold them down.']
            : ["The door won't budge.", 'A copper channel runs into it. Lightning must flow here to open it.'])),
        });
      } else if (d.type === 'bar') {
        this.interactions.push({
          label: () => (side(d) === d.openFrom ? 'Lift the bar' : 'Examine the door'), area: this.id, pos: () => front(d, side(d)), radius: 1.9,
          ok: () => !this.state.doors.includes(d.id),
          run: () => {
            if (side(d) === d.openFrom) {
              this.openDoor(d.id);
              this.game.sfx.play('secret');
              this.game.story.save(true);
            } else this.game.story.read(['The door is barred from the other side.']);
          },
        });
      }
    }
    for (const c of Object.values(this.chests)) {
      const fx = Math.sin(c.face ?? 0), fz = Math.cos(c.face ?? 0);
      this.interactions.push({
        label: 'Open the chest', area: this.id, pos: () => new THREE.Vector3(c.x + fx * 1.3, c.y, c.z + fz * 1.3), radius: 1.4,
        ok: () => !c.open && c.g.visible && (!c.cage || this.cages[c.cage].y > 1.5),
        run: () => this.openChest(c),
      });
    }
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
        story.read([`You found ${c.shards >= 100 ? 'a golden' : c.shards >= 50 ? 'a purple' : 'a red'} shard! It is worth ${c.shards}.`], () => { story.cinematic = false; story.save(true); });
      });
      return;
    }
    this.game.story.itemGet(c.item);
  }

  // ------------------------------------------------------------------
  // Spara och ladda
  // ------------------------------------------------------------------
  applyState() {
    const s = this.state;
    s.junc = s.junc || {};
    for (const d of Object.values(this.doors)) {
      const open = d.type === 'open' || s.doors.includes(d.id);
      d.slabTarget = d.slabY = open ? 4.2 : 0;
      d.barsTarget = d.barsY = 4.2;
      d.bars.visible = false;
    }
    for (const c of Object.values(this.chests)) {
      c.open = s.chests.includes(c.id);
      c.lidT = c.open ? 1 : 0;
      c.g.visible = !c.hidden || !!c.hidden();
    }
    for (const cg of Object.values(this.cages)) cg.y = cg.target = s.solved[`cage:${cg.id}`] ? 2.4 : 0;
    for (const n of Object.values(this.nodes)) {
      if (n.kind === 'junction') {
        n.rot = s.junc[n.id] ?? n.rot0 ?? 0;
        n.view = this.portAngle(n);
        n.arrow.rotation.y = n.view;
      }
      if (n.kind === 'coil') n.charge = 0;
    }
    for (const t of this.tiles) { t.fallen = false; t.crack = 0; t.vy = 0; t.m.visible = true; t.m.position.y = t.y - 0.25; t.m.rotation.set(0, 0, 0); }
    for (const g of this.blockGrids) {
      const saved = s.blocks?.[g.id];
      for (const b of this.blocks) {
        if (b.g !== g) continue;
        const sv = saved?.[b.id];
        this.place(b, sv ? sv[0] : b.home[0], sv ? sv[1] : b.home[1]);
        b.slide = null;
      }
    }
    for (const b of this.bosses) {
      b.reset();
      if (s.cleared[b.clearId]) { b.state = 'gone'; b.model.root.visible = false; }
    }
    this.pulses = [];
    this.trap = null;
    for (const tr of this.traps) tr.wave = -1;
    if (this.game) for (const tr of this.traps) if (s.cleared[tr.id]) for (const w of tr.waves) this.game.enemies.killGroup(w);
    this.afterApply?.();
    this.syncColliders();
  }

  // Cello kommer in i flygeln: blocken i olösta pussel börjar om, spruckna golv blir hela
  enter() {
    for (const g of this.blockGrids) if (!this.state.solved[`blocks:${g.id}`]) this.resetBlocks(g.id);
    for (const t of this.tiles) { t.fallen = false; t.crack = 0; t.m.visible = true; t.m.position.y = t.y - 0.25; t.m.rotation.set(0, 0, 0); }
    this.syncColliders();
  }

  onPlayerDeath() {
    if (this.trap) {
      const tr = this.trap;
      for (const id of tr.bars) this.setBars(id, false);
      for (const w of tr.waves) for (const e of this.game.enemies.list) if (e.room === w && e.trapGroup) { e.dormant = true; e.reset(); }
      tr.wave = -1;
      this.trap = null;
    }
    for (const b of this.bosses) if (b.state !== 'gone' && b.state !== 'dormant' && !this.state.cleared[b.clearId]) b.reset();
    // Gallren som en bossstrid sänkte går upp igen
    if (this.bossFight) for (const id of this.fightBars || []) this.setBars(id, false);
    this.bossFight = false;
  }

  syncColliders() {
    if (!this.collider) return;
    for (const d of Object.values(this.doors)) {
      if (d.slabBox) d.slabBox.enabled = d.slabY < 1.6;
      d.barsBox.enabled = d.barsY < 2.0;
    }
    for (const c of Object.values(this.chests)) c.box.enabled = c.g.visible;
    for (const cg of Object.values(this.cages)) cg.box.enabled = cg.y < 1.5;
    for (const t of this.tiles) t.box.enabled = !t.fallen;
  }

  inside(p) {
    return Object.values(this.rooms).some((r) => p.x >= r.x0 - 1 && p.x <= r.x1 + 1 && p.z >= r.z0 - 1 && p.z <= r.z1 + 1 && Math.abs(p.y - r.y) < 5);
  }

  roomAt(p) {
    for (const r of Object.values(this.rooms)) {
      if (p.x < r.x0 || p.x > r.x1 || p.z < r.z0 || p.z > r.z1 || Math.abs(p.y - r.y) > 4) continue;
      return r.id;
    }
    return null;
  }

  // Slaget med hammaren: plattor i nätet
  slam(point, feet = point) {
    let used = false;
    for (const n of Object.values(this.nodes)) {
      if (n.kind !== 'plate') continue;
      // Antingen där hammaren slår ner, eller där Cello själv står (slaget kan landa utanför kanten)
      const byPoint = Math.hypot(point.x - n.x, point.z - n.z) < 1.9 && Math.abs(point.y - n.y) < 1.2;
      const byFeet = Math.hypot(feet.x - n.x, feet.z - n.z) < 1.6 && Math.abs(feet.y - n.y) < 1.2;
      if (byPoint || byFeet) { this.firePulse(n); used = true; }
    }
    return used;
  }

  combatTargets() {
    return this.bosses.filter((b) => b.targetable);
  }

  // ------------------------------------------------------------------
  // Varje bildruta
  // ------------------------------------------------------------------
  update(dt, frozen = false) {
    const g = this.game;
    if (!g) return;
    this.t += dt;
    const p = g.player;
    const room = this.roomAt(p.feet);
    if (room !== this.curRoom) {
      this.curRoom = room;
      if (room && !this.state.visited.includes(`${this.id}:${room}`)) this.state.visited.push(`${this.id}:${room}`);
    }
    // Fällrum
    const inner = (r, m = 2) => r && p.feet.x > r.x0 + m && p.feet.x < r.x1 - m && p.feet.z > r.z0 + m && p.feet.z < r.z1 - m && Math.abs(p.feet.y - r.y) < 2;
    if (!frozen && !this.trap && p.state !== 'dead') {
      for (const tr of this.traps) {
        if (this.state.cleared[tr.id] || !inner(this.rooms[tr.room], 2.5)) continue;
        this.trap = tr;
        tr.wave = 0;
        for (const id of tr.bars) this.setBars(id, true);
        g.enemies.wakeGroup(tr.waves[0]);
        g.hud.toast(tr.text ?? 'The bars slam shut!', 2400);
        break;
      }
    }
    if (this.trap && !frozen) {
      const tr = this.trap;
      if (tr.waitT > 0) {
        tr.waitT -= dt;
        if (tr.waitT <= 0) { g.enemies.wakeGroup(tr.waves[tr.wave]); g.sfx.play('roar', { vol: 0.35 }); }
      } else if (g.enemies.groupCleared(tr.waves[tr.wave])) {
        if (tr.wave < tr.waves.length - 1) {
          tr.wave++;
          tr.waitT = 1.4;
          g.hud.toast(`More of them come! (${tr.wave + 1}/${tr.waves.length})`, 1800);
        } else {
          this.trap = null;
          this.state.cleared[tr.id] = true;
          for (const id of tr.bars) this.setBars(id, false);
          for (const w of tr.waves) g.enemies.killGroup(w);
          g.sfx.play('secret');
          tr.onClear?.();
          g.story.save(true);
        }
      }
    }
    // Dörrar, kistor och burar
    for (const d of Object.values(this.doors)) {
      d.slabY += Math.sign(d.slabTarget - d.slabY) * Math.min(Math.abs(d.slabTarget - d.slabY), dt * 2.6);
      d.barsY += Math.sign(d.barsTarget - d.barsY) * Math.min(Math.abs(d.barsTarget - d.barsY), dt * (d.barsTarget < d.barsY ? 9 : 3));
      d.slab.position.y = d.slabY;
      d.bars.position.y = d.barsY;
      if (d.barsY >= 4.19 && d.barsTarget >= 4.19) d.bars.visible = false;
    }
    for (const c of Object.values(this.chests)) {
      if (c.hidden && !c.g.visible && c.hidden()) {
        c.g.visible = true;
        g.fx.burst('ash', new THREE.Vector3(c.x, c.y + 0.6, c.z), 16);
      }
      if (c.open && c.lidT < 1) c.lidT = Math.min(1, c.lidT + dt * 2.2);
      c.lid.rotation.x = -c.lidT * 1.9;
    }
    for (const cg of Object.values(this.cages)) {
      cg.y += Math.sign(cg.target - cg.y) * Math.min(Math.abs(cg.target - cg.y), dt * 1.5);
      cg.g.position.y = cg.y0 + cg.y;
    }
    // Växlarnas pilar vrids mjukt
    for (const n of Object.values(this.nodes)) {
      if (n.kind === 'junction') {
        const target = this.portAngle(n);
        n.view += Math.atan2(Math.sin(target - n.view), Math.cos(target - n.view)) * (1 - Math.exp(-dt * 10));
        n.arrow.rotation.y = n.view;
      } else if (n.kind === 'coil') {
        const cap = this.caps[n.cap];
        if (this.state.solved[`cap:${n.cap}`]) n.coilMat.emissive.setRGB(0.08, 0.36, 0.5);
        else {
          n.charge = Math.max(0, n.charge - dt / (cap?.window ?? 6));
          n.coilMat.emissive.setRGB(0.1 * n.charge, 0.45 * n.charge, 0.6 * n.charge);
        }
      }
    }
    // Blixten längs rännorna
    let head = null;
    for (const pu of this.pulses) {
      pu.t += dt * 14;
      for (const s of pu.segs) {
        if (pu.t >= s.from && pu.t <= s.from + s.len) {
          const k = (pu.t - s.from) / s.len;
          head = new THREE.Vector3(s.x0 + (s.x1 - s.x0) * k, pu.y + 0.15, s.z0 + (s.z1 - s.z0) * k);
        }
      }
      if (pu.t >= pu.total) { pu.done = true; this.pulseArrive(pu); }
    }
    this.pulses = this.pulses.filter((pu) => !pu.done);
    this.pulseHead.visible = !!head;
    this.pulseLight.on = !!head;
    if (head) {
      this.pulseHead.position.copy(head);
      this.pulseLight.pos.copy(head).y += 0.6;
      this.pulseLight.power = 26;
    }
    for (const e of this.edges) e.m.material = this.pulses.length ? this.grooveHot : this.groove;
    // Tryckplattor
    for (const pl of this.pressure) {
      const onBlock = this.blocks.some((b) => !b.slide && Math.abs(b.x - pl.x) < 0.5 && Math.abs(b.z - pl.z) < 0.5);
      const onHeavy = !pl.blockOnly && p.heavy && p.grounded && Math.abs(p.feet.x - pl.x) < 1.0 && Math.abs(p.feet.z - pl.z) < 1.0 && Math.abs(p.feet.y - pl.y) < 0.8;
      const pressed = onBlock || onHeavy;
      if (pressed !== pl.pressed) {
        pl.pressed = pressed;
        pl.m.position.y = pl.y + (pressed ? -0.02 : 0.06);
        pl.mat.emissive.set(pressed ? 0x2a6a88 : 0x000000);
        g.sfx.play(pressed ? 'heavystep' : 'choice', { vol: 0.6 });
        pl.onChange?.(pressed, pl);
      }
    }
    // Järnblocken: Cello skjuter dem med tung vikt
    this.updateBlocks(dt, p, g);
    // Spruckna golv
    for (const t of this.tiles) {
      if (t.fallen) {
        if (t.m.visible) {
          t.vy -= 20 * dt;
          t.m.position.y += t.vy * dt;
          if (!t.sand) t.m.rotation.x += dt * 1.5;
          if (t.m.position.y < t.y - 7) t.m.visible = false;
        }
        continue;
      }
      const on = p.grounded && p.feet.x > t.x0 && p.feet.x < t.x1 && p.feet.z > t.z0 && p.feet.z < t.z1 && Math.abs(p.feet.y - t.y) < 0.5;
      if (on && p.heavy) {
        t.crack += dt;
        if (Math.random() < dt * 12) g.fx.burst('ash', p.feet.clone().setY(t.y + 0.1), 2);
        if (t.crack > 0.3) {
          t.fallen = true;
          t.vy = -1;
          g.sfx.play(t.sand ? 'sandrush' : 'crumble', { vol: 0.8 });
          g.rig.shake(0.3);
        }
      } else {
        t.crack = Math.max(0, t.crack - dt);
        if (on && !this.hinted.crack) {
          this.hinted.crack = true;
          g.hud.toast(t.sand ? "The sand shifts under Cello's feet... it would swallow anything heavy." : "The floor creaks under Cello's feet... it would not hold anything heavy.", 3200);
        }
      }
    }
    // Återuppståndelsen får aldrig ligga på en platta som kan rasa (då faller Cello igen och igen)
    if (this.tiles.length) {
      const overTile = (q) => this.tiles.some((t) => q.x > t.x0 - 1.3 && q.x < t.x1 + 1.3 && q.z > t.z0 - 1.3 && q.z < t.z1 + 1.3 && Math.abs(q.y - t.y) < 1);
      if (overTile(p.safe)) { if (this.safeBackup) p.safe.copy(this.safeBackup); }
      else (this.safeBackup ??= new THREE.Vector3()).copy(p.safe);
    }
    // Stormvind
    let wx = 0, wz = 0;
    for (const w of this.winds) {
      const ph = ((this.t + w.phase) % w.period) / w.period;
      const strong = ph < w.on;
      w.gust += ((strong ? w.strength : 0.6) - w.gust) * (1 - Math.exp(-dt * 6));
      if (strong && !w.wasStrong && this.inZone(w, p.feet, 6)) g.sfx.play(w.sand ? 'sandrush' : 'gust', { vol: 0.8 });
      w.wasStrong = strong;
      if (this.inZone(w, p.feet)) { wx += w.dir[0] * w.gust; wz += w.dir[1] * w.gust; }
      const a = w.lines.geometry.attributes.position.array;
      w.seeds.forEach((sd, i) => {
        sd.x += w.dir[0] * w.gust * sd.s * dt * 1.6;
        sd.z += w.dir[1] * w.gust * sd.s * dt * 1.6;
        if (sd.x < w.x0 || sd.x > w.x1 || sd.z < w.z0 || sd.z > w.z1) {
          sd.x = w.dir[0] > 0 ? w.x0 : w.dir[0] < 0 ? w.x1 : w.x0 + Math.random() * (w.x1 - w.x0);
          sd.z = w.dir[1] > 0 ? w.z0 : w.dir[1] < 0 ? w.z1 : w.z0 + Math.random() * (w.z1 - w.z0);
        }
        const len = 0.4 + w.gust * 0.2;
        a.set([sd.x, sd.y, sd.z, sd.x + w.dir[0] * len, sd.y, sd.z + w.dir[1] * len], i * 6);
      });
      w.lines.geometry.attributes.position.needsUpdate = true;
      w.lines.material.opacity = 0.1 + w.gust * 0.04;
    }
    // Vinden sätts varje bildruta (noll där det inte blåser), så att den inte följer med till nästa område
    p.wind.set(wx, 0, wz);
    if ((wx || wz) && Math.hypot(wx, wz) > 3 && !p.heavy && p.grounded && !this.hinted.wind) {
      this.hinted.wind = true;
      const sandy = this.winds.some((w) => w.sand && this.inZone(w, p.feet));
      g.hud.toast(sandy ? 'The river of sand drags Cello along! With heavy weight he can stand his ground.' : 'The storm tears at Cello! With heavy weight he can stand his ground.', 4000);
    }
    // Bossar
    if (!frozen) for (const b of this.bosses) if (b.state !== 'gone' && (b.state !== 'dormant' || this.bossFight)) b.update(dt, g);
    for (const fn of this.onUpdate) fn(dt, p, g, frozen);
    this.syncColliders();
  }

  inZone(w, f, m = 0) {
    return f.x > w.x0 - m && f.x < w.x1 + m && f.z > w.z0 - m && f.z < w.z1 + m && f.y > w.y0 && f.y < w.y1;
  }

  updateBlocks(dt, p, g) {
    for (const b of this.blocks) {
      if (b.slide) {
        b.slide.t += dt / 0.45;
        const k = Math.min(1, b.slide.t);
        const x = b.g.x0 + (b.c + (b.slide.c - b.c) * k) * 2, z = b.g.z0 + (b.r + (b.slide.r - b.r) * k) * 2;
        b.m.position.set(x, 0.95, z);
        b.box.min.set(x - 0.95, 0, z - 0.95);
        b.box.max.set(x + 0.95, 1.9, z + 0.95);
        if (k >= 1) {
          const { c, r } = b.slide;
          b.slide = null;
          this.place(b, c, r);
          g.sfx.play('stomp', { vol: 0.5 });
          this.onBlockMoved?.(b);
        }
        continue;
      }
      const dx = p.feet.x - b.x, dz = p.feet.z - b.z;
      const along = Math.abs(dx) > Math.abs(dz);
      const near = along ? Math.abs(dx) < 1.5 && Math.abs(dz) < 0.75 : Math.abs(dz) < 1.5 && Math.abs(dx) < 0.75;
      const dir = along ? [-Math.sign(dx), 0] : [0, -Math.sign(dz)];
      const pushing = near && p.grounded && p.state === 'move' && (p.wish.x * dir[0] + p.wish.z * dir[1]) > 0.75 && Math.abs(p.feet.y) < 1;
      if (!pushing) { b.pushT = 0; continue; }
      if (!p.heavy) {
        if (!this.hinted.block) {
          this.hinted.block = true;
          g.hud.toast("The iron block won't budge. Cello would need the weight of thunder (G) to move it.", 4000);
        }
        continue;
      }
      b.pushT += dt;
      if (b.pushT < 0.35) continue;
      b.pushT = 0;
      const nc = b.c + dir[0], nr = b.r + dir[1];
      if (!this.cellFree(b.g, nc, nr, b)) { g.sfx.play('clang', { vol: 0.3 }); continue; }
      b.slide = { c: nc, r: nr, t: 0 };
      g.sfx.play('stonegrind', { vol: 0.9 });
    }
  }
}

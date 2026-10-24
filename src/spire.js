// The Windbound Spire (0.14): den fjärde fängelsehålan, byggd kring Hermes' Wing Sandals. Ett torn av vit marmor
// och brons, där vinden aldrig vilar. Layouten följer reliken: vertikala uppvindar, väggar att springa längs och
// långa siktlinjer upp genom tornet. Trånga trappor och gångar växlar med en enorm schakt i mitten.
//
//   The Gale Gate (sgate)         – låg port och en smal, ylande trappa där vinden blåser emot (tung vikt hjälper),
//                                   arkivet med kartan och en liten nyckel.
//   The Hall of Winds (shall)     – en schakt som är över 40 meter hög. En vindventil startar den första uppvinden;
//                                   balkonger runt väggarna, och glipor som bara sandalerna tar Cello över.
//   The Weaver's Loom (sweb)      – spindelgolemen The Brass Weaver. Efter den ligger sandalerna, och golvet i gången
//                                   tillbaka rasar, så att Cello måste springa längs väggen.
//   The Crown of Storms (scrown)  – tornets krona under öppen himmel. Typhon, titanen i vinden.
//
// Liten nyckel: arkivet i porten → dörren till vävstolen. Stormnyckeln (Gale Key): södra balkongen högst upp.
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { SpireWing, BrassWeaver, Typhon, spireMats } from './spirekit.js';

export class Spire {
  constructor() {
    this.state = Spire.freshState();
    this.interactions = [];
    this.wings = [];
    this.enemySpots = [];
    this.trap = null;
    this.game = null;
    this.areas = null;
    this.title = 'The Windbound Spire';
    this.bossKeyName = 'Gale Key';
  }

  static freshState() {
    return { visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {}, entered: false, heartTaken: false };
  }

  wingAt(id) { return this.wings.find((w) => w.id === id) ?? null; }
  get cur() { return this.wingAt(this.areas?.id); }
  onTorch(id) { const w = this.wings.find((q) => id.startsWith(`${q.id}:`)); w?.onTorch?.(id); return !!w; }
  combatTargets() { return this.cur?.combatTargets() ?? []; }
  inside(p) { return !!this.cur?.inside(p); }
  roomAt(p) { return this.cur?.roomAt(p) ?? null; }
  slam(point, feet) { return this.cur?.slam(point, feet) ?? false; }
  onPlayerDeath() { this.cur?.onPlayerDeath(); }

  grant(item) {
    const s = this.state;
    if (item === 'smap') s.map = true;
    else if (item === 'skey') s.keys++;
    else if (item === 'galekey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  applyState(saved) {
    const s = (this.state = { ...Spire.freshState(), ...(saved || {}) });
    s.solved = { ...(s.solved || {}) };
    s.cleared = { ...(s.cleared || {}) };
    for (const w of this.wings) w.applyState();
    this.trap = null;
  }

  update(dt, t, frozen = false) {
    const w = this.cur;
    if (!w) return;
    w.update(dt, frozen);
    this.trap = w.trap ? w.trap.id : (w.bossFight ? 'boss' : null);
  }
}

export function buildSpire(B, areas, sp) {
  const SM = spireMats();
  const M = B.M;
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, indoor: true, ...def });
    B.begin(a);
    const w = new SpireWing(B, a, sp, { ox, name: def.name, H: def.H ?? 6, floorMat: SM.flag, wallMat: SM.marble, mats: { slab: SM.marble, trim: SM.bronze, metal: SM.bronze, block: SM.marble } });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    sp.wings.push(w);
    return w;
  };
  const LIGHT = { hemi: 1.6, moon: 1.1, flash: 0, sky: 0xdce8f4, ground: 0x6a6458, moonColor: 0xfff2dc };
  const ceiling = (w, x0, x1, z0, z1, y) => w.slab(x0, x1, y, y + 0.6, z0, z1, SM.marble);
  const corridor = (w, x0, x1, z0, z1, o = {}) => {
    const y = o.y ?? 0, h = o.h ?? 3.6;
    if (o.floor !== false) w.slab(x0, x1, y - 1, y, z0, z1, SM.flag);
    if ((o.along ?? 'z') === 'z') {
      w.slab(x0 - 1, x0, y - 1, y + h, z0, z1);
      w.slab(x1, x1 + 1, y - 1, y + h, z0, z1);
    } else {
      w.slab(x0, x1, y - 1, y + h, z0 - 1, z0);
      w.slab(x0, x1, y - 1, y + h, z1, z1 + 1);
    }
    if (o.ceiling !== false) ceiling(w, x0 - 1, x1 + 1, z0, z1, y + h);
  };
  // En trappa (ramp med steg) längs z, från (zLow, yLow) till (zHigh, yHigh)
  const stair = (w, x0, x1, zLow, zHigh, yLow, yHigh) => {
    const n = Math.max(2, Math.round(Math.abs(yHigh - yLow) / 0.3));
    const dz = (zHigh - zLow) / n, dy = (yHigh - yLow) / n;
    for (let k = 0; k < n; k++) {
      const za = zLow + dz * k, zb = za + dz;
      w.slab(x0, x1, yLow - 1, yLow + dy * k, Math.min(za, zb), Math.max(za, zb), SM.flag);
    }
    // En osynlig ramp ovanpå, så att Cello går mjukt
    const len = Math.hypot(zHigh - zLow, yHigh - yLow), th = Math.atan2(yHigh - yLow, Math.abs(zHigh - zLow));
    const r = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, len));
    r.rotation.x = Math.sign(zHigh - zLow) < 0 ? th : -th;
    r.position.set(w.X((x0 + x1) / 2), (yLow + yHigh) / 2 + 0.02, (zLow + zHigh) / 2);
    B.hidden(r.geometry, r.position.x, r.position.y, r.position.z, r.rotation.x);
  };
  const statue = (w, x, z, face, y = 0, s = 1) => {
    // Hermes: en marmorfigur med vingad hjälm och en stav
    const g = new THREE.Group();
    g.position.set(w.X(x), y, z);
    g.rotation.y = face;
    g.scale.setScalar(s);
    w.area.root.add(g);
    g.add(place(new THREE.Mesh(box(1.6, 0.8, 1.6, 1), SM.flag), 0, 0.4, 0));
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.2, 8), SM.marble), 0, 1.9, 0));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), SM.marble), 0, 3.25, 0));
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.5), SM.gold);
      wing.position.set(0.36 * sx, 3.4, -0.1);
      wing.rotation.x = -0.5;
      g.add(wing);
    }
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 5), SM.gold), 0.7, 1.9, 0.2));
    w.B.hidden(new THREE.BoxGeometry(1.6 * s, 3.6 * s, 1.6 * s), w.X(x), y + 1.8 * s, z);
  };
  const lamp = (w, x, z, y = 0) => {
    // En vit lykta av glas i en bronsställning
    w.B.solid(place(new THREE.Mesh(cyl(0.1, 0.16, 1.6, 6, 1), SM.bronze), w.X(x), y + 0.8, z));
    w.deco(new THREE.OctahedronGeometry(0.3), SM.glow, x, y + 1.85, z);
    B.lights.add({ x: w.X(x), y: y + 2, z, color: 0xe8f4ff, power: 10, range: 10, flicker: 0.1 });
  };

  // =====================================================================
  // The Gale Gate
  // =====================================================================
  mk({
    id: 'sgate', name: 'The Gale Gate', sub: 'Where the wind keeps the door', H: 4.2,
    fog: { color: 0xc8d0dc, near: 14, far: 70 }, light: LIGHT,
  }, 18000, (w, a) => {
    B.bounds(w.ox - 20, w.ox + 20, -60, 24);
    const G0 = w.room('G0', 'The Gale Gate', -6, 6, -2, 14);
    w.room('G1', 'The Howling Stair', -1.5, 1.5, -26, -2, { floorSlab: false });
    const G2 = w.room('G2', 'The Little Archive', -6, 6, -40, -26, { y: 3, floorSlab: false });
    // Portsalen
    w.walls(G0, { N: [0], S: [0] }, { y1: 6 });
    ceiling(w, -7, 7, -3, 15, 6);
    corridor(w, -2, 2, 14, 21, { ceiling: false });
    w.entry('entrance', 0, 10, Math.PI);
    w.entry('fromHall', 0, -36, 0, 3);
    w.exit(-2, 2, 17, 21, 'galecrown', 'spire', { label: 'The Galecrown' });
    statue(w, -4, 2, Math.PI / 2);
    statue(w, 4, 2, -Math.PI / 2);
    lamp(w, -5, 12); lamp(w, 5, 12);
    w.inscription(0, 12.6, Math.PI, ['Carved in marble, under a pair of bronze wings:', '"The messenger rested here between the heavens and the earth. Only the swift may climb to the crown."', '"Lean into the wind, or let it carry you."']);
    // Den ylande trappan: smal, uppför, och vinden blåser emot i stötar
    w.slab(-1.5, 1.5, -1, 0, -6, -2, SM.flag);
    stair(w, -1.5, 1.5, -6, -22, 0, 3);
    w.slab(-1.5, 1.5, -1, 3, -26, -22, SM.flag);
    for (const [z0, z1] of [[-26, -2]]) { w.slab(-2.5, -1.5, -1, 7, z0, z1); w.slab(1.5, 2.5, -1, 7, z0, z1); }
    ceiling(w, -2.5, 2.5, -26, -2, 6.6);
    w.wind(-1.5, 1.5, -26, -3, [0, 1], { strength: 11, period: 3.0, on: 0.62, y0: -1, y1: 7 });
    w.inscription(1.1, -4, -Math.PI / 2, ['Scratched beside the stair:', '"The wind of the stair spares no one who is light of foot. Be heavy, little brother."']);
    // Arkivet
    w.slab(-6, 6, 2, 3, -40, -26, SM.flag);
    w.walls(G2, { S: [0], N: [0] }, { y1: 7.5 });
    ceiling(w, -7, 7, -41, -25, 7.5);
    w.chest({ id: 'sMap', x: -4.4, y: 3, z: -38, face: Math.PI / 2, item: 'smap' });
    w.chest({ id: 'sKey1', x: 4.4, y: 3, z: -38, face: -Math.PI / 2, item: 'skey' });
    for (const [x, z] of [[-5, -27.5], [5, -27.5]]) lamp(w, x, z, 3);
    w.enemy('shield', -2, -33, [[-2, -33], [2, -33]], 'G2', { y: 3, room: 'G2' });
    w.enemy('bat', 2, -36, [], 'G2', { y: 4.5, room: 'G2' });
    // Bokhyllor
    for (const x of [-5.5, 5.5]) w.slab(x - 0.5, x + 0.5, 3, 6, -35, -29, M.wood);
    // Uppåt: gången till schakten
    corridor(w, -1.5, 1.5, -48, -40, { y: 3 });
    w.exit(-1.5, 1.5, -48, -44, 'shall', 'bottom', { label: 'The Hall of Winds' });
    a.map.floor = '1F';
  });

  // =====================================================================
  // The Hall of Winds: en kvadratisk schakt (30 × 30 m, över 40 m hög)
  // =====================================================================
  mk({
    id: 'shall', name: 'The Hall of Winds', sub: 'The wind climbs here, and so must you', H: 44,
    fog: { color: 0xd4dce8, near: 30, far: 150 }, light: { ...LIGHT, hemi: 1.75 },
  }, 18600, (w, a) => {
    B.bounds(w.ox - 40, w.ox + 40, -60, 20);
    const s = () => w.state;
    const X0 = -15, X1 = 15, Z0 = -35, Z1 = -5, TOP = 44, TY = 38;
    w.room('H0', 'The Hall of Winds', X0, X1, Z0, Z1);
    // Väggarna runt schakten (med dörrar) och glaskupolen högst upp
    w.wall('x', X0 - 1, X1 + 1, Z1, Z1 + 1, [{ c: 0 }], { y1: TOP });
    w.wall('x', X0 - 1, X1 + 1, Z0 - 1, Z0, [{ c: 0, w: 2.4, h: 3.6 }], { y1: TOP, fy: TY });
    w.wall('z', Z0, Z1, X0 - 1, X0, [{ c: -20, w: 2.4, h: 3.6, fy: 12 }], { y1: TOP, fy: 12 });
    w.wall('z', Z0, Z1, X1, X1 + 1, [], { y1: TOP });
    w.slab(X0 - 1, X1 + 1, TOP, TOP + 1, Z0 - 1, Z1 + 1, SM.marble);
    // Ljuset uppifrån: en skiva av himmelsblått glas
    w.deco(new THREE.PlaneGeometry(20, 20).rotateX(Math.PI / 2), SM.sky, 0, TOP - 0.05, -20);
    // Ingången från porten (söder)
    corridor(w, -1.5, 1.5, -5, 3);
    w.entry('bottom', 0, -1.5, Math.PI);
    w.exit(-1.5, 1.5, 1.2, 3, 'sgate', 'fromHall', { label: 'The Gale Gate' });
    // Mitt på golvet: Hermes och en vindros i mosaik
    statue(w, 0, -20, 0, 0, 1.6);
    w.deco(new THREE.CircleGeometry(6, 32).rotateX(-Math.PI / 2), SM.bronze, 0, 0.02, -20);
    for (const [x, z] of [[-13, -7], [13, -7], [-13, -33], [13, -33]]) lamp(w, x, z);
    // ---------- Balkong A: västra väggen, 12 m upp (dit leder den första uppvinden) ----------
    const LY = 12;
    w.room('HA', 'The West Gallery', X0, X0 + 4, -29, Z1, { y: LY, floorSlab: false });
    w.slab(X0, X0 + 4, LY - 0.8, LY, -29, Z1, SM.flag);
    w.slab(X0, X0 + 6, LY - 0.8, LY, Z0, -29, SM.flag); // hörnet i nordväst
    w.room('HAn', 'The West Gallery', X0, X0 + 6, Z0, -29, { y: LY, floorSlab: false });
    w.slab(X0 + 4, X0 + 4.3, LY, LY + 1, -29, Z1, SM.bronze); // räcke
    // Uppvind 1, från golvet till balkong A: öppnas med ventilen på södra väggen
    w.updraft('u1', -8.6, -9, 1.6, 0, LY + 3.2, { valve: 'v1', power: 9 });
    w.valve('v1', -6, -5.6, Math.PI, { toast: 'With a great sigh, the wind rises from the grate in the floor.' });
    w.inscription(-3, -5.6, Math.PI, ['Carved into the marble:', '"Turn the wheel and the tower breathes. Step into its breath, and it will lift you."']);
    // Dörren till vävstolen (liten nyckel), på balkong A
    w.slab(X0 - 4, X0, LY - 0.8, LY, -21.2, -18.8, SM.flag);
    w.door({ id: 'h_loom', x: X0 - 0.5, y: LY, z: -20, axis: 'x', type: 'key', neg: 'loom', pos: 'HA' });
    corridor(w, X0 - 8, X0 - 1, -21.2, -18.8, { y: LY, along: 'x' });
    w.exit(X0 - 8, X0 - 5, -21.2, -18.8, 'sweb', 'entrance', { label: "The Weaver's Loom", y: LY });
    w.entry('fromLoom', X0 + 2, -20, -Math.PI / 2, LY);
    // ---------- Norra väggen: en vägg att springa längs (från hörnet i nordväst till balkong N) ----------
    w.runWall(-9, 3, LY - 3, LY + 7, Z0 - 0.3, Z0);
    w.room('HN', 'The North Gallery', 3, X1, Z0, -29, { y: LY, floorSlab: false });
    w.slab(3, X1, LY - 0.8, LY, Z0, -29, SM.flag);
    w.chest({ id: 'sShards', x: 13.2, y: LY, z: -32.8, face: -Math.PI / 2, shards: 100 });
    w.inscription(-12.5, -34.6, 0, ['Carved under a row of bronze feathers:', '"Where the feathers are, the swift may run where others fall."', '(With the sandals on, run and jump at the wall at an angle.)'], LY);
    // Uppvind 2: från balkong N till balkong E (öppnas med en ventil på balkong N)
    const EY = 25;
    w.updraft('u2', 5, -32, 1.5, LY, EY + 3.2, { valve: 'v2', power: 9 });
    w.valve('v2', 6, -34.6, 0, { y: LY, toast: 'Above, the wind begins to climb the north wall.' });
    // ---------- Balkong E: östra väggen, 25 m upp, med stormbyar ----------
    w.room('HE', 'The East Gallery', X1 - 4, X1, -31, Z1, { y: EY, floorSlab: false });
    w.slab(X1 - 4, X1, EY - 0.8, EY, -31, Z1, SM.flag);
    w.slab(X1 - 7.6, X1, EY - 0.8, EY, Z0, -31, SM.flag);
    w.room('HEn', 'The East Gallery', X1 - 7.6, X1, Z0, -31, { y: EY, floorSlab: false });
    w.wind(X1 - 4, X1, -26, -14, [-1, 0], { y0: EY - 1, y1: EY + 5, strength: 9.5, period: 3.4, on: 0.5 });
    w.enemy('shield', 13, -10, [[13, -10], [13, -20]], 'HE', { y: EY, room: 'HE' });
    // Södra väggen: en vägg att springa längs (från hörnet i sydost till balkong S)
    w.slab(X1 - 6, X1, EY - 0.8, EY, -11, Z1, SM.flag);
    w.runWall(-3, 9, EY - 3, EY + 7, Z1, Z1 + 0.3);
    // ---------- Balkong S: södra väggen, 25 m upp: stormnyckeln och sista uppvinden ----------
    w.room('HS', 'The South Gallery', X0, -3, -11, Z1, { y: EY, floorSlab: false });
    w.slab(X0, -3, EY - 0.8, EY, -11, Z1, SM.flag);
    w.chest({ id: 'sGale', x: -13, y: EY, z: -8, face: Math.PI / 2, big: true, item: 'galekey' });
    w.enemy('bat', -8, -8, [], 'HS', { y: EY + 1.5, room: 'HS' });
    w.updraft('u3', -6, -8.5, 1.5, EY, TY + 3.2, { power: 9 });
    // ---------- Toppen: en ring runt schakten, och trappan upp till kronan ----------
    w.room('HT', 'The Windward Crown Stair', X0, X1, Z0, Z1, { y: TY, floorSlab: false });
    // (en glipa i södra kanten, där den sista uppvinden kommer upp)
    for (const [x0, x1, z0, z1] of [[X0, -8, -11, Z1], [-3.6, X1, -11, Z1], [X0, X1, Z0, -29], [X0, X0 + 6, -29, -11], [X1 - 6, X1, -29, -11]]) w.slab(x0, x1, TY - 0.8, TY, z0, z1, SM.flag);
    w.door({ id: 'h_crown', x: 0, y: TY, z: Z0 + 0.5, axis: 'z', type: 'boss', neg: 'crown', pos: 'HT' });
    w.slab(-1.2, 1.2, TY - 0.8, TY, Z0 - 6, Z0, SM.flag);
    corridor(w, -1.2, 1.2, Z0 - 8, Z0, { y: TY, floor: false });
    w.exit(-1.2, 1.2, Z0 - 8, Z0 - 4.5, 'scrown', 'entrance', { label: 'The Crown of Storms', y: TY });
    w.entry('fromCrown', 0, Z0 + 3, Math.PI, TY);
    // Den stora dörren: stormnyckeln
    w.interactions.push({
      label: () => (s().bossKey ? 'Unlock with the Gale Key' : 'The great door'), area: w.id, pos: () => w.V(0, TY, Z0 + 2), radius: 2,
      ok: () => !s().doors.includes('h_crown'),
      run: () => {
        if (s().bossKey) {
          w.game.sfx.play('keyturn');
          w.openDoor('h_crown');
          w.game.hud.toast('The Gale Key turns. Above, the storm is waiting.', 3000);
          w.game.story.save(true);
        } else w.game.story.read(['A great door of bronze, cast with a storm-cloud.', 'It needs the Gale Key.']);
      },
    });
    // Om Cello faller hamnar han på golvet; balkongerna har fasta platser att återuppstå på
    a.map.floor = 'Shaft';
  });

  // =====================================================================
  // The Weaver's Loom
  // =====================================================================
  mk({
    id: 'sweb', name: "The Weaver's Loom", sub: 'Brass threads, and something that spins them', H: 16,
    fog: { color: 0xa8a8b4, near: 16, far: 80 }, light: { ...LIGHT, hemi: 1.4 },
  }, 19200, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -50, 20);
    const s = () => w.state;
    const L = w.room('L0', "The Weaver's Loom", -12, 12, -32, -8);
    w.room('L1', 'The Threaded Way', 12, 30, -21.2, -18.8, { floorSlab: false });
    w.walls(L, { E: [-20] }, { y1: 16 });
    ceiling(w, -13, 13, -33, -7, 16);
    // Trådar över hela taket
    for (let k = 0; k < 9; k++) {
      const t = w.deco(new THREE.CylinderGeometry(0.04, 0.04, 34, 4).rotateZ(Math.PI / 2).rotateY((k / 9) * Math.PI), SM.glow, 0, 15.2 - (k % 3) * 0.4, -20);
      t.material = new THREE.MeshBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.4 });
    }
    for (const [x, z] of [[-11, -9], [11, -9], [-11, -31], [11, -31]]) lamp(w, x, z);
    // Gången från schakten (österut): golvet rasar när golemen har fallit; då får sandalerna bära Cello längs väggen
    w.slab(12, 15, -1, 0, -21.2, -18.8, SM.flag);
    w.slab(23, 30, -1, 0, -21.2, -18.8, SM.flag);
    w.slab(12, 30, -1, 5, -23.2, -21.2, SM.feather, 2.5);
    w.slab(12, 30, -1, 5, -18.8, -16.8, SM.feather, 2.5);
    ceiling(w, 12, 30, -23.2, -16.8, 5);
    w.slab(30, 31, -1, 5, -23.2, -16.8, SM.marble);
    w.entry('entrance', 26, -20, -Math.PI / 2);
    w.exit(27, 30, -21.2, -18.8, 'shall', 'fromLoom', { label: 'The Hall of Winds' });
    // Golvbiten som rasar (mellan x 15 och 23)
    const crumble = new THREE.Mesh(box(8, 0.6, 2.4, 2), SM.flag);
    crumble.position.set(w.X(19), -0.3, -20);
    w.D.add(crumble);
    // Gropen under: en uppvind bär den som faller tillbaka upp
    w.slab(15, 23, -5, -4, -21.2, -18.8, SM.flag);
    w.slab(14, 15, -5, -1, -21.2, -18.8, SM.marble);
    w.slab(23, 24, -5, -1, -21.2, -18.8, SM.marble);
    const pit = w.updraft('pit', 19, -20, 1.1, -4, 1.4, { power: 8 });
    pit.valve = 'crumbled';
    w.onConnect.push((c) => {
      w.crumbleBox = c.addBox(w.X(15), -0.6, -21.2, w.X(23), 0, -18.8, 'crumble');
      w.crumbleMesh = crumble;
    });
    w.afterSpire = () => {
      const fallen = !!s().cleared.weaver;
      if (w.crumbleBox) w.crumbleBox.enabled = !fallen;
      if (w.crumbleMesh) w.crumbleMesh.visible = !fallen;
      pit.forced = fallen;
      w.applyDrafts();
    };
    // The Brass Weaver
    w.chest({ id: 'sSandals', x: 0, z: -29, face: 0, big: true, item: 'sandals', hidden: () => !!s().cleared.weaver });
    w.inscription(-8, -9, Math.PI, ['Cast into a bronze plate:', '"Hephaestus made the Weaver to guard the messenger\'s sandals. It spins from above, and falls like a stone."', '"When it is caught in the floor, its heart is bare. And it hates the sound of thunder."']);
    w.fightBars = ['l_door'];
    w.door({ id: 'l_door', x: 12.5, z: -20, axis: 'x', type: 'open', neg: 'L0', pos: 'L1' });
    w.onConnect.push(() => {
      const wv = new BrassWeaver(w.D, w.V(0, 0, -20), w.rooms.L0, w.groundAt);
      wv.clearId = 'weaver';
      wv.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'stuck' && !w.hinted.stuck) { w.hinted.stuck = true; g.hud.toast('The Weaver is caught in the floor! Its core is bare: strike it!', 3200); }
        if (ev === 'dazed' && !w.hinted.dazed) { w.hinted.dazed = true; g.hud.toast('The thunder of the hammer dazes the Weaver!', 2800); }
        if (ev !== 'defeated') return;
        w.bossFight = false;
        s().cleared.weaver = true;
        w.setBars('l_door', false);
        g.sfx.play('secret');
        g.hud.toast('The Brass Weaver falls apart. Something glints where it fell...', 3600);
        // Golvet i gången rasar
        g.story.after(2.5, () => {
          w.afterSpire();
          g.sfx.play('crumble');
          g.rig.shake(0.4);
          g.fx.burst('debris', w.V(19, 0, -20), 30, 0xc8c0b0);
        });
        g.story.save(true);
      };
      w.bosses.push(wv);
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || s().cleared.weaver) return;
      const r = w.rooms.L0, wv = w.bosses[0];
      const inner = p.feet.x > r.x0 + 2 && p.feet.x < r.x1 - 3 && p.feet.z > r.z0 + 2 && p.feet.z < r.z1 - 2;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('l_door', true);
        wv.wake();
        g.hud.card('The Brass Weaver', 'Guardian of the messenger\'s sandals');
      }
    });
    a.map.floor = '3F';
  });

  // =====================================================================
  // The Crown of Storms: under öppen himmel, med Typhon
  // =====================================================================
  mk({
    id: 'scrown', name: 'The Crown of Storms', sub: 'Where the wind was born', H: 20, indoor: false,
    fog: { color: 0x4a5462, near: 40, far: 220 }, light: { hemi: 1.2, moon: 1.1, flash: 1.6, sky: 0x9aa8c0, ground: 0x2a2e36, moonColor: 0xc8d8f0 },
  }, 19800, (w, a) => {
    B.bounds(w.ox - 60, w.ox + 60, -80, 40);
    const s = () => w.state;
    const R = 13, RY = 6;
    const C = w.V(0, 0, -30);
    w.room('C0', 'The Crown of Storms', -R, R, -30 - R, -30 + R, { floorSlab: false });
    // Plattformen: en rund skiva av marmor
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(R, R - 0.6, 1.4, 40), SM.flag);
    B.solid(place(disk, C.x, -0.7, C.z));
    w.deco(new THREE.RingGeometry(4, 5, 40).rotateX(-Math.PI / 2), SM.bronze, 0, 0.02, -30);
    // Trappan upp från schakten (söder)
    w.slab(-1.2, 1.2, -1, 0, -18, -10, SM.flag);
    corridor(w, -1.2, 1.2, -10, -4, { ceiling: false });
    w.entry('entrance', 0, -8, Math.PI);
    w.exit(-1.2, 1.2, -6, -2, 'shall', 'fromCrown', { label: 'The Hall of Winds' });
    // Fyra pelare: lä mot andedräkten
    const pillars = [];
    for (const ang of [0.7, -0.7, 2.45, -2.45]) {
      const x = Math.sin(ang) * 8.2, z = -30 + Math.cos(ang) * 8.2;
      B.solid(place(new THREE.Mesh(cyl(1.0, 1.15, 9, 10, 1.5), SM.marble), w.X(x), 4.5, z));
      w.deco(new THREE.CylinderGeometry(1.4, 1.4, 0.5, 10), SM.bronze, x, 9.2, z);
      pillars.push({ x: w.X(x), z, r: 1.15 });
    }
    // Den övre ringen (6 m upp), i 16 bitar; två glipor (mot nordost och nordväst), med väggar att springa längs
    const segs = 16, r0 = R, r1 = R + 2.6;
    const gapAt = new Set([2, 14]);
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2, am = (a0 + a1) / 2;
      const len = 2 * r1 * Math.sin(Math.PI / segs) + 0.15;
      if (!gapAt.has(k)) {
        const m = new THREE.Mesh(box(len, 0.8, r1 - r0, 1.5), SM.flag);
        m.position.set(C.x + Math.sin(am) * (r0 + r1) / 2, RY - 0.4, C.z + Math.cos(am) * (r0 + r1) / 2);
        m.rotation.y = am;
        B.solid(m);
      }
      // Bröstvärn på utsidan; vid gliporna är det en hög vägg med bronsfjädrar
      const wall = new THREE.Mesh(box(len, gapAt.has(k) ? 6 : 1.2, 0.5, 1.5), gapAt.has(k) ? SM.feather : SM.marble);
      wall.position.set(C.x + Math.sin(am) * (r1 + 0.25), gapAt.has(k) ? RY + 1.5 : RY + 0.6, C.z + Math.cos(am) * (r1 + 0.25));
      wall.rotation.y = am;
      B.solid(wall);
    }
    // Pelare som bär ringen
    for (let k = 0; k < 8; k++) {
      const am = (k / 8) * Math.PI * 2 + Math.PI / 16;
      B.solid(place(new THREE.Mesh(cyl(0.45, 0.55, RY, 8, 1.5), SM.marble), C.x + Math.sin(am) * (r1 - 0.6), RY / 2 - 0.8, C.z + Math.cos(am) * (r1 - 0.6)));
    }
    w.room('C1', 'The Windward Ring', -r1, r1, -30 - r1, -30 + r1, { y: RY, floorSlab: false });
    // Uppvindar: en vid ringens östra sida (öppnas när Typhon sjunker ihop), en under kanten i söder (alltid)
    const ue = w.updraft('ue', 11, -30, 1.5, 0, RY + 2.4, { power: 9 });
    ue.forced = false;
    ue.valve = 'typhon';
    // Faller Cello över kanten (andedräkten blåser söderut) hamnar han på en molnhylla; uppvinden där bär honom tillbaka
    w.slab(-7, 7, -9, -8, -30 + R + 1, -30 + R + 9, SM.cloud);
    w.updraft('uback', 4.2, -30 + R + 3, 1.6, -8, 1.2, { power: 11 });
    // Typhon
    w.onConnect.push(() => {
      const ty = new Typhon(w.D, C, Math.PI, w.groundAt, { radius: R, ringY: RY, pillars });
      ty.home.y = C.y + 3.4;
      ty.clearId = 'typhon';
      ty.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'rest' && !w.hinted.rest) { w.hinted.rest = true; g.hud.toast("Typhon's fist rests on the crown! Strike the glowing rune on his wrist!", 3600); }
        if (ev === 'slumped') {
          ue.forced = true;
          w.applyDrafts();
          if (!w.hinted.slump) { w.hinted.slump = true; g.hud.toast('The storm-titan sags! Ride the wind by the east side up to the ring, and strike the heart in his chest!', 4800); }
        }
        if (ev === 'phase' || ev === 'awake' || ev === 'dying') { ue.forced = false; w.applyDrafts(); }
        if (ev === 'phase') g.hud.toast('Typhon roars, and the storm grows stronger!', 2600);
        if (ev === 'dying') g.story.typhonFalls?.();
        if (ev !== 'defeated') return;
        w.bossFight = false;
        s().cleared.typhon = true;
        g.story.spireBossDefeated?.();
      };
      w.bosses.push(ty);
      w.typhon = ty;
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      const ty = w.typhon;
      if (!ty) return;
      // När Typhon inte längre sjunker ihop stängs uppvinden
      if (ue.forced && ty.state !== 'slumped') { ue.forced = false; w.applyDrafts(); }
      if (frozen || s().cleared.typhon) return;
      const inner = Math.hypot(p.feet.x - C.x, p.feet.z - C.z) < R - 3 && p.feet.y > C.y - 1;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        ty.wake();
        g.hud.card('Typhon', 'The titan in the wind');
        g.story.typhonWakes?.();
      }
    });
    // Efteråt: hjärtat och vinden som bär Cello hem
    w.chest({ id: 'sHeart', x: 0, z: -30, face: Math.PI, big: true, item: 'heart', hidden: () => !!s().cleared.typhon && !!w.game?.story.state.choice2 });
    w.interactions.push({
      label: 'Ride the wind home', area: w.id, pos: () => w.V(0, 0, -36), radius: 2.2,
      ok: () => !!s().cleared.typhon && !!w.game?.story.state.choice2 && s().chests.includes('sHeart'),
      run: () => w.game.story.leaveSpire?.(),
    });
    w.afterSpire = () => { ue.forced = false; w.applyDrafts(); };
    a.map.floor = 'Crown';
  });

  return sp.wings;
}

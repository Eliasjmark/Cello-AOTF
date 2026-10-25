// The Sunken Necropolis (0.12): fas 9 – en fängelsehåla med egen identitet, byggd kring reliken
// Anubis' Broken Scales. Fyra områden (inga dimgränser, bara övertoningar):
//
//   The Narrow Crypts (ncrypts)        – låga, trånga gångar med nischer där mumier sover (smyg förbi),
//                                        ett översvämmat ossuarium som töms med en slussratt,
//                                        och Schakalväktaren i balsameringshuset. Där ligger vågskålen.
//   The Hall of Weighing (nhall)       – en enorm sal med högt i tak. Vattnet står lågt, mitt eller högt;
//                                        ett sarkofaglock flyter upp till en andebro som bara finns i de dödas värld.
//   The Paths of the Duat (nduat)      – stigar över avgrunden: broar som bara finns i de dödas värld,
//                                        broar av brons som bara finns bland de levande, falska väggar och vålnader.
//   The Hall of Two Truths (nthrone)   – Ammit, hjärtslukerskan.
//
// Små nycklar: N1 (ossuariets botten) → balsameringshuset · N2 (västra balkongen) → dörren ner till Duat.
// Ankhnyckeln (fjäderkammaren i Duat) → den stora dörren till Ammit.
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { NecroWing, JackalWarden, Ammit, necroMats } from './necrokit.js';

export class Necropolis {
  constructor() {
    this.state = Necropolis.freshState();
    this.interactions = [];
    this.wings = [];
    this.enemySpots = [];
    this.trap = null;
    this.game = null;
    this.areas = null;
    this.title = 'The Sunken Necropolis';
    this.bossKeyName = 'Ankh Key';
  }

  static freshState() {
    return { visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {}, water: {}, entered: false, heartTaken: false };
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
    if (item === 'nmap') s.map = true;
    else if (item === 'nkey') s.keys++;
    else if (item === 'ankhkey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  applyState(saved) {
    const s = (this.state = { ...Necropolis.freshState(), ...(saved || {}) });
    s.solved = { ...(s.solved || {}) };
    s.cleared = { ...(s.cleared || {}) };
    s.water = { ...(s.water || {}) };
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

export function buildNecropolis(B, areas, nec) {
  const NM = necroMats();
  const M = B.M;
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, indoor: true, ...def });
    B.begin(a);
    const w = new NecroWing(B, a, nec, { ox, name: def.name, H: def.H ?? 6 });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    nec.wings.push(w);
    return w;
  };
  const LIGHT = { hemi: 1.15, moon: 0.6, flash: 0, sky: 0x8ab8a8, ground: 0x1e2626, moonColor: 0xa8e6d4 };
  const FOG = { color: 0x0a1110, near: 12, far: 70 };
  // En gång med golv, väggar och tak (lokala koordinater; along: 'z' = gången går längs z)
  const corridor = (w, x0, x1, z0, z1, o = {}) => {
    const y = o.y ?? 0, h = o.h ?? 3.4;
    w.slab(x0, x1, y - 1, y, z0, z1, o.floor ?? w.floorMat);
    if (o.walls !== false) {
      if ((o.along ?? 'z') === 'z') {
        w.slab(x0 - 1, x0, y - 1, y + h, z0, z1, o.wall ?? w.wallMat);
        w.slab(x1, x1 + 1, y - 1, y + h, z0, z1, o.wall ?? w.wallMat);
      } else {
        w.slab(x0, x1, y - 1, y + h, z0 - 1, z0, o.wall ?? w.wallMat);
        w.slab(x0, x1, y - 1, y + h, z1, z1 + 1, o.wall ?? w.wallMat);
      }
    }
    if (o.ceiling !== false) w.ceiling(x0 - 1, x1 + 1, z0, z1, y + h);
  };
  // En ramp (lokala koordinater) från (zLow, yLow) till (zHigh, yHigh) längs z, med fyllning under
  const ramp = (w, x0, x1, zLow, zHigh, yLow, yHigh, mat = w.floorMat) => {
    const len = Math.hypot(zHigh - zLow, yHigh - yLow), th = Math.atan2(yHigh - yLow, Math.abs(zHigh - zLow)), t = 0.5;
    const m = new THREE.Mesh(box(x1 - x0, t, len, 1.5), mat);
    const dir = Math.sign(zHigh - zLow);
    m.rotation.x = dir < 0 ? th : -th;
    m.position.set(w.X((x0 + x1) / 2), (yLow + yHigh) / 2 - Math.cos(th) * t / 2, (zLow + zHigh) / 2);
    B.solid(m);
    const n = Math.ceil(Math.abs(zHigh - zLow));
    for (let k = 0; k < n; k++) {
      const z0 = zLow + dir * k, z1 = zLow + dir * (k + 1);
      const top = yLow + (yHigh - yLow) * (k / n) - 0.6;
      if (top <= yLow + 0.05) continue;
      w.slab(x0, x1, yLow - 0.5, top, Math.min(z0, z1), Math.max(z0, z1), NM.basalt);
    }
  };

  // =====================================================================
  // The Narrow Crypts
  // =====================================================================
  mk({
    id: 'ncrypts', name: 'The Narrow Crypts', sub: 'Where the dead sleep lightly', H: 3.4,
    fog: { color: 0x090e0d, near: 9, far: 55 }, light: LIGHT,
  }, 14000, (w, a) => {
    B.bounds(w.ox - 48, w.ox + 22, -92, 24);
    const s = () => w.state;
    const A0 = w.room('A0', 'The Sunken Stair', -2.5, 2.5, 0, 12);
    const A1 = w.room('A1', 'Hall of the Jackals', -9, 9, -16, -2);
    const A2 = w.room('A2', 'The Crypt Corridor', -35, -10, -11, -7);
    w.room('A2b', 'The Crypt Corridor', -35, -31, -36, -11, { floorSlab: false });
    const A3 = w.room('A3', 'The Flooded Ossuary', -40, -22, -58, -36, { floorSlab: false });
    const A4 = w.room('A4', 'House of Embalming', -42, -20, -84, -60);
    const A5 = w.room('A5', "Embalmers' Alcove", 10, 17, -13, -5);
    w.room('A6', 'The Hidden Way', -1.5, 1.5, -30, -17, { floorSlab: false });
    // Trappan upp till öknen
    corridor(w, -2.5, 2.5, -1, 13);
    corridor(w, -2, 2, 13, 20, { ceiling: false });
    w.entry('entrance', 0, 9, Math.PI);
    w.entry('fromHall', 0, -24, 0);
    w.exit(-2, 2, 16, 20, 'desert', 'necropolis', { label: 'The Ember Wastes' });
    // Sand som har runnit ner för trappan, längs väggarna
    for (let i = 0; i < 4; i++) w.deco(new THREE.SphereGeometry(0.9, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1.6), M.sandRock, (i % 2 ? -1.9 : 1.9), 0, 11 - i * 2.6);
    // Schakalernas sal: högt i tak, två statyer, grönt ljus
    // Väggarna (den norra byggs för sig, med den falska väggen)
    w.wall('x', -10, 10, -2, -1, [{ c: 0 }], { y1: 6 });
    w.wall('z', -16, -2, -10, -9, [{ c: -9 }], { y1: 6 });
    w.wall('z', -16, -2, 9, 10, [{ c: -9 }], { y1: 6 });
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.ceiling(-10, 10, -17, -1, 6);
    // Två schakaler vaktar norra väggen (och dörren som inte är någon dörr)
    w.jackal(-4.5, -13.6, 0);
    w.jackal(4.5, -13.6, 0);
    w.spiritFire(-7.5, -3.5);
    w.spiritFire(7.5, -3.5);
    w.spiritFire(-7.5, -14.5);
    w.spiritFire(7.5, -14.5);
    w.inscription(3.5, -15.2, 0, [
      'Carved into the black stone:',
      '"Here Anubis weighed every heart against the feather of truth. The light went on to the fields of reeds; the heavy were given to Ammit."',
      '"Then the Devourer broke the scales, and kept every heart for herself."',
    ]);
    // Norra väggen: en falsk vägg i mitten (bara bland de levande). Bakom den går vägen vidare.
    w.wall('x', -10, 10, -17, -16, [{ c: 0, w: 3, h: 3.6 }], { y1: 6 });
    w.ghostSlab(-1.5, 1.5, 0, 3.6, -17, -16, 'living', NM.basalt);
    w.inscription(-3.5, -15.2, 0, ['Carved into the black stone:', '"The jackal sees the doors the living cannot. Walk as the dead walk, and the stone will not stop you."']);
    corridor(w, -1.5, 1.5, -34, -17);
    w.exit(-1.5, 1.5, -34, -30, 'nhall', 'entrance', { label: 'The Hall of Weighing' });
    w.spirit('a1', 0, -10, [
      'A visitor who walks between... It has been so long.',
      'The way to the Hall of Weighing lies north, through stone the living cannot pass.',
      'We are the ones who were never weighed. Ammit took our hearts, and we cannot rest.',
    ], { look: { skin: 0xffffff, hairStyle: 'hood', hood: 0xffffff, top: 0xffffff, robe: true, scale: 0.92 } });

    // Alkoven i öster: kartan
    w.walls(A5, { W: [-9] });
    w.ceiling(9, 18, -14, -4);
    w.slab(9, 10, -1, 0, -10.2, -7.8, w.floorMat);
    w.chest({ id: 'nMap', x: 15.5, z: -9, face: -Math.PI / 2, item: 'nmap' });
    w.spiritFire(11, -12);
    w.enemy('mummy', 12.5, -6.5, [[12.5, -6.5], [12.5, -11.5]], 'A5', { doze: true, room: 'A5' });

    // Kryptgången: låg och smal, nischer på båda sidor där mumier sover
    w.slab(-35, -10, -1, 0, -11, -7, w.floorMat);
    w.slab(-35, -31, -1, 0, -36, -11, w.floorMat);
    w.ceiling(-36, -9, -12, -6);
    w.ceiling(-36, -30, -36, -12);
    // Norra väggen (med nischer) och södra väggen (med nischer), västra och östra
    const nicheWall = (along, a0, a1, t0, t1, centers) => w.wall(along, a0, a1, t0, t1, centers.map((c) => ({ c, w: 1.8, h: 2.6 })), { y1: 3.4 });
    nicheWall('x', -31, -10, -12, -11, [-14.5, -20.5, -26.5]);
    nicheWall('x', -36, -10, -7, -6, [-16, -23, -29]);
    nicheWall('z', -36, -6, -36, -35, [-18, -26]);
    nicheWall('z', -36, -12, -31, -30, [-22]);
    // Nischernas skal av ben (golv, sidor, bakvägg) – solida, så att mumierna står stadigt
    const nicheBox = (cx, cz, dx, dz) => {
      // dx/dz: åt vilket håll nischen går in i väggen
      const along = dx !== 0 ? 'z' : 'x';
      const back = { x: cx + dx * 1.6, z: cz + dz * 1.6 };
      w.slab(cx - (along === 'x' ? 0.9 : 0.8) + Math.min(0, dx * 1.6), cx + (along === 'x' ? 0.9 : 0.8) + Math.max(0, dx * 1.6), -1, 0, cz - (along === 'z' ? 0.9 : 0.8) + Math.min(0, dz * 1.6), cz + (along === 'z' ? 0.9 : 0.8) + Math.max(0, dz * 1.6), NM.bone);
      if (along === 'x') {
        w.slab(cx - 1.1, cx - 0.9, -1, 2.8, Math.min(cz, back.z), Math.max(cz, back.z), NM.bone);
        w.slab(cx + 0.9, cx + 1.1, -1, 2.8, Math.min(cz, back.z), Math.max(cz, back.z), NM.bone);
        w.slab(cx - 1.1, cx + 1.1, -1, 2.8, back.z - 0.2, back.z + 0.2, NM.bone);
        w.slab(cx - 1.1, cx + 1.1, 2.6, 3.4, Math.min(cz, back.z), Math.max(cz, back.z), NM.bone);
      } else {
        w.slab(Math.min(cx, back.x), Math.max(cx, back.x), -1, 2.8, cz - 1.1, cz - 0.9, NM.bone);
        w.slab(Math.min(cx, back.x), Math.max(cx, back.x), -1, 2.8, cz + 0.9, cz + 1.1, NM.bone);
        w.slab(back.x - 0.2, back.x + 0.2, -1, 2.8, cz - 1.1, cz + 1.1, NM.bone);
        w.slab(Math.min(cx, back.x), Math.max(cx, back.x), 2.6, 3.4, cz - 1.1, cz + 1.1, NM.bone);
      }
    };
    const niches = [
      [-14.5, -11.5, 0, -1], [-20.5, -11.5, 0, -1], [-26.5, -11.5, 0, -1],
      [-16, -6.5, 0, 1], [-23, -6.5, 0, 1], [-29, -6.5, 0, 1],
      [-35.5, -18, -1, 0], [-35.5, -26, -1, 0], [-30.5, -22, 1, 0],
    ];
    niches.forEach(([x, z, dx, dz], i) => {
      nicheBox(x, z, dx, dz);
      // Varannan nisch har en sovande mumie; de andra har bara ben och krukor
      if (i % 2 === 0) w.enemy('mummy', x + dx * 0.9, z + dz * 0.9, [[x + dx * 0.9, z + dz * 0.9]], 'A2', { doze: true, room: 'A2' });
      else B.pot(w.X(x + dx * 0.9), 0, z + dz * 0.9, 0.8);
    });
    for (const [x, z] of [[-12, -10.4], [-34.4, -7.6], [-34.4, -33]]) w.spiritFire(x, z);
    w.inscription(-22, -7.6, Math.PI, ['Scratched into the bone wall:', '"Walk softly. The sleepers wake to running feet." (Press C to walk.)']);
    w.spirit('a2', -27, -9, [
      'Shh... They are not dead, not truly. Not alive either. They sleep where Ammit dropped them.',
      'Walk slowly and they will not wake. Run, and they will rise.',
    ]);

    // Det översvämmade ossuariet: en bassäng som töms med slussratten. Nyckeln ligger på botten.
    w.slab(-40, -22, -1, 0, -40, -36, w.floorMat); // södra hyllan
    w.slab(-40, -38, -1, 0, -56, -40, w.floorMat); // västra
    w.slab(-24, -22, -1, 0, -56, -40, w.floorMat); // östra
    w.slab(-40, -22, -1, 0, -58, -56, w.floorMat); // norra
    w.slab(-38, -24, -4, -3, -56, -40, NM.bone); // botten
    for (const [x0, x1, z0, z1] of [[-38, -24, -40.2, -40], [-38, -24, -56, -55.8]]) w.slab(x0, x1, -3, 0, z0, z1, NM.bone);
    for (const [x0, x1] of [[-38.2, -38], [-24, -23.8]]) w.slab(x0, x1, -3, 0, -56, -40, NM.bone);
    ramp(w, -27, -24.1, -47, -55.8, -3, 0, NM.bone);
    w.walls(A3, { S: [-33], N: [-31] }, { y1: 6, mat: NM.bone });
    w.ceiling(-41, -21, -59, -35, 6);
    w.pool('ossuary', -38, -24, -56, -40, -3, [0.2, -2.75], { start: 0 });
    w.sluice('s1', 'ossuary', -36.5, -38, { face: 0, labels: ['high', 'low'], delay: 1.0 });
    w.chest({ id: 'nK1', x: -31, y: -3, z: -50, face: Math.PI, item: 'nkey' });
    for (const [x, z] of [[-39, -37], [-23, -37], [-39, -57], [-23, -57]]) w.spiritFire(x, z);
    w.enemy('mummy', -26, -38, [[-26, -38], [-34, -38]], 'A3', { doze: true, room: 'A3' });
    w.inscription(-28, -36.6, Math.PI, ['Carved into the bone:', '"When the river rose, the faithful were laid to rest below. Turn the wheel, and the river remembers its bed."']);

    // Balsameringshuset: Schakalväktaren
    w.slab(-32.2, -29.8, -1, 0, -60, -58, w.floorMat);
    w.door({ id: 'a34', x: -31, z: -59, axis: 'z', type: 'key', neg: 'A4', pos: 'A3' });
    w.walls(A4, { S: [-31] }, { y1: 7 });
    w.ceiling(-43, -19, -85, -60, 7);
    const sarcs = [[-37, -67], [-25, -67], [-37, -78], [-25, -78]].map(([x, z]) => w.sarcophagus(x, z, 0));
    for (const [x, z] of [[-41, -62], [-21, -62], [-41, -83], [-21, -83]]) w.spiritFire(x, z);
    w.jackal(-31, -83, 0, 0, 1.3);
    w.chest({ id: 'nScales', x: -31, z: -80, face: 0, big: true, item: 'scales', hidden: () => !!s().cleared.warden });
    w.inscription(-24, -61.6, Math.PI, ['Carved into the black stone:', '"Wepwawet, opener of the ways, guards the scales of his master. His lunge is swift... and blind."']);
    w.fightBars = ['a34'];
    w.onConnect.push(() => {
      const gd = new JackalWarden(w.D, w.V(-31, 0, -74), 0, w.rooms.A4, w.groundAt, sarcs);
      gd.clearId = 'warden';
      gd.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'crashed' && !w.hinted.crash) {
          w.hinted.crash = true;
          g.hud.toast('The jackal crashed and is stuck! Strike now, from any side!', 3200);
        }
        if (ev !== 'defeated') return;
        w.bossFight = false;
        s().cleared.warden = true;
        w.setBars('a34', false);
        g.sfx.play('secret');
        g.hud.toast('Wepwawet falls into dust. Something waits at the feet of the jackal...', 3600);
        g.story.save(true);
      };
      w.bosses.push(gd);
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || s().cleared.warden) return;
      const r = w.rooms.A4, gd = w.bosses[0];
      const inner = p.feet.x > r.x0 + 3 && p.feet.x < r.x1 - 3 && p.feet.z > r.z0 + 3 && p.feet.z < r.z1 - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('a34', true);
        gd.wake();
        g.hud.card('Wepwawet', 'The jackal who guards the scales');
      }
    });
    w.spirit('a4', -27, -80, [
      'You hold the scales of Anubis now. Broken... but they still weigh true.',
      'Tip them, and you walk where the dead walk. Tip them again, and you return.',
      'The jackals in the hall of the entrance guard a door of false stone. In our realm, it is no door at all.',
    ], { when: () => !!s().cleared.warden });
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Hall of Weighing
  // =====================================================================
  mk({
    id: 'nhall', name: 'The Hall of Weighing', sub: 'Where hearts were set against a feather', H: 22,
    fog: { color: 0x0a1312, near: 20, far: 140 }, light: { ...LIGHT, hemi: 0.95 },
  }, 14600, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -76, 20);
    const s = () => w.state;
    w.room('B0', 'Hall Landing', -3, 3, 2, 10);
    w.room('B1', 'The Hall of Weighing', -24, 24, -60, 2, { floorSlab: false });
    w.room('Bw', 'West Gallery', -24, -16, -44, -24, { y: 7, floorSlab: false });
    w.room('Be', 'East Gallery', 16, 24, -44, -24, { y: 7, floorSlab: false });
    w.room('Bl', 'The Drowned Floor', -24, 24, -60, -6, { y: -8, floorSlab: false });
    w.room('Bd', 'The Stair to the Duat', -1.5, 1.5, -70, -61, { y: -8, floorSlab: false });
    corridor(w, -3, 3, 2, 14, { h: 4 });
    w.entry('entrance', 0, 8, Math.PI);
    w.entry('fromDuat', 0, -64, 0, -8);
    w.exit(-2, 2, 11, 14, 'ncrypts', 'fromHall', { label: 'The Narrow Crypts' });
    // Den södra balkongen och hallens väggar (från botten till taket)
    w.slab(-24, 24, -1, 0, -6, 2, w.floorMat);
    w.slab(-24, 24, -9, -8, -60, -6, w.floorMat); // det nedre golvet
    w.wall('x', -25, 25, 2, 3, [{ c: 0, w: 2.4, h: 3.6 }], { y0: -9, y1: 22, fy: 0 });
    w.wall('x', -25, 25, -61, -60, [{ c: 0, w: 2.4, h: 3.6 }], { y0: -9, y1: 22, fy: -8 });
    w.wall('z', -60, 2, -25, -24, [], { y0: -9, y1: 22 });
    w.wall('z', -60, 2, 24, 25, [], { y0: -9, y1: 22 });
    w.slab(-25, 25, 22, 23, -61, 3, NM.basalt);
    // Kanten på balkongen
    w.slab(-24, 24, -8, 0, -6.4, -6, NM.bronze);
    // Gallerierna i väster och öster (höga block av basalt)
    w.slab(-24, -16, -8, 7, -44, -24, w.floorMat);
    w.slab(16, 24, -8, 7, -44, -24, w.floorMat);
    // Rampen längs östra väggen, från balkongen ner till det nedre golvet
    ramp(w, 20, 24, -22, -6.4, -8, 0);
    // Vattnet: lågt (det nedre golvet går att gå på), mitt (balkongens höjd) eller högt (gallerierna)
    w.pool('hall', -24, 24, -60, -6.6, -8, [-7.6, -0.1, 6.85], { start: 1 });
    w.sluice('w1', 'hall', -6, -2.4, { face: 0, delay: 3.2 });
    w.sluice('w2', 'hall', -20, -25.4, { face: 0, delay: 3.2, y: 7 });
    w.floater('f1', 'hall', -10, -8.4, 3, 3, -7.75);
    // Andebron från locket (när vattnet står högt) till västra galleriet, och den stora bron tvärs över salen
    w.ghostSlab(-11, -9, 6.7, 7.0, -26, -9.9);
    w.ghostSlab(-16, -9, 6.7, 7.0, -26, -24);
    w.ghostSlab(-16, 16, 6.7, 7.0, -35, -33);
    // Anubis med vågskålen, över dörren ner till Duat
    {
      const g = new THREE.Group();
      g.position.set(w.X(0), -8, -57.5);
      a.root.add(g);
      const J = NM.jackal, Gd = NM.gold;
      g.add(place(new THREE.Mesh(box(6, 6, 3, 2), NM.basalt), 0, 9, 0));
      g.add(place(new THREE.Mesh(box(4.4, 7, 2.4, 2), J), 0, 15, 0));
      g.add(place(new THREE.Mesh(box(2.6, 2.4, 2.4, 1), J), 0, 19.6, 0.3));
      g.add(place(new THREE.Mesh(box(1.2, 1.0, 1.8, 1), J), 0, 19.2, 1.8));
      for (const sd of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), J);
        ear.position.set(0.8 * sd, 22, 0.2);
        g.add(ear);
        // Armarna håller vågskålens pannor (en är bruten)
        g.add(place(new THREE.Mesh(box(1, 4.5, 1, 1), J), 3 * sd, 14, 0.8));
        g.add(place(new THREE.Mesh(box(0.1, 3, 0.1, 1), Gd), 3 * sd, 10.5, 0.8));
        const pan = new THREE.Mesh(cyl(1.2, 0.9, 0.3, 10, 1), Gd);
        pan.position.set(3 * sd + (sd > 0 ? 0.6 : 0), sd > 0 ? 8.2 : 9.1, 0.8);
        pan.rotation.z = sd > 0 ? 0.5 : 0;
        g.add(pan);
      }
      g.add(place(new THREE.Mesh(box(3, 0.6, 2.6, 1), Gd), 0, 17.8, 0.1));
      g.add(place(new THREE.Mesh(box(6.4, 0.2, 0.2, 1), Gd), 0, 13.5, 0.8));
    }
    w.door({ id: 'b_duat', x: 0, z: -60.5, axis: 'z', type: 'key', y: -8, neg: 'Bd', pos: 'Bl' });
    corridor(w, -1.5, 1.5, -72, -61, { y: -8, h: 4 });
    w.exit(-1.5, 1.5, -72, -68, 'nduat', 'entrance', { y: -8, label: 'The Paths of the Duat' });
    // Lampor: gröna eldar på balkongerna och gallerierna
    for (const [x, z, y] of [[-22, -1, 0], [22, -1, 0], [-22, -42, 7], [-18, -42, 7], [22, -42, 7], [18, -26, 7], [-20, -58, -8], [20, -58, -8], [-4, -58, -8], [4, -58, -8]]) w.spiritFire(x, z, y);
    // Det nedre golvet: sarkofager och mumier som sover under vattnet
    for (const [x, z] of [[-14, -20], [14, -48], [-12, -50], [8, -16]]) w.sarcophagus(x, z, 0.3, -8);
    w.enemy('mummy', -6, -40, [[-6, -40], [6, -40]], 'Bl', { y: -8, doze: true, room: 'Bl' });
    w.enemy('mummy', 10, -30, [[10, -30], [10, -44]], 'Bl', { y: -8, doze: true, room: 'Bl' });
    // Västra galleriet: nyckeln och en ande; östra galleriet: skatten och vålnader
    w.chest({ id: 'nK2', x: -22, y: 7, z: -40, face: Math.PI / 2, item: 'nkey' });
    w.chest({ id: 'nHallE', x: 21.5, y: 7, z: -40, face: -Math.PI / 2, shards: 20 });
    w.enemy('wraith', 19.5, -30, [[19.5, -28], [19.5, -40]], 'Be', { y: 7, room: 'Be' });
    w.enemy('wraith', 20, -36, [[20, -34], [20, -42]], 'Be', { y: 7, room: 'Be' });
    w.spirit('bw', -18, -30, [
      'You rode the river up... clever. The priests did the same, long ago.',
      'The key you need lies in the chest beside me. The door to the Duat is below, at the feet of the jackal.',
      'Let the river fall to its bed, and the drowned floor will carry you there.',
    ], { y: 7 });
    w.spirit('b0', 4, -3, [
      'Three heights has the river: the drowned floor, the walk of the living, and the galleries of the priests.',
      'What floats will rise with it. And what only the dead can walk... waits above.',
    ]);
    w.inscription(10, 1.4, Math.PI, ['Carved into the black stone:', '"The river of the dead rises and falls at the turn of a wheel. What floats, rises."']);
    w.inscription(-21, -43.4, 0, ['Carved into the black stone:', '"The priests crossed the hall on a bridge of souls. No living foot ever touched it."'], 7);
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Paths of the Duat
  // =====================================================================
  mk({
    id: 'nduat', name: 'The Paths of the Duat', sub: 'The roads of the underworld', H: 10,
    fog: { color: 0x061010, near: 16, far: 90 }, light: { ...LIGHT, hemi: 1.2, sky: 0x9ad8c8 },
  }, 15200, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -100, 20);
    const s = () => w.state;
    w.room('C0', 'Edge of the Duat', -4, 4, -2, 8);
    w.room('C1', 'The Paths of the Duat', -4, 4, -38, -2, { floorSlab: false });
    const C2 = w.room('C2', 'Chamber of the Feather', -8, 8, -52, -38);
    w.room('C3', 'The Last Path', -4, 4, -74, -52, { floorSlab: false });
    w.room('C4', 'Before the Great Door', -4, 4, -82, -74);
    corridor(w, -2, 2, 8, 14, { h: 4 });
    w.entry('entrance', 0, 6, Math.PI);
    w.entry('fromThrone', 0, -78, 0);
    w.exit(-2, 2, 11, 14, 'nhall', 'fromDuat', { label: 'The Hall of Weighing' });
    // Stigarna: sten (alltid), andebroar (de döda) och broar av brons (de levande)
    w.slab(-2, 2, -1, 0, -8, -2, w.floorMat); // S1
    w.ghostSlab(-1.25, 1.25, -0.3, 0, -13, -8); // D1
    w.slab(-3, 3, -1, 0, -19, -13, w.floorMat); // S2
    w.ghostSlab(-1.25, 1.25, -0.3, 0, -27, -19, 'living', NM.bronze); // L1
    w.slab(-4, 4, -1, 0, -33, -27, w.floorMat); // S3
    w.ghostSlab(-1.25, 1.25, -0.3, 0, -38, -33); // D2
    w.ghostSlab(-1.25, 1.25, -0.3, 0, -60, -52, 'living', NM.bronze); // L2
    w.slab(-3, 3, -1, 0, -66, -60, w.floorMat); // S4
    w.ghostSlab(-3, 3, 0, 3.6, -66.5, -66, 'living', NM.basalt); // falsk vägg
    w.ghostSlab(-1.25, 1.25, -0.3, 0, -74, -66.5); // D3
    // Låga murar runt kanten av stenplattorna, och pelare som försvinner ner i mörkret
    for (const [x0, x1, z0, z1] of [[-4, 4, -2, 8], [-4, 4, -82, -74]]) {
      w.slab(x0 - 0.4, x0, -1, 0.8, z0, z1, NM.basalt);
      w.slab(x1, x1 + 0.4, -1, 0.8, z0, z1, NM.basalt);
    }
    for (const [x, z] of [[-10, -10], [10, -18], [-12, -30], [12, -44], [-12, -60], [11, -70], [-9, 4], [9, -80]]) {
      B.deco(new THREE.Mesh(cyl(1.4, 1.8, 40, 8, 2), NM.basalt), w.X(x), -14, z);
      B.deco(new THREE.Mesh(cyl(1.6, 1.6, 0.4, 8, 1), NM.bronze), w.X(x), 6.2, z);
    }
    // Ett dimhav långt där nere
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(90, 140), new THREE.MeshBasicMaterial({ color: 0x0c3a34, transparent: true, opacity: 0.55, depthWrite: false }));
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(w.X(0), -22, -40);
    a.root.add(mist);
    for (const [x, z] of [[-3.4, 7.4], [3.4, 7.4], [-1.6, -2.6], [2.5, -18.5], [-2.5, -13.5], [-3.4, -32.4], [3.4, -27.6], [2.4, -60.6], [-2.4, -65.4], [-3.4, -75], [3.4, -81]]) w.spiritFire(x, z);
    // Fjäderns kammare: fällrum med mumier och vålnader, ankhnyckeln
    w.walls(C2, { S: [0], N: [0] }, { y1: 4 });
    w.door({ id: 'c_s', x: 0, z: -37.5, axis: 'z', type: 'open', neg: 'C2', pos: 'C1' });
    w.door({ id: 'c_n', x: 0, z: -52.5, axis: 'z', type: 'open', neg: 'C3', pos: 'C2' });
    w.slab(-1.25, 1.25, -1, 0, -38, -37, w.floorMat);
    w.slab(-1.25, 1.25, -1, 0, -53, -52, w.floorMat);
    w.trapRoom('tC2', 'C2', ['c_s', 'c_n'], ['C2a', 'C2b'], () => w.game?.hud.toast('Silence returns to the chamber. A feather of light settles on the altar.', 3200));
    w.traps[0].text = 'The bars fall! The guardians of the feather rise!';
    for (const [x, z] of [[-5, -42], [5, -42], [0, -48]]) w.enemy('mummy', x, z, [[x, z], [x, z - 3]], 'C2a', { dormant: true, room: 'C2' });
    for (const [x, z] of [[-5, -48], [5, -48]]) w.enemy('wraith', x, z, [[x, z], [x, z + 4]], 'C2b', { dormant: true, room: 'C2' });
    w.chest({ id: 'nAnkh', x: 0, z: -50, face: Math.PI, big: true, item: 'ankhkey', hidden: () => !!s().cleared.tC2 });
    for (const [x, z] of [[-7, -39], [7, -39], [-7, -51], [7, -51]]) w.spiritFire(x, z);
    // Vålnader på stigarna (bara i de dödas värld)
    w.enemy('wraith', -2.5, -30, [[-2.5, -28], [2.5, -32]], 'C1', { room: 'C1' });
    w.enemy('wraith', 1.5, -63, [[-1.5, -62], [1.5, -64]], 'C3', { room: 'C3' });
    w.spirit('c0', 2.4, 3, [
      'These are the roads every soul once walked. Some stones were laid by the living, some by the dead.',
      'Where the living road ends, walk as the dead. Where the dead road ends, return to the living.',
      'And if you fall... the Duat sends you back. It is kinder than Ammit.',
    ]);
    w.spirit('c2', -5, -44, [
      'The feather of truth rested here, before Ammit came.',
      'The key of life opens her door. Take it, if the guardians let you.',
    ], { when: () => !!s().cleared.tC2 });
    // Den stora dörren: ankhnyckeln
    w.door({ id: 'c_boss', x: 0, z: -82.5, axis: 'z', type: 'boss', neg: null, pos: 'C4' });
    w.wall('x', -5, 5, -83, -82, [{ c: 0, w: 2.4, h: 3.6 }], { y1: 6 });
    corridor(w, -2, 2, -92, -83, { h: 4 });
    w.exit(-2, 2, -92, -88, 'nthrone', 'entrance', { label: 'The Hall of Two Truths' });
    w.interactions.push({
      label: () => (s().bossKey ? 'Unlock the great door' : 'Examine the great door'), area: w.id, pos: () => w.V(0, 0, -80.6), radius: 2,
      ok: () => !s().doors.includes('c_boss'),
      run: () => {
        const g = w.game;
        if (s().bossKey) {
          g.sfx.play('keyturn');
          w.openDoor('c_boss');
          g.story.save(true);
        } else g.story.read(['A door of black stone, marked with the sign of life.', 'It needs the Ankh Key.']);
      },
    });
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Hall of Two Truths: Ammit
  // =====================================================================
  mk({
    id: 'nthrone', name: 'The Hall of Two Truths', sub: 'Where the Devourer waits', H: 18,
    fog: { color: 0x0a0e0e, near: 18, far: 100 }, light: { ...LIGHT, hemi: 0.9 },
  }, 15800, (w, a) => {
    B.bounds(w.ox - 26, w.ox + 26, -56, 16);
    const s = () => w.state;
    const D0 = w.room('D0', 'Threshold', -3, 3, 0, 8);
    const ARENA = w.room('D1', 'The Hall of Two Truths', -20, 20, -50, -10, { floorSlab: false });
    w.walls(D0, { N: [0], S: [0] }, { y1: 5 });
    corridor(w, -2, 2, 8, 14, { h: 4 });
    w.entry('entrance', 0, 6, Math.PI);
    w.exit(-2, 2, 11, 14, 'nduat', 'fromThrone', { label: 'The Paths of the Duat' });
    w.door({ id: 't_in', x: 0, z: -0.5, axis: 'z', type: 'open', neg: 'D1', pos: 'D0' });
    // Arenan: en rund ö av sten mitt i en svart kanal, fyra pelare
    const C = { x: 0, z: -30 };
    B.solid(place(new THREE.Mesh(cyl(13.5, 13.5, 1, 32, 3), w.floorMat), w.X(C.x), -0.5, C.z));
    w.slab(-2, 2, -1, 0, -17, -1, w.floorMat); // bron över kanalen
    for (const sx of [-1, 1]) w.slab(sx > 0 ? 2 : -3, sx > 0 ? 3 : -2, -1, 3, -9, -1, NM.basalt);
    w.slab(-21, 21, -8, -7, -51, -9, NM.basalt); // kanalens botten
    w.wall('x', -21, 21, -10, -9, [{ c: 0, w: 4, h: 4 }], { y0: -8, y1: 18 });
    w.wall('x', -21, 21, -51, -50, [], { y0: -8, y1: 18 });
    w.wall('z', -50, -10, -21, -20, [], { y0: -8, y1: 18 });
    w.wall('z', -50, -10, 20, 21, [], { y0: -8, y1: 18 });
    w.slab(-21, 21, 18, 19, -51, -9, NM.basalt);
    w.pool('throne', -20, 20, -50, -10, -7, [-1.2, 0.35], { start: 0 });
    const pillars = [];
    for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
      const x = C.x + dx, z = C.z + dz;
      B.solid(place(new THREE.Mesh(cyl(1.0, 1.15, 10, 10, 2), NM.basalt), w.X(x), 5, z));
      B.deco(new THREE.Mesh(cyl(1.3, 1.3, 0.5, 10, 1), NM.bronze), w.X(x), 10.2, z);
      B.deco(new THREE.Mesh(cyl(1.3, 1.3, 0.4, 10, 1), NM.bronze), w.X(x), 0.2, z);
      pillars.push({ x: w.X(x), z, r: 1.1 });
    }
    for (const [x, z] of [[-18, -12], [18, -12], [-18, -48], [18, -48]]) w.spiritFire(x, z, -7);
    for (const [x, z] of [[-11, -22], [11, -22], [-11, -38], [11, -38], [0, -42.5]]) w.spiritFire(x, z);
    // Tron längst in: två schakaler och Anubis tomma stol
    w.jackal(-6, -46, 0, 0, 1.2);
    w.jackal(6, -46, 0, 0, 1.2);
    w.chest({ id: 'nHeart', x: 0, z: -34, face: 0, big: true, item: 'heart', hidden: () => !!s().cleared.ammit });
    // Ljuset som bär Cello ut, när Ammit har fallit
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x9af8e4, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const portal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 9, 20, 1, true), portalMat);
    portal.position.set(w.X(0), 4.5, -24);
    portal.visible = false;
    a.root.add(portal);
    w.interactions.push({
      label: 'Step into the light', area: w.id, pos: () => w.V(0, 0, -24), radius: 1.8,
      ok: () => !!s().cleared.ammit,
      run: () => w.game.story.leaveNecropolis?.(),
    });
    w.onUpdate.push((dt) => {
      portal.visible = !!s().cleared.ammit;
      portal.rotation.y += dt * 0.6;
      portalMat.opacity = 0.45 + Math.sin(w.t * 2) * 0.1;
    });
    // Anubis visar sig när Ammit har fallit (bara i de dödas värld)
    w.spirit('anubis', 0, -40.5, [
      'The hearts are home now. Listen... you can hear the reeds, very far away.',
      'Keep my scales. In the realm of the dead, my servants will always speak to you.',
      'Walk into the light when you are ready, child of ash.',
    ], { name: 'Anubis', jackal: true, when: () => !!s().cleared.ammit, look: { skin: 0xffffff, top: 0xffffff, robe: true, shawl: 0xffffff, scale: 1.45, width: 1.1 } });
    w.fightBars = ['t_in'];
    w.onConnect.push(() => {
      const am = new Ammit(w.D, w.V(C.x, 0, C.z), pillars, w.groundAt, { radius: 13.2 });
      w.bosses.push(am);
      am.onEvent = (ev) => {
        const g = w.game;
        am.realm = g.realm;
        if (ev === 'armored' && !w.hinted.armored) {
          w.hinted.armored = true;
          g.hud.toast("Ammit's hide turns every blow. Make her charge into a pillar!", 3600);
        }
        if (ev === 'stunned' && !w.hinted.stunned) {
          w.hinted.stunned = true;
          g.hud.toast(g.realm?.dead ? 'She is dazed! Her stolen heart glows. Strike it!' : 'She is dazed! Tip the scales: in the realm of the dead, her stolen heart shows.', 4200);
        }
        if (ev === 'needRealm' && !w.hinted.needRealm) {
          w.hinted.needRealm = true;
          g.hud.toast('The blade finds only hide. Her heart can only be struck in the realm of the dead!', 3800);
        }
        if (ev === 'phase') {
          if (am.phase === 2) {
            w.setWater('throne', 1);
            g.hud.toast('The black water rises! Ammit will strike from below!', 3400);
          }
          if (am.phase === 3) g.hud.toast('Ammit calls the hungry dead!', 2800);
        }
        if (ev === 'summon') {
          for (const e of g.enemies.list) if (e.room === 'Dw') e.wake?.();
        }
        if (ev === 'dying') g.story.ammitFalls?.();
        if (ev === 'defeated') {
          w.bossFight = false;
          s().cleared.ammit = true;
          w.setBars('t_in', false);
          w.setWater('throne', 0);
          g.enemies.killGroup('Dw');
          g.sfx.play('secret');
          g.story.necropolisBossDefeated?.();
        }
      };
    });
    for (const [x, z] of [[-8, -30], [8, -30]]) w.enemy('wraith', x, z, [[x, z], [x, z + 3]], 'Dw', { dormant: true, room: 'D1' });
    w.onUpdate.push((dt, p, g, frozen) => {
      const am = w.bosses[0];
      if (am) am.realm = g.realm;
      if (frozen || s().cleared.ammit || !am) return;
      const inner = Math.hypot(p.feet.x - w.X(C.x), p.feet.z - C.z) < 11 && p.feet.y > -1;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('t_in', true);
        am.wake();
        g.hud.card('Ammit', 'Devourer of hearts');
      }
    });
    w.afterNecro = () => {
      if (s().cleared.ammit) return;
      w.setWater('throne', 0, true);
      for (const e of w.game?.enemies.list ?? []) if (e.room === 'Dw' && e.alive) { e.dormant = true; e.reset(); }
    };
    a.map.floor = 'B1';
  });

  return nec.wings;
}

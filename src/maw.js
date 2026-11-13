// Frostgiant's Maw (0.16): den sjätte fängelsehålan, byggd kring Loki's Mask. Ett labyrint av is inne i
// en frusen jättes gap och strupe. Layouten följer reliken och isen: glidis där Cello bara stannar mot något,
// ett vridbart nav som byter vilka gångar som är öppna, och rimfrostgaller som bara skuggan flyger igenom.
//
//   The Frozen Jaw (fgate)         – förhallen, Glidsalen (11 × 11 rutor glidis) med kartan i en nisch
//                                    och den lilla nyckeln på avsatsen i norr.
//   The Turning Halls (flab)       – navet med spaken (N/S eller Ö/V öppna). Väster: en till glidsal med
//                                    nyckel nummer två. Öster: tryckplattan bakom rimfrost (Frost Key, masken behövs).
//   Hati's Den (fwolf)             – isvargen Hati. Efter den: Loki's Mask, rimfrostgallret, klyftan och den stora dörren.
//   The Throne of Thrym (fthrone)  – frostjätten Thrym, besatt av Kronos.
//
// Små nycklar: fgate (avsatsen) → dörren mot flab. flab väster → dörren mot fwolf. Frost Key: flab öster.
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { FrostWing, Hati, Thrym, frostMats } from './frostkit.js';

export class Maw {
  constructor() {
    this.state = Maw.freshState();
    this.interactions = [];
    this.wings = [];
    this.enemySpots = [];
    this.trap = null;
    this.game = null;
    this.areas = null;
    this.title = "Frostgiant's Maw";
    this.bossKeyName = 'Frost Key';
  }

  static freshState() {
    return { visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {}, hubs: {}, entered: false, heartTaken: false };
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
    if (item === 'fmap') s.map = true;
    else if (item === 'fkey') s.keys++;
    else if (item === 'frostkey') s.bossKey = true;
    else if (item === 'heart') s.heartTaken = true;
  }

  applyState(saved) {
    const s = (this.state = { ...Maw.freshState(), ...(saved || {}) });
    s.solved = { ...(s.solved || {}) };
    s.cleared = { ...(s.cleared || {}) };
    s.hubs = { ...(s.hubs || {}) };
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

export function buildMaw(B, areas, mw) {
  const FM = frostMats(B.M);
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, indoor: true, ...def });
    B.begin(a);
    const w = new FrostWing(B, a, mw, { ox, name: def.name, H: def.H ?? 6.5, floorMat: FM.floor, wallMat: FM.wall, mats: { slab: FM.wallDark, trim: FM.rime, metal: FM.iron, block: FM.rock, runes: FM.wallDark } });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    mw.wings.push(w);
    return w;
  };
  const LIGHT = { hemi: 1.35, moon: 0.95, flash: 0, sky: 0xc8e0f0, ground: 0x34404c, moonColor: 0xd8ecff };
  const FOG = { color: 0x1c2a38, near: 16, far: 90 };
  const ceiling = (w, x0, x1, z0, z1, y) => w.slab(x0, x1, y, y + 0.6, z0, z1, FM.wallDark);
  const corridor = (w, x0, x1, z0, z1, o = {}) => {
    const y = o.y ?? 0, h = o.h ?? 4;
    if (o.floor !== false) w.slab(x0, x1, y - 1, y, z0, z1, FM.floor);
    if ((o.along ?? 'z') === 'z') {
      w.slab(x0 - 1, x0, y - 1, y + h, z0, z1);
      w.slab(x1, x1 + 1, y - 1, y + h, z0, z1);
    } else {
      w.slab(x0, x1, y - 1, y + h, z0 - 1, z0);
      w.slab(x0, x1, y - 1, y + h, z1, z1 + 1);
    }
    if (o.ceiling !== false) ceiling(w, x0 - 1, x1 + 1, z0 - (o.along === 'x' ? 1 : 0), z1 + (o.along === 'x' ? 1 : 0), y + h);
  };
  // Ett blått ljus i en iskristall på väggen
  const crystal = (w, x, z, y = 0) => {
    const m = w.deco(new THREE.OctahedronGeometry(0.4, 0), FM.glow, x, y + 3.2, z);
    m.scale.y = 1.8;
    B.lights.add({ x: w.X(x), y: y + 3, z, color: 0x9fd8ff, power: 9, range: 12, flicker: 0.1 });
  };
  // Istappar i taket (bara för synen)
  const icicles = (w, x0, x1, z0, z1, y, n = 10) => {
    for (let k = 0; k < n; k++) {
      const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0), h = 0.6 + Math.random() * 1.4;
      const ic = w.deco(new THREE.ConeGeometry(0.15 + Math.random() * 0.15, h, 5), FM.rime, x, y - h / 2, z);
      ic.rotation.x = Math.PI;
    }
  };
  // Glidisens rutor: kolumn c → x, rad r → z (rad 0 i söder)
  const grid = (x0, zS) => ({ x: (c) => x0 + 1 + 2 * c, z: (r) => zS - 1 - 2 * r });

  // =====================================================================
  // The Frozen Jaw
  // =====================================================================
  mk({ id: 'fgate', name: 'The Frozen Jaw', sub: 'Between the teeth of a giant', H: 8, fog: FOG, light: LIGHT }, 28000, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -60, 34);
    // ---------- förhallen ----------
    const V0 = w.room('V0', 'The Gums', -6, 6, 1, 20);
    w.wall('x', -7, 7, 20, 21, [{ c: 0 }], { y1: 7 });
    w.wall('z', 1, 20, -7, -6, [], { y1: 7 });
    w.wall('z', 1, 20, 6, 7, [], { y1: 7 });
    ceiling(w, -7, 7, 0, 21, 7);
    corridor(w, -1.5, 1.5, 21, 30, { h: 4 });
    w.entry('entrance', 0, 24, Math.PI);
    w.exit(-1.5, 1.5, 27.5, 30, 'frost', 'maw', { label: 'The Frostmarch', text: 'Cello climbs back out between the frozen teeth...' });
    crystal(w, -5.4, 6); crystal(w, 5.4, 14);
    // Tänderna: stora vita pelare längs väggarna
    for (const z of [4, 10, 16]) for (const s of [-1, 1]) w.B.solid(place(new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.5, 5), FM.bone), w.X(s * 4.8), 2.25, z));
    w.inscription(-3, 18.6, Math.PI, ['Runes, cut into a tooth of the giant:', '"Here lies Thrym, king of the frost-giants, who stole the hammer of thunder and died for it."', '"The ice of his body does not melt. Walk it as he walked: straight, and without stopping."']);
    icicles(w, -6, 6, 1, 20, 7, 14);

    // ---------- Glidsalen: 11 × 11 rutor glidis ----------
    const G1 = w.room('G1', 'The Gliding Hall', -11, 11, -31, 0);
    w.wall('x', -12, 12, 0, 1, [{ c: 0 }], { y1: 8 }); // söder (mot förhallen)
    w.wall('x', -12, 12, -32, -31, [{ c: 0 }], { y1: 8 }); // norr
    w.wall('z', -31, 0, -12, -11, [], { y1: 8 });
    w.wall('z', -31, 0, 11, 12, [{ c: -13, w: 2.2 }], { y1: 8 }); // nischen med kartan
    ceiling(w, -12, 12, -32, 1, 8);
    w.glideFloor(-11, 11, -22, 0);
    const g1 = grid(-11, 0);
    for (const [c, r] of [[5, 7], [4, 3], [9, 8], [1, 6], [8, 2], [2, 9], [6, 10], [10, 4], [3, 1], [7, 5], [0, 3]]) w.stopper(g1.x(c) - 0, g1.z(r));
    // Avsatsen i norr (vanligt golv), skild från isen av en vägg med en öppning (kolumn 7)
    w.wall('x', -11, 11, -23, -22, [{ c: g1.x(7), w: 2.0 }], { y1: 8 });
    w.inscription(-8, -29.4, 0, ['A warning, scratched into the ice by someone who came before:', '"Once you start to slide, you do not stop until something stops you."', '"Look before you move. The blocks are your friends."']);
    w.chest({ id: 'fKey1', x: 8.5, z: -27, face: -Math.PI / 2, item: 'fkey' });
    crystal(w, -10.4, -26); crystal(w, 10.4, -26); crystal(w, -10.4, -8); crystal(w, 10.4, -4);
    // Nischen med kartan
    w.room('G2', 'The Alcove', 12, 18, -16, -10);
    w.wall('x', 11, 19, -17, -16, [], { y1: 5 });
    w.wall('x', 11, 19, -10, -9, [], { y1: 5 });
    w.wall('z', -16, -10, 18, 19, [], { y1: 5 });
    ceiling(w, 11, 19, -17, -9, 5);
    w.chest({ id: 'fMap', x: 16.4, z: -13, face: -Math.PI / 2, item: 'fmap' });
    // Gången norrut, med den låsta dörren
    corridor(w, -1.5, 1.5, -46, -31, { h: 4 });
    w.door({ id: 'g_lab', x: 0, z: -36, type: 'key', neg: 'C', pos: 'G1' });
    w.exit(-1.5, 1.5, -46, -43.5, 'flab', 'entrance', { label: 'The Turning Halls' });
    w.entry('fromLab', 0, -41, 0);
    w.enemy('bat', -6, -26, null, 'g1bats');
    w.enemy('bat', 6, -14, [[4, -10], [8, -18]], 'g1bats');
    icicles(w, -11, 11, -31, 0, 8, 26);
    a.map.floor = 'F1';
  });

  // =====================================================================
  // The Turning Halls
  // =====================================================================
  mk({ id: 'flab', name: 'The Turning Halls', sub: 'The giant\'s throat turns on itself', H: 7, fog: FOG, light: LIGHT }, 28600, (w, a) => {
    B.bounds(w.ox - 45, w.ox + 45, -40, 34);
    // ---------- navet ----------
    const HUB = w.room('H0', 'The Turning Hall', -7, 7, -7, 7);
    w.walls(HUB, { N: [0], S: [0], E: [0], W: [0] }, { y1: 7 });
    ceiling(w, -8, 8, -8, 8, 7);
    w.hub('h0', 0, 0, { half: 7 });
    for (const [x, z] of [[-5.6, -5.6], [5.6, -5.6], [-5.6, 5.6], [5.6, 5.6]]) w.pillar(x, z, 0.7, 7);
    crystal(w, -6.4, -2.6); crystal(w, 6.4, 2.6);
    icicles(w, -7, 7, -7, 7, 7, 10);
    // Söder: gången från The Frozen Jaw
    corridor(w, -1.5, 1.5, 8, 24, { h: 4 });
    w.entry('entrance', 0, 18, Math.PI);
    w.exit(-1.5, 1.5, 21.5, 24, 'fgate', 'fromLab', { label: 'The Frozen Jaw' });
    w.inscription(-1.2, 10.5, Math.PI / 2, ['A picture in the ice: a ring with four mouths, and a hand on a lever.', '"The throat of the giant turns. Two ways open, two ways close."', '"Do not fear to turn it again. The way back is never lost."']);
    // Norr: den låsta dörren mot Hati
    corridor(w, -1.5, 1.5, -24, -8, { h: 4 });
    w.door({ id: 'l_wolf', x: 0, z: -13, type: 'key', neg: 'C', pos: 'H0' });
    w.exit(-1.5, 1.5, -24, -21.5, 'fwolf', 'entrance', { label: "Hati's Den" });
    w.entry('fromWolf', 0, -18, 0);
    // ---------- väster: Kylsalen, en till glidsal (9 × 8 rutor). Nyckeln ligger på en avsats i väster ----------
    corridor(w, -14, -8, -1.5, 1.5, { along: 'x', h: 4 });
    const W1 = w.room('W1', 'The Chilling Hall', -32, -14, -9, 7);
    w.wall('x', -33, -13, -10, -9, [], { y1: 7 });
    w.wall('x', -33, -13, 7, 8, [], { y1: 7 });
    w.wall('z', -9, 7, -14, -13, [{ c: 0 }], { y1: 7 });
    w.wall('z', -9, 7, -33, -32, [{ c: -6, w: 2.0 }], { y1: 7 });
    ceiling(w, -33, -13, -10, 8, 7);
    w.glideFloor(-32, -14, -9, 7);
    // Rad 0 i söder (z 6) och rad 7 i norr (z −8)
    const gx = (c) => -31 + 2 * c, gz = (r) => 6 - 2 * r;
    for (const [c, r] of [[0, 2], [1, 0], [1, 7], [2, 2], [3, 3], [4, 0], [5, 7], [7, 1], [7, 2], [8, 0], [8, 2]]) w.stopper(gx(c), gz(r));
    // Avsatsen med nyckeln
    w.room('W2', 'The Cold Shelf', -38, -32, -9, -3);
    w.wall('x', -39, -31, -10, -9, [], { y1: 5 });
    w.wall('x', -39, -31, -3, -2, [], { y1: 5 });
    w.wall('z', -9, -3, -39, -38, [], { y1: 5 });
    ceiling(w, -39, -31, -10, -2, 5);
    w.chest({ id: 'fKey2', x: -36.4, z: -6, face: Math.PI / 2, item: 'fkey' });
    crystal(w, -31.4, 4); crystal(w, -14.6, -6);
    w.enemy('bat', -22, -4, [[-26, 0], [-18, -6]], 'w1bats');
    w.enemy('bat', -28, 2, null, 'w1bats');
    icicles(w, -32, -14, -9, 7, 7, 16);
    // ---------- öster: Rimsalen. Tryckplattan ligger bakom rimfrostgallret (masken behövs) ----------
    corridor(w, 8, 14, -1.5, 1.5, { along: 'x', h: 4 });
    const E1 = w.room('E1', 'The Rime Hall', 14, 32, -8, 8);
    w.wall('x', 13, 33, -9, -8, [{ c: 18 }], { y1: 7 });
    w.wall('x', 13, 33, 8, 9, [], { y1: 7 });
    w.wall('z', -8, 8, 13, 14, [{ c: 0 }], { y1: 7 });
    w.wall('z', -8, 8, 32, 33, [], { y1: 7 });
    ceiling(w, 13, 33, -9, 9, 7);
    w.rime('e1', 23.4, 23.8, -8, 8, 0, 7);
    w.pressurePlate('e1plate', 27, 0, {
      onChange: (on) => {
        if (!on || w.state.doors.includes('e_key')) return;
        w.openDoor('e_key');
        w.game.sfx.play('secret');
        w.game.hud.toast('The shadow is as heavy as Cello! The door to the north grinds open.', 3400);
        w.game.story.save(true);
      },
    });
    w.door({ id: 'e_key', x: 18, z: -8.5, type: 'plate', neg: 'E2', pos: 'E1', text: ["The door won't budge.", 'An iron plate is set into the floor beyond the rime. Something heavy must stand on it... but nothing can pass the rime.'] });
    w.room('E2', 'The Frost Vault', 15, 21, -16, -9);
    w.wall('x', 14, 22, -17, -16, [], { y1: 5 });
    w.wall('z', -16, -9, 14, 15, [], { y1: 5 });
    w.wall('z', -16, -9, 21, 22, [], { y1: 5 });
    ceiling(w, 14, 22, -17, -8, 5);
    w.chest({ id: 'fBossKey', x: 18, z: -14, face: 0, big: true, item: 'frostkey' });
    w.inscription(16.2, 6.6, Math.PI, ['A horned face is carved here, grinning:', '"Ice holds the giant. Rime holds the thief. But no rime ever held a shadow."', '— L.']);
    crystal(w, 31.4, -4); crystal(w, 14.6, 4);
    w.enemy('askling', 20, 4, [[18, -4], [22, 4]], 'e1');
    w.enemy('shield', 19, -2, null, 'e1');
    a.map.floor = 'F2';
  });

  // =====================================================================
  // Hati's Den
  // =====================================================================
  mk({ id: 'fwolf', name: "Hati's Den", sub: 'The wolf that chases the moon', H: 10, fog: { ...FOG, color: 0x16222e }, light: LIGHT }, 29200, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -70, 34);
    const R = 12;
    corridor(w, -1.5, 1.5, R + 1, 28, { h: 4 });
    w.entry('entrance', 0, 22, Math.PI);
    w.exit(-1.5, 1.5, 25.5, 28, 'flab', 'fromWolf', { label: 'The Turning Halls' });
    w.room('A0', "Hati's Den", -R, R, -R, R);
    // Den runda salen: ett varv av is med öppningar i söder och norr
    const segs = 24;
    for (let k = 0; k < segs; k++) {
      const am = ((k + 0.5) / segs) * Math.PI * 2, cx = Math.sin(am), cz = Math.cos(am);
      if (Math.abs(cx) < 0.2) continue;
      const len = 2 * (R + 0.8) * Math.sin(Math.PI / segs) + 0.3;
      const m = new THREE.Mesh(box(len, 11, 1.6, 2), FM.wall);
      m.position.set(w.X(cx * (R + 0.8)), 4.5, cz * (R + 0.8));
      m.rotation.y = am;
      B.solid(m);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.slab(sx > 0 ? 1.5 : -4.5, sx > 0 ? 4.5 : -1.5, -1, 10, sz > 0 ? R - 1.2 : -R - 2.6, sz > 0 ? R + 2.6 : -R + 1.2, FM.wallDark);
    for (const [x0, x1] of [[-R - 3, -R - 1], [R + 1, R + 3]]) w.slab(x0, x1, -1, 10, -R - 2, R + 2, FM.wallDark);
    ceiling(w, -R - 3, R + 3, -R - 3, R + 3, 10);
    // Isgolvet (bara för synen) och benen efter vargens måltider
    const ice = new THREE.Mesh(new THREE.CircleGeometry(R - 0.5, 40).rotateX(-Math.PI / 2), FM.ice);
    ice.position.set(w.X(0), 0.02, 0);
    w.D.add(ice);
    for (let k = 0; k < 8; k++) {
      const ang = k * 0.9 + 0.3, r = 7 + (k % 3);
      const b = w.deco(cyl(0.12, 0.1, 1.4, 5, 1), FM.bone, Math.cos(ang) * r, 0.1, Math.sin(ang) * r, ang);
      b.rotation.z = Math.PI / 2;
    }
    for (const [x, z] of [[-9, -6], [9, 6], [-6, 9], [6, -9]]) B.lights.add({ x: w.X(x), y: 6, z, color: 0x9fd8ff, power: 9, range: 15, flicker: 0.15 });
    w.inscription(-3.6, R - 1.2, Math.PI, ['A wolf of ice is carved here, jaws wide:', '"Hati chases the moon across the sky, and one day he will catch it."', '"He is too quick for any blade. But a wolf that leaps and misses slides far on the ice."']);
    w.fightBars = ['a_in'];
    w.door({ id: 'a_in', x: 0, z: R + 0.6, type: 'open', neg: 'A0', pos: 'C' });
    w.onConnect.push(() => {
      const ha = new Hati(w.D, w.V(0, 0, 0), R, B.M);
      ha.clearId = 'hati';
      ha.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'awake' && !w.hinted.hati) { w.hinted.hati = true; g.hud.toast('Hati circles, waiting to pounce! Dodge its leap, or block it with the shield.', 4200); }
        if (ev === 'skid' && !w.hinted.skid) { w.hinted.skid = true; g.hud.toast('Hati slides across the ice, dazed! Strike now!', 3000); }
        if (ev === 'blocked' && !w.hinted.blk) { w.hinted.blk = true; g.hud.toast('The shield stops the wolf cold! Strike while it shakes its head!', 3000); }
        if (ev !== 'defeated') return;
        w.bossFight = false;
        w.state.cleared.hati = true;
        w.setBars('a_in', false);
        g.sfx.play('secret');
        g.hud.toast('Hati falls, and the ice where it lay cracks open. Something gleams inside...', 3800);
        g.story.save(true);
      };
      w.bosses.push(ha);
      w.hati = ha;
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || w.state.cleared.hati || !w.hati) return;
      const inner = Math.hypot(p.feet.x - w.X(0), p.feet.z) < R - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('a_in', true);
        w.hati.wake();
        g.hud.card('Hati', 'The wolf that chases the moon');
      }
    });
    w.chest({ id: 'fMask', x: 0, z: 0, face: Math.PI, big: true, item: 'mask', hidden: () => !!w.state.cleared.hati });
    // ---------- norr: rimfrostgallret, klyftan och den stora dörren ----------
    corridor(w, -1.5, 1.5, -22, -R - 1, { h: 4 });
    w.rime('n1', -1.5, 1.5, -17.4, -17.0, 0, 4);
    // Klyftan: golvet tar slut, och fortsätter sju meter längre bort
    w.room('C1', 'The Near Ledge', -6, 6, -30, -22);
    w.room('C2', 'The Far Ledge', -6, 6, -50, -37);
    w.wall('x', -7, 7, -23, -22, [{ c: 0 }], { y1: 8 });
    w.wall('z', -50, -22, -7, -6, [], { y0: -30, y1: 8 });
    w.wall('z', -50, -22, 6, 7, [], { y0: -30, y1: 8 });
    w.wall('x', -7, 7, -51, -50, [{ c: 0 }], { y1: 8 });
    ceiling(w, -7, 7, -51, -22, 8);
    for (let k = 0; k < 7; k++) w.deco(new THREE.ConeGeometry(0.4, 2.5, 5), FM.rime, -5 + k * 1.7, -1.5, -30.2);
    w.inscription(-4.4, -24, Math.PI / 2, ['Beside the chasm, another grinning face:', '"Too far to jump, little hero? Send your shadow over first."', '"Then trade places with it. I do it all the time."', '— L.']);
    crystal(w, -5.4, -28); crystal(w, 5.4, -40); crystal(w, -5.4, -46);
    // Den stora dörren
    corridor(w, -1.5, 1.5, -62, -50, { h: 4 });
    w.door({ id: 'b_throne', x: 0, z: -54, type: 'boss', neg: 'T', pos: 'C2' });
    w.interactions.push({
      label: () => (w.state.bossKey ? 'Unlock with the Frost Key' : 'The great door'), area: w.id, pos: () => w.V(0, 0, -52.4), radius: 1.9,
      ok: () => !w.state.doors.includes('b_throne'),
      run: () => {
        if (w.state.bossKey) {
          w.game.sfx.play('keyturn');
          w.openDoor('b_throne');
          w.game.hud.toast('The Frost Key turns. Beyond, something enormous breathes out, and the air turns to frost.', 3600);
          w.game.story.save(true);
        } else w.game.story.read(['A great door of black ice, carved with a giant holding a hammer.', 'It needs the Frost Key.']);
      },
    });
    w.exit(-1.5, 1.5, -62, -59.5, 'fthrone', 'entrance', { label: 'The Throne of Thrym' });
    w.entry('fromThrone', 0, -57, 0);
    a.map.floor = 'F3';
  });

  // =====================================================================
  // The Throne of Thrym
  // =====================================================================
  mk({ id: 'fthrone', name: 'The Throne of Thrym', sub: 'The king under the ice', H: 22, fog: { color: 0x1a2634, near: 24, far: 130 }, light: { ...LIGHT, hemi: 1.45 } }, 29800, (w, a) => {
    B.bounds(w.ox - 34, w.ox + 34, -34, 40);
    const R = 20;
    w.room('T0', 'The Throne of Thrym', -R, R, -R, R);
    const segs = 28;
    for (let k = 0; k < segs; k++) {
      const am = ((k + 0.5) / segs) * Math.PI * 2, cx = Math.sin(am), cz = Math.cos(am);
      if (cz > 0.985) continue; // ingången i söder
      const m = new THREE.Mesh(box(2 * (R + 1) * Math.sin(Math.PI / segs) + 0.4, 23, 2, 2), FM.wall);
      m.position.set(w.X(cx * (R + 1)), 10.5, cz * (R + 1));
      m.rotation.y = am;
      B.solid(m);
    }
    for (const s of [-1, 1]) w.slab(s > 0 ? 1.5 : -6, s > 0 ? 6 : -1.5, -1, 22, R - 1, R + 3, FM.wallDark);
    w.slab(-R - 3, R + 3, 22, 22.6, -R - 3, R + 3, FM.wallDark);
    const ice = new THREE.Mesh(new THREE.CircleGeometry(R - 0.3, 48).rotateX(-Math.PI / 2), FM.ice);
    ice.position.set(w.X(0), 0.02, 0);
    w.D.add(ice);
    // Tronen av is i norr
    w.slab(-6, 6, 0, 1, -R, -R + 4, FM.wallDark);
    w.deco(box(8, 10, 2, 2), FM.wall, 0, 6, -R + 0.5);
    for (const s of [-1, 1]) w.deco(new THREE.ConeGeometry(1.2, 9, 5), FM.rime, s * 4.6, 5.5, -R + 1.5);
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2;
      B.lights.add({ x: w.X(Math.sin(ang) * (R - 2)), y: 8, z: Math.cos(ang) * (R - 2), color: 0xa8d8ff, power: 12, range: 20, flicker: 0.12 });
    }
    icicles(w, -R, R, -R, R, 22, 30);
    // Ingången i söder
    corridor(w, -1.5, 1.5, R + 1, R + 12, { h: 4 });
    w.entry('entrance', 0, R + 6, Math.PI);
    w.exit(-1.5, 1.5, R + 9.5, R + 12, 'fwolf', 'fromThrone', { label: "Hati's Den" });
    w.fightBars = ['t_in'];
    w.door({ id: 't_in', x: 0, z: R + 0.8, type: 'open', neg: 'T0', pos: 'C' });
    w.onConnect.push(() => {
      const th = new Thrym(w.D, w.V(0, 0, 0), w.V(0, 0, -R + 6), B.M);
      th.clearId = 'thrym';
      th.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'awake') g.story.frost?.thrymWakes?.();
        if (ev === 'stuck' && !w.hinted.stuck) { w.hinted.stuck = true; g.hud.toast('Thrym smashed the shadow! His club is stuck in the ice, and his crown is in reach. Strike the crystal!', 4200); }
        if (ev === 'phase') g.hud.toast('Thrym tears his club free and roars!', 2400);
        if (ev === 'dying') g.story.frost?.thrymFalls?.();
        if (ev !== 'defeated') return;
        w.bossFight = false;
        w.state.cleared.thrym = true;
        g.story.frost?.mawBossDefeated?.();
      };
      w.bosses.push(th);
      w.thrym = th;
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      const th = w.thrym;
      if (!th || frozen || w.state.cleared.thrym) return;
      // Jättens ben: Cello kan inte gå rakt igenom honom
      const dx = p.feet.x - th.pos.x, dz = p.feet.z - th.pos.z, d = Math.hypot(dx, dz);
      if (th.state !== 'gone' && d < 3.2 && d > 0.01) p.nudge((dx / d) * (3.2 - d), (dz / d) * (3.2 - d));
      const inner = Math.hypot(p.feet.x - w.X(0), p.feet.z) < R - 2 && p.feet.z < R - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('t_in', true);
        th.wake();
        g.hud.card('Thrym', 'King of the frost giants, ridden by Kronos');
      }
    });
    w.chest({ id: 'fHeart', x: 0, y: 1, z: -R + 2.5, face: 0, big: true, item: 'heart', hidden: () => !!w.state.cleared.thrym && !!w.game?.story.state.choice4 });
    w.interactions.push({
      label: 'Climb out of the giant', area: w.id, pos: () => w.V(0, 0, R + 4), radius: 2.2,
      ok: () => !!w.state.cleared.thrym && !!w.game?.story.state.choice4 && w.state.chests.includes('fHeart'),
      run: () => w.game.story.frost?.leaveMaw?.(),
    });
    a.map.floor = 'F4';
  });

  return mw.wings;
}

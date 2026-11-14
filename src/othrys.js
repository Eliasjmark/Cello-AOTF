// The Crown of Othrys (0.21): den sista fängelsehålan, inne i titanernas berg. Den prövar allt Cello har lärt
// sig: varje relik öppnar en del av vägen upp till tronen där Kronos väntar.
//
//   The Titans' Stair (ogate)   – förhallen med kolosserna. Raset (hammaren) döljer den lilla nyckeln, och
//                                  stormkristallen (treudden) kartan. Den låsta dörren leder till klyftan, som bara
//                                  går att ta sig över genom att springa längs väggen (sandalerna).
//   The Hall of Chains (ohall)  – titanernas fängelse. Väster: rimfrost och en platta (masken) → nyckel två.
//                                  Öster: ljuset genom taket och mörkrets slöja (prismat) → Titan Key.
//   The Throne of Othrys (othrone) – Kronos under öppen himmel, och tre titanhjärtan som skyddar honom.
//
// Små nycklar: ogate (raset) → dörren mot klyftan. ohall väster → dörren norrut. Titan Key: ohall öster.
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { OthrysWing, Kronos, othrysMats } from './othryskit.js';

export class Crown {
  constructor() {
    this.state = Crown.freshState();
    this.interactions = [];
    this.wings = [];
    this.enemySpots = [];
    this.trap = null;
    this.game = null;
    this.areas = null;
    this.title = 'The Crown of Othrys';
    this.bossKeyName = 'Titan Key';
  }

  static freshState() {
    return { visited: [], keys: 0, map: false, bossKey: false, doors: [], chests: [], cleared: {}, solved: {}, hubs: {}, entered: false };
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
    if (item === 'omap') s.map = true;
    else if (item === 'okey') s.keys++;
    else if (item === 'titankey') s.bossKey = true;
  }

  applyState(saved) {
    const s = (this.state = { ...Crown.freshState(), ...(saved || {}) });
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

export function buildCrown(B, areas, cr) {
  const OM = othrysMats(B.M);
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, indoor: true, ...def });
    B.begin(a);
    const w = new OthrysWing(B, a, cr, { ox, name: def.name, H: def.H ?? 7, floorMat: OM.floor, wallMat: OM.wall, mats: { slab: OM.wallDark, trim: OM.gold, metal: B.M.iron, block: OM.rubble, runes: OM.wallDark } });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    cr.wings.push(w);
    return w;
  };
  const LIGHT = { hemi: 1.2, moon: 0.8, flash: 0, sky: 0xb0a0d0, ground: 0x2a2430, moonColor: 0xd0c0ff };
  const FOG = { color: 0x16121e, near: 18, far: 100 };
  const ceiling = (w, x0, x1, z0, z1, y) => w.slab(x0, x1, y, y + 0.6, z0, z1, OM.wallDark);
  const corridor = (w, x0, x1, z0, z1, o = {}) => {
    const y = o.y ?? 0, h = o.h ?? 4;
    if (o.floor !== false) w.slab(x0, x1, y - 1, y, z0, z1, OM.floor);
    if ((o.along ?? 'z') === 'z') {
      w.slab(x0 - 1, x0, y - 1, y + h, z0, z1);
      w.slab(x1, x1 + 1, y - 1, y + h, z0, z1);
    } else {
      w.slab(x0, x1, y - 1, y + h, z0 - 1, z0);
      w.slab(x0, x1, y - 1, y + h, z1, z1 + 1);
    }
    if (o.ceiling !== false) ceiling(w, x0 - 1, x1 + 1, z0 - (o.along === 'x' ? 1 : 0), z1 + (o.along === 'x' ? 1 : 0), y + h);
  };
  // En lila låga i en skål av brons
  const brazier = (w, x, z, y = 0) => {
    w.deco(cyl(0.45, 0.3, 0.5, 8, 1), OM.gold, x, y + 1.0, z);
    w.deco(cyl(0.12, 0.16, 1.0, 6, 1), OM.wallDark, x, y + 0.5, z);
    const f = w.deco(new THREE.ConeGeometry(0.3, 0.7, 6), OM.vein, x, y + 1.55, z);
    f.userData.noShadow = true;
    B.lights.add({ x: w.X(x), y: y + 1.9, z, color: 0xb88aff, power: 9, range: 12, flicker: 0.35 });
  };
  // En staty av en titan längs väggen
  const titan = (w, x, z, face, s = 1) => {
    w.deco(box(2 * s, 0.8, 2 * s, 1), OM.wallDark, x, 0.4, z);
    w.deco(cyl(0.45 * s, 0.6 * s, 4 * s, 8, 1), OM.marble, x, 0.8 + 2 * s, z);
    w.deco(box(1.6 * s, 1.6 * s, 1.0 * s, 1), OM.marble, x, 0.8 + 4.6 * s, z, face);
    w.deco(new THREE.SphereGeometry(0.6 * s, 10, 8), OM.marble, x, 0.8 + 5.9 * s, z);
    w.B.solid(place(new THREE.Mesh(box(1.4 * s, 4.8 * s, 1.4 * s, 1), OM.wallDark), w.X(x), 0.8 + 2.2 * s, z)).visible = false;
  };

  // =====================================================================
  // The Titans' Stair
  // =====================================================================
  mk({ id: 'ogate', name: "The Titans' Stair", sub: 'Inside the mountain of the titans', H: 9, fog: FOG, light: LIGHT }, 33000, (w, a) => {
    B.bounds(w.ox - 40, w.ox + 40, -90, 34);
    // ---------- förhallen ----------
    const V0 = w.room('V0', 'The Hall of Colossi', -8, 8, 1, 22);
    w.walls(V0, { N: [0], S: [0] }, { y1: 9 });
    ceiling(w, -9, 9, 0, 23, 9);
    corridor(w, -1.5, 1.5, 23, 31, { h: 4 });
    w.entry('entrance', 0, 26, Math.PI);
    w.exit(-1.5, 1.5, 28.5, 31, 'othrys', 'gate', { label: 'Mount Othrys', text: 'Cello climbs back out, between the colossi...' });
    for (const z of [5, 12, 19]) { titan(w, -6.6, z, Math.PI / 2, 0.9); titan(w, 6.6, z, -Math.PI / 2, 0.9); }
    brazier(w, -3.5, 3); brazier(w, 3.5, 3); brazier(w, -3.5, 20); brazier(w, 3.5, 20);
    w.inscription(-2.4, 21.6, Math.PI, ['Carved into the wall, in letters as tall as Cello:', '"Before the gods, the titans. Before the titans, the dark. And the dark will have its crown again."', 'Under it, in a smaller hand: "Every god left something behind. Bring them all."']);
    w.enemy('askling', -3, 12, [[-3, 12], [3, 16]], 'V0');
    w.enemy('askling', 3, 8, [[3, 8], [-2, 6]], 'V0');
    // ---------- Rasets sal ----------
    const G1 = w.room('G1', 'The Hall of Rubble', -12, 12, -26, 0);
    w.walls(G1, { N: [0], S: [0], W: [-13], E: [-13] }, { y1: 9 });
    ceiling(w, -13, 13, -27, 1, 9);
    for (const [x, z] of [[-8, -6], [8, -6], [-8, -20], [8, -20]]) w.pillar(x, z, 0.8, 9);
    brazier(w, 0, -13);
    // Väster: alkoven bakom raset (hammaren) med den lilla nyckeln
    w.room('G2', 'The Fallen Alcove', -20, -13, -17, -9);
    w.wall('x', -21, -12, -18, -17, [], { y1: 6 });
    w.wall('x', -21, -12, -9, -8, [], { y1: 6 });
    w.wall('z', -17, -9, -21, -20, [], { y1: 6 });
    ceiling(w, -21, -12, -18, -8, 6);
    w.rubble('g2', -14.4, -12.4, -15, -11, 0, 4);
    w.chest({ id: 'oKey1', x: -18.4, z: -13, face: Math.PI / 2, item: 'okey' });
    // Öster: alkoven bakom stormkristallen (treudden) med kartan
    w.room('G3', 'The Cursed Alcove', 13, 20, -17, -9);
    w.wall('x', 12, 21, -18, -17, [], { y1: 6 });
    w.wall('x', 12, 21, -9, -8, [], { y1: 6 });
    w.wall('z', -17, -9, 20, 21, [], { y1: 6 });
    ceiling(w, 12, 21, -18, -8, 6);
    w.stormGlass('g3', 12.4, 13.4, -15, -11, 0, 4.2);
    w.chest({ id: 'oMap', x: 18.4, z: -13, face: -Math.PI / 2, item: 'omap' });
    w.inscription(-11.4, -4, Math.PI / 2, ['Scratched into the wall, beside the fallen stones:', '"The roof came down on the day the gods left. The thunder could still move it, if anyone carried the thunder."']);
    w.enemy('shield', -5, -18, [[-5, -18], [5, -18]], 'G1');
    w.enemy('askling', 5, -8, [[5, -8], [-4, -10]], 'G1');
    w.enemy('bat', 0, -20, null, 'g1bats');
    // ---------- norrut: den låsta dörren och klyftan ----------
    corridor(w, -1.5, 1.5, -36, -26, { h: 4 });
    w.door({ id: 'g_chasm', x: 0, z: -31, type: 'key', neg: 'C1', pos: 'G1' });
    // Klyftan: en hylla, 11 meter ingenting, och en hylla till. Längs östra väggen går det att springa.
    const C1 = w.room('C1', 'The Near Ledge', -6, 6, -42, -36);
    w.room('C2', 'The Far Ledge', -6, 6, -70, -53);
    w.wall('x', -7, 7, -37, -36, [{ c: 0 }], { y1: 10 });
    w.wall('z', -70, -36, -7, -6, [], { y0: -34, y1: 10 });
    w.wall('z', -70, -36, 6, 7, [], { y0: -34, y1: 10 });
    w.slab(5.7, 6, 0, 8, -54, -41, OM.marble); // väggen att springa längs (ljus marmor, så att den syns)
    for (let z = -53; z <= -42; z += 2) w.deco(box(0.06, 0.5, 0.9, 1), OM.gold, 5.66, 2.2, z);
    w.wall('x', -7, 7, -71, -70, [{ c: 0 }], { y1: 10 });
    ceiling(w, -7, 7, -71, -36, 10);
    w.slab(-6, 6, -36, -34, -53, -42, OM.wallDark); // klyftans botten (långt ner)
    for (let k = 0; k < 6; k++) w.deco(new THREE.ConeGeometry(0.5, 3, 5), OM.wallDark, -5 + k * 2, -33, -48 + (k % 2) * 3);
    w.inscription(-4.6, -40.5, Math.PI / 2, ['Under a pair of carved wings:', '"Where Hermes ran, the ground is not needed."', '(With the sandals on, run and jump at the wall at an angle, and run along it.)']);
    brazier(w, -4, -38); brazier(w, 4, -68);
    w.enemy('askling', -3, -64, [[-3, -64], [3, -62]], 'C2');
    w.enemy('askling', 3, -60, [[3, -60], [-3, -61]], 'C2');
    // Upp till nästa sal
    corridor(w, -1.5, 1.5, -84, -70, { h: 4 });
    w.exit(-1.5, 1.5, -84, -81.5, 'ohall', 'entrance', { label: 'The Hall of Chains', text: 'The stair winds up through the mountain...' });
    w.entry('fromHall', 0, -77, 0);
    a.map.floor = 'F1';
  });

  // =====================================================================
  // The Hall of Chains
  // =====================================================================
  mk({ id: 'ohall', name: 'The Hall of Chains', sub: 'Where the titans were chained', H: 10, fog: FOG, light: LIGHT }, 33700, (w, a) => {
    B.bounds(w.ox - 50, w.ox + 50, -70, 34);
    const H0 = w.room('H0', 'The Hall of Chains', -14, 14, -24, 0);
    w.walls(H0, { N: [0], S: [0], W: [-12], E: [-12] }, { y1: 10 });
    ceiling(w, -15, 15, -25, 1, 10);
    // Kedjor som hänger från taket, och fyra tomma bojor i golvet
    for (const [x, z] of [[-8, -6], [8, -6], [-8, -18], [8, -18]]) {
      w.pillar(x, z, 0.9, 10);
      for (let k = 0; k < 6; k++) w.deco(new THREE.TorusGeometry(0.22, 0.06, 4, 10), B.M.iron, x + (x > 0 ? -1.2 : 1.2), 9.4 - k * 0.38, z).rotation.y = k % 2 ? Math.PI / 2 : 0;
      w.deco(new THREE.TorusGeometry(0.5, 0.12, 6, 16).rotateX(Math.PI / 2), B.M.iron, x + (x > 0 ? -1.2 : 1.2), 0.1, z);
    }
    brazier(w, -4, -2); brazier(w, 4, -2); brazier(w, -4, -22); brazier(w, 4, -22);
    w.inscription(-2.6, -0.6, Math.PI, ['Carved over the door:', '"Here the gods chained the titans, and here the titans waited, ten thousand years."', '"Patience is a titan\'s weapon. Kronos had the most of all."']);
    corridor(w, -1.5, 1.5, 1, 22, { h: 4 });
    w.entry('entrance', 0, 16, Math.PI);
    w.exit(-1.5, 1.5, 19.5, 22, 'ogate', 'fromHall', { label: "The Titans' Stair" });
    w.enemy('askling', -5, -10, [[-5, -10], [5, -14]], 'H0');
    w.enemy('shield', 5, -16, [[5, -16], [-5, -16]], 'H0');
    w.enemy('askling', 0, -20, [[0, -20], [6, -8]], 'H0');
    // ---------- väster: rimfrosten och plattan (masken) ----------
    corridor(w, -24, -15, -13.5, -10.5, { along: 'x', h: 4 });
    const W1 = w.room('W1', 'The Frozen Cell', -38, -24, -20, -4);
    w.walls(W1, { E: [-12], N: [-27] }, { y1: 7 });
    ceiling(w, -39, -23, -21, -3, 7);
    w.rime('w1', -31.2, -30.8, -20, -4, 0, 7);
    w.pressurePlate('w1plate', -37.0, -12, {
      onChange: (on) => {
        if (!on || w.state.doors.includes('w_key')) return;
        w.openDoor('w_key');
        w.game.sfx.play('secret');
        w.game.hud.toast('The shadow presses the plate down. A door grinds open in the north wall!', 3400);
        w.game.story.save(true);
      },
    });
    w.door({ id: 'w_key', x: -27, z: -20.5, type: 'plate', neg: 'W2', pos: 'W1', text: ["The door won't budge.", 'A plate is set into the floor beyond the rime. Something heavy must stand on it.'] });
    w.room('W2', 'The Key Cell', -30, -24, -28, -21);
    w.wall('x', -31, -23, -29, -28, [], { y1: 5 });
    w.wall('z', -28, -21, -31, -30, [], { y1: 5 });
    w.wall('z', -28, -21, -24, -23, [], { y1: 5 });
    ceiling(w, -31, -23, -29, -20, 5);
    w.chest({ id: 'oKey2', x: -27, z: -26, face: 0, item: 'okey' });
    w.inscription(-25.4, -6, -Math.PI / 2, ['A grinning horned face is scratched into the ice:', '"Locked in with the titans, were you? I was too, once. Shadows make the best friends."', '— L.']);
    brazier(w, -27, -18);
    // ---------- öster: ljuset och slöjan (prismat) ----------
    corridor(w, 15, 22, -13.5, -10.5, { along: 'x', h: 4 });
    const E1 = w.room('E1', 'The Hall of Light', 22, 38, -22, -2);
    w.walls(E1, { W: [-12], N: [30], S: [24] }, { y1: 10 });
    ceiling(w, 21, 31, -23, -1, 10);
    ceiling(w, 33, 39, -23, -1, 10);
    ceiling(w, 31, 33, -23, -14, 10);
    ceiling(w, 31, 33, -10, -1, 10);
    w.skylight('e1', 32, -12, 1.5, { h: 10 });
    w.veil('e1', 28.8, 31.2, -22.6, -22.2, 0, 4);
    w.inscription(37.4, -8, -Math.PI / 2, ['Carved under a sun with a broken face:', '"The dark of Kronos drinks every light but one: the light the sun god gave away."', '(Stand in the light from above, hold up the prism, and turn it toward the dark.)']);
    w.room('E2', 'The Vault of the Crown', 26, 34, -32, -23);
    w.wall('x', 25, 35, -33, -32, [], { y1: 6 });
    w.wall('z', -32, -23, 25, 26, [], { y1: 6 });
    w.wall('z', -32, -23, 34, 35, [], { y1: 6 });
    ceiling(w, 25, 35, -33, -22, 6);
    w.chest({ id: 'oBossKey', x: 30, z: -29, face: 0, big: true, item: 'titankey' });
    // en till stormkristall i hörnet, med skärvor bakom
    w.stormGlass('e3', 22.6, 25.4, -2, -1, 0, 4);
    w.room('E3', 'The Shard Niche', 22.5, 25.5, -1, 3);
    w.wall('x', 21.5, 26.5, 3, 4, [], { y1: 5 });
    w.wall('z', -1, 3, 21.5, 22.5, [], { y1: 5 });
    w.wall('z', -1, 3, 25.5, 26.5, [], { y1: 5 });
    ceiling(w, 21.5, 26.5, -1, 4, 5);
    w.chest({ id: 'oShards', x: 24, z: 1.8, face: Math.PI, shards: 60 });
    w.enemy('bat', 26, -8, [[24, -6], [36, -18]], 'e1bats');
    w.enemy('shield', 34, -6, [[34, -6], [26, -18]], 'E1');
    // ---------- norrut: den låsta dörren och den stora porten ----------
    corridor(w, -1.5, 1.5, -48, -24, { h: 4 });
    w.door({ id: 'h_north', x: 0, z: -29, type: 'key', neg: 'N1', pos: 'H0' });
    w.room('N1', 'The Last Landing', -6, 6, -60, -48);
    w.walls(w.rooms.N1, { S: [0], N: [0] }, { y1: 8 });
    ceiling(w, -7, 7, -61, -47, 8);
    brazier(w, -4, -50); brazier(w, 4, -50);
    titan(w, -4.6, -57, Math.PI / 2, 0.8); titan(w, 4.6, -57, -Math.PI / 2, 0.8);
    corridor(w, -1.5, 1.5, -70, -60, { h: 4 });
    w.door({ id: 'b_throne', x: 0, z: -62, type: 'boss', neg: 'T', pos: 'N1' });
    w.interactions.push({
      label: () => (w.state.bossKey ? 'Unlock with the Titan Key' : 'The great door'), area: w.id, pos: () => w.V(0, 0, -60.4), radius: 1.9,
      ok: () => !w.state.doors.includes('b_throne'),
      run: () => {
        if (w.state.bossKey) {
          w.game.sfx.play('keyturn');
          w.openDoor('b_throne');
          w.game.hud.toast('The Titan Key turns. Wind howls down the stair, and somewhere above, thunder answers.', 3800);
          w.game.story.save(true);
        } else w.game.story.read(['A great door of black stone, carved with a king holding a sickle, eating his own children.', 'It needs the Titan Key.']);
      },
    });
    w.exit(-1.5, 1.5, -70, -67.5, 'othrone', 'entrance', { label: 'The Throne of Othrys', text: 'Cello climbs the last stair, up into the storm...' });
    w.entry('fromThrone', 0, -65, 0);
    a.map.floor = 'F2';
  });

  // =====================================================================
  // The Throne of Othrys (under öppen himmel)
  // =====================================================================
  mk({ id: 'othrone', name: 'The Throne of Othrys', sub: 'The summit of the world', H: 24, fog: { color: 0x2a2236, near: 30, far: 160 }, light: { hemi: 1.3, moon: 1.0, flash: 1.6, sky: 0x9a8ab8, ground: 0x2a2430, moonColor: 0xd0c0ff } }, 34600, (w, a) => {
    a.indoor = false; // himlen syns, och blixten
    B.bounds(w.ox - 40, w.ox + 40, -40, 46);
    const R = 22;
    w.room('T0', 'The Throne of Othrys', -R, R, -R, R);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 1, 48).rotateX(-Math.PI / 2), OM.marble);
    floor.position.set(w.X(0), 0.02, 0);
    w.D.add(floor);
    // En ring av mosaik och Kronos tecken (en skära) i golvet
    w.deco(new THREE.RingGeometry(R - 3, R - 2.4, 48).rotateX(-Math.PI / 2), OM.gold, 0, 0.04, 0);
    w.deco(new THREE.RingGeometry(6, 6.4, 40, 1, Math.PI * 0.1, Math.PI * 1.3).rotateX(-Math.PI / 2), OM.vein, 0, 0.05, -4);
    // Kanten: en låg mur och brutna kolonner, och himlen utanför
    const segs = 30;
    for (let k = 0; k < segs; k++) {
      const am = ((k + 0.5) / segs) * Math.PI * 2, cx = Math.sin(am), cz = Math.cos(am);
      if (cz > 0.985) continue;
      const m = new THREE.Mesh(box(2 * (R + 1) * Math.sin(Math.PI / segs) + 0.4, 2.2, 1.4, 2), OM.wall);
      m.position.set(w.X(cx * (R + 0.8)), 1.1, cz * (R + 0.8));
      m.rotation.y = am;
      B.solid(m);
      // Osynlig hög vägg så att ingen faller ner från toppen
      const inv = new THREE.Mesh(box(2 * (R + 1) * Math.sin(Math.PI / segs) + 0.4, 12, 1.4, 2), OM.wall);
      inv.position.copy(m.position).setY(6);
      inv.rotation.y = am;
      B.solid(inv).visible = false;
      if (k % 3 === 0) {
        const hgt = 5 + (k % 4) * 2.5;
        w.deco(cyl(0.7, 0.8, hgt, 10, 2), OM.marble, cx * (R + 0.8), hgt / 2, cz * (R + 0.8));
      }
    }
    for (const s of [-1, 1]) w.slab(s > 0 ? 1.5 : -6, s > 0 ? 6 : -1.5, -1, 2.2, R - 0.2, R + 2.5, OM.wallDark);
    // Tronen i norr: svart sten, hög rygg, och en krona av spetsar
    w.slab(-7, 7, 0, 1, -R, -R + 5, OM.wallDark);
    w.deco(box(9, 12, 2, 2), OM.wallDark, 0, 7, -R + 0.6);
    for (let k = -3; k <= 3; k++) w.deco(new THREE.ConeGeometry(0.6, 4 + (3 - Math.abs(k)) * 1.2, 5), OM.wallDark, k * 1.3, 13 + (3 - Math.abs(k)) * 0.6, -R + 0.6);
    w.deco(new THREE.OctahedronGeometry(1, 0), OM.vein, 0, 11, -R + 1.7);
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      B.lights.add({ x: w.X(Math.sin(ang) * (R - 3)), y: 5, z: Math.cos(ang) * (R - 3), color: 0xc0a0ff, power: 10, range: 18, flicker: 0.3 });
    }
    // Ingången i söder: trappan upp
    corridor(w, -1.5, 1.5, R + 1, R + 14, { h: 4 });
    w.entry('entrance', 0, R + 7, Math.PI);
    w.exit(-1.5, 1.5, R + 11.5, R + 14, 'ohall', 'fromThrone', { label: 'The Hall of Chains' });
    w.fightBars = ['t_in'];
    w.door({ id: 't_in', x: 0, z: R + 0.8, type: 'open', neg: 'T0', pos: 'C' });
    const frostSpots = [w.V(-13, 0, 5), w.V(13, 0, 5)];
    w.onConnect.push((c) => {
      const kr = new Kronos(w.D, w.V(0, 0, 0), w.V(0, 0, -11), { R, frostSpots });
      kr.connect(c);
      kr.clearId = 'kronos';
      kr.onEvent = (ev, b, core) => {
        const g = w.game;
        if (ev === 'awake') g.story.othrys?.kronosWakes?.();
        if (ev === 'core' && !w.hinted[`core${core.kind}`]) {
          w.hinted[`core${core.kind}`] = true;
          const left = kr.cores.filter((q) => q.alive).length;
          g.hud.toast(left ? `The ${core.kind} heart shatters! ${left} left.` : 'The last titan heart shatters!', 2600);
        }
        if (ev === 'kneel') g.hud.toast('Kronos falls to his knees! The crystal in his chest is in reach. Strike it!', 3600);
        if (ev === 'recover') g.hud.toast('Kronos rises again...', 2000);
        if (ev === 'phase') g.story.othrys?.kronosPhase?.(kr.phaseN);
        if (ev === 'dying') g.story.othrys?.kronosFalls?.();
        if (ev !== 'defeated') return;
        w.bossFight = false;
        w.state.cleared.kronos = true;
        g.story.othrys?.kronosDefeated?.();
      };
      w.bosses.push(kr, ...kr.cores);
      w.kronos = kr;
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      const kr = w.kronos;
      if (!kr || frozen || w.state.cleared.kronos) return;
      // Jättens mantel: Cello kan inte gå rakt igenom honom
      const dx = p.feet.x - kr.pos.x, dz = p.feet.z - kr.pos.z, d = Math.hypot(dx, dz);
      if (kr.state !== 'gone' && d < 3.8 && d > 0.01) p.nudge((dx / d) * (3.8 - d), (dz / d) * (3.8 - d));
      const inner = Math.hypot(p.feet.x - w.X(0), p.feet.z) < R - 2 && p.feet.z < R - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('t_in', true);
        kr.wake();
        g.hud.card('Kronos', 'King of the Titans, Lord of Time');
      }
    });
    w.interactions.push({
      label: 'Climb down the mountain', area: w.id, pos: () => w.V(0, 0, R + 4), radius: 2.2,
      ok: () => !!w.state.cleared.kronos && !!w.game?.story.state.ending,
      run: () => w.game.story.travel('othrys', 'gate', { walk: false, text: 'Cello climbs down from the summit...' }),
    });
    a.map.floor = 'F3';
  });

  return cr.wings;
}

// The Sun-Scorched Pyramid, del 2–5 (0.10): pyramiden blev fem gånger så stor. Den gamla delen är första våningen.
// Härifrån leder trappor och dörrar till fyra nya områden (ingen dimma, bara en övertoning):
//
//   The Sunken Galleries (pdepths)      – under Spegelgalleriet. Solkristallen som delar ljuset, speglar på stenblock,
//                                         sandfloden över schaktet och balsamerarnas mörka valv.
//   The Hall of the Sun Barque (pbarque) – solbåtens sal (fällrum i tre vågor), timmarnas sal där en spegel vrider sig
//                                         själv som en solvisare, och Solväktaren.
//   The Inner Ascent (pascent)          – rampen där stenkulor rullar och timglaset som flyttar sanden mellan groparna.
//   The Apex of Ra (papex)              – pyramidens topp: fyra solögon på en gång, Solnyckeln och ljusrännan ner.
//
// Små nycklar: K1 (glidande speglar) → dörren till sandfloden · K2 (sandfloden) → valvets norra dörr
//              K3 (timglasets skattkammare) → dörren upp till toppen. Solnyckeln ligger högst upp.
import * as THREE from 'three';
import { box, cyl, place, hash2 } from './geom.js';
import { SunWing, SunGuardian } from './sunkit.js';

// De glidande speglarna: strålen kommer in från väster på rad `row` och ska lämna rutnätet österut på rad `exitRow`,
// där ögat sitter i östra väggen (hittat och kontrollerat med en lösare, se tools/puzzles)
export const MIRROR_PUZZLE = {
  cols: 9, rows: 7, row: 5, exitRow: 1,
  walls: [[0, 4], [1, 1], [2, 3], [3, 6], [4, 2], [5, 4], [7, 3]],
  mirrors: [[[1, 4], 1], [[4, 0], 1]],
  stones: [[3, 5], [6, 1], [6, 3]],
};

// Kristallen på toppen: ett stenblock med en solkristall som ska skjutas till (5, 3), raden rensas från sten
export const APEX_PUZZLE = {
  cols: 10, rows: 4,
  walls: [[2, 2], [3, 0], [7, 1], [8, 2]],
  crystal: [1, 1],
  stones: [[4, 3], [5, 0], [5, 2], [6, 3]],
  target: [5, 3],
};

export function buildPyramidWings(B, areas, pyramid) {
  const M = B.M;
  const wings = [];
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, ...def });
    B.begin(a);
    const w = new SunWing(B, a, pyramid, { ox, name: def.name });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    wings.push(w);
    return w;
  };
  const SAND_LIGHT = { hemi: 0.95, moon: 0.5, flash: 0, sky: 0xa88a64, ground: 0x34241a, moonColor: 0xe0b880 };
  // Trappa ut ur en sal (lokala koordinater): golv och två väggar
  const stair = (w, x, z0, z1, y = 0) => {
    w.slab(x - 1.5, x + 1.5, y - 1, y, z0, z1, w.floorMat);
    w.wall('z', z0, z1, x - 2.5, x - 1.5, [], { y0: y - 1, y1: y + 6 });
    w.wall('z', z0, z1, x + 1.5, x + 2.5, [], { y0: y - 1, y1: y + 6 });
  };
  const lotus = (w, x, z, y = 0, h = 6.7) => B.lotusColumn(w.X(x), y - 0.1, z, h, false);

  // =====================================================================
  // The Sunken Galleries
  // =====================================================================
  mk({
    id: 'pdepths', name: 'The Sunken Galleries', sub: 'Beneath the Sun-Scorched Pyramid', indoor: true, dark: true,
    fog: { color: 0x140e08, near: 16, far: 95 }, light: { hemi: 0.8, moon: 0.4, flash: 0, sky: 0x9a7a58, ground: 0x2a1c12, moonColor: 0xd0a870 },
  }, 12000, (w, a) => {
    B.bounds(w.ox - 44, w.ox + 54, -74, 20);
    const s = () => w.state;
    const G0 = w.room('G0', 'Stair Landing', -4, 4, 0, 10, { floor: 'B1' });
    const G1 = w.room('G1', 'Hall of the Split Sun', -16, 16, -32, -2, { floor: 'B1' });
    const G2 = w.room('G2', 'Gallery of Sliding Mirrors', -42, -18, -26, -4, { floor: 'B1' });
    const G3 = w.room('G3', 'River of Sand', 18, 50, -28, -4, { floor: 'B1', floorSlab: false });
    const G4 = w.room('G4', "Embalmers' Vault", -14, 14, -60, -34, { floor: 'B1' });
    w.walls(G0, { N: [0], S: [{ c: 0, w: 3 }] });
    w.walls(G1, { S: [0], W: [-16], E: [-16], N: [0] });
    w.walls(G2, { E: [-16] });
    w.walls(G3, { W: [-16] }, { y0: -16 });
    w.walls(G4, { S: [0], N: [0] });
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.slab(-18, -16, -1, 0, -17.2, -14.8, w.floorMat);
    w.slab(16, 18, -1, 0, -17.2, -14.8, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -34, -32, w.floorMat);
    stair(w, 0, 10, 17);
    for (let i = 0; i < 4; i++) w.slab(-1.5, 1.5, 0, 0.18 + i * 0.18, 13 + i * 0.9, 13.9 + i * 0.9, M.sandstoneDark, 1);
    stair(w, 0, -68, -61);
    w.entry('entrance', 0, 8, Math.PI);
    w.entry('fromBarque', 0, -57, 0);
    w.exit(-2, 2, 14.5, 20, 'pyramid', 'fromDepths', { label: 'The Sun-Scorched Pyramid' });
    w.exit(-2, 2, -72, -64.5, 'pbarque', 'entrance', { label: 'The Hall of the Sun Barque' });
    // ---------- dörrar ----------
    w.door({ id: 'gS', x: 0, z: -1, axis: 'z', type: 'open', neg: 'G1', pos: 'G0' });
    w.door({ id: 'gW', x: -17, z: -16, axis: 'x', type: 'open', neg: 'G2', pos: 'G1' });
    w.door({ id: 'gE', x: 17, z: -16, axis: 'x', type: 'key', neg: 'G1', pos: 'G3' });
    w.door({
      id: 'gN', x: 0, z: -33, axis: 'z', type: 'circuit', neg: 'G4', pos: 'G1',
      text: ['Two sun eyes are carved into the door, one on each side.', 'They seem to be waiting for the same light at the same moment.'],
    });
    w.door({ id: 'gX', x: 0, z: -61, axis: 'z', type: 'key', neg: null, pos: 'G4' });

    // ---------- Den kluvna solens sal (G1) ----------
    // Fönstret i öster → spegel → solkristallen delar ljuset → två speglar → två ögon som måste lysa samtidigt
    w.window('g1w', 15.88, -6, [-1, 0], { room: 'G1' });
    w.mirror('g1ma', -4, -6, 0, { room: 'G1' });
    w.splitter('g1s', -4, -20, { room: 'G1' });
    w.mirror('g1mw', -12, -20, 1, { room: 'G1' });
    w.mirror('g1me', 8, -20, 3, { room: 'G1' });
    w.mirror('g1me2', 8, -26, 2, { room: 'G1' });
    const eW = w.eye('g1ew', -12, -31.85, 0, { hold: true, room: 'G1' });
    const eE = w.eye('g1ee', 15.85, -26, -Math.PI / 2, { hold: true, room: 'G1' });
    w.onUpdate.push((dt, p, g) => {
      if (s().solved.g1 || !eW.on || !eE.on) return;
      s().solved.g1 = true;
      w.openDoor('gN');
      g.sfx.play('secret');
      g.hud.toast('Both eyes drink the split sun at once. The northern door rises!', 3600);
      g.story.save(true);
    });
    for (const [x, z] of [[-10, -10], [10, -10], [-10, -28], [10, -28]]) lotus(w, x, z);
    for (const [x, z] of [[-14.5, -3.5], [14.5, -3.5], [-14.5, -30.5], [14.5, -30.5], [-3, 8], [3, 8]]) w.brazier(x, z);
    w.inscription(6, -3.2, Math.PI, ['Carved into the sandstone:', '"The crystal of Ra gives back every ray twice: once to the left hand, once to the right."']);
    w.enemy('askling', -8, -12, [[-8, -12], [-8, -26]], 'G1');
    w.enemy('askling', 11, -14, [[11, -14], [4, -14]], 'G1');
    w.enemy('bat', 0, -24, null, 'G1');

    // ---------- De glidande speglarna (G2) ----------
    const P = MIRROR_PUZZLE, GX = -38, GZ = -22;
    const cellX = (c) => GX + c * 2, cellZ = (r) => GZ + r * 2;
    w.blockGrid('gm', GX, GZ, P.cols, P.rows, P.walls);
    P.mirrors.forEach(([[c, r], t], i) => w.mirrorBlock(`gmm${i}`, 'gm', c, r, t));
    P.stones.forEach(([c, r], i) => w.pushBlock(`gms${i}`, 'gm', c, r));
    w.window('g2w', -41.88, cellZ(P.row), [1, 0], { room: 'G2' });
    w.cage('k1', -19.6, -24.4);
    w.chest({ id: 'gK1', x: -19.6, z: -24.4, face: Math.PI / 2, item: 'pkey', cage: 'k1' });
    w.eye('g2e', -18.15, cellZ(P.exitRow), -Math.PI / 2, {
      room: 'G2', onLit: () => {
        s().solved['blocks:gm'] = true;
        s().blocks = s().blocks || {};
        s().blocks.gm = Object.fromEntries(w.blocks.filter((b) => b.g.id === 'gm').map((b) => [b.id, [b.c, b.r]]));
        w.openCage('k1');
        w.game?.hud.toast('The light finds the eye! The golden cage in the corner rises.', 3400);
      },
    });
    w.deco(box(0.3, 1.0, 0.6, 1), M.goldPlate, -18.4, 1.2, -8);
    w.interactions.push({
      label: 'Pull the lever', area: w.id, pos: () => w.V(-19.2, 0, -8), radius: 1.5,
      ok: () => !s().solved['blocks:gm'],
      run: () => { w.resetBlocks('gm'); w.game.sfx.play('stonegrind'); w.game.hud.toast('The stones grind back to where they started.', 2600); },
    });
    w.inscription(-19.2, -12, -Math.PI / 2, ['Carved into the sandstone:', '"The mirrors of the deep are set in stone. Only the weight of thunder moves them, and stone does not come back."', '(A lever by the door returns the stones to their places.)']);
    for (const [x, z] of [[-40.5, -5.5], [-19.5, -5.5]]) w.brazier(x, z);
    w.enemy('bat', -26, -8, null, 'G2');

    // ---------- Sandfloden (G3) ----------
    // Fast sten väster och öster, emellan en gång av sten och lös sand. Sanden rinner söderut mot schaktet i stötar.
    w.slab(18, 22, -1, 0, -28, -4, w.floorMat);
    w.slab(46, 50, -1, 0, -28, -4, w.floorMat);
    const stone = [[22, 26], [32, 35], [41, 43]], sand = [[26, 32], [35, 41], [43, 46]];
    for (const [x0, x1] of stone) w.slab(x0, x1, -1, 0, -28, -20, w.floorMat);
    for (const [x0, x1] of sand) {
      const n = Math.max(1, Math.round((x1 - x0) / 2)), dx = (x1 - x0) / n;
      for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) w.crackTile(x0 + i * dx, x0 + (i + 1) * dx, -28 + k * 2, -26 + k * 2, 0, { sand: true, mat: M.sandRock });
    }
    w.wind(22, 46, -28, -4, [0, 1], { sand: true, strength: 9.5, period: 3.4, on: 0.45, y0: -1, y1: 4, floor: 0 });
    w.sandfall('sf1', 24, -25.5, 1.4, { period: 3.8, on: 1.4, phase: 0 });
    w.sandfall('sf2', 33.5, -25, 1.2, { period: 3.8, on: 1.4, phase: 1.3 });
    w.sandfall('sf3', 42, -24.5, 1.0, { period: 3.8, on: 1.4, phase: 2.6 });
    w.chest({ id: 'gK2', x: 48, z: -16, face: -Math.PI / 2, item: 'pkey' });
    w.inscription(20, -26.8, Math.PI, ['Carved into the sandstone:', '"The river of sand runs to the abyss. Stand heavy on stone, never on sand."']);
    w.brazier(19.5, -5.5);
    w.brazier(48.5, -5.5);
    // Sanden som rinner ner i schaktet
    const fallMat = new THREE.MeshLambertMaterial({ color: 0xc8a070 });
    for (let i = 0; i < 6; i++) w.deco(box(4, 0.1, 1.2, 1), fallMat, 24 + i * 4, -0.6 - hash2(i, 3) * 0.2, -19.4);

    // ---------- Balsamerarnas valv (G4) ----------
    w.shaft('g4s', 0, -47, 1.4, { room: 'G4' });
    const T = [[-11, -37], [11, -37], [-11, -57], [11, -57]].map(([x, z], i) => w.torch(`vault${i}`, x, z));
    w.cage('k4', 10.5, -51);
    w.chest({ id: 'gV', x: 10.5, z: -51, face: -Math.PI / 2, shards: 20, cage: 'k4' });
    w.onTorch = () => {
      const st = w.game.story.state.torches;
      if (T.every((t) => st[t.id]) && !s().solved['cage:k4']) {
        w.openCage('k4');
        w.game.hud.toast('The fourth flame catches. The cage of the embalmers rises.', 3400);
        w.game.story.save(true);
      }
    };
    w.trapRoom('tG4', 'G4', ['gN', 'gX'], ['G4a', 'G4b', 'G4c'], () => w.game?.hud.toast('The last of the embalmed dead crumbles to dust.', 3000));
    w.traps[0].text = 'The bars slam shut! The embalmed dead stir in the dark!';
    w.enemy('shade', -6, -42, [[-6, -42], [-6, -52]], 'G4a', { dormant: true, room: 'G4' });
    w.enemy('shade', 6, -52, [[6, -52], [6, -42]], 'G4a', { dormant: true, room: 'G4' });
    w.enemy('askling', -8, -55, [[-8, -55], [8, -55]], 'G4b', { dormant: true, room: 'G4' });
    w.enemy('askling', 8, -40, [[8, -40], [-8, -40]], 'G4b', { dormant: true, room: 'G4' });
    w.enemy('shade', 0, -56, [[0, -56], [0, -40]], 'G4b', { dormant: true, room: 'G4' });
    for (const [x, z] of [[-6, -48], [6, -44], [0, -38]]) w.enemy('bat', x, z, null, 'G4c', { dormant: true, room: 'G4' });
    w.enemy('shade', -8, -50, [[-8, -50], [8, -50]], 'G4c', { dormant: true, room: 'G4' });
    w.inscription(-5, -35.2, Math.PI, ['Carved into the sandstone:', '"The embalmers worked by four flames. Shadow fears the light from above."']);
    // Sarkofager längs väggarna
    for (const [x, z] of [[-11.5, -44], [-11.5, -50], [11.5, -44]]) {
      const g = B.groupAt(w.X(x), 0, z, Math.PI / 2);
      B.put(g, new THREE.Mesh(box(1.2, 0.9, 2.6, 1), M.sandstoneDark), 0, 0.45, 0, true);
      B.put(g, new THREE.Mesh(box(1.1, 0.25, 2.4, 1), M.goldPlate), 0, 1.0, 0);
    }
    for (const [x, z] of [[-14.5 + 1, -31], [14.5 - 1, -31], [-38.5, -24.5], [47.5, -27], [-12.6, -58.6]]) B.pot(w.X(x), 0, z, 1);
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Hall of the Sun Barque
  // =====================================================================
  mk({
    id: 'pbarque', name: 'The Hall of the Sun Barque', sub: 'Where Ra sailed through the night', indoor: true,
    fog: { color: 0x1a120a, near: 18, far: 110 }, light: SAND_LIGHT,
  }, 12500, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -110, 20);
    const s = () => w.state;
    const B0 = w.room('B0', 'Barque Landing', -4, 4, 0, 10, { floor: 'B2' });
    const B1 = w.room('B1', 'Hall of the Sun Barque', -16, 16, -34, -2, { floor: 'B2' });
    const B2 = w.room('B2', 'Hall of Hours', -14, 14, -64, -36, { floor: 'B2' });
    const B3 = w.room('B3', "Guardian's Court", -14, 14, -94, -66, { floor: 'B2' });
    w.walls(B0, { N: [0], S: [{ c: 0, w: 3 }] });
    w.walls(B1, { S: [0], N: [-8] });
    w.walls(B2, { S: [-8], N: [8] });
    w.walls(B3, { S: [8], N: [0] });
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.slab(-9.2, -6.8, -1, 0, -36, -34, w.floorMat);
    w.slab(6.8, 9.2, -1, 0, -66, -64, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -96, -94, w.floorMat);
    stair(w, 0, 10, 17);
    stair(w, 0, -103, -96);
    w.entry('entrance', 0, 8, Math.PI);
    w.entry('fromAscent', 0, -91, 0);
    w.exit(-2, 2, 14.5, 20, 'pdepths', 'fromBarque', { label: 'The Sunken Galleries' });
    w.exit(-2, 2, -108, -100, 'pascent', 'entrance', { label: 'The Inner Ascent' });
    w.door({ id: 'b01', x: 0, z: -1, axis: 'z', type: 'open', neg: 'B1', pos: 'B0' });
    w.door({ id: 'b12', x: -8, z: -35, axis: 'z', type: 'open', neg: 'B2', pos: 'B1' });
    w.door({
      id: 'b23', x: 8, z: -65, axis: 'z', type: 'circuit', neg: 'B3', pos: 'B2',
      text: ['The door bears three sun eyes: north, east and south.', 'All three must be awake.'],
    });
    w.door({
      id: 'b3x', x: 0, z: -95, axis: 'z', type: 'circuit', neg: null, pos: 'B3',
      text: ['The door is sealed with the golden sun of the guardian.', 'It will not open while its keeper stands.'],
    });

    // ---------- Solbåtens sal (B1): fällrum i tre vågor ----------
    // Solbåten mitt i salen
    B.solid(place(new THREE.Mesh(box(5, 1.6, 16, 2), M.wood), w.X(0), 0.8, -18));
    B.solid(place(new THREE.Mesh(box(3, 2.6, 2, 1), M.wood), w.X(0), 1.3, -27));
    B.solid(place(new THREE.Mesh(box(3, 2.2, 2, 1), M.wood), w.X(0), 1.1, -9));
    for (const sx of [-1, 1]) w.deco(box(0.2, 0.3, 16, 2), M.goldPlate, sx * 2.5, 1.5, -18);
    w.deco(box(0.3, 5, 0.3, 1), M.wood, 0, 4.1, -18);
    const disc = new THREE.Mesh(cyl(1.3, 1.3, 0.12, 18, 1), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
    disc.rotation.x = Math.PI / 2;
    disc.position.set(w.X(0), 6.6, -18);
    w.D.add(disc);
    w.shaft('b1sw', -9, -18, 1.3, { room: 'B1' });
    w.shaft('b1se', 9, -18, 1.3, { room: 'B1' });
    w.trapRoom('tB1', 'B1', ['b01', 'b12'], ['B1a', 'B1b', 'B1c'], () => w.game?.hud.toast('The barque is quiet again. Something glints at its prow.', 3000));
    w.traps[0].text = 'The bars slam shut! The crew of the barque wakes!';
    w.chest({ id: 'bB1', x: 0, z: -30.2, face: Math.PI, shards: 15, hidden: () => !!s().cleared.tB1 });
    for (const [x, z] of [[-8, -10], [8, -10], [-6, -30]]) w.enemy('askling', x, z, [[x, z], [x, z - 10]], 'B1a', { dormant: true, room: 'B1' });
    w.enemy('shield', -11, -26, [[-11, -26], [-11, -8]], 'B1b', { dormant: true, room: 'B1' });
    w.enemy('shield', 11, -26, [[11, -26], [11, -8]], 'B1b', { dormant: true, room: 'B1' });
    w.enemy('askling', 0, -6, [[-6, -6], [6, -6]], 'B1b', { dormant: true, room: 'B1' });
    w.enemy('shade', -9, -14, [[-9, -14], [-9, -24]], 'B1c', { dormant: true, room: 'B1' });
    w.enemy('shade', 9, -22, [[9, -22], [9, -12]], 'B1c', { dormant: true, room: 'B1' });
    w.enemy('bat', -4, -24, null, 'B1c', { dormant: true, room: 'B1' });
    w.enemy('bat', 4, -12, null, 'B1c', { dormant: true, room: 'B1' });
    for (const [x, z] of [[-14.5, -3.5], [14.5, -3.5], [-14.5, -32.5], [14.5, -32.5], [-3, 8], [3, 8]]) w.brazier(x, z);
    w.inscription(6, -3.2, Math.PI, ['Carved into the sandstone:', '"Each night the barque of Ra sails through the dark. Its crew never sleeps for long."']);

    // ---------- Timmarnas sal (B2): solvisaren ----------
    w.window('b2w', -13.88, -50, [1, 0], { room: 'B2' });
    const rotM = w.mirror('b2m', 0, -50, 1, { room: 'B2', locked: true });
    const brake = w.pressurePlate('b2brake', -8, -42);
    w.rotor(rotM, brake, { step: 0.75 });
    const eyes = [
      w.eye('b2en', 0, -63.85, 0, { room: 'B2' }),
      w.eye('b2ee', 13.85, -50, -Math.PI / 2, { room: 'B2' }),
      w.eye('b2es', 0, -36.15, Math.PI, { room: 'B2' }),
    ];
    w.veil('b2vn', 0, -61, 'z', { w: 3, room: 'B2' });
    w.veil('b2ve', 11, -50, 'x', { w: 3, room: 'B2' });
    w.veil('b2vs', 0, -39, 'z', { w: 3, room: 'B2' });
    // Guldstolpar på var sida om slöjorna
    for (const [x, z] of [[-1.8, -61], [1.8, -61], [11, -48.2], [11, -51.8], [-1.8, -39], [1.8, -39]]) {
      B.solid(place(new THREE.Mesh(box(0.4, 4, 0.4, 1), M.goldPlate), w.X(x), 2, z));
    }
    w.onUpdate.push((dt, p, g) => {
      if (s().solved.hours || !eyes.every((e) => e.on)) return;
      s().solved.hours = true;
      w.openDoor('b23');
      g.sfx.play('secret');
      g.hud.toast('Three eyes of the hours are awake. The northern door opens!', 3600);
      g.story.save(true);
    });
    w.onUpdate.push((dt, p, g) => {
      if (brake.pressed && !w.hinted.brake) {
        w.hinted.brake = true;
        g.hud.toast('The weight of thunder holds the sun still. The mirror stops turning.', 3600);
      }
    });
    w.inscription(-11, -37.2, Math.PI, ['Carved into the sandstone:', '"The sun never rests, and the hours burn nothing. Only the weight of thunder holds back the sun."']);
    w.enemy('bat', -8, -56, null, 'B2');
    w.enemy('bat', 8, -44, null, 'B2');
    for (const [x, z] of [[-12.5, -62.5], [12.5, -62.5], [12.5, -37.5]]) w.brazier(x, z);

    // ---------- Väktarens gård (B3): Solväktaren ----------
    w.shaft('b3s', 0, -80, 1.5, { room: 'B3' });
    w.chest({ id: 'bB3', x: -6, z: -91, face: 0, shards: 20, hidden: () => !!s().cleared.guardian });
    w.fightBars = ['b23'];
    w.onConnect.push(() => {
      const gd = new SunGuardian(w.D, w.V(0, 0, -88), 0, w.rooms.B3, w.groundAt);
      gd.clearId = 'guardian';
      gd.onEvent = (ev) => {
        const g = w.game;
        if (ev === 'dazzled' && !w.hinted.dazzle) {
          w.hinted.dazzle = true;
          g.hud.toast('The guardian reels, blinded by the sun! Strike now!', 3000);
        }
        if (ev !== 'defeated') return;
        w.bossFight = false;
        s().cleared.guardian = true;
        w.setBars('b23', false);
        w.openDoor('b3x');
        g.sfx.play('secret');
        g.hud.toast('The Sun Guardian falls. Its golden seal fades from the northern door.', 3400);
        g.story.save(true);
      };
      w.bosses.push(gd);
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || s().cleared.guardian) return;
      const r = w.rooms.B3, gd = w.bosses[0];
      const inner = p.feet.x > r.x0 + 3 && p.feet.x < r.x1 - 3 && p.feet.z > r.z0 + 3 && p.feet.z < r.z1 - 3;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.fightT = 0;
        w.setBars('b23', true);
        gd.wake();
        g.hud.card('The Sun Guardian', 'Keeper of the solar barque');
      }
      if (w.bossFight) {
        w.fightT += dt;
        if (w.fightT > 12 && gd.hp >= 16 && !w.hinted.guardian) {
          w.hinted.guardian = true;
          g.hud.toast('The golden shield turns every blow. Stand in the light, raise the prism and lock on to the guardian!', 5200);
        }
      }
    });
    for (const [x, z] of [[-4, -67.5], [4, -92.5], [-12.5, -92.5], [12.5, -67.5]]) w.brazier(x, z);
    for (const [x, z] of [[-9, -73], [9, -73], [-9, -87], [9, -87]]) lotus(w, x, z);
    w.inscription(-5, -92.8, 0, ['Carved into the sandstone:', '"The guardian sees only by the sun. Give it too much, and it is blind."']);
    a.map.floor = 'B2';
  });

  // =====================================================================
  // The Inner Ascent
  // =====================================================================
  mk({
    id: 'pascent', name: 'The Inner Ascent', sub: 'The long climb toward the apex', indoor: true,
    fog: { color: 0x1a120a, near: 18, far: 110 }, light: SAND_LIGHT,
  }, 13000, (w, a) => {
    B.bounds(w.ox - 50, w.ox + 14, -92, 20);
    const s = () => w.state;
    const Yt = 12;
    const yAt = (z) => (-2 - z) * (Yt / 48); // rampens höjd
    const A0 = w.room('A0', 'Foot of the Ramp', -4, 4, 0, 10, { floor: 'F1' });
    w.room('A1a', 'Rolling Stone Ramp', -3, 3, -26, -2, { y: 3, floor: 'F1', floorSlab: false });
    w.room('A1b', 'Rolling Stone Ramp', -3, 3, -50, -26, { y: 9, floor: 'F2', floorSlab: false });
    const AL = w.room('AL', 'Upper Landing', -8, 8, -58, -50, { y: Yt, floor: 'F2', floorSlab: false });
    const A2 = w.room('A2', 'Chamber of the Hourglass', -46, -10, -76, -40, { y: Yt, floor: 'F2', floorSlab: false });
    const AT = w.room('AT', 'Hidden Treasury', -22, -12, -88, -78, { y: 6, floor: 'F2' });
    w.walls(A0, { N: [{ c: 0, w: 6, h: 6 }], S: [{ c: 0, w: 3 }] });
    stair(w, 0, 10, 17);
    w.slab(-3, 3, -1, 0, -2, 0, w.floorMat);
    w.entry('entrance', 0, 8, Math.PI);
    w.entry('fromApex', -28, -74.6, 0, Yt);
    w.exit(-2, 2, 14.5, 20, 'pbarque', 'fromAscent', { label: 'The Hall of the Sun Barque' });

    // ---------- Rampen med stenkulor (A1) ----------
    {
      const len = Math.hypot(48, Yt), th = Math.atan2(Yt, 48), t = 0.8;
      const ramp = new THREE.Mesh(box(6, t, len, 2), M.sandstone);
      ramp.rotation.x = th;
      ramp.position.set(w.X(0), Yt / 2 - Math.cos(th) * t / 2, -26 - Math.sin(th) * t / 2);
      B.solid(ramp);
    }
    // Nischer i väggarna där Cello kan gömma sig
    const niches = [[-10, 1], [-18, -1], [-26, 1], [-34, -1], [-42, 1]];
    for (const side of [-1, 1]) {
      const gaps = niches.filter(([, sd]) => sd === side).map(([z]) => z).sort((p, q) => q - p);
      let z1 = 0;
      const seg = (za, zb) => { if (za - zb > 0.01) w.slab(side > 0 ? 3 : -4, side > 0 ? 4 : -3, -1, 19, zb, za, w.wallMat); };
      for (const zc of gaps) {
        seg(z1, zc + 1.5);
        const yc = yAt(zc);
        w.slab(side > 0 ? 3 : -4, side > 0 ? 4 : -3, yc + 4, 19, zc - 1.5, zc + 1.5, w.wallMat);
        z1 = zc - 1.5;
      }
      seg(z1, -50);
    }
    for (const [zc, side] of niches) {
      const yc = yAt(zc), xi = side > 0 ? 3 : -3, xo = side > 0 ? 6.5 : -6.5;
      const lo = Math.min(xi, xo), hi = Math.max(xi, xo);
      w.slab(lo, hi, yc - 1, yc + 0.02, zc - 1.5, zc + 1.5, w.floorMat);
      w.slab(side > 0 ? 6.5 : -7.5, side > 0 ? 7.5 : -6.5, yc - 1, yc + 5, zc - 2.5, zc + 2.5, w.wallMat);
      w.slab(lo, hi + (side > 0 ? 1 : 0) - (side > 0 ? 0 : -0), yc - 1, yc + 5, zc - 2.5, zc - 1.5, w.wallMat);
      w.slab(lo, hi, yc - 1, yc + 5, zc + 1.5, zc + 2.5, w.wallMat);
      w.slab(lo, hi, yc + 4, yc + 5, zc - 1.5, zc + 1.5, w.wallMat);
      w.brazier(side > 0 ? 5.6 : -5.6, zc + 0.9, yc);
    }
    w.boulders('rb', [[0, Yt, -63], [0, Yt, -51], [0, yAt(-4), -4]], { period: 3.6, r: 2.2 });
    // Den övre avsatsen och tunneln som stenkulorna kommer ur
    w.slab(-8, 8, 5, Yt, -58, -50, w.floorMat);
    w.slab(-2.6, 2.6, 5, Yt, -64, -58, w.floorMat);
    w.wall('x', -9, 9, -59, -58, [{ c: 0, w: 5.2, h: 5 }], { y0: 5, y1: Yt + 8, fy: Yt });
    w.wall('z', -64, -59, -3.6, -2.6, [], { y0: 5, y1: Yt + 6 });
    w.wall('z', -64, -59, 2.6, 3.6, [], { y0: 5, y1: Yt + 6 });
    w.slab(-3.6, 3.6, 5, Yt + 6, -65, -64, w.wallMat);
    w.slab(-3.6, 3.6, Yt + 5, Yt + 6, -64, -59, w.wallMat);
    w.slab(-8, -4, 5, Yt + 8, -50, -49, w.wallMat);
    w.slab(4, 8, 5, Yt + 8, -50, -49, w.wallMat);
    w.wall('z', -58, -50, -9, -8, [{ c: -52 }], { y0: 5, y1: Yt + 8, fy: Yt });
    w.wall('z', -58, -50, 8, 9, [], { y0: 5, y1: Yt + 8 });
    w.inscription(-5.5, -51.2, Math.PI, ['Carved into the sandstone:', '"The stones of Ra roll for those who climb too slowly. The walls keep small mercies."'], Yt);
    w.inscription(5, -0.8, Math.PI, ['Carved into the sandstone:', '"Climb toward the sun. Rest only in the shelter of the walls."']);

    // ---------- Timglasets kammare (A2) ----------
    // Gången i söder, tre gropar i norr: L (vänster), M (mitten, vägen till dörren) och R (höger, skattkammaren)
    w.slab(-46, -10, 5, Yt, -54, -40, w.floorMat);
    const wallSolid = (x0, x1, z0, z1, y1 = Yt + 7) => w.slab(x0, x1, 5, y1, z0, z1, w.wallMat);
    wallSolid(-46, -44, -76, -54);
    wallSolid(-34, -32, -76, -54);
    wallSolid(-24, -22, -76, -54);
    wallSolid(-12, -10, -76, -54);
    wallSolid(-44, -34, -77, -74);
    // Norr om R: väggen har en öppning ner till skattkammaren
    wallSolid(-22, -18.2, -77, -74);
    wallSolid(-15.8, -12, -77, -74);
    w.slab(-18.2, -15.8, 9.6, Yt + 7, -77, -74, w.wallMat);
    w.slab(-18.2, -15.8, 5, 6, -78, -74, w.floorMat);
    // Norr om M: en smal hylla vid dörren
    w.slab(-32, -24, 5, Yt, -76, -74, w.floorMat);
    w.walls(A2, { N: [-28], E: [-52] }, { y0: Yt - 1 });
    w.walls(AT, { S: [-17] });
    const pL = w.sandPit('pL', -44, -34, -74, -54, 6, Yt, { inverse: true, glass: 'hg', bottom: 5 });
    const pM = w.sandPit('pM', -32, -24, -74, -54, 6, Yt, { glass: 'hg', bottom: 5 });
    const pR = w.sandPit('pR', -22, -12, -74, -54, 6, Yt, { glass: 'hg', bottom: 5 });
    // Ramper ner i groparna (begravda när sanden står högt)
    for (const pit of [pL, pM, pR]) {
      const x0 = pit.x0 - w.ox, len = Math.hypot(12, 6), th = Math.atan2(6, 12), t = 0.6;
      const ramp = new THREE.Mesh(box(3, t, len, 1.5), M.sandstoneDark);
      ramp.rotation.x = -th;
      ramp.position.set(w.X(x0 + 1.5), 9 - Math.cos(th) * t / 2, -60 + Math.sin(th) * t / 2);
      B.solid(ramp);
      // Fyllning under rampen i trappsteg, så att ingen kan krypa in under den
      for (let k = 0; k < 12; k++) {
        const top = Yt - (k + 1) * 0.5 - 0.62;
        if (top <= 6.05) break;
        w.slab(x0, x0 + 3, 5, top, -55 - k, -54 - k, M.sandstoneDark);
      }
    }
    w.hourglass('hg', -14, -46, { y: Yt });
    w.sandfall('sfa', -28, -58, 1.3, { y: Yt, top: 7, period: 4.0, on: 1.3, phase: 0 });
    w.sandfall('sfb', -28, -64.5, 1.3, { y: Yt, top: 7, period: 4.0, on: 1.3, phase: 1.3 });
    w.sandfall('sfc', -28, -70.5, 1.3, { y: Yt, top: 7, period: 4.0, on: 1.3, phase: 2.6 });
    w.chest({ id: 'aL', x: -39, y: 6, z: -71.5, face: 0, shards: 20 });
    w.chest({ id: 'aK3', x: -17, y: 6, z: -86, face: 0, item: 'pkey' });
    w.door({ id: 'aX', x: -28, z: -77, axis: 'z', type: 'key', y: Yt, neg: null, pos: 'A2' });
    w.slab(-30, -26, Yt - 1, Yt, -86, -77, w.floorMat);
    w.wall('z', -86, -78, -31, -30, [], { y0: Yt - 1, y1: Yt + 6 });
    w.wall('z', -86, -78, -26, -25, [], { y0: Yt - 1, y1: Yt + 6 });
    w.exit(-30, -26, -90, -82, 'papex', 'entrance', { y: Yt, dy: 3, label: 'The Apex of Ra' });
    w.inscription(-20, -40.8, Math.PI, ['Carved into the sandstone:', '"Time pours from one hollow into another. Turn the glass, and the sand obeys."'], Yt);
    w.brazier(-44.5, -41.5, Yt);
    w.brazier(-11.5, -41.5, Yt);
    w.brazier(-20.5, -79.5, 6);
    w.enemy('bat', -30, -46, null, 'A2', { y: Yt + 1 });
    w.enemy('bat', -17, -84, null, 'AT', { y: 7 });
    a.map.floor = 'F1–F2';
  });

  // =====================================================================
  // The Apex of Ra
  // =====================================================================
  mk({
    id: 'papex', name: 'The Apex of Ra', sub: 'The summit of the Sun-Scorched Pyramid', indoor: true,
    fog: { color: 0x2a1c10, near: 20, far: 120 }, light: { hemi: 1.15, moon: 0.7, flash: 0, sky: 0xc0a070, ground: 0x3a2a1c, moonColor: 0xf0d090 },
  }, 13500, (w, a) => {
    B.bounds(w.ox - 20, w.ox + 20, -40, 20);
    const s = () => w.state;
    const X0 = w.room('X0', 'Summit Stair', 4, 12, 0, 10, { floor: 'Apex' });
    const X1 = w.room('X1', 'Chamber of the Sun', -14, 14, -32, -2, { floor: 'Apex' });
    w.walls(X0, { N: [8], S: [{ c: 8, w: 3 }] });
    w.walls(X1, { S: [8] });
    w.slab(6.8, 9.2, -1, 0, -2, 0, w.floorMat);
    stair(w, 8, 10, 17);
    w.entry('entrance', 8, 8, Math.PI);
    w.exit(6, 10, 14.5, 20, 'pascent', 'fromApex', { label: 'The Inner Ascent' });
    w.door({ id: 'x01', x: 8, z: -1, axis: 'z', type: 'open', neg: 'X1', pos: 'X0' });
    // Ljuset från toppen, två solkristaller, en kristall på ett block, två speglar och fyra ögon
    w.shaft('x1s', -10, -12, 1.2, { room: 'X1', top: 9 });
    w.mirror('x1m1', -10, -16, 0, { room: 'X1' });
    w.splitter('x1s1', -2, -16, { room: 'X1' });
    w.splitter('x1s2', -2, -8, { room: 'X1' });
    w.mirror('x1m2', 8, -24, 0, { room: 'X1' });
    const AP = APEX_PUZZLE, GX = -12, GZ = -30;
    w.blockGrid('gx', GX, GZ, AP.cols, AP.rows, AP.walls);
    w.crystalBlock('gxc', 'gx', AP.crystal[0], AP.crystal[1]);
    AP.stones.forEach(([c, r], i) => w.pushBlock(`gxs${i}`, 'gx', c, r));
    const eyes = [
      w.eye('x1w1', -13.85, -8, Math.PI / 2, { hold: true, room: 'X1' }),
      w.eye('x1e1', 13.85, -8, -Math.PI / 2, { hold: true, room: 'X1' }),
      w.eye('x1w2', -13.85, -24, Math.PI / 2, { hold: true, room: 'X1' }),
      w.eye('x1n', 8, -31.85, 0, { hold: true, room: 'X1' }),
    ];
    // Solnyckeln i en bur, och ljusrännan ner till ormens dörr
    w.slab(9.5, 12.5, 0, 0.5, -30.5, -27.5, M.sandstoneDark);
    w.cage('ksun', 11, -29, 1.2, 0.5);
    w.chest({ id: 'pSun', x: 11, y: 0.5, z: -29, face: -Math.PI / 2, item: 'sunkey', big: true, cage: 'ksun' });
    const chute = new THREE.Group();
    const cm = new THREE.MeshBasicMaterial({ color: 0xffd880, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    chute.add(place(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 9, 16, 1, true), cm), 0, 4.5, 0));
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 - k * 0.3, 0.06, 6, 24), cm);
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.3 + k * 0.7;
      chute.add(t);
    }
    chute.position.set(w.X(11), 0, -5.5);
    chute.visible = false;
    w.D.add(chute);
    w.exit(10, 12, -6.5, -4.5, 'pyramid', 'sunDrop', { ok: () => !!s().solved.apex, blocked: 'A golden circle is carved into the floor. It is cold and dark.' });
    w.afterSun = () => { chute.visible = !!s().solved.apex; };
    w.onUpdate.push((dt, p, g) => {
      chute.children.forEach((c, i) => { if (i) c.rotation.z += dt * (1 + i); });
      if (s().solved.apex || !eyes.every((e) => e.on)) return;
      s().solved.apex = true;
      s().solved['blocks:gx'] = true;
      s().blocks = s().blocks || {};
      s().blocks.gx = Object.fromEntries(w.blocks.filter((b) => b.g.id === 'gx').map((b) => [b.id, [b.c, b.r]]));
      w.openCage('ksun');
      chute.visible = true;
      g.sfx.play('heartbig');
      g.lights.flash(w.V(0, 4, -16), 0xffe0a0, 60, 26, 0.8);
      g.hud.toast('All four eyes of Ra see the sun! The golden cage rises, and light pours down through the floor.', 5200);
      g.story.save(true);
    });
    w.deco(box(0.3, 1.0, 0.6, 1), M.goldPlate, 13.4, 1.2, -20);
    w.interactions.push({
      label: 'Pull the lever', area: w.id, pos: () => w.V(12.6, 0, -20), radius: 1.5,
      ok: () => !s().solved['blocks:gx'],
      run: () => { w.resetBlocks('gx'); w.game.sfx.play('stonegrind'); w.game.hud.toast('The stones grind back to where they started.', 2600); },
    });
    w.inscription(2, -2.8, Math.PI, ['Carved into the sandstone:', '"Four eyes of Ra keep the key of the sun. Give them the light of the summit, all at once."', '(A lever on the east wall returns the stones.)']);
    w.enemy('shade', 4, -12, [[4, -12], [10, -18]], 'X1');
    w.enemy('shade', -6, -20, [[-6, -20], [-12, -20]], 'X1');
    w.enemy('bat', 0, -6, null, 'X1');
    for (const [x, z] of [[-12.5, -3.5], [12.5, -3.5], [-12.5, -30.5]]) w.brazier(x, z);
    a.map.floor = 'Apex';
  });

  return wings;
}

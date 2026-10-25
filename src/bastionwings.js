// The Tempest Bastion, del 2–5 (0.8): fästningen blev fem gånger så stor. Den gamla delen är första våningen;
// härifrån leder trappor, dörrar och en hiss till fyra nya områden (ingen dimma, bara en övertoning):
//
//   The Lightning Cisterns (bdepths)  – ner från källaren. Växlar som styr blixten, järnblock, ett mörkt valv
//                                       och två spolar som måste laddas inom några sekunder från två olika salar.
//   The Deep Forge (bfurnace)         – ännu längre ner. Ett fällrum i tre vågor, spruckna gångar i stormvind
//                                       över ett schakt, och den stora dynamon som får tre blixtar i rätt ordning.
//   The Thunder Spire (bspire)        – tornet från vindbryggan. Hissen (som dynamon väcker), gången runt
//                                       tornet där tre plattor måste slås i takt, och klocksalen.
//   The Storm Crown (bcrown)          – högst upp. Två Järnväktare på en gång, Stormnyckeln och en genväg ner.
//
// Små nycklar: K3 (cisternerna, buren) → norra dörren i cisternerna · K4 (valvet) → dynamosalens dörr
//              K5 (klocksalen) → dörren till kronan. Stormnyckeln ligger i kronan.
import * as THREE from 'three';
import { box, cyl, place, hash2 } from './geom.js';
import { Wing } from './dkit.js';
import { IronWarden } from './bosses.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildBastionWings(B, areas, bastion) {
  const M = B.M;
  const wings = [];
  const mk = (def, ox, build) => {
    const a = areas.create({ card: false, ...def });
    B.begin(a);
    const w = new Wing(B, a, bastion, { ox, name: def.name });
    build(w, a);
    a.connectFns.push((c) => w.connect(c));
    B.end();
    wings.push(w);
    return w;
  };

  // =====================================================================
  // The Lightning Cisterns
  // =====================================================================
  mk({
    id: 'bdepths', name: 'The Lightning Cisterns', sub: 'Beneath the Tempest Bastion', indoor: true, dark: true,
    fog: { color: 0x0e1218, near: 16, far: 90 }, light: { hemi: 0.75, moon: 0.35, flash: 0, sky: 0x6a7a96, ground: 0x1a1a22, moonColor: 0x8aa0c0 },
  }, 10000, (w, a) => {
    B.bounds(w.ox - 40, w.ox + 44, -60, 16);
    const s = () => w.state;
    // ---------- salar ----------
    const D0 = w.room('D0', 'Stair Landing', -4, 4, 0, 10);
    const D1 = w.room('D1', 'Junction Hall', -16, 16, -30, -2);
    const D2 = w.room('D2', 'Iron Gallery', -36, -18, -30, -16);
    const D4 = w.room('D4', 'Lantern Vault', -36, -18, -50, -32);
    const D3 = w.room('D3', 'Coil Gallery', 18, 40, -32, -10);
    const D5 = w.room('D5', 'Stair Hall', -8, 8, -48, -32);
    w.walls(D0, { N: [0], S: [{ c: 0, w: 3 }] });
    w.walls(D1, { S: [0], W: [-23], E: [-21], N: [0] });
    w.walls(D2, { E: [-23], N: [-27] });
    w.walls(D4, { S: [-27] });
    w.walls(D3, { W: [-21] });
    w.walls(D5, { S: [0], N: [0] });
    // Golv i dörröppningarna
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.slab(-18, -16, -1, 0, -24.2, -21.8, w.floorMat);
    w.slab(16, 18, -1, 0, -22.2, -19.8, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -32, -30, w.floorMat);
    w.slab(-28.2, -25.8, -1, 0, -32, -30, w.floorMat);
    // Trappan upp till källaren, och trappan ner mot smedjan
    w.slab(-1.5, 1.5, -1, 0, 10, 17, w.floorMat);
    w.wall('z', 10, 17, -2.5, -1.5, []);
    w.wall('z', 10, 17, 1.5, 2.5, []);
    for (let i = 0; i < 4; i++) w.slab(-1.5, 1.5, 0, 0.18 + i * 0.18, 13 + i * 0.9, 13.9 + i * 0.9, M.ironWall, 1);
    w.slab(-1.5, 1.5, -1, 0, -56, -48, w.floorMat);
    w.wall('z', -56, -49, -2.5, -1.5, []);
    w.wall('z', -56, -49, 1.5, 2.5, []);
    for (let i = 0; i < 4; i++) w.slab(-1.5, 1.5, -1, -0.18 - i * 0.18, -51 - i * 0.9 - 0.9, -51 - i * 0.9, M.ironWall, 1);
    w.entry('entrance', 0, 8, Math.PI);
    w.entry('fromForge', 0, -46.4, 0);
    w.exit(-2, 2, 14.5, 20, 'bastion', 'depthStair', { label: 'The Tempest Bastion' });
    w.exit(-2, 2, -60, -53.5, 'bfurnace', 'entrance', { label: 'The Deep Forge', ok: () => !!s().doors.includes('gStair'), blocked: 'The gate is shut.' });
    // ---------- dörrar ----------
    w.door({ id: 'q01', x: 0, z: -1, axis: 'z', type: 'open', neg: 'D1', pos: 'D0' });
    w.door({ id: 'dW', x: -17, z: -23, axis: 'x', type: 'circuit', neg: 'D2', pos: 'D1' });
    w.door({ id: 'dE', x: 17, z: -21, axis: 'x', type: 'circuit', neg: 'D1', pos: 'D3' });
    w.door({ id: 'dN', x: 0, z: -31, axis: 'z', type: 'key', neg: 'D5', pos: 'D1' });
    w.door({ id: 'dW2', x: -27, z: -31, axis: 'z', type: 'plate', neg: 'D4', pos: 'D2' });
    w.door({
      id: 'gStair', x: 0, z: -49, axis: 'z', type: 'cap', neg: null, pos: 'D5',
      text: ['A heavy iron gate bars the stairs down.', 'Two copper channels run into it from the east. It wants a great deal of lightning at once.'],
    });

    // ---------- Växelsalen (D1): blixten styrs av pilar ----------
    w.node('P1', 0, -6, 'plate');
    w.node('J1', 0, -12, 'junction');
    w.node('c1', -8, -12);
    w.node('c3', -8, -23);
    w.node('TdW', -15.6, -23, 'target', { onArrive: () => { if (!s().doors.includes('dW')) { w.openDoor('dW'); w.game?.sfx.play('secret'); w.game?.story.save(true); } } });
    w.node('c2', 8, -12);
    w.node('J3', 8, -21, 'junction');
    w.node('TdE', 15.6, -21, 'target', { onArrive: () => { if (!s().doors.includes('dE')) { w.openDoor('dE'); w.game?.sfx.play('secret'); w.game?.story.save(true); } } });
    w.node('c8', 8, -27);
    w.node('C1', 26, -27, 'coil', { cap: 'cap3' });
    w.node('J2', 0, -20, 'junction');
    w.node('bk', -5, -20, 'broken');
    w.node('c7', 0, -25);
    w.node('Tk3', -7, -25, 'target', { onArrive: () => { w.openCage('k3'); w.game?.story.save(true); } });
    w.link('P1', 'J1', 'J2', 'c7', 'Tk3');
    w.link('J1', 'c1', 'c3', 'TdW');
    w.link('J1', 'c2', 'J3', 'TdE');
    w.link('J3', 'c8', 'C1');
    w.link('J2', 'bk');
    // ---------- Spolgalleriet (D3): två spolar inom nio sekunder ----------
    w.node('P3', 37, -13, 'plate');
    w.node('c11', 37, -27);
    w.node('C2', 34, -27, 'coil', { cap: 'cap3' });
    w.link('P3', 'c11', 'C2');
    w.capacitor('cap3', 10, () => {
      w.openDoor('gStair');
      w.game?.hud.toast('Both coils sing at once! Far to the north, a heavy gate grinds open.', 4200);
    });
    w.finishNet({ J1: 0, J2: 2, J3: 1 });
    w.cage('k3', -7, -27.6);
    w.chest({ id: 'bK3', x: -7, z: -27.6, face: 0, item: 'key', cage: 'k3' });

    // ---------- Järngalleriet (D2): järnblock på två tryckplattor ----------
    // Rutnätet: 9 × 7 rutor om 2 m, från (-35, -29). Lösningen kräver minst 17 skjut (kontrollerat med en lösare).
    const GX = -35, GZ = -29;
    const cell = (c, r) => [GX + c * 2, GZ + r * 2];
    w.blockGrid('g2', GX, GZ, 9, 7, [[0, 0], [1, 0], [2, 0], [1, 4], [3, 5], [4, 4], [5, 3], [6, 2], [6, 4]]);
    w.pushBlock('b1', 'g2', 6, 1);
    w.pushBlock('b2', 'g2', 2, 1);
    w.pushBlock('b3', 'g2', 1, 5);
    const platesDown = () => w.pressure.filter((q) => q.id.startsWith('pp')).every((q) => q.pressed);
    const onPlate = () => {
      if (s().solved['blocks:g2'] || !platesDown()) return;
      s().solved['blocks:g2'] = true;
      s().blocks = s().blocks || {};
      s().blocks.g2 = Object.fromEntries(w.blocks.map((b) => [b.id, [b.c, b.r]]));
      w.openDoor('dW2');
      w.game?.sfx.play('secret');
      w.game?.hud.toast('Both plates sink under the iron. The northern door rumbles open!', 3600);
      w.game?.story.save(true);
    };
    w.pressurePlate('pp1', ...cell(4, 5), { onChange: onPlate, blockOnly: true });
    w.pressurePlate('pp2', ...cell(8, 4), { onChange: onPlate, blockOnly: true });
    // Spaken som ställer tillbaka blocken
    w.deco(box(0.3, 1.0, 0.6, 1), M.iron, -18.4, 1.2, -28.4);
    w.interactions.push({
      label: 'Pull the lever', area: w.id, pos: () => w.V(-19.2, 0, -28.4), radius: 1.5,
      ok: () => !s().solved['blocks:g2'],
      run: () => { w.resetBlocks('g2'); w.game.sfx.play('stonegrind'); w.game.hud.toast('The iron blocks grind back to where they started.', 2600); },
    });
    w.inscription(-15.2, -27, Math.PI / 2, ['Carved into the iron:', '"Only the weight of thunder moves the iron. Think twice before you push: iron does not pull back."', '(A lever by the door returns the blocks to their places.)']);

    // ---------- Lyktvalvet (D4): fyra eldfat i mörkret ----------
    const T = [[-33, -47], [-21, -47], [-33, -35], [-21, -35]].map(([x, z], i) => w.torch(`vault${i}`, x, z));
    w.cage('k4', -27, -44.5);
    w.chest({ id: 'bK4', x: -27, z: -44.5, face: 0, item: 'key', cage: 'k4' });
    w.onTorch = () => {
      const st = w.game.story.state.torches;
      if (T.every((t) => st[t.id]) && !s().solved['cage:k4']) {
        w.openCage('k4');
        w.game.hud.toast('The fourth flame catches. The iron cage in the middle of the vault rises.', 3600);
        w.game.story.save(true);
      }
    };
    w.inscription(-24, -33, Math.PI, ['Carved into the iron:', '"Four flames for the four winds. Wake them all, and the iron will kneel."']);
    w.inscription(5, -3, Math.PI, ['Carved into the iron:', '"The copper remembers every road. Turn the arrows, and the thunder follows."']);
    w.inscription(37.5, -10.8, Math.PI, ['Carved into the iron:', '"Two hearts of copper, one in the hall, one here. They must burn together, or not at all."']);
    w.inscription(-5, -33.2, Math.PI, ['Carved into the iron:', '"Below lies the deep forge, where Thor\'s smiths fed the great wheel with lightning."']);
    // ---------- dekor ----------
    for (const [x, z] of [[-14, -4], [14, -4], [-14, -28], [14, -28], [-34, -18], [20, -12], [38, -30], [20, -30], [-6, -46], [6, -46], [-3, 8], [3, 8]]) w.brazier(x, z);
    for (const [x, z] of [[-10, -16], [10, -16], [-10, -6], [10, -6]]) w.pillar(x, z, 0.6);
    // Vattenrännor längs väggarna i växelsalen
    const water = new THREE.MeshLambertMaterial({ color: 0x1c3444, emissive: 0x050c12, transparent: true, opacity: 0.85 });
    for (const x of [-15, 15]) w.deco(new THREE.BoxGeometry(1.2, 0.05, 24), water, x, 0.03, -16);
    for (const [x, z] of [[-14.5, -9], [14.4, -15], [-30, -48.5], [-19, -48.5], [38.5, -11.5], [6.6, -33.5], [-6.6, -33.5]]) B.pot(w.X(x), 0, z);
    // ---------- fiender ----------
    w.enemy('askling', -11, -9, [[-11, -9], [-11, -27]], 'D1');
    w.enemy('askling', 11, -27, [[11, -27], [11, -9]], 'D1');
    w.enemy('bat', 0, -16, null, 'D1');
    w.enemy('shield', 29, -20, [[29, -24], [29, -14]], 'D3');
    w.enemy('bat', 24, -14, null, 'D3');
    w.enemy('bat', 34, -22, null, 'D3');
    w.enemy('bat', -30, -40, null, 'D4');
    w.enemy('bat', -24, -46, null, 'D4');
    w.enemy('askling', -32, -38, [[-32, -38], [-22, -38]], 'D4');
    w.enemy('askling', -5, -40, [[-5, -36], [5, -44]], 'D5');
    w.enemy('askling', 5, -36, [[5, -36], [-5, -44]], 'D5');
    a.map.floor = 'B1';
  });

  // =====================================================================
  // The Deep Forge
  // =====================================================================
  mk({
    id: 'bfurnace', name: 'The Deep Forge', sub: 'Where Thor\'s smiths worked the lightning', indoor: true,
    fog: { color: 0x1c100a, near: 18, far: 100 }, light: { hemi: 0.95, moon: 0.45, flash: 0, sky: 0xb07050, ground: 0x2a1410, moonColor: 0xe0a070 },
  }, 10500, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -100, 16);
    const s = () => w.state;
    const F0 = w.room('F0', 'Forge Landing', -4, 4, 0, 10);
    const F1 = w.room('F1', 'Gauntlet Hall', -14, 14, -26, -2);
    const F2 = w.room('F2', 'Crumbling Forge', -14, 14, -52, -28, { floorSlab: false });
    const F2L = w.room('F2L', 'Slag Pit', -14, 14, -52, -28, { y: -6 });
    const F3 = w.room('F3', 'Dynamo Hall', -18, 18, -86, -54);
    w.walls(F0, { N: [0], S: [{ c: 0, w: 3 }] });
    w.walls(F1, { S: [0], N: [0] });
    // Den spruckna smedjans väggar går ner till schaktets botten
    w.walls(F2, { S: [0], N: [0] }, { y0: -7 });
    w.walls(F3, { S: [0], N: [0] });
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -28, -26, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -54, -52, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -88, -86, w.floorMat);
    // Trappan upp till cisternerna
    w.slab(-1.5, 1.5, -1, 0, 10, 17, w.floorMat);
    w.wall('z', 10, 17, -2.5, -1.5, []);
    w.wall('z', 10, 17, 1.5, 2.5, []);
    w.entry('entrance', 0, 8, Math.PI);
    w.exit(-2, 2, 14, 20, 'bdepths', 'fromForge', { label: 'The Lightning Cisterns' });
    // Hissen upp till vindbryggan (dynamon driver den)
    w.slab(-1.5, 1.5, -1, 0, -94, -86, w.floorMat);
    w.wall('z', -94, -87, -2.5, -1.5, []);
    w.wall('z', -94, -87, 1.5, 2.5, []);
    w.exit(-2, 2, -100, -91, 'bastion', 'spireDoor', { label: 'The Wind Bridge' });
    w.entry('dynamo', 0, -82, 0);

    w.door({ id: 'f01', x: 0, z: -1, axis: 'z', type: 'open', neg: 'F1', pos: 'F0' });
    w.door({ id: 'f12', x: 0, z: -27, axis: 'z', type: 'open', neg: 'F2', pos: 'F1' });
    w.door({ id: 'f23', x: 0, z: -53, axis: 'z', type: 'key', neg: 'F3', pos: 'F2' });
    w.door({
      id: 'fUp', x: 0, z: -87, axis: 'z', type: 'circuit', neg: null, pos: 'F3',
      text: ['A lift shaft rises behind this door, all the way up through the fortress.', 'Its copper coils are cold. The great wheel must turn first.'],
    });

    // ---------- Fällsalen (F1): tre vågor ----------
    w.trapRoom('tF1', 'F1', ['f01', 'f12'], ['F1a', 'F1b', 'F1c'], () => w.game?.hud.toast('The last of them falls. Something glints where they stood.', 3000));
    w.traps[0].text = 'The bars slam shut! The forge fires roar!';
    w.chest({ id: 'fF1', x: 0, z: -14, face: 0, shards: 15, hidden: () => !!s().cleared.tF1 });
    for (const [x, z] of [[-8, -8], [0, -6], [8, -8]]) w.enemy('askling', x, z, [[x, z], [x, z - 8]], 'F1a', { dormant: true, room: 'F1' });
    w.enemy('shield', -6, -20, [[-6, -20], [6, -20]], 'F1b', { dormant: true, room: 'F1' });
    w.enemy('shield', 6, -10, [[6, -10], [-6, -10]], 'F1b', { dormant: true, room: 'F1' });
    w.enemy('askling', 0, -18, [[0, -18], [0, -8]], 'F1b', { dormant: true, room: 'F1' });
    for (const [x, z] of [[-8, -16], [8, -16], [0, -22]]) w.enemy('bat', x, z, null, 'F1c', { dormant: true, room: 'F1' });
    w.enemy('askling', -9, -22, [[-9, -22], [-9, -6]], 'F1c', { dormant: true, room: 'F1' });
    w.enemy('askling', 9, -6, [[9, -6], [9, -22]], 'F1c', { dormant: true, room: 'F1' });

    // ---------- Den spruckna smedjan (F2) ----------
    // Söder och norr fast golv. Emellan: schakt i väster och öster, två smala järnbalkar och spruckna plattor.
    // Bälgarna i öster blåser västerut i stötar. Med tung vikt står Cello emot vinden, men de spruckna plattorna rasar.
    w.slab(-14, 14, -1, 0, -32, -28, w.floorMat);
    w.slab(-14, 14, -1, 0, -52, -48, w.floorMat);
    w.slab(-6, -4.8, -1, 0, -48, -32, M.iron, 1);
    w.slab(6, 7.2, -1, 0, -48, -32, M.iron, 1);
    for (let i = 0; i < 5; i++) for (let k = 0; k < 8; k++) w.crackTile(-4.8 + i * 2.16, -4.8 + (i + 1) * 2.16, -48 + k * 2, -46 + k * 2);
    w.wind(-14, 14, -48, -32, [-1, 0], { strength: 10.5, period: 3.4, on: 0.5, y0: -1, y1: 5 });
    // Bälgarna på östra väggen
    for (const z of [-44, -36]) {
      w.deco(box(1.4, 2.4, 3.2, 1), M.wood, 13.2, 1.8, z);
      w.deco(box(0.6, 0.6, 0.6, 1), M.iron, 12.2, 1.8, z);
    }
    // Schaktets botten (F2L): en kista, två asklingar och en ramp upp till södra golvet
    {
      const x0 = 10, x1 = 13.5, zTop = -32, zBot = -46, rise = 6, run = zTop - zBot;
      const th = Math.atan2(rise, run), len = Math.hypot(rise, run), thick = 0.5;
      const ramp = new THREE.Mesh(box(x1 - x0, thick, len, 2), M.ironFloor);
      ramp.position.set(w.X((x0 + x1) / 2), -3 - Math.cos(th) * thick / 2, (zTop + zBot) / 2 + Math.sin(th) * thick / 2);
      ramp.rotation.x = -th;
      B.solid(ramp);
    }
    w.chest({ id: 'fF2L', x: -11, y: -6, z: -44, face: 0, shards: 20 });
    w.enemy('askling', -6, -44, [[-10, -44], [2, -38]], 'F2L', { y: -6 });
    w.enemy('askling', 2, -36, [[2, -36], [-8, -48]], 'F2L', { y: -6 });
    w.inscription(-8, -29, Math.PI, ['Carved into the iron:', '"The bellows breathe, and the floor is old. Stand heavy on iron. Never on stone."']);

    // ---------- Dynamosalen (F3): tre blixtar i rätt ordning ----------
    const DC = [0, -72];
    B.solid(place(new THREE.Mesh(cyl(2.6, 2.8, 5, 18, 2), M.copper), w.X(DC[0]), 2.5, DC[1]));
    const wheel = new THREE.Group();
    wheel.position.set(w.X(DC[0]), 5.6, DC[1]);
    w.D.add(wheel);
    for (let k = 0; k < 6; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 0.4), M.iron);
      spoke.rotation.y = (k / 6) * Math.PI;
      wheel.add(spoke);
    }
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.18, 6, 24).rotateX(Math.PI / 2), M.copper));
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x1e2a33 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 5.2, 12), coreMat);
    core.position.set(w.X(DC[0]), 2.6, DC[1]);
    w.D.add(core);
    // Ordningen: söder (solen), väster, öster. Runstenen vid nästa uttag lyser.
    const ORDER = ['IS', 'IW', 'IE'];
    const markers = {};
    for (const [id, x, z] of [['IS', 0, -68.4], ['IW', -3.6, -72], ['IE', 3.6, -72]]) {
      const m = new THREE.MeshBasicMaterial({ color: 0x1e2a33 });
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), m);
      const ox = id === 'IS' ? 1.2 : 0, oz = id === 'IS' ? 0 : 1.2;
      stone.position.set(w.X(x + ox), 0.7, z + oz);
      w.D.add(stone);
      markers[id] = m;
    }
    const dynamo = () => {
      const st = s().solved;
      return st.dynamo ? 3 : st.dynamoN ?? 0;
    };
    const socket = (id) => () => {
      const g = w.game;
      if (s().solved.dynamo) return;
      const n = dynamo();
      if (ORDER[n] === id) {
        s().solved.dynamoN = n + 1;
        g.sfx.play('zap', { vol: 1 });
        g.lights.flash(V3(w.X(DC[0]), 3, DC[1]), 0x9fdcff, 40, 14, 0.4);
        if (n + 1 >= 3) {
          s().solved.dynamo = true;
          w.openDoor('fUp');
          g.sfx.play('thunder', { vol: 1 });
          g.sfx.play('secret');
          g.rig.shake(0.6);
          g.fx.bolt(V3(w.X(DC[0]), 40, DC[1]), V3(w.X(DC[0]), 5, DC[1]), 0.6);
          g.hud.toast('The great wheel turns! Lightning races up through the whole fortress. Far above, the spire wakes.', 5600);
        } else g.hud.toast(`The wheel shudders. (${n + 1}/3)`, 2000);
        g.story.save(true);
      } else {
        s().solved.dynamoN = 0;
        g.sfx.play('fizzle');
        g.fx.burst('spark', V3(w.X(DC[0]), 2.5, DC[1]), 24, 0x9fdcff);
        g.hud.toast('The wheel sputters and the charges drain away. The order was wrong.', 3600);
      }
    };
    w.node('PA', -15, -62, 'plate');
    w.node('PB', 15, -62, 'plate');
    w.node('PC', 0, -84, 'plate');
    w.node('JA', -8, -62, 'junction');
    w.node('JC', 0, -62, 'junction');
    w.node('JB', 8, -62, 'junction');
    w.node('JW', -8, -72, 'junction');
    w.node('JE', 8, -72, 'junction');
    w.node('JN', 0, -80, 'junction');
    w.node('cNW', -8, -80);
    w.node('cNE', 8, -80);
    w.node('IS', 0, -68.6, 'target', { onArrive: socket('IS') });
    w.node('IW', -3.4, -72, 'target', { onArrive: socket('IW') });
    w.node('IE', 3.4, -72, 'target', { onArrive: socket('IE') });
    w.link('PA', 'JA', 'JC', 'JB', 'PB');
    w.link('JA', 'JW', 'cNW', 'JN', 'cNE', 'JE', 'JB');
    w.link('JC', 'IS');
    w.link('JW', 'IW');
    w.link('JE', 'IE');
    w.link('JN', 'PC');
    w.finishNet({ JA: 0, JC: 0, JB: 0, JW: 0, JE: 0, JN: 0 });
    w.onUpdate.push((dt) => {
      const n = dynamo();
      wheel.rotation.y += dt * (n >= 3 ? 3 : n * 0.25);
      coreMat.color.set(n >= 3 ? 0x8fe4ff : n === 2 ? 0x3a6a88 : n === 1 ? 0x2a4a60 : 0x1e2a33);
      for (const id of ORDER) {
        const i = ORDER.indexOf(id);
        markers[id].color.set(i < n ? 0x2e7fa8 : i === n && n < 3 ? (Math.sin(w.t * 6) > 0 ? 0xbfe8ff : 0x4a8aaa) : 0x1e2a33);
      }
    });
    w.inscription(-5, -55, Math.PI, ['Carved into the iron:', '"First the sun, that rises in the south. Then the west wind wakes. Last the east. So the great wheel turns."']);
    for (const [x, z] of [[-16, -56], [16, -56], [-16, -84], [16, -84], [-12, -2.5 - 2], [12, -4], [-12, -24], [12, -24], [-12, -30], [12, -30], [-12, -50], [12, -50], [-3, 8], [3, 8]]) w.brazier(x, z);
    for (const [x, z] of [[-12, -66], [12, -66], [-12, -78], [12, -78]]) w.pillar(x, z, 0.7);
    for (const [x, z] of [[-16.5, -60], [16.5, -60], [-16.5, -85], [16.5, -85]]) B.pot(w.X(x), 0, z);
    w.enemy('shield', -10, -70, [[-10, -60], [-10, -82]], 'F3');
    w.enemy('shield', 10, -82, [[10, -82], [10, -60]], 'F3');
    w.enemy('askling', -4, -60, [[-4, -60], [4, -60]], 'F3');
    w.enemy('askling', 4, -84, [[4, -84], [-4, -84]], 'F3');
    w.enemy('bat', -6, -76, null, 'F3');
    w.enemy('bat', 6, -76, null, 'F3');
    a.map.floor = 'B2';
  });

  // =====================================================================
  // The Thunder Spire
  // =====================================================================
  mk({
    id: 'bspire', name: 'The Thunder Spire', sub: 'The tower where the storm was caught', windy: true,
    fog: { color: 0x2a303a, near: 30, far: 220 },
  }, 11000, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -40, 10);
    const s = () => w.state;
    const powered = () => !!s().solved.dynamo;
    // Tornets kärna, från avgrunden upp till klocksalen
    B.solid(place(new THREE.Mesh(box(12, 119.5, 12, 3), M.ironWall), w.X(0), -0.25, -20));
    for (const y of [10, 22, 44, 52]) B.deco(new THREE.Mesh(box(12.6, 0.8, 12.6, 2), M.copper), w.X(0), y, -20);
    // ---------- Hisshallen (S0, nere vid vindbryggan) ----------
    const S0 = w.room('S0', 'Lift Hall', -8, 8, -13, 0, { floor: '1F' });
    w.walls(S0, { S: [{ c: 0, w: 3 }] });
    w.slab(-1.5, 1.5, -1, 0, 0, 6, w.floorMat);
    w.entry('entrance', 0, -1.5, Math.PI);
    w.exit(-2, 2, 3, 10, 'bastion', 'spireDoor', { label: 'The Wind Bridge' });
    w.lift(0, -10, {
      to: 'bspire', entry: 'gale', ok: powered, text: 'The lift rattles up through the storm...',
      dead: ['A lift platform, ringed with copper. Its coils are cold and dead.', 'The power must come from somewhere deep beneath the fortress.'],
    });
    w.inscription(5.5, -12.2, 0, ['Carved into the iron:', '"The spire drinks from the great wheel below. Turn the wheel, and the spire wakes."']);
    w.brazier(-6, -11);
    w.brazier(6, -2);
    // ---------- Stormgången (S1, runt tornet) ----------
    const Y1 = 30;
    w.room('S1s', 'Gale Walk', -10, 10, -14, -10, { y: Y1, floor: '3F' });
    w.room('S1n', 'Gale Walk', -10, 10, -30, -26, { y: Y1, floor: '3F' });
    w.room('S1w', 'Gale Walk', -10, -6, -26, -14, { y: Y1, floor: '3F' });
    w.room('S1e', 'Gale Walk', 6, 10, -26, -14, { y: Y1, floor: '3F' });
    // Låga räcken längs ytterkanten, utom där stormen har slitit bort dem (väster och öster)
    const rail = (x0, x1, z0, z1) => w.slab(x0, x1, Y1, Y1 + 1.0, z0, z1, M.ironWall, 1);
    rail(-10.4, 10.4, -10, -9.6);
    rail(-10.4, 10.4, -30.4, -30);
    rail(-10.4, -10, -30, -27);
    rail(-10.4, -10, -13, -10);
    rail(10, 10.4, -30, -27);
    rail(10, 10.4, -13, -10);
    w.entry('gale', 0, -12, -Math.PI / 2, Y1);
    w.lift(0, -12, { y: Y1, to: 'bspire', entry: 'entrance', label: 'Ride the lift down', text: 'The lift sinks through the storm...' });
    w.wind(-11, -6, -27, -13, [-1, 0], { y0: Y1 - 2, y1: Y1 + 6, strength: 9.5, period: 3.0, on: 0.5 });
    w.wind(6, 11, -27, -13, [1, 0], { y0: Y1 - 2, y1: Y1 + 6, strength: 9.5, period: 3.0, on: 0.5, phase: 1.5 });
    // Tre plattor: väster, norr, öster. Alla tre spolarna måste glöda samtidigt (13 sekunder).
    w.node('pW', -8, -20, 'plate', { y: Y1 });
    w.node('pN', 0, -28, 'plate', { y: Y1 });
    w.node('pE', 8, -20, 'plate', { y: Y1 });
    w.node('cW', -6.7, -23, 'coil', { y: Y1, cap: 'capS1' });
    w.node('cN', 3, -26.7, 'coil', { y: Y1, cap: 'capS1' });
    w.node('cE', 6.7, -17, 'coil', { y: Y1, cap: 'capS1' });
    w.node('kW', -8, -23, 'corner', { y: Y1 });
    w.node('kN', 3, -28, 'corner', { y: Y1 });
    w.node('kE', 8, -17, 'corner', { y: Y1 });
    w.link('pW', 'kW', 'cW');
    w.link('pN', 'kN', 'cN');
    w.link('pE', 'kE', 'cE');
    w.capacitor('capS1', 16, () => {
      w.openDoor('sCore');
      w.game?.hud.toast('All three coils blaze at once! The door into the spire swings open.', 4000);
    });
    w.door({
      id: 'sCore', x: 0, z: -13.6, axis: 'z', type: 'cap', y: Y1, neg: null, pos: 'S1s',
      text: ['An iron door into the heart of the spire.', 'Three copper channels feed it, from the west, the north and the east. They must all burn at once.'],
    });
    w.exit(-1.2, 1.2, -14.2, -13.45, 'bspire', 'bell', { y: Y1, dy: 2.5, ok: () => s().doors.includes('sCore'), blocked: 'The door into the spire is shut.' });
    w.inscription(-3, -10.6, Math.PI, ['Carved into the iron:', '"West, north, east: three hearts that must beat as one. The storm will not wait for the slow."'], Y1);
    w.enemy('bat', -8, -26, null, 'S1w', { y: Y1 + 1 });
    w.enemy('bat', 8, -12, null, 'S1e', { y: Y1 + 1 });
    // ---------- Klocksalen (S2, högst upp i tornet) ----------
    const Y2 = 60;
    const S2 = w.room('S2', 'Bell Chamber', -10, 10, -30, -10, { y: Y2, floor: '5F' });
    w.walls(S2, { N: [4] }, { y1: Y2 + 7 });
    w.entry('bell', 0, -12, Math.PI, Y2);
    w.entry('fromCrown', 4, -28.5, 0, Y2);
    w.lift(-7, -12.5, { y: Y2, to: 'bspire', entry: 'entrance', label: 'Ride the lift down', text: 'The lift sinks through the storm...' });
    // Klockan
    {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 3.0, 14, 1, true), M.copper);
      bell.material = M.copper;
      bell.position.set(w.X(0), Y2 + 4.2, -20);
      w.D.add(bell);
      w.D.add(place(new THREE.Mesh(box(6, 0.4, 0.4, 1), M.wood), w.X(0), Y2 + 6.0, -20));
      w.onUpdate.push(() => { bell.rotation.z = Math.sin(w.t * 0.8) * 0.05; });
    }
    w.node('Pa', -8, -13, 'plate', { y: Y2 });
    w.node('J8', -8, -20, 'junction', { y: Y2 });
    w.node('c81', -8, -27, 'corner', { y: Y2 });
    w.node('Tk5', -3, -27, 'target', { y: Y2, onArrive: () => { w.openCage('k5'); w.game?.story.save(true); } });
    w.node('J9', 0, -20, 'junction', { y: Y2 });
    w.node('bk9', 0, -15, 'broken', { y: Y2 });
    w.node('J10', 8, -20, 'junction', { y: Y2 });
    w.node('c10', 8, -14, 'broken', { y: Y2 });
    w.node('c12', 8, -28, 'corner', { y: Y2 });
    w.node('Tup', 5.5, -28, 'target', { y: Y2, onArrive: () => { if (!s().doors.includes('sUp')) { w.openDoor('sUp'); w.game?.sfx.play('secret'); w.game?.story.save(true); } } });
    w.link('Pa', 'J8', 'c81', 'Tk5');
    w.link('J8', 'J9', 'J10', 'c12', 'Tup');
    w.link('J9', 'bk9');
    w.link('J10', 'c10');
    w.finishNet({ J8: 1, J9: 2, J10: 2 });
    w.cage('k5', -3, -29, 1.05, Y2);
    w.chest({ id: 'sK5', x: -3, y: Y2, z: -29, face: 0, item: 'key', cage: 'k5' });
    w.door({ id: 'sUp', x: 4, z: -31, axis: 'z', type: 'circuit', y: Y2, neg: null, pos: 'S2' });
    w.slab(2.5, 5.5, Y2 - 1, Y2, -36, -30, w.floorMat);
    w.wall('z', -36, -31, 1.5, 2.5, [], { y0: Y2 - 1, y1: Y2 + 5 });
    w.wall('z', -36, -31, 5.5, 6.5, [], { y0: Y2 - 1, y1: Y2 + 5 });
    w.exit(2.6, 5.4, -38, -33.5, 'bcrown', 'entrance', { y: Y2, dy: 3, label: 'The Storm Crown' });
    w.inscription(-6, -10.6, Math.PI, ['Carved into the iron:', '"One spark, three arrows. The bell keeps its key for those who listen to the copper."'], Y2);
    for (const [x, z] of [[-9, -29], [9, -11]]) w.brazier(x, z, Y2);
    w.enemy('shield', -4, -16, [[-4, -16], [4, -24]], 'S2', { y: Y2 });
    w.enemy('shield', 4, -24, [[4, -24], [-4, -16]], 'S2', { y: Y2 });
    w.enemy('askling', 0, -26, [[-6, -26], [6, -26]], 'S2', { y: Y2 });
    a.map.floor = '1F–5F';
  });

  // =====================================================================
  // The Storm Crown
  // =====================================================================
  mk({
    id: 'bcrown', name: 'The Storm Crown', sub: 'The roof of the Tempest Bastion', windy: true,
    fog: { color: 0x2a303a, near: 30, far: 220 },
  }, 11500, (w, a) => {
    B.bounds(w.ox - 30, w.ox + 30, -55, 15);
    const s = () => w.state;
    const C0 = w.room('C0', 'Crown Stair', -4, 4, 0, 8, { floor: 'Roof' });
    const C1 = w.room('C1', 'Hall of Wardens', -14, 14, -30, -2, { floor: 'Roof' });
    const C2 = w.room('C2', 'The Storm Crown', -8, 8, -46, -32, { floor: 'Roof' });
    w.walls(C0, { N: [0], S: [{ c: 0, w: 3 }] });
    w.walls(C1, { S: [0], N: [0] });
    w.walls(C2, { S: [0] }, { y1: 2.2 });
    w.slab(-1.2, 1.2, -1, 0, -2, 0, w.floorMat);
    w.slab(-1.2, 1.2, -1, 0, -32, -30, w.floorMat);
    w.slab(-1.5, 1.5, -1, 0, 8, 14, w.floorMat);
    w.entry('entrance', 0, 6, Math.PI);
    w.exit(-2, 2, 11, 18, 'bspire', 'fromCrown', { label: 'The Thunder Spire' });
    w.door({ id: 'c01', x: 0, z: -1, axis: 'z', type: 'key', neg: 'C1', pos: 'C0' });
    w.door({ id: 'c12', x: 0, z: -31, axis: 'z', type: 'circuit', neg: 'C2', pos: 'C1', text: ['The door is sealed with a rune of lightning.', 'The wardens of this hall hold its key in their iron hearts.'] });
    for (const [x, z] of [[-9, -9], [9, -9], [-9, -23], [9, -23]]) w.pillar(x, z, 0.8);
    for (const [x, z] of [[-13, -3], [13, -3], [-13, -29], [13, -29], [-3, 7], [3, 7]]) w.brazier(x, z);
    w.inscription(5, -3, Math.PI, ['Carved into the iron:', '"Two wardens, one oath. When one is struck, the other strikes back."']);
    // Två Järnväktare på en gång
    w.fightBars = ['c01'];
    w.onConnect.push(() => {
      const mkW = (x, f) => {
        const b = new IronWarden(w.D, w.V(x, 0, -20), f, w.rooms.C1, w.groundAt);
        b.clearId = 'wardens';
        b.blockHint = 'The shield takes the blow. Wait until an axe gets stuck in the floor, or strike from behind!';
        b.onEvent = (ev) => {
          if (ev !== 'defeated') return;
          if (w.bosses.every((q) => q.state === 'gone')) {
            w.bossFight = false;
            s().cleared.wardens = true;
            w.setBars('c01', false);
            w.openDoor('c12');
            w.game.sfx.play('secret');
            w.game.hud.toast('The last warden crumbles. The lightning seal fades.', 3200);
            w.game.story.save(true);
          }
        };
        w.bosses.push(b);
        return b;
      };
      mkW(-5, 0);
      mkW(5, 0);
    });
    w.onUpdate.push((dt, p, g, frozen) => {
      if (frozen || s().cleared.wardens) return;
      const r = w.rooms.C1;
      const inner = p.feet.x > r.x0 + 3 && p.feet.x < r.x1 - 3 && p.feet.z > r.z0 + 3 && p.feet.z < r.z1 - 4;
      if (!w.bossFight && inner && p.state !== 'dead') {
        w.bossFight = true;
        w.setBars('c01', true);
        w.bosses[0].wake();
        g.hud.card('The Twin Wardens', 'The last oath of the Bastion');
        g.story.after(2.5, () => { if (w.bossFight) w.bosses[1].wake(); });
      }
      // Väktarna knuffas isär
      const [a1, b1] = w.bosses;
      if (a1 && b1 && a1.state !== 'gone' && b1.state !== 'gone') {
        const dx = a1.pos.x - b1.pos.x, dz = a1.pos.z - b1.pos.z, d = Math.hypot(dx, dz);
        if (d < 2.6 && d > 1e-3) {
          const k = (2.6 - d) / 2;
          a1.pos.x += (dx / d) * k; a1.pos.z += (dz / d) * k;
          b1.pos.x -= (dx / d) * k; b1.pos.z -= (dz / d) * k;
        }
      }
    });
    // Kronan: Stormnyckeln och en virvel ner till Hrungnirs dörr
    w.slab(-2, 2, 0, 0.5, -44, -40, M.ironWall);
    w.chest({ id: 'cBossKey', x: 0, y: 0.5, z: -42, face: 0, item: 'bosskey', big: true });
    B.deco(new THREE.Mesh(cyl(0.12, 0.2, 9, 6, 1), M.iron), w.X(0), 4.5, -45);
    const vortex = new THREE.Group();
    const swirl = new THREE.MeshBasicMaterial({ color: 0x8fe4ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 - k * 0.3, 0.06, 6, 24), swirl);
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.3 + k * 0.7;
      vortex.add(t);
    }
    vortex.position.set(w.X(-5), 0, -36);
    w.D.add(vortex);
    w.exit(-6, -4, -37, -35, 'bastion', 'stormDrop', { ok: () => !!s().bossKey, blocked: 'The storm wind howls, but it will not carry Cello yet.' });
    w.onUpdate.push((dt) => {
      vortex.visible = !!s().bossKey;
      vortex.children.forEach((c, i) => { c.rotation.z += dt * (1.5 + i); });
    });
    w.inscription(5, -33.2, Math.PI, ['Carved into the iron:', '"From the crown, the storm wind falls straight to the giant\'s door."']);
    w.onUpdate.push((dt, p, g) => {
      w.boltT = (w.boltT ?? 2) - dt;
      if (w.boltT <= 0) {
        w.boltT = 4 + Math.random() * 5;
        const top = w.V(0, 9, -45);
        g.fx.bolt(top.clone().add(V3((Math.random() - 0.5) * 30, 60, (Math.random() - 0.5) * 30)), top, 0.35);
        g.lights.flash(top, 0xbfe8ff, 50, 30, 0.3);
        g.sfx.play('thunder', { vol: 0.5, delay: 0.1 });
      }
    });
    a.map.floor = 'Roof';
  });

  return wings;
}

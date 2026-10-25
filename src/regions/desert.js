// The Ember Wastes: öknen bakom den gyllene porten. Sanddyner, halvt begravda ruiner av solgudens
// rike, oasen Sunwell (vila, handel, prästinnan Nefret), en förstörd karavan där Cello får välja,
// och längst i öster The Sun-Scorched Pyramid som svävar över avgrunden.
//
// Koordinater: x 8000 (öknen). Vägen går från bron i väster, genom oasen, förbi karavanen och upp
// för den stora trappan till pyramidens port.
import * as THREE from 'three';
import { box, cyl, rockGeo, place, hash2, breakTop } from '../geom.js';
import { DECK } from '../build.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const X0 = 8000;

export function buildDesert(B, areas) {
  const { M, rand } = B;
  const a = areas.create({
    id: 'desert', name: 'The Ember Wastes', sub: 'Where the sun god once ruled',
    fog: { color: 0x5e4a3a, near: 60, far: 430 },
    light: { hemi: 1.75, moon: 1.45, flash: 0.8 },
  });
  B.begin(a);
  B.bounds(X0 - 240, X0 + 300, -215, 215);
  const R = (pts) => pts.map(([x, z]) => [X0 + x, z]);
  const OASIS = { x: X0 - 40, z: 30 };
  const POND = { x: X0 - 40, z: 56, r: 12 };
  const CARAVAN = { x: X0 + 70, z: -24 };
  const westRoad = R([[-198, 0], [-160, 6], [-120, -4], [-84, 10], [-62, 22]]);
  const eastRoad = R([[-18, 22], [10, 8], [40, -12], [70, -20], [105, -16], [140, -4], [170, 0], [199, 0]]);
  const templeRoad = R([[-84, 10], [-88, -30], [-90, -62]]);
  // 0.12: vägen söderut till trappan ner i nekropolen
  const NECRO = { x: X0 + 40, z: 164 };
  const southRoad = R([[10, 8], [18, 40], [30, 90], [38, 130], [40, 154]]);
  const roads = [westRoad, eastRoad, templeRoad, southRoad].map((pts) => ({ pts, w: 3.4 }));
  const isl = B.island({
    cx: X0, cz: 0, baseR: 200, rNoise: 16, seed: 801, amp: 0.9, hills: 9, hillFreq: 0.013,
    keepAngles: [Math.PI, 0], depth: 80, rings: 62, segs: 190, label: 'The Ember Wastes',
    topMat: M.sand, mapCol: '#6a5638',
    pads: [
      { x: X0 - 198, z: 0, r: 7, h: 0 }, { x: X0 + 199, z: 0, r: 8, h: 0.2 },
      { x: OASIS.x, z: OASIS.z, r: 26, h: 0.4 }, { x: CARAVAN.x, z: CARAVAN.z, r: 10, h: 0.3 },
      { x: X0 - 90, z: -72, r: 14, h: 0.6 }, { x: X0 + 22, z: 44, r: 9, h: 0.6 }, { x: X0 - 120, z: 52, r: 8, h: 0.5 },
      { x: X0 + 60, z: 62, r: 12, h: 0.4 }, { x: X0 + 180, z: 0, r: 14, h: 0.2 },
      { x: NECRO.x, z: NECRO.z, r: 12, h: 0.3 },
      // Oasens damm: en skål i sanden (läggs sist så att den vinner över oasens platta mark)
      { x: POND.x, z: POND.z, r: 19, h: -1.7 },
    ],
    roads,
    grass: 700,
    avoid: (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 1,
    tint: (x, z) => 0.82 + 0.2 * Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2.2),
  });
  const H = isl.H;
  for (const r of roads) B.road(r.pts, r.w, H, M.roadStone, 0.06);

  // ---------- bron från den gyllene porten och dimman ----------
  B.bridge('x', X0 - 234, X0 - 197, 0, DECK, { rails: true });
  B.mist(X0 - 234, -3, 0, 11, 5, 9, { axis: 'x' });
  for (const s of [-1, 1]) B.obelisk(X0 - 192, H(X0 - 192, s * 5), s * 5, 7, 0.1 * s);
  B.sign(X0 - 186, H(X0 - 186, 3.6), 3.6, -Math.PI / 2, ['Carved in old letters on a sandstone slab:', '"Here begins the realm of Ra. Walk in the light, or do not walk at all."']);

  // ---------- oasen Sunwell ----------
  {
    // Dammen med vass, palmer runt om
    let bank = Infinity;
    for (let i = 0; i < 40; i++) {
      const ang = (i / 40) * Math.PI * 2;
      bank = Math.min(bank, H(POND.x + Math.cos(ang) * (POND.r + 0.6), POND.z + Math.sin(ang) * (POND.r + 0.6)));
    }
    const wy = Math.max(H(POND.x, POND.z) + 0.5, bank - 0.2);
    B.water(POND.x, wy, POND.z, POND.r + 2, POND.r + 2);
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const x = POND.x + Math.cos(ang) * (POND.r + 0.2), z = POND.z + Math.sin(ang) * (POND.r + 0.2);
      B.hidden(new THREE.BoxGeometry(2.2, 3, 0.6), x, H(x, z) + 1.2, z, 0, -ang + Math.PI / 2, 0);
      if (i % 2) B.deco(new THREE.Mesh(box(0.05, 1.0, 0.05, 1), M.crop), x + Math.cos(ang) * 0.8, H(x, z) + 0.5, z + Math.sin(ang) * 0.8);
    }
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * Math.PI * 2 + 0.3, r = POND.r + 3.2 + hash2(i, 2) * 3;
      const x = POND.x + Math.cos(ang) * r, z = POND.z + Math.sin(ang) * r;
      B.palm(x, H(x, z), z, 1.1 + hash2(i, 5) * 0.4, 0.4 + hash2(i, 3) * 0.5, -ang + Math.PI);
    }
    // Marknaden: Hamids stånd med varor och en kamelsadel
    const mx = OASIS.x + 10, mz = OASIS.z - 16;
    B.canopy(mx, H(mx, mz), mz, 0.2, M.clothTeal, 4.2, 3.0, 2.4);
    B.table(mx, H(mx, mz), mz + 0.6, 0.2);
    for (let i = 0; i < 4; i++) B.deco(new THREE.Mesh(cyl(0.12, 0.15, 0.3, 8, 1), i % 2 ? M.copper : M.clothRed), mx - 0.6 + i * 0.4, H(mx, mz) + 0.98, mz + 0.6);
    for (const [dx, dz] of [[-2.4, -0.8], [-2.8, 0.4], [2.2, -1.2]]) B.barrel(mx + dx, H(mx + dx, mz + dz), mz + dz);
    B.crate(mx + 2.6, H(mx + 2.6, mz + 0.6), mz + 0.6, 0.7, 0.3);
    // Nefrets helgedom: ett litet sandstenstempel med en falkstaty
    const sx = OASIS.x - 14, sz = OASIS.z - 18, sy = H(sx, sz);
    {
      const g = B.groupAt(sx, sy, sz, 0.5);
      B.put(g, new THREE.Mesh(box(7, 0.5, 6, 2), M.sandstone), 0, 0.15, 0, true);
      for (const [cx, cz] of [[-2.8, -2.2], [2.8, -2.2], [-2.8, 2.2], [2.8, 2.2]]) B.put(g, new THREE.Mesh(cyl(0.35, 0.4, 3.4, 8, 1.5), M.hiero), cx, 2.1, cz, true);
      B.put(g, new THREE.Mesh(box(7.4, 0.5, 6.4, 2), M.sandstoneDark), 0, 4.0, 0);
      B.put(g, new THREE.Mesh(box(1.6, 1.0, 1.6, 1.5), M.sandstoneDark), 0, 0.9, -1.4, true);
      // Falken: kropp, vingar och huvud med en solskiva
      B.put(g, new THREE.Mesh(box(0.6, 1.2, 0.5, 1), M.goldPlate), 0, 2.0, -1.4);
      for (const s2 of [-1, 1]) {
        const wing = new THREE.Mesh(box(0.12, 1.0, 0.45, 1), M.goldPlate);
        wing.rotation.z = s2 * 0.25;
        B.put(g, wing, s2 * 0.38, 2.0, -1.4);
      }
      B.put(g, new THREE.Mesh(box(0.42, 0.42, 0.42, 1), M.goldPlate), 0, 2.85, -1.3);
      B.put(g, new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4).rotateX(Math.PI / 2), M.goldPlate), 0, 2.8, -1.0);
      const disc = new THREE.Mesh(cyl(0.38, 0.38, 0.08, 14, 1), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
      disc.rotation.x = Math.PI / 2;
      B.put(g, disc, 0, 3.35, -1.4);
      B.lights.add({ x: sx, y: sy + 3, z: sz, color: 0xffc070, power: 9, range: 8, flicker: 0.3 });
      for (const s2 of [-1, 1]) {
        const p = B.local(g, s2 * 1.3, 0, 0.6);
        B.makeFire(p.x, sy + 1.25, p.z, 0.4, 0, 2);
        B.deco(new THREE.Mesh(cyl(0.25, 0.15, 0.4, 8, 1), M.copper), p.x, sy + 1.05, p.z);
        B.deco(new THREE.Mesh(cyl(0.06, 0.12, 0.9, 6, 1), M.sandstoneDark), p.x, sy + 0.6, p.z);
      }
    }
    // Tält, mattor och en eld att vila vid
    B.tent(OASIS.x + 16, H(OASIS.x + 16, OASIS.z + 10), OASIS.z + 10, 2.5, M.clothWhite, 2.8, 3.2, 2.0);
    B.tent(OASIS.x - 20, H(OASIS.x - 20, OASIS.z + 6), OASIS.z + 6, 1.2, M.clothRed, 2.6, 3.0, 1.9);
    B.canopy(OASIS.x - 4, H(OASIS.x - 4, OASIS.z - 14), OASIS.z - 14, -0.3, M.clothWhite, 3.6, 3.0, 2.2);
    for (const [x, z, ry, m] of [[-4, -14, -0.3, M.clothRed], [8, 8, 0.6, M.clothPurple], [-10, 10, 1.2, M.clothTeal]]) {
      B.deco(new THREE.Mesh(box(2.2, 0.03, 1.4, 1), m), OASIS.x + x, H(OASIS.x + x, OASIS.z + z) + 0.04, OASIS.z + z).rotation.y = ry;
    }
    var fire = V3(OASIS.x + 2, 0, OASIS.z + 6);
    fire.y = H(fire.x, fire.z);
    B.campfire(fire.x, fire.y, fire.z, 26);
    a.rests = [{ pos: fire, entry: 'rest', label: 'Rest by the fire', prompt: 'The oasis fire smells of cedar and spice. Rest a while?', text: 'Cello rests at the Sunwell oasis...' }];
    B.well(OASIS.x + 14, H(OASIS.x + 14, OASIS.z + 4), OASIS.z + 4);
    for (const [x, z] of [[13, -12], [13.8, -11], [-18, 0], [-17, 1], [17, 14], [-24, 12]]) B.pot(OASIS.x + x, H(OASIS.x + x, OASIS.z + z), OASIS.z + z, 0.9);
    for (const [x, z] of [[18, 10], [-26, -4], [0, -20], [20, -14]]) B.lampPost(OASIS.x + x, H(OASIS.x + x, OASIS.z + z), OASIS.z + z, 9);
    // Oasen är liten på kartan: bara symboler, och namnet på oasen
    a.map.pois.push({ x: fire.x, z: fire.z, label: '', icon: 'fire' });
    a.map.pois.push({ x: mx, z: mz, label: '', icon: 'shop' });
    a.map.pois.push({ x: sx, z: sz, label: '', icon: 'seer' });
    a.map.pois.push({ x: POND.x, z: POND.z + 18, label: 'Sunwell Oasis', icon: 'tree' });
  }

  // ---------- den förstörda karavanen ----------
  {
    const cx = CARAVAN.x, cz = CARAVAN.z, y = H(cx, cz);
    B.cart(cx - 2, y, cz - 0.6, 0.4, { cover: M.clothWhite });
    B.cart(cx + 4, y, cz - 2, -0.9, { load: true });
    for (const [dx, dz, r] of [[1, 3, 0.4], [2.2, 2.4, 1.0], [-4.5, -1.5, 0.3], [5.6, 1.5, 0.8]]) B.crate(cx + dx, H(cx + dx, cz + dz), cz + dz, 0.7, r, false);
    for (let i = 0; i < 5; i++) {
      const cl = new THREE.Mesh(box(1.2, 0.02, 0.8, 1), [M.clothTeal, M.clothRed, M.clothWhite][i % 3]);
      cl.rotation.set(0, i * 1.3, 0.1);
      B.deco(cl, cx - 3 + i * 1.6, H(cx - 3 + i * 1.6, cz - 3 + (i % 2) * 5) + 0.03, cz - 3 + (i % 2) * 5);
    }
    B.rock(cx - 7, H(cx - 7, cz + 4), cz + 4, 1.4, 1950, true, M.sandRock);
    a.map.pois.push({ x: cx, z: cz, label: 'Wrecked caravan', icon: 'ruin' });
    // Tareks börs i sanden bredvid honom (försvinner när Cello har valt)
    var satchel = new THREE.Group();
    satchel.position.set(cx - 0.4, H(cx - 0.4, cz + 2.9), cz + 2.9);
    satchel.rotation.y = 0.6;
    satchel.add(place(new THREE.Mesh(box(0.55, 0.32, 0.36, 1), M.woodDark), 0, 0.16, 0));
    satchel.add(place(new THREE.Mesh(box(0.57, 0.06, 0.3, 1), M.clothRed), 0, 0.33, -0.03));
    for (let i = 0; i < 5; i++) satchel.add(place(new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: [0x4ad06a, 0x6a9aff, 0xd8382f, 0xb06aff, 0x4ad06a][i] })), -0.35 + i * 0.13, 0.04, 0.3 + (i % 2) * 0.08));
    B.add(satchel);
  }

  // ---------- ruiner längs vägen ----------
  // Obeliskpar som visar vägen
  for (const [x, z] of [[-150, 6], [-100, 2], [30, -6], [120, -14]]) {
    for (const s of [-1, 1]) {
      const px = X0 + x, pz = z + s * 6.5;
      B.obelisk(px, H(px, pz), pz, 6 + hash2(x, s) * 3, 0.1, hash2(z, s) > 0.6);
    }
  }
  // Ett jättehuvud av sten, halvt begravt i sanden, med en kista bakom
  {
    const x = X0 - 120, z = 52, y = H(x, z);
    const g = B.groupAt(x, y - 1.2, z, 0.9);
    B.put(g, new THREE.Mesh(box(4.4, 4.6, 4.0, 2), M.sandstone), 0, 2.3, 0, true);
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(box(1.2, 4.8, 3.4, 2), M.lapis);
      flap.rotation.z = s * 0.12;
      B.put(g, flap, s * 2.6, 1.8, -0.2, true);
    }
    B.put(g, new THREE.Mesh(box(4.6, 1.0, 4.2, 2), M.lapis), 0, 4.9, 0);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(box(0.9, 0.35, 0.2, 1), M.obsidian), s * 1.0, 3.1, 2.02);
    B.put(g, new THREE.Mesh(box(0.6, 1.2, 0.6, 1), M.sandstone), 0, 2.3, 2.2);
    B.put(g, new THREE.Mesh(box(1.4, 0.3, 0.2, 1), M.sandstoneDark), 0, 1.3, 2.05);
    B.chest('desertHead', x - 4, H(x - 4, z - 3.4), z - 3.4, -2.2, { item: 'potion' });
    a.map.pois.push({ x, z, label: 'Fallen king', icon: 'ruin' });
  }
  // Sfinxen som vakar över vägen
  {
    const x = X0 + 22, z = 44, y = H(x, z);
    const g = B.groupAt(x, y, z, Math.PI * 0.85);
    B.put(g, new THREE.Mesh(box(3.2, 1.2, 8, 2), M.sandstoneDark), 0, 0.6, 0, true);
    B.put(g, new THREE.Mesh(box(2.8, 2.2, 5.6, 2), M.sandstone), 0, 2.0, -0.8, true);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(box(0.9, 0.7, 3.0, 2), M.sandstone), s * 0.9, 1.5, 3.2, true);
    B.put(g, new THREE.Mesh(box(2.2, 2.4, 2.2, 2), M.sandstone), 0, 4.0, 2.0, true);
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(box(0.6, 2.0, 1.4, 1.5), M.lapis);
      flap.rotation.z = s * 0.15;
      B.put(g, flap, s * 1.25, 3.8, 1.9);
    }
    B.put(g, new THREE.Mesh(box(2.4, 0.5, 2.4, 1.5), M.lapis), 0, 5.35, 2.0);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(box(0.45, 0.2, 0.1, 1), M.obsidian), s * 0.5, 4.3, 3.12);
    a.map.pois.push({ x, z, label: 'Sphinx', icon: 'ruin' });
  }
  // Pelarskog: ett tempel vars tak föll för länge sedan
  {
    const cx = X0 + 60, cz = 62;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
      const x = cx - 9 + i * 6, z = cz - 6 + k * 6;
      B.lotusColumn(x, H(x, z) - 0.2, z, 6, hash2(i, k) > 0.45);
    }
    B.deco(new THREE.Mesh(box(20, 0.3, 14, 2), M.sandstoneDark), cx, H(cx, cz) + 0.02, cz);
    B.pot(cx - 6, H(cx - 6, cz + 4), cz + 4);
    B.pot(cx + 7, H(cx + 7, cz - 4), cz - 4, 0.9);
    a.map.pois.push({ x: cx, z: cz, label: 'Hall of columns', icon: 'ruin' });
  }
  // Det begravda templet i söder, med en kista innanför
  {
    const x = X0 - 90, z = -72, y = H(x, z);
    const g = B.groupAt(x, y, z, 0);
    B.put(g, new THREE.Mesh(box(14, 0.6, 12, 2), M.sandstoneDark), 0, 0.1, 0, true);
    B.put(g, new THREE.Mesh(box(14, 4.4, 1.2, 2), M.hiero), 0, 2.2, -5.4, true);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(box(1.2, 4.4, 10.8, 2), M.hiero), s * 6.4, 2.2, 0.6, true);
    for (const s of [-1, 1]) B.put(g, new THREE.Mesh(box(4.4, 4.4, 1.2, 2), M.hiero), s * 4.2, 2.2, 5.4, true);
    B.put(g, new THREE.Mesh(box(14.4, 0.8, 12.4, 2), M.sandstone), 0, 4.8, 0);
    // Sanddrivor som har blåst in genom porten
    for (let i = 0; i < 3; i++) B.put(g, new THREE.Mesh(new THREE.SphereGeometry(2.2 - i * 0.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.sandRock), -3 + i * 3, 0, 4.2 - i * 0.6);
    B.chest('desertTemple', x, y + 0.4, z - 3, 0, { shards: 15 });
    B.lights.add({ x, y: y + 2, z: z - 2, color: 0xffb060, power: 6, range: 7, flicker: 0.5 });
    a.map.pois.push({ x, z, label: 'Buried temple', icon: 'ruin' });
  }
  // Solur och kringspridda stenblock
  {
    const x = X0 - 6, z = -40, y = H(x, z);
    B.solid(place(new THREE.Mesh(cyl(3.2, 3.4, 0.4, 16, 2), M.sandstone), x, y + 0.1, z));
    B.solid(place(new THREE.Mesh(box(0.3, 3.4, 1.6, 1), M.sandstoneDark), x, y + 1.9, z));
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      B.deco(new THREE.Mesh(box(0.1, 0.03, 0.6, 1), M.obsidian), x + Math.cos(ang) * 2.7, y + 0.32, z + Math.sin(ang) * 2.7).rotation.y = -ang + Math.PI / 2;
    }
  }
  for (let i = 0; i < 60; i++) {
    const ang = rand() * Math.PI * 2, r = 20 + rand() * 175, x = X0 + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (roads.some((rd) => rd.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7)) || Math.hypot(x - OASIS.x, z - OASIS.z) < 32) continue;
    if (rand() < 0.55) B.rock(x, H(x, z), z, 0.6 + rand() * 2.2, 2000 + i, true, M.sandRock);
    else {
      // Död buske: grå kvistar
      for (let k = 0; k < 4; k++) {
        const tw = new THREE.Mesh(cyl(0.02, 0.05, 0.9, 4, 1), M.char);
        tw.rotation.set((k - 1.5) * 0.4, k, (k % 2 ? 1 : -1) * 0.5);
        B.deco(tw, x, H(x, z) + 0.35, z);
      }
    }
  }
  for (let i = 0; i < 14; i++) {
    const ang = rand() * Math.PI * 2, r = 40 + rand() * 150, x = X0 + Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (roads.some((rd) => rd.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 8))) continue;
    B.palm(x, H(x, z), z, 0.9 + rand() * 0.4, 0.5 + rand() * 0.6, rand() * 6);
  }

  // ---------- trappan upp till pyramiden ----------
  const LEDGE_Y = 6;
  const rampX0 = X0 + 196, rampX1 = X0 + 232;
  {
    const y0 = H(rampX0, 0);
    const run = rampX1 - rampX0, rise = LEDGE_Y - y0, thick = 0.6;
    const th = Math.atan2(rise, run), len = Math.hypot(run, rise);
    const ramp = new THREE.Mesh(box(len, thick, 6, 2), M.sandstone);
    ramp.position.set((rampX0 + rampX1) / 2 + Math.sin(th) * thick / 2, y0 + rise / 2 - Math.cos(th) * thick / 2, 0);
    ramp.rotation.z = th;
    B.solid(ramp);
    // Trappsteg som syns ovanpå rampen, och räcken
    for (let k = 0; k < 24; k++) {
      const t = (k + 0.5) / 24, x = rampX0 + run * t, y = y0 + rise * t;
      B.deco(new THREE.Mesh(box(0.12, 0.06, 6, 1), M.sandstoneDark), x, y + 0.03, 0);
    }
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(box(len, 0.9, 0.5, 1.5), M.sandstoneDark);
      rail.position.set((rampX0 + rampX1) / 2, y0 + rise / 2 + 0.4, s * 3.2);
      rail.rotation.z = th;
      B.solid(rail);
    }
    // Pelare under trappan, ner i avgrunden
    for (const x of [X0 + 206, X0 + 218, X0 + 228]) {
      const yy = y0 + rise * ((x - rampX0) / run);
      B.deco(new THREE.Mesh(box(4, 24, 4, 2), M.sandstoneDark), x, yy - 12.5, 0);
    }
    // Sfinxer på var sida om trappans fot
    for (const s of [-1, 1]) {
      const g = B.groupAt(X0 + 192, H(X0 + 192, s * 6), s * 6, Math.PI / 2);
      B.put(g, new THREE.Mesh(box(1.6, 1.2, 3.6, 1.5), M.sandstone), 0, 0.6, 0, true);
      B.put(g, new THREE.Mesh(box(1.2, 1.4, 1.2, 1.5), M.sandstone), 0, 1.9, 1.3);
      B.put(g, new THREE.Mesh(box(1.4, 0.4, 1.4, 1.5), M.lapis), 0, 2.7, 1.3);
    }
  }
  // Avsatsen framför porten
  B.solid(place(new THREE.Mesh(box(12, 1.2, 14, 2), M.sandstone), X0 + 236, LEDGE_Y - 0.6, 0));
  for (const s of [-1, 1]) {
    B.solid(place(new THREE.Mesh(box(12, 0.9, 0.5, 1.5), M.sandstoneDark), X0 + 236, LEDGE_Y + 0.45, s * 7));
    B.obelisk(X0 + 233, LEDGE_Y, s * 5.4, 5, 0);
  }

  // ---------- The Sun-Scorched Pyramid ----------
  const PX = X0 + 268, HALF = 28, PH = 40;
  {
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(HALF * Math.SQRT2, PH, 4, 1), M.goldPlate);
    pyr.rotation.y = Math.PI / 4;
    B.deco(pyr, PX, LEDGE_Y + PH / 2, 0);
    // Den gyllene toppen (pyramidion) och ett sken
    const tip = new THREE.Mesh(new THREE.ConeGeometry(3.2 * Math.SQRT2, 4.6, 4, 1), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    tip.rotation.y = Math.PI / 4;
    tip.position.set(PX, LEDGE_Y + PH - 2.3 + 0.02, 0);
    B.add(tip);
    // Klippan som pyramiden vilar på, svävande över avgrunden
    const under = new THREE.Mesh(new THREE.ConeGeometry(HALF * 1.25, 44, 7, 1), M.sandRock);
    under.rotation.x = Math.PI;
    B.deco(under, PX, LEDGE_Y - 22.5, 0);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      B.deco(new THREE.Mesh(rockGeo(2 + hash2(i, 1) * 3, 2100 + i, 0.8), M.sandRock), PX + Math.cos(ang) * HALF * 1.05, LEDGE_Y - 3 - hash2(i, 4) * 6, Math.sin(ang) * HALF * 1.05);
    }
    // Porten: en mörk öppning i västra sidan, med en gyllene ram och ett solöga ovanför
    const doorX = PX - HALF + 0.4;
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshBasicMaterial({ color: 0x080604, fog: false }));
    dark.rotation.y = -Math.PI / 2;
    dark.position.set(doorX - 0.05, LEDGE_Y + 2.2, 0);
    B.add(dark);
    for (const s of [-1, 1]) B.deco(new THREE.Mesh(box(0.8, 5.0, 0.6, 1), M.hiero), doorX - 0.3, LEDGE_Y + 2.5, s * 1.9);
    B.deco(new THREE.Mesh(box(0.8, 0.8, 4.6, 1), M.goldPlate), doorX - 0.3, LEDGE_Y + 5.1, 0);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), new THREE.MeshBasicMaterial({ color: 0xffc860 }));
    eye.rotation.y = -Math.PI / 2;
    eye.position.set(doorX - 0.75, LEDGE_Y + 6.6, 0);
    B.add(eye);
    B.lights.add({ x: doorX - 2, y: LEDGE_Y + 3, z: 0, color: 0xffb860, power: 14, range: 12, flicker: 0.2 });
    // Kollision: pyramidens sidor, utom porten
    for (const s of [-1, 1]) B.hidden(new THREE.BoxGeometry(HALF * 2, 30, HALF - 1.6), PX, LEDGE_Y + 15, s * (1.6 + (HALF - 1.6) / 2));
    B.hidden(new THREE.BoxGeometry(HALF * 2 - 6, 30, 3.4), PX + 3, LEDGE_Y + 15, 0);
    B.hidden(new THREE.BoxGeometry(3, 30, 3.4), PX - HALF + 1.5, LEDGE_Y + 4.4 + 15, 0);
    a.map.pois.push({ x: PX, z: 0, label: 'Sun-Scorched Pyramid', icon: 'stone' });
    a.map.rects.push({ kind: 'house', x: PX, z: 0, w: HALF * 2, d: HALF * 2, ry: 0, label: '' });
  }

  // ---------- kulisser: fältet i väster, berg i norr och den sjunkna nekropolen i söder ----------
  B.backdrop(X0 - 560, 40, 220, -6, 811, { rings: 10, segs: 56, amp: 3, hills: 6, hillFreq: 0.02 });
  for (const [x, z, r, y] of [[-60, -330, 60, 18], [90, -360, 70, 26], [220, -300, 40, 10]]) {
    const b = B.backdrop(X0 + x, z, r, y, 820 + x, { topMat: M.sandRock, rings: 6, segs: 28 });
    for (let k = 0; k < 4; k++) {
      const px = X0 + x + (k - 1.5) * r * 0.35, pz = z + Math.sin(k * 1.9) * r * 0.3, h = 24 + hash2(k, x) * 30;
      B.deco(new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, h, 5), M.sandRock), px, b.H(px, pz) + h / 2 - 2, pz);
    }
  }
  {
    // Nekropolen: en sjunken krater med brutna pelare och ett schakalhuvud som sticker upp
    const nx = X0 + 40, nz = 330;
    const b = B.backdrop(nx, nz, 80, -10, 840, { topMat: M.sandRock, rings: 8, segs: 36 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2, px = nx + Math.cos(ang) * 40, pz = nz + Math.sin(ang) * 30;
      const h = 8 + hash2(i, 7) * 10;
      B.deco(new THREE.Mesh(breakTop(cyl(1.4, 1.6, h, 8), h, 1.2), M.sandstoneDark), px, b.H(px, pz) + h / 2, pz);
    }
    const head = new THREE.Group();
    head.position.set(nx, b.H(nx, nz) + 6, nz);
    head.add(place(new THREE.Mesh(box(8, 9, 10, 2), M.obsidian), 0, 0, 0));
    head.add(place(new THREE.Mesh(box(4, 4, 8, 2), M.obsidian), 0, -1.5, -8));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(2, 9, 4), M.obsidian);
      ear.position.set(s * 2.6, 8, 1.5);
      head.add(ear);
    }
    head.rotation.y = Math.PI * 0.9;
    a.S.add(head);
  }
  for (const [x, z, r, y] of [[-260, -160, 30, 14], [300, 160, 26, -12], [-200, 220, 30, 8]]) B.backdrop(X0 + x, z, r, y, 860 + x);

  // ---------- 0.12: porten ner i den sjunkna nekropolen ----------
  // En gravbyggnad av svart sten (en mastaba) med en mörk port mot norr, där trappan går ner.
  // Tills ormen i pyramiden har fallit är porten igensatt av sand.
  const necroY = H(NECRO.x, NECRO.z);
  {
    const x = NECRO.x, z = NECRO.z, y = necroY;
    const ND = new THREE.MeshLambertMaterial({ color: 0x23282a, flatShading: true });
    B.solid(place(new THREE.Mesh(box(9, 3.6, 7, 2), ND), x, y + 1.6, z + 1.5));
    B.solid(place(new THREE.Mesh(box(7.6, 1.2, 5.6, 2), ND), x, y + 4.0, z + 1.5));
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), new THREE.MeshBasicMaterial({ color: 0x030505, fog: false }));
    dark.rotation.y = Math.PI;
    dark.position.set(x, y + 1.5, z - 2.02);
    B.add(dark);
    for (const s of [-1, 1]) B.deco(new THREE.Mesh(box(0.5, 3.4, 0.5, 1), M.obsidian), x + s * 1.5, y + 1.7, z - 2.2);
    B.deco(new THREE.Mesh(box(3.6, 0.5, 0.6, 1), M.goldPlate), x, y + 3.4, z - 2.2);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), new THREE.MeshBasicMaterial({ color: 0x6af0d4 }));
    glow.rotation.y = Math.PI;
    glow.position.set(x, y + 4.0, z - 2.25);
    B.add(glow);
    B.lights.add({ x, y: y + 2.5, z: z - 3.5, color: 0x6ae0c8, power: 8, range: 9, flicker: 0.4 });
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.3, r = 9;
      if (Math.sin(ang) < -0.55) continue; // inga pelare framför porten
      const px = x + Math.cos(ang) * r, pz = z + 1.5 + Math.sin(ang) * r, h = 3 + hash2(i, 41) * 4;
      B.solid(place(new THREE.Mesh(breakTop(cyl(0.6, 0.7, h, 8), h, 0.6), ND), px, H(px, pz) + h / 2 - 0.2, pz));
    }
    // Två schakaler som vaktar porten
    for (const s of [-1, 1]) {
      const g = B.groupAt(x + s * 3.6, y, z - 4.2, Math.PI);
      B.put(g, new THREE.Mesh(box(1.2, 0.5, 1.8, 1), ND), 0, 0.25, 0, true);
      B.put(g, new THREE.Mesh(box(0.7, 1.4, 0.8, 1), M.obsidian), 0, 1.2, 0.2, true);
      B.put(g, new THREE.Mesh(box(0.45, 0.4, 0.55, 1), M.obsidian), 0, 2.1, 0.35);
      for (const e of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), M.obsidian);
        ear.position.set(e * 0.13, 2.5, 0.3);
        g.add(ear);
      }
    }
    B.sign(x - 4.2, H(x - 4.2, z - 6), z - 6, Math.PI, ['Carved into black stone, half buried:', '"Below lies the house of Anubis, where hearts were weighed. Let none descend who fear the dead."']);
    a.map.pois.push({ x, z, label: 'The Sunken Necropolis', icon: 'ruin' });
  }
  // Sanden som fyller porten (försvinner när pyramiden är besegrad)
  const necroSand = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.sand);
  necroSand.scale.set(1.2, 1.4, 0.8);
  necroSand.position.set(NECRO.x, necroY - 0.1, NECRO.z - 2.4);
  a.root.add(necroSand);

  // ---------- fiender ----------
  const VV = (x, z) => V3(X0 + x, H(X0 + x, z), z);
  const pack = (cx, cz, n, opts = {}) => {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, h = VV(cx + Math.cos(ang) * 4, cz + Math.sin(ang) * 4);
      B.enemy(h, [VV(cx + Math.cos(ang + 1) * 7, cz + Math.sin(ang + 1) * 7), VV(cx + Math.cos(ang - 1) * 6, cz + Math.sin(ang - 1) * 6)], i === 0 ? opts : {});
    }
  };
  pack(-150, -20, 3);
  pack(-100, 40, 2, { kind: 'shield' });
  pack(10, -30, 3);
  pack(60, 50, 2, { kind: 'shield' });
  pack(-88, -50, 2);
  pack(120, -40, 3, { kind: 'shield' });
  pack(150, 30, 2);
  for (const [x, z] of [[-60, -10], [90, 10], [170, -20], [186, 14]]) B.enemy(VV(x, z), [], { kind: 'bat' });

  a.entries = {
    west: { pos: V3(X0 - 216, DECK, 0), facing: Math.PI / 2 },
    pyramid: { pos: V3(PX - HALF - 3.5, LEDGE_Y, 0), facing: -Math.PI / 2 },
    rest: { pos: V3(fire.x + 1.8, H(fire.x + 1.8, fire.z + 1.4), fire.z + 1.4), facing: -2.3 },
    necropolis: { pos: V3(NECRO.x, necroY + 0.1, NECRO.z - 5.5), facing: Math.PI },
  };
  a.exits = [
    { x0: X0 - 270, x1: X0 - 233, z0: -3, z1: 3, to: 'field', entry: 'sunGate' },
    { x0: PX - HALF + 0.5, x1: PX - HALF + 6, z0: -1.6, z1: 1.6, y: LEDGE_Y, dy: 3, to: 'pyramid', entry: 'south' },
    { x0: NECRO.x - 1.3, x1: NECRO.x + 1.3, z0: NECRO.z - 3.0, z1: NECRO.z - 1.5, to: 'ncrypts', entry: 'entrance', necro: true, text: 'The stair winds down into the dark...' },
  ];
  a.map.exits = [{ x: X0 - 233, z: 0, label: 'The Stormvale', to: 'field' }, { x: PX - HALF, z: 0, label: 'The Pyramid', to: 'pyramid' }];
  // Sanna om punkten ligger i oasen (där fiender inte går)
  a.isSafe = (x, z) => Math.hypot(x - OASIS.x, z - OASIS.z) < 34;
  B.end();

  return {
    npcs: {
      nefret: { area: 'desert', pos: VV(-40 - 14 + 1.7, 30 - 18 + 3.2), face: 0.5 },
      hamid: { area: 'desert', pos: VV(-40 + 10, 30 - 16 - 0.6), face: 0.2 },
      sabi: { area: 'desert', pos: VV(-40, 56 - 13), face: 0, wander: { center: VV(-40, 56), radius: 13.6 } },
      tarek: { area: 'desert', pos: VV(70 - 1.2, -24 + 1.6), face: 2.6, pose: 'hurt' },
    },
    tarekOasis: { pos: VV(-40 + 4.4, 30 + 7.6), face: -2.2 },
    caravan: VV(70, -24),
    // Trappan till nekropolen är full av sand tills Apophis har fallit
    onEnter(id, state) {
      if (id !== 'desert') return;
      necroSand.visible = !state?.pyramidDone;
    },
    satchel,
    animals: [0, 1].map((i) => ({ kind: 'camel', area: 'desert', pos: VV(-40 + 18 + i * 3, 30 - 2 + i * 2), center: VV(-40 + 19, 30), radius: 3.5, H })),
    H,
  };
}

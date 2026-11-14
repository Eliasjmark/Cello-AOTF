// Folket ute i världen (0.6): ranchen, vakten i passet, pilgrimen på bron, handlerskan på fältet,
// byborna i Willowmere, spåkvinnan som vet nästa uppdrag och spejaren i Stormreach.
// Här finns också butikerna, kistorna, eldfaten som tänds med lyktan, djuren och övningsdockan.
import * as THREE from 'three';
import { animateLid } from './chestlid.js';
import { Npc } from './npcs.js';
import { SWORD_MAX } from './player.js';
import { box, cyl } from './geom.js';
import { shardWord } from './items.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Priser i skärvor
export const PRICES = { lantern: 40, oil: 10, flask: 12, magsFlask: 16, hamidFlask: 14, potion: 20, sword: 30, reforge: 20, magsOil: 14, magsPotion: 25, hamidOil: 12, hamidPotion: 22, hamidSword: 34 };

const LOOKS = {
  hollis: { name: 'Hollis', look: { sculpt: 'bybo', skin: 0xb88a68, hairStyle: 'bald', beard: 0x8a7a6a, top: 0x6a5238, bottom: 0x3a3228, extraColor: 0x4a3a28, width: 1.18, scale: 1.0 } },
  nell: { name: 'Nell', look: { skin: 0xd0aa8c, hair: 0x6a4a3a, hairStyle: 'bun', top: 0x7a6a8a, apron: true, extraColor: 0xd8cfb4, robe: true, scale: 0.9 } },
  tilly: { name: 'Tilly', look: { skin: 0xd8b090, hair: 0xa86a3a, hairStyle: 'long', top: 0x8a4a4a, scale: 0.56 } },
  garrick: { name: 'Garrick', look: { skin: 0xa8805f, helmet: true, beard: 0x3a2a20, top: 0x4a5a6a, extraColor: 0x6a5a40, item: 'spear', width: 1.1, scale: 1.0 } },
  odo: { name: 'Odo', look: { sculpt: 'bybo', skin: 0xc49f83, hairStyle: 'hood', hood: 0x6a5a40, top: 0x6a5a40, robe: true, beard: 0xd8d0c0, scale: 0.88 } },
  mags: { name: 'Mags', look: { skin: 0xc8a080, hair: 0x9a9a9a, hairStyle: 'bun', shawl: 0x7a3a4a, top: 0x5a4a3a, robe: true, scale: 0.86, width: 1.15 } },
  pell: { name: 'Pell', look: { skin: 0xd0a888, hair: 0x3a2a1a, top: 0x3a5a4a, apron: true, extraColor: 0x8a7a5a, width: 1.12, scale: 0.95 } },
  rosa: { name: 'Rosa', look: { skin: 0xc89878, hair: 0x2a1a14, hairStyle: 'bun', top: 0xa84a3a, apron: true, extraColor: 0xe0d8c4, robe: true, scale: 0.9 } },
  ysolde: { name: 'Ysolde', look: { skin: 0xc8a890, hairStyle: 'hood', hood: 0x4a2a5a, top: 0x4a2a5a, robe: true, shawl: 0x8a6ab0, scale: 0.85, extraColor: 0xc9a24f } },
  doran: { name: 'Doran', look: { skin: 0x9a7a5a, helmet: true, top: 0x5a3a3a, extraColor: 0x8a8a8a, item: 'spear', width: 1.12, scale: 1.0 } },
  fenwick: { name: 'Fenwick', look: { sculpt: 'bybo', skin: 0xb8906a, hairStyle: 'bald', beard: 0xb0a090, top: 0x4a5a6a, scale: 0.95 } },
  mira: { name: 'Mira', look: { skin: 0xd8b090, hair: 0x3a2a1a, hairStyle: 'long', top: 0x5a7a4a, scale: 0.55 } },
  tob: { name: 'Tob', look: { skin: 0xc49f83, hair: 0x8a5a2a, top: 0x6a6aa0, scale: 0.55 } },
  wren: { name: 'Wren', look: { skin: 0xc8a080, hair: 0xb0603a, hairStyle: 'long', top: 0x5a6a4a, extraColor: 0x8a7a50, item: 'scroll', scale: 0.88 } },
  // 0.13: Seren, en vandrande svärdsflicka (Elias skulptur)
  seren: { name: 'Seren', look: { sculpt: 'maiden', scale: 0.92 } },
  fenn: { name: 'Fenn', look: { skin: 0xc49f83, hair: 0x4a3020, hairStyle: 'hood', hood: 0x3a4a3a, top: 0x3a4a3a, extraColor: 0x5a4632, item: 'spear', scale: 0.95 } },
  // 0.7: öknen
  nefret: { name: 'Nefret', look: { skin: 0x9a6a48, hairStyle: 'hood', hood: 0xd8ccb0, top: 0xd8ccb0, robe: true, shawl: 0xc9a24f, extraColor: 0x2a4a8a, item: 'scroll', scale: 0.9 } },
  hamid: { name: 'Hamid', look: { sculpt: 'bybo', skin: 0x8a5a3a, hairStyle: 'hood', hood: 0x3a7a78, beard: 0x2a1a14, top: 0x3a7a78, apron: true, extraColor: 0xd8ccb0, width: 1.18, scale: 0.98 } },
  sabi: { name: 'Sabi', look: { skin: 0x8a5a3a, hair: 0x1a1210, top: 0xd8a050, scale: 0.55 } },
  tarek: { name: 'Tarek', look: { sculpt: 'bybo', skin: 0x9a6a48, hairStyle: 'hood', hood: 0x8a6a3a, beard: 0x3a2a1c, top: 0x6a4a2a, extraColor: 0x8a6a3a, scale: 0.95 } },
  // 0.15: Brinehollow vid havet
  nerissa: { name: 'Nerissa', look: { skin: 0xa87a58, hair: 0xd8d4cc, hairStyle: 'bun', top: 0x3a6a78, shawl: 0x8a7a5a, robe: true, scale: 0.84, width: 1.05 } },
  corwin: { name: 'Corwin', look: { sculpt: 'bybo', skin: 0xc49f83, hairStyle: 'bald', beard: 0x6a4a3a, top: 0x7a3a5a, apron: true, extraColor: 0xd8c8a0, width: 1.15, scale: 0.96 } },
  gull: { name: 'Gull', look: { sculpt: 'bybo', skin: 0xb8906a, hairStyle: 'hood', hood: 0x3a4a5a, beard: 0xe0dcd4, top: 0x3a4a5a, scale: 0.9 } },
  marlo: { name: 'Marlo', look: { skin: 0xa8805f, hair: 0x2a1a14, top: 0x5a7a8a, extraColor: 0x8a6a3a, item: 'spear', scale: 0.98 } },
  // 0.16: Rimeholt i norr
  sigrun: { name: 'Sigrun', look: { skin: 0xd8b8a0, hair: 0xe8e4dc, hairStyle: 'long', top: 0x5a3a3a, shawl: 0xd8d0c0, robe: true, scale: 0.86, width: 1.05 } },
  ylva: { name: 'Ylva', look: { skin: 0xe0c0a8, hair: 0xd8b878, hairStyle: 'hood', hood: 0x8a3a2a, top: 0x8a3a2a, extraColor: 0xe8e0d0, scale: 0.86 } },
  // 0.21: Rhea vid Mount Othrys, titaninnan som gömde sitt barn för Kronos
  rhea: { name: 'Rhea', look: { skin: 0xc8a890, hair: 0xd8d4e0, hairStyle: 'long', top: 0x4a3a6a, shawl: 0x8a7ab0, robe: true, scale: 0.98, width: 1.05, extraColor: 0xc9a24f } },
  // Folket från Hollowbrook som kommer hem när Kronos har fallit
  ida: { name: 'Ida', look: { skin: 0xd8b090, hair: 0x6a3a1a, hairStyle: 'bun', top: 0x6a4a5a, apron: true, extraColor: 0xe0d8c4, robe: true, scale: 0.9 } },
  hakon: { name: 'Hakon', look: { sculpt: 'bybo', skin: 0xd0a888, hairStyle: 'hood', hood: 0x4a5a6a, beard: 0xb8783a, top: 0x5a4a3a, extraColor: 0xe8e0d0, width: 1.15, scale: 1.0 } },
};

// ---------- djur ----------
function buildAnimal(kind, M) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const legs = [];
  const B = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
  if (kind === 'horse') {
    // Brindle: brun med en vit bläs, lång hals, man och svans
    const coat = M.furBrown, dark = M.furDark;
    body.add(B(0.62, 0.62, 1.5, coat, 0, 1.25, 0));
    const neck = new THREE.Group();
    neck.position.set(0, 1.45, 0.62);
    neck.rotation.x = -0.75;
    body.add(neck);
    neck.add(B(0.3, 0.85, 0.4, coat, 0, 0.36, 0));
    neck.add(B(0.08, 0.8, 0.3, dark, 0, 0.38, -0.2));
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0.06);
    head.rotation.x = 1.35;
    neck.add(head);
    head.add(B(0.26, 0.62, 0.32, coat, 0, 0.22, 0.05));
    head.add(B(0.08, 0.5, 0.02, M.white, 0, 0.25, 0.22));
    head.add(B(0.22, 0.14, 0.26, dark, 0, 0.5, 0.05));
    for (const sx of [-1, 1]) {
      head.add(B(0.06, 0.16, 0.05, coat, 0.09 * sx, -0.12, -0.08));
      head.add(B(0.04, 0.04, 0.02, M.furDark, 0.135 * sx, 0.05, 0.08));
    }
    const tail = B(0.12, 0.7, 0.12, dark, 0, 1.15, -0.85);
    tail.rotation.x = 0.35;
    body.add(tail);
    for (const [x, z] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) {
      const leg = B(0.14, 1.0, 0.14, coat, x, 0.5, z);
      body.add(leg);
      leg.add(B(0.16, 0.12, 0.18, dark, 0, -0.46, 0.02));
      legs.push(leg);
    }
    g.userData.head = neck;
  } else if (kind === 'camel') {
    // En kamel: lång hals, puckel och långa ben
    const coat = M.sack, dark = M.furBrown;
    body.add(B(0.6, 0.6, 1.5, coat, 0, 1.55, 0));
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), coat);
    hump.scale.set(1, 1.1, 1.3);
    hump.position.set(0, 1.82, -0.05);
    body.add(hump);
    body.add(B(0.66, 0.08, 0.7, M.clothRed, 0, 1.86, 0.4));
    const neck = new THREE.Group();
    neck.position.set(0, 1.6, 0.7);
    neck.rotation.x = -0.5;
    body.add(neck);
    neck.add(B(0.24, 0.9, 0.3, coat, 0, 0.4, 0.1));
    const head = new THREE.Group();
    head.position.set(0, 0.86, 0.12);
    neck.add(head);
    head.add(B(0.24, 0.24, 0.52, coat, 0, 0, 0.18));
    head.add(B(0.2, 0.14, 0.14, dark, 0, -0.04, 0.44));
    for (const sx of [-1, 1]) head.add(B(0.05, 0.12, 0.05, coat, 0.1 * sx, 0.14, -0.04));
    const tail = B(0.06, 0.5, 0.06, dark, 0, 1.4, -0.78);
    tail.rotation.x = 0.3;
    body.add(tail);
    for (const [x, z] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) {
      const leg = B(0.13, 1.3, 0.13, coat, x, 0.65, z);
      body.add(leg);
      leg.add(B(0.2, 0.08, 0.22, dark, 0, -0.62, 0.03));
      legs.push(leg);
    }
    g.userData.head = neck;
  } else if (kind === 'chicken') {
    body.add(B(0.26, 0.24, 0.34, M.white, 0, 0.32, 0));
    body.add(B(0.16, 0.18, 0.16, M.white, 0, 0.5, 0.16));
    body.add(B(0.06, 0.05, 0.08, M.pumpkin, 0, 0.5, 0.27));
    body.add(B(0.04, 0.08, 0.1, M.clothRed, 0, 0.62, 0.16));
    body.add(B(0.18, 0.12, 0.1, M.white, 0, 0.42, -0.2));
    for (const s of [-1, 1]) { const l = B(0.03, 0.2, 0.03, M.pumpkin, 0.07 * s, 0.1, 0); body.add(l); legs.push(l); }
  } else {
    const goat = kind === 'goat';
    const fur = goat ? (Math.random() < 0.5 ? M.fur : M.furBrown) : (Math.random() < 0.5 ? M.furBrown : M.furDark);
    const s = goat ? 0.75 : 1.25;
    body.add(B(0.5 * s, 0.45 * s, 0.95 * s, fur, 0, 0.75 * s, 0));
    const head = new THREE.Group();
    head.position.set(0, 0.95 * s, 0.52 * s);
    body.add(head);
    head.add(B(0.3 * s, 0.3 * s, 0.38 * s, fur, 0, 0, 0.12 * s));
    head.add(B(0.26 * s, 0.14 * s, 0.1 * s, kind === 'cow' ? M.white : fur, 0, -0.07 * s, 0.33 * s));
    for (const sx of [-1, 1]) {
      head.add(B(0.12 * s, 0.06 * s, 0.05 * s, fur, 0.2 * sx * s, 0.08 * s, 0.02 * s));
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035 * s, goat ? 0.28 * s : 0.16 * s, 4), M.horn);
      horn.position.set(0.09 * sx * s, 0.2 * s, -0.02 * s);
      horn.rotation.set(goat ? -0.7 : 0, 0, sx * (goat ? 0.2 : 1.1));
      head.add(horn);
      head.add(B(0.04 * s, 0.04 * s, 0.02 * s, M.furDark, 0.1 * sx * s, 0.05 * s, 0.31 * s));
    }
    if (goat) head.add(B(0.06 * s, 0.14 * s, 0.05 * s, M.fur, 0, -0.2 * s, 0.24 * s));
    if (kind === 'cow') body.add(B(0.2 * s, 0.12 * s, 0.22 * s, M.white, 0, 0.5 * s, -0.12 * s));
    body.add(B(0.06 * s, 0.3 * s, 0.06 * s, fur, 0, 0.75 * s, -0.5 * s)).rotation.x = 0.5;
    for (const [x, z] of [[-0.16, 0.32], [0.16, 0.32], [-0.16, -0.32], [0.16, -0.32]]) {
      const leg = B(0.11 * s, 0.55 * s, 0.11 * s, fur, x * s, 0.28 * s, z * s);
      body.add(leg);
      legs.push(leg);
    }
    g.userData.head = head;
  }
  return { root: g, body, legs, head: g.userData.head };
}

// ---------- kistor ----------
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
function buildChest(M, big) {
  const s = big ? 1.3 : 1;
  const g = new THREE.Group();
  const wood = M.wood, iron = M.iron;
  g.add(at(new THREE.Mesh(box(0.95 * s, 0.5 * s, 0.65 * s, 1), wood), 0, 0.25 * s, 0));
  for (const x of [-0.32, 0.32]) g.add(at(new THREE.Mesh(box(0.08 * s, 0.52 * s, 0.67 * s, 1), iron), x * s, 0.25 * s, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.5 * s, -0.32 * s);
  g.add(lid);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.33 * s, 0.33 * s, 0.95 * s, 8, 1, false, 0, Math.PI), wood);
  top.rotation.z = Math.PI / 2;
  top.scale.set(1, 1, 0.98);
  top.position.set(0, 0, 0.32 * s);
  lid.add(top);
  for (const x of [-0.32, 0.32]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345 * s, 0.345 * s, 0.08 * s, 8, 1, false, 0, Math.PI), iron);
    band.rotation.z = Math.PI / 2;
    band.position.set(x * s, 0, 0.32 * s);
    lid.add(band);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.16 * s, 0.05 * s), M.gold);
  lock.position.set(0, 0.45 * s, 0.34 * s);
  g.add(lock);
  return { g, lid };
}

export class Folk {
  constructor(ctx) {
    Object.assign(this, ctx); // story, world, inventory, sfx, hud, fx, lights, music, enemies
    const story = this.story, world = this.world, areas = world.areas;
    this.areas = areas;
    this.B = world.builder;
    const M = this.B.M;
    this.npcs = {};
    // Alla platser för folk som områdena har bestämt
    const spots = {};
    for (const r of [world.ranch, world.pass, world.field, world.willow, world.reach, world.interiors, world.desert, world.sea, world.frost, world.othrys]) Object.assign(spots, r?.npcs || {});
    for (const [id, sp] of Object.entries(spots)) {
      const def = LOOKS[id];
      if (!def) continue;
      const area = sp.area;
      const n = new Npc(areas.get(area).root, {
        id, name: def.name, voice: id, pos: sp.pos, face: sp.face, look: def.look, pose: sp.pose ?? 'stand', area,
        wander: sp.wander ?? null,
      });
      n.area = area;
      this.npcs[id] = n;
      story.npcs[id] = n;
    }
    const talk = (id, fn) => {
      const n = this.npcs[id];
      if (!n) return;
      story.interactions.push({ label: `Talk to ${n.name}`, npc: n, ok: () => story.phase === 'free', run: () => fn(n) });
    };
    talk('hollis', (n) => this.talkHollis(n));
    talk('nell', (n) => this.talkNell(n));
    talk('tilly', (n) => this.talkTilly(n));
    talk('garrick', (n) => this.talkGarrick(n));
    talk('odo', (n) => this.talkOdo(n));
    talk('mags', (n) => this.talkMags(n));
    talk('pell', (n) => this.talkPell(n));
    talk('rosa', (n) => this.talkRosa(n));
    talk('ysolde', (n) => this.talkYsolde(n));
    talk('doran', (n) => this.talkDoran(n));
    talk('fenwick', (n) => this.talkFenwick(n));
    talk('mira', (n) => this.talkKid(n, 'mira'));
    talk('tob', (n) => this.talkKid(n, 'tob'));
    talk('fenn', (n) => this.talkFenn(n));
    talk('seren', (n) => this.talkSeren(n));
    talk('wren', (n) => this.talkWren(n));
    talk('nefret', (n) => this.talkNefret(n));
    talk('hamid', (n) => this.talkHamid(n));
    talk('sabi', (n) => this.talkSabi(n));
    talk('tarek', (n) => this.talkTarek(n));
    talk('nerissa', (n) => this.story.sea?.talkNerissa(n));
    talk('corwin', (n) => this.story.sea?.talkCorwin(n));
    talk('gull', (n) => this.story.sea?.talkGull(n));
    talk('marlo', (n) => this.story.sea?.talkMarlo(n));
    talk('sigrun', (n) => this.story.frost?.talkSigrun(n));
    talk('ylva', (n) => this.story.frost?.talkYlva(n));
    talk('hakon', (n) => this.story.frost?.talkHakon(n));
    talk('rhea', (n) => this.story.othrys?.talkRhea(n));
    talk('ida', (n) => this.story.othrys?.talkIda(n));

    // Butiken: varorna på hyllorna
    const shop = world.interiors?.shop;
    if (shop) {
      const ware = (key, label, pos, fn) => story.interactions.push({ label, area: 'shop', pos: () => pos, radius: 1.5, ok: () => true, run: fn });
      ware('lantern', `Lantern — ${PRICES.lantern} shards`, shop.lantern, () => this.offer('lantern'));
      ware('oil', `Lantern Oil — ${PRICES.oil} · Oil Flask — ${PRICES.flask}`, shop.oil, () => this.offerOil());
      ware('potion', `Healing Draught — ${PRICES.potion} shards`, shop.potion, () => this.offer('potion'));
      ware('sword', `Traveler's Sword — ${PRICES.sword} shards`, shop.sword, () => this.offer('sword'));
    }

    // Kistor
    this.chests = [];
    for (const c of this.B.chests) {
      const a = areas.get(c.area);
      const { g, lid } = buildChest(M, c.big);
      g.position.set(c.x, c.y, c.z);
      g.rotation.y = c.ry;
      a.root.add(g);
      const ch = { ...c, g, lid, lidT: 0, box: null };
      this.chests.push(ch);
      const front = V(c.x + Math.sin(c.ry) * 1.1, c.y, c.z + Math.cos(c.ry) * 1.1);
      const there = () => !c.hidden && (!c.reveal || !!story.state.torches?.[c.reveal]) && (!c.song || !!story.state.songStones?.[c.song]);
      ch.there = there;
      story.interactions.push({
        label: 'Open the chest', area: c.area, pos: () => front, radius: 1.5,
        ok: () => (story.phase === 'free' || story.phase === 'intro') && !story.state.opened[c.id] && there(), run: () => this.openChest(ch),
      });
      a.updaters.push((t, dt) => {
        const show = there();
        if (g.visible !== show) {
          g.visible = show;
          if (ch.box) ch.box.enabled = show;
        }
        const open = !!story.state.opened[c.id];
        // Kistor som öppnades i ett tidigare spel står bara öppna (ingen öppning spelas upp igen)
        if (open && !ch.hinge?.age && !ch.justOpened) ch.lidT = 1;
        animateLid(ch, open, dt);
      });
    }
    // Kistornas kollisionslådor (world.connect har redan körts i main.js)
    if (world.areas.collider) {
      const col = world.areas.collider;
      for (const ch of this.chests) {
        col.building = ch.area;
        const s = ch.big ? 1.3 : 1;
        ch.box = col.addBox(ch.x - 0.55 * s, ch.y, ch.z - 0.55 * s, ch.x + 0.55 * s, ch.y + 0.85 * s, ch.z + 0.55 * s, ch.id);
      }
      col.building = null;
    }

    // Eldfat som tänds med lyktan
    this.torches = this.B.torches;
    for (const t of this.torches) {
      story.interactions.push({
        label: 'Examine the brazier', area: t.area, pos: () => t.pos, radius: 1.8,
        ok: () => !t.lit && story.phase === 'free',
        run: () => story.read(this.inventory.s.lantern
          ? ['An old iron brazier, cold and full of soot.', 'Hold up the lantern (put it on F, G or V) to light it.']
          : ['An old iron brazier, cold and full of soot.', 'If only Cello had a flame...']),
      });
    }

    // Djur på ranchen och i Cellos trädgård
    this.animals = [];
    for (const r of [world.ranch, world.home, world.willow, world.field, world.desert]) {
      for (const an of r?.animals || []) {
        const m = buildAnimal(an.kind, M);
        m.root.position.copy(an.pos);
        areas.get(an.area).root.add(m.root);
        this.animals.push({ ...an, m, pos: an.pos.clone(), home: (an.center ?? an.pos).clone(), target: an.pos.clone(), wait: Math.random() * 3, t: Math.random() * 9, facing: Math.random() * 6, speed: 0, groundAt: an.H });
      }
    }

    // Brindle, Hollis häst, springer fritt på fältet
    const brindle = this.animals.find((a) => a.kind === 'horse');
    if (brindle) {
      brindle.speedMul = 3.2;
      story.interactions.push({
        label: () => (story.state.talked.hollis ? 'Approach Brindle' : 'Approach the horse'), area: brindle.area, pos: () => brindle.pos, radius: 2.6,
        ok: () => story.phase === 'free' && !story.state.brindleSeen, run: () => this.meetBrindle(brindle),
      });
    }

    // Övningsdockan vid Cellos hus: går att slå på och låsa fast vid, men sliter inte på svärdet
    const dp = world.home?.dummy;
    this.dummy = null;
    if (dp) {
      const g = new THREE.Group();
      g.position.copy(dp);
      areas.get('home').root.add(g);
      g.add(at(new THREE.Mesh(cyl(0.08, 0.08, 1.8, 6, 1), M.woodDark), 0, 0.9, 0));
      g.add(at(new THREE.Mesh(cyl(0.3, 0.26, 0.8, 8, 1), M.hay), 0, 1.25, 0));
      g.add(at(new THREE.Mesh(box(1.2, 0.12, 0.12, 1), M.woodDark), 0, 1.4, 0));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), M.sack), 0, 1.85, 0));
      g.add(at(new THREE.Mesh(box(0.5, 0.08, 0.3, 1), M.clothRed), 0, 1.62, 0.05));
      if (areas.collider) {
        areas.collider.building = 'home';
        areas.collider.addBox(dp.x - 0.3, dp.y, dp.z - 0.3, dp.x + 0.3, dp.y + 2, dp.z + 0.3, 'dummy');
        areas.collider.building = null;
      }
      const dummy = {
        pos: dp.clone(), chestPos: V(dp.x, dp.y + 1.3, dp.z), hitRadius: 0.45, targetable: true, noWear: true, wobble: 0, area: 'home', g, hits: 0,
        get chest() { return this.chestPos; },
        hurt: (dmg, from) => {
          dummy.wobble = 1;
          dummy.dir = Math.atan2(dp.x - from.x, dp.z - from.z);
          this.sfx.play('hit', { vol: 0.6 });
          dummy.hits++;
          if (dummy.hits === 4 && story.phase === 'intro') this.hud.toast('Good swings. But the smoke over the village...', 2600);
          return 'hit';
        },
      };
      this.dummy = dummy;
    }
    this.setupSchedule();
  }

  // ---------- dygnet (0.11) ----------
  // Vissa går hem när det mörknar och kommer ut igen på morgonen. Andra somnar där de är.
  setupSchedule() {
    const story = this.story, W = this.world;
    const wd = W.willow?.homeDoors ?? [], farm = W.ranch?.farmDoor;
    this.sched = [];
    const add = (id, door, house) => {
      const n = this.npcs[id];
      if (!n || !door) return;
      this.sched.push({ n, id, house, door: door.clone(), day: n.pos.clone(), dayFace: n.facing, dayPose: n.pose, wander: n.wander, inside: false, going: false });
    };
    add('hollis', farm, 'farm');
    add('tilly', farm, 'farm');
    add('mira', wd[0], 'wm0');
    add('tob', wd[2], 'wm2');
    // Fenwick fiskar kvar på bryggan hela natten (han går inte hem över vattnet)
    // De som sover ute: pilgrimen på bron och Ilo vid lägerelden i Aetheria
    this.sleepers = [];
    if (this.npcs.odo) this.sleepers.push({ n: this.npcs.odo, pos: this.npcs.odo.pos.clone(), face: this.npcs.odo.facing, pose: this.npcs.odo.pose });
    const ilo = story.npcs.ilo, camp = W.aetheria?.camp;
    if (ilo && camp) this.sleepers.push({ n: ilo, pos: new THREE.Vector3(camp.x + 1.6, camp.y ?? ilo.pos.y, camp.z + 1.2), face: -2.2, pose: 'stand', wander: ilo.wander, lie: true });
    // Knacka på dörren när någon är hemma på natten
    const KNOCK = {
      farm: ['Someone stirs inside the farmhouse.', 'Hollis, from inside: "Whoever that is, the goats are asleep and so am I! Come back in the morning!"'],
      wm0: ['A sleepy voice answers from inside.', '"Mira is in bed, and so should you be! Come back tomorrow, dear."'],
      wm2: ['Something thumps inside, then whispers.', 'Tob, from inside: "...Is it a monster? ...Grandma says I can\'t open the door at night."'],
    };
    for (const house of Object.keys(KNOCK)) {
      const list = this.sched.filter((e) => e.house === house);
      if (!list.length) continue;
      const e0 = list[0];
      story.interactions.push({
        label: 'Knock on the door', area: e0.n.area, pos: () => e0.door, radius: 1.7,
        ok: () => story.phase === 'free' && list.some((e) => e.inside),
        run: () => {
          this.sfx.play('door', { vol: 0.35 });
          this.sfx.speak(e0.id, 5);
          story.read(KNOCK[house]);
        },
      });
    }
  }

  // night: från halv nio på kvällen till sex på morgonen
  get bedtime() {
    const c = this.story.clock;
    return !!c && (c.hour >= 20.5 || c.hour < 6);
  }

  // instant: hoppa direkt till rätt läge (laddning, nytt område, vila)
  schedule(instant = false) {
    const night = this.bedtime && this.story.phase === 'free';
    const here = this.areas.id, P = this.story.player;
    for (const e of this.sched) {
      const n = e.n, seen = n.area === here && !instant && n.pos.distanceTo(P.feet) < 45;
      if (night && !e.inside) {
        if (!seen) {
          e.inside = true;
          e.going = false;
          n.walkTarget = null;
          n.pos.copy(e.door);
          n.setVisible(false);
        } else if (!e.going) {
          e.going = true;
          n.wander = null;
          n.walkTo(e.door, 2.4, () => {
            e.going = false;
            e.inside = true;
            n.setVisible(false);
            if (n.area === this.areas.id) this.sfx.play('door', { vol: 0.4 });
          });
        }
      } else if (!night && (e.inside || e.going)) {
        e.inside = false;
        e.going = false;
        n.setVisible(true);
        if (!seen) {
          n.place(e.day, e.dayFace, e.dayPose);
          n.wander = e.wander;
        } else {
          n.pos.copy(e.door);
          n.walkTo(e.day, 2.2, () => { n.facing = e.dayFace; n.pose = e.dayPose; n.wander = e.wander; });
        }
      }
    }
    for (const sl of this.sleepers) {
      const n = sl.n;
      const sleeping = n.pose === 'lie';
      if (night && !sleeping && !n.talking) {
        if (sl.lie) { n.wander = null; n.place(sl.pos, sl.face, 'lie'); } else n.pose = 'lie';
      } else if (!night && sleeping) {
        if (sl.lie) { n.place(sl.pos, sl.face, 'stand'); n.wander = sl.wander; } else { n.place(sl.pos, sl.face, sl.pose); }
      }
    }
  }

  combatTargets() {
    return this.dummy && this.areas.id === 'home' ? [this.dummy] : [];
  }

  enterArea(id) {
    if (id === 'desert') this.placeTarek();
    this.schedule(true);
    // Eldfaten i området: tända om de har tänts förut
    for (const t of this.torches) {
      if (t.area !== id) continue;
      const lit = !!this.story.state.torches?.[t.id];
      this.setTorch(t, lit);
    }
    this.world.onEnterArea?.(id, this.story.state);
  }

  setTorch(t, lit) {
    t.lit = lit;
    t.fire.level = lit ? 1 : 0;
    t.fire.light.on = lit;
  }

  torchNear(p) {
    let best = null, bd = 2.6;
    for (const t of this.torches) {
      if (t.lit || t.area !== this.areas.id) continue;
      const d = Math.hypot(t.pos.x - p.x, t.pos.z - p.z);
      if (d < bd && Math.abs(t.pos.y - p.y) < 2.5) { best = t; bd = d; }
    }
    return best;
  }

  lightTorch(t) {
    this.setTorch(t, true);
    this.story.state.torches[t.id] = true;
    this.sfx.play('torch');
    this.fx.burst('spark', t.top, 16, 0xffb060);
    this.lights.pickT = 0;
    this.world.onTorch?.(t.id, this.story);
  }

  openChest(ch) {
    const story = this.story;
    story.state.opened[ch.id] = true;
    ch.justOpened = true;
    this.sfx.play('chest');
    story.cinematic = true;
    story.after(0.7, () => {
      const c = ch.contents;
      if (c.shards) {
        this.sfx.play('fanfare');
        this.music?.duckFor(2.0, 0.15);
        this.inventory.addShards(c.shards);
        this.fx.burst('spark', V(ch.x, ch.y + 1.0, ch.z), 14, 0x8affa0);
        story.read([`You found ${shardWord(c.shards)}! It is worth ${c.shards}.`], () => { story.cinematic = false; story.save(true); });
      } else if (c.item === 'potion') {
        this.sfx.play('fanfare');
        const ok = this.inventory.givePotion();
        story.read([ok ? 'You found a Healing Draught!' : 'A Healing Draught... but Cello cannot carry more.'], () => { story.cinematic = false; story.save(true); });
      } else {
        story.cinematic = false;
      }
    });
  }

  meetBrindle(b) {
    const story = this.story, s = story.state;
    b.wait = 6;
    b.facing = Math.atan2(story.player.feet.x - b.pos.x, story.player.feet.z - b.pos.z);
    this.sfx.play('neigh');
    story.read(s.talked.hollis
      ? ['A brown mare with a white blaze... Brindle! Hollis\' horse from Thistledown.', 'She sniffs Cello\'s hand, snorts, and lets him stroke her mane. Then she trots off into the tall grass.', 'Hollis will want to hear that she is alive.']
      : ['A brown mare with a white blaze, wild-eyed but unhurt.', 'She sniffs Cello\'s hand, then trots off across the plain. Someone must be missing her.'],
    () => { s.brindleSeen = true; story.save(true); });
  }

  // ---------- butiken ----------
  offer(key) {
    const story = this.story, inv = this.inventory, s = inv.s;
    const pell = this.npcs.pell;
    const L = (t) => (pell ? story.line(pell, t) : { who: '', text: t });
    const price = PRICES[key];
    const desc = {
      lantern: ['A brass oil lantern. It lights the dark, and old braziers too.', 'It comes full of oil.'],
      oil: ['A jar of lantern oil. Fills the lantern to the brim.'],
      potion: ['A Healing Draught. Bitter as bark, but it mends four hearts.'],
      sword: ["A traveler's sword. Plain, sharp and new. It replaces the blade Cello carries."],
    }[key];
    // Kan det köpas?
    if (key === 'lantern' && s.lantern) { story.read(['Cello already has a lantern.']); return; }
    if (key === 'oil' && !s.lantern) { story.dialog.start([L("Oil's no good without a lantern, friend. That one there, on the stand.")]); return; }
    if (key === 'oil' && inv.oilFull) { story.dialog.start([L('Your lantern is already full to the brim.')]); return; }
    if (key === 'potion' && inv.potionsFull) { story.dialog.start([L("You can't carry another one. Three bottles is all a belt will hold.")]); return; }
    if (key === 'sword' && this.story.player.sword.dur >= SWORD_MAX) { story.read(["Cello's own sword is still as good as new."]); return; }
    story.dialog.start([
      ...desc.map((t) => ({ who: '', text: t })),
      {
        who: '', prompt: `${price} shards. Buy it? (You have ${s.shards || 0}.)`,
        choices: [{ text: 'Buy', id: 'buy' }, { text: 'No thanks', id: 'no' }],
        onChoose: (id) => {
          if (id !== 'buy') return [];
          if (!inv.spend(price)) {
            this.sfx.play('denied');
            return [L("Ah... you're a little short. Come back when the storm's been generous.")];
          }
          this.sfx.play('buy');
          return this.deliver(key, L);
        },
      },
    ]);
  }

  // Oljehyllan hos Pell (0.15): fyll lyktan direkt, eller köp en flaska att bära med sig
  offerOil() {
    const story = this.story, inv = this.inventory, s = inv.s;
    const pell = this.npcs.pell;
    const L = (t) => (pell ? story.line(pell, t) : { who: '', text: t });
    if (!s.lantern) { story.dialog.start([L("Oil's no good without a lantern, friend. That one there, on the stand.")]); return; }
    story.dialog.start([
      { who: '', text: 'Jars of lantern oil, and small stoppered flasks to carry on the road.' },
      {
        who: '', prompt: `What will it be? (You have ${s.shards || 0} shards.)`,
        choices: [
          { text: `Fill the lantern — ${PRICES.oil}`, id: 'oil' },
          { text: `Oil Flask to carry — ${PRICES.flask}`, id: 'flask' },
          { text: 'No thanks', id: 'no' },
        ],
        onChoose: (id) => {
          if (id === 'no') return [];
          if (id === 'oil' && inv.oilFull) return [L('Your lantern is already full to the brim.')];
          if (id === 'flask' && inv.flasksFull) return [L('Three flasks is all your belt will hold, friend.')];
          if (!inv.spend(PRICES[id])) { this.sfx.play('denied'); return [L("Ah... you're a little short. Come back when the storm's been generous.")]; }
          this.sfx.play('buy');
          if (id === 'oil') { inv.fillOil(); return [L('There. Filled to the brim.')]; }
          inv.giveFlask();
          return [L('One flask of oil. If your lantern sputters in the dark, it will save you.'), { run: () => this.hud.toast(`Oil Flask (${s.flasks} of 3). Use it from an item button, or Cello pours it in when the lantern runs dry.`, 4200) }];
        },
      },
    ]);
  }

  deliver(key, L) {
    const story = this.story, inv = this.inventory, P = story.player;
    if (key === 'lantern') {
      inv.giveLantern();
      const shop = this.world.interiors?.shop;
      if (shop?.lanternMesh) shop.lanternMesh.visible = false;
      return [{ run: () => story.itemGet('lantern') }];
    }
    if (key === 'oil') { inv.fillOil(); return [L('There. Filled to the brim.')]; }
    if (key === 'potion') { inv.givePotion(); return [L('One Healing Draught. Drink it before you need it, not after!')]; }
    if (key === 'sword') {
      P.setSword(SWORD_MAX);
      inv.refresh(true);
      return [L('A fine blade. Keep it out of shields if you can.'), { run: () => this.hud.toast('Cello has a new sword!', 3000) }];
    }
    return [];
  }

  // Vane smider ett nytt svärd i Aetheria
  vaneForge(n) {
    const story = this.story, P = story.player, L = (t) => story.line(n, t);
    const broken = P.sword.broken;
    story.talk(n, [
      broken ? L('Your blade snapped? Let me see. ...Ashling bones are harder than they look.') : L("That edge has seen some work. I can forge you a new blade, if you've the shards for the iron."),
      {
        who: '', prompt: `Have Vane forge a new sword for ${PRICES.reforge} shards? (You have ${story.state.shards || 0}.)`,
        choices: [{ text: 'Forge it', id: 'yes' }, { text: 'Not now', id: 'no' }],
        onChoose: (id) => {
          if (id !== 'yes') return [L(broken ? "Suit yourself. Don't come crying when it breaks your fingers instead." : 'Come back when it gets worse.')];
          if (!this.inventory.spend(PRICES.reforge)) {
            this.sfx.play('denied');
            return [L('Iron costs shards, boy. Cut some grass, break some pots, and come back.')];
          }
          this.sfx.play('anvil');
          this.sfx.play('anvil', { delay: 0.4 });
          this.sfx.play('anvil', { delay: 0.8 });
          return [
            { run: () => { P.setSword(SWORD_MAX); this.inventory.refresh(true); this.sfx.play('buy', { delay: 1.1 }); } },
            L('There. Balanced, sharp, and better than the last one. Try not to hit shields with it.'),
          ];
        },
      },
    ]);
  }

  // ---------- samtal ----------
  get chats() { return this.story.chats; }
  get night() { return !!this.story.clock?.isNight; }
  get raining() { const w = this.story.weather?.local; return w === 'rain' || w === 'storm'; }
  say(n, lines, onEnd) {
    this.story.talk(n, lines.map((t) => (typeof t === 'string' ? this.story.line(n, t) : t)), onEnd);
  }
  rotate(key, pools) {
    const t = this.story.state.talked;
    t[key] = ((t[key] ?? -1) + 1) % pools.length;
    return pools[t[key]];
  }

  talkHollis(n) {
    const s = this.story.state;
    if (!s.talked.hollis) {
      this.say(n, [
        "Well, I'll be. A traveler, coming down the old stone road?",
        'That road fell into the storm the day the sky turned black. We thought we would never see another face out here.',
        "Name's Hollis. This is Thistledown Ranch. What's left of it.",
        "Hollowbrook, you say? ...I saw the smoke from the hill. I'm sorry, lad.",
        'If you are heading north, the road runs past the barn and up through Galewind Pass. Garrick keeps the gate there.',
      ], () => { s.talked.hollis = true; });
      return;
    }
    if (s.brindleSeen && !s.brindleTold) {
      this.say(n, [
        "You saw Brindle? On the Stormvale? ...Alive?",
        'Hah! I knew it. That stubborn old mare. She will come home when she is ready, she always does.',
        "Here. It is not much, but I put it aside for whoever brought news of her.",
        { run: () => { this.inventory.addShards(20); this.sfx.play('fanfare'); this.music?.duckFor(2.0, 0.15); this.hud.toast('Hollis gives you a red shard, worth 20!', 3600); } },
        ...this.grumbleLines(),
      ], () => { s.brindleTold = true; this.giveGrumble(); });
      return;
    }
    // Äldre sparningar: nyheten om Brindle är redan berättad, men Grumble har inte bytt ägare
    if (s.brindleTold && !s.goat?.have) {
      this.say(n, ["I've been thinking about what you did for Brindle, lad.", ...this.grumbleLines()], () => this.giveGrumble());
      return;
    }
    // 0.11: frågor i valfri ordning, och ett dumt svar som gör Hollis arg
    this.chats.chat(n, {
      greet: [s.bastionDone ? 'They say the thunder in the north went quiet. That was you? ...Hah! Thistledown owes you, lad.' : 'Back again, lad? Pull up a fence post.'],
      topics: [
        { id: 'brindle', q: 'About Brindle...', a: () => (s.brindleTold
          ? ['Brindle comes and goes as she pleases. Out on the Stormvale by day, back at the barn some nights.', "She won't let anyone near her but Tilly. Can't blame her."]
          : ['My mare Brindle bolted when the storm broke. Last I saw, she was running for the Stormvale.', 'Brown, with a white blaze. If you ever see her, tell her Hollis has apples.']) },
        { id: 'ashlings', q: 'Do Ashlings come here?', a: ['The Ashlings came for the goats last month. Nell chased them off with a pitchfork.', "Lately they come at night. Something about the dark makes them bold. I keep the lamps lit."] },
        { id: 'tips', q: 'Any advice for the road?', a: ["Short on shards? Cut the tall grass. Funny how they turn up there, like the storm sows them.", "And sleep when you can. Folk who walk the Stormvale at night don't always walk back."] },
        { id: 'grumble', q: 'How do I handle Grumble?', when: () => !!s.goat?.have, a: ["Is he behaving? No? Good. That means he likes you.", 'He led the herd until Brindle bolted. Since then he has been looking for someone to boss around. Looks like he found you.'] },
      ],
      rude: { q: 'Your ranch smells like goat.', a: ["...It's a GOAT ranch, lad. What did you expect it to smell like? Roses?", "Off with you. I've got work to do."] },
      bye: 'Mind the road, lad.',
      forgive: "About yesterday... I've smelled worse things than goat. Myself, mostly. No hard feelings.",
    });
  }

  grumbleLines() {
    return [
      'And there is something else. See that big brute by the post? That is Grumble.',
      'Meanest ram in three valleys, and the fastest thing on four legs since Brindle left. He has been sulking ever since.',
      'He needs a long road, and you need legs. Take him.',
      'And take this. His old horn. Blow it, and he will come running. Mostly.',
    ];
  }

  giveGrumble() {
    const story = this.story;
    story.after(0.2, () => story.itemGet('horn'));
  }

  talkNell(n) {
    const s = this.story.state;
    if (!s.talked.nell) {
      this.say(n, ['You look half frozen, love. Sit by the hearth a while; you are welcome here.', 'Any friend of the road is a friend of Thistledown.'], () => { s.talked.nell = true; });
      return;
    }
    this.chats.chat(n, {
      greet: [this.night ? "Can't sleep either, love? Sit. The fire's warm." : "Sit a while, love. The kettle's always on."],
      topics: [
        { id: 'hearth', q: 'Does the fire really never go out?', a: ['Not once since the storm came. My grandmother lit it, and her mother before her.', 'When the night is long and the Ashlings howl, a fire is the best friend a farm can have. Rest by it whenever you pass.'] },
        { id: 'tilly', q: 'How is Tilly?', a: ["Tilly talks of nothing but the goats. Now she'll talk of nothing but you.", 'She wants to be a knight. I told her knights eat their greens. That slowed her down.'] },
        { id: 'home', q: 'Hollowbrook burned...', a: ['I know, love. We saw the smoke from the hill.', 'You can stay here as long as you like. Thistledown has room for one more.'] },
      ],
      rude: { q: 'Is the soup always this thin?', a: ['...', 'I made that soup with the last of the onions. For you.', 'Well. You can make your own supper tonight.'] },
      bye: 'Come back before dark, love.',
      forgive: "I'm not one to hold a grudge over soup. Sit down, I made more.",
    });
  }

  talkTilly(n) {
    const s = this.story.state;
    if (s.goat?.have && !s.talked.tillyGoat) {
      s.talked.tillyGoat = true;
      this.say(n, ["Dad gave you Grumble?! He only bites people he likes. ...He bit Dad twice."]);
      return;
    }
    this.chats.chat(n, {
      greet: [s.bastionDone ? 'Is it true you fought a giant made of stone?! I knew you were a knight!' : 'Hi! Are you a knight? You have a sword! And a shield!'],
      topics: [
        { id: 'knight', q: 'Do you want to be a knight?', a: ["Yes! I've been practicing! I hit the scarecrow eleven times yesterday!", 'It hit me back once. Well. It fell on me.'] },
        { id: 'grumble', q: 'Tell me about Grumble.', a: ["The big goat is called Grumble. Don't stand behind him. Trust me.", 'He likes it when you hum to him. Low and slow, like a sleepy cow. Then he comes running!'] },
        { id: 'shards', q: 'What are the shiny things in the grass?', a: ["Dad says the shards in the grass are the sky's tears. I think they're just shiny.", "I keep mine in a jar. I have nine! You can't have them."] },
        { id: 'hum', q: "Can you teach me Grumble's hum?", when: () => !!s.flute && !!s.goat?.have && !this.story.songs?.knows('ram'),
          a: ['You have a flute? Then play it like this!', 'Low, then lower, low, lower... then up, and down again! Like a sleepy cow!'],
          then: () => this.story.songs.teach('ram', n, () => this.story.after(1.2, () => this.say(n, ['Yay! Now Grumble will come whenever you play it. Even from far, far away!']))) },
      ],
      rude: { q: "Knights aren't real, you know.", mood: 'sad', a: ['...yes they are.', "*sniff* You're not a knight. You're just mean!"] },
      bye: 'Bye! Watch out for dragons!',
      forgive: "I'm not sad anymore. Mom says knights forgive people. So I forgive you!",
    });
  }

  talkGarrick(n) {
    const s = this.story.state, P = this.story.player;
    if (!s.talked.garrick) {
      this.say(n, [
        "Halt! ...Oh. You're no Ashling. Where did you come from?",
        "Hollowbrook? Then you've walked further than anyone has in a year.",
        'Beyond this gate the road runs down to the Long Bridge, and across it lies the Stormvale. Wide country. Easy to get lost in.',
        "Storm bats nest under the bridge. Keep your shield up and don't look down.",
      ], () => { s.talked.garrick = true; });
      return;
    }
    if (P.sword.broken) {
      this.say(n, ["That blade's seen better days. Willowmere's shop sells new ones, east across the Stormvale. Or go back to your smith."]);
      return;
    }
    this.chats.chat(n, {
      greet: [this.night ? "Who goes there? ...Oh, it's you. Long night." : 'Back again? The gate is open, and the bridge still stands.'],
      topics: [
        { id: 'bridge', q: 'Tell me about the Long Bridge.', a: ["The Long Bridge has held for three hundred years. I don't intend to be on it the day it doesn't.", 'Storm bats nest underneath. Keep your shield up.'] },
        { id: 'east', q: "What's east of the Stormvale?", a: ['Willowmere lies east across the Stormvale. Good folk. Ask for Ysolde, if you want your fortune told... or your way found.'] },
        { id: 'north', q: "What's north?", a: ['North of the Stormvale the land climbs into Stormreach. That is where the storm comes from. I would not go there without a light.'] },
        { id: 'night', q: "Don't you ever sleep?", when: () => this.night, a: ['A guard sleeps when the sun is up. Ashlings walk at night. Hear them out there?', 'Stay on the road after dark, Cello. And keep a light handy. In the dark they see a lantern from far off, mind.'] },
      ],
      rude: { q: 'Some guard. I walked right up to you.', a: ['Is that so? Then walk right back down, smart mouth.', "I don't have to talk to you."] },
      bye: 'Mind the bridge.',
      forgive: "Ah, you. I've had worse said to me by Ashlings. Forget it.",
    });
  }

  talkOdo(n) {
    const story = this.story, s = story.state, songs = story.songs;
    // På natten sover pilgrimen på bänken (0.11)
    if (n.pose === 'lie') {
      story.read(['Odo is fast asleep on the bench, snoring softly.', 'Better let the old pilgrim sleep. Come back in the morning.']);
      return;
    }
    if (!s.talked.odo) {
      this.say(n, [
        "Oh! A fellow traveler. Sit, sit. I'm Odo. I walk from one Storm Stone to the next, to pray.",
        "There's one on the Stormvale's eastern edge. Asleep, like all the others. Waiting for thunder, the old songs say.",
      ], () => { s.talked.odo = true; });
      return;
    }
    this.chats.chat(n, {
      greet: [s.eastPath ? 'You woke the Storm Stone! I felt it in my bones, all the way out here. Bless you, child.' : 'Ah, my fellow traveler. Sit, sit.'],
      topics: [
        { id: 'stones', q: 'What are the Storm Stones?', a: ['Stones the gods set out to hold the storm in place, the old songs say. There is one on the Stormvale\'s eastern edge.', 'Asleep, like all the others. Waiting for thunder.'] },
        { id: 'view', q: 'Why do you sit here?', a: ['The view from here... you can see the whole world falling apart. It is beautiful, in a sad way.', 'The old songs say the gods walked this bridge. They must have had better knees than mine.'] },
        { id: 'songs', q: 'What do you sing to the stones?', when: () => !s.flute,
          a: ['The old songs, child. Before the storm, pilgrims sang to the stones, and the stones answered.', 'My voice is too old for it now. But my flute still remembers.', 'Here. You have young lungs and a long road. Take it.'],
          then: () => this.giveFlute(n) },
        { id: 'lesson', q: 'Teach me the Waking Chant again.', when: () => !!s.flute && !songs?.knows('opening'), a: ['Of course. Listen closely.'], then: () => this.teachOpening(n) },
        { id: 'birds', q: 'Where are the singing-bird stones?', when: () => !!songs?.knows('opening'),
          a: () => [s.songStones?.passStone ? 'You opened the one on this bridge! I have walked past it for forty years.' : 'One sleeps right here on this bridge. Play the song beside it.',
            'Wren the mapmaker has drawn others: one by the fallen god on the Stormvale, and one among the columns in the far desert, they say.'] },
      ],
      rude: { q: 'Praying to rocks? Really?', a: ['...', 'The rocks have been kinder company than you, child.'] },
      bye: 'Walk in the light, child.',
      forgive: 'Ah, you again. The old songs teach forgiveness, too. Sit.',
    });
  }

  // Odo ger Cello sin flöjt och lär honom den första sången (0.11)
  giveFlute(n) {
    const story = this.story, L = (t) => story.line(n, t);
    story.itemGet('flute', () => {
      story.talk(n, [L('Now, the first song every pilgrim learns: the Waking Chant.'), L('Listen, then play it back to me.')], () => this.teachOpening(n));
    });
  }

  teachOpening(n) {
    const story = this.story, L = (t) => story.line(n, t);
    story.songs.teach('opening', n, () => story.after(1.4, () => story.talk(n, [
      L('Beautiful! The stones with the singing bird will hear that.'),
      L('One sleeps right here on this bridge. Go on, play it beside it.'),
    ])));
  }

  talkMags(n) {
    const story = this.story, s = story.state, inv = this.inventory;
    const L = (t) => story.line(n, t);
    const first = !s.talked.mags;
    s.talked.mags = true;
    const menu = () => ({
      who: '', prompt: `What will it be? (You have ${s.shards || 0} shards.)`,
      choices: [
        { text: `Lantern Oil — ${PRICES.magsOil}`, id: 'oil' },
        { text: `Oil Flask — ${PRICES.magsFlask}`, id: 'flask' },
        { text: `Healing Draught — ${PRICES.magsPotion}`, id: 'potion' },
        { text: 'Just looking', id: 'no' },
      ],
      onChoose: (id) => {
        if (id === 'no') return [L("Off you go, then. Mind the Ashlings, they don't pay.")];
        if (id === 'oil' && !s.lantern) return [L("Oil, without a lantern? You'd just drink it. Pell in Willowmere sells lanterns.")];
        if (id === 'flask' && !s.lantern) return [L("A flask of oil, without a lantern? Pell in Willowmere sells lanterns.")];
        if (id === 'oil' && inv.oilFull) return [L('Your lantern is full, dearie.')];
        if (id === 'flask' && inv.flasksFull) return [L('Three flasks on one belt? You will clink like a tinker.')];
        if (id === 'potion' && inv.potionsFull) return [L('Your belt is full. Three bottles, no more.')];
        const price = id === 'oil' ? PRICES.magsOil : id === 'flask' ? PRICES.magsFlask : PRICES.magsPotion;
        if (!inv.spend(price)) { this.sfx.play('denied'); return [L('Not enough shards, dearie. Mags is kind, not charitable.')]; }
        this.sfx.play('buy');
        if (id === 'flask') { inv.giveFlask(); return [L('A flask for the road. Keep it corked, it stinks.')]; }
        if (id === 'oil') inv.fillOil(); else inv.givePotion();
        return [L(id === 'oil' ? 'Filled up! Mind it, the dark eats oil.' : 'One potion. Pinch your nose when you drink it.')];
      },
    });
    story.talk(n, first
      ? [L("Customer! Don't be shy, dearie. Mags has a bit of everything — well, two things."), L("Lantern oil and Healing Draughts. A bit dearer than in Willowmere, but Willowmere's a long walk, isn't it?"), menu()]
      : [menu()]);
  }

  talkPell(n) {
    if (this.side?.talkPell(n)) return;
    const s = this.story.state;
    this.say(n, s.talked.pell
      ? this.rotate('pellN', [
        ['Have a look around! Everything has its price on it.'],
        ["If you're going north, take a lantern. The Hollow Cave is darker than a closed eye."],
        ['Swords break, friend. That is why I sell them.'],
      ])
      : ["Welcome to Pell's Provisions! Lanterns, oil, potions and blades.", 'Everything is on the shelves. Just have a look at what you want.'],
    () => { s.talked.pell = true; });
  }

  talkRosa(n) {
    const story = this.story, s = story.state;
    const L = (t) => story.line(n, t);
    story.talk(n, [
      L(s.talked.rosa ? 'Back again? The bed is still warm.' : "Welcome to the Willow & Wick! A boy who walked the Long Bridge sleeps here for free."),
      story.restStep('inn', 'Rest at the inn?', 'Cello sleeps at the Willow & Wick...'),
    ], () => { s.talked.rosa = true; });
  }

  // Nästa uppdrag, så som spåkvinnan ser det
  goalKey() {
    const s = this.story.state;
    if (!s.northPath) return 'lyra';
    if (!s.items.hammer && !s.lantern) return 'lantern';
    if (!s.items.hammer) return 'cave';
    if (!s.bastionDone) return 'boss';
    if (!s.eastPath) return 'stone';
    if (!s.sunGate) return 'gate';
    if (!s.items.prism) return 'desert';
    if (!s.pyramidDone) return 'pyramid';
    if (!s.necropolisDone) return 'necropolis';
    if (!s.titanRaid) return 'raid';
    if (!s.items.sandals && !s.talked.serenGale) return 'gale';
    if (!s.spireDone) return 'spire';
    if (!s.swim) return 'swim';
    if (!s.templeDone) return 'temple';
    if (!s.mawDone) return s.talked?.sigrun ? 'maw' : 'frost';
    if (!s.crownDone) return s.talked?.rhea ? 'crown' : 'othrys';
    return 'end';
  }
  goalText(key = this.story.state.hint) {
    return {
      lyra: 'Go back to Aetheria and speak with Lyra. The stone gate waits for her words.',
      lantern: 'Your road leads north, through Stormreach and the Hollow Cave, to the Tempest Bastion. The cave is black as a moonless night. Buy a lantern from Pell first.',
      cave: 'Cross the Stormvale to the north and climb into Stormreach. In the Hollow Cave, light the old braziers with your lantern. The Tempest Bastion waits beyond.',
      boss: "The shard is yours, but the fortress still has a heart of stone. Hrungnir waits beyond the Storm Key's door. Lure him to the pylons and let thunder do the rest.",
      stone: 'Thunder sleeps in the Storm Stone on the eastern edge of the Stormvale. Strike the copper at its feet with the hammer.',
      gate: 'The golden gate sleeps, as the Storm Stone slept. Thunder woke the stone. Let thunder wake the gate: strike the copper before it.',
      desert: "Beyond the golden gate, the Ember Wastes. The sun god's pyramid waits at their far edge. Nefret, the priestess at the Sunwell oasis, keeps its secrets.",
      pyramid: 'A serpent of endless night coils in the heart of the pyramid. Steel cannot touch it. Only sunlight, caught and thrown, can bring it low.',
      necropolis: 'South of the Sunwell, the sand has opened a door of black stone. The dead below cannot rest; something devours their hearts. Find the scales of the jackal god, and walk where the dead walk.',
      raid: 'The storm over the mere sounds wrong, child. Something is falling out of it. Stay close to Willowmere... you will be needed here.',
      gale: 'The bridge west of Stormreach has stopped screaming. Cross it to the Galecrown. Your sword-friend waits by her fire.',
      spire: 'A tower of white stone, where no bird lands. The wind climbs it, and so must you. At its crown waits the titan of the storm.',
      later: 'The threads lead under the sea now, where the sea god fell... That road is not yet woven. Rest, child.',
      sea: 'South of the Galecrown, the fishers have mended their bridge. The threads lead down to the sea, where the sea god fell.',
      swim: 'The sea of Brinehollow is deep, and you sink like a stone. An old woman on the pier remembers how to swim. Ask her.',
      temple: 'Under the broken spear in the middle of the sea lies a temple. The tide there rises and falls at a will that is not the moon\'s. Dive, child.',
      frost: 'The king of the titans flies north, to the ice where the frost giants sleep. Cross the north bridge of the Galecrown, and carry fire with you. In Rimeholt, an old woman by the fire knows the giants.',
      maw: 'A dead giant lies in the ice with his mouth open, and something has climbed inside him. Walk into the mouth. The ice there does not let you stop... and someone in there laughs.',
      othrys: 'Kronos walks on his own legs now, east, to Mount Othrys, where the titans were crowned. Cross the ice bridge on the east side of the Frostmarch. A woman older than the gods keeps a fire there.',
      crown: 'Inside the mountain of the titans, every gift the gods left you will be needed: thunder, light, wings, the spear of the sea, and a shadow. At the top, the titan king waits on his throne.',
      end: 'The threads are quiet now, child. For the first time in a long while, I cannot see the end of them. ...I think that means they are yours.',
    }[key] ?? null;
  }

  talkYsolde(n) {
    const story = this.story, s = story.state;
    if (s.talked.ysolde && s.flute && story.songs && !story.songs.knows('storm')) {
      this.say(n, ['Back again? ...And carrying a flute, I see.', 'The storm has a song too, child. I have heard it in the thunder for fifty years. Listen...'],
        () => story.songs.teach('storm', n, () => story.after(1.4, () => this.say(n, ['Play it under the open sky, and the clouds will gather... or scatter.', 'Use it wisely. The storm remembers who calls it.']))));
      return;
    }
    const key = this.goalKey();
    const first = !s.talked.ysolde;
    const lines = first
      ? ['Sit, child. I have been waiting for you. The threads told me a boy with ashes on his boots would come.', 'I see roads. Let me look at yours...']
      : ['Back again? Let me look at the threads once more...'];
    lines.push(this.goalText(key));
    if (s.kaelLetter && !s.letterGiven) lines.push('...and a letter weighs on your heart. Someone in Aetheria waits for it.');
    if (s.talked.ysolde) lines.push('Open your bag, and you will find my words there, should you forget them.');
    this.say(n, lines, () => {
      s.talked.ysolde = true;
      s.hint = key;
      if (first) this.hud.toast("Ysolde's words are written in your item menu (Tab).", 4200);
    });
  }

  talkDoran(n) {
    this.chats.chat(n, {
      greet: [this.night ? 'Quiet night. Too quiet. Speak up, traveler.' : "Willowmere's under watch. Speak up."],
      topics: [
        { id: 'mere', q: 'How do you keep the Ashlings out?', a: ["Willowmere stands because we keep watch. Ashlings don't like the water; the mere keeps them off.", 'At night they come right up to the far shore. Their eyes glow like coals. They never cross.'] },
        { id: 'north', q: 'What lies north?', a: ['North of the Stormvale the land rises into Stormreach. Nothing good comes from there. Except the wind, maybe.'] },
        { id: 'horse', q: 'Seen anything strange?', a: ["Brindle? Hollis' mare? Saw a brown horse running wild on the Stormvale, west of the crossroads. Fast as lightning.", 'And a pilgrim on the Long Bridge, singing to the stones. Takes all kinds.'] },
      ],
      rude: { q: 'Do you ever do anything but stand there?', a: ['Standing here IS the job. Standing here is why you can sleep at the inn.', 'Move along.'] },
      bye: 'Stay out of trouble.',
      forgive: "No hard feelings about yesterday. Standing here makes a man grumpy too.",
    });
  }

  talkFenwick(n) {
    this.chats.chat(n, {
      greet: [this.raining ? "Rain's good for fishing, they say. They lie." : 'Shh. You will scare the fish. ...What fish, you ask? Exactly.'],
      topics: [
        { id: 'fish', q: 'Caught anything?', a: ["Fish don't bite in a storm. I sit here anyway. It's the sitting I like."] },
        { id: 'north', q: 'Going north. Any advice?', a: ["Pell's got lanterns. You'll want one if you're going north. Caves up there are darker than a titan's heart."] },
        { id: 'mere', q: 'How deep is the mere?', a: ['They say the mere has no bottom. I say it has plenty of bottom, just no fish.'] },
        { id: 'night', q: "Don't you ever go home?", when: () => this.night, a: ['Fish bite better at night, they say. They don\'t. But the stars come out between the clouds, and nobody talks to me. Except you.'] },
      ],
      rude: { q: "You've caught nothing all day.", a: ['...I was being patient.', "Now look, you scared them all away. Go on, shoo."] },
      bye: 'Tight lines.',
      forgive: "You again. ...Sit, if you like. The fish didn't come back anyway.",
    });
  }

  talkKid(n, id) {
    if (id === 'mira') {
      this.chats.chat(n, {
        greet: ["Tag! You're it! ...Hey, you can't tag with a sword!"],
        topics: [
          { id: 'windmill', q: 'Is the windmill haunted?', a: ['Tob says the windmill is haunted. It is NOT. It is just the wind. Probably.'] },
          { id: 'grandma', q: 'Who is Grandma Ysolde?', a: ["She's not really my grandma. She's everybody's grandma. She knows what's going to happen before it happens.", 'She says the storm talks to her. I think she just likes thunder.'] },
          { id: 'night', q: 'Do you go out at night?', a: ["No! Mama makes us go in when the lamps are lit. That's when the Ashlings come to the shore."] },
          ...(this.side?.miraTopics() ?? []),
        ],
        rude: { q: 'Tag is a baby game.', mood: 'sad', a: ['It is NOT!', "*sniff* I'm telling Grandma Ysolde!"] },
        bye: "Bye! You're still it!",
        forgive: "I'm not sad anymore! Want to play tag? You're it!",
      });
      return;
    }
    this.chats.chat(n, {
      greet: ['Are you from the Stormvale? Did you see any monsters? Did you hit them?'],
      topics: [
        { id: 'monsters', q: 'I fought some Ashlings.', a: ['WHOA. Did they explode? Mira says they explode into ash.', "When I grow up I'm going to fight them too. With a big stick."] },
        { id: 'mira', q: 'Is Mira scared of the windmill?', a: ["Mira's scared of the windmill. I'm not. I'm not scared of anything. Except Grandma Ysolde."] },
        { id: 'secret', q: 'Know any secrets?', a: ['The old pilgrim on the bridge plays a flute to the stones. Doran says it is just noise.', 'But I saw a stone glow once when he played. I SAW it.'] },
        ...(this.story.chronicle?.extraTopics('tob', n) ?? []),
      ],
      rude: { q: "You'd run from an Ashling.", mood: 'sad', a: ['...would not.', '*sniff* Go away.'] },
      bye: 'Hit one for me!',
      forgive: "I wasn't really sad. I had dust in my eye. Okay, bye!",
    });
  }

  // Kartritaren på fältet: hon vet hur stort riket är
  talkWren(n) {
    const s = this.story.state;
    if (!s.talked.wren) {
      this.say(n, [
        "Careful where you step! That's three weeks of work under your boot.",
        "I'm Wren. I map the Stormvale. Or I try to; the storm keeps moving the edges.",
        'South lies the Long Bridge and the pass. East, Willowmere by the mere. North, Stormreach, where nobody sane goes.',
        'And far in the east, past the Storm Stone, a golden gate. Beyond it... a pyramid, glowing like a coal. No map of mine reaches that far.',
        'Press K to see where you are. Ha! I wish my maps were that easy.',
      ], () => { s.talked.wren = true; });
      return;
    }
    this.chats.chat(n, {
      greet: [this.night ? "I map by starlight when the clouds allow. Tonight they don't." : "Mind the map. What do you need?"],
      topics: [
        { id: 'secrets', q: 'Any secrets on your map?', a: ['There is a chest under the old watchtower by the north road. Nobody can see it. The old rangers only opened it by firelight.', 'And there are standing stones with a strange mark, like a bird singing. I drew three of them. Nobody knows what they are for.'] },
        { id: 'roads', q: 'Which roads should I take?', a: ['The Stormvale is bigger than three villages put together. People get lost out here. Follow the roads.', "Mags at the crossroads sells oil, if your lantern's thirsty. Robbery, but convenient robbery."] },
        { id: 'creatures', q: 'Seen anything strange out here?', a: ['A brown mare runs wild west of the crossroads. Fast as a rumor. I tried to draw her once.', "And the Ashlings sleep through the day, curled in the grass like ash heaps. Don't step on one."] },
        { id: 'east', q: 'What about the far east?', a: () => [s.sunGate ? 'You opened the golden gate! I added a whole new edge to my map. Then I ran out of paper.' : 'The golden gate in the east has a copper plate in front of it. Like the Storm Stone. Funny, that.'] },
      ],
      rude: { q: "Your map is wrong. That river's in the wrong place.", a: ['WRONG? I walked every step of that river!', '...Go draw your own map, then.'] },
      bye: 'Follow the roads!',
      forgive: "I checked the river. It's in the right place. ...I forgive you anyway.",
    });
  }

  // 0.13: Seren vid västra porten i Willowmere
  talkSeren(n) {
    const s = this.story.state;
    // 0.14: efter titanens anfall slår hon läger i The Galecrown
    if (s.mawDone && this.story.othrys && n.area === 'othrys') { this.story.othrys.talkSeren(n); return; }
    if (s.templeDone && this.story.frost && n.area === 'frost') { this.story.frost.talkSeren(n); return; }
    if (s.spireDone && this.story.sea && n.area === 'sea') { this.story.sea.talkSeren(n); return; }
    if (s.titanRaid && this.story.chronicle) { this.story.chronicle.talkSeren(n); return; }
    if (!s.talked.seren) {
      this.say(n, [
        'Hold. ...You carry yourself like someone who has used that sword.',
        "I'm Seren. I walk the north road from town to town, and I stay wherever the Ashlings are thickest.",
        'Doran lets me keep watch at this gate. He pretends he does not need the help.',
        'If you ever want to trade blows for practice, find me here. I hit softly. Mostly.',
      ], () => { s.talked.seren = true; });
      return;
    }
    const relics = ['hammer', 'prism', 'scales'].filter((k) => s.items?.[k]).length;
    this.chats.chat(n, {
      greet: [this.night ? 'Quiet night. I do not trust quiet nights.' : 'Back again? Good. The gate is dull without company.'],
      topics: [
        { id: 'road', q: 'Where have you travelled?', a: ['North, mostly. Villages behind palisades, and watchtowers with no one left to watch.', 'Wherever the titans walked, the ground still remembers. The grass grows grey there.'] },
        { id: 'fight', q: 'Any advice for a fight?', a: ['Keep your shield up until they commit. Then step in, not back.', 'And never fight on a full stomach. I learned that one the hard way.'] },
        { id: 'relics', q: 'Have you heard of the old relics?', a: () => [relics === 0 ? 'Stories. A hammer that remembers thunder. A prism full of sunlight. I never believed them.' : relics === 1 ? 'So the stories are true. You found one. ...May I look? No? Fair.' : `You carry ${relics} of them now. People will start writing songs about you. Bad ones.`, 'They say the next one waits on a tower that the wind never stops circling.'] },
        { id: 'doran', q: 'What do you think of Doran?', a: ['Stubborn. Loyal. Snores standing up.', "Don't tell him I said the second one."] },
      ],
      rude: { q: 'That armor looks more decorative than useful.', a: ['...Decorative.', 'Come back when you can say that after a real fight.'] },
      bye: 'Keep your guard up.',
      forgive: 'About yesterday. You were half right. The shoulder pieces are for show. The rest is not.',
    });
  }

  talkFenn(n) {
    const story = this.story, s = story.state;
    const L = (t) => story.line(n, t);
    if (!s.talked.fenn) {
      story.talk(n, [
        L('Easy there! I thought you were one of them.'),
        L("Name's Fenn. Scout, out of Willowmere. The Tempest Bastion lies beyond that cave mouth. The Hollow Cave."),
        L("It's black as pitch inside. There are old braziers in there; light them and the stone lets you pass."),
        L(s.lantern ? 'Good, you have a lantern. Mind your oil.' : "You'll need a lantern. No lantern? Then walk back to Willowmere. Pell sells them."),
        L('Rest by my fire if you need it. It is the last warm place before the storm.'),
      ], () => { s.talked.fenn = true; });
      return;
    }
    // Det som behövs för att komma vidare sägs alltid, även när Fenn är sur
    const tip = s.lantern
      ? (s.caveOpen ? "You got through! I heard the stone grind open from out here." : 'Light both braziers inside. The stone door will feel the heat.')
      : 'No lantern, no way through. Willowmere is east across the Stormvale.';
    if (this.chats.mood(n.id)) {
      story.talk(n, [...this.chats.grudge(n), L(tip)]);
      return;
    }
    this.chats.chat(n, {
      greet: [tip],
      topics: [
        { id: 'bastion', q: 'What do you know about the Bastion?', a: ['Iron walls, burned black. Thunder never stops over it. I got as far as the cave and turned back.', 'Some scout, I know.'] },
        { id: 'storm', q: 'Is it always this stormy here?', a: ['Up here? The storm is born here. Thunder comes over those peaks three times a day.', 'If your sword starts to crackle, move. Lightning looks for metal.'] },
        { id: 'fire', q: 'Can I rest by your fire?', a: ['Of course. It is the last warm place before the storm.'] },
        ...(this.story.chronicle?.extraTopics('fenn', n) ?? []),
      ],
      rude: { q: 'Some scout, hiding by a fire.', a: ['Hiding? I am WATCHING. There is a difference.', 'Go freeze in the cave, then.'] },
      bye: 'Keep your oil dry.',
      forgive: "Still alive, I see. Good. I wasn't really mad.",
    });
  }

  // ---------- öknen: Nefret, Hamid, Sabi och Tarek ----------
  // Tarek: vid karavanen tills Cello har valt, sedan vid oasen (räddad) eller borta (rånad)
  placeTarek() {
    const n = this.npcs.tarek, d = this.world.desert;
    if (!n || !d) return;
    const t = this.story.state.tarek;
    if (d.satchel) d.satchel.visible = !t;
    if (t === 'robbed') { n.setVisible(false); return; }
    n.setVisible(true);
    if (t === 'saved') n.place(d.tarekOasis.pos, d.tarekOasis.face, 'sit');
    else n.place(d.npcs.tarek.pos, d.npcs.tarek.face, 'hurt');
  }

  talkTarek(n) {
    const story = this.story, s = story.state, P = story.player;
    const L = (t) => story.line(n, t);
    if (s.tarek === 'saved') {
      if (!s.whetstone) {
        story.talk(n, [
          L('You came! I made it here on one good leg and a lot of cursing.'),
          L('I am Tarek. I trade blades from here to the edge of the world. Or I did, until the Ashlings found my caravan.'),
          L('They took everything but this. A whetstone from the old quarries of Qadesh. A blade kept on it stays sharp twice as long.'),
          L('Take it. A life is worth more than a stone.'),
          { run: () => { s.whetstone = true; P.wearMul = 0.5; this.sfx.play('fanfare'); this.music?.duckFor(2.0, 0.15); this.inventory.refresh(true); this.hud.toast("You got Tarek's Whetstone! Your sword wears down half as fast.", 4600); } },
        ], () => story.save(true));
        return;
      }
      this.chats.chat(n, {
        greet: ['Ah, my cart-lifting friend.'],
        topics: [
          { id: 'leg', q: 'How is your leg?', a: ['My leg will heal. My caravan will not. Still, I am alive to complain about it.'] },
          { id: 'hamid', q: 'You and Hamid are family?', a: ['Hamid is my cousin. He says you are a fool for lifting that cart. He says it the way people say "friend".'] },
          { id: 'pyramid', q: 'What do you know of the pyramid?', a: ['My grandfather said it was built to hold the sun in. Or to hold something out of it.', 'At night the sand around it hums. Nobody goes near it after dark.'] },
        ],
        rude: { q: 'You should have guarded your caravan better.', a: ['...I lost four friends out there.', 'Leave me be.'] },
        bye: 'May the sun keep your back warm.',
        forgive: "I have thought about what you said. You were rude. You were also right. Sit.",
      });
      return;
    }
    story.talk(n, [
      L('Water... Is someone there?'),
      L('Ashlings. They came out of the dunes and tore the caravan apart. My leg is caught under the cart.'),
      L("I can't lift it alone. Please..."),
      { who: '', text: "A heavy leather satchel lies in the sand beside him, half open. It is full of shards." },
      {
        who: '', prompt: 'What does Cello do?',
        choices: [{ text: 'Lift the cart', id: 'lift' }, { text: 'Take the satchel', id: 'take' }],
        onChoose: (id) => {
          if (id === 'lift') {
            return [
              { run: () => { this.sfx.play('stomp', { vol: 0.7 }); this.story.rig.shake(0.3); } },
              { who: '', text: 'Cello sets his shoulder against the cart and heaves. The wood groans, and Tarek drags himself free.' },
              L('By the sun... thank you. I can walk. Barely.'),
              L('I will make for the Sunwell oasis. Find me there, stranger. I owe you a debt.'),
              { run: () => { s.tarek = 'saved'; s.karma += 1; story.save(true); } },
            ];
          }
          return [
            { run: () => { this.inventory.addShards(40); this.sfx.play('shard', { vol: 2 }); } },
            { who: '', text: 'Cello picks up the satchel. It is heavy with shards: 40 of them.' },
            L('...You would rob a dying man?'),
            L('Go, then. The desert remembers.'),
            { run: () => { s.tarek = 'robbed'; s.karma -= 1; story.save(true); } },
          ];
        },
      },
    ], () => {
      if (s.tarek === 'saved') {
        story.startFade(1.6, 'Tarek limps away toward the oasis...', () => this.placeTarek());
      } else if (s.tarek === 'robbed') {
        story.startFade(1.6, 'When Cello looks back, the sand has covered the tracks...', () => this.placeTarek());
      }
    });
  }

  talkNefret(n) {
    const story = this.story, s = story.state;
    if (!s.talked.nefret) {
      this.say(n, [
        'A traveler from beyond the golden gate? Then the gate has opened. The sun has not forgotten us after all.',
        'I am Nefret, the last priestess of Ra. Once this whole land sang to him. Now there is only this oasis, and the pyramid.',
        'The pyramid is his tomb. Or his prison. The old texts disagree.',
        'Inside, the light of Ra still falls through cracks and windows. Mirrors turn it. Eyes of gold wake when it touches them.',
        "Somewhere in its heart lies Ra's own crystal. Find it, and the light will answer to you.",
      ], () => { s.talked.nefret = true; });
      return;
    }
    if (s.flute && story.songs && !story.songs.knows('sun')) {
      this.say(n, ['A flute? Then you should know the hymn.', 'Every morning, the priests of Ra played the sun up over the dunes. And every evening, they sang it to rest. Listen...'],
        () => story.songs.teach('sun', n, () => story.after(1.4, () => this.say(n, ['Ra still listens. Play it under the open sky, and night will turn to day, or day to night.']))));
      return;
    }
    if (s.pyramidDone) {
      this.say(n, this.rotate('nefretD', s.necropolisDone
        ? [['The dead of the necropolis are at rest. I lit a lamp for each of them. I ran out of lamps.'], ['The Windbound Spire... I will search the old texts for it. Come back when the road opens.']]
        : [
          ['The night is thinner over the Wastes since you came back. Ra thanks you, even if he cannot say it.'],
          ['South of here, the old necropolis sank into the sand long ago. Since the serpent fell, the sand has moved, and a black doorway stands open. Follow the road south.'],
          ['The necropolis was the house of Anubis, who weighed the hearts of the dead. If anything still guards it, it will not be kind to the living.'],
        ]));
      return;
    }
    if (s.items.prism) {
      this.say(n, [
        "You carry the Shattered Prism... I can feel its warmth from here.",
        'Stand where the light falls, raise the crystal, and it will throw the sun where your eyes fix.',
        'The serpent Apophis waits in the deepest chamber. Steel slides off its shadow-scales. Only Ra\'s light, thrown back at it, can bring it down.',
      ]);
      return;
    }
    this.say(n, this.rotate('nefretN', [
      ['Turn the mirrors, and follow the light with your eyes. Where it ends, something should wake.'],
      ['Shadows walk in the pyramid. Things your sword passes through like smoke. Do not fight them in the dark.'],
      ['A great scarab guards the crystal. Its shell turns any blade. But even a scarab can be turned on its back.'],
    ]));
  }

  talkHamid(n) {
    const story = this.story, s = story.state, inv = this.inventory, P = story.player;
    const L = (t) => story.line(n, t);
    const robbed = s.tarek === 'robbed';
    const k = robbed ? 1.5 : 1;
    const price = (key) => Math.round(PRICES[key] * k);
    const first = !s.talked.hamid;
    s.talked.hamid = true;
    const menu = () => ({
      who: '', prompt: `What will it be? (You have ${s.shards || 0} shards.)`,
      choices: [
        { text: `Lantern Oil — ${price('hamidOil')}`, id: 'oil' },
        { text: `Oil Flask — ${price('hamidFlask')}`, id: 'flask' },
        { text: `Healing Draught — ${price('hamidPotion')}`, id: 'potion' },
        { text: `Desert Blade — ${price('hamidSword')}`, id: 'sword' },
        { text: 'Nothing', id: 'no' },
      ],
      onChoose: (id) => {
        if (id === 'no') return [L(robbed ? 'Then go. Sand gets in everywhere, even in thieves.' : 'May the sun keep your back warm, friend.')];
        if (id === 'oil' && !s.lantern) return [L('Oil without a lantern? You want to drink it? No, no.')];
        if (id === 'flask' && !s.lantern) return [L('A flask of oil and no lantern? No, no.')];
        if (id === 'oil' && inv.oilFull) return [L('Your lantern is full, friend.')];
        if (id === 'flask' && inv.flasksFull) return [L('Three flasks is all a belt will carry.')];
        if (id === 'potion' && inv.potionsFull) return [L('Your belt is full. Three bottles, no more.')];
        if (id === 'sword' && P.sword.dur >= SWORD_MAX) return [L('Your blade is as good as new. Come back when it is not.')];
        const p = price(id === 'oil' ? 'hamidOil' : id === 'flask' ? 'hamidFlask' : id === 'potion' ? 'hamidPotion' : 'hamidSword');
        if (!inv.spend(p)) { this.sfx.play('denied'); return [L('Not enough shards. The desert does not give credit.')]; }
        this.sfx.play('buy');
        if (id === 'oil') { inv.fillOil(); return [L('Filled. It burns cleaner than the swamp oil up north.')]; }
        if (id === 'flask') { inv.giveFlask(); return [L('A flask of desert oil. It will not freeze, it will not spoil.')]; }
        if (id === 'potion') { inv.givePotion(); return [L('Healing Draught. Cactus and something I will not tell you.')]; }
        P.setSword(SWORD_MAX);
        inv.refresh(true);
        return [L('A desert blade, curved like the moon. Sharper than anything north of the gate.'), { run: () => this.hud.toast('Cello has a new sword!', 3000) }];
      },
    });
    if (first) {
      story.talk(n, robbed
        ? [L('So. You are the one who took my cousin\'s satchel.'), L('Word travels fast in the desert. Faster than you.'), L('I will still sell to you. A trader trades. But the price of thieves is higher.'), menu()]
        : [L('Welcome to the Sunwell, stranger! Hamid has oil, potions and the finest blades between here and nowhere.'), L('Everything you need for the pyramid. Except courage. That you bring yourself.'), menu()]);
      return;
    }
    story.talk(n, [s.tarek === 'saved' && !s.talked.hamidThanks
      ? (s.talked.hamidThanks = true, L('You carried my cousin out of the sand. Tarek says you lifted a whole cart. ...Hamid will not forget.'))
      : L(robbed ? 'What now, thief?' : 'Back again, friend?'), menu()]);
  }

  talkSabi(n) {
    const s = this.story.state;
    this.chats.chat(n, {
      greet: [s.pyramidDone ? 'You fought a snake as big as a river?! Was it slimy?' : 'Are you going to the pyramid? Mama says the sun lives inside it!'],
      topics: [
        { id: 'camels', q: 'What are the camels called?', a: ["The camels are called Dust and Other Dust. I named them. Don't laugh."] },
        { id: 'shadows', q: 'Are you scared of the pyramid?', a: ['Nefret says not to play near the pyramid because the shadows bite. I think shadows are scared of me.'] },
        { id: 'uncle', q: 'Where is your uncle?', a: () => [s.tarek === 'saved' ? 'Uncle Tarek says you lifted a whole cart! Can you lift me?' : s.tarek === 'robbed' ? "Uncle Hamid is angry. He says someone hurt Uncle Tarek. Was it Ashlings?" : 'Uncle Tarek was supposed to come home with the caravan. He is late.'] },
      ],
      rude: { q: 'Your camels look silly.', mood: 'sad', a: ['They do NOT. Dust is very handsome!', "*sniff* I'm going to tell Mama."] },
      bye: 'Bye! Say hi to the sun!',
      forgive: "Dust says he forgives you. Other Dust is still thinking about it.",
    });
  }

  // ---------- varje bildruta ----------
  update(dt) {
    const here = this.areas.id, P = this.story.player;
    this.schedT = (this.schedT ?? 0) - dt;
    if (this.schedT <= 0) { this.schedT = 1; this.schedule(false); }
    this.story.chats?.update(dt, Object.values(this.story.npcs), P, here);
    // Övningsdockan gungar när den blir slagen
    const d = this.dummy;
    if (d && d.wobble > 0) {
      d.wobble = Math.max(0, d.wobble - dt * 1.6);
      const k = Math.sin(d.wobble * 18) * d.wobble * 0.3;
      d.g.rotation.set(Math.cos(d.dir) * k, 0, -Math.sin(d.dir) * k);
    }
    // Djuren strövar runt och bräker ibland
    for (const a of this.animals) {
      if (a.area !== here) continue;
      a.t += dt;
      a.wait -= dt;
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, dist = Math.hypot(dx, dz);
      let moving = false;
      if (a.wait <= 0 && dist > 0.2) {
        const sp = (a.kind === 'chicken' ? 1.2 : 0.8) * (a.speedMul ?? 1);
        a.pos.x += (dx / dist) * Math.min(dist, sp * dt);
        a.pos.z += (dz / dist) * Math.min(dist, sp * dt);
        a.facing += wrap(Math.atan2(dx, dz) - a.facing) * (1 - Math.exp(-dt * 4));
        moving = true;
        if (a.groundAt) a.pos.y = a.groundAt(a.pos.x, a.pos.z);
      } else if (a.wait <= 0) {
        a.wait = 2 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2, r = Math.random() * a.radius;
        a.target.set(a.home.x + Math.cos(ang) * r, a.home.y, a.home.z + Math.sin(ang) * r);
      }
      // Cello går inte igenom djuren
      const px = P.feet.x - a.pos.x, pz = P.feet.z - a.pos.z, pd = Math.hypot(px, pz), min = a.kind === 'chicken' ? 0.4 : a.kind === 'cow' || a.kind === 'horse' || a.kind === 'camel' ? 1.0 : 0.7;
      if (pd < min && pd > 1e-4) P.nudge((px / pd) * (min - pd), (pz / pd) * (min - pd));
      if (pd < 6 && Math.random() < dt * 0.06 && a.kind !== 'camel') this.sfx.play(a.kind === 'goat' ? 'goat' : a.kind === 'cow' ? 'moo' : a.kind === 'horse' ? 'neigh' : 'cluck', { vol: Math.max(0.2, 1 - pd / 6) });
      const m = a.m;
      m.root.position.copy(a.pos);
      m.root.rotation.y = a.facing;
      const sw = moving ? Math.sin(a.t * 9) * 0.5 : 0;
      m.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? sw : -sw) * (i < 2 ? 1 : -1); });
      if (m.head) m.head.rotation.x = moving ? 0 : 0.5 + Math.sin(a.t * 1.3) * 0.3; // betar
      if (a.kind === 'chicken') m.body.rotation.x = moving ? 0 : Math.max(0, Math.sin(a.t * 3)) * 0.6;
    }
  }
}


// Folket ute i världen (0.6): ranchen, vakten i passet, pilgrimen på bron, handlerskan på fältet,
// byborna i Willowmere, spåkvinnan som vet nästa uppdrag och spejaren i Stormreach.
// Här finns också butikerna, kistorna, eldfaten som tänds med lyktan, djuren och övningsdockan.
import * as THREE from 'three';
import { Npc } from './npcs.js';
import { SWORD_MAX } from './player.js';
import { box, cyl } from './geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Priser i skärvor
export const PRICES = { lantern: 40, oil: 10, potion: 20, sword: 30, reforge: 20, magsOil: 14, magsPotion: 25 };

const LOOKS = {
  hollis: { name: 'Hollis', look: { skin: 0xb88a68, hairStyle: 'bald', beard: 0x8a7a6a, top: 0x6a5238, bottom: 0x3a3228, extraColor: 0x4a3a28, width: 1.18, scale: 1.0 } },
  nell: { name: 'Nell', look: { skin: 0xd0aa8c, hair: 0x6a4a3a, hairStyle: 'bun', top: 0x7a6a8a, apron: true, extraColor: 0xd8cfb4, robe: true, scale: 0.9 } },
  tilly: { name: 'Tilly', look: { skin: 0xd8b090, hair: 0xa86a3a, hairStyle: 'long', top: 0x8a4a4a, scale: 0.56 } },
  garrick: { name: 'Garrick', look: { skin: 0xa8805f, helmet: true, beard: 0x3a2a20, top: 0x4a5a6a, extraColor: 0x6a5a40, item: 'spear', width: 1.1, scale: 1.0 } },
  odo: { name: 'Odo', look: { skin: 0xc49f83, hairStyle: 'hood', hood: 0x6a5a40, top: 0x6a5a40, robe: true, beard: 0xd8d0c0, scale: 0.88 } },
  mags: { name: 'Mags', look: { skin: 0xc8a080, hair: 0x9a9a9a, hairStyle: 'bun', shawl: 0x7a3a4a, top: 0x5a4a3a, robe: true, scale: 0.86, width: 1.15 } },
  pell: { name: 'Pell', look: { skin: 0xd0a888, hair: 0x3a2a1a, top: 0x3a5a4a, apron: true, extraColor: 0x8a7a5a, width: 1.12, scale: 0.95 } },
  rosa: { name: 'Rosa', look: { skin: 0xc89878, hair: 0x2a1a14, hairStyle: 'bun', top: 0xa84a3a, apron: true, extraColor: 0xe0d8c4, robe: true, scale: 0.9 } },
  ysolde: { name: 'Ysolde', look: { skin: 0xc8a890, hairStyle: 'hood', hood: 0x4a2a5a, top: 0x4a2a5a, robe: true, shawl: 0x8a6ab0, scale: 0.85, extraColor: 0xc9a24f } },
  doran: { name: 'Doran', look: { skin: 0x9a7a5a, helmet: true, top: 0x5a3a3a, extraColor: 0x8a8a8a, item: 'spear', width: 1.12, scale: 1.0 } },
  fenwick: { name: 'Fenwick', look: { skin: 0xb8906a, hairStyle: 'bald', beard: 0xb0a090, top: 0x4a5a6a, scale: 0.95 } },
  mira: { name: 'Mira', look: { skin: 0xd8b090, hair: 0x3a2a1a, hairStyle: 'long', top: 0x5a7a4a, scale: 0.55 } },
  tob: { name: 'Tob', look: { skin: 0xc49f83, hair: 0x8a5a2a, top: 0x6a6aa0, scale: 0.55 } },
  fenn: { name: 'Fenn', look: { skin: 0xc49f83, hair: 0x4a3020, hairStyle: 'hood', hood: 0x3a4a3a, top: 0x3a4a3a, extraColor: 0x5a4632, item: 'spear', scale: 0.95 } },
};

// ---------- djur ----------
function buildAnimal(kind, M) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const legs = [];
  const B = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
  if (kind === 'chicken') {
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
    for (const r of [world.ranch, world.pass, world.field, world.willow, world.reach, world.interiors]) Object.assign(spots, r?.npcs || {});
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

    // Butiken: varorna på hyllorna
    const shop = world.interiors?.shop;
    if (shop) {
      const ware = (key, label, pos, fn) => story.interactions.push({ label, area: 'shop', pos: () => pos, radius: 1.5, ok: () => true, run: fn });
      ware('lantern', `Lantern — ${PRICES.lantern} shards`, shop.lantern, () => this.offer('lantern'));
      ware('oil', `Lantern Oil — ${PRICES.oil} shards`, shop.oil, () => this.offer('oil'));
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
      story.interactions.push({
        label: 'Open the chest', area: c.area, pos: () => front, radius: 1.5,
        ok: () => (story.phase === 'free' || story.phase === 'intro') && !story.state.opened[c.id] && !c.hidden, run: () => this.openChest(ch),
      });
      a.updaters.push((t, dt) => {
        const open = !!story.state.opened[c.id];
        ch.lidT = open ? Math.min(1, ch.lidT + dt * 2.2) : 0;
        ch.lid.rotation.x = -ch.lidT * 1.9;
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
    for (const r of [world.ranch, world.home, world.willow]) {
      for (const an of r?.animals || []) {
        const m = buildAnimal(an.kind, M);
        m.root.position.copy(an.pos);
        areas.get(an.area).root.add(m.root);
        this.animals.push({ ...an, m, pos: an.pos.clone(), home: (an.center ?? an.pos).clone(), target: an.pos.clone(), wait: Math.random() * 3, t: Math.random() * 9, facing: Math.random() * 6, speed: 0, groundAt: an.H });
      }
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
  }

  combatTargets() {
    return this.dummy && this.areas.id === 'home' ? [this.dummy] : [];
  }

  enterArea(id) {
    // Eldfaten i området: tända om de har tänts förut
    for (const t of this.torches) {
      if (t.area !== id) continue;
      const lit = !!this.story.state.torches?.[t.id];
      this.setTorch(t, lit);
    }
    this.world.reach?.onEnter?.(id, this.story.state);
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
    this.world.reach?.onTorch?.(t.id, this.story);
  }

  openChest(ch) {
    const story = this.story;
    story.state.opened[ch.id] = true;
    this.sfx.play('chest');
    story.cinematic = true;
    story.after(0.7, () => {
      const c = ch.contents;
      if (c.shards) {
        this.sfx.play('fanfare');
        this.music?.duckFor(2.0, 0.15);
        this.inventory.addShards(c.shards);
        this.fx.burst('spark', V(ch.x, ch.y + 1.0, ch.z), 14, 0x8affa0);
        const col = c.shards >= 50 ? 'a purple shard' : c.shards >= 20 ? 'a red shard' : c.shards >= 5 ? 'a blue shard' : 'a green shard';
        story.read([`You found ${col}! It is worth ${c.shards}.`], () => { story.cinematic = false; story.save(true); });
      } else if (c.item === 'potion') {
        this.sfx.play('fanfare');
        const ok = this.inventory.givePotion();
        story.read([ok ? 'You found a Healing Draught!' : 'A Healing Draught... but Cello cannot carry more.'], () => { story.cinematic = false; story.save(true); });
      } else {
        story.cinematic = false;
      }
    });
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
    if (s.bastionDone) {
      this.say(n, ['They say the thunder in the north went quiet. That was you? ...Hah! Thistledown owes you, lad.']);
      return;
    }
    this.say(n, this.rotate('hollisN', [
      ['My mare Brindle bolted when the storm broke. Last I saw, she was running for the Stormvale.', 'Brown, with a white blaze. If you ever see her, tell her Hollis has apples.'],
      ['The Ashlings came for the goats last month. Nell chased them off with a pitchfork.', "Don't tell her I told you. She'll want a medal."],
      ["Short on shards? Cut the tall grass. Funny how they turn up there, like the storm sows them.", 'And break a pot or two. Not mine.'],
    ]));
  }

  talkNell(n) {
    const s = this.story.state;
    this.say(n, s.talked.nell
      ? this.rotate('nellN', [
        ["Tilly talks of nothing but the goats. Now she'll talk of nothing but you."],
        ['Rest by the hearth whenever you pass. The fire never goes out in this house.'],
      ])
      : ['You look half frozen, love. Sit by the hearth a while; you are welcome here.', 'Any friend of the road is a friend of Thistledown.'],
    () => { s.talked.nell = true; });
  }

  talkTilly(n) {
    const s = this.story.state;
    if (s.bastionDone) { this.say(n, ['Is it true you fought a giant made of stone?! I knew you were a knight!']); return; }
    this.say(n, this.rotate('tillyN', [
      ['Are you a knight? You have a sword! And a shield!'],
      ["The big goat is called Grumble. Don't stand behind him. Trust me."],
      ["Dad says the shards in the grass are the sky's tears. I think they're just shiny."],
    ]));
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
    this.say(n, this.rotate('garrickN', [
      ["The Long Bridge has held for three hundred years. I don't intend to be on it the day it doesn't."],
      ['Willowmere lies east across the Stormvale. Good folk. Ask for Ysolde, if you want your fortune told... or your way found.'],
      ['North of the Stormvale the land climbs into Stormreach. That is where the storm comes from. I would not go there without a light.'],
    ]));
  }

  talkOdo(n) {
    const s = this.story.state;
    if (!s.talked.odo) {
      this.say(n, [
        "Oh! A fellow traveler. Sit, sit. I'm Odo. I walk from one Storm Stone to the next, to pray.",
        "There's one on the Stormvale's eastern edge. Asleep, like all the others. Waiting for thunder, the old songs say.",
      ], () => { s.talked.odo = true; });
      return;
    }
    this.say(n, s.eastPath
      ? ['You woke the Storm Stone! I felt it in my bones, all the way out here. Bless you, child.']
      : this.rotate('odoN', [
        ['The view from here... you can see the whole world falling apart. It is beautiful, in a sad way.'],
        ['The old songs say the gods walked this bridge. They must have had better knees than mine.'],
      ]));
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
        { text: `Healing Draught — ${PRICES.magsPotion}`, id: 'potion' },
        { text: 'Just looking', id: 'no' },
      ],
      onChoose: (id) => {
        if (id === 'no') return [L("Off you go, then. Mind the Ashlings, they don't pay.")];
        if (id === 'oil' && !s.lantern) return [L("Oil, without a lantern? You'd just drink it. Pell in Willowmere sells lanterns.")];
        if (id === 'oil' && inv.oilFull) return [L('Your lantern is full, dearie.')];
        if (id === 'potion' && inv.potionsFull) return [L('Your belt is full. Three bottles, no more.')];
        const price = id === 'oil' ? PRICES.magsOil : PRICES.magsPotion;
        if (!inv.spend(price)) { this.sfx.play('denied'); return [L('Not enough shards, dearie. Mags is kind, not charitable.')]; }
        this.sfx.play('buy');
        if (id === 'oil') inv.fillOil(); else inv.givePotion();
        return [L(id === 'oil' ? 'Filled up! Mind it, the dark eats oil.' : 'One potion. Pinch your nose when you drink it.')];
      },
    });
    story.talk(n, first
      ? [L("Customer! Don't be shy, dearie. Mags has a bit of everything — well, two things."), L("Lantern oil and Healing Draughts. A bit dearer than in Willowmere, but Willowmere's a long walk, isn't it?"), menu()]
      : [menu()]);
  }

  talkPell(n) {
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
      {
        who: '', prompt: 'Rest at the inn?',
        choices: [{ text: 'Rest and save', id: 'rest' }, { text: 'Not now', id: 'no' }],
        onChoose: (id) => { if (id === 'rest') story.rest('inn', 'Cello sleeps at the Willow & Wick...'); return []; },
      },
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
    return 'gate';
  }
  goalText(key = this.story.state.hint) {
    return {
      lyra: 'Go back to Aetheria and speak with Lyra. The stone gate waits for her words.',
      lantern: 'Your road leads north, through Stormreach and the Hollow Cave, to the Tempest Bastion. The cave is black as a moonless night. Buy a lantern from Pell first.',
      cave: 'Cross the Stormvale to the north and climb into Stormreach. In the Hollow Cave, light the old braziers with your lantern. The Tempest Bastion waits beyond.',
      boss: "The shard is yours, but the fortress still has a heart of stone. Hrungnir waits beyond the Storm Key's door. Lure him to the pylons and let thunder do the rest.",
      stone: 'Thunder sleeps in the Storm Stone on the eastern edge of the Stormvale. Strike the copper at its feet with the hammer.',
      gate: 'The golden gate is sealed by the sun. Its key lies further than my sight can reach... for now.',
    }[key] ?? null;
  }

  talkYsolde(n) {
    const story = this.story, s = story.state;
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
    this.say(n, this.rotate('doranN', [
      ["Willowmere stands because we keep watch. Ashlings don't like the water; the mere keeps them off."],
      ['North of the Stormvale the land rises into Stormreach. Nothing good comes from there. Except the wind, maybe.'],
      ["Brindle? Hollis' mare? Saw a brown horse running wild on the Stormvale, west of the crossroads. Fast as lightning."],
    ]));
  }

  talkFenwick(n) {
    this.say(n, this.rotate('fenwickN', [
      ["Fish don't bite in a storm. I sit here anyway. It's the sitting I like."],
      ["Pell's got lanterns. You'll want one if you're going north. Caves up there are darker than a titan's heart."],
      ['They say the mere has no bottom. I say it has plenty of bottom, just no fish.'],
    ]));
  }

  talkKid(n, id) {
    this.say(n, this.rotate(`${id}N`, id === 'mira'
      ? [["Tag! You're it! ...Hey, you can't tag with a sword!"], ['Tob says the windmill is haunted. It is NOT. It is just the wind. Probably.']]
      : [['Are you from the Stormvale? Did you see any monsters? Did you hit them?'], ["Mira's scared of the windmill. I'm not. I'm not scared of anything. Except Grandma Ysolde."]]));
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
    story.talk(n, [L(s.lantern
      ? (s.caveOpen ? "You got through! I heard the stone grind open from out here." : 'Light both braziers inside. The stone door will feel the heat.')
      : 'No lantern, no way through. Willowmere is east across the Stormvale.')]);
  }

  // ---------- varje bildruta ----------
  update(dt) {
    const here = this.areas.id, P = this.story.player;
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
        const sp = a.kind === 'chicken' ? 1.2 : 0.8;
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
      const px = P.feet.x - a.pos.x, pz = P.feet.z - a.pos.z, pd = Math.hypot(px, pz), min = a.kind === 'chicken' ? 0.4 : a.kind === 'cow' ? 1.0 : 0.7;
      if (pd < min && pd > 1e-4) P.nudge((px / pd) * (min - pd), (pz / pd) * (min - pd));
      if (pd < 6 && Math.random() < dt * 0.06) this.sfx.play(a.kind === 'goat' ? 'goat' : a.kind === 'cow' ? 'moo' : 'cluck', { vol: Math.max(0.2, 1 - pd / 6) });
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


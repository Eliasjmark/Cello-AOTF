// Cellos hus (0.20): saker som gör det värt att komma hem ibland.
//   · Grytan över härden: en gång om dagen kokar Cello svampsoppa. Fulla hjärtan och en Healing Draught.
//   · Oljetunnan: en gång om dagen fyller han lyktan (och en tom oljeflaska) med kådolja.
//   · Slipstenen: slipar svärdet till fullt, gratis (men en bruten klinga går inte att laga).
//   · Relikhyllan: varje relik Cello hittar står där sedan, och hyllan berättar hur många som saknas.
//   · Korgen vid dörren: efter varje fängelsehåla lämnar folket i byarna en gåva (skärvor och en dryck).
// Sängen fanns redan: vila, spara och sova till morgonen.
import * as THREE from 'three';
import { box, cyl, place } from './geom.js';
import { buildItem } from './items.js';
import { SWORD_MAX } from './player.js';

const RELICS = [
  { key: 'hammer', name: "Thor's Hammer" },
  { key: 'sandals', name: 'the Sandals of Hermes' },
  { key: 'prism', name: 'the Prism' },
  { key: 'trident', name: "Poseidon's Trident" },
  { key: 'mask', name: "Loki's Mask" },
];

// Gåvorna i korgen, en per avklarad fängelsehåla (i den ordning de oftast klaras)
const GIFTS = [
  { flag: 'bastionDone', shards: 30, from: 'Lyra and the people of Aetheria', text: 'For the one who brought the thunder home. Eat something. — Lyra' },
  { flag: 'pyramidDone', shards: 40, from: 'Tarek and Hamid', text: 'The sun shines kinder on the sand now. Hamid says you still owe him a cart. (He is joking.) — Tarek' },
  { flag: 'necropolisDone', shards: 50, from: 'the pilgrim Odo', text: 'The dead sleep easier. So will I. Take this for the road. — Odo' },
  { flag: 'spireDone', shards: 60, from: 'Tob of Willowmere', text: 'I saw the storm go away from the top of the hill! These are my savings. ALL of them. — Tob' },
  { flag: 'templeDone', shards: 70, from: 'Nerissa of Brinehollow', text: 'The sea is quiet again. The fishermen asked me to bring you this. — Nerissa' },
  { flag: 'mawDone', shards: 80, from: 'Sigrun of the north', text: 'The ice remembers your name now, little spark. — Sigrun' },
];

export class HomeHouse {
  constructor(o) {
    Object.assign(this, o); // story, world, areas, inventory, sfx, hud, fx, player, M
    const H = this.world.interiors?.house;
    this.area = this.areas.get('house');
    if (!H || !this.area) return;
    this.H = H;
    this.X = H.bed.x + 3.4; // rummets mitt (x)
    this.build();
    this.addInteractions();
    this.area.updaters.push((t, dt) => this.update(t, dt));
  }

  get s() {
    const s = this.story.state;
    s.home ??= { stewDay: 0, oilDay: 0, gifts: 0 };
    return s.home;
  }

  get day() { return this.story.clock?.day ?? this.story.state.day ?? 1; }

  add(mesh, x, y, z) {
    place(mesh, x, y, z);
    this.area.root.add(mesh);
    return mesh;
  }

  build() {
    const M = this.M, X = this.X;
    // Grytan på en trefot över härden
    const hx = X + 3.2, hz = -4 + 0.7 + 0.75;
    this.potPos = new THREE.Vector3(hx, 0, hz + 0.95);
    for (const a of [0, 2.1, 4.2]) {
      const leg = new THREE.Mesh(cyl(0.025, 0.025, 1.1, 4, 1), M.iron);
      leg.rotation.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      this.add(leg, hx + Math.sin(a) * 0.16, 0.52, hz + Math.cos(a) * 0.16);
    }
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), M.iron);
    this.add(pot, hx, 0.62, hz);
    const stew = new THREE.Mesh(new THREE.CircleGeometry(0.19, 10), new THREE.MeshLambertMaterial({ color: 0x8a5a2a, emissive: 0x2a1404 }));
    stew.rotation.x = -Math.PI / 2;
    this.add(stew, hx, 0.8, hz);
    this.stew = stew;
    this.steam = [];
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), steamMat.clone());
      p.userData.noShadow = true;
      this.add(p, hx, 0.9, hz);
      this.steam.push({ m: p, t: i / 4 });
    }

    // Slipstenen vid vänstra väggen, nära dörren
    const gx = X - 4.1, gz = 2.6;
    this.grindPos = new THREE.Vector3(gx + 0.95, 0, gz);
    for (const dz of [-0.28, 0.28]) this.add(new THREE.Mesh(box(0.1, 0.8, 0.1, 1), M.woodDark), gx, 0.4, gz + dz);
    this.add(new THREE.Mesh(box(0.7, 0.08, 0.7, 1), M.woodDark), gx, 0.1, gz);
    const wheel = new THREE.Mesh(cyl(0.34, 0.34, 0.16, 14, 1), M.rock);
    wheel.rotation.x = Math.PI / 2;
    const wg = new THREE.Group();
    wg.add(wheel);
    wg.rotation.y = Math.PI / 2;
    this.add(wg, gx, 0.82, gz);
    this.wheel = wheel;
    this.add(new THREE.Mesh(cyl(0.03, 0.03, 0.7, 5, 1), M.iron), gx, 0.82, gz).rotation.x = Math.PI / 2;
    this.add(new THREE.Mesh(cyl(0.12, 0.14, 0.18, 8, 1), M.copper), gx + 0.32, 0.09, gz - 0.42); // vattenhinken

    // Oljetunnan (den som redan står vid högra väggen) får en kran och en skylt
    this.oilPos = new THREE.Vector3(X + 4.1 - 0.9, 0, 2.8 - 0.4);
    this.add(new THREE.Mesh(box(0.06, 0.06, 0.18, 1), M.copper), X + 4.1 - 0.46, 0.35, 2.8);
    this.add(new THREE.Mesh(box(0.34, 0.2, 0.02, 1), M.linen), X + 4.1 - 0.47, 0.75, 2.8).rotation.y = -Math.PI / 2;

    // Relikhyllan på högra väggen: två hyllplan, fem platser
    const sx = X + 5 - 0.22;
    this.shelfPos = new THREE.Vector3(sx - 1.1, 0, 0);
    for (const y of [1.15, 1.85]) this.add(new THREE.Mesh(box(0.4, 0.07, 3.0, 1), M.woodDark), sx, y, 0);
    for (const dz of [-1.5, 1.5]) this.add(new THREE.Mesh(box(0.42, 1.2, 0.07, 1), M.woodDark), sx, 1.5, dz);
    this.add(new THREE.Mesh(box(0.44, 0.07, 3.1, 1), M.woodDark), sx, 2.13, 0);
    this.add(new THREE.Mesh(box(0.34, 0.03, 1.8, 1), M.clothRed), sx, 2.18, 0); // ett tyg ovanpå
    this.relicMeshes = {};
    const slots = [[1.19, -0.9], [1.19, 0], [1.19, 0.9], [1.89, -0.55], [1.89, 0.55]];
    RELICS.forEach((r, i) => {
      const [y, z] = slots[i];
      // ett litet podium av sten under varje plats
      this.add(new THREE.Mesh(cyl(0.13, 0.15, 0.06, 8, 1), M.marble), sx, y + 0.06, z);
      let g;
      try { g = buildItem(r.key); } catch { g = null; }
      if (!g) return;
      const bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3());
      const k = 0.5 / Math.max(sz.x, sz.y, sz.z, 0.01);
      g.scale.setScalar(k);
      const holder = new THREE.Group();
      holder.add(g);
      g.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k);
      holder.position.set(sx - 0.02, y + 0.09, z);
      holder.rotation.y = -Math.PI / 2 + 0.35;
      holder.visible = false;
      this.area.root.add(holder);
      this.relicMeshes[r.key] = holder;
    });

    // Korgen vid dörren (syns när det finns en gåva i den)
    const bx = X + 1.7, bz = 2.9;
    this.basketPos = new THREE.Vector3(bx - 0.2, 0, bz - 0.9);
    const basket = new THREE.Group();
    basket.add(place(new THREE.Mesh(cyl(0.3, 0.24, 0.3, 10, 1), M.hay), 0, 0.15, 0));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 4, 12, Math.PI), M.bark);
    basket.add(place(handle, 0, 0.3, 0));
    basket.add(place(new THREE.Mesh(box(0.42, 0.06, 0.32, 1), M.clothRed), 0, 0.32, 0));
    basket.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), M.pumpkin), 0.1, 0.38, 0.05));
    basket.add(place(new THREE.Mesh(box(0.16, 0.02, 0.11, 1), M.linen), -0.08, 0.37, -0.02)); // brevet
    basket.position.set(bx, 0, bz);
    basket.visible = false;
    this.area.root.add(basket);
    this.basket = basket;
  }

  pendingGift() {
    const st = this.story.state, done = GIFTS.filter((g) => st[g.flag]);
    return (this.s.gifts ?? 0) < done.length ? done[this.s.gifts ?? 0] : null;
  }

  addInteractions() {
    const story = this.story, free = () => story.phase === 'free' || story.phase === 'intro';
    const push = (it) => story.interactions.push({ area: 'house', radius: 1.4, ...it });
    push({
      label: () => (this.s.stewDay === this.day ? 'Look in the pot' : 'Cook a stew'), pos: () => this.potPos, ok: () => story.phase === 'free',
      run: () => this.cook(),
    });
    push({
      label: 'Sharpen the sword', pos: () => this.grindPos, ok: free, run: () => this.sharpen(),
    });
    push({
      label: () => (this.story.state.lantern ? 'Fill the lantern' : 'Look at the oil barrel'), pos: () => this.oilPos, ok: () => story.phase === 'free', run: () => this.oil(),
    });
    push({
      label: 'Look at the relic shelf', pos: () => this.shelfPos, radius: 1.8, ok: free, run: () => this.shelf(),
    });
    push({
      label: 'Look in the basket', pos: () => this.basketPos, ok: () => story.phase === 'free' && !!this.pendingGift(), run: () => this.openGift(),
    });
  }

  // Svampsoppan: fulla hjärtan och en dryck, en gång om dagen
  cook() {
    const story = this.story, P = this.player;
    if (this.s.stewDay === this.day) {
      story.read(['The pot is empty and still warm. Cello already ate today.', 'He can cook again tomorrow.']);
      return;
    }
    this.s.stewDay = this.day;
    this.sfx.play('bubble');
    this.sfx.play('drink', { vol: 0.6 });
    P.hp = P.maxHp;
    P.poisonT = 0;
    this.hud.setHearts(P.hp, P.maxHp);
    this.fx.burst('spark', P.feet.clone().add(new THREE.Vector3(0, 1.0, 0)), 12, 0xff9aa0);
    const pot = this.inventory.givePotion();
    story.read([
      'Cello stirs mushrooms, onion and a little goat cheese into the pot. The whole house smells of it.',
      pot ? 'He eats until his hearts are full, and pours the rest into a bottle for the road. You got a Healing Draught!' : 'He eats until his hearts are full. (His bag is too full for a bottle of it.)',
    ], () => story.save(true));
  }

  sharpen() {
    const story = this.story, P = this.player, st = story.state;
    const dur = P.sword?.dur ?? st.sword ?? SWORD_MAX;
    if (dur <= 0) {
      story.read(['The blade is broken off. No stone can fix that.', 'Pell in Willowmere sells swords, and Vane in Aetheria can forge one.']);
      return;
    }
    if (dur >= SWORD_MAX) {
      this.sfx.play('menuDeny');
      story.read(['Cello runs his thumb along the edge. Sharp enough already.']);
      return;
    }
    story.cinematic = true;
    this.spin = 1.6;
    this.sfx.play('stonegrind', { vol: 0.8 });
    story.after(0.7, () => this.sfx.play('anvil', { vol: 0.35, rate: 1.4 }));
    story.after(1.5, () => {
      P.setSword(SWORD_MAX);
      st.sword = SWORD_MAX;
      this.inventory.refresh(true);
      this.sfx.play('item');
      this.fx.burst('spark', P.feet.clone().add(new THREE.Vector3(0, 1.1, 0)), 10, 0xfff0c0);
      story.read(['Cello works the blade on the old grindstone until it sings.', 'The sword is as sharp as new!'], () => { story.cinematic = false; story.save(true); });
    });
  }

  oil() {
    const story = this.story, st = story.state, inv = this.inventory;
    if (!st.lantern) {
      story.read(['A barrel of pine-resin oil Cello pressed himself. It burns slow and smells of the forest.', 'If he had a lantern, he could fill it here.']);
      return;
    }
    if (this.s.oilDay === this.day) {
      story.read(['The tap only drips. The barrel needs a day to settle before it gives more.']);
      return;
    }
    const fullLamp = inv.oilFull, fullFlasks = inv.flasksFull;
    if (fullLamp && fullFlasks) {
      story.read(['The lantern and every flask are already full.']);
      return;
    }
    this.s.oilDay = this.day;
    this.sfx.play('pour');
    if (!fullLamp) inv.fillOil();
    const flask = !fullFlasks && inv.giveFlask();
    story.read([`Cello fills ${fullLamp ? 'a flask' : 'the lantern'} from the barrel${!fullLamp && flask ? ', and an Oil Flask for the road' : ''}.`, 'The barrel will have more tomorrow.'], () => story.save(true));
  }

  shelf() {
    const items = this.story.state.items ?? {};
    const have = RELICS.filter((r) => items[r.key]), miss = RELICS.length - have.length;
    const lines = have.length
      ? [`Cello keeps the relics he has found here: ${have.map((r) => r.name).join(', ')}.`]
      : ['An empty shelf. Cello once built it for "treasures", when he was small.'];
    if (miss > 0) lines.push(`${miss === 1 ? 'One place is' : `${miss} places are`} still empty. Lyra says the gods left more behind than anyone remembers.`);
    else lines.push('Every place on the shelf is full. The gods would be proud. Or worried.');
    this.story.read(lines);
  }

  openGift() {
    const g = this.pendingGift();
    if (!g) return;
    const story = this.story;
    this.s.gifts = (this.s.gifts ?? 0) + 1;
    this.sfx.play('chest');
    story.cinematic = true;
    story.after(0.5, () => {
      this.sfx.play('fanfare');
      this.inventory.addShards(g.shards);
      const pot = this.inventory.givePotion();
      story.read([
        `A basket from ${g.from}. There is a note on top:`,
        `"${g.text}"`,
        `Inside: ${g.shards} shards${pot ? ' and a Healing Draught' : ''}!`,
      ], () => { story.cinematic = false; story.save(true); });
    });
  }

  // När Cello kommer hem till ön och det står en gåva och väntar
  enterHome() {
    if (this.story.phase === 'free' && this.pendingGift() && this.toldGift !== this.s.gifts) {
      this.toldGift = this.s.gifts;
      this.hud.toast("Someone has left a basket inside Cello's house.", 3600);
    }
  }

  update(t, dt) {
    const items = this.story.state.items ?? {};
    for (const r of RELICS) {
      const m = this.relicMeshes[r.key];
      if (m) m.visible = !!items[r.key];
    }
    this.basket.visible = !!this.pendingGift();
    // Soppan ångar när den är kokt i dag; slipstenen snurrar en stund
    const hot = this.s.stewDay === this.day;
    this.stew.material.emissive.setHex(hot ? 0x5a2a08 : 0x1a0c02);
    for (const p of this.steam) {
      p.t = (p.t + dt * 0.35) % 1;
      p.m.visible = hot;
      p.m.position.y = 0.85 + p.t * 0.9;
      p.m.position.x = this.potPos.x + Math.sin(t * 2 + p.t * 6) * 0.06;
      p.m.scale.setScalar(0.6 + p.t * 1.6);
      p.m.material.opacity = 0.22 * (1 - p.t);
    }
    if (this.spin > 0) {
      this.spin -= dt;
      this.wheel.rotation.y += dt * 14;
    }
  }
}

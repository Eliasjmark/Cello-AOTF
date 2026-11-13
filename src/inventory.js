// Föremålsmenyn och snabbknapparna: Cello väljer vilka föremål
// som ligger på F, G och V. Här finns också skärvorna (pengarna), lyktan med sin olja,
// röda drycker och rutorna uppe till höger som visar svärdets skick och knapparnas föremål.
import * as THREE from 'three';
import { SWORD_MAX } from './player.js';
import { SONGS, GLYPH } from './songs.js';

const OIL_MAX = 100;
const OIL_BURN = 0.55; // per sekund när lyktan lyser (en full lykta räcker ungefär tre minuter)
const POTION_MAX = 3;
const FLASK_MAX = 3; // oljeflaskor (0.15)
const WALLET_MAX = 500;
const KEYS = ['F', 'G', 'V'];

const px = (rects) => `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
export const ICONS = {
  strike: px('<rect x="1" y="1" width="6" height="3" fill="#7d808a"/><rect x="5" y="1" width="2" height="1" fill="#2a2a30"/><rect x="2" y="2" width="1" height="1" fill="#8fe4ff"/><rect x="4" y="3" width="1" height="1" fill="#8fe4ff"/><rect x="3.5" y="4" width="1" height="4" fill="#7a4e30"/>'),
  weight: px('<rect x="3" y="1" width="2" height="1" fill="#9a9ca6"/><rect x="2" y="2" width="4" height="1" fill="#9a9ca6"/><rect x="1" y="3" width="6" height="4" fill="#5a5c66"/><rect x="2" y="4" width="4" height="1" fill="#8fe4ff"/>'),
  lantern: px('<rect x="3" y="0" width="2" height="1" fill="#6a6c74"/><rect x="2" y="1" width="4" height="1" fill="#8a8c94"/><rect x="2" y="2" width="1" height="4" fill="#6a6c74"/><rect x="5" y="2" width="1" height="4" fill="#6a6c74"/><rect class="flame" x="3" y="2" width="2" height="4" fill="#ffd27a"/><rect x="3.5" y="3" width="1" height="2" fill="#fff4d0"/><rect x="2" y="6" width="4" height="1" fill="#8a8c94"/>'),
  potion: px('<rect x="3" y="0" width="2" height="1" fill="#8a6a4a"/><rect x="3" y="1" width="2" height="1" fill="#c8d8e0"/><rect x="2" y="2" width="4" height="1" fill="#c8d8e0"/><rect x="1" y="3" width="6" height="4" fill="#d8382f"/><rect x="2" y="7" width="4" height="1" fill="#b02a24"/><rect x="2" y="3" width="1" height="2" fill="#f4a196"/>'),
  sword: px('<rect x="3.5" y="0" width="1" height="5" fill="#dfe6ee"/><rect x="3" y="1" width="0.5" height="4" fill="#9aa2ae"/><rect x="1.5" y="5" width="5" height="1" fill="#c9a24f"/><rect x="3.5" y="6" width="1" height="1.2" fill="#5b3f2a"/><rect x="3.25" y="7.2" width="1.5" height="0.8" fill="#c9a24f"/>'),
  swordBroken: px('<rect x="3.5" y="3" width="1" height="2" fill="#dfe6ee"/><rect x="4" y="2.4" width="0.6" height="0.6" fill="#dfe6ee"/><rect x="1.5" y="5" width="5" height="1" fill="#c9a24f"/><rect x="3.5" y="6" width="1" height="1.2" fill="#5b3f2a"/><rect x="3.25" y="7.2" width="1.5" height="0.8" fill="#c9a24f"/>'),
  shield: px('<rect x="1" y="1" width="6" height="5" fill="#6b4a30"/><rect x="2" y="6" width="4" height="1" fill="#6b4a30"/><rect x="3" y="7" width="2" height="1" fill="#6b4a30"/><rect x="3.5" y="1" width="1" height="6" fill="#8c2a27"/><rect x="1" y="3" width="6" height="1" fill="#8c2a27"/><rect x="1" y="1" width="6" height="0.5" fill="#7a7880"/>'),
  amulet: px('<rect x="2" y="0" width="4" height="1" fill="#c9a24f"/><rect x="1" y="1" width="1" height="3" fill="#c9a24f"/><rect x="6" y="1" width="1" height="3" fill="#c9a24f"/><rect x="2" y="4" width="4" height="1" fill="#c9a24f"/><rect x="3" y="5" width="2" height="2" fill="#4a8ae0"/><rect x="3" y="5" width="1" height="1" fill="#a8d0ff"/>'),
  gloves: px('<rect x="2" y="2" width="4" height="4" fill="#6a4a30"/><rect x="2" y="1" width="1" height="1" fill="#6a4a30"/><rect x="3.2" y="0.5" width="1" height="1.5" fill="#6a4a30"/><rect x="4.4" y="1" width="1" height="1" fill="#6a4a30"/><rect x="6" y="3" width="1" height="2" fill="#6a4a30"/><rect x="2" y="6" width="4" height="2" fill="#c9a24f"/>'),
  letter: px('<rect x="0" y="1" width="8" height="6" fill="#d8cfb4"/><rect x="0" y="1" width="4" height="1" fill="#b8ad96"/><rect x="4" y="1" width="4" height="1" fill="#b8ad96"/><rect x="1" y="2" width="2" height="1" fill="#b8ad96"/><rect x="5" y="2" width="2" height="1" fill="#b8ad96"/><rect x="3" y="3" width="2" height="2" fill="#a8302a"/>'),
  shard: px('<rect x="3" y="0" width="2" height="1" fill="#7af09a"/><rect x="2" y="1" width="4" height="6" fill="#4ad06a"/><rect x="3" y="7" width="2" height="1" fill="#2a9a4a"/><rect x="3" y="2" width="1" height="4" fill="#b8ffd0"/>'),
  prism: px('<rect x="3" y="0" width="2" height="1" fill="#ffe8a8"/><rect x="2" y="1" width="4" height="2" fill="#ffd27a"/><rect x="1" y="3" width="6" height="2" fill="#ffc040"/><rect x="2" y="5" width="4" height="1" fill="#e0a030"/><rect x="3" y="6" width="2" height="1" fill="#c08020"/><rect x="3" y="2" width="1" height="3" fill="#fff6d8"/><rect x="0" y="3" width="1" height="1" fill="#c9a24f"/><rect x="7" y="3" width="1" height="1" fill="#c9a24f"/><rect x="3.5" y="7" width="1" height="1" fill="#c9a24f"/>'),
  whetstone: px('<rect x="1" y="3" width="6" height="2" fill="#8a8c94"/><rect x="2" y="2" width="4" height="1" fill="#a8aab2"/><rect x="1" y="5" width="6" height="1" fill="#5a5c66"/><rect x="5" y="1" width="1" height="2" fill="#dfe6ee"/>'),
  horn: px('<rect x="1" y="1" width="3" height="2" fill="#d8c8a4"/><rect x="4" y="2" width="2" height="2" fill="#c8b48c"/><rect x="5" y="4" width="2" height="2" fill="#b09c74"/><rect x="4" y="6" width="2" height="1" fill="#9a8460"/><rect x="2" y="3" width="2" height="1" fill="#8c2a27"/><rect x="1" y="1" width="1" height="1" fill="#f0e6cc"/>'),
  sandals: px('<rect x="1" y="5" width="5" height="2" fill="#c9a24f"/><rect x="5" y="4" width="2" height="3" fill="#c9a24f"/><rect x="2" y="3" width="1" height="2" fill="#8a6a3a"/><rect x="4" y="3" width="1" height="2" fill="#8a6a3a"/><rect x="6" y="1" width="2" height="1" fill="#f4f4ff"/><rect x="5" y="2" width="3" height="1" fill="#dfe8ff"/><rect x="6" y="3" width="2" height="1" fill="#b8c8ff"/>'),
  scales: px('<rect x="3.5" y="1" width="1" height="6" fill="#2a2a30"/><rect x="2.5" y="7" width="3" height="1" fill="#2a2a30"/><rect x="0" y="1.5" width="8" height="0.8" fill="#c9a24f"/><rect x="3" y="0" width="2" height="1.5" fill="#6af0d4"/><rect x="0" y="2.3" width="0.5" height="2" fill="#c9a24f"/><rect x="7.5" y="2.3" width="0.5" height="2.4" fill="#c9a24f"/><rect x="0" y="4.3" width="2" height="0.8" fill="#c9a24f"/><rect x="6.3" y="4.7" width="1.7" height="0.8" fill="#9a7a3a"/>'),
  trident: px('<rect x="1" y="0" width="1" height="3" fill="#6ac8b0"/><rect x="3.5" y="0" width="1" height="3" fill="#6ac8b0"/><rect x="6" y="0" width="1" height="3" fill="#6ac8b0"/><rect x="1" y="3" width="6" height="1" fill="#4a8a7a"/><rect x="3.5" y="4" width="1" height="4" fill="#4a8a7a"/><rect x="4" y="1" width="1" height="2" fill="#b06aff"/><rect x="2" y="3" width="1" height="1" fill="#b06aff"/>'),
  mask: px('<rect x="2" y="2" width="4" height="4" fill="#c9a24f"/><rect x="1" y="3" width="1" height="2" fill="#c9a24f"/><rect x="6" y="3" width="1" height="2" fill="#c9a24f"/><rect x="0" y="0" width="1" height="3" fill="#2f7a4a"/><rect x="7" y="0" width="1" height="3" fill="#2f7a4a"/><rect x="1" y="1" width="1" height="1" fill="#2f7a4a"/><rect x="6" y="1" width="1" height="1" fill="#2f7a4a"/><rect x="3" y="3" width="1" height="1" fill="#9dff9a"/><rect x="5" y="3" width="1" height="1" fill="#9dff9a"/><rect x="3" y="5" width="2" height="1" fill="#6a4a10"/><rect x="3" y="6" width="2" height="1" fill="#c9a24f"/>'),
  flute: px('<rect x="6" y="0" width="2" height="1" fill="#8c2a27"/><rect x="5" y="1" width="2" height="1" fill="#c8a06a"/><rect x="4" y="2" width="2" height="1" fill="#b8925a"/><rect x="3" y="3" width="2" height="1" fill="#c8a06a"/><rect x="2" y="4" width="2" height="1" fill="#b8925a"/><rect x="1" y="5" width="2" height="1" fill="#c8a06a"/><rect x="0" y="6" width="2" height="1" fill="#9a7444"/><rect x="4" y="2" width="1" height="1" fill="#3a2a1a"/><rect x="2" y="4" width="1" height="1" fill="#3a2a1a"/><rect x="0" y="7" width="1" height="1" fill="#6a4a2a"/>'),
  flask: px('<rect x="3" y="0" width="2" height="1" fill="#8a6a4a"/><rect x="3" y="1" width="2" height="2" fill="#b8c4c8"/><rect x="2" y="3" width="4" height="4" fill="#d8a43a"/><rect x="2" y="7" width="4" height="1" fill="#9a7020"/><rect x="2" y="3" width="1" height="2" fill="#ffe08a"/><rect x="3" y="4" width="2" height="1" fill="#6a4a20"/>'),
  heart: px('<rect x="1" y="1" width="2" height="1" fill="#d8382f"/><rect x="5" y="1" width="2" height="1" fill="#d8382f"/><rect x="0" y="2" width="8" height="2" fill="#d8382f"/><rect x="1" y="4" width="6" height="1" fill="#d8382f"/><rect x="2" y="5" width="4" height="1" fill="#d8382f"/><rect x="3" y="6" width="2" height="1" fill="#d8382f"/><rect x="1" y="2" width="1" height="1" fill="#f4a196"/>'),
};

export const ITEMS = {
  strike: { name: "Mjölnir's Shard", desc: 'Strike the ground. Lightning runs through copper, shatters shields and wakes old stones.', icon: 'strike' },
  weight: { name: 'Weight of Thunder', desc: 'The shard makes Cello heavy: slow, but unmoved by storm winds. He sinks through cracked floors.', icon: 'weight' },
  lantern: { name: 'Lantern', desc: 'An oil lantern. Lights the dark and old braziers. Uses oil while it burns.', icon: 'lantern' },
  trident: { name: "Poseidon's Corrupted Trident", desc: 'The spear of the sea god, veined with a purple curse. Press its button to dash with it: under water Cello shoots forward like a fish. It breaks brittle coral. At a tide altar, press E to make the water rise or fall.', icon: 'trident' },
  mask: { name: "Loki's Mask", desc: 'The trickster\'s mask of gold and green. Press its button: Cello\'s shadow flies ahead and stands where it lands (it slips through rime grates, and holds down plates). Press again to swap places with it.', icon: 'mask' },
  flask: { name: 'Oil Flask', desc: 'A stoppered flask of lantern oil. Use it to fill the lantern. If the lantern runs dry while it burns, Cello pours one in by himself.', icon: 'flask' },
  potion: { name: 'Healing Draught', desc: 'Restores four hearts. Bitter, but it works.', icon: 'potion' },
  prism: { name: "Ra's Shattered Prism", desc: 'Raise it to catch sunlight and throw it where Cello faces. Lock on to aim. Sunlight burns shadow and wakes sun eyes.', icon: 'prism' },
  horn: { name: "Grumble's Horn", desc: 'Blow it outdoors and Grumble comes running. Press E next to him to ride; he is twice as fast as Cello.', icon: 'horn' },
  sandals: { name: "Hermes' Wing Sandals", desc: 'Golden sandals with tiny wings. Put them on and Cello runs like the wind, jumps further, and can run along walls for a few heartbeats. Updrafts lift him high.', icon: 'sandals' },
  scales: { name: "Anubis' Broken Scales", desc: 'Tip them to step between the realm of the living and the realm of the dead. The dead realm shows spirits, hidden bridges and the truth behind false stone.', icon: 'scales' },
  flute: { name: "Pilgrim's Flute", desc: 'Press its button to play. Play notes with ↑ ← → ↓ and Space; Esc stops. Songs you learn are listed below.', icon: 'flute' },
};
const ORDER = ['strike', 'weight', 'prism', 'scales', 'sandals', 'trident', 'mask', 'lantern', 'flask', 'horn', 'flute', 'potion'];

export class Inventory {
  constructor(ctx) {
    Object.assign(this, ctx); // story, player, hud, sfx, input, fx, lights, music, world
    this.open = false;
    this.sel = 0;
    this.lit = false;
    this.hintedEmpty = false;
    this.lightSrc = this.lights.add({ x: 0, y: 0, z: 0, color: 0xffc46a, power: 0, range: 11, flicker: 0.35 });
    this.lightSrc.area = null;
    this.lightSrc.on = false;
    this.lightSrc.prio = 1000;
    this.buildDom();
    this.hudKey = '';
  }

  get s() { return this.story.state; }

  // ---------- tillstånd ----------
  reset() {
    this.lit = false;
    this.player.setLantern(false, false);
    this.player.hasPrism = false;
    this.player.setPrism(false);
    this.player.hasSandals = false;
    this.player.hasTrident = false;
    this.player.hasMask = false;
    this.player.swift = false;
    this.player.wearMul = 1;
    this.refresh(true);
  }
  load(s) {
    s.slots = Array.isArray(s.slots) ? s.slots.slice(0, 3) : [null, null, null];
    while (s.slots.length < 3) s.slots.push(null);
    // Sparningar från 0.5: hammaren låg alltid på F och G
    if (s.items?.hammer && !s.slots.includes('strike') && !s.slots.includes('weight')) s.slots = ['strike', 'weight', s.slots[2]];
    this.player.hasPrism = !!s.items?.prism;
    this.player.hasSandals = !!s.items?.sandals;
    this.player.hasTrident = !!s.items?.trident;
    this.player.hasMask = !!s.items?.mask;
    this.player.swift = false;
    this.player.wearMul = s.whetstone ? 0.5 : 1;
    this.lit = false;
    this.player.setLantern(!!s.lantern, false);
    this.refresh(true);
  }
  store(s) {
    s.oil = Math.round((s.oil ?? 0) * 10) / 10;
  }

  owned() {
    const s = this.s;
    return ORDER.filter((id) => (id === 'strike' || id === 'weight' ? s.items?.hammer : id === 'prism' ? s.items?.prism : id === 'lantern' ? s.lantern
      : id === 'horn' ? !!s.goat?.have : id === 'flute' ? !!s.flute : id === 'scales' ? !!s.items?.scales : id === 'sandals' ? !!s.items?.sandals : id === 'trident' ? !!s.items?.trident : id === 'mask' ? !!s.items?.mask : id === 'potion' ? s.potions > 0 : id === 'flask' ? s.flasks > 0 : false));
  }

  // ---------- skärvor ----------
  addShards(n) {
    this.s.shards = Math.min(WALLET_MAX, (this.s.shards || 0) + n);
    this.refresh();
  }
  spend(n) {
    if ((this.s.shards || 0) < n) return false;
    this.s.shards -= n;
    this.refresh();
    return true;
  }

  // ---------- att få föremål ----------
  // Lägger ett föremål på första lediga knapp (om det inte redan ligger på en)
  // force: om alla knappar är upptagna byts den sista ut (för föremål man behöver direkt)
  autoSlot(id, force = false) {
    const sl = this.s.slots;
    if (sl.includes(id)) return;
    const free = sl.indexOf(null);
    if (free >= 0) sl[free] = id;
    else if (force) sl[2] = id;
  }
  gotPrism() {
    this.autoSlot('prism');
    this.refresh(true);
  }
  gotHorn() {
    this.autoSlot('horn');
    this.refresh(true);
  }
  // Knappen ett föremål ligger på (F, G eller V), eller null
  keyFor(id) {
    const i = this.s.slots.indexOf(id);
    return i >= 0 ? KEYS[i] : null;
  }
  gotHammer() {
    this.autoSlot('strike');
    this.autoSlot('weight');
    this.refresh(true);
  }
  giveLantern() {
    this.s.lantern = true;
    this.s.oil = OIL_MAX;
    this.player.setLantern(true, this.lit);
    this.autoSlot('lantern');
    this.refresh(true);
  }
  fillOil() {
    this.s.oil = OIL_MAX;
    this.refresh(true);
  }
  givePotion() {
    if (this.s.potions >= POTION_MAX) return false;
    this.s.potions = (this.s.potions || 0) + 1;
    this.autoSlot('potion');
    this.refresh(true);
    return true;
  }
  // En oljeflaska att bära med sig (0.15)
  giveFlask() {
    if ((this.s.flasks || 0) >= FLASK_MAX) return false;
    this.s.flasks = (this.s.flasks || 0) + 1;
    this.autoSlot('flask');
    this.refresh(true);
    return true;
  }
  get flasksFull() { return (this.s.flasks || 0) >= FLASK_MAX; }
  // Häller en flaska i lyktan. auto: när lyktan slocknar av sig själv
  pourFlask(auto = false) {
    const s = this.s;
    if (!s.flasks || !s.lantern) return false;
    s.flasks--;
    s.oil = OIL_MAX;
    this.sfx.play('pour');
    this.hud.toast(auto ? `The lantern sputters... Cello pours in an Oil Flask. (${s.flasks} left)` : `Cello fills the lantern from an Oil Flask. (${s.flasks} left)`, 2600);
    if (!s.flasks) s.slots = s.slots.map((x) => (x === 'flask' ? null : x));
    this.refresh(true);
    return true;
  }
  get oilFull() { return (this.s.oil ?? 0) >= OIL_MAX - 0.5; }
  get potionsFull() { return (this.s.potions || 0) >= POTION_MAX; }

  // ---------- att använda föremål ----------
  // Knapptryckningar blir handlingar: markslag och tung vikt går till Cello, resten sköts här
  actions(inp) {
    const out = { ...inp, slam: false, heavy: false, prism: false, trident: false, mask: false };
    const P = this.player;
    ['item1', 'item2', 'item3'].forEach((key, i) => {
      if (!inp[key]) return;
      const id = this.s.slots[i];
      if (!id || !this.owned().includes(id)) {
        if (!this.hintedEmpty && this.owned().length) {
          this.hintedEmpty = true;
          this.hud.toast(`Nothing on ${KEYS[i]}. Press Tab to open your items and choose one.`, 3600);
        }
        return;
      }
      if (P.carried) return;
      if (P.mount && id !== 'horn' && id !== 'potion' && id !== 'lantern') {
        if (id === 'flute') { this.hud.toast('Climb down from Grumble to play the flute (E).', 2200); return; }
        this.hud.toast('Climb down from Grumble first (E).', 2200);
        return;
      }
      if (id === 'strike') out.slam = true;
      else if (id === 'weight') out.heavy = true;
      else if (id === 'prism') out.prism = true;
      else if (id === 'sandals') out.swift = true;
      else if (id === 'trident') out.trident = true;
      else if (id === 'mask') out.mask = true;
      else this.use(id);
    });
    return out;
  }

  use(id) {
    const P = this.player;
    if (P.state === 'dead') return;
    if (id === 'lantern') {
      // Nära ett släckt eldfat tänds det i stället
      const torch = this.story.folk?.torchNear(P.feet);
      if (torch) {
        if ((this.s.oil ?? 0) <= 0 && !this.pourFlask(true)) { this.noOil(); return; }
        this.s.oil = Math.max(0, this.s.oil - 2);
        this.story.folk.lightTorch(torch);
        if (!this.lit) this.setLit(true);
        this.refresh();
        return;
      }
      if (this.lit) this.setLit(false);
      else if ((this.s.oil ?? 0) <= 0) { if (this.pourFlask(true)) this.setLit(true); else this.noOil(); }
      else this.setLit(true);
    } else if (id === 'flask') {
      if (!this.s.lantern) { this.hud.toast('Cello has no lantern to fill.', 2200); this.sfx.play('denied'); return; }
      if (this.oilFull) { this.hud.toast('The lantern is already full.', 2200); this.sfx.play('denied'); return; }
      this.pourFlask();
    } else if (id === 'horn') {
      this.story.goat?.call();
    } else if (id === 'flute') {
      this.story.songs?.start();
    } else if (id === 'scales') {
      this.story.realm?.toggle();
    } else if (id === 'potion') {
      if (!this.s.potions) return;
      if (P.hp >= P.maxHp) {
        this.hud.toast('Cello is already in good health.', 2200);
        this.sfx.play('denied');
        return;
      }
      this.s.potions--;
      P.heal(8);
      this.hud.setHearts(P.hp, P.maxHp);
      this.sfx.play('drink');
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.2), 14, 0xff8a7a);
      this.hud.toast('Cello drinks a Healing Draught.', 2000);
      if (!this.s.potions) this.s.slots = this.s.slots.map((x) => (x === 'potion' ? null : x));
      this.refresh(true);
    }
  }

  noOil() {
    this.sfx.play('denied');
    this.hud.toast('The lantern is out of oil. Pell in Willowmere sells Lantern Oil and Oil Flasks to carry.', 3600);
  }

  setLit(on) {
    this.lit = on;
    this.sfx.play(on ? 'lantern' : 'lanternoff');
    this.player.setLantern(!!this.s.lantern, on);
    this.refresh();
  }

  potionRevive() {
    return false;
  }

  enterArea(a) {
    // I mörka områden påminner spelet om lyktan
    if (!a.dark) return;
    this.story.after(1.6, () => {
      if (this.story.areas.cur !== a || this.lit) return;
      if (!this.s.lantern) this.hud.toast('It is too dark to see much. A lantern would help here.', 3600);
      else if ((this.s.oil ?? 0) > 0) {
        const k = this.s.slots.indexOf('lantern');
        this.hud.toast(k >= 0 ? `It is pitch dark. Press ${KEYS[k]} to light the lantern!` : 'It is pitch dark. Put the lantern on a button (Tab) and light it!', 3600);
      } else this.noOil();
    });
  }

  update(dt) {
    const P = this.player;
    if (this.lit) {
      this.s.oil = Math.max(0, (this.s.oil ?? 0) - dt * OIL_BURN);
      if (this.s.oil <= 0 && !this.pourFlask(true)) {
        this.setLit(false);
        this.hud.toast('The lantern flickers and goes out. It needs oil.', 3600);
      }
    }
    const L = this.lightSrc;
    L.on = this.lit;
    if (this.lit) {
      L.pos.set(P.feet.x + Math.sin(P.facing) * 0.3, P.feet.y + 1.3, P.feet.z + Math.cos(P.facing) * 0.3);
      const dark = this.story.areas.cur?.dark;
      L.power = dark ? 30 : 16;
      L.range = dark ? 14 : 10;
      this.lights.pickT = Math.min(this.lights.pickT, 0.05);
    }
    this.oilT = (this.oilT || 0) - dt;
    if (this.oilT <= 0) { this.oilT = 0.5; this.refresh(); }
  }

  // ---------- menyn ----------
  toggle(force) {
    const on = force ?? !this.open;
    if (on === this.open) return;
    if (on && !this.owned().length && this.story.phase === 'intro') return;
    this.open = on;
    this.el.bag.hidden = !on;
    this.sfx.play('menu', { vol: on ? 1 : 0 });
    if (on) {
      try { document.exitPointerLock?.(); } catch { /* ignoreras */ }
      this.sel = Math.min(this.sel, Math.max(0, this.owned().length - 1));
      this.renderBag();
    }
  }

  // Navigering i menyn (tangentbord och handkontroll)
  menu(dt, inp) {
    const items = this.owned();
    if (inp.cancel) { this.toggle(false); return; }
    if (items.length) {
      const move = (inp.right || inp.down ? 1 : 0) - (inp.left || inp.up ? 1 : 0);
      if (move) {
        this.sel = (this.sel + move + items.length) % items.length;
        this.sfx.play('select');
        this.renderBag();
      }
      ['item1', 'item2', 'item3'].forEach((key, i) => { if (inp[key]) this.assign(items[this.sel], i); });
    }
  }

  // Lägg ett föremål på en knapp (det som låg där byter plats)
  assign(id, slot) {
    if (!id) return;
    const sl = this.s.slots;
    const prev = sl.indexOf(id);
    if (prev === slot) { sl[slot] = null; this.sfx.play('select'); }
    else {
      if (prev >= 0) sl[prev] = sl[slot];
      sl[slot] = id;
      this.sfx.play('equip');
    }
    this.renderBag();
    this.refresh(true);
  }

  buildDom() {
    const hud = document.querySelector('.hud');
    const bag = document.createElement('div');
    bag.className = 'bag';
    bag.id = 'bag';
    bag.hidden = true;
    bag.setAttribute('role', 'dialog');
    bag.setAttribute('aria-label', 'Items');
    bag.innerHTML = `
      <div class="bag-panel">
        <div class="bag-head"><h2 class="bag-title">Items</h2><span class="bag-wallet">${ICONS.shard}<span id="bag-shards">0</span></span></div>
        <div class="bag-grid" id="bag-items"></div>
        <div class="bag-info"><p class="bag-name" id="bag-name"></p><p class="bag-desc" id="bag-desc"></p></div>
        <div class="bag-assign" id="bag-assign"></div>
        <h3 class="bag-sub">Gear</h3>
        <div class="bag-gear" id="bag-gear"></div>
        <div class="bag-songs" id="bag-songs" hidden></div>
        <p class="bag-goal" id="bag-goal" hidden></p>
        <p class="bag-hint"><span class="desk">Choose an item, then press <kbd>F</kbd> <kbd>G</kbd> or <kbd>V</kbd> to put it on that button. <kbd>Tab</kbd> closes.</span><span class="touchonly">Tap an item, then tap a button to put it there.</span></p>
        <button class="bag-close" id="bag-close" type="button">Close</button>
      </div>`;
    hud.appendChild(bag);
    const $ = (id) => document.getElementById(id);
    this.el = {
      bag, items: $('bag-items'), name: $('bag-name'), desc: $('bag-desc'), assign: $('bag-assign'), gear: $('bag-gear'),
      goal: $('bag-goal'), shards: $('bag-shards'), songs: $('bag-songs'),
      hudItems: $('items'), wallet: $('wallet'), walletN: $('wallet-n'), oil: null,
    };
    $('bag-close').addEventListener('click', () => this.toggle(false));
    bag.addEventListener('click', (e) => { if (e.target === bag) this.toggle(false); });
    this.el.items.addEventListener('click', (e) => {
      const b = e.target.closest('[data-item]');
      if (!b) return;
      this.sel = Number(b.dataset.index);
      this.sfx.play('select');
      this.renderBag();
    });
    this.el.assign.addEventListener('click', (e) => {
      const b = e.target.closest('[data-slot]');
      if (!b) return;
      this.assign(this.owned()[this.sel], Number(b.dataset.slot));
    });
    // Rutorna uppe till höger: svärdet och de tre knapparna
    const slots = this.el.hudItems;
    slots.innerHTML = `
      <div class="slot slot-sword" id="slot-sword" title="Sword"><span class="ico"></span><span class="bar"><i></i></span></div>
      ${KEYS.map((k, i) => `<button type="button" class="slot" id="slot-${i}" data-press="item${i + 1}" title="Item on ${k}"><span class="ico"></span><span class="count"></span><span class="bar oil"><i></i></span><kbd>${k}</kbd></button>`).join('')}`;
    this.el.slots = KEYS.map((_, i) => document.getElementById(`slot-${i}`));
    this.el.sword = document.getElementById('slot-sword');
    this.el.slots.forEach((b, i) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.press(`item${i + 1}`, true); });
    });
  }

  renderBag() {
    const items = this.owned(), s = this.s;
    this.el.items.innerHTML = items.length
      ? items.map((id, i) => {
        const slot = s.slots.indexOf(id);
        const extra = id === 'potion' ? `<span class="count">${s.potions}</span>` : id === 'flask' ? `<span class="count">${s.flasks}</span>` : '';
        return `<button type="button" class="bag-item${i === this.sel ? ' sel' : ''}" data-item="${id}" data-index="${i}" aria-pressed="${i === this.sel}">
          <span class="ico">${ICONS[ITEMS[id].icon]}</span>${extra}${slot >= 0 ? `<kbd>${KEYS[slot]}</kbd>` : ''}</button>`;
      }).join('')
      : '<p class="bag-empty">No items yet.</p>';
    const id = items[this.sel];
    this.el.name.textContent = id ? ITEMS[id].name : '';
    let desc = id ? ITEMS[id].desc : 'Items you find will appear here.';
    if (id === 'lantern') desc += ` Oil: ${Math.round(s.oil ?? 0)}%.`;
    if (id === 'potion') desc += ` You carry ${s.potions} of ${POTION_MAX}.`;
    if (id === 'flask') desc += ` You carry ${s.flasks} of ${FLASK_MAX}. Lantern oil: ${Math.round(s.oil ?? 0)}%.`;
    this.el.desc.textContent = desc;
    this.el.assign.innerHTML = KEYS.map((k, i) => {
      const it = s.slots[i];
      return `<button type="button" class="assign-slot${it && it === id ? ' on' : ''}" data-slot="${i}"><kbd>${k}</kbd><span class="ico">${it && this.owned().includes(it) ? ICONS[ITEMS[it].icon] : ''}</span></button>`;
    }).join('');
    // Utrustning: svärd, sköld och det Cello har fått
    const P = this.player, sw = P.sword;
    const pct = Math.round((sw.dur / SWORD_MAX) * 100);
    const gear = [
      { icon: sw.broken ? 'swordBroken' : 'sword', name: sw.broken ? 'Broken Sword' : "Cello's Sword", info: sw.broken ? 'Snapped' : `${pct}%`, bar: sw.broken ? 0 : pct },
      { icon: 'shield', name: 'Wooden Shield', info: '' },
    ];
    if (s.amulet) gear.push({ icon: 'amulet', name: "Maren's Amulet", info: '+1 heart' });
    if (s.gloves) gear.push({ icon: 'gloves', name: "Smith's Gloves", info: 'Faster strike' });
    if (s.whetstone) gear.push({ icon: 'whetstone', name: "Tarek's Whetstone", info: 'Sword wears slower' });
    if (s.kaelLetter && !s.letterGiven) gear.push({ icon: 'letter', name: 'Letter to Kael', info: '' });
    this.el.gear.innerHTML = gear.map((g) => `<div class="gear"><span class="ico">${ICONS[g.icon]}</span><span class="gear-text"><b>${g.name}</b>${g.info ? `<small>${g.info}</small>` : ''}${g.bar !== undefined ? `<span class="bar"><i style="width:${g.bar}%"></i></span>` : ''}</span></div>`).join('');
    this.el.shards.textContent = s.shards || 0;
    // Sångerna Cello kan (0.11)
    const known = this.story.songs ? Object.keys(SONGS).filter((k) => s.songs?.includes(k)) : [];
    this.el.songs.hidden = !s.flute;
    if (s.flute) {
      this.el.songs.innerHTML = `<h3 class="bag-sub">Songs</h3>${known.length
        ? `<ul>${known.map((k) => `<li><b>${SONGS[k].name}</b><span class="notes">${SONGS[k].notes.map((n) => GLYPH[n]).join(' ')}</span><small>${SONGS[k].desc}</small></li>`).join('')}</ul>`
        : '<p class="bag-empty">No songs yet. Someone who knows the old songs might teach you.</p>'}`;
    }
    const goal = this.story.folk?.goalText();
    this.el.goal.hidden = !goal;
    if (goal) this.el.goal.textContent = `Ysolde's words: ${goal}`;
  }

  // Uppdaterar rutorna uppe till höger och plånboken
  refresh(force = false) {
    const s = this.s, P = this.player;
    if (!s) return;
    const sw = P.sword;
    const key = [s.slots.join(','), this.owned().join(','), s.potions, s.flasks, Math.round(s.oil ?? 0), this.lit, sw.broken, Math.round(sw.dur), s.shards, P.heavy, P.gloves, P.prismUp, this.hud.started, !!this.story.realm?.dead].join('|');
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    const show = this.hud.started && this.story.phase !== 'intro';
    this.el.hudItems.hidden = !show;
    this.el.sword.querySelector('.ico').innerHTML = sw.broken ? ICONS.swordBroken : ICONS.sword;
    const bar = this.el.sword.querySelector('.bar i');
    const pct = sw.dur / SWORD_MAX;
    bar.style.width = `${Math.round(pct * 100)}%`;
    this.el.sword.classList.toggle('worn', pct < 0.25);
    this.el.sword.classList.toggle('broken', sw.broken);
    const owned = this.owned();
    this.el.slots.forEach((b, i) => {
      const id = s.slots[i];
      const ok = id && owned.includes(id);
      b.querySelector('.ico').innerHTML = ok ? ICONS[ITEMS[id].icon] : '';
      b.classList.toggle('empty', !ok);
      b.classList.toggle('on', ok && ((id === 'weight' && P.heavy) || (id === 'lantern' && this.lit) || (id === 'prism' && P.prismUp) || (id === 'scales' && !!this.story.realm?.dead) || (id === 'sandals' && P.swift)));
      b.classList.toggle('gloves', ok && id === 'strike' && P.gloves);
      b.querySelector('.count').textContent = ok && id === 'potion' ? s.potions : ok && id === 'flask' ? s.flasks : '';
      const oil = b.querySelector('.oil');
      oil.hidden = !(ok && id === 'lantern');
      if (!oil.hidden) oil.querySelector('i').style.width = `${Math.round(s.oil ?? 0)}%`;
    });
    // Mobilknapparna för föremål syns bara när knappen har något
    document.querySelectorAll('[data-press^="item"]').forEach((b) => {
      if (b.classList.contains('slot')) return;
      const i = Number(b.dataset.press.slice(4)) - 1;
      const id = s.slots[i];
      b.hidden = !(id && owned.includes(id));
      if (!b.hidden) b.innerHTML = ICONS[ITEMS[id].icon];
    });
    const w = this.el.wallet;
    if (w) {
      w.hidden = !show;
      this.el.walletN.textContent = s.shards || 0;
    }
    if (this.open) this.renderBag();
  }
}

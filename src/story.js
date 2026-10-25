// Berättelsen: vägen hem, prologen i den brinnande byn, det första valet, Aetheria,
// stenvägen till The Tempest Bastion, föremålen, brevet till Kael, stormstenen i öster, den gyllene porten,
// pyramiden och vad titanerna egentligen vill (som Cello får veta först av den tredje titanen), och sparfunktionen.
//
// Faser:  intro → prologue → (carry → Aetheria)  eller  (titan → vaknar i Aetheria) → free
// Valen sparas i `state` och styr vad folk säger, hur Cello ser ut och vad han får.
import * as THREE from 'three';
import { Npc } from './npcs.js';
import { Titan } from './titan.js';
import { buildItem, ITEM_TEXT } from './items.js';
import { SWORD_MAX } from './player.js';

const SAVE_KEY = 'cello-ashes-of-the-fallen:save';
const META_KEY = 'cello-ashes-of-the-fallen:meta';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- två sparfiler (0.9) ----------
// Fil 1 och Fil 2 sparas var för sig. En sparning från 0.8 eller tidigare flyttas till Fil 1 första gången.
export const SLOTS = [1, 2];
const slotKey = (n) => `${SAVE_KEY}:${n}`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ingen lagring */ } },
};
const valid = (d) => d && (d.v === 1 || d.v === 2) && d.state ? d : null;

function migrate() {
  const old = store.get(SAVE_KEY);
  if (!old) return;
  if (!store.get(slotKey(1))) store.set(slotKey(1), old);
  store.del(SAVE_KEY);
}

export function loadSave(slot) {
  migrate();
  if (slot === undefined) slot = continueSlot();
  if (!slot) return null;
  try {
    const raw = store.get(slotKey(slot));
    return raw ? valid(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function listSaves() {
  migrate();
  return SLOTS.map((n) => ({ slot: n, save: loadSave(n) }));
}

export function eraseSave(slot) {
  store.del(slotKey(slot));
  const m = meta();
  if (m.last === slot) { m.last = null; store.set(META_KEY, JSON.stringify(m)); }
}

export function copySave(from, to) {
  const raw = store.get(slotKey(from));
  return raw ? store.set(slotKey(to), raw) : false;
}

function meta() {
  try { return JSON.parse(store.get(META_KEY) || '{}') || {}; } catch { return {}; }
}

export function setLastSlot(slot) {
  store.set(META_KEY, JSON.stringify({ ...meta(), last: slot }));
}

// Filen som Continue fortsätter: den som spelades senast, annars den som sparades senast
export function continueSlot() {
  migrate();
  const m = meta();
  const has = (n) => !!store.get(slotKey(n));
  if (m.last && has(m.last)) return m.last;
  let best = null, bt = -1;
  for (const n of SLOTS) {
    const raw = store.get(slotKey(n));
    if (!raw) continue;
    let at = 0;
    try { at = JSON.parse(raw).savedAt || 0; } catch { /* trasig fil */ }
    if (at > bt) { bt = at; best = n; }
  }
  return best;
}

function writeSave(slot, data) {
  const ok = store.set(slotKey(slot), JSON.stringify(data));
  if (ok) setLastSlot(slot);
  return ok;
}

const freshState = () => ({
  playTime: 0,
  choice1: null, karma: 0, amulet: false, kaelQuest: null, talked: {},
  // 0.4: stenvägarna, föremålen och fästningen
  northPath: false, eastPath: false, items: { hammer: false, prism: false }, hearts: 0, bastion: null,
  bastionDone: false, kaelLetter: false, letterGiven: false, gloves: false, spawnAt: 'aetheria',
  // 0.6: en större värld
  area: 'home', entry: 'start', seen: {}, shards: 0, sword: SWORD_MAX, lantern: false, oil: 0, potions: 0, flasks: 0,
  slots: [null, null, null], opened: {}, torches: {}, hint: null, caveOpen: false,
  // 0.7: öknen och pyramiden
  sunGate: false, pyramid: null, pyramidDone: false, tarek: null, whetstone: false, lore: false,
  goat: null,
  // 0.11: en levande värld
  clock: 8, day: 1, weather: null, mood: {}, asked: {}, flute: false, songs: [], songStones: {},
  // 0.12: nekropolen
  necropolis: null, necropolisDone: false,
  // 0.14: tornet, titanerna vaknar, det andra valet och sidouppdragen
  spire: null, spireDone: false, titanRaid: false, choice2: null, quests: {},
  // 0.15: havet, simningen, templet och det tredje valet
  swim: false, temple: null, templeDone: false, choice3: null, charm: false,
});

export class Story {
  constructor(ctx) {
    Object.assign(this, ctx); // scene, world, player, enemies, combat, rig, hud, dialog, sfx, fx, groundAt, lights
    this.bastion = this.world.bastion;
    this.pyramid = this.world.pyramid;
    this.necropolis = this.world.necropolis;
    this.spire = this.world.spire;
    this.temple = this.world.temple;
    this.areas = this.world.areas;
    // Porten till nekropolen är full av sand tills ormen i pyramiden har fallit
    const necroExit = this.areas.get('desert')?.exits.find((e) => e.necro);
    if (necroExit) {
      necroExit.ok = () => !!this.state.pyramidDone;
      necroExit.blocked = 'Sand has buried the doorway. Something stirs far below... but the way is not open yet.';
    }
    // Bron till öknen går inte att nå förrän den gyllene porten har öppnats
    const desertExit = this.areas.get('field').exits.find((e) => e.to === 'desert');
    if (desertExit) {
      desertExit.ok = () => !!this.state.sunGate;
      desertExit.blocked = 'The golden gate is sealed.';
    }
    const A = this.world.aetheria.npcs;
    const villageRoot = this.areas.get('village').root;
    const mk = (id, name, voice, spot, look, pose, extra = {}) => {
      const n = new Npc(villageRoot, { id, name, voice, pos: spot.pos, face: spot.face, look, pose, ...extra });
      n.area = 'village';
      return n;
    };
    this.npcs = {
      lyra: mk('lyra', 'Lyra', 'lyra', A.lyra, {
        skin: 0xd4b096, hair: 0x3b2a20, hairStyle: 'hood', hood: 0x34405a, top: 0x34405a, robe: true,
        extraColor: 0x8a7a50, item: 'scroll', scale: 0.92,
      }, 'read'),
      vane: mk('vane', 'Vane', 'vane', A.vane, {
        skin: 0xa8805f, hairStyle: 'bald', beard: 0x4a3626, top: 0x5a4a3a, apron: true,
        extraColor: 0x3a2a1c, width: 1.22, item: 'hammer', scale: 1.0,
      }, 'hammer'),
      edda: mk('edda', 'Edda', 'edda', A.edda, {
        skin: 0xc9a990, hair: 0xbab6ae, hairStyle: 'bun', shawl: 0x6a4a5a, top: 0x5a4a52, robe: true, scale: 0.82,
      }, 'sit'),
      ilo: mk('ilo', 'Ilo', 'ilo', A.ilo, { skin: 0xd2a882, hair: 0x6a4a2a, top: 0x7a6a3a, scale: 0.58 }, 'stand', {
        wander: { center: this.world.aetheria.camp, radius: 5.2 },
      }),
      bram: mk('bram', 'Bram', 'bram', A.bram, {
        skin: 0xb48a6a, helmet: true, top: 0x4a4e56, extraColor: 0x5a4632, item: 'spear', scale: 0.95,
      }, 'stand'),
      kael: mk('kael', 'Kael', 'kael', A.kaelCot, { skin: 0xc49f83, hair: 0x5a3a24, top: 0x4a5a48, scale: 0.9 }, 'sit'),
      maren: mk('maren', 'Maren', 'maren', { pos: this.world.prologue.refugee, face: 0.8 }, {
        skin: 0xd0aa8c, hair: 0x7a4a2a, hairStyle: 'long', top: 0x7a5a4a, bottom: 0x4a3a30, scale: 0.86,
      }, 'hurt'),
    };
    this.npcs.vane.onHammer = (n) => {
      const d = n.pos.distanceTo(this.player.feet);
      if (d < 26) this.sfx.play('anvil', { vol: Math.max(0.05, 1 - d / 26) });
    };
    // Lyras plats vid stenporten i norr, när vägen väl är öppen
    const ns = this.world.aetheria.northStone;
    const gy = (x, z, fb) => this.groundAt(x, (fb ?? 0) + 3, z) ?? fb ?? 0;
    this.lyraStone = V(-4.3, gy(-4.3, -100.9, ns.y), -100.9);
    this.lyraStoneFace = Math.atan2(-2.4 - -4.3, -103.5 - -100.9);

    this.titan = new Titan(villageRoot, this.world.prologue.titanHome, this.groundAt);
    this.titan.onRoar = (t) => {
      const d = t.pos.distanceTo(this.player.feet);
      this.sfx.play('roar', { vol: Math.max(0.15, 1 - d / 60) });
      if (d < 30) this.rig.shake(0.35 * (1 - d / 30));
    };
    this.titan.onImpact = (kind, pos) => {
      const d = pos.distanceTo(this.player.feet);
      this.sfx.play('stomp', { vol: Math.max(0.3, 1 - d / 40) });
      this.rig.shake(Math.max(0.15, 0.7 - d / 25));
      this.fx.burst('ash', pos.clone().setY(pos.y + 0.3), kind === 'slam' ? 26 : 14);
    };
    // Titanen ser inte genom hus, murar och klippor
    const losRay = new THREE.Ray();
    this.titan.los = (from, to) => {
      losRay.origin.copy(from);
      const d = to.clone().sub(from);
      const len = d.length();
      losRay.direction.copy(d.normalize());
      const hit = this.combat.world.rayIntersect(losRay, len);
      return !hit || hit.distance > len - 0.3;
    };
    // Vägen titanen går när den letar efter Cello: längs muren i norr, mellan torget och porten
    this.searchPath = [
      { x: -8, z: -10.6, pause: 2.8, look: 0.4 },
      { x: 8.4, z: -11.4, pause: 2.8, look: -0.4 },
    ].map((p) => ({ ...p, y: gy(p.x, p.z, 0) }));
    this.titan.onClang = (t, first) => {
      this.sfx.play('clang');
      this.fx.burst('spark', this.player.swordTip.clone(), 12, 0xffe2a0);
      this.fx.hitStop(0.05);
      this.rig.shake(0.12);
      if (first) this.hud.toast("The sword glances off the titan's hide. Without the power of the gods, it cannot be harmed.", 4200);
    };

    const spot = (v) => () => v;
    const east = this.world.east;
    this.traveling = false;
    this.interactions = [
      { label: 'Help Maren', npc: this.npcs.maren, ok: () => this.phase === 'prologue', run: () => this.talkMarenPrologue() },
      { label: 'Talk to Lyra', npc: this.npcs.lyra, ok: () => this.phase === 'free', run: () => this.talkLyra() },
      { label: 'Talk to Vane', npc: this.npcs.vane, ok: () => this.phase === 'free', run: () => this.talkVane() },
      { label: 'Talk to Edda', npc: this.npcs.edda, ok: () => this.phase === 'free', run: () => this.talkEdda() },
      { label: 'Talk to Ilo', npc: this.npcs.ilo, ok: () => this.phase === 'free', run: () => this.talkIlo() },
      { label: 'Talk to Bram', npc: this.npcs.bram, ok: () => this.phase === 'free', run: () => this.talkBram() },
      {
        label: () => (this.state.kaelLetter && !this.state.letterGiven ? 'Give Kael the letter' : 'Talk to Kael'),
        npc: this.npcs.kael, ok: () => this.phase === 'free', run: () => this.talkKael(),
      },
      { label: 'Talk to Maren', npc: this.npcs.maren, ok: () => this.phase === 'free' && this.state.choice1 === 'saved', run: () => this.talkMarenCot() },
      { label: 'Rest by the fire', area: 'village', pos: spot(this.world.aetheria.camp), radius: 2.4, ok: () => this.phase === 'free', run: () => this.askRest('aetheria') },
      {
        label: 'Examine the stone gate', area: 'village', pos: spot(V(0, ns.y, -101.6)), radius: 2.0,
        ok: () => this.phase === 'free' && !this.state.northPath && !this.cinematic,
        run: () => this.read(['Two obelisks of black stone. Their runes are dead and cold.', 'Beyond them there is nothing but storm. Perhaps Lyra knows more.']),
      },
      {
        label: 'Examine the Storm Stone', area: 'field', pos: spot(V(east.stone.x - 0.2, east.stone.y, east.stone.z + 1.6)), radius: 2.0,
        ok: () => this.phase === 'free' && !this.state.eastPath,
        run: () => this.read(this.player.hasHammer
          ? ['A black stone covered in runes, just like the ones on the gate in the north.', 'A copper plate lies at its foot. Perhaps the hammer could wake it?']
          : ['A black stone covered in dead runes.', 'A copper plate lies at its foot, green with age and cold.']),
      },
      {
        label: 'Examine the golden gate', area: 'field', pos: spot(east.gate ?? east.end), radius: 2.4,
        ok: () => this.phase === 'free' && !this.state.sunGate,
        run: () => this.read(this.player.hasHammer
          ? ['A gate of gold, sealed with the sign of the sun.', 'Far to the east, a pyramid glimmers in the storm.', 'A copper plate lies in the grass before the gate, just like the one at the Storm Stone...']
          : ['A gate of gold, sealed with the sign of the sun.', 'Far to the east, a pyramid glimmers in the storm.']),
      },
    ];
    // Grumble, Hollis stora bock (goat.js sätts av main.js)
    this.interactions.push({
      label: 'Approach the big goat', pos: () => this.goat.pos, radius: 2.3,
      ok: () => this.phase === 'free' && !!this.goat && !this.goat.owned && this.goat.area === this.areas.id,
      run: () => {
        this.sfx.play('ram');
        this.read(this.state.talked.hollis
          ? ['A huge ram with horns curled like cart wheels. He glares at Cello and stamps a hoof.', 'There is an old saddle blanket on his back. He must be the goat Tilly called Grumble. Hollis would know more.']
          : ['A huge ram with horns curled like cart wheels. He glares at Cello and stamps a hoof.', 'A rope ties him to the post. He belongs to someone.']);
      },
    });
    this.interactions.push({
      label: 'Ride Grumble', pos: () => this.goat.pos, radius: 2.1,
      ok: () => this.phase === 'free' && !!this.goat?.owned && !this.goat.ridden && this.goat.area === this.areas.id && this.goat.mode !== 'coming',
      run: () => this.goat.mount(),
    });
    this.dismountIt = { label: 'Climb down', run: () => this.goat?.dismount() };
    this.addAreaInteractions();
    this.prompt = null;
    this.cinematic = false;
    this.gateT = 0;
    this.fade = null;
    this.timers = [];
    this.musicHold = null;
    this.shown = null; // föremålet Cello håller upp
    this.state = freshState();
    this.phase = 'intro';
  }

  // Ett visst musikspår under en stund (filmscener och berättelsens stora ögonblick)
  holdMusic(id, seconds) {
    this.musicHold = id ? { id, t: seconds } : null;
  }

  // Kör fn om sec sekunder (spelets tid, pausas med spelet)
  after(sec, fn) {
    this.timers.push({ t: sec, fn });
  }

  maxHpFor(s) {
    return 6 + (s.amulet ? 2 : 0) + 2 * (s.hearts || 0);
  }

  // ---------- spelets början ----------
  newGame(silent = false) {
    this.state = freshState();
    this.cinematic = false;
    this.rig.cinematic = null;
    this.arriving = false;
    this.leaving = false;
    this.fade = null;
    this.timers = [];
    this.pendingWake = false;
    this.introRoar = false;
    this.capeSeen = false;
    this.musicHold = null;
    this.phase = 'intro';
    this.traveling = false;
    this.clearShown();
    const P = this.player;
    P.maxHp = 6;
    P.finisherBonus = 0;
    P.hasHammer = false;
    P.gloves = false;
    P.setPath(null);
    P.carry(null);
    P.autoWalk = null;
    P.setSword(SWORD_MAX);
    this.inventory?.reset();
    this.clock?.load(this.state);
    this.weather?.load(this.state);
    this.songs?.stop();
    this.songs?.load();
    // Startskärmen visar den brinnande byn; ett nytt spel börjar vid Cellos hus
    const start = silent ? this.areas.get('village') : this.areas.get('home');
    this.areas.activate(start.id);
    const sp = silent ? start.entry('south') : start.entry('start');
    P.revive(sp.pos, sp.facing);
    this.state.area = start.id;
    this.state.entry = silent ? 'south' : 'start';
    this.enemies.setActive(false);
    this.enemies.cleared.clear();
    this.bastion.applyState(null);
    this.state.bastion = this.bastion.state;
    this.pyramid.applyState(null);
    this.state.pyramid = this.pyramid.state;
    this.necropolis.applyState(null);
    this.state.necropolis = this.necropolis.state;
    this.spire.applyState(null);
    this.state.spire = this.spire.state;
    this.temple.applyState(null);
    this.state.temple = this.temple.state;
    this.chronicle?.applyState();
    this.sea?.applyState();
    this.realm?.reset();
    this.world.setSunGate(false, true);
    this.goat?.load(this.state);
    this.enemies.resetAll();
    this.titan.reset();
    this.world.villageFires.forEach((f) => { f.level = 1; });
    for (const p of [this.world.paths.north, this.world.paths.east]) p.lower();
    this.resetAreaThings();
    this.world.lightNorth(false);
    this.world.lightEast(false);
    const n = this.npcs, A = this.world.aetheria.npcs;
    n.maren.setVisible(true);
    n.maren.place(this.world.prologue.refugee, 0.8, 'hurt');
    n.kael.setVisible(false);
    n.lyra.place(A.lyra.pos, A.lyra.face, 'read');
    this.world.aetheria.grave.visible = false;
    this.hud.setHearts(P.hp, P.maxHp);
    this.hud.setItems(P);
    if (!silent) this.startIntro();
  }

  // Cello kommer hem från skogen och ser röken över byn
  startIntro() {
    this.after(0.7, () => this.hud.caption('Cello lived at the edge of the forest, a short walk south of Hollowbrook.', 4200));
    this.after(5.3, () => this.hud.caption('That morning, smoke was rising over the village.', 4000));
    this.after(10.5, () => {
      if (this.phase === 'intro' && this.areas.id === 'home') this.hud.toast('Follow the path north to the bridge.', 3600);
    });
  }

  loadGame(save) {
    this.state = { ...freshState(), ...save.state };
    const s = this.state;
    s.items = { ...freshState().items, ...(s.items || {}) };
    this.phase = 'free';
    this.timers = [];
    this.clearShown();
    this.enemies.cleared.clear();
    this.bastion.applyState(s.bastion);
    s.bastion = this.bastion.state;
    this.pyramid.applyState(s.pyramid);
    s.pyramid = this.pyramid.state;
    this.necropolis.applyState(s.necropolis);
    s.necropolis = this.necropolis.state;
    this.spire.applyState(s.spire);
    s.spire = this.spire.state;
    this.temple.applyState(s.temple);
    s.temple = this.temple.state;
    this.chronicle?.applyState();
    this.sea?.applyState();
    this.realm?.reset();
    this.setupFree();
    this.enemies.resetAll();
    this.resetAreaThings();
    const P = this.player;
    // Äldre sparningar (0.5) visste bara om Aetheria och fästningen
    let area = s.area, entry = s.entry;
    if (!save.state.area) {
      area = s.spawnAt === 'bastion' ? 'bastion' : 'village';
      entry = s.spawnAt === 'bastion' ? 'entrance' : 'aetheria';
    }
    if (!this.areas.get(area)) { area = 'village'; entry = 'aetheria'; }
    const a = this.areas.activate(area);
    const e = a.entry(entry);
    s.area = area;
    s.entry = entry;
    for (const id of Object.keys(s.seen || {})) if (this.areas.get(id)) this.areas.get(id).visited = true;
    this.goat?.load(s);
    P.revive(e.pos, e.facing);
    P.setSword(s.sword ?? SWORD_MAX);
    this.inventory?.load(s);
    this.clock?.load(s);
    this.weather?.load(s);
    this.chats?.load(s);
    this.songs?.load();
    this.hud.toast(`Welcome back to ${a.name}.`, 3000);
    this.hud.setHearts(P.hp, P.maxHp);
  }

  // Allt som gäller efter prologen, beroende på valen
  setupFree(placeNpcs = true) {
    const s = this.state, n = this.npcs, A = this.world.aetheria.npcs, P = this.player;
    this.titan.hide();
    this.world.villageFires.forEach((f) => { f.level = 0.22; });
    this.enemies.setActive(true);
    P.carry(null);
    P.maxHp = this.maxHpFor(s);
    P.hp = Math.min(P.hp, P.maxHp);
    P.setPath(s.choice1 === 'fought' ? 'vengeful' : s.choice1 === 'saved' ? 'heroic' : null);
    P.finisherBonus = s.choice1 === 'fought' ? 1 : 0;
    P.hasHammer = !!s.items?.hammer;
    P.hasPrism = !!s.items?.prism;
    P.gloves = !!s.gloves;
    this.world.setSunGate(!!s.sunGate, true);
    this.hud.setItems(P);
    n.kael.setVisible(true);
    if (s.choice1 === 'saved') {
      n.maren.setVisible(true);
      n.maren.place(A.maren.pos, A.maren.face, 'lie');
      n.kael.place(A.kaelCot.pos, A.kaelCot.face, 'sit');
      this.world.aetheria.grave.visible = false;
    } else {
      n.maren.setVisible(false);
      n.kael.place(A.kaelGrave.pos, A.kaelGrave.face, 'kneel');
      this.world.aetheria.grave.visible = true;
    }
    if (s.northPath) this.world.paths.north.raise(true);
    else this.world.paths.north.lower();
    this.world.lightNorth(s.northPath);
    if (s.eastPath) this.world.paths.east.raise(true);
    else this.world.paths.east.lower();
    this.world.lightEast(s.eastPath);
    if (placeNpcs) {
      if (s.northPath) n.lyra.place(this.lyraStone, this.lyraStoneFace, 'read');
      else n.lyra.place(A.lyra.pos, A.lyra.face, 'read');
      n.vane.place(A.vane.pos, A.vane.face, 'hammer');
      n.edda.place(A.edda.pos, A.edda.face, 'sit');
      n.bram.place(A.bram.pos, A.bram.face, 'stand');
    }
  }

  placeMarenOnCot() {
    const A = this.world.aetheria.npcs;
    this.player.carry(null);
    this.npcs.maren.setVisible(true);
    this.npcs.maren.place(A.maren.pos, A.maren.face, 'lie');
  }

  save(silent = false, entry = null) {
    // På startmenyn finns inget spel att spara (byn i bakgrunden är bara en kuliss)
    if (!this.hud.started) return false;
    const s = this.state;
    s.bastion = this.bastion.state;
    s.pyramid = this.pyramid.state;
    s.necropolis = this.necropolis.state;
    s.spire = this.spire.state;
    s.temple = this.temple.state;
    s.spawnAt = this.world.inBastion() ? 'bastion' : 'aetheria';
    s.area = this.areas.id;
    if (entry) s.entry = entry;
    if (this.world.dungeonAt(s.area)) s.entry = 'entrance';
    s.sword = this.player.sword.dur;
    this.goat?.store(s);
    this.inventory?.store(s);
    this.clock?.store(s);
    this.weather?.store(s);
    const ok = writeSave(this.slot ?? 1, { v: 2, state: s, savedAt: Date.now() });
    if (!silent) {
      this.hud.toast(ok ? 'Game saved' : 'Could not save in this browser', 2600);
      if (ok) this.sfx.play('save');
    }
    return ok;
  }

  // ---------- samtal ----------
  line(npc, text) {
    return { who: npc.name, voice: npc.voice, text };
  }

  talk(npc, steps, onEnd) {
    npc.talking = true;
    const P = this.player;
    P.facing = Math.atan2(npc.pos.x - P.feet.x, npc.pos.z - P.feet.z);
    this.dialog.start(steps, {
      focus: npc,
      onEnd: () => {
        npc.talking = false;
        onEnd?.();
      },
    });
  }

  // Text utan talare: inskriptioner, skyltar, brev
  read(lines, onEnd) {
    this.dialog.start(lines.map((text) => ({ who: '', text })), { onEnd });
  }

  talkMarenPrologue() {
    const m = this.npcs.maren, L = (t) => this.line(m, t);
    this.talk(m, [
      L('Cello... is that you? The titan came out of the storm. It took everyone.'),
      L("My leg... I can't walk."),
      L("It's still standing over there by the cliff. If you go now, maybe you can catch it."),
      L("But I won't make it here alone. Please."),
      {
        who: '', prompt: 'What does Cello do?',
        choices: [{ text: 'Carry Maren to Aetheria', id: 'save' }, { text: 'Go after the titan', id: 'fight' }],
        onChoose: (id) => (id === 'save'
          ? [L('Thank you... Aetheria lies beyond the bridge to the north. Through the gate in the wall.'), { run: () => this.startCarry() }]
          : [L("Cello... no. Don't go..."), { run: () => this.startTitanFight(false) }]),
      },
    ]);
  }

  talkLyra() {
    const s = this.state, n = this.npcs.lyra, L = (t) => this.line(n, t);
    if (!s.talked.lyra) {
      this.holdMusic('quiet', 1);
      const open = s.choice1 === 'saved'
        ? L('Maren is resting now. What you did means more than you know.')
        : L('Vane told me you faced the titan alone. I understand your anger. But anger is not enough against them.');
      this.talk(n, [
        open,
        L('I wish I could tell you what the titans are. I cannot. No one can.'),
        L('They came out of the storm, and the villages began to burn. Why they hunt us... I do not know.'),
        L('But I have spent my life reading the old stones. The runes speak of gods who once walked this land.'),
        L("And of things the gods left behind. Relics that still hold a part of their power: Thor's hammer, the swift shoes of Hermes, the lightning of Zeus."),
        L('If the gods could stand against such things, perhaps their relics still can.'),
        L("One inscription speaks of a shard of Thor's hammer in The Tempest Bastion, a burned-out fortress of iron far to the north, beyond the Stormvale."),
        L('The stone gate north of the camp once led there. I think I have finally understood how to wake it. Come.'),
      ], () => { s.talked.lyra = true; this.openNorthPath(); });
      return;
    }
    if (!s.northPath) {
      this.talk(n, [L('The stone gate in the north. Come, I will show you.')], () => this.openNorthPath());
      return;
    }
    if (!s.items.hammer) {
      const pool = [
        [L('Follow the stones north to Thistledown Ranch. From there the road runs through Galewind Pass and out onto the Stormvale.'), L('The Tempest Bastion lies at the far northern edge of the Stormvale. It is a long road, Cello.')],
        [L("Thor's hammer is said to rest in the fortress forge, among the lightning."), L('If you need a lantern or a new blade, the village of Willowmere lies east on the Stormvale. They trade there still.')],
        [L('The Ashlings in your village... I believe they are made from the ashes of those the titans have killed.'), L('The ashes of the dead, turned against the living.')],
        [L('The inscriptions speak of relics that are broken, not destroyed. That means they can be mended.')],
        [L('Where did the gods go? The stones do not say. Some of the runes have been scratched out, as if someone did not want them read.')],
      ];
      s.talked.lyraN = ((s.talked.lyraN || 0) + 1) % pool.length;
      this.talk(n, pool[s.talked.lyraN]);
      return;
    }
    if (!s.bastionDone) {
      this.talk(n, [
        L("You have it! Mjölnir's Shard... I can hear it humming."),
        L('But something still guards the fortress. I can feel it in the storm.'),
        L('The inscriptions speak of a giant with a heart of stone. Only thunder can make it stop.'),
      ]);
      return;
    }
    if (!s.eastPath) {
      this.talk(n, [
        L('Far out on the eastern edge of the Stormvale stands a Storm Stone. It bears the same runes as this gate.'),
        L('There is a copper plate at its foot. Strike it with the hammer, and perhaps it will wake.'),
      ]);
      return;
    }
    if (!s.sunGate) {
      this.talk(n, [
        L('The golden gate in the east bears the sign of the sun. Beyond it, the stones speak of a desert where a sun god was worshipped.'),
        L('The Storm Stone answered the hammer. Perhaps the gate will too.'),
      ]);
      return;
    }
    if (!s.pyramidDone) {
      this.talk(n, [s.items.prism
        ? L("A prism that drinks the sun... Ra's own light. Be careful in that pyramid, Cello. Something there hates the light.")
        : L('The desert beyond the gate... If a relic lies there, it will be in the sun god\'s pyramid. Nefret, the priestess at the oasis, may know more.')]);
      return;
    }
    const pool = [
      [L('Every heart that stops makes them stronger... I keep thinking about it.'), L('Then every person in Aetheria is a wall against them. Every one of us who lives.')],
      [L('The third titan spoke of others. Of fewer of us every day.'), L('We will not make it easy for them.')],
      s.spireDone
        ? [L('Kronos. The titan king. So the songs were true, all of them.'), L(s.choice2 === 'spared' ? 'You spared the wind itself. I think the gods would have been proud of you, Cello. I am.' : 'The storm-titan is gone. The wind over Aetheria feels... thinner. Like an empty room.')]
        : s.titanRaid
        ? [L('A titan over Willowmere... and a voice that called itself a king.'), L('Go to the Galecrown, Cello. Your friend Seren is right: if Typhon waits anywhere, it is in that tower.')]
        : s.necropolisDone
        ? [L('Anubis... the god of the dead, speaking to you. And the dead speak to you still, through his scales.'), L('Listen to them, Cello. The stones were scratched out. The dead were not.'), L('Ysolde in Willowmere sent word. She says the storm over the mere sounds wrong. Go and see her.')]
        : [L('Nefret sent word from the oasis. Since the serpent fell, the sand south of the Wastes has moved. An old doorway has opened, where the necropolis sank.'), L('Follow the road south from the Sunwell. Whatever waits down there has waited a long time.')],
    ];
    s.talked.lyraP = ((s.talked.lyraP || 0) + 1) % pool.length;
    this.talk(n, pool[s.talked.lyraP]);
  }

  talkVane() {
    const s = this.state, n = this.npcs.vane, L = (t) => this.line(n, t);
    // Ett slitet eller avbrutet svärd: Vane smider ett nytt
    if (this.folk && s.talked.vane && !(s.items.hammer && !s.talked.vaneHammer) && this.player.sword.dur < SWORD_MAX * 0.8) {
      this.folk.vaneForge(n);
      return;
    }
    if (s.items.hammer && !s.talked.vaneHammer) {
      this.talk(n, [
        L("Wait. Is that... Mjölnir's Shard?"),
        L('Let me see. Broken, yes. Half the head is missing.'),
        L('But do you hear it hum? The lightning still lives in the iron.'),
        L('Find more pieces, and embers from the monsters you fell. Then we will forge it whole again. I promise you that.'),
      ], () => { s.talked.vaneHammer = true; });
      return;
    }
    if (!s.talked.vane) {
      this.talk(n, [
        s.choice1 === 'saved' ? L('You are the one who carried the girl here. Respect, boy.') : L('You again. Learned anything since last time?'),
        L(s.choice1 === 'fought' ? 'No one brings down a titan with an ordinary sword. Surely you understand that now.' : 'No one brings down a titan with an ordinary sword.'),
        L('But the relics of the gods lie scattered and broken. Find one, and bring me what you take from the monsters you fell.'),
        L('Ashling embers burn for a long time. With them I can reforge what is broken.'),
      ], () => { s.talked.vane = true; });
      return;
    }
    this.talk(n, [s.items.hammer
      ? L("Don't you strike my anvil with that thing. It's the only one we've got.")
      : L("The hammer won't wait. Come back when you have something for me.")]);
  }

  talkEdda() {
    const s = this.state, n = this.npcs.edda;
    const saved = s.choice1 === 'saved';
    const greet = s.bastionDone
      ? (saved ? 'The storm has calmed a little since you came back. I can feel it in my joints. Thank you, boy.' : 'The thunder has gone quiet in the north. People say it was you. Maybe I was wrong about you.')
      : (saved ? "So you're the boy who carried Maren here. There is still hope in you, Cello." : 'Keep your distance... I have heard what you did. Did you really leave that girl behind to chase a titan?');
    this.chats.chat(n, {
      greet: [greet],
      topics: [
        { id: 'storm', q: 'Has the storm always been like this?', a: ['Lightning never used to strike without reason. Now it never stops. People say the storm gathers around the Tempest Bastion.', 'When I was a girl we had summers. Can you imagine? Whole days without thunder.'] },
        { id: 'camp', q: 'How does the camp get by?', a: ["Vane keeps the iron hot, Bram keeps the bridge, and I keep everyone's spirits up. Mostly by complaining.", "Warm yourself by the fire a while. It's the only thing that's still warm."] },
        { id: 'night', q: 'Do you ever sleep?', a: ['At my age? An hour here, an hour there. I watch the fire so the young ones can sleep.', 'Ilo snores like a goat. Do not tell him I said so.'] },
      ],
      rude: { q: 'Old people talk too much.', a: ['...Do they now.', 'Then this old woman will stop talking. To you, at least.'] },
      bye: saved ? 'Mind yourself, boy.' : 'Hmph. Go on, then.',
      forgive: "I slept on it, and decided you're young and foolish. That's no crime. Sit.",
    });
  }

  talkIlo() {
    const s = this.state, n = this.npcs.ilo;
    // Ilo sover vid elden på natten (0.11)
    if (n.pose === 'lie') {
      this.read(['Ilo is curled up by the fire, fast asleep.', '"...five Ashlings... with one hand..." he mumbles.']);
      return;
    }
    const saved = s.choice1 === 'saved';
    this.chats.chat(n, {
      greet: [s.items.hammer ? "Is that Thor's hammer?! For real?" : saved ? "Is it true you've fought Ashlings? I saw one from the bridge! It had glowing eyes!" : "Edda said I shouldn't talk to you. ...but did you really fight a titan? Was it big?"],
      topics: [
        { id: 'ash', q: 'What are Ashlings made of?', a: ['Lyra says they are made of ash. From people the titans have killed. Is that true?', "...I don't like that. I'm going to think about goats instead."] },
        { id: 'hammer', q: 'Want to see the hammer?', when: () => !!s.items.hammer, a: [saved ? 'Can I hold it? Just for a bit? ...Okay. Later, then!' : "Edda says I'm not allowed. But... can I look at it? Whoa. It hums!"] },
        { id: 'bridge', q: 'What do you see from the bridge?', a: ['At night you can see fires out on the Stormvale. Bram says those are Ashlings. Their eyes glow like coals.', 'In the daytime they sleep in the grass. I threw a pebble at one once. Bram yelled at me.'] },
      ],
      rude: { q: 'Go play somewhere else, kid.', mood: 'sad', a: ['...okay.', "*sniff* I wasn't even bothering you."] },
      bye: 'Bye, Cello!',
      forgive: "Edda says you're probably sorry. Are you? Okay! We're friends again.",
    });
  }

  talkBram() {
    const s = this.state, n = this.npcs.bram;
    this.chats.chat(n, {
      greet: [s.bastionDone ? 'I heard the thunder all the way here while you were gone. Then it went quiet. Good work, Cello.' : s.choice1 === 'fought' ? "I'm keeping an eye on you, Cello. People here are scared enough as it is." : 'No Ashling has made it across the bridge. Yet.'],
      topics: [
        { id: 'village', q: 'Is Hollowbrook safe?', a: ['If you go back to the village, be careful. The titan left its servants behind in the ashes.', 'They are worse at night. In daylight half of them lie in the ash like they are dead. Do not trust it.'] },
        { id: 'bridge', q: 'How do you guard the bridge alone?', a: ['One spear, one bridge, one stubborn man. The Ashlings do not like narrow places. Neither do I, but here I am.'] },
        { id: 'fear', q: 'Have you ever seen a titan up close?', a: ['Once. From the bridge, the night it came. It looked at me, and it walked on. As if I was not worth the trouble.', 'Some days I am angry about that. Most days I am grateful.'] },
      ],
      rude: { q: 'The bridge looks unguarded to me.', a: ['Unguarded? I have stood here every night since the fire.', 'Get off my bridge.'] },
      bye: "I'll hold the bridge.",
      forgive: "We're all tired, Cello. Forget it. The bridge still stands.",
    });
  }

  talkKael() {
    const s = this.state, n = this.npcs.kael, L = (t) => this.line(n, t);
    if (s.kaelLetter && !s.letterGiven) {
      s.letterGiven = true;
      s.karma += 1;
      if (s.choice1 === 'saved') {
        this.talk(n, [
          L("That's father's handwriting..."),
          L('...'),
          L('He stayed. He stayed to guard the anvil, even as the storm came.'),
          L("He wrote that his gloves should go to the one who carries Thor's hammer. That's you, Cello."),
          { run: () => this.giveGloves() },
          L('Take care of them. And of yourself.'),
        ], () => this.save(true));
      } else {
        this.talk(n, [
          L('What do you want?'),
          L("...That's father's handwriting."),
          L('You left Maren. But you carried this all the way from the fortress.'),
          L("I don't know what to make of you, Cello. But thank you."),
        ], () => { s.kaelQuest = 'letter'; this.save(true); });
      }
      return;
    }
    if (s.choice1 === 'fought') {
      if (s.kaelQuest !== 'letter') s.kaelQuest = 'closed';
      this.talk(n, s.letterGiven
        ? [L("I read father's letter every night. ...Go now.")]
        : s.talked.kael
          ? [L('...')]
          : [L('Go away.'), L('She called out for you. You walked the other way.')], () => { s.talked.kael = true; });
      return;
    }
    if (!s.amulet) {
      this.talk(n, [
        L("You're the one who saved my sister. My name is Kael."),
        L("I don't have much. But Maren wanted you to have this."),
        { run: () => this.giveAmulet() },
        L('Our father was a smith at the Tempest Bastion before everything burned. If you ever get there, look for his workshop.'),
      ], () => { s.kaelQuest = 'open'; this.save(true); });
      return;
    }
    if (s.letterGiven) {
      this.talk(n, [L('The gloves suit you. Father would have been glad.')]);
      return;
    }
    this.talk(n, [L('Maren grows stronger every day. Thank you, Cello.'), L("Don't forget my father's workshop at the Tempest Bastion.")]);
  }

  talkMarenCot() {
    const s = this.state, n = this.npcs.maren, L = (t) => this.line(n, t);
    if (s.letterGiven) {
      this.talk(n, [L('Kael showed me the letter from father.'), L("He didn't die afraid. Somehow, that helps.")]);
      return;
    }
    if (s.items.hammer) {
      this.talk(n, [L("Kael says you found a piece of Thor's hammer. Is that true?"), L("Then maybe we don't have to fear the thunder anymore.")]);
      return;
    }
    this.talk(n, s.amulet
      ? [L('You should rest too. You look tired.')]
      : [L("Cello... I'm alive. I never thought I would be."), L('Kael has something for you. Talk to him.')]);
  }

  giveAmulet() {
    const P = this.player;
    this.state.amulet = true;
    P.maxHp = this.maxHpFor(this.state);
    P.hp = P.maxHp;
    this.hud.setHearts(P.hp, P.maxHp);
    this.sfx.play('item');
    this.hud.toast("You got Maren's Amulet. One more heart!", 4000);
  }

  giveGloves() {
    const P = this.player;
    this.state.gloves = true;
    P.gloves = true;
    this.hud.setItems(P);
    this.sfx.play('fanfare');
    this.music?.duckFor(2.2, 0.12);
    this.hud.toast("You got the Smith's Gloves! Your ground strike is faster, and Cello moves quicker with heavy weight.", 5200);
  }

  askRest(entry, prompt = 'The fire crackles warmly. Rest a while?', text = 'Cello rests by the fire...') {
    this.dialog.start([this.restStep(entry, prompt, text)]);
  }

  // Valet vid en viloplats (0.11): på kvällen och natten sover Cello till morgonen,
  // på dagen kan han vila en stund eller vänta tills det blir natt
  restStep(entry, prompt, text) {
    const c = this.clock, late = !c || c.hour >= 17 || c.hour < 5;
    const choices = [{ text: late ? 'Sleep until morning' : 'Rest a while', id: 'rest' }];
    if (!late) choices.push({ text: 'Rest until nightfall', id: 'night' });
    choices.push({ text: 'Not now', id: 'no' });
    return {
      who: '', prompt, choices,
      onChoose: (id) => {
        if (id === 'rest') this.rest(entry, text, late ? 7 : null);
        else if (id === 'night') this.rest(entry, text, 20);
        return [];
      },
    };
  }

  // until: timmen Cello vaknar (null = en timme senare)
  rest(entry = null, text = 'Cello rests by the fire...', until = null) {
    this.startFade(1.6, text, () => {
      const P = this.player;
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      if (this.clock) {
        if (until === null) this.clock.addHours(1);
        else this.clock.skipTo(until);
      }
      this.folk?.schedule?.(true);
      this.save(false, entry);
    });
  }

  // ---------- resor mellan områden ----------
  // Skärmen tonar till svart, nästa område laddas och Cello går in några steg
  travel(to, entry, opts = {}) {
    if (this.fade || this.traveling) return;
    const P = this.player;
    this.traveling = true;
    this.cinematic = true;
    this.combat.unlock(true);
    P.shielding = false;
    if (opts.walk !== false) P.autoWalk = { yaw: P.facing, speed: 0.7 };
    if (opts.door) this.sfx.play('door', { vol: 0.6 });
    this.startFade(opts.dur ?? 1.4, opts.text ?? '', () => this.enterArea(to, entry, opts), () => {
      this.traveling = false;
      this.cinematic = false;
      P.autoWalk = null;
    });
  }

  enterArea(to, entry, opts = {}) {
    const P = this.player;
    const a = this.areas.activate(to);
    const e = a.entry(entry);
    P.teleport(e.pos);
    P.facing = e.facing;
    P.safe.copy(e.pos);
    P.safeFacing = e.facing;
    P.autoWalk = opts.walk === false || opts.door ? null : { yaw: e.facing, speed: 0.6 };
    this.state.area = to;
    this.state.entry = entry;
    this.fx.clearHearts();
    this.rig.snap(P);
    if (a.card && !this.state.seen[to]) this.after(1.1, () => { if (this.areas.cur === a) this.hud.card(a.name, a.sub, 3800); });
    this.state.seen[to] = true;
    if (this.phase === 'free') this.save(true);
  }

  // Var Cello börjar om efter att ha fallit i strid: där han kom in i området
  respawnPoint() {
    const a = this.areas.cur;
    if (this.world.dungeonAt(a.id)) return a.entry('entrance');
    return a.entry(this.state.entry);
  }

  // Dörrar, skyltar, kistor, facklor och viloplatser i alla områden
  addAreaInteractions() {
    const B = this.world.builder;
    const free = () => this.phase === 'free' || this.phase === 'intro';
    for (const a of Object.values(this.areas.list)) {
      for (const d of a.doors || []) {
        this.interactions.push({
          label: d.label, area: a.id, pos: () => d.pos, radius: d.radius ?? 1.7, ok: () => free() && (d.ok ? d.ok() : true),
          run: () => this.travel(d.to, d.entry, { door: true, dur: 1.1 }),
        });
      }
      for (const r of a.rests || []) {
        this.interactions.push({
          label: r.label ?? 'Rest', area: a.id, pos: () => r.pos, radius: r.radius ?? 2.2, ok: () => this.phase === 'free',
          run: () => this.askRest(r.entry, r.prompt, r.text),
        });
      }
      for (const it of a.interactions || []) this.interactions.push({ area: a.id, ...it });
    }
    for (const sg of B.signs) {
      this.interactions.push({ label: sg.label, area: sg.area, pos: () => sg.pos, radius: 1.6, ok: () => true, run: () => this.read(sg.lines) });
    }
  }

  // Saker som hör till områdena och börjar om vid ett nytt spel
  resetAreaThings() {
    this.world.onReset?.(this.state);
  }

  startFade(dur, text, onMid, onEnd) {
    this.fade = { t: 0, dur, mid: dur / 2, text, done: false, onMid, onEnd };
    this.hud.fade(true, text);
  }

  // ---------- prologen ----------
  // Cello bär Maren mot Aetheria. Titanen letar efter dem, så han måste smyga: håll husen mellan er och den.
  startCarry() {
    this.phase = 'carry';
    const m = this.npcs.maren;
    this.player.carry(m);
    this.carryStart = { pos: this.player.feet.clone(), facing: this.player.facing };
    this.titan.search(this.searchPath);
    this.titan.roar();
    this.caught = false;
    this.hud.toast('The titan is searching the village! Carry Maren north through the gate in the wall, and stay out of its sight.', 5600);
    this.after(5.8, () => {
      if (this.phase === 'carry') this.sfx.speak('maren', 7);
      if (this.phase === 'carry') this.hud.caption('"Shh... It sees as far as the red light reaches. Keep the houses between us and it."', 4200);
    });
  }

  // Titanen såg dem: den vrålar, och Cello börjar om där Maren låg
  caughtByTitan() {
    if (this.caught) return;
    this.caught = true;
    const P = this.player;
    this.cinematic = true;
    P.vel.set(0, P.vel.y, 0);
    this.rig.shake(0.5);
    this.hud.toast('The titan saw you!', 2000);
    this.after(1.4, () => {
      this.startFade(1.6, 'Cello slips back into the shadows...', () => {
        const st = this.carryStart;
        P.teleport(st.pos);
        P.facing = st.facing;
        P.invuln = 0;
        this.titan.search(this.searchPath);
        this.rig.snap(P);
      }, () => {
        this.cinematic = false;
        this.caught = false;
        this.hud.toast('Wait until the titan looks away. The red light shows where it is looking.', 4200);
      });
    });
  }

  startTitanFight(silent) {
    this.phase = 'titan';
    this.titan.fight();
    if (silent) this.hud.toast('Cello left Maren and went after the titan.', 3500);
    this.after(silent ? 3.6 : 0.01, () => {
      if (this.phase === 'titan') this.hud.toast('The titan! Lock on with Q and dodge its blows. The ring shows where it will strike.', 4500);
    });
  }

  arriveWithMaren() {
    const lyra = this.npcs.lyra, L = (t) => this.line(lyra, t);
    this.arriving = true;
    this.cinematic = true;
    lyra.walkTo(this.player.feet.clone().add(V(0.6, 0, -1.6)), 5, () => {
      this.talk(lyra, [
        L('Maren? Lay her down here, gently.'),
        { run: () => this.placeMarenOnCot() },
        L("She's breathing. She will live, thanks to you."),
        L('My name is Lyra. This is Aetheria, the last safe place there is.'),
        L('Rest by the fire when you need to. Talk to the people here, then come to me. There is something you must know about the titans.'),
      ], () => {
        this.arriving = false;
        this.cinematic = false;
        this.finishPrologue('saved');
        lyra.walkTo(this.world.aetheria.npcs.lyra.pos, 3, () => { lyra.pose = 'read'; lyra.facing = lyra.homeFacing; });
      });
    });
  }

  titanDefeatsCello() {
    this.phase = 'blackout';
    this.combat.unlock(true);
    this.startFade(3.4, 'Everything went black.', () => this.wakeInAetheria(), () => this.vaneWakeTalk());
  }

  wakeInAetheria() {
    const P = this.player, A = this.world.aetheria;
    if (this.areas.id !== 'village') this.areas.activate('village');
    this.state.area = 'village';
    this.state.entry = 'aetheria';
    this.titan.hide();
    this.finishPrologue('fought');
    P.revive(A.spawn, A.spawnFacing);
    this.hud.setHearts(P.hp, P.maxHp);
    const vane = this.npcs.vane;
    vane.place(V(A.spawn.x + 1.3, A.spawn.y, A.spawn.z - 1.1), -0.9, 'stand');
    this.rig.snap(P);
  }

  vaneWakeTalk() {
    const vane = this.npcs.vane, L = (t) => this.line(vane, t);
    this.talk(vane, [
      L('So you live. I found you by the bridge, half dead.'),
      L('Alone against a titan, with an ordinary sword. Brave. Or foolish.'),
      L("The girl in the village, Maren... She didn't make it."),
      L('This is Aetheria. Rest by the fire, and talk to Lyra before you rush off again.'),
    ], () => {
      this.state.talked.vane = true;
      this.hud.toast('The ember of vengeance burns in Cello. The last strike of every combo hits harder.', 5000);
      vane.walkTo(this.world.aetheria.npcs.vane.pos, 2.6, () => { vane.pose = 'hammer'; vane.facing = vane.homeFacing; });
    });
  }

  finishPrologue(choice) {
    const s = this.state;
    s.choice1 = choice;
    s.karma += choice === 'saved' ? 1 : -1;
    s.entry = 'aetheria'; // efter prologen börjar Cello om vid lägerelden i Aetheria
    // Cello vaknar i Aetheria nästa förmiddag
    s.clock = 9.5;
    s.day = 2;
    this.clock?.load(s);
    this.phase = 'free';
    this.setupFree(false);
    this.hud.setHearts(this.player.hp, this.player.maxHp);
    this.save(true);
  }

  // ---------- stenvägen till fästningen ----------
  openNorthPath() {
    const P = this.player, lyra = this.npcs.lyra, ns = this.world.aetheria.northStone;
    const L = (t) => this.line(lyra, t);
    this.cinematic = true;
    this.combat.unlock(true);
    this.startFade(1.8, 'Lyra leads Cello to the stone gate in the north...', () => {
      lyra.place(this.lyraStone, this.lyraStoneFace, 'stand');
      const py = this.groundAt(1.4, ns.y + 3, -98.8) ?? ns.y;
      P.teleport(V(1.4, py, -98.8));
      P.facing = Math.PI;
      P.heavy = false;
      this.rig.snap(P);
      this.rig.cinematic = { pos: V(7.5, ns.y + 3.6, -93.5), look: V(-0.6, ns.y + 2.6, -103.5), cut: true };
    }, () => {
      this.hud.caption('Lyra lays her hand on the stone and whispers the names of the runes.', 3200);
      this.holdMusic('ballad', 40);
      lyra.pose = 'read';
      this.after(1.8, () => {
        const top = V(ns.x - 2.4, ns.y + 6.6, ns.z);
        this.fx.bolt(top.clone().add(V(4, 60, -10)), top, 0.45);
        this.fx.bolt(top.clone().add(V(-6, 60, -4)), top, 0.3);
        this.lights.flash(top, 0xbfe8ff, 70, 30, 0.5);
        this.sfx.play('zap', { vol: 1.2 });
        this.sfx.play('thunder', { vol: 0.9 });
        this.rig.shake(0.45);
        this.world.lightNorth(true);
        this.fx.burst('spark', top, 26, 0xbfe8ff);
      });
      this.after(2.6, () => {
        this.world.paths.north.raise();
        this.sfx.play('crumble', { vol: 0.8 });
        this.rig.cinematic = { pos: V(4.2, ns.y + 7.5, -98.5), look: V(0, ns.y - 0.5, -128), speed: 1.1 };
      });
      this.after(6.6, () => {
        this.rig.cinematic = null;
        this.state.northPath = true;
        this.save(true);
        this.talk(lyra, [
          L('The stones remember the path of the gods.'),
          L('Follow them north. The road is long: past Thistledown Ranch, through Galewind Pass and across the Stormvale.'),
          L('The Tempest Bastion lies at its far end. The storm there is not like the storm here, so be careful.'),
          L('I will stay here by the gate and keep reading the runes.'),
        ], () => {
          this.cinematic = false;
          lyra.pose = 'read';
          this.hud.toast('A path of stones leads north, out into the wide world.', 4200);
        });
      });
    });
  }

  // ---------- föremål ----------
  itemGet(kind, onDone = null) {
    const P = this.player;
    this.combat.unlock(true);
    P.holdUp(true);
    const cam = this.rig.camera.position;
    P.facing = Math.atan2(cam.x - P.feet.x, cam.z - P.feet.z);
    const mesh = buildItem(kind);
    mesh.scale.setScalar(kind === 'heart' ? 0.9 : kind === 'hammer' ? 1.15 : kind === 'prism' ? 1.25 : 1.5);
    this.scene.add(mesh);
    this.shown = { mesh, kind, t: 0 };
    this.placeShown();
    this.cinematic = true;
    this.sfx.play(kind === 'heart' ? 'heartbig' : 'fanfare');
    this.music?.duckFor(2.2, 0.12);
    this.fx.burst('spark', mesh.position.clone(), 16, 0xfff0b0);
    this.lights.flash(mesh.position, 0xfff0c0, 18, 6, 1.4);
    this.after(1.25, () => {
      this.grantItem(kind);
      this.read(ITEM_TEXT[kind], () => {
        this.clearShown();
        P.holdUp(false);
        this.cinematic = false;
        this.save(true);
        if (kind === 'lantern') this.hud.toast('The lantern lies on a button now. Press it to light the lantern, or near a brazier to light that.', 5200);
        if (kind === 'horn') {
          const key = this.inventory?.keyFor?.('horn');
          this.hud.toast(key ? `The horn lies on ${key}. Grumble is right here: walk up to him and press E to ride.` : 'Press Tab to put the horn on a button. Grumble is right here: walk up to him and press E to ride.', 5600);
        }
        if (kind === 'hammer') this.hud.toast('The shard lies on F (ground strike) and G (heavy weight). The copper plate in the floor... try striking it!', 5200);
        onDone?.();
        if (kind === 'prism') {
          const key = this.inventory?.keyFor?.('prism');
          this.hud.toast(key ? `The prism lies on ${key}. Stand in the light, raise it, and lock on (Q) to aim.` : 'Press Tab and put the prism on a button. Then stand in the light, raise it, and lock on (Q) to aim.', 5600);
        }
      });
    });
  }

  placeShown() {
    const sh = this.shown, P = this.player;
    if (!sh) return;
    sh.mesh.position.set(P.feet.x, P.feet.y + 2.15 + Math.sin(sh.t * 3) * 0.04, P.feet.z);
    sh.mesh.rotation.y = sh.t * 1.2;
    // Ett varmt sken bakom föremålet, så att det syns mot mörka väggar
    const h = this.itemHalo();
    const cam = this.rig.camera.position;
    h.position.copy(sh.mesh.position).addScaledVector(V(sh.mesh.position.x - cam.x, 0, sh.mesh.position.z - cam.z).normalize(), 0.45);
    h.scale.setScalar(1.7 + Math.sin(sh.t * 5) * 0.08);
    h.material.opacity = Math.min(0.9, sh.t * 3);
    h.visible = true;
  }

  itemHalo() {
    if (this.halo) return this.halo;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(255,240,200,1)');
    grd.addColorStop(0.35, 'rgba(255,214,140,0.45)');
    grd.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.halo.visible = false;
    this.scene.add(this.halo);
    return this.halo;
  }

  clearShown() {
    if (this.shown) this.scene.remove(this.shown.mesh);
    if (this.halo) this.halo.visible = false;
    this.shown = null;
  }

  grantItem(kind) {
    const s = this.state, P = this.player;
    if (kind === 'hammer') {
      s.items.hammer = true;
      P.hasHammer = true;
      this.inventory?.gotHammer();
      this.hud.setItems(P);
    } else if (kind === 'prism') {
      s.items.prism = true;
      P.hasPrism = true;
      this.inventory?.gotPrism();
      this.hud.setItems(P);
    } else if (kind === 'horn') {
      this.goat?.give();
      this.inventory?.gotHorn();
    } else if (kind === 'pmap' || kind === 'pkey' || kind === 'sunkey') {
      this.pyramid.grant(kind);
    } else if (kind === 'nmap' || kind === 'nkey' || kind === 'ankhkey') {
      this.necropolis.grant(kind);
    } else if (kind === 'smap' || kind === 'skey' || kind === 'galekey') {
      this.spire.grant(kind);
    } else if (kind === 'tmap' || kind === 'tkey' || kind === 'tidekey') {
      this.temple.grant(kind);
    } else if (kind === 'trident') {
      s.items.trident = true;
      P.hasTrident = true;
      this.inventory?.autoSlot('trident', true);
      this.inventory?.refresh(true);
    } else if (kind === 'pearl' || kind === 'charm') {
      // sidouppdraget i havet sköter resten (seastory.js)
    } else if (kind === 'scales') {
      s.items.scales = true;
      this.inventory?.autoSlot('scales');
      this.inventory?.refresh(true);
    } else if (kind === 'sandals') {
      s.items.sandals = true;
      P.hasSandals = true;
      this.inventory?.autoSlot('sandals', true);
      this.inventory?.refresh(true);
    } else if (kind === 'heart') {
      s.hearts = (s.hearts || 0) + 1;
      (this.world.dungeonAt(this.areas.id) ?? this.bastion).grant('heart');
      P.maxHp = this.maxHpFor(s);
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
    } else if (kind === 'lantern') {
      this.inventory?.refresh(true);
    } else if (kind === 'flute') {
      s.flute = true;
      this.inventory?.autoSlot('flute');
      this.inventory?.refresh(true);
    } else this.bastion.grant(kind);
  }

  findLetter() {
    const s = this.state;
    this.read([
      'A letter, blackened by smoke. It is addressed to Kael and Maren.',
      '"If you are reading this, the storm has taken the fortress. I stayed to guard the anvil."',
      `"Kael, my gloves are yours now. But they were made for Thor's hammer. Give them to whoever carries it one day."`,
      '"Do not fear the thunder. It has always been on our side."',
      '"Father"',
    ], () => {
      s.kaelLetter = true;
      this.bastion.state.letter = true;
      this.bastion.letter.visible = false;
      this.sfx.play('item');
      this.hud.toast('Cello tucks the letter inside his tunic. Kael should read it.', 4200);
      this.save(true);
    });
  }

  bossDefeated() {
    this.hud.card('Hrungnir has fallen', 'The storm in the north falls silent', 4200);
    this.sfx.play('secret');
    this.save(true);
  }

  // Virveln efter bossen bär Cello hem till stenporten i Aetheria
  leaveBastion() {
    if (this.leaving) return;
    this.leaving = true;
    const P = this.player, s = this.state, lyra = this.npcs.lyra, ns = this.world.aetheria.northStone;
    this.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    this.holdMusic('dawn', 30);
    this.startFade(2.6, 'The lightning carries Cello home...', () => {
      s.bastionDone = true;
      this.enterArea('village', 'aetheria', { walk: false });
      const py = this.groundAt(1.0, ns.y + 3, -98.6) ?? ns.y;
      P.revive(V(1.0, py, -98.6), 0);
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      lyra.place(this.lyraStone, this.lyraStoneFace, 'stand');
      this.lights.flash(V(1, py + 2, -98.6), 0xbfe8ff, 60, 20, 0.8);
      this.rig.snap(P);
      this.save(true);
    }, () => {
      this.leaving = false;
      const L = (t) => this.line(lyra, t);
      this.talk(lyra, [
        L('Cello! Lightning struck the stone, and suddenly there you were.'),
        L("Hrungnir... the giant with a heart of stone. I thought he was only a story carved into rock."),
        s.choice1 === 'saved' ? L("Maren has been asking for you the whole time. Go and show her you're alive.") : L("Vane said he heard the thunder all the way here. He smiled. I've never seen that before."),
        L('The shard is only a piece of Mjölnir. But it remembers the lightning.'),
        L('Far out on the Stormvale, on its eastern edge, stands a Storm Stone with the same runes as this gate. Strike the copper plate at its foot with the hammer.'),
      ], () => {
        this.cinematic = false;
        lyra.pose = 'read';
        lyra.facing = this.lyraStoneFace;
        this.save(true);
      });
    });
  }

  // ---------- stormstenen i öster ----------
  // Kallas när hammaren slår ner; returnerar sant om slaget väckte stenen
  slam(point) {
    const s = this.state;
    if (this.phase === 'free' && s.eastPath && !s.sunGate && this.world.slamGate(point)) return this.openSunGate();
    if (this.phase !== 'free' || s.eastPath || !this.world.slamEast(point)) return false;
    s.eastPath = true;
    const st = this.world.east.stone;
    const top = V(st.x, st.y + 7.2, st.z);
    this.cinematic = true;
    this.combat.unlock(true);
    this.world.lightEast(true);
    this.holdMusic('ballad', 40);
    this.fx.bolt(top.clone().add(V(-8, 60, 6)), top, 0.45);
    this.lights.flash(top, 0xbfe8ff, 70, 30, 0.5);
    this.sfx.play('thunder', { vol: 0.9, delay: 0.1 });
    this.after(0.4, () => {
      this.rig.cinematic = { pos: V(st.x + 3.5, st.y + 6.5, st.z + 13), look: V(st.x + 24, st.y - 1, st.z + 4), glide: true, speed: 1.6 };
    });
    this.after(1.0, () => { this.world.paths.east.raise(); this.sfx.play('crumble', { vol: 0.7 }); });
    this.after(4.4, () => {
      this.rig.cinematic = null;
      this.cinematic = false;
      this.sfx.play('secret');
      this.hud.toast('The Storm Stone awakens! A path of stones rises toward the east.', 4200);
      this.state.eastPath = true;
      this.save(true);
    });
    return true;
  }

  // ---------- den gyllene porten ----------
  openSunGate() {
    const s = this.state, G = this.world.sunGate;
    s.sunGate = true;
    this.cinematic = true;
    this.combat.unlock(true);
    this.holdMusic('ballad', 30);
    const top = G.disc.clone();
    this.fx.bolt(top.clone().add(V(-6, 60, 4)), top, 0.45);
    this.lights.flash(top, 0xffe0a0, 70, 30, 0.6);
    this.sfx.play('thunder', { vol: 0.8, delay: 0.1 });
    this.sfx.play('sunchime');
    this.world.setSunGate(true);
    this.after(0.4, () => {
      this.rig.cinematic = { pos: V(G.pos.x - 9, G.pos.y + 4.5, G.pos.z + 8), look: V(G.pos.x + 6, G.pos.y + 1.5, G.pos.z), glide: true, speed: 1.2 };
      this.sfx.play('stonegrind', { vol: 1.1 });
    });
    this.after(3.8, () => {
      this.rig.cinematic = null;
      this.cinematic = false;
      this.sfx.play('secret');
      this.hud.toast('The golden gate swings open! A bridge leads east, into the Ember Wastes.', 4200);
      this.save(true);
    });
    return true;
  }

  // ---------- pyramiden ----------
  // Apophis, den tredje titanen, faller och berättar vad titanerna vill
  apophisFalls() {
    const s = this.state, L = (t) => ({ who: 'Apophis', voice: 'apophis', text: t });
    this.after(0.9, () => {
      this.combat.unlock(true);
      this.dialog.start([
        L('Little ember... You carry the sun of a dead god.'),
        L('Do you even know what you fight? No. Your priests scratched it out of the stones.'),
        L('We were here before your gods. They chained us in the deep, a thousand fathoms under the rock.'),
        L('We broke the chains. We climbed. We burned Olympus, and your gods burned with it.'),
        L('But we did not die. We only grew small... and weak. Hrungnir was my brother. You have met others.'),
        L('Do you know what makes us strong again? You do. Every heart that stops on this earth gives a little of our strength back.'),
        L('We do not hate you, little ember. We only want the world quiet. Empty. Ours alone, in peace at last.'),
        L('Kill me, and another will rise. There are fewer of you every day...'),
      ], {
        onEnd: () => {
          s.lore = true;
          this.hud.toast('The titans grow stronger with every life they take...', 4200);
          this.save(true);
        },
      });
    });
  }

  pyramidBossDefeated() {
    this.hud.card('Apophis has fallen', 'The night retreats from the Wastes', 4200);
    this.sfx.play('secret');
    this.save(true);
  }

  // Ljuset efter bossen bär Cello hem till stenporten i Aetheria
  leavePyramid() {
    if (this.leaving) return;
    this.leaving = true;
    const P = this.player, s = this.state, lyra = this.npcs.lyra, ns = this.world.aetheria.northStone;
    this.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    this.holdMusic('dawn', 30);
    this.startFade(2.6, 'The light of Ra carries Cello home...', () => {
      s.pyramidDone = true;
      this.enterArea('village', 'aetheria', { walk: false });
      const py = this.groundAt(1.0, ns.y + 3, -98.6) ?? ns.y;
      P.revive(V(1.0, py, -98.6), 0);
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      lyra.place(this.lyraStone, this.lyraStoneFace, 'stand');
      this.lights.flash(V(1, py + 2, -98.6), 0xffe0a0, 60, 20, 0.8);
      this.rig.snap(P);
      this.save(true);
    }, () => {
      this.leaving = false;
      const L = (t) => this.line(lyra, t);
      this.talk(lyra, [
        L('Cello! The stones lit up gold, and there you were. You are burned by the sun... What happened?'),
        { who: '', text: 'Cello tells Lyra what the serpent said.' },
        L('...Every heart that stops makes them stronger.'),
        L('That is why they burn the villages. Not hatred. Hunger.'),
        L('I have read these stones my whole life, and none of them said this. Someone did not want us to know.'),
        s.choice1 === 'saved' ? L('Then every life you saved was a blow against them. Maren too.') : L('Then every life matters. Even the ones we failed to save.'),
        L('Rest, Cello. When the next road opens, we will be ready.'),
      ], () => {
        this.cinematic = false;
        lyra.pose = 'read';
        lyra.facing = this.lyraStoneFace;
        this.hud.toast('More of the realm opens in the next version of the game.', 4200);
        this.save(true);
      });
    });
  }

  // ---------- 0.12: nekropolen ----------
  ammitFalls() {
    const s = this.state, L = (t) => ({ who: 'Ammit', voice: 'ammit', text: t });
    this.after(1.0, () => {
      this.combat.unlock(true);
      this.dialog.start([
        L('The hearts... you are letting them go... All my hearts...'),
        L('Little ember. Do you know how long I fed here? Every soul that came to be weighed, I kept.'),
        L('Every heart was a little more strength for my brothers and sisters, sleeping under the world.'),
        L('Apophis is gone. Hrungnir is gone. And now you open my larder and let the dead walk free...'),
        L('It does not matter. The living still die. On every road, in every burning village... and every death feeds us.'),
        L('One of us waits where the wind never stops. Another under the sea. You will not reach them in time.'),
      ], {
        onEnd: () => {
          this.hud.toast('The hearts Ammit stole drift up like sparks...', 4000);
          this.save(true);
        },
      });
    });
  }

  necropolisBossDefeated() {
    this.hud.card('Ammit has fallen', 'The dead of the necropolis are free', 4200);
    this.sfx.play('secret');
    // Anubis visar sig i de dödas värld
    this.after(4.6, () => {
      this.realm?.set(true);
      const L = (t) => ({ who: 'Anubis', voice: 'anubis', text: t });
      this.dialog.start([
        L('...So. The Devourer is gone, and the hearts are going home.'),
        L('I am Anubis. What is left of him. She broke my scales and my body, but not this.'),
        L('Keep the scales, child of ash. They are cracked, but they weigh true. With them, the dead will speak to you anywhere.'),
        L('Listen to them. They see what the living have forgotten. Even the gods who scratched the truth from the stones.'),
        L('The titans grow strong on every death. Then let every life you save be a feather on the other pan.'),
        L('Take what lies before my throne. Then walk into the light. It will carry you to the Sunwell.'),
      ], { onEnd: () => this.save(true) });
    });
    this.save(true);
  }

  // Ljuset bär Cello till oasen Sunwell, där Nefret väntar
  leaveNecropolis() {
    if (this.leaving) return;
    this.leaving = true;
    const P = this.player, s = this.state;
    this.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    this.holdMusic('dawn', 30);
    this.realm?.set(false, true);
    this.startFade(2.6, 'The light of the dead carries Cello up through the sand...', () => {
      s.necropolisDone = true;
      this.enterArea('desert', 'rest', { walk: false });
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      this.rig.snap(P);
      this.save(true);
    }, () => {
      this.leaving = false;
      const n = this.npcs.nefret;
      if (!n) { this.cinematic = false; return; }
      const L = (t) => this.line(n, t);
      this.talk(n, [
        L('Cello! The sand at the old necropolis burst open, and a pillar of green light rose into the sky!'),
        { who: '', text: 'Cello tells Nefret about Ammit, and the hearts, and Anubis.' },
        L('The Devourer... the old texts said she was only a story to frighten children.'),
        L('One of them waits where the wind never stops, she said? The Windbound Spire... the spire in the north where no bird can land.'),
        L('Rest here tonight. When the road opens, the Wastes will remember you.'),
      ], () => {
        this.cinematic = false;
        this.hud.toast('Strange storms gather over Willowmere...', 4200);
        this.save(true);
      });
    });
  }

  combatTargets() {
    return this.phase === 'titan' ? [this.titan] : [];
  }

  // ---------- varje bildruta ----------
  update(dt, inp) {
    const P = this.player;
    const here = this.areas.id;
    for (const n of Object.values(this.npcs)) if (n !== P.carried && (!n.area || n.area === here)) n.update(dt, P, this.groundAt);

    if (this.musicHold && !this.dialog.active && !this.cinematic && (this.musicHold.t -= dt) <= 0) this.musicHold = null;

    // Fördröjda händelser
    if (this.timers.length) {
      const due = [];
      for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); }
      if (due.length) {
        this.timers = this.timers.filter((tm) => tm.t > 0);
        for (const tm of due) tm.fn();
      }
    }
    if (this.shown) {
      this.shown.t += dt;
      this.placeShown();
    }

    // Tona till svart och tillbaka (vila, att bli slagen av titanen, resor)
    if (this.fade) {
      const f = this.fade;
      const before = f.t;
      f.t += dt;
      if (before < f.mid && f.t >= f.mid) f.onMid?.();
      if (f.t >= f.dur - 0.5 && !f.done) { f.done = true; this.hud.fade(false); }
      if (f.t >= f.dur) {
        this.fade = null;
        f.onEnd?.();
      }
    }

    if (this.titan.state !== 'gone') {
      const over = this.titan.update(this.dialog.active ? 0 : dt, P);
      if (over && this.phase === 'titan') {
        if (this.titan.state === 'fight') this.titan.finale();
        else this.titanDefeatsCello();
      }
    }

    // Vägen hem: ett vrål från byn, och vid porten syns att allt brinner
    if (this.phase === 'intro' && here === 'village') {
      if (!this.introRoar && P.feet.z < 57) {
        this.introRoar = true;
        this.titan.roaring = 1.4;
        this.sfx.play('roar', { vol: 0.65 });
        this.rig.shake(0.25);
        this.hud.toast('A roar echoes from the village!', 3200);
      }
      if (!this.cinematic && P.feet.z < this.world.village.gateZ) this.villageReveal();
    }

    // Prologen: går Cello mot titanen utan att hjälpa Maren blir det striden
    if (this.phase === 'prologue' && here === 'village' && !this.dialog.active && P.feet.distanceTo(this.titan.pos) < 11) {
      this.startTitanFight(true);
    }
    if (this.phase === 'carry' && !this.arriving && this.world.inAetheria(P.feet.x, P.feet.z) && P.feet.z < -52.5) {
      this.arriveWithMaren();
    }
    // Smygandet: förbi muren i norr är de i säkerhet
    if (this.phase === 'carry' && this.titan.state === 'search' && P.feet.z < -19) this.titan.leave();
    if (this.phase === 'carry' && this.titan.spotted && !this.caught && !this.fade) this.caughtByTitan();

    // Bron till Aetheria är stängd tills valet är gjort, och titanen släpper inte Cello
    this.gateT -= dt;
    if (here === 'village' && (this.phase === 'intro' || this.phase === 'prologue') && P.feet.z < -30.5 && Math.abs(P.feet.x) < 4) {
      P.nudge(0, -30.5 - P.feet.z);
      this.gateNotice("Cello can't leave the village now. Someone is calling for help among the houses.");
    }
    if (this.phase === 'titan' && here === 'village') {
      const d = Math.hypot(P.feet.x, P.feet.z);
      if (d > 29) {
        P.nudge((-P.feet.x / d) * (d - 29), (-P.feet.z / d) * (d - 29));
        this.gateNotice("The titan won't let Cello go.");
      }
    }

    // Den gyllene porten i öster: en glimt av nästa område
    if (this.phase === 'free' && here === 'field' && !this.capeSeen && this.state.eastPath && P.feet.distanceTo(this.world.east.end) < 9) {
      this.capeSeen = true;
      this.hud.card('The Golden Gate', 'The road to the Sun-Scorched Pyramid');
      if (!this.state.sunGate && this.player.hasHammer) this.after(3.6, () => this.hud.toast('A copper plate lies before the golden gate...', 3800));
    }

    // Utgångar: Cello går in i dimman vid gränsen och nästa område laddas
    if (!this.fade && !this.traveling && !this.cinematic && !this.dialog.active && P.state !== 'dead' && !this.shown) {
      const ex = this.areas.exitAt(P.feet);
      if (ex) {
        const block = this.exitBlocked(ex);
        if (block) {
          const a = this.areas.cur, b = a.bounds;
          const cx = (ex.x0 + ex.x1) / 2, cz = (ex.z0 + ex.z1) / 2;
          const mx = b ? (b.x0 + b.x1) / 2 : P.feet.x, mz = b ? (b.z0 + b.z1) / 2 : P.feet.z;
          const ox = cx - mx, oz = cz - mz;
          if (Math.abs(ox) > Math.abs(oz)) P.nudge(-Math.sign(ox) * 0.5, 0); else P.nudge(0, -Math.sign(oz) * 0.5);
          P.vel.set(0, P.vel.y, 0);
          this.gateNotice(block);
        } else this.travel(ex.to, ex.entry, ex.text ? { text: ex.text } : undefined);
      }
    }

    // Folk går inte att gå igenom
    for (const n of Object.values(this.npcs)) {
      if (!n.visible || n === P.carried || (n.area && n.area !== here)) continue;
      const dx = P.feet.x - n.pos.x, dz = P.feet.z - n.pos.z, d = Math.hypot(dx, dz), min = 0.75;
      if (d < min && d > 1e-4 && Math.abs(P.feet.y - n.pos.y) < 1.5) P.nudge((dx / d) * (min - d), (dz / d) * (min - d));
    }

    // Vem eller vad går att prata med just nu?
    this.prompt = null;
    if (!this.dialog.active && !this.fade && !this.cinematic && P.state === 'move' && (P.grounded || P.swimming) && !P.carried && !this.combat.lock && !this.songs?.active) {
      let best = null, bd = Infinity;
      const dg = this.world.dungeonAt(here);
      // I fängelsehålorna: deras egna saker, plus eldfaten och annat som hör till just det området
      const list = P.mount ? [] : dg ? dg.interactions.concat(this.interactions.filter((it) => it.area === here)) : this.interactions;
      if (P.mount) best = this.dismountIt;
      for (const it of list) {
        if (it.area && it.area !== here) continue;
        if (it.npc && it.npc.area && it.npc.area !== here) continue;
        if (!it.ok()) continue;
        if (it.npc && (!it.npc.visible || it.npc.walkTarget)) continue;
        const pos = it.npc ? it.npc.pos : it.pos();
        if (Math.abs(pos.y - P.feet.y) > 2) continue;
        const r = it.radius ?? 2.3;
        const d = Math.hypot(pos.x - P.feet.x, pos.z - P.feet.z);
        if (d < r && d < bd) { best = it; bd = d; }
      }
      this.prompt = best;
    }
    const label = this.prompt ? (typeof this.prompt.label === 'function' ? this.prompt.label() : this.prompt.label) : null;
    this.hud.setPrompt(label);
    if (this.prompt && inp.interact) {
      const it = this.prompt;
      this.prompt = null;
      this.hud.setPrompt(null);
      it.run();
      return true;
    }
    return false;
  }

  // Varför Cello inte får gå vidare just nu (eller null)
  exitBlocked(ex) {
    const ph = this.phase;
    if (ph === 'prologue' || ph === 'titan') return 'Someone is calling for help in the village. Cello can\'t leave now.';
    if (ph === 'carry') return 'Maren needs help. Aetheria lies to the north, past the gate in the wall.';
    if (ex.ok && !ex.ok()) return ex.blocked ?? 'The way is closed.';
    return null;
  }

  gateNotice(text) {
    if (this.gateT > 0) return;
    this.gateT = 3;
    this.hud.toast(text, 3000);
  }

  // Cello kommer fram till byns södra port: kameran visar den brinnande byn
  villageReveal() {
    const P = this.player, W = this.world;
    this.cinematic = true;
    this.combat.unlock(true);
    P.vel.set(0, 0, 0);
    this.rig.cinematic = { pos: W.intro.vantage.clone(), look: W.intro.look.clone(), glide: true, speed: 1.4 };
    this.holdMusic('fieldsdawn', 1);
    this.after(0.8, () => this.hud.caption('The village is burning.', 3000));
    this.after(2.2, () => this.titan.roar());
    this.after(4.4, () => {
      this.hud.caption('"Help...! Is anyone there?"', 3200);
      this.sfx.speak('maren', 9);
    });
    this.after(7.4, () => {
      this.rig.cinematic = null;
      this.cinematic = false;
      this.phase = 'prologue';
      this.rig.snap(P);
      this.hud.toast('Someone is calling for help among the burned houses.', 4200);
    });
  }

  // Ljud och musik beror på var Cello är
  ambienceState() {
    const P = this.player;
    let fire = 0;
    for (const f of this.world.fires) {
      const d = f.pos.distanceTo(P.feet);
      if (f.level > 0.2 && d < 12) fire = Math.max(fire, (1 - d / 12) * Math.min(1, f.level));
    }
    const inB = this.world.inBastion();
    const a = this.areas.cur;
    const dg = this.world.dungeonAt(a?.id);
    return {
      inside: (inB && P.feet.y < -2.5) || !!a?.indoor,
      fire,
      hub: (this.world.inAetheria(P.feet.x, P.feet.z) || a?.id === 'willowmere') && this.phase !== 'blackout',
      danger: this.phase === 'titan' || (!!dg && !!dg.trap && dg.trap !== 'R2' && dg.trap !== 'P2'),
      dungeon: !!dg || a?.id === 'cave',
      wind: a?.windy ? 1 : 0,
    };
  }
}

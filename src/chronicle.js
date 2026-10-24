// Krönikan (0.14): berättelsen växer. Allt som hör till fjärde kapitlet samlas här:
//
//   · Titanerna vaknar: när Cello kommer till Willowmere efter nekropolen faller en titan ur stormen.
//     En röst talar genom den: Kronos, titanernas kung, som vill ha gudarnas reliker. Seren kommer till hjälp,
//     titanen flyr mot nordväst, och vinden över bron i Stormreach lägger sig.
//   · Seren följer med: hon slår läger i The Galecrown och dyker upp efter tornet.
//   · Det moraliska valet: efter Typhon får Cello välja att skona honom eller förgöra honom.
//   · Sidouppdrag: Tobs drake, Fenns brev till Seren och de tysta klockorna i The Galecrown.
import * as THREE from 'three';
import { Titan } from './titan.js';
import { buildItem } from './items.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export class Chronicle {
  constructor({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music }) {
    Object.assign(this, { story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
    this.kronos = { name: 'Kronos', voice: 'kronos', pos: V3(0, 0, 0), talking: false };
    this.typhonNpc = { name: 'Typhon', voice: 'typhon', pos: V3(0, 0, 0), talking: false };
    this.raid = null;
    this.gale = world.gale;
    this.ga = areas.get('galecrown');
    this.buildRaidTitan();
    this.buildGaleProps();
    this.wireExits();
    story.chronicle = this;
    // Tornets händelser (spire.js ropar på dem genom story)
    story.typhonWakes = () => this.typhonWakes();
    story.typhonFalls = () => this.typhonFalls();
    story.spireBossDefeated = () => this.spireBossDefeated();
    story.leaveSpire = () => this.leaveSpire();
  }

  get s() { return this.story.state; }

  static fresh(s) {
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    if (!Array.isArray(s.quests.clappers)) s.quests.clappers = [];
  }

  // ---------------------------------------------------------------- vägarna
  wireExits() {
    const reach = this.areas.get('stormreach');
    const ex = reach.exits.find((e) => e.gale);
    if (ex) {
      ex.ok = () => !!this.s.titanRaid;
      ex.blocked = 'The wind screams across the bridge and throws Cello back. Something out west keeps it raging...';
    }
  }

  // ---------------------------------------------------------------- titanen över Willowmere
  buildRaidTitan() {
    const wa = this.areas.get('willowmere');
    const H = this.world.willow?.H ?? ((x, z) => 0);
    this.raidHome = V3(4000 - 18, H(4000 - 18, -14), -14);
    const t = new Titan(wa.root, this.raidHome, this.story.groundAt);
    t.hide();
    t.onRoar = (tt) => {
      const d = tt.pos.distanceTo(this.player.feet);
      this.sfx.play('roar', { vol: Math.max(0.2, 1 - d / 60) });
      if (d < 30) this.rig.shake(0.35 * (1 - d / 30));
    };
    t.onImpact = (kind, pos) => {
      const d = pos.distanceTo(this.player.feet);
      this.sfx.play('stomp', { vol: Math.max(0.3, 1 - d / 40) });
      this.rig.shake(Math.max(0.15, 0.7 - d / 25));
      this.fx.burst('ash', pos.clone().setY(pos.y + 0.3), kind === 'slam' ? 26 : 14);
    };
    t.onClang = (tt, first) => {
      this.sfx.play('clang');
      this.fx.burst('spark', this.player.swordTip.clone(), 12, 0xffe2a0);
      if (first) this.hud.toast('Even with the relics, the titan is too strong to wound alone. Hold on!', 3600);
    };
    t.los = () => true;
    this.raidTitan = t;
  }

  startRaid() {
    const s = this.s, P = this.player, story = this.story;
    if (this.raid) return;
    this.raid = { t: 0, phase: 'intro', serenCame: false };
    story.cinematic = true;
    this.combat.unlock(true);
    const t = this.raidTitan;
    // Titanen faller ur stormen
    t.reset?.();
    t.home.copy(this.raidHome);
    t.pos.copy(this.raidHome).setY(this.raidHome.y + 40);
    t.model.root.visible = true;
    t.state = 'idle';
    t.facing = Math.atan2(P.feet.x - t.pos.x, P.feet.z - t.pos.z);
    // Cello vänder sig mot himlen där den faller
    P.facing = Math.atan2(this.raidHome.x - P.feet.x, this.raidHome.z - P.feet.z);
    this.rig.snap(P);
    this.sfx.play('thunder', { vol: 1 });
    this.hud.card('The titans awaken', 'A shape falls out of the storm', 3600);
    story.holdMusic('warlord', 60);
  }

  updateRaid(dt) {
    const r = this.raid, t = this.raidTitan, P = this.player, story = this.story;
    r.t += dt;
    if (r.phase === 'intro') {
      // Faller ner, landar med ett brak
      if (t.pos.y > this.raidHome.y) {
        t.pos.y = Math.max(this.raidHome.y, t.pos.y - dt * 38);
        t.model.root.position.copy(t.pos);
        if (t.pos.y <= this.raidHome.y) {
          this.sfx.play('stomp', { vol: 1.5 });
          this.rig.shake(0.9);
          this.fx.burst('ash', t.pos.clone().setY(t.pos.y + 0.5), 60);
          t.roar();
        }
      } else if (r.t > 2.4 && !r.spoke) {
        r.spoke = true;
        const K = (txt) => ({ who: 'Kronos', voice: 'kronos', text: txt });
        story.dialog.start([
          K('...So this is the spark that has been stealing my brothers\' sleep.'),
          K('I am Kronos. I was king of all that lives, before the little gods. I am king again.'),
          K('You carry the bones of the gods, child of ash. The hammer. The light. The scales. Give them to me, and your villages may sleep.'),
          K('Refuse, and I will take them from your ashes.'),
          { who: '', text: 'The titan raises its fists. Willowmere\'s bell rings in alarm.' },
        ], { onEnd: () => {
          r.phase = 'fight';
          r.t = 0;
          story.cinematic = false;
          t.home.copy(this.raidHome);
          t.fight();
          this.hud.toast('Survive the titan! Dodge its fists (Shift) and stay on your feet!', 4200);
        } });
      }
      t.animate?.(dt, 0);
      return;
    }
    if (r.phase === 'fight') {
      const over = story.dialog.active ? false : t.update(dt, P);
      // Seren kommer springande efter en stund
      const n = this.folk.npcs.seren;
      if (!r.serenCame && r.t > 9 && n) {
        r.serenCame = true;
        const to = P.feet.clone().add(V3(2.2, 0, 2.2));
        n.walkTo(to, 6.5);
        this.hud.toast('Seren: "Cello! Keep it busy, I\'m coming!"', 3000);
      }
      if (over || r.t > 26) {
        r.phase = 'end';
        r.t = 0;
        story.cinematic = true;
        t.attack = null;
        this.combat.unlock(true);
        const S = (txt) => ({ who: 'Seren', voice: 'seren', text: txt });
        story.dialog.start([
          { who: '', text: 'Seren leaps onto the titan\'s arm and drives her blade into the crack in its shoulder. Cello\'s relics blaze all at once.' },
          { who: '', text: 'The titan reels. The storm above Willowmere opens like a mouth...' },
          { who: 'Kronos', voice: 'kronos', text: 'Run, then. Run to the wind, little spark. My brother Typhon is waiting for you there.' },
        ], { onEnd: () => this.endRaid() });
      }
      return;
    }
  }

  endRaid() {
    const s = this.s, story = this.story, t = this.raidTitan;
    this.sfx.play('thunder', { vol: 1 });
    story.startFade(2.2, 'The storm lifts the titan away, north and west...', () => {
      t.hide();
      this.raid = null;
      s.titanRaid = true;
    }, () => {
      const n = this.folk.npcs.seren;
      const S = (txt) => story.line(n, txt);
      story.talk(n, [
        S('...Are you hurt? No? Good. Neither am I. Mostly.'),
        S('That voice. Kronos. The old songs called him the titan king, the one who ate his own children so none could take his throne.'),
        S('The titan flew north-west, over Stormreach. Toward the Galecrown. The bridge there has been screaming with wind for weeks... but listen. It has gone quiet.'),
        S('There is a tower on the Galecrown that no bird can land on. If Typhon is waiting anywhere, it is there.'),
        S('I am going ahead to scout. Meet me at my camp past the Gale Bridge. Do not make me wait too long.'),
      ], () => {
        this.placeSeren();
        story.cinematic = false;
        s.hint = 'gale';
        this.hud.toast('The Gale Bridge in Stormreach is open. Seren waits in the Galecrown.', 4600);
        story.save(true);
      });
    });
  }

  // ---------------------------------------------------------------- Seren
  placeSeren() {
    const n = this.folk.npcs.seren;
    if (!n) return;
    const s = this.s;
    const ga = this.ga, wa = this.areas.get('willowmere');
    if (s.titanRaid) {
      const c = this.gale.camp;
      const pos = V3(c.x - 2.6, c.y, c.z - 1.6);
      if (n.model.root.parent !== ga.root) ga.root.add(n.model.root);
      n.area = 'galecrown';
      n.place(pos, 1.0, 'stand');
    } else {
      if (n.model.root.parent !== wa.root) wa.root.add(n.model.root);
      n.area = 'willowmere';
      n.place(n.home0 ?? n.home, n.homeFacing, 'stand');
    }
  }

  // Serens repliker i The Galecrown
  talkSeren(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (!s.talked.serenGale) {
      story.talk(n, [
        L('There you are. I was starting to think the wind had taken you.'),
        L('The tower is on the rock to the north-west. The gale-road there throws people off like dust. Make yourself heavy, or run between the gusts.'),
        L('The door opens for you, I think. It did not open for me. Typhon is up there, at the crown. I can hear him breathing.'),
        L('I will keep the fire going. Come back alive.'),
      ], () => { s.talked.serenGale = true; story.save(true); });
      return;
    }
    const topics = [
      { id: 'tower', q: 'What do you know about the tower?', a: ['They say Hermes built it to rest between the heavens and the earth. Every floor climbs on wind.', 'The old messengers had sandals that let them run along walls. If those are still up there...'] },
      { id: 'kronos', q: 'Tell me about Kronos.', a: ['He was the first king. The gods threw him down into the dark beneath the world, deeper than any of the others.', 'If he is awake, then the others are only his fingers. We have to cut off the hand.'] },
      { id: 'self', q: 'Why do you fight the titans?', a: ['My village was the first one the titans found. I was eight. I hid in a well.', 'I have been walking north ever since. ...That is enough sad talk. Go climb your tower.'] },
    ];
    if (q.letter === 'carry') topics.unshift({ id: 'letter', q: 'Fenn asked me to give you this.', a: () => this.deliverLetter(n) });
    if (s.spireDone) topics.unshift({ id: 'after', q: 'Typhon is gone.', a: () => (s.choice2 === 'spared'
      ? ['You spared him? ...Huh. The wind out here is softer already. Maybe mercy was the stronger blade.', 'He told you where Kronos sleeps? Under the sea. Of course it is under the sea. I hate swimming.']
      : ['Gone for good, then. The storm will not come back from that.', 'Kronos will feel it. He will be angry. Good. Angry kings make mistakes.']) });
    this.folk.chats.chat(n, {
      greet: [s.spireDone ? 'The tower is quiet. You did that.' : 'Still in one piece? Good.'],
      topics,
      rude: { q: 'I did not need your help in Willowmere.', a: ['...Really. You were about to be flattened.', 'Next time, I will let you.'] },
      bye: 'Keep your guard up.',
      forgive: 'Fine. You did need me, and I needed you. Truce?',
    });
  }

  deliverLetter(n) {
    const s = this.s;
    s.quests.letter = 'done';
    s.potions = (s.potions || 0) + 1;
    this.inventory.addShards?.(50);
    this.inventory.autoSlot?.('potion');
    this.inventory.refresh(true);
    this.story.after(0.6, () => { this.sfx.play('fanfare'); this.hud.toast('Quest complete: Fenn\'s Letter. Seren gives Cello a Healing Draught and 50 shards.', 4200); });
    this.story.save(true);
    return ['From Fenn? ...That idiot. He writes like a bear with a stick.', '"Come back safe. The fire is warm. F." ...Hmph.', 'Here. Take this, for the walk. And do not tell him I smiled.'];
  }

  // ---------------------------------------------------------------- sidouppdrag
  // Extra frågor till folk som hör till uppdragen (folk.js frågar efter dem)
  extraTopics(id, n) {
    const s = this.s, q = s.quests;
    if (!s.titanRaid) return [];
    if (id === 'tob') {
      if (!q.kite) return [{ id: 'kite', q: 'Why the long face, Tob?', a: () => { q.kite = 'asked'; this.questToast("Tob's Kite", 'The wind carried his kite to the Galecrown.'); this.story.save(true); return ['My kite! The big wind after the titan came took it. It flew all the way over Stormreach, to the west.', 'It is red with a yellow tail. If you see it... could you bring it back? I will give you my savings!']; } }];
      if (q.kite === 'found') return [{ id: 'kite2', q: 'I found your kite!', a: () => { q.kite = 'done'; this.inventory.addShards?.(50); this.story.after(0.6, () => { this.sfx.play('fanfare'); this.questToast("Tob's Kite", 'Complete! Tob gives Cello 50 shards.', true); }); this.story.save(true); return ['MY KITE! You found it! Mira, LOOK!', 'Here, take my savings. It is fifty shards. I counted them twice.']; } }];
    }
    if (id === 'fenn' && !q.letter) {
      return [{ id: 'letter', q: 'Do you know Seren?', a: () => { q.letter = 'carry'; this.questToast("Fenn's Letter", 'Deliver it to Seren in the Galecrown.'); this.story.save(true); return ['Seren? You saw her? Is she... I mean. Is she well?', 'If you are going west, give her this. It is nothing. A letter. Do not read it.']; } }];
    }
    return [];
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'secret' : 'menuSelect');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4200);
  }

  // Draken, klockkläpparna och klockorna i The Galecrown
  buildGaleProps() {
    const ga = this.ga, story = this.story;
    this.kite = buildItem('kite');
    if (ga.kiteSpot) {
      this.kite.position.set(ga.kiteSpot.x, ga.kiteSpot.y, ga.kiteSpot.z);
      this.kite.rotation.set(0.3, 0.8, 0.5);
      ga.root.add(this.kite);
      story.interactions.push({
        label: 'Take the kite', area: 'galecrown', pos: () => V3(ga.kiteSpot.x - 1.2, ga.kiteSpot.y - 3.2, ga.kiteSpot.z), radius: 2.4,
        ok: () => this.s.quests.kite === 'asked' && story.phase === 'free',
        run: () => {
          this.s.quests.kite = 'found';
          this.kite.visible = false;
          this.sfx.play('chest');
          story.read(["Cello untangles a red kite from the standing stone. Its yellow tail flutters in the wind.", 'Tob will be glad to have it back.']);
          story.save(true);
        },
      });
    }
    this.clappers = [];
    for (const c of ga.clapperSpots ?? []) {
      const m = buildItem('clapper');
      m.position.set(c.x, c.y + 0.5, c.z);
      ga.root.add(m);
      this.clappers.push({ ...c, m });
      story.interactions.push({
        label: 'Pick up the bronze clapper', area: 'galecrown', pos: () => V3(c.x, c.y, c.z), radius: 1.8,
        ok: () => !this.s.quests.clappers.includes(c.id) && story.phase === 'free',
        run: () => {
          const q = this.s.quests;
          q.clappers.push(c.id);
          if (!q.bells) q.bells = 'started';
          m.visible = false;
          this.sfx.play('secret');
          const n = q.clappers.length;
          story.read([`Cello found a bronze bell clapper! (${n} of 3)`, n < 3 ? 'The Silent Bells in the west of the Galecrown are missing their clappers.' : 'That is all three. The bells in the shrine can ring again.']);
          story.save(true);
        },
      });
    }
    if (ga.shrine) {
      const sh = ga.shrine;
      story.interactions.push({
        label: () => (this.s.quests.clappers.length >= 3 ? 'Hang the clappers and ring the bells' : 'Look at the silent bells'), area: 'galecrown', pos: () => V3(sh.x, sh.y, sh.z + 2), radius: 2.4,
        ok: () => this.s.quests.bells !== 'done' && story.phase === 'free',
        run: () => {
          const q = this.s.quests;
          if (q.clappers.length < 3) { story.read(['Three bronze bells hang in a frame, silent. Their clappers are gone.', `Cello has found ${q.clappers.length} of 3.`]); return; }
          q.bells = 'done';
          this.ringT = 3.5;
          this.sfx.play('chime');
          this.revealBellChest();
          story.after(1.2, () => this.questToast('The Silent Bells', 'Complete! The shrine opens.', true));
          story.save(true);
        },
      });
    }
  }

  revealBellChest() {
    for (const c of this.world.builder.chests) if (c.id === 'galeBells') c.hidden = false;
  }

  applyState() {
    const s = this.s;
    Chronicle.fresh(s);
    this.raid = null;
    this.raidTitan.hide();
    if (this.kite) this.kite.visible = !s.quests.kite || s.quests.kite === 'asked';
    for (const c of this.clappers) c.m.visible = !s.quests.clappers.includes(c.id);
    for (const c of this.world.builder.chests) if (c.id === 'galeBells') c.hidden = s.quests.bells !== 'done';
    this.placeSeren();
    this.applyBlessing();
  }

  // Skonade Typhon: vinden är snällare (sandalerna springer längre på väggar)
  applyBlessing() {
    this.player.wallRunBonus = this.s.choice2 === 'spared' ? 0.6 : 0;
  }

  // ---------------------------------------------------------------- tornet
  typhonWakes() {
    const T = (t) => ({ who: 'Typhon', voice: 'typhon', text: t });
    this.story.dialog.start([
      T('SO. The spark climbs my tower, wearing the messenger\'s feet.'),
      T('My king sent you to me like a gift. I will scatter you across the sky.'),
    ]);
  }

  typhonFalls() {
    this.hud.toast('Typhon crumbles into the clouds...', 3000);
  }

  spireBossDefeated() {
    const s = this.s, story = this.story, P = this.player;
    story.cinematic = true;
    this.combat.unlock(true);
    this.hud.card('Typhon has fallen', 'The wind of the Galecrown is still', 4200);
    story.after(4.4, () => {
      const T = (t) => ({ who: 'Typhon', voice: 'typhon', text: t });
      story.dialog.start([
        T('...Wait. Wait, little spark.'),
        T('Strike me again and the wind dies with me. Every breeze that turns a windmill. Every gust that fills a sail.'),
        T('Spare me... and I will tell you where Kronos sleeps. I owe him nothing now.'),
        {
          who: 'Typhon', prompt: 'What will Cello do?',
          choices: [{ text: 'Spare him.', id: 'spare' }, { text: 'Destroy him.', id: 'slay' }],
          onChoose: (id) => this.choose2(id),
        },
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('A great chest has appeared at the heart of the crown.', 3600);
        story.save(true);
      } });
    });
  }

  choose2(id) {
    const s = this.s, P = this.player, T = (t) => ({ who: 'Typhon', voice: 'typhon', text: t });
    if (id === 'spare') {
      s.choice2 = 'spared';
      this.applyBlessing();
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 30, 0xdff4ff);
      return [
        T('...Mercy. From a child of ash. My king will laugh.'),
        T('Hear me, then. Kronos sleeps beneath the sea, in the drowned temple where the sea god\'s trident was broken. He gathers your people\'s hearts there, like a miser gathers gold.'),
        T('Take a gift for your mercy: the wind will hold you a little longer when you run along the walls.'),
        { who: '', text: 'Typhon\'s form thins into a soft breeze, and drifts away over the Galecrown.' },
      ];
    }
    s.choice2 = 'slain';
    this.inventory.addShards?.(100);
    this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0x9fd8ff);
    this.rig.shake(0.6);
    this.sfx.play('thunder', { vol: 1 });
    return [
      { who: '', text: 'Cello drives the blade home. The storm-titan shatters into a hail of glittering storm-shards.' },
      { who: 'Kronos', voice: 'kronos', text: 'TYPHON! ...You will pay for every one of my brothers, spark.' },
      { who: '', text: 'Cello gathers 100 shards from the broken storm.' },
    ];
  }

  leaveSpire() {
    const s = this.s, story = this.story, P = this.player;
    if (this.leaving) return;
    this.leaving = true;
    story.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    story.holdMusic('dawn', 30);
    story.startFade(2.6, 'The wind lifts Cello from the crown and carries him down over the Galecrown...', () => {
      s.spireDone = true;
      s.hint = 'sea';
      story.enterArea('galecrown', 'rest', { walk: false });
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      this.rig.snap(P);
      story.save(true);
    }, () => {
      this.leaving = false;
      const n = this.folk.npcs.seren;
      if (!n) { story.cinematic = false; return; }
      const L = (t) => story.line(n, t);
      story.talk(n, [
        L('You came down on the wind! I saw the storm over the tower break apart like an egg.'),
        { who: '', text: s.choice2 === 'spared' ? 'Cello tells Seren about Typhon, and his mercy, and the drowned temple under the sea.' : 'Cello tells Seren about Typhon, and the storm-shards, and Kronos\' rage.' },
        L(s.choice2 === 'spared' ? 'Under the sea, then. Kronos sleeps where the sea god fell.' : 'Kronos will come for us now. All the more reason to find him first.'),
        L('Four relics. Hammer, light, scales and wings. The old songs speak of a fifth: a trident, broken, under the waves.'),
        L('I am coming with you this time. No arguments.'),
      ], () => {
        story.cinematic = false;
        this.hud.toast('The road to the sea opens in the next version of the game.', 4200);
        story.save(true);
      });
    });
  }

  // ---------------------------------------------------------------- varje bildruta
  update(dt) {
    const s = this.s, here = this.areas.id, story = this.story;
    if (!s || story.phase !== 'free') return;
    if (this.raid) { this.updateRaid(dt); return; }
    const P = this.player, near = Math.hypot(P.feet.x - this.raidHome.x, P.feet.z - this.raidHome.z) < 34;
    if (here === 'willowmere' && near && s.necropolisDone && !s.titanRaid && !story.cinematic && !story.fade && !story.dialog.active) {
      this.raidWait = (this.raidWait ?? 0) + dt;
      if (this.raidWait > 0.6) this.startRaid();
    } else this.raidWait = 0;
    // Klockorna gungar när de ringer
    if (this.ringT > 0 && this.ga.bells) {
      this.ringT -= dt;
      this.ga.bells.forEach((b, i) => { b.rotation.z = Math.sin(this.ringT * 9 + i) * 0.4 * Math.min(1, this.ringT); });
      if (Math.floor(this.ringT * 2) !== Math.floor((this.ringT + dt) * 2)) this.sfx.play('chime', { vol: 0.6 });
    }
    if (this.kite?.visible && here === 'galecrown') this.kite.rotation.z = 0.5 + Math.sin(performance.now() / 300) * 0.15;
  }
}

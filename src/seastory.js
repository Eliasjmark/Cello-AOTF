// Havet (0.15): femte kapitlet. Allt som hör till The Shattered Sea och The Drowned Temple samlas här:
//
//   · Seren följer med: efter tornet går hon bredvid Cello i Brinehollow och längs stränderna. Hon simmar inte.
//   · Simlektionen: Nerissa, en gammal dykerska på piren, lär Cello att simma (Space vid en kant: upp,
//     Shift: dyka). Efter lektionen ror hon ut honom till ruinerna.
//   · Sidouppdrag: tre svarta pärlor i jättemusslor på botten (Corwin ger Dykarens amulett, längre andetag),
//     och fyren som har slocknat (Gull behöver en tänd lykta).
//   · Templet: Kronos röst i djupet, Ketos, det tredje valet (befria Ketos eller ta dess pärla) och slutet:
//     treudden var spiken i Kronos kista. Han vaknar och flyr norrut.
import * as THREE from 'three';
import { buildItem } from './items.js';
import { BREATH_MAX } from './player.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class SeaStory {
  constructor({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music }) {
    Object.assign(this, { story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
    this.sea = world.sea;
    this.sa = areas.get('sea');
    this.kronos = { name: 'Kronos', voice: 'kronos', pos: V3(0, 0, 0), talking: false };
    this.follow = { said: {}, waitT: 0 };
    this.wireExits();
    this.buildProps();
    story.sea = this;
  }

  get s() { return this.story.state; }

  static fresh(s) {
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    if (!Array.isArray(s.quests.pearls)) s.quests.pearls = [];
  }

  // ---------------------------------------------------------------- vägarna
  wireExits() {
    const ga = this.areas.get('galecrown');
    const ex = ga.exits.find((e) => e.sea);
    if (ex) {
      ex.ok = () => !!this.s.spireDone;
      ex.blocked = 'Fishers from the south are still mending the bridge. "Not yet, lad! Come back when that storm over the tower has blown itself out!"';
    }
    const tx = this.sa.exits.find((e) => e.temple);
    if (tx) {
      tx.ok = () => !!this.s.swim;
      tx.blocked = 'The dark doorway is deep below...';
    }
  }

  // ---------------------------------------------------------------- saker i havet
  buildProps() {
    const story = this.story, sa = this.sa;
    // Jättemusslorna: öppnas när Cello simmar nära
    for (const c of sa.clams ?? []) {
      story.interactions.push({
        label: 'Take the black pearl', area: 'sea', pos: () => V3(c.x, c.y + 0.6, c.z), radius: 2.2,
        ok: () => !this.s.quests.pearls.includes(c.id) && c.open > 0.6,
        run: () => {
          const q = this.s.quests;
          q.pearls.push(c.id);
          c.pearl.visible = false;
          story.itemGet('pearl');
          const n = q.pearls.length;
          story.after(0.4, () => this.hud.toast(n < 3 ? `Black Pearl ${n} of 3. Corwin in Brinehollow wants these.` : 'That is all three black pearls! Bring them to Corwin in Brinehollow.', 3600));
          story.save(true);
        },
      });
    }
    // Fyren: tänd den stora lampan med lyktan
    const lh = sa.lighthouse;
    if (lh) {
      story.interactions.push({
        label: () => (this.s.quests.lighthouse === 'lit' ? 'The lighthouse burns bright' : 'Light the great lamp'), area: 'sea', pos: () => lh.pos, radius: 2.2,
        ok: () => this.s.quests.lighthouse !== 'lit' && this.s.quests.lighthouse !== 'done' && story.phase === 'free',
        run: () => this.lightBeacon(),
      });
    }
    // Båten: Nerissa ror ut till ruinerna, och tillbaka
    const pier = this.sea.pier;
    story.interactions.push({
      label: 'Row out to the drowned ruins', area: 'sea', pos: () => V3(pier.x + 2.4, pier.y, pier.z1 + 3.2), radius: 2,
      ok: () => !!this.s.swim && story.phase === 'free',
      run: () => this.rowTo('steps', 'Nerissa rows Cello and Seren out across the still, green water...'),
    });
    story.interactions.push({
      label: 'Row back to Brinehollow', area: 'sea', pos: () => V3(this.sea.steps.x + 3.4, -0.6, this.sea.steps.z), radius: 2.2,
      ok: () => story.phase === 'free',
      run: () => this.rowTo('pier', 'The boat creaks back toward Brinehollow...'),
    });
    sa.entries.pier = { pos: V3(pier.x, pier.y, pier.z1 + 1), facing: Math.PI };
    sa.updaters.push((t, dt) => this.updateProps(t, dt));
  }

  updateProps(t, dt) {
    const sa = this.sa, P = this.player;
    for (const c of sa.clams ?? []) {
      const near = Math.hypot(P.feet.x - c.x, P.feet.z - c.z) < 7 && P.feet.y < c.y + 6;
      c.open += ((near && !this.s.quests.pearls.includes(c.id) ? 1 : near ? 0.5 : 0) - c.open) * Math.min(1, dt * 2);
      c.lid.rotation.x = -c.open * 0.9;
      if (c.pearl.visible) c.pearl.position.y = 0.25 + Math.sin(t * 2) * 0.03;
    }
    const lh = sa.lighthouse;
    if (lh && lh.lit) {
      lh.beam.rotation.y = t * 0.6;
      lh.beam.material.opacity = 0.16;
      lh.light.power = 34;
      lh.lamp.material.emissive.setRGB(0.9, 0.7, 0.35);
    }
  }

  rowTo(entry, text) {
    const story = this.story;
    this.sfx.play('splash', { vol: 0.5 });
    story.travel('sea', entry, { walk: false, text, dur: 2.2 });
    story.after(1.2, () => this.placeSeren());
  }

  lightBeacon() {
    const s = this.s, story = this.story, inv = this.inventory, q = s.quests;
    if (!q.lighthouse) { story.read(['The lighthouse door is open. Inside, a great lamp of brass and glass stands cold.', 'It looks like it has not been lit in a long while. Someone must keep it.']); return; }
    if (!s.lantern) { story.read(['The wick of the great lamp is dry and black.', 'A lantern flame could light it... if Cello had a lantern.']); return; }
    if ((s.oil ?? 0) < 10 && !(s.flasks > 0)) { story.read(['Cello holds up his lantern, but there is barely a drop of oil left in it.', 'He needs at least a little oil to pass the flame.']); return; }
    if ((s.oil ?? 0) < 10) inv.pourFlask();
    s.oil = Math.max(0, (s.oil ?? 0) - 10);
    q.lighthouse = 'lit';
    const lh = this.sa.lighthouse;
    lh.lit = true;
    this.sfx.play('lantern');
    this.sfx.play('secret');
    this.fx.burst('spark', lh.pos.clone().setY(lh.pos.y + 2), 30, 0xffd890);
    story.read(['Cello holds his lantern to the great wick. It catches with a roar.', 'High above, the lamp of Gull Rock blazes out over the Shattered Sea once more.'], () => {
      this.hud.toast('The lighthouse is lit! Tell Gull.', 3200);
      story.save(true);
    });
  }

  // ---------------------------------------------------------------- Seren
  placeSeren() {
    const n = this.folk.npcs.seren;
    if (!n || !this.s.spireDone) return false;
    const sa = this.sa;
    if (n.model.root.parent !== sa.root) sa.root.add(n.model.root);
    n.area = 'sea';
    n.walkTarget = null;
    const P = this.player;
    if (this.areas.id === 'sea') {
      // Bredvid Cello, om han står på land; annars vid elden i byn
      const onLand = !P.swimming && P.waterY == null;
      const at = onLand ? V3(P.feet.x - Math.sin(P.facing) * 2 + 1.2, P.feet.y, P.feet.z - Math.cos(P.facing) * 2) : this.serenHome();
      n.place(at, P.facing, 'stand');
    } else n.place(this.serenHome(), 2.4, 'stand');
    n.home0 = n.home0 ?? n.home?.clone();
    return true;
  }

  serenHome() {
    const st = this.sea.steps;
    if (this.areas.id === 'sea' && Math.hypot(this.player.feet.x - st.x, this.player.feet.z - st.z) < 30) return V3(st.x - 2.4, -0.6, st.z + 1);
    return V3(this.sea.village.x + 2, this.world.sea.H(this.sea.village.x + 2, -189), -189);
  }

  // Seren går efter Cello på land, väntar på stranden när han simmar
  updateFollow(dt) {
    const n = this.folk.npcs.seren, P = this.player, story = this.story;
    if (!n || n.area !== 'sea' || this.areas.id !== 'sea' || story.cinematic || story.dialog.active || n.talking) return;
    const f = this.follow;
    const dx = P.feet.x - n.pos.x, dz = P.feet.z - n.pos.z, d = Math.hypot(dx, dz);
    const playerOnLand = !P.swimming && (P.waterY == null || P.waterY < P.feet.y + 0.2) && P.grounded;
    if (playerOnLand) {
      f.waitT = 0;
      if (d > 45) {
        // Kommer ikapp (bakom Cello, utom synhåll)
        n.place(V3(P.feet.x - Math.sin(P.facing) * 3, P.feet.y, P.feet.z - Math.cos(P.facing) * 3), P.facing, 'stand');
      } else if (d > 3.4) {
        const tx = P.feet.x - (dx / d) * 2.4, tz = P.feet.z - (dz / d) * 2.4;
        const ty = this.world.sea.H(tx, tz);
        if (ty > -0.9) n.walkTo(V3(tx, ty, tz), Math.min(7.5, 2.4 + d * 0.6));
      } else n.walkTarget = null;
    } else {
      n.walkTarget = null;
      f.waitT += dt;
      if (f.waitT > 1.5 && !f.said.swim && d < 18) {
        f.said.swim = true;
        this.hud.toast('Seren: "I will wait right here. On the dry part. I hate swimming."', 3800);
      }
    }
  }

  talkSeren(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (!s.talked.serenSea) {
      story.talk(n, [
        L('So this is the sea. It is... very wet. And very big.'),
        L('Typhon said Kronos sleeps under it. In a temple, under all of that.'),
        L('I am NOT swimming. Someone in this village had better know how to teach you.'),
      ], () => { s.talked.serenSea = true; story.save(true); });
      return;
    }
    const topics = [
      { id: 'water', q: 'Why do you hate swimming?', a: ['The well. When the titans came to my village, I hid in the well all night. Up to my chin in black water.', 'I can swim. I just... do not. Go on, I will keep watch.'] },
      { id: 'trident', q: 'What do you know about the trident?', a: ['The old songs say Poseidon broke his spear fighting the titans, and laid it in the deep.', 'Five relics. Hammer, light, scales, wings, and the spear of the sea. Kronos wants every one of them. Why?'] },
    ];
    if (!s.swim) topics.unshift({ id: 'swim', q: 'Where can I learn to swim?', a: ['The old woman on the pier. Nerissa. The fishers say she used to dive for pearls deeper than anyone.', 'Ask her. Nicely. She looks like she bites.'] });
    if (s.templeDone) topics.unshift({ id: 'after', q: 'Kronos is free...', a: ['I felt it. Like the whole sea took a breath, and held it.', 'He flew north. To the ice, where the frost giants sleep. We follow. Not today. Today we dry off.'] });
    this.folk.chats.chat(n, {
      greet: [s.templeDone ? 'You came back up. Good. I was about to jump in after you.' : 'The water still looks wet. Shocking.'],
      topics,
      bye: 'Do not drown.',
    });
  }

  // ---------------------------------------------------------------- folket i Brinehollow
  talkNerissa(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (!s.swim) {
      story.talk(n, [
        L(s.talked.nerissa ? 'Back again, landlubber? Ready to get wet?' : 'Hah! A boy with a sword and boots full of sand. Off to fight the sea, are you?'),
        L('Can you even swim? No? I can tell. You walk like a rock.'),
        L('Listen, then. I will teach you. It is easier than they say: the sea wants to hold you up. Let it.'),
        { who: '', text: 'Nerissa shows Cello how to kick, how to breathe, and how to lie on the water like a leaf.' },
        L('In deep water you swim on top. Press Shift to dive under, and hold Space to swim up again. Hold Shift to go deeper.'),
        L('Watch your breath! Under the water it runs out, and then the sea wins. Surface, or find bubbles rising from the rocks.'),
        L('Swim up to a ledge and you climb out. Simple.'),
        L('Now: swim out to the red buoy, touch it, and come back. Show me.'),
      ], () => {
        s.swim = true;
        s.talked.nerissa = true;
        q.lesson = 'buoy';
        this.player.canSwim = true;
        this.sfx.play('secret');
        this.hud.toast('Cello can swim! Swim to the red buoy and back to Nerissa.', 4200);
        s.hint = 'temple';
        story.save(true);
      });
      return;
    }
    if (q.lesson === 'buoy' || q.lesson === 'touched') {
      if (q.lesson === 'touched') {
        story.talk(n, [
          L('Ha! Like a seal. A clumsy seal, but a seal.'),
          L('Take these shards. My last pupil left them, and he did not need them where he went.'),
          L('...I am joking. He went home. Mostly.'),
          L('When you want to go out to the drowned ruins, come to the end of the pier. I will row you.'),
        ], () => {
          q.lesson = 'done';
          this.inventory.addShards(10);
          this.sfx.play('fanfare');
          this.hud.toast('Lesson complete! Nerissa can now row you out to the ruins.', 3600);
          story.save(true);
        });
      } else story.talk(n, [L('The red buoy, boy. Out there. Touch it and come back.')]);
      return;
    }
    const topics = [
      { id: 'temple', q: 'What is out there in the middle of the sea?', a: ['The broken spear. The temple of the sea god is under it, on the bottom. I dived there once, when I was young and stupid.', 'The door is deep. Breathe at the bubbles on the way down. And whatever lives in there now... it is not a fish.'] },
      { id: 'tide', q: 'The fishers say the tide is wrong.', a: ['The tide has not followed the moon for a month. It rises when it likes and falls when it likes.', 'Something down there is pulling at the water. Like a child pulling a blanket.'] },
      { id: 'pearls', q: 'Pearls?', a: ['Black pearls grow in the giant clams on the bottom. Three left that I know of. Corwin buys them, the old thief.', 'The clams open when you swim close. Do not put your hand in when they close.'] },
    ];
    this.folk.chats.chat(n, {
      greet: [s.templeDone ? 'You came up out of that temple alive. I will tell the whole village. Twice.' : 'The boat is ready when you are. End of the pier.'],
      topics, bye: 'Mind your breath.',
    });
  }

  talkCorwin(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.pearls.length >= 3 && !s.charm) {
      story.talk(n, [
        L('Are those... three black pearls? Three! Where did you... no. Do not tell me. A merchant should never know too much.'),
        L('I could give you shards. But you look like someone who spends a lot of time under water. So I will give you something better.'),
        { run: () => story.itemGet('charm') },
        L('The Diver\'s Charm. Nerissa wore it for forty years. She sold it to me when her lungs got old. Do not tell her I gave it away.'),
      ], () => {
        s.charm = true;
        q.pearlsGiven = true;
        this.applyBreath();
        story.after(0.6, () => { this.sfx.play('secret'); this.hud.toast('Quest complete: The Black Pearls. Cello can hold his breath far longer now.', 4200); });
        story.save(true);
      });
      return;
    }
    const topics = [
      { id: 'pearls', q: 'Do you buy pearls?', a: q.pearls.length ? [`${q.pearls.length} black pearl${q.pearls.length > 1 ? 's' : ''}? Good, good. Bring me all three and I will make it worth your while.`] : ['Black pearls! From the giant clams on the bottom of the sea. There are three left, they say. Nobody dives deep enough anymore.', 'Bring me all three and I will make it worth your while. I am fair. Mostly fair.'] },
      { id: 'sea', q: 'How is business?', a: ['Terrible. The tide comes and goes as it pleases, the boats come back empty, and something big ate Old Pim\'s nets.', 'But the pearls! The pearls are still there. For a brave buyer.'] },
    ];
    if (!q.pearls.length && !q.pearlsAsked) { q.pearlsAsked = true; story.after(0.2, () => this.questToast('The Black Pearls', 'Find three black pearls in the giant clams on the seabed.')); }
    this.folk.chats.chat(n, { greet: [s.charm ? 'My favourite customer! The one who gives things away.' : 'Pearls, shells, lucky charms! Corwin has everything that the sea gives up.'], topics, bye: 'Come back rich!' });
  }

  talkGull(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.lighthouse === 'lit') {
      story.talk(n, [
        L('You lit it! I saw it from down here. The whole sea lit up gold.'),
        L('The boats will find their way home tonight. Here. A full flask of my best lamp oil. You will need it more than me.'),
      ], () => {
        q.lighthouse = 'done';
        this.inventory.giveFlask?.();
        this.inventory.addShards(15);
        this.sfx.play('fanfare');
        this.hud.toast('Quest complete: The Dark Lighthouse. Gull gives Cello an Oil Flask and 15 shards.', 4200);
        story.save(true);
      });
      return;
    }
    if (!q.lighthouse) {
      story.talk(n, [
        L('The lamp. The lamp went out three nights ago, and I cannot light it again.'),
        L('My fire-striker went into the sea, and my hands shake too much for flint. Two boats did not come home.'),
        L('If you have a flame... a lantern, anything... light the great lamp for me. The door is open.'),
      ], () => { q.lighthouse = 'asked'; this.questToast('The Dark Lighthouse', 'Light the great lamp on Gull Rock with your lantern.'); story.save(true); });
      return;
    }
    this.folk.chats.chat(n, {
      greet: ['Please. The lamp. Your lantern can light it.'],
      topics: [{ id: 'oil', q: 'What if my lantern is empty?', a: ['Then buy oil! Pell in Willowmere sells flasks. And Mags at the crossroads.'] }],
      bye: 'Hurry, before dark.',
    });
  }

  talkMarlo(n) {
    const s = this.s, story = this.story;
    this.folk.chats.chat(n, {
      greet: [s.templeDone ? 'The sea went calm all at once. Then it went cold. I do not like either one.' : 'Careful on the pier, friend. The boards are older than me.'],
      topics: [
        { id: 'monster', q: 'Something ate the nets?', a: ['Something long. Longer than three boats. It came up beside me in the fog, looked at me with an eye the size of a cartwheel, and went back down.', 'Purple light on its head, like a lamp. I have not slept since.'] },
        { id: 'tip', q: 'Any advice for diving?', a: ['Do not stop to admire the coral. The urchins are black and spiky and they hurt.', 'If you carry something heavy, you sink like an anchor. Good for walking on the bottom, bad for breathing.'] },
      ],
      bye: 'Fair winds.',
    });
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'secret' : 'menuSelect');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4200);
  }

  // ---------------------------------------------------------------- templet
  firstTemple() {
    const s = this.s;
    if (s.talked.templeVoice) return;
    s.talked.templeVoice = true;
    this.story.after(2.2, () => {
      const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
      this.story.dialog.start([
        K('...Closer, little spark. The deep is warm, and I have waited so long.'),
        K('Bring me what the sea god left. Bring me the spear.'),
      ]);
    });
  }

  ketosWakes() {
    const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
    this.story.dialog.start([
      K('Do you see it, spark? The sea god\'s own beast, the faithful Ketos. It carried Poseidon across the waves.'),
      K('Now it carries my curse. Come. Kill the old god\'s pet for me.'),
    ]);
  }

  ketosFalls() {
    this.hud.toast('Ketos sinks to the floor of the throne...', 3000);
  }

  templeBossDefeated() {
    const story = this.story;
    story.cinematic = true;
    this.combat.unlock(true);
    this.hud.card('Ketos has fallen', 'The tide of the Shattered Sea is still', 4200);
    story.after(4.4, () => {
      story.dialog.start([
        { who: '', text: 'Ketos lies still on the floor of the throne. The purple curse on its head flickers, weaker now.' },
        { who: '', text: 'Its great eye opens, and looks at Cello. There is no hate in it. Only something old, and very tired.' },
        { who: '', text: 'The trident in Cello\'s hand hums. The curse could be drawn out of the beast and into the spear... or the black pearl at its heart could be taken, and the beast would sleep forever.' },
        {
          who: '', prompt: 'What will Cello do?',
          choices: [{ text: 'Draw out the curse and free Ketos.', id: 'free' }, { text: 'Take the black pearl from its heart.', id: 'pearl' }],
          onChoose: (id) => this.choose3(id),
        },
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('A great chest has appeared on the throne.', 3600);
        story.save(true);
      } });
    });
  }

  choose3(id) {
    const s = this.s, P = this.player;
    if (id === 'free') {
      s.choice3 = 'freed';
      s.karma = (s.karma || 0) + 1;
      this.applyBreath();
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0x9ff4e8);
      this.sfx.play('secret');
      return [
        { who: '', text: 'Cello touches the trident to the curse. Purple light crawls up the shaft and sinks into the cracks of the spear.' },
        { who: '', text: 'Ketos shudders. Its scales turn from black to the green of deep water. It rises, slowly, and bows its great head.' },
        { who: '', text: 'Then it is gone, swimming out through the broken roof of the throne, into the open sea.' },
        { who: '', text: 'Cello feels the sea around him soften, like an old friend. (He can stay under water much longer.)' },
      ];
    }
    s.choice3 = 'pearl';
    s.karma = (s.karma || 0) - 1;
    P.dashPower = 1.35;
    this.inventory.addShards?.(30);
    this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0xb06aff);
    this.rig.shake(0.5);
    return [
      { who: '', text: 'Cello drives the trident into the beast\'s chest, and draws out a pearl as black as a starless night.' },
      { who: '', text: 'Ketos sighs, once, and is still. The pearl is cold in his hand. The trident drinks its darkness and grows heavier, stronger.' },
      { who: 'Kronos', voice: 'kronos', text: 'Yes... yes. You learn quickly, spark. Perhaps you are more like me than you know.' },
      { who: '', text: 'The trident strikes harder now. Among the old bones of the beast\'s hoard, Cello finds 30 shards.' },
    ];
  }

  leaveTemple() {
    const s = this.s, story = this.story, P = this.player;
    if (this.leaving) return;
    this.leaving = true;
    story.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    story.holdMusic('dawn', 40);
    story.startFade(2.6, 'A strong current lifts Cello out of the throne, up through the drowned halls, toward the light...', () => {
      s.templeDone = true;
      s.hint = 'frost';
      story.enterArea('sea', 'steps', { walk: false });
      P.hp = P.maxHp;
      this.hud.setHearts(P.hp, P.maxHp);
      this.placeSeren();
      this.rig.snap(P);
      story.save(true);
    }, () => {
      this.leaving = false;
      const n = this.folk.npcs.seren;
      const L = (t) => (n ? story.line(n, t) : { who: 'Seren', voice: 'seren', text: t });
      const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
      const steps = [
        { who: '', text: 'Cello bursts up into the air beside the broken steps. Seren is in the water, soaked to the bone, holding on to the stone.' },
        L('You were down there so long. I... swam. A little. Do not tell anyone. Ever.'),
        { run: () => { this.sfx.play('thunder', { vol: 1 }); this.rig.shake(1.0); } },
        { who: '', text: 'Then the sea shudders. Far below, something cracks, like a mountain splitting in two.' },
        K('AH. Free. FREE. After an age in the dark.'),
        K('You pulled the nail from my coffin, little spark. The sea god\'s spear was the lock, and you carried it out for me.'),
        K('Keep it. Keep all of your little relics. I will come for them when I am whole. In the north, where the giants sleep in the ice, I will be whole again.'),
        { run: () => { this.sfx.play('roar', { vol: 1 }); this.rig.shake(0.8); } },
        { who: '', text: 'A shape of shadow and seawater tears up out of the deep, huge beyond sight, and streaks away north into the clouds.' },
        L('...That was him. That was Kronos. And we let him out.'),
        L('Then we put him back. North. To the ice. ...After I dry off.'),
      ];
      story.dialog.start(steps, { onEnd: () => {
        story.cinematic = false;
        this.hud.card('Kronos is free', 'He flies north, toward the land of the frost giants', 4600);
        story.after(5, () => this.hud.toast('The road north opens in the next version of the game.', 4600));
        story.save(true);
      } });
    });
  }

  // ---------------------------------------------------------------- tillstånd
  applyBreath() {
    const s = this.s, P = this.player;
    P.breathMax = BREATH_MAX + (s.charm ? 10 : 0) + (s.choice3 === 'freed' ? 8 : 0);
    P.breath = Math.min(P.breath, P.breathMax);
  }

  applyState() {
    const s = this.s, P = this.player;
    SeaStory.fresh(s);
    P.canSwim = !!s.swim;
    P.hasTrident = !!s.items?.trident;
    P.dashPower = s.choice3 === 'pearl' ? 1.35 : 1;
    this.applyBreath();
    P.breath = P.breathMax;
    for (const c of this.sa.clams ?? []) { c.pearl.visible = !s.quests.pearls.includes(c.id); c.open = 0; }
    const lh = this.sa.lighthouse;
    if (lh) {
      lh.lit = s.quests.lighthouse === 'lit' || s.quests.lighthouse === 'done';
      if (!lh.lit) { lh.beam.material.opacity = 0; lh.light.power = 0; lh.lamp.material.emissive.setRGB(0, 0, 0); }
    }
    this.follow = { said: {}, waitT: 0 };
    this.placeSeren();
  }

  // ---------------------------------------------------------------- varje bildruta
  update(dt) {
    const s = this.s, story = this.story;
    if (!s || story.phase !== 'free') return;
    const here = this.areas.id;
    if (here === 'sea') {
      this.updateFollow(dt);
      // Simlektionen: bojen
      const q = s.quests;
      if (q.lesson === 'buoy' && this.sa.buoy && this.player.feet.distanceTo(this.sa.buoy.pos) < 2.4) {
        q.lesson = 'touched';
        this.sfx.play('secret');
        this.hud.toast('Cello touches the buoy! Now swim back to Nerissa on the pier.', 3200);
      }
      if (!s.talked.seaArrive && !story.cinematic && !story.fade) {
        s.talked.seaArrive = true;
        if (s.hint === 'sea') s.hint = 'swim';
        story.after(2.2, () => {
          const n = this.folk.npcs.seren;
          if (n && n.area === 'sea') this.hud.toast('Seren: "That is a lot of water. Find someone who can teach you to swim. I am not doing it."', 4600);
        });
      }
    }
    if (here === 'tgate' && !s.talked.templeVoice && !story.cinematic && !story.fade) this.firstTemple();
  }
}

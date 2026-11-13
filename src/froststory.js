// Norr (0.16): sjätte kapitlet. Allt som hör till The Frostmarch och Frostgiant's Maw samlas här:
//
//   · Seren följer med till Rimeholt. Hon älskar isen: på den frusna sjön åker hon skridsko med kängorna.
//   · Rimeholt: den gamla Sigrun (jättarna och Loke), renskötaren Ylva (tre renar har sprungit bort, ett
//     sidouppdrag som ger en pälskappa), och Hakon (hans vän Bjarke frös fast på sjön; tina isen med lyktan).
//   · Lokis röse: en kista bakom rimfrost på en klippa (masken behövs).
//   · Gapet: Lokis röst i labyrinten, Kronos talar genom Thrym, det fjärde valet (lita på Loke eller vägra)
//     och slutet: Kronos tar form ur jättens kropp och flyr österut, mot titanernas berg.
import * as THREE from 'three';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class FrostStory {
  constructor({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music }) {
    Object.assign(this, { story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
    this.fr = world.frost;
    this.fa = areas.get('frost');
    this.follow = { said: {}, waitT: 0 };
    this.lastArea = null;
    this.wireExits();
    this.buildProps();
    story.frost = this;
  }

  get s() { return this.story.state; }

  static fresh(s) {
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    if (!Array.isArray(s.quests.deer)) s.quests.deer = [];
  }

  // ---------------------------------------------------------------- vägarna
  wireExits() {
    const ga = this.areas.get('galecrown');
    const ex = ga.exits.find((e) => e.frost);
    if (ex) {
      ex.ok = () => !!this.s.templeDone;
      ex.blocked = 'The north bridge is buried under a wall of snow. Nobody has crossed it in months.';
    }
  }

  // ---------------------------------------------------------------- saker i snön
  buildProps() {
    const story = this.story, fa = this.fa;
    // De vilsna renarna: Cello lockar hem dem
    for (const r of fa.reindeer ?? []) {
      if (!r.lost) continue;
      story.interactions.push({
        label: 'Coax the reindeer home', area: 'frost', pos: () => r.pos, radius: 2.6,
        ok: () => story.phase === 'free' && !r.run && !this.s.quests.deer.includes(r.id) && !!this.s.quests.herd,
        run: () => this.coaxDeer(r),
      });
    }
    // Den infrusne fiskaren på sjön
    const f = fa.fisher;
    if (f) {
      story.interactions.push({
        label: () => (this.inventory.lit ? 'Thaw the ice with the lantern' : 'Look at the block of ice'), area: 'frost', pos: () => f.pos, radius: 2.4,
        ok: () => story.phase === 'free' && !f.freed,
        run: () => this.thawFisher(),
      });
    }
    fa.updaters.push((t, dt) => this.updateProps(t, dt));
  }

  updateProps(t, dt) {
    const f = this.fa.fisher;
    if (f?.melt != null) {
      f.melt = Math.min(1, f.melt + dt / 2.2);
      f.block.scale.set(1 - f.melt * 0.7, 1 - f.melt * 0.9, 1 - f.melt * 0.7);
      f.block.position.y = f.y + 1.15 * (1 - f.melt * 0.9);
      f.block.material.opacity = 0.85 * (1 - f.melt);
      if (Math.random() < dt * 20) this.fx.burst('spark', f.pos.clone().setY(f.y + 1 + Math.random()), 2, 0xffd890);
      if (f.melt >= 1) { f.block.visible = false; f.melt = null; }
    }
  }

  coaxDeer(r) {
    const s = this.s, q = s.quests;
    q.deer.push(r.id);
    const from = r.pos.clone();
    r.run = { from, t: 0, dur: Math.max(3, from.distanceTo(r.home) / 9) };
    this.sfx.play('hoof', { vol: 0.8 });
    this.sfx.play('chime', { vol: 0.6 });
    const n = q.deer.length;
    this.hud.toast(n < 3 ? `Cello whistles like Ylva showed him. The reindeer lifts its head, and trots off home! (${n} of 3)` : 'That is the last one! All three reindeer are running home. Tell Ylva.', 3800);
    this.story.save(true);
  }

  thawFisher() {
    const s = this.s, story = this.story, inv = this.inventory, f = this.fa.fisher;
    if (!s.lantern) { story.read(['A block of ice, as tall as a man. There is a man inside it: an old fisher, his rod still in his hand.', 'His eyes move. He is alive in there! A flame might thaw him... if Cello had one.']); return; }
    if (!inv.lit) { story.read(['A man is frozen inside the ice, an old fisher with his rod still in his hand.', 'His eyes move. A flame could thaw him. Light the lantern first.']); return; }
    if ((s.oil ?? 0) < 10 && !(s.flasks > 0)) { story.read(['Cello holds up his lantern, but the flame is too small. There is barely any oil left.']); return; }
    if ((s.oil ?? 0) < 10) inv.pourFlask();
    s.oil = Math.max(0, (s.oil ?? 0) - 10);
    s.quests.fisher = 'thawed';
    f.freed = true;
    f.melt = 0;
    if (f.box) f.box.enabled = false;
    this.sfx.play('lantern');
    this.sfx.play('icecrack');
    const B = (t) => ({ who: 'Bjarke', voice: 'bjarke', text: t });
    story.cinematic = true;
    story.after(2.4, () => {
      f.ghost.visible = false;
      story.dialog.start([
        { who: '', text: 'The ice runs away in streams of water. An old man tumbles out onto the lake, coughing and shaking.' },
        B('Hhh... HAH! Warm! Warm hands! Who are you, boy? No, do not tell me. You are a hero. Only heroes walk around with lanterns.'),
        B('A wolf came out of the snow, all made of ice. It breathed on me, and then... then you. How long was I in there?'),
        B('Never mind. I am going home to Hakon. He owes me a fish.'),
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('Bjarke runs off toward Rimeholt. Tell Hakon!', 3400);
        story.save(true);
      } });
    });
  }

  // ---------------------------------------------------------------- Seren
  serenHome() {
    const v = this.fr.village, H = this.fr.H;
    return V3(v.x + 3, H(v.x + 3, v.z + 3), v.z + 3);
  }

  placeSeren() {
    const n = this.folk.npcs.seren;
    if (!n || !this.s.templeDone) return false;
    const fa = this.fa;
    if (n.model.root.parent !== fa.root) fa.root.add(n.model.root);
    n.area = 'frost';
    n.walkTarget = null;
    const P = this.player;
    if (this.areas.id === 'frost') {
      const at = V3(P.feet.x - Math.sin(P.facing) * 2 + 1.2, 0, P.feet.z - Math.cos(P.facing) * 2);
      at.y = this.fr.H(at.x, at.z);
      n.place(Math.abs(at.y - P.feet.y) < 1.5 ? at : this.serenHome(), P.facing, 'stand');
    } else n.place(this.serenHome(), 2.4, 'stand');
    return true;
  }

  onIce(p) {
    const L = this.fr.lake;
    return Math.hypot(p.x - L.x, p.z - L.z) < L.r;
  }

  updateFollow(dt) {
    const n = this.folk.npcs.seren, P = this.player, story = this.story;
    if (!n || n.area !== 'frost' || this.areas.id !== 'frost' || story.cinematic || story.dialog.active || n.talking) return;
    const f = this.follow;
    const dx = P.feet.x - n.pos.x, dz = P.feet.z - n.pos.z, d = Math.hypot(dx, dz);
    if (!P.grounded && !P.swimming) return;
    if (d > 45) {
      const at = V3(P.feet.x - Math.sin(P.facing) * 3, 0, P.feet.z - Math.cos(P.facing) * 3);
      at.y = this.fr.H(at.x, at.z);
      if (Math.abs(at.y - P.feet.y) < 2) n.place(at, P.facing, 'stand');
    } else if (d > 3.4) {
      const tx = P.feet.x - (dx / d) * 2.4, tz = P.feet.z - (dz / d) * 2.4;
      // På isen åker Seren skridsko: fortare, och med ett glädjetjut första gången
      const ice = this.onIce(n.pos);
      n.walkTo(V3(tx, this.fr.H(tx, tz), tz), Math.min(ice ? 10 : 7.5, (ice ? 4 : 2.4) + d * 0.6));
      if (ice && !f.said.ice) {
        f.said.ice = true;
        this.hud.toast('Seren: "Ice! Real ice! Watch this, Cello!" She slides past him on her boots, arms out wide, laughing.', 4400);
      }
    } else n.walkTarget = null;
  }

  talkSeren(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (!s.talked.serenFrost) {
      story.talk(n, [
        L('Snow! Cello, look at it! I have not seen real snow since I was small.'),
        L('My village was in the mountains. Every winter, the lake froze, and we slid on it all day. My father said I was born with ice under my feet.'),
        L('...Sorry. I am supposed to be serious. Kronos. Frost giants. Very serious.'),
        L('But if there is a frozen lake around here, I am going on it.'),
      ], () => { s.talked.serenFrost = true; story.save(true); });
      return;
    }
    const topics = [
      { id: 'cold', q: 'Aren\'t you cold?', a: ['Cold? This is nothing. Keep your lantern lit when the wind comes, though. You southern boys freeze like puddles.', 'And when the snow starts to scream, find a fire. Fast.'] },
      { id: 'giant', q: 'What do you know about frost giants?', a: ['Stories. They were here before the gods, as old as the titans. Kronos\'s cousins, almost.', 'The old woman by the fire knows more. Sigrun. She looks at the mountain like it owes her money.'] },
    ];
    if (s.mawDone) topics.unshift({ id: 'kronos', q: 'Kronos has a body now...', a: ['I saw it. Ice and sea and storm, all wound together into a shape. Like a king made out of weather.', 'East, Cello. He went east, to the mountain of the titans. And we go after him. ...After I slide on that lake one more time.'] });
    this.folk.chats.chat(n, {
      greet: [s.mawDone ? 'The snow feels different now. Quieter. Like it is waiting.' : 'Have you found the frozen lake yet? I am asking for a friend. The friend is me.'],
      topics,
      bye: 'Do not freeze.',
    });
  }

  // ---------------------------------------------------------------- folket i Rimeholt
  talkSigrun(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (!s.talked.sigrun) {
      story.talk(n, [
        L('A southern boy. With a sword, and a light, and the smell of the sea on him. Sit. The fire does not bite.'),
        L('You are here for the giant\'s mouth. Everyone with a sword is here for the giant\'s mouth.'),
        L('Long ago, Thrym, the king of the frost giants, stole the hammer of the thunder god. He died for it. His body froze into the mountain, his mouth wide open.'),
        L('Now the mouth breathes again. At night we hear him growl. Something old has climbed into the dead king, like a hand into a glove.'),
        L('And someone else is inside, too. A laughing voice. The herders call him the Grinning One. Loki, the old songs say. The trickster.'),
        L('Whatever he offers you in there, boy... count your fingers after you shake his hand.'),
      ], () => { s.talked.sigrun = true; if (!s.mawDone) s.hint = 'maw'; story.save(true); });
      return;
    }
    const topics = [
      { id: 'loki', q: 'Who is Loki?', a: ['A god, and not a god. Born of giants, raised by gods, loyal to neither. He wore a thousand faces, and he left a mask behind for each one.', 'He helps. Oh, he helps. And then one day you find out what the help cost.'] },
      { id: 'maw', q: 'How do I get into the giant\'s mouth?', a: ['North, past the pines, where the glacier bends. You cannot miss it. It is the size of a hill, and it has teeth.', 'Inside, the ice is smooth as glass. Once you start to slide, you do not stop. Remember that.'] },
      { id: 'cold', q: 'How do you live with this cold?', a: ['Fire. Fur. Stubbornness. The storms are the worst. When the snow screams, stay close to a flame, or the cold climbs into your bones.', 'Lantern oil is worth more than gold up here.'] },
    ];
    if (s.mawDone) topics.unshift({ id: 'after', q: 'Thrym is at rest.', a: ['I know. The mountain stopped growling. The first quiet night in a year.', 'But the thing that was inside him... it walked out on its own legs. I saw it from the hill. It went east.'] });
    this.folk.chats.chat(n, { greet: [s.mawDone ? 'Sit, boy. You have earned the fire.' : 'The fire is warm. The mountain is not.'], topics, bye: 'Keep your flame alive.' });
  }

  talkYlva(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.herd === 'done') {
      this.folk.chats.chat(n, { greet: ['The herd is all home. They even like you now. A little.'], topics: [{ id: 'deer', q: 'How are the reindeer?', a: ['Fat and happy. The little one keeps trying to eat my hair.'] }], bye: 'Warm travels!' });
      return;
    }
    if (q.deer.length >= 3 && q.herd) {
      story.talk(n, [
        L('All three! I counted them twice. Then I counted them a third time, because I did not believe it.'),
        L('You walked out into that cold for my herd. Take this. My grandmother sewed it. Reindeer fur, and it is warmer than any fire you can carry.'),
        { run: () => { this.sfx.play('fanfare'); this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.2), 24, 0xe8d8b0); } },
        { who: '', text: 'Cello gets the Herder\'s Cloak! (The cold creeps in half as fast.)' },
      ], () => {
        q.herd = 'done';
        s.furCloak = true;
        this.inventory.addShards(10);
        this.hud.toast('Quest complete: The Lost Herd. Ylva gives Cello the Herder\'s Cloak and 10 shards.', 4600);
        story.save(true);
      });
      return;
    }
    if (!q.herd) {
      story.talk(n, [
        L('Oh! Are you from the south? Did you see any reindeer on the road? Big, brown, stupid, very fluffy?'),
        L('Three of mine ran off when the mountain growled last night. Into the snow. They will freeze out there.'),
        L('If you find one, whistle like this... *fweet-fweet*... and it will run home. They know the way. They are only scared.'),
      ], () => { q.herd = 'asked'; this.questToast('The Lost Herd', 'Find three lost reindeer in the Frostmarch and whistle them home.'); story.save(true); });
      return;
    }
    this.folk.chats.chat(n, {
      greet: [`${q.deer.length} of 3 home. Please keep looking!`],
      topics: [{ id: 'where', q: 'Where did they go?', a: ['One ran toward the pines in the west. One east, past the cairn. And one north, toward the mountain. That one is the bravest. Or the dumbest.'] }],
      bye: 'Fweet-fweet! Remember!',
    });
  }

  talkHakon(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.fisher === 'thawed') {
      story.talk(n, [
        L('You! You are the one who melted Bjarke! He came running in, wet as a seal, shouting about a hero with a lantern.'),
        L('I owe him a fish. I owe you more. Here. Two flasks of oil, the good kind, from my own lamp. Up here that is a king\'s gift.'),
      ], () => {
        q.fisher = 'done';
        this.inventory.giveFlask?.();
        this.inventory.giveFlask?.();
        this.sfx.play('fanfare');
        this.hud.toast('Quest complete: Thin Ice. Hakon gives Cello two Oil Flasks.', 4200);
        story.save(true);
      });
      return;
    }
    if (!q.fisher) {
      story.talk(n, [
        L('Have you seen an old man with a fishing rod? Grey beard, loud mouth? Bjarke. My oldest friend.'),
        L('He went out on the frozen lake two days ago to fish, and did not come back. I went to look. I found him.'),
        L('He is frozen. Inside a block of ice, on the lake. Alive, I think. I saw his eyes move.'),
        L('A fire would melt it, but you cannot carry a fire onto the ice. ...Unless you have a lantern?'),
      ], () => { q.fisher = 'asked'; this.questToast('Thin Ice', 'Thaw Bjarke out of the ice on the frozen lake with a lit lantern.'); story.save(true); });
      return;
    }
    if (q.fisher === 'done') {
      this.folk.chats.chat(n, { greet: ['Bjarke says hello. Bjarke says a lot of things. Loudly.'], topics: [{ id: 'fish', q: 'Did he get his fish?', a: ['Two. He says the second one was for interest.'] }], bye: 'Mind the thin ice.' });
      return;
    }
    this.folk.chats.chat(n, {
      greet: ['Please. Bjarke. The lake, to the west.'],
      topics: [{ id: 'ice', q: 'Any advice for the lake?', a: ['The ice is smooth as a mirror. You will slide like a newborn calf. Walk slowly and do not panic.', 'And light your lantern before you get there. The cold out on the open ice is the worst.'] }],
      bye: 'Hurry.',
    });
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'secret' : 'menuSelect');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4200);
  }

  // ---------------------------------------------------------------- gapet
  firstMaw() {
    const s = this.s;
    if (s.talked.mawVoice) return;
    s.talked.mawVoice = true;
    this.story.after(2.2, () => {
      const Lk = (t) => ({ who: '???', voice: 'loki', text: t });
      this.story.dialog.start([
        Lk('Well, well. A visitor! Nobody visits anymore. The giant has terrible breath, I know.'),
        Lk('No, do not look around, I am not THERE. I am a voice. A very handsome voice.'),
        Lk('There is something of mine at the bottom of this mouth, little hero. Go and get it, and we will talk.'),
      ]);
    });
  }

  maskFound() {
    const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
    this.story.after(0.6, () => this.story.dialog.start([
      Lk('There it is! My old face. Doesn\'t it suit you? It brings out your eyes.'),
      Lk('It throws your shadow ahead of you, and your shadow is as real as you are. Heavy enough to hold down a plate. Slippery enough to pass the rime.'),
      Lk('And when you are bored of standing where you are... trade places with it. Press the mask again.'),
      Lk('Oh, and a tip, from one trickster to another: the big oaf on the throne cannot tell a shadow from a boy.'),
    ]));
  }

  thrymWakes() {
    const K = (t) => ({ who: 'Thrym', voice: 'kronos', text: t });
    this.story.dialog.start([
      { who: '', text: 'The giant on the throne lifts his head. Frost pours from his beard. In his crown, a purple crystal opens like an eye.' },
      K('LITTLE. SPARK. You followed me all the way to the ice.'),
      K('This king was dead, and now he is mine. Soon I will not need borrowed bones. Come closer, so I can break yours.'),
    ]);
  }

  thrymFalls() {
    this.hud.toast('The crystal in Thrym\'s crown shatters...', 3000);
  }

  mawBossDefeated() {
    const story = this.story;
    story.cinematic = true;
    this.combat.unlock(true);
    this.hud.card('Thrym has fallen', 'The king under the ice is at rest', 4200);
    story.after(4.4, () => {
      const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
      story.dialog.start([
        { who: '', text: 'Thrym sinks to his knees, and the purple light leaves his eyes. Something dark pours out of the broken crown, and up, through the ice of the ceiling.' },
        { who: '', text: 'Cello\'s shadow stretches across the floor. Then it stands up on its own, wearing the golden mask. It bows.' },
        Lk('Bravo! What a fight. I would clap, but I am made of shadow. It is very quiet clapping.'),
        Lk('Now. A deal. The mask on your face is still bound to me. Let it stay that way, and I will make it stronger. Your shadow will fly twice as far.'),
        Lk('All I ask is to come along. Watch. Whisper, now and then. What could go wrong?'),
        { who: '', text: 'Behind the shadow, the dying giant breathes out, slow and cold. Even now, there is a blessing in that breath, for anyone who would take it instead.' },
        {
          who: '', prompt: 'What will Cello do?',
          choices: [{ text: 'Trust Loki. Keep the bond.', id: 'trust' }, { text: 'Refuse Loki. Break the bond.', id: 'refuse' }],
          onChoose: (id) => this.choose4(id),
        },
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('A great chest has appeared on the throne.', 3600);
        story.save(true);
      } });
    });
  }

  choose4(id) {
    const s = this.s, P = this.player;
    const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
    if (id === 'trust') {
      s.choice4 = 'trusted';
      s.karma = (s.karma || 0) - 1;
      P.maskRange = 14;
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0x9dff9a);
      this.sfx.play('shadowswap');
      return [
        Lk('Wise boy! Wise, wise boy. You will not regret it. Probably.'),
        { who: '', text: 'The shadow slips back into Cello\'s own, and the mask grows warm on his face. Green light runs along its horns.' },
        { who: '', text: 'Cello\'s shadow can fly much farther now. Somewhere at the edge of hearing, someone is laughing quietly.' },
      ];
    }
    s.choice4 = 'refused';
    s.karma = (s.karma || 0) + 1;
    s.frostBlessing = true;
    this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0xbfe8ff);
    this.sfx.play('secret');
    return [
      Lk('Refuse? ME? ...Ha. Ha ha. Fine. Keep the mask, little hero. It still works. It just will not listen to me anymore.'),
      Lk('We will meet again. Everyone meets me again.'),
      { who: '', text: 'The shadow falls flat, and is only a shadow. Thrym\'s last breath rolls over Cello like a cold wind... and then it is not cold at all.' },
      { who: '', text: 'The frost giant\'s blessing is on Cello. The cold of the north can no longer touch him.' },
    ];
  }

  leaveMaw() {
    const s = this.s, story = this.story, P = this.player;
    if (this.leaving) return;
    this.leaving = true;
    story.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    story.holdMusic('dawn', 40);
    story.startFade(2.6, 'Cello climbs up through the giant\'s throat, between the frozen teeth, into the open air...', () => {
      s.mawDone = true;
      s.hint = 'othrys';
      story.enterArea('frost', 'maw', { walk: false });
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
      story.dialog.start([
        { who: '', text: 'Seren is waiting by the frozen teeth, stamping her feet in the snow.' },
        L('There you are! The whole mountain shook. Then it stopped. Then something came out of the top of it...'),
        { run: () => { this.sfx.play('thunder', { vol: 1 }); this.rig.shake(1.0); } },
        { who: '', text: 'High above the glacier, the dark that left Thrym\'s crown is gathering. Ice, and sea-water, and storm cloud, winding together.' },
        { who: '', text: 'It takes a shape. Shoulders. A crown of jagged ice. Two eyes of purple fire. A king made out of weather.' },
        K('Do you see, little spark? A body. My own body, at last. Built from the bones of the titans you broke for me.'),
        K('The storm. The sea. The frost. Every titan you killed gave me something back.'),
        K('Come to the mountain where I was crowned, if you want the rest of your little hearts. Othrys waits. I will be waiting there too.'),
        { run: () => { this.sfx.play('roar', { vol: 1 }); this.rig.shake(0.8); } },
        { who: '', text: 'The shape turns, and strides away east across the sky, each step a roll of thunder.' },
        L('...He is right, Cello. We have been helping him the whole time.'),
        L('Then we stop helping. We go to that mountain, and we take back every heart he has.'),
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.card('Kronos has a body', 'He strides east, to Mount Othrys', 4600);
        story.after(5, () => this.hud.toast('The road to Mount Othrys opens in the next version of the game.', 4600));
        story.save(true);
      } });
    });
  }

  // ---------------------------------------------------------------- tillstånd
  applyState() {
    const s = this.s, P = this.player, fa = this.fa;
    FrostStory.fresh(s);
    P.hasMask = !!s.items?.mask;
    P.maskRange = s.choice4 === 'trusted' ? 14 : 9;
    const f = fa.fisher;
    if (f) {
      f.freed = !!s.quests.fisher && s.quests.fisher !== 'asked';
      f.melt = null;
      f.block.visible = !f.freed;
      f.block.scale.set(1, 1, 1);
      f.block.position.y = f.y + 1.15;
      f.block.material.opacity = 0.85;
      f.ghost.visible = !f.freed;
      if (f.box) f.box.enabled = !f.freed;
    }
    for (const r of fa.reindeer ?? []) {
      if (r.lost0 === undefined) { r.lost0 = r.lost; r.start0 = r.pos.clone(); }
      if (!r.lost0) continue;
      r.lost = !s.quests.deer.includes(r.id);
      r.run = null;
      r.pos.copy(r.lost ? r.start0 : r.home);
    }
    this.follow = { said: {}, waitT: 0 };
    this.lastArea = null;
    this.wireExits();
    this.buildProps();
    story.frost = this;
  }

  get s() { return this.story.state; }

  static fresh(s) {
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    if (!Array.isArray(s.quests.deer)) s.quests.deer = [];
  }

  // ---------------------------------------------------------------- vägarna
  wireExits() {
    const ga = this.areas.get('galecrown');
    const ex = ga.exits.find((e) => e.frost);
    if (ex) {
      ex.ok = () => !!this.s.templeDone;
      ex.blocked = 'The north bridge is buried under a wall of snow. Nobody has crossed it in months.';
    }
  }

  // ---------------------------------------------------------------- saker i snön
  buildProps() {
    const story = this.story, fa = this.fa;
    // De vilsna renarna: Cello lockar hem dem
    for (const r of fa.reindeer ?? []) {
      if (!r.lost) continue;
      story.interactions.push({
        label: 'Coax the reindeer home', area: 'frost', pos: () => r.pos, radius: 2.6,
        ok: () => story.phase === 'free' && !r.run && !this.s.quests.deer.includes(r.id) && !!this.s.quests.herd,
        run: () => this.coaxDeer(r),
      });
    }
    // Den infrusne fiskaren på sjön
    const f = fa.fisher;
    if (f) {
      story.interactions.push({
        label: () => (this.inventory.lit ? 'Thaw the ice with the lantern' : 'Look at the block of ice'), area: 'frost', pos: () => f.pos, radius: 2.4,
        ok: () => story.phase === 'free' && !f.freed,
        run: () => this.thawFisher(),
      });
    }
    fa.updaters.push((t, dt) => this.updateProps(t, dt));
  }

  updateProps(t, dt) {
    const f = this.fa.fisher;
    if (f?.melt != null) {
      f.melt = Math.min(1, f.melt + dt / 2.2);
      f.block.scale.set(1 - f.melt * 0.7, 1 - f.melt * 0.9, 1 - f.melt * 0.7);
      f.block.position.y = f.y + 1.15 * (1 - f.melt * 0.9);
      f.block.material.opacity = 0.85 * (1 - f.melt);
      if (Math.random() < dt * 20) this.fx.burst('spark', f.pos.clone().setY(f.y + 1 + Math.random()), 2, 0xffd890);
      if (f.melt >= 1) { f.block.visible = false; f.melt = null; }
    }
  }

  coaxDeer(r) {
    const s = this.s, q = s.quests;
    q.deer.push(r.id);
    const from = r.pos.clone();
    r.run = { from, t: 0, dur: Math.max(3, from.distanceTo(r.home) / 9) };
    this.sfx.play('hoof', { vol: 0.8 });
    this.sfx.play('chime', { vol: 0.6 });
    const n = q.deer.length;
    this.hud.toast(n < 3 ? `Cello whistles like Ylva showed him. The reindeer lifts its head, and trots off home! (${n} of 3)` : 'That is the last one! All three reindeer are running home. Tell Ylva.', 3800);
    this.story.save(true);
  }

  thawFisher() {
    const s = this.s, story = this.story, inv = this.inventory, f = this.fa.fisher;
    if (!s.lantern) { story.read(['A block of ice, as tall as a man. There is a man inside it: an old fisher, his rod still in his hand.', 'His eyes move. He is alive in there! A flame might thaw him... if Cello had one.']); return; }
    if (!inv.lit) { story.read(['A man is frozen inside the ice, an old fisher with his rod still in his hand.', 'His eyes move. A flame could thaw him. Light the lantern first.']); return; }
    if ((s.oil ?? 0) < 10 && !(s.flasks > 0)) { story.read(['Cello holds up his lantern, but the flame is too small. There is barely any oil left.']); return; }
    if ((s.oil ?? 0) < 10) inv.pourFlask();
    s.oil = Math.max(0, (s.oil ?? 0) - 10);
    s.quests.fisher = 'thawed';
    f.freed = true;
    f.melt = 0;
    if (f.box) f.box.enabled = false;
    this.sfx.play('lantern');
    this.sfx.play('icecrack');
    const B = (t) => ({ who: 'Bjarke', voice: 'bjarke', text: t });
    story.cinematic = true;
    story.after(2.4, () => {
      f.ghost.visible = false;
      story.dialog.start([
        { who: '', text: 'The ice runs away in streams of water. An old man tumbles out onto the lake, coughing and shaking.' },
        B('Hhh... HAH! Warm! Warm hands! Who are you, boy? No, do not tell me. You are a hero. Only heroes walk around with lanterns.'),
        B('A wolf came out of the snow, all made of ice. It breathed on me, and then... then you. How long was I in there?'),
        B('Never mind. I am going home to Hakon. He owes me a fish.'),
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('Bjarke runs off toward Rimeholt. Tell Hakon!', 3400);
        story.save(true);
      } });
    });
  }

  // ---------------------------------------------------------------- Seren
  serenHome() {
    const v = this.fr.village, H = this.fr.H;
    return V3(v.x + 3, H(v.x + 3, v.z + 3), v.z + 3);
  }

  placeSeren() {
    const n = this.folk.npcs.seren;
    if (!n || !this.s.templeDone) return false;
    const fa = this.fa;
    if (n.model.root.parent !== fa.root) fa.root.add(n.model.root);
    n.area = 'frost';
    n.walkTarget = null;
    const P = this.player;
    if (this.areas.id === 'frost') {
      const at = V3(P.feet.x - Math.sin(P.facing) * 2 + 1.2, 0, P.feet.z - Math.cos(P.facing) * 2);
      at.y = this.fr.H(at.x, at.z);
      n.place(Math.abs(at.y - P.feet.y) < 1.5 ? at : this.serenHome(), P.facing, 'stand');
    } else n.place(this.serenHome(), 2.4, 'stand');
    return true;
  }

  onIce(p) {
    const L = this.fr.lake;
    return Math.hypot(p.x - L.x, p.z - L.z) < L.r;
  }

  updateFollow(dt) {
    const n = this.folk.npcs.seren, P = this.player, story = this.story;
    if (!n || n.area !== 'frost' || this.areas.id !== 'frost' || story.cinematic || story.dialog.active || n.talking) return;
    const f = this.follow;
    const dx = P.feet.x - n.pos.x, dz = P.feet.z - n.pos.z, d = Math.hypot(dx, dz);
    if (!P.grounded && !P.swimming) return;
    if (d > 45) {
      const at = V3(P.feet.x - Math.sin(P.facing) * 3, 0, P.feet.z - Math.cos(P.facing) * 3);
      at.y = this.fr.H(at.x, at.z);
      if (Math.abs(at.y - P.feet.y) < 2) n.place(at, P.facing, 'stand');
    } else if (d > 3.4) {
      const tx = P.feet.x - (dx / d) * 2.4, tz = P.feet.z - (dz / d) * 2.4;
      // På isen åker Seren skridsko: fortare, och med ett glädjetjut första gången
      const ice = this.onIce(n.pos);
      n.walkTo(V3(tx, this.fr.H(tx, tz), tz), Math.min(ice ? 10 : 7.5, (ice ? 4 : 2.4) + d * 0.6));
      if (ice && !f.said.ice) {
        f.said.ice = true;
        this.hud.toast('Seren: "Ice! Real ice! Watch this, Cello!" She slides past him on her boots, arms out wide, laughing.', 4400);
      }
    } else n.walkTarget = null;
  }

  talkSeren(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (!s.talked.serenFrost) {
      story.talk(n, [
        L('Snow! Cello, look at it! I have not seen real snow since I was small.'),
        L('My village was in the mountains. Every winter, the lake froze, and we slid on it all day. My father said I was born with ice under my feet.'),
        L('...Sorry. I am supposed to be serious. Kronos. Frost giants. Very serious.'),
        L('But if there is a frozen lake around here, I am going on it.'),
      ], () => { s.talked.serenFrost = true; story.save(true); });
      return;
    }
    const topics = [
      { id: 'cold', q: 'Aren\'t you cold?', a: ['Cold? This is nothing. Keep your lantern lit when the wind comes, though. You southern boys freeze like puddles.', 'And when the snow starts to scream, find a fire. Fast.'] },
      { id: 'giant', q: 'What do you know about frost giants?', a: ['Stories. They were here before the gods, as old as the titans. Kronos\'s cousins, almost.', 'The old woman by the fire knows more. Sigrun. She looks at the mountain like it owes her money.'] },
    ];
    if (s.mawDone) topics.unshift({ id: 'kronos', q: 'Kronos has a body now...', a: ['I saw it. Ice and sea and storm, all wound together into a shape. Like a king made out of weather.', 'East, Cello. He went east, to the mountain of the titans. And we go after him. ...After I slide on that lake one more time.'] });
    this.folk.chats.chat(n, {
      greet: [s.mawDone ? 'The snow feels different now. Quieter. Like it is waiting.' : 'Have you found the frozen lake yet? I am asking for a friend. The friend is me.'],
      topics,
      bye: 'Do not freeze.',
    });
  }

  // ---------------------------------------------------------------- folket i Rimeholt
  talkSigrun(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (!s.talked.sigrun) {
      story.talk(n, [
        L('A southern boy. With a sword, and a light, and the smell of the sea on him. Sit. The fire does not bite.'),
        L('You are here for the giant\'s mouth. Everyone with a sword is here for the giant\'s mouth.'),
        L('Long ago, Thrym, the king of the frost giants, stole the hammer of the thunder god. He died for it. His body froze into the mountain, his mouth wide open.'),
        L('Now the mouth breathes again. At night we hear him growl. Something old has climbed into the dead king, like a hand into a glove.'),
        L('And someone else is inside, too. A laughing voice. The herders call him the Grinning One. Loki, the old songs say. The trickster.'),
        L('Whatever he offers you in there, boy... count your fingers after you shake his hand.'),
      ], () => { s.talked.sigrun = true; if (!s.mawDone) s.hint = 'maw'; story.save(true); });
      return;
    }
    const topics = [
      { id: 'loki', q: 'Who is Loki?', a: ['A god, and not a god. Born of giants, raised by gods, loyal to neither. He wore a thousand faces, and he left a mask behind for each one.', 'He helps. Oh, he helps. And then one day you find out what the help cost.'] },
      { id: 'maw', q: 'How do I get into the giant\'s mouth?', a: ['North, past the pines, where the glacier bends. You cannot miss it. It is the size of a hill, and it has teeth.', 'Inside, the ice is smooth as glass. Once you start to slide, you do not stop. Remember that.'] },
      { id: 'cold', q: 'How do you live with this cold?', a: ['Fire. Fur. Stubbornness. The storms are the worst. When the snow screams, stay close to a flame, or the cold climbs into your bones.', 'Lantern oil is worth more than gold up here.'] },
    ];
    if (s.mawDone) topics.unshift({ id: 'after', q: 'Thrym is at rest.', a: ['I know. The mountain stopped growling. The first quiet night in a year.', 'But the thing that was inside him... it walked out on its own legs. I saw it from the hill. It went east.'] });
    this.folk.chats.chat(n, { greet: [s.mawDone ? 'Sit, boy. You have earned the fire.' : 'The fire is warm. The mountain is not.'], topics, bye: 'Keep your flame alive.' });
  }

  talkYlva(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.herd === 'done') {
      this.folk.chats.chat(n, { greet: ['The herd is all home. They even like you now. A little.'], topics: [{ id: 'deer', q: 'How are the reindeer?', a: ['Fat and happy. The little one keeps trying to eat my hair.'] }], bye: 'Warm travels!' });
      return;
    }
    if (q.deer.length >= 3 && q.herd) {
      story.talk(n, [
        L('All three! I counted them twice. Then I counted them a third time, because I did not believe it.'),
        L('You walked out into that cold for my herd. Take this. My grandmother sewed it. Reindeer fur, and it is warmer than any fire you can carry.'),
        { run: () => { this.sfx.play('fanfare'); this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.2), 24, 0xe8d8b0); } },
        { who: '', text: 'Cello gets the Herder\'s Cloak! (The cold creeps in half as fast.)' },
      ], () => {
        q.herd = 'done';
        s.furCloak = true;
        this.inventory.addShards(10);
        this.hud.toast('Quest complete: The Lost Herd. Ylva gives Cello the Herder\'s Cloak and 10 shards.', 4600);
        story.save(true);
      });
      return;
    }
    if (!q.herd) {
      story.talk(n, [
        L('Oh! Are you from the south? Did you see any reindeer on the road? Big, brown, stupid, very fluffy?'),
        L('Three of mine ran off when the mountain growled last night. Into the snow. They will freeze out there.'),
        L('If you find one, whistle like this... *fweet-fweet*... and it will run home. They know the way. They are only scared.'),
      ], () => { q.herd = 'asked'; this.questToast('The Lost Herd', 'Find three lost reindeer in the Frostmarch and whistle them home.'); story.save(true); });
      return;
    }
    this.folk.chats.chat(n, {
      greet: [`${q.deer.length} of 3 home. Please keep looking!`],
      topics: [{ id: 'where', q: 'Where did they go?', a: ['One ran toward the pines in the west. One east, past the cairn. And one north, toward the mountain. That one is the bravest. Or the dumbest.'] }],
      bye: 'Fweet-fweet! Remember!',
    });
  }

  talkHakon(n) {
    const s = this.s, story = this.story, q = s.quests;
    const L = (t) => story.line(n, t);
    if (q.fisher === 'thawed') {
      story.talk(n, [
        L('You! You are the one who melted Bjarke! He came running in, wet as a seal, shouting about a hero with a lantern.'),
        L('I owe him a fish. I owe you more. Here. Two flasks of oil, the good kind, from my own lamp. Up here that is a king\'s gift.'),
      ], () => {
        q.fisher = 'done';
        this.inventory.giveFlask?.();
        this.inventory.giveFlask?.();
        this.sfx.play('fanfare');
        this.hud.toast('Quest complete: Thin Ice. Hakon gives Cello two Oil Flasks.', 4200);
        story.save(true);
      });
      return;
    }
    if (!q.fisher) {
      story.talk(n, [
        L('Have you seen an old man with a fishing rod? Grey beard, loud mouth? Bjarke. My oldest friend.'),
        L('He went out on the frozen lake two days ago to fish, and did not come back. I went to look. I found him.'),
        L('He is frozen. Inside a block of ice, on the lake. Alive, I think. I saw his eyes move.'),
        L('A fire would melt it, but you cannot carry a fire onto the ice. ...Unless you have a lantern?'),
      ], () => { q.fisher = 'asked'; this.questToast('Thin Ice', 'Thaw Bjarke out of the ice on the frozen lake with a lit lantern.'); story.save(true); });
      return;
    }
    if (q.fisher === 'done') {
      this.folk.chats.chat(n, { greet: ['Bjarke says hello. Bjarke says a lot of things. Loudly.'], topics: [{ id: 'fish', q: 'Did he get his fish?', a: ['Two. He says the second one was for interest.'] }], bye: 'Mind the thin ice.' });
      return;
    }
    this.folk.chats.chat(n, {
      greet: ['Please. Bjarke. The lake, to the west.'],
      topics: [{ id: 'ice', q: 'Any advice for the lake?', a: ['The ice is smooth as a mirror. You will slide like a newborn calf. Walk slowly and do not panic.', 'And light your lantern before you get there. The cold out on the open ice is the worst.'] }],
      bye: 'Hurry.',
    });
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'secret' : 'menuSelect');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4200);
  }

  // ---------------------------------------------------------------- gapet
  firstMaw() {
    const s = this.s;
    if (s.talked.mawVoice) return;
    s.talked.mawVoice = true;
    this.story.after(2.2, () => {
      const Lk = (t) => ({ who: '???', voice: 'loki', text: t });
      this.story.dialog.start([
        Lk('Well, well. A visitor! Nobody visits anymore. The giant has terrible breath, I know.'),
        Lk('No, do not look around, I am not THERE. I am a voice. A very handsome voice.'),
        Lk('There is something of mine at the bottom of this mouth, little hero. Go and get it, and we will talk.'),
      ]);
    });
  }

  maskFound() {
    const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
    this.story.after(0.6, () => this.story.dialog.start([
      Lk('There it is! My old face. Doesn\'t it suit you? It brings out your eyes.'),
      Lk('It throws your shadow ahead of you, and your shadow is as real as you are. Heavy enough to hold down a plate. Slippery enough to pass the rime.'),
      Lk('And when you are bored of standing where you are... trade places with it. Press the mask again.'),
      Lk('Oh, and a tip, from one trickster to another: the big oaf on the throne cannot tell a shadow from a boy.'),
    ]));
  }

  thrymWakes() {
    const K = (t) => ({ who: 'Thrym', voice: 'kronos', text: t });
    this.story.dialog.start([
      { who: '', text: 'The giant on the throne lifts his head. Frost pours from his beard. In his crown, a purple crystal opens like an eye.' },
      K('LITTLE. SPARK. You followed me all the way to the ice.'),
      K('This king was dead, and now he is mine. Soon I will not need borrowed bones. Come closer, so I can break yours.'),
    ]);
  }

  thrymFalls() {
    this.hud.toast('The crystal in Thrym\'s crown shatters...', 3000);
  }

  mawBossDefeated() {
    const story = this.story;
    story.cinematic = true;
    this.combat.unlock(true);
    this.hud.card('Thrym has fallen', 'The king under the ice is at rest', 4200);
    story.after(4.4, () => {
      const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
      story.dialog.start([
        { who: '', text: 'Thrym sinks to his knees, and the purple light leaves his eyes. Something dark pours out of the broken crown, and up, through the ice of the ceiling.' },
        { who: '', text: 'Cello\'s shadow stretches across the floor. Then it stands up on its own, wearing the golden mask. It bows.' },
        Lk('Bravo! What a fight. I would clap, but I am made of shadow. It is very quiet clapping.'),
        Lk('Now. A deal. The mask on your face is still bound to me. Let it stay that way, and I will make it stronger. Your shadow will fly twice as far.'),
        Lk('All I ask is to come along. Watch. Whisper, now and then. What could go wrong?'),
        { who: '', text: 'Behind the shadow, the dying giant breathes out, slow and cold. Even now, there is a blessing in that breath, for anyone who would take it instead.' },
        {
          who: '', prompt: 'What will Cello do?',
          choices: [{ text: 'Trust Loki. Keep the bond.', id: 'trust' }, { text: 'Refuse Loki. Break the bond.', id: 'refuse' }],
          onChoose: (id) => this.choose4(id),
        },
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.toast('A great chest has appeared on the throne.', 3600);
        story.save(true);
      } });
    });
  }

  choose4(id) {
    const s = this.s, P = this.player;
    const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
    if (id === 'trust') {
      s.choice4 = 'trusted';
      s.karma = (s.karma || 0) - 1;
      P.maskRange = 14;
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0x9dff9a);
      this.sfx.play('shadowswap');
      return [
        Lk('Wise boy! Wise, wise boy. You will not regret it. Probably.'),
        { who: '', text: 'The shadow slips back into Cello\'s own, and the mask grows warm on his face. Green light runs along its horns.' },
        { who: '', text: 'Cello\'s shadow can fly much farther now. Somewhere at the edge of hearing, someone is laughing quietly.' },
      ];
    }
    s.choice4 = 'refused';
    s.karma = (s.karma || 0) + 1;
    s.frostBlessing = true;
    this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.4), 40, 0xbfe8ff);
    this.sfx.play('secret');
    return [
      Lk('Refuse? ME? ...Ha. Ha ha. Fine. Keep the mask, little hero. It still works. It just will not listen to me anymore.'),
      Lk('We will meet again. Everyone meets me again.'),
      { who: '', text: 'The shadow falls flat, and is only a shadow. Thrym\'s last breath rolls over Cello like a cold wind... and then it is not cold at all.' },
      { who: '', text: 'The frost giant\'s blessing is on Cello. The cold of the north can no longer touch him.' },
    ];
  }

  leaveMaw() {
    const s = this.s, story = this.story, P = this.player;
    if (this.leaving) return;
    this.leaving = true;
    story.cinematic = true;
    this.combat.unlock(true);
    this.sfx.play('portal');
    story.holdMusic('dawn', 40);
    story.startFade(2.6, 'Cello climbs up through the giant\'s throat, between the frozen teeth, into the open air...', () => {
      s.mawDone = true;
      s.hint = 'othrys';
      story.enterArea('frost', 'maw', { walk: false });
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
      story.dialog.start([
        { who: '', text: 'Seren is waiting by the frozen teeth, stamping her feet in the snow.' },
        L('There you are! The whole mountain shook. Then it stopped. Then something came out of the top of it...'),
        { run: () => { this.sfx.play('thunder', { vol: 1 }); this.rig.shake(1.0); } },
        { who: '', text: 'High above the glacier, the dark that left Thrym\'s crown is gathering. Ice, and sea-water, and storm cloud, winding together.' },
        { who: '', text: 'It takes a shape. Shoulders. A crown of jagged ice. Two eyes of purple fire. A king made out of weather.' },
        K('Do you see, little spark? A body. My own body, at last. Built from the bones of the titans you broke for me.'),
        K('The storm. The sea. The frost. Every titan you killed gave me something back.'),
        K('Come to the mountain where I was crowned, if you want the rest of your little hearts. Othrys waits. I will be waiting there too.'),
        { run: () => { this.sfx.play('roar', { vol: 1 }); this.rig.shake(0.8); } },
        { who: '', text: 'The shape turns, and strides away east across the sky, each step a roll of thunder.' },
        L('...He is right, Cello. We have been helping him the whole time.'),
        L('Then we stop helping. We go to that mountain, and we take back every heart he has.'),
      ], { onEnd: () => {
        story.cinematic = false;
        this.hud.card('Kronos has a body', 'He strides east, to Mount Othrys', 4600);
        story.after(5, () => this.hud.toast('The road to Mount Othrys opens in the next version of the game.', 4600));
        story.save(true);
      } });
    });
  }

  // ---------------------------------------------------------------- tillstånd
  applyState() {
    const s = this.s, P = this.player, fa = this.fa;
    FrostStory.fresh(s);
    P.hasMask = !!s.items?.mask;
    P.maskRange = s.choice4 === 'trusted' ? 14 : 9;
    const f = fa.fisher;
    if (f) {
      f.freed = !!s.quests.fisher && s.quests.fisher !== 'asked';
      f.melt = null;
      f.block.visible = !f.freed;
      f.block.scale.set(1, 1, 1);
      f.block.position.y = f.y + 1.15;
      f.block.material.opacity = 0.85;
      f.ghost.visible = !f.freed;
      if (f.box) f.box.enabled = !f.freed;
    }
    for (const r of fa.reindeer ?? []) {
      const home = !r.lost0 ? false : s.quests.deer.includes(r.id);
      r.lost0 = r.lost0 ?? r.lost;
      if (r.lost0) {
        r.lost = !s.quests.deer.includes(r.id);
        r.run = null;
        r.pos.copy(r.lost ? r.start0 ?? (r.start0 = r.pos.clone()) : r.home);
      }
      void home;
    }
    this.follow = { said: {}, waitT: 0 };
    this.lastArea = null;
    this.placeSeren();
  }

  // ---------------------------------------------------------------- varje bildruta
  update(dt) {
    const s = this.s, story = this.story;
    if (!s || story.phase !== 'free') return;
    const here = this.areas.id;
    if (here !== this.lastArea) {
      this.lastArea = here;
      // Seren går med till norr (och tillbaka till havet)
      const n = this.folk.npcs.seren;
      if (n && s.templeDone) {
        if (here === 'frost' && n.area !== 'frost') this.placeSeren();
        else if (here === 'sea' && n.area === 'frost') story.sea?.placeSeren();
      }
    }
    if (here === 'frost') {
      this.updateFollow(dt);
      if (!s.talked.frostArrive && !story.cinematic && !story.fade) {
        s.talked.frostArrive = true;
        story.after(2.4, () => {
          const n = this.folk.npcs.seren;
          if (n && n.area === 'frost') this.hud.toast('Seren: "Snow! Cello, SNOW! ...Keep your lantern lit out here. The cold is no joke."', 4600);
        });
      }
    }
    if (here === 'fgate' && !s.talked.mawVoice && !story.cinematic && !story.fade) this.firstMaw();
  }
}

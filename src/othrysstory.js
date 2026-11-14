// Mount Othrys (0.21): sista kapitlet. Allt som hör till titanernas berg samlas här:
//
//   · Isbron från The Frostmarch öppnas när Kronos har gått österut (efter Frostgiant's Maw).
//   · Seren följer med. Vid bergets fot väntar Rhea, titaninnan som en gång gömde sitt yngsta barn för Kronos.
//   · Hjärtburarna: fem hjärtan som titanerna tog från folket i byarna. Släpps de fria flyger de till Rheas
//     härd; alla fem ger Cello ett hjärta till (sidouppdraget "The Caged Hearts").
//   · The Crown of Othrys: Kronos röst, striden och det femte valet (krossa kronan eller ta den).
//   · Slutet: vad som hände sedan (efter alla valen Cello har gjort), eftertexterna, och Cello vaknar hemma.
//   · Efteråt: Ida, Marens mor, är hemma i Aetheria, och åskan över berget har tystnat.
import * as THREE from 'three';
import { Credits } from './ending.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class OthrysStory {
  constructor({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music, weather }) {
    Object.assign(this, { story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music, weather });
    this.ot = world.othrys;
    this.oa = areas.get('othrys');
    this.crown = world.crown;
    this.credits = new Credits(sfx);
    this.follow = { said: {} };
    this.lastArea = null;
    this.wireExits();
    this.buildProps();
    story.othrys = this;
  }

  get s() { return this.story.state; }

  static fresh(s) {
    if (!Array.isArray(s.embers)) s.embers = [];
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
  }

  // ---------------------------------------------------------------- vägarna
  wireExits() {
    const fa = this.areas.get('frost');
    const ex = fa?.exits.find((e) => e.othrys);
    if (ex) {
      ex.ok = () => !!this.s.mawDone;
      ex.blocked = 'The ice bridge is covered in a storm of black snow. Nothing can cross it... yet.';
    }
  }

  // ---------------------------------------------------------------- hjärtburarna
  buildProps() {
    const story = this.story;
    for (const e of this.oa.embers ?? []) {
      story.interactions.push({
        label: 'Open the cage', area: 'othrys', pos: () => V3(e.x, e.y, e.z), radius: 2.0,
        ok: () => story.phase === 'free' && !this.s.embers.includes(e.id),
        run: () => this.openCage(e),
      });
    }
  }

  openCage(e) {
    const s = this.s, story = this.story;
    OthrysStory.fresh(s);
    s.embers.push(e.id);
    this.sfx.play('unlock');
    this.sfx.play('heart', { delay: 0.3 });
    e.cage.visible = false;
    e.flyT = 0;
    e.light.on = false;
    this.fx.burst('spark', V3(e.x, e.y + 1.6, e.z), 26, 0xff8a9a);
    const n = s.embers.length;
    story.cinematic = true;
    story.after(0.6, () => {
      story.dialog.start([
        { who: '', text: `A heart, warm as a hand. A voice comes out of it, faint, like someone talking in their sleep. It is ${e.who}, from ${e.from}.` },
        { who: e.who, voice: 'spirit', text: e.line },
        { who: '', text: n < 5 ? `The heart rises out of the cage and flies west, toward Rhea's hearth. (${n} of 5)` : 'The last heart flies west, toward Rhea\'s hearth. All five are free! Tell Rhea.' },
      ], { onEnd: () => { story.cinematic = false; story.save(true); } });
    });
  }

  // ---------------------------------------------------------------- Seren
  serenHome() {
    const c = this.ot.camp, H = this.ot.H;
    return V3(c.x + 3, H(c.x + 3, c.z + 3.4), c.z + 3.4);
  }

  placeSeren() {
    const n = this.folk.npcs.seren;
    if (!n || !this.s.mawDone) return false;
    const oa = this.oa;
    if (n.model.root.parent !== oa.root) oa.root.add(n.model.root);
    n.area = 'othrys';
    n.walkTarget = null;
    const P = this.player;
    if (this.areas.id === 'othrys') {
      const at = V3(P.feet.x - Math.sin(P.facing) * 2 + 1.2, 0, P.feet.z - Math.cos(P.facing) * 2);
      at.y = this.ot.H(at.x, at.z);
      n.place(Math.abs(at.y - P.feet.y) < 1.5 ? at : this.serenHome(), P.facing, 'stand');
    } else n.place(this.serenHome(), 2.4, 'stand');
    return true;
  }

  updateFollow() {
    const n = this.folk.npcs.seren, P = this.player, story = this.story;
    if (!n || n.area !== 'othrys' || this.areas.id !== 'othrys' || story.cinematic || story.dialog.active || n.talking) return;
    if (!P.grounded) return;
    const dx = P.feet.x - n.pos.x, dz = P.feet.z - n.pos.z, d = Math.hypot(dx, dz);
    // Vid lägret stannar hon vid elden
    const c = this.ot.camp;
    if (Math.hypot(P.feet.x - c.x, P.feet.z - c.z) < 14) {
      if (!n.walkTarget && n.pos.distanceTo(this.serenHome()) > 1) n.walkTo(this.serenHome(), 3.5);
      return;
    }
    if (d > 45) {
      const at = V3(P.feet.x - Math.sin(P.facing) * 3, 0, P.feet.z - Math.cos(P.facing) * 3);
      at.y = this.ot.H(at.x, at.z);
      if (Math.abs(at.y - P.feet.y) < 2) n.place(at, P.facing, 'stand');
    } else if (d > 3.4) {
      const tx = P.feet.x - (dx / d) * 2.4, tz = P.feet.z - (dz / d) * 2.4;
      n.walkTo(V3(tx, this.ot.H(tx, tz), tz), Math.min(7.5, 2.4 + d * 0.6));
    } else n.walkTarget = null;
  }

  talkSeren(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    if (s.ending) {
      this.folk.chats.chat(n, {
        greet: ['Listen. No thunder. I keep waiting for it, and it does not come.'],
        topics: [
          { id: 'next', q: 'What will you do now?', a: [s.choice5 === 'taken' ? 'Watch you. Somebody has to.' : 'Find a frozen lake. Teach a certain boy from the forest to skate. Then... we will see.', 'You did good, Cello. Whatever anyone says.'] },
          { id: 'rhea', q: 'Rhea seems happier.', a: ['She smiled at me. A titan smiled at me! I am going to tell everyone in my village. Nobody will believe me.'] },
        ],
        bye: 'Go home. Feed your goats.',
      });
      return;
    }
    const topics = [
      { id: 'mountain', q: 'Are you scared?', a: ['Of course I am scared. He is a king made of weather and I have a sword I bought in a market.', 'But I was scared at the tower, and under the sea, and in the ice. Being scared has not stopped us yet.'] },
      { id: 'rhea', q: 'What do you think of Rhea?', a: ['She is Kronos\'s WIFE, Cello. His wife! And she is cooking us soup.', '...It is very good soup.'] },
    ];
    if (s.embers.length && s.embers.length < 5) topics.push({ id: 'hearts', q: 'The hearts in the cages...', a: ['I heard one. An old man, asking about a bell. I had to walk away for a bit.', 'Let us find the others. All of them.'] });
    this.folk.chats.chat(n, {
      greet: [s.crown?.entered ? 'Every step up that mountain, the storm gets louder. Like it knows we are coming.' : 'There it is. The mountain of the titans. It looks like it is wearing a crown.'],
      topics,
      bye: 'Stay close.',
    });
  }

  // ---------------------------------------------------------------- Rhea
  talkRhea(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    OthrysStory.fresh(s);
    if (s.ending) {
      story.talk(n, s.choice5 === 'taken'
        ? [L('So. You wear his crown, and you still come and sit by my fire.'), L('Then there is hope for you yet, little king. Remember the boy you were. Remember him every day.')]
        : [L('The mountain is quiet. For the first time since before the gods were born, it is only a mountain.'), L('I will stay a while, and tend his grave. He was my husband, once. Before he was hungry.'), L('Go home, Cello. You have a home. Not every hero can say that.')]);
      return;
    }
    if (!s.talked.rhea) {
      story.talk(n, [
        L('Come in out of the storm, children. Sit. The fire is old, but it still burns.'),
        L('You have the smell of him on you. Kronos. You have been following him a long way.'),
        L('I am Rhea. Long ago, before your gods were grown, I was his queen.'),
        L('He was afraid that his children would take his throne, so he swallowed them, one by one. I hid the youngest from him, and the youngest grew up and threw him down into the dark.'),
        L('Now the dark has given him back. He has built himself a body from the titans you broke, and taken a crown of hearts. Your people\'s hearts. He keeps the rest of them in cages on this mountain, like a farmer keeps hens.'),
        L('Open the cages, if you find them. Hearts know the way home.'),
        L('And when you climb the mountain... bring everything the gods left you. Every gift. He fears them, because he remembers who carried them.'),
      ], () => { s.talked.rhea = true; s.hint = 'crown'; this.questToast('The Caged Hearts', 'Find the five cages on Mount Othrys and set the hearts free.'); story.save(true); });
      return;
    }
    if (s.embers.length >= 5 && !s.quests.hearts) {
      story.talk(n, [
        L('Five hearts came home to my fire tonight. They are sleeping now, the way hearts do, waiting for their people.'),
        L('You did that. Here. The warmth of this hearth is older than the gods. Take some of it with you.'),
        { run: () => { this.sfx.play('heartbig'); this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.2), 30, 0xff8a9a); } },
        { who: '', text: 'Cello\'s heart grows stronger! He can take one more heart of damage.' },
      ], () => {
        s.quests.hearts = 'done';
        s.hearts = (s.hearts || 0) + 1;
        const P = this.player;
        P.maxHp = story.maxHpFor(s);
        P.hp = P.maxHp;
        this.hud.setHearts(P.hp, P.maxHp);
        this.sfx.play('quest');
        this.hud.toast('Quest complete: The Caged Hearts. Cello gets a Heart Ember.', 4600);
        story.save(true);
      });
      return;
    }
    const topics = [
      { id: 'kronos', q: 'How do I beat Kronos?', a: ['He is shielded by the hearts of the three titans you broke: storm, sea and frost. He wears them like armor.', 'Break them with the gifts that broke their masters. The thunder for the storm. The sea god\'s spear for the sea. And frost... frost hides behind frost. A trickster would know how to slip past it.', 'When all three are broken, he will kneel. Strike his heart then.'] },
      { id: 'gods', q: 'Where are the gods now?', a: ['Gone. Tired, or sleeping, or simply... finished. Gods end, child. Titans too. Only the stories go on.', 'The gifts they left are what is left of them. Use them well.'] },
      { id: 'hearts', q: `The caged hearts... (${s.embers.length} of 5)`, a: s.embers.length >= 5 ? ['All five are here. Thank you.'] : ['Five cages, scattered across the mountain\'s foot. Follow the red glow. Some are guarded.'] },
    ];
    this.folk.chats.chat(n, { greet: ['The fire is warm. Sit as long as you like.'], topics, bye: 'Go carefully.' });
  }

  // Ida, Marens mor, i Aetheria efter slutet
  talkIda(n) {
    const s = this.s, story = this.story;
    const L = (t) => story.line(n, t);
    story.talk(n, s.choice1 === 'saved'
      ? [L('You are Cello. Maren talks about you all day. The boy from the forest who carried her out of the fire.'), L('I was so cold in that place. And then a warm hand opened the door. Was that you too?'), L('Thank you. For my daughter. For me. Come to dinner on Sunday. I will not take no for an answer.')]
      : [L('You are Cello... You were there, the day the titan came.'), L('Maren... I know. Lyra told me. You do not have to say anything.'), L('I was so cold in that place, and then a warm hand opened the door. I am told it was yours. Thank you for that, at least.')]);
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'quest' : 'questNew');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4600);
  }

  // ---------------------------------------------------------------- i berget
  firstCrown() {
    const s = this.s;
    if (s.talked.crownVoice) return;
    s.talked.crownVoice = true;
    this.crown.state.entered = true;
    this.story.after(2.0, () => {
      const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
      this.story.dialog.start([
        K('You came. Of course you came. You always come, little spark.'),
        K('Climb, then. Every step brings you closer to my throne. And to all the hearts I have saved for you.'),
      ]);
    });
  }

  kronosWakes() {
    const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
    this.story.dialog.start([
      { who: '', text: 'On the throne at the top of the world, the shape of weather stands up. Storm in his chest, sea at his feet, ice on his brow. Three hearts circle him like moons.' },
      K('Look at them. The storm of Typhon. The sea of Ketos. The frost of Thrym. You broke my brothers, and I took what was left.'),
      K('You carry the toys of the gods. Let us see if you know how to play with them.'),
    ]);
  }

  kronosPhase(n) {
    const lines = n === 2
      ? ['Again? I have time, spark. I AM time.']
      : ['Enough! I will grind your little gods\' gifts into dust!'];
    this.hud.toast(`Kronos: "${lines[0]}"`, 3200);
    this.sfx.speak?.('kronos', 6);
  }

  kronosFalls() {
    this.hud.toast('The crystal in Kronos\'s chest cracks open...', 3200);
  }

  // Kronos har fallit: kronan, hjärtana, och det sista valet
  kronosDefeated() {
    const story = this.story, s = this.s;
    story.cinematic = true;
    this.combat.unlock(true);
    s.crownDone = true;
    this.hud.card('Kronos has fallen', 'The King of the Titans kneels for the last time', 4400);
    story.holdMusic('dawn', 120);
    story.after(4.6, () => {
      const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
      const Lk = (t) => ({ who: 'Loki', voice: 'loki', text: t });
      const lines = [
        { who: '', text: 'Kronos sinks down on his throne. The storm in his chest goes out like a candle. His crown of ice slides from his head and rolls across the stone, and stops at Cello\'s feet.' },
        { who: '', text: 'Inside the crown, hundreds of tiny lights are beating. Hearts. Every heart the titans ever took.' },
        K('...Well. Look at you. A boy from the forest, standing over the king of the titans.'),
        K('Take it. Put it on. With that crown, you could command every heart in the realm. Make every village whole in one night. No more storms, no more fear. Ever.'),
        K('Or break it, and let them all fly away, and go back to your little house, and wait for the next thing that comes out of the dark.'),
        K('I was a boy once too, spark. It is a heavy thing, to be the one who decides.'),
      ];
      if (s.choice4 === 'trusted') {
        lines.push({ who: '', text: 'Cello\'s shadow stretches out across the floor and stands up, grinning in its golden mask.' });
        lines.push(Lk('Oh, take it! Take it, take it! Think of the fun we could have! ...I mean, the GOOD we could do.'));
      }
      lines.push({
        who: '', prompt: 'What will Cello do with the crown?',
        choices: [{ text: 'Shatter the crown. Set the hearts free.', id: 'shatter' }, { text: 'Take the crown.', id: 'take' }],
        onChoose: (id) => this.choose5(id),
      });
      story.dialog.start(lines, { onEnd: () => this.startEnding() });
    });
  }

  choose5(id) {
    const s = this.s, P = this.player;
    const K = (t) => ({ who: 'Kronos', voice: 'kronos', text: t });
    if (id === 'take') {
      s.choice5 = 'taken';
      s.karma = (s.karma || 0) - 2;
      this.sfx.play('bigroar', { vol: 0.8 });
      this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 2), 50, 0xb070ff);
      return [
        { who: '', text: 'Cello lifts the crown of ice, and sets it on his head. It is cold. Then it is not cold at all.' },
        K('Hah... ha ha. Yes. You see now. We are not so different, you and I.'),
        { who: '', text: 'The hearts in the crown fall quiet, and wait for his command. Far below, the storm bows its head.' },
      ];
    }
    s.choice5 = 'shattered';
    s.karma = (s.karma || 0) + 1;
    this.sfx.play('crystal', { vol: 1.4 });
    this.sfx.play('fanfare');
    this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1), 80, 0xff8a9a);
    this.rig.shake(0.6);
    return [
      { who: '', text: 'Cello lifts his sword, and brings it down on the crown with all his strength.' },
      { who: '', text: 'It breaks into a thousand pieces, and every piece is a heart. They rise around him like sparks from a fire, hundreds and hundreds of them, and fly away in every direction. Home.' },
      K('...So. You chose the small life. ...Good. Perhaps that is how the titans should have chosen too.'),
      { who: '', text: 'Kronos closes his eyes. The body of storm and sea and ice comes apart, gently, like snow melting, and is gone.' },
    ];
  }

  // Sidorna om vad som hände sedan. De beror på valen: Maren, Typhon, Ketos, Loke och kronan.
  endingPages() {
    const s = this.s, pages = [];
    const good = (s.karma || 0) >= 1;
    if (s.choice5 === 'taken') {
      pages.push(['Cello wore the crown of the titans, and the storm obeyed him.', 'The hearts went home, because he told them to. Every burned village was whole again before the morning.']);
      pages.push(['People said the new king on the mountain was kind. They said it quietly.', 'Nobody in the Shattered Realm ever saw the boy from the forest again. Only a king with purple fire in his eyes, waiting on his throne. Patient. Like a titan.']);
    } else {
      pages.push(['The hearts flew home over the sea, over the ice and the sand, like sparks rising from a fire.', 'In Hollowbrook, a bell rang that had been silent for a year. Old Wilhelm was ringing it, and crying, and laughing.']);
      pages.push(s.choice1 === 'saved'
        ? ['Maren ran the whole way from Aetheria.', 'Her mother was standing on the bridge, waiting for her.']
        : ['Ida came home to Hollowbrook, to a quiet house.', 'Cello went to see her every Sunday, and she always set a place for him at the table.']);
      if (good) pages.push(['The titans never came back. The storm went quiet, and the broken islands of the realm drifted a little closer together.', 'They rebuilt Hollowbrook. Cello helped carry the stones. He was very good at carrying things.']);
      else pages.push(['The titans never came back. But people in the villages spoke of Cello in low voices: the boy who fought the titans, and won, and was not always gentle about it.', 'They were grateful. They were a little afraid. Both things can be true.']);
    }
    const tail = [];
    if (s.choice2 === 'spared') tail.push('Over the Galecrown, the wind blew soft and warm. Typhon kept his promise.');
    else if (s.choice2 === 'slain') tail.push('Over the Galecrown, the wind was quiet. Some days, too quiet.');
    if (s.choice3 === 'freed') tail.push('The fishers of Brinehollow swore that a great beast swam beside their boats, keeping them safe.');
    if (tail.length) pages.push(tail);
    if (s.choice4 === 'trusted') pages.push(['And on the summit of Othrys, a golden mask with green horns lay on the stone, grinning at nothing.', 'It was empty. For now.']);
    pages.push([s.choice5 === 'taken' ? '...Or so the story goes. Some say the king still visits a little house at the edge of the forest, when nobody is looking, to feed two goats.' : 'And Cello went home, to a little house at the edge of the forest, and slept for two whole days.']);
    pages.push(['Cello: Ashes of the Fallen']);
    return pages;
  }

  startEnding() {
    const story = this.story, s = this.s;
    s.ending = s.choice5 === 'taken' ? 'crowned' : (s.karma || 0) >= 1 ? 'dawn' : 'ashes';
    s.hint = 'end';
    story.save(true);
    story.cinematic = true;
    this.music.paused = false;
    story.holdMusic('hymn', 9999);
    story.startFade(2.4, '', () => {
      story.crawl.start(() => {
        this.credits.start(() => this.afterCredits());
      }, this.endingPages());
    });
  }

  // Efter eftertexterna vaknar Cello hemma i sin säng (som i början)
  afterCredits() {
    const story = this.story, s = this.s, P = this.player;
    story.holdMusic(null);
    this.weather.calmOthrys = true;
    s.clock = 9;
    s.day = (s.day || 1) + 2;
    story.clock?.load(s);
    story.enterArea('house', 'bed', { walk: false });
    const bed = this.world.interiors?.house?.bed;
    if (bed) {
      P.teleport(V3(bed.x, bed.y, bed.z + 0.85));
      P.facing = 0;
      P.setState('sleep');
      this.rig.cinematic = { pos: V3(bed.x + 1.5, 1.8, bed.z + 1.6), look: V3(bed.x, 0.7, bed.z - 0.1), speed: 0.7 };
    }
    P.setPath(s.choice5 === 'taken' ? 'vengeful' : s.choice1 === 'fought' ? 'vengeful' : 'heroic');
    this.applyState();
    story.after(3.0, () => {
      this.sfx.play('goat');
      this.hud.caption(s.choice5 === 'taken' ? 'Morning, at the edge of the forest. The goats do not care who is king.' : 'Morning, at the edge of the forest. Somewhere outside, a goat is complaining.', 4200);
    });
    story.after(5.4, () => {
      P.setState('move');
      if (bed) P.teleport(V3(bed.x + 1.35, 0, bed.z + 0.7));
      P.facing = Math.PI * 0.85;
      this.rig.cinematic = null;
      this.rig.snap(P);
      story.cinematic = false;
      this.hud.card('The End', 'Thank you for playing', 5000);
      story.after(5.4, () => this.hud.toast('The realm is yours to wander. Visit your friends; they have a lot to say.', 5200));
      story.save(true);
    });
  }

  // ---------------------------------------------------------------- tillstånd
  applyState() {
    const s = this.s;
    OthrysStory.fresh(s);
    for (const e of this.oa.embers ?? []) {
      const open = s.embers.includes(e.id);
      e.cage.visible = !open;
      e.heart.visible = !open;
      e.halo.visible = !open;
      e.heart.position.set(0, 1.6, 0);
      e.halo.position.set(0, 1.6, 0);
      e.flyT = -1;
      e.light.on = !open;
    }
    this.weather.calmOthrys = !!s.ending;
    // Ida är hemma i Aetheria efter slutet
    const ida = this.folk.npcs.ida;
    if (ida) ida.setVisible(!!s.ending);
    this.follow = { said: {} };
    this.lastArea = null;
    if (this.areas.id === 'othrys' || this.folk.npcs.seren?.area === 'othrys') this.placeSeren();
  }

  // ---------------------------------------------------------------- varje bildruta
  update(dt) {
    this.credits.update(dt);
    const s = this.s, story = this.story;
    if (!s || story.phase !== 'free') return;
    const here = this.areas.id;
    if (here !== this.lastArea) {
      this.lastArea = here;
      const n = this.folk.npcs.seren;
      if (n && s.mawDone && here === 'othrys' && n.area !== 'othrys') this.placeSeren();
    }
    if (here === 'othrys') {
      this.updateFollow();
      if (!s.talked.othrysArrive && !story.cinematic && !story.fade) {
        s.talked.othrysArrive = true;
        story.after(2.2, () => {
          this.hud.caption('Mount Othrys. Where the titans were crowned, before the gods.', 4200);
          story.after(4.6, () => {
            const n = this.folk.npcs.seren;
            if (n && n.area === 'othrys') this.hud.toast('Seren: "Look, Cello. A fire, by the foot of the mountain. Someone is down there."', 4600);
          });
        });
      }
    }
    if (here === 'ogate' && !s.talked.crownVoice && !story.cinematic && !story.fade) this.firstCrown();
  }
}

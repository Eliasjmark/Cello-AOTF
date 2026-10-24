// Dialogträd med humör (0.11), efter Elias anteckningar i planen:
//
//   · Frågor går att ställa i valfri ordning. En fråga som redan är ställd blir grå,
//     men går att ställa igen (har_frågat = true sparas per person och fråga).
//   · Ett av svaren är dumt. Då blir personen arg (eller ledsen, om det är ett barn),
//     säger sin sura replik och stänger samtalet. Efter det vill hen inte prata alls,
//     bara fnyser och vänder ryggen till, tills en ny dag har börjat.
//   · Huvuduppdragen påverkas aldrig: det som måste sägas för att komma vidare sägs ändå,
//     med en sur kommentar först (grudge).
import * as THREE from 'three';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Små ikoner över huvudet: en ilsken ådra eller en tår
function moodSprite(kind) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#120a08';
  if (kind === 'angry') {
    // Fyra böjda streck i kors, som i tecknade serier
    const arm = (x, y, w, h) => { g.fillRect(x - 1, y - 1, w + 2, h + 2); };
    arm(6, 6, 8, 4); arm(18, 6, 8, 4); arm(6, 22, 8, 4); arm(18, 22, 8, 4);
    arm(6, 6, 4, 8); arm(22, 6, 4, 8); arm(6, 18, 4, 8); arm(22, 18, 4, 8);
    g.fillStyle = '#ff3a2a';
    g.fillRect(6, 6, 8, 4); g.fillRect(18, 6, 8, 4); g.fillRect(6, 22, 8, 4); g.fillRect(18, 22, 8, 4);
    g.fillRect(6, 6, 4, 8); g.fillRect(22, 6, 4, 8); g.fillRect(6, 18, 4, 8); g.fillRect(22, 18, 4, 8);
  } else {
    // En blå tår
    g.fillRect(13, 3, 6, 4); g.fillRect(11, 7, 10, 6); g.fillRect(8, 13, 16, 14); g.fillRect(11, 27, 10, 3);
    g.fillStyle = '#5aa8ff';
    g.fillRect(14, 4, 4, 4); g.fillRect(12, 8, 8, 6); g.fillRect(9, 14, 14, 12); g.fillRect(12, 26, 8, 2);
    g.fillStyle = '#d8ecff';
    g.fillRect(12, 15, 3, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, fog: false }));
  s.scale.set(0.42, 0.42, 1);
  s.renderOrder = 10;
  return s;
}

export class Chats {
  constructor({ story, sfx, hud }) {
    Object.assign(this, { story, sfx, hud });
    this.icons = new Map(); // npc-id → sprite
    this.turnT = new Map(); // npc-id → sekunder som hen står med ryggen mot Cello
    this.t = 0;
  }

  get s() {
    return this.story.state;
  }

  load(s) {
    if (!s.mood || typeof s.mood !== 'object') s.mood = {};
    if (!s.asked || typeof s.asked !== 'object') s.asked = {};
  }

  get day() {
    return this.story.clock?.day ?? 1;
  }

  // Humöret just nu: 'angry', 'sad' eller null. En ny dag gör att hen har förlåtit.
  mood(id) {
    const m = this.s.mood?.[id];
    if (!m) return null;
    if (this.day > m.day) return null;
    return m.kind;
  }

  // Hade hen ett humör som nu har gått över? (då säger hen något om det)
  forgave(id) {
    const m = this.s.mood?.[id];
    if (!m || this.day <= m.day) return false;
    delete this.s.mood[id];
    return true;
  }

  upset(n, kind) {
    this.s.mood[n.id] = { kind, day: this.day };
  }

  // Personen vill inte prata: ett surt ljud, en kort rad längst ner, och ryggen till
  sulk(n) {
    const kind = this.mood(n.id);
    this.sfx.play(kind === 'sad' ? 'sniff' : 'huff');
    this.hud.toast(kind === 'sad' ? `${n.name} sniffles and won't look at Cello.` : `${n.name} turns away with a huff.`, 2600);
    this.turnT.set(n.id, 3.5);
  }

  // En sur rad före något som måste sägas ändå (huvuduppdrag, nycklar, vägvisning)
  grudge(n, line = null) {
    const kind = this.mood(n.id);
    if (!kind) return [];
    const text = line ?? (kind === 'sad' ? "*sniff* ...I'm still sad. But you need to hear this." : "Hmph. I'm still cross with you. But this matters, so listen.");
    return [this.story.line(n, text)];
  }

  asked(id, topic) {
    return !!this.s.asked?.[id]?.includes(topic);
  }

  markAsked(id, topic) {
    const a = (this.s.asked[id] ??= []);
    if (!a.includes(topic)) a.push(topic);
  }

  // Ett samtal med frågor:
  //   def.greet   repliker först (strängar)
  //   def.topics  [{ id, q, a: [repliker], when?() }]
  //   def.rude    { q, a: [repliker], mood: 'angry' | 'sad' }
  //   def.bye     sista repliken när Cello säger hej då
  //   def.forgive repliken när hen har förlåtit (nästa dag)
  //   def.prompt  texten ovanför valen
  chat(n, def, onEnd) {
    if (this.mood(n.id)) {
      this.sulk(n);
      return false;
    }
    const L = (t) => this.story.line(n, t);
    const steps = [];
    if (this.forgave(n.id)) steps.push(L(def.forgive ?? "...About yesterday. Let's forget it, shall we?"));
    for (const g of def.greet ?? []) steps.push(L(g));
    const topics = () => (def.topics ?? []).filter((tp) => !tp.when || tp.when());
    const menu = (first = false) => ({
      who: n.name,
      prompt: first ? (def.prompt ?? steps.at(-1)?.text ?? '') : (def.again ?? 'Anything else?'),
      choices: [
        ...topics().map((tp) => ({ text: tp.q, id: tp.id, dim: this.asked(n.id, tp.id) })),
        ...(def.rude ? [{ text: def.rude.q, id: '__rude' }] : []),
        { text: def.byeLabel ?? 'Goodbye', id: '__bye' },
      ],
      onChoose: (id) => {
        if (id === '__bye') return def.bye ? [L(def.bye)] : [];
        if (id === '__rude') {
          const r = def.rude;
          return [...r.a.map(L), { run: () => this.storm(n, r.mood ?? 'angry') }];
        }
        const tp = topics().find((x) => x.id === id);
        if (!tp) return [];
        this.markAsked(n.id, id);
        const a = typeof tp.a === 'function' ? tp.a() : tp.a;
        const lines = a.map((x) => (typeof x === 'string' ? L(x) : x));
        // then: samtalet tar slut efter svaret och något händer (till exempel en lektion)
        if (tp.then) { this.pendingThen = tp.then; return lines; }
        return [...lines, menu()];
      },
    });
    // Utan hälsningsfras visas valen direkt med en kort fråga
    if (!steps.length) steps.push(L(def.open ?? 'Yes?'));
    steps.push(menu(true));
    this.story.talk(n, steps, () => {
      const p = this.pendingThen;
      this.pendingThen = null;
      onEnd?.();
      p?.();
    });
    return true;
  }

  // Det dumma svaret: personen blir arg eller ledsen och samtalet tar slut direkt
  storm(n, kind) {
    this.upset(n, kind);
    this.sfx.play(kind === 'sad' ? 'sniff' : 'huff');
    this.turnT.set(n.id, 4);
    this.story.dialog.steps = this.story.dialog.steps?.slice(0, this.story.dialog.i + 1) ?? null;
    this.hud.toast(kind === 'sad' ? `${n.name} is sad now. Maybe tomorrow will be better.` : `${n.name} is angry with Cello. Maybe it will pass by tomorrow.`, 3400);
  }

  // Ikonerna över huvudet och ryggen till när Cello kommer nära
  update(dt, npcs, player, here) {
    this.t += dt;
    for (const n of npcs) {
      const kind = n.area === here && n.visible ? this.mood(n.id) : null;
      let ico = this.icons.get(n.id);
      if (kind && (!ico || ico.userData.kind !== kind)) {
        if (ico) ico.removeFromParent();
        ico = moodSprite(kind);
        ico.userData.kind = kind;
        this.icons.set(n.id, ico);
      }
      if (ico) {
        if (!kind) { ico.visible = false; continue; }
        if (ico.parent !== n.model.root.parent) n.model.root.parent?.add(ico);
        ico.visible = true;
        const h = n.chest.y - n.pos.y + 1.05;
        ico.position.set(n.pos.x, n.pos.y + h + Math.sin(this.t * 4) * 0.04, n.pos.z);
        const k = kind === 'angry' ? 1 + Math.max(0, Math.sin(this.t * 7)) * 0.18 : 1;
        ico.scale.set(0.42 * k, 0.42 * k, 1);
      }
      // Arg eller ledsen: vänder ryggen till när Cello kommer nära
      let tt = this.turnT.get(n.id) ?? 0;
      if (tt > 0) this.turnT.set(n.id, (tt -= dt));
      if (n.area === here && n.visible && !n.talking && (tt > 0 || (kind && n.pos.distanceTo(player.feet) < 3.2))) {
        const away = Math.atan2(n.pos.x - player.feet.x, n.pos.z - player.feet.z);
        n.facing += wrap(away - n.facing) * (1 - Math.exp(-dt * 6));
      }
    }
  }
}

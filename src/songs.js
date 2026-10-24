// Instrumentet (0.11): Pilgrim's Flute. Spelaren spelar själv tonerna, som med flöjten i klassiska äventyrsspel,
// och lär sig sånger av folk i världen:
//
//   Waking Chant  (Odo, pilgrimen på Long Bridge)   öppnar stenarna med en sjungande fågel på
//   Grumble's Call   (Tilly på ranchen)                 Grumble kommer springande
//   Sunturn Hymn  (Nefret vid oasen)                 natten blir dag och dagen blir natt
//   Lament of Rain     (Ysolde i Willowmere)              regn och åska kommer, eller drar bort
//
// Tonerna: ↑ ← → ↓ och mellanslag (en låg ton), eller handkontrollens pilar och A.
import * as THREE from 'three';

export const NOTES = ['low', 'down', 'right', 'left', 'up'];
const FREQ = { low: 293.66, down: 349.23, right: 440, left: 523.25, up: 587.33 };
export const GLYPH = { up: '▲', down: '▼', left: '◀', right: '▶', low: '●' };
const NOTE_COLOR = { up: '#ffd27a', down: '#8fe4ff', left: '#c9a8ff', right: '#9af0a0', low: '#ff9a7a' };

export const SONGS = {
  opening: { name: 'Waking Chant', notes: ['up', 'up', 'left', 'low', 'right', 'up'], desc: 'Old standing stones carved with a singing bird sink into the earth when they hear it.', teacher: 'Odo' },
  ram: { name: "Grumble's Call", notes: ['right', 'low', 'right', 'down', 'down', 'low'], desc: 'Grumble comes running, wherever he is. Outdoors only.', teacher: 'Tilly' },
  sun: { name: 'Sunturn Hymn', notes: ['up', 'right', 'down', 'left', 'up', 'up'], desc: 'Play it under open sky: night turns to day, and day to night.', teacher: 'Nefret' },
  storm: { name: 'Lament of Rain', notes: ['down', 'low', 'left', 'down', 'low', 'up'], desc: 'Play it under open sky to call rain and thunder, or to send them away.', teacher: 'Ysolde' },
};
const ORDER = ['opening', 'ram', 'sun', 'storm'];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Songs {
  constructor(ctx) {
    Object.assign(this, ctx); // story, player, hud, sfx, clock, weather, world, areas, fx, lights, music, rig
    this.active = false;
    this.played = [];
    this.lesson = null;
    this.perform = null;
    this.t = 0;
    this.buildDom();
    this.buildFlute();
    this.buildStones();
  }

  get s() { return this.story.state; }
  knows(id) { return !!this.s.songs?.includes(id); }

  // ---------- flöjten i Cellos händer ----------
  buildFlute() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0xb8925a, flatShading: true });
    const dark = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.5, 6), wood);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    for (let i = 0; i < 4; i++) {
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.03), dark);
      hole.position.set(-0.05 + i * 0.07, 0.03, 0);
      g.add(hole);
    }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 6), new THREE.MeshLambertMaterial({ color: 0x8c2a27 }));
    band.rotation.z = Math.PI / 2;
    band.position.x = -0.2;
    g.add(band);
    g.position.set(0.16, -0.06, 0.24);
    g.rotation.y = 0.25;
    g.visible = false;
    this.player.model.head.add(g);
    this.flute = g;
  }

  // ---------- sångstenarna ----------
  buildStones() {
    this.stones = [];
    const col = this.areas.collider;
    for (const def of this.world.songStones ?? []) {
      const a = this.areas.get(def.area);
      const g = new THREE.Group();
      g.position.copy(def.pos);
      g.rotation.y = def.face;
      a.root.add(g);
      const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3c3e48, flatShading: true });
      const glyphMat = new THREE.MeshBasicMaterial({ color: 0x5aa8c8 });
      const slab = new THREE.Group();
      g.add(slab);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.55, 1, 3, 1), stoneMat);
      {
        // Lite ojämn, som huggen sten
        const p = body.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i);
          if (y > 1) p.setX(i, p.getX(i) * 0.82);
        }
        body.geometry.computeVertexNormals();
      }
      body.position.y = 1.25;
      slab.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.6), stoneMat);
      cap.position.y = 2.55;
      slab.add(cap);
      // Den sjungande fågeln, inristad och glödande
      const px = [[0, 4], [1, 4], [2, 3], [3, 3], [4, 3], [5, 4], [2, 2], [3, 2], [4, 2], [3, 1], [4, 1], [1, 5], [0, 6], [5, 2], [6, 1], [6, 2]];
      const notes = [[7, 6], [8, 5], [8, 6], [9, 7], [9, 8]];
      for (const [x, y] of [...px, ...notes]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.02), glyphMat);
        b.position.set(-0.36 + x * 0.075, 1.0 + y * 0.075, 0.285);
        slab.add(b);
      }
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.18, 8), new THREE.MeshLambertMaterial({ color: 0x55545a, flatShading: true })));
      let box = null;
      if (col) {
        col.building = def.area;
        const w = 0.75;
        box = col.addBox(def.pos.x - w, def.pos.y, def.pos.z - w, def.pos.x + w, def.pos.y + 2.6, def.pos.z + w, `stone:${def.id}`);
        col.building = null;
      }
      const st = { ...def, g, slab, glyphMat, box, sink: 0 };
      this.stones.push(st);
      this.story.interactions.push({
        label: 'Examine the stone', area: def.area, pos: () => def.pos, radius: 2.2,
        ok: () => this.story.phase === 'free' && !this.s.songStones?.[def.id],
        run: () => this.story.read(this.knows('opening')
          ? ['A standing stone carved with a singing bird. The carving hums faintly.', 'Odo said these stones answer the Waking Chant.']
          : this.s.flute
            ? ['A standing stone carved with a singing bird.', 'It feels like it is waiting for a song you do not know yet.']
            : ['A standing stone carved with a singing bird.', 'Tiny notes are carved around the bird, as if it were singing. Strange.']),
      });
      a.updaters.push((t, dt) => this.updateStone(st, t, dt));
    }
  }

  // Stenarna som redan har öppnats är borta (laddning)
  load() {
    for (const st of this.stones) {
      const open = !!this.s.songStones?.[st.id];
      st.sink = open ? 1 : 0;
      st.opening = false;
      this.placeStone(st);
    }
  }

  placeStone(st) {
    st.slab.position.y = -2.7 * st.sink;
    st.slab.visible = st.sink < 0.999;
    if (st.box) st.box.enabled = st.sink < 0.5;
  }

  updateStone(st, t, dt) {
    if (st.opening) {
      st.sink = Math.min(1, st.sink + dt / 2.2);
      st.slab.position.x = Math.sin(t * 60) * 0.03 * (1 - st.sink);
      if (Math.random() < dt * 14) this.fx.burst('debris', st.pos.clone().setY(st.pos.y + 0.3), 3, 0x6a6458);
      if (st.sink >= 1) {
        st.opening = false;
        st.slab.position.x = 0;
        this.fx.burst('spark', st.pos.clone().setY(st.pos.y + 0.8), 18, 0x8fe4ff);
      }
      this.placeStone(st);
    }
    // Fågeln glöder starkare när Cello är nära och spelar
    const near = this.story.player.feet.distanceTo(st.pos) < 9;
    const k = this.active && near ? 0.75 + Math.sin(t * 8) * 0.25 : 0.35 + Math.sin(t * 1.6) * 0.1;
    st.glyphMat.color.setRGB(0.25 + 0.4 * k, 0.55 + 0.4 * k, 0.75 + 0.25 * k);
  }

  openStone(st) {
    this.s.songStones = { ...(this.s.songStones || {}), [st.id]: true };
    st.opening = true;
    this.sfx.play('stonegrind', { vol: 1.2 });
    this.sfx.play('portal', { vol: 0.8 });
    this.rig.shake(0.3);
    this.lights.flash(st.pos.clone().setY(st.pos.y + 1.5), 0x8fe4ff, 30, 10, 1.2);
    this.story.after(2.4, () => {
      this.sfx.play('secret');
      this.hud.toast('The stone sank into the earth. Something was hidden beneath it!', 3600);
      this.story.save(true);
    });
  }

  // ---------- spelläget ----------
  buildDom() {
    const hud = document.querySelector('.hud');
    const el = document.createElement('div');
    el.className = 'songs';
    el.id = 'songs';
    el.hidden = true;
    el.innerHTML = `
      <p class="songs-title" id="songs-title">Pilgrim's Flute</p>
      <div class="songs-staff" id="songs-staff" aria-label="Notes played"><div class="songs-ghost" id="songs-ghost"></div><div class="songs-notes" id="songs-notes"></div></div>
      <p class="songs-hint"><span class="desk"><kbd>↑</kbd><kbd>←</kbd><kbd>→</kbd><kbd>↓</kbd><kbd>Space</kbd> play · <kbd>Esc</kbd> stop</span></p>
      <div class="songs-pad touchonly">${NOTES.slice().reverse().map((k) => `<button type="button" data-note="${k}" style="color:${NOTE_COLOR[k]}">${GLYPH[k]}</button>`).join('')}<button type="button" data-note="stop">Stop</button></div>
      <ul class="songs-list" id="songs-list"></ul>`;
    hud.appendChild(el);
    const $ = (id) => document.getElementById(id);
    this.el = { root: el, title: $('songs-title'), notes: $('songs-notes'), ghost: $('songs-ghost'), list: $('songs-list') };
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-note]');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.note === 'stop') this.stop();
      else this.press(b.dataset.note);
    });
  }

  // En not på notraderna: höjden visar tonen
  noteHtml(k, i, cls = '') {
    const row = NOTES.indexOf(k);
    return `<span class="note ${cls}" style="left:${14 + i * 34}px;bottom:${6 + row * 15}px;color:${NOTE_COLOR[k]}">${GLYPH[k]}</span>`;
  }

  render() {
    const shown = this.played.slice(-8);
    this.el.notes.innerHTML = shown.map((k, i) => this.noteHtml(k, i)).join('');
    const L = this.lesson;
    if (L) {
      const tgt = SONGS[L.id].notes;
      this.el.ghost.innerHTML = tgt.map((k, i) => this.noteHtml(k, i, L.phase === 'demo' ? (i < L.demoI ? 'demo' : 'ghost hide') : i < L.i ? 'ok' : 'ghost')).join('');
      this.el.notes.hidden = true;
    } else {
      this.el.ghost.innerHTML = '';
      this.el.notes.hidden = false;
    }
    const list = ORDER.filter((id) => this.knows(id));
    this.el.list.innerHTML = list.length && !L
      ? list.map((id) => `<li><b>${SONGS[id].name}</b><span>${SONGS[id].notes.map((k) => `<i style="color:${NOTE_COLOR[k]}">${GLYPH[k]}</i>`).join('')}</span></li>`).join('')
      : '';
  }

  // Börja spela. lesson: { id, teacher, onLearn } när någon lär ut en sång
  start(lesson = null) {
    const P = this.player;
    if (this.active || P.state !== 'move' || !P.grounded || P.carried || P.mount) return false;
    this.active = true;
    this.played = [];
    this.perform = null;
    this.lesson = lesson ? { ...lesson, phase: 'demo', demoI: 0, i: 0, t: -0.6 } : null;
    this.cooldown = 0.15;
    P.playing = true;
    P.vel.set(0, P.vel.y, 0);
    this.story.combat.unlock(true);
    this.flute.visible = true;
    this.el.root.hidden = false;
    this.el.title.textContent = lesson ? `${lesson.teacher.name} plays ${SONGS[lesson.id].name}...` : "Pilgrim's Flute";
    this.render();
    return true;
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.lesson = null;
    this.perform = null;
    this.player.playing = false;
    this.flute.visible = false;
    this.el.root.hidden = true;
  }

  press(k) {
    if (!this.active || this.perform || (this.lesson && this.lesson.phase === 'demo')) return;
    this.playNote(k);
    this.played.push(k);
    if (this.played.length > 16) this.played.shift();
    if (this.lesson) this.checkLesson(k);
    else this.check();
    this.render();
  }

  playNote(k, vol = 1) {
    this.sfx.play('note', { f: FREQ[k], vol });
    this.player.noteT = 0.25;
  }

  // Har Cello just spelat en sång han kan?
  check() {
    for (const id of ORDER) {
      if (!this.knows(id)) continue;
      const n = SONGS[id].notes;
      if (this.played.length < n.length) continue;
      const tail = this.played.slice(-n.length);
      if (tail.every((k, i) => k === n[i])) {
        this.perform = { id, t: -0.35, i: 0 };
        this.el.title.textContent = SONGS[id].name;
        this.sfx.play('songok');
        return;
      }
    }
  }

  checkLesson(k) {
    const L = this.lesson, tgt = SONGS[L.id].notes;
    if (k === tgt[L.i]) {
      L.i++;
      if (L.i >= tgt.length) {
        this.sfx.play('songok');
        this.perform = { id: L.id, t: -0.35, i: 0, learn: true };
      }
    } else {
      L.i = 0;
      this.played = [];
      this.sfx.play('songbad');
      this.el.title.textContent = 'Not quite... try again from the beginning.';
    }
  }

  update(dt, inp) {
    if (!this.active) return;
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const L = this.lesson;
    // Läraren spelar först
    if (L && L.phase === 'demo') {
      L.t += dt;
      if (L.t >= 0.5) {
        L.t = 0;
        const tgt = SONGS[L.id].notes;
        if (L.demoI < tgt.length) {
          this.playNote(tgt[L.demoI], 0.8);
          L.demoI++;
          this.render();
        } else {
          L.phase = 'play';
          this.el.title.textContent = `Your turn: play ${SONGS[L.id].name}!`;
          this.render();
        }
      }
      if (inp.cancel) this.stop();
      return;
    }
    // En sång som just spelades: melodin hörs en gång till, och sedan händer något
    if (this.perform) {
      const pf = this.perform, n = SONGS[pf.id].notes;
      pf.t += dt;
      if (pf.t >= 0.28 && pf.i < n.length) {
        pf.t = 0;
        this.playNote(n[pf.i], 0.9);
        this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.6), 3, 0xfff0b0);
        pf.i++;
      } else if (pf.i >= n.length && pf.t > 0.7) {
        const id = pf.id, learn = pf.learn, lesson = this.lesson;
        this.stop();
        if (learn) this.learn(id, lesson);
        else this.effect(id);
      }
      return;
    }
    if (inp.cancel || inp.bag || inp.attack || inp.dodge || inp.item1 || inp.item2 || inp.item3) {
      if (this.cooldown <= 0) { this.stop(); return; }
    }
    if (inp.up) this.press('up');
    if (inp.down) this.press('down');
    if (inp.left) this.press('left');
    if (inp.right) this.press('right');
    if (inp.jump || inp.interact) this.press('low');
  }

  learn(id, lesson) {
    if (!this.knows(id)) this.s.songs = [...(this.s.songs || []), id];
    this.sfx.play('fanfare');
    this.music?.duckFor(2.4, 0.12);
    this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.8), 20, 0xfff0b0);
    this.hud.toast(`You learned the ${SONGS[id].name}! ${SONGS[id].desc}`, 5200);
    this.story.save(true);
    this.story.inventory?.refresh(true);
    lesson?.onLearn?.();
  }

  // ---------- vad sångerna gör ----------
  outdoors() {
    const a = this.areas.cur;
    return !!a && !a.indoor && !this.world.dungeonAt(a.id);
  }

  effect(id) {
    const P = this.player, here = this.areas.id;
    if (id === 'opening') {
      const st = this.stones.find((x) => x.area === here && !this.s.songStones?.[x.id] && x.pos.distanceTo(P.feet) < 8);
      if (st) this.openStone(st);
      else this.hud.toast('The melody echoes... but nothing here answers it.', 3000);
    } else if (id === 'ram') {
      if (!this.story.goat?.owned) { this.hud.toast('Somewhere far away, a goat bleats. But no goat answers to Cello... yet.', 3600); return; }
      this.story.goat.call();
    } else if (id === 'sun') {
      if (!this.outdoors()) { this.hud.toast('The sun cannot hear the hymn in here.', 3000); return; }
      const c = this.clock, toDay = c.isNight || c.hour >= 17;
      this.hud.toast(toDay ? 'The hymn rises... and the sun answers.' : 'The hymn fades... and the sun sinks to rest.', 3600);
      this.sfx.play('sunchime');
      c.skipTo(toDay ? 7 : 20, 4);
    } else if (id === 'storm') {
      if (!this.outdoors()) { this.hud.toast('No storm can hear the lament in here.', 3000); return; }
      const w = this.weather, now = this.clock.day * 24 + this.clock.hour;
      if (w.region === 'desert') {
        this.hud.toast('The lament drifts over the dunes. The sky over the Wastes stays dry.', 3600);
        return;
      }
      if (w.kind === 'rain' || w.kind === 'storm') {
        w.set('calm', now, 3, true);
        this.hud.toast('The lament fades... and the clouds begin to part.', 3600);
      } else {
        w.set('storm', now, 2.5, true);
        this.sfx.play('thunder', { vol: 0.9 });
        this.hud.toast('Thunder answers the lament!', 3600);
      }
    }
  }

  // En lektion: läraren spelar, Cello spelar efter. onLearn körs när han kan sången.
  teach(id, teacher, onLearn) {
    if (!this.start({ id, teacher, onLearn })) {
      this.story.after(0.3, () => this.teach(id, teacher, onLearn));
    }
  }
}

// Var sångstenarna står (byggs med världen, så att kistorna under dem kan registreras i tid).
// heights: områdenas markhöjd, { pass, field, desert } → (x, z) => y
export function defineSongStones(heights, chests) {
  const defs = [
    // Vilplatsen mitt på Long Bridge, där Odo sitter
    { id: 'passStone', area: 'pass', x: 2000 - 2.2, z: -153, face: Math.PI / 2, y: 0.1, chest: { shards: 30 } },
    // Vid den fallna gudastatyn på Stormvale
    { id: 'fieldStone', area: 'field', x: 3000 + 80, z: 126, face: -Math.PI / 2, chest: { shards: 100 }, big: true },
    // Mitt i pelarsalen i öknen (på stenplattan)
    { id: 'desertStone', area: 'desert', x: 8000 + 60, z: 64, face: 0, lift: 0.17, chest: { shards: 100 }, big: true },
  ];
  const out = [];
  for (const d of defs) {
    const H = heights[d.area];
    if (!H && d.y === undefined) continue;
    const y = d.y ?? H(d.x, d.z) + (d.lift ?? 0);
    const pos = new THREE.Vector3(d.x, y, d.z);
    out.push({ id: d.id, area: d.area, pos, face: d.face });
    chests.push({ id: `song:${d.id}`, area: d.area, x: d.x, y: y + 0.12, z: d.z, ry: d.face, contents: d.chest, big: !!d.big, hidden: false, reveal: null, song: d.id });
  }
  return out;
}

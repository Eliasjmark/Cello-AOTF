// Byggdelar för The Drowned Temple (0.15): bassänger med vattennivåer, tidvattenhjul (vrids med fast mark under
// fötterna), tidvattenaltaren (treudden), bronssigill som inte går att vrida under vatten, bubbelkällor att andas
// vid, spröda koraller som treudden slår sönder, sjöborrar som sticks och galler som tryckplattor öppnar en stund.
// Här finns också minibossen Karkinos (jättekrabban) och bossen Ketos (havsodjuret).
import * as THREE from 'three';
import { Wing } from './dkit.js';
import { box, cyl, place } from './geom.js';
import { waterSurface, caustics, animateCaustics } from './water.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

let TM = null;
export function templeMats() {
  if (TM) return TM;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  // Grönaktig marmor med alger i fogarna
  g.fillStyle = '#9ab0a8';
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${60 + Math.random() * 40},${90 + Math.random() * 40},${80 + Math.random() * 30},${0.12 + Math.random() * 0.15})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 5, 1 + Math.random() * 3);
  }
  g.fillStyle = 'rgba(40,70,60,0.5)';
  g.fillRect(0, 0, 64, 2); g.fillRect(0, 32, 64, 2); g.fillRect(0, 0, 2, 32); g.fillRect(32, 32, 2, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  TM = {
    stone: lam({ map: t }),
    stoneDark: lam({ map: t, color: 0x6a8078 }),
    floor: lam({ map: t, color: 0xb8c8c0 }),
    bronze: lam({ color: 0x4a8a7a, flatShading: true }),
    gold: lam({ color: 0xc9a24f, emissive: 0x2a1c06, flatShading: true }),
    coral: lam({ color: 0xd87a8a, flatShading: true }),
    coralB: lam({ color: 0xe0a060, flatShading: true }),
    shell: lam({ color: 0xa8483a, flatShading: true }),
    shellDark: lam({ color: 0x6a2a24, flatShading: true }),
    urchin: lam({ color: 0x2a1a3a, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ color: 0x7ff0e0 }),
    curse: new THREE.MeshBasicMaterial({ color: 0xb06aff }),
    eye: new THREE.MeshBasicMaterial({ color: 0xffc040 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x050d12 }),
  };
  return TM;
}

export class TideWing extends Wing {
  constructor(B, area, dungeon, opts) {
    super(B, area, dungeon, opts);
    this.pools = [];
    this.wheels = [];
    this.altars = [];
    this.vents = [];
    this.corals = [];
    this.urchins = [];
    this.caus = [];
    this.grates = [];
  }

  // ---------------- vatten ----------------
  // En bassäng (lokala koordinater): ytan står på levels[state.water[group]]
  pool(id, x0, x1, z0, z1, levels, o = {}) {
    const m = waterSurface(x1 - x0, z1 - z0, { color: o.color ?? 0x2f8a92, opacity: o.opacity ?? 0.74, wave: o.wave ?? 0.05, scale: 0.15 });
    this.D.add(m);
    const group = o.group ?? id, start = o.start ?? 0;
    const pool = { id, group, levels, start, level: levels[start], target: levels[start], m, x0: this.X(x0), x1: this.X(x1), z0, z1, bottom: o.bottom ?? -100 };
    m.position.set(this.X((x0 + x1) / 2), pool.level, (z0 + z1) / 2);
    this.pools.push(pool);
    this.area.waters.push({ x0: pool.x0, x1: pool.x1, z0, z1, y: () => (pool.level > pool.bottom + 0.05 ? pool.level : null) });
    if (o.floor !== undefined) this.causticsAt(x0, x1, z0, z1, o.floor);
    return pool;
  }

  causticsAt(x0, x1, z0, z1, y) {
    const c = caustics(x1 - x0, z1 - z0, { opacity: 0.2 });
    c.position.set(this.X((x0 + x1) / 2), y + 0.02, (z0 + z1) / 2);
    this.D.add(c);
    this.caus.push(c);
    return c;
  }

  waterIdx(group) {
    const w = this.state.water ?? (this.state.water = {});
    const p = this.pools.find((q) => q.group === group);
    return w[group] ?? p?.start ?? 0;
  }

  setWater(group, idx, instant = false) {
    const w = this.state.water ?? (this.state.water = {});
    w[group] = idx;
    for (const p of this.pools) {
      if (p.group !== group) continue;
      p.target = p.levels[Math.min(idx, p.levels.length - 1)];
      if (instant) { p.level = p.target; p.m.position.y = p.level; }
    }
  }

  levelAt(group) {
    return this.pools.find((p) => p.group === group)?.level ?? null;
  }

  // ---------------- tidvattenhjulet ----------------
  // Vrids bara när Cello står på fast mark. Växlar mellan bassänggruppens nivåer.
  wheel(id, x, z, face, group, o = {}) {
    const M = templeMats();
    const y = o.y ?? 0;
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = face;
    g.add(place(new THREE.Mesh(box(0.9, 1.3, 0.6, 1), M.stoneDark), 0, 0.65, 0));
    const wheel = new THREE.Group();
    wheel.position.set(0, 1.55, 0.35);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 18), M.bronze));
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), M.bronze);
      sp.rotation.z = (k * Math.PI) / 3;
      wheel.add(sp);
    }
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M.glow));
    g.add(wheel);
    this.D.add(g);
    this.B.hidden(new THREE.BoxGeometry(0.9, 1.3, 0.6), this.X(x), y + 0.65, z, 0, face, 0);
    const wh = { id, group, wheel, spin: 0 };
    this.wheels.push(wh);
    const fx = Math.sin(face), fz = Math.cos(face);
    this.interactions.push({
      label: 'Turn the tide wheel', area: this.id, pos: () => this.V(x + fx * 1.2, y, z + fz * 1.2), radius: 1.6,
      ok: () => true,
      run: () => {
        const G = this.game;
        if (G.player.swimming) { G.story.read(['Cello treads water, but he cannot get a grip.', 'He needs solid ground under his feet to turn the wheel.']); return; }
        const pool = this.pools.find((p) => p.group === group);
        const next = (this.waterIdx(group) + 1) % pool.levels.length;
        this.setWater(group, next);
        wh.spin = 2.5;
        G.sfx.play('stonegrind');
        G.sfx.play('tide');
        G.rig.shake(0.25);
        const rising = pool.levels[next] > pool.level;
        G.hud.toast(o.toast?.(rising) ?? (rising ? 'With a deep groan, the water begins to rise.' : 'Somewhere below, sluices open. The water drains away.'), 3000);
        G.story.save(true);
      },
    });
    return wh;
  }

  // ---------------- tidvattenaltaret (treudden) ----------------
  // o.idx: sätter en bestämd nivå (annars växlar den) · o.onUse(): egen handling (bossen)
  altar(id, x, z, face, group, o = {}) {
    const M = templeMats();
    const y = o.y ?? 0;
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = face;
    g.add(place(new THREE.Mesh(cyl(0.7, 0.9, 1.0, 8, 1), M.stoneDark), 0, 0.5, 0));
    g.add(place(new THREE.Mesh(cyl(0.85, 0.85, 0.18, 8, 1), M.bronze), 0, 1.05, 0));
    const sock = new THREE.MeshBasicMaterial({ color: 0x2a5a58 });
    for (const dx of [-0.22, 0, 0.22]) g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.1), sock), dx, 1.15, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 4, 18).rotateX(Math.PI / 2), sock);
    ring.position.y = 1.16;
    g.add(ring);
    this.D.add(g);
    this.B.hidden(new THREE.CylinderGeometry(0.9, 0.9, 1.1, 8), this.X(x), y + 0.55, z);
    const al = { id, group, g, sock, ring, used: false, glow: 0, x: this.X(x), y, z };
    this.altars.push(al);
    this.interactions.push({
      label: () => (this.game?.player.hasTrident ? 'Plunge the trident' : 'Examine the altar'), area: this.id, pos: () => this.V(x, y, z + 1.4 * Math.cos(face)).add(new THREE.Vector3(1.4 * Math.sin(face), 0, 0)), radius: 1.8,
      ok: () => !al.used && (!o.ok || o.ok()),
      run: () => {
        const G = this.game;
        if (!G.player.hasTrident) { G.story.read(o.text ?? ['A low altar of green bronze. Three narrow slots are cut into its top, in the shape of a trident.', 'The water around it seems to lean toward it, listening.']); return; }
        al.glow = 1.5;
        G.sfx.play('tide');
        G.sfx.play('secret');
        G.fx.burst('spark', new THREE.Vector3(al.x, y + 1.3, z), 26, 0x7ff0e0);
        G.lights?.flash(new THREE.Vector3(al.x, y + 2, z), 0x7ff0e0, 30, 10, 0.4);
        if (o.onUse) { o.onUse(al); return; }
        const pool = this.pools.find((p) => p.group === group);
        const next = o.idx ?? (this.waterIdx(group) + 1) % pool.levels.length;
        const rising = pool.levels[next] > pool.level;
        this.setWater(group, next);
        G.rig.shake(0.3);
        G.hud.toast(o.toast?.(rising) ?? (rising ? 'The trident sings. The sea answers, and the water rises!' : 'The trident sings. The water draws back like a breath.'), 3200);
        G.story.save(true);
      },
    });
    return al;
  }

  // ---------------- bronssigillet ----------------
  // En dörr som bara går att öppna när vattnet vid den står lågt (sigillet låser sig av trycket under vatten)
  hatch(id, x, z, axis, group, o = {}) {
    const y = o.y ?? 0;
    const d = this.door({ id, x, z, y, axis, type: 'cap', neg: o.neg, pos: o.pos });
    const M = templeMats();
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 12).rotateX(Math.PI / 2), M.bronze);
    seal.position.set(0, 1.9, 0);
    d.slab.add(seal);
    d.seal = seal;
    const front = (s) => (axis === 'x' ? this.V(x + s * 1.5, y, z) : this.V(x, y, z + s * 1.5));
    this.interactions.push({
      label: 'Turn the bronze seal', area: this.id, pos: () => {
        const p = this.game.player.feet;
        return front(axis === 'x' ? (p.x > this.X(x) ? 1 : -1) : (p.z > z ? 1 : -1));
      }, radius: 1.9,
      ok: () => !this.state.doors.includes(id),
      run: () => {
        const G = this.game, lv = this.levelAt(group);
        if (G.player.swimming || (lv !== null && lv > y + 1.2)) { G.story.read(['A great bronze seal holds the door shut.', 'Under water, the weight of the sea presses it closed. It will not turn while the room is flooded.']); return; }
        G.sfx.play('keyturn');
        d.spin = 1.5;
        this.openDoor(id);
        G.hud.toast('The seal turns with a hiss of trapped air.', 2400);
        G.story.save(true);
      },
    });
    return d;
  }

  // ---------------- bubbelkällor ----------------
  vent(x, y, z, r = 1.5) {
    const M = templeMats();
    this.deco(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 8), M.stoneDark, x, y + 0.15, z);
    this.deco(new THREE.CircleGeometry(0.4, 8).rotateX(-Math.PI / 2), M.glow, x, y + 0.31, z);
    const v = { x: this.X(x), y, z, r, t: Math.random() };
    this.area.bubbles.push({ x: v.x, y: y + 1.6, z, r });
    this.vents.push(v);
    return v;
  }

  // ---------------- spröd korall ----------------
  coral(id, x0, x1, y0, y1, z0, z1) {
    const M = templeMats();
    const g = new THREE.Group();
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const n = Math.max(6, Math.round(w * h * d * 0.8));
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.45, 0), k % 3 ? M.coral : M.coralB);
      m.position.set(this.X(x0) + Math.random() * w, y0 + Math.random() * h, z0 + Math.random() * d);
      m.scale.y = 0.8 + Math.random() * 0.8;
      g.add(m);
    }
    g.add(place(new THREE.Mesh(box(w * 0.9, h * 0.9, d * 0.9, 1), M.coral), this.X((x0 + x1) / 2), (y0 + y1) / 2, (z0 + z1) / 2));
    this.D.add(g);
    const c = { id, x0: this.X(x0), x1: this.X(x1), y0, y1, z0, z1, g, box: null, broken: false };
    this.corals.push(c);
    this.onConnect.push((col) => { c.box = col.addBox(c.x0, y0, z0, c.x1, y1, z1, `coral-${id}`); });
    this.interactions.push({
      label: 'Examine the coral', area: this.id, pos: () => new THREE.Vector3((c.x0 + c.x1) / 2, y0, (z0 + z1) / 2), radius: Math.max(w, d) / 2 + 1.4,
      ok: () => !c.broken && !this.game?.player.hasTrident,
      run: () => this.game.story.read(['A wall of brittle coral, grown over a doorway.', 'The sword just scratches it. Something sharper and stronger might break through.']),
    });
    return c;
  }

  breakCoral(c, silent = false) {
    if (c.broken) return;
    c.broken = true;
    this.state.solved[`coral:${c.id}`] = true;
    c.g.visible = false;
    if (c.box) c.box.enabled = false;
    if (!silent && this.game) {
      const G = this.game;
      G.sfx.play('crumble');
      G.sfx.play('secret');
      G.rig.shake(0.35);
      G.fx.burst('debris', new THREE.Vector3((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2), 34, 0xd87a8a);
      G.story.save(true);
    }
  }

  // Treuddens anfall: spröd korall nära Cello går sönder
  dashBreak(p) {
    let hit = false;
    for (const c of this.corals) {
      if (c.broken) continue;
      const f = p.feet;
      const dx = Math.max(c.x0 - f.x, 0, f.x - c.x1), dz = Math.max(c.z0 - f.z, 0, f.z - c.z1);
      const dy = Math.max(c.y0 - (f.y + 0.9), 0, (f.y + 0.9) - c.y1);
      if (Math.hypot(dx, dz, dy) < 1.4) { this.breakCoral(c); hit = true; }
    }
    return hit;
  }

  // ---------------- sjöborrar ----------------
  urchin(x, y, z, r = 0.55) {
    const M = templeMats();
    const g = new THREE.Group();
    g.position.set(this.X(x), y + r, z);
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.urchin));
    for (let k = 0; k < 14; k++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, r * 1.4, 4), M.urchin);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
      sp.position.copy(dir).multiplyScalar(r);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(sp);
    }
    this.D.add(g);
    this.urchins.push({ pos: g.position, r, g });
  }

  // ---------------- galler som en tryckplatta öppnar en stund ----------------
  timedGrate(id, x, z, axis, plateX, plateZ, o = {}) {
    const y = o.y ?? 0;
    const d = this.door({ id, x, z, y, axis, type: 'open', neg: o.neg, pos: o.pos });
    const gr = { id, d, open: false, timer: 0, linger: o.linger ?? 6 };
    this.grates.push(gr);
    this.pressurePlate(`${id}-plate`, plateX, plateZ, {
      y: o.plateY ?? y,
      onChange: (pressed) => {
        if (pressed) {
          gr.timer = 0;
          if (!gr.open) { gr.open = true; this.setBars(id, false); if (!this.hinted[`gr${id}`]) { this.hinted[`gr${id}`] = true; this.game.hud.toast('A grate grinds open somewhere... it will not stay open long without weight on the plate.', 3600); } }
        } else gr.timer = gr.linger;
      },
    });
    return gr;
  }

  applyState() {
    super.applyState();
    const s = this.state;
    s.water = s.water || {};
    const groups = [...new Set(this.pools.map((p) => p.group))];
    for (const gr of groups) this.setWater(gr, this.waterIdx(gr), true);
    for (const c of this.corals) {
      c.broken = !!s.solved[`coral:${c.id}`];
      c.g.visible = !c.broken;
      if (c.box) c.box.enabled = !c.broken;
    }
    for (const gr of this.grates) {
      gr.open = false;
      gr.timer = 0;
      gr.d.barsTarget = gr.d.barsY = 0;
      gr.d.bars.visible = true;
      gr.d.bars.position.y = 0;
    }
    for (const al of this.altars) { al.used = false; al.glow = 0; }
    this.afterTemple?.();
    this.syncColliders();
  }

  update(dt, frozen = false) {
    super.update(dt, frozen);
    const g = this.game;
    if (!g) return;
    const p = g.player;
    for (const pool of this.pools) {
      if (Math.abs(pool.level - pool.target) > 0.001) {
        const step = Math.sign(pool.target - pool.level) * Math.min(Math.abs(pool.target - pool.level), dt * (pool.rate ?? 1.6));
        pool.level += step;
        pool.m.position.y = pool.level;
        if (Math.random() < dt * 8) g.fx.burst('bubble', new THREE.Vector3(pool.x0 + Math.random() * (pool.x1 - pool.x0), pool.level - 0.5, pool.z0 + Math.random() * (pool.z1 - pool.z0)), 2, 0xd8f4ff);
      }
      pool.m.visible = pool.level > pool.bottom + 0.05;
    }
    for (const c of this.caus) animateCaustics(c, dt);
    for (const w of this.wheels) if (w.spin > 0) { w.spin = Math.max(0, w.spin - dt); w.wheel.rotation.z += dt * 5 * w.spin; }
    for (const al of this.altars) {
      al.glow = Math.max(0, al.glow - dt);
      const k = al.used ? 0.1 : g.player.hasTrident ? 0.55 + Math.sin(this.t * 3) * 0.2 + al.glow : 0.15;
      al.sock.color.setRGB(0.16 + 0.3 * k, 0.35 + 0.6 * k, 0.34 + 0.55 * k);
    }
    for (const v of this.vents) {
      v.t -= dt;
      if (v.t <= 0 && Math.hypot(p.feet.x - v.x, p.feet.z - v.z) < 40) {
        v.t = 0.12 + Math.random() * 0.15;
        g.fx.burst('bubble', new THREE.Vector3(v.x + (Math.random() - 0.5) * 0.5, v.y + 0.4, v.z + (Math.random() - 0.5) * 0.5), 1, 0xe0f8ff);
      }
    }
    if (!frozen && p.state !== 'dead') {
      for (const u of this.urchins) {
        const c = u.pos;
        if (Math.hypot(p.feet.x - c.x, p.feet.z - c.z) < u.r + 0.5 && p.feet.y < c.y + u.r && p.feet.y + 1.6 > c.y - u.r) {
          if (p.takeHit(1, c, { unblockable: true }) === 'hit' && !this.hinted.urchin) { this.hinted.urchin = true; g.hud.toast('Ouch! Sea urchins. Their spines go right through boots.', 3000); }
        }
      }
    }
    for (const gr of this.grates) {
      if (gr.open && gr.timer > 0) {
        gr.timer -= dt;
        if (gr.timer <= 0) { gr.open = false; this.setBars(gr.id, true); }
        else if (gr.timer < 2 && Math.floor(gr.timer * 4) !== Math.floor((gr.timer + dt) * 4)) g.sfx.play('select', { vol: 0.6 });
      }
    }
  }
}

// =====================================================================
// Karkinos: jättekrabban som Hera skickade mot Herakles. Skalet tar inga hugg.
// Lura den att rusa in i en korallpelare (den fastnar, ögonen sjunker ner) eller vänd den på rygg med hammaren.
// =====================================================================
function buildCrab() {
  const M = templeMats();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M.shell);
  shell.scale.set(2.0, 0.75, 1.5);
  shell.position.y = 1.4;
  body.add(shell);
  // Taggar på skalet
  for (let k = 0; k < 9; k++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), M.shellDark);
    const a = (k / 9) * Math.PI * 2;
    sp.position.set(Math.cos(a) * 1.5, 1.9, Math.sin(a) * 1.0);
    sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    body.add(sp);
  }
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8c8a0, flatShading: true }));
  belly.scale.set(1.9, 0.5, 1.4);
  belly.position.y = 1.35;
  body.add(belly);
  // Ögon på skaft
  const eyes = [];
  for (const s of [-1, 1]) {
    const stalk = new THREE.Group();
    stalk.position.set(0.45 * s, 1.85, 1.15);
    stalk.add(place(new THREE.Mesh(cyl(0.06, 0.08, 0.6, 5, 1), M.shellDark), 0, 0.3, 0));
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.eye);
    e.position.y = 0.65;
    stalk.add(e);
    body.add(stalk);
    eyes.push(stalk);
  }
  // Ben: tre på varje sida
  const legs = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const hip = new THREE.Group();
      hip.position.set(1.6 * s, 1.2, -0.6 + k * 0.6);
      const up = new THREE.Group();
      up.rotation.z = -0.9 * s;
      hip.add(up);
      up.add(place(new THREE.Mesh(box(0.2, 1.3, 0.2, 1), M.shell), 0, 0.6 * 0, 0).translateX(0));
      up.children[0].geometry.translate(0, -0.6, 0);
      const knee = new THREE.Group();
      knee.position.y = -1.2;
      knee.rotation.z = 1.7 * s;
      up.add(knee);
      const low = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.4, 5), M.shellDark);
      low.geometry.translate(0, -0.7, 0);
      low.rotation.x = Math.PI;
      low.rotation.x = 0;
      knee.add(low);
      body.add(hip);
      legs.push({ hip, up, knee, s, k });
    }
  }
  // Klor
  const claws = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(1.3 * s, 1.4, 1.1);
    arm.rotation.y = s * 0.5;
    arm.add(place(new THREE.Mesh(box(0.35, 0.35, 1.2, 1), M.shell), 0, 0, 0.6));
    const fist = new THREE.Group();
    fist.position.z = 1.3;
    arm.add(fist);
    fist.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), M.shell), 0, 0, 0.2));
    fist.children[0].scale.set(0.9, 0.8, 1.3);
    const top = new THREE.Group();
    top.position.set(0, 0.15, 0.6);
    top.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 5).rotateX(Math.PI / 2), M.shellDark), 0, 0, 0.4));
    fist.add(top);
    const bot = new THREE.Group();
    bot.position.set(0, -0.15, 0.6);
    bot.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5).rotateX(Math.PI / 2), M.shellDark), 0, 0, 0.3));
    fist.add(bot);
    body.add(arm);
    claws.push({ arm, top, bot, s });
  }
  return { root, body, shell, eyes, legs, claws, mats: [M.shell, M.shellDark] };
}

export class Karkinos {
  constructor(scene, center, radius, pillars, groundAt) {
    this.scene = scene;
    this.center = center.clone();
    this.radius = radius;
    this.pillars = pillars; // [{ x, z, r }]
    this.groundAt = groundAt;
    this.model = buildCrab();
    scene.add(this.model.root);
    this.pos = center.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 6;
    this.hitRadius = 2.4;
    this.onEvent = null;
    this.blockHint = 'The blade skids off the crab\'s shell! Make it charge into a coral pillar, or flip it with the hammer.';
    this.immuneHint = this.blockHint;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a5a, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(this.ring);
    this.reset();
  }

  reset() {
    this.hp = 8;
    this.state = 'dormant';
    this.st = 0;
    this.pos.copy(this.center).add(new THREE.Vector3(0, -2.4, -4));
    this.facing = 0;
    this.vel = new THREE.Vector3();
    this.flash = 0;
    this.cool = 1.5;
    this.hitPlayer = false;
    this.model.root.visible = false;
    this.ring.material.opacity = 0;
    this.animate(0.001);
  }

  get targetable() { return !['dormant', 'dead', 'gone'].includes(this.state); }
  get stunned() { return this.state === 'stuck' || this.state === 'flipped'; }
  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.chestPos.copy(this.pos).add(new THREE.Vector3(0, this.state === 'flipped' ? 1.0 : 1.6, 0));
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.model.root.visible = true;
    this.setState('rise');
  }

  setState(s) { this.state = s; this.st = 0; }

  canSwordHit(player) {
    if (this.state === 'stuck') {
      // Ögonen sitter fram
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      const ex = this.pos.x + fx * 1.4, ez = this.pos.z + fz * 1.4;
      return Math.hypot(ex - player.feet.x, ez - player.feet.z) < 2.6;
    }
    if (this.state === 'flipped') return Math.hypot(this.pos.x - player.feet.x, this.pos.z - player.feet.z) < 3.2;
    return Math.hypot(this.pos.x - player.feet.x, this.pos.z - player.feet.z) < 3.2;
  }

  hurt(dmg) {
    if (!this.targetable) return false;
    if (!this.stunned) return 'blocked';
    const d = this.state === 'flipped' ? dmg * 2 : dmg;
    this.hp -= d;
    this.flash = 0.15;
    if (this.hp <= 0) { this.setState('dead'); this.onEvent?.('dying', this); return 'killed'; }
    return 'hit';
  }

  // Treudden: ett anfall som vänder den om den är fast eller yr
  dashHit(p) {
    if (!this.targetable || Math.hypot(this.pos.x - p.feet.x, this.pos.z - p.feet.z) > 3.2) return false;
    if (this.stunned) return this.hurt(2);
    this.cool = Math.max(this.cool, 0.6);
    return 'blocked';
  }

  // Hammaren: nära nog vänder den krabban på rygg
  slamHit(point) {
    if (!this.targetable || this.state === 'flipped' || this.state === 'rise') return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 4.2) {
      this.setState('flipped');
      this.onEvent?.('flipped', this);
    }
  }

  inPillar(x, z, pad = 1.6) {
    for (const pl of this.pillars) if (Math.hypot(x - pl.x, z - pl.z) < pl.r + pad) return pl;
    return null;
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const C = this.center;
    const toP = Math.atan2(p.feet.x - this.pos.x, p.feet.z - this.pos.z);
    const distP = Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z);
    switch (this.state) {
      case 'rise':
        this.pos.y = approach(this.pos.y, C.y, 3, dt);
        this.facing = toP;
        if (this.st < 0.1) { g.sfx.play('splash', { vol: 1 }); g.rig.shake(0.5); }
        if (this.st > 1.8) { this.pos.y = C.y; this.setState('stalk'); this.onEvent?.('awake', this); }
        break;
      case 'stalk': {
        // Sidledes runt Cello, med klorna uppe
        this.facing += wrap(toP - this.facing) * (1 - Math.exp(-dt * 4));
        const side = Math.sin(this.st * 0.7) > 0 ? 1 : -1;
        const want = distP > 7 ? 1 : distP < 4.5 ? -1 : 0;
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        this.vel.set(fz * side * 2.6 + fx * want * 2.2, 0, -fx * side * 2.6 + fz * want * 2.2);
        this.move(dt);
        this.cool -= dt;
        if (distP < 3.6 && this.cool <= 0) { this.setState('pinch'); this.hitPlayer = false; g.sfx.play('clang', { vol: 0.5 }); }
        else if (this.cool <= 0 && this.st > 1.5) { this.setState('windup'); g.sfx.play('growl', { vol: 1.1 }); }
        break;
      }
      case 'pinch': {
        this.facing += wrap(toP - this.facing) * (1 - Math.exp(-dt * 8));
        if (!this.hitPlayer && this.st > 0.35 && this.st < 0.55 && distP < 3.8) {
          this.hitPlayer = true;
          p.takeHit(1, this.pos);
        }
        if (this.st > 0.9) { this.cool = 1.4; this.setState('stalk'); }
        break;
      }
      case 'windup':
        // Gräver ner klorna och siktar
        this.facing += wrap(toP - this.facing) * (1 - Math.exp(-dt * 6));
        this.ring.position.set(this.pos.x + Math.sin(this.facing) * 3, this.pos.y + 0.08, this.pos.z + Math.cos(this.facing) * 3);
        this.ring.material.opacity = 0.3 + 0.4 * Math.sin(this.st * 20) ** 2;
        if (this.st > 0.85) {
          this.ring.material.opacity = 0;
          this.setState('charge');
          this.hitPlayer = false;
          g.sfx.play('roar', { vol: 0.7 });
        }
        break;
      case 'charge': {
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        this.vel.set(fx * 15, 0, fz * 15);
        const nx = this.pos.x + fx * 15 * dt, nz = this.pos.z + fz * 15 * dt;
        const pl = this.inPillar(nx, nz);
        const outR = Math.hypot(nx - C.x, nz - C.z) > this.radius - 2.2;
        if (!this.hitPlayer && distP < 2.6) {
          this.hitPlayer = true;
          p.takeHit(2, this.pos, { unblockable: true });
        }
        if (pl) {
          // Klorna fastnar i korallen
          this.setState('stuck');
          g.sfx.play('crumble', { vol: 1.2 });
          g.sfx.play('clang');
          g.rig.shake(0.6);
          g.fx.burst('debris', new THREE.Vector3(nx, this.pos.y + 1.2, nz), 26, 0xd87a8a);
          this.onEvent?.('stuck', this);
        } else if (outR || this.st > 1.4) {
          g.rig.shake(0.4);
          g.sfx.play('stomp', { vol: 1 });
          this.cool = 1.2;
          this.setState('stalk');
        } else this.move(dt);
        break;
      }
      case 'stuck':
        if (this.st > 4.2) { this.cool = 1.6; this.setState('recover'); }
        break;
      case 'flipped':
        if (this.st > 4.6) { this.cool = 1.8; this.setState('recover'); g.sfx.play('splash', { vol: 0.8 }); }
        break;
      case 'recover':
        if (this.st > 0.8) this.setState('stalk');
        break;
      case 'dead':
        if (Math.random() < dt * 20) g.fx.burst('spark', this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3)), 4, 0xffc080);
        this.pos.y -= dt * 0.6;
        if (this.st > 2.6) { this.state = 'gone'; this.model.root.visible = false; this.onEvent?.('defeated', this); }
        break;
      default:
        break;
    }
    // Kroppen går inte genom Cello
    if (this.targetable && distP < 2.4 && this.state !== 'flipped') {
      const k = (2.4 - distP) / 2.4;
      p.nudge((p.feet.x - this.pos.x) / (distP || 1) * k * 0.2, (p.feet.z - this.pos.z) / (distP || 1) * k * 0.2);
    }
    this.animate(dt);
  }

  move(dt) {
    const C = this.center;
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    const d = Math.hypot(nx - C.x, nz - C.z), maxR = this.radius - 2.2;
    if (d > maxR) { nx = C.x + (nx - C.x) / d * maxR; nz = C.z + (nz - C.z) / d * maxR; }
    if (this.inPillar(nx, nz, 1.2) && this.state !== 'charge') return;
    this.pos.x = nx;
    this.pos.z = nz;
  }

  animate(dt) {
    const m = this.model, t = performance.now() / 1000;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    const walking = this.state === 'stalk' || this.state === 'charge';
    const sp = this.state === 'charge' ? 22 : 9;
    const flip = this.state === 'flipped' ? Math.min(1, this.st * 4) * (this.st > 4.2 ? Math.max(0, 1 - (this.st - 4.2) * 2.5) : 1) : 0;
    m.body.rotation.z = flip * Math.PI;
    m.body.position.y = flip * 2.6;
    const stuck = this.state === 'stuck';
    m.body.rotation.x = approach(m.body.rotation.x, stuck ? 0.35 : this.state === 'windup' ? 0.2 : 0, 8, dt);
    for (const L of m.legs) {
      const ph = t * sp + L.k * 2.1 + (L.s > 0 ? Math.PI : 0);
      const flail = flip > 0.5 ? Math.sin(t * 18 + L.k) * 0.6 : 0;
      L.up.rotation.x = walking ? Math.sin(ph) * 0.45 : flail;
      L.up.rotation.z = -0.9 * L.s + (walking ? Math.max(0, Math.cos(ph)) * 0.35 * L.s : 0);
    }
    for (const c of m.claws) {
      const open = this.state === 'pinch' ? (this.st < 0.35 ? 0.7 : 0) : this.state === 'stalk' ? 0.3 + Math.sin(t * 6 + c.s) * 0.25 : stuck ? 0.6 : 0.1;
      c.top.rotation.x = -open;
      c.bot.rotation.x = open * 0.6;
      c.arm.rotation.x = this.state === 'pinch' ? (this.st < 0.35 ? -0.8 : 0.4) : stuck ? 0.5 : this.state === 'windup' ? 0.4 : -0.2 + Math.sin(t * 2 + c.s) * 0.05;
    }
    for (const e of m.eyes) e.scale.y = stuck ? 1.3 : 1;
    m.eyes.forEach((e, i) => { e.rotation.z = stuck ? (i ? 0.4 : -0.4) : Math.sin(t * 3 + i) * 0.1; });
    const f = this.flash > 0 ? 0.7 : 0;
    for (const mt of m.mats) mt.emissive?.setRGB(f, f * 0.6, f * 0.3);
  }
}

// =====================================================================
// Ketos: Poseidons gamla havsodjur, förvridet av Kronos. En lång kropp av fjäll som simmar i cirklar under ytan.
// Töm bassängen med ett tidvattenaltare så strandar den: kristallen av förbannelse på huvudet ligger öppen.
// =====================================================================
function buildKetos() {
  const M = templeMats();
  const skin = new THREE.MeshLambertMaterial({ color: 0x2a5a6a, flatShading: true });
  const belly = new THREE.MeshLambertMaterial({ color: 0x8aa8a0, flatShading: true });
  const root = new THREE.Group();
  const segs = [];
  const N = 18;
  for (let i = 0; i < N; i++) {
    const r = i === 0 ? 1.7 : 1.6 * (1 - i / N) + 0.35;
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), skin);
    m.scale.set(1, 0.85, 1.25);
    g.add(m);
    if (i > 0 && i % 2 === 0) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, r * 1.4, 4), skin);
      fin.position.y = r * 0.9;
      fin.rotation.x = -0.6;
      g.add(fin);
    }
    if (i > 0 && i < N - 2) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 8, 6), belly);
      b.scale.set(0.9, 0.5, 1.1);
      b.position.y = -r * 0.45;
      g.add(b);
    }
    root.add(g);
    segs.push({ g, r });
  }
  // Huvudet: lång nos, käke, ögon och kristallen
  const head = segs[0].g;
  head.add(place(new THREE.Mesh(box(2.2, 1.2, 2.6, 1), skin), 0, 0.1, 1.6));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.5, 0.6);
  jaw.add(place(new THREE.Mesh(box(2.0, 0.5, 2.8, 1), belly), 0, -0.2, 1.3));
  head.add(jaw);
  for (const s of [-1, 1]) {
    head.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), M.eye), 0.95 * s, 0.6, 1.4));
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.2, 4), skin);
    fin.position.set(1.4 * s, 0, -0.4);
    fin.rotation.z = -s * 1.2;
    head.add(fin);
  }
  const crystals = new THREE.Group();
  crystals.position.set(0, 1.25, 0.6);
  for (let k = 0; k < 5; k++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + (k === 0 ? 0.25 : 0), 0), M.curse);
    c.position.set((k - 2) * 0.35, k === 0 ? 0.3 : 0.05, (k % 2) * 0.3);
    c.scale.y = 1.6;
    crystals.add(c);
  }
  head.add(crystals);
  return { root, segs, head, jaw, crystals, mats: [skin, belly], curse: M.curse };
}

export class Ketos {
  // center: bassängens mitt på golvet · o: { radius, surface: () => vattenytan, platforms: [{x,z,r}] }
  constructor(scene, center, o) {
    this.scene = scene;
    this.center = center.clone();
    this.radius = o.radius ?? 18;
    this.surface = o.surface;
    this.floorY = center.y;
    this.model = buildKetos();
    scene.add(this.model.root);
    this.trail = [];
    this.pos = new THREE.Vector3();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 14;
    this.hitRadius = 2.6;
    this.noWear = false;
    this.onEvent = null;
    this.blockHint = 'Ketos is too swift in the deep water. Drain the throne with a tide altar, and strike the curse on its head!';
    this.immuneHint = this.blockHint;
    this.foam = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(this.foam);
    this.bolts = [0, 1, 2].map(() => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.85 }));
      b.visible = false;
      scene.add(b);
      return { m: b, v: new THREE.Vector3(), on: false, t: 0 };
    });
    this.reset();
  }

  reset() {
    this.hp = 9;
    this.state = 'dormant';
    this.st = 0;
    this.ang = 0;
    this.depth = -3;
    this.hits = 0;
    this.flash = 0;
    this.cool = 3;
    this.attack = null;
    this.count = 0;
    this.contactT = 0;
    this.pos.set(this.center.x, this.floorY + 1, this.center.z + this.radius * 0.6);
    this.trail = Array.from({ length: 120 }, () => this.pos.clone());
    this.model.root.visible = false;
    this.foam.material.opacity = 0;
    for (const b of this.bolts) { b.on = false; b.m.visible = false; }
    this.layout();
  }

  get phase() { return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3; }
  get targetable() { return ['circle', 'stranded', 'surface', 'lunge'].includes(this.state); }
  get stunned() { return this.state === 'stranded'; }
  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.model.crystals.getWorldPosition(this.chestPos);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.model.root.visible = true;
    this.setState('rise');
  }

  setState(s) { this.state = s; this.st = 0; }

  // Altaret tömmer bassängen: Ketos strandar när vattnet har sjunkit
  drained() {
    if (this.state === 'dead' || this.state === 'gone' || this.state === 'stranded') return false;
    this.attack = null;
    this.setState('draining');
    return true;
  }

  canSwordHit(player) {
    if (this.state !== 'stranded') return false;
    const c = this.chest;
    return Math.hypot(c.x - player.feet.x, c.z - player.feet.z) < 2.8 && Math.abs(c.y - player.feet.y - 1) < 2.4;
  }

  hurt(dmg) {
    if (!this.targetable) return false;
    if (this.state !== 'stranded') return 'blocked';
    this.hp -= 1;
    this.hits++;
    this.flash = 0.18;
    if (this.hp <= 0) { this.setState('dead'); this.onEvent?.('dying', this); return 'killed'; }
    if (this.hits >= 3) { this.hits = 0; this.setState('roar'); this.onEvent?.('phase', this); }
    return 'hit';
  }

  dashHit(p) {
    const c = this.chest;
    if (Math.hypot(c.x - p.feet.x, c.z - p.feet.z) > 3 || Math.abs(c.y - p.feet.y - 1) > 3) return false;
    if (this.state === 'stranded') return this.hurt(2);
    // Under vattnet: treudden får den att rygga undan en stund
    if (this.state === 'circle') { this.cool = Math.max(this.cool, 2.5); this.flash = 0.12; return 'hit'; }
    return 'blocked';
  }

  slamHit() {}

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const C = this.center, surf = this.surface();
    const water = surf - this.floorY;
    switch (this.state) {
      case 'rise':
        this.ang += dt * 0.6;
        this.depth = approach(this.depth, -2.5, 2, dt);
        this.headTo(this.circlePoint(this.ang, 11, surf - 2.5), dt, 10);
        if (this.st < 0.1) { g.sfx.play('typhoon', { vol: 0.9 }); g.rig.shake(0.6); }
        if (this.st > 3) { this.setState('circle'); this.onEvent?.('awake', this); }
        break;
      case 'circle': {
        const sp = 0.42 + this.phase * 0.08;
        this.ang += dt * sp;
        const bob = Math.sin(this.st * 0.9) * 1.2;
        this.headTo(this.circlePoint(this.ang, 12, Math.max(this.floorY + 1.6, surf - 2.4 + bob)), dt, 6);
        this.cool -= dt;
        if (this.cool <= 0) this.choose(p, g);
        // Under vattnet bits Cello om han kommer för nära huvudet
        this.contactT -= dt;
        if (p.headUnder && this.contactT <= 0 && this.pos.distanceTo(p.feet.clone().setY(p.feet.y + 0.9)) < 2.8) {
          this.contactT = 1.2;
          p.takeHit(1, this.pos, { unblockable: true });
        }
        break;
      }
      case 'lunge': {
        const a = this.attack;
        const wind = this.phase === 3 ? 0.9 : 1.2;
        if (this.st < wind * 0.6) a.target.set(p.feet.x, surf, p.feet.z);
        this.foam.position.set(a.target.x, surf + 0.06, a.target.z);
        this.foam.material.opacity = this.st < wind ? 0.35 + 0.5 * Math.sin(this.st * 18) ** 2 : 0;
        if (this.st < wind) {
          // Ligger under målet och väntar
          this.headTo(new THREE.Vector3(a.target.x, Math.max(this.floorY + 1.2, surf - 4), a.target.z + 0.01), dt, 5);
        } else {
          const k = Math.min(1, (this.st - wind) / 0.9);
          const top = surf + 4.5;
          const y = Math.max(this.floorY + 1, surf - 4 + Math.sin(k * Math.PI) * (top - surf + 4));
          const dir = new THREE.Vector3(a.target.x - C.x, 0, a.target.z - C.z).normalize();
          this.headTo(new THREE.Vector3(a.target.x + dir.x * (k - 0.5) * 6, y, a.target.z + dir.z * (k - 0.5) * 6), dt, 14);
          if (!a.hit && k > 0.35) {
            a.hit = true;
            g.sfx.play('splash', { vol: 1.4 });
            g.rig.shake(0.6);
            g.fx.burst('spark', a.target.clone().setY(surf + 0.2), 30, 0xe8fbff);
            if (Math.hypot(p.feet.x - a.target.x, p.feet.z - a.target.z) < 2.8 && p.feet.y < surf + 3) p.takeHit(2, a.target, { unblockable: true });
          }
          if (k >= 1) { this.attack = null; this.cool = this.phase === 3 ? 1.6 : 2.4; this.setState('circle'); }
        }
        break;
      }
      case 'surface': {
        // Sticker upp mitt i bassängen och spottar vattenkulor mot Cello
        const a = this.attack;
        this.headTo(new THREE.Vector3(C.x, surf + 3.2, C.z), dt, 5);
        if (this.st > 0.9 && a.n < 3 && this.st > 0.9 + a.n * 0.55) {
          const b = this.bolts[a.n];
          b.on = true;
          b.t = 0;
          b.m.visible = true;
          b.m.position.copy(this.chest);
          b.v.copy(p.feet).add(new THREE.Vector3(0, 1, 0)).sub(b.m.position).normalize().multiplyScalar(16);
          a.n++;
          g.sfx.play('gust', { vol: 0.7 });
        }
        if (this.st > 3) { this.attack = null; this.cool = 2.2; this.setState('circle'); }
        break;
      }
      case 'draining':
        // Vattnet sjunker: den slingrar sig, sedan ligger den på golvet
        this.ang += dt * 0.5;
        this.headTo(this.circlePoint(this.ang, 9, Math.max(this.floorY + 0.9, surf - 1.2)), dt, 6);
        if (water < 1.4) { this.setState('stranded'); this.onEvent?.('stranded', this); g.sfx.play('stomp', { vol: 1.3 }); g.rig.shake(0.5); }
        break;
      case 'stranded': {
        // Kroppen ligger på golvet och slår med svansen. Huvudet vilar, kristallen lyser
        const head = this.trail[0];
        const target = new THREE.Vector3(head.x, this.floorY + 1.0, head.z);
        this.headTo(target, dt, 3, true);
        if (this.st > 9.5) { this.hits = 0; this.setState('roar'); }
        break;
      }
      case 'roar':
        if (this.st < 0.1) { g.sfx.play('typhoon', { vol: 1.1 }); g.rig.shake(0.7); this.onEvent?.('refill', this); }
        this.headTo(new THREE.Vector3(this.pos.x, this.floorY + 3.5, this.pos.z), dt, 4);
        if (this.st > 2.4 && water > 3) { this.cool = 2; this.setState('circle'); }
        break;
      case 'dead':
        this.headTo(new THREE.Vector3(this.pos.x, this.floorY + 0.8, this.pos.z), dt, 2, true);
        if (Math.random() < dt * 25) g.fx.burst('spark', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random(), (Math.random() - 0.5) * 3)), 3, 0xd8b0ff);
        if (this.st > 4) { this.state = 'gone'; this.onEvent?.('defeated', this); }
        break;
      default:
        break;
    }
    // Vattenkulorna
    for (const b of this.bolts) {
      if (!b.on) continue;
      b.t += dt;
      b.m.position.addScaledVector(b.v, dt);
      if (b.m.position.distanceTo(p.feet.clone().setY(p.feet.y + 1)) < 1.1) {
        b.on = false;
        b.m.visible = false;
        p.takeHit(1, b.m.position);
        g.fx.burst('spark', b.m.position, 14, 0xbff4ff);
      } else if (b.t > 2.5) { b.on = false; b.m.visible = false; }
    }
    this.layout();
  }

  choose(p, g) {
    this.count++;
    const ph = this.phase;
    const kind = ph >= 2 && this.count % 3 === 0 ? 'surface' : 'lunge';
    this.attack = { kind, target: p.feet.clone(), hit: false, n: 0 };
    this.setState(kind);
    g.sfx.play(kind === 'lunge' ? 'growl' : 'roar', { vol: 1 });
  }

  circlePoint(a, r, y) {
    return new THREE.Vector3(this.center.x + Math.cos(a) * r, y, this.center.z + Math.sin(a) * r);
  }

  // Huvudet rör sig mot target; kroppen följer efter längs spåret
  headTo(target, dt, rate, still = false) {
    this.pos.lerp(target, 1 - Math.exp(-rate * dt));
    const d = this.pos.distanceTo(this.trail[0]);
    if (d > 0.18 || still) {
      this.trail.pop();
      this.trail.unshift(this.pos.clone());
    }
    if (still) {
      // Strandad: kroppen glider ner mot golvet
      for (const q of this.trail) q.y = approach(q.y, this.floorY + 0.8, 2, dt);
    }
  }

  layout() {
    const m = this.model, segs = m.segs;
    const step = Math.max(1, Math.floor(this.trail.length / segs.length));
    const t = performance.now() / 1000;
    for (let i = 0; i < segs.length; i++) {
      const q = this.trail[Math.min(this.trail.length - 1, i * step)];
      const n = this.trail[Math.min(this.trail.length - 1, i * step + 2)];
      const s = segs[i].g;
      const wig = this.state === 'stranded' ? Math.sin(t * 6 - i * 0.6) * 0.6 * (i / segs.length) : 0;
      s.position.set(q.x + wig, q.y, q.z);
      const dx = q.x - n.x, dy = q.y - n.y, dz = q.z - n.z;
      if (dx * dx + dz * dz + dy * dy > 1e-6) {
        s.rotation.set(0, 0, 0);
        s.rotation.y = Math.atan2(dx, dz);
        s.rotation.x = -Math.atan2(dy, Math.hypot(dx, dz));
      }
    }
    m.jaw.rotation.x = this.state === 'lunge' || this.state === 'surface' || this.state === 'roar' ? 0.45 + Math.sin(t * 8) * 0.1 : 0.05;
    const pulse = 0.6 + 0.4 * Math.sin(t * 7);
    m.curse.color.setRGB(0.5 + 0.3 * pulse * (this.state === 'stranded' ? 1.4 : 0.6), 0.25, 0.9 + 0.1 * pulse);
    const f = this.flash > 0 ? 0.7 : 0;
    for (const mt of m.mats) mt.emissive?.setRGB(f * 0.7, f, f);
  }
}

// Pyramidens verktygslåda (0.10): en flygel av sandsten och guld, med solljus och sand.
// Bygger på Wing (dkit.js) och lägger till:
//
//   solljus     – fönster, schakt, speglar, solögon, skuggslöjor (beams.js) och solkristaller som delar strålen
//   spegelblock – speglar på stenblock som skjuts med tung vikt (strålen går över blocket)
//   solvisaren  – en spegel som vrider sig själv ett steg i taget, och en platta som bromsar den
//   sandfall    – ridåer av sand som rasar från taket i takt och slår undan Cello
//   stenkulor   – rullar nerför en ramp med jämna mellanrum
//   timglaset   – vänds med E: sanden stiger i en grop och sjunker i en annan
//   solväktaren – en guldklädd väktare som bara vacklar i reflekterat solljus
//
// Läget (speglar, slöjor, ögon, timglas) sparas i pyramidens state, precis som resten av flygeln.
import * as THREE from 'three';
import { Wing } from './dkit.js';
import { soften, smoothTexture } from './textures.js';
import { Beams, BEAM_Y } from './beams.js';
import { IronWarden } from './bosses.js';
import { box, cyl, place, rockGeo, hash2 } from './geom.js';

// Sandtextur som rinner (används för sandfall och sandytor)
let SAND_TEX = null;
function sandTexture() {
  if (SAND_TEX) return SAND_TEX;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const g = c.getContext('2d');
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 32; x++) {
      const v = 150 + ((x * 7 + y * 13) % 11) * 6 + (Math.random() * 40 | 0);
      g.fillStyle = `rgba(${v + 40},${v + 10},${v - 40},${0.55 + Math.random() * 0.45})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  SAND_TEX = smoothTexture(new THREE.CanvasTexture(soften(c)));
  return SAND_TEX;
}

// ====================================================================
// Solväktaren: Järnväktaren i guld. Skölden tar emot svärdet och hammaren framifrån,
// och hellebarden fastnar aldrig. Men solljus från prisman bländar den: då vacklar den länge.
// ====================================================================
export class SunGuardian extends IronWarden {
  constructor(...args) {
    super(...args);
    const M = this.model.M;
    M.ash.color.set(0x24202a);
    M.plate.color.set(0xc9a048);
    M.dark.color.set(0x1c2e58);
    M.bone.color.set(0xeedca0);
    M.wood.color.set(0x6a4a28);
    M.rim.color.set(0xdcb458);
    M.paint.color.set(0x2a4a8a);
    this.sunT = 0;
    this.beamRadius = 1.3;
    this.blockHint = 'The golden shield turns every blow. Blind the guardian with sunlight from the prism!';
  }

  reset() {
    super.reset();
    this.hp = 16;
    this.sunT = 0;
  }

  get beamable() {
    return this.targetable && this.state !== 'stuck';
  }

  get beamPoint() {
    return this.chest;
  }

  onBeam(dt, g) {
    this.sunT += dt * 2;
    if (this.sunT > 1.2 && this.state !== 'stuck') {
      this.setState('stuck');
      this.st = -1.8; // vacklar i nästan fyra sekunder
      this.sunT = 0;
      g.sfx.play('bigroar', { vol: 0.6 });
      g.sfx.play('sunchime');
      g.fx.burst('spark', this.chest.clone(), 24, 0xffd070);
      this.onEvent?.('dazzled', this);
    }
  }

  slamHit(point, w) {
    if (!this.targetable) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 3.4) this.hurt(this.state === 'stuck' ? 3 : 1, point, w);
  }

  // Rustningen glöder av solljuset (i stället för den vita träffblinkningen)
  animate(dt, walk) {
    super.animate(dt, walk);
    this.sunGlow = Math.max(0, Math.min(1, (this.sunGlow ?? 0) + (this.beamLit ? dt * 3 : -dt * 1.5)));
    const k = Math.max(this.sunGlow, this.state === 'stuck' ? 0.35 + Math.sin(this.st * 9) * 0.15 : 0);
    if (k > 0 && this.flash <= 0) for (const m of this.model.mats) m.emissive.setRGB(0.55 * k, 0.38 * k, 0.06 * k);
  }

  update(dt, g) {
    const before = this.state;
    if (!this.beamLit) this.sunT = Math.max(0, this.sunT - dt);
    super.update(dt, g);
    // Hellebarden fastnar inte: efter hugget backar väktaren i stället
    if (before === 'chopWind' && this.state === 'stuck') this.setState('sweep');
  }
}

export class SunWing extends Wing {
  constructor(B, area, dungeon, opts = {}) {
    const M = B.M;
    super(B, area, dungeon, {
      floorMat: M.sandstone, wallMat: M.hiero, H: 7,
      mats: { slab: M.sandstone, trim: M.goldPlate, metal: M.goldPlate, runes: M.hiero, cracked: M.sandRock, block: M.sandstoneDark, rubble: M.sandRock },
      ...opts,
    });
    this.beams = new Beams(this.D, { lights: B.lights });
    this.beams.targets = () => this.beamTargets();
    this.mm = { base: M.sandstoneDark, frame: M.goldPlate };
    this.rotors = [];
    this.sandfalls = [];
    this.boulderRuns = [];
    this.pits = [];
    this.glasses = [];
    this.mirrorBlocks = [];
    this.latchEyes = [];
    this.onConnect.push((c) => {
      this.beams.connect(c);
      for (const mb of this.mirrorBlocks) mb.block.box.noBeam = true;
      for (const pit of this.pits) pit.box = c.addBox(pit.x0, pit.bottom, pit.z0, pit.x1, pit.level, pit.z1, `pit-${pit.id}`);
    });
  }

  // ---------------- solljus ----------------
  window(id, x, z, dir, o = {}) {
    return this.beams.addWindow(id, this.V(x, (o.y ?? 0) + BEAM_Y, z), new THREE.Vector3(dir[0], 0, dir[1]), { room: o.room });
  }

  shaft(id, x, z, r = 1.2, o = {}) {
    const y = o.y ?? 0, top = o.top ?? this.H;
    const s = this.beams.addShaft(id, this.V(x, y + 0.02, z), r, top, { room: o.room });
    // En solskiva av guld i golvet
    this.deco(new THREE.TorusGeometry(r + 0.25, 0.07, 4, 28).rotateX(Math.PI / 2), this.M.goldPlate, x, y + 0.05, z);
    return s;
  }

  mirror(id, x, z, a = 0, o = {}) {
    const m = this.beams.addMirror(id, this.V(x, o.y ?? 0, z), a, this.mm, { room: o.room, locked: o.locked });
    m.a0 = a;
    this.deco(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 12), this.M.goldPlate, x, (o.y ?? 0) + 0.025, z);
    return m;
  }

  splitter(id, x, z, o = {}) {
    return this.beams.addSplitter(id, this.V(x, o.y ?? 0, z), this.mm, { room: o.room });
  }

  // latch: ögat stannar tänt för alltid (sparas). hold: lyser bara medan strålen är kvar.
  eye(id, x, z, facing, o = {}) {
    const y = o.y ?? 0;
    const e = this.beams.addEye(id, this.V(x, y + BEAM_Y, z), facing, {
      room: o.room, hold: !!o.hold, need: o.need,
      onLit: (ev) => {
        if (!o.hold) this.state.solved[`eye:${id}`] = true;
        o.onLit?.(ev);
        if (!o.hold) this.game?.story.save(true);
      },
      onOff: o.onOff,
    });
    if (!o.hold) this.latchEyes.push(e);
    // Ett litet guldfäste i väggen bakom ögat
    this.deco(box(1.4, 1.4, 0.2, 1), this.M.sandstoneDark, x - Math.sin(facing) * 0.15, y + BEAM_Y, z - Math.cos(facing) * 0.15, facing);
    return e;
  }

  veil(id, x, z, axis, o = {}) {
    const y = o.y ?? 0, w = o.w ?? 2.4, h = o.h ?? 3.6;
    const v = this.beams.addVeil(id, this.V(x, y + h / 2, z), w, h, axis, {
      room: o.room,
      onBurn: (vv) => {
        if (!this.state.veils.includes(vv.id)) this.state.veils.push(vv.id);
        o.onBurn?.(vv);
        if (o.text) this.game?.hud.toast(o.text, 2800);
        this.game?.story.save(true);
      },
    });
    return v;
  }

  // Ett stenblock med en spegel ovanpå. Strålen går över blocket och träffar spegeln.
  mirrorBlock(id, gridId, c, r, a) {
    const b = this.pushBlock(id, gridId, c, r);
    // Blocket blir en låg sockel; lådan är kvar i full höjd så att Cello inte går igenom spegeln
    b.m.geometry.dispose();
    b.m.geometry = box(1.9, 0.6, 1.9, 1.9).translate(0, -0.65, 0);
    b.m.children.forEach((ch) => { ch.position.y = -0.4; });
    const m = this.beams.addMirror(`${id}-mirror`, this.V(0, 0, 0), a, this.mm, { locked: true });
    m.onBlock = true;
    m.g.position.set(b.x, 0.6 - 0.7, b.z);
    this.mirrorBlocks.push({ block: b, mirror: m });
    return { block: b, mirror: m };
  }

  // Ett stenblock med en solkristall ovanpå (delar strålen som en vanlig kristall)
  crystalBlock(id, gridId, c, r) {
    const b = this.pushBlock(id, gridId, c, r);
    b.m.geometry.dispose();
    b.m.geometry = box(1.9, 0.6, 1.9, 1.9).translate(0, -0.65, 0);
    b.m.children.forEach((ch) => { ch.position.y = -0.4; });
    const sp = this.beams.addSplitter(`${id}-crystal`, this.V(0, 0, 0), this.mm);
    sp.g.position.set(b.x, -0.1, b.z);
    this.mirrorBlocks.push({ block: b, splitter: sp });
    return { block: b, splitter: sp };
  }

  // ---------------- solvisaren ----------------
  // En spegel som tar ett åttondels varv var step:e sekund, utom när bromsplattan är nedtryckt
  rotor(mirror, plate, o = {}) {
    const r = { mirror, plate, step: o.step ?? 1.4, t: 0 };
    mirror.locked = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 4, 16).rotateX(Math.PI / 2), this.M.goldPlate);
    ring.position.set(mirror.pos.x, mirror.pos.y + 0.75, mirror.pos.z);
    this.D.add(ring);
    for (let k = 0; k < 8; k++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), this.M.goldPlate);
      const a = (k / 8) * Math.PI * 2;
      tooth.position.set(Math.sin(a) * 0.95, 0, Math.cos(a) * 0.95);
      tooth.rotation.y = a;
      ring.add(tooth);
    }
    r.ring = ring;
    this.rotors.push(r);
    return r;
  }

  // ---------------- sandfall ----------------
  sandfall(id, x, z, r = 1.4, o = {}) {
    const y = o.y ?? 0, top = o.top ?? this.H;
    const tex = sandTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(3, top / 3);
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xe8c890, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, top, 14, 1, true), mat);
    col.position.set(this.X(x), y + top / 2, z);
    this.D.add(col);
    const trickleMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xe8c890, transparent: true, opacity: 0.7, depthWrite: false });
    const trickle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, top, 6, 1, true), trickleMat);
    trickle.position.copy(col.position);
    this.D.add(trickle);
    // En hög av sand där den landar och ett hål i taket
    this.deco(new THREE.ConeGeometry(r * 0.9, 0.35, 12), this.M.sandRock, x, y + 0.17, z);
    this.deco(new THREE.CircleGeometry(r * 0.9, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0c0806 }), x, y + top - 0.02, z);
    const sf = { id, x: this.X(x), z, y, r, top, period: o.period ?? 4.2, on: o.on ?? 1.6, phase: o.phase ?? 0, col, mat, tex, trickle, trickleMat, active: false, warn: false };
    this.sandfalls.push(sf);
    return sf;
  }

  // ---------------- stenkulor ----------------
  // pts: lokala punkter [x, y, z] längs rampen, uppifrån och ner
  boulders(id, pts, o = {}) {
    const run = {
      id, pts: pts.map(([x, y, z]) => this.V(x, y, z)), period: o.period ?? 4.6, phase: o.phase ?? 0, r: o.r ?? 1.25,
      t: o.phase ?? 0, balls: [],
    };
    run.len = 0;
    for (let i = 0; i < run.pts.length - 1; i++) run.len += run.pts[i].distanceTo(run.pts[i + 1]);
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(rockGeo(run.r, 4000 + k * 7 + hash2(k, run.len) * 50, 0.25), this.M.sandstoneDark);
      m.visible = false;
      this.D.add(m);
      run.balls.push({ m, s: -1, v: 0, hitT: 0 });
    }
    this.boulderRuns.push(run);
    return run;
  }

  pointOn(run, s) {
    let rest = s;
    for (let i = 0; i < run.pts.length - 1; i++) {
      const a = run.pts[i], b = run.pts[i + 1], l = a.distanceTo(b);
      if (rest <= l) return a.clone().lerp(b, rest / l);
      rest -= l;
    }
    return run.pts[run.pts.length - 1].clone();
  }

  // ---------------- timglaset och sandgroparna ----------------
  // En grop där sanden står på yLow eller yHigh. inverse: hög när timglaset är vänt.
  sandPit(id, x0, x1, z0, z1, yLow, yHigh, o = {}) {
    const bottom = o.bottom ?? yLow - 1;
    const tex = sandTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set((x1 - x0) / 3, (z1 - z0) / 3);
    const mat = new THREE.MeshLambertMaterial({ map: tex, color: 0xe0c08a });
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1, z1 - z0), mat);
    this.D.add(m);
    const pit = { id, x0: this.X(x0), x1: this.X(x1), z0, z1, yLow, yHigh, bottom, inverse: !!o.inverse, glass: o.glass, level: yLow, target: yLow, m, tex, box: null };
    this.pits.push(pit);
    this.setPit(pit, yLow);
    return pit;
  }

  setPit(pit, level) {
    pit.level = level;
    const h = Math.max(0.05, level - pit.bottom);
    pit.m.scale.y = h;
    pit.m.position.set((pit.x0 + pit.x1) / 2, pit.bottom + h / 2, (pit.z0 + pit.z1) / 2);
    if (pit.box) pit.box.max.y = level;
  }

  hourglass(id, x, z, o = {}) {
    const y = o.y ?? 0, M = this.M;
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    this.D.add(g);
    // Ram av guld och två glaskolvar med sand
    this.B.solid(place(new THREE.Mesh(box(2.2, 0.3, 2.2, 1), M.sandstoneDark), this.X(x), y + 0.15, z));
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) g.add(place(new THREE.Mesh(box(0.16, 3.2, 0.16, 1), M.goldPlate), dx, 1.9, dz));
    g.add(place(new THREE.Mesh(box(2.1, 0.2, 2.1, 1), M.goldPlate), 0, 3.5, 0));
    const turn = new THREE.Group();
    turn.position.y = 1.9;
    g.add(turn);
    const glass = new THREE.MeshLambertMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.35, depthWrite: false });
    const bulbA = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 12), glass);
    bulbA.position.y = 0.65;
    bulbA.rotation.x = Math.PI;
    const bulbB = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 12), glass);
    bulbB.position.y = -0.65;
    turn.add(bulbA, bulbB);
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xe0b878 });
    const sandA = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 12), sandMat);
    const sandB = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 12), sandMat);
    turn.add(sandA, sandB);
    const hg = { id, x: this.X(x), z, y, g, turn, sandA, sandB, view: 0, k: 0 };
    this.glasses.push(hg);
    this.interactions.push({
      label: 'Turn the hourglass', area: this.id, pos: () => this.V(x, y, z + 1.9), radius: 1.6,
      ok: () => this.pits.every((p) => Math.abs(p.level - p.target) < 0.01),
      run: () => this.flipGlass(hg),
    });
    return hg;
  }

  glassFlipped(hg) {
    return !!this.state.solved[`hg:${hg.id}`];
  }

  flipGlass(hg) {
    const s = this.state.solved;
    s[`hg:${hg.id}`] = !s[`hg:${hg.id}`];
    this.game?.sfx.play('hourglass');
    this.game?.rig.shake(0.25);
    this.pitTargets();
    if (!this.hinted.glass) {
      this.hinted.glass = true;
      this.game?.hud.toast('The hourglass turns. Somewhere below, sand begins to flow...', 3200);
    }
    this.game?.story.save(true);
  }

  pitTargets(instant = false) {
    for (const p of this.pits) {
      const hg = this.glasses.find((q) => q.id === p.glass) ?? this.glasses[0];
      const flipped = hg ? this.glassFlipped(hg) : false;
      const high = flipped !== p.inverse;
      p.target = high ? p.yHigh : p.yLow;
      if (instant) this.setPit(p, p.target);
    }
  }

  // ---------------- interaktioner, läge och mål ----------------
  buildInteractions() {
    super.buildInteractions();
    const P = () => this.game.player;
    for (const m of this.beams.mirrors) {
      this.interactions.push({
        label: 'Turn the mirror', area: this.id, pos: () => m.pos, radius: 1.7,
        ok: () => !m.locked,
        run: () => {
          this.beams.turnMirror(m);
          this.state.mirrors[m.id] = m.a;
          if (!this.hinted.mirror) {
            this.hinted.mirror = true;
            this.game.hud.toast('Each turn moves the mirror an eighth of the way around. Watch where the light goes.', 3800);
          }
        },
      });
    }
    for (const s of this.beams.shafts) {
      this.interactions.push({
        label: 'Examine the light', area: this.id, pos: () => s.pos, radius: s.radius + 0.4,
        ok: () => !P().hasPrism,
        run: () => this.game.story.read(['Light falls from a crack high above and pools on a golden disc.', 'Cello has nothing that can hold it.']),
      });
    }
    for (const sp of this.beams.splitters) {
      this.interactions.push({
        label: 'Examine the crystal', area: this.id, pos: () => sp.pos, radius: 1.6,
        ok: () => true,
        run: () => this.game.story.read(['A sun crystal, cut with a hundred faces.', 'Light that enters it leaves again to the left and to the right.']),
      });
    }
  }

  beamTargets() {
    const out = [];
    const g = this.game;
    if (!g) return out;
    for (const e of g.enemies.list) if (e.area === this.id && e.beamable) out.push(e);
    for (const b of this.bosses) if (b.beamable) out.push(b);
    return out;
  }

  combatTargets() {
    const out = super.combatTargets();
    const P = this.game?.player;
    if (P?.prismUp) {
      for (const e of this.beams.eyes) if (e.targetable) out.push(e);
      for (const m of this.beams.mirrors) if (m.targetable) out.push(m);
      for (const v of this.beams.veils) if (v.targetable) out.push(v);
    }
    return out;
  }

  applyState() {
    const s = this.state;
    s.mirrors = s.mirrors || {};
    s.veils = s.veils || [];
    super.applyState();
    const bz = this.beams;
    for (const m of bz.mirrors) {
      if (m.onBlock) continue;
      m.a = s.mirrors[m.id] ?? m.a0 ?? 0;
      bz.syncMirror(m, true);
    }
    for (const v of bz.veils) bz.setVeil(v, s.veils.includes(v.id));
    for (const e of bz.eyes) bz.setEye(e, false);
    for (const e of this.latchEyes) if (s.solved[`eye:${e.id}`]) bz.setEye(e, true);
    for (const r of this.rotors) r.t = 0;
    for (const run of this.boulderRuns) { run.t = run.phase; for (const b of run.balls) { b.s = -1; b.m.visible = false; } }
    this.pitTargets(true);
    this.afterSun?.();
  }

  enter() {
    super.enter();
    for (const run of this.boulderRuns) { run.t = run.phase; for (const b of run.balls) { b.s = -1; b.m.visible = false; } }
  }

  // ---------------- varje bildruta ----------------
  update(dt, frozen = false) {
    super.update(dt, frozen);
    const g = this.game;
    if (!g) return;
    const p = g.player;
    this.beams.ctx.sfx = g.sfx;
    this.beams.ctx.fx = g.fx;
    const aim = p.prismUp && p.state === 'move';
    for (const o of this.beams.eyes) o.aimable = aim;
    for (const o of this.beams.mirrors) o.aimable = aim && !o.onBlock;
    for (const o of this.beams.veils) o.aimable = aim;
    // Spegelblocken: spegeln följer blocket
    for (const mb of this.mirrorBlocks) {
      const bm = mb.block.m.position, o = mb.mirror ?? mb.splitter;
      o.g.position.set(bm.x, -0.1, bm.z);
      o.pos.set(bm.x, -0.1, bm.z);
      o.center.set(bm.x, BEAM_Y, bm.z);
    }
    // Solvisaren
    for (const r of this.rotors) {
      const braked = r.plate?.pressed;
      r.ring.material = braked ? this.grooveLit : this.M.goldPlate;
      if (frozen || braked) continue;
      r.t += dt;
      r.ring.rotation.y += dt * 0.4;
      if (r.t >= r.step) {
        r.t = 0;
        r.mirror.a = (r.mirror.a + 1) % 8;
        if (r.mirror.view > r.mirror.a + 4) r.mirror.view -= 8;
        if (Math.hypot(p.feet.x - r.mirror.pos.x, p.feet.z - r.mirror.pos.z) < 30) g.sfx.play('rotor', { vol: 0.5 });
      }
    }
    this.beams.update(frozen ? 0 : dt, g);
    // Sandfall
    for (const sf of this.sandfalls) {
      const ph = ((this.t + sf.phase) % sf.period + sf.period) % sf.period;
      const on = ph < sf.on, warn = !on && ph > sf.period - 0.8;
      if (on && !sf.active && Math.hypot(p.feet.x - sf.x, p.feet.z - sf.z) < 22) g.sfx.play('sandfall', { vol: 0.7 });
      sf.active = on;
      sf.mat.opacity += ((on ? 0.92 : 0) - sf.mat.opacity) * (1 - Math.exp(-dt * 12));
      sf.trickleMat.opacity = warn ? 0.95 : 0.55;
      sf.trickle.scale.set(warn ? 2.2 : 1, 1, warn ? 2.2 : 1);
      sf.tex.offset.y -= dt * 3.2;
      if (on && !frozen && p.state !== 'dead' && Math.hypot(p.feet.x - sf.x, p.feet.z - sf.z) < sf.r + 0.3 && p.feet.y > sf.y - 1 && p.feet.y < sf.y + 3) {
        const r = p.takeHit(1, new THREE.Vector3(sf.x, sf.y, sf.z), { unblockable: true });
        if (r === 'hit') {
          g.fx.burst('ash', p.feet.clone().setY(p.feet.y + 1), 12);
          if (!this.hinted.sandfall) {
            this.hinted.sandfall = true;
            g.hud.toast('The sand falls in a rhythm. Wait for it to thin, then run!', 3400);
          }
        }
      }
    }
    // Stenkulor
    for (const run of this.boulderRuns) {
      if (frozen) break;
      run.t += dt;
      if (run.t >= run.period) {
        run.t -= run.period;
        const free = run.balls.find((b) => b.s < 0);
        if (free) {
          free.s = 0;
          free.v = 2.5;
          free.m.visible = true;
          if (p.feet.distanceTo(run.pts[0]) < 45) g.sfx.play('boulder', { vol: 0.8 });
        }
      }
      for (const b of run.balls) {
        if (b.s < 0) continue;
        b.v = Math.min(11, b.v + dt * 5);
        b.s += b.v * dt;
        b.hitT = Math.max(0, b.hitT - dt);
        if (b.s >= run.len) {
          g.fx.burst('ash', b.m.position.clone(), 20);
          if (p.feet.distanceTo(b.m.position) < 30) g.sfx.play('crumble', { vol: 0.6 });
          b.s = -1;
          b.m.visible = false;
          continue;
        }
        const pt = this.pointOn(run, b.s);
        b.m.position.set(pt.x, pt.y + run.r, pt.z);
        b.m.rotation.x -= (b.v * dt) / run.r;
        const dx = p.feet.x - pt.x, dy = p.feet.y + 0.9 - (pt.y + run.r), dz = p.feet.z - pt.z;
        if (b.hitT <= 0 && p.state !== 'dead' && Math.hypot(dx, dy, dz) < run.r + 0.55) {
          b.hitT = 1;
          const r = p.takeHit(2, b.m.position.clone(), { unblockable: true });
          if (r === 'hit') {
            g.rig.shake(0.4);
            if (!this.hinted.boulder) {
              this.hinted.boulder = true;
              g.hud.toast('Stone balls roll down the ramp! Step into a niche in the wall and let them pass.', 3800);
            }
          }
        }
      }
    }
    // Sandgroparna rör sig mot sin nivå; Cello lyfts med om han står i en grop som fylls
    for (const pit of this.pits) {
      if (Math.abs(pit.level - pit.target) < 0.001) continue;
      const step = Math.sign(pit.target - pit.level) * Math.min(Math.abs(pit.target - pit.level), dt * 1.4);
      const lv = pit.level + step;
      this.setPit(pit, lv);
      pit.tex.offset.x += step * 0.3;
      const inside = p.feet.x > pit.x0 - 0.3 && p.feet.x < pit.x1 + 0.3 && p.feet.z > pit.z0 - 0.3 && p.feet.z < pit.z1 + 0.3;
      if (inside && p.feet.y < lv + 0.05 && p.feet.y > pit.bottom - 0.5) p.teleport(p.feet.clone().setY(lv + 0.02));
    }
    // Timglasen vänder sig mjukt
    for (const hg of this.glasses) {
      const want = this.glassFlipped(hg) ? Math.PI : 0;
      hg.view += (want - hg.view) * (1 - Math.exp(-dt * 3));
      hg.turn.rotation.z = hg.view;
      const moving = this.pits.some((q) => Math.abs(q.level - q.target) > 0.01);
      hg.k = moving ? Math.min(1, hg.k + dt * 0.3) : 1;
      const top = Math.max(0.05, 1 - hg.k), bot = Math.max(0.05, hg.k);
      // Sanden rinner från den övre kolven till den undre (sett i världen)
      const upper = Math.cos(hg.view) > 0 ? hg.sandA : hg.sandB, lower = upper === hg.sandA ? hg.sandB : hg.sandA;
      upper.scale.set(top, top, top);
      lower.scale.set(bot, bot, bot);
      upper.position.y = upper === hg.sandA ? 0.45 : -0.45;
      lower.position.y = lower === hg.sandA ? 0.35 : -0.35;
      upper.rotation.x = upper === hg.sandA ? Math.PI : 0;
      lower.rotation.x = lower === hg.sandA ? 0 : Math.PI;
    }
  }
}

// Byggdelar för The Crown of Othrys (0.21), den sista fängelsehålan. Den bygger på frostens delar (rimfrost
// som bara skuggan flyger igenom, tryckplattor) och lägger till ett hinder för varje relik Cello har hittat:
//
//   rubble    – ett ras av titansten. Bara hammarens markslag krossar det.
//   stormGlass – en vägg av lila stormkristall, Kronos förbannelse. Treuddens anfall slår sönder den.
//   veil      – en slöja av Kronos mörker. Står Cello i ljuset från ett hål i taket med prismat uppe och
//               riktar det mot slöjan, brinner den upp.
//   skylight  – ljuset som faller in (där prismat fångar det)
//   (Sandalerna: väggar att springa längs över klyftor. Masken: rimfrost och plattor, som i Maw.)
//
// Här finns också Kronos själv och de tre titanhjärtan som skyddar honom.
import * as THREE from 'three';
import { box, cyl, place, rockGeo } from './geom.js';
import { FrostWing, frostMats } from './frostkit.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

let _mats = null;
export function othrysMats(M) {
  if (_mats) return _mats;
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  _mats = {
    floor: lam({ map: M.rock.map, color: 0x5a5262 }),
    wall: lam({ map: M.rock.map, color: 0x4a4352, flatShading: true }),
    wallDark: lam({ map: M.rock.map, color: 0x2e2836, flatShading: true }),
    marble: lam({ map: M.marble.map, color: 0xa8a2b0 }),
    gold: lam({ color: 0xc9a24f, emissive: 0x2a1c06 }),
    vein: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
    glass: new THREE.MeshPhongMaterial({ color: 0x9a5ae0, emissive: 0x3a1268, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.82, flatShading: true }),
    rubble: lam({ map: M.rock.map, color: 0x7a7080, flatShading: true }),
    veil: new THREE.MeshBasicMaterial({ color: 0x08040e, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    beam: new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.85, depthWrite: false }),
  };
  return _mats;
}

export class OthrysWing extends FrostWing {
  constructor(B, area, dungeon, opts) {
    super(B, area, dungeon, opts);
    this.rubbles = [];
    this.glasses = [];
    this.veils = [];
    this.lights_ = [];
  }

  // ---------------- raset (hammaren) ----------------
  rubble(id, x0, x1, z0, z1, y = 0, h = 3.6) {
    const OM = othrysMats(this.M);
    const g = new THREE.Group();
    const w = x1 - x0, d = z1 - z0;
    const n = Math.max(6, Math.round(w * d * h * 0.5));
    for (let k = 0; k < n; k++) {
      const s = 0.45 + Math.random() * 0.6;
      const m = new THREE.Mesh(rockGeo(s, 4100 + k + Math.round(x0 * 7), 0.8), OM.rubble);
      m.position.set(this.X(x0) + Math.random() * w, y + Math.random() * h * 0.9 + s * 0.3, z0 + Math.random() * d);
      g.add(m);
    }
    g.add(place(new THREE.Mesh(box(w * 0.92, h * 0.85, d * 0.92, 1), OM.rubble), this.X((x0 + x1) / 2), y + h * 0.42, (z0 + z1) / 2));
    this.D.add(g);
    const r = { id, x0: this.X(x0), x1: this.X(x1), z0, z1, y, h, g, box: null, broken: false };
    this.rubbles.push(r);
    this.onConnect.push((c) => { r.box = c.addBox(r.x0, y, z0, r.x1, y + h, z1, `rubble-${id}`); r.box.enabled = !r.broken; });
    this.interactions.push({
      label: 'Examine the rubble', area: this.id, pos: () => new THREE.Vector3((r.x0 + r.x1) / 2, y, (z0 + z1) / 2), radius: Math.max(w, d) / 2 + 1.6,
      ok: () => !r.broken,
      run: () => this.game.story.read(this.game.player.hasHammer
        ? ['A heap of fallen titan-stone, each block as big as a goat.', 'The sword would only bounce off it. A blow from above, heavy as thunder, might break it.', '(Make Cello heavy with the hammer, jump, and strike the ground beside it.)']
        : ['A heap of fallen titan-stone. Far too heavy to move.']),
    });
    return r;
  }

  breakRubble(r, silent = false) {
    if (r.broken) return;
    r.broken = true;
    this.state.solved[`rubble:${r.id}`] = true;
    r.g.visible = false;
    if (r.box) r.box.enabled = false;
    if (!silent && this.game) {
      const G = this.game, c = new THREE.Vector3((r.x0 + r.x1) / 2, r.y + 1, (r.z0 + r.z1) / 2);
      G.sfx.play('crumble', { vol: 1.2 });
      G.sfx.play('secret');
      G.rig.shake(0.5);
      G.fx.burst('debris', c, 40, 0x8a8090);
      G.fx.burst('ash', c, 20);
      G.story.save(true);
    }
  }

  slam(point, feet = point) {
    let used = super.slam(point, feet);
    for (const r of this.rubbles) {
      if (r.broken) continue;
      const dx = Math.max(r.x0 - point.x, 0, point.x - r.x1), dz = Math.max(r.z0 - point.z, 0, point.z - r.z1);
      if (Math.hypot(dx, dz) < 2.6 && Math.abs(point.y - r.y) < 2.5) { this.breakRubble(r); used = true; }
    }
    return used;
  }

  // ---------------- stormkristallen (treudden) ----------------
  stormGlass(id, x0, x1, z0, z1, y = 0, h = 4) {
    const OM = othrysMats(this.M);
    const g = new THREE.Group();
    const w = x1 - x0, d = z1 - z0;
    const n = Math.max(5, Math.round(Math.max(w, d) * 3));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, s = 0.4 + Math.random() * 0.5, hh = h * (0.6 + Math.random() * 0.45);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), OM.glass);
      m.scale.set(1, hh / s / 2, 1);
      m.position.set(this.X(x0) + (w > d ? t * w : w / 2), y + hh / 2, z0 + (w > d ? d / 2 : t * d));
      m.rotation.y = Math.random() * 3;
      g.add(m);
    }
    g.add(place(new THREE.Mesh(box(w, h * 0.8, d, 1), OM.glass), this.X((x0 + x1) / 2), y + h * 0.4, (z0 + z1) / 2));
    this.D.add(g);
    const c = { id, x0: this.X(x0), x1: this.X(x1), y0: y, y1: y + h, z0, z1, g, box: null, broken: false };
    this.glasses.push(c);
    this.onConnect.push((col) => { c.box = col.addBox(c.x0, y, z0, c.x1, y + h, z1, `glass-${id}`); c.box.enabled = !c.broken; });
    this.interactions.push({
      label: 'Examine the crystal', area: this.id, pos: () => new THREE.Vector3((c.x0 + c.x1) / 2, y, (z0 + z1) / 2), radius: Math.max(w, d) / 2 + 1.6,
      ok: () => !c.broken,
      run: () => this.game.story.read(this.game.player.hasTrident
        ? ['A wall of purple crystal, humming. The same curse that cracked the trident.', 'The sword just rings against it. But the trident knows this curse... Charge it with the trident.']
        : ['A wall of purple crystal, humming with a cold, angry sound.']),
    });
    return c;
  }

  breakGlass(c, silent = false) {
    if (c.broken) return;
    c.broken = true;
    this.state.solved[`glass:${c.id}`] = true;
    c.g.visible = false;
    if (c.box) c.box.enabled = false;
    if (!silent && this.game) {
      const G = this.game, at = new THREE.Vector3((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2);
      G.sfx.play('crystal', { vol: 1.2 });
      G.sfx.play('secret');
      G.rig.shake(0.35);
      G.fx.burst('spark', at, 40, 0xc08aff);
      G.story.save(true);
    }
  }

  // Treuddens anfall (main.js frågar varje vinge som har den här)
  dashBreak(p) {
    let hit = false;
    for (const c of this.glasses) {
      if (c.broken) continue;
      const f = p.feet;
      const dx = Math.max(c.x0 - f.x, 0, f.x - c.x1), dz = Math.max(c.z0 - f.z, 0, f.z - c.z1);
      const dy = Math.max(c.y0 - (f.y + 0.9), 0, (f.y + 0.9) - c.y1);
      if (Math.hypot(dx, dz, dy) < 1.4) { this.breakGlass(c); hit = true; }
    }
    return hit;
  }

  // ---------------- ljuset och slöjan (prismat) ----------------
  skylight(id, x, z, r = 1.3, o = {}) {
    const OM = othrysMats(this.M), y = o.y ?? 0, h = o.h ?? this.H;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 18, 1, true), OM.light);
    col.position.set(this.X(x), y + h / 2, z);
    this.D.add(col);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.35, depthWrite: false }));
    disc.position.set(this.X(x), y + 0.03, z);
    this.D.add(disc);
    this.B.lights.add({ x: this.X(x), y: y + h - 1, z, color: 0xfff0c8, power: 10, range: 10, flicker: 0 });
    const s = { id, x: this.X(x), z, y, r, col, disc };
    this.lights_.push(s);
    return s;
  }

  veil(id, x0, x1, z0, z1, y = 0, h = 4) {
    const OM = othrysMats(this.M);
    const g = new THREE.Group();
    const w = x1 - x0, d = z1 - z0, along = w > d ? 'x' : 'z';
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w, d), h, 8, 4), OM.veil.clone());
    plane.position.set(this.X((x0 + x1) / 2), y + h / 2, (z0 + z1) / 2);
    if (along === 'z') plane.rotation.y = Math.PI / 2;
    g.add(plane);
    // Tunna mörka slingor som rör sig framför slöjan
    const wisps = [];
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, h * 0.8), new THREE.MeshBasicMaterial({ color: 0x3a1a5a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
      m.position.copy(plane.position);
      if (along === 'z') m.rotation.y = Math.PI / 2;
      g.add(m);
      wisps.push({ m, ph: Math.random() * 6 });
    }
    this.D.add(g);
    const v = { id, x0: this.X(x0), x1: this.X(x1), z0, z1, y, h, along, g, plane, wisps, box: null, burnt: false, heat: 0 };
    v.center = new THREE.Vector3((v.x0 + v.x1) / 2, y + 1.3, (z0 + z1) / 2);
    this.veils.push(v);
    this.onConnect.push((c) => { v.box = c.addBox(v.x0 - (along === 'z' ? 0.2 : 0), y, z0 - (along === 'x' ? 0.2 : 0), v.x1 + (along === 'z' ? 0.2 : 0), y + h, z1 + (along === 'x' ? 0.2 : 0), `veil-${id}`); v.box.enabled = !v.burnt; });
    this.interactions.push({
      label: 'Examine the darkness', area: this.id, pos: () => v.center.clone().setY(y), radius: 2.6,
      ok: () => !v.burnt,
      run: () => this.game.story.read(this.game.player.hasPrism
        ? ['A curtain of living darkness. It drinks the light of the lantern, and the sword passes through it like smoke.', 'Real sunlight might burn it. Stand in the light from above, hold up the prism, and turn it toward the dark.']
        : ['A curtain of living darkness. Nothing passes through it.']),
    });
    // Strålen från prismat till slöjan
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true).rotateX(Math.PI / 2), othrysMats(this.M).beam);
    beam.visible = false;
    this.D.add(beam);
    v.beam = beam;
    return v;
  }

  burnVeil(v, silent = false) {
    if (v.burnt) return;
    v.burnt = true;
    this.state.solved[`veil:${v.id}`] = true;
    v.g.visible = false;
    v.beam.visible = false;
    if (v.box) v.box.enabled = false;
    if (!silent && this.game) {
      const G = this.game;
      G.sfx.play('veilburn');
      G.sfx.play('secret');
      G.fx.burst('spark', v.center, 40, 0xfff0b0);
      G.fx.burst('ash', v.center, 24);
      G.story.save(true);
    }
  }

  inLight(p) {
    return this.lights_.some((s) => Math.hypot(p.feet.x - s.x, p.feet.z - s.z) < s.r + 0.2 && Math.abs(p.feet.y - s.y) < 1.5);
  }

  applyState() {
    const s = this.state;
    s.solved = s.solved || {};
    for (const r of this.rubbles) { r.broken = false; r.g.visible = true; if (r.box) r.box.enabled = true; if (s.solved[`rubble:${r.id}`]) this.breakRubble(r, true); }
    for (const c of this.glasses) { c.broken = false; c.g.visible = true; if (c.box) c.box.enabled = true; if (s.solved[`glass:${c.id}`]) this.breakGlass(c, true); }
    for (const v of this.veils) { v.burnt = false; v.heat = 0; v.g.visible = true; if (v.box) v.box.enabled = true; if (s.solved[`veil:${v.id}`]) this.burnVeil(v, true); }
    super.applyState();
  }

  update(dt, frozen = false) {
    super.update(dt, frozen);
    const g = this.game;
    if (!g) return;
    const p = g.player, t = this.t;
    for (const v of this.veils) {
      if (v.burnt) continue;
      for (const w of v.wisps) {
        const k = Math.sin(t * 0.8 + w.ph);
        if (v.along === 'x') w.m.position.x = v.center.x + k * (v.x1 - v.x0) * 0.4;
        else w.m.position.z = v.center.z + k * (v.z1 - v.z0) * 0.4;
        w.m.material.opacity = 0.35 + 0.25 * Math.sin(t * 1.7 + w.ph);
      }
      // Prismat uppe, i ljuset, riktat mot slöjan (inom 40 grader och 16 meter)
      let aim = false;
      if (!frozen && p.prismUp && p.state === 'move' && this.inLight(p)) {
        const dx = v.center.x - p.feet.x, dz = v.center.z - p.feet.z, d = Math.hypot(dx, dz);
        aim = d < 16 && Math.abs(wrap(Math.atan2(dx, dz) - p.facing)) < 0.7;
      }
      if (aim) {
        v.heat += dt;
        const from = p.feet.clone().setY(p.feet.y + 1.3), to = v.center;
        v.beam.visible = true;
        v.beam.position.lerpVectors(from, to, 0.5);
        v.beam.scale.set(1, 1, from.distanceTo(to));
        v.beam.lookAt(to);
        v.plane.material.opacity = 0.92 - Math.min(0.6, v.heat * 0.4);
        if (Math.random() < dt * 30) g.fx.burst('spark', to.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 - 0.5, (Math.random() - 0.5) * 2)), 2, 0xfff0b0);
        if (!this.hinted[`veil${v.id}`]) { this.hinted[`veil${v.id}`] = true; g.sfx.play('sizzle'); }
        if (v.heat > 1.6) this.burnVeil(v);
      } else {
        v.heat = Math.max(0, v.heat - dt * 0.5);
        v.beam.visible = false;
        v.plane.material.opacity = 0.92 - Math.min(0.6, v.heat * 0.4);
      }
    }
    for (const s of this.lights_) s.disc.material.opacity = 0.28 + 0.1 * Math.sin(t * 2 + s.x);
  }
}

// =====================================================================
// Kronos och titanhjärtana
// =====================================================================
// Kronos står i norr i en rund sal under öppen himmel. Tre titanhjärtan (stormens, havets och frostens) skyddar
// honom; varje hjärta krossas med en relik:
//   stormhjärtat (gult)  svävar lågt runt hans fötter. Svärdet studsar. Hammarens markslag krossar det.
//   havshjärtat (grönt)  far runt salen. Svärdet når inte. Treuddens anfall träffar det.
//   frosthjärtat (vitt)  står på en pelare bakom rimfrost. Skuggan flyger igenom: byt plats och hugg.
// När alla tre är borta faller han på knä, och kristallen i bröstet kommer inom räckhåll. Tre hugg, och han
// reser sig med nya hjärtan och blir argare. Tredje gången faller han.

const CORE_KINDS = {
  storm: { name: 'Storm Heart', color: 0xffd860, hint: 'The blade bounces off the storm heart! It crackles near the ground... strike the ground beside it with the hammer.' },
  sea: { name: 'Sea Heart', color: 0x5af0d0, hint: 'The sea heart slips away from the blade like water! Charge it with the trident.' },
  frost: { name: 'Frost Heart', color: 0xe0f6ff, hint: 'The frost heart is behind the rime. Only a shadow could pass... and then trade places with it.' },
};

class TitanCore {
  constructor(scene, kind, boss) {
    this.kind = kind;
    this.boss = boss;
    this.isSmall = true;
    this.noWear = false;
    this.hitRadius = 0.7;
    const def = CORE_KINDS[kind];
    this.blockHint = def.hint;
    this.immuneHint = def.hint;
    this.pos = new THREE.Vector3();
    this.chestPos = new THREE.Vector3();
    this.g = new THREE.Group();
    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshBasicMaterial({ color: def.color }));
    this.g.add(this.orb);
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.3, wireframe: true }));
    this.g.add(this.shell);
    scene.add(this.g);
    this.g.visible = false;
    this.state = 'dormant';
    this.alive = false;
    this.t = Math.random() * 6;
    this.model = { root: this.g };
    this.clearId = 'kronos';
  }

  get targetable() { return this.alive; }
  get chest() { return this.chestPos.copy(this.pos); }

  spawn() { this.alive = true; this.state = 'live'; this.g.visible = true; this.g.scale.setScalar(0.01); this.grow = 0; }
  reset() { this.alive = false; this.state = 'dormant'; this.g.visible = false; }

  shatter(g) {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'gone';
    this.g.visible = false;
    const col = CORE_KINDS[this.kind].color;
    g.sfx.play('crystal', { vol: 1.3 });
    g.sfx.play('shieldbreak', { vol: 1 });
    g.fx.burst('spark', this.pos.clone(), 40, col);
    g.fx.shockwave(this.pos.clone().setY(this.boss.center.y + 0.1), col, 3.5);
    g.lights.flash(this.pos.clone(), col, 40, 12, 0.4);
    g.rig.shake(0.35);
    this.boss.onCoreBroken(this, g);
  }

  canSwordHit(player) {
    if (!this.alive) return false;
    return Math.hypot(this.pos.x - player.feet.x, this.pos.z - player.feet.z) < 2.0 && Math.abs(this.pos.y - player.feet.y - 1) < 1.6;
  }

  hurt() {
    if (!this.alive) return false;
    if (this.kind !== 'frost') return 'immune';
    this.shatter(this.boss.g);
    return 'killed';
  }

  slamHit(point) {
    if (!this.alive || this.kind !== 'storm') return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 3.4) this.shatter(this.boss.g);
  }

  dashHit(p) {
    if (!this.alive) return false;
    if (Math.hypot(this.pos.x - p.feet.x, this.pos.z - p.feet.z) > 2.2 || Math.abs(this.pos.y - p.feet.y - 1) > 1.8) return false;
    if (this.kind !== 'sea') return 'blocked';
    this.shatter(this.boss.g);
    return 'hit';
  }

  update(dt) {
    this.t += dt;
    if (!this.alive) return;
    this.grow = Math.min(1, (this.grow ?? 1) + dt * 1.5);
    this.g.scale.setScalar(this.grow * (1 + 0.08 * Math.sin(this.t * 7)));
    this.orb.rotation.y += dt * 2;
    this.shell.rotation.x += dt * 0.9;
    this.shell.rotation.y -= dt * 1.3;
    this.g.position.copy(this.pos);
  }
}

// Kronos av sten, storm, hav och is: en jätte i en mantel av moln, med en skära (harpe) och en krona av is
function buildKronos() {
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const M = {
    stone: lam(0x3e364a, { emissive: 0x0e0618 }),
    cloud: lam(0x3a3448, { transparent: true, opacity: 0.92 }),
    sea: lam(0x2a5a5a, { emissive: 0x062020 }),
    ice: lam(0xc8e8ff, { emissive: 0x1a3040 }),
    vein: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
    eye: new THREE.MeshBasicMaterial({ color: 0xd8a0ff }),
    blade: lam(0x9aa0b0, { emissive: 0x18101e }),
    crystal: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Manteln (som ben): en vid kon av moln, och vågor av hav runt fållen
  const robe = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.5, 12, 3, true), M.cloud);
  robe.position.y = 3.75;
  body.add(robe);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.6, 6, 18).rotateX(Math.PI / 2), M.sea);
  hem.position.y = 0.4;
  body.add(hem);
  const torso = new THREE.Group();
  torso.position.y = 7.2;
  body.add(torso);
  const chestM = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.7, 4.2, 10), M.stone);
  chestM.position.y = 2.1;
  torso.add(chestM);
  // Lila ådror över bröstet, och kristallen mitt i (det enda stället där han kan skadas)
  for (let k = 0; k < 6; k++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 0.16), M.vein);
    const an = -0.9 + k * 0.36;
    v.position.set(Math.sin(an) * 2.05, 2.1, Math.cos(an) * 2.05);
    v.rotation.z = (k - 2.5) * 0.12;
    torso.add(v);
  }
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), M.crystal);
  crystal.scale.y = 1.4;
  crystal.position.set(0, 2.4, 2.05);
  torso.add(crystal);
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), M.stone);
    sh.position.set(s * 2.5, 3.8, 0);
    torso.add(sh);
    // Isspetsar på axlarna
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 5), M.ice);
      sp.position.set(s * (2.4 + k * 0.3), 4.8, -0.4 + k * 0.4);
      sp.rotation.z = -s * 0.5;
      torso.add(sp);
    }
  }
  const head = new THREE.Group();
  head.position.y = 4.7;
  torso.add(head);
  head.add(place(new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), M.stone), 0, 0.9, 0));
  for (const s of [-1, 1]) head.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.eye), s * 0.45, 1.05, 1.02));
  // Skägget av rimfrost
  head.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 8).rotateX(Math.PI), M.ice), 0, 0.0, 0.5));
  // Kronan av is
  const crown = new THREE.Group();
  crown.position.y = 2.0;
  head.add(crown);
  for (let k = 0; k < 9; k++) {
    const an = (k / 9) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2 + (k % 2) * 0.8, 5), M.ice);
    sp.position.set(Math.cos(an) * 0.95, 0.5, Math.sin(an) * 0.95);
    crown.add(sp);
  }
  crown.add(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 6, 18).rotateX(Math.PI / 2), M.ice));
  // Armarna
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 2.6, 3.6, 0);
    torso.add(sh);
    sh.add(place(new THREE.Mesh(cyl(0.65, 0.55, 3.4, 8, 1), M.stone), 0, -1.7, 0));
    const el = new THREE.Group();
    el.position.y = -3.4;
    sh.add(el);
    el.add(place(new THREE.Mesh(cyl(0.55, 0.45, 3.0, 8, 1), M.stone), 0, -1.5, 0));
    el.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), M.stone), 0, -3.2, 0));
    arms.push({ sh, el });
  }
  // Skäran (harpe) i höger hand: ett långt skaft och ett krökt blad
  const scythe = new THREE.Group();
  scythe.position.set(0, -3.2, 0);
  arms[1].el.add(scythe);
  // Skaftet sticker ut nedanför näven, och bladet sitter längst ut (det böjer sig framåt)
  scythe.add(place(new THREE.Mesh(cyl(0.16, 0.16, 7.5, 6, 1), M.stone), 0, -1.6, 0));
  const blade = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.24, 4, 22, Math.PI * 0.85), M.blade);
  blade.scale.set(1, 1, 0.3);
  blade.rotation.set(Math.PI / 2, 0, Math.PI * 0.55);
  blade.position.set(0, -5.2, 1.9);
  scythe.add(blade);
  // en lila egg längs bladet
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 3, 22, Math.PI * 0.8), M.vein);
  edge.rotation.copy(blade.rotation);
  edge.position.copy(blade.position);
  scythe.add(edge);
  // Ögonens sken
  const light = new THREE.PointLight(0xb070ff, 8, 18, 1.6);
  light.position.set(0, 2.6, 2.6);
  torso.add(light);
  return { root, body, torso, head, crown, crystal, arms, scythe, mats: Object.values(M), M };
}

export class Kronos {
  constructor(scene, center, home, o = {}) {
    this.scene = scene;
    this.center = center.clone();
    this.home = home.clone();
    this.R = o.R ?? 22;
    this.frostSpots = o.frostSpots ?? [];
    this.model = buildKronos();
    scene.add(this.model.root);
    this.pos = home.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 16;
    this.hitRadius = 3.2;
    this.bossName = 'Kronos, King of the Titans';
    this.onEvent = null;
    this.blockHint = 'Three titan hearts shield Kronos! Break the storm, sea and frost hearts first.';
    this.immuneHint = this.blockHint;
    this.cores = ['storm', 'sea', 'frost'].map((k) => new TitanCore(scene, k, this));
    const ringMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.boltRings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.5, 28).rotateX(-Math.PI / 2), ringMat(0xc890ff)); scene.add(m); return m; });
    this.sweepRing = new THREE.Mesh(new THREE.RingGeometry(3, 11, 40).rotateX(-Math.PI / 2), ringMat(0xff4a6a));
    scene.add(this.sweepRing);
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.25, 48).rotateX(-Math.PI / 2), ringMat(0x5af0d0));
    scene.add(this.wave);
    // Rimfrosten runt frosthjärtats två pelare (skuggan flyger igenom, Cello inte)
    this.rimeRings = [];
    const iceMat = new THREE.MeshPhongMaterial({ color: 0xbfe8ff, emissive: 0x2a5a7a, transparent: true, opacity: 0.85 });
    for (const sp of this.frostSpots) {
      const g = new THREE.Group();
      for (let k = 0; k < 28; k++) {
        const an = (k / 28) * Math.PI * 2, hgt = 3 + Math.random() * 0.8;
        const ic = new THREE.Mesh(new THREE.ConeGeometry(0.12, hgt, 5), iceMat);
        ic.position.set(sp.x + Math.cos(an) * 2.3, sp.y + hgt / 2, sp.z + Math.sin(an) * 2.3);
        g.add(ic);
      }
      // Pelaren i mitten
      g.add(place(new THREE.Mesh(cyl(0.5, 0.65, 1.2, 8, 1), new THREE.MeshLambertMaterial({ color: 0x5a5262 })), sp.x, sp.y + 0.6, sp.z));
      scene.add(g);
      this.rimeRings.push({ g, sp, boxes: [] });
    }
    this.reset();
  }

  // Kollisionslådorna för rimfrosten (fyra per pelare)
  connect(c) {
    for (const r of this.rimeRings) {
      const { x, y, z } = r.sp, s = 2.3, t = 0.25;
      for (const [x0, x1, z0, z1] of [[x - s, x + s, z - s - t, z - s + t], [x - s, x + s, z + s - t, z + s + t], [x - s - t, x - s + t, z - s, z + s], [x + s - t, x + s + t, z - s, z + s]]) {
        const b = c.addBox(x0, y, z0, x1, y + 3.6, z1, 'kronos-rime');
        b.shadowPass = true;
        r.boxes.push(b);
      }
    }
  }

  reset() {
    this.hp = 9;
    this.hits = 0;
    this.phaseN = 1;
    this.state = 'dormant';
    this.st = 0;
    this.pos.copy(this.home);
    this.facing = Math.atan2(this.center.x - this.home.x, this.center.z - this.home.z);
    this.attack = null;
    this.cool = 3;
    this.flash = 0;
    this.waveT = -1;
    for (const c of this.cores) c.reset();
    for (const r of this.boltRings) r.material.opacity = 0;
    this.sweepRing.material.opacity = 0;
    this.wave.material.opacity = 0;
    this.frostIdx = 0;
    this.syncRime();
    this.animate(0.001);
  }

  get targetable() { return !['dormant', 'dead', 'gone'].includes(this.state); }
  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.model.crystal.getWorldPosition(this.chestPos);
  }
  get shielded() { return this.cores.some((c) => c.alive); }

  wake() { if (this.state === 'dormant') this.setState('rise'); }
  setState(s) { this.state = s; this.st = 0; }

  // Bara den aktiva pelarens rimfrost står uppe
  syncRime() {
    this.rimeRings.forEach((r, i) => {
      const on = i === this.frostIdx && this.state !== 'dormant' && this.state !== 'gone' && this.state !== 'dead';
      r.g.visible = on || this.state === 'dormant';
      for (const b of r.boxes) b.enabled = on;
    });
  }

  spawnCores() {
    const fs = this.frostSpots[this.frostIdx];
    for (const c of this.cores) {
      c.spawn();
      if (c.kind === 'frost' && fs) c.pos.set(fs.x, fs.y + 1.9, fs.z);
    }
    this.syncRime();
  }

  onCoreBroken(core, g) {
    this.onEvent?.('core', this, core);
    if (core.kind === 'frost') {
      // Rimfrosten runt pelaren rasar när hjärtat krossas
      const r = this.rimeRings[this.frostIdx];
      for (const b of r.boxes) b.enabled = false;
      r.g.visible = false;
      g.sfx.play('icecrack', { vol: 1.2 });
    }
    if (!this.shielded) {
      this.attack = null;
      this.clearTells();
      this.setState('kneel');
      g.sfx.play('bigroar', { vol: 1.3 });
      g.rig.shake(0.9);
      this.onEvent?.('kneel', this);
    }
  }

  clearTells() {
    for (const r of this.boltRings) r.material.opacity = 0;
    this.sweepRing.material.opacity = 0;
  }

  canSwordHit(player) {
    if (this.state !== 'kneel') return false;
    const c = this.chest;
    return Math.hypot(c.x - player.feet.x, c.z - player.feet.z) < 3.6 && Math.abs(c.y - player.feet.y - 1) < 2.6;
  }

  hurt() {
    if (!this.targetable) return false;
    if (this.state !== 'kneel') return 'blocked';
    this.hp -= 1;
    this.hits++;
    this.flash = 0.2;
    if (this.hp <= 0) { this.setState('dead'); this.clearTells(); this.onEvent?.('dying', this); return 'killed'; }
    if (this.hits >= 3) { this.hits = 0; this.phaseN++; this.setState('roar'); this.onEvent?.('phase', this); }
    return 'hit';
  }

  dashHit(p) {
    if (this.state !== 'kneel') return false;
    const c = this.chest;
    if (Math.hypot(c.x - p.feet.x, c.z - p.feet.z) > 3.6) return false;
    return this.hurt();
  }

  slamHit() {}

  // ---------------- anfallen ----------------
  startBolts(p, g) {
    const n = this.phaseN;
    this.attack = { kind: 'bolt', t: 0, spots: [], next: 0, n, done: 0 };
    g.sfx.play('growl', { vol: 1.2 });
  }

  startSweep(g) {
    this.attack = { kind: 'sweep', t: 0, hit: false };
    g.sfx.play('roar', { vol: 0.9 });
  }

  startWave(g) {
    this.attack = { kind: 'wave', t: 0, fired: false };
    g.sfx.play('growl', { vol: 1.3 });
  }

  runAttack(dt, g) {
    const a = this.attack, p = g.player;
    a.t += dt;
    if (a.kind === 'bolt') {
      // Blixtarna faller en i taget där Cello står (ringen följer honom en stund, sedan står den still)
      const wind = this.phaseN >= 3 ? 0.95 : 1.15, gap = 0.55;
      while (a.spots.length < a.n && a.t >= a.spots.length * gap) a.spots.push({ at: p.feet.clone(), t: 0, fired: false, ring: this.boltRings[a.spots.length] });
      for (const s of a.spots) {
        if (s.fired) continue;
        s.t += dt;
        if (s.t < wind * 0.55) s.at.set(p.feet.x, p.feet.y, p.feet.z);
        s.ring.position.set(s.at.x, s.at.y + 0.06, s.at.z);
        s.ring.material.opacity = 0.35 + 0.5 * Math.sin(s.t * (s.t > wind * 0.55 ? 26 : 10)) ** 2;
        if (s.t >= wind) {
          s.fired = true;
          a.done++;
          s.ring.material.opacity = 0;
          const top = s.at.clone().setY(s.at.y + 30);
          g.fx.bolt(top, s.at.clone(), 0.35, 0xe0c8ff);
          g.fx.shockwave(s.at.clone().setY(s.at.y + 0.1), 0xc890ff, 2.6);
          g.lights.flash(s.at.clone().setY(s.at.y + 2), 0xd8c0ff, 60, 16, 0.35);
          g.sfx.play('thunder', { vol: 1 });
          g.sfx.play('zap', { vol: 0.9 });
          g.rig.shake(0.35);
          if (Math.hypot(p.feet.x - s.at.x, p.feet.z - s.at.z) < 2.4 && p.feet.y < s.at.y + 2.2) p.takeHit(2, s.at, { unblockable: true });
        }
      }
      if (a.done >= a.n) return true;
    } else if (a.kind === 'sweep') {
      const wind = this.phaseN >= 3 ? 0.9 : 1.15;
      this.sweepRing.position.set(this.pos.x, this.center.y + 0.07, this.pos.z);
      if (a.t < wind) this.sweepRing.material.opacity = 0.25 + 0.4 * Math.sin(a.t * (a.t > wind * 0.6 ? 22 : 9)) ** 2;
      else this.sweepRing.material.opacity = Math.max(0, 0.6 - (a.t - wind) * 3);
      if (!a.hit && a.t >= wind + 0.15) {
        a.hit = true;
        g.sfx.play('swing', { vol: 1.6, rate: 0.5 });
        g.sfx.play('gust', { vol: 1 });
        g.rig.shake(0.5);
        g.fx.shockwave(this.pos.clone().setY(this.center.y + 1), 0xff6a8a, 11, 0.35);
        const d = Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z);
        const airborne = !p.grounded && p.feet.y > this.center.y + 0.5;
        if (d > 2.5 && d < 11 && !airborne) p.takeHit(2, this.pos, { unblockable: false });
      }
      if (a.t > wind + 0.9) { this.sweepRing.material.opacity = 0; return true; }
    } else if (a.kind === 'wave') {
      // En våg av havsvatten breder ut sig från honom: hoppa över den
      if (!a.fired && a.t > 0.9) {
        a.fired = true;
        this.waveT = 0;
        this.wave.position.set(this.pos.x, this.center.y + 0.12, this.pos.z);
        g.sfx.play('tide', { vol: 1.2 });
        g.sfx.play('stomp', { vol: 1.2 });
        g.rig.shake(0.6);
      }
      if (a.fired && this.waveT < 0) return true;
    }
    return false;
  }

  update(dt, g) {
    this.g = g;
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    // Hjärtanas banor (hjärtana uppdateras själva, de ligger också bland vingens bossar)
    const T = performance.now() / 1000;
    for (const c of this.cores) {
      if (!c.alive) continue;
      if (c.kind === 'storm') {
        const an = T * (0.7 + this.phaseN * 0.15);
        c.pos.set(this.pos.x + Math.cos(an) * 6, this.center.y + 0.9 + Math.sin(T * 3) * 0.15, this.pos.z + Math.sin(an) * 6 + 3);
      } else if (c.kind === 'sea') {
        const an = -T * (0.28 + this.phaseN * 0.06), r = this.R * 0.62;
        c.pos.set(this.center.x + Math.cos(an) * r, this.center.y + 1.2 + Math.sin(T * 2.2) * 0.3, this.center.z + Math.sin(an) * r);
      }
    }
    const lookAt = (v, rate = 2.5) => { this.facing = approach(this.facing, this.facing + wrap(Math.atan2(v.x - this.pos.x, v.z - this.pos.z) - this.facing), rate, dt); };
    switch (this.state) {
      case 'rise':
        if (this.st < 0.1) { g.sfx.play('bigroar', { vol: 1.4 }); g.rig.shake(1.0); }
        if (this.st > 1.2 && !this.shielded && this.cores.every((c) => c.state !== 'live')) this.spawnCores();
        if (this.st > 3) { this.setState('fight'); this.onEvent?.('awake', this); }
        break;
      case 'fight': {
        lookAt(p.feet);
        if (this.attack) {
          if (this.runAttack(dt, g)) { this.attack = null; this.cool = Math.max(1.0, 2.5 - this.phaseN * 0.4); }
          break;
        }
        this.cool -= dt;
        if (this.cool > 0) break;
        const d = Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z);
        const r = Math.random();
        if (d < 10 && r < 0.55) this.startSweep(g);
        else if (this.phaseN >= 2 && r < 0.8) this.startWave(g);
        else this.startBolts(p, g);
        break;
      }
      case 'kneel':
        // På knä: kristallen i bröstet kommer ner inom räckhåll
        lookAt(p.feet, 1);
        if (this.st > 8.5) {
          this.onEvent?.('recover', this);
          this.setState('roar');
        }
        break;
      case 'roar':
        if (this.st < 0.1) { g.sfx.play('bigroar', { vol: 1.5 }); g.rig.shake(1.1); this.onEvent?.('roar', this); }
        if (this.st > 1.4 && !this.shielded) {
          this.frostIdx = (this.frostIdx + 1) % Math.max(1, this.frostSpots.length);
          this.spawnCores();
        }
        if (this.st > 2.6) { this.cool = 1.6; this.setState('fight'); }
        break;
      case 'dead':
        if (Math.random() < dt * 30) g.fx.burst('spark', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 3 - 1, (Math.random() - 0.5) * 5)), 4, 0xd8b0ff);
        if (this.st < 0.1) for (const c of this.cores) c.reset();
        if (this.st > 5) { this.state = 'gone'; this.syncRime(); this.onEvent?.('defeated', this); }
        break;
      default:
        break;
    }
    // Vågen
    if (this.waveT >= 0) {
      const prev = this.waveT;
      this.waveT += dt;
      const speed = 8.5, r = this.waveT * speed;
      this.wave.scale.setScalar(Math.max(0.01, r));
      this.wave.material.opacity = Math.max(0, 0.85 * (1 - r / (this.R + 2)));
      const d = Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z), rPrev = prev * speed;
      if (d > rPrev - 0.6 && d < r + 0.6 && p.grounded && p.feet.y < this.center.y + 0.6 && !this.waveHit) {
        this.waveHit = true;
        p.takeHit(2, this.pos, { unblockable: true });
      }
      if (r > this.R + 2) { this.waveT = -1; this.waveHit = false; this.wave.material.opacity = 0; }
    }
    this.animate(dt);
  }

  animate(dt) {
    const m = this.model, t = performance.now() / 1000;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    const R = m.arms[1], L = m.arms[0];
    let rx = -0.3 + Math.sin(t * 0.7) * 0.05, rz = 0.25, ex = -0.6, lx = 0.1, lz = -0.3, tx = 0, drop = 0, headX = 0;
    const a = this.attack;
    if (this.state === 'dormant') { tx = 0.35; headX = 0.5; drop = 1.5; }
    else if (this.state === 'rise') { tx = 0.35 * Math.max(0, 1 - this.st / 2); headX = 0.5 * Math.max(0, 1 - this.st / 2); drop = 1.5 * Math.max(0, 1 - this.st / 2); lx = -2.4 * Math.min(1, this.st / 2); }
    else if (this.state === 'kneel') { tx = 0.75; drop = 4.6; headX = 0.4; rx = -0.2; lx = -0.4; ex = -0.2; }
    else if (this.state === 'roar') { rx = -2.6; lx = -2.6; tx = -0.25; }
    else if (this.state === 'dead') { tx = 0.9; drop = 5.2; headX = 0.8; rx = 0.2; lx = 0.2; }
    else if (a?.kind === 'sweep') {
      const wind = this.phaseN >= 3 ? 0.9 : 1.15;
      if (a.t < wind) { rx = -1.6; rz = 1.3; tx = -0.1; }
      else { rx = -1.4; rz = -1.2; tx = 0.15; }
    } else if (a?.kind === 'bolt') { lx = -2.8; lz = -0.2; }
    else if (a?.kind === 'wave') { rx = -2.2; lx = -2.2; if (a.fired) { rx = -0.6; lx = -0.6; tx = 0.4; } }
    m.torso.rotation.x = approach(m.torso.rotation.x, tx, 4, dt);
    m.body.position.y = approach(m.body.position.y, -drop, 3, dt);
    m.head.rotation.x = approach(m.head.rotation.x, headX, 3, dt);
    R.sh.rotation.x = approach(R.sh.rotation.x, rx, a?.kind === 'sweep' && a.t > 1 ? 16 : 4, dt);
    R.sh.rotation.z = approach(R.sh.rotation.z, rz, a?.kind === 'sweep' && a.t > 1 ? 16 : 4, dt);
    R.el.rotation.x = approach(R.el.rotation.x, ex, 5, dt);
    L.sh.rotation.x = approach(L.sh.rotation.x, lx, 3, dt);
    L.sh.rotation.z = approach(L.sh.rotation.z, lz, 3, dt);
    m.crown.rotation.y = t * 0.3;
    const pulse = 0.6 + 0.4 * Math.sin(t * (this.state === 'kneel' ? 9 : 4));
    m.crystal.material.color.setRGB(0.55 + 0.35 * pulse * (this.state === 'kneel' ? 1.4 : 0.6), 0.3, 1);
    m.crystal.scale.setScalar(this.state === 'kneel' ? 1.35 : 1).multiply(new THREE.Vector3(1, 1.4, 1));
    const f = this.flash > 0 ? 0.8 : 0;
    for (const mt of m.mats) {
      if (!mt.emissive) continue;
      mt.userData.e0 ??= mt.emissive.clone();
      mt.emissive.copy(mt.userData.e0);
      if (f) mt.emissive.setRGB(f * 0.9, f * 0.7, f);
    }
  }
}

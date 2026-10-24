// Byggdelar för The Windbound Spire (0.14): ett torn av vit marmor och brons, byggt kring Hermes' Wing Sandals.
//
//   · Uppvindar (updraft): luftpelare som lyfter Cello. Några blåser alltid, andra öppnas med vindventiler.
//   · Väggar att springa på (runWall): marmor med bronsfjädrar, så att man ser var sandalerna fungerar.
//   · The Brass Weaver: spindelgolemen (Elias Boss4). Klättrar upp i taket och släpper sig ner mot Cello;
//     fastnar en stund i golvet (eller blir yr av ett markslag) – då ligger kärnan i bröstet öppen.
//   · Typhon: titanen i vinden. Reser sig ur molnen bredvid tornets krona, blåser, kastar blixtar och slår
//     med näven. Näven som vilar på plattformen har en stormrunsten; tre hugg och han sjunker ihop.
//     Då öppnas uppvinden i mitten, och från den övre ringen når Cello hjärtat i hans bröst.
import * as THREE from 'three';
import { Wing } from './dkit.js';
import { box, cyl, place } from './geom.js';
import { mulberry, soften, smoothTexture } from './textures.js';
import { ring } from './titan.js';
import { skinnedModel, hasModel } from './skinned.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function tex(size, seed, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, mulberry(seed));
  return smoothTexture(new THREE.CanvasTexture(soften(c, { seed })));
}
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function noise(g, s, r, [R, G, B], k) {
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = (r() - 0.5) * 2 * k;
    g.fillStyle = rgb(R + v, G + v, B + v * 0.9);
    g.fillRect(x, y, 1, 1);
  }
}

let MATS = null;
export function spireMats() {
  if (MATS) return MATS;
  const marble = tex(32, 901, (g, s, r) => {
    noise(g, s, r, [214, 210, 200], 6);
    g.strokeStyle = 'rgba(150,150,160,0.5)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      let x = r() * s, y = 0;
      g.moveTo(x, y);
      while (y < s) { x += (r() - 0.5) * 6; y += 3 + r() * 3; g.lineTo(x, y); }
      g.stroke();
    }
  });
  const flag = tex(32, 902, (g, s, r) => {
    noise(g, s, r, [186, 182, 172], 8);
    g.fillStyle = 'rgba(110,104,96,0.8)';
    for (let k = 0; k < s; k += 16) { g.fillRect(0, k, s, 1); g.fillRect(k + ((k / 16) % 2) * 8, 0, 1, s); }
  });
  const bronze = tex(32, 903, (g, s, r) => {
    noise(g, s, r, [156, 112, 56], 10);
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(60,140,120,0.35)'; g.fillRect(r() * s, r() * s, 2 + r() * 3, 1 + r() * 2); }
  });
  // Väggarna man kan springa på: marmor med bronsfjädrar i rad
  const feather = tex(32, 904, (g, s, r) => {
    noise(g, s, r, [206, 202, 192], 5);
    for (let k = 0; k < 2; k++) {
      const cx = 8 + k * 16;
      g.fillStyle = 'rgb(176,128,58)';
      g.fillRect(cx - 0.5, 4, 1, 24);
      for (let j = 0; j < 9; j++) {
        g.fillRect(cx - 5 + j * 0.2, 6 + j * 2.4, 4.5 - j * 0.35, 1);
        g.fillRect(cx + 0.5, 6 + j * 2.4, 4.5 - j * 0.35, 1);
      }
    }
  });
  const cloud = tex(32, 905, (g, s, r) => {
    noise(g, s, r, [168, 176, 190], 12);
  });
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  MATS = {
    marble: lam({ map: marble }), flag: lam({ map: flag }), bronze: lam({ map: bronze }), feather: lam({ map: feather }),
    cloud: lam({ map: cloud }), gold: lam({ color: 0xd8b04a, emissive: 0x2a1c06 }),
    sky: new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55, fog: false }),
    glow: new THREE.MeshBasicMaterial({ color: 0xe8fbff }),
  };
  return MATS;
}

// Luftpelarens strimmor (en textur som rullar uppåt)
let STREAK = null;
function streakTex() {
  if (STREAK) return STREAK;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const r = mulberry(77);
  for (let i = 0; i < 26; i++) {
    const x = r() * 64, y = r() * 128, h = 18 + r() * 40;
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, `rgba(230,248,255,${0.35 + r() * 0.4})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(x, y, 1.5 + r() * 2, h);
    if (y + h > 128) g.fillRect(x, y - 128, 1.5, h);
  }
  STREAK = new THREE.CanvasTexture(c);
  STREAK.wrapS = STREAK.wrapT = THREE.RepeatWrapping;
  STREAK.colorSpace = THREE.SRGBColorSpace;
  return STREAK;
}

export class SpireWing extends Wing {
  constructor(B, area, dungeon, opts) {
    super(B, area, dungeon, opts);
    this.drafts = [];
    this.valves = [];
    area.updrafts = area.updrafts ?? [];
  }

  // En uppvind (lokala koordinater). o.valve: öppnas av en ventil (annars blåser den alltid)
  updraft(id, x, z, r, y0, y1, o = {}) {
    const t = streakTex().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(r * 1.5)), (y1 - y0) / 6);
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, y1 - y0, 20, 1, true), mat);
    col.position.set(this.ox + x, (y0 + y1) / 2, z);
    this.D.add(col);
    // Gallret i golvet där vinden kommer upp
    const grate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.12, 20), spireMats().bronze);
    grate.position.set(this.ox + x, y0 + 0.04, z);
    this.D.add(grate);
    const d = { id, x: this.ox + x, z, r, y0, y1, power: o.power ?? 9, on: !o.valve, valve: o.valve ?? null, col, mat, tex: t, k: 0 };
    this.drafts.push(d);
    this.area.updrafts.push(d);
    return d;
  }

  // En vindventil: ett bronshjul på väggen. Vrids det, börjar uppvindarna blåsa.
  valve(id, x, z, face, o = {}) {
    const M = spireMats();
    const g = new THREE.Group();
    g.position.set(this.ox + x, (o.y ?? 0) + 1.3, z);
    g.rotation.y = face;
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 16), M.bronze));
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), M.bronze);
      sp.rotation.z = k * Math.PI / 4;
      wheel.add(sp);
    }
    wheel.position.z = 0.2;
    g.add(wheel);
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8).rotateX(Math.PI / 2), M.gold), 0, 0, 0));
    this.D.add(g);
    const v = { id, wheel, spin: 0, label: o.label };
    this.valves.push(v);
    const fx = Math.sin(face), fz = Math.cos(face);
    this.interactions.push({
      label: 'Turn the wind valve', area: this.id, pos: () => this.V(x + fx * 1.3, o.y ?? 0, z + fz * 1.3), radius: 1.6,
      ok: () => !this.state.solved[`valve:${id}`],
      run: () => {
        this.state.solved[`valve:${id}`] = true;
        v.spin = 2.5;
        this.game.sfx.play('secret');
        this.game.sfx.play('gust', { vol: 1 });
        this.applyDrafts();
        this.game.hud.toast(o.toast ?? 'Somewhere in the tower, the wind begins to rise.', 3200);
        this.game.story.save(true);
      },
    });
    return v;
  }

  applyDrafts() {
    for (const d of this.drafts) d.on = !d.valve || !!this.state.solved[`valve:${d.valve}`] || !!d.forced;
  }

  // En vägg av marmor med bronsfjädrar: sandalerna springer på den
  runWall(x0, x1, y0, y1, z0, z1) {
    this.slab(x0, x1, y0, y1, z0, z1, spireMats().feather, 2.5);
  }

  applyState() {
    super.applyState();
    this.applyDrafts();
    this.afterSpire?.();
  }

  update(dt, frozen = false) {
    super.update(dt, frozen);
    for (const d of this.drafts) {
      d.k = approach(d.k, d.on ? 1 : 0, 3, dt);
      d.mat.opacity = 0.42 * d.k;
      d.col.visible = d.k > 0.02;
      d.tex.offset.y -= dt * 1.6 * d.k;
    }
    for (const v of this.valves) {
      if (v.spin > 0) { v.spin = Math.max(0, v.spin - dt); v.wheel.rotation.z += dt * 6 * v.spin; }
    }
  }
}

// =====================================================================
// The Brass Weaver: spindelgolemen
// =====================================================================
export const WEAVER_PALETTE = { bronze: 0xb08040, iron: 0x4a4c54, copper: 0xb86a3e, stone: 0x6a6460 };

function buildWeaverFallback() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const m = new THREE.MeshLambertMaterial({ color: 0xb08040, flatShading: true });
  body.add(place(new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), m), 0, 1.6, -0.6));
  const torso = new THREE.Group();
  torso.position.set(0, 2.4, 0.4);
  body.add(torso);
  torso.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.0), m), 0, 0.9, 0));
  const head = new THREE.Group();
  head.position.set(0, 1.9, 0.2);
  torso.add(head);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), m));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 2.6, 5), m);
    leg.position.set(Math.cos(a) * 1.6, 1.0, Math.sin(a) * 1.6 - 0.4);
    leg.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    body.add(leg);
  }
  const arm = (s) => { const g = new THREE.Group(); g.position.set(0.9 * s, 1.6, 0); torso.add(g); g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), m), 0, -0.7, 0)); return g; };
  return { root, body, torso, head, armL: arm(-1), armR: arm(1), mats: [m] };
}

function buildWeaver() {
  if (!hasModel('weaver')) return buildWeaverFallback();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const sk = skinnedModel('weaver', WEAVER_PALETTE, mat);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(sk.mesh);
  body.add(sk.bones.body);
  return { root, body, torso: sk.bones.torso, head: sk.bones.head, armL: sk.bones.armL, armR: sk.bones.armR, mats: [mat], skinned: sk.mesh };
}

export class BrassWeaver {
  constructor(scene, center, room, groundAt) {
    this.scene = scene;
    this.center = center.clone();
    this.room = room;
    this.groundAt = groundAt;
    this.model = buildWeaver();
    scene.add(this.model.root);
    // Kärnan i bröstet: blå när den ligger öppen
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0x3a4a5a });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), this.coreMat);
    core.position.set(0, 0.55, 0.62);
    this.model.torso.add(core);
    this.core = core;
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2a30 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), this.eyeMat);
      e.position.set(0.09 * s, 0.1, 0.33);
      this.model.head.add(e);
    }
    // En glänsande tråd från taket när den hänger däruppe
    this.thread = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.7 }));
    scene.add(this.thread);
    this.dropRing = ring(1.9, 2.4);
    this.lungeRing = ring(0.6, 1.0);
    this.slamRing = ring(0.2, 0.6);
    scene.add(this.dropRing, this.lungeRing, this.slamRing);
    this.pos = center.clone();
    this.chestPos = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.radiusBig = 4;
    this.hitRadius = 1.6;
    this.hitHeight = [-1.5, 3.5];
    this.ceiling = 11;
    this.onEvent = null;
    this.blockHint = 'The brass shell turns the blade. When the Weaver is stuck in the floor, or dazed, its core lies open.';
    this.immuneHint = this.blockHint;
    this.reset();
  }

  reset() {
    this.hp = 10;
    this.state = 'dormant';
    this.st = 0;
    this.lift = this.ceiling; // höjd över golvet
    this.pos.copy(this.center);
    this.facing = 0;
    this.drops = 0;
    this.cooldown = 1.2;
    this.flash = 0;
    this.hits = 0;
    this.waveT = -1;
    this.model.root.visible = true;
    for (const r of [this.dropRing, this.lungeRing, this.slamRing]) r.material.opacity = 0;
    this.thread.visible = false;
    this.animate(0.001, 0);
  }

  get phase() { return this.hp > 5 ? 1 : 2; }
  get targetable() { return ['stalk', 'lungeWind', 'lunge', 'stuck', 'stunned', 'recover'].includes(this.state); }
  get open() { return this.state === 'stuck' || this.state === 'stunned'; }

  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.core.getWorldPosition(this.chestPos);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.setState('hang');
    this.drops = 0;
  }

  setState(s) { this.state = s; this.st = 0; }

  canSwordHit(player) {
    if (!this.targetable) return false;
    const c = this.chest;
    return Math.hypot(c.x - player.feet.x, c.z - player.feet.z) < 3.4 && Math.abs(this.pos.y + this.lift - player.feet.y) < 2;
  }

  hurt(dmg) {
    if (!this.targetable) return false;
    if (!this.open) return 'blocked';
    this.hp -= dmg;
    this.hits += dmg;
    this.flash = 0.16;
    if (this.hp <= 0) {
      this.setState('dead');
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.hits >= 4) { this.hits = 0; this.setState('recover'); }
    return 'hit';
  }

  // Markslaget: står den på golvet nära Cello blir den yr
  slamHit(point) {
    if (!['stalk', 'lungeWind', 'recover'].includes(this.state) || this.lift > 0.3) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 5) {
      this.setState('stunned');
      this.hits = 0;
      this.onEvent?.('dazed', this);
    }
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z, dist = Math.hypot(dx, dz);
    const turn = (rate) => { this.facing += Math.max(-rate * dt, Math.min(rate * dt, wrap(Math.atan2(dx, dz) - this.facing))); };
    let walk = 0;
    const fast = this.phase === 2 ? 1.3 : 1;
    switch (this.state) {
      case 'hang': {
        // Hänger i taket och följer Cello; ringen visar var den landar
        this.lift = approach(this.lift, this.ceiling, 4, dt);
        this.target.lerp(new THREE.Vector3(p.feet.x, this.center.y, p.feet.z), 1 - Math.exp(-3 * dt));
        this.pos.x = approach(this.pos.x, this.target.x, 3, dt);
        this.pos.z = approach(this.pos.z, this.target.z, 3, dt);
        this.dropRing.position.set(this.target.x, this.center.y + 0.07, this.target.z);
        const wait = (this.drops === 0 ? 2.2 : 1.5) / fast;
        this.dropRing.material.opacity = Math.min(0.85, this.st / wait);
        if (this.st > wait) { this.pos.x = this.target.x; this.pos.z = this.target.z; this.setState('drop'); g.sfx.play('swing', { vol: 1.2 }); }
        break;
      }
      case 'drop':
        this.lift = Math.max(0, this.lift - dt * 30);
        if (this.lift <= 0) {
          this.dropRing.material.opacity = 0;
          g.sfx.play('stomp', { vol: 1.3 });
          g.rig.shake(0.5);
          g.fx.burst('debris', this.pos.clone().setY(this.pos.y + 0.3), 24, 0xb0a890);
          if (dist < 2.6 && Math.abs(p.feet.y - this.pos.y) < 1.5) p.takeHit(2, this.pos);
          this.drops++;
          this.setState('stuck');
          this.onEvent?.('stuck', this);
        }
        break;
      case 'stuck':
        // Benen sitter fast i golvet: kärnan lyser
        if (this.st > 2.8) this.setState('recover');
        break;
      case 'stunned':
        if (this.st > 3.6) this.setState('recover');
        break;
      case 'recover':
        if (this.st > 0.7) { this.cooldown = 0.8; this.setState('stalk'); }
        break;
      case 'stalk':
        // Kryper mot Cello, gör utfall, och klättrar till slut upp i taket igen
        turn(2.2 * fast);
        if (dist > 3.5) {
          const sp = 2.6 * fast;
          this.pos.x += Math.sin(this.facing) * sp * dt;
          this.pos.z += Math.cos(this.facing) * sp * dt;
          walk = 1;
        }
        this.cooldown -= dt;
        if (this.cooldown <= 0) {
          if (this.st > 6 / fast) { this.setState('climb'); g.sfx.play('swing', { vol: 0.8 }); }
          else { this.setState('lungeWind'); g.sfx.play('growl', { vol: 1.1 }); }
        }
        break;
      case 'lungeWind': {
        turn(5);
        const k = Math.min(1, this.st / (0.7 / fast));
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        this.lungeRing.position.set(this.pos.x + fx * 4, this.pos.y + 0.07, this.pos.z + fz * 4);
        this.lungeRing.material.opacity = 0.2 + 0.6 * k;
        if (k >= 1) { this.dir.set(fx, 0, fz); this.setState('lunge'); this.lungeRing.material.opacity = 0; this.hitDone = false; }
        break;
      }
      case 'lunge':
        this.pos.addScaledVector(this.dir, 12 * dt);
        walk = 2;
        if (!this.hitDone && dist < 2.4 && Math.abs(p.feet.y - this.pos.y) < 2) { this.hitDone = true; p.takeHit(2, this.pos); }
        if (this.st > 0.5) { this.cooldown = 1.4 / fast; this.setState('stalk'); this.st = 2; }
        break;
      case 'climb':
        this.lift = Math.min(this.ceiling, this.lift + dt * 9);
        if (this.lift >= this.ceiling) { this.target.copy(this.pos); this.setState('hang'); }
        break;
      case 'dead':
        if (this.st > 0.3 && Math.random() < dt * 20) g.fx.burst('spark', this.chest.clone(), 4, 0xffd27a);
        if (this.st > 2.2) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.thread.visible = false;
          g.fx.burst('debris', this.pos.clone().setY(this.pos.y + 1.5), 40, 0xb08040);
          g.sfx.play('crumble');
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }
    // Inne i salen
    const r = this.room;
    this.pos.x = Math.max(r.x0 + 2.5, Math.min(r.x1 - 2.5, this.pos.x));
    this.pos.z = Math.max(r.z0 + 2.5, Math.min(r.z1 - 2.5, this.pos.z));
    // Cello går inte igenom den
    const R = 2.0;
    if (this.state !== 'gone' && this.lift < 1.5 && dist < R && dist > 1e-3 && Math.abs(p.feet.y - this.pos.y) < 3) p.nudge((dx / dist) * (R - dist), (dz / dist) * (R - dist));
    this.animate(dt, walk);
  }

  animate(dt, walk) {
    const m = this.model, t = performance.now() / 1000;
    const open = this.open;
    m.root.position.set(this.pos.x, this.pos.y + this.lift, this.pos.z);
    m.root.rotation.y = this.facing;
    // Upp och ner i taket: hänger med benen uppåt
    const hanging = this.lift > 1;
    m.body.rotation.x = approach(m.body.rotation.x, hanging ? Math.PI : this.state === 'stuck' ? 0.25 : 0, 8, dt);
    m.body.position.y = approach(m.body.position.y, hanging ? 4.4 : this.state === 'stuck' ? -0.6 : 0, 8, dt);
    const bob = walk ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
    m.body.position.y += bob;
    const swing = this.state === 'lungeWind' ? -1.4 : this.state === 'lunge' ? -0.2 : walk ? Math.sin(t * 6) * 0.3 : open ? 0.4 : 0;
    m.armL.rotation.x = approach(m.armL.rotation.x, swing, 10, dt);
    m.armR.rotation.x = approach(m.armR.rotation.x, this.state === 'lungeWind' ? -1.4 : walk ? -Math.sin(t * 6) * 0.3 : open ? 0.4 : 0, 10, dt);
    m.torso.rotation.x = approach(m.torso.rotation.x, open ? 0.45 : this.state === 'lungeWind' ? -0.25 : 0, 8, dt);
    m.head.rotation.y = Math.sin(t * 1.3) * 0.2;
    const pulse = 0.6 + 0.4 * Math.sin(t * 9);
    this.coreMat.color.setRGB(open ? 0.4 + 0.5 * pulse : 0.2, open ? 0.8 + 0.2 * pulse : 0.25, open ? 1 : 0.32);
    this.eyeMat.color.set(this.state === 'dormant' ? 0x2a2a30 : open ? 0x6a8aa0 : 0x9ff0ff);
    const f = this.flash > 0 ? 0.8 : 0;
    for (const mt of m.mats) mt.emissive?.setRGB(f, f * 0.9, f * 0.7);
    // Tråden till taket
    this.thread.visible = this.lift > 0.5 && this.state !== 'gone' && this.state !== 'dead';
    if (this.thread.visible) {
      const top = this.center.y + this.ceiling + 5.5, bot = this.pos.y + this.lift + 4.6;
      this.thread.position.set(this.pos.x, (top + bot) / 2, this.pos.z);
      this.thread.scale.set(1, Math.max(0.1, top - bot), 1);
    }
  }
}

// =====================================================================
// Typhon: titanen i vinden
// =====================================================================
function buildTyphon() {
  const M = {
    storm: new THREE.MeshLambertMaterial({ color: 0x3a4250, flatShading: true }),
    stormHi: new THREE.MeshLambertMaterial({ color: 0x5a6474, flatShading: true }),
    cloud: new THREE.MeshLambertMaterial({ color: 0x8a92a0, transparent: true, opacity: 0.85, flatShading: true }),
    eye: new THREE.MeshBasicMaterial({ color: 0x9fe8ff }),
    rune: new THREE.MeshBasicMaterial({ color: 0x4a6a8a }),
    heart: new THREE.MeshBasicMaterial({ color: 0x3a5a7a, transparent: true, opacity: 0.95 }),
    crown: new THREE.MeshLambertMaterial({ color: 0x2a2e36, flatShading: true }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Molnen han reser sig ur
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2 + (i % 3) * 0.8, 1), M.cloud);
    c.position.set(Math.cos(a) * 5.5, -2 + (i % 2) * 1.2, Math.sin(a) * 4);
    body.add(c);
  }
  const torso = new THREE.Group();
  torso.position.y = 2;
  body.add(torso);
  // Bröstkorg och axlar: tunga, kantiga stormstenar
  torso.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(5.2, 1), M.storm), 0, 5, 0));
  torso.children[0].scale.set(1.25, 1.1, 0.8);
  for (const s of [-1, 1]) torso.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), M.stormHi), 6 * s, 8.2, 0));
  // Hjärtat i bröstet, bakom en spricka
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(1.0), M.heart);
  heart.position.set(0, 5.6, 3.9);
  torso.add(heart);
  for (let k = 0; k < 5; k++) {
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.2), M.rune);
    crack.position.set(Math.cos(k * 1.26) * 1.6, 5.6 + Math.sin(k * 1.26) * 1.6, 3.9);
    crack.rotation.z = k * 1.26;
    torso.add(crack);
  }
  // Huvudet: en krona av svarta spjut och två ögon av blixt
  const head = new THREE.Group();
  head.position.set(0, 11.4, 0.6);
  torso.add(head);
  head.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), M.storm), 0, 0, 0));
  head.children[0].scale.set(1, 1.15, 0.95);
  for (const s of [-1, 1]) head.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.2), M.eye), 0.75 * s, 0.25, 2.0));
  for (let k = 0; k < 7; k++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6 + (k % 2) * 1.2, 5), M.crown);
    const a = -1.1 + k * 0.37;
    sp.position.set(Math.sin(a) * 1.9, 2.2 + Math.cos(a) * 0.6, -0.4);
    sp.rotation.z = -a * 0.6;
    head.add(sp);
  }
  // Armar: överarm, underarm och en väldig näve med en runsten på handleden
  const arm = (s) => {
    const g = new THREE.Group();
    g.position.set(6.6 * s, 8, 0);
    torso.add(g);
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 6, 7), M.storm), 0, -3, 0));
    const el = new THREE.Group();
    el.position.y = -6;
    g.add(el);
    el.add(place(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 6, 7), M.stormHi), 0, -3, 0));
    const fist = new THREE.Group();
    fist.position.y = -6.6;
    el.add(fist);
    fist.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), M.storm));
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), M.rune);
    rune.position.set(0, 1.2, 1.2);
    fist.add(rune);
    return { g, el, fist, rune };
  };
  const L = arm(-1), R = arm(1);
  return { root, body, torso, head, heart, armL: L, armR: R, M, mats: [M.storm, M.stormHi] };
}

const _tv = new THREE.Vector3(), _tq = new THREE.Quaternion(), _down = new THREE.Vector3(0, -1, 0);
const ARM_LEN = 6 + 6.6; // från axeln till mitten av näven
const _te = new THREE.Euler();

export class Typhon {
  // center: arenans mitt (golvet), side: riktningen (vinkel) där Typhon står utanför arenan
  constructor(scene, center, side, groundAt, o = {}) {
    this.scene = scene;
    this.center = center.clone();
    this.side = side;
    this.groundAt = groundAt;
    this.radius = o.radius ?? 13;
    this.ringY = o.ringY ?? 6; // den övre ringens höjd
    this.pillars = o.pillars ?? []; // [{ x, z, r }] skydd mot vinden
    this.model = buildTyphon();
    scene.add(this.model.root);
    this.home = new THREE.Vector3(center.x + Math.sin(side) * (this.radius + 9), center.y - 10, center.z + Math.cos(side) * (this.radius + 9));
    this.pos = this.home.clone();
    this.chestPos = new THREE.Vector3();
    this.fistPos = new THREE.Vector3();
    this.rings = [0, 1, 2].map(() => ring(1.3, 1.8));
    this.fistRing = ring(2.6, 3.2);
    this.breathCone = ring(0.5, this.radius * 2, 0, 0.9);
    this.breathCone.material.color.set(0xbfe8ff);
    for (const r of [...this.rings, this.fistRing, this.breathCone]) scene.add(r);
    this.bolts = this.rings.map(() => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 30, 5), new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0, fog: false }));
      scene.add(b);
      return b;
    });
    this.radiusBig = 10;
    this.hitRadius = 3;
    this.onEvent = null;
    this.blockHint = 'The storm-stone shrugs off the blade. When his fist rests on the crown, strike the rune on his wrist!';
    this.immuneHint = this.blockHint;
    this.reset();
  }

  reset() {
    this.hp = 9;
    this.state = 'dormant';
    this.st = 0;
    this.rise = 0;
    this.cooldown = 2;
    this.flash = 0;
    this.attack = null;
    this.runeHits = 0;
    this.heartHits = 0;
    this.count = 0;
    this.gust = new THREE.Vector3();
    this.pos.copy(this.home);
    this.model.root.visible = false;
    for (const r of [...this.rings, this.fistRing, this.breathCone]) r.material.opacity = 0;
    for (const b of this.bolts) b.material.opacity = 0;
    this.animate(0.001);
  }

  get phase() { return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3; }
  get targetable() { return ['fight', 'rest', 'slumped'].includes(this.state); }
  get stunned() { return this.state === 'slumped'; }

  get chest() {
    this.model.root.updateMatrixWorld(true);
    if (this.state === 'rest') return this.model.armR.rune.getWorldPosition(this.chestPos);
    return this.model.heart.getWorldPosition(this.chestPos);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.model.root.visible = true;
    this.setState('rising');
  }

  setState(s) { this.state = s; this.st = 0; }

  canSwordHit(player) {
    if (this.state === 'rest') {
      const r = this.model.armR.rune.getWorldPosition(new THREE.Vector3());
      return Math.hypot(r.x - player.feet.x, r.z - player.feet.z) < 3.4 && Math.abs(r.y - player.feet.y - 1) < 3.0;
    }
    if (this.state === 'slumped') {
      const h = this.model.heart.getWorldPosition(new THREE.Vector3());
      return Math.hypot(h.x - player.feet.x, h.z - player.feet.z) < 4.2 && Math.abs(h.y - player.feet.y - 1) < 2.6;
    }
    return false;
  }

  hurt(dmg) {
    if (!this.targetable) return false;
    if (this.state === 'rest') {
      this.runeHits++;
      this.flash = 0.12;
      if (this.runeHits >= 3) {
        this.runeHits = 0;
        this.setState('slumped');
        this.attack = null;
        this.fistRing.material.opacity = 0;
        this.onEvent?.('slumped', this);
      }
      return 'hit';
    }
    if (this.state !== 'slumped') return 'blocked';
    this.hp -= dmg;
    this.heartHits += dmg;
    this.flash = 0.18;
    if (this.hp <= 0) {
      this.setState('dead');
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.heartHits >= 3) { this.heartHits = 0; this.setState('rage'); this.onEvent?.('phase', this); }
    return 'hit';
  }

  slamHit() {}

  // Står Cello i lä bakom en pelare?
  sheltered(p) {
    const ox = this.pos.x, oz = this.pos.z;
    for (const pl of this.pillars) {
      const ax = p.feet.x - ox, az = p.feet.z - oz, bx = pl.x - ox, bz = pl.z - oz;
      const l2 = ax * ax + az * az;
      const t = (ax * bx + az * bz) / l2;
      if (t <= 0 || t >= 1) continue;
      const cx = ox + ax * t, cz = oz + az * t;
      if (Math.hypot(pl.x - cx, pl.z - cz) < pl.r + 0.6 && Math.hypot(p.feet.x - pl.x, p.feet.z - pl.z) < 5) return true;
    }
    return false;
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.gust.set(0, 0, 0);
    const C = this.center;
    switch (this.state) {
      case 'rising':
        this.rise = Math.min(1, this.st / 3);
        if (this.st < 0.1) { g.sfx.play('typhoon', { vol: 1.2 }); g.rig.shake(0.8); }
        if (this.st > 3.4) { this.setState('fight'); this.cooldown = 1.2; this.onEvent?.('awake', this); }
        break;
      case 'fight': {
        this.cooldown -= dt;
        if (!this.attack && this.cooldown <= 0) this.choose(p, g);
        if (this.attack) this.runAttack(dt, p, g);
        break;
      }
      case 'rest':
        // Näven vilar på plattformen: runstenen på handleden lyser
        if (this.st > (this.phase === 3 ? 3.2 : 4.2)) { this.setState('fight'); this.cooldown = 0.8; this.runeHits = 0; }
        break;
      case 'slumped':
        // Sjunker ihop mot den övre ringen: hjärtat ligger öppet
        if (this.st > 7.5) { this.setState('rage'); this.heartHits = 0; }
        break;
      case 'rage':
        if (this.st < 0.1) { g.sfx.play('typhoon', { vol: 1 }); g.rig.shake(0.6); }
        if (this.st > 1.6) { this.setState('fight'); this.cooldown = 1.0; }
        break;
      case 'dead':
        this.rise = Math.max(0, 1 - this.st / 4);
        if (Math.random() < dt * 30) g.fx.burst('spark', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0)), 3, 0xcfefff);
        if (this.st > 4.2) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }
    // Vinden från andedräkten knuffar Cello mot kanten (inte i lä, och inte när han är tung)
    p.gust.add(this.gust);
    this.animate(dt);
  }

  choose(p, g) {
    const ph = this.phase;
    this.count++;
    let kind = 'fist';
    if (this.count % 3 === 2) kind = 'breath';
    else if (this.count % 3 === 1 && ph >= 2) kind = 'bolts';
    else if (ph === 1 && this.count % 4 === 3) kind = 'bolts';
    this.attack = { kind, t: 0, target: p.feet.clone(), hit: false, n: 0 };
    if (kind === 'breath') { g.sfx.play('gust', { vol: 1.1 }); }
    if (kind === 'fist') g.sfx.play('growl', { vol: 1.4 });
  }

  runAttack(dt, p, g) {
    const a = this.attack, ph = this.phase;
    a.t += dt;
    const C = this.center;
    if (a.kind === 'fist') {
      const wind = ph === 3 ? 1.0 : 1.3;
      if (a.t < wind * 0.7) a.target.set(p.feet.x, C.y, p.feet.z);
      // inte utanför plattformen
      const dx = a.target.x - C.x, dz = a.target.z - C.z, d = Math.hypot(dx, dz), maxR = this.radius - 3;
      if (d > maxR) { a.target.x = C.x + dx / d * maxR; a.target.z = C.z + dz / d * maxR; }
      const k = Math.min(1, a.t / wind);
      this.fistRing.position.set(a.target.x, C.y + 0.08, a.target.z);
      this.fistRing.material.opacity = a.t < wind ? 0.25 + 0.6 * k : 0;
      if (!a.hit && a.t >= wind) {
        a.hit = true;
        g.sfx.play('stomp', { vol: 1.5 });
        g.rig.shake(0.7);
        g.fx.burst('debris', a.target.clone().setY(C.y + 0.4), 30, 0xa8b0bc);
        if (Math.hypot(p.feet.x - a.target.x, p.feet.z - a.target.z) < 3.3 && p.feet.y - C.y < 1.5) p.takeHit(2, a.target, { unblockable: true });
        this.fistPos.copy(a.target);
        this.attack = null;
        this.setState('rest');
        this.onEvent?.('rest', this);
      }
    } else if (a.kind === 'breath') {
      // Andas in (molnen dras ihop), blåser sedan i tre sekunder
      const inhale = 1.2, blow = ph === 1 ? 2.6 : 3.4;
      const dir = new THREE.Vector3(C.x - this.pos.x, 0, C.z - this.pos.z).normalize();
      this.breathCone.position.set(this.pos.x + dir.x * 6, C.y + 0.1, this.pos.z + dir.z * 6);
      this.breathCone.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2 - 0.45;
      this.breathCone.material.opacity = a.t < inhale ? 0.1 + 0.2 * (a.t / inhale) : a.t < inhale + blow ? 0.32 : 0;
      if (a.t > inhale && a.t < inhale + blow) {
        if (!a.roared) { a.roared = true; g.sfx.play('typhoon', { vol: 1.1 }); }
        if (!this.sheltered(p)) this.gust.set(dir.x * (ph === 1 ? 7 : 9), 0, dir.z * (ph === 1 ? 7 : 9));
        if (Math.random() < dt * 30) g.fx.burst('ash', new THREE.Vector3(C.x + (Math.random() - 0.5) * 20, C.y + 1 + Math.random() * 3, C.z + (Math.random() - 0.5) * 20), 2);
      }
      if (a.t > inhale + blow + 0.4) { this.attack = null; this.cooldown = ph === 3 ? 0.8 : 1.4; }
    } else {
      // Tre blixtar efter varandra där Cello står
      const gap = ph === 3 ? 0.55 : 0.75;
      for (let i = 0; i < 3; i++) {
        const t0 = i * gap, r = this.rings[i], b = this.bolts[i];
        if (a.t >= t0 && !a[`set${i}`]) { a[`set${i}`] = true; r.position.set(p.feet.x, C.y + 0.08, p.feet.z); }
        const k = (a.t - t0) / 1.0;
        r.material.opacity = k >= 0 && k < 1 ? 0.25 + 0.6 * k : 0;
        if (k >= 1 && !a[`hit${i}`]) {
          a[`hit${i}`] = true;
          b.position.set(r.position.x, C.y + 15, r.position.z);
          b.material.opacity = 1;
          g.sfx.play('thunder', { vol: 0.9 });
          g.lights?.flash(r.position.clone().setY(C.y + 2), 0xcfefff, 60, 18, 0.3);
          if (Math.hypot(p.feet.x - r.position.x, p.feet.z - r.position.z) < 1.9) p.takeHit(2, r.position, { unblockable: true });
        }
        b.material.opacity = Math.max(0, b.material.opacity - dt * 4);
      }
      if (a.t > 2 * gap + 1.6) { this.attack = null; this.cooldown = ph === 3 ? 0.7 : 1.2; }
    }
  }

  animate(dt) {
    const m = this.model, t = performance.now() / 1000, C = this.center;
    const slump = this.state === 'slumped' ? Math.min(1, this.st / 0.8) : this.state === 'rage' ? Math.max(0, 1 - this.st / 0.6) : 0;
    // Han står i molnen utanför arenan och tittar mot mitten
    const yaw = Math.atan2(C.x - this.home.x, C.z - this.home.z);
    // Sjunker ihop: kommer närmare och lägre, så att hjärtat hamnar i höjd med den övre ringen
    const near = slump * -1.6; // lutar sig fram men backar lite: hjärtat hamnar strax utanför den övre ringen
    this.pos.set(this.home.x + Math.sin(yaw) * near, this.home.y - 18 * (1 - this.rise) - slump * 0.6, this.home.z + Math.cos(yaw) * near);
    m.root.position.copy(this.pos);
    m.root.rotation.y = yaw;
    m.torso.rotation.x = approach(m.torso.rotation.x, slump * 0.55 + Math.sin(t * 0.7) * 0.03, 6, dt);
    m.head.rotation.x = approach(m.head.rotation.x, slump * 0.4, 6, dt);
    // Armarna: näven slår ner mot målet och vilar där
    const R = m.armR, L = m.armL;
    const a = this.attack;
    let rx = -0.2, rz = 0.15, ex = -0.3;
    if (a && a.kind === 'fist') {
      const wind = this.phase === 3 ? 1.0 : 1.3;
      const k = Math.min(1, a.t / wind);
      rx = -0.2 - 1.6 * Math.sin(k * Math.PI * 0.5) * (k < 0.75 ? 1 : 1 - (k - 0.75) * 4);
      ex = -0.3 - 0.6 * k;
    }
    if (this.state === 'rest') { rx = -1.15; ex = -0.15; }
    if (a && a.kind === 'breath') { rx = -0.5; rz = 0.6; }
    L.g.rotation.x = approach(L.g.rotation.x, a?.kind === 'bolts' ? -2.4 : -0.3 + Math.sin(t) * 0.05, 4, dt);
    L.g.rotation.z = approach(L.g.rotation.z, a?.kind === 'breath' ? -0.6 : -0.15, 4, dt);
    // Slaget och vilan: armen sträcks ut mot målet på plattformen (den är av storm, den kan bli lång)
    const reach = (a && a.kind === 'fist' && a.t > (this.phase === 3 ? 1.0 : 1.3) * 0.6) || this.state === 'rest';
    if (reach) {
      const tgt = this.state === 'rest' ? this.fistPos : a.target;
      m.root.updateMatrixWorld(true);
      const local = m.torso.worldToLocal(_tv.set(tgt.x, C.y + 1.3, tgt.z)).sub(R.g.position);
      const len = local.length();
      _tq.setFromUnitVectors(_down, local.normalize());
      R.g.quaternion.slerp(_tq, Math.min(1, dt * (this.state === 'rest' ? 22 : 12)));
      const sc = THREE.MathUtils.clamp(len / ARM_LEN, 0.6, 2.6);
      R.g.scale.y = approach(R.g.scale.y, sc, 8, dt);
      R.el.rotation.x = approach(R.el.rotation.x, 0, 10, dt);
    } else {
      R.g.quaternion.slerp(_tq.setFromEuler(_te.set(rx, 0, rz)), Math.min(1, dt * 5));
      R.g.scale.y = approach(R.g.scale.y, 1, 3, dt);
      R.el.rotation.x = approach(R.el.rotation.x, ex, 6, dt);
    }
    // Näven behåller sin form fast armen sträcks
    R.fist.scale.set(1, 1 / R.g.scale.y, 1);
    const pulse = 0.6 + 0.4 * Math.sin(t * 8);
    m.M.rune.color.setRGB(this.state === 'rest' ? 0.5 + 0.5 * pulse : 0.29, this.state === 'rest' ? 0.85 + 0.15 * pulse : 0.42, this.state === 'rest' ? 1 : 0.54);
    m.M.heart.color.setRGB(this.state === 'slumped' ? 0.6 + 0.4 * pulse : 0.23, this.state === 'slumped' ? 0.9 : 0.35, this.state === 'slumped' ? 1 : 0.48);
    m.M.eye.color.setRGB(0.62 + (this.state === 'rage' ? 0.38 : 0), 0.9, 1);
    const f = this.flash > 0 ? 0.7 : 0;
    for (const mt of m.mats) mt.emissive.setRGB(f * 0.7, f * 0.85, f);
  }
}

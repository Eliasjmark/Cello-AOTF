// Pyramidens väktare (0.7):
//  · Khepri (miniboss) – en jättelik skarabé med ett skal som svärdet studsar på. Den stormar rakt fram
//    och blir yr när den krockar med en vägg eller pelare. Markslaget (hammaren) vänder den på rygg,
//    och då ligger buken öppen.
//  · Apophis (boss) – kaosormen av skugga. Den reser sig ur hålen i golvet, hugger och spottar skugga.
//    Bara solljus som Cello kastar med prisman bränner den, och då faller huvudet till marken.
import * as THREE from 'three';
import { ring } from './titan.js';
import { mergeRigid } from './geom.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

// ====================================================================
// Khepri, skarabén
// ====================================================================
function buildScarab() {
  const M = {
    shell: lam(0x1e3a3a), shellHi: lam(0x2c5a52), gold: lam(0xc9a24f, { emissive: 0x2a1c06 }), dark: lam(0x141a1a),
    belly: lam(0x8a6a4a), leg: lam(0x22282a), eye: new THREE.MeshBasicMaterial({ color: 0x9affd8 }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.3;
  root.add(body);
  // Skalet: en tillplattad halvsfär med en gyllene kant och ett mittstreck
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.shell);
  shell.scale.set(1.05, 0.75, 1.35);
  body.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.08, 4, 18), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.05, 1.35, 1);
  body.add(rim);
  body.add(B(0.08, 0.1, 4.2, M.gold, 0, 1.18, 0));
  for (const s of [-1, 1]) {
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), M.shellHi);
    hi.scale.set(1, 0.4, 1.6);
    hi.position.set(s * 0.65, 0.95, -0.3);
    body.add(hi);
  }
  // Buken (syns när den ligger på rygg)
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12), M.belly);
  belly.scale.set(1.0, 1, 1.25);
  belly.position.y = -0.1;
  body.add(belly);
  for (let i = 0; i < 4; i++) body.add(B(2.2 - i * 0.3, 0.05, 0.12, M.dark, 0, -0.27, -1 + i * 0.6));
  // Huvudet med horn och käkar
  const head = new THREE.Group();
  head.position.set(0, 0.2, 2.1);
  body.add(head);
  head.add(B(1.2, 0.7, 0.9, M.shell, 0, 0, 0));
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 5), M.gold);
  horn.rotation.x = -1.1;
  horn.position.set(0, 0.5, 0.5);
  head.add(horn);
  const jaws = [];
  for (const s of [-1, 1]) {
    const j = new THREE.Group();
    j.position.set(s * 0.4, -0.15, 0.4);
    j.add(B(0.14, 0.14, 0.7, M.dark, 0, 0, 0.35));
    head.add(j);
    jaws.push(j);
    head.add(B(0.2, 0.14, 0.06, M.eye, s * 0.38, 0.12, 0.46));
  }
  // Sex ben
  const legs = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const hip = new THREE.Group();
      hip.position.set(s * 1.25, -0.1, 0.9 - i * 0.9);
      body.add(hip);
      const upper = B(0.9, 0.16, 0.16, M.leg, s * 0.45, 0.15, 0);
      upper.rotation.z = s * 0.5;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.set(s * 0.85, 0.35, 0);
      hip.add(knee);
      const lower = B(0.14, 1.3, 0.14, M.leg, 0, -0.6, 0);
      knee.add(lower);
      knee.add(B(0.2, 0.08, 0.3, M.gold, 0, -1.25, 0.08));
      legs.push({ hip, knee, s, i });
    }
  }
  const mats = [M.shell, M.shellHi, M.gold, M.dark, M.belly, M.leg];
  return { root, body, head, jaws, legs, mats, M };
}

export class Khepri {
  constructor(scene, home, bounds, pillars, groundAt) {
    this.model = buildScarab();
    mergeRigid(this.model.root);
    scene.add(this.model.root);
    this.home = home.clone();
    this.bounds = bounds;
    this.pillars = pillars; // [{x, z, r}]
    this.groundAt = groundAt;
    this.pos = home.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 2.2;
    this.hitRadius = 1.9;
    this.hitHeight = [-1.0, 3.0];
    this.lineRing = ring(0.7, 1.0);
    scene.add(this.lineRing);
    this.onEvent = null;
    this.blockHint = 'Its shell is harder than stone. Turn Khepri over with a ground strike from the hammer!';
    this.reset();
  }

  reset() {
    this.pos.copy(this.home);
    this.facing = 0;
    this.hp = 8;
    this.state = 'dormant';
    this.st = 0;
    this.cooldown = 1.0;
    this.flash = 0;
    this.dir = new THREE.Vector3();
    this.charged = 0;
    this.anim = 0;
    this.flip = 0;
    this.sink = 1;
    this.lineRing.material.opacity = 0;
    this.model.root.visible = true;
    this.pose(0);
  }

  get targetable() {
    return !['dormant', 'emerge', 'dead', 'gone'].includes(this.state);
  }

  get chest() {
    return this.chestPos.set(this.pos.x, this.pos.y + (this.state === 'flipped' ? 1.0 : 1.9), this.pos.z);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.setState('emerge');
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    if (this.state !== 'flipped' && !w?.unblockable) {
      this.cooldown = Math.min(this.cooldown, 0.5);
      return 'blocked';
    }
    this.hp -= dmg;
    this.flash = 0.16;
    w?.sfx?.play('ehurt', { vol: 1.1 });
    if (this.hp <= 0) {
      this.setState('dead');
      this.onEvent?.('dying', this);
      return 'killed';
    }
    return 'hit';
  }

  // Markslaget vänder skarabén på rygg
  slamHit(point, w) {
    if (!this.targetable || this.state === 'flipped') return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 3.9) {
      this.setState('flipped');
      w.sfx?.play('flip');
      w.sfx?.play('scarab', { vol: 1.2 });
      this.lineRing.material.opacity = 0;
    }
  }

  blocked(nx, nz) {
    const b = this.bounds, m = 1.9;
    if (nx < b.x0 + m || nx > b.x1 - m || nz < b.z0 + m || nz > b.z1 - m) return true;
    return this.pillars.some((p) => Math.hypot(nx - p.x, nz - p.z) < p.r + 1.6);
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown -= dt;
    const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z, dist = Math.hypot(dx, dz);
    const toward = Math.atan2(dx, dz);
    const turn = (rate) => { this.facing += Math.max(-rate * dt, Math.min(rate * dt, wrap(toward - this.facing))); };
    let walk = 0;
    switch (this.state) {
      case 'dormant':
        this.sink = 1;
        break;
      case 'emerge':
        this.sink = Math.max(0, 1 - this.st / 1.6);
        if (this.st < 0.1) { g.sfx.play('scarab', { vol: 1.4 }); g.rig.shake(0.3); }
        if (Math.random() < dt * 30) g.fx.burst('ash', this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0.3, (Math.random() - 0.5) * 3)), 2);
        if (this.st > 2.0) { this.cooldown = 1.2; this.setState('idle'); }
        break;
      case 'idle':
        turn(2.4);
        walk = 0.4;
        if (dist > 7) {
          const nx = this.pos.x + Math.sin(this.facing) * 1.4 * dt, nz = this.pos.z + Math.cos(this.facing) * 1.4 * dt;
          if (!this.blocked(nx, nz)) { this.pos.x = nx; this.pos.z = nz; walk = 1; }
        }
        if (this.cooldown <= 0 && Math.abs(wrap(toward - this.facing)) < 0.25) {
          this.setState('windup');
          g.sfx.play('scarab', { vol: 1.1 });
        }
        break;
      case 'windup': {
        turn(1.2);
        const k = Math.min(1, this.st / 0.9);
        this.lineRing.position.set(this.pos.x + Math.sin(this.facing) * 3.5, this.pos.y + 0.06, this.pos.z + Math.cos(this.facing) * 3.5);
        this.lineRing.scale.setScalar(1 + k * 0.6);
        this.lineRing.material.opacity = 0.2 + 0.6 * k;
        if (Math.random() < dt * 20) g.fx.burst('ash', this.pos.clone().setY(this.pos.y + 0.2), 2);
        if (this.st >= 0.9) {
          this.lineRing.material.opacity = 0;
          this.dir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
          this.charged = 0;
          this.hitDone = false;
          this.setState('charge');
          g.sfx.play('roll', { vol: 1.2 });
        }
        break;
      }
      case 'charge': {
        const sp = 10;
        const nx = this.pos.x + this.dir.x * sp * dt, nz = this.pos.z + this.dir.z * sp * dt;
        walk = 2;
        if (this.blocked(nx, nz) || this.charged > 18) {
          // Krockar med en vägg eller pelare: blir yr
          this.setState('dazed');
          g.sfx.play('stomp', { vol: 1.0 });
          g.sfx.play('clang', { vol: 0.5 });
          g.rig.shake(0.45);
          g.fx.burst('spark', this.pos.clone().addScaledVector(this.dir, 2).setY(this.pos.y + 1.2), 18, 0xffd08a);
          g.fx.burst('ash', this.pos.clone().addScaledVector(this.dir, 2).setY(this.pos.y + 0.6), 14);
          break;
        }
        this.pos.x = nx;
        this.pos.z = nz;
        this.charged += sp * dt;
        if (!this.hitDone && dist < 2.4 && Math.abs(p.feet.y - this.pos.y) < 1.8) {
          this.hitDone = true;
          p.takeHit(2, this.pos);
        }
        if (Math.random() < dt * 25) g.fx.burst('ash', this.pos.clone().setY(this.pos.y + 0.2), 2);
        break;
      }
      case 'dazed':
        if (this.st > 1.6) { this.cooldown = 0.9; this.setState('idle'); }
        break;
      case 'flipped':
        if (this.st > 4.6) { this.setState('righting'); g.sfx.play('scarab', { vol: 1.2 }); }
        break;
      case 'righting':
        if (this.st > 0.7) { this.cooldown = 0.6; this.setState('idle'); }
        break;
      case 'dead':
        if (this.st > 1.4 && !this.ashed) {
          this.ashed = true;
          g.fx.burst('ash', this.chest, 50);
          g.fx.burst('spark', this.chest, 20, 0x9affd8);
          g.sfx.play('edie', { vol: 1.4 });
        }
        if (this.st > 2.4) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.ashed = false;
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }
    // Cello går inte igenom skarabén
    const gy = this.groundAt(this.pos.x, this.pos.y + 0.5, this.pos.z);
    if (gy !== null) this.pos.y = approach(this.pos.y, gy, 10, dt);
    const minD = 2.2;
    if (this.state !== 'gone' && this.state !== 'dormant' && dist < minD && dist > 1e-4 && Math.abs(p.feet.y - this.pos.y) < 2.2) {
      p.nudge((dx / dist) * (minD - dist), (dz / dist) * (minD - dist));
    }
    this.animate(dt, walk);
  }

  pose(walk) {
    this.animate(0.001, walk);
  }

  animate(dt, walk) {
    const m = this.model;
    this.anim += dt * (3 + walk * 8);
    const flipped = this.state === 'flipped' || (this.state === 'righting' && this.st < 0.35);
    this.flip = approach(this.flip, flipped ? 1 : 0, flipped ? 9 : 6, dt);
    const sink = this.state === 'dormant' || this.state === 'emerge' ? this.sink : 0;
    m.body.rotation.z = this.flip * Math.PI;
    m.body.position.y = 1.3 + this.flip * 0.4 - sink * 2.4 + (this.state === 'dazed' ? Math.sin(this.st * 30) * 0.05 : 0);
    m.body.rotation.x = this.state === 'windup' ? -0.12 : this.state === 'charge' ? 0.08 : 0;
    m.body.rotation.y = this.state === 'dazed' ? Math.sin(this.st * 12) * 0.12 : 0;
    m.legs.forEach((l) => {
      const ph = this.anim + l.i * 2.1 + (l.s > 0 ? Math.PI : 0);
      const flail = this.state === 'flipped' ? Math.sin(this.st * 16 + l.i * 2 + l.s) * 0.6 : 0;
      l.hip.rotation.y = Math.sin(ph) * 0.35 * Math.min(1, walk) + flail;
      l.knee.rotation.z = l.s * (Math.max(0, Math.cos(ph)) * 0.3 * Math.min(1, walk) + flail * 0.5);
    });
    const open = this.state === 'windup' || this.state === 'charge' ? 0.5 : 0.1 + Math.sin(this.anim * 0.6) * 0.06;
    m.jaws.forEach((j, i) => { j.rotation.y = (i ? -1 : 1) * open; });
    const f = this.flash > 0 ? 0.9 : 0;
    for (const mat of m.mats) mat.emissive.setRGB(f, f, f);
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
  }
}

// ====================================================================
// Apophis, ormen av skugga
// ====================================================================
function buildSerpent(n) {
  const M = {
    scale: lam(0x1a1222), scaleHi: lam(0x2c1e3a), gold: lam(0xc9a24f, { emissive: 0x2a1c06 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xff3a2a }), gem: new THREE.MeshBasicMaterial({ color: 0x9a5aff }),
    hood: lam(0x24182e, { side: THREE.DoubleSide }),
  };
  const root = new THREE.Group();
  const segs = [];
  for (let i = 0; i < n; i++) {
    const r = 0.95 - i * 0.03;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), i % 3 === 0 ? M.scaleHi : M.scale));
    if (i % 2 === 0) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 0.07, 4, 12), M.gold);
      g.add(band);
      g.userData.band = band;
    }
    root.add(g);
    segs.push(g);
  }
  // Huvudet: en kobra med huva, glödande ögon, en violett ädelsten i pannan och huggtänder
  const head = new THREE.Group();
  root.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6), M.scale);
  skull.scale.set(1.0, 0.75, 1.4);
  head.add(skull);
  const snout = B(1.1, 0.6, 1.2, M.scale, 0, -0.15, 1.2);
  head.add(snout);
  const hood = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12, 0, Math.PI), M.hood);
  hood.rotation.set(0.2, 0, 0);
  hood.position.set(0, -0.3, -0.7);
  head.add(hood);
  for (const s of [-1, 1]) {
    head.add(B(0.3, 0.16, 0.12, M.eye, s * 0.5, 0.25, 1.2));
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), M.gold);
    fang.rotation.x = Math.PI;
    fang.position.set(s * 0.32, -0.6, 1.6);
    head.add(fang);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), M.gem);
  gem.position.set(0, 0.62, 0.7);
  head.add(gem);
  head.add(B(0.1, 0.06, 1.6, M.gold, 0, 0.78, -0.1));
  const mats = [M.scale, M.scaleHi, M.gold, M.hood];
  return { root, segs, head, gem, hood, mats, M };
}

export class Apophis {
  constructor(scene, center, holes, groundAt) {
    this.scene = scene;
    this.center = center.clone();
    this.holes = holes; // [Vector3] på golvet
    this.groundAt = groundAt;
    this.N = 16;
    this.model = buildSerpent(this.N);
    scene.add(this.model.root);
    this.pos = new THREE.Vector3(); // huvudets punkt (för lock-on och strålen)
    this.headPos = new THREE.Vector3();
    this.beamPoint = this.headPos;
    this.beamRadius = 1.4;
    this.radiusBig = 6;
    this.hitRadius = 2.0;
    this.strikeRing = ring(1.6, 2.1);
    scene.add(this.strikeRing);
    // Skuggklot som ormen spottar
    this.orbMat = new THREE.MeshBasicMaterial({ color: 0x6a3aaa, transparent: true, opacity: 0.9 });
    this.orbs = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), this.orbMat);
      m.visible = false;
      scene.add(m);
      return { m, pos: new THREE.Vector3(), vel: new THREE.Vector3(), t: 0, on: false };
    });
    this.onEvent = null;
    this.immuneHint = 'Its scales are woven of shadow. Stand in the sunlight, raise the prism and lock on to Apophis!';
    this.reset();
  }

  reset() {
    this.hp = 18;
    this.state = 'dormant';
    this.st = 0;
    this.hole = 0;
    this.rise = 0; // 0 = under jorden, 1 = rest
    this.burn = 0;
    this.hits = 0;
    this.strikes = 0;
    this.flash = 0;
    this.sway = 0;
    this.lunge = 0;
    this.target = new THREE.Vector3();
    this.downAt = new THREE.Vector3();
    this.travelT = 0;
    this.strikeRing.material.opacity = 0;
    for (const o of this.orbs) { o.on = false; o.m.visible = false; }
    this.model.root.visible = false;
    this.place(0);
  }

  get targetable() {
    return ['sway', 'strike', 'spit', 'stunned'].includes(this.state);
  }

  get beamable() {
    return ['sway', 'spit', 'strike'].includes(this.state) && this.rise > 0.8;
  }

  get chest() {
    return this.headPos;
  }

  get phase2() {
    return this.hp <= 9;
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.hole = 2;
    this.setState('emerge');
    this.model.root.visible = true;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  // Solljuset från prisman
  onBeam(dt, g) {
    if (!this.beamable) return;
    this.burn += dt;
    if (Math.random() < dt * 6) g.sfx.play('sizzle', { vol: 1 });
    if (Math.random() < dt * 30) g.fx.burst('ash', this.headPos.clone(), 2);
    if (this.burn >= 0.55) {
      this.burn = 0;
      this.hits = 0;
      // Huvudet faller ner mot arenans mitt, framför hålet
      const h = this.holes[this.hole];
      this.downAt.copy(h).lerp(this.center, 0.32);
      this.setState('stunned');
      this.strikeRing.material.opacity = 0;
      g.sfx.play('shriek', { vol: 1.3 });
      g.rig.shake(0.4);
      g.fx.burst('spark', this.headPos.clone(), 26, 0xffd070);
      g.lights.flash(this.headPos.clone(), 0xffd080, 50, 16, 0.5);
      g.hud.toast('Apophis crashes down! Strike the gem on its brow!', 2600);
    }
  }

  canSwordHit(player, swing) {
    if (this.state !== 'stunned' || this.st < 0.4) return false;
    const d = Math.hypot(player.feet.x - this.headPos.x, player.feet.z - this.headPos.z);
    return d < swing.reach + 1.8;
  }

  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    if (this.state !== 'stunned') return 'immune';
    this.hp -= dmg;
    this.hits += dmg;
    this.flash = 0.16;
    w?.sfx?.play('ehurt', { vol: 1.3 });
    if (this.hp <= 0) {
      this.setState('dead');
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.hits >= 6) this.setState('recoil');
    return 'hit';
  }

  slamHit() {}

  // Placerar kroppen: från hålet upp till huvudet i en S-kurva
  place(dt) {
    const m = this.model, h = this.holes[this.hole] ?? this.center;
    const rise = this.rise;
    const toC = new THREE.Vector3().subVectors(this.center, h).setY(0).normalize();
    const side = new THREE.Vector3(-toC.z, 0, toC.x);
    // Huvudets mål: rest över hålet, sväng och utfall mot Cello
    const up = new THREE.Vector3().copy(h).addScaledVector(toC, 1.5 + this.lunge * 0.4).add(new THREE.Vector3(0, -6 + rise * 11.5, 0));
    up.addScaledVector(side, Math.sin(this.sway) * 1.4 * rise);
    if (this.lunge > 0) up.lerp(this.target, this.lunge);
    if (this.state === 'stunned' || this.state === 'recoil' && this.st < 0.5) {
      const k = this.state === 'stunned' ? Math.min(1, this.st / 0.45) : 1 - this.st / 0.5;
      up.lerp(new THREE.Vector3(this.downAt.x, this.downAt.y + 0.9, this.downAt.z), Math.max(0, k));
    }
    this.headPos.copy(up);
    this.pos.copy(up);
    // Segmenten: en bezierkurva från hålet (under golvet) till huvudet
    const p0 = new THREE.Vector3(h.x, h.y - 4, h.z);
    const p1 = new THREE.Vector3(h.x, h.y + 2.5 * rise, h.z);
    const p2 = new THREE.Vector3().copy(up).addScaledVector(toC, -2.5).setY(up.y - 1.5);
    const p3 = up;
    const bz = (t, out) => {
      const u = 1 - t;
      return out.set(0, 0, 0)
        .addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(p3, t * t * t);
    };
    const tmp = new THREE.Vector3();
    m.segs.forEach((s, i) => {
      const t = i / this.N;
      bz(t, tmp);
      tmp.addScaledVector(side, Math.sin(this.sway * 1.3 + t * 5) * 0.4 * rise * (1 - t));
      s.position.copy(tmp);
      s.visible = tmp.y > h.y - 0.6;
    });
    bz(0.96, tmp);
    m.head.position.copy(up);
    const look = new THREE.Vector3().subVectors(up, tmp).normalize();
    // Huvudet tittar framåt (mot Cello) och lite nedåt
    const yaw = this.state === 'stunned' ? Math.atan2(toC.x, toC.z) : Math.atan2(this.lookX ?? toC.x, this.lookZ ?? toC.z);
    m.head.rotation.set(this.state === 'stunned' ? 0.25 : 0.35 - look.y * 0.3, yaw, 0, 'YXZ');
    m.head.visible = up.y > h.y - 0.8;
    m.hood.scale.set(1 + (this.state === 'strike' || this.state === 'spit' ? 0.25 : 0), 1, 1);
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.burn = Math.max(0, this.burn - dt * 0.35);
    const fast = this.phase2 ? 1.35 : 1;
    const h = this.holes[this.hole];
    this.lookX = p.feet.x - this.headPos.x;
    this.lookZ = p.feet.z - this.headPos.z;
    switch (this.state) {
      case 'dormant':
        break;
      case 'emerge':
        this.rise = Math.min(1, this.st / 1.2);
        this.lunge = 0;
        if (this.st < 0.05) { g.sfx.play('hiss', { vol: 1.2 }); g.rig.shake(0.35); g.fx.burst('ash', h.clone().setY(h.y + 0.3), 30); }
        if (this.st >= 1.3) { this.strikes = 0; this.setState('sway'); }
        break;
      case 'sway':
        this.sway += dt * 1.6 * fast;
        if (this.st > 1.6 / fast) {
          if (this.strikes >= (this.phase2 ? 3 : 2)) this.setState('submerge');
          else if (Math.random() < 0.4) this.setState('spit');
          else {
            this.target.set(p.feet.x, p.feet.y + 0.8, p.feet.z);
            this.setState('strike');
            g.sfx.play('hiss', { vol: 1 });
          }
        }
        break;
      case 'strike': {
        // Lyfter huvudet, väntar (ringen visar var det träffar) och hugger
        const wind = 0.75 / fast;
        this.strikeRing.position.set(this.target.x, this.target.y - 0.74, this.target.z);
        if (this.st < wind) {
          this.strikeRing.material.opacity = 0.2 + 0.6 * (this.st / wind);
          this.lunge = -0.15 * (this.st / wind);
        } else if (this.st < wind + 0.2) {
          this.lunge = Math.min(1, (this.st - wind) / 0.2);
          if (!this.bit && this.lunge >= 1) {
            this.bit = true;
            g.sfx.play('stomp', { vol: 1 });
            g.rig.shake(0.4);
            g.fx.burst('ash', this.target.clone(), 16);
            if (Math.hypot(p.feet.x - this.target.x, p.feet.z - this.target.z) < 2.1 && p.feet.y - this.target.y < 1.2) p.takeHit(3, this.headPos);
          }
        } else {
          this.strikeRing.material.opacity = 0;
          this.lunge = Math.max(0, 1 - (this.st - wind - 0.2) / 0.6);
          if (this.lunge <= 0) { this.bit = false; this.strikes++; this.setState('sway'); }
        }
        break;
      }
      case 'spit': {
        this.sway += dt * 0.8;
        const n = this.phase2 ? 2 : 1;
        if (this.st > 0.5 && !this.spat) {
          this.spat = true;
          g.sfx.play('hiss', { vol: 0.8 });
          for (let k = 0; k < n; k++) {
            const o = this.orbs.find((q) => !q.on);
            if (!o) break;
            o.on = true;
            o.t = 0;
            o.m.visible = true;
            o.pos.copy(this.headPos);
            const aim = new THREE.Vector3(p.feet.x + (k ? 2 : 0), p.feet.y + 1.0, p.feet.z + (k ? -1.5 : 0)).sub(o.pos).normalize();
            o.vel.copy(aim).multiplyScalar(7.5);
          }
        }
        if (this.st > 1.3) { this.spat = false; this.strikes++; this.setState('sway'); }
        break;
      }
      case 'stunned':
        this.rise = 1;
        this.lunge = 0;
        if (this.st > 5.5) this.setState('recoil');
        break;
      case 'recoil':
        if (this.st < 0.05) g.sfx.play('hiss', { vol: 1.2 });
        if (this.st > 0.8) this.setState('submerge');
        break;
      case 'submerge':
        this.rise = Math.max(0, 1 - this.st / 0.9);
        this.lunge = 0;
        this.strikeRing.material.opacity = 0;
        if (this.st >= 1.0) {
          // Gräver sig till ett annat hål
          let next = this.hole;
          while (next === this.hole) next = Math.floor(Math.random() * this.holes.length);
          this.from = this.hole;
          this.hole = next;
          this.setState('travel');
          g.sfx.play('crumble', { vol: 0.6 });
        }
        break;
      case 'travel': {
        this.rise = 0;
        const k = Math.min(1, this.st / (1.6 / fast));
        const a = this.holes[this.from], b = this.holes[this.hole];
        const q = new THREE.Vector3().lerpVectors(a, b, k);
        if (Math.random() < dt * 40) g.fx.burst('ash', q.setY(q.y + 0.2), 2);
        if (k >= 1) this.setState('emerge');
        break;
      }
      case 'dead':
        this.rise = Math.max(0, 1 - this.st / 2.6);
        if (Math.random() < dt * 40) g.fx.burst('ash', this.headPos.clone(), 3);
        if (this.st > 2.8 && !this.gone) {
          this.gone = true;
          this.model.root.visible = false;
          this.state = 'gone';
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }
    // Skuggkloten
    for (const o of this.orbs) {
      if (!o.on) continue;
      o.t += dt;
      const to = new THREE.Vector3(p.feet.x, p.feet.y + 1.0, p.feet.z).sub(o.pos);
      const d = to.length();
      o.vel.addScaledVector(to.normalize(), dt * 6).clampLength(0, 8.5);
      o.pos.addScaledVector(o.vel, dt);
      o.m.position.copy(o.pos);
      o.m.rotation.y += dt * 6;
      o.m.scale.setScalar(1 + Math.sin(o.t * 12) * 0.12);
      if (Math.random() < dt * 12) g.fx.burst('ash', o.pos.clone(), 1);
      if (d < 0.9) {
        o.on = false;
        o.m.visible = false;
        g.fx.burst('ash', o.pos.clone(), 12);
        p.takeHit(1, o.pos.clone().sub(o.vel));
      } else if (o.t > 5 || o.pos.y < p.feet.y - 2) {
        o.on = false;
        o.m.visible = false;
      }
    }
    // Cello går inte igenom huvudet när det ligger nere
    if (this.state === 'stunned') {
      const dx = p.feet.x - this.headPos.x, dz = p.feet.z - this.headPos.z, dd = Math.hypot(dx, dz);
      if (dd < 1.5 && dd > 1e-4) p.nudge((dx / dd) * (1.5 - dd), (dz / dd) * (1.5 - dd));
    }
    this.place(dt);
    const m = this.model;
    const f = this.flash > 0 ? 0.9 : 0;
    const lit = Math.min(1, this.burn / 0.55);
    for (const mat of m.mats) mat.emissive.setRGB(f + lit * 0.5, f + lit * 0.32, f + lit * 0.05);
    m.M.gem.color.setRGB(0.6 + (this.state === 'stunned' ? 0.4 : 0), 0.35 + (this.state === 'stunned' ? 0.4 : 0), 1);
  }
}

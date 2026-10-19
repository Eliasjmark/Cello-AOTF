// En försvagad titan: fortfarande enorm, men förkrympt efter kriget mot gudarna.
// Utan reliker går den inte att skada. Brutna kedjor från fängelset djupt i jorden hänger kvar.
import * as THREE from 'three';
import { mergeRigid } from './geom.js';

const RADIUS = 1.7;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function buildTitan(o = {}) {
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = { stone: lam(o.stone ?? 0x3a3634), dark: lam(o.dark ?? 0x24211f), crown: lam(0x5e5238), chain: lam(0x55525a) };
  const glow = new THREE.MeshBasicMaterial({ color: 0xffa860 });
  const eye = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 2.4;
  root.add(hips);
  const leg = (s) => {
    const g = new THREE.Group();
    g.position.set(0.8 * s, 0, 0);
    g.add(B(1.0, 2.0, 1.1, M.stone, 0, -1.0, 0));
    g.add(B(1.2, 0.5, 1.6, M.dark, 0, -2.15, 0.2));
    g.add(B(0.1, 1.0, 0.04, glow, 0.2 * s, -0.9, 0.56));
    hips.add(g);
    return g;
  };
  const torso = new THREE.Group();
  torso.rotation.x = 0.25;
  hips.add(torso);
  torso.add(B(3.0, 2.4, 1.8, M.stone, 0, 1.2, 0));
  torso.add(B(2.4, 0.9, 1.4, M.dark, 0, 2.5, -0.3));
  [-1, 1].forEach((s) => torso.add(B(1.2, 0.6, 1.4, M.dark, 1.5 * s, 2.25, 0)));
  torso.add(B(0.14, 1.5, 0.05, glow, -0.5, 1.2, 0.92));
  torso.add(B(0.12, 1.0, 0.05, glow, 0.4, 1.4, 0.92));
  torso.add(B(1.0, 0.12, 0.05, glow, 0, 1.8, 0.92));
  torso.add(B(0.12, 1.2, 0.05, glow, 0.2, 1.1, -0.92));
  const head = new THREE.Group();
  head.position.set(0, 2.6, 0.6);
  head.add(B(1.1, 1.1, 1.1, M.stone, 0, 0.3, 0));
  head.add(B(0.9, 0.35, 0.5, M.dark, 0, -0.2, 0.35));
  head.add(B(0.22, 0.12, 0.04, eye, -0.25, 0.35, 0.56));
  head.add(B(0.22, 0.12, 0.04, eye, 0.25, 0.35, 0.56));
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), M.crown);
    c.position.set(-0.4 + i * 0.2, 0.98 + (i === 2 ? 0.1 : 0), -0.1);
    head.add(c);
  }
  torso.add(head);
  const arm = (s) => {
    const g = new THREE.Group();
    g.position.set(1.85 * s, 2.0, 0);
    g.add(B(0.95, 2.6, 0.95, M.stone, 0, -1.25, 0));
    g.add(B(1.3, 1.2, 1.3, M.dark, 0, -3.0, 0));
    g.add(B(0.08, 1.2, 0.04, glow, 0.15 * s, -1.2, 0.49));
    // Brutna kedjor från fängelset
    for (let k = 0; k < 3; k++) g.add(B(0.18, 0.28, 0.08, M.chain, 0.4 * s, -2.6 - k * 0.3, 0.45 + (k % 2) * 0.05));
    torso.add(g);
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  const legL = leg(-1), legR = leg(1);
  return { root, hips, torso, head, armL, armR, legL, legR, glow, eye, M };
}

export function ring(r0, r1, a0 = 0, len = Math.PI * 2) {
  const g = new THREE.RingGeometry(r0, r1, 40, 1, a0, len);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0xff7a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide,
  }));
  m.renderOrder = 3;
  // En osynlig ring (opacitet 0) ska inte kosta någon ritning
  Object.defineProperty(m, 'visible', { get() { return this.material.opacity > 0.004; }, set() {} });
  return m;
}

export class Titan {
  constructor(scene, home, groundAt) {
    this.model = buildTitan();
    mergeRigid(this.model.root);
    scene.add(this.model.root);
    this.home = home.clone();
    this.pos = home.clone();
    this.groundAt = groundAt;
    this.facing = 1.2;
    this.state = 'idle';
    this.st = 0;
    this.t = 0;
    this.roarT = 3;
    this.roaring = 0;
    this.attack = null;
    this.cooldown = 1.5;
    this.fightT = 0;
    this.clangToast = false;
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 4; // kameran backar vid lock-on
    this.slamRing = ring(2.5, 2.9);
    this.sweepArc = ring(1.6, 7.6, 0, 2.6);
    this.wave = ring(0.2, 0.6);
    scene.add(this.slamRing, this.sweepArc, this.wave);
    this.waveT = -1;
    this.onImpact = null; // (kind, pos)
    this.onRoar = null;
    this.onClang = null;
  }

  get targetable() {
    return this.state === 'fight';
  }

  get chest() {
    return this.chestPos.set(this.pos.x, this.pos.y + 4.2, this.pos.z);
  }

  reset() {
    this.pos.copy(this.home);
    this.state = 'idle';
    this.st = 0;
    this.attack = null;
    this.cooldown = 1.5;
    this.fightT = 0;
    this.model.root.visible = true;
    this.model.root.rotation.set(0, this.facing, 0);
    this.slamRing.material.opacity = 0;
    this.sweepArc.material.opacity = 0;
  }

  hide() {
    this.state = 'gone';
    this.model.root.visible = false;
    this.slamRing.material.opacity = 0;
    this.sweepArc.material.opacity = 0;
    this.wave.material.opacity = 0;
  }

  fight() {
    this.state = 'fight';
    this.st = 0;
    this.fightT = 0;
    this.cooldown = 1.0;
    this.roar();
  }

  leave() {
    this.state = 'leave';
    this.st = 0;
    this.attack = null;
    this.roar();
  }

  finale() {
    this.state = 'finale';
    this.st = 0;
    this.attack = { kind: 'slam', t: 0, wind: 1.0, target: new THREE.Vector3(), hit: false };
  }

  roar() {
    this.roaring = 1.4;
    this.onRoar?.(this);
  }

  turnTo(x, z, rate, dt) {
    this.facing += wrap(Math.atan2(x - this.pos.x, z - this.pos.z) - this.facing) * (1 - Math.exp(-rate * dt));
  }

  // Returnerar sant när striden är över (finalen ska börja)
  update(dt, player) {
    if (this.state === 'gone') return false;
    this.t += dt;
    this.st += dt;
    this.roaring = Math.max(0, this.roaring - dt);
    const dx = player.feet.x - this.pos.x, dz = player.feet.z - this.pos.z, dist = Math.hypot(dx, dz);
    let walk = 0, over = false;

    if (this.state === 'idle') {
      this.roarT -= dt;
      if (this.roarT <= 0) { this.roar(); this.roarT = 7 + Math.random() * 4; }
      this.facing = 1.2 + Math.sin(this.t * 0.3) * 0.5;
    } else if (this.state === 'leave') {
      const tx = -40, tz = 9;
      this.turnTo(tx, tz, 2, dt);
      if (this.st > 1.4) {
        const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        const step = Math.min(d, 2.4 * dt);
        this.pos.x += Math.sin(this.facing) * step;
        this.pos.z += Math.cos(this.facing) * step;
        walk = 1;
        const gy = this.groundAt(this.pos.x, this.pos.y + 2, this.pos.z);
        if (gy === null || this.pos.x < -31) {
          this.fall = (this.fall || 0) + dt * 12;
          this.pos.y -= this.fall * dt;
        }
        if (this.pos.y < this.home.y - 45) this.hide();
      }
    } else if (this.state === 'fight' || this.state === 'finale') {
      this.fightT += dt;
      this.cooldown -= dt;
      const a = this.attack;
      if (!a) {
        this.turnTo(player.feet.x, player.feet.z, 1.6, dt);
        if (dist > 8.5 && Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) < 10) {
          this.pos.x += Math.sin(this.facing) * 1.7 * dt;
          this.pos.z += Math.cos(this.facing) * 1.7 * dt;
          const gy = this.groundAt(this.pos.x, this.pos.y + 2, this.pos.z);
          if (gy !== null) this.pos.y = approach(this.pos.y, gy, 6, dt);
          walk = 1;
        }
        if (this.cooldown <= 0) {
          const ang = Math.abs(wrap(Math.atan2(dx, dz) - this.facing));
          const kind = dist < 7.2 && ang < 1.0 && Math.random() < 0.5 ? 'sweep' : 'slam';
          this.attack = { kind, t: 0, wind: kind === 'slam' ? 0.95 : 0.8, target: new THREE.Vector3(), hit: false };
          if (kind === 'slam') this.attack.target.copy(player.feet);
        }
      }
      if (this.attack) over = this.runAttack(dt, player, dist, dx, dz);
      if (this.state === 'fight' && !this.attack && (this.fightT > 30 || player.hp <= 2)) over = true;
    }

    // Svärdet studsar mot titanens hud
    const sw = player.swing;
    if (sw && sw.active && !sw.hit.has(this) && this.state !== 'idle' && this.state !== 'leave') {
      const ang = Math.abs(wrap(Math.atan2(-dx, -dz) - player.facing));
      if (dist - RADIUS < sw.reach && ang < sw.arc + 0.3) {
        sw.hit.add(this);
        this.onClang?.(this, !this.clangToast);
        this.clangToast = true;
      }
    }
    // Cello kan inte gå igenom titanen
    if (this.state !== 'gone' && dist < RADIUS + 0.4 && dist > 1e-3 && Math.abs(player.feet.y - this.pos.y) < 5) {
      player.nudge((dx / dist) * (RADIUS + 0.4 - dist), (dz / dist) * (RADIUS + 0.4 - dist));
    }

    this.animate(dt, walk);
    return over;
  }

  runAttack(dt, player, dist, dx, dz) {
    const a = this.attack;
    a.t += dt;
    if (a.kind === 'slam') {
      if (a.t < a.wind * 0.55 || this.state === 'finale') a.target.copy(player.feet);
      const k = Math.min(1, a.t / a.wind);
      this.slamRing.position.set(a.target.x, a.target.y + 0.06, a.target.z);
      this.slamRing.scale.setScalar(1.35 - 0.35 * k);
      this.slamRing.material.opacity = a.t < a.wind ? 0.25 + 0.55 * k : 0;
      this.turnTo(a.target.x, a.target.z, 3, dt);
      if (!a.hit && a.t >= a.wind) {
        a.hit = true;
        const d = Math.hypot(player.feet.x - a.target.x, player.feet.z - a.target.z);
        const air = player.feet.y - a.target.y;
        let hitPlayer = false;
        if (this.state === 'finale' || (d < 2.9 && air < 1.2)) {
          hitPlayer = player.takeHit(2, a.target, { unblockable: true, nonLethal: true, force: this.state === 'finale' }) === 'hit';
        }
        this.wave.position.set(a.target.x, a.target.y + 0.08, a.target.z);
        this.waveT = 0;
        this.onImpact?.('slam', a.target, hitPlayer);
      }
      if (a.t > a.wind + 0.8) { this.attack = null; this.cooldown = 1.1; if (this.state === 'finale') return true; }
    } else {
      // Svepet: hoppa över armen eller rulla undan, skölden hjälper inte
      const k = Math.min(1, a.t / a.wind);
      this.sweepArc.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
      this.sweepArc.rotation.y = this.facing - Math.PI / 2 - 1.3;
      this.sweepArc.material.opacity = a.t < a.wind ? 0.12 + 0.4 * k : a.t < a.wind + 0.15 ? 0.7 : 0;
      if (a.t < a.wind * 0.6) this.turnTo(player.feet.x, player.feet.z, 2.5, dt);
      if (!a.hit && a.t >= a.wind + 0.08) {
        a.hit = true;
        const ang = Math.abs(wrap(Math.atan2(dx, dz) - this.facing));
        const air = player.feet.y - this.pos.y;
        let hitPlayer = false;
        if (dist < 7.8 && ang < 1.35 && air < 0.55) {
          hitPlayer = player.takeHit(2, this.pos, { unblockable: true, nonLethal: true }) === 'hit';
        }
        this.onImpact?.('sweep', this.pos, hitPlayer);
      }
      if (a.t > a.wind + 0.75) { this.attack = null; this.cooldown = 1.2; }
    }
    return false;
  }

  animate(dt, walk) {
    const m = this.model, a = this.attack, t = this.t;
    let armL = 0.1 + Math.sin(t * 0.8) * 0.05, armR = 0.1 + Math.sin(t * 0.8 + 1) * 0.05;
    let torsoX = 0.25 + Math.sin(t * 1.1) * 0.03, torsoY = 0, headX = 0, armLz = -0.15, armRz = 0.15, rate = 6;
    if (this.roaring > 0) {
      const k = Math.sin(Math.min(1, (1.4 - this.roaring) / 0.3) * Math.PI / 2);
      torsoX = 0.25 - 0.45 * k;
      headX = -0.5 * k;
      armLz = -0.15 - 0.9 * k;
      armRz = 0.15 + 0.9 * k;
    }
    if (a && a.kind === 'slam') {
      rate = 14;
      if (a.t < a.wind) { armL = armR = -3.0; torsoX = -0.1; headX = -0.2; }
      else { armL = armR = -0.6; torsoX = 0.8; rate = 40; }
    } else if (a && a.kind === 'sweep') {
      rate = 12;
      if (a.t < a.wind) { armR = -1.45; armRz = 0.9; torsoY = 0.9; }
      else { armR = -1.45; armRz = 0.4; torsoY = -1.1; rate = 30; }
    }
    m.armL.rotation.x = approach(m.armL.rotation.x, armL, rate, dt);
    m.armR.rotation.x = approach(m.armR.rotation.x, armR, rate, dt);
    m.armL.rotation.z = approach(m.armL.rotation.z, armLz, rate, dt);
    m.armR.rotation.z = approach(m.armR.rotation.z, armRz, rate, dt);
    m.torso.rotation.x = approach(m.torso.rotation.x, torsoX, rate, dt);
    m.torso.rotation.y = approach(m.torso.rotation.y, torsoY, rate, dt);
    m.head.rotation.x = approach(m.head.rotation.x, headX, 6, dt);
    const sw = Math.sin(t * 3.2) * 0.4 * walk;
    m.legL.rotation.x = approach(m.legL.rotation.x, -sw, 8, dt);
    m.legR.rotation.x = approach(m.legR.rotation.x, sw, 8, dt);
    const pulse = 0.75 + Math.sin(t * 2.4) * 0.15 + (a && a.t < a.wind ? 0.25 : 0);
    m.glow.color.setRGB(1, 0.55 * pulse + 0.1, 0.25 * pulse);
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const k = this.waveT / 0.45;
      this.wave.scale.setScalar(1 + k * 7);
      this.wave.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) this.waveT = -1;
    }
  }
}

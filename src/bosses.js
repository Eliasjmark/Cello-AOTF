// Bastionens väktare:
//  · Järnväktaren (miniboss) – en jättelik askling i rustning med sköld och yxa.
//    Skölden tar emot slag framifrån. Fastnar yxan i golvet, eller kommer Cello åt ryggen, går den att skada.
//  · Hrungnir (boss) – jätten med hjärta av sten. Bara blixten från stormpelarna får honom på knä,
//    och då ligger stenhjärtat öppet.
import * as THREE from 'three';
import { buildTitan, ring } from './titan.js';
import { mergeRigid } from './geom.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

// ====================================================================
// Järnväktaren
// ====================================================================
function buildWarden() {
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = {
    ash: lam(0x3a3531), plate: lam(0x4c4e58), dark: lam(0x24232a), bone: lam(0xbfb196),
    wood: lam(0x5b3f2a), rim: lam(0x6a6c74), paint: lam(0x7a2a24),
    eye: new THREE.MeshBasicMaterial({ color: 0xffb04a }), glow: new THREE.MeshBasicMaterial({ color: 0xff7426 }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  body.add(hips);
  const leg = (s) => {
    const g = new THREE.Group();
    g.position.set(0.24 * s, 0, 0);
    g.add(B(0.32, 0.55, 0.36, M.plate, 0, -0.27, 0));
    g.add(B(0.38, 0.22, 0.5, M.dark, 0, -0.78, 0.06));
    hips.add(g);
    return g;
  };
  const torso = new THREE.Group();
  torso.rotation.x = 0.2;
  hips.add(torso);
  torso.add(B(0.95, 0.85, 0.66, M.ash, 0, 0.44, 0));
  torso.add(B(1.0, 0.6, 0.7, M.plate, 0, 0.62, 0.02));
  torso.add(B(0.06, 0.3, 0.02, M.glow, -0.2, 0.3, 0.34));
  torso.add(B(0.3, 0.05, 0.02, M.glow, 0.05, 0.22, 0.34));
  [-1, 1].forEach((s) => torso.add(B(0.4, 0.22, 0.6, M.plate, 0.6 * s, 0.86, 0)));
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0.18);
  head.add(B(0.52, 0.46, 0.52, M.plate, 0, 0.12, 0.04));
  head.add(B(0.46, 0.08, 0.06, M.dark, 0, 0.12, 0.31));
  head.add(B(0.12, 0.06, 0.03, M.eye, -0.12, 0.12, 0.34));
  head.add(B(0.12, 0.06, 0.03, M.eye, 0.12, 0.12, 0.34));
  [-1, 1].forEach((s) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 5), M.bone);
    horn.position.set(0.34 * s, 0.42, 0);
    horn.rotation.set(0, 0, -0.9 * s);
    head.add(horn);
  });
  torso.add(head);
  const arm = (s) => {
    const g = new THREE.Group();
    g.position.set(0.62 * s, 0.72, 0.02);
    g.add(B(0.26, 0.85, 0.28, M.ash, 0, -0.4, 0));
    g.add(B(0.32, 0.3, 0.32, M.plate, 0, -0.88, 0));
    torso.add(g);
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  // Rund nordisk sköld på vänster arm
  const shield = new THREE.Group();
  shield.position.set(-0.05, -0.62, 0.32);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 14), M.wood);
  disc.rotation.x = Math.PI / 2;
  shield.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 4, 14), M.rim);
  shield.add(rim);
  shield.add(B(0.2, 0.2, 0.14, M.rim, 0, 0, 0.05));
  shield.add(B(0.08, 1.3, 0.02, M.paint, 0, 0, 0.06));
  shield.add(B(1.3, 0.08, 0.02, M.paint, 0, 0, 0.06));
  armL.add(shield);
  // Yxa i höger hand
  const axe = new THREE.Group();
  axe.position.y = -0.9;
  axe.add(B(0.08, 1.7, 0.08, M.wood, 0, -0.6, 0));
  axe.add(B(0.08, 0.7, 0.6, M.rim, 0, -1.3, 0.26));
  axe.add(B(0.06, 0.5, 0.2, M.rim, 0, -1.3, 0.62));
  armR.add(axe);
  const legL = leg(-1), legR = leg(1);
  root.scale.setScalar(1.6);
  const mats = [M.ash, M.plate, M.dark, M.bone, M.wood, M.rim, M.paint];
  return { root, body, hips, torso, head, armL, armR, legL, legR, shield, axe, M, mats };
}

export class IronWarden {
  constructor(scene, home, facing, bounds, groundAt) {
    this.model = buildWarden();
    mergeRigid(this.model.root);
    scene.add(this.model.root);
    this.home = home.clone();
    this.homeFacing = facing;
    this.bounds = bounds;
    this.groundAt = groundAt;
    this.pos = home.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 2;
    this.hitRadius = 1.0;
    this.hitHeight = [-1.0, 3.2];
    this.chopRing = ring(1.3, 1.7);
    this.sweepRing = ring(3.2, 3.6);
    scene.add(this.chopRing, this.sweepRing);
    this.onEvent = null;
    this.reset();
  }

  reset() {
    this.pos.copy(this.home);
    this.facing = this.homeFacing;
    this.hp = 10;
    this.state = 'dormant';
    this.st = 0;
    this.cooldown = 1.2;
    this.flash = 0;
    this.target = new THREE.Vector3();
    this.hitDone = false;
    this.anim = 0;
    this.model.root.visible = true;
    this.model.body.position.y = 0;
    this.model.body.rotation.set(0, 0, 0);
    this.chopRing.material.opacity = 0;
    this.sweepRing.material.opacity = 0;
    this.setStatue(true);
    this.pose(0);
  }

  setStatue(on) {
    for (const m of this.model.mats) m.emissive.setRGB(0, 0, 0);
    this.model.M.eye.color.set(on ? 0x2a2622 : 0xffb04a);
    this.model.M.glow.color.set(on ? 0x2a2622 : 0xff7426);
  }

  get targetable() {
    return !['dormant', 'wake', 'dead', 'gone'].includes(this.state);
  }

  get chest() {
    return this.chestPos.set(this.pos.x, this.pos.y + 2.4, this.pos.z);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.state = 'wake';
    this.st = 0;
    this.setStatue(false);
  }

  blocking(from) {
    if (['stuck', 'dead', 'dormant', 'wake', 'gone'].includes(this.state)) return false;
    const a = Math.atan2(from.x - this.pos.x, from.z - this.pos.z);
    return Math.abs(wrap(a - this.facing)) < 1.35;
  }

  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    if (!w?.unblockable && this.blocking(from)) {
      this.cooldown = Math.min(this.cooldown, 0.3);
      return 'blocked';
    }
    this.hp -= dmg;
    this.flash = 0.16;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.st = 0;
      this.chopRing.material.opacity = 0;
      this.sweepRing.material.opacity = 0;
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.state !== 'stuck') { this.state = 'hurt'; this.st = 0; }
    return 'hit';
  }

  slamHit(point, w) {
    if (!this.targetable) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 3.4) this.hurt(3, point, { ...w, unblockable: true });
  }

  setState(s) {
    this.state = s;
    this.st = 0;
    this.hitDone = false;
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z, dist = Math.hypot(dx, dz);
    const toward = Math.atan2(dx, dz);
    const turn = (rate) => { this.facing += Math.max(-rate * dt, Math.min(rate * dt, wrap(toward - this.facing))); };
    const fwd = () => new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    let walk = 0;
    this.cooldown -= dt;

    switch (this.state) {
      case 'dormant':
        break;
      case 'wake':
        if (this.st > 0.9 && !this.roared) { this.roared = true; g.sfx.play('bigroar', { vol: 0.8 }); g.rig.shake(0.3); }
        if (this.st > 2.2) { this.roared = false; this.setState('advance'); }
        break;
      case 'advance': {
        turn(2.2);
        if (dist > 2.7) {
          const f = fwd();
          this.pos.addScaledVector(f, 1.7 * dt);
          walk = 1;
        }
        if (this.cooldown <= 0 && dist < 5) {
          if (dist < 3.3 && Math.random() < 0.5) {
            this.setState('sweepWind');
            g.sfx.play('growl', { vol: 1.2 });
          } else {
            this.setState('chopWind');
            g.sfx.play('growl', { vol: 1.2 });
          }
        }
        break;
      }
      case 'chopWind': {
        if (this.st < 0.5) turn(1.4);
        this.target.copy(this.pos).addScaledVector(fwd(), 2.6);
        const k = Math.min(1, this.st / 0.85);
        this.chopRing.position.set(this.target.x, this.pos.y + 0.06, this.target.z);
        this.chopRing.material.opacity = 0.2 + 0.6 * k;
        if (this.st >= 0.85) {
          this.chopRing.material.opacity = 0;
          this.setState('stuck');
          g.sfx.play('stomp', { vol: 0.9 });
          g.sfx.play('clang', { vol: 0.6 });
          g.rig.shake(0.35);
          g.fx.burst('spark', this.target.clone().setY(this.pos.y + 0.2), 18, 0xffd08a);
          g.fx.burst('ash', this.target.clone().setY(this.pos.y + 0.2), 10);
          if (Math.hypot(p.feet.x - this.target.x, p.feet.z - this.target.z) < 1.9 && p.feet.y - this.pos.y < 1.4) {
            p.takeHit(2, this.pos);
          }
        }
        break;
      }
      case 'stuck':
        // Yxan sitter fast: nu går den att skada från alla håll
        if (this.st > 1.9) { this.cooldown = 1.0; this.setState('advance'); }
        break;
      case 'sweepWind': {
        const k = Math.min(1, this.st / 0.65);
        this.sweepRing.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
        this.sweepRing.material.opacity = 0.15 + 0.55 * k;
        if (this.st >= 0.65) {
          this.sweepRing.material.opacity = 0;
          g.sfx.play('swing', { vol: 1.4 });
          if (dist < 3.7 && p.feet.y - this.pos.y < 0.6) p.takeHit(1, this.pos);
          this.setState('sweep');
        }
        break;
      }
      case 'sweep':
        if (this.st > 0.7) { this.cooldown = 1.2; this.setState('advance'); }
        break;
      case 'hurt':
        if (this.st > 0.3) { this.cooldown = Math.min(this.cooldown, 0.4); this.setState('advance'); }
        break;
      case 'dead':
        if (this.st > 1.2 && !this.ashed) {
          this.ashed = true;
          g.fx.burst('ash', this.chest, 40);
          g.sfx.play('edie', { vol: 1.4 });
        }
        if (this.st > 2.6) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.ashed = false;
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }

    // Håll väktaren inne i salen och knuffa undan Cello
    const b = this.bounds;
    this.pos.x = Math.max(b.x0 + 1.2, Math.min(b.x1 - 1.2, this.pos.x));
    this.pos.z = Math.max(b.z0 + 1.2, Math.min(b.z1 - 1.2, this.pos.z));
    const gy = this.groundAt(this.pos.x, this.pos.y + 0.5, this.pos.z);
    if (gy !== null) this.pos.y = approach(this.pos.y, gy, 10, dt);
    if (this.state !== 'gone' && dist < 1.45 && dist > 1e-4 && Math.abs(p.feet.y - this.pos.y) < 2.5) {
      p.nudge((dx / dist) * (1.45 - dist), (dz / dist) * (1.45 - dist));
    }
    this.animate(dt, walk);
  }

  pose(walk) {
    this.animate(0.001, walk);
  }

  animate(dt, walk) {
    const m = this.model, st = this.st;
    this.anim += dt * (2 + walk * 4);
    const sw = Math.sin(this.anim) * 0.45 * walk;
    let armR = -0.3, armRz = 0.15, armL = -1.1, armLz = -0.1, torsoX = 0.2, torsoY = 0, hipsY = 0.9, bodyX = 0, headX = 0, legL = -sw, legR = sw;
    let rate = 10, bodyY = 0;
    switch (this.state) {
      case 'dormant':
        hipsY = 0.45; legL = -1.4; legR = 0.9; torsoX = 0.55; headX = 0.4; armR = -0.4; armL = -0.5; rate = 40;
        break;
      case 'wake': {
        const k = Math.min(1, st / 1.4);
        hipsY = 0.45 + 0.45 * k; legL = -1.4 * (1 - k); legR = 0.9 * (1 - k); torsoX = 0.55 - 0.7 * Math.sin(Math.min(1, st / 1.0) * Math.PI) ; headX = -0.3 * k;
        armL = -0.5 - 0.6 * k; armRz = 0.15 + 0.6 * Math.sin(k * Math.PI);
        break;
      }
      case 'chopWind':
        armR = -3.0; torsoX = -0.15; armL = -0.4; armLz = -0.4; rate = 12;
        break;
      case 'stuck':
        armR = -0.35; torsoX = 0.75 + Math.sin(st * 18) * 0.03; armL = -0.2; armLz = -0.35; hipsY = 0.78; headX = 0.2; rate = 40;
        break;
      case 'sweepWind':
        armR = -1.5; armRz = 1.0; torsoY = 1.2; armL = -0.9; rate = 10;
        break;
      case 'sweep':
        armR = -1.5; armRz = 0.6; torsoY = -1.2; rate = 30;
        bodyY = Math.min(1, st / 0.35) * Math.PI * 2;
        break;
      case 'hurt':
        torsoX = -0.2; headX = -0.3; rate = 25;
        break;
      case 'dead': {
        const k = Math.min(1, st / 1.2);
        hipsY = 0.9 - 0.45 * k; legL = -1.3 * k; legR = -1.3 * k; torsoX = 0.2 + 0.6 * k; armR = 0.2; armL = 0.2; rate = 6;
        if (st > 1.2) bodyX = -Math.min(1.5, (st - 1.2) * 2.5);
        break;
      }
      default:
        break;
    }
    const ap = (o, k, v, r = rate) => { o[k] = approach(o[k], v, r, dt); };
    ap(m.legL.rotation, 'x', legL);
    ap(m.legR.rotation, 'x', legR);
    ap(m.armR.rotation, 'x', armR);
    ap(m.armR.rotation, 'z', armRz);
    ap(m.armL.rotation, 'x', armL);
    ap(m.armL.rotation, 'z', armLz);
    ap(m.torso.rotation, 'x', torsoX);
    ap(m.torso.rotation, 'y', torsoY);
    ap(m.head.rotation, 'x', headX);
    ap(m.hips.position, 'y', hipsY);
    ap(m.body.rotation, 'x', bodyX, 6);
    m.body.rotation.y = bodyY;
    const f = this.flash > 0 ? 0.9 : 0;
    for (const mat of m.mats) mat.emissive.setRGB(f, f, f);
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
  }
}

// ====================================================================
// Hrungnir
// ====================================================================
export class Hrungnir {
  constructor(scene, center, home, groundAt) {
    this.scene = scene;
    this.center = center.clone();
    this.home = home.clone();
    this.groundAt = groundAt;
    const t = buildTitan({ stone: 0x5d574f, dark: 0x3a352f });
    this.model = t;
    t.root.scale.setScalar(1.15);
    scene.add(t.root);
    // Stenhjärtat i bröstet
    this.heartMat = new THREE.MeshBasicMaterial({ color: 0x5a2a12 });
    const heart = B(0.9, 0.9, 0.3, this.heartMat, 0, 1.25, 0.95);
    t.torso.add(heart);
    this.heartMesh = heart;
    // Brynet – Hrungnirs vapen av sten
    const whet = B(0.55, 3.0, 0.9, t.M.stone, 0, -4.6, 0.2);
    t.armR.add(whet);
    mergeRigid(t.root, [heart]);
    this.mats = [t.M.stone, t.M.dark];
    this.pos = home.clone();
    this.chestPos = new THREE.Vector3();
    this.heartPos = new THREE.Vector3();
    this.radiusBig = 6;
    this.hitRadius = 1.8;
    this.hitHeight = [-1.0, 6];
    this.slamRing = ring(2.5, 2.9);
    this.sweepArc = ring(1.6, 8.0, 0, 2.6);
    this.wave = ring(0.2, 0.6);
    this.pushRing = ring(0.3, 0.8);
    scene.add(this.slamRing, this.sweepArc, this.wave, this.pushRing);
    this.rocks = [];
    this.rockMat = t.M.stone;
    this.onEvent = null;
    this.reset();
  }

  reset() {
    this.pos.copy(this.home);
    this.facing = 0;
    this.hp = 18;
    this.cycle = 0;
    this.phase = 0;
    this.state = 'dormant';
    this.st = 0;
    this.attack = null;
    this.attackCount = 0;
    this.cooldown = 1.5;
    this.flash = 0;
    this.waveT = -1;
    this.pushT = -1;
    for (const r of this.rocks) { this.scene.remove(r.mesh); this.scene.remove(r.ring); }
    this.rocks = [];
    this.model.root.visible = true;
    this.model.root.rotation.set(0, 0, 0);
    this.model.root.position.copy(this.pos);
    for (const r of [this.slamRing, this.sweepArc, this.wave, this.pushRing]) r.material.opacity = 0;
    this.heartMat.color.set(0x5a2a12);
    this.model.glow.color.set(0x3a2a1c);
    this.model.eye.color.set(0x3a3a3a);
    this.animate(0.001, 0);
  }

  get targetable() {
    return ['fight', 'stunned', 'recover'].includes(this.state);
  }

  get stunned() {
    return this.state === 'stunned';
  }

  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.heartMesh.getWorldPosition(this.chestPos);
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.state = 'intro';
    this.st = 0;
    this.model.eye.color.set(0xfff0c0);
  }

  // Blixten från en stormpelare slår ner i Hrungnir
  zap() {
    if (this.state !== 'fight') return false;
    this.attack = null;
    for (const r of [this.slamRing, this.sweepArc]) r.material.opacity = 0;
    this.state = 'stunned';
    this.st = 0;
    this.cycle = 0;
    this.flash = 0.3;
    return true;
  }

  canSwordHit(player, swing) {
    if (!this.targetable) return false;
    const h = this.chest;
    if (this.stunned) {
      const d = Math.hypot(h.x - player.feet.x, h.z - player.feet.z);
      return d < swing.reach + 1.1 && h.y - player.feet.y < 3.2;
    }
    return Math.hypot(this.pos.x - player.feet.x, this.pos.z - player.feet.z) < swing.reach + 1.7;
  }

  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    if (!this.stunned) return 'immune';
    this.hp -= dmg;
    this.cycle += dmg;
    this.flash = 0.18;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.st = 0;
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.cycle >= 6) this.recover();
    return 'hit';
  }

  slamHit(point, w) {
    if (!this.stunned) return;
    const h = this.chest;
    if (Math.hypot(point.x - h.x, point.z - h.z) < 3.4) this.hurt(3, point, w);
  }

  recover() {
    this.state = 'recover';
    this.st = 0;
    this.phase = Math.min(2, this.phase + 1);
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z, dist = Math.hypot(dx, dz);
    const toward = Math.atan2(dx, dz);
    const turn = (rate) => { this.facing += Math.max(-rate * dt, Math.min(rate * dt, wrap(toward - this.facing))); };
    let walk = 0;

    switch (this.state) {
      case 'dormant':
        break;
      case 'intro':
        if (this.st > 0.8 && !this.roared) {
          this.roared = true;
          g.sfx.play('bigroar');
          g.rig.shake(0.6);
          this.model.glow.color.set(0xffa860);
        }
        if (this.st > 2.6) { this.roared = false; this.state = 'fight'; this.st = 0; this.cooldown = 1.0; }
        break;
      case 'fight': {
        this.cooldown -= dt;
        if (!this.attack) {
          turn(1.6 + this.phase * 0.3);
          if (dist > 6.5) {
            const sp = 2.0 + this.phase * 0.35;
            this.pos.x += Math.sin(this.facing) * sp * dt;
            this.pos.z += Math.cos(this.facing) * sp * dt;
            walk = 1;
          }
          if (this.cooldown <= 0) this.chooseAttack(p, dist, toward, g);
        } else this.runAttack(dt, p, dist, toward, g);
        break;
      }
      case 'stunned':
        if (this.st > 4.6) this.recover();
        break;
      case 'recover':
        if (this.st > 0.5 && this.pushT < 0) {
          this.pushT = 0;
          g.sfx.play('bigroar', { vol: 0.9 });
          g.rig.shake(0.4);
          if (dist < 7) {
            const k = 1 / Math.max(0.5, dist);
            p.vel.set(dx * k * 10, 4.5, dz * k * 10);
            p.grounded = false;
            p.jumping = true;
          }
        }
        if (this.st > 1.5) { this.state = 'fight'; this.st = 0; this.cooldown = 0.8; this.pushT = -1; }
        break;
      case 'dead':
        if (this.st > 0.4 && !this.crumbled) { this.crumbled = true; g.sfx.play('crumble'); g.sfx.play('bigroar', { vol: 0.6 }); }
        if (this.st > 1.0 && Math.random() < dt * 14) g.fx.burst('ash', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, -Math.random() * 3, 0)), 6);
        if (this.st > 3.2) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.crumbled = false;
          g.fx.burst('ash', this.pos.clone().setY(this.pos.y + 2), 50);
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }

    // Kastade stenblock
    for (const r of this.rocks) {
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      r.mesh.position.lerpVectors(r.from, r.to, k);
      r.mesh.position.y += Math.sin(k * Math.PI) * 6;
      r.mesh.rotation.x += dt * 5;
      r.ring.material.opacity = 0.2 + 0.6 * k;
      if (k >= 1 && !r.done) {
        r.done = true;
        g.sfx.play('crumble', { vol: 0.8 });
        g.rig.shake(0.25);
        g.fx.burst('ash', r.to.clone().setY(r.to.y + 0.4), 18);
        if (Math.hypot(p.feet.x - r.to.x, p.feet.z - r.to.z) < 1.9 && p.feet.y - r.to.y < 1.2) p.takeHit(2, r.to, { unblockable: true });
      }
    }
    for (const r of this.rocks) if (r.done) { this.scene.remove(r.mesh); this.scene.remove(r.ring); }
    this.rocks = this.rocks.filter((r) => !r.done);

    // Inne i arenan, och Cello kan inte gå igenom jätten
    const cx = this.pos.x - this.center.x, cz = this.pos.z - this.center.z, cd = Math.hypot(cx, cz);
    if (cd > 11.5) { this.pos.x = this.center.x + (cx / cd) * 11.5; this.pos.z = this.center.z + (cz / cd) * 11.5; }
    const gy = this.groundAt(this.pos.x, this.pos.y + 1, this.pos.z);
    if (gy !== null) this.pos.y = approach(this.pos.y, gy, 8, dt);
    const R = 2.1;
    if (this.state !== 'gone' && dist < R && dist > 1e-3 && Math.abs(p.feet.y - this.pos.y) < 5) {
      p.nudge((dx / dist) * (R - dist), (dz / dist) * (R - dist));
    }
    this.animate(dt, walk);
  }

  chooseAttack(p, dist, toward, g) {
    const ang = Math.abs(wrap(toward - this.facing));
    const speed = [1, 0.86, 0.75][this.phase];
    this.attackCount++;
    let kind = 'slam';
    if (dist < 7.5 && ang < 1.1 && Math.random() < 0.45) kind = 'sweep';
    else if (this.phase >= 1 && this.attackCount % 3 === 0) kind = 'rocks';
    this.attack = { kind, t: 0, wind: (kind === 'slam' ? 1.0 : kind === 'sweep' ? 0.85 : 0.7) * speed, target: p.feet.clone(), hit: false, thrown: 0 };
    g.sfx.play('growl', { vol: 1.5 });
  }

  runAttack(dt, p, dist, toward, g) {
    const a = this.attack;
    a.t += dt;
    const cool = [1.3, 1.05, 0.85][this.phase];
    if (a.kind === 'slam') {
      if (a.t < a.wind * 0.6) a.target.copy(p.feet);
      const k = Math.min(1, a.t / a.wind);
      this.slamRing.position.set(a.target.x, a.target.y + 0.06, a.target.z);
      this.slamRing.scale.setScalar(1.35 - 0.35 * k);
      this.slamRing.material.opacity = a.t < a.wind ? 0.25 + 0.55 * k : 0;
      this.facing += wrap(Math.atan2(a.target.x - this.pos.x, a.target.z - this.pos.z) - this.facing) * (1 - Math.exp(-3 * dt));
      if (!a.hit && a.t >= a.wind) {
        a.hit = true;
        g.sfx.play('stomp');
        g.rig.shake(0.5);
        g.fx.burst('ash', a.target.clone().setY(a.target.y + 0.3), 24);
        this.wave.position.set(a.target.x, a.target.y + 0.08, a.target.z);
        this.waveT = 0;
        if (Math.hypot(p.feet.x - a.target.x, p.feet.z - a.target.z) < 2.9 && p.feet.y - a.target.y < 1.2) p.takeHit(2, a.target, { unblockable: true });
      }
      if (a.t > a.wind + 0.8) { this.attack = null; this.cooldown = cool; }
    } else if (a.kind === 'sweep') {
      const k = Math.min(1, a.t / a.wind);
      this.sweepArc.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
      this.sweepArc.rotation.y = this.facing - Math.PI / 2 - 1.3;
      this.sweepArc.material.opacity = a.t < a.wind ? 0.12 + 0.4 * k : a.t < a.wind + 0.15 ? 0.7 : 0;
      if (a.t < a.wind * 0.6) this.facing += wrap(toward - this.facing) * (1 - Math.exp(-2.5 * dt));
      if (!a.hit && a.t >= a.wind + 0.08) {
        a.hit = true;
        g.sfx.play('swing', { vol: 1.6 });
        const ang = Math.abs(wrap(toward - this.facing));
        if (dist < 8.2 && ang < 1.35 && p.feet.y - this.pos.y < 0.55) p.takeHit(2, this.pos, { unblockable: true });
      }
      if (a.t > a.wind + 0.75) { this.attack = null; this.cooldown = cool; }
    } else {
      // Tre stenblock, ett i taget, mot där Cello står
      this.facing += wrap(toward - this.facing) * (1 - Math.exp(-3 * dt));
      const next = a.wind + a.thrown * 0.75;
      if (a.thrown < 3 && a.t >= next) {
        a.thrown++;
        const from = this.chest.clone();
        const to = p.feet.clone().add(new THREE.Vector3(p.vel.x * 0.5, 0, p.vel.z * 0.5));
        const gy = this.groundAt(to.x, to.y + 2, to.z);
        if (gy !== null) to.y = gy;
        const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), this.rockMat);
        mesh.position.copy(from);
        const rg = ring(1.4, 1.9);
        rg.position.set(to.x, to.y + 0.07, to.z);
        this.scene.add(mesh, rg);
        this.rocks.push({ mesh, ring: rg, from, to, t: 0, dur: 1.0, done: false });
        g.sfx.play('swing', { vol: 1.2 });
      }
      if (a.thrown >= 3 && a.t > next + 1.2) { this.attack = null; this.cooldown = cool; }
    }
  }

  animate(dt, walk) {
    const m = this.model, a = this.attack, t = this.st;
    let armL = 0.1, armR = 0.1, armLz = -0.15, armRz = 0.15, torsoX = 0.25, torsoY = 0, headX = 0, hipsY = 2.4, legL = 0, legR = 0, rate = 6;
    const sw = Math.sin(performance.now() / 1000 * 3.2) * 0.4 * walk;
    legL = -sw; legR = sw;
    switch (this.state) {
      case 'dormant':
        torsoX = 0.5; headX = 0.4; armL = 0.3; armR = 0.3; rate = 40;
        break;
      case 'intro': {
        const k = Math.sin(Math.min(1, Math.max(0, (t - 0.6) / 0.4)) * Math.PI / 2) * (t < 2.0 ? 1 : 0);
        torsoX = 0.5 - 0.9 * k; headX = -0.5 * k; armLz = -0.15 - 1.0 * k; armRz = 0.15 + 1.0 * k;
        break;
      }
      case 'stunned':
        hipsY = 1.05; legL = -1.4; legR = 0.6; torsoX = 0.75; headX = -0.2; armL = 0.4; armR = 0.4; armLz = -0.5; armRz = 0.5; rate = 8;
        break;
      case 'recover':
        torsoX = -0.3; headX = -0.6; armLz = -1.0; armRz = 1.0; rate = 8;
        break;
      case 'dead': {
        const k = Math.min(1, t / 1.5);
        hipsY = 2.4 - 1.5 * k; legL = -1.4 * k; legR = 0.6 * k; torsoX = 0.25 + 0.9 * k; armL = 0.6; armR = 0.6; rate = 4;
        break;
      }
      default:
        break;
    }
    if (a && a.kind === 'slam') {
      rate = 14;
      if (a.t < a.wind) { armL = -3.0; armR = -3.0; torsoX = -0.1; headX = -0.2; }
      else { armL = -0.6; armR = -0.6; torsoX = 0.8; rate = 40; }
    } else if (a && a.kind === 'sweep') {
      rate = 12;
      if (a.t < a.wind) { armR = -1.45; armRz = 0.9; torsoY = 0.9; }
      else { armR = -1.45; armRz = 0.4; torsoY = -1.1; rate = 30; }
    } else if (a && a.kind === 'rocks') {
      const c = ((a.t - a.wind + 0.75) % 0.75) / 0.75;
      armL = -2.6 + c * 2.2; torsoX = -0.1 + c * 0.4; rate = 20;
    }
    const ap = (o, k, v, r = rate) => { o[k] = approach(o[k], v, r, dt); };
    ap(m.armL.rotation, 'x', armL);
    ap(m.armR.rotation, 'x', armR);
    ap(m.armL.rotation, 'z', armLz);
    ap(m.armR.rotation, 'z', armRz);
    ap(m.torso.rotation, 'x', torsoX);
    ap(m.torso.rotation, 'y', torsoY);
    ap(m.head.rotation, 'x', headX);
    ap(m.hips.position, 'y', hipsY);
    ap(m.legL.rotation, 'x', legL, 8);
    ap(m.legR.rotation, 'x', legR, 8);
    // Hjärtat glöder när det ligger öppet
    const open = this.state === 'stunned';
    const pulse = 0.6 + Math.sin(performance.now() / 120) * 0.4;
    this.heartMat.color.setRGB(open ? 1 : 0.35 + (this.state === 'dormant' ? -0.1 : 0.1), open ? 0.45 * pulse + 0.2 : 0.16, open ? 0.12 : 0.07);
    const f = this.flash > 0 ? 0.8 : 0;
    for (const mat of this.mats) mat.emissive.setRGB(f, f * 0.95, f);
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const k = this.waveT / 0.45;
      this.wave.scale.setScalar(1 + k * 7);
      this.wave.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) this.waveT = -1;
    }
    if (this.pushT >= 0 && this.state === 'recover') {
      this.pushT += dt;
      const k = this.pushT / 0.5;
      this.pushRing.position.set(this.pos.x, this.pos.y + 0.1, this.pos.z);
      this.pushRing.scale.setScalar(1 + k * 9);
      this.pushRing.material.opacity = Math.max(0, 0.8 * (1 - k));
    } else this.pushRing.material.opacity = 0;
  }
}

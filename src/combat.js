// Strid: lock-on, svärdsträffar och markören över fienden.
// Mål kan vara vanliga fiender eller bossar; de svarar med 'hit', 'killed', 'blocked' eller 'immune'.
import * as THREE from 'three';

const LOCK_RANGE = 16, KEEP_RANGE = 22, ASSIST_RANGE = 3.6;
const _ray = new THREE.Ray(), _v = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function marker(color, opacity) {
  const g = new THREE.ConeGeometry(0.2, 0.42, 4);
  g.rotateX(Math.PI);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthTest: false, depthWrite: false, fog: false,
  }));
  m.renderOrder = 20;
  m.visible = false;
  return m;
}

export class Combat {
  constructor({ scene, player, enemies, rig, fx, sfx, hud, world, camera }) {
    Object.assign(this, { scene, player, enemies, rig, fx, sfx, hud, world, camera });
    this.lock = null;
    this.extra = []; // fler mål att låsa på, till exempel titanen och bossarna
    this.hinted = new Set();
    this.lockMarker = marker(0xffd23f, 1);
    this.hintMarker = marker(0xffe68a, 0.45);
    this.hintMarker.scale.setScalar(0.7);
    scene.add(this.lockMarker, this.hintMarker);
    this.t = 0;
  }

  lineOfSight(e) {
    _ray.origin.set(this.player.feet.x, this.player.feet.y + 1.3, this.player.feet.z);
    _v.copy(e.chest).sub(_ray.origin);
    const len = _v.length();
    _ray.direction.copy(_v.normalize());
    const hit = this.world.rayIntersect(_ray, len);
    return !hit || hit.distance > len - 0.5;
  }

  // Närmaste fiende framför kameran som syns
  candidate() {
    const p = this.player.feet;
    const camFwd = Math.atan2(-Math.sin(this.rig.yaw), -Math.cos(this.rig.yaw));
    let best = null, bestScore = Infinity;
    for (const e of [...this.enemies.list, ...this.extra]) {
      if (!e.targetable) continue;
      const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d = Math.hypot(dx, dz);
      if (d > LOCK_RANGE + (e.radiusBig || 0) || Math.abs(e.pos.y - p.y) > 5) continue;
      const ang = Math.abs(wrap(Math.atan2(dx, dz) - camFwd));
      if (ang > 1.5 && d > 4) continue;
      const score = d + ang * 4;
      if (score < bestScore && this.lineOfSight(e)) { best = e; bestScore = score; }
    }
    return best;
  }

  setLock(e) {
    this.lock = e;
    this.sfx.play(e ? 'lock' : 'unlock');
  }

  unlock(silent = false) {
    if (!this.lock) return;
    this.lock = null;
    if (!silent) this.sfx.play('unlock');
  }

  update(dt, input) {
    this.t += dt;
    const p = this.player;
    if (this.lock) {
      const e = this.lock;
      const d = Math.hypot(e.pos.x - p.feet.x, e.pos.z - p.feet.z);
      if (!e.targetable || d > KEEP_RANGE || p.state === 'dead') this.unlock(!e.targetable);
    }
    if (input.lock && p.state !== 'dead' && !p.carried) {
      if (this.lock) this.unlock();
      else {
        const c = this.candidate();
        if (c) this.setLock(c);
        else this.rig.recenter(p);
      }
    }

    // Närmaste fiende inom räckhåll hjälper slagen att sikta
    let assist = null, ad = ASSIST_RANGE;
    const targets = [...this.enemies.list, ...this.extra];
    for (const e of targets) {
      if (!e.targetable) continue;
      const d = Math.hypot(e.pos.x - p.feet.x, e.pos.z - p.feet.z) - (e.hitRadius ? e.hitRadius - 0.55 : 0);
      const ang = Math.abs(wrap(Math.atan2(e.pos.x - p.feet.x, e.pos.z - p.feet.z) - p.facing));
      if (d < ad && ang < 1.8) { assist = e; ad = d; }
    }
    p.assistTarget = assist;
    p.lockTarget = this.lock;
    this.rig.lockTarget = this.lock;

    // Svärdsträffar
    const sw = p.swing;
    if (sw && sw.active) {
      for (const e of targets) {
        if (!e.targetable || sw.hit.has(e) || typeof e.hurt !== 'function') continue;
        const dx = e.pos.x - p.feet.x, dz = e.pos.z - p.feet.z;
        if (e.canSwordHit) {
          if (!e.canSwordHit(p, sw)) continue;
        } else {
          const d = Math.hypot(dx, dz) - (e.hitRadius ?? 0.55);
          // hitHeight: hur långt under/över fienden Cellos fötter får vara
          const rel = p.feet.y - e.pos.y;
          const [lo, hi] = e.hitHeight ?? [-1.7, 1.3];
          if (d > sw.reach || rel < lo || rel > hi) continue;
          const ang = Math.abs(wrap(Math.atan2(dx, dz) - p.facing));
          if (ang > sw.arc && d > 0.5) continue;
        }
        sw.hit.add(e);
        const res = e.hurt(sw.dmg, p.feet, { player: p, director: this.enemies, fx: this.fx, sfx: this.sfx });
        const at = e.chest.clone().lerp(p.swordTip, e.canSwordHit ? 0.75 : 0.4);
        if (res === 'blocked' || res === 'immune') {
          // Svärdet studsar mot en sköld eller sten: gnistor, klang och Cello knuffas bakåt
          this.fx.burst('spark', at, 14, 0xbfe4ff);
          this.sfx.play('clang');
          this.fx.hitStop(0.05);
          this.rig.shake(0.15);
          const len = Math.hypot(dx, dz) || 1;
          p.vel.x -= (dx / len) * 5;
          p.vel.z -= (dz / len) * 5;
          const hint = res === 'blocked' ? e.blockHint : e.immuneHint;
          if (hint && !this.hinted.has(hint)) {
            this.hinted.add(hint);
            this.hud.toast(hint, 4200);
          }
          continue;
        }
        if (!res) continue;
        const killed = res === 'killed' || res === true;
        this.fx.burst('spark', at, sw.dmg > 1 ? 16 : 10, 0xffe2a0);
        this.sfx.play('hit', { vol: sw.dmg > 1 ? 1.2 : 1 });
        if (e.radiusBig) this.sfx.play('ehurt', { vol: 0.8 });
        this.fx.hitStop(killed ? 0.12 : sw.dmg > 1 ? 0.09 : 0.06);
        this.rig.shake(killed ? 0.35 : sw.dmg > 1 ? 0.28 : 0.18);
      }
    }
    if (sw && (sw.active || p.stateT < ATTACK_TRAIL_END(sw))) this.fx.trail.push(p.swordBase, p.swordTip, sw.dmg > 1);

    // Markörer: gul pil över låst fiende, svag pil över den som går att låsa
    const lm = this.lockMarker, hm = this.hintMarker;
    lm.visible = !!this.lock;
    if (this.lock) {
      const c = this.lock.chest;
      lm.position.set(c.x, c.y + 1.35 + Math.sin(this.t * 6) * 0.08, c.z);
      lm.rotation.y = this.t * 3;
    }
    const cand = !this.lock && p.state !== 'dead' ? this.cachedCandidate(dt) : null;
    hm.visible = !!cand;
    if (cand) {
      const c = cand.chest;
      hm.position.set(c.x, c.y + 1.3 + Math.sin(this.t * 4) * 0.06, c.z);
      hm.rotation.y = this.t * 2;
    }
  }

  cachedCandidate(dt) {
    this.candT = (this.candT || 0) - dt;
    if (this.candT <= 0) {
      this.candT = 0.15;
      this.cand = this.candidate();
    }
    return this.cand && this.cand.targetable ? this.cand : null;
  }
}

// Svärdsspåret ritas under själva slaget och en kort stund efter
function ATTACK_TRAIL_END(sw) {
  return sw.kind === 'down' ? 0.3 : 0.2;
}

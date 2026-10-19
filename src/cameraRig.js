// Tredjepersonskamera: följer bakom Cello, går att vrida fritt,
// dras in när en vägg kommer i vägen och håller både Cello och fienden i bild vid lock-on.
// Berättelsen kan ta över kameran en stund (rig.cinematic = { pos, look, speed }).
import * as THREE from 'three';
import { RUN_SPEED } from './player.js';

const DEFAULT_PITCH = 0.32, DIST = 6.6, MIN_PITCH = -0.45, MAX_PITCH = 1.2, EYE = 1.45;
const _dir = new THREE.Vector3(), _side = new THREE.Vector3(), _end = new THREE.Vector3(), _look = new THREE.Vector3();
const _ray = new THREE.Ray();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => t * t * (3 - 2 * t);

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.cinematic = null;
    this.dist = DIST; // avståndet just nu (längre vid lock-on mot stora fiender)
    this.cineLook = new THREE.Vector3();
    this.wasCine = false;
    this.yaw = 0;
    this.pitch = DEFAULT_PITCH;
    this.cur = DIST;
    this.target = new THREE.Vector3();
    this.idle = 10;
    this.recentering = null;
    this.fallLock = false;
    this.lockTarget = null;
    this.lockBlend = 0;
    this.trauma = 0;
  }

  snap(player) {
    this.yaw = player.facing + Math.PI;
    this.pitch = DEFAULT_PITCH;
    this.target.copy(player.feet).y += EYE;
    this.cur = DIST;
    this.fallLock = false;
    this.recentering = null;
    this.lockBlend = 0;
    this.place(0, true);
  }

  recenter(player) {
    this.recentering = { from: this.yaw, to: player.facing + Math.PI, pFrom: this.pitch, t: 0 };
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt, input, player) {
    // Filmkamera: glider (eller klipper) till en bestämd plats och tittar på något
    if (this.cinematic) {
      const c = this.cinematic;
      if (!this.wasCine && c.glide) {
        // Börja där kameran står nu och glid mjukt till filmläget
        this.cineLook.copy(this.camera.position).add(this.camera.getWorldDirection(_end).multiplyScalar(8));
      } else if (!this.wasCine) c.cut = true;
      if (c.cut) {
        this.camera.position.copy(c.pos);
        this.cineLook.copy(c.look);
      } else {
        const k = 1 - Math.exp(-dt * (c.speed ?? 2.5));
        this.camera.position.lerp(c.pos, k);
        this.cineLook.lerp(c.look, k);
      }
      c.cut = false;
      this.wasCine = true;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
      if (this.trauma > 0) {
        const s = this.trauma * this.trauma * 0.32;
        this.camera.position.x += (Math.random() - 0.5) * s;
        this.camera.position.y += (Math.random() - 0.5) * s;
      }
      this.camera.lookAt(this.cineLook);
      return;
    }
    if (this.wasCine) {
      this.wasCine = false;
      this.target.copy(player.feet).y += EYE;
      this.cur = DIST;
    }
    const locked = !!this.lockTarget;
    // Stora fiender (bossar, titaner) behöver mer avstånd och lite högre kamera för att synas
    const big = locked ? this.lockTarget.radiusBig || 0 : 0;
    // På Grumbles rygg sitter Cello högre och rör sig fortare: kameran backar lite
    const riding = player.mount ? 1 : 0;
    const wantDist = DIST + Math.min(3, big * 0.5) - (this.indoor ? 0.6 : 0) + riding * 1.6;
    this.dist += (wantDist - this.dist) * (1 - Math.exp(-dt * 3));
    this.lockBlend += ((locked ? 1 : 0) - this.lockBlend) * (1 - Math.exp(-dt * 6));

    if (locked) {
      // Kameran bakom Cello, lite åt sidan, så att fienden syns bredvid honom
      const e = this.lockTarget.pos;
      const desired = Math.atan2(player.feet.x - e.x, player.feet.z - e.z) + 0.32;
      this.yaw += wrap(desired - this.yaw) * (1 - Math.exp(-dt * 7));
      this.pitch += (0.26 + Math.min(0.2, big * 0.035) - this.pitch) * (1 - Math.exp(-dt * 5));
      this.recentering = null;
      this.idle = 0;
    } else if (input.lookX || input.lookY) {
      this.yaw -= input.lookX;
      this.pitch += input.lookY;
      this.idle = 0;
      this.recentering = null;
    } else {
      this.idle += dt;
    }

    if (this.recentering) {
      const r = this.recentering;
      r.t = Math.min(1, r.t + dt / 0.22);
      const k = ease(r.t);
      this.yaw = r.from + wrap(r.to - r.from) * k;
      this.pitch = r.pFrom + (DEFAULT_PITCH - r.pFrom) * k;
      if (r.t >= 1) { this.recentering = null; this.idle = 0; }
    } else if (!locked && this.idle > 0.8 && player.grounded && player.state === 'move') {
      // Följer mjukt efter när Cello springer, men låter honom springa mot kameran
      const sp = player.speed;
      if (sp > 1.5) {
        const behind = Math.atan2(player.vel.x, player.vel.z) + Math.PI;
        const diff = wrap(behind - this.yaw);
        if (Math.abs(diff) < 2.2) this.yaw += diff * (1 - Math.exp(-dt * (player.mount ? 1.8 : 1.1) * Math.min(1, sp / RUN_SPEED)));
        if (this.idle > 2) this.pitch += (DEFAULT_PITCH - this.pitch) * (1 - Math.exp(-dt * 0.8));
      }
    }
    this.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, this.pitch));
    this.yaw = wrap(this.yaw);

    // Faller Cello ner i stormen stannar kameran och tittar efter honom
    const falling = !player.grounded && player.vel.y < -4 && player.feet.y < player.safe.y - 2.5;
    if (falling) this.fallLock = true;
    else if (player.grounded) this.fallLock = false;
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    if (this.fallLock) {
      this.camera.lookAt(player.feet.x, player.feet.y + 1, player.feet.z);
      return;
    }

    const k = 1 - Math.exp(-dt * 14);
    const ky = 1 - Math.exp(-dt * (player.grounded ? 9 : 5));
    this.target.x += (player.feet.x - this.target.x) * k;
    this.target.z += (player.feet.z - this.target.z) * k;
    this.target.y += (player.feet.y + EYE + (player.mount ? 0.55 : 0) - this.target.y) * ky;
    this.place(dt, false);
  }

  place(dt, instant) {
    const cp = Math.cos(this.pitch);
    _dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    _side.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Tre strålar (mitten och lite åt sidorna) så att kameran inte klipper igenom hörn
    const D = this.dist;
    let want = D;
    for (const off of [0, 0.45, -0.45]) {
      _end.copy(this.target).addScaledVector(_dir, D).addScaledVector(_side, off);
      _ray.origin.copy(this.target);
      _ray.direction.copy(_end).sub(this.target).normalize();
      const hit = this.world.rayIntersect(_ray, D + 0.5);
      if (hit && hit.distance < D + 0.4) want = Math.min(want, Math.max(0.7, hit.distance - 0.45));
    }
    if (instant || want < this.cur) this.cur = want;
    else this.cur += (want - this.cur) * (1 - Math.exp(-dt * 4));

    this.camera.position.copy(this.target).addScaledVector(_dir, this.cur);
    _look.set(this.target.x, this.target.y + 0.15, this.target.z);
    if (this.lockTarget && this.lockBlend > 0.01) _look.lerp(this.lockTarget.chest, (this.lockTarget.radiusBig > 3 ? 0.3 : 0.38) * this.lockBlend);
    // Skakning vid träffar
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma * 0.32;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.camera.position.z += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(_look);
  }
}

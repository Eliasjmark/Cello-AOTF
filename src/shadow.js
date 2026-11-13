// Loki's Mask (0.16): bedragarens mask kastar en skugga av Cello framåt. Skuggan flyger rakt fram (genom
// rimfrostgaller som stoppar Cello), landar och står kvar. Tryck igen: Cello byter plats med den.
// Skuggan är lika tung som Cello: den håller ner tryckplattor. Och den lurar den som tittar (frostjätten Thrym).
import * as THREE from 'three';

const SPEED = 18;
const _ray = new THREE.Ray(), _down = new THREE.Vector3(0, -1, 0), _v = new THREE.Vector3();

function buildShadow() {
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x1c0f2c, transparent: true, opacity: 0.78, depthWrite: false });
  const edge = new THREE.MeshBasicMaterial({ color: 0x5a3a8a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const gold = new THREE.MeshLambertMaterial({ color: 0xc9a24f, emissive: 0x3a2a08, flatShading: true });
  const green = new THREE.MeshLambertMaterial({ color: 0x2f7a4a, emissive: 0x0a2a14, flatShading: true });
  const eye = new THREE.MeshBasicMaterial({ color: 0x9dff9a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.0, 10), dark);
  body.position.y = 0.95;
  g.add(body);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 10, 1, true), dark);
  cape.position.y = 0.75;
  g.add(cape);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.7, 6), dark);
    leg.position.set(0.12 * s, 0.35, 0);
    g.add(leg);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.75, 6), dark);
    arm.position.set(0.36 * s, 1.0, 0);
    arm.rotation.z = 0.15 * s;
    g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), dark);
  head.position.y = 1.62;
  g.add(head);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), edge);
  glow.scale.set(1, 1.7, 1);
  glow.position.y = 0.95;
  g.add(glow);
  // Masken: ett guldansikte med gröna kanter och två böjda horn
  const mask = new THREE.Group();
  mask.position.set(0, 1.63, 0.17);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.6), gold);
  face.rotation.x = Math.PI / 2;
  face.scale.set(1, 1, 0.5);
  mask.add(face);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), eye);
    e.position.set(0.07 * s, 0.03, 0.09);
    mask.add(e);
    const horn = new THREE.Group();
    horn.position.set(0.15 * s, 0.14, -0.05);
    horn.rotation.z = -0.5 * s;
    for (let k = 0; k < 3; k++) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.06 - k * 0.015, 0.22, 5), green);
      h.position.set(0.05 * s * k, 0.15 * k + 0.08, -0.04 * k);
      h.rotation.z = -0.45 * s * k;
      horn.add(h);
    }
    mask.add(horn);
  }
  g.add(mask);
  g.visible = false;
  return { g, mats: [dark, edge], glow };
}

export class ShadowDouble {
  constructor({ scene, player, collider, fx, sfx, hud }) {
    Object.assign(this, { scene, player, collider, fx, sfx, hud });
    this.model = buildShadow();
    scene.add(this.model.g);
    this.state = 'gone'; // 'flying' | 'standing' | 'falling' | 'gone'
    this.pos = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.left = 0;
    this.t = 0;
    this.area = null;
    this.onSwap = null;
    this.onLand = null;
  }

  get active() { return this.state === 'standing'; }
  get feet() { return this.pos; }

  // Tryck på maskens knapp: kasta en skugga, eller byt plats med den som står
  use(areaId) {
    if (this.state === 'standing') return this.swap();
    if (this.state !== 'gone') return false;
    return this.cast(areaId);
  }

  cast(areaId) {
    const P = this.player;
    const range = P.maskRange ?? 9;
    this.dir.set(Math.sin(P.facing), 0, Math.cos(P.facing));
    this.pos.copy(P.feet).addScaledVector(this.dir, 0.4);
    // Hur långt kan den flyga? (rimfrostgaller släpper igenom den)
    _ray.origin.copy(P.feet).setY(P.feet.y + 1.0);
    _ray.direction.copy(this.dir);
    const hit = this.collider.rayIntersect(_ray, range, false, true);
    this.left = hit ? Math.max(0, hit.distance - 0.95) : range - 0.4;
    this.state = 'flying';
    this.t = 0;
    this.area = areaId;
    this.model.g.visible = true;
    this.model.g.rotation.y = P.facing;
    this.sfx.play('shadowcast');
    this.fx.burst('spark', this.pos.clone().setY(this.pos.y + 1), 16, 0x8a5aff);
    return true;
  }

  swap() {
    const P = this.player;
    // Får Cello plats där skuggan står?
    const at = this.pos.clone();
    const old = P.feet.clone();
    if (!P.fitsAt?.(at)) {
      this.hud.toast('There is no room for Cello where the shadow stands.', 2200);
      this.sfx.play('denied');
      return false;
    }
    this.fx.burst('spark', old.clone().setY(old.y + 1), 24, 0x8a5aff);
    P.teleport(at);
    P.vel.set(0, 0, 0);
    P.glide = null;
    this.fx.burst('spark', at.clone().setY(at.y + 1), 24, 0x9dff9a);
    this.sfx.play('shadowswap');
    this.clear();
    this.onSwap?.(old, at);
    return true;
  }

  clear() {
    this.state = 'gone';
    this.model.g.visible = false;
  }

  update(dt, areaId) {
    const m = this.model;
    if (this.state === 'gone') return;
    if (this.area !== areaId) { this.clear(); return; }
    this.t += dt;
    if (this.state === 'flying') {
      const step = Math.min(this.left, SPEED * dt);
      this.pos.addScaledVector(this.dir, step);
      this.left -= step;
      if (Math.random() < 0.7) this.fx.burst('spark', this.pos.clone().setY(this.pos.y + 1), 1, 0x6a4aaa);
      if (this.left <= 0.001) {
        // Landar den på något?
        _ray.origin.copy(this.pos).setY(this.pos.y + 1.0);
        _ray.direction.copy(_down);
        const hit = this.collider.rayIntersect(_ray, 9);
        if (hit && hit.distance > 0.2) {
          this.pos.y = this.pos.y + 1.0 - hit.distance;
          this.state = 'standing';
          this.t = 0;
          this.sfx.play('shadowland', { vol: 0.7 });
          this.onLand?.(this);
        } else {
          this.state = 'falling';
          this.t = 0;
        }
      }
    } else if (this.state === 'falling') {
      this.pos.y -= dt * (4 + this.t * 20);
      if (this.t > 0.8) {
        this.fx.burst('spark', this.pos.clone().setY(this.pos.y + 1), 12, 0x8a5aff);
        this.hud.toast('The shadow falls into nothing, and fades.', 2000);
        this.clear();
        return;
      }
    } else if (this.state === 'standing') {
      // Långt bort: skuggan bleknar
      if (this.player.feet.distanceTo(this.pos) > 70) { this.clear(); return; }
    }
    m.g.position.copy(this.pos);
    m.g.position.y += this.state === 'standing' ? Math.sin(this.t * 2.2) * 0.04 : 0.2;
    const k = this.state === 'standing' ? 0.7 + Math.sin(this.t * 3) * 0.08 : 0.55;
    m.mats[0].opacity = 0.78 * Math.min(1, this.t * 6 + 0.3);
    m.mats[1].opacity = 0.25 + 0.15 * Math.sin(this.t * 4);
    m.glow.scale.set(k * 1.4, 1.7 * k * 1.4, k * 1.4);
  }
}

// Får en kapsel som Cellos plats vid fötterna at? (används av bytet)
export function capsuleFits(player, at) {
  const c = player.collider.clone();
  const d = _v.copy(at).sub(player.feet);
  c.translate(d);
  c.translate(new THREE.Vector3(0, 0.05, 0));
  const r = player.world.capsuleIntersect(c);
  return !r || r.depth < 0.08;
}

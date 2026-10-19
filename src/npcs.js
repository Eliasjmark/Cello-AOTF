// Invånarna i Aetheria (och Maren i byn): låg-polyfigurer med egna kläder och ansikten,
// enkla rörelser och huvuden som vänder sig mot Cello.
import * as THREE from 'three';
import { mergeRigid } from './geom.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// Samma låg-polystil som Cello: formade lemmar med knän och armbågar, ansikten och kläder
export function buildPerson(o) {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = {
    skin: mat(o.skin ?? 0xc49f83), hair: mat(o.hair ?? 0x2a221d), top: mat(o.top ?? 0x5a5040),
    bottom: mat(o.bottom ?? 0x3a332d), boots: mat(o.boots ?? 0x231e1a), eye: mat(0x14110f), white: mat(0xe2dccd),
    extra: mat(o.extraColor ?? 0x6b4a2a), metal: mat(0x7a7880), wood: mat(0x5b3f2a), lip: mat(0x8a5a4a),
  };
  const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const T = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 6, sz = 1) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    if (sz !== 1) g.scale(1, 1, sz);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const W = o.width ?? 1;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.86;
  body.add(hips);
  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(T(0.27 * W, 0.23 * W, 0.6, M.top, 0, 0.31, 0, 6, 0.64));
  torso.add(T(0.24 * W, 0.24 * W, 0.08, M.extra, 0, 0.04, 0, 6, 0.7));
  // Kjortel eller lång dräkt nedanför bältet
  if (o.robe) hips.add(T(0.25 * W, 0.36 * W, 0.84, M.top, 0, -0.42, 0, 8, 0.75));
  else hips.add(T(0.25 * W, 0.3 * W, 0.24, M.top, 0, -0.1, 0, 8, 0.72));
  if (o.apron) torso.add(B(0.4 * W, 0.86, 0.03, M.extra, 0, 0.0, 0.17 * W));
  if (o.shawl) {
    const sh = mat(o.shawl);
    torso.add(T(0.2 * W, 0.33 * W, 0.24, sh, 0, 0.56, 0, 8, 0.72));
  }
  const head = new THREE.Group();
  head.position.y = 0.66;
  head.add(T(0.07, 0.08, 0.12, M.skin, 0, 0.03, 0));
  const skullGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36, 2, 2, 2);
  {
    const p = skullGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < -0.1) { p.setX(i, x * 0.76); p.setZ(i, z * (z > 0 ? 0.9 : 0.8)); }
    }
    skullGeo.computeVertexNormals();
  }
  const skull = new THREE.Mesh(skullGeo, M.skin);
  skull.position.y = 0.23;
  head.add(skull);
  for (const sx of [-1, 1]) {
    head.add(B(0.08, 0.065, 0.02, M.white, 0.085 * sx, 0.235, 0.178));
    head.add(B(0.04, 0.052, 0.02, M.eye, 0.08 * sx, 0.232, 0.185));
    const brow = B(0.1, 0.025, 0.03, mat(o.beard ?? o.hair ?? 0x2a221d), 0.085 * sx, 0.29, 0.18);
    brow.rotation.z = -0.1 * sx;
    head.add(brow);
    head.add(B(0.04, 0.09, 0.07, M.skin, 0.185 * sx, 0.22, 0));
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), M.skin);
  nose.rotation.x = Math.PI / 2 + 0.3;
  nose.position.set(0, 0.18, 0.2);
  head.add(nose);
  head.add(B(0.08, 0.016, 0.02, M.lip, 0, 0.115, 0.172));
  const hs = o.hairStyle ?? 'short';
  if (hs !== 'bald' && hs !== 'hood') head.add(B(0.4, 0.12, 0.4, M.hair, 0, 0.43, -0.01));
  if (hs === 'short' || hs === 'long' || hs === 'bun') {
    head.add(B(0.4, 0.28, 0.1, M.hair, 0, 0.3, -0.16));
    head.add(B(0.05, 0.2, 0.3, M.hair, -0.19, 0.34, -0.04));
    head.add(B(0.05, 0.2, 0.3, M.hair, 0.19, 0.34, -0.04));
    head.add(B(0.34, 0.07, 0.06, M.hair, 0, 0.37, 0.17));
  }
  if (hs === 'long') head.add(T(0.2, 0.24, 0.5, M.hair, 0, 0.08, -0.12, 6, 0.6));
  if (hs === 'bun') head.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), M.hair), 0, 0.42, -0.24));
  if (hs === 'hood') {
    const hm = mat(o.hood ?? 0x3a4256);
    head.add(B(0.46, 0.14, 0.44, hm, 0, 0.45, -0.01));
    head.add(B(0.46, 0.5, 0.12, hm, 0, 0.23, -0.2));
    head.add(B(0.05, 0.44, 0.4, hm, -0.22, 0.23, -0.02));
    head.add(B(0.05, 0.44, 0.4, hm, 0.22, 0.23, -0.02));
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), hm);
    peak.position.set(0, 0.48, -0.2);
    peak.rotation.x = -0.9;
    head.add(peak);
  }
  if (o.beard) {
    const bm = mat(o.beard);
    head.add(T(0.15, 0.1, 0.22, bm, 0, 0.07, 0.13, 6, 0.6));
    head.add(B(0.14, 0.04, 0.04, bm, 0, 0.135, 0.18));
  }
  if (o.helmet) {
    head.add(T(0.2, 0.23, 0.18, M.metal, 0, 0.43, 0, 8));
    head.add(B(0.05, 0.12, 0.34, M.metal, 0, 0.56, 0));
    head.add(B(0.04, 0.12, 0.04, M.metal, 0, 0.2, 0.2));
  }
  torso.add(head);
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(0.31 * W * side, 0.55, 0);
    g.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 * W, 0), M.top), 0, -0.02, 0));
    g.add(T(0.075 * W, 0.065 * W, 0.3, M.top, 0, -0.16, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    g.add(elbow);
    elbow.add(T(0.062 * W, 0.054 * W, 0.24, o.robe ? M.top : M.skin, 0, -0.11, 0));
    elbow.add(B(0.1, 0.11, 0.1, M.skin, 0, -0.27, 0.005));
    torso.add(g);
    g.userData.elbow = elbow;
    return g;
  };
  const leg = (side) => {
    const g = new THREE.Group();
    g.position.set(0.12 * W * side, 0, 0);
    g.add(T(0.1 * W, 0.082 * W, 0.44, M.bottom, 0, -0.2, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    g.add(knee);
    knee.add(T(0.078 * W, 0.068 * W, 0.22, M.bottom, 0, -0.1, 0));
    knee.add(T(0.095, 0.09, 0.24, M.boots, 0, -0.29, 0));
    knee.add(B(0.15, 0.1, 0.26, M.boots, 0, -0.4, 0.05));
    hips.add(g);
    g.userData.knee = knee;
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  let item = null;
  if (o.item === 'hammer') {
    item = new THREE.Group();
    item.position.y = -0.27;
    item.add(B(0.05, 0.5, 0.05, M.wood, 0, -0.2, 0));
    item.add(B(0.14, 0.12, 0.26, M.metal, 0, -0.45, 0));
    armR.userData.elbow.add(item);
  } else if (o.item === 'spear') {
    item = new THREE.Group();
    item.position.y = -0.27;
    item.add(B(0.05, 2.2, 0.05, M.wood, 0, 0.3, 0));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), M.metal);
    tip.position.y = 1.55;
    item.add(tip);
    armR.userData.elbow.add(item);
  } else if (o.item === 'scroll') {
    item = new THREE.Group();
    item.position.set(0, -0.3, 0.05);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 6), mat(0xd8cfb8));
    roll.rotation.x = Math.PI / 2;
    item.add(roll);
    armL.userData.elbow.add(item);
  }
  const legL = leg(-1), legR = leg(1);
  root.scale.setScalar(o.scale ?? 0.9);
  return {
    root, body, hips, torso, head, armL, armR, legL, legR, item, M,
    elbowL: armL.userData.elbow, elbowR: armR.userData.elbow, kneeL: legL.userData.knee, kneeR: legR.userData.knee,
  };
}

const place = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

export class Npc {
  constructor(scene, def) {
    this.id = def.id;
    this.name = def.name;
    this.voice = def.voice;
    this.pose = def.pose ?? 'stand';
    this.model = buildPerson(def.look ?? {});
    mergeRigid(this.model.root);
    scene.add(this.model.root);
    this.pos = def.pos.clone();
    this.home = def.pos.clone();
    this.facing = def.face ?? 0;
    this.homeFacing = this.facing;
    this.wander = def.wander ?? null;
    this.wanderA = 0;
    this.t = Math.random() * 10;
    this.radius = 0.4;
    this.talking = false;
    this.walkTarget = null;
    this.onArrive = null;
    this.speed = 0;
    this.chestPos = new THREE.Vector3();
    this.onHammer = null;
    this.visible = true;
    this.solid = def.solid ?? true;
  }

  get chest() {
    const h = this.pose === 'lie' ? 0.6 : this.pose === 'sit' || this.pose === 'kneel' ? 0.8 : 1.25 * (this.model.root.scale.y / 0.9);
    return this.chestPos.set(this.pos.x, this.pos.y + h, this.pos.z);
  }

  setVisible(v) {
    this.visible = v;
    this.model.root.visible = v;
  }

  place(pos, face, pose) {
    this.pos.copy(pos);
    this.home.copy(pos);
    if (face !== undefined) { this.facing = face; this.homeFacing = face; }
    if (pose) this.pose = pose;
    this.walkTarget = null;
  }

  walkTo(target, speed = 3.2, onArrive = null) {
    this.walkTarget = target.clone();
    this.walkSpeed = speed;
    this.onArrive = onArrive;
    if (this.pose === 'sit' || this.pose === 'kneel') this.pose = 'stand';
  }

  update(dt, player, groundAt) {
    if (!this.visible) return;
    this.t += dt;
    const m = this.model;
    const dx = player.feet.x - this.pos.x, dz = player.feet.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;

    if (this.walkTarget) {
      const tx = this.walkTarget.x - this.pos.x, tz = this.walkTarget.z - this.pos.z, d = Math.hypot(tx, tz);
      if (d < 0.25) {
        this.walkTarget = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      } else {
        const step = Math.min(d, this.walkSpeed * dt);
        this.pos.x += (tx / d) * step;
        this.pos.z += (tz / d) * step;
        this.facing += wrap(Math.atan2(tx, tz) - this.facing) * (1 - Math.exp(-dt * 10));
        moving = true;
      }
    } else if (this.wander && !this.talking && dist > 2.6) {
      this.wanderA += dt * 0.45;
      const w = this.wander;
      const tx = w.center.x + Math.cos(this.wanderA) * w.radius, tz = w.center.z + Math.sin(this.wanderA) * w.radius;
      const ddx = tx - this.pos.x, ddz = tz - this.pos.z, d = Math.hypot(ddx, ddz);
      if (d > 0.05) {
        const step = Math.min(d, 2.6 * dt);
        this.pos.x += (ddx / d) * step;
        this.pos.z += (ddz / d) * step;
        this.facing += wrap(Math.atan2(ddx, ddz) - this.facing) * (1 - Math.exp(-dt * 8));
        moving = true;
      }
    } else if (this.talking && (this.pose === 'stand' || this.pose === 'read' || this.pose === 'hammer')) {
      this.facing += wrap(Math.atan2(dx, dz) - this.facing) * (1 - Math.exp(-dt * 8));
    } else if (!this.wander) {
      this.facing += wrap(this.homeFacing - this.facing) * (1 - Math.exp(-dt * 3));
    }
    if (moving && groundAt) {
      const gy = groundAt(this.pos.x, this.pos.y, this.pos.z);
      if (gy !== null) this.pos.y = approach(this.pos.y, gy, 12, dt);
    }
    this.speed = approach(this.speed, moving ? 1 : 0, 10, dt);

    // Pose
    const sw = Math.sin(this.t * 9) * 0.8 * this.speed;
    let legL = -sw, legR = sw, armL = sw * 0.8, armR = -sw * 0.8, hipsY = 0.86 + Math.abs(Math.sin(this.t * 9)) * 0.05 * this.speed;
    let torsoX = 0, headX = 0, bodyX = 0, armLz = -0.08, armRz = 0.08;
    const cp = Math.cos(this.t * 9) * this.speed;
    let kneeL = 0.05 + Math.max(0, cp) * 0.9 + this.speed * 0.1, kneeR = 0.05 + Math.max(0, -cp) * 0.9 + this.speed * 0.1;
    let elbowL = -0.18 - this.speed * 0.4, elbowR = -0.18 - this.speed * 0.4;
    const pose = moving ? 'stand' : this.pose;
    if (pose === 'sit') { legL = legR = -1.45; kneeL = kneeR = 1.4; hipsY = 0.5; armL = armR = -0.35; elbowL = elbowR = -0.6; torsoX = 0.1; }
    else if (pose === 'kneel') { legL = legR = 0.1; kneeL = kneeR = 1.6; hipsY = 0.52; torsoX = 0.45; headX = 0.35; armL = armR = -0.4; elbowL = elbowR = -0.5; }
    else if (pose === 'lie') { bodyX = -Math.PI / 2; armLz = -0.25; armRz = 0.25; kneeL = 0.1; kneeR = 0.25; }
    else if (pose === 'read') { armL = -0.5; armR = -0.4; elbowL = elbowR = -1.0; headX = 0.35; torsoX = 0.08; }
    else if (pose === 'hurt') { bodyX = -1.35; legL = -0.3; legR = 0.2; kneeL = 0.6; kneeR = 0.2; armL = -0.3; armRz = 0.9; }
    else if (pose === 'hammer') {
      const c = (this.t % 1.6) / 1.6;
      armR = c < 0.6 ? -0.9 - 1.6 * (c / 0.6) : -2.5 + 1.8 * Math.min(1, (c - 0.6) / 0.08);
      torsoX = 0.2;
      armL = -0.6;
      if (this.lastC !== undefined && this.lastC < 0.68 && c >= 0.68 && !this.talking) this.onHammer?.(this);
      this.lastC = c;
      if (this.talking) armR = -0.6;
    }
    if (pose === 'stand' && !moving) {
      const b = Math.sin(this.t * 2) * 0.012;
      hipsY += b;
    }
    const r = 10;
    m.legL.rotation.x = approach(m.legL.rotation.x, legL, r, dt);
    m.legR.rotation.x = approach(m.legR.rotation.x, legR, r, dt);
    m.armL.rotation.x = approach(m.armL.rotation.x, armL, pose === 'hammer' ? 30 : r, dt);
    m.armR.rotation.x = pose === 'hammer' ? armR : approach(m.armR.rotation.x, armR, r, dt);
    m.armL.rotation.z = approach(m.armL.rotation.z, armLz, r, dt);
    m.armR.rotation.z = approach(m.armR.rotation.z, armRz, r, dt);
    m.hips.position.y = approach(m.hips.position.y, hipsY, r, dt);
    m.torso.rotation.x = approach(m.torso.rotation.x, torsoX, r, dt);
    m.body.rotation.x = approach(m.body.rotation.x, bodyX, 8, dt);
    if (pose === 'hammer') elbowR = -0.25;
    m.kneeL.rotation.x = approach(m.kneeL.rotation.x, kneeL, r, dt);
    m.kneeR.rotation.x = approach(m.kneeR.rotation.x, kneeR, r, dt);
    m.elbowL.rotation.x = approach(m.elbowL.rotation.x, elbowL, r, dt);
    m.elbowR.rotation.x = approach(m.elbowR.rotation.x, elbowR, r, dt);

    // Huvudet följer Cello när han är nära
    let look = 0, lookX = headX;
    if (dist < 5 && pose !== 'lie') {
      look = Math.max(-1, Math.min(1, wrap(Math.atan2(dx, dz) - this.facing)));
      if (this.talking) lookX = headX * 0.3;
    }
    m.head.rotation.y = approach(m.head.rotation.y, look, 6, dt);
    m.head.rotation.x = approach(m.head.rotation.x, lookX, 6, dt);

    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
  }
}

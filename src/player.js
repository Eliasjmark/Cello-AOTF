// Cello: rörelse, hopp, svärd, sköld, undanmanöver, skada, Mjölnirs skärva och en klossfigur.
import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { buildHammer, ITEM_MATS } from './items.js';
import { mergeRigid } from './geom.js';

const R = 0.35, HEIGHT = 1.7;
export const RUN_SPEED = 6.6;
const WALK_SPEED = 2.4, LOCK_SPEED = 4.6, SHIELD_SPEED = 1.9;
const ACCEL = 48, DECEL = 40, AIR_ACCEL = 10;
const GRAVITY = 30, MAX_FALL = 42;
const JUMP_V = 7.6, AUTO_JUMP_V = 7.4, JUMP_MIN_SPEED = 4.2;
const COYOTE = 0.1, JUMP_BUFFER = 0.12;
const FLOOR_NY = 0.55, SNAP = 0.45, STEP = 1 / 150;
export const MAX_HP = 6; // tre hjärtan, varje träff tar ett halvt
// Mjölnirs skärva: tung vikt och markslaget
const HEAVY_SPEED = 2.3, HEAVY_SPEED_GLOVES = 3.3;
const SLAM_WIND = 0.42, SLAM_WIND_GLOVES = 0.3, SLAM_RECOVER = 0.38, SLAM_REACH = 1.25;

// Tre slag i kombination: från höger, från vänster, och ett tungt slag uppifrån
export const ATTACKS = [
  { dur: 0.34, a0: 0.06, a1: 0.16, dmg: 1, reach: 2.2, arc: 1.45, lunge: 2.8, kind: 'r2l' },
  { dur: 0.34, a0: 0.06, a1: 0.16, dmg: 1, reach: 2.2, arc: 1.45, lunge: 2.8, kind: 'l2r' },
  { dur: 0.54, a0: 0.13, a1: 0.25, dmg: 2, reach: 2.5, arc: 0.75, lunge: 4.4, kind: 'down' },
];

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3();
const _ray = new THREE.Ray(), _down = new THREE.Vector3(0, -1, 0), _up = new THREE.Vector3(0, 1, 0);
const _cap = new Capsule();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Cello i låg-polystil (som en retrofigur): formade lemmar med knän och armbågar, ansikte som blinkar,
// hår, tunika med kjolfåll och en röd halsduk som fladdrar bakom honom.
function buildModel() {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = {
    tunic: mat(0x4a5465), tunicDark: mat(0x3b4352), skin: mat(0xc49f83), hair: mat(0x2a221d), pants: mat(0x3a332d),
    boots: mat(0x231e1a), scarf: mat(0x8c2a27), belt: mat(0x5a4632), eye: mat(0x14110f), white: mat(0xe8e2d4),
    steel: mat(0xc9ced6), grip: mat(0x3b2a1e), wood: mat(0x5b3f2a), iron: mat(0x55535a), gold: mat(0xb08a3c),
    leather: mat(0x6a4a30), lip: mat(0x8a5a4a),
  };
  const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  // Avsmalnande "cylinder" med få sidor: ger kantiga, formade lemmar
  const T = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 6, sz = 1) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    if (sz !== 1) g.scale(1, 1, sz);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.86;
  body.add(hips);

  // Ben: lår, knä, smalben och stövel
  const leg = (side) => {
    const g = new THREE.Group();
    g.position.set(0.12 * side, 0, 0);
    g.add(T(0.105, 0.085, 0.44, M.pants, 0, -0.2, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    g.add(knee);
    knee.add(T(0.08, 0.07, 0.22, M.pants, 0, -0.1, 0));
    knee.add(T(0.1, 0.092, 0.26, M.boots, 0, -0.28, 0.0));
    knee.add(T(0.108, 0.108, 0.05, M.leather, 0, -0.16, 0, 6));
    const foot = B(0.16, 0.1, 0.27, M.boots, 0, -0.4, 0.05);
    knee.add(foot);
    knee.add(B(0.13, 0.06, 0.08, M.boots, 0, -0.42, 0.2));
    hips.add(g);
    return { g, knee };
  };

  // Tunikans fåll sitter på höfterna och vajar med benen
  const skirt = T(0.25, 0.32, 0.27, M.tunic, 0, -0.06, 0, 8, 0.72);
  skirt.geometry.translate(0, -0.06, 0);
  skirt.position.y = 0;
  hips.add(skirt);
  hips.add(T(0.322, 0.322, 0.03, M.tunicDark, 0, -0.205, 0, 8, 0.72));

  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(T(0.27, 0.22, 0.6, M.tunic, 0, 0.31, 0, 6, 0.62));
  torso.add(T(0.235, 0.235, 0.08, M.belt, 0, 0.04, 0, 6, 0.68));
  torso.add(B(0.09, 0.07, 0.04, M.gold, 0, 0.04, 0.16));
  // Rem över bröstet (till hammaren på ryggen)
  const strap = B(0.06, 0.66, 0.36, M.leather, 0, 0.32, 0);
  strap.rotation.z = 0.62;
  strap.scale.z = 1.0;
  torso.add(strap);
  // Halsduken runt halsen
  torso.add(T(0.17, 0.21, 0.13, M.scarf, 0, 0.62, -0.01, 7, 0.85));
  // Halsdukens flik: tre leder som släpar efter när han springer
  const tail = new THREE.Group();
  tail.position.set(0.08, 0.6, -0.15);
  torso.add(tail);
  const scarf = [];
  let parent = tail;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0 : -0.17;
    seg.add(B(0.13 - i * 0.015, 0.18, 0.035, M.scarf, 0, -0.085, 0));
    parent.add(seg);
    scarf.push(seg);
    parent = seg;
  }

  // Huvudet: käke som smalnar av, ögon som blinkar, ögonbryn, näsa, öron och tofsigt hår
  const head = new THREE.Group();
  head.position.y = 0.66;
  head.add(T(0.07, 0.08, 0.12, M.skin, 0, 0.03, 0));
  const skullGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36, 2, 2, 2);
  {
    const p = skullGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < -0.1) { p.setX(i, x * 0.74); p.setZ(i, z * (z > 0 ? 0.9 : 0.8)); }
      if (y > 0.1) { p.setX(i, x * 0.96); }
      if (Math.abs(y) < 0.01 && z > 0.1) p.setZ(i, z * 1.03);
    }
    skullGeo.computeVertexNormals();
  }
  head.add(place(new THREE.Mesh(skullGeo, M.skin), 0, 0.23, 0));
  const eyes = [], lids = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.085 * sx, 0.235, 0.178);
    eye.add(B(0.085, 0.07, 0.02, M.white));
    const pupil = B(0.042, 0.056, 0.02, M.eye, 0.008 * -sx, -0.004, 0.006);
    eye.add(pupil);
    head.add(eye);
    eyes.push(pupil);
    lids.push(eye);
    const brow = B(0.1, 0.025, 0.03, M.hair, 0.085 * sx, 0.295, 0.18);
    brow.rotation.z = -0.12 * sx;
    head.add(brow);
    head.add(B(0.04, 0.09, 0.07, M.skin, 0.185 * sx, 0.22, 0.0));
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), M.skin);
  nose.rotation.x = Math.PI / 2 + 0.3;
  nose.position.set(0, 0.18, 0.2);
  head.add(nose);
  head.add(B(0.08, 0.016, 0.02, M.lip, 0, 0.115, 0.172));
  // Hår: kalott, nacke och spretiga lock i pannan
  head.add(B(0.4, 0.13, 0.4, M.hair, 0, 0.43, -0.01));
  head.add(B(0.4, 0.3, 0.1, M.hair, 0, 0.3, -0.16));
  head.add(B(0.06, 0.22, 0.3, M.hair, -0.19, 0.33, -0.04));
  head.add(B(0.06, 0.22, 0.3, M.hair, 0.19, 0.33, -0.04));
  for (const [x, rz, rx, h] of [[-0.12, 0.35, 0.5, 0.18], [-0.03, 0.1, 0.55, 0.2], [0.07, -0.2, 0.5, 0.17], [0.15, -0.45, 0.45, 0.14]]) {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(0.055, h, 4), M.hair);
    lock.position.set(x, 0.37, 0.17);
    lock.rotation.set(Math.PI - rx, 0, rz);
    head.add(lock);
  }
  for (const [x, z, rz, rx] of [[-0.1, -0.12, 0.5, -0.4], [0.06, -0.15, -0.3, -0.6], [0.0, 0.0, 0.1, -0.2]]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), M.hair);
    tuft.position.set(x, 0.52, z);
    tuft.rotation.set(rx, 0, rz);
    head.add(tuft);
  }
  torso.add(head);

  // Armar: axel, överarm, armbåge, underarm med armskydd och hand
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(0.31 * side, 0.55, 0);
    g.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.095, 0), M.tunic), 0, -0.02, 0));
    g.add(T(0.075, 0.065, 0.3, M.tunic, 0, -0.16, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    g.add(elbow);
    elbow.add(T(0.06, 0.052, 0.24, M.skin, 0, -0.11, 0));
    elbow.add(T(0.07, 0.066, 0.13, M.leather, 0, -0.15, 0));
    elbow.add(B(0.1, 0.11, 0.1, M.skin, 0, -0.28, 0.005));
    torso.add(g);
    return { g, elbow };
  };
  const L = arm(-1), R = arm(1);
  const armL = L.g, armR = R.g, elbowL = L.elbow, elbowR = R.elbow;
  // Svärdet sitter i höger hand; bladet fortsätter längs underarmen
  const sword = new THREE.Group();
  sword.position.y = -0.28;
  sword.add(B(0.05, 0.22, 0.05, M.grip, 0, 0.02, 0));
  sword.add(B(0.08, 0.06, 0.08, M.gold, 0, 0.14, 0));
  sword.add(B(0.09, 0.06, 0.32, M.iron, 0, -0.11, 0));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.82, 0.1), M.steel);
  blade.position.y = -0.55;
  sword.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 4), M.steel);
  tip.rotation.set(Math.PI, Math.PI / 4, 0);
  tip.scale.set(0.5, 1, 1.2);
  tip.position.y = -1.02;
  sword.add(tip);
  elbowR.add(sword);
  // Skölden bärs på sidan och lyfts framför bröstet vid block: rund, med järnkant och ett rött märke
  const shield = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 10), M.wood);
  disc.rotation.z = Math.PI / 2;
  shield.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 4, 10), M.iron);
  rim.rotation.y = Math.PI / 2;
  shield.add(rim);
  shield.add(B(0.07, 0.12, 0.12, M.iron, -0.04, 0, 0));
  shield.add(B(0.065, 0.42, 0.06, M.scarf, -0.005, 0, 0));
  shield.add(B(0.065, 0.06, 0.42, M.scarf, -0.005, 0, 0));
  torso.add(shield);
  // Mjölnirs skärva: på ryggen, eller i handen vid tung vikt och markslag
  const glow = ITEM_MATS.glow.clone();
  const own = (g) => { g.traverse((o) => { if (o.material === ITEM_MATS.glow) o.material = glow; }); return g; };
  const hammerHand = own(buildHammer());
  hammerHand.position.y = -0.28;
  hammerHand.scale.setScalar(1.25);
  hammerHand.visible = false;
  elbowR.add(hammerHand);
  const hammerBack = own(buildHammer());
  // Skaftet sticker upp över höger axel, huvudet hänger vid vänster höft
  hammerBack.position.set(-0.16, 0.66, -0.21);
  hammerBack.rotation.set(0.12, 0, 0.62);
  hammerBack.visible = false;
  torso.add(hammerBack);

  const lL = leg(-1), lR = leg(1);
  const parts = {
    body, hips, torso, head, tail, scarf, armL, armR, elbowL, elbowR, legL: lL.g, legR: lR.g, kneeL: lL.knee, kneeR: lR.knee,
    skirt, sword, shield, eyes, lids, M, hammerHand, hammerBack, hammerGlow: glow,
  };
  root.scale.setScalar(0.9);
  return { root, ...parts };
}

const place = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

function makeShadow() {
  const g = new THREE.CircleGeometry(0.42, 14);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  m.renderOrder = 2;
  return m;
}

export class Player {
  // world: kollisionsvärlden (WorldCollider: Octree plus rörliga lådor)
  constructor(scene, world, spawn, facing) {
    this.scene = scene;
    this.world = world;
    this.carried = null;
    this.finisherBonus = 0;
    this.emberEye = new THREE.MeshBasicMaterial({ color: 0xff6a20 });
    this.collider = new Capsule(new THREE.Vector3(), new THREE.Vector3(), R);
    this.vel = new THREE.Vector3();
    this.wish = new THREE.Vector3();
    this.feet = new THREE.Vector3();
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.jumping = false;
    this.jumpHeld = false;
    this.airVy = 0;
    this.facing = facing;
    this.safe = spawn.clone();
    this.safeFacing = facing;
    this.safeTimer = 0;
    this.maxHp = MAX_HP;
    this.hp = MAX_HP;
    this.state = 'move';
    this.stateT = 0;
    this.invuln = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.attackBuf = 0;
    this.dodgeBuf = 0;
    this.attackCooldown = 0;
    this.combo = 0;
    this.queued = false;
    this.swing = null;
    this.swingId = 0;
    this.dodge = null;
    this.shielding = false;
    this.blockT = 0;
    this.lockTarget = null;
    this.assistTarget = null;
    this.hasHammer = false;
    this.heavy = false;
    this.gloves = false;
    this.slamBuf = 0;
    this.slamDone = false;
    this.wind = new THREE.Vector3(); // stormvind som knuffar Cello (sätts av fästningen)
    this.anim = { phase: 0, run: 0, air: 0, land: 0, t: 0, shield: 0, lastStep: 0, blink: 2.5, scarf: [0.3, 0.3, 0.3], scarfV: [0, 0, 0] };
    this.model = buildModel();
    mergeRigid(this.model.root, [this.model.skirt, ...this.model.eyes]);
    scene.add(this.model.root);
    this.shadow = makeShadow();
    scene.add(this.shadow);
    this.swordBase = new THREE.Vector3();
    this.swordTip = new THREE.Vector3();
    // Händelser som main.js kopplar till ljud och effekter
    this.onAutoJump = null;
    this.onJump = null;
    this.onLand = null;
    this.onAttack = null;
    this.onDodge = null;
    this.onHurt = null;
    this.onBlock = null;
    this.onStep = null;
    this.onSlam = null; // (punkt) när hammaren slår i marken
    this.onSlamStart = null;
    this.onHeavy = null; // (på/av)
    this.teleport(spawn);
  }

  // ---------- grundläggande ----------
  teleport(p) {
    this.collider.start.set(p.x, p.y + R + 0.03, p.z);
    this.collider.end.set(p.x, p.y + HEIGHT - R + 0.03, p.z);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.jumping = false;
    this.updateFeet();
    this.syncModel();
  }

  respawn() {
    this.teleport(this.safe);
    this.facing = this.safeFacing;
    this.setState('move');
    this.syncModel();
  }

  revive(p, facing) {
    this.hp = this.maxHp;
    this.heavy = false;
    this.wind.set(0, 0, 0);
    this.invuln = 1.5;
    this.safe.copy(p);
    this.safeFacing = facing;
    this.teleport(p);
    this.facing = facing;
    this.setState('move');
    this.model.body.rotation.set(0, 0, 0);
  }

  // Bär en person i famnen (Maren i prologen)
  carry(npc) {
    if (npc) {
      this.carried = npc;
      const r = npc.model.root;
      this.model.root.add(r);
      r.position.set(0, 0.98, 0.42);
      r.rotation.set(0, Math.PI / 2, 0);
      npc.model.body.rotation.x = -Math.PI / 2;
      npc.model.legL.rotation.x = 0.2;
      npc.model.legR.rotation.x = 0.1;
      npc.model.armL.rotation.z = -0.3;
      npc.model.head.rotation.set(0, 0, 0);
      this.shielding = false;
    } else if (this.carried) {
      const r = this.carried.model.root;
      this.scene.add(r);
      r.rotation.set(0, 0, 0);
      r.scale.setScalar(0.86);
      this.carried = null;
    }
  }

  // Valen syns på Cello: hämndens väg ger mörkare halsduk och glödande ögon
  setPath(kind) {
    const M = this.model.M;
    M.scarf.color.set(kind === 'vengeful' ? 0x3a1212 : kind === 'heroic' ? 0xa8302a : 0x8c2a27);
    M.tunic.color.set(kind === 'vengeful' ? 0x3a3f4a : 0x4a5465);
    this.model.eyes.forEach((e) => { e.material = kind === 'vengeful' ? this.emberEye : M.eye; });
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  nudge(x, z) {
    this.collider.translate(_w.set(x, 0, z));
    this.updateFeet();
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
    if (s !== 'attack') this.swing = null;
    if (s !== 'dodge') this.dodge = null;
  }

  updateFeet() {
    this.feet.set(this.collider.start.x, this.collider.start.y - R, this.collider.start.z);
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  get dodgeInvulnerable() {
    return this.state === 'dodge' && this.stateT > 0.03 && this.stateT < 0.38;
  }

  get visibleBlink() {
    return this.state === 'dead' || this.invuln <= 0 || Math.sin(this.invuln * 45) > -0.3;
  }

  fellOut() {
    return this.feet.y < this.safe.y - 20 || this.feet.y < -60;
  }

  // ---------- skada ----------
  // opt.unblockable: skölden hjälper inte · opt.nonLethal: lämnar minst ett halvt hjärta · opt.force: träffar alltid
  takeHit(dmg, from, opt = {}) {
    if (this.state === 'dead') return 'ignored';
    if (!opt.force && (this.invuln > 0 || this.dodgeInvulnerable)) return 'ignored';
    const dx = from.x - this.feet.x, dz = from.z - this.feet.z;
    const len = Math.hypot(dx, dz) || 1;
    const ang = Math.abs(wrap(Math.atan2(dx, dz) - this.facing));
    if (this.shielding && ang < 1.3 && !opt.unblockable) {
      this.vel.x = (-dx / len) * 4.5;
      this.vel.z = (-dz / len) * 4.5;
      this.blockT = 0.25;
      this.onBlock?.();
      return 'blocked';
    }
    this.hp = Math.max(opt.nonLethal ? 1 : 0, this.hp - dmg);
    this.invuln = 1.1;
    const kb = this.heavy ? 0.3 : 1; // med tung vikt står Cello nästan still
    this.vel.set((-dx / len) * 7 * kb, 4.5 * kb, (-dz / len) * 7 * kb);
    this.grounded = false;
    this.jumping = true;
    this.shielding = false;
    this.setState(this.hp > 0 ? 'hurt' : 'dead');
    this.onHurt?.(this.hp);
    return 'hit';
  }

  // ---------- uppdatering ----------
  update(dt, input, camYaw) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.blockT = Math.max(0, this.blockT - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.coyote = this.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuf = input.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuf - dt);
    this.attackBuf = input.attack ? 0.25 : Math.max(0, this.attackBuf - dt);
    this.dodgeBuf = input.dodge ? 0.15 : Math.max(0, this.dodgeBuf - dt);
    this.slamBuf = input.slam ? 0.2 : Math.max(0, this.slamBuf - dt);
    if (input.heavy && this.hasHammer && !this.carried && (this.state === 'move' || this.state === 'attack')) {
      this.heavy = !this.heavy;
      this.onHeavy?.(this.heavy);
    }
    this.jumpHeld = !!input.jumpHeld;
    this.stateT += dt;

    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    // Kamerans "framåt" är (-sin, -cos) och "höger" är (cos, -sin)
    this.wish.set(cy * input.moveX - sy * input.moveY, 0, -sy * input.moveX - cy * input.moveY);
    if (this.wish.lengthSq() > 1e-6) this.wish.normalize();

    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    let tvx = 0, tvz = 0, accel = DECEL, airControl = false, allowAuto = false, turnRate = 0;
    let faceAngle = null;
    if (this.lockTarget) faceAngle = Math.atan2(this.lockTarget.pos.x - this.feet.x, this.lockTarget.pos.z - this.feet.z);

    switch (this.state) {
      case 'move': {
        const carrying = !!this.carried;
        this.shielding = !!input.shield && this.grounded && !carrying;
        const heavySpeed = this.gloves ? HEAVY_SPEED_GLOVES : HEAVY_SPEED;
        const speed = carrying ? 3.6 : this.heavy ? Math.min(heavySpeed, this.shielding ? SHIELD_SPEED : heavySpeed)
          : this.shielding ? SHIELD_SPEED : this.lockTarget ? LOCK_SPEED : input.walk ? WALK_SPEED : RUN_SPEED;
        tvx = this.wish.x * speed * mag;
        tvz = this.wish.z * speed * mag;
        accel = mag > 0.01 ? ACCEL : DECEL;
        airControl = mag > 0.01;
        allowAuto = !this.lockTarget && !this.shielding && !carrying && !this.heavy;
        turnRate = this.grounded ? (this.shielding ? 0 : carrying ? 10 : this.heavy ? 9 : 16) : 6;
        if (carrying) break;
        const wantSlam = this.hasHammer && (this.slamBuf > 0 || (this.heavy && this.attackBuf > 0));
        if (wantSlam && this.grounded) this.startSlam();
        else if (this.heavy) { this.jumpBuf = 0; this.dodgeBuf = 0; } // för tung för att hoppa eller rulla
        else if (this.jumpBuf > 0 && this.coyote > 0 && !this.shielding) this.jump();
        else if (this.attackBuf > 0 && this.attackCooldown <= 0) this.startAttack(0);
        else if (this.dodgeBuf > 0 && this.grounded) this.startDodge(mag);
        break;
      }
      case 'slam': {
        // Upp med hammaren, ner i marken: blixten går ut genom golvet
        accel = 30;
        if (!this.slamDone && this.stateT >= this.slamWind) {
          this.slamDone = true;
          const point = this.feet.clone();
          point.x += fx * SLAM_REACH;
          point.z += fz * SLAM_REACH;
          this.onSlam?.(point);
        }
        if (this.stateT >= this.slamWind + SLAM_RECOVER) this.setState('move');
        break;
      }
      case 'itemget':
        accel = 30;
        break;
      case 'attack': {
        const A = ATTACKS[this.combo], t = this.stateT;
        this.swing.active = t >= A.a0 && t <= A.a1;
        if (this.attackBuf > 0 && t > 0.08 && this.combo < 2) {
          this.queued = true;
          this.attackBuf = 0;
        }
        const lunge = A.lunge * Math.max(0, 1 - t / (A.a1 + 0.06));
        tvx = fx * lunge;
        tvz = fz * lunge;
        accel = 50;
        if (this.queued && t >= A.a1 + 0.05) this.startAttack(this.combo + 1);
        else if (t > A.a1 && this.dodgeBuf > 0 && this.grounded) this.startDodge(mag);
        else if (t >= A.dur) {
          if (this.combo === 2) this.attackCooldown = 0.18;
          this.setState('move');
        }
        break;
      }
      case 'dodge': {
        const d = this.dodge, t = this.stateT;
        if (d.kind === 'roll') {
          const sp = 9.5 * Math.max(0, 1 - t / 0.5) + 2;
          tvx = d.dx * sp;
          tvz = d.dz * sp;
          accel = 60;
          if (t >= 0.5) this.setState('move');
        } else {
          accel = 0;
          if ((t > 0.2 && this.grounded) || t > 1.3) this.setState('move');
        }
        break;
      }
      case 'hurt':
        accel = 6;
        if (this.stateT > 0.4 && this.grounded) this.setState('move');
        break;
      case 'dead':
        accel = 8;
        break;
      default:
        break;
    }
    if (this.state !== 'move') this.shielding = false;

    const steps = Math.max(1, Math.ceil(dt / STEP)), h = dt / steps;
    for (let s = 0; s < steps; s++) this.step(h, tvx, tvz, accel, airControl, allowAuto, mag);

    // Vridning mot rörelsen, eller mot fienden vid lock-on
    if (this.state === 'move' || this.state === 'attack') {
      if (faceAngle !== null && this.state === 'move') {
        this.facing += wrap(faceAngle - this.facing) * (1 - Math.exp(-dt * 18));
      } else if (this.state === 'move' && mag > 0.05 && turnRate > 0) {
        const target = Math.atan2(this.wish.x, this.wish.z);
        this.facing += wrap(target - this.facing) * (1 - Math.exp(-dt * turnRate));
      }
    } else if (this.state === 'dodge' && this.dodge.kind !== 'roll' && faceAngle !== null) {
      this.facing += wrap(faceAngle - this.facing) * (1 - Math.exp(-dt * 10));
    }
    this.facing = wrap(this.facing);

    this.updateFeet();
    this.trackSafe(dt);
    this.animate(dt);
    this.syncModel();
    this.updateSword();
    this.updateShadow();
  }

  jump() {
    this.vel.y = JUMP_V;
    this.jumping = true;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.onJump?.();
  }

  startSlam() {
    const target = this.lockTarget || this.assistTarget;
    if (target) this.facing = Math.atan2(target.pos.x - this.feet.x, target.pos.z - this.feet.z);
    this.setState('slam');
    this.slamWind = this.gloves ? SLAM_WIND_GLOVES : SLAM_WIND;
    this.slamDone = false;
    this.slamBuf = 0;
    this.attackBuf = 0;
    this.shielding = false;
    this.onSlamStart?.();
  }

  // Cello håller upp ett föremål han just hittat (kistor, hjärtbehållare, reliker)
  holdUp(on) {
    if (on) {
      this.setState('itemget');
      this.vel.set(0, this.vel.y, 0);
      this.shielding = false;
    } else if (this.state === 'itemget') this.setState('move');
  }

  startAttack(i) {
    const A = ATTACKS[i];
    const target = this.lockTarget || this.assistTarget;
    if (target) this.facing = Math.atan2(target.pos.x - this.feet.x, target.pos.z - this.feet.z);
    this.setState('attack');
    this.combo = i;
    this.queued = false;
    this.attackBuf = 0;
    const dmg = A.dmg + (i === 2 ? this.finisherBonus : 0);
    this.swing = { id: ++this.swingId, active: false, dmg, reach: A.reach, arc: A.arc, hit: new Set(), kind: A.kind };
    this.onAttack?.(i);
  }

  startDodge(mag) {
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    let kind = 'roll', dx = fx, dz = fz;
    if (this.lockTarget && mag > 0.2) {
      // Vid lock-on: sidohopp åt sidan, bakåtvolt bakåt, rullning framåt
      const rx = fz, rz = -fx; // Cellos högra sida
      const lat = this.wish.x * rx + this.wish.z * rz;
      const fwd = this.wish.x * fx + this.wish.z * fz;
      if (Math.abs(lat) > Math.abs(fwd)) kind = 'side';
      else if (fwd < 0) kind = 'back';
      if (kind === 'side') { const s = Math.sign(lat); dx = rx * s; dz = rz * s; }
      if (kind === 'back') { dx = -fx; dz = -fz; }
    } else if (this.lockTarget) {
      kind = 'back';
      dx = -fx;
      dz = -fz;
    } else if (mag > 0.1) {
      dx = this.wish.x;
      dz = this.wish.z;
      this.facing = Math.atan2(dx, dz);
    }
    this.setState('dodge');
    this.dodgeBuf = 0;
    this.dodge = { kind, dx, dz, side: 0 };
    if (kind === 'roll') {
      this.vel.x = dx * 9.5;
      this.vel.z = dz * 9.5;
    } else {
      const sp = kind === 'side' ? 7.6 : 6.2;
      this.vel.set(dx * sp, kind === 'side' ? 5.0 : 7.2, dz * sp);
      this.grounded = false;
      this.jumping = true;
      this.dodge.side = kind === 'side' ? Math.sign(dx * fz - dz * fx) : 0;
    }
    this.onDodge?.(kind);
  }

  step(h, tvx, tvz, accel, airControl, allowAuto, mag) {
    const wasGrounded = this.grounded;
    if (wasGrounded || airControl) {
      const a = wasGrounded ? accel : AIR_ACCEL;
      let dx = tvx - this.vel.x, dz = tvz - this.vel.z;
      const dl = Math.hypot(dx, dz), md = a * h;
      if (dl > md) { dx *= md / dl; dz *= md / dl; }
      this.vel.x += dx;
      this.vel.z += dz;
    }
    if (wasGrounded) this.vel.y = 0;
    else {
      // Släpper man Space tidigt blir hoppet lägre
      const g = (this.jumping && this.vel.y > 0 && !this.jumpHeld && this.state === 'move' ? GRAVITY * 2.2 : GRAVITY) * (this.heavy ? 1.5 : 1);
      this.vel.y = Math.max(this.vel.y - g * h, -MAX_FALL);
      this.airVy = this.vel.y;
    }

    this.collider.translate(_v.copy(this.vel).multiplyScalar(h));
    // Stormvinden knuffar Cello, men inte när han bär hammaren tungt
    if (!this.heavy && (this.wind.x || this.wind.z)) this.collider.translate(_v.set(this.wind.x * h, 0, this.wind.z * h));
    let onFloor = this.resolve();
    if (this.resolve()) onFloor = true;
    if (!onFloor && wasGrounded && !this.jumping) onFloor = this.snapDown();

    if (onFloor && this.vel.y <= 0.01) {
      if (!wasGrounded) this.land();
      this.grounded = true;
      this.jumping = false;
      this.vel.y = 0;
    } else if (!onFloor) {
      this.grounded = false;
      if (wasGrounded && allowAuto && !this.jumping && this.speed > JUMP_MIN_SPEED && mag > 0.6) {
        this.vel.y = AUTO_JUMP_V;
        this.jumping = true;
        this.onAutoJump?.();
      }
    }
  }

  // Skjuter ut kapseln ur världen. Golv löses rakt uppåt så att Cello inte glider i backar.
  resolve() {
    const r = this.world.capsuleIntersect(this.collider);
    // Vid nästan noll djup är riktningen bara avrundningsbrus, och den får inte stoppa Cello
    if (!r || r.depth < 1e-6) return false;
    const n = r.normal;
    if (n.y > FLOOR_NY) {
      this.collider.translate(_w.set(0, r.depth / n.y, 0));
      this.groundNormal.copy(n);
      if (this.vel.y < 0) this.vel.y = 0;
      return true;
    }
    this.collider.translate(_w.copy(n).multiplyScalar(r.depth));
    const vn = this.vel.dot(n);
    if (vn < 0) this.vel.addScaledVector(n, -vn);
    return false;
  }

  // Håller Cello mot marken i nedförsbackar och små steg ned.
  snapDown() {
    _ray.set(this.collider.start, _down);
    const hit = this.world.rayIntersect(_ray, R + SNAP + 0.05);
    if (hit && hit.distance < R + SNAP && hit.triangle.getNormal(_n).y > FLOOR_NY) {
      this.collider.translate(_w.set(0, -(hit.distance - R), 0));
      this.resolve();
      this.groundNormal.copy(_n);
      return true;
    }
    // Kanter: kapselns rundade botten kan vila på en kant även om strålen missar
    _cap.copy(this.collider);
    this.collider.translate(_w.set(0, -0.2, 0));
    const r = this.world.capsuleIntersect(this.collider);
    if (r && r.depth > 1e-6 && r.normal.y > FLOOR_NY) {
      this.collider.translate(_w.set(0, r.depth / r.normal.y, 0));
      this.groundNormal.copy(r.normal);
      return true;
    }
    this.collider.copy(_cap);
    return false;
  }

  land() {
    const impact = -this.airVy;
    if (impact > 7) this.anim.land = Math.min(1, impact / 22);
    this.onLand?.(impact);
  }

  // Sparar en säker plats att återuppstå på, men bara långt från kanter.
  trackSafe(dt) {
    this.safeTimer -= dt;
    if (!this.grounded || this.groundNormal.y < 0.85 || this.safeTimer > 0 || this.state === 'dead') return;
    this.safeTimer = 0.3;
    const o = this.collider.start;
    for (const [ox, oz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
      _ray.origin.set(o.x + ox, o.y + 0.3, o.z + oz);
      _ray.direction.copy(_down);
      const hit = this.world.rayIntersect(_ray, R + 1.2);
      if (!hit || hit.distance > R + 1.1) return;
    }
    this.safe.copy(this.feet);
    this.safeFacing = this.facing;
  }

  updateSword() {
    const s = this.model.sword;
    this.model.root.updateMatrixWorld(true);
    s.localToWorld(this.swordBase.set(0, -0.14, 0));
    s.localToWorld(this.swordTip.set(0, -1.0, 0));
  }

  // ---------- animation ----------
  animate(dt) {
    const a = this.anim, m = this.model, t = this.stateT;
    a.t += dt;
    const run = Math.min(1, this.speed / RUN_SPEED);
    a.run = approach(a.run, this.state === 'move' ? run : 0, 12, dt);
    a.air = approach(a.air, this.grounded ? 0 : 1, this.grounded ? 18 : 8, dt);
    a.land = Math.max(0, a.land - dt * 3.5);
    a.shield = approach(a.shield, this.shielding ? 1 : 0, 22, dt);
    if (this.grounded && this.state === 'move') {
      const before = Math.floor(a.phase / Math.PI);
      a.phase += dt * (2.2 + this.speed * (this.heavy ? 1.9 : 1.55));
      if (Math.floor(a.phase / Math.PI) !== before && this.speed > 1.2) this.onStep?.(this.heavy ? -1 : this.speed / RUN_SPEED);
    }

    const swing = Math.sin(a.phase) * 0.95 * Math.min(1, a.run * 1.5) * (1 - a.air);
    const idle = 1 - Math.min(1, a.run * 3);
    const breathe = Math.sin(a.t * 2.2) * 0.012 * idle;

    // Grundpose (springa, stå, luft)
    const gait = Math.min(1, a.run * 1.5) * (1 - a.air);
    const cphase = Math.cos(a.phase);
    const P = {
      legL: -swing + a.air * -0.7, legR: swing + a.air * 0.45,
      // Knät böjs mest när benet svingar fram under kroppen
      kneeL: 0.06 + gait * (0.15 + 1.15 * Math.max(0, cphase)) + a.air * 0.95,
      kneeR: 0.06 + gait * (0.15 + 1.15 * Math.max(0, -cphase)) + a.air * 0.45,
      armLx: swing * 0.85 + a.air * -1.1, armRx: -swing * 0.85 + a.air * -0.9,
      armLz: -0.08 - a.air * 0.5 - idle * 0.04, armRz: 0.08 + a.air * 0.5 + idle * 0.04,
      elbowL: -0.22 - 0.75 * gait - a.air * 0.4, elbowR: -0.22 - 0.75 * gait - a.air * 0.3,
      hipsY: 0.86 + Math.abs(Math.sin(a.phase)) * 0.07 * a.run * (1 - a.air) + breathe - gait * 0.03,
      hipsX: 0, torsoX: 0.2 * a.run * (1 - a.air) + 0.1 * a.air, torsoY: Math.sin(a.phase) * 0.12 * a.run, torsoZ: 0,
      headX: -0.12 * a.run, swordX: -0.9, bodyX: 0,
    };
    let rate = 16;

    // Sköld uppe
    if (a.shield > 0.01) {
      P.elbowL = P.elbowL * (1 - a.shield) - 1.1 * a.shield;
      P.kneeL = P.kneeL * (1 - a.shield) + 0.3 * a.shield;
      P.kneeR = P.kneeR * (1 - a.shield) + 0.2 * a.shield;
      P.armLx = P.armLx * (1 - a.shield) - 1.3 * a.shield;
      P.armLz = P.armLz * (1 - a.shield) + 0.35 * a.shield;
      P.torsoX = P.torsoX * (1 - a.shield) + 0.12 * a.shield;
      P.torsoY = P.torsoY * (1 - a.shield) + 0.2 * a.shield;
    }

    if (this.carried && this.state === 'move') {
      P.armLx = P.armRx = -1.25;
      P.elbowL = P.elbowR = -0.65;
      P.armLz = 0.25; P.armRz = -0.25;
      P.torsoX = -0.05; P.torsoY = 0;
      P.swordX = -0.2;
    }

    if (this.state === 'attack') {
      const A = ATTACKS[this.combo];
      const wind = clamp01(t / A.a0), act = clamp01((t - A.a0) / (A.a1 - A.a0)), rec = clamp01((t - A.a1) / (A.dur - A.a1));
      rate = 45;
      P.legL = -0.45; P.legR = 0.35; P.hipsY = 0.8; P.swordX = -0.15;
      P.kneeL = 0.35; P.kneeR = 0.25; P.elbowR = -0.08; P.elbowL = -0.7;
      if (A.kind === 'r2l' || A.kind === 'l2r') {
        const s = A.kind === 'r2l' ? 1 : -1;
        const from = 1.05 * s, to = -1.1 * s;
        P.torsoY = t < A.a0 ? from * wind : t <= A.a1 ? from + (to - from) * easeOut(act) : to * (1 - rec * rec);
        P.armRx = -1.45;
        P.armRz = A.kind === 'r2l' ? 0.3 : -0.15;
        P.armLx = -0.5; P.torsoX = 0.15;
      } else {
        P.armRx = t < A.a0 ? -2.9 * wind : t <= A.a1 ? -2.9 + 2.45 * easeOut(act) : -0.45 - 0.4 * rec;
        P.armRz = 0.05;
        P.torsoX = t < A.a0 ? -0.2 * wind : 0.45 * (1 - rec * 0.6);
        P.torsoY = 0; P.armLx = -0.3; P.legL = -0.7; P.legR = 0.5; P.hipsY = 0.74;
        P.kneeL = 0.6; P.kneeR = 0.45; P.elbowR = t < A.a0 ? -0.5 : -0.12;
      }
    } else if (this.state === 'dodge') {
      const d = this.dodge;
      rate = 40;
      if (d.kind === 'roll') {
        const k = clamp01(t / 0.45);
        P.hipsX = Math.PI * 2 * easeOut(k);
        P.hipsY = 0.86 - Math.sin(k * Math.PI) * 0.45;
        P.legL = P.legR = -1.5 * Math.sin(k * Math.PI);
        P.armLx = P.armRx = -1.3 * Math.sin(k * Math.PI);
        P.torsoX = 0.5 * Math.sin(k * Math.PI);
        P.kneeL = P.kneeR = 0.2 + 1.6 * Math.sin(k * Math.PI);
        P.elbowL = P.elbowR = -0.3 - 1.0 * Math.sin(k * Math.PI);
      } else if (d.kind === 'back') {
        const k = clamp01(t / 0.55);
        P.hipsX = -Math.PI * 2 * easeOut(k);
        P.hipsY = 0.86 + Math.sin(k * Math.PI) * 0.2;
        P.legL = P.legR = -1.2 * Math.sin(k * Math.PI);
        P.armLx = P.armRx = -2.6 * Math.sin(k * Math.PI);
        P.kneeL = P.kneeR = 0.2 + 1.3 * Math.sin(k * Math.PI);
        P.elbowL = P.elbowR = -0.2;
      } else {
        P.torsoZ = -0.35 * d.side;
        P.legL = -0.6; P.legR = -0.3;
        P.kneeL = 0.9; P.kneeR = 0.6;
        P.armLz = -0.9; P.armRz = 0.9;
        P.elbowL = P.elbowR = -0.4;
      }
      if (d.kind !== 'roll' && d.kind !== 'back') P.hipsX = 0;
    } else if (this.state === 'slam') {
      const w = this.slamWind, k = clamp01(t / w), rec = clamp01((t - w) / SLAM_RECOVER);
      if (t < w) {
        rate = 22;
        P.armRx = P.armLx = -3.0 * easeOut(k);
        P.armLz = -0.15; P.armRz = 0.15;
        P.torsoX = -0.3 * k; P.torsoY = 0; P.headX = -0.15 * k;
        P.hipsY = 0.86 + 0.05 * k; P.legL = -0.15; P.legR = 0.2;
        P.elbowL = P.elbowR = -0.45 * (1 - k * 0.6); P.kneeL = 0.1; P.kneeR = 0.15;
      } else {
        rate = 70;
        P.armRx = P.armLx = -0.55 - rec * 0.3;
        P.armLz = -0.1; P.armRz = 0.1;
        P.torsoX = 0.6 * (1 - rec * 0.5); P.torsoY = 0; P.headX = 0.1;
        P.hipsY = 0.68 + rec * 0.1; P.legL = -0.75; P.legR = 0.55;
        P.elbowL = P.elbowR = -0.12; P.kneeL = 0.95 - rec * 0.4; P.kneeR = 0.7 - rec * 0.3;
      }
      P.swordX = -0.2;
    } else if (this.state === 'itemget') {
      rate = 14;
      P.armLx = P.armRx = -2.85; P.armLz = -0.28; P.armRz = 0.28;
      P.torsoX = -0.05; P.torsoY = 0; P.headX = -0.25; P.legL = 0.08; P.legR = -0.08; P.hipsY = 0.88;
      P.elbowL = P.elbowR = -0.15; P.kneeL = P.kneeR = 0.04;
    } else if (this.state === 'hurt') {
      rate = 25;
      P.torsoX = -0.45; P.headX = 0.3; P.armLx = -0.6; P.armRx = -0.6; P.armLz = -0.7; P.armRz = 0.7;
      P.elbowL = P.elbowR = -0.6; P.kneeL = P.kneeR = 0.35;
    } else if (this.state === 'dead') {
      rate = 6;
      P.bodyX = -1.45; P.armLz = -1.2; P.armRz = 1.2; P.torsoX = 0; P.legL = 0.1; P.legR = -0.1;
      P.elbowL = P.elbowR = -0.25; P.kneeL = 0.15; P.kneeR = 0.05;
    }

    // Rullning och volt ska inte "spola tillbaka" när de tar slut
    if (this.state !== 'dodge') m.hips.rotation.x = wrap(m.hips.rotation.x);
    m.hips.rotation.x = this.state === 'dodge' ? P.hipsX : approach(m.hips.rotation.x, 0, 30, dt);
    const ap = (obj, key, val, r = rate) => { obj[key] = approach(obj[key], val, r, dt); };
    ap(m.legL.rotation, 'x', P.legL);
    ap(m.legR.rotation, 'x', P.legR);
    ap(m.armL.rotation, 'x', P.armLx);
    ap(m.armR.rotation, 'x', P.armRx);
    ap(m.armL.rotation, 'z', P.armLz);
    ap(m.armR.rotation, 'z', P.armRz);
    ap(m.hips.position, 'y', P.hipsY);
    ap(m.torso.rotation, 'x', P.torsoX);
    ap(m.torso.rotation, 'y', P.torsoY);
    ap(m.torso.rotation, 'z', P.torsoZ);
    ap(m.head.rotation, 'x', P.headX);
    ap(m.sword.rotation, 'x', P.swordX, 30);
    ap(m.body.rotation, 'x', P.bodyX);
    const sqk = a.land * a.land;
    ap(m.kneeL.rotation, 'x', P.kneeL + sqk * 0.9);
    ap(m.kneeR.rotation, 'x', P.kneeR + sqk * 0.9);
    ap(m.elbowL.rotation, 'x', P.elbowL);
    ap(m.elbowR.rotation, 'x', P.elbowR);
    // Tunikans fåll följer benen, och fladdrar ut lite när han springer
    m.skirt.rotation.x = approach(m.skirt.rotation.x, (m.legL.rotation.x + m.legR.rotation.x) * 0.25 - a.run * 0.08, 20, dt);
    m.skirt.scale.set(1 + a.run * 0.06 + a.air * 0.1, 1, 1 + a.run * 0.08 + a.air * 0.1);

    // Halsduken: tre leder med fjädring, lyfts bakåt av farten och fladdrar i vinden
    const lift = 0.2 + a.run * 1.05 + a.air * 0.5 + (this.wind.z && !this.heavy ? 0.6 : 0);
    for (let i = 0; i < 3; i++) {
      const target = (i === 0 ? lift : 0.12 * a.run) + Math.sin(a.t * (11 + i * 3) + i) * (0.06 + 0.14 * a.run) * (i + 1) * 0.6;
      const k = 70, damp = 9;
      a.scarfV[i] += ((target - a.scarf[i]) * k - a.scarfV[i] * damp) * dt;
      a.scarf[i] += a.scarfV[i] * dt;
      m.scarf[i].rotation.x = a.scarf[i];
    }
    m.tail.rotation.x = 0;

    // Blinkar då och då
    a.blink -= dt;
    const shut = a.blink < 0.12 && this.state !== 'dead';
    if (a.blink < 0) a.blink = 2.2 + Math.random() * 3;
    for (const l of m.lids) l.scale.y = this.state === 'dead' ? 0.15 : shut ? 0.12 : 1;
    // Huvudet vänds mot fienden vid lock-on
    let look = 0;
    if (this.lockTarget && this.state === 'move') {
      look = wrap(Math.atan2(this.lockTarget.pos.x - this.feet.x, this.lockTarget.pos.z - this.feet.z) - this.facing - m.torso.rotation.y);
      look = Math.max(-0.7, Math.min(0.7, look));
    }
    m.head.rotation.y = approach(m.head.rotation.y, look, 10, dt);

    // Skölden: på sidan eller framför bröstet
    const s = a.shield;
    m.shield.position.set(-0.37 + 0.32 * s, 0.3 + 0.06 * s, -0.02 + 0.42 * s);
    m.shield.rotation.set(0, (Math.PI / 2) * s, 0.1 * (1 - s));

    const sq = a.land * a.land;
    m.body.scale.set(1 + sq * 0.12, 1 - sq * 0.22, 1 + sq * 0.12);

    // Svärdet eller hammaren i handen, hammaren på ryggen
    const inHand = this.hasHammer && (this.state === 'slam' || (this.heavy && this.state !== 'attack'));
    const holding = this.state === 'itemget';
    m.sword.visible = !inHand && !holding;
    m.hammerHand.visible = inHand && !holding;
    m.hammerBack.visible = this.hasHammer && !inHand;
    m.hammerHand.rotation.x = this.state === 'slam' ? m.sword.rotation.x - 0.3 : m.sword.rotation.x;
    const glow = this.state === 'slam' ? 1 : this.heavy ? 0.6 + Math.sin(a.t * 9) * 0.25 : 0.35;
    m.hammerGlow.color.setRGB(0.35 + 0.5 * glow, 0.6 + 0.35 * glow, 0.8 + 0.2 * glow);
  }

  syncModel() {
    const root = this.model.root;
    root.position.copy(this.feet);
    root.rotation.y = this.facing;
  }

  updateShadow() {
    _ray.set(this.collider.start, _down);
    const hit = this.world.rayIntersect(_ray, 30);
    if (!hit || hit.distance > 30) { this.shadow.visible = false; return; }
    hit.triangle.getNormal(_n);
    if (_n.y < 0.2) { this.shadow.visible = false; return; }
    this.shadow.visible = true;
    this.shadow.position.copy(hit.position).addScaledVector(_n, 0.02);
    this.shadow.quaternion.setFromUnitVectors(_up, _n);
    const k = 1 - Math.min(0.65, (hit.distance - R) / 9);
    this.shadow.scale.setScalar(k);
    this.shadow.material.opacity = 0.45 * k;
  }
}

// Cello: rörelse, hopp, svärd, sköld, undanmanöver, skada, Mjölnirs skärva och en klossfigur.
import * as THREE from 'three';

import { Capsule } from 'three/addons/math/Capsule.js';
import { buildHammer, buildTrident, ITEM_MATS } from './items.js';
import { mergeRigid } from './geom.js';
import { heroAvailable, sculptHero } from './heroRig.js';

// Var Marens höft ligger när Cello bär henne (Cellos egna koordinater, före hans skala)
const CARRY_SEAT = { x: 0.14, y: 0.9, z: 0.46 };

const R = 0.35, HEIGHT = 1.7;
export const RUN_SPEED = 6.6;
const WALK_SPEED = 2.4, LOCK_SPEED = 4.6, SHIELD_SPEED = 1.9, PRISM_SPEED = 2.2;
const ACCEL = 48, DECEL = 40, AIR_ACCEL = 10;
const GRAVITY = 30, MAX_FALL = 42;
const JUMP_V = 7.6, AUTO_JUMP_V = 7.4, JUMP_MIN_SPEED = 4.2;
const COYOTE = 0.1, JUMP_BUFFER = 0.12;
const FLOOR_NY = 0.55, SNAP = 0.45, STEP = 1 / 150;
export const MAX_HP = 6; // tre hjärtan, varje träff tar ett halvt
export const SWORD_MAX = 150; // svärdets hållbarhet: ett hugg som träffar sliter 1, en sköld 2
// Mjölnirs skärva: tung vikt och markslaget
const HEAVY_SPEED = 2.3, HEAVY_SPEED_GLOVES = 3.3;
// Grumble, getabocken: dubbelt så fort som Cello springer, vidare svängar och högre hopp
export const RIDE_SPEED = 12.5;
const RIDE_ACCEL = 20, RIDE_JUMP_V = 9.4;
// 0.14: Hermes' Wing Sandals: snabbläget, väggspring och uppvindar
export const SWIFT_SPEED = 10.2;
const SWIFT_JUMP_V = 8.4, WALLRUN_SPEED = 9.2, WALLRUN_TIME = 1.7;
// 0.15: simning. Cello flyter med fötterna FLOAT_DEPTH under ytan; under vattnet räcker luften BREATH_MAX sekunder
const SWIM_SPEED = 3.9, SWIM_SPEED_SWIFT = 5.6, DIVE_SPEED = 3.7, SWIM_ACCEL = 12, SWIM_VY = 3.4, BUOY = 0.9;
const FLOAT_DEPTH = 1.22, ENTER_DEPTH = 1.15, EXIT_DEPTH = 0.9, HEAD_Y = 1.5;
export const BREATH_MAX = 12;
// 0.16: is. På blank is (slick) har Cello dåligt fäste; på glidis (glide) glider han rakt fram tills han slår i något
const GLIDE_SPEED = 9, SLICK_ACCEL = 4.5;
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
  blade.userData.solo = true;
  sword.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 4), M.steel);
  tip.rotation.set(Math.PI, Math.PI / 4, 0);
  tip.scale.set(0.5, 1, 1.2);
  tip.position.y = -1.02;
  tip.userData.solo = true;
  sword.add(tip);
  // Den avbrutna eggen (syns när svärdet har gått sönder)
  const jag = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 3), M.steel);
  jag.rotation.set(Math.PI, 0, 0.5);
  jag.scale.set(0.6, 1, 1.4);
  jag.position.set(0.01, -0.5, 0);
  jag.visible = false;
  jag.userData.solo = true;
  sword.add(jag);
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
  // 0.15: treudden i höger hand när Cello gör ett anfall med den
  const tridentHand = buildTrident();
  tridentHand.position.set(0, -0.3, 0);
  tridentHand.rotation.x = 0;
  tridentHand.visible = false;
  elbowR.add(tridentHand);
  // Ra's Shattered Prism: en sprucken kristall i en gyllene ram, hålls framför Cello i höger hand
  const prism = new THREE.Group();
  {
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffe8a8, transparent: true, opacity: 0.9 });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), crystalMat);
    crystal.scale.set(0.8, 1.4, 0.8);
    crystal.userData.solo = true;
    prism.add(crystal);
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xc9a24f, emissive: 0x3a2808, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 4, 10), goldMat);
    ring.rotation.x = Math.PI / 2;
    prism.add(ring);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), goldMat);
    handle.position.y = -0.2;
    prism.add(handle);
    prism.position.set(0, -0.42, 0.06);
    prism.visible = false;
    elbowR.add(prism);
    prism.userData.crystalMat = crystalMat;
  }

  // Lyktan hänger i bältet vid vänster höft
  const lantern = new THREE.Group();
  lantern.position.set(-0.27, 0.02, 0.06);
  lantern.add(B(0.14, 0.03, 0.14, M.iron, 0, 0.09, 0));
  lantern.add(B(0.14, 0.03, 0.14, M.iron, 0, -0.09, 0));
  for (const [x, z] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) lantern.add(B(0.02, 0.18, 0.02, M.iron, x, 0, z));
  lantern.add(B(0.02, 0.08, 0.02, M.iron, 0, 0.14, 0));
  const lanternGlass = new THREE.MeshBasicMaterial({ color: 0x5a4a30 });
  const glass = B(0.1, 0.14, 0.1, lanternGlass, 0, 0, 0);
  glass.userData.solo = true;
  lantern.add(glass);
  lantern.visible = false;
  hips.add(lantern);

  const lL = leg(-1), lR = leg(1);
  const parts = {
    body, hips, torso, head, tail, scarf, armL, armR, elbowL, elbowR, legL: lL.g, legR: lR.g, kneeL: lL.knee, kneeR: lR.knee,
    skirt, sword, shield, eyes, lids, M, hammerHand, hammerBack, hammerGlow: glow, blade, tip, jag, lantern, lanternGlass, prism, tridentHand,
  };
  root.scale.setScalar(0.9);
  // 0.13: Elias hjälteskulptur, när modellpaketet finns
  return heroAvailable() ? sculptHero({ root, ...parts }) : { root, ...parts };
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
    this.hasPrism = false;
    this.prismUp = false;
    this.prismPoint = new THREE.Vector3();
    this.aimDir = new THREE.Vector3(0, 0, 1);
    this.onPrism = null; // (uppe: true/false)
    this.wearMul = 1; // Tareks slipsten gör att svärdet slits långsammare
    this.mount = null; // getabocken Cello rider på (goat.js), eller null
    this.onKnockedOff = null; // (bocken) när Cello blir träffad och ramlar av
    this.onHoof = null; // hovslag
    this.heavy = false;
    this.gloves = false;
    this.slamBuf = 0;
    this.slamDone = false;
    this.sword = { dur: SWORD_MAX, broken: false };
    this.autoWalk = null; // { yaw, speed } – Cello går själv (in i ett nytt område)
    this.onSwordWear = null; // ('dull' | 'broken')
    this.wind = new THREE.Vector3(); // stormvind som knuffar Cello (sätts av fästningen)
    this.gust = new THREE.Vector3(); // 0.14: vindbyar i The Galecrown och tornet (sätts av området)
    this.swift = false; // 0.14: Hermes' sandaler på
    this.hasSandals = false;
    this.wallRun = null; // { n, dir, t, side }
    this.updrafts = null; // [{ x, z, r, y0, y1, power }]
    this.inDraft = 0;
    // 0.15: vatten och simning
    this.canSwim = false;
    this.waterAt = null; // (x, z) => vattenytans höjd eller null (sätts av main.js från området)
    this.bubbleAt = null; // (fötter) => sant där det finns luft att andas (luftfickor, bubblor)
    this.current = new THREE.Vector3(); // strömmar i vattnet
    this.waterY = null;
    this.swimming = false;
    this.swim = null; // { mode: 'surface' | 'dive' }
    this.breath = BREATH_MAX;
    this.breathMax = BREATH_MAX;
    this.headUnder = false;
    this.chokeT = 0.6;
    this.wallPush = 0;
    // 0.16: is, Lokis mask och kyla
    this.iceAt = null; // (fötter) => 'slick' | 'glide' | null
    this.iceLane = null; // (fötter) => isytan (med lane: rutstorlek) eller null
    this.onIce = null;
    this.glide = null; // { dx, dz, t }
    this.glideBlock = null;
    this.onGlide = null;
    this.hasMask = false;
    this.maskRange = 9;
    this.cold = 0;
    this.hasTrident = false; // 0.15: Poseidons treudd
    this.dash = null; // { dir, under, dur, speed }
    this.dashPower = 1;
    this.onDash = null;
    this.onSplash = null; this.onDive = null; this.onSurface = null; this.onClimbOut = null; this.onChoke = null;
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
    this.drowning = false;
    this.stopSwim();
    this.breath = this.breathMax;
    this.teleport(this.safe);
    this.facing = this.safeFacing;
    this.setState('move');
    this.syncModel();
  }

  revive(p, facing) {
    this.drowning = false;
    this.stopSwim();
    this.breath = this.breathMax;
    this.hp = this.maxHp;
    this.heavy = false;
    this.wind.set(0, 0, 0);
    this.gust.set(0, 0, 0);
    this.wallRun = null;
    this.swift = false;
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
      const m = npc.model, r = m.root;
      this.model.root.add(r);
      // 0.20: Maren ligger i Cellos famn, tvärs över hans underarmar. Hon "sitter" med benen över hans
      // högra arm och ryggen mot den vänstra, lutad bakåt så att huvudet vilar mot hans axel.
      r.rotation.set(0, Math.PI / 2, 0);
      r.position.set(0, 0, 0);
      r.scale.setScalar(0.86 / this.model.root.scale.x); // samma storlek som när hon står (Cellos skala ärvs)
      m.body.rotation.set(-1.2, 0, 0);
      m.hips.position.y = 0.86;
      m.torso.rotation.set(-0.15, 0, 0);
      m.legL.rotation.set(-0.95, 0, 0.04);
      m.legR.rotation.set(-1.05, 0, -0.04);
      m.kneeL.rotation.x = 1.55;
      m.kneeR.rotation.x = 1.4;
      m.armL.rotation.set(-0.5, 0, -0.35);
      m.armR.rotation.set(-1.2, 0, 0.5);
      m.elbowL.rotation.x = -0.4;
      m.elbowR.rotation.x = -1.3;
      m.head.rotation.set(0.25, -0.45, 0);
      m.sync?.();
      // Flytta henne så att höften hamnar i hans famn (räknat i Cellos koordinater)
      this.model.root.updateMatrixWorld(true);
      const hip = new THREE.Vector3();
      m.hips.getWorldPosition(hip);
      this.model.root.worldToLocal(hip);
      r.position.set(CARRY_SEAT.x - hip.x, CARRY_SEAT.y - hip.y, CARRY_SEAT.z - hip.z);
      this.shielding = false;
    } else if (this.carried) {
      const m = this.carried.model, r = m.root;
      (this.carried.parentGroup ?? this.scene).add(r);
      r.rotation.set(0, 0, 0);
      r.scale.setScalar(0.86);
      m.torso.rotation.set(0, 0, 0);
      m.legL.rotation.set(0, 0, 0);
      m.legR.rotation.set(0, 0, 0);
      m.armL.rotation.y = 0;
      m.armR.rotation.y = 0;
      m.head.rotation.z = 0;
      this.carried = null;
    }
  }

  // Valen syns på Cello: hämndens väg ger mörkare halsduk och glödande ögon
  setPath(kind) {
    if (this.model.recolor) { this.model.recolor(kind); return; }
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
    if (s !== 'dash') this.dash = null;
    if (s !== 'move') this.glide = null;
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
    // drowning: Cello har hamnat i djupt vatten (nekropolen, 0.12)
    return this.drowning || this.feet.y < this.safe.y - 20 || this.feet.y < -60;
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
    if (this.mount) this.onKnockedOff?.(this.mount);
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

  // ---------- svärdet ----------
  // Svärdet slits när det träffar. Vid 0 går det av: kortare räckvidd och halv skada.
  wearSword(n) {
    const s = this.sword;
    if (s.broken || n <= 0) return;
    const before = s.dur;
    s.dur = Math.max(0, s.dur - n * this.wearMul);
    if (s.dur <= 0) {
      this.setSword(0);
      this.onSwordWear?.('broken');
    } else if (before > SWORD_MAX * 0.25 && s.dur <= SWORD_MAX * 0.25) this.onSwordWear?.('dull');
  }

  // Sätter hållbarheten (ett nytt svärd = SWORD_MAX)
  setSword(dur) {
    this.sword.dur = Math.max(0, Math.min(SWORD_MAX, dur));
    this.sword.broken = this.sword.dur <= 0;
    const m = this.model, b = this.sword.broken;
    m.blade.scale.y = b ? 0.36 : 1;
    m.blade.position.y = m.bladeY ?? (b ? -0.29 : -0.55);
    m.tip.visible = !b;
    m.jag.visible = b;
  }

  // Lyktan: syns vid höften när Cello har en, och lyser när den är tänd
  setLantern(have, lit) {
    this.model.lantern.visible = have;
    this.model.lanternGlass.color.set(lit ? 0xffd27a : 0x5a4a30);
  }

  // Prisman upp eller ner
  setPrism(on) {
    if (on === this.prismUp) return;
    this.prismUp = on;
    if (on) this.shielding = false;
    this.onPrism?.(on);
  }

  // Var prismans ljus kommer ifrån och vart det går (mot låst mål, annars rakt fram)
  updateAim() {
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    this.prismPoint.set(this.feet.x + fx * 0.55, this.feet.y + 1.3, this.feet.z + fz * 0.55);
    const t = this.lockTarget;
    if (t) {
      this.aimDir.copy(t.chest).sub(this.prismPoint);
      if (this.aimDir.lengthSq() < 1e-4) this.aimDir.set(fx, 0, fz);
      this.aimDir.normalize();
    } else this.aimDir.set(fx, 0, fz);
  }

  // ---------- uppdatering ----------
  update(dt, input, camYaw) {
    if (this.autoWalk) {
      input = { ...input, moveX: 0, moveY: this.autoWalk.speed ?? 0.72, walk: false, attack: false, jump: false, dodge: false, slam: false, heavy: false, shield: false };
      camYaw = this.autoWalk.yaw + Math.PI;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.blockT = Math.max(0, this.blockT - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.coyote = this.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuf = input.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuf - dt);
    this.attackBuf = input.attack ? 0.25 : Math.max(0, this.attackBuf - dt);
    this.dodgeBuf = input.dodge ? 0.15 : Math.max(0, this.dodgeBuf - dt);
    this.slamBuf = input.slam ? 0.2 : Math.max(0, this.slamBuf - dt);
    if (input.heavy && this.hasHammer && !this.carried && !this.mount && (this.state === 'move' || this.state === 'attack')) {
      this.heavy = !this.heavy;
      this.onHeavy?.(this.heavy);
      if (this.heavy) this.setPrism(false);
      if (this.heavy && this.swift) { this.swift = false; this.onSwift?.(false); }
    }
    // 0.14: sandalerna av eller på (tung vikt och snabba fötter går inte ihop)
    if (input.swift && this.hasSandals && !this.carried && !this.mount && (this.state === 'move' || this.state === 'attack')) {
      this.swift = !this.swift;
      if (this.swift && this.heavy) { this.heavy = false; this.onHeavy?.(false); }
      if (!this.swift) this.wallRun = null;
      this.onSwift?.(this.swift);
    }
    if (input.prism && this.hasPrism && !this.carried && !this.mount && this.state === 'move' && !this.swimming) this.setPrism(!this.prismUp);
    // 0.15: treuddens anfall (på land en kort rusning, under vattnet en snabb stöt som en fisk)
    if (input.trident && this.hasTrident && !this.carried && !this.mount && !this.heavy && (this.state === 'move' || this.state === 'attack')) this.startDash();
    // Prisman sänks när Cello hugger, hoppar, rullar, tar upp skölden eller blir träffad
    if (this.prismUp && (this.state !== 'move' || input.attack || input.jump || input.dodge || input.shield || input.slam)) this.setPrism(false);
    this.jumpHeld = !!input.jumpHeld;
    this.stateT += dt;
    this.updateWater(dt, input);
    this.onIce = this.grounded && this.iceAt && !this.swimming ? this.iceAt(this.feet) : null;

    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    // Kamerans "framåt" är (-sin, -cos) och "höger" är (cos, -sin)
    this.wish.set(cy * input.moveX - sy * input.moveY, 0, -sy * input.moveX - cy * input.moveY);
    if (this.wish.lengthSq() > 1e-6) this.wish.normalize();

    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    let tvx = 0, tvz = 0, accel = DECEL, airControl = false, allowAuto = false, turnRate = 0;
    let faceAngle = null;
    if (this.lockTarget && !this.mount) faceAngle = Math.atan2(this.lockTarget.pos.x - this.feet.x, this.lockTarget.pos.z - this.feet.z);

    switch (this.state) {
      case 'move': {
        if (this.mount) {
          // Ridning: bara styra och hoppa. Inga hugg, ingen sköld, ingen rullning.
          this.shielding = false;
          tvx = this.wish.x * RIDE_SPEED * mag;
          tvz = this.wish.z * RIDE_SPEED * mag;
          accel = mag > 0.01 ? RIDE_ACCEL : RIDE_ACCEL * 1.2;
          airControl = mag > 0.01;
          allowAuto = true;
          turnRate = this.grounded ? 5.5 : 3;
          this.attackBuf = 0;
          this.dodgeBuf = 0;
          this.slamBuf = 0;
          if (this.jumpBuf > 0 && this.coyote > 0) {
            this.jump();
            this.vel.y = RIDE_JUMP_V;
          }
          break;
        }
        // 0.15: simning. Shift dyker, Space vid en kant klättrar upp, under vattnet: Space upp och Shift ned
        if (this.swimming) {
          this.shielding = false;
          const sp = this.swim.mode === 'dive' ? DIVE_SPEED : this.swift ? SWIM_SPEED_SWIFT : SWIM_SPEED;
          tvx = this.wish.x * sp * mag;
          tvz = this.wish.z * sp * mag;
          accel = SWIM_ACCEL;
          airControl = true;
          turnRate = 7;
          this.swimUp = !!input.jumpHeld;
          this.swimDown = !!input.diveHeld;
          if (this.swim.mode === 'surface') {
            if (this.dodgeBuf > 0) { this.dodgeBuf = 0; this.swim.mode = 'dive'; this.swim.diveT = 0.7; this.vel.y = -3.2; this.onDive?.(); }
            else if (this.jumpBuf > 0) { this.jumpBuf = 0; this.climbOut(); }
            else if (this.wallPush > 0.18 && mag > 0.5) { this.wallPush = 0; this.climbOut(); }
            else if (mag > 0.5 && (this.climbProbe = (this.climbProbe ?? 0) - dt) <= 0) { this.climbProbe = 0.2; this.climbOut(); }
          } else this.dodgeBuf = 0;
          if (this.swimming && this.attackBuf > 0 && this.attackCooldown <= 0) this.startAttack(0);
          break;
        }
        // 0.16: glidis. Cello glider rakt fram (i en av fyra riktningar) tills han slår i något
        if (this.glide) {
          const G = this.glide;
          G.t += dt;
          tvx = G.dx * GLIDE_SPEED;
          tvz = G.dz * GLIDE_SPEED;
          // Glidisen har banor (rutor): Cello dras mjukt mot mitten av sin bana
          if (G.lane != null) { if (G.dx) tvz += (G.lane - this.feet.z) * 6; else tvx += (G.lane - this.feet.x) * 6; }
          accel = 200;
          turnRate = 0;
          this.shielding = false;
          this.jumpBuf = 0; this.dodgeBuf = 0; this.attackBuf = 0;
          const sp = Math.hypot(this.vel.x, this.vel.z);
          const wall = G.t > 0.12 && sp < 2.5;
          if (this.heavy || wall || (this.grounded && this.onIce !== 'glide' && G.t > 0.05)) {
            this.glideBlock = wall ? { dx: G.dx, dz: G.dz } : null;
            this.glide = null;
            if (wall) this.onGlide?.('stop');
          }
          break;
        }
        if (this.grounded && this.onIce === 'glide' && !this.heavy && mag > 0.5 && !this.carried && !this.lockTarget) {
          const ax = Math.abs(this.wish.x) > Math.abs(this.wish.z);
          const dx = ax ? Math.sign(this.wish.x) : 0, dz = ax ? 0 : Math.sign(this.wish.z);
          const B = this.glideBlock;
          if (!B || B.dx !== dx || B.dz !== dz) {
            this.glideBlock = null;
            this.glide = { dx, dz, t: 0, lane: null };
            const R = this.iceLane?.(this.feet);
            if (R?.lane) {
              const L = R.lane, snap = (v, o) => o + L / 2 + Math.round((v - o - L / 2) / L) * L;
              this.glide.lane = dx ? snap(this.feet.z, R.z0) : snap(this.feet.x, R.x0);
            }
            this.facing = Math.atan2(dx, dz);
            this.onGlide?.('start');
            break;
          }
        } else if (mag < 0.3) this.glideBlock = null;
        const carrying = !!this.carried;
        this.shielding = !!input.shield && this.grounded && !carrying;
        const heavySpeed = this.gloves ? HEAVY_SPEED_GLOVES : HEAVY_SPEED;
        const speed = carrying ? 3.6 : this.heavy ? Math.min(heavySpeed, this.shielding ? SHIELD_SPEED : heavySpeed)
          : this.prismUp ? PRISM_SPEED : this.shielding ? SHIELD_SPEED : this.lockTarget ? LOCK_SPEED : input.walk ? WALK_SPEED
          : this.swift ? SWIFT_SPEED : RUN_SPEED;
        // 0.17: en Rimelings slag gör Cello långsam en stund
        const chill = this.slowT > 0 ? 0.58 : 1;
        tvx = this.wish.x * speed * mag * chill;
        tvz = this.wish.z * speed * mag * chill;
        accel = mag > 0.01 ? ACCEL : DECEL;
        airControl = mag > 0.01;
        allowAuto = !this.lockTarget && !this.shielding && !carrying && !this.heavy && !this.prismUp;
        turnRate = this.grounded ? (this.shielding ? 0 : carrying ? 10 : this.heavy ? 9 : this.prismUp ? 7 : 16) : 6;
        if (carrying) break;
        // Väggspring: hopp tar Cello ut från väggen, annars springer han längs den tills tiden tar slut
        if (this.wallRun) {
          if (this.jumpBuf > 0) this.wallJump();
          break;
        }
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
      case 'sleep': // 0.20: ligger i sängen i början av spelet
        accel = 30;
        break;
      case 'dash': {
        const d = this.dash;
        if (!d) { this.setState('move'); break; }
        const k = 1 - Math.min(1, this.stateT / d.dur) * 0.55;
        tvx = d.dir.x * d.speed * k;
        tvz = d.dir.z * d.speed * k;
        accel = 90;
        airControl = true;
        if (this.stateT >= d.dur) this.setState('move');
        break;
      }
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
          if ((t > 0.2 && (this.grounded || this.swimming)) || t > 1.3) this.setState('move');
        }
        break;
      }
      case 'hurt':
        accel = 6;
        if (this.stateT > 0.4 && (this.grounded || this.swimming)) this.setState('move');
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
    if (this.wallRun) this.facing = Math.atan2(this.wallRun.dir.x, this.wallRun.dir.z);
    this.facing = wrap(this.facing);
    // Lutar mot väggen vid väggspring
    this.model.body.rotation.z = approach(this.model.body.rotation.z, this.wallRun ? -this.wallRun.side * 0.42 : 0, 12, dt);

    this.updateFeet();
    this.updateAim();
    this.trackSafe(dt);
    this.animate(dt);
    this.syncModel();
    this.updateSword();
    this.updateShadow();
  }

  // 0.14: står Cello precis intill en vägg och springer längs den när han hoppar, börjar väggspringet direkt
  wallBeside() {
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (hv < 3.5) return null;
    const dx = this.vel.x / hv, dz = this.vel.z / hv;
    for (const s of [1, -1]) {
      _cap.copy(this.collider);
      this.collider.translate(_w.set(dz * s * 0.45, 0.15, -dx * s * 0.45));
      const r = this.world.capsuleIntersect(this.collider);
      this.collider.copy(_cap);
      if (r && r.depth > 1e-4 && Math.abs(r.normal.y) < 0.35) return r.normal.clone();
    }
    return null;
  }

  jump() {
    if (this.swift && this.state === 'move' && !this.wallRun && !this.carried) {
      const n = this.wallBeside();
      if (n) {
        this.grounded = false;
        this.vel.y = 0;
        this.tryWallRun(n);
        if (this.wallRun) { this.coyote = 0; this.jumpBuf = 0; this.onJump?.(); return; }
      }
    }
    this.vel.y = this.swift ? SWIFT_JUMP_V : JUMP_V;
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
    const broken = this.sword.broken;
    const dmg = (A.dmg + (i === 2 ? this.finisherBonus : 0)) * (broken ? 0.5 : 1);
    this.swing = { id: ++this.swingId, active: false, dmg, reach: A.reach * (broken ? 0.75 : 1), arc: A.arc, hit: new Set(), kind: A.kind };
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

  // 0.14: börja springa längs en vägg (Cello är i luften med sandalerna på och träffar en brant yta snett)
  tryWallRun(n) {
    if (!this.swift || this.grounded || this.wallRun || this.state !== 'move' || this.carried || this.mount) return;
    if (Math.abs(n.y) > 0.35 || this.wallCool > 0) return;
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (hv < 3.5) return;
    const nx = n.x, nz = n.z, nl = Math.hypot(nx, nz) || 1;
    const wx = nx / nl, wz = nz / nl;
    // Rakt in i väggen räknas inte: farten längs väggen måste vara tydlig
    let dx = this.vel.x - wx * (this.vel.x * wx + this.vel.z * wz), dz = this.vel.z - wz * (this.vel.x * wx + this.vel.z * wz);
    const along = Math.hypot(dx, dz);
    if (along < 2.2) return;
    dx /= along; dz /= along;
    const side = Math.sign(dx * wz - dz * wx) || 1;
    this.wallRun = { n: new THREE.Vector3(wx, 0, wz), dir: new THREE.Vector3(dx, 0, dz), t: 0, side };
    this.jumping = false;
    this.facing = Math.atan2(dx, dz);
    this.onWallRun?.(true);
  }

  wallJump() {
    const w = this.wallRun;
    this.wallRun = null;
    this.wallCool = 0.25;
    this.vel.set(w.n.x * 6.5 + w.dir.x * 5.5, SWIFT_JUMP_V, w.n.z * 6.5 + w.dir.z * 5.5);
    this.facing = Math.atan2(this.vel.x, this.vel.z);
    this.jumping = true;
    this.jumpBuf = 0;
    this.onJump?.();
    this.onWallRun?.(false);
  }

  endWallRun() {
    if (!this.wallRun) return;
    this.wallRun = null;
    this.wallCool = 0.35;
    this.onWallRun?.(false);
  }

  stepWallRun(h) {
    const w = this.wallRun;
    w.t += h;
    // Lite uppåt i början, sedan sjunker han sakta
    const vy = 2.2 - 3.6 * (w.t / (WALLRUN_TIME + (this.wallRunBonus ?? 0)));
    this.vel.set(w.dir.x * WALLRUN_SPEED, vy, w.dir.z * WALLRUN_SPEED);
    this.collider.translate(_v.copy(this.vel).multiplyScalar(h));
    // Tryck mot väggen för att känna att den finns kvar
    this.collider.translate(_v.set(-w.n.x * 0.05, 0, -w.n.z * 0.05));
    let touching = false, floor = false;
    for (let k = 0; k < 2; k++) {
      const r = this.world.capsuleIntersect(this.collider);
      if (!r || r.depth < 1e-6) break;
      if (r.normal.y > FLOOR_NY) { floor = true; this.collider.translate(_w.set(0, r.depth / r.normal.y, 0)); continue; }
      if (r.normal.x * w.n.x + r.normal.z * w.n.z > 0.6) touching = true;
      else if (r.normal.x * w.dir.x + r.normal.z * w.dir.z < -0.6) { this.endWallRun(); return; } // en vägg rakt framför
      this.collider.translate(_w.copy(r.normal).multiplyScalar(r.depth));
    }
    if (floor) { this.endWallRun(); this.grounded = true; this.vel.y = 0; this.land(); return; }
    if (!touching || w.t > WALLRUN_TIME + (this.wallRunBonus ?? 0)) this.endWallRun();
  }

  step(h, tvx, tvz, accel, airControl, allowAuto, mag) {
    this.wallCool = Math.max(0, (this.wallCool ?? 0) - h);
    if (this.wallRun) { this.stepWallRun(h); return; }
    if (this.swimming) { this.stepSwim(h, tvx, tvz); return; }
    const wasGrounded = this.grounded;
    if (wasGrounded || airControl) {
      const a = wasGrounded ? (this.onIce === 'slick' && !this.heavy && this.state === 'move' ? Math.min(accel, SLICK_ACCEL) : accel) : AIR_ACCEL;
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
      // 0.15: i vattnet (tung, eller utan att simma) sjunker Cello långsamt
      const wet = this.waterY != null && this.feet.y < this.waterY - 0.4;
      this.vel.y = Math.max(this.vel.y - g * h * (wet ? 0.35 : 1), wet ? -5 : -MAX_FALL);
      this.airVy = this.vel.y;
    }
    // 0.14: uppvindar lyfter Cello (inte när han är tung)
    this.inDraft = 0;
    if (this.updrafts && !this.heavy && this.state !== 'dead') {
      const f = this.feet;
      for (const u of this.updrafts) {
        if (u.on === false) continue;
        if (Math.hypot(f.x - u.x, f.z - u.z) < u.r && f.y > u.y0 - 0.5 && f.y < u.y1) {
          const top = Math.min(1, (u.y1 - f.y) / 2.5);
          this.vel.y = Math.min(u.power, this.vel.y + (u.power * 3.2 * top + GRAVITY) * h);
          this.inDraft = 1;
          // Utan styrning bär vinden Cello in mot mitten av pelaren
          if (!(mag > 0.2)) {
            const k = Math.min(1, 3 * h);
            this.vel.x += ((u.x - f.x) * 1.6 - this.vel.x) * k;
            this.vel.z += ((u.z - f.z) * 1.6 - this.vel.z) * k;
          }
          if (this.grounded || wasGrounded) { this.grounded = false; this.jumping = true; }
        }
      }
    }

    this.collider.translate(_v.copy(this.vel).multiplyScalar(h));
    // Stormvinden knuffar Cello, men inte när han bär hammaren tungt
    if (!this.heavy && (this.wind.x || this.wind.z)) this.collider.translate(_v.set(this.wind.x * h, 0, this.wind.z * h));
    if (!this.heavy && (this.gust.x || this.gust.z)) this.collider.translate(_v.set(this.gust.x * h, 0, this.gust.z * h));
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

  // ---------- 0.15: vatten och simning ----------
  updateWater(dt, input) {
    const wy = this.waterAt ? this.waterAt(this.feet.x, this.feet.z) : null;
    this.waterY = wy;
    const depth = wy == null ? -1 : wy - this.feet.y;
    if (this.swimming) {
      if (wy == null || this.state === 'dead' || this.mount || this.carried || this.heavy) this.stopSwim();
      else if (this.swim.mode === 'surface' && depth < EXIT_DEPTH) this.stopSwim();
    } else if (wy != null && this.state !== 'dead' && !this.mount && !this.autoWalk) {
      if (this.canSwim && !this.heavy && depth > ENTER_DEPTH) this.startSwim(depth);
      else if (!this.canSwim && depth > 1.35 && !this.drowning) { this.drowning = true; this.onSplash?.(8); }
    }
    // Luften: under ytan räcker den en stund, sedan gör det ont
    const under = wy != null && this.feet.y + HEAD_Y < wy && this.state !== 'dead';
    this.headUnder = under;
    if (under && !this.breathPause && !(this.bubbleAt?.(this.feet))) {
      this.breath = Math.max(0, this.breath - dt);
      if (this.breath <= 0) {
        this.chokeT -= dt;
        if (this.chokeT <= 0) {
          this.chokeT = 1.4;
          this.hp = Math.max(0, this.hp - 1);
          this.invuln = Math.max(this.invuln, 0.3);
          this.onHurt?.(this.hp);
          this.onChoke?.();
          if (this.hp <= 0) this.setState('dead');
        }
      }
    } else {
      this.breath = Math.min(this.breathMax, this.breath + dt * (under ? 6 : 5));
      this.chokeT = 0.6;
    }
  }

  startSwim(depth) {
    const fall = -this.vel.y;
    this.swimming = true;
    this.swim = { mode: depth > 2.4 || fall > 7 ? 'dive' : 'surface' };
    this.vel.y *= 0.2;
    this.vel.x *= 0.6;
    this.vel.z *= 0.6;
    this.wallRun = null;
    this.shielding = false;
    this.setPrism(false);
    if (this.state === 'dodge') this.setState('move');
    this.grounded = false;
    this.jumping = false;
    this.onSplash?.(fall);
  }

  stopSwim() {
    if (!this.swimming) return;
    this.swimming = false;
    this.swim = null;
    this.model.body.rotation.x = Math.min(this.model.body.rotation.x, 0.4);
  }

  stepSwim(h, tvx, tvz) {
    let dx = tvx - this.vel.x, dz = tvz - this.vel.z;
    const dashing = this.state === 'dash' && this.dash;
    const dl = Math.hypot(dx, dz), md = (dashing ? 90 : SWIM_ACCEL) * h;
    if (dl > md) { dx *= md / dl; dz *= md / dl; }
    this.vel.x += dx;
    this.vel.z += dz;
    const s = this.swim, wy = this.waterY ?? this.feet.y + FLOAT_DEPTH;
    let tvy;
    if (dashing && this.dash.dir.y < -0.1 && s.mode === 'surface') s.mode = 'dive';
    if (dashing && s.mode === 'dive') {
      tvy = this.dash.dir.y * this.dash.speed;
      if (this.feet.y > wy - FLOAT_DEPTH - 0.05 && tvy > 0) { s.mode = 'surface'; this.onSurface?.(); }
    } else if (s.mode === 'surface') {
      const target = wy - FLOAT_DEPTH + Math.sin(this.anim.t * 2.4) * 0.04;
      tvy = Math.max(-4, Math.min(4, (target - this.feet.y) * 5));
    } else {
      s.diveT = Math.max(0, (s.diveT ?? 0) - h);
      tvy = this.swimUp ? SWIM_VY : this.swimDown ? -SWIM_VY : s.diveT > 0 ? -2.6 : BUOY;
      if (this.feet.y > wy - FLOAT_DEPTH - 0.05 && tvy > 0) { s.mode = 'surface'; this.onSurface?.(); }
    }
    this.vel.y += (tvy - this.vel.y) * Math.min(1, (dashing ? 14 : 6) * h);
    this.collider.translate(_v.copy(this.vel).multiplyScalar(h));
    if (this.current.x || this.current.z || this.current.y) this.collider.translate(_v.copy(this.current).multiplyScalar(h));
    // Ytan är taket när Cello simmar på den
    this.updateFeet();
    if (s.mode === 'surface' && this.feet.y > wy - FLOAT_DEPTH + 0.3) this.collider.translate(_w.set(0, wy - FLOAT_DEPTH + 0.3 - this.feet.y, 0));
    let pushed = false;
    for (let k = 0; k < 2; k++) {
      const r = this.world.capsuleIntersect(this.collider);
      if (!r || r.depth < 1e-6) break;
      const n = r.normal;
      if (n.y > FLOOR_NY) { this.collider.translate(_w.set(0, r.depth / n.y, 0)); if (this.vel.y < 0) this.vel.y = 0; continue; }
      this.collider.translate(_w.copy(n).multiplyScalar(r.depth));
      const vn = this.vel.dot(n);
      if (vn < 0) this.vel.addScaledVector(n, -vn);
      if (Math.abs(n.y) < 0.4) pushed = true;
    }
    this.wallPush = pushed ? this.wallPush + h : 0;
    this.grounded = false;
    this.jumping = false;
  }

  // Får Cello plats med fötterna vid at? (Lokis skugga)
  fitsAt(at) {
    const c = this.collider.clone();
    c.translate(_v.copy(at).sub(this.feet));
    c.translate(_w.set(0, 0.06, 0));
    const r = this.world.capsuleIntersect(c);
    return !r || r.depth < 0.08;
  }

  startDash() {
    const under = !!this.swimming && (this.swim.mode === 'dive' || this.headUnder);
    const dir = new THREE.Vector3();
    if (this.wish.lengthSq() > 0.01) dir.copy(this.wish);
    else dir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    dir.y = 0;
    dir.normalize();
    if (under) { dir.y = this.swimUp ? 0.75 : this.swimDown ? -0.75 : 0; dir.normalize(); }
    this.setPrism(false);
    this.shielding = false;
    this.setState('dash');
    this.dash = { dir, under, dur: under ? 0.55 : 0.3, speed: (under ? 15 : 13) * this.dashPower, hit: new Set() };
    this.facing = Math.atan2(dir.x, dir.z);
    this.onDash?.(under);
  }

  // Klättrar upp på en kant framför Cello, om den ligger lagom högt över vattnet
  climbOut() {
    if (!this.swimming || this.waterY == null) return false;
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing), wy = this.waterY;
    for (const d of [0.75, 1.05, 1.4]) {
      _ray.origin.set(this.feet.x + fx * d, wy + 2.0, this.feet.z + fz * d);
      _ray.direction.copy(_down);
      const hit = this.world.rayIntersect(_ray, 3.4);
      if (!hit) continue;
      hit.triangle.getNormal(_n);
      const top = _ray.origin.y - hit.distance;
      if (_n.y < 0.7 || top < wy - 0.45 || top > wy + 1.7) continue;
      _cap.copy(this.collider);
      this.collider.start.set(_ray.origin.x, top + R + 0.05, _ray.origin.z);
      this.collider.end.set(_ray.origin.x, top + HEIGHT - R + 0.05, _ray.origin.z);
      const r = this.world.capsuleIntersect(this.collider);
      this.collider.copy(_cap);
      if (r && r.depth > 0.06) continue;
      this.stopSwim();
      this.teleport(new THREE.Vector3(_ray.origin.x, top + 0.02, _ray.origin.z));
      this.grounded = true;
      this.anim.land = 0.5;
      this.onClimbOut?.();
      return true;
    }
    return false;
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
    this.tryWallRun(n);
    const vn = this.vel.dot(n);
    if (vn < 0 && !this.wallRun) this.vel.addScaledVector(n, -vn);
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
    // 0.15: aldrig under vattnet (då hamnar Cello där igen och igen)
    if (this.waterY != null && this.feet.y < this.waterY - 0.2) return;
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
    s.localToWorld(this.swordTip.set(0, this.sword.broken ? -0.48 : -1.0, 0));
  }

  // ---------- animation ----------
  animate(dt) {
    const a = this.anim, m = this.model, t = this.stateT;
    a.t += dt;
    const run = Math.min(1, this.speed / RUN_SPEED);
    a.run = approach(a.run, this.state === 'move' ? run : 0, 12, dt);
    // Väggspring räknas som att springa på marken (benen går), fast kroppen lutar mot väggen
    a.air = approach(a.air, this.grounded || this.wallRun ? 0 : 1, this.grounded || this.wallRun ? 18 : 8, dt);
    if (this.wallRun) a.run = approach(a.run, 1, 12, dt);
    a.land = Math.max(0, a.land - dt * 3.5);
    a.shield = approach(a.shield, this.shielding ? 1 : 0, 22, dt);
    a.prism = approach(a.prism ?? 0, this.prismUp ? 1 : 0, 16, dt);
    if ((this.grounded || this.wallRun) && this.state === 'move') {
      const before = Math.floor(a.phase / Math.PI);
      a.phase += dt * (this.mount ? 2 + this.speed * 0.75 : 2.2 + this.speed * (this.heavy ? 1.9 : 1.55));
      if (Math.floor(a.phase / Math.PI) !== before && this.speed > 1.2) {
        if (this.mount) this.onHoof?.(this.speed / RIDE_SPEED);
        else this.onStep?.(this.heavy ? -1 : this.speed / RUN_SPEED);
      }
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

    // Prisman hålls fram i höger hand
    if (a.prism > 0.01 && this.state === 'move') {
      const k = a.prism;
      P.armRx = P.armRx * (1 - k) - 1.45 * k;
      P.armRz = P.armRz * (1 - k) - 0.15 * k;
      P.elbowR = P.elbowR * (1 - k) - 0.3 * k;
      P.torsoY = P.torsoY * (1 - k) - 0.15 * k;
      P.headX = P.headX * (1 - k) + 0.05 * k;
    }

    // Flöjten (0.11): båda händerna vid munnen, huvudet gungar lite med tonerna
    if (this.playing && this.state === 'move') {
      const bob = (this.noteT ?? 0) > 0 ? Math.sin(a.t * 18) * 0.03 : 0;
      P.armLx = -1.25; P.armRx = -1.15;
      P.armLz = 0.5; P.armRz = -0.3;
      P.elbowL = -1.75; P.elbowR = -1.55;
      P.headX = -0.06 + bob; P.torsoY = 0.12; P.torsoX = -0.04;
      P.swordX = -0.2;
      rate = 14;
      this.noteT = Math.max(0, (this.noteT ?? 0) - dt);
    }

    // På Grumbles rygg: grensle över sadeln, händerna på hornen, framåtlutad i galopp
    if (this.mount && (this.state === 'move' || this.state === 'hurt')) {
      const gal = Math.min(1, this.speed / RIDE_SPEED);
      const bob = Math.abs(Math.sin(a.phase)) * 0.08 * gal * (1 - a.air);
      P.hipsY = this.mount.saddleY + bob;
      P.legL = P.legR = -0.55;
      P.kneeL = P.kneeR = 1.15;
      P.armLx = P.armRx = -0.95 - gal * 0.15;
      P.armLz = 0.18; P.armRz = -0.18;
      P.elbowL = P.elbowR = -0.75;
      P.torsoX = 0.12 + gal * 0.28 + a.air * 0.15;
      P.torsoY = 0;
      P.headX = -0.1 - gal * 0.15;
      P.swordX = -0.2;
      rate = 20;
    }

    if (this.carried && this.state === 'move') {
      P.armLx = P.armRx = -1.05;
      P.elbowL = P.elbowR = -0.85;
      P.armLz = 0.12; P.armRz = -0.12;
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
    } else if (this.state === 'dash') {
      // Treudden framåt i höger hand, kroppen sträckt
      rate = 30;
      const under = this.dash?.under;
      P.armRx = -1.55; P.armRz = 0.05; P.elbowR = -0.05;
      P.armLx = -0.6; P.armLz = -0.5; P.elbowL = -0.5;
      P.torsoX = under ? 0.1 : 0.25; P.torsoY = -0.15; P.headX = -0.1;
      P.legL = under ? 0.25 : -0.55; P.legR = under ? 0.1 : 0.45; P.kneeL = 0.3; P.kneeR = 0.2;
      P.bodyX = under ? 1.35 : 0; P.swordX = -0.2;
    } else if (this.state === 'itemget') {
      rate = 14;
      P.armLx = P.armRx = -2.85; P.armLz = -0.28; P.armRz = 0.28;
      P.torsoX = -0.05; P.torsoY = 0; P.headX = -0.25; P.legL = 0.08; P.legR = -0.08; P.hipsY = 0.88;
      P.elbowL = P.elbowR = -0.15; P.kneeL = P.kneeR = 0.04;
    } else if (this.state === 'hurt') {
      rate = 25;
      P.torsoX = -0.45; P.headX = 0.3; P.armLx = -0.6; P.armRx = -0.6; P.armLz = -0.7; P.armRz = 0.7;
      P.elbowL = P.elbowR = -0.6; P.kneeL = P.kneeR = 0.35;
    } else if (this.state === 'sleep') {
      // På rygg i sängen, armarna längs sidorna och huvudet på kudden
      rate = 40;
      P.bodyX = -Math.PI / 2; P.torsoX = 0; P.torsoY = 0; P.headX = -0.35;
      P.armLx = P.armRx = 0.05; P.armLz = -0.12; P.armRz = 0.12; P.elbowL = P.elbowR = -0.35;
      P.legL = 0.04; P.legR = -0.02; P.kneeL = 0.12; P.kneeR = 0.06; P.swordX = -0.2;
    } else if (this.state === 'dead') {
      rate = 6;
      P.bodyX = -1.45; P.armLz = -1.2; P.armRz = 1.2; P.torsoX = 0; P.legL = 0.1; P.legR = -0.1;
      P.elbowL = P.elbowR = -0.25; P.kneeL = 0.15; P.kneeR = 0.05;
    }

    // 0.16: glider på isen med armarna ute för balansen
    if ((this.glide || (this.onIce === 'slick' && this.speed > 2)) && this.state === 'move' && !this.swimming) {
      const wob = Math.sin(this.anim.t * 7) * 0.12;
      rate = 10;
      P.armLx = -0.3; P.armRx = -0.3; P.armLz = -1.1 + wob; P.armRz = 1.1 + wob;
      P.elbowL = P.elbowR = -0.2;
      if (this.glide) { P.legL = -0.25; P.legR = 0.3; P.kneeL = 0.35; P.kneeR = 0.25; P.torsoX = 0.15; P.bodyX = 0; }
    }

    // 0.15: simning. På ytan trampar han vatten med huvudet ovanför; under ytan ligger han framåt och tar simtag
    if (this.swimming && (this.state === 'move' || this.state === 'hurt')) {
      const dive = this.swim.mode === 'dive';
      const mv = Math.min(1, this.speed / 3.5);
      a.swimPh = (a.swimPh ?? 0) + dt * (2.6 + mv * 4.5);
      const sp = Math.sin(a.swimPh), cp = Math.cos(a.swimPh);
      rate = 10;
      if (dive) {
        const up = this.swimUp ? -0.5 : this.swimDown ? 0.35 : 0;
        P.bodyX = (0.55 + 0.8 * mv) + up;
        P.armLx = P.armRx = -2.6 + (sp * 0.5 + 0.5) * 1.9;
        P.armLz = -0.35 - (cp * 0.5 + 0.5) * 0.55; P.armRz = 0.35 + (cp * 0.5 + 0.5) * 0.55;
        P.elbowL = P.elbowR = -0.25 - 0.5 * Math.max(0, cp);
        P.legL = 0.15 + sp * 0.45; P.legR = 0.15 - sp * 0.45;
        P.kneeL = 0.25 + 0.4 * Math.max(0, sp); P.kneeR = 0.25 + 0.4 * Math.max(0, -sp);
        P.headX = -0.7 * (0.55 + 0.8 * mv); P.torsoX = 0; P.torsoY = 0;
      } else {
        P.bodyX = 0.18 + 0.32 * mv;
        P.armLx = P.armRx = -0.9 + sp * 0.55;
        P.armLz = -0.6 - cp * 0.35; P.armRz = 0.6 + cp * 0.35;
        P.elbowL = P.elbowR = -0.7 - 0.3 * cp;
        P.legL = 0.1 + sp * 0.35; P.legR = 0.1 - sp * 0.35;
        P.kneeL = P.kneeR = 0.5 + 0.3 * cp;
        P.headX = -0.2 - 0.3 * mv; P.torsoX = 0.05; P.torsoY = 0;
      }
      P.hipsY = 0.86;
      P.swordX = -0.2;
    }

    // 0.13: skulpturen har skölden fast på underarmen, så sköldposen blir en annan
    P.armLy = 0;
    if (m.sculpt && a.shield > 0.01) {
      const s = a.shield;
      // 0.20: som en riktig sköldbärare. Överarmen lyfts framåt och ut åt sidan med armbågen ute,
      // vriden så att underarmen går tvärs över bröstet i bröstets höjd. Näven hamnar framför bröstet
      // och skölden framför den. (Förut pekade underarmen rakt fram från magen.)
      P.armLx = P.armLx * (1 - s) - 0.8 * s;
      P.armLz = P.armLz * (1 - s) - 0.6 * s;
      P.armLy = 1.2 * s;
      P.elbowL = P.elbowL * (1 - s) - 1.9 * s;
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
    if (m.sculpt) ap(m.armL.rotation, 'y', P.armLy);
    ap(m.hips.position, 'y', P.hipsY);
    ap(m.torso.rotation, 'x', P.torsoX);
    ap(m.torso.rotation, 'y', P.torsoY);
    ap(m.torso.rotation, 'z', P.torsoZ);
    ap(m.head.rotation, 'x', P.headX);
    ap(m.sword.rotation, 'x', P.swordX, 30);
    ap(m.body.rotation, 'x', P.bodyX);
    // I sängen ligger han på madrassen (lite ovanför sängramen han står på)
    m.body.position.y = approach(m.body.position.y, this.state === 'sleep' ? 0.22 : 0, this.state === 'sleep' ? 40 : 8, dt);
    const sqk = a.land * a.land;
    ap(m.kneeL.rotation, 'x', P.kneeL + sqk * 0.9);
    ap(m.kneeR.rotation, 'x', P.kneeR + sqk * 0.9);
    ap(m.elbowL.rotation, 'x', P.elbowL);
    ap(m.elbowR.rotation, 'x', P.elbowR);
    // 0.17: skulpturens sköld är en fast del på underarmen; uppe framför bröstet när Cello skyddar sig
    m.updateShield?.(a.shield);
    // Tunikans fåll följer benen, och fladdrar ut lite när han springer
    m.skirt.rotation.x = approach(m.skirt.rotation.x, (m.legL.rotation.x + m.legR.rotation.x) * 0.25 - a.run * 0.08, 20, dt);
    // Benen isär när han rider
    const spread = this.mount ? 0.42 : 0;
    m.legL.rotation.z = approach(m.legL.rotation.z, -spread, 14, dt);
    m.legR.rotation.z = approach(m.legR.rotation.z, spread, 14, dt);
    if (this.mount) this.mount.animate(dt, this.speed, this.grounded, a.phase);
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
    if (this.swimming) a.air = 0;
    m.shield.position.set(-0.37 + 0.32 * s, 0.3 + 0.06 * s, -0.02 + 0.42 * s);
    m.shield.rotation.set(0, (Math.PI / 2) * s, 0.1 * (1 - s));

    const sq = a.land * a.land;
    m.body.scale.set(1 + sq * 0.12, 1 - sq * 0.22, 1 + sq * 0.12);

    // Svärdet eller hammaren i handen, hammaren på ryggen
    const inHand = this.hasHammer && (this.state === 'slam' || (this.heavy && this.state !== 'attack'));
    const holding = this.state === 'itemget';
    m.sword.visible = !inHand && !holding && !this.prismUp && !this.mount && !this.playing && this.state !== 'dash';
    if (m.tridentHand) {
      m.tridentHand.visible = this.state === 'dash';
      m.tridentHand.rotation.x = m.sculpt ? 0.1 : 0;
    }
    m.prism.visible = this.prismUp && this.state === 'move';
    if (m.prism.visible) {
      m.prism.rotation.y += dt * 2.5;
      const c = m.prism.userData.crystalMat.color;
      const k2 = 0.85 + Math.sin(a.t * 6) * 0.15;
      c.setRGB(k2, k2 * 0.9, k2 * 0.62);
    }
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

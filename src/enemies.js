// Asklingar: titanernas förkrympta tjänare, gjorda av aska och glöd.
// De patrullerar, upptäcker Cello, jagar, cirklar runt honom och anfaller en i taget.
import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { mergeRigid } from './geom.js';

const MAX_HP = 4;
const RADIUS = 0.55;
const SIGHT = 11, SIGHT_COS = Math.cos((72 * Math.PI) / 180), HEAR = 4;
const CHASE_SPEED = 3.4, PATROL_SPEED = 1.5, CIRCLE_SPEED = 1.8;
const ATTACK_RANGE = 2.3, HIT_RANGE = 2.6;
const RESPAWN_TIME = 25;
// 0.11: smartare asklingar
const FETCH_SPEED = 3.9, FLEE_SPEED = 4.0, ROCK_CD = 2.3, ROCK_GRAV = 14;

const _ray = new THREE.Ray(), _down = new THREE.Vector3(0, -1, 0), _v = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

function exclamation() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1206';
  g.fillRect(9, 2, 14, 40);
  g.fillRect(9, 46, 14, 14);
  g.fillStyle = '#ffcf4a';
  g.fillRect(12, 5, 8, 34);
  g.fillRect(12, 49, 8, 8);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, fog: false }));
  s.scale.set(0.35, 0.7, 1);
  s.renderOrder = 10;
  s.visible = false;
  return s;
}

// Askling: en hopkrupen varelse av sammanpressad aska, med glödande sprickor, långa armar
// med klor, en käke som öppnas när den vrålar och en grov klubba av sten.
function buildModel() {
  const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
  const M = {
    ash: lam(0x3a3531), dark: lam(0x23201e), bone: lam(0xb7aa92), stone: lam(0x5b5650),
    glow: new THREE.MeshBasicMaterial({ color: 0xff7426 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xffc457 }),
  };
  const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const T = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 5, sz = 1) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    if (sz !== 1) g.scale(1, 1, sz);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const crack = (w, h, x, y, z, rz = 0, ry = 0) => {
    const c = B(w, h, 0.02, M.glow, x, y, z);
    c.rotation.set(0, ry, rz);
    return c;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.85;
  body.add(hips);
  // Korta, krokiga ben med knän
  const leg = (side) => {
    const g = new THREE.Group();
    g.position.set(0.22 * side, 0, 0);
    g.add(T(0.16, 0.12, 0.46, M.ash, 0, -0.2, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    g.add(knee);
    knee.add(T(0.11, 0.09, 0.32, M.ash, 0, -0.14, 0));
    knee.add(B(0.26, 0.12, 0.36, M.dark, 0, -0.37, 0.08));
    for (const cx of [-0.08, 0, 0.08]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), M.bone);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(cx, -0.4, 0.3);
      knee.add(claw);
    }
    hips.add(g);
    return { g, knee };
  };
  hips.add(T(0.36, 0.3, 0.26, M.dark, 0, -0.04, 0, 6, 0.8));
  const torso = new THREE.Group();
  torso.rotation.x = 0.35;
  hips.add(torso);
  // Bröstkorg som en uppochnedvänd kil, puckelrygg och taggar längs ryggen
  torso.add(T(0.5, 0.36, 0.78, M.ash, 0, 0.42, 0, 6, 0.78));
  torso.add(T(0.36, 0.4, 0.34, M.dark, 0, 0.8, -0.16, 6, 0.8));
  for (let i = 0; i < 4; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07 - i * 0.008, 0.26 - i * 0.03, 4), M.dark);
    spike.position.set(0, 0.92 - i * 0.2, -0.3 + i * 0.03);
    spike.rotation.x = -0.9;
    torso.add(spike);
  }
  torso.add(crack(0.05, 0.44, -0.16, 0.45, 0.3, 0.25));
  torso.add(crack(0.04, 0.3, 0.14, 0.34, 0.3, -0.35));
  torso.add(crack(0.28, 0.04, 0.0, 0.62, 0.29, 0.1));
  torso.add(crack(0.04, 0.4, 0.08, 0.5, -0.3, 0.3, Math.PI));
  torso.add(crack(0.035, 0.3, -0.12, 0.38, -0.31, -0.4, Math.PI));
  // Huvudet: platt skalle, horn, glödande ögon och en käke som kan öppnas
  const head = new THREE.Group();
  head.position.set(0, 0.84, 0.22);
  head.add(T(0.26, 0.22, 0.34, M.ash, 0, 0.12, 0.04, 6, 0.95));
  head.add(B(0.46, 0.08, 0.2, M.dark, 0, 0.21, 0.18));
  head.add(B(0.1, 0.06, 0.03, M.eye, -0.11, 0.14, 0.29));
  head.add(B(0.1, 0.06, 0.03, M.eye, 0.11, 0.14, 0.29));
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.0, 0.08);
  jaw.add(B(0.4, 0.12, 0.3, M.dark, 0, -0.06, 0.08));
  for (const tx of [-0.13, -0.04, 0.05, 0.14]) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), M.bone);
    tooth.position.set(tx, 0.02, 0.21);
    jaw.add(tooth);
  }
  head.add(jaw);
  head.add(B(0.3, 0.03, 0.02, M.glow, 0, -0.01, 0.29));
  [-1, 1].forEach((s) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.36, 4), M.bone);
    horn.position.set(0.2 * s, 0.36, -0.05);
    horn.rotation.set(-0.6, 0, -0.45 * s);
    head.add(horn);
  });
  torso.add(head);
  // Långa armar med armbågar och klor
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(0.48 * side, 0.68, 0.02);
    g.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), M.dark), 0, 0, 0));
    g.add(T(0.12, 0.1, 0.46, M.ash, 0, -0.22, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.44;
    g.add(elbow);
    elbow.add(T(0.1, 0.13, 0.4, M.ash, 0, -0.18, 0));
    elbow.add(crack(0.03, 0.26, 0.06 * side, -0.16, 0.1, 0.2));
    elbow.add(B(0.2, 0.16, 0.2, M.dark, 0, -0.42, 0));
    for (const cx of [-0.07, 0.0, 0.07]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 4), M.bone);
      claw.rotation.x = Math.PI;
      claw.position.set(cx, -0.56, 0.06);
      elbow.add(claw);
    }
    torso.add(g);
    return { g, elbow };
  };
  const L = arm(-1), R = arm(1);
  const armL = L.g, armR = R.g;
  const club = new THREE.Group();
  club.position.y = -0.44;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), M.dark);
  handle.position.y = -0.4;
  const knob = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), M.stone);
  knob.position.y = -0.92;
  knob.scale.set(1, 1.3, 1);
  club.add(handle, knob);
  for (const [x, y, z] of [[0.2, -0.85, 0.1], [-0.18, -1.0, -0.05], [0.05, -1.12, 0.2]]) {
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), M.bone);
    st.position.set(x, y, z);
    st.lookAt(0, -0.92, 0);
    st.rotateX(-Math.PI / 2);
    club.add(st);
  }
  R.elbow.add(club);
  const lL = leg(-1), lR = leg(1);
  const mats = [M.ash, M.dark, M.bone, M.stone];
  return {
    root, body, hips, torso, head, jaw, armL, armR, elbowL: L.elbow, elbowR: R.elbow,
    legL: lL.g, legR: lR.g, kneeL: lL.knee, kneeR: lR.knee, club, mats, M,
  };
}

const place = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

// 0.11: klubban som flyger ur handen och ligger på marken
const CLUB_MATS = {
  dark: new THREE.MeshLambertMaterial({ color: 0x23201e, flatShading: true }),
  stone: new THREE.MeshLambertMaterial({ color: 0x5b5650, flatShading: true }),
};
function buildDroppedClub() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), CLUB_MATS.dark);
  handle.position.y = 0.45;
  const knob = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), CLUB_MATS.stone);
  knob.position.y = 0.95;
  knob.scale.set(1, 1.3, 1);
  g.add(handle, knob);
  return g;
}
const ROCK_GEO = new THREE.DodecahedronGeometry(0.17, 0);
const ROCK_MAT = new THREE.MeshLambertMaterial({ color: 0x6a645a, flatShading: true });

// Z-tecken som stiger upp från en sovande askling
let ZZZ_TEX = null;
function zzzSprite() {
  if (!ZZZ_TEX) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    g.font = 'bold 26px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 5;
    g.strokeStyle = '#120a06';
    g.strokeText('Z', 16, 17);
    g.fillStyle = '#ffd27a';
    g.fillText('Z', 16, 17);
    ZZZ_TEX = new THREE.CanvasTexture(c);
    ZZZ_TEX.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ZZZ_TEX, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(0.4, 0.4, 1);
  sp.visible = false;
  return sp;
}

class Askling {
  constructor(scene, octree, home, waypoints, index, opts = {}) {
    this.octree = octree;
    this.home = home.clone();
    this.waypoints = waypoints;
    this.index = index;
    this.kind = opts.kind || 'askling';
    this.room = opts.room || null;
    this.dormant = !!opts.dormant;
    this.respawn = opts.respawn ?? true;
    this.permaDead = false;
    this.flying = false;
    this.pos = home.clone();
    this.vel = new THREE.Vector3();
    this.push = new THREE.Vector3();
    this.capsule = new Capsule(new THREE.Vector3(), new THREE.Vector3(), 0.5);
    this.model = buildModel();
    scene.add(this.model.root);
    this.excl = exclamation();
    scene.add(this.excl);
    this.chestPos = new THREE.Vector3();
    if (this.kind === 'shield') this.addShield();
    if (this.kind === 'shade') this.makeShade();
    // 0.12: nekropolen
    if (this.kind === 'mummy') this.makeMummy();
    if (this.kind === 'wraith') this.makeWraith();
    this.dozing = !!opts.doze; // sover tills Cello kommer nära (mumierna i nischerna)
    this.lightT = 0;
    this.blindT = 0;
    // 0.11: dygnet, avväpning och flykt
    this.sleepy = false; // sover på dagen
    this.nocturnal = false; // finns bara på natten
    this.reserve = !!opts.reserve; // förstärkning som väntar tills någon kallar
    this.hasClub = true;
    this.drop = null;
    this.zzz = zzzSprite();
    scene.add(this.zzz);
    this.scene = scene;
    mergeRigid(this.model.root);
    this.reset();
  }

  // Skuggvarelse (pyramiden): svart och violett. Svärdet går rakt igenom tills solljus har bränt den.
  makeShade() {
    const M = this.model.M;
    const set = (mat, c) => mat?.color?.set(c);
    for (const mat of this.model.mats) set(mat, 0x1c1424);
    set(this.model.mats[1], 0x0c0812);
    set(this.model.mats[2], 0x3a2a4a);
    M.glow.color.set(0x9a5aff);
    M.eye.color.set(0xd8a0ff);
  }

  // Mumie: lindad i linne, med gröna ögon. Tålig men långsam.
  makeMummy() {
    const set = (mat, c) => mat?.color?.set(c);
    const [ash, dark, bone, stone] = this.model.mats;
    set(ash, 0xb8ab88);
    set(dark, 0x7a6c50);
    set(bone, 0x3a3226);
    set(stone, 0x4a6a60);
    this.model.M.glow.color.set(0x5ae0b0);
    this.model.M.eye.color.set(0x8affd8);
  }

  // Vålnad: genomskinlig och grön. Finns bara i de dödas värld.
  makeWraith() {
    for (const mat of this.model.mats) {
      mat.color.set(0x2a6a64);
      mat.transparent = true;
      mat.opacity = 0.62;
      mat.depthWrite = false;
    }
    this.model.mats[1].color.set(0x123a36);
    this.model.M.glow.color.set(0x9af8e4);
    this.model.M.eye.color.set(0xd8fff4);
  }

  // Solljuset från prisman (eller en stråle): bländar vanliga asklingar och bränner skuggvarelser
  get beamable() {
    return this.targetable;
  }
  onBeam(dt, g) {
    if (this.kind === 'shade') {
      const first = this.lightT <= 0;
      this.lightT = 3.2;
      if (first) {
        g.sfx.play('sizzle', { vol: 0.9 });
        g.fx.burst('spark', this.chest, 10, 0xffd070);
        if (this.state !== 'stagger' && this.state !== 'hurt') this.stagger({ director: g.enemies });
      }
    } else if (this.blindT <= 0) {
      this.blindT = 2.6;
      g.fx.burst('spark', this.chest, 8, 0xffe0a0);
      this.stagger({ director: g.enemies });
    }
  }

  // Sköldvakten bär en stor rund sköld som tar emot svärdshugg framifrån
  addShield() {
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const g = new THREE.Group();
    g.position.set(-0.08, -0.62, 0.34);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.09, 12), lam(0x5b3f2a));
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 4, 12), lam(0x6a6c74));
    g.add(rim);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12), lam(0x6a6c74));
    boss.position.z = 0.05;
    g.add(boss);
    const paint = lam(0x2f4a6a);
    for (const r of [0, Math.PI / 2]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.02), paint);
      b.position.z = 0.055;
      b.rotation.z = r + 0.4;
      g.add(b);
    }
    g.position.set(-0.08, -0.3, 0.3);
    this.model.elbowL.add(g);
    this.shieldMesh = g;
    this.model.mats.push(disc.material, rim.material);
  }

  reset() {
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.push.set(0, 0, 0);
    this.hp = this.kind === 'mummy' ? 5 : MAX_HP;
    this.facing = this.index * 1.7;
    this.state = 'patrol';
    this.st = 0;
    this.wp = 0;
    this.wait = 0.5 + this.index * 0.4;
    this.cooldown = 0.6;
    this.flash = 0;
    this.exclT = 0;
    this.lostT = 0;
    this.seeT = 0;
    this.seen = false;
    this.stuckT = 0;
    this.strafe = this.index % 2 ? 1 : -1;
    this.hitDone = false;
    this.deadT = 0;
    this.anim = { phase: 0, sink: 0, rise: 1 };
    this.hasShield = this.kind === 'shield';
    if (this.shieldMesh) this.shieldMesh.visible = this.hasShield;
    this.model.root.visible = true;
    this.model.root.rotation.set(0, this.facing, 0);
    this.model.body.rotation.set(0, 0, 0);
    this.model.body.position.y = 0;
    this.snapToGround(true);
    this.model.root.position.copy(this.pos);
    // 0.11: klubban tillbaka i handen, rädslan glömd
    this.hasClub = true;
    this.model.club.visible = true;
    this.clearDrop();
    this.fleeTried = false;
    this.rockCd = 0;
    this.fetchT = 0;
    this.holdRock = false;
    if (this.zzz) this.zzz.visible = false;
    if (this.dozing && !this.dormant) this.state = 'sleep';
    if (this.dormant) this.sleep();
    if (this.reserve && !this.called) {
      this.state = 'dead';
      this.deadT = -1e9;
      this.permaDead = true;
      this.model.root.visible = false;
    }
  }

  clearDrop() {
    if (this.drop) {
      this.drop.mesh.removeFromParent();
      this.drop = null;
    }
  }

  // Dag eller natt: sover, gräver ner sig eller vaknar (anropas av Enemies)
  applyTime(env, instant = false) {
    if (this.group !== 'world' || this.state === 'dead' || this.state === 'dormant') return;
    const night = !!env?.night;
    if (this.nocturnal) {
      if (!night && this.state === 'spawn') { this.bury(); return; }
      if (night && this.state === 'buried') {
        this.model.root.visible = true;
        this.setState('spawn');
      } else if (!night && (this.state === 'patrol' || this.state === 'return' || (instant && this.state !== 'buried'))) {
        if (instant) this.bury();
        else this.setState('burrow');
      }
    }
    if (this.sleepy) {
      if (night && this.state === 'sleep') this.setState('patrol');
      else if (!night && instant && this.state === 'patrol') this.setState('sleep');
      else if (!night && this.state === 'patrol') this.setState('return');
    }
  }

  bury() {
    this.state = 'buried';
    this.st = 0;
    this.model.root.visible = false;
    this.exclT = 0;
    if (this.zzz) this.zzz.visible = false;
  }

  // Sover osynlig tills ett fällrum väcker den
  sleep() {
    this.state = 'dormant';
    this.model.root.visible = false;
    this.excl.visible = false;
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.dormant = false;
    this.setState('spawn');
    this.model.root.visible = true;
  }

  get targetable() {
    return this.state !== 'dead' && this.state !== 'spawn' && this.state !== 'dormant' && this.state !== 'buried' && this.state !== 'burrow' && !this.realmHidden;
  }

  get alive() {
    return this.state !== 'dead';
  }

  get chest() {
    return this.chestPos.set(this.pos.x, this.pos.y + 1.25, this.pos.z);
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  // --- rörelse ---
  groundAt(x, y, z) {
    _ray.origin.set(x, y + 1.6, z);
    _ray.direction.copy(_down);
    const hit = this.octree.rayIntersect(_ray, 3);
    if (!hit || hit.distance > 1.6 + 1.3) return null;
    return hit.position.y;
  }

  snapToGround(instant) {
    const gy = this.groundAt(this.pos.x, this.pos.y, this.pos.z);
    if (gy !== null) this.pos.y = instant ? gy : approach(this.pos.y, gy, 18, 1 / 60);
  }

  move(dt, tvx, tvz, accel) {
    this.vel.x = approach(this.vel.x, tvx, accel, dt);
    this.vel.z = approach(this.vel.z, tvz, accel, dt);
    this.push.multiplyScalar(Math.exp(-6 * dt));
    const dx = (this.vel.x + this.push.x) * dt, dz = (this.vel.z + this.push.z) * dt;
    if (Math.abs(dx) + Math.abs(dz) < 1e-5) return 1;
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    if (this.bounds && (nx < this.bounds.x0 + 0.6 || nx > this.bounds.x1 - 0.6 || nz < this.bounds.z0 + 0.6 || nz > this.bounds.z1 - 0.6)) {
      this.vel.set(0, 0, 0);
      this.push.set(0, 0, 0);
      return 0;
    }
    if (this.isSafe?.(nx, nz)) {
      this.vel.set(0, 0, 0);
      this.push.set(0, 0, 0);
      return 0;
    }
    // Gå aldrig över en kant eller upp på något högt
    const gy = this.groundAt(nx + Math.sign(dx) * 0.3, this.pos.y, nz + Math.sign(dz) * 0.3);
    if (gy === null || gy - this.pos.y > 0.45) {
      this.vel.set(0, 0, 0);
      this.push.set(0, 0, 0);
      return 0;
    }
    const before = this.pos.clone();
    this.pos.x = nx;
    this.pos.z = nz;
    this.capsule.start.set(this.pos.x, this.pos.y + 0.6, this.pos.z);
    this.capsule.end.set(this.pos.x, this.pos.y + 1.4, this.pos.z);
    const r = this.octree.capsuleIntersect(this.capsule);
    if (r && r.depth > 1e-6 && r.normal.y < 0.55) {
      _v.set(r.normal.x, 0, r.normal.z);
      if (_v.lengthSq() > 1e-6) {
        _v.normalize();
        this.pos.addScaledVector(_v, r.depth / Math.max(0.3, Math.hypot(r.normal.x, r.normal.z)));
      }
    }
    const g2 = this.groundAt(this.pos.x, this.pos.y, this.pos.z);
    if (g2 !== null) this.pos.y = approach(this.pos.y, g2, 18, dt);
    const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    return moved / Math.max(1e-5, Math.hypot(dx, dz));
  }

  faceTowards(x, z, rate, dt) {
    const target = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.facing += wrap(target - this.facing) * (1 - Math.exp(-rate * dt));
  }

  canSee(player, env = null) {
    const dx = player.feet.x - this.pos.x, dz = player.feet.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (Math.abs(player.feet.y - this.pos.y) > 6) return false;
    // 0.11: på natten ser de kortare, men en tänd lykta syns långt; dimma döljer, regn dränker stegen
    let sight = SIGHT, hear = HEAR;
    if (env?.night) sight *= env.lantern ? 1.3 : 0.7;
    if (env?.fog) sight *= 1 - 0.45 * env.fog;
    if (env?.rain) hear *= 0.75;
    if (dist < hear) return true;
    if (dist > sight) return false;
    const cos = (dx * Math.sin(this.facing) + dz * Math.cos(this.facing)) / dist;
    if (cos < SIGHT_COS) return false;
    _ray.origin.set(this.pos.x, this.pos.y + 1.5, this.pos.z);
    _v.set(player.feet.x, player.feet.y + 1.2, player.feet.z).sub(_ray.origin);
    const len = _v.length();
    _ray.direction.copy(_v.normalize());
    const hit = this.octree.rayIntersect(_ray, len);
    return !hit || hit.distance > len - 0.4;
  }

  // --- skada ---
  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    if (this.kind === 'shade' && this.lightT <= 0 && !w.unblockable) {
      this.cooldown = Math.min(this.cooldown, 0.3);
      return 'immune';
    }
    if (this.hasShield && !w.unblockable) {
      const a = Math.atan2(from.x - this.pos.x, from.z - this.pos.z);
      if (Math.abs(wrap(a - this.facing)) < 1.3 && this.state !== 'stagger') {
        this.cooldown = Math.min(this.cooldown, 0.25);
        return 'blocked';
      }
    }
    // Smyganfall (0.11): en sovande askling tar dubbel skada
    const wasAsleep = this.state === 'sleep';
    if (wasAsleep) {
      dmg *= 2;
      w.director.onSneak?.(this);
    }
    const inWindup = this.state === 'windup';
    this.hp -= dmg;
    this.flash = 0.14;
    _v.set(this.pos.x - from.x, 0, this.pos.z - from.z);
    if (_v.lengthSq() > 1e-6) _v.normalize();
    this.push.copy(_v).multiplyScalar(dmg > 1 ? 7.5 : 5.5);
    w.director.release(this);
    if (this.hp <= 0) {
      this.setState('dead');
      w.sfx.play('edie');
      w.fx.burst('ash', this.chest, 26);
      w.fx.drop?.(this.pos.clone(), this.kind === 'shield' ? 'shield' : 'askling', w.player);
      this.exclT = 0;
      if (!this.respawn) this.permaDead = true;
      w.director.onDeath?.(this, w);
      return 'killed';
    }
    w.sfx.play('ehurt');
    // Avväpning (0.11): ett hugg mitt i uppsvingen, eller ett hårt slag, slår klubban ur handen
    if (this.hasClub && !this.reserveNoDisarm && (inWindup || (dmg >= 2 && Math.random() < 0.5)) && this.kind !== 'shade') {
      this.disarm(from, w);
      return 'hit';
    }
    if (this.state === 'flee' || this.state === 'howl') {
      this.flash = 0.14;
      return 'hit';
    }
    this.setState(wasAsleep ? 'stagger' : 'hurt');
    if (wasAsleep) this.exclT = 0.9;
    return 'hit';
  }

  // Klubban flyger ur handen och landar en bit bort
  disarm(from, w) {
    this.hasClub = false;
    this.model.club.visible = false;
    this.clearDrop();
    const mesh = buildDroppedClub();
    (this.model.root.parent ?? this.scene).add(mesh);
    const away = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - 0.5) * 1.4;
    const sp = 4.5 + Math.random() * 1.5;
    this.drop = {
      mesh, pos: new THREE.Vector3(this.pos.x, this.pos.y + 1.3, this.pos.z),
      vel: new THREE.Vector3(Math.sin(away) * sp, 5.2, Math.cos(away) * sp), spin: 9 + Math.random() * 6, landed: false, t: 0, owner: this,
    };
    w.sfx.play('clang');
    w.fx.burst('spark', this.chest, 10, 0xffe2a0);
    w.director.onDisarm?.(this);
    this.setState('disarmed');
  }

  // Klubban på marken: flyger, landar, och kan krossas av Cellos svärd
  updateDrop(dt) {
    const d = this.drop;
    if (!d) return;
    d.t += dt;
    if (!d.landed) {
      d.vel.y -= 16 * dt;
      d.pos.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin * dt;
      const gy = this.groundAt(d.pos.x, d.pos.y + 0.5, d.pos.z);
      if (gy !== null && d.pos.y <= gy + 0.12 && d.vel.y < 0) {
        d.pos.y = gy + 0.1;
        d.landed = true;
        d.mesh.rotation.set(Math.PI / 2, Math.random() * 6, 0);
      } else if (d.pos.y < this.pos.y - 12) {
        this.clearDrop(); // föll över kanten
        return;
      }
    }
    d.mesh.position.copy(d.pos);
  }

  // Hammarslaget: krossar skölden, eller slår hårt
  slamHit(point, w) {
    if (!this.targetable) return;
    const d = Math.hypot(point.x - this.pos.x, point.z - this.pos.z);
    if (d > (w.slamR ?? 3.3) || Math.abs(point.y - this.pos.y) > 2) return;
    if (this.kind === 'shade' && this.lightT <= 0) {
      this.stagger(w);
      return;
    }
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldMesh.visible = false;
      w.sfx.play('shieldbreak');
      w.fx.burst('spark', this.chest, 16, 0xffd08a);
      w.fx.burst('ash', this.chest, 10);
      this.stagger(w);
      this.st = -0.6;
      return;
    }
    const res = this.hurt(w.slamDmg ?? 3, point, { ...w, unblockable: true });
    if (res === 'hit') this.push.multiplyScalar(1.6);
  }

  stagger(w) {
    w.director.release(this);
    this.push.set(-Math.sin(this.facing), 0, -Math.cos(this.facing)).multiplyScalar(4);
    this.setState('stagger');
  }

  // --- AI ---
  update(dt, w) {
    const { player, director } = w;
    const env = director.env;
    // Vålnader finns bara i de dödas värld: bland de levande syns de inte och gör ingenting
    if (this.kind === 'wraith') {
      const hide = !env?.dead && this.state !== 'dead';
      if (hide !== this.realmHidden) {
        this.realmHidden = hide;
        if (!hide && this.state !== 'dormant') w.fx.burst('ash', this.chest, 10);
      }
      if (hide) {
        this.model.root.visible = false;
        this.excl.visible = false;
        if (this.zzz) this.zzz.visible = false;
        director.release(this);
        return;
      }
      if (this.state !== 'dormant' && this.state !== 'dead') this.model.root.visible = true;
    }
    this.st += dt;
    this.updateDrop(dt);
    this.lightT = Math.max(0, this.lightT - dt);
    this.blindT = Math.max(0, this.blindT - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.exclT = Math.max(0, this.exclT - dt);
    const dx = player.feet.x - this.pos.x, dz = player.feet.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const playerOk = player.state !== 'dead';
    let tvx = 0, tvz = 0, accel = 8;

    const look = () => {
      this.seeT -= dt;
      if (this.seeT <= 0) {
        this.seeT = 0.2;
        this.seen = playerOk && this.canSee(player, env);
      }
      return this.seen;
    };
    // Regn gör askan tung: de rör sig långsammare
    const slow = (env?.rain ? 1 - 0.18 * Math.min(1, env.rain) : 1) * (this.kind === 'mummy' ? 0.8 : 1);
    const toward = (x, z, speed) => {
      speed *= slow;
      const ddx = x - this.pos.x, ddz = z - this.pos.z, d = Math.hypot(ddx, ddz) || 1;
      tvx = (ddx / d) * speed;
      tvz = (ddz / d) * speed;
      this.faceTowards(x, z, 8, dt);
    };

    switch (this.state) {
      case 'patrol': {
        if (this.wait > 0) this.wait -= dt;
        else {
          const p = this.waypoints[this.wp];
          if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 0.6) {
            this.wp = (this.wp + 1) % this.waypoints.length;
            this.wait = 1 + Math.random() * 1.6;
          } else toward(p.x, p.z, PATROL_SPEED);
        }
        if (look()) this.alert(w);
        break;
      }
      case 'alert':
        this.faceTowards(player.feet.x, player.feet.z, 10, dt);
        if (this.st > 0.6) this.setState('chase');
        break;
      case 'return': {
        toward(this.home.x, this.home.z, 2.2);
        if (Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 0.8) {
          if (this.sleepy && !env?.night) this.setState('sleep');
          else if (this.nocturnal && !env?.night) this.setState('burrow');
          else {
            this.setState('patrol');
            this.wait = 1;
          }
        }
        if (this.state === 'return' && look()) this.alert(w);
        break;
      }
      // ---------- 0.11: sömn, natt, avväpning och flykt ----------
      case 'sleep': {
        // Vaknar om Cello kommer för nära (springer han hörs han längre)
        const sp = Math.hypot(player.vel.x, player.vel.z);
        const wake = sp > 4 ? 3.4 : sp > 1.5 ? 2.4 : 1.4;
        if (playerOk && dist < wake && Math.abs(player.feet.y - this.pos.y) < 2) {
          this.alert(w);
          this.st = -0.5; // yrvaken en stund
        }
        break;
      }
      case 'buried':
        return;
      case 'burrow':
        if (this.st > 1.0) this.bury();
        break;
      case 'disarmed':
        if (this.st > 0.7) this.chooseWeapon(w, dist);
        break;
      case 'fetch': {
        const d = this.drop;
        this.fetchT += dt;
        if (!d) { this.setState('rocks'); break; }
        const pd = Math.hypot(player.feet.x - d.pos.x, player.feet.z - d.pos.z);
        if ((d.landed && pd < 2.4) || this.fetchT > 7) { this.setState('rocks'); break; }
        if (!d.landed) { this.faceTowards(d.pos.x, d.pos.z, 8, dt); break; }
        if (Math.hypot(d.pos.x - this.pos.x, d.pos.z - this.pos.z) < 0.9) { this.setState('pickup'); break; }
        toward(d.pos.x, d.pos.z, FETCH_SPEED);
        accel = 7;
        break;
      }
      case 'pickup':
        if (!this.drop) { this.setState('rocks'); break; }
        if (Math.hypot(player.feet.x - this.drop.pos.x, player.feet.z - this.drop.pos.z) < 1.6) { this.setState('rocks'); break; }
        if (this.st > 0.55) {
          this.clearDrop();
          this.hasClub = true;
          this.model.club.visible = true;
          w.sfx.play('growl', { vol: 0.7 });
          this.cooldown = 0.8;
          this.setState('chase');
        }
        break;
      case 'rocks': {
        // Håller avstånd och kastar sten; går tillbaka efter klubban om Cello lämnar den
        this.faceTowards(player.feet.x, player.feet.z, 8, dt);
        const ux = dx / (dist || 1), uz = dz / (dist || 1);
        const radial = dist < 5.5 ? -FLEE_SPEED * 0.75 : dist > 10 ? CHASE_SPEED * 0.8 : 0;
        tvx = ux * radial * slow - uz * this.strafe * 1.2;
        tvz = uz * radial * slow + ux * this.strafe * 1.2;
        if (Math.random() < dt * 0.3) this.strafe *= -1;
        this.rockCd -= dt;
        this.lostT = dist > 22 || !playerOk ? this.lostT + dt : 0;
        if (this.lostT > 3) { this.setState('return'); break; }
        if (this.rockCd <= 0 && dist < 16 && playerOk) { this.setState('throw'); this.holdRock = true; break; }
        if (this.st > 3 && this.drop?.landed) {
          const pd = Math.hypot(player.feet.x - this.drop.pos.x, player.feet.z - this.drop.pos.z);
          const ed = Math.hypot(this.drop.pos.x - this.pos.x, this.drop.pos.z - this.pos.z);
          if (pd > 5 && ed < 14) { this.fetchT = 0; this.setState('fetch'); }
          else this.st = 0;
        }
        break;
      }
      case 'throw':
        this.faceTowards(player.feet.x, player.feet.z, 12, dt);
        if (this.st > 0.55) {
          this.holdRock = false;
          director.throwRock(this, player);
          w.sfx.play('swing', { vol: 0.6 });
          this.rockCd = ROCK_CD + Math.random() * 0.8;
          this.setState('rocks');
        }
        break;
      case 'flee': {
        // Springer bort från Cello för att hämta förstärkning
        const ax = -dx / (dist || 1), az = -dz / (dist || 1);
        const tx = this.pos.x + ax * 4 + Math.cos(this.st * 1.3) * 1.2, tz = this.pos.z + az * 4 + Math.sin(this.st * 1.3) * 1.2;
        toward(tx, tz, FLEE_SPEED);
        accel = 9;
        if (dist > 17 || this.st > 4.5) this.setState('howl');
        break;
      }
      case 'howl':
        this.faceTowards(player.feet.x, player.feet.z, 6, dt);
        if (this.st > 0.05 && !this.howled) {
          this.howled = true;
          w.sfx.play('roar', { vol: 0.55 });
          w.sfx.play('growl', { vol: 1 });
        }
        if (this.st > 1.3) {
          this.howled = false;
          director.reinforce(this, w);
          this.cooldown = 0.5;
          this.setState('chase');
        }
        break;
      case 'chase':
      case 'circle': {
        const farHome = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 26;
        this.lostT = dist > 20 || !playerOk ? this.lostT + dt : 0;
        if (this.lostT > 2.5 || farHome) {
          director.release(this);
          this.setState('return');
          break;
        }
        if (!this.hasClub) { this.setState('rocks'); break; }
        const mayAttack = this.cooldown <= 0 && director.canAttack(this);
        if (this.state === 'chase') {
          if (mayAttack && dist < ATTACK_RANGE) {
            director.take(this);
            this.setState('windup');
            w.sfx.play('growl');
            break;
          }
          if (!mayAttack && dist < 5) { this.setState('circle'); break; }
          toward(player.feet.x, player.feet.z, CHASE_SPEED);
          accel = 6;
        } else {
          if (mayAttack || dist > 7) { this.setState('chase'); break; }
          // Cirkla runt Cello på avstånd och vänta på sin tur
          const ux = dx / (dist || 1), uz = dz / (dist || 1);
          const radial = (dist - 4.2) * 1.2;
          tvx = -uz * this.strafe * CIRCLE_SPEED + ux * radial;
          tvz = ux * this.strafe * CIRCLE_SPEED + uz * radial;
          this.faceTowards(player.feet.x, player.feet.z, 8, dt);
          if (Math.random() < dt * 0.25) this.strafe *= -1;
        }
        break;
      }
      case 'windup':
        if (this.st < 0.42) this.faceTowards(player.feet.x, player.feet.z, 9, dt);
        if (this.st > 0.66) {
          this.setState('strike');
          this.hitDone = false;
        }
        break;
      case 'strike': {
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        tvx = fx * 3;
        tvz = fz * 3;
        accel = 20;
        if (!this.hitDone && this.st > 0.05) {
          this.hitDone = true;
          w.sfx.play('swing', { vol: 0.8 });
          const cos = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
          if (playerOk && dist < HIT_RANGE && cos > 0.45 && Math.abs(player.feet.y - this.pos.y) < 1.6) {
            const res = player.takeHit(1, this.pos);
            if (res === 'blocked') {
              w.onBlocked(this);
              this.stagger(w);
              break;
            }
            if (res === 'hit') w.onPlayerHit(this);
          }
        }
        if (this.st > 0.2) this.setState('recover');
        break;
      }
      case 'recover':
        if (this.st > 0.85) {
          director.release(this);
          this.cooldown = 1.2 + Math.random() * 1.0;
          this.setState(dist < 5 ? 'circle' : 'chase');
        }
        break;
      case 'stagger':
        if (this.st > 0.7) {
          this.cooldown = 1.0;
          this.setState('chase');
        }
        break;
      case 'hurt':
        if (this.st > 0.38) {
          this.cooldown = Math.max(this.cooldown, 0.5);
          this.setState('chase');
        }
        break;
      case 'dormant':
        return;
      case 'dead':
        this.deadT += dt;
        if (this.st > 1.5) this.model.root.visible = false;
        if (this.respawn && this.deadT > RESPAWN_TIME && dist > 14) {
          this.reset();
          this.setState('spawn');
          this.model.root.visible = true;
          w.fx.burst('ash', this.chest, 18);
        }
        break;
      case 'spawn':
        // Förstärkningar går direkt till anfall
        if (this.st > 0.9) {
          if (this.called) { this.exclT = 0.9; this.setState('chase'); } else this.setState('patrol');
        }
        break;
      default:
        break;
    }

    if (this.state !== 'dead' && this.state !== 'spawn' && this.state !== 'sleep' && this.state !== 'burrow') {
      const ratio = this.move(dt, tvx, tvz, accel);
      // Fastnat bakom en pelare: ta ett steg åt sidan en stund
      if (Math.hypot(tvx, tvz) > 1 && ratio < 0.3) {
        this.stuckT += dt;
        if (this.stuckT > 0.4) { this.strafe *= -1; this.stuckT = -0.6; }
      } else if (this.stuckT > 0) this.stuckT = 0;
      if (this.stuckT < 0) {
        this.stuckT = Math.min(0, this.stuckT + dt);
        const s = this.strafe;
        this.move(dt, Math.cos(this.facing) * 2 * s, -Math.sin(this.facing) * 2 * s, 10);
      }
    }
    this.animate(dt);
  }

  alert(w) {
    this.setState('alert');
    this.exclT = 0.9;
    w.sfx.play('alert');
  }

  // Utan klubba: hämta den om det går, annars sten
  chooseWeapon(w, dist) {
    const d = this.drop, P = w.player;
    if (d) {
      const pd = Math.hypot(P.feet.x - d.pos.x, P.feet.z - d.pos.z);
      const ed = Math.hypot(d.pos.x - this.pos.x, d.pos.z - this.pos.z);
      if (pd > 2.4 && ed < 14) { this.fetchT = 0; this.setState('fetch'); return; }
    }
    this.rockCd = 0.6;
    this.setState('rocks');
  }

  flee() {
    this.fleeTried = true;
    this.setState('flee');
    this.exclT = 0;
  }

  animate(dt) {
    const m = this.model, a = this.anim, st = this.st;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    a.phase += dt * (1.5 + speed * 2.1);
    const walk = Math.min(1, speed / 2.5);
    const sw = Math.sin(a.phase) * 0.6 * walk;
    let armR = -sw * 0.6, armL = sw * 0.6, torsoX = 0.35, torsoY = 0, headX = 0, armRz = 0.1;
    if (this.state === 'windup') {
      const k = Math.min(1, st / 0.45);
      armR = -2.8 * k;
      torsoX = 0.35 - 0.45 * k;
      torsoY = 0.3 * k;
      headX = -0.2 * k;
    } else if (this.state === 'strike') {
      armR = -0.35;
      torsoX = 0.85;
      torsoY = -0.2;
    } else if (this.state === 'recover') {
      armR = -0.3;
      torsoX = 0.7 + Math.sin(st * 8) * 0.04;
    } else if (this.state === 'hurt' || this.state === 'stagger') {
      torsoX = -0.25;
      headX = -0.3;
      armR = 0.4;
      armL = 0.4;
    } else if (this.state === 'alert') {
      torsoX = -0.05;
      armR = -0.9;
      armL = -0.9;
      headX = -0.25;
    } else if (this.state === 'throw') {
      const k = Math.min(1, st / 0.5);
      armR = -2.6 * k;
      torsoX = 0.35 - 0.4 * k;
      torsoY = 0.45 * k;
    } else if (this.state === 'pickup' || this.state === 'disarmed') {
      torsoX = this.state === 'pickup' ? 1.1 : -0.3;
      armR = this.state === 'pickup' ? -0.2 : 0.5;
      armL = this.state === 'pickup' ? -0.2 : 0.5;
      headX = this.state === 'pickup' ? 0.3 : -0.3;
    } else if (this.state === 'howl') {
      torsoX = -0.45;
      headX = -0.6;
      armR = -2.4;
      armL = -2.4;
    } else if (this.state === 'flee') {
      torsoX = 0.6;
      armR = 0.7;
      armL = 0.7;
    }
    const r = this.state === 'windup' || this.state === 'strike' ? 30 : 12;
    m.legL.rotation.x = -sw - 0.15;
    m.legR.rotation.x = sw - 0.15;
    const cp = Math.cos(a.phase) * walk;
    m.kneeL.rotation.x = 0.3 + Math.max(0, cp) * 0.8;
    m.kneeR.rotation.x = 0.3 + Math.max(0, -cp) * 0.8;
    // Armbågarna: hängande och böjda, raka i slaget; käken öppnas när den vrålar eller tar sats
    const elbowR = this.state === 'windup' ? -0.6 : this.state === 'strike' ? -0.1 : -0.35 - walk * 0.25;
    const elbowL = this.hasShield ? -1.2 : -0.35 - walk * 0.3;
    m.elbowR.rotation.x = approach(m.elbowR.rotation.x, elbowR, r, dt);
    m.elbowL.rotation.x = approach(m.elbowL.rotation.x, elbowL, 12, dt);
    const jaw = this.state === 'alert' || this.state === 'windup' || this.state === 'howl' ? 0.5 : this.state === 'hurt' || this.state === 'stagger' || this.state === 'flee' ? 0.3 : 0.05 + Math.sin(a.phase * 0.7) * 0.03;
    m.jaw.rotation.x = approach(m.jaw.rotation.x, jaw, 14, dt);
    m.armR.rotation.x = approach(m.armR.rotation.x, armR, r, dt);
    m.armR.rotation.z = approach(m.armR.rotation.z, armRz, r, dt);
    m.armL.rotation.x = approach(m.armL.rotation.x, armL, 12, dt);
    m.torso.rotation.x = approach(m.torso.rotation.x, torsoX, r, dt);
    m.torso.rotation.y = approach(m.torso.rotation.y, torsoY, r, dt);
    m.head.rotation.x = approach(m.head.rotation.x, headX, 10, dt);
    m.hips.position.y = 0.85 + Math.abs(Math.sin(a.phase)) * 0.05 * walk;

    if (this.state === 'dead') {
      m.body.rotation.x = approach(m.body.rotation.x, -1.45, 6, dt);
      m.body.position.y = -Math.max(0, st - 0.7) * 0.9;
      m.body.rotation.z = 0;
    } else if (this.state === 'spawn') {
      m.body.position.y = -1.8 * (1 - Math.min(1, st / 0.8));
      m.body.rotation.x = 0;
      m.body.rotation.z = 0;
    } else if (this.state === 'burrow') {
      m.body.position.y = -1.8 * Math.min(1, st / 0.9);
      m.body.rotation.z = 0;
    } else if (this.state === 'sleep') {
      // Hopkrupen på sidan i askan, och andas långsamt
      m.body.rotation.z = approach(m.body.rotation.z, 1.35, 5, dt);
      m.body.position.y = approach(m.body.position.y, 0.3, 5, dt);
      m.torso.scale.setScalar(1 + Math.sin(this.st * 2.2) * 0.03);
      m.body.rotation.x = 0;
    } else {
      m.body.position.y = 0;
      m.body.rotation.x = 0;
      m.body.rotation.z = approach(m.body.rotation.z, 0, 8, dt);
      m.torso.scale.setScalar(1);
    }
    // Zzz över de som sover
    if (this.zzz) {
      const z = this.zzz;
      z.visible = this.state === 'sleep' && m.root.visible;
      if (z.visible) {
        const k = (this.st * 0.6) % 1;
        z.position.set(this.pos.x + 0.3 + k * 0.4, this.pos.y + 1.0 + k * 1.1, this.pos.z);
        z.material.opacity = Math.sin(k * Math.PI);
        z.scale.setScalar(0.25 + k * 0.25);
      }
    }

    const flashing = this.flash > 0;
    const glow = this.state === 'windup' ? 1 : 0.55 + Math.sin(a.phase * 0.5) * 0.1;
    if (this.kind === 'shade') {
      // Bränd av solljus: gyllene sprickor och ett svagt sken, annars kall violett skugga
      const lit = Math.min(1, this.lightT / 0.6);
      for (const mat of m.mats) mat.emissive.setRGB(flashing ? 0.9 : 0.35 * lit, flashing ? 0.9 : 0.22 * lit, flashing ? 0.9 : 0.05 * lit);
      m.M.eye.color.setRGB(0.85 + 0.15 * lit, 0.63 + 0.2 * lit, 1 - 0.6 * lit);
      m.M.glow.color.setRGB(0.6 + 0.4 * lit, 0.35 + 0.4 * lit, 1 - 0.75 * lit);
    } else {
      for (const mat of m.mats) mat.emissive.setRGB(flashing ? 0.9 : 0, flashing ? 0.9 : 0, flashing ? 0.9 : 0);
      m.M.eye.color.setRGB(1, 0.62 + glow * 0.3, 0.25 + glow * 0.2);
      m.M.glow.color.setRGB(1 * (0.6 + glow * 0.4), 0.42 * (0.6 + glow * 0.4), 0.12);
    }

    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    this.excl.visible = this.exclT > 0;
    if (this.excl.visible) this.excl.position.set(this.pos.x, this.pos.y + 2.6 + Math.sin(this.exclT * 20) * 0.04, this.pos.z);
  }
}

// Stormfladdrare: små fladdermöss som sprakar av blixt. De dyker mot Cello
// och studsar mot skölden. Ett svärdshugg räcker.
class Bat {
  constructor(scene, octree, home, opts = {}) {
    this.octree = octree;
    this.home = home.clone();
    this.kind = 'bat';
    this.flying = true;
    this.room = opts.room || null;
    this.dormant = !!opts.dormant;
    this.respawn = opts.respawn ?? false;
    this.permaDead = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.hitRadius = 0.45;
    this.hitHeight = [-0.8, 2.4];
    this.t = Math.random() * 10;
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const dark = lam(0x22232c), wing = lam(0x34303e);
    const glow = new THREE.MeshBasicMaterial({ color: 0x8fe4ff });
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.38), dark);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.2), dark);
    head.position.set(0, 0.06, 0.24);
    root.add(body, head);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), dark);
      ear.position.set(0.07 * s, 0.22, 0.24);
      root.add(ear);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), glow);
      eye.position.set(0.06 * s, 0.08, 0.345);
      root.add(eye);
    });
    this.wings = [-1, 1].map((s) => {
      const g = new THREE.Group();
      g.position.set(0.14 * s, 0.04, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.42), wing);
      m.position.x = 0.3 * s;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.03), glow);
      edge.position.set(0.3 * s, 0.01, 0.2);
      g.add(m, edge);
      root.add(g);
      return { g, s };
    });
    this.spark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), glow);
    root.add(this.spark);
    scene.add(root);
    this.model = { root, mats: [dark, wing] };
    this.reset();
  }

  reset() {
    this.pos.copy(this.home).y += 2.6;
    this.vel.set(0, 0, 0);
    this.hp = 1;
    this.st = 0;
    this.cooldown = 0.5 + Math.random();
    this.model.root.visible = true;
    this.model.root.rotation.set(0, 0, 0);
    this.model.root.position.copy(this.pos);
    this.state = 'hover';
    if (this.dormant) this.sleep();
  }

  sleep() {
    this.state = 'dormant';
    this.model.root.visible = false;
  }

  wake() {
    if (this.state !== 'dormant') return;
    this.dormant = false;
    this.state = 'spawn';
    this.st = 0;
    this.pos.copy(this.home).y += 0.6;
    this.model.root.visible = true;
  }

  get targetable() {
    return !['dead', 'dormant', 'spawn'].includes(this.state);
  }

  get alive() {
    return this.state !== 'dead';
  }

  get chest() {
    return this.pos;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  die(w) {
    this.setState('dead');
    this.vel.set(0, 1, 0);
    w.sfx.play('bat', { vol: 0.7 });
    w.fx.burst('spark', this.pos, 12, 0x8fdcff);
    if (!this.respawn) this.permaDead = true;
    w.fx.drop?.(this.pos.clone().setY(this.home.y), 'bat', w.player);
  }

  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    this.die(w);
    return 'killed';
  }

  slamHit(point, w) {
    if (!this.targetable) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 3.4 && this.pos.y - point.y < 3.2) this.die(w);
  }

  update(dt, w) {
    const p = w.player;
    this.t += dt;
    this.st += dt;
    this.cooldown -= dt;
    const chest = new THREE.Vector3(p.feet.x, p.feet.y + 1.1, p.feet.z);
    const to = chest.clone().sub(this.pos);
    const dist = to.length();
    let speed = 0;
    switch (this.state) {
      case 'dormant':
        return;
      case 'spawn':
        this.pos.y += dt * 2.6;
        if (this.st > 0.8) this.setState('hover');
        break;
      case 'hover': {
        const tgt = this.home.clone().add(new THREE.Vector3(Math.cos(this.t * 0.8) * 1.3, 2.6 + Math.sin(this.t * 2.1) * 0.3, Math.sin(this.t * 0.8) * 1.3));
        this.vel.lerp(tgt.sub(this.pos).multiplyScalar(2), 1 - Math.exp(-3 * dt));
        if (this.cooldown <= 0 && p.state !== 'dead' && dist < 9 && Math.abs(to.y) < 5) {
          this.setState('swoop');
          this.vel.copy(to).normalize().multiplyScalar(4);
          w.sfx.play('bat', { vol: 0.5 });
        }
        break;
      }
      case 'swoop': {
        speed = 6.2;
        const want = to.clone().normalize().multiplyScalar(speed);
        const side = new THREE.Vector3(-to.z, 0, to.x).normalize().multiplyScalar(Math.sin(this.st * 9) * 1.6);
        this.vel.lerp(want.add(side), 1 - Math.exp(-2.6 * dt));
        if (dist < 0.75) {
          const res = p.takeHit(1, this.pos);
          if (res === 'blocked') {
            this.setState('bounce');
            this.vel.copy(to).normalize().multiplyScalar(-5).setY(-1);
          } else {
            this.setState('retreat');
          }
        } else if (this.st > 2.4) this.setState('retreat');
        break;
      }
      case 'retreat': {
        const away = to.clone().setY(0).normalize().multiplyScalar(-3.5);
        this.vel.lerp(away.setY(3), 1 - Math.exp(-3 * dt));
        if (this.st > 1.1) { this.setState('hover'); this.cooldown = 0.8 + Math.random() * 0.8; }
        break;
      }
      case 'bounce':
        this.vel.y -= 6 * dt;
        this.vel.multiplyScalar(Math.exp(-2 * dt));
        if (this.st > 0.8) { this.setState('hover'); this.cooldown = 1.2; }
        break;
      case 'dead':
        this.vel.y -= 14 * dt;
        if (this.st > 0.9) this.model.root.visible = false;
        break;
      default:
        break;
    }
    this.pos.addScaledVector(this.vel, dt);
    // Inne i rummet och ovanför golvet
    const b = this.bounds;
    if (b) {
      this.pos.x = Math.max(b.x0 + 0.6, Math.min(b.x1 - 0.6, this.pos.x));
      this.pos.z = Math.max(b.z0 + 0.6, Math.min(b.z1 - 0.6, this.pos.z));
    }
    const floor = this.home.y + (this.state === 'dead' ? 0.15 : 0.55);
    if (this.pos.y < floor) { this.pos.y = floor; if (this.vel.y < 0) this.vel.y = 0; }
    if (this.pos.y > this.home.y + 5) this.pos.y = this.home.y + 5;
    // Vingarna slår, kroppen lutar i flykten
    const flap = this.state === 'dead' ? 0.2 : Math.sin(this.t * (this.state === 'swoop' ? 30 : 20)) * 0.9;
    for (const wg of this.wings) wg.g.rotation.z = wg.s * flap;
    const r = this.model.root;
    r.position.copy(this.pos);
    if (this.vel.lengthSq() > 0.05) r.rotation.y = Math.atan2(this.vel.x, this.vel.z);
    r.rotation.x = this.state === 'swoop' ? 0.35 : 0;
    this.spark.visible = Math.random() < 0.4;
    this.spark.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4);
  }
}

export class Enemies {
  constructor(scene, octree, isSafe) {
    this.scene = scene;
    this.octree = octree;
    this.isSafe = isSafe;
    this.list = [];
    this.attacker = null;
    this.active = true;
    this.cleared = new Set();
    this.area = null;
    // 0.11: dygnet och vädret (sätts av main.js varje bildruta), stenar i luften
    this.env = { night: false, fog: 0, rain: 0, lantern: false, dead: false };
    this.rocks = [];
    this.timeT = 0;
    this.hints = new Set();
    this.hud = null;
  }

  // Ett kort tips första gången något nytt händer
  hint(key, text) {
    if (this.hints.has(key) || !this.hud) return;
    this.hints.add(key);
    this.hud.toast(text, 4200);
  }
  onSneak() { this.hint('sneak', 'A sneak attack! A sleeping Ashling takes double damage.'); }
  onDisarm() { this.hint('disarm', "The club flew out of the Ashling's hand! Stand by it, or smash it, and the Ashling has only stones left."); }

  // En askling dog: den sista i flocken kan fly för att hämta förstärkning
  onDeath(dead, w) {
    if (dead.group !== 'world') return;
    const pack = this.list.filter((o) => o !== dead && o.alive && o.targetable && !o.flying && o.area === dead.area && o.group === 'world'
      && Math.hypot(o.pos.x - dead.pos.x, o.pos.z - dead.pos.z) < 16);
    for (const o of pack) o.fear = (o.fear ?? 0) + 1;
    if (pack.length !== 1) return;
    const last = pack[0];
    const engaged = ['chase', 'circle', 'recover', 'hurt', 'stagger', 'alert', 'rocks', 'windup'].includes(last.state);
    if (!engaged || last.fleeTried || last.reserve || last.kind === 'shade') return;
    if ((last.fear ?? 0) >= 2 || last.hp <= 2) {
      this.release(last);
      last.flee();
      this.hint('flee', 'The last Ashling is running away... to call for help!');
    }
  }

  // Förstärkning: två asklingar reser sig ur askan bredvid den som ylade
  reinforce(caller, w) {
    const free = this.list.filter((e) => e.reserve && !e.called).slice(0, 2);
    free.forEach((e, i) => {
      const a = caller.facing + (i ? 1.4 : -1.4);
      let x = caller.pos.x + Math.sin(a) * 2.6, z = caller.pos.z + Math.cos(a) * 2.6;
      let gy = caller.groundAt(x, caller.pos.y + 1, z);
      if (gy === null || Math.abs(gy - caller.pos.y) > 1.2) { x = caller.pos.x; z = caller.pos.z; gy = caller.pos.y; }
      e.called = true;
      e.area = caller.area;
      e.home.set(x, gy, z);
      e.waypoints = [e.home.clone()];
      e.permaDead = false;
      e.reset();
      e.model.root.visible = true;
      e.setState('spawn');
      e.st = -0.2 * i;
      e.fleeTried = true;
      w.fx.burst('ash', e.chest, 22);
    });
    caller.fear = 0;
    if (free.length) w.sfx.play('stomp', { vol: 0.5 });
  }

  // En sten kastas i en båge mot Cello
  throwRock(e, player) {
    const from = new THREE.Vector3(e.pos.x + Math.sin(e.facing) * 0.4, e.pos.y + 1.7, e.pos.z + Math.cos(e.facing) * 0.4);
    const to = new THREE.Vector3(player.feet.x + player.vel.x * 0.35, player.feet.y + 1.0, player.feet.z + player.vel.z * 0.35);
    const T = Math.max(0.45, Math.min(1.1, from.distanceTo(to) / 13));
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y) / T + 0.5 * ROCK_GRAV * T, (to.z - from.z) / T);
    const mesh = new THREE.Mesh(ROCK_GEO, ROCK_MAT);
    mesh.position.copy(from);
    (e.model.root.parent ?? this.scene).add(mesh);
    this.rocks.push({ mesh, pos: from, vel, t: 0, owner: e });
  }

  updateRocks(dt, w) {
    const P = w.player;
    for (const r of this.rocks) {
      r.t += dt;
      r.vel.y -= ROCK_GRAV * dt;
      r.pos.addScaledVector(r.vel, dt);
      r.mesh.position.copy(r.pos);
      r.mesh.rotation.x += dt * 9;
      r.mesh.rotation.z += dt * 6;
      const dx = P.feet.x - r.pos.x, dz = P.feet.z - r.pos.z, dy = P.feet.y + 1.0 - r.pos.y;
      if (!r.done && Math.hypot(dx, dz) < 0.65 && Math.abs(dy) < 1.0) {
        r.done = true;
        const res = P.takeHit(1, r.pos.clone());
        if (res === 'blocked') w.fx.burst('debris', r.pos.clone(), 8, 0x6a645a);
        else if (res === 'hit') w.onPlayerHit?.(r.owner);
        w.sfx.play(res === 'blocked' ? 'clang' : 'hit', { vol: 0.6 });
      }
      const gy = r.owner.groundAt(r.pos.x, r.pos.y + 0.3, r.pos.z);
      if (!r.done && gy !== null && r.pos.y < gy + 0.1) {
        r.done = true;
        w.fx.burst('debris', r.pos.clone().setY(gy + 0.1), 6, 0x6a645a);
      }
      if (r.t > 3) r.done = true;
      if (r.done) r.mesh.removeFromParent();
    }
    this.rocks = this.rocks.filter((r) => !r.done);
  }

  // Klubbor som ligger på marken: Cellos svärd kan krossa dem
  extraTargets() {
    const out = [];
    for (const e of this.list) {
      const d = e.drop;
      if (!d || !d.landed || (this.area && e.area && e.area !== this.area)) continue;
      if (!d.target) {
        d.target = {
          pos: d.pos, hitRadius: 0.55, noLock: true, noWear: true, hitHeight: [-1.2, 1.2],
          get targetable() { return !!e.drop && e.drop === d; },
          get chest() { return d.pos; },
          hurt: (dmg, from, w) => {
            if (e.drop !== d) return false;
            w.fx.burst('debris', d.pos.clone().setY(d.pos.y + 0.3), 14, 0x5b5650);
            w.sfx.play('crumble', { vol: 0.7 });
            e.clearDrop();
            this.hint('smash', 'The club shatters! That Ashling will have to make do with stones.');
            return 'killed';
          },
        };
      }
      out.push(d.target);
    }
    return out;
  }

  // Dygnet: sovande och nattliga asklingar i området
  applyTime(instant = false) {
    for (const e of this.list) {
      if (e.group !== 'world' || !e.applyTime || (this.area && e.area !== this.area)) continue;
      e.applyTime(this.env, instant);
    }
  }

  // opts: { kind: 'askling' | 'shield' | 'bat', room, dormant, respawn, bounds, group: 'world' | 'bastion' }
  add(home, waypoints, opts = {}) {
    const e = opts.kind === 'bat'
      ? new Bat(this.scene, this.octree, home, opts)
      : new Askling(this.scene, this.octree, home, waypoints, this.list.length, opts);
    e.isSafe = opts.group && opts.group !== 'world' ? null : this.isSafe;
    e.bounds = opts.bounds || null;
    e.trapGroup = opts.dormant ? opts.room : null;
    e.group = opts.group || 'world';
    e.area = opts.area || null;
    this.list.push(e);
    return e;
  }

  // Cello kommer till ett område: fienderna där står på sina platser igen
  enterArea(id) {
    this.area = id;
    this.attacker = null;
    // Förstärkningar och stenar hör till det område de kallades i
    for (const r of this.rocks) r.mesh.removeFromParent();
    this.rocks = [];
    for (const e of this.list) {
      if (!e.reserve) continue;
      e.called = false;
      e.area = null;
      e.home.set(0, -500, 0);
      e.reset();
    }
    for (const e of this.list) {
      if (e.reserve) continue;
      if (e.area !== id || e.group !== 'world' || !this.active) continue;
      if (e.permaDead && !e.respawn) continue;
      e.permaDead = false;
      e.reset();
    }
    this.applyTime(true);
  }

  // Under prologen finns inga asklingar i byn; efteråt reser de sig ur askan
  setActive(on) {
    this.active = on;
    this.attacker = null;
    for (const e of this.list) {
      if (e.group !== 'world' || e.reserve) continue;
      e.reset();
      if (on) {
        e.setState('spawn');
        e.model.root.visible = true;
      } else {
        e.state = 'dead';
        e.deadT = -1e9;
        e.model.root.visible = false;
      }
    }
  }

  canAttack(e) {
    return !this.attacker || this.attacker === e;
  }

  take(e) {
    this.attacker = e;
  }

  release(e) {
    if (this.attacker === e) this.attacker = null;
  }

  // Fällrum: fienderna i rummet vaknar, och rummet är klart när alla är besegrade
  wakeGroup(room) {
    for (const e of this.list) if (e.room === room) e.wake?.();
  }

  groupCleared(room) {
    return this.list.every((e) => e.room !== room || !e.alive);
  }

  // Ett klarat fällrum förblir tomt, även efter att Cello har dött eller laddat spelet
  killGroup(room) {
    this.cleared.add(room);
    for (const e of this.list) {
      if (e.room !== room || !e.trapGroup) continue;
      e.permaDead = true;
      e.state = 'dead';
      e.st = 99;
      e.model.root.visible = false;
    }
  }

  resetAll() {
    this.attacker = null;
    for (const e of this.list) {
      if (e.group === 'world' && !this.active) continue;
      if (e.trapGroup && this.cleared.has(e.trapGroup)) continue;
      e.permaDead = false;
      if (e.trapGroup) e.dormant = true;
      e.reset();
    }
  }

  slam(point, w) {
    const ctx = { ...w, director: this };
    for (const e of this.list) e.slamHit?.(point, ctx);
  }

  update(dt, w) {
    if (this.attacker && !this.attacker.targetable) this.attacker = null;
    const ctx = { ...w, director: this };
    const p = w.player;
    const near = [];
    this.updateRocks(dt, ctx);
    this.timeT -= dt;
    if (this.timeT <= 0) {
      this.timeT = 0.5;
      this.applyTime(false);
    }
    for (const e of this.list) {
      if (e.group === 'world' && !this.active) continue;
      if (this.area && e.area && e.area !== this.area) continue;
      if (Math.abs(e.home.x - p.feet.x) > 60 || Math.abs(e.home.z - p.feet.z) > 60) continue;
      e.update(dt, ctx);
      near.push(e);
    }
    // Knuffa isär Cello och fiender, och fiender sinsemellan
    for (const e of near) {
      if (!e.targetable || e.flying) continue;
      const dx = p.feet.x - e.pos.x, dz = p.feet.z - e.pos.z, d = Math.hypot(dx, dz);
      const min = RADIUS + 0.38;
      if (d < min && d > 1e-4 && Math.abs(p.feet.y - e.pos.y) < 1.8) {
        p.nudge((dx / d) * (min - d), (dz / d) * (min - d));
      }
      for (const o of near) {
        if (o === e || !o.targetable || o.flying) continue;
        const ex = e.pos.x - o.pos.x, ez = e.pos.z - o.pos.z, ed = Math.hypot(ex, ez);
        if (ed < RADIUS * 2 && ed > 1e-4) {
          e.pos.x += (ex / ed) * (RADIUS * 2 - ed) * 0.5;
          e.pos.z += (ez / ed) * (RADIUS * 2 - ed) * 0.5;
        }
      }
    }
  }
}

// The Sunken Necropolis (0.12): verktygslåda för en fängelsehåla med egen identitet.
//
// Byggstil: svart basalt, ärgad brons, benvit kalksten och grönt andeljus (inte fästningens järn,
// inte pyramidens sandsten). Trånga kryptor med låga tak och enorma översvämmade salar.
//
// Bygger på Wing (dkit.js) och lägger till:
//   vatten     – bassänger vars yta står på en av flera nivåer (slussratten väljer). Cello kan inte simma:
//                djupt vatten skickar honom tillbaka till land. Sarkofaglock flyter och bär honom.
//   andevärlden – plattor och broar som bara finns i de dödas värld, falska väggar som bara finns bland
//                de levande, och andar att prata med (realm.js sköter växlingen)
//   kryptor    – nischer med sovande mumier, sarkofager och schakalstatyer
//   bossar     – Schakalväktaren (miniboss) och Ammit, hjärtslukerskan
import * as THREE from 'three';
import { Wing } from './dkit.js';
import { IronWarden } from './bosses.js';
import { box, cyl, place } from './geom.js';
import { mulberry, soften, smoothTexture } from './textures.js';
import { ring } from './titan.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------- texturer och material ----------------
function tex(size, seed, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, mulberry(seed));
  return smoothTexture(new THREE.CanvasTexture(soften(c, { seed })));
}
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function noise(g, s, r, [R, G, B], k) {
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = (r() - 0.5) * 2 * k;
    g.fillStyle = rgb(R + v, G + v, B + v * 0.9);
    g.fillRect(x, y, 1, 1);
  }
}

let MATS = null;
export function necroMats() {
  if (MATS) return MATS;
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  // Basalt: mörka huggna block med gröna fläckar av mossa
  const basalt = tex(32, 1201, (g, s, r) => {
    noise(g, s, r, [38, 42, 44], 8);
    g.fillStyle = 'rgba(12,14,16,0.9)';
    for (let y = 0; y < s; y += 8) g.fillRect(0, y, s, 1);
    for (let row = 0; row < 4; row++) for (let x = (row % 2) * 8; x < s; x += 16) g.fillRect(x, row * 8, 1, 8);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(60,96,70,${0.4 + r() * 0.4})`; g.fillRect(r() * s | 0, r() * s | 0, 1 + (r() * 2 | 0), 1); }
  });
  const flag = tex(32, 1202, (g, s, r) => {
    noise(g, s, r, [44, 46, 46], 7);
    g.fillStyle = 'rgba(14,16,16,0.9)';
    g.fillRect(0, 0, s, 1); g.fillRect(0, 0, 1, s); g.fillRect(0, 16, 16, 1); g.fillRect(16, 0, 1, s); g.fillRect(16, 21, 16, 1);
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(70,90,74,0.5)'; g.fillRect(r() * s | 0, r() * s | 0, 1, 1); }
  });
  // Benvit kalksten (ossuariet)
  const bone = tex(32, 1203, (g, s, r) => {
    noise(g, s, r, [176, 166, 140], 10);
    g.fillStyle = 'rgba(90,80,62,0.8)';
    for (let y = 0; y < s; y += 16) g.fillRect(0, y, s, 1);
    for (let x = 0; x < s; x += 16) g.fillRect(x, 0, 1, s);
    // Små dödskallar i raderna
    for (const [cx, cy] of [[8, 8], [24, 24]]) {
      g.fillStyle = 'rgba(214,204,178,1)'; g.fillRect(cx - 3, cy - 3, 6, 5); g.fillRect(cx - 2, cy + 2, 4, 2);
      g.fillStyle = 'rgba(40,34,26,1)'; g.fillRect(cx - 2, cy - 1, 1, 2); g.fillRect(cx + 1, cy - 1, 1, 2); g.fillRect(cx, cy + 1, 1, 1);
    }
  });
  // Ärgad brons
  const bronze = tex(32, 1204, (g, s, r) => {
    noise(g, s, r, [74, 120, 104], 14);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,110,50,${r() * 0.5})`; g.fillRect(r() * s | 0, r() * s | 0, 2, 1); }
  });
  // Mörk sten med inristade gröna tecken (inskriptioner, dörrar)
  const glyph = tex(32, 1205, (g, s, r) => {
    noise(g, s, r, [30, 34, 36], 6);
    g.fillStyle = 'rgba(80,200,170,0.85)';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 8 + 2, y = row * 8 + 2;
      const k = (r() * 5) | 0;
      if (k === 0) { g.fillRect(x, y, 4, 1); g.fillRect(x + 1, y + 1, 1, 3); }
      else if (k === 1) { g.fillRect(x, y, 1, 4); g.fillRect(x, y + 3, 4, 1); }
      else if (k === 2) { g.fillRect(x + 1, y, 2, 2); g.fillRect(x, y + 2, 4, 1); g.fillRect(x + 1, y + 3, 2, 1); }
      else if (k === 3) { g.fillRect(x, y + 1, 4, 1); g.fillRect(x + 2, y, 1, 4); }
      else { g.fillRect(x, y, 1, 1); g.fillRect(x + 3, y, 1, 1); g.fillRect(x + 1, y + 2, 2, 2); }
    }
  });
  // Vattnet: grönsvart med ljusa krusningar (texturen rinner)
  const water = tex(32, 1206, (g, s, r) => {
    noise(g, s, r, [20, 60, 56], 6);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(110,200,180,${0.25 + r() * 0.35})`; g.fillRect(r() * s | 0, r() * s | 0, 3 + (r() * 4 | 0), 1); }
  });
  MATS = {
    basalt: lam({ map: basalt }), flag: lam({ map: flag }), bone: lam({ map: bone }), bronze: lam({ map: bronze }),
    glyph: lam({ map: glyph }), dark: lam({ color: 0x15171a, flatShading: true }),
    linen: lam({ color: 0xb8ab88, flatShading: true }), gold: lam({ color: 0xb8923a, emissive: 0x2a1c06, flatShading: true }),
    jackal: lam({ color: 0x141418, flatShading: true }),
    spiritFire: new THREE.MeshBasicMaterial({ color: 0x6af0d4 }),
    water: new THREE.MeshLambertMaterial({ map: water, color: 0x8ad8c4, transparent: true, opacity: 0.82, depthWrite: false, emissive: 0x0a2a24 }),
    waterTex: water,
  };
  return MATS;
}

// ====================================================================
// Schakalväktaren (miniboss): en väktare med schakalhuvud, sköld och khopesh.
// Skölden tar emot slag framifrån, som Järnväktarens. Men den gör utfall tvärs över salen:
// kliver Cello undan så att den springer in i en sarkofag eller en vägg, fastnar den en stund.
// ====================================================================
export class JackalWarden extends IronWarden {
  constructor(scene, home, facing, bounds, groundAt, obstacles = []) {
    super(scene, home, facing, bounds, groundAt);
    const M = this.model.M;
    M.ash.color.set(0x16161c);
    M.plate.color.set(0x23242c);
    M.dark.color.set(0x0c0c10);
    M.bone.color.set(0xc9a24f);
    M.wood.color.set(0x2a4a44);
    M.rim.color.set(0xc9a24f);
    M.paint.color.set(0x3aa890);
    M.eye.color.set(0x6af0d4);
    M.glow.color.set(0x6af0d4);
    // Schakalhuvud: långa öron och en nos
    const NM = necroMats();
    const head = this.model.head;
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.62, 4), NM.jackal);
      ear.position.set(0.17 * s, 0.62, -0.04);
      ear.rotation.z = -0.12 * s;
      head.add(ear);
    }
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.42), NM.jackal);
    snout.position.set(0, 0.02, 0.42);
    head.add(snout);
    this.obstacles = obstacles; // [{x, z, r}] sarkofager och pelare
    this.lungeRing = ring(0.6, 0.9);
    scene.add(this.lungeRing);
    this.blockHint = 'The jackal shield turns the blade. Step aside when it lunges, and let it crash!';
  }

  reset() {
    super.reset();
    this.hp = 12;
    this.lungeDir = null;
    if (this.lungeRing) this.lungeRing.material.opacity = 0;
  }

  // Med så här många rum blir den snabbare och gör utfall
  update(dt, g) {
    const p = g.player;
    if (this.state === 'advance' && this.cooldown <= 0) {
      const d = Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z);
      if (d > 5 && d < 16) {
        this.setState('lungeWind');
        this.lungeDir = null;
        g.sfx.play('growl', { vol: 1.3 });
      }
    }
    if (this.state === 'lungeWind' || this.state === 'lunge') {
      this.st += dt;
      this.flash = Math.max(0, this.flash - dt);
      const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z;
      if (this.state === 'lungeWind') {
        const toward = Math.atan2(dx, dz);
        if (this.st < 0.6) this.facing += Math.max(-4 * dt, Math.min(4 * dt, wrap(toward - this.facing)));
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        const k = Math.min(1, this.st / 0.8);
        this.lungeRing.position.set(this.pos.x + fx * 3 * k, this.pos.y + 0.06, this.pos.z + fz * 3 * k);
        this.lungeRing.material.opacity = 0.2 + 0.6 * k;
        if (this.st > 0.85) {
          this.lungeDir = new THREE.Vector3(fx, 0, fz);
          this.lungeRing.material.opacity = 0;
          this.setState('lunge');
          g.sfx.play('swing', { vol: 1.4 });
        }
      } else {
        const sp = 11;
        this.pos.addScaledVector(this.lungeDir, sp * dt);
        const b = this.bounds;
        const hitWall = this.pos.x < b.x0 + 1.8 || this.pos.x > b.x1 - 1.8 || this.pos.z < b.z0 + 1.8 || this.pos.z > b.z1 - 1.8;
        const hitObj = this.obstacles.some((o) => Math.hypot(this.pos.x - o.x, this.pos.z - o.z) < o.r + 1.1);
        if (!this.hitDone && Math.hypot(dx, dz) < 1.7 && Math.abs(p.feet.y - this.pos.y) < 2) {
          this.hitDone = true;
          p.takeHit(2, this.pos);
        }
        if (hitWall || hitObj) {
          this.pos.addScaledVector(this.lungeDir, -0.6);
          this.setState('stuck');
          this.st = -0.8; // fast i nästan tre sekunder
          g.sfx.play('stomp', { vol: 1 });
          g.sfx.play('clang', { vol: 0.8 });
          g.rig.shake(0.45);
          g.fx.burst('spark', this.chest.clone(), 22, 0x6af0d4);
          this.onEvent?.('crashed', this);
        } else if (this.st > 1.4) {
          this.cooldown = 1.2;
          this.setState('advance');
        }
      }
      // Klampa inne i salen
      const b = this.bounds;
      this.pos.x = Math.max(b.x0 + 1.2, Math.min(b.x1 - 1.2, this.pos.x));
      this.pos.z = Math.max(b.z0 + 1.2, Math.min(b.z1 - 1.2, this.pos.z));
      this.animate(dt, this.state === 'lunge' ? 1.6 : 0);
      if (this.state === 'lungeWind') {
        // Hukar sig inför utfallet
        this.model.torso.rotation.x = approach(this.model.torso.rotation.x, 0.7, 10, dt);
        this.model.hips.position.y = approach(this.model.hips.position.y, 0.7, 10, dt);
      }
      return;
    }
    super.update(dt, g);
  }
}

// ====================================================================
// Ammit, hjärtslukerskan: krokodilhuvud, lejonkropp och flodhästens bakdel.
// En av titanerna, som slukade de dödas hjärtan i nekropolen.
//   · Hennes hud tar emot allt. Hon rusar mot Cello; kliver han undan och hon rammar en pelare
//     blir hon yr en stund.
//   · Då syns hennes stulna hjärta, men bara i de dödas värld. Tre hugg mot hjärtat per gång.
//   · Andra fasen: hon dyker ner i vattnet och slår upp under Cello. Tredje fasen: vålnader.
// ====================================================================
function buildAmmit() {
  const NM = necroMats();
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = {
    croc: lam(0x2f4a36), crocDark: lam(0x1c2c22), mane: lam(0x8a6a2a), lion: lam(0xa07a3c), hippo: lam(0x5a4a4a),
    teeth: lam(0xe8e0c8), eye: new THREE.MeshBasicMaterial({ color: 0xffd040 }),
    heart: new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.0, depthTest: false, fog: false }),
    gold: NM.gold,
  };
  const Bx = (w, h, d, m, x = 0, y = 0, z = 0) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Bakdelen: flodhästens runda rumpa och korta ben
  const rear = new THREE.Group();
  rear.position.set(0, 1.3, -1.1);
  body.add(rear);
  rear.add(place(new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 7), M.hippo), 0, 0, 0));
  // Lejonkroppen och manen
  const chest = new THREE.Group();
  chest.position.set(0, 1.5, 0.5);
  body.add(chest);
  chest.add(Bx(1.6, 1.5, 2.0, M.lion, 0, 0, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 5), M.mane);
    tuft.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.9 + 0.2, 1.0);
    tuft.rotation.set(Math.PI / 2, 0, a - Math.PI / 2);
    chest.add(tuft);
  }
  chest.add(Bx(1.7, 0.18, 0.5, M.gold, 0, -0.55, 0.2)); // ett halsband av guld
  // Det stulna hjärtat, inne i bröstet
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), M.heart);
  heart.position.set(0, 0.1, 0.2);
  heart.renderOrder = 12;
  chest.add(heart);
  // Krokodilhuvudet med käkar som öppnas
  const head = new THREE.Group();
  head.position.set(0, 0.4, 1.3);
  chest.add(head);
  head.add(Bx(1.0, 0.7, 0.8, M.croc, 0, 0, 0.1));
  const upper = new THREE.Group();
  upper.position.set(0, 0.1, 0.45);
  head.add(upper);
  upper.add(Bx(0.75, 0.32, 1.6, M.croc, 0, 0.05, 0.8));
  upper.add(Bx(0.3, 0.1, 0.1, M.crocDark, 0, 0.24, 1.5));
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), M.teeth);
    t.rotation.x = Math.PI;
    t.position.set(0.33 * s, -0.16, 0.25 + i * 0.25);
    upper.add(t);
  }
  for (const s of [-1, 1]) upper.add(Bx(0.14, 0.1, 0.1, M.eye, 0.3 * s, 0.28, 0.1));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.15, 0.45);
  head.add(jaw);
  jaw.add(Bx(0.7, 0.24, 1.5, M.crocDark, 0, -0.08, 0.75));
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), M.teeth);
    t.position.set(0.3 * s, 0.1, 0.3 + i * 0.26);
    jaw.add(t);
  }
  // Benen: lejontassar fram, flodhästben bak
  const legs = [];
  for (const [x, z, m, h] of [[-0.6, 1.1, M.lion, 1.2], [0.6, 1.1, M.lion, 1.2], [-0.7, -1.2, M.hippo, 1.0], [0.7, -1.2, M.hippo, 1.0]]) {
    const g = new THREE.Group();
    g.position.set(x, h, z);
    g.add(Bx(0.45, h, 0.5, m, 0, -h / 2, 0));
    g.add(Bx(0.55, 0.2, 0.65, M.crocDark, 0, -h + 0.1, 0.08));
    body.add(g);
    legs.push(g);
  }
  // Svansen
  const tail = new THREE.Group();
  tail.position.set(0, 1.4, -2.0);
  body.add(tail);
  tail.add(Bx(0.3, 0.3, 1.6, M.croc, 0, 0, -0.8));
  root.scale.setScalar(1.25);
  const mats = [M.croc, M.crocDark, M.mane, M.lion, M.hippo];
  return { root, body, chest, head, upper, jaw, legs, tail, heart, M, mats };
}

export class Ammit {
  constructor(scene, center, pillars, groundAt, o = {}) {
    this.model = buildAmmit();
    scene.add(this.model.root);
    this.scene = scene;
    this.center = center.clone();
    this.pillars = pillars; // [{x, z, r}]
    this.groundAt = groundAt;
    this.radius = o.radius ?? 14; // golvet hon rör sig på
    this.pos = center.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 3;
    this.hitRadius = 2.0;
    this.hitHeight = [-1.5, 3.5];
    this.aimRing = ring(0.9, 1.3);
    this.eruptRing = ring(1.6, 2.2);
    scene.add(this.aimRing, this.eruptRing);
    this.onEvent = null;
    this.clearId = 'ammit';
    this.reset();
  }

  reset() {
    this.pos.copy(this.center).add(new THREE.Vector3(0, 0, -6));
    this.facing = 0;
    this.hp = 9;
    this.state = 'dormant';
    this.st = 0;
    this.cooldown = 1.5;
    this.flash = 0;
    this.stunHits = 0;
    this.dir = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.hitDone = false;
    this.summoned = false;
    this.anim = 0;
    this.sink = 0;
    this.model.root.visible = true;
    this.aimRing.material.opacity = 0;
    this.eruptRing.material.opacity = 0;
    this.model.body.position.y = -3;
    this.model.body.rotation.set(0, 0, 0);
  }

  get phase() { return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3; }
  get targetable() { return !['dormant', 'wake', 'dead', 'gone', 'dive', 'under'].includes(this.state); }
  get chest() { return this.chestPos.set(this.pos.x + Math.sin(this.facing) * 0.8, this.pos.y + 2.0, this.pos.z + Math.cos(this.facing) * 0.8); }

  wake() {
    if (this.state !== 'dormant') return;
    this.setState('wake');
  }

  setState(s) {
    this.state = s;
    this.st = 0;
    this.hitDone = false;
  }

  // Hjärtat går bara att träffa när hon är yr och Cello är i de dödas värld
  hurt(dmg, from, w) {
    if (!this.targetable) return false;
    const dead = !!this.realm?.dead;
    if (this.state !== 'stunned' || !dead) {
      this.cooldown = Math.min(this.cooldown, 0.4);
      this.onEvent?.(this.state === 'stunned' ? 'needRealm' : 'armored', this);
      return 'blocked';
    }
    this.hp -= 1;
    this.stunHits++;
    this.flash = 0.18;
    if (this.hp <= 0) {
      this.setState('dead');
      this.aimRing.material.opacity = 0;
      this.eruptRing.material.opacity = 0;
      this.onEvent?.('dying', this);
      return 'killed';
    }
    if (this.stunHits >= 3) {
      // Tre hugg: hon vrålar och kastar sig upp
      this.setState('roar');
      this.onEvent?.('phase', this);
    }
    return 'hit';
  }

  slamHit(point, w) {
    if (!this.targetable) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 4) this.hurt(1, point, w);
  }

  canSwordHit(p, sw) {
    const c = this.chest;
    const d = Math.hypot(c.x - p.feet.x, c.z - p.feet.z);
    return d < sw.reach + 2.0;
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
    const C = this.center;
    switch (this.state) {
      case 'dormant':
        break;
      case 'wake':
        // Hon stiger upp ur det svarta vattnet
        this.model.body.position.y = -3 * (1 - Math.min(1, this.st / 1.6));
        if (this.st > 1.0 && !this.roared) { this.roared = true; g.sfx.play('bigroar', { vol: 1.2 }); g.rig.shake(0.5); }
        if (this.st > 2.4) { this.roared = false; this.setState('prowl'); }
        break;
      case 'prowl': {
        // Cirklar runt Cello på avstånd
        turn(2.6);
        const want = 8;
        const radial = (dist - want) * 0.9;
        const tx = Math.cos(toward) * 0, ux = dx / (dist || 1), uz = dz / (dist || 1);
        const vx = ux * radial - uz * 2.4, vz = uz * radial + ux * 2.4;
        this.pos.x += vx * dt * (1 + tx);
        this.pos.z += vz * dt;
        walk = 1;
        if (this.cooldown <= 0) {
          if (dist < 4.2) { this.setState('biteWind'); g.sfx.play('growl', { vol: 1.4 }); }
          else if (this.phase >= 2 && Math.random() < 0.4) { this.setState('dive'); g.sfx.play('splash', { vol: 1 }); }
          else { this.setState('aim'); g.sfx.play('growl', { vol: 1.2 }); }
        }
        break;
      }
      case 'aim': {
        // Hukar sig och siktar; ringen visar vart hon rusar
        if (this.st < 0.75) turn(3);
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        const k = Math.min(1, this.st / 0.95);
        this.aimRing.position.set(this.pos.x + fx * (2 + 6 * k), this.pos.y + 0.08, this.pos.z + fz * (2 + 6 * k));
        this.aimRing.material.opacity = 0.25 + 0.6 * k;
        if (this.st > 0.95) {
          this.dir.set(fx, 0, fz);
          this.aimRing.material.opacity = 0;
          this.setState('charge');
          g.sfx.play('roar', { vol: 0.9 });
        }
        break;
      }
      case 'charge': {
        const sp = this.phase === 3 ? 16 : 13;
        this.pos.addScaledVector(this.dir, sp * dt);
        walk = 2;
        if (!this.hitDone && dist < 2.2 && Math.abs(p.feet.y - this.pos.y) < 2.5) {
          this.hitDone = true;
          p.takeHit(2, this.pos);
        }
        const pillar = this.pillars.find((pl) => Math.hypot(this.pos.x - pl.x, this.pos.z - pl.z) < pl.r + 1.6);
        const out = Math.hypot(this.pos.x - C.x, this.pos.z - C.z) > this.radius - 1.4;
        if (pillar) {
          this.pos.addScaledVector(this.dir, -1.0);
          this.setState('stunned');
          this.stunHits = 0;
          g.sfx.play('stomp', { vol: 1.3 });
          g.sfx.play('crumble', { vol: 1 });
          g.rig.shake(0.7);
          g.fx.burst('debris', new THREE.Vector3(pillar.x, this.pos.y + 2, pillar.z), 26, 0x4a4e52);
          this.onEvent?.('stunned', this);
        } else if (out || this.st > 1.8) {
          this.setState('recoil');
          if (out) { g.sfx.play('stomp', { vol: 0.9 }); g.rig.shake(0.3); }
        }
        break;
      }
      case 'recoil':
        if (this.st > 0.8) { this.cooldown = 0.8; this.setState('prowl'); }
        break;
      case 'stunned':
        // Yr: hjärtat lyser i de dödas värld
        if (this.st > 4.2) { this.cooldown = 0.6; this.setState('roar'); }
        break;
      case 'roar':
        if (this.st > 0.1 && !this.roared) { this.roared = true; g.sfx.play('bigroar', { vol: 1 }); g.rig.shake(0.4); }
        if (this.st > 1.2) {
          this.roared = false;
          this.cooldown = 1.0;
          if (this.phase === 3 && !this.summoned) { this.summoned = true; this.onEvent?.('summon', this); }
          this.setState('prowl');
        }
        break;
      case 'biteWind':
        turn(4);
        if (this.st > 0.5) {
          g.sfx.play('clang', { vol: 0.7 });
          const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
          const cos = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
          if (dist < 3.6 && cos > 0.4) p.takeHit(2, this.pos);
          this.setState('bite');
        }
        break;
      case 'bite':
        if (this.st > 0.6) { this.cooldown = 1.0; this.setState('prowl'); }
        break;
      case 'dive':
        // Sjunker ner genom golvets vatten...
        this.sink = Math.min(1, this.st / 0.8);
        if (this.st > 0.8) { this.setState('under'); this.model.root.visible = false; }
        break;
      case 'under': {
        // ...och slår upp under Cello: ringen följer honom, låser sig, och sedan smäller det
        if (this.st < 1.0) this.target.set(p.feet.x, p.feet.y, p.feet.z);
        this.eruptRing.position.set(this.target.x, this.target.y + 0.08, this.target.z);
        this.eruptRing.material.opacity = this.st < 1.0 ? 0.3 + 0.2 * Math.sin(this.st * 20) : 0.85;
        if (this.st > 1.6) {
          this.eruptRing.material.opacity = 0;
          this.pos.set(this.target.x, this.target.y, this.target.z);
          this.model.root.visible = true;
          this.setState('erupt');
          g.sfx.play('splash', { vol: 1.4 });
          g.sfx.play('bigroar', { vol: 0.8 });
          g.rig.shake(0.6);
          g.fx.burst('spark', this.pos.clone().setY(this.pos.y + 0.5), 30, 0x6af0d4);
          if (Math.hypot(p.feet.x - this.pos.x, p.feet.z - this.pos.z) < 2.4) p.takeHit(2, this.pos.clone().add(new THREE.Vector3(0.01, 0, 0.01)), { unblockable: true });
        }
        break;
      }
      case 'erupt':
        this.sink = Math.max(0, 1 - this.st / 0.5);
        if (this.st > 1.1) { this.cooldown = 0.8; this.setState('prowl'); }
        break;
      case 'dead':
        if (this.st > 1.6 && !this.ashed) {
          this.ashed = true;
          g.fx.burst('ash', this.chest, 60);
          g.sfx.play('edie', { vol: 1.6 });
        }
        this.sink = Math.min(1, Math.max(0, (this.st - 1.6) / 1.4));
        if (this.st > 3.2) {
          this.state = 'gone';
          this.model.root.visible = false;
          this.ashed = false;
          this.onEvent?.('defeated', this);
        }
        break;
      default:
        break;
    }
    // Inom arenan
    const rx = this.pos.x - C.x, rz = this.pos.z - C.z, rd = Math.hypot(rx, rz), lim = this.radius - 1.2;
    if (rd > lim) { this.pos.x = C.x + (rx / rd) * lim; this.pos.z = C.z + (rz / rd) * lim; }
    for (const pl of this.pillars) {
      const px = this.pos.x - pl.x, pz = this.pos.z - pl.z, pd = Math.hypot(px, pz), min = pl.r + 1.4;
      if (pd < min && pd > 1e-4 && this.state !== 'charge') { this.pos.x = pl.x + (px / pd) * min; this.pos.z = pl.z + (pz / pd) * min; }
    }
    const gy = this.groundAt?.(this.pos.x, this.pos.y + 1, this.pos.z);
    if (gy !== null && gy !== undefined) this.pos.y = approach(this.pos.y, gy, 10, dt);
    if (this.model.root.visible && this.state !== 'gone' && dist < 2.4 && dist > 1e-4 && Math.abs(p.feet.y - this.pos.y) < 3) {
      p.nudge((dx / dist) * (2.4 - dist), (dz / dist) * (2.4 - dist));
    }
    this.animate(dt, walk);
  }

  animate(dt, walk) {
    const m = this.model, st = this.st;
    this.anim += dt * (2 + walk * 5);
    const sw = Math.sin(this.anim) * 0.5 * Math.min(1, walk);
    m.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? sw : -sw) * (i < 2 ? 1 : -1); });
    let jaw = 0.1 + Math.sin(this.anim * 0.5) * 0.05, headX = 0, bodyX = 0, bodyY = 0;
    if (this.state === 'aim') { bodyY = -0.35 * Math.min(1, st / 0.5); headX = 0.15; jaw = 0.3; }
    else if (this.state === 'biteWind') { jaw = 0.9; headX = -0.2; }
    else if (this.state === 'bite') { jaw = 0.02; headX = 0.25; }
    else if (this.state === 'roar' || this.state === 'wake') { jaw = 1.0; headX = -0.5; }
    else if (this.state === 'stunned') { jaw = 0.5 + Math.sin(st * 6) * 0.2; headX = 0.35; bodyX = 0.08; bodyY = -0.5; }
    else if (this.state === 'charge') { jaw = 0.6; headX = 0.1; }
    m.jaw.rotation.x = approach(m.jaw.rotation.x, jaw, 14, dt);
    m.head.rotation.x = approach(m.head.rotation.x, headX, 10, dt);
    m.tail.rotation.y = Math.sin(this.anim * 0.8) * 0.4;
    m.body.rotation.x = approach(m.body.rotation.x, bodyX, 8, dt);
    if (this.state !== 'wake') m.body.position.y = approach(m.body.position.y, bodyY - this.sink * 4, 12, dt);
    if (this.state === 'stunned') m.body.rotation.z = Math.sin(st * 5) * 0.1;
    else m.body.rotation.z = approach(m.body.rotation.z, 0, 8, dt);
    // Hjärtat: syns bara i de dödas värld, och pulserar starkast när hon är yr
    const k = this.realm?.k ?? 0;
    const beat = 0.5 + 0.5 * Math.max(0, Math.sin(this.anim * (this.state === 'stunned' ? 5 : 2.5)));
    m.M.heart.opacity = k * (this.state === 'stunned' ? 0.6 + 0.4 * beat : 0.25 + 0.2 * beat);
    m.heart.scale.setScalar(1 + beat * 0.2);
    const f = this.flash > 0 ? 0.9 : 0;
    for (const mat of m.mats) mat.emissive.setRGB(f, f * 0.3, f * 0.3);
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
  }
}

// ====================================================================
// NecroWing: en flygel av basalt, brons och ben
// ====================================================================
export class NecroWing extends Wing {
  constructor(B, area, dungeon, opts = {}) {
    const NM = necroMats();
    super(B, area, dungeon, {
      floorMat: NM.flag, wallMat: NM.basalt, H: 6,
      mats: { slab: NM.basalt, trim: NM.bronze, metal: NM.bronze, runes: NM.glyph, cracked: NM.bone, block: NM.basalt, rubble: NM.dark },
      ...opts,
    });
    this.NM = NM;
    this.pools = [];
    this.floaters = [];
    this.sluices = [];
    this.ghosts = []; // { meshes, box, side } – registreras hos Realm av main.js
    this.spiritDefs = [];
    this.onConnect.push((c) => {
      for (const f of this.floaters) f.box = c.addBox(f.x0, f.top - 0.5, f.z0, f.x1, f.top, f.z1, `float-${f.id}`);
      for (const gh of this.ghosts) gh.box = c.addBox(...gh.ext, `ghost-${gh.side}`);
    });
  }

  get realm() { return this.game?.realm; }

  // Ett lågt tak (kryptorna känns trånga)
  ceiling(x0, x1, z0, z1, y = this.H) {
    this.slab(x0, x1, y, y + 0.6, z0, z1, this.NM.basalt);
  }

  // Grönt andeljus i en skål av brons
  spiritFire(x, z, y = 0) {
    this.B.solid(place(new THREE.Mesh(cyl(0.16, 0.24, 1.0, 6, 1), this.NM.basalt), this.X(x), y + 0.5, z));
    this.deco(new THREE.CylinderGeometry(0.5, 0.25, 0.32, 8), this.NM.bronze, x, y + 1.1, z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), this.NM.spiritFire);
    flame.position.set(this.X(x), y + 1.5, z);
    this.D.add(flame);
    const L = this.B.lights.add({ x: this.X(x), y: y + 1.8, z, color: 0x5ae0c0, power: 14, range: 11, flicker: 0.4 });
    this.onUpdate.push((dt) => { flame.scale.set(1, 0.85 + Math.sin(this.t * 9 + x) * 0.15, 1); });
    return L;
  }

  // En sarkofag (står i vägen, kan vara ett hinder för utfall)
  sarcophagus(x, z, ry = 0, y = 0) {
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = ry;
    this.D.add(g);
    g.add(place(new THREE.Mesh(box(1.2, 0.9, 2.4, 1), this.NM.basalt), 0, 0.45, 0));
    g.add(place(new THREE.Mesh(box(1.3, 0.25, 2.5, 1), this.NM.bronze), 0, 1.0, 0));
    g.add(place(new THREE.Mesh(box(0.5, 0.2, 0.5, 1), this.NM.gold), 0, 1.2, 0.8));
    const w = Math.abs(Math.sin(ry)) > 0.5 ? [1.25, 0.65] : [0.65, 1.25];
    this.onConnect.push((c) => c.addBox(this.X(x) - w[0], y, z - w[1], this.X(x) + w[0], y + 1.15, z + w[1], 'sarc'));
    return { x: this.X(x), z, r: 1.0 };
  }

  // En schakalstaty (Anubis vaktar gravarna)
  jackal(x, z, face, y = 0, s = 1) {
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = face;
    g.scale.setScalar(s);
    this.area.root.add(g);
    const J = this.NM.jackal, Gd = this.NM.gold;
    g.add(place(new THREE.Mesh(box(1.4, 0.6, 2.2, 1), this.NM.basalt), 0, 0.3, 0));
    g.add(place(new THREE.Mesh(box(0.9, 0.9, 1.6, 1), J), 0, 1.05, -0.1));
    g.add(place(new THREE.Mesh(box(0.7, 1.1, 0.6, 1), J), 0, 1.6, 0.5));
    g.add(place(new THREE.Mesh(box(0.5, 0.45, 0.55, 1), J), 0, 2.3, 0.65));
    g.add(place(new THREE.Mesh(box(0.26, 0.24, 0.45, 1), J), 0, 2.22, 1.05));
    for (const sd of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), J);
      ear.position.set(0.15 * sd, 2.72, 0.6);
      g.add(ear);
    }
    g.add(place(new THREE.Mesh(box(0.74, 0.12, 0.64, 1), Gd), 0, 1.98, 0.5));
    this.B.hidden(new THREE.BoxGeometry(1.4 * s, 2.8 * s, 2.2 * s), this.X(x), y + 1.4 * s, z, 0, face, 0);
    return g;
  }

  // ---------------- vatten ----------------
  // En bassäng: ytan står på levels[state.water[group]]. bottom: botten (där det finns golv)
  pool(id, x0, x1, z0, z1, bottom, levels, o = {}) {
    const NM = this.NM;
    const t = NM.waterTex.clone();
    t.needsUpdate = true;
    t.repeat.set((x1 - x0) / 4, (z1 - z0) / 4);
    const mat = NM.water.clone();
    mat.map = t;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 4;
    this.D.add(m);
    const pool = { id, group: o.group ?? id, x0: this.X(x0), x1: this.X(x1), z0, z1, bottom, levels, level: levels[o.start ?? 0], target: levels[o.start ?? 0], start: o.start ?? 0, m, tex: t, splashT: 0 };
    m.position.set((pool.x0 + pool.x1) / 2, pool.level, (z0 + z1) / 2);
    this.pools.push(pool);
    // 0.15: bassängen går att simma i när Cello har lärt sig
    this.area.waters.push({ x0: pool.x0, x1: pool.x1, z0, z1, y: () => (pool.level > pool.bottom + 0.05 ? pool.level : null) });
    return pool;
  }

  waterIndex(group) {
    const w = this.state.water ?? (this.state.water = {});
    const p = this.pools.find((q) => q.group === group);
    return w[group] ?? p?.start ?? 0;
  }

  setWater(group, idx, instant = false) {
    const w = this.state.water ?? (this.state.water = {});
    w[group] = idx;
    for (const p of this.pools) {
      if (p.group !== group) continue;
      p.target = p.levels[Math.min(idx, p.levels.length - 1)];
      if (instant) { p.level = p.target; p.m.position.y = p.level; }
    }
  }

  // Ett sarkofaglock som flyter på vattnet (står på rest när vattnet är lägre)
  floater(id, group, x, z, w, d, rest) {
    const NM = this.NM;
    const g = new THREE.Group();
    g.add(place(new THREE.Mesh(box(w, 0.5, d, 1), NM.bronze), 0, -0.25, 0));
    g.add(place(new THREE.Mesh(box(w * 0.4, 0.12, d * 0.6, 1), NM.gold), 0, 0.02, 0));
    this.D.add(g);
    const f = { id, group, x: this.X(x), z, x0: this.X(x) - w / 2, x1: this.X(x) + w / 2, z0: z - d / 2, z1: z + d / 2, rest, top: rest, g, box: null };
    g.position.set(f.x, f.top, z);
    this.floaters.push(f);
    return f;
  }

  // Slussratten: vrids med E och väljer nästa vattennivå (efter en kort stund, så att Cello hinner kliva på ett lock)
  sluice(id, group, x, z, o = {}) {
    const y = o.y ?? 0, NM = this.NM;
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = o.face ?? 0;
    this.D.add(g);
    this.B.solid(place(new THREE.Mesh(box(0.6, 1.4, 0.6, 1), NM.basalt), this.X(x), y + 0.7, z));
    const wheel = new THREE.Group();
    wheel.position.set(0, 1.5, 0.35);
    g.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 4, 16), NM.bronze));
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), NM.bronze);
      sp.rotation.z = (k / 4) * Math.PI;
      wheel.add(sp);
    }
    const sl = { id, group, g, wheel, spin: 0, pending: null, delay: o.delay ?? 2.2, labels: o.labels };
    this.sluices.push(sl);
    const fx = Math.sin(o.face ?? 0), fz = Math.cos(o.face ?? 0);
    this.interactions.push({
      label: 'Turn the sluice wheel', area: this.id, pos: () => this.V(x + fx * 1.1, y, z + fz * 1.1), radius: 1.6,
      ok: () => !sl.pending && this.pools.filter((p) => p.group === group).every((p) => Math.abs(p.level - p.target) < 0.02),
      run: () => this.turnSluice(sl),
    });
    return sl;
  }

  turnSluice(sl) {
    const pools = this.pools.filter((p) => p.group === sl.group);
    const n = Math.max(...pools.map((p) => p.levels.length));
    const next = (this.waterIndex(sl.group) + 1) % n;
    sl.pending = { t: sl.delay, idx: next };
    sl.spin = 1.6;
    this.game?.sfx.play('rotor', { vol: 1 });
    this.game?.sfx.play('stonegrind', { vol: 0.8 });
    const names = sl.labels ?? ['low', 'middle', 'high'];
    const rising = pools[0].levels[next] > pools[0].level;
    this.game?.hud.toast(`The sluice groans... the water will ${rising ? 'rise' : 'fall'} (${names[next] ?? next + 1}).`, 2800);
  }

  // ---------------- de dödas värld ----------------
  // En platta eller bro som bara finns i de dödas värld (side 'dead'), eller en falsk vägg (side 'living')
  ghostSlab(x0, x1, y0, y1, z0, z1, side = 'dead', mat = null) {
    const m = new THREE.Mesh(box(x1 - x0, y1 - y0, z1 - z0, 2), mat ?? (side === 'dead' ? this.NM.spiritFire : this.wallMat));
    m.position.set(this.X((x0 + x1) / 2), (y0 + y1) / 2, (z0 + z1) / 2);
    this.D.add(m);
    const gh = { meshes: [m], side, ext: [this.X(x0), y0, z0, this.X(x1), y1, z1], box: null };
    if (side === 'dead') {
      // En svag kontur som syns även bland de levande, så att spelaren anar att något finns där
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x3a8a7a, transparent: true, opacity: 0.18 }));
      edge.position.copy(m.position);
      this.D.add(edge);
      gh.edge = edge;
    }
    this.ghosts.push(gh);
    return gh;
  }

  // En ande att prata med (bara i de dödas värld)
  spirit(id, x, z, lines, o = {}) {
    this.spiritDefs.push({ id: `${this.id}:${id}`, area: this.id, pos: this.V(x, o.y ?? 0, z), face: o.face ?? 0, lines, name: o.name ?? 'Spirit', look: o.look, when: o.when, label: o.label, onTalk: o.onTalk, jackal: o.jackal });
  }

  // En nisch i väggen med en sovande mumie (axis: väggen går längs x eller z; side: åt vilket håll nischen öppnar)
  niche(x, z, face, o = {}) {
    const y = o.y ?? 0, NM = this.NM;
    const g = new THREE.Group();
    g.position.set(this.X(x), y, z);
    g.rotation.y = face;
    this.area.root.add(g);
    g.add(place(new THREE.Mesh(box(1.8, 0.2, 1.4, 1), NM.bone), 0, 0.1, -0.2));
    g.add(place(new THREE.Mesh(box(1.8, 0.2, 1.4, 1), NM.bone), 0, 2.6, -0.2));
    for (const s of [-1, 1]) g.add(place(new THREE.Mesh(box(0.2, 2.6, 1.4, 1), NM.bone), s * 0.9, 1.3, -0.2));
    return g;
  }

  // ---------------- läge ----------------
  applyState() {
    const s = this.state;
    s.water = s.water || {};
    super.applyState();
    const groups = new Set(this.pools.map((p) => p.group));
    for (const gr of groups) this.setWater(gr, this.waterIndex(gr), true);
    for (const sl of this.sluices) sl.pending = null;
    for (const f of this.floaters) this.placeFloater(f, true);
    this.afterNecro?.();
  }

  // Cello dog: bossens vatten och tillkallade vålnader går tillbaka
  onPlayerDeath() {
    super.onPlayerDeath();
    this.afterNecro?.();
  }

  floaterTop(f) {
    const pool = this.pools.find((p) => p.group === f.group && f.x > p.x0 && f.x < p.x1 && f.z > p.z0 && f.z < p.z1);
    return Math.max(f.rest, pool ? pool.level + 0.15 : f.rest);
  }

  placeFloater(f, instant = false) {
    const top = this.floaterTop(f);
    f.top = instant ? top : f.top;
    f.g.position.y = f.top;
    if (f.box) { f.box.min.y = f.top - 0.5; f.box.max.y = f.top; }
  }

  inPool(q) {
    return this.pools.find((p) => q.x > p.x0 && q.x < p.x1 && q.z > p.z0 && q.z < p.z1) ?? null;
  }

  // ---------------- varje bildruta ----------------
  update(dt, frozen = false) {
    super.update(dt, frozen);
    const g = this.game;
    if (!g) return;
    const p = g.player;
    // Slussarna: vattnet börjar röra sig efter en kort stund
    for (const sl of this.sluices) {
      if (sl.spin > 0) { sl.spin -= dt; sl.wheel.rotation.z += dt * 4; }
      if (sl.pending && !frozen) {
        sl.pending.t -= dt;
        if (sl.pending.t <= 0) {
          this.setWater(sl.group, sl.pending.idx);
          sl.pending = null;
          g.sfx.play('sandrush', { vol: 0.8 });
          g.story.save(true);
        }
      }
    }
    // Vattenytorna rör sig mot sin nivå; texturen rinner
    for (const pool of this.pools) {
      pool.tex.offset.x += dt * 0.03;
      pool.tex.offset.y += dt * 0.02;
      if (Math.abs(pool.level - pool.target) > 0.001) {
        const step = Math.sign(pool.target - pool.level) * Math.min(Math.abs(pool.target - pool.level), dt * 1.3);
        pool.level += step;
        pool.m.position.y = pool.level;
      }
      pool.m.visible = pool.level > pool.bottom + 0.05;
    }
    // Locken flyter; Cello följer med när de lyfts
    for (const f of this.floaters) {
      const top = this.floaterTop(f);
      const before = f.top;
      f.top = approach(f.top, top, 3, dt);
      if (Math.abs(f.top - top) < 0.002) f.top = top;
      f.g.position.y = f.top + Math.sin(this.t * 1.8 + f.x) * 0.03 * (top > f.rest + 0.05 ? 1 : 0);
      if (f.box) { f.box.min.y = f.top - 0.5; f.box.max.y = f.top; }
      const on = p.feet.x > f.x0 - 0.2 && p.feet.x < f.x1 + 0.2 && p.feet.z > f.z0 - 0.2 && p.feet.z < f.z1 + 0.2;
      if (on && f.top > before && p.feet.y < f.top + 0.08 && p.feet.y > before - 0.6) p.teleport(p.feet.clone().setY(f.top + 0.02));
    }
    // Cello kan inte simma: djupt vatten skickar honom tillbaka (som ett fall)
    const pool = this.inPool(p.feet);
    if (pool && p.state !== 'dead' && pool.level > pool.bottom + 0.05) {
      const depth = pool.level - p.feet.y;
      if (depth > 0.05 && depth < 0.9 && (pool.splashT -= dt) <= 0 && Math.hypot(p.vel.x, p.vel.z) > 1) {
        pool.splashT = 0.35;
        g.fx.burst('spark', p.feet.clone().setY(pool.level + 0.05), 4, 0x9ae8d8);
      }
      if (depth > 0.95 && !p.drowning && !p.canSwim) {
        p.drowning = true;
        g.sfx.play('splash', { vol: 1 });
        g.fx.burst('spark', p.feet.clone().setY(pool.level + 0.1), 22, 0x9ae8d8);
        if (!this.hinted.drown) {
          this.hinted.drown = true;
          g.hud.toast("Cello can't swim! Lower the water with a sluice wheel, or find something that floats.", 4200);
        }
      }
    }
    // Återuppståndelsen får aldrig ligga under vattenytan
    if (this.pools.length) {
      // Reservplatsen tas bara utanför bassängerna, så att den aldrig hamnar under vattnet senare
      const sp = this.inPool(p.safe);
      const under = sp && p.safe.y < sp.level - 0.3 && sp.level > sp.bottom + 0.05;
      if (under) { if (this.safeWater) p.safe.copy(this.safeWater); }
      else if (!sp) (this.safeWater ??= new THREE.Vector3()).copy(p.safe);
    }
  }
}

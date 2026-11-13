// Byggdelar för Frostgiant's Maw (0.16): glidis (Cello glider rakt fram tills han slår i något), stenblock att
// stanna mot, rimfrostgaller (Cello kommer inte igenom, men Lokis skugga gör det), roterande nav i labyrinten
// (en spak vrider ringen och byter vilka gångar som är öppna), och bossarna: isvargen Hati och frostjätten Thrym.
import * as THREE from 'three';
import { Wing } from './dkit.js';
import { box, cyl, place } from './geom.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

let FMs = null;
export function frostMats(M) {
  if (FMs) return FMs;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  // Blå is med vita sprickor: jättens frusna kött och ben
  g.fillStyle = '#8eb4cc';
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(${200 + Math.random() * 55},${225 + Math.random() * 30},255,${0.08 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 6, 1 + Math.random() * 2);
  }
  g.strokeStyle = 'rgba(240,250,255,0.45)';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.random() * 64, Math.random() * 64); for (let k = 0; k < 4; k++) g.lineTo(Math.random() * 64, Math.random() * 64); g.stroke(); }
  g.fillStyle = 'rgba(40,70,100,0.35)';
  g.fillRect(0, 0, 64, 2); g.fillRect(0, 32, 64, 2); g.fillRect(0, 0, 2, 32); g.fillRect(32, 32, 2, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  FMs = {
    wall: lam({ map: t }),
    wallDark: lam({ map: t, color: 0x6a8aa0 }),
    floor: lam({ map: M.snow.map, color: 0xe0e8f0 }),
    ice: M.ice,
    rime: new THREE.MeshPhongMaterial({ color: 0xbfe8ff, emissive: 0x2a5a7a, specular: 0xffffff, shininess: 80, transparent: true, opacity: 0.8 }),
    bone: lam({ color: 0xe8e2d4, flatShading: true }),
    iron: lam({ color: 0x4a5058, flatShading: true }),
    rock: lam({ map: t, color: 0xb8d4ea, emissive: 0x18283a }),
    glow: new THREE.MeshBasicMaterial({ color: 0x9fe4ff }),
    curse: new THREE.MeshBasicMaterial({ color: 0xb06aff }),
    eye: new THREE.MeshBasicMaterial({ color: 0x9fe4ff }),
    fur: lam({ color: 0xf2f8ff, emissive: 0x1a2a3a, flatShading: true }),
    furDark: lam({ color: 0x7a94b4, emissive: 0x0a1420, flatShading: true }),
    skin: lam({ color: 0x7a9ab4, flatShading: true }),
    skinDark: lam({ color: 0x4a6a84, flatShading: true }),
    wood: lam({ map: M.wood.map, color: 0x6a5240 }),
  };
  return FMs;
}

export class FrostWing extends Wing {
  constructor(B, area, dungeon, opts) {
    super(B, area, dungeon, opts);
    this.hubs = [];
    this.rimes = [];
  }

  // Glidis i en rektangel (lokala koordinater) på höjden y
  glideFloor(x0, x1, z0, z1, y = 0) {
    const FM = frostMats(this.B.M);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), FM.ice);
    m.rotation.x = -Math.PI / 2;
    m.position.set(this.X((x0 + x1) / 2), y + 0.02, (z0 + z1) / 2);
    this.area.root.add(m);
    this.area.ices.push({ x0: this.X(x0), x1: this.X(x1), z0, z1, y, kind: 'glide', lane: 2 });
  }

  // Ett isblock att stanna mot: fyller en ruta i glidisen (2 m i fyrkant)
  stopper(x, z, y = 0, s = 2) {
    const FM = frostMats(this.B.M);
    this.B.solid(place(new THREE.Mesh(box(s, 2.4, s, 1), FM.rock), this.X(x), y + 1.2, z));
    this.deco(new THREE.ConeGeometry(s * 0.4, 0.8, 5), FM.rime, x, y + 2.8, z);
  }

  // Rimfrostgaller: istappar som Cello inte kommer igenom, men skuggan flyger igenom dem
  rime(id, x0, x1, z0, z1, y0 = 0, y1 = 3.8) {
    const FM = frostMats(this.B.M);
    const g = new THREE.Group();
    const along = x1 - x0 > z1 - z0 ? 'x' : 'z', len = Math.max(x1 - x0, z1 - z0);
    const n = Math.max(3, Math.round(len / 0.45));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const h = (y1 - y0) * (0.85 + Math.random() * 0.15);
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.11, h, 5), FM.rime);
      ic.rotation.x = Math.PI;
      const px = along === 'x' ? this.X(x0) + t * (x1 - x0) : this.X((x0 + x1) / 2);
      const pz = along === 'z' ? z0 + t * (z1 - z0) : (z0 + z1) / 2;
      ic.position.set(px, y1 - h / 2, pz);
      g.add(ic);
    }
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? x1 - x0 : 0.3, 0.3, along === 'z' ? z1 - z0 : 0.3), FM.rime), this.X((x0 + x1) / 2), y1 - 0.15, (z0 + z1) / 2));
    this.D.add(g);
    const r = { id, g, box: null };
    this.rimes.push(r);
    this.onConnect.push((c) => {
      r.box = c.addBox(this.X(x0), y0, z0, this.X(x1), y1, z1, `rime-${id}`);
      r.box.shadowPass = true;
    });
    return r;
  }

  // Ett vridbart nav: en fyrkantig sal med fyra mynningar (N, S, E, W) och en vridskiva i golvet med en spak.
  // Spaken vrider skivan ett kvarts varv: isportarna i två mynningar sjunker ner, de andra två reser sig.
  // states: vilka mynningar som är öppna i varje läge
  hub(id, x, z, o = {}) {
    const FM = frostMats(this.B.M);
    const half = o.half ?? 7, y = o.y ?? 0, states = o.states ?? [['N', 'S'], ['E', 'W']];
    // Vridskivan: en rund platta med två lysande pilar mot de öppna mynningarna
    const disc = new THREE.Group();
    disc.position.set(this.X(x), y + 0.03, z);
    disc.add(new THREE.Mesh(new THREE.CircleGeometry(4.2, 32).rotateX(-Math.PI / 2), FM.wallDark));
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.0, 4.3, 40).rotateX(-Math.PI / 2), FM.glow);
    ring.position.y = 0.01;
    disc.add(ring);
    for (const s of [-1, 1]) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 3).rotateX(Math.PI / 2 * s), FM.glow);
      arrow.scale.y = 0.15;
      arrow.position.set(0, 0.02, s * 3.0);
      disc.add(arrow);
      disc.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 1.6), FM.glow), 0, 0.02, s * 1.8));
    }
    this.D.add(disc);
    // Spaken i mitten
    const lever = new THREE.Group();
    lever.position.set(this.X(x), y, z);
    lever.add(place(new THREE.Mesh(cyl(0.45, 0.6, 1.1, 8, 1), FM.wall), 0, 0.55, 0));
    const arm = new THREE.Group();
    arm.position.y = 1.1;
    arm.add(place(new THREE.Mesh(cyl(0.06, 0.06, 1.1, 5, 1), FM.iron), 0, 0.5, 0));
    arm.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), FM.glow), 0, 1.05, 0));
    arm.rotation.x = 0.6;
    lever.add(arm);
    this.D.add(lever);
    this.B.hidden(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 8), this.X(x), y + 0.55, z);
    // Isportarna i mynningarna (en vägg av rimfrost som sjunker ner i golvet)
    const gates = {};
    for (const [d, [dx, dz]] of Object.entries(DIRS)) {
      const g = new THREE.Group();
      const gx = this.X(x) + dx * (half + 0.5), gz = z + dz * (half + 0.5);
      g.position.set(gx, y, gz);
      if (dx) g.rotation.y = Math.PI / 2;
      g.add(place(new THREE.Mesh(box(3.0, 3.9, 0.5, 1), FM.rime), 0, 1.95, 0));
      for (let k = -2; k <= 2; k++) g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 5), FM.rime), k * 0.6, 4.2, 0));
      this.D.add(g);
      gates[d] = { g, x: gx, z: gz, dx, dz, h: 0, box: null };
    }
    const h = { id, x: this.X(x), z, y, half, disc, arm, states, idx: 0, rot: 0, target: 0, gates };
    this.hubs.push(h);
    this.onConnect.push((c) => {
      for (const [d, gt] of Object.entries(gates)) {
        const hw = gt.dx ? 0.5 : 1.6, hd = gt.dz ? 0.5 : 1.6;
        gt.box = c.addBox(gt.x - hw, y, gt.z - hd, gt.x + hw, y + 4.2, gt.z + hd, `hub-${id}-${d}`);
      }
      this.syncHub(h, true);
    });
    this.interactions.push({
      label: 'Pull the lever', area: this.id, pos: () => this.V(x, y, z + 1.3), radius: 1.9,
      ok: () => true,
      run: () => {
        const G = this.game;
        h.idx = (h.idx + 1) % states.length;
        this.state.hubs = this.state.hubs || {};
        this.state.hubs[id] = h.idx;
        this.syncHub(h);
        G.sfx.play('stonegrind');
        G.sfx.play('icecrack', { vol: 0.8 });
        G.rig.shake(0.3);
        if (!this.hinted[`hub${id}`]) { this.hinted[`hub${id}`] = true; G.hud.toast('With a grinding of ice, the floor turns. Two gates sink, and two rise.', 3400); }
        G.story.save(true);
      },
    });
    return h;
  }

  // Masken: Loke talar när Cello tar upp den
  openChest(c) {
    if (c.item !== 'mask') return super.openChest(c);
    c.open = true;
    if (!this.state.chests.includes(c.id)) this.state.chests.push(c.id);
    this.game.sfx.play('chest');
    this.game.story.itemGet('mask', () => this.game.story.frost?.maskFound?.());
  }

  hubOpen(h, d) { return h.states[h.idx].includes(d); }

  syncHub(h, instant = false) {
    for (const [d, gt] of Object.entries(h.gates)) {
      const open = this.hubOpen(h, d);
      if (gt.box) gt.box.enabled = !open;
      gt.target = open ? -4.3 : 0;
      if (instant) { gt.h = gt.target; gt.g.position.y = h.y + gt.h; }
    }
    // Skivans pilar pekar mot de öppna mynningarna (N/S i grundläget)
    const open = h.states[h.idx];
    h.target = open.includes('E') || open.includes('W') ? Math.PI / 2 : 0;
    if (instant) { h.rot = h.target; h.disc.rotation.y = h.rot; }
  }

  applyState() {
    super.applyState();
    const s = this.state;
    s.hubs = s.hubs || {};
    for (const h of this.hubs) {
      h.idx = s.hubs[h.id] ?? 0;
      this.syncHub(h, true);
    }
    this.afterMaw?.();
    this.syncColliders();
  }

  update(dt, frozen = false) {
    super.update(dt, frozen);
    for (const h of this.hubs) {
      if (Math.abs(h.rot - h.target) > 0.001) {
        h.rot = approach(h.rot, h.target, 3, dt);
        h.disc.rotation.y = h.rot;
      }
      h.arm.rotation.x = approach(h.arm.rotation.x, h.idx % 2 ? -0.6 : 0.6, 6, dt);
      for (const gt of Object.values(h.gates)) {
        gt.h += Math.sign(gt.target - gt.h) * Math.min(Math.abs(gt.target - gt.h), dt * 5);
        gt.g.position.y = h.y + gt.h;
        gt.g.visible = gt.h > -4.2;
      }
    }
  }
}

// =====================================================================
// Hati: isvargen som jagar månen. Snabb, cirklar runt Cello och kastar sig fram.
// Missar språnget glider den på isen och blir yr. Skölden eller hammarslaget gör den också yr.
// =====================================================================
function buildWolf(M) {
  const FM = frostMats(M);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const F = FM.fur, FD = FM.furDark;
  // Kroppen: en lång, låg varg med bred bringa och smal midja
  const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), F);
  chest.scale.set(1.0, 1.05, 1.15);
  chest.position.set(0, 2.0, 0.8);
  body.add(chest);
  const waist = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), F);
  waist.scale.set(0.75, 0.78, 1.25);
  waist.position.set(0, 1.95, -0.9);
  body.add(waist);
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), FD);
  ruff.scale.set(1.15, 1.1, 0.8);
  ruff.position.set(0, 2.25, 1.3);
  body.add(ruff);
  // Isspikar längs ryggen
  for (let k = 0; k < 8; k++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85 - k * 0.06, 5), FM.rime);
    sp.position.set(0, 3.0 - k * 0.1, 1.2 - k * 0.45);
    sp.rotation.x = -0.5;
    body.add(sp);
  }
  // Huvudet: en lång nos, öron och lysande ögon
  const head = new THREE.Group();
  head.position.set(0, 2.55, 2.2);
  head.add(place(new THREE.Mesh(box(1.0, 0.85, 0.95, 1), F), 0, 0, 0));
  head.add(place(new THREE.Mesh(box(0.6, 0.5, 1.1, 1), F), 0, -0.12, 0.9));
  head.add(place(new THREE.Mesh(box(0.22, 0.18, 0.2, 1), FM.iron), 0, 0.08, 1.45));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.35, 0.45);
  jaw.add(place(new THREE.Mesh(box(0.52, 0.18, 0.95, 1), FD), 0, 0, 0.45));
  for (const s of [-1, 1]) jaw.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), FM.bone), 0.18 * s, 0.17, 0.8));
  head.add(jaw);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 4), FD);
    ear.position.set(0.32 * s, 0.6, -0.15);
    ear.rotation.z = -0.25 * s;
    head.add(ear);
    head.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), FM.eye), 0.3 * s, 0.14, 0.46));
  }
  body.add(head);
  // Benen: låren och smalbenen, med tassar
  const legs = [];
  for (const [x, z, front] of [[-0.6, 1.25, 1], [0.6, 1.25, 1], [-0.5, -1.4, 0], [0.5, -1.4, 0]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 1.9, z);
    hip.add(place(new THREE.Mesh(cyl(0.34, 0.22, 1.0, 6, 1), front ? F : FD), 0, -0.5, 0));
    hip.add(place(new THREE.Mesh(cyl(0.18, 0.14, 1.0, 6, 1), F), 0, -1.35, front ? 0.05 : -0.1));
    hip.add(place(new THREE.Mesh(box(0.34, 0.16, 0.48, 1), FD), 0, -1.82, 0.12));
    body.add(hip);
    legs.push(hip);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 2.3, -1.9);
  tail.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.8, 6).rotateX(-Math.PI / 2 - 0.4), F), 0, -0.3, -0.8));
  body.add(tail);
  return { root, body, head, jaw, legs, tail, mats: [F, FD] };
}

export class Hati {
  constructor(scene, center, radius, M) {
    this.center = center.clone();
    this.radius = radius;
    this.model = buildWolf(M);
    scene.add(this.model.root);
    this.pos = center.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 5;
    this.hitRadius = 2.0;
    this.onEvent = null;
    this.blockHint = 'Hati is too quick to hit! Make it miss its leap, or block it with the shield.';
    this.immuneHint = this.blockHint;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(this.ring);
    this.reset();
  }

  reset() {
    this.hp = 8;
    this.combo = 0;
    this.state = 'dormant';
    this.st = 0;
    this.pos.copy(this.center).add(new THREE.Vector3(0, 0, -this.radius + 3));
    this.facing = 0;
    this.side = 1;
    this.cool = 2;
    this.flash = 0;
    this.hitDone = false;
    this.leap = null;
    this.model.root.visible = false;
    this.ring.material.opacity = 0;
    this.animate(0.001);
  }

  get phase() { return this.hp > 4 ? 1 : 2; }
  get targetable() { return !['dormant', 'dead', 'gone'].includes(this.state); }
  get stunned() { return this.state === 'skid' || this.state === 'dazed'; }
  get chest() { return this.chestPos.copy(this.pos).add(new THREE.Vector3(0, 2.2, 0)); }

  wake() {
    if (this.state !== 'dormant') return;
    this.model.root.visible = true;
    this.setState('howl');
  }

  setState(s) { this.state = s; this.st = 0; }

  canSwordHit(player) { return Math.hypot(this.pos.x - player.feet.x, this.pos.z - player.feet.z) < 3.2; }

  hurt(dmg) {
    if (!this.targetable) return false;
    if (!this.stunned) return 'blocked';
    this.hp -= dmg;
    this.flash = 0.15;
    if (this.hp <= 0) { this.setState('dead'); this.onEvent?.('dying', this); return 'killed'; }
    return 'hit';
  }

  slamHit(point) {
    if (!this.targetable || this.stunned) return;
    if (Math.hypot(point.x - this.pos.x, point.z - this.pos.z) < 4.5) { this.setState('dazed'); this.onEvent?.('dazed', this); }
  }

  dashHit(p) {
    if (!this.targetable || Math.hypot(this.pos.x - p.feet.x, this.pos.z - p.feet.z) > 3) return false;
    return this.stunned ? this.hurt(2) : 'blocked';
  }

  update(dt, g) {
    const p = g.player;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const C = this.center;
    const dx = p.feet.x - this.pos.x, dz = p.feet.z - this.pos.z, distP = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    switch (this.state) {
      case 'howl':
        this.facing = toP;
        if (this.st < 0.1) { g.sfx.play('howl'); g.rig.shake(0.4); }
        if (this.st > 2) { this.setState('stalk'); this.onEvent?.('awake', this); }
        break;
      case 'stalk': {
        // Cirklar runt Cello på sju meters avstånd
        const ang = Math.atan2(this.pos.x - p.feet.x, this.pos.z - p.feet.z) + this.side * dt * 0.9;
        const want = new THREE.Vector3(p.feet.x + Math.sin(ang) * 7, this.pos.y, p.feet.z + Math.cos(ang) * 7);
        this.moveTo(want, 9, dt);
        this.facing = approach(this.facing, this.facing + wrap(toP - this.facing), 8, dt);
        this.cool -= dt;
        if (this.cool <= 0) { this.setState('crouch'); this.leap = { from: this.pos.clone(), to: p.feet.clone() }; g.sfx.play('growl', { vol: 1 }); }
        if (Math.random() < dt * 0.3) this.side *= -1;
        break;
      }
      case 'crouch': {
        // Siktar: ringen visar var språnget landar
        const wind = this.phase === 2 ? 0.55 : 0.75;
        if (this.st < wind * 0.7) this.leap.to.set(p.feet.x, p.feet.y, p.feet.z);
        this.facing = Math.atan2(this.leap.to.x - this.pos.x, this.leap.to.z - this.pos.z);
        this.ring.position.set(this.leap.to.x, this.leap.to.y + 0.06, this.leap.to.z);
        this.ring.material.opacity = 0.35 + 0.45 * Math.sin(this.st * 22) ** 2;
        if (this.st > wind) {
          this.ring.material.opacity = 0;
          // Språnget går lite förbi målet
          const d = new THREE.Vector3().subVectors(this.leap.to, this.pos).setY(0);
          const L = d.length();
          this.leap.from.copy(this.pos);
          this.leap.to.copy(this.pos).addScaledVector(d.normalize(), Math.min(L + 3, 16));
          this.clampIn(this.leap.to);
          this.leap.dur = 0.55;
          this.hitDone = false;
          this.setState('leap');
          g.sfx.play('roar', { vol: 0.6 });
        }
        break;
      }
      case 'leap': {
        const k = Math.min(1, this.st / this.leap.dur);
        this.pos.lerpVectors(this.leap.from, this.leap.to, k);
        this.pos.y = this.center.y + Math.sin(k * Math.PI) * 2.6;
        if (!this.hitDone && k > 0.3 && distP < 2.4 && Math.abs(p.feet.y - this.pos.y) < 2.4) {
          const res = p.takeHit(2, this.pos);
          // Rullar Cello undan (osårbar) räknas det som en miss
          if (res !== 'ignored') this.hitDone = true;
          if (res === 'blocked') { this.setState('dazed'); g.sfx.play('clang'); g.rig.shake(0.4); this.onEvent?.('blocked', this); break; }
        }
        if (k >= 1) {
          this.pos.y = this.center.y;
          if (this.hitDone) { this.cool = 1.6; this.combo = 0; this.setState('stalk'); }
          else if (this.phase === 2 && this.combo === 0) {
            // Andra fasen: vargen landar på alla fyra och kastar sig genast igen
            this.combo = 1;
            this.leap = { from: this.pos.clone(), to: p.feet.clone() };
            this.setState('crouch');
            this.st = 0.2;
            g.sfx.play('growl', { vol: 1 });
          } else { this.combo = 0; this.setState('skid'); g.sfx.play('glide', { vol: 1.4 }); this.onEvent?.('skid', this); }
        }
        break;
      }
      case 'skid': {
        // Glider på isen och snurrar runt
        const k = Math.max(0, 1 - this.st * 1.5);
        const d = new THREE.Vector3().subVectors(this.leap.to, this.leap.from).setY(0).normalize();
        this.pos.addScaledVector(d, k * 7 * dt);
        this.clampIn(this.pos);
        this.facing += dt * k * 8;
        if (this.st > 2.6) { this.cool = 1.4; this.setState('stalk'); }
        break;
      }
      case 'dazed':
        this.combo = 0;
        if (this.st > (this.phase === 2 ? 1.9 : 2.4)) { this.cool = 1.2; this.setState('stalk'); }
        break;
      case 'dead':
        if (Math.random() < dt * 18) g.fx.burst('spark', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), 3, 0x9fe4ff);
        if (this.st > 2.2) { this.state = 'gone'; this.model.root.visible = false; this.onEvent?.('defeated', this); }
        break;
      default:
        break;
    }
    if (this.targetable && distP < 1.8 && this.state !== 'leap') {
      const k = (1.8 - distP) / 1.8;
      p.nudge(-dx / (distP || 1) * -k * 0.15, -dz / (distP || 1) * -k * 0.15);
    }
    this.animate(dt);
  }

  moveTo(want, sp, dt) {
    const d = new THREE.Vector3().subVectors(want, this.pos).setY(0);
    const L = d.length();
    if (L > 0.05) this.pos.addScaledVector(d, Math.min(1, (sp * dt) / L));
    this.clampIn(this.pos);
  }

  clampIn(v) {
    const C = this.center, d = Math.hypot(v.x - C.x, v.z - C.z), m = this.radius - 2;
    if (d > m) { v.x = C.x + (v.x - C.x) / d * m; v.z = C.z + (v.z - C.z) / d * m; }
  }

  animate(dt) {
    const m = this.model, t = performance.now() / 1000;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    const run = this.state === 'stalk' ? 12 : this.state === 'leap' ? 0 : 0;
    m.legs.forEach((l, i) => {
      l.rotation.x = run ? Math.sin(t * run + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.4) * 0.7 : this.state === 'leap' ? (i < 2 ? -1.0 : 0.9) : this.state === 'crouch' ? 0.3 : 0;
    });
    m.body.position.y = this.state === 'crouch' ? -0.5 : 0;
    m.body.rotation.z = this.state === 'dazed' || this.state === 'skid' ? Math.sin(t * 6) * 0.15 : 0;
    m.head.rotation.x = this.state === 'howl' ? -0.9 : this.state === 'dazed' ? 0.5 : 0;
    m.jaw.rotation.x = this.state === 'howl' || this.state === 'crouch' ? 0.5 : 0.08;
    m.tail.rotation.y = Math.sin(t * 5) * 0.3;
    const f = this.flash > 0 ? 0.6 : 0;
    for (const mt of m.mats) mt.emissive?.setRGB(f, f, f);
  }
}

// =====================================================================
// Thrym: frostjätten som Kronos har tagit. Han ser bara det som rör sig: kastar Cello sin skugga, slår
// Thrym mot den med klubban. Klubban fastnar i isen och han måste böja sig ner: kristallen i kronan ligger öppen.
// =====================================================================
function buildGiant(M) {
  const FM = frostMats(M);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const S = FM.skin, SD = FM.skinDark;
  for (const s of [-1, 1]) {
    body.add(place(new THREE.Mesh(cyl(1.1, 0.9, 6, 8, 2), SD), 1.6 * s, 3, 0));
    body.add(place(new THREE.Mesh(box(1.8, 1, 2.6, 1), FM.furDark), 1.6 * s, 0.5, 0.4));
  }
  const torso = new THREE.Group();
  torso.position.y = 6;
  body.add(torso);
  torso.add(place(new THREE.Mesh(box(5.2, 5.5, 3.2, 2), S), 0, 2.8, 0));
  torso.add(place(new THREE.Mesh(box(5.6, 1.8, 3.6, 2), FM.fur), 0, 0.6, 0)); // pälsbälte
  torso.add(place(new THREE.Mesh(box(6.2, 1.6, 3.8, 2), FM.fur), 0, 5.4, 0)); // pälsmantel
  const neck = new THREE.Group();
  neck.position.set(0, 6.2, 0.4);
  torso.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 1.4, 0.2);
  neck.add(head);
  head.add(place(new THREE.Mesh(box(2.6, 2.8, 2.6, 2), S), 0, 0.3, 0));
  // Skägg av istappar
  for (let k = -3; k <= 3; k++) {
    const ic = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8 - Math.abs(k) * 0.2, 5), FM.rime);
    ic.rotation.x = Math.PI;
    ic.position.set(k * 0.36, -1.5, 1.1);
    head.add(ic);
  }
  for (const s of [-1, 1]) head.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), FM.eye), 0.65 * s, 0.6, 1.32));
  // Kronan av is, och Kronos kristall mitt fram
  const crown = new THREE.Group();
  crown.position.y = 1.85;
  head.add(crown);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    crown.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 4), FM.rime), Math.sin(a) * 1.2, 0.4, Math.cos(a) * 1.2));
  }
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), FM.curse);
  crystal.scale.y = 1.6;
  crystal.position.set(0, 0.3, 1.35);
  crown.add(crystal);
  // Armar: vänster hänger, höger håller klubban
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(3.3 * s, 5, 0);
    torso.add(sh);
    sh.add(place(new THREE.Mesh(cyl(0.8, 0.7, 4, 7, 1), S), 0, -2, 0));
    const el = new THREE.Group();
    el.position.y = -4;
    sh.add(el);
    el.add(place(new THREE.Mesh(cyl(0.7, 0.6, 3.6, 7, 1), S), 0, -1.8, 0));
    el.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), SD), 0, -3.8, 0));
    arms.push({ sh, el, s });
  }
  // Klubban: en stock med is
  const club = new THREE.Group();
  club.position.set(0, -4, 0.2);
  club.rotation.x = Math.PI / 2;
  arms[1].el.add(club);
  club.add(place(new THREE.Mesh(cyl(0.4, 0.5, 7, 7, 2), FM.wood), 0, 3.5, 0));
  club.add(place(new THREE.Mesh(cyl(1.1, 0.9, 2.6, 8, 1), FM.rime), 0, 6.6, 0));
  return { root, body, torso, head, neck, crystal, arms, club, mats: [S, SD] };
}

// Hur djupt jätten böjer sig när klubban sitter fast (kristallen ska hamna inom svärdets räckhåll)
const KNEEL = { tx: 1.3, drop: 3.4, head: 0.3 };

export class Thrym {
  static KNEEL = KNEEL;
  // center: salens mitt på golvet · home: där jätten står (norr)
  constructor(scene, center, home, M) {
    this.center = center.clone();
    this.home = home.clone();
    this.model = buildGiant(M);
    scene.add(this.model.root);
    this.pos = home.clone();
    this.chestPos = new THREE.Vector3();
    this.radiusBig = 14;
    this.hitRadius = 2.4;
    this.onEvent = null;
    this.blockHint = 'Thrym\'s crown is far out of reach. Loki whispers: "Give him something to chase..."';
    this.immuneHint = this.blockHint;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(this.ring);
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(this.wave);
    this.reset();
  }

  reset() {
    this.hp = 9;
    this.hits = 0;
    this.state = 'dormant';
    this.st = 0;
    this.pos.copy(this.home);
    this.facing = Math.atan2(this.center.x - this.home.x, this.center.z - this.home.z);
    this.slam = null;
    this.cool = 3;
    this.flash = 0;
    this.waveT = -1;
    this.ring.material.opacity = 0;
    this.wave.material.opacity = 0;
    this.animate(0.001);
  }

  get phase() { return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3; }
  get targetable() { return !['dormant', 'dead', 'gone'].includes(this.state); }
  get stunned() { return this.state === 'stuck'; }
  get chest() {
    this.model.root.updateMatrixWorld(true);
    return this.model.crystal.getWorldPosition(this.chestPos);
  }

  wake() { if (this.state === 'dormant') this.setState('rise'); }
  setState(s) { this.state = s; this.st = 0; }

  canSwordHit(player) {
    if (this.state !== 'stuck') return false;
    const c = this.chest;
    return Math.hypot(c.x - player.feet.x, c.z - player.feet.z) < 3.0 && Math.abs(c.y - player.feet.y - 1) < 2.6;
  }

  hurt() {
    if (!this.targetable) return false;
    if (this.state !== 'stuck') return 'blocked';
    this.hp -= 1;
    this.hits++;
    this.flash = 0.18;
    if (this.hp <= 0) { this.setState('dead'); this.onEvent?.('dying', this); return 'killed'; }
    if (this.hits >= 3) { this.hits = 0; this.setState('roar'); this.onEvent?.('phase', this); }
    return 'hit';
  }

  dashHit(p) {
    if (this.state !== 'stuck') return false;
    const c = this.chest;
    if (Math.hypot(c.x - p.feet.x, c.z - p.feet.z) > 3.2) return false;
    return this.hurt(2);
  }

  slamHit() {}

  // Klubbslaget mot en punkt på golvet
  startSlam(target, onShadow, g) {
    this.slam = { target: target.clone(), shadow: onShadow, hit: false };
    this.setState('raise');
    g.sfx.play('growl', { vol: 1.3 });
  }

  update(dt, g) {
    const p = g.player, sh = g.shadow;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const lookAt = (v) => { this.facing = approach(this.facing, this.facing + wrap(Math.atan2(v.x - this.pos.x, v.z - this.pos.z) - this.facing), 3, dt); };
    switch (this.state) {
      case 'rise':
        if (this.st < 0.1) { g.sfx.play('roar', { vol: 1.3 }); g.rig.shake(0.8); }
        if (this.st > 2.5) { this.setState('watch'); this.onEvent?.('awake', this); }
        break;
      case 'watch': {
        // Skuggan lockar honom alltid först
        const target = sh?.active ? sh.pos : p.feet;
        lookAt(target);
        this.cool -= dt * (this.phase === 3 ? 1.4 : 1);
        if (sh?.active && this.cool < 1.6) { this.startSlam(sh.pos, true, g); break; }
        if (this.cool <= 0) this.startSlam(p.feet, false, g);
        break;
      }
      case 'raise': {
        const s = this.slam, wind = this.phase === 3 ? 1.0 : 1.3;
        // Följer Cello en stund (inte skuggan, den står still)
        if (!s.shadow && this.st < wind * 0.6) s.target.set(p.feet.x, p.feet.y, p.feet.z);
        lookAt(s.target);
        this.ring.position.set(s.target.x, s.target.y + 0.08, s.target.z);
        this.ring.material.opacity = 0.3 + 0.45 * Math.sin(this.st * (this.st > wind * 0.6 ? 24 : 10)) ** 2;
        if (this.st > wind) { this.ring.material.opacity = 0; this.setState('smash'); }
        break;
      }
      case 'smash': {
        const s = this.slam;
        if (!s.hit && this.st > 0.18) {
          s.hit = true;
          g.sfx.play('stomp', { vol: 1.5 });
          g.sfx.play('crumble', { vol: 1 });
          g.rig.shake(0.9);
          g.fx.burst('debris', s.target.clone().setY(s.target.y + 0.4), 30, 0xe8f6ff);
          this.wave.position.set(s.target.x, s.target.y + 0.1, s.target.z);
          this.waveT = 0;
          if (Math.hypot(p.feet.x - s.target.x, p.feet.z - s.target.z) < 3.4 && p.feet.y < s.target.y + 2) p.takeHit(2, s.target, { unblockable: true });
          if (s.shadow) {
            if (sh?.active) { g.fx.burst('spark', sh.pos.clone().setY(sh.pos.y + 1), 26, 0x8a5aff); sh.clear(); }
            this.setState('stuck');
            this.onEvent?.('stuck', this);
            break;
          }
        }
        if (this.st > 0.9) { this.cool = this.phase === 3 ? 2.0 : 2.8; this.setState('watch'); }
        break;
      }
      case 'stuck':
        // Klubban sitter fast i isen: han böjer sig ner och drar i den
        if (this.st > 5.5) { this.cool = 2.5; this.setState('pull'); g.sfx.play('crumble'); }
        break;
      case 'pull':
        if (this.st > 1.0) this.setState('watch');
        break;
      case 'roar':
        if (this.st < 0.1) { g.sfx.play('roar', { vol: 1.4 }); g.rig.shake(1.0); }
        if (this.st > 2.2) { this.cool = 2; this.setState('watch'); }
        break;
      case 'dead':
        if (Math.random() < dt * 25) g.fx.burst('spark', this.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random(), (Math.random() - 0.5) * 3)), 3, 0xd8b0ff);
        if (this.st > 4.5) { this.state = 'gone'; this.onEvent?.('defeated', this); }
        break;
      default:
        break;
    }
    // Chockvågen från slaget
    if (this.waveT >= 0) {
      this.waveT += dt;
      const k = this.waveT / 0.6;
      this.wave.scale.setScalar(1 + k * 4);
      this.wave.material.opacity = Math.max(0, 0.8 * (1 - k));
      if (k >= 1) this.waveT = -1;
    }
    this.animate(dt);
  }

  animate(dt) {
    const m = this.model, t = performance.now() / 1000;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.facing;
    const R = m.arms[1], L = m.arms[0];
    let tx = 0, bend = 0, rx = -0.1 + Math.sin(t * 0.8) * 0.05, ex = -0.2, lx = 0.1;
    const s = this.slam;
    if (this.state === 'raise') { rx = -2.8; ex = -0.6; tx = -0.15; }
    else if (this.state === 'smash') { rx = -0.6; ex = -0.2; tx = 0.35; bend = 0.3; }
    else if (this.state === 'stuck') { rx = -0.9; ex = 0; tx = Thrym.KNEEL.tx; bend = 1; lx = -0.9; }
    else if (this.state === 'pull') { rx = -1.2; ex = -0.4; tx = 0.3; bend = 0.4; }
    else if (this.state === 'roar') { rx = -2.2; lx = -2.2; tx = -0.25; }
    else if (this.state === 'dead') { tx = approach(m.torso.rotation.x, 1.0, 1, dt); bend = 1; }
    else if (this.state === 'dormant') { tx = 0.2; }
    // Böjd: överkroppen går ner så att huvudet kommer nära slagplatsen
    m.torso.rotation.x = approach(m.torso.rotation.x, tx, 4, dt);
    m.body.position.y = approach(m.body.position.y, -bend * Thrym.KNEEL.drop, 3, dt);
    if (s && this.state === 'stuck') {
      // Böjer sig ner över slagplatsen: kliver så att kristallen i kronan hamnar ovanför den
      const c = this.chest;
      this.pos.x += (s.target.x - c.x) * Math.min(1, dt * 2.5);
      this.pos.z += (s.target.z - c.z) * Math.min(1, dt * 2.5);
    } else if (this.state === 'watch' || this.state === 'raise') {
      this.pos.x = approach(this.pos.x, this.home.x, 1.2, dt);
      this.pos.z = approach(this.pos.z, this.home.z, 1.2, dt);
    }
    R.sh.rotation.x = approach(R.sh.rotation.x, rx, this.state === 'smash' ? 14 : 4, dt);
    R.el.rotation.x = approach(R.el.rotation.x, ex, 6, dt);
    L.sh.rotation.x = approach(L.sh.rotation.x, lx, 3, dt);
    L.sh.rotation.z = -0.15;
    R.sh.rotation.z = 0.12;
    m.head.rotation.x = approach(m.head.rotation.x, this.state === 'stuck' ? Thrym.KNEEL.head : 0, 3, dt);
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    m.crystal.material.color.setRGB(0.55 + 0.3 * pulse * (this.state === 'stuck' ? 1.3 : 0.5), 0.3, 1);
    const f = this.flash > 0 ? 0.7 : 0;
    for (const mt of m.mats) mt.emissive?.setRGB(f * 0.8, f, f);
  }
}

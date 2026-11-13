// Fienderna blir svårare (0.17). Varje område och fängelsehåla har en nivå (0–5) efter hur långt in i spelet
// den ligger. Nivån ger mer liv, och från nivå 1 dyker nya sorters asklingar upp, med egna vapen och egna sätt
// att skada Cello:
//
//   Ashling Brute  (nivå 1+)  stor och tung, en järnklubba med spikar: ett helt hjärta per slag (mer längre fram)
//   Venomfang      (nivå 2+)  grön och dräglande: förgiftar Cello, som tappar liv en stund efteråt
//   Ramhorn        (nivå 3+)  krökta horn: stångar Cello långt bakåt, och rusar mot honom på avstånd
//   Tide Reaver    (nivå 4+)  ett hullingförsett spjut: når längre och slår hårdare
//   Rimeling       (nivå 5)   av is: slaget kyler Cello, som blir långsam en stund
//
// Här finns också livmätarna: en liten mätare över varje fiende, och en stor mätare nere på skärmen för bossar.
import * as THREE from 'three';

export const GROUP_TIER = { bastion: 1, pyramid: 2, necropolis: 2, spire: 3, temple: 4, maw: 5 };
export const AREA_TIER = { village: 0, home: 0, ranch: 0, pass: 0, field: 0, willowmere: 1, stormreach: 1, cave: 1, desert: 2, galecrown: 3, sea: 4, frost: 5 };
const TIER_HP = [6, 7, 8, 10, 11, 12];

export const TRAITS = {
  brute: { name: 'Ashling Brute', hp: 1.6, dmg: 2, scale: 1.22, speed: 0.85 },
  venom: { name: 'Venomfang', hp: 1, dmg: 1, poison: 6 },
  ram: { name: 'Ramhorn', hp: 1.25, dmg: 2, knock: 2.3, charge: true },
  reaver: { name: 'Tide Reaver', hp: 1.2, dmg: 2, reach: 1.3 },
  frost: { name: 'Rimeling', hp: 1.15, dmg: 1, chill: 3.5 },
};

// Vilken sorts askling blir fiende nummer k i ett område på nivå t?
function traitFor(t, k) {
  if (t >= 5) return k % 2 === 0 ? 'frost' : k % 3 === 1 ? 'brute' : k % 5 === 3 ? 'reaver' : null;
  if (t === 4) return k % 3 === 0 ? 'reaver' : k % 4 === 2 ? 'ram' : k % 5 === 4 ? 'venom' : null;
  if (t === 3) return k % 3 === 1 ? 'ram' : k % 4 === 3 ? 'brute' : k % 5 === 0 ? 'venom' : null;
  if (t === 2) return k % 3 === 2 ? 'venom' : k % 5 === 4 ? 'brute' : null;
  if (t === 1) return k % 4 === 3 ? 'brute' : null;
  return null;
}

export function tierOf(e) {
  if (e.group && e.group !== 'world') return GROUP_TIER[e.group] ?? 1;
  return AREA_TIER[e.area] ?? 0;
}

// Ger alla fiender sin nivå (anropas en gång när alla är skapade)
export function applyTiers(list) {
  const count = {};
  for (const e of list) {
    if (e.reserve) { e.tier = 0; e.maxHp = TIER_HP[0]; e.hp = e.maxHp; continue; }
    const t = (e.tier = tierOf(e));
    if (e.kind === 'bat') {
      e.maxHp = t >= 4 ? 2 : 1;
      e.hp = e.maxHp;
      continue;
    }
    const key = `${e.group}:${e.area}`;
    let trait = null;
    if (e.kind === 'askling' && !e.nocturnal) {
      const k = (count[key] = (count[key] ?? -1) + 1);
      trait = traitFor(t, k);
    }
    let hp = TIER_HP[t] * (e.kind === 'mummy' ? 1.25 : e.kind === 'shield' ? 1.1 : 1);
    if (trait) {
      const T = TRAITS[trait];
      hp *= T.hp;
      e.trait = trait;
      e.traitName = T.name;
      e.dmg = trait === 'brute' && t >= 4 ? 3 : T.dmg;
      e.reach = T.reach ?? 1;
      e.speedMul = T.speed ?? 1;
      dressFoe(e, trait);
    } else {
      e.dmg = 1;
      e.reach = 1;
      e.speedMul = 1;
    }
    e.maxHp = Math.round(hp);
    e.hp = e.maxHp;
  }
}

// ---------------------------------------------------------------- utseendet
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
const MATS = {};
const mat = (k, f) => (MATS[k] ??= f());
const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };

function spikedBall(r, m, spikeM, n = 8) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m));
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, -0.7, -0.7]].slice(0, n);
  for (const [x, y, z] of dirs) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, r * 0.9, 4), spikeM);
    const v = new THREE.Vector3(x, y, z).normalize();
    s.position.copy(v).multiplyScalar(r * 1.15);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    g.add(s);
  }
  return g;
}

function recolor(e, ash, dark, glow, eye) {
  const m = e.model;
  // Varje askling har egna material, så det går att färga om dem en och en
  m.mats[0].color.set(ash);
  m.mats[1].color.set(dark);
  m.M.glow.color.set(glow);
  m.M.eye.color.set(eye);
}

export function dressFoe(e, trait) {
  const m = e.model;
  if (!m?.club) return;
  const iron = mat('iron', () => lam(0x4a4c52)), ironDark = mat('ironDark', () => lam(0x2a2b30));
  const bone = mat('bone', () => lam(0xe2d8c0));
  if (trait === 'brute') {
    m.root.scale.setScalar(TRAITS.brute.scale);
    recolor(e, 0x3e2e28, 0x1e1614, 0xff4a1a, 0xffe08a);
    // Järnklubba med spikar i stället för stenklubban
    m.club.children.forEach((c) => { c.visible = false; });
    m.club.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), ironDark), 0, -0.4, 0));
    const ball = spikedBall(0.3, iron, ironDark, 10);
    ball.position.y = -0.95;
    m.club.add(ball);
    for (let k = 0; k < 3; k++) m.club.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6), ironDark), 0, -0.2 - k * 0.22, 0));
    // Axelplåtar och ett järnband runt pannan
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), iron);
      p.position.set(0.48 * s, 0.78, 0.02);
      p.rotation.z = -0.35 * s;
      m.torso.add(p);
      const stud = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), ironDark);
      stud.position.set(0.52 * s, 0.98, 0.02);
      m.torso.add(stud);
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 4, 10), iron);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.15, 0.04);
    m.head.add(band);
  } else if (trait === 'venom') {
    recolor(e, 0x2f4a2a, 0x18261a, 0x7aff5a, 0xe8ff6a);
    m.mats[2].color.set(0xc8d88a);
    // Gifttänder som dräglar, och en skorpionsvans med gadd
    const drip = mat('drip', () => new THREE.MeshBasicMaterial({ color: 0x8aff5a }));
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), bone);
      f.rotation.x = Math.PI;
      f.position.set(0.1 * s, -0.08, 0.3);
      m.head.add(f);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), drip);
      d.position.set(0.1 * s, -0.19, 0.3);
      d.scale.y = 1.6;
      m.head.add(d);
    }
    const tail = new THREE.Group();
    tail.position.set(0, 0.0, -0.28);
    let parent = tail;
    for (let k = 0; k < 5; k++) {
      const seg = new THREE.Group();
      seg.position.set(0, k ? 0.2 : 0, k ? -0.04 : 0);
      seg.rotation.x = k ? -0.42 : -0.9;
      seg.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.11 - k * 0.012, 6, 5), m.mats[1]), 0, 0.1, 0));
      parent.add(seg);
      parent = seg;
    }
    const sting = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), drip);
    sting.position.set(0, 0.26, 0.04);
    sting.rotation.x = 0.9;
    parent.add(sting);
    m.hips.add(tail);
    e.tail = tail;
  } else if (trait === 'ram') {
    recolor(e, 0x4a3a2c, 0x2a1e16, 0xffa03a, 0xffd070);
    m.root.scale.setScalar(1.1);
    // Stora krökta horn (byggda av korta bitar längs en spiral)
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(0.18 * s, 0.3, -0.02);
      for (let k = 0; k < 9; k++) {
        const a = k * 0.62;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.075 - k * 0.006, 0.085 - k * 0.006, 0.17, 6), bone);
        const r = 0.16 + k * 0.012;
        seg.position.set(s * (0.05 + Math.sin(a) * r * 0.5 + k * 0.022), Math.cos(a) * r - 0.05, -Math.sin(a) * r * 0.9);
        seg.rotation.set(-a, 0, s * 0.3);
        g.add(seg);
      }
      m.head.add(g);
    }
    // Ett tjockt pannben att stånga med
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.18), bone);
    brow.position.set(0, 0.22, 0.2);
    m.head.add(brow);
  } else if (trait === 'reaver') {
    recolor(e, 0x2a4a4e, 0x16282c, 0x5ae8e0, 0xc8fff4);
    // Ett hullingförsett spjut i stället för klubban
    m.club.children.forEach((c) => { c.visible = false; });
    m.club.rotation.x = -1.35; // spjutet pekar framåt
    const wood = mat('spearWood', () => lam(0x5a4632));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 6), wood);
    shaft.position.y = -0.7;
    m.club.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 4), iron);
    tip.position.y = -1.95;
    tip.rotation.x = Math.PI;
    m.club.add(tip);
    for (const s of [-1, 1]) {
      const barb = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 4), iron);
      barb.position.set(0.08 * s, -1.72, 0);
      barb.rotation.z = -2.5 * s;
      m.club.add(barb);
    }
    // Havstagg på huvudet och snäckor på axlarna
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 3), mat('fin', () => lam(0x3a8a8a)));
    fin.scale.z = 0.3;
    fin.position.set(0, 0.42, -0.08);
    m.head.add(fin);
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 7), mat('shell', () => lam(0xd8c8a8)));
      sh.position.set(0.5 * s, 0.86, 0);
      m.torso.add(sh);
    }
  } else if (trait === 'frost') {
    recolor(e, 0x7a9ab8, 0x3a5470, 0x9fe4ff, 0xe8fbff);
    const rime = mat('rime', () => new THREE.MeshPhongMaterial({ color: 0xbfe8ff, emissive: 0x2a5a7a, shininess: 80, flatShading: true }));
    // Istaggar längs ryggen, och en klubba med ett isblock
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34 - k * 0.03, 5), rime);
      sp.position.set((k % 2 ? 0.12 : -0.12), 0.95 - k * 0.12, -0.32);
      sp.rotation.x = -0.8;
      m.torso.add(sp);
    }
    m.club.children.forEach((c) => { c.visible = false; });
    m.club.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), m.mats[1]), 0, -0.4, 0));
    const ice = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), rime);
    ice.scale.set(1, 1.5, 1);
    ice.position.y = -0.95;
    m.club.add(ice);
    for (const s of [-1, 1]) {
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), rime);
      ic.rotation.x = Math.PI;
      ic.position.set(0.12 * s, -0.12, 0.2);
      m.head.add(ic);
    }
  }
}

// ---------------------------------------------------------------- livmätarna över fienderna
const BAR_W = 128, BAR_H = 40;
export class HealthBars {
  constructor(scene) {
    this.scene = scene;
    this.bars = new Map();
  }

  make(e) {
    const c = document.createElement('canvas');
    c.width = BAR_W;
    c.height = BAR_H;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    sp.renderOrder = 18;
    sp.scale.set(1.5, 1.5 * BAR_H / BAR_W, 1);
    this.scene.add(sp);
    const b = { sp, c, tex, key: '', shown: 0, lastHp: e.hp };
    this.bars.set(e, b);
    return b;
  }

  draw(b, e) {
    const max = e.maxHp || 1, hp = Math.max(0, e.hp);
    const key = `${hp}/${max}/${e.traitName || ''}`;
    if (key === b.key) return;
    b.key = key;
    const g = b.c.getContext('2d');
    g.clearRect(0, 0, BAR_W, BAR_H);
    const named = !!e.traitName;
    const y = named ? 22 : 14;
    if (named) {
      g.font = 'bold 15px Georgia, serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.85)';
      g.strokeText(e.traitName, BAR_W / 2, 15);
      g.fillStyle = { brute: '#ffb08a', venom: '#b8ff8a', ram: '#ffd08a', reaver: '#8afff0', frost: '#c8f0ff' }[e.trait] || '#fff';
      g.fillText(e.traitName, BAR_W / 2, 15);
    }
    // Ramen, den mörka botten och den röda fyllningen (blir orange och gul när livet tar slut)
    g.fillStyle = 'rgba(10,8,8,0.85)';
    g.fillRect(6, y, BAR_W - 12, 14);
    const k = hp / max;
    const fill = k > 0.5 ? '#d8402a' : k > 0.25 ? '#e8822a' : '#f0c040';
    g.fillStyle = fill;
    g.fillRect(9, y + 3, (BAR_W - 18) * k, 8);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(9, y + 3, (BAR_W - 18) * k, 3);
    // Ett streck för varje fjärdedel
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 1; i < 4; i++) g.fillRect(9 + (BAR_W - 18) * i / 4, y + 3, 1, 8);
    g.strokeStyle = '#c8b48a';
    g.lineWidth = 1.5;
    g.strokeRect(6, y, BAR_W - 12, 14);
    b.tex.needsUpdate = true;
  }

  // lock: fienden Cello låser på · show: alla synliga fiender (fler ses när de är arga eller skadade)
  update(dt, list, player, lock, area) {
    for (const e of list) {
      let b = this.bars.get(e);
      const alive = e.targetable && e.maxHp && !e.realmHidden && e.model?.root?.visible !== false && (!e.area || !area || e.area === area);
      const d = alive ? Math.hypot(e.pos.x - player.feet.x, e.pos.z - player.feet.z) : 99;
      const angry = ['chase', 'circle', 'windup', 'strike', 'recover', 'charge', 'rear', 'hurt', 'stagger', 'rocks', 'fetch', 'disarmed'].includes(e.state);
      const want = alive && d < 22 && (e === lock || e.hp < e.maxHp || (angry && d < 14) || (e.traitName && d < 10));
      if (!b) {
        if (!want) continue;
        b = this.make(e);
      }
      b.shown = Math.max(0, Math.min(1, b.shown + (want ? dt * 5 : -dt * 3)));
      b.sp.visible = b.shown > 0.01;
      if (!b.sp.visible) continue;
      this.draw(b, e);
      const s = e.model?.root?.scale?.y ?? 1;
      const h = e.flying ? 0.75 : 2.15 * s + (e.traitName ? 0.15 : 0);
      b.sp.position.set(e.pos.x, e.pos.y + h, e.pos.z);
      b.sp.material.opacity = b.shown;
      const big = e === lock ? 1.2 : 1;
      b.sp.scale.set(1.5 * big, 1.5 * big * BAR_H / BAR_W, 1);
    }
  }

  clear() {
    for (const b of this.bars.values()) b.sp.visible = false;
  }
}

// ---------------------------------------------------------------- bossens mätare nere på skärmen
const BOSS_NAMES = {
  IronWarden: 'The Iron Warden', Hrungnir: 'Hrungnir', Khepri: 'Khepri', Apophis: 'Apophis', BrassWeaver: 'The Brass Weaver', Typhon: 'Typhon',
  Karkinos: 'Karkinos', Ketos: 'Ketos', JackalWarden: 'The Jackal Warden', Ammit: 'Ammit', Hati: 'Hati', Thrym: 'Thrym', SunGuardian: 'The Sun Guardian',
};
export class BossBar {
  constructor() {
    const el = document.createElement('div');
    el.className = 'bossbar';
    el.hidden = true;
    el.innerHTML = '<div class="bossbar-name"></div><div class="bossbar-track"><div class="bossbar-lag"></div><div class="bossbar-fill"></div></div>';
    (document.querySelector('.hud') ?? document.body).appendChild(el);
    this.el = el;
    this.name = el.querySelector('.bossbar-name');
    this.fill = el.querySelector('.bossbar-fill');
    this.lag = el.querySelector('.bossbar-lag');
    this.cur = null;
    this.lagK = 1;
    this.max = new WeakMap();
  }

  // Den närmaste bossen som är vaken och inom 50 meter
  pick(targets, player) {
    let best = null, bd = 50;
    for (const e of targets) {
      if (!e || !e.targetable || typeof e.hp !== 'number' || e.isSmall) continue;
      const nm = e.bossName || BOSS_NAMES[e.constructor?.name];
      if (!nm) continue;
      const d = Math.hypot(e.pos.x - player.feet.x, e.pos.z - player.feet.z) - (e.radiusBig || 0);
      if (d < bd) { best = e; bd = d; }
    }
    return best;
  }

  update(dt, targets, player, show = true) {
    const e = show ? this.pick(targets, player) : null;
    if (!e) {
      if (!this.el.hidden) this.el.hidden = true;
      this.cur = null;
      return;
    }
    const max = Math.max(this.max.get(e) ?? 0, e.hp);
    this.max.set(e, max);
    if (this.cur !== e) {
      this.cur = e;
      this.name.textContent = e.bossName || BOSS_NAMES[e.constructor?.name];
      this.lagK = e.hp / max;
    }
    this.el.hidden = false;
    const k = Math.max(0, e.hp) / max;
    this.lagK = Math.max(k, this.lagK - dt * 0.35);
    this.fill.style.width = `${(k * 100).toFixed(1)}%`;
    this.lag.style.width = `${(this.lagK * 100).toFixed(1)}%`;
  }
}

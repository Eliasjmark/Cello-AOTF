// Grumble: Hollis stora getabock på Thistledown Ranch. När Cello har fått honom (och hornet som kallar på honom)
// kan han rida på Grumble ute i världen och ta sig fram dubbelt så fort, innan Hermes sandaler finns.
//
//   bunden  – står vid stolpen bredvid ladan tills Hollis ger bort honom
//   betar   – strövar runt där Cello lämnade honom
//   kommer  – springer fram till Cello när hornet blåses
//   riden   – modellen sitter under Cello (player.mount) och benen galopperar efter farten
//
// Grumble följer inte med in i hus, grottor eller fängelsehålor; där väntar han utanför.
import * as THREE from 'three';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
// Områden där man inte kan rida
const NO_RIDE = new Set(['house', 'shop', 'cave', 'bastion', 'pyramid']);

function buildGrumble(M) {
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const fur = lam(0x8a7a66), furDark = lam(0x4a3e34), horn = lam(0xb8a888), hoof = lam(0x2a2420);
  const blanket = lam(0x8c2a27), trim = lam(0xc9a24f), rope = lam(0x5e4f3a);
  const B = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Kroppen: en bred, raggig bock
  body.add(B(0.72, 0.62, 1.35, fur, 0, 0.98, 0));
  body.add(B(0.76, 0.3, 1.1, furDark, 0, 0.72, 0.02));
  body.add(B(0.66, 0.3, 0.5, fur, 0, 1.12, 0.45));
  // Sadelfilt och sadel
  body.add(B(0.82, 0.06, 0.78, blanket, 0, 1.31, -0.02));
  body.add(B(0.84, 0.065, 0.06, trim, 0, 1.31, 0.37));
  body.add(B(0.84, 0.065, 0.06, trim, 0, 1.31, -0.41));
  body.add(B(0.46, 0.12, 0.5, lam(0x5a3a24), 0, 1.38, -0.02));
  // Halsen och huvudet med böjda horn och skägg
  const neck = new THREE.Group();
  neck.position.set(0, 1.18, 0.62);
  body.add(neck);
  neck.add(B(0.34, 0.52, 0.36, fur, 0, 0.18, 0.08));
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.22);
  neck.add(head);
  head.add(B(0.32, 0.3, 0.46, fur, 0, 0, 0.12));
  head.add(B(0.26, 0.2, 0.18, furDark, 0, -0.06, 0.4));
  head.add(B(0.1, 0.24, 0.08, furDark, 0, -0.26, 0.28)); // skägget
  for (const s of [-1, 1]) {
    // Horn som rullar sig bakåt och ner
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 5, 10, Math.PI * 1.5), horn);
    h.position.set(s * 0.2, 0.12, -0.04);
    h.rotation.set(0, s * Math.PI / 2, Math.PI * 0.25);
    head.add(h);
    head.add(B(0.14, 0.06, 0.06, fur, s * 0.21, 0.02, 0.0)); // öra
    head.add(B(0.05, 0.05, 0.02, lam(0x1a1410), s * 0.165, 0.06, 0.25)); // öga
    head.add(B(0.04, 0.04, 0.3, rope, s * 0.17, -0.05, 0.22)); // tygel
  }
  // Svansen
  const tail = B(0.1, 0.2, 0.1, furDark, 0, 1.18, -0.72);
  tail.rotation.x = -0.6;
  body.add(tail);
  // Fyra ben som svingar från höften
  const legs = [];
  for (const [x, z, front] of [[-0.24, 0.48, 1], [0.24, 0.48, 1], [-0.24, -0.48, 0], [0.24, -0.48, 0]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.74, z);
    body.add(hip);
    hip.add(B(0.17, 0.42, 0.19, fur, 0, -0.18, 0));
    const knee = new THREE.Group();
    knee.position.set(0, -0.38, 0);
    hip.add(knee);
    knee.add(B(0.12, 0.34, 0.13, furDark, 0, -0.16, 0));
    knee.add(B(0.14, 0.06, 0.16, hoof, 0, -0.34, 0.01));
    legs.push({ hip, knee, front, side: x > 0 ? 1 : -1 });
  }
  return { root, body, neck, head, legs, tail };
}

export class Goat {
  constructor(ctx) {
    Object.assign(this, ctx); // areas, scene, player, sfx, fx, hud, story, groundAt, M
    this.model = buildGrumble(this.M);
    this.saddleY = 1.32;
    this.pos = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.home = new THREE.Vector3();
    this.facing = 0;
    this.area = 'ranch';
    this.mode = 'tethered';
    this.t = 0;
    this.phase = 0;
    this.wait = 1;
    this.speed = 0;
    this.tether = null;
  }

  // Var han står vid stolpen innan han är Cellos (sätts av ranchen)
  setTether(pos, facing) {
    this.tether = { pos: pos.clone(), facing };
  }

  get owned() {
    return !!this.story.state.goat?.have;
  }

  get ridden() {
    return this.player.mount === this;
  }

  static canRide(areaId) {
    return !NO_RIDE.has(areaId);
  }

  // Placerar Grumble i ett område, på marken
  placeAt(areaId, p, facing = this.facing) {
    this.area = areaId;
    const a = this.areas.get(areaId);
    if (!a) return;
    if (!this.ridden) a.root.add(this.model.root);
    this.pos.copy(p);
    const gy = this.groundAt(p.x, p.y + 2, p.z);
    if (gy !== null) this.pos.y = gy;
    this.home.copy(this.pos);
    this.target.copy(this.pos);
    this.facing = facing;
    this.sync();
  }

  // Efter laddning eller ett nytt spel
  load(s) {
    this.unmountModel();
    const g = s.goat;
    if (g?.have && g.area && this.areas.get(g.area) && Goat.canRide(g.area)) {
      this.mode = 'idle';
      this.placeAt(g.area, new THREE.Vector3(g.x, g.y, g.z), g.f ?? 0);
    } else {
      this.mode = g?.have ? 'idle' : 'tethered';
      const t = this.tether;
      if (t) this.placeAt('ranch', t.pos, t.facing);
    }
  }

  store(s) {
    if (!s.goat?.have) return;
    const p = this.ridden ? this.player.feet : this.pos;
    s.goat = { have: true, area: this.ridden ? this.areas.id : this.area, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), f: +this.facing.toFixed(2) };
  }

  // Hollis ger Grumble till Cello
  give() {
    const s = this.story.state;
    s.goat = { have: true, area: this.area, x: this.pos.x, y: this.pos.y, z: this.pos.z, f: this.facing };
    this.mode = 'idle';
    this.home.copy(this.pos);
  }

  // ---------- att rida ----------
  mount() {
    const P = this.player;
    if (!this.owned || this.ridden || P.state !== 'move' || P.carried) return false;
    P.setPrism?.(false);
    if (P.heavy) { P.heavy = false; P.onHeavy?.(false); }
    // Cello hoppar upp där Grumble står
    const gy = this.groundAt(this.pos.x, this.pos.y + 1, this.pos.z) ?? this.pos.y;
    P.teleport(new THREE.Vector3(this.pos.x, gy + 0.02, this.pos.z));
    P.facing = this.facing;
    P.mount = this;
    this.mode = 'ridden';
    P.model.root.add(this.model.root);
    this.model.root.position.set(0, 0, 0);
    this.model.root.rotation.set(0, 0, 0);
    this.sfx.play('ram', { vol: 0.9 });
    this.sfx.play('hup', { vol: 0.6 });
    if (!this.story.state.talked.rodeHint) {
      this.story.state.talked.rodeHint = true;
      this.hud.toast('Riding Grumble! Space jumps. Press E to climb down.', 4200);
    }
    return true;
  }

  unmountModel() {
    const P = this.player;
    if (P.mount === this) P.mount = null;
    const a = this.areas.get(this.area);
    if (a && this.model.root.parent !== a.root) a.root.add(this.model.root);
  }

  // Cello kliver av; Grumble blir stående där (side: åt vilket håll Cello hoppar)
  dismount(opt = {}) {
    const P = this.player;
    if (!this.ridden) return;
    const at = (opt.at ?? P.feet).clone();
    const f = P.facing;
    P.mount = null;
    this.mode = 'idle';
    this.placeAt(opt.area ?? this.areas.id, at, f);
    // Cello hoppar ner bredvid
    if (!opt.stay) {
      const rx = Math.cos(f), rz = -Math.sin(f);
      for (const side of [1, -1]) {
        const x = at.x + rx * 1.1 * side, z = at.z + rz * 1.1 * side;
        const gy = this.groundAt(x, at.y + 1.5, z);
        if (gy !== null && Math.abs(gy - at.y) < 1.2) {
          P.teleport(new THREE.Vector3(x, gy + 0.02, z));
          P.facing = f;
          break;
        }
      }
    }
    if (opt.thrown) {
      this.sfx.play('ram', { vol: 1 });
      this.wait = 2.5;
    }
    this.speed = 0;
  }

  // Hornet: Grumble kommer springande
  call() {
    const P = this.player, here = this.areas.id;
    if (!this.owned) return;
    this.sfx.play('horn');
    if (this.ridden) return;
    if (!Goat.canRide(here)) {
      this.hud.toast("Grumble can't come in here. He'll wait outside.", 3000);
      return;
    }
    if (this.area !== here || this.pos.distanceTo(P.feet) > 70) {
      // Han kommer från andra hållet, en bit bakom Cello
      const back = P.facing + Math.PI;
      let spot = null;
      for (const d of [16, 11, 7, 4]) {
        for (const off of [0, 0.5, -0.5, 1, -1]) {
          const x = P.feet.x + Math.sin(back + off) * d, z = P.feet.z + Math.cos(back + off) * d;
          const gy = this.groundAt(x, P.feet.y + 3, z);
          if (gy !== null && Math.abs(gy - P.feet.y) < 3) { spot = new THREE.Vector3(x, gy, z); break; }
        }
        if (spot) break;
      }
      this.placeAt(here, spot ?? P.feet.clone(), Math.atan2(P.feet.x - (spot?.x ?? P.feet.x), P.feet.z - (spot?.z ?? P.feet.z)));
    }
    this.mode = 'coming';
    this.wait = 0;
    this.story.after(0.5, () => this.sfx.play('ram', { vol: 1 }));
  }

  // Ett område laddas (innan Cello flyttas dit): Grumble följer med om Cello rider, annars väntar han.
  // In i en grotta eller fängelsehåla får han vänta vid den senaste säkra platsen utanför.
  enterArea(id) {
    if (this.ridden) {
      if (!Goat.canRide(id)) {
        const P = this.player;
        const at = P.safe.distanceTo(P.feet) < 25 ? P.safe : P.feet;
        this.dismount({ stay: true, area: this.area, at });
      } else this.area = id;
    }
    this.model.root.visible = this.ridden || this.area === id;
    // Står han här ställs han på marken igen (kollisionsträdet finns först nu)
    if (!this.ridden && this.area === id) {
      for (const up of [2, 12, 40]) {
        const gy = this.groundAt(this.pos.x, this.pos.y + up, this.pos.z);
        if (gy !== null) { this.pos.y = gy; this.home.y = gy; this.target.y = gy; break; }
      }
      this.sync();
    }
  }

  // ---------- varje bildruta ----------
  update(dt) {
    const P = this.player;
    this.t += dt;
    if (this.ridden) {
      this.pos.copy(P.feet);
      this.facing = P.facing;
      this.area = this.areas.id;
      return;
    }
    const here = this.areas.id;
    this.model.root.visible = this.area === here;
    if (this.area !== here) return;
    let moving = false, sp = 0;
    if (this.mode === 'tethered' && this.tether) {
      // Bunden vid stolpen: tittar runt och stampar
      this.facing += wrap(this.tether.facing + Math.sin(this.t * 0.3) * 0.6 - this.facing) * (1 - Math.exp(-dt * 1.5));
    } else if (this.mode === 'coming') {
      const dx = P.feet.x - this.pos.x, dz = P.feet.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 2.0) {
        this.mode = 'idle';
        this.home.copy(this.pos);
        this.target.copy(this.pos);
        this.wait = 4;
      } else {
        sp = Math.min(10.5, 3 + d * 1.2);
        this.facing += wrap(Math.atan2(dx, dz) - this.facing) * (1 - Math.exp(-dt * 8));
        // Går runt hinder: rakt fram, annars lite åt sidan. Fastnar han ändå kommer han fram bakom Cello.
        let ok = false;
        for (const off of [0, 0.6, -0.6, 1.2, -1.2]) {
          const a = Math.atan2(dx, dz) + off;
          if (this.stepTo(this.pos.x + Math.sin(a) * sp * dt, this.pos.z + Math.cos(a) * sp * dt)) { ok = true; break; }
        }
        this.stuck = ok ? 0 : (this.stuck ?? 0) + dt;
        if (this.stuck > 1.5) {
          this.stuck = 0;
          const b = P.facing + Math.PI, x = P.feet.x + Math.sin(b) * 2.5, z = P.feet.z + Math.cos(b) * 2.5;
          const gy = this.groundBelow(x, P.feet.y + 1, z);
          if (gy !== null && Math.abs(gy - P.feet.y) < 1.5) this.pos.set(x, gy, z);
          else this.pos.copy(P.feet);
        }
        moving = ok;
      }
    } else {
      // Betar och strövar runt där han är
      this.wait -= dt;
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (this.wait <= 0 && d > 0.2) {
        sp = 0.9;
        this.facing += wrap(Math.atan2(dx, dz) - this.facing) * (1 - Math.exp(-dt * 4));
        moving = this.stepTo(this.pos.x + (dx / d) * Math.min(d, sp * dt), this.pos.z + (dz / d) * Math.min(d, sp * dt));
        if (!moving) { this.target.copy(this.pos); this.wait = 1; }
      } else if (this.wait <= 0) {
        this.wait = 3 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2, r = Math.random() * 3;
        const x = this.home.x + Math.cos(ang) * r, z = this.home.z + Math.sin(ang) * r;
        const gy = this.groundAt(x, this.home.y + 2, z);
        if (gy !== null && Math.abs(gy - this.home.y) < 1.5) this.target.set(x, gy, z);
      }
    }
    // Står han still men marken under honom saknas (t.ex. när ett område laddats), faller han ner till den
    if (!moving) {
      const gy = this.groundBelow(this.pos.x, this.pos.y, this.pos.z);
      if (gy !== null && Math.abs(gy - this.pos.y) > 0.05 && gy < this.pos.y + 0.55) this.pos.y = approach(this.pos.y, gy, 10, dt);
    }
    // Cello går inte igenom honom
    const px = P.feet.x - this.pos.x, pz = P.feet.z - this.pos.z, pd = Math.hypot(px, pz);
    if (pd < 1.0 && pd > 1e-4 && Math.abs(P.feet.y - this.pos.y) < 1.5) P.nudge((px / pd) * (1.0 - pd), (pz / pd) * (1.0 - pd));
    if (pd < 7 && Math.random() < dt * 0.05) this.sfx.play('ram', { vol: Math.max(0.25, 1 - pd / 7) });
    this.speed = approach(this.speed, sp, 8, dt);
    this.phase += dt * (2 + this.speed * 0.75);
    this.animate(dt, this.speed, true, this.phase, !moving);
    this.sync();
  }

  // 0.21.2: marken under en punkt, letad uppifrån och ner i flera steg (förut bara 0,4 m under honom,
  // så när han gick över en kant blev han hängande i luften)
  groundBelow(x, y, z) {
    for (const from of [y + 0.7, y - 3, y - 7, y - 11, y - 15]) {
      const gy = this.groundAt(x, from, z);
      if (gy !== null) return gy;
    }
    return null;
  }

  // Ett steg till (x, z): går bara om marken där finns och inte är en vägg eller ett staket
  stepTo(x, z) {
    const gy = this.groundBelow(x, this.pos.y, z);
    if (gy === null || gy > this.pos.y + 0.55 || gy < this.pos.y - 6) return false;
    this.pos.x = x;
    this.pos.z = z;
    this.pos.y = gy;
    return true;
  }

  sync() {
    if (this.ridden) return;
    const r = this.model.root;
    r.position.copy(this.pos);
    r.rotation.y = this.facing;
  }

  // Benen: skritt när han går, galopp när han springer. Huvudet betar när han står still.
  animate(dt, speed, grounded, phase, grazing = false) {
    const m = this.model;
    const gal = Math.min(1, speed / 9);
    const walk = Math.min(1, speed / 1.5);
    for (const l of m.legs) {
      const off = gal > 0.4 ? (l.front ? 0 : Math.PI * 0.6) + (l.side > 0 ? 0.35 : 0) : (l.front ? 0 : Math.PI) + (l.side > 0 ? Math.PI : 0);
      const sw = Math.sin(phase * 2 + off) * (0.25 + 0.5 * gal) * walk;
      const air = grounded ? 0 : (l.front ? -0.7 : 0.6);
      l.hip.rotation.x = approach(l.hip.rotation.x, sw + air, 20, dt);
      l.knee.rotation.x = approach(l.knee.rotation.x, (l.front ? 1 : -1) * Math.max(0, Math.cos(phase * 2 + off)) * 0.5 * walk + (grounded ? 0 : (l.front ? 0.8 : -0.5)), 20, dt);
    }
    m.body.position.y = grounded ? Math.abs(Math.sin(phase * 2)) * 0.07 * gal : 0.05;
    m.body.rotation.x = approach(m.body.rotation.x, grounded ? Math.sin(phase * 2) * 0.05 * gal : -0.12, 10, dt);
    m.neck.rotation.x = approach(m.neck.rotation.x, grazing ? 0.9 + Math.sin(this.t * 1.4) * 0.15 : -0.1 * gal, 4, dt);
    m.tail.rotation.x = -0.6 + Math.sin(this.t * 7) * 0.15;
  }
}

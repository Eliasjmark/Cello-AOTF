// Solstrålar (0.7): ljus som faller in genom fönster eller ner genom schakt i taket, studsar mellan
// speglar och väcker solögon. Med Ra's Shattered Prism kan Cello fånga en stråle och rikta den själv:
// mot ett solöga, en skuggslöja eller en skuggvarelse.
//
//   fönster  – en fast stråle in genom väggen
//   schakt   – ljus rakt ner på en solskiva i golvet; står Cello där med prisman uppe skickar han strålen vidare
//   spegel   – vrids ett åttondels varv i taget (E) och kastar strålen vidare (båda sidorna speglar)
//   solöga   – vaknar när strålen träffar det en stund. "hold": lyser bara så länge strålen är kvar
//   slöja    – svart skugga för en öppning; brinner upp när strålen har lyst på den en stund
//
// Strålarna går vågrätt på en fast höjd ovanför golvet (BEAM_Y), så att speglar och solögon kan stå i rader.
import * as THREE from 'three';
import { rayBox } from './collide.js';

export const BEAM_Y = 1.3;
const MAX_BOUNCES = 14;
const MAX_LEN = 70;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _ray = new THREE.Ray(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);

// Avstånd längs strålen till en sfär (eller null)
function raySphere(o, d, c, r, far) {
  const ox = c.x - o.x, oy = c.y - o.y, oz = c.z - o.z;
  const t = ox * d.x + oy * d.y + oz * d.z;
  if (t < 0.05 || t > far) return null;
  const px = o.x + d.x * t - c.x, py = o.y + d.y * t - c.y, pz = o.z + d.z * t - c.z;
  if (px * px + py * py + pz * pz > r * r) return null;
  return t;
}

export class Beams {
  constructor(parent, ctx) {
    this.parent = parent;
    this.ctx = ctx; // { lights } (fx, sfx, player, collider sätts av fängelsehålan)
    this.windows = [];
    this.shafts = [];
    this.mirrors = [];
    this.eyes = [];
    this.veils = [];
    this.splitters = [];
    this.targets = () => [];
    this.segs = [];
    this.hits = [];
    this.t = 0;
    this.enabled = true;
    const core = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.mats = { core, glow };
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
    for (let i = 0; i < 40; i++) {
      const g = new THREE.Group();
      const c = new THREE.Mesh(geo, core);
      c.scale.set(0.07, 0.07, 1);
      const w = new THREE.Mesh(geo, glow);
      w.scale.set(0.3, 0.3, 1);
      g.add(c, w);
      g.visible = false;
      g.renderOrder = 4;
      parent.add(g);
      this.segs.push({ g, c, w });
    }
    // Sken där strålen tar slut
    const sc = document.createElement('canvas');
    sc.width = sc.height = 32;
    const sg = sc.getContext('2d');
    const grd = sg.createRadialGradient(16, 16, 1, 16, 16, 15);
    grd.addColorStop(0, 'rgba(255,250,220,1)');
    grd.addColorStop(0.4, 'rgba(255,190,90,0.5)');
    grd.addColorStop(1, 'rgba(255,160,60,0)');
    sg.fillStyle = grd;
    sg.fillRect(0, 0, 32, 32);
    const st = new THREE.CanvasTexture(sc);
    st.colorSpace = THREE.SRGBColorSpace;
    this.splashMat = new THREE.SpriteMaterial({ map: st, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(this.splashMat);
      sp.visible = false;
      parent.add(sp);
      this.hits.push(sp);
    }
    // Ljuset som följer strålens slut (två punkter ur ljuspoolen)
    this.endLights = [0, 1].map(() => {
      const l = ctx.lights.add({ x: 0, y: 0, z: 0, color: 0xffc070, power: 0, range: 8, flicker: 0.15 });
      l.on = false;
      l.prio = 30;
      return l;
    });
  }

  // ---------- bygga ----------
  addWindow(id, pos, dir, opts = {}) {
    const w = { id, pos: pos.clone(), dir: dir.clone().normalize(), on: opts.on ?? true, room: opts.room };
    // Ett ljust hål i väggen
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }));
    m.position.copy(pos).addScaledVector(w.dir, -0.05);
    m.lookAt(pos.clone().add(w.dir));
    this.parent.add(m);
    w.mesh = m;
    this.windows.push(w);
    return w;
  }

  addShaft(id, floor, radius = 1.1, top = 7, opts = {}) {
    const s = { id, pos: floor.clone(), radius, top, on: opts.on ?? true, room: opts.room };
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, top, 16, 1, true), lightMat);
    col.position.set(floor.x, floor.y + top / 2, floor.z);
    col.renderOrder = 3;
    this.parent.add(col);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 20).rotateX(-Math.PI / 2), discMat);
    disc.position.set(floor.x, floor.y + 0.04, floor.z);
    disc.renderOrder = 3;
    this.parent.add(disc);
    s.col = col;
    s.disc = disc;
    s.lightMat = lightMat;
    s.discMat = discMat;
    s.light = this.ctx.lights.add({ x: floor.x, y: floor.y + 3, z: floor.z, color: 0xffd080, power: 10, range: 9, flicker: 0.05 });
    this.shafts.push(s);
    return s;
  }

  addMirror(id, pos, a = 0, M = {}, opts = {}) {
    const g = new THREE.Group();
    g.position.copy(pos);
    this.parent.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.7, 8), M.base);
    base.position.y = 0.35;
    g.add(base);
    const turn = new THREE.Group();
    turn.position.y = 0.7;
    g.add(turn);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, BEAM_Y - 0.1, 0.16), M.frame);
    post.position.y = (BEAM_Y - 0.7) / 2 + 0.2;
    turn.add(post);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 18), M.frame);
    frame.position.y = BEAM_Y - 0.7 + 0.05;
    turn.add(frame);
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xe8e0c8, emissive: 0x403020, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.46, 18), glassMat);
    glass.position.copy(frame.position);
    turn.add(glass);
    // En liten pil på foten visar åt vilket håll spegeln vänder
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.3), M.frame);
    tick.position.set(0, 0.02, 0.5);
    turn.add(tick);
    const m = {
      id, pos: pos.clone(), center: new THREE.Vector3(pos.x, pos.y + BEAM_Y, pos.z), a, view: a, g, turn, glassMat, room: opts.room, locked: !!opts.locked, lit: 0,
      // Går att låsa fast vid när prisman är uppe (så att ljuset siktar rakt på spegeln)
      isMirror: true, noWear: true, hitRadius: 0.5, aimable: false,
      get targetable() { return this.aimable; },
      get chest() { return this.center; },
    };
    this.mirrors.push(m);
    this.syncMirror(m, true);
    return m;
  }

  // Spegelns normal: riktningen den "tittar" åt (a i åttondels varv, 0 = mot +z)
  mirrorNormal(m, out = new THREE.Vector3()) {
    const ang = m.view * (Math.PI / 4);
    return out.set(Math.sin(ang), 0, Math.cos(ang));
  }

  syncMirror(m, instant = false) {
    if (instant) m.view = m.a;
    m.turn.rotation.y = m.view * (Math.PI / 4);
  }

  turnMirror(m) {
    m.a = (m.a + 1) % 8;
    if (m.view > m.a + 4) m.view -= 8; // vrid alltid åt samma håll
    this.ctx.sfx?.play('stonegrind', { vol: 0.8 });
  }

  // Solkristall (0.10): delar en stråle i två, åt vänster och åt höger (vinkelrätt mot strålen)
  addSplitter(id, pos, M = {}, opts = {}) {
    const g = new THREE.Group();
    g.position.copy(pos);
    this.parent.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.75, 6), M.base);
    base.position.y = 0.37;
    g.add(base);
    const mat = new THREE.MeshLambertMaterial({ color: 0xbfe6ff, emissive: 0x2a4a60, transparent: true, opacity: 0.85, flatShading: true });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat);
    gem.scale.set(1, 1.35, 1);
    gem.position.y = BEAM_Y;
    g.add(gem);
    const s = { id, pos: pos.clone(), center: new THREE.Vector3(pos.x, pos.y + BEAM_Y, pos.z), g, gem, mat, lit: 0, room: opts.room };
    this.splitters.push(s);
    return s;
  }

  addEye(id, pos, facing, opts = {}) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = facing;
    this.parent.add(g);
    const frameMat = opts.frame ?? new THREE.MeshLambertMaterial({ color: 0xb08a3c, emissive: 0x2a1c06, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 6, 18), frameMat);
    g.add(ring);
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x5a3a18 });
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.46, 18), irisMat);
    iris.position.z = 0.02;
    g.add(iris);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0x1a0e06 }));
    pupil.position.z = 0.03;
    g.add(pupil);
    // Ögats "Horus-streck" under och bakom
    for (const [x, y, w, h] of [[0.6, -0.1, 0.4, 0.08], [0.25, -0.55, 0.08, 0.4]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), frameMat);
      b.position.set(x, y, 0);
      g.add(b);
    }
    const e = {
      id, pos: pos.clone(), g, irisMat, hold: !!opts.hold, room: opts.room, onLit: opts.onLit ?? null, onOff: opts.onOff ?? null,
      charge: 0, on: false, lit: false, need: opts.need ?? 0.5, radius: opts.radius ?? 0.75, sleeping: !!opts.sleeping,
      // Går att låsa fast vid när prisman är uppe (så att ljuset siktar rakt på ögat)
      noWear: true, hitRadius: 0.6, isEye: true, aimable: false,
      get targetable() { return this.aimable && !this.sleeping && (this.hold || !this.on); },
      get chest() { return this.pos; },
    };
    this.eyes.push(e);
    return e;
  }

  addVeil(id, center, w, h, axis, opts = {}) {
    // axis 'x': slöjan spänner längs z (står i en vägg vinkelrät mot x)
    const geo = new THREE.PlaneGeometry(axis === 'x' ? w : w, h, 6, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 3 + p.getY(i) * 2) * 0.06));
    const mat = new THREE.MeshBasicMaterial({ color: 0x0a0610, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(center);
    if (axis === 'x') m.rotation.y = Math.PI / 2;
    this.parent.add(m);
    const half = axis === 'x' ? new THREE.Vector3(0.25, h / 2, w / 2) : new THREE.Vector3(w / 2, h / 2, 0.25);
    const bbox = { min: center.clone().sub(half), max: center.clone().add(half) };
    const v = {
      id, center: center.clone(), mesh: m, mat, bbox, burnt: false, burn: 0, room: opts.room, onBurn: opts.onBurn ?? null, box: null,
      // Låsbar när prisman är uppe: ljuset siktar på slöjans mitt i strålarnas höjd
      pos: center.clone(), aimPoint: new THREE.Vector3(center.x, center.y - h / 2 + BEAM_Y, center.z), noWear: true, hitRadius: 0.6, aimable: false,
      get targetable() { return this.aimable && !this.burnt; },
      get chest() { return this.aimPoint; },
    };
    this.veils.push(v);
    return v;
  }

  connect(collider) {
    this.collider = collider;
    for (const v of this.veils) v.box = collider.addBox(v.bbox.min.x, v.bbox.min.y, v.bbox.min.z, v.bbox.max.x, v.bbox.max.y, v.bbox.max.z, `veil-${v.id}`);
    for (const m of this.mirrors) if (!m.onBlock) m.box = collider.addBox(m.pos.x - 0.45, m.pos.y, m.pos.z - 0.45, m.pos.x + 0.45, m.pos.y + 1.0, m.pos.z + 0.45, `mirror-${m.id}`);
  }

  setVeil(v, burnt) {
    v.burnt = burnt;
    v.burn = burnt ? 1 : 0;
    v.mesh.visible = !burnt;
    v.mat.opacity = 0.94;
    if (v.box) v.box.enabled = !burnt;
  }

  setEye(e, on) {
    e.on = on;
    e.charge = on ? 1 : 0;
    e.irisMat.color.set(on ? 0xffc040 : 0x5a3a18);
  }

  // ---------- strålarna ----------
  // Följer en stråle från o i riktning d. Returnerar segmenten och vad den slutade i.
  trace(o0, d0, player, skip = null, depth = 0) {
    const out = [];
    const o = o0.clone(), d = d0.clone().normalize();
    let from = skip;
    const prismUp = player.prismUp && player.state === 'move';
    for (let b = 0; b < MAX_BOUNCES; b++) {
      _ray.origin.copy(o);
      _ray.direction.copy(d);
      let best = MAX_LEN, kind = 'wall', obj = null;
      const wall = this.collider.rayIntersect(_ray, MAX_LEN, true);
      if (wall) best = wall.distance;
      for (const v of this.veils) {
        if (v.burnt) continue;
        const h = rayBox(_ray, v.bbox, best + 0.1);
        if (h && h.t <= best + 0.05) { best = h.t; kind = 'veil'; obj = v; }
      }
      for (const m of this.mirrors) {
        if (m === from) continue;
        const t = raySphere(o, d, m.center, 0.5, best);
        if (t !== null && t < best) { best = t; kind = 'mirror'; obj = m; }
      }
      for (const sp of this.splitters) {
        if (sp === from) continue;
        const t = raySphere(o, d, sp.center, 0.5, best);
        if (t !== null && t < best) { best = t; kind = 'splitter'; obj = sp; }
      }
      for (const e of this.eyes) {
        if (e.sleeping) continue;
        const t = raySphere(o, d, e.pos, e.radius, best + 0.3);
        if (t !== null && t < best + 0.3) { best = Math.min(best, t); kind = 'eye'; obj = e; }
      }
      for (const tg of this.targets()) {
        if (!tg.beamable) continue;
        // Stora mål (ormen) kan träffas var som helst längs kroppen
        const pts = tg.beamPoints ? tg.beamPoints() : [tg.beamPoint ?? tg.chest];
        for (const pt of pts) {
          const t = raySphere(o, d, pt, tg.beamRadius ?? 0.8, best);
          if (t !== null && t < best) { best = t; kind = 'target'; obj = tg; }
        }
      }
      if (from !== player) {
        const pc = _v.set(player.feet.x, player.feet.y + 1.15, player.feet.z);
        const t = raySphere(o, d, pc, 0.55, best);
        if (t !== null && t < best && player.state !== 'dead') { best = t; kind = 'player'; obj = player; }
      }
      const end = o.clone().addScaledVector(d, best);
      if (kind === 'mirror' || kind === 'splitter') end.copy(obj.center);
      out.push({ a: o.clone(), b: end, kind, obj });
      if (kind === 'splitter') {
        // Två nya strålar, vinkelrätt åt vänster och höger
        if (depth < 4) {
          for (const sgn of [1, -1]) {
            const nd = new THREE.Vector3(d.z * sgn, 0, -d.x * sgn);
            const ang = Math.round(Math.atan2(nd.x, nd.z) / (Math.PI / 4)) * (Math.PI / 4);
            nd.set(Math.sin(ang), 0, Math.cos(ang));
            out.push(...this.trace(obj.center, nd, player, obj, depth + 1));
          }
        }
        break;
      }
      if (kind === 'mirror') {
        const n = this.mirrorNormal(obj, _v);
        const dn = d.dot(n);
        d.addScaledVector(n, -2 * dn).normalize();
        // Speglarna kastar alltid ljuset i en av åtta riktningar, så att en stråle från prisman
        // inte behöver träffa spegeln exakt rakt för att nå fram
        const ang = Math.round(Math.atan2(d.x, d.z) / (Math.PI / 4)) * (Math.PI / 4);
        d.set(Math.sin(ang), 0, Math.cos(ang));
        o.copy(obj.center);
        from = obj;
        continue;
      }
      if (kind === 'player' && prismUp) {
        o.copy(player.prismPoint);
        d.copy(player.aimDir);
        from = player;
        out[out.length - 1].prism = true;
        continue;
      }
      break;
    }
    return out;
  }

  update(dt, g) {
    this.t += dt;
    const P = g.player;
    for (const e of this.eyes) e.lit = false;
    for (const v of this.veils) v.litNow = false;
    for (const tg of this.targets()) tg.beamLit = false;
    const all = [];
    if (this.enabled && this.collider) {
      for (const w of this.windows) if (w.on) all.push(...this.trace(w.pos, w.dir, P));
      // Schakten: Cello i ljuset med prisman uppe
      for (const s of this.shafts) {
        if (!s.on) continue;
        s.lightMat.opacity = 0.14 + Math.sin(this.t * 1.7 + s.pos.x) * 0.03;
        const inside = Math.hypot(P.feet.x - s.pos.x, P.feet.z - s.pos.z) < s.radius && Math.abs(P.feet.y - s.pos.y) < 1.2;
        s.discMat.opacity = inside && P.prismUp ? 0.9 : 0.5;
        if (inside && P.prismUp && P.state === 'move') {
          const segs = this.trace(P.prismPoint, P.aimDir, P, P);
          if (segs.length) segs[0].prism = true;
          all.push(...segs);
        }
      }
    }
    // Rita segmenten
    let si = 0, hi = 0;
    const ends = [];
    for (const s of all) {
      if (si >= this.segs.length) break;
      const seg = this.segs[si++];
      const len = s.a.distanceTo(s.b);
      seg.g.visible = len > 0.05;
      seg.g.position.copy(s.a);
      _v.copy(s.b).sub(s.a).normalize();
      _q.setFromUnitVectors(_z, _v);
      seg.g.quaternion.copy(_q);
      const pulse = 1 + Math.sin(this.t * 18 + si) * 0.12;
      seg.g.scale.set(pulse, pulse, Math.max(0.01, len));
      if (s.kind !== 'mirror' && s.kind !== 'splitter' && s.kind !== 'player' || (s.kind === 'player' && !P.prismUp)) {
        if (hi < this.hits.length) {
          const sp = this.hits[hi++];
          sp.visible = true;
          sp.position.copy(s.b);
          sp.scale.setScalar(0.9 + Math.sin(this.t * 22 + hi) * 0.2 + (s.kind === 'eye' ? 0.6 : 0));
        }
        ends.push(s);
      }
      // Vad strålen träffar
      if (s.kind === 'eye') s.obj.lit = true;
      else if (s.kind === 'veil') this.burnVeil(s.obj, dt, g, s.b);
      else if (s.kind === 'target') { s.obj.beamLit = true; s.obj.onBeam?.(dt, g, s.b); }
      else if (s.kind === 'mirror') s.obj.lit = 0.25;
      else if (s.kind === 'splitter') s.obj.lit = 0.3;
    }
    for (; si < this.segs.length; si++) this.segs[si].g.visible = false;
    for (; hi < this.hits.length; hi++) this.hits[hi].visible = false;
    this.endLights.forEach((l, i) => {
      const s = ends[i];
      l.on = !!s;
      if (s) {
        l.pos.copy(s.b).addScaledVector(_v.copy(s.a).sub(s.b).normalize(), 0.4);
        l.power = 14;
      }
    });
    if (ends.length) this.ctx.lights.pickT = Math.min(this.ctx.lights.pickT, 0.05);
    this.lastSegs = all;

    // Solögonen laddas när strålen lyser på dem
    for (const e of this.eyes) {
      const before = e.on;
      if (e.lit) e.charge = Math.min(1, e.charge + dt / e.need);
      else if (e.hold || !e.on) e.charge = Math.max(0, e.charge - dt * (e.hold ? 1.4 : 0.8));
      if (!e.on && e.charge >= 1) {
        e.on = true;
        g.sfx.play('secret', { vol: 0.8 });
        g.sfx.play('sunchime');
        g.fx.burst('spark', e.pos.clone(), 18, 0xffd070);
        e.onLit?.(e);
      } else if (e.hold && e.on && e.charge <= 0.35) {
        e.on = false;
        e.onOff?.(e);
      }
      if (!before && e.on && e.hold) g.lights.flash(e.pos, 0xffd080, 20, 6, 0.3);
      const k = e.on ? 1 : e.charge;
      e.irisMat.color.setRGB(0.35 + 0.65 * k, 0.23 + 0.55 * k, 0.09 + 0.16 * k);
    }
    // Speglarna vrids mjukt till sin nya vinkel och glimmar när strålen träffar dem
    for (const m of this.mirrors) {
      const target = m.a;
      if (m.view !== target) {
        const step = dt * 5;
        m.view = Math.abs(target - m.view) <= step ? target : m.view + Math.sign(target - m.view) * step;
        if (m.view === target) m.view = m.a;
      }
      this.syncMirror(m);
      m.lit = Math.max(0, m.lit - dt);
      m.glassMat.emissive.setRGB(0.25 + m.lit * 2, 0.19 + m.lit * 1.5, 0.12 + m.lit * 0.6);
    }
    // Solkristallerna snurrar och lyser när ljuset går igenom dem
    for (const sp of this.splitters) {
      sp.gem.rotation.y += dt * (0.6 + sp.lit * 4);
      if (sp.lit > 0 && !sp.wasLit) this.ctx.sfx?.play('crystal', { vol: 0.6 });
      sp.wasLit = sp.lit > 0;
      sp.lit = Math.max(0, sp.lit - dt);
      sp.mat.emissive.setRGB(0.16 + sp.lit * 2.5, 0.29 + sp.lit * 2.2, 0.38 + sp.lit * 1.6);
    }
    // Slöjorna bleknar när de har brunnit
    for (const v of this.veils) {
      if (v.burnt && v.mesh.visible) {
        v.fade = (v.fade ?? 1) - dt * 1.5;
        v.mat.opacity = Math.max(0, v.fade) * 0.94;
        if (v.fade <= 0) v.mesh.visible = false;
      } else if (!v.burnt) {
        // Slöjan läker om ljuset försvinner innan den har brunnit upp
        if (!v.litNow) v.burn = Math.max(0, v.burn - dt * 0.7);
        v.mat.opacity = 0.94 - v.burn * 0.4;
        v.mesh.position.y = v.center.y + Math.sin(this.t * 2 + v.center.x) * 0.03;
      }
    }
  }

  burnVeil(v, dt, g, at) {
    if (v.burnt) return;
    v.litNow = true;
    v.burn += dt / 1.3;
    if (Math.random() < dt * 20) g.fx.burst('ash', at.clone(), 2);
    if (Math.random() < dt * 4) g.sfx.play('sizzle', { vol: 0.5 });
    if (v.burn >= 1) {
      v.burnt = true;
      v.fade = 1;
      if (v.box) v.box.enabled = false;
      g.fx.burst('ash', v.center.clone(), 40);
      g.fx.burst('spark', v.center.clone(), 20, 0xffc060);
      g.sfx.play('veilburn');
      v.onBurn?.(v);
    }
  }
}

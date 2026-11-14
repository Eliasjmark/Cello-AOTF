// Vädret (0.11): lugnt, regn, åska och dimma, och sanddis i öknen.
// Vädret byter med några timmars mellanrum (spelets klocka) och glider över från ett läge till nästa.
// I åskväder kan blixten slå ner i metall: sköldbärande asklingar och Cellos svärd.
// Håller Cello Mjölnirs skärva med tung vikt dricker hammaren blixten i stället (laddat markslag).
import * as THREE from 'three';

export const WEATHER = {
  calm: { name: 'Calm', rain: 0, fog: 0, over: 0, bolts: 1, strikes: false },
  rain: { name: 'Rain', rain: 1, fog: 0.25, over: 0.8, bolts: 0.5, strikes: false },
  storm: { name: 'Thunderstorm', rain: 1.35, fog: 0.3, over: 1, bolts: 3.2, strikes: true },
  fog: { name: 'Fog', rain: 0, fog: 1, over: 0.55, bolts: 0.15, strikes: false },
  haze: { name: 'Sand haze', rain: 0, fog: 0.75, over: 0.3, bolts: 0, strikes: false, haze: true },
  // 0.16: norr om The Galecrown snöar det i stället
  snow: { name: 'Snow', rain: 0, snow: 1, fog: 0.35, over: 0.6, bolts: 0, strikes: false },
  blizzard: { name: 'Blizzard', rain: 0, snow: 2.2, fog: 0.85, over: 0.9, bolts: 0, strikes: false, cold: true },
};

// Hur ofta varje väder kommer i olika delar av världen
const CLIMATE = {
  world: [['calm', 5], ['rain', 2], ['storm', 1.2], ['fog', 1.6]],
  stormreach: [['calm', 2.5], ['rain', 2], ['storm', 3.2], ['fog', 1]],
  desert: [['calm', 7], ['haze', 3]],
  frost: [['calm', 2.5], ['snow', 3], ['blizzard', 1.6], ['fog', 1]],
};
// Vädret är samma över hela riket, men öknen är torr: regn blir lugnt, dimma blir sanddis
const LOCAL = {
  desert: { rain: 'calm', storm: 'calm', fog: 'haze' }, frost: { rain: 'snow', storm: 'blizzard', haze: 'calm' },
  // 0.21: över titanernas berg regnar det alltid, och ofta åskar det (tills Kronos är besegrad)
  othrys: { calm: 'rain', fog: 'rain', haze: 'rain', snow: 'rain', blizzard: 'storm' },
};
const FLAKES = 1800;

const DROPS = 1400, BOX = 34, HALF = BOX / 2, TOP = 14, FALL = 24;
const lerp = (a, b, k) => a + (b - a) * k;

export class Weather {
  constructor({ scene, sky, sfx, fx, lights }) {
    Object.assign(this, { scene, sky, sfx, fx, lights });
    this.kind = 'calm'; // vädret i riket
    this.until = 0; // när det byter (timmar sedan spelets början)
    this.region = 'world';
    this.outdoor = true;
    this.from = { ...WEATHER.calm };
    this.cur = { ...WEATHER.calm };
    this.blend = 1;
    this.blendRate = 1 / 20;
    this.strikeT = 10;
    this.strike = null;
    this.game = null; // { player, enemies, hud, rig, isSafe }
    this.charged = 0;

    // Regnet: korta streck som faller runt kameran
    const pos = new Float32Array(DROPS * 6);
    this.seeds = new Float32Array(DROPS * 3);
    for (let i = 0; i < DROPS; i++) {
      this.seeds[i * 3] = Math.random() * BOX - HALF;
      this.seeds[i * 3 + 1] = Math.random() * (TOP * 2) - TOP;
      this.seeds[i * 3 + 2] = Math.random() * BOX - HALF;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: 0xa6b4c6, transparent: true, opacity: 0, depthWrite: false, fog: true });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.rain.renderOrder = 5;
    scene.add(this.rain);

    // 0.16: snön: flingor som faller långsamt och vajar runt kameran
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAKES * 3), 3));
    this.flakeSeeds = new Float32Array(FLAKES * 4);
    for (let i = 0; i < FLAKES; i++) {
      this.flakeSeeds[i * 4] = Math.random() * BOX - HALF;
      this.flakeSeeds[i * 4 + 1] = Math.random() * (TOP * 2) - TOP;
      this.flakeSeeds[i * 4 + 2] = Math.random() * BOX - HALF;
      this.flakeSeeds[i * 4 + 3] = Math.random() * 6.28;
    }
    const fc = document.createElement('canvas');
    fc.width = fc.height = 32;
    const fg = fc.getContext('2d');
    const grd = fg.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(240,246,255,0.6)');
    grd.addColorStop(1, 'rgba(240,246,255,0)');
    fg.fillStyle = grd;
    fg.fillRect(0, 0, 32, 32);
    this.snowMat = new THREE.PointsMaterial({ size: 0.16, map: new THREE.CanvasTexture(fc), transparent: true, opacity: 0, depthWrite: false, fog: true, sizeAttenuation: true });
    this.snow = new THREE.Points(sg, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.snow.renderOrder = 5;
    scene.add(this.snow);
    this.snowT = 0;

    // Blixten som slår ner nära Cello, och ringen på marken som varnar
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 6), 3));
    this.boltMat = new THREE.LineBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0, fog: false, depthTest: false });
    this.bolt = new THREE.LineSegments(bg, this.boltMat);
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    this.bolt.renderOrder = 15;
    scene.add(this.bolt);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 28), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.ring.renderOrder = 6;
    scene.add(this.ring);
    this.scorchMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0, depthWrite: false });
    this.scorch = new THREE.Mesh(new THREE.CircleGeometry(1.1, 14), this.scorchMat);
    this.scorch.rotation.x = -Math.PI / 2;
    this.scorch.visible = false;
    scene.add(this.scorch);
  }

  // ---------- sparning ----------
  load(s) {
    const w = s?.weather;
    this.kind = w && WEATHER[w.kind] ? w.kind : 'calm';
    this.until = Number.isFinite(w?.until) ? w.until : 0;
    this.snap();
  }

  store(s) {
    s.weather = { kind: this.kind, until: Math.round(this.until * 100) / 100 };
  }

  // Vädret där Cello är (öknen gör om regn till lugnt och dimma till sanddis)
  get local() {
    return LOCAL[this.region]?.[this.kind] ?? this.kind;
  }

  get name() {
    return WEATHER[this.local].name;
  }

  // Byt utan övergång (laddning, nytt spel, nytt område)
  snap() {
    this.cur = { ...WEATHER[this.local] };
    this.from = { ...this.cur };
    this.blend = 1;
  }

  setRegion(region, outdoor) {
    const before = this.local;
    this.region = region === 'desert' ? 'desert' : region === 'stormreach' ? 'stormreach' : region === 'frost' ? 'frost' : region === 'othrys' ? (this.calmOthrys ? 'world' : 'othrys') : 'world';
    this.outdoor = outdoor;
    if (this.local !== before) this.snap();
    if (!outdoor) {
      this.strike = null;
      this.ring.visible = false;
    }
  }

  // Byt väder (Stormens sång, eller när tiden är ute)
  set(kind, now, hours = 2 + Math.random() * 3, fast = false) {
    this.kind = kind;
    this.until = now + hours;
    this.from = { ...this.cur };
    this.blend = 0;
    this.blendRate = fast ? 1 / 6 : 1 / 20;
  }

  roll(now) {
    const table = CLIMATE[this.region] ?? CLIMATE.world;
    const opts = table.filter(([k]) => k !== this.kind);
    let sum = opts.reduce((a, [, w]) => a + w, 0), r = Math.random() * sum;
    for (const [k, w] of opts) {
      r -= w;
      if (r <= 0) { this.set(k, now); return; }
    }
    this.set('calm', now);
  }

  // dt: sekunder · now: timmar sedan spelets början · running: klockan går (inte på startmenyn eller i tester)
  update(dt, { camera, now, running }) {
    if (running && now >= this.until) {
      if (this.until === 0) this.until = now + 2 + Math.random() * 2; // första gången: lugnt en stund
      else this.roll(now);
    }
    // Övergången mellan två väder
    const target = WEATHER[this.local];
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt * this.blendRate);
    const k = this.blend * this.blend * (3 - 2 * this.blend);
    for (const key of ['rain', 'fog', 'over', 'bolts', 'snow']) this.cur[key] = lerp(this.from[key] ?? 0, target[key] ?? 0, k);
    this.cur.cold = !!target.cold && k > 0.5;
    this.cur.strikes = target.strikes && k > 0.6;
    this.cur.haze = target.haze ? k : (this.from.haze ? 1 - k : 0);
    const out = this.outdoor;
    this.sky.boltRate = out ? this.cur.bolts : 1;
    this.sfx.setRain?.(out ? Math.min(1, this.cur.rain) : 0);

    // Regnet
    const rain = out ? this.cur.rain : 0;
    this.rain.visible = rain > 0.02;
    if (this.rain.visible) {
      this.rainMat.opacity = Math.min(0.6, 0.42 * rain);
      const p = this.rain.geometry.attributes.position.array, sd = this.seeds;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const fall = FALL * (0.85 + rain * 0.15), len = 0.55 + rain * 0.25, slant = 0.12;
      for (let i = 0; i < DROPS; i++) {
        let y = sd[i * 3 + 1] - fall * dt;
        if (y < -TOP) y += TOP * 2;
        sd[i * 3 + 1] = y;
        // Dropparna ligger still i världen; bara de närmaste kamerans ruta ritas
        const x = (((sd[i * 3] - cx) % BOX) + BOX * 1.5) % BOX - HALF;
        const z = (((sd[i * 3 + 2] - cz) % BOX) + BOX * 1.5) % BOX - HALF;
        const o = i * 6;
        p[o] = cx + x; p[o + 1] = cy + y; p[o + 2] = cz + z;
        p[o + 3] = cx + x + slant * len; p[o + 4] = cy + y + len; p[o + 5] = cz + z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Snön
    const snow = out ? this.cur.snow || 0 : 0;
    this.snow.visible = snow > 0.02;
    if (this.snow.visible) {
      this.snowT += dt;
      this.snowMat.opacity = Math.min(0.95, 0.75 * snow);
      this.snowMat.size = 0.12 + 0.05 * snow;
      const p = this.snow.geometry.attributes.position.array, sd = this.flakeSeeds;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const fall = 1.6 + snow * 1.4, wind = (snow - 1) * 4.5;
      for (let i = 0; i < FLAKES; i++) {
        let y = sd[i * 4 + 1] - fall * dt;
        if (y < -TOP) y += TOP * 2;
        sd[i * 4 + 1] = y;
        sd[i * 4] += wind * dt;
        const ph = sd[i * 4 + 3] + this.snowT * 1.3;
        const x = (((sd[i * 4] + Math.sin(ph) * 0.6 - cx) % BOX) + BOX * 1.5) % BOX - HALF;
        const z = (((sd[i * 4 + 2] + Math.cos(ph * 0.8) * 0.6 - cz) % BOX) + BOX * 1.5) % BOX - HALF;
        p[i * 3] = cx + x; p[i * 3 + 1] = cy + y; p[i * 3 + 2] = cz + z;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }

    this.charged = Math.max(0, this.charged - dt);
    this.updateStrike(dt);
  }

  // ---------- blixtnedslag ----------
  updateStrike(dt) {
    const G = this.game;
    const s = this.strike;
    if (s && !G.active()) return; // ett samtal eller en filmscen pausar nedslaget
    if (s) {
      s.t += dt;
      const P = G.player;
      // Ringen följer målet en stund, sedan står den still: då gäller det att flytta sig
      if (s.t < s.lock) {
        const tp = s.target === 'player' ? P.feet : s.target.pos;
        s.point.set(tp.x, tp.y, tp.z);
      }
      this.ring.visible = true;
      this.ring.position.set(s.point.x, s.point.y + 0.06, s.point.z);
      const urgent = s.t >= s.lock;
      this.ringMat.color.set(urgent ? 0xfff2a0 : 0x9fdcff);
      this.ringMat.opacity = 0.35 + 0.35 * Math.abs(Math.sin(s.t * (urgent ? 22 : 9)));
      this.ring.scale.setScalar(1.15 - Math.min(1, s.t / s.at) * 0.25);
      s.zapT -= dt;
      if (s.zapT <= 0) {
        s.zapT = 0.28;
        this.sfx.play('zap', { vol: 0.35 });
        const sp = s.target === 'player' ? P.swordTip.clone() : s.target.chest.clone();
        this.fx.burst('spark', sp, 4, 0xbfe4ff);
      }
      if (s.t >= s.at) this.fire(s);
    } else {
      this.ring.visible = false;
      const ok = this.outdoor && this.cur.strikes && G && G.active();
      if (ok) {
        this.strikeT -= dt;
        if (this.strikeT <= 0) {
          this.strikeT = 9 + Math.random() * 9;
          this.aim();
        }
      } else this.strikeT = Math.max(this.strikeT, 6);
    }
    // Blixten och det svedda märket bleknar
    if (this.boltMat.opacity > 0) {
      this.boltMat.opacity = Math.max(0, this.boltMat.opacity - dt * 3.2);
      this.bolt.visible = this.boltMat.opacity > 0.01;
    }
    if (this.scorchMat.opacity > 0) {
      this.scorchMat.opacity = Math.max(0, this.scorchMat.opacity - dt * 0.08);
      this.scorch.visible = this.scorchMat.opacity > 0.01;
    }
  }

  // Välj vad blixten ska slå ner i: metall nära Cello
  aim() {
    const G = this.game, P = G.player;
    const metal = G.enemies.list.filter((e) => e.hasShield && e.targetable && e.area === G.area()
      && Math.hypot(e.pos.x - P.feet.x, e.pos.z - P.feet.z) < 24);
    let target = null;
    if (metal.length && Math.random() < 0.6) target = metal[Math.floor(Math.random() * metal.length)];
    else if (!G.isSafe(P.feet.x, P.feet.z) && !P.carried && P.state !== 'dead') target = 'player';
    if (!target) return;
    const tp = target === 'player' ? P.feet : target.pos;
    this.strike = { target, t: 0, lock: 1.0, at: 1.9, zapT: 0, point: new THREE.Vector3(tp.x, tp.y, tp.z) };
    if (target === 'player' && !this.warned) {
      this.warned = true;
      G.hud.toast("Cello's sword crackles! Lightning seeks metal — move away from the ring!", 4200);
    }
  }

  // Tvinga ett nedslag nu (tester)
  strikeAt(target) {
    const P = this.game.player, tp = target === 'player' ? P.feet : target.pos;
    this.strike = { target, t: 0, lock: 1.0, at: 1.9, zapT: 0, point: new THREE.Vector3(tp.x, tp.y, tp.z) };
  }

  fire(s) {
    const G = this.game, P = G.player, pt = s.point;
    this.strike = null;
    this.ring.visible = false;
    // Själva blixten: en taggig linje från molnen ner till marken
    const arr = this.bolt.geometry.attributes.position.array;
    let x = pt.x + (Math.random() - 0.5) * 10, y = pt.y + 70, z = pt.z + (Math.random() - 0.5) * 10, n = 0;
    while (y > pt.y && n < 58) {
      const k = Math.max(0, (y - pt.y - 9) / 70);
      const ny = Math.max(pt.y, y - (5 + Math.random() * 6));
      const nx = ny <= pt.y ? pt.x : lerp(pt.x, x, k) + (Math.random() - 0.5) * 4 * k;
      const nz = ny <= pt.y ? pt.z : lerp(pt.z, z, k) + (Math.random() - 0.5) * 4 * k;
      arr.set([x, y, z, nx, ny, nz], n * 6);
      n++;
      if (Math.random() < 0.25 && n < 58) {
        arr.set([nx, ny, nz, nx + (Math.random() - 0.5) * 6, ny - 3 - Math.random() * 4, nz + (Math.random() - 0.5) * 6], n * 6);
        n++;
      }
      x = nx; y = ny; z = nz;
    }
    for (let i = n; i < 60; i++) arr.fill(0, i * 6, i * 6 + 6);
    this.bolt.geometry.attributes.position.needsUpdate = true;
    this.bolt.geometry.setDrawRange(0, n * 2);
    this.boltMat.opacity = 1;
    this.bolt.visible = true;
    this.scorch.position.set(pt.x, pt.y + 0.04, pt.z);
    this.scorchMat.opacity = 0.55;
    this.scorch.visible = true;
    this.sky.flashNow?.(pt);
    this.lights.flash(pt.clone().setY(pt.y + 2), 0xd8ecff, 80, 22, 0.4);
    this.sfx.play('thunder', { vol: 1.2 });
    this.sfx.play('zap', { vol: 1 });
    this.sfx.play('slam', { vol: 0.6 });
    this.fx.shockwave(pt.clone().setY(pt.y + 0.1), 0xd8ecff, 2.6);
    this.fx.burst('spark', pt.clone().setY(pt.y + 0.3), 28, 0xd8ecff);
    G.rig.shake(0.5);
    const d = Math.hypot(P.feet.x - pt.x, P.feet.z - pt.z);
    if (d < 2.3 && Math.abs(P.feet.y - pt.y) < 2.5 && P.state !== 'dead') {
      if (P.heavy && P.hasHammer) {
        // Mjölnir dricker blixten
        this.charged = 20;
        P.charged = 20;
        this.fx.burst('spark', P.feet.clone().setY(P.feet.y + 1.2), 30, 0x9fdcff);
        this.sfx.play('heavyon');
        G.hud.toast("Mjölnir drinks the lightning! Cello's next ground strike is charged.", 4200);
        G.onCharged?.();
      } else {
        P.takeHit(2, new THREE.Vector3(pt.x + 0.01, pt.y, pt.z + 0.01), { unblockable: true, force: true });
        G.onPlayerStruck?.();
      }
    }
    // Asklingar nära nedslaget: skölden smälter och de tar hård skada
    const ctx = G.enemyCtx();
    for (const e of G.enemies.list) {
      if (!e.targetable || e.area !== G.area()) continue;
      if (Math.hypot(e.pos.x - pt.x, e.pos.z - pt.z) > 2.8) continue;
      if (e.hasShield) {
        e.hasShield = false;
        if (e.shieldMesh) e.shieldMesh.visible = false;
        this.sfx.play('shieldbreak');
      }
      e.hurt?.(3, pt, { ...ctx, unblockable: true });
    }
  }
}

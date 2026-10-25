// Startmenyn (0.9): Cello (hjältemodellen Elias skickade) i stormen, med logotyp, två sparfiler, inställningar och musik.
//
//   Tryck på valfri tangent → huvudmenyn: Continue · New Game · Load Game · Options · How to Play · Credits
//   New Game och Load Game visar fil 1 och fil 2 (plats, hjärtan, skärvor, reliker, speltid).
//   En fil kan startas, kopieras till den andra platsen eller raderas.
//
// Scenen ritas med samma renderare som spelet, men i full upplösning och med en egen kamera.
import * as THREE from 'three';
import { loadHero } from './heroModel.js';
import { listSaves, eraseSave, copySave, continueSlot } from './story.js';
import { heartSvg } from './hud.js';

const SETTINGS_KEY = 'cello-ashes-of-the-fallen:settings';
// 0.14: retroläget är avstängt från början (det går att slå på i inställningarna eller med P)
export const DEFAULT_SETTINGS = { music: 8, sound: 8, pixel: false, v: 2 };

export function loadSettings() {
  try {
    const s = { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}) };
    // äldre sparade inställningar hade retroläget på från början: stäng av det en gång
    if (!(s.v >= 2)) { s.pixel = false; s.v = 2; }
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function storeSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ingen lagring */ }
}

// ---------------------------------------------------------------------------
// Himlen: mörk storm, moln som driver, glöden från den brinnande byn vid horisonten
// ---------------------------------------------------------------------------
const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = `
uniform float uTime, uFlash;
uniform vec3 uEmber;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 top = vec3(0.016, 0.022, 0.045), mid = vec3(0.06, 0.07, 0.115), hor = vec3(0.20, 0.09, 0.085);
  vec3 col = mix(hor, mid, smoothstep(-0.04, 0.22, h));
  col = mix(col, top, smoothstep(0.22, 0.85, h));
  vec2 flat2 = normalize(vec2(d.x, d.z) + 1e-5);
  float e = max(dot(flat2, normalize(uEmber.xz)), 0.0);
  float glow = pow(e, 5.0) * smoothstep(0.38, -0.03, h);
  col += vec3(0.62, 0.20, 0.07) * glow;
  // Molnen: projicerade på ett tak, tunnare mot horisonten
  float hh = max(h, 0.035);
  vec2 uv = d.xz / (hh + 0.22) * 1.35 + vec2(uTime * 0.018, uTime * 0.007);
  float c = fbm(uv) * 0.72 + fbm(uv * 2.4 - vec2(uTime * 0.03, 0.0)) * 0.38;
  float cl = smoothstep(0.46, 0.86, c) * smoothstep(-0.03, 0.12, h);
  vec3 cloud = mix(vec3(0.085, 0.095, 0.14), vec3(0.36, 0.15, 0.10), clamp(glow * 1.6, 0.0, 1.0));
  col = mix(col, cloud, cl * 0.9);
  // Under horisonten: ett hav av moln och aska
  float below = smoothstep(0.02, -0.12, h);
  float sea = fbm(d.xz / (abs(h) + 0.15) * 2.0 + vec2(uTime * 0.01, 0.0));
  col = mix(col, mix(vec3(0.03, 0.03, 0.05), vec3(0.16, 0.07, 0.06), glow * 0.9 + sea * 0.25), below);
  // Blixten lyser upp molnen
  col += vec3(0.50, 0.62, 0.95) * uFlash * (0.18 + cl * 1.1) * smoothstep(-0.15, 0.35, h);
  gl_FragColor = vec4(col, 1.0);
}`;

// Mjuk dimtextur, ritad en gång
function mistTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256, y = 40 + rnd() * 60, r = 18 + rnd() * 46;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    // samma moln en bredd bort, så att texturen går att upprepa i sidled
    g.save(); g.translate(x > 128 ? -256 : 256, 0); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// En blixt: en ojämn bana med grenar, som ett platt band mot kameran
function boltGeometry(from, to, rnd) {
  const pos = [];
  const strand = (a, b, w, depth) => {
    const pts = [a.clone()];
    const n = 14;
    for (let i = 1; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      const k = (1 - Math.abs(i / n - 0.5) * 1.4) * a.distanceTo(b) * 0.07;
      p.x += (rnd() - 0.5) * k;
      p.z += (rnd() - 0.5) * k * 0.3;
      pts.push(p);
    }
    pts.push(b.clone());
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], ww = w * (1 - i / pts.length * 0.6);
      pos.push(p.x - ww, p.y, p.z, p.x + ww, p.y, p.z, q.x + ww, q.y, q.z, p.x - ww, p.y, p.z, q.x + ww, q.y, q.z, q.x - ww, q.y, q.z);
      if (depth < 2 && i > 2 && rnd() < 0.18) {
        const end = p.clone().add(new THREE.Vector3((rnd() - 0.5) * 70, -30 - rnd() * 50, 0));
        strand(p, end, w * 0.5, depth + 1);
      }
    }
  };
  strand(from, to, 1.1, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function rockGeometry(r, seed) {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const p = g.attributes.position;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const v = new THREE.Vector3();
  const off = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!off.has(key)) off.set(key, 0.75 + rnd() * 0.5);
    const k = off.get(key);
    // Flytande öar: platt ovansida, spetsig undersida
    v.multiplyScalar(k);
    if (v.y > 0) v.y *= 0.35; else v.y *= 1.6;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const fmtTime = (sec) => {
  const m = Math.floor((sec || 0) / 60), h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
};
const fmtDate = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

const ICONS = {
  hammer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h11v6H4z M8.5 11h2v9h-2z" fill="currentColor"/><path d="M15 6l4-2v8l-4-2z" fill="currentColor" opacity=".7"/></svg>',
  prism: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 16H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9l3 7H9z" fill="currentColor"/></svg>',
  trident: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 9h2v13h-2z" fill="currentColor"/><path d="M5 2h2v6h4V2h2v6h4V2h2v8H5z" fill="currentColor" opacity=".85"/></svg>',
  sandals: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h12l3-3h3v4H3z" fill="currentColor"/><path d="M14 9c3-4 6-5 9-5-2 2-3 4-4 6 1 0 2 0 3 1-3 1-5 1-8-2z" fill="currentColor" opacity=".7"/></svg>',
  scales: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4h2v15h-2z M7 20h10v2H7z M3 7h18v1.6H3z" fill="currentColor"/><path d="M3 9l-2 5h6z M21 9l-2 5h6z" fill="currentColor" opacity=".75"/></svg>',
  horn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c4 0 9-3 12-9l3 1c-2 7-8 12-15 12z" fill="currentColor"/></svg>',
  shard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l5 8-5 12-5-12z" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

export class TitleScreen {
  // opts: { renderer, sfx, music, input, areaName(id), onStart(mode, slot), onSettings(settings), settings }
  constructor(opts) {
    this.o = opts;
    this.renderer = opts.renderer;
    this.sfx = opts.sfx;
    this.active = true;
    this.t = 0;
    this.state = 'press';
    this.settings = { ...opts.settings };
    this.flash = 0;
    this.nextBolt = 2.4;
    this.leaving = 0;
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    this.pad = { up: false, down: false, left: false, right: false, a: false, b: false, start: false };
    this.heroReady = false;
    this.el = {
      root: document.getElementById('start'),
      press: document.getElementById('title-press'),
      menu: document.getElementById('title-menu'),
      panel: document.getElementById('title-panel'),
      logo: document.getElementById('title-logo'),
      live: document.getElementById('title-live'),
    };
    this.veil = document.createElement('div');
    this.veil.className = 'title-veil';
    document.body.appendChild(this.veil);
    this.buildScene();
    this.bindInput();
    this.el.root.classList.add('intro');
    requestAnimationFrame(() => this.el.root.classList.add('ready'));
  }

  // ---------------------------------------------------------------------
  // Scenen
  // ---------------------------------------------------------------------
  buildScene() {
    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.FogExp2(0x0b0d14, 0.0028);
    const cam = (this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000));
    cam.position.set(0, 33, 92);

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uFlash: { value: 0 }, uEmber: { value: new THREE.Vector3(-0.55, 0, -1) } },
    }));
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    // Ljus: kallt månljus framifrån, eld nerifrån, två kantljus bakifrån och blixten
    this.hemi = new THREE.HemisphereLight(0xb8c2d8, 0x3a2a22, 1.15);
    scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xf0ece4, 3.3);
    key.position.set(30, 55, 90);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fa6d0, 1.0);
    fill.position.set(-60, 20, 50);
    scene.add(fill);
    this.fire = new THREE.PointLight(0xff7a2c, 320, 110, 1.6);
    this.fire.position.set(-30, 4, 34);
    scene.add(this.fire);
    const rimL = new THREE.DirectionalLight(0x6f98ff, 2.4);
    rimL.position.set(-60, 50, -70);
    scene.add(rimL);
    const rimR = new THREE.DirectionalLight(0xff7038, 1.7);
    rimR.position.set(70, 20, -60);
    scene.add(rimR);
    this.flashLight = new THREE.DirectionalLight(0xd8e6ff, 0);
    this.flashLight.position.set(10, 120, -80);
    scene.add(this.flashLight);

    // Hjälten
    this.hero = new THREE.Group();
    this.hero.rotation.y = -0.18;
    scene.add(this.hero);
    this.heroMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.06 });
    loadHero().then((g) => {
      const m = new THREE.Mesh(g, this.heroMat);
      m.position.set(2.3, 0, 6.4); // kroppens axel i origo
      this.hero.add(m);
      this.heroMesh = m;
      this.heroReady = true;
    }).catch(() => {
      // Utan modellen: bara stormen och logotypen
      this.heroReady = false;
    });
    // Ett svagt sken bakom huvudet
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dotTexture(), color: 0x6f8cc8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    halo.scale.set(70, 70, 1);
    halo.position.set(0, 40, -30);
    scene.add(halo);
    this.halo = halo;

    // Brutna pelare och flytande öar i fjärran
    const stone = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.95, flatShading: true });
    const far = new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 1, flatShading: true });
    for (const [x, y, z, r, s] of [[190, 150, -600, 26, 41]]) {
      const rock = new THREE.Mesh(rockGeometry(r, s), far);
      rock.position.set(x, y, z);
      rock.rotation.y = s;
      scene.add(rock);
    }
    for (const [x, z, h, tilt] of [[70, -70, 50, -0.08], [118, -260, 64, 0.05]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, h, 9), stone);
      col.position.set(x, h / 2 - 6, z);
      col.rotation.z = tilt;
      scene.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 9), stone);
      cap.position.set(x + tilt * h * 0.5, h - 5, z);
      cap.rotation.set(0.1, 0.4, tilt * 2);
      scene.add(cap);
    }

    // Dimma kring höfterna (modellen slutar vid kjolen), framför och bakom honom
    const mt = mistTexture();
    this.mists = [];
    for (const [y, z, w, h, op, col, sp] of [
      [7, -40, 420, 60, 0.55, 0x3a3f52, 0.004], [2, 2, 260, 26, 0.8, 0x2a2d39, -0.006], [-2, 34, 320, 22, 0.95, 0x17181f, 0.009],
    ]) {
      const tex = mt.clone();
      tex.needsUpdate = true;
      tex.repeat.set(w / 160, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: op, depthWrite: false, fog: false }));
      m.position.set(0, y, z);
      scene.add(m);
      this.mists.push({ m, tex, sp });
    }
    // Ett mörkt golv av moln under dimman


    // Glöd som stiger och aska som faller
    const dot = dotTexture();
    const mk = (n, color, size, opacity) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
      p.frustumCulled = false;
      scene.add(p);
      return { p, n, seeds: Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, v: 0, ph: Math.random() * 7, w: 0.5 + Math.random() })) };
    };
    this.embers = mk(260, 0xff8a3a, 1.1, 0.9);
    this.ash = mk(220, 0x9aa0ab, 0.55, 0.55);
    this.ash.p.material.blending = THREE.NormalBlending;
    const reset = (s, ember, initial) => {
      s.x = (Math.random() - 0.5) * 220;
      s.z = -120 + Math.random() * 190;
      s.y = ember ? (initial ? Math.random() * 90 : -5) : (initial ? Math.random() * 90 : 95);
      s.v = ember ? 3 + Math.random() * 6 : -(1.2 + Math.random() * 2);
    };
    this.resetParticle = reset;
    for (const s of this.embers.seeds) reset(s, true, true);
    for (const s of this.ash.seeds) reset(s, false, true);

    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.bolt = null;
  }

  strike(big = false) {
    const rnd = Math.random;
    const x = big ? 30 : (rnd() < 0.5 ? -1 : 1) * (80 + rnd() * 160);
    const from = new THREE.Vector3(x, 330, -420), to = new THREE.Vector3(x + (rnd() - 0.5) * 90, -10, -380);
    if (this.bolt) { this.scene.remove(this.bolt); this.bolt.geometry.dispose(); }
    this.bolt = new THREE.Mesh(boltGeometry(from, to, rnd), this.boltMat);
    this.scene.add(this.bolt);
    this.boltT = 0;
    this.flash = big ? 1.3 : 0.75 + rnd() * 0.35;
    if (!this.reduced) this.sfx.play('thunder', { vol: big ? 1.0 : 0.55, delay: big ? 0 : 0.25 + rnd() * 0.6 });
  }

  // ---------------------------------------------------------------------
  // Varje bildruta
  // ---------------------------------------------------------------------
  resize(w, h) {
    this.w = w;
    this.h = h;
    const cam = this.camera;
    cam.aspect = w / h;
    // Brett: logotypen till vänster och Cello till höger. Smalt (mobil): Cello i mitten, menyn under.
    const wide = w / h > 1.15;
    this.wide = wide;
    cam.fov = wide ? 30 : 40;
    cam.filmOffset = wide ? -Math.min(9, (w / h - 1) * 7) : 0;
    cam.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const t = this.t;
    // Kameran andas långsamt och följer pekaren lite
    const P = this.pointer;
    P.sx += (P.x - P.sx) * (1 - Math.exp(-dt * 2.5));
    P.sy += (P.y - P.sy) * (1 - Math.exp(-dt * 2.5));
    const intro = Math.min(1, t / 4.5), ease = 1 - Math.pow(1 - intro, 3);
    const dist = (this.wide ? 96 : 118) - 26 * (1 - ease) - this.leaving * 30;
    const yaw = Math.sin(t * 0.11) * 0.07 + P.sx * 0.07 + 0.04;
    const camY = (this.wide ? 21 : 22) + Math.sin(t * 0.17) * 1.0 - P.sy * 2.5 - (1 - ease) * 6;
    this.camera.position.set(Math.sin(yaw) * dist, camY, Math.cos(yaw) * dist);
    this.camera.lookAt(0, this.wide ? 31 : 32, 0);
    // Hjälten andas
    if (this.heroMesh) {
      this.hero.position.y = Math.sin(t * 1.1) * 0.15;
      this.hero.rotation.y = -0.18 + Math.sin(t * 0.23) * 0.03;
    }
    // Blixtar
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.strike();
      this.nextBolt = 6 + Math.random() * 7;
    }
    this.flash = Math.max(0, this.flash - dt * 2.2);
    const fl = this.flash > 0 ? this.flash * (0.65 + 0.35 * Math.sin(t * 60)) : 0;
    this.sky.material.uniforms.uTime.value = t;
    this.sky.material.uniforms.uFlash.value = fl;
    this.flashLight.intensity = fl * 7;
    this.hemi.intensity = 1.15 + fl * 0.9;
    this.halo.material.opacity = 0.28 + fl * 0.5 + Math.sin(t * 0.7) * 0.04;
    if (this.bolt) {
      this.boltT += dt;
      this.boltMat.opacity = this.boltT < 0.35 ? (Math.sin(this.boltT * 70) > -0.3 ? 1 : 0.25) * (1 - this.boltT / 0.35) : 0;
      if (this.boltT > 0.4) { this.scene.remove(this.bolt); this.bolt.geometry.dispose(); this.bolt = null; }
    }
    // Elden fladdrar
    this.fire.intensity = 300 + Math.sin(t * 13) * 25 + Math.sin(t * 7.3) * 35 + Math.random() * 25;
    // Dimman driver
    for (const m of this.mists) m.tex.offset.x += m.sp * dt;
    // Partiklar
    const step = (sys, ember) => {
      const a = sys.p.geometry.attributes.position.array;
      sys.seeds.forEach((s, i) => {
        s.y += s.v * dt;
        s.x += Math.sin(t * s.w + s.ph) * dt * (ember ? 2.4 : 1.2) + (ember ? 1.2 : 0.6) * dt;
        if ((ember && s.y > 100) || (!ember && s.y < -6)) this.resetParticle(s, ember, false);
        a[i * 3] = s.x; a[i * 3 + 1] = s.y; a[i * 3 + 2] = s.z;
      });
      sys.p.geometry.attributes.position.needsUpdate = true;
    };
    step(this.embers, true);
    step(this.ash, false);
    this.embers.p.material.opacity = 0.75 + Math.sin(t * 3) * 0.1;
    this.pollPad();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ---------------------------------------------------------------------
  // Inmatning
  // ---------------------------------------------------------------------
  bindInput() {
    this.onKey = (e) => {
      if (!this.active || this.leaving) return;
      const k = e.key;
      if (this.state === 'press') {
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(k)) return;
        e.preventDefault();
        this.openMenu();
        return;
      }
      if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); this.move(1); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); this.move(-1); }
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); this.side(-1); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); this.side(1); }
      else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') { e.preventDefault(); this.activate(); }
      else if (k === 'Escape' || k === 'Backspace' || k === 'q' || k === 'Q') { e.preventDefault(); this.back(); }
    };
    addEventListener('keydown', this.onKey);
    this.el.root.addEventListener('pointerdown', (e) => {
      if (!this.active || this.leaving) return;
      if (this.state === 'press') { e.preventDefault(); this.openMenu(); }
    });
    this.onMove = (e) => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener('pointermove', this.onMove);
  }

  pollPad() {
    const gp = navigator.getGamepads?.()?.find((g) => g && g.connected);
    if (!gp) return;
    const b = (i) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
    const now = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1), start: b(9) };
    const edge = (k) => now[k] && !this.pad[k];
    if (this.active && !this.leaving) {
      if (this.state === 'press' && (edge('a') || edge('start'))) this.openMenu();
      else if (this.state !== 'press') {
        if (edge('down')) this.move(1);
        if (edge('up')) this.move(-1);
        if (edge('left')) this.side(-1);
        if (edge('right')) this.side(1);
        if (edge('a') || edge('start')) this.activate();
        if (edge('b')) this.back();
      }
    }
    this.pad = now;
  }

  // ---------------------------------------------------------------------
  // Menyerna
  // ---------------------------------------------------------------------
  openMenu() {
    this.o.unlockAudio?.();
    this.sfx.play('menuOpen');
    this.el.root.classList.add('menu-open');
    this.el.press.hidden = true;
    // Samma tryck som öppnade menyn får inte också välja något i den
    this.armed = performance.now() + 400;
    this.showMain();
  }

  // En lista med knappar. items: [{ label, sub?, run, disabled?, cls? }]
  list(container, items, focus = 0) {
    container.innerHTML = '';
    this.items = [];
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `title-item ${it.cls || ''}`;
      b.innerHTML = `<span class="mark" aria-hidden="true"></span><span class="label">${it.label}</span>${it.sub ? `<span class="sub">${it.sub}</span>` : ''}`;
      if (it.disabled) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('pointerenter', () => this.focus(this.items.indexOf(entry), true));
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (performance.now() < (this.armed || 0) || this.leaving) return;
        this.focus(this.items.indexOf(entry));
        this.activate();
      });
      container.appendChild(b);
      const entry = { ...it, el: b };
      this.items.push(entry);
    });
    this.focus(Math.max(0, Math.min(focus, this.items.length - 1)), false, true);
  }

  focus(i, sound = true, silent = false) {
    if (i < 0 || !this.items?.[i]) return;
    if (this.cur === i && !silent) return;
    this.cur = i;
    this.items.forEach((it, k) => it.el.classList.toggle('on', k === i));
    const el = this.items[i].el;
    el.focus({ preventScroll: true });
    // Rulla panelen så att det valda syns (inte hela sidan)
    const p = this.el.panel;
    if (!p.hidden && p.contains(el)) {
      const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
      if (r.bottom > pr.bottom - 6) p.scrollTop += r.bottom - pr.bottom + 10;
      else if (r.top < pr.top + 6) p.scrollTop -= pr.top - r.top + 10;
    }
    if (sound && !silent) this.sfx.play('menuMove');
    this.items[i].onFocus?.();
  }

  move(d) {
    if (!this.items?.length) return;
    const n = this.items.length;
    let i = this.cur;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.items[i].skip) break;
    }
    this.focus(i);
  }

  side(d) {
    const it = this.items?.[this.cur];
    if (it?.adjust) it.adjust(d);
    else if (this.state === 'files' || this.state === 'actions' || this.state === 'confirm') this.move(d);
  }

  activate() {
    const it = this.items?.[this.cur];
    if (!it) return;
    if (it.disabled) { this.sfx.play('menuDeny'); return; }
    it.run();
  }

  back() {
    const b = this.backTo;
    if (!b) return;
    this.sfx.play('menuBack');
    b();
  }

  setPanel(html, cls = '') {
    const p = this.el.panel;
    p.className = `title-panel ${cls}`;
    p.innerHTML = html;
    p.hidden = !html;
  }

  say(text) {
    this.el.live.textContent = text;
  }

  showMain(focusId) {
    this.state = 'main';
    this.backTo = null;
    this.setPanel('');
    this.el.menu.hidden = false;
    this.el.root.dataset.view = 'main';
    const saves = listSaves();
    const any = saves.some((s) => s.save);
    const cont = continueSlot();
    const items = [];
    if (cont) items.push({ id: 'continue', label: 'Continue', sub: `File ${cont} · ${this.where(saves[cont - 1].save)}`, run: () => this.start('continue', cont) });
    items.push({ id: 'new', label: 'New Game', run: () => this.showFiles('new') });
    items.push({ id: 'load', label: 'Load Game', disabled: !any, run: () => this.showFiles('load') });
    items.push({ id: 'options', label: 'Options', run: () => this.showOptions() });
    items.push({ id: 'howto', label: 'How to Play', run: () => this.showHowTo() });
    items.push({ id: 'credits', label: 'Credits', run: () => this.showCredits() });
    const f = Math.max(0, items.findIndex((it) => it.id === focusId));
    this.list(this.el.menu, items, f);
  }

  where(save) {
    if (!save) return '';
    return this.o.areaName?.(save.state.area) || 'Hollowbrook';
  }

  // Ett kort för en sparfil
  fileCard(n, save) {
    if (!save) {
      return `<span class="file-num">File ${n}</span><span class="file-empty">Empty</span><span class="file-hint">Begin a new journey</span>`;
    }
    const s = save.state;
    const hearts = (6 + (s.amulet ? 2 : 0) + 2 * (s.hearts || 0)) / 2;
    const heartRow = Array.from({ length: hearts }, (_, i) => `<span class="heart">${heartSvg(`f${n}${i}`)}</span>`).join('');
    const relics = [s.items?.hammer && ['hammer', "Mjölnir's Shard"], s.items?.prism && ['prism', "Ra's Shattered Prism"], s.items?.scales && ['scales', "Anubis' Broken Scales"], s.items?.sandals && ['sandals', "Hermes' Wing Sandals"], s.items?.trident && ['trident', "Poseidon's Corrupted Trident"], s.goat?.have && ['horn', 'Grumble']]
      .filter(Boolean).map(([k, name]) => `<span class="relic" title="${name}">${ICONS[k]}<span class="sr">${name}</span></span>`).join('');
    return `<span class="file-num">File ${n}</span>
      <span class="file-where">${this.where(save)}</span>
      <span class="file-hearts" aria-label="${hearts} hearts">${heartRow}</span>
      <span class="file-stats"><span>${ICONS.shard}${s.shards || 0}</span><span>${ICONS.clock}${fmtTime(s.playTime)}</span>${relics ? `<span class="relics">${relics}</span>` : ''}</span>
      <span class="file-date">Saved ${fmtDate(save.savedAt)}</span>`;
  }

  showFiles(mode, focusSlot = null) {
    this.state = 'files';
    this.fileMode = mode;
    this.el.root.dataset.view = 'files';
    this.backTo = () => this.showMain(mode === 'new' ? 'new' : 'load');
    this.el.menu.hidden = true;
    const saves = listSaves();
    this.setPanel(`<h2 class="panel-title">${mode === 'new' ? 'New Game' : 'Load Game'}</h2>
      <p class="panel-sub">${mode === 'new' ? 'Choose a file for the new journey.' : 'Choose a file to continue.'}</p>
      <div class="files" id="title-files"></div>
      <div class="file-actions" id="title-actions"></div>
      <p class="panel-keys"><kbd>Esc</kbd> back</p>`, 'panel-files');
    const box = document.getElementById('title-files');
    const items = saves.map(({ slot, save }) => ({
      label: this.fileCard(slot, save), cls: `file ${save ? 'used' : 'empty'}`, slot, save,
      run: () => this.pickFile(slot, save),
    }));
    items.push({ label: 'Back', cls: 'back-btn', run: () => this.back() });
    const f = focusSlot ? focusSlot - 1 : Math.max(0, mode === 'load' ? saves.findIndex((s) => s.save) : saves.findIndex((s) => !s.save));
    this.list(box, items, f);
  }

  pickFile(slot, save) {
    const other = slot === 1 ? 2 : 1;
    if (this.fileMode === 'new') {
      if (!save) { this.sfx.play('menuSelect'); this.start('new', slot); return; }
      this.sfx.play('menuSelect');
      this.confirm(`File ${slot} will be overwritten.`, 'The journey saved there will be lost forever.', [
        { label: 'Overwrite', cls: 'danger', run: () => { eraseSave(slot); this.start('new', slot); } },
        { label: 'Cancel', run: () => this.back() },
      ], () => this.showFiles('new', slot));
      return;
    }
    if (!save) {
      this.sfx.play('menuSelect');
      this.confirm(`File ${slot} is empty.`, 'Begin a new journey here?', [
        { label: 'Begin', run: () => this.start('new', slot) },
        { label: 'Cancel', run: () => this.back() },
      ], () => this.showFiles('load', slot));
      return;
    }
    // En använd fil: starta, kopiera eller radera
    this.sfx.play('menuSelect');
    this.state = 'actions';
    this.backTo = () => this.showFiles('load', slot);
    const fileEls = document.querySelectorAll('#title-files .file');
    fileEls.forEach((el, i) => { el.classList.toggle('picked', i === slot - 1); el.classList.remove('on'); });
    const saves = listSaves();
    this.list(document.getElementById('title-actions'), [
      { label: 'Start', run: () => this.start('continue', slot) },
      { label: `Copy to File ${other}`, run: () => {
        const go = () => { copySave(slot, other); this.sfx.play('save'); this.say(`File ${slot} copied to File ${other}.`); this.showFiles('load', other); };
        if (saves[other - 1].save) {
          this.sfx.play('menuSelect');
          this.confirm(`Copy File ${slot} over File ${other}?`, `The journey in File ${other} will be lost forever.`, [
            { label: 'Copy', cls: 'danger', run: go }, { label: 'Cancel', run: () => this.back() },
          ], () => this.showFiles('load', slot));
        } else go();
      } },
      { label: 'Erase', cls: 'danger', run: () => {
        this.sfx.play('menuSelect');
        this.confirm(`Erase File ${slot}?`, 'This journey will be lost forever.', [
          { label: 'Erase', cls: 'danger', run: () => {
            eraseSave(slot);
            this.sfx.play('menuErase');
            this.say(`File ${slot} erased.`);
            if (listSaves().some((s) => s.save)) this.showFiles('load', slot); else this.showMain('new');
          } },
          { label: 'Cancel', run: () => this.back() },
        ], () => this.showFiles('load', slot));
      } },
      { label: 'Cancel', run: () => this.back() },
    ], 0);
  }

  confirm(title, text, buttons, onBack) {
    this.state = 'confirm';
    this.backTo = onBack;
    this.el.root.dataset.view = 'confirm';
    this.setPanel(`<div class="confirm" role="alertdialog" aria-labelledby="title-confirm-h"><h2 class="panel-title" id="title-confirm-h">${title}</h2><p class="panel-sub">${text}</p><div class="confirm-buttons" id="title-confirm"></div></div>`, 'panel-confirm');
    this.list(document.getElementById('title-confirm'), buttons, buttons.length - 1);
  }

  showOptions(focus = 0) {
    this.state = 'options';
    this.el.root.dataset.view = 'options';
    this.backTo = () => this.showMain('options');
    this.el.menu.hidden = true;
    const S = this.settings;
    const bar = (v) => `<span class="bar" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span><span class="val">${v}</span>`;
    this.setPanel(`<h2 class="panel-title">Options</h2><div class="options" id="title-options"></div><p class="panel-keys"><kbd>←</kbd><kbd>→</kbd> change · <kbd>Esc</kbd> back</p>`, 'panel-options');
    const apply = (k, v, f) => {
      S[k] = v;
      storeSettings(S);
      this.o.onSettings?.(S);
      this.showOptions(f);
    };
    const level = (k, label, f) => ({
      label: `${label}${bar(S[k])}`, cls: 'opt',
      adjust: (d) => { const v = Math.max(0, Math.min(10, S[k] + d)); if (v === S[k]) { this.sfx.play('menuDeny'); return; } apply(k, v, f); this.sfx.play('menuMove'); },
      run: () => { apply(k, S[k] >= 10 ? 0 : S[k] + 1, f); this.sfx.play('menuMove'); },
    });
    this.list(document.getElementById('title-options'), [
      level('music', 'Music', 0),
      level('sound', 'Sound', 1),
      { label: `Retro mode<span class="val toggle">${S.pixel ? 'On' : 'Off'}</span>`, cls: 'opt', sub: 'Low resolution and big, chunky pixels',
        adjust: () => { apply('pixel', !S.pixel, 2); this.sfx.play('menuMove'); }, run: () => { apply('pixel', !S.pixel, 2); this.sfx.play('menuSelect'); } },
      { label: 'Back', cls: 'back-btn', run: () => this.back() },
    ], focus);
  }

  showHowTo() {
    this.state = 'howto';
    this.el.root.dataset.view = 'howto';
    this.backTo = () => this.showMain('howto');
    this.el.menu.hidden = true;
    const touch = this.o.input?.isTouch;
    this.setPanel(`<h2 class="panel-title">How to Play</h2>
      <p class="panel-lede">Cello lives at the edge of the forest, south of the village of Hollowbrook. This morning, smoke is rising over the village. What he chooses tonight, the people of Aetheria will remember, and far beyond the Stormvale a piece of Thor's hammer is waiting.</p>
      ${touch ? '<p class="panel-sub">The left side of the screen moves Cello, the right side moves the camera. The buttons in the lower right are sword, jump, roll, lock on, shield, items and map.</p>' : ''}
      <dl class="controls">
        <div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Run</dd></div>
        <div><dt><kbd>Mouse</kbd></dt><dd>Camera</dd></div>
        <div><dt><kbd>Space</kbd></dt><dd>Jump</dd></div>
        <div><dt><kbd>Shift</kbd></dt><dd>Roll (in water: dive)</dd></div>
        <div><dt><kbd>Click</kbd></dt><dd>Sword</dd></div>
        <div><dt><kbd>Right-click</kbd></dt><dd>Shield</dd></div>
        <div><dt><kbd>Q</kbd></dt><dd>Lock on</dd></div>
        <div><dt><kbd>E</kbd></dt><dd>Talk, open</dd></div>
        <div><dt><kbd>F</kbd> <kbd>G</kbd> <kbd>V</kbd></dt><dd>Items</dd></div>
        <div><dt><kbd>Tab</kbd></dt><dd>Item menu</dd></div>
        <div><dt><kbd>K</kbd></dt><dd>Map</dd></div>
        <div><dt><kbd>C</kbd></dt><dd>Walk</dd></div>
      </dl>
      <p class="panel-sub">Swimming: hold <kbd>Space</kbd> to swim up and <kbd>Shift</kbd> to swim down. Swim into a ledge to climb out.</p>
      <p class="panel-sub">The first click captures the mouse, <kbd>Esc</kbd> releases it. <kbd>M</kbd> sound, <kbd>N</kbd> music, <kbd>P</kbd> Retro mode. Gamepad: A jump, X sword, B roll, RT shield, LT lock on, Y talk, RB, LB and D-pad right items, Start item menu, Back map.</p>
      <div class="panel-back" id="title-howto"></div>`, 'panel-howto');
    this.list(document.getElementById('title-howto'), [{ label: 'Back', cls: 'back-btn', run: () => this.back() }]);
  }

  showCredits() {
    this.state = 'credits';
    this.el.root.dataset.view = 'credits';
    this.backTo = () => this.showMain('credits');
    this.el.menu.hidden = true;
    this.setPanel(`<h2 class="panel-title">Credits</h2>
      <dl class="credits-list">
        <div><dt>Created by</dt><dd>Elias</dd></div>
        <div><dt>Music</dt><dd><em>Hearth of the Hollow</em> by Treblo</dd></div>
        <div><dt>Built with</dt><dd>three.js and Claude</dd></div>
        <div><dt>Inspired by</dt><dd>The quiet heroes of old adventures</dd></div>
      </dl>
      <p class="panel-sub">Thank you for playing this early version of the realm.</p>
      <div class="panel-back" id="title-credits"></div>`, 'panel-credits');
    this.list(document.getElementById('title-credits'), [{ label: 'Back', cls: 'back-btn', run: () => this.back() }]);
  }

  // ---------------------------------------------------------------------
  // Resan börjar
  // ---------------------------------------------------------------------
  start(mode, slot) {
    if (this.leaving) return;
    this.leaving = 0.001;
    this.state = 'leaving';
    this.items = [];
    this.o.input?.requestLock?.();
    this.sfx.play('menuStart');
    this.strike(true);
    this.el.root.classList.add('leaving');
    this.veil.classList.add('on');
    const t0 = performance.now();
    const tick = () => {
      this.leaving = Math.min(1, (performance.now() - t0) / 1300);
      if (this.leaving < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      this.close();
      this.o.onStart(mode, slot);
      setTimeout(() => this.veil.classList.remove('on'), 120);
    }, 1350);
  }

  // Stänger menyn (även när ett test eller en omladdning hoppar förbi den)
  close() {
    if (!this.active) return;
    this.active = false;
    this.state = 'closed';
    this.el.root.hidden = true;
    removeEventListener('keydown', this.onKey);
    removeEventListener('pointermove', this.onMove);
  }
}

// Små saker i luften (0.17): runt kameran svävar några hundra prickar som ger luften liv.
//   · dag ute: pollen och frön som glittrar i solen
//   · natt ute: eldflugor som tänds och släcks
//   · öknen och den brinnande byn: glöd som stiger
//   · inomhus: damm som sakta faller i ljuset
// (Snö och regn sköts av vädret.)
import * as THREE from 'three';

const N = 220, BOX = 22;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const KINDS = {
  pollen: { color: 0xfff0c0, size: 0.09, rise: 0.05, drift: 0.35, blink: 0, opacity: 0.55, count: 1 },
  fireflies: { color: 0xd8ff6a, size: 0.16, rise: 0.02, drift: 0.5, blink: 1, opacity: 0.95, count: 0.45 },
  embers: { color: 0xff8a3a, size: 0.11, rise: 0.7, drift: 0.4, blink: 0.5, opacity: 0.85, count: 0.8 },
  dust: { color: 0xe8dcc0, size: 0.07, rise: -0.04, drift: 0.12, blink: 0, opacity: 0.4, count: 0.7 },
  none: { count: 0 },
};

export class Motes {
  constructor(scene) {
    const pos = new Float32Array(N * 3);
    this.seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX * 2;
      pos[i * 3 + 1] = Math.random() * 9 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2;
      this.seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = new Float32Array(N * 3).fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.PointsMaterial({ size: 0.1, map: dotTexture(), transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, opacity: 0.6, fog: true });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.userData.noShadow = true;
    scene.add(this.points);
    this.kind = 'none';
    this.k = KINDS.none;
    this.center = new THREE.Vector3();
    this.t = 0;
    this.level = 0;
  }

  setKind(kind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.k = KINDS[kind] ?? KINDS.none;
    if (this.k.color) {
      this.mat.size = this.k.size;
      this.base = new THREE.Color(this.k.color);
    }
  }

  update(dt, camPos, enabled = true) {
    this.t += dt;
    const k = this.k;
    const want = enabled && k.count ? 1 : 0;
    this.level += (want - this.level) * Math.min(1, dt * 1.5);
    this.points.visible = this.level > 0.02;
    if (!this.points.visible) return;
    this.mat.opacity = (k.opacity ?? 0.6) * this.level;
    const P = this.points.geometry.attributes.position, C = this.points.geometry.attributes.color, a = P.array, c = C.array;
    const show = Math.floor(N * (k.count ?? 1));
    for (let i = 0; i < N; i++) {
      const s = this.seed[i];
      let x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
      x += Math.sin(this.t * 0.4 + s) * (k.drift ?? 0.2) * dt;
      z += Math.cos(this.t * 0.33 + s * 1.7) * (k.drift ?? 0.2) * dt;
      y += ((k.rise ?? 0) + Math.sin(this.t * 0.7 + s * 3) * 0.05) * dt;
      // Håll dem i en låda runt kameran (de som hamnar utanför dyker upp på andra sidan)
      let rx = x - camPos.x, rz = z - camPos.z, ry = y - camPos.y;
      if (Math.abs(rx) > BOX * 3 || Math.abs(rz) > BOX * 3 || Math.abs(ry) > 30) {
        x = camPos.x + (Math.random() - 0.5) * BOX * 2; z = camPos.z + (Math.random() - 0.5) * BOX * 2; y = camPos.y + Math.random() * 9 - 4;
        rx = x - camPos.x; rz = z - camPos.z; ry = y - camPos.y;
      }
      if (rx > BOX) x -= BOX * 2; else if (rx < -BOX) x += BOX * 2;
      if (rz > BOX) z -= BOX * 2; else if (rz < -BOX) z += BOX * 2;
      if (ry > 7) y -= 11; else if (ry < -4) y += 11;
      a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      let b = i < show ? 1 : 0;
      if (k.blink && b) b *= Math.max(0, Math.sin(this.t * (1.2 + (s % 1)) + s) * 1.4 - 0.4 * k.blink);
      const col = this.base;
      c[i * 3] = col.r * b; c[i * 3 + 1] = col.g * b; c[i * 3 + 2] = col.b * b;
    }
    P.needsUpdate = true;
    C.needsUpdate = true;
  }
}

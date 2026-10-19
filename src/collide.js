// Kollisioner mot världen: det statiska Octree-trädet plus rörliga lådor
// (dörrar, galler, stenar som reser sig, golv som rasar). Har samma gränssnitt
// som Octree (capsuleIntersect och rayIntersect), så resten av koden märker ingen skillnad.
import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

const _cap = new Capsule(), _c0 = new THREE.Vector3(), _c1 = new THREE.Vector3(), _n = new THREE.Vector3();
const _seg = new Capsule(), _tri = [], _hit = new THREE.Vector3(), _end = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Kapseln är alltid lodrät (Cello och fienderna lutar aldrig).
function capsuleBox(cap, b) {
  const r = cap.radius, x = cap.start.x, z = cap.start.z;
  const y0 = Math.min(cap.start.y, cap.end.y), y1 = Math.max(cap.start.y, cap.end.y);
  const { min, max } = b;
  if (x + r < min.x || x - r > max.x || z + r < min.z || z - r > max.z || y1 + r < min.y || y0 - r > max.y) return null;
  const cx = clamp(x, min.x, max.x), cz = clamp(z, min.z, max.z);
  if (y1 >= min.y && y0 <= max.y) {
    // Kapselns mittlinje ligger i lådans höjd: knuffa ut i sidled
    const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      if (d >= r) return null;
      return { nx: dx / d, ny: 0, nz: dz / d, depth: r - d };
    }
    // Mitten är inne i lådan: ta närmaste väg ut (uppåt räknas också)
    const opts = [
      [1, 0, 0, max.x - x + r], [-1, 0, 0, x - min.x + r],
      [0, 0, 1, max.z - z + r], [0, 0, -1, z - min.z + r],
      [0, 1, 0, max.y - y0 + r], [0, -1, 0, y1 + r - min.y],
    ];
    let best = opts[0];
    for (const o of opts) if (o[3] < best[3]) best = o;
    return { nx: best[0], ny: best[1], nz: best[2], depth: best[3] };
  }
  const sy = y1 < min.y ? y1 : y0, by = y1 < min.y ? min.y : max.y;
  const vx = x - cx, vy = sy - by, vz = z - cz, d = Math.hypot(vx, vy, vz);
  if (d >= r) return null;
  if (d < 1e-6) return { nx: 0, ny: sy >= by ? 1 : -1, nz: 0, depth: r };
  return { nx: vx / d, ny: vy / d, nz: vz / d, depth: r - d };
}

function rayBox(ray, b, far) {
  const o = ray.origin, d = ray.direction;
  let tmin = -Infinity, tmax = Infinity, axis = -1, sign = 0;
  for (let k = 0; k < 3; k++) {
    const ok = k === 0 ? o.x : k === 1 ? o.y : o.z, dk = k === 0 ? d.x : k === 1 ? d.y : d.z;
    const lo = k === 0 ? b.min.x : k === 1 ? b.min.y : b.min.z, hi = k === 0 ? b.max.x : k === 1 ? b.max.y : b.max.z;
    if (Math.abs(dk) < 1e-9) {
      if (ok < lo || ok > hi) return null;
      continue;
    }
    let t1 = (lo - ok) / dk, t2 = (hi - ok) / dk, s = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = k; sign = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || tmin > far || axis < 0) return null; // börjar inuti lådan eller för långt bort
  const nx = axis === 0 ? sign : 0, ny = axis === 1 ? sign : 0, nz = axis === 2 ? sign : 0;
  return { t: tmin, nx, ny, nz };
}

export class WorldCollider {
  constructor(octree) {
    this.octree = octree;
    this.boxes = [];
    this.area = null; // aktivt område: lådor i andra områden räknas inte
    this.building = null; // området som lådor läggs till i just nu
  }

  addBox(x0, y0, z0, x1, y1, z1, tag = '') {
    const b = {
      min: new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)),
      max: new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)),
      enabled: true,
      tag,
      area: this.building,
    };
    this.boxes.push(b);
    return b;
  }

  // Flytta en låda (t.ex. en dörr som glider upp) utan att skapa en ny
  moveBox(b, dy) {
    b.min.y += dy;
    b.max.y += dy;
  }

  capsuleIntersect(capsule) {
    _cap.copy(capsule);
    let hit = false;
    const r = this.octree.capsuleIntersect(_cap);
    if (r) {
      _cap.translate(_n.copy(r.normal).multiplyScalar(r.depth));
      hit = true;
    }
    for (const b of this.boxes) {
      if (!b.enabled || (b.area && b.area !== this.area)) continue;
      const h = capsuleBox(_cap, b);
      if (h && h.depth > 1e-7) {
        _cap.translate(_n.set(h.nx * h.depth, h.ny * h.depth, h.nz * h.depth));
        hit = true;
      }
    }
    if (!hit) return false;
    _cap.getCenter(_c0);
    capsule.getCenter(_c1);
    const v = _c0.sub(_c1);
    const depth = v.length();
    if (depth < 1e-9) return { normal: new THREE.Vector3(0, 1, 0), depth: 0 };
    return { normal: v.normalize().clone(), depth };
  }

  // Som Octree.rayIntersect, men bara inom ett visst avstånd (mycket snabbare i en stor värld).
  rayIntersect(ray, far = 60) {
    let best = null, bestT = far;
    _end.copy(ray.origin).addScaledVector(ray.direction, far);
    _seg.start.copy(ray.origin);
    _seg.end.copy(_end);
    _seg.radius = 0.01;
    _tri.length = 0;
    this.octree.getCapsuleTriangles(_seg, _tri);
    for (const tri of _tri) {
      const p = ray.intersectTriangle(tri.a, tri.b, tri.c, true, _hit);
      if (!p) continue;
      const t = _hit.distanceTo(ray.origin);
      if (t < bestT) { bestT = t; best = { distance: t, position: _hit.clone(), triangle: tri }; }
    }
    for (const b of this.boxes) {
      if (!b.enabled || (b.area && b.area !== this.area)) continue;
      const h = rayBox(ray, b, bestT);
      if (h && h.t < bestT) {
        bestT = h.t;
        const nrm = new THREE.Vector3(h.nx, h.ny, h.nz);
        best = {
          distance: h.t,
          position: ray.origin.clone().addScaledVector(ray.direction, h.t),
          triangle: { getNormal: (target) => target.copy(nrm) },
        };
      }
    }
    return best || false;
  }
}

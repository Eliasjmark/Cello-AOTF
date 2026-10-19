// Gnistor, aska, svärdsspår, chockvågor, blixtar, hjärtan att plocka upp och "hitstop" (kort frysning vid träff).
import * as THREE from 'three';

const MAX = 260;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();

class Pool {
  constructor(scene, size, material) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), material, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, _c.set(1, 1, 1));
    scene.add(this.mesh);
    this.items = [];
  }

  add(p) {
    if (this.items.length >= MAX) this.items.shift();
    this.items.push(p);
  }

  update(dt) {
    const keep = [];
    for (const p of this.items) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.v.y += p.g * dt;
      p.v.multiplyScalar(Math.exp(-p.drag * dt));
      p.p.addScaledVector(p.v, dt);
      keep.push(p);
    }
    this.items = keep;
    keep.forEach((p, i) => {
      const k = p.life / p.max;
      _s.setScalar(p.size * (p.shrink ? k : 1));
      _q.setFromEuler(new THREE.Euler(p.r, p.r * 1.3, 0));
      _m.compose(p.p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.copy(p.color).multiplyScalar(p.fade ? k : 1));
    });
    this.mesh.count = keep.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

class SwordTrail {
  constructor(scene) {
    this.n = 14;
    this.samples = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 2 * 3);
    this.col = new Float32Array(this.n * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < this.n - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.life = 0.13;
  }

  push(base, tip, strong) {
    this.samples.unshift({ base: base.clone(), tip: tip.clone(), age: 0, strong });
    if (this.samples.length > this.n) this.samples.pop();
  }

  update(dt) {
    for (const s of this.samples) s.age += dt;
    this.samples = this.samples.filter((s) => s.age < this.life);
    const count = this.samples.length;
    this.samples.forEach((s, i) => {
      const k = 1 - s.age / this.life;
      const b = s.strong ? 1 : 0.75;
      this.pos.set([s.base.x, s.base.y, s.base.z, s.tip.x, s.tip.y, s.tip.z], i * 6);
      this.col.set([0.25 * k * b, 0.3 * k * b, 0.4 * k * b, 0.85 * k * b, 0.92 * k * b, 1.0 * k * b], i * 6);
    });
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, count - 1) * 6);
    this.mesh.visible = count > 1;
  }
}

function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.62, -0.05, -0.55, 0.22);
  s.bezierCurveTo(-0.5, 0.48, -0.15, 0.55, 0, 0.3);
  s.bezierCurveTo(0.15, 0.55, 0.5, 0.48, 0.55, 0.22);
  s.bezierCurveTo(0.62, -0.05, 0.15, -0.3, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false, curveSegments: 6 });
  g.center();
  g.scale(0.55, 0.55, 0.55);
  return g;
}

// Aska som virvlar runt Cello hela tiden, med en och annan glöd
class AmbientAsh {
  constructor(scene, n = 520) {
    this.n = n;
    this.size = new THREE.Vector3(46, 22, 46);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    this.seed = [];
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * this.size.x, (Math.random() - 0.5) * this.size.y, (Math.random() - 0.5) * this.size.z], i * 3);
      const ember = Math.random() < 0.08;
      const g = 0.32 + Math.random() * 0.25;
      col.set(ember ? [1, 0.45, 0.15] : [g, g * 0.97, g * 0.95], i * 3);
      this.seed.push(Math.random() * 10);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.t = 0;
  }

  update(dt, center) {
    this.t += dt;
    const p = this.points.geometry.attributes.position, a = p.array, S = this.size;
    const wx = 1.4 + Math.sin(this.t * 0.2) * 0.8, wz = 0.5;
    for (let i = 0; i < this.n; i++) {
      const s = this.seed[i];
      a[i * 3] += (wx + Math.sin(this.t * 0.9 + s) * 0.3) * dt;
      a[i * 3 + 1] += (-0.35 + Math.sin(this.t * 1.3 + s * 2) * 0.25) * dt;
      a[i * 3 + 2] += (wz + Math.cos(this.t * 0.7 + s) * 0.3) * dt;
      for (let k = 0; k < 3; k++) {
        const c = center.getComponent(k), half = S.getComponent(k) / 2;
        const v = a[i * 3 + k] - c;
        if (v > half) a[i * 3 + k] -= S.getComponent(k);
        else if (v < -half) a[i * 3 + k] += S.getComponent(k);
      }
    }
    p.needsUpdate = true;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.airAsh = new AmbientAsh(scene);
    this.hitstop = 0;
    this.sparks = new Pool(scene, 0.07, new THREE.MeshBasicMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.ash = new Pool(scene, 0.15, new THREE.MeshLambertMaterial());
    this.trail = new SwordTrail(scene);
    this.heartGeo = heartGeometry();
    this.heartMat = new THREE.MeshLambertMaterial({ color: 0xd8352f, emissive: 0x6a0d0b });
    // Skärvor (pengarna): gröna är värda 1, blå 5 och röda 20, som rupier
    this.shardGeo = new THREE.OctahedronGeometry(0.2, 0).scale(0.75, 1.5, 0.45);
    this.shardMats = {
      1: new THREE.MeshLambertMaterial({ color: 0x4ad06a, emissive: 0x0e4a1a, flatShading: true }),
      5: new THREE.MeshLambertMaterial({ color: 0x4a8ae0, emissive: 0x0e2a5a, flatShading: true }),
      20: new THREE.MeshLambertMaterial({ color: 0xe04a4a, emissive: 0x5a0e0e, flatShading: true }),
    };
    this.hearts = [];
    this.onPickup = null;
    this.rings = [];
    this.bolts = [];
  }

  // En platt ring som växer ut längs marken (hammarslaget)
  shockwave(pos, color = 0x9fdcff, radius = 3.2, dur = 0.42) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    m.position.copy(pos).y += 0.08;
    m.renderOrder = 4;
    this.scene.add(m);
    this.rings.push({ m, t: 0, dur, radius });
  }

  // En sicksackande blixt mellan två punkter
  bolt(from, to, life = 0.35, color = 0xe8f2ff) {
    const pts = [];
    const n = Math.max(6, Math.round(from.distanceTo(to) / 3));
    let prev = from.clone();
    const jit = Math.min(2.4, from.distanceTo(to) * 0.05 + 0.4);
    for (let k = 1; k <= n; k++) {
      const p = from.clone().lerp(to, k / n);
      if (k < n) p.add(new THREE.Vector3((Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit));
      pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, fog: false }));
    line.frustumCulled = false;
    this.scene.add(line);
    this.bolts.push({ line, t: 0, life });
  }

  hitStop(s) {
    this.hitstop = Math.max(this.hitstop, s);
  }

  burst(kind, pos, n, color = 0xffe2a0) {
    for (let i = 0; i < n; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5).normalize();
      if (kind === 'spark') {
        const life = 0.18 + Math.random() * 0.22;
        this.sparks.add({
          p: pos.clone(), v: dir.multiplyScalar(3 + Math.random() * 5), g: -14, drag: 2,
          life, max: life, size: 0.6 + Math.random() * 0.8, color: new THREE.Color(color), shrink: true, fade: true, r: Math.random() * 3,
        });
      } else if (kind === 'debris') {
        // Lerskärvor som flyger iväg och faller
        const life = 0.6 + Math.random() * 0.5;
        this.ash.add({
          p: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.4)),
          v: dir.multiplyScalar(2.5 + Math.random() * 3), g: -16, drag: 0.6,
          life, max: life, size: 0.5 + Math.random() * 0.7, color: new THREE.Color(color).multiplyScalar(0.7 + Math.random() * 0.4),
          shrink: true, fade: false, r: Math.random() * 3,
        });
      } else {
        const life = 0.8 + Math.random() * 0.9;
        const ember = Math.random() < 0.18;
        this.ash.add({
          p: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.8)),
          v: dir.multiplyScalar(0.6 + Math.random() * 1.8), g: 0.8, drag: 1.4,
          life, max: life, size: 0.5 + Math.random() * 0.9,
          color: new THREE.Color(ember ? 0xff7a2a : 0x2a2624 + Math.floor(Math.random() * 3) * 0x080808),
          shrink: true, fade: false, r: Math.random() * 3,
        });
      }
    }
  }

  spawnHeart(pos) {
    const m = new THREE.Mesh(this.heartGeo, this.heartMat);
    m.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(m);
    this.hearts.push({ m, ground: pos.y + 0.5, t: 0, life: 14, vy: 3, kind: 'heart', value: 2 });
  }

  // En skärva som studsar ut åt sidan (value 1, 5 eller 20)
  spawnShard(pos, value = 1, spread = 0.6) {
    const v = value >= 20 ? 20 : value >= 5 ? 5 : 1;
    const m = new THREE.Mesh(this.shardGeo, this.shardMats[v]);
    const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
    m.position.copy(pos).add(new THREE.Vector3(Math.cos(a) * r, 1.0, Math.sin(a) * r));
    this.scene.add(m);
    this.hearts.push({ m, ground: pos.y + 0.35, t: Math.random(), life: 16, vy: 3.4, kind: 'shard', value: v });
  }

  // Delar upp ett belopp i så få skärvor som möjligt
  spawnShards(pos, amount) {
    let left = amount;
    for (const v of [20, 5, 1]) {
      while (left >= v) { this.spawnShard(pos, v, 0.9); left -= v; }
    }
  }

  clearHearts() {
    for (const h of this.hearts) this.scene.remove(h.m);
    this.hearts = [];
  }

  update(dt, player) {
    this.sparks.update(dt);
    this.ash.update(dt);
    this.trail.update(dt);
    for (const r of this.rings) {
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      r.m.scale.setScalar(0.3 + r.radius * (1 - (1 - k) * (1 - k)));
      r.m.material.opacity = 0.9 * (1 - k);
      if (k >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }
    }
    this.rings = this.rings.filter((r) => r.t < r.dur);
    for (const b of this.bolts) {
      b.t += dt;
      b.line.material.opacity = Math.max(0, 1 - b.t / b.life) * (Math.random() < 0.2 ? 0.4 : 1);
      if (b.t >= b.life) { this.scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); }
    }
    this.bolts = this.bolts.filter((b) => b.t < b.life);
    const keep = [];
    for (const h of this.hearts) {
      h.t += dt;
      h.life -= dt;
      if (h.m.position.y > h.ground || h.vy > 0) {
        h.vy -= 12 * dt;
        h.m.position.y = Math.max(h.ground, h.m.position.y + h.vy * dt);
        if (h.m.position.y === h.ground) h.vy = 0;
      } else {
        h.m.position.y = h.ground + Math.sin(h.t * 3) * 0.08;
      }
      h.m.rotation.y = h.t * 2.2;
      h.m.visible = h.life > 3 || Math.sin(h.t * 22) > 0;
      const dx = player.feet.x - h.m.position.x, dz = player.feet.z - h.m.position.z;
      const dy = player.feet.y + 0.8 - h.m.position.y;
      if (h.life <= 0) { this.scene.remove(h.m); continue; }
      if (Math.hypot(dx, dz) < 1.1 && Math.abs(dy) < 1.4 && h.t > 0.25 && this.onPickup?.(h.kind, h.value)) {
        this.scene.remove(h.m);
        continue;
      }
      keep.push(h);
    }
    this.hearts = keep;
  }
}

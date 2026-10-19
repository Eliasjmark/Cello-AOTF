// Krukor att slå sönder: svärdet eller hammaren krossar dem, och ibland
// ligger det ett hjärta i. De står i fästningen och i byn och kommer tillbaka efter en stund.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const RESPAWN = 75; // sekunder innan en krossad kruka står där igen (om Cello är långt borta)

function potGeometry() {
  // En bukig lerkruka med hals och kant, svarvad (lathe) med få sidor
  const pts = [[0, 0], [0.2, 0.0], [0.3, 0.12], [0.34, 0.3], [0.3, 0.5], [0.18, 0.62], [0.16, 0.7], [0.21, 0.74], [0.19, 0.78], [0.12, 0.76]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(pts, 8);
  body.computeVertexNormals();
  return body;
}

export class Pots {
  constructor(scene) {
    this.list = [];
    this.scene = scene;
    this.geo = potGeometry();
    this.bandGeo = new THREE.CylinderGeometry(0.335, 0.335, 0.06, 8, 1, true);
    this.mat = new THREE.MeshLambertMaterial({ color: 0x8a5a3c, flatShading: true });
    this.bandMat = new THREE.MeshLambertMaterial({ color: 0x4a2e22, flatShading: true, side: THREE.DoubleSide });
    this.mesh = null;
    this.collider = null;
    this.onBreak = null; // (kruka) – ljud och effekter kopplas i main.js
  }

  add(x, y, z, s = 1) {
    this.list.push({ pos: new THREE.Vector3(x, y, z), s, broken: false, t: 0, box: null, rot: Math.random() * Math.PI });
  }

  // Alla krukor ritas i en enda instansierad mesh
  build(collider) {
    this.collider = collider;
    const merged = mergeGeometries([this.geo.clone().toNonIndexed(), this.bandGeo.clone().translate(0, 0.3, 0).toNonIndexed()].map((g) => {
      g.deleteAttribute('uv');
      return g;
    }), true);
    this.mesh = new THREE.InstancedMesh(merged, [this.mat, this.bandMat], this.list.length);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    for (const p of this.list) {
      const r = 0.32 * p.s;
      p.box = collider.addBox(p.pos.x - r, p.pos.y, p.pos.z - r, p.pos.x + r, p.pos.y + 0.75 * p.s, p.pos.z + r, 'pot');
    }
    this.sync();
  }

  sync() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    this.list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot);
      m4.compose(p.pos, q, sc.setScalar(p.broken ? 0.0001 : p.s));
      this.mesh.setMatrixAt(i, m4);
      p.box.enabled = !p.broken;
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  smash(p) {
    if (p.broken) return;
    p.broken = true;
    p.t = 0;
    this.onBreak?.(p);
    this.sync();
  }

  restoreAll() {
    for (const p of this.list) p.broken = false;
    if (this.mesh) this.sync();
  }

  // Svärdshugg och hammarslag
  update(dt, player) {
    let changed = false;
    const sw = player.swing;
    for (const p of this.list) {
      if (p.broken) {
        p.t += dt;
        if (p.t > RESPAWN && p.pos.distanceTo(player.feet) > 25) { p.broken = false; changed = true; }
        continue;
      }
      if (!sw || !sw.active || sw.hit.has(p)) continue;
      const dx = p.pos.x - player.feet.x, dz = p.pos.z - player.feet.z;
      const d = Math.hypot(dx, dz) - 0.3 * p.s;
      if (d > sw.reach || Math.abs(p.pos.y - player.feet.y) > 1.2) continue;
      if (Math.abs(wrap(Math.atan2(dx, dz) - player.facing)) > sw.arc && d > 0.4) continue;
      sw.hit.add(p);
      this.smash(p);
    }
    if (changed) this.sync();
  }

  slam(point) {
    for (const p of this.list) {
      if (!p.broken && Math.hypot(p.pos.x - point.x, p.pos.z - point.z) < 2.6 && Math.abs(p.pos.y - point.y) < 1.2) this.smash(p);
    }
  }
}

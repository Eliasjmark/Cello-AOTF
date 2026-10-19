// Gemensamma hjälpfunktioner för geometri: lådor och cylindrar med jämn textur,
// avbrutna pelare, stenar och sammanslagning av statiska föremål.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const hash2 = (x, z) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// Skalar om en lådas UV så att texturen får samma storlek på alla sidor.
export function boxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
    }
  }
  uv.needsUpdate = true;
  return geo;
}
export const box = (w, h, d, tile = 2) => boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, tile);

export function cylUV(geo, r, h, tile) {
  const uv = geo.attributes.uv, n = geo.attributes.normal, p = geo.attributes.position;
  const circ = 2 * Math.PI * r;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.9) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    else uv.setXY(i, uv.getX(i) * circ / tile, uv.getY(i) * h / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
export const cyl = (rt, rb, h, seg, tile = 2, open = false) =>
  cylUV(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), Math.max(rt, rb), h, tile);

// Gör toppen av en cylinder ojämn, som en avbruten pelare.
export function breakTop(geo, h, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > h / 2 - 1e-3) {
      p.setY(i, p.getY(i) - hash2(p.getX(i) * 3.1, p.getZ(i) * 3.1) * amount);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function rockGeo(r, seed, squash = 0.75) {
  const g = new THREE.DodecahedronGeometry(r, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (hash2(x * 7.1 + seed, y * 3.7 + z * 5.3) - 0.5) * 0.45;
    p.setXYZ(i, x * k, y * k * squash, z * k);
    uv.setXY(i, x / 1.5, (y + z) / 1.5);
  }
  g.computeVertexNormals();
  return g;
}

export const place = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

// Slår ihop alla statiska föremål i en grupp till en mesh per material, så att
// grafikkortet får färre saker att rita. Gruppen måste ligga i origo utan rotation.
export function bake(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep || !o.visible) return;
    const g0 = o.geometry;
    if (!g0.attributes.position || !g0.attributes.normal || !g0.attributes.uv) return;
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    victims.push(o);
  });
  for (const o of victims) o.parent.remove(o);
  let meshes = 0;
  for (const [mat, list] of buckets) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    group.add(new THREE.Mesh(merged, mat));
    meshes++;
  }
  return { before: victims.length, after: meshes };
}

// Slår ihop delar av en figur som sitter fast på samma led (samma föräldergrupp och samma material)
// till en mesh. Figuren kan fortfarande röra sig led för led, men ritas med färre anrop.
// Meshar som ska kunna ändras var för sig markeras med userData.solo (eller skickas i `keep`).
export function mergeRigid(root, keep = []) {
  const solo = new Set(keep);
  let before = 0, after = 0;
  const visit = (node) => {
    const buckets = new Map();
    for (const c of node.children) {
      if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || c.children.length || solo.has(c) || c.userData.solo || !c.visible) continue;
      const m = c.material;
      if (Array.isArray(m) || m.map) continue;
      if (!buckets.has(m)) buckets.set(m, []);
      buckets.get(m).push(c);
    }
    for (const [mat, list] of buckets) {
      if (list.length < 2) continue;
      const geos = list.map((c) => {
        c.updateMatrix();
        const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        g.clearGroups();
        g.applyMatrix4(c.matrix);
        return g;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      before += list.length;
      after++;
      for (const c of list) node.remove(c);
      const mesh = new THREE.Mesh(merged, mat);
      node.add(mesh);
    }
    for (const c of node.children) if (!c.isMesh) visit(c);
  };
  visit(root);
  return { before, after };
}

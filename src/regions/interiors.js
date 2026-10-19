// Interiörer (tillfällig version)
import * as THREE from 'three';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function buildInteriors(B, areas) {
  const s = areas.create({ id: 'shop', name: "Pell's Provisions", indoor: true, card: false, safe: true, fog: { color: 0x120e0a, near: 10, far: 40 } });
  B.begin(s);
  B.bounds(6990, 7010, -8, 8);
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 10), B.M.floor);
  f1.position.set(7000, -0.1, 0);
  B.solid(f1);
  s.entries = { door: { pos: V3(7000, 0, 3.2), facing: Math.PI } };
  s.exits = [{ x0: 6998, x1: 7002, z0: 4.6, z1: 8, to: 'willowmere', entry: 'shop' }];
  B.end();
  const h = areas.create({ id: 'house', name: "Cello's House", indoor: true, card: false, safe: true, fog: { color: 0x120e0a, near: 10, far: 40 } });
  B.begin(h);
  B.bounds(7090, 7110, -8, 8);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 8), B.M.floor);
  f2.position.set(7100, -0.1, 0);
  B.solid(f2);
  h.entries = { door: { pos: V3(7100, 0, 2.6), facing: Math.PI } };
  h.exits = [{ x0: 7098, x1: 7102, z0: 4, z1: 8, to: 'home', entry: 'door' }];
  B.end();
  return {};
}

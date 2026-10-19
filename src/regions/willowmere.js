// Willowmere (tillfällig version)
import * as THREE from 'three';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function buildWillowmere(B, areas) {
  const a = areas.create({ id: 'willowmere', name: 'Willowmere', sub: 'The village by the mere', safe: true });
  B.begin(a);
  B.bounds(3920, 4070, -70, 70);
  B.island({ cx: 4000, cz: 0, baseR: 60, seed: 401, grass: 200, label: 'Willowmere' });
  B.bridge('x', 3925, 3942, 0);
  const shop = B.house(4010, 0, -10, 0, { label: 'Shop' });
  a.entries = { west: { pos: V3(3933, 0.1, 0), facing: Math.PI / 2 }, shop: { pos: shop.door.clone(), facing: 0 } };
  a.exits = [{ x0: 3900, x1: 3927, z0: -3, z1: 3, to: 'field', entry: 'east' }];
  a.doors = [{ pos: shop.door, to: 'shop', entry: 'door', label: "Enter Pell's Provisions" }];
  B.end();
  return {};
}

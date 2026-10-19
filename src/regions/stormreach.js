// Stormreach och Hollow Cave (tillfällig version)
import * as THREE from 'three';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function buildStormreach(B, areas) {
  const a = areas.create({ id: 'stormreach', name: 'Stormreach', sub: 'Where the storm is born' });
  B.begin(a);
  B.bounds(4920, 5080, -100, 140);
  B.island({ cx: 5000, cz: 20, baseR: 100, seed: 501, grass: 100, label: 'Stormreach' });
  a.entries = { south: { pos: V3(5000, 0, 110), facing: Math.PI }, cave: { pos: V3(5000, 0, -68), facing: 0 } };
  a.exits = [
    { x0: 4990, x1: 5010, z0: 118, z1: 140, to: 'field', entry: 'north' },
    { x0: 4995, x1: 5005, z0: -90, z1: -75, to: 'cave', entry: 'south' },
  ];
  B.end();
  const c = areas.create({ id: 'cave', name: 'The Hollow Cave', sub: 'Darkness under the mountain', dark: true, indoor: true,
    fog: { color: 0x000000, near: 4, far: 40 }, light: { hemi: 0.18, moon: 0.05, flash: 0 } });
  B.begin(c);
  B.bounds(5960, 6040, -100, 70);
  B.island({ cx: 6000, cz: -20, baseR: 80, seed: 601, grass: 0, label: 'The Hollow Cave' });
  c.entries = { south: { pos: V3(6000, 0, 55), facing: Math.PI }, north: { pos: V3(6000, 0, -88), facing: 0 } };
  c.exits = [
    { x0: 5990, x1: 6010, z0: 60, z1: 80, to: 'stormreach', entry: 'cave' },
    { x0: 5990, x1: 6010, z0: -120, z1: -95, to: 'bastion', entry: 'south' },
  ];
  B.end();
  return {};
}

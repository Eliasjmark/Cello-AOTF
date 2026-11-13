// Skuggor (0.17): solen (eller månen) kastar riktiga skuggor. Skuggkameran följer Cello och täcker
// ungefär 70 × 70 meter runt honom; den flyttas i hela texel-steg så att skuggkanterna inte darrar.
// Inomhus (tempel, gravar) ligger skuggkameran strax ovanför Cello, så att taket inte skuggar hela rummet:
// bara väggar, pelare, kistor och figurer kastar skuggor där.
import * as THREE from 'three';

const EXT = 36, MAP = 2048;
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

// Vad ska kasta skugga? Allt fast och synligt, utom enorma ytor (marken, havet), glas, gräs och ljussken.
export function markShadows(root) {
  root.traverse((o) => {
    if (!o.isMesh || o.isSprite) return;
    if (o.userData.noShadow) { o.castShadow = o.receiveShadow = false; return; }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const basic = mats.every((m) => m?.isMeshBasicMaterial || m?.isShaderMaterial || m?.isPointsMaterial);
    const clear = mats.some((m) => m?.transparent && (m.opacity ?? 1) < 0.95 || m?.blending === THREE.AdditiveBlending || m?.depthWrite === false);
    o.receiveShadow = !basic;
    if (basic || clear) { o.castShadow = false; return; }
    const g = o.geometry;
    if (g && !g.boundingSphere) g.computeBoundingSphere?.();
    const big = (g?.boundingSphere?.radius ?? 0) * Math.max(o.scale.x, o.scale.y, o.scale.z) > 70;
    // Gräs och små tuvor i tusental: inga skuggor (för dyrt och för plottrigt)
    const grass = o.isInstancedMesh && o.count > 400;
    o.castShadow = !big && !grass;
  });
}

export class SunShadows {
  constructor(renderer, light, scene) {
    this.renderer = renderer;
    this.light = light;
    this.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.dir = light.position.clone().normalize();
    const s = light.shadow;
    s.mapSize.set(MAP, MAP);
    s.camera.left = -EXT; s.camera.right = EXT; s.camera.top = EXT; s.camera.bottom = -EXT;
    s.camera.near = 0.5; s.camera.far = 260;
    s.camera.updateProjectionMatrix();
    s.bias = -0.0006;
    s.normalBias = 0.05;
    s.radius = 1.5;
    scene.add(light.target);
    light.castShadow = true;
    this.texel = (2 * EXT) / MAP;
  }

  setEnabled(on) {
    if (on === this.enabled) return;
    this.enabled = on;
    this.renderer.shadowMap.enabled = on;
    this.light.castShadow = on;
  }

  // focus: Cellos fötter · indoor: kameran strax ovanför, så att taket inte kastar skugga
  update(focus, indoor = false, strength = 1) {
    if (!this.enabled) return;
    const L = this.light;
    L.castShadow = strength > 0.05;
    // Ljusets bas: d (från fokus mot ljuset), r och u på tvären
    _d.copy(this.dir);
    _r.crossVectors(_up, _d).normalize();
    _u.crossVectors(_d, _r).normalize();
    // Avrunda fokus till hela texlar i ljusets plan
    const a = Math.round(focus.dot(_r) / this.texel) * this.texel;
    const b = Math.round(focus.dot(_u) / this.texel) * this.texel;
    const c = focus.dot(_d);
    _f.copy(_r).multiplyScalar(a).addScaledVector(_u, b).addScaledVector(_d, c);
    const lift = indoor ? 5.2 : 130;
    L.position.copy(_f).addScaledVector(_d, lift);
    L.target.position.copy(_f);
    L.target.updateMatrixWorld();
    const s = L.shadow;
    const far = lift + (indoor ? 30 : 90);
    if (s.camera.far !== far || s.camera.near !== (indoor ? 0.05 : 0.5)) {
      s.camera.far = far;
      s.camera.near = indoor ? 0.05 : 0.5;
      s.camera.updateProjectionMatrix();
    }
    s.intensity = strength;
  }
}

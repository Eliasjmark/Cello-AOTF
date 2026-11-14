// Kistlocket (0.20): samma öppning för alla kistor i spelet.
// Förr vreds locket 1,9 radianer runt sin nedre bakkant, så att det for bakåt förbi lodrätt och genom väggen
// bakom kistan. Nu vrids det runt den ÖVRE bakkanten (gångjärnet) och stannar en bit före lodrätt, så att
// ingenting av locket någonsin hamnar bakom kistans rygg. Öppningen har också fått liv:
//   1. locket skallrar till och lyfts en aning (något trycker på inifrån)
//   2. det slår upp med en liten överstegring, studsar mot gångjärnet och lägger sig till rätta
//   3. ett gyllene sken väller upp ur kistan och tonar bort
import * as THREE from 'three';

const OPEN = 1.32; // radianer: drygt 75 grader, lite lutande bakåt men aldrig förbi lodrätt
const RATTLE = 0.2, SWING = 0.42;
let glowTex = null;

function gradient() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 64, 0, 0);
  grd.addColorStop(0, 'rgba(255,230,150,1)');
  grd.addColorStop(0.3, 'rgba(255,210,110,0.45)');
  grd.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

// Lockets tjocklek (gångjärnet sitter på lockets ovansida) mäts en gång från den första lådan i locket
function setup(c) {
  const L = c.lid;
  let top = 0.24, depth = 0.7, width = 1;
  const m = L.children.find((k) => k.isMesh && k.geometry);
  if (m) {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    top = bb.max.y * m.scale.y + m.position.y;
    depth = (bb.max.z - bb.min.z) * m.scale.z;
    width = (bb.max.x - bb.min.x) * m.scale.x;
  }
  c.hinge = { base: L.position.clone(), top, depth, width, glow: null, age: null };
}

// Ljuset ur kistan: en mjuk pelare (två korsade plan) och en platta i öppningen
function makeGlow(c) {
  const H = c.hinge, mat = new THREE.MeshBasicMaterial({ map: gradient(), color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const g = new THREE.Group();
  const w = H.width * 0.85, h = H.depth * 2.6;
  for (const ry of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(ry ? H.depth * 0.8 : w, h), mat);
    p.position.y = h / 2;
    p.rotation.y = ry;
    g.add(p);
  }
  const floorMat = mat.clone();
  floorMat.map = null;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, H.depth * 0.8), floorMat);
  f.rotation.x = -Math.PI / 2;
  f.position.y = -0.02;
  g.add(f);
  g.position.set(H.base.x, H.base.y, H.base.z + H.depth / 2);
  g.userData.noShadow = true;
  g.traverse((o) => { o.userData.noShadow = true; o.castShadow = false; o.receiveShadow = false; });
  c.lid.parent.add(g);
  H.glow = { g, mats: [mat, floorMat] };
}

const backOut = (t) => { const k = 1.9; return 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2; };

// Lockets vinkel efter hur länge kistan har varit öppen
function angleAt(age) {
  if (age < RATTLE) {
    const r = age / RATTLE;
    return 0.05 * r + Math.abs(Math.sin(age * 70)) * 0.07 * (1 - r * 0.5);
  }
  const t = (age - RATTLE) / SWING;
  if (t < 1) return 0.05 + (OPEN - 0.05) * backOut(t);
  // Studsen mot gångjärnet som dör ut
  const u = age - RATTLE - SWING;
  return OPEN - Math.sin(u * 16) * 0.08 * Math.exp(-u * 7);
}

// Varje bildruta: open är om kistan är öppnad. Sätter c.lidT (0 till 1) som förut.
export function animateLid(c, open, dt) {
  if (!c.lid) return;
  if (!c.hinge) setup(c);
  const H = c.hinge, L = c.lid;
  let a = 0;
  if (!open) {
    H.age = null;
    c.lidT = 0;
  } else {
    // Var kistan redan öppen när spelet laddades står locket bara öppet, utan sken
    if (H.age == null) H.age = c.lidT >= 1 ? 99 : 0;
    H.age += dt;
    c.lidT = Math.min(1, H.age / (RATTLE + SWING));
    a = angleAt(H.age);
  }
  // Vrid runt lockets övre bakkant: positionen flyttas så att den punkten står still
  const cs = Math.cos(a), sn = Math.sin(a);
  L.rotation.x = -a;
  L.position.set(H.base.x, H.base.y + H.top - H.top * cs, H.base.z + H.top * sn);
  // Skenet
  const age = H.age ?? 99;
  const glowOn = age > RATTLE * 0.6 && age < 3.2;
  if (glowOn && !H.glow) makeGlow(c);
  if (H.glow) {
    const k = glowOn ? Math.min(1, (age - RATTLE * 0.6) / 0.25) * Math.min(1, (3.2 - age) / 1.4) : 0;
    H.glow.g.visible = k > 0.01;
    H.glow.mats[0].opacity = 0.75 * k;
    H.glow.mats[1].opacity = 0.9 * k;
    H.glow.g.scale.y = 0.6 + 0.4 * Math.min(1, age / 0.6);
  }
}

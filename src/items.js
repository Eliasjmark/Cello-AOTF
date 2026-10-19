// Föremålens utseende: Mjölnirs skärva, nycklar, kartan, hjärtbehållaren och brevet.
import * as THREE from 'three';

const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
const B = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

export const ITEM_MATS = {
  iron: lam(0x5a5c66), dark: lam(0x2a2a30), leather: lam(0x5a3a24), glow: new THREE.MeshBasicMaterial({ color: 0x8fe4ff }),
  gold: lam(0xc9a24f, { emissive: 0x3a2808 }), brass: lam(0x9a7a3a), paper: lam(0xd8cfb4), red: lam(0xd8352f, { emissive: 0x6a0d0b }),
  ribbon: lam(0x8c2a27),
};

// Mjölnirs skärva: halva hammarhuvudet är avbrutet, sprickorna glöder av blixt.
// Skaftet pekar längs -y från handen, huvudet sitter i änden.
export function buildHammer() {
  const M = ITEM_MATS;
  const g = new THREE.Group();
  g.add(B(0.07, 0.62, 0.07, M.leather, 0, -0.28, 0));
  g.add(B(0.1, 0.08, 0.1, M.iron, 0, 0.02, 0));
  const head = new THREE.Group();
  head.position.y = -0.62;
  head.add(B(0.26, 0.24, 0.3, M.iron, 0, 0, 0.0));
  head.add(B(0.24, 0.22, 0.16, M.iron, 0, 0, 0.22));
  head.add(B(0.2, 0.14, 0.1, M.dark, 0.02, 0.04, -0.2));
  head.add(B(0.16, 0.08, 0.06, M.dark, -0.03, -0.06, -0.19));
  head.add(B(0.02, 0.2, 0.02, M.glow, 0.135, 0.0, 0.08));
  head.add(B(0.02, 0.02, 0.2, M.glow, 0.135, 0.06, 0.1));
  head.add(B(0.02, 0.14, 0.02, M.glow, -0.135, -0.02, 0.18));
  head.add(B(0.02, 0.02, 0.14, M.glow, 0.0, 0.125, 0.12));
  g.add(head);
  g.userData.head = head;
  return g;
}

export function buildItem(kind) {
  const M = ITEM_MATS;
  const g = new THREE.Group();
  if (kind === 'hammer') {
    const h = buildHammer();
    h.rotation.z = Math.PI;
    h.position.y = -0.3;
    g.add(h);
  } else if (kind === 'key') {
    g.add(B(0.06, 0.34, 0.03, M.brass, 0, 0, 0));
    g.add(B(0.18, 0.18, 0.03, M.brass, 0, 0.22, 0));
    g.add(B(0.08, 0.08, 0.04, M.dark, 0, 0.22, 0));
    g.add(B(0.1, 0.04, 0.03, M.brass, 0.06, -0.12, 0));
    g.add(B(0.07, 0.04, 0.03, M.brass, 0.05, -0.04, 0));
  } else if (kind === 'bosskey') {
    g.add(B(0.08, 0.5, 0.05, M.gold, 0, 0, 0));
    g.add(B(0.3, 0.3, 0.06, M.gold, 0, 0.34, 0));
    g.add(B(0.12, 0.12, 0.08, M.glow, 0, 0.34, 0));
    g.add(B(0.16, 0.06, 0.05, M.gold, 0.1, -0.2, 0));
    g.add(B(0.12, 0.06, 0.05, M.gold, 0.08, -0.08, 0));
    g.add(B(0.4, 0.05, 0.05, M.gold, 0, 0.15, 0));
  } else if (kind === 'map') {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), M.paper);
    roll.rotation.z = Math.PI / 2;
    g.add(roll);
    g.add(B(0.48, 0.3, 0.01, M.paper, 0, -0.16, 0.03));
    g.add(B(0.06, 0.16, 0.16, M.ribbon, 0, 0, 0));
  } else if (kind === 'heart') {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.15, -0.3, -0.62, -0.05, -0.55, 0.22);
    s.bezierCurveTo(-0.5, 0.48, -0.15, 0.55, 0, 0.3);
    s.bezierCurveTo(0.15, 0.55, 0.5, 0.48, 0.55, 0.22);
    s.bezierCurveTo(0.62, -0.05, 0.15, -0.3, 0, -0.5);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false, curveSegments: 6 });
    geo.center();
    const m = new THREE.Mesh(geo, M.red);
    m.scale.setScalar(0.85);
    g.add(m);
    g.add(B(0.12, 0.12, 0.02, M.glow, -0.18, 0.12, 0.13));
  } else if (kind === 'letter') {
    g.add(B(0.36, 0.24, 0.02, M.paper, 0, 0, 0));
    g.add(B(0.08, 0.08, 0.03, M.ribbon, 0, 0, 0.01));
  }
  return g;
}

export const ITEM_TEXT = {
  map: ['You found the Bastion Map!', "Press K to view it. Now you can also see the rooms you haven't visited."],
  key: ['You got a Iron Key!', 'It opens a locked door somewhere in this fortress.'],
  bosskey: ['You got the Storm Key!', "It fits the great door where the Bastion's master awaits."],
  hammer: [
    "You got Mjölnir's Shard!",
    "A piece of Thor's own hammer. Broken, but the lightning still lives in it.",
    'Press F to strike the ground. The blow sends lightning through old copper channels and shatters shields.',
    'Press G to carry the hammer with heavy weight. You will stand firm against storm winds, and weak floors will give way beneath you.',
  ],
  heart: ['You got a Heart Ember!', 'A new heart, filled to the brim.'],
};

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

// Ra's Shattered Prism: en sprucken solkristall i en gyllene ram med vingar
export function buildPrism() {
  const M = ITEM_MATS;
  const g = new THREE.Group();
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
  crystal.scale.set(0.8, 1.5, 0.8);
  g.add(crystal);
  const crack = B(0.02, 0.4, 0.02, new THREE.MeshBasicMaterial({ color: 0xb06a10 }), 0.05, 0.02, 0.1);
  crack.rotation.z = 0.4;
  g.add(crack);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 4, 12), M.gold);
  g.add(ring);
  for (const s of [-1, 1]) {
    const wing = B(0.32, 0.08, 0.03, M.gold, s * 0.42, 0.08, 0);
    wing.rotation.z = s * 0.35;
    g.add(wing, B(0.22, 0.06, 0.03, M.gold, s * 0.38, -0.02, 0));
  }
  g.add(B(0.06, 0.24, 0.06, M.gold, 0, -0.36, 0));
  return g;
}

export function buildItem(kind) {
  const M = ITEM_MATS;
  const g = new THREE.Group();
  if (kind === 'pmap') kind = 'map';
  else if (kind === 'pkey') kind = 'key';
  if (kind === 'prism') {
    g.add(buildPrism());
  } else if (kind === 'sunkey') {
    g.add(B(0.08, 0.5, 0.05, M.gold, 0, 0, 0));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), M.gold);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 0.36;
    g.add(disc);
    g.add(B(0.14, 0.14, 0.08, new THREE.MeshBasicMaterial({ color: 0xffc040 }), 0, 0.36, 0));
    for (let i = 0; i < 6; i++) {
      const r = B(0.04, 0.12, 0.04, M.gold, Math.cos(i * 1.047) * 0.27, 0.36 + Math.sin(i * 1.047) * 0.27, 0);
      r.rotation.z = i * 1.047 - Math.PI / 2;
      g.add(r);
    }
    g.add(B(0.16, 0.06, 0.05, M.gold, 0.1, -0.2, 0));
    g.add(B(0.12, 0.06, 0.05, M.gold, 0.08, -0.08, 0));
  } else if (kind === 'hammer') {
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
  } else if (kind === 'horn') {
    // Grumbles horn: ett krökt bockhorn med ett rött snöre
    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 12, Math.PI * 1.3), lam(0xd8c8a4));
    horn.rotation.z = -0.4;
    g.add(horn);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), lam(0xb09c74));
    tip.position.set(0.2, 0.0, 0);
    g.add(tip);
    g.add(B(0.3, 0.03, 0.03, ITEM_MATS.ribbon, -0.02, -0.12, 0.05));
  } else if (kind === 'flute') {
    // Pilgrimens flöjt: ett rör av vass med hål och ett rött snöre
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 8), lam(0xb8925a));
    tube.rotation.z = Math.PI / 2 - 0.5;
    g.add(tube);
    for (let i = 0; i < 4; i++) {
      const h = B(0.05, 0.05, 0.04, M.dark, -0.12 + i * 0.1, -0.06 + i * 0.055, 0.05);
      g.add(h);
    }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 8), ITEM_MATS.ribbon);
    band.rotation.z = Math.PI / 2 - 0.5;
    band.position.set(-0.28, -0.15, 0);
    g.add(band);
  } else if (kind === 'lantern') {
    // Mässingslykta med glas och ett varmt sken
    g.add(B(0.3, 0.05, 0.3, M.brass, 0, 0.2, 0));
    g.add(B(0.32, 0.05, 0.32, M.brass, 0, -0.2, 0));
    for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) g.add(B(0.04, 0.4, 0.04, M.brass, x, 0, z));
    g.add(B(0.2, 0.32, 0.2, new THREE.MeshBasicMaterial({ color: 0xffd27a }), 0, 0, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 10), M.brass);
    ring.position.y = 0.32;
    g.add(ring);
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
    'It lies on F: strike the ground. The blow sends lightning through old copper channels and shatters shields.',
    'And on G: carry the hammer with heavy weight. You will stand firm against storm winds, and weak floors will give way beneath you.',
    'Press Tab to open the item menu and choose which button each item lies on.',
  ],
  heart: ['You got a Heart Ember!', 'A new heart, filled to the brim.'],
  pmap: ['You found the Pyramid Map!', 'Press K to view it. Every chamber of the pyramid is on it now.'],
  pkey: ['You got a Iron Key!', 'It opens a locked door somewhere in this pyramid.'],
  sunkey: ['You got the Sun Key!', 'It fits the great door behind which the shadow serpent waits.'],
  prism: [
    "You got Ra's Shattered Prism!",
    'A crystal of the sun god, cracked through. It still drinks the light.',
    'Put it on a button in the item menu (Tab) and press it to raise the prism. Stand in a sunbeam, or in the light from the ceiling, and the prism throws the light where you face.',
    'Lock on (Q) to aim the light straight at a sun eye, a shadow, or a foe. Sunlight burns away darkness.',
  ],
  horn: [
    "You got Grumble's Horn!",
    'Hollis carved it from one of Grumble\'s old horns. Blow it outdoors, and the big ram will come running.',
    'Press E next to Grumble to climb into the saddle. He runs twice as fast as Cello, and jumps further. Press E again to climb down.',
    'He will not follow you into caves, houses or dungeons. He waits outside.',
  ],
  flute: [
    "You got the Pilgrim's Flute!",
    'A reed flute, worn smooth by a lifetime of songs.',
    'Put it on F, G or V in the item menu (Tab) and press that button to play. Each of ↑ ← → ↓ and Space plays a note. Esc stops playing.',
    'Some melodies have power. The songs you learn are written in your item menu.',
  ],
  lantern: [
    'You got the Lantern!',
    'A brass oil lantern. Put it on F, G or V in the item menu (Tab), then press that button to light it.',
    'It burns oil while it is lit, so put it out when you do not need it. Hold it up to an old brazier to light the brazier.',
  ],
};

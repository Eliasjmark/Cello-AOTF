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

// 0.15: Poseidons förvridna treudd. Skaftet pekar längs −y från handen, spetsarna i änden
export function buildTrident() {
  const g = new THREE.Group();
  const br = lam(0x4a8a7a), dark = lam(0x2a4a44), curse = new THREE.MeshBasicMaterial({ color: 0xb06aff });
  g.add(B(0.05, 1.5, 0.05, br, 0, -0.55, 0));
  g.add(B(0.08, 0.08, 0.08, dark, 0, 0.18, 0));
  const head = new THREE.Group();
  head.position.y = -1.3;
  head.add(B(0.42, 0.06, 0.06, br, 0, 0, 0));
  for (const [x, h] of [[-0.19, 0.3], [0, 0.4], [0.19, 0.3]]) {
    head.add(B(0.045, h, 0.045, br, x, -h / 2, 0));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), br);
    tip.rotation.x = Math.PI;
    tip.position.set(x, -h - 0.06, 0);
    head.add(tip);
  }
  head.add(B(0.02, 0.18, 0.02, curse, 0.03, -0.12, 0.03));
  head.add(B(0.12, 0.02, 0.02, curse, -0.08, 0.02, 0.03));
  g.add(head);
  g.userData.head = head;
  return g;
}

export function buildItem(kind) {
  const M = ITEM_MATS;
  const g = new THREE.Group();
  if (kind === 'pmap' || kind === 'nmap' || kind === 'smap' || kind === 'tmap' || kind === 'fmap' || kind === 'omap') kind = 'map';
  else if (kind === 'pkey' || kind === 'nkey' || kind === 'skey' || kind === 'tkey' || kind === 'fkey' || kind === 'okey') kind = 'key';
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
  } else if (kind === 'kite') {
    // Tobs drake: röd, med en gul svans
    const red = lam(0xc83a2a), yel = lam(0xf0c040);
    const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.35, 0, 0), new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(-0.35, 0, 0),
    ]), red);
    sail.geometry.computeVertexNormals();
    sail.material = red.clone();
    sail.material.side = THREE.DoubleSide;
    g.add(sail);
    for (let k = 0; k < 5; k++) g.add(B(0.12, 0.05, 0.02, yel, Math.sin(k) * 0.08, -0.7 - k * 0.15, 0));
  } else if (kind === 'clapper') {
    // En klockkläpp av brons
    const br = lam(0xb08040);
    g.add(B(0.06, 0.6, 0.06, br, 0, 0, 0));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), br);
    ball.position.y = -0.34;
    g.add(ball);
    g.add(B(0.18, 0.06, 0.06, br, 0, 0.3, 0));
  } else if (kind === 'sandals') {
    // Hermes sandaler: två gyllene sulor med remmar och små vita vingar vid hälarna
    const gold = M.gold, strap = lam(0x8a6a3a), wing = lam(0xf2f4ff);
    for (const s of [-1, 1]) {
      const g2 = new THREE.Group();
      g2.position.set(s * 0.17, 0, 0);
      g2.rotation.y = s * 0.15;
      g2.add(B(0.16, 0.05, 0.42, gold, 0, -0.2, 0));
      for (const z of [-0.1, 0.06]) g2.add(B(0.18, 0.12, 0.03, strap, 0, -0.13, z));
      for (let k = 0; k < 3; k++) {
        const f = B(0.03, 0.08 + k * 0.03, 0.14 - k * 0.025, wing, s * 0.1, -0.08 + k * 0.05, -0.16 - k * 0.02);
        f.rotation.x = -0.5;
        g2.add(f);
      }
      g.add(g2);
    }
  } else if (kind === 'scales') {
    // Anubis vågskål: en stång av svart sten, en bom av guld och två pannor – den ena bruten
    const gold = M.gold, dark = lam(0x15151a);
    g.add(B(0.07, 0.8, 0.07, dark, 0, 0, 0));
    g.add(B(0.25, 0.08, 0.25, dark, 0, -0.42, 0));
    g.add(B(0.16, 0.16, 0.16, gold, 0, 0.42, 0));
    const beam = B(0.9, 0.05, 0.05, gold, 0, 0.32, 0);
    beam.rotation.z = 0.18;
    g.add(beam);
    for (const s of [-1, 1]) {
      const x = s * 0.42, y = 0.32 + s * -0.08;
      g.add(B(0.02, 0.3, 0.02, gold, x, y - 0.15, 0));
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.05, 10), gold);
      pan.position.set(x, y - 0.32, 0);
      if (s > 0) { pan.scale.set(1, 1, 0.55); pan.rotation.z = 0.4; }
      g.add(pan);
    }
    g.add(B(0.12, 0.12, 0.02, new THREE.MeshBasicMaterial({ color: 0x6af0d4 }), 0, 0.42, 0.09));
  } else if (kind === 'galekey') {
    // Stormnyckeln: brons med en vinge och en blå sten
    const br = lam(0xb08040);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 12), br);
    loop.position.y = 0.3;
    g.add(loop);
    g.add(B(0.07, 0.55, 0.06, br, 0, -0.1, 0));
    g.add(B(0.18, 0.06, 0.06, br, 0.08, -0.32, 0));
    g.add(B(0.14, 0.06, 0.06, br, 0.06, -0.2, 0));
    const wing = B(0.03, 0.22, 0.3, lam(0xf2f4ff), -0.18, 0.32, 0);
    wing.rotation.x = -0.4;
    g.add(wing);
    g.add(B(0.08, 0.08, 0.08, new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), 0, 0.3, 0.04));
  } else if (kind === 'ankhkey') {
    // Ankhnyckeln: livets tecken i guld
    const gold = M.gold;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), gold);
    loop.position.y = 0.3;
    loop.scale.set(0.85, 1.15, 1);
    g.add(loop);
    g.add(B(0.4, 0.08, 0.06, gold, 0, 0.08, 0));
    g.add(B(0.08, 0.5, 0.06, gold, 0, -0.2, 0));
    g.add(B(0.07, 0.07, 0.08, new THREE.MeshBasicMaterial({ color: 0x6af0d4 }), 0, 0.08, 0.03));
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
  } else if (kind === 'trident') {
    // 0.15: Poseidons förvridna treudd: ärgad brons, tre spetsar, och lila sprickor av Kronos förbannelse
    g.add(buildTrident());
  } else if (kind === 'mask') {
    // 0.16: Lokis mask: ett ansikte av guld med gröna, böjda horn och gröna ögon
    const gold = lam(0xc9a24f, { emissive: 0x2a1c06 }), green = lam(0x2f7a4a);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), gold);
    face.rotation.x = Math.PI / 2;
    face.scale.set(1, 1, 0.45);
    g.add(face);
    for (const s of [-1, 1]) {
      g.add(B(0.07, 0.04, 0.03, new THREE.MeshBasicMaterial({ color: 0x9dff9a }), 0.09 * s, 0.04, 0.1));
      for (let k = 0; k < 3; k++) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.07 - k * 0.018, 0.24, 5), green);
        h.position.set((0.2 + 0.07 * k) * s, 0.2 + 0.16 * k, -0.04 * k);
        h.rotation.z = -(0.4 + 0.45 * k) * s;
        g.add(h);
      }
    }
  } else if (kind === 'frostkey') {
    // Frostnyckeln: en nyckel av blå is med en jättes tand som ax
    const ice = lam(0x9fd8f0, { emissive: 0x16303a, transparent: true, opacity: 0.9 });
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 12), ice);
    loop.position.y = 0.3;
    g.add(loop);
    g.add(B(0.07, 0.55, 0.06, ice, 0, -0.1, 0));
    g.add(B(0.18, 0.14, 0.06, lam(0xe8e4d8), 0.04, -0.33, 0));
  } else if (kind === 'titankey') {
    // 0.21: Titannyckeln: svart sten med lila ådror och ett ax som en liten krona
    const stone = lam(0x2a2430, { emissive: 0x1a0828 });
    const vein = lam(0xb070ff, { emissive: 0x6a2aa8 });
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.055, 6, 12), stone);
    loop.position.y = 0.3;
    g.add(loop);
    g.add(B(0.08, 0.55, 0.07, stone, 0, -0.1, 0));
    g.add(B(0.02, 0.5, 0.075, vein, 0, -0.1, 0));
    for (const x of [-0.07, 0, 0.07]) g.add(B(0.05, 0.12 + (x === 0 ? 0.06 : 0), 0.07, vein, 0.05 + x, -0.34, 0));
  } else if (kind === 'reindeer' || kind === 'thaw') {
    g.add(B(0.2, 0.2, 0.2, lam(0xc8a878), 0, 0, 0));
  } else if (kind === 'tidekey') {
    // Tidvattennyckeln: grön brons med en liten treudd som ax
    const br = lam(0x5a9a8a);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 12), br);
    loop.position.y = 0.3;
    g.add(loop);
    g.add(B(0.07, 0.55, 0.06, br, 0, -0.1, 0));
    for (const dx of [-0.08, 0, 0.08]) g.add(B(0.04, 0.12, 0.05, br, dx, -0.38, 0));
    g.add(B(0.2, 0.04, 0.05, br, 0, -0.31, 0));
    g.add(B(0.09, 0.09, 0.09, new THREE.MeshBasicMaterial({ color: 0x7ff0e0 }), 0, 0.3, 0.04));
  } else if (kind === 'pearl') {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), lam(0x2a2838, { emissive: 0x2a1a44 }));
    g.add(p);
    g.add(B(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xd8c8ff }), 0.08, 0.1, 0.14));
  } else if (kind === 'charm') {
    // Dykarens amulett: ett snäckskal på ett band av tång
    const shell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), lam(0xe8d8c8));
    shell.rotation.z = Math.PI;
    g.add(shell);
    for (let k = 0; k < 4; k++) g.add(B(0.02, 0.32, 0.02, lam(0xc8a890), -0.09 + k * 0.06, 0.02, 0.1));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 4, 14), lam(0x4a6a3a));
    band.position.y = 0.3;
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
  key: ['Cello found an Iron Key!', 'It opens a locked door somewhere in this fortress.'],
  bosskey: ['Cello found the Storm Key!', "It fits the great door where the Bastion's master awaits."],
  hammer: [
    "Cello found Mjölnir's Shard!",
    "A piece of Thor's own hammer. Broken, but the lightning still lives in it.",
    'It lies on F: strike the ground. The blow sends lightning through old copper channels and shatters shields.',
    'And on G: carry the hammer with heavy weight. You will stand firm against storm winds, and weak floors will give way beneath you.',
    'Press Tab to open the item menu and choose which button each item lies on.',
  ],
  heart: ['Cello found a Heart Ember!', 'A new heart, filled to the brim.'],
  pmap: ['You found the Pyramid Map!', 'Press K to view it. Every chamber of the pyramid is on it now.'],
  pkey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in this pyramid.'],
  sunkey: ['Cello found the Sun Key!', 'It fits the great door behind which the shadow serpent waits.'],
  prism: [
    "Cello found Ra's Shattered Prism!",
    'A crystal of the sun god, cracked through. It still drinks the light.',
    'Put it on a button in the item menu (Tab) and press it to raise the prism. Stand in a sunbeam, or in the light from the ceiling, and the prism throws the light where you face.',
    'Lock on (Q) to aim the light straight at a sun eye, a shadow, or a foe. Sunlight burns away darkness.',
  ],
  horn: [
    "Cello found Grumble's Horn!",
    'Hollis carved it from one of Grumble\'s old horns. Blow it outdoors, and the big ram will come running.',
    'Press E next to Grumble to climb into the saddle. He runs twice as fast as Cello, and jumps further. Press E again to climb down.',
    'He will not follow you into caves, houses or dungeons. He waits outside.',
  ],
  nmap: ['You found the Necropolis Map!', 'Press K to view it. The rooms you have not visited are on it now.'],
  nkey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in the necropolis.'],
  ankhkey: ['Cello found the Ankh Key!', 'The key of life. It opens the great door behind which the Devourer waits.'],
  smap: ['You found the Spire Map!', 'Press K to view it. The rooms of the tower are on it now.'],
  skey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in the tower.'],
  galekey: ['Cello found the Gale Key!', 'A key cast from bronze, cold as the north wind. It opens the great door to the Crown of Storms.'],
  sandals: [
    "Cello found Hermes' Wing Sandals!",
    'The messenger of the gods ran in these from one end of the sky to the other. The little wings still beat.',
    'Put them on F, G or V (Tab) and press that button: Cello runs like the wind and jumps much further.',
    'Run and jump at a wall at an angle, and Cello runs along it for a few heartbeats. Jump again to leap off. Updrafts lift him high, unless he is heavy.',
  ],
  scales: [
    "Cello found Anubis' Broken Scales!",
    'The scales on which the god of the dead weighed every heart. One pan is cracked, but they still weigh true.',
    'Put them on F, G or V (Tab) and press that button to tip them: Cello steps between the realm of the living and the realm of the dead.',
    'In the realm of the dead, spirits speak and hidden bridges appear. False stone fades away. But the dead have their own dangers.',
  ],
  flute: [
    "Cello found the Pilgrim's Flute!",
    'A reed flute, worn smooth by a lifetime of songs.',
    'Put it on F, G or V in the item menu (Tab) and press that button to play. Each of ↑ ← → ↓ and Space plays a note. Esc stops playing.',
    'Some melodies have power. The songs you learn are written in your item menu.',
  ],
  tmap: ['You found the Temple Map!', 'Press K to view it. The drowned halls are on it now.'],
  tkey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in the drowned temple.'],
  tidekey: ['Cello found the Tide Key!', 'Green bronze, cold as the deep. It opens the great door to the Throne of Tides.'],
  trident: [
    "Cello found Poseidon's Corrupted Trident!",
    'The spear of the sea god, cracked and veined with Kronos\' purple curse. The sea still answers it.',
    'Put it on F, G or V (Tab) and press that button: Cello dashes forward with the trident. Under water it drives him like a fish. It breaks brittle coral, and hurts what it hits.',
    'At a tide altar, press E to plunge the trident in. The water rises or falls at its command.',
  ],
  fmap: ['You found the Labyrinth Map!', 'Press K to view it. Though the halls of the Maw may not stay where the map says...'],
  fkey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in the Frostgiant\'s Maw.'],
  frostkey: ['Cello found the Frost Key!', 'Cut from blue ice that never melts. It opens the great door to the Giant\'s Heart.'],
  omap: ['You found the Map of the Crown!', 'Press K to view it. The halls inside the mountain of the titans.'],
  okey: ['Cello found an Iron Key!', 'It opens a locked door somewhere in the Crown of Othrys.'],
  titankey: ['Cello found the Titan Key!', 'Black stone, warm as a heartbeat, veined with purple light. It opens the great door to the Throne of Othrys.'],
  mask: [
    "Cello found Loki's Mask!",
    'The face of the trickster god, gold and green, with horns that curl like smoke. It grins even when you do not.',
    'Put it on F, G or V (Tab) and press that button: Cello\'s shadow flies ahead and stands where it lands. It slips through rime grates, and it is heavy enough to hold down a plate.',
    'Press the button again to swap places with the shadow.',
  ],
  pearl: ['You found a Black Pearl!', 'Dark as the deep, with a glow inside. Corwin in Brinehollow pays well for these... or so he says.'],
  charm: ["Cello found the Diver's Charm!", "A shell on a cord of sea-grass. Wearing it, Cello can hold his breath far longer under water."],
  lantern: [
    'Cello found the Lantern!',
    'A brass oil lantern. Put it on F, G or V in the item menu (Tab), then press that button to light it.',
    'It burns oil while it is lit, so put it out when you do not need it. Hold it up to an old brazier to light the brazier.',
  ],
};

// Namnet på en skärva efter värdet (grön 1, blå 5-15, röd 20-49, lila 50)
export const shardWord = (n) => (n >= 50 ? 'a purple shard' : n >= 20 ? 'a red shard' : n >= 5 ? 'a blue shard' : 'a green shard');

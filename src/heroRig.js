// Cello som skulptur (0.13): Elias hjältemodell med skelett, nya ben och skulpturens svärd.
// Bygger om delarna som player.js animerar (body, hips, torso, head, armar, ben, svärd ...), så att
// all rörelsekod fungerar som förut. Sakerna som Cello bär (hammaren, prisman, lyktan) flyttas till de nya benen.
import * as THREE from 'three';
import { skinnedModel, rigidModel, limb, hasModel } from './skinned.js';

export const HERO_PALETTE = {
  skin: 0xd8a47c, hair: 0x3c2618, band: 0x9a2420, tunic: 0x38506c, leather: 0x8a5e36, leatherDark: 0x4e3422,
  bracer: 0x5e4028, wood: 0x7e5634, iron: 0x6a6e76, boss: 0xb88a3e,
};
export const SWORD_PALETTE = { steel: 0xd4dae2, gold: 0xc29a48, grip: 0x4a3222 };

export const heroAvailable = () => hasModel('cello') && hasModel('celloblade');

// p: delarna från de byggda figuren (player.js buildModel). Returnerar nya delar.
export function sculptHero(p) {
  const root = p.root;
  const sk = skinnedModel('cello', HERO_PALETTE);
  const B = sk.bones;
  const body = new THREE.Group();
  root.remove(p.body);
  root.add(body);
  body.add(sk.mesh);
  body.add(B.hips);
  const hips = B.hips, torso = B.torso, head = B.head;

  // Benen: mjuka, svarvade lår och smalben, höga läderstövlar
  const pants = 0x4a3c30, boot = 0x5c3e26, cuff = 0x7a5634;
  const leg = (side) => {
    const g = new THREE.Group();
    g.position.set(0.1 * side, -0.02, 0);
    hips.add(g);
    g.add(limb([[0.08, 0.06], [0.05, 0.1], [0, 0.114], [-0.12, 0.108], [-0.26, 0.09], [-0.38, 0.074], [-0.43, 0.068]], pants, 14));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    g.add(knee);
    // knät: en rund led, så att det inte blir ett glapp när benet böjs
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.071, 12, 8), new THREE.MeshLambertMaterial({ color: pants })));
    knee.add(limb([[0.02, 0.07], [-0.05, 0.074], [-0.12, 0.078]], pants, 14));
    knee.add(limb([[-0.09, 0.086], [-0.12, 0.092], [-0.17, 0.088], [-0.28, 0.072], [-0.36, 0.066], [-0.39, 0.066]], boot, 14));
    knee.add(limb([[-0.085, 0.094], [-0.125, 0.097]], cuff, 14));
    // foten: en rundad sko som pekar framåt
    const foot = limb([[0.0, 0.055], [-0.05, 0.075], [-0.14, 0.072], [-0.2, 0.05], [-0.22, 0.02]], boot, 10, 1);
    foot.rotation.x = -Math.PI / 2;
    foot.scale.set(1.05, 1, 0.6);
    foot.position.set(0, -0.385, -0.02);
    knee.add(foot);
    return { g, knee };
  };
  const lL = leg(-1), lR = leg(1);

  // Svärdet i höger hand: skulpturens parerstång och blad, ett lindat grepp och en knapp
  const sword = new THREE.Group();
  B.handR.add(sword);
  sword.add(rigidModel('celloguard', SWORD_PALETTE));
  const blade = rigidModel('celloblade', SWORD_PALETTE);
  const bladeY = -0.135;
  blade.position.y = bladeY;
  blade.userData.solo = true;
  sword.add(blade);
  const gripMat = new THREE.MeshLambertMaterial({ color: SWORD_PALETTE.grip });
  const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.2, 8), gripMat);
  gripMesh.position.y = -0.0;
  sword.add(gripMesh);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshLambertMaterial({ color: SWORD_PALETTE.gold }));
  pommel.position.y = 0.11;
  sword.add(pommel);
  const tip = new THREE.Object3D();
  sword.add(tip);
  const jag = p.jag;
  jag.removeFromParent();
  jag.position.set(0, bladeY - 0.2, 0);
  jag.scale.set(0.5, 0.8, 1.1);
  sword.add(jag);

  // Ögonen: skulpturen har ögonhålor men inga ögon. Små målade ögon (vitor och iris) på huvudet,
  // på ytan i hålorna (uppmätt på skulpturen; huvudet är vridet lite åt höger). De blinkar som förut.
  const eyes = [], lids = [];
  const white = new THREE.MeshLambertMaterial({ color: 0xeee6d8 });
  const irisM = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
  // (skulpturen är speglad i X, se tools/models/hero.py)
  for (const [x, y, z, nx] of [[0.069, 0.158, 0.079, 0.55], [0.004, 0.157, 0.103, 0.22]]) {
    const lid = new THREE.Group();
    lid.position.set(x, y, z);
    lid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(nx, 0, Math.sqrt(1 - nx * nx)));
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.0155, 16), white);
    w.scale.set(1, 0.55, 1);
    lid.add(w);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0082, 14), irisM);
    iris.position.set(0.001, -0.0005, 0.0008);
    lid.add(iris);
    head.add(lid);
    lids.push(lid);
    eyes.push(iris);
  }

  // Sakerna Cello bär
  const move = (o, parent, x, y, z) => { o.removeFromParent(); parent.add(o); o.position.set(x, y, z); return o; };
  move(p.hammerHand, B.handR, 0, 0.02, 0).scale.setScalar(1.0);
  move(p.hammerBack, torso, -0.12, 0.46, -0.22).scale.setScalar(0.72);
  move(p.prism, B.handR, 0, -0.14, 0.06);
  move(p.lantern, hips, -0.25, 0.0, 0.1);

  // Delar som rörelsekoden rör men som skulpturen inte har
  const shield = new THREE.Group();
  torso.add(shield);
  const skirt = new THREE.Group();
  hips.add(skirt);
  const tail = new THREE.Group();
  torso.add(tail);
  const scarf = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  tail.add(scarf[0]); scarf[0].add(scarf[1]); scarf[1].add(scarf[2]);

  const recolor = (kind) => sk.recolor({
    ...HERO_PALETTE,
    tunic: kind === 'vengeful' ? 0x2e3440 : HERO_PALETTE.tunic,
    band: kind === 'vengeful' ? 0x3a1212 : kind === 'heroic' ? 0xb8302a : HERO_PALETTE.band,
  });

  return {
    ...p, root, body, hips, torso, head, tail, scarf, armL: B.armL, armR: B.armR, elbowL: B.elbowL, elbowR: B.elbowR,
    legL: lL.g, legR: lR.g, kneeL: lL.knee, kneeR: lR.knee, skirt, sword, shield, eyes, lids,
    blade, tip, jag, bladeY, recolor, sculpt: true, skinned: sk.mesh,
  };
}

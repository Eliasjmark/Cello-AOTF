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
  cutLeftUpperArm(sk.mesh);
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
  if (p.tridentHand) move(p.tridentHand, B.handR, 0, 0.0, 0.02).scale.setScalar(0.85);
  move(p.lantern, hips, -0.25, 0.0, 0.1);

  // 0.17: skölden och vänster underarm. I skulpturen var skölden ihopsmält med armen och bröstet, så de
  // sträcktes ut och såg trasiga ut när armen rörde sig. Nu är de klippta ur skulpturen (tools/models/hero.py)
  // och byggs här som fasta delar på underarmen: de följer armen utan att något töjs.
  const shieldArm = buildShieldArm(B, body, torso);

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
    blade, tip, jag, bladeY, recolor, sculpt: true, skinned: sk.mesh, shieldMesh: shieldArm.sh, updateShield: shieldArm.update,
  };
}

// 0.20.1: vänster överarm. I skulpturen hänger armen tätt intill sidan med armbågen vid bältet, och när
// underarmen och skölden klipptes bort (0.17) blev överarmen kvar som trasiga bitar ihopsydda med bröstet och
// bältet. När Cello lyfte skölden drogs de ut i långa bruna trådar mot näven. Nu klipps överarmen också bort
// (trianglarna i en kapsel från axeln till armbågen) och byggs i buildShieldArm som fasta delar, precis som
// underarmen. Hörn utanför kapseln som ändå hade armens vikt (bröst, remmar, bälte) får följa bålen.
function cutLeftUpperArm(mesh) {
  const geo = mesh.geometry, sk = mesh.skeleton, names = sk.bones.map((b) => b.name);
  const iA = names.indexOf('armL'), iT = names.indexOf('torso');
  const P = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  if (iA < 0 || iT < 0 || !si || !sw || !geo.index || geo.userData.armCut) return;
  geo.userData.armCut = true;
  const bindPos = (nm) => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[names.indexOf(nm)].clone().invert());
  const s0 = bindPos('armL'), d = bindPos('elbowL').sub(s0);
  const v = new THREE.Vector3(), q = new THREE.Vector3();
  const cut = new Uint8Array(P.count);
  for (let n = 0; n < P.count; n++) {
    let kA = -1;
    for (let k = 0; k < 4; k++) if (si.getComponent(n, k) === iA && sw.getComponent(n, k) > 0) kA = k;
    if (kA < 0) continue;
    v.fromBufferAttribute(P, n);
    const t = q.copy(v).sub(s0).dot(d) / d.lengthSq();
    const dist = q.copy(s0).addScaledVector(d, Math.max(0, Math.min(1, t))).distanceTo(v);
    const w = sw.getComponent(n, kA);
    // axelkulan (t < 0.18) får vara kvar och följa armen som förut
    if (t < 0.18) continue;
    if (w > 0.4 && dist < 0.068 && t < 1.25) { cut[n] = 1; continue; }
    // ett hörn på bålen som bara låg nära armen: all armens vikt till bålen
    let kT = -1;
    for (let k = 0; k < 4; k++) if (si.getComponent(n, k) === iT) kT = k;
    if (kT < 0) { si.setComponent(n, kA, iT); continue; }
    sw.setComponent(n, kT, sw.getComponent(n, kT) + w);
    sw.setComponent(n, kA, 0);
  }
  const idx = geo.index.array, keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (cut[idx[i]] || cut[idx[i + 1]] || cut[idx[i + 2]]) continue;
    keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(new THREE.BufferAttribute(P.count > 65535 ? new Uint32Array(keep) : new Uint16Array(keep), 1));
  si.needsUpdate = true;
  sw.needsUpdate = true;
}

// Sköldens läge i skulpturen (spelets enheter, kroppens ram), mätt av tools/models/hero.py
const SHIELD = { center: [-0.2565, 1.0111, -0.0432], normal: [-0.9843, -0.0063, -0.1764], radius: 0.3264 };

function buildShieldArm(B, body, torso) {
  const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: false });
  const skin = lam(HERO_PALETTE.skin), bracer = lam(HERO_PALETTE.bracer), leather = lam(HERO_PALETTE.leatherDark);
  const wood = lam(HERO_PALETTE.wood), woodDark = lam(0x5e3e24), iron = lam(HERO_PALETTE.iron), boss = lam(HERO_PALETTE.boss);
  const el = B.elbowL, hand = B.handL;
  body.updateWorldMatrix(true, true);
  const toLocal = (arr) => el.worldToLocal(body.localToWorld(new THREE.Vector3(...arr)));
  // 0.20.1: överarmen, från axeln till armbågen: bar hud och en läderskiva på axeln (som högra armen)
  {
    const up = new THREE.Group(), elPos = el.position.clone(), ulen = elPos.length();
    up.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), elPos.clone().normalize());
    B.armL.add(up);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, ulen, 14), skin);
    c.position.y = -ulen / 2;
    up.add(c);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 10), skin);
    sh.scale.set(1, 0.95, 1);
    up.add(sh);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), lam(HERO_PALETTE.leather));
    pad.position.y = -0.01;
    pad.scale.set(1, 0.9, 1.05);
    up.add(pad);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.011, 6, 18), leather);
    strap.rotation.x = Math.PI / 2;
    strap.position.y = -ulen * 0.42;
    up.add(strap);
  }
  // Underarmen: från armbågen till handen, med en läderkrage
  const handPos = hand ? hand.position.clone() : new THREE.Vector3(0, -0.26, 0);
  const len = handPos.length();
  const dir = handPos.clone().normalize();
  const fore = new THREE.Group();
  fore.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  el.add(fore);
  const seg = (r0, r1, y0, y1, m) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, y1 - y0, 12), m);
    c.position.y = -(y0 + y1) / 2;
    fore.add(c);
    return c;
  };
  fore.add(new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), bracer));
  seg(0.05, 0.043, 0, len * 0.3, skin);
  seg(0.056, 0.05, len * 0.28, len * 0.92, bracer);
  for (const k of [0.4, 0.62, 0.84]) seg(0.058, 0.058, len * k, len * k + 0.012, leather);
  // Handen: en knuten näve runt sköldens handtag
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), skin);
  fist.scale.set(0.95, 1.1, 1.25);
  fist.position.y = -len - 0.02;
  fore.add(fist);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.035, 4, 8), skin);
  thumb.position.set(0.035, -len - 0.005, 0.03);
  thumb.rotation.z = 0.6;
  fore.add(thumb);

  // Skölden: en rund sköld av plankor med järnkant, en buckla i mitten och nitar
  const R = SHIELD.radius, T = 0.035;
  const sh = new THREE.Group();
  const face = new THREE.Group(); // +Z = sköldens framsida
  sh.add(face);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 40), wood);
  disc.rotation.x = Math.PI / 2;
  face.add(disc);
  // plankorna: mörka fogar över framsidan
  for (let k = -3; k <= 3; k++) {
    const x = k * (R / 3.6);
    const h = 2 * Math.sqrt(Math.max(0, R * R - x * x)) * 0.96;
    if (h < 0.05) continue;
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.006, h, 0.004), woodDark);
    g.position.set(x + R / 7.2, 0, T / 2 + 0.001);
    face.add(g);
  }
  // två järnband tvärs över
  for (const y of [-R * 0.48, R * 0.48]) {
    const w = 2 * Math.sqrt(R * R - y * y) * 0.98;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 0.008), iron);
    b.position.set(0, y, T / 2 + 0.003);
    face.add(b);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.017, 8, 48), iron);
  face.add(rim);
  const bossM = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), boss);
  bossM.rotation.x = Math.PI / 2;
  bossM.position.z = T / 2;
  face.add(bossM);
  const bossRim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.27, 0.01, 6, 24), iron);
  bossRim.position.z = T / 2 + 0.002;
  face.add(bossRim);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4), iron);
    r.position.set(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88, T / 2 + 0.004);
    face.add(r);
  }
  // baksidan: läderremmar och handtaget
  for (const y of [-0.07, 0.07]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(R * 1.3, 0.035, 0.01), leather);
    strap.position.set(0, y, -T / 2 - 0.006);
    face.add(strap);
  }
  // Läget: samma som skölden hade i skulpturen, räknat i underarmens ram
  const c = toLocal(SHIELD.center);
  const n = toLocal(SHIELD.center.map((v, i) => v + SHIELD.normal[i])).sub(c).normalize();
  sh.position.copy(c);
  sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  el.add(sh);
  // När Cello håller upp skölden: den vrids så att framsidan pekar rakt fram och täcker bröstet
  const restP = sh.position.clone(), restQ = sh.quaternion.clone();
  const tOff = torso.worldToLocal(body.localToWorld(new THREE.Vector3(-0.03, 1.2, 0.36)));
  const tQ = torso.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(body.getWorldQuaternion(new THREE.Quaternion()));
  const _p = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Quaternion();
  const update = (s) => {
    if (s < 0.001) { sh.position.copy(restP); sh.quaternion.copy(restQ); return; }
    torso.updateWorldMatrix(true, true);
    torso.getWorldQuaternion(_q).multiply(tQ);
    // Skölden sitter framför näven (handen håller i handtaget på baksidan)
    if (hand) hand.getWorldPosition(_p); else { _p.copy(tOff); torso.localToWorld(_p); }
    _f.set(0, 0, 1).applyQuaternion(_q);
    _p.addScaledVector(_f, 0.075);
    el.worldToLocal(_p);
    el.getWorldQuaternion(_e).invert();
    _q.premultiply(_e);
    sh.position.lerpVectors(restP, _p, s);
    sh.quaternion.slerpQuaternions(restQ, _q, s);
  };
  return { sh, update };
}

// Folk som skulpturer (0.13): bybon och flickan från Elias FBX-filer.
// sculptPerson() ger samma delar som buildPerson i npcs.js (root, body, hips, torso, head, armar, ben ...),
// så att Npc-klassen kan röra dem på samma sätt. Höfterna är en "fjärrkontroll": koden flyttar en tom grupp
// som om figuren hade de byggda figurernas långa ben, och sync() för över rörelsen till skulpturens kortare ben.
import * as THREE from 'three';
import { skinnedModel, rigidModel, hasModel } from './skinned.js';

const HIP_CODE = 0.86; // höfthöjden som rörelsekoden räknar med

export const sculptAvailable = (kind) => hasModel(kind);

function byboPalette(o) {
  const bald = o.hairStyle === 'bald';
  const hood = o.hairStyle === 'hood' ? (o.hood ?? 0x3a4256) : null;
  const beard = o.beard ?? o.hair ?? 0x6a5a4a;
  return {
    skin: o.skin ?? 0xc49f83,
    cap: hood ?? (bald ? (o.skin ?? 0xc49f83) : (o.hair ?? beard)),
    hair: hood ?? (bald ? beard : (o.hair ?? beard)),
    beard,
    top: o.top ?? 0x5a5040,
    belt: o.extraColor ?? 0x4a3422,
    skirt: o.bottom ?? o.extraColor ?? 0x6a4a30,
    boots: o.boots ?? 0x2e241c,
  };
}

export const MAIDEN_PALETTE = {
  skin: 0xecc4a6, hair: 0xd8b878, gold: 0xd0a447, bodice: 0x4a6488, cloth: 0xeee6d6, skirt: 0x7a3a3a,
  tights: 0x2a2a3a, boots: 0x6a4428, steel: 0xb8c0cc, leather: 0x5a3a24,
};

function palette(kind, o) {
  if (kind === 'bybo') return byboPalette(o);
  return { ...MAIDEN_PALETTE, ...(o.palette ?? {}) };
}

export function sculptPerson(kind, o = {}) {
  const sk = skinnedModel(kind, palette(kind, o));
  const B = sk.bones;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(sk.mesh);
  body.add(B.hips);
  const hipBind = B.hips.position.y;
  const k = hipBind / HIP_CODE;
  // fjärrkontrollen för höfterna
  const hips = new THREE.Group();
  hips.position.y = HIP_CODE;
  const dummy = (parent) => { const g = new THREE.Group(); parent.add(g); return g; };
  const armL = B.armL ?? dummy(B.torso), armR = B.armR ?? dummy(B.torso);
  const elbowL = B.elbowL ?? dummy(armL), elbowR = B.elbowR ?? dummy(armR);
  const handL = B.handL ?? elbowL, handR = B.handR ?? elbowR;
  // Saker i handen (spjut, hammare, rulle) från de byggda figurerna
  let item = null;
  const M = { metal: new THREE.MeshLambertMaterial({ color: 0x7a7880 }), wood: new THREE.MeshLambertMaterial({ color: 0x5b3f2a }) };
  if (o.item === 'spear' && B.handR) {
    item = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), M.wood);
    shaft.position.y = 0.3;
    item.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), M.metal);
    tip.position.y = 1.55;
    item.add(tip);
    handR.add(item);
  }
  root.scale.setScalar(o.scale ?? 0.95);
  const sync = () => {
    B.hips.position.y = hipBind + (hips.position.y - HIP_CODE) * k;
    B.hips.rotation.copy(hips.rotation);
  };
  return {
    root, body, hips, torso: B.torso, head: B.head, armL, armR, legL: B.legL, legR: B.legR, item, M,
    elbowL, elbowR, kneeL: B.kneeL, kneeR: B.kneeR, handL, handR, sync, sculpt: kind, recolor: sk.recolor, skinned: sk.mesh,
  };
}

// ---------------------------------------------------------------------------------------------
// Hrungnir som dvärgen (Elias Boss1): samma delar som buildTitan i titan.js, så att bossens
// rörelsekod fungerar. Höfterna styrs på samma sätt som för folket (koden räknar med höfthöjden 2,4).
const TITAN_HIP = 2.4;
export const DWARF_PALETTE = {
  skin: 0xd09a78, beard: 0xd8cfc2, iron: 0x6e737c, brass: 0xc8963c, fur: 0xb8ab94, armor: 0x5c6068,
  leather: 0x6a4428, gold: 0xd0a447, coat: 0x6e2e26, boots: 0x3a2a1e, stone: 0x6a655e,
};

export function sculptTitanDwarf() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const sk = skinnedModel('dwarf', DWARF_PALETTE, mat);
  const B = sk.bones;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(sk.mesh);
  body.add(B.hips);
  const hipBind = B.hips.position.y;
  const k = hipBind / TITAN_HIP;
  const hips = new THREE.Group();
  hips.position.y = TITAN_HIP;
  // Hammaren i höger hand, huvudet nedåt längs armen
  const hamMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const hammer = rigidModel('dwarfhammer', DWARF_PALETTE, hamMat);
  B.handR.add(hammer);
  hammer.rotation.set(-1.1, Math.PI / 2, 0, 'YXZ');
  // Glasögonen lyser när han vaknar (som titanens ögon)
  const eye = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffa860 });
  const H = 5.6;
  for (const sx of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035 * H, 16), eye);
    lens.position.set(0.075 * sx * H, (0.80 - 0.74) * H, (0.14 - 0.02) * H);
    lens.rotation.x = -0.15;
    B.head.add(lens);
  }
  const M = { stone: new THREE.MeshLambertMaterial({ color: 0x5d574f, flatShading: true }), dark: new THREE.MeshLambertMaterial({ color: 0x3a352f, flatShading: true }) };
  const sync = () => {
    B.hips.position.y = hipBind + (hips.position.y - TITAN_HIP) * k;
    B.hips.rotation.copy(hips.rotation);
  };
  return {
    root, body, hips, torso: B.torso, head: B.head, armL: B.armL, armR: B.armR, legL: B.legL, legR: B.legR,
    elbowL: B.elbowL, elbowR: B.elbowR, kneeL: B.kneeL, kneeR: B.kneeR, glow, eye, M, sync, hammer,
    mats: [mat, hamMat], sculpt: 'dwarf', skinned: sk.mesh,
  };
}

// ---------------------------------------------------------------------------------------------
// Apophis som hydran (Elias ormar): en kropp med fem halsar, var och en med tre leder och ett huvud.
// Benens viloställning är skulpturens egen pose; Apophis vrider halsarna därifrån.
export const HYDRA_PALETTE = { scale: 0x2a1c38, belly: 0x8a7458, spine: 0x5a2a4a, wing: 0x3a2448, horn: 0xc8b48a };
export const HYDRA_H = 7.0;

export function sculptHydra() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const sk = skinnedModel('hydra', HYDRA_PALETTE, mat);
  const B = sk.bones;
  const root = new THREE.Group();
  root.add(sk.mesh);
  root.add(B.body);
  const necks = [0, 1, 2, 3, 4].map((i) => ({ a: B[`n${i}a`], b: B[`n${i}b`], c: B[`n${i}c`], head: B[`h${i}`] }));
  const M = {
    eye: new THREE.MeshBasicMaterial({ color: 0xff3a2a }),
    gem: new THREE.MeshBasicMaterial({ color: 0x9a5aff }),
  };
  // Ädelstenen i mittenhuvudets panna (den som Cello hugger), och glödande ögon på alla huvuden
  const H = HYDRA_H;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * H), M.gem);
  gem.position.set(0, 0.05 * H, 0.03 * H);
  necks[2].head.add(gem);
  for (const n of necks) {
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.018 * H, 0.008 * H, 0.01 * H), M.eye);
      e.position.set(0.028 * s * H, 0.012 * H, 0.06 * H);
      n.head.add(e);
    }
  }
  return { root, body: B.body, necks, head: necks[2].head, gem, mats: [mat], M, sculpt: 'hydra', skinned: sk.mesh };
}

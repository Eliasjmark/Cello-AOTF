// Elias skulpturer som spelfigurer (0.13).
//
// tools/models/build_models.py förenklar skulpturerna, målar dem i regioner och ger dem ett skelett.
// Allt ligger i models/pack.bin (i den fristående versionen inbakad som base64). Här:
//   · loadPack() läser paketet innan spelet startar
//   · skinnedModel(namn, palett) bygger en SkinnedMesh med ben som heter som delarna i de byggda figurerna
//     (hips, torso, head, armL, elbowL ...). Då kan samma animationskod röra både de gamla och de nya figurerna:
//     ett ben med rotationen 0 hänger rakt ner, precis som en arm i de byggda figurerna.
//   · Färgerna väljs per figur: varje hörn har en region (hud, hår, tunika ...) och en ljushet (skuggor i skrymslen).
import * as THREE from 'three';

const pad4 = (n) => (n + 3) & ~3;
const models = new Map();
export const PACK = { ok: false, models };

function str16(dv, o) {
  let s = '';
  for (let i = 0; i < 16; i++) {
    const c = dv.getUint8(o + i);
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function parseModel(buf, base) {
  const dv = new DataView(buf, base);
  if (str16(dv, 0).slice(0, 4) !== 'CSK1') throw new Error('Not a CSK1 model');
  const nv = dv.getUint32(4, true), ni = dv.getUint32(8, true), isz = dv.getUint32(12, true);
  const nb = dv.getUint32(16, true), nr = dv.getUint32(20, true);
  const lo = [0, 1, 2].map((i) => dv.getFloat32(24 + i * 4, true));
  const hi = [0, 1, 2].map((i) => dv.getFloat32(36 + i * 4, true));
  let o = 48;
  const regions = [];
  for (let i = 0; i < nr; i++, o += 16) regions.push(str16(dv, o));
  const bones = [];
  for (let i = 0; i < nb; i++) {
    const name = str16(dv, o);
    const parent = dv.getInt32(o + 16, true);
    const pos = [0, 1, 2].map((k) => dv.getFloat32(o + 20 + k * 4, true));
    const q = [0, 1, 2, 3].map((k) => dv.getFloat32(o + 32 + k * 4, true));
    bones.push({ name, parent, pos, q });
    o += 48;
  }
  const q = new Uint16Array(buf, base + o, nv * 3); o += pad4(nv * 6);
  const region = new Uint8Array(buf, base + o, nv); o += pad4(nv);
  const shade = new Uint8Array(buf, base + o, nv); o += pad4(nv);
  let bidx = null, bw = null;
  if (nb) {
    bidx = new Uint8Array(buf, base + o, nv * 2); o += pad4(nv * 2);
    bw = new Uint8Array(buf, base + o, nv); o += pad4(nv);
  }
  const index = isz === 2 ? new Uint16Array(buf, base + o, ni) : new Uint32Array(buf, base + o, ni);
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) {
    const k = i % 3;
    pos[i] = lo[k] + (q[i] / 65535) * (hi[k] - lo[k]);
  }
  return { nv, regions, bones, pos, region, shade, bidx, bw, index: index.slice() };
}

function parsePack(buf) {
  const dv = new DataView(buf);
  if (str16(dv, 0).slice(0, 4) !== 'CPK1') throw new Error('Not a model pack');
  const n = dv.getUint32(4, true);
  for (let i = 0; i < n; i++) {
    const o = 8 + i * 24;
    const name = str16(dv, o);
    const off = dv.getUint32(o + 16, true);
    models.set(name, parseModel(buf, off));
  }
  PACK.ok = models.size > 0;
}

// Läser paketet. Går det inte (t.ex. utan server) startar spelet ändå, med de byggda figurerna.
export async function loadPack(url = 'models/pack.bin') {
  try {
    let buf;
    if (window.CELLO_PACK_B64) {
      const bin = atob(window.CELLO_PACK_B64);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      buf = u.buffer;
    } else {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      buf = await r.arrayBuffer();
    }
    parsePack(buf);
  } catch (err) {
    console.warn('Model pack not loaded, using the built figures', err);
  }
  return PACK.ok;
}

export const hasModel = (name) => models.has(name);

const _c = new THREE.Color();
// Färgerna: palett (regionnamn → färg) gånger hörnets ljushet
function fillColors(md, palette, attr) {
  const cols = md.regions.map((r) => new THREE.Color(palette[r] ?? palette.default ?? 0xff00ff));
  const a = attr.array;
  for (let i = 0; i < md.nv; i++) {
    const c = cols[md.region[i]] ?? cols[0];
    const s = md.shade[i] / 200;
    a[i * 3] = c.r * s; a[i * 3 + 1] = c.g * s; a[i * 3 + 2] = c.b * s;
  }
  attr.needsUpdate = true;
}

export function modelGeometry(name, palette) {
  const md = models.get(name);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(md.pos.slice(), 3));
  g.setIndex(new THREE.BufferAttribute(md.index, 1));
  g.computeVertexNormals();
  const col = new THREE.BufferAttribute(new Float32Array(md.nv * 3), 3);
  g.setAttribute('color', col);
  fillColors(md, palette, col);
  if (md.bones.length) {
    const si = new Uint16Array(md.nv * 4), sw = new Float32Array(md.nv * 4);
    for (let i = 0; i < md.nv; i++) {
      si[i * 4] = md.bidx[i * 2]; si[i * 4 + 1] = md.bidx[i * 2 + 1];
      const w = md.bw[i] / 255;
      sw[i * 4] = w; sw[i * 4 + 1] = 1 - w;
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  }
  g.computeBoundingSphere();
  g.userData.recolor = (pal) => fillColors(md, pal, col);
  return g;
}

export function modelMaterial() {
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

// En SkinnedMesh med benen. Returnerar { mesh, bones: { namn: Bone }, roots: [Bone], recolor(palett) }.
// Benen står i "kodens viloställning": rotation 0 överallt (armar och ben hänger rakt ner).
export function skinnedModel(name, palette, material = modelMaterial()) {
  const md = models.get(name);
  const g = modelGeometry(name, palette);
  const mesh = new THREE.SkinnedMesh(g, material);
  const bones = [], byName = {}, roots = [];
  const wq = [], wp = [];
  for (const b of md.bones) {
    const bone = new THREE.Bone();
    bone.name = b.name;
    const q = new THREE.Quaternion(b.q[0], b.q[1], b.q[2], b.q[3]);
    const p = new THREE.Vector3(...b.pos);
    wq.push(q); wp.push(p);
    if (b.parent >= 0) {
      const pq = wq[b.parent].clone().invert();
      bone.position.copy(p).sub(wp[b.parent]).applyQuaternion(pq);
      bone.quaternion.copy(pq).multiply(q);
      bones[b.parent].add(bone);
    } else {
      bone.position.copy(p);
      bone.quaternion.copy(q);
      roots.push(bone);
    }
    bones.push(bone);
    byName[b.name] = bone;
  }
  const holder = new THREE.Group();
  holder.add(mesh);
  for (const r of roots) holder.add(r);
  holder.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  // Kodens viloställning: alla rotationer 0
  for (const b of bones) b.quaternion.identity();
  for (const r of roots) holder.remove(r);
  holder.remove(mesh);
  mesh.frustumCulled = false;
  return { mesh, bones: byName, roots, recolor: (pal) => g.userData.recolor(pal) };
}

// En stel modell (svärdet m.m.) som vanlig Mesh
export function rigidModel(name, palette, material = modelMaterial()) {
  return new THREE.Mesh(modelGeometry(name, palette), material);
}

// Mjuka, runda lemmar (som en svarvad pinne): profil = [[y, radie], ...] från toppen och nedåt
export function limb(profile, color, seg = 10, sz = 1) {
  // slutna ändar: profilen börjar och slutar i mitten
  const full = [[profile[0][0], 0], ...profile, [profile[profile.length - 1][0], 0]];
  const pts = full.map(([y, r]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const g = new THREE.LatheGeometry(pts.reverse(), seg);
  if (sz !== 1) g.scale(1, 1, sz);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
}

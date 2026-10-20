// Cellos hjältemodell (modellen Elias skickade, 0.9): läser den kompakta binärfilen CHM1 som tools/hero/paint.py skriver.
//   'CHM1', antal hörn, antal index, indexstorlek (2 eller 4), min[3], max[3]
//   positioner som u16 × 3 (kvantiserade mellan min och max), färger som u8 × 3, index
import * as THREE from 'three';

const pad4 = (n) => (n + 3) & ~3;

export function parseHero(buf) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'CHM1') throw new Error('Not a hero model');
  const nv = dv.getUint32(4, true), ni = dv.getUint32(8, true), isz = dv.getUint32(12, true);
  const lo = [0, 1, 2].map((i) => dv.getFloat32(16 + i * 4, true));
  const hi = [0, 1, 2].map((i) => dv.getFloat32(28 + i * 4, true));
  let o = 40;
  const q = new Uint16Array(buf, o, nv * 3);
  o += pad4(nv * 6);
  const c8 = new Uint8Array(buf, o, nv * 3);
  o += pad4(nv * 3);
  const idx = isz === 2 ? new Uint16Array(buf, o, ni) : new Uint32Array(buf, o, ni);
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) {
    const k = i % 3;
    pos[i] = lo[k] + (q[i] / 65535) * (hi[k] - lo[k]);
    // sRGB-färgerna i filen görs linjära för renderaren
    const s = c8[i] / 255;
    col[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

// Hämtar modellen. Den fristående versionen (build/play.html) har modellen inbakad som base64,
// annars hämtas filen bredvid spelet.
export async function loadHero(url = 'models/cello-hero.bin') {
  const b64 = globalThis.CELLO_HERO_B64;
  if (b64) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return parseHero(bytes.buffer);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hero model: ${res.status}`);
  return parseHero(await res.arrayBuffer());
}

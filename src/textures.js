// Procedurella texturer i låg upplösning (32x32) för retrokänslan.
// Allt ritas med kod, så projektet behöver inga bildfiler än.
import * as THREE from 'three';

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

function canvasTexture(size, seed, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, mulberry(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noisyFill(g, size, rand, [r, gg, b], spread) {
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const k = (rand() - 0.5) * 2 * spread;
    img.data[i * 4] = clamp255(r + k);
    img.data[i * 4 + 1] = clamp255(gg + k);
    img.data[i * 4 + 2] = clamp255(b + k * 0.9);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

function walk(g, size, rand, steps, color, dir = [1, 0]) {
  let x = rand() * size, y = rand() * size;
  g.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    g.fillRect(Math.floor(x) % size, Math.floor(y) % size, 1, 1);
    x = (x + dir[0] + (rand() - 0.5) * 1.6 + size) % size;
    y = (y + dir[1] + (rand() - 0.5) * 1.6 + size) % size;
  }
}

export function createTextures() {
  // 0.13: gräsmarken: olivgrönt med mossa, torra strån och fläckar av jord
  const grass = canvasTexture(64, 11, (g, s, r) => {
    noisyFill(g, s, r, [62, 74, 40], 10);
    // mjuka fläckar: mossa (mörkare, grönare) och torrt gräs (gulare)
    for (let i = 0; i < 14; i++) {
      const x = r() * s, y = r() * s, rad = 4 + r() * 9;
      const kind = r();
      const col = kind < 0.45 ? 'rgba(44,62,30,0.35)' : kind < 0.8 ? 'rgba(112,110,58,0.28)' : 'rgba(92,72,46,0.32)';
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, col);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    // strån
    for (let i = 0; i < 170; i++) {
      const t = r();
      g.fillStyle = t < 0.4 ? 'rgba(104,120,62,0.85)' : t < 0.75 ? 'rgba(40,52,28,0.85)' : 'rgba(132,126,70,0.75)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 2 + Math.floor(r() * 3));
    }
    // små stenar och jord
    for (let i = 0; i < 10; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(96,84,66,0.8)' : 'rgba(70,58,44,0.8)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 1);
    }
  });

  const rock = canvasTexture(32, 23, (g, s, r) => {
    noisyFill(g, s, r, [86, 82, 78], 12);
    for (let i = 0; i < 4; i++) walk(g, s, r, 12, 'rgba(38,36,35,0.85)', [0.6, 0.8]);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = 'rgba(130,126,120,0.6)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 1);
    }
  });

  const cliff = canvasTexture(32, 37, (g, s, r) => {
    noisyFill(g, s, r, [60, 57, 58], 10);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(28,26,30,0.55)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 5 + Math.floor(r() * 10));
    }
    g.fillStyle = 'rgba(96,92,90,0.35)';
    for (let y = 3; y < s; y += 9) g.fillRect(0, y, s, 1);
  });

  const marble = canvasTexture(32, 41, (g, s, r) => {
    noisyFill(g, s, r, [178, 176, 170], 6);
    for (let i = 0; i < 3; i++) walk(g, s, r, 30, 'rgba(118,116,124,0.55)', [0.9, 0.5]);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(88,88,84,0.22)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 2);
    }
  });

  const brick = canvasTexture(32, 53, (g, s, r) => {
    noisyFill(g, s, r, [72, 74, 80], 8);
    g.fillStyle = 'rgb(42,43,48)';
    for (let y = 0; y < s; y += 8) {
      g.fillRect(0, y, s, 1);
      const off = (y / 8) % 2 ? 8 : 0;
      for (let x = off; x < s; x += 16) g.fillRect(x, y, 1, 8);
    }
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(62,84,52,0.45)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 1);
    }
  });

  const wood = canvasTexture(32, 67, (g, s, r) => {
    noisyFill(g, s, r, [94, 69, 46], 8);
    for (let y = 1; y < s; y += 3 + Math.floor(r() * 3)) {
      g.fillStyle = 'rgba(58,40,27,0.6)';
      g.fillRect(Math.floor(r() * 6), y, s - Math.floor(r() * 8), 1);
    }
    g.fillStyle = 'rgba(40,28,20,0.9)';
    g.fillRect(0, 0, s, 1);
  });

  // 0.13: högre, tätare tuvor med ljusare toppar
  const tuft = (() => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 64;
    const g = c.getContext('2d');
    const r = mulberry(79);
    const cols = [[78, 98, 50], [62, 82, 42], [100, 116, 60], [54, 70, 38], [118, 120, 66]];
    for (let i = 0; i < 16; i++) {
      const x0 = 3 + r() * 26, xt = x0 + (r() - 0.5) * 14, yt = 2 + r() * 26;
      const cc = cols[i % cols.length];
      const gr = g.createLinearGradient(0, 64, 0, yt);
      gr.addColorStop(0, `rgb(${cc[0] * 0.55 | 0},${cc[1] * 0.55 | 0},${cc[2] * 0.55 | 0})`);
      gr.addColorStop(1, `rgb(${Math.min(255, cc[0] * 1.25) | 0},${Math.min(255, cc[1] * 1.2) | 0},${cc[2]})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x0 - 1.7, 64);
      g.quadraticCurveTo((x0 + xt) / 2 + (r() - 0.5) * 4, (64 + yt) / 2, xt, yt);
      g.lineTo(x0 + 1.7, 64);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // Golvmosaik i amfiteatern: ringar och ett enkelt meandermönster
  const mosaic = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = mulberry(91);
    const cols = ['#8a7f6e', '#6d5a45', '#9b5b3a', '#3e3a36', '#b3a78f'];
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        const band = Math.floor(d / 4);
        let col = cols[band % cols.length];
        if (band === 5 && ((Math.floor(Math.atan2(y - 31.5, x - 31.5) * 6) & 1) === 0)) col = '#2f2b28';
        if (d > 31.5) col = '#6d6559';
        g.fillStyle = col;
        g.globalAlpha = 0.82 + r() * 0.18;
        g.fillRect(x, y, 1, 1);
      }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // Stentavlor med inristade tecken till Lyras arkiv
  const runes = canvasTexture(32, 101, (g, s, r) => {
    noisyFill(g, s, r, [150, 146, 136], 8);
    g.fillStyle = 'rgb(70,64,58)';
    for (let row = 3; row < s - 3; row += 6) {
      for (let x = 3; x < s - 4; x += 4 + Math.floor(r() * 2)) {
        const kind = Math.floor(r() * 4);
        if (kind === 0) g.fillRect(x, row, 1, 4);
        else if (kind === 1) { g.fillRect(x, row, 3, 1); g.fillRect(x + 1, row, 1, 4); }
        else if (kind === 2) { g.fillRect(x, row, 1, 4); g.fillRect(x, row + 3, 3, 1); }
        else { g.fillRect(x, row + 1, 3, 1); g.fillRect(x, row + 3, 3, 1); }
      }
    }
  });

  const charred = canvasTexture(32, 113, (g, s, r) => {
    noisyFill(g, s, r, [42, 34, 30], 8);
    for (let y = 1; y < s; y += 3) {
      g.fillStyle = 'rgba(14,10,9,0.7)';
      g.fillRect(0, y, s, 1);
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(255,110,40,0.55)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 1);
    }
  });

  // Bastionens mörka järnplåtar med nitar och rostränder
  const iron = canvasTexture(32, 131, (g, s, r) => {
    noisyFill(g, s, r, [50, 52, 60], 7);
    // En stor plåt per ruta, med fogar, nitar i hörnen och en och annan rostrand
    g.fillStyle = 'rgb(30,31,37)';
    g.fillRect(0, 0, s, 1);
    g.fillRect(0, 0, 1, s);
    g.fillStyle = 'rgba(70,72,82,0.6)';
    g.fillRect(1, 1, s - 1, 1);
    for (const [x, y] of [[3, 3], [s - 5, 3], [3, s - 5], [s - 5, s - 5], [s / 2 - 1, 3], [s / 2 - 1, s - 5]]) {
      g.fillStyle = 'rgb(88,90,100)';
      g.fillRect(x, y, 2, 2);
      if (r() < 0.35) {
        g.fillStyle = 'rgba(118,62,34,0.35)';
        g.fillRect(x, y + 2, 1, 3 + Math.floor(r() * 6));
      }
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle = `rgba(${90 + Math.floor(r() * 30)},${48 + Math.floor(r() * 10)},30,0.18)`;
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 3 + Math.floor(r() * 5), 2 + Math.floor(r() * 4));
    }
  });

  const ironFloor = canvasTexture(32, 137, (g, s, r) => {
    noisyFill(g, s, r, [44, 44, 50], 6);
    g.fillStyle = 'rgb(28,28,33)';
    for (let k = 0; k < s; k += 8) g.fillRect(k, 0, 1, s);
    for (let k = 0; k < s; k += 16) g.fillRect(0, k, s, 1);
    g.fillStyle = 'rgba(70,72,82,0.7)';
    for (let y = 3; y < s; y += 8) for (let x = 3; x < s; x += 8) g.fillRect(x, y, 2, 1);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(110,60,34,0.4)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2 + Math.floor(r() * 3), 1);
    }
  });

  // Spräckta stenplattor (golvet som brister under tung vikt)
  const cracked = canvasTexture(32, 149, (g, s, r) => {
    noisyFill(g, s, r, [96, 90, 84], 10);
    g.fillStyle = 'rgb(44,40,38)';
    g.fillRect(0, 0, s, 1);
    g.fillRect(0, 0, 1, s);
    for (let i = 0; i < 5; i++) walk(g, s, r, 22, 'rgba(30,26,24,0.9)', [r() > 0.5 ? 0.9 : -0.9, 0.6]);
  });

  // ---- 0.6: hela byar, vägar och fältet ----
  // Jordväg med hjulspår och småsten
  const dirt = canvasTexture(32, 163, (g, s, r) => {
    noisyFill(g, s, r, [104, 86, 62], 10);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(70,56,40,0.7)' : 'rgba(140,122,94,0.6)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1 + Math.floor(r() * 2), 1);
    }
    g.fillStyle = 'rgba(66,52,38,0.35)';
    g.fillRect(8, 0, 2, s);
    g.fillRect(22, 0, 2, s);
  });

  // Putsade väggar (vitkalkade hus i Willowmere och på ranchen)
  const plaster = canvasTexture(32, 171, (g, s, r) => {
    noisyFill(g, s, r, [196, 186, 164], 7);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(150,140,120,0.35)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 3 + Math.floor(r() * 4), 2);
    }
  });

  // Takspån i rader (färgas av materialet)
  const shingle = canvasTexture(32, 181, (g, s, r) => {
    noisyFill(g, s, r, [196, 196, 196], 10);
    g.fillStyle = 'rgba(40,40,40,0.55)';
    for (let y = 0; y < s; y += 6) {
      g.fillRect(0, y, s, 1);
      const off = (y / 6) % 2 ? 4 : 0;
      for (let x = off; x < s; x += 8) g.fillRect(x, y, 1, 6);
    }
  });

  // Kullersten för torg och gångar
  const cobble = canvasTexture(32, 191, (g, s, r) => {
    noisyFill(g, s, r, [70, 68, 64], 6);
    for (let y = 0; y < s; y += 8) {
      for (let x = (y / 8) % 2 ? 4 : 0; x < s + 8; x += 8) {
        const c = 104 + Math.floor(r() * 30);
        g.fillStyle = `rgb(${c},${c - 4},${c - 10})`;
        g.fillRect((x + 1) % s, y + 1, 6, 6);
      }
    }
  });

  // Hö och halm
  const hay = canvasTexture(32, 197, (g, s, r) => {
    noisyFill(g, s, r, [176, 148, 82], 12);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(214,186,110,0.8)' : 'rgba(120,96,48,0.7)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 4 + Math.floor(r() * 5), 1);
    }
  });

  // Lövverk (färgas av materialet)
  const leaf = canvasTexture(32, 211, (g, s, r) => {
    noisyFill(g, s, r, [170, 176, 160], 18);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(230,236,210,0.6)' : 'rgba(80,90,70,0.6)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 2);
    }
  });

  // Bark
  const bark = canvasTexture(32, 223, (g, s, r) => {
    noisyFill(g, s, r, [84, 66, 52], 10);
    for (let x = 0; x < s; x += 3 + Math.floor(r() * 3)) {
      g.fillStyle = 'rgba(44,34,26,0.7)';
      g.fillRect(x, 0, 1, s);
    }
  });

  // Plankgolv inomhus
  const floor = canvasTexture(32, 229, (g, s, r) => {
    noisyFill(g, s, r, [112, 82, 56], 8);
    g.fillStyle = 'rgba(54,38,26,0.85)';
    for (let y = 0; y < s; y += 8) {
      g.fillRect(0, y, s, 1);
      g.fillRect((y * 3) % s, y, 1, 8);
    }
  });

  // Vatten: ljusa stråk på mörkt
  const water = canvasTexture(32, 239, (g, s, r) => {
    noisyFill(g, s, r, [58, 72, 84], 5);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(150,176,190,0.5)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 3 + Math.floor(r() * 5), 1);
    }
  });

  // ---- 0.7: öknen och pyramiden ----
  // Sand med vindrippel
  const sand = canvasTexture(32, 251, (g, s, r) => {
    noisyFill(g, s, r, [196, 160, 104], 9);
    for (let y = 0; y < s; y += 4) {
      g.fillStyle = 'rgba(150,112,64,0.45)';
      for (let x = 0; x < s; x++) {
        const yy = y + Math.round(Math.sin((x / s) * Math.PI * 2 + y * 0.7) * 1.2);
        g.fillRect(x, (yy + s) % s, 1, 1);
      }
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle = 'rgba(235,206,150,0.5)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 1);
    }
  });
  // Sandsten i stora block (pyramidens väggar och golv)
  const sandstone = canvasTexture(32, 257, (g, s, r) => {
    noisyFill(g, s, r, [176, 140, 92], 8);
    g.fillStyle = 'rgba(96,70,40,0.7)';
    for (let y = 0; y < s; y += 8) {
      g.fillRect(0, y, s, 1);
      const off = (y / 8) % 2 ? 8 : 0;
      for (let x = off; x < s; x += 16) g.fillRect(x, y, 1, 8);
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(120,90,56,0.4)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 1);
    }
  });
  // Hieroglyfer inristade i sandsten
  const hiero = canvasTexture(32, 263, (g, s, r) => {
    noisyFill(g, s, r, [170, 134, 88], 6);
    g.fillStyle = 'rgba(90,64,36,0.85)';
    g.fillRect(0, 0, s, 1);
    g.fillRect(0, 16, s, 1);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 2; row++) {
        const x0 = col * 8 + 2, y0 = row * 16 + 3;
        const k = Math.floor(r() * 5);
        if (k === 0) { g.fillRect(x0 + 1, y0, 2, 9); g.fillRect(x0, y0 + 2, 4, 1); } // ankh-stam
        else if (k === 1) { g.fillRect(x0, y0 + 3, 4, 4); g.fillStyle = 'rgba(170,134,88,1)'; g.fillRect(x0 + 1, y0 + 4, 2, 2); g.fillStyle = 'rgba(90,64,36,0.85)'; } // öga
        else if (k === 2) { for (let w = 0; w < 4; w++) g.fillRect(x0 + w, y0 + 2 + (w % 2), 1, 1); g.fillRect(x0, y0 + 6, 4, 1); } // vatten
        else if (k === 3) { g.fillRect(x0, y0 + 8, 4, 1); g.fillRect(x0 + 1, y0 + 4, 2, 4); g.fillRect(x0 + 2, y0 + 2, 1, 2); } // fågel
        else { g.fillRect(x0, y0 + 1, 4, 1); g.fillRect(x0, y0 + 9, 4, 1); g.fillRect(x0 + 1, y0 + 2, 2, 7); }
      }
    }
  });

  return {
    grass, rock, cliff, marble, brick, wood, tuft, mosaic, runes, charred, iron, ironFloor, cracked,
    dirt, plaster, shingle, cobble, hay, leaf, bark, floor, water, sand, sandstone, hiero,
  };
}

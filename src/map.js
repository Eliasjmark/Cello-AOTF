// Kartan (K): i fästningen visas rummen som Cello har besökt, och med Bastionens karta
// även resten, med kistor och dörrar. Utanför visas en enkel karta över öarna.
const COL = {
  bg: '#0c0f15', ink: '#ebe6d8', dim: '#6b717b', faint: '#2a2f38', room: '#1f2630', visited: '#2c3644',
  here: '#3a4a5e', gold: '#c9a24f', storm: '#9ec8ee', red: '#d8382f', grass: '#2f3b2c', rock: '#3a3833',
};

export class MapView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  size() {
    const c = this.canvas, r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return { w, h, dpr };
  }

  // Avbildar världens x/z på kartan så att rutan [x0,x1]×[z0,z1] får plats
  fit(x0, x1, z0, z1, w, h, pad) {
    const s = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0));
    const ox = (w - (x1 - x0) * s) / 2 - x0 * s, oz = (h - (z1 - z0) * s) / 2 - z0 * s;
    return { s, X: (x) => ox + x * s, Z: (z) => oz + z * s };
  }

  arrow(g, x, y, facing, size, color) {
    g.save();
    g.translate(x, y);
    // facing 0 = mot +z (nedåt på kartan)
    g.rotate(-facing);
    g.beginPath();
    g.moveTo(0, size);
    g.lineTo(size * 0.62, -size * 0.6);
    g.lineTo(0, -size * 0.25);
    g.lineTo(-size * 0.62, -size * 0.6);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.lineWidth = Math.max(1, size * 0.15);
    g.strokeStyle = '#000';
    g.stroke();
    g.restore();
  }

  drawBastion(b, player) {
    const { w, h, dpr } = this.size();
    const g = this.ctx;
    g.clearRect(0, 0, w, h);
    const s = b.state, R = b.rooms;
    const known = (id) => s.visited.includes(id) || s.map;
    const basement = player.feet.y < -2.5 && b.inside(player.feet);
    // Huvudvåningen till vänster, källaren som en liten ruta till höger
    const main = this.fit(-37, 37, -231, -142, w * 0.78, h, 18 * dpr);
    const T = main;
    g.lineJoin = 'round';
    const rect = (r, M, fill, stroke, lw = 1.5) => {
      const x = M.X(r.x0), y = M.Z(r.z0), ww = (r.x1 - r.x0) * M.s, hh = (r.z1 - r.z0) * M.s;
      g.fillStyle = fill;
      g.fillRect(x, y, ww, hh);
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw * dpr; g.strokeRect(x, y, ww, hh); }
    };
    for (const [id, r] of Object.entries(R)) {
      if (id === 'R8' || id === 'F') continue;
      if (!known(id)) continue;
      const visited = s.visited.includes(id);
      const here = b.room === id && !basement;
      const fill = here ? COL.here : visited ? COL.visited : COL.room;
      const stroke = visited ? COL.gold : COL.dim;
      if (id === 'R9') {
        g.beginPath();
        g.arc(T.X(r.cx), T.Z(r.cz), r.r * T.s, 0, Math.PI * 2);
        g.fillStyle = fill;
        g.fill();
        g.strokeStyle = stroke;
        g.lineWidth = 1.5 * dpr;
        g.stroke();
        if (!s.cleared.boss && s.map) this.skull(g, T.X(r.cx), T.Z(r.cz), 9 * dpr);
        continue;
      }
      rect(r, T, fill, stroke);
      if (id === 'R5') {
        // Klyftan och bryggan
        g.fillStyle = COL.bg;
        g.fillRect(T.X(14), T.Z(-168), 16 * T.s, 18 * T.s);
        g.fillStyle = visited ? '#4a5462' : '#323842';
        g.fillRect(T.X(14), T.Z(-159.8), 16 * T.s, 1.6 * T.s);
      }
      if (id === 'R7' && s.solved.crack) {
        g.fillStyle = COL.bg;
        g.fillRect(T.X(20), T.Z(-192), 10 * T.s, 12 * T.s);
      }
    }
    // Förgården
    if (known('R1')) {
      g.strokeStyle = COL.dim;
      g.setLineDash([3 * dpr, 3 * dpr]);
      g.lineWidth = 1 * dpr;
      g.strokeRect(T.X(-12), T.Z(-150), 24 * T.s, 7 * T.s);
      g.setLineDash([]);
    }
    // Dörrar
    for (const d of Object.values(b.doors)) {
      const sides = [d.neg, d.pos].filter((x) => x && R[x]);
      if (!sides.some((id) => known(id))) continue;
      const open = d.slabTarget > 1 && d.barsTarget > 1;
      const x = T.X(d.x), y = T.Z(d.z), L = 2.4 * T.s, W = Math.max(3 * dpr, 0.8 * T.s);
      g.fillStyle = open ? COL.visited : d.type === 'boss' ? COL.red : d.type === 'key' ? COL.gold : d.type === 'circuit' ? COL.storm : COL.dim;
      if (open) g.fillStyle = COL.here;
      if (d.axis === 'x') g.fillRect(x - W / 2, y - L / 2, W, L);
      else g.fillRect(x - L / 2, y - W / 2, L, W);
    }
    // Kistor (med kartan, eller i rum Cello har sett)
    for (const c of Object.values(b.chests)) {
      if (c.room === 'R8') continue;
      if (!(s.map || s.visited.includes(c.room)) || !c.g.visible) continue;
      this.chest(g, T.X(c.x), T.Z(c.z), 5 * dpr, c.open, c.big);
    }
    // Källaren
    const showBase = known('R8');
    const bx = w * 0.79, bw = w * 0.19, by = h * 0.36, bh = bw * 1.0;
    g.font = `${11 * dpr}px "Barlow Semi Condensed", sans-serif`;
    g.fillStyle = COL.dim;
    g.textAlign = 'center';
    g.fillText('CELLAR', bx + bw / 2, by - 8 * dpr);
    g.strokeStyle = COL.faint;
    g.lineWidth = 1 * dpr;
    g.strokeRect(bx, by, bw, bh);
    const BX = (x) => bx + (x - 14) / 22 * bw, BZ = (z) => by + (z + 197) / 22 * bh, bs = bw / 22;
    if (showBase) {
      const visited = s.visited.includes('R8');
      g.fillStyle = basement ? COL.here : visited ? COL.visited : COL.room;
      g.fillRect(BX(15), BZ(-196), 20 * bs, 20 * bs);
      g.strokeStyle = visited ? COL.gold : COL.dim;
      g.lineWidth = 1.5 * dpr;
      g.strokeRect(BX(15), BZ(-196), 20 * bs, 20 * bs);
      // Rampen upp till luckan
      g.fillStyle = s.solved.hatch ? COL.storm : COL.dim;
      g.fillRect(BX(17.5), BZ(-195.2), 15.5 * bs, 2.4 * bs);
      const c = b.chests.cBoss;
      this.chest(g, BX(c.x), BZ(c.z), 5 * dpr, c.open, true);
    } else {
      g.fillStyle = COL.faint;
      g.fillText('?', bx + bw / 2, by + bh / 2);
    }
    // Cello
    const p = player.feet;
    if (basement) this.arrow(g, BX(p.x), BZ(p.z), player.facing, 7 * dpr, COL.ink);
    else if (b.inside(p)) this.arrow(g, T.X(p.x), T.Z(p.z), player.facing, 7 * dpr, COL.ink);
    // Rubrik och föremål
    g.textAlign = 'left';
    g.fillStyle = COL.ink;
    g.font = `700 ${15 * dpr}px Cinzel, serif`;
    g.fillText('The Tempest Bastion', 14 * dpr, 24 * dpr);
    g.font = `${12 * dpr}px "Barlow Semi Condensed", sans-serif`;
    g.fillStyle = COL.dim;
    const items = [`Keys: ${s.keys}`, s.map ? 'Map ✓' : 'No map', s.bossKey ? 'Storm Key ✓' : ''].filter(Boolean);
    g.fillText(items.join('   ·   '), 14 * dpr, 42 * dpr);
  }

  chest(g, x, y, r, open, big) {
    g.fillStyle = open ? COL.dim : big ? COL.red : COL.gold;
    g.fillRect(x - r, y - r * 0.7, r * 2, r * 1.4);
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.strokeRect(x - r, y - r * 0.7, r * 2, r * 1.4);
  }

  skull(g, x, y, r) {
    g.fillStyle = COL.ink;
    g.beginPath();
    g.arc(x, y - r * 0.15, r * 0.7, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x - r * 0.4, y + r * 0.3, r * 0.8, r * 0.45);
    g.fillStyle = COL.bg;
    g.beginPath();
    g.arc(x - r * 0.27, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
    g.arc(x + r * 0.27, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
    g.fill();
  }

  // Kartan över området Cello är i, och en liten översikt över hela riket i hörnet
  drawArea(areas, story, player) {
    const { w, h, dpr } = this.size();
    const g = this.ctx;
    g.clearRect(0, 0, w, h);
    const a = areas.cur, st = story.state;
    const font = (px, weight = '') => `${weight} ${px * dpr}px "Barlow Semi Condensed", sans-serif`;
    const interior = a.indoor && a.id !== 'cave';
    if (!interior && a.bounds) {
      const b = a.bounds;
      const T = this.fit(b.x0, b.x1, b.z0, b.z1, w * 0.74, h, 26 * dpr);
      const poly = (pts) => {
        g.beginPath();
        pts.forEach(([x, z], i) => (i ? g.lineTo(T.X(x), T.Z(z)) : g.moveTo(T.X(x), T.Z(z))));
        g.closePath();
      };
      for (const isl of a.map.islands) {
        poly(isl.outline);
        g.fillStyle = isl.col ?? (a.dark ? '#26242a' : COL.grass);
        g.fill();
        g.strokeStyle = COL.dim;
        g.lineWidth = 1 * dpr;
        g.stroke();
      }
      // Grottans gångar och salar
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const l of a.map.lines) {
        if (l.kind !== 'tunnel') continue;
        g.strokeStyle = '#2e2c30';
        g.lineWidth = Math.max(4 * dpr, l.w * T.s);
        g.beginPath();
        l.pts.forEach(([x, z], i) => (i ? g.lineTo(T.X(x), T.Z(z)) : g.moveTo(T.X(x), T.Z(z))));
        g.stroke();
      }
      for (const hl of a.map.halls || []) {
        g.beginPath();
        g.arc(T.X(hl.x), T.Z(hl.z), hl.r * T.s, 0, Math.PI * 2);
        g.fillStyle = '#2e2c30';
        g.fill();
      }
      g.lineCap = 'butt';
      for (const r of a.map.rects) {
        if (r.kind === 'water') {
          g.beginPath();
          g.ellipse(T.X(r.x), T.Z(r.z), r.rx * T.s, r.rz * T.s, 0, 0, Math.PI * 2);
          g.fillStyle = '#34485a';
          g.fill();
        }
      }
      for (const l of a.map.lines) {
        if (l.kind === 'tunnel' || (l.when && !st[l.when])) continue;
        g.strokeStyle = l.kind === 'road' ? '#6a5640' : l.kind === 'bridge' ? '#8a6a44' : COL.storm;
        g.lineWidth = (l.kind === 'road' ? 2.6 : 2.2) * dpr;
        g.setLineDash(l.kind === 'stones' ? [3 * dpr, 4 * dpr] : []);
        g.beginPath();
        l.pts.forEach(([x, z], i) => (i ? g.lineTo(T.X(x), T.Z(z)) : g.moveTo(T.X(x), T.Z(z))));
        g.stroke();
        g.setLineDash([]);
      }
      for (const r of a.map.rects) {
        if (r.kind !== 'house') continue;
        g.save();
        g.translate(T.X(r.x), T.Z(r.z));
        g.rotate(-r.ry);
        g.fillStyle = '#5a4a3e';
        g.fillRect(-r.w / 2 * T.s, -r.d / 2 * T.s, r.w * T.s, r.d * T.s);
        g.restore();
      }
      g.textAlign = 'center';
      for (const isl of a.map.islands) {
        if (!isl.label || isl.r * T.s < 30 * dpr) continue;
        g.fillStyle = 'rgba(235,230,216,0.55)';
        g.font = font(12, 600);
        g.fillText(isl.label.toUpperCase(), T.X(isl.cx), T.Z(isl.cz) - isl.r * T.s * 0.55);
      }
      for (const p of a.map.pois) {
        if (p.when && !st[p.when]) continue;
        const x = T.X(p.x), y = T.Z(p.z);
        g.fillStyle = p.icon === 'fire' ? '#ff9a4a' : p.icon === 'shop' ? COL.gold : p.icon === 'seer' ? '#b08ad0' : p.icon === 'stone' ? COL.storm : COL.ink;
        g.beginPath();
        g.arc(x, y, 3.5 * dpr, 0, Math.PI * 2);
        g.fill();
        g.font = font(11);
        g.fillStyle = COL.ink;
        g.fillText(p.label, x, y - 7 * dpr);
      }
      for (const ex of a.map.exits || []) {
        if (ex.when && !st[ex.when]) continue;
        const x = T.X(ex.x), y = T.Z(ex.z);
        g.fillStyle = COL.gold;
        g.beginPath();
        g.arc(x, y, 4 * dpr, 0, Math.PI * 2);
        g.fill();
        g.font = font(11, 600);
        g.fillStyle = COL.gold;
        const known = areas.list[ex.to]?.visited;
        g.fillText(`→ ${known || !ex.to ? ex.label : '?'}`, x, y + 15 * dpr);
      }
      this.arrow(g, T.X(player.feet.x), T.Z(player.feet.z), player.facing, 7 * dpr, COL.ink);
    }
    // Rubrik
    g.textAlign = 'left';
    g.fillStyle = COL.ink;
    g.font = `700 ${16 * dpr}px Cinzel, serif`;
    g.fillText(a.name, 14 * dpr, 26 * dpr);
    g.font = font(12);
    g.fillStyle = COL.dim;
    g.fillText('The Shattered Realm', 14 * dpr, 44 * dpr);
    this.drawRealm(areas, story, interior ? { x: w * 0.25, y: h * 0.12, w: w * 0.5, h: h * 0.8 } : { x: w * 0.76, y: h * 0.1, w: w * 0.22, h: h * 0.84 });
  }

  // Översikten: områdena som en kedja, från Cellos hem i söder till fästningen i norr
  drawRealm(areas, story, box) {
    const g = this.ctx, dpr = Math.min(2, window.devicePixelRatio || 1);
    const N = {
      bastion: [0.1, 0.03, 'Tempest Bastion'], cave: [0.1, 0.15, 'Hollow Cave'], stormreach: [0.1, 0.27, 'Stormreach'],
      field: [0.1, 0.42, 'The Stormvale'], willowmere: [0.55, 0.34, 'Willowmere'], pass: [0.1, 0.57, 'Galewind Pass'],
      ranch: [0.1, 0.7, 'Thistledown'], village: [0.1, 0.84, 'Hollowbrook'], home: [0.1, 0.97, "Cello's Home"],
    };
    const parent = { shop: 'willowmere', house: 'home' };
    const here = parent[areas.id] ?? areas.id;
    const E = [['home', 'village'], ['village', 'ranch'], ['ranch', 'pass'], ['pass', 'field'], ['field', 'willowmere'], ['field', 'stormreach'], ['stormreach', 'cave'], ['cave', 'bastion']];
    const P = (id) => [box.x + N[id][0] * box.w, box.y + N[id][1] * box.h];
    g.fillStyle = 'rgba(12,15,21,0.75)';
    g.fillRect(box.x - 6 * dpr, box.y - 20 * dpr, box.w + 12 * dpr, box.h + 30 * dpr);
    g.strokeStyle = COL.faint;
    g.lineWidth = 1 * dpr;
    g.strokeRect(box.x - 6 * dpr, box.y - 20 * dpr, box.w + 12 * dpr, box.h + 30 * dpr);
    g.font = `600 ${10 * dpr}px "Barlow Semi Condensed", sans-serif`;
    g.fillStyle = COL.dim;
    g.textAlign = 'left';
    g.fillText('THE REALM', box.x, box.y - 7 * dpr);
    const vis = (id) => areas.list[id]?.visited;
    for (const [a, b] of E) {
      if (!vis(a) && !vis(b)) continue;
      const [x0, y0] = P(a), [x1, y1] = P(b);
      g.strokeStyle = vis(a) && vis(b) ? '#6a5640' : COL.faint;
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    for (const [id, [, , label]] of Object.entries(N)) {
      const [x, y] = P(id);
      const v = vis(id);
      g.beginPath();
      g.arc(x, y, (id === here ? 5.5 : 4) * dpr, 0, Math.PI * 2);
      g.fillStyle = id === here ? COL.gold : v ? COL.ink : COL.faint;
      g.fill();
      g.font = `${(id === here ? 12 : 11) * dpr}px "Barlow Semi Condensed", sans-serif`;
      g.fillStyle = id === here ? COL.gold : v ? COL.ink : COL.dim;
      g.textAlign = 'left';
      g.fillText(v ? label : '?', x + 9 * dpr, y + 4 * dpr);
    }
  }
}

// Områden: världen är uppdelad i platser som laddas vid gränserna.
// Varje område har en egen grupp med allt som syns, ett eget kollisionsträd (Octree),
// ingångar (där Cello hamnar när han kommer dit) och utgångar (lådor som leder vidare).
//
// Områdena ligger på olika ställen i samma koordinatsystem, så fiender, krukor och dörrar
// i ett område aldrig kan krocka med saker i ett annat. Bara det aktiva området ritas och uppdateras.
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';

export class Area {
  constructor(scene, def) {
    Object.assign(this, {
      name: '', sub: '',
      fog: { color: 0x323843, near: 34, far: 260 },
      light: { hemi: 1.5, moon: 1.25, flash: 1 },
      indoor: false, // inomhus: ingen blixt, inget molnhav
      dark: false, // mörkt: lyktan behövs
      safe: false, // inga fiender går in här
      card: true, // visa namnet första gången
    }, def);
    this.root = new THREE.Group();
    this.root.name = `area:${this.id}`;
    this.root.visible = false;
    scene.add(this.root);
    this.S = new THREE.Group(); // statiska föremål som slås ihop när området är byggt
    this.root.add(this.S);
    this.collision = new THREE.Group();
    this.octree = null;
    this.entries = {};
    this.exits = [];
    this.updaters = [];
    this.fires = [];
    this.map = { islands: [], lines: [], pois: [], rects: [] };
    this.tufts = [];
    this.planks = [];
    this.grass = null;
    this.visited = false;
    this.connectFns = [];
    this.enterFns = [];
    // 0.15: vatten att simma i: [{ x0, x1, z0, z1 } eller { x, z, r }, y: höjd eller () => höjd/null]
    this.waters = [];
    this.bubbles = []; // luftfickor och bubbelkällor: [{ x, y, z, r }]
    // 0.16: is ({ x, z, r } eller { x0, x1, z0, z1 }, y, kind: 'slick' | 'glide'), kyla och varma platser
    this.ices = [];
    this.cold = false;
    this.warm = []; // [{ x, z, r }]
  }

  // Vilken sorts is står Cello på (eller null)?
  iceAt(p) { return this.iceRegion(p)?.kind ?? null; }

  iceRegion(p) {
    for (const w of this.ices) {
      if (w.r !== undefined) { if ((p.x - w.x) ** 2 + (p.z - w.z) ** 2 > w.r * w.r) continue; }
      else if (p.x < w.x0 || p.x > w.x1 || p.z < w.z0 || p.z > w.z1) continue;
      if (w.y !== undefined && Math.abs(p.y - w.y) > 0.35) continue;
      if (w.on && !w.on()) continue;
      return w;
    }
    return null;
  }

  // Vattenytans höjd där Cello står, eller null
  waterAt(x, z) {
    let best = null;
    for (const w of this.waters) {
      if (w.r !== undefined) { if ((x - w.x) ** 2 + (z - w.z) ** 2 > w.r * w.r) continue; }
      else if (x < w.x0 || x > w.x1 || z < w.z0 || z > w.z1) continue;
      const y = typeof w.y === 'function' ? w.y() : w.y;
      if (y != null && (best === null || y > best)) best = y;
    }
    return best;
  }

  // Finns det luft att andas här (en luftficka eller en bubbelkälla)?
  airAt(p) {
    for (const b of this.bubbles) {
      if ((p.x - b.x) ** 2 + (p.z - b.z) ** 2 < b.r * b.r && p.y > b.y - b.r - 1.6 && p.y < b.y + b.r) return true;
    }
    return false;
  }

  // Kollisionsträdet byggs först när Cello kommer hit (eller när någon frågar efter marken)
  ensureOctree() {
    if (!this.octree) {
      const o = new Octree();
      o.fromGraphNode(this.collision);
      this.octree = o;
    }
    return this.octree;
  }

  entry(id) {
    return this.entries[id] || Object.values(this.entries)[0];
  }
}

export class Areas {
  constructor(scene, lights) {
    this.scene = scene;
    this.lights = lights;
    this.list = {};
    this.cur = null;
    this.collider = null;
    this.onActivate = null; // (area) – main.js byter dimma, ljus, fiender och krukor
  }

  create(def) {
    const a = new Area(this.scene, def);
    this.list[a.id] = a;
    return a;
  }

  get(id) {
    return this.list[id];
  }

  get id() {
    return this.cur?.id ?? null;
  }

  activate(id) {
    const a = this.list[id];
    if (!a) throw new Error(`Okänt område: ${id}`);
    if (this.cur && this.cur !== a) this.cur.root.visible = false;
    a.root.visible = true;
    const first = !a.visited;
    a.visited = true;
    this.cur = a;
    if (this.collider) {
      this.collider.octree = a.ensureOctree();
      this.collider.area = a.id;
    }
    this.lights.area = a.id;
    this.lights.pickT = 0;
    for (const fn of a.enterFns) fn(first);
    this.onActivate?.(a, first);
    return a;
  }

  // Utgången som Cello står i just nu (eller null)
  exitAt(p) {
    const a = this.cur;
    if (!a) return null;
    for (const ex of a.exits) {
      if (p.x < ex.x0 || p.x > ex.x1 || p.z < ex.z0 || p.z > ex.z1) continue;
      if (ex.y !== undefined && Math.abs(p.y - ex.y) > (ex.dy ?? 4)) continue;
      return ex;
    }
    return null;
  }

  update(t, dt) {
    if (!this.cur) return;
    for (const u of this.cur.updaters) u(t, dt);
  }
}

// De dödas värld (0.12): Anubis' Broken Scales låter Cello växla mellan de levandes och de dödas värld.
//
//   · I de dödas värld blir färgerna bleka och gröna, och det som bara finns där syns och bär:
//     andebroar, andeplattformar och andar att prata med.
//   · Det som bara finns i de levandes värld (falska väggar, vissa plattformar) bleknar och går att gå igenom.
//   · Vålnader (wraith) finns bara i de dödas värld; mumier och asklingar finns i båda.
//
// Läget sparas inte: när spelet laddas är Cello alltid bland de levande.
import * as THREE from 'three';
import { Npc } from './npcs.js';

const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export class Realm {
  constructor({ story, player, hud, sfx, fx, scene, areas, canvas }) {
    Object.assign(this, { story, player, hud, sfx, fx, scene, areas, canvas });
    this.dead = false;
    this.k = 0; // 0 = levande, 1 = döda (mjuk övergång)
    this.objs = []; // { meshes, box, side: 'dead' | 'living', mat, area }
    this.spirits = [];
    this.t = 0;
    this.hinted = false;
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x6af0d4, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.spiritMat = new THREE.MeshBasicMaterial({ color: 0x9af8e4, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    // Ett grönt dok över bilden i de dödas värld (bilden själv blir blek med ett CSS-filter)
    const veil = document.createElement('div');
    veil.className = 'realm-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.querySelector('.hud')?.prepend(veil);
    this.veil = veil;
    this.filterKey = '';
  }

  get have() {
    return !!this.story.state?.items?.scales;
  }

  // En sak som bara finns i ena världen. meshes: de som syns, box: kollisionslådan (eller null)
  add(def) {
    const o = { side: def.side ?? 'dead', meshes: def.meshes ?? [], box: def.box ?? null, area: def.area, mat: def.mat ?? null };
    if (o.side === 'living' && !o.mat) {
      // Varje falsk vägg får ett eget material som kan blekna
      for (const m of o.meshes) {
        m.material = m.material.clone();
        m.material.transparent = true;
        o.mat = o.mat ?? [];
        o.mat.push(m.material);
      }
    }
    if (o.side === 'dead') for (const m of o.meshes) m.material = this.ghostMat;
    this.objs.push(o);
    this.apply(o);
    return o;
  }

  apply(o) {
    const on = (o.side === 'dead') === this.dead;
    if (o.box) o.box.enabled = on;
  }

  // En ande: syns och går att prata med bara i de dödas värld
  addSpirit(def) {
    const root = this.areas.get(def.area).root;
    const n = new Npc(root, { id: def.id, name: def.name ?? 'Spirit', voice: 'spirit', pos: def.pos, face: def.face ?? 0, look: def.look ?? { skin: 0xffffff, top: 0xffffff, robe: true, scale: 0.9 }, pose: def.pose ?? 'stand', area: def.area });
    n.area = def.area;
    // Anubis: schakalhuvud med långa öron och en nos
    if (def.jackal) {
      const head = n.model.head;
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), this.spiritMat);
        ear.position.set(0.12 * s, 0.5, -0.02);
        head.add(ear);
      }
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.3), this.spiritMat);
      snout.position.set(0, 0.05, 0.28);
      head.add(snout);
    }
    n.model.root.traverse((m) => { if (m.isMesh) m.material = this.spiritMat; });
    n.setVisible(false);
    const sp = { ...def, npc: n, bob: Math.random() * 6 };
    this.spirits.push(sp);
    this.story.interactions.push({
      label: def.label ?? 'Speak with the spirit', npc: n, area: def.area,
      ok: () => this.dead && this.story.phase === 'free',
      run: () => {
        const lines = typeof def.lines === 'function' ? def.lines() : def.lines;
        this.story.talk(n, lines.map((t) => (typeof t === 'string' ? this.story.line(n, t) : t)), () => def.onTalk?.());
      },
    });
    return sp;
  }

  toggle() {
    if (!this.have) return;
    if (this.player.state !== 'move' && this.player.state !== 'attack') return;
    this.set(!this.dead);
  }

  set(dead, instant = false) {
    if (dead === this.dead && !instant) return;
    this.dead = dead;
    if (instant) this.k = dead ? 1 : 0;
    for (const o of this.objs) this.apply(o);
    if (!instant) {
      this.sfx.play(dead ? 'realmdown' : 'realmup');
      this.fx.burst('spark', this.player.feet.clone().setY(this.player.feet.y + 1.2), 18, dead ? 0x6af0d4 : 0xfff0c0);
      if (dead && !this.hinted) {
        this.hinted = true;
        this.hud.toast('The scales tip... Cello steps into the realm of the dead. Spirits walk here, and things hidden from the living. Press the button again to return.', 6000);
      }
    }
    this.story.inventory?.refresh(true);
  }

  // Cello står inne i något som just blev fast (en falsk vägg som kommer tillbaka): knuffa ut honom
  unstick() {
    const p = this.player.feet;
    for (const o of this.objs) {
      const b = o.box;
      if (!b || !b.enabled || o.area !== this.areas.id) continue;
      if (p.x > b.min.x - 0.3 && p.x < b.max.x + 0.3 && p.z > b.min.z - 0.3 && p.z < b.max.z + 0.3 && p.y + 1 > b.min.y && p.y < b.max.y - 0.2) {
        // Ut på den sida som är närmast
        const opts = [[b.min.x - 0.6 - p.x, 0], [b.max.x + 0.6 - p.x, 0], [0, b.min.z - 0.6 - p.z], [0, b.max.z + 0.6 - p.z]];
        opts.sort((a, c) => Math.hypot(...a) - Math.hypot(...c));
        this.player.nudge(opts[0][0], opts[0][1]);
      }
    }
  }

  reset() {
    this.set(false, true);
  }

  update(dt) {
    this.t += dt;
    const target = this.dead ? 1 : 0;
    this.k = approach(this.k, target, 5, dt);
    if (Math.abs(this.k - target) < 0.002) this.k = target;
    const k = this.k;
    // Bilden: blek, kall och grön
    const key = k.toFixed(2);
    if (key !== this.filterKey && this.canvas) {
      this.filterKey = key;
      this.canvas.style.filter = k > 0.005 ? `saturate(${(1 - 0.72 * k).toFixed(2)}) hue-rotate(${(-18 * k).toFixed(1)}deg) contrast(${(1 + 0.12 * k).toFixed(2)}) brightness(${(1 + 0.06 * k).toFixed(2)})` : '';
      this.veil.style.opacity = (k * 0.9).toFixed(2);
    }
    // Andesakerna skimrar fram, de falska väggarna bleknar
    this.ghostMat.opacity = k * (0.5 + 0.12 * Math.sin(this.t * 3));
    for (const o of this.objs) {
      for (const m of o.meshes) m.visible = o.side === 'dead' ? k > 0.02 : true;
      if (o.side === 'living' && o.mat) for (const mt of o.mat) { mt.opacity = 1 - 0.85 * k; mt.depthWrite = k < 0.5; }
    }
    this.unstick();
    // Andarna
    this.spiritMat.opacity = 0.5 * k + 0.08 * Math.sin(this.t * 2.5) * k;
    const here = this.areas.id;
    for (const sp of this.spirits) {
      const n = sp.npc;
      const show = k > 0.3 && sp.area === here && (!sp.when || sp.when());
      if (n.visible !== show) n.setVisible(show);
      if (!show) continue;
      n.update(dt, this.player, null);
      n.model.root.position.y = n.pos.y + 0.15 + Math.sin(this.t * 1.6 + sp.bob) * 0.08;
    }
  }
}

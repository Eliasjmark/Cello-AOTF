// En pool med ett fast antal punktljus som flyttas till de ljuskällor som ligger
// närmast Cello. Då kan världen ha hur många eldar och facklor som helst
// utan att grafiken blir långsam (varje ljus kostar för hela bilden).
import * as THREE from 'three';

export class LightPool {
  constructor(scene, count = 8) {
    this.sources = [];
    this.flashes = [];
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 1.6);
      scene.add(l);
      this.lights.push(l);
    }
    this.pickT = 0;
    this.picked = [];
    this.area = null; // bara ljus i det aktiva området tänds
    this.building = null; // området som nya ljus hör till
    this.extra = null; // ett ljus som alltid går först (lyktan)
  }

  // power: ljusstyrka, range: räckvidd i meter, flicker: 0 = stilla, 1 = eld
  add({ x, y, z, color = 0xff8a3a, power = 20, range = 12, flicker = 1 }) {
    const s = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), power, range, flicker, level: 1, on: true, phase: Math.random() * 10, area: this.building };
    this.sources.push(s);
    return s;
  }

  // Ett kort ljussken, t.ex. när hammaren slår ner eller en blixt slår till
  flash(pos, color = 0x9fdcff, power = 40, range = 14, dur = 0.35) {
    const s = { pos: pos.clone(), color: new THREE.Color(color), power, range, flicker: 0, level: 1, on: true, phase: 0, dur, t: 0 };
    this.flashes.push(s);
    this.pickT = 0;
    return s;
  }

  update(dt, t, focus) {
    for (const f of this.flashes) {
      f.t += dt;
      f.level = Math.max(0, 1 - f.t / f.dur);
    }
    this.flashes = this.flashes.filter((f) => f.t < f.dur);
    this.pickT -= dt;
    if (this.pickT <= 0) {
      this.pickT = 0.2;
      const all = this.sources.concat(this.flashes).filter((s) => s.on && s.level > 0.01 && (!s.area || s.area === this.area));
      for (const s of all) s.score = s.pos.distanceTo(focus) - s.range * 0.6 - (s.dur ? 100 : 0) - (s.prio || 0);
      all.sort((a, b) => a.score - b.score);
      this.picked = all.slice(0, this.lights.length);
    }
    this.lights.forEach((l, i) => {
      const s = this.picked[i];
      if (!s || !s.on) { l.intensity = 0; return; }
      const fl = s.flicker ? 1 - s.flicker * 0.15 + s.flicker * (Math.sin(t * 13.1 + s.phase) * 0.08 + Math.sin(t * 23.7 + s.phase * 2) * 0.05) : 1;
      l.position.copy(s.pos);
      l.color.copy(s.color);
      l.distance = s.range;
      l.intensity = s.power * s.level * fl;
    });
  }
}

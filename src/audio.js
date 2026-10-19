// Alla ljudeffekter skapas med kod (Web Audio). Musiken är riktiga inspelningar (music.js).
// Röster är korta grymtningar, i stil med klassiska äventyrsspel och de gamla LEGO-spelen.
// Röster för textrutorna: grundton, vågform och formanter (vokalfärg)
export const VOICES = {
  maren: { f: 290, wave: 'triangle', form: [[650, 4], [1300, 5]], breath: 0.5 },
  lyra: { f: 330, wave: 'triangle', form: [[820, 5], [1650, 6]] },
  vane: { f: 104, wave: 'sawtooth', form: [[480, 4], [1050, 5]] },
  edda: { f: 225, wave: 'sawtooth', form: [[700, 3], [1180, 4]], wobble: 1 },
  ilo: { f: 480, wave: 'square', form: [[950, 4], [1850, 5]] },
  bram: { f: 148, wave: 'sawtooth', form: [[600, 4], [1150, 5]] },
  kael: { f: 172, wave: 'sawtooth', form: [[620, 4], [1250, 5]] },
  // 0.6: folket ute i världen
  hollis: { f: 118, wave: 'sawtooth', form: [[520, 4], [980, 5]], wobble: 0.4 },
  tilly: { f: 430, wave: 'triangle', form: [[900, 4], [1800, 5]] },
  garrick: { f: 132, wave: 'sawtooth', form: [[560, 4], [1120, 5]] },
  mags: { f: 250, wave: 'sawtooth', form: [[760, 3], [1300, 4]], wobble: 0.6 },
  pell: { f: 165, wave: 'square', form: [[640, 4], [1350, 5]] },
  rosa: { f: 270, wave: 'triangle', form: [[720, 4], [1400, 5]] },
  ysolde: { f: 205, wave: 'triangle', form: [[580, 3], [1050, 4]], wobble: 1.2, breath: 0.4 },
  doran: { f: 112, wave: 'sawtooth', form: [[500, 4], [1000, 5]] },
  fenwick: { f: 140, wave: 'sawtooth', form: [[600, 3], [1150, 4]], wobble: 0.5 },
  mira: { f: 500, wave: 'square', form: [[1000, 4], [1950, 5]] },
  tob: { f: 455, wave: 'square', form: [[920, 4], [1800, 5]] },
  fenn: { f: 190, wave: 'sawtooth', form: [[680, 4], [1300, 5]] },
  odo: { f: 128, wave: 'triangle', form: [[540, 3], [1000, 4]], breath: 0.3 },
  nell: { f: 300, wave: 'triangle', form: [[780, 4], [1500, 5]] },
};
const STEPS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2];
const FANFARE = [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.39], [987.77, 0.62], [1046.5, 0.78]];

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.55;
  }

  // Måste anropas från ett klick eller en tangent (webbläsare kräver det för ljud)
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(c.destination);
      const white = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
      const w = white.getChannelData(0);
      for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
      this.noise = white;
      const brown = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
      const b = brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < b.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
      this.brown = brown;
      // Vinden: brus genom ett bandpassfilter, som en evig storm
      const wind = c.createBufferSource();
      wind.buffer = brown;
      wind.loop = true;
      this.windFilter = c.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 380;
      this.windFilter.Q.value = 0.6;
      this.windGain = c.createGain();
      this.windGain.gain.value = 0;
      wind.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.master);
      wind.start();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  get ok() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  gain(t0, attack, peak, decay, dest = this.master) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(dest);
    return g;
  }

  osc(type, f0, f1, t0, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    o.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  noiseThrough(type, f0, f1, q, t0, dur, dest, buffer = this.noise) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    s.connect(f);
    f.connect(dest);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  // En kort röst: sågtand genom två formantfilter blir ett "hah" eller "hup"
  voice(f0, f1, dur, peak, formants, t0) {
    const g = this.gain(t0, 0.012, peak, dur);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    for (const [freq, q] of formants) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      o.connect(f);
      f.connect(g);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // Mummel när någon pratar i en textruta
  blip(voiceId) {
    if (!this.ok) return;
    const v = VOICES[voiceId];
    if (!v) return;
    const t = this.ctx.currentTime;
    const f = v.f * STEPS[Math.floor(Math.random() * STEPS.length)] * (v.wobble ? 1 + Math.sin(t * 30) * 0.04 : 1);
    const g = this.gain(t, 0.008, 0.11, 0.07);
    const o = this.ctx.createOscillator();
    o.type = v.wave;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.07);
    for (const [freq, q] of v.form) {
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = freq;
      flt.Q.value = q;
      o.connect(flt);
      flt.connect(g);
    }
    o.start(t);
    o.stop(t + 0.1);
    if (v.breath) this.noiseThrough('bandpass', 1400, 1100, 1, t, 0.06, this.gain(t, 0.005, 0.03 * v.breath, 0.06));
  }

  // Ett kort mummel i någons röst utan textruta (rop på avstånd)
  speak(voiceId, count = 6) {
    if (!this.ok) return;
    for (let i = 0; i < count; i++) setTimeout(() => this.blip(voiceId), i * 85 + Math.random() * 30);
  }

  // Vind och knastrande eld. Anropas varje bildruta. (Musiken sköts av music.js.)
  ambience(dt, s) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime;
    const gust = 0.5 + Math.sin(t * 0.23) * 0.3 + Math.sin(t * 0.61 + 1) * 0.2;
    this.windGain.gain.setTargetAtTime((s.inside ? 0.05 : 0.11 + (s.wind || 0) * 0.08) * gust, t, 0.5);
    this.windFilter.frequency.setTargetAtTime(260 + gust * 320, t, 0.5);
    if (s.fire > 0 && Math.random() < dt * 9 * s.fire) this.play('crackle', { vol: s.fire });
  }

  lowpass(dest, freq) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.connect(dest);
    return f;
  }

  play(name, opt = {}) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + (opt.delay || 0);
    const v = opt.vol ?? 1;
    const r = 1 + (Math.random() - 0.5) * 0.14;
    switch (name) {
      case 'swing':
        this.noiseThrough('bandpass', 700, 2600, 1.4, t, 0.14, this.gain(t, 0.02, 0.32 * v, 0.13));
        break;
      case 'hah': // Cellos slag
        this.voice(270 * r, 185 * r, 0.12, 0.5 * v, [[820, 5], [1250, 6]], t);
        break;
      case 'hyah': // sista slaget i kombinationen
        this.voice(320 * r, 190 * r, 0.21, 0.6 * v, [[760, 5], [1300, 6]], t);
        break;
      case 'hup': // hopp
        this.voice(300 * r, 360 * r, 0.08, 0.38 * v, [[420, 5], [950, 6]], t);
        break;
      case 'hurt':
        this.voice(240 * r, 140 * r, 0.24, 0.6 * v, [[560, 4], [1000, 5]], t);
        this.noiseThrough('lowpass', 900, 300, 0.7, t, 0.1, this.gain(t, 0.005, 0.25, 0.1));
        break;
      case 'fall':
        this.voice(260, 120, 0.7, 0.45 * v, [[700, 4], [1150, 5]], t);
        break;
      case 'hit': {
        const g = this.gain(t, 0.004, 0.7 * v, 0.14);
        this.osc('sine', 150, 55, t, 0.14, g);
        this.noiseThrough('highpass', 2400, 1200, 0.8, t, 0.05, this.gain(t, 0.002, 0.35 * v, 0.05));
        break;
      }
      case 'clang': {
        for (const [f, p] of [[820, 0.22], [1345, 0.16], [2130, 0.1], [3020, 0.06]]) {
          this.osc('sine', f * r, f * r * 0.995, t, 0.5, this.gain(t, 0.002, p * v, 0.5));
        }
        this.noiseThrough('highpass', 3000, 2000, 0.8, t, 0.04, this.gain(t, 0.001, 0.3 * v, 0.04));
        break;
      }
      case 'roll':
        this.noiseThrough('lowpass', 900, 300, 0.8, t, 0.28, this.gain(t, 0.03, 0.18 * v, 0.26));
        break;
      case 'land':
        this.osc('sine', 110, 45, t, 0.1, this.gain(t, 0.003, 0.45 * v, 0.1));
        this.noiseThrough('lowpass', 600, 200, 0.7, t, 0.08, this.gain(t, 0.003, 0.2 * v, 0.08));
        break;
      case 'step':
        this.noiseThrough('lowpass', 520 * r, 260, 1, t, 0.05, this.gain(t, 0.003, 0.09 * v, 0.05));
        break;
      case 'lock':
        this.osc('sine', 1480, 1480, t, 0.05, this.gain(t, 0.002, 0.22, 0.05));
        this.osc('sine', 1980, 1980, t + 0.05, 0.07, this.gain(t + 0.05, 0.002, 0.2, 0.07));
        break;
      case 'unlock':
        this.osc('sine', 1180, 880, t, 0.07, this.gain(t, 0.002, 0.16, 0.07));
        break;
      case 'heart':
        [880, 1109, 1319, 1760].forEach((f, i) => {
          const ti = t + i * 0.06;
          this.osc('triangle', f, f, ti, 0.12, this.gain(ti, 0.004, 0.18, 0.12));
        });
        break;
      case 'alert': { // fienden har sett Cello
        const g = this.gain(t, 0.02, 0.32 * v, 0.42);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 700;
        f.connect(g);
        this.osc('sawtooth', 92, 80, t, 0.42, f);
        this.osc('sawtooth', 96, 83, t, 0.42, f);
        break;
      }
      case 'growl': {
        const g = this.gain(t, 0.05, 0.3 * v, 0.5);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 380;
        f.connect(g);
        this.osc('sawtooth', 68 * r, 52 * r, t, 0.55, f);
        this.noiseThrough('lowpass', 320, 200, 1, t, 0.5, this.gain(t, 0.05, 0.12 * v, 0.45));
        break;
      }
      case 'ehurt': {
        const g = this.gain(t, 0.005, 0.32 * v, 0.17);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 650;
        f.connect(g);
        this.osc('square', 165 * r, 85 * r, t, 0.17, f);
        break;
      }
      case 'edie':
        this.osc('sawtooth', 120, 38, t, 0.75, this.gain(t, 0.01, 0.2 * v, 0.75));
        this.noiseThrough('lowpass', 1400, 90, 0.9, t, 0.9, this.gain(t, 0.02, 0.35 * v, 0.9));
        break;
      case 'crackle':
        this.noiseThrough('highpass', 2500 + Math.random() * 2500, 1800, 1, t, 0.02, this.gain(t, 0.001, 0.08 * v, 0.02));
        break;
      case 'anvil':
        for (const [f, p] of [[1180, 0.2], [2350, 0.12], [3600, 0.06]]) {
          this.osc('sine', f * r, f * r, t, 0.35, this.gain(t, 0.001, p * v, 0.35));
        }
        break;
      case 'roar': {
        const g = this.gain(t, 0.15, 0.6 * v, 1.6);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 520;
        f.connect(g);
        this.osc('sawtooth', 74, 44, t, 1.7, f);
        this.osc('sawtooth', 77, 47, t, 1.7, f);
        this.noiseThrough('lowpass', 700, 220, 0.7, t, 1.6, this.gain(t, 0.2, 0.3 * v, 1.4));
        break;
      }
      case 'stomp':
        this.osc('sine', 62, 24, t, 0.6, this.gain(t, 0.004, 0.9 * v, 0.6));
        this.noiseThrough('lowpass', 500, 90, 0.8, t, 0.7, this.gain(t, 0.01, 0.5 * v, 0.7), this.brown);
        break;
      case 'choice':
        this.osc('triangle', 660, 660, t, 0.05, this.gain(t, 0.002, 0.12, 0.05));
        break;
      case 'save':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const ti = t + i * 0.09;
          this.osc('triangle', f, f, ti, 0.25, this.gain(ti, 0.004, 0.16, 0.25));
        });
        break;
      case 'item':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const ti = t + i * 0.11;
          this.osc('triangle', f, f, ti, 0.4, this.gain(ti, 0.004, 0.2, 0.4));
        });
        break;
      case 'thunder':
        this.noiseThrough('lowpass', 240, 70, 0.6, t, 2.6, this.gain(t, 0.08, 0.75 * v, 2.6), this.brown);
        break;
      // ---------- Mjölnirs skärva och fästningen ----------
      case 'slam': // hammaren i marken: dovt slag och sprakande blixt
        this.osc('sine', 90, 28, t, 0.5, this.gain(t, 0.003, 1.0 * v, 0.5));
        this.noiseThrough('lowpass', 900, 120, 0.8, t, 0.45, this.gain(t, 0.004, 0.55 * v, 0.45), this.brown);
        this.noiseThrough('highpass', 5200, 2600, 0.7, t + 0.02, 0.22, this.gain(t + 0.02, 0.003, 0.22 * v, 0.22));
        for (const [f, p] of [[640, 0.12], [1180, 0.08]]) this.osc('sine', f * r, f * r * 0.98, t, 0.4, this.gain(t, 0.002, p * v, 0.4));
        break;
      case 'zap': {
        const g = this.gain(t, 0.002, 0.28 * v, 0.32);
        this.osc('sawtooth', 1800 * r, 220, t, 0.32, this.lowpass(g, 4200));
        this.osc('square', 95, 60, t, 0.3, this.gain(t, 0.002, 0.12 * v, 0.3));
        this.noiseThrough('highpass', 6000, 3000, 0.6, t, 0.28, this.gain(t, 0.002, 0.25 * v, 0.28));
        break;
      }
      case 'pulse': // blixten vandrar genom kopparrännan
        this.osc('sawtooth', 110, 440, t, 0.6, this.lowpass(this.gain(t, 0.05, 0.16 * v, 0.6), 1800));
        this.osc('sine', 880, 1760, t, 0.6, this.gain(t, 0.05, 0.05 * v, 0.6));
        break;
      case 'door': // järnport som glider upp
        this.noiseThrough('lowpass', 420, 160, 1.4, t, 1.1, this.gain(t, 0.1, 0.4 * v, 1.0), this.brown);
        this.osc('sawtooth', 48, 42, t, 1.0, this.lowpass(this.gain(t, 0.12, 0.14 * v, 0.9), 300));
        this.osc('sine', 70, 40, t + 1.0, 0.25, this.gain(t + 1.0, 0.004, 0.5 * v, 0.25));
        break;
      case 'keyturn':
        this.noiseThrough('bandpass', 3200, 2800, 4, t, 0.04, this.gain(t, 0.001, 0.4 * v, 0.04));
        this.noiseThrough('bandpass', 2400, 2000, 4, t + 0.16, 0.05, this.gain(t + 0.16, 0.001, 0.45 * v, 0.05));
        this.osc('sine', 160, 70, t + 0.3, 0.2, this.gain(t + 0.3, 0.003, 0.5 * v, 0.2));
        break;
      case 'chest': // locket knarrar upp
        this.osc('sawtooth', 180, 260, t, 0.45, this.lowpass(this.gain(t, 0.05, 0.14 * v, 0.45), 900));
        this.noiseThrough('bandpass', 1200, 800, 3, t, 0.4, this.gain(t, 0.05, 0.1 * v, 0.4));
        break;
      case 'fanfare': // Cello hittar något
        FANFARE.forEach(([f, dt0], i) => {
          const ti = t + dt0, len = i === FANFARE.length - 1 ? 0.9 : 0.22;
          this.osc('triangle', f, f, ti, len, this.gain(ti, 0.006, 0.2 * v, len));
          this.osc('square', f / 2, f / 2, ti, len, this.lowpass(this.gain(ti, 0.006, 0.05 * v, len), 1400));
        });
        break;
      case 'secret': // ett pussel är löst
        [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
          const ti = t + i * 0.12, len = i === 3 ? 0.7 : 0.18;
          this.osc('triangle', f, f, ti, len, this.gain(ti, 0.004, 0.18 * v, len));
        });
        break;
      case 'heartbig':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          const ti = t + i * 0.09;
          this.osc('triangle', f, f, ti, 0.5, this.gain(ti, 0.004, 0.18 * v, 0.5));
        });
        this.osc('sine', 261.63, 261.63, t, 1.2, this.gain(t, 0.05, 0.12 * v, 1.2));
        break;
      case 'gust':
        this.noiseThrough('bandpass', 300, 900, 0.9, t, 1.3, this.gain(t, 0.35, 0.28 * v, 1.0), this.brown);
        this.noiseThrough('bandpass', 1400, 2400, 2, t + 0.2, 0.9, this.gain(t + 0.2, 0.3, 0.05 * v, 0.7));
        break;
      case 'heavystep':
        this.osc('sine', 75 * r, 38, t, 0.18, this.gain(t, 0.003, 0.4 * v, 0.18));
        this.noiseThrough('bandpass', 1900, 1500, 5, t, 0.05, this.gain(t, 0.001, 0.08 * v, 0.05));
        break;
      case 'heavyon':
        this.osc('sine', 220, 90, t, 0.25, this.gain(t, 0.003, 0.4 * v, 0.25));
        for (const [f, p] of [[740, 0.1], [1110, 0.06]]) this.osc('sine', f, f, t, 0.4, this.gain(t, 0.002, p * v, 0.4));
        this.noiseThrough('highpass', 5000, 3500, 0.8, t, 0.12, this.gain(t, 0.002, 0.1 * v, 0.12));
        break;
      case 'heavyoff':
        this.osc('sine', 150, 260, t, 0.15, this.gain(t, 0.003, 0.25 * v, 0.15));
        break;
      case 'fizzle':
        this.noiseThrough('highpass', 3000, 1200, 0.8, t, 0.3, this.gain(t, 0.01, 0.12 * v, 0.3));
        this.osc('square', 140, 90, t, 0.18, this.lowpass(this.gain(t, 0.004, 0.08 * v, 0.18), 600));
        break;
      case 'bat':
        this.osc('square', 1900 * r, 2600 * r, t, 0.07, this.lowpass(this.gain(t, 0.002, 0.08 * v, 0.07), 3500));
        this.noiseThrough('bandpass', 800, 600, 2, t, 0.12, this.gain(t, 0.004, 0.08 * v, 0.12));
        break;
      case 'shieldbreak':
        this.noiseThrough('bandpass', 1500, 500, 1.2, t, 0.35, this.gain(t, 0.002, 0.5 * v, 0.35));
        for (const [f, p] of [[520, 0.15], [870, 0.1]]) this.osc('sine', f * r, f * r * 0.9, t, 0.4, this.gain(t, 0.002, p * v, 0.4));
        break;
      case 'crumble':
        this.noiseThrough('lowpass', 700, 90, 0.8, t, 1.1, this.gain(t, 0.01, 0.6 * v, 1.1), this.brown);
        for (let i = 0; i < 5; i++) {
          const ti = t + 0.08 + Math.random() * 0.6;
          this.osc('sine', 120 + Math.random() * 80, 50, ti, 0.12, this.gain(ti, 0.003, 0.25 * v, 0.12));
        }
        break;
      case 'crack': // golvet knakar
        this.noiseThrough('bandpass', 900, 500, 3, t, 0.25, this.gain(t, 0.004, 0.25 * v, 0.25));
        this.osc('sawtooth', 70, 55, t, 0.3, this.lowpass(this.gain(t, 0.02, 0.12 * v, 0.3), 260));
        break;
      case 'bigroar': {
        const g = this.gain(t, 0.2, 0.7 * v, 2.0);
        const f = this.lowpass(g, 420);
        this.osc('sawtooth', 58, 32, t, 2.1, f);
        this.osc('sawtooth', 61, 34, t, 2.1, f);
        this.osc('square', 29, 22, t, 2.1, this.lowpass(this.gain(t, 0.25, 0.25 * v, 1.9), 120));
        this.noiseThrough('lowpass', 600, 160, 0.7, t, 1.9, this.gain(t, 0.25, 0.35 * v, 1.7));
        break;
      }
      case 'potbreak': // lerkrukan går sönder
        this.noiseThrough('bandpass', 2600, 1400, 1.5, t, 0.22, this.gain(t, 0.002, 0.4 * v, 0.22));
        for (let i = 0; i < 4; i++) {
          const ti = t + Math.random() * 0.12, f = 900 + Math.random() * 1600;
          this.osc('triangle', f, f * 0.9, ti, 0.08, this.gain(ti, 0.001, 0.12 * v, 0.08));
        }
        this.osc('sine', 180, 90, t, 0.1, this.gain(t, 0.002, 0.3 * v, 0.1));
        break;
      case 'shard': { // en skärva: ett klingande ljud, högre för större värden
        const notes = v >= 20 ? [1319, 1568, 1976, 2637] : v >= 5 ? [1175, 1568, 2093] : [1568, 2093];
        notes.forEach((f, i) => {
          const ti = t + i * 0.055;
          this.osc('triangle', f, f, ti, 0.1, this.gain(ti, 0.003, 0.12, 0.1));
          this.osc('sine', f * 2, f * 2, ti, 0.08, this.gain(ti, 0.003, 0.04, 0.08));
        });
        break;
      }
      case 'grass': // gräset skärs av
        this.noiseThrough('highpass', 3000, 1800, 0.8, t, 0.09, this.gain(t, 0.003, 0.18 * v, 0.09));
        break;
      case 'buy': // köpet gick igenom
        [784, 988, 1175, 1568].forEach((f, i) => {
          const ti = t + i * 0.07;
          this.osc('square', f, f, ti, 0.09, this.lowpass(this.gain(ti, 0.003, 0.08, 0.09), 2400));
        });
        break;
      case 'denied': // inte tillräckligt med skärvor
        this.osc('square', 196, 185, t, 0.12, this.lowpass(this.gain(t, 0.003, 0.12, 0.12), 900));
        this.osc('square', 147, 139, t + 0.13, 0.18, this.lowpass(this.gain(t + 0.13, 0.003, 0.12, 0.18), 900));
        break;
      case 'snap': // svärdet går av
        for (const [f, p] of [[1700, 0.25], [2650, 0.18], [3900, 0.1]]) this.osc('sine', f * r, f * r * 0.9, t, 0.35, this.gain(t, 0.001, p, 0.35));
        this.noiseThrough('highpass', 4200, 2600, 0.9, t, 0.12, this.gain(t, 0.001, 0.4, 0.12));
        this.osc('sine', 330, 120, t + 0.05, 0.3, this.gain(t + 0.05, 0.005, 0.25, 0.3));
        break;
      case 'lantern': // lyktan tänds
        this.noiseThrough('bandpass', 500, 1800, 0.9, t, 0.35, this.gain(t, 0.05, 0.22 * v, 0.3));
        this.osc('sine', 220, 330, t, 0.3, this.gain(t, 0.05, 0.08 * v, 0.3));
        break;
      case 'lanternoff':
        this.noiseThrough('lowpass', 900, 300, 0.7, t, 0.2, this.gain(t, 0.01, 0.15 * v, 0.2));
        break;
      case 'drink': // tre klunkar
        for (let i = 0; i < 3; i++) {
          const ti = t + i * 0.22;
          this.osc('sine', 300, 180, ti, 0.12, this.gain(ti, 0.01, 0.3, 0.12));
          this.noiseThrough('lowpass', 700, 300, 1, ti, 0.1, this.gain(ti, 0.01, 0.12, 0.1));
        }
        break;
      case 'menu': // menyn öppnas eller stängs
        this.osc('triangle', v > 0.5 ? 660 : 880, v > 0.5 ? 990 : 660, t, 0.12, this.gain(t, 0.004, 0.14, 0.12));
        break;
      case 'select': // markören flyttas
        this.osc('square', 1320, 1320, t, 0.035, this.lowpass(this.gain(t, 0.002, 0.07, 0.035), 3000));
        break;
      case 'equip': // ett föremål läggs på en knapp
        this.osc('triangle', 990, 1320, t, 0.1, this.gain(t, 0.003, 0.16, 0.1));
        this.osc('triangle', 1320, 1760, t + 0.08, 0.12, this.gain(t + 0.08, 0.003, 0.14, 0.12));
        break;
      case 'goat': { // bräkande get
        const g = this.lowpass(this.gain(t, 0.02, 0.18 * v, 0.5), 2200);
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(420 * r, t);
        for (let k = 0; k < 10; k++) o.frequency.setValueAtTime((k % 2 ? 380 : 440) * r, t + k * 0.045);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.5);
        break;
      }
      case 'moo':
        this.voice(120 * r, 95 * r, 0.9, 0.35 * v, [[380, 4], [800, 5]], t);
        break;
      case 'cluck':
        for (let i = 0; i < 3; i++) this.voice(620 * r, 480 * r, 0.06, 0.15 * v, [[1100, 4], [2200, 5]], t + i * 0.11);
        break;
      case 'torch': // ett eldfat tänds
        this.noiseThrough('bandpass', 300, 1400, 0.8, t, 0.6, this.gain(t, 0.04, 0.35 * v, 0.55));
        this.osc('sine', 110, 70, t, 0.4, this.gain(t, 0.02, 0.2 * v, 0.4));
        break;
      case 'portal':
        for (let i = 0; i < 6; i++) {
          const ti = t + i * 0.08, f = 440 * Math.pow(2, i / 4);
          this.osc('sine', f, f * 1.5, ti, 0.6, this.gain(ti, 0.02, 0.07 * v, 0.6));
        }
        this.noiseThrough('bandpass', 800, 3200, 1, t, 1.0, this.gain(t, 0.3, 0.12 * v, 0.7));
        break;
      default:
        break;
    }
  }
}

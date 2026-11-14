// Ljudeffekterna (Web Audio). Musiken är riktiga inspelningar (music.js).
// 0.18: de flesta ljud är nu inspelningar ur ljudpaketet Elias skickade (sounds/sfx.json, se tools/audio/build_sfx.py).
// Ljud utan inspelning skapas med kod, som förut. Röster i textrutorna är ett mumlande av korta röstklipp
// (stavelser), uppspelade i varje figurs tonläge, i stil med de gamla LEGO-spelen.
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
  wren: { f: 315, wave: 'triangle', form: [[800, 4], [1600, 5]] },
  kronos: { f: 62, wave: 'sawtooth', form: [[300, 3], [700, 4]], wobble: 0.5, breath: 0.6 },
  typhon: { f: 85, wave: 'sawtooth', form: [[420, 3], [1100, 5]], breath: 0.9 },
  seren: { f: 270, wave: 'triangle', form: [[720, 4], [1450, 5]], wobble: 0.6 },
  // 0.7: öknen och pyramiden
  nefret: { f: 240, wave: 'triangle', form: [[680, 3], [1250, 4]], breath: 0.3 },
  hamid: { f: 122, wave: 'sawtooth', form: [[540, 4], [1080, 5]], wobble: 0.3 },
  sabi: { f: 470, wave: 'square', form: [[960, 4], [1900, 5]] },
  tarek: { f: 152, wave: 'sawtooth', form: [[590, 4], [1150, 5]], breath: 0.4 },
  apophis: { f: 58, wave: 'sawtooth', form: [[280, 3], [640, 3]], wobble: 1.6, breath: 0.9 },
  // 0.12: nekropolen
  spirit: { f: 260, wave: 'sine', form: [[620, 3], [1240, 4]], wobble: 1.4, breath: 1.0 },
  ammit: { f: 72, wave: 'sawtooth', form: [[340, 3], [760, 3]], wobble: 1.0, breath: 0.7 },
  anubis: { f: 96, wave: 'triangle', form: [[420, 3], [900, 4]], breath: 0.6 },
  // 0.15: Brinehollow
  nerissa: { f: 235, wave: 'sawtooth', form: [[700, 3], [1250, 4]], wobble: 0.7, breath: 0.3 },
  corwin: { f: 150, wave: 'square', form: [[620, 4], [1300, 5]], wobble: 0.2 },
  gull: { f: 125, wave: 'sawtooth', form: [[520, 3], [980, 4]], wobble: 0.9, breath: 0.4 },
  marlo: { f: 160, wave: 'sawtooth', form: [[600, 4], [1200, 5]] },
  // 0.16: Rimeholt och jättens gap
  rhea: { f: 185, wave: 'triangle', form: [[600, 3], [1100, 4]], wobble: 0.45, breath: 0.5 },
  ida: { f: 235, wave: 'triangle', form: [[700, 3], [1300, 4]], wobble: 0.3, breath: 0.3 },
  sigrun: { f: 205, wave: 'triangle', form: [[640, 3], [1200, 4]], wobble: 0.6, breath: 0.4 },
  ylva: { f: 330, wave: 'triangle', form: [[820, 4], [1650, 5]] },
  hakon: { f: 118, wave: 'sawtooth', form: [[500, 4], [1000, 5]], wobble: 0.3 },
  bjarke: { f: 108, wave: 'sawtooth', form: [[480, 3], [940, 4]], wobble: 0.8, breath: 0.5 },
  loki: { f: 190, wave: 'square', form: [[760, 4], [1500, 5]], wobble: 1.2, breath: 0.2 },
  thrym: { f: 55, wave: 'sawtooth', form: [[260, 3], [620, 3]], wobble: 0.4, breath: 0.8 },
};
const STEPS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2];
const FANFARE = [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.39], [987.77, 0.62], [1046.5, 0.78]];

// 0.18: spelets ljudnamn → inspelningar. s: klipp (ett väljs slumpvis), vol, rate (tonhöjd), jit (slumpad tonhöjd),
// synth: true = koden spelar sitt eget ljud också (lager), also: fler klipp samtidigt eller efter en stund
const SAMPLES = {
  // menyerna
  menuMove: { s: ['ui_move'], vol: 0.55, jit: 0.04 },
  menuSelect: { s: ['ui_select'], vol: 0.75, also: [{ s: ['ui_pop3'], vol: 0.35, delay: 0.03 }] },
  menuBack: { s: ['ui_back'], vol: 0.6 },
  menuDeny: { s: ['ui_deny'], vol: 0.55 },
  menuOpen: { s: ['ui_open'], vol: 0.7 },
  menuStart: { s: ['ui_start'], vol: 0.7, also: [{ s: ['unsheath'], vol: 0.55, delay: 0.05 }] },
  menuErase: { s: ['ui_erase'], vol: 0.7 },
  menuHover: { s: ['ui_move2'], vol: 0.32, jit: 0.05 },
  toggleOn: { s: ['ui_toggle_on'], vol: 0.75 },
  toggleOff: { s: ['ui_toggle_off'], vol: 0.75 },
  slider: { s: ['ui_pop1'], vol: 0.55 },
  choice: { s: ['ui_move2'], vol: 0.5, jit: 0.03 },
  dialogNext: { s: ['ui_pop2'], vol: 0.28, jit: 0.06 },
  menu: { s: ['ui_pop4'], vol: 0.6, also: [{ s: ['cloth1'], vol: 0.3 }] },
  bagClose: { s: ['ui_close'], vol: 0.6 },
  pauseOpen: { s: ['ui_open'], vol: 0.7, also: [{ s: ['ui_pop1'], vol: 0.4, delay: 0.05 }] },
  pauseClose: { s: ['ui_close'], vol: 0.6 },
  select: { s: ['ui_pop3'], vol: 0.6, jit: 0.05 },
  equip: { s: ['equip'], vol: 0.75 },
  mapOpen: { s: ['ui_map_open'], vol: 0.75 },
  mapClose: { s: ['ui_map_close'], vol: 0.7 },
  page: { s: ['ui_page'], vol: 0.6, jit: 0.06 },
  // jinglar
  item: { s: ['jg_item'], vol: 0.75 },
  save: { s: ['jg_save'], vol: 0.6 },
  heartbig: { s: ['jg_heart'], vol: 0.7, synth: true },
  songok: { s: ['jg_songok'], vol: 0.7 },
  songbad: { s: ['jg_songbad'], vol: 0.6 },
  quest: { s: ['jg_quest'], vol: 0.7 },
  questNew: { s: ['jg_mystery'], vol: 0.55 },
  rest: { s: ['jg_rest'], vol: 0.65 },
  defeat: { s: ['jg_defeat'], vol: 0.7 },
  denied: { s: ['jg_deny'], vol: 0.55 },
  // pengar och saker
  shard: { s: ['coin', 'gem'], vol: 0.6, jit: 0.08 },
  buy: { s: ['coins'], vol: 0.75 },
  heart: { s: ['heart'], vol: 0.65 },
  chest: { s: ['chest_creak'], vol: 0.6, also: [{ s: ['wood_hollow'], vol: 0.6, delay: 0.25 }] },
  drink: { s: ['slurp'], vol: 0.75 },
  pour: { s: ['gurgle'], vol: 0.6 },
  lantern: { s: ['match'], vol: 0.7 },
  torch: { s: ['fire_light'], vol: 0.7, synth: true },
  // strid
  swing: { s: ['swipe', 'whoosh1', 'whoosh2'], vol: 0.55, jit: 0.1 },
  hit: { s: ['slice'], vol: 0.6, jit: 0.08, synth: true, also: [{ s: ['punch1', 'punch2', 'punch3'], vol: 0.45, jit: 0.1 }] },
  clang: { s: ['clash1', 'clash2'], vol: 0.7, jit: 0.06 },
  ehurt: { s: ['punch2', 'punch3', 'kick'], vol: 0.55, jit: 0.1, synth: true },
  edie: { s: ['poof'], vol: 0.6, jit: 0.1, synth: true, also: [{ s: ['crunch'], vol: 0.35 }] },
  slam: { s: ['thud'], vol: 0.8, synth: true },
  stomp: { s: ['thud'], vol: 0.6, rate: 0.8, synth: true },
  shieldbreak: { s: ['metal_clang'], vol: 0.7, synth: true },
  potbreak: { s: ['pottery'], vol: 0.75, jit: 0.1 },
  snap: { s: ['snap'], vol: 0.6 },
  // Cellos kropp (hans rop är kodens egna ljud)
  hurt: { s: ['punch1'], vol: 0.4, synth: true },
  belch: { s: ['belch1', 'belch2', 'belch3'], vol: 0.7, rate: 1.12, jit: 0.06 },
  cough: { s: ['cough1', 'cough2'], vol: 0.45, rate: 1.15, jit: 0.04 },
  whistle: { s: ['whistle'], vol: 0.6 },
  roll: { s: ['cloth1', 'cloth2'], vol: 0.6, jit: 0.1, also: [{ s: ['whoosh2'], vol: 0.25 }] },
  land: { s: ['cloththud'], vol: 0.6, jit: 0.1 },
  // dörrar, lås, sten, vatten
  door: { s: ['door_open'], vol: 0.7, also: [{ s: ['door_creak'], vol: 0.35 }] },
  unlock: { s: ['lock_unlock'], vol: 0.75, also: [{ s: ['keys'], vol: 0.4 }] },
  keyturn: { s: ['lock_unlock'], vol: 0.8, also: [{ s: ['keys'], vol: 0.45 }] },
  lock: { s: ['lock_lock'], vol: 0.75 },
  stonegrind: { s: ['stone_long'], vol: 0.7, jit: 0.05 },
  boulder: { s: ['stone_med'], vol: 0.7, jit: 0.05, synth: true },
  crumble: { s: ['stone_short'], vol: 0.5, jit: 0.1, synth: true },
  crystal: { s: ['glass_big'], vol: 0.55, jit: 0.05, synth: true },
  chime: { s: ['glass_small'], vol: 0.5, jit: 0.05 },
  icecrack: { s: ['ice'], vol: 0.6, synth: true },
  hourglass: { s: ['clock'], vol: 0.55 },
  splash: { s: ['splash'], vol: 0.7, jit: 0.08 },
  dive: { s: ['drop'], vol: 0.6, rate: 0.8 },
  surface: { s: ['drop'], vol: 0.55, rate: 1.2 },
  bubble: { s: ['drop_syn'], vol: 0.35, jit: 0.2 },
};
// Ljud som koden kan spela själv (om ett klipp saknas)
const SYNTH_HAS = new Set(['swing','hah','hyah','hup','hurt','fall','hit','clang','roll','land','step','lock','unlock','heart','alert','growl','ehurt','edie','crackle','anvil','roar','stomp','sandrush','sandfall','boulder','crystal','rotor','hourglass','menuMove','menuSelect','menuBack','menuDeny','menuOpen','menuStart','menuErase','choice','save','item','thunder','slam','zap','pulse','door','keyturn','chest','fanfare','secret','heartbig','gust','heavystep','heavyon','heavyoff','fizzle','bat','shieldbreak','crumble','crack','bigroar','potbreak','shard','grass','buy','denied','snap','lantern','lanternoff','drink','pour','menu','select','equip','goat','moo','neigh','chime','swifton','swiftoff','wallrun','typhoon','realmdown','realmup','splash','tide','dash','dive','surface','stroke','choke','shadowcast','shadowswap','shadowland','glide','icecrack','howl','bubble','note','songok','songbad','huff','sniff','hoof','ram','horn','stonegrind','sunchime','sizzle','veilburn','prismup','prismdown','hiss','shriek','scarab','flip','cluck','torch','portal']);
// Fotstegen efter underlaget
const STEPS_ON = { grass: 'st_grass', snow: 'st_snow', wood: 'st_wood', gravel: 'st_gravel', stone: 'st_stone' };
// Mummel: vilka stavelser (man0–man10) och vilket tonläge varje röst har. Annars räknas det fram ur grundtonen.
const MUMBLE = {
  kronos: { g: [0, 4, 7, 9], rate: 0.52, low: 900, synth: 1 },
  typhon: { g: [1, 4, 9], rate: 0.6, low: 1200, synth: 1 },
  apophis: { g: [3, 5, 9], rate: 0.5, low: 900, synth: 1, echo: 0.3 },
  ammit: { g: [1, 4, 7], rate: 0.6, low: 1100, synth: 1 },
  anubis: { g: [0, 5, 9], rate: 0.7, low: 1800, echo: 0.35 },
  thrym: { g: [0, 4, 7], rate: 0.5, low: 800, synth: 1 },
  spirit: { g: [3, 5, 9], rate: 1.5, echo: 0.45, high: 500 },
  loki: { g: [2, 6, 8, 10], rate: 1.35, echo: 0.25 },
  ilo: { g: [2, 6, 8], rate: 2.05 }, mira: { g: [2, 6, 10], rate: 2.1 }, tob: { g: [1, 6, 8], rate: 2.0 }, sabi: { g: [2, 8, 10], rate: 2.0 },
  hollis: { g: [0, 3, 5, 9], rate: 0.92, hello: 0.82 }, gull: { g: [0, 5, 7, 9], rate: 0.95, hello: 0.78 },
  bjarke: { g: [0, 4, 7, 9], rate: 0.88, hello: 0.74 }, hamid: { g: [1, 3, 5, 9], rate: 0.98, hello: 0.86 },
  fenwick: { g: [0, 3, 7], rate: 1.05, hello: 0.9 }, garrick: { g: [1, 4, 5, 7], rate: 1.0 },
};
function mumbleFor(id, v) {
  const m = MUMBLE[id] ?? {};
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // Fem stavelser per röst, valda efter namnet, så att varje figur låter lite olika
  const g = m.g ?? [0, 1, 2, 3, 4].map((k) => (h + k * 3 + (h >> (k + 2))) % 11).filter((x, i, a) => a.indexOf(x) === i);
  const rate = m.rate ?? Math.max(0.6, Math.min(2.1, (v?.f ?? 140) / 128));
  return { ...m, g, rate };
}

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
      // Ljudeffekterna har en egen volym (inställningar), musiken går direkt till master
      this.fx = c.createGain();
      this.fx.gain.value = this.fxLevel ?? 1;
      this.fx.connect(this.master);
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
      this.loadSamples();
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
      this.windGain.connect(this.fx);
      wind.start();
    } catch {
      this.ctx = null;
    }
  }

  // Regnet (0.11): brus genom ett bandpassfilter som sorlar, starkare ju mer det regnar
  setRain(level) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.rainGain) {
      if (level <= 0.001) return;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      this.rainGain = c.createGain();
      this.rainGain.gain.value = 0;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(this.rainGain);
      this.rainGain.connect(this.fx);
      src.start();
    }
    this.rainGain.gain.setTargetAtTime(level * 0.16, c.currentTime, 0.8);
  }

  // Ljudeffekternas volym, 0–1 (startmenyns inställningar)
  setFxLevel(v) {
    this.fxLevel = v;
    if (this.fx) this.fx.gain.value = v;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  get ok() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  gain(t0, attack, peak, decay, dest = this.fx) {
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

  // 0.18: inspelningarna (sounds/sfx.json, eller inbakade i den fristående versionen)
  async loadSamples() {
    if (this.buf || this.loading) return;
    this.loading = true;
    try {
      let map = globalThis.CELLO_SFX;
      if (!map) {
        const r = await fetch('sounds/sfx.json');
        if (!r.ok) throw new Error(r.status);
        map = await r.json();
      }
      const buf = {};
      await Promise.all(Object.entries(map).map(async ([k, b64]) => {
        const bin = atob(b64), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        try { buf[k] = await this.ctx.decodeAudioData(u.buffer); } catch { /* ett trasigt klipp hoppas över */ }
      }));
      this.buf = buf;
      this.makeGrains();
    } catch (err) {
      console.warn('Sound samples not loaded, using the synthesized sounds', err);
      this.buf = {};
    }
  }

  // 0.18.1: mumlet. Röstklippen (man_0–man_10) är en man som räknar (zero, one, two ...), så de kan inte spelas hela:
  // då hörs siffrorna. I stället klipps korta korn (60–110 ms) ur vokalerna mitt i varje ord, med mjuka kanter,
  // och varannan spelas baklänges. Ett mummel av sådana korn blir ett obegripligt "mhm-ehm-ohm" i stället för ord.
  makeGrains() {
    const c = this.ctx;
    this.grains = [];
    for (let k = 0; k <= 10; k++) {
      const b = this.buf[`man${k}`];
      if (!b) continue;
      const d = b.getChannelData(0), sr = b.sampleRate, win = Math.floor(sr * 0.01);
      // energin i 10 ms-fönster; vokalen är där den ligger över 45 % av toppen
      const env = [];
      for (let i = 0; i + win < d.length; i += win) {
        let e = 0;
        for (let j = 0; j < win; j++) e += d[i + j] * d[i + j];
        env.push(Math.sqrt(e / win));
      }
      const top = Math.max(...env);
      const loud = env.map((e, i) => (e > top * 0.45 ? i : -1)).filter((i) => i >= 0);
      if (!loud.length) continue;
      const a0 = loud[0] * win, a1 = (loud[loud.length - 1] + 1) * win;
      const n = 3;
      for (let q = 0; q < n; q++) {
        const len = Math.floor(sr * (0.06 + Math.random() * 0.05));
        const span = Math.max(1, a1 - a0 - len);
        const st = a0 + Math.floor((span * (q + 0.5)) / n);
        for (const rev of [false, true]) {
          const g = c.createBuffer(1, len, sr), o = g.getChannelData(0);
          for (let i = 0; i < len; i++) {
            const x = i / (len - 1);
            const w = Math.sin(Math.PI * Math.min(1, x * 1.6, (1 - x) * 1.6) / 2) ** 2; // mjuk in- och uttoning
            o[i] = d[Math.min(d.length - 1, st + (rev ? len - 1 - i : i))] * w;
          }
          this.grains.push({ clip: k, buf: g });
        }
      }
    }
  }

  // Spelar ett klipp. Returnerar källan (eller null om klippet inte finns).
  sample(key, { vol = 1, rate = 1, delay = 0, dest = this.fx, filter = null } = {}) {
    const b = this.buf?.[key];
    if (!b) return null;
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = vol;
    let node = src;
    if (filter) { node.connect(filter); node = filter; }
    node.connect(g);
    g.connect(dest);
    src.start(t);
    return src;
  }

  playSpec(spec, v, opt) {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const one = (sp, extraDelay = 0) => {
      const rate = (sp.rate ?? 1) * (opt.rate ?? 1) * (1 + (Math.random() - 0.5) * 2 * (sp.jit ?? 0.03));
      return this.sample(pick(sp.s), { vol: (sp.vol ?? 1) * v, rate, delay: (opt.delay || 0) + (sp.delay || 0) + extraDelay });
    };
    const ok = one(spec);
    for (const a of spec.also ?? []) one(a);
    return !!ok;
  }

  // Ett "hello" när man börjar prata med vissa glada gubbar (klippet Elias skickade)
  greet(voiceId) {
    if (!this.ok || !this.buf) return;
    const m = MUMBLE[voiceId];
    if (!m?.hello) return;
    this.sample('hello', { vol: 0.55, rate: m.hello * (1 + (Math.random() - 0.5) * 0.04) });
    this.mumbleUntil = this.ctx.currentTime + 1.1 / m.hello;
  }

  // Mummel när någon pratar i en textruta
  blip(voiceId) {
    if (!this.ok) return;
    const v = VOICES[voiceId];
    if (!v) return;
    const t = this.ctx.currentTime;
    // 0.18: en stavelse ur röstklippen i figurens tonläge (en i taget, så att det blir ett mummel, inte ett sorl)
    if (this.grains?.length) {
      if (t < (this.mumbleUntil ?? 0)) return;
      const m = mumbleFor(voiceId, v);
      const pool = this.grains.filter((gr) => m.g.includes(gr.clip));
      const gr = (pool.length ? pool : this.grains)[Math.floor(Math.random() * (pool.length || this.grains.length))];
      // tonläget: figurens grundton, lite melodi upp och ner som i ett riktigt prat
      this.mumbleN = (this.mumbleN ?? 0) + 1;
      const tune = 1 + Math.sin(this.mumbleN * 1.7) * 0.07 + (Math.random() - 0.5) * 0.08;
      const rate = m.rate * tune;
      let filter = null;
      if (m.low || m.high) {
        filter = this.ctx.createBiquadFilter();
        filter.type = m.low ? 'lowpass' : 'highpass';
        filter.frequency.value = m.low || m.high;
      }
      const dest = m.echo ? this.echoBus(m.echo) : this.fx;
      const src = this.ctx.createBufferSource();
      src.buffer = gr.buf;
      src.playbackRate.setValueAtTime(rate, t);
      src.playbackRate.linearRampToValueAtTime(rate * (Math.random() < 0.5 ? 0.94 : 1.05), t + gr.buf.duration / rate);
      const gn = this.ctx.createGain();
      gn.gain.value = 0.62;
      let node = src;
      if (filter) { node.connect(filter); node = filter; }
      node.connect(gn);
      gn.connect(dest);
      src.start(t);
      const len = gr.buf.duration / rate;
      // en kort paus mellan stavelserna, ibland lite längre (som mellan ord)
      this.mumbleUntil = t + len + 0.025 + (Math.random() < 0.22 ? 0.09 : Math.random() * 0.04);
      if (!m.synth) return;
    }
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

  // Ett eko (för andar och gudar)
  echoBus(fb) {
    this.echoes = this.echoes || {};
    const k = fb.toFixed(2);
    if (this.echoes[k]) return this.echoes[k];
    const c = this.ctx, inp = c.createGain(), d = c.createDelay(1), f = c.createGain(), lp = c.createBiquadFilter();
    d.delayTime.value = 0.17;
    f.gain.value = fb;
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    inp.connect(this.fx);
    inp.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(this.fx);
    return (this.echoes[k] = inp);
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
    // 0.18: inspelningar först (fotsteg efter underlaget)
    if (this.buf) {
      if (name === 'step' && opt.surface && STEPS_ON[opt.surface]) {
        const base = STEPS_ON[opt.surface];
        this.stepK = ((this.stepK ?? 0) + 1 + Math.floor(Math.random() * 2)) % 4;
        if (this.sample(`${base}${this.stepK + 1}`, { vol: 0.45 * v, rate: 1 + (Math.random() - 0.5) * 0.12 })) return;
      }
      const spec = SAMPLES[name];
      if (spec && this.playSpec(spec, v, opt) && !spec.synth) return;
      if (spec && !this.buf[spec.s[0]] && !SYNTH_HAS.has(name)) return;
    }
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
      // ---------- 0.10: pyramidens djup ----------
      case 'sandrush': // sand som rinner i en ström
        this.noiseThrough('bandpass', 1800, 700, 0.7, t, 1.1, this.gain(t, 0.2, 0.32 * v, 0.9));
        this.noiseThrough('lowpass', 500, 200, 0.6, t, 1.0, this.gain(t, 0.15, 0.2 * v, 0.9), this.brown);
        break;
      case 'sandfall': // en ridå av sand rasar från taket
        this.noiseThrough('highpass', 2400, 1200, 0.6, t, 1.4, this.gain(t, 0.08, 0.26 * v, 1.3));
        this.noiseThrough('lowpass', 300, 120, 0.7, t, 0.8, this.gain(t, 0.01, 0.35 * v, 0.8), this.brown);
        break;
      case 'boulder': // en stenkula börjar rulla
        this.noiseThrough('lowpass', 160, 60, 0.9, t, 2.4, this.gain(t, 0.3, 0.7 * v, 2.0), this.brown);
        this.osc('sine', 48, 36, t, 2.2, this.gain(t, 0.3, 0.3 * v, 1.9));
        break;
      case 'crystal': // solkristallen delar ljuset
        [1318.5, 1975.5, 2637].forEach((f, i) => this.osc('sine', f, f, t + i * 0.05, 0.6, this.gain(t + i * 0.05, 0.003, 0.06 * v, 0.6)));
        break;
      case 'rotor': // solvisarens spegel tar ett steg
        this.osc('square', 220, 180, t, 0.08, this.lowpass(this.gain(t, 0.002, 0.08 * v, 0.08), 1200));
        this.noiseThrough('bandpass', 900, 500, 1.2, t, 0.12, this.gain(t, 0.004, 0.12 * v, 0.12));
        break;
      case 'hourglass': // timglaset vänds: ett dovt slag och sand som börjar rinna
        this.osc('sine', 110, 70, t, 0.6, this.gain(t, 0.005, 0.5 * v, 0.6));
        this.noiseThrough('bandpass', 1500, 900, 0.8, t + 0.2, 3.2, this.gain(t + 0.2, 0.4, 0.22 * v, 2.8));
        [523.25, 783.99].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.12, 0.8, this.gain(t + i * 0.12, 0.004, 0.08 * v, 0.8)));
        break;
      // ---------- 0.9: startmenyn ----------
      case 'menuMove': // markören flyttas: en liten kristallklang
        this.osc('sine', 1318.5, 1318.5, t, 0.09, this.gain(t, 0.002, 0.07 * v, 0.09));
        this.osc('triangle', 659.25, 659.25, t, 0.07, this.gain(t, 0.002, 0.05 * v, 0.07));
        break;
      case 'menuSelect': // välj: två toner uppåt och lite gnistor
        [[783.99, 0], [1174.66, 0.07]].forEach(([f, d]) => this.osc('triangle', f, f, t + d, 0.3, this.gain(t + d, 0.003, 0.16 * v, 0.3)));
        this.osc('sine', 2349.3, 2349.3, t + 0.07, 0.4, this.gain(t + 0.07, 0.003, 0.04 * v, 0.4));
        this.noiseThrough('highpass', 7000, 9000, 0.7, t + 0.05, 0.25, this.gain(t + 0.05, 0.01, 0.05 * v, 0.25));
        break;
      case 'menuBack': // tillbaka: två toner nedåt
        [[659.25, 0], [440, 0.07]].forEach(([f, d]) => this.osc('triangle', f, f, t + d, 0.22, this.gain(t + d, 0.003, 0.13 * v, 0.22)));
        break;
      case 'menuDeny': // går inte
        this.osc('square', 150, 130, t, 0.14, this.lowpass(this.gain(t, 0.003, 0.09 * v, 0.14), 900));
        this.osc('square', 150, 130, t + 0.16, 0.14, this.lowpass(this.gain(t + 0.16, 0.003, 0.08 * v, 0.14), 900));
        break;
      case 'menuOpen': { // första knapptrycket: ett andetag av vind och ett ackord som sväller
        this.noiseThrough('bandpass', 260, 1400, 0.8, t, 1.4, this.gain(t, 0.5, 0.22 * v, 0.9), this.brown);
        const g = this.gain(t, 0.35, 0.12 * v, 1.6);
        const lp = this.lowpass(g, 1500);
        for (const f of [196, 293.66, 392, 587.33]) this.osc('sawtooth', f, f, t, 2.0, lp);
        [1174.66, 1567.98].forEach((f, i) => this.osc('sine', f, f, t + 0.3 + i * 0.12, 1.0, this.gain(t + 0.3 + i * 0.12, 0.01, 0.05 * v, 1.0)));
        break;
      }
      case 'menuStart': { // resan börjar: dovt slag, åska och en stigande klang
        this.osc('sine', 82, 30, t, 1.4, this.gain(t, 0.004, 0.9 * v, 1.4));
        this.noiseThrough('lowpass', 420, 60, 0.6, t + 0.05, 2.8, this.gain(t + 0.05, 0.06, 0.65 * v, 2.6), this.brown);
        [523.25, 783.99, 1046.5, 1567.98, 2093].forEach((f, i) => {
          const ti = t + 0.15 + i * 0.09;
          this.osc('triangle', f, f, ti, 0.9, this.gain(ti, 0.004, 0.11 * v, 0.9));
        });
        this.noiseThrough('bandpass', 400, 3600, 0.9, t, 1.1, this.gain(t, 0.3, 0.16 * v, 0.7));
        break;
      }
      case 'menuErase': // en fil raderas: något som smulas sönder
        this.noiseThrough('lowpass', 1600, 120, 0.7, t, 0.9, this.gain(t, 0.005, 0.4 * v, 0.9), this.brown);
        this.osc('triangle', 440, 110, t, 0.7, this.gain(t, 0.004, 0.12 * v, 0.7));
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
      case 'pour': // olja hälls i lyktan (0.15): ett gluggande ljud som går uppåt
        for (let i = 0; i < 5; i++) {
          const ti = t + i * 0.09;
          this.osc('sine', 260 + i * 40, 200 + i * 50, ti, 0.08, this.gain(ti, 0.005, 0.18 * v, 0.08));
        }
        this.noiseThrough('bandpass', 900, 1400, 2, t, 0.5, this.gain(t, 0.03, 0.08 * v, 0.5));
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
      case 'neigh': { // en häst gnäggar: en darrande ton som stiger och faller
        const g = this.lowpass(this.gain(t, 0.03, 0.2 * v, 0.9), 2600);
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(520 * r, t);
        for (let k = 0; k < 16; k++) o.frequency.setValueAtTime((k % 2 ? 560 : 640) * r * (1 - k * 0.025), t + k * 0.05);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.9);
        this.noiseThrough('lowpass', 500, 300, 1, t + 0.7, 0.3, this.gain(t + 0.7, 0.02, 0.12 * v, 0.3));
        break;
      }
      // ---------- 0.12: de dödas värld och vattnet ----------
      case 'chime': // klockorna i The Galecrown
        for (const [f, d] of [[523, 0], [659, 0.15], [784, 0.3], [1046, 0.45]]) {
          this.osc('sine', f, f, t + d, 2.2, this.gain(t + d, 0.004, 0.12 * v, 2.2));
          this.osc('sine', f * 2.01, f * 2.01, t + d, 1.4, this.gain(t + d, 0.004, 0.03 * v, 1.4));
        }
        break;
      case 'swifton': // sandalerna: ett lätt vingflax och en stigande glans
        this.noiseThrough('bandpass', 2400, 4200, 1.5, t, 0.25, this.gain(t, 0.01, 0.12 * v, 0.25));
        for (const [f, d] of [[880, 0], [1320, 0.06], [1760, 0.12]]) this.osc('triangle', f, f, t + d, 0.25, this.gain(t + d, 0.005, 0.07 * v, 0.25));
        break;
      case 'swiftoff':
        this.osc('triangle', 1320, 660, t, 0.2, this.gain(t, 0.005, 0.06 * v, 0.2));
        break;
      case 'wallrun': // fötter mot sten och vind
        this.noiseThrough('bandpass', 900, 1800, 1.2, t, 0.5, this.gain(t, 0.05, 0.12 * v, 0.45));
        this.osc('sine', 520, 700, t, 0.2, this.gain(t, 0.01, 0.05 * v, 0.2));
        break;
      case 'typhoon': // Typhons vind: ett djupt vrål av luft
        this.noiseThrough('lowpass', 300, 1200, 0.8, t, 2.2, this.gain(t, 0.4, 0.4 * v, 1.6), this.brown);
        this.noiseThrough('bandpass', 1200, 2600, 1.5, t + 0.3, 1.6, this.gain(t + 0.3, 0.4, 0.1 * v, 1.2));
        break;
      case 'realmdown': // vågskålen tippar ner i de dödas värld: ett djupt sus och en sjunkande ton
        this.noiseThrough('lowpass', 1600, 200, 0.7, t, 0.9, this.gain(t, 0.08, 0.3 * v, 0.85), this.brown);
        this.osc('sine', 330, 110, t, 0.9, this.gain(t, 0.05, 0.16 * v, 0.9));
        this.osc('triangle', 660, 220, t + 0.05, 0.7, this.gain(t + 0.05, 0.05, 0.05 * v, 0.7));
        break;
      case 'realmup': // tillbaka bland de levande: en stigande, ljus ton
        this.osc('sine', 220, 660, t, 0.6, this.gain(t, 0.04, 0.14 * v, 0.6));
        this.osc('triangle', 880, 1320, t + 0.1, 0.4, this.gain(t + 0.1, 0.02, 0.05 * v, 0.4));
        break;
      case 'splash': // något faller i vattnet
        this.noiseThrough('bandpass', 1400, 400, 0.8, t, 0.5, this.gain(t, 0.01, 0.4 * v, 0.48));
        this.osc('sine', 180, 60, t, 0.25, this.gain(t, 0.005, 0.2 * v, 0.25));
        break;
      // ---------- 0.15: simning ----------
      case 'tide': // vattnet stiger eller sjunker: ett djupt brus
        this.noiseThrough('lowpass', 500, 180, 0.8, t, 2.2, this.gain(t, 0.4, 0.35 * v, 2.2));
        this.osc('sine', 70, 52, t, 2.0, this.gain(t, 0.3, 0.12 * v, 2.0));
        break;
      case 'dash': // treuddens stöt: ett vattensus och en ton
        this.noiseThrough('bandpass', 1200, 500, 1.2, t, 0.45, this.gain(t, 0.01, 0.32 * v, 0.45));
        this.osc('triangle', 520, 880, t, 0.2, this.gain(t, 0.005, 0.1 * v, 0.2));
        break;
      case 'dive': // ner under ytan: ett bubbligt sus
        this.noiseThrough('lowpass', 1800, 300, 1, t, 0.6, this.gain(t, 0.02, 0.3 * v, 0.6));
        for (let i = 0; i < 4; i++) this.osc('sine', 500 + i * 140, 900 + i * 160, t + 0.08 + i * 0.07, 0.06, this.gain(t + 0.08 + i * 0.07, 0.004, 0.08 * v, 0.06));
        break;
      case 'surface': // upp till ytan: ett andetag
        this.noiseThrough('bandpass', 900, 2200, 1.2, t, 0.35, this.gain(t, 0.03, 0.2 * v, 0.35));
        this.noiseThrough('lowpass', 1200, 600, 1, t, 0.3, this.gain(t, 0.01, 0.15 * v, 0.3));
        break;
      case 'stroke': // ett simtag
        this.noiseThrough('bandpass', 700, 1100, 1.5, t, 0.22, this.gain(t, 0.03, 0.12 * v, 0.22));
        break;
      case 'choke': // luften tar slut: ett gurgel
        for (let i = 0; i < 5; i++) this.osc('sine', 260 - i * 20, 140, t + i * 0.06, 0.07, this.gain(t + i * 0.06, 0.004, 0.18 * v, 0.07));
        break;
      // ---------- 0.16: is, masken och vargen ----------
      case 'shadowcast': // masken kastar skuggan: ett mörkt sus som stiger
        this.noiseThrough('bandpass', 600, 1800, 2, t, 0.35, this.gain(t, 0.01, 0.25 * v, 0.35));
        this.osc('triangle', 220, 660, t, 0.3, this.gain(t, 0.01, 0.1 * v, 0.3));
        break;
      case 'shadowswap': // Cello byter plats med skuggan: två toner som korsar varandra
        this.osc('triangle', 330, 880, t, 0.22, this.gain(t, 0.005, 0.14 * v, 0.22));
        this.osc('triangle', 880, 330, t, 0.22, this.gain(t, 0.005, 0.14 * v, 0.22));
        this.noiseThrough('highpass', 2500, 4000, 1, t, 0.2, this.gain(t, 0.005, 0.12 * v, 0.2));
        break;
      case 'shadowland': // skuggan landar
        this.osc('sine', 300, 180, t, 0.18, this.gain(t, 0.005, 0.12 * v, 0.18));
        break;
      case 'glide': // Cello glider på isen: ett vasst skrap
        this.noiseThrough('highpass', 3200, 1800, 2, t, 0.5, this.gain(t, 0.02, 0.12 * v, 0.5));
        break;
      case 'icecrack': // isen spricker
        for (let i = 0; i < 4; i++) this.noiseThrough('bandpass', 2400 - i * 300, 900, 3, t + i * 0.05, 0.08, this.gain(t + i * 0.05, 0.002, 0.25 * v, 0.08));
        this.osc('sine', 120, 60, t, 0.3, this.gain(t, 0.01, 0.15 * v, 0.3));
        break;
      case 'howl': // vargen ylar
        this.osc('sawtooth', 300, 620, t, 0.6, this.gain(t, 0.1, 0.12 * v, 0.6));
        this.osc('sawtooth', 620, 420, t + 0.6, 1.2, this.gain(t + 0.6, 0.05, 0.12 * v, 1.2));
        this.osc('sine', 610, 410, t + 0.6, 1.2, this.gain(t + 0.6, 0.05, 0.1 * v, 1.2));
        break;
      case 'bubble': // en enstaka bubbla
        this.osc('sine', 700 + Math.random() * 500, 1500 + Math.random() * 600, t, 0.05, this.gain(t, 0.003, 0.05 * v, 0.05));
        break;
      // ---------- 0.11: flöjten ----------
      case 'note': { // en flöjtton: sinus med lite vibrato, en svag oktav och andning
        const f = opt.f ?? 440, dur = 0.6;
        const g = this.gain(t, 0.04, 0.2 * v, dur);
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        lfo.frequency.value = 5.2;
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.25);
        lfo.connect(lg);
        lg.connect(o.frequency);
        o.connect(g);
        o.start(t); lfo.start(t);
        o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
        this.osc('triangle', f * 2, f * 2, t, dur * 0.8, this.gain(t, 0.05, 0.035 * v, dur * 0.8));
        this.noiseThrough('bandpass', f * 3, f * 2.5, 2, t, 0.16, this.gain(t, 0.01, 0.05 * v, 0.15));
        break;
      }
      case 'songok': // rätt melodi: ett glittrande ackord
        [784, 988, 1175, 1568, 1976].forEach((f, i) => {
          const ti = t + i * 0.05;
          this.osc('triangle', f, f, ti, 0.7, this.gain(ti, 0.005, 0.07 * v, 0.7));
        });
        break;
      case 'songbad': // fel ton i en lektion
        this.osc('square', 220, 160, t, 0.22, this.lowpass(this.gain(t, 0.005, 0.12 * v, 0.22), 1200));
        break;
      // ---------- 0.11: humör ----------
      case 'huff': // någon fnyser argt
        this.noiseThrough('bandpass', 900, 500, 1.2, t, 0.28, this.gain(t, 0.02, 0.28 * v, 0.26));
        this.voice(150 * r, 95 * r, 0.22, 0.32 * v, [[480, 4], [950, 5]], t + 0.02);
        break;
      case 'sniff': // ett barn snörvlar
        for (let i = 0; i < 2; i++) this.noiseThrough('bandpass', 2600, 3400, 2.5, t + i * 0.16, 0.1, this.gain(t + i * 0.16, 0.01, 0.16 * v, 0.1));
        this.voice(520 * r, 380 * r, 0.25, 0.15 * v, [[1000, 4], [2000, 5]], t + 0.36);
        break;
      // ---------- 0.7: Grumble ----------
      case 'hoof': // hovslag när Cello rider
        this.noiseThrough('bandpass', 900 * r, 700, 3, t, 0.06, this.gain(t, 0.002, 0.22 * v, 0.06));
        this.osc('sine', 160 * r, 90, t, 0.07, this.gain(t, 0.002, 0.16 * v, 0.07));
        break;
      case 'ram': { // Grumbles djupa bräkande
        const g = this.lowpass(this.gain(t, 0.03, 0.2 * v, 0.7), 1500);
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        for (let k = 0; k < 14; k++) o.frequency.setValueAtTime((k % 2 ? 205 : 240) * r * (1 - k * 0.012), t + k * 0.05);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.72);
        break;
      }
      case 'horn': // hornet som kallar på Grumble: två långa toner
        [[220, 0, 0.5], [294, 0.45, 0.9]].forEach(([f, d, len]) => {
          const ti = t + d;
          const g = this.lowpass(this.gain(ti, 0.06, 0.2 * v, len), 1800);
          this.osc('sawtooth', f, f * 0.99, ti, len, g);
          this.osc('triangle', f * 2, f * 2, ti, len, this.gain(ti, 0.06, 0.05 * v, len));
        });
        break;
      // ---------- 0.7: solljus, pyramiden och dess väktare ----------
      case 'stonegrind': // en spegel eller stenplatta vrids
        this.noiseThrough('bandpass', 260, 180, 2.5, t, 0.45, this.gain(t, 0.03, 0.35 * v, 0.42), this.brown);
        this.osc('sawtooth', 48, 44, t, 0.4, this.lowpass(this.gain(t, 0.03, 0.12 * v, 0.4), 200));
        break;
      case 'sunchime': // ett solöga vaknar
        [784, 988, 1175, 1568].forEach((f, i) => {
          const ti = t + i * 0.07;
          this.osc('sine', f, f, ti, 0.9, this.gain(ti, 0.005, 0.12 * v, 0.9));
          this.osc('triangle', f * 2, f * 2, ti, 0.4, this.gain(ti, 0.005, 0.03 * v, 0.4));
        });
        break;
      case 'sizzle': // ljuset bränner skugga
        this.noiseThrough('highpass', 4200, 6000, 0.7, t, 0.3, this.gain(t, 0.01, 0.12 * v, 0.3));
        break;
      case 'veilburn': // en skuggslöja brinner upp
        this.noiseThrough('bandpass', 600, 2400, 0.8, t, 0.9, this.gain(t, 0.05, 0.4 * v, 0.85));
        this.osc('sine', 220, 660, t, 0.6, this.gain(t, 0.05, 0.12 * v, 0.6));
        this.osc('sine', 1320, 1760, t + 0.2, 0.5, this.gain(t + 0.2, 0.01, 0.06 * v, 0.5));
        break;
      case 'prismup': // prisman lyfts: ett kristallklart ackord
        [1047, 1319, 1568].forEach((f, i) => this.osc('triangle', f, f * 1.01, t + i * 0.03, 0.35, this.gain(t + i * 0.03, 0.004, 0.08 * v, 0.35)));
        break;
      case 'prismdown':
        [1568, 1319].forEach((f, i) => this.osc('triangle', f, f * 0.98, t + i * 0.04, 0.2, this.gain(t + i * 0.04, 0.004, 0.06 * v, 0.2)));
        break;
      case 'hiss': { // ormen väser
        const g = this.gain(t, 0.08, 0.35 * v, 1.1);
        this.noiseThrough('highpass', 3200, 2200, 0.8, t, 1.1, g);
        this.osc('sawtooth', 90, 70, t, 0.9, this.lowpass(this.gain(t, 0.1, 0.12 * v, 0.9), 300));
        break;
      }
      case 'shriek': { // ormen skriker när solljuset bränner den
        const g = this.lowpass(this.gain(t, 0.02, 0.4 * v, 1.0), 2400);
        this.osc('sawtooth', 820 * r, 260, t, 1.0, g);
        this.osc('square', 410 * r, 140, t, 1.0, this.lowpass(this.gain(t, 0.02, 0.12 * v, 1.0), 1200));
        this.noiseThrough('bandpass', 1800, 700, 1.5, t, 0.8, this.gain(t, 0.02, 0.25 * v, 0.8));
        break;
      }
      case 'scarab': // skalbaggen klickar och skrapar
        for (let i = 0; i < 5; i++) {
          const ti = t + i * 0.06;
          this.noiseThrough('bandpass', 2400 + i * 200, 1800, 4, ti, 0.04, this.gain(ti, 0.001, 0.2 * v, 0.04));
        }
        this.osc('sawtooth', 70, 50, t, 0.35, this.lowpass(this.gain(t, 0.02, 0.15 * v, 0.35), 260));
        break;
      case 'flip': // skalbaggen vänds på rygg
        this.osc('sine', 120, 40, t, 0.5, this.gain(t, 0.004, 0.7 * v, 0.5));
        this.noiseThrough('lowpass', 800, 200, 0.8, t, 0.5, this.gain(t, 0.01, 0.4 * v, 0.5), this.brown);
        this.osc('triangle', 520, 260, t + 0.05, 0.3, this.gain(t + 0.05, 0.003, 0.12 * v, 0.3));
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

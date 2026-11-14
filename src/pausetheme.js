// Pausmenyns egen låt (0.19): "Hearth Lullaby". En vaggvisa i 3/4-takt i d-moll, skriven och spelad med kod:
// en speldosa sjunger melodin, en harpa plockar ackorden och en mjuk stråkmatta ligger under, allt i ett rum
// med lite efterklang. Sexton takter som går runt så länge spelet står stilla.
const BPM = 76, BEAT = 60 / BPM;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Ackorden, en per takt (grundton och ackordtoner som MIDI-nummer)
const CHORDS = [
  [50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55], // Dm Bb F C
  [50, 53, 57], [43, 46, 50], [46, 50, 53], [45, 49, 52], // Dm Gm Bb A
  [53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53], // F C Dm Bb
  [43, 46, 50], [45, 49, 52], [50, 53, 57], [50, 53, 57], // Gm A Dm Dm
];
// Melodin: [takt, slag, MIDI, längd i slag]
const MELODY = [
  [0, 0, 69, 2], [0, 2, 74, 1],
  [1, 0, 77, 2], [1, 2, 76, 0.5], [1, 2.5, 74, 0.5],
  [2, 0, 72, 2], [2, 2, 69, 1],
  [3, 0, 67, 1], [3, 1, 69, 1], [3, 2, 72, 1],
  [4, 0, 69, 2], [4, 2, 77, 1],
  [5, 0, 79, 1.5], [5, 1.5, 77, 0.5], [5, 2, 74, 1],
  [6, 0, 77, 1], [6, 1, 74, 1], [6, 2, 70, 1],
  [7, 0, 73, 2], [7, 2, 76, 1],
  [8, 0, 81, 2], [8, 2, 79, 0.5], [8, 2.5, 77, 0.5],
  [9, 0, 76, 2], [9, 2, 72, 1],
  [10, 0, 74, 1], [10, 1, 77, 1], [10, 2, 81, 1],
  [11, 0, 79, 2], [11, 2, 77, 1],
  [12, 0, 74, 1.5], [12, 1.5, 70, 0.5], [12, 2, 74, 1],
  [13, 0, 76, 1], [13, 1, 73, 1], [13, 2, 69, 1],
  [14, 0, 74, 3],
  [15, 0, 69, 1], [15, 1, 65, 1], [15, 2, 64, 1],
];
const BARS = CHORDS.length, LOOP = BARS * 3 * BEAT;

export class PauseTheme {
  constructor(sfx) {
    this.sfx = sfx;
    this.on = false;
    this.out = null;
    this.timer = null;
    this.volume = 0.6;
  }

  setup() {
    const c = this.sfx.ctx;
    if (!c || this.out) return !!this.out;
    this.out = c.createGain();
    this.out.gain.value = 0;
    this.out.connect(this.sfx.master);
    // Efterklangen: brus som tonar ut på 2,4 sekunder
    const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    this.rev = c.createConvolver();
    this.rev.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.42;
    this.rev.connect(wet);
    wet.connect(this.out);
    this.dry = c.createGain();
    this.dry.gain.value = 0.8;
    this.dry.connect(this.out);
    this.dry.connect(this.rev);
    return true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.out && this.on) this.out.gain.setTargetAtTime(v, this.sfx.ctx.currentTime, 0.2);
  }

  start() {
    if (this.on || !this.sfx.ctx || !this.setup()) return;
    const c = this.sfx.ctx;
    this.on = true;
    this.t0 = c.currentTime + 0.15;
    this.next = 0; // nästa takt att schemalägga (räknas uppåt för alltid)
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setValueAtTime(this.out.gain.value, c.currentTime);
    this.out.gain.linearRampToValueAtTime(this.volume, c.currentTime + 1.2);
    this.tick();
    this.timer = setInterval(() => this.tick(), 120);
  }

  stop() {
    if (!this.on) return;
    const c = this.sfx.ctx;
    this.on = false;
    clearInterval(this.timer);
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setValueAtTime(this.out.gain.value, c.currentTime);
    this.out.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
  }

  // Schemalägger takterna som börjar inom den närmaste sekunden
  tick() {
    const c = this.sfx.ctx;
    while (this.on && this.t0 + this.next * 3 * BEAT < c.currentTime + 1.0) {
      const bar = this.next % BARS, tb = this.t0 + this.next * 3 * BEAT;
      const ch = CHORDS[bar];
      // harpan: grundton, kvint, oktav (en ton per slag), och matta under hela takten
      this.pluck(mtof(ch[0] - 12), tb, 0.22);
      this.pluck(mtof(ch[2] - 12 + (ch[2] - ch[0] > 6 ? 0 : 0)), tb + BEAT, 0.15);
      this.pluck(mtof(ch[0]), tb + 2 * BEAT, 0.14);
      this.pad(ch, tb, 3 * BEAT);
      for (const [b, beat, m, len] of MELODY) if (b === bar) this.box(mtof(m), tb + beat * BEAT, len * BEAT);
      // varannan gång: en liten stjärna en oktav upp i sista takten
      if (bar === BARS - 1 && Math.floor(this.next / BARS) % 2 === 1) this.box(mtof(86), tb + 2.5 * BEAT, BEAT, 0.05);
      this.next++;
    }
  }

  // Speldosan: två sinustoner (grundton och oktav) med snabb attack och lång avklingning
  box(f, t, len, vol = 0.12) {
    const c = this.sfx.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(1.2, len * 1.6));
    g.connect(this.dry);
    for (const [mul, k] of [[1, 1], [2, 0.35], [3.01, 0.12]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      og.gain.value = k;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + Math.max(1.3, len * 1.7));
    }
  }

  // Harpan: en triangelvåg genom ett lågpassfilter som stängs
  pluck(f, t, vol) {
    const c = this.sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(), o = c.createOscillator();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(lp);
    lp.connect(g);
    g.connect(this.dry);
    o.start(t);
    o.stop(t + 1.7);
  }

  // Stråkmattan: två svagt ostämda sågtänder per ackordton, mjukt in och ut, genom ett mörkt filter
  pad(ch, t, len) {
    const c = this.sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.022, t + len * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
    lp.connect(g);
    g.connect(this.dry);
    for (const m of ch) for (const det of [-6, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + len + 0.3);
    }
  }
}

export const PAUSE_LOOP_SECONDS = LOOP;

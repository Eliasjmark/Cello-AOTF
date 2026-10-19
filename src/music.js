// Musiken: Elias soundtrack "Hearth of the Hollow" (Treblo), kopplat till platser och händelser.
//
// Tre "däck" (ljudspelare) som tonar in i varandra. Ett spår som Cello lämnar minns var det
// slutade, så att Aetherias musik fortsätter där den var när han kommer tillbaka.
// Ljudet går genom Web Audio, så att M (ljud av) och textrutornas sänkning gäller även musiken.

// gain: utjämnar ljudstyrkan mellan spåren · resume: fortsätt där spåret slutade · once: spelas inte i slinga
export const TRACKS = {
  hymn: { file: 'hymn-of-the-wandering-hero.mp3', gain: 0.8 },
  willowmere: { file: 'morning-in-willowmere.mp3', gain: 0.85, resume: true },
  whispers: { file: 'whispers-of-the-hollow-woods.mp3', gain: 0.9 },
  fieldsdawn: { file: 'fields-at-dawn.mp3', gain: 0.86 },
  forgotten: { file: 'fields-of-the-forgotten-crown.mp3', gain: 0.98, resume: true },
  firstlight: { file: 'village-at-first-light.mp3', gain: 0.92, resume: true },
  hearth: { file: 'the-hearth-and-the-meadow.mp3', gain: 1.25, resume: true },
  quiet: { file: 'the-quiet-hour-before-quest.mp3', gain: 0.82 },
  ballad: { file: 'ballad-of-the-wandering-hero.mp3', gain: 0.76 },
  greenroad: { file: 'the-green-road-calls.mp3', gain: 0.88, resume: true },
  gallop: { file: 'gallop-across-the-wildlands.mp3', gain: 0.96, resume: true },
  skull: { file: 'the-hollow-mask-watches.mp3', gain: 0.97, resume: true },
  march: { file: 'march-of-the-hollow-crown.mp3', gain: 0.78 },
  warlord: { file: 'the-warlords-approach.mp3', gain: 1.2 },
  dawn: { file: 'dawn-over-the-kingdom.mp3', gain: 0.94 },
};

// En tiondels sekund tystnad: används för att "låsa upp" ljudspelarna på iPhone vid första trycket
const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAykAWlpaWlpaWlpaWlpaWlpaWnt7e3t7e3t7e3t7e3t7e3t7nJycnJycnJycnJycnJycnL29vb29vb29vb29vb29vb293t7e3t7e3t7e3t7e3t7e3t7/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCowAAAAAAAAMpso+sIAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

export class Music {
  constructor(sfx, base = './music/') {
    this.sfx = sfx;
    this.base = base;
    this.volume = 0.75;
    this.enabled = true;
    this.decks = [];
    this.want = null; // spåret som ska höras nu
    this.positions = {}; // var spåren med resume slutade
    this.duck = 1;
    this.duckTarget = 1;
    this.duckT = 0;
    this.duckLevel = 1;
    this.talkDuck = 1;
    this.bus = null;
    this.unlocked = false;
    for (let i = 0; i < 3; i++) {
      const a = typeof Audio === 'function' ? new Audio() : null;
      if (a) {
        a.preload = 'none';
        a.loop = true;
        a.setAttribute('playsinline', '');
      }
      this.decks.push({ a, g: null, track: null, level: 0, target: 0, wantPlay: false });
    }
  }

  // Anropas vid första klicket eller tangenttrycket (då får webbläsaren spela ljud)
  unlock() {
    const ctx = this.sfx.ctx;
    if (!this.bus && ctx) {
      try {
        this.bus = ctx.createGain();
        this.bus.gain.value = this.volume;
        this.bus.connect(this.sfx.master);
        for (const d of this.decks) {
          if (!d.a) continue;
          d.g = ctx.createGain();
          d.g.gain.value = 0;
          ctx.createMediaElementSource(d.a).connect(d.g);
          d.g.connect(this.bus);
        }
      } catch {
        this.bus = null; // utan Web Audio används ljudspelarnas egen volym
      }
    }
    if (this.unlocked) return;
    this.unlocked = true;
    for (const d of this.decks) {
      if (!d.a || d.track) continue;
      d.a.src = SILENT;
      const p = d.a.play();
      if (p && p.then) p.then(() => { if (!d.track) d.a.pause(); }).catch(() => {});
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  // Sänk musiken en stund (t.ex. under en föremålsfanfar)
  duckFor(seconds, level = 0.2) {
    this.duckT = Math.max(this.duckT, seconds);
    this.duckLevel = level;
  }

  play(id) {
    this.want = id && TRACKS[id] ? id : null;
  }

  deckFor(id) {
    return this.decks.find((d) => d.track === id);
  }

  start(id) {
    // Välj det tystaste däcket, spara var dess spår slutade och ladda det nya
    let d = this.decks.filter((x) => x.a).sort((p, q) => p.level - q.level)[0];
    if (!d) return null;
    this.release(d);
    const t = TRACKS[id];
    d.track = id;
    d.level = 0;
    d.a.loop = !t.once;
    d.a.preload = 'auto';
    d.a.src = this.base + t.file;
    const at = t.resume ? this.positions[id] || 0 : 0;
    if (at > 0) {
      const seek = () => {
        try { d.a.currentTime = at; } catch { /* spåret är inte laddat än */ }
      };
      d.a.addEventListener('loadedmetadata', seek, { once: true });
    }
    d.wantPlay = true;
    this.tryPlay(d);
    return d;
  }

  tryPlay(d) {
    const p = d.a.play();
    if (p && p.catch) p.catch(() => { d.wantPlay = true; d.retry = 1; });
  }

  release(d) {
    if (!d.track) return;
    if (TRACKS[d.track]?.resume && d.a.currentTime > 1) this.positions[d.track] = d.a.currentTime;
    d.a.pause();
    d.track = null;
    d.level = 0;
  }

  update(dt) {
    if (!this.unlocked) return;
    const id = this.enabled ? this.want : null;
    if (id && !this.deckFor(id)) this.start(id);
    // Sänkningen: lite under samtal (talkDuck), mycket under fanfarer (duckFor)
    const base = this.talkDuck ?? 1;
    if (this.duckT > 0) {
      this.duckT -= dt;
      this.duckTarget = Math.min(this.duckLevel, base);
    } else this.duckTarget = base;
    this.duck += (this.duckTarget - this.duck) * Math.min(1, dt * (this.duckTarget < this.duck ? 8 : 1.5));
    for (const d of this.decks) {
      if (!d.track) continue;
      d.target = d.track === id ? 1 : 0;
      // In mjukt, ut lite snabbare
      const rate = d.target > d.level ? 0.5 : 0.7;
      d.level = d.target > d.level ? Math.min(d.target, d.level + dt * rate) : Math.max(d.target, d.level - dt * rate);
      const v = d.level * d.level * (TRACKS[d.track]?.gain ?? 1) * this.duck;
      if (d.g) d.g.gain.value = v;
      else d.a.volume = Math.min(1, v * this.volume * (this.sfx.muted ? 0 : 1));
      if (d.level <= 0 && d.target === 0) this.release(d);
      else if (d.a.paused && d.wantPlay && d.level > 0) {
        d.retry = (d.retry || 0) - dt;
        if (d.retry <= 0) { d.retry = 1; this.tryPlay(d); }
      }
    }
  }
}

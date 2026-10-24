// Dygnet (0.11): en klocka som går medan Cello är ute i världen.
// Ett helt dygn tar 20 minuter. Klockan styr ljuset, himlen, musiken, folkets scheman
// och vilka asklingar som är vakna.
export const HOUR_SECONDS = 50;

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (center, width, x) => Math.max(0, 1 - Math.abs(x - center) / width);

export class Clock {
  constructor() {
    this.hour = 8;
    this.day = 1;
    this.skip = null; // spolning fram till en viss tid (vila, Solens sång)
    this.onNewDay = null;
    this.onSkipDone = null;
  }

  load(s) {
    this.hour = Number.isFinite(s?.clock) ? s.clock : 10;
    this.day = Number.isFinite(s?.day) ? s.day : 1;
    this.skip = null;
  }

  store(s) {
    s.clock = Math.round(this.hour * 100) / 100;
    s.day = this.day;
  }

  addHours(h) {
    this.hour += h;
    while (this.hour >= 24) {
      this.hour -= 24;
      this.day++;
      this.onNewDay?.(this.day);
    }
  }

  // Timmar fram till nästa gång klockan visar `hour`
  hoursUntil(hour) {
    let d = hour - this.hour;
    if (d <= 0.01) d += 24;
    return d;
  }

  // Spola fram till `hour`; med dur > 0 syns det som ett snabbt dygn (solen rusar över himlen)
  skipTo(hour, dur = 0, onDone = null) {
    const total = this.hoursUntil(hour);
    if (dur <= 0) {
      this.addHours(total);
      onDone?.();
      return;
    }
    this.skip = { total, done: 0, dur, t: 0, onDone };
  }

  update(dt, running) {
    if (this.skip) {
      const sk = this.skip;
      sk.t += dt;
      const k = Math.min(1, sk.t / sk.dur);
      const want = sk.total * (k * k * (3 - 2 * k));
      this.addHours(want - sk.done);
      sk.done = want;
      if (k >= 1) {
        this.skip = null;
        sk.onDone?.();
      }
      return;
    }
    if (running) this.addHours(dt / HOUR_SECONDS);
  }

  get isNight() {
    return this.hour >= 20 || this.hour < 5.5;
  }

  // 0 mitt i natten, 1 mitt på dagen (gryning 5–7, skymning 18–20)
  get daylight() {
    const h = this.hour;
    return h < 12 ? smooth(5, 7, h) : 1 - smooth(18, 20, h);
  }

  // Varmt ljus i gryningen och skymningen
  get dusk() {
    const h = this.hour;
    return Math.max(bump(6, 1.3, h), bump(19, 1.4, h));
  }

  get label() {
    const h = this.hour;
    if (h >= 5 && h < 7) return 'Dawn';
    if (h >= 7 && h < 11) return 'Morning';
    if (h >= 11 && h < 13) return 'Noon';
    if (h >= 13 && h < 17.5) return 'Afternoon';
    if (h >= 17.5 && h < 20) return 'Dusk';
    return 'Night';
  }

  get text() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60 / 10) * 10;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
}

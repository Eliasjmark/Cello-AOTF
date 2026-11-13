// Startskärm, hjärtan, föremål, fästningens nycklar, kartan, rubriker, textremsor,
// meddelanden, filmkanter vid lock-on och tona-till-svart.
import { MapView } from './map.js';
const HEART_ROWS = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

export function heartSvg(id) {
  let rects = '';
  HEART_ROWS.forEach((row, y) => {
    [...row].forEach((c, x) => { if (c === '#') rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; });
  });
  return `<svg viewBox="0 0 7 6" aria-hidden="true" shape-rendering="crispEdges">
    <clipPath id="hc${id}"><rect class="clip" x="0" y="0" width="7" height="6"/></clipPath>
    <g class="empty">${rects}</g>
    <g class="full" clip-path="url(#hc${id})">${rects}<rect class="shine" x="1" y="1" width="1.02" height="1.02"/></g>
  </svg>`;
}

const px8 = (r) => `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
export const CLOCK_ICONS = {
  sun: px8('<rect x="3" y="0" width="2" height="1" fill="#ffd27a"/><rect x="3" y="7" width="2" height="1" fill="#ffd27a"/><rect x="0" y="3" width="1" height="2" fill="#ffd27a"/><rect x="7" y="3" width="1" height="2" fill="#ffd27a"/><rect x="2" y="2" width="4" height="4" fill="#ffc040"/><rect x="2" y="2" width="1" height="1" fill="#fff0b0"/><rect x="1" y="1" width="1" height="1" fill="#e0a030"/><rect x="6" y="1" width="1" height="1" fill="#e0a030"/><rect x="1" y="6" width="1" height="1" fill="#e0a030"/><rect x="6" y="6" width="1" height="1" fill="#e0a030"/>'),
  moon: px8('<rect x="3" y="1" width="3" height="1" fill="#dfe6f4"/><rect x="2" y="2" width="2" height="4" fill="#dfe6f4"/><rect x="3" y="6" width="3" height="1" fill="#dfe6f4"/><rect x="4" y="2" width="1" height="1" fill="#a8b4cc"/><rect x="4" y="5" width="1" height="1" fill="#a8b4cc"/><rect x="6" y="0" width="1" height="1" fill="#fff"/>'),
  rain: px8('<rect x="2" y="1" width="4" height="1" fill="#9aa4b4"/><rect x="1" y="2" width="6" height="2" fill="#9aa4b4"/><rect x="2" y="5" width="1" height="2" fill="#7ab4ff"/><rect x="4" y="5" width="1" height="2" fill="#7ab4ff"/><rect x="6" y="5" width="1" height="2" fill="#7ab4ff"/>'),
  storm: px8('<rect x="2" y="0" width="4" height="1" fill="#6a7284"/><rect x="1" y="1" width="6" height="2" fill="#6a7284"/><rect x="4" y="3" width="2" height="1" fill="#ffe46a"/><rect x="3" y="4" width="2" height="1" fill="#ffe46a"/><rect x="4" y="5" width="2" height="1" fill="#ffe46a"/><rect x="3" y="6" width="2" height="1" fill="#ffe46a"/><rect x="1" y="4" width="1" height="2" fill="#7ab4ff"/>'),
  fog: px8('<rect x="0" y="1" width="6" height="1" fill="#b8bec8"/><rect x="2" y="3" width="6" height="1" fill="#9aa2ae"/><rect x="0" y="5" width="7" height="1" fill="#b8bec8"/><rect x="3" y="7" width="4" height="1" fill="#9aa2ae"/>'),
  haze: px8('<rect x="0" y="1" width="6" height="1" fill="#d8b47a"/><rect x="2" y="3" width="6" height="1" fill="#b8925a"/><rect x="0" y="5" width="7" height="1" fill="#d8b47a"/><rect x="3" y="7" width="4" height="1" fill="#b8925a"/>'),
};

export class Hud {
  constructor(input) {
    const $ = (id) => document.getElementById(id);
    this.input = input;
    this.started = false;
    this.onBegin = null;
    this.el = {
      start: $('start'), help: $('help'), info: $('info'), toast: $('toast'),
      fade: $('fade'), fadeText: $('fade-text'), lockHint: $('lock-hint'),
      touch: $('touch-ui'), stick: $('stick'), knob: $('knob'), hearts: $('hearts'), bars: $('bars'),
      prompt: $('prompt'), promptText: $('prompt-text'), talkBtn: $('talk-btn'),
      card: $('card'), cardTitle: $('card-title'), cardSub: $('card-sub'), caption: $('caption'),
      items: $('items'),
      dungeon: $('dungeon'), keys: $('dg-keys'), dgMap: $('dg-map'), dgBoss: $('dg-boss'),
      map: $('map'), mapCanvas: $('map-canvas'),
      air: $('air'), underwater: $('underwater'), frost: $('frost'),
    };
    this.mapView = new MapView(this.el.mapCanvas);
    this.mapOpen = false;
    this.cardTimer = 0;
    this.captionTimer = 0;
    this.itemKey = '';
    this.dungeonKey = '';
    this.promptKey = null;
    document.querySelectorAll('[data-press]').forEach((b) => {
      const name = b.dataset.press;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.press(name, true); });
      const up = () => input.press(name, false);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    });
    input.onStick = (show, x, y, dx = 0, dy = 0) => {
      const s = this.el.stick;
      s.hidden = !show;
      if (!show) return;
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      this.el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    if (input.isTouch) document.body.classList.add('touch-device');
    this.fps = { acc: 0, frames: 0, value: 0, infoT: 0 };
    this.toastTimer = 0;
    this.heartKey = '';
  }

  // Spelet börjar (från startmenyn): mode 'new' | 'continue' | 'resume', slot = sparfil 1 eller 2
  begin(fromSave = false, mode = 'new', slot = undefined) {
    if (this.started) return;
    this.started = true;
    this.el.start.hidden = true;
    this.el.help.hidden = this.input.isTouch;
    this.el.touch.hidden = !this.input.isTouch;
    this.el.hearts.hidden = false;
    this.input.inGame = true;
    if (!fromSave) this.input.requestLock();
    this.onBegin?.(mode, slot);
  }

  // Klockan uppe till vänster (0.11): sol eller måne, tiden och vädret
  setClock(c) {
    const el = this.clockEl ??= {
      root: document.getElementById('clock'), ico: document.getElementById('clock-ico'),
      t: document.getElementById('clock-t'), wx: document.getElementById('clock-wx'),
    };
    if (!el.root) return;
    const key = c ? `${c.night}|${c.text}|${c.weather}|${c.label}` : '';
    if (key === this.clockKey) return;
    this.clockKey = key;
    el.root.hidden = !c;
    if (!c) return;
    el.ico.innerHTML = c.night ? CLOCK_ICONS.moon : CLOCK_ICONS.sun;
    el.t.innerHTML = `${c.text}<small>${c.label}</small>`;
    el.wx.innerHTML = CLOCK_ICONS[c.weather] ?? '';
    el.root.title = `Day ${c.day} · ${c.label}`;
  }

  setPrompt(text) {
    if (text === this.promptKey) return;
    this.promptKey = text;
    this.el.prompt.hidden = !text;
    if (text) this.el.promptText.textContent = text;
    this.el.talkBtn.hidden = !text;
  }

  // 0.15: luften under vattnet (frac 0..1); visas bara när den inte är full
  setBreath(frac, show) {
    const el = this.el.air;
    if (!el) return;
    const n = 6, left = Math.ceil(frac * n - 0.001);
    const key = show ? `${left}` : 'off';
    if (key === this.airKey) return;
    this.airKey = key;
    el.hidden = !show;
    if (!show) return;
    if (el.children.length !== n) el.innerHTML = '<i></i>'.repeat(n);
    [...el.children].forEach((b, i) => b.classList.toggle('gone', i >= left));
    el.classList.toggle('low', left <= 2);
  }
  setFrost(k) {
    const v = Math.round(Math.max(0, Math.min(1, k)) * 50) / 50;
    if (v === this.frostK) return;
    this.frostK = v;
    if (this.el.frost) this.el.frost.style.opacity = String(Math.min(1, v * 1.1));
  }
  setUnderwater(on) {
    if (on === this.underOn) return;
    this.underOn = on;
    this.el.underwater?.classList.toggle('on', on);
  }

  setHearts(hp, max) {
    const key = `${hp}/${max}`;
    if (key === this.heartKey) return;
    const prev = this.heartKey;
    this.heartKey = key;
    const el = this.el.hearts;
    const count = Math.ceil(max / 2);
    if (el.children.length !== count) el.innerHTML = Array.from({ length: count }, (_, i) => `<span class="heart">${heartSvg(i)}</span>`).join('');
    [...el.children].forEach((h, i) => {
      const fill = Math.max(0, Math.min(2, hp - i * 2));
      h.querySelector('.clip').setAttribute('width', fill === 2 ? 7 : fill === 1 ? 3.5 : 0);
    });
    el.setAttribute('aria-label', `${hp / 2} of ${max / 2} hearts`);
    el.classList.toggle('low', hp <= 2 && hp > 0);
    if (prev) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  // Stor rubrik mitt på skärmen, när Cello kommer till ett nytt ställe eller möter en boss
  card(title, sub = '', ms = 3400) {
    const c = this.el.card;
    this.el.cardTitle.textContent = title;
    this.el.cardSub.textContent = sub;
    this.el.cardSub.hidden = !sub;
    c.classList.remove('show');
    void c.offsetWidth;
    c.classList.add('show');
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => c.classList.remove('show'), ms);
  }

  // Berättartext längst ner, som i en film
  caption(text, ms = 3600) {
    const c = this.el.caption;
    if (!text) { c.classList.remove('show'); return; }
    c.textContent = text;
    c.classList.add('show');
    clearTimeout(this.captionTimer);
    this.captionTimer = setTimeout(() => c.classList.remove('show'), ms);
  }

  // Föremålsrutorna sköts av inventory.js (refresh); den här finns kvar för äldre anrop
  setItems() {
    this.onItems?.();
  }

  // Nycklar, karta och Stormnyckel visas bara inne i fästningen
  setDungeon(s) {
    const key = s ? `${s.keys}|${s.map}|${s.bossKey}` : '';
    if (key === this.dungeonKey) return;
    this.dungeonKey = key;
    this.el.dungeon.hidden = !s;
    if (!s) return;
    this.el.keys.textContent = `× ${s.keys}`;
    this.el.dgMap.classList.toggle('have', s.map);
    this.el.dgBoss.classList.toggle('have', s.bossKey);
  }

  showMap(on, draw) {
    this.mapOpen = on;
    this.el.map.hidden = !on;
    if (on) draw?.(this.mapView);
  }

  setLetterbox(on) {
    this.el.bars.classList.toggle('on', on);
  }

  toast(text, ms = 2000) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  fade(on, text = '') {
    if (on) this.el.fadeText.textContent = text;
    this.el.fade.classList.toggle('on', on);
  }

  toggleHelp() {
    if (this.started && !this.input.isTouch) this.el.help.hidden = !this.el.help.hidden;
  }

  toggleInfo() {
    this.el.info.hidden = !this.el.info.hidden;
  }

  frame(dt, player) {
    const f = this.fps;
    f.acc += dt; f.frames++;
    if (f.acc >= 0.5) { f.value = Math.round(f.frames / f.acc); f.acc = 0; f.frames = 0; }
    this.el.lockHint.hidden = !(this.started && !this.input.locked && !this.input.isTouch);
    if (!this.el.info.hidden && (f.infoT -= dt) <= 0) {
      f.infoT = 0.2;
      const p = player.feet;
      this.el.info.textContent =
        `${f.value} fps\nx ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}\n` +
        `speed ${player.speed.toFixed(1)}  ${player.grounded ? 'grounded' : 'airborne'}\n` +
        `state ${player.state}${player.lockTarget ? '  locked' : ''}${this.input.walkMode ? '  walking' : ''}` +
        `${this.input.hasPad ? '\ngamepad connected' : ''}`;
    }
  }
}

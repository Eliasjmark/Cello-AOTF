// Pausmenyn (0.19): Esc, P, knappen uppe till höger, eller Start på handkontrollen (håll in) öppnar den.
// Spelet står stilla, spelets musik tystnar och pausmenyns egen vaggvisa spelas (pausetheme.js).
//   Resume · Save Game · Options (musik, ljud, retroläge, konturer, skuggor) · Controls · Quit to Title
import { PauseTheme } from './pausetheme.js';

const CONTROLS = [
  ['W A S D', 'run'], ['Space', 'jump'], ['Click', 'sword'], ['Right-click / R', 'shield'], ['Q', 'lock on'],
  ['Shift', 'roll (hold to dive in water)'], ['E', 'talk, open, read'], ['F G V', 'use items'], ['Tab', 'item menu'],
  ['K', 'map'], ['C', 'walk / run'], ['H', 'hide the key hints'], ['M', 'sound on / off'], ['N', 'music on / off'], ['Esc / P', 'pause menu'],
];

export class PauseMenu {
  // o: { sfx, music, settings, apply(settings), story, hud, input, canPause() }
  constructor(o) {
    this.o = o;
    this.open = false;
    this.theme = new PauseTheme(o.sfx);
    this.items = [];
    this.cur = 0;
    this.build();
  }

  build() {
    const el = document.createElement('div');
    el.className = 'pause';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Paused');
    el.innerHTML = `
      <div class="pause-panel">
        <p class="pause-kicker">Cello: Ashes of the Fallen</p>
        <h2 class="pause-title" id="pause-title">Paused</h2>
        <p class="pause-where" id="pause-where"></p>
        <div class="pause-list" id="pause-list"></div>
        <p class="pause-note" id="pause-note"></p>
        <p class="pause-hint"><kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>←</kbd><kbd>→</kbd> change · <kbd>Enter</kbd> select · <kbd>Esc</kbd> back</p>
      </div>`;
    (document.querySelector('.hud') ?? document.body).appendChild(el);
    this.el = { root: el, list: el.querySelector('#pause-list'), title: el.querySelector('#pause-title'), where: el.querySelector('#pause-where'), note: el.querySelector('#pause-note') };
    el.addEventListener('click', (e) => { if (e.target === el) this.back(); });
    // Knappen uppe till höger
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pause-btn';
    btn.id = 'pause-btn';
    btn.title = 'Menu (Esc)';
    btn.setAttribute('aria-label', 'Pause menu');
    btn.innerHTML = '<span></span><span></span>';
    btn.hidden = true;
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    const tr = document.querySelector('.topright');
    tr?.insertBefore(btn, tr.firstChild);
    this.btn = btn;
  }

  toggle() { if (this.open) this.close(); else this.show(); }

  show() {
    if (this.open || !this.o.canPause()) return;
    this.open = true;
    this.el.root.hidden = false;
    try { document.exitPointerLock?.(); } catch { /* ignoreras */ }
    this.o.sfx.play('pauseOpen');
    this.o.music.paused = true;
    this.theme.setVolume(0.55 * (this.o.settings.music ?? 8) / 8);
    this.theme.start();
    this.armed = performance.now() + 250;
    this.showMain();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.root.hidden = true;
    this.o.sfx.play('pauseClose');
    this.o.music.paused = false;
    this.theme.stop();
  }

  // En lista med knappar (samma utseende som startmenyns)
  list(items, focus = 0) {
    this.items = [];
    this.el.list.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `title-item ${it.cls || ''}`;
      b.innerHTML = `<span class="mark" aria-hidden="true"></span><span class="label">${it.label}</span>${it.sub ? `<span class="sub">${it.sub}</span>` : ''}`;
      if (it.disabled) b.setAttribute('aria-disabled', 'true');
      const entry = { ...it, el: b };
      b.addEventListener('pointerenter', () => this.focus(this.items.indexOf(entry), false)); // 0.21.3: tyst hover
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (performance.now() < (this.armed || 0)) return;
        this.focus(this.items.indexOf(entry), false);
        this.activate();
      });
      this.el.list.appendChild(b);
      this.items.push(entry);
    });
    this.cur = -1;
    this.focus(Math.max(0, Math.min(focus, items.length - 1)), false);
  }

  focus(i, sound = true) {
    if (i < 0 || i === this.cur || !this.items[i]) return;
    this.cur = i;
    this.items.forEach((it, k) => it.el.classList.toggle('on', k === i));
    if (sound) this.o.sfx.play('menuMove');
  }

  activate() {
    const it = this.items[this.cur];
    if (!it) return;
    if (it.disabled) { this.o.sfx.play('menuDeny'); return; }
    // 0.21.3: varje val låter (mjukt), även de som inte har ett eget ljud
    const n = this.o.sfx.plays || 0;
    it.run?.();
    if ((this.o.sfx.plays || 0) === n) this.o.sfx.play('menuSelect');
  }

  back() {
    if (this.view === 'main') this.close();
    else { this.o.sfx.play('menuBack'); this.showMain(this.view === 'options' ? 2 : this.view === 'controls' ? 3 : 4); }
  }

  showMain(focus = 0) {
    this.view = 'main';
    const { story, hud } = this.o;
    this.el.title.textContent = 'Paused';
    const area = this.o.areaName?.() ?? '';
    const t = story.state?.playTime ?? 0;
    this.el.where.textContent = `${area}${area ? ' · ' : ''}${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')} played`;
    this.el.note.textContent = '';
    const canSave = hud.started && story.phase !== 'intro' && !story.cinematic && !story.fade;
    this.list([
      { label: 'Resume', run: () => this.close() },
      { label: 'Save Game', sub: canSave ? `File ${story.slot ?? 1}` : 'Not right now', disabled: !canSave, run: () => this.save() },
      { label: 'Options', sub: 'Music, sound and graphics', run: () => { this.o.sfx.play('menuSelect'); this.showOptions(); } },
      { label: 'Controls', run: () => { this.o.sfx.play('menuSelect'); this.showControls(); } },
      { label: 'Quit to Title', cls: 'danger', run: () => { this.o.sfx.play('menuSelect'); this.showQuit(); } },
    ], focus);
  }

  save() {
    const ok = this.o.story.save(false);
    if (ok !== false) {
      this.o.sfx.play('save');
      this.el.note.textContent = 'Game saved.';
      this.savedAt = this.o.story.state?.playTime ?? 0;
    } else {
      this.o.sfx.play('menuDeny');
      this.el.note.textContent = 'The game could not be saved here.';
    }
  }

  showOptions(focus = 0) {
    this.view = 'options';
    this.el.title.textContent = 'Options';
    this.el.where.textContent = '';
    this.el.note.textContent = '';
    const S = this.o.settings, sfx = this.o.sfx;
    const apply = (k, v, f) => {
      S[k] = v;
      this.o.apply(S);
      if (k === 'music') this.theme.setVolume(0.55 * v / 8);
      this.showOptions(f);
    };
    const bar = (v) => `<span class="bar" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span><span class="val">${v}</span>`;
    const level = (k, label, f) => ({
      label: `${label}${bar(S[k])}`, cls: 'opt',
      adjust: (d) => { const v = Math.max(0, Math.min(10, S[k] + d)); if (v === S[k]) { sfx.play('menuDeny'); return; } apply(k, v, f); sfx.play('slider', { rate: 0.75 + v * 0.06 }); },
      run: () => { const v = S[k] >= 10 ? 0 : S[k] + 1; apply(k, v, f); sfx.play('slider', { rate: 0.75 + v * 0.06 }); },
    });
    const toggle = (k, label, sub, f, isOn, flip) => {
      const go = () => { sfx.play(isOn() ? 'toggleOff' : 'toggleOn'); apply(k, flip(), f); };
      return { label: `${label}<span class="val toggle">${isOn() ? 'On' : 'Off'}</span>`, cls: 'opt', sub, adjust: go, run: go };
    };
    this.list([
      level('music', 'Music', 0),
      level('sound', 'Sound', 1),
      toggle('pixel', 'Retro mode', 'Low resolution and big, chunky pixels', 2, () => !!S.pixel, () => !S.pixel),
      toggle('outlines', 'Outlines', 'Ink lines and soft shading in corners', 3, () => S.outlines !== false, () => S.outlines === false),
      toggle('shadows', 'Shadows', 'Real shadows (turn off on slow computers)', 4, () => S.shadows !== false, () => S.shadows === false),
      { label: 'Back', cls: 'back-btn', run: () => this.back() },
    ], focus);
  }

  showControls() {
    this.view = 'controls';
    this.el.title.textContent = 'Controls';
    this.el.where.textContent = '';
    this.el.note.innerHTML = `<span class="pause-keys">${CONTROLS.map(([k, d]) => `<span><kbd>${k}</kbd> ${d}</span>`).join('')}</span>`;
    this.list([{ label: 'Back', cls: 'back-btn', run: () => this.back() }]);
  }

  showQuit() {
    this.view = 'quit';
    this.el.title.textContent = 'Quit to Title?';
    this.el.where.textContent = '';
    const t = this.o.story.state?.playTime ?? 0;
    this.el.note.textContent = this.savedAt != null && t - this.savedAt < 5 ? 'Your game is saved.' : 'Anything since your last save will be lost, unless you save first.';
    const canSave = this.o.hud.started && this.o.story.phase !== 'intro' && !this.o.story.cinematic;
    this.list([
      { label: 'Save and Quit', disabled: !canSave, run: () => { this.o.story.save(false); this.o.sfx.play('save'); this.quit(); } },
      { label: 'Quit without Saving', cls: 'danger', run: () => this.quit() },
      { label: 'Cancel', cls: 'back-btn', run: () => this.back() },
    ], canSave ? 0 : 1);
  }

  quit() {
    this.theme.stop();
    this.o.sfx.play('menuBack');
    // Tillbaka till startmenyn: spelet laddas om (sparfilen ligger kvar)
    setTimeout(() => this.o.quit(), 350);
  }

  // Tangentbord och handkontroll medan menyn är öppen
  update(dt, inp) {
    if (!this.open) return;
    if (performance.now() < (this.armed || 0)) return;
    if (inp.cancel || inp.pausePress) { this.back(); return; }
    if (inp.up) this.move(-1);
    if (inp.down) this.move(1);
    const it = this.items[this.cur];
    if ((inp.left || inp.right) && it?.adjust) it.adjust(inp.right ? 1 : -1);
    if (inp.start || inp.interact || inp.jump) this.activate();
  }

  move(d) {
    const n = this.items.length;
    if (!n) return;
    this.focus((this.cur + d + n) % n);
  }
}

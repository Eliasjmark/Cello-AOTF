// Textrutan: namnet på den som pratar, text som skrivs fram med mummel, och val.
//
// Ett manus är en lista med steg:
//   { who: 'Lyra', voice: 'lyra', text: '...' }      en replik
//   { choices: [{ text, id }], onChoose(id) }          ett val; onChoose kan returnera fler steg
//   { run() }                                          kör kod mitt i samtalet
const CPS = 46; // tecken per sekund

export class Dialog {
  constructor(sfx) {
    this.sfx = sfx;
    const $ = (id) => document.getElementById(id);
    this.el = { box: $('dialog'), name: $('dialog-name'), text: $('dialog-text'), choices: $('dialog-choices'), next: $('dialog-next') };
    this.steps = null;
    this.i = 0;
    this.shown = 0;
    this.wait = 0;
    this.blipCount = 0;
    this.sel = 0;
    this.focus = null;
    this.onEnd = null;
    this.clicked = null;
    this.el.box.addEventListener('pointerdown', (e) => {
      const li = e.target.closest('[data-choice]');
      if (li) this.clicked = Number(li.dataset.choice);
      else this.clicked = -1;
    });
  }

  get active() {
    return this.steps !== null;
  }

  start(steps, { focus = null, onEnd = null } = {}) {
    this.steps = steps.slice();
    this.i = -1;
    this.focus = focus;
    this.onEnd = onEnd;
    this.el.box.hidden = false;
    this.greeted = false;
    this.advance(true);
  }

  advance(first = false) {
    // 0.18: ett litet ljud när man bläddrar vidare
    if (!first) this.sfx.play('dialogNext');
    this.i++;
    while (this.steps && this.i < this.steps.length && this.steps[this.i].run) {
      this.steps[this.i].run();
      this.i++;
    }
    if (!this.steps || this.i >= this.steps.length) {
      this.close();
      return;
    }
    const s = this.steps[this.i];
    this.el.choices.hidden = true;
    this.el.next.hidden = true;
    if (s.choices) {
      this.sel = 0;
      // dim: en fråga som redan är ställd visas grå (0.11)
      this.el.choices.innerHTML = s.choices.map((c, k) =>
        `<li data-choice="${k}"${c.dim ? ' class="asked"' : ''}><span class="mark" aria-hidden="true">›</span>${c.text}</li>`).join('');
      this.el.choices.hidden = false;
      this.renderChoices();
      if (s.prompt) {
        this.el.name.textContent = s.who || '';
        this.el.name.hidden = !s.who;
        this.el.text.textContent = s.prompt;
      }
      this.shown = Infinity;
      return;
    }
    this.el.name.textContent = s.who || '';
    this.el.name.hidden = !s.who;
    this.el.text.textContent = '';
    this.shown = 0;
    this.wait = 0;
    this.blipCount = 0;
    // 0.18: vissa glada gubbar säger "hello" när man börjar prata med dem
    if (!this.greeted && s.voice) { this.greeted = true; this.sfx.greet?.(s.voice); }
  }

  renderChoices() {
    [...this.el.choices.children].forEach((li, k) => li.classList.toggle('sel', k === this.sel));
    this.el.choices.dataset.sel = this.sel;
  }

  choose(k) {
    const s = this.steps[this.i];
    const c = s.choices[k];
    this.sfx.play('choice');
    const more = s.onChoose?.(c.id);
    if (Array.isArray(more) && more.length) this.steps.splice(this.i + 1, 0, ...more);
    this.advance();
  }

  close() {
    this.steps = null;
    this.el.box.hidden = true;
    const cb = this.onEnd;
    this.onEnd = null;
    this.focus = null;
    cb?.();
  }

  update(dt, input) {
    if (!this.active) return;
    const s = this.steps[this.i];
    const click = this.clicked;
    this.clicked = null;

    if (s.choices) {
      const n = s.choices.length;
      if (input.up) { this.sel = (this.sel + n - 1) % n; this.renderChoices(); this.sfx.play('choice'); }
      if (input.down) { this.sel = (this.sel + 1) % n; this.renderChoices(); this.sfx.play('choice'); }
      if (input.pick && input.pick <= n) { this.choose(input.pick - 1); return; }
      if (click !== null && click >= 0) { this.choose(click); return; }
      if (input.confirm) this.choose(this.sel);
      return;
    }

    const text = s.text;
    if (this.shown < text.length) {
      if (input.confirm || (click !== null)) {
        this.shown = text.length;
        this.el.text.textContent = text;
      } else {
        this.wait -= dt;
        while (this.wait <= 0 && this.shown < text.length) {
          const ch = text[this.shown++];
          this.wait += 1 / CPS + (/[.!?]/.test(ch) ? 0.16 : /[,…]/.test(ch) ? 0.08 : 0);
          if (/[\p{L}\p{N}]/u.test(ch) && this.blipCount++ % 2 === 0) this.sfx.blip(s.voice);
        }
        this.el.text.textContent = text.slice(0, this.shown);
      }
      this.el.next.hidden = this.shown < text.length;
      return;
    }
    this.el.next.hidden = false;
    if (input.confirm || (click !== null)) this.advance();
  }
}

// Öppningen (0.20): när ett nytt spel börjar berättar en text vad som har hänt och vem Cello är,
// sida för sida över svart bakgrund. Sedan tonar den bort och Cello ligger och sover i sin säng
// (resten av scenen, explosionen och skriket, sköts av story.js: startOpening).
// Enter, mellanslag eller klick: nästa sida. Esc: hoppa över allt.

export const CRAWL = [
  ['Long ago, the gods walked among us.', 'When they left, the world cracked like a dropped plate, and its pieces rose into the sky.', 'We call what is left the Shattered Realm.'],
  ['The gods left things behind.', "A hammer that called the thunder. Sandals that outran the wind. A spear that ruled the sea.", 'Relics that still hold a part of their power, if anyone knew where to look.'],
  ['Then the storm came.', 'Out of it walked the titans, giants of stone and fire.', 'They burn every village in their path, and no one knows what they want.'],
  ['On a small island at the edge of the forest, south of the village of Hollowbrook, lives a boy named Cello.', 'He has two goats, a straw dummy, and a sword he has never swung at anything that could swing back.'],
  ['This morning, the storm reached Hollowbrook.'],
];

const CSS = `
.crawl { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: #07060a; opacity: 1; transition: opacity 1.4s ease; pointer-events: auto; cursor: pointer; }
.crawl.out { opacity: 0; pointer-events: none; }
.crawl-page { width: min(40rem, calc(100% - 32px)); margin: 0; text-align: center; font-family: var(--font-display, Georgia, serif); color: var(--ink, #efe6d2); }
.crawl-page p { margin: 0 0 1.1em; font-size: clamp(1.05rem, 2.6vw, 1.4rem); line-height: 1.6; letter-spacing: .03em; text-wrap: balance; opacity: 0; transform: translateY(8px); transition: opacity 1.1s ease, transform 1.6s ease; text-shadow: 0 2px 0 #000; }
.crawl-page p.on { opacity: 1; transform: none; }
.crawl-page p.last { font-size: clamp(1.3rem, 3.6vw, 1.9rem); color: var(--gold, #d8b25a); letter-spacing: .08em; }
.crawl-page.gone p { opacity: 0; transition: opacity .8s ease; }
.crawl-hint { position: absolute; right: 16px; bottom: 14px; margin: 0; font-family: var(--font-ui, sans-serif); font-size: .8rem; letter-spacing: .08em; color: rgba(239,230,210,.55); }
.crawl-hint kbd { display: inline-block; padding: 1px 6px; margin: 0 2px; border: 1px solid rgba(239,230,210,.35); border-radius: 4px; font: inherit; }
.crawl-flash { position: absolute; inset: 0; z-index: 39; pointer-events: none; background: radial-gradient(circle at 50% 30%, #fff1c8, #ff9a3a 45%, rgba(120,30,0,.0) 80%); opacity: 0; transition: opacity 1.2s ease-out; }
.crawl-flash.on { opacity: .85; transition: none; }
@media (prefers-reduced-motion: reduce) { .crawl, .crawl-page p, .crawl-flash { transition: none; } }
`;

export class Crawl {
  constructor(sfx) {
    this.sfx = sfx;
    this.active = false;
    this.el = null;
  }

  build() {
    if (this.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = document.createElement('div');
    root.className = 'crawl';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Story');
    root.innerHTML = '<div class="crawl-page" aria-live="polite"></div><p class="crawl-hint"><kbd>Enter</kbd> next · <kbd>Esc</kbd> skip</p>';
    const hud = document.querySelector('.hud') ?? document.body;
    hud.appendChild(root);
    const flash = document.createElement('div');
    flash.className = 'crawl-flash';
    hud.appendChild(flash);
    this.el = { root, page: root.querySelector('.crawl-page'), flash };
    root.addEventListener('click', () => this.next());
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.finish(); }
      else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); this.next(); }
    }, true);
  }

  // onDone körs när texten är slut och den svarta bakgrunden börjar tona bort
  start(onDone) {
    this.build();
    this.onDone = onDone;
    this.active = true;
    this.i = -1;
    this.el.root.hidden = false;
    this.el.root.classList.remove('out');
    this.show(0);
  }

  // Sidan i: raderna tänds en i taget. Tiden en sida visas beror på hur mycket text den har.
  show(i) {
    this.i = i;
    const lines = CRAWL[i], page = this.el.page;
    page.classList.remove('gone');
    page.innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
    if (i === CRAWL.length - 1) page.lastElementChild.classList.add('last');
    this.lineT = lines.map((_, k) => 0.4 + k * 1.6);
    this.t = 0;
    this.hold = this.lineT[this.lineT.length - 1] + 1.4 + lines.join(" ").length * 0.032;
    this.leaving = 0;
    if (i > 0) this.sfx.play('page', { vol: 0.4 });
  }

  // Spelets tid (pausas med spelet, och testerna kan stega fram den)
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const ps = this.el.page.children;
    this.lineT.forEach((tt, k) => { if (this.t >= tt) ps[k]?.classList.add('on'); });
    if (this.leaving) {
      this.leaving -= dt;
      if (this.leaving <= 0) {
        if (this.i + 1 < CRAWL.length) this.show(this.i + 1);
        else this.finish();
      }
    } else if (this.t >= this.hold) this.turn();
  }

  turn() {
    if (this.leaving) return;
    this.el.page.classList.add('gone');
    this.leaving = 0.85;
  }

  // Klick/Enter: visa resten av sidan direkt, eller gå till nästa sida
  next() {
    if (!this.active) return;
    const ps = [...this.el.page.children];
    if (ps.some((p) => !p.classList.contains('on'))) {
      ps.forEach((p) => p.classList.add('on'));
      this.t = Math.max(this.t, this.lineT[this.lineT.length - 1]);
      this.sfx.play('menuMove', { vol: 0.5 });
      return;
    }
    this.sfx.play('menuSelect', { vol: 0.5 });
    this.turn();
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.el.root.classList.add('out');
    setTimeout(() => { if (!this.active) this.el.root.hidden = true; }, 1500);
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  // Avbryt utan att köra onDone (ett sparat spel laddas)
  cancel() {
    this.active = false;
    this.onDone = null;
    if (this.el) { this.el.root.hidden = true; this.el.root.classList.add('out'); }
  }

  // Explosionens ljusblixt över hela skärmen
  flash() {
    this.build();
    const f = this.el.flash;
    f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  }
}

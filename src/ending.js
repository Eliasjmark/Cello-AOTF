// Slutet (0.21): eftertexterna som rullar upp över svart bakgrund efter striden mot Kronos, och sidorna med
// vad som hände sedan (de beror på valen Cello gjorde längs vägen, se othrysstory.js).
// Esc hoppar över eftertexterna.

const CSS = `
.credits { position: absolute; inset: 0; z-index: 41; overflow: hidden; background: #07060a; opacity: 0; transition: opacity 1.6s ease; pointer-events: auto; }
.credits.on { opacity: 1; }
.credits-roll { position: absolute; left: 50%; top: 0; width: min(36rem, calc(100% - 32px)); transform: translate(-50%, 100vh); text-align: center; font-family: var(--font-display, Georgia, serif); color: var(--ink, #efe6d2); }
.credits-roll h2 { margin: 0 0 .4em; font-size: clamp(1.8rem, 5vw, 2.8rem); letter-spacing: .14em; text-transform: uppercase; color: var(--gold, #d8b25a); text-shadow: 0 2px 0 #000; }
.credits-roll h3 { margin: 2.4em 0 .5em; font-size: .85rem; letter-spacing: .32em; text-transform: uppercase; color: var(--gold, #d8b25a); font-family: var(--font-ui, sans-serif); font-weight: 600; }
.credits-roll p { margin: .2em 0; font-size: 1.1rem; line-height: 1.6; }
.credits-roll .sub { font-size: .95rem; opacity: .7; }
.credits-roll .end { margin-top: 3.4em; font-size: clamp(1.6rem, 4vw, 2.4rem); letter-spacing: .3em; color: var(--gold, #d8b25a); }
.credits-hint { position: absolute; right: 16px; bottom: 14px; margin: 0; font-family: var(--font-ui, sans-serif); font-size: .8rem; color: rgba(239,230,210,.55); }
.credits-hint kbd { display: inline-block; padding: 1px 6px; margin: 0 2px; border: 1px solid rgba(239,230,210,.35); border-radius: 4px; font: inherit; }
`;

export const CREDITS = [
  ['h2', 'Cello'],
  ['p.sub', 'Ashes of the Fallen'],
  ['h3', 'Made by'],
  ['p', 'Elias'],
  ['h3', 'Story, world and design'],
  ['p', 'Elias'],
  ['h3', 'Sculptures'],
  ['p', 'Cello, Seren, the villagers and the titan-dwarf, sculpted by Elias'],
  ['h3', 'Music'],
  ['p', 'Treblo'],
  ['p.sub', 'Hearth Lullaby, written in code'],
  ['h3', 'Sound'],
  ['p', 'The 400 Sounds Pack, and sounds made with code'],
  ['h3', 'Code'],
  ['p', 'Elias, with Claude'],
  ['p.sub', 'Built with Three.js'],
  ['h3', 'With'],
  ['p', 'Maren · Lyra · Vane · Seren · Rhea'],
  ['p', 'Hollis · Tilly · Pell · Fenwick · Mira · Tob'],
  ['p', 'Tarek · Hamid · Nerissa · Sigrun · Ylva · Hakon · Bjarke'],
  ['p.sub', 'and a goat named Grumble'],
  ['h3', 'And the titans'],
  ['p', 'Typhon · Ketos · Thrym · Kronos'],
  ['p.sub', 'and a trickster who was never really there'],
  ['h3', ''],
  ['p', 'Thank you for playing.'],
  ['p.end', 'The End'],
];

export class Credits {
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
    root.className = 'credits';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Credits');
    const roll = document.createElement('div');
    roll.className = 'credits-roll';
    for (const [tag, text] of CREDITS) {
      const [t, cls] = tag.split('.');
      const e = document.createElement(t);
      if (cls) e.className = cls;
      e.textContent = text;
      roll.appendChild(e);
    }
    root.appendChild(roll);
    const hint = document.createElement('p');
    hint.className = 'credits-hint';
    hint.innerHTML = '<kbd>Esc</kbd> skip';
    root.appendChild(hint);
    (document.querySelector('.hud') ?? document.body).appendChild(root);
    this.el = { root, roll };
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); this.finish(); }
    }, true);
  }

  start(onDone) {
    this.build();
    this.onDone = onDone;
    this.active = true;
    this.t = 0;
    this.el.root.hidden = false;
    requestAnimationFrame(() => this.el.root.classList.add('on'));
    this.el.root.classList.add('on');
  }

  // Spelets tid: rullar uppåt i jämn fart tills "The End" står mitt på skärmen
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const vh = window.innerHeight || 600;
    const h = this.el.roll.offsetHeight || 1200;
    const speed = 42;
    const y = Math.max(vh * 0.5 - h + 40, vh - this.t * speed);
    this.el.roll.style.transform = `translate(-50%, ${y}px)`;
    if (y <= vh * 0.5 - h + 40) {
      this.holdT = (this.holdT ?? 0) + dt;
      if (this.holdT > 5) this.finish();
    }
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.holdT = 0;
    this.el.root.classList.remove('on');
    setTimeout(() => { if (!this.active) this.el.root.hidden = true; }, 1700);
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }
}

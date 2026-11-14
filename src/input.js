// Tangentbord, mus, handkontroll och pekskärm samlas till ett gemensamt indata-objekt.
//
// Tangentbord och mus:  WASD spring · Space hopp · vänsterklick svärd · högerklick/R sköld
//                       Shift undanmanöver · Q lock-on · E prata/öppna · F, G, V föremålsknappar
//                       Tab/B föremålsmenyn · K karta · C gå långsamt · M ljud · P retroläge
const DEAD = 0.18;
const MOUSE_X = 0.0026, MOUSE_Y = 0.0022;

function deadzone(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mdx = 0;
    this.mdy = 0;
    this.locked = false;
    this.dragging = false;
    this.skipMoves = 0;
    this.mouseShield = false;
    this.clicks = { attack: false, lock: false };
    this.virtual = { jump: false, attack: false, dodge: false, lock: false, shield: false, jumpHeld: false, interact: false, item1: false, item2: false, item3: false, bag: false, map: false };
    this.walkMode = false;
    this.lastTouch = -1e9;
    this.isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.padOk = true;
    this.padPrev = {};
    this.hasPad = false;
    this.t = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, my: 0, lx: 0, ly: 0, ldx: 0, ldy: 0 };
    this.onStick = null;
    this.empty = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, walk: false };

    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
    this.inGame = false; // på startskärmen är Start "börja spela", i spelet öppnar den föremålsmenyn
    addEventListener('keydown', (e) => {
      if (block.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.dragging = false;
      this.mouseShield = false;
    });

    const mouseOk = () => performance.now() - this.lastTouch > 800;
    canvas.addEventListener('mousedown', (e) => {
      if (!mouseOk()) return;
      if (e.button === 0) {
        // Första klicket låser musen; därefter är vänsterklick ett svärdsslag
        if (this.locked) this.clicks.attack = true;
        else {
          this.requestLock();
          this.dragging = true;
        }
      }
      if (e.button === 1) { e.preventDefault(); this.clicks.lock = true; }
      if (e.button === 2) this.mouseShield = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.dragging = false;
      if (e.button === 2) this.mouseShield = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (!(this.locked || (this.dragging && mouseOk()))) return;
      const dx = e.movementX || 0, dy = e.movementY || 0;
      // Webbläsare skickar ibland ett stort hopp precis när musen låses; det hoppas över
      if (this.skipMoves > 0) { this.skipMoves--; return; }
      if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
      this.mdx += dx;
      this.mdy += dy;
    });
    // 0.19: när spelet självt släpper musen (menyer, väskan) ska pausmenyn inte öppnas
    const exitLock = document.exitPointerLock?.bind(document);
    if (exitLock) document.exitPointerLock = () => { this.selfUnlockT = performance.now(); return exitLock(); };
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      this.skipMoves = 2;
      if (!this.locked) this.mouseShield = false;
      // Esc släpper musen (webbläsaren tar själva tangenttrycket): då öppnas pausmenyn
      if (was && !this.locked && performance.now() - (this.selfUnlockT ?? -1e9) > 400) this.onLockLost?.();
    });

    // Pekskärm: vänster sida är en spak, höger sida styr kameran
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      this.lastTouch = performance.now();
      this.isTouch = true;
      const t = this.t;
      if (e.clientX < innerWidth * 0.45 && t.moveId === null) {
        t.moveId = e.pointerId; t.ox = e.clientX; t.oy = e.clientY; t.mx = 0; t.my = 0;
        this.onStick?.(true, t.ox, t.oy, 0, 0);
      } else if (t.lookId === null) {
        t.lookId = e.pointerId; t.lx = e.clientX; t.ly = e.clientY;
      }
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoreras */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') return;
      this.lastTouch = performance.now();
      const t = this.t;
      if (e.pointerId === t.moveId) {
        let dx = e.clientX - t.ox, dy = e.clientY - t.oy;
        const max = 56, len = Math.hypot(dx, dy);
        if (len > max) { dx *= max / len; dy *= max / len; }
        t.mx = dx / max; t.my = -dy / max;
        this.onStick?.(true, t.ox, t.oy, dx, dy);
      } else if (e.pointerId === t.lookId) {
        t.ldx += e.clientX - t.lx; t.ldy += e.clientY - t.ly;
        t.lx = e.clientX; t.ly = e.clientY;
      }
    });
    const end = (e) => {
      if (e.pointerType !== 'touch') return;
      this.lastTouch = performance.now();
      const t = this.t;
      if (e.pointerId === t.moveId) { t.moveId = null; t.mx = 0; t.my = 0; this.onStick?.(false); }
      if (e.pointerId === t.lookId) t.lookId = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  // Knappar på skärmen (mobil) anropar den här
  press(name, down = true) {
    if (name === 'shield') this.virtual.shield = down;
    else if (name === 'jump') { this.virtual.jumpHeld = down; if (down) this.virtual.jump = true; }
    else if (name === 'dodge') { this.virtual.diveHeld = down; if (down) this.virtual.dodge = true; }
    else if (down) this.virtual[name] = true;
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* pekarlås stöds inte här, musdrag fungerar ändå */ }
  }

  poll(dt) {
    const k = this.keys, p = this.pressed, v = this.virtual;
    let mx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    let my = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    let lookX = this.mdx * MOUSE_X, lookY = this.mdy * MOUSE_Y;
    if (k.has('ArrowRight')) lookX += 2.4 * dt;
    if (k.has('ArrowLeft')) lookX -= 2.4 * dt;
    if (k.has('ArrowUp')) lookY -= 1.5 * dt;
    if (k.has('ArrowDown')) lookY += 1.5 * dt;

    const t = this.t;
    mx += t.mx; my += t.my;
    lookX += t.ldx * 0.0065; lookY += t.ldy * 0.005;
    t.ldx = 0; t.ldy = 0;

    const pad = { jump: false, jumpHeld: false, attack: false, dodge: false, lock: false, shield: false, start: false, interact: false, up: false, down: false, left: false, right: false, item1: false, item2: false, item3: false, map: false, cancel: false };
    if (this.padOk) {
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const g = Array.from(pads || []).find((x) => x && x.connected);
        this.hasPad = !!g;
        if (g) {
          const [lx, ly] = deadzone(g.axes[0] || 0, g.axes[1] || 0);
          const [rx, ry] = deadzone(g.axes[2] || 0, g.axes[3] || 0);
          mx += lx; my -= ly;
          lookX += rx * 2.6 * dt; lookY += ry * 1.7 * dt;
          const b = (i) => !!g.buttons[i]?.pressed;
          const edge = (name, now) => { const e = now && !this.padPrev[name]; this.padPrev[name] = now; return e; };
          pad.jumpHeld = b(0);
          pad.jump = edge('a', b(0));
          pad.dodge = edge('b', b(1));
          pad.diveHeld = b(1);
          pad.attack = edge('x', b(2));
          pad.lock = edge('lt', b(6));
          pad.shield = b(7);
          pad.item2 = edge('lb', b(4));
          pad.item1 = edge('rb', b(5));
          pad.item3 = edge('dright', b(15));
          pad.map = edge('back', b(8));
          pad.start = edge('start', b(9));
          pad.interact = edge('y', b(3));
          pad.cancel = pad.dodge;
          pad.up = edge('up', b(12) || ly < -0.6);
          pad.down = edge('down', b(13) || ly > 0.6);
          pad.left = edge('left', b(14) || lx < -0.6);
          pad.right = edge('right', lx > 0.6);
        }
      } catch {
        this.padOk = false; // handkontroll blockeras i den här miljön
      }
    }

    if (p.has('KeyC')) this.walkMode = !this.walkMode;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const out = {
      moveX: mx,
      moveY: my,
      lookX,
      lookY,
      walk: this.walkMode,
      jump: p.has('Space') || pad.jump || v.jump,
      jumpHeld: k.has('Space') || pad.jumpHeld || v.jumpHeld,
      attack: this.clicks.attack || pad.attack || v.attack,
      slam: false,
      heavy: false,
      item1: p.has('KeyF') || p.has('Digit1') || pad.item1 || v.item1,
      item2: p.has('KeyG') || p.has('Digit2') || pad.item2 || v.item2,
      item3: p.has('KeyV') || p.has('Digit3') || pad.item3 || v.item3,
      bag: p.has('Tab') || p.has('KeyB') || (this.inGame && pad.start) || v.bag,
      cancel: p.has('Escape') || pad.cancel,
      map: p.has('KeyK') || pad.map || v.map,
      shield: this.mouseShield || k.has('KeyR') || pad.shield || v.shield,
      dodge: p.has('ShiftLeft') || p.has('ShiftRight') || pad.dodge || v.dodge,
      // 0.15: Shift hålls nere = dyk nedåt under vattnet
      diveHeld: k.has('ShiftLeft') || k.has('ShiftRight') || !!pad.diveHeld || !!v.diveHeld,
      lock: this.clicks.lock || p.has('KeyQ') || pad.lock || v.lock,
      pausePress: p.has('KeyP'),
      toggleHelp: p.has('KeyH'),
      toggleInfo: p.has('KeyI'),
      toggleMute: p.has('KeyM'),
      toggleMusic: p.has('KeyN'),
      walkChanged: p.has('KeyC'),
      start: p.has('Enter') || pad.start || pad.jump,
      // Samtal: E pratar, och Space, Enter, E eller klick går vidare i textrutan
      interact: p.has('KeyE') || pad.interact || v.interact,
      confirm: p.has('Space') || p.has('Enter') || p.has('KeyE') || this.clicks.attack
        || pad.jump || pad.attack || pad.interact || v.jump || v.attack || v.interact,
      up: p.has('KeyW') || p.has('ArrowUp') || pad.up,
      down: p.has('KeyS') || p.has('ArrowDown') || pad.down,
      left: p.has('KeyA') || p.has('ArrowLeft') || pad.left,
      right: p.has('KeyD') || p.has('ArrowRight') || pad.right,
      pick: p.has('Digit1') ? 1 : p.has('Digit2') ? 2 : p.has('Digit3') ? 3 : 0,
    };
    p.clear();
    this.mdx = 0;
    this.mdy = 0;
    this.clicks.attack = false;
    this.clicks.lock = false;
    v.jump = v.attack = v.dodge = v.lock = v.interact = v.item1 = v.item2 = v.item3 = v.bag = v.map = false;
    return out;
  }
}

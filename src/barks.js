// Mer liv i byarna (0.21):
//   · Pratbubblor: när Cello går förbi någon säger de något kort (en pratbubbla över huvudet och lite mummel).
//     Vad de säger beror på hur långt in i berättelsen Cello har kommit.
//   · Fåglar: flockar som cirklar högt över de fridfulla öarna, och måsar över havet.
import * as THREE from 'three';

// id → (state) => rader. Den första som inte är null används.
const BARKS = {
  hollis: (s) => (s.ending ? ['The goats have never been so calm. Must be the weather.', 'Brindle wants to race you. I said no.'] : ['Mind the fences, lad!', 'Fine weather for hay. When it is not storming.', 'Grumble ate my hat again.']),
  nell: (s) => (s.ending ? ['Bread for the hero! Ha! Take two.'] : ['Wipe your boots!', 'Have you eaten? You look thin.']),
  tilly: () => ['Chickens! Come back!', 'I can count to a hundred! ...Almost.'],
  pell: (s) => (s.ending ? ['Business is booming. Peace is good for lanterns.'] : ['Lanterns! Oil! Potions!', 'Everything has a price, friend.']),
  rosa: () => ['Beds are made! Soup is on!', 'Mind the third step, it squeaks.'],
  fenwick: (s) => (s.ending ? ['The fish are back! All of them!'] : ['Shh. You will scare the fish.', 'The big one got away again.']),
  mira: (s) => (s.quests?.bear === 'done' ? ['Button says hello!', 'Tag! You\'re it!'] : ['Tag! You\'re it!', 'The windmill is NOT haunted.']),
  tob: (s) => (s.quests?.kite === 'done' ? ['Look at my kite go!', 'When I grow up I will fight titans too!'] : ['Did you hit any monsters today?', 'I am not scared of anything.']),
  wren: () => ['Hmm, that hill is not on my map...', 'Left, then right. Or right, then left.'],
  doran: () => ['Move along, citizen.', 'Quiet night. I hope.'],
  odo: () => ['*plays a few notes on his flute*', 'The stones remember songs.'],
  mags: () => ['Warm yourself, traveler.', 'Tea? It is mostly hot water.'],
  hamid: () => ['Water, cloth, oil! Fair prices!', 'Tarek owes me a cart.'],
  sabi: () => ['Sand in my shoes again!', 'Race you to the oasis!'],
  nerissa: () => ['The tide is turning.', 'Smell that? That is the sea, child.'],
  corwin: () => ['Pearls! Black pearls! I buy them all!'],
  gull: () => ['Ropes need mending. Always.'],
  marlo: () => ['Nets out, nets in.', 'Storm coming? There is always a storm coming.'],
  sigrun: () => ['The fire is warm.', 'Keep your flame alive, boy.'],
  ylva: () => ['Fweet-fweet!', 'The herd is restless today.'],
  hakon: () => ['Bjarke is telling the frozen-fish story again.'],
  rhea: (s) => (s.ending ? ['The mountain sleeps.'] : ['Sit. The fire is old, but it still burns.']),
  ida: () => ['Sunday dinner, Cello. Do not forget.'],
  lyra: (s) => (s.ending ? ['The old stones are quiet now. I can finally read in peace.'] : ['The runes speak, if you listen.']),
  vane: (s) => (s.ending ? ['Bring that sword in sometime. I will make it shine.'] : ['*clang* *clang*', 'Steel does not lie.']),
  ilo: () => ['Is it lunchtime yet?', 'Edda says I snore. I do not snore.'],
  edda: () => ['Keep the fire fed, Ilo!'],
  bram: () => ['The bridge holds. For now.'],
};

const BARK_R = 6.5, BARK_COOL = 45;

function textSprite() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }));
  sp.scale.set(3.2, 0.8, 1);
  sp.renderOrder = 20;
  sp.visible = false;
  sp.userData.noShadow = true;
  return { sp, c, tex };
}

function drawBubble(b, text) {
  const g = b.c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = '600 30px "Barlow Semi Condensed", "Segoe UI", sans-serif';
  const w = Math.min(500, g.measureText(text).width + 40);
  const x = (512 - w) / 2;
  g.fillStyle = 'rgba(16,14,20,0.82)';
  g.strokeStyle = 'rgba(216,178,90,0.8)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(x, 18, w, 62, 18);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(246, 80); g.lineTo(256, 100); g.lineTo(266, 80);
  g.fill();
  g.fillStyle = '#f0e6d0';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let t = text;
  while (g.measureText(t).width > 470 && t.length > 4) t = `${t.slice(0, -4)}...`;
  g.fillText(t, 256, 50);
  b.tex.needsUpdate = true;
}

export class Barks {
  constructor({ story, scene, sfx, areas }) {
    Object.assign(this, { story, scene, sfx, areas });
    this.cool = new Map();
    this.b = textSprite();
    scene.add(this.b.sp);
    this.showT = 0;
    this.who = null;
    this.next = 2;
    this.birds = new Birds(scene);
  }

  update(dt, P, camera) {
    const story = this.story, s = story.state;
    this.birds.update(dt, this.areas.cur, camera, s);
    this.next -= dt;
    if (this.showT > 0) {
      this.showT -= dt;
      const n = this.who;
      if (!n || !n.visible || n.talking || story.dialog.active) this.showT = 0;
      else this.b.sp.position.set(n.pos.x, n.pos.y + 2.55 * (n.model.root.scale.y / 0.9), n.pos.z);
      this.b.sp.material.opacity = Math.min(1, this.showT * 2, (3.4 - this.showT) * 4);
      this.b.sp.visible = this.showT > 0;
      return;
    }
    this.b.sp.visible = false;
    if (this.next > 0 || story.phase !== 'free' || story.cinematic || story.dialog.active || !s) return;
    this.next = 0.5;
    const here = this.areas.id, now = performance.now() / 1000;
    let best = null, bd = BARK_R;
    for (const n of Object.values(story.npcs)) {
      if (!n.visible || n.talking || (n.area && n.area !== here) || !BARKS[n.id]) continue;
      const d = Math.hypot(n.pos.x - P.feet.x, n.pos.z - P.feet.z);
      if (d < bd && now - (this.cool.get(n.id) ?? -999) > BARK_COOL) { best = n; bd = d; }
    }
    if (!best || Math.random() < 0.35) return;
    const lines = BARKS[best.id](s);
    const line = lines[Math.floor(Math.random() * lines.length)];
    this.cool.set(best.id, now);
    this.who = best;
    this.showT = 3.4;
    drawBubble(this.b, line);
    this.sfx.speak(best.voice ?? best.id, 3);
  }
}

// ---------------- fåglar ----------------
const BIRD_AREAS = { home: 'bird', village: 'bird', ranch: 'bird', pass: 'bird', field: 'bird', willowmere: 'bird', galecrown: 'bird', sea: 'gull', desert: 'bird' };

class Birds {
  constructor(scene) {
    this.flocks = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a22, side: THREE.DoubleSide, fog: true });
    const white = new THREE.MeshBasicMaterial({ color: 0xe8e8f0, side: THREE.DoubleSide, fog: true });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.55, 0, 0], 3));
    for (let f = 0; f < 3; f++) {
      const g = new THREE.Group();
      const birds = [];
      for (let k = 0; k < 7; k++) {
        const b = new THREE.Group();
        const L = new THREE.Mesh(wingGeo, mat), R = new THREE.Mesh(wingGeo, mat);
        R.scale.x = -1;
        b.add(L, R);
        b.position.set((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.9, (Math.random() - 0.5) * 0.4, Math.ceil(k / 2) * 0.9);
        g.add(b);
        birds.push({ b, L, R, ph: Math.random() * 6 });
      }
      g.visible = false;
      g.userData.noShadow = true;
      scene.add(g);
      this.flocks.push({ g, birds, a: f * 2.1, r: 30 + f * 12, h: 22 + f * 6, speed: 0.12 + f * 0.03, mat, white });
    }
  }

  update(dt, area, camera, s) {
    const kind = area && !area.indoor ? BIRD_AREAS[area.id] : null;
    for (const fl of this.flocks) {
      fl.g.visible = !!kind;
      if (!kind) continue;
      for (const b of fl.birds) for (const m of [b.L, b.R]) m.material = kind === 'gull' ? fl.white : fl.mat;
      fl.a += dt * fl.speed;
      const cx = camera.position.x, cz = camera.position.z;
      fl.c ??= new THREE.Vector3(cx, 0, cz);
      // Flocken följer långsamt efter, så att den alltid syns någonstans på himlen
      fl.c.x += (cx - fl.c.x) * Math.min(1, dt * 0.05);
      fl.c.z += (cz - fl.c.z) * Math.min(1, dt * 0.05);
      if (Math.hypot(cx - fl.c.x, cz - fl.c.z) > 200) fl.c.set(cx, 0, cz);
      const x = fl.c.x + Math.cos(fl.a) * fl.r, z = fl.c.z + Math.sin(fl.a) * fl.r;
      fl.g.position.set(x, camera.position.y * 0.3 + fl.h, z);
      fl.g.rotation.y = -fl.a;
      const t = performance.now() / 1000;
      for (const b of fl.birds) {
        const w = Math.sin(t * 7 + b.ph) * 0.7;
        b.L.rotation.z = w;
        b.R.rotation.z = -w;
      }
    }
  }
}

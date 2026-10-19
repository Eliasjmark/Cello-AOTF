// Cello: Ashes of the Fallen – prototyp 0.7: öknen The Ember Wastes, The Sun-Scorched Pyramid och Ra's Shattered Prism.
import * as THREE from 'three';
import { WorldCollider } from './collide.js';
import { buildWorld } from './world.js';
import { createSky } from './sky.js';
import { Player } from './player.js';
import { CameraRig } from './cameraRig.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { Effects } from './effects.js';
import { Enemies } from './enemies.js';
import { Combat } from './combat.js';
import { Dialog } from './dialog.js';
import { Story, loadSave } from './story.js';
import { LightPool } from './lights.js';
import { Music } from './music.js';
import { Pots } from './pots.js';
import { Inventory } from './inventory.js';
import { Folk } from './folk.js';
import { Goat } from './goat.js';

const PIXEL_LINES = 360; // retroläge: spelet ritas i ungefär så här många rader
const FLASH = new THREE.Color(0x8d98b4);

function start(saved = {}) {
  const canvas = document.getElementById('game');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (err) {
    document.getElementById('nogl').hidden = false;
    document.getElementById('start').hidden = true;
    return;
  }
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x323843, 34, 260);
  const fogBase = new THREE.Color(0x323843);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);

  const hemi = new THREE.HemisphereLight(0x9aa7bd, 0x3a3029, 1.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc6d0e6, 1.25);
  moon.position.set(-40, 60, 25);
  scene.add(moon);
  const base = { hemi: 1.5, moon: 1.25, flash: 1 };

  const sky = createSky(scene);
  const lights = new LightPool(scene, 8);
  const world = buildWorld(scene, lights);
  const areas = world.areas;
  const B = world.builder;
  B.camera = camera;
  const collider = new WorldCollider(areas.get('village').ensureOctree());
  collider.area = 'village';
  world.connect(collider);
  const ray = new THREE.Ray(), down = new THREE.Vector3(0, -1, 0);
  const groundAt = (x, y, z) => {
    ray.origin.set(x, y + 1.6, z);
    ray.direction.copy(down);
    const hit = collider.rayIntersect(ray, 4);
    return hit ? hit.position.y : null;
  };

  const sfx = new Sfx();
  const music = new Music(sfx);
  const fx = new Effects(scene);
  const homeStart = areas.get('home').entry('start');
  const player = new Player(scene, collider, homeStart.pos, homeStart.facing);
  const rig = new CameraRig(camera, collider);
  const input = new Input(canvas);
  const hud = new Hud(input);
  const dialog = new Dialog(sfx);
  const enemies = new Enemies(scene, collider, world.isSafe);
  for (const s of B.enemySpots) {
    const e = enemies.add(s.home, s.path, { kind: s.kind, area: s.area, respawn: s.respawn ?? true });
    if (s.kind === 'shield') e.blockHint = 'The shield stops the sword. Strike the ground with the hammer to shatter it!';
  }
  const bastion = world.bastion;
  const pyramid = world.pyramid;
  for (const [id, dg] of Object.entries(world.dungeons)) {
    for (const s of dg.enemySpots) {
      const e = enemies.add(s.home, s.path, { kind: s.kind, room: s.room, dormant: s.dormant, respawn: false, bounds: s.bounds, group: id, area: id });
      if (s.kind === 'shield') e.blockHint = 'The shield stops the sword. Strike the ground with the hammer to shatter it!';
      if (s.kind === 'shade') e.immuneHint = 'The blade passes through the shadow. Only sunlight can make it solid!';
    }
  }
  // Fängelsehålan i området Cello är i (eller null)
  const dungeon = () => world.dungeonAt(areas.id);
  // Krukor i alla områden
  const pots = new Pots(scene);
  for (const p of B.potSpots) pots.add(p.x, p.y, p.z, p.s, p.area);
  pots.build(collider);
  const combat = new Combat({ scene, player, enemies, rig, fx, sfx, hud, world: collider, camera });
  const story = new Story({ scene, world, player, enemies, combat, rig, hud, dialog, sfx, fx, groundAt, lights, music });
  const inventory = new Inventory({ story, player, hud, sfx, input, fx, lights, music, world });
  story.inventory = inventory;
  const folk = new Folk({ story, world, inventory, sfx, hud, fx, lights, music, enemies });
  story.folk = folk;
  // Grumble, getabocken man kan rida på
  const goat = new Goat({ areas, scene, player, sfx, fx, hud, story, groundAt, M: B.M });
  if (world.ranch.grumble) goat.setTether(world.ranch.grumble.pos, world.ranch.grumble.facing);
  story.goat = goat;
  player.onKnockedOff = (g) => g.dismount({ thrown: true });
  player.onHoof = (k) => sfx.play('hoof', { vol: 0.45 + k * 0.5 });
  hud.onItems = () => inventory.refresh(true);
  for (const dg of Object.values(world.dungeons)) dg.game = { player, enemies, sfx, fx, hud, rig, dialog, story, lights };
  const world2 = { player, fx, sfx, onBlocked() {}, onPlayerHit() {} };

  // ---------- skärvor, hjärtan och vad fiender och krukor lämnar efter sig ----------
  const roll = (p) => Math.random() < p;
  fx.drop = (pos, kind, p = player) => {
    const hurt = p.hp < p.maxHp, low = p.hp <= p.maxHp / 2;
    if (kind === 'askling' || kind === 'shield') {
      if (roll(hurt ? 0.5 : 0.22)) fx.spawnHeart(pos);
      if (roll(0.75)) fx.spawnShard(pos, roll(0.08) ? 20 : roll(0.35) ? 5 : 1);
      if (kind === 'shield') fx.spawnShard(pos, 5);
    } else if (kind === 'bat') {
      if (roll(0.25)) fx.spawnHeart(pos);
      else if (roll(0.5)) fx.spawnShard(pos, 1);
    } else if (kind === 'pot') {
      if (roll(low ? 0.6 : hurt ? 0.35 : 0.12)) fx.spawnHeart(pos);
      else if (roll(0.5)) fx.spawnShard(pos, roll(0.2) ? 5 : 1);
    } else if (kind === 'grass') {
      if (hurt && roll(0.05)) fx.spawnHeart(pos);
      else if (roll(0.09)) fx.spawnShard(pos, roll(0.08) ? 5 : 1);
    }
  };
  fx.onPickup = (kind, value) => {
    if (kind === 'shard') {
      inventory.addShards(value);
      sfx.play('shard', { vol: value });
      return true;
    }
    player.heal(2);
    hud.setHearts(player.hp, player.maxHp);
    sfx.play('heart');
    return true;
  };
  pots.onBreak = (p) => {
    const at = p.pos.clone().setY(p.pos.y + 0.4);
    sfx.play('potbreak');
    fx.burst('debris', at, 14, 0x8a5a3c);
    fx.burst('ash', at, 5);
    fx.drop(p.pos.clone(), 'pot');
  };

  // ---------- avståndsgallring ----------
  // Saker långt från kameran ritas inte (fiender, folk, eldar, fästningens rörliga delar).
  // Varje sak läggs i en grupp i sitt område, så att den bara syns där.
  const culled = [];
  const holder = (objs, pos, r, area) => {
    const h = new THREE.Group();
    (area ? areas.get(area).root : scene).add(h);
    for (const o of objs) if (o) h.add(o);
    culled.push({ obj: h, pos, r2: r * r, area });
  };
  for (const e of enemies.list) holder([e.model.root, e.excl], e.pos, e.group !== 'world' ? 46 : 72, e.area);
  for (const n of Object.values(story.npcs)) if (n.id !== 'maren') holder([n.model.root], n.pos, 62, n.area);
  for (const f of world.fires) culled.push({ obj: f.group, pos: f.pos, r2: (f.smokeHeight > 6 ? 700 : 90) ** 2, area: f.area });
  holder([bastion.warden.model.root], bastion.warden.pos, 48, 'bastion');
  holder([bastion.boss.model.root], bastion.boss.pos, 64, 'bastion');
  culled.push({ obj: bastion.D, pos: new THREE.Vector3(0, 0, -186), r2: 100 * 100, area: 'bastion' });
  const cullS = { t: 0, runs: 0 };
  const cull = (dt, force = false) => {
    cullS.t = Math.min(cullS.t, 0.2) - dt;
    if (cullS.t > 0 && !force) return;
    cullS.t = 0.2;
    cullS.runs++;
    const here = areas.id;
    for (const c of culled) c.obj.visible = (!c.area || c.area === here) && c.pos.distanceToSquared(camera.position) < c.r2;
  };

  // ---------- när Cello kommer till ett nytt område ----------
  areas.onActivate = (a) => {
    scene.fog.color.set(a.fog.color);
    fogBase.set(a.fog.color);
    scene.fog.near = a.fog.near;
    scene.fog.far = a.fog.far;
    base.hemi = a.light.hemi;
    base.moon = a.light.moon;
    base.flash = a.light.flash;
    hemi.color.set(a.light.sky ?? 0x9aa7bd);
    hemi.groundColor.set(a.light.ground ?? 0x3a3029);
    moon.color.set(a.light.moonColor ?? 0xc6d0e6);
    sky.setIndoor?.(!!a.indoor);
    goat.enterArea(a.id);
    enemies.enterArea(a.id);
    pots.setArea(a.id);
    B.regrow(a);
    folk.enterArea(a.id);
    inventory.enterArea(a);
    // Kompilera nya material medan skärmen är svart, så att spelet inte hackar när bilden kommer tillbaka.
    // Allt i området görs synligt en stund, även fiender och folk som annars är för långt bort.
    for (const c of culled) if (c.area === a.id) c.obj.visible = true;
    try { renderer.compile(scene, camera); } catch { /* inte viktigt */ }
    cull(0, true);
  };

  // Startskärmen visar den brinnande byn; Fortsätt finns om det finns ett sparat spel
  story.newGame(true);
  let save = loadSave();
  hud.showContinue(!!save);
  const unlockAudio = () => {
    sfx.init();
    music.unlock();
  };
  addEventListener('pointerdown', unlockAudio);
  addEventListener('keydown', unlockAudio);
  hud.onBegin = (mode) => {
    unlockAudio();
    if (mode === 'resume') return;
    if (mode === 'continue' && save) story.loadGame(save);
    else story.newGame();
    rig.snap(player);
    inventory.refresh();
  };
  hud.setHearts(player.hp, player.maxHp);

  // Ljud och effekter kopplade till Cellos händelser
  player.onJump = () => sfx.play('hup');
  player.onAutoJump = () => sfx.play('hup', { vol: 0.7 });
  player.onLand = (impact) => { if (impact > 6) sfx.play(player.heavy ? 'heavystep' : 'land', { vol: Math.min(1, impact / 18) }); };
  player.onStep = (k) => (k < 0 ? sfx.play('heavystep', { vol: 0.8 }) : sfx.play('step', { vol: 0.5 + k * 0.5 }));
  player.onAttack = (i) => {
    sfx.play('swing', { vol: i === 2 ? 1.2 : 1 });
    sfx.play(i === 2 ? 'hyah' : 'hah');
  };
  player.onDodge = (kind) => sfx.play(kind === 'roll' ? 'roll' : 'hup', { vol: 0.8 });
  player.onBlock = () => {
    sfx.play('clang');
    rig.shake(0.15);
    fx.hitStop(0.05);
    const s = player.feet.clone();
    s.y += 1.2;
    s.x += Math.sin(player.facing) * 0.5;
    s.z += Math.cos(player.facing) * 0.5;
    fx.burst('spark', s, 14, 0xbfe4ff);
  };
  player.onHurt = (hp) => {
    sfx.play(hp > 0 ? 'hurt' : 'fall');
    rig.shake(0.5);
    fx.hitStop(0.1);
    fx.burst('spark', player.feet.clone().setY(player.feet.y + 1.1), 10, 0xff8a6a);
    hud.setHearts(hp, player.maxHp);
  };
  player.onHeavy = (on) => {
    sfx.play(on ? 'heavyon' : 'heavyoff');
    if (on) fx.burst('spark', player.feet.clone().setY(player.feet.y + 1.0), 10, 0x9fdcff);
    inventory.refresh();
  };
  player.onSwordWear = (kind) => {
    if (kind === 'broken') {
      sfx.play('snap');
      fx.burst('spark', player.swordTip.clone(), 18, 0xdfe6ee);
      rig.shake(0.25);
      hud.toast("Cello's sword snapped! The broken blade still cuts, but weakly. Vane in Aetheria or the shop in Willowmere can make a new one.", 6000);
    } else hud.toast("Cello's sword is getting dull. A smith can make him a new one.", 4200);
    inventory.refresh();
  };
  player.onSlamStart = () => sfx.play('hyah', { vol: 0.8 });
  player.onSlam = (point) => {
    sfx.play('slam');
    rig.shake(0.45);
    fx.hitStop(0.06);
    fx.shockwave(point, 0x9fdcff, 3.2);
    fx.burst('spark', point.clone().setY(point.y + 0.2), 22, 0x9fdcff);
    fx.burst('ash', point.clone().setY(point.y + 0.2), 12);
    lights.flash(point.clone().setY(point.y + 1), 0x9fdcff, 30, 9, 0.3);
    const ctx = { player, fx, sfx };
    enemies.slam(point, ctx);
    pots.slam(point);
    // Hammaren plattar till gräset runt slaget
    for (const at of B.cutGrass(areas.cur, point, 0, 2.6, Math.PI)) fx.drop(at, 'grass');
    const dg = dungeon();
    if (dg) {
      const bosses = dg === bastion ? [bastion.warden, bastion.boss] : [pyramid.khepri, pyramid.boss];
      for (const b of bosses) {
        if (!b) continue;
        const hp = b.hp;
        b.slamHit(point, ctx);
        if (b.hp < hp) {
          sfx.play('hit', { vol: 1.3 });
          sfx.play('ehurt');
          fx.burst('spark', b.chest.clone(), 20, 0xffe2a0);
          rig.shake(0.3);
        }
      }
    }
    if (!(dg && dg.slam(point, player.feet))) story.slam(point);
  };
  sky.onBolt = (dist) => { if (base.flash > 0) sfx.play('thunder', { delay: 0.4 + dist / 340, vol: 0.7 }); };

  // Gräset: svärdet skär tuvorna, och ibland ligger det en skärva eller ett hjärta under
  let grassSwing = -1;
  const cutGrass = () => {
    const sw = player.swing;
    if (!sw || !sw.active || sw.id === grassSwing) return;
    const cut = B.cutGrass(areas.cur, player.feet, player.facing, sw.reach, sw.arc);
    if (!cut.length) return;
    grassSwing = sw.id;
    sfx.play('grass');
    for (const at of cut) {
      fx.burst('debris', at.clone().setY(at.y + 0.3), 3, 0x5a7a40);
      fx.drop(at, 'grass');
    }
  };

  let pixel = saved.pixel ?? true;
  function resize() {
    const w = innerWidth, h = innerHeight;
    const s = pixel ? Math.min(1, PIXEL_LINES / h) : Math.min(devicePixelRatio || 1, 2);
    renderer.setSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), false);
    canvas.classList.toggle('smooth', !pixel);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // Kartan pausar spelet
  const inDungeon = () => story.phase === 'free' && !!dungeon();
  const inRooms = () => {
    const dg = inDungeon() ? dungeon() : null;
    if (!dg) return null;
    if (dg === bastion) return player.feet.z < -142 ? dg : null;
    return dg.inside(player.feet) ? dg : null;
  };
  const drawMap = (mv) => {
    const dg = inRooms();
    if (dg === bastion) return mv.drawBastion(bastion, player);
    if (dg === pyramid) return mv.drawPyramid(pyramid, player);
    return mv.drawArea(areas, story, player);
  };
  const toggleMap = (on) => {
    hud.showMap(on, drawMap);
    sfx.play('choice');
  };
  hud.el.map.addEventListener('click', () => toggleMap(false));

  // Återställ läget efter en uppdatering av sidan (bara efter prologen)
  if (saved.started && saved.phase === 'free' && saved.state) {
    hud.begin(true, 'resume');
    story.loadGame({ state: saved.state });
    if (saved.pos) player.teleport(new THREE.Vector3().fromArray(saved.pos));
    rig.snap(player);
  }
  window.claude?.hot?.snapshot?.(() => ({
    started: hud.started, phase: story.phase, state: { ...story.state, area: areas.id }, pos: player.feet.toArray(), pixel,
  }));

  // ---------- Musiken: vilket spår som hörs var ----------
  const musicCue = () => {
    if (!hud.started) return { id: 'hymn', now: true };
    if (story.musicHold) return { id: story.musicHold.id, now: true };
    const ph = story.phase, P = player.feet, s = story.state, here = areas.id;
    if (ph === 'blackout') return { id: null, now: true };
    if (ph === 'titan') return { id: 'warlord', now: true };
    if (ph === 'intro') return { id: story.introRoar ? 'whispers' : 'fieldsdawn', now: story.introRoar };
    if (ph === 'prologue') return { id: 'fieldsdawn', now: true };
    if (ph === 'carry') return { id: world.inAetheria(P.x, P.z) || story.arriving ? 'hearth' : 'whispers' };
    if (here === 'pyramid') {
      if (pyramid.trap === 'boss') return { id: 'warlord', now: true };
      if (pyramid.trap === 'khepri') return { id: 'march', now: true };
      if (pyramid.trap === 'P2' || pyramid.trap === 'P4') return { id: 'march', now: true };
      if (pyramid.state.cleared.boss && P.z < -51) return { id: 'dawn', now: true };
      return { id: 'skull' };
    }
    if (here === 'bastion') {
      if (bastion.trap === 'boss') return { id: 'warlord', now: true };
      if (bastion.trap === 'warden') return { id: 'march', now: true };
      if (bastion.state.cleared.boss && P.z < -196.5) return { id: 'dawn', now: true };
      if (P.z < -150) return { id: 'skull' };
      return { id: 'march' };
    }
    if (here === 'village') {
      if (world.inAetheria(P.x, P.z)) return { id: 'hearth' };
      if (world.inVillage(P.x, P.z)) return { id: s.bastionDone ? 'firstlight' : 'forgotten' };
      if (P.z < -108) return { id: 'quiet' };
      return { id: undefined };
    }
    // Öknen: lugnt vid oasen, kusligt ute bland dynerna
    if (here === 'desert') return { id: world.areas.cur.isSafe?.(P.x, P.z) ? 'quiet' : 'whispers' };
    // Fältet: ett långsamt spår i moll (Elias ville ha något kusligare än galoppen)
    const byArea = {
      home: 'fieldsdawn', house: 'fieldsdawn', ranch: 'greenroad', pass: 'quiet', field: 'forgotten', willowmere: 'willowmere',
      shop: 'willowmere', stormreach: 'march', cave: 'whispers',
    };
    if (here === 'pass' && P.z < -62) return { id: 'ballad' };
    return { id: byArea[here] };
  };
  let musicNow = null, musicPend = null, musicPendT = 0;
  function updateMusic(dt) {
    const cue = musicCue();
    if (cue.id === undefined || cue.id === musicNow) musicPend = null;
    else if (cue.now) { musicNow = cue.id; musicPend = null; }
    else {
      if (musicPend !== cue.id) { musicPend = cue.id; musicPendT = 0; }
      musicPendT += dt;
      if (musicPendT > 0.9) { musicNow = musicPend; musicPend = null; }
    }
    music.play(musicNow);
    music.talkDuck = dialog.active ? 0.7 : 1;
    music.update(dt);
  }

  let respawn = null; // { t, kind: 'fall' | 'death' }
  const timer = new THREE.Timer();
  timer.connect?.(document);
  let t = 0;

  function frame(ts) {
    requestAnimationFrame(frame);
    timer.update(ts);
    const dt = Math.max(0, Math.min(timer.getDelta(), 0.05));
    if (!window.__realm?.hold) update(dt, input.poll(dt));
    renderer.render(scene, camera);
  }

  // All spellogik för en bildruta (utan ritning), så att den även går att testa snabbt
  function update(dt, inp) {
    if (inp.togglePixel) {
      pixel = !pixel;
      resize();
      hud.toast(pixel ? 'Retro mode on' : 'Retro mode off');
    }
    if (inp.toggleHelp) hud.toggleHelp();
    if (inp.toggleInfo) hud.toggleInfo();
    if (inp.toggleMute) {
      sfx.setMuted(!sfx.muted);
      hud.toast(sfx.muted ? 'Sound off' : 'Sound on');
    }
    if (inp.walkChanged && hud.started) hud.toast(input.walkMode ? 'Walking' : 'Running');
    if (inp.toggleMusic) {
      music.setEnabled(!music.enabled);
      hud.toast(music.enabled ? 'Music on' : 'Music off');
    }
    if (!hud.started && inp.start) hud.begin(false, save ? 'continue' : 'new');

    const calm = !dialog.active && !story.cinematic && !story.fade && !respawn;
    if (hud.started && inp.map && !inventory.open && (hud.mapOpen || calm)) toggleMap(!hud.mapOpen);
    let bagNow = false;
    if (hud.started && inp.bag && !hud.mapOpen && (inventory.open || (calm && story.phase !== 'intro'))) {
      inventory.toggle();
      bagNow = true;
    }
    if (hud.mapOpen) {
      drawMap(hud.mapView);
      hud.frame(dt, player);
      music.update(dt);
      return;
    }
    if (inventory.open) {
      if (!bagNow) inventory.menu(dt, inp);
      hud.frame(dt, player);
      music.update(dt);
      return;
    }
    t += dt;

    let sim = dt;
    if (fx.hitstop > 0) {
      fx.hitstop -= dt;
      sim = 0;
    }

    if (hud.started) {
      const talking = dialog.active;
      if (talking) dialog.update(dt, inp);
      const blocked = talking || story.cinematic || !!story.fade || !!respawn;
      const pin = blocked ? input.empty : inventory.actions(inp);
      if (sim > 0) {
        const dg = dungeon();
        combat.extra = story.combatTargets().concat(dg ? dg.combatTargets() : []).concat(folk.combatTargets());
        player.update(sim, pin, rig.yaw);
        goat.update(sim);
        if (!talking && !story.shown) enemies.update(sim, world2);
        combat.update(sim, pin);
        cutGrass();
        pots.update(sim, player);
        story.update(sim, blocked ? input.empty : inp);
        folk.update(sim, blocked);
        if (dg) dg.update(sim, t, talking || !!story.shown || !!story.fade);
        inventory.update(sim);
        fx.update(sim, player);
      }
      hud.setLetterbox(!!combat.lock || dialog.active || (story.cinematic && !story.traveling));
      document.body.classList.toggle('talking', dialog.active);
      if (dialog.active && dialog.focus) rig.lockTarget = dialog.focus;

      if (!respawn && player.fellOut()) {
        respawn = { t: 0, kind: 'fall' };
        hud.fade(true, 'Cello fell into the storm');
      }
      if (!respawn && player.state === 'dead' && player.stateT > 1.4) {
        respawn = { t: 0, kind: 'death' };
        hud.fade(true, 'Cello fell in battle');
      }
      if (respawn) {
        const before = respawn.t;
        respawn.t += dt;
        if (before < 0.9 && respawn.t >= 0.9) {
          if (respawn.kind === 'death') {
            if (story.phase === 'free' && dungeon()) dungeon().onPlayerDeath();
            const sp = story.phase === 'free' ? story.respawnPoint() : areas.get('home').entry('start');
            player.revive(sp.pos, sp.facing);
            enemies.enterArea(areas.id);
            pots.restoreAll();
            fx.clearHearts();
            if (inventory.potionRevive()) hud.toast('Cello drinks a Healing Draught as he falls...', 3000);
          } else {
            player.respawn();
            player.hp = Math.max(1, player.hp - 1);
            player.invuln = 1;
          }
          combat.unlock(true);
          hud.setHearts(player.hp, player.maxHp);
          rig.snap(player);
          hud.fade(false);
        }
        if (respawn.t > 1.3) respawn = null;
      }
      rig.indoor = (inDungeon() && areas.id === 'bastion' && player.feet.z < -150) || !!areas.cur?.indoor;
      rig.update(dt, blocked ? input.empty : inp, player);
      player.model.root.visible = (rig.cur > 0.95 || rig.fallLock || !!rig.cinematic) && player.visibleBlink;
      hud.setDungeon(inRooms()?.state ?? null);
    } else {
      // Startskärmen: kameran glider långsamt runt den brinnande byn
      const a = t * 0.05 + 0.6;
      camera.position.set(Math.sin(a) * 30, 11, Math.cos(a) * 30);
      camera.lookAt(0, 2.2, 0);
      story.titan.update(dt, player);
    }

    const flash = sky.update(dt, t, camera) * base.flash;
    hemi.intensity = base.hemi + flash * 1.8;
    moon.intensity = base.moon + flash * 1.4;
    scene.fog.color.copy(fogBase).lerp(FLASH, flash * 0.22);
    world.update(t, dt);
    cull(dt);
    lights.update(dt, t, hud.started ? player.feet : camera.position);
    fx.airAsh.update(dt, camera.position);
    sfx.ambience(dt, story.ambienceState());
    updateMusic(dt);
    hud.frame(dt, player);
  }

  // Handtag för felsökning i webbläsarens konsol
  window.__realm = {
    player, rig, world, areas, input, hud, scene, camera, enemies, combat, fx, sfx, story, dialog, bastion, pyramid, lights, collider, renderer,
    culled, cullS, music, pots, inventory, folk, goat, THREE,
    tick: (dt, inp) => update(dt, { ...input.empty, ...inp }),
  };
  requestAnimationFrame(frame);
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});

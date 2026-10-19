// Cello: Ashes of the Fallen – prototyp 0.4: vägen hem, större öar och The Tempest Bastion.
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
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
import { WorldCollider } from './collide.js';
import { LightPool } from './lights.js';
import { Music } from './music.js';
import { Pots } from './pots.js';

const PIXEL_LINES = 360; // retroläge: spelet ritas i ungefär så här många rader
const FOG = new THREE.Color(0x323843);
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
  scene.fog = new THREE.Fog(FOG.clone(), 34, 260);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);

  const hemi = new THREE.HemisphereLight(0x9aa7bd, 0x3a3029, 1.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc6d0e6, 1.25);
  moon.position.set(-40, 60, 25);
  scene.add(moon);

  const sky = createSky(scene);
  const lights = new LightPool(scene, 8);
  const world = buildWorld(scene, lights);
  const octree = new Octree();
  octree.fromGraphNode(world.collision);
  const collider = new WorldCollider(octree);
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
  const player = new Player(scene, collider, world.spawn, world.spawnFacing);
  const rig = new CameraRig(camera, collider);
  const input = new Input(canvas);
  const hud = new Hud(input);
  const dialog = new Dialog(sfx);
  const enemies = new Enemies(scene, collider, world.isSafe);
  for (const s of world.enemySpots) enemies.add(s.home, s.path);
  const bastion = world.bastion;
  for (const s of bastion.enemySpots) {
    const e = enemies.add(s.home, s.path, { kind: s.kind, room: s.room, dormant: s.dormant, respawn: false, bounds: s.bounds, group: 'bastion' });
    if (s.kind === 'shield') e.blockHint = 'The shield stops the sword. Strike the ground with the hammer (F) to shatter it!';
  }
  // Krukor i fästningens rum, på förgården, i arenan och i byn
  const pots = new Pots(scene);
  {
    const B = (x, z, y = 0) => pots.add(x, y, z);
    [[7.6, -151.6], [-8.0, -157], [8.0, -166.6], [-27.6, -151.5], [-27.6, -166.6], [-12.4, -166.6],
      [-11.8, -176.5], [11.8, -176.5], [-11.8, -189], [11.8, -189], [-33.6, -184], [-16.4, -188.5],
      [34, -151.4], [34, -166.5], [16.4, -178], [33.6, -190.6], [13.6, -214], [-13.6, -214], [0, -227.6],
      [-10.5, -144.5], [10.5, -144.5]].forEach(([x, z]) => B(x, z));
    B(16.4, -177.5, -6);
    B(33.8, -177.6, -6);
    // Byn: vid tunnor och lådor
    for (const [x, z] of [[11.2, 13.9], [-12.2, 16.4], [8.6, 27.4], [-19.4, 5.6], [14.6, 15.4]]) {
      const y = groundAt(x, 3, z);
      if (y !== null) pots.add(x, y, z, 0.9);
    }
  }
  pots.build(collider);
  pots.onBreak = (p) => {
    const at = p.pos.clone().setY(p.pos.y + 0.4);
    sfx.play('potbreak');
    fx.burst('debris', at, 14, 0x8a5a3c);
    fx.burst('ash', at, 5);
    const low = player.hp < player.maxHp / 2;
    if (Math.random() < (low ? 0.6 : 0.35)) fx.spawnHeart(p.pos.clone());
  };
  const combat = new Combat({ scene, player, enemies, rig, fx, sfx, hud, world: collider, camera });
  const story = new Story({ scene, world, player, enemies, combat, rig, hud, dialog, sfx, fx, groundAt, lights, music });
  bastion.game = { player, enemies, sfx, fx, hud, rig, dialog, story, lights };
  const world2 = { player, fx, sfx, onBlocked() {}, onPlayerHit() {} };

  // Saker långt från kameran ritas inte alls (fiender, folk, eldar, fästningens rörliga delar).
  // Varje sak läggs i en egen grupp, så att dess egen kod fortfarande kan visa och dölja den.
  const culled = [];
  const holder = (objs, pos, r) => {
    const h = new THREE.Group();
    scene.add(h);
    for (const o of objs) if (o) h.add(o);
    culled.push({ obj: h, pos, r2: r * r });
  };
  // I fästningen står väggar i vägen, så där räcker ett kortare avstånd
  for (const e of enemies.list) holder([e.model.root, e.excl], e.pos, e.group === 'bastion' ? 42 : 72);
  for (const [id, n] of Object.entries(story.npcs)) if (id !== 'maren') holder([n.model.root], n.pos, 62);
  for (const f of world.fires) culled.push({ obj: f.group, pos: f.pos, r2: (f.smokeHeight > 6 ? 700 : 78) ** 2 });
  holder([bastion.warden.model.root], bastion.warden.pos, 48);
  holder([bastion.boss.model.root], bastion.boss.pos, 64);
  culled.push({ obj: bastion.D, pos: new THREE.Vector3(0, 0, -186), r2: 100 * 100 });
  const cullS = { t: 0, runs: 0 };
  const cull = (dt) => {
    cullS.t = Math.min(cullS.t, 0.2) - dt;
    if (cullS.t > 0) return;
    cullS.t = 0.2;
    cullS.runs++;
    for (const c of culled) c.obj.visible = c.pos.distanceToSquared(camera.position) < c.r2;
  };

  // Startskärmen visar den brinnande byn; Fortsätt finns om det finns ett sparat spel
  story.newGame(true);
  let save = loadSave();
  hud.showContinue(!!save);
  // Webbläsare spelar inget ljud förrän man har klickat eller tryckt på en tangent.
  // Första gången det händer (även på startskärmen) startar ljudet och titelmusiken.
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
    hud.setItems(player);
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
    hud.setItems(player);
  };
  player.onSlamStart = () => sfx.play('hyah', { vol: 0.8 });
  // Markslaget: chockvåg, blixt i golvet, krossade sköldar och kopparrännor som vaknar
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
    for (const b of [bastion.warden, bastion.boss]) {
      const hp = b.hp;
      b.slamHit(point, ctx);
      if (b.hp < hp) {
        sfx.play('hit', { vol: 1.3 });
        sfx.play('ehurt');
        fx.burst('spark', b.chest.clone(), 20, 0xffe2a0);
        rig.shake(0.3);
      }
    }
    if (!bastion.slam(point, player.feet)) story.slam(point);
  };
  fx.onPickup = () => {
    player.heal(2);
    hud.setHearts(player.hp, player.maxHp);
    sfx.play('heart');
    return true;
  };
  sky.onBolt = (dist) => sfx.play('thunder', { delay: 0.4 + dist / 340, vol: 0.7 });

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
  const inDungeon = () => story.phase === 'free' && world.inBastion(player.feet.x, player.feet.z);
  const drawMap = (mv) => (inDungeon() ? mv.drawBastion(bastion, player) : mv.drawWorld(world, story, player));
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
    started: hud.started, phase: story.phase, state: story.state, pos: player.feet.toArray(), pixel,
  }));

  // ---------- Musiken: vilket spår som hörs var ----------
  // Platser byter spår först när Cello har varit där en liten stund (så att musiken inte hackar
  // vid en gräns); strider, filmscener och berättelsens ögonblick byter direkt.
  const musicCue = () => {
    if (!hud.started) return { id: 'hymn', now: true };
    if (story.musicHold) return { id: story.musicHold.id, now: true };
    const ph = story.phase, P = player.feet, s = story.state;
    if (ph === 'blackout') return { id: null, now: true };
    if (ph === 'titan') return { id: 'warlord', now: true };
    if (ph === 'intro') return { id: story.introRoar ? 'whispers' : 'willowmere', now: true };
    if (ph === 'prologue') return { id: 'fieldsdawn', now: true };
    if (ph === 'carry') return { id: world.inAetheria(P.x, P.z) || story.arriving ? 'hearth' : 'whispers' };
    if (world.inBastion(P.x, P.z)) {
      if (bastion.trap === 'boss') return { id: 'warlord', now: true };
      if (bastion.trap === 'warden') return { id: 'march', now: true };
      if (bastion.state.cleared.boss && P.z < -196.5) return { id: 'dawn', now: true };
      if (P.z < -150) return { id: 'skull' };
      return { id: 'greenroad' };
    }
    if (world.inAetheria(P.x, P.z)) return { id: 'hearth' };
    if (world.inVillage(P.x, P.z)) return { id: s.bastionDone ? 'firstlight' : 'forgotten' };
    if (P.z > 68) return { id: 'willowmere' };
    if (P.x > 47) return { id: 'gallop' };
    if (P.z < -108 || (P.z > 43 && P.z < 56)) return { id: 'greenroad' };
    return { id: undefined }; // broar mellan öarna: behåll det som spelas
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
    // Tiden kan i sällsynta fall hoppa bakåt (t.ex. i bakgrundsflikar); då står spelet still en bildruta
    const dt = Math.max(0, Math.min(timer.getDelta(), 0.05));
    // window.__realm.hold = true pausar spelslingan (används av de automatiska testerna)
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

    if (hud.started && inp.map && (hud.mapOpen || (!dialog.active && !story.cinematic && !story.fade && !respawn))) toggleMap(!hud.mapOpen);
    if (hud.mapOpen) {
      drawMap(hud.mapView);
      hud.frame(dt, player);
      music.update(dt);
      return;
    }
    t += dt;

    // Hitstop: världen fryser ett ögonblick vid hårda träffar, kameran skakar vidare
    let sim = dt;
    if (fx.hitstop > 0) {
      fx.hitstop -= dt;
      sim = 0;
    }

    if (hud.started) {
      const talking = dialog.active;
      if (talking) dialog.update(dt, inp);
      const blocked = talking || story.cinematic || !!story.fade || !!respawn;
      const pin = blocked ? input.empty : inp;
      if (sim > 0) {
        combat.extra = story.combatTargets().concat(bastion.combatTargets());
        player.update(sim, pin, rig.yaw);
        if (!talking && !story.shown) enemies.update(sim, world2);
        combat.update(sim, pin);
        pots.update(sim, player);
        story.update(sim, blocked ? input.empty : inp);
        bastion.update(sim, t, talking || !!story.shown || !!story.fade);
        fx.update(sim, player);
      }
      hud.setLetterbox(!!combat.lock || dialog.active || story.cinematic);
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
            const A = world.aetheria;
            if (story.phase === 'free' && world.inBastion(player.feet.x, player.feet.z)) {
              // Som i klassiska äventyrsspel: tillbaka till fästningens ingång, och fällorna återställs
              bastion.onPlayerDeath();
              player.revive(world.bastionEntrance, Math.PI);
            } else if (story.phase === 'free') player.revive(A.spawn, A.spawnFacing);
            else player.revive(world.spawn, world.spawnFacing);
            enemies.resetAll();
            pots.restoreAll();
            fx.clearHearts();
          } else {
            player.respawn();
            player.hp = Math.max(1, player.hp - 1); // ett halvt hjärta
            player.invuln = 1;
          }
          combat.unlock(true);
          hud.setHearts(player.hp, player.maxHp);
          rig.snap(player);
          hud.fade(false);
        }
        if (respawn.t > 1.3) respawn = null;
      }
      rig.indoor = inDungeon() && player.feet.z < -150;
      rig.update(dt, blocked ? input.empty : inp, player);
      player.model.root.visible = (rig.cur > 0.95 || rig.fallLock || !!rig.cinematic) && player.visibleBlink;
      hud.setDungeon(inDungeon() ? bastion.state : null);
      hud.setItems(player);
    } else {
      // Startskärmen: kameran glider långsamt runt den brinnande byn
      const a = t * 0.05 + 0.6;
      camera.position.set(Math.sin(a) * 30, 11, Math.cos(a) * 30);
      camera.lookAt(0, 2.2, 0);
      story.titan.update(dt, player);
    }

    const flash = sky.update(dt, t, camera);
    hemi.intensity = 1.5 + flash * 1.8;
    moon.intensity = 1.25 + flash * 1.4;
    scene.fog.color.copy(FOG).lerp(FLASH, flash * 0.22);
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
    player, rig, world, input, hud, scene, camera, enemies, combat, fx, sfx, story, dialog, bastion, lights, collider, renderer, culled, cullS, music, pots,
    tick: (dt, inp) => update(dt, { ...input.empty, ...inp }),
  };
  requestAnimationFrame(frame);
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});

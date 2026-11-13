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
import { Story, loadSave, setLastSlot, continueSlot } from './story.js';
import { TitleScreen, loadSettings, storeSettings } from './title.js';
import { LightPool } from './lights.js';
import { Music } from './music.js';
import { Pots } from './pots.js';
import { Inventory } from './inventory.js';
import { Folk } from './folk.js';
import { Goat } from './goat.js';
import { Clock } from './clock.js';
import { Weather } from './weather.js';
import { Chats } from './talk.js';
import { Songs } from './songs.js';
import { Realm } from './realm.js';
import { loadPack } from './skinned.js';
import { WIND } from './build.js';
import { Chronicle } from './chronicle.js';
import { SeaStory } from './seastory.js';
import { FrostStory } from './froststory.js';
import { ShadowDouble } from './shadow.js';
import { WATER } from './water.js';
import { Post } from './post.js';
import { applyTiers, HealthBars, BossBar } from './foes.js';
import { Motes } from './motes.js';
import { SunShadows, markShadows } from './shadows.js';

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
  const post = new Post(renderer);
  scene.fog = new THREE.Fog(0x323843, 34, 260);
  const fogBase = new THREE.Color(0x323843);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);

  const hemi = new THREE.HemisphereLight(0x9aa7bd, 0x3a3029, 1.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc6d0e6, 1.25);
  moon.position.set(-40, 60, 25);
  scene.add(moon);
  const sun = new SunShadows(renderer, moon, scene);
  // 0.13: ljuset en lugn dag (klassiska äventyrsspel): varmt, disigt solljus och dämpade gröna och bruna toner
  const TP = { sky: new THREE.Color(0xe0d2b0), ground: new THREE.Color(0x5a4630), sun: new THREE.Color(0xffd8a4), fog: new THREE.Color(0xa89878) };
  const base = { hemi: 1.5, moon: 1.25, flash: 1, sky: new THREE.Color(0x9aa7bd), ground: new THREE.Color(0x3a3029), moonColor: new THREE.Color(0xc6d0e6), near: 34, far: 260 };
  // 0.11: dygnet och vädret
  const ENV = {
    nightSky: new THREE.Color(0x4a5a8a), duskSky: new THREE.Color(0xd8956a), nightMoon: new THREE.Color(0x7d8fcf), duskMoon: new THREE.Color(0xffa36a),
    nightFog: new THREE.Color(0x0b0e18), duskFog: new THREE.Color(0x5a3b30), fogGrey: new THREE.Color(0x6a7078), haze: new THREE.Color(0x9a7a52), snowFog: new THREE.Color(0xd4dce6),
  };

  const sky = createSky(scene);
  const clock = new Clock();
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
  const weather = new Weather({ scene, sky, sfx, fx, lights });
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
  const spotLists = [];
  for (const [id, dg] of Object.entries(world.dungeons)) {
    spotLists.push([id, dg.enemySpots]);
    // Fästningens nya delar har egna fiender (0.8)
    for (const w of dg.wings ?? []) spotLists.push([id, w.enemySpots]);
  }
  for (const [id, spots] of spotLists) {
    for (const s of spots) {
      const e = enemies.add(s.home, s.path, { kind: s.kind, room: s.room, dormant: s.dormant, respawn: false, bounds: s.bounds, group: id, area: s.area ?? id, doze: s.doze });
      if (s.kind === 'shield') e.blockHint = 'The shield stops the sword. Strike the ground with the hammer to shatter it!';
      if (s.kind === 'shade') e.immuneHint = 'The blade passes through the shadow. Only sunlight can make it solid!';
    }
  }
  // 0.11: förstärkningar som en flyende askling kan kalla på
  for (let i = 0; i < 3; i++) enemies.add(new THREE.Vector3(0, -500, 0), [], { reserve: true, respawn: false, area: null });
  // Dygnet: varannan askling ute i världen sover på dagen, och några kommer bara fram på natten
  {
    const OUT = new Set(['village', 'field', 'stormreach', 'ranch', 'pass', 'desert']);
    let k = 0;
    for (const e of enemies.list) {
      if (e.group !== 'world' || e.kind === 'bat' || e.reserve || !OUT.has(e.area)) continue;
      if (k++ % 2 === 0) e.sleepy = true;
    }
    const night = B.enemySpots.filter((s) => s.kind !== 'bat' && s.path?.length >= 2 && (s.area === 'field' || s.area === 'stormreach' || s.area === 'desert'));
    night.forEach((s, i) => {
      if (i % 3) return;
      const e = enemies.add(s.path[0].clone(), [s.path[1].clone(), s.home.clone()], { kind: 'askling', area: s.area, respawn: true });
      e.nocturnal = true;
    });
  }
  enemies.hud = hud;
  // 0.17: fienderna får liv, vapen och nya sorter efter hur långt in i spelet de finns
  applyTiers(enemies.list);
  const bars = new HealthBars(scene);
  const bossBar = new BossBar();
  const motes = new Motes(scene);
  // Fängelsehålan i området Cello är i (eller null)
  const dungeon = () => world.dungeonAt(areas.id);
  // Krukor i alla områden
  const pots = new Pots(scene);
  for (const p of B.potSpots) pots.add(p.x, p.y, p.z, p.s, p.area);
  pots.build(collider);
  const combat = new Combat({ scene, player, enemies, rig, fx, sfx, hud, world: collider, camera });
  const story = new Story({ scene, world, player, enemies, combat, rig, hud, dialog, sfx, fx, groundAt, lights, music, clock, weather });
  story.chats = new Chats({ story, sfx, hud });
  // Blixten i åskväder behöver veta var Cello och fienderna är
  weather.game = {
    player, enemies, hud, rig, isSafe: world.isSafe,
    active: () => hud.started && story.phase === 'free' && !dialog.active && !story.cinematic && !story.fade && !window.__realm?.calm,
    area: () => areas.id,
    enemyCtx: () => ({ player, director: enemies, fx, sfx }),
  };
  const inventory = new Inventory({ story, player, hud, sfx, input, fx, lights, music, world });
  story.inventory = inventory;
  const folk = new Folk({ story, world, inventory, sfx, hud, fx, lights, music, enemies });
  story.folk = folk;
  // Grumble, getabocken man kan rida på
  const goat = new Goat({ areas, scene, player, sfx, fx, hud, story, groundAt, M: B.M });
  if (world.ranch.grumble) goat.setTether(world.ranch.grumble.pos, world.ranch.grumble.facing);
  story.goat = goat;
  // Flöjten och sångerna (0.11)
  const songs = new Songs({ story, player, hud, sfx, clock, weather, world, areas, fx, lights, music, rig });
  story.songs = songs;
  // De dödas värld (0.12): vågskålen växlar; andebroar, falska väggar och andar registreras här
  const realm = new Realm({ story, player, hud, sfx, fx, scene, areas, canvas });
  story.realm = realm;
  for (const dg of Object.values(world.dungeons)) if (dg.game) dg.game.realm = realm;
  for (const w of world.necropolis.wings) {
    for (const gh of w.ghosts) realm.add({ ...gh, area: w.id });
    for (const sd of w.spiritDefs) realm.addSpirit(sd);
  }
  // Andar ute i världen: de döda i Hollowbrook och vid karavanen
  realm.addSpirit({
    id: 'hollowElder', area: 'village', pos: new THREE.Vector3(2.5, 0, 4), face: Math.PI, name: 'Spirit of Hollowbrook',
    look: { sculpt: 'bybo', skin: 0xffffff, hairStyle: 'bald', beard: 0xffffff, top: 0xffffff, robe: true, scale: 0.95 },
    lines: [
      'Cello... little Cello, with ash on your boots. You can see us?',
      'Do not grieve so much for us. We are not angry. Not at you.',
      'The titan took our hearts the night the village burned. We felt them go... down, under the world.',
      'If the Devourer is gone, perhaps we can rest at last. Go on, child. The living need you more than we do.',
    ],
  });
  if (world.desert?.caravan) {
    const c = world.desert.caravan;
    realm.addSpirit({
      id: 'caravanGuard', area: 'desert', pos: new THREE.Vector3(c.x + 2.5, c.y, c.z - 2), face: 2.2, name: 'Spirit of a Caravan Guard',
      look: { skin: 0xffffff, hairStyle: 'hood', hood: 0xffffff, top: 0xffffff, scale: 0.95, item: 'spear' },
      lines: () => [
        'Four of us guarded Tarek\'s caravan. The Ashlings came out of the dunes at dusk.',
        story.state.tarek === 'saved' ? 'You lifted the cart. You saved him. Tell him... tell him we did not suffer long.' : story.state.tarek === 'robbed' ? 'You took the satchel and left him. ...The dead remember, traveler.' : 'Tarek is still under the cart. Help him. Please.',
      ],
    });
  }
  player.onKnockedOff = (g) => g.dismount({ thrown: true });
  player.onKnockedOff = (g) => g.dismount({ thrown: true });
  player.onHoof = (k) => sfx.play('hoof', { vol: 0.45 + k * 0.5 });
  hud.onItems = () => inventory.refresh(true);
  for (const dg of Object.values(world.dungeons)) dg.game = { player, enemies, sfx, fx, hud, rig, dialog, story, lights, realm };
  // 0.14: krönikan (titanerna vaknar, Seren, valet efter Typhon, sidouppdragen)
  const chronicle = new Chronicle({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
  // 0.15: havet (Seren följer med, simlektionen, pärlorna, fyren, templet och det tredje valet)
  const seaStory = new SeaStory({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
  // 0.16: norr (Rimeholt, renarna, fiskaren, gapet, Loke och det fjärde valet) och Lokis skugga
  const frostStory = new FrostStory({ story, world, areas, player, hud, sfx, fx, rig, folk, inventory, combat, music });
  const shadow = new ShadowDouble({ scene, player, collider, fx, sfx, hud });
  for (const dg of Object.values(world.dungeons)) dg.game.shadow = shadow;
  player.onGlide = (k) => { if (k === 'start') sfx.play('glide', { vol: 0.7 }); else sfx.play('stomp', { vol: 0.35 }); };
  const world2 = { player, fx, sfx, onBlocked() {}, onPlayerHit() {} };

  // ---------- skärvor, hjärtan och vad fiender och krukor lämnar efter sig ----------
  const roll = (p) => Math.random() < p;
  fx.drop = (pos, kind, p = player) => {
    const hurt = p.hp < p.maxHp, low = p.hp <= p.maxHp / 2;
    if (kind === 'askling' || kind === 'shield') {
      if (roll(hurt ? 0.5 : 0.22)) fx.spawnHeart(pos);
      if (roll(0.75)) fx.spawnShard(pos, roll(0.03) ? 20 : roll(0.3) ? 5 : 1);
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
  // Ute under himlen: där syns dygnet och vädret (inte i hus, grottor och fängelsehålor)
  const outdoorArea = (a) => !!a && !a.indoor && !world.dungeonAt(a.id);
  areas.onActivate = (a) => {
    scene.fog.color.set(a.fog.color);
    fogBase.set(a.fog.color);
    scene.fog.near = base.near = a.fog.near;
    scene.fog.far = base.far = a.fog.far;
    base.hemi = a.light.hemi;
    base.moon = a.light.moon;
    base.flash = a.light.flash;
    base.sky.set(a.light.sky ?? 0x9aa7bd);
    base.ground.set(a.light.ground ?? 0x3a3029);
    base.moonColor.set(a.light.moonColor ?? 0xc6d0e6);
    hemi.color.copy(base.sky);
    hemi.groundColor.copy(base.ground);
    moon.color.copy(base.moonColor);
    sky.setIndoor?.(!!a.indoor);
    weather.setRegion(a.id, outdoorArea(a));
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

  // Bakom startmenyn väntar den brinnande byn (spelets första bild)
  story.newGame(true);
  const settings = loadSettings();
  let pixel = saved.pixel ?? settings.pixel;
  const unlockAudio = () => {
    sfx.init();
    music.unlock();
    applySettings(settings);
  };
  function applySettings(s) {
    Object.assign(settings, s);
    music.setVolume(0.75 * settings.music / 8);
    sfx.setFxLevel(settings.sound / 8);
    if (settings.pixel !== pixel) {
      pixel = settings.pixel;
      resize();
    }
  }
  addEventListener('pointerdown', unlockAudio);
  addEventListener('keydown', unlockAudio);
  // Startmenyn (0.9): Cello i stormen, två sparfiler, inställningar
  const title = new TitleScreen({
    renderer, sfx, music, input, settings, unlockAudio,
    areaName: (id) => areas.get(id)?.name,
    onSettings: (s) => applySettings(s),
    onStart: (mode, slot) => hud.begin(false, mode, slot),
  });
  hud.onBegin = (mode, slot) => {
    unlockAudio();
    title.close();
    resize();
    if (mode === 'resume') return;
    const sv = mode === 'continue' ? loadSave(slot) : null;
    story.slot = slot ?? (sv ? continueSlot() : null) ?? 1;
    if (sv) story.loadGame(sv);
    else story.newGame();
    setLastSlot(story.slot);
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
  // 0.14: Hermes' sandaler
  player.onSwift = (on) => {
    sfx.play(on ? 'swifton' : 'swiftoff');
    if (on) fx.burst('spark', player.feet.clone().setY(player.feet.y + 0.3), 14, 0xfff0b0);
    if (on && !story.state.swiftHint) {
      story.state.swiftHint = true;
      hud.toast('Wings flutter at Cello\'s heels! Run and jump at a wall at an angle to run along it. Jump again to leap off. Updrafts lift him high.', 6500);
    }
    inventory.refresh();
  };
  player.onWallRun = (on) => { if (on) sfx.play('wallrun'); };
  // 0.15: vatten och simning
  player.waterAt = (x, z) => (areas.cur ? areas.cur.waterAt(x, z) : null);
  player.iceAt = (p) => (areas.cur?.ices.length ? areas.cur.iceAt(p) : null);
  player.iceLane = (p) => (areas.cur?.ices.length ? areas.cur.iceRegion(p) : null);
  player.bubbleAt = (p) => !!areas.cur?.airAt(p);
  player.onSplash = (fall) => {
    sfx.play('splash', { vol: Math.min(1, 0.35 + fall / 14) });
    const y = player.waterY ?? player.feet.y + 1;
    fx.burst('spark', player.feet.clone().setY(y + 0.05), 10 + Math.min(20, fall * 2), 0xcfeff8);
  };
  player.onDive = () => { sfx.play('dive'); fx.burst('bubble', player.feet.clone().setY(player.feet.y + 1.2), 10, 0xd8f4ff); };
  player.onSurface = () => sfx.play('surface', { vol: player.breath < player.breathMax * 0.5 ? 1 : 0.5 });
  player.onClimbOut = () => sfx.play('hup', { vol: 0.8 });
  // 0.15: treuddens stöt
  player.onDash = (under) => {
    sfx.play('dash');
    const at = player.feet.clone().setY(player.feet.y + 1);
    if (under) fx.burst('bubble', at, 12, 0xd8f4ff);
    else fx.burst('spark', at, 14, 0x9ff4e8);
  };
  // Treudden träffar fiender, bossar och spröd korall längs vägen
  function dashHits() {
    const d = player.dash;
    if (!d) return;
    const ctx = { player, director: enemies, fx, sfx };
    const f = player.feet;
    if (Math.random() < 0.6) fx.burst(player.headUnder ? 'bubble' : 'spark', f.clone().setY(f.y + 0.9), 2, player.headUnder ? 0xd8f4ff : 0x9ff4e8);
    for (const e of enemies.list) {
      if (!e.targetable || d.hit.has(e) || typeof e.hurt !== 'function' || e.area !== areas.id) continue;
      if (Math.hypot(e.pos.x - f.x, e.pos.z - f.z) > 1.9 + (e.hitRadius ?? 0.5) || Math.abs(e.pos.y - f.y) > 2) continue;
      d.hit.add(e);
      const res = e.hurt(2, f, ctx);
      if (res === 'blocked' || res === 'immune') { sfx.play('clang'); fx.burst('spark', e.chest.clone(), 12, 0xbfe4ff); continue; }
      if (res) { sfx.play('hit', { vol: 1.1 }); fx.burst('spark', e.chest.clone(), 14, 0x9ff4e8); fx.hitStop(0.06); }
    }
    const dg = dungeon(), wing = dg?.wingAt?.(areas.id);
    if (wing) {
      for (const b of wing.bosses) {
        if (d.hit.has(b) || !b.dashHit) continue;
        const res = b.dashHit(player);
        if (!res) continue;
        d.hit.add(b);
        if (res === 'blocked') { sfx.play('clang'); fx.burst('spark', b.chest.clone(), 14, 0xbfe4ff); rig.shake(0.2); player.setState('move'); }
        else { sfx.play('hit', { vol: 1.2 }); sfx.play('ehurt', { vol: 0.8 }); fx.burst('spark', b.chest.clone(), 18, 0x9ff4e8); fx.hitStop(0.08); rig.shake(0.3); }
      }
      if (wing.dashBreak?.(player)) player.setState('move');
    }
    for (const at of B.cutGrass(areas.cur, f, player.facing, 1.6, 1.2)) fx.drop(at, 'grass');
  }
  player.onChoke = () => {
    sfx.play('choke');
    if (!story.state.chokeHint) { story.state.chokeHint = true; hud.toast('Cello is out of air! Swim up to the surface, or find bubbles to breathe.', 4200); }
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
    // Laddad av en blixt (0.11): slaget når dubbelt så långt och slår hårdare
    const charged = weather.charged > 0;
    if (charged) {
      weather.charged = 0;
      player.charged = 0;
      sfx.play('thunder', { vol: 1 });
      sfx.play('zap', { vol: 1 });
      fx.shockwave(point, 0xd8ecff, 7);
      fx.burst('spark', point.clone().setY(point.y + 0.4), 40, 0xd8ecff);
      lights.flash(point.clone().setY(point.y + 1.5), 0xd8ecff, 70, 18, 0.5);
      rig.shake(0.7);
      hud.toast('Thunder answers the hammer!', 2400);
    }
    const ctx = { player, fx, sfx, slamR: charged ? 6.8 : undefined, slamDmg: charged ? 4 : undefined };
    enemies.slam(point, ctx);
    pots.slam(point);
    // Hammaren plattar till gräset runt slaget
    for (const at of B.cutGrass(areas.cur, point, 0, 2.6, Math.PI)) fx.drop(at, 'grass');
    const dg = dungeon();
    if (dg) {
      const wing = dg.wingAt?.(areas.id);
      const bosses = wing ? wing.bosses : dg === bastion ? [bastion.warden, bastion.boss] : [pyramid.khepri, pyramid.boss];
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

  function resize() {
    const w = innerWidth, h = innerHeight;
    // Startmenyn ritas alltid i full upplösning, så att Cello syns ordentligt
    const px = pixel && !title.active;
    const s = px ? Math.min(1, PIXEL_LINES / h) : Math.min(devicePixelRatio || 1, title.active ? 1.5 : 2);
    renderer.setSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), false);
    canvas.classList.toggle('smooth', !px);
    title.resize(w, h);
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
    if (dg.wingAt?.(areas.id)) return dg;
    if (dg === bastion) return player.feet.z < -142 ? dg : null;
    return dg.inside(player.feet) ? dg : null;
  };
  const drawMap = (mv) => {
    const dg = inRooms();
    const wing = dg?.wingAt?.(areas.id);
    if (wing) return mv.drawWing(wing, dg, player);
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
    story.slot = saved.slot ?? 1;
    story.loadGame({ state: saved.state });
    if (saved.pos) player.teleport(new THREE.Vector3().fromArray(saved.pos));
    rig.snap(player);
  }
  window.claude?.hot?.snapshot?.(() => ({
    started: hud.started, phase: story.phase, state: { ...story.state, area: areas.id }, pos: player.feet.toArray(), pixel, slot: story.slot,
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
    // Fästningens och pyramidens nya delar
    const wing = bastion.wingAt(here) ?? pyramid.wingAt(here) ?? world.necropolis.wingAt(here) ?? world.spire.wingAt(here) ?? world.temple.wingAt(here) ?? world.maw.wingAt(here);
    if (wing) {
      if (wing.bossFight) return { id: 'warlord', now: true };
      if (wing.trap) return { id: 'march', now: true };
      if (here === 'nthrone' && world.necropolis.state.cleared.ammit) return { id: 'dawn' };
      if (here === 'scrown' && world.spire.state.cleared.typhon) return { id: 'dawn' };
      if (here === 'tthrone' && world.temple.state.cleared.ketos) return { id: 'dawn' };
      if (here === 'fthrone' && world.maw.state.cleared.thrym) return { id: 'dawn' };
      return { id: { bdepths: 'whispers', bfurnace: 'skull', bspire: 'march', bcrown: 'skull', pdepths: 'whispers', pbarque: 'skull', pascent: 'march', papex: 'skull', ncrypts: 'whispers', nhall: 'skull', nduat: 'whispers', nthrone: 'skull', sgate: 'march', shall: 'march', sweb: 'skull', scrown: 'skull', tgate: 'whispers', tdeep: 'whispers', tgrotto: 'skull', tthrone: 'skull', fgate: 'whispers', flab: 'march', fwolf: 'skull', fthrone: 'skull' }[here] };
    }
    // Natten (0.11): byarna somnar och fälten blir kusliga
    if (clock.isNight && outdoorArea(areas.cur)) {
      if (here === 'village' && world.inAetheria(P.x, P.z)) return { id: 'hearth' };
      if (here === 'field' || here === 'stormreach') return { id: 'whispers' };
      if (here === 'willowmere' || here === 'ranch' || here === 'home' || here === 'village') return { id: 'quiet' };
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
      shop: 'willowmere', stormreach: 'march', cave: 'whispers', sea: 'ballad', frost: 'quiet',
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
    if (title.active) {
      // Startmenyn: egen scen, men samma musik och samma storm i bakgrunden
      title.update(dt);
      if (!window.__realm?.hold) {
        updateMusic(dt);
        sfx.ambience(dt, story.ambienceState());
      }
      title.render();
      return;
    }
    if (!window.__realm?.hold) update(dt, input.poll(dt));
    post.enabled = settings.outlines !== false;
    post.render(scene, camera, { pixel: pixel && !title.active });
  }

  // All spellogik för en bildruta (utan ritning), så att den även går att testa snabbt
  function update(dt, inp) {
    if (inp.togglePixel) {
      pixel = !pixel;
      settings.pixel = pixel;
      storeSettings(settings);
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
    if (hud.started && story.state) story.state.playTime = (story.state.playTime || 0) + dt;

    const calm = !dialog.active && !story.cinematic && !story.fade && !respawn && !songs.active;
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
      // Flöjten: tangenterna spelar toner i stället för att styra Cello
      if (songs.active && (dialog.active || story.cinematic || player.state !== 'move' || respawn)) songs.stop();
      if (songs.active) songs.update(dt, inp);
      const blocked = talking || story.cinematic || !!story.fade || !!respawn || songs.active;
      const pin = blocked ? input.empty : inventory.actions(inp);
      if (sim > 0) {
        const dg = dungeon();
        combat.extra = story.combatTargets().concat(dg ? dg.combatTargets() : []).concat(folk.combatTargets()).concat(enemies.extraTargets());
        // Asklingarna ser och hör sämre på natten, i dimma och i regn (0.11)
        const outNow = outdoorArea(areas.cur);
        enemies.env.night = outNow && clock.isNight;
        enemies.env.fog = outNow ? weather.cur.fog : 0;
        enemies.env.rain = outNow ? weather.cur.rain : 0;
        enemies.env.lantern = inventory.lit;
        enemies.env.dead = realm.dead;
        // 0.14: uppvindar och vindbyar i området (The Galecrown och The Windbound Spire)
        applyWinds(sim);
        player.canSwim = !!story.state.swim;
        player.breathPause = blocked;
        player.update(sim, pin, rig.yaw);
        if (player.state === 'dash') dashHits();
        // Lokis mask: kasta skuggan, eller byt plats med den
        if (pin.mask && player.hasMask && player.state === 'move' && !player.swimming && !player.mount) {
          shadow.use(areas.id);
        }
        shadow.update(sim, areas.id);
        goat.update(sim);
        if (!talking && !story.shown) enemies.update(sim, world2);
        statusEffects(sim);
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
        hud.fade(true, player.drowning ? 'Cello cannot swim...' : 'Cello fell into the storm');
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
      sun.setEnabled(settings.shadows !== false);
      sun.update(player.feet, !outdoorArea(areas.cur) || !!areas.cur?.indoor, 1);
      rig.extra = areas.id === 'fthrone' && world.maw.wingAt('fthrone')?.bossFight ? 4.5 : 0;
      rig.update(dt, blocked ? input.empty : inp, player);
      bars.update(dt, enemies.list, player, combat.lock, areas.id);
      {
        // 0.17: pollen, eldflugor, glöd eller damm i luften
        const a = areas.cur, out = outdoorArea(a), wx = weather.cur;
        const wet = (wx.rain || 0) > 0.2 || (wx.snow || 0) > 0.2;
        motes.setKind(!a ? 'none' : !out ? (a.id.startsWith('t') && world.templeIds?.has(a.id) ? 'none' : 'dust')
          : wet || a.id === 'frost' ? 'none' : a.id === 'desert' || (a.id === 'village' && story.phase !== 'free') ? 'embers'
          : clock.isNight ? 'fireflies' : 'pollen');
        motes.update(dt, camera.position, settings.outlines !== false);
      }
      bossBar.update(dt, combat.extra, player, story.phase === 'free' && !story.cinematic);
      player.model.root.visible = (rig.cur > 0.95 || rig.fallLock || !!rig.cinematic) && player.visibleBlink;
      hud.setDungeon(inRooms()?.state ?? null);
    } else {
      // Startskärmen: kameran glider långsamt runt den brinnande byn
      const a = t * 0.05 + 0.6;
      camera.position.set(Math.sin(a) * 30, 11, Math.cos(a) * 30);
      camera.lookAt(0, 2.2, 0);
      story.titan.update(dt, player);
    }

    // Dygnet och vädret: klockan går bara i det fria spelet (inte under prologen, i samtal eller i tester)
    const freePlay = hud.started && story.phase === 'free' && !window.__realm?.calm;
    clock.update(sim, freePlay && !dialog.active && !story.cinematic && !story.fade);
    weather.update(dt, { camera, now: clock.day * 24 + clock.hour, running: freePlay });
    realm.update(dt);
    chronicle.update(dt);
    seaStory.update(dt);
    frostStory.update(dt);
    const flash = sky.update(dt, t, camera) * base.flash;
    applyEnv(flash);
    applyWater(dt);
    applyCold(dt);
    world.update(t, dt);
    // 0.13: gräset vajar, mer i regn och åska
    WIND.time.value = t;
    WATER.time.value = t;
    WIND.strength.value = 1 + (weather.cur?.over ?? 0) * 1.4;
    cull(dt);
    lights.update(dt, t, hud.started ? player.feet : camera.position);
    fx.airAsh.update(dt, camera.position);
    sfx.ambience(dt, story.ambienceState());
    updateMusic(dt);
    hud.frame(dt, player);
  }

  // 0.16: kylan i norr. Ute i The Frostmarch fryser Cello sakta (fort i snöstorm), om han inte har lyktan tänd,
  // står nära en eld eller bär Frostjättens välsignelse. Helt nedkyld tappar han ett halvt hjärta i taget.
  let coldHurtT = 4, coldHinted = false;
  function applyCold(dt) {
    const a = areas.cur, P = player, s = story.state;
    const blocked = story.dialog.active || story.cinematic || story.fade || !hud.started || story.phase !== 'free';
    if (!a?.cold || blocked || P.state === 'dead') {
      if (!a?.cold) P.cold = Math.max(0, (P.cold || 0) - dt / 4);
      hud.setFrost(P.cold || 0);
      return;
    }
    const nearFire = (a.rests ?? []).some((r) => Math.hypot(r.pos.x - P.feet.x, r.pos.z - P.feet.z) < 8) || (a.warm ?? []).some((w) => Math.hypot(w.x - P.feet.x, w.z - P.feet.z) < w.r);
    const warm = inventory.lit || nearFire || s.frostBlessing;
    const rate = (weather.cur.cold ? 1 / 16 : (weather.cur.snow || 0) > 0.5 ? 1 / 40 : 1 / 70) * (s.furCloak ? 0.5 : 1);
    P.cold = Math.max(0, Math.min(1, (P.cold || 0) + (warm ? -dt / 5 : dt * rate * (P.swimming ? 4 : 1))));
    hud.setFrost(P.cold);
    if (P.cold >= 1) {
      if (!coldHinted) { coldHinted = true; hud.toast('Cello is freezing! Light the lantern, or find a fire to warm up.', 4200); }
      coldHurtT -= dt;
      if (coldHurtT <= 0) {
        coldHurtT = 5;
        P.hp = Math.max(0, P.hp - 1);
        P.onHurt?.(P.hp);
        sfx.play('hurt', { vol: 0.6 });
        if (P.hp <= 0) P.setState('dead');
      }
    } else coldHurtT = Math.min(coldHurtT + dt, 4);
  }

  // 0.15: kameran under ytan (blått och dimmigt), luftmätaren och bubblor från Cello
  let bubbleT = 0, strokeT = 0;
  function applyWater(dt) {
    const a = areas.cur, P = player;
    const wy = a && hud.started ? a.waterAt(camera.position.x, camera.position.z) : null;
    const under = wy != null && camera.position.y < wy - 0.05;
    hud.setUnderwater(under);
    if (under) {
      scene.fog.color.set(a.waterFog ?? 0x1e5f72);
      scene.fog.near = 0.5;
      scene.fog.far = a.waterFar ?? 30;
    }
    hud.setBreath(P.breath / P.breathMax, hud.started && (P.headUnder || P.breath < P.breathMax - 0.05) && P.state !== 'dead');
    if (P.headUnder && (bubbleT -= dt) <= 0) {
      bubbleT = 0.35 + Math.random() * 0.5;
      fx.burst('bubble', P.feet.clone().setY(P.feet.y + 1.55), 1 + (Math.random() < 0.3 ? 2 : 0), 0xd8f4ff);
    }
    if (P.swimming && P.speed > 1.2 && (strokeT -= dt) <= 0) {
      strokeT = P.swim.mode === 'dive' ? 0.75 : 0.6;
      sfx.play('stroke', { vol: P.headUnder ? 0.5 : 0.8 });
      if (!P.headUnder) fx.burst('spark', P.feet.clone().setY((P.waterY ?? P.feet.y) + 0.05), 3, 0xcfeff8);
    }
  }

  // 0.14: områdets uppvindar (lyfter Cello) och vindbyar (knuffar honom, men inte när han är tung)
  //   area.updrafts: [{ x, z, r, y0, y1, power, on? }]
  //   area.gusts:    [{ x0, x1, z0, z1, wx, wz, period?, duty? }]  (period: byarna kommer och går)
  let windT = 0, gustSfx = 0;
  function applyWinds(dt) {
    windT += dt;
    const a = areas.cur;
    player.updrafts = a?.updrafts ?? null;
    player.gust.set(0, 0, 0);
    if (!a?.gusts) return;
    const f = player.feet;
    for (const g of a.gusts) {
      if (g.on === false || f.x < g.x0 || f.x > g.x1 || f.z < g.z0 || f.z > g.z1) continue;
      let k = 1;
      if (g.period) {
        const ph = ((windT + (g.phase ?? 0)) % g.period) / g.period;
        k = ph < (g.duty ?? 0.5) ? Math.sin((ph / (g.duty ?? 0.5)) * Math.PI) : 0;
      }
      player.gust.x += g.wx * k;
      player.gust.z += g.wz * k;
      g.k = k;
    }
    gustSfx -= dt;
    if (player.gust.lengthSq() > 4 && gustSfx <= 0) { gustSfx = 2.4; sfx.play('gust', { vol: 0.8 }); }
  }

  // 0.17: gift och kyla från de nya asklingarna
  let poisonFx = 0;
  function statusEffects(dt) {
    const P = player;
    if (P.slowT > 0) P.slowT = Math.max(0, P.slowT - dt);
    if (P.poisonT > 0 && P.state !== 'dead') {
      P.poisonT -= dt;
      P.poisonTick = (P.poisonTick ?? 1.5) - dt;
      if (P.poisonTick <= 0) {
        P.poisonTick = 2;
        if (P.hp > 1) {
          P.hp -= 1;
          hud.setHearts(P.hp, P.maxHp);
          sfx.play('ehurt', { vol: 0.4 });
        }
      }
      poisonFx -= dt;
      if (poisonFx <= 0) { poisonFx = 0.25; fx.burst('spark', P.feet.clone().setY(P.feet.y + 0.8 + Math.random() * 0.8), 1, 0x7aff5a); }
    }
    if (P.state === 'dead') P.poisonT = 0;
    hud.setPoison(P.poisonT > 0);
  }

  // Ljuset, dimman och himlen efter tid på dygnet och väder
  const _c = new THREE.Color();
  function applyEnv(flash) {
    const out = outdoorArea(areas.cur) && hud.started;
    const wx = weather.cur;
    const day = out ? clock.daylight : 1, dusk = out ? clock.dusk : 0;
    const over = out ? wx.over : 0, fog = out ? wx.fog : 0, haze = out ? wx.haze || 0 : 0;
    const n = 1 - day, dim = 1 - over * 0.28;
    hemi.intensity = (base.hemi * (0.46 + 0.54 * day) * dim) + flash * 1.8;
    moon.intensity = (base.moon * (0.5 + 0.5 * day) * (1 - over * 0.4)) + flash * 1.4;
    hemi.color.copy(base.sky).lerp(ENV.nightSky, n * 0.7).lerp(ENV.duskSky, dusk * 0.45);
    moon.color.copy(base.moonColor).lerp(ENV.nightMoon, n * 0.8).lerp(ENV.duskMoon, dusk * 0.6);
    _c.copy(fogBase).lerp(ENV.nightFog, n * 0.78).lerp(ENV.duskFog, dusk * 0.35);
    if (fog > 0) _c.lerp(haze > 0.5 ? ENV.haze : (wx.snow || 0) > 0.3 ? ENV.snowFog : ENV.fogGrey, fog * (0.25 + 0.3 * day) * ((wx.snow || 0) > 0.3 ? 1.6 : 1));
    // Lugnt dagsljus: allt glider mot de varma färgerna (stormar och natt behåller sina)
    const warm = out ? Math.max(0, day * 1.15 - 0.15) * (1 - dusk * 0.7) * (1 - over) * (1 - fog * 0.8) : 0;
    hemi.color.lerp(TP.sky, warm * 0.65);
    hemi.groundColor.copy(base.ground).lerp(TP.ground, warm);
    moon.color.lerp(TP.sun, warm * 0.85);
    hemi.intensity *= 1 + 0.12 * warm;
    moon.intensity *= 1 + 0.55 * warm;
    _c.lerp(TP.fog, warm * 0.75);
    scene.fog.color.copy(_c).lerp(FLASH, flash * 0.22);
    scene.fog.near = base.near * (1 - 0.8 * fog) * (1 - 0.35 * warm);
    scene.fog.far = base.far * (1 - 0.68 * fog) * (1 - n * 0.25) * (1 - 0.15 * warm);
    sky.setEnv(day, dusk, Math.max(over, fog * 0.6), warm);
    // 0.17: med skuggor kommer mer av ljuset från solen och mindre från himlen, så att skuggorna syns
    if (sun.enabled) { moon.intensity *= 1.32; hemi.intensity *= 0.84; }
    // Klockan och vädret uppe till vänster
    clockT -= 1;
    if (clockT <= 0) {
      clockT = 15;
      hud.setClock?.(hud.started && story.phase === 'free' && !dungeon() ? { label: clock.label, text: clock.text, night: clock.isNight, weather: weather.local, day: clock.day } : null);
    }
  }
  let clockT = 0;

  // Handtag för felsökning i webbläsarens konsol
  window.__realm = {
    player, rig, world, areas, input, hud, scene, camera, enemies, post, sun, bars, bossBar, combat, fx, sfx, story, dialog, bastion, pyramid, lights, collider, renderer,
    culled, cullS, music, pots, inventory, folk, goat, title, THREE, clock, weather, sky, songs, realm, necropolis: world.necropolis, spire: world.spire, chronicle, temple: world.temple, seaStory, maw: world.maw, frostStory, shadow,
    tick: (dt, inp) => update(dt, { ...input.empty, ...inp }),
  };
  // 0.17: skuggor på allt som är byggt (figurer, hus, träd, stenar, väggar) och konturer över bilden
  markShadows(scene);
  requestAnimationFrame(frame);
}

const hot = window.claude?.hot;
// 0.13: modellpaketet (Elias skulpturer) läses innan spelet startar
if (hot?.ready) hot.ready((d) => loadPack().then(() => start(d)));
else loadPack().then(() => start(hot?.data ?? {}));

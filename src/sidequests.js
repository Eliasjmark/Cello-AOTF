// Fler sidouppdrag i byarna (0.21):
//
//   · Button the Bear (Mira i Willowmere): hennes nalle tappades när familjen flydde över The Stormvale.
//     Den ligger under det gamla eket i nordväst. Belöning: 25 skärvor och Miras teckning.
//   · Pell's Lost Crate (Pell i butiken): en låda med lyktolja föll av hans kärra vid den fallna kolossen
//     på The Stormvale. Belöning: 40 skärvor och två oljeflaskor.
// Sakerna ligger ute i världen och plockas upp med E.
import * as THREE from 'three';
import { box, place } from './geom.js';

export class SideQuests {
  constructor({ story, world, areas, inventory, sfx, hud, fx }) {
    Object.assign(this, { story, world, areas, inventory, sfx, hud, fx });
    this.items = {};
    const fa = areas.get('field'), H = world.field?.H;
    if (fa && H) {
      const poi = (label) => fa.map.pois.find((p) => p.label === label);
      const oak = poi('Old Oak'), col = poi('Fallen Colossus');
      if (oak) this.place('bear', fa, oak.x + 3.2, oak.z + 2.4, H, this.bearModel(), 'Pick up the toy bear', () => this.q.bear === 'asked');
      if (col) this.place('crate', fa, col.x - 6, col.z + 5, H, this.crateModel(), "Pick up Pell's crate", () => this.q.crate === 'asked');
    }
  }

  get q() {
    const s = this.story.state;
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    return s.quests;
  }

  bearModel() {
    const g = new THREE.Group();
    const fur = new THREE.MeshLambertMaterial({ color: 0x9a6a3a, flatShading: true });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a1a10 });
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), fur), 0, 0.2, 0));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), fur), 0, 0.46, 0.02));
    for (const s of [-1, 1]) {
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), fur), s * 0.1, 0.6, 0));
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), fur), s * 0.17, 0.25, 0.08));
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), fur), s * 0.1, 0.06, 0.12));
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), dark), s * 0.05, 0.5, 0.15));
    }
    // Knappen: ett rött öga av tyg (därav namnet)
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xc03030 })), 0.05, 0.5, 0.15));
    g.rotation.x = -0.5;
    return g;
  }

  crateModel() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a42, flatShading: true });
    const dark = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
    g.add(place(new THREE.Mesh(box(0.9, 0.6, 0.6, 1), wood), 0, 0.3, 0));
    for (const y of [0.1, 0.5]) g.add(place(new THREE.Mesh(box(0.92, 0.06, 0.62, 1), dark), 0, y, 0));
    // Två flaskor som har rullat ut
    const glass = new THREE.MeshLambertMaterial({ color: 0xc89a3a, transparent: true, opacity: 0.8 });
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8).rotateZ(Math.PI / 2), glass), 0.7, 0.08, 0.3));
    g.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8).rotateZ(Math.PI / 2 + 0.5), glass), 0.9, 0.08, -0.1));
    g.rotation.y = 0.5;
    return g;
  }

  place(id, area, x, z, H, model, label, ok) {
    const y = H(x, z);
    model.position.set(x, y, z);
    area.root.add(model);
    // Ett litet glitter så att den syns i gräset
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    spark.position.set(x, y + 1.0, z);
    area.root.add(spark);
    const it = { id, model, spark, pos: new THREE.Vector3(x, y, z) };
    this.items[id] = it;
    area.updaters.push((t) => {
      const show = this.q[id] !== 'found' && this.q[id] !== 'done';
      model.visible = show;
      spark.visible = show && ok();
      spark.position.y = y + 1.0 + Math.sin(t * 3) * 0.1;
      spark.rotation.y = t * 2;
    });
    this.story.interactions.push({
      label, area: area.id, pos: () => it.pos, radius: 1.6,
      ok: () => this.story.phase === 'free' && ok(),
      run: () => this.pickUp(id),
    });
  }

  pickUp(id) {
    this.q[id] = 'found';
    this.sfx.play('item');
    this.fx.burst('spark', this.items[id].pos.clone().setY(this.items[id].pos.y + 0.6), 14, 0xfff0b0);
    if (id === 'bear') this.story.read(['A small brown bear, soggy from the rain, with one red button for an eye.', 'Mira will want this back. She is in Willowmere.']);
    else this.story.read(["A crate of lantern oil, stamped with Pell's mark. Two of the flasks are still whole.", 'Pell will be glad to see it. His shop is in Willowmere.']);
    this.story.save(true);
  }

  questToast(name, text, done = false) {
    this.sfx.play(done ? 'quest' : 'questNew');
    this.hud.toast(`${done ? 'Quest' : 'New quest'}: ${name}. ${text}`, 4400);
  }

  // Miras ämnen (läggs till i hennes samtal i folk.js)
  miraTopics() {
    const q = this.q;
    if (!q.bear) {
      return [{ id: 'bear', q: 'Why do you look sad, Mira?', a: () => {
        q.bear = 'asked';
        this.questToast('Button the Bear', 'Mira lost her toy bear somewhere in the Stormvale, near a big old tree.');
        this.story.save(true);
        return ['I lost Button. He is my bear. He has a button for an eye, that is why he is called Button.', 'When we ran away from the storm, he fell out of the cart. Near a big old tree, in the north of the Stormvale. Mama said we could not go back for him.', 'Could you look? He is very small. And probably scared.'];
      } }];
    }
    if (q.bear === 'found') {
      return [{ id: 'bear2', q: 'I found Button!', a: () => {
        q.bear = 'done';
        this.inventory.addShards(25);
        this.story.after(0.6, () => { this.sfx.play('fanfare'); this.questToast('Button the Bear', 'Complete! Mira gives Cello 25 shards and a drawing.', true); });
        this.story.save(true);
        return ['BUTTON! You found him! He is all wet! Oh, you poor bear.', 'Here. It is my savings. And I drew you. That is you, with the sword, and that is a monster, and that is Button helping.'];
      } }];
    }
    return [];
  }

  // Pell: true om samtalet togs om hand här
  talkPell(n) {
    const q = this.q, s = this.story.state, L = (t) => this.story.line(n, t);
    if (!s.talked.pell) return false;
    if (!q.crate) {
      this.story.talk(n, [
        L('Ah, Cello. Bad news, and it is mine. My last delivery of lantern oil fell off the cart on the Stormvale.'),
        L('The driver says it rolled off by the fallen colossus, in the south of the vale, when the Ashlings came out of the grass.'),
        L('If you are passing that way... bring it back, and I will make it worth your while.'),
      ], () => { q.crate = 'asked'; this.questToast("Pell's Lost Crate", 'Find the crate of lantern oil by the fallen colossus on the Stormvale.'); this.story.save(true); });
      return true;
    }
    if (q.crate === 'found') {
      this.story.talk(n, [
        L('My crate! And two flasks still whole. You are a better delivery boy than my driver.'),
        L('Keep the flasks, and take this for your trouble.'),
      ], () => {
        q.crate = 'done';
        this.inventory.addShards(40);
        this.inventory.giveFlask?.();
        this.inventory.giveFlask?.();
        this.questToast("Pell's Lost Crate", 'Complete! Pell gives Cello 40 shards and two Oil Flasks.', true);
        this.story.save(true);
      });
      return true;
    }
    return false;
  }
}

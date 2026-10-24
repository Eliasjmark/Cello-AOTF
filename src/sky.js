// Stormhimmel, molnhav under öarna och blixtar.
import * as THREE from 'three';

const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
`;

export function createSky(scene) {
  const reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const flashScale = reducedMotion ? 0.3 : 1;

  const u = {
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFlashDir: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
    uZenith: { value: new THREE.Color(0x0b0e15) },
    uHorizon: { value: new THREE.Color(0x3a414d) },
    uBelow: { value: new THREE.Color(0x15181f) },
    uGlow: { value: new THREE.Color(0x8a5a2c) },
    uGlowDir: { value: new THREE.Vector3(-0.55, 0, -0.83).normalize() },
    // 0.11: natten (stjärnor och måne syns där molnen glesnar)
    uNight: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0.45, 0.62, -0.64).normalize() },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlash, uNight; uniform vec3 uFlashDir, uZenith, uHorizon, uBelow, uGlow, uGlowDir, uMoonDir;
      varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
        col = mix(col, uBelow, smoothstep(0.0, -0.35, h));
        // Ett sjukligt sken långt bort, där stormens öga ligger (i skymningen blir det solnedgång)
        float g = max(dot(normalize(vec3(d.x, 0., d.z)), uGlowDir), 0.);
        col += uGlow * pow(g, 6.) * smoothstep(0.4, -0.08, h) * 0.6;
        if (h > -0.1) {
          vec2 p = d.xz / (h + 0.28) * 1.3;
          float c = fbm(p + vec2(uTime * 0.012, uTime * 0.004));
          float c2 = fbm(p * 2.1 - vec2(uTime * 0.02, 0.));
          float cloud = smoothstep(0.35, 0.85, c * 0.7 + c2 * 0.4);
          // Natten: stjärnor och en blek måne i glipor mellan molnen
          if (uNight > 0.01 && h > 0.02) {
            vec2 sp = d.xz / (h + 0.5) * 90.;
            vec2 cell = floor(sp);
            float r = hash(cell);
            float star = step(0.982, r) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5)) * (0.65 + 0.35 * sin(uTime * 2.3 + r * 60.));
            float clear = (1. - cloud) * smoothstep(0.02, 0.25, h) * uNight;
            col += vec3(0.82, 0.88, 1.0) * star * clear * 1.4;
            float md = dot(d, uMoonDir);
            col += vec3(0.86, 0.9, 1.0) * smoothstep(0.9990, 0.9994, md) * uNight * (1. - cloud * 0.75);
            col += vec3(0.2, 0.26, 0.42) * pow(max(md, 0.), 40.) * uNight * 0.7;
          }
          vec3 cloudCol = mix(uZenith * 1.5, uHorizon * 1.1, c2);
          col = mix(col, cloudCol, cloud * smoothstep(-0.1, 0.25, h) * 0.85);
          float fd = max(dot(d, uFlashDir), 0.);
          col += vec3(0.7, 0.76, 1.0) * uFlash * (0.2 + cloud * 0.9) * (0.3 + pow(fd, 4.) * 1.6);
        }
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);

  // Molnhavet under öarna
  const su = {
    uTime: u.uTime,
    uFlash: u.uFlash,
    uFog: { value: scene.fog.color },
    uFlashPos: { value: new THREE.Vector2() },
    uDark: { value: new THREE.Color(0x14151c) },
    uMid: { value: new THREE.Color(0x32323e) },
  };
  const seaMat = new THREE.ShaderMaterial({
    uniforms: su,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlash; uniform vec3 uFog, uDark, uMid; uniform vec2 uFlashPos;
      varying vec3 vW;
      ${NOISE}
      void main(){
        vec2 p = vW.xz * 0.012;
        float n = fbm(p + vec2(uTime * 0.01, uTime * 0.004));
        float n2 = fbm(p * 2.3 - vec2(uTime * 0.018, -uTime * 0.006) + n);
        vec3 col = mix(uDark, uMid, smoothstep(0.3, 0.85, n2));
        float fd = length(vW.xz - uFlashPos);
        col += vec3(0.55, 0.6, 0.85) * uFlash * (0.15 + 0.9 * exp(-fd * 0.004)) * smoothstep(0.35, 0.9, n2);
        float dist = length(vW - cameraPosition);
        col = mix(col, uFog, smoothstep(120., 700., dist));
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -34;
  scene.add(sea);

  // Blixten
  const boltGeo = new THREE.BufferGeometry();
  const boltMat = new THREE.LineBasicMaterial({ color: 0xe2eaff, transparent: true, opacity: 0, fog: false });
  const bolt = new THREE.LineSegments(boltGeo, boltMat);
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);

  function makeBolt(cam) {
    const a = Math.random() * Math.PI * 2, dist = 360 + Math.random() * 140;
    const x0 = cam.position.x + Math.cos(a) * dist, z0 = cam.position.z + Math.sin(a) * dist;
    const pts = [];
    let x = x0, y = 260, z = z0;
    while (y > -40) {
      const ny = y - (16 + Math.random() * 22), nx = x + (Math.random() - 0.5) * 28, nz = z + (Math.random() - 0.5) * 28;
      pts.push(x, y, z, nx, ny, nz);
      if (Math.random() < 0.28) {
        pts.push(nx, ny, nz, nx + (Math.random() - 0.5) * 50, ny - 18 - Math.random() * 24, nz + (Math.random() - 0.5) * 50);
      }
      x = nx; y = ny; z = nz;
    }
    boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    u.uFlashDir.value.set(x0 - cam.position.x, 140, z0 - cam.position.z).normalize();
    su.uFlashPos.value.set(x0, z0);
    return dist;
  }

  let next = 2.5, ft = -1, flash = 0, indoor = false;
  // Dagens färger (stormhimlen) och nattens; setEnv blandar dem varje bildruta
  const DAY = { zenith: new THREE.Color(0x0b0e15), horizon: new THREE.Color(0x3a414d), below: new THREE.Color(0x15181f), glow: new THREE.Color(0x8a5a2c), dark: new THREE.Color(0x14151c), mid: new THREE.Color(0x32323e) };
  const NIGHT = { zenith: new THREE.Color(0x020309), horizon: new THREE.Color(0x0c1019), below: new THREE.Color(0x06070b), glow: new THREE.Color(0x141c33), dark: new THREE.Color(0x07080d), mid: new THREE.Color(0x13151f) };
  const DUSK = { horizon: new THREE.Color(0x7a3e26), glow: new THREE.Color(0xe0702c), mid: new THREE.Color(0x4a3030) };
  const GREY = new THREE.Color(0x2a2e34);
  // 0.13: lugna dagar: disig, varm himmel och ett molnhav i guld och grått
  const WARM = { zenith: new THREE.Color(0x5a6a7c), horizon: new THREE.Color(0xc9b28a), below: new THREE.Color(0x8a7a62), glow: new THREE.Color(0xffd29a), dark: new THREE.Color(0x5a544e), mid: new THREE.Color(0x9c8e76) };
  const glowStorm = new THREE.Vector3(-0.55, 0, -0.83).normalize(), glowSun = new THREE.Vector3(0.8, 0, -0.6).normalize();
  const api = {
    onBolt: null,
    boltRate: 1, // vädret: fler blixtar i åskväder, färre när det är lugnt
    // day: 0–1 dagsljus · dusk: 0–1 gryning/skymning · over: 0–1 mulet (regn och dimma)
    setEnv(day, dusk, over = 0, warm = 0) {
      const n = 1 - day;
      for (const k of ['zenith', 'horizon', 'below', 'glow']) u[`u${k[0].toUpperCase()}${k.slice(1)}`].value.copy(DAY[k]).lerp(WARM[k], warm).lerp(NIGHT[k], n);
      u.uHorizon.value.lerp(DUSK.horizon, dusk * 0.55);
      u.uGlow.value.lerp(DUSK.glow, dusk * 0.8);
      u.uGlowDir.value.copy(glowStorm).lerp(glowSun, dusk).normalize();
      if (over > 0) {
        u.uHorizon.value.lerp(GREY, over * 0.45 * day);
        u.uZenith.value.lerp(GREY, over * 0.25 * day);
        u.uGlow.value.multiplyScalar(1 - over * 0.7);
      }
      u.uNight.value = Math.max(0, n * n * (1 - over * 0.8));
      su.uDark.value.copy(DAY.dark).lerp(WARM.dark, warm).lerp(NIGHT.dark, n);
      su.uMid.value.copy(DAY.mid).lerp(WARM.mid, warm).lerp(NIGHT.mid, n).lerp(DUSK.mid, dusk * 0.5);
    },
    // Inomhus och i grottor syns varken himlen, molnhavet eller blixtarna
    // En blixt just nu (ett nedslag nära Cello)
    flashNow(pt) {
      if (indoor) return;
      ft = 0;
      if (pt) su.uFlashPos.value.set(pt.x, pt.z);
    },
    setIndoor(on) {
      indoor = on;
      dome.visible = !on;
      sea.visible = !on;
      if (on) { ft = -1; flash = 0; bolt.visible = false; }
    },
    update(dt, t, camera) {
      dome.position.copy(camera.position);
      sea.position.x = camera.position.x;
      sea.position.z = camera.position.z;
      u.uTime.value = t;
      next -= dt;
      if (indoor) { u.uFlash.value = 0; return 0; }
      if (next <= 0 && ft < 0) {
        ft = 0;
        api.onBolt?.(makeBolt(camera));
        next = (5 + Math.random() * 10) / Math.max(0.05, api.boltRate);
      }
      if (ft >= 0) {
        ft += dt;
        flash = Math.exp(-ft * 16) + (ft > 0.11 ? 0.75 * Math.exp(-(ft - 0.11) * 9) : 0);
        if (ft > 1.2) { ft = -1; flash = 0; }
      }
      flash *= flashScale;
      u.uFlash.value = flash;
      boltMat.opacity = ft >= 0 && ft < 0.3 ? Math.min(1, flash * 1.4) : 0;
      bolt.visible = boltMat.opacity > 0.02;
      return flash;
    },
  };
  return api;
}

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
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlash; uniform vec3 uFlashDir, uZenith, uHorizon, uBelow, uGlow, uGlowDir;
      varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
        col = mix(col, uBelow, smoothstep(0.0, -0.35, h));
        // Ett sjukligt sken långt bort, där stormens öga ligger
        float g = max(dot(normalize(vec3(d.x, 0., d.z)), uGlowDir), 0.);
        col += uGlow * pow(g, 6.) * smoothstep(0.4, -0.08, h) * 0.6;
        if (h > -0.1) {
          vec2 p = d.xz / (h + 0.28) * 1.3;
          float c = fbm(p + vec2(uTime * 0.012, uTime * 0.004));
          float c2 = fbm(p * 2.1 - vec2(uTime * 0.02, 0.));
          float cloud = smoothstep(0.35, 0.85, c * 0.7 + c2 * 0.4);
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
  const api = {
    onBolt: null,
    // Inomhus och i grottor syns varken himlen, molnhavet eller blixtarna
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
        next = 5 + Math.random() * 10;
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

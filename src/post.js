// Efterbehandling (0.17): bilden ritas först till en textur (färg + djup). Sedan går ett helskärmspass över den:
//   · Konturer: där djupet hoppar (ett föremål framför ett annat) eller böjer av (en kant, ett hörn) ritas en
//     mörk linje, som tusch i en tecknad film. Linjerna tonar bort på avstånd och i dimman.
//   · Skuggor i vrår (enkel AO): punkter där djupet runt omkring ligger närmare kameran blir lite mörkare,
//     så att hörn, fötter mot marken och springor får djup.
//   · En svag vinjett i kanterna.
// Allt räknas på djupet i 1/z (som är linjärt över plana ytor på skärmen), så platta golv ger inga linjer.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 res;
uniform float near, far, proj;
uniform float lineK, aoK, vigK, px, fadeFar, fogFar;
uniform vec3 ink;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, near, far);
}

void main() {
  vec4 base = texture2D(tColor, vUv);
  vec3 col = base.rgb;
  float d0 = texture2D(tDepth, vUv).x;
  float z = viewZ(vUv);
  float sky = step(0.99999, d0);
  vec2 o = px / res;
  float zl = viewZ(vUv - vec2(o.x, 0.0)), zr = viewZ(vUv + vec2(o.x, 0.0));
  float zd = viewZ(vUv - vec2(0.0, o.y)), zu = viewZ(vUv + vec2(0.0, o.y));
  float zdl = viewZ(vUv + vec2(-o.x, -o.y)), zur = viewZ(vUv + vec2(o.x, o.y));
  float zdr = viewZ(vUv + vec2(o.x, -o.y)), zul = viewZ(vUv + vec2(-o.x, o.y));
  float w = 1.0 / z;
  // Siluett: grannen ligger mycket längre bort (linjen hamnar på det närmaste föremålet)
  float sil = 0.0;
  sil = max(sil, (w - 1.0 / zl) / w);
  sil = max(sil, (w - 1.0 / zr) / w);
  sil = max(sil, (w - 1.0 / zd) / w);
  sil = max(sil, (w - 1.0 / zu) / w);
  sil = max(sil, 0.7 * (w - 1.0 / zdl) / w);
  sil = max(sil, 0.7 * (w - 1.0 / zur) / w);
  sil = max(sil, 0.7 * (w - 1.0 / zdr) / w);
  sil = max(sil, 0.7 * (w - 1.0 / zul) / w);
  float silE = smoothstep(0.035, 0.11, sil);
  // Veck: andraderivatan av 1/z (noll på plana ytor, stor vid kanter och hörn)
  float lapX = abs(1.0 / zl + 1.0 / zr - 2.0 * w) / w;
  float lapY = abs(1.0 / zd + 1.0 / zu - 2.0 * w) / w;
  float creE = smoothstep(0.012, 0.045, max(lapX, lapY)) * 0.55;
  float edge = max(silE, creE);
  float fade = 1.0 - smoothstep(fadeFar * 0.45, fadeFar, z);
  fade *= 1.0 - smoothstep(fogFar * 0.4, fogFar * 0.85, z);
  edge *= fade * (1.0 - sky);
  // Enkel AO: åtta punkter i en ring som är 0,6 m stor där borta
  float ao = 0.0;
  if (aoK > 0.0 && sky < 0.5) {
    float r = clamp(0.6 * res.y * proj / (2.0 * z), 2.0, 22.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.4;
      vec2 off = vec2(cos(a), sin(a)) * r / res * (i % 2 == 0 ? 1.0 : 0.55);
      float zs = viewZ(vUv + off);
      float dz = z - zs;
      ao += smoothstep(0.08, 0.35, dz) * (1.0 - smoothstep(1.2, 2.6, dz));
    }
    ao = ao / 8.0 * fade;
  }
  col *= 1.0 - ao * aoK;
  col = mix(col, col * ink, clamp(edge * lineK, 0.0, 1.0));
  // Vinjett
  vec2 q = vUv - 0.5;
  col *= 1.0 - vigK * smoothstep(0.35, 0.85, length(q * vec2(res.x / res.y, 1.0)) * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    // Färgen lagras som sRGB i en vanlig 8-bitars textur, så att genomskinliga saker (rök, dimma, eld)
    // blandas precis som när bilden ritas direkt på skärmen
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: true, colorSpace: THREE.SRGBColorSpace });
    // Trick: som ett XR-mål skriver three sRGB-värden till texturen (lagrad som vanlig RGBA8), precis som till skärmen
    this.rt.isXRRenderTarget = true;
    this.rt.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, res: { value: new THREE.Vector2(4, 4) },
        near: { value: 0.1 }, far: { value: 1500 }, proj: { value: 1 },
        lineK: { value: 0.78 }, aoK: { value: 0.32 }, vigK: { value: 0.22 }, px: { value: 1 }, fadeFar: { value: 140 }, fogFar: { value: 260 },
        ink: { value: new THREE.Vector3(0.16, 0.13, 0.12) },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.size = new THREE.Vector2();
  }

  // pixel: retroläget (låg upplösning) har tunnare linjer och ingen AO
  render(scene, camera, opt = {}) {
    const r = this.renderer;
    if (!this.enabled) { r.render(scene, camera); return; }
    r.getDrawingBufferSize(this.size);
    const w = Math.max(1, this.size.x), h = Math.max(1, this.size.y);
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    const U = this.mat.uniforms;
    U.res.value.set(w, h);
    U.near.value = camera.near;
    U.far.value = camera.far;
    U.proj.value = camera.projectionMatrix.elements[5];
    U.px.value = h > 900 ? 1.5 : 1;
    U.aoK.value = opt.pixel ? 0.2 : 0.32;
    U.fogFar.value = scene.fog?.far ?? 400;
    if (opt.ink) U.ink.value.copy(opt.ink);
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  }
}

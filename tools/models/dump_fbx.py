# Gör Elias FBX-filer (från Blender) till källorna i tools/models/src/*.ply (0.13).
#   python3 tools/models/dump_fbx.py Boss1.fbx:boss1 Bybo_exempel.fbx:bybo huvudkaraktar.fbx:hero ...
# Kräver: npm i three@0.186.0 i en mapp (sätt THREE_DIR), pip install playwright trimesh fast-simplification
#
# FBX-filerna läses med Three.js FBXLoader i en headless webbläsare. Trianglarna förenklas till 100 000
# och normeras: höjd 1, fötterna på Y = 0, mitten i X och Z (figuren tittar mot +Z).
# Hjälten (namnet 'hero') sparas i stället i full upplösning och i skulpturens enheter (hjässan på Y = 50),
# eftersom regionerna i hero.py och tools/hero/paint.py är uppmätta i de enheterna.
import os, sys, base64, subprocess, time, tempfile, shutil
import numpy as np, trimesh
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshkit import simplify

HERE = os.path.dirname(os.path.abspath(__file__))
THREE_DIR = os.environ.get('THREE_DIR', '.')
PAGE = """<!doctype html><script type="importmap">{"imports":{"three":"./node_modules/three/build/three.module.js","three/addons/":"./node_modules/three/examples/jsm/"}}</script>
<script type="module">window.ready = true;</script>"""
JS = """async (f) => {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const obj = await new FBXLoader().loadAsync(f);
  obj.updateMatrixWorld(true);
  const parts = [];
  obj.traverse(o => { if (o.isMesh) { let g = o.geometry.clone(); if (g.index) g = g.toNonIndexed(); g.applyMatrix4(o.matrixWorld); parts.push(g.attributes.position.array); } });
  let n = 0; for (const p of parts) n += p.length;
  const all = new Float32Array(n); let k = 0; for (const p of parts) { all.set(p, k); k += p.length; }
  window.__dump = new Uint8Array(all.buffer); return all.length;
}"""

def read_fbx(page, url):
    n = page.evaluate(JS, url)
    out = bytearray()
    total, CH = n * 4, 4_000_000
    for s in range(0, total, CH):
        b64 = page.evaluate("([s, e]) => { const u = window.__dump.subarray(s, e); let t = ''; for (let i = 0; i < u.length; i += 32768) t += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(t); }", [s, min(total, s + CH)])
        out += base64.b64decode(b64)
    return np.frombuffer(bytes(out), dtype='<f4').reshape(-1, 3).astype(np.float64)

def main(args):
    work = tempfile.mkdtemp(dir=THREE_DIR)
    open(os.path.join(work, 'index.html'), 'w').write(PAGE.replace('./node_modules', '../node_modules'))
    jobs = []
    for a in args:
        path, name = a.rsplit(':', 1)
        shutil.copy(path, os.path.join(work, name + '.fbx'))
        jobs.append(name)
    srv = subprocess.Popen(['python3', '-m', 'http.server', '8197'], cwd=THREE_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    rel = os.path.basename(work)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            p = b.new_page()
            p.goto(f'http://localhost:8197/{rel}/index.html')
            p.wait_for_function('window.ready', timeout=30000)
            for name in jobs:
                a = read_fbx(p, f'{name}.fbx')
                m = trimesh.Trimesh(a, np.arange(len(a)).reshape(-1, 3), process=True)
                m.merge_vertices()
                V = m.vertices; lo, hi = V.min(0), V.max(0)
                if name == 'hero':
                    V = (V - lo) / (hi[1] - lo[1]) * 50.0
                    # samma läge som skulpturen hade i tools/hero/cello-hero.stl efter vändningen
                    V = V - [(V[:, 0].max() + V[:, 0].min()) / 2 + 0.05, 0, (V[:, 2].max() + V[:, 2].min()) / 2 + 0.04]
                else:
                    m = simplify(m, 100000)
                    V = m.vertices; lo, hi = V.min(0), V.max(0)
                    V = (V - [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]) / (hi[1] - lo[1])
                out = trimesh.Trimesh(V, m.faces, process=False)
                out.export(os.path.join(HERE, 'src', name + '.ply'))
                print(name, len(out.faces), 'trianglar')
            b.close()
    finally:
        srv.kill()
        shutil.rmtree(work, ignore_errors=True)

if __name__ == '__main__':
    main(sys.argv[1:])

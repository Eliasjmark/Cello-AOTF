# Målar Cellos hjältemodell (modellen Elias skickade) och skriver den kompakta binärfilen CHM1 som src/heroModel.js läser.
#   python3 tools/hero/paint.py [tools/hero/cello-hero.stl] [models/cello-hero.bin]
# Kräver: pip install trimesh fast-simplification
# Modellen förenklas till 40 % av trianglarna, och varje hörn får en färg efter regioner (huvud, hår, pannband,
# hud, tunika, läder, svärd, sköld). Regionerna är mätta på just den här skulpturen (tre-koordinater: Y upp, Z framåt).
import trimesh, numpy as np, struct, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'cello-hero.stl')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..', 'models', 'cello-hero.bin')
m = trimesh.load(src, process=True)
if len(m.faces) > 120000:
    import fast_simplification as fs
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=0.6)
    m = trimesh.Trimesh(v, f, process=True)
V = m.vertices; V = np.c_[V[:,0], V[:,2], -V[:,1]].astype(np.float64)
F = m.faces[:, [0, 1, 2]]
mesh3 = trimesh.Trimesh(V, F, process=False)
N = mesh3.vertex_normals
X, Y, Z = V.T
n = len(V)
C = {
  'skin': (214, 160, 122), 'hair': (58, 36, 24), 'band': (138, 30, 28), 'tunic': (52, 70, 92),
  'leather': (110, 74, 44), 'leatherDark': (62, 42, 28), 'bronze': (176, 128, 58), 'steel': (196, 204, 212),
  'gold': (172, 134, 74), 'wood': (122, 84, 50), 'iron': (92, 96, 104), 'strap': (80, 54, 34),
}
col = np.zeros((n, 3)); tag = np.array([''] * n, dtype=object)
def paint(mask, name):
    sel = mask & (tag == '')
    col[sel] = C[name]; tag[sel] = name
# Kroppens ram: axeln vid (cx, cz), vriden 23.5° mot +X
cx, cz, th = -2.3, -6.4, np.radians(23.5)
dx, dz = X - cx, Z - cz
ux = dx * np.cos(th) - dz * np.sin(th)      # höger/vänster (+ = Cellos vänster)
uz = dx * np.sin(th) + dz * np.cos(th)      # fram (+)
# Skölden
sh = np.load(os.path.join(HERE, 'shield.npy')); sn, sc, R = sh[:3], sh[3:6], sh[6]
d = (V - sc) @ sn
rad = np.linalg.norm((V - sc) - np.outer(d, sn), axis=1)
R = 13.6
shield = (rad < R + 0.5) & (d > -1.3) & (d < 3.2)
paint(shield & ((rad > 12.0) | ((rad < 2.6) & (d > 0.6))), 'iron')
paint(shield, 'wood')
# Svärdet: allt framför kroppen
bc, bu = np.array([9.47, 21.54, 17.29]), np.array([0.631, 0.181, 0.755])
bt = (V - bc) @ bu
bp = np.linalg.norm((V - bc) - np.outer(bt, bu), axis=1)
paint((bt > -11.6) & (bp < 1.6), 'steel')
bth = ((V - bc) - np.outer(bt, bu)) @ np.array([-0.77, 0.026, 0.637])   # bladets tjockleksriktning
paint((bt > -14.6) & (bt <= -11.6) & (bp < 3.8) & (bth > -0.9) & (bth < 3.2), 'gold')
paint((bt > -22.5) & (bt <= -14.6) & (bp < 3.4), 'skin')     # händerna runt greppet
paint((bt > -24.5) & (bt <= -22.5) & (bp < 1.6), 'gold')     # svärdsknappen
# Huvudet
head = Y > 38.2
hx, hz = X - (-2.35), Z - (-6.4)
hf = hx * np.sin(np.radians(15)) + hz * np.cos(np.radians(15))   # framåt för ansiktet
paint(head & (Y > 45.0) & (Y < 46.4) & (hf > 0.5), 'band')
face = head & (Y < 45.2) & (hf > 1.2)
paint(face, 'skin')
paint(head, 'hair')
# Halsen
paint((Y > 36.0) & (Y <= 38.2) & (np.hypot(dx, dz) < 3.6), 'skin')
# Armar och händer: allt utanför bålens ellips mellan höjd 12 och 27 (skölden och svärdet är redan målade)
ell = ((X + 1.5) / 8.7) ** 2 + ((Z + 6.2) / 5.2) ** 2
outside = np.where(Y < 22, ell > 1.0, ell > 1.3)
hands_c = np.array([[-1.9, 18.3, 3.7], [2.5, 15.5, 5.5]])
dh = np.min(np.linalg.norm(V[:, None, :] - hands_c[None], axis=2), axis=1)
near = dh < 9.5
arms_lo = outside & (Y > 12) & (Y < 27) & (((Y < 18.3) & (dh < 7.6)) | ((Y >= 18.3) & (near | (np.abs(ux) > 9.3))))
paint(arms_lo & (dh > 4.6) & (dh < 7.6), 'leatherDark')   # armskydd vid handlederna
paint(arms_lo, 'skin')
arms_hi = (np.abs(ux) > 9.3) & (Y >= 27) & (Y < 35)
paint(arms_hi & (Y < 28.2), 'skin')
paint(arms_hi, 'tunic')                                   # korta ärmar
# Reliefer på bröstpansaret (emblemet, axelplattorna): punkter som sticker ut från en utjämnad yta
E0 = mesh3.edges_unique
cnt0 = np.zeros(n); np.add.at(cnt0, E0[:, 0], 1); np.add.at(cnt0, E0[:, 1], 1)
S = V.copy()
for _ in range(25):
    acc = np.zeros_like(S); np.add.at(acc, E0[:, 0], S[E0[:, 1]]); np.add.at(acc, E0[:, 1], S[E0[:, 0]])
    S = 0.4 * S + 0.6 * acc / np.maximum(cnt0, 1)[:, None]
relief = ((V - S) * N).sum(1)
torso = (Y >= 21.6) & (Y < 36) & ~((np.abs(ux) > 9.3) & (Y > 27))

# Bälte, bröstpansar, kjol
paint((Y > 18.3) & (Y < 21.6), 'leatherDark')
paint((Y >= 21.6) & (Y < 36), 'leather')
paint(Y <= 18.3, 'tunic')
# Mjukare gränser mellan färgerna (som penseldrag)
E1 = mesh3.edges_unique
cn1 = np.zeros(n); np.add.at(cn1, E1[:, 0], 1); np.add.at(cn1, E1[:, 1], 1)
for _ in range(2):
    acc = np.zeros_like(col); np.add.at(acc, E1[:, 0], col[E1[:, 1]]); np.add.at(acc, E1[:, 1], col[E1[:, 0]])
    col = 0.5 * col + 0.5 * acc / np.maximum(cn1, 1)[:, None]
# Krökning: kanter ljusare (slitna), skrymslen mörkare, som en målad miniatyr
E = mesh3.edges_unique
nb = np.zeros_like(V); cnt = np.zeros(n)
np.add.at(nb, E[:, 0], V[E[:, 1]]); np.add.at(nb, E[:, 1], V[E[:, 0]])
np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
lap = ((nb / np.maximum(cnt, 1)[:, None]) - V)
curv = -(lap * N).sum(1)            # + = kupigt (kant), − = skrymsle
for _ in range(2):
    sm = np.zeros(n); np.add.at(sm, E[:, 0], curv[E[:, 1]]); np.add.at(sm, E[:, 1], curv[E[:, 0]])
    curv = 0.5 * curv + 0.5 * sm / np.maximum(cnt, 1)
cs = np.clip(curv / (np.percentile(np.abs(curv), 95) + 1e-9), -1, 1)
k = np.where(cs < 0, 1 + 0.55 * cs, 1 + 0.22 * cs)
k *= 0.86 + 0.14 * np.clip(N[:, 1] * 0.5 + 0.5, 0, 1)
col = col * k[:, None]
# Lite mer mättade färger, så att de syns i startmenyns mörka ljus
gray = col.mean(1, keepdims=True)
col = np.clip(gray + (col - gray) * 1.25, 0, 255)
# Skriv CHM1
lo, hi = V.min(0), V.max(0)
q = np.round((V - lo) / (hi - lo) * 65535).astype('<u2')
idx = F.astype('<u2' if n < 65536 else '<u4')
def pad(b): return b + b'\0' * ((-len(b)) % 4)
blob = struct.pack('<4sIII', b'CHM1', n, len(F) * 3, 2 if n < 65536 else 4) + struct.pack('<6f', *lo, *hi)
blob += pad(q.tobytes()) + pad(col.astype('u1').tobytes()) + pad(idx.tobytes())
open(out, 'wb').write(blob)
for k_ in C: print(k_, (tag == k_).sum(), end='  ')
print('\nbytes', len(blob))

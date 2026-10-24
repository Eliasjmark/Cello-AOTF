# Verktyg för att göra Elias skulpturer till spelmodeller (0.13).
#
#   · Skulpturerna (FBX från Blender) har inga färger, texturer eller skelett, och 150 000–390 000 trianglar.
#   · Här förenklas de, målas i regioner (varje hörn får ett regionnummer, och spelet väljer färgen per figur),
#     och får ett skelett med mjuka skinnvikter (två ben per hörn).
#   · Allt packas i en enda binärfil, models/pack.bin, som src/skinned.js läser.
#
# Koordinater: Y upp, figuren tittar mot +Z, fötterna på Y = 0, enheter i meter.
import numpy as np, trimesh, struct

def load_ply(path):
    m = trimesh.load(path, process=True)
    m.merge_vertices()
    return m

def simplify(m, target):
    if len(m.faces) <= target:
        return m
    import fast_simplification as fs
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
    return trimesh.Trimesh(v, f, process=True)

def edges(m):
    return m.edges_unique

def smooth_field(m, field, iters, keep=0.5):
    # Jämnar ut ett värde per hörn längs nätets kanter (följer ytan, inte rummet)
    E = edges(m)
    n = len(m.vertices)
    cnt = np.zeros(n); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    f = field.astype(np.float64).copy()
    two = f.ndim == 1
    if two:
        f = f[:, None]
    for _ in range(iters):
        acc = np.zeros_like(f)
        np.add.at(acc, E[:, 0], f[E[:, 1]]); np.add.at(acc, E[:, 1], f[E[:, 0]])
        f = keep * f + (1 - keep) * acc / np.maximum(cnt, 1)[:, None]
    return f[:, 0] if two else f

def curvature(m):
    # + = kupigt (kant), − = skrymsle; normerat till ungefär −1..1
    V, N, E = m.vertices, m.vertex_normals, edges(m)
    n = len(V)
    nb = np.zeros_like(V); cnt = np.zeros(n)
    np.add.at(nb, E[:, 0], V[E[:, 1]]); np.add.at(nb, E[:, 1], V[E[:, 0]])
    np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    lap = nb / np.maximum(cnt, 1)[:, None] - V
    c = -(lap * N).sum(1)
    c = smooth_field(m, c, 2)
    return np.clip(c / (np.percentile(np.abs(c), 95) + 1e-9), -1, 1)

def shade(m):
    # Ett ljushetsvärde per hörn (0..255) som spelet multiplicerar med regionens färg:
    # kanter lite ljusare, skrymslen mörkare, undersidor mörkare (som en målad miniatyr)
    cs = curvature(m)
    k = np.where(cs < 0, 1 + 0.5 * cs, 1 + 0.16 * cs)
    k *= 0.84 + 0.16 * np.clip(m.vertex_normals[:, 1] * 0.5 + 0.5, 0, 1)
    return np.clip(k * 200, 0, 255).astype('u1')

def frame_to(d, parent=None):
    # Rotation (3×3) som tar −Y till riktningen d, minsta möjliga vridning i förälderns ram
    d = np.asarray(d, float); d = d / np.linalg.norm(d)
    P = np.eye(3) if parent is None else parent
    dl = P.T @ d
    a = np.array([0, -1.0, 0])
    v = np.cross(a, dl); s = np.linalg.norm(v); c = a @ dl
    if s < 1e-8:
        Rl = np.eye(3) if c > 0 else np.diag([1, -1, -1.0])
    else:
        k = v / s
        K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        Rl = np.eye(3) + s * K + (1 - c) * (K @ K)
    return P @ Rl

def quat(R):
    # 3×3 → kvaternion (x, y, z, w)
    t = np.trace(R)
    if t > 0:
        s = np.sqrt(t + 1) * 2; w = s / 4; x = (R[2, 1] - R[1, 2]) / s; y = (R[0, 2] - R[2, 0]) / s; z = (R[1, 0] - R[0, 1]) / s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2; w = (R[2, 1] - R[1, 2]) / s; x = s / 4; y = (R[0, 1] + R[1, 0]) / s; z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2; w = (R[0, 2] - R[2, 0]) / s; x = (R[0, 1] + R[1, 0]) / s; y = s / 4; z = (R[1, 2] + R[2, 1]) / s
    else:
        s = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2; w = (R[1, 0] - R[0, 1]) / s; x = (R[0, 2] + R[2, 0]) / s; y = (R[1, 2] + R[2, 1]) / s; z = s / 4
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)

class Skeleton:
    # Ben: namn, förälder, led (världsposition i viloställningen) och riktning (−Y i benets ram pekar dit)
    def __init__(self):
        self.bones = []  # dict(name, parent, pos, R)

    def add(self, name, parent, pos, toward=None):
        pi = self.index(parent) if parent else -1
        PR = self.bones[pi]['R'] if pi >= 0 else None
        if toward is None:
            R = np.eye(3) if PR is None else PR.copy()
        else:
            R = frame_to(np.asarray(toward, float) - np.asarray(pos, float), PR)
        self.bones.append(dict(name=name, parent=pi, pos=np.asarray(pos, float), R=R))
        return len(self.bones) - 1

    def index(self, name):
        for i, b in enumerate(self.bones):
            if b['name'] == name:
                return i
        raise KeyError(name)

def skin(m, labels, nbones, iters=6, locked=None):
    # labels: ett ben per hörn. Vikterna sprids längs ytan så att lederna böjer mjukt.
    # locked: hörn som ska behålla sitt ben helt (t.ex. huvudet)
    W = np.zeros((len(m.vertices), nbones))
    W[np.arange(len(labels)), labels] = 1
    if iters:
        W = smooth_field(m, W, iters, keep=0.5)
    if locked is not None:
        W[locked] = 0; W[locked, labels[locked]] = 1
    top = np.argsort(-W, axis=1)[:, :2]
    w0 = W[np.arange(len(W)), top[:, 0]]; w1 = W[np.arange(len(W)), top[:, 1]]
    s = np.maximum(w0 + w1, 1e-9)
    return top.astype('u1'), np.clip(np.round(w0 / s * 255), 0, 255).astype('u1')

def pad(b):
    return b + b'\0' * ((-len(b)) % 4)

def name16(s):
    b = s.encode('ascii')[:16]
    return b + b'\0' * (16 - len(b))

def write_model(m, regions, region_names, skel=None, bidx=None, bw=None, shade_u8=None):
    # En modell i formatet CSK1:
    #   'CSK1', antal hörn, antal index, indexstorlek, antal ben, antal regioner, min[3], max[3]
    #   regionnamn (16 byte var), ben: namn (16), förälder (i32), position (3 f32), kvaternion (4 f32)
    #   positioner u16×3, region u8, ljushet u8, benindex u8×2, vikt u8 (för det första benet)
    #   index
    V = m.vertices.astype(np.float64); F = m.faces
    n = len(V); nb = len(skel.bones) if skel else 0
    lo, hi = V.min(0), V.max(0)
    span = np.maximum(hi - lo, 1e-6)
    q = np.round((V - lo) / span * 65535).astype('<u2')
    isz = 2 if n < 65536 else 4
    out = struct.pack('<4sIIIII', b'CSK1', n, len(F) * 3, isz, nb, len(region_names)) + struct.pack('<6f', *lo, *hi)
    for r in region_names:
        out += name16(r)
    for b in (skel.bones if skel else []):
        out += name16(b['name']) + struct.pack('<i', b['parent']) + struct.pack('<3f', *b['pos']) + struct.pack('<4f', *quat(b['R']))
    out += pad(q.tobytes())
    out += pad(regions.astype('u1').tobytes())
    out += pad((shade_u8 if shade_u8 is not None else np.full(n, 200, 'u1')).tobytes())
    if nb:
        out += pad(bidx.astype('u1').tobytes())
        out += pad(bw.astype('u1').tobytes())
    out += pad(F.astype('<u2' if isz == 2 else '<u4').tobytes())
    return out

def write_pack(path, entries):
    # 'CPK1', antal, sedan (namn 16, offset u32, längd u32) per modell, sedan modellerna
    head = struct.pack('<4sI', b'CPK1', len(entries))
    table_size = len(entries) * 24
    off = 8 + table_size
    table = b''; body = b''
    for name, blob in entries:
        blob = pad(blob)
        table += name16(name) + struct.pack('<II', off + len(body), len(blob))
        body += blob
    data = head + table + body
    open(path, 'wb').write(data)
    return len(data)

def save_debug_ply(path, m, colors=None):
    mm = trimesh.Trimesh(m.vertices, m.faces, process=False)
    if colors is not None:
        mm.visual.vertex_colors = np.c_[colors, np.full(len(colors), 255)].astype('u1')
    mm.export(path)

def cut_bridges(m, lab, skel, min_faces=40, ok_pairs=()):
    # Skulpturerna är ett enda skal: en hand som vilar mot bältet sitter ihop med det. Trianglar som binder ihop
    # ben som inte sitter bredvid varandra i skelettet (handen och höften) skulle sträckas ut till långa hinnor
    # när armen rör sig, så de klipps bort. Små lösa bitar som blir kvar tas också bort.
    # Returnerar (nytt nät, index till de gamla hörnen som behölls).
    nb = len(skel.bones)
    adj = np.eye(nb, dtype=bool)
    for i, b in enumerate(skel.bones):
        if b['parent'] >= 0:
            adj[i, b['parent']] = adj[b['parent'], i] = True
    for a, b in ok_pairs:
        ia, ib = skel.index(a), skel.index(b)
        adj[ia, ib] = adj[ib, ia] = True
    F = m.faces
    # skal som redan var lösa i skulpturen (glasögon, spännen) ska vara kvar
    oc = trimesh.graph.connected_components(m.face_adjacency, nodes=np.arange(len(F)), min_len=1)
    orig_id = np.zeros(len(F), int); orig_size = np.zeros(len(oc), int)
    for i, c in enumerate(oc):
        orig_id[c] = i; orig_size[i] = len(c)
    L = lab[F]
    ok = adj[L[:, 0], L[:, 1]] & adj[L[:, 1], L[:, 2]] & adj[L[:, 0], L[:, 2]]
    okidx = np.where(ok)[0]
    f = F[ok]
    t = trimesh.Trimesh(m.vertices, f, process=False)
    comps = trimesh.graph.connected_components(t.face_adjacency, nodes=np.arange(len(f)), min_len=1)
    keepf = np.zeros(len(f), bool)
    big = max(len(c) for c in comps)
    for c in comps:
        # lösa smulor (fingertoppar som klipptes loss från ett grepp) tas bort, men inte skal som var lösa från början
        osz = orig_size[orig_id[okidx[c[0]]]]
        cut_off = len(c) < 0.5 * osz
        if not cut_off or len(c) >= max(min_faces, 0.006 * big):
            keepf[c] = True
    f = f[keepf]
    used = np.unique(f)
    remap = -np.ones(len(m.vertices), int); remap[used] = np.arange(len(used))
    return trimesh.Trimesh(m.vertices[used], remap[f], process=False), used

def seg_dist(P, a, b):
    ab = np.asarray(b, float) - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + np.outer(t, ab)), axis=1)

def capsule_cost(P, segs, r):
    # Avståndet till benets mittlinje delat med lemmens tjocklek (1 ≈ på ytan)
    d = np.min([seg_dist(P, np.asarray(a, float), np.asarray(b, float)) for a, b in segs], axis=0)
    return d / r

def column_cost(P, y0, y1, rx, rz, cx=0.0, cz=0.0, ry=0.08):
    # En stående elliptisk pelare (bål, höfter): 1 ≈ på ytan
    q = ((P[:, 0] - cx) / rx) ** 2 + ((P[:, 2] - cz) / rz) ** 2
    dy = np.maximum(0, np.maximum(y0 - P[:, 1], P[:, 1] - y1)) / ry
    return np.sqrt(q + dy ** 2)

def majority(m, lab, nlab, iters=3, fixed=None):
    # Varje hörn tar den vanligaste etiketten bland sig själv och grannarna (tar bort fläckar)
    E = m.edges_unique
    for _ in range(iters):
        votes = np.zeros((len(lab), nlab))
        votes[np.arange(len(lab)), lab] += 1.5
        np.add.at(votes, (E[:, 0], lab[E[:, 1]]), 1)
        np.add.at(votes, (E[:, 1], lab[E[:, 0]]), 1)
        new = votes.argmax(1)
        if fixed is not None:
            new[fixed] = lab[fixed]
        lab = new
    return lab

def keep_largest(m, lab, groups, fallback):
    # För varje grupp av etiketter (t.ex. en hel arm): bara den största sammanhängande biten får behålla dem,
    # resten får fallback(hörnindex) i stället
    F = m.faces
    for g in groups:
        sel = np.isin(lab, g)
        fm = sel[F].all(1)
        f = F[fm]
        if not len(f):
            continue
        t = trimesh.Trimesh(m.vertices, f, process=False)
        comps = trimesh.graph.connected_components(t.face_adjacency, nodes=np.arange(len(f)), min_len=1)
        big = max(comps, key=len)
        keepv = np.zeros(len(lab), bool); keepv[np.unique(f[big])] = True
        bad = sel & ~keepv
        lab[bad] = fallback(np.where(bad)[0])
    return lab

def boundary_point(m, lab, a, b):
    # Medelpunkten av hörnen där etikett a möter etikett b (en led)
    E = m.edges_unique
    la, lb = lab[E[:, 0]], lab[E[:, 1]]
    sel = ((la == a) & (lb == b)) | ((la == b) & (lb == a))
    if not sel.any():
        return None
    return m.vertices[np.unique(E[sel])].mean(0)

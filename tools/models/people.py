# Bybon, flickan och bossarna (0.13): målning och skelett för varje skulptur.
# Sidorna heter som i de byggda figurerna: L är −X-sidan (figurens högra sida, sett bakifrån till höger), R är +X.
# Källorna ligger i tools/models/src/*.ply (normerade: höjd 1, fötterna på Y = 0, tittar mot +Z).
# Måtten nedan är uppmätta på skulpturerna i de normerade enheterna och skalas sedan till spelets enheter
# (före figurens root.scale, som för de byggda figurerna: en vuxen är ungefär 1,95 hög).
import os, numpy as np, trimesh
from meshkit import load_ply, simplify, Skeleton, skin, shade, cut_bridges, capsule_cost, column_cost, majority, keep_largest

HERE = os.path.dirname(os.path.abspath(__file__))

def src(name, target):
    m = load_ply(os.path.join(HERE, 'src', name + '.ply'))
    return simplify(m, target)

def finish(m, H, tags, names, sk_def, cost_fn, locked_mask=None, iters=5, ok_pairs=()):
    # tags: regionnamn per hörn (normerade enheter), sk_def(H) → Skeleton, cost_fn(V, names) → kostnad per ben
    V = m.vertices
    reg = np.array([names.index(t) for t in tags])
    sk = sk_def()
    bn = [b['name'] for b in sk.bones]
    cost = cost_fn(V, bn)
    lab = cost.argmin(1)
    fixed = locked_mask if locked_mask is not None else np.zeros(len(V), bool)
    lab = majority(m, lab, len(bn), iters=2, fixed=fixed)
    m2, keep = cut_bridges(m, lab, sk, ok_pairs=ok_pairs)
    lab = lab[keep]; reg = reg[keep]
    lk = fixed[keep] if locked_mask is not None else None
    bidx, bw = skin(m2, lab, len(bn), iters=iters, locked=lk)
    # skala till spelets enheter
    m2 = trimesh.Trimesh(m2.vertices * H, m2.faces, process=False)
    for b in sk.bones:
        b['pos'] = b['pos'] * H
    return dict(mesh=m2, regions=reg, names=names, skel=sk, bidx=bidx, bw=bw, shade=shade(m2), lab=lab)

# ---------------------------------------------------------------- Bybon
BYBO_REGIONS = ['skin', 'cap', 'hair', 'beard', 'top', 'belt', 'skirt', 'boots']

def bybo(target=14000, H=1.75):
    m = src('bybo', target)
    V = m.vertices; X, Y, Z = V.T
    n = len(V)
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    paint(Y < 0.135, 'boots')
    paint((Y >= 0.135) & (Y < 0.372), 'skirt')
    paint((Y >= 0.372) & (Y < 0.40), 'belt')
    # händerna (knäppta framför bröstet)
    paint(np.linalg.norm(V - [0, 0.51, 0.17], axis=1) < 0.085, 'skin')
    paint((Y >= 0.40) & (Y < 0.585), 'top')
    paint((Y >= 0.585) & (Y < 0.67) & (np.abs(X) > 0.135), 'top')      # axlarna
    paint((Y >= 0.585) & (Y < 0.64) & (Z < -0.06), 'top')              # ryggen
    # huvudet: skägget under munnen, ansiktet i hårets ram, hjässan och håret runt om
    face_e = (X / 0.125) ** 2 + ((Y - 0.765) / 0.115) ** 2
    paint((Y < 0.705) & (Y >= 0.575) & (Z > 0.06) & (np.abs(X) < 0.12), 'beard')
    paint((face_e < 1) & (Z > 0.07), 'skin')
    paint((Y >= 0.585) & (Y < 0.66) & (Z <= 0.06) & (np.abs(X) < 0.1), 'skin')    # nacken
    paint(Y > 0.83, 'cap')
    paint(Y >= 0.585, 'hair')
    def sk_def():
        sk = Skeleton()
        sk.add('hips', None, [0, 0.30, 0])
        sk.add('torso', 'hips', [0, 0.40, 0])
        sk.add('head', 'torso', [0, 0.60, 0.0])
        for s, nm in [(-1, 'L'), (1, 'R')]:
            sk.add('leg' + nm, 'hips', [0.085 * s, 0.24, 0], toward=[0.085 * s, 0.10, 0])
            sk.add('knee' + nm, 'leg' + nm, [0.085 * s, 0.10, 0], toward=[0.085 * s, 0.0, 0.02])
        return sk
    head_v = np.isin(tag, ['cap', 'hair', 'beard']) | ((tag == 'skin') & (Y > 0.57))
    def cost(V, bn):
        X, Y, Z = V.T
        c = np.full((len(V), len(bn)), 9.0)
        c[:, bn.index('hips')] = column_cost(V, 0.12, 0.40, 0.25, 0.25, ry=0.04)
        c[:, bn.index('torso')] = column_cost(V, 0.40, 0.60, 0.3, 0.3, ry=0.04)
        c[:, bn.index('head')] = np.where(head_v, 0.0, 9.0)
        for s, nm in [(-1, 'L'), (1, 'R')]:
            side = (X * s) > 0
            c[:, bn.index('knee' + nm)] = np.where(side & (Y < 0.135), 0.0, 9.0)
            c[:, bn.index('leg' + nm)] = np.where(side & (Y >= 0.135) & (Y < 0.19) & (np.abs(X) > 0.03) & (np.abs(X) < 0.13) & (np.abs(Z) < 0.08), 0.5, 9.0)
        return c
    return finish(m, H, tag, BYBO_REGIONS, sk_def, cost, locked_mask=head_v, iters=4)

# ---------------------------------------------------------------- Flickan
MAIDEN_REGIONS = ['skin', 'hair', 'gold', 'bodice', 'cloth', 'skirt', 'tights', 'boots', 'steel', 'leather']

def maiden(target=16000, H=1.9):
    m = src('love', target)
    V = m.vertices; X, Y, Z = V.T
    n = len(V)
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    ax = np.abs(X)
    # svärdet på ryggen: allt bakom ryggen nedanför skulderbladen
    sword = (Z < -0.07) & (Y < 0.66) & (Y > 0.28) & (ax < 0.12)
    paint(sword & (Y > 0.6), 'leather')
    paint(sword, 'steel')
    # benen: stövlar med knäskydd, strumpbyxor upp till kjolen
    paint((Y < 0.3) & (Y > 0.2) & (Z > 0.02), 'steel')
    paint(Y < 0.3, 'boots')
    paint((Y >= 0.3) & (Y < 0.44) & (ax < 0.14), 'tights')
    # armarna: armskydd vid handlederna, händer, bara armar, puffärmar
    arm = ax > 0.13
    paint(arm & (Y < 0.53) & (ax > 0.23), 'skin')                       # händerna
    paint(arm & (Y >= 0.5) & (Y < 0.585) & (ax > 0.17), 'steel')        # armskydden
    paint(arm & (Y >= 0.64) & (Y < 0.72), 'cloth')                      # puffärmarna
    paint(arm & (Y < 0.72) & (Z > -0.07), 'skin')
    # kjolen och bälte
    paint((Y >= 0.43) & (Y < 0.59), 'skirt')
    paint((Y >= 0.59) & (Y < 0.625), 'gold')
    # håret: långt bak och ner längs sidorna, en tiara högst upp
    paint((Y > 0.93) & (ax < 0.03) & (Z > 0.0), 'gold')
    face = (Y > 0.765) & (Y < 0.875) & (Z > 0.065) & (ax < 0.062)
    paint(face, 'skin')
    paint((Y > 0.73) & (Y <= 0.78) & (ax < 0.04) & (Z > -0.02), 'skin')   # halsen
    paint((Y > 0.76), 'hair')
    paint((Y > 0.5) & (Z < -0.03) & (ax < 0.17), 'hair')
    paint((Y >= 0.62) & (Y < 0.76) & (ax > 0.09) & (Z < 0.06) & (Z > -0.03) & (ax < 0.15), 'hair')
    paint((Y >= 0.625) & (Y < 0.735), 'bodice')
    paint(np.ones(n, bool), 'cloth')

    J = {
        'R': [np.array([0.105, 0.69, 0.02]), np.array([0.17, 0.61, 0.05]), np.array([0.217, 0.54, 0.07]), np.array([0.265, 0.48, 0.08])],
    }
    J['L'] = [p * [-1, 1, 1] for p in J['R']]
    def sk_def():
        sk = Skeleton()
        sk.add('hips', None, [0, 0.50, 0])
        sk.add('torso', 'hips', [0, 0.60, 0])
        sk.add('head', 'torso', [0, 0.765, 0.0])
        for s, nm in [(-1, 'L'), (1, 'R')]:
            sh_, el_, wr_, ha_ = J[nm]
            sk.add('arm' + nm, 'torso', sh_, toward=el_)
            sk.add('elbow' + nm, 'arm' + nm, el_, toward=wr_)
            sk.add('hand' + nm, 'elbow' + nm, ha_)
            sk.add('leg' + nm, 'hips', [0.072 * s, 0.47, 0.0], toward=[0.075 * s, 0.29, 0.0])
            sk.add('knee' + nm, 'leg' + nm, [0.075 * s, 0.29, 0.0], toward=[0.075 * s, 0.05, -0.005])
        return sk
    head_v = (Y > 0.765) & ~((Z < -0.02) & (Y < 0.85))
    sword_v = np.isin(tag, ['steel', 'leather']) & (Z < -0.07) & (Y > 0.28) & (Y < 0.66)
    def cost(V, bn):
        X, Y, Z = V.T
        c = np.full((len(V), len(bn)), 9.0)
        c[:, bn.index('hips')] = column_cost(V, 0.43, 0.6, 0.15, 0.12, ry=0.04)
        c[:, bn.index('torso')] = column_cost(V, 0.6, 0.78, 0.12, 0.1, ry=0.04)
        c[:, bn.index('head')] = np.where(head_v, 0.0, 9.0)
        c[sword_v, bn.index('torso')] = 0.0
        for s, nm in [(-1, 'L'), (1, 'R')]:
            sh_, el_, wr_, ha_ = J[nm]
            c[:, bn.index('arm' + nm)] = capsule_cost(V, [(sh_, el_)], 0.05)
            tip = ha_ + (ha_ - wr_) * 0.6
            c[:, bn.index('elbow' + nm)] = capsule_cost(V, [(el_, wr_), (wr_, tip)], 0.05)
            c[:, bn.index('leg' + nm)] = capsule_cost(V, [([0.072 * s, 0.47, 0], [0.075 * s, 0.30, 0])], 0.07)
            c[:, bn.index('knee' + nm)] = capsule_cost(V, [([0.075 * s, 0.30, 0], [0.075 * s, 0.0, 0.03])], 0.07)
            c[:, bn.index('hand' + nm)] = 99
        return c
    return finish(m, H, tag, MAIDEN_REGIONS, sk_def, cost, locked_mask=head_v | sword_v, iters=5)

# ---------------------------------------------------------------- Dvärgen (Hrungnir)
DWARF_REGIONS = ['skin', 'beard', 'iron', 'brass', 'fur', 'armor', 'leather', 'gold', 'coat', 'boots', 'stone']

def dwarf(target=18000, H=5.6):
    m = src('boss1', target)
    V = m.vertices; X, Y, Z = V.T
    n = len(V)
    ax = np.abs(X)
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    hammer = ((X > 0.02) & (Y > 0.70) & (Z < -0.08)) | ((X > 0.08) & (Y > 0.86) & (Z < 0.02))
    paint(hammer, 'stone')
    paint((Y > 0.76) & (Y < 0.845) & (Z > 0.08) & (ax < 0.16), 'brass')     # glasögonen
    paint((ax < 0.05) & (Y > 0.70) & (Y < 0.78) & (Z > 0.14), 'skin')        # näsan
    paint(Y > 0.83, 'iron')                                                    # hjälmen
    paint((ax < 0.18) & (Y > 0.44) & (Y < 0.78) & (Z > 0.04), 'beard')
    paint((ax > 0.09) & (ax < 0.18) & (Y > 0.34) & (Y <= 0.44) & (Z > 0.12), 'beard')   # flätorna
    paint((X < -0.2) & (Y > 0.55) & (Y < 0.68) & (Z > 0.17), 'skin')         # höger näve
    paint(np.linalg.norm(V - [0.29, 0.37, 0.17], axis=1) < 0.075, 'skin')     # vänster hand
    paint((Y > 0.65) & (Y < 0.79), 'fur')
    paint((ax > 0.22) & (Y > 0.34) & (Y < 0.7), 'armor')
    paint((ax < 0.05) & (Y > 0.36) & (Y < 0.46) & (Z > 0.24), 'gold')
    paint((X > 0.08) & (X < 0.27) & (Y > 0.26) & (Y < 0.4) & (Z > 0.14), 'leather')   # väskan
    paint((Y >= 0.36) & (Y < 0.46), 'leather')
    paint(Y < 0.11, 'boots')
    paint(np.ones(n, bool), 'coat')
    J = {
        'L': [np.array([-0.25, 0.70, -0.02]), np.array([-0.33, 0.50, 0.0]), np.array([-0.30, 0.58, 0.19]), np.array([-0.28, 0.62, 0.26])],
        'R': [np.array([0.25, 0.70, -0.02]), np.array([0.29, 0.50, -0.02]), np.array([0.30, 0.41, 0.10]), np.array([0.29, 0.37, 0.18])],
    }
    def sk_def():
        sk = Skeleton()
        sk.add('hips', None, [0, 0.30, 0])
        sk.add('torso', 'hips', [0, 0.45, 0])
        sk.add('head', 'torso', [0, 0.74, 0.02])
        for s, nm in [(-1, 'L'), (1, 'R')]:
            sh_, el_, wr_, ha_ = J[nm]
            # Bossens ben pekar inte nedåt: viloställningen är skulpturens egen pose (armarna böjda, nävarna knutna),
            # och bossens rörelser vrider därifrån
            sk.add('arm' + nm, 'torso', sh_)
            sk.add('elbow' + nm, 'arm' + nm, el_)
            sk.add('hand' + nm, 'elbow' + nm, ha_)
            sk.add('leg' + nm, 'hips', [0.12 * s, 0.28, 0.0])
            sk.add('knee' + nm, 'leg' + nm, [0.12 * s, 0.12, 0.0])
        return sk
    # Hammaren lyfts ut som en egen stel modell (den hänger på ryggen i skulpturen, i spelet hålls den i handen)
    F = m.faces
    ham_f = (tag[F] == 'stone').all(1)
    hm, hu = submesh(m, ham_f)
    # Hammarens ram: skaftet längs −Y, huvudet längst ner, greppet (skaftets ände) i origo
    P = hm.vertices
    c = P.mean(0)
    w, vecs = np.linalg.eigh(np.cov((P - c).T))
    axis = vecs[:, -1]
    t = (P - c) @ axis
    # huvudet är den tunga änden: där punkterna ligger tätast
    if (t > 0).sum() < (t < 0).sum():
        axis = -axis; t = -t
    # nu pekar axis mot skaftets ände (glesa änden); greppet en bit in från änden
    grip = c + axis * (t.max() - 0.04)
    yax = -axis
    xax = np.cross([0, 0, 1.0], yax); xax /= np.linalg.norm(xax)
    zax = np.cross(xax, yax)
    Rm = np.stack([xax, yax, zax])
    L = (P - grip) @ Rm.T
    hmesh = trimesh.Trimesh(L * H, hm.faces, process=False)
    hammer_out = dict(mesh=hmesh, regions=np.array([DWARF_REGIONS.index('stone')] * len(L)), names=DWARF_REGIONS, shade=shade(hmesh))
    bm, bu = submesh(m, ~ham_f)
    m = bm; V = m.vertices; X, Y, Z = V.T; ax = np.abs(X); tag = tag[bu]
    head_v = ((Y > 0.76) & (ax < 0.2)) | ((tag == 'beard') & (Y > 0.5))
    ham_v = np.zeros(len(V), bool)
    def cost(V, bn):
        X, Y, Z = V.T
        c = np.full((len(V), len(bn)), 9.0)
        c[:, bn.index('hips')] = column_cost(V, 0.1, 0.45, 0.24, 0.24, ry=0.04)
        c[:, bn.index('torso')] = column_cost(V, 0.45, 0.8, 0.23, 0.27, ry=0.04)
        c[:, bn.index('head')] = np.where(head_v, 0.0, 9.0)
        c[ham_v, bn.index('torso')] = 0.0
        for s, nm in [(-1, 'L'), (1, 'R')]:
            sh_, el_, wr_, ha_ = J[nm]
            c[:, bn.index('arm' + nm)] = capsule_cost(V, [(sh_, el_)], 0.1)
            tip = ha_ + (ha_ - wr_) * 0.8
            c[:, bn.index('elbow' + nm)] = capsule_cost(V, [(el_, wr_), (wr_, tip)], 0.09)
            side = (X * s) > 0.02
            c[:, bn.index('leg' + nm)] = np.where(side & (Y < 0.2) & (Y >= 0.11) & (ax < 0.24), 0.6, 9.0)
            c[:, bn.index('knee' + nm)] = np.where(side & (Y < 0.11), 0.0, 9.0)
            c[:, bn.index('hand' + nm)] = 99
        return c
    return finish(m, H, tag, DWARF_REGIONS, sk_def, cost, locked_mask=head_v, iters=10), hammer_out

def submesh(m, fmask):
    f = m.faces[fmask]
    u = np.unique(f)
    rm = -np.ones(len(m.vertices), int); rm[u] = np.arange(len(u))
    return trimesh.Trimesh(m.vertices[u], rm[f], process=False), u

# ---------------------------------------------------------------- Hydran (Apophis)
HYDRA_REGIONS = ['scale', 'belly', 'spine', 'wing', 'horn']
# Fem halsar: punkter längs nackens mittlinje från roten till huvudet (normerade enheter, uppmätta på skulpturen)
HYDRA_NECKS = [
    [(-0.20, 0.10, 0.20), (-0.40, 0.32, 0.18), (-0.49, 0.50, 0.25), (-0.43, 0.66, 0.35)],
    [(-0.10, 0.10, 0.25), (-0.21, 0.33, 0.23), (-0.24, 0.58, 0.17), (-0.205, 0.76, 0.42)],
    [(0.0, 0.10, 0.28), (0.0, 0.35, 0.27), (0.0, 0.60, 0.18), (0.0, 0.79, 0.44)],
    [(0.10, 0.10, 0.25), (0.21, 0.33, 0.23), (0.24, 0.58, 0.17), (0.205, 0.76, 0.42)],
    [(0.20, 0.10, 0.20), (0.40, 0.32, 0.18), (0.49, 0.50, 0.25), (0.43, 0.66, 0.35)],
]

def hydra(target=20000, H=7.0):
    m = src('ormar', target)
    V = m.vertices; X, Y, Z = V.T
    n = len(V)
    N = m.vertex_normals
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    necks = [np.array(c) for c in HYDRA_NECKS]
    dn = np.min([capsule_cost(V, list(zip(c[:-1], c[1:])), 1.0) for c in necks], axis=0)
    paint((Z < -0.15) & (Y > 0.15) & (np.abs(X) > 0.25), 'wing')
    # taggar och horn: punkter som sticker ut långt från nackens mittlinje
    hd = np.min([np.linalg.norm(V - c[3], axis=1) for c in necks], axis=0)
    paint((hd > 0.1) & (hd < 0.2) & (Y > 0.62), 'horn')
    # buken: framsidan av nackarna, en rand nerför halsen
    paint((dn < 0.09) & (N[:, 2] > 0.7) & (Y < 0.6) & (hd > 0.1), 'belly')
    paint(np.ones(n, bool), 'scale')
    def sk_def():
        sk = Skeleton()
        sk.add('body', None, [0, 0.08, 0.05])
        for i, c in enumerate(necks):
            sk.add(f'n{i}a', 'body', c[0])
            sk.add(f'n{i}b', f'n{i}a', c[1])
            sk.add(f'n{i}c', f'n{i}b', c[2])
            sk.add(f'h{i}', f'n{i}c', c[3])
        return sk
    def cost(V, bn):
        c = np.full((len(V), len(bn)), 9.0)
        X, Y, Z = V.T
        c[:, bn.index('body')] = np.where((Y < 0.13) | (Z < -0.05), 0.0, 3.0)
        for i, ch in enumerate(necks):
            seg = [(ch[0], ch[1]), (ch[1], ch[2]), (ch[2], ch[3])]
            for j, nm in enumerate(['a', 'b', 'c']):
                c[:, bn.index(f'n{i}{nm}')] = capsule_cost(V, [seg[j]], 0.08)
            # huvudet: allt nära huvudpunkten
            c[:, bn.index(f'h{i}')] = np.linalg.norm(V - ch[3], axis=1) / 0.09
        return c
    # vingarna och svansen sitter fast i kroppen
    body_v = (Z < -0.05) | (Y < 0.11)
    return finish(m, H, tag, HYDRA_REGIONS, sk_def, cost, locked_mask=body_v, iters=6)

# ---------------------------------------------------------------- Spindelgolemen (The Brass Weaver, 0.14)
WEAVER_REGIONS = ['bronze', 'iron', 'copper', 'stone']

def weaver(target=14000, H=4.6):
    m = src('boss4', target)
    V = m.vertices; X, Y, Z = V.T
    n = len(V)
    ax = np.abs(X)
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    paint((Y < 0.42) & (ax < 0.35) & (np.abs(Z) < 0.35), 'stone')      # bakkroppen: sten med koppar
    paint((Y < 0.36), 'iron')                                          # benen
    paint((Y > 0.8) & (ax < 0.12) & (Z > 0.0), 'iron')                 # hjälmen
    paint((ax > 0.25) & (Y > 0.4) & (Y < 0.62), 'copper')              # händerna
    paint(np.ones(n, bool), 'bronze')
    J = {
        'L': [np.array([-0.30, 0.78, 0.02]), np.array([-0.40, 0.62, 0.08]), np.array([-0.44, 0.45, 0.12])],
        'R': [np.array([0.30, 0.78, 0.02]), np.array([0.40, 0.62, 0.08]), np.array([0.44, 0.45, 0.12])],
    }
    def sk_def():
        sk = Skeleton()
        sk.add('body', None, [0, 0.4, 0])
        sk.add('torso', 'body', [0, 0.55, 0])
        sk.add('head', 'torso', [0, 0.82, 0.12])
        for nm in ['L', 'R']:
            sh_, el_, ha_ = J[nm]
            sk.add('arm' + nm, 'torso', sh_)
            sk.add('elbow' + nm, 'arm' + nm, el_)
        return sk
    def cost(V, bn):
        X, Y, Z = V.T
        c = np.full((len(V), len(bn)), 9.0)
        c[:, bn.index('body')] = np.where(Y < 0.5, 0.4, 3.0)
        c[:, bn.index('torso')] = column_cost(V, 0.5, 0.82, 0.26, 0.22, 0, -0.02, ry=0.04)
        c[:, bn.index('head')] = np.where((Y > 0.8) & (np.abs(X) < 0.13) & (Z > 0.0), 0.0, 9.0)
        for nm in ['L', 'R']:
            sh_, el_, ha_ = J[nm]
            c[:, bn.index('arm' + nm)] = capsule_cost(V, [(sh_, el_)], 0.1)
            c[:, bn.index('elbow' + nm)] = capsule_cost(V, [(el_, ha_), (ha_, ha_ + (ha_ - el_) * 0.5)], 0.07)
        return c
    return finish(m, H, tag, WEAVER_REGIONS, sk_def, cost, iters=5)

def build_all():
    d, h = dwarf()
    return {'bybo': bybo(), 'maiden': maiden(), 'dwarf': d, 'dwarfhammer': h, 'hydra': hydra(), 'weaver': weaver()}

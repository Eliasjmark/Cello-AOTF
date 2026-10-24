# Cello (0.13): hjälteskulpturen blir spelfigur.
#   · Skulpturen slutar vid låren: benen byggs i spelet (src/skinned.js).
#   · Svärdet lyfts ut som en egen modell (det sitter i höger hand). Skölden sitter kvar på vänster underarm.
#   · Regionerna (hud, hår, tunika, läder ...) är mätta på just den här skulpturen, som i tools/hero/paint.py.
import numpy as np, trimesh, os
from meshkit import simplify, Skeleton, skin, shade, smooth_field, cut_bridges, capsule_cost, column_cost, majority, keep_largest, boundary_point

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')

BODY_REGIONS = ['skin', 'hair', 'band', 'tunic', 'leather', 'leatherDark', 'bracer', 'wood', 'iron', 'boss']
SWORD_REGIONS = ['steel', 'gold', 'grip']
SHIELD_REGIONS = ['wood', 'iron', 'boss']

# Skulpturens enheter (tools/models/src/hero.ply, från huvudkaraktär.fbx: Y upp, hjässan på 50) → spelets enheter före root.scale (0.9)
S = 1.2 / 50.0
HIP_Y = 0.86          # höftleden i spelet (som de byggda figurerna)
HIP_SCULPT = 0.25     # höftleden i skulpturen, i skulpturens höjd (0 = fållen, 1 = hjässan)

def build(target=32000, debug=None):
    m = trimesh.load(os.path.join(HERE, 'src', 'hero.ply'), process=True)
    m = simplify(m, target)
    V = m.vertices.astype(np.float64)
    m = trimesh.Trimesh(V, m.faces[:, [0, 1, 2]], process=False)
    N = m.vertex_normals
    X, Y, Z = V.T
    n = len(V)
    tag = np.array([''] * n, dtype=object)
    def paint(mask, name):
        tag[mask & (tag == '')] = name
    cx, cz, th = -2.3, -6.4, np.radians(23.5)
    dx, dz = X - cx, Z - cz
    ux = dx * np.cos(th) - dz * np.sin(th)
    # Skölden
    sh = np.load(os.path.join(ROOT, 'tools', 'hero', 'shield.npy')); sn, sc = sh[:3], sh[3:6]
    d = (V - sc) @ sn
    rad = np.linalg.norm((V - sc) - np.outer(d, sn), axis=1)
    R = 13.6
    shield = (rad < R + 0.5) & (d > -1.3) & (d < 3.2)
    paint(shield & (rad > 12.0), 'iron')
    paint(shield & (rad < 2.6) & (d > 0.6), 'boss')
    paint(shield, 'wood')
    # Svärdet
    bc, bu = np.array([9.47, 21.54, 17.29]), np.array([0.631, 0.181, 0.755])
    bt = (V - bc) @ bu
    bp = np.linalg.norm((V - bc) - np.outer(bt, bu), axis=1)
    paint((bt > -11.6) & (bp < 1.6), 'steel')
    bth = ((V - bc) - np.outer(bt, bu)) @ np.array([-0.77, 0.026, 0.637])
    paint((bt > -14.6) & (bt <= -11.6) & (bp < 3.8) & (bth > -0.9) & (bth < 3.2), 'gold')
    grip = (bt > -22.5) & (bt <= -14.6) & (bp < 1.15)
    paint(grip, 'grip')
    paint((bt > -24.5) & (bt <= -22.5) & (bp < 1.6), 'gold')
    paint((bt > -22.5) & (bt <= -14.6) & (bp < 3.4), 'skin')     # händerna runt greppet
    # Huvudet
    head = Y > 38.2
    hx, hz = X - (-2.35), Z - (-6.4)
    hf = hx * np.sin(np.radians(15)) + hz * np.cos(np.radians(15))
    paint(head & (Y > 45.0) & (Y < 46.4) & (hf > 0.5), 'band')
    paint(head & (Y < 45.2) & (hf > 1.2), 'skin')
    paint(head, 'hair')
    paint((Y > 36.0) & (Y <= 38.2) & (np.hypot(dx, dz) < 3.6), 'skin')
    # Armar och händer
    ell = ((X + 1.5) / 8.7) ** 2 + ((Z + 6.2) / 5.2) ** 2
    outside = np.where(Y < 22, ell > 1.0, ell > 1.3)
    hands_c = np.array([[-1.9, 18.3, 3.7], [2.5, 15.5, 5.5]])
    dh = np.min(np.linalg.norm(V[:, None, :] - hands_c[None], axis=2), axis=1)
    near = dh < 9.5
    arms_lo = outside & (Y > 12) & (Y < 27) & (((Y < 18.3) & (dh < 7.6)) | ((Y >= 18.3) & (near | (np.abs(ux) > 9.3))))
    arms_hi = (np.abs(ux) > 9.3) & (Y >= 27) & (Y < 35)
    armmask = (arms_lo | arms_hi) & (tag == '')
    paint(arms_lo & (dh > 4.6) & (dh < 7.6), 'bracer')
    paint(arms_lo, 'skin')
    paint(arms_hi & (Y < 28.2), 'skin')
    paint(arms_hi, 'tunic')
    paint((Y > 18.3) & (Y < 21.6), 'leatherDark')
    paint((Y >= 21.6) & (Y < 36), 'leather')
    paint(Y <= 18.3, 'tunic')

    # Kroppens ram: vrid skulpturen så att Cello tittar mot +Z, fållen på Y = 0
    def to_body(P):
        P = np.atleast_2d(P)
        ddx, ddz = P[:, 0] - cx, P[:, 2] - cz
        x2 = ddx * np.cos(-th) + ddz * np.sin(-th)
        z2 = -ddx * np.sin(-th) + ddz * np.cos(-th)
        return np.c_[x2, P[:, 1], z2]
    hem = HIP_Y - HIP_SCULPT * 50 * S
    def to_game(P):
        B = to_body(P)
        return np.c_[B[:, 0] * S, B[:, 1] * S + hem, B[:, 2] * S]

    is_sword = np.isin(tag, ['steel', 'gold', 'grip'])
    is_shield = np.isin(tag, ['wood', 'iron', 'boss'])
    # Bara svärdet lyfts ut. Skölden sitter fast på vänster underarm (den är ihopsmält med armen i skulpturen).
    F = m.faces
    fs_sword = is_sword[F].sum(1) >= 2
    fs_body = ~fs_sword

    def sub(mask_faces, largest=False):
        f = F[mask_faces]
        if largest:
            t = trimesh.Trimesh(V, f, process=False)
            comps = trimesh.graph.connected_components(t.face_adjacency, nodes=np.arange(len(f)), min_len=1)
            keep = max(comps, key=len)
            f = f[np.sort(keep)]
        used = np.unique(f)
        remap = -np.ones(n, int); remap[used] = np.arange(len(used))
        return used, remap[f]

    G = to_game(V)
    out = {'raw': trimesh.Trimesh(G, F, process=False), 'rawtag': tag.copy()}
    # --- Kroppen (med skölden) ---
    used, fb = sub(fs_body, largest=True)
    body = trimesh.Trimesh(G[used], fb, process=False)
    btag = tag[used]
    btag[btag == ''] = 'tunic'
    btag[np.isin(btag, ['steel', 'gold', 'grip'])] = 'skin'
    reg = np.array([BODY_REGIONS.index(t) for t in btag])
    Bv = body.vertices
    sk = Skeleton()
    sk.add('hips', None, [0, HIP_Y, 0])
    waist = np.array([0, HIP_Y + 0.13, 0])
    sk.add('torso', 'hips', waist)
    nk = to_game(np.array([[-2.35, 37.0, -6.4]]))[0]
    sk.add('head', 'torso', nk)
    neck = nk
    side_of = np.sign(to_body(V[used])[:, 0] + 0.0)  # + = Cellos vänster
    shield_v = np.isin(btag, ['wood', 'iron', 'boss'])
    hc = to_game(hands_c)
    # Lederna (spelets enheter): ungefärliga startvärden, mätta på skulpturen, som sedan förfinas
    # med gränserna mellan etiketterna. Händerna kommer från målningen (där greppet sitter).
    J = {
        'R': [np.array([-0.18, 1.33, -0.03]), np.array([-0.235, 1.11, 0.04]), np.array([-0.15, 1.0, 0.2]), hc[0]],
        'L': [np.array([0.18, 1.33, -0.02]), np.array([0.225, 1.10, 0.06]), np.array([0.11, 1.0, 0.25]), hc[1]],
    }
    names = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR']
    head_v = (btag == 'hair') | (btag == 'band') | ((btag == 'skin') & (Bv[:, 1] > neck[1] - 0.02))
    def label(J):
        cost = np.full((len(Bv), len(names)), 9.0)
        cost[:, 0] = column_cost(Bv, 0.4, HIP_Y + 0.12, 0.2, 0.16, 0, 0.0, ry=0.05)
        cost[:, 1] = column_cost(Bv, HIP_Y + 0.12, neck[1], 0.165, 0.13, 0, -0.02, ry=0.05)
        for k, nm in [(3, 'L'), (5, 'R')]:
            sh_, el_, wr_, ha_ = J[nm]
            cost[:, k] = capsule_cost(Bv, [(sh_, el_)], 0.085)
            tip = ha_ + (ha_ - wr_) / max(np.linalg.norm(ha_ - wr_), 1e-6) * 0.05
            cost[:, k + 1] = capsule_cost(Bv, [(el_, wr_), (wr_, tip)], 0.055)
        lab = cost.argmin(1)
        lab[head_v] = 2
        lab[shield_v] = 4
        lab = majority(body, lab, len(names), iters=3, fixed=head_v | shield_v)
        def fb(idx):
            return np.where(Bv[idx, 1] < HIP_Y + 0.12, 0, 1)
        lab = keep_largest(body, lab, [[3, 4], [5, 6]], fb)
        return lab
    for it in range(3):
        lab0 = label(J)
        for k, nm in [(3, 'L'), (5, 'R')]:
            el = boundary_point(body, lab0, k, k + 1)
            if el is not None and nm == 'R':
                J[nm][1] = 0.5 * J[nm][1] + 0.5 * el
    # Vänster armbåge döljs av skölden: spegla den högra
    elR = J['R'][1]
    J['L'][1] = np.array([-elR[0] - 0.01, elR[1] - 0.01, elR[2] + 0.02])
    for nm in ['L', 'R']:
        sh_, el_, wr_, ha_ = J[nm]
        sk.add('arm' + nm, 'torso', sh_, toward=el_)
        sk.add('elbow' + nm, 'arm' + nm, el_, toward=wr_)
    for nm in ['L', 'R']:
        sk.add('hand' + nm, 'elbow' + nm, J[nm][3])
    I = {b['name']: i for i, b in enumerate(sk.bones)}
    lab0 = label(J)
    lab = np.array([I[names[k]] for k in lab0])
    lab[shield_v] = I['elbowL']
    body, keepv = cut_bridges(body, lab, sk)
    lab = lab[keepv]; reg = reg[keepv]; shield_v = shield_v[keepv]
    # Händerna vilar mot bältet i skulpturen: lås dem helt till underarmen, annars drar höften i fingrarna
    Bv2 = body.vertices
    hand_v = np.zeros(len(Bv2), bool)
    for nm in ['L', 'R']:
        hand_v |= (lab == I['elbow' + nm]) & (np.linalg.norm(Bv2 - J[nm][3], axis=1) < 0.1)
    locked = (lab == I['head']) | shield_v | hand_v
    bidx, bw = skin(body, lab, len(sk.bones), iters=5, locked=locked)
    out['body'] = dict(mesh=body, regions=reg, names=BODY_REGIONS, skel=sk, bidx=bidx, bw=bw, shade=shade(body), joints=J, lab=lab)
    # --- Svärdet: i en egen ram där greppet ligger i origo och bladet pekar längs −Y ---
    used, fsw = sub(fs_sword)
    Sv = G[used]
    stag = tag[used]; stag[~np.isin(stag, SWORD_REGIONS)] = 'grip'
    axis = to_body(np.array([bu]))[0] - to_body(np.array([[0, 0, 0]]))[0]; axis /= np.linalg.norm(axis)
    pommel = to_game(np.array([bc + bu * -23.5]))[0]
    guard = to_game(np.array([bc + bu * -13.0]))[0]
    # bladets tjockleksriktning ska ligga längs X i svärdets ram
    thick = to_body(np.array([[-0.77, 0.026, 0.637]]))[0] - to_body(np.array([[0, 0, 0]]))[0]
    yax = -axis
    xax = thick - yax * (thick @ yax); xax /= np.linalg.norm(xax)
    zax = np.cross(xax, yax)
    Rm = np.stack([xax, yax, zax])           # rader: världens riktningar i svärdets ram
    hand_on_grip = guard + (pommel - guard) * 0.45
    L = (Sv - hand_on_grip) @ Rm.T
    keep = (L[fsw][:, :, 1] < -0.06).all(1)
    fsw = fsw[keep]
    usedk = np.unique(fsw); rm = -np.ones(len(L), int); rm[usedk] = np.arange(len(usedk))
    L = L[usedk]; fsw = rm[fsw]; stag = stag[usedk]
    # Delas i parerstången och bladet (bladet kortas när svärdet går sönder). Bladets topp i origo.
    cutY = -0.135
    fc = L[fsw][:, :, 1].mean(1)
    for part, fm in [('guard', fc >= cutY), ('blade', fc < cutY)]:
        f = fsw[fm]
        u = np.unique(f); rm2 = -np.ones(len(L), int); rm2[u] = np.arange(len(u))
        P = L[u].copy()
        if part == 'blade':
            P[:, 1] -= cutY
        mm = trimesh.Trimesh(P, rm2[f], process=False)
        out['sword' + part] = dict(mesh=mm, regions=np.array([SWORD_REGIONS.index(t) for t in stag[u]]), names=SWORD_REGIONS, shade=shade(mm), cut=cutY)
    # Spegla allt i X. I skulpturen bär Cello skölden på vänster arm (+X) och svärdet i höger hand, men
    # spelets rörelsekod (och de byggda figurerna) har sköldarmen (armL) på −X och svärdsarmen (armR) på +X,
    # som en vänsterhänt Link. Speglingen behåller namnen: armL blir sköldarmen på −X.
    MIR = np.diag([-1.0, 1, 1])
    for k in ['body', 'swordguard', 'swordblade']:
        d = out[k]
        mm = d['mesh']
        d['mesh'] = trimesh.Trimesh(mm.vertices * [-1, 1, 1], mm.faces[:, ::-1], process=False)
        d['shade'] = shade(d['mesh'])
    for b in sk.bones:
        b['pos'] = b['pos'] * [-1, 1, 1]
        b['R'] = MIR @ b['R'] @ MIR
    out['body']['joints'] = {k: [p * [-1, 1, 1] for p in v] for k, v in J.items()}
    return out

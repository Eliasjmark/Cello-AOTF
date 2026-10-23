# Speglar på block: skjut blocken så att strålen från fönstret (väster, rad RW, österut) når ögat (norr, kolumn CE)
import collections, random, sys, json
W, H = 9, 7
DIRS = {'E': (1, 0), 'W': (-1, 0), 'N': (0, -1), 'S': (0, 1)}
TURN = {1: {'E': 'N', 'N': 'E', 'W': 'S', 'S': 'W'}, 3: {'E': 'S', 'S': 'E', 'N': 'W', 'W': 'N'}}

def beam(walls, mirrors, stones, RW, CE):
    c, r, d = -1, RW, 'E'
    path = []
    for _ in range(80):
        dx, dy = DIRS[d]
        c, r = c + dx, r + dy
        if not (0 <= c < W and 0 <= r < H):
            return (d == 'N' and r == -1 and c == CE), path
        if (c, r) in walls or (c, r) in stones:
            return False, path
        path.append((c, r))
        if (c, r) in mirrors:
            d = TURN[mirrors[(c, r)]][d]
    return False, path

def reach(start, walls, occ):
    seen = {start}; q = collections.deque([start])
    while q:
        c = q.popleft()
        for d in DIRS.values():
            n = (c[0] + d[0], c[1] + d[1])
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in walls and n not in occ and n not in seen:
                seen.add(n); q.append(n)
    return seen

def solve(walls, mirrors, stones, start, RW, CE, maxn=300000, want_path=False):
    # mirrors: dict pos->type ; tillstånd: (frozenset((pos,type)), frozenset(stones), normaliserad spelarplats)
    m0 = frozenset(mirrors.items()); s0 = frozenset(stones)
    occ0 = set(mirrors) | set(stones)
    r0 = reach(start, walls, occ0)
    key0 = (m0, s0, min(r0))
    par = {key0: None}
    q = collections.deque([(m0, s0, r0)])
    while q:
        m, s, r = q.popleft()
        k = (m, s, min(r))
        ok, _ = beam(walls, dict(m), s, RW, CE)
        if ok:
            if not want_path:
                n = 0
                while par[k]: n += 1; k = par[k][0]
                return n
            seq = []
            while par[k]: seq.append(par[k][1]); k = par[k][0]
            return seq[::-1]
        if len(par) > maxn: return None
        md = dict(m); occ = set(md) | set(s)
        for b in list(md) + list(s):
            for dname, (dx, dy) in DIRS.items():
                pp = (b[0] - dx, b[1] - dy); nb = (b[0] + dx, b[1] + dy)
                if pp not in r: continue
                if not (0 <= nb[0] < W and 0 <= nb[1] < H) or nb in walls or nb in occ: continue
                if b in md:
                    nm = dict(md); t = nm.pop(b); nm[nb] = t; nm2 = frozenset(nm.items()); ns = s
                else:
                    nm2 = m; ns = frozenset((set(s) - {b}) | {nb})
                nocc = set(dict(nm2)) | set(ns)
                nr = reach(b, walls, nocc)
                kk = (nm2, ns, min(nr))
                if kk not in par:
                    par[kk] = (k, [b[0], b[1], dx, dy]); q.append((nm2, ns, nr))
    return None

if __name__ == '__main__':
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    random.seed(seed)
    best = []
    for it in range(400):
        RW = random.randint(3, H - 1); CE = random.randint(1, W - 2)
        start = (W - 1, 3)
        cells = [(x, y) for x in range(W) for y in range(H) if (x, y) != start and (x, y) != (W - 2, 3)]
        random.shuffle(cells)
        walls = set(cells[:7])
        # fönstrets första ruta och ögats ruta måste vara fria från väggar
        if (0, RW) in walls or (CE, 0) in walls: continue
        rest = [c for c in cells[7:] if c not in walls]
        mirrors = {rest[0]: 1, rest[1]: 1, rest[2]: 3}
        stones = {rest[3]}
        if beam(walls, mirrors, stones, RW, CE)[0]: continue
        n = solve(walls, mirrors, stones, start, RW, CE, maxn=120000)
        if n and n >= 9:
            best.append((n, RW, CE, sorted(walls), sorted(mirrors.items()), sorted(stones)))
    best.sort(reverse=True)
    for b in best[:6]: print(json.dumps(b))

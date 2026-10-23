# Toppens kristall: skjut kristallen till (5,3), inga stenar får stå kvar i rad 3. Spelaren kan gå i rad 4 (utanför rutnätet).
import collections, sys, json, random
W, H = 10, 4
D = [(1, 0), (-1, 0), (0, 1), (0, -1)]
def reach(start, walls, occ):
    seen = {start}; q = collections.deque([start])
    while q:
        c = q.popleft()
        for dx, dy in D:
            n = (c[0] + dx, c[1] + dy)
            if 0 <= n[0] < W and 0 <= n[1] <= H and n not in walls and n not in occ and n not in seen:
                seen.add(n); q.append(n)
    return seen
def goal(cr, st, target):
    return cr == target and not any(y == 3 for (x, y) in st)
def solve(walls, cr, stones, target, start=(5, 4), maxn=500000, path=False):
    st0 = frozenset(stones)
    r0 = reach(start, walls, {cr} | st0)
    k0 = (cr, st0, min(r0)); par = {k0: None}; q = collections.deque([(cr, st0, r0)])
    while q:
        c, s, r = q.popleft(); k = (c, s, min(r))
        if goal(c, s, target):
            seq = []
            while par[k]: seq.append(par[k][1]); k = par[k][0]
            return seq[::-1]
        if len(par) > maxn: return None
        occ = {c} | s
        for b in [c] + list(s):
            for dx, dy in D:
                pp = (b[0] - dx, b[1] - dy); nb = (b[0] + dx, b[1] + dy)
                if pp not in r: continue
                if not (0 <= nb[0] < W and 0 <= nb[1] < H) or nb in walls or nb in occ: continue
                if b == c: nc, ns = nb, s
                else: nc, ns = c, frozenset((s - {b}) | {nb})
                nr = reach(b, walls, {nc} | ns)
                kk = (nc, ns, min(nr))
                if kk not in par: par[kk] = (k, [b[0], b[1], dx, dy]); q.append((nc, ns, nr))
    return None
if __name__ == '__main__':
    walls = {(3, 0), (7, 1), (1, 2)}
    seq = solve(walls, (1, 0), {(3, 3), (8, 3), (6, 2)}, (5, 3), path=True)
    print('hand', None if seq is None else len(seq), seq)
    best = []
    rng = random.Random(5)
    for it in range(1500):
        cells = [(x, y) for x in range(W) for y in range(H)]
        rng.shuffle(cells)
        walls = set(c for c in cells[:4] if c[1] != 3)
        free = [c for c in cells if c not in walls and c != (5, 3)]
        cr = free[0]
        stones = set(free[1:4])
        if not any(y == 3 for _, y in stones): continue
        seq = solve(walls, cr, stones, (5, 3), maxn=40000)
        if seq and len(seq) >= 12: best.append((len(seq), sorted(walls), cr, sorted(stones), seq))
    best.sort(key=lambda b: -b[0])
    for b in best[:5]: print(json.dumps(b))

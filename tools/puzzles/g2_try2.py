import collections, mirsok
W, H = mirsok.W, mirsok.H = 9, 7
RE = 1
def beam(walls, mirrors, stones, RW, CE):
    c, r, d = -1, RW, 'E'
    for _ in range(80):
        dx, dy = mirsok.DIRS[d]
        c, r = c + dx, r + dy
        if not (0 <= c < W and 0 <= r < H):
            return (d == 'E' and c == W and r == RE), None
        if (c, r) in walls or (c, r) in stones: return False, None
        if (c, r) in mirrors: d = mirsok.TURN[mirrors[(c, r)]][d]
    return False, None
def reach(start, walls, occ):
    seen = {start}; q = collections.deque([start])
    while q:
        c = q.popleft()
        for d in mirsok.DIRS.values():
            n = (c[0] + d[0], c[1] + d[1])
            if -1 <= n[0] <= W and -1 <= n[1] <= H and n not in walls and n not in occ and n not in seen:
                seen.add(n); q.append(n)
    return seen
mirsok.beam = beam; mirsok.reach = reach
import sys, json
cands = [
  ({(2,3),(4,2),(5,4),(7,3),(1,1),(3,6)}, {(1,4):1, (4,0):1}, {(6,3),(3,5)}),
  ({(2,3),(4,2),(5,4),(7,4),(0,2),(3,6)}, {(2,1):1, (5,6):1}, {(6,3),(3,5)}),
  ({(2,2),(4,3),(6,0),(7,4),(1,5),(4,6)}, {(3,1):1, (5,5):1}, {(6,2),(2,4)}),
  ({(1,3),(3,1),(4,4),(5,2),(6,5),(7,1),(2,6)}, {(2,2):1, (4,6):1}, {(6,3),(3,5),(5,0)}),
]
for walls, m, st in cands:
    seq = mirsok.solve(walls, m, st, (W, 3), 5, 0, maxn=400000, want_path=True)
    print(json.dumps([sorted(walls), sorted(m.items()), sorted(st)]), '->', None if seq is None else len(seq), seq, flush=True)

import sys, json
exec(open('g2_try2.py').read().split('import sys, json')[0])
base_w = {(1,1),(2,3),(3,6),(4,2),(5,4),(7,3)}
V = [
  (base_w | {(0,4)}, {(1,4):1, (4,0):1}, {(3,5),(6,3),(6,1)}),
  (base_w | {(0,3)}, {(1,4):1, (5,0):1}, {(3,5),(6,3),(5,1)}),
  (base_w | {(8,2)}, {(2,5):1, (4,0):1}, {(3,4),(6,3),(6,1)}),
]
k = int(sys.argv[1])
walls, m, st = V[k]
seq = mirsok.solve(walls, m, st, (W, 3), 5, 0, maxn=150000, want_path=True)
print(k, json.dumps([sorted(walls), sorted(m.items()), sorted(st)]), None if seq is None else len(seq), seq, flush=True)

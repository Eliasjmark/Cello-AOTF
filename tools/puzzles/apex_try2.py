from apex import solve
cands = [
  ({(1,0),(7,0),(3,2),(8,2)}, (8,1), {(5,2),(4,3),(7,3)}),
  ({(2,0),(7,0),(3,2),(8,2),(6,2)}, (0,1), {(5,2),(4,3),(7,3)}),
  ({(1,0),(4,1),(3,2),(8,2)}, (8,0), {(5,2),(4,3),(7,3),(5,1)}),
  ({(3,0),(7,1),(2,2),(8,2)}, (1,1), {(5,2),(4,3),(6,3),(5,0)}),
]
for walls, cr, st in cands:
    seq = solve(walls, cr, st, (5,3), maxn=300000, path=True)
    print(sorted(walls), cr, sorted(st), '->', None if seq is None else len(seq), seq, flush=True)

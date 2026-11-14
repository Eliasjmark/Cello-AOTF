# Bygger models/pack.bin av Elias skulpturer (0.13).
#   python3 tools/models/build_models.py [debug-mapp]
# Kräver: pip install trimesh fast-simplification numpy
# Källorna: tools/hero/cello-hero.stl och tools/models/src/*.ply (förenklade kopior av FBX-filerna, se dump_fbx.py)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshkit import write_model, write_pack
import hero

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

def entry(name, d):
    return (name, write_model(d['mesh'], d['regions'], d['names'], d.get('skel'), d.get('bidx'), d.get('bw'), d.get('shade')))

def main():
    entries = []
    h = hero.build()
    entries.append(entry('cello', h['body']))
    print('shield', {k: (v.round(4).tolist() if hasattr(v, 'round') else round(v, 4)) for k, v in h['shield'].items()})
    entries.append(entry('celloguard', h['swordguard']))
    entries.append(entry('celloblade', h['swordblade']))
    import people
    for name, d in people.build_all().items():
        entries.append(entry(name, d))
    out = os.path.join(ROOT, 'models', 'pack.bin')
    size = write_pack(out, entries)
    for name, blob in entries:
        print(f'{name:12s} {len(blob):8d} byte')
    print('pack.bin', size, 'byte')

if __name__ == '__main__':
    main()

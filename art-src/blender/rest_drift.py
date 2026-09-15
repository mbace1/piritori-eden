import json, struct, glob, math, os

def rests(p):
    d = open(p, 'rb').read()
    ln = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20+ln].decode('utf-8'))
    return {n['name']: n.get('rotation', [0, 0, 0, 1])
            for n in j.get('nodes', []) if n.get('name')}

def ang(a, b):
    d = abs(sum(x*y for x, y in zip(a, b)))
    return math.degrees(2*math.acos(min(1.0, d)))

ref = rests('art/v3/cast3d/muscle-v01.glb')
print('BODY-TO-BODY rest drift vs muscle-v01 (the intended clip donor):')
for b in sorted(glob.glob('art/v3/cast3d/*-v01.glb')):
    nm = os.path.basename(b)
    if nm == 'muscle-v01.glb':
        continue
    r = rests(b)
    common = [k for k in ref if k in r]
    if len(common) < 10:
        print('  %-22s only %d shared joints' % (nm, len(common)))
        continue
    worst = max(common, key=lambda k: ang(ref[k], r[k]))
    print('  %-22s joints=%2d worst=%6.1f deg at %s'
          % (nm, len(common), ang(ref[worst], r[worst]), worst))

print()
print('CLIPS vs the muscle body (top 5 joints):')
c = rests('art/v3/cast3d/clips/muscle-idle-v01.glb')
common = [k for k in ref if k in c]
for k in sorted(common, key=lambda k: -ang(ref[k], c[k]))[:5]:
    print('   %-14s %6.1f deg' % (k, ang(ref[k], c[k])))

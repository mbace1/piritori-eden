# Publish a cut-in rig to the runtime: art-src/cutins/<id>/out (cut.py's PNGs and rig.json) becomes
# art/v3/cutins/<id>-v01/*.webp plus one `cutin-<id>-rig-v01` entry in art/v3/manifest.json.
#
#   uv run --no-project --with pillow python art-src/cutins/publish.py jaska arvo
#
# The manifest is partly hand-formatted, so the entry is spliced in as text (replacing an earlier one with the
# same id) rather than re-dumping the whole file. Offline tool, like cut.py: Pillow never ships with the game.
import hashlib, io, json, os, re, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
MANIFEST = os.path.join(REPO, 'art', 'v3', 'manifest.json')
# Owner status per character. Semi-approved = the direction is accepted, the rig itself still awaits review.
META = {
  'jaska': {'source': 'art-src/concepts/people/jaska-concept-v03.jpg', 'location': 'scene-club',
            'approval': 'approved', 'review': 'Owner-approved, 2026-10-24: Jaska is already approved.'},
  'aatami': {'source': 'art-src/concepts/people/aatami-young-final-v01.png (the owner pick from GPT, PR #108)', 'location': 'any',
             'review': 'Owner review pending (PR #107). The player profile, shown when he talks (owner, 2026-10-23).'},
  'arvo': {'source': 'art-library/presenter/arvo-linde-concept-v05.png (the approved v05 presenter painting)', 'location': 'news',
           'review': 'Owner review pending (PR #107). Fictional homage, not a likeness (NARRATIVE.md).'},
}

def entry(cid):
    out = os.path.join(HERE, cid, 'out'); rig = json.load(open(os.path.join(out, 'rig.json')))
    dst_rel = f'cutins/{cid}-v01'; dst = os.path.join(REPO, 'art', 'v3', *dst_rel.split('/')); os.makedirs(dst, exist_ok=True)
    members, pivots, lids = [], {}, {}
    for p in rig['pieces']:
        im = Image.open(os.path.join(out, p['file'])).convert('RGBA')
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=90, method=6, exact=True); raw = buf.getvalue()
        name = p['name'] + '.webp'; open(os.path.join(dst, name), 'wb').write(raw)
        x, y, w, h = p['box']
        members.append({'id': f'cutin-{cid}-v01-{p["name"].replace("_", "-")}', 'part': p['name'], 'file': f'{dst_rel}/{name}',
                        'x': x, 'y': y, 'w': w, 'h': h, 'sha256': hashlib.sha256(raw).hexdigest()})
        if p.get('pivot'): pivots[p['name']] = p['pivot']
        if p.get('lid_of'): lids[p['name']] = p['lid_of']
    m = META[cid]
    return {'id': f'cutin-{cid}-rig-v01', 'kind': 'cutin-rig', 'approval_status': m.get('approval', 'semi-approved'), 'production_status': 'animated-rig',
            'review_status': m['review'], 'dimensions': rig['size'], 'format': 'webp-alpha', 'layer': 'cutin-speaker', 'era': '2003',
            'character': cid, 'location': m['location'], 'source': f'{m["source"]}, cut by art-src/cutins/cut.py',
            'baked_text': False, 'baked_ui': False, 'reduced_motion_fallback': 'rest-pose',
            'rig': {'pivots': pivots, 'lids': lids}, 'members': members}

def splice(text, ent):
    nl = '\r\n' if '\r\n' in text else '\n'
    block = '\n'.join('    ' + line for line in json.dumps(ent, indent=2, ensure_ascii=False).split('\n')).replace('\n', nl)
    start = text.find(f'{nl}    {{{nl}      "id": "{ent["id"]}"')
    if start >= 0:                                                    # replace the earlier entry, up to its closing brace
        end = text.index(f'{nl}    }}', start + 1) + len(f'{nl}    }}')
        return text[:start] + nl + block + text[end:]
    tail = re.search(r'\r?\n  \]\r?\n\}\s*$', text)                  # append to the assets array
    return text[:tail.start()] + ',' + nl + block + text[tail.start():]

text = open(MANIFEST, encoding='utf-8', newline='').read()
for cid in sys.argv[1:]:
    ent = entry(cid); text = splice(text, ent)
    print(ent['id'], len(ent['members']), 'pieces', sum(os.path.getsize(os.path.join(REPO, 'art', 'v3', *m['file'].split('/'))) for m in ent['members']) // 1024, 'KB')
json.loads(text)
open(MANIFEST, 'w', encoding='utf-8', newline='').write(text)

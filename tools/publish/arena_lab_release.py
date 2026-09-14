"""Stage the C.16.1 public cabinet from an exact, clean source checkout.

No network/upload. Only the explicit runtime allowlist is copied. Signed URLs,
raw masters and art review sheets cannot enter through a directory-wide copy.
"""
import argparse
import hashlib
import json
import posixpath
import re
from pathlib import Path
from bear_path_manifest import build


def cache_versions(data):
    versions = {}
    for name, raw in data.items():
        if not name.endswith(('.js', '.mjs', '.html', '.css')):
            continue
        for rel, token in re.findall(r'[\x27\"]([^\x27\"\s]+\.(?:js|mjs|css))\?v=(\d+)[\x27\"]', raw.decode('utf-8')):
            module = posixpath.normpath(posixpath.join(posixpath.dirname(name), rel))
            if module in versions and versions[module] != token:
                raise ValueError('Split module cache token: '+module)
            versions[module] = token
    return versions


def validate_cache_transition(data, previous):
    versions, old_versions = cache_versions(data), cache_versions(previous)
    for module, old_token in old_versions.items():
        if module in data and module in previous and data[module] != previous[module]:
            if module not in versions or versions[module] == old_token:
                raise ValueError('Changed module needs a fresh cache token: '+module)


def stage(source, deployed_manifest, output, commit, previous_cabinet=None):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Pin the tested source commit, not a branch name')
    files = json.loads((Path(__file__).with_name('arena_lab_files.json')).read_text())
    manifest = build(json.loads((source/'art/v3/manifest.json').read_text(encoding='utf-8')),
                     json.loads(deployed_manifest.read_text(encoding='utf-8')))
    data = {name: (source/name).read_bytes() for name in files}
    kit = json.loads(data['web/crew-run/assets/kallio-kit-v02.manifest.json'])
    for asset in kit['files']:
        raw = data['web/crew-run/assets/'+asset['file']]
        if len(raw) != asset['bytes'] or hashlib.sha256(raw).hexdigest() != asset['sha256']:
            raise ValueError('Scenery integrity mismatch: '+asset['file'])
    for asset in manifest['assets']:
        if asset['file'].startswith('https:'):
            continue
        raw = data['art/v3/'+asset['file']]
        if len(raw) != asset['bytes'] or hashlib.sha256(raw).hexdigest() != asset['sha256']:
            raise ValueError('Derivative integrity mismatch: '+asset['id'])
    # Check one token per module, then compare actual published bytes so a
    # line-ending-only change cannot silently reuse an immutable cached URL.
    cache_versions(data)
    if previous_cabinet is not None:
        previous = {p.relative_to(previous_cabinet).as_posix(): p.read_bytes()
                    for p in previous_cabinet.rglob('*') if p.is_file()}
        validate_cache_transition(data, previous)
    data['art/v3/manifest.json'] = (json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    entry = 'web/crew-run/?release=16.1'
    release = {'build':'C.16.1','source_repository':'mbace1/piritori-eden',
               'source_commit':commit,'entry':entry,'status':'connected-crew-pilot',
               'character_provider':'neutral stand-ins','physical_devices_verified':False,
               'transforms':['Scope runtime art register; preserve immutable fighter URLs'],
               'sha256':{name:hashlib.sha256(raw).hexdigest() for name,raw in sorted(data.items())}}
    data['release.json'] = (json.dumps(release,indent=2)+'\n').encode()
    data['index.html'] = ('<!doctype html><meta charset="utf-8"><title>Piritori C.16.1</title>'
                          f'<meta http-equiv="refresh" content="0;url={entry}"><a href="{entry}">Open arena</a>\n').encode()
    data['VERSIONS.md'] = (f'# C.16.1 — Night Shift crew pilot\n\nSource: {commit}.\n\n'
        'Controller navigation continues in static planning screens, equipment dialogs and the crew drawer. Exact source bytes and renewed module URLs repair the C.16 cache transition. Wet Courtyard surfaces, reflections and gun camera retained. '
        '2/6/12-person neutral fixtures; campaign rules and character gates unchanged. '
        'Pixel/iPad acceptance remains pending.\n\n'
        '## Port\n\nGodot: reproduce C.16.1 wet surfaces, shoulder-side gun composition, preview/confirm/cancel, reduced-motion behavior and exact planning-view return. Preserve C.12 vectors; invalidate projected labels '
        'on camera, actor, text or viewport changes. Campaign keeps its authored resolver.\n').encode()
    # A new directory prevents stale files from an older, broader cabinet leaking.
    output.mkdir(parents=True,exist_ok=False)
    for name, raw in data.items():
        path=output/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
    return release


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[2])
    p.add_argument('--deployed-manifest',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--commit',required=True)
    p.add_argument('--previous-cabinet',type=Path,help='Current published cabinet for the cache-transition gate')
    a=p.parse_args();r=stage(a.source.resolve(),a.deployed_manifest,a.output,a.commit,a.previous_cabinet)
    print(json.dumps({'build':r['build'],'files':len(r['sha256']),'source_commit':r['source_commit']}))

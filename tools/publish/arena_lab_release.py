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
        for rel, token in re.findall(r'[\x27\"]([^\x27\"\s]+\.(?:js|mjs|css))(?:\?v=(\d+))?[\x27\"]', raw.decode('utf-8')):
            module = posixpath.normpath(posixpath.join(posixpath.dirname(name), rel))
            if module in versions and versions[module] != token:
                raise ValueError('Split module cache token: '+module)
            versions[module] = token
    return versions


def validate_cache_transition(data, previous):
    versions, old_versions = cache_versions(data), cache_versions(previous)
    for module, raw in data.items():
        if module.endswith(('.js', '.mjs', '.css')) and module in previous and raw != previous[module]:
            if not versions.get(module) or versions[module] == old_versions.get(module):
                raise ValueError('Changed module needs a fresh cache token: '+module)


def read_previous_cabinet(previous_cabinet):
    if not previous_cabinet.is_dir() or not (previous_cabinet/'release.json').is_file():
        raise ValueError('Previous cabinet must contain its published release.json')
    receipt = json.loads((previous_cabinet/'release.json').read_text(encoding='utf-8'))
    hashes = receipt.get('sha256', {})
    if not hashes or 'web/crew-run/index.html' not in hashes or 'web/fight-module/main.js' not in hashes:
        raise ValueError('Previous cabinet receipt is missing the crew runtime')
    previous = {}
    for name, expected in hashes.items():
        path = (previous_cabinet/name).resolve()
        if not path.is_relative_to(previous_cabinet.resolve()) or not path.is_file():
            raise ValueError('Missing previous cabinet file: '+name)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Previous cabinet hash mismatch: '+name)
        previous[name] = raw
    return previous


def build_identity(data):
    html = data['web/crew-run/index.html'].decode('utf-8')
    patterns = [r'<title>Piritori · Night Shift (C\.\d+(?:\.\d+)*)</title>',
                r'<h1>NIGHT SHIFT <span>(C\.\d+(?:\.\d+)*)</span></h1>',
                r'<summary>About this build / test fixtures</summary><p>(C\.\d+(?:\.\d+)*) —']
    markers = [re.search(pattern, html) for pattern in patterns]
    if not all(markers) or len({m.group(1) for m in markers}) != 1:
        raise ValueError('Title, header and About must agree on release identity')
    return markers[0].group(1)


def finalize_receipt(data, release):
    """Cover generated index and VERSIONS too; never hash the receipt itself."""
    if 'release.json' in data:
        raise ValueError('Receipt must be finalized exactly once')
    release['tested_source_head'] = release['source_commit']
    release['sha256'] = {name: hashlib.sha256(raw).hexdigest() for name, raw in sorted(data.items())}
    data['release.json'] = (json.dumps(release, indent=2)+'\n').encode()


def stage(source, deployed_manifest, output, commit, previous_cabinet):
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
    validate_cache_transition(data, read_previous_cabinet(previous_cabinet))
    data['art/v3/manifest.json'] = (json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    identity = build_identity(data)
    entry = 'web/crew-run/?campaign=1&release='+identity.removeprefix('C.')
    release = {'build':identity,'source_repository':'mbace1/piritori-eden',
               'source_commit':commit,'entry':entry,'status':'connected-crew-pilot',
               'character_provider':'neutral stand-ins','physical_devices_verified':False,
               'transforms':['Scope runtime art register; preserve immutable fighter URLs'],
               'sha256':{name:hashlib.sha256(raw).hexdigest() for name,raw in sorted(data.items())}}

    data['index.html'] = (f'<!doctype html><meta charset="utf-8"><title>Piritori {identity}</title>'
                          f'<meta http-equiv="refresh" content="0;url={entry}"><a href="{entry}">Open arena</a>\n').encode()
    data['VERSIONS.md'] = (f'# {identity} — Night Shift\n\nSource head: {commit}.\nTested source head: {commit}.\n\n'
        'Focused fighter labels, full statistics in VIEW, selected/target rings, labelled south exit, and honest rescue guidance. '
        'Enemy plans, action costs, rules, campaign settlement and procedural characters remain unchanged. '
        'Physical Pixel/iPad and owner visual acceptance remain pending.\n\n'
        '## Port\n\nGodot: reproduce focused/full label inspection without state changes; selected/target rings, '
        'rescue state and south-edge extraction cue. Invalidate projected labels after text, camera or viewport changes. '
        'Preserve all existing mission/result vectors. This release does not implement the Godot presentation port.\n').encode()
    finalize_receipt(data, release)
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
    p.add_argument('--previous-cabinet',type=Path,required=True,help='Current published cabinet for the cache-transition gate')
    a=p.parse_args();r=stage(a.source.resolve(),a.deployed_manifest,a.output,a.commit,a.previous_cabinet)
    print(json.dumps({'build':r['build'],'files':len(r['sha256']),'source_commit':r['source_commit']}))

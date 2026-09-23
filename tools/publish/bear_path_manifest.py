"""Build the hub's scoped art register without losing its pinned fighter URLs.

Read-only unless --output is explicitly supplied. No uploads, network or promotion.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
import re

FIGHTERS = ('cast3d-f01-heavy-bruiser-v05', 'cast3d-f02-wiry-skirmisher-v05')
ENVIRONMENT = ('prop-karhupuisto-bear-v01', 'surface-karhupuisto-gravel-v01')

def build(source, deployed):
    def index(manifest):
        rows = manifest['assets']
        by_id = {row['id']: row for row in rows}
        if len(rows) != len(by_id):
            raise ValueError('Duplicate runtime asset ID')
        return by_id
    src, old = index(source), index(deployed)
    assets = []
    for id in FIGHTERS:
        asset, previous = src[id], old[id]
        for field in ('sha256', 'bytes'):
            if asset[field] != previous[field]:
                raise ValueError(f'{id}: fighter identity changed; verify a new published mapping before deployment')
        url = urlparse(previous['file'])
        if url.scheme != 'https' or url.netloc != 'raw.githubusercontent.com' or url.query or url.fragment:
            raise ValueError(f'{id}: expected immutable public source URL')
        if not re.match(r'^/mbace1/piritori-eden/[a-f0-9]{40}/.+\.glb$', url.path):
            raise ValueError(f'{id}: fighter URL must pin a Piritori commit')
        assets.append({**asset, 'file': previous['file']})
    for id in ENVIRONMENT:
        asset = src[id]
        if not asset['file'].startswith('environment3d/') or '..' in asset['file'] or '://' in asset['file']:
            raise ValueError(f'{id}: expected a local environment derivative')
        if not re.fullmatch('[a-f0-9]{64}', asset['sha256']) or not isinstance(asset['bytes'], int) or asset['bytes'] <= 0:
            raise ValueError(f'{id}: missing derivative integrity data')
        assets.append(dict(asset))
    return {'schema_version': source['schema_version'], 'assets': assets}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('deployed', type=Path, help='Previously published hub art register')
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[2] / 'art/v3/manifest.json')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = json.dumps(build(json.loads(args.source.read_text(encoding='utf-8')), json.loads(args.deployed.read_text(encoding='utf-8'))), ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result, encoding='utf-8')
    else:
        print(result, end='')

#!/usr/bin/env python3
"""Pack approved transparent ImageGen atlases; no artwork is redrawn here.

python scripts/build-enemy-art-v24.py --source-map /path/to/sources.json
The JSON array contains {storyId, path, ids:[cell0, cell1, ...]} for nine 2x2
story atlases and one 3x3 human-opponents atlas. Source PNGs are authoring
masters and are deliberately excluded from the small playable patch.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-map', type=Path, required=True)
args = parser.parse_args()
sources = json.loads(args.source_map.read_text())
briefs = json.loads((ROOT / 'scripts/battle-art/briefs-v24.json').read_text())
active = {row['id']: row for row in briefs}
assert len(active) == 36, 'Exactly 36 authored additions are expected.'
entries = []
sha = lambda data: hashlib.sha256(data).hexdigest()
for source in sources:
    story = source['storyId']
    assert story == 'human-opponents' or any(row['storyId'] == story for row in briefs)
    cells = 3 if story == 'human-opponents' else 2
    assert len(source['ids']) == cells * cells
    raw = Path(source['path']).read_bytes()
    im = Image.open(source['path']).convert('RGBA')
    assert im.width == im.height, 'Square-cell crop requires a square source.'
    assert im.getchannel('A').getextrema()[0] == 0, 'A real transparent background is required.'
    im = im.resize((320 * cells, 320 * cells), Image.Resampling.NEAREST)
    relative = f'public/game/art/enemies/{story}-v24.webp'
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    im.save(destination, 'WEBP', quality=86, method=6, exact=True)
    actual = destination.read_bytes()
    cell_entries = []
    for index, enemy_id in enumerate(source['ids']):
        if enemy_id not in active:
            continue
        box = ((index % cells) * 320, (index // cells) * 320, (index % cells + 1) * 320, (index // cells + 1) * 320)
        alpha = im.crop(box).getchannel('A')
        bounds = alpha.point(lambda a: 255 if a > 16 else 0).getbbox()
        assert bounds, f'Empty active cell: {enemy_id}'
        cell_entries.append({'id': enemy_id, 'name': active[enemy_id]['enemyName'], 'index': index, 'alphaBounds': list(bounds)})
    entries.append({'id': story, 'file': relative, 'width': im.width, 'height': im.height,
        'columns': cells, 'rows': cells, 'bytes': len(actual), 'sha256': sha(actual),
        'sourceSha256': sha(raw), 'reference': f'public/game/art/{story}.webp' if story != 'human-opponents' else 'public/game/art/last-train.webp',
        'cells': cell_entries})
manifest = {'version': 24, 'provenance': 'Original ImageGen illustrations using existing scene art as style reference. Not represented as hand-drawn by a human.',
    'encoding': 'WebP quality 86; nearest-neighbour proportional resize; alpha retained; 320px per square cell.',
    'activeNewEnemyCount': sum(len(row['cells']) for row in entries), 'totalBytes': sum(row['bytes'] for row in entries), 'entries': entries}
assert manifest['activeNewEnemyCount'] == 36
(ROOT / 'scripts/battle-art/manifest-v24.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'activeEnemies': manifest['activeNewEnemyCount'], 'totalBytes': manifest['totalBytes'], 'atlases': [{k: row[k] for k in ['id','width','bytes']} for row in entries]}, ensure_ascii=False))

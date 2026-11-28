#!/usr/bin/env python3
"""Encode hand-edited or regenerated enemy PNG masters for the game.

Usage: python3 scripts/encode-battle-art-v23.py /path/to/masters
Input filenames: <encounter-id>.png; see scripts/battle-art/prompts-v23.json.
Requires Pillow only for asset authoring. Runtime has no Python dependency.
This script only resizes/encodes; it never draws or regenerates an illustration.
"""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source_dir', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
config = json.loads((root / 'scripts/battle-art/prompts-v23.json').read_text())
output = root / 'public/game/art/enemies'
output.mkdir(parents=True, exist_ok=True)
rows = []
for entry in config['entries']:
    source = args.source_dir / (entry['id'] + '.png')
    with Image.open(source) as original:
        image = original.convert('RGBA')
        if image.getextrema()[3][0] != 0:
            raise ValueError(f'{source.name}: transparent background required')
        image.thumbnail((384,384), Image.Resampling.LANCZOS)
        destination = output / (entry['id'] + '.webp')
        image.save(destination, 'WEBP', quality=88, method=6, exact=True)
        data = destination.read_bytes()
        rows.append(dict(id=entry['id'], file=destination.relative_to(root).as_posix(),
                         reference=f"public/game/art/{entry['ref']}.webp",
                         width=image.width, height=image.height, transparent=True,
                         bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
manifest = dict(version='23.0.0', generator='builtin image_gen (original); editable external PNG masters',
                encoding=dict(format='WebP', maxSize=384, quality=88, alphaPreserved=True),
                promptFile='scripts/battle-art/prompts-v23.json',
                totalBytes=sum(row['bytes'] for row in rows), entries=rows)
(root / 'scripts/battle-art/manifest-v23.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print(f"Encoded {len(rows)} sprites: {manifest['totalBytes']:,} bytes")

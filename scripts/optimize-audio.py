#!/usr/bin/env python3
"""Encode the project's original mono WAV masters as compact MP3 assets.

Development only: Python 3 + ffmpeg/ffprobe. The deployed game needs neither.
Usage: python scripts/optimize-audio.py [--source-dir PATH]
Run build-audio.py and build-combat-audio.py first to recreate WAV masters.
WAVs are kept by this script; cleanup-v17.mjs removes verified obsolete assets.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', default=str(ROOT / 'public/game/audio'))
args = parser.parse_args()
source = Path(args.source_dir).resolve()
destination = ROOT / 'public/game/audio'
manifest = json.loads((source / 'manifest.json').read_text())
records = []
for entry in manifest['files']:
    name = Path(entry['file']).stem
    if not all(c.isascii() and (c.isalnum() or c == '-') for c in name):
        raise ValueError('Unexpected audio filename')
    master = source / f'{name}.wav'
    output = destination / f'{name}.mp3'
    # Preserve the masters' mono / 22.05 kHz format and leave more room for
    # musical transients than the initial low-bitrate draft. Encoding happens
    # once during development, never during a player's turn.
    rate = '96k'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(master),
        '-vn', '-map_metadata', '-1', '-ac', '1', '-ar', '22050', '-codec:a', 'libmp3lame',
        '-b:a', rate, '-write_xing', '1', '-id3v2_version', '3', str(output)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_name,sample_rate,channels:format=duration,size', '-of', 'json', str(output)]))
    stream = probe['streams'][0]
    assert stream['codec_name'] == 'mp3' and stream['channels'] == 1
    data = output.read_bytes()
    records.append({**{k:v for k,v in entry.items() if k not in ('file','peak','sampleRate','channels','seconds')},
        'file': output.name, 'codec': 'mp3', 'mime': 'audio/mpeg', 'seconds': round(float(probe['format']['duration']),3),
        'sampleRate': int(stream['sample_rate']), 'channels': stream['channels'], 'bitrate': rate,
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'sourceWavBytes': master.stat().st_size, 'sourceWavSha256': hashlib.sha256(master.read_bytes()).hexdigest()})
result = {'version':17, 'provenance':'Original synthesized scores/effects encoded from project WAV masters. No third-party recordings or samples.',
    'quality':'96 kbps mono MP3 at the original 22050 Hz sample rate. Lossy delivery; not claimed to be bit-identical to WAV.',
    'delivery':'Same-origin MP3, on demand, no Supabase Storage requests.',
    'files': records}
(destination / 'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
old = sum(r['sourceWavBytes'] for r in records)
new = sum(r['bytes'] for r in records)
print(json.dumps({'files':len(records),'sourceWavBytes':old,'mp3Bytes':new,'reductionPercent':round((1-new/old)*100,2)},indent=2))

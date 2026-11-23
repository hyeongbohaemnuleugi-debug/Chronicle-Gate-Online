#!/usr/bin/env python3
"""Synthesize four original combat cues; keep the existing 35 music loops unchanged."""
from pathlib import Path
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'public/game/audio'
SR = 22050
rng = np.random.default_rng(15015)
records = []

def tone(freq, duration, decay=7):
    t = np.arange(int(duration * SR)) / SR
    envelope = np.minimum(t / .006, 1) * np.exp(-t * decay)
    return (np.sin(2*np.pi*freq*t) + .18*np.sin(2*np.pi*freq*2.01*t)) * envelope

for name, duration in [('attack', .42), ('ability', .85), ('enemy', .65), ('victory', 1.65)]:
    t = np.arange(int(duration*SR)) / SR
    signal = np.zeros(len(t))
    if name == 'attack':
        noise = rng.normal(0, 1, len(t))
        signal = .12*noise*np.exp(-t*19)*np.minimum(t/.008,1)
        signal += .6*np.sin(2*np.pi*(230*t-155*t*t))*np.exp(-t*15)*np.minimum(t/.005,1)
    elif name == 'enemy':
        signal = .45*np.sin(2*np.pi*(95*t-25*t*t))*np.exp(-t*7)*np.minimum(t/.007,1)
        signal += .1*rng.normal(0,1,len(t))*np.exp(-t*12)*np.minimum(t/.01,1)
    else:
        pitches = [330, 440, 660] if name == 'ability' else [294, 370, 440, 587]
        for i, pitch in enumerate(pitches):
            start = int(i*(.095 if name == 'ability' else .16)*SR)
            part = tone(pitch, duration-start/SR, 6 if name == 'ability' else 3.6)
            signal[start:start+len(part)] += part*.25
    edge = int(.015*SR)
    signal[:edge] *= np.linspace(0,1,edge)
    signal[-edge:] *= np.linspace(1,0,edge)
    signal *= .72 / max(float(np.max(np.abs(signal))), .001)
    target = ROOT / f'{name}.wav'
    with wave.open(str(target),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((signal*32767).astype('<i2').tobytes())
    records.append({'file':target.name,'kind':'effect','seconds':duration,'sampleRate':SR,'channels':1,'peak':.72,'addedIn':15})
manifest_path = ROOT/'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['version'] = 15
names = {r['file'] for r in records}
manifest['files'] = [r for r in manifest['files'] if r['file'] not in names] + records
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Created original attack, ability, enemy and victory cues.')

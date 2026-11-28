#!/usr/bin/env python3
"""Original, restrained horror scores for Chronicle Gate v22.1.

Python 3 + NumPy + SciPy + FFmpeg are needed only for rebuilding. The game
plays the delivered MP3 files. No samples, recordings, soundfonts, models,
third-party melodies, or network services are used.

    python scripts/build-horror-score-v22_1.py --write-score
    python scripts/build-horror-score-v22_1.py
    python scripts/build-horror-score-v22_1.py --only horror-shared-grief

The editable JSON is the actual performance schedule: seconds, note names,
instruments, dynamics, and four connected sections. --write-score explicitly
replaces it with the authored schedule below. Existing music and effects are
never overwritten. Each encoded file has half-second codec guards outside a
whole musical period. Playback must use the authored loop points.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
import wave

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
SCORE_PATH = ROOT / 'scripts/horror-score-v22_1.json'
AUDIT_PATH = ROOT / 'scripts/horror-score-audit-v22_1.json'
OUT = ROOT / 'public/game/audio'
INDEX = ROOT / 'public/game/horror-loops.js'
SR = 32000
GUARD = SR // 2
BITRATE = '48k'
VERSION = '22010'
INSTRUMENTS = {'bow', 'felt-low', 'resonance', 'breath', 'thud', 'pulse', 'friction'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seed_for(label):
    return int.from_bytes(hashlib.sha256(label.encode()).digest()[:8], 'little')


def midi(note):
    match = re.fullmatch(r'([A-G])([#b]?)(-?\d+)', note)
    if not match:
        raise ValueError(f'Invalid note {note!r}')
    letter, accidental, octave = match.groups()
    return (int(octave) + 1) * 12 + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[letter] + {'': 0, '#': 1, 'b': -1}[accidental]


def hz(note):
    return 440 * 2 ** ((midi(note) - 69) / 12)


def event(events, at, length, note, instrument, velocity):
    events.append({'atSeconds': round(at, 3), 'durationSeconds': length,
                   'note': note, 'instrument': instrument, 'velocity': velocity})


def make_score():
    tracks = []
    # A section is a change in colour over a continuous pedal, not a cheerful
    # repeated chord progression. Close seconds and unresolved fifths carry
    # uncertainty; sparse, descending motifs leave room for reading.
    harmonic = {
        'apartment': [['D2', 'A2', 'Eb3'], ['D2', 'Bb2', 'F3'], ['C2', 'G2', 'Db3'], ['D2', 'A2', 'E3']],
        'broadcast': [['E2', 'Bb2', 'B2'], ['E2', 'G2', 'F3'], ['D2', 'A2', 'Eb3'], ['E2', 'B2', 'F3']],
    }
    section_words = ['멀리 있는 소리', '벽 너머의 응답', '가까워지는 흔적', '다시 남은 빈자리']
    motifs = {
        'apartment': [(2.7, 'D3'), (8.9, 'Eb3'), (16.1, 'A2'), (22.6, 'F3'),
                      (28.7, 'Db3'), (34.2, 'C3'), (40.7, 'E3'), (45.2, 'D3')],
        'broadcast': [(3.5, 'E3'), (10.1, 'Bb2'), (15.8, 'F3'), (21.7, 'E3'),
                      (28.2, 'Eb3'), (34.8, 'D3'), (41.1, 'B2'), (46.0, 'F3')],
    }
    for theme in ['apartment', 'broadcast']:
        for state in ['ambient', 'tension', 'danger']:
            seconds = 40 if state == 'danger' else 48
            section = seconds / 4
            intensity = {'ambient': .60, 'tension': .77, 'danger': .88}[state]
            events = []
            for i, chord in enumerate(harmonic[theme]):
                start = i * section
                for j, note in enumerate(chord):
                    event(events, start - 1.8 + j * .31, section + 1.4, note, 'bow' if theme == 'apartment' else 'breath', intensity * [1, .46, .22][j])
                event(events, start + (5.9 if i % 2 else 6.7), 5.4, chord[1], 'resonance', .30 if theme == 'apartment' else .52)
                if state != 'ambient':
                    event(events, start + 2.4, 5.6, chord[2], 'friction', .31 if state == 'tension' else .43)
            for i, (at, note) in enumerate(motifs[theme]):
                event(events, at * seconds / 48, 3.7 if state == 'ambient' else 2.4,
                      note, 'felt-low' if theme == 'apartment' else 'resonance',
                      (.55 if i % 2 == 0 else .39) * (1 if state == 'ambient' else .75))
            if state == 'tension':
                # Uneven pairs separated by long gaps; no waltz, ostinato
                # arpeggio, snare backbeat, or major-key reward phrase.
                pulse_groups = [[1.4, 2.0, 6.6], [1.1, 1.72, 5.4, 8.6],
                                [.8, 1.38, 4.0, 6.8, 7.36], [1.2, 1.85, 6.1]]
                for block, offsets in enumerate(pulse_groups):
                    for i, offset in enumerate(offsets):
                        event(events, block * section + offset, 1.4, harmonic[theme][block][0],
                              'pulse', .55 if i % 2 == 0 else .31)
            if state == 'danger':
                groups = [[.3, .93, 2.1, 3.6, 4.24, 6.0, 7.3, 7.94],
                          [.2, .82, 2.0, 2.62, 4.3, 5.7, 6.32, 8.2],
                          [.1, .68, 1.9, 3.2, 3.78, 5.0, 6.3, 6.88, 8.5],
                          [.3, .93, 2.1, 3.9, 4.53, 6.1, 7.8]]
                for block, offsets in enumerate(groups):
                    for i, offset in enumerate(offsets):
                        event(events, block * section + offset, 1.0, harmonic[theme][block][0],
                              'thud' if i % 3 == 0 else 'pulse', .76 if i % 3 == 0 else .47)
                    # A deep bowed answer instead of a triumphant top line.
                    event(events, block * section + 5.0, 3.4, harmonic[theme][block][1], 'bow', .48)
            tracks.append({
                'id': f'horror-{theme}-{state}', 'seconds': seconds,
                'title': {'apartment': {'ambient': '벽 너머에 남은 숨', 'tension': '문틈이 가까워질 때', 'danger': '복도는 끝나지 않는다'},
                          'broadcast': {'ambient': '송출되지 않은 목소리', 'tension': '빨간 불 아래의 침묵', 'danger': '끊어지지 않는 송출선'}}[theme][state],
                'intent': {'ambient': '읽기를 방해하지 않는 낮은 음역과 드문 응답. 조용하지만 안전하다는 느낌은 주지 않는다.',
                           'tension': '불규칙한 저음 박동과 가까워지는 마찰음. 해결되지 않는 음정으로 경계심을 유지한다.',
                           'danger': '어두운 저음의 짧은 충격과 거친 현. 용감하거나 경쾌한 전투 선율을 쓰지 않는다.'}[state],
                'palette': theme, 'targetLufs': {'ambient': -24.5, 'tension': -23.0, 'danger': -22.0}[state],
                'pedal': 'D2' if theme == 'apartment' else 'E2',
                'airLevel': .015 if theme == 'apartment' else .024,
                'room': .39 if theme == 'apartment' else .54,
                'sections': [{'atSeconds': i * section, 'lengthSeconds': section, 'description': name} for i, name in enumerate(section_words)],
                'events': events,
            })
    for mood in ['grief', 'relief']:
        chords = ([['D2', 'A2', 'F3'], ['Bb1', 'F2', 'D3'], ['G2', 'D3', 'A3'], ['D2', 'A2', 'E3']]
                  if mood == 'grief' else [['D2', 'A2', 'E3'], ['Bb1', 'F2', 'C3'], ['G2', 'D3', 'A3'], ['D2', 'A2', 'E3']])
        notes = ([(1.9, 'F3'), (7.8, 'E3'), (14.2, 'D3'), (20.3, 'A2'), (27.0, 'D3'), (32.8, 'C3'), (39.5, 'E3'), (45.0, 'D3')]
                 if mood == 'grief' else [(3.2, 'D3'), (9.8, 'E3'), (16.4, 'F3'), (23.2, 'D3'), (30.0, 'A3'), (36.9, 'E3'), (43.0, 'D3')])
        events = []
        for i, chord in enumerate(chords):
            for j, note in enumerate(chord):
                event(events, i * 12 - 1.5 + j * .4, 13.5, note, 'bow', [.36, .25, .18][j])
        for i, (at, note) in enumerate(notes):
            event(events, at, 4.8, note, 'felt-low', .52 if i % 2 == 0 else .42)
        tracks.append({'id': 'horror-shared-' + mood, 'seconds': 48,
                       'title': '빈자리를 두고' if mood == 'grief' else '아직 닫히지 않은 밤',
                       'intent': '낮은 피아노와 현의 긴 쉼. 죽음 이후의 상실을 차분하게 남긴다.' if mood == 'grief' else '위험이 잠시 물러난 안도. 단조의 여운과 미해결음을 유지하며 환호하지 않는다.',
                       'palette': 'grief' if mood == 'grief' else 'relief', 'targetLufs': -25.0 if mood == 'grief' else -24.8,
                       'pedal': 'D2', 'airLevel': .007, 'room': .48,
                       'sections': [{'atSeconds': i * 12, 'lengthSeconds': 12, 'description': word} for i, word in enumerate(['남은 자리', '이름을 기억하기', '멈춘 발걸음', '다음 장을 기다리며'])],
                       'events': events})
    return {'version': '22.1.0', 'audioVersion': VERSION, 'sampleRate': SR,
            'provenance': 'Original equation-based instruments and authored notes. No recordings, sampled voices, external music, soundfonts, or generative music service.',
            'delivery': {'codec': 'MP3', 'bitrate': BITRATE, 'channels': 1, 'guardSeconds': .5, 'peakCeilingDbtp': -3.0},
            'tracks': tracks}


def env(t, duration, attack, release):
    return np.sin(np.minimum(t / attack, 1) * np.pi / 2) ** 2 * np.cos(np.clip((t - duration) / release, 0, 1) * np.pi / 2) ** 2


def noise(rng, n, low, high):
    return signal.sosfilt(signal.butter(2, [low, high], btype='bandpass', fs=SR, output='sos'), rng.standard_normal(n))


def instrument(kind, note, duration, velocity, seed):
    rng = np.random.default_rng(seed)
    release = 2.8 if kind in {'bow', 'breath', 'resonance'} else 2.0 if kind == 'felt-low' else .8
    n = int((duration + release) * SR)
    t = np.arange(n) / SR
    f = hz(note)
    out = np.zeros(n)
    if kind == 'bow':
        # Quiet bow friction and independent strings: a dark, slowly moving
        # ensemble, not an electric lead or a bright orchestral attack.
        vibrato = .0011 * np.sin(2 * np.pi * 3.2 * t) + .0009 * np.sin(2 * np.pi * .43 * t)
        phase = 2 * np.pi * f * np.cumsum(1 + vibrato) / SR
        for h in range(1, 13):
            if f * h > 2600:
                break
            gain = h ** -1.65 * (1 + .17 * np.cos(h * 1.7))
            out += gain * (np.sin(phase * h) + .30 * np.sin(phase * h * 1.0011 + .22 * h))
        out += .14 * noise(rng, n, 140, 1900)
        out *= env(t, duration, 1.9, release) * (.89 + .11 * np.sin(2 * np.pi * .29 * t))
        level = .14
    elif kind == 'felt-low':
        phase = 2 * np.pi * f * t
        for h in range(1, 10):
            partial = h * math.sqrt(1 + .00035 * h * h)
            decay = 2.3 / (1 + .23 * h)
            out += (np.sin(phase * partial) + .23 * np.sin(phase * partial * 1.0008 + .12)) * np.exp(-t / decay) / h ** 1.92
        out += .025 * noise(rng, n, 300, 1800) * np.exp(-t * 55)
        out *= env(t, duration, .016, release)
        level = .23
    elif kind == 'resonance':
        # Inharmonic, muffled metal; a slow attack removes a bell-like jingle.
        for i, ratio in enumerate([1, 1.414, 2.72, 4.12, 6.23]):
            out += [1, .28, .13, .05, .017][i] * np.sin(2 * np.pi * f * ratio * t + .04 * np.sin(2 * np.pi * .7 * t)) * np.exp(-t / (3.4 / (1 + .36 * i)))
        out *= env(t, duration, .12, release)
        level = .17
    elif kind == 'breath':
        for h, gain in [(1, 1), (2, .28), (3, .07), (5, .035)]:
            out += gain * np.sin(2 * np.pi * f * h * t + .18 * np.sin(2 * np.pi * .19 * t))
        band = noise(rng, n, 75, 1050)
        out += .35 * band
        out *= env(t, duration, 2.6, release) * (.88 + .12 * np.sin(2 * np.pi * .24 * t + .3))
        level = .13
    elif kind == 'friction':
        out = noise(rng, n, 240, 2100)
        for h in [1, 2, 4]:
            out += .08 / h * np.sin(2 * np.pi * f * h * t + .23 * np.sin(2 * np.pi * .8 * t))
        out *= env(t, duration, 1.3, release) * (.78 + .22 * np.sin(2 * np.pi * 1.3 * t))
        level = .13
    elif kind in {'thud', 'pulse'}:
        base = f * .77 if kind == 'thud' else f
        phase = 2 * np.pi * (base * t + 13 * (1 - np.exp(-t * 9)) / 9)
        out = (np.sin(phase) + .22 * np.sin(phase * 1.97)) * np.exp(-t * (5.8 if kind == 'thud' else 4.3))
        if kind == 'thud':
            out += .11 * noise(rng, n, 70, 700) * np.exp(-t * 8)
        out *= env(t, duration, .028, release)
        level = .25 if kind == 'thud' else .21
    else:
        raise ValueError(kind)
    return out * level * velocity ** 1.1


def circular_add(target, sound, start):
    start %= len(target)
    offset = 0
    while offset < len(sound):
        count = min(len(target) - start, len(sound) - offset)
        target[start:start + count] += sound[offset:offset + count]
        offset += count
        start = 0


def atmosphere(track, n):
    """Periodic source beds have no fresh-noise boundary or oscillator reset."""
    rng = np.random.default_rng(seed_for(track['id'] + '-air'))
    freq = np.fft.rfftfreq(n, 1 / SR)
    raw = rng.standard_normal(n)
    high = 1200 if track['palette'] == 'broadcast' else 1900
    shape = (freq / (freq + 90)) ** 2 / (1 + (freq / high) ** 4) / np.sqrt(np.maximum(freq, 80))
    bed = np.fft.irfft(np.fft.rfft(raw) * shape, n)
    bed /= max(np.sqrt(np.mean(bed * bed)), 1e-9)
    phase = np.arange(n) / n * 2 * np.pi
    bed *= track['airLevel'] * (.72 + .17 * np.sin(phase * 3 - .4) + .11 * np.sin(phase * 7 + .6))
    # A pedal and its imperfect companion sustain a floor during silence in
    # the notes. Pitch is snapped by less than .013 Hz to the whole period.
    fundamental = round(hz(track['pedal']) * n / SR)
    pedal = .026 * np.sin(phase * fundamental) + .009 * np.sin(phase * (fundamental * 2 + 1))
    pedal *= .84 + .16 * np.cos(phase * 2 + .7)
    if track['palette'] == 'broadcast':
        carrier = round(177.7 * n / SR)
        interference = np.sin(phase * carrier + .33 * np.sin(phase * 11))
        interference += .19 * np.sin(phase * (carrier + 7))
        bed += interference * .008 * (.55 + .45 * np.sin(phase * 3) ** 2)
    return bed + pedal


def render(track):
    n = round(track['seconds'] * SR)
    result = atmosphere(track, n)
    for i, row in enumerate(track['events']):
        tone = instrument(row['instrument'], row['note'], row['durationSeconds'], row['velocity'], seed_for(track['id'] + str(i)))
        circular_add(result, tone, round(row['atSeconds'] * SR))
    # Circular, darkened room: notes late in the written period leave their
    # actual tail at the next beginning. There is no artificial silence fade.
    tail = np.zeros(n)
    for seconds, level in [(.037, .25), (.061, .22), (.113, .18), (.191, .15), (.337, .13), (.541, .10), (.817, .08), (1.237, .055), (1.731, .035), (2.113, .018)]:
        tail += np.roll(result, round(seconds * SR)) * level
    freq = np.fft.rfftfreq(n, 1 / SR)
    tail = np.fft.irfft(np.fft.rfft(tail) / (1 + (freq / 1700) ** 4), n)
    result += track['room'] * tail
    result = np.fft.irfft(np.fft.rfft(result) * (freq ** 2 / (freq ** 2 + 32 ** 2)) / (1 + (freq / 5000) ** 8), n)
    peak = float(np.max(np.abs(result)))
    assert np.isfinite(result).all() and peak > .001
    return result * .56 / peak


def write_wave(path, samples):
    assert np.isfinite(samples).all() and np.max(np.abs(samples)) < 1
    with wave.open(str(path), 'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SR)
        stream.writeframes(np.round(samples * 32767).astype('<i2').tobytes())


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', *args], capture_output=True, check=True)


def loudness(path):
    result = ffmpeg('-i', str(path), '-af', 'loudnorm=I=-24:TP=-3:LRA=9:print_format=json', '-f', 'null', '-')
    matches = re.findall(r'\{\s*"input_i"[\s\S]*?\}', result.stderr.decode(errors='replace'))
    data = json.loads(matches[-1])
    return {'integratedLufs': float(data['input_i']), 'truePeakDbtp': float(data['input_tp']), 'loudnessRangeLu': float(data['input_lra'])}


def decode(path):
    result = ffmpeg('-v', 'error', '-i', str(path), '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1', '-ar', str(SR), '-')
    return np.frombuffer(result.stdout, dtype='<f4').astype(np.float64)


def db(value):
    return float(20 * math.log10(max(float(value), 1e-12)))


def boundary(samples, index=0):
    n = len(samples)
    index %= n
    left = samples[np.arange(index - SR // 10, index) % n]
    right = samples[np.arange(index, index + SR // 10) % n]
    jump = abs(samples[index] - samples[(index - 1) % n])
    second = abs(samples[index] - 2 * samples[(index - 1) % n] + samples[(index - 2) % n])
    return {'sampleJumpDbfs': round(db(jump), 4),
            'jumpTo99thStepRatio': round(float(jump / max(np.percentile(np.abs(np.diff(samples)), 99), 1e-12)), 5),
            'secondDifferenceTo99thRatio': round(float(second / max(np.percentile(np.abs(np.diff(samples, n=2)), 99), 1e-12)), 5),
            'edge100msRmsDifferenceDb': round(abs(db(np.sqrt(np.mean(left ** 2))) - db(np.sqrt(np.mean(right ** 2)))), 4)}


def choose_origins(samples):
    width = SR // 10
    candidates = np.arange(SR // 2, min(len(samples) - width - 2, SR * 4), 7, dtype=int)
    power = np.r_[0, np.cumsum(samples * samples)]
    left = np.sqrt(np.maximum((power[candidates] - power[candidates - width]) / width, 1e-20))
    right = np.sqrt(np.maximum((power[candidates + width] - power[candidates]) / width, 1e-20))
    step = np.abs(samples[candidates] - samples[candidates - 1]) / max(np.percentile(np.abs(np.diff(samples)), 99), 1e-12)
    curve = np.abs(samples[candidates] - 2 * samples[candidates - 1] + samples[candidates - 2]) / max(np.percentile(np.abs(np.diff(samples, n=2)), 99), 1e-12)
    cost = np.abs(20 * np.log10(left / right)) + step * 4 + curve * .5
    ordered = candidates[np.argsort(cost)]
    chosen = []
    for index in ordered:
        if all(abs(int(index) - old) > 640 for old in chosen):
            chosen.append(int(index))
        if len(chosen) == 10:
            break
    return chosen


def encode(track, work, masters):
    original = render(track)
    raw_path = work / 'original.wav'
    write_wave(raw_path, original)
    raw_loudness = loudness(raw_path)
    gain_db = min(track['targetLufs'] - raw_loudness['integratedLufs'], -3.3 - raw_loudness['truePeakDbtp'])
    original *= 10 ** (gain_db / 20)
    original_edge = boundary(original)
    output = OUT / (track['id'] + '.mp3')
    attempts = []
    for phase in choose_origins(original):
        core = np.roll(original, -phase)
        guarded = np.concatenate((core[-GUARD:], core, core[:GUARD]))
        master = work / (track['id'] + '.wav')
        write_wave(master, guarded)
        ffmpeg('-v', 'error', '-y', '-i', str(master), '-map_metadata', '-1',
               '-c:a', 'libmp3lame', '-b:a', BITRATE, '-write_xing', '1', '-id3v2_version', '3', str(output))
        decoded = decode(output)
        assert len(decoded) == len(guarded), (track['id'], len(decoded), len(guarded))
        repeated = decoded[GUARD:GUARD + len(core)]
        metric = boundary(repeated)
        attempts.append({'phaseOffsetFrames': phase, **metric})
        if metric['jumpTo99thStepRatio'] < .30 and metric['edge100msRmsDifferenceDb'] < .70 and metric['secondDifferenceTo99thRatio'] < 1.5:
            break
    else:
        raise AssertionError((track['id'], 'No smooth compressed seam', attempts))
    measured_loudness = loudness(output)
    assert measured_loudness['truePeakDbtp'] <= -2.0, measured_loudness
    assert abs(measured_loudness['integratedLufs'] - track['targetLufs']) < .7, measured_loudness
    assert np.isfinite(decoded).all() and np.max(np.abs(decoded)) < 1
    if masters:
        masters.mkdir(parents=True, exist_ok=True)
        write_wave(masters / (track['id'] + '.wav'), guarded)
    widths = SR // 100
    block_rms = np.sqrt(np.mean(repeated[:len(repeated) // widths * widths].reshape(-1, widths) ** 2, axis=1))
    # Separate encoded silence/edge errors from written dynamic space.
    longest = current = 0
    for quiet in block_rms < 10 ** (-60 / 20):
        current = current + 1 if quiet else 0
        longest = max(longest, current)
    assert longest == 0, (track['id'], 'Unintended silence', longest)
    return {'id': track['id'], 'file': output.name, 'title': track['title'], 'bytes': output.stat().st_size,
            'sha256': digest(output), 'seconds': len(decoded) / SR, 'channels': 1, 'sampleRate': SR, 'bitrate': BITRATE,
            'loop': {'sampleRate': SR, 'startFrame': GUARD, 'endFrame': GUARD + len(core), 'sourceFrames': len(guarded)},
            'loopSeconds': len(core) / SR, 'phaseOffsetFrames': phase,
            'targetLufs': track['targetLufs'], 'measured': {**measured_loudness, 'rmsDbfs': round(db(np.sqrt(np.mean(repeated ** 2))), 4),
                'peakDbfs': round(db(np.max(np.abs(decoded))), 4), 'clippedSamples': int(np.sum(np.abs(decoded) >= 1)),
                'longestBelowMinus60DbMs': longest * 10, 'loopBoundary': metric, 'originalCompositionBoundaryBeforeEncoding': original_edge,
                'originalCompositionBoundaryAfterEncoding': boundary(repeated, len(core) - phase)},
            'phaseCandidatesTried': len(attempts)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-score', action='store_true')
    parser.add_argument('--only', help='Comma-separated track IDs, for local iteration. Full render is required to write the release index.')
    parser.add_argument('--masters-dir', type=Path)
    args = parser.parse_args()
    if args.write_score:
        SCORE_PATH.write_text(json.dumps(make_score(), ensure_ascii=False, indent=2) + '\n')
    score = json.loads(SCORE_PATH.read_text())
    wanted = set(args.only.split(',')) if args.only else None
    assert score['sampleRate'] == SR and score['audioVersion'] == VERSION
    assert len(score['tracks']) == 8 and len({x['id'] for x in score['tracks']}) == 8
    preserved = {p.name: digest(p) for p in OUT.glob('*.mp3') if not p.name.startswith('horror-')}
    rows = []
    with tempfile.TemporaryDirectory(prefix='chronicle-horror-score-') as directory:
        for track in score['tracks']:
            if wanted and track['id'] not in wanted:
                continue
            assert 40 <= track['seconds'] <= 56
            for row in track['events']:
                assert row['instrument'] in INSTRUMENTS and 0 < row['velocity'] <= 1
                assert -.1 * track['seconds'] <= row['atSeconds'] < track['seconds']
                assert .1 <= row['durationSeconds'] < track['seconds']
                midi(row['note'])
            report = encode(track, Path(directory), args.masters_dir)
            rows.append(report)
            print(json.dumps({'id': report['id'], 'bytes': report['bytes'], 'loopSeconds': report['loopSeconds'], 'lufs': report['measured']['integratedLufs'], 'loop': report['measured']['loopBoundary']}, ensure_ascii=False), flush=True)
    assert preserved == {p.name: digest(p) for p in OUT.glob('*.mp3') if not p.name.startswith('horror-')}
    if wanted:
        return
    assert len(rows) == 8
    index = {row['id']: row['loop'] for row in rows}
    INDEX.write_text('/** Original v22.1 horror scores. Codec guards are outside the repeated period. */\n'
                     + "export const HORROR_AUDIO_VERSION = '" + VERSION + "';\n"
                     + 'export const HORROR_LOOPS = Object.freeze(' + json.dumps(index, separators=(',', ':')) + ');\n')
    audit = {'version': '22.1.0', 'audioVersion': VERSION,
             'method': 'Deterministic synthesis, constant-gain mastering, guarded MP3 encoding, independent FFmpeg decoding and loop-boundary/energy/peak/loudness measurements. This is not a physical-device listening test.',
             'source': {'script': str(Path(__file__).relative_to(ROOT)), 'scriptSha256': digest(Path(__file__)), 'score': str(SCORE_PATH.relative_to(ROOT)), 'scoreSha256': digest(SCORE_PATH)},
             'runtimeIndex': {'file': str(INDEX.relative_to(ROOT)), 'sha256': digest(INDEX)},
             'totalBytes': sum(row['bytes'] for row in rows), 'trackCount': len(rows),
             'preservedExistingMp3': len(preserved), 'existingMp3Hashes': preserved,
             'tracks': rows}
    assert audit['totalBytes'] < 2_400_000, audit['totalBytes']
    AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'tracks': len(rows), 'bytes': audit['totalBytes'], 'existingMp3Preserved': len(preserved)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Original, restrained horror scores for Chronicle Gate v24.1.

Python 3 + NumPy + SciPy + FFmpeg are needed only for rebuilding. The game
plays the delivered MP3 files. No samples, recordings, soundfonts, models,
third-party melodies, or network services are used.

    python scripts/build-horror-score-v24_1.py --write-score
    python scripts/build-horror-score-v24_1.py
    python scripts/build-horror-score-v24_1.py --only horror-shared-grief

The editable JSON is the actual performance schedule: seconds, note names,
instruments, dynamics, and four connected sections. --write-score explicitly
replaces it with the authored schedule below. Only the eight horror files are
replaced; the other music and effects are never overwritten. Each encoded
file has half-second codec guards outside a
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
SCORE_PATH = ROOT / 'scripts/horror-score-v24_1.json'
AUDIT_PATH = ROOT / 'scripts/horror-score-audit-v24_1.json'
OUT = ROOT / 'public/game/audio'
INDEX = ROOT / 'public/game/horror-loops.js'
SR = 32000
GUARD = SR // 2
BITRATE = '48k'
VERSION = '24100'
INSTRUMENTS = {'felt-piano', 'felt-keys', 'cello', 'strings', 'organ', 'pizzicato', 'low-tom'}


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


def event(events, at, length, note, instrument, velocity, role):
    events.append({'atSeconds': round(at, 3), 'durationSeconds': round(length, 3),
                   'note': note, 'instrument': instrument, 'velocity': round(velocity, 3), 'role': role})


def make_score():
    """Sixteen written 4/4 bars in four connected phrases, not a noise bed.

    The apartment has a descending piano question and a bowed answer. The
    station answers a muted-key question with a narrow-band organ chord.
    Tempo changes only for danger; the motif remains recognisable between
    states. All tunes and voicings below were authored for this release.
    """
    tracks = []
    chords = {
        'apartment': [('D2', ['D3', 'A3', 'F3']), ('Bb2', ['D3', 'F3', 'A3']),
                      ('G2', ['D3', 'G3', 'Bb3']), ('A2', ['E3', 'G3', 'Bb3'])],
        'broadcast': [('E2', ['B2', 'E3', 'G3']), ('E2', ['Bb2', 'D3', 'F3']),
                      ('D2', ['A2', 'D3', 'F3']), ('E2', ['B2', 'E3', 'F3'])],
    }
    # Pairs are (beat within a four-bar section, note, written length in beats).
    themes = {
        'apartment': [
            [(0, 'D4', 2.6), (3, 'Eb4', 1.2), (5, 'A3', 2), (8, 'F4', 2.8), (12, 'E4', 1.3), (14, 'D4', 1.5)],
            [(0, 'D4', 2.4), (3, 'F4', 1.5), (6, 'A4', 2.3), (10, 'G4', 1.6), (13, 'F4', 2.0)],
            [(0, 'D4', 2.4), (4, 'Bb3', 1.5), (6, 'A3', 2), (9, 'G4', 2.5), (12, 'F4', 1.6), (14, 'Eb4', 1.5)],
            [(0, 'E4', 2.8), (4, 'D4', 2), (7, 'Bb3', 1.8), (10, 'A3', 2), (13, 'Eb4', 2)],
        ],
        'broadcast': [
            [(0, 'E4', 2.8), (4, 'B3', 1.4), (6, 'F4', 2), (10, 'E4', 2.8), (14, 'D4', 1.5)],
            [(0, 'F4', 2.3), (3, 'E4', 1.3), (5, 'Bb3', 2.4), (9, 'G4', 2.8), (13, 'F4', 2)],
            [(0, 'F4', 2.4), (4, 'E4', 1.4), (6, 'D4', 2), (10, 'A3', 1.8), (13, 'D4', 2)],
            [(0, 'E4', 3), (4, 'G4', 1.6), (7, 'F4', 2.4), (11, 'B3', 1.5), (14, 'F4', 1.5)],
        ],
    }
    section_names = {
        'apartment': ['빈 복도에 남긴 질문', '벽 너머에서 돌아온 응답', '계단 아래의 다른 발소리', '문 앞에서 멈춘 이름'],
        'broadcast': ['종료된 방송의 첫 음', '돌아온 신호', '송신실에 남은 흔적', '꺼지지 않은 호출등'],
    }
    titles = {
        'apartment': {'ambient': '빈 복도에 남은 이름', 'tension': '문고리가 돌아가기 전에', 'danger': '뒤돌아보지 마'},
        'broadcast': {'ambient': '종료된 방송의 첫 음', 'tension': '꺼지지 않은 호출등', 'danger': '마지막 송출까지'},
    }
    for theme in ['apartment', 'broadcast']:
        for mood in ['ambient', 'tension', 'danger']:
            seconds = 40 if mood == 'danger' else 48
            beat = seconds / 64
            section_seconds = seconds / 4
            lead = 'felt-piano' if theme == 'apartment' else 'felt-keys'
            events = []
            for section, (bass, chord) in enumerate(chords[theme]):
                start = section * section_seconds
                # Connected, quiet chord voices underpin an audible melodic
                # foreground. No wind, radio hiss, rain or stochastic layer.
                for j, note in enumerate(chord):
                    event(events, start - .42 + j * .021, section_seconds + .35,
                          note, 'strings' if theme == 'apartment' else 'organ',
                          [.28, .20, .19][j] * (1.1 if mood == 'danger' else 1), 'harmony')
                event(events, start - .18, section_seconds + .18, bass, 'cello',
                      .30 if mood == 'ambient' else .32, 'bass')
                for i, (offset, note, length) in enumerate(themes[theme][section]):
                    velocity = [.79, .64, .70, .76, .61, .68][i]
                    event(events, start + offset * beat + (.009 if i % 2 else 0),
                          length * beat, note, lead,
                          velocity if mood != 'danger' else velocity * .97, 'melody')
                # A pitched low answer after each question, not a noise swell.
                answer = chord[(section + 1) % 3]
                event(events, start + 11.7 * beat, 3.8 * beat, answer,
                      'cello' if theme == 'apartment' else 'organ', .30, 'answer')
                if mood != 'ambient':
                    # A restrained 3+3+2 grouping gives tension a pulse without
                    # turning the story into a cheerful walking bass.
                    offsets = [0, 3, 6, 8, 11, 14]
                    if mood == 'danger':
                        offsets = [0, 1.5, 3, 4.5, 6, 7, 8, 9.5, 11, 12.5, 14, 15]
                    pulse_notes = [chord[0], chord[1], chord[0], chord[2]]
                    for i, offset in enumerate(offsets):
                        event(events, start + offset * beat, .52 * beat,
                              pulse_notes[i % 4], 'pizzicato',
                              (.34 if mood == 'tension' else .42) * (1 if i % 3 == 0 else .73), 'pulse')
                    if mood == 'danger':
                        for offset in [0, 3, 8, 11, 14.5]:
                            event(events, start + offset * beat, .55, bass, 'low-tom',
                                  .45 if offset in [0, 8] else .29, 'pulse')
                        # A short, unresolved echo advances the same motif.
                        echo = themes[theme][section][0][1]
                        event(events, start + 15.1 * beat, .6 * beat, echo, lead, .44, 'melody')
            tracks.append({
                'id': f'horror-{theme}-{mood}', 'seconds': seconds, 'title': titles[theme][mood],
                'intent': {'ambient': '중음역의 짧은 선율과 낮은 현이 질문하고 응답한다. 빗소리 없이도 빈 공간의 불안을 느끼도록 쓴 음악.',
                           'tension': '앞 장면의 선율을 유지하고 끊어진 현의 박동을 더한다. 단서에 가까워질수록 해결되지 않는 음이 남는다.',
                           'danger': '같은 선율을 짧게 되받으며 낮은 북과 현의 박동으로 추격을 이끈다. 밝은 승리 음악으로 바뀌지 않는다.'}[mood],
                'palette': theme, 'targetLufs': -22.0, 'room': .31 if theme == 'apartment' else .27,
                'arrangement': {'continuousNoiseBed': False, 'noiseLayerCount': 0,
                    'leadInstrument': lead, 'key': 'D minor / Phrygian colour' if theme == 'apartment' else 'E minor / flat-second and tritone colour',
                    'bpm': 60 / beat, 'bars': 16, 'beatsPerBar': 4},
                'sections': [{'atSeconds': i * section_seconds, 'lengthSeconds': section_seconds, 'description': word}
                             for i, word in enumerate(section_names[theme])], 'events': events,
            })
    ending_chords = [('D2', ['D3', 'F3', 'A3']), ('Bb2', ['D3', 'F3', 'A3']),
                     ('G2', ['D3', 'G3', 'A3']), ('A2', ['E3', 'G3', 'D4'])]
    ending_melodies = {
        'grief': [[(0,'F4',3), (4,'E4',2), (8,'D4',3), (13,'A3',2)],
                  [(0,'F4',3), (5,'D4',2), (8,'C4',2), (12,'Bb3',3)],
                  [(0,'D4',2), (4,'C4',2), (8,'Bb3',3), (13,'A3',2)],
                  [(0,'E4',3), (5,'D4',2), (9,'C4',2), (13,'A3',2)]],
        'relief': [[(0,'D4',3), (4,'E4',2), (8,'F4',3), (13,'E4',2)],
                   [(0,'F4',3), (4,'D4',2), (8,'C4',3), (13,'D4',2)],
                   [(0,'D4',3), (4,'G4',2), (8,'F4',3), (13,'E4',2)],
                   [(0,'D4',3), (4,'C4',2), (8,'A3',3), (13,'E4',2)]],
    }
    for mood in ['grief', 'relief']:
        events = []
        for section, (bass, chord) in enumerate(ending_chords):
            for j, note in enumerate(chord):
                event(events, section * 12 - .55 + .03*j, 12.5, note, 'strings', [.21,.18,.13][j], 'harmony')
            event(events, section * 12 - .1, 12.2, bass, 'cello', .23, 'bass')
            for i, (offset, note, length) in enumerate(ending_melodies[mood][section]):
                event(events, section * 12 + offset * .75, length * .75, note, 'felt-piano', [.77,.64,.70,.59][i], 'melody')
            event(events, section * 12 + 8.4, 3, chord[0], 'cello', .27, 'answer')
        tracks.append({'id': 'horror-shared-' + mood, 'seconds': 48,
            'title': '빈자리에 남은 이름' if mood == 'grief' else '아직 끝나지 않은 새벽',
            'intent': '선명한 피아노의 하행 선율과 현의 응답으로 상실을 남긴다. 소리를 감추거나 잡음으로 대신하지 않는다.' if mood == 'grief' else '긴장이 풀려도 밤의 주제를 잊지 않는 피아노 변주. 단조의 안도이며 환호나 경쾌한 승리곡이 아니다.',
            'palette': mood, 'targetLufs': -22.0, 'room': .35,
            'arrangement': {'continuousNoiseBed': False, 'noiseLayerCount': 0, 'leadInstrument': 'felt-piano',
                            'key': 'D minor, suspended ending', 'bpm': 80, 'bars': 16, 'beatsPerBar': 4},
            'sections': [{'atSeconds': i*12, 'lengthSeconds': 12, 'description': word}
                         for i, word in enumerate(['남은 자리', '이름을 기억하기', '멈춘 발걸음', '다음 장을 기다리며'])],
            'events': events})
    return {'version': '24.1.0', 'audioVersion': VERSION, 'sampleRate': SR,
        'provenance': 'Original equation-based instruments and authored notes. No recordings, sampled voices, external music, soundfonts, stochastic noise bed, or generative music service.',
        'delivery': {'codec': 'MP3', 'bitrate': BITRATE, 'channels': 1, 'guardSeconds': .5, 'peakCeilingDbtp': -3.0},
        'tracks': tracks}

def env(t, duration, attack, release):
    return np.sin(np.minimum(t / attack, 1) * np.pi / 2) ** 2 * np.cos(np.clip((t - duration) / release, 0, 1) * np.pi / 2) ** 2


def instrument(kind, note, duration, velocity, seed):
    """Tonal modal instruments. No white-noise generator or rain/hiss layer.

    Deliberate partial damping, small dual-string detuning and written
    dynamics keep the piano identifiable at low playback volume. This is
    equation-based synthesis, not a recorded instrument performance.
    """
    release = {'felt-piano': 2.4, 'felt-keys': 2.0, 'cello': 1.3,
               'strings': 1.6, 'organ': 1.5, 'pizzicato': .65, 'low-tom': .25}[kind]
    n = int((duration + release) * SR)
    t = np.arange(n) / SR
    f = hz(note)
    phase = 2 * np.pi * f * t
    sound = np.zeros(n)
    if kind == 'felt-piano':
        stretch = .00012 * (f / 220) ** .55
        for h in range(1, 13):
            ratio = h * math.sqrt(1 + stretch * h * h)
            if f * ratio > 6500:
                break
            amp = (1 + .14 * math.cos(h * 1.23)) / h ** 1.83
            decay = (2.4 / (1 + .20 * h)) * (220 / f) ** .14
            partial = np.sin(phase * ratio)
            partial += .22 * np.sin(phase * ratio * 1.0007 + .08)
            sound += amp * partial * np.exp(-t / decay)
        sound *= env(t, duration, .006, release)
        level = .37
    elif kind == 'felt-keys':
        # A soft electrically struck reed/bell hybrid; its clear note attack
        # gives the station an identity without imitating static or rainfall.
        for ratio, amp, decay in [(1,1,2.2),(2.001,.28,1.4),(3,.11,.8),(4.006,.045,.65),(5,.018,.4)]:
            sound += amp * (np.sin(phase * ratio) + .15 * np.sin(phase * ratio * 1.0011)) * np.exp(-t / decay)
        sound *= env(t, duration, .008, release)
        level = .40
    elif kind in {'strings', 'cello'}:
        vibrato = .0011 * np.sin(2 * np.pi * 4.1 * t) + .0005 * np.sin(2 * np.pi * .57 * t)
        bowed_phase = 2 * np.pi * f * np.cumsum(1 + vibrato) / SR
        for h in range(1, 15):
            if f * h > 4100:
                break
            amp = 1 / h ** (1.8 if kind == 'strings' else 1.65)
            formant = 1 + .18 * math.exp(-((f * h - 520) / 230) ** 2)
            sound += amp * formant * (np.sin(bowed_phase * h) + .31 * np.sin(bowed_phase * h * 1.0012 + .1 * h))
        sound *= env(t, duration, .65 if kind == 'strings' else .32, release)
        sound *= .94 + .06 * np.sin(2 * np.pi * .36 * t + .2)
        level = .13 if kind == 'strings' else .12
    elif kind == 'organ':
        for h, amp in [(1,1),(2,.32),(3,.10),(4,.05),(6,.017)]:
            sound += amp * np.sin(phase * h + .002 * np.sin(2 * np.pi * .38 * t))
        sound *= env(t, duration, .48, release) * (.96 + .04 * np.sin(2 * np.pi * .71 * t))
        level = .14
    elif kind == 'pizzicato':
        for h in range(1, 14):
            if f * h > 4300:
                break
            sound += math.sin(np.pi * h * .28) / h ** 1.5 * np.sin(phase * h * (1 + .000015*h*h)) * np.exp(-t * (1.2 + .16 * h * h))
        sound *= env(t, duration, .007, release)
        level = .29
    elif kind == 'low-tom':
        base = max(65, min(f, 110))
        p = 2 * np.pi * (base * t + 19 * (1 - np.exp(-t * 14)) / 14)
        sound = (np.sin(p) + .25 * np.sin(p * 1.49) + .10 * np.sin(p * 2.01)) * np.exp(-t * 7.2)
        sound *= env(t, duration, .009, release)
        level = .23
    else:
        raise ValueError(kind)
    return sound * level * velocity ** 1.12

def circular_add(target, sound, start):
    start %= len(target)
    offset = 0
    while offset < len(sound):
        count = min(len(target) - start, len(sound) - offset)
        target[start:start + count] += sound[offset:offset + count]
        offset += count
        start = 0


def colour(sound, room):
    """Circular early reflections preserve actual note tails across the loop."""
    n = len(sound)
    tail = np.zeros(n)
    for seconds, level in [(.037,.24),(.061,.20),(.113,.17),(.191,.14),(.337,.10),(.541,.075),(.817,.047),(1.237,.028),(1.731,.016)]:
        tail += np.roll(sound, round(seconds * SR)) * level
    freq = np.fft.rfftfreq(n, 1/SR)
    tail = np.fft.irfft(np.fft.rfft(tail) / (1 + (freq/2600) ** 4), n)
    result = sound + room * tail
    return np.fft.irfft(np.fft.rfft(result) * (freq ** 2 / (freq ** 2 + 35 ** 2)) / (1 + (freq/6800) ** 8), n)


def render(track):
    n = round(track['seconds'] * SR)
    stems = {role: np.zeros(n) for role in ['melody','harmony','bass','answer','pulse']}
    cache = {}
    for row in track['events']:
        key = (row['instrument'],row['note'],row['durationSeconds'],row['velocity'])
        if key not in cache:
            cache[key] = instrument(*key, seed_for(str(key)))
        circular_add(stems[row['role']], cache[key], round(row['atSeconds'] * SR))
    stems = {role: colour(sound,track['room']) for role,sound in stems.items()}
    result = sum(stems.values())
    peak = float(np.max(np.abs(result)))
    assert np.isfinite(result).all() and peak > .001
    lead = stems['melody']
    accompaniment = sum(sound for role,sound in stems.items() if role != 'melody')
    rms = lambda x: float(np.sqrt(np.mean(x*x)))
    track['_compositionAudit'] = {
        'continuousNoiseBed': False, 'noiseLayerCount': 0,
        'foregroundEventCount': sum(row['role']=='melody' for row in track['events']),
        'foregroundMidiRange': [min(midi(row['note']) for row in track['events'] if row['role']=='melody'),
                                max(midi(row['note']) for row in track['events'] if row['role']=='melody')],
        'sectionCount': len(track['sections']),
        'stemRmsDbfs': {role: round(db(rms(sound)),3) for role,sound in stems.items()},
        'leadToAccompanimentDb': round(db(rms(lead))-db(rms(accompaniment)),3),
        'measurementNote': 'Relative energy of known rendered stems before constant-gain mastering; not a subjective hearing or quality claim.',
    }
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
            'phaseCandidatesTried': len(attempts), 'composition': track['_compositionAudit']}


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
    preserved = {p.relative_to(OUT).as_posix(): digest(p) for p in OUT.rglob('*.mp3') if not p.name.startswith('horror-')}
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
    assert preserved == {p.relative_to(OUT).as_posix(): digest(p) for p in OUT.rglob('*.mp3') if not p.name.startswith('horror-')}
    if wanted:
        return
    assert len(rows) == 8
    index = {row['id']: row['loop'] for row in rows}
    INDEX.write_text('/** Original v24.1 horror scores. Codec guards are outside the repeated period. */\n'
                     + "export const HORROR_AUDIO_VERSION = '" + VERSION + "';\n"
                     + 'export const HORROR_LOOPS = Object.freeze(' + json.dumps(index, separators=(',', ':')) + ');\n')
    audit = {'version': '24.1.0', 'audioVersion': VERSION,
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

#!/usr/bin/env python3
"""Chronicle Gate v19: original, editable narrative scores and two new cues.

Requires Python 3, NumPy, SciPy, ffmpeg and ffprobe. No recordings, samples,
soundfonts, model downloads or online services are used. The original eleven
effects are read and hashed, never synthesized or replaced by this script.

First build / restore the authored score:
    python scripts/build-score-v19.py --write-score
Re-render edited notes in scripts/score-v19.json:
    python scripts/build-score-v19.py
Render a smaller preview to a separate directory:
    python scripts/build-score-v19.py --themes last-train --moods calm,grief \
        --output /tmp/chronicle-score-preview
Keep optional PCM masters outside the public directory:
    python scripts/build-score-v19.py --masters-dir /tmp/chronicle-v19-masters

The JSON is the editable performance schedule. Each event has a MIDI note
name, start beat, duration, velocity and instrument. Tempo, arrangement and
individual notes can be edited without changing synthesis code. --write-score
explicitly regenerates it from the compositions below, replacing JSON edits.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import wave

import numpy as np
from scipy import signal


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/game/audio'
SCORE_PATH = ROOT / 'scripts/score-v19.json'
SR = 32000
BITRATE = '96k'
MOODS = ('calm', 'mystery', 'tension', 'danger', 'hope', 'grief')
OLD_EFFECTS = ('ability', 'attack', 'clue', 'dice', 'enemy', 'failure', 'mixed',
               'reveal', 'success', 'transition', 'victory')
TARGET_LUFS = -21.5
PEAK_CEILING_DB = -2.0


# These are composed phrases, not a shuffled note pool. A vertical bar is a
# barline; r is a rest; the number after : is the length in quarter-note beats.
# Bars shorter than the meter intentionally leave breathing space at the end.
# Calm / mystery / hope / grief are eight-bar statements. Tension / danger are
# sixteen-bar developments with a second phrase and a return into the loop.
THEMES = {
 'last-train': {
  'title': '막차의 일곱 번째 승객', 'piece': '빈 좌석에 남은 온기',
  'meter': '4/4', 'beats': 4, 'key': 'D minor / F major',
  'palette': ['felt', 'muted', 'bowed', 'bass'], 'pulse': 'rail',
  'description': '펠트 피아노가 빈칸을 남겨 말하고, 낮은 현과 마른 레일 박자가 대답한다. 마지막 마디의 미해결음이 다음 첫 음으로 돌아온다.',
  'bpm': {'calm':78,'mystery':76,'tension':146,'danger':152,'hope':78,'grief':64},
  'melodies': {
   'calm': 'r:.5 D4:.5 F4:1 A4:1 r:1 | G4:1 F4:.5 E4:.5 D4:1 r:1 | F4:1 A4:1 C5:1 A4:.5 r:.5 | G4:1 E4:1 r:1 C4:1 | D4:.5 F4:.5 G4:1 A4:1 r:1 | Bb4:1 A4:.5 F4:.5 D4:1 r:1 | E4:1 F4:.5 E4:.5 D4:1 r:1 | C#4:1 E4:1 A3:1 r:1',
   'mystery': 'D4:1 r:1 A4:.5 Bb4:.5 A4:1 | r:1 F4:.5 E4:.5 D4:1 r:1 | C5:.5 A4:.5 F4:1 r:2 | E4:1 r:.5 G4:.5 A4:1 r:1 | G4:.5 A4:.5 Bb4:1 r:1 F4:1 | D4:1 Eb4:.5 D4:.5 r:2 | E4:.5 G4:.5 Bb4:1 A4:1 r:1 | C#4:.5 D4:.5 E4:1 r:2',
   'tension': 'D4:1 A4:1 r:2 | F4:.5 E4:.5 D4:1 r:2 | D4:.5 F4:.5 A4:1 Bb4:1 A4:1 | E4:2 r:2 | G4:1 D5:1 C5:1 r:1 | Bb4:.5 A4:.5 F4:1 r:2 | E4:1 G4:1 Bb4:1 r:1 | A4:2 r:2 | D5:1 A4:1 F4:.5 E4:.5 D4:1 | Bb4:1 A4:.5 G4:.5 F4:1 r:1 | C5:1 A4:1 F4:1 E4:1 | G4:1 E4:1 C4:1 r:1 | G4:.5 A4:.5 Bb4:1 D5:1 r:1 | C5:1 Bb4:1 A4:1 r:1 | E4:.5 F4:.5 G4:1 Bb4:1 A4:1 | C#5:1 A4:1 E4:1 r:1',
   'danger': 'D4:.5 D4:.5 A4:1 D5:1 r:1 | C5:.5 Bb4:.5 A4:1 F4:1 r:1 | A4:.5 C5:.5 D5:1 F5:1 E5:1 | C#5:1 A4:.5 G4:.5 E4:1 r:1 | Bb4:.5 A4:.5 G4:1 D5:1 r:1 | C5:1 A4:.5 F4:.5 D4:1 r:1 | E4:.5 G4:.5 Bb4:1 C#5:1 r:1 | A4:2 r:2 | D5:1 F5:.5 E5:.5 D5:1 A4:1 | Bb4:.5 C5:.5 D5:1 C5:1 Bb4:1 | A4:1 F4:1 C5:1 r:1 | G4:.5 A4:.5 Bb4:1 E5:1 r:1 | D5:1 A4:1 G4:.5 F4:.5 E4:1 | F4:1 Bb4:1 A4:1 r:1 | E4:.5 F4:.5 G4:1 Bb4:1 A4:1 | C#5:1 E5:1 A4:1 r:1',
   'hope': 'F4:1 A4:.5 C5:.5 D5:1 r:1 | C5:1 A4:1 G4:1 r:1 | F4:.5 G4:.5 A4:1 C5:1 r:1 | G4:1 E4:1 C4:1 r:1 | D4:1 G4:1 A4:.5 Bb4:.5 A4:1 | F4:1 A4:1 D5:1 C5:1 | Bb4:1 A4:.5 G4:.5 F4:1 r:1 | E4:1 G4:1 C5:1 r:1',
   'grief': 'D4:1.5 C4:.5 A3:1 r:1 | F4:1 E4:1 D4:1 r:1 | A4:1.5 G4:.5 F4:1 r:1 | E4:2 r:2 | D4:1 F4:.5 G4:.5 A4:1 r:1 | Bb4:1 A4:1 F4:1 r:1 | E4:1 D4:1 C4:1 r:1 | A3:2 r:2'
  },
  'chords': {
   'normal': ['D2 F3 A3 E4','Bb2 F3 A3 D4','F2 C3 A3 E4','C3 G3 Bb3 E4','G2 D3 F3 A3','Bb2 F3 A3 D4','E2 Bb2 D3 G3','A2 E3 G3 C#4'],
   'hope': ['F2 C3 A3 E4','C3 G3 B3 E4','D3 F3 A3 E4','C3 G3 Bb3 E4','G2 D3 F3 A3','Bb2 F3 A3 D4','F2 C3 A3 D4','C3 G3 Bb3 E4'],
   'grief': ['D2 A2 F3 E4','Bb1 F3 A3 D4','F2 C3 A3 E4','C2 G3 Bb3 E4','G2 D3 F3 A3','Bb1 F3 A3 D4','C2 G3 Bb3 D4','A1 E3 A3 D4']
  }
 },
 'glass-hotel': {
  'title': '유리 호텔의 도난당한 새벽', 'piece': '끝나지 않은 왈츠',
  'meter': '3/4', 'beats': 3, 'key': 'C minor / E-flat major',
  'palette': ['glass', 'felt', 'bowed', 'cello'], 'pulse': 'waltz',
  'description': '유리 타건음과 낮은 피아노가 느린 세 박자를 만든다. 질문하는 선율 뒤에 빈 박자를 두고, 희망에서는 같은 왈츠가 밝은 음으로 답한다.',
  'bpm': {'calm':58,'mystery':56,'tension':108,'danger':116,'hope':58,'grief':48},
  'melodies': {
   'calm': 'Eb5:1 D5:.5 C5:.5 r:1 | G4:1 Bb4:1 r:1 | C5:.5 Eb5:.5 F5:1 Eb5:.5 r:.5 | D5:1 Bb4:1 r:1 | G5:1 F5:.5 Eb5:.5 r:1 | C5:1 Ab4:1 r:1 | D5:1 C5:.5 B4:.5 r:1 | G4:1 B4:1 r:1',
   'mystery': 'C5:.5 Eb5:.5 r:1 B4:.5 r:.5 | Ab4:1 G4:.5 r:1.5 | F5:.5 Eb5:.5 C5:1 r:1 | D5:.5 F5:.5 r:2 | G5:1 Eb5:.5 r:1.5 | C5:.5 Db5:.5 C5:1 r:1 | Ab4:1 D5:.5 C5:.5 r:1 | B4:.5 G4:.5 r:2',
   'tension': 'C5:.5 G4:.5 C5:1 r:1 | D5:1 Eb5:.5 D5:.5 r:1 | F5:.5 C5:.5 Ab4:1 r:1 | Bb4:1 D5:1 r:1 | Eb5:.5 G5:.5 F5:1 r:1 | Ab5:1 F5:.5 Eb5:.5 r:1 | D5:.5 F5:.5 Ab5:1 r:1 | B4:1 G4:1 r:1 | C5:1 Eb5:.5 G5:.5 r:1 | Ab5:1 G5:.5 Eb5:.5 r:1 | F5:1 C5:.5 Ab4:.5 r:1 | D5:.5 F5:.5 Bb5:1 r:1 | G5:.5 F5:.5 Eb5:1 r:1 | C5:.5 Eb5:.5 F5:1 r:1 | Ab5:.5 F5:.5 D5:1 r:1 | B4:1 G4:1 r:1',
   'danger': 'C5:.5 Eb5:.5 G5:1 r:1 | Ab5:.5 G5:.5 Eb5:1 r:1 | F5:.5 Ab5:.5 C6:1 Bb5:.5 r:.5 | D5:.5 F5:.5 Bb5:1 r:1 | G5:1 F5:.5 Eb5:.5 r:1 | C5:.5 Db5:.5 F5:1 r:1 | D5:.5 F5:.5 Ab5:1 G5:.5 r:.5 | B4:.5 D5:.5 G5:1 r:1 | C6:1 G5:.5 Eb5:.5 r:1 | Ab5:.5 Bb5:.5 C6:1 r:1 | Ab5:1 F5:.5 C5:.5 r:1 | Bb5:.5 F5:.5 D5:1 r:1 | Eb5:1 G5:.5 F5:.5 r:1 | Ab5:1 F5:.5 Eb5:.5 r:1 | D5:.5 F5:.5 Ab5:1 r:1 | B5:.5 G5:.5 D5:1 r:1',
   'hope': 'Eb5:1 G5:.5 Bb5:.5 r:1 | Ab5:1 G5:1 r:1 | F5:.5 G5:.5 Ab5:1 r:1 | Bb5:1 F5:1 r:1 | G5:1 Eb5:.5 D5:.5 r:1 | C5:1 Eb5:1 r:1 | F5:.5 Eb5:.5 D5:1 r:1 | Bb4:1 D5:1 r:1',
   'grief': 'Eb5:1 D5:1 r:1 | C5:1 Ab4:1 r:1 | G4:1 C5:.5 Eb5:.5 r:1 | D5:2 r:1 | Bb4:1 G4:1 r:1 | Ab4:1 C5:1 r:1 | D5:1 C5:.5 Bb4:.5 r:1 | G4:1.5 r:1.5'
  },
  'chords': {
   'normal':['C2 G3 Eb4 D5','Ab2 Eb3 G3 C4','F2 C3 Ab3 Eb4','Bb2 F3 Ab3 D4','Eb2 Bb3 D4 G4','F2 C3 Ab3 D4','D2 Ab3 C4 F4','G2 D3 F3 B3'],
   'hope':['Eb2 Bb3 D4 G4','Ab2 Eb3 G3 C4','F2 C3 Ab3 Eb4','Bb2 F3 Ab3 D4','Eb2 Bb3 D4 G4','C3 G3 Bb3 Eb4','F2 C3 Ab3 D4','Bb2 F3 Ab3 D4'],
   'grief':['C2 G3 Bb3 Eb4','Ab1 Eb3 G3 C4','F2 C3 Ab3 Eb4','Bb1 F3 Ab3 D4','Eb2 Bb2 D3 G3','Ab1 Eb3 G3 C4','D2 Ab3 C4 F4','G1 D3 G3 C4']
  }
 },
 'moon-market': {
  'title': '달을 파는 야시장', 'piece': '등불 아래의 잔돈',
  'meter': '6/8', 'beats': 3, 'key': 'G major pentatonic / E minor',
  'palette': ['flute', 'nylon', 'breath', 'pizz'], 'pulse': 'river',
  'description': '숨이 섞인 피리와 손가락으로 뜯는 줄이 두 번 흔들리는 여섯 박자를 만든다. 잔물결 같은 반주는 남기고, 슬픔에서는 사람 목소리처럼 긴 쉼을 둔다.',
  'bpm': {'calm':58,'mystery':57,'tension':112,'danger':116,'hope':60,'grief':49},
  'melodies': {
   'calm':'G4:.5 A4:.5 B4:.5 D5:1 r:.5 | E5:.5 D5:.5 B4:.5 A4:1 r:.5 | G4:.5 B4:.5 D5:.5 E5:1 r:.5 | D5:1.5 r:1.5 | C5:.5 B4:.5 A4:.5 G4:1 r:.5 | B4:.5 D5:.5 E5:.5 G5:1 r:.5 | F#5:.5 E5:.5 D5:.5 B4:1 r:.5 | A4:1.5 D5:.5 r:1',
   'mystery':'G4:.5 B4:.5 r:.5 A4:.5 r:1 | E5:1 D5:.5 r:1.5 | B4:.5 D5:.5 F#5:.5 E5:1 r:.5 | A4:.5 C5:.5 r:2 | G5:1 E5:.5 D5:1 r:.5 | C5:.5 E5:.5 D5:.5 B4:1 r:.5 | A4:1 B4:.5 r:1.5 | F#4:.5 A4:.5 D5:.5 r:1.5',
   'tension':'E4:.5 B4:.5 E5:1 r:1 | D5:.5 B4:.5 A4:1 r:1 | G4:.5 A4:.5 B4:.5 D5:.5 E5:.5 r:.5 | D5:1 B4:.5 r:1.5 | C5:.5 B4:.5 A4:1 r:1 | G5:1 E5:.5 D5:.5 r:1 | F#5:.5 E5:.5 D5:1 r:1 | B4:1 D5:.5 r:1.5 | E5:.5 G5:.5 B5:1 r:1 | A5:.5 G5:.5 E5:1 r:1 | B4:.5 D5:.5 E5:.5 G5:.5 E5:.5 r:.5 | D5:1 A4:1 r:1 | C5:.5 E5:.5 G5:1 r:1 | B4:.5 D5:.5 E5:1 r:1 | F#5:.5 A5:.5 E5:1 r:1 | D#5:1 B4:.5 r:1.5',
   'danger':'E5:.5 B4:.5 E5:.5 G5:1 r:.5 | A5:.5 G5:.5 E5:.5 D5:1 r:.5 | G5:.5 E5:.5 D5:.5 B4:1 r:.5 | D5:.5 E5:.5 F#5:1 r:1 | A4:.5 C5:.5 E5:.5 G5:1 r:.5 | G5:.5 B5:.5 A5:.5 G5:1 r:.5 | F#5:.5 E5:.5 D5:.5 C5:1 r:.5 | D#5:1 B4:.5 r:1.5 | E5:.5 G5:.5 B5:.5 E6:1 r:.5 | D6:.5 B5:.5 A5:.5 G5:1 r:.5 | G5:.5 E5:.5 B4:.5 D5:1 r:.5 | F#5:1 E5:.5 D5:.5 r:1 | E5:.5 G5:.5 A5:.5 C6:1 r:.5 | B5:1 G5:.5 E5:1 r:.5 | F#5:.5 E5:.5 D5:.5 B4:1 r:.5 | D#5:1 B4:1 r:1',
   'hope':'G4:.5 B4:.5 D5:.5 G5:1 r:.5 | E5:.5 D5:.5 B4:.5 A4:1 r:.5 | B4:.5 D5:.5 E5:.5 G5:1 r:.5 | F#5:.5 E5:.5 D5:1 r:1 | E5:1 G5:.5 A5:1 r:.5 | G5:.5 E5:.5 D5:.5 B4:1 r:.5 | A4:.5 B4:.5 D5:.5 E5:1 r:.5 | D5:1.5 A4:.5 r:1',
   'grief':'E5:1 D5:.5 B4:1 r:.5 | G4:1 A4:.5 B4:1 r:.5 | E5:1 G5:.5 E5:1 r:.5 | D5:1.5 r:1.5 | C5:1 B4:.5 A4:1 r:.5 | G4:1 B4:.5 E5:1 r:.5 | F#5:1 E5:.5 D5:1 r:.5 | B4:1.5 r:1.5'
  },
  'chords': {
   'normal':['G2 D3 A3 B3','E2 B3 D4 G4','C3 G3 B3 D4','D3 A3 C4 F#4','A2 E3 G3 B3','C3 G3 B3 E4','D3 A3 C4 E4','D2 A3 C4 F#4'],
   'hope':['G2 D3 A3 B3','E2 B3 D4 G4','C3 G3 B3 E4','D3 A3 C4 F#4','C3 G3 B3 D4','G2 D3 B3 E4','A2 E3 G3 B3','D3 A3 C4 F#4'],
   'grief':['E2 B3 D4 G4','C2 G3 B3 E4','G2 D3 A3 B3','D2 A3 C4 F#4','A2 E3 G3 B3','E2 B3 D4 G4','D2 A3 C4 F#4','B1 F#3 A3 D4'],
   'tense':['E2 B3 D4 G4','C3 G3 B3 E4','G2 D3 A3 B3','D3 A3 C4 F#4','A2 E3 G3 B3','C3 G3 B3 E4','D3 A3 C4 F#4','B2 F#3 A3 D#4']
  }
 },
 'deep-sea': {
  'title': '해저 기지의 마지막 방송', 'piece': '수면에서 멀어지는 빛',
  'meter': '4/4', 'beats':4, 'key':'A Dorian / A minor',
  'palette':['vibra','felt','breath','sub'], 'pulse':'sonar',
  'description':'둥근 금속 음색 뒤에 공기 같은 현이 천천히 피어난다. 낮은 두 음 사이의 침묵과 드문 수중 타격음이 깊이를 만들며, 위험에서는 고정된 저음 위에 짧은 응답이 가까워진다.',
  'bpm':{'calm':76,'mystery':72,'tension':136,'danger':148,'hope':76,'grief':62},
  'melodies':{
   'calm':'A3:1 E4:1 B4:1 r:1 | A4:1 G4:1 E4:1 r:1 | D4:1 F#4:1 A4:1 r:1 | E4:2 r:2 | C4:1 E4:1 G4:1 r:1 | B4:1 A4:.5 G4:.5 E4:1 r:1 | D4:1 F#4:1 E4:1 r:1 | B3:1 E4:1 r:2',
   'mystery':'A3:1 r:1 E4:1 r:1 | B4:.5 A4:.5 r:2 E4:1 | D4:1 r:1 F#4:1 r:1 | G4:.5 F#4:.5 E4:1 r:2 | C5:1 B4:.5 A4:.5 r:2 | F4:1 E4:1 r:2 | D4:.5 F4:.5 B4:1 A4:1 r:1 | G#4:.5 E4:.5 r:3',
   'tension':'A3:1 E4:1 r:2 | B4:1 A4:1 r:2 | D4:1 F#4:.5 A4:.5 r:2 | E4:2 r:2 | C5:1 B4:.5 A4:.5 G4:1 r:1 | F4:1 E4:1 r:2 | D4:1 F4:1 B4:1 r:1 | G#4:1 E4:1 r:2 | A4:1 E5:1 D5:1 r:1 | C5:1 B4:1 A4:1 r:1 | F#4:.5 A4:.5 D5:1 C5:1 r:1 | B4:1 G4:1 E4:1 r:1 | C5:1 E5:1 D5:1 r:1 | A4:.5 G4:.5 F4:1 E4:1 r:1 | D4:1 F4:.5 A4:.5 B4:1 r:1 | G#4:1 E4:1 r:2',
   'danger':'A3:.5 E4:.5 A4:1 C5:1 r:1 | B4:.5 A4:.5 G4:1 E4:1 r:1 | F#4:.5 A4:.5 D5:1 E5:1 r:1 | B4:1 G4:.5 E4:.5 r:2 | C5:1 E5:.5 D5:.5 C5:1 r:1 | A4:.5 G4:.5 F4:1 A4:1 r:1 | B4:.5 A4:.5 F4:1 D4:1 r:1 | G#4:1 B4:1 E5:1 r:1 | A4:1 E5:.5 A5:.5 G5:1 r:1 | E5:1 C5:.5 B4:.5 A4:1 r:1 | D5:.5 E5:.5 F#5:1 A5:1 r:1 | G5:1 E5:1 B4:1 r:1 | C5:.5 E5:.5 G5:1 E5:1 r:1 | F5:1 E5:.5 C5:.5 A4:1 r:1 | D5:.5 F5:.5 E5:1 B4:1 r:1 | G#4:1 B4:1 E5:1 r:1',
   'hope':'C4:1 G4:1 B4:1 r:1 | A4:1 E4:.5 G4:.5 A4:1 r:1 | F4:1 A4:1 C5:1 r:1 | B4:1 G4:1 E4:1 r:1 | A4:1 C5:1 D5:1 r:1 | E5:1 D5:.5 C5:.5 A4:1 r:1 | G4:1 B4:1 A4:1 r:1 | E4:1 G4:1 r:2',
   'grief':'A3:2 E4:1 r:1 | G4:1 E4:1 C4:1 r:1 | D4:1 F4:1 A4:1 r:1 | E4:2 r:2 | C5:1 B4:1 A4:1 r:1 | G4:1 E4:1 C4:1 r:1 | D4:1 E4:1 B3:1 r:1 | A3:2 r:2'
  },
  'chords':{
   'normal':['A1 E3 G3 B3','G2 D3 E3 B3','D2 A3 C4 F#4','E2 B3 D4 G4','C2 G3 B3 E4','F2 C3 E3 A3','D2 A3 C4 F#4','E2 B3 D4 G#4'],
   'hope':['C2 G3 B3 E4','A2 E3 G3 B3','F2 C3 E3 A3','G2 D3 F3 B3','D2 A3 C4 E4','F2 C3 E3 A3','G2 D3 F3 A3','G2 D3 F3 B3'],
   'grief':['A1 E3 G3 B3','C2 G3 B3 E4','D2 A3 C4 F4','E2 B3 D4 G4','F2 C3 E3 A3','C2 G3 B3 E4','D2 A3 C4 E4','A1 E3 G3 B3']
  }
 },
 'dragon-banquet': {
  'title':'용의 마지막 만찬', 'piece':'수프가 식기 전에',
  'meter':'4/4','beats':4,'key':'F Mixolydian / D minor',
  'palette':['reed','lute','bowed','pizz'],'pulse':'hearth',
  'description':'나무 관악기와 류트가 말하듯 짧은 음을 주고받는다. 격식 있는 세리머니에 엇박자 웃음을 섞고, 상실에서는 웃음 뒤의 같은 선율을 길게 남긴다.',
  'bpm':{'calm':80,'mystery':78,'tension':150,'danger':156,'hope':80,'grief':66},
  'melodies':{
   'calm':'F4:.5 G4:.5 A4:1 C5:.5 A4:.5 r:1 | Bb4:.5 A4:.5 G4:1 F4:1 r:1 | A4:.5 C5:.5 D5:1 C5:.5 Bb4:.5 r:1 | G4:1 E4:.5 F4:.5 G4:1 r:1 | Bb4:1 D5:.5 C5:.5 Bb4:1 r:1 | A4:.5 C5:.5 F5:1 E5:.5 D5:.5 r:1 | G4:.5 Bb4:.5 A4:1 F4:1 r:1 | E4:.5 G4:.5 C5:1 r:2',
   'mystery':'F4:.5 A4:.5 r:1 G4:.5 r:1.5 | Bb4:1 A4:.5 G4:.5 r:2 | D5:.5 C5:.5 A4:1 r:2 | E4:.5 G4:.5 Bb4:1 r:2 | D5:1 Db5:.5 C5:.5 r:2 | A4:.5 F4:.5 Eb4:1 r:2 | G4:.5 A4:.5 Bb4:1 F4:1 r:1 | E4:.5 G4:.5 C5:1 r:2',
   'tension':'D4:.5 A4:.5 D5:1 r:2 | C5:.5 Bb4:.5 A4:1 r:2 | F4:.5 A4:.5 C5:1 D5:1 r:1 | G4:1 E4:.5 G4:.5 r:2 | Bb4:.5 D5:.5 F5:1 D5:1 r:1 | A4:.5 C5:.5 F5:1 E5:1 r:1 | G4:.5 Bb4:.5 A4:1 r:2 | C#5:1 A4:1 r:2 | D5:.5 E5:.5 F5:1 A5:1 r:1 | G5:.5 F5:.5 D5:1 Bb4:1 r:1 | A4:.5 C5:.5 D5:1 F5:1 r:1 | E5:.5 D5:.5 C5:1 G4:1 r:1 | Bb4:.5 D5:.5 F5:1 E5:1 r:1 | D5:.5 C5:.5 A4:1 F4:1 r:1 | G4:.5 Bb4:.5 D5:1 C#5:1 r:1 | A4:1 C#5:1 E5:1 r:1',
   'danger':'D4:.5 F4:.5 A4:.5 D5:.5 F5:1 r:1 | G5:.5 F5:.5 D5:.5 C5:.5 Bb4:1 r:1 | F5:.5 E5:.5 D5:.5 C5:.5 A4:1 r:1 | G4:.5 C5:.5 E5:1 G5:1 r:1 | Bb4:.5 D5:.5 F5:.5 Bb5:.5 A5:1 r:1 | F5:1 C5:.5 A4:.5 F4:1 r:1 | G4:.5 Bb4:.5 D5:1 F5:.5 E5:.5 r:1 | C#5:1 E5:.5 G5:.5 A5:1 r:1 | D5:.5 F5:.5 A5:1 F5:1 r:1 | Bb5:1 A5:.5 G5:.5 F5:1 r:1 | A5:.5 F5:.5 E5:.5 D5:.5 C5:1 r:1 | G5:1 E5:1 C5:1 r:1 | D5:.5 F5:.5 Bb5:1 A5:1 r:1 | F5:.5 D5:.5 C5:1 A4:1 r:1 | G4:.5 Bb4:.5 D5:.5 F5:.5 E5:1 r:1 | C#5:1 E5:1 A4:1 r:1',
   'hope':'F4:.5 A4:.5 C5:1 F5:1 r:1 | E5:.5 D5:.5 C5:1 A4:1 r:1 | Bb4:.5 D5:.5 F5:1 G5:1 r:1 | E5:1 C5:.5 G4:.5 r:2 | D5:.5 F5:.5 Bb5:1 A5:1 r:1 | F5:.5 C5:.5 A4:1 F4:1 r:1 | G4:.5 A4:.5 Bb4:1 D5:1 r:1 | E5:1 C5:1 r:2',
   'grief':'D4:1 A4:1 F4:1 r:1 | Bb4:1 A4:1 F4:1 r:1 | C5:1 A4:1 F4:1 r:1 | E4:2 r:2 | G4:1 Bb4:.5 A4:.5 G4:1 r:1 | F4:1 A4:1 D5:1 r:1 | C5:1 Bb4:1 A4:1 r:1 | E4:1 A3:1 r:2'
  },
  'chords':{
   'normal':['F2 C3 A3 D4','Bb2 F3 A3 D4','D3 F3 A3 C4','C3 G3 Bb3 E4','Bb2 F3 A3 D4','F2 C3 A3 Eb4','G2 D3 F3 Bb3','C3 G3 Bb3 E4'],
   'hope':['F2 C3 A3 E4','D3 F3 A3 C4','Bb2 F3 A3 D4','C3 G3 Bb3 E4','Bb2 F3 A3 D4','F2 C3 A3 D4','G2 D3 F3 Bb3','C3 G3 Bb3 E4'],
   'grief':['D2 A2 F3 E4','Bb2 F3 A3 D4','F2 C3 A3 E4','C3 G3 Bb3 E4','G2 D3 F3 Bb3','Bb2 F3 A3 D4','E2 Bb2 D3 G3','A2 E3 A3 D4'],
   'tense':['D2 A3 C4 F4','Bb2 F3 A3 D4','F2 C3 A3 E4','C3 G3 Bb3 E4','Bb2 F3 A3 D4','F2 C3 A3 Eb4','G2 D3 F3 Bb3','A2 E3 G3 C#4']
  }
 },
 'clock-city':{
  'title':'13분 뒤에 사라지는 도시','piece':'다섯 걸음째의 빈자리',
  'meter':'5/4','beats':5,'key':'E minor / G major',
  'palette':['musicbox','muted','organ','pizz'],'pulse':'clock',
  'description':'세 걸음과 두 걸음으로 나뉘는 다섯 박자. 오르골의 밝은 표면 아래 짧은 현과 나무 추의 박자가 어긋나며, 슬픔에서는 추를 멈추고 긴 피아노 음만 남긴다.',
  'bpm':{'calm':100,'mystery':98,'tension':184,'danger':192,'hope':100,'grief':80},
  'melodies':{
   'calm':'E5:.5 B4:.5 G5:1 F#5:1 E5:1 r:1 | D5:.5 G5:.5 A5:1 B5:1 r:2 | C6:1 B5:.5 A5:.5 G5:1 E5:1 r:1 | F#5:.5 A5:.5 B5:1 F#5:1 r:2 | A5:1 G5:.5 E5:.5 D5:1 C5:1 r:1 | B4:.5 E5:.5 G5:1 B5:1 r:2 | F#5:1 G5:.5 A5:.5 C6:1 B5:1 r:1 | D#5:1 F#5:1 B4:1 r:2',
   'mystery':'E5:.5 G5:.5 r:1 F#5:.5 E5:.5 r:2 | B4:.5 D5:.5 A5:1 r:3 | C6:.5 B5:.5 G5:1 F#5:1 r:2 | D#5:.5 F#5:.5 B5:1 r:3 | A5:1 C6:.5 B5:.5 G5:1 r:2 | E5:.5 G5:.5 D5:1 r:3 | F#5:.5 A5:.5 C6:1 B5:1 r:2 | D#5:1 B4:1 r:3',
   'tension':'E5:.5 B4:.5 E5:1 G5:1 r:2 | F#5:.5 E5:.5 D5:1 B4:1 r:2 | C5:.5 E5:.5 G5:1 B5:1 r:2 | F#5:1 A5:1 B5:1 r:2 | A5:.5 G5:.5 E5:1 C5:1 r:2 | B4:.5 E5:.5 G5:1 E5:1 r:2 | F#5:.5 A5:.5 C6:1 B5:1 r:2 | D#5:1 F#5:1 B5:1 r:2 | E6:1 B5:.5 G5:.5 F#5:1 E5:1 r:1 | D5:.5 G5:.5 A5:1 B5:1 r:2 | C6:1 B5:.5 A5:.5 G5:1 E5:1 r:1 | F#5:.5 A5:.5 B5:1 D6:1 r:2 | C6:.5 B5:.5 A5:1 G5:1 E5:1 r:1 | B5:1 G5:.5 E5:.5 D5:1 r:2 | F#5:.5 A5:.5 C6:1 B5:1 A5:1 r:1 | D#6:1 B5:1 F#5:1 r:2',
   'danger':'E5:.5 G5:.5 B5:1 E6:1 B5:1 r:1 | D6:.5 B5:.5 A5:1 G5:1 r:2 | C6:.5 E6:.5 G6:1 E6:1 C6:1 r:1 | F#5:.5 A5:.5 B5:1 D6:1 r:2 | A5:.5 C6:.5 E6:1 D6:1 C6:1 r:1 | B5:.5 G5:.5 E5:1 B4:1 r:2 | F#5:.5 A5:.5 C6:1 E6:1 D6:1 r:1 | D#6:1 B5:1 F#5:1 r:2 | E6:1 G6:.5 F#6:.5 E6:1 B5:1 r:1 | D6:.5 B5:.5 A5:1 G5:1 r:2 | C6:1 B5:.5 A5:.5 G5:1 E5:1 r:1 | F#5:.5 A5:.5 B5:1 D6:1 r:2 | E6:.5 D6:.5 C6:1 A5:1 G5:1 r:1 | B5:1 G5:.5 E5:.5 B4:1 r:2 | F#5:.5 A5:.5 C6:1 B5:1 A5:1 r:1 | D#6:1 F#6:1 B5:1 r:2',
   'hope':'G5:.5 B5:.5 D6:1 E6:1 D6:1 r:1 | B5:1 G5:.5 A5:.5 B5:1 r:2 | C6:1 E6:.5 D6:.5 B5:1 G5:1 r:1 | A5:.5 F#5:.5 D5:1 F#5:1 r:2 | E5:1 G5:.5 B5:.5 C6:1 D6:1 r:1 | B5:1 G5:.5 E5:.5 D5:1 r:2 | A5:.5 B5:.5 C6:1 B5:1 G5:1 r:1 | F#5:1 A5:1 D6:1 r:2',
   'grief':'E4:1 G4:1 B4:1 A4:1 r:1 | G4:1 F#4:1 D4:1 r:2 | E4:1 G4:1 C5:1 B4:1 r:1 | A4:1 F#4:1 r:3 | C5:1 B4:1 A4:1 G4:1 r:1 | E4:1 B3:1 E4:1 r:2 | F#4:1 A4:1 G4:1 F#4:1 r:1 | B3:2 r:3'
  },
  'chords':{
   'normal':['E2 B3 D4 G4','G2 D3 F#3 B3','C3 G3 B3 E4','D3 A3 C4 F#4','A2 E3 G3 C4','E2 B3 D4 G4','F#2 C3 E3 A3','B2 F#3 A3 D#4'],
   'hope':['G2 D3 F#3 B3','E2 B3 D4 G4','C3 G3 B3 E4','D3 A3 C4 F#4','A2 E3 G3 C4','E2 B3 D4 G4','C3 G3 B3 E4','D3 A3 C4 F#4'],
   'grief':['E2 B2 D3 G3','G2 D3 F#3 B3','C2 G3 B3 E4','D2 A3 C4 F#4','A2 E3 G3 C4','E2 B2 D3 G3','F#2 C3 E3 A3','B1 F#3 B3 E4']
  }
 },
 'snow-radio':{
  'title':'설원에서 온 내 목소리','piece':'눈발 사이의 숨',
  'meter':'4/4','beats':4,'key':'B minor / D major',
  'palette':['felt','harmonics','breath','cello'],'pulse':'snow',
  'description':'펠트 건반 한 음을 금속성 줄 울림이 멀리서 받아 준다. 긴 공백과 낮은 숨결을 유지하며, 희망은 새 악기를 크게 더하기보다 선율의 끝을 따뜻하게 바꾼다.',
  'bpm':{'calm':76,'mystery':74,'tension':140,'danger':146,'hope':78,'grief':62},
  'melodies':{
   'calm':'D4:1 F#4:1 A4:1 r:1 | G4:1 F#4:.5 E4:.5 D4:1 r:1 | B3:1 D4:1 F#4:1 r:1 | E4:2 r:2 | G4:1 A4:.5 B4:.5 D5:1 r:1 | A4:1 F#4:1 E4:1 r:1 | G4:1 F#4:.5 E4:.5 D4:1 r:1 | C#4:1 E4:1 r:2',
   'mystery':'B3:1 r:1 F#4:1 r:1 | A4:.5 G4:.5 F#4:1 r:2 | D5:1 C#5:.5 B4:.5 r:2 | E4:1 F#4:1 r:2 | G4:1 B4:1 A4:1 r:1 | F#4:.5 E4:.5 D4:1 r:2 | C#4:1 E4:.5 G4:.5 F#4:1 r:1 | A#3:1 C#4:1 r:2',
   'tension':'B3:1 F#4:1 r:2 | G4:.5 F#4:.5 E4:1 r:2 | D5:1 B4:1 A4:1 r:1 | E4:1 G4:1 r:2 | G4:1 B4:.5 D5:.5 A4:1 r:1 | F#4:.5 E4:.5 D4:1 r:2 | C#4:1 E4:1 G4:1 r:1 | A#4:1 F#4:1 r:2 | B4:1 F#5:1 E5:1 r:1 | D5:.5 C#5:.5 B4:1 G4:1 r:1 | D5:1 F#5:1 A5:1 r:1 | E5:1 C#5:1 A4:1 r:1 | G4:.5 B4:.5 D5:1 E5:1 r:1 | F#5:1 E5:.5 D5:.5 B4:1 r:1 | C#5:1 E5:1 G5:1 r:1 | A#4:1 F#4:1 r:2',
   'danger':'B3:.5 F#4:.5 B4:1 D5:1 r:1 | E5:.5 D5:.5 B4:1 G4:1 r:1 | D5:.5 F#5:.5 A5:1 F#5:1 r:1 | E5:.5 C#5:.5 A4:1 G4:1 r:1 | G4:.5 B4:.5 D5:1 F#5:1 r:1 | E5:.5 D5:.5 B4:1 F#4:1 r:1 | C#5:.5 E5:.5 G5:1 F#5:1 r:1 | A#4:1 C#5:1 F#5:1 r:1 | B4:.5 D5:.5 F#5:1 B5:1 r:1 | G5:1 F#5:.5 E5:.5 D5:1 r:1 | A5:.5 F#5:.5 D5:1 B4:1 r:1 | C#5:.5 E5:.5 A5:1 G5:1 r:1 | B5:1 G5:1 E5:.5 D5:.5 r:1 | F#5:1 D5:.5 B4:.5 A4:1 r:1 | C#5:.5 E5:.5 G5:1 E5:1 r:1 | A#4:1 F#4:1 r:2',
   'hope':'D4:1 F#4:1 A4:1 r:1 | B4:1 A4:.5 F#4:.5 E4:1 r:1 | G4:1 B4:.5 D5:.5 E5:1 r:1 | C#5:1 A4:1 F#4:1 r:1 | B4:1 D5:.5 E5:.5 F#5:1 r:1 | E5:1 D5:1 A4:1 r:1 | G4:1 B4:1 A4:1 r:1 | E4:1 C#4:1 r:2',
   'grief':'B3:1 F#4:1 E4:1 r:1 | D4:1 B3:1 G3:1 r:1 | F#4:1 A4:.5 F#4:.5 D4:1 r:1 | E4:2 r:2 | G4:1 F#4:1 E4:1 r:1 | D4:1 F#4:1 B4:1 r:1 | A4:1 F#4:1 E4:1 r:1 | B3:2 r:2'
  },
  'chords':{
   'normal':['B1 F#3 A3 D4','G2 D3 F#3 B3','D2 A3 C#4 F#4','A2 E3 G3 C#4','G2 D3 F#3 B3','D2 A3 C#4 F#4','E2 B3 D4 G4','F#2 C#3 E3 A#3'],
   'hope':['D2 A3 C#4 F#4','B2 F#3 A3 D4','G2 D3 F#3 B3','A2 E3 G3 C#4','E2 B3 D4 G4','G2 D3 F#3 B3','D2 A3 C#4 F#4','A2 E3 G3 C#4'],
   'grief':['B1 F#3 A3 D4','G2 D3 F#3 B3','D2 A3 C#4 F#4','A2 E3 G3 C#4','E2 B3 D4 G4','G2 D3 F#3 B3','A2 E3 G3 C#4','B1 F#3 A3 C#4']
  }
 }
}


PITCH_CLASSES = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(note):
    if isinstance(note, (float, int)):
        return float(note)
    match = re.fullmatch(r'([A-G])([#b]?)(-?\d+)', note)
    if not match:
        raise ValueError(f'Invalid note {note!r}')
    letter, accidental, octave = match.groups()
    return (int(octave)+1)*12 + PITCH_CLASSES[letter] + {'':0,'#':1,'b':-1}[accidental]


def note_name(number):
    number = int(number)
    return ('C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B')[number % 12] + str(number//12-1)


def seed_for(text):
    return int.from_bytes(hashlib.sha256(text.encode()).digest()[:8], 'little')


def event(events, beat, length, note, instrument, velocity):
    events.append({'at':round(beat,4), 'beats':round(length,4), 'note':note_name(midi(note)),
                   'instrument':instrument, 'velocity':round(velocity,3)})


def make_schedule():
    tracks = []
    for theme_id, theme in THEMES.items():
        for mood in MOODS:
            bars = [bar.strip() for bar in theme['melodies'][mood].split('|')]
            expected = 16 if mood in ('tension','danger') else 8
            assert len(bars) == expected, (theme_id, mood, len(bars))
            beats = theme['beats']
            events = []
            lead, comp, pad, bass = theme['palette']
            # Grief removes ticking/percussion and replaces the particularly
            # bright clock/reed tone with felt, retaining each story's melody.
            if mood == 'grief' and theme_id in ('clock-city','dragon-banquet'):
                lead = 'felt'
            loudness = {'calm':.76,'mystery':.70,'tension':.77,'danger':.86,'hope':.80,'grief':.61}[mood]
            for bar_i, bar in enumerate(bars):
                offset = 0.0
                notes = bar.split()
                for token in notes:
                    pitch, duration = token.split(':')
                    duration = float(duration)
                    if pitch != 'r':
                        phrase = 1 + .05*math.sin((bar_i % 8)/7*math.pi)
                        accent = 1 if offset in (0, beats/2) else .91
                        # Real note lengths leave breath between attacks. They
                        # are not a random variation of note selection.
                        gate = .83 if lead == 'reed' else .90
                        if mood == 'grief': gate = .94
                        event(events, bar_i*beats+offset, duration*gate, pitch, lead, loudness*phrase*accent)
                    offset += duration
                assert offset <= beats+.0001, (theme_id, mood, bar_i, offset)
            chord_family = 'grief' if mood=='grief' else 'hope' if mood=='hope' else 'tense' if mood in ('tension','danger') and 'tense' in theme['chords'] else 'normal'
            chords = theme['chords'][chord_family]
            for bar_i in range(len(bars)):
                start = bar_i*beats
                chord = [midi(n) for n in chords[bar_i%8].split()]
                # Quiet upper voices follow actual authored harmony. Vary
                # voicing on the second eight bars, not merely master volume.
                thinning = .78 if bar_i % 8 == 7 else 1
                second = bar_i >= 8
                pad_level = .36 if mood=='grief' else .27 if mood=='danger' else .30
                for n in chord[1:]:
                    event(events, start-.06, beats*.94, n, pad, pad_level*thinning)
                bass_length = beats*.68 if mood in ('calm','mystery','grief') else beats*.42
                event(events, start, bass_length, chord[0], bass, .69 if mood!='grief' else .51)
                if mood in ('tension','danger'):
                    event(events, start+beats/2, beats*.28, chord[0]+(12 if bar_i%2 else 7), bass, .53)
                # Hand-designed accompaniment gestures for each musical meter.
                pulse = theme['pulse']
                if mood == 'grief':
                    placements = [(0,1),(beats*.53,2)] if bar_i%2==0 else [(0,2)]
                elif pulse == 'waltz':
                    placements = [(1,1),(2,2)]
                elif pulse == 'river':
                    placements = [(0,1),(.5,2),(1,3),(1.5,1),(2,3),(2.5,2)]
                elif pulse == 'clock':
                    placements = [(0,1),(1,2),(2,3),(3,1),(4,2)]
                elif pulse == 'hearth':
                    placements = [(.5,1),(1.5,2),(2.5,3),(3.5,2)]
                elif pulse == 'rail':
                    placements = [(0,1),(1.5,2),(2.5,3),(3,2)]
                elif pulse == 'sonar':
                    placements = [(0,1),(2.5,3)]
                else:
                    placements = [(.3,1),(2.6,3)]
                if mood == 'mystery':
                    placements = [p for i,p in enumerate(placements) if i%2==0 or bar_i%2==0]
                if mood == 'danger':
                    placements = [(i*.5, 1+i%3) for i in range(int(beats*2)) if i%4!=3 or second]
                if mood == 'tension' and pulse in ('rail','sonar','snow'):
                    placements = [(0,1),(1.5,2),(2.5,3)] + ([(3.5,2)] if second else [])
                for j,(offset,index) in enumerate(placements):
                    pitch = chord[index]
                    if pulse == 'river' and j%3==2: pitch += 12
                    duration = .60 if mood not in ('grief','hope') else 1.2
                    event(events,start+offset,duration,pitch,comp,(.42 if mood!='grief' else .29)*thinning*(.95 if j%2 else 1))
                # A short countermelody answers the lead only in its rests.
                # It is absent in grief; long held notes matter there.
                if mood in ('calm','hope','mystery') and bar_i in (1,3,5,7):
                    end_pitch = chord[2] + (12 if pulse in ('river','waltz') else 0)
                    event(events,start+beats-.65,.48,end_pitch,comp,.31 if mood!='hope' else .39)
                if second and mood in ('tension','danger') and bar_i in (9,11,13):
                    event(events,start+beats-1, .75, chord[2]+12, 'bowed', .33)
                percussion(events,theme,mood,bar_i,start,beats)
            events.sort(key=lambda e:(e['at'],e['instrument'],midi(e['note'])))
            tracks.append({
                'id':f'{theme_id}-{mood}', 'theme':theme_id,'mood':mood,
                'campaignTitle':theme['title'],
                'title':theme['piece'], 'description':theme['description'],
                'meter':theme['meter'],'beatsPerBar':beats,'bars':len(bars),
                'bpm':theme['bpm'][mood],'key':theme['key'],
                'form':'A–A′–B–return, 8 bars' if len(bars)==8 else 'question / response, 8 + 8 bars',
                'melodyNotation':theme['melodies'][mood],
                'harmony':chords, 'events':events,
                'room': {'last-train':.16,'glass-hotel':.21,'moon-market':.12,'deep-sea':.25,'dragon-banquet':.16,'clock-city':.14,'snow-radio':.23}[theme_id],
                'targetLufs':TARGET_LUFS
            })
    return {
        'version':19,'sampleRate':SR,
        'provenance':'Original compositions and mathematical/modal instrument synthesis; no third-party samples, recordings or soundfonts.',
        'editing':'Events are authoritative when rendering. at/beats use quarter-note units; note uses scientific pitch; velocity is 0..1. melodyNotation/harmony are readable authoring references. Regenerate with --write-score only when intentionally replacing event edits.',
        'tracks':tracks,
        'effects':[
            {'id':'death','seconds':3.6,'description':'낮은 피아노 두 음이 내려앉고 숨 같은 잔향만 남는다. 갑작스러운 큰 충격음 없이 상실을 알린다.',
             'bpm':60,'targetLufs':-23.0,'room':.22,'events':[
                {'at':.04,'beats':1.8,'note':'D3','instrument':'felt','velocity':.75},
                {'at':.48,'beats':1.9,'note':'A2','instrument':'felt','velocity':.66},
                {'at':.85,'beats':2.1,'note':'F3','instrument':'bowed','velocity':.33},
                {'at':.93,'beats':1.6,'note':'E3','instrument':'breath','velocity':.25}]},
            {'id':'revive','seconds':3.8,'description':'숨이 돌아오듯 낮은 온음에서 밝은 6도 화음으로 펼쳐지는 짧은 복귀 신호.',
             'bpm':60,'targetLufs':-21.0,'room':.18,'events':[
                {'at':.04,'beats':1.8,'note':'C4','instrument':'felt','velocity':.62},
                {'at':.30,'beats':1.8,'note':'G4','instrument':'glass','velocity':.48},
                {'at':.58,'beats':1.9,'note':'D5','instrument':'glass','velocity':.41},
                {'at':.88,'beats':1.8,'note':'E5','instrument':'glass','velocity':.43},
                {'at':.94,'beats':2.0,'note':'A3','instrument':'bowed','velocity':.31},
                {'at':.96,'beats':2.0,'note':'C4','instrument':'bowed','velocity':.27}]}
        ]
    }


def percussion(events,theme,mood,bar_i,start,beats):
    if mood=='grief': return
    pulse=theme['pulse']
    if mood=='mystery' and bar_i%2: return
    energy={'calm':.19,'mystery':.14,'tension':.32,'danger':.43,'hope':.23}[mood]
    if pulse=='rail':
        rhythm=[(0,'brush'),(.5,'click'),(2,'brush'),(2.5,'click')]
    elif pulse=='waltz':
        rhythm=[(0,'wood'),(2,'brush')]
    elif pulse=='river':
        rhythm=[(0,'wood'),(1,'shaker'),(1.5,'wood'),(2.5,'shaker')]
    elif pulse=='clock':
        rhythm=[(0,'click'),(1,'wood'),(2,'click'),(3,'wood'),(4,'click')]
    elif pulse=='hearth':
        rhythm=[(0,'tom'),(1.5,'wood'),(2,'brush'),(3.5,'wood')]
    elif pulse=='sonar':
        rhythm=[(0,'tom')] if bar_i%2==0 else []
    else:
        rhythm=[(0,'brush')] if bar_i%2==0 else []
    if mood=='danger':
        rhythm += [(0,'lowkick'),(beats/2,'lowkick')]
        rhythm += [(i+.5,'shaker') for i in range(int(beats))]
    elif mood=='tension':
        rhythm += [(0,'lowkick')]
    for offset,instrument in rhythm:
        event(events,start+offset,.28 if instrument!='tom' else .7,'C3',instrument,energy)


INSTRUMENTS = {'felt','muted','bowed','bass','glass','cello','flute','nylon','breath',
               'pizz','vibra','sub','reed','lute','musicbox','organ','harmonics',
               'wood','brush','shaker','tom','click','lowkick'}


def envelope(t,duration,attack,release):
    attack_env=np.minimum(t/max(.001,attack),1)
    # A smooth raised-cosine release starts at the written note-off.
    rel=np.clip((t-duration)/max(.001,release),0,1)
    return np.sin(attack_env*np.pi/2)**2 * np.cos(rel*np.pi/2)**2


def filtered_noise(rng,n,cutoff=2200,high=180):
    raw=rng.standard_normal(n)
    sos=signal.butter(2,[high,cutoff],btype='bandpass',fs=SR,output='sos')
    return signal.sosfilt(sos,raw)


def tone(instrument,note,duration,velocity,seed):
    """A small original instrument bank; all excitation comes from equations."""
    rng=np.random.default_rng(seed)
    freq=440*2**((note-69)/12)
    percussion_kind=instrument in {'wood','brush','shaker','tom','click','lowkick'}
    release=.42 if instrument in {'felt','nylon','muted','lute','pizz','harmonics'} else .8
    if instrument in {'bowed','breath','organ','cello'}: release=1.0
    if instrument in {'glass','musicbox','vibra'}: release=1.35
    if percussion_kind: duration=.75 if instrument in {'tom','lowkick'} else .32;release=.1
    n=max(32,int((duration+release)*SR))
    t=np.arange(n,dtype=np.float64)/SR
    sound=np.zeros(n,dtype=np.float64)
    phase=2*np.pi*freq*t
    if instrument=='felt':
        # Inharmonic strings, independent partial decay, hammer noise and a
        # weak second string create a soft piano, rather than a pure beep.
        stretch=.00016*(freq/220)**.6
        for h in range(1,10):
            ratio=h*math.sqrt(1+stretch*h*h)
            if freq*ratio>SR*.43: break
            amp=(1/h**1.75)*(1+.16*math.cos(h*1.1))
            decay=math.exp(-.06*h)*(1.6/(1+.18*h))
            partial=np.sin(phase*ratio+.22*np.sin(phase*2)*np.exp(-t*25))
            partial+=.19*np.sin(phase*ratio*1.0009+.1)
            sound+=amp*partial*np.exp(-t/decay)
        sound+=.05*filtered_noise(rng,n,2500,600)*np.exp(-t*100)
        sound*=envelope(t,duration,.004,release)
        level=.24
    elif instrument in {'nylon','muted','lute','pizz','harmonics','bass'}:
        # Modal model of a plucked string: pick position determines the
        # harmonic excitation; frequency-dependent damping removes upper
        # partials faster than the fundamental. No sampled string is used.
        pick={'nylon':.22,'muted':.32,'lute':.17,'pizz':.27,'harmonics':.50,'bass':.24}[instrument]
        decay={'nylon':1.55,'muted':.58,'lute':1.18,'pizz':.62,'harmonics':2.35,'bass':1.25}[instrument]
        for h in range(1,19):
            if freq*h>SR*.42: break
            amp=math.sin(np.pi*h*pick)/(h**1.43)
            if instrument=='harmonics' and h%2==1 and h>1: amp*=.18
            damping=(.55+.072*h*h)/decay
            sound+=amp*np.sin(phase*h+.00006*h*h*phase)*np.exp(-t*damping)
        sound+=.028*filtered_noise(rng,n,3300,400)*np.exp(-t*85)
        sound*=envelope(t,duration,.003,release)
        level={'nylon':.26,'muted':.24,'lute':.25,'pizz':.27,'harmonics':.24,'bass':.31}[instrument]
    elif instrument in {'glass','musicbox','vibra'}:
        ratios=[1,2.005,3.98,5.42,7.04] if instrument=='glass' else [1,2.01,3,5.02,7.03] if instrument=='musicbox' else [1,3.99,9.92]
        amounts=[1,.32,.13,.052,.025] if instrument!='vibra' else [1,.20,.04]
        for i,(ratio,amp) in enumerate(zip(ratios,amounts)):
            if freq*ratio>SR*.43: continue
            decay=(1.7 if instrument!='vibra' else 2.3)/(1+i*.75)
            sound+=amp*np.sin(phase*ratio)*np.exp(-t/decay)
        if instrument=='vibra': sound*=.92+.08*np.sin(2*np.pi*4.2*t)
        sound*=envelope(t,duration,.002 if instrument!='vibra' else .009,release)
        level=.20 if instrument!='vibra' else .22
    elif instrument in {'flute','reed'}:
        vib=.004*np.sin(2*np.pi*4.7*t)*np.minimum(t/.4,1)
        p=2*np.pi*freq*np.cumsum(1+vib)/SR
        harmonics=[1,.12,.20,.035,.025] if instrument=='flute' else [1,.13,.30,.055,.13,.025,.055]
        for i,amp in enumerate(harmonics):
            if freq*(i+1)>SR*.42: break
            sound+=amp*np.sin(p*(i+1))
        breath=filtered_noise(rng,n,4000,700)
        sound+=breath*(.055 if instrument=='flute' else .018)
        sound*=envelope(t,duration,.07 if instrument=='flute' else .034,release*.50)
        sound*=.94+.06*np.sin(2*np.pi*2.8*t)
        level=.19
    elif instrument in {'bowed','breath','organ','cello'}:
        vib=.0018*np.sin(2*np.pi*4.4*t)+.0007*np.sin(2*np.pi*.61*t)
        p=2*np.pi*freq*np.cumsum(1+vib)/SR
        max_h=12 if instrument in {'bowed','cello'} else 7
        for h in range(1,max_h+1):
            if freq*h>SR*.40: break
            amp=1/h**(1.45 if instrument in {'bowed','cello'} else 2.1)
            if instrument=='organ' and h not in (1,2,3,4,6): amp*=.2
            if instrument=='breath' and h>3: amp*=.18
            sound+=amp*(np.sin(p*h)+.26*np.sin(p*h*1.0017+.16*h))
        attack=.25 if instrument in {'bowed','breath'} else .12
        if instrument=='breath': sound+=.014*filtered_noise(rng,n,2000,350)
        sound*=envelope(t,duration,attack,release)
        level={'bowed':.13,'breath':.13,'organ':.11,'cello':.24}[instrument]
    elif instrument=='sub':
        sound=(np.sin(phase)+.20*np.sin(phase*2)+.05*np.sin(phase*3))*envelope(t,duration,.025,.7)
        level=.31
    elif instrument in {'brush','shaker'}:
        sound=filtered_noise(rng,n,6500 if instrument=='shaker' else 3300,1500 if instrument=='shaker' else 800)
        sound*=np.exp(-t*(32 if instrument=='shaker' else 21))*envelope(t,.16,.012,.09)
        level=.18
    elif instrument in {'wood','click'}:
        f=920 if instrument=='wood' else 1750
        sound=(np.sin(2*np.pi*f*t)+.43*np.sin(2*np.pi*f*1.72*t))*np.exp(-t*95)
        sound+=.09*filtered_noise(rng,n,4300,1100)*np.exp(-t*150)
        sound*=envelope(t,.08,.001,.03)
        level=.12 if instrument=='click' else .19
    elif instrument in {'tom','lowkick'}:
        f0=100 if instrument=='tom' else 68
        bend=25 if instrument=='tom' else 32
        p=2*np.pi*(f0*t + bend*(1-np.exp(-t*20))/20)
        sound=(np.sin(p)+.17*np.sin(p*1.7))*np.exp(-t*(6 if instrument=='tom' else 10))
        sound+=.045*filtered_noise(rng,n,2400,700)*np.exp(-t*35)
        sound*=envelope(t,.65,.002,.10)
        level=.28
    else:
        raise ValueError(f'Unknown instrument: {instrument}')
    # Common slow velocity law makes force change the envelope perceptibly;
    # the score has written dynamics, not pseudo-random note choices.
    return sound*(level*velocity**1.18)


def circular_add(destination,source,start):
    start%=len(destination)
    cursor=0
    while cursor<len(source):
        count=min(len(destination)-start,len(source)-cursor)
        destination[start:start+count]+=source[cursor:cursor+count]
        cursor+=count;start=0


def room_reverb(sound,amount,loop):
    # Early reflections plus a sparse diffuse tail, all derived from the dry
    # synthesized material. Circular convolution preserves music loop tails.
    n=len(sound)
    delays=[(.031,.25),(.047,.19),(.073,.17),(.109,.14),(.163,.11),
            (.227,.10),(.311,.078),(.419,.060),(.563,.045),(.743,.032)]
    wet=np.zeros(n)
    for delay,gain in delays:
        shift=int(delay*SR)
        if loop: wet+=np.roll(sound,shift)*gain
        elif shift<n: wet[shift:]+=sound[:-shift]*gain
    if loop:
        frequencies=np.fft.rfftfreq(n,1/SR)
        spectrum=np.fft.rfft(wet)
        wet=np.fft.irfft(spectrum/(1+(frequencies/3500)**4),n)
    else:
        wet=signal.sosfilt(signal.butter(2,3500,fs=SR,output='sos'),wet)
    return sound+amount*wet


def render_track(track,loop=True):
    beat_seconds=60/track['bpm']
    duration=track['bars']*track['beatsPerBar']*beat_seconds if loop else track['seconds']
    n=round(duration*SR)
    result=np.zeros(n,dtype=np.float64)
    cache={}
    stable_seed=seed_for(track['id'])
    rng=np.random.default_rng(stable_seed)
    for e in track['events']:
        instrument=e['instrument'];pitch=midi(e['note'])
        assert instrument in INSTRUMENTS
        assert 0 < e['velocity'] <= 1.1
        length=e['beats']*beat_seconds
        key=(instrument,pitch,round(length,6),e['velocity'])
        if key not in cache:
            cache[key]=tone(instrument,pitch,length,e['velocity'],seed_for(str(key)))
        # A tiny, deterministic human timing offset is applied only to plucks
        # and keys. Crucial bass/percussion downbeats remain exact.
        jitter=rng.uniform(-.006,.006) if instrument in {'felt','nylon','muted','lute','glass','musicbox','harmonics'} else 0
        start=round((e['at']*beat_seconds+jitter)*SR)
        if loop: circular_add(result,cache[key],start)
        else:
            start=max(0,start);end=min(n,start+len(cache[key]))
            if end>start: result[start:end]+=cache[key][:end-start]
    result=room_reverb(result,track.get('room',.15),loop)
    # The periodic high-pass also removes DC without introducing a fresh
    # filter-start transient at the beginning of a music loop.
    freq=np.fft.rfftfreq(n,1/SR)
    transform=np.fft.rfft(result)
    hp=(freq**2)/(freq**2+30**2)
    lp=1/(1+(freq/11500)**8)
    result=np.fft.irfft(transform*hp*lp,n)
    if not loop:
        fade=min(int(.33*SR),n//3)
        result[-fade:]*=np.linspace(1,0,fade)**2
        result[:int(.005*SR)]*=np.linspace(0,1,int(.005*SR))
    peak=np.max(np.abs(result))
    if not np.isfinite(peak) or peak<1e-8: raise ValueError(f'Silent/invalid render: {track["id"]}')
    return result*.67/peak


def write_wave(path, samples):
    assert np.max(np.abs(samples))<1
    with wave.open(str(path),'wb') as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(SR)
        stream.writeframes(np.round(samples*32767).astype('<i2').tobytes())


def ffmpeg(*args):
    return subprocess.run(['ffmpeg','-hide_banner','-nostdin',*args],check=True,capture_output=True)


def loudness(path):
    result=ffmpeg('-i',str(path),'-af','loudnorm=I=-21.5:TP=-2:LRA=9:print_format=json','-f','null','-')
    matches=re.findall(r'\{\s*"input_i"[\s\S]*?\}',result.stderr.decode(errors='replace'))
    if not matches: raise RuntimeError('ffmpeg did not return loudness data')
    data=json.loads(matches[-1])
    return {'integratedLufs':float(data['input_i']),
            'truePeakDbtp':float(data['input_tp']),
            'loudnessRangeLu':float(data['input_lra'])}


def decode(path):
    result=ffmpeg('-v','error','-i',str(path),'-f','f32le','-acodec','pcm_f32le','-ac','1','-ar',str(SR),'-')
    return np.frombuffer(result.stdout,dtype='<f4').astype(np.float64)


def db(value):
    return round(20*math.log10(max(float(value),1e-10)),3)


def loop_metrics(samples):
    steps=np.abs(np.diff(samples))
    jump=abs(samples[0]-samples[-1])
    win=int(SR*.10)
    a=np.sqrt(np.mean(samples[:win]**2));b=np.sqrt(np.mean(samples[-win:]**2))
    return {'sampleJumpDbfs':db(jump),
            'jumpTo99thStepRatio':round(float(jump/max(np.percentile(steps,99),1e-10)),4),
            'edge100msRmsDifferenceDb':round(abs(db(a)-db(b)),3),
            'decodedSamples':len(samples),
            'method':'Gapless MP3 decode; end-to-start single-sample step compared with within-track 99th-percentile steps; 100 ms edge RMS also recorded. Browser loop scheduling is implementation-dependent.'}


def encode_track(track,work,output,loop=True,masters=None):
    samples=render_track(track,loop)
    raw=work/(track['id']+'-raw.wav')
    master=work/(track['id']+'.wav')
    mp3=work/(track['id']+'.mp3')
    write_wave(raw,samples)
    before=loudness(raw)
    gain_db=min(track.get('targetLufs',TARGET_LUFS)-before['integratedLufs'],PEAK_CEILING_DB-before['truePeakDbtp'])
    samples*=10**(gain_db/20)
    # A constant gain preserves written dynamics; no pumping compressor or
    # destructive dynamic-range normalization is applied.
    write_wave(master,samples)
    ffmpeg('-v','error','-y','-i',str(master),'-map_metadata','-1','-ac','1','-ar',str(SR),
           '-c:a','libmp3lame','-b:a',BITRATE,'-write_xing','1','-id3v2_version','3',str(mp3))
    decoded=decode(mp3)
    stats=loudness(mp3)
    if np.max(np.abs(decoded))>=.99 or stats['truePeakDbtp']>-.7:
        raise ValueError(f'Insufficient headroom: {track["id"]}: {stats}')
    measured={**stats,'samplePeakDbfs':db(np.max(np.abs(decoded))),
              'rmsDbfs':db(np.sqrt(np.mean(decoded**2))),
              'clippedSamples':int(np.sum(np.abs(decoded)>=1)),
              'constantMasterGainDb':round(gain_db,2)}
    if loop: measured['loopBoundary']=loop_metrics(decoded)
    meta={
        'kind':'music' if loop else 'effect','addedIn':19,'file':mp3.name,
        'codec':'mp3','mime':'audio/mpeg','seconds':round(len(decoded)/SR,6),
        'sampleRate':SR,'channels':1,'bitrate':BITRATE,
        'bytes':mp3.stat().st_size,'sha256':hashlib.sha256(mp3.read_bytes()).hexdigest(),
        'sourceWavBytes':master.stat().st_size,'sourceWavSha256':hashlib.sha256(master.read_bytes()).hexdigest(),
        'scoreId':track['id'],'scoreSource':'scripts/score-v19.json',
        'description':track['description'],'instruments':sorted({e['instrument'] for e in track['events']}),
        'bpm':track['bpm'],'measurement':measured
    }
    if loop:
        meta.update(theme=track['theme'],campaignTitle=track['campaignTitle'],mood=track['mood'],title=track['title'],meter=track['meter'],bars=track['bars'],
                    key=track['key'],form=track['form'],melody=track['melodyNotation'],harmony=track['harmony'],
                    eventCount=len(track['events']))
    if masters:
        masters.mkdir(parents=True,exist_ok=True);shutil.copy2(master,masters/master.name)
    shutil.copy2(mp3,output/mp3.name)
    return meta


def validate_score(score):
    assert score['version']==19 and score['sampleRate']==SR
    assert len(score['tracks'])==42
    assert {x['id'] for x in score['tracks']}=={f'{t}-{m}' for t in THEMES for m in MOODS}
    for track in score['tracks']:
        seconds=track['bars']*track['beatsPerBar']*60/track['bpm']
        assert 24<=seconds<=32,(track['id'],seconds)
        assert track['bars'] in (8,16)
        for e in track['events']:
            assert e['instrument'] in INSTRUMENTS
            assert 0<e['beats']<=10 and -.5<=e['at']<track['bars']*track['beatsPerBar']
            assert 0<e['velocity']<=1.1
            assert 20<=midi(e['note'])<=104
    assert {e['id'] for e in score['effects']}=={'death','revive'}


def make_previews(output,preview_dir):
    preview_dir.mkdir(parents=True,exist_ok=True)
    sequences={
        'listen-preview-v19-stories.mp3':[(t,'calm',7) for t in THEMES],
        'listen-preview-v19-emotions.mp3':[('last-train',m,8) for m in ('calm','tension','grief','hope')]
    }
    index={}
    for name,parts in sequences.items():
        snippets=[];rows=[];cursor=0
        for theme,mood,length in parts:
            source=output/f'{theme}-{mood}.mp3'
            if not source.exists(): continue
            data=decode(source)
            segment=data[int(SR*1):int(SR*(length+1))].copy()
            fade=int(SR*.20)
            segment[:fade]*=np.linspace(0,1,fade)
            segment[-fade:]*=np.linspace(1,0,fade)
            gap=np.zeros(int(.5*SR))
            snippets.extend([segment,gap])
            rows.append({'fromSeconds':round(cursor,2),'toSeconds':round(cursor+len(segment)/SR,2),
                         'theme':theme,'title':THEMES[theme]['title'],'mood':mood})
            cursor+=(len(segment)+len(gap))/SR
        if not snippets: continue
        with tempfile.TemporaryDirectory(prefix='chronicle-preview-') as temp:
            raw=Path(temp)/'preview.wav';write_wave(raw,np.concatenate(snippets))
            ffmpeg('-v','error','-y','-i',str(raw),'-map_metadata','-1','-c:a','libmp3lame','-b:a',BITRATE,
                   '-ar',str(SR),'-ac','1','-write_xing','1',str(preview_dir/name))
        index[name]=rows
    (preview_dir/'listen-preview-v19-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')


def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--write-score',action='store_true',help='Regenerate editable JSON from authored compositions (replaces JSON edits).')
    parser.add_argument('--score',type=Path,default=SCORE_PATH)
    parser.add_argument('--score-only',action='store_true',help='Write / validate the score without rendering assets.')
    parser.add_argument('--themes',default=','.join(THEMES))
    parser.add_argument('--moods',default=','.join(MOODS))
    parser.add_argument('--output',type=Path,default=ASSETS)
    parser.add_argument('--masters-dir',type=Path)
    parser.add_argument('--preview-dir',type=Path)
    args=parser.parse_args()
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('Install ffmpeg and ffprobe before rendering.')
    if args.write_score or not args.score.exists():
        schedule=make_schedule();validate_score(schedule)
        args.score.parent.mkdir(parents=True,exist_ok=True)
        args.score.write_text(json.dumps(schedule,ensure_ascii=False,indent=2)+'\n')
    score=json.loads(args.score.read_text());validate_score(score)
    if args.score_only:
        print(json.dumps({'score':str(args.score),'tracks':len(score['tracks']),
                          'events':sum(len(t['events']) for t in score['tracks']),'effects':len(score['effects'])}));return
    themes=set(args.themes.split(','));moods=set(args.moods.split(','))
    if not themes<=set(THEMES) or not moods<=set(MOODS): raise SystemExit('Unknown theme or mood.')
    full=themes==set(THEMES) and moods==set(MOODS)
    if not full and args.output.resolve()==ASSETS.resolve():
        raise SystemExit('A partial preview needs --output /path/to/preview. Render all tracks to update the public manifest consistently.')
    args.output.mkdir(parents=True,exist_ok=True)
    existing=json.loads((ASSETS/'manifest.json').read_text())
    preserved=[]
    for name in OLD_EFFECTS:
        entry=next(e for e in existing['files'] if e['file']==name+'.mp3')
        if hashlib.sha256((ASSETS/entry['file']).read_bytes()).hexdigest()!=entry['sha256']:
            raise SystemExit(f'Existing effect hash does not match: {name}; not touching assets.')
        preserved.append(entry)
    new=[]
    with tempfile.TemporaryDirectory(prefix='chronicle-score-v19-') as temporary:
        work=Path(temporary);staged=work/'delivery';staged.mkdir()
        tracks=[t for t in score['tracks'] if t['theme'] in themes and t['mood'] in moods]
        for i,track in enumerate(tracks,1):
            meta=encode_track(track,work,staged,masters=args.masters_dir);new.append(meta)
            print(json.dumps({'rendered':meta['file'],'progress':f'{i}/{len(tracks)}','bytes':meta['bytes'],
                              'seconds':meta['seconds'],'lufs':meta['measurement']['integratedLufs'],
                              'peakDbtp':meta['measurement']['truePeakDbtp']},ensure_ascii=False),flush=True)
        if full:
            for effect in score['effects']:
                new.append(encode_track(effect,work,staged,loop=False,masters=args.masters_dir))
        # Publish only after all selected assets have encoded and measured.
        # The manifest is written last; no WAV intermediate enters public/.
        for e in new:
            destination=args.output/e['file'];stage=destination.with_suffix('.mp3.tmp')
            shutil.copy2(staged/e['file'],stage);os.replace(stage,destination)
        if full:
            for e in preserved:
                source=ASSETS/e['file'];destination=args.output/e['file']
                if source.resolve()!=destination.resolve(): shutil.copy2(source,destination)
            manifest={
                'version':19,
                'provenance':'42 original narrative compositions and 2 new cues, rendered with original mathematical/modal synthesis. No third-party samples, recordings, soundfonts or generated streaming requests. The 11 existing game effects are byte-for-byte preserved.',
                'quality':'New scores/cues: 96 kbps mono MP3, 32000 Hz. Original 11 effects retain 96 kbps mono / 22050 Hz. Lossy delivery; not claimed to be lossless. Written dynamics retained with constant-gain loudness matching, no normalizing compressor.',
                'delivery':'Same-origin MP3 on demand; no Supabase Storage requests. PCM masters are build intermediates outside public/.',
                'source':{'script':'scripts/build-score-v19.py','score':'scripts/score-v19.json',
                          'scoreSha256':hashlib.sha256(args.score.read_bytes()).hexdigest(),
                          'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
                'measurementNotes':'New files measured after MP3 decoding with ffmpeg loudnorm (integrated LUFS / true peak) and NumPy (sample peak, RMS, clipping, loop-edge steps). Loop tails are circularly mixed before encoding; browser scheduling can still introduce a playback boundary.',
                'files':new+preserved
            }
            temp_manifest=args.output/'manifest.json.tmp'
            temp_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
            os.replace(temp_manifest,args.output/'manifest.json')
            for e in preserved:
                assert hashlib.sha256((args.output/e['file']).read_bytes()).hexdigest()==e['sha256']
            print(json.dumps({'complete':True,'files':len(manifest['files']),
                              'audioBytes':sum(e['bytes'] for e in manifest['files']),
                              'preservedEffects':len(preserved),'output':str(args.output)}),flush=True)
    if args.preview_dir: make_previews(args.output,args.preview_dir)


if __name__=='__main__':
    main()

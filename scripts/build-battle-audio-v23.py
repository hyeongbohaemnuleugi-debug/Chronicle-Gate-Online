#!/usr/bin/env python3
"""Author the original, restrained v23 combat foley. No recordings or samples.

Run: python3 scripts/build-battle-audio-v23.py
Requires NumPy and FFmpeg (libmp3lame). There are no runtime dependencies.
Each sound has an independent fixed seed, so editing one leaves the others intact.
32 kHz mono / 64 kbit MP3 keeps all thirteen cues below 100 KB. Dry transients,
short room reflections, and non-triadic resonances work with all nine stories.
No new BGM is written by this script.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/game/audio/sfx'
SR = 32000
SPECS = {
    'battle-swing': (.34, '공격 시작: 짧은 공기 가름과 나무 마찰'),
    'battle-skill': (.58, '직업 능력: 숨을 모으는 듯한 역방향 마찰과 낮은 공명'),
    'battle-hit': (.40, '적 명중: 단단한 타격과 짧은 금속성 잔향'),
    'battle-critical': (.62, '대성공 명중: 무거운 타격, 갈라지는 작은 파편'),
    'battle-miss': (.36, '빗나감·회피: 충격 없이 옆으로 스치는 바람'),
    'battle-fumble': (.64, '대실패: 균형을 잃는 마찰과 두 번의 낮은 충격'),
    'battle-enemy': (.46, '적 행동 시작: 낮게 밀려오는 마찰과 압력'),
    'battle-hurt': (.43, '동료 피격: 둔탁한 몸통 충격과 짧은 저음'),
    'battle-shield': (.56, '방어막 차단: 둥근 금속 충돌과 억제된 울림'),
    'battle-heal': (.72, '회복: 부드러운 숨결과 천천히 퍼지는 공명'),
    'battle-stun': (.58, '적 행동 중단: 짧게 떨리다 멎는 불규칙한 공명'),
    'battle-victory': (1.28, '전투 종료: 긴장이 풀리는 낮은 종과 공기, 승전가 없음'),
    'battle-defeat': (1.40, '전원 사망: 아래로 가라앉는 공명과 바람, 큰 놀람 없음'),
}


def fade(t, attack=.004, release=.05):
    return np.clip(t / attack, 0, 1) * np.clip((t[-1] - t) / release, 0, 1)


def ring(t, hz, decay, start=0, bend=0):
    q = np.maximum(t - start, 0)
    return (t >= start) * np.minimum(q / .003, 1) * np.sin(2 * np.pi * (hz * q + bend * q*q)) * np.exp(-q * decay)


def air(t, rng, low=80, high=7000):
    n = rng.normal(size=len(t))
    freq = np.fft.rfftfreq(len(n), 1/SR)
    # Smooth frequency rolloffs avoid ringing from brick-wall band limits.
    shape = (1 - np.exp(-(freq / low)**4)) * np.exp(-(freq / high)**4)
    y = np.fft.irfft(np.fft.rfft(n) * shape, n=len(n))
    return y / max(float(np.std(y)), .001)


def burst(t, rng, start, width, low=80, high=4500):
    return air(t, rng, low, high) * np.exp(-.5 * ((t-start) / width)**2)


def build(name, seconds):
    seed = int.from_bytes(hashlib.sha256(('chronicle-v23:' + name).encode()).digest()[:8], 'little')
    rng = np.random.default_rng(seed)
    t = np.arange(round(seconds * SR)) / SR
    if name == 'battle-swing':
        y = .27*burst(t,rng,.13,.047,220,7500) + .075*ring(t,158,19,.035,-125)
        y += .055*burst(t,rng,.095,.023,50,1100)
    elif name == 'battle-skill':
        bloom = np.sin(np.pi*np.clip(t/.43,0,1))**2
        y = .08*air(t,rng,140,3400)*bloom
        y += sum(a*ring(t,f,d,.13,b) for f,d,a,b in [(182,9,.15,35),(411,11,.065,-15),(773,15,.025,-85)])
    elif name == 'battle-hit':
        y = .22*burst(t,rng,.019,.008,120,9500) + .11*burst(t,rng,.047,.019,50,1300)
        y += .36*ring(t,112,22,.006,-100) + .14*ring(t,276,27,.008) + .07*ring(t,1097,26,.014)
    elif name == 'battle-critical':
        y = .21*burst(t,rng,.026,.011,140,10000) + .11*burst(t,rng,.053,.022,80,1800)
        y += .43*ring(t,84,14,.006,-40) + .15*ring(t,213,18,.008) + .08*ring(t,793,18,.017)
        for start, frequency, amp in [(.064,1747,.045),(.10,2609,.027),(.16,3491,.018)]:
            y += amp*ring(t,frequency,19,start)
    elif name == 'battle-miss':
        y = .25*burst(t,rng,.15,.066,950,9000)
        y += .035*burst(t,rng,.09,.024,180,2600)
    elif name == 'battle-fumble':
        y = .075*burst(t,rng,.07,.03,220,4300)
        y += .28*ring(t,124,19,.14,-48) + .19*ring(t,84,16,.30,-30)
        y += .11*burst(t,rng,.155,.012,40,2300) + .07*burst(t,rng,.315,.017,60,3200)
        y += .04*ring(t,389,17,.32,-180)
    elif name == 'battle-enemy':
        y = .15*burst(t,rng,.18,.07,50,1700)
        y += .11*ring(t,73,8,.06,45) + .07*ring(t,113,12,.08,-28)
        y += .035*burst(t,rng,.28,.03,170,4300)
    elif name == 'battle-hurt':
        y = .36*ring(t,78,19,.009,-54) + .15*ring(t,156,24,.007,-32)
        y += .17*burst(t,rng,.028,.012,40,1600) + .035*burst(t,rng,.048,.024,80,3500)
    elif name == 'battle-shield':
        y = .15*burst(t,rng,.022,.009,350,5600)
        y += sum(a*ring(t,f,d,.006) for f,d,a in [(307,11,.18),(503,15,.12),(1283,19,.05),(2399,22,.018)])
        y += .12*ring(t,105,25,.006)
    elif name == 'battle-heal':
        bloom = np.sin(np.pi*np.clip(t/.65,0,1))**2
        y = .07*air(t,rng,70,2200)*bloom
        y += sum(a*np.sin(2*np.pi*f*t)*bloom*np.exp(-t*2.7) for f,a in [(219,.13),(329,.042),(667,.012)])
    elif name == 'battle-stun':
        y = sum(a*ring(t,f,d,.015) for f,d,a in [(271,9,.14),(389,10,.11),(727,12,.055)])
        y *= .72 + .28*np.sin(2*np.pi*15*t)*np.exp(-t*3)
        y += .065*burst(t,rng,.034,.011,160,6000)
    elif name == 'battle-victory':
        y = sum(a*ring(t,f,d,.02) for f,d,a in [(146.8,3.7,.18),(293.6,4.6,.067),(449,6,.025),(812,8,.008)])
        y += .044*burst(t,rng,.25,.15,80,2400)
    else:
        y = sum(a*ring(t,f,d,.06,b) for f,d,a,b in [(137,3.1,.18,-13),(211,3.4,.07,-18),(337,4.5,.02,-25)])
        y += .045*burst(t,rng,.32,.23,70,1800)
    # One subdued room, no long echo masking the next command. Leave the first
    # and last 12 ms silent so mobile media starts/ends cannot produce a click.
    dry = y.copy()
    for delay, gain in [(.029,.095),(.057,.045)]:
        shift = round(delay * SR)
        y[shift:] += dry[:-shift] * gain
    y -= np.mean(y)
    y *= fade(t,.007,.065)
    pad = round(.012*SR)
    edge = round(.007*SR)
    y[:pad] = 0
    y[pad:pad+edge] *= np.linspace(0,1,edge)
    y[-pad-edge:-pad] *= np.linspace(1,0,edge)
    y[-pad:] = 0
    y *= .66 / max(float(np.max(np.abs(y))), .0001)
    return y


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        'version': 23, 'cacheVersion': '23000', 'sampleRate': SR,
        'channels': 1, 'codec': 'MP3 / libmp3lame / 64 kbit/s',
        'source': 'Original deterministic synthesis. No human recordings, samples, or third-party audio.',
        'sourceScript': 'scripts/build-battle-audio-v23.py', 'files': {},
    }
    with tempfile.TemporaryDirectory(prefix='chronicle-battle-') as temporary:
        for name, (seconds, description) in SPECS.items():
            y = build(name, seconds)
            wav = Path(temporary) / (name+'.wav')
            dest = OUT / (name+'.mp3')
            with wave.open(str(wav),'wb') as out:
                out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
                out.writeframes(np.round(y*32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-map_metadata','-1',
                            '-codec:a','libmp3lame','-b:a','64k','-ac','1','-ar',str(SR),str(dest)],check=True)
            raw = subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-f','f32le','-ac','1',
                                  '-ar',str(SR),'-'],check=True,capture_output=True).stdout
            decoded = np.frombuffer(raw,dtype='<f4')
            manifest['files'][name] = {
                'path': f'public/game/audio/sfx/{name}.mp3', 'description': description,
                'seconds': seconds, 'bytes': dest.stat().st_size,
                'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(),
                'decodedPeak': round(float(np.max(np.abs(decoded))),6),
                'decodedRms': round(float(np.sqrt(np.mean(decoded**2))),6),
                'head8msPeak': round(float(np.max(np.abs(decoded[:256]))),6),
                'tail8msPeak': round(float(np.max(np.abs(decoded[-256:]))),6),
            }
    total = sum(row['bytes'] for row in manifest['files'].values())
    manifest['totalBytes'] = total
    (ROOT/'scripts/battle-audio-v23.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'files':len(SPECS),'bytes':total,'peak':max(r['decodedPeak'] for r in manifest['files'].values())}))


if __name__ == '__main__':
    main()

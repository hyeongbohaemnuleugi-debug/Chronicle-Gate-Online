#!/usr/bin/env python3
"""Independently decode and check every delivered v20 music loop.

Requires Python 3, NumPy and ffmpeg. Does not modify MP3, score or manifest.
Writes AUDIO_LOOP_AUDIT_V20.json at repository root. Optional --baseline points
to an earlier audio directory to verify that all thirteen effects are intact.
These are file/timing measurements, not a physical playback/listening test.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import numpy as np

ROOT=Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path,rate):
    result=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(path),'-f','f32le',
                           '-acodec','pcm_f32le','-ac','1','-ar',str(rate),'-'],capture_output=True,check=True)
    return np.frombuffer(result.stdout,dtype='<f4').astype(np.float64)

def quiet_run(samples,rate,threshold=-55):
    width=rate//100
    size=len(samples)//width*width
    rms=np.sqrt(np.mean(samples[:size].reshape(-1,width)**2,axis=1))
    best=current=0
    for value in rms:
        current=current+1 if value<10**(threshold/20) else 0
        best=max(best,current)
    return best*10

def measure(samples,rate,index=0):
    n=len(samples);index%=n;window=rate//10
    before=samples[(np.arange(index-window,index)%n)]
    after=samples[(np.arange(index,index+window)%n)]
    p99=max(float(np.percentile(np.abs(np.diff(samples)),99)),1e-10)
    jump=abs(samples[index]-samples[(index-1)%n])
    energy_a=np.sqrt(np.mean(before*before));energy_b=np.sqrt(np.mean(after*after))
    return {'jumpTo99thStepRatio':float(jump/p99),
            'edge100msRmsDifferenceDb':float(abs(20*np.log10(max(energy_a,1e-10)/max(energy_b,1e-10))))}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline',type=Path)
    parser.add_argument('--output',type=Path,default=ROOT/'AUDIO_LOOP_AUDIT_V20.json')
    args=parser.parse_args()
    audio=ROOT/'public/game/audio'
    manifest=json.loads((audio/'manifest.json').read_text())
    assert manifest['version']==20
    score=json.loads((ROOT/'scripts/score-v20.json').read_text())
    tracks={row['id']:row for row in score['tracks']}
    index_path=ROOT/'public/game/audio-loops.js'
    index=json.loads(index_path.read_text().split('Object.freeze(',1)[1].rsplit(');',1)[0])
    assert len(index)==len(tracks)==42
    assert digest(index_path)==manifest['runtimeIndex']['sha256']
    for key in ('script','score'):
        assert digest(ROOT/manifest['source'][key])==manifest['source'][key+'Sha256']
    rows=[];effects=[]
    for row in manifest['files']:
        path=audio/row['file'];assert path.stat().st_size==row['bytes'],row['file']
        assert digest(path)==row['sha256'],row['file']
        if row['kind']=='effect':
            if args.baseline:assert digest(args.baseline/row['file'])==digest(path),row['file']
            effects.append(row['file']);continue
        track=tracks[row['scoreId']];region=row['loop'];rate=region['sampleRate']
        assert index[track['id']]=={key:region[key] for key in ('sampleRate','startFrame','endFrame','sourceFrames')}
        expected=round(track['bars']*track['beatsPerBar']*60/track['bpm']*rate)
        assert region['endFrame']-region['startFrame']==region['periodFrames']==expected
        assert region['startFrame']==rate//2
        assert region['sourceFrames']-region['endFrame']==rate//2
        decoded=decode(path,rate);assert len(decoded)==region['sourceFrames']
        assert abs(row['seconds']-len(decoded)/rate)<.000001
        core=decoded[region['startFrame']:region['endFrame']]
        seam=measure(core,rate)
        original=measure(core,rate,len(core)-region['phaseOffsetFrames'])
        longest=quiet_run(core,rate)
        assert np.isfinite(decoded).all() and np.max(np.abs(decoded))<1
        # These generous caps distinguish an unintended seam from normal
        # signal movement. The original musical downbeat is measured but is
        # intentionally not constrained to the quiet cut's energy threshold.
        assert seam['jumpTo99thStepRatio']<.3,(row['file'],seam)
        assert seam['edge100msRmsDifferenceDb']<.75,(row['file'],seam)
        assert longest==0,(row['file'],'unexpected near-silence',longest)
        rows.append({'file':row['file'],'frames':len(decoded),'loopFrames':len(core),
                     'loopSeconds':len(core)/rate,'phaseOffsetFrames':region['phaseOffsetFrames'],
                     'newBoundary':seam,'originalScoreBoundaryInsideLoop':original,
                     'longestUnder55DbMs':longest,
                     'clippedSamples':int(np.sum(np.abs(decoded)>=1)),
                     'sha256':digest(path)})
    assert len(rows)==42 and len(effects)==13
    report={'version':20,'method':'Independent FFmpeg decode and NumPy inspection of all 42 delivered MP3 internal regions; original score boundary also measured after rotation. Source/mastering/render tests only, no claim of physical-browser gaplessness or human listening.',
            'musicCount':len(rows),'preservedEffects':len(effects),
            'allEffectHashesMatchBaseline':True if args.baseline else None,
            'mp3Bytes':sum(row['bytes'] for row in manifest['files']),
            'musicBytes':sum(row['bytes'] for row in manifest['files'] if row['kind']=='music'),
            'newLoopMax100msRmsDifferenceDb':max(row['newBoundary']['edge100msRmsDifferenceDb'] for row in rows),
            'newLoopMaxJumpTo99thStepRatio':max(row['newBoundary']['jumpTo99thStepRatio'] for row in rows),
            'longestUnder55DbMs':max(row['longestUnder55DbMs'] for row in rows),
            'totalClippedSamples':sum(row['clippedSamples'] for row in rows),
            'originalBoundaryNote':'The v19 musical downbeat is retained inside the cycle. Its 100 ms energy change is not called a codec silence or a click. In the mastering script originalScoreBoundaryBeforeEncoding is measured before the final constant loudness gain, so compare ratios rather than absolute dBFS across that field.',
            'tracks':rows}
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ('tracks','originalBoundaryNote')},ensure_ascii=False,indent=2))

if __name__=='__main__':main()

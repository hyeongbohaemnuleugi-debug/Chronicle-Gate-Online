#!/usr/bin/env python3
"""Original synthesized scene foley; no sampled voices or external recordings.
Requires Python, NumPy and ffmpeg. Reproducible fixed-seed source, mono MP3.
"""
from pathlib import Path
import hashlib, json, subprocess, tempfile, wave
import numpy as np
SR=44100
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/game/audio'
rng=np.random.default_rng(220026)
def timeline(seconds): return np.arange(round(seconds*SR))/SR
def noise(n): return rng.normal(0,1,n)
def smooth(x,n=80): return np.convolve(x,np.ones(n)/n,mode='same')
def env(t,attack=.025,release=.2):
 return np.minimum(t/attack,1).clip(0,1)*np.minimum((t[-1]-t)/release,1).clip(0,1)
def voice(t,f0,formants):
 phase=2*np.pi*np.cumsum(np.broadcast_to(f0,t.shape))/SR
 y=np.zeros_like(t)
 for k in range(1,20):
  amp=sum(np.exp(-.5*((k*np.broadcast_to(f0,t.shape)-f)/w)**2) for f,w in formants)/k
  y+=amp*np.sin(k*phase)
 return y
sounds={}
t=timeline(2.4);y=np.zeros_like(t)
for onset,level in [(.16,1),(.52,.85),(1.04,1.05)]:
 q=np.maximum(t-onset,0);g=(t>=onset)*np.exp(-q*23)
 y+=level*g*(np.sin(2*np.pi*163*q)+.45*np.sin(2*np.pi*383*q)+.24*np.sin(2*np.pi*1090*q)+.24*noise(len(t))*np.exp(-q*70))
sounds['knock']=y

t=timeline(3.6);f=92+26*np.sin(t*1.9)+12*np.sin(t*12);phase=2*np.pi*np.cumsum(f)/SR
sounds['door-creak']=sum(np.sin(k*phase)/k for k in range(1,14))*(.3+.7*np.sin(t*4.5)**2)*env(t,.3,.65)+smooth(noise(len(t)),25)*env(t,.3,.6)*.17

t=timeline(3.2);f=420+220*np.sin(np.minimum(t/2.5,1)*np.pi*.85)+24*np.sin(t*34)
y=voice(t,f,[(900,330),(2100,470),(3200,600)])
y+=(noise(len(t))-smooth(noise(len(t)),9))*.07
sounds['scream']=y*env(t,.18,.85)*(1-.65*np.minimum(t/3.2,1))

t=timeline(6.5);y=np.zeros_like(t)
for i in range(13):
 f=92+i*9.4+2*np.sin(t*(3+i*.2))
 pulse=np.maximum(0,np.sin(t*(3.1+i*.21)+i))**2*(.3+.7*np.sin(t*.8+i)**2)
 y+=voice(t,f,[(380+i*13,190),(1050+i*23,260),(2200,410)])*pulse
sounds['murmur']=y*env(t,.55,1)

t=timeline(3.5);y=np.zeros_like(t)
for onset in [.18,.72,1.29,1.82,2.43,2.99]:
 q=np.maximum(t-onset,0);g=(t>=onset)*np.exp(-q*21)
 y+=g*(np.sin(2*np.pi*74*q)+smooth(noise(len(t)),13)*.9)
sounds['footsteps']=y

t=timeline(2.7);y=np.zeros_like(t)
for i,f in enumerate([1297,1871,2369,3011,4093,5513,6949]):
 onset=.07+i*.023;q=np.maximum(t-onset,0)
 y+=np.sin(2*np.pi*f*q)*(t>=onset)*np.exp(-q*(3+i*.65))/(1+i*.25)
sounds['glass']=y+noise(len(t))*np.exp(-t*45)*.4

t=timeline(3.1);sounds['metal']=sum(np.sin(2*np.pi*f*t)*np.exp(-t*d)*a for f,d,a in [(211,1.9,1),(353,2.3,.6),(691,3,.3),(1319,4,.2)])*env(t,.004,.6)
t=timeline(4.6);y=smooth(noise(len(t)),20)*.3
for i in range(35):
 onset=rng.uniform(.1,4.2);q=np.maximum(t-onset,0);f=rng.uniform(300,1500)
 y+=.2*np.sin(2*np.pi*(f*q-150*q*q))*(t>=onset)*np.exp(-q*20)
sounds['water']=y*env(t,.6,.9)
t=timeline(5.8);sounds['wind']=(smooth(noise(len(t)),220)*3+smooth(noise(len(t)),23)*.25)*(.6+.3*np.sin(t*2)+.1*np.sin(t*7))*env(t,.8,1.2)
t=timeline(3.6);n=noise(len(t));y=n-smooth(n,23)
sounds['radio-static']=(y*(.12+.18*np.sin(t*19)**8)+.05*np.sin(2*np.pi*820*t)*(np.sin(t*4)>0))*env(t,.18,.55)
t=timeline(4.4);y=np.zeros_like(t)
for onset in [0.12,1.23,2.34,3.45]:
 for gap,amp in [(0,1),(.19,.65)]:
  q=np.maximum(t-onset-gap,0);y+=amp*np.sin(2*np.pi*56*q)*(t>=onset+gap)*np.exp(-q*19)
sounds['heartbeat']=y

t=timeline(3.8);sounds['chime']=sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*d) for f,d,a in [(659.25,1.5,1),(1318.5,2.2,.2),(1830,3,.08)])*env(t,.005,.7)
manifest={"version":22,"source":"Original deterministic synthesis; no sampled human voice or third-party audio.","sampleRate":SR,"files":{}}
OUT.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='chronicle-foley-') as folder:
 for name,y in sounds.items():
  # Short room reflections, soft start/end, conservative peak. No looping one-shots.
  dry=y.copy()
  for delay,gain in [(.047,.13),(.091,.07),(.143,.035)]:
   n=round(delay*SR);y[n:]+=dry[:-n]*gain
  t=np.arange(len(y))/SR;y*=env(t,.008,.12);y-=y.mean()
  peak=np.max(np.abs(y));y=y/max(peak,1e-8)*(.48 if name=='scream' else .62)
  pcm=np.round(y*32767).astype('<i2');wav=Path(folder)/(name+'.wav');dest=OUT/(name+'.mp3')
  with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-map_metadata','-1','-codec:a','libmp3lame','-q:a','5',str(dest)],check=True)
  manifest['files'][name]={"seconds":round(len(y)/SR,3),"bytes":dest.stat().st_size,"sha256":hashlib.sha256(dest.read_bytes()).hexdigest(),"peak":round(float(np.max(np.abs(y))),4),"rms":round(float(np.sqrt(np.mean(y*y))),4)}
(ROOT/'scripts/foley-v22.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({"files":len(sounds),"bytes":sum(f['bytes'] for f in manifest['files'].values())}))

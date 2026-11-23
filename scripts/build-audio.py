#!/usr/bin/env python3
"""Original miniature scores/sound design. Regenerate with Python 3 + NumPy.
No external samples, recordings, commercial melodies, or licensed instruments.
"""
from pathlib import Path
import json, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'public/game/audio'
ROOT.mkdir(parents=True,exist_ok=True)
SR=22050
THEMES={
 'last-train':dict(root=50,bpm=80,motif=[0,7,3,2,0,10,7,2],color='felt',ambient='rail'),
 'glass-hotel':dict(root=57,bpm=90,motif=[0,3,7,10,9,7,3,2],color='glass',ambient='rain'),
 'moon-market':dict(root=55,bpm=80,motif=[0,2,7,9,7,2,0,-3],color='plucked',ambient='river'),
 'deep-sea':dict(root=45,bpm=72,motif=[0,7,12,10,3,2,-2,0],color='sonar',ambient='ocean'),
 'dragon-banquet':dict(root=53,bpm=96,motif=[0,4,7,12,9,7,2,4],color='wood',ambient='fire'),
 'clock-city':dict(root=52,bpm=100,motif=[0,3,2,7,6,10,7,2],color='glass',ambient='tick'),
 'snow-radio':dict(root=47,bpm=72,motif=[0,7,9,2,0,-3,2,7],color='felt',ambient='wind'),
}
MOODS=['calm','mystery','tension','danger','hope']
manifest=[]
def hz(note):return 440*2**((note-69)/12)
def note(note,duration,kind,velocity=1):
 t=np.arange(max(1,int(duration*SR)))/SR;f=hz(note)
 if kind=='pad':
  signal=np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*f*2.002*t)+.13*np.sin(2*np.pi*f*3*t)
  env=np.minimum(t/.38,1)*np.minimum((duration-t)/.65,1)
 elif kind=='bass':
  signal=np.sin(2*np.pi*f*t)+.12*np.sin(2*np.pi*f*2*t);env=np.minimum(t/.018,1)*np.exp(-t*1.2)*np.minimum((duration-t)/.12,1)
 else:
  harmonics={'felt':[(1,1),(2,.22),(3,.07)],'wood':[(1,1),(3,.24),(5,.06)],'glass':[(1,1),(2.76,.22),(4.04,.06)],'plucked':[(1,1),(2,.36),(3,.17),(4,.05)],'sonar':[(1,1),(2,.09)]}[kind]
  signal=sum(a*np.sin(2*np.pi*f*m*t)*np.exp(-t*(1.8+m*.5)) for m,a in harmonics)
  env=np.minimum(t/.012,1)*np.minimum((duration-t)/.09,1)
 return signal*np.clip(env,0,1)*velocity

def place(buf,sound,start,gain=1):
 # Circular placement preserves long release tails across the loop seam.
 index=int(start*SR)%len(buf)
 for offset in range(0,len(sound),len(buf)):
  part=sound[offset:offset+len(buf)]*gain;n=min(len(part),len(buf)-index)
  buf[index:index+n]+=part[:n]
  if n<len(part):buf[:len(part)-n]+=part[n:]
  index=0

def write(name,signal,kind,meta={}):
 peak=np.max(np.abs(signal)) or 1
 signal=signal/peak*.79
 pcm=(np.clip(signal,-1,1)*32767).astype('<i2')
 path=ROOT/f'{name}.wav'
 with wave.open(str(path),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 manifest.append({'file':path.name,'kind':kind,'seconds':round(len(signal)/SR,3),'sampleRate':SR,'channels':1,'peak':round(float(np.max(np.abs(signal))),3),**meta})

for ti,(id,cfg) in enumerate(THEMES.items()):
 for mi,mood in enumerate(MOODS):
  rng=np.random.default_rng(14000+ti*100+mi)
  bpm=cfg['bpm']*(1.12 if mood=='danger' else 1 if mood=='tension' else .88 if mood=='calm' else .96)
  beat=60/bpm;duration=32*beat;n=int(SR*duration);buf=np.zeros(n)
  roots=[0,-5,3,-2] if mood not in ('hope','calm') else [0,5,7,0]
  major=mood=='hope' or id=='dragon-banquet'
  for bar in range(8):
   base=cfg['root']+roots[(bar//2)%4]
   for interval in (0,4 if major else 3,7):place(buf,note(base+interval,beat*4.6,'pad',.023),bar*4*beat)
   place(buf,note(base-12,beat*3.5,'bass',.07),bar*4*beat)
   if mood in ('danger','tension'):place(buf,note(base-12,beat*1.5,'bass',.045),(bar*4+2)*beat)
   steps=4 if mood in ('danger','tension') else 2
   for j in range(steps):
    at=(bar*4+j*4/steps)*beat
    melody=cfg['motif'][(bar*steps+j)%len(cfg['motif'])]
    if major and melody in (3,10):melody+=1
    octave=12 if mood!='danger' else 0
    vel=.06 if mood in ('calm','mystery') else .075
    place(buf,note(cfg['root']+melody+octave,beat*2.4,cfg['color'],vel*rng.uniform(.86,1.05)),at+rng.uniform(0,.018))
   if mood=='danger':
    for k in range(4):
     dt=np.arange(int(.14*SR))/SR
     kick=np.sin(2*np.pi*(62*dt-30*dt**2))*np.exp(-dt*28)*np.minimum(dt/.004,1)
     place(buf,kick,beat*(bar*4+k),.045 if k%2==0 else .024)
   if cfg['ambient']=='tick' or mood=='tension':
    for k in range(4):
     dt=np.arange(int(.045*SR))/SR;tick=np.sin(2*np.pi*1800*dt)*np.exp(-dt*110)*np.minimum(dt/.002,1)
     place(buf,tick,beat*(bar*4+k),.004)
  # Low amplitude ambience, circular filtering and non-identical original theme motifs.
  noise=rng.normal(0,1,n)
  smooth=np.zeros(n)
  for k in range(80):smooth+=np.roll(noise,k)/80
  t=np.arange(n)/SR
  modulation=.6+.4*np.sin(2*np.pi*t/duration*2)
  ambientGain=.004 if cfg['ambient'] in ('wind','ocean','river','rain') else .0017
  buf+=smooth*modulation*ambientGain
  # Circular reflections do not chop off decay at looping boundaries.
  dry=buf.copy()
  for delay,gain in ((.137,.17),(.241,.10),(.397,.065)):
   buf+=np.roll(dry,int(delay*SR))*gain
  # 15ms edge fade makes HTMLAudio loop boundaries click-free.
  edge=int(.015*SR);buf[:edge]*=np.linspace(0,1,edge);buf[-edge:]*=np.linspace(1,0,edge)
  write(f'{id}-{mood}',buf,'music',{'theme':id,'mood':mood,'bpm':round(bpm,2),'originalMotif':cfg['motif']})

rng=np.random.default_rng(14042)
for name in ('dice','success','mixed','failure','clue','reveal','transition'):
 duration={'dice':.72,'success':1.15,'mixed':1.,'failure':.95,'clue':.65,'reveal':1.4,'transition':.9}[name]
 buf=np.zeros(int(duration*SR))
 if name=='dice':
  for i,at in enumerate([0,.045,.10,.17,.26,.38,.54]):
   dt=np.arange(int(.055*SR))/SR
   click=(rng.normal(0,1,len(dt))*.5+np.sin(2*np.pi*(700+i*70)*dt)) *np.exp(-dt*80)*np.minimum(dt/.001,1)
   place(buf,click,at,.3-i*.025)
 elif name=='clue':
  dt=np.arange(int(.11*SR))/SR
  place(buf,rng.normal(0,1,len(dt))*np.exp(-dt*24)*np.minimum(dt/.005,1),0,.06)
  place(buf,note(81,.55,'wood',.17),.075)
 elif name=='transition':
  dt=np.arange(len(buf))/SR
  buf=np.sin(np.pi*dt/duration)**2*np.sin(2*np.pi*(170*dt+90*dt**2))*.07
 else:
  notes={'success':[72,76,79,84],'mixed':[69,72,74],'failure':[57,53,50],'reveal':[67,74,79,83]}[name]
  for i,pitch in enumerate(notes):place(buf,note(pitch,duration-i*.13,'glass' if name=='reveal' else 'felt',.13),i*.13)
 edge=int(.012*SR);buf[:edge]*=np.linspace(0,1,edge);buf[-edge:]*=np.linspace(1,0,edge)
 write(name,buf,'effect')
(ROOT/'manifest.json').write_text(json.dumps({'version':14,'provenance':'Original algorithmic compositions and synthesized effects; no third-party samples.','files':manifest},ensure_ascii=False,indent=2)+'\n')
print(f'Created {sum(x["kind"]=="music" for x in manifest)} music loops and {sum(x["kind"]=="effect" for x in manifest)} effects in {ROOT}')
print(f'Total WAV bytes: {sum(p.stat().st_size for p in ROOT.glob("*.wav")):,}')

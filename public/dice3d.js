import * as THREE from '/vendor/three.module.js';

export class DiceTheater {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    this.camera.position.set(0, 4.6, 8.5);
    this.camera.lookAt(0, .2, 0);
    this.clock = new THREE.Clock();
    this.active = null;
    this.running = false;
    this.faceNormals = [];
    this.faceMaterials = [];
    this.labelMaterials = [];
    this.highlightRing = null;
    this.fxGroup = new THREE.Group();
    this.fxItems = [];
    this.fxOrbiters = [];
    // Must exist before any cleanup/tick code touches it. v8.2.5 accidentally
    // iterated this.fxClouds before initialization, which prevented DiceTheater
    // from being constructed at all in the browser.
    this.fxClouds = [];
    this.fxTrailClock = 0;
    this.glowTexture = null;
    this.setup();
    this.scene.add(this.fxGroup);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setup() {
    const hemi = new THREE.HemisphereLight(0xb9d8ff, 0x180e13, 1.25); this.scene.add(hemi);
    const key = new THREE.SpotLight(0xffffff, 55, 30, Math.PI / 5, .45, 1.2); key.position.set(-4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(512, 512); this.scene.add(key);
    const rim = new THREE.PointLight(0x778cff, 25, 18); rim.position.set(5, 3, -4); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x09090e, roughness: .78, metalness: .08 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.48; floor.receiveShadow = true; this.scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.5, 4.8, 64), new THREE.MeshBasicMaterial({ color: 0x3a4055, transparent: true, opacity: .1, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -1.47; this.scene.add(ring);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  makeLabel(text, size = .34, color = '#fff9ec', opts = {}) {
    const c = document.createElement('canvas'); c.width = 192; c.height = 192;
    const x = c.getContext('2d'); x.clearRect(0, 0, 192, 192); x.textAlign = 'center'; x.textBaseline = 'middle';
    const font = opts.font || 'Georgia'; const weight = opts.weight || '800';
    x.font = `${weight} ${opts.fontSize || 88}px ${font}`; x.shadowColor = opts.shadow || 'rgba(0,0,0,.9)'; x.shadowBlur = opts.shadowBlur ?? 10;
    if(opts.stroke){ x.lineWidth=opts.strokeWidth||5; x.strokeStyle=opts.stroke; x.strokeText(text,96,104); }
    x.fillStyle = color; x.fillText(text, 96, 104);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.userData.material = mat;
    return mesh;
  }

  getGlowTexture() {
    if (this.glowTexture) return this.glowTexture;
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(.22, 'rgba(255,255,255,.92)');
    grad.addColorStop(.55, 'rgba(255,255,255,.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    this.glowTexture = new THREE.CanvasTexture(c);
    return this.glowTexture;
  }

  fxProfile(style = {}) {
    const id = String(style?.id || 'classic');
    const price = Number(style?.price || 0);
    const tier = price >= 12 ? 3 : price >= 8 ? 2 : price > 0 ? 1 : 0;
    const themes = {
      classic: 'classic', nebula_glass: 'nebula', abyss_pearl: 'abyss', twilight_gilt: 'gilt', clockwork: 'clockwork',
      aurora_crystal: 'aurora', eclipse_obsidian: 'eclipse', starseed: 'starseed', neon_prism: 'neon', crown_steel: 'crown', rift_shard: 'rift',
    };
    return { id, price, tier, theme: themes[id] || 'arcane', base: style?.base || '#b94d36', accent: style?.accent || '#ffe6c6', emissive: style?.emissive || '#000000' };
  }

  clearFx() {
    for (const item of this.fxItems) {
      if (item?.obj?.parent) item.obj.parent.remove(item.obj);
      item?.obj?.geometry?.dispose?.();
      if (Array.isArray(item?.obj?.material)) item.obj.material.forEach(m => m?.dispose?.());
      else item?.obj?.material?.dispose?.();
    }
    for (const o of this.fxOrbiters) {
      if (o?.parent) o.parent.remove(o);
      o?.geometry?.dispose?.(); o?.material?.dispose?.();
    }
    this.fxItems = [];
    this.fxOrbiters = [];
    for (const c of this.fxClouds) {
      if (c?.obj?.parent) c.obj.parent.remove(c.obj);
      c?.obj?.geometry?.dispose?.();
      c?.obj?.material?.dispose?.();
    }
    this.fxClouds = [];
    this.fxTrailClock = 0;
    while (this.fxGroup.children.length) this.fxGroup.remove(this.fxGroup.children[0]);
  }

  addSprite(pos, color, size = .3, life = .8, velocity = null, gravity = 0) {
    const mat = new THREE.SpriteMaterial({ map: this.getGlowTexture(), color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat); s.position.copy(pos); s.scale.setScalar(size); this.fxGroup.add(s);
    this.fxItems.push({ obj: s, life, maxLife: life, velocity: velocity || new THREE.Vector3(), gravity, kind: 'sprite', baseScale: size });
    return s;
  }

  burst(pos, color, count = 18, speed = 2.4, size = .28, life = .85, vertical = .65) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = speed * (.35 + Math.random() * .75);
      const v = new THREE.Vector3(Math.cos(a) * r, vertical + Math.random() * speed * .7, Math.sin(a) * r);
      this.addSprite(pos.clone(), color, size * (.55 + Math.random()), life * (.72 + Math.random() * .5), v, 2.6);
    }
  }

  ring(pos, color, start = .35, end = 4.2, life = .7, opacity = .85, tilt = 0) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const obj = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 96), mat);
    obj.position.copy(pos); obj.rotation.x = -Math.PI / 2 + tilt; obj.scale.setScalar(start); this.fxGroup.add(obj);
    this.fxItems.push({ obj, life, maxLife: life, kind: 'ring', start, end, opacity });
    return obj;
  }

  shardBurst(pos, color, count = 12, life = 1.05) {
    for (let i = 0; i < count; i++) {
      const geom = new THREE.TetrahedronGeometry(.08 + Math.random() * .12, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
      const obj = new THREE.Mesh(geom, mat); obj.position.copy(pos);
      obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); this.fxGroup.add(obj);
      const a = Math.random() * Math.PI * 2; const sp = 1.4 + Math.random() * 2.8;
      this.fxItems.push({ obj, life, maxLife: life, kind: 'shard', velocity: new THREE.Vector3(Math.cos(a) * sp, 1.2 + Math.random() * 2.5, Math.sin(a) * sp), gravity: 3.1, spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
    }
  }

  addOrbiter(die, color, radius = 2.0, speed = 1, y = .2, phase = 0, size = .18) {
    const mat = new THREE.SpriteMaterial({ map: this.getGlowTexture(), color, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat); s.scale.setScalar(size); s.userData = { radius, speed, y, phase, die }; this.fxGroup.add(s); this.fxOrbiters.push(s); return s;
  }

  addHalo(die, color, radius = 1.9, opacity = .35) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const h = new THREE.Mesh(new THREE.TorusGeometry(radius, .035, 12, 96), mat); h.rotation.x = Math.PI / 2; h.userData.die = die; this.fxGroup.add(h); this.fxOrbiters.push(h); return h;
  }


  addAuraField(die, colors, count = 360, radius = 2.4, size = .11, speed = .35) {
    const positions = new Float32Array(count * 3);
    const colorAttr = new Float32Array(count * 3);
    const palette = (Array.isArray(colors) ? colors : [colors]).map(c => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
      const r = radius * (.74 + Math.random() * .26);
      positions[i*3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i*3+1] = Math.cos(phi) * r * .72;
      positions[i*3+2] = Math.sin(phi) * Math.sin(theta) * r;
      const c = palette[i % palette.length]; colorAttr[i*3]=c.r; colorAttr[i*3+1]=c.g; colorAttr[i*3+2]=c.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions,3));
    geom.setAttribute('color', new THREE.BufferAttribute(colorAttr,3));
    const mat = new THREE.PointsMaterial({ map:this.getGlowTexture(), size, transparent:true, opacity:.78, vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
    const obj = new THREE.Points(geom,mat); obj.userData={die,speed,baseOpacity:.78}; this.fxGroup.add(obj); this.fxOrbiters.push(obj); return obj;
  }

  cloudBurst(pos, colors, count = 700, speed = 3.8, life = 1.25, size = .12, vertical = .7, spread = .18) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colorAttr = new Float32Array(count * 3);
    const palette = (Array.isArray(colors) ? colors : [colors]).map(c => new THREE.Color(c));
    for (let i=0;i<count;i++) {
      positions[i*3]=(Math.random()-.5)*spread; positions[i*3+1]=(Math.random()-.5)*spread; positions[i*3+2]=(Math.random()-.5)*spread;
      const a=Math.random()*Math.PI*2; const r=speed*(.18+Math.pow(Math.random(),.55)*.95);
      velocities[i*3]=Math.cos(a)*r*(.65+Math.random()*.7);
      velocities[i*3+1]=vertical+Math.random()*speed*.85;
      velocities[i*3+2]=Math.sin(a)*r*(.65+Math.random()*.7);
      const c=palette[i%palette.length]; colorAttr[i*3]=c.r; colorAttr[i*3+1]=c.g; colorAttr[i*3+2]=c.b;
    }
    const geom=new THREE.BufferGeometry(); geom.setAttribute('position',new THREE.BufferAttribute(positions,3)); geom.setAttribute('color',new THREE.BufferAttribute(colorAttr,3));
    const mat=new THREE.PointsMaterial({ map:this.getGlowTexture(), size, transparent:true, opacity:.95, vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
    const obj=new THREE.Points(geom,mat); obj.position.copy(pos); this.fxGroup.add(obj);
    this.fxClouds.push({obj,velocities,life,maxLife:life,gravity:3.1,spin:(Math.random()-.5)*.9,baseOpacity:.95}); return obj;
  }

  flashDisc(pos, color, size = 5.5, life = .35, opacity = .8) {
    const mat=new THREE.SpriteMaterial({map:this.getGlowTexture(),color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    const obj=new THREE.Sprite(mat); obj.position.copy(pos); obj.scale.setScalar(size); this.fxGroup.add(obj);
    this.fxItems.push({obj,life,maxLife:life,kind:'flash',baseScale:size,opacity}); return obj;
  }

  setupRollFx(die, profile) {
    this.clearFx();
    if (!profile.tier) return;
    const accent = new THREE.Color(profile.accent);
    const emissive = new THREE.Color(profile.emissive || profile.accent);
    const orbCount = profile.tier === 1 ? 3 : profile.tier === 2 ? 5 : 8;
    for (let i = 0; i < orbCount; i++) this.addOrbiter(die, i % 2 ? accent : emissive, 1.75 + (i % 3) * .18, .75 + i * .09, (i % 2 ? .3 : -.15), i * .85, profile.tier === 3 ? .24 : .17);
    if (profile.tier >= 2) this.addHalo(die, accent, 1.85, .28);
    this.addAuraField(die, [accent, emissive], profile.tier===1?220:profile.tier===2?420:760, profile.tier===3?2.9:2.35, profile.tier===3?.135:.105, profile.tier===3?.62:.38);
    if (profile.tier >= 3) {
      const h2 = this.addHalo(die, emissive, 2.2, .18); h2.rotation.y = Math.PI / 2;
      this.addAuraField(die, [profile.accent, profile.emissive || profile.accent, '#ffffff'], 620, 3.55, .085, -.48);
    }
    if (profile.theme === 'clockwork') {
      for (let i = 0; i < 2; i++) {
        const m = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false });
        const g = new THREE.Mesh(new THREE.TorusGeometry(1.9 + i * .22, .025, 8, 16), m); g.userData.die = die; g.userData.gear = true; g.userData.speed = i ? -1.6 : 1.2; g.rotation.x = i ? .7 : 1.1; this.fxGroup.add(g); this.fxOrbiters.push(g);
      }
    }
    if (profile.theme === 'nebula') { this.addOrbiter(die,0xd9d0ff,2.15,.55,.25,0,.18); this.addOrbiter(die,0x8c78ff,2.55,-.42,-.15,2.1,.13); }
    if (profile.theme === 'abyss') { this.addHalo(die,0x8eefff,2.0,.18); this.addOrbiter(die,0xbaf8ff,1.8,.35,-.55,1.2,.14); }
    if (profile.theme === 'gilt') { const h=this.addHalo(die,0xffd67a,2.05,.32); h.rotation.x=.35; this.addOrbiter(die,0xff8c5a,2.25,.62,.3,.5,.14); }
    if (profile.theme === 'aurora') { const h=this.addHalo(die,0xbaffd8,2.15,.22); h.rotation.y=.85; this.addOrbiter(die,0x79bfff,2.45,.48,.35,2.4,.16); }
    if (profile.theme === 'eclipse') { const h=this.addHalo(die,0xd998ff,2.25,.28); h.rotation.x=.82; this.addOrbiter(die,0x4c1764,1.75,-.35,0,1.7,.22); }
    if (profile.theme === 'starseed') { this.addOrbiter(die,0xf8f29b,2.0,.42,.45,.3,.18); this.addOrbiter(die,0x8ed88a,2.35,-.3,-.25,2.7,.13); }
    if (profile.theme === 'neon') { [0x58fff0,0xff55e8,0x7f71ff].forEach((col,i)=>{const h=this.addHalo(die,col,1.85+i*.18,.23);h.rotation.set(.35*i,.55*i,.8*i);}); }
    if (profile.theme === 'crown') { const h=this.addHalo(die,0xffe29b,2.15,.34);h.rotation.x=.45;this.addOrbiter(die,0xffc851,2.45,.72,.4,0,.16); }
    if (profile.theme === 'rift') { for(let i=0;i<3;i++){const h=this.addHalo(die,i%2?0xffbcf5:0x8b4dff,1.9+i*.22,.2);h.rotation.set(.4+i*.5,.2+i*.7,.3+i*.35);} }
  }

  trailFx(die, profile, dt) {
    if (!profile.tier) return;
    this.fxTrailClock += dt;
    const interval = profile.tier === 3 ? .028 : profile.tier === 2 ? .055 : .09;
    if (this.fxTrailClock < interval) return;
    this.fxTrailClock = 0;
    const basePos = die.position.clone();
    const accent = new THREE.Color(profile.accent);
    const secondary = new THREE.Color(profile.emissive || profile.accent);
    const count = profile.tier === 3 ? 3 : profile.tier === 2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const p = basePos.clone().add(new THREE.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * .8, (Math.random() - .5) * .8));
      const c = i % 2 ? secondary : accent;
      const velocity = new THREE.Vector3(-.15 - Math.random() * .55, .18 + Math.random() * .4, (Math.random() - .5) * .35);
      this.addSprite(p, c, profile.tier === 3 ? .28 : .2, .35 + Math.random() * .3, velocity, .15);
    }
    if (profile.theme === 'abyss' && Math.random() < .45) this.addSprite(basePos.clone().add(new THREE.Vector3(0, -.5, 0)), 0xa7f4ff, .13, .7, new THREE.Vector3((Math.random()-.5)*.2, .7+Math.random()*.5, (Math.random()-.5)*.2), -.05);
    if (profile.theme === 'starseed' && Math.random() < .4) this.addSprite(basePos.clone(), 0xf8f29b, .12, .65, new THREE.Vector3((Math.random()-.5)*.4, .3+Math.random()*.25, (Math.random()-.5)*.4), .25);
    if (profile.theme === 'nebula' && Math.random()<.5) this.addSprite(basePos.clone(),Math.random()<.5?0xd9d0ff:0x806dff,.14,.75,new THREE.Vector3(-.25,.12,(Math.random()-.5)*.5),.05);
    if (profile.theme === 'gilt' && Math.random()<.5) this.addSprite(basePos.clone(),Math.random()<.5?0xffd67a:0xff7b55,.13,.5,new THREE.Vector3(-.6,.35,(Math.random()-.5)*.25),.5);
    if (profile.theme === 'clockwork' && Math.random()<.4) this.shardBurst(basePos.clone(),0xf5cf84,2,.42);
    if (profile.theme === 'aurora' && Math.random()<.42) this.addSprite(basePos.clone(),Math.random()<.5?0xbaffd8:0x79bfff,.18,.8,new THREE.Vector3(-.25,.65,(Math.random()-.5)*.35),-.08);
    if (profile.theme === 'eclipse' && Math.random()<.35) this.addSprite(basePos.clone(),0xd998ff,.16,.7,new THREE.Vector3(-.2,.05,(Math.random()-.5)*.3),.1);
    if (profile.theme === 'neon' && Math.random()<.65) this.addSprite(basePos.clone(),[0x58fff0,0xff55e8,0x7f71ff][Math.floor(Math.random()*3)],.15,.48,new THREE.Vector3(-.75,.1,(Math.random()-.5)*.25),.05);
    if (profile.theme === 'crown' && Math.random()<.45) this.addSprite(basePos.clone(),0xffe29b,.13,.55,new THREE.Vector3(-.4,.45,(Math.random()-.5)*.25),.4);
    if (profile.theme === 'rift' && Math.random()<.5) this.addSprite(basePos.clone(),Math.random()<.5?0xffbcf5:0x8b4dff,.17,.55,new THREE.Vector3(-.45,(Math.random()-.5)*.4,(Math.random()-.5)*.7),.1);
  }

  landingFx(profile) {
    if (!profile.tier) return;
    const p = new THREE.Vector3(0, -1.39, 0);
    const accent = new THREE.Color(profile.accent);
    const emissive = new THREE.Color(profile.emissive || profile.accent);
    this.ring(p, accent, .25, profile.tier === 3 ? 5.8 : profile.tier === 2 ? 4.5 : 3.4, profile.tier === 3 ? .95 : .7, .85);
    if (profile.tier >= 2) this.ring(p.clone().add(new THREE.Vector3(0,.015,0)), emissive, .2, profile.tier === 3 ? 4.8 : 3.8, .85, .55);
    this.burst(new THREE.Vector3(0, -.9, 0), accent, profile.tier === 3 ? 40 : profile.tier === 2 ? 24 : 14, profile.tier === 3 ? 4.2 : 2.8, profile.tier === 3 ? .32 : .23, profile.tier === 3 ? 1.2 : .85, .8);
    if (profile.tier >= 2) this.shardBurst(new THREE.Vector3(0, -.65, 0), emissive, profile.tier === 3 ? 22 : 10, profile.tier === 3 ? 1.35 : .95);

    // Ultra-dense batched particles: thousands of visible sparks in only a few draw calls.
    const cloudColors=[accent,emissive,new THREE.Color(0xffffff)];
    if (profile.tier===1) this.cloudBurst(new THREE.Vector3(0,-1.0,0),cloudColors,360,3.0,.95,.10,.45,.3);
    if (profile.tier===2) {
      this.cloudBurst(new THREE.Vector3(0,-.95,0),cloudColors,820,4.5,1.2,.115,.75,.38);
      this.flashDisc(new THREE.Vector3(0,-.35,0),accent,4.6,.34,.72);
    }
    if (profile.tier===3) {
      this.cloudBurst(new THREE.Vector3(0,-.92,0),cloudColors,1450,6.1,1.55,.13,1.0,.45);
      this.cloudBurst(new THREE.Vector3(0,-.72,0),[emissive,accent],950,3.7,1.85,.095,1.65,.3);
      this.flashDisc(new THREE.Vector3(0,-.2,0),0xffffff,8.2,.28,.92);
      this.flashDisc(new THREE.Vector3(0,-.1,0),accent,6.4,.62,.68);
      for(let i=0;i<4;i++) this.ring(p.clone().add(new THREE.Vector3(0,.02*i,0)),i%2?emissive:accent,.14+i*.05,6.2+i*.9,.72+i*.11,.46);
    }

    if (profile.theme === 'eclipse') {
      this.ring(new THREE.Vector3(0, .15, 0), 0xd998ff, .2, 2.9, 1.15, .95, Math.PI / 2);
      const dark = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.getGlowTexture(), color: 0x3a0d4f, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      dark.position.set(0,.1,0); dark.scale.setScalar(3.3); this.fxGroup.add(dark); this.fxItems.push({obj:dark,life:1.05,maxLife:1.05,kind:'sprite',velocity:new THREE.Vector3(),gravity:0,baseScale:3.3});
    }
    if (profile.theme === 'neon') {
      const colors = [0x58fff0,0xff55e8,0x7f71ff,0x53ff8c];
      colors.forEach((c,i)=>this.ring(p.clone().add(new THREE.Vector3(0,i*.012,0)),c,.18+i*.05,6.8-i*.35,.88+i*.1,.62));
      this.cloudBurst(new THREE.Vector3(0,-.75,0),colors,1200,5.2,1.5,.115,1.05,.25);
    }
    if (profile.theme === 'crown') {
      for (let i=0;i<12;i++) {
        const a=i/12*Math.PI*2; const pos=new THREE.Vector3(Math.cos(a)*1.55,-.9,Math.sin(a)*1.55);
        const geom=new THREE.ConeGeometry(.13,.8,4); const mat=new THREE.MeshBasicMaterial({color:0xffe29b,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
        const obj=new THREE.Mesh(geom,mat); obj.position.copy(pos); obj.rotation.z=Math.PI; this.fxGroup.add(obj); this.fxItems.push({obj,life:1.1,maxLife:1.1,kind:'crown'});
      }
    }
    if (profile.theme === 'rift') {
      for (let i=0;i<9;i++) this.ring(new THREE.Vector3(0,-.15+i*.08,0), i%2?0xffbcf5:0x8b4dff, .15+i*.05, 3.3+i*.5, .95+i*.08, .55, Math.PI/2 + (i-.2)*.15);
    }
    if (profile.theme === 'aurora') {
      this.cloudBurst(new THREE.Vector3(0,-1.05,0),[0xbaffd8,0x79bfff,0xffd9ff],1050,3.2,1.8,.11,1.8,.55);
      for (let i=0;i<28;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*4,-1.2,(Math.random()-.5)*2.6), i%2?0xbaffd8:0x79bfff, .24, 1.3, new THREE.Vector3((Math.random()-.5)*.3,1.2+Math.random()*1.7,(Math.random()-.5)*.25), -.05);
    }
    if (profile.theme === 'nebula') { this.cloudBurst(new THREE.Vector3(0,-.8,0),[0xd9d0ff,0x806dff,0xffb7f5],760,3.6,1.45,.1,.9,.75); for(let i=0;i<5;i++) this.ring(p.clone().add(new THREE.Vector3(0,.04*i,0)),i%2?0xd9d0ff:0x806dff,.12+i*.05,3.6+i*.6,.9+i*.08,.32,Math.PI/2*(i%2)); }
    if (profile.theme === 'abyss') { for(let i=0;i<34;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*3,-1.25,(Math.random()-.5)*2),0xbaf8ff,.1+Math.random()*.12,1.2+Math.random()*.6,new THREE.Vector3((Math.random()-.5)*.15,.75+Math.random()*1.3,(Math.random()-.5)*.15),-.03); this.ring(p,0x6ee6ff,.2,5.2,1.15,.48); }
    if (profile.theme === 'gilt') { this.cloudBurst(new THREE.Vector3(0,-.9,0),[0xffd67a,0xff8c5a,0xfff2c2],620,4.3,1.05,.09,1.0,.45); for(let i=0;i<3;i++) this.ring(p.clone().add(new THREE.Vector3(0,.025*i,0)),i===1?0xff7d50:0xffd67a,.16+i*.08,4.5+i*.8,.75+i*.12,.5); }
    if (profile.theme === 'clockwork') { for(let i=0;i<4;i++){const m=new THREE.MeshBasicMaterial({color:i%2?0xb78948:0xf5cf84,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false});const g=new THREE.Mesh(new THREE.TorusGeometry(.65+i*.18,.035,8,18),m);g.position.set(0,-.7+i*.12,0);g.rotation.set(Math.PI/2,i*.4,i*.6);this.fxGroup.add(g);this.fxItems.push({obj:g,life:1.1,maxLife:1.1,kind:'crown'});} this.shardBurst(new THREE.Vector3(0,-.65,0),0xf5cf84,18,1.0); }
    if (profile.theme === 'starseed') { this.cloudBurst(new THREE.Vector3(0,-.85,0),[0xf8f29b,0x8ed88a,0xffffff],780,3.6,1.55,.1,1.2,.5); for(let i=0;i<18;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*3.4,-1.05,(Math.random()-.5)*2.5),i%3?0xf8f29b:0x8ed88a,.16,1.35,new THREE.Vector3((Math.random()-.5)*.25,.7+Math.random()*1.4,(Math.random()-.5)*.25),.1); }
  }

  tickFx(dt, elapsed = 0) {
    for (const o of this.fxOrbiters) {
      const die = o.userData?.die;
      if (!die) continue;
      if (o.isPoints) {
        const d=o.userData; o.position.copy(die.position); o.rotation.y += dt*(d.speed||.35); o.rotation.x += dt*(d.speed||.35)*.35; o.material.opacity=(d.baseOpacity||.75)*(.78+.22*Math.sin(elapsed*3));
      } else if (o.isSprite) {
        const d = o.userData; const a = elapsed * d.speed * 2.4 + d.phase;
        o.position.copy(die.position).add(new THREE.Vector3(Math.cos(a)*d.radius, d.y + Math.sin(a*1.7)*.34, Math.sin(a)*d.radius));
        o.material.opacity = .62 + Math.sin(a*2.1)*.18;
      } else {
        o.position.copy(die.position);
        o.rotation.z += dt * (o.userData.speed || .8);
        o.rotation.y += dt * (o.userData.gear ? .3 : .08);
      }
    }
    for (let i=this.fxClouds.length-1;i>=0;i--) {
      const c=this.fxClouds[i]; c.life-=dt; const q=Math.max(0,c.life/c.maxLife); const attr=c.obj.geometry.getAttribute('position'); const arr=attr.array;
      for(let j=0;j<arr.length;j+=3){ c.velocities[j+1]-=c.gravity*dt; arr[j]+=c.velocities[j]*dt; arr[j+1]+=c.velocities[j+1]*dt; arr[j+2]+=c.velocities[j+2]*dt; }
      attr.needsUpdate=true; c.obj.rotation.y += dt*c.spin; c.obj.material.opacity=c.baseOpacity*Math.min(1,q*1.7)*q;
      c.obj.material.size=Math.max(.025,c.obj.material.size*(.9994));
      if(c.life<=0){ if(c.obj.parent)c.obj.parent.remove(c.obj); c.obj.geometry.dispose(); c.obj.material.dispose(); this.fxClouds.splice(i,1); }
    }
    for (let i=this.fxItems.length-1;i>=0;i--) {
      const it=this.fxItems[i]; it.life -= dt; const q=Math.max(0,it.life/it.maxLife); const obj=it.obj;
      if (it.velocity) {
        it.velocity.y -= (it.gravity||0)*dt;
        obj.position.addScaledVector(it.velocity,dt);
      }
      if (it.spin) { obj.rotation.x+=it.spin.x*dt; obj.rotation.y+=it.spin.y*dt; obj.rotation.z+=it.spin.z*dt; }
      if (it.kind==='ring') { const s=it.start+(it.end-it.start)*(1-q); obj.scale.setScalar(s); obj.material.opacity=(it.opacity||.8)*q*q; }
      else if (it.kind==='flash') { obj.material.opacity=(it.opacity||.8)*q*q; const s=(it.baseScale||4)*(1+(1-q)*.32); obj.scale.setScalar(s); }
      else if (it.kind==='sprite') { obj.material.opacity=Math.min(.95,q*1.2); const s=(it.baseScale||.25)*(.65+.7*q); obj.scale.setScalar(s); }
      else if (obj.material) obj.material.opacity=.9*q;
      if (it.life<=0) { if(obj.parent)obj.parent.remove(obj); obj.geometry?.dispose?.(); obj.material?.dispose?.(); this.fxItems.splice(i,1); }
    }
  }

  skinVisual(style={}) {
    const id=String(style?.id||'classic');
    const map={
      classic:{font:'Georgia',weight:'800',scale:1,edge:'#ffe6c6'},
      nebula_glass:{font:'Georgia',weight:'700',scale:1.02,edge:'#d9d0ff',shell:'glass-stars'},
      abyss_pearl:{font:'Trebuchet MS',weight:'800',scale:1.04,edge:'#baf8ff',shell:'pearl-bubble'},
      twilight_gilt:{font:'Georgia',weight:'900',scale:1.02,edge:'#ffd67a',shell:'gilded-studs'},
      clockwork:{font:'Courier New',weight:'900',scale:1.03,edge:'#f5cf84',shell:'mechanical-gears'},
      aurora_crystal:{font:'Arial',weight:'800',scale:1.05,edge:'#baffd8',shell:'crystal-spires'},
      eclipse_obsidian:{font:'Georgia',weight:'900',scale:1.04,edge:'#d998ff',shell:'eclipse-core'},
      starseed:{font:'Georgia',weight:'900',scale:1.03,edge:'#f8f29b',shell:'living-stars'},
      neon_prism:{font:'Arial Black',weight:'900',scale:1.04,edge:'#58fff0',shell:'neon-wire'},
      crown_steel:{font:'Georgia',weight:'900',scale:1.05,edge:'#ffe29b',shell:'royal-spikes'},
      rift_shard:{font:'Trebuchet MS',weight:'900',scale:1.06,edge:'#ffbcf5',shell:'fractured-shell'},
    };
    return map[id]||map.classic;
  }

  decorateDie(group, skin={}, sides=20) {
    const visual=this.skinVisual(skin); const id=String(skin.id||'classic');
    group.userData.skinId=id; group.scale.setScalar(visual.scale||1);
    const accent=new THREE.Color(skin.accent||'#ffe6c6'); const emissive=new THREE.Color(skin.emissive||skin.accent||'#ffffff');
    const shellGeom=()=>sides===6?new THREE.BoxGeometry(2.34,2.34,2.34):new THREE.IcosahedronGeometry(1.62,0);
    const addWire=(color,opacity=.5,scale=1)=>{ const e=new THREE.LineSegments(new THREE.EdgesGeometry(shellGeom()),new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false})); e.scale.setScalar(scale); e.renderOrder=15; group.add(e); return e; };
    const addPoints=(count,color,radius,size=.045)=>{ const arr=new Float32Array(count*3); for(let i=0;i<count;i++){ const u=Math.random(),v=Math.random(),th=u*Math.PI*2,ph=Math.acos(2*v-1),r=radius*(.55+Math.random()*.45); arr[i*3]=Math.sin(ph)*Math.cos(th)*r;arr[i*3+1]=Math.cos(ph)*r;arr[i*3+2]=Math.sin(ph)*Math.sin(th)*r; } const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));const m=new THREE.PointsMaterial({map:this.getGlowTexture(),color,size,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});const p=new THREE.Points(g,m);p.renderOrder=16;group.add(p);return p; };
    if(id==='nebula_glass'){
      const shell=new THREE.Mesh(shellGeom(),new THREE.MeshPhysicalMaterial({color:skin.base,transparent:true,opacity:.16,roughness:.02,metalness:.05,transmission:.45,clearcoat:1.5,depthWrite:false}));shell.scale.setScalar(1.035);shell.renderOrder=10;group.add(shell);addPoints(54,accent,1.36,.055);addWire(accent,.42,1.035);
    } else if(id==='abyss_pearl'){
      const pearl=new THREE.Mesh(new THREE.SphereGeometry(sides===6?1.62:1.72,24,16),new THREE.MeshPhysicalMaterial({color:skin.base,transparent:true,opacity:.08,roughness:.08,metalness:.15,clearcoat:1.6,depthWrite:false}));pearl.renderOrder=9;group.add(pearl);for(let i=0;i<10;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.07+Math.random()*.05,10,8),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.55,depthWrite:false}));const a=Math.random()*Math.PI*2;b.position.set(Math.cos(a)*(1.45+Math.random()*.22),-.7+Math.random()*1.5,Math.sin(a)*(1.45+Math.random()*.22));group.add(b);} addWire(accent,.35,1.01);
    } else if(id==='twilight_gilt'){
      addWire(0xffd67a,.95,1.01); const verts=(sides===6?[[1,1,1],[-1,1,1],[1,-1,1],[1,1,-1],[-1,-1,1],[-1,1,-1],[1,-1,-1],[-1,-1,-1]]:new THREE.IcosahedronGeometry(1.58,0).attributes.position.array); if(Array.isArray(verts)){for(const v of verts){const m=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),new THREE.MeshStandardMaterial({color:0xffd67a,metalness:.95,roughness:.15}));m.position.set(v[0]*1.12,v[1]*1.12,v[2]*1.12);group.add(m);}} else {for(let i=0;i<verts.length;i+=9){const m=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),new THREE.MeshStandardMaterial({color:0xffd67a,metalness:.95,roughness:.15}));m.position.set(verts[i],verts[i+1],verts[i+2]).normalize().multiplyScalar(1.64);group.add(m);}}
    } else if(id==='clockwork'){
      for(let r=0;r<3;r++){const tor=new THREE.Mesh(new THREE.TorusGeometry(1.58+r*.08,.035,8,32),new THREE.MeshStandardMaterial({color:r%2?0x8d6b39:0xf5cf84,metalness:.95,roughness:.3}));tor.rotation.set(r===0?0:Math.PI/2,r===2?Math.PI/2:0,r*.55);group.add(tor);} for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const tooth=new THREE.Mesh(new THREE.BoxGeometry(.14,.08,.12),new THREE.MeshStandardMaterial({color:0xd5ad66,metalness:.9,roughness:.32}));tooth.position.set(Math.cos(a)*1.72,Math.sin(a)*1.72,0);tooth.rotation.z=a;group.add(tooth);} addWire(0xf5cf84,.55,1.0);
    } else if(id==='aurora_crystal'){
      addWire(0xbaffd8,.7,1.025); for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.38,5),new THREE.MeshPhysicalMaterial({color:i%2?0xbaffd8:0x79bfff,transparent:true,opacity:.55,transmission:.2,roughness:.05,depthWrite:false}));const dir=new THREE.Vector3(Math.cos(a),((i%3)-1)*.42,Math.sin(a)).normalize();spike.position.copy(dir.clone().multiplyScalar(1.65));spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);group.add(spike);}
    } else if(id==='eclipse_obsidian'){
      const core=new THREE.Mesh(new THREE.SphereGeometry(1.16,24,16),new THREE.MeshStandardMaterial({color:0x050409,roughness:.1,metalness:.75,emissive:0x26062e,emissiveIntensity:.7}));group.add(core);const cres=new THREE.Mesh(new THREE.TorusGeometry(1.73,.075,12,64,Math.PI*1.45),new THREE.MeshBasicMaterial({color:0xd998ff,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false}));cres.rotation.set(.65,.25,.2);group.add(cres);addWire(0x8c54a8,.5,1.02);
    } else if(id==='starseed'){
      addWire(0xf8f29b,.5,1.01);addPoints(26,0xf8f29b,1.52,.07);for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.OctahedronGeometry(.11,0),new THREE.MeshBasicMaterial({color:i%2?0x8dd884:0xf8f29b,transparent:true,opacity:.72,depthWrite:false}));const a=i/7*Math.PI*2;leaf.position.set(Math.cos(a)*1.62,.28*Math.sin(a*2),Math.sin(a)*1.62);group.add(leaf);}
    } else if(id==='neon_prism'){
      [[0x58fff0,1.0],[0xff55e8,1.025],[0x7f71ff,1.05]].forEach(([col,sc],i)=>{const e=addWire(col,.72-i*.12,sc);e.position.set((i-1)*.025,0,(1-i)*.02);});
    } else if(id==='crown_steel'){
      addWire(0xffe29b,.92,1.01);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const dir=new THREE.Vector3(Math.cos(a),.35+Math.sin(a*2)*.15,Math.sin(a)).normalize();const spike=new THREE.Mesh(new THREE.ConeGeometry(.095,.52,4),new THREE.MeshStandardMaterial({color:0xffe29b,metalness:1,roughness:.15}));spike.position.copy(dir.clone().multiplyScalar(1.68));spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);group.add(spike);} const band=new THREE.Mesh(new THREE.TorusGeometry(1.61,.055,10,48),new THREE.MeshStandardMaterial({color:0xcaa45c,metalness:1,roughness:.18}));band.rotation.x=Math.PI/2;group.add(band);
    } else if(id==='rift_shard'){
      addWire(0xffbcf5,.7,1.02);for(let i=0;i<11;i++){const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.12+Math.random()*.1,0),new THREE.MeshPhysicalMaterial({color:i%2?0xffbcf5:0x8b4dff,transparent:true,opacity:.65,roughness:.08,metalness:.35,depthWrite:false}));const dir=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();shard.position.copy(dir.multiplyScalar(1.58+Math.random()*.28));shard.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);group.add(shard);}
    }
  }

  resetHighlights() {
    for (const mat of this.faceMaterials) {
      if (!mat) continue;
      mat.emissive?.setHex?.(0x000000);
      mat.emissiveIntensity = 0;
      mat.clearcoat = 1;
    }
    for (const mat of this.labelMaterials) {
      if (!mat) continue;
      mat.color.set(0xffffff);
      mat.opacity = 1;
    }
    if (this.highlightRing) this.highlightRing.visible = false;
  }

  highlightResult(result) {
    this.resetHighlights();
    const index = Math.max(0, Math.min(this.faceMaterials.length - 1, result - 1));
    const faceMat = this.faceMaterials[index];
    const labelMat = this.labelMaterials[index];
    const skin=this.active?.userData?.skin||{}; const hi=new THREE.Color(skin.accent||'#ffd681');
    if (faceMat) { faceMat.emissive.copy(hi); faceMat.emissiveIntensity = 1.35; faceMat.clearcoat = 1.2; }
    if (labelMat) { labelMat.color.copy(hi); labelMat.opacity = 1; }
    if (!this.highlightRing) {
      this.highlightRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, .08, 18, 72), new THREE.MeshBasicMaterial({ color: 0xffd681, transparent: true, opacity: .72 }));
      this.active.add(this.highlightRing);
    }
    const normal = this.faceNormals[index] || new THREE.Vector3(0, 1, 0);
    this.highlightRing.visible = true;
    this.highlightRing.position.copy(normal.clone().multiplyScalar(1.18));
    this.highlightRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }

  d20(style) {
    const group = new THREE.Group();
    const geom = new THREE.IcosahedronGeometry(1.55, 0).toNonIndexed();
    const pos = geom.attributes.position;
    this.faceNormals = []; this.faceMaterials = []; this.labelMaterials = [];
    const skin = typeof style === 'object' && style ? style : { base: style || '#c24a35' };
    const visual = this.skinVisual(skin);
    const base = new THREE.Color(skin.base || '#c24a35'); const emissive = new THREE.Color(skin.emissive || '#000000'); const labelColor = skin.accent || '#fff9ec';
    const premium = Number(skin.price||0) >= 12;
    for (let f = 0; f < 20; f++) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, f * 3), b = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1), c = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2);
      const tri = new THREE.BufferGeometry().setFromPoints([a, b, c]); tri.computeVertexNormals();
      const tint = base.clone().offsetHSL(0, 0, (f % 4 - 1.5) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(skin.roughness ?? .24), metalness: Number(skin.metalness ?? .36), clearcoat: premium?1.45:1.05, clearcoatRoughness: .08, emissive, emissiveIntensity: skin.id==='classic'?0:(premium?.52:.34), transmission: (skin.id==='aurora_crystal'||skin.id==='nebula_glass')?.06:0 });
      const mesh = new THREE.Mesh(tri, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); this.faceMaterials[f] = mat;
      const center = a.clone().add(b).add(c).divideScalar(3); const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); if (normal.dot(center) < 0) normal.negate(); this.faceNormals.push(normal.clone());
      const label = this.makeLabel(String(f + 1), .44, labelColor, {font:visual.font,weight:visual.weight,stroke:skin.id==='neon_prism'?'#061019':null,strokeWidth:4,shadow:skin.emissive||'rgba(0,0,0,.9)',shadowBlur:skin.id==='classic'?8:14}); label.position.copy(center.clone().add(normal.clone().multiplyScalar(.022))); label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); group.add(label); this.labelMaterials[f] = label.userData.material;
    }
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.556, 0), 1), new THREE.LineBasicMaterial({ color: visual.edge || skin.accent || '#ffe2ba', transparent: true, opacity: premium?.98:.82 })); group.add(edges); this.decorateDie(group,skin,20); return group;
  }

  d6(style) {
    const group = new THREE.Group(); const geom = new THREE.BoxGeometry(2.25, 2.25, 2.25, 1, 1, 1);
    this.faceNormals = []; this.faceMaterials = []; this.labelMaterials = [];
    const skin = typeof style === 'object' && style ? style : { base: style || '#b94836' };
    const visual = this.skinVisual(skin);
    const labelColor = skin.accent || '#fff9ec'; const emissive = new THREE.Color(skin.emissive || '#000000'); const premium = Number(skin.price||0)>=12;
    const faces = [
      { normal: [1, 0, 0], roll: 1 }, { normal: [-1, 0, 0], roll: 6 }, { normal: [0, 1, 0], roll: 2 },
      { normal: [0, -1, 0], roll: 5 }, { normal: [0, 0, 1], roll: 3 }, { normal: [0, 0, -1], roll: 4 },
    ];
    faces.forEach(({ roll }, idx) => {
      const tint = new THREE.Color(skin.base || '#b94836').offsetHSL(0, 0, (idx % 3 - 1) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(skin.roughness ?? .22), metalness: Number(skin.metalness ?? .32), clearcoat: premium?1.45:1.05, clearcoatRoughness: .08, emissive, emissiveIntensity: skin.id==='classic'?0:(premium?.52:.34) });
      this.faceMaterials[roll - 1] = mat;
    });
    const materials = [this.faceMaterials[0], this.faceMaterials[5], this.faceMaterials[1], this.faceMaterials[4], this.faceMaterials[2], this.faceMaterials[3]];
    const cube = new THREE.Mesh(geom, materials); cube.castShadow = true; cube.receiveShadow = true; group.add(cube);
    faces.forEach(({ normal, roll }) => { const v = new THREE.Vector3(...normal); this.faceNormals[roll - 1] = v.clone(); const label = this.makeLabel(String(roll), .72, labelColor, {font:visual.font,weight:visual.weight,stroke:skin.id==='neon_prism'?'#061019':null,strokeWidth:4,shadow:skin.emissive||'rgba(0,0,0,.9)',shadowBlur:skin.id==='classic'?8:14}); label.position.copy(v.clone().multiplyScalar(1.136)); label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v); group.add(label); this.labelMaterials[roll - 1] = label.userData.material; });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: visual.edge || skin.accent || '#ffe6c6', transparent: true, opacity: premium?.98:.84 })); group.add(edges); this.decorateDie(group,skin,6); return group;
  }

  prioritizeDie(die) {
    // Keep the physical die readable even when premium additive FX are active.
    die.scale.multiplyScalar(1.12);
    die.traverse(obj => {
      if (obj.isMesh) {
        obj.renderOrder = obj.userData?.material ? 14 : 12;
        if (obj.material && !Array.isArray(obj.material)) {
          obj.material.depthTest = true;
          if ('depthWrite' in obj.material && !obj.material.transparent) obj.material.depthWrite = true;
        }
      } else if (obj.isLineSegments) {
        obj.renderOrder = 13;
      }
    });
  }

  synthHit(volume = .12, pitch = 90, style = null) {
    try {
      const ctx = this.audio || (this.audio = new AudioContext()); const o = ctx.createOscillator(), g = ctx.createGain();
      const profile = this.fxProfile(style || {}); o.type = profile.tier >= 3 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(pitch * (profile.tier >= 2 ? 1.08 : 1), ctx.currentTime); o.frequency.exponentialRampToValueAtTime(profile.tier >= 3 ? 34 : 42, ctx.currentTime + .09);
      g.gain.setValueAtTime(volume, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .14);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .15);
    } catch {}
  }

  async roll({ sides = 20, result = 1, color = '#b94d36', skin = null, duration = 2600 }) {
    if (this.active) this.scene.remove(this.active);
    this.clearFx();
    const dieStyle = skin || color; const profile = this.fxProfile(typeof dieStyle === 'object' ? dieStyle : { base: dieStyle });
    const die = sides === 6 ? this.d6(dieStyle) : this.d20(dieStyle);
    this.active = die;
    this.active.userData.skin = typeof dieStyle === 'object' ? dieStyle : {base:dieStyle,id:'classic'};
    this.scene.add(die);
    this.prioritizeDie(die);
    die.position.set(-3.2, 2.85, 0);
    die.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.setupRollFx(die, profile);
    const normal = this.faceNormals[Math.max(0, Math.min(this.faceNormals.length - 1, result - 1))] || new THREE.Vector3(0, 1, 0);
    const align = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * Math.PI * 2);
    const finalQ = yaw.multiply(align);
    const start = performance.now(); let lastBounce = -1; let lastNow = start; this.running = true;
    return new Promise(resolve => {
      const frame = now => {
        const dt = Math.min(.05, (now-lastNow)/1000 || .016); lastNow = now;
        const t = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - t, 2.45);
        // A readable tabletop toss: enter high from the left, fall under gravity,
        // then make several diminishing bounces before the result settles.
        const travel = -3.2 + 3.2 * ease;
        const fall = 2.85 * Math.pow(1 - t, 1.75);
        const bounce = Math.abs(Math.sin(t * Math.PI * 6.4)) * .82 * Math.pow(1 - t, 1.15);
        die.position.set(travel, -.02 + fall + bounce, .18 * Math.sin(t * 12.5));
        if (t < .73) { die.rotation.x += .19 * (1 - t) + .03; die.rotation.y += .24 * (1 - t) + .035; die.rotation.z += .16 * (1 - t) + .025; }
        else { const local = (t - .73) / .27; die.quaternion.slerp(finalQ, Math.min(1, local * .12 + .08)); die.quaternion.slerp(finalQ, Math.min(1, local * .23)); }
        this.trailFx(die, profile, dt); this.tickFx(dt, (now-start)/1000);
        const b = Math.floor(t * 5.3); if (b !== lastBounce && t > .08 && t < .9) { lastBounce = b; this.synthHit(.045 + (.9 - t) * .06, 70 + Math.random() * 65, profile); if(profile.tier>=2 && t>.35) this.ring(new THREE.Vector3(die.position.x,-1.4,die.position.z),profile.accent,.08,.8+profile.tier*.25,.25,.28); }
        this.camera.position.x = Math.sin(t * 24) * (1 - t) * (profile.tier>=3?.18:profile.tier===2?.09:.045);
        this.camera.position.y = 4.6 + Math.sin(t*31)*(1-t)*(profile.tier>=3?.055:0);
        this.camera.lookAt(die.position.x * .12, Math.max(.05, die.position.y * .16), 0);
        this.renderer.render(this.scene, this.camera);
        if (t < 1) requestAnimationFrame(frame);
        else {
          die.quaternion.copy(finalQ); die.position.set(0, -.02, 0);
          this.camera.lookAt(0, .05, 0);
          this.highlightResult(result); this.landingFx(profile); this.synthHit(profile.tier>=3?.22:.15, profile.tier>=3?48:55, profile);
          const settleStart=performance.now(); let settleLast=settleStart;
          const settle=ts=>{ const dt2=Math.min(.05,(ts-settleLast)/1000||.016); settleLast=ts; this.tickFx(dt2,(ts-start)/1000); this.renderer.render(this.scene,this.camera); if(ts-settleStart<1050+profile.tier*260) requestAnimationFrame(settle); else { this.running=false; resolve(); } };
          requestAnimationFrame(settle);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}

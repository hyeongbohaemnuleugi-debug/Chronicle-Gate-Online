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
    const rarity = String(style?.rarity || '');
    const legendaryIds = new Set(['neon_prism','celestial_choir','crown_steel','void_monarch','rift_shard','prismatic_tide']);
    const mythicIds = new Set(['mythic_aeon']);
    const heroicIds = new Set(['clockwork','aurora_crystal','eclipse_obsidian','starseed','runic_tempest','phoenix_ember','verdant_relic']);
    const rareIds = new Set(['nebula_glass','abyss_pearl','twilight_gilt']);
    const tier = mythicIds.has(id) || rarity === '신화' ? 4 : legendaryIds.has(id) || rarity === '전설' ? 3 : heroicIds.has(id) || rarity === '영웅' ? 2 : rareIds.has(id) || rarity === '희귀' ? 1 : (price >= 30 ? 4 : price >= 12 ? 3 : price >= 8 ? 2 : price > 0 ? 1 : 0);
    const themes = {
      classic: 'classic', nebula_glass: 'nebula', abyss_pearl: 'abyss', twilight_gilt: 'gilt', clockwork: 'clockwork',
      aurora_crystal: 'aurora', eclipse_obsidian: 'eclipse', starseed: 'starseed', runic_tempest: 'tempest', phoenix_ember: 'phoenix', verdant_relic: 'relic',
      neon_prism: 'neon', celestial_choir: 'celestial', crown_steel: 'crown', void_monarch: 'void', rift_shard: 'rift', prismatic_tide: 'prism', mythic_aeon: 'mythic',
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




  addFloorSigil(profile, pos = new THREE.Vector3(0, -1.455, 0)) {
    const tier = Number(profile?.tier || 0);
    if (tier < 3) return;
    const accent = profile?.accent || '#ffffff';
    const emissive = profile?.emissive || accent;
    const theme = String(profile?.theme || 'arcane');
    const makeMat = (color, opacity = .7) => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const addFlat = (geometry, color, opacity = .65, life = 1.7, rotation = null, position = null, scale = 1) => {
      const obj = new THREE.Mesh(geometry, makeMat(color, opacity));
      obj.position.copy(position || pos);
      obj.rotation.x = -Math.PI / 2;
      if (rotation) {
        obj.rotation.x += rotation.x || 0;
        obj.rotation.y = rotation.y || 0;
        obj.rotation.z += rotation.z || 0;
      }
      obj.scale.setScalar(scale);
      obj.renderOrder = 2;
      this.fxGroup.add(obj);
      this.fxItems.push({ obj, life, maxLife: life, kind: 'ring', start: scale, end: scale * 1.08, opacity });
      return obj;
    };
    const addRotator = (geometry, color, opacity = .55, life = 1.85, spin = .45, scale = 1, rotation = null) => {
      const obj = new THREE.Mesh(geometry, makeMat(color, opacity));
      obj.position.copy(pos);
      obj.rotation.x = -Math.PI / 2;
      if (rotation) {
        obj.rotation.y = rotation.y || 0;
        obj.rotation.z += rotation.z || 0;
      }
      obj.scale.setScalar(scale);
      obj.renderOrder = 3;
      this.fxGroup.add(obj);
      this.fxItems.push({ obj, life, maxLife: life, kind: 'crown', spin: new THREE.Vector3(0, spin, 0) });
      return obj;
    };
    const addRadials = (count, length, width, color, radius, opacity = .5, life = 1.55, tiltOffset = 0) => {
      for (let i = 0; i < count; i++) {
        const a = tiltOffset + i / count * Math.PI * 2;
        const obj = addFlat(new THREE.PlaneGeometry(width, length), color, opacity, life, { y: a }, pos.clone().add(new THREE.Vector3(Math.cos(a) * radius, .001, Math.sin(a) * radius)));
        obj.rotation.z = Math.PI / 2;
      }
    };

    addFlat(new THREE.RingGeometry(1.72, 1.94, 96), accent, tier >= 4 ? .9 : .8, tier >= 4 ? 2.3 : 1.9);
    addFlat(new THREE.RingGeometry(.76, .9, 72), emissive, tier >= 4 ? .76 : .64, tier >= 4 ? 2.2 : 1.75);
    addFlat(new THREE.CircleGeometry(.18, 24), accent, .36, tier >= 4 ? 1.9 : 1.5);

    if (theme === 'celestial') {
      addRotator(new THREE.RingGeometry(1.06, 1.2, 6), 0xfff0c9, .64, 2.0, .16, 1.18);
      addRadials(8, .78, .08, 0x94a7ff, 1.34, .56, 1.9, Math.PI / 8);
      this.flashDisc(pos.clone().add(new THREE.Vector3(0, .06, 0)), 0xffffff, 5.4, .28, .44);
    } else if (theme === 'crown') {
      addRotator(new THREE.RingGeometry(1.08, 1.24, 8), 0xffe29b, .64, 2.0, .15, 1.15);
      addRadials(8, .92, .085, 0xcaa45c, 1.42, .58, 1.88);
      addFlat(new THREE.RingGeometry(.38, .5, 8), 0xfff1c4, .72, 1.8);
    } else if (theme === 'void') {
      addRotator(new THREE.RingGeometry(1.0, 1.15, 5, 48, Math.PI * 1.42), 0xff9af2, .6, 2.0, -.18, 1.22, { y: .4 });
      addRotator(new THREE.RingGeometry(1.34, 1.48, 5, 48, Math.PI * 1.16), 0x7b31cf, .48, 2.05, .22, 1.12, { y: 1.3 });
      addFlat(new THREE.CircleGeometry(.3, 24), 0x1b0930, .46, 1.9);
    } else if (theme === 'rift') {
      addRotator(new THREE.RingGeometry(1.02, 1.2, 10), 0xffbcf5, .48, 1.95, .1, 1.14);
      addRadials(7, .82, .06, 0x8b4dff, 1.38, .54, 1.75, .2);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + .2;
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.12 + Math.random() * .03, 0), makeMat(i % 2 ? 0xffbcf5 : 0x8b4dff, .82));
        shard.position.copy(pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.5, .04, Math.sin(a) * 1.5)));
        shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        shard.renderOrder = 7;
        this.fxGroup.add(shard);
        this.fxItems.push({ obj: shard, life: 1.8, maxLife: 1.8, kind: 'crown', spin: new THREE.Vector3(.45, .3, .55) });
      }
    } else if (theme === 'prism') {
      addRotator(new THREE.RingGeometry(1.02, 1.18, 6), 0x7ffcff, .52, 2.0, .16, 1.12);
      addRadials(6, .86, .08, 0xffffff, 1.3, .52, 1.78, Math.PI / 6);
      addRadials(6, .74, .05, 0xff4ecb, .98, .46, 1.68);
    } else if (theme === 'mythic') {
      addRotator(new THREE.RingGeometry(.94, 1.08, 12), 0xffffff, .76, 2.55, .18, 1.28);
      addRotator(new THREE.RingGeometry(1.22, 1.36, 8), 0xff78df, .6, 2.45, -.15, 1.2, { y: .18 });
      addRotator(new THREE.RingGeometry(1.54, 1.68, 16), 0x63f8ff, .5, 2.6, .1, 1.08, { y: .45 });
      addRadials(12, 1.12, .08, 0xfff6bf, 1.56, .58, 2.3, Math.PI / 12);
      addRadials(6, .95, .12, 0xb089ff, .8, .46, 2.1);
      this.flashDisc(pos.clone().add(new THREE.Vector3(0, .07, 0)), 0xffffff, 7.2, .34, .5);
    } else {
      addRotator(new THREE.RingGeometry(1.04, 1.18, 6), accent, .52, 1.9, .16, 1.12);
      addRadials(6, .82, .06, emissive, 1.24, .48, 1.65);
    }
  }


  setupRollFx(die, profile) {
    this.clearFx();
    if (!profile.tier) return;
    const accent = new THREE.Color(profile.accent);
    const emissive = new THREE.Color(profile.emissive || profile.accent);
    const tier = Number(profile.tier || 0);
    const orbCount = tier >= 4 ? 10 : tier === 3 ? 7 : tier === 2 ? 5 : 3;
    const orbSize = tier >= 4 ? .29 : tier === 3 ? .24 : .17;
    for (let i = 0; i < orbCount; i++) this.addOrbiter(die, i % 2 ? accent : emissive, 1.75 + (i % 4) * .18, .78 + i * .11, (i % 2 ? .32 : -.18), i * .75, orbSize);
    if (tier >= 2) this.addHalo(die, accent, 1.85, tier >= 4 ? .42 : tier === 3 ? .34 : .28);
    this.addAuraField(die, [accent, emissive], tier >= 4 ? 760 : tier === 3 ? 520 : tier === 2 ? 380 : 220, tier >= 4 ? 3.35 : tier === 3 ? 2.95 : 2.35, tier >= 4 ? .155 : tier === 3 ? .135 : .105, tier >= 4 ? .82 : tier === 3 ? .62 : .38);
    if (tier >= 3) {
      const h2 = this.addHalo(die, emissive, tier >= 4 ? 2.32 : 2.2, tier >= 4 ? .28 : .18); h2.rotation.y = Math.PI / 2;
      this.addAuraField(die, [profile.accent, profile.emissive || profile.accent, '#ffffff'], tier >= 4 ? 620 : 420, tier >= 4 ? 3.95 : 3.55, tier >= 4 ? .11 : .085, tier >= 4 ? -.68 : -.48);
    }
    if (tier >= 4) {
      const h3 = this.addHalo(die, '#ffffff', 2.72, .16); h3.rotation.set(.62, .25, .18);
      const h4 = this.addHalo(die, profile.accent, 3.05, .12); h4.rotation.set(-.48, .82, .4);
      this.addAuraField(die, ['#ffffff', profile.accent, profile.emissive || profile.accent, '#ff8df1'], 420, 4.1, .085, .72);
      for (let i = 0; i < 6; i++) this.addOrbiter(die, i % 2 ? '#ffffff' : accent, 2.7 + (i % 3) * .18, 1.25 + i * .08, -.55 + i * .2, i * .8, .14 + (i % 2) * .04);
    }
    if (profile.theme === 'clockwork') {
      for (let i = 0; i < 2; i++) {
        const m = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false });
        const g = new THREE.Mesh(new THREE.TorusGeometry(1.9 + i * .22, .025, 8, 16), m); g.userData.die = die; g.userData.gear = true; g.userData.speed = i ? -1.6 : 1.2; g.rotation.x = i ? .7 : 1.1; this.fxGroup.add(g); this.fxOrbiters.push(g);
      }
    }
    if (profile.theme === 'nebula') {
      [0xd9d0ff,0x8c78ff,0xffb7f5].forEach((col,i)=>{ const h=this.addHalo(die,col,1.9+i*.22,.2+i*.03); h.rotation.set(.25+i*.3,.55*i,.8*i); });
      this.addOrbiter(die,0xd9d0ff,2.15,.55,.25,0,.18); this.addOrbiter(die,0x8c78ff,2.55,-.42,-.15,2.1,.13); this.addOrbiter(die,0xffb7f5,2.85,.3,.05,1.2,.11);
    }
    if (profile.theme === 'abyss') {
      this.addHalo(die,0x8eefff,2.0,.18); const h=this.addHalo(die,0x6ee6ff,2.36,.12); h.rotation.y=.75;
      this.addOrbiter(die,0xbaf8ff,1.8,.35,-.55,1.2,.14); this.addOrbiter(die,0x78dbf8,2.2,.26,.62,2.4,.12);
    }
    if (profile.theme === 'gilt') {
      const h=this.addHalo(die,0xffd67a,2.05,.32); h.rotation.x=.35; const h2=this.addHalo(die,0xfff2c2,2.42,.14); h2.rotation.set(.55,.15,.25);
      [0xff8c5a,0xffd67a,0xffe6aa].forEach((c,i)=>this.addOrbiter(die,c,2.18+i*.18,.54+i*.15,.3-i*.18,.5+i*.8,.12+i*.015));
    }
    if (profile.theme === 'aurora') {
      const h=this.addHalo(die,0xbaffd8,2.15,.22); h.rotation.y=.85; const h2=this.addHalo(die,0x79bfff,2.48,.16); h2.rotation.set(.15,1.2,.62);
      this.addOrbiter(die,0x79bfff,2.45,.48,.35,2.4,.16); this.addOrbiter(die,0xbaffd8,2.72,.36,-.18,.8,.14);
    }
    if (profile.theme === 'eclipse') {
      const h=this.addHalo(die,0xd998ff,2.25,.28); h.rotation.x=.82; const h2=this.addHalo(die,0x4c1764,1.72,.22); h2.rotation.set(.22,.5,1.05);
      this.addOrbiter(die,0x4c1764,1.75,-.35,0,1.7,.22); this.addOrbiter(die,0xd998ff,2.42,.48,.12,3.2,.12);
    }
    if (profile.theme === 'starseed') {
      this.addOrbiter(die,0xf8f29b,2.0,.42,.45,.3,.18); this.addOrbiter(die,0x8ed88a,2.35,-.3,-.25,2.7,.13); this.addOrbiter(die,0xffffff,2.64,.22,.05,1.1,.1);
    }
    if (profile.theme === 'neon') {
      [0x58fff0,0xff55e8,0x7f71ff].forEach((col,i)=>{const h=this.addHalo(die,col,1.85+i*.18,.23);h.rotation.set(.35*i,.55*i,.8*i);});
      this.addOrbiter(die,0x58fff0,2.3,.95,.1,.4,.14); this.addOrbiter(die,0xff55e8,2.56,.82,-.25,1.7,.12);
    }
    if (profile.theme === 'crown') {
      const h=this.addHalo(die,0xffe29b,2.15,.34);h.rotation.x=.45; const h2=this.addHalo(die,0xcaa45c,2.44,.16); h2.rotation.y=.8;
      this.addOrbiter(die,0xffc851,2.45,.72,.4,0,.16); this.addOrbiter(die,0xffe29b,2.72,.52,.72,2.2,.12);
    }
    if (profile.theme === 'rift') {
      for(let i=0;i<4;i++){const h=this.addHalo(die,i%2?0xffbcf5:0x8b4dff,1.9+i*.22,.2);h.rotation.set(.4+i*.5,.2+i*.7,.3+i*.35);} 
      this.addOrbiter(die,0xffbcf5,2.5,.78,.15,.8,.13);
    }
    if (profile.theme === 'tempest') {
      [0xd7f1ff,0x7ab4ff,0x6c8cff].forEach((col,i)=>{const h=this.addHalo(die,col,1.95+i*.22,.24);h.rotation.set(.45*i,.25+i*.4,.8+i*.25);});
      this.addOrbiter(die,0xd7f1ff,2.5,.9,.18,0,.17); this.addOrbiter(die,0x7ab4ff,2.82,1.18,-.28,1.7,.11);
    }
    if (profile.theme === 'phoenix') {
      const h=this.addHalo(die,0xffcf7a,2.12,.28); h.rotation.x=.8; const h2=this.addHalo(die,0xff7d4f,2.42,.14); h2.rotation.set(.4,.1,.55);
      this.addOrbiter(die,0xff7d4f,2.35,.58,.42,1.2,.18); this.addOrbiter(die,0xffcf7a,2.62,.76,-.15,2.5,.14);
    }
    if (profile.theme === 'relic') {
      const h=this.addHalo(die,0xdcffd1,2.08,.26); h.rotation.y=.55; const h2=this.addHalo(die,0x8cff9f,2.32,.14); h2.rotation.set(.7,.2,.7);
      this.addOrbiter(die,0x8cff9f,2.32,-.35,-.2,2.3,.15); this.addOrbiter(die,0xdcffd1,2.56,.42,.25,.8,.12);
    }
    if (profile.theme === 'celestial') {
      [0xfff0c9,0x94a7ff,0xffffff].forEach((col,i)=>{const h=this.addHalo(die,col,1.9+i*.28,.24);h.rotation.set(Math.PI/2*(i%2),i*.45,.2+i*.35);});
      this.addOrbiter(die,0xfff0c9,2.42,.44,.55,.5,.14); this.addOrbiter(die,0x94a7ff,2.68,.38,-.18,2.1,.12);
    }
    if (profile.theme === 'void') {
      for(let i=0;i<4;i++){const h=this.addHalo(die,i%2?0xff9af2:0x7b31cf,2.0+i*.2,.2);h.rotation.set(.35+i*.4,.5+i*.45,.1+i*.3);} 
      this.addOrbiter(die,0xff9af2,2.4,.62,.12,.8,.12);
    }
    if (profile.theme === 'prism') {
      [0x7ffcff,0xff4ecb,0x7c8dff,0xffffff].forEach((col,i)=>{const h=this.addHalo(die,col,1.9+i*.18,.22);h.rotation.set(.25*i,.65*i,.42*i);});
      this.addOrbiter(die,0x7ffcff,2.28,.92,.15,.25,.14); this.addOrbiter(die,0xff4ecb,2.56,.78,-.2,1.35,.12); this.addOrbiter(die,0xffffff,2.84,.58,.45,2.4,.1);
    }
    if (profile.theme === 'mythic') {
      [0xfff6bf,0x63f8ff,0xff78df,0xffffff,0xb089ff].forEach((col,i)=>{const h=this.addHalo(die,col,1.86+i*.2,.24-(i*.015));h.rotation.set(.35*i,.6*i,.9*i);});
      this.addAuraField(die,[0xfff6bf,0x63f8ff,0xff78df,0xffffff],1180,4.15,.105,.84);
      [0xfff6bf,0x63f8ff,0xff78df,0xffffff].forEach((c,i)=>this.addOrbiter(die,c,2.4+i*.22,1.0+i*.12,-.3+i*.22,.6+i*.9,.14+(i%2)*.03));
    }
  }

  trailFx(die, profile, dt) {
    if (!profile.tier) return;
    this.fxTrailClock += dt;
    const interval = profile.tier >= 4 ? .014 : profile.tier === 3 ? .022 : profile.tier === 2 ? .055 : .09;
    if (this.fxTrailClock < interval) return;
    this.fxTrailClock = 0;
    const basePos = die.position.clone();
    const accent = new THREE.Color(profile.accent);
    const secondary = new THREE.Color(profile.emissive || profile.accent);
    const count = profile.tier >= 4 ? 5 : profile.tier === 3 ? 4 : profile.tier === 2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const p = basePos.clone().add(new THREE.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * .8, (Math.random() - .5) * .8));
      const c = i % 2 ? secondary : accent;
      const velocity = new THREE.Vector3(-.15 - Math.random() * .55, .18 + Math.random() * .4, (Math.random() - .5) * .35);
      this.addSprite(p, c, profile.tier >= 4 ? .34 : profile.tier === 3 ? .28 : .2, .35 + Math.random() * .3 + (profile.tier >= 4 ? .12 : 0), velocity.multiplyScalar(profile.tier >= 4 ? 1.2 : 1), .15);
    }
    if (profile.tier >= 3 && Math.random() < .55) this.addSprite(basePos.clone(), Math.random() < .5 ? accent : secondary, profile.tier >= 4 ? .18 : .14, profile.tier >= 4 ? .95 : .7, new THREE.Vector3((Math.random()-.5)*.42, .48+Math.random()*.55, (Math.random()-.5)*.42), -.03);
    if (profile.tier >= 4 && Math.random() < .6) this.addSprite(basePos.clone().add(new THREE.Vector3((Math.random()-.5)*.15,(Math.random()-.5)*.15,(Math.random()-.5)*.15)), 0xffffff, .14 + Math.random() * .06, .9, new THREE.Vector3((Math.random()-.5)*.35, .8+Math.random()*.55, (Math.random()-.5)*.35), -.02);
    if (profile.theme === 'abyss' && Math.random() < .5) this.addSprite(basePos.clone().add(new THREE.Vector3(0, -.5, 0)), 0xa7f4ff, .13, .82, new THREE.Vector3((Math.random()-.5)*.2, .8+Math.random()*.55, (Math.random()-.5)*.2), -.05);
    if (profile.theme === 'starseed' && Math.random() < .45) this.addSprite(basePos.clone(), Math.random()<.75?0xf8f29b:0x8ed88a, .12+.02*Math.random(), .72, new THREE.Vector3((Math.random()-.5)*.4, .32+Math.random()*.35, (Math.random()-.5)*.4), .25);
    if (profile.theme === 'nebula' && Math.random()<.55) this.addSprite(basePos.clone(),[0xd9d0ff,0x806dff,0xffb7f5][Math.floor(Math.random()*3)],.14,.86,new THREE.Vector3(-.28,.14,(Math.random()-.5)*.5),.04);
    if (profile.theme === 'gilt' && Math.random()<.52) this.addSprite(basePos.clone(),Math.random()<.6?0xffd67a:0xff7b55,.13,.62,new THREE.Vector3(-.68,.42,(Math.random()-.5)*.25),.5);
    if (profile.theme === 'clockwork' && Math.random()<.34) this.shardBurst(basePos.clone(),Math.random()<.5?0xf5cf84:0xb78948,2,.42);
    if (profile.theme === 'aurora' && Math.random()<.48) this.addSprite(basePos.clone(),Math.random()<.5?0xbaffd8:0x79bfff,.18,.92,new THREE.Vector3(-.25,.72,(Math.random()-.5)*.35),-.08);
    if (profile.theme === 'eclipse' && Math.random()<.42) this.addSprite(basePos.clone(),Math.random()<.5?0xd998ff:0x4c1764,.16,.78,new THREE.Vector3(-.2,.05,(Math.random()-.5)*.3),.1);
    if (profile.theme === 'neon' && Math.random()<.72) this.addSprite(basePos.clone(),[0x58fff0,0xff55e8,0x7f71ff,0x53ff8c][Math.floor(Math.random()*4)],.15,.56,new THREE.Vector3(-.82,.12,(Math.random()-.5)*.25),.05);
    if (profile.theme === 'crown' && Math.random()<.5) this.addSprite(basePos.clone(),Math.random()<.7?0xffe29b:0xcaa45c,.14,.62,new THREE.Vector3(-.42,.55,(Math.random()-.5)*.25),.4);
    if (profile.theme === 'rift' && Math.random()<.58) this.addSprite(basePos.clone(),Math.random()<.5?0xffbcf5:0x8b4dff,.17,.62,new THREE.Vector3(-.45,(Math.random()-.5)*.4,(Math.random()-.5)*.78),.1);
    if (profile.theme === 'tempest' && Math.random()<.62) this.addSprite(basePos.clone(),Math.random()<.5?0xd7f1ff:0x7ab4ff,.16,.64,new THREE.Vector3(-.62,.22,(Math.random()-.5)*.6),.06);
    if (profile.theme === 'phoenix' && Math.random()<.62) this.addSprite(basePos.clone(),Math.random()<.5?0xffcf7a:0xff7d4f,.18,.82,new THREE.Vector3(-.18,.92,(Math.random()-.5)*.28),-.12);
    if (profile.theme === 'relic' && Math.random()<.46) this.addSprite(basePos.clone(),Math.random()<.5?0xdcffd1:0x8cff9f,.16,.84,new THREE.Vector3(-.22,.38,(Math.random()-.5)*.3),.12);
    if (profile.theme === 'celestial' && Math.random()<.58) this.addSprite(basePos.clone(),Math.random()<.55?0xfff0c9:0x94a7ff,.17,.78,new THREE.Vector3(-.35,.5,(Math.random()-.5)*.3),.08);
    if (profile.theme === 'void' && Math.random()<.56) this.addSprite(basePos.clone(),Math.random()<.5?0xff9af2:0x7b31cf,.18,.72,new THREE.Vector3(-.28,.18,(Math.random()-.5)*.45),.06);
    if (profile.theme === 'prism' && Math.random()<.72) this.addSprite(basePos.clone(),[0x7ffcff,0xff4ecb,0x7c8dff,0xffffff][Math.floor(Math.random()*4)],.17,.7,new THREE.Vector3(-.7,.22,(Math.random()-.5)*.45),.06);
    if (profile.theme === 'mythic' && Math.random()<.82) this.addSprite(basePos.clone(),[0xfff6bf,0x63f8ff,0xff78df,0xffffff,0xb089ff][Math.floor(Math.random()*5)],.22,.94,new THREE.Vector3(-.48,.65,(Math.random()-.5)*.45),.03);
  }

  landingFx(profile) {
    if (!profile.tier) return;
    const p = new THREE.Vector3(0, -1.39, 0);
    const accent = new THREE.Color(profile.accent);
    const emissive = new THREE.Color(profile.emissive || profile.accent);
    const tier = Number(profile.tier || 0);
    this.ring(p, accent, .25, tier >= 4 ? 7.4 : tier === 3 ? 6.7 : tier === 2 ? 4.5 : 3.4, tier >= 4 ? 1.08 : tier === 3 ? .95 : .7, .88);
    if (tier >= 2) this.ring(p.clone().add(new THREE.Vector3(0,.015,0)), emissive, .2, tier >= 4 ? 6.1 : tier === 3 ? 5.4 : 3.8, tier >= 4 ? 1.02 : .85, .62);
    this.burst(new THREE.Vector3(0, -.9, 0), accent, tier >= 4 ? 62 : tier === 3 ? 52 : tier === 2 ? 24 : 14, tier >= 4 ? 5.6 : tier === 3 ? 4.7 : 2.8, tier >= 4 ? .36 : tier === 3 ? .32 : .23, tier >= 4 ? 1.45 : tier === 3 ? 1.2 : .85, tier >= 4 ? 1.05 : .8);
    if (tier >= 2) this.shardBurst(new THREE.Vector3(0, -.65, 0), emissive, tier >= 4 ? 34 : tier === 3 ? 28 : 10, tier >= 4 ? 1.75 : tier === 3 ? 1.45 : .95);

    // Ultra-dense batched particles: thousands of visible sparks in only a few draw calls.
    const cloudColors=[accent,emissive,new THREE.Color(0xffffff)];
    if (tier >= 3) this.addFloorSigil(profile, p.clone().add(new THREE.Vector3(0, .02, 0)));
    if (tier===1) this.cloudBurst(new THREE.Vector3(0,-1.0,0),cloudColors,360,3.0,.95,.10,.45,.3);
    if (tier===2) {
      this.cloudBurst(new THREE.Vector3(0,-.95,0),cloudColors,820,4.5,1.2,.115,.75,.38);
      this.flashDisc(new THREE.Vector3(0,-.35,0),accent,4.6,.34,.72);
    }
    if (tier===3) {
      this.cloudBurst(new THREE.Vector3(0,-.92,0),cloudColors,1200,5.3,1.55,.125,1.0,.42);
      this.cloudBurst(new THREE.Vector3(0,-.72,0),[emissive,accent,'#ffffff'],760,3.5,1.8,.095,1.5,.28);
      this.flashDisc(new THREE.Vector3(0,-.2,0),0xffffff,9.6,.32,.96);
      this.flashDisc(new THREE.Vector3(0,-.1,0),accent,7.2,.72,.78);
      for(let i=0;i<6;i++) this.ring(p.clone().add(new THREE.Vector3(0,.02*i,0)),i%2?emissive:accent,.14+i*.05,7.1+i*.95,.8+i*.11,.52);
    }
    if (tier>=4) {
      this.cloudBurst(new THREE.Vector3(0,-.9,0),[accent,emissive,new THREE.Color('#ffffff')],1600,6.4,1.95,.14,1.22,.42);
      this.cloudBurst(new THREE.Vector3(0,-.58,0),[new THREE.Color('#ffffff'),accent,emissive,new THREE.Color('#ff8df1')],980,4.3,2.15,.1,1.8,.28);
      this.flashDisc(new THREE.Vector3(0,-.16,0),0xffffff,12.6,.36,1.0);
      this.flashDisc(new THREE.Vector3(0,-.05,0),accent,9.8,.78,.82);
      this.flashDisc(new THREE.Vector3(0,.15,0),emissive,7.4,.98,.45);
      for(let i=0;i<9;i++) this.ring(p.clone().add(new THREE.Vector3(0,.022*i,0)),i%3===0?'#ffffff':i%2?emissive:accent,.16+i*.05,7.8+i*1.02,.9+i*.12,.58,Math.PI/2*(i%2));
      for(let i=0;i<28;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*4.8,-.92+(Math.random()-.5)*.35,(Math.random()-.5)*3.4), i%4===0?0xffffff:i%3===0?0xff8df1:i%2?profile.accent:profile.emissive, .2+Math.random()*.08, 1.4+Math.random()*.35, new THREE.Vector3((Math.random()-.5)*.32,1.1+Math.random()*1.9,(Math.random()-.5)*.32), .02);
    }

    if (profile.theme === 'eclipse') {
      this.ring(new THREE.Vector3(0, .15, 0), 0xd998ff, .2, 2.9, 1.15, .95, Math.PI / 2);
      const dark = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.getGlowTexture(), color: 0x3a0d4f, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      dark.position.set(0,.1,0); dark.scale.setScalar(3.3); this.fxGroup.add(dark); this.fxItems.push({obj:dark,life:1.05,maxLife:1.05,kind:'sprite',velocity:new THREE.Vector3(),gravity:0,baseScale:3.3});
      this.flashDisc(new THREE.Vector3(0,.08,0),0xd998ff,5.8,.46,.6);
    }
    if (profile.theme === 'neon') {
      const colors = [0x58fff0,0xff55e8,0x7f71ff,0x53ff8c];
      colors.forEach((c,i)=>this.ring(p.clone().add(new THREE.Vector3(0,i*.012,0)),c,.18+i*.05,6.8-i*.35,.88+i*.1,.62));
      this.cloudBurst(new THREE.Vector3(0,-.75,0),colors,1500,5.6,1.7,.12,1.2,.25);
      this.flashDisc(new THREE.Vector3(0,-.15,0),0xffffff,8.0,.28,.65);
    }
    if (profile.theme === 'crown') {
      for (let i=0;i<12;i++) {
        const a=i/12*Math.PI*2; const pos=new THREE.Vector3(Math.cos(a)*1.55,-.9,Math.sin(a)*1.55);
        const geom=new THREE.ConeGeometry(.13,.8,4); const mat=new THREE.MeshBasicMaterial({color:0xffe29b,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
        const obj=new THREE.Mesh(geom,mat); obj.position.copy(pos); obj.rotation.z=Math.PI; this.fxGroup.add(obj); this.fxItems.push({obj,life:1.1,maxLife:1.1,kind:'crown'});
      }
      this.flashDisc(new THREE.Vector3(0,-.4,0),0xffe29b,5.8,.48,.6);
    }
    if (profile.theme === 'rift') {
      for (let i=0;i<9;i++) this.ring(new THREE.Vector3(0,-.15+i*.08,0), i%2?0xffbcf5:0x8b4dff, .15+i*.05, 3.3+i*.5, .95+i*.08, .55, Math.PI/2 + (i-.2)*.15);
      this.shardBurst(new THREE.Vector3(0,-.58,0),0xffbcf5,18,1.25);
    }
    if (profile.theme === 'aurora') {
      this.cloudBurst(new THREE.Vector3(0,-1.05,0),[0xbaffd8,0x79bfff,0xffd9ff],1350,3.8,1.95,.12,1.95,.55);
      for (let i=0;i<34;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*4,-1.2,(Math.random()-.5)*2.6), i%2?0xbaffd8:0x79bfff, .24, 1.42, new THREE.Vector3((Math.random()-.5)*.3,1.25+Math.random()*1.8,(Math.random()-.5)*.25), -.05);
      this.flashDisc(new THREE.Vector3(0,-.18,0),0xbaffd8,6.6,.42,.48);
    }
    if (profile.theme === 'nebula') { this.cloudBurst(new THREE.Vector3(0,-.8,0),[0xd9d0ff,0x806dff,0xffb7f5],980,4.2,1.65,.105,1.05,.75); for(let i=0;i<6;i++) this.ring(p.clone().add(new THREE.Vector3(0,.04*i,0)),i%2?0xd9d0ff:0x806dff,.12+i*.05,4.0+i*.68,.96+i*.08,.36,Math.PI/2*(i%2)); }
    if (profile.theme === 'abyss') { for(let i=0;i<40;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*3,-1.25,(Math.random()-.5)*2),Math.random()<.7?0xbaf8ff:0x6ee6ff,.1+Math.random()*.13,1.3+Math.random()*.65,new THREE.Vector3((Math.random()-.5)*.15,.85+Math.random()*1.35,(Math.random()-.5)*.15),-.03); this.ring(p,0x6ee6ff,.2,5.6,1.2,.52); }
    if (profile.theme === 'gilt') { this.cloudBurst(new THREE.Vector3(0,-.9,0),[0xffd67a,0xff8c5a,0xfff2c2],860,4.9,1.15,.1,1.15,.45); for(let i=0;i<4;i++) this.ring(p.clone().add(new THREE.Vector3(0,.025*i,0)),i===1?0xff7d50:0xffd67a,.16+i*.08,4.7+i*.84,.78+i*.12,.54); }
    if (profile.theme === 'clockwork') { for(let i=0;i<5;i++){const m=new THREE.MeshBasicMaterial({color:i%2?0xb78948:0xf5cf84,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false});const g=new THREE.Mesh(new THREE.TorusGeometry(.65+i*.18,.035,8,18),m);g.position.set(0,-.7+i*.12,0);g.rotation.set(Math.PI/2,i*.4,i*.6);this.fxGroup.add(g);this.fxItems.push({obj:g,life:1.18,maxLife:1.18,kind:'crown'});} this.shardBurst(new THREE.Vector3(0,-.65,0),0xf5cf84,22,1.06); }
    if (profile.theme === 'starseed') { this.cloudBurst(new THREE.Vector3(0,-.85,0),[0xf8f29b,0x8ed88a,0xffffff],980,4.0,1.7,.11,1.35,.5); for(let i=0;i<22;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*3.4,-1.05,(Math.random()-.5)*2.5),i%3?0xf8f29b:0x8ed88a,.16,1.45,new THREE.Vector3((Math.random()-.5)*.25,.78+Math.random()*1.5,(Math.random()-.5)*.25),.1); }
    if (profile.theme === 'tempest') { this.cloudBurst(new THREE.Vector3(0,-.88,0),[0xd7f1ff,0x7ab4ff,0xffffff],1320,5.3,1.45,.105,1.15,.4); for(let i=0;i<7;i++) this.ring(p.clone().add(new THREE.Vector3(0,.03*i,0)),i%2?0x7ab4ff:0xd7f1ff,.13+i*.05,4.5+i*.62,.82+i*.08,.46,Math.PI/2+(.2*i)); this.flashDisc(new THREE.Vector3(0,-.08,0),0xffffff,8.2,.22,.82); }
    if (profile.theme === 'phoenix') { this.cloudBurst(new THREE.Vector3(0,-.86,0),[0xffcf7a,0xff7d4f,0xffffff],1420,5.1,1.55,.11,1.45,.34); for(let i=0;i<26;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*3.2,-1.05,(Math.random()-.5)*2.2),i%2?0xffcf7a:0xff7d4f,.18,1.28,new THREE.Vector3((Math.random()-.5)*.2,1.18+Math.random()*1.8,(Math.random()-.5)*.2),-.08); }
    if (profile.theme === 'relic') { this.cloudBurst(new THREE.Vector3(0,-.9,0),[0xdcffd1,0x8cff9f,0xffffff],1120,3.8,1.7,.1,1.15,.42); for(let i=0;i<5;i++) this.ring(p.clone().add(new THREE.Vector3(0,.05*i,0)),i%2?0x8cff9f:0xdcffd1,.14+i*.05,3.8+i*.52,1.02+i*.08,.42); }
    if (profile.theme === 'celestial') { this.cloudBurst(new THREE.Vector3(0,-.8,0),[0xfff0c9,0x94a7ff,0xffffff],1480,5.3,1.58,.115,1.18,.28); for(let i=0;i<8;i++) this.ring(p.clone().add(new THREE.Vector3(0,.03*i,0)),i%2?0x94a7ff:0xfff0c9,.14+i*.05,4.9+i*.58,.94+i*.1,.54,Math.PI/2*(i%2)); this.flashDisc(new THREE.Vector3(0,-.04,0),0xffffff,7.6,.3,.58); }
    if (profile.theme === 'void') { this.cloudBurst(new THREE.Vector3(0,-.82,0),[0xff9af2,0x7b31cf,0x1b0930],1360,5.5,1.65,.11,1.2,.3); for(let i=0;i<7;i++) this.ring(new THREE.Vector3(0,-.08+i*.06,0), i%2?0xff9af2:0x7b31cf, .14+i*.05, 3.8+i*.58, 1.0+i*.1, .54, Math.PI/2 + i*.18); }
    if (profile.theme === 'prism') { this.cloudBurst(new THREE.Vector3(0,-.8,0),[0x7ffcff,0xff4ecb,0x7c8dff,0xffffff],1680,5.7,1.72,.12,1.25,.26); [0x7ffcff,0xff4ecb,0x7c8dff,0xffffff].forEach((c,i)=>this.ring(p.clone().add(new THREE.Vector3(0,.015*i,0)),c,.16+i*.04,5.5+i*.48,.92+i*.08,.52)); this.shardBurst(new THREE.Vector3(0,-.55,0),0xffffff,20,1.3); }
    if (profile.theme === 'mythic') { this.cloudBurst(new THREE.Vector3(0,-.76,0),[0xfff6bf,0x63f8ff,0xff78df,0xffffff],3600,9.6,2.45,.145,1.95,.36); this.cloudBurst(new THREE.Vector3(0,-.44,0),[0x63f8ff,0xfff6bf,0xff78df,0xffffff],2500,6.5,2.95,.115,2.45,.28); [0xfff6bf,0x63f8ff,0xff78df,0xffffff,0xb089ff].forEach((c,i)=>this.ring(p.clone().add(new THREE.Vector3(0,.024*i,0)),c,.16+i*.05,7.8+i*.9,1.12+i*.12,.66,Math.PI/2*(i%2))); this.flashDisc(new THREE.Vector3(0,0,0),0xffffff,14.8,.4,1.0); this.flashDisc(new THREE.Vector3(0,.12,0),0x63f8ff,10.8,.76,.66); for(let i=0;i<54;i++) this.addSprite(new THREE.Vector3((Math.random()-.5)*5.4,-1.02+(Math.random()-.5)*.25,(Math.random()-.5)*3.9), [0xfff6bf,0x63f8ff,0xff78df,0xffffff,0xb089ff][i%5], .24+Math.random()*.1, 1.9+Math.random()*.48, new THREE.Vector3((Math.random()-.5)*.38,1.45+Math.random()*2.2,(Math.random()-.5)*.38), .02); }
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
      runic_tempest:{font:'Arial Black',weight:'900',scale:1.05,edge:'#d7f1ff',shell:'storm-runes'},
      phoenix_ember:{font:'Georgia',weight:'900',scale:1.05,edge:'#ffcf7a',shell:'ember-feather'},
      verdant_relic:{font:'Trebuchet MS',weight:'900',scale:1.05,edge:'#dcffd1',shell:'jade-vines'},
      neon_prism:{font:'Arial Black',weight:'900',scale:1.04,edge:'#58fff0',shell:'neon-wire'},
      celestial_choir:{font:'Georgia',weight:'900',scale:1.06,edge:'#fff0c9',shell:'halo-feathers'},
      crown_steel:{font:'Georgia',weight:'900',scale:1.05,edge:'#ffe29b',shell:'royal-spikes'},
      void_monarch:{font:'Arial Black',weight:'900',scale:1.06,edge:'#ff9af2',shell:'void-crown'},
      rift_shard:{font:'Trebuchet MS',weight:'900',scale:1.06,edge:'#ffbcf5',shell:'fractured-shell'},
      prismatic_tide:{font:'Arial Black',weight:'900',scale:1.07,edge:'#7ffcff',shell:'prism-wave'},
      mythic_aeon:{font:'Arial Black',weight:'900',scale:1.1,edge:'#fff6bf',shell:'aeon-nova'},
    };
    return map[id]||map.classic;
  }


  prepareLegendaryCore(group, skin = {}, sides = 20) {
    // Keep the numbered physical die fully readable. Legendary/mythic silhouettes
    // are added outside the core instead of shrinking or hiding it.
    return group;
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
    } else if(id==='runic_tempest'){
      [0xd7f1ff,0x8ac8ff,0x6c8cff].forEach((col,i)=>{ const e=addWire(col,.76-i*.16,1.01+i*.02); e.rotation.set(i*.35,i*.6,i*.22); });
      for(let i=0;i<9;i++){ const ring=new THREE.Mesh(new THREE.TorusGeometry(1.48+i*.03,.03,8,36,Math.PI*(1.15+Math.random()*.55)),new THREE.MeshBasicMaterial({color:i%2?0xd7f1ff:0x7ab4ff,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false})); ring.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI); group.add(ring); }
      addPoints(34,0xd7f1ff,1.58,.065);
    } else if(id==='phoenix_ember'){
      addWire(0xffcf7a,.72,1.02); addPoints(20,0xffcf7a,1.46,.075);
      for(let i=0;i<12;i++){ const feather=new THREE.Mesh(new THREE.ConeGeometry(.055,.4,5),new THREE.MeshPhysicalMaterial({color:i%2?0xffcf7a:0xff7d4f,transparent:true,opacity:.72,roughness:.08,metalness:.22,emissive:0x8e2d15,emissiveIntensity:.45,depthWrite:false})); const a=i/12*Math.PI*2; const dir=new THREE.Vector3(Math.cos(a),-.18+Math.sin(a*2)*.3,Math.sin(a)).normalize(); feather.position.copy(dir.clone().multiplyScalar(1.58)); feather.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir); group.add(feather); }
    } else if(id==='verdant_relic'){
      addWire(0xdcffd1,.6,1.01); addPoints(24,0xdcffd1,1.52,.06);
      for(let i=0;i<3;i++){ const vine=new THREE.Mesh(new THREE.TorusKnotGeometry(1.22+i*.08,.028,72,10,2+i,3),new THREE.MeshBasicMaterial({color:i%2?0x94ff9e:0xdcffd1,transparent:true,opacity:.18+i*.06,blending:THREE.AdditiveBlending,depthWrite:false})); vine.rotation.set(i*.75,i*.35,i*.5); group.add(vine); }
    } else if(id==='celestial_choir'){
      [0xfff0c9,0x8ea0ff].forEach((col,i)=>{ const h=addWire(col,.7-i*.12,1.01+i*.03); h.rotation.set(Math.PI/2*(i%2),i*.55,i*.25); });
      for(let i=0;i<8;i++){ const wing=new THREE.Mesh(new THREE.ConeGeometry(.08,.46,3),new THREE.MeshBasicMaterial({color:i%2?0xfff0c9:0x94a7ff,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false})); const a=i/8*Math.PI*2; wing.position.set(Math.cos(a)*1.55,.35*Math.cos(a*2),Math.sin(a)*1.55); wing.rotation.set(Math.PI/2,0,-a); group.add(wing); }
      addPoints(30,0xfff0c9,1.6,.07);
    } else if(id==='void_monarch'){
      const core=new THREE.Mesh(new THREE.SphereGeometry(1.2,26,18),new THREE.MeshStandardMaterial({color:0x12061c,roughness:.08,metalness:.85,emissive:0x5b17a1,emissiveIntensity:.68})); group.add(core);
      addWire(0xff9af2,.72,1.03); for(let i=0;i<3;i++){ const h=new THREE.Mesh(new THREE.TorusGeometry(1.58+i*.18,.05,10,48,Math.PI*(1.2+i*.18)),new THREE.MeshBasicMaterial({color:i%2?0xff9af2:0x7b31cf,transparent:true,opacity:.46,blending:THREE.AdditiveBlending,depthWrite:false})); h.rotation.set(.35+i*.42,.22+i*.55,.18+i*.3); group.add(h); }
    } else if(id==='prismatic_tide'){
      [0x7ffcff,0xff4ecb,0x7c8dff,0xffffff].forEach((col,i)=>{ const e=addWire(col,.66-i*.1,1.01+i*.015); e.rotation.set(i*.25,i*.8,i*.14); });
      const shell=new THREE.Mesh(shellGeom(),new THREE.MeshPhysicalMaterial({color:skin.base,transparent:true,opacity:.13,roughness:.02,metalness:.06,transmission:.42,clearcoat:1.7,depthWrite:false})); shell.scale.setScalar(1.05); shell.renderOrder=10; group.add(shell); addPoints(42,0x7ffcff,1.64,.062);
    } else if(id==='mythic_aeon'){
      const shell=new THREE.Mesh(new THREE.SphereGeometry(sides===6?1.72:1.82,28,18),new THREE.MeshPhysicalMaterial({color:0x24115f,transparent:true,opacity:.11,roughness:.03,metalness:.16,transmission:.58,clearcoat:1.9,depthWrite:false})); shell.renderOrder=9; group.add(shell);
      [0xfff6bf,0x63f8ff,0xff78df,0xffffff].forEach((col,i)=>{ const e=addWire(col,.74-i*.1,1.01+i*.025); e.rotation.set(i*.42,i*.58,i*.3); });
      addPoints(72,0xfff6bf,1.78,.078); addPoints(40,0x63f8ff,1.58,.055);
      for(let i=0;i<14;i++){ const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.08+Math.random()*.05,0),new THREE.MeshBasicMaterial({color:i%3===0?0xfff6bf:i%3===1?0x63f8ff:0xff78df,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false})); const dir=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(); shard.position.copy(dir.multiplyScalar(1.65+Math.random()*.22)); group.add(shard); }
    }
    this.addEliteForm(group, skin, sides);
  }



  addEliteSpike(group, color, position, direction, length = .56, radius = .09, opts = {}) {
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: opts.metalness ?? .55,
      roughness: opts.roughness ?? .12,
      emissive: opts.emissive ?? color,
      emissiveIntensity: opts.emissiveIntensity ?? .22,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      transmission: opts.transmission ?? 0,
      clearcoat: opts.clearcoat ?? 1.2,
      clearcoatRoughness: opts.clearcoatRoughness ?? .08,
      depthWrite: opts.depthWrite ?? !opts.transparent,
    });
    const spike = new THREE.Mesh(new THREE.ConeGeometry(radius, length, opts.radialSegments || 5), mat);
    spike.position.copy(position);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    group.add(spike);
    return spike;
  }

  addEliteRing(group, color, radius = 1.8, tube = .05, rotation = null, opts = {}) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, opts.segments || 48, opts.arc || Math.PI * 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? .58, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    if (rotation) ring.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    if (opts.position) ring.position.copy(opts.position);
    group.add(ring);
    return ring;
  }


  addEliteForm(group, skin = {}, sides = 20) {
    const id = String(skin.id || '');
    const legendaryIds = new Set(['neon_prism','celestial_choir','crown_steel','void_monarch','rift_shard','prismatic_tide']);
    if (!legendaryIds.has(id) && id !== 'mythic_aeon') return;
    const accent = new THREE.Color(skin.accent || '#ffffff');
    const emissive = new THREE.Color(skin.emissive || skin.accent || '#ffffff');
    const base = new THREE.Color(skin.base || '#444444');
    const getShellPoints = () => {
      if (sides === 6) {
        return [
          new THREE.Vector3(1,1,1), new THREE.Vector3(-1,1,1), new THREE.Vector3(1,1,-1), new THREE.Vector3(-1,1,-1),
          new THREE.Vector3(1,-1,1), new THREE.Vector3(-1,-1,1), new THREE.Vector3(1,-1,-1), new THREE.Vector3(-1,-1,-1),
        ].map(v => v.normalize());
      }
      const arr = new THREE.IcosahedronGeometry(1, 0).attributes.position.array;
      const pts = [];
      for (let i = 0; i < arr.length; i += 3) {
        const v = new THREE.Vector3(arr[i], arr[i+1], arr[i+2]).normalize();
        if (!pts.some(p => p.distanceToSquared(v) < 1e-4)) pts.push(v);
      }
      return pts;
    };
    const points = getShellPoints();
    const addPointFrame = (cols = [accent, emissive], radius = sides === 6 ? 1.58 : 1.88, length = sides === 6 ? .42 : .5, spikeRadius = sides === 6 ? .06 : .075) => {
      points.forEach((v, i) => {
        const dir = v.clone().normalize();
        this.addEliteSpike(group, cols[i % cols.length], dir.clone().multiplyScalar(radius), dir, length, spikeRadius, { metalness: .85, roughness: .16, emissiveIntensity: .14 });
      });
    };
    const addPolarSpikes = (count, colorA, colorB, y = .62, radius = 1.46, lift = 1.12, length = .82, spikeRadius = .11) => {
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a) * radius, lift, Math.sin(a) * radius).normalize();
        this.addEliteSpike(group, i % 2 ? colorA : colorB, dir.clone().multiplyScalar(sides === 6 ? 1.12 : 1.5), dir, length, spikeRadius, { metalness: .98, roughness: .12, emissiveIntensity: .1 });
      }
    };

    const addBody = (geometry, color, opacity = .42, opts = {}) => {
      const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity,
        roughness: opts.roughness ?? .09,
        metalness: opts.metalness ?? .38,
        transmission: opts.transmission ?? .08,
        clearcoat: opts.clearcoat ?? 1.5,
        clearcoatRoughness: .06,
        emissive: opts.emissive ?? color,
        emissiveIntensity: opts.emissiveIntensity ?? .16,
        depthWrite: false,
        side: THREE.DoubleSide,
      }));
      if (opts.scale) body.scale.setScalar(opts.scale);
      if (opts.rotation) body.rotation.set(opts.rotation.x || 0, opts.rotation.y || 0, opts.rotation.z || 0);
      body.renderOrder = 9;
      group.add(body);
      return body;
    };

    if (id === 'neon_prism') {
      addBody(new THREE.OctahedronGeometry(sides === 6 ? 1.82 : 2.08, 0), 0x173d73, .34, { transmission:.24, roughness:.025, metalness:.12, emissive:0x58fff0, emissiveIntensity:.2, rotation:{x:.26,y:.54,z:.18} });
      addPointFrame([new THREE.Color('#58fff0'), new THREE.Color('#ff55e8'), new THREE.Color('#7f71ff')], sides === 6 ? 1.62 : 1.88, sides === 6 ? .42 : .48, sides === 6 ? .055 : .07);
      [0x58fff0,0xff55e8,0x7f71ff].forEach((c,i)=>this.addEliteRing(group,c,(sides===6?1.82:2.04)+i*.14,.032,{x:.3*i,y:.55*i,z:.75*i},{opacity:.55-i*.1}));
    } else if (id === 'celestial_choir') {
      addBody(new THREE.OctahedronGeometry(sides === 6 ? 1.72 : 1.98, 0), 0x5167b8, .38, { transmission:.16, emissive:0x94a7ff, emissiveIntensity:.18, rotation:{x:.18,y:.42,z:.08} });
      addPointFrame([accent, new THREE.Color('#94a7ff')], sides === 6 ? 1.58 : 1.86, sides === 6 ? .38 : .42, sides === 6 ? .055 : .065);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), .16, Math.sin(a)).normalize();
        const wing = new THREE.Mesh(
          new THREE.ConeGeometry(sides === 6 ? .16 : .18, sides === 6 ? .88 : .78, 3),
          new THREE.MeshPhysicalMaterial({ color: i % 2 ? 0xfff0c9 : 0x94a7ff, transparent: true, opacity: .78, transmission: .18, roughness: .05, metalness: .18, depthWrite: false, emissive: i % 2 ? 0x6d5a25 : 0x425cff, emissiveIntensity: .28 })
        );
        wing.position.copy(dir.clone().multiplyScalar(sides === 6 ? 1.56 : 1.82)).add(new THREE.Vector3(0, sides === 6 ? .2 : .28, 0));
        wing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().add(new THREE.Vector3(0, .55, 0)).normalize());
        group.add(wing);
      }
      this.addEliteRing(group, 0xfff0c9, sides === 6 ? 1.8 : 2.02, .055, { x: Math.PI / 2, y: 0, z: .18 }, { opacity: .78 });
      this.addEliteRing(group, 0x94a7ff, sides === 6 ? 2.02 : 2.24, .035, { x: .15, y: .55, z: 0 }, { opacity: .52, arc: Math.PI * 1.55 });
    } else if (id === 'crown_steel') {
      addBody(new THREE.DodecahedronGeometry(sides === 6 ? 1.62 : 1.88, 0), 0x464952, .58, { metalness:.92, roughness:.13, emissive:0x684516, emissiveIntensity:.08, rotation:{x:.12,y:.2,z:.06} });
      addPointFrame([accent, new THREE.Color('#caa45c')], sides === 6 ? 1.58 : 1.84, sides === 6 ? .34 : .38, sides === 6 ? .05 : .06);
      addPolarSpikes(6, 0xffe29b, 0xcaa45c, .58, 1.25, 1.42, sides === 6 ? .78 : .95, sides === 6 ? .11 : .12);
      const band = new THREE.Mesh(new THREE.TorusGeometry(sides === 6 ? 1.66 : 1.88, .08, 10, 48), new THREE.MeshStandardMaterial({ color: 0xcaa45c, metalness: 1, roughness: .16 }));
      band.rotation.x = Math.PI / 2; group.add(band);
      this.addEliteRing(group, 0xffe29b, sides === 6 ? 1.95 : 2.18, .03, { x: .35, y: .2, z: .35 }, { opacity: .5 });
    } else if (id === 'void_monarch') {
      addBody(new THREE.DodecahedronGeometry(sides === 6 ? 1.66 : 1.92, 0), 0x170b25, .52, { metalness:.72, roughness:.07, transmission:.04, emissive:0x5b17a1, emissiveIntensity:.28, rotation:{x:.34,y:.42,z:.12} });
      addPointFrame([accent, new THREE.Color('#7b31cf')], sides === 6 ? 1.58 : 1.82, sides === 6 ? .4 : .44, sides === 6 ? .06 : .07);
      const core = new THREE.Mesh(new THREE.SphereGeometry(sides === 6 ? .72 : .82, 20, 14), new THREE.MeshPhysicalMaterial({ color: base, metalness: .88, roughness: .08, transparent: true, opacity: .28, transmission: .12, emissive: 0x5b17a1, emissiveIntensity: .42, depthWrite: false }));
      group.add(core);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), .48, Math.sin(a)).normalize();
        this.addEliteSpike(group, i % 2 ? 0xff9af2 : 0x7b31cf, dir.clone().multiplyScalar(sides === 6 ? 1.62 : 1.96), dir, sides === 6 ? .65 : .72, sides === 6 ? .095 : .1, { metalness: .5, roughness: .08, emissiveIntensity: .22, transparent: true, opacity: .88, transmission: .08, depthWrite: false });
      }
      this.addEliteRing(group, 0xff9af2, sides === 6 ? 1.82 : 2.05, .04, { x: .45, y: .35, z: .15 }, { opacity: .58, arc: Math.PI * 1.55 });
      this.addEliteRing(group, 0x7b31cf, sides === 6 ? 2.1 : 2.34, .03, { x: 1.1, y: .15, z: .6 }, { opacity: .42, arc: Math.PI * 1.25 });
    } else if (id === 'rift_shard') {
      addBody(new THREE.TetrahedronGeometry(sides === 6 ? 2.0 : 2.18, 0), 0x4e2d7c, .34, { transmission:.12, roughness:.04, emissive:0x6e1c78, emissiveIntensity:.24, rotation:{x:.44,y:.68,z:.18} });
      addPointFrame([accent, new THREE.Color('#8b4dff')], sides === 6 ? 1.58 : 1.84, sides === 6 ? .32 : .35, sides === 6 ? .045 : .055);
      const shardDirs = sides === 6
        ? [new THREE.Vector3(1,.35,0), new THREE.Vector3(-1,.18,.35), new THREE.Vector3(.25,.65,-1), new THREE.Vector3(-.2,-.25,1)]
        : [new THREE.Vector3(1,.35,0), new THREE.Vector3(-1,.18,.35), new THREE.Vector3(.25,.65,-1), new THREE.Vector3(-.2,-.25,1), new THREE.Vector3(.4,-.35,-1), new THREE.Vector3(-.55,.5,-.3)];
      shardDirs.forEach((dir, i) => {
        const d = dir.clone().normalize();
        const shard = new THREE.Mesh(
          new THREE.TetrahedronGeometry((sides === 6 ? .34 : .28) + i * .03, 0),
          new THREE.MeshPhysicalMaterial({ color: i % 2 ? 0xffbcf5 : 0x8b4dff, transparent: true, opacity: .86, transmission: .08, roughness: .06, metalness: .3, depthWrite: false, emissive: i % 2 ? 0x6f205d : 0x4724aa, emissiveIntensity: .25 })
        );
        shard.position.copy(d.multiplyScalar((sides === 6 ? 1.72 : 1.95) + i * .08));
        shard.rotation.set(.5 * i, .8 * i, .4 * i);
        group.add(shard);
      });
      this.addEliteRing(group, 0xffbcf5, sides === 6 ? 1.92 : 2.14, .03, { x: .7, y: .2, z: .45 }, { opacity: .42, arc: Math.PI * 1.3 });
    } else if (id === 'prismatic_tide') {
      addBody(new THREE.OctahedronGeometry(sides === 6 ? 1.9 : 2.14, 0), 0x2b8ca3, .30, { transmission:.32, roughness:.02, metalness:.1, emissive:0xff4ecb, emissiveIntensity:.18, rotation:{x:.34,y:.72,z:.16} });
      addPointFrame([accent, new THREE.Color('#ff4ecb'), new THREE.Color('#7c8dff'), new THREE.Color('#ffffff')], sides === 6 ? 1.58 : 1.84, sides === 6 ? .34 : .38, sides === 6 ? .05 : .06);
      const faceDirs = sides === 6
        ? [new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)]
        : [new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1), new THREE.Vector3(.7,.6,0), new THREE.Vector3(-.7,.6,0)];
      faceDirs.forEach((dir, i) => {
        const fin = new THREE.Mesh(
          new THREE.OctahedronGeometry((sides === 6 ? .28 : .22) + (i % 2) * .03, 0),
          new THREE.MeshPhysicalMaterial({ color: [0x7ffcff,0xff4ecb,0x7c8dff,0xffffff][i % 4], transparent: true, opacity: .58, transmission: .32, roughness: .03, metalness: .12, clearcoat: 1.6, depthWrite: false, emissive: [0x7ffcff,0xff4ecb,0x7c8dff,0xffffff][i % 4], emissiveIntensity: .18 })
        );
        fin.position.copy(dir.clone().normalize().multiplyScalar(sides === 6 ? 1.62 : 1.9));
        fin.scale.set(.78, sides === 6 ? 1.5 : 1.8, .78);
        fin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        group.add(fin);
      });
      const shell = new THREE.Mesh(new THREE.OctahedronGeometry(sides === 6 ? 1.92 : 2.15, 0), new THREE.MeshPhysicalMaterial({ color: 0x7ffcff, transparent: true, opacity: .11, transmission: .48, roughness: .02, metalness: .05, clearcoat: 1.7, depthWrite: false }));
      shell.rotation.set(.35, .78, .12); group.add(shell);
    } else if (id === 'mythic_aeon') {
      addBody(new THREE.DodecahedronGeometry(sides === 6 ? 1.92 : 2.2, 0), 0x24115f, .42, { transmission:.18, roughness:.025, metalness:.16, emissive:0x63f8ff, emissiveIntensity:.32, rotation:{x:.38,y:.66,z:.22} });
      addBody(new THREE.OctahedronGeometry(sides === 6 ? 2.22 : 2.46, 0), 0xb089ff, .16, { transmission:.42, roughness:.015, metalness:.06, emissive:0xff78df, emissiveIntensity:.22, rotation:{x:.12,y:.94,z:.48} });
      points.forEach((v, i) => {
        const dir = v.clone().normalize();
        this.addEliteSpike(group, [0xfff6bf,0x63f8ff,0xff78df,0xffffff][i % 4], dir.clone().multiplyScalar(sides === 6 ? 1.84 : 2.08), dir, sides === 6 ? .9 : 1.0, sides === 6 ? .12 : .13, { metalness: .42, roughness: .05, emissiveIntensity: .3, transparent: true, opacity: .92, transmission: .12, depthWrite: false, clearcoat: 1.85 });
      });
      const shell = new THREE.Mesh(new THREE.OctahedronGeometry(sides === 6 ? 2.04 : 2.28, 0), new THREE.MeshPhysicalMaterial({ color: 0xb089ff, transparent: true, opacity: .12, transmission: .52, roughness: .02, metalness: .08, clearcoat: 1.9, depthWrite: false }));
      shell.rotation.set(.22, .85, .42); group.add(shell);
      const core = new THREE.Mesh(new THREE.SphereGeometry(sides === 6 ? .95 : 1.04, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x24115f, transparent: true, opacity: .18, transmission: .4, roughness: .03, metalness: .14, emissive: 0x63f8ff, emissiveIntensity: .26, depthWrite: false }));
      group.add(core);
      [0xfff6bf,0x63f8ff,0xff78df,0xffffff].forEach((col, i) => this.addEliteRing(group, col, (sides === 6 ? 1.82 : 2.06) + i * .16, .03 + i * .004, { x: .3 * i, y: .48 * i, z: .62 * i }, { opacity: .58 - i * .08, arc: Math.PI * (1.65 - i * .08) }));
    } else {
      addPointFrame([accent, emissive], sides === 6 ? 1.58 : 1.82, sides === 6 ? .36 : .42, sides === 6 ? .055 : .065);
      this.addEliteRing(group, accent, sides === 6 ? 1.84 : 2.02, .036, { x: Math.PI / 2, y: 0, z: 0 }, { opacity: .48 });
    }
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
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.556, 0), 1), new THREE.LineBasicMaterial({ color: visual.edge || skin.accent || '#ffe2ba', transparent: true, opacity: premium?.98:.82 })); group.add(edges); this.prepareLegendaryCore(group,skin,20); this.decorateDie(group,skin,20); return group;
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
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: visual.edge || skin.accent || '#ffe6c6', transparent: true, opacity: premium?.98:.84 })); group.add(edges); this.prepareLegendaryCore(group,skin,6); this.decorateDie(group,skin,6); return group;
  }

  prioritizeDie(die) {
    // Keep the physical die readable even when premium additive FX are active.
    die.scale.multiplyScalar(Number(die?.userData?.skin?.price || 0) >= 12 ? 1.0 : 1.08);
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
      const profile = this.fxProfile(style || {}); o.type = profile.tier >= 4 ? 'sawtooth' : (profile.tier >= 3 ? 'triangle' : 'sine');
      o.frequency.setValueAtTime(pitch * (profile.tier >= 4 ? 1.16 : profile.tier >= 2 ? 1.08 : 1), ctx.currentTime); o.frequency.exponentialRampToValueAtTime(profile.tier >= 4 ? 28 : profile.tier >= 3 ? 34 : 42, ctx.currentTime + .09);
      g.gain.setValueAtTime(volume * (profile.tier >= 4 ? 1.18 : 1), ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + (profile.tier >= 4 ? .18 : .14));
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + (profile.tier >= 4 ? .19 : .15));
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
    die.position.set(-2.7, 2.55, 0);
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
        const travel = -2.7 + 2.7 * ease;
        const fall = 2.55 * Math.pow(1 - t, 1.75);
        const bounce = Math.abs(Math.sin(t * Math.PI * 6.4)) * .82 * Math.pow(1 - t, 1.15);
        die.position.set(travel, -.02 + fall + bounce, .18 * Math.sin(t * 12.5));
        if (t < .73) { die.rotation.x += .19 * (1 - t) + .03; die.rotation.y += .24 * (1 - t) + .035; die.rotation.z += .16 * (1 - t) + .025; }
        else { const local = (t - .73) / .27; die.quaternion.slerp(finalQ, Math.min(1, local * .12 + .08)); die.quaternion.slerp(finalQ, Math.min(1, local * .23)); }
        this.trailFx(die, profile, dt); this.tickFx(dt, (now-start)/1000);
        const b = Math.floor(t * (profile.tier >= 4 ? 6.2 : 5.3)); if (b !== lastBounce && t > .08 && t < .9) { lastBounce = b; this.synthHit(.045 + (.9 - t) * .06 + (profile.tier >= 4 ? .025 : 0), 70 + Math.random() * 65, profile); if(profile.tier>=2 && t>.35) this.ring(new THREE.Vector3(die.position.x,-1.4,die.position.z),profile.accent,.08,.8+profile.tier*.32,.25 + (profile.tier>=4?.08:0),.32); if(profile.tier>=4 && t>.28) this.ring(new THREE.Vector3(die.position.x,-1.35,die.position.z),0xffffff,.06,1.15+profile.tier*.35,.2,.18); }
        this.camera.position.x = Math.sin(t * 24) * (1 - t) * (profile.tier>=4?.14:profile.tier>=3?.10:profile.tier===2?.07:.04);
        this.camera.position.y = 4.6 + Math.sin(t*31)*(1-t)*(profile.tier>=4?.045:profile.tier>=3?.03:0);
        this.camera.lookAt(die.position.x * .12, Math.max(.05, die.position.y * .16), 0);
        this.renderer.render(this.scene, this.camera);
        if (t < 1) requestAnimationFrame(frame);
        else {
          die.quaternion.copy(finalQ); die.position.set(0, -.02, 0);
          this.camera.lookAt(0, .05, 0);
          this.highlightResult(result); this.landingFx(profile); this.synthHit(profile.tier>=4?.28:profile.tier>=3?.22:.15, profile.tier>=4?42:profile.tier>=3?48:55, profile);
          const settleStart=performance.now(); let settleLast=settleStart;
          const settle=ts=>{ const dt2=Math.min(.05,(ts-settleLast)/1000||.016); settleLast=ts; this.tickFx(dt2,(ts-start)/1000); this.renderer.render(this.scene,this.camera); if(ts-settleStart<1200+profile.tier*(profile.tier>=4?360:280)) requestAnimationFrame(settle); else { this.running=false; resolve(); } };
          requestAnimationFrame(settle);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}

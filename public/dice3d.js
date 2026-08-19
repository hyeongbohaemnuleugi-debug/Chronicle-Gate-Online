import * as THREE from '/vendor/three.module.js';

export class DiceTheater {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
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
    const key = new THREE.SpotLight(0xffffff, 55, 30, Math.PI / 5, .45, 1.2); key.position.set(-4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(384, 384); this.scene.add(key);
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

    const haloSpecs = tier >= 4
      ? [
          { color: accent, radius: 1.88, opacity: .22, rotation: [Math.PI / 2, 0, .12] },
          { color: emissive, radius: 2.14, opacity: .14, rotation: [.35, .65, .18] },
          { color: '#ffffff', radius: 2.42, opacity: .1, rotation: [.68, .18, .52] },
        ]
      : tier === 3
        ? [
            { color: accent, radius: 1.84, opacity: .2, rotation: [Math.PI / 2, 0, 0] },
            { color: emissive, radius: 2.08, opacity: .11, rotation: [.42, .52, .2] },
          ]
        : tier === 2
          ? [ { color: accent, radius: 1.8, opacity: .16, rotation: [Math.PI / 2, 0, 0] } ]
          : [ { color: accent, radius: 1.76, opacity: .12, rotation: [Math.PI / 2, 0, 0] } ];

    haloSpecs.forEach(spec => {
      const h = this.addHalo(die, spec.color, spec.radius, spec.opacity);
      h.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    });

    const orbCount = tier >= 4 ? 4 : tier === 3 ? 3 : tier === 2 ? 2 : 1;
    for (let i = 0; i < orbCount; i++) {
      const color = i % 2 ? emissive : accent;
      const radius = (tier >= 3 ? 2.12 : 1.96) + i * .18;
      const speed = .34 + i * .14;
      const y = -.18 + i * .18;
      const phase = i * 1.45;
      const size = tier >= 4 ? .1 + (i % 2) * .025 : tier === 3 ? .1 : .085;
      this.addOrbiter(die, color, radius, speed, y, phase, size);
    }

    const theme = String(profile.theme || 'arcane');
    if (theme === 'crown') {
      const h = this.addHalo(die, 0xffe29b, 2.22, .16);
      h.rotation.set(.22, .24, .24);
    } else if (theme === 'celestial') {
      const h = this.addHalo(die, 0xffffff, 2.24, .14);
      h.rotation.set(.15, .55, 0);
    } else if (theme === 'void') {
      const h = this.addHalo(die, 0x7b31cf, 2.16, .14);
      h.rotation.set(.62, .12, .48);
    } else if (theme === 'prism' || theme === 'neon') {
      const h = this.addHalo(die, '#ffffff', 2.18, .1);
      h.rotation.set(.45, .8, .12);
    } else if (theme === 'mythic') {
      [0xfff6bf, 0x63f8ff, 0xff78df].forEach((col, i) => {
        const h = this.addHalo(die, col, 2.08 + i * .22, .14 - i * .025);
        h.rotation.set(.18 + i * .38, .44 + i * .42, .15 + i * .2);
      });
    }
  }



  trailFx(die, profile, dt) {
    if (!profile.tier) return;
    this.fxTrailClock += dt;
    const interval = profile.tier >= 4 ? .08 : profile.tier === 3 ? .11 : profile.tier === 2 ? .16 : .22;
    if (this.fxTrailClock < interval) return;
    this.fxTrailClock = 0;

    const basePos = die.position.clone();
    const accent = new THREE.Color(profile.accent);
    const secondary = new THREE.Color(profile.emissive || profile.accent);
    const tier = Number(profile.tier || 0);
    const count = tier >= 4 ? 3 : tier === 3 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const p = basePos.clone().add(new THREE.Vector3((Math.random() - .5) * .45, (Math.random() - .5) * .35, (Math.random() - .5) * .45));
      const c = i % 2 ? secondary : accent;
      const velocity = new THREE.Vector3(-.08 - Math.random() * .22, .12 + Math.random() * .18, (Math.random() - .5) * .12);
      this.addSprite(p, c, tier >= 4 ? .13 : tier === 3 ? .11 : .095, .28 + Math.random() * .18, velocity, .04);
    }

    if (tier >= 3 && Math.random() < .22) {
      this.addSprite(basePos.clone(), '#ffffff', tier >= 4 ? .09 : .08, .34, new THREE.Vector3((Math.random() - .5) * .08, .26 + Math.random() * .12, (Math.random() - .5) * .08), .02);
    }
    if (profile.theme === 'rift' && Math.random() < .14) this.shardBurst(basePos.clone(), 0xffbcf5, 1, .34);
    if (profile.theme === 'prism' && Math.random() < .16) this.shardBurst(basePos.clone(), 0xffffff, 1, .32);
    if (profile.theme === 'phoenix' && Math.random() < .18) this.addSprite(basePos.clone(), 0xffcf7a, .11, .34, new THREE.Vector3(-.04, .28, 0), -.02);
    if (profile.theme === 'celestial' && Math.random() < .18) this.addSprite(basePos.clone(), 0xfff0c9, .11, .34, new THREE.Vector3(-.05, .18, 0), .01);
  }



  landingFx(profile) {
    if (!profile.tier) return;
    const p = new THREE.Vector3(0, -1.39, 0);
    const accent = new THREE.Color(profile.accent);
    const emissive = new THREE.Color(profile.emissive || profile.accent);
    const tier = Number(profile.tier || 0);
    const theme = String(profile.theme || 'arcane');

    this.ring(p, accent, .22, tier >= 4 ? 4.6 : tier === 3 ? 4.0 : tier === 2 ? 3.0 : 2.35, tier >= 4 ? .88 : .74, .7);
    if (tier >= 2) this.ring(p.clone().add(new THREE.Vector3(0, .012, 0)), emissive, .18, tier >= 4 ? 3.7 : tier === 3 ? 3.25 : 2.45, tier >= 4 ? .8 : .66, .48);
    if (tier >= 4) this.ring(p.clone().add(new THREE.Vector3(0, .024, 0)), '#ffffff', .16, 3.0, .72, .28);

    this.burst(new THREE.Vector3(0, -.92, 0), accent, tier >= 4 ? 20 : tier === 3 ? 14 : tier === 2 ? 8 : 5, tier >= 4 ? 2.2 : tier === 3 ? 1.8 : 1.35, tier >= 4 ? .16 : .14, tier >= 4 ? .9 : .72, tier >= 4 ? .52 : .38);
    if (tier >= 3) this.addFloorSigil(profile, p.clone().add(new THREE.Vector3(0, .018, 0)));
    if (tier >= 4) this.flashDisc(new THREE.Vector3(0, -.22, 0), 0xffffff, 4.2, .2, .42);
    else if (tier === 3) this.flashDisc(new THREE.Vector3(0, -.22, 0), accent, 3.2, .18, .32);

    if (theme === 'crown') {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(a) * 1.18, -1.18, Math.sin(a) * 1.18);
        const obj = new THREE.Mesh(
          new THREE.ConeGeometry(.06, .34, 4),
          new THREE.MeshBasicMaterial({ color: 0xffe29b, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        obj.position.copy(pos);
        obj.rotation.z = Math.PI;
        this.fxGroup.add(obj);
        this.fxItems.push({ obj, life: .74, maxLife: .74, kind: 'crown', spin: new THREE.Vector3(0, .25, 0) });
      }
    } else if (theme === 'celestial') {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const ray = new THREE.Mesh(
          new THREE.PlaneGeometry(.06, .58),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff0c9 : 0x94a7ff, transparent: true, opacity: .48, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        ray.position.set(Math.cos(a) * .88, -1.36, Math.sin(a) * .88);
        ray.rotation.x = -Math.PI / 2;
        ray.rotation.z = a;
        this.fxGroup.add(ray);
        this.fxItems.push({ obj: ray, life: .82, maxLife: .82, kind: 'ring', start: 1, end: 1.08, opacity: .48 });
      }
    } else if (theme === 'void') {
      this.ring(new THREE.Vector3(0, -1.1, 0), 0x7b31cf, .14, 2.2, .86, .42, Math.PI / 2);
    } else if (theme === 'rift') {
      this.shardBurst(new THREE.Vector3(0, -.72, 0), 0xffbcf5, 8, .82);
    } else if (theme === 'prism' || theme === 'neon') {
      [0x7ffcff, 0xff4ecb, 0x7c8dff].forEach((col, i) => this.ring(p.clone().add(new THREE.Vector3(0, .008 * i, 0)), col, .14 + i * .03, 2.8 + i * .28, .74, .34));
    } else if (theme === 'mythic') {
      [0xfff6bf, 0x63f8ff, 0xff78df, 0xffffff].forEach((col, i) => this.ring(p.clone().add(new THREE.Vector3(0, .01 * i, 0)), col, .14 + i * .04, 3.0 + i * .35, .92, .42 - i * .05, i % 2 ? Math.PI / 2 : 0));
      this.shardBurst(new THREE.Vector3(0, -.64, 0), 0xffffff, 10, .95);
    }
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


  bodyMaterialTuning(skin = {}) {
    const id = String(skin?.id || 'classic');
    const map = {
      celestial_choir: { roughness: .12, metalness: .34, clearcoat: 1.7, clearcoatRoughness: .05 },
      crown_steel: { roughness: .15, metalness: .78, clearcoat: 1.35, clearcoatRoughness: .08 },
      void_monarch: { roughness: .1, metalness: .62, clearcoat: 1.45, clearcoatRoughness: .06 },
      rift_shard: { roughness: .14, metalness: .46, clearcoat: 1.3, clearcoatRoughness: .07 },
      prismatic_tide: { roughness: .05, metalness: .08, transmission: .24, transparent: true, opacity: .95, clearcoat: 1.85, clearcoatRoughness: .03 },
      mythic_aeon: { roughness: .08, metalness: .28, transmission: .08, transparent: false, clearcoat: 1.9, clearcoatRoughness: .04 },
    };
    return map[id] || {};
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
    const refinedElite = new Set(['neon_prism','celestial_choir','crown_steel','void_monarch','rift_shard','prismatic_tide','mythic_aeon']);
    if (refinedElite.has(id)) {
      this.addEliteForm(group, skin, sides);
      return;
    }
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
    const price = Number(skin.price || 0);
    if (price < 12) return;
    const id = String(skin.id || '');
    const outerR = sides === 6 ? 1.16 : 1.42;

    const getFaceDirs = () => {
      if (sides === 6) {
        return [
          new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0),
          new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
        ];
      }
      return [
        new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0),
        new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
        new THREE.Vector3(.72,.48,.3), new THREE.Vector3(-.72,.48,-.3), new THREE.Vector3(.3,-.48,.72), new THREE.Vector3(-.3,-.48,-.72),
      ].map(v => v.normalize());
    };

    const addSurfacePlate = (dir, color, w = .62, h = .62, d = .06, offset = outerR, opts = {}) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshPhysicalMaterial({
          color,
          metalness: opts.metalness ?? .28,
          roughness: opts.roughness ?? .12,
          transparent: opts.transparent ?? false,
          opacity: opts.opacity ?? 1,
          transmission: opts.transmission ?? 0,
          clearcoat: opts.clearcoat ?? 1.2,
          clearcoatRoughness: opts.clearcoatRoughness ?? .05,
          emissive: opts.emissive ?? 0x000000,
          emissiveIntensity: opts.emissiveIntensity ?? 0,
          depthWrite: opts.depthWrite ?? !(opts.transparent ?? false),
        })
      );
      mesh.position.copy(dir.clone().normalize().multiplyScalar(offset));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      group.add(mesh);
      return mesh;
    };

    const addFrame = (dir, color, size = .78, thick = .06, depth = .05, offset = outerR + .018, opts = {}) => {
      const frame = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        metalness: opts.metalness ?? .78,
        roughness: opts.roughness ?? .18,
        clearcoat: opts.clearcoat ?? 1.18,
        clearcoatRoughness: opts.clearcoatRoughness ?? .08,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
      });
      const bars = [
        [size, thick, 0, size/2],
        [size, thick, 0, -size/2],
        [thick, size, size/2, 0],
        [thick, size, -size/2, 0],
      ];
      for (const [w,h,x,y] of bars) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat);
        bar.position.set(x, y, 0);
        frame.add(bar);
      }
      frame.position.copy(dir.clone().normalize().multiplyScalar(offset));
      frame.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      group.add(frame);
      return frame;
    };

    const addCornerStud = (dir, offsetX, offsetY, color, size = .08, offset = outerR + .03, opts = {}) => {
      const stud = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 10),
        new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? .7, roughness: opts.roughness ?? .16, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0, clearcoat: 1.2, clearcoatRoughness: .08 })
      );
      const n = dir.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n);
      const pos = new THREE.Vector3(offsetX, offsetY, 0).applyQuaternion(q).add(n.multiplyScalar(offset));
      stud.position.copy(pos);
      group.add(stud);
      return stud;
    };

    const addGem = (dir, color, size = .12, offset = outerR + .025, opts = {}) => {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(size, 0),
        new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: opts.opacity ?? .9, transmission: opts.transmission ?? .25, roughness: .04, metalness: .08, clearcoat: 1.6, emissive: opts.emissive ?? color, emissiveIntensity: opts.emissiveIntensity ?? .05, depthWrite: false })
      );
      gem.position.copy(dir.clone().normalize().multiplyScalar(offset));
      group.add(gem);
      return gem;
    };

    const addOvalCore = (dir, color, scaleX = .3, scaleY = .42, depth = .08, offset = outerR + .01, opts = {}) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 14),
        new THREE.MeshPhysicalMaterial({ color, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, transmission: opts.transmission ?? 0, roughness: opts.roughness ?? .06, metalness: opts.metalness ?? .18, clearcoat: 1.45, clearcoatRoughness: .04, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0, depthWrite: opts.depthWrite ?? !(opts.transparent ?? false) })
      );
      mesh.scale.set(scaleX, scaleY, depth);
      mesh.position.copy(dir.clone().normalize().multiplyScalar(offset));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      group.add(mesh);
      return mesh;
    };

    const addBevelShard = (dir, color, w = .34, h = .28, d = .12, offset = outerR + .015, opts = {}) => {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? .26, roughness: opts.roughness ?? .14, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, transmission: opts.transmission ?? 0, clearcoat: 1.15, clearcoatRoughness: .06, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0, depthWrite: opts.depthWrite ?? !(opts.transparent ?? false) })
      );
      shard.position.copy(dir.clone().normalize().multiplyScalar(offset));
      shard.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      shard.rotation.z += opts.rotZ ?? 0;
      shard.rotation.x += opts.rotX ?? 0;
      group.add(shard);
      return shard;
    };

    const addSurfaceDroplet = (dir, color, sx = .18, sy = .24, sz = .08, offset = outerR + .02) => {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: .72, transmission: .82, roughness: .02, metalness: .02, clearcoat: 1.95, clearcoatRoughness: .02, depthWrite: false })
      );
      drop.scale.set(sx, sy, sz);
      drop.position.copy(dir.clone().normalize().multiplyScalar(offset));
      drop.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      group.add(drop);
      return drop;
    };

    const addTinyLine = (dir, color, y = 0, len = .46, thick = .03, offset = outerR + .018, opts = {}) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(len, thick, .045),
        new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? .65, roughness: opts.roughness ?? .18, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0, clearcoat: 1.2, clearcoatRoughness: .08 })
      );
      const n = dir.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n);
      mesh.position.copy(new THREE.Vector3(0, y, 0).applyQuaternion(q).add(n.multiplyScalar(offset)));
      mesh.quaternion.copy(q);
      group.add(mesh);
      return mesh;
    };

    const dirs = getFaceDirs();
    const faceDirs = dirs.slice(0, sides === 6 ? 6 : 10);

    if (id === 'neon_prism') {
      faceDirs.forEach((dir, i) => {
        const col = [0x4dfff0, 0xff64d9, 0x8d79ff][i % 3];
        addSurfacePlate(dir, col, sides === 6 ? .66 : .5, sides === 6 ? .66 : .5, .045, outerR - .005, { transparent: true, opacity: .42, transmission: .55, emissive: col, emissiveIntensity: .08, metalness: .08, roughness: .04 });
        addFrame(dir, 0xf4ffff, sides === 6 ? .72 : .56, .045, .04, outerR + .02, { metalness: .26, roughness: .1 });
      });
      [ [.23,.23], [-.23,.23], [.23,-.23], [-.23,-.23] ].forEach(([x,y], idx) => addCornerStud(faceDirs[0], x, y, [0xffffff,0x4dfff0,0xff64d9,0x8d79ff][idx], .045, outerR + .028, { metalness: .18, roughness: .06 }));
    } else if (id === 'celestial_choir') {
      faceDirs.slice(0, 6).forEach((dir, i) => {
        addSurfacePlate(dir, i % 2 ? 0xfcf6de : 0xc8d4ff, sides === 6 ? .6 : .48, sides === 6 ? .72 : .54, .04, outerR - .004, { metalness: .08, roughness: .06, transparent: true, opacity: .92, transmission: .22 });
        addFrame(dir, i % 2 ? 0xb59f67 : 0x8399ff, sides === 6 ? .7 : .54, .04, .038, outerR + .016, { metalness: .56, roughness: .14 });
      });
      addGem(new THREE.Vector3(0,1,0), 0xfff4cf, .11, outerR + .03);
      addGem(new THREE.Vector3(0,-1,0), 0x9ab0ff, .08, outerR + .02);
      addTinyLine(new THREE.Vector3(0,1,0), 0xfff4cf, -.08, .34, .024, outerR + .022);
      addTinyLine(new THREE.Vector3(0,1,0), 0xfff4cf, .08, .24, .022, outerR + .022);
    } else if (id === 'crown_steel') {
      faceDirs.forEach((dir, i) => {
        addFrame(dir, 0xcaa45c, sides === 6 ? .76 : .58, .055, .045, outerR + .018, { metalness: .98, roughness: .18 });
        addSurfacePlate(dir, i % 2 ? 0x45331e : 0x5b4630, sides === 6 ? .48 : .36, sides === 6 ? .48 : .36, .035, outerR - .008, { metalness: .36, roughness: .18 });
        [ [.22,.22],[-.22,.22],[.22,-.22],[-.22,-.22] ].forEach(([x,y]) => addCornerStud(dir, x, y, 0xffd57d, .035, outerR + .024, { metalness: 1, roughness: .14 }));
      });
      addGem(new THREE.Vector3(0,1,0), 0x8fd3ff, .1, outerR + .03);
    } else if (id === 'void_monarch') {
      faceDirs.forEach((dir, i) => {
        addSurfacePlate(dir, i % 2 ? 0x20102d : 0x12091c, sides === 6 ? .6 : .46, sides === 6 ? .6 : .46, .05, outerR - .004, { metalness: .58, roughness: .08, emissive: i % 2 ? 0x35104d : 0x1c0b31, emissiveIntensity: .05 });
        addOvalCore(dir, i % 2 ? 0x471b68 : 0x2a0f45, sides === 6 ? .2 : .16, sides === 6 ? .3 : .24, .08, outerR + .012, { transparent: true, opacity: .82, transmission: .3, emissive: i % 2 ? 0xd47eff : 0x7b31cf, emissiveIntensity: .08 });
      });
      [new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0)].forEach((dir, i) => addGem(dir, i ? 0x8e52ff : 0xff9af2, .085, outerR + .026));
    } else if (id === 'rift_shard') {
      const shardDirs = [
        new THREE.Vector3(1,.2,.14), new THREE.Vector3(-.86,.18,.36), new THREE.Vector3(.26,.64,-1), new THREE.Vector3(-.18,-.24,1),
        new THREE.Vector3(.42,-.32,-.94), new THREE.Vector3(-.54,.48,-.26), new THREE.Vector3(.12,.94,.08), new THREE.Vector3(-.08,-.92,-.12)
      ].map(v => v.normalize());
      shardDirs.forEach((dir, i) => addBevelShard(dir, i % 2 ? 0xf6ceff : 0x5f50bf, sides === 6 ? .34 : .26, sides === 6 ? .28 : .22, .12 + (i % 3) * .03, outerR + .01 + (i % 3) * .015, { transparent: i % 3 === 0, opacity: i % 3 === 0 ? .78 : .98, transmission: i % 3 === 0 ? .18 : 0, metalness: .22, roughness: .14, emissive: i % 2 ? 0x96368f : 0x43349f, emissiveIntensity: .03, rotZ: (i % 4 - 1.5) * .26, rotX: (i % 3 - 1) * .08 }));
      addGem(new THREE.Vector3(0,1,0), 0xffd8ff, .065, outerR + .022);
      addGem(new THREE.Vector3(0,-1,0), 0x8f6dff, .06, outerR + .022);
    } else if (id === 'prismatic_tide') {
      faceDirs.forEach((dir, i) => {
        addSurfacePlate(dir, i % 2 ? 0xdafcff : 0x8bf6ff, sides === 6 ? .62 : .48, sides === 6 ? .62 : .48, .032, outerR - .01, { transparent: true, opacity: .3, transmission: .7, metalness: .02, roughness: .02, clearcoat: 1.95, clearcoatRoughness: .02 });
        addSurfaceDroplet(dir, i % 2 ? 0xdafcff : 0x9afcff, sides === 6 ? .16 : .12, sides === 6 ? .22 : .18, .055, outerR + .014);
      });
      [ [.18,.18],[-.2,.1],[.1,-.2] ].forEach(([x,y], idx) => addCornerStud(faceDirs[0], x, y, [0xffffff,0xc8ffff,0x9afcff][idx], .04, outerR + .018, { metalness: .04, roughness: .02 }));
    } else if (id === 'mythic_aeon') {
      faceDirs.forEach((dir, i) => {
        addFrame(dir, [0xf3ebc1,0x8fefff,0x9d8cff][i % 3], sides === 6 ? .72 : .54, .04, .04, outerR + .018, { metalness: .34, roughness: .08 });
        addSurfacePlate(dir, i % 2 ? 0x251a3f : 0x171126, sides === 6 ? .44 : .34, sides === 6 ? .44 : .34, .04, outerR - .008, { metalness: .08, roughness: .06, transparent: true, opacity: .85, transmission: .18, emissive: i % 2 ? 0x4d34a1 : 0x264a6b, emissiveIntensity: .03 });
        addGem(dir, [0xf5edc3,0x6cefff,0x9d8cff,0xffffff][i % 4], .06, outerR + .024, { opacity: .88, transmission: .32 });
      });
      addGem(new THREE.Vector3(0,1,0), 0xf5edc3, .11, outerR + .036);
      addGem(new THREE.Vector3(0,-1,0), 0x6cefff, .09, outerR + .028);
    } else {
      faceDirs.forEach((dir, i) => {
        addFrame(dir, i % 2 ? skin.emissive || '#ffffff' : skin.accent || '#ffffff', sides === 6 ? .7 : .54, .05, .04, outerR + .016, { metalness: .4, roughness: .12 });
      });
    }
  }



  resetHighlights() {
    for (const mat of this.faceMaterials) {
      if (!mat) continue;
      mat.emissive?.setHex?.(0x000000);
      mat.emissiveIntensity = 0;
      if ('clearcoat' in mat) mat.clearcoat = 1;
    }
    for (const mat of this.labelMaterials) {
      if (!mat) continue;
      mat.color?.set?.(0xffffff);
      if ('opacity' in mat) mat.opacity = 1;
    }
    if (this.highlightRing) this.highlightRing.visible = false;
  }

  highlightResult(result) {
    this.resetHighlights();
    const index = Math.max(0, Math.min(this.faceMaterials.length - 1, Number(result || 1) - 1));
    const faceMat = this.faceMaterials[index];
    const labelMat = this.labelMaterials[index];
    const skin = this.active?.userData?.skin || {};
    const hi = new THREE.Color(skin.accent || '#ffd681');

    if (faceMat) {
      faceMat.emissive?.copy?.(hi);
      faceMat.emissiveIntensity = 1.35;
      if ('clearcoat' in faceMat) faceMat.clearcoat = 1.2;
    }
    if (labelMat) {
      labelMat.color?.copy?.(hi);
      if ('opacity' in labelMat) labelMat.opacity = 1;
    }

    // A previous roll's ring belongs to the previous die. Re-create it whenever
    // the active die changes so the result highlight cannot silently disappear.
    if (!this.highlightRing || this.highlightRing.parent !== this.active) {
      this.highlightRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, .08, 18, 72),
        new THREE.MeshBasicMaterial({ color: hi, transparent: true, opacity: .78, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      this.highlightRing.renderOrder = 30;
      this.active?.add?.(this.highlightRing);
    } else {
      this.highlightRing.material?.color?.copy?.(hi);
    }

    const normal = this.faceNormals[index] || new THREE.Vector3(0, 1, 0);
    this.highlightRing.visible = true;
    this.highlightRing.position.copy(normal.clone().multiplyScalar(1.2));
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
    const bodyTune = this.bodyMaterialTuning(skin);
    for (let f = 0; f < 20; f++) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, f * 3), b = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1), c = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2);
      const tri = new THREE.BufferGeometry().setFromPoints([a, b, c]); tri.computeVertexNormals();
      const tint = base.clone().offsetHSL(0, 0, (f % 4 - 1.5) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(bodyTune.roughness ?? skin.roughness ?? .24), metalness: Number(bodyTune.metalness ?? skin.metalness ?? .36), clearcoat: Number(bodyTune.clearcoat ?? (premium?1.45:1.05)), clearcoatRoughness: Number(bodyTune.clearcoatRoughness ?? .08), emissive, emissiveIntensity: skin.id==='classic'?0:(premium?.52:.34), transmission: Number(bodyTune.transmission ?? ((skin.id==='aurora_crystal'||skin.id==='nebula_glass')?.06:0)), transparent: Boolean(bodyTune.transparent ?? false), opacity: Number(bodyTune.opacity ?? 1) });
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
    const labelColor = skin.accent || '#fff9ec'; const emissive = new THREE.Color(skin.emissive || '#000000'); const premium = Number(skin.price||0)>=12; const bodyTune = this.bodyMaterialTuning(skin);
    const faces = [
      { normal: [1, 0, 0], roll: 1 }, { normal: [-1, 0, 0], roll: 6 }, { normal: [0, 1, 0], roll: 2 },
      { normal: [0, -1, 0], roll: 5 }, { normal: [0, 0, 1], roll: 3 }, { normal: [0, 0, -1], roll: 4 },
    ];
    faces.forEach(({ roll }, idx) => {
      const tint = new THREE.Color(skin.base || '#b94836').offsetHSL(0, 0, (idx % 3 - 1) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(bodyTune.roughness ?? skin.roughness ?? .22), metalness: Number(bodyTune.metalness ?? skin.metalness ?? .32), clearcoat: Number(bodyTune.clearcoat ?? (premium?1.45:1.05)), clearcoatRoughness: Number(bodyTune.clearcoatRoughness ?? .08), emissive, emissiveIntensity: skin.id==='classic'?0:(premium?.52:.34), transmission: Number(bodyTune.transmission ?? 0), transparent: Boolean(bodyTune.transparent ?? false), opacity: Number(bodyTune.opacity ?? 1) });
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
    this.highlightRing = null;
    this.clearFx();
    const dieStyle = skin || color;
    const profile = this.fxProfile(typeof dieStyle === 'object' ? dieStyle : { base: dieStyle });
    const die = sides === 6 ? this.d6(dieStyle) : this.d20(dieStyle);
    this.active = die;
    this.active.userData.skin = typeof dieStyle === 'object' ? dieStyle : { base: dieStyle, id: 'classic' };
    this.scene.add(die);
    this.prioritizeDie(die);

    // Presentation-first roll: the die enters clearly, spins hard, makes two readable
    // contacts, then settles into the result instead of disappearing inside particles.
    die.position.set(-3.35, 2.2, -.25);
    die.scale.multiplyScalar(.9);
    die.rotation.set(Math.random() * 5.4, Math.random() * 5.4, Math.random() * 5.4);
    this.setupRollFx(die, profile);

    const normal = this.faceNormals[Math.max(0, Math.min(this.faceNormals.length - 1, result - 1))] || new THREE.Vector3(0, 1, 0);
    const align = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * Math.PI * 1.35);
    const finalQ = yaw.multiply(align);
    const start = performance.now();
    let lastBounce = -1;
    let lastNow = start;
    this.running = true;

    return new Promise(resolve => {
      const frame = now => {
        const dt = Math.min(.05, (now - lastNow) / 1000 || .016);
        lastNow = now;
        const t = Math.min(1, (now - start) / duration);
        const enter = Math.min(1, t / .22);
        const motion = 1 - Math.pow(1 - t, 2.7);
        const x = -3.35 + 3.35 * motion;
        const arc = 2.2 * Math.pow(1 - t, 1.65);
        const contactWave = Math.abs(Math.sin(Math.min(1, t * 1.08) * Math.PI * 4.2));
        const bounce = contactWave * .68 * Math.pow(1 - t, 1.5);
        const z = -.25 + .32 * Math.sin(t * Math.PI * 2.2) * (1 - t);
        die.position.set(x, -.04 + arc + bounce, z);

        const targetScale = .9 + .12 * Math.sin(Math.min(1, enter) * Math.PI / 2);
        die.scale.setScalar(targetScale);

        if (t < .68) {
          const spin = .032 + (1 - t) * .19;
          die.rotation.x += spin * .92;
          die.rotation.y += spin * 1.28;
          die.rotation.z += spin * .74;
        } else {
          const settle = Math.min(1, (t - .68) / .32);
          die.quaternion.slerp(finalQ, .08 + settle * .18);
        }

        this.trailFx(die, profile, dt);
        this.tickFx(dt, (now - start) / 1000);

        const b = Math.floor(t * 4.3);
        if (b !== lastBounce && t > .2 && t < .84) {
          lastBounce = b;
          this.synthHit(.04 + (1 - t) * .045, 78 + Math.random() * 38, profile);
          if (profile.tier >= 3 && t > .42) {
            this.ring(new THREE.Vector3(die.position.x, -1.4, die.position.z), profile.accent, .08, 1.25 + profile.tier * .16, .24, .22);
          }
        }

        // Very light camera presentation: a gentle push-in, not screen shake.
        const push = Math.sin(Math.min(1, t) * Math.PI) * (profile.tier >= 4 ? .16 : profile.tier >= 3 ? .1 : .06);
        this.camera.position.set(0, 4.58 - push * .18, 8.5 - push);
        this.camera.lookAt(die.position.x * .11, Math.max(.03, die.position.y * .12), 0);
        this.renderer.render(this.scene, this.camera);

        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }

        die.quaternion.copy(finalQ);
        die.position.set(0, -.04, 0);
        die.scale.setScalar(1.02);
        this.camera.position.set(0, 4.55, 8.34);
        this.camera.lookAt(0, .04, 0);
        this.highlightResult(result);
        this.landingFx(profile);
        this.synthHit(profile.tier >= 4 ? .2 : profile.tier >= 3 ? .16 : .12, profile.tier >= 4 ? 44 : profile.tier >= 3 ? 50 : 58, profile);

        const settleStart = performance.now();
        let settleLast = settleStart;
        const settleFrame = ts => {
          const dt2 = Math.min(.05, (ts - settleLast) / 1000 || .016);
          settleLast = ts;
          this.tickFx(dt2, (ts - start) / 1000);
          this.renderer.render(this.scene, this.camera);
          const hold = profile.tier >= 4 ? 1700 : profile.tier >= 3 ? 1450 : 1150;
          if (ts - settleStart < hold) requestAnimationFrame(settleFrame);
          else { this.running = false; resolve(); }
        };
        requestAnimationFrame(settleFrame);
      };
      requestAnimationFrame(frame);
    });
  }
}

import * as THREE from '/vendor/three.module.js';

console.info('[Chronicle Gate] DiceTheater visual build 8392');

export class DiceTheater {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    this.camera.position.set(0, 4.6, 8.5);
    this.camera.lookAt(0, .2, 0);
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
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d'); x.clearRect(0, 0, 256, 256); x.textAlign = 'center'; x.textBaseline = 'middle';
    const font = opts.font || 'Georgia'; const weight = opts.weight || '800';
    const premium = !!opts.premium;
    const frame = opts.frameColor || 'rgba(255,255,255,.8)';
    const badge = opts.badgeColor || 'rgba(8,10,18,.82)';
    const glow = opts.glowColor || color;
    const stroke = opts.stroke || 'rgba(0,0,0,.92)';

    const roundRect = (ctx, x0, y0, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      ctx.arcTo(x0, y0 + h, x0, y0, r);
      ctx.arcTo(x0, y0, x0 + w, y0, r);
      ctx.closePath();
    };

    if (premium) {
      x.shadowColor = glow; x.shadowBlur = 28;
      if (opts.badgeShape === 'circle') {
        x.fillStyle = badge; x.beginPath(); x.arc(128, 128, 66, 0, Math.PI * 2); x.fill();
        x.lineWidth = 7; x.strokeStyle = frame; x.stroke();
      } else if (opts.badgeShape === 'hex') {
        x.fillStyle = badge; x.beginPath();
        [[128,48],[194,88],[194,168],[128,208],[62,168],[62,88]].forEach(([px,py],i)=> i ? x.lineTo(px,py) : x.moveTo(px,py));
        x.closePath(); x.fill(); x.lineWidth = 7; x.strokeStyle = frame; x.stroke();
      } else {
        roundRect(x, 52, 58, 152, 140, 28); x.fillStyle = badge; x.fill();
        x.lineWidth = 7; x.strokeStyle = frame; x.stroke();
      }
      if (opts.oneVariant && String(text) === '1') {
        x.lineWidth = 5; x.strokeStyle = frame;
        x.beginPath(); x.moveTo(128, 34); x.lineTo(146, 56); x.lineTo(128, 78); x.lineTo(110, 56); x.closePath(); x.stroke();
        x.fillStyle = glow; x.globalAlpha = .6; x.fill(); x.globalAlpha = 1;
      }
      if (opts.cornerMarks) {
        x.fillStyle = frame;
        [[72,78],[184,78],[72,178],[184,178]].forEach(([px,py])=>{ x.beginPath(); x.arc(px,py,5,0,Math.PI*2); x.fill(); });
      }
    }

    x.font = `${weight} ${opts.fontSize || (premium ? 116 : 96)}px ${font}`;
    x.shadowColor = opts.shadow || 'rgba(0,0,0,.9)'; x.shadowBlur = opts.shadowBlur ?? (premium ? 14 : 10);
    x.lineWidth = opts.strokeWidth || (premium ? 9 : 5); x.strokeStyle = stroke; x.strokeText(text,128,136);
    x.fillStyle = color; x.fillText(text, 128, 136);
    if (premium && opts.underGlow) {
      x.globalAlpha = .35; x.fillStyle = glow; x.fillRect(86, 182, 84, 7); x.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.userData.material = mat;
    return mesh;
  }

  labelSpec(roll, skin = {}, premium = false) {
    const id = String(skin?.id || 'classic');
    const text = String(roll);
    if (!premium) return { text, opts: {} };
    const spec = {
      font: 'Arial Black', weight: '900', premium: true, oneVariant: true, cornerMarks: true, underGlow: true,
      badgeShape: 'shield', badgeColor: 'rgba(10,12,20,.84)', frameColor: '#f0deb2', glowColor: skin.accent || '#ffffff',
      stroke: 'rgba(4,6,10,.95)', shadow: 'rgba(0,0,0,.9)', shadowBlur: 16, strokeWidth: 10,
    };
    const paletteById = {
      clockwork: { badgeShape:'circle', frameColor:'#d9fbff', badgeColor:'rgba(12,60,74,.82)', font:'Arial Black', glowColor:'#b7f7ff' },
      aurora_crystal: { badgeShape:'shield', frameColor:'#ffd07a', badgeColor:'rgba(88,24,12,.78)', font:'Arial Black', glowColor:'#ff9a52' },
      eclipse_obsidian: { badgeShape:'circle', frameColor:'#f4e6c7', badgeColor:'rgba(55,42,92,.78)', font:'Georgia', glowColor:'#d7b98a' },
      starseed: { badgeShape:'hex', frameColor:'#7ffcff', badgeColor:'rgba(13,25,58,.82)', font:'Arial Black', glowColor:'#ff59d8' },
      neon_prism: { badgeShape:'hex', frameColor:'#d6bfff', badgeColor:'rgba(22,20,34,.88)', font:'Arial Black', glowColor:'#b38cff' },
      celestial_choir: { badgeShape:'circle', frameColor:'#f0cf7c', badgeColor:'rgba(10,20,44,.84)', font:'Georgia', glowColor:'#9fc1ff' },
      crown_steel: { badgeShape:'circle', frameColor:'#f1cd7a', badgeColor:'rgba(55,35,20,.82)', font:'Arial Black', glowColor:'#8fd2ff', stroke:'rgba(28,18,10,.9)' },
      void_monarch: { badgeShape:'hex', frameColor:'#ffb6f7', badgeColor:'rgba(16,12,34,.86)', font:'Arial Black', glowColor:'#8f8cff' },
      rift_shard: { badgeShape:'circle', frameColor:'#f4fff9', badgeColor:'rgba(88,134,122,.82)', font:'Arial Black', glowColor:'#dffbf2', stroke:'rgba(28,62,56,.92)' },
      prismatic_tide: { badgeShape:'circle', frameColor:'#dcffff', badgeColor:'rgba(18,74,86,.7)', font:'Arial Black', glowColor:'#baffff' },
      mythic_aeon: { badgeShape:'hex', frameColor:'#ffe5a4', badgeColor:'rgba(18,18,34,.88)', font:'Arial Black', glowColor:'#76ecff', stroke:'rgba(20,16,34,.95)' },
    };
    Object.assign(spec, paletteById[id] || {});
    if (roll === 1) spec.fontSize = 128;
    return { text, opts: spec };
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
      classic: 'classic', nebula_glass: 'nebula', abyss_pearl: 'abyss', twilight_gilt: 'gilt', clockwork: 'water',
      aurora_crystal: 'fire', eclipse_obsidian: 'musicbox', starseed: 'arcade', runic_tempest: 'tempest', phoenix_ember: 'phoenix', verdant_relic: 'relic',
      neon_prism: 'rift', celestial_choir: 'celestial', crown_steel: 'crown', void_monarch: 'void', rift_shard: 'jade', prismatic_tide: 'prism', mythic_aeon: 'mythic',
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
    const mat = new THREE.SpriteMaterial({ map: this.getGlowTexture(), color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    const s = new THREE.Sprite(mat); s.position.copy(pos); s.scale.setScalar(size); s.renderOrder = 30; this.fxGroup.add(s);
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
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
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
    const mat = new THREE.SpriteMaterial({ map: this.getGlowTexture(), color, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    const s = new THREE.Sprite(mat); s.scale.setScalar(size); s.renderOrder = 31; s.userData = { radius, speed, y, phase, die }; this.fxGroup.add(s); this.fxOrbiters.push(s); return s;
  }

  addHalo(die, color, radius = 1.9, opacity = .35) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const h = new THREE.Mesh(new THREE.TorusGeometry(radius, .045, 10, 64), mat); h.rotation.x = Math.PI / 2; h.renderOrder = 28; h.userData.die = die; this.fxGroup.add(h); this.fxOrbiters.push(h); return h;
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
      depthTest: false,
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
      obj.renderOrder = 40;
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
      obj.renderOrder = 41;
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
          { color: accent, radius: 1.88, opacity: .48, rotation: [Math.PI / 2, 0, .12] },
          { color: emissive, radius: 2.14, opacity: .34, rotation: [.35, .65, .18] },
          { color: '#ffffff', radius: 2.42, opacity: .24, rotation: [.68, .18, .52] },
        ]
      : tier === 3
        ? [
            { color: accent, radius: 1.84, opacity: .42, rotation: [Math.PI / 2, 0, 0] },
            { color: emissive, radius: 2.08, opacity: .28, rotation: [.42, .52, .2] },
          ]
        : tier === 2
          ? [ { color: accent, radius: 1.8, opacity: .22, rotation: [Math.PI / 2, 0, 0] } ]
          : [ { color: accent, radius: 1.76, opacity: .12, rotation: [Math.PI / 2, 0, 0] } ];

    haloSpecs.forEach(spec => {
      const h = this.addHalo(die, spec.color, spec.radius, spec.opacity);
      h.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    });

    const orbCount = tier >= 4 ? 5 : tier === 3 ? 4 : tier === 2 ? 2 : 1;
    for (let i = 0; i < orbCount; i++) {
      const color = i % 2 ? emissive : accent;
      const radius = (tier >= 3 ? 2.12 : 1.96) + i * .18;
      const speed = .34 + i * .14;
      const y = -.18 + i * .18;
      const phase = i * 1.45;
      const size = tier >= 4 ? .17 + (i % 2) * .03 : tier === 3 ? .145 : .105;
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
    const interval = profile.tier >= 4 ? .05 : profile.tier === 3 ? .07 : profile.tier === 2 ? .12 : .18;
    if (this.fxTrailClock < interval) return;
    this.fxTrailClock = 0;

    const basePos = die.position.clone();
    const accent = new THREE.Color(profile.accent);
    const secondary = new THREE.Color(profile.emissive || profile.accent);
    const tier = Number(profile.tier || 0);
    const count = tier >= 4 ? 5 : tier === 3 ? 3 : 2;

    for (let i = 0; i < count; i++) {
      const p = basePos.clone().add(new THREE.Vector3((Math.random() - .5) * .45, (Math.random() - .5) * .35, (Math.random() - .5) * .45));
      const c = i % 2 ? secondary : accent;
      const velocity = new THREE.Vector3(-.08 - Math.random() * .22, .12 + Math.random() * .18, (Math.random() - .5) * .12);
      this.addSprite(p, c, tier >= 4 ? .16 : tier === 3 ? .13 : .105, .34 + Math.random() * .22, velocity, .04);
    }

    if (tier >= 3 && Math.random() < .4) {
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

    this.ring(p, accent, .24, tier >= 4 ? 4.9 : tier === 3 ? 4.2 : tier === 2 ? 3.15 : 2.4, tier >= 4 ? .98 : .84, .8);
    if (tier >= 2) this.ring(p.clone().add(new THREE.Vector3(0, .012, 0)), emissive, .2, tier >= 4 ? 3.9 : tier === 3 ? 3.4 : 2.55, tier >= 4 ? .9 : .74, .58);
    if (tier >= 4) this.ring(p.clone().add(new THREE.Vector3(0, .024, 0)), '#ffffff', .18, 3.2, .82, .34);

    this.burst(new THREE.Vector3(0, -.92, 0), accent, tier >= 4 ? 28 : tier === 3 ? 18 : tier === 2 ? 10 : 6, tier >= 4 ? 2.5 : tier === 3 ? 2.0 : 1.45, tier >= 4 ? .18 : .15, tier >= 4 ? 1.0 : .82, tier >= 4 ? .58 : .42);
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
      clockwork:{font:'Arial Black',weight:'900',scale:1.1,edge:'#d9fbff',shell:'water-flow'},
      aurora_crystal:{font:'Arial Black',weight:'900',scale:1.1,edge:'#ffd07a',shell:'ember-flare'},
      eclipse_obsidian:{font:'Georgia',weight:'900',scale:1.1,edge:'#f4e6c7',shell:'music-box'},
      starseed:{font:'Arial Black',weight:'900',scale:1.1,edge:'#7ffcff',shell:'arcade-pixel'},
      runic_tempest:{font:'Arial Black',weight:'900',scale:1.05,edge:'#d7f1ff',shell:'storm-runes'},
      phoenix_ember:{font:'Georgia',weight:'900',scale:1.05,edge:'#ffcf7a',shell:'ember-feather'},
      verdant_relic:{font:'Trebuchet MS',weight:'900',scale:1.05,edge:'#dcffd1',shell:'jade-vines'},
      neon_prism:{font:'Arial Black',weight:'900',scale:1.12,edge:'#ffd7ff',shell:'boundary-shard'},
      celestial_choir:{font:'Georgia',weight:'900',scale:1.12,edge:'#ffe7a2',shell:'night-sky'},
      crown_steel:{font:'Georgia',weight:'900',scale:1.14,edge:'#f1cd7a',shell:'royal-regalia'},
      void_monarch:{font:'Arial Black',weight:'900',scale:1.12,edge:'#ffb6f7',shell:'galaxy-veil'},
      rift_shard:{font:'Trebuchet MS',weight:'900',scale:1.12,edge:'#f2fff8',shell:'celadon-jade'},
      prismatic_tide:{font:'Arial Black',weight:'900',scale:1.12,edge:'#7ffcff',shell:'prism-wave'},
      mythic_aeon:{font:'Arial Black',weight:'900',scale:1.17,edge:'#ffe5a4',shell:'chronos'},
    };
    return map[id]||map.classic;
  }


  addSignatureSilhouette(group, skin = {}, sides = 20) {
    const id = String(skin?.id || 'classic');
    const scale = sides === 6 ? 1 : .82;
    const topY = sides === 6 ? 1.08 : 1.34;
    const frontZ = sides === 6 ? 1.08 : 1.24;
    const sideX = sides === 6 ? .42 : .34;
    const gold = (c = 0xf1c56d, metalness = .9, roughness = .18) => new THREE.MeshPhysicalMaterial({ color:c, metalness, roughness, clearcoat:1.35, clearcoatRoughness:.06 });
    const gem = (c, opts = {}) => new THREE.MeshPhysicalMaterial({ color:c, transparent:true, opacity:opts.opacity ?? .94, transmission:opts.transmission ?? .24, roughness:opts.roughness ?? .03, metalness:opts.metalness ?? .08, clearcoat:1.8, clearcoatRoughness:.03, emissive:opts.emissive ?? c, emissiveIntensity:opts.emissiveIntensity ?? .08, depthWrite:false });
    const orb = (x,y,z,r,c,opts={}) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r,24,18), gem(c,opts)); m.position.set(x,y,z); group.add(m); return m; };
    const jewel = (x,y,z,sx,sy,sz,c,rot=0,opts={}) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1,0), gem(c,{opacity:.96,transmission:.16,...opts})); m.scale.set(sx,sy,sz); m.position.set(x,y,z); m.rotation.y = rot; group.add(m); return m; };
    const ring = (r,t,c,y=topY,rx=Math.PI/2,ry=0,rz=0,opacity=.72) => { const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,44),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false})); m.position.y=y; m.rotation.set(rx,ry,rz); group.add(m); return m; };
    const bar = (w,h,d,c,x=0,y=topY,z=0,rz=0,rx=0) => { const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), gold(c,.86,.16)); m.position.set(x,y,z); m.rotation.z=rz; m.rotation.x=rx; group.add(m); return m; };
    const droplet = (x,y,z,scaleMul=1,c=0xbef8ff) => { const m=new THREE.Mesh(new THREE.SphereGeometry(.11*scaleMul,16,12), gem(c,{opacity:.9,transmission:.5})); m.scale.set(.8,.98,.58); m.position.set(x,y,z); group.add(m); return m; };

    if (id === 'clockwork') {
      ring(.56*scale,.03*scale,0x9eefff,topY-.02*scale,Math.PI/2,.1,.35,.56);
      ring(.42*scale,.02*scale,0xd9fbff,topY+.04*scale,.8,.55,0,.38);
      [ [-.28,.02,.14],[0,.12,0],[.26,-.02,-.12] ].forEach(([x,y,z],i)=>droplet(x*scale,topY+y*scale,z*scale,.92-i*.08,i===1?0xe8ffff:0x8ee8ff));
      jewel(0,0,frontZ,.14*scale,.22*scale,.12*scale,0xd6fbff,.2,{opacity:.92,transmission:.48});
    } else if (id === 'aurora_crystal') {
      [ [-.24,.02,0,.2],[0,.14,.06,0],[.25,-.02,-.04,-.2] ].forEach(([x,y,z,rz],i)=>{ const flame = new THREE.Mesh(new THREE.ConeGeometry(.085*scale,.34*scale,5), gem(i===1?0xffefb5:0xff8a4d,{opacity:.88,transmission:.08,emissive:i===1?0xffb64d:0xff6e34,emissiveIntensity:.18})); flame.position.set(x*scale,topY+y*scale,z*scale); flame.rotation.z=rz; group.add(flame); });
      orb(0,topY-.02*scale,0,.1*scale,0xffc26c,{opacity:.94,transmission:.22,emissive:0xff8a32,emissiveIntensity:.22});
      ring(.46*scale,.02*scale,0xffc26c,topY-.12*scale,Math.PI/2,0,0,.42);
    } else if (id === 'eclipse_obsidian') {
      orb(0,topY,0,.16*scale,0xf4e7c8,{opacity:.92,transmission:.18,emissive:0xd7b88d,emissiveIntensity:.08});
      [0,1].forEach(i=>bar(.28*scale,.04*scale,.04*scale,0xdab880, i? .26*scale:-.26*scale, topY-.04*scale, 0, 0, Math.PI/2));
      jewel(.34*scale,topY+.02*scale,0,.08*scale,.12*scale,.08*scale,0x7d6bce,.35,{opacity:.92,transmission:.18});
      jewel(-.34*scale,topY+.02*scale,0,.08*scale,.12*scale,.08*scale,0x7d6bce,-.35,{opacity:.92,transmission:.18});
    } else if (id === 'starseed') {
      const pxCols=[0x7ffcff,0xff59d8,0xffd969,0x92a0ff];
      [[-.24,.08],[0,.16],[.24,.08],[-.12,-.1],[.12,-.1]].forEach(([x,y],i)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(.12*scale,.12*scale,.04*scale), new THREE.MeshBasicMaterial({color:pxCols[i%pxCols.length]})); m.position.set(x*scale,topY+y*scale,0); group.add(m); });
      orb(0,topY-.06*scale,0,.09*scale,0xffffff,{opacity:.95,transmission:.12,emissive:0x7ffcff,emissiveIntensity:.15});
      ring(.44*scale,.018*scale,0x7ffcff,topY-.14*scale,Math.PI/2,.25,0,.34);
    } else if (id === 'crown_steel') {
      [0,1,2].forEach(i=>{ const crown=new THREE.Mesh(new THREE.ConeGeometry(.08*scale,.24*scale,4), gold(0xf0c96f,.95,.16)); crown.position.set((i-1)*.16*scale, topY+.08*scale + (i===1?.04*scale:0), 0); crown.rotation.z=(i-1)*-.1; group.add(crown); });
      orb(0, topY-.02*scale, 0, .12*scale, 0x8fd3ff);
      ring(.52*scale,.026*scale,0xf0c96f,topY-.08*scale,Math.PI/2,0,0,.52);
    } else if (id === 'void_monarch') {
      orb(0,topY,0,.14*scale,0xffb4f5,{opacity:.92,transmission:.18,emissive:0xff9cf2,emissiveIntensity:.12});
      ring(.52*scale,.024*scale,0xff9af2,topY,1.0,.35,.2,.42);
      ring(.38*scale,.018*scale,0x7b6cff,topY,.35,.9,.2,.34);
      jewel(0,0,frontZ,.12*scale,.18*scale,.12*scale,0x8b7cff,.3,{opacity:.9,transmission:.2});
    } else if (id === 'neon_prism') {
      [ [-.26,.08,.08,.12,0xffd7ff],[.22,.02,-.1,.14,0x8d66ff],[.02,.18,.02,.1,0xffffff] ].forEach(([x,y,z,s,col],i)=>jewel(x*scale,topY+y*scale,z*scale,s*scale,(s+.06)*scale,.06*scale,col,(i-1)*.35,{opacity:.92,transmission:.16}));
      ring(.5*scale,.018*scale,0x8d66ff,topY-.08*scale,Math.PI/2,.35,.5,.3);
    } else if (id === 'rift_shard') {
      faceDirs.forEach((dir, i) => {
        addSurfacePlate(dir, i % 2 ? 0xe4fbf3 : 0xd3f0e6, sides === 6 ? .6 : .46, sides === 6 ? .6 : .46, .04, outerR - .006, { metalness: .04, roughness: .16, transparent: true, opacity: .94, transmission: .16 });
        addFrame(dir, 0xf4fff9, sides === 6 ? .7 : .54, .036, .036, outerR + .016, { metalness: .18, roughness: .1 });
        addOvalCore(dir, i % 2 ? 0xecfff8 : 0xcfeadf, sides === 6 ? .18 : .14, sides === 6 ? .24 : .18, .07, outerR + .012, { transparent: true, opacity: .92, transmission: .24, emissive: i % 2 ? 0xbfe7da : 0xa7d5c7, emissiveIntensity: .04 });
      });
      [new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0)].forEach((dir, i) => addGem(dir, i ? 0xcde7dd : 0xf4fff9, .07, outerR + .024));
    } else if (id === 'prismatic_tide') {
      faceDirs.forEach((dir, i) => {
        addSurfacePlate(dir, i % 2 ? 0xdafcff : 0x8bf6ff, sides === 6 ? .62 : .48, sides === 6 ? .62 : .48, .032, outerR - .01, { transparent: true, opacity: .3, transmission: .7, metalness: .02, roughness: .02, clearcoat: 1.95, clearcoatRoughness: .02 });
        addSurfaceDroplet(dir, i % 2 ? 0xdafcff : 0x9afcff, sides === 6 ? .16 : .12, sides === 6 ? .22 : .18, .055, outerR + .014);
      });
      [ [.18,.18],[-.2,.1],[.1,-.2] ].forEach(([x,y], idx) => addCornerStud(faceDirs[0], x, y, [0xffffff,0xc8ffff,0x9afcff][idx], .04, outerR + .018, { metalness: .04, roughness: .02 }));
    } else if (id === 'mythic_aeon') {
      faceDirs.forEach((dir, i) => {
        addFrame(dir, [0xffe5a4,0x76ecff,0xb8a0ff][i % 3], sides === 6 ? .72 : .54, .04, .04, outerR + .018, { metalness: .44, roughness: .08 });
        addSurfacePlate(dir, i % 2 ? 0x221c35 : 0x181726, sides === 6 ? .44 : .34, sides === 6 ? .44 : .34, .04, outerR - .008, { metalness: .14, roughness: .06, transparent: true, opacity: .88, transmission: .16, emissive: i % 2 ? 0x5646a6 : 0x23556b, emissiveIntensity: .04 });
        addGem(dir, [0xfff0c4,0x76ecff,0xb8a0ff,0xffffff][i % 4], .055, outerR + .024, { opacity: .9, transmission: .28 });
      });
      const timeDirs=[new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)];
      timeDirs.forEach((dir,i)=>{ addGem(dir, i?0x76ecff:0xffe5a4, .1 - i*.01, outerR + .032 - i*.004); });
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


  roundedBoxGeometry(size = 2.28, radius = .2, segments = 5) {
    const geom = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
    const pos = geom.attributes.position;
    const half = size / 2;
    const inner = Math.max(.01, half - radius);
    const v = new THREE.Vector3();
    const clamped = new THREE.Vector3();
    const delta = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      clamped.set(
        THREE.MathUtils.clamp(v.x, -inner, inner),
        THREE.MathUtils.clamp(v.y, -inner, inner),
        THREE.MathUtils.clamp(v.z, -inner, inner),
      );
      delta.copy(v).sub(clamped);
      if (delta.lengthSq() > 1e-8) v.copy(clamped).add(delta.normalize().multiplyScalar(radius));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }

  premiumPalette(skin = {}) {
    const id = String(skin.id || 'classic');
    const palettes = {
      clockwork: { body:'#154b5a', face:['#8de7ef','#b8fbff','#64cad9','#dffcff'], edge:'#eafcff', number:'#f8ffff', rough:.04, metal:.04, transmit:.42 },
      aurora_crystal: { body:'#49160f', face:['#8c2214','#bf3d1c','#f26f2d','#ffd08a'], edge:'#ffcf79', number:'#fff6de', rough:.08, metal:.18, transmit:.08 },
      eclipse_obsidian: { body:'#2a2242', face:['#ede3c7','#d5c0a0','#413761','#f5ecda'], edge:'#cfb07a', number:'#fff8ea', rough:.12, metal:.18, transmit:.04 },
      starseed: { body:'#121b42', face:['#173067','#203980','#1b244e','#2a1f63'], edge:'#7ffcff', number:'#ffffff', rough:.06, metal:.42, transmit:.02 },
      neon_prism: { body:'#17192a', face:['#221f35','#1a1829','#2b2351','#171827'], edge:'#cfb8ff', number:'#fff3ff', rough:.08, metal:.4, transmit:.02 },
      celestial_choir: { body:'#071121', face:['#0d1a34','#122246','#182850','#0a1730'], edge:'#f0cf7c', number:'#fff5d8', rough:.07, metal:.18, transmit:.02 },
      crown_steel: { body:'#3d2918', face:['#4d331c','#5a381f','#643a20','#3d261a'], edge:'#f1cd7a', number:'#fff8e3', rough:.1, metal:.68, transmit:.02 },
      void_monarch: { body:'#120d21', face:['#211536','#281d4a','#151129','#2d2155'], edge:'#ffb6f7', number:'#fff7ff', rough:.06, metal:.36, transmit:.08 },
      rift_shard: { body:'#77afa0', face:['#dff6ef','#cceee2','#edfdf8','#bfe3d7'], edge:'#f4fff9', number:'#255049', rough:.16, metal:.06, transmit:.22 },
      prismatic_tide: { body:'#0c2b33', face:['#62c9d3','#9aeff2','#3b9ca8'], edge:'#d8ffff', number:'#f4ffff', rough:.04, metal:.05, transmit:.34 },
      mythic_aeon: { body:'#171324', face:['#2a223f','#1d2139','#34284d','#152131'], edge:'#ffe5a4', number:'#fff7de', rough:.06, metal:.5, transmit:.08 },
    };
    return palettes[id] || null;
  }


  addD6FaceInlay(group, dir, palette, index, skin) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
    const id = String(skin.id || '');
    const mat = new THREE.MeshPhysicalMaterial({
      color: palette.face[index % palette.face.length],
      roughness: palette.rough,
      metalness: palette.metal,
      clearcoat: 1.7,
      clearcoatRoughness: .04,
      transparent: palette.transmit > 0,
      opacity: palette.transmit > 0 ? .96 : 1,
      transmission: palette.transmit,
      emissive: new THREE.Color(skin.emissive || '#000000'),
      emissiveIntensity: ['void_monarch','eclipse_obsidian'].includes(id) ? .18 : ['crown_steel','mythic_aeon','neon_prism','rift_shard','celestial_choir'].includes(id) ? .14 : .08,
      depthWrite: palette.transmit <= 0,
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.7,1.7,.09), mat);
    plate.position.copy(dir.clone().multiplyScalar(1.135));
    plate.quaternion.copy(q);
    group.add(plate);

    const frameMat = new THREE.MeshPhysicalMaterial({ color: palette.edge, metalness: .9, roughness: .16, clearcoat: 1.32, clearcoatRoughness: .06 });
    const frame = new THREE.Group();
    [[1.76,.085,0,.84],[1.76,.085,0,-.84],[.085,1.76,.84,0],[.085,1.76,-.84,0]].forEach(([w,h,x,y])=>{
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w,h,.05), frameMat);
      bar.position.set(x,y,0); frame.add(bar);
    });
    frame.position.copy(dir.clone().multiplyScalar(1.185));
    frame.quaternion.copy(q);
    group.add(frame);

    const addLocal = (geom, material, x=0, y=0, z=.075, sx=1, sy=1, sz=1, rz=0, rx=0) => {
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(x,y,z);
      mesh.scale.set(sx,sy,sz);
      mesh.rotation.z = rz;
      mesh.rotation.x = rx;
      frame.add(mesh);
      return mesh;
    };
    const metal = c => new THREE.MeshPhysicalMaterial({ color:c, metalness:.88, roughness:.16, clearcoat:1.28, clearcoatRoughness:.06 });
    const crystal = (c, emissive = null, opacity=.95, transmission=.22) => new THREE.MeshPhysicalMaterial({ color:c, transparent:true, opacity, transmission, roughness:.03, metalness:.06, clearcoat:1.8, clearcoatRoughness:.03, emissive:emissive ?? c, emissiveIntensity:.08, depthWrite:false });
    const addGem = (x,y,size=.18,color=0xffffff,rz=0,sx=1,sy=1,sz=.6) => addLocal(new THREE.OctahedronGeometry(size,0), crystal(color), x,y,.105,sx,sy,sz,rz);
    const addOrb = (x,y,r=.16,color=0xffd4ff,sx=1,sy=1,sz=.7,opacity=.95,transmission=.22) => addLocal(new THREE.SphereGeometry(r,18,14), crystal(color,color,opacity,transmission), x,y,.105,sx,sy,sz);
    const addStuds = (coords, size=.05, color=null) => coords.forEach(([x,y])=>addLocal(new THREE.SphereGeometry(size,10,8), metal(color || palette.edge), x,y,.075));
    const addRing = (radius=.42, tube=.022, color=palette.edge, z=.094, rx=Math.PI/2, ry=0, rz=0, opacity=.78) => addLocal(new THREE.TorusGeometry(radius,tube,10,34), new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}), 0,0,z,1,1,1,rz,rx);
    const addLine = (x,y,w,h,color,z=.084,rz=0) => addLocal(new THREE.BoxGeometry(w,h,.03), metal(color), x,y,z,1,1,1,rz);
    const addPixel = (x,y,size=.14,color=0xffffff) => addLocal(new THREE.BoxGeometry(size,size,.03), new THREE.MeshBasicMaterial({color}), x,y,.082);

    const addWater = () => {
      addLocal(new THREE.BoxGeometry(.98,.98,.03), new THREE.MeshPhysicalMaterial({color:0x94f1ff,transparent:true,opacity:.42,transmission:.65,roughness:.02,metalness:.02,clearcoat:1.8,clearcoatRoughness:.02,depthWrite:false}),0,0,.07,1.04,1.04,1);
      addRing(.46,.02,0xd6fbff,.11,Math.PI/2,.2,.2,.45);
      addRing(.28,.016,0x9cefff,.12,.8,.52,0,.32);
      addOrb(-.24,.18,.1,0xc7fbff,1.3,.9,.55,.92,.6); addOrb(.22,-.1,.13,0x86e7ff,1.1,1.15,.45,.9,.6); addOrb(.06,.26,.06,0xf0ffff,1,1,.5,.95,.4);
      addLine(.05,-.34,.52,.038,0xeefcff,.088,.18); addLine(-.08,-.22,.38,.03,0xb8f5ff,.086,-.22);
    };
    const addFire = () => {
      addLocal(new THREE.BoxGeometry(.9,.9,.035), new THREE.MeshPhysicalMaterial({color:0x3c130f,roughness:.08,metalness:.42,clearcoat:1.55,emissive:0x59150d,emissiveIntensity:.14}),0,0,.068);
      addGem(0,.04,.24,0xffcf72,.06,1.05,1.42,.66);
      addGem(-.24,-.12,.12,0xff7b41,-.18,1,1.4,.55);
      addGem(.22,-.12,.12,0xff9448,.18,1,1.35,.55);
      addLine(0,-.38,.46,.045,0xffcf72,.086,0);
      addStuds([[-.58,.58],[.58,.58],[-.58,-.58],[.58,-.58]], .04, 0xffb35f);
    };
    const addMusicBox = () => {
      addLocal(new THREE.BoxGeometry(.92,.92,.035), new THREE.MeshPhysicalMaterial({color:0xe9dfc9,roughness:.16,metalness:.08,clearcoat:1.35}),0,0,.07);
      addOrb(0,.02,.22,0xf7ecd8,1.12,1.12,.44,.96,.16);
      addRing(.3,.02,0xcfb180,.108,Math.PI/2,0,0,.44);
      addLine(.34,.18,.04,.32,0xd4b079,.082,0); addLine(.46,.18,.18,.04,0xd4b079,.082,0); addOrb(.5,.24,.04,0xd4b079,1,1,.5,.95,.1);
      addOrb(-.18,-.14,.04,0x7b67c6,1,1,.4,.92,.2); addOrb(-.1,-.04,.03,0x7b67c6,1,1,.4,.92,.2); addLine(-.13,-.09,.028,.16,0x7b67c6,.084,.2);
      addStuds([[-.56,.56],[.56,.56],[-.56,-.56],[.56,-.56]], .035, 0xcfb180);
    };
    const addArcade = () => {
      addLocal(new THREE.BoxGeometry(.94,.94,.038), new THREE.MeshPhysicalMaterial({color:0x0d1738,roughness:.06,metalness:.48,clearcoat:1.6}),0,0,.068);
      [[-.24,.18,0x7ffcff],[0,.18,0xff5be0],[.24,.18,0xffd66c],[-.12,-.02,0x90a0ff],[.12,-.02,0x7ffcff],[-.24,-.22,0xff5be0],[0,-.22,0xffd66c],[.24,-.22,0x7ffcff]].forEach(([x,y,c])=>addPixel(x,y,.14,c));
      addLine(0,.4,.62,.03,0x7ffcff,.084,0);
      addOrb(-.42,.32,.06,0xff5be0,1,1,.45,.95,.12); addLine(-.42,.15,.04,.26,0xffffff,.084,0); addLine(-.54,.15,.18,.04,0xffffff,.084,0);
      addOrb(.42,.3,.06,0xffd66c,1,1,.45,.95,.12); addOrb(.3,.18,.05,0x7ffcff,1,1,.45,.95,.12);
    };
    const addBoundary = () => {
      addLocal(new THREE.BoxGeometry(.92,.92,.04), new THREE.MeshPhysicalMaterial({color:0x161827,roughness:.07,metalness:.52,clearcoat:1.4}),0,0,.068);
      addLine(0,0,.74,.05,0xb89cff,.082,.58); addLine(0,0,.74,.03,0xffffff,.09,-.48);
      [[-.32,.18,.18,.12,0xffdcff,-.35],[.3,.12,.16,.1,0x9a78ff,.24],[-.18,-.26,.12,.08,0xffffff,.5],[.22,-.2,.14,.1,0xc9a8ff,-.4]].forEach(([x,y,sx,sy,c,rz])=>addLocal(new THREE.BoxGeometry(sx,sy,.05), crystal(c,c,.92,.16), x,y,.105,1,1,1,rz));
      addGem(0,0,.16,0xfff2ff,.16,1.2,1.2,.58);
    };
    const addRoyal = () => {
      addLocal(new THREE.BoxGeometry(.92,.92,.04), new THREE.MeshPhysicalMaterial({color:0x40281a,roughness:.12,metalness:.46,clearcoat:1.45}),0,0,.068);
      addRing(.42,.024,0xf1cd7a,.11,Math.PI/2,0,0,.52);
      addOrb(0,.02,.2,0x8fd2ff,1.15,1.15,.52,.96,.18);
      [ [-.24,.18],[0,.28],[.24,.18] ].forEach(([x,y],i)=>addLocal(new THREE.ConeGeometry(.06,.16,4), metal(0xf1cd7a), x,y,.095,1,1,1, i===1?0:(x<0?.14:-.14)));
      addStuds([[-.56,.56],[.56,.56],[-.56,-.56],[.56,-.56]], .04, 0xf1cd7a);
    };
    const addCeladon = () => {
      addLocal(new THREE.BoxGeometry(.94,.94,.038), new THREE.MeshPhysicalMaterial({color:0xdaf4ea,transparent:true,opacity:.96,transmission:.18,roughness:.14,metalness:.04,clearcoat:1.55}),0,0,.07);
      addOrb(0,0,.2,0xeffff8,1.22,1.1,.42,.96,.2);
      addRing(.34,.018,0xf4fff9,.106,Math.PI/2,0,0,.34);
      [[0,.26],[.22,0],[0,-.26],[-.22,0]].forEach(([x,y])=>addGem(x,y,.07,0xc9e8dc,.16,1.15,1.15,.54));
      addLine(0,.12,.26,.02,0x7ab19f,.082,0); addLine(0,-.12,.26,.02,0x7ab19f,.082,0); addLine(.12,0,.02,.26,0x7ab19f,.082,0); addLine(-.12,0,.02,.26,0x7ab19f,.082,0);
    };
    const addNightSky = () => {
      addLocal(new THREE.BoxGeometry(.94,.94,.04), new THREE.MeshPhysicalMaterial({color:0x0a142c,roughness:.06,metalness:.34,clearcoat:1.55}),0,0,.068);
      const stars=[[-.26,.2,0xffffff,.045],[.06,.28,0xffe7a4,.05],[.28,.02,0x9fc1ff,.04],[-.08,-.12,0xffffff,.038],[.22,-.24,0xffe7a4,.042]];
      stars.forEach(([x,y,c,r])=>addOrb(x,y,r,c,1,1,.4,.96,.1));
      [[-.26,.2,.06,.28],[.06,.28,.28,.02],[.28,.02,.22,-.24],[-.08,-.12,.22,-.24]].forEach(([x1,y1,x2,y2])=>{ const dx=x2-x1, dy=y2-y1; addLine((x1+x2)/2,(y1+y2)/2,Math.hypot(dx,dy),.018,0xf0cf7c,.084,Math.atan2(dy,dx)); });
    };
    const addGalaxy = () => {
      addLocal(new THREE.BoxGeometry(.94,.94,.04), new THREE.MeshPhysicalMaterial({color:0x140d24,roughness:.05,metalness:.36,clearcoat:1.6}),0,0,.068);
      addOrb(0,0,.2,0xffb6f7,1.2,1,.4,.94,.22);
      addRing(.38,.018,0x7c6cff,.11,Math.PI/2,.58,0,.34); addRing(.28,.014,0xffb6f7,.116,.65,.2,.4,.28);
      addOrb(.24,-.14,.05,0xffffff,1,1,.4,.96,.1); addOrb(-.28,.22,.045,0x8fb8ff,1,1,.4,.96,.1);
    };
    const addChronos = () => {
      addLocal(new THREE.BoxGeometry(.94,.94,.04), new THREE.MeshPhysicalMaterial({color:0x151322,roughness:.07,metalness:.52,clearcoat:1.55}),0,0,.068);
      addRing(.42,.022,0xffe5a4,.112,Math.PI/2,0,0,.5); addRing(.28,.016,0x76ecff,.118,Math.PI/2,0,0,.36);
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; addLine(Math.cos(a)*.26,Math.sin(a)*.26,.1,.022,i%2?0x76ecff:0xffe5a4,.086,a); }
      addGem(0,0,.14,0xfff0c4,.1,1.1,1.1,.6); addLine(.08,.08,.18,.02,0xffffff,.09,.78); addLine(-.02,.02,.14,.02,0x76ecff,.09,.1);
    };

    if (id === 'clockwork') addWater();
    else if (id === 'aurora_crystal') addFire();
    else if (id === 'eclipse_obsidian') addMusicBox();
    else if (id === 'starseed') addArcade();
    else if (id === 'neon_prism') addBoundary();
    else if (id === 'crown_steel') addRoyal();
    else if (id === 'rift_shard') addCeladon();
    else if (id === 'celestial_choir') addNightSky();
    else if (id === 'void_monarch') addGalaxy();
    else if (id === 'mythic_aeon') addChronos();
    return mat;
  }


  addD20FaceMotif(group, center, normal, skin, index) {
    const id = String(skin?.id || '');
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), normal.clone().normalize());
    const motif = new THREE.Group();
    motif.position.copy(center.clone().add(normal.clone().multiplyScalar(.07)));
    motif.quaternion.copy(q);
    group.add(motif);
    const metal = c => new THREE.MeshPhysicalMaterial({ color:c, metalness:.86, roughness:.16, clearcoat:1.18, clearcoatRoughness:.07 });
    const crystal = (c, e=null) => new THREE.MeshPhysicalMaterial({ color:c, transparent:true, opacity:.94, transmission:.18, roughness:.04, metalness:.06, clearcoat:1.7, clearcoatRoughness:.03, emissive:e ?? c, emissiveIntensity:.06, depthWrite:false });
    const add = (geom, mat, x=0, y=0, z=.02, sx=1, sy=1, sz=1, rz=0, rx=0) => { const m=new THREE.Mesh(geom,mat); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.rotation.z=rz; m.rotation.x=rx; motif.add(m); return m; };
    const gemCore = (x,y,size,col,sx=1,sy=1,sz=.7)=>add(new THREE.OctahedronGeometry(size,0), crystal(col), x,y,.03,sx,sy,sz,.15);
    const line = (x,y,w,h,c,rz=0)=>add(new THREE.BoxGeometry(w,h,.014), metal(c), x,y,.02,1,1,1,rz);
    const orb = (x,y,r,c,sx=1,sy=1,sz=.45)=>add(new THREE.SphereGeometry(r,12,10), crystal(c), x,y,.025,sx,sy,sz);

    if (id === 'clockwork') {
      orb(-.08,.07,.045,0xbef8ff,1.2,1,.4); orb(.08,-.03,.06,0x8ee8ff,1.2,1.2,.35); line(0,-.1,.18,.015,0xeafcff,.15);
    } else if (id === 'aurora_crystal') {
      gemCore(0,.02,.08,0xffd079,1,1.28,.62); gemCore(-.08,-.08,.04,0xff7b41,1,1.2,.45); gemCore(.08,-.08,.04,0xff9448,1,1.2,.45);
    } else if (id === 'eclipse_obsidian') {
      orb(0,0,.07,0xf4e7c8,1.18,1.18,.35); line(.11,.03,.04,.16,0xcfb180,0); line(.18,.03,.1,.04,0xcfb180,0); orb(-.08,-.06,.025,0x7b67c6,1,1,.35);
    } else if (id === 'starseed') {
      [[-.08,.06,0x7ffcff],[0,.06,0xff5be0],[.08,.06,0xffd66c],[-.04,-.05,0x90a0ff],[.04,-.05,0x7ffcff]].forEach(([x,y,c])=>add(new THREE.BoxGeometry(.05,.05,.012), new THREE.MeshBasicMaterial({color:c}), x,y,.02));
    } else if (id === 'neon_prism') {
      [[-.08,.06,.09,.05,0xffdcff,-.4],[.08,-.02,.08,.05,0x9a78ff,.28],[.02,.11,.06,.04,0xffffff,.6]].forEach(([x,y,w,h,c,rz])=>add(new THREE.BoxGeometry(w,h,.02), crystal(c), x,y,.02,1,1,1,rz));
    } else if (id === 'crown_steel') {
      orb(0,0,.07,0x8fd2ff,1.1,1.1,.42); [[-.08,.08],[0,.14],[.08,.08]].forEach(([x,y],i)=>add(new THREE.ConeGeometry(.026,.07,4), metal(0xf1cd7a), x,y,.03,1,1,1, i===1?0:(x<0?.12:-.12)));
    } else if (id === 'rift_shard') {
      orb(0,0,.065,0xeafdf5,1.2,1.05,.35); [[0,.1],[.09,0],[0,-.1],[-.09,0]].forEach(([x,y])=>line(x,y,.08,.014,0x7ab19f,Math.atan2(y,x))); }
    else if (id === 'celestial_choir') {
      [[-.08,.06,0xffffff],[.02,.12,0xffe7a4],[.1,-.02,0x9fc1ff],[-.02,-.08,0xffffff]].forEach(([x,y,c])=>orb(x,y,.025,c,1,1,.32));
      [[-.08,.06,.02,.12],[.02,.12,.1,-.02],[-.02,-.08,.1,-.02]].forEach(([x1,y1,x2,y2])=>line((x1+x2)/2,(y1+y2)/2,Math.hypot(x2-x1,y2-y1),.012,0xf0cf7c,Math.atan2(y2-y1,x2-x1)));
    } else if (id === 'void_monarch') {
      orb(0,0,.07,0xffb6f7,1.18,1,.34); add(new THREE.TorusGeometry(.11,.01,8,20), new THREE.MeshBasicMaterial({color:0x7c6cff,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}),0,0,.028,1,1,1,.4,Math.PI/2); orb(.09,-.07,.02,0xffffff,1,1,.3);
    } else if (id === 'mythic_aeon') {
      add(new THREE.TorusGeometry(.13,.012,10,26), new THREE.MeshBasicMaterial({color:0xffe5a4,transparent:true,opacity:.74,blending:THREE.AdditiveBlending,depthWrite:false}),0,0,.024,1,1,1,0,Math.PI/2);
      for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; line(Math.cos(a)*.09,Math.sin(a)*.09,.05,.012,i%2?0x76ecff:0xffe5a4,a); }
      gemCore(0,0,.05,0xfff0c4,1.05,1.05,.6);
    }
  }


  d20(style) {
    const group = new THREE.Group();
    const shellGeom = new THREE.IcosahedronGeometry(1.55, 0).toNonIndexed();
    const pos = shellGeom.attributes.position;
    this.faceNormals = []; this.faceMaterials = []; this.labelMaterials = [];
    const skin = typeof style === 'object' && style ? style : { base: style || '#c24a35' };
    const visual = this.skinVisual(skin);
    const palette = this.premiumPalette(skin);
    const premium = Boolean(palette);
    const base = new THREE.Color(skin.base || '#c24a35');
    const emissive = new THREE.Color(skin.emissive || '#000000');
    const labelColor = palette?.number || skin.accent || '#fff9ec';

    if (premium) {
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.64,0), new THREE.MeshPhysicalMaterial({color:palette.body,roughness:palette.rough+.08,metalness:Math.min(.9,palette.metal+.12),clearcoat:1.35,clearcoatRoughness:.07,emissive,emissiveIntensity:.08}));
      shell.castShadow=true; shell.receiveShadow=true; group.add(shell);
    }

    for (let f = 0; f < 20; f++) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, f*3);
      const b = new THREE.Vector3().fromBufferAttribute(pos, f*3+1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, f*3+2);
      const center = a.clone().add(b).add(c).divideScalar(3);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (normal.dot(center) < 0) normal.negate();
      this.faceNormals.push(normal.clone());

      const shrink = premium ? .82 : 1;
      const lift = premium ? .025 : 0;
      const ia = center.clone().lerp(a, shrink).add(normal.clone().multiplyScalar(lift));
      const ib = center.clone().lerp(b, shrink).add(normal.clone().multiplyScalar(lift));
      const ic = center.clone().lerp(c, shrink).add(normal.clone().multiplyScalar(lift));
      const tri = new THREE.BufferGeometry().setFromPoints([ia,ib,ic]); tri.computeVertexNormals();
      const tint = premium ? new THREE.Color(palette.face[f % palette.face.length]) : base.clone().offsetHSL(0,0,(f%4-1.5)*.025);
      const mat = new THREE.MeshPhysicalMaterial({
        color:tint,
        roughness:Number(premium?palette.rough:(skin.roughness??.24)),
        metalness:Number(premium?palette.metal:(skin.metalness??.36)),
        clearcoat:premium?1.55:1.05,
        clearcoatRoughness:premium?.04:.08,
        emissive,
        emissiveIntensity:skin.id==='classic'?0:(premium?.12:.34),
        transmission:premium?palette.transmit:((skin.id==='aurora_crystal'||skin.id==='nebula_glass')?.06:0),
        transparent:premium&&palette.transmit>0,
        opacity:premium&&palette.transmit>0?.94:1,
        depthWrite:!(premium&&palette.transmit>0),
      });
      const mesh = new THREE.Mesh(tri,mat); mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh); this.faceMaterials[f]=mat;

      if (premium && (f % 2 === 0 || ['clockwork','aurora_crystal','eclipse_obsidian','starseed','neon_prism','crown_steel','rift_shard','mythic_aeon'].includes(skin.id))) {
        this.addD20FaceMotif(group, center, normal, skin, f);
      }

      const labelCfg = this.labelSpec(f + 1, skin, !!premium);
      const label = this.makeLabel(labelCfg.text, premium ? .56 : .44, labelColor, Object.assign({font:visual.font,weight:visual.weight,stroke:skin.id==='neon_prism'?'#061019':null,strokeWidth:premium?5:4,shadow:skin.emissive||'rgba(0,0,0,.9)',shadowBlur:premium?12:(skin.id==='classic'?8:14)}, labelCfg.opts));
      label.position.copy(center.clone().add(normal.clone().multiplyScalar(premium?.096:.022)));
      label.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal); group.add(label); this.labelMaterials[f]=label.userData.material;
    }
    const edgeColor = palette?.edge || visual.edge || skin.accent || '#ffe2ba';
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.556,0),1),new THREE.LineBasicMaterial({color:edgeColor,transparent:true,opacity:premium?.72:.82}));
    group.add(edges); this.decorateDie(group,skin,20); return group;
  }

  d6(style) {
    const group = new THREE.Group();
    this.faceNormals=[]; this.faceMaterials=[]; this.labelMaterials=[];
    const skin = typeof style === 'object' && style ? style : { base: style || '#b94836' };
    const visual=this.skinVisual(skin);
    const palette=this.premiumPalette(skin);
    const premium=Boolean(palette);
    const labelColor=palette?.number || skin.accent || '#fff9ec';
    const emissive=new THREE.Color(skin.emissive||'#000000');
    const faces=[
      {normal:[1,0,0],roll:1},{normal:[-1,0,0],roll:6},{normal:[0,1,0],roll:2},
      {normal:[0,-1,0],roll:5},{normal:[0,0,1],roll:3},{normal:[0,0,-1],roll:4},
    ];

    if (premium) {
      const shell = new THREE.Mesh(this.roundedBoxGeometry(2.42,.24,5),new THREE.MeshPhysicalMaterial({color:palette.body,roughness:palette.rough+.08,metalness:Math.min(.92,palette.metal+.12),clearcoat:1.45,clearcoatRoughness:.06,emissive,emissiveIntensity:.06}));
      shell.castShadow=true; shell.receiveShadow=true; group.add(shell);
      faces.forEach(({normal,roll},idx)=>{
        const v=new THREE.Vector3(...normal); this.faceNormals[roll-1]=v.clone();
        this.faceMaterials[roll-1]=this.addD6FaceInlay(group,v,palette,idx,skin);
        const labelCfg=this.labelSpec(roll, skin, true);
        const label=this.makeLabel(labelCfg.text,.9,labelColor,Object.assign({font:visual.font,weight:visual.weight,stroke:skin.id==='neon_prism'?'#061019':null,strokeWidth:5,shadow:skin.emissive||'rgba(0,0,0,.88)',shadowBlur:14},labelCfg.opts));
        label.position.copy(v.clone().multiplyScalar(1.28)); label.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v); group.add(label); this.labelMaterials[roll-1]=label.userData.material;
      });
    } else {
      const geom=new THREE.BoxGeometry(2.25,2.25,2.25,1,1,1);
      faces.forEach(({roll},idx)=>{
        const tint=new THREE.Color(skin.base||'#b94836').offsetHSL(0,0,(idx%3-1)*.025);
        this.faceMaterials[roll-1]=new THREE.MeshPhysicalMaterial({color:tint,roughness:Number(skin.roughness??.22),metalness:Number(skin.metalness??.32),clearcoat:1.05,clearcoatRoughness:.08,emissive,emissiveIntensity:skin.id==='classic'?0:.34});
      });
      const materials=[this.faceMaterials[0],this.faceMaterials[5],this.faceMaterials[1],this.faceMaterials[4],this.faceMaterials[2],this.faceMaterials[3]];
      const cube=new THREE.Mesh(geom,materials);cube.castShadow=true;cube.receiveShadow=true;group.add(cube);
      faces.forEach(({normal,roll})=>{const v=new THREE.Vector3(...normal);this.faceNormals[roll-1]=v.clone();const labelCfg=this.labelSpec(roll, skin, false);const label=this.makeLabel(labelCfg.text,.76,labelColor,Object.assign({font:visual.font,weight:visual.weight,shadow:skin.emissive||'rgba(0,0,0,.9)',shadowBlur:skin.id==='classic'?8:14},labelCfg.opts));label.position.copy(v.clone().multiplyScalar(1.15));label.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v);group.add(label);this.labelMaterials[roll-1]=label.userData.material;});
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geom),new THREE.LineBasicMaterial({color:visual.edge||skin.accent||'#ffe6c6',transparent:true,opacity:.84}));group.add(edges);
    }
    this.decorateDie(group,skin,6); return group;
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


  animateTimed(duration, onFrame, onDone = null) {
    return new Promise(resolve => {
      const start = performance.now();
      let last = start;
      const loop = now => {
        const dt = Math.min(.05, (now - last) / 1000 || .016);
        last = now;
        const t = Math.min(1, (now - start) / duration);
        onFrame(t, dt, now);
        this.renderer.render(this.scene, this.camera);
        if (t < 1) {
          requestAnimationFrame(loop);
          return;
        }
        if (onDone) onDone();
        this.renderer.render(this.scene, this.camera);
        resolve();
      };
      requestAnimationFrame(loop);
    });
  }

  playTierReassembly(die, profile, startTime = performance.now()) {
    if (!die || Number(profile?.tier || 0) < 3) return Promise.resolve();
    const parts = die.children.filter((child, idx) => idx > 0 && child && child.visible !== false && !child.userData?.noShatter);
    if (!parts.length) return Promise.resolve();

    const tier = Number(profile?.tier || 0);
    const states = parts.map((part, idx) => {
      const base = part.position.lengthSq() > .0001
        ? part.position.clone().normalize()
        : new THREE.Vector3(Math.cos(idx * 1.7), ((idx % 3) - 1) * .25, Math.sin(idx * 1.7)).normalize();
      const radial = tier >= 4 ? .62 : .48;
      const lift = tier >= 4 ? .16 : .11;
      const twist = tier >= 4 ? 1.34 : .92;
      return {
        part,
        position: part.position.clone(),
        quaternion: part.quaternion.clone(),
        scale: part.scale.clone(),
        offset: base.multiplyScalar(radial + (idx % 4) * .034).add(new THREE.Vector3(0, ((idx % 5) - 2) * lift * .12, 0)),
        spinAxis: new THREE.Vector3(.35 + (idx % 3) * .22, .85, .2 + (idx % 4) * .17).normalize(),
        spin: twist + (idx % 5) * .18,
      };
    });

    const fractureEnd = tier >= 4 ? .36 : .33;
    const total = tier >= 4 ? 560 : 480;
    let burstTriggered = false;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    return this.animateTimed(total, (t, dt, now) => {
      const amount = t < fractureEnd ? easeOut(t / fractureEnd) : 1 - easeInOut((t - fractureEnd) / (1 - fractureEnd));
      if (!burstTriggered && t >= fractureEnd * .92) {
        burstTriggered = true;
        this.ring(new THREE.Vector3(0, -.04, 0), profile.accent, .16, tier >= 4 ? 2.9 : 2.25, .3, .24);
        this.shardBurst(new THREE.Vector3(0, .18, 0), profile.emissive || profile.accent, tier >= 4 ? 12 : 8, tier >= 4 ? .62 : .52);
        this.synthHit(tier >= 4 ? .1 : .075, tier >= 4 ? 62 : 68, profile);
      }
      for (const state of states) {
        state.part.position.copy(state.position).addScaledVector(state.offset, amount);
        const twistQ = new THREE.Quaternion().setFromAxisAngle(state.spinAxis, state.spin * amount);
        state.part.quaternion.copy(state.quaternion).multiply(twistQ);
        state.part.scale.copy(state.scale).multiplyScalar(1 + amount * (tier >= 4 ? .13 : .09));
      }
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => {
      for (const state of states) {
        state.part.position.copy(state.position);
        state.part.quaternion.copy(state.quaternion);
        state.part.scale.copy(state.scale);
      }
    });
  }

  playNightSkySettle(die, profile, startTime = performance.now()) {
    const group = new THREE.Group();
    group.userData.noShatter = true;
    die.add(group);
    const makeStar = color => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.getGlowTexture(), color, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(.01);
      group.add(s);
      return s;
    };
    const stars = [
      { mesh: makeStar(0xffffff), end: new THREE.Vector3(-.48,.5,.18), size: .18 },
      { mesh: makeStar(0xffe7a4), end: new THREE.Vector3(-.08,.78,.02), size: .2 },
      { mesh: makeStar(0x9fc1ff), end: new THREE.Vector3(.42,.56,-.08), size: .16 },
      { mesh: makeStar(0xffffff), end: new THREE.Vector3(.28,.14,.22), size: .14 },
      { mesh: makeStar(0xffe7a4), end: new THREE.Vector3(-.22,.02,-.18), size: .15 },
    ];
    const linePairs = [[0,1],[1,2],[2,3],[3,4]];
    const lineMat = color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
    const lines = linePairs.map(([a,b]) => {
      const va = stars[a].end, vb = stars[b].end;
      const dx = vb.x - va.x, dy = vb.y - va.y;
      const len = Math.hypot(dx, dy);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, .022, .018), lineMat(0xf0cf7c));
      mesh.position.set((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
      mesh.rotation.z = Math.atan2(dy, dx);
      mesh.scale.x = 0;
      group.add(mesh);
      return mesh;
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.56, .018, 10, 48), new THREE.MeshBasicMaterial({ color: 0x9fc1ff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = Math.PI / 2; halo.position.y = .24; group.add(halo);
    this.ring(new THREE.Vector3(0, -.04, 0), 0xf0cf7c, .12, 2.15, .54, .24);
    const ease = t => 1 - Math.pow(1 - t, 3);
    const fade = t => t < .62 ? ease(Math.min(1, t / .62)) : 1 - Math.pow((t - .62) / .38, 2);
    return this.animateTimed(640, (t, dt, now) => {
      const amt = Math.max(0, Math.min(1, fade(t)));
      group.rotation.y = t * .8;
      halo.material.opacity = .26 * amt;
      halo.scale.setScalar(.84 + amt * .26);
      stars.forEach((star, idx) => {
        star.mesh.position.copy(star.end).multiplyScalar(amt);
        star.mesh.scale.setScalar(star.size * (.3 + amt * .7));
      });
      lines.forEach((line, idx) => {
        line.scale.x = amt;
        line.material.opacity = .48 * amt;
      });
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => die.remove(group));
  }

  playRoyalSettle(die, profile, startTime = performance.now()) {
    const group = new THREE.Group();
    group.userData.noShatter = true;
    die.add(group);
    group.position.y = .1;
    const metalMat = new THREE.MeshPhysicalMaterial({ color: 0xf1cd7a, metalness: .92, roughness: .14, clearcoat: 1.4, clearcoatRoughness: .06 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .034, 12, 56), metalMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = .18; group.add(ring);
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 14), new THREE.MeshPhysicalMaterial({ color: 0x8fd2ff, transparent: true, opacity: .94, transmission: .22, roughness: .03, metalness: .06, clearcoat: 1.8, emissive: 0x8fd2ff, emissiveIntensity: .1, depthWrite: false }));
    jewel.position.y = .28; group.add(jewel);
    const spikes = [];
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.055, .19, 4), metalMat);
      const a = (i - 2) * .28;
      spike.position.set(Math.sin(a) * .34, .28 + (i === 2 ? .06 : 0), Math.cos(a) * .12);
      spike.rotation.z = i === 2 ? 0 : (i < 2 ? .22 : -.22);
      spike.scale.y = .1;
      group.add(spike);
      spikes.push(spike);
    }
    const sideGems = [-1, 1].map(sign => {
      const g = new THREE.Mesh(new THREE.OctahedronGeometry(.06, 0), new THREE.MeshPhysicalMaterial({ color: 0xfff2d2, transparent: true, opacity: .92, transmission: .18, roughness: .04, metalness: .06, clearcoat: 1.6, emissive: 0xf1cd7a, emissiveIntensity: .06, depthWrite: false }));
      g.position.set(sign * .38, .22, 0);
      group.add(g);
      return g;
    });
    this.ring(new THREE.Vector3(0, -.04, 0), 0xf1cd7a, .12, 2.0, .48, .22);
    return this.animateTimed(620, (t, dt, now) => {
      const amt = t < .58 ? 1 - Math.pow(1 - t / .58, 3) : 1 - Math.pow((t - .58) / .42, 2);
      const v = Math.max(0, Math.min(1, amt));
      group.rotation.y = Math.sin(t * Math.PI) * .2;
      ring.scale.setScalar(.45 + v * .72);
      ring.position.y = .12 + v * .16;
      jewel.scale.setScalar(.6 + v * .6);
      jewel.position.y = .2 + v * .12;
      sideGems.forEach((g, i) => {
        g.position.x = (i ? 1 : -1) * (.18 + v * .24);
        g.rotation.y += dt * (i ? 2.4 : -2.4);
        g.scale.setScalar(.45 + v * .55);
      });
      spikes.forEach((spike, i) => {
        spike.scale.y = .18 + v * .82;
        spike.rotation.z = (i === 2 ? 0 : (i < 2 ? .42 : -.42)) * v;
      });
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => die.remove(group));
  }

  playGalaxySettle(die, profile, startTime = performance.now()) {
    const group = new THREE.Group();
    group.userData.noShatter = true;
    die.add(group);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(.56, .022, 10, 64), new THREE.MeshBasicMaterial({ color: 0x7c6cff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    ringA.rotation.set(Math.PI / 2, .3, .12);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(.38, .016, 10, 56), new THREE.MeshBasicMaterial({ color: 0xffb6f7, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    ringB.rotation.set(.8, .5, .2);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.getGlowTexture(), color: 0xffb6f7, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.scale.setScalar(.1);
    group.add(ringA); group.add(ringB); group.add(core);
    const sats = [0,1,2,3].map(i => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.getGlowTexture(), color: [0xffffff,0x8fb8ff,0xffb6f7,0x7c6cff][i], transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(.08 + (i % 2) * .02); group.add(s); return s;
    });
    let burst = false;
    return this.animateTimed(700, (t, dt, now) => {
      const amt = t < .62 ? 1 - Math.pow(1 - t / .62, 3) : 1 - Math.pow((t - .62) / .38, 2);
      const v = Math.max(0, Math.min(1, amt));
      if (!burst && t > .08) {
        burst = true;
        this.cloudBurst(new THREE.Vector3(0, -.02, 0), [0x7c6cff, 0xffb6f7, 0xffffff], 120, 1.4, .42, .1, .15, .08);
      }
      group.rotation.y += dt * 1.2;
      ringA.material.opacity = .34 * v;
      ringB.material.opacity = .3 * v;
      ringA.rotation.z += dt * 1.8;
      ringB.rotation.y -= dt * 2.1;
      ringA.scale.setScalar(.7 + v * .5);
      ringB.scale.setScalar(.68 + v * .4);
      core.material.opacity = .66 * v;
      core.scale.setScalar(.18 + v * .22);
      sats.forEach((s, i) => {
        const a = t * (2.6 + i * .4) * Math.PI * (i % 2 ? 1 : -1) + i * 1.3;
        const r = (.28 + i * .07) * v;
        s.position.set(Math.cos(a) * r, Math.sin(a * 1.2) * .08, Math.sin(a) * r);
        s.material.opacity = .74 * v;
      });
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => die.remove(group));
  }

  playCeladonSettle(die, profile, startTime = performance.now()) {
    const group = new THREE.Group();
    group.userData.noShatter = true;
    die.add(group);
    const petalMat = new THREE.MeshPhysicalMaterial({ color: 0xe9fff8, transparent: true, opacity: .94, transmission: .22, roughness: .08, metalness: .04, clearcoat: 1.7, clearcoatRoughness: .03, emissive: 0xcbe8db, emissiveIntensity: .08, depthWrite: false });
    const petals = [
      new THREE.Vector3(.34,.22,0), new THREE.Vector3(-.34,.22,0), new THREE.Vector3(.34,-.18,0), new THREE.Vector3(-.34,-.18,0)
    ].map((end, i) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(.08, 0), petalMat);
      m.scale.set(.8, 1.3, .45); m.userData.end = end; group.add(m); return m;
    });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x7ab19f, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
    const cracks = [
      { p: new THREE.Vector3(0,.2,.02), len: .42, rz: 0 }, { p: new THREE.Vector3(0,-.2,.02), len: .42, rz: 0 },
      { p: new THREE.Vector3(.2,0,.02), len: .42, rz: Math.PI/2 }, { p: new THREE.Vector3(-.2,0,.02), len: .42, rz: Math.PI/2 },
    ].map(data => { const m = new THREE.Mesh(new THREE.BoxGeometry(data.len, .02, .012), crackMat); m.position.copy(data.p); m.rotation.z = data.rz; m.scale.x = 0; group.add(m); return m; });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.42, .016, 8, 48), new THREE.MeshBasicMaterial({ color: 0xf4fff9, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = Math.PI / 2; group.add(halo);
    return this.animateTimed(650, (t, dt, now) => {
      const amt = t < .58 ? 1 - Math.pow(1 - t / .58, 3) : 1 - Math.pow((t - .58) / .42, 2);
      const v = Math.max(0, Math.min(1, amt));
      halo.material.opacity = .22 * v;
      halo.scale.setScalar(.82 + v * .3);
      petals.forEach((p, i) => {
        p.position.copy(p.userData.end).multiplyScalar(v);
        p.rotation.z = (i % 2 ? 1 : -1) * v * .45;
        p.scale.set(.8 + v * .2, 1.1 + v * .35, .45 + v * .06);
      });
      cracks.forEach(c => { c.scale.x = v; c.material.opacity = .5 * v; });
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => die.remove(group));
  }

  playChronosSettle(die, profile, startTime = performance.now()) {
    const group = new THREE.Group();
    group.userData.noShatter = true;
    die.add(group);
    const makeRing = (r, t, color) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(m); return m;
    };
    const rings = [makeRing(.56,.018,0xffe5a4), makeRing(.4,.014,0x76ecff), makeRing(.26,.012,0xb8a0ff)];
    rings[0].rotation.x = Math.PI / 2; rings[1].rotation.set(.65,.2,0); rings[2].rotation.set(1.05,.2,.3);
    const ticks = [];
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xffe5a4, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(.08, .018, .014), tickMat);
      m.position.set(Math.cos(a) * .42, Math.sin(a) * .42, .03);
      m.rotation.z = a;
      group.add(m);
      ticks.push(m);
    }
    const handMatA = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
    const handMatB = new THREE.MeshBasicMaterial({ color: 0x76ecff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
    const handLong = new THREE.Mesh(new THREE.BoxGeometry(.22, .018, .014), handMatA);
    const handShort = new THREE.Mesh(new THREE.BoxGeometry(.14, .022, .014), handMatB);
    handLong.position.x = .11; handShort.position.x = .07;
    group.add(handLong); group.add(handShort);
    let flashed = false;
    return this.animateTimed(760, (t, dt, now) => {
      const amt = t < .65 ? 1 - Math.pow(1 - t / .65, 3) : 1 - Math.pow((t - .65) / .35, 2);
      const v = Math.max(0, Math.min(1, amt));
      if (!flashed && t > .48) {
        flashed = true;
        this.flashDisc(new THREE.Vector3(0, .06, 0), 0xffe5a4, 1.7, .18, .32);
      }
      rings.forEach((ring, i) => {
        ring.material.opacity = (.28 - i * .04) * v;
        ring.rotation.y += dt * (i % 2 ? -1.8 - i * .2 : 1.5 + i * .25);
        ring.scale.setScalar(.72 + v * (.42 - i * .06));
      });
      ticks.forEach((tick, i) => {
        tick.material.opacity = .48 * v;
        tick.scale.x = .4 + v * .6;
      });
      handLong.material.opacity = .64 * v;
      handShort.material.opacity = .58 * v;
      handLong.rotation.z = -Math.PI / 2 + t * Math.PI * 2.4;
      handShort.rotation.z = -Math.PI / 2 + t * Math.PI * 1.3;
      this.tickFx(dt, (now - startTime) / 1000);
    }, () => die.remove(group));
  }

  playSignatureSettleEffect(die, profile, startTime = performance.now()) {
    if (!die || Number(profile?.tier || 0) < 3) return Promise.resolve();
    const id = String(die?.userData?.skin?.id || '');
    if (id === 'neon_prism') return this.playTierReassembly(die, profile, startTime);
    if (id === 'celestial_choir') return this.playNightSkySettle(die, profile, startTime);
    if (id === 'crown_steel') return this.playRoyalSettle(die, profile, startTime);
    if (id === 'void_monarch') return this.playGalaxySettle(die, profile, startTime);
    if (id === 'rift_shard') return this.playCeladonSettle(die, profile, startTime);
    if (id === 'mythic_aeon') return this.playChronosSettle(die, profile, startTime);
    return Promise.resolve();
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

        const finish = async () => {
          die.quaternion.copy(finalQ);
          die.position.set(0, -.04, 0);
          die.scale.setScalar(1.02);
          this.camera.position.set(0, 4.55, 8.34);
          this.camera.lookAt(0, .04, 0);

          if (profile.tier >= 3) await this.playSignatureSettleEffect(die, profile, start);

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
        finish();
      };
      requestAnimationFrame(frame);
    });
  }
}

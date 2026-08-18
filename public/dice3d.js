import * as THREE from '/vendor/three.module.js';

export class DiceTheater {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    this.setup();
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
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  makeLabel(text, size = .34, color = '#fff9ec') {
    const c = document.createElement('canvas'); c.width = 192; c.height = 192;
    const x = c.getContext('2d'); x.clearRect(0, 0, 192, 192); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 88px Georgia'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 10; x.fillStyle = color; x.fillText(text, 96, 104);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.userData.material = mat;
    return mesh;
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
    if (faceMat) {
      faceMat.emissive.set(0xffd681);
      faceMat.emissiveIntensity = 1.35;
      faceMat.clearcoat = 1.2;
    }
    if (labelMat) {
      labelMat.color.set(0xfff0bc);
      labelMat.opacity = 1;
    }
    if (!this.highlightRing) {
      this.highlightRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, .08, 18, 72),
        new THREE.MeshBasicMaterial({ color: 0xffd681, transparent: true, opacity: .72 })
      );
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
    this.faceNormals = [];
    this.faceMaterials = [];
    this.labelMaterials = [];
    const skin = typeof style === 'object' && style ? style : { base: style || '#c24a35' };
    const base = new THREE.Color(skin.base || '#c24a35');
    const emissive = new THREE.Color(skin.emissive || '#000000');
    const labelColor = skin.accent || '#fff9ec';
    for (let f = 0; f < 20; f++) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, f * 3), b = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1), c = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2);
      const tri = new THREE.BufferGeometry().setFromPoints([a, b, c]); tri.computeVertexNormals();
      const tint = base.clone().offsetHSL(0, 0, (f % 4 - 1.5) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(skin.roughness ?? .24), metalness: Number(skin.metalness ?? .36), clearcoat: 1.05, clearcoatRoughness: .1, emissive, emissiveIntensity: skin.id==='classic'?0:.34, transmission: skin.id==='aurora_crystal'||skin.id==='nebula_glass'?.06:0 });
      const mesh = new THREE.Mesh(tri, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); this.faceMaterials[f] = mat;
      const center = a.clone().add(b).add(c).divideScalar(3); const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); if (normal.dot(center) < 0) normal.negate(); this.faceNormals.push(normal.clone());
      const label = this.makeLabel(String(f + 1), .44, labelColor); label.position.copy(center.clone().add(normal.clone().multiplyScalar(.022))); label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); group.add(label); this.labelMaterials[f] = label.userData.material;
    }
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.556, 0), 1), new THREE.LineBasicMaterial({ color: skin.accent || '#ffe2ba', transparent: true, opacity: .82 })); group.add(edges); return group;
  }
  d6(style) {
    const group = new THREE.Group();
    const geom = new THREE.BoxGeometry(2.25, 2.25, 2.25, 1, 1, 1);
    this.faceNormals = [];
    this.faceMaterials = [];
    this.labelMaterials = [];
    const skin = typeof style === 'object' && style ? style : { base: style || '#b94836' };
    const labelColor = skin.accent || '#fff9ec';
    const emissive = new THREE.Color(skin.emissive || '#000000');
    const faces = [
      { normal: [1, 0, 0], roll: 1 }, { normal: [-1, 0, 0], roll: 6 },
      { normal: [0, 1, 0], roll: 2 }, { normal: [0, -1, 0], roll: 5 },
      { normal: [0, 0, 1], roll: 3 }, { normal: [0, 0, -1], roll: 4 },
    ];
    faces.forEach(({ normal, roll }, idx) => {
      const tint = new THREE.Color(skin.base || '#b94836').offsetHSL(0, 0, (idx % 3 - 1) * .025);
      const mat = new THREE.MeshPhysicalMaterial({ color: tint, roughness: Number(skin.roughness ?? .22), metalness: Number(skin.metalness ?? .32), clearcoat: 1.05, clearcoatRoughness: .1, emissive, emissiveIntensity: skin.id==='classic'?0:.34 });
      this.faceMaterials[roll - 1] = mat;
    });
    const materials = [this.faceMaterials[0], this.faceMaterials[5], this.faceMaterials[1], this.faceMaterials[4], this.faceMaterials[2], this.faceMaterials[3]];
    const cube = new THREE.Mesh(geom, materials); cube.castShadow = true; cube.receiveShadow = true; group.add(cube);
    faces.forEach(({ normal, roll }) => {
      const v = new THREE.Vector3(...normal); this.faceNormals[roll - 1] = v.clone();
      const label = this.makeLabel(String(roll), .72, labelColor); label.position.copy(v.clone().multiplyScalar(1.136)); label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v); group.add(label); this.labelMaterials[roll - 1] = label.userData.material;
    });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: skin.accent || '#ffe6c6', transparent: true, opacity: .84 })); group.add(edges); return group;
  }
  synthHit(volume = .12, pitch = 90) {
    try {
      const ctx = this.audio || (this.audio = new AudioContext());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(pitch, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + .08);
      g.gain.setValueAtTime(volume, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .13);
    } catch {}
  }
  async roll({ sides = 20, result = 1, color = '#b94d36', skin = null, duration = 2600 }) {
    if (this.active) this.scene.remove(this.active);
    const dieStyle = skin || color;
    const die = sides === 6 ? this.d6(dieStyle) : this.d20(dieStyle);
    this.active = die; this.scene.add(die); die.position.set(-3.1, 3.6, 0); die.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const normal = this.faceNormals[Math.max(0, Math.min(this.faceNormals.length - 1, result - 1))] || new THREE.Vector3(0, 1, 0);
    const align = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - .5) * Math.PI * 2);
    const finalQ = yaw.multiply(align);
    const start = performance.now(); let lastBounce = -1; this.running = true;
    return new Promise(resolve => {
      const frame = now => {
        const t = Math.min(1, (now - start) / duration); const ease = 1 - Math.pow(1 - t, 3);
        const travel = -3.1 + 3.1 * ease; const bounceAmp = (1 - t) * 2.2; const bounce = Math.abs(Math.sin(t * Math.PI * 5.3)) * bounceAmp;
        die.position.set(travel, -.05 + bounce, .15 * Math.sin(t * 13));
        if (t < .73) { die.rotation.x += .19 * (1 - t) + .03; die.rotation.y += .24 * (1 - t) + .035; die.rotation.z += .16 * (1 - t) + .025; }
        else {
          const local = (t - .73) / .27;
          die.quaternion.slerp(finalQ, Math.min(1, local * .12 + .08));
          die.quaternion.slerp(finalQ, Math.min(1, local * .23));
        }
        const b = Math.floor(t * 5.3); if (b !== lastBounce && t > .08 && t < .9) { lastBounce = b; this.synthHit(.045 + (.9 - t) * .06, 70 + Math.random() * 65); }
        this.camera.position.x = Math.sin(t * 24) * (1 - t) * .06; this.camera.lookAt(0, .05, 0);
        this.renderer.render(this.scene, this.camera);
        if (t < 1) requestAnimationFrame(frame);
        else {
          die.quaternion.copy(finalQ); die.position.set(0, -.02, 0); this.highlightResult(result); this.renderer.render(this.scene, this.camera); this.synthHit(.15, 55);
          setTimeout(() => { this.running = false; resolve(); }, 700);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}

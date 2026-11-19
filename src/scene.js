// ============================================================
//  scene.js — the Void: 2.5D scene on Three.js.
//  An OrthographicCamera looks at a vertical slice of floating islands.
//  Each block type = one InstancedMesh (see blocks.js).
// ============================================================
import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { blockCanvas, animateCanvas } from './textures.js';
import { buildMainWorld, buildFarWorld, LEVELS, PORTAL, AVATAR, SHARDS } from './world.js';
import { stack } from './data.js';

const VIEW_H = 22;
const CAM_DIST = 60;
const BASE_TILT_Y = 6;
const PARALLAX = { x: 10, y: 5 };
const UNBREAKABLE = new Set(['void_frame']);
const NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const key = (x, y, z) => `${x},${y},${z}`;

function hashCell(x, y, z) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

function averageColor(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
}

function radialTexture(inner, outer = 'rgba(0,0,0,0)', size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(canvas, { onBreak, onShard, onAvatar, reducedMotion = false } = {}) {
  const parallax = reducedMotion ? 0.25 : 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07040f');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
  const cam = { y: LEVELS.home, targetY: LEVELS.home, px: 0, py: 0, tpx: 0, tpy: 0 };

  // --- light (no dynamic shadows) -----------------------------------
  const hemi = new THREE.HemisphereLight('#d6c8ff', '#2a1a40', 1.5);
  const sun = new THREE.DirectionalLight('#fff4e6', 1.7);
  sun.position.set(-0.5, 1, 0.8);
  scene.add(hemi, sun, sun.target);

  // --- backdrop: gradient, nebulae, stars -----------------------------
  const backdrop = new THREE.Group();   // follows camera at 0.9 → feels infinitely far
  scene.add(backdrop);
  {
    const c = document.createElement('canvas'); c.width = 2; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#160b2e'); g.addColorStop(0.5, '#0b0619'); g.addColorStop(1, '#05030c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(300, 60), new THREE.MeshBasicMaterial({ map: t, depthWrite: false }));
    sky.position.z = -120;
    sky.userData.follow = 1;
    backdrop.add(sky);
  }
  const nebulaTex = [radialTexture('rgba(150,90,255,0.55)'), radialTexture('rgba(63,212,176,0.4)'), radialTexture('rgba(255,120,200,0.3)')];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: nebulaTex[i % 3], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6,
    }));
    const s = 26 + Math.random() * 40;
    m.scale.set(s * 1.4, s, 1);
    m.position.set((Math.random() - 0.5) * 80, 10 - i * 14 + Math.random() * 6, -100);
    backdrop.add(m);
  }
  function starField(count, size, spread) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#cdb8ff'), new THREE.Color('#9ff3e0'), new THREE.Color('#ffd6f0')];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = 30 - Math.random() * spread;
      pos[i * 3 + 2] = -90;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    pts.frustumCulled = false;
    return pts;
  }
  const starsSmall = starField(2200, 2, 230);
  const starsBig = starField(260, 3.5, 230);
  backdrop.add(starsSmall, starsBig);

  // --- textures and materials --------------------------------------
  const textures = new Map();
  function texture(name) {
    if (textures.has(name)) return textures.get(name);
    const t = new THREE.CanvasTexture(blockCanvas(name));
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    textures.set(name, t);
    return t;
  }
  const materials = new Map();
  function material(blockName, texName) {
    const k = `${blockName}:${texName}`;
    if (materials.has(k)) return materials.get(k);
    const def = BLOCKS[blockName] || {};
    const map = texture(texName);
    const m = new THREE.MeshLambertMaterial({ map, alphaTest: def.alphaTest || 0, transparent: !!def.transparent, opacity: def.opacity ?? 1 });
    if (def.emissive) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = map; m.emissiveIntensity = def.emissive; }
    materials.set(k, m);
    return m;
  }
  function blockMaterials(name) {
    const f = BLOCKS[name].faces;
    if (f.all) return material(name, f.all);
    const side = material(name, f.side);
    // BoxGeometry face order: +x, -x, +y, -y, +z (towards viewer), -z
    return [side, side, material(name, f.top), material(name, f.bottom), f.front ? material(name, f.front) : side, side];
  }
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const thinGeo = new THREE.BoxGeometry(0.25, 1, 0.25);

  // --- voxel layers -----------------------------------------------------
  const tmpM = new THREE.Matrix4();
  const tmpC = new THREE.Color();

  function buildLayer(world, { tint = null, extra = 0 } = {}) {
    const group = new THREE.Group();
    const lists = {};
    world.forEach((name, x, y, z) => { if (world.isVisible(x, y, z)) (lists[name] ||= []).push([x, y, z]); });
    const layer = { world, group, meshes: {}, entries: new Map(), tint };

    layer.write = (type, i, x, y, z) => {
      const m = layer.meshes[type];
      tmpM.makeTranslation(x, y, z);
      m.mesh.setMatrixAt(i, tmpM);
      const j = 0.94 + hashCell(x, y, z) * 0.12;
      if (tint) tmpC.copy(tint).multiplyScalar(j);
      else { const f = Math.min(1.08, 1 + z * 0.055) * j; tmpC.setRGB(f, f, f); }
      m.mesh.setColorAt(i, tmpC);
    };

    for (const type of Object.keys(lists)) {
      const cells = lists[type];
      const capacity = cells.length + extra;
      const def = BLOCKS[type];
      const mesh = new THREE.InstancedMesh(def.thin ? thinGeo : cubeGeo, blockMaterials(type), capacity);
      mesh.userData.type = type;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
      layer.meshes[type] = { mesh, cells: [], capacity, color: averageColor(blockCanvas(def.faces.all || def.faces.side)) };
      cells.forEach(([x, y, z], i) => {
        layer.meshes[type].cells[i] = [x, y, z];
        layer.entries.set(key(x, y, z), { type, i });
        layer.write(type, i, x, y, z);
      });
      mesh.count = cells.length;
      group.add(mesh);
    }
    return layer;
  }

  const world = buildMainWorld();
  const main = buildLayer(world, { extra: 300 });
  scene.add(main.group);
  const far = buildLayer(buildFarWorld(), { tint: new THREE.Color(0.2, 0.16, 0.36) });
  far.group.position.z = -30;
  scene.add(far.group);

  function addInstance(type, x, y, z) {
    let m = main.meshes[type];
    if (!m) return; // type had no instances at start — skip (rare)
    if (m.mesh.count >= m.capacity) return;
    const i = m.mesh.count++;
    m.cells[i] = [x, y, z];
    main.entries.set(key(x, y, z), { type, i });
    main.write(type, i, x, y, z);
    m.mesh.instanceMatrix.needsUpdate = true; m.mesh.instanceColor.needsUpdate = true; m.mesh.boundingSphere = null;
  }
  function removeInstance(x, y, z) {
    const k = key(x, y, z);
    const e = main.entries.get(k);
    if (!e) return;
    const m = main.meshes[e.type];
    const last = m.mesh.count - 1;
    if (e.i !== last) {
      m.mesh.getMatrixAt(last, tmpM); m.mesh.setMatrixAt(e.i, tmpM);
      m.mesh.getColorAt(last, tmpC); m.mesh.setColorAt(e.i, tmpC);
      const moved = m.cells[last];
      m.cells[e.i] = moved;
      main.entries.get(key(...moved)).i = e.i;
    }
    m.mesh.count = last;
    main.entries.delete(k);
    m.mesh.instanceMatrix.needsUpdate = true; m.mesh.instanceColor.needsUpdate = true; m.mesh.boundingSphere = null;
  }

  // --- .glb overrides (see blocks.js) ---------------------------------
  (async () => {
    const overrides = Object.entries(BLOCKS).filter(([t, d]) => d.model && main.meshes[t]);
    if (!overrides.length) return;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    for (const [type, def] of overrides) {
      try {
        const gltf = await loader.loadAsync(def.model);
        let src = null;
        gltf.scene.traverse((o) => { if (!src && o.isMesh) src = o; });
        if (!src) continue;
        const old = main.meshes[type].mesh;
        const mesh = new THREE.InstancedMesh(src.geometry, src.material, main.meshes[type].capacity);
        mesh.instanceMatrix.copy(old.instanceMatrix);
        mesh.instanceColor = old.instanceColor;
        mesh.count = old.count;
        mesh.userData.type = type;
        mesh.frustumCulled = false;
        main.group.remove(old); main.group.add(mesh);
        main.meshes[type].mesh = mesh;
      } catch (err) { console.warn(`[scene] failed to load ${def.model}:`, err); }
    }
  })();

  // --- avatar ------------------------------------------------------------
  const avatar = new THREE.Group();
  const av = {};
  {
    const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 8;
    const f = faceCanvas.getContext('2d');
    f.fillStyle = '#d9a982'; f.fillRect(0, 0, 8, 8);
    f.fillStyle = '#2a1a12'; f.fillRect(0, 0, 8, 2); f.fillRect(0, 2, 1, 1); f.fillRect(7, 2, 1, 1);
    f.fillStyle = '#ffffff'; f.fillRect(1, 4, 1, 1); f.fillRect(6, 4, 1, 1);
    f.fillStyle = '#3fd4b0'; f.fillRect(2, 4, 1, 1); f.fillRect(5, 4, 1, 1);
    f.fillStyle = '#a8765a'; f.fillRect(3, 5, 2, 1);
    f.fillStyle = '#7a4a3a'; f.fillRect(3, 6, 2, 1);
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.magFilter = faceTex.minFilter = THREE.NearestFilter; faceTex.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshLambertMaterial({ color: '#d9a982' });
    const hair = new THREE.MeshLambertMaterial({ color: '#2a1a12' });
    const hoodie = new THREE.MeshLambertMaterial({ color: '#5b3fa8' });
    const hoodieDark = new THREE.MeshLambertMaterial({ color: '#46308a' });
    const pants = new THREE.MeshLambertMaterial({ color: '#241d38' });
    const shoes = new THREE.MeshLambertMaterial({ color: '#d8d4e8' });
    const phones = new THREE.MeshLambertMaterial({ color: '#3fd4b0', emissive: '#3fd4b0', emissiveIntensity: 0.4 });
    const face = new THREE.MeshLambertMaterial({ map: faceTex });
    const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

    const legL = new THREE.Group(), legR = new THREE.Group();
    for (const [leg, x] of [[legL, -0.125], [legR, 0.125]]) {
      const m = box(0.25, 0.75, 0.25, pants); m.position.y = -0.375; leg.add(m);
      const s = box(0.26, 0.1, 0.27, shoes); s.position.y = -0.7; leg.add(s);
      leg.position.set(x, 0.75, 0); avatar.add(leg);
    }
    const body = box(0.5, 0.75, 0.25, hoodie); body.position.y = 1.125; avatar.add(body);
    const pocket = box(0.3, 0.12, 0.02, hoodieDark); pocket.position.set(0, 0.85, 0.13); avatar.add(pocket);
    const armL = new THREE.Group(), armR = new THREE.Group();
    for (const [arm, x] of [[armL, -0.375], [armR, 0.375]]) {
      const m = box(0.25, 0.6, 0.25, hoodie); m.position.y = -0.3; arm.add(m);
      const h = box(0.24, 0.15, 0.24, skin); h.position.y = -0.67; arm.add(h);
      arm.position.set(x, 1.5, 0); avatar.add(arm);
    }
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), [skin, skin, hair, skin, face, hair]));
    const band = box(0.56, 0.06, 0.1, phones); band.position.y = 0.28; head.add(band);
    for (const x of [-0.29, 0.29]) { const cup = box(0.08, 0.2, 0.2, phones); cup.position.set(x, 0.02, 0); head.add(cup); }
    head.children[0].position.y = 0;
    head.position.y = 1.75;
    avatar.add(head);
    Object.assign(av, { head, armL, armR, legL, legR, body, waveUntil: 0 });
    avatar.scale.setScalar(1.6);
    avatar.position.set(AVATAR.x, AVATAR.y, AVATAR.z);
    avatar.traverse((o) => { if (o.isMesh) o.userData.avatar = true; });
    scene.add(avatar);
  }

  // --- shards -------------------------------------------------------------
  const glowTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const shardGeo = new THREE.OctahedronGeometry(0.55, 0);
  shardGeo.scale(0.8, 1.25, 0.8);
  const hitGeo = new THREE.SphereGeometry(1.3, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const shards = new Map();
  for (const s of SHARDS) {
    const color = new THREE.Color(stack.find((t) => t.id === s.id)?.color || '#3fd4b0');
    const g = new THREE.Group();
    const crystal = new THREE.Mesh(shardGeo, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.55, flatShading: true }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    glow.scale.set(3.4, 3.4, 1);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.userData.shard = s.id;
    g.add(glow, crystal, hit);
    g.position.set(s.x, s.y, 2);
    g.userData = { id: s.id, crystal, glow, color, phase: Math.random() * 6, base: s.y };
    scene.add(g);
    shards.set(s.id, g);
  }
  const shardHits = [...shards.values()].map((g) => g.children[2]);

  // --- gateway (portal arch) ----------------------------------------
  const gate = new THREE.Group();
  gate.position.set(PORTAL.x, PORTAL.y, PORTAL.z);
  const socketPos = [[-3, 2], [-3, 4], [-3, 6], [0, 7], [3, 6], [3, 4], [3, 2]];
  const isSocket = (dx, dy) => socketPos.some(([a, b]) => a === dx && b === dy);
  const frameMat = material('void_frame', 'void_frame');
  const emptyMat = new THREE.MeshLambertMaterial({ map: texture('socket_empty') });
  const litMat = new THREE.MeshLambertMaterial({ map: texture('socket_lit'), emissive: '#ffffff', emissiveMap: texture('socket_lit'), emissiveIntensity: 0.9 });
  const sockets = [];
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = 0; dy <= 7; dy++) {
      const edge = dx === -3 || dx === 3 || dy === 0 || dy === 7;
      if (!edge) continue;
      if (isSocket(dx, dy)) {
        const m = new THREE.Mesh(cubeGeo, [frameMat, frameMat, frameMat, frameMat, emptyMat, frameMat]);
        m.position.set(dx, dy, 0);
        sockets[socketPos.findIndex(([a, b]) => a === dx && b === dy)] = m;
        gate.add(m);
      } else {
        const m = new THREE.Mesh(cubeGeo, frameMat);
        m.position.set(dx, dy, 0);
        gate.add(m);
      }
    }
  }
  const portalTex = texture('void_portal');
  portalTex.wrapS = portalTex.wrapT = THREE.RepeatWrapping;
  portalTex.repeat.set(5, 6);
  const portalMat = new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, opacity: 0.25, color: '#5a4a8a' });
  const portalPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), portalMat);
  portalPlane.position.set(0, 3.5, 0.1);
  gate.add(portalPlane);
  const portalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#3fd4b0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  portalGlow.scale.set(14, 14, 1);
  portalGlow.position.set(0, 3.5, -0.5);
  gate.add(portalGlow);
  const portalLight = new THREE.PointLight('#3fd4b0', 0, 26, 1);
  portalLight.position.set(0, 3.5, 4);
  gate.add(portalLight);
  scene.add(gate);
  let portalActive = false;
  let litCount = 0;

  function setSockets(n) {
    litCount = n;
    sockets.forEach((m, i) => { m.material[4] = i < n ? litMat : emptyMat; });
  }
  function setPortalActive(on) {
    portalActive = on;
    portalMat.opacity = on ? 1 : 0.25;
    portalMat.color.set(on ? '#ffffff' : '#5a4a8a');
  }

  // --- particles ------------------------------------------------------------
  const MAX_P = 700;
  const pPos = new Float32Array(MAX_P * 3).fill(-9999);
  const pCol = new Float32Array(MAX_P * 3);
  const pVel = new Float32Array(MAX_P * 3);
  const pLife = new Float32Array(MAX_P);
  const pGrav = new Float32Array(MAX_P);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);
  let pCursor = 0;
  function emit(x, y, z, vx, vy, vz, color, life, grav = 0) {
    const i = pCursor; pCursor = (pCursor + 1) % MAX_P;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    pCol[i * 3] = color.r; pCol[i * 3 + 1] = color.g; pCol[i * 3 + 2] = color.b;
    pLife[i] = life; pGrav[i] = grav;
  }
  function burst(color, x, y, z, n = 18, speed = 5, grav = 14) {
    for (let i = 0; i < n; i++) {
      tmpC.copy(color).multiplyScalar(0.75 + Math.random() * 0.5);
      emit(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, z + 0.6,
        (Math.random() - 0.5) * speed, Math.random() * speed + 1, Math.random() * 2, tmpC, 0.6 + Math.random() * 0.5, grav);
    }
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAX_P; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -9999; continue; }
      pVel[i * 3 + 1] -= pGrav[i] * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }
  const C_MOTE = [new THREE.Color('#b48cff'), new THREE.Color('#e3d4ff'), new THREE.Color('#3fd4b0')];
  const C_TEAL = new THREE.Color('#3fd4b0');
  function ambient(dt, camY) {
    if (Math.random() < dt * 9) {
      emit((Math.random() - 0.5) * 44, camY - 12 + Math.random() * 6, -2 + Math.random() * 5,
        (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.8, 0, C_MOTE[Math.floor(Math.random() * 3)], 7 + Math.random() * 6);
    }
    if (portalActive && Math.abs(camY - LEVELS.portal) < 26 && Math.random() < dt * 40) {
      emit(PORTAL.x + (Math.random() - 0.5) * 5, PORTAL.y + 1 + Math.random() * 6, 0.6,
        (Math.random() - 0.5) * 0.8, Math.random() * 1.2, 1 + Math.random(), C_MOTE[Math.floor(Math.random() * 3)], 1.6);
    }
  }

  // --- picking: shards, avatar, blocks --------------------------------------
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03)),
    new THREE.LineBasicMaterial({ color: '#e3d4ff', transparent: true, opacity: 0.8 }),
  );
  outline.visible = false;
  scene.add(outline);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const avatarMeshes = [];
  avatar.traverse((o) => { if (o.isMesh) avatarMeshes.push(o); });
  let hoverPending = null;
  let hoveredShard = null;

  function ray(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  function pickShard() {
    const hit = raycaster.intersectObjects(shardHits.filter((h) => h.parent.visible), false)[0];
    return hit ? hit.object.userData.shard : null;
  }
  function pickBlock() {
    const hit = raycaster.intersectObjects(Object.values(main.meshes).map((m) => m.mesh), false)[0];
    if (!hit || hit.instanceId == null) return null;
    const cell = main.meshes[hit.object.userData.type].cells[hit.instanceId];
    return cell ? { type: hit.object.userData.type, cell } : null;
  }

  const toScreen = new THREE.Vector3();
  function screenPos(obj) {
    obj.getWorldPosition(toScreen).project(camera);
    return { x: (toScreen.x + 1) / 2 * window.innerWidth, y: (1 - toScreen.y) / 2 * window.innerHeight };
  }

  function collectShard(id, silent = false) {
    const g = shards.get(id);
    if (!g || !g.visible) return false;
    const pos = screenPos(g);
    g.visible = false;
    if (!silent) {
      burst(g.userData.color, g.position.x, g.position.y, 1.5, 30, 6, 4);
      onShard?.(id, pos);
    }
    return true;
  }

  function onPointerMove(e) {
    cam.tpx = (e.clientX / window.innerWidth) * 2 - 1;
    cam.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    hoverPending = e.target === canvas ? [e.clientX, e.clientY] : false;
  }
  function onPointerDown(e) {
    if (e.target !== canvas || e.button !== 0) return;
    ray(e.clientX, e.clientY);
    const sid = pickShard();
    if (sid) { collectShard(sid); return; }
    if (raycaster.intersectObjects(avatarMeshes, false).length) {
      av.waveUntil = performance.now() + 1600;
      onAvatar?.();
      return;
    }
    const p = pickBlock();
    if (!p) return;
    const [x, y, z] = p.cell;
    const name = world.nameAt(x, y, z);
    if (!name || UNBREAKABLE.has(name)) return;
    removeInstance(x, y, z);
    world.set(x, y, z, null);
    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const nn = world.nameAt(nx, ny, nz);
      if (nn && !main.entries.has(key(nx, ny, nz)) && world.isVisible(nx, ny, nz)) addInstance(nn, nx, ny, nz);
    }
    burst(main.meshes[name]?.color || new THREE.Color('#ccc'), x, y, z);
    outline.visible = false;
    onBreak?.(name);
  }
  function onPointerLeave() { cam.tpx = 0; cam.tpy = 0; hoverPending = false; }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerleave', onPointerLeave);

  // --- camera ----------------------------------------------------------------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
    const viewH = aspect < 1 ? VIEW_H * 1.25 : VIEW_H;
    camera.left = -viewH * aspect / 2; camera.right = viewH * aspect / 2;
    camera.top = viewH / 2; camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);

  const look = new THREE.Vector3();
  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 5);
    const kp = 1 - Math.exp(-dt * 3);
    cam.y += (cam.targetY - cam.y) * k;
    cam.px += (cam.tpx - cam.px) * kp;
    cam.py += (cam.tpy - cam.py) * kp;
    look.set(cam.px * 0.5, cam.y, 0);
    camera.position.set(look.x + cam.px * PARALLAX.x * parallax, look.y + BASE_TILT_Y - cam.py * PARALLAX.y * parallax, CAM_DIST);
    camera.lookAt(look);
    // scroll parallax: backdrop almost static, far islands at half speed
    backdrop.position.y = cam.y * 0.92;
    backdrop.children.forEach((c) => { if (c.userData.follow) c.position.y = cam.y * 0.08; });
    far.group.position.y = cam.y * 0.5;
  }

  // --- animation ----------------------------------------------------------------
  let portalTimer = 0;
  const lookDir = new THREE.Vector3();
  function animate(dt, t) {
    // stars twinkle
    starsBig.material.opacity = 0.65 + Math.sin(t * 1.7) * 0.25;
    // shards
    for (const g of shards.values()) {
      if (!g.visible) continue;
      const d = g.userData;
      g.position.y = d.base + Math.sin(t * 1.6 + d.phase) * 0.35;
      d.crystal.rotation.y += dt * 1.4;
      const hover = hoveredShard === d.id ? 1.25 : 1;
      d.crystal.scale.setScalar(THREE.MathUtils.lerp(d.crystal.scale.x, hover, 0.2));
      d.glow.material.opacity = 0.55 + Math.sin(t * 3 + d.phase) * 0.2;
    }
    // avatar: breathing, looking at the cursor, waving
    const near = Math.abs(cam.y - AVATAR.y) < 20;
    if (near) {
      av.body.position.y = 1.125 + Math.sin(t * 2) * 0.012;
      lookDir.set(cam.px, -cam.py, 0);
      av.head.rotation.y = THREE.MathUtils.lerp(av.head.rotation.y, lookDir.x * 0.7, 0.1);
      av.head.rotation.x = THREE.MathUtils.lerp(av.head.rotation.x, -lookDir.y * 0.35, 0.1);
      const waving = performance.now() < av.waveUntil;
      av.armR.rotation.z = THREE.MathUtils.lerp(av.armR.rotation.z, waving ? 2.6 + Math.sin(t * 14) * 0.35 : 0.05, 0.2);
      av.armL.rotation.x = Math.sin(t * 1.5) * 0.06;
      av.armR.rotation.x = waving ? 0 : -Math.sin(t * 1.5) * 0.06;
    }
    // portal
    portalTimer += dt;
    if (portalTimer > 0.08 && Math.abs(cam.y - LEVELS.portal) < 26) {
      portalTimer = 0;
      animateCanvas('void_portal', portalTex.image, t);
      portalTex.needsUpdate = true;
    }
    const target = portalActive ? 0.55 + Math.sin(t * 2) * 0.1 : litCount / 7 * 0.25;
    portalGlow.material.opacity += (target - portalGlow.material.opacity) * 0.05;
    portalLight.intensity = portalActive ? 40 + Math.sin(t * 3) * 6 : litCount * 2;
  }

  // --- loop ----------------------------------------------------------------------
  let raf = 0, last = 0, running = false, slowFrames = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;
    updateCamera(dt);
    animate(dt, t);
    ambient(dt, cam.y);
    updateParticles(dt);

    if (hoverPending) {
      ray(hoverPending[0], hoverPending[1]);
      hoveredShard = pickShard();
      const p = hoveredShard ? null : pickBlock();
      outline.visible = !!p && !UNBREAKABLE.has(p.type);
      if (p) outline.position.set(...p.cell);
      canvas.style.cursor = hoveredShard || p ? 'pointer' : '';
      hoverPending = null;
    } else if (hoverPending === false) {
      outline.visible = false; hoveredShard = null; canvas.style.cursor = ''; hoverPending = null;
    }

    renderer.render(scene, camera);
    if (dt > 0.022) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio); resize(); slowFrames = 0;
    }
  }

  return {
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    setTargetY(y, immediate = false) { cam.targetY = y; if (immediate) cam.y = y; },
    getCameraY: () => cam.y,
    collectShard,
    hideShard: (id) => { const g = shards.get(id); if (g) g.visible = false; },
    setSockets,
    setPortalActive,
    portalBurst() { burst(C_TEAL, PORTAL.x, PORTAL.y + 3.5, 1, 60, 9, 2); },
    get stats() {
      const count = (l) => Object.values(l.meshes).reduce((s, m) => s + m.mesh.count, 0);
      return { instances: count(main) + count(far), drawCalls: renderer.info.render.calls, pixelRatio };
    },
    dispose() {
      this.stop();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}

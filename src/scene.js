// ============================================================
//  scene.js — 2.5D-сцена на Three.js.
//  OrthographicCamera смотрит сбоку на вертикальный разрез мира.
//  Каждый тип блока = один InstancedMesh (см. blocks.js).
// ============================================================
import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { blockCanvas, animateCanvas } from './textures.js';
import { World, LAB, PORTAL, BOUNDS, LEVELS } from './world.js';

const VIEW_H = 22;              // высота кадра в блоках
const CAM_DIST = 60;
const BASE_TILT = { x: 0, y: 7 }; // лёгкий взгляд сверху — видны верхние грани
const PARALLAX = { x: 11, y: 6 };
const UNBREAKABLE = new Set(['bedrock', 'portal', 'lava']);

const key = (x, y, z) => `${x},${y},${z}`;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

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

export function createScene(canvas, { onBreak, reducedMotion = false } = {}) {
  const parallax = reducedMotion ? 0.25 : 1;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
  });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fcbff');

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
  const camState = { y: LEVELS.surface, targetY: LEVELS.surface, px: 0, py: 0, tpx: 0, tpy: 0 };

  // --- свет: без динамических теней --------------------------------
  const hemi = new THREE.HemisphereLight('#dcefff', '#5b4a3a', 1.6);
  const sun = new THREE.DirectionalLight('#fff4dd', 2.0);
  sun.position.set(-0.45, 1, 0.75);
  scene.add(hemi, sun, sun.target);

  const labLight = new THREE.PointLight('#ff3a22', 0, 34, 1);
  labLight.position.set(0, (LAB.y0 + LAB.y1) / 2, 4);
  const portalLight = new THREE.PointLight('#a040ff', 0, 22, 1);
  portalLight.position.set((PORTAL.x0 + PORTAL.x1) / 2, (PORTAL.y0 + PORTAL.y1) / 2, 2);
  const lavaLight = new THREE.PointLight('#ff7a1a', 0, 40, 1);
  lavaLight.position.set(0, -84, 5);
  scene.add(labLight, portalLight, lavaLight);

  // --- небо, солнце, облака ----------------------------------------
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2; skyCanvas.height = 128;
  {
    const ctx = skyCanvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#4f8fe8'); g.addColorStop(0.65, '#9fcbff'); g.addColorStop(1, '#d9ecff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 128);
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false }));
  sky.position.set(0, 30, -60);
  scene.add(sky);

  const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: '#fff6b0' }));
  sunMesh.position.set(-20, 21, -20);
  const sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: '#fff6b0', transparent: true, opacity: 0.25 }));
  sunHalo.position.set(-20, 21, -20.1);
  scene.add(sunMesh, sunHalo);

  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.45, transparent: true, opacity: 0.92 });
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const w = 5 + Math.floor(Math.random() * 6);
    const parts = [[0, 0, w, 3], [1 + Math.floor(Math.random() * 2), 1, Math.max(2, w - 3), 2]];
    for (const [ox, oz, pw, pd] of parts) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      m.scale.set(pw, 1, pd);
      m.position.set(ox + pw / 2, 0, oz);
      g.add(m);
    }
    g.position.set(-50 + i * 12 + Math.random() * 6, 15 + Math.random() * 8, -6 - Math.random() * 10);
    g.userData.speed = 0.4 + Math.random() * 0.5;
    clouds.push(g);
    scene.add(g);
  }

  // --- текстуры и материалы блоков ---------------------------------
  const textures = new Map();
  function texture(name) {
    if (textures.has(name)) return textures.get(name);
    const t = new THREE.CanvasTexture(blockCanvas(name));
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(name, t);
    return t;
  }

  const materials = new Map();
  function material(blockName, texName) {
    const k = `${blockName}:${texName}`;
    if (materials.has(k)) return materials.get(k);
    const def = BLOCKS[blockName];
    const map = texture(texName);
    const m = new THREE.MeshLambertMaterial({
      map,
      alphaTest: def.alphaTest || 0,
      transparent: !!def.transparent,
      opacity: def.opacity ?? 1,
      side: def.transparent ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: !def.transparent,
    });
    if (def.emissive) {
      m.emissive = new THREE.Color('#ffffff');
      m.emissiveMap = map;
      m.emissiveIntensity = def.emissive;
    }
    materials.set(k, m);
    return m;
  }

  function blockMaterials(name) {
    const f = BLOCKS[name].faces;
    if (f.all) return material(name, f.all);
    const side = material(name, f.side);
    // порядок граней BoxGeometry: +x, -x, +y, -y, +z (к зрителю), -z
    return [side, side, material(name, f.top), material(name, f.bottom), f.front ? material(name, f.front) : side, side];
  }

  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const thinGeo = new THREE.BoxGeometry(1, 1, 0.25);

  // --- мир -> InstancedMesh -----------------------------------------
  const world = new World();
  const lists = {};
  world.forEach((name, x, y, z) => {
    if (world.isVisible(x, y, z)) (lists[name] ||= []).push([x, y, z]);
  });

  const meshes = {};          // type -> { mesh, cells, capacity, color }
  const entries = new Map();  // "x,y,z" -> { type, i }
  const pickables = [];
  const tmpM = new THREE.Matrix4();
  const tmpC = new THREE.Color();

  function writeInstance(type, i, x, y, z) {
    const m = meshes[type];
    tmpM.makeTranslation(x, y, z);
    m.mesh.setMatrixAt(i, tmpM);
    // псевдо-AO: дальние слои темнее, лёгкий разброс яркости
    const depth = z >= 1 ? 1.05 : 1 + z * 0.085;
    const f = depth * (0.95 + hashCell(x, y, z) * 0.1);
    tmpC.setRGB(f, f, f);
    m.mesh.setColorAt(i, tmpC);
  }

  for (const type of Object.keys(BLOCKS)) {
    const cells = lists[type] || [];
    const capacity = cells.length + 400;
    const def = BLOCKS[type];
    const mesh = new THREE.InstancedMesh(def.thin ? thinGeo : cubeGeo, blockMaterials(type), capacity);
    mesh.userData.type = type;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // instanceColor создаём заранее, чтобы шейдер сразу собрался с цветами инстансов
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
    meshes[type] = { mesh, cells: [], capacity, color: averageColor(blockCanvas(def.faces.all || def.faces.side)) };
    cells.forEach(([x, y, z], i) => {
      meshes[type].cells[i] = [x, y, z];
      entries.set(key(x, y, z), { type, i });
      writeInstance(type, i, x, y, z);
    });
    mesh.count = cells.length;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (def.transparent) mesh.renderOrder = 2;
    scene.add(mesh);
    if (!UNBREAKABLE.has(type)) pickables.push(mesh);
  }

  function addInstance(type, x, y, z) {
    const m = meshes[type];
    if (!m || m.mesh.count >= m.capacity) return;
    const i = m.mesh.count++;
    m.cells[i] = [x, y, z];
    entries.set(key(x, y, z), { type, i });
    writeInstance(type, i, x, y, z);
    m.mesh.instanceMatrix.needsUpdate = true;
    m.mesh.instanceColor.needsUpdate = true;
    m.mesh.boundingSphere = null;
  }

  function removeInstance(x, y, z) {
    const k = key(x, y, z);
    const e = entries.get(k);
    if (!e) return;
    const m = meshes[e.type];
    const last = m.mesh.count - 1;
    if (e.i !== last) {
      m.mesh.getMatrixAt(last, tmpM); m.mesh.setMatrixAt(e.i, tmpM);
      m.mesh.getColorAt(last, tmpC); m.mesh.setColorAt(e.i, tmpC);
      const moved = m.cells[last];
      m.cells[e.i] = moved;
      entries.get(key(...moved)).i = e.i;
    }
    m.mesh.count = last;
    entries.delete(k);
    m.mesh.instanceMatrix.needsUpdate = true;
    m.mesh.instanceColor.needsUpdate = true;
    m.mesh.boundingSphere = null;
  }

  // --- подмена блоков моделями .glb (см. blocks.js) ---------------
  async function applyModelOverrides() {
    const overrides = Object.entries(BLOCKS).filter(([, d]) => d.model);
    if (!overrides.length) return;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    for (const [type, def] of overrides) {
      try {
        const gltf = await loader.loadAsync(def.model);
        let src = null;
        gltf.scene.traverse((o) => { if (!src && o.isMesh) src = o; });
        if (!src) continue;
        const old = meshes[type].mesh;
        const mesh = new THREE.InstancedMesh(src.geometry, src.material, meshes[type].capacity);
        mesh.instanceMatrix.copy(old.instanceMatrix);
        if (old.instanceColor) mesh.instanceColor = old.instanceColor;
        mesh.count = old.count;
        mesh.userData.type = type;
        mesh.frustumCulled = false;
        scene.remove(old); scene.add(mesh);
        meshes[type].mesh = mesh;
        const pi = pickables.indexOf(old);
        if (pi >= 0) pickables[pi] = mesh;
      } catch (err) {
        console.warn(`[scene] не удалось загрузить модель ${def.model}:`, err);
      }
    }
  }
  applyModelOverrides();

  // --- частицы -------------------------------------------------------
  const MAX_P = 600;
  const pPos = new Float32Array(MAX_P * 3).fill(-9999);
  const pCol = new Float32Array(MAX_P * 3);
  const pVel = new Float32Array(MAX_P * 3);
  const pLife = new Float32Array(MAX_P);
  const pGrav = new Float32Array(MAX_P);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
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

  const C_PORTAL = new THREE.Color('#c06bff');
  const C_REDSTONE = new THREE.Color('#ff2a1a');
  const C_LAVA = new THREE.Color('#ffb040');
  const C_LEAF = new THREE.Color('#5aa83a');

  function burst(type, x, y, z) {
    const base = meshes[type]?.color || new THREE.Color('#888');
    for (let i = 0; i < 18; i++) {
      tmpC.copy(base).multiplyScalar(0.7 + Math.random() * 0.5);
      emit(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, z + 0.6,
        (Math.random() - 0.5) * 5, Math.random() * 5 + 1, Math.random() * 2, tmpC, 0.6 + Math.random() * 0.4, 16);
    }
  }

  function updateParticles(dt) {
    for (let i = 0; i < MAX_P; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -9999; continue; }
      pVel[i * 3 + 1] -= pGrav[i] * dt;
      pPos[i * 3] += pVel[i * 3] * dt;
      pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
      pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  function ambientEmitters(dt, camY) {
    const near = (y) => Math.abs(camY - y) < 22;
    if (near((PORTAL.y0 + PORTAL.y1) / 2) && Math.random() < dt * 30) {
      const x = PORTAL.x0 + 1 + Math.random() * (PORTAL.x1 - PORTAL.x0 - 1);
      const y = PORTAL.y0 + 1 + Math.random() * (PORTAL.y1 - PORTAL.y0 - 1);
      emit(x - 0.5, y - 0.5, PORTAL.z + 0.5, (Math.random() - 0.5) * 1.2, Math.random() * 0.8, 1 + Math.random(), C_PORTAL, 1.5 + Math.random());
    }
    if (near((LAB.y0 + LAB.y1) / 2) && Math.random() < dt * 14) {
      emit(LAB.x0 + Math.random() * (LAB.x1 - LAB.x0), LAB.y0 + 1 + Math.random() * 3, -1 + Math.random() * 2,
        0, 0.6 + Math.random() * 0.6, 0, C_REDSTONE, 2 + Math.random() * 2);
    }
    if (near(-80) && Math.random() < dt * 10) {
      emit((Math.random() - 0.5) * 70, -85, 1 + Math.random(), (Math.random() - 0.5) * 0.4, 2 + Math.random() * 2, 0, C_LAVA, 1.2, 1.5);
    }
    if (near(8) && Math.random() < dt * 0.8) {
      emit(13 + (Math.random() - 0.5) * 4, 7, 1, 0.4, -0.6, 0, C_LEAF, 6);
    }
  }

  // --- выделение и копание ------------------------------------------
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
    new THREE.LineBasicMaterial({ color: '#000000', transparent: true, opacity: 0.7 }),
  );
  outline.visible = false;
  scene.add(outline);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoverPending = null;
  let hovered = null;

  function pick(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit || hit.instanceId == null) return null;
    const m = meshes[hit.object.userData.type];
    const cell = m.cells[hit.instanceId];
    return cell ? { type: hit.object.userData.type, cell } : null;
  }

  function mine(clientX, clientY) {
    const p = pick(clientX, clientY);
    if (!p) return null;
    const [x, y, z] = p.cell;
    const name = world.nameAt(x, y, z);
    if (!name || UNBREAKABLE.has(name)) return null;
    removeInstance(x, y, z);
    world.set(x, y, z, null);
    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const nn = world.nameAt(nx, ny, nz);
      if (nn && !entries.has(key(nx, ny, nz)) && world.isVisible(nx, ny, nz)) addInstance(nn, nx, ny, nz);
    }
    burst(name, x, y, z);
    hovered = null; outline.visible = false;
    onBreak?.(name, { x, y, z });
    return name;
  }

  function onPointerMove(e) {
    camState.tpx = (e.clientX / window.innerWidth) * 2 - 1;
    camState.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    hoverPending = e.target === canvas ? [e.clientX, e.clientY] : false;
  }
  function onPointerDown(e) {
    if (e.target !== canvas || e.button !== 0) return;
    mine(e.clientX, e.clientY);
  }
  function onPointerLeave() { camState.tpx = 0; camState.tpy = 0; hoverPending = false; }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerleave', onPointerLeave);

  // --- освещение в зависимости от глубины -------------------------
  const skyHemi = new THREE.Color('#dcefff'), caveHemi = new THREE.Color('#7f8fb0'), netherHemi = new THREE.Color('#ff9a7a');
  const groundHemi = new THREE.Color('#5b4a3a'), netherGround = new THREE.Color('#5a1a10');
  const sunDay = new THREE.Color('#fff4dd'), sunNether = new THREE.Color('#ff8a5a');
  const bgSky = new THREE.Color('#9fcbff'), bgCave = new THREE.Color('#0d0b12'), bgNether = new THREE.Color('#2a0808');

  function updateLighting(y, t) {
    const cave = clamp01((-6 - y) / 26);           // 0 на поверхности → 1 в пещерах
    const nether = clamp01((-64 - y) / 10);       // 1 у бедрока и ниже
    hemi.color.copy(skyHemi).lerp(caveHemi, cave).lerp(netherHemi, nether);
    hemi.groundColor.copy(groundHemi).lerp(netherGround, nether);
    hemi.intensity = 1.6 - cave * 0.55;
    sun.color.copy(sunDay).lerp(sunNether, nether);
    sun.intensity = 2.0 - cave * 1.1 - nether * 0.3;
    scene.background.copy(bgSky).lerp(bgCave, cave).lerp(bgNether, nether);

    const labNear = clamp01(1 - Math.abs(y - (LAB.y0 + LAB.y1) / 2) / 24);
    labLight.intensity = labNear * (55 + Math.sin(t * 7) * 4 + Math.sin(t * 13) * 3);
    const portalNear = clamp01(1 - Math.abs(y - LEVELS.contacts) / 22);
    portalLight.intensity = portalNear * (32 + Math.sin(t * 3) * 6);
    lavaLight.intensity = portalNear * (16 + Math.sin(t * 2.3) * 3);
  }

  // --- камера ----------------------------------------------------------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    const viewH = aspect < 1 ? VIEW_H * 1.25 : VIEW_H;
    camera.left = -viewH * aspect / 2;
    camera.right = viewH * aspect / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);

  const lookTarget = new THREE.Vector3();
  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 6);
    const kp = 1 - Math.exp(-dt * 3);
    camState.y += (camState.targetY - camState.y) * k;
    camState.px += (camState.tpx - camState.px) * kp;
    camState.py += (camState.tpy - camState.py) * kp;
    lookTarget.set(camState.px * 0.6, camState.y, 0);
    camera.position.set(
      lookTarget.x + BASE_TILT.x + camState.px * PARALLAX.x * parallax,
      lookTarget.y + BASE_TILT.y - camState.py * PARALLAX.y * parallax,
      CAM_DIST,
    );
    camera.lookAt(lookTarget);
  }

  // --- анимации текстур -------------------------------------------
  const portalTex = texture('portal');
  const lavaTex = texture('lava');
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  let portalTimer = 0;
  const lampMat = material('redstone_lamp', 'redstone_lamp');

  function animateBlocks(dt, t, camY) {
    portalTimer += dt;
    if (portalTimer > 0.09 && Math.abs(camY - LEVELS.contacts) < 24) {
      portalTimer = 0;
      animateCanvas('portal', portalTex.image, t);
      portalTex.needsUpdate = true;
    }
    lavaTex.offset.y = (t * 0.03) % 1;
    lampMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.12;
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 55) c.position.x = -60;
    }
  }

  // --- цикл -------------------------------------------------------------
  let raf = 0, last = 0, running = false;
  let slowFrames = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;

    updateCamera(dt);
    updateLighting(camState.y, t);
    animateBlocks(dt, t, camState.y);
    ambientEmitters(dt, camState.y);
    updateParticles(dt);

    if (hoverPending) {
      const p = pick(hoverPending[0], hoverPending[1]);
      hovered = p;
      outline.visible = !!p;
      if (p) outline.position.set(...p.cell);
      canvas.style.cursor = p ? 'pointer' : '';
      hoverPending = null;
    } else if (hoverPending === false) {
      outline.visible = false; hovered = null; canvas.style.cursor = ''; hoverPending = null;
    }

    renderer.render(scene, camera);

    // адаптивное качество: если кадр стабильно > 22 мс — снижаем pixelRatio
    if (dt > 0.022) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio);
      resize();
      slowFrames = 0;
    }
  }

  return {
    world,
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    /** Целевая высота камеры в блоках (из скролла). */
    setTargetY(y, immediate = false) {
      camState.targetY = y;
      if (immediate) camState.y = y;
    },
    getCameraY: () => camState.y,
    get stats() {
      return { instances: Object.values(meshes).reduce((s, m) => s + m.mesh.count, 0), drawCalls: renderer.info.render.calls, pixelRatio };
    },
    dispose() {
      this.stop();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
    BOUNDS,
  };
}

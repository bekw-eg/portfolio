// ============================================================
//  main.js — entry point: wires scroll, UI, sound and the 3D scene.
//  Three.js is imported lazily only when 3D is on, so phones get
//  the lightweight 2D layer without downloading it.
// ============================================================
import './style.css';
import { initUI } from './ui.js';
import { sound } from './sound.js';
import { LEVELS } from './world.js';
import { blockDataURL } from './textures.js';

const canvas = document.getElementById('world');
const sections = [...document.querySelectorAll('.level[data-level]')];
const desktopQuery = window.matchMedia('(min-width: 768px) and (hover: hover)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let scene = null;
let sceneLoading = null;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
const can3D = () => desktopQuery.matches && webglAvailable();

// Block textures as CSS variables (2D fallback + UI details).
for (const name of ['end_stone', 'end_stone_bricks', 'obsidian', 'purpur']) {
  document.documentElement.style.setProperty(`--tex-${name.replaceAll('_', '-')}`, `url(${blockDataURL(name)})`);
}

// ---------- scroll → camera height (piecewise-linear between sections) ----
let anchors = [];
function computeAnchors() {
  anchors = sections.map((s) => ({
    scroll: Math.max(0, s.offsetTop + s.offsetHeight / 2 - window.innerHeight / 2),
    y: LEVELS[s.dataset.level],
  }));
  anchors[0].scroll = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  anchors[anchors.length - 1].scroll = Math.min(anchors[anchors.length - 1].scroll, max);
}
function worldYForScroll(sy) {
  if (!anchors.length) computeAnchors();
  if (sy <= anchors[0].scroll) return anchors[0].y;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (sy <= b.scroll) return a.y + (b.y - a.y) * ((sy - a.scroll) / Math.max(1, b.scroll - a.scroll));
  }
  return anchors[anchors.length - 1].y;
}
function currentSection(sy) {
  const mid = sy + window.innerHeight * 0.5;
  let id = sections[0].id;
  for (const s of sections) if (s.offsetTop <= mid) id = s.id;
  return id;
}
function onScroll() {
  const sy = window.scrollY;
  scene?.setTargetY(worldYForScroll(sy));
  ui.updateHud({ section: currentSection(sy) });
}

// ---------- 3D scene or 2D fallback ----------------------------------------
async function ensureScene() {
  if (scene) return scene;
  sceneLoading ||= import('./scene.js').then(({ createScene }) => {
    scene = createScene(canvas, {
      reducedMotion: reducedMotion.matches,
      onBreak: (name) => { sound.breakBlock(name); ui.onBlockBreak(name); },
      onShard: (id, pos) => ui.collect(id, pos),
      onAvatar: () => ui.onAvatar(),
    });
    ui.bindScene(scene);
    if (import.meta.env.DEV) window.__scene = scene;
    return scene;
  });
  return sceneLoading;
}

async function applyView() {
  computeAnchors();
  if (can3D()) {
    document.body.classList.remove('no3d');
    try {
      const s = await ensureScene();
      s.setTargetY(worldYForScroll(window.scrollY), true);
      s.start();
      document.body.classList.add('is-3d');
    } catch (err) {
      console.error('[3D] scene failed, falling back to 2D', err);
      document.body.classList.add('no3d');
    }
  } else {
    scene?.stop();
    document.body.classList.remove('is-3d');
    document.body.classList.add('no3d');
  }
  onScroll();
}

const ui = initUI();

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { computeAnchors(); onScroll(); });
desktopQuery.addEventListener('change', applyView);
document.addEventListener('visibilitychange', () => {
  if (!scene || !document.body.classList.contains('is-3d')) return;
  if (document.hidden) scene.stop(); else scene.start();
});

// smooth anchor navigation
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
});

applyView();
document.fonts?.ready.then(() => { computeAnchors(); onScroll(); });

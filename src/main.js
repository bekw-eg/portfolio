// ============================================================
//  main.js — точка входа: связывает скролл, UI, звук и 3D-сцену.
//  Three.js подгружается динамически только когда 3D включено,
//  поэтому на мобильных качается лёгкий 2D-интерфейс.
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

// Текстуры блоков как CSS-переменные — для 2D-фона на мобильных и рамок GUI.
for (const name of ['grass_side', 'dirt', 'stone', 'deepslate', 'obsidian', 'bedrock', 'netherrack', 'planks', 'redstone_ore', 'coal_ore', 'iron_ore']) {
  document.documentElement.style.setProperty(`--tex-${name.replace('_', '-')}`, `url(${blockDataURL(name)})`);
}

// ---------- скролл → высота камеры (кусочно-линейно по якорям секций) ----
let anchors = [];
function computeAnchors() {
  anchors = sections.map((s) => ({
    scroll: Math.max(0, s.offsetTop + s.offsetHeight / 2 - window.innerHeight / 2),
    y: LEVELS[s.dataset.level],
    id: s.id,
  }));
  anchors[0].scroll = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  anchors[anchors.length - 1].scroll = Math.min(anchors[anchors.length - 1].scroll, max);
}

function worldYForScroll(sy) {
  if (sy <= anchors[0].scroll) return anchors[0].y;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (sy <= b.scroll) {
      const t = (sy - a.scroll) / Math.max(1, b.scroll - a.scroll);
      return a.y + (b.y - a.y) * t;
    }
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
  const y = worldYForScroll(sy);
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scene?.setTargetY(y);
  ui.updateHud({ y, progress: Math.min(1, sy / max), section: currentSection(sy) });
}

// ---------- режимы ----------------------------------------------------
async function ensureScene() {
  if (scene) return scene;
  sceneLoading ||= import('./scene.js').then(({ createScene }) => {
    scene = createScene(canvas, {
      reducedMotion: reducedMotion.matches,
      onBreak: (name) => { sound.breakBlock(name); ui.onBlockBreak(name); },
    });
    if (import.meta.env.DEV) window.__scene = scene;
    return scene;
  });
  return sceneLoading;
}

async function applyMode(mode) {
  if (mode === 'simple') {
    scene?.stop();
    document.body.classList.remove('is-3d');
    return;
  }
  computeAnchors();
  if (can3D()) {
    document.body.classList.remove('no3d');
    try {
      const s = await ensureScene();
      if (ui.mode !== 'creative') return;
      s.setTargetY(worldYForScroll(window.scrollY), true);
      s.start();
      document.body.classList.add('is-3d');
    } catch (err) {
      console.error('[3D] не удалось запустить сцену, переключаюсь на 2D', err);
      document.body.classList.add('no3d');
    }
  } else {
    scene?.stop();
    document.body.classList.remove('is-3d');
    document.body.classList.add('no3d');
  }
  onScroll();
}

const ui = initUI({ onModeChange: applyMode });

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { computeAnchors(); onScroll(); });
desktopQuery.addEventListener('change', () => { if (ui.mode === 'creative') applyMode('creative'); });
document.addEventListener('visibilitychange', () => {
  if (!scene || ui.mode !== 'creative' || !document.body.classList.contains('is-3d')) return;
  if (document.hidden) scene.stop(); else scene.start();
});

// плавная навигация по якорям
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
});

if (ui.mode === 'creative') applyMode('creative');
// шрифты меняют высоты секций — пересчитаем якоря
document.fonts?.ready.then(() => { computeAnchors(); onScroll(); });

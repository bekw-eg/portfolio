// ============================================================
//  textures.js — процедурные пиксельные текстуры 16×16.
//  Модуль не зависит от Three.js: возвращает <canvas>/dataURL,
//  поэтому его используют и 3D-сцена, и облегчённый 2D-режим.
// ============================================================

export const TEX = 16;

// --- утилиты ------------------------------------------------
export function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function canvas(w = TEX, h = TEX) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

const px = (ctx, x, y, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); };

/** Заливка случайными цветами из палитры (веса — повторы). */
function speckle(ctx, palette, r, w = TEX, h = TEX) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      px(ctx, x, y, palette[Math.floor(r() * palette.length)]);
}

/** Шумная заливка одним цветом с разбросом яркости. */
function noisy(ctx, base, amount, r) {
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++)
      px(ctx, x, y, shade(base, 1 + (r() - 0.5) * amount));
}

/** Кластеры руды поверх камня. */
function ore(ctx, colors, r, clusters = 4) {
  for (let i = 0; i < clusters; i++) {
    const cx = 2 + Math.floor(r() * 12), cy = 2 + Math.floor(r() * 12);
    const cells = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]];
    for (const [dx, dy] of cells) {
      if (r() < 0.25) continue;
      px(ctx, cx + dx, cy + dy, colors[Math.floor(r() * colors.length)]);
    }
    px(ctx, cx, cy, colors[0]);
  }
}

// --- генераторы блоков ---------------------------------------
const STONE = ['#7f7f7f', '#7a7a7a', '#858585', '#6f6f6f', '#8e8e8e', '#7f7f7f'];
const DEEP = ['#4a4a52', '#43434b', '#52525a', '#3b3b42', '#4a4a52'];
const DIRT = ['#866043', '#866043', '#79553a', '#96704e', '#6b4a30', '#8b6446'];

function stoneBase(ctx, r) { speckle(ctx, STONE, r); }
function deepBase(ctx, r) {
  for (let y = 0; y < TEX; y++) {
    const row = r() < 0.2 ? 0.85 : 1;
    for (let x = 0; x < TEX; x++) px(ctx, x, y, shade(DEEP[Math.floor(r() * DEEP.length)].replace('rgb', ''), row));
  }
}

const GEN = {
  dirt(ctx, r) { speckle(ctx, DIRT, r); },

  grass_top(ctx, r) { speckle(ctx, ['#5d9b3a', '#6aab43', '#4f8a30', '#79b84f', '#5d9b3a', '#62a23e'], r); },

  grass_side(ctx, r) {
    speckle(ctx, DIRT, r);
    const greens = ['#5d9b3a', '#6aab43', '#4f8a30', '#79b84f'];
    for (let x = 0; x < TEX; x++) {
      const d = 2 + Math.floor(r() * 3) + (r() < 0.2 ? 1 : 0);
      for (let y = 0; y < d; y++) px(ctx, x, y, greens[Math.floor(r() * greens.length)]);
    }
  },

  stone(ctx, r) { stoneBase(ctx, r); },
  cobble(ctx, r) {
    speckle(ctx, ['#6b6b6b', '#7a7a7a', '#5e5e5e', '#8a8a8a'], r);
    ctx.fillStyle = '#4b4b4b';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * 14), Math.floor(r() * 16), 3, 1);
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * 16), Math.floor(r() * 14), 1, 3);
  },
  deepslate(ctx, r) { deepBase(ctx, r); },
  gravel(ctx, r) { speckle(ctx, ['#857f7e', '#6e6866', '#9a9393', '#5c5655', '#7b7574'], r); },

  coal_ore(ctx, r) { stoneBase(ctx, r); ore(ctx, ['#1c1c1c', '#2f2f2f', '#3d3d3d'], r); },
  iron_ore(ctx, r) { stoneBase(ctx, r); ore(ctx, ['#d8af93', '#e8c8b0', '#af8e77'], r); },
  gold_ore(ctx, r) { stoneBase(ctx, r); ore(ctx, ['#fcee4b', '#ffffb5', '#d9a61e'], r); },
  diamond_ore(ctx, r) { deepBase(ctx, r); ore(ctx, ['#5decf5', '#d1faff', '#1aaab5'], r, 5); },
  emerald_ore(ctx, r) { stoneBase(ctx, r); ore(ctx, ['#17dd62', '#82f6ad', '#00a03a'], r, 3); },
  redstone_ore(ctx, r) { deepBase(ctx, r); ore(ctx, ['#ff1a1a', '#ff6b6b', '#aa0000'], r, 5); },

  redstone_block(ctx, r) {
    speckle(ctx, ['#a81a0a', '#b91e0c', '#8f1307', '#c92a14'], r);
    ctx.fillStyle = '#ff4a2a';
    for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
  },
  redstone_lamp(ctx, r) {
    speckle(ctx, ['#f7c34f', '#ffd97a', '#e0a336', '#ffeaa8'], r);
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(4, 4, 8, 1); ctx.fillRect(4, 11, 8, 1); ctx.fillRect(4, 4, 1, 8); ctx.fillRect(11, 4, 1, 8);
  },

  obsidian(ctx, r) {
    speckle(ctx, ['#140f1f', '#0f0b17', '#1b1429', '#140f1f', '#2a1d3e', '#0b0812'], r);
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(r() * 14), y = Math.floor(r() * 14);
      px(ctx, x, y, '#3b2a56'); px(ctx, x + 1, y, '#4e3a72'); px(ctx, x + 1, y + 1, '#3b2a56');
    }
  },
  crying_obsidian(ctx, r) {
    GEN.obsidian(ctx, r);
    for (let i = 0; i < 6; i++) px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), '#a23cff');
  },

  bedrock(ctx, r) {
    speckle(ctx, ['#575757', '#333333', '#7a7a7a', '#1f1f1f', '#4a4a4a', '#626262'], r);
    ctx.fillStyle = '#111';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.floor(r() * 14), Math.floor(r() * 14), 2, 2);
  },

  netherrack(ctx, r) {
    speckle(ctx, ['#6e2c2c', '#7d3535', '#552020', '#8f4141', '#6e2c2c', '#4a1a1a'], r);
  },
  nether_bricks(ctx, r) {
    speckle(ctx, ['#2c1519', '#341a1e', '#25101a'], r);
    ctx.fillStyle = '#160a0c';
    for (let y = 3; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
    for (let y = 0; y < 16; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = off; x < 16; x += 8) ctx.fillRect(x, y, 1, 3);
    }
  },

  log_side(ctx, r) {
    for (let x = 0; x < TEX; x++) {
      const col = ['#6b5130', '#5a4426', '#7a5e38', '#4f3b20'][Math.floor(r() * 4)];
      for (let y = 0; y < TEX; y++) px(ctx, x, y, r() < 0.15 ? shade(col.replace('rgb', ''), 0.85) : col);
    }
  },
  log_top(ctx, r) {
    noisy(ctx, '#b4905a', 0.15, r);
    ctx.fillStyle = '#6b5130';
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    ctx.strokeStyle = '#94744a';
    for (const s of [3, 6]) { ctx.fillStyle = '#94744a'; ctx.fillRect(s, s, 16 - s * 2, 1); ctx.fillRect(s, 15 - s, 16 - s * 2, 1); ctx.fillRect(s, s, 1, 16 - s * 2); ctx.fillRect(15 - s, s, 1, 16 - s * 2); }
  },
  leaves(ctx, r) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        if (r() < 0.14) continue; // дырки — alphaTest
        px(ctx, x, y, ['#3f8f2a', '#2f6f20', '#4fa135', '#367d24', '#56a83a'][Math.floor(r() * 5)]);
      }
  },
  planks(ctx, r) {
    noisy(ctx, '#a2824e', 0.18, r);
    ctx.fillStyle = '#7a5f36';
    for (let y = 3; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
    for (let y = 0; y < 16; y += 4) ctx.fillRect(((y / 4) % 2 ? 11 : 4), y, 1, 3);
  },
  crafting_top(ctx, r) {
    GEN.planks(ctx, r);
    ctx.fillStyle = '#5a3f1e';
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = '#c29d62';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#5a3f1e';
    ctx.fillRect(6, 2, 1, 12); ctx.fillRect(10, 2, 1, 12); ctx.fillRect(2, 6, 12, 1); ctx.fillRect(2, 10, 12, 1);
  },
  crafting_side(ctx, r) {
    GEN.planks(ctx, r);
    ctx.fillStyle = '#5a3f1e'; ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = '#9b9b9b'; ctx.fillRect(3, 5, 2, 6); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(3, 9, 2, 5);
    ctx.fillStyle = '#c8c8c8'; ctx.fillRect(9, 5, 5, 2); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(11, 7, 1, 7);
  },
  crafting_front(ctx, r) {
    GEN.planks(ctx, r);
    ctx.fillStyle = '#5a3f1e'; ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = '#3d2a12'; ctx.fillRect(4, 5, 8, 7);
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(5, 6, 2, 2); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(9, 6, 2, 2);
    ctx.fillStyle = '#7d5e33'; ctx.fillRect(5, 9, 6, 2);
  },

  glowstone(ctx, r) {
    speckle(ctx, ['#f9d49c', '#ffe9b8', '#d9a55a', '#b97f3a', '#ffcc66', '#8f5c2a'], r);
  },
  lava(ctx, r) {
    speckle(ctx, ['#d45a12', '#e8761a', '#ff9d2a', '#c44a10', '#ffb84a', '#e8761a'], r);
    ctx.fillStyle = '#ffd77a';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * 14), Math.floor(r() * 16), 2, 1);
  },
  portal(ctx, r, t = 0) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const v = Math.sin((x * 0.9 + t * 3) + Math.sin(y * 0.7 + t * 2) * 2) * 0.5 + 0.5;
        const n = r() * 0.35;
        const k = Math.min(1, v * 0.7 + n);
        px(ctx, x, y, `rgba(${Math.round(90 + k * 120)},${Math.round(10 + k * 50)},${Math.round(170 + k * 85)},${0.72 + k * 0.25})`);
      }
  },
};

export const BLOCK_TEXTURES = Object.keys(GEN);

const cache = new Map();

/** Возвращает canvas 16×16 для блока (кэшируется). */
export function blockCanvas(name) {
  if (cache.has(name)) return cache.get(name);
  const gen = GEN[name];
  if (!gen) throw new Error(`Unknown texture: ${name}`);
  const [c, ctx] = canvas();
  gen(ctx, rng(hashStr(name)));
  cache.set(name, c);
  return c;
}

/** Перерисовывает анимированную текстуру (портал) в существующий canvas. */
export function animateCanvas(name, c, t) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, TEX, TEX);
  GEN[name](ctx, rng(hashStr(name) + Math.floor(t * 8)), t);
}

/** dataURL текстуры, увеличенный без сглаживания (для CSS-фонов 2D-режима). */
export function blockDataURL(name, scale = 4) {
  const src = blockCanvas(name);
  const [c, ctx] = canvas(TEX * scale, TEX * scale);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}

// ============================================================
//  Иконки предметов (хотбар, верстак, достижения, контакты)
//  Рисуются векторами в сетке 16×16, затем «пикселизуются»
//  (бинарная альфа) и обводятся тёмным контуром как в игре.
// ============================================================

function crispAndOutline(c, ctx, outline = true) {
  const img = ctx.getImageData(0, 0, TEX, TEX);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 3] = d[i + 3] >= 110 ? 255 : 0;
  }
  if (outline) {
    const src = new Uint8ClampedArray(d);
    const at = (x, y) => (x < 0 || y < 0 || x >= TEX || y >= TEX) ? -1 : (y * TEX + x) * 4;
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const i = at(x, y);
        if (src[i + 3]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = at(x + dx, y + dy);
          if (j >= 0 && src[j + 3]) {
            d[i] = src[j] * 0.35; d[i + 1] = src[j + 1] * 0.35; d[i + 2] = src[j + 2] * 0.35; d[i + 3] = 255;
            break;
          }
        }
      }
  }
  ctx.putImageData(img, 0, 0);
}

function poly(ctx, color, pts) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}
function rect(ctx, color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function circle(ctx, color, cx, cy, rad) {
  ctx.fillStyle = color;
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rad * rad) ctx.fillRect(x, y, 1, 1);
    }
}
function ring(ctx, color, cx, cy, r1, r2) {
  ctx.fillStyle = color;
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, q = dx * dx + dy * dy;
      if (q <= r2 * r2 && q >= r1 * r1) ctx.fillRect(x, y, 1, 1);
    }
}

const ICONS = {
  unity(ctx) { // изометрический куб
    poly(ctx, '#f2f2f2', [8, 1, 15, 4.5, 8, 8, 1, 4.5]);
    poly(ctx, '#9aa0a6', [1, 4.5, 8, 8, 8, 15.5, 1, 12]);
    poly(ctx, '#4b5157', [15, 4.5, 8, 8, 8, 15.5, 15, 12]);
    rect(ctx, '#1d2125', 7, 7, 2, 2);
  },
  node(ctx) { // зелёный шестиугольник
    poly(ctx, '#539e43', [8, 0.5, 14.5, 4.2, 14.5, 11.8, 8, 15.5, 1.5, 11.8, 1.5, 4.2]);
    poly(ctx, '#6cc24a', [8, 0.5, 14.5, 4.2, 8, 8, 1.5, 4.2]);
    rect(ctx, '#f7df1e', 5, 7, 2, 5); rect(ctx, '#f7df1e', 4, 11, 2, 1);
    rect(ctx, '#f7df1e', 9, 7, 3, 1); rect(ctx, '#f7df1e', 9, 8, 1, 2); rect(ctx, '#f7df1e', 9, 9, 3, 1); rect(ctx, '#f7df1e', 11, 10, 1, 2); rect(ctx, '#f7df1e', 9, 11, 3, 1);
  },
  python(ctx) {
    rect(ctx, '#3776ab', 3, 1, 7, 7); rect(ctx, '#3776ab', 1, 5, 4, 6); rect(ctx, '#3776ab', 1, 8, 6, 3);
    rect(ctx, '#ffd43b', 6, 8, 7, 7); rect(ctx, '#ffd43b', 11, 5, 4, 6); rect(ctx, '#ffd43b', 9, 5, 6, 3);
    rect(ctx, '#ffffff', 5, 2, 1, 1); rect(ctx, '#ffffff', 10, 13, 1, 1);
  },
  go(ctx) { // круглый суслик
    circle(ctx, '#00add8', 8, 9, 7);
    rect(ctx, '#00add8', 2, 2, 2, 3); rect(ctx, '#00add8', 12, 2, 2, 3);
    circle(ctx, '#ffffff', 5.5, 7.5, 2.2); circle(ctx, '#ffffff', 10.5, 7.5, 2.2);
    rect(ctx, '#000000', 5, 7, 2, 2); rect(ctx, '#000000', 10, 7, 2, 2);
    rect(ctx, '#f4d7a6', 6, 11, 4, 2); rect(ctx, '#ffffff', 7, 13, 2, 1);
  },
  docker(ctx) { // кит с контейнерами
    poly(ctx, '#2496ed', [1, 9, 14, 9, 15, 7.5, 16, 8.5, 14.5, 11, 11, 14, 4, 14, 1.5, 11.5]);
    rect(ctx, '#2496ed', 3, 6, 2, 2); rect(ctx, '#2496ed', 6, 6, 2, 2); rect(ctx, '#2496ed', 9, 6, 2, 2);
    rect(ctx, '#2496ed', 6, 3, 2, 2); rect(ctx, '#2496ed', 9, 3, 2, 2);
    rect(ctx, '#ffffff', 4, 11, 1, 1);
  },
  sqlite(ctx) { // цилиндр БД + молния (websocket)
    rect(ctx, '#4a90c8', 2, 3, 10, 11);
    circle(ctx, '#7fb8e6', 7, 3.5, 3);
    rect(ctx, '#2b5f8a', 2, 7, 10, 1); rect(ctx, '#2b5f8a', 2, 10, 10, 1);
    poly(ctx, '#ffd43b', [13, 5, 15.5, 5, 13.5, 9, 16, 9, 11.5, 15.5, 12.5, 10.5, 10.5, 10.5]);
  },
  blender(ctx) {
    ring(ctx, '#ea7600', 9, 9, 3, 6.5);
    circle(ctx, '#265787', 9, 9, 3);
    circle(ctx, '#ffffff', 9, 9, 1.2);
    poly(ctx, '#ea7600', [1, 3, 7, 3, 7, 5.5, 2, 5.5]);
    poly(ctx, '#ea7600', [3, 7, 6, 7, 6, 9, 3, 9]);
  },
  pixel(ctx) {
    rect(ctx, '#ff5555', 2, 2, 6, 6); rect(ctx, '#55ff55', 8, 2, 6, 6);
    rect(ctx, '#5555ff', 2, 8, 6, 6); rect(ctx, '#ffff55', 8, 8, 6, 6);
  },
  rag(ctx) { // свиток + лупа
    rect(ctx, '#efe2b8', 2, 2, 9, 12); rect(ctx, '#c9b47e', 2, 2, 9, 1); rect(ctx, '#c9b47e', 2, 13, 9, 1);
    rect(ctx, '#7a6a48', 4, 5, 5, 1); rect(ctx, '#7a6a48', 4, 7, 4, 1); rect(ctx, '#7a6a48', 4, 9, 5, 1);
    ring(ctx, '#8b8b8b', 11, 10, 2, 3.6); circle(ctx, '#bdeaff', 11, 10, 2);
    poly(ctx, '#6b4a2a', [13, 12.5, 14.5, 11.5, 16, 14.5, 14.5, 15.5]);
  },
  voice(ctx) { // микрофон
    rect(ctx, '#c0c0c0', 6, 1, 4, 8); rect(ctx, '#8a8a8a', 6, 3, 4, 1); rect(ctx, '#8a8a8a', 6, 5, 4, 1);
    rect(ctx, '#5a5a5a', 4, 7, 1, 3); rect(ctx, '#5a5a5a', 11, 7, 1, 3); rect(ctx, '#5a5a5a', 5, 10, 6, 1);
    rect(ctx, '#5a5a5a', 7, 11, 2, 3); rect(ctx, '#5a5a5a', 5, 14, 6, 1);
  },
  tower(ctx) {
    rect(ctx, '#8a8a8a', 4, 5, 8, 10); rect(ctx, '#6e6e6e', 4, 5, 2, 10);
    rect(ctx, '#8a8a8a', 3, 2, 2, 3); rect(ctx, '#8a8a8a', 7, 2, 2, 3); rect(ctx, '#8a8a8a', 11, 2, 2, 3);
    rect(ctx, '#3a2a1a', 7, 10, 2, 5); rect(ctx, '#ff4444', 7, 0, 1, 2);
  },
  apple(ctx) {
    circle(ctx, '#d8322a', 6, 9.5, 5); circle(ctx, '#d8322a', 10, 9.5, 5);
    rect(ctx, '#ff7b6b', 4, 6, 2, 2);
    rect(ctx, '#6b4a2a', 8, 1, 1, 4); poly(ctx, '#4fa135', [9, 3, 13, 1, 12, 4]);
    rect(ctx, '#ffffff', 5, 9, 2, 2); rect(ctx, '#ffffff', 9, 9, 2, 2);
    rect(ctx, '#000000', 6, 10, 1, 1); rect(ctx, '#000000', 10, 10, 1, 1);
  },
  map(ctx) {
    rect(ctx, '#e8dcae', 1, 2, 14, 12);
    rect(ctx, '#7fbf6a', 3, 4, 4, 3); rect(ctx, '#5aa0e0', 8, 5, 5, 6); rect(ctx, '#7fbf6a', 3, 9, 3, 3);
    rect(ctx, '#d8322a', 9, 7, 2, 2);
  },
  clock(ctx) {
    circle(ctx, '#f2c94c', 8, 8, 7); circle(ctx, '#1d3b6e', 8, 8, 5);
    poly(ctx, '#ffe066', [3, 8, 13, 8, 13, 12.5, 3, 12.5]);
    rect(ctx, '#5a4a1a', 7, 4, 2, 5);
  },
  compass(ctx) {
    circle(ctx, '#9a9a9a', 8, 8, 7); circle(ctx, '#d6d6d6', 8, 8, 5.5);
    poly(ctx, '#d8322a', [8, 2.5, 10, 8, 6, 8]); poly(ctx, '#5a5a5a', [8, 13.5, 10, 8, 6, 8]);
  },
  book(ctx) {
    rect(ctx, '#6a2fb5', 3, 1, 10, 14); rect(ctx, '#efe2b8', 12, 2, 2, 12);
    rect(ctx, '#3d1a6e', 3, 1, 2, 14); rect(ctx, '#ffd43b', 7, 5, 3, 3);
    rect(ctx, '#d9a6ff', 6, 10, 5, 1);
  },
  pickaxe(ctx) {
    poly(ctx, '#d0d0d0', [2, 3, 6, 1, 11, 1, 15, 5, 15, 10, 13, 6, 9, 3, 5, 4]);
    poly(ctx, '#7a5a30', [12, 4.5, 13.5, 6, 3, 16, 1.5, 14.5]);
  },
  diamond(ctx) {
    poly(ctx, '#5decf5', [4, 2, 12, 2, 15, 6, 8, 15, 1, 6]);
    poly(ctx, '#d1faff', [4, 2, 8, 2, 6, 6, 1, 6]);
    poly(ctx, '#1aaab5', [15, 6, 8, 15, 10, 6]);
  },
  github(ctx) { // тёмный кружок с котом-силуэтом
    circle(ctx, '#24292f', 8, 8, 7.5);
    circle(ctx, '#ffffff', 8, 8.5, 4);
    poly(ctx, '#ffffff', [4.5, 6, 4.5, 2.5, 7, 5]);
    poly(ctx, '#ffffff', [11.5, 6, 11.5, 2.5, 9, 5]);
    rect(ctx, '#ffffff', 6, 11, 4, 4);
    rect(ctx, '#24292f', 6, 8, 1, 1); rect(ctx, '#24292f', 9, 8, 1, 1);
  },
  telegram(ctx) { // бумажный самолётик
    circle(ctx, '#2aa3df', 8, 8, 7.5);
    poly(ctx, '#ffffff', [3, 7.5, 13, 3.5, 10.5, 13, 7.5, 10.5]);
    poly(ctx, '#c8dbe8', [6.5, 9, 7.5, 13, 9, 11]);
  },
  email(ctx) {
    rect(ctx, '#f2f2f2', 1, 3, 14, 10);
    poly(ctx, '#c8c8c8', [1, 3, 15, 3, 8, 9]);
    poly(ctx, '#d8322a', [7, 7, 9, 7, 9, 9, 7, 9]);
  },
  cv(ctx) {
    rect(ctx, '#fafafa', 3, 1, 10, 14); poly(ctx, '#cfcfcf', [10, 1, 13, 1, 13, 4]);
    rect(ctx, '#5a5a5a', 5, 4, 4, 1); rect(ctx, '#9a9a9a', 5, 6, 6, 1); rect(ctx, '#9a9a9a', 5, 8, 6, 1); rect(ctx, '#9a9a9a', 5, 10, 5, 1);
    rect(ctx, '#d8322a', 5, 12, 3, 1);
  },
  chat(ctx) {
    rect(ctx, '#e8e8e8', 1, 2, 14, 9); poly(ctx, '#e8e8e8', [3, 10, 7, 10, 3, 14]);
    rect(ctx, '#4a4a4a', 4, 5, 2, 2); rect(ctx, '#4a4a4a', 7, 5, 2, 2); rect(ctx, '#4a4a4a', 10, 5, 2, 2);
  },
  sound_on(ctx) {
    rect(ctx, '#e8e8e8', 2, 6, 3, 4); poly(ctx, '#e8e8e8', [5, 6, 9, 2, 9, 14, 5, 10]);
    rect(ctx, '#e8e8e8', 11, 5, 1, 6); rect(ctx, '#e8e8e8', 13, 3, 1, 10);
  },
  sound_off(ctx) {
    rect(ctx, '#e8e8e8', 2, 6, 3, 4); poly(ctx, '#e8e8e8', [5, 6, 9, 2, 9, 14, 5, 10]);
    rect(ctx, '#ff5555', 11, 6, 1, 1); rect(ctx, '#ff5555', 12, 7, 1, 1); rect(ctx, '#ff5555', 13, 8, 1, 1); rect(ctx, '#ff5555', 14, 9, 1, 1);
    rect(ctx, '#ff5555', 14, 6, 1, 1); rect(ctx, '#ff5555', 13, 7, 1, 1); rect(ctx, '#ff5555', 11, 9, 1, 1); rect(ctx, '#ff5555', 12, 8, 1, 1);
  },
};

const iconCache = new Map();

/** dataURL иконки предмета 16×16 ×scale. */
export function iconDataURL(name, scale = 4) {
  const key = `${name}@${scale}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const [c, ctx] = canvas();
  ctx.imageSmoothingEnabled = false;
  (ICONS[name] || ICONS.pixel)(ctx);
  crispAndOutline(c, ctx, !['chat', 'sound_on', 'sound_off'].includes(name));
  const [big, bctx] = canvas(TEX * scale, TEX * scale);
  bctx.drawImage(c, 0, 0, big.width, big.height);
  const url = big.toDataURL();
  iconCache.set(key, url);
  return url;
}

export const ICON_NAMES = Object.keys(ICONS);

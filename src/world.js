// ============================================================
//  world.js — процедурная генерация вертикального разреза мира.
//  Координаты: x — вправо, y — вверх, z — от зрителя вглубь (z ≤ 1).
//  1 юнит = 1 блок. Чистые данные, без Three.js.
// ============================================================
import { BLOCKS } from './blocks.js';

export const BOUNDS = { xMin: -38, xMax: 38, yMin: -92, yMax: 26, zMin: -3, zMax: 1 };

// Высота камеры (центр кадра) для каждого уровня-секции страницы.
export const LEVELS = {
  surface: 8,
  stack: -15,
  projects: -45,
  contacts: -77,
};

// Ключевые точки сцены (используются для света и частиц).
export const LAB = { x0: -24, x1: 24, y0: -54, y1: -36 };
export const PORTAL = { x0: 7, x1: 12, y0: -85, y1: -78, z: -1 };

export const TYPE_NAMES = ['air', ...Object.keys(BLOCKS)];
const ID = Object.fromEntries(TYPE_NAMES.map((n, i) => [n, i]));

const NX = BOUNDS.xMax - BOUNDS.xMin + 1;
const NY = BOUNDS.yMax - BOUNDS.yMin + 1;
const NZ = BOUNDS.zMax - BOUNDS.zMin + 1;

// --- шум ------------------------------------------------------
function hash3(x, y, z, seed = 1337) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
function noise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const tx = smooth(x - xi), ty = smooth(y - yi);
  const a = hash3(xi, yi, 0, seed), b = hash3(xi + 1, yi, 0, seed);
  const c = hash3(xi, yi + 1, 0, seed), d = hash3(xi + 1, yi + 1, 0, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}
function fbm(x, y, seed) {
  return noise2(x, y, seed) * 0.6 + noise2(x * 2.1, y * 2.1, seed + 7) * 0.3 + noise2(x * 4.3, y * 4.3, seed + 13) * 0.1;
}

// --- мир ------------------------------------------------------
export class World {
  constructor() {
    this.grid = new Uint8Array(NX * NY * NZ);
    this.generate();
  }

  idx(x, y, z) { return ((y - BOUNDS.yMin) * NZ + (z - BOUNDS.zMin)) * NX + (x - BOUNDS.xMin); }
  inBounds(x, y, z) {
    return x >= BOUNDS.xMin && x <= BOUNDS.xMax && y >= BOUNDS.yMin && y <= BOUNDS.yMax && z >= BOUNDS.zMin && z <= BOUNDS.zMax;
  }
  get(x, y, z) { return this.inBounds(x, y, z) ? this.grid[this.idx(x, y, z)] : -1; }
  set(x, y, z, name) { if (this.inBounds(x, y, z)) this.grid[this.idx(x, y, z)] = name ? ID[name] : 0; }
  nameAt(x, y, z) { const t = this.get(x, y, z); return t > 0 ? TYPE_NAMES[t] : null; }

  /** Скрывает ли клетка соседей (для отсечения невидимых блоков). */
  isOpaque(x, y, z) {
    if (x < BOUNDS.xMin || x > BOUNDS.xMax) return true;   // за краями кадра
    if (z < BOUNDS.zMin || y < BOUNDS.yMin) return true;   // задняя стенка и дно
    if (z > BOUNDS.zMax || y > BOUNDS.yMax) return false;  // перед зрителем / небо
    const t = this.grid[this.idx(x, y, z)];
    if (!t) return false;
    return BLOCKS[TYPE_NAMES[t]].solid !== false;
  }

  isVisible(x, y, z) {
    return !this.isOpaque(x + 1, y, z) || !this.isOpaque(x - 1, y, z) ||
           !this.isOpaque(x, y + 1, z) || !this.isOpaque(x, y - 1, z) ||
           !this.isOpaque(x, y, z + 1) || !this.isOpaque(x, y, z - 1);
  }

  /** Обход всех непустых блоков: cb(name, x, y, z). */
  forEach(cb) {
    for (let y = BOUNDS.yMin; y <= BOUNDS.yMax; y++)
      for (let z = BOUNDS.zMin; z <= BOUNDS.zMax; z++)
        for (let x = BOUNDS.xMin; x <= BOUNDS.xMax; x++) {
          const t = this.grid[this.idx(x, y, z)];
          if (t) cb(TYPE_NAMES[t], x, y, z);
        }
  }

  groundAt(x, z = 0) {
    let g = Math.round(1.1 * Math.sin(x * 0.16) + 0.8 * Math.sin(x * 0.41 + 1.3));
    if (x > 16) g += Math.min(5, Math.floor((x - 16) * 0.45));
    if (x < -22) g += Math.min(4, Math.floor((-22 - x) * 0.35));
    if (z <= -2) g += 1 + Math.floor(noise2(x * 0.2, z, 5) * 2.2); // задние ряды выше — глубина
    return g;
  }

  generate() {
    const { xMin, xMax, yMin, zMin, zMax } = BOUNDS;

    for (let x = xMin; x <= xMax; x++) {
      for (let z = zMin; z <= zMax; z++) {
        const g = this.groundAt(x, z);
        const dirtDepth = 3 + Math.floor(hash3(x, 0, z, 3) * 2);
        for (let y = yMin; y <= g; y++) this.set(x, y, z, this.baseBlock(x, y, z, g, dirtDepth));
      }
    }

    this.carveCaves();
    this.buildLab();
    this.buildNether();
    this.addSurfaceDetails();
  }

  baseBlock(x, y, z, g, dirtDepth) {
    const r = hash3(x, y, z, 11);
    if (y === g) return 'grass';
    if (y > g - dirtDepth) return r < 0.05 ? 'gravel' : 'dirt';

    // Бедрок и Незер
    if (y <= -74) {
      const n = fbm(x * 0.25, y * 0.25, 91);
      if (n > 0.8 && z <= -2) return 'glowstone';
      if (n < 0.2) return 'nether_bricks';
      return 'netherrack';
    }
    if (y <= -70) return (y === -70 && r < 0.5) || (y === -71 && r < 0.3) ? 'deepslate' : 'bedrock';
    if (y <= -66) return r < 0.35 + (-66 - y) * 0.15 ? 'obsidian' : (r < 0.8 ? 'deepslate' : 'crying_obsidian');

    // Глубинный сланец (пещеры)
    const deep = y < -34 || (y < -30 && r < (-30 - y) / 4);
    const vein = fbm(x * 0.35, y * 0.35 + z * 3.1, 23);
    if (deep) {
      if (vein > 0.78) return 'redstone_ore';
      if (vein < 0.14) return 'diamond_ore';
      return 'deepslate';
    }
    // Каменный слой с рудами (секция «Стек»)
    if (vein > 0.74) return 'coal_ore';
    if (vein < 0.17) return y > -12 ? 'coal_ore' : 'iron_ore';
    if (r < 0.012 && y < -14) return 'gold_ore';
    if (r > 0.993 && y < -18) return 'emerald_ore';
    if (r > 0.96) return 'cobble';
    return 'stone';
  }

  carveCaves() {
    const { xMin, xMax } = BOUNDS;
    for (let x = xMin; x <= xMax; x++) {
      for (let y = -66; y <= -8; y++) {
        const n = fbm(x * 0.09, y * 0.13, 42);
        const depthBias = y < -28 ? 0 : 0.08; // в верхних слоях пещер меньше
        const t = 0.6 + depthBias;
        if (n > t) this.set(x, y, 1, null), this.set(x, y, 0, null);
        if (n > t + 0.05) this.set(x, y, -1, null);
        if (n > t + 0.1) this.set(x, y, -2, null);
        // мелкие выемки на фасаде и выступающие камни — объём при параллаксе
        const r = hash3(x, y, 9, 77);
        if (n <= t) {
          if (r < 0.03) { this.set(x, y, 1, null); this.set(x, y, 0, null); } // выемка
          else if (r < 0.94) this.set(x, y, 1, null);                          // иначе — выступ
        }
        // лавовые озёра на дне пещер
        if (y <= -60 && n > t) {
          for (const z of [1, 0, -1, -2]) if (this.get(x, y, z) === 0 && y <= -62) this.set(x, y, z, 'lava');
        }
      }
    }
    // выступы на верхних слоях (z = 1) тоже прореживаем
    for (let x = xMin; x <= xMax; x++)
      for (let y = -7; y <= 0; y++) if (y < this.groundAt(x, 1) - 3 && hash3(x, y, 5, 8) < 0.9) this.set(x, y, 1, null);
  }

  buildLab() {
    const { x0, x1, y0, y1 } = LAB;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        // неровные края комнаты
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        if (edge < 2 && hash3(x, y, 1, 5) < 0.45) continue;
        for (const z of [1, 0, -1, -2]) this.set(x, y, z, null);
        // задняя стена: схема из редстоуна и ламп
        const bx = x - x0, by = y - y0;
        let wall = 'deepslate';
        if (by === 1) wall = 'redstone_block';
        else if ((bx % 6 === 3) && by > 1 && by < 13) wall = by % 4 === 2 ? 'redstone_lamp' : 'redstone_block';
        else if (by === 13 && bx > 2 && bx < x1 - x0 - 2) wall = 'redstone_block';
        else if (hash3(x, y, 3, 2) < 0.06) wall = 'redstone_ore';
        this.set(x, y, -3, wall);
      }
    }
    // пол и потолок
    for (let x = x0; x <= x1; x++) {
      for (const z of [1, 0, -1, -2]) this.set(x, y0, z, hash3(x, z, 0, 4) < 0.3 ? 'cobble' : 'deepslate');
      if (x % 8 === 0) for (const z of [0, -1, -2]) this.set(x, y1, z, 'glowstone');
    }
    // верстаки и колонны
    for (const cx of [x0 + 4, x1 - 4]) {
      this.set(cx, y0 + 1, -1, 'crafting_table');
      this.set(cx + (cx < 0 ? 1 : -1), y0 + 1, -2, 'planks');
    }
    for (const cx of [x0 + 9, x1 - 9]) for (let y = y0 + 1; y < y1; y++) this.set(cx, y, -2, y % 3 === 0 ? 'redstone_lamp' : 'cobble');
  }

  buildNether() {
    // пещера Незера
    for (let x = BOUNDS.xMin; x <= BOUNDS.xMax; x++) {
      const top = -73 - Math.floor(fbm(x * 0.15, 1, 61) * 3);
      const floor = -86 + Math.floor(fbm(x * 0.2, 2, 62) * 2);
      for (let y = floor; y <= top; y++) for (const z of [1, 0, -1, -2]) this.set(x, y, z, null);
      // лава на полу по краям
      if (Math.abs(x) > 26) for (const z of [1, 0, -1]) this.set(x, floor, z, 'lava');
    }
    // портал
    const { x0, x1, y0, y1, z } = PORTAL;
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const frame = x === x0 || x === x1 || y === y0 || y === y1;
        this.set(x, y, z, frame ? 'obsidian' : 'portal');
      }
    for (let x = x0 - 1; x <= x1 + 1; x++) for (const zz of [1, 0, -1, -2]) this.set(x, y0 - 1, zz, 'netherrack');
  }

  addSurfaceDetails() {
    const tree = (tx, tz, h) => {
      const g = this.groundAt(tx, tz);
      for (let y = g + 1; y <= g + h; y++) this.set(tx, y, tz, 'log');
      const top = g + h;
      for (let dy = -2; dy <= 1; dy++)
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) {
            const rad = dy >= 0 ? 1 : 2;
            if (Math.abs(dx) > rad || Math.abs(dz) > rad) continue;
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash3(dx, dy, dz, tx) < 0.6) continue;
            const x = tx + dx, y = top + dy, zz = tz + dz;
            if (zz > BOUNDS.zMax || zz < BOUNDS.zMin) continue;
            if (this.get(x, y, zz) === 0) this.set(x, y, zz, 'leaves');
          }
      this.set(tx, top + 1, tz, 'leaves');
    };
    tree(13, -1, 5);
    tree(-27, -2, 4);
    tree(30, -2, 4);
  }
}

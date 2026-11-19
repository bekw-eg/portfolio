// ============================================================
//  world.js — procedural layout of the Void: floating islands.
//  Axes: x → right, y → up, z → towards the viewer. 1 unit = 1 block.
//  Pure data (sparse voxel map), no Three.js here.
// ============================================================
import { BLOCKS } from './blocks.js';

// Camera height (centre of the frame) for every page section.
export const LEVELS = {
  home: 0,
  stack: -26,
  projects: -52,
  path: -78,
  about: -104,
  portal: -133,
  contacts: -154,
};

// Where the 3D gateway stands (scene.js builds it from these numbers).
export const PORTAL = { x: 13, y: -139, z: 0 };
// Where the avatar stands.
export const AVATAR = { x: 11, y: -5.5, z: 0.5 };

// Floating tech shards: one per hotbar item (ids match data.js → stack).
export const SHARDS = [
  { id: 'unity',   x: 6,  y: 4 },
  { id: 'node',    x: 13, y: -19 },
  { id: 'python',  x: 6,  y: -35 },
  { id: 'go',      x: 17, y: -59 },
  { id: 'docker',  x: 11, y: -97 },
  { id: 'sqlite',  x: 13, y: -109 },
  { id: 'blender', x: 5,  y: -123 },
];

export const TYPE_NAMES = ['air', ...Object.keys(BLOCKS)];

// --- noise --------------------------------------------------------
export function hash3(x, y, z, seed = 1337) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const key = (x, y, z) => `${x},${y},${z}`;

// --- sparse voxel world ---------------------------------------------
export class World {
  constructor() { this.map = new Map(); }

  get(x, y, z) { return this.map.get(key(x, y, z)) || null; }
  nameAt(x, y, z) { return this.get(x, y, z); }
  set(x, y, z, name) {
    if (name) this.map.set(key(x, y, z), name);
    else this.map.delete(key(x, y, z));
  }
  setIfEmpty(x, y, z, name) { if (!this.get(x, y, z)) this.set(x, y, z, name); }

  isOpaque(x, y, z) {
    const n = this.get(x, y, z);
    return !!n && BLOCKS[n].solid !== false;
  }

  isVisible(x, y, z) {
    return !this.isOpaque(x + 1, y, z) || !this.isOpaque(x - 1, y, z) ||
           !this.isOpaque(x, y + 1, z) || !this.isOpaque(x, y - 1, z) ||
           !this.isOpaque(x, y, z + 1) || !this.isOpaque(x, y, z - 1);
  }

  /** cb(name, x, y, z) for every block. */
  forEach(cb) {
    for (const [k, name] of this.map) {
      const [x, y, z] = k.split(',').map(Number);
      cb(name, x, y, z);
    }
  }

  get size() { return this.map.size; }

  // ---------- builders ----------------------------------------------
  /**
   * Floating island: flat-ish top at `top`, an upside-down dome below.
   * rx — half width, rz — half depth (towards camera), depth — max thickness.
   */
  island(cx, top, rx, depth, { rz = Math.min(3, Math.ceil(rx / 2)), seed = 1, block = 'end_stone', crust = null } = {}) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const tx = (x - cx) / (rx + 0.5);
      const ex = 1 - tx * tx;
      for (let z = -rz; z <= rz; z++) {
        const tz = z / (rz + 0.6);
        const e = ex * (1 - tz * tz);
        if (e <= 0.05 && hash3(x, 0, z, seed) < 0.6) continue;
        const thick = Math.max(1, Math.round(depth * Math.pow(Math.max(e, 0), 0.8) + (hash3(x, 1, z, seed) - 0.5) * 2.2));
        const bump = hash3(x, 2, z, seed) < 0.12 && e > 0.4 ? 1 : 0;
        for (let y = top - thick + 1; y <= top + bump; y++) {
          const deep = top - y;
          let b = block;
          if (crust && y >= top) b = crust;
          if (deep > 1 && hash3(x, y, z, seed + 9) < 0.035) b = 'obsidian';
          this.set(x, y, z, b);
        }
        // hanging amethyst under the thickest part
        if (e > 0.75 && hash3(x, 3, z, seed) < 0.07) {
          this.set(x, top - thick, z, 'amethyst');
          if (hash3(x, 4, z, seed) < 0.5) this.set(x, top - thick - 1, z, 'amethyst');
        }
      }
    }
  }

  chorus(x, y, z, h = 4, seed = 3) {
    let cx = x, cz = z;
    for (let i = 0; i < h; i++) {
      this.setIfEmpty(cx, y + i, cz, 'chorus');
      if (i > 0 && hash3(cx, y + i, cz, seed) < 0.35) {
        const dx = hash3(i, seed, 1) < 0.5 ? -1 : 1;
        this.setIfEmpty(cx + dx, y + i, cz, 'chorus');
        this.setIfEmpty(cx + dx, y + i + 1, cz, 'chorus_flower');
      }
    }
    this.setIfEmpty(cx, y + h, cz, 'chorus_flower');
  }

  pillar(x, y, z, h, block = 'obsidian') {
    for (let i = 0; i < h; i++) for (let dx = 0; dx < 2; dx++) this.set(x + dx, y + i, z, block);
    this.set(x, y + h, z, 'end_rod');
  }
}

// --- main world --------------------------------------------------
export function buildMainWorld() {
  const w = new World();

  // HOME — the avatar's island
  w.island(14, -6, 10, 7, { rz: 3, seed: 11 });
  w.chorus(20, -5, -1, 5, 4);
  w.chorus(7, -5, -2, 3, 5);
  w.set(17, -5, 1, 'end_rod');
  w.island(3, 8, 2, 2, { rz: 1, seed: 12 });
  w.island(-24, 9, 4, 3, { rz: 2, seed: 13 });

  // STACK — pillar island
  w.island(15, -32, 7, 6, { rz: 3, seed: 21 });
  w.pillar(17, -31, -1, 5);
  w.chorus(11, -31, 0, 3, 7);
  w.island(25, -21, 3, 2, { rz: 1, seed: 22 });
  w.island(-25, -30, 3, 3, { rz: 2, seed: 23 });

  // PROJECTS — workshop island under the crafting GUI
  w.island(0, -64, 18, 6, { rz: 3, seed: 31, crust: 'end_stone_bricks' });
  w.set(-2, -63, 0, 'crafting_table');
  w.set(-1, -63, -1, 'planks');
  w.set(2, -63, -1, 'bookshelf');
  w.chorus(-12, -63, -1, 4, 8);
  w.chorus(12, -63, 1, 3, 9);
  w.set(8, -63, 1, 'end_rod');
  w.island(-25, -44, 3, 2, { rz: 2, seed: 32 });
  w.island(24, -47, 3, 2, { rz: 1, seed: 33 });

  // PATH — four stepping islands under the journey cards
  [-21, -7, 7, 21].forEach((cx, i) => {
    w.island(cx, -91 + (i % 2), 4, 4, { rz: 2, seed: 41 + i });
    w.set(cx, -90 + (i % 2), 0, 'end_rod');
  });

  // ABOUT — library island
  w.island(15, -114, 8, 6, { rz: 3, seed: 51, crust: 'end_stone_bricks' });
  for (let x = 11; x <= 19; x++) {
    if (x === 15) continue;
    w.set(x, -113, -2, 'bookshelf');
    if (x % 2) w.set(x, -112, -2, 'bookshelf');
  }
  w.chorus(20, -113, 1, 3, 12);
  w.island(-24, -100, 3, 3, { rz: 2, seed: 52 });

  // PORTAL — the gateway platform (the arch itself is built in scene.js)
  w.island(PORTAL.x, -140, 10, 7, { rz: 3, seed: 61, crust: 'end_stone_bricks' });
  for (const x of [PORTAL.x - 7, PORTAL.x + 7]) for (let y = -139; y <= -135; y++) w.set(x, y, -1, 'purpur');
  w.set(PORTAL.x - 7, -134, -1, 'end_rod');
  w.set(PORTAL.x + 7, -134, -1, 'end_rod');
  w.island(-24, -126, 3, 2, { rz: 2, seed: 62 });

  // CONTACTS — the last rock
  w.island(16, -160, 6, 5, { rz: 2, seed: 71 });
  w.chorus(14, -159, 0, 4, 13);
  w.chorus(19, -159, -1, 2, 14);

  // scattered islets for rhythm
  for (let i = 0; i < 14; i++) {
    const y = 14 - i * 13 - Math.floor(hash3(i, 7, 7) * 6);
    const x = (i % 2 ? 1 : -1) * (26 + Math.floor(hash3(i, 8, 8) * 6));
    w.island(x, y, 1 + Math.floor(hash3(i, 9, 9) * 2), 2, { rz: 1, seed: 90 + i });
  }

  return w;
}

// --- far background layer (rendered darker, scrolls slower) -------
export function buildFarWorld() {
  const w = new World();
  for (let i = 0; i < 22; i++) {
    // keep the far layer at the edges so it never sits behind the text column
    const x = (i % 2 ? 1 : -1) * Math.round(20 + hash3(i, 1, 1, 5) * 26);
    const y = Math.round(18 - i * 4.4 - hash3(i, 2, 2, 5) * 4); // far layer scrolls at half speed
    const rx = 1 + Math.floor(hash3(i, 3, 3, 5) * 3);
    w.island(x, y, rx, 2 + Math.floor(rx * 0.7), { rz: 1, seed: 200 + i });
    if (hash3(i, 4, 4, 5) < 0.4) w.pillar(x, y + 1, 0, 3 + Math.floor(hash3(i, 5, 5, 5) * 5));
  }
  return w;
}

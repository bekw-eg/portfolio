// ============================================================
//  blocks.js — реестр типов блоков.
//
//  Каждый блок рендерится одним InstancedMesh (1 draw call на тип).
//  Текстуры граней берутся из textures.js по имени.
//
//  Как заменить блок на модель из Blender:
//    1. Экспортируй модель в .glb (1 блок = 1×1×1 м, центр в начале координат).
//    2. Положи файл в public/models/, например public/models/crafting_table.glb
//    3. Укажи путь в поле model:  crafting_table: { ..., model: '/models/crafting_table.glb' }
//  scene.js загрузит модель через GLTFLoader и подменит кубы на инстансы
//  первой найденной в файле сетки — позиции и анимации останутся прежними.
// ============================================================

/**
 * faces: { all } | { top, bottom, side, front? }
 * emissive: 0..1 — свечение (без источников света, дёшево)
 * alphaTest: для «дырявых» текстур (листва)
 * transparent / opacity: полупрозрачные (портал)
 * animated: текстура перерисовывается каждый кадр
 * solid: false — не скрывает соседей при отсечении невидимых граней
 * model: путь к .glb для замены куба
 */
export const BLOCKS = {
  grass:          { faces: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' } },
  dirt:           { faces: { all: 'dirt' } },
  gravel:         { faces: { all: 'gravel' } },
  stone:          { faces: { all: 'stone' } },
  cobble:         { faces: { all: 'cobble' } },
  deepslate:      { faces: { all: 'deepslate' } },
  coal_ore:       { faces: { all: 'coal_ore' } },
  iron_ore:       { faces: { all: 'iron_ore' } },
  gold_ore:       { faces: { all: 'gold_ore' } },
  emerald_ore:    { faces: { all: 'emerald_ore' } },
  diamond_ore:    { faces: { all: 'diamond_ore' }, emissive: 0.15 },
  redstone_ore:   { faces: { all: 'redstone_ore' }, emissive: 0.35 },
  redstone_block: { faces: { all: 'redstone_block' }, emissive: 0.25 },
  redstone_lamp:  { faces: { all: 'redstone_lamp' }, emissive: 0.9 },
  obsidian:       { faces: { all: 'obsidian' } },
  crying_obsidian:{ faces: { all: 'crying_obsidian' }, emissive: 0.2 },
  bedrock:        { faces: { all: 'bedrock' } },
  netherrack:     { faces: { all: 'netherrack' } },
  nether_bricks:  { faces: { all: 'nether_bricks' } },
  glowstone:      { faces: { all: 'glowstone' }, emissive: 0.9 },
  lava:           { faces: { all: 'lava' }, emissive: 1, scroll: true },
  log:            { faces: { top: 'log_top', bottom: 'log_top', side: 'log_side' } },
  leaves:         { faces: { all: 'leaves' }, alphaTest: 0.5, solid: false },
  planks:         { faces: { all: 'planks' } },
  crafting_table: {
    faces: { top: 'crafting_top', bottom: 'planks', side: 'crafting_side', front: 'crafting_front' },
    // model: '/models/crafting_table.glb',
  },
  portal:         { faces: { all: 'portal' }, transparent: true, opacity: 0.85, emissive: 1, animated: true, solid: false, thin: true },
};

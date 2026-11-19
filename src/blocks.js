// ============================================================
//  blocks.js — block type registry.
//
//  Every block type is rendered as one InstancedMesh (1 draw call per type).
//  Face textures are looked up by name in textures.js.
//
//  Swapping a block for a Blender model:
//    1. Export a .glb (1 block = 1×1×1 m, origin at the centre).
//    2. Put it into public/models/, e.g. public/models/crafting_table.glb
//    3. Add  model: 'models/crafting_table.glb'  to the block below.
//  scene.js loads it with GLTFLoader and replaces the cubes with instances
//  of the first mesh in the file — positions stay the same.
// ============================================================

/**
 * faces: { all } | { top, bottom, side, front? }
 * emissive: 0..1 — self-glow (cheap, no extra lights)
 * alphaTest: for textures with holes
 * transparent / opacity: translucent blocks
 * solid: false — does not hide neighbours when culling invisible blocks
 * thin: rendered as a thin pillar (end rods)
 * model: path to a .glb that replaces the cube
 */
export const BLOCKS = {
  end_stone:        { faces: { all: 'end_stone' } },
  end_stone_bricks: { faces: { all: 'end_stone_bricks' } },
  purpur:           { faces: { all: 'purpur' } },
  obsidian:         { faces: { all: 'obsidian' } },
  crying_obsidian:  { faces: { all: 'crying_obsidian' }, emissive: 0.25 },
  chorus:           { faces: { all: 'chorus' }, solid: false },
  chorus_flower:    { faces: { all: 'chorus_flower' }, emissive: 0.35, solid: false },
  amethyst:         { faces: { all: 'amethyst' }, emissive: 0.3 },
  end_rod:          { faces: { all: 'end_rod' }, emissive: 1, solid: false, thin: true },
  planks:           { faces: { all: 'planks' } },
  bookshelf:        { faces: { top: 'planks', bottom: 'planks', side: 'bookshelf' } },
  crafting_table: {
    faces: { top: 'crafting_top', bottom: 'planks', side: 'crafting_side', front: 'crafting_front' },
    // model: 'models/crafting_table.glb',
  },
  void_frame:       { faces: { all: 'void_frame' } },
};

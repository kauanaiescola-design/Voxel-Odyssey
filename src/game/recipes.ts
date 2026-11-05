/**
 * Voxel Realms - Crafting & Smelting Recipes
 */

import { CraftingRecipe, SmeltingRecipe } from '../types';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Basic inventory crafting (2x2)
  {
    id: 'wood_planks_from_log',
    resultId: 'wood_planks',
    resultCount: 4,
    category: 'blocks',
    requiresWorkbench: false,
    ingredients: [{ id: 'wood_log', count: 1 }],
  },
  {
    id: 'sticks_from_planks',
    resultId: 'stick',
    resultCount: 4,
    category: 'tools',
    requiresWorkbench: false,
    ingredients: [{ id: 'wood_planks', count: 2 }],
  },
  {
    id: 'workbench_recipe',
    resultId: 'workbench',
    resultCount: 1,
    category: 'blocks',
    requiresWorkbench: false,
    ingredients: [{ id: 'wood_planks', count: 4 }],
  },
  {
    id: 'torches_recipe',
    resultId: 'torch',
    resultCount: 4,
    category: 'tools',
    requiresWorkbench: false,
    ingredients: [
      { id: 'coal', count: 1 },
      { id: 'stick', count: 1 },
    ],
  },

  // Workbench recipes (Tools - Wood)
  {
    id: 'wooden_pickaxe_recipe',
    resultId: 'wooden_pickaxe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'wood_planks', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'wooden_axe_recipe',
    resultId: 'wooden_axe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'wood_planks', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'wooden_shovel_recipe',
    resultId: 'wooden_shovel',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'wood_planks', count: 1 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'wooden_sword_recipe',
    resultId: 'wooden_sword',
    resultCount: 1,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'wood_planks', count: 2 },
      { id: 'stick', count: 1 },
    ],
  },

  // Tools - Stone
  {
    id: 'stone_pickaxe_recipe',
    resultId: 'stone_pickaxe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'cobblestone', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'stone_axe_recipe',
    resultId: 'stone_axe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'cobblestone', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'stone_shovel_recipe',
    resultId: 'stone_shovel',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'cobblestone', count: 1 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'stone_sword_recipe',
    resultId: 'stone_sword',
    resultCount: 1,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'cobblestone', count: 2 },
      { id: 'stick', count: 1 },
    ],
  },

  // Tools - Iron
  {
    id: 'iron_pickaxe_recipe',
    resultId: 'iron_pickaxe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'iron_ingot', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'iron_axe_recipe',
    resultId: 'iron_axe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'iron_ingot', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'iron_shovel_recipe',
    resultId: 'iron_shovel',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'iron_ingot', count: 1 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'iron_sword_recipe',
    resultId: 'iron_sword',
    resultCount: 1,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'iron_ingot', count: 2 },
      { id: 'stick', count: 1 },
    ],
  },

  // Tools & Weapons - Crystal
  {
    id: 'crystal_pickaxe_recipe',
    resultId: 'crystal_pickaxe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'crystal_shard', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'crystal_axe_recipe',
    resultId: 'crystal_axe',
    resultCount: 1,
    category: 'tools',
    requiresWorkbench: true,
    ingredients: [
      { id: 'crystal_shard', count: 3 },
      { id: 'stick', count: 2 },
    ],
  },
  {
    id: 'crystal_sword_recipe',
    resultId: 'crystal_sword',
    resultCount: 1,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'crystal_shard', count: 2 },
      { id: 'stick', count: 1 },
    ],
  },

  // Ranged & Misc
  {
    id: 'bow_recipe',
    resultId: 'bow',
    resultCount: 1,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'stick', count: 3 },
      { id: 'string', count: 3 },
    ],
  },
  {
    id: 'arrow_recipe',
    resultId: 'arrow',
    resultCount: 4,
    category: 'weapons',
    requiresWorkbench: true,
    ingredients: [
      { id: 'stick', count: 1 },
      { id: 'cobblestone', count: 1 },
    ],
  },

  // Utility Blocks
  {
    id: 'furnace_recipe',
    resultId: 'furnace',
    resultCount: 1,
    category: 'blocks',
    requiresWorkbench: true,
    ingredients: [{ id: 'cobblestone', count: 8 }],
  },
  {
    id: 'chest_recipe',
    resultId: 'chest',
    resultCount: 1,
    category: 'blocks',
    requiresWorkbench: true,
    ingredients: [{ id: 'wood_planks', count: 8 }],
  },
  {
    id: 'bricks_block_recipe',
    resultId: 'bricks',
    resultCount: 1,
    category: 'blocks',
    requiresWorkbench: true,
    ingredients: [{ id: 'clay_ball', count: 4 }],
  },
  {
    id: 'carved_stone_recipe',
    resultId: 'carved_stone',
    resultCount: 2,
    category: 'blocks',
    requiresWorkbench: true,
    ingredients: [
      { id: 'stone', count: 2 },
      { id: 'copper_ingot', count: 1 },
    ],
  },
  {
    id: 'glowstone_recipe',
    resultId: 'glowstone',
    resultCount: 1,
    category: 'blocks',
    requiresWorkbench: true,
    ingredients: [
      { id: 'crystal_shard', count: 1 },
      { id: 'torch', count: 4 },
    ],
  },

  // Armor Pieces
  {
    id: 'iron_helmet_recipe',
    resultId: 'iron_helmet',
    resultCount: 1,
    category: 'armor',
    requiresWorkbench: true,
    ingredients: [{ id: 'iron_ingot', count: 5 }],
  },
  {
    id: 'iron_chestplate_recipe',
    resultId: 'iron_chestplate',
    resultCount: 1,
    category: 'armor',
    requiresWorkbench: true,
    ingredients: [{ id: 'iron_ingot', count: 8 }],
  },
  {
    id: 'iron_leggings_recipe',
    resultId: 'iron_leggings',
    resultCount: 1,
    category: 'armor',
    requiresWorkbench: true,
    ingredients: [{ id: 'iron_ingot', count: 7 }],
  },
  {
    id: 'iron_boots_recipe',
    resultId: 'iron_boots',
    resultCount: 1,
    category: 'armor',
    requiresWorkbench: true,
    ingredients: [{ id: 'iron_ingot', count: 4 }],
  },
  {
    id: 'crystal_chestplate_recipe',
    resultId: 'crystal_chestplate',
    resultCount: 1,
    category: 'armor',
    requiresWorkbench: true,
    ingredients: [
      { id: 'crystal_shard', count: 8 },
      { id: 'iron_chestplate', count: 1 },
    ],
  },
];

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: 'iron_ore', output: 'iron_ingot', smeltTime: 8 },
  { input: 'copper_ore', output: 'copper_ingot', smeltTime: 7 },
  { input: 'sand', output: 'glass', smeltTime: 5 },
  { input: 'cobblestone', output: 'stone', smeltTime: 5 },
  { input: 'raw_meat', output: 'cooked_meat', smeltTime: 6 },
  { input: 'clay_ball', output: 'bricks', smeltTime: 5 },
];

export const SMELTING_FUELS: Record<string, number> = {
  coal: 80,
  wood_log: 15,
  wood_planks: 12,
  stick: 5,
};

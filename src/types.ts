/**
 * Voxel Realms - Type Definitions
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  SAND = 5,
  GRAVEL = 6,
  WOOD_LOG = 7,
  LEAVES = 8,
  WOOD_PLANKS = 9,
  COAL_ORE = 10,
  IRON_ORE = 11,
  COPPER_ORE = 12,
  CRYSTAL_ORE = 13,
  SNOW = 14,
  ICE = 15,
  CLAY = 16,
  GLASS = 17,
  BRICKS = 18,
  CARVED_STONE = 19,
  GLOWSTONE = 20,
  TORCH = 21,
  WORKBENCH = 22,
  FURNACE = 23,
  CHEST = 24,
  WATER = 25,
}

export type ToolType = 'none' | 'pickaxe' | 'axe' | 'shovel' | 'sword';
export type ToolMaterial = 'hand' | 'wood' | 'stone' | 'iron' | 'crystal';

export interface BlockConfig {
  id: BlockType;
  name: string;
  hardness: number; // seconds to break with hand
  preferredTool: ToolType;
  minToolMaterial?: ToolMaterial;
  dropItemId: string;
  dropCount?: number;
  transparent?: boolean;
  solid: boolean;
  lightEmission?: number; // 0 to 15
  color: string; // fallback color
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  count: number;
  maxStack: number;
  blockId?: BlockType;
  toolType?: ToolType;
  toolMaterial?: ToolMaterial;
  durability?: number;
  maxDurability?: number;
  miningSpeed?: number;
  attackDamage?: number;
  foodValue?: number; // hunger points restored
  armorSlot?: 'helmet' | 'chestplate' | 'leggings' | 'boots';
  armorDefense?: number;
  iconColor: string;
}

export interface CraftingRecipe {
  id: string;
  resultId: string;
  resultCount: number;
  category: 'tools' | 'blocks' | 'weapons' | 'armor' | 'misc';
  requiresWorkbench: boolean;
  grid?: (string | null)[][]; // 2x2 or 3x3 pattern
  ingredients?: { id: string; count: number }[]; // shapeless
}

export interface SmeltingRecipe {
  input: string;
  output: string;
  smeltTime: number; // in seconds
}

export type BiomeType = 'plains' | 'forest' | 'mountains' | 'desert' | 'beach' | 'ocean' | 'snow';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  oxygen: number;
  maxOxygen: number;
  isDead: boolean;
  score: number;
}

export type MobType = 'gryllos' | 'luminis' | 'aqualis' | 'umbra_stalker' | 'chitin_crawler' | 'crystalline_golem';

export interface MobEntity {
  id: string;
  type: MobType;
  name: string;
  isHostile: boolean;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  targetPlayer: boolean;
  attackCooldown: number;
  hurtTime: number;
  width: number;
  height: number;
  drops: { itemId: string; min: number; max: number; chance: number }[];
}

export interface DroppedItemEntity {
  id: string;
  itemId: string;
  count: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  pickupCooldown: number;
}

export interface WorldSettings {
  seed: number;
  renderDistance: number; // chunk radius (3 to 6)
  daySpeed: number; // 1 = normal (~20 min cycle)
  soundVolume: number;
  gameMode: 'survival' | 'creative';
  fov: number;
}

/**
 * Voxel Realms - Procedural Texture Atlas Generator
 * Generates custom 16x16 pixel-art textures dynamically with organic variations.
 */

import * as THREE from 'three';
import { BlockType } from '../types';

export const ATLAS_TILE_SIZE = 16;
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;
export const ATLAS_WIDTH = ATLAS_COLS * ATLAS_TILE_SIZE; // 256
export const ATLAS_HEIGHT = ATLAS_ROWS * ATLAS_TILE_SIZE; // 256

export interface TileCoords {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

// Map of tile indices (col, row)
export enum TileId {
  GRASS_TOP = 0,
  GRASS_SIDE = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  SAND = 5,
  GRAVEL = 6,
  WOOD_LOG_SIDE = 7,
  WOOD_LOG_TOP = 8,
  WOOD_PLANKS = 9,
  LEAVES = 10,
  COAL_ORE = 11,
  IRON_ORE = 12,
  COPPER_ORE = 13,
  CRYSTAL_ORE = 14,
  SNOW = 15,

  // Row 1
  ICE = 16,
  CLAY = 17,
  GLASS = 18,
  BRICKS = 19,
  CARVED_STONE = 20,
  GLOWSTONE = 21,
  TORCH = 22,
  WORKBENCH_TOP = 23,
  WORKBENCH_SIDE = 24,
  FURNACE_FRONT = 25,
  FURNACE_SIDE = 26,
  CHEST_TOP = 27,
  CHEST_FRONT = 28,
  CHEST_SIDE = 29,
  WATER = 30,
  BEDROCK = 31,

  // Row 2: Tools & Items
  STICK = 32,
  COAL_ITEM = 33,
  IRON_INGOT = 34,
  COPPER_INGOT = 35,
  CRYSTAL_ITEM = 36,
  APPLE = 37,
  BREAD = 38,
  RAW_MEAT = 39,
  COOKED_MEAT = 40,
  WOOD_PICKAXE = 41,
  STONE_PICKAXE = 42,
  IRON_PICKAXE = 43,
  CRYSTAL_PICKAXE = 44,
  WOOD_SWORD = 45,
  STONE_SWORD = 46,
  IRON_SWORD = 47,

  // Row 3: More tools & armor
  CRYSTAL_SWORD = 48,
  WOOD_AXE = 49,
  STONE_AXE = 50,
  IRON_AXE = 51,
  WOOD_SHOVEL = 52,
  STONE_SHOVEL = 53,
  IRON_SHOVEL = 54,
  IRON_HELMET = 55,
  IRON_CHESTPLATE = 56,
  IRON_LEGGINGS = 57,
  IRON_BOOTS = 58,

  // Cracks & overlays
  CRACK_0 = 59,
  CRACK_1 = 60,
  CRACK_2 = 61,
  CRACK_3 = 62,
  CRACK_4 = 63,
}

// Pseudo-random helper seeded by coordinate
function hash(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

export class TextureManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public atlasTexture: THREE.CanvasTexture | null = null;
  public itemIcons: Map<string, string> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_WIDTH;
    this.canvas.height = ATLAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.generateAtlas();
  }

  private setPixel(tx: number, ty: number, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
    const px = tx * ATLAS_TILE_SIZE + x;
    const py = ty * ATLAS_TILE_SIZE + y;
    this.ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a / 255})`;
    this.ctx.fillRect(px, py, 1, 1);
  }

  private drawTile(tileId: TileId, drawFn: (x: number, y: number) => [number, number, number, number?]) {
    const tx = tileId % ATLAS_COLS;
    const ty = Math.floor(tileId / ATLAS_COLS);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const [r, g, b, a = 255] = drawFn(x, y);
        this.setPixel(tx, ty, x, y, r, g, b, a);
      }
    }
  }

  private generateAtlas() {
    // 1. GRASS TOP (Classic Minecraft Plains Grass: rich vibrant green with organic pixel noise)
    this.drawTile(TileId.GRASS_TOP, (x, y) => {
      const n = hash(x, y);
      const n2 = hash(x * 3.7, y * 3.7);
      // Classic Minecraft Plains palette: #598E30 to #82BD44
      let r = 95 + n * 35;
      let g = 155 + n * 40;
      let b = 45 + n * 25;
      if (n2 > 0.8) {
        // bright blade highlight
        r += 18; g += 22; b += 12;
      } else if (n2 < 0.2) {
        // shadow crevice
        r -= 20; g -= 24; b -= 12;
      }
      return [r, g, b];
    });

    // 2. GRASS SIDE (Classic Minecraft Dirt with iconic drooping grass fringe and shadow)
    this.drawTile(TileId.GRASS_SIDE, (x, y) => {
      // Characteristic Minecraft grass overhang fringe pattern
      const fringeMap = [3, 4, 3, 5, 4, 3, 2, 4, 5, 3, 2, 4, 3, 4, 5, 3];
      const fringe = fringeMap[x % 16];
      if (y < fringe) {
        // Grass overhang
        const n = hash(x, y);
        return [95 + n * 30, 155 + n * 35, 45 + n * 20];
      }
      if (y === fringe) {
        // Dark 1px shadow crease beneath hanging grass
        return [60, 38, 20];
      }
      // Rich Minecraft Dirt base (#866043)
      const n = hash(x, y);
      let r = 134 + (n - 0.5) * 36;
      let g = 96 + (n - 0.5) * 30;
      let b = 67 + (n - 0.5) * 22;
      if (n > 0.86) {
        // Pebble speck
        r += 28; g += 24; b += 18;
      }
      return [r, g, b];
    });

    // 3. DIRT (Classic rich earthy brown soil with subtle pebble grains)
    this.drawTile(TileId.DIRT, (x, y) => {
      const n = hash(x, y);
      let r = 134 + (n - 0.5) * 36;
      let g = 96 + (n - 0.5) * 30;
      let b = 67 + (n - 0.5) * 22;
      if (n > 0.86) {
        // Pebble grain
        r += 28; g += 24; b += 18;
      } else if (n < 0.14) {
        // Dark soil pocket
        r -= 24; g -= 20; b -= 16;
      }
      return [r, g, b];
    });

    // 4. STONE (Smooth natural Minecraft stone)
    this.drawTile(TileId.STONE, (x, y) => {
      const n = hash(x, y);
      const val = 125 + (n - 0.5) * 38;
      return [val - 1, val, val + 2];
    });

    // 5. COBBLESTONE (Iconic Minecraft cobblestone masonry with distinct stones & dark mortar)
    this.drawTile(TileId.COBBLESTONE, (x, y) => {
      const n = hash(x, y);
      // Classic irregular stone contours
      const isMortar =
        (x === 0 || x === 7 || x === 8 || x === 15) && (y % 4 === 0) ||
        (y === 0 || y === 8 || y === 15) ||
        (x % 8 === 4 && (y === 4 || y === 12));

      if (isMortar || n < 0.1) {
        // Deep dark mortar crack (#2E2E2E)
        return [46 + n * 15, 46 + n * 15, 48 + n * 15];
      }
      // Light stone centers with shading
      const isCenter = (x % 7 >= 2 && x % 7 <= 5) && (y % 8 >= 2 && y % 8 <= 6);
      const base = isCenter ? (136 + n * 30) : (108 + n * 26);
      return [base - 2, base, base + 3];
    });

    // 6. SAND (Golden warm beach sand with subtle wind ripples)
    this.drawTile(TileId.SAND, (x, y) => {
      const n = hash(x, y);
      const wave = Math.sin((x + y * 0.4) * 0.9) * 8;
      const r = 219 + wave + (n - 0.5) * 16;
      const g = 212 + wave * 0.9 + (n - 0.5) * 16;
      const b = 160 + wave * 0.7 + (n - 0.5) * 14;
      return [r, g, b];
    });

    // 7. GRAVEL (Coarse mix of stone, flint and dark pebbles)
    this.drawTile(TileId.GRAVEL, (x, y) => {
      const n = hash(x, y);
      const v = 118 + (n - 0.5) * 48;
      return [v + 2, v, v - 2];
    });

    // 8. WOOD LOG SIDE (Oak Tree Bark with deep vertical grain ridges)
    this.drawTile(TileId.WOOD_LOG_SIDE, (x, y) => {
      const n = hash(x, y);
      const isGroove = (x % 4 === 0 || (x + 2) % 4 === 0);
      if (isGroove) {
        return [72 + n * 18, 52 + n * 14, 28 + n * 10]; // dark furrow
      }
      return [112 + n * 24, 85 + n * 20, 50 + n * 14]; // raised bark
    });

    // 9. WOOD LOG TOP (Concentric heartwood growth rings with bark rim)
    this.drawTile(TileId.WOOD_LOG_TOP, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const n = hash(x, y);
      if (dist > 6.2) {
        return [72 + n * 18, 52 + n * 14, 28 + n * 10]; // bark border
      }
      const ring = Math.sin(dist * 1.8) * 16;
      const r = 168 + ring + n * 16;
      const g = 132 + ring * 0.8 + n * 14;
      const b = 82 + ring * 0.6 + n * 10;
      return [r, g, b];
    });

    // 10. WOOD PLANKS (Classic Minecraft Oak Planks: 4 horizontal planks with honey hue and seams)
    this.drawTile(TileId.WOOD_PLANKS, (x, y) => {
      const isSeam = (y % 4 === 0);
      if (isSeam) {
        return [96, 68, 36]; // dark divider line
      }
      const isNail = ((x === 2 || x === 13) && (y % 4 === 2));
      if (isNail) {
        return [68, 48, 24]; // nail hole
      }
      const n = hash(x, y);
      const grain = Math.sin(x * 1.2) * 6;
      const r = 184 + grain + (n - 0.5) * 22;
      const g = 148 + grain * 0.8 + (n - 0.5) * 18;
      const b = 95 + grain * 0.5 + (n - 0.5) * 14;
      return [r, g, b];
    });

    // 11. LEAVES (Oak Tree Leaves with rich dappled foliage & cutout transparency)
    this.drawTile(TileId.LEAVES, (x, y) => {
      const n = hash(x, y);
      if (n < 0.16) return [0, 0, 0, 0]; // translucent cutout hole
      const g = 120 + n * 55;
      const r = 55 + n * 30;
      const b = 32 + n * 20;
      return [r, g, b, 245];
    });

    // 12. COAL ORE (Dark obsidian specs embedded in stone)
    this.drawTile(TileId.COAL_ORE, (x, y) => {
      const isOre = ((x >= 3 && x <= 5 && y >= 3 && y <= 6) ||
                     (x >= 10 && x <= 13 && y >= 9 && y <= 12) ||
                     (x >= 8 && x <= 11 && y >= 3 && y <= 5));
      const n = hash(x, y);
      if (isOre) {
        return [30 + n * 20, 30 + n * 20, 35 + n * 20];
      }
      const base = 125 + n * 35;
      return [base - 2, base, base + 4];
    });

    // 13. IRON ORE (Tan and rust metallic streaks in stone)
    this.drawTile(TileId.IRON_ORE, (x, y) => {
      const isOre = ((x >= 4 && x <= 7 && y >= 4 && y <= 7) ||
                     (x >= 9 && x <= 13 && y >= 8 && y <= 11) ||
                     (x >= 2 && x <= 5 && y >= 11 && y <= 13));
      const n = hash(x, y);
      if (isOre) {
        return [200 + n * 30, 150 + n * 25, 115 + n * 20];
      }
      const base = 125 + n * 35;
      return [base - 2, base, base + 4];
    });

    // 14. COPPER ORE (Bronze and verdigris turquoise streaks in stone)
    this.drawTile(TileId.COPPER_ORE, (x, y) => {
      const isOre = ((x >= 3 && x <= 7 && y >= 2 && y <= 5) ||
                     (x >= 8 && x <= 12 && y >= 7 && y <= 10) ||
                     (x >= 4 && x <= 8 && y >= 11 && y <= 14));
      const n = hash(x, y);
      if (isOre) {
        if (n > 0.5) return [215 + n * 25, 110 + n * 20, 60 + n * 15]; // bronze
        return [70 + n * 30, 180 + n * 35, 150 + n * 30]; // verdigris turquoise
      }
      const base = 125 + n * 35;
      return [base - 2, base, base + 4];
    });

    // 15. CRYSTAL ORE (Deep stone with glowing violet and cyan gem facets)
    this.drawTile(TileId.CRYSTAL_ORE, (x, y) => {
      const isGem = ((x >= 4 && x <= 8 && y >= 3 && y <= 7) ||
                     (x >= 9 && x <= 13 && y >= 9 && y <= 13) ||
                     (x >= 2 && x <= 5 && y >= 10 && y <= 13));
      const n = hash(x, y);
      if (isGem) {
        const isHighlight = (x + y) % 3 === 0;
        if (isHighlight) return [240, 255, 255];
        return [140 + n * 50, 60 + n * 40, 255]; // luminous violet/magenta
      }
      const base = 90 + n * 25; // darker deep stone
      return [base, base, base + 8];
    });

    // 16. SNOW (Frosty clean crystalline powder)
    this.drawTile(TileId.SNOW, (x, y) => {
      const n = hash(x, y);
      const v = 240 + n * 15;
      return [v - 5, v, v + 5];
    });

    // 17. ICE (Pale cyan crystalline glass)
    this.drawTile(TileId.ICE, (x, y) => {
      const n = hash(x, y);
      const isCrack = (x === y || x === 15 - y) && n > 0.4;
      if (isCrack) return [230, 250, 255, 230];
      return [160 + n * 20, 210 + n * 25, 245, 200];
    });

    // 18. CLAY (Terracotta earth)
    this.drawTile(TileId.CLAY, (x, y) => {
      const n = hash(x, y);
      return [170 + n * 20, 130 + n * 15, 120 + n * 15];
    });

    // 19. GLASS (Clear glass with light frame and reflection gleam)
    this.drawTile(TileId.GLASS, (x, y) => {
      const isFrame = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isFrame) return [200, 230, 245, 220];
      const isGlint = (x >= 3 && x <= 5 && y >= 3 && y <= 5 && (x === y)) ||
                      (x >= 10 && x <= 12 && y >= 10 && y <= 12 && (x === y));
      if (isGlint) return [255, 255, 255, 180];
      return [180, 220, 240, 40]; // highly transparent
    });

    // 20. BRICKS (Staggered red clay masonry with white mortar)
    this.drawTile(TileId.BRICKS, (x, y) => {
      const row = Math.floor(y / 4);
      const isHorizMortar = y % 4 === 0;
      const offset = (row % 2) * 4;
      const isVertMortar = (x + offset) % 8 === 0;
      if (isHorizMortar || isVertMortar) return [215, 210, 200];
      const n = hash(x, y);
      return [165 + n * 30, 65 + n * 20, 50 + n * 15];
    });

    // 21. CARVED STONE (Chiseled ancient temple runes)
    this.drawTile(TileId.CARVED_STONE, (x, y) => {
      const isBorder = x === 1 || x === 14 || y === 1 || y === 14;
      const isRune = (x === 7 || y === 7 || (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 4));
      const n = hash(x, y);
      if (isBorder || isRune) {
        return [70 + n * 20, 75 + n * 20, 85 + n * 20];
      }
      const v = 135 + n * 30;
      return [v, v, v + 5];
    });

    // 22. GLOWSTONE (Golden incandescent luminescent crystal)
    this.drawTile(TileId.GLOWSTONE, (x, y) => {
      const n = hash(x, y);
      const r = 245 + n * 10;
      const g = 190 + n * 45;
      const b = 80 + n * 40;
      return [r, g, b];
    });

    // 23. TORCH (Flame tip + wooden handle)
    this.drawTile(TileId.TORCH, (x, y) => {
      if (x >= 6 && x <= 9) {
        if (y < 6) {
          // Flame
          if (y === 0) return [255, 240, 150];
          if (y < 3) return [255, 200, 50];
          return [240, 100, 20];
        }
        // Wood stick
        return [120, 80, 45];
      }
      return [0, 0, 0, 0];
    });

    // 24. WORKBENCH TOP (Grid blueprint with tools)
    this.drawTile(TileId.WORKBENCH_TOP, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isBorder) return [110, 75, 40];
      const isGrid = (x % 4 === 0 || y % 4 === 0);
      if (isGrid) return [140, 95, 55];
      const n = hash(x, y);
      return [195 + n * 20, 145 + n * 15, 95 + n * 10];
    });

    // 25. WORKBENCH SIDE (Wood planks with saw and wrench icons)
    this.drawTile(TileId.WORKBENCH_SIDE, (x, y) => {
      const isTool = (x === y && x >= 4 && x <= 11);
      if (isTool) return [210, 210, 215];
      const isSeam = y % 4 === 0;
      if (isSeam) return [95, 65, 35];
      const n = hash(x, y);
      return [175 + n * 25, 125 + n * 20, 80 + n * 12];
    });

    // 26. FURNACE FRONT (Cobblestone with glowing fire grate opening)
    this.drawTile(TileId.FURNACE_FRONT, (x, y) => {
      const isMouth = x >= 4 && x <= 11 && y >= 7 && y <= 13;
      if (isMouth) {
        if (y >= 10) return [255, 140 + hash(x, y) * 80, 20]; // glowing embers
        return [40, 30, 25]; // dark hearth interior
      }
      const n = hash(x, y);
      const v = 115 + n * 40;
      return [v, v, v + 4];
    });

    // 27. FURNACE SIDE (Cobblestone)
    this.drawTile(TileId.FURNACE_SIDE, (x, y) => {
      const n = hash(x, y);
      const v = 115 + n * 40;
      return [v, v, v + 4];
    });

    // 28. CHEST TOP (Wood plank lid with iron edge)
    this.drawTile(TileId.CHEST_TOP, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    // 29. CHEST FRONT (Wood with iron lock clasp)
    this.drawTile(TileId.CHEST_FRONT, (x, y) => {
      const isLock = x >= 7 && x <= 8 && y >= 6 && y <= 9;
      if (isLock) return [235, 210, 70]; // gold lock latch
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15 || y === 5);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    // 30. CHEST SIDE (Wood with iron corners)
    this.drawTile(TileId.CHEST_SIDE, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15 || y === 5);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    // 31. WATER (Flowing luminous translucent azure with foam crests)
    this.drawTile(TileId.WATER, (x, y) => {
      const wave = Math.sin((x * 0.6) + (y * 0.8)) * 25;
      const n = hash(x, y);
      return [30 + wave * 0.3, 110 + wave * 0.6 + n * 15, 230 + wave * 0.5, 175];
    });

    // 32. BEDROCK (Dark impenetrable stone)
    this.drawTile(TileId.BEDROCK, (x, y) => {
      const n = hash(x, y);
      const v = 30 + n * 30;
      return [v, v, v];
    });

    // 33. STICK (Diagonal wooden rod with wood grain)
    this.drawTile(TileId.STICK, (x, y) => {
      const isStick = (Math.abs(x - y) <= 1 && x >= 3 && x <= 12);
      if (!isStick) return [0, 0, 0, 0];
      const isHighlight = (x === y - 1);
      if (isHighlight) return [195, 145, 95];
      return [135, 95, 55];
    });

    // 34. COAL ITEM (Craggy black lump with shiny carbon glints)
    this.drawTile(TileId.COAL_ITEM, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5.5 + hash(x, y) * 2.0) return [0, 0, 0, 0];
      const n = hash(x, y);
      if (n > 0.82) return [120, 120, 130]; // carbon glint
      const v = 25 + n * 30;
      return [v, v, v + 4];
    });

    // 35. IRON INGOT (Metallic silver rounded ingot bar)
    this.drawTile(TileId.IRON_INGOT, (x, y) => {
      const inBar = (x >= 3 && x <= 12 && y >= 5 && y <= 10);
      if (!inBar) return [0, 0, 0, 0];
      if (y === 5 || x === 3) return [245, 245, 250]; // top highlight
      if (y === 10 || x === 12) return [130, 130, 140]; // shadow rim
      const n = hash(x, y);
      const v = 205 + n * 25;
      return [v, v, v + 5];
    });

    // 36. COPPER INGOT (Warm metallic orange-bronze bar)
    this.drawTile(TileId.COPPER_INGOT, (x, y) => {
      const inBar = (x >= 3 && x <= 12 && y >= 5 && y <= 10);
      if (!inBar) return [0, 0, 0, 0];
      if (y === 5 || x === 3) return [255, 185, 135];
      if (y === 10 || x === 12) return [165, 80, 45];
      const n = hash(x, y);
      return [220 + n * 25, 115 + n * 20, 70 + n * 15];
    });

    // 37. CRYSTAL ITEM (Brilliant luminous cyan gemstone)
    this.drawTile(TileId.CRYSTAL_ITEM, (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      if (dx + dy > 6.5) return [0, 0, 0, 0];
      if (x < 7 && y < 7) return [225, 255, 255]; // facet shine
      if (x >= 9 || y >= 9) return [20, 130, 170]; // deep shadow facet
      const n = hash(x, y);
      return [45 + n * 20, 215 + n * 25, 245];
    });

    // 38. APPLE (Vibrant ruby red fruit with green leaf and brown stem)
    this.drawTile(TileId.APPLE, (x, y) => {
      if (x === 7 && y === 2) return [120, 75, 40]; // stem
      if ((x === 8 || x === 9) && (y === 2 || y === 3)) return [70, 190, 50]; // leaf
      const dx = x - 7.5;
      const dy = y - 8.5;
      if (dx * dx + dy * dy > 22) return [0, 0, 0, 0];
      if (dx < -1 && dy < -1) return [255, 140, 130]; // gloss highlight
      const n = hash(x, y);
      return [215 + n * 30, 30 + n * 15, 30];
    });

    // 39. BREAD (Golden baked loaf with slash marks)
    this.drawTile(TileId.BREAD, (x, y) => {
      if (x < 2 || x > 13 || y < 5 || y > 10) return [0, 0, 0, 0];
      if ((x === 5 || x === 8 || x === 11) && y >= 6 && y <= 8) return [140, 80, 35]; // crust slashes
      if (y === 5) return [235, 175, 95];
      if (y === 10) return [130, 75, 30];
      const n = hash(x, y);
      return [200 + n * 35, 130 + n * 25, 60 + n * 20];
    });

    // 40. RAW MEAT (Tender reddish marbled steak)
    this.drawTile(TileId.RAW_MEAT, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      if (dx * dx + dy * dy * 1.5 > 25) return [0, 0, 0, 0];
      if (x === 4 && y === 7) return [240, 235, 225]; // bone joint
      const n = hash(x, y);
      if (n > 0.7) return [230, 180, 175]; // fat marbling
      return [185 + n * 30, 45 + n * 15, 55 + n * 15];
    });

    // 41. COOKED MEAT (Hearty roasted brown meat with seared grill marks)
    this.drawTile(TileId.COOKED_MEAT, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      if (dx * dx + dy * dy * 1.5 > 25) return [0, 0, 0, 0];
      if (x === 4 && y === 7) return [230, 220, 210];
      if ((x === 6 || x === 9) && y >= 5 && y <= 10) return [60, 30, 15]; // grill marks
      const n = hash(x, y);
      return [135 + n * 25, 65 + n * 20, 35 + n * 15];
    });

    // Helper to draw pickaxes
    const drawPickaxe = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        // Pickaxe head (curved top arc)
        const isHead = (y <= 5 && Math.abs(x + y - 11) <= 1 && x >= 2 && x <= 13) ||
                       (y === 2 && x >= 6 && x <= 13) ||
                       (x === 13 && y >= 2 && y <= 5);
        if (isHead) {
          if (y === 2 || x === 13) return headHighlight;
          return headColor;
        }
        // Handle (diagonal stick)
        if (Math.abs(x - y) <= 0 && x >= 3 && x <= 10) {
          return [130, 90, 50];
        }
        return [0, 0, 0, 0];
      });
    };

    drawPickaxe(TileId.WOOD_PICKAXE, [160, 110, 65], [200, 150, 95]);
    drawPickaxe(TileId.STONE_PICKAXE, [130, 130, 130], [175, 175, 175]);
    drawPickaxe(TileId.IRON_PICKAXE, [210, 210, 220], [250, 250, 255]);
    drawPickaxe(TileId.CRYSTAL_PICKAXE, [35, 195, 235], [160, 245, 255]);

    // Helper to draw swords
    const drawSword = (tileId: TileId, bladeColor: [number, number, number], bladeHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        // Pommel & handle
        if (x === 2 && y === 13) return [90, 60, 30]; // pommel
        if ((x === 3 && y === 12) || (x === 4 && y === 11)) return [120, 85, 45]; // handle
        // Crossguard
        if ((x === 3 && y === 10) || (x === 5 && y === 12) || (x === 4 && y === 10) || (x === 6 && y === 11)) {
          return [180, 150, 60]; // gold/brass guard
        }
        // Blade (diagonal towards top-right)
        if (x - y >= -1 && x - y <= 1 && x >= 5 && x <= 13 && y >= 2 && y <= 10) {
          if (x - y === 1 || x === 13 || y === 2) return bladeHighlight;
          return bladeColor;
        }
        return [0, 0, 0, 0];
      });
    };

    drawSword(TileId.WOOD_SWORD, [160, 115, 70], [205, 155, 105]);
    drawSword(TileId.STONE_SWORD, [130, 130, 135], [180, 180, 185]);
    drawSword(TileId.IRON_SWORD, [215, 215, 225], [255, 255, 255]);
    drawSword(TileId.CRYSTAL_SWORD, [40, 205, 245], [180, 250, 255]);

    // Helper to draw axes
    const drawAxe = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        // Axe head (wedge on top-left of stick)
        if (x >= 4 && x <= 8 && y >= 2 && y <= 7) {
          if (y === 2 || x === 4) return headHighlight;
          return headColor;
        }
        // Handle
        if (Math.abs(x - y) <= 0 && x >= 4 && x <= 12) {
          return [130, 90, 50];
        }
        return [0, 0, 0, 0];
      });
    };

    drawAxe(TileId.WOOD_AXE, [160, 115, 70], [205, 155, 105]);
    drawAxe(TileId.STONE_AXE, [130, 130, 135], [180, 180, 185]);
    drawAxe(TileId.IRON_AXE, [215, 215, 225], [255, 255, 255]);

    // Helper to draw shovels
    const drawShovel = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        // Shovel scoop
        if (x >= 10 && x <= 13 && y >= 2 && y <= 5) {
          if (y === 2 || x === 13) return headHighlight;
          return headColor;
        }
        // Handle
        if (Math.abs(x - y) <= 0 && x >= 2 && x <= 10) {
          return [130, 90, 50];
        }
        return [0, 0, 0, 0];
      });
    };

    drawShovel(TileId.WOOD_SHOVEL, [160, 115, 70], [205, 155, 105]);
    drawShovel(TileId.STONE_SHOVEL, [130, 130, 135], [180, 180, 185]);
    drawShovel(TileId.IRON_SHOVEL, [215, 215, 225], [255, 255, 255]);

    // Iron Helmet
    this.drawTile(TileId.IRON_HELMET, (x, y) => {
      if (x >= 4 && x <= 11 && y >= 3 && y <= 9) {
        if (x >= 6 && x <= 9 && y >= 7 && y <= 9) return [0, 0, 0, 0]; // eye slit
        if (y === 3 || x === 4) return [250, 250, 255];
        return [200, 200, 210];
      }
      return [0, 0, 0, 0];
    });

    // Iron Chestplate
    this.drawTile(TileId.IRON_CHESTPLATE, (x, y) => {
      if (x >= 3 && x <= 12 && y >= 3 && y <= 11) {
        if (x >= 6 && x <= 9 && y === 3) return [0, 0, 0, 0]; // neck opening
        if (y === 3 || x === 3) return [250, 250, 255];
        return [200, 200, 210];
      }
      return [0, 0, 0, 0];
    });

    // Iron Leggings
    this.drawTile(TileId.IRON_LEGGINGS, (x, y) => {
      if (x >= 4 && x <= 11 && y >= 3 && y <= 12) {
        if (x >= 7 && x <= 8 && y >= 6 && y <= 12) return [0, 0, 0, 0]; // split between legs
        if (y === 3 || x === 4) return [250, 250, 255];
        return [195, 195, 205];
      }
      return [0, 0, 0, 0];
    });

    // Iron Boots
    this.drawTile(TileId.IRON_BOOTS, (x, y) => {
      if ((x >= 3 && x <= 6 && y >= 7 && y <= 12) || (x >= 9 && x <= 12 && y >= 7 && y <= 12)) {
        if (y === 7 || x === 3 || x === 9) return [250, 250, 255];
        return [190, 190, 200];
      }
      return [0, 0, 0, 0];
    });

    // Create Three.js Texture
    this.atlasTexture = new THREE.CanvasTexture(this.canvas);
    this.atlasTexture.magFilter = THREE.NearestFilter;
    this.atlasTexture.minFilter = THREE.NearestFilter;
    this.atlasTexture.generateMipmaps = false;
    this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
  }

  // Calculate UV coordinates for a tile index [u0, v0, u1, v1]
  public getTileUV(tileId: TileId): TileCoords {
    const col = tileId % ATLAS_COLS;
    const row = Math.floor(tileId / ATLAS_COLS);

    const u0 = col / ATLAS_COLS;
    const u1 = (col + 1) / ATLAS_COLS;
    // In Three.js UV space, v=0 is at bottom, v=1 is at top
    const v1 = 1 - row / ATLAS_ROWS;
    const v0 = 1 - (row + 1) / ATLAS_ROWS;

    return { u0, v0, u1, v1 };
  }

  // Get tile UV for specific block face
  // faceIndex: 0 = +X (right), 1 = -X (left), 2 = +Y (top), 3 = -Y (bottom), 4 = +Z (front), 5 = -Z (back)
  public getBlockFaceTile(block: BlockType, faceIndex: number): TileId {
    switch (block) {
      case BlockType.GRASS:
        if (faceIndex === 2) return TileId.GRASS_TOP;
        if (faceIndex === 3) return TileId.DIRT;
        return TileId.GRASS_SIDE;
      case BlockType.DIRT:
        return TileId.DIRT;
      case BlockType.STONE:
        return TileId.STONE;
      case BlockType.COBBLESTONE:
        return TileId.COBBLESTONE;
      case BlockType.SAND:
        return TileId.SAND;
      case BlockType.GRAVEL:
        return TileId.GRAVEL;
      case BlockType.WOOD_LOG:
        if (faceIndex === 2 || faceIndex === 3) return TileId.WOOD_LOG_TOP;
        return TileId.WOOD_LOG_SIDE;
      case BlockType.LEAVES:
        return TileId.LEAVES;
      case BlockType.WOOD_PLANKS:
        return TileId.WOOD_PLANKS;
      case BlockType.COAL_ORE:
        return TileId.COAL_ORE;
      case BlockType.IRON_ORE:
        return TileId.IRON_ORE;
      case BlockType.COPPER_ORE:
        return TileId.COPPER_ORE;
      case BlockType.CRYSTAL_ORE:
        return TileId.CRYSTAL_ORE;
      case BlockType.SNOW:
        return TileId.SNOW;
      case BlockType.ICE:
        return TileId.ICE;
      case BlockType.CLAY:
        return TileId.CLAY;
      case BlockType.GLASS:
        return TileId.GLASS;
      case BlockType.BRICKS:
        return TileId.BRICKS;
      case BlockType.CARVED_STONE:
        return TileId.CARVED_STONE;
      case BlockType.GLOWSTONE:
        return TileId.GLOWSTONE;
      case BlockType.TORCH:
        return TileId.TORCH;
      case BlockType.WORKBENCH:
        if (faceIndex === 2) return TileId.WORKBENCH_TOP;
        if (faceIndex === 3) return TileId.WOOD_PLANKS;
        return TileId.WORKBENCH_SIDE;
      case BlockType.FURNACE:
        if (faceIndex === 4) return TileId.FURNACE_FRONT;
        if (faceIndex === 2 || faceIndex === 3) return TileId.COBBLESTONE;
        return TileId.FURNACE_SIDE;
      case BlockType.CHEST:
        if (faceIndex === 2) return TileId.CHEST_TOP;
        if (faceIndex === 4) return TileId.CHEST_FRONT;
        return TileId.CHEST_SIDE;
      case BlockType.WATER:
        return TileId.WATER;
      default:
        return TileId.STONE;
    }
  }

  // Get TileId for any item ID or block type
  public getItemTileId(itemId: string, blockType?: BlockType): TileId | null {
    if (blockType !== undefined && blockType !== null) {
      return this.getBlockFaceTile(blockType, 2); // default to top/front tile
    }

    switch (itemId) {
      case 'stick': return TileId.STICK;
      case 'coal': return TileId.COAL_ITEM;
      case 'iron_ingot': return TileId.IRON_INGOT;
      case 'copper_ingot': return TileId.COPPER_INGOT;
      case 'crystal_shard': return TileId.CRYSTAL_ITEM;
      case 'apple': return TileId.APPLE;
      case 'bread': return TileId.BREAD;
      case 'raw_meat': return TileId.RAW_MEAT;
      case 'cooked_meat': return TileId.COOKED_MEAT;
      case 'wood_pickaxe': return TileId.WOOD_PICKAXE;
      case 'stone_pickaxe': return TileId.STONE_PICKAXE;
      case 'iron_pickaxe': return TileId.IRON_PICKAXE;
      case 'crystal_pickaxe': return TileId.CRYSTAL_PICKAXE;
      case 'wood_sword': return TileId.WOOD_SWORD;
      case 'stone_sword': return TileId.STONE_SWORD;
      case 'iron_sword': return TileId.IRON_SWORD;
      case 'crystal_sword': return TileId.CRYSTAL_SWORD;
      case 'wood_axe': return TileId.WOOD_AXE;
      case 'stone_axe': return TileId.STONE_AXE;
      case 'iron_axe': return TileId.IRON_AXE;
      case 'wood_shovel': return TileId.WOOD_SHOVEL;
      case 'stone_shovel': return TileId.STONE_SHOVEL;
      case 'iron_shovel': return TileId.IRON_SHOVEL;
      case 'iron_helmet': return TileId.IRON_HELMET;
      case 'iron_chestplate': return TileId.IRON_CHESTPLATE;
      case 'iron_leggings': return TileId.IRON_LEGGINGS;
      case 'iron_boots': return TileId.IRON_BOOTS;
      case 'torch': return TileId.TORCH;
      default: return null;
    }
  }

  // Get data URL for an item preview icon
  public getTileDataURL(tileId: TileId): string {
    const cached = this.itemIcons.get(tileId.toString());
    if (cached) return cached;

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 32;
    iconCanvas.height = 32;
    const ctx = iconCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const tx = tileId % ATLAS_COLS;
    const ty = Math.floor(tileId / ATLAS_COLS);

    ctx.drawImage(
      this.canvas,
      tx * ATLAS_TILE_SIZE,
      ty * ATLAS_TILE_SIZE,
      ATLAS_TILE_SIZE,
      ATLAS_TILE_SIZE,
      0,
      0,
      32,
      32
    );

    const dataUrl = iconCanvas.toDataURL();
    this.itemIcons.set(tileId.toString(), dataUrl);
    return dataUrl;
  }

  // Convenience helper to get icon directly from itemId and optional blockType
  public getItemIconDataURL(itemId: string, blockType?: BlockType): string | null {
    const tileId = this.getItemTileId(itemId, blockType);
    if (tileId !== null) {
      return this.getTileDataURL(tileId);
    }
    return null;
  }

  // Generate an individual isolated Three.js canvas texture for a specific tile
  public createTileCanvasTexture(tileId: TileId): THREE.CanvasTexture {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = ATLAS_TILE_SIZE;
    tileCanvas.height = ATLAS_TILE_SIZE;
    const ctx = tileCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const tx = tileId % ATLAS_COLS;
    const ty = Math.floor(tileId / ATLAS_COLS);

    ctx.drawImage(
      this.canvas,
      tx * ATLAS_TILE_SIZE,
      ty * ATLAS_TILE_SIZE,
      ATLAS_TILE_SIZE,
      ATLAS_TILE_SIZE,
      0,
      0,
      ATLAS_TILE_SIZE,
      ATLAS_TILE_SIZE
    );

    const texture = new THREE.CanvasTexture(tileCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}

export const textureManager = new TextureManager();

/**
 * Voxel Realms - Authentic Minecraft Java Edition 1.10 Texture Atlas Generator
 * Strict 16x16 pixel-art vanilla textures, nearest-neighbor sampling,
 * classic 2016 color palettes, and animated flowing water.
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

// Map of tile indices (col, row) in the 16x16 tile atlas
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

// Deterministic 2D PRNG hash
function hash(x: number, y: number, seed: number = 0): number {
  const n = Math.sin((x + seed * 13.1) * 12.9898 + (y + seed * 7.7) * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

// Helper to blend two RGB colors
function blend(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

export class TextureManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public atlasTexture: THREE.CanvasTexture | null = null;
  public itemIcons: Map<string, string> = new Map();

  // Water animation state
  private waterTimer: number = 0;
  private waterFrame: number = 0;

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

  // Draw animated water frame
  public drawAnimatedWater(frame: number) {
    const tx = TileId.WATER % ATLAS_COLS;
    const ty = Math.floor(TileId.WATER / ATLAS_COLS);

    // Minecraft 1.10 water colors:
    // Base: #2E58C4 (46, 88, 196)
    // Lighter ripple: #3F76E4 (63, 118, 228)
    // Crest highlights: #5C8EFF (92, 142, 255)
    // Deep trough: #20409A (32, 64, 154)
    const t = frame * (Math.PI * 2 / 16);

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wave1 = Math.sin(x * 0.45 + t + y * 0.35);
        const wave2 = Math.cos(x * 0.35 - t * 1.2 + y * 0.55);
        const ripple = (wave1 + wave2) * 0.5;
        const n = hash(x, y, frame) * 0.15;

        let r = 44 + (ripple + n) * 20;
        let g = 86 + (ripple + n) * 36;
        let b = 196 + (ripple + n) * 38;
        let a = 185;

        // Crest shimmer
        if (ripple > 0.65) {
          r += 24;
          g += 30;
          b += 22;
        } else if (ripple < -0.6) {
          r -= 14;
          g -= 18;
          b -= 28;
        }

        this.setPixel(tx, ty, x, y, r, g, b, a);
      }
    }
  }

  // Animation update tick called from engine loop
  public update(dt: number) {
    this.waterTimer += dt;
    // Minecraft animated textures tick at ~14-16 fps (every 0.07s)
    if (this.waterTimer >= 0.07) {
      this.waterTimer = 0;
      this.waterFrame = (this.waterFrame + 1) % 16;
      this.drawAnimatedWater(this.waterFrame);
      if (this.atlasTexture) {
        this.atlasTexture.needsUpdate = true;
      }
    }
  }

  private generateAtlas() {
    // =========================================================================
    // 1. GRASS TOP (Minecraft 1.10 Classic Plains Grass: #79C05A / #91BD59)
    // =========================================================================
    this.drawTile(TileId.GRASS_TOP, (x, y) => {
      const n = hash(x, y, 1);
      const n2 = hash(x * 2.3, y * 2.3, 2);

      // Vanilla 1.10 Plains palette:
      // Primary: #79C05A (121, 192, 90)
      // Light highlight: #91BD59 (145, 189, 89)
      // Shadow / crevice: #659C45 (101, 156, 69)
      // Deep shadow: #57863A (87, 134, 58)
      let r: number, g: number, b: number;
      if (n > 0.72) {
        // Bright grass blade highlight (#91BD59)
        r = 145 + n2 * 10;
        g = 189 + n2 * 12;
        b = 89 + n2 * 10;
      } else if (n > 0.35) {
        // Core plains grass (#79C05A)
        r = 121 + (n - 0.5) * 16;
        g = 192 + (n - 0.5) * 18;
        b = 90 + (n - 0.5) * 14;
      } else if (n > 0.12) {
        // Shaded blade (#659C45)
        r = 101 + n2 * 8;
        g = 156 + n2 * 12;
        b = 69 + n2 * 8;
      } else {
        // Deep crevice (#57863A)
        r = 87 + n2 * 6;
        g = 134 + n2 * 8;
        b = 58 + n2 * 6;
      }

      return [r, g, b];
    });

    // =========================================================================
    // 2. GRASS SIDE (Classic 1.10 Dirt base with iconic hanging grass fringe)
    // =========================================================================
    this.drawTile(TileId.GRASS_SIDE, (x, y) => {
      // Classic Minecraft 1.10 grass overhang pattern (depth per column)
      const fringeMap = [3, 4, 3, 5, 4, 3, 2, 4, 5, 3, 2, 4, 3, 4, 5, 3];
      const fringe = fringeMap[x % 16];

      if (y < fringe) {
        // Grass overhang in classic 1.10 plains palette
        const n = hash(x, y, 3);
        if (y === fringe - 1 && n > 0.4) {
          // Tip of blade slight shade
          return [108, 172, 78];
        }
        return [121 + n * 24, 192 + n * 15, 90 + n * 12];
      }

      if (y === fringe) {
        // 1-pixel dark crevice shadow line (#563C26) beneath the grass fringe
        return [86, 60, 38];
      }

      // Classic 1.10 Dirt (#866043 / #8B6B4A)
      const n = hash(x, y, 4);
      let r: number, g: number, b: number;
      if (n > 0.88) {
        // Light pebble speckle (#9F7954)
        r = 159; g = 121; b = 84;
      } else if (n > 0.5) {
        // Warm mid-tone (#8B6B4A)
        r = 139 + (n - 0.7) * 14;
        g = 107 + (n - 0.7) * 12;
        b = 74 + (n - 0.7) * 8;
      } else if (n > 0.15) {
        // Core medium brown (#866043)
        r = 134 + (n - 0.3) * 12;
        g = 96 + (n - 0.3) * 10;
        b = 67 + (n - 0.3) * 8;
      } else {
        // Dark soil pocket (#684931)
        r = 104; g = 73; b = 49;
      }

      return [r, g, b];
    });

    // =========================================================================
    // 3. DIRT (Classic Minecraft 1.10 Soil: #866043 / #8B6B4A with granular noise)
    // =========================================================================
    this.drawTile(TileId.DIRT, (x, y) => {
      const n = hash(x, y, 5);
      const n2 = hash(x * 1.7, y * 1.7, 6);

      if (n > 0.90) {
        // Light pebble accent (#A6805B)
        return [166, 128, 91];
      }
      if (n > 0.75) {
        // Soft pebble (#9A7552)
        return [154, 117, 82];
      }
      if (n > 0.40) {
        // Warm brown (#8B6B4A)
        const v = (n - 0.5) * 10;
        return [139 + v, 107 + v, 74 + v];
      }
      if (n > 0.15) {
        // Classic brown (#866043)
        const v = (n - 0.25) * 10;
        return [134 + v, 96 + v, 67 + v];
      }
      // Dark soil crevice (#684931 / #583D29)
      return [104 - n2 * 12, 73 - n2 * 10, 49 - n2 * 8];
    });

    // =========================================================================
    // 4. STONE (Classic 1.10 Neutral Gray Stone: #7D7D7D with granular specks)
    // =========================================================================
    this.drawTile(TileId.STONE, (x, y) => {
      const n = hash(x, y, 7);
      const n2 = hash(x * 3.1, y * 3.1, 8);

      // Vanilla stone: #7D7D7D (125, 125, 125)
      let val = 125;
      if (n > 0.85) {
        // Lighter flecks (#999999)
        val = 153 + n2 * 8;
      } else if (n > 0.65) {
        // Subtle light flecks (#8C8C8C)
        val = 140 + n2 * 6;
      } else if (n < 0.15) {
        // Dark flecks (#5E5E5E)
        val = 94 - n2 * 8;
      } else if (n < 0.35) {
        // Mid-dark speckle (#6C6C6C)
        val = 108 + n2 * 6;
      } else {
        val = 125 + (n - 0.5) * 14;
      }

      return [val - 1, val, val + 2];
    });

    // =========================================================================
    // 5. COBBLESTONE (Iconic 1.10 Cobblestone: irregular stones & dark mortar)
    // =========================================================================
    this.drawTile(TileId.COBBLESTONE, (x, y) => {
      const n = hash(x, y, 9);

      // Authentic cobblestone layout with distinct stone shapes and mortar seams
      // Mortar seams at y=0, y=7, y=8, y=15 and staggered vertical seams
      const isMortar =
        (y === 0 || y === 7 || y === 8 || y === 15) ||
        (y < 7 && (x === 0 || x === 7 || x === 8 || x === 15)) ||
        (y > 8 && y < 15 && (x === 3 || x === 4 || x === 11 || x === 12)) ||
        ((x === 4 || x === 12) && (y === 3 || y === 11));

      if (isMortar) {
        // Dark mortar seams (#3E3E3E to #4D4D4D)
        const v = 58 + n * 18;
        return [v - 1, v, v + 2];
      }

      // Stone highlight centers vs darker edges
      const isCenter = (x % 7 >= 2 && x % 7 <= 5) && (y % 7 >= 2 && y % 7 <= 5);
      if (isCenter) {
        // Rounded lighter stone center (#8C8C8C to #A2A2A2)
        const v = 142 + n * 24;
        return [v - 2, v, v + 2];
      }

      // Stone border / side shading (#6D6D6D)
      const v = 108 + n * 22;
      return [v - 1, v, v + 2];
    });

    // =========================================================================
    // 6. SAND (Classic 1.10 Beach Sand: #DBCFA3 warm yellow-tan with fine grain)
    // =========================================================================
    this.drawTile(TileId.SAND, (x, y) => {
      const n = hash(x, y, 10);
      const n2 = hash(x * 2.1, y * 2.1, 11);

      // Base: #DBCFA3 (219, 207, 163)
      // Variations: #E3D9AF, #CEC094, #C5B684
      let r = 219 + (n - 0.5) * 18;
      let g = 207 + (n - 0.5) * 16;
      let b = 163 + (n - 0.5) * 14;

      if (n2 > 0.82) {
        // Light grain highlight
        r += 12; g += 11; b += 8;
      } else if (n2 < 0.18) {
        // Darker grain shade
        r -= 14; g -= 14; b -= 12;
      }

      return [r, g, b];
    });

    // =========================================================================
    // 7. GRAVEL (Coarse mix of stone, dark flint and pebble speckles)
    // =========================================================================
    this.drawTile(TileId.GRAVEL, (x, y) => {
      const n = hash(x, y, 12);
      const n2 = hash(x * 3.3, y * 3.3, 13);

      if (n > 0.88) {
        // Dark flint speckle (#524D4D)
        return [82 + n2 * 10, 77 + n2 * 10, 77 + n2 * 10];
      }
      if (n < 0.14) {
        // Light stone pebble (#9E9995)
        return [158 + n2 * 10, 153 + n2 * 10, 149 + n2 * 10];
      }
      const v = 120 + (n - 0.5) * 36;
      return [v + 2, v, v - 2];
    });

    // =========================================================================
    // 8. WOOD LOG SIDE (Oak Log Bark: vertical ridges, dark furrows, raised bark)
    // =========================================================================
    this.drawTile(TileId.WOOD_LOG_SIDE, (x, y) => {
      const n = hash(x, y, 14);

      // Vertical bark furrows at cols 0, 4, 8, 12 with natural variance
      const colMod = x % 4;
      const isFurrow = colMod === 0 || ((x + y) % 7 === 0);

      if (isFurrow) {
        // Dark furrow (#44311B / #362614)
        const r = 64 + n * 14;
        const g = 46 + n * 10;
        const b = 25 + n * 6;
        return [r, g, b];
      }

      if (colMod === 2) {
        // Raised bark ridge highlight (#8C6737 / #9A723D)
        const r = 142 + n * 20;
        const g = 104 + n * 16;
        const b = 58 + n * 10;
        return [r, g, b];
      }

      // Mid bark body (#6B4E2B / #7A5930)
      const r = 110 + n * 18;
      const g = 80 + n * 14;
      const b = 44 + n * 8;
      return [r, g, b];
    });

    // =========================================================================
    // 9. WOOD LOG TOP (Oak Log End: outer bark rim and concentric growth rings)
    // =========================================================================
    this.drawTile(TileId.WOOD_LOG_TOP, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const n = hash(x, y, 15);

      // Outer 2px bark rim
      if (dist >= 6.3) {
        const r = 62 + n * 16;
        const g = 44 + n * 12;
        const b = 24 + n * 8;
        return [r, g, b];
      }

      // Concentric rings in heartwood
      const ring = Math.sin(dist * 2.2) * 18;
      // Core 1.10 oak top palette: #B18953 / #C1995E
      const r = 178 + ring + (n - 0.5) * 14;
      const g = 140 + ring * 0.8 + (n - 0.5) * 12;
      const b = 88 + ring * 0.6 + (n - 0.5) * 8;
      return [r, g, b];
    });

    // =========================================================================
    // 10. WOOD PLANKS (Classic 1.10 Oak Planks: 4 horizontal planks, seams, nails)
    // =========================================================================
    this.drawTile(TileId.WOOD_PLANKS, (x, y) => {
      const plankIndex = Math.floor(y / 4);
      const localY = y % 4;

      // Dark horizontal dividing seam (1px at top of each 4px plank)
      if (localY === 0) {
        return [110, 80, 43]; // #6E502B
      }

      // Vertical board dividing joints (staggered per plank row)
      const jointCols = [7, 13, 4, 10];
      const isJoint = x === jointCols[plankIndex];
      if (isJoint) {
        return [96, 68, 36];
      }

      // Tiny nail accents near joints
      const isNail = (x === (jointCols[plankIndex] + 2) % 16) && localY === 2;
      if (isNail) {
        return [76, 54, 28];
      }

      // Honey-tan oak plank body (#C29D62 / #B88E4B)
      const n = hash(x, y, 16);
      const grain = Math.sin(x * 1.4) * 6;
      let r = 188 + grain + (n - 0.5) * 16;
      let g = 152 + grain * 0.8 + (n - 0.5) * 14;
      let b = 96 + grain * 0.6 + (n - 0.5) * 10;

      // Plank bottom bevel highlight
      if (localY === 3) {
        r += 10; g += 9; b += 6;
      }

      return [r, g, b];
    });

    // =========================================================================
    // 11. LEAVES (Classic 1.10 Oak Leaves: dense dark green #3F7F3F, cutout holes)
    // =========================================================================
    this.drawTile(TileId.LEAVES, (x, y) => {
      const n = hash(x, y, 17);

      // Vanilla 1.10 "Fancy" cutout transparency (~16% transparent pixels)
      if (n < 0.16) {
        return [0, 0, 0, 0];
      }

      // Classic 1.10 oak leaves palette:
      // Dark: #2D5824 (45, 88, 36)
      // Core: #3F7F3F (63, 127, 63)
      // Mid: #4C7A3F (76, 122, 63)
      // Highlight: #5C954B (92, 149, 75)
      if (n > 0.78) {
        return [92, 149, 75, 255]; // Leaf highlight
      } else if (n > 0.45) {
        return [76, 122, 63, 255]; // Mid green
      } else if (n > 0.28) {
        return [63, 127, 63, 255]; // Core green
      } else {
        return [45, 88, 36, 255]; // Deep shadow green
      }
    });

    // =========================================================================
    // 12. COAL ORE (Dark pitch-black coal flecks in classic stone)
    // =========================================================================
    this.drawTile(TileId.COAL_ORE, (x, y) => {
      const isOre =
        (x >= 3 && x <= 6 && y >= 3 && y <= 6) ||
        (x >= 10 && x <= 13 && y >= 9 && y <= 12) ||
        (x >= 8 && x <= 11 && y >= 3 && y <= 5) ||
        (x >= 2 && x <= 4 && y >= 11 && y <= 13);

      const n = hash(x, y, 18);

      if (isOre) {
        // Pitch black coal lumps (#1A1A1A to #333333) with shiny carbon glint
        if (n > 0.8) return [74, 74, 80];
        const v = 26 + n * 18;
        return [v, v, v + 2];
      }

      // Classic Stone background
      const val = 125 + (n - 0.5) * 28;
      return [val - 1, val, val + 2];
    });

    // =========================================================================
    // 13. IRON ORE (Tan-peach metallic ore specks in classic stone)
    // =========================================================================
    this.drawTile(TileId.IRON_ORE, (x, y) => {
      const isOre =
        (x >= 4 && x <= 7 && y >= 4 && y <= 7) ||
        (x >= 9 && x <= 13 && y >= 8 && y <= 11) ||
        (x >= 2 && x <= 5 && y >= 11 && y <= 13);

      const n = hash(x, y, 19);

      if (isOre) {
        // Vanilla iron ore colors: #D8AF93 / #BF8E70 / #8A644D
        if (n > 0.7) return [216, 175, 147];
        if (n > 0.3) return [191, 142, 112];
        return [138, 100, 77];
      }

      const val = 125 + (n - 0.5) * 28;
      return [val - 1, val, val + 2];
    });

    // =========================================================================
    // 14. COPPER ORE (Bronze-orange with verdigris patina specks in stone)
    // =========================================================================
    this.drawTile(TileId.COPPER_ORE, (x, y) => {
      const isOre =
        (x >= 3 && x <= 7 && y >= 2 && y <= 5) ||
        (x >= 8 && x <= 12 && y >= 7 && y <= 10) ||
        (x >= 4 && x <= 8 && y >= 11 && y <= 14);

      const n = hash(x, y, 20);

      if (isOre) {
        if (n > 0.6) return [215, 118, 71]; // warm bronze
        if (n > 0.3) return [175, 85, 45]; // dark copper
        return [82, 160, 134]; // verdigris patina
      }

      const val = 125 + (n - 0.5) * 28;
      return [val - 1, val, val + 2];
    });

    // =========================================================================
    // 15. CRYSTAL / DIAMOND ORE (Brilliant cyan gem facets in stone)
    // =========================================================================
    this.drawTile(TileId.CRYSTAL_ORE, (x, y) => {
      const isGem =
        (x >= 4 && x <= 7 && y >= 3 && y <= 6) ||
        (x >= 9 && x <= 13 && y >= 9 && y <= 12) ||
        (x >= 2 && x <= 5 && y >= 10 && y <= 13);

      const n = hash(x, y, 21);

      if (isGem) {
        // Classic diamond cyan palette: #5DECF5 / #35CAD4 / #1B95A0
        if (n > 0.8) return [225, 255, 255]; // brilliant glint
        if (n > 0.4) return [93, 236, 245]; // bright cyan
        return [36, 175, 185]; // deep cyan
      }

      const val = 125 + (n - 0.5) * 28;
      return [val - 1, val, val + 2];
    });

    // =========================================================================
    // 16. SNOW (Clean powder white with soft blue ambient undertone)
    // =========================================================================
    this.drawTile(TileId.SNOW, (x, y) => {
      const n = hash(x, y, 22);
      const v = 240 + n * 15;
      return [v - 5, v - 2, v + 2];
    });

    // =========================================================================
    // 17. ICE (Translucent pale cyan crystal with subtle fracture lines)
    // =========================================================================
    this.drawTile(TileId.ICE, (x, y) => {
      const n = hash(x, y, 23);
      const isCrack = (x === y || x === 15 - y) && n > 0.45;
      if (isCrack) return [235, 248, 255, 230];
      return [150 + n * 25, 205 + n * 25, 245, 195];
    });

    // =========================================================================
    // 18. CLAY (Terracotta grayish-brown clay)
    // =========================================================================
    this.drawTile(TileId.CLAY, (x, y) => {
      const n = hash(x, y, 24);
      return [160 + n * 20, 165 + n * 18, 175 + n * 20];
    });

    // =========================================================================
    // 19. GLASS (Classic 1.10 Glass: 1px border, clear field, diagonal gleams)
    // =========================================================================
    this.drawTile(TileId.GLASS, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isBorder) return [210, 225, 235, 220]; // outer frame

      // Classic diagonal streak gleams
      const isGlint1 = (x >= 2 && x <= 5 && y >= 2 && y <= 5 && (x === y));
      const isGlint2 = (x >= 10 && x <= 13 && y >= 10 && y <= 13 && (x === y));
      if (isGlint1 || isGlint2) {
        return [255, 255, 255, 190];
      }

      // Ultra-transparent glass body
      return [200, 230, 245, 25];
    });

    // =========================================================================
    // 20. BRICKS (Staggered red clay masonry with light mortar)
    // =========================================================================
    this.drawTile(TileId.BRICKS, (x, y) => {
      const row = Math.floor(y / 4);
      const isHorizMortar = y % 4 === 0;
      const offset = (row % 2) * 4;
      const isVertMortar = (x + offset) % 8 === 0;

      if (isHorizMortar || isVertMortar) {
        return [214, 208, 198]; // light mortar
      }

      const n = hash(x, y, 25);
      // Terracotta red brick (#964433 / #B05340)
      return [165 + n * 28, 68 + n * 20, 52 + n * 14];
    });

    // =========================================================================
    // 21. CARVED STONE (Ancient chiseled stone block)
    // =========================================================================
    this.drawTile(TileId.CARVED_STONE, (x, y) => {
      const isBorder = x === 1 || x === 14 || y === 1 || y === 14;
      const isCross = (x === 7 || x === 8 || y === 7 || y === 8);
      const n = hash(x, y, 26);

      if (isBorder || isCross) {
        return [76 + n * 16, 76 + n * 16, 82 + n * 16];
      }
      const v = 135 + n * 26;
      return [v - 1, v, v + 2];
    });

    // =========================================================================
    // 22. GLOWSTONE (Golden incandescent luminescent crystal)
    // =========================================================================
    this.drawTile(TileId.GLOWSTONE, (x, y) => {
      const n = hash(x, y, 27);
      const r = 245 + n * 10;
      const g = 185 + n * 40;
      const b = 80 + n * 40;
      return [r, g, b];
    });

    // =========================================================================
    // 23. TORCH (Torch flame tip and wooden stick handle)
    // =========================================================================
    this.drawTile(TileId.TORCH, (x, y) => {
      if (x >= 6 && x <= 9) {
        if (y < 6) {
          if (y === 0) return [255, 245, 170];
          if (y < 3) return [255, 200, 50];
          return [240, 100, 20];
        }
        return [120, 80, 45]; // wood handle
      }
      return [0, 0, 0, 0];
    });

    // =========================================================================
    // 24. WORKBENCH TOP (Oak frame with 3x3 blueprint grid)
    // =========================================================================
    this.drawTile(TileId.WORKBENCH_TOP, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isBorder) return [110, 75, 40];
      const isGrid = (x % 4 === 0 || y % 4 === 0);
      if (isGrid) return [140, 95, 55];
      const n = hash(x, y, 28);
      return [195 + n * 20, 145 + n * 15, 95 + n * 10];
    });

    // =========================================================================
    // 25. WORKBENCH SIDE (Planks with saw and wrench icons)
    // =========================================================================
    this.drawTile(TileId.WORKBENCH_SIDE, (x, y) => {
      const isTool = (x === y && x >= 4 && x <= 11);
      if (isTool) return [215, 215, 220];
      const isSeam = y % 4 === 0;
      if (isSeam) return [95, 65, 35];
      const n = hash(x, y, 29);
      return [175 + n * 25, 125 + n * 20, 80 + n * 12];
    });

    // =========================================================================
    // 26. FURNACE FRONT (Cobblestone face with dark arched fire grate opening)
    // =========================================================================
    this.drawTile(TileId.FURNACE_FRONT, (x, y) => {
      const isMouth = x >= 4 && x <= 11 && y >= 7 && y <= 13;
      if (isMouth) {
        if (y >= 10) return [255, 140 + hash(x, y, 30) * 80, 20]; // glowing embers
        return [40, 30, 25]; // dark hearth interior
      }
      const n = hash(x, y, 31);
      const v = 115 + n * 35;
      return [v, v, v + 3];
    });

    // =========================================================================
    // 27. FURNACE SIDE (Cobblestone matching 1.10 style)
    // =========================================================================
    this.drawTile(TileId.FURNACE_SIDE, (x, y) => {
      const n = hash(x, y, 32);
      const isMortar =
        (y === 0 || y === 7 || y === 8 || y === 15) ||
        (y < 7 && (x === 0 || x === 7 || x === 8 || x === 15)) ||
        (y > 8 && (x === 4 || x === 12));
      if (isMortar) {
        const v = 58 + n * 18;
        return [v - 1, v, v + 2];
      }
      const v = 115 + n * 30;
      return [v - 1, v, v + 2];
    });

    // =========================================================================
    // 28-30. CHEST (Top, Front, Side)
    // =========================================================================
    this.drawTile(TileId.CHEST_TOP, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y, 33);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    this.drawTile(TileId.CHEST_FRONT, (x, y) => {
      const isLock = x >= 7 && x <= 8 && y >= 6 && y <= 9;
      if (isLock) return [235, 210, 70]; // gold latch
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15 || y === 5);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y, 34);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    this.drawTile(TileId.CHEST_SIDE, (x, y) => {
      const isBorder = (x === 0 || x === 15 || y === 0 || y === 15 || y === 5);
      if (isBorder) return [70, 70, 75];
      const n = hash(x, y, 35);
      return [160 + n * 20, 110 + n * 15, 65 + n * 10];
    });

    // =========================================================================
    // 31. WATER (Initial classic 1.10 frame)
    // =========================================================================
    this.drawAnimatedWater(0);

    // =========================================================================
    // 32. BEDROCK (Dark impenetrable bedrock with high contrast cracks)
    // =========================================================================
    this.drawTile(TileId.BEDROCK, (x, y) => {
      const n = hash(x, y, 36);
      const isDark = n < 0.35 || ((x * y) % 5 === 0);
      if (isDark) {
        return [25, 25, 25];
      }
      const v = 50 + n * 35;
      return [v, v, v];
    });

    // =========================================================================
    // Row 2 & 3: Tools & Items
    // =========================================================================
    // Stick
    this.drawTile(TileId.STICK, (x, y) => {
      const isStick = (Math.abs(x - y) <= 1 && x >= 3 && x <= 12);
      if (!isStick) return [0, 0, 0, 0];
      const isHighlight = (x === y - 1);
      if (isHighlight) return [195, 145, 95];
      return [135, 95, 55];
    });

    // Coal Item
    this.drawTile(TileId.COAL_ITEM, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5.5 + hash(x, y, 37) * 2.0) return [0, 0, 0, 0];
      const n = hash(x, y, 38);
      if (n > 0.82) return [120, 120, 130];
      const v = 25 + n * 30;
      return [v, v, v + 4];
    });

    // Iron Ingot
    this.drawTile(TileId.IRON_INGOT, (x, y) => {
      const inBar = (x >= 3 && x <= 12 && y >= 5 && y <= 10);
      if (!inBar) return [0, 0, 0, 0];
      if (y === 5 || x === 3) return [245, 245, 250];
      if (y === 10 || x === 12) return [130, 130, 140];
      const n = hash(x, y, 39);
      const v = 205 + n * 25;
      return [v, v, v + 5];
    });

    // Copper Ingot
    this.drawTile(TileId.COPPER_INGOT, (x, y) => {
      const inBar = (x >= 3 && x <= 12 && y >= 5 && y <= 10);
      if (!inBar) return [0, 0, 0, 0];
      if (y === 5 || x === 3) return [255, 185, 135];
      if (y === 10 || x === 12) return [165, 80, 45];
      const n = hash(x, y, 40);
      return [220 + n * 25, 115 + n * 20, 70 + n * 15];
    });

    // Crystal Item
    this.drawTile(TileId.CRYSTAL_ITEM, (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      if (dx + dy > 6.5) return [0, 0, 0, 0];
      if (x < 7 && y < 7) return [225, 255, 255];
      if (x >= 9 || y >= 9) return [20, 130, 170];
      const n = hash(x, y, 41);
      return [45 + n * 20, 215 + n * 25, 245];
    });

    // Apple
    this.drawTile(TileId.APPLE, (x, y) => {
      if (x === 7 && y === 2) return [120, 75, 40];
      if ((x === 8 || x === 9) && (y === 2 || y === 3)) return [70, 190, 50];
      const dx = x - 7.5;
      const dy = y - 8.5;
      if (dx * dx + dy * dy > 22) return [0, 0, 0, 0];
      if (dx < -1 && dy < -1) return [255, 140, 130];
      const n = hash(x, y, 42);
      return [215 + n * 30, 30 + n * 15, 30];
    });

    // Bread
    this.drawTile(TileId.BREAD, (x, y) => {
      if (x < 2 || x > 13 || y < 5 || y > 10) return [0, 0, 0, 0];
      if ((x === 5 || x === 8 || x === 11) && y >= 6 && y <= 8) return [140, 80, 35];
      if (y === 5) return [235, 175, 95];
      if (y === 10) return [130, 75, 30];
      const n = hash(x, y, 43);
      return [200 + n * 35, 130 + n * 25, 60 + n * 20];
    });

    // Raw Meat
    this.drawTile(TileId.RAW_MEAT, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      if (dx * dx + dy * dy * 1.5 > 25) return [0, 0, 0, 0];
      if (x === 4 && y === 7) return [240, 235, 225];
      const n = hash(x, y, 44);
      if (n > 0.7) return [230, 180, 175];
      return [185 + n * 30, 45 + n * 15, 55 + n * 15];
    });

    // Cooked Meat
    this.drawTile(TileId.COOKED_MEAT, (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      if (dx * dx + dy * dy * 1.5 > 25) return [0, 0, 0, 0];
      if (x === 4 && y === 7) return [230, 220, 210];
      if ((x === 6 || x === 9) && y >= 5 && y <= 10) return [60, 30, 15];
      const n = hash(x, y, 45);
      return [135 + n * 25, 65 + n * 20, 35 + n * 15];
    });

    // Helper for Pickaxes
    const drawPickaxe = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        const isHead = (y <= 5 && Math.abs(x + y - 11) <= 1 && x >= 2 && x <= 13) ||
                       (y === 2 && x >= 6 && x <= 13) ||
                       (x === 13 && y >= 2 && y <= 5);
        if (isHead) {
          if (y === 2 || x === 13) return headHighlight;
          return headColor;
        }
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

    // Helper for Swords
    const drawSword = (tileId: TileId, bladeColor: [number, number, number], bladeHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        if (x === 2 && y === 13) return [90, 60, 30];
        if ((x === 3 && y === 12) || (x === 4 && y === 11)) return [120, 85, 45];
        if ((x === 3 && y === 10) || (x === 5 && y === 12) || (x === 4 && y === 10) || (x === 6 && y === 11)) {
          return [180, 150, 60];
        }
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

    // Helper for Axes
    const drawAxe = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        if (x >= 4 && x <= 8 && y >= 2 && y <= 7) {
          if (y === 2 || x === 4) return headHighlight;
          return headColor;
        }
        if (Math.abs(x - y) <= 0 && x >= 4 && x <= 12) {
          return [130, 90, 50];
        }
        return [0, 0, 0, 0];
      });
    };

    drawAxe(TileId.WOOD_AXE, [160, 115, 70], [205, 155, 105]);
    drawAxe(TileId.STONE_AXE, [130, 130, 135], [180, 180, 185]);
    drawAxe(TileId.IRON_AXE, [215, 215, 225], [255, 255, 255]);

    // Helper for Shovels
    const drawShovel = (tileId: TileId, headColor: [number, number, number], headHighlight: [number, number, number]) => {
      this.drawTile(tileId, (x, y) => {
        if (x >= 10 && x <= 13 && y >= 2 && y <= 5) {
          if (y === 2 || x === 13) return headHighlight;
          return headColor;
        }
        if (Math.abs(x - y) <= 0 && x >= 2 && x <= 10) {
          return [130, 90, 50];
        }
        return [0, 0, 0, 0];
      });
    };

    drawShovel(TileId.WOOD_SHOVEL, [160, 115, 70], [205, 155, 105]);
    drawShovel(TileId.STONE_SHOVEL, [130, 130, 135], [180, 180, 185]);
    drawShovel(TileId.IRON_SHOVEL, [215, 215, 225], [255, 255, 255]);

    // Armor pieces
    this.drawTile(TileId.IRON_HELMET, (x, y) => {
      if (x >= 4 && x <= 11 && y >= 3 && y <= 9) {
        if (x >= 6 && x <= 9 && y >= 7 && y <= 9) return [0, 0, 0, 0];
        if (y === 3 || x === 4) return [250, 250, 255];
        return [200, 200, 210];
      }
      return [0, 0, 0, 0];
    });

    this.drawTile(TileId.IRON_CHESTPLATE, (x, y) => {
      if (x >= 3 && x <= 12 && y >= 3 && y <= 11) {
        if (x >= 6 && x <= 9 && y === 3) return [0, 0, 0, 0];
        if (y === 3 || x === 3) return [250, 250, 255];
        return [200, 200, 210];
      }
      return [0, 0, 0, 0];
    });

    this.drawTile(TileId.IRON_LEGGINGS, (x, y) => {
      if (x >= 4 && x <= 11 && y >= 3 && y <= 12) {
        if (x >= 7 && x <= 8 && y >= 6 && y <= 12) return [0, 0, 0, 0];
        if (y === 3 || x === 4) return [250, 250, 255];
        return [195, 195, 205];
      }
      return [0, 0, 0, 0];
    });

    this.drawTile(TileId.IRON_BOOTS, (x, y) => {
      if ((x >= 3 && x <= 6 && y >= 7 && y <= 12) || (x >= 9 && x <= 12 && y >= 7 && y <= 12)) {
        if (y === 7 || x === 3 || x === 9) return [250, 250, 255];
        return [190, 190, 200];
      }
      return [0, 0, 0, 0];
    });

    // Create Three.js Texture with strict Nearest Neighbor filtering (no mipmaps)
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
      return this.getBlockFaceTile(blockType, 2);
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

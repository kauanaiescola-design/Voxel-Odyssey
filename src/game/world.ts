/**
 * Voxel Realms - Procedural World Engine
 * Chunk management, 3D procedural terrain, biomes, caves, structures, and optimized meshing.
 */

import * as THREE from 'three';
import { BlockType, BiomeType } from '../types';
import { BLOCK_CONFIGS } from './items';
import { textureManager, ATLAS_COLS, ATLAS_ROWS } from './textures';
import { SimplexNoise } from './noise';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_HEIGHT = 48;
export const SEA_LEVEL = 16;

export interface ChunkKey {
  cx: number;
  cz: number;
}

export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export interface ChestContent {
  x: number;
  y: number;
  z: number;
  items: { itemId: string; count: number }[];
}

export class Chunk {
  public cx: number;
  public cz: number;
  public voxels: Uint8Array;
  public mesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public isDirty: boolean = true;
  public chestLocations: Map<string, ChestContent> = new Map();

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_HEIGHT * CHUNK_SIZE_Z);
  }

  public getIndex(lx: number, ly: number, lz: number): number {
    return (ly * CHUNK_SIZE_X * CHUNK_SIZE_Z) + (lz * CHUNK_SIZE_X) + lx;
  }

  public getVoxel(lx: number, ly: number, lz: number): BlockType {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.voxels[this.getIndex(lx, ly, lz)];
  }

  public setVoxel(lx: number, ly: number, lz: number, type: BlockType) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return;
    }
    this.voxels[this.getIndex(lx, ly, lz)] = type;
    this.isDirty = true;
  }

  public dispose(scene: THREE.Scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.waterMesh) {
      scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
  }
}

export class World {
  public chunks: Map<string, Chunk> = new Map();
  public scene: THREE.Scene;
  public noise: SimplexNoise;
  public seed: number;
  public solidMaterial: THREE.MeshLambertMaterial;
  public waterMaterial: THREE.MeshLambertMaterial;
  public chestRegistry: Map<string, ChestContent> = new Map();
  public torchLightPositions: { x: number; y: number; z: number }[] = [];

  constructor(scene: THREE.Scene, seed: number = 42) {
    this.scene = scene;
    this.seed = seed;
    this.noise = new SimplexNoise(seed);

    // Single atlas material for all solid blocks with smooth vertex lighting & AO
    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: textureManager.atlasTexture,
      transparent: false,
      alphaTest: 0.1,
      vertexColors: true,
    });

    // Translucent water material
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: textureManager.atlasTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      vertexColors: true,
    });
  }

  public getVoxelWorld(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const key = getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return BlockType.AIR;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getVoxel(lx, wy, lz);
  }

  public setVoxelWorld(wx: number, wy: number, wz: number, type: BlockType) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const key = getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    chunk.setVoxel(lx, wy, lz, type);

    // If placed or removed a torch, update light position
    if (type === BlockType.TORCH || type === BlockType.GLOWSTONE) {
      this.torchLightPositions.push({ x: wx + 0.5, y: wy + 0.5, z: wz + 0.5 });
    } else {
      this.torchLightPositions = this.torchLightPositions.filter(p => !(Math.floor(p.x) === wx && Math.floor(p.y) === wy && Math.floor(p.z) === wz));
    }

    // Mark neighbor chunks dirty if on edge
    if (lx === 0) this.markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE_X - 1) this.markChunkDirty(cx + 1, cz);
    if (lz === 0) this.markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE_Z - 1) this.markChunkDirty(cx, cz + 1);

    this.rebuildChunkMesh(chunk);
  }

  public markChunkDirty(cx: number, cz: number) {
    const neighbor = this.chunks.get(getChunkKey(cx, cz));
    if (neighbor) neighbor.isDirty = true;
  }

  // Determine Biome at world position
  public getBiome(wx: number, wz: number): BiomeType {
    const temp = this.noise.noise2D(wx * 0.003, wz * 0.003); // -1 (cold) to 1 (hot)
    const moisture = this.noise.noise2D((wx + 500) * 0.003, (wz + 500) * 0.003); // -1 (dry) to 1 (wet)
    const continent = this.noise.noise2D(wx * 0.0015, wz * 0.0015);

    if (continent < -0.35) return 'ocean';
    if (continent < -0.2) return 'beach';

    if (temp < -0.35) return 'snow';
    if (temp > 0.35 && moisture < -0.1) return 'desert';
    if (temp < 0.1 && continent > 0.3) return 'mountains';
    if (moisture > 0.2) return 'forest';
    return 'plains';
  }

  // Calculate terrain height
  public getHeight(wx: number, wz: number, biome: BiomeType): number {
    const baseNoise = this.noise.fbm2D(wx * 0.01, wz * 0.01, 4, 0.5, 2.0); // -1 to 1
    const detailNoise = this.noise.noise2D(wx * 0.04, wz * 0.04) * 0.15;

    let h = 20;

    switch (biome) {
      case 'ocean':
        h = 10 + (baseNoise + 1) * 3;
        break;
      case 'beach':
        h = 16 + (baseNoise * 1.5);
        break;
      case 'plains':
        h = 19 + baseNoise * 4 + detailNoise * 3;
        break;
      case 'forest':
        h = 21 + baseNoise * 5 + detailNoise * 4;
        break;
      case 'desert':
        // Rolling dunes
        const dune = Math.sin(wx * 0.03 + wz * 0.02) * 3;
        h = 20 + dune + baseNoise * 3;
        break;
      case 'mountains':
        // Jagged mountain peaks reaching up to y=42
        const mountainNoise = Math.pow(Math.max(0, (baseNoise + 0.8) * 0.6), 2.2);
        h = 24 + mountainNoise * 20 + detailNoise * 5;
        break;
      case 'snow':
        h = 23 + (baseNoise + 1) * 7;
        break;
    }

    return Math.max(2, Math.min(CHUNK_HEIGHT - 2, Math.floor(h)));
  }

  // Generate voxels for a chunk
  public generateChunkData(chunk: Chunk) {
    const startX = chunk.cx * CHUNK_SIZE_X;
    const startZ = chunk.cz * CHUNK_SIZE_Z;

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = startX + lx;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = startZ + lz;
        const biome = this.getBiome(wx, wz);
        const surfaceY = this.getHeight(wx, wz, biome);

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            // Bedrock layer
            chunk.setVoxel(lx, y, lz, BlockType.STONE);
            continue;
          }

          if (y <= surfaceY) {
            // 3D Cave carving using simplex noise
            const caveVal = this.noise.fbm3D(wx * 0.035, y * 0.05, wz * 0.035, 3);
            const isCave = y < surfaceY - 2 && y > 3 && caveVal > 0.42;

            if (isCave) {
              chunk.setVoxel(lx, y, lz, BlockType.AIR);
              continue;
            }

            if (y === surfaceY) {
              // Surface Block
              if (surfaceY < SEA_LEVEL + 1 && (biome === 'ocean' || biome === 'beach')) {
                chunk.setVoxel(lx, y, lz, BlockType.SAND);
              } else if (biome === 'desert') {
                chunk.setVoxel(lx, y, lz, BlockType.SAND);
              } else if (biome === 'snow' || (biome === 'mountains' && y > 32)) {
                chunk.setVoxel(lx, y, lz, BlockType.SNOW);
              } else if (biome === 'mountains' && y > 27) {
                chunk.setVoxel(lx, y, lz, BlockType.GRAVEL);
              } else {
                chunk.setVoxel(lx, y, lz, BlockType.GRASS);
              }
            } else if (y > surfaceY - 4) {
              // Subsurface
              if (biome === 'desert' || biome === 'beach') {
                chunk.setVoxel(lx, y, lz, BlockType.SAND);
              } else if (surfaceY <= SEA_LEVEL && y > surfaceY - 2) {
                chunk.setVoxel(lx, y, lz, BlockType.CLAY);
              } else {
                chunk.setVoxel(lx, y, lz, BlockType.DIRT);
              }
            } else {
              // Deep Stone & Ore Deposits
              let block = BlockType.STONE;
              const oreNoise = this.noise.noise3D(wx * 0.1, y * 0.1, wz * 0.1);
              const oreNoise2 = this.noise.noise3D((wx + 100) * 0.12, y * 0.12, (wz + 100) * 0.12);

              if (y < 12 && oreNoise > 0.65) {
                // Rare Crystal Gem in deep depths
                block = BlockType.CRYSTAL_ORE;
              } else if (y < 24 && oreNoise > 0.52) {
                // Iron Ore
                block = BlockType.IRON_ORE;
              } else if (y < 30 && oreNoise2 > 0.55) {
                // Copper Ore
                block = BlockType.COPPER_ORE;
              } else if (oreNoise > 0.42) {
                // Coal Ore
                block = BlockType.COAL_ORE;
              }

              chunk.setVoxel(lx, y, lz, block);
            }
          } else if (y <= SEA_LEVEL) {
            // Water layer
            chunk.setVoxel(lx, y, lz, BlockType.WATER);
          }
        }

        // Structure generation: Trees & Ruins
        const treeChance = (biome === 'forest') ? 0.08 : (biome === 'plains' ? 0.015 : 0.005);
        const canTree = surfaceY >= SEA_LEVEL && surfaceY < 32 && (biome === 'forest' || biome === 'plains' || biome === 'snow');
        const treeHash = Math.sin(wx * 92.1 + wz * 44.5) * 43758.5453;
        const placeTree = canTree && (treeHash - Math.floor(treeHash)) < treeChance;

        if (placeTree && lx >= 2 && lx < CHUNK_SIZE_X - 2 && lz >= 2 && lz < CHUNK_SIZE_Z - 2) {
          this.buildTree(chunk, lx, surfaceY + 1, lz, biome === 'snow');
        }
      }
    }

    // Rare Mystery Structures & Plains Villages
    if (chunk.cx === 0 && chunk.cz === 0) {
      // Spawn Minecraft Plains Village at origin!
      this.generateVillage(chunk);
    } else {
      const structHash = Math.abs(Math.sin(chunk.cx * 37.1 + chunk.cz * 71.3) * 10000) % 1;
      if (structHash < 0.12) {
        // Build a Mysterious Structure in this chunk
        this.generateStructure(chunk);
      }
    }
  }

  // Generate an authentic Minecraft Plains Village
  private generateVillage(chunk: Chunk) {
    const wx0 = chunk.cx * CHUNK_SIZE_X;
    const wz0 = chunk.cz * CHUNK_SIZE_Z;
    const baseGround = Math.max(SEA_LEVEL + 2, this.getHeight(wx0 + 8, wz0 + 8, 'plains'));

    // 1. VILLAGE WELL (Center: lx=7..10, lz=7..10)
    for (let x = 6; x <= 10; x++) {
      for (let z = 6; z <= 10; z++) {
        // Flatten ground around well
        chunk.setVoxel(x, baseGround, z, BlockType.GRAVEL);
        chunk.setVoxel(x, baseGround + 1, z, BlockType.AIR);
        chunk.setVoxel(x, baseGround + 2, z, BlockType.AIR);
        chunk.setVoxel(x, baseGround + 3, z, BlockType.AIR);
        chunk.setVoxel(x, baseGround + 4, z, BlockType.AIR);
      }
    }

    // Well basin
    for (let x = 7; x <= 9; x++) {
      for (let z = 7; z <= 9; z++) {
        const isRim = x === 7 || x === 9 || z === 7 || z === 9;
        if (isRim) {
          chunk.setVoxel(x, baseGround + 1, z, BlockType.COBBLESTONE);
        } else {
          chunk.setVoxel(x, baseGround, z, BlockType.WATER);
          chunk.setVoxel(x, baseGround + 1, z, BlockType.WATER);
        }
      }
    }
    // 4 Corner Pillars & Roof
    const corners = [[7, 7], [9, 7], [7, 9], [9, 9]];
    for (const [cx, cz] of corners) {
      chunk.setVoxel(cx, baseGround + 2, cz, BlockType.COBBLESTONE);
      chunk.setVoxel(cx, baseGround + 3, cz, BlockType.COBBLESTONE);
    }
    for (let x = 7; x <= 9; x++) {
      for (let z = 7; z <= 9; z++) {
        chunk.setVoxel(x, baseGround + 4, z, BlockType.COBBLESTONE);
      }
    }

    // 2. VILLAGE COTTAGE 1 (Library / House: lx=1..6, lz=1..6)
    const h1Y = baseGround;
    for (let x = 1; x <= 6; x++) {
      for (let z = 1; z <= 6; z++) {
        // Floor
        chunk.setVoxel(x, h1Y, z, BlockType.COBBLESTONE);
        // Clear interior
        chunk.setVoxel(x, h1Y + 1, z, BlockType.AIR);
        chunk.setVoxel(x, h1Y + 2, z, BlockType.AIR);
        chunk.setVoxel(x, h1Y + 3, z, BlockType.AIR);

        // Walls
        const isWall = x === 1 || x === 6 || z === 1 || z === 6;
        const isCorner = (x === 1 || x === 6) && (z === 1 || z === 6);
        if (isWall) {
          const wallBlock = isCorner ? BlockType.WOOD_LOG : BlockType.WOOD_PLANKS;
          chunk.setVoxel(x, h1Y + 1, z, wallBlock);
          chunk.setVoxel(x, h1Y + 2, z, wallBlock);
          chunk.setVoxel(x, h1Y + 3, z, wallBlock);
        }
        // Roof
        chunk.setVoxel(x, h1Y + 4, z, BlockType.WOOD_PLANKS);
      }
    }
    // Windows & Door for Cottage 1
    chunk.setVoxel(3, h1Y + 2, 1, BlockType.GLASS);
    chunk.setVoxel(4, h1Y + 2, 1, BlockType.GLASS);
    chunk.setVoxel(3, h1Y + 1, 6, BlockType.AIR); // Doorway
    chunk.setVoxel(3, h1Y + 2, 6, BlockType.AIR);
    // Interior furniture
    chunk.setVoxel(2, h1Y + 1, 2, BlockType.WORKBENCH);
    chunk.setVoxel(5, h1Y + 1, 2, BlockType.CHEST);
    chunk.setVoxel(2, h1Y + 2, 3, BlockType.TORCH);
    this.registerChest(wx0 + 5, h1Y + 1, wz0 + 2, [
      { itemId: 'bread', count: 4 },
      { itemId: 'apple', count: 3 },
      { itemId: 'iron_ingot', count: 2 },
    ]);

    // 3. VILLAGE COTTAGE 2 (Blacksmith: lx=10..15, lz=1..6)
    for (let x = 10; x <= 15; x++) {
      for (let z = 1; z <= 6; z++) {
        chunk.setVoxel(x, h1Y, z, BlockType.COBBLESTONE);
        chunk.setVoxel(x, h1Y + 1, z, BlockType.AIR);
        chunk.setVoxel(x, h1Y + 2, z, BlockType.AIR);
        chunk.setVoxel(x, h1Y + 3, z, BlockType.AIR);

        const isWall = x === 10 || x === 15 || z === 1 || z === 6;
        if (isWall) {
          chunk.setVoxel(x, h1Y + 1, z, BlockType.COBBLESTONE);
          chunk.setVoxel(x, h1Y + 2, z, BlockType.COBBLESTONE);
          chunk.setVoxel(x, h1Y + 3, z, BlockType.WOOD_PLANKS);
        }
        chunk.setVoxel(x, h1Y + 4, z, BlockType.WOOD_PLANKS);
      }
    }
    // Blacksmith door & window
    chunk.setVoxel(12, h1Y + 1, 6, BlockType.AIR);
    chunk.setVoxel(12, h1Y + 2, 6, BlockType.AIR);
    chunk.setVoxel(14, h1Y + 2, 1, BlockType.GLASS);
    // Furnace & Blacksmith loot chest
    chunk.setVoxel(14, h1Y + 1, 2, BlockType.FURNACE);
    chunk.setVoxel(11, h1Y + 1, 2, BlockType.CHEST);
    this.registerChest(wx0 + 11, h1Y + 1, wz0 + 2, [
      { itemId: 'iron_pickaxe', count: 1 },
      { itemId: 'iron_ingot', count: 5 },
      { itemId: 'coal', count: 8 },
    ]);

    // 4. VILLAGE FARM PLOT (lx=1..7, lz=10..15)
    for (let x = 1; x <= 6; x++) {
      for (let z = 10; z <= 15; z++) {
        const isBorder = x === 1 || x === 6 || z === 10 || z === 15;
        if (isBorder) {
          chunk.setVoxel(x, h1Y, z, BlockType.WOOD_LOG);
        } else if (x === 3 || x === 4) {
          // Central irrigation canal
          chunk.setVoxel(x, h1Y, z, BlockType.WATER);
        } else {
          // Farmland soil
          chunk.setVoxel(x, h1Y, z, BlockType.DIRT);
          chunk.setVoxel(x, h1Y + 1, z, BlockType.CARVED_STONE); // Crops
        }
      }
    }

    // 5. CONNECTING GRAVEL PATHS
    for (let pz = 6; pz <= 10; pz++) {
      chunk.setVoxel(8, h1Y, pz, BlockType.GRAVEL);
      chunk.setVoxel(9, h1Y, pz, BlockType.GRAVEL);
    }
    for (let px = 3; px <= 12; px++) {
      chunk.setVoxel(px, h1Y, 7, BlockType.GRAVEL);
      chunk.setVoxel(px, h1Y, 8, BlockType.GRAVEL);
    }
  }

  // Build realistic voxel tree
  private buildTree(chunk: Chunk, lx: number, y: number, lz: number, isSnow: boolean) {
    const height = 4 + Math.floor(Math.random() * 2);
    if (y + height + 3 >= CHUNK_HEIGHT) return;

    // Wood trunk
    for (let dy = 0; dy < height; dy++) {
      chunk.setVoxel(lx, y + dy, lz, BlockType.WOOD_LOG);
    }

    // Leaf canopy
    const leafBlock = isSnow ? BlockType.SNOW : BlockType.LEAVES;
    for (let dy = height - 2; dy <= height + 1; dy++) {
      const radius = dy >= height ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() > 0.5) continue;
          if (dx === 0 && dz === 0 && dy < height) continue;
          chunk.setVoxel(lx + dx, y + dy, lz + dz, leafBlock);
        }
      }
    }
  }

  // Mysterious structures: Obelisks, Desert Ruins, and Abandoned Cabins
  private generateStructure(chunk: Chunk) {
    const lx = 6;
    const lz = 6;
    const wx = chunk.cx * CHUNK_SIZE_X + lx;
    const wz = chunk.cz * CHUNK_SIZE_Z + lz;
    const biome = this.getBiome(wx, wz);
    const groundY = this.getHeight(wx, wz, biome);

    if (groundY < SEA_LEVEL || groundY + 8 >= CHUNK_HEIGHT) return;

    const structType = Math.floor(Math.abs(Math.sin(wx + wz)) * 3);

    if (structType === 0) {
      // 1. ANCIENT OBELISK (Carved stone pillar crowned with glowing crystal + loot chest)
      for (let y = groundY; y <= groundY + 5; y++) {
        chunk.setVoxel(lx, y, lz, BlockType.CARVED_STONE);
        if (y === groundY) {
          chunk.setVoxel(lx + 1, y, lz, BlockType.COBBLESTONE);
          chunk.setVoxel(lx - 1, y, lz, BlockType.COBBLESTONE);
          chunk.setVoxel(lx, y, lz + 1, BlockType.COBBLESTONE);
          chunk.setVoxel(lx, y, lz - 1, BlockType.COBBLESTONE);
        }
      }
      // Glowing crystal tip
      chunk.setVoxel(lx, groundY + 6, lz, BlockType.CRYSTAL_ORE);
      // Chest with treasure at base
      chunk.setVoxel(lx + 1, groundY + 1, lz, BlockType.CHEST);
      this.registerChest(wx + 1, groundY + 1, wz, [
        { itemId: 'crystal_shard', count: 2 + Math.floor(Math.random() * 3) },
        { itemId: 'iron_ingot', count: 3 + Math.floor(Math.random() * 4) },
        { itemId: 'torch', count: 8 },
      ]);
    } else if (structType === 1) {
      // 2. ABANDONED CABIN / SHELTER
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          chunk.setVoxel(lx + dx, groundY, lz + dz, BlockType.WOOD_PLANKS);
          // walls
          if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
            chunk.setVoxel(lx + dx, groundY + 1, lz + dz, BlockType.WOOD_PLANKS);
            chunk.setVoxel(lx + dx, groundY + 2, lz + dz, BlockType.WOOD_PLANKS);
          }
        }
      }
      // Doorway
      chunk.setVoxel(lx, groundY + 1, lz + 2, BlockType.AIR);
      chunk.setVoxel(lx, groundY + 2, lz + 2, BlockType.AIR);
      // Workbench & Chest inside
      chunk.setVoxel(lx - 1, groundY + 1, lz - 1, BlockType.WORKBENCH);
      chunk.setVoxel(lx + 1, groundY + 1, lz - 1, BlockType.CHEST);
      chunk.setVoxel(lx, groundY + 2, lz - 1, BlockType.TORCH);
      this.torchLightPositions.push({ x: wx, y: groundY + 2.5, z: wz - 0.5 });

      this.registerChest(wx + 1, groundY + 1, wz - 1, [
        { itemId: 'iron_pickaxe', count: 1 },
        { itemId: 'cooked_meat', count: 5 },
        { itemId: 'coal', count: 6 },
        { itemId: 'wood_planks', count: 16 },
      ]);
    } else {
      // 3. GLOWING RUIN SHRINE (Stone bricks with glowstone & copper)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          chunk.setVoxel(lx + dx, groundY, lz + dz, BlockType.BRICKS);
        }
      }
      chunk.setVoxel(lx, groundY + 1, lz, BlockType.GLOWSTONE);
      chunk.setVoxel(lx, groundY + 2, lz, BlockType.CARVED_STONE);
      chunk.setVoxel(lx + 1, groundY + 1, lz, BlockType.CHEST);
      this.registerChest(wx + 1, groundY + 1, wz, [
        { itemId: 'copper_ingot', count: 6 },
        { itemId: 'arrow', count: 12 },
        { itemId: 'bow', count: 1 },
      ]);
    }
  }

  private registerChest(x: number, y: number, z: number, items: { itemId: string; count: number }[]) {
    const key = `${x},${y},${z}`;
    this.chestRegistry.set(key, { x, y, z, items });
  }

  // Rebuild Three.js BufferGeometry with exposed face culling & ambient occlusion
  public rebuildChunkMesh(chunk: Chunk) {
    if (!chunk.isDirty) return;
    chunk.isDirty = false;

    // Face definitions (0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z)
    const faces = [
      { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], norm: [1, 0, 0] },
      { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], norm: [-1, 0, 0] },
      { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], norm: [0, 1, 0] },
      { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], norm: [0, -1, 0] },
      { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], norm: [0, 0, 1] },
      { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], norm: [0, 0, -1] },
    ];

    const solidPositions: number[] = [];
    const solidNormals: number[] = [];
    const solidUvs: number[] = [];
    const solidColors: number[] = [];

    const waterPositions: number[] = [];
    const waterNormals: number[] = [];
    const waterUvs: number[] = [];
    const waterColors: number[] = [];

    const startX = chunk.cx * CHUNK_SIZE_X;
    const startZ = chunk.cz * CHUNK_SIZE_Z;

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = startZ + lz;
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const wx = startX + lx;
          const block = chunk.getVoxel(lx, y, lz);
          if (block === BlockType.AIR) continue;

          const isWater = block === BlockType.WATER;
          const blockConfig = BLOCK_CONFIGS[block];

          for (let f = 0; f < 6; f++) {
            const face = faces[f];
            const nx = wx + face.dir[0];
            const ny = y + face.dir[1];
            const nz = wz + face.dir[2];

            const neighborBlock = this.getVoxelWorld(nx, ny, nz);
            const neighborConfig = BLOCK_CONFIGS[neighborBlock];

            // Face culling condition
            let renderFace = false;
            if (isWater) {
              // Water only renders top face or against air
              renderFace = neighborBlock === BlockType.AIR || (!neighborConfig.solid && neighborBlock !== BlockType.WATER);
            } else if (neighborBlock === BlockType.AIR || neighborConfig.transparent) {
              // Glass doesn't render face against glass
              if (block === BlockType.GLASS && neighborBlock === BlockType.GLASS) {
                renderFace = false;
              } else {
                renderFace = true;
              }
            }

            if (!renderFace) continue;

            const tileId = textureManager.getBlockFaceTile(block, f);
            const uv = textureManager.getTileUV(tileId);

            // Shading & Ambient Occlusion simulation (Classic Minecraft Smooth Lighting)
            let faceLight = 1.0;
            if (f === 2) faceLight = 1.0; // Top (+Y)
            else if (f === 3) faceLight = 0.52; // Bottom (-Y)
            else if (f === 0 || f === 1) faceLight = 0.68; // East/West (+X/-X)
            else faceLight = 0.82; // North/South (+Z/-Z)

            // Calculate corner Ambient Occlusion
            let ao0 = 1.0;
            let ao1 = 1.0;
            let ao2 = 1.0;
            let ao3 = 1.0;

            if (!isWater) {
              const isOpaque = (bx: number, by: number, bz: number): boolean => {
                if (by < 0 || by >= CHUNK_HEIGHT) return false;
                const b = this.getVoxelWorld(bx, by, bz);
                if (b === BlockType.AIR || b === BlockType.WATER) return false;
                const cfg = BLOCK_CONFIGS[b];
                return cfg ? cfg.solid && !cfg.transparent : true;
              };

              const calcAO = (s1: boolean, s2: boolean, c: boolean): number => {
                if (s1 && s2) return 0.46; // Darkest inside corner crease
                const count = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0);
                if (count === 2) return 0.66;
                if (count === 1) return 0.84;
                return 1.0;
              };

              if (f === 0) { // +X
                ao0 = calcAO(isOpaque(wx + 1, y - 1, wz), isOpaque(wx + 1, y, wz - 1), isOpaque(wx + 1, y - 1, wz - 1));
                ao1 = calcAO(isOpaque(wx + 1, y + 1, wz), isOpaque(wx + 1, y, wz - 1), isOpaque(wx + 1, y + 1, wz - 1));
                ao2 = calcAO(isOpaque(wx + 1, y + 1, wz), isOpaque(wx + 1, y, wz + 1), isOpaque(wx + 1, y + 1, wz + 1));
                ao3 = calcAO(isOpaque(wx + 1, y - 1, wz), isOpaque(wx + 1, y, wz + 1), isOpaque(wx + 1, y - 1, wz + 1));
              } else if (f === 1) { // -X
                ao0 = calcAO(isOpaque(wx - 1, y - 1, wz), isOpaque(wx - 1, y, wz + 1), isOpaque(wx - 1, y - 1, wz + 1));
                ao1 = calcAO(isOpaque(wx - 1, y + 1, wz), isOpaque(wx - 1, y, wz + 1), isOpaque(wx - 1, y + 1, wz + 1));
                ao2 = calcAO(isOpaque(wx - 1, y + 1, wz), isOpaque(wx - 1, y, wz - 1), isOpaque(wx - 1, y + 1, wz - 1));
                ao3 = calcAO(isOpaque(wx - 1, y - 1, wz), isOpaque(wx - 1, y, wz - 1), isOpaque(wx - 1, y - 1, wz - 1));
              } else if (f === 2) { // +Y (Top)
                ao0 = calcAO(isOpaque(wx - 1, y + 1, wz), isOpaque(wx, y + 1, wz + 1), isOpaque(wx - 1, y + 1, wz + 1));
                ao1 = calcAO(isOpaque(wx + 1, y + 1, wz), isOpaque(wx, y + 1, wz + 1), isOpaque(wx + 1, y + 1, wz + 1));
                ao2 = calcAO(isOpaque(wx + 1, y + 1, wz), isOpaque(wx, y + 1, wz - 1), isOpaque(wx + 1, y + 1, wz - 1));
                ao3 = calcAO(isOpaque(wx - 1, y + 1, wz), isOpaque(wx, y + 1, wz - 1), isOpaque(wx - 1, y + 1, wz - 1));
              } else if (f === 3) { // -Y (Bottom)
                ao0 = calcAO(isOpaque(wx - 1, y - 1, wz), isOpaque(wx, y - 1, wz - 1), isOpaque(wx - 1, y - 1, wz - 1));
                ao1 = calcAO(isOpaque(wx + 1, y - 1, wz), isOpaque(wx, y - 1, wz - 1), isOpaque(wx + 1, y - 1, wz - 1));
                ao2 = calcAO(isOpaque(wx + 1, y - 1, wz), isOpaque(wx, y - 1, wz + 1), isOpaque(wx + 1, y - 1, wz + 1));
                ao3 = calcAO(isOpaque(wx - 1, y - 1, wz), isOpaque(wx, y - 1, wz + 1), isOpaque(wx - 1, y - 1, wz + 1));
              } else if (f === 4) { // +Z
                ao0 = calcAO(isOpaque(wx + 1, y, wz + 1), isOpaque(wx, y - 1, wz + 1), isOpaque(wx + 1, y - 1, wz + 1));
                ao1 = calcAO(isOpaque(wx + 1, y, wz + 1), isOpaque(wx, y + 1, wz + 1), isOpaque(wx + 1, y + 1, wz + 1));
                ao2 = calcAO(isOpaque(wx - 1, y, wz + 1), isOpaque(wx, y + 1, wz + 1), isOpaque(wx - 1, y + 1, wz + 1));
                ao3 = calcAO(isOpaque(wx - 1, y, wz + 1), isOpaque(wx, y - 1, wz + 1), isOpaque(wx - 1, y - 1, wz + 1));
              } else { // -Z
                ao0 = calcAO(isOpaque(wx - 1, y, wz - 1), isOpaque(wx, y - 1, wz - 1), isOpaque(wx - 1, y - 1, wz - 1));
                ao1 = calcAO(isOpaque(wx - 1, y, wz - 1), isOpaque(wx, y + 1, wz - 1), isOpaque(wx - 1, y + 1, wz - 1));
                ao2 = calcAO(isOpaque(wx + 1, y, wz - 1), isOpaque(wx, y + 1, wz - 1), isOpaque(wx + 1, y + 1, wz - 1));
                ao3 = calcAO(isOpaque(wx + 1, y, wz - 1), isOpaque(wx, y - 1, wz - 1), isOpaque(wx + 1, y - 1, wz - 1));
              }
            }

            const col0 = faceLight * ao0;
            const col1 = faceLight * ao1;
            const col2 = faceLight * ao2;
            const col3 = faceLight * ao3;

            // Vertex positions
            const c = face.corners;
            const p0 = [wx + c[0][0], y + c[0][1], wz + c[0][2]];
            const p1 = [wx + c[1][0], y + c[1][1], wz + c[1][2]];
            const p2 = [wx + c[2][0], y + c[2][1], wz + c[2][2]];
            const p3 = [wx + c[3][0], y + c[3][1], wz + c[3][2]];

            const targetPos = isWater ? waterPositions : solidPositions;
            const targetNorm = isWater ? waterNormals : solidNormals;
            const targetUv = isWater ? waterUvs : solidUvs;
            const targetCol = isWater ? waterColors : solidColors;

            // Minecraft Quad Diagonal Flip Rule for anisotropic shadow interpolation
            if (ao0 + ao2 > ao1 + ao3) {
              targetPos.push(
                p0[0], p0[1], p0[2],
                p1[0], p1[1], p1[2],
                p2[0], p2[1], p2[2],

                p0[0], p0[1], p0[2],
                p2[0], p2[1], p2[2],
                p3[0], p3[1], p3[2]
              );
              targetCol.push(
                col0, col0, col0,
                col1, col1, col1,
                col2, col2, col2,

                col0, col0, col0,
                col2, col2, col2,
                col3, col3, col3
              );
              targetUv.push(
                uv.u0, uv.v0,
                uv.u0, uv.v1,
                uv.u1, uv.v1,

                uv.u0, uv.v0,
                uv.u1, uv.v1,
                uv.u1, uv.v0
              );
            } else {
              targetPos.push(
                p1[0], p1[1], p1[2],
                p2[0], p2[1], p2[2],
                p3[0], p3[1], p3[2],

                p1[0], p1[1], p1[2],
                p3[0], p3[1], p3[2],
                p0[0], p0[1], p0[2]
              );
              targetCol.push(
                col1, col1, col1,
                col2, col2, col2,
                col3, col3, col3,

                col1, col1, col1,
                col3, col3, col3,
                col0, col0, col0
              );
              targetUv.push(
                uv.u0, uv.v1,
                uv.u1, uv.v1,
                uv.u1, uv.v0,

                uv.u0, uv.v1,
                uv.u1, uv.v0,
                uv.u0, uv.v0
              );
            }

            for (let i = 0; i < 6; i++) {
              targetNorm.push(face.norm[0], face.norm[1], face.norm[2]);
            }
          }
        }
      }
    }

    // Build solid geometry
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }

    if (solidPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(solidPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(solidNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(solidUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(solidColors, 3));
      geo.computeBoundingSphere();

      chunk.mesh = new THREE.Mesh(geo, this.solidMaterial);
      this.scene.add(chunk.mesh);
    }

    // Build water geometry
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
      chunk.waterMesh.geometry.dispose();
      chunk.waterMesh = null;
    }

    if (waterPositions.length > 0) {
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
      wGeo.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
      wGeo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
      wGeo.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
      wGeo.computeBoundingSphere();

      chunk.waterMesh = new THREE.Mesh(wGeo, this.waterMaterial);
      this.scene.add(chunk.waterMesh);
    }
  }

  // Update chunks around player position
  public updateChunks(playerX: number, playerZ: number, renderDistance: number = 4) {
    const pChunkX = Math.floor(playerX / CHUNK_SIZE_X);
    const pChunkZ = Math.floor(playerZ / CHUNK_SIZE_Z);

    const neededChunks = new Set<string>();

    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
      for (let dz = -renderDistance; dz <= renderDistance; dz++) {
        if (dx * dx + dz * dz <= renderDistance * renderDistance) {
          const cx = pChunkX + dx;
          const cz = pChunkZ + dz;
          const key = getChunkKey(cx, cz);
          neededChunks.add(key);

          if (!this.chunks.has(key)) {
            const chunk = new Chunk(cx, cz);
            this.generateChunkData(chunk);
            this.chunks.set(key, chunk);
            this.rebuildChunkMesh(chunk);
          }
        }
      }
    }

    // Unload chunks out of render distance to save memory
    const keysToRemove: string[] = [];
    this.chunks.forEach((chunk, key) => {
      if (!neededChunks.has(key)) {
        chunk.dispose(this.scene);
        keysToRemove.push(key);
      }
    });

    for (const key of keysToRemove) {
      this.chunks.delete(key);
    }
  }
}

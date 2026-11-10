/**
 * Voxel Realms - Master Game Engine
 * Orchestrates 3D rendering, player inputs, mining, building, first-person hand, and survival loop.
 */

import * as THREE from 'three';
import { BlockType, InventoryItem, PlayerStats, WorldSettings, ToolMaterial } from '../types';
import { BLOCK_CONFIGS, ITEM_CATALOG, TOOL_SPEED_MULTIPLIER, TOOL_TIER_LEVEL, createItem } from './items';
import { World, SEA_LEVEL, CHUNK_HEIGHT } from './world';
import { PhysicsEngine } from './physics';
import { raycastVoxel, VoxelRaycastHit } from './raycast';
import { ParticleSystem } from './particles';
import { sound } from './audio';
import { EnvironmentManager } from './environment';
import { EntityManager } from './entities';
import { textureManager, TileId } from './textures';
import { setBoxUVs, SKIN_PRESETS, configureSkinTexture } from './skins';

export interface GameCallbacks {
  onStatsChange: (stats: PlayerStats) => void;
  onInventoryChange: (inventory: (InventoryItem | null)[]) => void;
  onHotbarSelect: (index: number) => void;
  onOpenStation: (station: 'workbench' | 'furnace' | 'chest', chestData?: { x: number; y: number; z: number; items: { itemId: string; count: number }[] }) => void;
  onTargetBlockChange: (blockName: string | null) => void;
  onMiningProgressChange: (progress: number) => void;
  onTimeChange: (timeStr: string, isNight: boolean) => void;
  onPosChange: (x: number, y: number, z: number, biome: string) => void;
}

export class GameEngine {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public world: World;
  public particles: ParticleSystem;
  public environment: EnvironmentManager;
  public entities: EntityManager;

  // Player state
  public pos: THREE.Vector3 = new THREE.Vector3(0, 30, 0);
  public vel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0;
  public pitch: number = 0;
  public onGround: boolean = false;
  public isJumping: boolean = false;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public moveInput: THREE.Vector2 = new THREE.Vector2(0, 0);

  public stats: PlayerStats = {
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    oxygen: 20,
    maxOxygen: 20,
    isDead: false,
    score: 0,
  };

  public inventory: (InventoryItem | null)[] = new Array(36).fill(null);
  public selectedHotbarSlot: number = 0; // 0 to 8
  public settings: WorldSettings;
  public callbacks: GameCallbacks;

  // First-person hand / tool in view
  public handGroup: THREE.Group;
  public handMesh: THREE.Mesh;
  public sleeveMesh: THREE.Mesh;
  public heldItemMesh: THREE.Mesh | null = null;
  private cachedItemTextures: Map<number, THREE.CanvasTexture> = new Map();
  public handSwingTime: number = 0;
  public isMining: boolean = false;
  public miningProgress: number = 0;
  public miningTarget: THREE.Vector3 | null = null;
  private miningHitSoundTimer: number = 0;

  // Visual selection outline & Ghost block preview
  public selectionBox: THREE.LineSegments;
  public ghostBlockMesh: THREE.Mesh;
  public currentHit: VoxelRaycastHit | null = null;

  // Control state
  public isPointerLocked: boolean = false;
  public isMenuMode: boolean = false;
  public playerSkinTexture: THREE.Texture | null = null;
  public isPlayerSkinSlim: boolean = false;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private naturalRegenTimer: number = 0;
  private starvationTimer: number = 0;
  private mobSpawnTimer: number = 0;

  constructor(container: HTMLElement, settings: WorldSettings, callbacks: GameCallbacks) {
    this.container = container;
    this.settings = settings;
    this.callbacks = callbacks;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.fov || 75, window.innerWidth / window.innerHeight, 0.1, 300);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // 3. Subsystems
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    this.world = new World(this.scene, settings.seed);
    this.environment = new EnvironmentManager(this.scene);
    this.entities = new EntityManager(this.scene, this.world, this.particles);

    // 4. Selection Box & Ghost Block
    const boxGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.selectionBox = new THREE.LineSegments(edges, lineMat);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: false,
    });
    this.ghostBlockMesh = new THREE.Mesh(boxGeo, ghostMat);
    this.ghostBlockMesh.visible = false;
    this.scene.add(this.ghostBlockMesh);

    // 5. First-person hand and arm
    this.handGroup = new THREE.Group();
    this.camera.add(this.handGroup);
    this.scene.add(this.camera);

    const handGeo = new THREE.BoxGeometry(0.21, 0.55, 0.21);
    setBoxUVs(handGeo, 4, 12, 4, 40, 16, 64, 64);
    handGeo.translate(0, -0.275, 0);
    const handMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: false,
      side: THREE.FrontSide,
    });
    this.handMesh = new THREE.Mesh(handGeo, handMat);
    this.handGroup.add(this.handMesh);

    const sleeveGeo = new THREE.BoxGeometry(0.23, 0.56, 0.23);
    setBoxUVs(sleeveGeo, 4, 12, 4, 40, 32, 64, 64);
    sleeveGeo.translate(0, -0.275, 0);
    const sleeveMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    this.sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    this.handGroup.add(this.sleeveMesh);

    // Dedicated hand light so player's skin colors remain crisp and visible
    const handLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.handGroup.add(handLight);

    this.handGroup.position.set(0.34, -0.26, -0.48);
    this.handGroup.rotation.set(-0.35, -0.38, 0.18);

    // Pre-load default Steve skin texture immediately
    this.setPlayerSkin(SKIN_PRESETS[0].dataUrl, false);

    // 6. Give player initial starter kit in survival
    this.initStarterInventory();

    // 7. Find initial spawn height
    this.findSafeSpawn();

    // 8. Event Listeners
    this.setupControls();
    window.addEventListener('resize', this.onWindowResize);

    this.start();
  }

  private initStarterInventory() {
    this.inventory[0] = createItem('wooden_pickaxe', 1);
    this.inventory[1] = createItem('wooden_axe', 1);
    this.inventory[2] = createItem('torch', 16);
    this.inventory[3] = createItem('cooked_meat', 8);
    this.inventory[4] = createItem('wood_planks', 24);
    this.inventory[5] = createItem('iron_ore', 16);
    this.inventory[6] = createItem('coal', 16);
    this.inventory[7] = createItem('furnace', 1);
    this.callbacks.onInventoryChange([...this.inventory]);
  }

  private findSafeSpawn() {
    // 1. Generate chunks around the spawn origin synchronously so voxels exist
    this.world.updateChunks(0, 0, Math.max(2, this.settings.renderDistance));

    let bestX = 0;
    let bestY = 24;
    let bestZ = 0;
    let found = false;

    // 2. Search in a spiral outward from (0, 0) up to radius 16 for solid surface with 2 air blocks above
    for (let r = 0; r <= 16 && !found; r++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        for (let dz = -r; dz <= r && !found; dz++) {
          if (r > 0 && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const sx = dx;
          const sz = dz;

          // Scan downwards from top of chunk
          for (let y = CHUNK_HEIGHT - 3; y >= 2; y--) {
            const block = this.world.getVoxelWorld(sx, y, sz);
            if (block === BlockType.AIR || block === BlockType.WATER) continue;

            const config = BLOCK_CONFIGS[block];
            if (!config?.solid) continue;

            // Check that the 2 blocks directly above are completely AIR (no head or body inside dirt/leaves)
            const above1 = this.world.getVoxelWorld(sx, y + 1, sz);
            const above2 = this.world.getVoxelWorld(sx, y + 2, sz);

            if (above1 === BlockType.AIR && above2 === BlockType.AIR) {
              bestX = sx;
              bestY = y;
              bestZ = sz;
              found = true;
              break;
            }
          }
        }
      }
    }

    if (!found) {
      const biome = this.world.getBiome(0, 0);
      bestY = Math.max(SEA_LEVEL + 2, this.world.getHeight(0, 0, biome) + 1);
      bestX = 0;
      bestZ = 0;
    }

    // Spawn directly on top of the solid block
    this.pos.set(bestX + 0.5, bestY + 1.0, bestZ + 0.5);
    this.vel.set(0, 0, 0);
    this.onGround = true;
    this.camera.position.set(this.pos.x, this.pos.y + PhysicsEngine.EYE_HEIGHT, this.pos.z);
    this.world.updateChunks(this.pos.x, this.pos.z, this.settings.renderDistance);
    this.callbacks.onPosChange(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z), this.world.getBiome(Math.floor(this.pos.x), Math.floor(this.pos.z)));
  }

  private setupControls() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (this.stats.isDead) return;

      switch (e.code) {
        case 'KeyW':
          this.moveInput.y = 1;
          break;
        case 'KeyS':
          this.moveInput.y = -1;
          break;
        case 'KeyA':
          this.moveInput.x = -1;
          break;
        case 'KeyD':
          this.moveInput.x = 1;
          break;
        case 'Space':
          this.isJumping = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = true;
          break;
        case 'KeyC':
        case 'ControlLeft':
          this.isCrouching = true;
          break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
        case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
          const slot = parseInt(e.code.replace('Digit', '')) - 1;
          this.setSelectedSlot(slot);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
          if (this.moveInput.y === 1) this.moveInput.y = 0;
          break;
        case 'KeyS':
          if (this.moveInput.y === -1) this.moveInput.y = 0;
          break;
        case 'KeyA':
          if (this.moveInput.x === -1) this.moveInput.x = 0;
          break;
        case 'KeyD':
          if (this.moveInput.x === 1) this.moveInput.x = 0;
          break;
        case 'Space':
          this.isJumping = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = false;
          break;
        case 'KeyC':
        case 'ControlLeft':
          this.isCrouching = false;
          break;
      }
    });

    // Mouse wheel to change hotbar slot
    window.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;
      if (e.deltaY > 0) {
        this.setSelectedSlot((this.selectedHotbarSlot + 1) % 9);
      } else {
        this.setSelectedSlot((this.selectedHotbarSlot + 8) % 9);
      }
    });

    // Mouse look
    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });

    // Mouse buttons (Left click: mine/attack, Right click: place/interact)
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) {
        this.requestLock();
        return;
      }

      if (e.button === 0) {
        // Left click
        this.isMining = true;
        this.swingHand();
        this.tryAttackMob();
      } else if (e.button === 2) {
        // Right click
        this.handleRightClick();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMining = false;
        this.miningProgress = 0;
        this.callbacks.onMiningProgressChange(0);
      }
    });

    // Prevent context menu
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });
  }

  public requestLock() {
    this.renderer.domElement.requestPointerLock();
  }

  public exitLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  public setSelectedSlot(slot: number) {
    this.selectedHotbarSlot = Math.max(0, Math.min(8, slot));
    this.callbacks.onHotbarSelect(this.selectedHotbarSlot);
    this.updateHandItem();
  }

  public getSelectedItem(): InventoryItem | null {
    return this.inventory[this.selectedHotbarSlot];
  }

  // Switch between cinematic panorama main menu camera and active gameplay
  public setMenuMode(enabled: boolean) {
    this.isMenuMode = enabled;
    if (enabled) {
      this.exitLock();
      this.handGroup.visible = false;
      this.selectionBox.visible = false;
      this.ghostBlockMesh.visible = false;
    } else {
      this.handGroup.visible = true;
    }
  }

  // Apply custom or preset skin to player's first-person hand and sleeve
  public setPlayerSkin(skinDataUrl: string, isSlim: boolean) {
    this.isPlayerSkinSlim = isSlim;
    const loader = new THREE.TextureLoader();
    loader.load(skinDataUrl, (tex) => {
      configureSkinTexture(tex);
      this.playerSkinTexture = tex;

      const armW = isSlim ? 3 : 4;
      const widthScale = isSlim ? 0.16 : 0.21;
      const lengthScale = 0.55;
      const depthScale = 0.21;

      // Base arm geometry (shoulder at +Y, hand knuckles at -Y)
      const armGeo = new THREE.BoxGeometry(widthScale, lengthScale, depthScale);
      setBoxUVs(armGeo, armW, 12, 4, 40, 16, 64, 64);
      armGeo.translate(0, -lengthScale / 2, 0);

      this.handMesh.geometry.dispose();
      this.handMesh.geometry = armGeo;
      const handMat = this.handMesh.material as THREE.MeshLambertMaterial;
      handMat.map = tex;
      handMat.color.setHex(0xffffff);
      handMat.transparent = false;
      handMat.side = THREE.FrontSide;
      handMat.needsUpdate = true;

      // Outer sleeve overlay geometry (slightly inflated)
      const sleeveGeo = new THREE.BoxGeometry(widthScale + 0.02, lengthScale + 0.02, depthScale + 0.02);
      setBoxUVs(sleeveGeo, armW, 12, 4, 40, 32, 64, 64);
      sleeveGeo.translate(0, -lengthScale / 2, 0);

      this.sleeveMesh.geometry.dispose();
      this.sleeveMesh.geometry = sleeveGeo;
      const sleeveMat = this.sleeveMesh.material as THREE.MeshLambertMaterial;
      sleeveMat.map = tex;
      sleeveMat.color.setHex(0xffffff);
      sleeveMat.transparent = true;
      sleeveMat.alphaTest = 0.1;
      sleeveMat.depthWrite = true;
      sleeveMat.side = THREE.FrontSide;
      sleeveMat.needsUpdate = true;

      this.updateHandItem();
    });
  }

  // Update visual hand and held item model with crisp pixel textures
  private updateHandItem() {
    const item = this.getSelectedItem();

    // Clean up previous held item mesh if present
    if (this.heldItemMesh) {
      this.handGroup.remove(this.heldItemMesh);
      if (this.heldItemMesh.geometry) this.heldItemMesh.geometry.dispose();
      if (Array.isArray(this.heldItemMesh.material)) {
        this.heldItemMesh.material.forEach(m => m.dispose());
      } else if (this.heldItemMesh.material) {
        this.heldItemMesh.material.dispose();
      }
      this.heldItemMesh = null;
    }

    const handMat = this.handMesh.material as THREE.MeshLambertMaterial;
    const sleeveMat = this.sleeveMesh.material as THREE.MeshLambertMaterial;

    if (this.playerSkinTexture) {
      handMat.map = this.playerSkinTexture;
      handMat.color.setHex(0xffffff);
      sleeveMat.map = this.playerSkinTexture;
      sleeveMat.color.setHex(0xffffff);
    }
    handMat.needsUpdate = true;
    sleeveMat.needsUpdate = true;

    if (!item) {
      // Empty hand: player skin arm prominently visible and angled forward into the view
      this.handMesh.visible = true;
      this.sleeveMesh.visible = true;
      this.handMesh.position.set(0, 0, 0);
      this.handMesh.rotation.set(0, 0, 0);
      this.sleeveMesh.position.set(0, 0, 0);
      this.sleeveMesh.rotation.set(0, 0, 0);
      this.handGroup.position.set(0.34, -0.26, -0.48);
      this.handGroup.rotation.set(-0.35, -0.38, 0.18);
      return;
    }

    // Determine texture tile for the item
    const tileId = textureManager.getItemTileId(item.id, item.blockId);

    if (item.blockId !== undefined && item.blockId !== null) {
      // It's a block: show the player hand holding a miniature 3D textured voxel block
      this.handMesh.visible = true;
      this.sleeveMesh.visible = true;
      this.handMesh.position.set(0, 0, 0);
      this.handMesh.rotation.set(0, 0, 0);
      this.sleeveMesh.position.set(0, 0, 0);
      this.sleeveMesh.rotation.set(0, 0, 0);
      this.handGroup.position.set(0.3, -0.3, -0.5);
      this.handGroup.rotation.set(-0.2, -0.28, 0.1);

      // Create multi-face textured mini block
      const materials: THREE.MeshLambertMaterial[] = [];
      for (let face = 0; face < 6; face++) {
        const faceTile = textureManager.getBlockFaceTile(item.blockId, face);
        let tex = this.cachedItemTextures.get(faceTile);
        if (!tex) {
          tex = textureManager.createTileCanvasTexture(faceTile);
          this.cachedItemTextures.set(faceTile, tex);
        }
        materials.push(new THREE.MeshLambertMaterial({ map: tex, transparent: item.blockId === BlockType.GLASS }));
      }

      const blockGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      this.heldItemMesh = new THREE.Mesh(blockGeo, materials);
      this.heldItemMesh.position.set(-0.06, -0.36, -0.16);
      this.heldItemMesh.rotation.set(0.2, -0.35, 0.15);
      this.handGroup.add(this.heldItemMesh);
    } else if (tileId !== null) {
      // It's a tool, weapon, food or item: render a crisp double-sided pixelated 2.5D sprite
      this.handMesh.visible = true;
      this.sleeveMesh.visible = true;
      this.handMesh.position.set(0, 0, 0);
      this.handMesh.rotation.set(0, 0, 0);
      this.sleeveMesh.position.set(0, 0, 0);
      this.sleeveMesh.rotation.set(0, 0, 0);
      this.handGroup.position.set(0.3, -0.3, -0.5);
      this.handGroup.rotation.set(-0.2, -0.28, 0.1);

      let tex = this.cachedItemTextures.get(tileId);
      if (!tex) {
        tex = textureManager.createTileCanvasTexture(tileId);
        this.cachedItemTextures.set(tileId, tex);
      }

      // Sprite quad with thickness or plane
      const itemGeo = new THREE.BoxGeometry(0.34, 0.34, 0.02);
      const itemMat = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.1,
      });

      this.heldItemMesh = new THREE.Mesh(itemGeo, itemMat);
      // Position tool naturally in the hand grip pointing forward
      this.heldItemMesh.position.set(-0.05, -0.36, -0.22);
      this.heldItemMesh.rotation.set(-0.1, -0.3, -0.4);
      this.handGroup.add(this.heldItemMesh);
    } else {
      // Fallback
      this.handMesh.visible = true;
      this.sleeveMesh.visible = true;
      if (item.iconColor) {
        handMat.color.set(item.iconColor);
      }
    }
  }

  public swingHand() {
    this.handSwingTime = 0.25;
    sound.playSwing();
  }

  // Handle right click (placing blocks, eating food, or opening benches/furnaces/chests)
  public handleRightClick() {
    this.swingHand();

    if (!this.currentHit) {
      // If holding food, eat it
      this.tryEatFood();
      return;
    }

    const hitBlock = this.currentHit.blockType;

    // 1. INTERACT WITH WORKBENCH
    if (hitBlock === BlockType.WORKBENCH) {
      this.exitLock();
      this.callbacks.onOpenStation('workbench');
      sound.playCraft();
      return;
    }

    // 2. INTERACT WITH FURNACE
    if (hitBlock === BlockType.FURNACE) {
      this.exitLock();
      this.callbacks.onOpenStation('furnace');
      return;
    }

    // 3. INTERACT WITH CHEST
    if (hitBlock === BlockType.CHEST) {
      const pos = this.currentHit.blockPos;
      const key = `${pos.x},${pos.y},${pos.z}`;
      const chestData = this.world.chestRegistry.get(key) || {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        items: [],
      };
      this.exitLock();
      this.callbacks.onOpenStation('chest', chestData);
      return;
    }

    // 4. EATING FOOD
    if (this.tryEatFood()) {
      return;
    }

    // 5. PLACE BLOCK
    const item = this.getSelectedItem();
    if (!item?.blockId) return;

    const px = this.currentHit.placePos.x;
    const py = this.currentHit.placePos.y;
    const pz = this.currentHit.placePos.z;

    // Check collision with player
    if (PhysicsEngine.blockIntersectsPlayer(px, py, pz, this.pos.x, this.pos.y, this.pos.z)) {
      return;
    }

    // Place block
    this.world.setVoxelWorld(px, py, pz, item.blockId);
    sound.playPlaceBlock();

    // Decrement item
    if (this.settings.gameMode === 'survival') {
      item.count--;
      if (item.count <= 0) {
        this.inventory[this.selectedHotbarSlot] = null;
      }
      this.callbacks.onInventoryChange([...this.inventory]);
    }
  }

  private tryEatFood(): boolean {
    const item = this.getSelectedItem();
    if (!item?.foodValue) return false;

    if (this.stats.hunger < this.stats.maxHunger) {
      this.stats.hunger = Math.min(this.stats.maxHunger, this.stats.hunger + item.foodValue);
      sound.playEat();
      this.callbacks.onStatsChange({ ...this.stats });

      if (this.settings.gameMode === 'survival') {
        item.count--;
        if (item.count <= 0) {
          this.inventory[this.selectedHotbarSlot] = null;
        }
        this.callbacks.onInventoryChange([...this.inventory]);
      }
      return true;
    }
    return false;
  }

  // Attack mob in line of sight
  private tryAttackMob(): boolean {
    const ray = new THREE.Ray(this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()));
    let closestMobId: string | null = null;
    let closestDist = 4.0;

    this.entities.mobs.forEach(mob => {
      const mobPos = new THREE.Vector3(mob.entity.x, mob.entity.y + 0.5, mob.entity.z);
      const dist = ray.distanceToPoint(mobPos);
      if (dist < 0.8) {
        const camDist = this.camera.position.distanceTo(mobPos);
        if (camDist < closestDist) {
          closestDist = camDist;
          closestMobId = mob.entity.id;
        }
      }
    });

    if (closestMobId) {
      const held = this.getSelectedItem();
      let damage = held?.attackDamage || 1;
      const knockbackDir = this.camera.getWorldDirection(new THREE.Vector3());
      const killed = this.entities.damageMob(closestMobId, damage, knockbackDir);
      if (killed) {
        this.stats.score += 50;
        this.callbacks.onStatsChange({ ...this.stats });
      }

      // Damage weapon durability
      if (held?.durability) {
        held.durability--;
        if (held.durability <= 0) {
          this.inventory[this.selectedHotbarSlot] = null;
          sound.playBreakBlock(BlockType.STONE);
        }
        this.callbacks.onInventoryChange([...this.inventory]);
      }
      return true;
    }
    return false;
  }

  // Mining progress logic
  private updateMining(dt: number) {
    if (!this.isMining || !this.currentHit) {
      this.miningProgress = 0;
      this.miningTarget = null;
      this.callbacks.onMiningProgressChange(0);
      return;
    }

    const hit = this.currentHit;
    const blockPos = hit.blockPos;

    if (!this.miningTarget || !this.miningTarget.equals(blockPos)) {
      this.miningTarget = blockPos.clone();
      this.miningProgress = 0;
    }

    const config = BLOCK_CONFIGS[hit.blockType];
    const held = this.getSelectedItem();

    // Calculate break speed based on tool and tier
    let speed = 1.0;
    if (held?.toolType === config?.preferredTool && held?.toolMaterial) {
      speed = TOOL_SPEED_MULTIPLIER[held.toolMaterial] || 1.0;
    }

    // Creative mode instant break
    if (this.settings.gameMode === 'creative') {
      speed = 100.0;
    }

    const baseHardness = config?.hardness || 1.0;
    const timeToBreak = Math.max(0.1, baseHardness / speed);

    this.miningProgress += dt / timeToBreak;
    this.callbacks.onMiningProgressChange(Math.min(1.0, this.miningProgress));

    // Sound and particles while digging
    this.miningHitSoundTimer += dt;
    if (this.miningHitSoundTimer > 0.22) {
      this.miningHitSoundTimer = 0;
      sound.playHitBlock(hit.blockType);
      this.particles.spawnHitSpark(
        blockPos.x + 0.5 + hit.faceNormal.x * 0.5,
        blockPos.y + 0.5 + hit.faceNormal.y * 0.5,
        blockPos.z + 0.5 + hit.faceNormal.z * 0.5
      );
    }

    // Hand swing animation during mining
    this.swingHand();

    // Block Broken!
    if (this.miningProgress >= 1.0) {
      this.world.setVoxelWorld(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR);
      sound.playBreakBlock(hit.blockType);
      this.particles.spawnBlockBreak(blockPos.x, blockPos.y, blockPos.z, hit.blockType);

      // Check drop requirements
      const minTierReq = config?.minToolMaterial ? TOOL_TIER_LEVEL[config.minToolMaterial] : 0;
      const currentTier = (held?.toolType === config?.preferredTool && held?.toolMaterial) ? TOOL_TIER_LEVEL[held.toolMaterial] : 0;

      if (currentTier >= minTierReq && config?.dropItemId) {
        const dropCount = config.dropCount || 1;
        this.entities.spawnDroppedItem(config.dropItemId, dropCount, blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
      }

      // Damage tool durability
      if (held?.durability && this.settings.gameMode === 'survival') {
        held.durability--;
        if (held.durability <= 0) {
          this.inventory[this.selectedHotbarSlot] = null;
          sound.playBreakBlock(BlockType.STONE);
        }
        this.callbacks.onInventoryChange([...this.inventory]);
      }

      this.miningProgress = 0;
      this.miningTarget = null;
      this.callbacks.onMiningProgressChange(0);
      this.stats.score += 5;
      this.callbacks.onStatsChange({ ...this.stats });
    }
  }

  // Pickup dropped items when in range
  public collectDrops() {
    this.entities.droppedItems.forEach((drop, id) => {
      const e = drop.entity;
      const dx = this.pos.x - e.x;
      const dy = (this.pos.y + 0.5) - e.y;
      const dz = this.pos.z - e.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.2 && e.pickupCooldown <= 0) {
        const added = this.addItemToInventory(e.itemId, e.count);
        if (added) {
          sound.playPickup();
          this.entities.removeDroppedItem(id);
          this.callbacks.onInventoryChange([...this.inventory]);
        }
      }
    });
  }

  // Add item into player inventory with stacking
  public addItemToInventory(itemId: string, count: number): boolean {
    const catalogItem = ITEM_CATALOG[itemId];
    if (!catalogItem) return false;

    // First try stacking into existing slot
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && slot.id === itemId && slot.count < slot.maxStack) {
        const space = slot.maxStack - slot.count;
        const toAdd = Math.min(space, count);
        slot.count += toAdd;
        count -= toAdd;
        if (count <= 0) return true;
      }
    }

    // Then find empty slot
    for (let i = 0; i < this.inventory.length; i++) {
      if (!this.inventory[i]) {
        this.inventory[i] = createItem(itemId, count);
        return true;
      }
    }

    return false;
  }

  // Respawn player after death
  public respawn() {
    this.stats.health = this.stats.maxHealth;
    this.stats.hunger = this.stats.maxHunger;
    this.stats.oxygen = this.stats.maxOxygen;
    this.stats.isDead = false;
    this.findSafeSpawn();
    this.callbacks.onStatsChange({ ...this.stats });
  }

  // Main game update loop
  private animate = (currentTime: number) => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05) || 0.016;
    this.lastTime = currentTime;

    // Cinematic Main Menu panorama mode
    if (this.isMenuMode) {
      this.yaw += dt * 0.05;
      this.pitch = -0.06 + Math.sin(Date.now() * 0.0006) * 0.03;
      this.camera.position.set(
        this.pos.x + Math.sin(this.yaw * 0.15) * 3,
        this.pos.y + PhysicsEngine.EYE_HEIGHT + 2.5,
        this.pos.z + Math.cos(this.yaw * 0.15) * 3
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.handGroup.visible = false;
      this.selectionBox.visible = false;
      this.ghostBlockMesh.visible = false;

      this.environment.update(dt, this.pos.x, this.pos.y, this.pos.z, false);
      this.world.updateChunks(this.pos.x, this.pos.z, this.settings.renderDistance);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Update Player Movement & Physics
    if (!this.stats.isDead) {
      const phys = PhysicsEngine.updatePlayerMovement(
        this.world,
        this.pos,
        this.vel,
        this.moveInput,
        this.yaw,
        this.isJumping,
        this.isSprinting,
        dt,
        this.isCrouching
      );
      this.onGround = phys.onGround;
      this.callbacks.onPosChange(
        Math.floor(this.pos.x),
        Math.floor(this.pos.y),
        Math.floor(this.pos.z),
        this.world.getBiome(Math.floor(this.pos.x), Math.floor(this.pos.z))
      );

      // Footstep sounds
      if (this.onGround && (this.moveInput.x !== 0 || this.moveInput.y !== 0)) {
        if (Math.random() < 0.08) {
          const groundBlock = this.world.getVoxelWorld(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z));
          sound.playStep(groundBlock);
        }
      }

      // Fall Damage
      if (phys.fallDamage > 0 && this.settings.gameMode === 'survival') {
        this.stats.health = Math.max(0, this.stats.health - phys.fallDamage);
        sound.playPlayerHurt();
        this.callbacks.onStatsChange({ ...this.stats });
        if (this.stats.health <= 0) this.stats.isDead = true;
      }

      // Oxygen / Drowning
      if (phys.headUnderwater && this.settings.gameMode === 'survival') {
        this.stats.oxygen = Math.max(0, this.stats.oxygen - dt * 3);
        if (this.stats.oxygen <= 0) {
          this.stats.health = Math.max(0, this.stats.health - dt * 4);
          sound.playPlayerHurt();
        }
        this.callbacks.onStatsChange({ ...this.stats });
        if (this.stats.health <= 0) this.stats.isDead = true;
      } else {
        this.stats.oxygen = Math.min(this.stats.maxOxygen, this.stats.oxygen + dt * 10);
      }

      // Natural Regeneration & Starvation
      if (this.settings.gameMode === 'survival') {
        this.naturalRegenTimer += dt;
        if (this.naturalRegenTimer > 3.5) {
          this.naturalRegenTimer = 0;
          if (this.stats.hunger >= 18 && this.stats.health < this.stats.maxHealth) {
            this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 1);
            this.stats.hunger = Math.max(0, this.stats.hunger - 0.5);
            this.callbacks.onStatsChange({ ...this.stats });
          }
        }

        // Hunger consumption
        if (this.isSprinting && (this.moveInput.x !== 0 || this.moveInput.y !== 0)) {
          this.stats.hunger = Math.max(0, this.stats.hunger - dt * 0.2);
        }

        // Starvation
        if (this.stats.hunger <= 0) {
          this.starvationTimer += dt;
          if (this.starvationTimer > 4.0) {
            this.starvationTimer = 0;
            this.stats.health = Math.max(1, this.stats.health - 1);
            sound.playPlayerHurt();
            this.callbacks.onStatsChange({ ...this.stats });
          }
        }
      }
    }

    // 2. Camera Transform & Rotation
    this.camera.position.set(this.pos.x, this.pos.y + PhysicsEngine.EYE_HEIGHT, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // 3. Raycast for Target Block
    const camDir = this.camera.getWorldDirection(new THREE.Vector3());
    this.currentHit = raycastVoxel(this.world, this.camera.position, camDir, 5.5);

    if (this.currentHit) {
      const bp = this.currentHit.blockPos;
      this.selectionBox.position.set(bp.x + 0.5, bp.y + 0.5, bp.z + 0.5);
      this.selectionBox.visible = true;

      const pp = this.currentHit.placePos;
      const held = this.getSelectedItem();
      if (held?.blockId) {
        this.ghostBlockMesh.position.set(pp.x + 0.5, pp.y + 0.5, pp.z + 0.5);
        this.ghostBlockMesh.visible = true;
      } else {
        this.ghostBlockMesh.visible = false;
      }

      const config = BLOCK_CONFIGS[this.currentHit.blockType];
      this.callbacks.onTargetBlockChange(config?.name || null);
    } else {
      this.selectionBox.visible = false;
      this.ghostBlockMesh.visible = false;
      this.callbacks.onTargetBlockChange(null);
    }

    // 4. Mining Progress Update
    this.updateMining(dt);

    // 5. Dropped Item Collection
    this.collectDrops();

    // 6. Update Entities (Mobs & Drops)
    const mobDamage = this.entities.update(dt, this.pos.x, this.pos.y, this.pos.z);
    if (mobDamage > 0 && this.settings.gameMode === 'survival') {
      this.stats.health = Math.max(0, this.stats.health - mobDamage);
      this.callbacks.onStatsChange({ ...this.stats });
      if (this.stats.health <= 0) this.stats.isDead = true;
    }

    // Ambient Mob Spawning
    this.mobSpawnTimer += dt;
    if (this.mobSpawnTimer > 8.0) {
      this.mobSpawnTimer = 0;
      this.entities.manageSpawns(this.pos.x, this.pos.y, this.pos.z, this.environment.isNight());
    }

    // 7. Update Particles
    this.particles.update(dt);

    // 8. Update Procedural Textures (e.g. animated water ripples)
    textureManager.update(dt);

    // 9. Update Day/Night Atmosphere
    const isHoldingTorch = this.getSelectedItem()?.id === 'torch' || this.getSelectedItem()?.id === 'glowstone';
    this.environment.update(dt, this.pos.x, this.pos.y, this.pos.z, isHoldingTorch);
    this.callbacks.onTimeChange(this.environment.getTimeString(), this.environment.isNight());

    // 10. Update Chunks Around Player
    this.world.updateChunks(this.pos.x, this.pos.z, this.settings.renderDistance);

    // 11. Hand Swing and Bobbing Animation
    let swingProgress = 0;
    if (this.handSwingTime > 0) {
      this.handSwingTime -= dt;
      swingProgress = (0.25 - this.handSwingTime) / 0.25;
    }
    const sinProgress = Math.sin(swingProgress * Math.PI);
    const swingZ = sinProgress * 0.12;
    const swingY = sinProgress * 0.06;
    const swingRotX = sinProgress * 0.65;
    const swingRotY = -sinProgress * 0.35;
    const swingRotZ = sinProgress * 0.15;

    const item = this.getSelectedItem();
    if (!item) {
      // Empty hand punch swing
      this.handGroup.position.set(0.34, -0.26 + swingY, -0.48 + swingZ);
      this.handGroup.rotation.set(-0.35 - swingRotX, -0.38 + swingRotY, 0.18 + swingRotZ);
    } else {
      // Held item swing
      this.handGroup.position.set(0.3, -0.3 + swingY, -0.5 + swingZ);
      this.handGroup.rotation.set(-0.2 - swingRotX, -0.28 + swingRotY, 0.1 + swingRotZ);
    }

    // 11. Report Player Position & Biome
    const currentBiome = this.world.getBiome(Math.floor(this.pos.x), Math.floor(this.pos.z));
    this.callbacks.onPosChange(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z), currentBiome);

    // 12. Render Frame
    this.renderer.render(this.scene, this.camera);
  };

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.animate);
  }

  public stop() {
    this.isRunning = false;
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

/**
 * Voxel Realms - Creatures & Dropped Items Engine
 * 3D procedurally modeled and animated original creatures with AI, plus physics-based dropped items.
 */

import * as THREE from 'three';
import { MobType, MobEntity, DroppedItemEntity, BlockType } from '../types';
import { ITEM_CATALOG, BLOCK_CONFIGS } from './items';
import { World } from './world';
import { sound } from './audio';
import { ParticleSystem } from './particles';

interface Mob3D {
  entity: MobEntity;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headMesh?: THREE.Mesh;
  limbs: THREE.Mesh[];
  animTimer: number;
}

interface DroppedItem3D {
  entity: DroppedItemEntity;
  mesh: THREE.Mesh;
}

export class EntityManager {
  public scene: THREE.Scene;
  public world: World;
  public particles: ParticleSystem;
  public mobs: Map<string, Mob3D> = new Map();
  public droppedItems: Map<string, DroppedItem3D> = new Map();
  private mobIdCounter = 0;
  private dropIdCounter = 0;

  constructor(scene: THREE.Scene, world: World, particles: ParticleSystem) {
    this.scene = scene;
    this.world = world;
    this.particles = particles;
  }

  // Spawn a dropped 3D item into the world
  public spawnDroppedItem(itemId: string, count: number, x: number, y: number, z: number) {
    const itemConfig = ITEM_CATALOG[itemId];
    if (!itemConfig) return;

    const id = `drop_${++this.dropIdCounter}`;
    const entity: DroppedItemEntity = {
      id,
      itemId,
      count,
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 2,
      vy: 2.5 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 2,
      age: 0,
      pickupCooldown: 0.5,
    };

    // Mini 3D voxel cube representation
    const color = new THREE.Color(itemConfig.iconColor);
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.droppedItems.set(id, { entity, mesh });
  }

  // Spawn an original creature
  public spawnMob(type: MobType, x: number, y: number, z: number): MobEntity {
    const id = `mob_${++this.mobIdCounter}`;
    const mob3D = this.createMobModel(id, type, x, y, z);
    this.scene.add(mob3D.group);
    this.mobs.set(id, mob3D);
    return mob3D.entity;
  }

  // Create 3D blocky model for creature
  private createMobModel(id: string, type: MobType, x: number, y: number, z: number): Mob3D {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    let entity: MobEntity;
    let bodyMesh: THREE.Mesh;
    let headMesh: THREE.Mesh | undefined;
    const limbs: THREE.Mesh[] = [];

    switch (type) {
      case 'gryllos': {
        // Peaceful fluffy herbivore
        entity = {
          id,
          type,
          name: 'Gryllos',
          isHostile: false,
          health: 12,
          maxHealth: 12,
          speed: 2.2,
          damage: 0,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 0.8,
          height: 0.9,
          drops: [
            { itemId: 'raw_meat', min: 1, max: 2, chance: 1.0 },
            { itemId: 'wool', min: 1, max: 3, chance: 1.0 },
          ],
        };

        // Fluffy body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.65, 1.0);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f4 });
        bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.55;
        group.add(bodyMesh);

        // Head
        const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.5);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x44403c });
        headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.set(0, 0.8, 0.55);
        group.add(headMesh);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x292524 });
        const legPositions = [
          [-0.28, 0.22, 0.35],
          [0.28, 0.22, 0.35],
          [-0.28, 0.22, -0.35],
          [0.28, 0.22, -0.35],
        ];
        legPositions.forEach(pos => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(pos[0], pos[1], pos[2]);
          group.add(leg);
          limbs.push(leg);
        });
        break;
      }

      case 'luminis': {
        // Floating flying light spirit
        entity = {
          id,
          type,
          name: 'Luminis',
          isHostile: false,
          health: 8,
          maxHealth: 8,
          speed: 3.5,
          damage: 0,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 0.5,
          height: 0.5,
          drops: [
            { itemId: 'glowstone', min: 1, max: 2, chance: 1.0 },
          ],
        };

        const coreGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        bodyMesh = new THREE.Mesh(coreGeo, coreMat);
        bodyMesh.position.y = 0.5;
        group.add(bodyMesh);

        // Wings
        const wingGeo = new THREE.BoxGeometry(0.3, 0.05, 0.45);
        const wingMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.75 });
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-0.3, 0.55, 0);
        group.add(leftWing);
        limbs.push(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(0.3, 0.55, 0);
        group.add(rightWing);
        limbs.push(rightWing);
        break;
      }

      case 'aqualis': {
        // Streamlined aquatic creature
        entity = {
          id,
          type,
          name: 'Aqualis',
          isHostile: false,
          health: 10,
          maxHealth: 10,
          speed: 3.0,
          damage: 0,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 0.5,
          height: 0.4,
          drops: [
            { itemId: 'raw_meat', min: 1, max: 2, chance: 0.8 },
          ],
        };

        const bodyGeo = new THREE.BoxGeometry(0.3, 0.35, 0.7);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
        bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.2;
        group.add(bodyMesh);

        // Tail Fin
        const tailGeo = new THREE.BoxGeometry(0.08, 0.35, 0.3);
        const tailMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
        const tailMesh = new THREE.Mesh(tailGeo, tailMat);
        tailMesh.position.set(0, 0.2, -0.45);
        group.add(tailMesh);
        limbs.push(tailMesh);
        break;
      }

      case 'umbra_stalker': {
        // Nocturnal shadow fiend with crimson eyes
        entity = {
          id,
          type,
          name: 'Umbra Stalker',
          isHostile: true,
          health: 24,
          maxHealth: 24,
          speed: 4.2,
          damage: 4,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 0.6,
          height: 2.2,
          drops: [
            { itemId: 'shadow_essence', min: 1, max: 2, chance: 1.0 },
            { itemId: 'iron_ingot', min: 1, max: 1, chance: 0.35 },
          ],
        };

        // Torso
        const bodyGeo = new THREE.BoxGeometry(0.55, 0.9, 0.35);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
        bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 1.35;
        group.add(bodyMesh);

        // Head with glowing eyes
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x09090b });
        headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.set(0, 1.95, 0);
        group.add(headMesh);

        // Glowing red eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 1.95, 0.21);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 1.95, 0.21);
        group.add(rightEye);

        // Long Arms
        const armGeo = new THREE.BoxGeometry(0.15, 0.9, 0.15);
        const armMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.35, 1.3, 0);
        group.add(leftArm);
        limbs.push(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.35, 1.3, 0);
        group.add(rightArm);
        limbs.push(rightArm);

        // Slender Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.9, 0.18);
        const leftLeg = new THREE.Mesh(legGeo, armMat);
        leftLeg.position.set(-0.18, 0.45, 0);
        group.add(leftLeg);
        limbs.push(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, armMat);
        rightLeg.position.set(0.18, 0.45, 0);
        group.add(rightLeg);
        limbs.push(rightLeg);
        break;
      }

      case 'chitin_crawler': {
        // Underground cave spider/crawler
        entity = {
          id,
          type,
          name: 'Chitin Crawler',
          isHostile: true,
          health: 16,
          maxHealth: 16,
          speed: 4.8,
          damage: 3,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 0.9,
          height: 0.5,
          drops: [
            { itemId: 'chitin', min: 1, max: 2, chance: 1.0 },
            { itemId: 'string', min: 1, max: 2, chance: 0.7 },
          ],
        };

        const bodyGeo = new THREE.BoxGeometry(0.7, 0.4, 0.9);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0369a1 });
        bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.35;
        group.add(bodyMesh);

        // Head with glowing green eyes
        const headGeo = new THREE.BoxGeometry(0.4, 0.3, 0.35);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x075985 });
        headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.set(0, 0.35, 0.55);
        group.add(headMesh);

        // 6 Spidery legs
        const legGeo = new THREE.BoxGeometry(0.4, 0.12, 0.12);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
        for (let i = 0; i < 6; i++) {
          const leg = new THREE.Mesh(legGeo, legMat);
          const side = (i % 2 === 0) ? -1 : 1;
          const zOffset = (Math.floor(i / 2) - 1) * 0.3;
          leg.position.set(side * 0.45, 0.2, zOffset);
          group.add(leg);
          limbs.push(leg);
        }
        break;
      }

      case 'crystalline_golem': {
        // Rare ancient shrine guardian
        entity = {
          id,
          type,
          name: 'Crystalline Golem',
          isHostile: true,
          health: 50,
          maxHealth: 50,
          speed: 2.0,
          damage: 7,
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          onGround: false,
          targetPlayer: false,
          attackCooldown: 0,
          hurtTime: 0,
          width: 1.1,
          height: 1.9,
          drops: [
            { itemId: 'crystal_shard', min: 2, max: 4, chance: 1.0 },
            { itemId: 'iron_ingot', min: 2, max: 3, chance: 1.0 },
          ],
        };

        // Torso
        const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 0.6);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 1.25;
        group.add(bodyMesh);

        // Crystal shoulder spikes
        const spikeGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25);
        const spikeMat = new THREE.MeshLambertMaterial({ color: 0xa855f7 });
        const leftSpike = new THREE.Mesh(spikeGeo, spikeMat);
        leftSpike.position.set(-0.55, 1.6, 0);
        leftSpike.rotation.z = 0.3;
        group.add(leftSpike);

        const rightSpike = new THREE.Mesh(spikeGeo, spikeMat);
        rightSpike.position.set(0.55, 1.6, 0);
        rightSpike.rotation.z = -0.3;
        group.add(rightSpike);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.4);
        headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.position.set(0, 1.75, 0.1);
        group.add(headMesh);

        // Heavy Fists
        const fistGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const leftArm = new THREE.Mesh(fistGeo, bodyMat);
        leftArm.position.set(-0.6, 1.1, 0);
        group.add(leftArm);
        limbs.push(leftArm);

        const rightArm = new THREE.Mesh(fistGeo, bodyMat);
        rightArm.position.set(0.6, 1.1, 0);
        group.add(rightArm);
        limbs.push(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.35, 0.7, 0.35);
        const leftLeg = new THREE.Mesh(legGeo, bodyMat);
        leftLeg.position.set(-0.25, 0.35, 0);
        group.add(leftLeg);
        limbs.push(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, bodyMat);
        rightLeg.position.set(0.25, 0.35, 0);
        group.add(rightLeg);
        limbs.push(rightLeg);
        break;
      }
    }

    return {
      entity,
      group,
      bodyMesh,
      headMesh,
      limbs,
      animTimer: 0,
    };
  }

  // Damage mob from player attack
  public damageMob(id: string, damage: number, knockbackDir: THREE.Vector3): boolean {
    const mob = this.mobs.get(id);
    if (!mob) return false;

    mob.entity.health -= damage;
    mob.entity.hurtTime = 0.3;

    // Apply knockback
    mob.entity.vx += knockbackDir.x * 6;
    mob.entity.vy += 3.5;
    mob.entity.vz += knockbackDir.z * 6;

    sound.playMobHurt(mob.entity.isHostile);
    this.particles.spawnHitSpark(mob.entity.x, mob.entity.y + 0.5, mob.entity.z, new THREE.Color(0xef4444));

    // Turn aggressive if hit
    mob.entity.targetPlayer = true;

    if (mob.entity.health <= 0) {
      // Mob died! Spawn drops & death particles
      this.particles.spawnDeathPuff(mob.entity.x, mob.entity.y + 0.5, mob.entity.z);

      mob.entity.drops.forEach(drop => {
        if (Math.random() <= drop.chance) {
          const count = Math.floor(drop.min + Math.random() * (drop.max - drop.min + 1));
          if (count > 0) {
            this.spawnDroppedItem(drop.itemId, count, mob.entity.x, mob.entity.y + 0.5, mob.entity.z);
          }
        }
      });

      this.scene.remove(mob.group);
      this.mobs.delete(id);
      return true;
    }

    return false;
  }

  // Update AI, animation, and physics for all entities
  public update(dt: number, playerX: number, playerY: number, playerZ: number): number {
    let playerDamageTaken = 0;

    // 1. UPDATE MOBS
    this.mobs.forEach(mob => {
      const e = mob.entity;
      mob.animTimer += dt;

      // Hurt flash
      if (e.hurtTime > 0) {
        e.hurtTime -= dt;
        (mob.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0xef4444);
      } else {
        // Reset color
        if (e.type === 'gryllos') (mob.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0xf5f5f4);
        else if (e.type === 'umbra_stalker') (mob.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0x18181b);
        else if (e.type === 'chitin_crawler') (mob.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0x0369a1);
        else if (e.type === 'crystalline_golem') (mob.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0x475569);
      }

      // Distance to player
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const dz = playerZ - e.z;
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);

      // Attack player check
      if (e.isHostile && distToPlayer < 14) {
        e.targetPlayer = true;
      }

      if (e.isHostile && distToPlayer < 1.3 && Math.abs(dy) < 1.5) {
        if (e.attackCooldown <= 0) {
          playerDamageTaken += e.damage;
          e.attackCooldown = 1.2;
          sound.playPlayerHurt();
        }
      }
      if (e.attackCooldown > 0) e.attackCooldown -= dt;

      // AI Movement
      if (e.targetPlayer && distToPlayer < 20) {
        // Chase player
        const targetYaw = Math.atan2(dx, dz);
        e.yaw = targetYaw;

        const moveSpeed = e.speed;
        e.vx = Math.sin(e.yaw) * moveSpeed;
        e.vz = Math.cos(e.yaw) * moveSpeed;

        // Jump over obstacles
        if (e.onGround && Math.random() < 0.05) {
          e.vy = 6.0;
          e.onGround = false;
        }
      } else {
        // Wander peacefully or stay idle
        if (Math.random() < 0.02) {
          e.yaw += (Math.random() - 0.5) * 2;
        }
        if (Math.random() < 0.03) {
          const wanderSpeed = e.speed * 0.4;
          e.vx = Math.sin(e.yaw) * wanderSpeed;
          e.vz = Math.cos(e.yaw) * wanderSpeed;
        } else {
          e.vx *= 0.9;
          e.vz *= 0.9;
        }
      }

      // Gravity & simple voxel collision for mobs
      if (e.type === 'luminis') {
        // Floating spirit: hovers smoothly up and down
        e.vy = Math.sin(mob.animTimer * 2) * 0.5;
        e.y += e.vy * dt;
      } else if (e.type === 'aqualis') {
        // Aquatic swimming
        e.vy = Math.sin(mob.animTimer * 3) * 0.4;
        e.y += e.vy * dt;
      } else {
        e.vy -= 18.0 * dt;
        e.y += e.vy * dt;

        // Voxel terrain check below feet
        const footBlock = this.world.getVoxelWorld(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z));
        if (footBlock !== BlockType.AIR && BLOCK_CONFIGS[footBlock]?.solid) {
          e.y = Math.floor(e.y) + 1;
          e.vy = 0;
          e.onGround = true;
        } else {
          e.onGround = false;
        }
      }

      e.x += e.vx * dt;
      e.z += e.vz * dt;

      // Update 3D model transforms
      mob.group.position.set(e.x, e.y, e.z);
      mob.group.rotation.y = e.yaw;

      // Limb swing animations
      const isMoving = Math.sqrt(e.vx * e.vx + e.vz * e.vz) > 0.1;
      if (isMoving) {
        const swing = Math.sin(mob.animTimer * 8) * 0.5;
        if (e.type === 'gryllos') {
          if (mob.limbs[0]) mob.limbs[0].rotation.x = swing;
          if (mob.limbs[1]) mob.limbs[1].rotation.x = -swing;
          if (mob.limbs[2]) mob.limbs[2].rotation.x = -swing;
          if (mob.limbs[3]) mob.limbs[3].rotation.x = swing;
        } else if (e.type === 'umbra_stalker' || e.type === 'crystalline_golem') {
          if (mob.limbs[0]) mob.limbs[0].rotation.x = swing;
          if (mob.limbs[1]) mob.limbs[1].rotation.x = -swing;
          if (mob.limbs[2]) mob.limbs[2].rotation.x = -swing;
          if (mob.limbs[3]) mob.limbs[3].rotation.x = swing;
        } else if (e.type === 'chitin_crawler') {
          mob.limbs.forEach((limb, idx) => {
            limb.rotation.z = Math.sin(mob.animTimer * 12 + idx) * 0.3;
          });
        }
      } else if (e.type === 'luminis') {
        // Flutter wings
        const flutter = Math.sin(mob.animTimer * 20) * 0.6;
        if (mob.limbs[0]) mob.limbs[0].rotation.z = flutter;
        if (mob.limbs[1]) mob.limbs[1].rotation.z = -flutter;
      } else if (e.type === 'aqualis') {
        // Wag tail fin
        if (mob.limbs[0]) mob.limbs[0].rotation.y = Math.sin(mob.animTimer * 8) * 0.5;
      }
    });

    // 2. UPDATE DROPPED ITEMS
    const collectedDrops: string[] = [];

    this.droppedItems.forEach((drop, id) => {
      const e = drop.entity;
      e.age += dt;
      if (e.pickupCooldown > 0) e.pickupCooldown -= dt;

      // Gravity & bobbing
      e.vy -= 14.0 * dt;
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      e.vx *= 0.95;
      e.vz *= 0.95;

      const groundBlock = this.world.getVoxelWorld(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z));
      if (groundBlock !== BlockType.AIR && BLOCK_CONFIGS[groundBlock]?.solid) {
        e.y = Math.floor(e.y) + 1;
        e.vy = 0;
      }

      // Floating rotation
      drop.mesh.position.set(e.x, e.y + Math.sin(e.age * 3) * 0.08 + 0.15, e.z);
      drop.mesh.rotation.y += 2.5 * dt;

      // Magnetic attraction to player if within 2.5 blocks
      const dx = playerX - e.x;
      const dy = (playerY + 0.5) - e.y;
      const dz = playerZ - e.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (e.pickupCooldown <= 0 && dist < 2.5) {
        const pullSpeed = 8.0;
        e.x += (dx / dist) * pullSpeed * dt;
        e.y += (dy / dist) * pullSpeed * dt;
        e.z += (dz / dist) * pullSpeed * dt;

        if (dist < 0.6) {
          collectedDrops.push(id);
        }
      }
    });

    return playerDamageTaken;
  }

  // Remove collected dropped item
  public removeDroppedItem(id: string) {
    const item = this.droppedItems.get(id);
    if (item) {
      this.scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      this.droppedItems.delete(id);
    }
  }

  // Spawn ambient mobs around player
  public manageSpawns(playerX: number, playerY: number, playerZ: number, isNight: boolean) {
    if (this.mobs.size >= 12) return;

    // Pick random spot around player (radius 15 to 30 blocks)
    const angle = Math.random() * Math.PI * 2;
    const radius = 16 + Math.random() * 12;
    const sx = Math.floor(playerX + Math.cos(angle) * radius);
    const sz = Math.floor(playerZ + Math.sin(angle) * radius);

    const biome = this.world.getBiome(sx, sz);
    const sy = this.world.getHeight(sx, sz, biome);

    if (sy < 16) return; // don't spawn in water unless aquatic

    if (isNight) {
      // Spawn hostile monsters at night
      const mobType = Math.random() < 0.6 ? 'umbra_stalker' : 'chitin_crawler';
      this.spawnMob(mobType, sx + 0.5, sy + 1, sz + 0.5);
    } else {
      // Spawn peaceful animals during day
      const rand = Math.random();
      if (rand < 0.5) {
        this.spawnMob('gryllos', sx + 0.5, sy + 1, sz + 0.5);
      } else if (rand < 0.8) {
        this.spawnMob('luminis', sx + 0.5, sy + 3, sz + 0.5);
      }
    }
  }
}

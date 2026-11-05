/**
 * Voxel Realms - Physics & Collision Engine
 * Swept AABB voxel collision, multi-substepping, wall-sliding, swimming, fall damage, and player bounds.
 */

import * as THREE from 'three';
import { BlockType } from '../types';
import { BLOCK_CONFIGS } from './items';
import { World } from './world';

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export class PhysicsEngine {
  public static readonly PLAYER_WIDTH = 0.6;
  public static readonly PLAYER_HEIGHT = 1.8;
  public static readonly EYE_HEIGHT = 1.62;
  public static readonly GRAVITY = 26.0;
  public static readonly WATER_GRAVITY = 6.0;
  public static readonly JUMP_FORCE = 8.5;
  public static readonly WALK_SPEED = 4.8;
  public static readonly SPRINT_SPEED = 7.2;
  public static readonly CROUCH_SPEED = 2.4;

  public static getPlayerAABB(x: number, y: number, z: number, height: number = PhysicsEngine.PLAYER_HEIGHT): AABB {
    const halfW = PhysicsEngine.PLAYER_WIDTH / 2;
    return {
      minX: x - halfW,
      minY: y,
      minZ: z - halfW,
      maxX: x + halfW,
      maxY: y + height,
      maxZ: z + halfW,
    };
  }

  public static intersects(a: AABB, b: AABB): boolean {
    return (
      a.minX < b.maxX &&
      a.maxX > b.minX &&
      a.minY < b.maxY &&
      a.maxY > b.minY &&
      a.minZ < b.maxZ &&
      a.maxZ > b.minZ
    );
  }

  // Checks if placing a block at (bx, by, bz) intersects the player
  public static blockIntersectsPlayer(bx: number, by: number, bz: number, px: number, py: number, pz: number): boolean {
    const playerBox = this.getPlayerAABB(px, py, pz);
    const blockBox: AABB = {
      minX: bx,
      minY: by,
      minZ: bz,
      maxX: bx + 1,
      maxY: by + 1,
      maxZ: bz + 1,
    };
    return this.intersects(playerBox, blockBox);
  }

  // Check if player is currently in water
  public static isInWater(world: World, px: number, py: number, pz: number): boolean {
    const feetBlock = world.getVoxelWorld(Math.floor(px), Math.floor(py + 0.2), Math.floor(pz));
    const waistBlock = world.getVoxelWorld(Math.floor(px), Math.floor(py + 0.9), Math.floor(pz));
    return feetBlock === BlockType.WATER || waistBlock === BlockType.WATER;
  }

  // Check if player's head is submerged (for drowning)
  public static isHeadUnderwater(world: World, px: number, py: number, pz: number): boolean {
    const headBlock = world.getVoxelWorld(Math.floor(px), Math.floor(py + PhysicsEngine.EYE_HEIGHT), Math.floor(pz));
    return headBlock === BlockType.WATER;
  }

  // Check if a block at (x, y, z) is solid
  public static isBlockSolid(world: World, x: number, y: number, z: number): boolean {
    const block = world.getVoxelWorld(x, y, z);
    if (block === BlockType.AIR || block === BlockType.WATER) return false;
    return Boolean(BLOCK_CONFIGS[block]?.solid);
  }

  // Unstuck helper: ensures the player does not stay inside solid terrain
  public static unstickPlayer(world: World, pos: THREE.Vector3, vel: THREE.Vector3): boolean {
    const pBox = this.getPlayerAABB(pos.x, pos.y, pos.z);
    const minBx = Math.floor(pBox.minX);
    const maxBx = Math.floor(pBox.maxX - 0.001);
    const minBy = Math.floor(pBox.minY + 0.05);
    const maxBy = Math.floor(pBox.maxY - 0.05);
    const minBz = Math.floor(pBox.minZ);
    const maxBz = Math.floor(pBox.maxZ - 0.001);

    let stuck = false;
    let highestSolidY = -1;

    for (let y = minBy; y <= maxBy; y++) {
      for (let x = minBx; x <= maxBx; x++) {
        for (let z = minBz; z <= maxBz; z++) {
          if (this.isBlockSolid(world, x, y, z)) {
            stuck = true;
            if (y > highestSolidY) {
              highestSolidY = y;
            }
          }
        }
      }
    }

    if (stuck && highestSolidY >= 0) {
      // Elevate player above the highest solid block they are trapped in
      pos.y = highestSolidY + 1.0;
      vel.y = 0;
      return true;
    }
    return false;
  }

  // Resolves player movement and collisions with voxel world with substepping
  public static updatePlayerMovement(
    world: World,
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    moveInput: THREE.Vector2,
    yaw: number,
    isJumping: boolean,
    isSprinting: boolean,
    dt: number,
    isCrouching: boolean = false
  ): { onGround: boolean; fallDamage: number; inWater: boolean; headUnderwater: boolean } {
    const inWater = this.isInWater(world, pos.x, pos.y, pos.z);
    const headUnderwater = this.isHeadUnderwater(world, pos.x, pos.y, pos.z);

    // Initial check for getting stuck inside terrain (e.g. after spawn or block edit)
    this.unstickPlayer(world, pos, vel);

    // Speed calculation
    let currentSpeed = PhysicsEngine.WALK_SPEED;
    if (isCrouching) {
      currentSpeed = PhysicsEngine.CROUCH_SPEED;
    } else if (isSprinting) {
      currentSpeed = PhysicsEngine.SPRINT_SPEED;
    }
    if (inWater) currentSpeed *= 0.55;

    // Movement vector relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const wishDir = new THREE.Vector3()
      .addScaledVector(forward, moveInput.y)
      .addScaledVector(right, moveInput.x);

    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
    }

    // Horizontal acceleration
    const accel = inWater ? 15.0 : 40.0;
    const targetVx = wishDir.x * currentSpeed;
    const targetVz = wishDir.z * currentSpeed;

    vel.x += (targetVx - vel.x) * Math.min(1, accel * dt);
    vel.z += (targetVz - vel.z) * Math.min(1, accel * dt);

    // Vertical physics
    if (inWater) {
      if (isJumping) {
        vel.y = 3.5; // swim up
      } else if (isCrouching) {
        vel.y = -3.0; // swim down
      } else {
        vel.y = Math.max(-2.5, vel.y - PhysicsEngine.WATER_GRAVITY * dt);
      }
    } else {
      vel.y -= PhysicsEngine.GRAVITY * dt;
      if (vel.y < -35.0) vel.y = -35.0; // Terminal velocity
    }

    let onGround = false;
    let fallDamage = 0;
    const prevVy = vel.y;

    // Sub-stepping to prevent tunneling through blocks at high speeds
    const totalDisplacement = Math.sqrt(
      (vel.x * dt) * (vel.x * dt) +
      (vel.y * dt) * (vel.y * dt) +
      (vel.z * dt) * (vel.z * dt)
    );
    const maxSubStepDist = 0.25; // max 0.25 block per sub-step
    const subSteps = Math.max(1, Math.min(8, Math.ceil(totalDisplacement / maxSubStepDist)));
    const subDt = dt / subSteps;

    const playerHeight = isCrouching ? 1.5 : PhysicsEngine.PLAYER_HEIGHT;
    const halfW = PhysicsEngine.PLAYER_WIDTH / 2;
    const EPS = 0.001;

    for (let step = 0; step < subSteps; step++) {
      // 1. COLLISION & MOVEMENT ALONG Y AXIS
      let dy = vel.y * subDt;
      if (Math.abs(dy) > 0) {
        const pMinX = pos.x - halfW;
        const pMaxX = pos.x + halfW;
        const pMinZ = pos.z - halfW;
        const pMaxZ = pos.z + halfW;

        const checkMinX = Math.floor(pMinX);
        const checkMaxX = Math.floor(pMaxX - EPS);
        const checkMinZ = Math.floor(pMinZ);
        const checkMaxZ = Math.floor(pMaxZ - EPS);

        if (dy < 0) {
          // Falling down: check blocks underneath
          const startY = Math.floor(pos.y + dy);
          const endY = Math.floor(pos.y);

          for (let by = endY; by >= startY; by--) {
            let hit = false;
            for (let bx = checkMinX; bx <= checkMaxX; bx++) {
              for (let bz = checkMinZ; bz <= checkMaxZ; bz++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetY = by + 1.0;
              if (pos.y + dy < targetY) {
                dy = targetY - pos.y;
                vel.y = 0;
                onGround = true;
              }
              break;
            }
          }
        } else if (dy > 0) {
          // Jumping up: check ceiling blocks
          const startY = Math.floor(pos.y + playerHeight);
          const endY = Math.floor(pos.y + playerHeight + dy);

          for (let by = startY; by <= endY; by++) {
            let hit = false;
            for (let bx = checkMinX; bx <= checkMaxX; bx++) {
              for (let bz = checkMinZ; bz <= checkMaxZ; bz++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetY = by - playerHeight;
              if (pos.y + dy > targetY) {
                dy = targetY - pos.y;
                vel.y = 0;
              }
              break;
            }
          }
        }

        pos.y += dy;
      }

      // 2. COLLISION & MOVEMENT ALONG X AXIS
      let dx = vel.x * subDt;
      if (Math.abs(dx) > 0) {
        const pMinY = pos.y + EPS;
        const pMaxY = pos.y + playerHeight - EPS;
        const pMinZ = pos.z - halfW;
        const pMaxZ = pos.z + halfW;

        const checkMinY = Math.floor(pMinY);
        const checkMaxY = Math.floor(pMaxY);
        const checkMinZ = Math.floor(pMinZ);
        const checkMaxZ = Math.floor(pMaxZ - EPS);

        if (dx > 0) {
          // Moving +X
          const startX = Math.floor(pos.x + halfW);
          const endX = Math.floor(pos.x + halfW + dx);

          for (let bx = startX; bx <= endX; bx++) {
            let hit = false;
            for (let by = checkMinY; by <= checkMaxY; by++) {
              for (let bz = checkMinZ; bz <= checkMaxZ; bz++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetX = bx - halfW;
              if (pos.x + dx > targetX) {
                dx = Math.max(0, targetX - pos.x);
                vel.x = 0;
              }
              break;
            }
          }
        } else if (dx < 0) {
          // Moving -X
          const startX = Math.floor(pos.x - halfW);
          const endX = Math.floor(pos.x - halfW + dx);

          for (let bx = startX; bx >= endX; bx--) {
            let hit = false;
            for (let by = checkMinY; by <= checkMaxY; by++) {
              for (let bz = checkMinZ; bz <= checkMaxZ; bz++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetX = bx + 1.0 + halfW;
              if (pos.x + dx < targetX) {
                dx = Math.min(0, targetX - pos.x);
                vel.x = 0;
              }
              break;
            }
          }
        }

        pos.x += dx;
      }

      // 3. COLLISION & MOVEMENT ALONG Z AXIS
      let dz = vel.z * subDt;
      if (Math.abs(dz) > 0) {
        const pMinY = pos.y + EPS;
        const pMaxY = pos.y + playerHeight - EPS;
        const pMinX = pos.x - halfW;
        const pMaxX = pos.x + halfW;

        const checkMinY = Math.floor(pMinY);
        const checkMaxY = Math.floor(pMaxY);
        const checkMinX = Math.floor(pMinX);
        const checkMaxX = Math.floor(pMaxX - EPS);

        if (dz > 0) {
          // Moving +Z
          const startZ = Math.floor(pos.z + halfW);
          const endZ = Math.floor(pos.z + halfW + dz);

          for (let bz = startZ; bz <= endZ; bz++) {
            let hit = false;
            for (let by = checkMinY; by <= checkMaxY; by++) {
              for (let bx = checkMinX; bx <= checkMaxX; bx++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetZ = bz - halfW;
              if (pos.z + dz > targetZ) {
                dz = Math.max(0, targetZ - pos.z);
                vel.z = 0;
              }
              break;
            }
          }
        } else if (dz < 0) {
          // Moving -Z
          const startZ = Math.floor(pos.z - halfW);
          const endZ = Math.floor(pos.z - halfW + dz);

          for (let bz = startZ; bz >= endZ; bz--) {
            let hit = false;
            for (let by = checkMinY; by <= checkMaxY; by++) {
              for (let bx = checkMinX; bx <= checkMaxX; bx++) {
                if (this.isBlockSolid(world, bx, by, bz)) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }

            if (hit) {
              const targetZ = bz + 1.0 + halfW;
              if (pos.z + dz < targetZ) {
                dz = Math.min(0, targetZ - pos.z);
                vel.z = 0;
              }
              break;
            }
          }
        }

        pos.z += dz;
      }
    }

    // Check if player is standing on ground
    const groundCheckAABB = this.getPlayerAABB(pos.x, pos.y - 0.05, pos.z, 0.1);
    const gMinX = Math.floor(groundCheckAABB.minX);
    const gMaxX = Math.floor(groundCheckAABB.maxX - EPS);
    const gMinZ = Math.floor(groundCheckAABB.minZ);
    const gMaxZ = Math.floor(groundCheckAABB.maxZ - EPS);
    const gY = Math.floor(pos.y - 0.05);

    let hasGround = false;
    for (let bx = gMinX; bx <= gMaxX; bx++) {
      for (let bz = gMinZ; bz <= gMaxZ; bz++) {
        if (this.isBlockSolid(world, bx, gY, bz)) {
          hasGround = true;
          break;
        }
      }
      if (hasGround) break;
    }

    if (hasGround) {
      onGround = true;
      if (vel.y < 0) vel.y = 0;
      // Fall damage check
      if (prevVy < -14.0 && !inWater) {
        const damage = Math.floor((-prevVy - 12.0) * 1.5);
        if (damage > 0) {
          fallDamage = damage;
        }
      }
    }

    // Handle Jump if on ground
    if (onGround && isJumping && !inWater) {
      vel.y = PhysicsEngine.JUMP_FORCE;
      onGround = false;
    }

    // Final safety depenetration
    this.unstickPlayer(world, pos, vel);

    return { onGround, fallDamage, inWater, headUnderwater };
  }
}

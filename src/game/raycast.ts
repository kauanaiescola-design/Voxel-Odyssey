/**
 * Voxel Realms - Fast Voxel Raycaster
 * Amanatides & Woo Fast Voxel Traversal Algorithm for pixel-perfect block selection.
 */

import * as THREE from 'three';
import { BlockType } from '../types';
import { BLOCK_CONFIGS } from './items';
import { World } from './world';

export interface VoxelRaycastHit {
  hit: boolean;
  blockPos: THREE.Vector3;
  placePos: THREE.Vector3;
  faceNormal: THREE.Vector3;
  blockType: BlockType;
  distance: number;
}

export function raycastVoxel(
  world: World,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number = 5.5
): VoxelRaycastHit | null {
  const dir = direction.clone().normalize();

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(dir.x);
  const stepY = Math.sign(dir.y);
  const stepZ = Math.sign(dir.z);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;

  let tMaxX = stepX > 0 ? (Math.floor(origin.x) + 1 - origin.x) * tDeltaX : (origin.x - Math.floor(origin.x)) * tDeltaX;
  let tMaxY = stepY > 0 ? (Math.floor(origin.y) + 1 - origin.y) * tDeltaY : (origin.y - Math.floor(origin.y)) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (Math.floor(origin.z) + 1 - origin.z) * tDeltaZ : (origin.z - Math.floor(origin.z)) * tDeltaZ;

  let normal = new THREE.Vector3();
  let dist = 0;

  while (dist < maxDistance) {
    const block = world.getVoxelWorld(x, y, z);
    const config = BLOCK_CONFIGS[block];

    // Solid or non-air/non-water block hit
    if (block !== BlockType.AIR && block !== BlockType.WATER && (config?.solid || block === BlockType.TORCH)) {
      return {
        hit: true,
        blockPos: new THREE.Vector3(x, y, z),
        placePos: new THREE.Vector3(x + normal.x, y + normal.y, z + normal.z),
        faceNormal: normal.clone(),
        blockType: block,
        distance: dist,
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        normal.set(-stepX, 0, 0);
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        normal.set(0, 0, -stepZ);
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        normal.set(0, -stepY, 0);
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        normal.set(0, 0, -stepZ);
      }
    }
  }

  return null;
}

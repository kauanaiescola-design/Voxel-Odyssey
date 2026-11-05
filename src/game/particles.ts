/**
 * Voxel Realms - Particle System
 * Manages 3D voxel particles for block breaking, splashes, sparks, and death puffs.
 */

import * as THREE from 'three';
import { BlockType } from '../types';
import { BLOCK_CONFIGS } from './items';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private cubeGeo: THREE.BoxGeometry;

  constructor() {
    this.group = new THREE.Group();
    this.cubeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  }

  public spawnBlockBreak(x: number, y: number, z: number, block: BlockType) {
    const config = BLOCK_CONFIGS[block];
    const colorHex = config?.color || '#a8a29e';
    const color = new THREE.Color(colorHex);

    const count = 10;
    for (let i = 0; i < count; i++) {
      // Add slight color variation
      const pColor = color.clone().offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.15);
      const mat = new THREE.MeshLambertMaterial({ color: pColor });
      const mesh = new THREE.Mesh(this.cubeGeo, mat);

      mesh.position.set(
        x + 0.5 + (Math.random() - 0.5) * 0.6,
        y + 0.5 + (Math.random() - 0.5) * 0.6,
        z + 0.5 + (Math.random() - 0.5) * 0.6
      );

      const speed = 2.5 + Math.random() * 2.0;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * (Math.random() * speed);
      const vz = Math.sin(angle) * (Math.random() * speed);
      const vy = 1.5 + Math.random() * 3.0;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        gravity: 9.8,
      });
    }
  }

  public spawnHitSpark(x: number, y: number, z: number, color: THREE.Color = new THREE.Color('#facc15')) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color });
      const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(x, y, z);
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 4 + 2;
      const vz = (Math.random() - 0.5) * 4;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: 0.25,
        gravity: 5,
      });
    }
  }

  public spawnDeathPuff(x: number, y: number, z: number) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xf1f5f9),
        transparent: true,
        opacity: 0.8,
      });
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5);

      const vx = (Math.random() - 0.5) * 2.5;
      const vy = Math.random() * 2 + 1;
      const vz = (Math.random() - 0.5) * 2.5;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: 0.6,
        gravity: -1.0, // floats upward
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      p.mesh.rotation.x += 4 * dt;
      p.mesh.rotation.y += 6 * dt;

      const scale = 1 - (p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);
    }
  }
}

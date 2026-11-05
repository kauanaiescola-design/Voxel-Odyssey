/**
 * Voxel Realms - Dynamic Atmosphere & Day/Night Cycle
 * Sun/Moon celestial movement, atmospheric fog, ambient transitions, and starry night sky.
 */

import * as THREE from 'three';

export interface DayNightColors {
  sky: THREE.Color;
  fog: THREE.Color;
  sunLight: THREE.Color;
  ambientLight: THREE.Color;
  lightIntensity: number;
}

export class EnvironmentManager {
  public scene: THREE.Scene;
  public timeOfDay: number = 0.2; // 0.0 to 1.0 (0.25 = noon, 0.75 = midnight)
  public timeScale: number = 1 / 1200; // default 20 minutes per full cycle (1200 seconds)

  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public torchPointLight: THREE.PointLight;

  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public starField: THREE.Points;
  public cloudGroup: THREE.Group;
  private cloudMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Directional Sun/Moon Light with warm radiant sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.sunLight.castShadow = false; // keep performance high
    this.scene.add(this.sunLight);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xe0f2fe, 0.55);
    this.scene.add(this.ambientLight);

    // Player Torch point light (lights up caves & night when holding or placing torches)
    this.torchPointLight = new THREE.PointLight(0xfbbf24, 0, 18, 1.6);
    this.scene.add(this.torchPointLight);

    // Sun Mesh (celestial glowing square billboard)
    const sunGeo = new THREE.PlaneGeometry(16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon Mesh (silver celestial square billboard)
    const moonGeo = new THREE.PlaneGeometry(12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, side: THREE.DoubleSide });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Starfield Points
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10; // upper hemisphere
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0,
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    // Volumetric Voxel Clouds at altitude 48
    this.cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    // Generate clusters of stylized flat voxel cloud sheets
    const cloudGeos = [
      new THREE.BoxGeometry(28, 4, 18),
      new THREE.BoxGeometry(36, 4, 24),
      new THREE.BoxGeometry(20, 4, 20),
      new THREE.BoxGeometry(42, 4, 16),
      new THREE.BoxGeometry(24, 4, 30),
    ];

    for (let i = 0; i < 28; i++) {
      const geo = cloudGeos[i % cloudGeos.length];
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(
        (Math.random() - 0.5) * 400,
        48 + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 400
      );
      this.cloudMeshes.push(mesh);
      this.cloudGroup.add(mesh);
    }
    this.scene.add(this.cloudGroup);

    // Balanced scenic fog (Clear visibility with soft horizon fade)
    this.scene.fog = new THREE.Fog(0x93c5fd, 55, 130);
  }

  public isNight(): boolean {
    return this.timeOfDay > 0.52 && this.timeOfDay < 0.98;
  }

  public getTimeString(): string {
    // Convert 0.0 - 1.0 to 24h clock: 0.0 = 06:00 (dawn)
    const totalMinutes = Math.floor(((this.timeOfDay + 0.25) % 1.0) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  public update(dt: number, playerX: number, playerY: number, playerZ: number, isHoldingTorch: boolean) {
    this.timeOfDay = (this.timeOfDay + this.timeScale * dt) % 1.0;

    // Celestial angle (0 = dawn, PI/2 = noon, PI = dusk, 3PI/2 = midnight)
    const sunAngle = this.timeOfDay * Math.PI * 2;

    const sunDist = 120;
    const sunX = playerX + Math.cos(sunAngle) * sunDist;
    const sunY = playerY + Math.sin(sunAngle) * sunDist;
    const sunZ = playerZ + 30;

    const moonX = playerX - Math.cos(sunAngle) * sunDist;
    const moonY = playerY - Math.sin(sunAngle) * sunDist;
    const moonZ = playerZ - 30;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunMesh.lookAt(playerX, playerY, playerZ);

    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonMesh.lookAt(playerX, playerY, playerZ);

    this.starField.position.set(playerX, playerY, playerZ);

    // Slowly drift clouds across the horizon
    const cloudSpeed = 2.5;
    for (const cloud of this.cloudMeshes) {
      cloud.position.x += cloudSpeed * dt;
      if (cloud.position.x > playerX + 220) {
        cloud.position.x = playerX - 220;
        cloud.position.z = playerZ + (Math.random() - 0.5) * 400;
      }
    }

    // Compute Sky and Ambient Color Curves
    const colors = this.calculateAtmosphere(this.timeOfDay);

    this.scene.background = colors.sky;
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(colors.fog);
    }

    // Tint clouds according to time of day
    if (this.isNight()) {
      (this.cloudMeshes[0]?.material as THREE.MeshBasicMaterial)?.color.setHex(0x334155);
    } else if (this.timeOfDay >= 0.45 && this.timeOfDay < 0.55) {
      (this.cloudMeshes[0]?.material as THREE.MeshBasicMaterial)?.color.setHex(0xfda4af);
    } else {
      (this.cloudMeshes[0]?.material as THREE.MeshBasicMaterial)?.color.setHex(0xffffff);
    }

    // Directional light position: from sun during day, from moon during night
    if (sunY > playerY - 10) {
      this.sunLight.position.set(sunX, sunY, sunZ);
      this.sunLight.color.copy(colors.sunLight);
      this.sunLight.intensity = colors.lightIntensity;
    } else {
      this.sunLight.position.set(moonX, moonY, moonZ);
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.25;
    }

    this.ambientLight.color.copy(colors.ambientLight);
    this.ambientLight.intensity = this.isNight() ? 0.2 : 0.45;

    // Star opacity
    const starOpacity = Math.max(0, Math.min(1, (Math.sin(sunAngle - Math.PI / 2) + 0.2) * 1.5));
    (this.starField.material as THREE.PointsMaterial).opacity = starOpacity;

    // Player torch lighting
    if (isHoldingTorch) {
      this.torchPointLight.position.set(playerX, playerY + 1.2, playerZ);
      this.torchPointLight.intensity = 1.6;
    } else {
      this.torchPointLight.intensity = 0;
    }
  }

  private calculateAtmosphere(t: number): DayNightColors {
    // 0.0 = Sunrise (6am)
    // 0.25 = Noon (12pm)
    // 0.5 = Sunset (6pm)
    // 0.75 = Midnight (12am)

    const sky = new THREE.Color();
    const fog = new THREE.Color();
    const sunLight = new THREE.Color();
    const ambientLight = new THREE.Color();
    let lightIntensity = 1.0;

    if (t >= 0.0 && t < 0.15) {
      // Dawn / Sunrise
      const factor = t / 0.15;
      sky.setRGB(0.1 + factor * 0.35, 0.1 + factor * 0.55, 0.2 + factor * 0.65);
      fog.setRGB(0.85, 0.55, 0.45);
      sunLight.setRGB(1.0, 0.8, 0.6);
      ambientLight.setRGB(0.5, 0.4, 0.45);
      lightIntensity = 0.5 + factor * 0.6;
    } else if (t >= 0.15 && t < 0.45) {
      // Full bright Day (Classic Minecraft Blue Sky & Warm Daylight)
      sky.setRGB(0.46, 0.68, 0.98);
      fog.setRGB(0.72, 0.84, 0.98);
      sunLight.setRGB(1.0, 0.98, 0.92);
      ambientLight.setRGB(0.72, 0.78, 0.88);
      lightIntensity = 1.35;
    } else if (t >= 0.45 && t < 0.55) {
      // Sunset / Dusk
      const factor = (t - 0.45) / 0.1;
      sky.setRGB(0.48 - factor * 0.4, 0.78 - factor * 0.65, 0.98 - factor * 0.75);
      fog.setRGB(0.95, 0.45, 0.25); // Fiery sunset horizon
      sunLight.setRGB(1.0, 0.5, 0.2);
      ambientLight.setRGB(0.55, 0.35, 0.3);
      lightIntensity = 1.1 - factor * 0.8;
    } else {
      // Night
      sky.setRGB(0.04, 0.06, 0.12); // Deep celestial indigo
      fog.setRGB(0.06, 0.08, 0.16);
      sunLight.setRGB(0.4, 0.5, 0.8); // Pale moon glow
      ambientLight.setRGB(0.15, 0.18, 0.28);
      lightIntensity = 0.25;
    }

    return { sky, fog, sunLight, ambientLight, lightIntensity };
  }
}

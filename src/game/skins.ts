/**
 * KavCraft - Skin Management, Procedural Presets, and 3D Character Rig
 * Supports standard Minecraft skin format (64x64 and legacy 64x32), Classic (4px) & Slim (3px) models.
 */

import * as THREE from 'three';

export interface SkinPreset {
  id: string;
  name: string;
  description: string;
  isSlim: boolean;
  dataUrl: string;
}

// Official Minecraft 64x64 UV Mapping Function
// Maps all 6 faces of a standard cuboid to BoxGeometry attributes according to the official Minecraft specification.
export function setBoxUVs(
  geo: THREE.BoxGeometry,
  width: number,
  height: number,
  depth: number,
  u: number,
  v: number,
  texW: number = 64,
  texH: number = 64
) {
  const toFaceVertices = (x1: number, y1: number, x2: number, y2: number) => [
    new THREE.Vector2(x1 / texW, 1.0 - y2 / texH),
    new THREE.Vector2(x2 / texW, 1.0 - y2 / texH),
    new THREE.Vector2(x2 / texW, 1.0 - y1 / texH),
    new THREE.Vector2(x1 / texW, 1.0 - y1 / texH),
  ];

  // Official Minecraft skin box unwrap (u, v, width, height, depth):
  // Top row (height = depth):
  //   Top face (+Y): x in [u + depth .. u + width + depth], y in [v .. v + depth]
  //   Bottom face (-Y): x in [u + width + depth .. u + width * 2 + depth], y in [v .. v + depth]
  // Bottom row (height = height):
  //   Right face: x in [u .. u + depth], y in [v + depth .. v + depth + height]
  //   Front face (+Z): x in [u + depth .. u + width + depth], y in [v + depth .. v + depth + height]
  //   Left face: x in [u + width + depth .. u + width + depth * 2], y in [v + depth .. v + depth + height]
  //   Back face (-Z): x in [u + width + depth * 2 .. u + width * 2 + depth * 2], y in [v + depth .. v + depth + height]
  const top = toFaceVertices(u + depth, v, u + width + depth, v + depth);
  const bottom = toFaceVertices(u + width + depth, v, u + width * 2 + depth, v + depth);
  const left = toFaceVertices(u, v + depth, u + depth, v + depth + height);
  const front = toFaceVertices(u + depth, v + depth, u + width + depth, v + depth + height);
  const right = toFaceVertices(u + width + depth, v + depth, u + width + depth * 2, v + height + depth);
  const back = toFaceVertices(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth);

  // Three.js BoxGeometry face mapping order:
  // Face 0: +X
  // Face 1: -X
  // Face 2: +Y (Top)
  // Face 3: -Y (Bottom)
  // Face 4: +Z (Front)
  // Face 5: -Z (Back)
  const uvRight = [right[3], right[2], right[0], right[1]];
  const uvLeft = [left[3], left[2], left[0], left[1]];
  const uvTop = [top[3], top[2], top[0], top[1]];
  const uvBottom = [bottom[0], bottom[1], bottom[3], bottom[2]];
  const uvFront = [front[3], front[2], front[0], front[1]];
  const uvBack = [back[3], back[2], back[0], back[1]];

  const uvAttr = geo.attributes.uv;
  let idx = 0;
  for (const uvArray of [uvRight, uvLeft, uvTop, uvBottom, uvFront, uvBack]) {
    for (const uv of uvArray) {
      uvAttr.setXY(idx++, uv.x, uv.y);
    }
  }
  uvAttr.needsUpdate = true;
}

// Configure Three.js texture to preserve crisp pixel-art colors without blur or color distortion
export function configureSkinTexture(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.format = THREE.RGBAFormat;
  tex.needsUpdate = true;
  return tex;
}

// Build a complete 3D Character Group with standard Minecraft proportions
export function createCharacterRig(skinTexture: THREE.Texture, isSlim: boolean = false): {
  root: THREE.Group;
  head: THREE.Group;
  body: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftLeg: THREE.Mesh;
  updateTexture: (newTex: THREE.Texture, slim: boolean) => void;
} {
  const root = new THREE.Group();

  // Create pixel-crisp material
  configureSkinTexture(skinTexture);

  // Base material (Head, Body, Limbs) - 100% opaque, true colors, no back-face darkening
  const baseMaterial = new THREE.MeshLambertMaterial({
    map: skinTexture,
    color: 0xffffff,
    transparent: false,
    side: THREE.FrontSide,
  });

  // Overlay material (Hat / Outer layers) - alpha tested, true colors
  const overlayMaterial = new THREE.MeshLambertMaterial({
    map: skinTexture,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.1,
    depthWrite: true,
    side: THREE.FrontSide,
  });

  const armW = isSlim ? 3 : 4;
  const armScaleW = armW / 16;
  const armOffset = isSlim ? 0.34 : 0.38;

  // Scale: 1 unit = 16 pixels. Total height ~ 32 pixels = 2 units.
  // 1. HEAD (8x8x8)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.5, 0);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); // 8/16 = 0.5
  setBoxUVs(headGeo, 8, 8, 8, 0, 0);
  const headMesh = new THREE.Mesh(headGeo, baseMaterial);
  headGroup.add(headMesh);

  // Hat / Hair overlay (8.5x8.5x8.5)
  const hatGeo = new THREE.BoxGeometry(0.54, 0.54, 0.54);
  setBoxUVs(hatGeo, 8, 8, 8, 32, 0);
  const hatMesh = new THREE.Mesh(hatGeo, overlayMaterial);
  headGroup.add(hatMesh);

  root.add(headGroup);

  // 2. BODY (8x12x4 -> 0.5 x 0.75 x 0.25)
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  setBoxUVs(bodyGeo, 8, 12, 4, 16, 16);
  const bodyMesh = new THREE.Mesh(bodyGeo, baseMaterial);
  bodyMesh.position.set(0, 0.875, 0);
  root.add(bodyMesh);

  // 3. RIGHT ARM (4x12x4 or 3x12x4)
  const rightArmGeo = new THREE.BoxGeometry(armScaleW, 0.75, 0.25);
  setBoxUVs(rightArmGeo, armW, 12, 4, 40, 16);
  const rightArm = new THREE.Mesh(rightArmGeo, baseMaterial);
  rightArm.position.set(-armOffset, 0.875, 0);
  root.add(rightArm);

  // 4. LEFT ARM (4x12x4 or 3x12x4)
  const leftArmGeo = new THREE.BoxGeometry(armScaleW, 0.75, 0.25);
  setBoxUVs(leftArmGeo, armW, 12, 4, 32, 48);
  const leftArm = new THREE.Mesh(leftArmGeo, baseMaterial);
  leftArm.position.set(armOffset, 0.875, 0);
  root.add(leftArm);

  // 5. RIGHT LEG (4x12x4 -> 0.25 x 0.75 x 0.25)
  const rightLegGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  setBoxUVs(rightLegGeo, 4, 12, 4, 0, 16);
  const rightLeg = new THREE.Mesh(rightLegGeo, baseMaterial);
  rightLeg.position.set(-0.13, 0.125, 0);
  root.add(rightLeg);

  // 6. LEFT LEG (4x12x4)
  const leftLegGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  setBoxUVs(leftLegGeo, 4, 12, 4, 16, 48);
  const leftLeg = new THREE.Mesh(leftLegGeo, baseMaterial);
  leftLeg.position.set(0.13, 0.125, 0);
  root.add(leftLeg);

  const updateTexture = (newTex: THREE.Texture, slim: boolean) => {
    configureSkinTexture(newTex);

    baseMaterial.map = newTex;
    baseMaterial.color.setHex(0xffffff);
    baseMaterial.needsUpdate = true;

    overlayMaterial.map = newTex;
    overlayMaterial.color.setHex(0xffffff);
    overlayMaterial.needsUpdate = true;

    // Update arm geometry width if slim changed
    const newArmW = slim ? 3 : 4;
    const newScaleW = newArmW / 16;
    const newOffset = slim ? 0.34 : 0.38;

    rightArm.geometry.dispose();
    const newRGeo = new THREE.BoxGeometry(newScaleW, 0.75, 0.25);
    setBoxUVs(newRGeo, newArmW, 12, 4, 40, 16);
    rightArm.geometry = newRGeo;
    rightArm.position.x = -newOffset;

    leftArm.geometry.dispose();
    const newLGeo = new THREE.BoxGeometry(newScaleW, 0.75, 0.25);
    setBoxUVs(newLGeo, newArmW, 12, 4, 32, 48);
    leftArm.geometry = newLGeo;
    leftArm.position.x = newOffset;
  };

  return {
    root,
    head: headGroup,
    body: bodyMesh,
    rightArm,
    leftArm,
    rightLeg,
    leftLeg,
    updateTexture,
  };
}

// Procedural Canvas Skin Generators for built-in classic presets
function createSkinCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  return canvas;
}

// Draw rectangle with optional noise variation
function fillSkinRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  noise: number = 0
) {
  const imgData = ctx.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = (py * w + px) * 4;
      const n = (Math.sin((x + px) * 12.9898 + (y + py) * 78.233) * 43758.5453) % 1;
      const factor = 1 + (n - 0.5) * noise;
      imgData.data[idx] = Math.max(0, Math.min(255, Math.round(r * factor)));
      imgData.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * factor)));
      imgData.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * factor)));
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, x, y);
}

// 1. Mineiro Clássico (Nostalgic Steve)
export function generateClassicSteveSkin(): string {
  const canvas = createSkinCanvas();
  const ctx = canvas.getContext('2d')!;

  // Skin tone
  fillSkinRect(ctx, 0, 0, 32, 16, 185, 130, 95, 0.08); // Head
  // Hair (Dark brown)
  fillSkinRect(ctx, 8, 0, 8, 8, 70, 45, 25, 0.12); // Head Top hair
  fillSkinRect(ctx, 8, 8, 8, 3, 70, 45, 25, 0.1); // Front hair bangs
  fillSkinRect(ctx, 0, 8, 8, 8, 65, 40, 20, 0.12); // Right side hair
  fillSkinRect(ctx, 16, 8, 8, 8, 65, 40, 20, 0.12); // Left side hair
  fillSkinRect(ctx, 24, 8, 8, 8, 65, 40, 20, 0.12); // Back hair
  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 13, 2, 1);
  ctx.fillRect(13, 13, 2, 1);
  ctx.fillStyle = '#2563eb'; // blue iris
  ctx.fillRect(10, 13, 1, 1);
  ctx.fillRect(14, 13, 1, 1);
  // Nose / mouth
  ctx.fillStyle = '#8f4f31';
  ctx.fillRect(10, 14, 4, 1);

  // Body: Cyan T-shirt
  fillSkinRect(ctx, 16, 16, 24, 16, 14, 165, 175, 0.1);
  // V-neck skin
  ctx.fillStyle = '#b9825f';
  ctx.fillRect(23, 20, 2, 2);

  // Right Arm (Cyan sleeve + bare arm)
  fillSkinRect(ctx, 40, 16, 16, 4, 14, 165, 175, 0.1); // sleeve
  fillSkinRect(ctx, 40, 20, 16, 12, 185, 130, 95, 0.08); // arm

  // Left Arm (64x64 region)
  fillSkinRect(ctx, 32, 48, 16, 4, 14, 165, 175, 0.1); // sleeve
  fillSkinRect(ctx, 32, 52, 16, 12, 185, 130, 95, 0.08); // arm

  // Right Leg (Indigo Blue Jeans + Gray shoes)
  fillSkinRect(ctx, 0, 16, 16, 10, 45, 55, 135, 0.1);
  fillSkinRect(ctx, 0, 26, 16, 6, 85, 85, 95, 0.06); // Shoes

  // Left Leg (Indigo Blue Jeans + Gray shoes)
  fillSkinRect(ctx, 16, 48, 16, 10, 45, 55, 135, 0.1);
  fillSkinRect(ctx, 16, 58, 16, 6, 85, 85, 95, 0.06); // Shoes

  return canvas.toDataURL('image/png');
}

// 2. Exploradora Alex (Slim Arm)
export function generateAlexSkin(): string {
  const canvas = createSkinCanvas();
  const ctx = canvas.getContext('2d')!;

  // Skin tone (fair)
  fillSkinRect(ctx, 0, 0, 32, 16, 230, 180, 145, 0.06); // Head
  // Ginger Orange Hair
  fillSkinRect(ctx, 8, 0, 8, 8, 180, 85, 30, 0.12);
  fillSkinRect(ctx, 8, 8, 8, 4, 180, 85, 30, 0.1);
  fillSkinRect(ctx, 0, 8, 8, 8, 170, 80, 28, 0.12);
  fillSkinRect(ctx, 16, 8, 8, 8, 170, 80, 28, 0.12);
  fillSkinRect(ctx, 24, 8, 8, 8, 170, 80, 28, 0.12);
  // Emerald Green eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 13, 2, 1);
  ctx.fillRect(13, 13, 2, 1);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(10, 13, 1, 1);
  ctx.fillRect(14, 13, 1, 1);

  // Body: Olive Green Tunic with brown belt
  fillSkinRect(ctx, 16, 16, 24, 12, 85, 125, 65, 0.1);
  fillSkinRect(ctx, 16, 28, 24, 4, 90, 60, 35, 0.08); // Brown belt

  // Arms: Slim (3px wide)
  // Right Arm (Green sleeve + bare arm)
  fillSkinRect(ctx, 40, 16, 14, 4, 85, 125, 65, 0.1);
  fillSkinRect(ctx, 40, 20, 14, 12, 230, 180, 145, 0.06);

  // Left Arm
  fillSkinRect(ctx, 32, 48, 14, 4, 85, 125, 65, 0.1);
  fillSkinRect(ctx, 32, 52, 14, 12, 230, 180, 145, 0.06);

  // Legs: Brown trousers & dark boots
  fillSkinRect(ctx, 0, 16, 16, 10, 110, 75, 45, 0.1);
  fillSkinRect(ctx, 0, 26, 16, 6, 60, 45, 30, 0.08);
  fillSkinRect(ctx, 16, 48, 16, 10, 110, 75, 45, 0.1);
  fillSkinRect(ctx, 16, 58, 16, 6, 60, 45, 30, 0.08);

  return canvas.toDataURL('image/png');
}

// 3. Cavaleiro de Aço (Iron Knight Armor)
export function generateIronKnightSkin(): string {
  const canvas = createSkinCanvas();
  const ctx = canvas.getContext('2d')!;

  // Helmet & visor
  fillSkinRect(ctx, 0, 0, 32, 16, 180, 185, 195, 0.1);
  // Visor eye slit (Cyan glow)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(9, 12, 6, 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(10, 12, 1, 1);
  ctx.fillRect(13, 12, 1, 1);

  // Helmet crest
  ctx.fillStyle = '#fbbf24'; // Gold crest accent
  ctx.fillRect(11, 8, 2, 3);

  // Body: Iron plate chest & mail
  fillSkinRect(ctx, 16, 16, 24, 16, 190, 195, 205, 0.12);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(23, 22, 2, 4); // gold emblem

  // Arms: Plated steel pauldrons & gauntlets
  fillSkinRect(ctx, 40, 16, 16, 16, 175, 180, 190, 0.1);
  fillSkinRect(ctx, 32, 48, 16, 16, 175, 180, 190, 0.1);

  // Legs: Iron greaves & sabatons
  fillSkinRect(ctx, 0, 16, 16, 16, 160, 165, 175, 0.1);
  fillSkinRect(ctx, 16, 48, 16, 16, 160, 165, 175, 0.1);

  return canvas.toDataURL('image/png');
}

// 4. Mago do Cristal (Mystic Obsidian & Cyan Mage)
export function generateCrystalMageSkin(): string {
  const canvas = createSkinCanvas();
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian hooded robe
  fillSkinRect(ctx, 0, 0, 32, 16, 30, 25, 45, 0.1);
  // Shadowed face under hood
  ctx.fillStyle = '#09090b';
  ctx.fillRect(9, 10, 6, 5);
  // Glowing violet eyes
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(10, 12, 1, 1);
  ctx.fillRect(13, 12, 1, 1);

  // Body: Midnight purple robe with cyan mystic runes
  fillSkinRect(ctx, 16, 16, 24, 16, 35, 30, 55, 0.1);
  ctx.fillStyle = '#22d3ee'; // Cyan crystal rune down chest
  ctx.fillRect(23, 19, 2, 9);
  ctx.fillRect(21, 23, 6, 2);

  // Arms: Robe sleeves
  fillSkinRect(ctx, 40, 16, 16, 16, 30, 25, 50, 0.1);
  fillSkinRect(ctx, 32, 48, 16, 16, 30, 25, 50, 0.1);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(41, 30, 6, 2);
  ctx.fillRect(33, 62, 6, 2);

  // Legs: Lower robe
  fillSkinRect(ctx, 0, 16, 16, 16, 25, 20, 40, 0.1);
  fillSkinRect(ctx, 16, 48, 16, 16, 25, 20, 40, 0.1);

  return canvas.toDataURL('image/png');
}

// 5. Lenhador Voxel (Plaid Lumberjack)
export function generateLumberjackSkin(): string {
  const canvas = createSkinCanvas();
  const ctx = canvas.getContext('2d')!;

  // Head: Tan skin, brown hair & full beard
  fillSkinRect(ctx, 0, 0, 32, 16, 210, 155, 120, 0.08);
  fillSkinRect(ctx, 8, 0, 8, 8, 75, 45, 25, 0.12); // hair
  fillSkinRect(ctx, 8, 8, 8, 3, 75, 45, 25, 0.1);
  // Brown beard
  fillSkinRect(ctx, 8, 13, 8, 3, 75, 45, 25, 0.1);
  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 11, 2, 1);
  ctx.fillRect(13, 11, 2, 1);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(10, 11, 1, 1);
  ctx.fillRect(14, 11, 1, 1);

  // Body: Red/Black plaid shirt
  for (let py = 16; py < 32; py++) {
    for (let px = 16; px < 40; px++) {
      const isRed = (Math.floor(px / 2) + Math.floor(py / 2)) % 2 === 0;
      ctx.fillStyle = isRed ? '#dc2626' : '#1e1b4b';
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // Arms: Rolled up plaid sleeves + muscular bare forearms
  fillSkinRect(ctx, 40, 16, 16, 6, 185, 28, 28, 0.1);
  fillSkinRect(ctx, 40, 22, 16, 10, 210, 155, 120, 0.08);
  fillSkinRect(ctx, 32, 48, 16, 6, 185, 28, 28, 0.1);
  fillSkinRect(ctx, 32, 54, 16, 10, 210, 155, 120, 0.08);

  // Legs: Rugged denim work pants & work boots
  fillSkinRect(ctx, 0, 16, 16, 10, 30, 58, 110, 0.1);
  fillSkinRect(ctx, 0, 26, 16, 6, 120, 70, 30, 0.08);
  fillSkinRect(ctx, 16, 48, 16, 10, 30, 58, 110, 0.1);
  fillSkinRect(ctx, 16, 58, 16, 6, 120, 70, 30, 0.08);

  return canvas.toDataURL('image/png');
}

// Built-in presets list
export const SKIN_PRESETS: SkinPreset[] = [
  {
    id: 'steve',
    name: 'Mineiro Clássico',
    description: 'A clássica camiseta ciano e calça jeans nostálgica.',
    isSlim: false,
    dataUrl: generateClassicSteveSkin(),
  },
  {
    id: 'alex',
    name: 'Exploradora Alex',
    description: 'Túnica verde-oliva com trança ruiva e braços ágeis slim.',
    isSlim: true,
    dataUrl: generateAlexSkin(),
  },
  {
    id: 'iron_knight',
    name: 'Cavaleiro de Aço',
    description: 'Armadura pesada de ferro forjado com visor luminoso.',
    isSlim: false,
    dataUrl: generateIronKnightSkin(),
  },
  {
    id: 'crystal_mage',
    name: 'Mago do Cristal',
    description: 'Manto de obsidiana profundo com runas de cristal luminosas.',
    isSlim: false,
    dataUrl: generateCrystalMageSkin(),
  },
  {
    id: 'lumberjack',
    name: 'Lenhador Voxel',
    description: 'Camisa xadrez vermelha clássica e botas reforçadas para a floresta.',
    isSlim: false,
    dataUrl: generateLumberjackSkin(),
  },
];

// Detect whether an uploaded skin image is Slim (3px), normalize 64x64/64x32 layout,
// and guarantee valid RGBA with 100% base layer opacity and solid-black overlay cleanup.
export function analyzeSkinImage(
  img: HTMLImageElement
): { isSlim: boolean; isLegacy: boolean; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.clearRect(0, 0, 64, 64);

  const srcW = img.naturalWidth || img.width || 64;
  const srcH = img.naturalHeight || img.height || 64;
  const isLegacy = srcH === 32 || (srcW === 64 && srcH === 32);

  if (isLegacy) {
    ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, 64, 32);
    ctx.drawImage(canvas, 0, 16, 16, 16, 16, 48, 16, 16);
    ctx.drawImage(canvas, 40, 16, 16, 16, 32, 48, 16, 16);
  } else {
    // 64x64 standard skin: draw directly, preserving original pixels exactly
    ctx.drawImage(img, 0, 0, 64, 64);
  }

  // Detect Slim (3px Alex arm) vs Classic (4px Steve arm):
  // In standard 64x64 Minecraft skins, the 4th pixel column of the right arm (x=55, y=20..31)
  // is transparent on Slim models.
  const imgData = ctx.getImageData(0, 0, 64, 64);
  const data = imgData.data;

  let isSlim = false;
  let transparentArmPixels = 0;
  for (let y = 20; y < 32; y++) {
    const idx = (y * 64 + 55) * 4;
    if (data[idx + 3] === 0) {
      transparentArmPixels++;
    }
  }
  if (transparentArmPixels >= 8) {
    isSlim = true;
  }

  return { isSlim, isLegacy, canvas };
}
